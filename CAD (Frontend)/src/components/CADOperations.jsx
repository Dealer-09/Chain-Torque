// CAD Operations Panel - Extrusion and Feature Operations
import React, { useState, useEffect } from 'react';
import { FaCube } from 'react-icons/fa';
import cadClient from '../cad/cadClient';
import { sampleSketchPoints } from '../utils/geometryUtils';

const CADOperations = ({ sketches = [], onExtrudeComplete, onPrimitiveAdd }) => {
  const [extrudeHeight, setExtrudeHeight] = useState(2);
  const [selectedSketchId, setSelectedSketchId] = useState('');
  const [isExtruding, setIsExtruding] = useState(false);
  const [cadReady, setCadReady] = useState(false);
  const [extrudedIds, setExtrudedIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [primitiveSize, setPrimitiveSize] = useState(2);

  // Initialize CAD service
  useEffect(() => {
    cadClient.init().then(() => setCadReady(true)).catch(() => { });
  }, []);

  // Normalized sketch units -> world units. Polygons/circles are stored in the
  // canvas-normalized [-1,1] space; this is the single factor that maps them to
  // CAD world units, and MUST match for circles and polygons so an extruded
  // circle lands at the same scale/position as an extruded polygon.
  const WORLD_SCALE = 3;

  // Get un-extruded closed profiles. Circles are closed by definition, so they
  // are extrudable too (each circle becomes a cylinder).
  const availableSketches = sketches.filter(s =>
    !extrudedIds.has(s.id) && (
      s.type === 'polygon' ||
      (s.type === 'lines' && s.closed) ||
      (s.type === 'circles' && s.circles?.length > 0)
    )
  );

  const handleExtrude = async () => {
    if (!cadReady || !selectedSketchId) return;

    const sketch = sketches.find(s => s.id === selectedSketchId);
    if (!sketch) return;

    // Validate height up front (shared by all profile types).
    if (extrudeHeight <= 0) {
      setError('Height must be positive');
      return;
    }

    // Circles extrude to a TRUE cylinder (analytic BRepPrimAPI_MakeCylinder),
    // not a faceted polygon prism — this is how a real CAD extrudes a circular
    // profile. Each circle in the sketch becomes its own cylinder solid, mirroring
    // SolidWorks treating every closed profile in a sketch as a separate region.
    if (sketch.type === 'circles') {
      const circles = (sketch.circles || []).filter(c => c?.center && Math.abs(c.radius) > 0);
      if (circles.length === 0) {
        setError('Circle has zero radius — draw a larger circle.');
        return;
      }

      setIsExtruding(true);
      setError(null);
      try {
        const stamp = Date.now();
        for (let i = 0; i < circles.length; i++) {
          const c = circles[i];
          // The cylinder is built with its base on the z=0 sketch plane (createCylinder
          // centers the solid on position.z, so z = height/2 puts the base at 0),
          // matching how polygon profiles extrude upward from the sketch plane.
          const meshData = await cadClient.primitiveToMesh(
            'cylinder',
            { radius: Math.abs(c.radius) * WORLD_SCALE, height: extrudeHeight },
            {
              x: c.center.x * WORLD_SCALE,
              y: c.center.y * WORLD_SCALE,
              z: extrudeHeight / 2,
            }
          );

          if (onExtrudeComplete) {
            onExtrudeComplete({
              id: `extrude_${stamp}_${i}`,
              sourceSketchId: sketch.id,
              meshData,
              height: extrudeHeight,
            });
          }
        }

        setExtrudedIds(prev => new Set([...prev, sketch.id]));
        setSelectedSketchId('');
      } catch (err) {
        setError(err.message || 'Cylinder extrusion failed');
      } finally {
        setIsExtruding(false);
      }
      return;
    }

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
        x: p.x * WORLD_SCALE,
        y: p.y * WORLD_SCALE
      }));

      const meshData = await cadClient.extrudeToMesh(worldPoints, extrudeHeight);

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

  // Blender-style "Add" palette: drop an analytic primitive solid at the origin.
  // Every primitive is a true BREP solid from the kernel (sphere/box/cylinder/cone),
  // sized from a single characteristic dimension; the user repositions/scales it
  // afterward with the transform gizmo (W/E/R).
  const handleAddPrimitive = async (type) => {
    if (!cadReady || isExtruding) return;

    const s = Math.abs(primitiveSize) || 2;
    const r = s / 2;
    const position = { x: 0, y: 0, z: 0 };

    let params;
    switch (type) {
      case 'sphere':   params = { radius: r }; break;
      case 'cube':     params = { width: s, height: s, depth: s }; break;
      case 'cylinder': params = { radius: r, height: s }; break;
      case 'cone':     params = { radius: r, radiusTop: 0, height: s }; break;
      default: return;
    }

    setIsExtruding(true);
    setError(null);
    try {
      const meshData = await cadClient.primitiveToMesh(type, params, position);
      if (onPrimitiveAdd) onPrimitiveAdd({ type, meshData });
    } catch (err) {
      setError(err.message || `Failed to add ${type}`);
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
                    {s.name} ({
                      s.type === 'polygon'
                        ? `${s.points?.length ?? 0} pts`
                        : s.type === 'circles'
                          ? `${s.circles?.length ?? 0} circle${(s.circles?.length ?? 0) === 1 ? '' : 's'}`
                          : `${s.lines?.length ?? 0} edges`
                    })
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

      {/* Add Primitive — Blender-style quick insert of analytic solids */}
      <div className="operation-panel">
        <h4><FaCube /> Add Primitive</h4>

        <div className="parameter-group">
          <label>Size:</label>
          <input
            type="number"
            value={primitiveSize}
            onChange={(e) => setPrimitiveSize(parseFloat(e.target.value) || 1)}
            min="0.1"
            max="50"
            step="0.5"
          />
          <span className="unit">units</span>
        </div>

        <div
          className="primitive-buttons"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}
        >
          <button className="operation-btn" disabled={!cadReady || isExtruding} onClick={() => handleAddPrimitive('cube')}>⬛ Cube</button>
          <button className="operation-btn" disabled={!cadReady || isExtruding} onClick={() => handleAddPrimitive('sphere')}>⚪ Sphere</button>
          <button className="operation-btn" disabled={!cadReady || isExtruding} onClick={() => handleAddPrimitive('cylinder')}>🛢️ Cylinder</button>
          <button className="operation-btn" disabled={!cadReady || isExtruding} onClick={() => handleAddPrimitive('cone')}>🔺 Cone</button>
        </div>

        {!cadReady && (
          <div className="loading-cad" style={{ marginTop: '8px' }}>Loading CAD kernel...</div>
        )}
      </div>

    </div>
  );
};

export default CADOperations;
