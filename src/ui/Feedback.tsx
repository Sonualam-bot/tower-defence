import { useEffect, useRef, useState } from 'react';
import { ENEMIES } from '../config/enemies';
import { generateWave } from '../config/waves';

/** "Wave N" announcement, naming any enemy type the wave introduces. */
export function WaveBanner({ wave, active }: { wave: number; active: boolean }) {
  if (!active || wave <= 0) return null;
  const shown = wave;

  const types = new Set(generateWave(shown).spawns);
  const previous = shown > 1 ? new Set(generateWave(shown - 1).spawns) : new Set();
  const fresh = [...types].filter((t) => !previous.has(t));
  const boss = types.has('boss');
  return (
    <div key={shown} className="animate-banner pointer-events-none absolute inset-x-0 top-6 flex justify-center">
      <div className="rounded-lg border border-white/10 bg-black/70 px-6 py-2 text-center backdrop-blur">
        <div className="text-2xl font-bold tracking-tight">Wave {shown}</div>
        {(fresh.length > 0 || boss) && (
          <div className="text-xs text-amber-300">
            {boss ? 'Boss incoming!' : `New: ${fresh.map((t) => ENEMIES[t].name).join(', ')}`}
          </div>
        )}
      </div>
    </div>
  );
}

/** Red vignette pulse whenever the base loses health. */
export function DamageFlash({ health }: { health: number }) {
  const prev = useRef(health);
  const [hits, setHits] = useState(0);
  useEffect(() => {
    if (health < prev.current) setHits((h) => h + 1);
    prev.current = health;
  }, [health]);
  if (!hits) return null;
  return (
    <div
      key={hits}
      className="animate-hurt pointer-events-none absolute inset-0"
      style={{ boxShadow: 'inset 0 0 120px 20px rgba(229,83,75,0.55)' }}
    />
  );
}
