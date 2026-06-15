// Deep-dispose a three.js object: geometries, materials, and any textures they hold.
// Used to release GPU memory when models/scenes are swapped out (critical on low-RAM devices).
import * as THREE from 'three';

function disposeMaterial(material) {
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];
  for (const mat of materials) {
    if (!mat) continue;
    // Dispose any texture-valued properties (map, normalMap, roughnessMap, etc.)
    for (const key of Object.keys(mat)) {
      const value = mat[key];
      if (value && value.isTexture) {
        value.dispose();
      }
    }
    mat.dispose();
  }
}

/**
 * Recursively dispose every geometry/material/texture under `object`.
 * Does NOT remove the object from its parent — caller controls the graph.
 */
export function disposeObject(object) {
  if (!object) return;
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) disposeMaterial(child.material);
  });
}

export default disposeObject;
