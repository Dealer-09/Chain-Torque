// CAD Operations Panel - Extrusion and Feature Operations
import React, { useState, useEffect } from 'react';
import { FaCube, FaRedo, FaPlus, FaMinus } from 'react-icons/fa';
import cadGeometryService from '../cad/CADGeometryService';

const CADOperations = ({ sketches = [], onExtrudeComplete }) => {
  const [extrudeHeight, setExtrudeHeight] = useState(2);
  const [selectedSketchId, setSelectedSketchId] = useState('');
  const [isExtruding, setIsExtruding] = useState(false);
  const [cadReady, setCadReady] = useState(false);
  const [extrudedIds, setExtrudedIds] = useState(new Set()); // Track extruded sketches

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

    // Get points from sketch
    let sketchPoints;
    if (sketch.type === 'polygon' && sketch.points) {
      sketchPoints = sketch.points;
    } else if (sketch.type === 'lines' && sketch.lines) {
      const pointsMap = new Map();
      sketch.lines.forEach(line => {
        const key1 = `${line[0].x.toFixed(4)},${line[0].y.toFixed(4)}`;
        const key2 = `${line[1].x.toFixed(4)},${line[1].y.toFixed(4)}`;
        if (!pointsMap.has(key1)) pointsMap.set(key1, line[0]);
        if (!pointsMap.has(key2)) pointsMap.set(key2, line[1]);
      });
      sketchPoints = Array.from(pointsMap.values());
    }

    if (!sketchPoints || sketchPoints.length < 3) return;

    setIsExtruding(true);

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
      // Handle error silently
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
                onChange={(e) => setSelectedSketchId(e.target.value)}
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
