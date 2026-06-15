// src/three/transformMesh.js
// "Apply at consumption" for the object-level transform (the move/rotate/scale
// gizmo). The transform is stored as an editable feature field and is NOT baked
// into meshData while editing — so the geometry stays re-editable at a clean
// origin frame (SolidWorks-style). Any op that needs the solid's *placed*
// geometry (boolean CSG, GLB export, ...) bakes it on the way in via this helper.
//
// Coordinate note: kernel meshData is OC Z-up; the viewer displays it rotated
// R = rot_x(-90°) into three's Y-up, and the gizmo transform G is authored in
// that displayed frame. To express G in mesh space we conjugate: M = Rinv·G·R.
// Baking this into every operand keeps their relative placement correct in the
// same frame the consumer already works in (display still re-applies R).

import * as THREE from 'three';

const DISPLAY_ROT_X = -Math.PI / 2;

function toScaleArray(s) {
  if (Array.isArray(s)) return s;
  if (typeof s === 'number') return [s, s, s];
  return [1, 1, 1];
}

export function isIdentityTransform(t) {
  if (!t) return true;
  const [px = 0, py = 0, pz = 0] = t.position || [];
  const [rx = 0, ry = 0, rz = 0] = t.rotation || [];
  const [sx, sy, sz] = toScaleArray(t.scale);
  return px === 0 && py === 0 && pz === 0 &&
         rx === 0 && ry === 0 && rz === 0 &&
         sx === 1 && sy === 1 && sz === 1;
}

// Returns new meshData ({vertices, indices, normals}) with the transform baked
// into kernel space. Returns the input unchanged when there's nothing to apply.
export function applyTransformToMeshData(meshData, transform) {
  if (!meshData || !meshData.vertices || isIdentityTransform(transform)) return meshData;

  const [px = 0, py = 0, pz = 0] = transform.position || [];
  const [rx = 0, ry = 0, rz = 0] = transform.rotation || [];
  const [sx, sy, sz] = toScaleArray(transform.scale);

  const G = new THREE.Matrix4().compose(
    new THREE.Vector3(px, py, pz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz)
  );
  const R = new THREE.Matrix4().makeRotationX(DISPLAY_ROT_X);
  const Rinv = new THREE.Matrix4().makeRotationX(-DISPLAY_ROT_X);
  const M = new THREE.Matrix4().multiplyMatrices(Rinv, G).multiply(R);
  const normalMat = new THREE.Matrix3().getNormalMatrix(M);

  const srcV = meshData.vertices;
  const outV = new Float32Array(srcV.length);
  const v = new THREE.Vector3();
  for (let i = 0; i < srcV.length; i += 3) {
    v.set(srcV[i], srcV[i + 1], srcV[i + 2]).applyMatrix4(M);
    outV[i] = v.x; outV[i + 1] = v.y; outV[i + 2] = v.z;
  }

  let outN = meshData.normals;
  if (outN && outN.length === srcV.length) {
    const src = outN;
    outN = new Float32Array(src.length);
    const n = new THREE.Vector3();
    for (let i = 0; i < src.length; i += 3) {
      n.set(src[i], src[i + 1], src[i + 2]).applyMatrix3(normalMat).normalize();
      outN[i] = n.x; outN[i + 1] = n.y; outN[i + 2] = n.z;
    }
  }

  // indices are unchanged by an affine transform; reuse the reference (the worker
  // structured-clones inputs, so the original feature's buffer is not detached).
  return { vertices: outV, indices: meshData.indices, normals: outN };
}

// Convenience: bake a feature's own transform into its meshData.
export function placedMeshData(feature) {
  if (!feature?.meshData) return feature?.meshData ?? null;
  return applyTransformToMeshData(feature.meshData, feature.transform);
}
