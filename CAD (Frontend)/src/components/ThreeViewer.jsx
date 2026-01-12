// ThreeViewer with Sketch Extrusion Support
import React, { Suspense, useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Sphere, Cylinder, Cone, Html, useGLTF, Center } from '@react-three/drei';
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
  const [cadReady, setCadReady] = useState(false);

  const { sketches = [], features = [], modelUrl, onModelLoad } = props;

  // Get 3D solids from features (extruded via sidebar)
  const featureSolids = features
    .filter(f => f.type === '3d-solid' && f.meshData)
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
            modelUrl={modelUrl}
            onModelLoad={onModelLoad}
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
        <div>🖱️ LMB: Orbit</div>
        <div>🖱️ RMB: Pan</div>
        <div>⚙️ Scroll: Zoom</div>
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
