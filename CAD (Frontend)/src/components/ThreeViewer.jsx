import React, { Suspense, useRef, useState, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Box, Sphere, Cylinder, Cone, Html, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import cadGeometryService from '../cad/CADGeometryService';
import { sampleSketchPoints } from '../utils/geometryUtils';

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
  />
);

// Component to load external GLB/GLTF models — exposes groupRef for TransformControls
const LoadedModel = forwardRef(({ url, onLoad, onModelCaptured, onClick }, ref) => {
  const groupRef = useRef();
  const { scene } = useGLTF(url, true);
  const capturedRef = useRef(false);

  // Expose the group ref to parent
  useImperativeHandle(ref, () => groupRef.current);

  useEffect(() => {
    if (!scene) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    let totalVertexCount = 0;

    // Collect all mesh geometries for capture
    const allVertices = [];
    const allIndices = [];
    let indexOffset = 0;

    scene.traverse((child) => {
      if (child.isMesh && child.geometry?.attributes?.position) {
        const posAttr = child.geometry.attributes.position;
        totalVertexCount += posAttr.count;

        // Copy vertices (applying world matrix for correct positioning)
        const worldMatrix = child.matrixWorld;
        for (let i = 0; i < posAttr.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
          v.applyMatrix4(worldMatrix);
          allVertices.push(v.x, v.y, v.z);
        }

        // Copy indices (offset by previous vertex count)
        const idx = child.geometry.index;
        if (idx) {
          for (let i = 0; i < idx.count; i++) {
            allIndices.push(idx.getX(i) + indexOffset);
          }
        } else {
          for (let i = 0; i < posAttr.count; i++) {
            allIndices.push(i + indexOffset);
          }
        }
        indexOffset += posAttr.count;
      }
    });

    if (onLoad) {
      onLoad({ vertices: totalVertexCount, size });
    }

    // Capture mesh data into features (only once per URL)
    if (onModelCaptured && !capturedRef.current && allVertices.length > 0) {
      capturedRef.current = true;
      const meshData = {
        vertices: new Float32Array(allVertices),
        indices: new Uint32Array(allIndices),
        normals: new Float32Array(allVertices.length)
      };
      onModelCaptured(meshData);
    }
  }, [scene, onLoad, onModelCaptured]);

  // Center the model using bounding box
  const centeredScene = React.useMemo(() => {
    const clone = scene.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center);
    return clone;
  }, [scene]);

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(groupRef.current);
      }}
    >
      <primitive object={centeredScene} />
    </group>
  );
});

// Camera controller — exposes orbit controls ref so TransformControls can disable it
const CameraController = forwardRef(({ orbitRef }, ref) => {
  const { camera } = useThree();
  const controlsRef = useRef();

  // Sync internal ref with external orbitRef
  useEffect(() => {
    if (orbitRef) orbitRef.current = controlsRef.current;
  }, [controlsRef.current]);

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
      const pos = camera.position.clone();
      const target = controlsRef.current?.target || { x: 0, y: 1, z: 0 };
      const direction = pos.clone().sub(target).normalize();
      const distance = pos.distanceTo(target);
      const newDistance = Math.max(3, distance * 0.8);
      camera.position.copy(target).add(direction.multiplyScalar(newDistance));
      controlsRef.current?.update();
    },
    zoomOut: () => {
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
    <mesh geometry={geometry} position={position} rotation={[-Math.PI / 2, 0, 0]}>
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

  // Use shared geometry utility to get points (includes arc sampling)
  points = sampleSketchPoints(sketch).map(p => new THREE.Vector3(p.x * 3, height, -p.y * 3));
  if (points.length > 2) points.push(points[0]); // Close loop

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

// Scene component — now manages selection + transform state
const Scene = ({ cameraRef, orbitRef, modelUrl, onModelLoad, onModelCaptured, extrudedGeometries, sketches }) => {
  const [selectedObject, setSelectedObject] = useState(null);
  const [transformMode, setTransformMode] = useState('translate'); // translate, rotate, scale
  const transformRef = useRef();
  const modelRef = useRef();

  // Disable orbit controls while dragging the transform gizmo
  useEffect(() => {
    const tc = transformRef.current;
    if (!tc) return;

    const onDragStart = () => {
      if (orbitRef?.current) orbitRef.current.enabled = false;
    };
    const onDragEnd = () => {
      if (orbitRef?.current) orbitRef.current.enabled = true;
    };

    tc.addEventListener('dragging-changed', (event) => {
      if (event.value) onDragStart();
      else onDragEnd();
    });

    return () => {
      tc.removeEventListener('dragging-changed', onDragStart);
      tc.removeEventListener('dragging-changed', onDragEnd);
    };
  }, [selectedObject, orbitRef]);

  // W/E/R key switching for transform mode
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'w' && !e.ctrlKey) setTransformMode('translate');
      if (e.key === 'e' && !e.ctrlKey) setTransformMode('rotate');
      if (e.key === 'r' && !e.ctrlKey) setTransformMode('scale');
      // Deselect on Escape
      if (e.key === 'Escape') setSelectedObject(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Click on empty space to deselect
  const handleMiss = useCallback((e) => {
    // Only deselect if clicking the background, not a mesh
    if (e.object?.type === 'GridHelper' || !e.object) {
      setSelectedObject(null);
    }
  }, []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
      <CameraController ref={cameraRef} orbitRef={orbitRef} />
      <WorkPlane />

      {/* Click background to deselect */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}
        onClick={() => setSelectedObject(null)}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* External model */}
      {modelUrl && (
        <Suspense fallback={<LoadingSpinner />}>
          <LoadedModel
            ref={modelRef}
            url={modelUrl}
            onLoad={onModelLoad}
            onModelCaptured={onModelCaptured}
            onClick={(obj) => setSelectedObject(obj)}
          />
        </Suspense>
      )}

      {/* TransformControls gizmo — attached to selected object */}
      {selectedObject && (
        <TransformControls
          ref={transformRef}
          object={selectedObject}
          mode={transformMode}
          size={0.8}
        />
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

      {/* Transform mode indicator overlay */}
      {selectedObject && (
        <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            position: 'fixed',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20, 20, 20, 0.95)',
            padding: '8px 18px',
            borderRadius: '8px',
            border: '1px solid rgba(100, 100, 100, 0.5)',
            fontSize: '12px',
            color: '#fff',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            pointerEvents: 'auto',
            userSelect: 'none',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ color: '#888' }}>Mode:</span>
            <span style={{
              color: transformMode === 'translate' ? '#4facfe' : '#888',
              fontWeight: transformMode === 'translate' ? '700' : '400',
              cursor: 'pointer'
            }} onClick={() => setTransformMode('translate')}>
              [W] Move
            </span>
            <span style={{
              color: transformMode === 'rotate' ? '#4facfe' : '#888',
              fontWeight: transformMode === 'rotate' ? '700' : '400',
              cursor: 'pointer'
            }} onClick={() => setTransformMode('rotate')}>
              [E] Rotate
            </span>
            <span style={{
              color: transformMode === 'scale' ? '#4facfe' : '#888',
              fontWeight: transformMode === 'scale' ? '700' : '400',
              cursor: 'pointer'
            }} onClick={() => setTransformMode('scale')}>
              [R] Scale
            </span>
            <span style={{ color: '#666', marginLeft: '8px' }}>ESC: Deselect</span>
          </div>
        </Html>
      )}
    </>
  );
};

const ThreeViewer = forwardRef((props, ref) => {
  const cameraRef = useRef();
  const orbitRef = useRef();
  const [cadReady, setCadReady] = useState(false);

  const { sketches = [], features = [], modelUrl, onModelLoad, onModelCaptured } = props;

  // Get 3D solids from features (extruded via sidebar)
  // Exclude AI-captured models — they're already rendered by the GLB primitive
  const featureSolids = features
    .filter(f => f.type === '3d-solid' && f.meshData && f.source !== 'ai-model')
    .map(f => ({ id: f.id, meshData: f.meshData, color: '#4ecdc4' }));

  // Initialize CAD service
  useEffect(() => {
    cadGeometryService.init().then(() => setCadReady(true)).catch(() => { });
  }, []);

  useImperativeHandle(ref, () => ({
    fitToScreen: () => cameraRef.current?.fitToScreen(),
    setFrontView: () => cameraRef.current?.setFrontView(),
    setTopView: () => cameraRef.current?.setTopView(),
    setRightView: () => cameraRef.current?.setRightView(),
    setIsoView: () => cameraRef.current?.setIsoView(),
    zoomIn: () => cameraRef.current?.zoomIn(),
    zoomOut: () => cameraRef.current?.zoomOut(),
  }));

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
            orbitRef={orbitRef}
            modelUrl={modelUrl}
            onModelLoad={onModelLoad}
            onModelCaptured={onModelCaptured}
            extrudedGeometries={featureSolids}
            sketches={sketches}
          />
        </Suspense>
      </Canvas>


      {/* Extrusion is handled via sidebar CADOperations */}

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
        <div>🖱️ LMB: Orbit / Select</div>
        <div>🖱️ RMB: Pan</div>
        <div>⚙️ Scroll: Zoom</div>
        <div style={{ marginTop: '6px', borderTop: '1px solid #444', paddingTop: '6px' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', color: '#fff' }}>Edit Model</div>
          <div>Click model to select</div>
          <div>W: Move • E: Rotate • R: Scale</div>
          <div>ESC: Deselect</div>
        </div>
      </div>

      {/* Geometry counter */}
      {featureSolids.length > 0 && (
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
          3D Objects: {featureSolids.length}
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