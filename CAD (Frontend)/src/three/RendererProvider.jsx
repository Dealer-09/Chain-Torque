// src/three/RendererProvider.jsx
// Centralizes the <Canvas> renderer configuration in one place. WebGL2 is the
// universal baseline; WebGPU is a gated, reversible progressive enhancement:
//
//   - Default: a plain gl options object -> R3F builds a WebGLRenderer (byte
//     identical to the pre-Phase-8 behavior).
//   - Opt-in: when the device exposes navigator.gpu AND the flag
//     localStorage 'ct_cad_webgpu' === '1', gl becomes an async factory that
//     constructs a three WebGPURenderer (lazy-imported so the WebGPU code only
//     loads when asked for) and awaits init(). R3F v9 awaits this factory.
//   - If WebGPU init throws, we fall back to a WebGLRenderer in-place, so a
//     capable-looking-but-broken device still renders.
//
// WebGPU stays off by default because it's still immature on many low-end
// targets (Chromebooks) — exactly the devices we must not regress.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { WebGLRenderer } from 'three';
import { getCapabilities } from './capabilities';

const RendererContext = createContext(getCapabilities());

// Read renderer capabilities from anywhere outside the Canvas tree.
export function useRendererCapabilities() {
  return useContext(RendererContext);
}

// Opt-in flag, mirroring the existing 'ct_cad_always' frameloop escape hatch.
export function webgpuRequested() {
  return (
    typeof window !== 'undefined' &&
    window.localStorage?.getItem('ct_cad_webgpu') === '1'
  );
}

// fov 45 ~= a 50mm lens (Blender/SolidWorks default range). 75 was a wide-angle
// fish-eye that exaggerated perspective and made the workspace feel "off".
const DEFAULT_CAMERA = { position: [8, 8, 8], fov: 45, near: 0.1, far: 5000 };
const DEFAULT_BACKGROUND = 'linear-gradient(to bottom, #2d2d2d 0%, #1a1a1a 100%)';

export default function RendererProvider({
  children,
  frameloop = 'demand',
  quality, // { dpr, shadows, antialias } from useAdaptiveQuality
  camera = DEFAULT_CAMERA,
  background = DEFAULT_BACKGROUND,
  style,
  onPointerMissed,
}) {
  const capabilities = useMemo(() => getCapabilities(), []);
  const antialias = quality?.antialias ?? true;

  // Decide once per mount whether to attempt WebGPU.
  const useWebGPU = useMemo(
    () => capabilities.webgpuAvailable && webgpuRequested(),
    [capabilities]
  );

  // Track what we actually ended up on (for the context value / HUD).
  const [activeRenderer, setActiveRenderer] = useState(useWebGPU ? 'webgpu' : 'webgl2');

  useEffect(() => {
    if (capabilities.webgpuAvailable && !useWebGPU) {
      console.info(
        "[renderer] WebGPU available but disabled. Enable with localStorage.setItem('ct_cad_webgpu','1') then reload."
      );
    }
  }, [capabilities, useWebGPU]);

  // The gl prop: a plain options object (WebGL2) or an async factory (WebGPU).
  const gl = useMemo(() => {
    const baseOpts = {
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
      antialias,
    };

    if (!useWebGPU) return baseOpts;

    // Async factory — R3F v9 awaits the returned renderer.
    return async (props) => {
      try {
        const { WebGPURenderer } = await import('three/webgpu');
        const renderer = new WebGPURenderer({ ...props, ...baseOpts });
        await renderer.init();
        console.info('[renderer] WebGPU renderer initialized.');
        return renderer;
      } catch (err) {
        console.warn('[renderer] WebGPU init failed — falling back to WebGL2.', err);
        setActiveRenderer('webgl2');
        return new WebGLRenderer({ ...props, ...baseOpts });
      }
    };
  }, [useWebGPU, antialias]);

  const contextValue = useMemo(
    () => ({ ...capabilities, active: activeRenderer }),
    [capabilities, activeRenderer]
  );

  return (
    <RendererContext.Provider value={contextValue}>
      <Canvas
        frameloop={frameloop}
        camera={camera}
        shadows={quality?.shadows ?? true}
        dpr={quality?.dpr ?? [1, 2]}
        gl={gl}
        style={{ background, ...style }}
        onPointerMissed={onPointerMissed}
      >
        {children}
      </Canvas>
    </RendererContext.Provider>
  );
}
