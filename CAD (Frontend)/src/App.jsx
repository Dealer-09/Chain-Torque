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
} from "react-icons/fa";
import ViewportManager from "./components/ViewportManager.jsx";
import FeatureTree from "./components/FeatureTree.jsx";
import CADOperations from "./components/CADOperations.jsx";
import CADTestComponent from "./components/CADTestComponent.jsx";
import "./App.css";

const App = () => {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [activeView, setActiveView] = useState('iso');
  const [viewMode, setViewMode] = useState('2d'); // 2D sketch or 3D model
  const [features, setFeatures] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showCADTest, setShowCADTest] = useState(false); // Disabled in production
  const viewportRef = useRef();

  // Project state
  const [projectName, setProjectName] = useState('Untitled Project');

  // Undo/Redo history
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Model loading state
  const [modelUrl, setModelUrl] = useState(null);
  const [modelTitle, setModelTitle] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

  // Parse URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const model = urlParams.get('model');
    const title = urlParams.get('title');

    if (model) {
      setModelUrl(decodeURIComponent(model));
      setModelTitle(title ? decodeURIComponent(title) : 'Imported Model');
    }
  }, []);

  const handleModelLoad = (info) => {
    setModelInfo(info);
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
  };

  // Update feature
  const handleFeatureUpdate = (featureId, updates) => {
    setFeatures(prev => prev.map(feature =>
      feature.id === featureId
        ? { ...feature, ...updates }
        : feature
    ));
  };

  // Select feature
  const handleFeatureSelect = (feature) => {
    setSelectedFeature(feature);
  };

  // Handle CAD operations
  const handleCADOperation = (operation) => {
    // TODO: Implement with actual geometry operations
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

  // Save Project
  const handleSave = () => {
    const name = prompt('Enter project name:', projectName);
    if (!name) return;

    setProjectName(name);
    const projectData = {
      name,
      features,
      viewMode,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(`cad_project_${name}`, JSON.stringify(projectData));
    alert(`Project "${name}" saved successfully!`);
  };

  // Download Project
  const handleDownload = () => {
    const format = prompt('Enter format (stl or glb):', 'glb');
    if (!format || !['stl', 'glb'].includes(format.toLowerCase())) {
      alert('Please enter "stl" or "glb"');
      return;
    }

    // For now, export project data as JSON (real STL/GLB would need OpenCascade export)
    const projectData = {
      name: projectName,
      features,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.${format.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
          <span className="filename">{modelTitle || 'untitled_model.cad'}</span>
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
          <FaCut title="Cut" />
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
          </div>
          <div className="tool-section">
            <h3>Edit</h3>
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
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {/* OpenCascade CAD Test Panel */}
            {showCADTest && (
              <CADTestComponent />
            )}
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
              sketches={features.filter(f => f.type === 'polygon' || f.type === 'lines')}
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
            <div className="ai-message">
              <strong>🤖 Torquy:</strong><br />
              Hello! I'm Torquy, your CAD assistant. I can help you with:
              <ul>
                <li>"Create a 10mm hole here"</li>
                <li>"Add 2mm fillet to all edges"</li>
                <li>"Extrude this face 50mm"</li>
                <li>"Change material to aluminum"</li>
                <li>"Mirror this part across X-axis"</li>
              </ul>
              Currently viewing: 3D sample objects
            </div>
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="Ask me to edit your model..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  // TODO: Handle AI command input
                }
              }}
            />
            <button>Send</button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="statusbar">
        <span>Ready | Tool: {activeTool} | Features: {features.length} | FPS: 60</span>
        <span>ChainTorque CAD v0.1.0 - Sketch-to-Solid CAD System</span>
      </div>
    </div>
  );
};

export default App;