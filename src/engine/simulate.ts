import { removeDead, updateEffects } from './entities';
import type { SpatialGrid } from './SpatialGrid';
import { updateEnemies } from './systems/movement';
import { updateProjectiles } from './systems/projectiles';
import { bruteForceTargeting, gridTargeting, type TargetFinder } from './systems/targeting';
import { updateTowers } from './systems/towers';
import { updateWaves } from './systems/waves';
import type { GameState } from './types';

/** Fixed simulation step: 60 Hz regardless of display refresh rate. */
export const STEP_SECONDS = 1 / 60;

/** Swappable algorithms, so the baseline and optimized versions run side by side in one build. */
export interface SimulationStrategies {
  findTarget: TargetFinder;
  /** When set, rebuilt each tick and used for targeting and splash queries. */
  grid: SpatialGrid | null;
}

export const DEFAULT_STRATEGIES: SimulationStrategies = { findTarget: bruteForceTargeting, grid: null };

export function strategiesFor(grid: SpatialGrid | null): SimulationStrategies {
  return grid ? { findTarget: gridTargeting(grid), grid } : DEFAULT_STRATEGIES;
}

/** Advances the world by one fixed step. Headless: usable from tests without a browser. */
export function step(state: GameState, dt: number, strategies: SimulationStrategies = DEFAULT_STRATEGIES): void {
  if (state.phase !== 'playing') return;
  state.time += dt;
  if (!state.benchmark) updateWaves(state, dt);
  updateEnemies(state, dt);
  strategies.grid?.rebuild(state.enemies);
  updateTowers(state, dt, strategies.findTarget);
  updateProjectiles(state, dt, strategies.grid);
  removeDead(state);
  updateEffects(state, dt);
  if (state.baseHealth <= 0) state.phase = 'game-over';
}
