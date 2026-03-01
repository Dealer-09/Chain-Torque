import React, { useState, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

/**
 * MeshEditor - Enables vertex-level editing of mesh geometries
 * 
 * Features:
 * - Visualizes vertices as points
 * - Click to select vertices
 * - Drag to move selected vertex
 * - Updates mesh geometry in real-time
 */
export default function MeshEditor({ feature, onGeometryUpdate, orbitRef }) {
  const { camera, raycaster, pointer } = useThree();
  const [selectedVertexIndex, setSelectedVertexIndex] = useState(null);
  const [helperPosition, setHelperPosition] = useState(null);
  const meshRef = useRef();
  const pointsRef = useRef();
  const transformRef = useRef();
  const helperRef = useRef();
  const verticesRef = useRef(null);
  const meshGeometryRef = useRef(null);
  const pointsGeometryRef = useRef(null);
  const lastHelperPosition = useRef({ x: 0, y: 0, z: 0 });

  // Initialize geometry refs
  useEffect(() => {
    if (!feature?.meshData) return;

    // Store vertices in a ref so we can update them
    verticesRef.current = new Float32Array(feature.meshData.vertices);

    console.log('MeshEditor initialized with orbitRef:', orbitRef?.current ? 'valid' : 'null');

    return () => {
      setSelectedVertexIndex(null);
      setHelperPosition(null);
      verticesRef.current = null;
    };
  }, [feature, orbitRef]);

  // Disable orbit controls while dragging vertex
  useEffect(() => {
    const tc = transformRef.current;
    
    if (!tc) {
      console.log('TransformControls ref not yet available');
      return;
    }

    console.log('TransformControls ready');
    console.log('- OrbitControls ref:', orbitRef?.current ? 'valid' : 'null');
    
    // Manually disable orbit on drag
    const handleDragChange = (event) => {
      console.log('Dragging changed:', event.value);
      if (orbitRef?.current) {
        orbitRef.current.enabled = !event.value;
      }
      
      // When dragging stops, notify parent of final geometry
      if (!event.value && onGeometryUpdate && feature?.meshData && verticesRef.current) {
        onGeometryUpdate(feature.id, {
          vertices: verticesRef.current,
          indices: feature.meshData.indices
        });
        console.log('Notified parent of final geometry update');
      }
    };
    
    tc.addEventListener('dragging-changed', handleDragChange);
    
    return () => {
      tc.removeEventListener('dragging-changed', handleDragChange);
    };

  }, [helperRef, orbitRef, onGeometryUpdate, feature]);

  // Continuously update vertex position from helper sphere position
  useFrame(() => {
    if (!helperRef.current || selectedVertexIndex === null || !verticesRef.current) return;

    const newPos = helperRef.current.position;
    const index = selectedVertexIndex;

    // Check if position has changed
    if (
      Math.abs(newPos.x - lastHelperPosition.current.x) < 0.0001 &&
      Math.abs(newPos.y - lastHelperPosition.current.y) < 0.0001 &&
      Math.abs(newPos.z - lastHelperPosition.current.z) < 0.0001
    ) {
      return; // No change, skip update
    }

    console.log(`useFrame: Vertex ${index} moved to (${newPos.x.toFixed(2)}, ${newPos.y.toFixed(2)}, ${newPos.z.toFixed(2)})`);

    // Store new position
    lastHelperPosition.current = { x: newPos.x, y: newPos.y, z: newPos.z };

    // Update vertex in shared array
    verticesRef.current[index * 3] = newPos.x;
    verticesRef.current[index * 3 + 1] = newPos.y;
    verticesRef.current[index * 3 + 2] = newPos.z;

    // Update mesh geometry
    if (meshGeometryRef.current) {
      meshGeometryRef.current.attributes.position.needsUpdate = true;
      meshGeometryRef.current.computeVertexNormals();
    }

    // Update points geometry
    if (pointsGeometryRef.current) {
      pointsGeometryRef.current.attributes.position.needsUpdate = true;
    }
  });

  // Handle vertex selection on click
  const handlePointerDown = (event) => {
    event.stopPropagation();
    
    if (!pointsRef.current || !verticesRef.current) return;

    const vertices = verticesRef.current;
    
    // Raycasting to find clicked vertex
    // Set threshold for points raycasting (important for point selection)
    raycaster.params.Points.threshold = 0.3;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(pointsRef.current);

    console.log(`Raycasting: ${intersects.length} intersections found`);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      
      // Get vertex position
      const x = vertices[index * 3];
      const y = vertices[index * 3 + 1];
      const z = vertices[index * 3 + 2];

      console.log(`Selected vertex ${index}: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
      
      setSelectedVertexIndex(index);
      setHelperPosition([x, y, z]);
      lastHelperPosition.current = { x, y, z };
    }
  };

  if (!feature?.meshData || !verticesRef.current) {
    console.log('MeshEditor: Cannot render - missing data:', {
      hasFeature: !!feature,
      hasMeshData: !!feature?.meshData,
      hasVerticesRef: !!verticesRef.current,
      vertexCount: feature?.meshData?.vertices?.length
    });
    return null;
  }

  const { indices } = feature.meshData;
  
  console.log('MeshEditor rendering:', {
    vertexCount: verticesRef.current.length / 3,
    indexCount: indices?.length,
    featureName: feature.name
  });

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {/* Main mesh with wireframe */}
      <mesh
        ref={(mesh) => {
          if (mesh) {
            meshRef.current = mesh;
            meshGeometryRef.current = mesh.geometry;
          }
        }}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={verticesRef.current.length / 3}
            array={verticesRef.current}
            itemSize={3}
          />
          {indices && (
            <bufferAttribute
              attach="index"
              count={indices.length}
              array={new Uint32Array(indices)}
              itemSize={1}
            />
          )}
        </bufferGeometry>
        <meshStandardMaterial
          color={feature.color || '#667eea'}
          wireframe={true}
          transparent={true}
          opacity={0.3}
        />
      </mesh>

      {/* Solid mesh with reduced opacity */}
      <mesh>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={verticesRef.current.length / 3}
            array={verticesRef.current}
            itemSize={3}
          />
          {indices && (
            <bufferAttribute
              attach="index"
              count={indices.length}
              array={new Uint32Array(indices)}
              itemSize={1}
            />
          )}
        </bufferGeometry>
        <meshStandardMaterial
          color={feature.color || '#667eea'}
          transparent={true}
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Vertex points */}
      <points
        ref={(points) => {
          if (points) {
            pointsRef.current = points;
            pointsGeometryRef.current = points.geometry;
          }
        }}
        onPointerDown={handlePointerDown}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={verticesRef.current.length / 3}
            array={verticesRef.current}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          size={0.4}
          sizeAttenuation={true}
          transparent={true}
          opacity={0.9}
        />
      </points>

      {/* Selected vertex helper with transform controls */}
      {helperPosition && (
        <>
          <mesh ref={helperRef} position={helperPosition}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshBasicMaterial color={0x00ff00} transparent opacity={0.8} />
          </mesh>
          <TransformControls
            ref={transformRef}
            object={helperRef.current}
            mode="translate"
            size={1.0}
          />
        </>
      )}
    </group>
  );
}
