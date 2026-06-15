// src/components/SettingsDialog.jsx
// Every setting here is REAL — it reads/writes the exact localStorage keys
// the rest of the app already consumes.
//
// BYOK (Bring Your Own Key):
//   ct_cad_gemini_key   — user's own Gemini API key, passed to the backend
//                         in each Torquy request. The backend uses it instead
//                         of its own server key. Key is never stored server-side.
//
// Reload-required settings (quality, WebGPU, frameloop): we write the key and
// call window.location.reload() after Save.
//
// Zero-reload: HUD (Zustand action), snap/grid/backend/aiMode/geminiKey
// (read at fetch-time or on next canvas mount).

import React, { useEffect, useRef, useState } from 'react';
import {
  FaTimes, FaKeyboard, FaPalette, FaBolt, FaCube, FaInfo,
  FaKey, FaEye, FaEyeSlash,
} from 'react-icons/fa';
import { usePerfStore } from '../perf/perfStore';
import { useSettingsStore } from '../store/settingsStore';

// ── localStorage keys ────────────────────────────────────────────────────────
// ct_cad_webgpu       '1'|'0'              RendererProvider
// ct_cad_always       '1'|'0'              ThreeViewer frameloop
// ct_cad_perf         '1'|'0'              perfStore HUD
// ct_cad_quality      auto|low|medium|high useAdaptiveQuality
// ct_cad_snap         true|false           ViewportManager default
// ct_cad_grid_size    number string        ViewportManager default
// ct_cad_backend      url string           getBackendUrl() everywhere
// ct_cad_ai_mode      2d|3d               aiGenerationMode default
// ct_cad_gemini_key   api key string      BYOK — passed to backend per-request
// ct_cad_settings     JSON blob            generic extras

const LS = {
  get: (k, fb = null) => { try { const v = localStorage.getItem(k); return v ?? fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

function readInitial() {
  return {
    webgpu:     LS.get('ct_cad_webgpu', '0') === '1',
    frameloop:  LS.get('ct_cad_always', '0') === '1' ? 'always' : 'demand',
    showStats:  LS.get('ct_cad_perf',   '0') === '1',
    quality:    LS.get('ct_cad_quality', 'auto'),
    snapToGrid: LS.get('ct_cad_snap',   'true') === 'true',
    gridSize:   Number(LS.get('ct_cad_grid_size', '20')),
    backendUrl: LS.get('ct_cad_backend', ''),
    aiMode:     LS.get('ct_cad_ai_mode', '3d'),
    navStyle:   LS.get('ct_cad_nav_style', 'default'),
    theme:      LS.get('ct_cad_theme', 'system'),
    geminiKey:  LS.get('ct_cad_gemini_key', ''),
    hfToken:    LS.get('ct_cad_hf_key', ''),
    ...((() => { try { return JSON.parse(LS.get('ct_cad_settings', '{}')); } catch { return {}; } })()),
  };
}

// ── tiny reusable controls ───────────────────────────────────────────────────

const Row = ({ label, hint, children }) => (
  <div className="sd-row">
    <div className="sd-row-label">
      <span>{label}</span>
      {hint && <small>{hint}</small>}
    </div>
    <div className="sd-row-control">{children}</div>
  </div>
);

const Toggle = ({ value, onChange }) => (
  <button className={`sd-toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)} type="button">
    <span className="sd-toggle-knob" />
  </button>
);

const Select = ({ value, onChange, options }) => (
  <select className="sd-select" value={value} onChange={e => onChange(e.target.value)}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Slider = ({ value, onChange, min, max, step = 1, unit = '' }) => (
  <div className="sd-slider-wrap">
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))} className="sd-slider" />
    <span className="sd-slider-val">{value}{unit}</span>
  </div>
);

// ── tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'performance', label: 'Performance', icon: <FaBolt /> },
  { id: 'cad',         label: 'CAD',         icon: <FaCube /> },
  { id: 'ai',          label: 'AI',          icon: <FaPalette /> },
  { id: 'api_keys',    label: 'API Keys',    icon: <FaKey /> },
  { id: 'shortcuts',   label: 'Shortcuts',   icon: <FaKeyboard /> },
  { id: 'about',       label: 'About',       icon: <FaInfo /> },
];

const SHORTCUTS = [
  { keys: 'L',          action: 'Line tool' },
  { keys: 'P',          action: 'Polygon tool' },
  { keys: 'C',          action: 'Circle tool' },
  { keys: 'A',          action: 'Arc tool' },
  { keys: 'I',          action: 'Toggle 3D view' },
  { keys: 'W / E / R',  action: 'Move / Rotate / Scale gizmo' },
  { keys: 'Enter',      action: 'Save sketch' },
  { keys: 'ESC',        action: 'Cancel / Deselect' },
  { keys: 'Backspace',  action: 'Undo last point (2D)' },
  { keys: 'Arrow Keys', action: 'Pan canvas (2D)' },
  { keys: 'Scroll',     action: 'Zoom' },
  { keys: 'Ctrl + Z',   action: 'Undo' },
  { keys: 'Ctrl + Y',   action: 'Redo' },
  { keys: 'Ctrl + C',   action: 'Copy selected feature' },
  { keys: 'Ctrl + V',   action: 'Paste feature' },
  { keys: 'Ctrl + S',   action: 'Save project' },
  { keys: 'Ctrl + K',   action: 'Command Palette' },
];

// ── main dialog ──────────────────────────────────────────────────────────────

export default function SettingsDialog({ onClose }) {
  const [tab, setTab]     = useState('performance');
  const [s, setS]         = useState(readInitial);
  const [dirty, setDirty] = useState(false);

  // BYOK key UX state — Gemini
  const [showKey, setShowKey]       = useState(false);
  const [keyStatus, setKeyStatus]   = useState(null); // null | 'testing' | 'ok' | 'bad'
  const [keyError,  setKeyError]    = useState('');
  // BYOK key UX state — Hugging Face
  const [showHfKey, setShowHfKey]     = useState(false);
  const [hfStatus,  setHfStatus]      = useState(null);
  const [hfError,   setHfError]       = useState('');

  const overlayRef    = useRef(null);
  const setHudEnabled = usePerfStore(st => st.setEnabled);
  const hudCurrentlyOn = usePerfStore(st => st.enabled);
  const setNavStyle = useSettingsStore(st => st.setNavStyle);
  const setTheme = useSettingsStore(st => st.setTheme);

  // Which reload-required settings were at page load
  const reloadKeys = useRef({ webgpu: s.webgpu, frameloop: s.frameloop, quality: s.quality });

  // ESC to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const set = (key, val) => {
    setS(prev => ({ ...prev, [key]: val }));
    if (['webgpu', 'frameloop', 'quality'].includes(key)) {
      const orig = reloadKeys.current;
      const changed = key === 'webgpu'    ? val !== orig.webgpu
                    : key === 'frameloop' ? val !== orig.frameloop
                    :                       val !== orig.quality;
      setDirty(changed);
    }
    // Reset key test status when key changes
    if (key === 'geminiKey') setKeyStatus(null);
    if (key === 'hfToken')   setHfStatus(null);
  };

  // Validate the key against the Gemini models list endpoint (no quota consumed)
  const testGeminiKey = async () => {
    const key = s.geminiKey.trim();
    if (!key) return;

    // Gemini API keys from AI Studio always start with "AIza"
    if (!key.startsWith('AIza')) {
      setKeyStatus('bad');
      setKeyError('Key format looks wrong. Gemini API keys from aistudio.google.com always start with "AIza". Make sure you\'re using a Gemini API Key, not a different Google credential.');
      return;
    }

    setKeyStatus('testing');
    setKeyError('');
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        setKeyStatus('ok');
      } else {
        const data = await res.json().catch(() => ({}));
        setKeyStatus('bad');
        setKeyError(data?.error?.message || `HTTP ${res.status}`);
      }
    } catch (err) {
      setKeyStatus('bad');
      setKeyError(err.message || 'Network error');
    }
  };

  // Validate HF token against the HF API whoami endpoint
  const testHfToken = async () => {
    const token = s.hfToken.trim();
    if (!token) return;
    if (!token.startsWith('hf_')) {
      setHfStatus('bad');
      setHfError('Hugging Face tokens always start with "hf_". Get one at huggingface.co/settings/tokens');
      return;
    }
    setHfStatus('testing');
    setHfError('');
    try {
      const res = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        setHfStatus('ok');
        setHfError(data?.name ? `Signed in as ${data.name}` : '');
      } else {
        setHfStatus('bad');
        setHfError(`HTTP ${res.status} — token may be invalid or expired`);
      }
    } catch (err) {
      setHfStatus('bad');
      setHfError(err.message || 'Network error');
    }
  };

  const handleSave = () => {
    // Renderer flags
    LS.set('ct_cad_webgpu',    s.webgpu    ? '1' : '0');
    LS.set('ct_cad_always',    s.frameloop === 'always' ? '1' : '0');
    LS.set('ct_cad_quality',   s.quality);

    // Zero-reload: HUD
    LS.set('ct_cad_perf', s.showStats ? '1' : '0');
    setHudEnabled(s.showStats);

    // 2D canvas defaults
    LS.set('ct_cad_snap',      s.snapToGrid ? 'true' : 'false');
    LS.set('ct_cad_grid_size', String(s.gridSize));

    // Backend override
    s.backendUrl.trim() ? LS.set('ct_cad_backend', s.backendUrl.trim()) : LS.del('ct_cad_backend');

    // AI defaults
    LS.set('ct_cad_ai_mode', s.aiMode);

    // Navigation style (gizmo widget + mouse controls). Applied live via the
    // settings store — no reload needed (the viewport subscribes to it).
    setNavStyle(s.navStyle);

    // Theme. Applied live via the settings store.
    setTheme(s.theme);
    LS.set('ct_cad_theme', s.theme);

    // BYOK Gemini key
    s.geminiKey.trim() ? LS.set('ct_cad_gemini_key', s.geminiKey.trim()) : LS.del('ct_cad_gemini_key');

    // BYOK Hugging Face token
    s.hfToken.trim() ? LS.set('ct_cad_hf_key', s.hfToken.trim()) : LS.del('ct_cad_hf_key');

    // Generic extras
    const { webgpu, frameloop, showStats, quality, snapToGrid, gridSize, backendUrl, aiMode, navStyle, theme, geminiKey, hfToken, ...extras } = s;
    LS.set('ct_cad_settings', JSON.stringify(extras));

    window.dispatchEvent(new CustomEvent('ct-settings-change', { detail: s }));

    if (dirty) {
      window.location.reload();
    } else {
      onClose();
    }
  };

  const handleReset = () => {
    setS({
      webgpu: false, frameloop: 'demand', showStats: false,
      quality: 'auto', snapToGrid: true, gridSize: 20,
      backendUrl: '', aiMode: '3d', navStyle: 'default', theme: 'system', geminiKey: '',
    });
    setDirty(true);
    setKeyStatus(null);
  };

  const onOverlayClick = (e) => { if (e.target === overlayRef.current) onClose(); };

  const keyHasValue = s.geminiKey.trim().length > 0;

  return (
    <div className="sd-overlay" ref={overlayRef} onClick={onOverlayClick}>
      <div className="sd-dialog" role="dialog" aria-modal="true" aria-label="Settings">

        {/* Header */}
        <div className="sd-header">
          <span className="sd-title">Settings</span>
          {dirty && <span className="sd-reload-badge">⚠ Reload required on Save</span>}
          <button className="sd-close" onClick={onClose} title="Close (ESC)"><FaTimes /></button>
        </div>

        {/* Body */}
        <div className="sd-body">

          {/* Vertical tabs */}
          <nav className="sd-tabs">
            {TABS.map(t => (
              <button key={t.id} className={`sd-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)} type="button">
                {t.icon}<span>{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Panels */}
          <div className="sd-panel">

            {/* ── Performance ──────────────────────────────────────────── */}
            {tab === 'performance' && (
              <div className="sd-section-group">
                <div className="sd-section-title">HUD &amp; Diagnostics</div>
                <Row label="Performance HUD"
                  hint="Show FPS, frame time, draw calls, triangle count in the status bar. Takes effect immediately — no reload needed.">
                  <Toggle value={s.showStats} onChange={v => set('showStats', v)} />
                </Row>
                {hudCurrentlyOn !== s.showStats && (
                  <p className="sd-inline-note">
                    {s.showStats ? '✓ HUD turns ON after Save (no reload).' : '✓ HUD turns OFF after Save (no reload).'}
                  </p>
                )}

                <div className="sd-section-title" style={{ marginTop: 20 }}>Render Quality</div>
                <Row label="Quality Preset"
                  hint="Overrides auto-detection. 'Auto' picks based on your GPU/CPU. Requires page reload.">
                  <Select value={s.quality} onChange={v => set('quality', v)} options={[
                    { value: 'auto',   label: 'Auto (device-detected)' },
                    { value: 'low',    label: 'Low — DPR 1×, no shadows, no AA' },
                    { value: 'medium', label: 'Medium — DPR 1.5×, no shadows, AA' },
                    { value: 'high',   label: 'High — DPR 2×, shadows, AA' },
                  ]} />
                </Row>

                <div className="sd-section-title" style={{ marginTop: 20 }}>Frame Loop</div>
                <Row label="Render Mode"
                  hint="'Power Saver' re-renders only when the scene changes. 'Always' renders every frame. Requires page reload.">
                  <Select value={s.frameloop} onChange={v => set('frameloop', v)} options={[
                    { value: 'demand', label: 'Power Saver — on interaction (default)' },
                    { value: 'always', label: 'Always — continuous render' },
                  ]} />
                </Row>

                <div className="sd-section-title" style={{ marginTop: 20 }}>Experimental</div>
                <Row label="WebGPU Renderer"
                  hint="Next-gen WebGPU API instead of WebGL 2. Auto-fallback on unsupported devices. Requires reload.">
                  <Toggle value={s.webgpu} onChange={v => set('webgpu', v)} />
                </Row>
                {s.webgpu && (
                  <p className="sd-inline-note">
                    ⚠ WebGPU is experimental. If the viewport goes blank, disable this setting and reload.
                  </p>
                )}
              </div>
            )}

            {/* ── CAD ──────────────────────────────────────────────────── */}
            {tab === 'cad' && (
              <div className="sd-section-group">
                <div className="sd-section-title">Interface Theme</div>
                <Row label="Theme Preset"
                  hint="Sets the editor visual style (requires no reload).">
                  <Select value={s.theme} onChange={v => set('theme', v)} options={[
                    { value: 'system', label: 'Default (System Auto-Detect)' },
                    { value: 'dark',   label: 'Dark Mode (Black & White)' },
                    { value: 'light',  label: 'White Mode (SolidWorks Default)' },
                  ]} />
                </Row>

                <div className="sd-section-title" style={{ marginTop: 20 }}>3D Navigation</div>
                <Row label="Navigation Style"
                  hint="Sets the viewport gizmo + mouse controls. Applies immediately — no reload.">
                  <Select value={s.navStyle} onChange={v => set('navStyle', v)} options={[
                    { value: 'default',    label: 'Default — ViewCube (top-right) + left-drag orbit' },
                    { value: 'solidworks', label: 'SolidWorks — Reference Triad, middle-drag rotate' },
                    { value: 'blender',    label: 'Blender — axis gizmo, middle-drag orbit' },
                  ]} />
                </Row>
                {(s.navStyle === 'solidworks' || s.navStyle === 'blender') && (
                  <p className="sd-inline-note">
                    ⚠ This style rotates with the <strong>middle mouse button</strong> and reserves
                    left-click for selection — a mouse (not just a trackpad) is recommended. Choose
                    “Default” for left-drag orbit on laptops.
                  </p>
                )}

                <div className="sd-section-title" style={{ marginTop: 20 }}>2D Sketch Defaults</div>
                <Row label="Snap to Grid"
                  hint="Default state of the Snap to Grid checkbox. Can still be toggled per-session.">
                  <Toggle value={s.snapToGrid} onChange={v => set('snapToGrid', v)} />
                </Row>
                <Row label="Grid Size" hint="Canvas grid step in pixels. Takes effect on next 2D canvas mount.">
                  <Slider value={s.gridSize} onChange={v => set('gridSize', v)} min={5} max={80} step={5} unit="px" />
                </Row>

                <div className="sd-section-title" style={{ marginTop: 20 }}>Backend</div>
                <Row label="API URL Override"
                  hint="Point at a self-hosted backend without rebuilding. Leave blank to use the default.">
                  <input className="sd-text-input" type="url" value={s.backendUrl}
                    onChange={e => set('backendUrl', e.target.value)}
                    placeholder="https://chaintorque-backend.onrender.com" />
                </Row>
                {s.backendUrl.trim() && (
                  <p className="sd-inline-note">✓ Override active: <code>{s.backendUrl}</code></p>
                )}
              </div>
            )}

            {/* ── AI ───────────────────────────────────────────────────── */}
            {tab === 'ai' && (
              <div className="sd-section-group">
                <div className="sd-section-title">Torquy CAD Assistant</div>
                <Row label="Default Generation Mode"
                  hint="Whether Torquy generates 3D solids or 2D sketches by default. Can be changed per-session in the AI panel.">
                  <Select value={s.aiMode} onChange={v => set('aiMode', v)} options={[
                    { value: '3d', label: '3D Solid (default)' },
                    { value: '2d', label: '2D Sketch' },
                  ]} />
                </Row>
                <p className="sd-hint-text">
                  Torquy is powered by <strong>Gemini 3.5 Flash</strong>. Add your own API key in the <em>API Keys</em> tab to use your own quota.
                </p>
              </div>
            )}

            {/* ── API Keys (BYOK) ──────────────────────────────────────── */}
            {tab === 'api_keys' && (
              <div className="sd-section-group">
                <div className="sd-section-title">Bring Your Own Key (BYOK)</div>

                {/* Key status banner */}
                <div className={`sd-byok-banner ${keyHasValue ? 'active' : ''}`}>
                  {keyHasValue ? (
                    <>
                      <span className="sd-byok-dot active" />
                      <span>Using <strong>your own Gemini API key</strong> for Torquy AI</span>
                    </>
                  ) : (
                    <>
                      <span className="sd-byok-dot" />
                      <span>Using <strong>server's shared key</strong> for Torquy AI</span>
                    </>
                  )}
                </div>

                <div className="sd-section-title" style={{ marginTop: 18 }}>Google Gemini API Key</div>
                <p className="sd-hint-text" style={{ marginTop: 0, marginBottom: 12 }}>
                  Torquy runs on <strong>Gemini 3.5 Flash</strong>. Your key is stored only in your browser's
                  localStorage and sent directly to the backend with each request — it is never stored
                  server-side and never logged. Get a free key at{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                    aistudio.google.com
                  </a>.
                </p>

                {/* Key input row */}
                <div className="sd-key-row">
                  <div className="sd-key-input-wrap">
                    <input
                      className="sd-text-input sd-key-input"
                      type={showKey ? 'text' : 'password'}
                      value={s.geminiKey}
                      onChange={e => set('geminiKey', e.target.value)}
                      placeholder="AIza..."
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button className="sd-key-reveal" onClick={() => setShowKey(v => !v)} type="button"
                      title={showKey ? 'Hide key' : 'Show key'}>
                      {showKey ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <button
                    className={`sd-btn-test ${keyStatus === 'ok' ? 'ok' : keyStatus === 'bad' ? 'bad' : ''}`}
                    onClick={testGeminiKey}
                    type="button"
                    disabled={!keyHasValue || keyStatus === 'testing'}
                  >
                    {keyStatus === 'testing' ? 'Testing…'
                      : keyStatus === 'ok'   ? '✓ Valid'
                      : keyStatus === 'bad'  ? '✗ Invalid'
                      : 'Test Key'}
                  </button>
                </div>

                {/* Inline feedback */}
                {keyStatus === 'ok' && (
                  <p className="sd-inline-note">✓ Key is valid. Torquy will use your quota after Save.</p>
                )}
                {keyStatus === 'bad' && (
                  <p className="sd-inline-note" style={{ color: '#f87171', background: 'hsl(0 40% 10% / 0.6)', borderColor: '#7f1d1d' }}>
                    ✗ Key rejected: {keyError}
                  </p>
                )}
                {keyHasValue && (
                  <button className="sd-link" style={{ marginTop: 8 }}
                    onClick={() => { set('geminiKey', ''); setKeyStatus(null); }} type="button">
                    Remove key (revert to server key)
                  </button>
                )}

                {/* ── Hugging Face Token ── */}
                <div className="sd-section-title" style={{ marginTop: 28 }}>Hugging Face Token</div>
                <p className="sd-hint-text" style={{ marginTop: 0, marginBottom: 12 }}>
                  <strong>Image to 3D</strong> uses Hunyuan3D-2 via a Hugging Face Space.
                  Add your own token to use your own HF quota. Get a free token at{' '}
                  <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer">
                    huggingface.co/settings/tokens
                  </a>{' '}(needs at least <em>read</em> access).
                </p>

                <div className="sd-key-row">
                  <div className="sd-key-input-wrap">
                    <input
                      className="sd-text-input sd-key-input"
                      type={showHfKey ? 'text' : 'password'}
                      value={s.hfToken}
                      onChange={e => set('hfToken', e.target.value)}
                      placeholder="hf_..."
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button className="sd-key-reveal" onClick={() => setShowHfKey(v => !v)} type="button"
                      title={showHfKey ? 'Hide token' : 'Show token'}>
                      {showHfKey ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <button
                    className={`sd-btn-test ${hfStatus === 'ok' ? 'ok' : hfStatus === 'bad' ? 'bad' : ''}`}
                    onClick={testHfToken}
                    type="button"
                    disabled={!s.hfToken.trim() || hfStatus === 'testing'}
                  >
                    {hfStatus === 'testing' ? 'Testing…'
                      : hfStatus === 'ok'   ? '✓ Valid'
                      : hfStatus === 'bad'  ? '✗ Invalid'
                      : 'Test Token'}
                  </button>
                </div>

                {hfStatus === 'ok' && (
                  <p className="sd-inline-note">✓ {hfError || 'Token valid. Image to 3D will use your quota after Save.'}</p>
                )}
                {hfStatus === 'bad' && (
                  <p className="sd-inline-note" style={{ color: '#f87171', background: 'hsl(0 40% 10% / 0.6)', borderColor: '#7f1d1d' }}>
                    ✗ {hfError}
                  </p>
                )}
                {s.hfToken.trim() && (
                  <button className="sd-link" style={{ marginTop: 8 }}
                    onClick={() => { set('hfToken', ''); setHfStatus(null); }} type="button">
                    Remove token (revert to server token)
                  </button>
                )}

                <div className="sd-section-title" style={{ marginTop: 24 }}>Privacy &amp; Security</div>
                <ul className="sd-byok-list">
                  <li>Keys are stored in <code>localStorage</code> on this device only.</li>
                  <li>Gemini key is sent to the ChainTorque backend in each Torquy request (HTTPS only).</li>
                  <li>HF token is sent to the backend in each Image-to-3D request (HTTPS only).</li>
                  <li>The backend uses keys for that request only — no logging, no DB storage.</li>
                  <li>Clearing browser storage removes all keys instantly.</li>
                </ul>
              </div>
            )}

            {/* ── Shortcuts ────────────────────────────────────────────── */}
            {tab === 'shortcuts' && (
              <div className="sd-section-group">
                <div className="sd-section-title">Keyboard Shortcuts</div>
                <table className="sd-shortcuts-table">
                  <tbody>
                    {SHORTCUTS.map(({ keys, action }) => (
                      <tr key={keys}>
                        <td><kbd>{keys}</kbd></td>
                        <td>{action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="sd-hint-text">Shortcut remapping coming in a future update.</p>
              </div>
            )}

            {/* ── About ────────────────────────────────────────────────── */}
            {tab === 'about' && (
              <div className="sd-section-group sd-about">
                <div className="sd-about-logo">⚙️🔗</div>
                <h2 className="sd-about-name">ChainTorque CAD</h2>
                <p className="sd-about-tagline">Browser-Based CAD Editor · Web3 Engineering Platform</p>
                <div className="sd-about-grid">
                  <div className="sd-about-card">
                    <span className="sd-about-card-label">CAD Kernel</span>
                    <span className="sd-about-card-val">OpenCascade.js 1.1.1</span>
                  </div>
                  <div className="sd-about-card">
                    <span className="sd-about-card-label">AI Model</span>
                    <span className="sd-about-card-val">Gemini 2.5 Flash</span>
                  </div>
                  <div className="sd-about-card">
                    <span className="sd-about-card-label">Renderer</span>
                    <span className="sd-about-card-val">Three.js r179</span>
                  </div>
                  <div className="sd-about-card">
                    <span className="sd-about-card-label">React</span>
                    <span className="sd-about-card-val">19 + Vite 6</span>
                  </div>
                  <div className="sd-about-card">
                    <span className="sd-about-card-label">Blockchain</span>
                    <span className="sd-about-card-val">Sepolia Testnet</span>
                  </div>
                </div>
                <div className="sd-about-links">
                  <a href="https://github.com/Dealer-09/Chain-Torque" target="_blank" rel="noreferrer">GitHub</a>
                  <span>·</span>
                  <a href="https://github.com/Dealer-09/Chain-Torque/blob/main/README.md" target="_blank" rel="noreferrer">Docs</a>
                  <span>·</span>
                  <a href="https://github.com/Dealer-09/Chain-Torque/issues" target="_blank" rel="noreferrer">Report a Bug</a>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="sd-footer">
          <button className="sd-btn-ghost" onClick={handleReset} type="button">Reset to Defaults</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="sd-btn-ghost" onClick={onClose} type="button">Cancel</button>
            <button className="sd-btn-primary" onClick={handleSave} type="button">
              {dirty ? '💾 Save & Reload' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
