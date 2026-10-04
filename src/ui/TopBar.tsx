import type { Speed } from '../engine/types';

interface TopBarProps {
  baseHealth: number;
  maxHealth: number;
  wave: number;
  totalWaves: number;
  countdown: number;
  money: number;
  score: number;
  speed: Speed;
  paused: boolean;
  canCallWave: boolean;
  onPause: () => void;
  onSpeed: (speed: Speed) => void;
  onRestart: () => void;
  onCallWave: () => void;
}

const SPEEDS: Speed[] = [1, 2, 3];

export function TopBar(props: TopBarProps) {
  const healthPct = (props.baseHealth / props.maxHealth) * 100;
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/10 bg-[#0f141b] px-4 py-2">
      <Stat label="Health">
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-[width] ${healthPct > 35 ? 'bg-emerald-400' : 'bg-red-500'}`}
              style={{ width: `${healthPct}%` }}
            />
          </div>
          <span className="tabular-nums">{props.baseHealth}</span>
        </div>
      </Stat>
      <Stat label="Wave">
        <span className="tabular-nums">
          {Math.max(props.wave, 0)}
          <span className="text-white/40">/{props.totalWaves}</span>
        </span>
        {props.canCallWave && (
          <button
            onClick={props.onCallWave}
            className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs text-white/80 hover:bg-white/20"
            title="Call the next wave now (N)"
          >
            Next in {Math.ceil(props.countdown)}s ▸
          </button>
        )}
      </Stat>
      <Stat label="Gold">
        <span className="tabular-nums text-amber-300">{props.money}</span>
      </Stat>
      <Stat label="Score">
        <span className="tabular-nums">{props.score.toLocaleString()}</span>
      </Stat>

      <div className="ml-auto flex items-center gap-1">
        <button onClick={props.onPause} className={btn(props.paused)} title="Pause (Space)">
          {props.paused ? '▶ Resume' : '❚❚ Pause'}
        </button>
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => props.onSpeed(s)} className={btn(props.speed === s)} aria-pressed={props.speed === s}>
            {s}x
          </button>
        ))}
        <button onClick={props.onRestart} className={btn(false)} title="Restart (R)">
          ↻ Restart
        </button>
      </div>
    </header>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className="text-[11px] font-medium tracking-wider text-white/40 uppercase">{label}</span>
      {children}
    </div>
  );
}

function btn(active: boolean): string {
  return `rounded-md px-3 py-1 text-sm font-medium transition-colors ${
    active ? 'bg-sky-500 text-white' : 'bg-white/5 text-white/80 hover:bg-white/15'
  }`;
}
