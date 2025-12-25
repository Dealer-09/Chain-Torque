// ThreeViewer with Sketch Extrusion Support
import React, { Suspense, useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Sphere, Cylinder, Cone, Html, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import cadGeometryService from '../cad/CADGeometryService';

// Work plane grid
const WorkPlane = () => (
  <Grid
    args={[30, 30]}
    cellSize={1}
    cellThickness={0.6}
    cellColor="#404040"
    sectionSize={5}
    sectionThickness={1.2}
    sectionColor="#555555"
    fadeDistance={35}
    fadeStrength={1}
    position={[0, 0, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
  />
);

// Component to load external GLB/GLTF models
const LoadedModel = ({ url, onLoad }) => {
  const groupRef = useRef();
  const { scene } = useGLTF(url, true);

  useEffect(() => {
    if (scene && onLoad) {
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      let count = 0;
      scene.traverse((child) => {
        if (child.isMesh && child.geometry?.attributes?.position) {
          count += child.geometry.attributes.position.count;
        }
      });
      onLoad({ vertices: count, size });
    }
  }, [scene, onLoad]);

  return (
    <Center>
      <primitive object={scene.clone()} />
    </Center>
  );
};

// Camera controller
const CameraController = forwardRef((props, ref) => {
  const { camera } = useThree();
  const controlsRef = useRef();

  useImperativeHandle(ref, () => ({
    fitToScreen: () => {
      camera.position.set(8, 8, 8);
      camera.lookAt(0, 1, 0);
      controlsRef.current?.target.set(0, 1, 0);
      controlsRef.current?.update();
    },
    setFrontView: () => {
      camera.position.set(0, 1, 10);
      camera.lookAt(0, 1, 0);
      controlsRef.current?.target.set(0, 1, 0);
      controlsRef.current?.update();
    },
    setTopView: () => {
      camera.position.set(0, 10, 0);
      camera.lookAt(0, 0, 0);
      controlsRef.current?.target.set(0, 0, 0);
      controlsRef.current?.update();
    },
    setRightView: () => {
      camera.position.set(10, 1, 0);
      camera.lookAt(0, 1, 0);
      controlsRef.current?.target.set(0, 1, 0);
      controlsRef.current?.update();
    },
    setIsoView: () => {
      camera.position.set(8, 8, 8);
      camera.lookAt(0, 1, 0);
      controlsRef.current?.target.set(0, 1, 0);
      controlsRef.current?.update();
    },
    zoomIn: () => {
      // Move camera 20% closer to target
      const pos = camera.position.clone();
      const target = controlsRef.current?.target || { x: 0, y: 1, z: 0 };
      const direction = pos.clone().sub(target).normalize();
      const distance = pos.distanceTo(target);
      const newDistance = Math.max(3, distance * 0.8);
      camera.position.copy(target).add(direction.multiplyScalar(newDistance));
      controlsRef.current?.update();
    },
    zoomOut: () => {
      // Move camera 20% further from target
      const pos = camera.position.clone();
      const target = controlsRef.current?.target || { x: 0, y: 1, z: 0 };
      const direction = pos.clone().sub(target).normalize();
      const distance = pos.distanceTo(target);
      const newDistance = Math.min(50, distance * 1.2);
      camera.position.copy(target).add(direction.multiplyScalar(newDistance));
      controlsRef.current?.update();
    }
  }));

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={3}
      maxDistance={50}
      maxPolarAngle={Math.PI / 1.8}
      target={[0, 1, 0]}
    />
  );
});

// Extruded mesh from OpenCascade geometry
const ExtrudedMesh = ({ meshData, position = [0, 0, 0], color = '#4ecdc4' }) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(meshData.vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
  geometry.computeVertexNormals();

  return (
    <mesh geometry={geometry} position={position}>
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        metalness={0.3}
        roughness={0.6}
      />
    </mesh>
  );
};

// Sketch wireframe preview in 3D
const SketchPreview = ({ sketch, height = 0 }) => {
  if (!sketch) return null;

  let points = [];

  // Handle polygon type
  if (sketch.type === 'polygon' && sketch.points) {
    points = sketch.points.map(p => new THREE.Vector3(p.x * 3, height, -p.y * 3));
    if (points.length > 2) points.push(points[0]); // Close loop
  }
  // Handle lines type
  else if (sketch.type === 'lines' && sketch.lines) {
    // Extract points from line endpoints in order
    const linePoints = [];
    sketch.lines.forEach(line => {
      linePoints.push(new THREE.Vector3(line[0].x * 3, height, -line[0].y * 3));
      linePoints.push(new THREE.Vector3(line[1].x * 3, height, -line[1].y * 3));
    });
    points = linePoints;
  }

  if (points.length < 2) return null;

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color="#ff9500" linewidth={2} />
    </line>
  );
};

const LoadingSpinner = () => (
  <Html center>
    <div style={{
      padding: '24px 32px',
      background: 'rgba(30, 30, 30, 0.95)',
      borderRadius: '8px',
      textAlign: 'center',
      border: '1px solid rgba(80, 80, 80, 0.5)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
    }}>
      <div style={{
        border: '3px solid #404040',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 12px'
      }} />
      <div style={{ color: '#ccc', fontSize: '13px' }}>Loading...</div>
    </div>
  </Html>
);

const Scene = ({ cameraRef, modelUrl, onModelLoad, extrudedGeometries, sketches }) => (
  <>
    <ambientLight intensity={0.4} />
    <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
    <pointLight position={[-10, -10, -10]} intensity={0.3} />
    <CameraController ref={cameraRef} />
    <WorkPlane />

    {/* External model */}
    {modelUrl && (
      <Suspense fallback={<LoadingSpinner />}>
        <LoadedModel url={modelUrl} onLoad={onModelLoad} />
      </Suspense>
    )}

    {/* Extruded geometries from OpenCascade */}
    {extrudedGeometries.map((geo, i) => (
      <ExtrudedMesh key={geo.id || i} meshData={geo.meshData} color={geo.color || '#4ecdc4'} />
    ))}

    {/* Sketch previews (wireframes) */}
    {sketches?.filter(s => !s.extruded).map((sketch, i) => (
      <SketchPreview key={sketch.id || i} sketch={sketch} />
    ))}

    {/* Axis indicator */}
    <group position={[-8, 0, 8]}>
      <Cylinder args={[0.05, 0.05, 2]} position={[1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#ff0000" />
      </Cylinder>
      <Cone args={[0.1, 0.3]} position={[2.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <meshStandardMaterial color="#ff0000" />
      </Cone>
      <Cylinder args={[0.05, 0.05, 2]} position={[0, 1, 0]}>
        <meshStandardMaterial color="#00ff00" />
      </Cylinder>
      <Cone args={[0.1, 0.3]} position={[0, 2.2, 0]}>
        <meshStandardMaterial color="#00ff00" />
      </Cone>
      <Cylinder args={[0.05, 0.05, 2]} position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#0000ff" />
      </Cylinder>
      <Cone args={[0.1, 0.3]} position={[0, 0, 2.2]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#0000ff" />
      </Cone>
    </group>
  </>
);

const ThreeViewer = forwardRef((props, ref) => {
  const cameraRef = useRef();
  const [extrudedGeometries, setExtrudedGeometries] = useState([]);
  const [extrudedSketchIds, setExtrudedSketchIds] = useState(new Set()); // Track which sketches are extruded
  const [extrudeHeight, setExtrudeHeight] = useState(2);
  const [selectedSketchId, setSelectedSketchId] = useState(null);
  const [isExtruding, setIsExtruding] = useState(false);
  const [cadReady, setCadReady] = useState(false);

  const { sketches = [], features = [], modelUrl, onModelLoad } = props;

  // Get 3D solids from features (extruded via sidebar)
  const featureSolids = features
    .filter(f => f.type === '3d-solid' && f.meshData)
    .map(f => ({ id: f.id, meshData: f.meshData, color: '#4ecdc4' }));

  // Combine local extruded geometries with feature solids
  const allExtrudedGeometries = [...extrudedGeometries, ...featureSolids];

  // Initialize CAD service
  useEffect(() => {
    cadGeometryService.init().then(() => setCadReady(true)).catch(() => { });
  }, []);

  // Get un-extruded sketches (both polygons and closed lines)
  const availableSketches = sketches.filter(s =>
    !extrudedSketchIds.has(s.id) &&
    (s.type === 'polygon' || (s.type === 'lines' && s.closed))
  );

  useImperativeHandle(ref, () => ({
    fitToScreen: () => cameraRef.current?.fitToScreen(),
    setFrontView: () => cameraRef.current?.setFrontView(),
    setTopView: () => cameraRef.current?.setTopView(),
    setRightView: () => cameraRef.current?.setRightView(),
    setIsoView: () => cameraRef.current?.setIsoView(),
    zoomIn: () => cameraRef.current?.zoomIn(),
    zoomOut: () => cameraRef.current?.zoomOut(),
  }));

  const handleExtrude = async () => {
    if (!cadReady || !selectedSketchId) return;

    const sketch = sketches.find(s => s.id === selectedSketchId);
    if (!sketch) return;

    // Get points from sketch - handle both polygon and lines types
    let sketchPoints;
    if (sketch.type === 'polygon' && sketch.points) {
      sketchPoints = sketch.points;
    } else if (sketch.type === 'lines' && sketch.lines) {
      // Extract unique points from line endpoints
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
      // Convert normalized points to world coordinates
      const worldPoints = sketchPoints.map(p => ({
        x: p.x * 3,  // Scale to world units
        y: p.y * 3
      }));

      // Create extruded shape using OpenCascade
      const brepShape = cadGeometryService.extrudeProfile(worldPoints, extrudeHeight);
      const meshData = cadGeometryService.shapeToMesh(brepShape);

      // Add to rendered geometries
      setExtrudedGeometries(prev => [...prev, {
        id: `extrude_${Date.now()}`,
        sourceSketchId: sketch.id,
        meshData,
        color: '#4ecdc4'
      }]);

      // Mark sketch as extruded using local state
      setExtrudedSketchIds(prev => new Set([...prev, sketch.id]));
      setSelectedSketchId(null);
    } catch (err) {
      // Silent fail - user will see nothing happened
    } finally {
      setIsExtruding(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [8, 8, 8], fov: 75, near: 0.1, far: 1000 }}
        shadows
        style={{ background: 'linear-gradient(to bottom, #2d2d2d 0%, #1a1a1a 100%)' }}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <Scene
            cameraRef={cameraRef}
            modelUrl={modelUrl}
            onModelLoad={onModelLoad}
            extrudedGeometries={allExtrudedGeometries}
            sketches={sketches}
          />
        </Suspense>
      </Canvas>

      {/* Extrusion Panel - shows when there are sketches to extrude */}
      {availableSketches.length > 0 && cadReady && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(30, 30, 30, 0.95)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid rgba(80, 80, 80, 0.5)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          color: '#fff',
          minWidth: '220px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '12px', borderBottom: '1px solid #444', paddingBottom: '8px' }}>
            📐 Extrude Sketch
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>
              Select Sketch:
            </label>
            <select
              value={selectedSketchId || ''}
              onChange={(e) => setSelectedSketchId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Choose sketch --</option>
              {availableSketches.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.points?.length} pts)</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>
              Extrusion Height:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                value={extrudeHeight}
                onChange={(e) => setExtrudeHeight(parseFloat(e.target.value) || 1)}
                min="0.1"
                step="0.5"
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#333',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#fff'
                }}
              />
              <span style={{ color: '#888', fontSize: '12px' }}>units</span>
            </div>
          </div>

          <button
            onClick={handleExtrude}
            disabled={!selectedSketchId || isExtruding}
            style={{
              width: '100%',
              padding: '10px',
              background: selectedSketchId ? '#3b82f6' : '#555',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: selectedSketchId ? 'pointer' : 'not-allowed',
              fontWeight: '500'
            }}
          >
            {isExtruding ? 'Extruding...' : '⬆️ Extrude'}
          </button>

          <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
            Draw polygon in 2D → Enter → I → Extrude
          </div>
        </div>
      )}

      {/* Navigation help */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(30, 30, 30, 0.9)',
        padding: '12px 16px',
        borderRadius: '6px',
        border: '1px solid rgba(80, 80, 80, 0.5)',
        fontSize: '11px',
        color: '#ccc'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '6px', color: '#fff' }}>Navigation</div>
        <div>🖱️ LMB: Orbit</div>
        <div>🖱️ RMB: Pan</div>
        <div>⚙️ Scroll: Zoom</div>
      </div>

      {/* Geometry counter */}
      {extrudedGeometries.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          3D Objects: {extrudedGeometries.length}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

export default ThreeViewer;
