// src/App.js
import React, { useState, useRef, useEffect } from "react";
import {
  FaSave,
  FaUndo,
  FaRedo,
  FaDownload,
  FaCog,
  FaFile,
  FaVectorSquare,
  FaCircle,
  FaSlash,
  FaMousePointer,
  FaSearchPlus,
  FaSearchMinus,
  FaExpandArrowsAlt,
  FaCopy,
  FaCut,
  FaPaste,
  FaRobot,
  FaTrash,
  FaEraser,
  FaDotCircle,
  FaWaveSquare,
  FaCloudUploadAlt,
  FaChevronLeft,
  FaFolderOpen,
} from "react-icons/fa";
import ViewportManager from "./components/ViewportManager.jsx";
import FeatureTree from "./components/FeatureTree.jsx";
import UploadToMarketplaceModal from "./components/UploadToMarketplaceModal.jsx";
import ImportModelModal from "./components/ImportModelModal.jsx";
import CADOperations from "./components/CADOperations.jsx";
import MeshOperations from "./components/MeshOperations.jsx";
import ImageTo3D from "./components/ImageTo3D.jsx";
import SettingsDialog from "./components/SettingsDialog.jsx";
import { FaMagic } from "react-icons/fa";
import cadClient from './cad/cadClient';
import StatsOverlay from './perf/StatsOverlay';
import { useDocumentStore } from './store/documentStore';
import { selectSelectedFeature } from './store/selectors';
import { saveToLocalStorage, loadFromLocalStorage } from './store/persistence';
import { placedMeshData } from './three/transformMesh';
import UIHost from './ui/UIHost';
import CommandPalette from './ui/CommandPalette';
import { notify, confirmDialog, promptDialog } from './ui/uiStore';
import { useSettingsStore } from './store/settingsStore';
import "./App.css";

const getActiveTheme = (theme) => {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return theme;
};

const App = () => {
  // Live theme listener
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    const applyTheme = () => {
      const activeTheme = getActiveTheme(theme);
      const root = document.documentElement;
      root.classList.remove('theme-dark', 'theme-light');
      root.classList.add(`theme-${activeTheme}`);
    };

    applyTheme();

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  // ---- UI-only state (ephemeral, not part of the document) ----
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showImageTo3D, setShowImageTo3D] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [modelInfo, setModelInfo] = useState(null);

  // Torquy AI chat input state (transient)
  const [aiInput, setAiInput] = useState('');
  const [aiIsLoading, setAiIsLoading] = useState(false);
  const [aiGenerationMode, setAiGenerationMode] = useState(() => {
    try { const v = localStorage.getItem('ct_cad_ai_mode'); return (v === '2d' || v === '3d') ? v : '3d'; } catch { return '3d'; }
  }); // '2d' or '3d'

  // ---- document state (single source of truth: Zustand) ----
  const features = useDocumentStore((s) => s.features);
  const sketches = useDocumentStore((s) => s.sketches);
  const selectedFeature = useDocumentStore(selectSelectedFeature);
  const activeTool = useDocumentStore((s) => s.activeTool);
  const viewMode = useDocumentStore((s) => s.viewMode);
  const editMode = useDocumentStore((s) => s.editMode);
  const projectName = useDocumentStore((s) => s.projectName);
  const modelUrl = useDocumentStore((s) => s.modelUrl);
  const chatMessages = useDocumentStore((s) => s.chatMessages);

  // store actions
  const setActiveTool = useDocumentStore((s) => s.setActiveTool);
  const setViewMode = useDocumentStore((s) => s.setViewMode);
  const setEditMode = useDocumentStore((s) => s.setEditMode);
  const setEditFeature = useDocumentStore((s) => s.setEditFeature);
  const setProjectName = useDocumentStore((s) => s.setProjectName);
  const setModelUrl = useDocumentStore((s) => s.setModelUrl);
  const setSketches = useDocumentStore((s) => s.setSketches);
  const setChatMessages = useDocumentStore((s) => s.setChatMessages);
  const addFeatures = useDocumentStore((s) => s.addFeatures);
  const addFeature = useDocumentStore((s) => s.addFeature);
  const toggleVisibilityById = useDocumentStore((s) => s.toggleVisibilityById);
  const deleteById = useDocumentStore((s) => s.deleteById);
  const updateById = useDocumentStore((s) => s.updateById);
  const setSelectedFeature = useDocumentStore((s) => s.setSelectedFeature);
  const loadProject = useDocumentStore((s) => s.loadProject);
  const clearAll = useDocumentStore((s) => s.clearAll);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const copySelected = useDocumentStore((s) => s.copySelected);
  const paste = useDocumentStore((s) => s.paste);

  const viewportRef = useRef();
  // Set to true right after AI shapes are added so the useEffect below can
  // trigger a front-view + fitToScreen once Three.js actually renders them.
  const pendingCameraResetRef = useRef(false);

  // Auto-orient camera to front view + fit whenever AI just spawned new shapes.
  // Using useEffect (not setTimeout) so it fires only after React has committed
  // the new features and Three.js has had a chance to build the meshes.
  useEffect(() => {
    if (!pendingCameraResetRef.current || viewMode !== '3d') return;
    pendingCameraResetRef.current = false;
    // Small delay to let Three.js finish mesh creation from the new features
    const t1 = setTimeout(() => {
      handleViewChange('front');
      const t2 = setTimeout(() => viewportRef.current?.fitToScreen?.(), 350);
      return () => clearTimeout(t2);
    }, 120);
    return () => clearTimeout(t1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features]);

  // Parse URL params + restore saved project on mount
  useEffect(() => {
    cadClient.init().catch(err => console.error("CAD init error:", err));

    const urlParams = new URLSearchParams(window.location.search);
    const clearParam = urlParams.get('clear') || urlParams.get('reset');
    
    if (clearParam === 'true') {
      try {
        localStorage.removeItem('chainTorqueCADProject');
        console.log('[App] Workspace cleared via URL parameter.');
        // Clean URL parameter to keep URL tidy
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error('Failed to clear workspace:', err);
      }
    }

    const model = urlParams.get('model');
    const title = urlParams.get('title');
    const tool = urlParams.get('tool');

    if (model) {
      setModelUrl(decodeURIComponent(model));
      setViewMode('3d'); // Loading an external model opens straight into 3D
    }

    if (tool === 'ai') {
      setShowImageTo3D(true);
    }

    if (title) {
      setProjectName(decodeURIComponent(title));
    }

    // Attempt to load from localStorage
    const parsedData = loadFromLocalStorage();
    if (parsedData) {
      const currentModelUrl = model ? decodeURIComponent(model) : null;

      // If URL explicitly requests a different model than the saved one, skip local storage
      if (currentModelUrl && currentModelUrl !== parsedData.modelUrl) {
        console.log('[App] New model URL detected; skipping local storage to start fresh.');
        return;
      }

      loadProject(parsedData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModelLoad = (info) => {
    setModelInfo(info);
  };

  const toggleAIPanel = () => setShowAIPanel(v => !v);
  const toggleSidebar = () => setShowSidebar(v => !v);
  const closeSidebar = () => setShowSidebar(false);

  const handleToolSelect = (tool) => setActiveTool(tool);

  // Toggle feature visibility (also mirrors to the matching sketch)
  const handleFeatureToggle = (featureId) => toggleVisibilityById(featureId);

  // Delete feature (also removes the matching sketch + clears selection)
  const handleFeatureDelete = (featureId) => deleteById(featureId);

  // Update feature (Cut Tool / Point Tool) — now actually updates sketches too
  const handleFeatureUpdate = (featureId, updatedData) => updateById(featureId, updatedData);

  // Select feature
  const handleFeatureSelect = (feature) => setSelectedFeature(feature?.id ?? null);

  // Submit AI Command to Torquy (Gemini)
  const handleAICommand = async () => {
    if (!aiInput.trim() || aiIsLoading) return;

    const userMsg = aiInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    setAiIsLoading(true);

    try {
      // Backend URL: runtime override > build-time env > localhost fallback
      const backendUrl = (() => {
        try { const ov = localStorage.getItem('ct_cad_backend'); if (ov && ov.trim()) return ov.trim(); } catch {}
        return import.meta.env.VITE_API_URL
          ? import.meta.env.VITE_API_URL.replace('/api', '')
          : 'http://localhost:5001';
      })();

      // Gather contextual workspace from the store
      const workspaceContext = useDocumentStore.getState().sketches || [];

      const res = await fetch(`${backendUrl}/api/ai/torquy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          chatHistory: chatMessages,
          workspaceParams: { sketches: workspaceContext },
          generationMode: aiGenerationMode,
          // BYOK: pass the user's own Gemini key if they've set one in Settings.
          // The backend uses it instead of its server key; it is never stored server-side.
          userApiKey: (() => { try { return localStorage.getItem('ct_cad_gemini_key') || undefined; } catch { return undefined; } })(),
        })
      });

      // Prevent SyntaxError if backend unexpectedly returns an HTML error page (e.g. 404 Not Found)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const textText = await res.text();
        console.error('Expected JSON, received HTML:', textText);
        throw new Error('Server returned HTML instead of JSON. The backend AI endpoint might be down or not found.');
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || 'API failed');

      setChatMessages(prev => [...prev, {
        role: 'ai',
        text: data.reply,
        plan: data.plan || []
      }]);

      // 1) If we got 2D Sketches back, load them into the workspace
      if (data.sketches && data.sketches.length > 0) {
        // Give new sketches an ID, default visibility, and correctly format points for Canvas2D
        const incomingSketches = data.sketches.map((s, idx) => {
          const isCircle = s.type === 'circle' || s.type === 'circles';
          return {
            ...s, // Spread original properties first
            id: `torquy_sketch_${Date.now()}_${idx}`,
            name: `AI Sketch ${idx + 1}`,
            visible: true,
            type: isCircle ? 'circles' : s.type, // Override with Canvas2D enforced types
            original2DPoints: s.points, // Canvas2D requires this key for rendering polygons
            originalCircles: isCircle && s.center && s.radius ? [{ center: s.center, radius: s.radius }] : (s.originalCircles || undefined),
            closed: true // Auto-close AI geometry
          };
        });

        const currentSketches = useDocumentStore.getState().sketches || [];
        setSketches([...currentSketches, ...incomingSketches]);
        setViewMode('2d'); // Hop into sketch view to see them
      }

      // 2) If we got 3D shapes back, build them (instantiate + CSG + mesh).
      // This whole pipeline runs off the main thread via cadClient (worker), with a
      // transparent main-thread fallback, so a heavy assembly never freezes the UI.
      if (data.shapes && data.shapes.length > 0) {
        const newFeatures = await cadClient.buildAIModel(data.shapes, data.boolean_operations || []);

        if (newFeatures.length > 0) {
          addFeatures(newFeatures);
          setViewMode('3d');
          // Signal the useEffect above to reset camera once React re-renders
          pendingCameraResetRef.current = true;
        } else {
          setChatMessages(prev => [...prev, { role: 'ai', text: `⚠️ Torquy generated shapes, but they failed to compile in the CAD engine.` }]);
        }
      }

    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'ai', text: `❌ Error: ${err.message}` }]);
    } finally {
      setAiIsLoading(false);
    }
  };

  // Rename Project
  const handleRename = async () => {
    const newName = await promptDialog({
      title: 'Rename Project',
      message: 'Enter a new project name',
      defaultValue: projectName,
    });
    if (newName && newName.trim()) {
      setProjectName(newName.trim());
      return newName.trim();
    }
    return null;
  };

  // Save Project
  const handleSave = async () => {
    try {
      // Prompt for a name if still using the default
      let nameToSave = projectName;
      if (projectName === 'Untitled Model') {
        const entered = await promptDialog({
          title: 'Name your project',
          message: 'Enter a name before saving',
          defaultValue: '',
        });
        if (!entered || !entered.trim()) {
          notify('Save cancelled — please provide a project name.', 'warning');
          return;
        }
        nameToSave = entered.trim();
        setProjectName(nameToSave);
      }

      saveToLocalStorage(useDocumentStore.getState(), { projectName: nameToSave });
      notify(`Project "${nameToSave}" saved locally`, 'success');
    } catch (err) {
      console.error('Failed to save project:', err);
      notify('Failed to save project: ' + err.message, 'error');
    }
  };

  // Download Project as STL or GLB
  const handleDownload = async () => {
    const format = await promptDialog({
      title: 'Export model',
      message: 'Choose a format: stl or glb',
      defaultValue: 'stl',
    });
    if (!format || !['stl', 'glb'].includes(format.toLowerCase())) {
      notify('Please enter "stl" or "glb"', 'warning');
      return;
    }

    // Get features with mesh data
    const meshFeatures = features.filter(f => f.meshData);

    if (meshFeatures.length === 0) {
      notify('No 3D geometry to export. Generate an AI model or extrude a sketch first.', 'warning');
      return;
    }

    try {
      // Import Three.js and exporters dynamically
      const THREE = await import('three');

      // Create a scene with all meshes
      const exportScene = new THREE.Scene();

      meshFeatures.forEach((feature, index) => {
        const pMeshData = placedMeshData(feature);
        if (!pMeshData) return;
        let { vertices, indices, normals } = pMeshData;

        // Ensure typed arrays (they become regular arrays after JSON save/restore)
        if (!(vertices instanceof Float32Array)) vertices = new Float32Array(vertices);
        if (indices && !(indices instanceof Uint32Array)) indices = new Uint32Array(indices);
        if (normals && !(normals instanceof Float32Array)) normals = new Float32Array(normals);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        if (indices && indices.length > 0) {
          geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        }
        // Always compute normals for reliable export
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({ color: 0x4ecdc4 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = feature.name || `Part_${index + 1}`;
        exportScene.add(mesh);
      });

      if (format.toLowerCase() === 'stl') {
        // Use STLExporter
        const { STLExporter } = await import('three/examples/jsm/exporters/STLExporter.js');
        const exporter = new STLExporter();
        const stlString = exporter.parse(exportScene, { binary: true });

        const blob = new Blob([stlString], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}.stl`;
        a.click();
        URL.revokeObjectURL(url);

        notify(`Exported ${meshFeatures.length} part(s) to ${projectName}.stl`, 'success');
      } else {
        // Use GLTFExporter for GLB
        const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
        const exporter = new GLTFExporter();

        exporter.parse(exportScene, (result) => {
          const blob = new Blob([result], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${projectName}.glb`;
          a.click();
          URL.revokeObjectURL(url);

          notify(`Exported ${meshFeatures.length} part(s) to ${projectName}.glb`, 'success');
        }, (error) => {
          notify('GLB export failed: ' + error.message, 'error');
        }, { binary: true });
      }
    } catch (err) {
      console.error('Export failed:', err);
      notify('Export failed: ' + err.message, 'error');
    }
  };

  // Undo / Redo — real history over the document store
  const handleUndo = () => undo();
  const handleRedo = () => redo();

  // Global editor shortcuts (undo/redo/copy/paste). Skipped while typing in a
  // form field so native text editing is preserved.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
      else if (k === 'c') { copySelected(); }
      else if (k === 'v') { e.preventDefault(); paste(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, copySelected, paste]);

  // Clear All with confirmation
  const handleClearAll = async () => {
    const confirmed = await confirmDialog({
      title: 'Clear All?',
      message: 'This will delete all sketches and features.\nYou can still undo this with Ctrl+Z.',
      confirmLabel: 'Clear',
      cancelLabel: 'Cancel',
    });
    if (confirmed) {
      clearAll();
      setModelInfo(null);

      // Reset ViewportManager-local drawing/camera state
      if (viewportRef.current?.clearAll) {
        viewportRef.current.clearAll();
      }
      notify('All content cleared. Starting fresh!', 'success');
    }
  };

  // Zoom functions - dispatch to ViewportManager
  const handleZoomIn = () => {
    viewportRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    viewportRef.current?.zoomOut();
  };

  // Fit to Screen - toggle browser fullscreen
  const handleFitToScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  // Assembly: capture the current selection (or all solids) into a reusable part.
  const handleCreatePart = async () => {
    const name = await promptDialog({
      title: 'Create Part',
      message: 'Bundle the selected solid (or all solids if none selected) into a reusable part.',
      defaultValue: `Part ${useDocumentStore.getState().parts.length + 1}`,
    });
    if (name === null) return;
    const id = useDocumentStore.getState().createPartFromSelection(name);
    if (!id) {
      notify('No solid geometry to make a part from. Extrude or generate a solid first.', 'warning');
      return;
    }
    // Drop a first instance at the origin so the new part is visible immediately.
    useDocumentStore.getState().addInstance(id, { position: [0, 0, 0] });
    notify(`Part "${name}" created and placed.`, 'success');
  };

  // Assembly: stamp another instance of the most recently created part, fanned
  // out on a grid so repeated stamps don't overlap.
  const handleStampInstance = () => {
    const state = useDocumentStore.getState();
    const part = state.parts[state.parts.length - 1];
    if (!part) {
      notify('No part to instance yet. Use "Create Part from Selection" first.', 'warning');
      return;
    }
    const n = state.instances.filter((i) => i.partId === part.id).length;
    const cols = 5;
    const spacing = 8;
    const pos = [(n % cols) * spacing, 0, Math.floor(n / cols) * spacing];
    state.addInstance(part.id, { position: pos });
    notify(`Instance of "${part.name}" added (${n + 1} total).`, 'success');
  };

  // Toggle the experimental WebGPU renderer (off by default). Persists the flag
  // and reloads, since the renderer is chosen at Canvas mount.
  const handleToggleWebGPU = async () => {
    const on = localStorage.getItem('ct_cad_webgpu') === '1';
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    if (!on && !hasWebGPU) {
      notify('This browser/device does not expose WebGPU (navigator.gpu).', 'warning');
      return;
    }
    const proceed = await confirmDialog({
      title: on ? 'Disable WebGPU?' : 'Enable WebGPU (experimental)?',
      message: on
        ? 'Switch back to the WebGL2 renderer. The page will reload.'
        : 'Use the experimental WebGPU renderer (auto-falls back to WebGL2 on failure). The page will reload.',
      confirmLabel: 'Reload',
    });
    if (!proceed) return;
    if (on) localStorage.removeItem('ct_cad_webgpu');
    else localStorage.setItem('ct_cad_webgpu', '1');
    window.location.reload();
  };

  // Command palette registry (Ctrl/Cmd+K)
  const commands = [
    { id: 'undo', label: 'Undo', hint: 'Ctrl+Z', action: () => undo() },
    { id: 'redo', label: 'Redo', hint: 'Ctrl+Y', action: () => redo() },
    { id: 'copy', label: 'Copy Selected', hint: 'Ctrl+C', action: () => copySelected() },
    { id: 'paste', label: 'Paste', hint: 'Ctrl+V', action: () => paste() },
    { id: 'save', label: 'Save Project', action: handleSave },
    { id: 'export', label: 'Export Model (STL/GLB)', action: handleDownload },
    { id: 'rename', label: 'Rename Project', action: handleRename },
    { id: 'clear', label: 'Clear All', action: handleClearAll },
    { id: 'create-part', label: 'Create Part from Selection', action: handleCreatePart },
    { id: 'stamp-instance', label: 'Stamp Instance of Last Part', action: handleStampInstance },
    { id: 'view-2d', label: 'Switch to 2D Sketch', hint: 'Esc', action: () => setViewMode('2d') },
    { id: 'view-3d', label: 'Switch to 3D Model', hint: 'I', action: () => setViewMode('3d') },
    { id: 'tool-select', label: 'Tool: Select', action: () => setActiveTool('select') },
    { id: 'tool-line', label: 'Tool: Line', hint: 'L', action: () => setActiveTool('line') },
    { id: 'tool-polygon', label: 'Tool: Polygon', hint: 'P', action: () => setActiveTool('polygon') },
    { id: 'tool-circle', label: 'Tool: Circle', hint: 'C', action: () => setActiveTool('circle') },
    { id: 'tool-arc', label: 'Tool: Arc', hint: 'A', action: () => setActiveTool('arc') },
    { id: 'tool-point', label: 'Tool: Point', hint: 'V', action: () => setActiveTool('point') },
    { id: 'tool-cut', label: 'Tool: Cut', hint: 'X', action: () => setActiveTool('cut') },
    { id: 'ai', label: 'Toggle Torquy AI', action: () => setShowAIPanel((v) => !v) },
    { id: 'upload', label: 'Upload to Marketplace', action: () => setShowUploadModal(true) },
    { id: 'import', label: 'Import Model into Workspace', action: () => setShowImportModal(true) },
    { id: 'webgpu', label: 'Toggle WebGPU Renderer (experimental)', action: handleToggleWebGPU },
  ];

  return (
    <div className="app">
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>ChainTorque CAD</h1>
          <span
            className="filename"
            onClick={handleRename}
            title="Click to rename project"
            style={{ cursor: 'pointer' }}
          >
            {projectName}
          </span>
          {modelInfo && (
            <span className="model-info" style={{ marginLeft: '15px', fontSize: '12px', color: '#888' }}>
              | Vertices: {modelInfo.vertices?.toLocaleString() || 0}
            </span>
          )}
        </div>
        <div className="topbar-icons">
          <FaFile title="New File" onClick={handleClearAll} style={{ cursor: 'pointer' }} />
          <FaSave title="Save Project" onClick={handleSave} style={{ cursor: 'pointer' }} />
          <FaUndo title="Undo (Ctrl+Z)" onClick={handleUndo} style={{ cursor: 'pointer' }} />
          <FaRedo title="Redo (Ctrl+Y)" onClick={handleRedo} style={{ cursor: 'pointer' }} />
          <FaCopy title="Copy (Ctrl+C)" onClick={() => copySelected()} style={{ cursor: 'pointer' }} />
          <FaPaste title="Paste (Ctrl+V)" onClick={() => paste()} style={{ cursor: 'pointer' }} />
          <FaDownload title="Download (STL/GLB)" onClick={handleDownload} style={{ cursor: 'pointer' }} />
          <FaFolderOpen
            title="Import Model into Workspace"
            onClick={() => setShowImportModal(true)}
            style={{ cursor: 'pointer' }}
          />
          <FaSearchPlus
            title="Zoom In"
            onClick={handleZoomIn}
            style={{ cursor: 'pointer' }}
          />
          <FaSearchMinus
            title="Zoom Out"
            onClick={handleZoomOut}
            style={{ cursor: 'pointer' }}
          />
          <FaExpandArrowsAlt
            title="Fit to Screen"
            onClick={handleFitToScreen}
            style={{ cursor: 'pointer' }}
            className="fit-to-screen-btn"
          />
          <FaRobot
            title="Torquy"
            className={`ai-copilot ${showAIPanel ? 'active' : ''}`}
            onClick={toggleAIPanel}
          />
          <FaMagic
            title="Image to 3D AI"
            className={`ai-magic-btn ${showImageTo3D ? 'active' : ''}`}
            onClick={() => setShowImageTo3D(true)}
            style={{ cursor: 'pointer', color: showImageTo3D ? '#ffffff' : 'inherit' }}
          />
          <FaCloudUploadAlt
            title="Upload to Marketplace"
            onClick={() => setShowUploadModal(true)}
            className="upload-to-marketplace-btn"
          />
          <FaCog title="Settings" onClick={() => setShowSettings(true)} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      {/* Settings Dialog */}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}

      <div className="main">
        {/* Left Sidebar - Tools */}
        <div className="sidebar">
          <div className="tool-section">
            <h3>Sketch</h3>
            <FaMousePointer
              title="Select"
              className={activeTool === 'select' ? 'active' : ''}
              onClick={() => handleToolSelect('select')}
            />
          </div>
          <div className="tool-section">
            <h3>Draw</h3>
            <FaSlash
              title="Line Tool (L)"
              className={activeTool === 'line' ? 'active' : ''}
              onClick={() => handleToolSelect('line')}
            />
            <FaVectorSquare
              title="Polygon Tool (P)"
              className={activeTool === 'polygon' ? 'active' : ''}
              onClick={() => handleToolSelect('polygon')}
            />
            <FaCircle
              title="Circle Tool (C)"
              className={activeTool === 'circle' ? 'active' : ''}
              onClick={() => handleToolSelect('circle')}
            />
            <FaWaveSquare
              title="Arc Tool (A) - Draw curved edges"
              className={activeTool === 'arc' ? 'active' : ''}
              onClick={() => handleToolSelect('arc')}
            />
          </div>
          <div className="tool-section">
            <h3>Edit</h3>
            <FaDotCircle
              title="Point Tool (V) - Add points on edges"
              className={activeTool === 'point' ? 'active' : ''}
              onClick={() => handleToolSelect('point')}
            />
            <FaCut
              title="Cut Tool (X) - Remove edges"
              className={activeTool === 'cut' ? 'active' : ''}
              onClick={() => handleToolSelect('cut')}
            />
            <FaEraser
              title="Undo Last (Backspace)"
              className={activeTool === 'eraser' ? 'active' : ''}
              onClick={() => handleToolSelect('eraser')}
            />
            <FaTrash
              title="Clear All"
              className={activeTool === 'delete' ? 'active' : ''}
              onClick={handleClearAll}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="canvas-area" data-tool={activeTool}>
          <div className="canvas-header">
            {/* Mode Toggle */}
            <div className="mode-toggle-compact">
              <button
                className={`mode-btn-sm ${viewMode === '2d' ? 'active' : ''}`}
                onClick={() => { setViewMode('2d'); setEditMode(false); }}
                title="2D Sketch (ESC)"
              >
                2D
              </button>
              <button
                className={`mode-btn-sm ${viewMode === '3d' && !editMode ? 'active' : ''}`}
                onClick={() => { setViewMode('3d'); setEditMode(false); }}
                title="3D Model (I)"
              >
                3D
              </button>
              <button
                className={`mode-btn-sm ${editMode ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('3d');
                  const enteringEdit = !editMode;
                  setEditMode(enteringEdit);
                  if (enteringEdit && selectedFeature?.meshData) {
                    setEditFeature(selectedFeature.id);
                  } else if (enteringEdit) {
                    // Find first visible mesh feature to edit
                    const meshFeature = features.find(f => f.meshData && f.visible);
                    setEditFeature(meshFeature ? meshFeature.id : null);
                  } else {
                    setEditFeature(null);
                  }
                }}
                title="Edit Mode - Modify mesh vertices (E)"
                style={{
                  background: editMode ? '#ffffff' : undefined,
                  color: editMode ? '#000000' : undefined,
                  borderColor: editMode ? '#ffffff' : undefined
                }}
              >
                Edit
              </button>
            </div>

            <span className="viewport-label">
              {viewMode === '2d' ? '2D Sketch' : editMode ? `Edit Mode${selectedFeature ? `: ${selectedFeature.name}` : ''}` : '3D Model'}
            </span>

            {/* View orientation is now driven by the navigation gizmo (ViewCube /
                axis triad) in the viewport — see ThreeViewer. The old Front/Top/
                Right/Iso buttons were removed in favor of it. */}
          </div>

          {/* Viewport Manager - 2D/3D Switching (reads document state from the store) */}
          <div className="viewport-container">
            <ViewportManager
              ref={viewportRef}
              onModelLoad={handleModelLoad}
            />
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        {!showSidebar && (
          <button
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            title="Open Feature Tree & Operations"
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1000,
              background: 'rgba(40, 44, 52, 0.95)',
              border: '1px solid rgba(102, 126, 234, 0.4)',
              borderRadius: '6px',
              padding: '12px 20px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) translateX(-2px)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.8)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.4)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
            }}
          >
            <FaChevronLeft size={20} />
          </button>
        )}

        {/* Collapsible Sidebar - Feature Tree & Operations */}
        <div className={`collapsible-sidebar ${showSidebar ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>Features & Operations</h3>
            <button
              className="sidebar-close-btn"
              onClick={closeSidebar}
              title="Close Sidebar"
            >
              ×
            </button>
          </div>

          <div className="sidebar-content">
            <FeatureTree
              features={features}
              selectedFeatureId={selectedFeature?.id ?? null}
              onFeatureToggle={handleFeatureToggle}
              onFeatureDelete={handleFeatureDelete}
              onFeatureSelect={handleFeatureSelect}
            />
            <CADOperations
              sketches={sketches}
              onExtrudeComplete={(extrudedGeometry) => {
                // Add extruded geometry to features
                addFeature({
                  id: extrudedGeometry.id,
                  type: '3d-solid',
                  name: `Extrusion ${features.filter(f => f.type === '3d-solid').length + 1}`,
                  meshData: extrudedGeometry.meshData,
                  height: extrudedGeometry.height,
                  visible: true
                });
              }}
              onPrimitiveAdd={({ type, meshData }) => {
                // Blender-style primitive insert -> add as a 3D solid feature.
                const label = type.charAt(0).toUpperCase() + type.slice(1);
                addFeature({
                  id: `prim_${type}_${Date.now()}`,
                  type: '3d-solid',
                  name: `${label} ${features.filter(f => f.type === '3d-solid').length + 1}`,
                  source: 'primitive',
                  meshData,
                  color: '#4ecdc4',
                  visible: true
                });
                setViewMode('3d');
              }}
            />
            <MeshOperations
              features={features}
              onOperationComplete={(resultFeature) => {
                // Add boolean operation result to features
                addFeature(resultFeature);
                setViewMode('3d');
              }}
            />
          </div>
        </div>
      </div>

      {/* AI Copilot Panel - Floating Overlay */}
      <div className={`ai-panel-floating ${showAIPanel ? 'visible' : 'hidden'}`}>
        <div className="ai-header">
          <FaRobot />
          <h3>Torquy</h3>
          <button className="close-btn" onClick={toggleAIPanel}>×</button>
        </div>
        <div className="ai-chat">
          <div className="chat-messages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={msg.role === 'ai' ? 'ai-message' : 'user-message'}>
                <strong>{msg.role === 'ai' ? '🤖 Torquy' : '👤 You'}:</strong><br />
                <span>{msg.text}</span>
                {msg.plan && msg.plan.length > 0 && (
                  <ul className="ai-plan-list" style={{ marginTop: '8px', paddingLeft: '20px', color: 'rgba(255,255,255,0.8)' }}>
                    {msg.plan.map((step, stepIdx) => (
                      <li key={stepIdx} style={{ marginBottom: '4px', fontStyle: 'italic', fontSize: '12px' }}>{step}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {aiIsLoading && (
              <div className="ai-message typing-indicator">
                <em>Torquy is thinking...</em>
              </div>
            )}
          </div>
          <div className="chat-input-container">
            <div className="ai-mode-selector" style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '12px', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: aiGenerationMode === '2d' ? '#4ecdc4' : '#888' }}>
                <input
                  type="radio"
                  name="aiMode"
                  value="2d"
                  checked={aiGenerationMode === '2d'}
                  onChange={() => setAiGenerationMode('2d')}
                  style={{ cursor: 'pointer' }}
                /> 2D Sketch
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: aiGenerationMode === '3d' ? '#4ecdc4' : '#888' }}>
                <input
                  type="radio"
                  name="aiMode"
                  value="3d"
                  checked={aiGenerationMode === '3d'}
                  onChange={() => setAiGenerationMode('3d')}
                  style={{ cursor: 'pointer' }}
                /> 3D Solid
              </label>
            </div>
            <div className="chat-input">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="E.g. Create a red sphere..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAICommand()
                }}
                disabled={aiIsLoading}
              />
              <button
                onClick={handleAICommand}
                disabled={aiIsLoading || !aiInput.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload to Marketplace Modal */}
      {showUploadModal && (
        <UploadToMarketplaceModal
          features={features}
          projectName={projectName}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Image to 3D AI Modal */}
      {showImageTo3D && (
        <ImageTo3D
          onClose={() => setShowImageTo3D(false)}
          onModelGenerated={(url) => {
            setModelUrl(url);
            // Optionally auto-switch to 3D mode
            setViewMode('3d');
          }}
        />
      )}

      {/* Import Model Modal */}
      {showImportModal && (
        <ImportModelModal
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Status Bar */}
      <div className="statusbar">
        <span>Ready | Tool: {activeTool} | Features: {features.length}</span>
        <StatsOverlay />
        <span>ChainTorque CAD v0.1.0 - Sketch-to-Solid CAD System</span>
      </div>

      {/* In-app dialogs/toasts + command palette (replace native prompt/alert) */}
      <UIHost />
      <CommandPalette commands={commands} />
    </div>
  );
};

export default App;
