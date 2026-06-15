// ImportModelModal.jsx
// slide-in modal to import external models (marketplace purchases or local GLB/STL files)
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useDocumentStore } from '../store/documentStore';
import { FaSearch, FaFolderOpen, FaCloudUploadAlt, FaWallet, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import { useSettingsStore } from '../store/settingsStore';
import './ImportModelModal.css';

const getApiUrl = () => {
  try {
    const override = localStorage.getItem('ct_cad_backend');
    if (override && override.trim()) return override.trim().replace(/\/?$/, '') + '/api';
  } catch {}
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return 'http://localhost:5001/api';
  }
  return 'https://chaintorque-backend.onrender.com/api';
};

const getMarketplaceUrl = () => {
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return 'http://localhost:8080';
  }
  return 'https://chaintorque-marketplace.onrender.com';
};

const resolveAssetUrl = (url) => {
  if (!url) return '/placeholder.png';
  if (url.startsWith('http')) return url;
  if (url.startsWith('ipfs://')) return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
  return `${getApiUrl().replace(/\/api$/, '')}${url}`;
};

const formatItemPrice = (price) => {
  if (price === undefined || price === null) return '0';
  try {
    const priceStr = price.toString();
    // If it contains a decimal point or is a small number, it is already in ETH
    if (priceStr.includes('.') || parseFloat(priceStr) < 1000) {
      return priceStr;
    }
    // Otherwise format from Wei
    return ethers.formatEther(priceStr);
  } catch (err) {
    console.warn('Error formatting price:', err);
    return price.toString();
  }
};

export default function ImportModelModal({ onClose, walletAddress: initialWalletAddress }) {
  const theme = useSettingsStore((s) => s.theme);
  const getActiveTheme = (themeVal) => {
    if (themeVal === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeVal;
  };
  const activeTheme = getActiveTheme(theme);
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'local'
  const [walletAddress, setWalletAddress] = useState(initialWalletAddress || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [libraryType, setLibraryType] = useState('purchases'); // 'purchases' | 'marketplace'
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('info'); // 'info' | 'error' | 'success'
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef();
  const importExternalModel = useDocumentStore((s) => s.importExternalModel);

  // Sync wallet address and check accounts on load
  useEffect(() => {
    if (!walletAddress && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts) => {
          if (accounts && accounts[0]) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch(console.error);
    }
  }, [walletAddress]);

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatusMsg('MetaMask not found. Please install MetaMask.');
      setStatusType('error');
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        setWalletAddress(accounts[0]);
        setStatusMsg('');
      }
    } catch (err) {
      setStatusMsg('Failed to connect wallet: ' + err.message);
      setStatusType('error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Fetch purchases or all marketplace items
  useEffect(() => {
    if (activeTab !== 'library') return;
    
    const fetchItems = async () => {
      setIsLoadingItems(true);
      setStatusMsg('');
      try {
        let url = '';
        if (libraryType === 'purchases') {
          if (!walletAddress) {
            setItems([]);
            setIsLoadingItems(false);
            return;
          }
          url = `${getApiUrl()}/user/${walletAddress}/purchases`;
        } else {
          url = `${getApiUrl()}/marketplace`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
          const list = libraryType === 'purchases' ? (data.purchases || []) : (data.data || []);
          setItems(list);
        } else {
          setItems([]);
          setStatusMsg(data.message || 'Failed to load items.');
          setStatusType('error');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setItems([]);
        setStatusMsg('Error communicating with backend.');
        setStatusType('error');
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchItems();
  }, [activeTab, libraryType, walletAddress]);

  // Extract mesh data from arrayBuffer GLB
  const parseGLB = (arrayBuffer) => {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
      loader.setDRACOLoader(dracoLoader);

      loader.parse(arrayBuffer, '', (gltf) => {
        const scene = gltf.scene;
        const allVertices = [];
        const allIndices = [];
        let indexOffset = 0;

        scene.traverse((child) => {
          if (child.isMesh && child.geometry?.attributes?.position) {
            const posAttr = child.geometry.attributes.position;
            const worldMatrix = child.matrixWorld;
            for (let i = 0; i < posAttr.count; i++) {
              const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
              v.applyMatrix4(worldMatrix);
              allVertices.push(v.x, v.y, v.z);
            }

            const idx = child.geometry.index;
            if (idx) {
              for (let i = 0; i < idx.count; i++) {
                allIndices.push(idx.getX(i) + indexOffset);
              }
            } else {
              for (let i = 0; i < posAttr.count; i++) {
                allIndices.push(i + indexOffset);
              }
            }
            indexOffset += posAttr.count;
          }
        });

        dracoLoader.dispose();

        if (allVertices.length === 0) {
          reject(new Error('No 3D meshes found in the GLB model.'));
          return;
        }

        resolve({
          vertices: new Float32Array(allVertices),
          indices: new Uint32Array(allIndices),
          normals: new Float32Array(allVertices.length)
        });
      }, (err) => {
        dracoLoader.dispose();
        reject(err);
      });
    });
  };

  // Extract mesh data from arrayBuffer STL
  const parseSTL = (arrayBuffer) => {
    const loader = new STLLoader();
    const geometry = loader.parse(arrayBuffer);
    if (!geometry.attributes.position) {
      throw new Error('No vertices found in the STL model.');
    }

    const posAttr = geometry.attributes.position;
    const vertices = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      vertices[i * 3] = posAttr.getX(i);
      vertices[i * 3 + 1] = posAttr.getY(i);
      vertices[i * 3 + 2] = posAttr.getZ(i);
    }

    const indices = new Uint32Array(posAttr.count);
    const idx = geometry.index;
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[i] = idx.getX(i);
      }
    } else {
      for (let i = 0; i < posAttr.count; i++) {
        indices[i] = i;
      }
    }

    geometry.computeVertexNormals();
    const normals = new Float32Array(vertices.length);
    const normAttr = geometry.attributes.normal;
    if (normAttr) {
      for (let i = 0; i < normAttr.count; i++) {
        normals[i * 3] = normAttr.getX(i);
        normals[i * 3 + 1] = normAttr.getY(i);
        normals[i * 3 + 2] = normAttr.getZ(i);
      }
    }

    return { vertices, indices, normals };
  };

  // Add marketplace item to scene
  const handleAddMarketplaceItem = async (item) => {
    setIsProcessing(true);
    setStatusMsg(`Fetching and parsing model: ${item.title || 'Model'}...`);
    setStatusType('info');

    try {
      const modelUrl = item.modelUrl;
      if (!modelUrl) throw new Error('Item does not have a model URL.');

      // Fetch model through the backend proxy to avoid CORS issues
      const proxyUrl = `${getApiUrl()}/proxy-model?url=${encodeURIComponent(modelUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Failed to retrieve model through gateway proxy.');

      const buffer = await response.arrayBuffer();
      const meshData = await parseGLB(buffer);

      // Successfully parsed, now add to the workspace
      const meta = {
        tokenId: item.tokenId,
        seller: item.seller,
        imageUrl: item.imageUrl,
        price: item.price
      };

      importExternalModel(meshData, modelUrl, item.title, meta);
      
      // Auto-switch back to 3D mode if store has it
      try {
        const store = useDocumentStore.getState();
        if (store.setViewMode) store.setViewMode('3d');
      } catch {}

      setStatusMsg(`Successfully imported ${item.title || 'Model'}!`);
      setStatusType('success');
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setStatusMsg(`Import failed: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle local file upload (GLB or STL)
  const handleLocalFile = async (file) => {
    if (!file) return;
    const name = file.name;
    const ext = name.split('.').pop().toLowerCase();
    if (ext !== 'glb' && ext !== 'stl') {
      setStatusMsg('Only GLB and STL files are supported.');
      setStatusType('error');
      return;
    }

    setIsProcessing(true);
    setStatusMsg(`Parsing local file: ${name}...`);
    setStatusType('info');

    try {
      const reader = new FileReader();
      const buffer = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      let meshData = null;
      let glbUrl = null;

      if (ext === 'glb') {
        meshData = await parseGLB(buffer);
        // We can create a local object URL for instant rendering with original materials
        glbUrl = URL.createObjectURL(file);
      } else {
        meshData = parseSTL(buffer);
      }

      importExternalModel(meshData, glbUrl, name.replace(/\.[^/.]+$/, ''), { source: 'local-file' });

      // Auto-switch back to 3D mode
      try {
        const store = useDocumentStore.getState();
        if (store.setViewMode) store.setViewMode('3d');
      } catch {}

      setStatusMsg('Successfully imported model!');
      setStatusType('success');

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setStatusMsg(`Import failed: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLocalFile(e.dataTransfer.files[0]);
    }
  };

  // Filter items based on search query
  const filteredItems = items.filter((item) => {
    const title = item.title || `Model #${item.tokenId}`;
    const desc = item.description || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           desc.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="imm-backdrop" onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose()}>
      <div className="imm-modal">
        {/* Header */}
        <div className="imm-header">
          <div className="imm-header-left">
            <span className="imm-header-icon"><FaFolderOpen /></span>
            <div>
              <h2 className="imm-title">Import Model into Workspace</h2>
              <p className="imm-subtitle">Insert external assets directly into the active viewport</p>
            </div>
          </div>
          <button className="imm-close" onClick={onClose} disabled={isProcessing}>
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className="imm-tabs">
          <button
            className={`imm-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
            disabled={isProcessing}
          >
            🛒 Marketplace Library
          </button>
          <button
            className={`imm-tab-btn ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => setActiveTab('local')}
            disabled={isProcessing}
          >
            Local File
          </button>
        </div>

        {/* Body Content */}
        <div className="imm-content">
          {activeTab === 'library' ? (
            <>
              {/* Controls: Search and filter toggle */}
              <div className="imm-controls">
                <div className="imm-search-container">
                  <FaSearch className="imm-search-icon" />
                  <input
                    type="text"
                    className="imm-search-input"
                    placeholder="Search library..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
                
                <div className="imm-subtoggles">
                  <button
                    className={`imm-subtoggle-btn ${libraryType === 'purchases' ? 'active' : ''}`}
                    onClick={() => setLibraryType('purchases')}
                    disabled={isProcessing}
                  >
                    My Purchases
                  </button>
                  <button
                    className={`imm-subtoggle-btn ${libraryType === 'marketplace' ? 'active' : ''}`}
                    onClick={() => setLibraryType('marketplace')}
                    disabled={isProcessing}
                  >
                    Browse Marketplace
                  </button>
                </div>
              </div>

              {/* Wallet connection prompt if in Purchases and no wallet connected */}
              {libraryType === 'purchases' && !walletAddress ? (
                <div className="imm-connect-prompt">
                  <FaWallet className="imm-connect-icon" />
                  <h3 className="imm-connect-title">Connect Wallet</h3>
                  <p className="imm-connect-desc">
                    Connect your Web3 wallet to verify ownership and load your purchased marketplace items.
                  </p>
                  <button className="imm-btn-primary" onClick={connectWallet} disabled={isConnecting}>
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                </div>
              ) : isLoadingItems ? (
                <div className="imm-loading-spinner">
                  <div className="imm-spinner" />
                  <span>Loading assets...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="imm-empty-state">
                  <span className="imm-empty-icon">📂</span>
                  <p>No items found matching your query.</p>
                  {libraryType === 'purchases' && (
                    <p style={{ fontSize: '12px', color: 'hsl(240 5% 55%)', marginTop: '4px' }}>
                      Items you purchase on the Marketplace will appear here.
                    </p>
                  )}
                </div>
              ) : (
                <div className="imm-grid">
                  {filteredItems.map((item) => {
                    const id = item.tokenId || item._id;
                    const priceEth = formatItemPrice(item.price);
                    const isPurchased = libraryType === 'purchases' || 
                                        items.some(p => p.tokenId === item.tokenId);
                    
                    return (
                      <div className="imm-card" key={id}>
                        <div className="imm-card-image-wrap">
                          <img
                            src={resolveAssetUrl(item.imageUrl)}
                            alt={item.title}
                            className="imm-card-img"
                            onError={(e) => { e.target.src = '/placeholder.png'; }}
                          />
                          {isPurchased && <span className="imm-card-badge">Owned</span>}
                        </div>
                        <div className="imm-card-info">
                          <h4 className="imm-card-title">{item.title || `Model #${item.tokenId}`}</h4>
                          <p className="imm-card-desc">{item.description || 'No description provided.'}</p>
                          <div className="imm-card-meta">
                            <span className="imm-card-price">
                              {priceEth}
                              <span className="imm-card-price-unit">ETH</span>
                            </span>
                            {isPurchased ? (
                              <button
                                className="imm-btn-action"
                                onClick={() => handleAddMarketplaceItem(item)}
                                disabled={isProcessing}
                              >
                                Add to Scene
                              </button>
                            ) : (
                              <a
                                href={`${getMarketplaceUrl()}/product/${item.tokenId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="imm-btn-link"
                              >
                                Buy <FaExternalLinkAlt style={{ fontSize: '10px' }} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Local File Tab */
            <div
              className={`imm-upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current.click()}
            >
              <FaCloudUploadAlt className="imm-upload-icon" />
              <h3 className="imm-upload-title">Drag &amp; Drop 3D File</h3>
              <p className="imm-upload-desc">Supports GLB and STL formats (max 50MB)</p>
              <button className="imm-btn-primary" disabled={isProcessing}>
                Browse Files
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".glb,.stl"
                onChange={(e) => handleLocalFile(e.target.files[0])}
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Status Overlay/Toast */}
          {statusMsg && (
            <div className={`imm-status`} style={{
              background: statusType === 'error' ? 'rgba(239, 68, 68, 0.15)' : statusType === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(167, 139, 250, 0.15)',
              border: `1px solid ${statusType === 'error' ? 'rgba(239, 68, 68, 0.3)' : statusType === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(167, 139, 250, 0.3)'}`,
              color: statusType === 'error' 
                ? (activeTheme === 'light' ? '#dc2626' : '#f87171') 
                : statusType === 'success' 
                  ? (activeTheme === 'light' ? '#059669' : '#34d399') 
                  : (activeTheme === 'light' ? '#7c3aed' : '#c084fc')
            }}>
              {statusMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
