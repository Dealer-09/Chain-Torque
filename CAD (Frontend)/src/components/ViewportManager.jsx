// src/components/ViewportManager.js
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import ThreeViewer from './ThreeViewer.jsx';

// Integrated 2D Canvas Component
const Canvas2D = ({ onSketchComplete, sketches, onSketchUpdate, activeSketch, onPointAdd, activeTool, onToolAction, onToolChange, zoom: zoomProp, onZoomChange }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [drawMode, setDrawMode] = useState('line'); // 'line', 'polygon', 'circle', 'arc', 'cut', 'point'
  const [lines, setLines] = useState([]); // Array of completed line segments
  const [currentLine, setCurrentLine] = useState([]); // Current line being drawn
  const [polygonPoints, setPolygonPoints] = useState([]); // Points for polygon mode
  const [circleCenter, setCircleCenter] = useState(null); // Center point for circle
  const [circleRadius, setCircleRadius] = useState(0); // Radius for circle being drawn
  const [circles, setCircles] = useState([]); // Completed circles
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(20);
  // Use prop zoom if provided, otherwise local state
  const [localZoom, setLocalZoom] = useState(1);
  const zoom = zoomProp ?? localZoom;
  const setZoom = onZoomChange ?? setLocalZoom;
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [cursorPos, setCursorPos] = useState(null); // For preview lines
  const [hoveredEdge, setHoveredEdge] = useState(null); // {sketchIdx, edgeIdx, edge} for Cut/Point tools
  const [editingSketchIdx, setEditingSketchIdx] = useState(null); // Index of sketch being edited (null = new sketch)
  const [editingSketchBackup, setEditingSketchBackup] = useState(null); // Backup of original sketch for cancel

  // Arc tool state
  const [arcStart, setArcStart] = useState(null); // First point of arc
  const [arcEnd, setArcEnd] = useState(null); // Second point of arc
  const [arcControlPoint, setArcControlPoint] = useState(null); // Control point for curvature
  const [arcs, setArcs] = useState([]); // Completed arcs [{start, end, control}]


  // ResizeObserver to dynamically resize canvas to fill container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Update draw mode when activeTool changes
  useEffect(() => {
    if (activeTool === 'line') {
      // Only switch mode and clear in-progress drawing, don't save
      setDrawMode('line');
      setPolygonPoints([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
    } else if (activeTool === 'polygon') {
      // Only switch mode and clear in-progress drawing, don't save
      setDrawMode('polygon');
      setLines([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
    } else if (activeTool === 'circle') {
      // Switch to circle mode
      setDrawMode('circle');
      setLines([]);
      setPolygonPoints([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
    } else if (activeTool === 'eraser') {
      // Handle erase action
      if (drawMode === 'line') {
        if (currentLine.length > 0) {
          setCurrentLine([]);
        } else if (lines.length > 0) {
          setLines(prev => prev.slice(0, -1));
        }
      } else if (drawMode === 'polygon') {
        if (polygonPoints.length > 0) {
          setPolygonPoints(prev => prev.slice(0, -1));
        }
      } else if (drawMode === 'circle') {
        if (circleCenter) {
          setCircleCenter(null);
          setCircleRadius(0);
        } else if (circles.length > 0) {
          setCircles(prev => prev.slice(0, -1));
        }
      }
    } else if (activeTool === 'arc') {
      // Switch to arc mode
      setDrawMode('arc');
      setLines([]);
      setPolygonPoints([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
      setArcStart(null);
      setArcEnd(null);
      setArcControlPoint(null);
    } else if (activeTool === 'cut') {
      // Switch to cut mode
      setDrawMode('cut');
      setLines([]);
      setPolygonPoints([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
      setArcStart(null);
      setArcEnd(null);
      setArcControlPoint(null);
    } else if (activeTool === 'point') {
      // Switch to point mode
      setDrawMode('point');
      setLines([]);
      setPolygonPoints([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
      setArcStart(null);
      setArcEnd(null);
      setArcControlPoint(null);
    } else if (activeTool === 'delete') {
      // Clear all
      setCurrentLine([]);
      setPolygonPoints([]);
      setLines([]);
      setCircleCenter(null);
      setCircleRadius(0);
      setCircles([]);
      setArcs([]);
      setArcStart(null);
      setArcEnd(null);
      setArcControlPoint(null);
    }
  }, [activeTool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const drawGrid = (ctx, width, height) => {
      // Grid lines - dark theme
      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 0.5;

      // Vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw origin - prominent center marker
      const centerX = width / 2;
      const centerY = height / 2;

      // Center crosshair - more visible
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;

      // X axis
      ctx.beginPath();
      ctx.moveTo(centerX - 60, centerY);
      ctx.lineTo(centerX + 60, centerY);
      ctx.stroke();

      // Y axis
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 60);
      ctx.lineTo(centerX, centerY + 60);
      ctx.stroke();

      // Origin point - larger and more visible
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Origin label
      ctx.fillStyle = '#3b82f6';
      ctx.font = '12px monospace';
      ctx.fillText('0,0', centerX + 10, centerY - 10);
    };

    const drawLine = (ctx, p1, p2, color, lineWidth = 2) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    const drawPoint = (ctx, point, color, size = 4) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, 2 * Math.PI);
      ctx.fill();
    };

    const drawCircle = (ctx, center, radius, color, lineWidth = 2) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    };

    const drawPolygon = (ctx, points, color, showPoints = false) => {
      if (points.length < 2) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      // Close the polygon if it has more than 2 points
      if (points.length > 2) {
        ctx.closePath();
      }

      ctx.stroke();

      // Draw points
      if (showPoints) {
        points.forEach(point => drawPoint(ctx, point, color));
      }
    };

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan transforms
    ctx.save();

    // Move to center, apply zoom, then apply pan
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.translate(centerX + pan.x, centerY + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-centerX, -centerY);

    // Draw grid (with dynamic size based on zoom)
    if (snapToGrid) {
      const gridExtent = Math.max(canvas.width, canvas.height) / zoom * 2;
      const startX = centerX - gridExtent / 2;
      const startY = centerY - gridExtent / 2;

      // Grid lines - dark theme
      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 0.5 / zoom;

      // Calculate grid bounds
      const gridStartX = Math.floor(startX / gridSize) * gridSize;
      const gridStartY = Math.floor(startY / gridSize) * gridSize;
      const gridEndX = gridStartX + gridExtent;
      const gridEndY = gridStartY + gridExtent;

      // Vertical lines
      for (let x = gridStartX; x <= gridEndX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, gridStartY);
        ctx.lineTo(x, gridEndY);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = gridStartY; y <= gridEndY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gridStartX, y);
        ctx.lineTo(gridEndX, y);
        ctx.stroke();
      }

      // Origin crosshair
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5 / zoom;

      // X axis
      ctx.beginPath();
      ctx.moveTo(centerX - 30 / zoom, centerY);
      ctx.lineTo(centerX + 30 / zoom, centerY);
      ctx.stroke();

      // Y axis
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 30 / zoom);
      ctx.lineTo(centerX, centerY + 30 / zoom);
      ctx.stroke();

      // Origin point
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3 / zoom, 0, 2 * Math.PI);
      ctx.fill();

      // Origin label
      ctx.font = `${12 / zoom}px monospace`;
      ctx.fillText('0,0', centerX + 10 / zoom, centerY - 10 / zoom);
    }

    // Draw existing sketches (saved drawings)
    sketches.forEach((sketch, sketchIdx) => {
      // Skip hidden sketches
      if (sketch.visible === false) return;

      // Skip the sketch being edited (it's shown in blue via active drawing state)
      if (editingSketchIdx === sketchIdx) return;

      const cutEdges = sketch.cutEdges || [];

      if (sketch.type === 'lines' && sketch.originalLines) {
        // Draw saved lines using original canvas coordinates, skipping cut edges
        sketch.originalLines.forEach((line, idx) => {
          if (cutEdges.includes(idx)) return; // Skip cut edges
          drawLine(ctx, line[0], line[1], 'hsl(142 76% 36%)', 2);
          drawPoint(ctx, line[0], 'hsl(142 76% 36%)', 4);
          drawPoint(ctx, line[1], 'hsl(142 76% 36%)', 4);
        });
        // Always draw all vertices (even for cut edges)
        const allPoints = new Set();
        sketch.originalLines.forEach(line => {
          allPoints.add(JSON.stringify(line[0]));
          allPoints.add(JSON.stringify(line[1]));
        });
        allPoints.forEach(pStr => {
          const p = JSON.parse(pStr);
          drawPoint(ctx, p, 'hsl(142 76% 36%)', 4);
        });
      } else if (sketch.type === 'polygon' && (sketch.originalPoints || sketch.original2DPoints)) {
        // Draw saved polygon edges individually to support cut edges
        const points = sketch.originalPoints || sketch.original2DPoints;
        for (let i = 0; i < points.length; i++) {
          if (cutEdges.includes(i)) continue; // Skip cut edges
          const p1 = points[i];
          const p2 = points[(i + 1) % points.length];
          drawLine(ctx, p1, p2, 'hsl(142 76% 36%)', 2);
        }
        // Draw arc edges that replaced cut edges
        if (sketch.arcEdges && sketch.arcEdges.length > 0) {
          sketch.arcEdges.forEach(arcEdge => {
            ctx.strokeStyle = 'hsl(142 76% 36%)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(arcEdge.start.x, arcEdge.start.y);
            ctx.quadraticCurveTo(arcEdge.control.x, arcEdge.control.y, arcEdge.end.x, arcEdge.end.y);
            ctx.stroke();
          });
        }
        // Always draw all vertices
        points.forEach(p => drawPoint(ctx, p, 'hsl(142 76% 36%)', 4));
      } else if (sketch.type === 'circles' && sketch.originalCircles) {
        // Draw saved circles using original canvas coordinates
        sketch.originalCircles.forEach(circle => {
          drawCircle(ctx, circle.center, circle.radius, 'hsl(142 76% 36%)', 2);
          drawPoint(ctx, circle.center, 'hsl(142 76% 36%)', 4);
        });
      } else if (sketch.type === 'arc' && sketch.originalArc) {
        // Draw saved arc using quadratic bezier curve
        const arc = sketch.originalArc;
        ctx.strokeStyle = 'hsl(142 76% 36%)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(arc.start.x, arc.start.y);
        ctx.quadraticCurveTo(arc.control.x, arc.control.y, arc.end.x, arc.end.y);
        ctx.stroke();
        drawPoint(ctx, arc.start, 'hsl(142 76% 36%)', 4);
        drawPoint(ctx, arc.end, 'hsl(142 76% 36%)', 4);
      }
    });

    // Draw active sketch
    if (activeSketch) {
      drawPolygon(ctx, activeSketch.original2DPoints || activeSketch.points, '#0066ff', true);
    }

    // Draw completed lines in line mode
    lines.forEach(line => {
      drawLine(ctx, line[0], line[1], 'hsl(217 91% 65%)', 2);
      drawPoint(ctx, line[0], 'hsl(217 91% 65%)', 5);
      drawPoint(ctx, line[1], 'hsl(217 91% 65%)', 5);
    });

    // Draw current line being drawn
    if (drawMode === 'line' && currentLine.length === 1) {
      drawPoint(ctx, currentLine[0], 'hsl(25 95% 63%)', 6);
    } else if (drawMode === 'line' && currentLine.length === 2) {
      drawLine(ctx, currentLine[0], currentLine[1], 'hsl(25 95% 63%)', 3);
      drawPoint(ctx, currentLine[0], 'hsl(25 95% 63%)', 6);
      drawPoint(ctx, currentLine[1], 'hsl(25 95% 63%)', 6);
    }

    // Draw polygon being drawn
    if (drawMode === 'polygon' && polygonPoints.length > 0) {
      drawPolygon(ctx, polygonPoints, 'hsl(25 95% 63%)', true);

      // Draw preview line from last point to cursor
      if (cursorPos && polygonPoints.length > 0) {
        const lastPoint = polygonPoints[polygonPoints.length - 1];
        ctx.setLineDash([5, 5]);
        drawLine(ctx, lastPoint, cursorPos, 'rgba(255, 150, 50, 0.6)', 2);
        ctx.setLineDash([]);
        drawPoint(ctx, cursorPos, 'rgba(255, 150, 50, 0.6)', 4);
      }
    }

    // Draw preview line for line tool
    if (drawMode === 'line' && cursorPos) {
      let startPoint = null;
      if (currentLine.length === 1) {
        startPoint = currentLine[0];
      } else if (lines.length > 0) {
        startPoint = lines[lines.length - 1][1];
      }
      if (startPoint) {
        ctx.setLineDash([5, 5]);
        drawLine(ctx, startPoint, cursorPos, 'rgba(255, 150, 50, 0.6)', 2);
        ctx.setLineDash([]);
        drawPoint(ctx, cursorPos, 'rgba(255, 150, 50, 0.6)', 4);
      }
    }

    // Draw completed circles
    circles.forEach(circle => {
      drawCircle(ctx, circle.center, circle.radius, 'hsl(217 91% 65%)', 2);
      drawPoint(ctx, circle.center, 'hsl(217 91% 65%)', 4);
    });

    // Draw circle being drawn
    if (drawMode === 'circle' && circleCenter) {
      if (circleRadius > 0) {
        drawCircle(ctx, circleCenter, circleRadius, 'hsl(25 95% 63%)', 3);
      }
      drawPoint(ctx, circleCenter, 'hsl(25 95% 63%)', 6);
    }

    // Draw hovered edge highlight for Cut/Point tools
    if (hoveredEdge && (drawMode === 'cut' || drawMode === 'point')) {
      const color = drawMode === 'cut' ? 'rgba(255, 50, 50, 0.8)' : 'rgba(50, 150, 255, 0.8)';
      ctx.setLineDash([]);
      drawLine(ctx, hoveredEdge.edge[0], hoveredEdge.edge[1], color, 4);
      drawPoint(ctx, hoveredEdge.edge[0], color, 6);
      drawPoint(ctx, hoveredEdge.edge[1], color, 6);
    }

    // Draw completed arcs as quadratic bezier curves
    arcs.forEach(arc => {
      ctx.strokeStyle = 'hsl(217 91% 65%)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(arc.start.x, arc.start.y);
      ctx.quadraticCurveTo(arc.control.x, arc.control.y, arc.end.x, arc.end.y);
      ctx.stroke();
      drawPoint(ctx, arc.start, 'hsl(217 91% 65%)', 4);
      drawPoint(ctx, arc.end, 'hsl(217 91% 65%)', 4);
    });

    // Draw arc being created (preview)
    if (drawMode === 'arc') {
      if (arcStart) {
        // Draw start point
        drawPoint(ctx, arcStart, 'hsl(25 95% 63%)', 6);

        if (arcEnd) {
          // Draw end point and preview arc with cursor as control point
          drawPoint(ctx, arcEnd, 'hsl(25 95% 63%)', 6);

          // Draw preview arc from arcStart to arcEnd with cursor as control
          if (cursorPos) {
            ctx.strokeStyle = 'rgba(255, 150, 50, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(arcStart.x, arcStart.y);
            ctx.quadraticCurveTo(cursorPos.x, cursorPos.y, arcEnd.x, arcEnd.y);
            ctx.stroke();
            ctx.setLineDash([]);
            // Draw control point indicator
            drawPoint(ctx, cursorPos, 'rgba(255, 150, 50, 0.6)', 4);
          }
        } else if (cursorPos) {
          // Draw preview line from start to cursor
          ctx.setLineDash([5, 5]);
          drawLine(ctx, arcStart, cursorPos, 'rgba(255, 150, 50, 0.6)', 2);
          ctx.setLineDash([]);
          drawPoint(ctx, cursorPos, 'rgba(255, 150, 50, 0.6)', 4);
        }
      }
    }

    // Restore canvas state (end zoom/pan transforms)
    ctx.restore();
  }, [sketches, activeSketch, lines, currentLine, polygonPoints, circles, circleCenter, circleRadius, drawMode, snapToGrid, gridSize, canvasSize, zoom, pan, cursorPos, hoveredEdge, arcs, arcStart, arcEnd, editingSketchIdx]);

  const snapToGridPoint = (x, y) => {
    if (!snapToGrid) return { x, y };
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    return { x: snappedX, y: snappedY };
  };

  // Convert screen coordinates (with zoom/pan) back to original canvas coordinates
  const screenToCanvas = (screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: screenX, y: screenY };
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Inverse of: translate(centerX + pan.x, centerY + pan.y), scale(zoom), translate(-centerX, -centerY)
    const x = (screenX - centerX - pan.x) / zoom + centerX;
    const y = (screenY - centerY - pan.y) / zoom + centerY;
    return { x, y };
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calculate proper canvas coordinates accounting for scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const snappedPoint = snapToGridPoint(x, y);
    const clickPoint = { x, y }; // Raw screen coords

    // Check if clicking on a saved sketch to start editing (only for drawing tools)
    if ((drawMode === 'line' || drawMode === 'polygon') && editingSketchIdx === null) {
      // Only trigger if no active drawing in progress
      const hasActiveDrawing = lines.length > 0 || polygonPoints.length > 0 || currentLine.length > 0;

      if (!hasActiveDrawing) {
        // Check if clicking near an edge of any saved sketch
        const CLICK_THRESHOLD = 15;

        for (let sketchIdx = 0; sketchIdx < sketches.length; sketchIdx++) {
          const sketch = sketches[sketchIdx];
          if (!sketch.visible) continue;

          let edges = [];
          if (sketch.originalLines) {
            edges = sketch.originalLines;
          } else if (sketch.original2DPoints && sketch.original2DPoints.length > 1) {
            for (let i = 0; i < sketch.original2DPoints.length; i++) {
              const next = (i + 1) % sketch.original2DPoints.length;
              edges.push([sketch.original2DPoints[i], sketch.original2DPoints[next]]);
            }
          }

          for (let edgeIdx = 0; edgeIdx < edges.length; edgeIdx++) {
            // Skip cut edges
            if (sketch.cutEdges && sketch.cutEdges.includes(edgeIdx)) continue;

            // Skip sketches being modified with cuts or arcs - user wants to add geometry, not edit
            if ((sketch.cutEdges && sketch.cutEdges.length > 0) ||
              (sketch.arcEdges && sketch.arcEdges.length > 0)) {
              continue;
            }

            const edge = edges[edgeIdx];

            // Check if click is near a vertex (user wants to snap/connect, not edit)
            const distToStart = Math.sqrt((clickPoint.x - edge[0].x) ** 2 + (clickPoint.y - edge[0].y) ** 2);
            const distToEnd = Math.sqrt((clickPoint.x - edge[1].x) ** 2 + (clickPoint.y - edge[1].y) ** 2);
            const VERTEX_THRESHOLD = 20;
            if (distToStart < VERTEX_THRESHOLD || distToEnd < VERTEX_THRESHOLD) {
              continue; // Near vertex - don't trigger edit, let user draw from/to this point
            }

            const dist = pointToLineDistance(clickPoint, edge[0], edge[1]);

            if (dist < CLICK_THRESHOLD) {
              // Found a sketch to edit
              startEditingSketch(sketchIdx);
              return; // Don't process as normal click
            }
          }
        }
      }
    }

    if (drawMode === 'line') {
      // Line mode: auto-chaining - first click starts, each subsequent click extends from last point
      // Limit to 500 lines to prevent memory issues
      if (lines.length >= 500) {
        alert('Maximum 500 lines reached. Press Enter to save or Backspace to undo.');
        return;
      }

      // Check if clicking near ANY existing vertex to close the loop (need at least 2 lines)
      if (lines.length >= 2) {
        // Small threshold - only closes if clicking directly on a vertex
        const closeThreshold = (gridSize * 0.5) / zoom;

        // Check all vertices (start points of all lines + end point of last line)
        const allVertices = [
          ...lines.map((line, idx) => ({ point: line[0], index: idx, isStart: true })),
          { point: lines[lines.length - 1][1], index: lines.length - 1, isEnd: true }
        ];

        for (const vertex of allVertices) {
          const dist = Math.sqrt((snappedPoint.x - vertex.point.x) ** 2 + (snappedPoint.y - vertex.point.y) ** 2);
          if (dist < closeThreshold) {
            // Close the loop - add line from last point to this vertex (but don't save yet)
            const lastPoint = lines[lines.length - 1][1];
            if (Math.abs(lastPoint.x - vertex.point.x) > 1 || Math.abs(lastPoint.y - vertex.point.y) > 1) {
              setLines(prev => [...prev, [lastPoint, vertex.point]]);
            }
            // Don't auto-save - user must press Enter to save
            return;
          }
        }
      }

      if (lines.length === 0 && currentLine.length === 0) {
        // First click - just store the starting point
        setCurrentLine([snappedPoint]);
      } else if (currentLine.length === 1 && lines.length === 0) {
        // Second click - create first line segment
        const newLine = [currentLine[0], snappedPoint];
        setLines(prev => [...prev, newLine]);
        setCurrentLine([]); // Clear - we now chain from lines array
        if (onPointAdd) onPointAdd(snappedPoint);
      } else if (lines.length > 0) {
        // Subsequent clicks - chain from last line's endpoint
        const lastEndpoint = lines[lines.length - 1][1];
        // Skip if same point clicked twice
        if (Math.abs(snappedPoint.x - lastEndpoint.x) < 1 && Math.abs(snappedPoint.y - lastEndpoint.y) < 1) {
          return;
        }
        const newLine = [lastEndpoint, snappedPoint];
        setLines(prev => [...prev, newLine]);
        if (onPointAdd) onPointAdd(snappedPoint);
      }
    } else if (drawMode === 'polygon') {
      // Polygon mode: continuous points
      // Limit to 500 points to prevent memory issues
      if (polygonPoints.length >= 500) {
        alert('Maximum 500 points reached. Press Enter to save or Backspace to undo.');
        return;
      }

      // Check if clicking near first point to close polygon (need at least 3 points)
      if (polygonPoints.length >= 3) {
        const first = polygonPoints[0];
        const dist = Math.sqrt((snappedPoint.x - first.x) ** 2 + (snappedPoint.y - first.y) ** 2);
        // Use larger threshold (2x grid size) to be more forgiving
        const closeThreshold = (gridSize * 2) / zoom;
        if (dist < closeThreshold) {
          // Auto-complete the polygon without adding duplicate point
          completeSketch();
          return;
        }
      }

      // Check for duplicate of last point (same grid position clicked twice)
      if (polygonPoints.length > 0) {
        const lastPoint = polygonPoints[polygonPoints.length - 1];
        if (Math.abs(snappedPoint.x - lastPoint.x) < 1 && Math.abs(snappedPoint.y - lastPoint.y) < 1) {
          return; // Skip duplicate click
        }
      }

      setPolygonPoints(prev => [...prev, snappedPoint]);
      if (onPointAdd) onPointAdd(snappedPoint);
    } else if (drawMode === 'circle') {
      // Circle mode: first click sets center, second click sets radius
      if (!circleCenter) {
        setCircleCenter(snappedPoint);
      } else {
        // Calculate radius and complete circle
        // Limit to 100 circles
        if (circles.length >= 100) {
          alert('Maximum 100 circles reached. Press Enter to save.');
          setCircleCenter(null);
          setCircleRadius(0);
          return;
        }
        const dx = snappedPoint.x - circleCenter.x;
        const dy = snappedPoint.y - circleCenter.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        if (radius > 0) {
          setCircles(prev => [...prev, { center: circleCenter, radius }]);
        }
        setCircleCenter(null);
        setCircleRadius(0);
      }
    } else if (drawMode === 'cut') {
      // Cut mode: click on an edge to remove it
      // Use raw coordinates - originalLines are stored in screen-space coords
      const clickPoint = { x, y };
      let nearestEdge = null;
      let nearestSketchIdx = -1;
      let nearestEdgeIdx = -1;
      let minDist = Infinity;

      sketches.forEach((sketch, sketchIdx) => {
        if (sketch.visible === false) return;

        if (sketch.type === 'lines' && sketch.originalLines) {
          sketch.originalLines.forEach((line, lineIdx) => {
            // Point-to-line-segment distance
            const dist = pointToLineDistance(clickPoint, line[0], line[1]);
            if (dist < minDist && dist < gridSize * 2) {
              minDist = dist;
              nearestSketchIdx = sketchIdx;
              nearestEdgeIdx = lineIdx;
              nearestEdge = line;
            }
          });
        } else if (sketch.type === 'polygon' && sketch.original2DPoints) {
          const points = sketch.original2DPoints;
          const cutEdges = sketch.cutEdges || [];

          // Check line edges
          for (let i = 0; i < points.length; i++) {
            if (cutEdges.includes(i)) continue; // Skip already cut edges
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const dist = pointToLineDistance(clickPoint, p1, p2);
            if (dist < minDist && dist < gridSize) {
              minDist = dist;
              nearestSketchIdx = sketchIdx;
              nearestEdgeIdx = i;
              nearestEdge = [p1, p2];
            }
          }

          // Check arc edges
          if (sketch.arcEdges && sketch.arcEdges.length > 0) {
            sketch.arcEdges.forEach((arcEdge, arcIdx) => {
              const dist = pointToArcDistance(clickPoint, arcEdge);
              // Use larger threshold for arcs since curves can be harder to click
              if (dist < minDist && dist < gridSize * 2) {
                minDist = dist;
                nearestSketchIdx = sketchIdx;
                // Use special marker for arc edge: negative index - 1
                nearestEdgeIdx = -(arcIdx + 1); // -1 for arcIdx 0, -2 for arcIdx 1, etc.
                nearestEdge = arcEdge;
              }
            });
          }
        }
      });

      if (nearestEdge && nearestSketchIdx >= 0) {
        const updatedSketch = { ...sketches[nearestSketchIdx] };

        if (nearestEdgeIdx < 0) {
          // Cutting an arc edge
          const arcIdx = -(nearestEdgeIdx + 1);
          const arcEdge = updatedSketch.arcEdges[arcIdx];

          // Remove the arc edge and add back to cutEdges
          const originalEdgeIdx = arcEdge.edgeIndex;
          updatedSketch.arcEdges = updatedSketch.arcEdges.filter((_, idx) => idx !== arcIdx);
          if (!updatedSketch.cutEdges) updatedSketch.cutEdges = [];
          updatedSketch.cutEdges.push(originalEdgeIdx);
        } else {
          // Cutting a line edge (original behavior)
          if (!updatedSketch.cutEdges) updatedSketch.cutEdges = [];
          updatedSketch.cutEdges.push(nearestEdgeIdx);
        }

        // Update the sketch via callback
        if (onSketchUpdate) {
          onSketchUpdate(nearestSketchIdx, updatedSketch);
        }
      }
    } else if (drawMode === 'point') {
      // Point mode: click on an edge to add a point
      // Use raw coordinates - originalLines/original2DPoints are stored in screen-space coords
      const clickPoint = { x, y };
      let nearestEdge = null;
      let nearestSketchIdx = -1;
      let nearestEdgeIdx = -1;
      let minDist = Infinity;
      let insertionPoint = null;

      sketches.forEach((sketch, sketchIdx) => {
        if (sketch.visible === false) return;

        if (sketch.type === 'polygon' && sketch.original2DPoints) {
          const points = sketch.original2DPoints;
          for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const { dist, point } = pointToLineDistanceWithProjection(clickPoint, p1, p2);
            if (dist < minDist && dist < gridSize * 2) {
              minDist = dist;
              nearestSketchIdx = sketchIdx;
              nearestEdgeIdx = i;
              nearestEdge = [p1, p2];
              insertionPoint = point;
            }
          }
        } else if (sketch.type === 'lines' && sketch.originalLines) {
          sketch.originalLines.forEach((line, lineIdx) => {
            const { dist, point } = pointToLineDistanceWithProjection(clickPoint, line[0], line[1]);
            if (dist < minDist && dist < gridSize * 2) {
              minDist = dist;
              nearestSketchIdx = sketchIdx;
              nearestEdgeIdx = lineIdx;
              nearestEdge = line;
              insertionPoint = point;
            }
          });
        }
      });

      if (nearestEdge && nearestSketchIdx >= 0 && insertionPoint) {
        // Insert point into the sketch
        const updatedSketch = { ...sketches[nearestSketchIdx] };
        const newPoints = [...(updatedSketch.original2DPoints || [])];
        newPoints.splice(nearestEdgeIdx + 1, 0, insertionPoint);
        updatedSketch.original2DPoints = newPoints;

        // Also update normalized points
        const canvas = canvasRef.current;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const uniformScale = Math.min(centerX, centerY);
        updatedSketch.points = newPoints.map(p => ({
          x: (p.x - centerX) / uniformScale,
          y: -(p.y - centerY) / uniformScale
        }));

        if (onSketchUpdate) {
          onSketchUpdate(nearestSketchIdx, updatedSketch);
        }
      }
    } else if (drawMode === 'arc') {
      // Arc mode: click start point, click end point, click to set curvature
      if (!arcStart) {
        // First click - set start point
        setArcStart(snappedPoint);
      } else if (!arcEnd) {
        // Second click - set end point
        setArcEnd(snappedPoint);
      } else {
        // Third click - set control point and finalize arc
        const midX = (arcStart.x + arcEnd.x) / 2;
        const midY = (arcStart.y + arcEnd.y) / 2;
        // Calculate control point: offset from midpoint towards click position
        const controlPoint = snappedPoint;

        // Add completed arc
        setArcs(prev => [...prev, {
          start: arcStart,
          end: arcEnd,
          control: controlPoint
        }]);

        // Reset for next arc
        setArcStart(null);
        setArcEnd(null);
        setArcControlPoint(null);
      }
    }
  };

  // Helper: distance from point to line segment
  const pointToLineDistance = (p, a, b) => {
    const A = p.x - a.x;
    const B = p.y - a.y;
    const C = b.x - a.x;
    const D = b.y - a.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let t = -1;
    if (lenSq !== 0) t = dot / lenSq;

    let xx, yy;
    if (t < 0) { xx = a.x; yy = a.y; }
    else if (t > 1) { xx = b.x; yy = b.y; }
    else { xx = a.x + t * C; yy = a.y + t * D; }

    return Math.sqrt((p.x - xx) ** 2 + (p.y - yy) ** 2);
  };

  // Helper: distance from point to line segment with projection point
  const pointToLineDistanceWithProjection = (p, a, b) => {
    const A = p.x - a.x;
    const B = p.y - a.y;
    const C = b.x - a.x;
    const D = b.y - a.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let t = -1;
    if (lenSq !== 0) t = Math.max(0, Math.min(1, dot / lenSq));

    const xx = a.x + t * C;
    const yy = a.y + t * D;

    return {
      dist: Math.sqrt((p.x - xx) ** 2 + (p.y - yy) ** 2),
      point: { x: xx, y: yy }
    };
  };

  // Helper: distance from point to quadratic bezier arc (approximate by sampling)
  const pointToArcDistance = (p, arc) => {
    const { start, end, control } = arc;
    let minDist = Infinity;

    // Sample 20 points along the arc
    const SAMPLES = 20;
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const oneMinusT = 1 - t;
      // Quadratic bezier: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const x = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x;
      const y = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y;
      const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      if (dist < minDist) minDist = dist;
    }

    return minDist;
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Track cursor for preview lines in polygon and line modes
    if (drawMode === 'polygon' && polygonPoints.length > 0) {
      const snapped = snapToGridPoint(x, y);
      setCursorPos(snapped);
    } else if (drawMode === 'line' && (currentLine.length > 0 || lines.length > 0)) {
      const snapped = snapToGridPoint(x, y);
      setCursorPos(snapped);
    } else if ((drawMode === 'cut' || drawMode === 'point') && sketches.length > 0) {
      // Track hovered edge for cut/point tools - use raw screen coords
      const hoverPoint = { x, y };
      let nearestEdge = null;
      let nearestSketchIdx = -1;
      let nearestEdgeIdx = -1;
      let minDist = Infinity;

      sketches.forEach((sketch, sketchIdx) => {
        if (sketch.visible === false) return;

        if (sketch.type === 'lines' && sketch.originalLines) {
          sketch.originalLines.forEach((line, lineIdx) => {
            const dist = pointToLineDistance(hoverPoint, line[0], line[1]);
            if (dist < minDist && dist < gridSize * 2) {
              minDist = dist;
              nearestSketchIdx = sketchIdx;
              nearestEdgeIdx = lineIdx;
              nearestEdge = line;
            }
          });
        } else if (sketch.type === 'polygon' && sketch.original2DPoints) {
          const points = sketch.original2DPoints;
          for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const dist = pointToLineDistance(hoverPoint, p1, p2);
            if (dist < minDist && dist < gridSize * 2) {
              minDist = dist;
              nearestSketchIdx = sketchIdx;
              nearestEdgeIdx = i;
              nearestEdge = [p1, p2];
            }
          }
        }
      });

      if (nearestEdge) {
        setHoveredEdge({ sketchIdx: nearestSketchIdx, edgeIdx: nearestEdgeIdx, edge: nearestEdge });
      } else {
        setHoveredEdge(null);
      }
      // In cut/point mode, just track the raw cursor position
      setCursorPos({ x, y });
    } else {
      setCursorPos(null);
      setHoveredEdge(null);
    }

    if (drawMode === 'circle' && circleCenter) {
      const dx = x - circleCenter.x;
      const dy = y - circleCenter.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      setCircleRadius(radius);
    }

    // Pan with middle mouse or space+drag
    if (isPanning) {
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleWheel = (e) => {
    // Moved to native event listener
  };

  // Prevent browser zoom on the canvas container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const preventBrowserZoom = (e) => {
      // Unconditionally stop native scroll & zoom from propagating against the 2D canvas zooming capability
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY * -0.001;
      setZoom(prev => Math.min(Math.max(0.1, prev + delta), 5));
    };

    if (canvas) {
      canvas.addEventListener('wheel', preventBrowserZoom, { passive: false });
    }
    if (container) {
      container.addEventListener('wheel', preventBrowserZoom, { passive: false });
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', preventBrowserZoom);
      }
      if (container) {
        container.removeEventListener('wheel', preventBrowserZoom);
      }
    };
  }, []);

  const handleMiddleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMiddleMouseUp = (e) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(false);
    }
  };

  const handleDoubleClick = () => {
    if (drawMode === 'polygon' && polygonPoints.length > 2) {
      // Complete the polygon
      if (onSketchComplete) {
        onSketchComplete({ points: polygonPoints, type: 'polygon' });
      }
      setPolygonPoints([]);
    }
  };

  const checkIfClosed = (points) => {
    if (points.length < 3) return false;
    const first = points[0];
    const last = points[points.length - 1];
    const distance = Math.sqrt(Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2));
    // Scale threshold with zoom - at zoom=1, use gridSize; at higher zoom, use smaller threshold
    const threshold = gridSize / zoom;
    return distance < threshold;
  };

  // Start editing an existing saved sketch
  const startEditingSketch = (sketchIdx) => {
    const sketch = sketches[sketchIdx];
    if (!sketch) return;

    // Store backup for cancel
    setEditingSketchBackup({ ...sketch });
    setEditingSketchIdx(sketchIdx);

    // Load sketch data into active state based on type
    if (sketch.type === 'lines' && sketch.originalLines) {
      setLines([...sketch.originalLines]);
      setDrawMode('line');
      if (onToolChange) onToolChange('line');
    } else if (sketch.type === 'polygon' && sketch.original2DPoints) {
      setPolygonPoints([...sketch.original2DPoints]);
      setDrawMode('polygon');
      if (onToolChange) onToolChange('polygon');
    }

    // Clear any in-progress drawing
    setCurrentLine([]);
    setCircleCenter(null);
    setCircleRadius(0);
  };

  const completeSketch = () => {
    if (drawMode === 'line' && lines.length > 0) {
      // Check if lines form a closed loop
      const isClosed = checkIfClosed([lines[0][0], ...lines.map(l => l[1])]);

      if (editingSketchIdx !== null) {
        // Update existing sketch
        const updatedSketch = {
          ...editingSketchBackup,
          lines: lines,
          originalLines: lines,
          closed: isClosed,
          cutEdges: [] // Reset cut edges since we're redefining the lines
        };
        if (onSketchUpdate) {
          onSketchUpdate(editingSketchIdx, updatedSketch);
        }
        setEditingSketchIdx(null);
        setEditingSketchBackup(null);
      } else {
        // Try to integrate lines with existing polygons with cut edges
        let integratedCount = 0;
        const THRESHOLD = 15; // pixels

        lines.forEach(line => {
          let integrated = false;

          // Look for a polygon with cut edges where this line fits
          for (let sketchIdx = 0; sketchIdx < sketches.length && !integrated; sketchIdx++) {
            const sketch = sketches[sketchIdx];
            if (sketch.type !== 'polygon' || !sketch.original2DPoints) continue;
            if (!sketch.cutEdges || sketch.cutEdges.length === 0) continue;

            const points = sketch.original2DPoints;

            // Check each cut edge to see if this line connects its vertices
            for (const cutEdgeIdx of sketch.cutEdges) {
              const p1 = points[cutEdgeIdx];
              const p2 = points[(cutEdgeIdx + 1) % points.length];

              // Check if line connects p1 to p2 (in either direction)
              const startToP1 = Math.sqrt((line[0].x - p1.x) ** 2 + (line[0].y - p1.y) ** 2);
              const endToP2 = Math.sqrt((line[1].x - p2.x) ** 2 + (line[1].y - p2.y) ** 2);
              const startToP2 = Math.sqrt((line[0].x - p2.x) ** 2 + (line[0].y - p2.y) ** 2);
              const endToP1 = Math.sqrt((line[1].x - p1.x) ** 2 + (line[1].y - p1.y) ** 2);

              const matchesForward = startToP1 < THRESHOLD && endToP2 < THRESHOLD;
              const matchesReverse = startToP2 < THRESHOLD && endToP1 < THRESHOLD;

              if (matchesForward || matchesReverse) {
                // Line connects this cut edge's vertices - integrate it!
                const updatedSketch = { ...sketch };

                // Remove this edge from cutEdges (it's now restored as a line edge)
                updatedSketch.cutEdges = updatedSketch.cutEdges.filter(idx => idx !== cutEdgeIdx);

                // Update the sketch
                if (onSketchUpdate) {
                  onSketchUpdate(sketchIdx, updatedSketch);
                }

                integrated = true;
                integratedCount++;
                break;
              }
            }
          }
        });

        // If not all lines were integrated, save remaining as new sketch
        if (integratedCount < lines.length && onSketchComplete) {
          onSketchComplete({
            lines: lines,
            type: 'lines',
            closed: isClosed
          });
        }
      }
      // Clear to start new drawing
      setLines([]);
      setCurrentLine([]);
    } else if (drawMode === 'polygon' && polygonPoints.length > 2) {
      // Clean up: remove last point if it's a duplicate of first (user clicked to close)
      let cleanedPoints = [...polygonPoints];
      if (cleanedPoints.length > 3) {
        const first = cleanedPoints[0];
        const last = cleanedPoints[cleanedPoints.length - 1];
        const dist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
        if (dist < 1) {
          cleanedPoints = cleanedPoints.slice(0, -1);
        }
      }

      if (editingSketchIdx !== null) {
        // Update existing sketch
        const updatedSketch = {
          ...editingSketchBackup,
          points: cleanedPoints,
          original2DPoints: cleanedPoints,
          closed: true,
          cutEdges: []
        };
        if (onSketchUpdate) {
          onSketchUpdate(editingSketchIdx, updatedSketch);
        }
        setEditingSketchIdx(null);
        setEditingSketchBackup(null);
      } else if (onSketchComplete) {
        // Create new sketch
        onSketchComplete({
          points: cleanedPoints,
          type: 'polygon',
          closed: true
        });
      }
      // Clear to start new drawing
      setPolygonPoints([]);
    } else if (drawMode === 'circle' && circles.length > 0) {
      if (onSketchComplete) {
        onSketchComplete({
          circles: circles,
          type: 'circles',
          closed: true
        });
      }
      // Clear to start new drawing
      setCircles([]);
      setCircleCenter(null);
      setCircleRadius(0);
      setEditingSketchIdx(null);
      setEditingSketchBackup(null);
    } else if (drawMode === 'arc' && arcs.length > 0) {
      // For each arc, check if it should integrate with an existing polygon with cut edges
      arcs.forEach(arc => {
        let integrated = false;

        // Look for a polygon with cut edges where this arc fits
        for (let sketchIdx = 0; sketchIdx < sketches.length; sketchIdx++) {
          const sketch = sketches[sketchIdx];
          if (sketch.type !== 'polygon' || !sketch.original2DPoints) continue;
          if (!sketch.cutEdges || sketch.cutEdges.length === 0) continue;

          const points = sketch.original2DPoints;
          const THRESHOLD = 15; // pixels

          // Check each cut edge to see if this arc connects its vertices
          for (const cutEdgeIdx of sketch.cutEdges) {
            const p1 = points[cutEdgeIdx];
            const p2 = points[(cutEdgeIdx + 1) % points.length];

            // Check if arc connects p1 to p2 (in either direction)
            const startToP1 = Math.sqrt((arc.start.x - p1.x) ** 2 + (arc.start.y - p1.y) ** 2);
            const endToP2 = Math.sqrt((arc.end.x - p2.x) ** 2 + (arc.end.y - p2.y) ** 2);
            const startToP2 = Math.sqrt((arc.start.x - p2.x) ** 2 + (arc.start.y - p2.y) ** 2);
            const endToP1 = Math.sqrt((arc.end.x - p1.x) ** 2 + (arc.end.y - p1.y) ** 2);

            const matchesForward = startToP1 < THRESHOLD && endToP2 < THRESHOLD;
            const matchesReverse = startToP2 < THRESHOLD && endToP1 < THRESHOLD;

            if (matchesForward || matchesReverse) {
              // Arc connects this cut edge's vertices - integrate it!
              const updatedSketch = { ...sketch };

              // Initialize arcEdges array if needed
              if (!updatedSketch.arcEdges) updatedSketch.arcEdges = [];

              // Add arc edge (snap to exact vertices)
              // Also store normalized control point for consistent extrusion
              const canvas = document.querySelector('.sketch-canvas');
              const canvasWidth = canvas ? canvas.width : 800;
              const canvasHeight = canvas ? canvas.height : 600;
              const centerX = canvasWidth / 2;
              const centerY = canvasHeight / 2;
              const uniformScale = Math.min(centerX, centerY);

              // Convert control point to normalized coordinates
              const controlNorm = {
                x: (arc.control.x - centerX) / uniformScale,
                y: -(arc.control.y - centerY) / uniformScale
              };

              // Get normalized start/end from sketch.points (not original2DPoints)
              const startNorm = sketch.points[cutEdgeIdx];
              const endNorm = sketch.points[(cutEdgeIdx + 1) % sketch.points.length];

              const snappedArc = matchesForward
                ? {
                  start: p1, end: p2, control: arc.control,
                  startNorm, endNorm, controlNorm,
                  edgeIndex: cutEdgeIdx
                }
                : {
                  start: p2, end: p1, control: arc.control,
                  startNorm: endNorm, endNorm: startNorm, controlNorm,
                  edgeIndex: cutEdgeIdx
                };

              updatedSketch.arcEdges.push(snappedArc);

              // Remove this edge from cutEdges (it's now an arc edge)
              updatedSketch.cutEdges = updatedSketch.cutEdges.filter(idx => idx !== cutEdgeIdx);

              // Update the sketch
              if (onSketchUpdate) {
                onSketchUpdate(sketchIdx, updatedSketch);
              }

              integrated = true;
              break;
            }
          }

          if (integrated) break;
        }

        // If not integrated, save as standalone arc
        if (!integrated && onSketchComplete) {
          onSketchComplete({
            type: 'arc',
            arc: arc,
            originalArc: arc,
            closed: false
          });
        }
      });

      // Clear to start new drawing
      setArcs([]);
      setArcStart(null);
      setArcEnd(null);
      setArcControlPoint(null);
    }
  };

  const handleKeyPress = (e) => {
    // Escape - Cancel current drawing or edit mode
    if (e.key === 'Escape') {
      // If editing, restore original sketch and exit edit mode
      if (editingSketchIdx !== null && editingSketchBackup) {
        // Restore the original sketch (it's still in sketches array)
        // Just clear the active drawing state and exit edit mode
        setEditingSketchIdx(null);
        setEditingSketchBackup(null);
      }

      // Clear active drawing
      setCurrentLine([]);
      setPolygonPoints([]);
      setCircleCenter(null);
      setCircleRadius(0);
      if (drawMode === 'line') {
        setLines([]);
      }
      // Clear arc state
      setArcs([]);
      setArcStart(null);
      setArcEnd(null);
      setArcControlPoint(null);
    }

    // Backspace or Delete - Remove last element
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault(); // Prevent browser back navigation

      if (drawMode === 'line') {
        if (currentLine.length > 0) {
          setCurrentLine([]);
        } else if (lines.length > 0) {
          setLines(prev => prev.slice(0, -1));
        }
      } else if (drawMode === 'polygon') {
        if (polygonPoints.length > 0) {
          setPolygonPoints(prev => prev.slice(0, -1));
        }
      } else if (drawMode === 'circle') {
        if (circleCenter) {
          setCircleCenter(null);
          setCircleRadius(0);
        } else if (circles.length > 0) {
          setCircles(prev => prev.slice(0, -1));
        }
      } else if (drawMode === 'arc') {
        // Clear arc in reverse order of creation
        if (arcEnd) {
          setArcEnd(null);
        } else if (arcStart) {
          setArcStart(null);
        } else if (arcs.length > 0) {
          setArcs(prev => prev.slice(0, -1));
        }
      }
    }

    // Enter - Complete sketch
    if (e.key === 'Enter') {
      completeSketch();
    }

    // L key - Switch to line mode
    if (e.key === 'l' && !e.ctrlKey) {
      setDrawMode('line');
      setPolygonPoints([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
      if (onToolChange) onToolChange('line');
    }

    // P key - Switch to polygon mode
    if (e.key === 'p' && !e.ctrlKey) {
      setDrawMode('polygon');
      setLines([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
      if (onToolChange) onToolChange('polygon');
    }

    // C key - Switch to circle mode
    if (e.key === 'c' && !e.ctrlKey) {
      setDrawMode('circle');
      setLines([]);
      setPolygonPoints([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
      if (onToolChange) onToolChange('circle');
    }

    // X key - Switch to cut mode
    if (e.key === 'x' && !e.ctrlKey) {
      setDrawMode('cut');
      setLines([]);
      setPolygonPoints([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
      if (onToolChange) onToolChange('cut');
    }

    // V key - Switch to point mode
    if (e.key === 'v' && !e.ctrlKey) {
      setDrawMode('point');
      setLines([]);
      setPolygonPoints([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
      if (onToolChange) onToolChange('point');
    }

    // A key - Switch to arc mode
    if (e.key === 'a' && !e.ctrlKey) {
      setDrawMode('arc');
      setLines([]);
      setPolygonPoints([]);
      setCurrentLine([]);
      setCircleCenter(null);
      setCircleRadius(0);
      setArcStart(null);
      setArcEnd(null);
      setArcControlPoint(null);
      if (onToolChange) onToolChange('arc');
    }

    // Arrow keys - Pan canvas
    const panStep = 20;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPan(prev => ({ x: prev.x, y: prev.y + panStep }));
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPan(prev => ({ x: prev.x, y: prev.y - panStep }));
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPan(prev => ({ x: prev.x + panStep, y: prev.y }));
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPan(prev => ({ x: prev.x - panStep, y: prev.y }));
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [drawMode, currentLine, polygonPoints, lines, circles, circleCenter, pan, onSketchComplete, arcs, arcStart, arcEnd]);

  return (
    <div className="canvas-2d-container">
      <div className="canvas-2d-toolbar">
        <div className="toolbar-section">
          <label>
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
            />
            Snap to Grid
          </label>
        </div>
        <div className="toolbar-section">
          <span className="status-text">
            {drawMode === 'line'
              ? `Line Mode: ${lines.length} lines${currentLine.length > 0 ? ' (click to place 2nd point)' : ' (click to start)'}`
              : drawMode === 'polygon'
                ? `Polygon Mode: ${polygonPoints.length} points${polygonPoints.length > 0 ? ' (double-click or Enter to complete)' : ' (click to start)'}`
                : drawMode === 'circle'
                  ? `Circle Mode: ${circles.length} circles${circleCenter ? ' (click to set radius)' : ' (click to set center)'}`
                  : drawMode === 'arc'
                    ? `Arc Mode: ${arcs.length} arcs${arcStart ? (arcEnd ? ' (click to set curve)' : ' (click end point)') : ' (click start point)'}`
                    : drawMode === 'cut'
                      ? `Cut Mode: Click on edges to remove them`
                      : drawMode === 'point'
                        ? `Point Mode: Click on edges to add points`
                        : `Select Mode`
            }
          </span>
        </div>
        <div className="toolbar-section">
          <span className="help-text">
            L: line • P: polygon • C: circle • Scroll: zoom • ↑↓←→: pan • Backspace: undo • ESC: cancel • Enter: save • I: 3D
          </span>
        </div>
        <div className="toolbar-section">
          <span className="status-text">
            Zoom: {(zoom * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'stretch',
          position: 'relative',
          backgroundColor: '#1a1a1a'
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="sketch-canvas"
          onMouseDown={(e) => {
            handleMiddleMouseDown(e);
            if (e.button === 0 && !e.shiftKey) handleMouseDown(e);
          }}
          onMouseUp={handleMiddleMouseUp}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            cursor: isPanning ? 'grabbing' : 'crosshair',
            backgroundColor: '#1a1a1a'
          }}
        />
      </div>
    </div>
  );
};

const ViewportManager = forwardRef(({
  features,
  onFeatureAdd,
  onFeatureDelete,
  onFeatureUpdate,
  selectedFeature,
  onFeatureSelect,
  activeTool,
  onToolChange,
  modelUrl,
  onModelLoad,
  onModelCaptured,
  viewMode: viewModeProp,
  onViewModeChange,
  onSketchesChange
}, ref) => {
  // Use prop viewMode if provided, otherwise fallback to local state
  const [localViewMode, setLocalViewMode] = useState(modelUrl ? '3d' : '2d');
  const viewMode = viewModeProp ?? localViewMode;
  const setViewMode = onViewModeChange ?? setLocalViewMode;

  const [sketches, setSketches] = useState([]);

  // Report sketches to parent App component
  useEffect(() => {
    if (onSketchesChange) {
      onSketchesChange(sketches);
    }
  }, [sketches, onSketchesChange]);

  const [activeSketch, setActiveSketch] = useState(null);
  const [zoom, setZoom] = useState(1); // Zoom for 2D canvas
  const threeViewerRef = useRef();

  // Expose camera control methods to parent
  useImperativeHandle(ref, () => ({
    setFrontView: () => {
      threeViewerRef.current?.setFrontView();
    },
    setTopView: () => {
      threeViewerRef.current?.setTopView();
    },
    setRightView: () => {
      threeViewerRef.current?.setRightView();
    },
    setIsoView: () => {
      threeViewerRef.current?.setIsoView();
    },
    fitToScreen: () => {
      threeViewerRef.current?.fitToScreen();
    },
    clearAll: () => {
      // Clear all sketches and reset state
      setSketches([]);
      setActiveSketch(null);
    },
    zoomIn: () => {
      if (viewMode === '2d') {
        setZoom(prev => Math.min(5, prev + 0.2));
      } else if (threeViewerRef.current?.zoomIn) {
        threeViewerRef.current.zoomIn();
      }
    },
    zoomOut: () => {
      if (viewMode === '2d') {
        setZoom(prev => Math.max(0.2, prev - 0.2));
      } else if (threeViewerRef.current?.zoomOut) {
        threeViewerRef.current.zoomOut();
      }
    },
    deleteSketch: (sketchId) => {
      setSketches(prev => prev.filter(s => s.id !== sketchId));
    },
    toggleSketchVisibility: (sketchId) => {
      setSketches(prev => prev.map(s =>
        s.id === sketchId ? { ...s, visible: !s.visible } : s
      ));
    },
    getProjectData: () => {
      return { sketches };
    },
    loadProjectData: (data) => {
      if (data && Array.isArray(data.sketches)) {
        setSketches(data.sketches);
      }
    }
  }));

  // Listen for ISO key press to switch to 3D
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Check for 'i' key (for ISO view)
      if (e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.altKey) {
        toggleViewMode();
      }
      // Escape to go back to 2D
      if (e.key === 'Escape' && viewMode === '3d') {
        setViewMode('2d');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [viewMode]);

  const toggleViewMode = () => {
    setViewMode(prev => prev === '2d' ? '3d' : '2d');
  };

  const handleSketchComplete = (sketchData) => {
    // Get canvas dimensions for proper normalization
    const canvas = document.querySelector('.sketch-canvas');
    const canvasWidth = canvas ? canvas.width : 800;
    const canvasHeight = canvas ? canvas.height : 600;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Use uniform scale to preserve aspect ratio (same scale for X and Y)
    // This ensures a square drawn on canvas remains square in 3D
    const uniformScale = Math.min(centerX, centerY);

    let newSketch;

    if (sketchData.type === 'lines') {
      // Handle independent lines
      if (!sketchData.lines || sketchData.lines.length === 0) return;

      // Normalize line endpoints using uniform scale to preserve aspect ratio
      const normalizedLines = sketchData.lines.map(line => [
        {
          x: (line[0].x - centerX) / uniformScale,
          y: -(line[0].y - centerY) / uniformScale
        },
        {
          x: (line[1].x - centerX) / uniformScale,
          y: -(line[1].y - centerY) / uniformScale
        }
      ]);

      newSketch = {
        id: `sketch_${Date.now()}`,
        type: 'lines',
        name: `Lines ${sketches.length + 1}`,
        lines: normalizedLines,
        originalLines: sketchData.lines,
        closed: sketchData.closed,
        visible: true,
        created: new Date().toISOString()
      };
    } else if (sketchData.type === 'polygon') {
      // Handle polygon/closed shape
      if (!sketchData.points || sketchData.points.length < 3) return;

      // Convert 2D points to normalized coordinates using uniform scale
      const normalizedPoints = sketchData.points.map(point => ({
        x: (point.x - centerX) / uniformScale,
        y: -(point.y - centerY) / uniformScale
      }));

      newSketch = {
        id: `sketch_${Date.now()}`,
        type: 'polygon',
        name: `Polygon ${sketches.length + 1}`,
        points: normalizedPoints,
        original2DPoints: sketchData.points,
        closed: true,
        visible: true,
        created: new Date().toISOString()
      };
    } else if (sketchData.type === 'circles') {
      // Handle circles
      if (!sketchData.circles || sketchData.circles.length === 0) return;

      // Normalize circle data using uniform scale
      const normalizedCircles = sketchData.circles.map(circle => ({
        center: {
          x: (circle.center.x - centerX) / uniformScale,
          y: -(circle.center.y - centerY) / uniformScale
        },
        radius: circle.radius / uniformScale // Normalize radius with same scale
      }));

      newSketch = {
        id: `sketch_${Date.now()}`,
        type: 'circles',
        name: `Circles ${sketches.length + 1}`,
        circles: normalizedCircles,
        originalCircles: sketchData.circles,
        closed: true,
        visible: true,
        created: new Date().toISOString()
      };
    } else if (sketchData.type === 'arc') {
      // Handle arc
      if (!sketchData.arc) return;

      // Normalize arc points using uniform scale
      const normalizedArc = {
        start: {
          x: (sketchData.arc.start.x - centerX) / uniformScale,
          y: -(sketchData.arc.start.y - centerY) / uniformScale
        },
        end: {
          x: (sketchData.arc.end.x - centerX) / uniformScale,
          y: -(sketchData.arc.end.y - centerY) / uniformScale
        },
        control: {
          x: (sketchData.arc.control.x - centerX) / uniformScale,
          y: -(sketchData.arc.control.y - centerY) / uniformScale
        },
        // Store normalized control point for consistent sampling
        controlNorm: {
          x: (sketchData.arc.control.x - centerX) / uniformScale,
          y: -(sketchData.arc.control.y - centerY) / uniformScale
        }
      };

      newSketch = {
        id: `sketch_${Date.now()}`,
        type: 'arc',
        name: `Arc ${sketches.length + 1}`,
        arc: normalizedArc,
        originalArc: sketchData.arc,
        closed: false,
        visible: true,
        created: new Date().toISOString()
      };
    }

    if (newSketch) {
      setSketches(prev => [...prev, newSketch]);

      // Add to features list
      if (onFeatureAdd) {
        onFeatureAdd(newSketch);
      }
    }
  };

  const handlePointAdd = (point) => {
    // Real-time feedback while sketching
  };

  return (
    <div className="viewport-manager">

      <div className="viewport-content">
        {viewMode === '2d' ? (
          <Canvas2D
            onSketchComplete={handleSketchComplete}
            sketches={sketches}
            onSketchUpdate={(idx, updatedSketch) => {
              // Preserve normalized control points if not explicitly updated
              if (sketches[idx].type === 'polygon' && updatedSketch.arcEdges && sketches[idx].arcEdges) {
                // Copy checking or restoration logic could go here if needed, 
                // but for now we assume updatedSketch is constructed carefully by the tool.
              }

              // Update internal sketches state
              setSketches(prev => prev.map((s, i) => i === idx ? updatedSketch : s));
              // Also sync with App.jsx features for Feature Tree and Extrusion
              if (onFeatureUpdate && updatedSketch.id) {
                onFeatureUpdate(updatedSketch.id, updatedSketch);
              }
            }}
            activeSketch={activeSketch}
            onPointAdd={handlePointAdd}
            activeTool={activeTool}
            onToolChange={onToolChange}
            zoom={zoom}
            onZoomChange={setZoom}
          />
        ) : (
          <ThreeViewer
            ref={threeViewerRef}
            features={features}
            onFeatureSelect={onFeatureSelect}
            selectedFeature={selectedFeature}
            sketches={sketches}
            modelUrl={modelUrl}
            onModelLoad={onModelLoad}
            onModelCaptured={onModelCaptured}
            activeTool={activeTool}
          />
        )}
      </div>

      <div className="viewport-status">
        <div className="status-left">
          {viewMode === '2d' ? (
            <span>Sketch Mode - Draw profiles to create 3D geometry</span>
          ) : (
            <span>3D Model View - Modify and visualize your designs</span>
          )}
        </div>
        <div className="status-right">
          <span>Sketches: {sketches.length} | Features: {features.length}</span>
        </div>
      </div>
    </div>
  );
});

export default ViewportManager;