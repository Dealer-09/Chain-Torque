// src/store/persistence.js
// Serialization + localStorage persistence for the CAD document store.
//
// Keeps the historical localStorage key ('chainTorqueCADProject') and the
// typed-array <-> Array conversion that the old App.jsx did inline, and now
// ALSO persists camera (2D pan/zoom), viewMode, activeTool and selection so the
// editor state survives a reload.

export const STORAGE_KEY = 'chainTorqueCADProject';

// --- typed-array (de)serialization for feature mesh data ---------------------
// localStorage can only hold JSON, so Float32Array/Uint32Array must be flattened
// to plain Arrays on save and rehydrated on load.

export function serializeFeature(feature) {
  if (feature?.meshData && feature.meshData.vertices) {
    const { vertices, normals, indices } = feature.meshData;
    return {
      ...feature,
      meshData: {
        vertices: Array.from(vertices),
        normals: normals ? Array.from(normals) : null,
        indices: indices ? Array.from(indices) : null,
      },
    };
  }
  return feature;
}

export function deserializeFeature(feature) {
  if (feature?.meshData && Array.isArray(feature.meshData.vertices)) {
    const { vertices, normals, indices } = feature.meshData;
    return {
      ...feature,
      meshData: {
        vertices: new Float32Array(vertices),
        normals: normals ? new Float32Array(normals) : null,
        indices: indices ? new Uint32Array(indices) : null,
      },
    };
  }
  return feature;
}

// --- whole-project (de)serialization ----------------------------------------

export function serializeProject(state, overrides = {}) {
  return {
    projectName: overrides.projectName ?? state.projectName,
    features: (state.features || []).map(serializeFeature),
    sketches: state.sketches || [],
    modelUrl: state.modelUrl ?? null,
    chatMessages: state.chatMessages || [],
    camera2D: state.camera2D || { zoom: 1, pan: { x: 0, y: 0 } },
    viewMode: state.viewMode || '2d',
    activeTool: state.activeTool || 'select',
    selectedFeatureId: state.selectedFeatureId ?? null,
    // Assemblies: a part bundles features (each with typed-array mesh data), so
    // those need the same flatten/rehydrate treatment as top-level features.
    parts: (state.parts || []).map((p) => ({
      ...p,
      features: (p.features || []).map(serializeFeature),
    })),
    instances: state.instances || [],
    savedAt: new Date().toISOString(),
  };
}

// Convert a parsed project payload into the shape the store expects (typed
// arrays restored). Tolerant of partial payloads (e.g. AI-only { sketches }).
export function deserializeProject(data) {
  if (!data || typeof data !== 'object') return {};
  const out = {};
  if (data.projectName) out.projectName = data.projectName;
  if (Array.isArray(data.features)) out.features = data.features.map(deserializeFeature);
  if (Array.isArray(data.sketches)) out.sketches = data.sketches;
  if (data.modelUrl !== undefined) out.modelUrl = data.modelUrl;
  if (Array.isArray(data.chatMessages)) out.chatMessages = data.chatMessages;
  if (data.camera2D) out.camera2D = data.camera2D;
  if (data.viewMode) out.viewMode = data.viewMode;
  if (data.activeTool) out.activeTool = data.activeTool;
  if (data.selectedFeatureId !== undefined) out.selectedFeatureId = data.selectedFeatureId;
  if (Array.isArray(data.parts)) {
    out.parts = data.parts.map((p) => ({
      ...p,
      features: (p.features || []).map(deserializeFeature),
    }));
  }
  if (Array.isArray(data.instances)) out.instances = data.instances;
  return out;
}

// --- localStorage helpers ----------------------------------------------------

export function saveToLocalStorage(state, overrides = {}) {
  const payload = serializeProject(state, overrides);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('[persistence] Failed to parse saved project:', err);
    return null;
  }
}
