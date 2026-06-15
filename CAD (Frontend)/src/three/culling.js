// src/three/culling.js
// Acceleration layer for selection and visibility built on three-mesh-bvh.
//
// Why: picking (raycasts on click) and frustum work scale with triangle count.
// On a complex assembly the default O(n) raycast walks every triangle of every
// mesh on each click — janky on a Chromebook. three-mesh-bvh swaps in a packed
// bounds tree so a raycast is O(log n). The patch is installed once, globally,
// and every BufferGeometry that opts in via ensureBoundsTree() benefits.

import * as THREE from 'three';
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
} from 'three-mesh-bvh';

let installed = false;

// Monkey-patch THREE prototypes once. Safe to call repeatedly (idempotent).
export function installBVH() {
  if (installed) return;
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
  installed = true;
}

// Build a bounds tree on a geometry if it doesn't have one. Never throws —
// a failure just leaves the geometry on the default (correct, slower) raycast.
export function ensureBoundsTree(geometry) {
  if (!geometry || geometry.boundsTree) return;
  try {
    geometry.computeBoundsTree?.();
  } catch {
    /* fall back to default raycast */
  }
}

// Release a bounds tree (call alongside geometry.dispose()).
export function disposeBoundsTreeSafe(geometry) {
  try {
    geometry?.disposeBoundsTree?.();
  } catch {
    /* noop */
  }
}

// Walk an object3D subtree and accelerate every mesh geometry found.
// Used for imported GLTF scenes whose geometries we don't construct ourselves.
export function accelerateSubtree(root) {
  if (!root) return;
  root.traverse((child) => {
    if (child.isMesh && child.geometry) ensureBoundsTree(child.geometry);
  });
}

// Cheap reusable frustum test for custom culling decisions (LOD, large scenes).
const _frustum = new THREE.Frustum();
const _projScreen = new THREE.Matrix4();

export function makeFrustum(camera) {
  _projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _frustum.setFromProjectionMatrix(_projScreen);
  return _frustum;
}

export function isObjectVisible(object3D, camera) {
  if (!object3D.geometry) return true;
  if (!object3D.geometry.boundingSphere) object3D.geometry.computeBoundingSphere();
  const sphere = object3D.geometry.boundingSphere.clone();
  sphere.applyMatrix4(object3D.matrixWorld);
  return makeFrustum(camera).intersectsSphere(sphere);
}
