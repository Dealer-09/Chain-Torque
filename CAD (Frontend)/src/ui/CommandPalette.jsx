// src/ui/CommandPalette.jsx
// Blender-style Ctrl/Cmd+K command palette. Self-contained: manages its own
// open state and key listener. Receives a flat command list from App and runs
// the selected command's action. Discoverability for the growing toolset.

import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function CommandPalette({ commands = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  // Ctrl/Cmd+K toggles the palette (ignored while typing in a field)
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        const tag = e.target?.tagName;
        const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
        // Allow toggle even from inputs except our own (handled below)
        if (!typing || e.target === inputRef.current) {
          e.preventDefault();
          setOpen((v) => !v);
        }
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || (c.hint || '').toLowerCase().includes(q));
  }, [query, commands]);

  if (!open) return null;

  const run = (cmd) => {
    setOpen(false);
    if (cmd?.action) Promise.resolve().then(cmd.action);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(filtered[active]); }
  };

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '14vh',
        zIndex: 5500,
      }}
    >
      <div
        style={{
          width: 'min(560px, 92vw)',
          background: 'rgba(30,33,42,0.99)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 16px 50px rgba(0,0,0,0.55)',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={onKeyDown}
          placeholder="Type a command…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '14px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(80,84,96,0.5)',
            color: '#fff',
            fontSize: 15,
            outline: 'none',
          }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 16, color: '#888', fontSize: 13 }}>No matching commands</div>
          ) : (
            filtered.map((cmd, i) => (
              <div
                key={cmd.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(cmd)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  background: i === active ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: i === active ? '#fff' : '#cfcfcf',
                  fontSize: 13.5,
                }}
              >
                <span>{cmd.label}</span>
                {cmd.hint && (
                  <span style={{ fontSize: 11, color: '#777', marginLeft: 12 }}>{cmd.hint}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
