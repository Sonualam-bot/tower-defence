import { BALANCE } from '../../config/balance';
import { generateWave } from '../../config/waves';
import { spawnEnemy } from '../entities';
import type { GameState } from '../types';

export function startNextWave(state: GameState): void {
  state.wave++;
  const plan = generateWave(state.wave);
  state.spawnQueue = plan.spawns;
  state.spawnIndex = 0;
  state.spawnInterval = plan.interval;
  state.waveHpMultiplier = plan.hpMultiplier;
  state.waveStage = 'spawning';
  state.waveTimer = 0;
}

/** Countdown → spawning → clearing → (bonus) → countdown, or victory after the last wave. */
export function updateWaves(state: GameState, dt: number): void {
  switch (state.waveStage) {
    case 'countdown':
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) startNextWave(state);
      break;

    case 'spawning':
      state.waveTimer -= dt;
      while (state.waveTimer <= 0 && state.spawnIndex < state.spawnQueue.length) {
        spawnEnemy(state, state.spawnQueue[state.spawnIndex++], state.waveHpMultiplier);
        state.waveTimer += state.spawnInterval;
      }
      if (state.spawnIndex >= state.spawnQueue.length) state.waveStage = 'clearing';
      break;

    case 'clearing':
      if (state.enemies.length > 0) break;
      state.money += BALANCE.waveClearBonus + state.wave;
      if (state.wave >= BALANCE.totalWaves) {
        state.phase = 'victory';
      } else {
        state.waveStage = 'countdown';
        state.waveTimer = BALANCE.waveCountdown;
      }
      break;
  }
}
