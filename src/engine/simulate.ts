import { removeDead } from './entities';
import { updateEnemies } from './systems/movement';
import { updateProjectiles } from './systems/projectiles';
import { bruteForceTargeting, type TargetFinder } from './systems/targeting';
import { updateTowers } from './systems/towers';
import { updateWaves } from './systems/waves';
import type { GameState } from './types';

/** Fixed simulation step: 60 Hz regardless of display refresh rate. */
export const STEP_SECONDS = 1 / 60;

export interface SimulationStrategies {
  findTarget: TargetFinder;
}

export const DEFAULT_STRATEGIES: SimulationStrategies = {
  findTarget: bruteForceTargeting,
};

/** Advances the world by one fixed step. Headless: usable from tests without a browser. */
export function step(state: GameState, dt: number, strategies: SimulationStrategies = DEFAULT_STRATEGIES): void {
  if (state.phase !== 'playing') return;
  state.time += dt;
  updateWaves(state, dt);
  updateEnemies(state, dt);
  updateTowers(state, dt, strategies.findTarget);
  updateProjectiles(state, dt);
  removeDead(state);
  if (state.baseHealth <= 0) state.phase = 'game-over';
}
