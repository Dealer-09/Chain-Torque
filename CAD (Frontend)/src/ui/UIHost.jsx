// src/ui/UIHost.jsx
// Renders the toast stack and the active modal dialog driven by uiStore.
// Mounted once near the App root. Replaces native prompt/alert/confirm UI.

import React, { useEffect, useRef, useState } from 'react';
import { useUIStore } from './uiStore';

const TYPE_COLORS = {
  info: { border: 'rgba(255,255,255,0.2)', accent: '#cccccc' },
  success: { border: 'rgba(78,205,196,0.6)', accent: '#4ecdc4' },
  warning: { border: 'rgba(255,193,7,0.6)', accent: '#ffc107' },
  error: { border: 'rgba(220,38,38,0.6)', accent: '#ff6b6b' },
};

function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 48,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 4000,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const c = TYPE_COLORS[t.type] || TYPE_COLORS.info;
        return (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              minWidth: 220,
              maxWidth: 360,
              background: 'rgba(28,30,38,0.97)',
              border: `1px solid ${c.border}`,
              borderLeft: `3px solid ${c.accent}`,
              borderRadius: 6,
              padding: '10px 14px',
              color: '#e6e6e6',
              fontSize: 13,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

function Dialog() {
  const dialog = useUIStore((s) => s.dialog);
  const resolveDialog = useUIStore((s) => s.resolveDialog);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (dialog?.type === 'prompt') {
      setValue(dialog.defaultValue || '');
      // focus shortly after mount
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [dialog]);

  if (!dialog) return null;

  const accept = () => resolveDialog(dialog.type === 'prompt' ? value : true);
  const cancel = () => resolveDialog(dialog.type === 'prompt' ? null : false);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); accept(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
      }}
    >
      <div
        onKeyDown={onKeyDown}
        style={{
          width: 'min(420px, 92vw)',
          background: 'rgba(32,35,44,0.99)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 10,
          padding: 20,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#fff' }}>{dialog.title}</h3>
        {dialog.message && (
          <p style={{ margin: '0 0 14px 0', fontSize: 13, color: '#b8b8b8', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
            {dialog.message}
          </p>
        )}
        {dialog.type === 'prompt' && (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 10px',
              marginBottom: 16,
              background: 'rgba(20,22,28,0.9)',
              border: '1px solid #444',
              borderRadius: 6,
              color: '#fff',
              fontSize: 14,
            }}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={cancel}
            style={{
              padding: '8px 16px',
              background: 'rgba(60,64,72,0.8)',
              border: '1px solid rgba(90,90,100,0.5)',
              borderRadius: 6,
              color: '#ccc',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {dialog.cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={accept}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              border: '1px solid #ffffff',
              borderRadius: 6,
              color: '#000000',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {dialog.confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UIHost() {
  return (
    <>
      <Toasts />
      <Dialog />
    </>
  );
}
