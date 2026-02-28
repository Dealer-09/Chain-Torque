// UploadToMarketplaceModal.jsx
// Upload CAD model directly to ChainTorque Marketplace from the editor
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x82b71CF1EdA2BfF3EdA3Dad5B325cd544E129A7e';
const MARKETPLACE_ABI = [
  'function purchaseToken(uint256 tokenId) external payable',
  'function createToken(string memory tokenURI, uint128 price, uint32 category, uint24 royalty) external payable returns (uint256)',
  'function getListingPrice() external view returns (uint256)',
  'function relistToken(uint256 tokenId, uint128 price) external payable',
  'function getMarketItem(uint256 tokenId) external view returns (tuple(uint256 tokenId, uint128 price, uint64 createdAt, uint32 category, uint24 royalty, bool sold, address seller, address owner, address creator))',
  'event MarketItemSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint128 price)',
  'event MarketItemCreated(uint256 indexed tokenId, address indexed seller, uint128 indexed price, uint32 category, uint256 timestamp)',
];

const CATEGORY_MAP = {
  Mechanical: 10,
  Automotive: 10,
  Aerospace: 10,
  Industrial: 10,
  Architecture: 10,
  Electronics: 1,
  Collectibles: 2,
  Art: 3,
  Gaming: 5,
  Other: 10,
};

const getApiUrl = () => {
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return 'http://localhost:5001/api';
  }
  return 'https://chaintorque-backend.onrender.com/api';
};

// Build a Three.js scene from feature meshData and return a GLB Blob
async function buildGLBBlob(features, projectName) {
  const THREE = await import('three');
  const { GLTFExporter } = await import(
    'three/examples/jsm/exporters/GLTFExporter.js'
  );

  const meshFeatures = features.filter((f) => f.meshData);
  if (meshFeatures.length === 0) return null;

  const exportScene = new THREE.Scene();

  meshFeatures.forEach((feature, index) => {
    let { vertices, indices, normals } = feature.meshData;
    if (!(vertices instanceof Float32Array)) vertices = new Float32Array(vertices);
    if (indices && !(indices instanceof Uint32Array))
      indices = new Uint32Array(indices);
    if (normals && !(normals instanceof Float32Array))
      normals = new Float32Array(normals);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    if (indices && indices.length > 0) {
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ color: 0x4ecdc4 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = feature.name || `Part_${index + 1}`;
    exportScene.add(mesh);
  });

  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      exportScene,
      (result) => {
        resolve(new Blob([result], { type: 'model/gltf-binary' }));
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

// Capture a screenshot from the Three.js canvas (needs preserveDrawingBuffer)
function captureViewportScreenshot() {
  try {
    const canvas = document.querySelector('.viewport-container canvas');
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

// Convert data URL to File
function dataURLtoFile(dataURL, filename) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

const STEPS = ['Details', 'Pricing', 'Preview & Submit'];

const UploadToMarketplaceModal = ({ features, projectName, onClose }) => {
  const [step, setStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState(''); // 'info' | 'error' | 'success'
  const [glbBlob, setGlbBlob] = useState(null);
  const [glbReady, setGlbReady] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // data URL or null
  const [extraImages, setExtraImages] = useState([]); // File[]
  const imageInputRef = useRef();

  const [form, setForm] = useState({
    title: projectName || 'Untitled Model',
    description: '',
    category: 'Mechanical',
    price: '',
    royalty: 0,
  });

  // On mount: generate GLB and grab screenshot
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Try screenshot first (needs 3D mode to be active / preserveDrawingBuffer)
      const shot = captureViewportScreenshot();
      if (!cancelled && shot) setPreviewImage(shot);

      // Generate GLB blob
      try {
        const blob = await buildGLBBlob(features, projectName);
        if (!cancelled) {
          setGlbBlob(blob);
          setGlbReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setGlbReady(true); // still allow upload without model
          console.warn('GLB generation warning:', err.message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const canAdvance = () => {
    if (step === 0) return form.title.trim() !== '' && form.description.trim() !== '';
    if (step === 1) return form.price !== '' && parseFloat(form.price) > 0;
    return true;
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    // Show first as preview thumbnail
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewImage(ev.target.result);
    reader.readAsDataURL(files[0]);
    setExtraImages(files.slice(0, 5));
  };

  const handleSubmit = async () => {
    setIsUploading(true);
    setStatusType('info');

    try {
      // ── 1. MetaMask checks ──────────────────────────────────────────
      if (!window.ethereum)
        throw new Error('MetaMask not found. Please install MetaMask.');

      setStatusMsg('Connecting wallet…');
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const walletAddress = await signer.getAddress();

      // ── 2. Build FormData for IPFS upload ──────────────────────────
      setStatusMsg('Uploading files to IPFS…');
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);

      // Attach GLB model if available
      if (glbBlob) {
        const glbFile = new File([glbBlob], `${form.title.replace(/\s+/g, '_')}.glb`, {
          type: 'model/gltf-binary',
        });
        formData.append('model', glbFile);
      }

      // Attach images — user-selected first, else screenshot
      let imageFiles = [...extraImages];
      if (imageFiles.length === 0 && previewImage) {
        imageFiles.push(dataURLtoFile(previewImage, 'preview.png'));
      }
      if (imageFiles.length === 0)
        throw new Error('Please add at least one preview image.');

      imageFiles.slice(0, 5).forEach((img) => formData.append('image', img));

      // ── 3. Upload to IPFS via backend ──────────────────────────────
      const ipfsRes = await fetch(`${getApiUrl()}/marketplace/upload-files`, {
        method: 'POST',
        body: formData,
      });
      const ipfsData = await ipfsRes.json();
      if (!ipfsData.success || !ipfsData.data?.tokenURI)
        throw new Error(ipfsData.error || ipfsData.message || 'IPFS upload failed');

      const { tokenURI, imageUrl, images, modelUrl } = ipfsData.data;

      // ── 4. Mint NFT via MetaMask ────────────────────────────────────
      setStatusMsg('Waiting for MetaMask signature…');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_ABI, signer);

      const priceWei = ethers.utils.parseEther(form.price);
      const royaltyBps = Math.floor(form.royalty * 100); // % → basis points
      const categoryId = CATEGORY_MAP[form.category] ?? 10;
      const listingPrice = await contract.getListingPrice();

      alert(
        'Files uploaded to IPFS!\n\nPlease sign the transaction in MetaMask to mint your NFT on the marketplace.'
      );

      const tx = await contract.createToken(tokenURI, priceWei, categoryId, royaltyBps, {
        value: listingPrice,
      });

      setStatusMsg('Confirming transaction…');
      const receipt = await tx.wait();

      // ── 5. Extract tokenId from receipt ────────────────────────────
      let tokenId = null;
      const iface = new ethers.utils.Interface(MARKETPLACE_ABI);
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === 'MarketItemCreated') {
            tokenId = parsed.args.tokenId.toNumber();
            break;
          }
        } catch {
          continue;
        }
      }

      if (!tokenId)
        throw new Error('Could not find Token ID in transaction receipt.');

      // ── 6. Sync to backend DB ──────────────────────────────────────
      setStatusMsg('Syncing to database…');
      const syncRes = await fetch(`${getApiUrl()}/marketplace/sync-creation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          transactionHash: tx.hash,
          walletAddress,
          title: form.title,
          description: form.description,
          category: form.category,
          price: form.price,
          imageUrl,
          images,
          modelUrl,
          tokenURI,
          username: 'CAD Creator',
          royalty: form.royalty,
        }),
      });
      const syncData = await syncRes.json();

      if (!syncData.success) {
        setStatusType('success');
        setStatusMsg(
          `🎉 NFT minted on-chain (Token #${tokenId})!\n\nYour listing will appear in the marketplace shortly.\n\nTx: ${tx.hash}`
        );
      } else {
        setStatusType('success');
        setStatusMsg(
          `🎉 Successfully listed on marketplace!\n\nToken ID: #${tokenId}\nYou will receive payments directly when it sells.\n\nTx: ${tx.hash}`
        );
      }
    } catch (err) {
      console.error('[Upload to Marketplace]', err);
      setStatusType('error');

      const revert =
        err?.revert?.args?.[0] || err?.reason || err?.data?.message || '';
      const msg = revert || err?.message || 'Unknown error';

      if (err.code === 4001 || msg.toLowerCase().includes('user rejected')) {
        setStatusMsg('Transaction cancelled.');
      } else if (msg.toLowerCase().includes('royalty too high')) {
        setStatusMsg('Royalty too high — maximum is 10%.');
      } else {
        setStatusMsg(`Error: ${msg}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="utm-step">
      <p className="utm-step-hint">Describe your 3D model for the marketplace listing.</p>

      <label className="utm-label">
        Model Name <span className="utm-required">*</span>
      </label>
      <input
        className="utm-input"
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        placeholder="e.g., Precision Bracket v2"
        maxLength={80}
      />

      <label className="utm-label" style={{ marginTop: '16px' }}>
        Description <span className="utm-required">*</span>
      </label>
      <textarea
        className="utm-input utm-textarea"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        placeholder="Describe materials, tolerances, use case…"
        rows={4}
        maxLength={1000}
      />
    </div>
  );

  const renderStep1 = () => (
    <div className="utm-step">
      <p className="utm-step-hint">Set your category, price and royalties.</p>

      <label className="utm-label">Category</label>
      <select
        className="utm-input utm-select"
        value={form.category}
        onChange={(e) => set('category', e.target.value)}
      >
        {Object.keys(CATEGORY_MAP).map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <label className="utm-label" style={{ marginTop: '16px' }}>
        Price (ETH) <span className="utm-required">*</span>
      </label>
      <input
        className="utm-input"
        type="number"
        min="0.0001"
        step="0.001"
        value={form.price}
        onChange={(e) => set('price', e.target.value)}
        placeholder="e.g., 0.05"
      />

      <label className="utm-label" style={{ marginTop: '16px' }}>
        Royalty:{' '}
        <span style={{ color: 'hsl(217 91% 65%)', fontWeight: 700 }}>{form.royalty}%</span>
        &nbsp;
        <span style={{ color: '#888', fontWeight: 400, fontSize: '11px' }}>
          (max 10%)
        </span>
      </label>
      <input
        className="utm-slider"
        type="range"
        min="0"
        max="10"
        step="0.5"
        value={form.royalty}
        onChange={(e) => set('royalty', parseFloat(e.target.value))}
      />
      <div className="utm-slider-labels">
        <span>0%</span>
        <span>5%</span>
        <span>10%</span>
      </div>
      <p className="utm-hint-small">
        You earn this % on every future resale, paid automatically by the smart contract.
      </p>
    </div>
  );

  const renderStep2 = () => (
    <div className="utm-step">
      <p className="utm-step-hint">Review before publishing to the blockchain.</p>

      {/* Preview thumbnail */}
      <div className="utm-preview-row">
        <div
          className="utm-thumb"
          style={{
            backgroundImage: previewImage ? `url(${previewImage})` : 'none',
          }}
        >
          {!previewImage && (
            <span className="utm-thumb-placeholder">No preview</span>
          )}
          <button
            className="utm-thumb-change"
            onClick={() => imageInputRef.current.click()}
            title="Change preview image"
          >
            Change image
          </button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleImageChange}
        />

        <div className="utm-summary">
          <div className="utm-summary-row">
            <span className="utm-summary-key">Name</span>
            <span className="utm-summary-val">{form.title}</span>
          </div>
          <div className="utm-summary-row">
            <span className="utm-summary-key">Category</span>
            <span className="utm-summary-val">{form.category}</span>
          </div>
          <div className="utm-summary-row">
            <span className="utm-summary-key">Price</span>
            <span className="utm-summary-val" style={{ color: 'hsl(217 91% 65%)' }}>
              {form.price} ETH
            </span>
          </div>
          <div className="utm-summary-row">
            <span className="utm-summary-key">Royalty</span>
            <span className="utm-summary-val">{form.royalty}%</span>
          </div>
          <div className="utm-summary-row">
            <span className="utm-summary-key">Model file</span>
            <span
              className="utm-summary-val"
              style={{ color: glbBlob ? '#4ade80' : '#f87171' }}
            >
              {glbBlob ? `✓ GLB ready (auto-exported)` : '⚠ No 3D geometry — upload only images'}
            </span>
          </div>
          <div className="utm-summary-row">
            <span className="utm-summary-key">Network</span>
            <span className="utm-summary-val" style={{ color: '#fbbf24' }}>
              Sepolia Testnet
            </span>
          </div>
        </div>
      </div>

      {/* Add more images */}
      <button
        className="utm-add-images-btn"
        onClick={() => imageInputRef.current.click()}
      >
        + Add / Change Preview Images
      </button>
      {extraImages.length > 0 && (
        <p className="utm-hint-small" style={{ marginTop: '6px' }}>
          {extraImages.length} image(s) selected
        </p>
      )}

      {!glbBlob && (
        <p className="utm-hint-small utm-warning">
          ⚠ No 3D geometry found. Create and extrude a sketch, or load a model first, then re-open this dialog.
        </p>
      )}
    </div>
  );

  const renderStatus = () => {
    if (!statusMsg) return null;
    const colors = {
      info:    { bg: 'hsl(240 3.7% 14%)', border: 'hsl(240 3.7% 24%)',   text: 'hsl(217.9 10.6% 72%)' },
      error:   { bg: 'hsl(0 40% 12%)',    border: 'hsl(0 60% 35%)',      text: 'hsl(0 72% 72%)' },
      success: { bg: 'hsl(140 40% 10%)',  border: 'hsl(142 50% 32%)',    text: 'hsl(142 60% 65%)' },
    };
    const c = colors[statusType] || colors.info;
    return (
      <div
        className="utm-status"
        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
      >
        {statusMsg.split('\n').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="utm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="utm-modal">
        {/* Header */}
        <div className="utm-header">
          <div className="utm-header-left">
            <span className="utm-header-icon">🛒</span>
            <div>
              <h2 className="utm-title">Upload to Marketplace</h2>
              <p className="utm-subtitle">Mint &amp; list your CAD model as an NFT</p>
            </div>
          </div>
          <button className="utm-close" onClick={onClose} disabled={isUploading}>
            ×
          </button>
        </div>

        {/* Step indicator */}
        <div className="utm-steps-bar">
          {STEPS.map((label, idx) => (
            <React.Fragment key={label}>
              <div className={`utm-step-pill ${idx <= step ? 'active' : ''}`}>
                <span className="utm-step-num">
                  {idx < step ? '✓' : idx + 1}
                </span>
                <span className="utm-step-label">{label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`utm-step-line ${idx < step ? 'active' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="utm-body">
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {renderStatus()}
        </div>

        {/* Footer */}
        <div className="utm-footer">
          <button
            className="utm-btn utm-btn-ghost"
            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
            disabled={isUploading}
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          <div className="utm-footer-right">
            {!glbReady && step === 2 && (
              <span className="utm-generating">Generating GLB…</span>
            )}

            {step < STEPS.length - 1 ? (
              <button
                className="utm-btn utm-btn-primary"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
              >
                Next →
              </button>
            ) : statusType === 'success' ? (
              <button className="utm-btn utm-btn-success" onClick={onClose}>
                Done ✓
              </button>
            ) : (
              <button
                className="utm-btn utm-btn-primary"
                onClick={handleSubmit}
                disabled={isUploading || !glbReady}
              >
                {isUploading ? (
                  <>
                    <span className="utm-spinner" />
                    {statusMsg || 'Uploading…'}
                  </>
                ) : (
                  '🛒 Publish to Marketplace'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadToMarketplaceModal;
