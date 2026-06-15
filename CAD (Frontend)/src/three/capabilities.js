// src/three/capabilities.js
// Renderer capability detection. Currently informational — WebGL2 is the
// universal baseline. Phase 8 will consult webgpuAvailable to optionally select
// a WebGPURenderer. Detection is done once and cached (it's static per device).

let _caps = null;

function detect() {
  const webgpuAvailable =
    typeof navigator !== 'undefined' && typeof navigator.gpu !== 'undefined';

  let webgl2Available = false;
  try {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      webgl2Available = !!canvas.getContext('webgl2');
    }
  } catch {
    webgl2Available = false;
  }

  return {
    webgpuAvailable,
    webgl2Available,
    // The renderer actually in use. WebGL2 until Phase 8 flips this on capable
    // devices behind a flag.
    active: 'webgl2',
  };
}

export function getCapabilities() {
  if (!_caps) _caps = detect();
  return _caps;
}

export default getCapabilities;
