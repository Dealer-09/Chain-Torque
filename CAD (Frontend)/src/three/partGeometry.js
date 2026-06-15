// src/three/partGeometry.js
// Build a single, render-ready BufferGeometry for a "part" (a reusable bundle of
// solid features). Merging once and rendering many transformed copies via
// InstancedMesh is what keeps an assembly with hundreds of repeats at a handful
// of draw calls instead of hundreds.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ensureBoundsTree } from './culling';

// ExtrudedMesh renders solids rotated -90° about X (OpenCascade Z-up -> three
// Y-up). Bake that into the merged geometry so instanced copies match the
// orientation of the live editor meshes exactly.
const Z_UP_TO_Y_UP = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

function featureToGeometry(meshData) {
  if (!meshData?.vertices?.length || !meshData?.indices?.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(meshData.vertices, 3));
  geo.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
  geo.computeVertexNormals();
  geo.applyMatrix4(Z_UP_TO_Y_UP);
  return geo;
}

// Merge all solid features of a part into one geometry (Y-up, BVH-accelerated).
// Returns null if the part has no meshable geometry. Caller owns disposal.
export function buildPartGeometry(part) {
  const solids = (part?.features || []).filter(
    (f) => f.meshData?.vertices?.length && f.meshData?.indices?.length
  );
  if (solids.length === 0) return null;

  const subs = solids.map((f) => featureToGeometry(f.meshData)).filter(Boolean);
  if (subs.length === 0) return null;

  let merged;
  try {
    merged = subs.length === 1 ? subs[0] : mergeGeometries(subs, false);
  } catch {
    merged = subs[0];
  }
  // mergeGeometries clones data, so the intermediate sub-geometries (when more
  // than one) are no longer needed.
  if (merged !== subs[0]) subs.forEach((g) => g.dispose());

  if (!merged) return null;
  merged.computeBoundingSphere();
  ensureBoundsTree(merged);
  return merged;
}
