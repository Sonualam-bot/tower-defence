import type { Enemy, GameState, Tower } from '../types';
import type { SpatialGrid } from '../SpatialGrid';

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

/** Optimized: only enemies in grid cells overlapping the tower's range are considered. */
export function gridTargeting(grid: SpatialGrid): TargetFinder {
  return (_state, tower, range) => {
    const rangeSq = range * range;
    const x0 = grid.cellX(tower.x - range);
    const x1 = grid.cellX(tower.x + range);
    const y0 = grid.cellY(tower.y - range);
    const y1 = grid.cellY(tower.y + range);
    const { starts, items, cols } = grid;
    let best: Enemy | null = null;
    let bestDist = -1;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const c = cy * cols + cx;
        for (let k = starts[c]; k < starts[c + 1]; k++) {
          const e = items[k];
          if (!e.alive || e.dist <= bestDist) continue;
          const dx = e.x - tower.x;
          const dy = e.y - tower.y;
          if (dx * dx + dy * dy <= rangeSq) {
            best = e;
            bestDist = e.dist;
          }
        }
      }
    }
    return best;
  };
}
