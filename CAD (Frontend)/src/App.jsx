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
} from "react-icons/fa";
import ViewportManager from "./components/ViewportManager.jsx";
import FeatureTree from "./components/FeatureTree.jsx";
import UploadToMarketplaceModal from "./components/UploadToMarketplaceModal.jsx";
import CADOperations from "./components/CADOperations.jsx";
import ImageTo3D from "./components/ImageTo3D.jsx";
import { FaMagic } from "react-icons/fa";
import cadGeometryService from './cad/CADGeometryService';
import "./App.css";

const App = () => {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showImageTo3D, setShowImageTo3D] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [activeView, setActiveView] = useState('iso');
  const [viewMode, setViewMode] = useState('2d'); // 2D sketch or 3D model
  const [features, setFeatures] = useState([]);
  const [sketches, setSketches] = useState([]); // Hoisted from ViewportManager for operations
  const [selectedFeature, setSelectedFeature] = useState(null);
  const viewportRef = useRef();

  // Project state
  const [projectName, setProjectName] = useState('Untitled Model');

  // Model loading state
  const [modelUrl, setModelUrl] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

  // Torquy AI Chat State
  const [aiInput, setAiInput] = useState('');
  const [aiIsLoading, setAiIsLoading] = useState(false);
  const [aiGenerationMode, setAiGenerationMode] = useState('3d'); // '2d' or '3d'
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'ai',
      text: `Hello! I'm Torquy, your AI CAD assistant. I can handle commands like:
- "Create a red cube with size 20"
- "Add a blue cylinder"
- "Give me a large sphere"`
    }
  ]);

  // Parse URL params on mount
  useEffect(() => {
    cadGeometryService.init().catch(err => console.error("CAD init error:", err));

    const urlParams = new URLSearchParams(window.location.search);
    const model = urlParams.get('model');
    const title = urlParams.get('title');
    const tool = urlParams.get('tool');

    if (model) {
      setModelUrl(decodeURIComponent(model));
    }

    if (tool === 'ai') {
      setShowImageTo3D(true);
    }

    if (title) {
      setProjectName(decodeURIComponent(title));
    }

    // Attempt to load from localStorage
    try {
      const savedProject = localStorage.getItem('chainTorqueCADProject');
      if (savedProject) {
        const parsedData = JSON.parse(savedProject);
        if (parsedData.projectName) setProjectName(parsedData.projectName);
        if (parsedData.features) setFeatures(parsedData.features);
        if (parsedData.modelUrl) setModelUrl(parsedData.modelUrl);
        if (parsedData.chatMessages) setChatMessages(parsedData.chatMessages);

        // Wait briefly for ViewportManager ref to mount, then load its specific data
        setTimeout(() => {
          if (viewportRef.current?.loadProjectData) {
            viewportRef.current.loadProjectData(parsedData);
          }
        }, 100);
      }
    } catch (err) {
      console.error('Failed to parse local project save:', err);
    }
  }, []);

  const handleModelLoad = (info) => {
    setModelInfo(info);
  };

  // Capture AI model geometry into features for download/save
  const handleModelCaptured = (meshData) => {
    // Check if we already captured this model (avoid duplicates)
    const alreadyCaptured = features.some(f => f.type === '3d-solid' && f.source === 'ai-model');
    if (alreadyCaptured) return;

    setFeatures(prev => [...prev, {
      id: `ai_model_${Date.now()}`,
      type: '3d-solid',
      name: 'AI Generated Model',
      source: 'ai-model',
      meshData,
      visible: true
    }]);
  };

  const toggleAIPanel = () => {
    setShowAIPanel(!showAIPanel);
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const closeSidebar = () => {
    setShowSidebar(false);
  };

  const handleToolSelect = (tool) => {
    setActiveTool(tool);
  };

  // Handle new features created from sketches
  const handleFeatureCreated = (newFeature) => {
    setFeatures(prev => [...prev, { ...newFeature, visible: true }]);
  };

  // Toggle feature visibility
  const handleFeatureToggle = (featureId) => {
    setFeatures(prev => prev.map(feature => {
      if (feature.id === featureId) {
        const updated = { ...feature, visible: !feature.visible };
        if (updated.geometry) {
          updated.geometry.visible = updated.visible;
        }
        return updated;
      }
      return feature;
    }));

    // Also toggle in ViewportManager sketches
    if (viewportRef.current?.toggleSketchVisibility) {
      viewportRef.current.toggleSketchVisibility(featureId);
    }
  };

  // Delete feature
  const handleFeatureDelete = (featureId) => {
    setFeatures(prev => {
      const feature = prev.find(f => f.id === featureId);
      if (feature && feature.geometry && feature.geometry.parent) {
        feature.geometry.parent.remove(feature.geometry);
      }
      return prev.filter(f => f.id !== featureId);
    });

    // Clear selection if deleted feature was selected
    if (selectedFeature && selectedFeature.id === featureId) {
      setSelectedFeature(null);
    }

    // Also delete from ViewportManager sketches
    if (viewportRef.current?.deleteSketch) {
      viewportRef.current.deleteSketch(featureId);
    }
  };

  // Update feature (used by Cut Tool and Point Tool)
  const handleFeatureUpdate = (featureId, updatedData) => {
    setFeatures(prev => prev.map(feature => {
      if (feature.id === featureId) {
        return { ...feature, ...updatedData };
      }
      return feature;
    }));

    // Also update in ViewportManager sketches
    if (viewportRef.current?.updateSketch) {
      viewportRef.current.updateSketch(featureId, updatedData);
    }
  };

  // Select feature
  const handleFeatureSelect = (feature) => {
    setSelectedFeature(feature);
  };

  // Handle CAD operations
  const handleCADOperation = (operation) => {
    // TODO: Implement with actual geometry operations
  };

  // Submit AI Command to Torquy (Groq)
  const handleAICommand = async () => {
    if (!aiInput.trim() || aiIsLoading) return;

    const userMsg = aiInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    setAiIsLoading(true);

    try {
      // For local development or Render prod
      const backendUrl = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('/api', '')
        : 'http://localhost:5001';

      // Gather contextual workspace
      let workspaceContext = [];
      if (viewportRef.current?.getProjectData) {
        workspaceContext = viewportRef.current.getProjectData().sketches || [];
      }

      const res = await fetch(`${backendUrl}/api/ai/torquy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          chatHistory: chatMessages,
          workspaceParams: { sketches: workspaceContext },
          generationMode: aiGenerationMode
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
      if (!data.success) throw new Error(data.message || 'API failed');

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

        let currentSketches = [];
        if (viewportRef.current?.getProjectData) {
          currentSketches = viewportRef.current.getProjectData().sketches || [];
        }
        const combinedSketches = [...currentSketches, ...incomingSketches];

        if (viewportRef.current?.loadProjectData) {
          viewportRef.current.loadProjectData({ sketches: combinedSketches });
        }
        setSketches(combinedSketches); // Keep App.jsx in sync
        setViewMode('2d'); // Hop into sketch view to see them
      }

      // 2) If we got 3D shapes back, process them potentially with CSG
      if (data.shapes && data.shapes.length > 0) {
        // Ensure CAD Kernel is ready for advanced boolean ops
        await cadGeometryService.init();

        // 2a. Instantiate all primitives as OpenCascade BRep Shapes
        const shapeMap = new Map(); // Store by ID

        for (const shapeDef of data.shapes) {
          const p = shapeDef.parameters || {};
          const pos = shapeDef.position || { x: 0, y: 0, z: 0 };
          let ocShape = null;

          try {
            switch (shapeDef.type) {
              case 'cube':
              case 'plane': // Torquy occasionally uses plane, treat as thin box
                // OCBox takes width, height, depth and spawns from corner usually, createBox handles centering
                ocShape = cadGeometryService.createBox(p.width || 10, p.height || 10, p.depth || 10, pos);
                break;
              case 'sphere':
                ocShape = cadGeometryService.createSphere(p.radius || 10, pos);
                break;
              case 'cylinder':
              case 'cone':
                ocShape = cadGeometryService.createCylinder(p.radiusTop || p.radius || 5, p.height || 10, pos);
                break;
              default:
                ocShape = cadGeometryService.createBox(10, 10, 10, pos);
            }

            // Note: Rotation on OC shapes omitted for brevity in this initial pass, 
            // Torquy primarily relies on position and sizing to stack.

            if (ocShape) {
              shapeMap.set(shapeDef.id || `torquy_shape_${Date.now()}_${Math.random()}`, {
                ocShape: ocShape,
                def: shapeDef,
                isConsumed: false // Will be true if used as a tool in boolean
              });
            }
          } catch (e) {
            console.error("Failed to make shape:", shapeDef, e);
          }
        }

        // 2b. Execute Boolean Operations if provided
        if (data.boolean_operations && data.boolean_operations.length > 0) {
          console.log("[Torquy] Executing Boolean CSG Operations:", data.boolean_operations.length);
          for (const op of data.boolean_operations) {
            const base = shapeMap.get(op.baseShapeId);
            const tool = shapeMap.get(op.toolShapeId);

            if (base && tool && !base.isConsumed && !tool.isConsumed) {
              try {
                let resultShape = null;
                console.log(`[Torquy CSG] ${op.type}: ${op.baseShapeId} & ${op.toolShapeId}`);
                if (op.type === 'subtract' || op.type === 'cut') {
                  resultShape = cadGeometryService.booleanCut(base.ocShape, tool.ocShape);
                } else if (op.type === 'union') {
                  resultShape = cadGeometryService.booleanUnion(base.ocShape, tool.ocShape);
                } else if (op.type === 'intersect') {
                  resultShape = cadGeometryService.booleanIntersect(base.ocShape, tool.ocShape);
                }

                if (resultShape) {
                  // Replace base shape with the new booleaned shape
                  base.ocShape = resultShape;
                  // Mark tool as consumed so we don't render it separately
                  tool.isConsumed = true;
                }
              } catch (e) {
                console.error("Boolean operation failed:", op, e);
              }
            }
          }
        }

        // 2c. Convert all non-consumed shapes to meshes
        const newFeatures = [];
        for (const [id, item] of shapeMap.entries()) {
          if (!item.isConsumed) {
            try {
              const meshData = cadGeometryService.shapeToMesh(item.ocShape);
              newFeatures.push({
                id: `torquy_csg_${Date.now()}_${Math.random()}`,
                type: '3d-solid',
                name: `Engineered ${item.def.type}`,
                source: 'torquy-csg',
                meshData: meshData,
                color: item.def.color || '#4ecdc4',
                visible: true
              });
            } catch (e) {
              console.error("Failed to mesh shape:", id, e);
            }
          }
        }

        if (newFeatures.length > 0) {
          setFeatures(prev => [...prev, ...newFeatures]);
          setViewMode('3d');
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

  // View control functions - only called in 3D mode
  const handleViewChange = (view) => {
    setActiveView(view);
    if (viewportRef.current) {
      switch (view) {
        case 'front':
          viewportRef.current.setFrontView();
          break;
        case 'top':
          viewportRef.current.setTopView();
          break;
        case 'right':
          viewportRef.current.setRightView();
          break;
        case 'iso':
          viewportRef.current.setIsoView();
          break;
        default:
          break;
      }
    }
  };

  // Rename Project
  const handleRename = () => {
    const newName = prompt('Enter project name:', projectName);
    if (newName && newName.trim()) {
      setProjectName(newName.trim());
      return newName.trim();
    }
    return null;
  };

  // Save Project
  const handleSave = () => {
    try {
      // Prompt for a name if still using the default
      let nameToSave = projectName;
      if (projectName === 'Untitled Model') {
        const entered = prompt('Name your project before saving:', '');
        if (!entered || !entered.trim()) {
          alert('Save cancelled — please provide a project name.');
          return;
        }
        nameToSave = entered.trim();
        setProjectName(nameToSave);
      }

      let viewportData = { sketches: [] };
      if (viewportRef.current?.getProjectData) {
        viewportData = viewportRef.current.getProjectData();
      }

      const projectData = {
        projectName: nameToSave,
        features: features.map(f => {
          if (f.meshData && f.meshData.vertices) {
            return {
              ...f,
              meshData: {
                vertices: Array.from(f.meshData.vertices),
                normals: Array.from(f.meshData.normals),
                indices: f.meshData.indices ? Array.from(f.meshData.indices) : null
              }
            };
          }
          return f;
        }),
        sketches: viewportData.sketches,
        modelUrl,
        chatMessages,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem('chainTorqueCADProject', JSON.stringify(projectData));
      alert(`✅ Project "${nameToSave}" saved locally!`);
    } catch (err) {
      console.error('Failed to save project:', err);
      alert('Failed to save project: ' + err.message);
    }
  };

  // Convert features buffer arrays back to TypedArrays after loading
  useEffect(() => {
    if (features.length > 0 && features.some(f => Array.isArray(f.meshData?.vertices))) {
      setFeatures(prev => prev.map(f => {
        if (f.meshData && Array.isArray(f.meshData.vertices)) {
          return {
            ...f,
            meshData: {
              vertices: new Float32Array(f.meshData.vertices),
              normals: new Float32Array(f.meshData.normals),
              indices: f.meshData.indices ? new Uint32Array(f.meshData.indices) : null
            }
          };
        }
        return f;
      }));
    }
  }, [features]);

  // Download Project as STL or GLB
  const handleDownload = async () => {
    const format = prompt('Enter format (stl or glb):', 'stl');
    if (!format || !['stl', 'glb'].includes(format.toLowerCase())) {
      alert('Please enter "stl" or "glb"');
      return;
    }

    // Get features with mesh data
    const meshFeatures = features.filter(f => f.meshData);

    if (meshFeatures.length === 0) {
      alert('No 3D geometry to export. Generate an AI model or draw and extrude a sketch first!');
      return;
    }

    try {
      // Import Three.js and exporters dynamically
      const THREE = await import('three');

      // Create a scene with all meshes
      const exportScene = new THREE.Scene();

      meshFeatures.forEach((feature, index) => {
        let { vertices, indices, normals } = feature.meshData;

        // Ensure typed arrays (they become regular arrays after JSON save/restore)
        if (!(vertices instanceof Float32Array)) vertices = new Float32Array(vertices);
        if (!(indices instanceof Uint32Array)) indices = new Uint32Array(indices);
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

        alert(`Exported ${meshFeatures.length} part(s) to ${projectName}.stl`);
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

          alert(`Exported ${meshFeatures.length} part(s) to ${projectName}.glb`);
        }, (error) => {
          alert('GLB export failed: ' + error.message);
        }, { binary: true });
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    }
  };

  // Undo - send event to ViewportManager
  const handleUndo = () => {
    // Dispatch keyboard event to trigger backspace behavior
    const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true });
    document.dispatchEvent(event);
  };

  // Redo - currently not implemented fully
  const handleRedo = () => {
    alert('Redo not yet implemented');
  };

  // Clear All with confirmation
  const handleClearAll = () => {
    const confirmed = window.confirm('⚠️ Clear All?\n\nThis will delete all sketches and features. This action cannot be undone.\n\nClick OK to clear, or Cancel to keep your work.');
    if (confirmed) {
      // Clear App features
      setFeatures([]);
      setProjectName('Untitled Model');
      setModelUrl(null);
      setModelInfo(null);

      // Clear ViewportManager sketches
      if (viewportRef.current?.clearAll) {
        viewportRef.current.clearAll();
      }
      alert('All content cleared. Starting fresh!');
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
          <FaUndo title="Undo (Backspace)" onClick={handleUndo} style={{ cursor: 'pointer' }} />
          <FaRedo title="Redo" onClick={handleRedo} style={{ cursor: 'pointer' }} />
          <FaCopy title="Copy" />
          <FaPaste title="Paste" />
          <FaDownload title="Download (STL/GLB)" onClick={handleDownload} style={{ cursor: 'pointer' }} />
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
            style={{ cursor: 'pointer', color: showImageTo3D ? '#4facfe' : 'inherit' }}
          />
          <FaCloudUploadAlt
            title="Upload to Marketplace"
            onClick={() => setShowUploadModal(true)}
            style={{ cursor: 'pointer', color: '#4facfe', fontSize: '18px' }}
          />
          <FaCog title="Settings" />
        </div>
      </div>

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
                onClick={() => setViewMode('2d')}
                title="2D Sketch (ESC)"
              >
                2D
              </button>
              <button
                className={`mode-btn-sm ${viewMode === '3d' ? 'active' : ''}`}
                onClick={() => setViewMode('3d')}
                title="3D Model (I)"
              >
                3D
              </button>
            </div>

            <span className="viewport-label">{viewMode === '2d' ? '2D Sketch' : '3D Model'}</span>

            {/* View controls - only in 3D mode */}
            {viewMode === '3d' && (
              <div className="view-controls">
                <button
                  className={activeView === 'front' ? 'active' : ''}
                  onClick={() => handleViewChange('front')}
                >
                  Front
                </button>
                <button
                  className={activeView === 'top' ? 'active' : ''}
                  onClick={() => handleViewChange('top')}
                >
                  Top
                </button>
                <button
                  className={activeView === 'right' ? 'active' : ''}
                  onClick={() => handleViewChange('right')}
                >
                  Right
                </button>
                <button
                  className={activeView === 'iso' ? 'active' : ''}
                  onClick={() => handleViewChange('iso')}
                >
                  Iso
                </button>
              </div>
            )}
          </div>

          {/* Viewport Manager - 2D/3D Switching */}
          <div className="viewport-container">
            <ViewportManager
              ref={viewportRef}
              features={features}
              onFeatureAdd={handleFeatureCreated}
              onFeatureDelete={handleFeatureDelete}
              onFeatureUpdate={handleFeatureUpdate}
              selectedFeature={selectedFeature}
              onFeatureSelect={handleFeatureSelect}
              activeTool={activeTool}
              onToolChange={setActiveTool}
              modelUrl={modelUrl}
              onModelLoad={handleModelLoad}
              onModelCaptured={handleModelCaptured}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onSketchesChange={setSketches}
            />
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        {!showSidebar && (
          <button
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            title="Open Feature Tree & Operations"
          >
            <FaVectorSquare />
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
              onFeatureToggle={handleFeatureToggle}
              onFeatureDelete={handleFeatureDelete}
              onFeatureSelect={handleFeatureSelect}
            />
            <CADOperations
              sketches={sketches}
              onExtrudeComplete={(extrudedGeometry) => {
                // Add extruded geometry to features
                setFeatures(prev => [...prev, {
                  id: extrudedGeometry.id,
                  type: '3d-solid',
                  name: `Extrusion ${prev.filter(f => f.type === '3d-solid').length + 1}`,
                  meshData: extrudedGeometry.meshData,
                  height: extrudedGeometry.height,
                  visible: true
                }]);
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

      {/* Status Bar */}
      <div className="statusbar">
        <span>Ready | Tool: {activeTool} | Features: {features.length} | FPS: 60</span>
        <span>ChainTorque CAD v0.1.0 - Sketch-to-Solid CAD System</span>
      </div>
    </div>
  );
};

export default App;