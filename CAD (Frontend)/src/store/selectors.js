// src/store/selectors.js
// Pure selectors over the document store. Component code passes these to
// useDocumentStore(selector) so a render only subscribes to what it uses.

// The currently selected feature object (or null), resolved from its id.
export const selectSelectedFeature = (s) =>
  s.features.find((f) => f.id === s.selectedFeatureId) || null;

// The feature currently open in mesh-edit mode (or null).
export const selectEditFeature = (s) =>
  s.features.find((f) => f.id === s.editFeatureId) || null;

// Renderable 3D solids for the viewport (replaces the inline useMemo in
// ThreeViewer): anything carrying mesh data that is visible.
export const selectSolidFeatures = (s) =>
  s.features.filter((f) => f.meshData && f.visible !== false);

// Features that have exportable mesh data (STL/GLB download).
export const selectMeshFeatures = (s) => s.features.filter((f) => f.meshData);
