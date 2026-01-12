// CAD Operations Panel - Extrusion and Feature Operations
import React, { useState, useEffect } from 'react';
import { FaCube } from 'react-icons/fa';
import cadGeometryService from '../cad/CADGeometryService';
import { sampleSketchPoints } from '../utils/geometryUtils';

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

    const sketchPoints = sampleSketchPoints(sketch);

    // Check if shape is closed (validation logic moved/simplified)
    if (sketch.type === 'polygon' && sketch.cutEdges?.length > 0) {
      // Re-verify closure if needed, but sampleSketchPoints returns what it can.
      // The original code had a specific check for cut edges without arcs.
      const arcEdges = sketch.arcEdges || [];
      if (sketch.cutEdges.length > 0 && arcEdges.length === 0) {
        setError('Cannot extrude: sketch has cut edges (open geometry). Close the shape with arcs first.');
        return;
      }
    } else if (sketch.type === 'lines') {
      if (sketch.cutEdges?.length > 0 && sketchPoints.length < 3) {
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
