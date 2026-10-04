import type { EnemyType } from './enemies';

export interface WavePlan {
  /** Enemy types in spawn order. */
  spawns: EnemyType[];
  /** Seconds between spawns. */
  interval: number;
  hpMultiplier: number;
}

/** Wave at which each enemy type joins the mix. */
const UNLOCKS: ReadonlyArray<readonly [number, EnemyType]> = [
  [1, 'grunt'],
  [4, 'runner'],
  [8, 'tank'],
  [12, 'armored'],
  [16, 'medic'],
];

/** Waves are generated from a few growth rules instead of authored one by one. */
export function generateWave(wave: number): WavePlan {
  const available = UNLOCKS.filter(([w]) => wave >= w).map(([, type]) => type);
  const count = 6 + wave * 2;
  const spawns: EnemyType[] = [];
  for (let i = 0; i < count; i++) {
    // Deterministic mix; the newest type is slightly over-represented so it gets noticed.
    const pick = (i * 7 + wave * 3) % (available.length + 1);
    spawns.push(available[Math.min(pick, available.length - 1)]);
  }
  // Every 10th wave ends with a boss; the last wave brings several.
  if (wave % 10 === 0) for (let b = 0; b < wave / 10; b++) spawns.push('boss');
  return {
    spawns,
    interval: Math.max(0.25, 0.9 - wave * 0.012),
    hpMultiplier: 1 + (wave - 1) * 0.12,
  };
}
