// Compact perf readout for the status bar. Renders nothing unless the HUD is enabled
// (dev, or localStorage 'ct_cad_perf' === '1'). Replaces the old hardcoded "FPS: 60".
import { usePerfStore } from './perfStore';

export default function StatsOverlay() {
  const enabled = usePerfStore((s) => s.enabled);
  const fps = usePerfStore((s) => s.fps);
  const ms = usePerfStore((s) => s.ms);
  const calls = usePerfStore((s) => s.calls);
  const tris = usePerfStore((s) => s.tris);
  const geometries = usePerfStore((s) => s.geometries);
  const textures = usePerfStore((s) => s.textures);

  if (!enabled) return null;

  return (
    <span className="perf-hud" style={{ fontVariantNumeric: 'tabular-nums', color: '#8aa' }}>
      FPS: {fps} | {ms}ms | draws: {calls} | tris: {tris.toLocaleString()} | geo: {geometries} | tex: {textures}
    </span>
  );
}
