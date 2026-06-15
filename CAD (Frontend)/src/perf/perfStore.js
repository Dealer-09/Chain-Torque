// Lightweight perf-stats store (separate from the future document store).
// A sampler inside the R3F Canvas writes real numbers here; the statusbar reads them.
import { create } from 'zustand';

const hudEnabled = () => {
  try {
    if (typeof window === 'undefined') return false;
    // Ships OFF: on in dev, or when explicitly opted-in via localStorage flag.
    if (window.localStorage?.getItem('ct_cad_perf') === '1') return true;
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
};

const EMPTY = { fps: 0, ms: 0, calls: 0, tris: 0, geometries: 0, textures: 0, programs: 0 };

export const usePerfStore = create((set) => ({
  enabled: hudEnabled(),
  ...EMPTY,
  setStats: (stats) => set(stats),
  reset: () => set({ ...EMPTY }),
  // Toggle at runtime (Settings dialog). Also persists to localStorage so it
  // survives a reload (consistent with the existing ct_cad_perf convention).
  setEnabled: (val) => {
    try { localStorage.setItem('ct_cad_perf', val ? '1' : '0'); } catch {}
    set({ enabled: val });
  },
}));
