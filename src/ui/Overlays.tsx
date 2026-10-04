interface OverlayProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

function Overlay({ title, subtitle, children }: OverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-xl border border-white/10 bg-[#121821] px-10 py-8 text-center shadow-2xl">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-white/60">{subtitle}</p>}
        <div className="mt-6 flex justify-center gap-3">{children}</div>
      </div>
    </div>
  );
}

const primary = 'rounded-md bg-sky-500 px-5 py-2 font-semibold hover:bg-sky-400';
const secondary = 'rounded-md bg-white/10 px-5 py-2 font-semibold hover:bg-white/20';

export function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <Overlay title="Tower Defense" subtitle="Hold the line for 50 waves.">
      <button className={primary} onClick={onStart} autoFocus>
        Start game
      </button>
    </Overlay>
  );
}

export function PauseScreen({ onResume, onRestart }: { onResume: () => void; onRestart: () => void }) {
  return (
    <Overlay title="Paused">
      <button className={primary} onClick={onResume} autoFocus>
        Resume
      </button>
      <button className={secondary} onClick={onRestart}>
        Restart
      </button>
    </Overlay>
  );
}

export function EndScreen({ victory, wave, score, onRestart }: { victory: boolean; wave: number; score: number; onRestart: () => void }) {
  return (
    <Overlay
      title={victory ? 'Victory!' : 'Game over'}
      subtitle={`${victory ? 'All waves survived' : `Fell on wave ${wave}`} · Score ${score.toLocaleString()}`}
    >
      <button className={primary} onClick={onRestart} autoFocus>
        Play again
      </button>
    </Overlay>
  );
}
