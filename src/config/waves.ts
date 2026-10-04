import type { EnemyType } from './enemies';

export interface WavePlan {
  /** Enemy types in spawn order. */
  spawns: EnemyType[];
  /** Seconds between spawns. */
  interval: number;
  hpMultiplier: number;
}

/** Waves are generated from a few growth rules instead of authored one by one. */
export function generateWave(wave: number): WavePlan {
  const count = 6 + wave * 2;
  const spawns: EnemyType[] = new Array(count).fill('grunt');
  return {
    spawns,
    interval: Math.max(0.25, 0.9 - wave * 0.012),
    hpMultiplier: 1 + (wave - 1) * 0.12,
  };
}
