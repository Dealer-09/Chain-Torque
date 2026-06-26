// src/store/documentStore.js
// Single source of truth for the CAD document (features, sketches, view/tool
// state, selection, camera) plus assembly scaffolding for later phases.
//
// Before this store, document state was duplicated between App.jsx and
// ViewportManager.jsx and synced via callbacks (onSketchesChange), and the
// imperative `updateSketch` was called but never exposed -> silent failure.
// All mutations now go through here, so feature+sketch entries (a sketch is
// mirrored into both arrays under the same id) stay consistent.

import { create } from 'zustand';
import { deserializeProject } from './persistence';

export const DEFAULT_CHAT_MESSAGES = [
  {
    role: 'ai',
    text: `Hello! I'm Torquy, your AI CAD assistant. I can handle commands like:
- "Create a red cube with size 20"
- "Add a blue cylinder"
- "Give me a large sphere"`,
  },
];

const INITIAL_DOCUMENT = {
  // ---- persisted document state ----
  projectName: 'Untitled Model',
  features: [],
  sketches: [],
  modelUrl: null,
  chatMessages: DEFAULT_CHAT_MESSAGES,
  camera2D: { zoom: 1, pan: { x: 0, y: 0 } },

  // ---- view / interaction state (view, tool, selection are persisted) ----
  viewMode: '2d', // '2d' | '3d'
  activeTool: 'select',
  activeView: 'iso',
  selectedFeatureId: null,
  editMode: false,
  editFeatureId: null,

  // ---- assembly scaffolding (Phase 6) ----
  parts: [],
  instances: [],
};

const applyUpdater = (value, prev) =>
  typeof value === 'function' ? value(prev) : value;

export const useDocumentStore = create((set, get) => ({
  ...INITIAL_DOCUMENT,

  // ---- undo/redo history + clipboard (Phase 5) ----
  // Snapshots capture only the document arrays. Every action produces fresh
  // immutable arrays, so a snapshot is just a cheap reference pair.
  past: [],
  future: [],
  clipboard: null,

  // Push the current document arrays onto the undo stack and clear redo.
  // Call this at the START of any meaningful mutation, before set().
  // Snapshots cover the document AND the assembly (parts/instances) so undo is
  // consistent across both.
  _pushHistory: () =>
    set((s) => ({
      past: [
        ...s.past,
        { features: s.features, sketches: s.sketches, parts: s.parts, instances: s.instances },
      ].slice(-50),
      future: [],
    })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {};
      const previous = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        future: [
          { features: s.features, sketches: s.sketches, parts: s.parts, instances: s.instances },
          ...s.future,
        ].slice(0, 50),
        features: previous.features,
        sketches: previous.sketches,
        parts: previous.parts ?? s.parts,
        instances: previous.instances ?? s.instances,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[0];
      return {
        past: [
          ...s.past,
          { features: s.features, sketches: s.sketches, parts: s.parts, instances: s.instances },
        ].slice(-50),
        future: s.future.slice(1),
        features: next.features,
        sketches: next.sketches,
        parts: next.parts ?? s.parts,
        instances: next.instances ?? s.instances,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  copySelected: () =>
    set((s) => {
      const f = s.features.find((x) => x.id === s.selectedFeatureId);
      return f ? { clipboard: { ...f } } : {};
    }),

  paste: () => {
    const s = get();
    if (!s.clipboard) return;
    s._pushHistory();
    const base = s.clipboard;
    // ai-model copies have no GLB URL to load from — render them via the meshData
    // pipeline instead by clearing source so ThreeViewer.featureSolids includes them.
    let clonedMeshData = base.meshData;
    if (base.meshData) {
      clonedMeshData = {
        vertices: new Float32Array(base.meshData.vertices),
        indices: new Uint32Array(base.meshData.indices),
        normals: new Float32Array(base.meshData.normals)
      };
    }

    const clone = {
      ...base,
      meshData: clonedMeshData,
      id: `${base.type || 'feature'}_${Date.now()}`,
      name: `${base.name || 'Feature'} (copy)`,
      source: base.source === 'ai-model' || base.source === 'ai-model-captured'
        ? 'ai-model-copy'
        : base.source,
      // Offset position slightly so the copy is visually distinct from the original
      transform: {
        ...(base.transform || {}),
        position: base.transform?.position
          ? [base.transform.position[0] + 2, base.transform.position[1], base.transform.position[2] + 2]
          : [2, 0, 2],
      },
    };
    set((st) => ({ features: [...st.features, clone], selectedFeatureId: clone.id }));
  },


  // ---------------------------------------------------------------- features
  setFeatures: (features) => set({ features: applyUpdater(features, get().features) }),

  addFeature: (feature) => {
    get()._pushHistory();
    set((s) => ({ features: [...s.features, { visible: true, ...feature }] }));
  },

  addFeatures: (features) => {
    get()._pushHistory();
    set((s) => ({
      features: [...s.features, ...features.map((f) => ({ visible: true, ...f }))],
    }));
  },

  // Capture an AI-generated GLB model's mesh data into the features array so it
  // can be selected, transformed, copy-pasted and included in exports just like
  // any other 3d-solid feature.
  // Note: the old dedup guard ("only one ai-model allowed") has been removed —
  // users can import and capture multiple Image-to-3D models.
  captureAIModel: (meshData, glbUrl) => {
    get()._pushHistory();
    const existingCount = get().features.filter((f) => f.source === 'ai-model-captured').length;
    const label = existingCount === 0 ? 'AI Generated Model' : `AI Generated Model ${existingCount + 1}`;
    set((s) => ({
      // Clear modelUrl so the original single-modelUrl <LoadedModel> unmounts.
      // The per-feature <LoadedModel> in capturedModels[] takes over rendering,
      // preventing the double-render glitch.
      modelUrl: null,
      features: [
        ...s.features,
        {
          id: `ai_model_${Date.now()}`,
          type: '3d-solid',
          name: label,
          source: 'ai-model-captured',
          glbUrl: glbUrl || null,
          meshData,
          visible: true,
        },
      ],
    }));
  },

  importExternalModel: (meshData, glbUrl, name, meta) => {
    get()._pushHistory();
    const cleanName = name || 'Imported Model';
    set((s) => ({
      features: [
        ...s.features,
        {
          id: `imported_model_${Date.now()}`,
          type: '3d-solid',
          name: cleanName,
          source: 'imported-model',
          glbUrl: glbUrl || null,
          meshData,
          visible: true,
          meta: meta || null,
        },
      ],
    }));
  },


  // Replace just the mesh of a feature (was App.onGeometryUpdate).
  updateFeatureMesh: (featureId, meshData) => {
    get()._pushHistory();
    set((s) => ({
      features: s.features.map((f) =>
        f.id === featureId ? { ...f, meshData } : f
      ),
    }));
  },

  // Persist a solid's object-space transform (position/rotation/scale) after a
  // viewport gizmo edit. Stored as plain arrays so it survives serialization
  // (serializeFeature spreads ...feature, so `transform` round-trips for free)
  // and undo/redo (snapshots cover the whole features array).
  updateFeatureTransform: (featureId, transform) => {
    get()._pushHistory();
    set((s) => ({
      features: s.features.map((f) =>
        f.id === featureId
          ? { ...f, transform: { ...(f.transform || {}), ...transform } }
          : f
      ),
    }));
  },

  // ------------------------------------------------------------ combined ops
  // A sketch lives in BOTH `features` and `sketches` under the same id; these
  // keep the two arrays in lock-step so callers never have to update twice.

  addSketch: (sketch) => {
    get()._pushHistory();
    set((s) => ({
      sketches: [...s.sketches, sketch],
      features: [...s.features, { visible: true, ...sketch }],
    }));
  },

  // Update a sketch by its index in the sketches array (Canvas2D cut/point tools
  // address sketches positionally), and mirror the change into features by id.
  updateSketchByIndex: (index, updatedSketch) => {
    get()._pushHistory();
    set((s) => {
      const sketches = s.sketches.map((sk, i) => (i === index ? updatedSketch : sk));
      const id = updatedSketch?.id;
      const features = id
        ? s.features.map((f) => (f.id === id ? { ...f, ...updatedSketch } : f))
        : s.features;
      return { sketches, features };
    });
  },

  // Update by id across both arrays. This is what fixes the old silently-broken
  // `updateSketch` path (Cut/Point tools driven from the feature side).
  updateById: (id, data) => {
    get()._pushHistory();
    set((s) => ({
      features: s.features.map((f) => (f.id === id ? { ...f, ...data } : f)),
      sketches: s.sketches.map((sk) => (sk.id === id ? { ...sk, ...data } : sk)),
    }));
  },

  toggleVisibilityById: (id) => {
    get()._pushHistory();
    set((s) => ({
      features: s.features.map((f) => {
        if (f.id !== id) return f;
        return { ...f, visible: !f.visible };
      }),
      sketches: s.sketches.map((sk) =>
        sk.id === id ? { ...sk, visible: !sk.visible } : sk
      ),
    }));
  },

  deleteById: (id) => {
    get()._pushHistory();
    set((s) => {
      return {
        features: s.features.filter((f) => f.id !== id),
        sketches: s.sketches.filter((sk) => sk.id !== id),
        selectedFeatureId: s.selectedFeatureId === id ? null : s.selectedFeatureId,
        editFeatureId: s.editFeatureId === id ? null : s.editFeatureId,
      };
    });
  },

  // ----------------------------------------------------------------- sketches
  // sketches-only setter (AI 2D injection adds sketches without features).
  setSketches: (sketches) => {
    get()._pushHistory();
    set({ sketches: applyUpdater(sketches, get().sketches) });
  },

  // ------------------------------------------------------ view / tool / select
  setViewMode: (viewMode) => set({ viewMode: applyUpdater(viewMode, get().viewMode) }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setActiveView: (activeView) => set({ activeView }),
  setEditMode: (editMode) => set({ editMode: applyUpdater(editMode, get().editMode) }),
  setEditFeature: (editFeatureId) => set({ editFeatureId }),
  setSelectedFeature: (selectedFeatureId) => set({ selectedFeatureId }),

  // ------------------------------------------------------------- project meta
  setProjectName: (projectName) => set({ projectName }),
  setModelUrl: (modelUrl) => set({ modelUrl }),
  setChatMessages: (chatMessages) =>
    set({ chatMessages: applyUpdater(chatMessages, get().chatMessages) }),

  // ------------------------------------------------------------------- camera
  setZoom2D: (zoom) =>
    set((s) => ({ camera2D: { ...s.camera2D, zoom: applyUpdater(zoom, s.camera2D.zoom) } })),
  setPan2D: (pan) =>
    set((s) => ({ camera2D: { ...s.camera2D, pan: applyUpdater(pan, s.camera2D.pan) } })),

  // ------------------------------------------------------------- assemblies
  // A `part` is a reusable bundle of solid features captured under its own local
  // frame; an `instance` is a placement of a part ({ partId, transform }). The
  // render layer (InstancedParts) merges a part's geometry once and draws every
  // instance via one InstancedMesh.

  // Capture the given solid features (deep-copied) into a new reusable part.
  // Returns the new part id, or null if there was nothing solid to capture.
  createPart: (name, featureList) => {
    const solids = (featureList || []).filter((f) => f?.meshData);
    if (solids.length === 0) return null;
    const id = `part_${Date.now()}`;
    get()._pushHistory();
    set((s) => ({
      parts: [
        ...s.parts,
        {
          id,
          name: name || `Part ${s.parts.length + 1}`,
          color: solids[0].color || '#4ecdc4',
          features: solids.map((f) => ({ ...f })),
        },
      ],
    }));
    return id;
  },

  // Convenience: make a part from the current selection, or from all solids if
  // nothing is selected. Returns the new part id (or null).
  createPartFromSelection: (name) => {
    const s = get();
    const selected = s.features.find((f) => f.id === s.selectedFeatureId && f.meshData);
    const source = selected ? [selected] : s.features.filter((f) => f.type === '3d-solid' && f.meshData);
    return s.createPart(name, source);
  },

  addInstance: (partId, transform) => {
    if (!get().parts.some((p) => p.id === partId)) return null;
    const id = `inst_${Date.now()}`;
    get()._pushHistory();
    set((s) => ({
      instances: [
        ...s.instances,
        {
          id,
          partId,
          transform: {
            position: transform?.position || [0, 0, 0],
            rotation: transform?.rotation || [0, 0, 0],
            scale: transform?.scale ?? 1,
          },
        },
      ],
    }));
    return id;
  },

  updateInstance: (id, transform) => {
    get()._pushHistory();
    set((s) => ({
      instances: s.instances.map((inst) =>
        inst.id === id ? { ...inst, transform: { ...inst.transform, ...transform } } : inst
      ),
    }));
  },

  removeInstance: (id) => {
    get()._pushHistory();
    set((s) => ({ instances: s.instances.filter((inst) => inst.id !== id) }));
  },

  // Remove a part and every instance that referenced it.
  removePart: (id) => {
    get()._pushHistory();
    set((s) => ({
      parts: s.parts.filter((p) => p.id !== id),
      instances: s.instances.filter((inst) => inst.partId !== id),
    }));
  },

  // -------------------------------------------------------------- whole-doc
  clearAll: () => {
    get()._pushHistory();
    set({
      features: [],
      sketches: [],
      projectName: 'Untitled Model',
      modelUrl: null,
      selectedFeatureId: null,
      editMode: false,
      editFeatureId: null,
      parts: [],
      instances: [],
      camera2D: { zoom: 1, pan: { x: 0, y: 0 } },
    });
  },

  // Load a (possibly partial) parsed project payload into the store.
  loadProject: (data) => set(deserializeProject(data)),
}));

if (typeof window !== 'undefined') {
  window.useDocumentStore = useDocumentStore;
}

export default useDocumentStore;
