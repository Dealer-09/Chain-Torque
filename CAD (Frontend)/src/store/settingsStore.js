// src/store/settingsStore.js
// Small, live (no-reload) settings store for viewport preferences that need to be
// reactive in the React tree. Mirrors the perfStore.js pattern: a plain zustand
// store whose actions persist to localStorage themselves (no persist middleware).
//
// Holds the navigation-style preset (Default / SolidWorks / Blender) and theme style.

import { create } from 'zustand';
import { getNavPreset } from '../three/navPresets';

const NAV_KEY = 'ct_cad_nav_style';
const THEME_KEY = 'ct_cad_theme';

const readNavStyle = () => {
  try {
    if (typeof window === 'undefined') return 'default';
    // Normalize through getNavPreset so an unknown/stale value falls back safely.
    return getNavPreset(window.localStorage?.getItem(NAV_KEY)).id;
  } catch {
    return 'default';
  }
};

const readTheme = () => {
  try {
    if (typeof window === 'undefined') return 'system';
    return window.localStorage?.getItem(THEME_KEY) || 'system';
  } catch {
    return 'system';
  }
};

export const useSettingsStore = create((set) => ({
  navStyle: readNavStyle(),
  theme: readTheme(),
  setNavStyle: (val) => {
    const id = getNavPreset(val).id;
    try { localStorage.setItem(NAV_KEY, id); } catch {}
    set({ navStyle: id });
  },
  setTheme: (val) => {
    try { localStorage.setItem(THEME_KEY, val); } catch {}
    set({ theme: val });
  },
}));

