import type { Enemy, GameState, Tower } from '../types';

/** Picks the enemy a tower should shoot, or null if none is in range. */
export type TargetFinder = (state: GameState, tower: Tower, range: number) => Enemy | null;

/**
 * Baseline: every tower scans every enemy. "First" targeting = furthest along the path.
 * O(towers × enemies) per tick — the bottleneck the spatial grid replaces.
 */
export const bruteForceTargeting: TargetFinder = (state, tower, range) => {
  const enemies = state.enemies;
  const rangeSq = range * range;
  let best: Enemy | null = null;
  let bestDist = -1;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive) continue;
    const dx = e.x - tower.x;
    const dy = e.y - tower.y;
    if (dx * dx + dy * dy <= rangeSq && e.dist > bestDist) {
      best = e;
      bestDist = e.dist;
    }
  }
  return best;
};
