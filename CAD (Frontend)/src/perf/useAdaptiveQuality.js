// Probes device capability once and returns clamped render-quality settings so the
// viewport stays light on low-end devices (Chromebooks, integrated GPUs, low RAM).
// A manual quality override ('low'|'medium'|'high') stored in localStorage
// 'ct_cad_quality' supersedes the auto-detection result. 'auto' or absent = auto.
import { useMemo } from 'react';

function detectLowEnd() {
  if (typeof navigator === 'undefined') return false;

  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4; // GB (Chromium only; undefined elsewhere → 4)

  let lowEnd = cores <= 4 || mem <= 4;

  // GPU renderer-string heuristic (best-effort; not all browsers expose it).
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      if (/swiftshader|software|llvmpipe|mali|adreno 3|adreno 4|intel.*hd graphics (4|5)/i.test(renderer)) {
        lowEnd = true;
      }
      // Release the probe context promptly.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    /* ignore probe failures */
  }

  return lowEnd;
}

// Map a preset string to concrete Canvas props.
// Exported so SettingsDialog can show a human-readable description of each tier.
export const QUALITY_PRESETS = {
  low:    { dpr: [1, 1],   shadows: false, antialias: false },
  medium: { dpr: [1, 1.5], shadows: false, antialias: true  },
  high:   { dpr: [1, 2],   shadows: true,  antialias: true  },
};

export function useAdaptiveQuality() {
  return useMemo(() => {
    const override = typeof window !== 'undefined'
      ? window.localStorage?.getItem('ct_cad_quality')
      : null;

    if (override && QUALITY_PRESETS[override]) {
      return { lowEnd: override === 'low', ...QUALITY_PRESETS[override] };
    }

    // Auto-detect
    const lowEnd = detectLowEnd();
    return {
      lowEnd,
      dpr: lowEnd ? [1, 1] : [1, 1.5],
      shadows: !lowEnd,
      antialias: !lowEnd,
    };
  }, []);
}
