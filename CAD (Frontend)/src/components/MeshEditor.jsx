import React, { useState, useRef, useEffect } from 'react';
import { useThree, useFrame, invalidate } from '@react-three/fiber';
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
  const solidGeometryRef = useRef(null);
  const pointsGeometryRef = useRef(null);
  const lastHelperPosition = useRef({ x: 0, y: 0, z: 0 });
  // Indices of every vertex coincident with the picked one. OpenCascade tessellation
  // does NOT weld shared corners (each face carries its own copy for flat shading),
  // so a box corner is ~3 vertices at the same spot. Moving only the picked copy
  // tears one face off; moving the whole coincident group deforms the corner as a
  // unit — i.e. Blender-style welded-vertex editing.
  const selectedGroupRef = useRef([]);

  // Initialize geometry refs
  useEffect(() => {
    if (!feature?.meshData) return;

    // Store vertices in a ref so we can update them
    verticesRef.current = new Float32Array(feature.meshData.vertices);


    return () => {
      setSelectedVertexIndex(null);
      setHelperPosition(null);
      verticesRef.current = null;
      selectedGroupRef.current = [];
    };
  }, [feature, orbitRef]);

  // Disable orbit controls while dragging vertex
  useEffect(() => {
    const tc = transformRef.current;
    
    if (!tc) {
      return;
    }

    
    // Manually disable orbit on drag
    const handleDragChange = (event) => {
      if (orbitRef?.current) {
        orbitRef.current.enabled = !event.value;
      }
      
      // When dragging stops, notify parent of final geometry
      if (!event.value && onGeometryUpdate && feature?.meshData && verticesRef.current) {
        onGeometryUpdate(feature.id, {
          vertices: verticesRef.current,
          indices: feature.meshData.indices
        });
      }
    };
    
    tc.addEventListener('dragging-changed', handleDragChange);

    return () => {
      tc.removeEventListener('dragging-changed', handleDragChange);
    };

    // Depend on helperPosition, NOT helperRef: the <TransformControls> only mounts
    // after a vertex is picked (helperPosition becomes non-null), and helperRef is a
    // stable ref object that never changes. Without this, the effect runs once while
    // transformRef.current is still null, never re-attaches, and the drag-end
    // write-back to onGeometryUpdate never fires -> edits never reach the 3D tab.
  }, [helperPosition, orbitRef, onGeometryUpdate, feature]);

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

    // Position has changed - update vertex (no console.log at 60fps)

    // Store new position
    lastHelperPosition.current = { x: newPos.x, y: newPos.y, z: newPos.z };

    // Move every coincident copy to the new position. They all started at the same
    // spot, so setting them absolutely keeps the corner welded as it deforms. Falls
    // back to the single picked index if the group wasn't computed.
    const group = selectedGroupRef.current.length ? selectedGroupRef.current : [index];
    for (let g = 0; g < group.length; g++) {
      const vi = group[g];
      verticesRef.current[vi * 3] = newPos.x;
      verticesRef.current[vi * 3 + 1] = newPos.y;
      verticesRef.current[vi * 3 + 2] = newPos.z;
    }

    // Refresh every geometry that shares this vertex buffer. Each <bufferAttribute>
    // has its own GPU-upload flag, so the wireframe AND the solid fill must both be
    // flagged or the solid stays frozen while only the wireframe deforms.
    if (meshGeometryRef.current) {
      meshGeometryRef.current.attributes.position.needsUpdate = true;
      meshGeometryRef.current.computeVertexNormals();
    }
    if (solidGeometryRef.current) {
      solidGeometryRef.current.attributes.position.needsUpdate = true;
      solidGeometryRef.current.computeVertexNormals();
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


    if (intersects.length > 0) {
      const index = intersects[0].index;
      
      // Get vertex position
      const x = vertices[index * 3];
      const y = vertices[index * 3 + 1];
      const z = vertices[index * 3 + 2];

      // Gather all vertices sharing this position (the unwelded coincident copies)
      // so dragging deforms the whole corner, not a single face triangle.
      const EPS = 1e-4;
      const group = [];
      for (let i = 0; i < vertices.length / 3; i++) {
        if (
          Math.abs(vertices[i * 3] - x) < EPS &&
          Math.abs(vertices[i * 3 + 1] - y) < EPS &&
          Math.abs(vertices[i * 3 + 2] - z) < EPS
        ) {
          group.push(i);
        }
      }
      selectedGroupRef.current = group;

      console.log(`Selected vertex ${index} (+${group.length - 1} coincident): (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);

      setSelectedVertexIndex(index);
      setHelperPosition([x, y, z]);
      lastHelperPosition.current = { x, y, z };
    }
  };

  if (!feature?.meshData || !verticesRef.current) {
    return null;
  }

  const { indices } = feature.meshData;

  // Place the editor where the solid actually sits. The object transform lives on an
  // outer group; the inner group keeps the fixed OC(Z-up)->three(Y-up) orientation.
  // Vertices are still authored/edited in mesh space (TransformControls reports the
  // helper's parent-local position), so onGeometryUpdate stays in mesh space.
  const t = feature.transform || {};
  const objPosition = t.position || [0, 0, 0];
  const objRotation = t.rotation || [0, 0, 0];
  const objScale = Array.isArray(t.scale)
    ? t.scale
    : typeof t.scale === 'number'
      ? [t.scale, t.scale, t.scale]
      : [1, 1, 1];

  return (
    <group position={objPosition} rotation={objRotation} scale={objScale}>
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
      <mesh
        ref={(mesh) => {
          if (mesh) solidGeometryRef.current = mesh.geometry;
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
            onObjectChange={() => invalidate()}
          />
        </>
      )}
    </group>
    </group>
  );
}
