import { useState } from 'react';
import type { EngineOptions, GameSnapshot } from '../engine/GameEngine';

interface PerfPanelProps {
  snapshot: GameSnapshot;
  onOption: (key: keyof EngineOptions, value: boolean) => void;
  onStressTest: () => void;
  onRecord: () => void;
}

export function PerfPanel({ snapshot, onOption, onStressTest, onRecord }: PerfPanelProps) {
  const p = snapshot.perf;
  const bench = snapshot.benchmark;
  const [copied, setCopied] = useState(false);
  const fpsColor = p.fps >= 45 ? 'text-emerald-400' : p.fps >= 30 ? 'text-amber-300' : 'text-red-400';
  return (
    <div className="absolute top-2 left-2 z-10 w-60 rounded-md bg-black/75 px-3 py-2 font-mono text-[11px] leading-relaxed text-white/80 backdrop-blur">
      <Row label="FPS" value={<span className={`text-base font-bold ${fpsColor}`}>{p.fps.toFixed(0)}</span>} />
      <Row label="Frame" value={`${p.frameMs.toFixed(1)} ms`} />
      <Row label="p95" value={`${p.p95FrameMs.toFixed(1)} ms`} />
      <Row label=">33ms" value={`${p.slowFramePct.toFixed(1)} %`} />
      <Row label="Sim" value={`${p.simMs.toFixed(2)} ms`} />
      <Row label="Render" value={`${p.renderMs.toFixed(2)} ms`} />
      <Row label="Enemies" value={snapshot.enemyCount.toLocaleString()} />
      <Row label="Towers" value={snapshot.towerCount} />
      <Row label="Proj." value={snapshot.projectileCount.toLocaleString()} />
      {p.heapMb !== null && <Row label="Heap" value={`${p.heapMb.toFixed(1)} MB`} />}

      <div className="mt-2 border-t border-white/10 pt-2">
        <Toggle label="Spatial grid" checked={snapshot.options.spatialGrid} onChange={(v) => onOption('spatialGrid', v)} />
        <Toggle label="Object pooling" checked={snapshot.options.pooling} onChange={(v) => onOption('pooling', v)} />
        <Toggle label="Batched render" checked={snapshot.options.batchedRender} onChange={(v) => onOption('batchedRender', v)} />
      </div>

      <div className="mt-2 flex gap-1.5 border-t border-white/10 pt-2 font-sans">
        <button onClick={onStressTest} className="flex-1 rounded bg-red-500/80 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500">
          Stress test
        </button>
        <button
          onClick={onRecord}
          disabled={bench.stage !== 'idle'}
          className="flex-1 rounded bg-sky-500/80 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {bench.stage === 'idle' ? 'Record 20s' : `${bench.stage} ${Math.ceil(bench.secondsLeft)}s`}
        </button>
      </div>
      {bench.lastRow && (
        <button
          onClick={() => {
            navigator.clipboard?.writeText(bench.lastRow ?? '').then(() => setCopied(true));
          }}
          className="mt-2 block w-full rounded bg-white/5 p-1.5 text-left text-[10px] break-all text-white/70 hover:bg-white/10"
          title="Copy NUMBERS.md row"
        >
          {copied ? '✓ copied' : 'Click to copy row:'} {bench.lastRow}
        </button>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-0.5">
      <span className={checked ? 'text-emerald-300' : 'text-white/60'}>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-emerald-400" />
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/45">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
