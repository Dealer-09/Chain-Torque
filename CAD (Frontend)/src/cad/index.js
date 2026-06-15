// src/cad/index.js
// CAD module public surface.
//
// Prefer `cadClient` (worker-backed, main-thread fallback) and `useCAD` for all
// component code — these keep the heavy OpenCascade WASM kernel OFF the main thread.
// The raw kernel (cadGeometryService / OpenCascadeLoader) is intentionally NOT
// re-exported here so it can't be pulled onto the main-thread bundle by accident;
// it is used only inside cad.worker.js (via cadOperations.js).

export { default as cadClient } from './cadClient';
export { useCAD } from './useCAD';
