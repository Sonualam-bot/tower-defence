import { PATH } from '../../config/map';
import type { GameState } from '../types';

export function updateEnemies(state: GameState, dt: number): void {
  const enemies = state.enemies;
  const end = PATH.length;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive) continue;

    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      if (e.slowTimer <= 0) e.slowFactor = 1;
    }

    e.dist += e.speed * e.slowFactor * dt;
    if (e.dist >= end) {
      e.alive = false;
      state.baseHealth = Math.max(0, state.baseHealth - e.def.leakDamage);
      continue;
    }
    PATH.place(e);
  }
}
