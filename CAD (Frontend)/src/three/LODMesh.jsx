// src/three/LODMesh.jsx
// Distance-based level-of-detail for heavy single solids. A complex CSG result
// can be tens of thousands of triangles; rendering that at full resolution when
// it's a few pixels across wastes a low-end GPU. <Detailed> (a THREE.LOD group)
// swaps in a decimated copy past each distance threshold.
//
// The far level is produced with three's SimplifyModifier on the main thread.
// It only runs above a vertex threshold and is memoized per geometry, and any
// failure falls back to the full-resolution geometry (correct, just heavier).

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Detailed } from '@react-three/drei';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import { ensureBoundsTree, disposeBoundsTreeSafe } from './culling';

// Above this vertex count a solid is worth decimating; below it the overhead of
// running the modifier (and the extra geometry) isn't worth it.
export const LOD_VERTEX_THRESHOLD = 4000;

const modifier = new SimplifyModifier();

function simplify(geometry, ratio) {
  const vertexCount = geometry.attributes.position.count;
  const removeCount = Math.floor(vertexCount * ratio);
  if (removeCount <= 0) return null;
  try {
    const simplified = modifier.modify(geometry, removeCount);
    simplified.computeVertexNormals();
    return simplified;
  } catch {
    return null; // keep full-res level only
  }
}

// Returns [{ geometry, distance }] ordered near -> far for <Detailed>.
function buildLevels(geometry) {
  ensureBoundsTree(geometry);
  const levels = [{ geometry, distance: 0 }];
  const vertexCount = geometry.attributes?.position?.count ?? 0;
  if (vertexCount >= LOD_VERTEX_THRESHOLD) {
    const mid = simplify(geometry, 0.5);
    if (mid) levels.push({ geometry: mid, distance: 18 });
    const far = simplify(geometry, 0.8);
    if (far) levels.push({ geometry: far, distance: 45 });
  }
  return levels;
}

export default function LODMesh({
  geometry,
  color = '#4ecdc4',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  const levels = useMemo(() => buildLevels(geometry), [geometry]);

  // Dispose the LOD-only (simplified) geometries we created; the level-0
  // geometry is owned by the caller and disposed there.
  useEffect(() => {
    return () => {
      levels.forEach((lvl, i) => {
        if (i === 0) return;
        disposeBoundsTreeSafe(lvl.geometry);
        lvl.geometry.dispose();
      });
    };
  }, [levels]);

  // Single level (small mesh): no LOD group needed.
  if (levels.length === 1) {
    return (
      <mesh geometry={geometry} position={position} rotation={rotation}>
        <meshStandardMaterial color={color} side={THREE.DoubleSide} metalness={0.3} roughness={0.6} />
      </mesh>
    );
  }

  return (
    <Detailed distances={levels.map((l) => l.distance)} position={position} rotation={rotation}>
      {levels.map((lvl, i) => (
        <mesh key={i} geometry={lvl.geometry}>
          <meshStandardMaterial color={color} side={THREE.DoubleSide} metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
    </Detailed>
  );
}
