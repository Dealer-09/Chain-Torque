// src/components/ThreeViewer.js
import React, { Suspense, useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Sphere, Cylinder, Cone, Html, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';


// Sample 3D objects for demonstration
const SampleCube = ({ position = [0, 1, 0] }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Box
      ref={meshRef}
      position={position}
      args={[2, 2, 2]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial
        color={hovered ? '#ff6b6b' : '#4ecdc4'}
        transparent
        opacity={0.8}
      />
    </Box>
  );
};

const SampleSphere = ({ position = [4, 1, 0] }) => {
  const meshRef = useRef();

  return (
    <Sphere
      ref={meshRef}
      position={position}
      args={[1.5, 32, 32]}
    >
      <meshStandardMaterial
        color="#45b7d1"
        metalness={0.6}
        roughness={0.2}
      />
    </Sphere>
  );
};

const SampleCylinder = ({ position = [-4, 1, 0] }) => {
  return (
    <Cylinder
      position={position}
      args={[1, 1, 3, 16]}
    >
      <meshStandardMaterial
        color="#96ceb4"
        metalness={0.3}
        roughness={0.4}
      />
    </Cylinder>
  );
};

const WorkPlane = () => {
  return (
    <>
      {/* Grid only - Blender style, no solid plane */}
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
    </>
  );
};

// Component to load and display external GLB/GLTF models
const LoadedModel = ({ url, onLoad, onError }) => {
  const groupRef = useRef();
  const { scene } = useGLTF(url, true); // true enables draco decoder

  useEffect(() => {
    if (scene) {
      // Calculate bounding box to center and scale model
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Calculate scale to fit model in view (max dimension = 5 units)
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? 5 / maxDim : 1;

      // Report model info
      if (onLoad) {
        onLoad({
          vertices: countVertices(scene),
          size: { x: size.x, y: size.y, z: size.z },
          scale,
        });
      }
    }
  }, [scene, onLoad]);

  // Count total vertices in scene
  const countVertices = (obj) => {
    let count = 0;
    obj.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const pos = child.geometry.attributes.position;
        if (pos) count += pos.count;
      }
    });
    return count;
  };

  return (
    <Center>
      <primitive object={scene.clone()} />
    </Center>
  );
};

// Error boundary for model loading
const ModelLoadingError = ({ error }) => (
  <Html center>
    <div style={{
      padding: '20px',
      background: 'rgba(255, 100, 100, 0.9)',
      borderRadius: '8px',
      color: 'white',
      textAlign: 'center',
      maxWidth: '300px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>⚠️ Failed to load model</div>
      <div style={{ fontSize: '12px' }}>{error?.message || 'Unknown error'}</div>
    </div>
  </Html>
);

const CameraController = forwardRef((props, ref) => {
  const { camera } = useThree();
  const controlsRef = useRef();

  useImperativeHandle(ref, () => ({
    // Fit to screen - reset camera to show all objects
    fitToScreen: () => {
      camera.position.set(8, 8, 8);
      camera.lookAt(0, 1, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 1, 0);
        controlsRef.current.update();
      }
    },

    // Front view
    setFrontView: () => {
      camera.position.set(0, 1, 10);
      camera.lookAt(0, 1, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 1, 0);
        controlsRef.current.update();
      }
    },

    // Top view
    setTopView: () => {
      camera.position.set(0, 10, 0);
      camera.lookAt(0, 0, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    },

    // Right view
    setRightView: () => {
      camera.position.set(10, 1, 0);
      camera.lookAt(0, 1, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 1, 0);
        controlsRef.current.update();
      }
    },

    // Isometric view
    setIsoView: () => {
      camera.position.set(8, 8, 8);
      camera.lookAt(0, 1, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 1, 0);
        controlsRef.current.update();
      }
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

const Scene = ({ cameraRef, activeTool, onGeometryCreated, modelUrl, onModelLoad }) => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />

      {/* Camera Controller */}
      <CameraController ref={cameraRef} />

      {/* Work plane and grid */}
      <WorkPlane />

      {/* Loaded external model OR sample objects */}
      {modelUrl ? (
        <Suspense fallback={<LoadingSpinner />}>
          <LoadedModel url={modelUrl} onLoad={onModelLoad} />
        </Suspense>
      ) : (
        // Sample CAD objects - shown when no model is loaded
        activeTool === 'select' && (
          <>
            <SampleCube />
            <SampleSphere />
            <SampleCylinder />
          </>
        )
      )}

      {/* Coordinate system indicator */}
      <group position={[-8, 0, 8]}>
        {/* X-axis - Red */}
        <Cylinder args={[0.05, 0.05, 2]} position={[1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#ff0000" />
        </Cylinder>
        <Cone args={[0.1, 0.3]} position={[2.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <meshStandardMaterial color="#ff0000" />
        </Cone>

        {/* Y-axis - Green */}
        <Cylinder args={[0.05, 0.05, 2]} position={[0, 1, 0]}>
          <meshStandardMaterial color="#00ff00" />
        </Cylinder>
        <Cone args={[0.1, 0.3]} position={[0, 2.2, 0]}>
          <meshStandardMaterial color="#00ff00" />
        </Cone>

        {/* Z-axis - Blue */}
        <Cylinder args={[0.05, 0.05, 2]} position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#0000ff" />
        </Cylinder>
        <Cone args={[0.1, 0.3]} position={[0, 0, 2.2]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#0000ff" />
        </Cone>

        {/* Labels */}
        <Html position={[2.5, 0, 0]}>
          <div style={{ color: '#ff0000', fontWeight: 'bold', fontSize: '14px' }}>X</div>
        </Html>
        <Html position={[0, 2.5, 0]}>
          <div style={{ color: '#00ff00', fontWeight: 'bold', fontSize: '14px' }}>Y</div>
        </Html>
        <Html position={[0, 0, 2.5]}>
          <div style={{ color: '#0000ff', fontWeight: 'bold', fontSize: '14px' }}>Z</div>
        </Html>
      </group>
    </>
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
      <div style={{ color: '#ccc', fontSize: '13px', fontWeight: '500' }}>Loading 3D Model...</div>
    </div>
  </Html>
);

const ThreeViewer = forwardRef((props, ref) => {
  const cameraRef = useRef();
  const [geometries, setGeometries] = useState([]);
  const { activeTool, modelUrl, onModelLoad } = props;

  useImperativeHandle(ref, () => ({
    fitToScreen: () => cameraRef.current?.fitToScreen(),
    setFrontView: () => cameraRef.current?.setFrontView(),
    setTopView: () => cameraRef.current?.setTopView(),
    setRightView: () => cameraRef.current?.setRightView(),
    setIsoView: () => cameraRef.current?.setIsoView(),
    getGeometries: () => geometries,
    clearGeometries: () => setGeometries([]),
  }));

  const handleGeometryCreated = (newGeometry) => {
    setGeometries(prev => [...prev, newGeometry]);
    console.log(`Created ${newGeometry.type}:`, newGeometry);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{
          position: [8, 8, 8],
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        shadows
        style={{ background: 'linear-gradient(to bottom, #2d2d2d 0%, #1a1a1a 100%)' }}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <Scene
            cameraRef={cameraRef}
            activeTool={activeTool}
            onGeometryCreated={handleGeometryCreated}
            modelUrl={modelUrl}
            onModelLoad={onModelLoad}
          />
        </Suspense>
      </Canvas>

      {/* 3D Viewer overlay controls - Blender-style dark theme */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(30, 30, 30, 0.9)',
        padding: '12px 16px',
        borderRadius: '6px',
        border: '1px solid rgba(80, 80, 80, 0.5)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        fontSize: '11px',
        color: '#ccc',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ marginBottom: '8px', fontWeight: '600', color: '#fff', fontSize: '12px', borderBottom: '1px solid rgba(80,80,80,0.5)', paddingBottom: '6px' }}>Navigation</div>
        <div style={{ marginBottom: '3px' }}>🖱️ LMB + drag: Orbit</div>
        <div style={{ marginBottom: '3px' }}>🖱️ RMB + drag: Pan</div>
        <div style={{ marginBottom: '3px' }}>⚙️ Scroll: Zoom</div>
        {activeTool !== 'select' && (
          <>
            <div style={{ marginTop: '10px', fontWeight: '600', color: '#f59e0b', fontSize: '12px' }}>
              ✏️ Drawing: {activeTool}
            </div>
            <div style={{ marginTop: '3px' }}>• Click to draw</div>
            <div>• ESC to cancel</div>
          </>
        )}
      </div>

      {/* Geometry counter */}
      {geometries.length > 0 && (
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
          Objects: {geometries.length}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

export default ThreeViewer;
