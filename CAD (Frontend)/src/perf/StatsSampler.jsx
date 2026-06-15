// Samples real renderer stats from inside the R3F Canvas and pushes them to perfStore.
// Must be rendered as a child of <Canvas>. Renders nothing.
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePerfStore } from './perfStore';

export default function StatsSampler() {
  const gl = useThree((s) => s.gl);
  const enabled = usePerfStore((s) => s.enabled);
  const setStats = usePerfStore((s) => s.setStats);
  const acc = useRef({ frames: 0, last: performance.now() });

  useFrame(() => {
    if (!enabled) return;
    const a = acc.current;
    a.frames += 1;
    const now = performance.now();
    const elapsed = now - a.last;
    if (elapsed >= 500) {
      const info = gl.info;
      setStats({
        fps: Math.round((a.frames * 1000) / elapsed),
        ms: Number((elapsed / a.frames).toFixed(1)),
        calls: info.render.calls,
        tris: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs ? info.programs.length : 0,
      });
      a.frames = 0;
      a.last = now;
    }
  });

  // When the 3D canvas unmounts (e.g. switching to 2D), clear stale numbers.
  useEffect(() => () => usePerfStore.getState().reset(), []);

  return null;
}
