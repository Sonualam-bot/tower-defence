import type { GameSnapshot } from '../engine/GameEngine';

export function PerfPanel({ snapshot }: { snapshot: GameSnapshot }) {
  const p = snapshot.perf;
  const fpsColor = p.fps >= 45 ? 'text-emerald-400' : p.fps >= 30 ? 'text-amber-300' : 'text-red-400';
  return (
    <div className="pointer-events-none absolute top-2 left-2 rounded-md bg-black/70 px-3 py-2 font-mono text-[11px] leading-relaxed text-white/80 backdrop-blur">
      <Row label="FPS" value={<span className={fpsColor}>{p.fps.toFixed(0)}</span>} />
      <Row label="Frame" value={`${p.frameMs.toFixed(1)} ms`} />
      <Row label="p95" value={`${p.p95FrameMs.toFixed(1)} ms`} />
      <Row label=">33ms" value={`${p.slowFramePct.toFixed(1)} %`} />
      <Row label="Sim" value={`${p.simMs.toFixed(2)} ms`} />
      <Row label="Render" value={`${p.renderMs.toFixed(2)} ms`} />
      <Row label="Enemies" value={snapshot.enemyCount.toLocaleString()} />
      <Row label="Towers" value={snapshot.towerCount} />
      <Row label="Proj." value={snapshot.projectileCount.toLocaleString()} />
      {p.heapMb !== null && <Row label="Heap" value={`${p.heapMb.toFixed(1)} MB`} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/45">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
