// src/components/ViewportManager.js
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import ThreeViewer from './ThreeViewer.jsx';

// Integrated 2D Canvas Component
const Canvas2D = ({ onSketchComplete, sketches, activeSketch, onPointAdd, activeTool, onToolAction, onToolChange, zoom: zoomProp, onZoomChange }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [drawMode, setDrawMode] = useState('line'); // 'line', 'polygon', or 'circle'
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
    } else if (activeTool === 'delete') {
      // Clear all
      setCurrentLine([]);
      setPolygonPoints([]);
      setLines([]);
      setCircleCenter(null);
      setCircleRadius(0);
      setCircles([]);
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
    sketches.forEach(sketch => {
      // Skip hidden sketches
      if (sketch.visible === false) return;

      if (sketch.type === 'lines' && sketch.originalLines) {
        // Draw saved lines using original canvas coordinates
        sketch.originalLines.forEach(line => {
          drawLine(ctx, line[0], line[1], 'hsl(142 76% 36%)', 2);
          drawPoint(ctx, line[0], 'hsl(142 76% 36%)', 4);
          drawPoint(ctx, line[1], 'hsl(142 76% 36%)', 4);
        });
      } else if (sketch.type === 'polygon' && sketch.original2DPoints) {
        // Draw saved polygon using original canvas coordinates
        drawPolygon(ctx, sketch.original2DPoints, 'hsl(142 76% 36%)', false);
      } else if (sketch.type === 'circles' && sketch.originalCircles) {
        // Draw saved circles using original canvas coordinates
        sketch.originalCircles.forEach(circle => {
          drawCircle(ctx, circle.center, circle.radius, 'hsl(142 76% 36%)', 2);
          drawPoint(ctx, circle.center, 'hsl(142 76% 36%)', 4);
        });
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

    // Restore canvas state (end zoom/pan transforms)
    ctx.restore();
  }, [sketches, activeSketch, lines, currentLine, polygonPoints, circles, circleCenter, circleRadius, drawMode, snapToGrid, gridSize, canvasSize, zoom, pan]);

  const snapToGridPoint = (x, y) => {
    if (!snapToGrid) return { x, y };
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    return { x: snappedX, y: snappedY };
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

    if (drawMode === 'line') {
      // Line mode: each click adds a point, every 2 points creates a line
      // Limit to 500 lines to prevent memory issues
      if (lines.length >= 500) {
        alert('Maximum 500 lines reached. Press Enter to save or Backspace to undo.');
        return;
      }
      if (currentLine.length === 0) {
        setCurrentLine([snappedPoint]);
      } else if (currentLine.length === 1) {
        // Complete the line
        const newLine = [currentLine[0], snappedPoint];
        setLines(prev => [...prev, newLine]);
        setCurrentLine([]); // Reset for next line
        if (onPointAdd) onPointAdd(snappedPoint);
      }
    } else if (drawMode === 'polygon') {
      // Polygon mode: continuous points
      // Limit to 500 points to prevent memory issues
      if (polygonPoints.length >= 500) {
        alert('Maximum 500 points reached. Press Enter to save or Backspace to undo.');
        return;
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
    }
  };

  const handleMouseMove = (e) => {
    if (drawMode === 'circle' && circleCenter) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

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
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.1, zoom + delta), 5);
    setZoom(newZoom);
  };

  // Prevent browser zoom on the canvas container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const preventBrowserZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
      }
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

  const completeSketch = () => {
    if (drawMode === 'line' && lines.length > 0) {
      // Check if lines form a closed loop
      const isClosed = checkIfClosed([lines[0][0], ...lines.map(l => l[1])]);
      if (onSketchComplete) {
        onSketchComplete({
          lines: lines,
          type: 'lines',
          closed: isClosed
        });
      }
      // Clear to start new drawing
      setLines([]);
      setCurrentLine([]);
    } else if (drawMode === 'polygon' && polygonPoints.length > 2) {
      if (onSketchComplete) {
        onSketchComplete({
          points: polygonPoints,
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
    }
  };

  const handleKeyPress = (e) => {
    // Escape - Cancel only current in-progress drawing (not saved sketches)
    if (e.key === 'Escape') {
      setCurrentLine([]);
      setPolygonPoints([]);
      setCircleCenter(null);
      setCircleRadius(0);
      // Only clear unsaved lines in line mode
      if (drawMode === 'line') {
        setLines([]);
      }
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
  }, [drawMode, currentLine, polygonPoints, lines, circles, circleCenter, pan, onSketchComplete]);

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
                : `Circle Mode: ${circles.length} circles${circleCenter ? ' (click to set radius)' : ' (click to set center)'}`
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
  viewMode: viewModeProp,
  onViewModeChange
}, ref) => {
  // Use prop viewMode if provided, otherwise fallback to local state
  const [localViewMode, setLocalViewMode] = useState(modelUrl ? '3d' : '2d');
  const viewMode = viewModeProp ?? localViewMode;
  const setViewMode = onViewModeChange ?? setLocalViewMode;

  const [sketches, setSketches] = useState([]);
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