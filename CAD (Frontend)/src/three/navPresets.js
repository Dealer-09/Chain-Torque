// src/three/navPresets.js
// Navigation-style presets. Each preset bundles the on-screen navigation gizmo
// AND the OrbitControls mouse-drag behavior, so a user coming from a given tool
// feels at home. Selected in Settings -> CAD -> 3D Navigation and stored in
// localStorage 'ct_cad_nav_style' (see settingsStore.js); ThreeViewer reads it live.
//
// Widget choices, grounded in how the real tools actually navigate:
//   - SolidWorks: NO ViewCube (that's an Autodesk/Fusion/Inventor widget). SW uses
//     the interactive *Reference Triad* in the lower-left — click X/Y/Z to look
//     normal to that axis (Right/Top/Front), click again to flip 180 deg. drei's
//     <GizmoViewport> IS a clickable axis triad, so that's the faithful match,
//     placed bottom-left like SW. (SW's cube-ish tool is the transient Ctrl+Space
//     View Selector around the model — not a persistent corner widget.)
//   - Blender: lower-left axis gizmo too; click an axis to align.
//   - Default: a friendly labeled ViewCube (faces/edges/corners all clickable) as
//     an approachable, recognizable affordance for newcomers, top-right.
//
// OrbitControls limitation: it maps ONE action per mouse button with no modifier
// combos, so Blender's Shift+MMB-pan can't be reproduced — RIGHT=pan is the web
// concession. Touch mapping is intentionally left at the drei default for every
// preset (one-finger rotate) so trackpad/mobile never breaks; only the mouse LEFT
// binding changes between presets.

import { MOUSE } from 'three';

// Color theme for the Default-preset <GizmoViewcube>.
const CUBE_DARK = {
  color: '#2d2d2d',
  hoverColor: '#4ea1ff',
  textColor: '#ffffff',
  strokeColor: '#555555',
  opacity: 0.95,
};

// Axis triad colors (X red, Y green, Z blue) — SolidWorks/Blender convention.
const TRIAD_AXIS_COLORS = ['#ff3653', '#3dd957', '#2c7fff'];

// LEFT unbound (null) leaves left-click free for selection. Selection is handled
// by R3F pointer events independent of OrbitControls, and dragging the gizmo
// itself orbits regardless of this mapping.
const MB_DEFAULT = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
const MB_PRO = { LEFT: null, MIDDLE: MOUSE.ROTATE, RIGHT: MOUSE.PAN };

export const NAV_PRESETS = {
  // Beginner-friendly + the only laptop/trackpad-safe preset (left-drag orbits,
  // no middle button required). Labeled ViewCube top-right for easy view-snapping.
  default: {
    id: 'default',
    label: 'Default',
    gizmo: 'cube',
    gizmoAlignment: 'top-right',
    cubeTheme: CUBE_DARK,
    axisColors: TRIAD_AXIS_COLORS,
    mouseButtons: MB_DEFAULT,
    enableDamping: true,
    dampingFactor: 0.08,
    zoomToCursor: true,
  },
  // Faithful SolidWorks feel: middle-drag rotates, right-drag pans, left selects;
  // snappy (no inertia). Interactive Reference Triad in the lower-left.
  solidworks: {
    id: 'solidworks',
    label: 'SolidWorks',
    gizmo: 'solidworks',
    gizmoAlignment: 'bottom-left',
    cubeTheme: CUBE_DARK,
    axisColors: TRIAD_AXIS_COLORS,
    mouseButtons: MB_PRO,
    enableDamping: false,
    dampingFactor: 0,
    zoomToCursor: true,
  },
  // Blender feel: middle-drag orbits, right-drag pans, left selects; smooth
  // inertia, axis-triad gizmo (lower-left), zoom toward target (not cursor).
  blender: {
    id: 'blender',
    label: 'Blender',
    gizmo: 'viewport',
    gizmoAlignment: 'bottom-left',
    cubeTheme: CUBE_DARK,
    axisColors: TRIAD_AXIS_COLORS,
    mouseButtons: MB_PRO,
    enableDamping: true,
    dampingFactor: 0.1,
    zoomToCursor: false,
  },
};

// Safe lookup with fallback to the default preset.
export function getNavPreset(id) {
  return NAV_PRESETS[id] || NAV_PRESETS.default;
}
