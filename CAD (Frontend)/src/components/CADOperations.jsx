// CAD Operations Panel - Extrusion and Feature Operations
import React, { useState, useEffect } from 'react';
import { FaCube } from 'react-icons/fa';
import cadGeometryService from '../cad/CADGeometryService';

/**
 * Extract ordered points from lines by walking the chain
 * @param {Array} lines - Array of line segments [[{x,y}, {x,y}], ...]
 * @param {Array} cutEdges - Optional array of indices of lines that have been cut
 */
const extractOrderedPointsFromLines = (lines, cutEdges = []) => {
  if (!lines || lines.length === 0) return [];

  // Filter out cut edges
  const activeLines = lines.filter((_, idx) => !cutEdges.includes(idx));

  if (activeLines.length === 0) return [];

  const orderedPoints = [];
  const usedLines = new Set();

  // Start with first active line
  orderedPoints.push(activeLines[0][0]);
  orderedPoints.push(activeLines[0][1]);
  usedLines.add(0);

  // Walk the chain
  let lastPoint = activeLines[0][1];
  let changed = true;

  while (changed && usedLines.size < activeLines.length) {
    changed = false;
    for (let i = 0; i < activeLines.length; i++) {
      if (usedLines.has(i)) continue;

      const line = activeLines[i];
      const dist0 = Math.sqrt((line[0].x - lastPoint.x) ** 2 + (line[0].y - lastPoint.y) ** 2);
      const dist1 = Math.sqrt((line[1].x - lastPoint.x) ** 2 + (line[1].y - lastPoint.y) ** 2);

      if (dist0 < 0.01) {
        orderedPoints.push(line[1]);
        lastPoint = line[1];
        usedLines.add(i);
        changed = true;
        break;
      } else if (dist1 < 0.01) {
        orderedPoints.push(line[0]);
        lastPoint = line[0];
        usedLines.add(i);
        changed = true;
        break;
      }
    }
  }

  // Remove last point if it's the same as first (closed loop duplicate)
  if (orderedPoints.length > 1) {
    const first = orderedPoints[0];
    const last = orderedPoints[orderedPoints.length - 1];
    const dist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
    if (dist < 0.01) {
      orderedPoints.pop();
    }
  }

  return orderedPoints;
};

const CADOperations = ({ sketches = [], onExtrudeComplete }) => {
  const [extrudeHeight, setExtrudeHeight] = useState(2);
  const [selectedSketchId, setSelectedSketchId] = useState('');
  const [isExtruding, setIsExtruding] = useState(false);
  const [cadReady, setCadReady] = useState(false);
  const [extrudedIds, setExtrudedIds] = useState(new Set());
  const [error, setError] = useState(null);

  // Initialize CAD service
  useEffect(() => {
    cadGeometryService.init().then(() => setCadReady(true)).catch(() => { });
  }, []);

  // Get un-extruded closed sketches
  const availableSketches = sketches.filter(s =>
    !extrudedIds.has(s.id) && (s.type === 'polygon' || (s.type === 'lines' && s.closed))
  );

  const handleExtrude = async () => {
    if (!cadReady || !selectedSketchId) return;

    const sketch = sketches.find(s => s.id === selectedSketchId);
    if (!sketch) return;

    // Get points from sketch - walk line chain to preserve order
    let sketchPoints;
    const cutEdges = sketch.cutEdges || [];

    if (sketch.type === 'polygon' && sketch.points) {
      // For polygons, filter out cut edges from the point list
      if (cutEdges.length > 0) {
        setError('Cannot extrude: sketch has cut edges (open geometry). Close the shape first.');
        return;
      }
      sketchPoints = sketch.points;
    } else if (sketch.type === 'lines' && sketch.lines) {
      sketchPoints = extractOrderedPointsFromLines(sketch.lines, cutEdges);
      // Check if we have a closed shape after removing cut edges
      if (cutEdges.length > 0 && sketchPoints.length < 3) {
        setError('Cannot extrude: not enough edges after cutting. Need at least 3.');
        return;
      }
    }

    if (!sketchPoints || sketchPoints.length < 3) {
      setError('Sketch must have at least 3 points');
      return;
    }

    // Validate height
    if (extrudeHeight <= 0) {
      setError('Height must be positive');
      return;
    }

    setIsExtruding(true);
    setError(null);

    try {
      const worldPoints = sketchPoints.map(p => ({
        x: p.x * 3,
        y: p.y * 3
      }));

      const brepShape = cadGeometryService.extrudeProfile(worldPoints, extrudeHeight);
      const meshData = cadGeometryService.shapeToMesh(brepShape);

      // Mark sketch as extruded using local state
      setExtrudedIds(prev => new Set([...prev, sketch.id]));

      if (onExtrudeComplete) {
        onExtrudeComplete({
          id: `extrude_${Date.now()}`,
          sourceSketchId: sketch.id,
          meshData,
          height: extrudeHeight
        });
      }

      setSelectedSketchId('');
    } catch (err) {
      setError(err.message || 'Extrusion failed');
    } finally {
      setIsExtruding(false);
    }
  };

  return (
    <div className="cad-operations">
      <div className="operations-header">
        <h3>Operations</h3>
      </div>

      {/* Extrude Panel */}
      <div className="operation-panel">
        <h4><FaCube /> Extrude Sketch</h4>

        {!cadReady ? (
          <div className="loading-cad">Loading CAD kernel...</div>
        ) : availableSketches.length === 0 ? (
          <div className="no-sketches">
            <p>No sketches available</p>
            <small>Draw a closed shape in 2D mode, press Enter to save</small>
          </div>
        ) : (
          <>
            <div className="parameter-group">
              <label>Select Sketch:</label>
              <select
                value={selectedSketchId}
                onChange={(e) => { setSelectedSketchId(e.target.value); setError(null); }}
                className="sketch-select"
              >
                <option value="">-- Choose sketch --</option>
                {availableSketches.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type === 'polygon' ? s.points?.length : s.lines?.length} pts)
                  </option>
                ))}
              </select>
            </div>

            <div className="parameter-group">
              <label>Height:</label>
              <input
                type="number"
                value={extrudeHeight}
                onChange={(e) => setExtrudeHeight(parseFloat(e.target.value) || 1)}
                min="0.1"
                max="50"
                step="0.5"
              />
              <span className="unit">units</span>
            </div>

            {error && (
              <div className="extrude-error" style={{
                padding: '8px',
                marginBottom: '8px',
                background: 'rgba(220, 38, 38, 0.2)',
                border: '1px solid #dc2626',
                borderRadius: '4px',
                color: '#fca5a5',
                fontSize: '12px'
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              className="operation-btn primary"
              onClick={handleExtrude}
              disabled={!selectedSketchId || isExtruding}
            >
              {isExtruding ? 'Extruding...' : '⬆️ Apply Extrude'}
            </button>
          </>
        )}
      </div>

    </div>
  );
};

export default CADOperations;
