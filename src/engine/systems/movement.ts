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
    if (e.dist >= end && state.benchmark) {
      e.dist -= end;
      e.seg = 0;
    } else if (e.dist >= end) {
      e.alive = false;
      state.baseHealth = Math.max(0, state.baseHealth - e.def.leakDamage);
      continue;
    }
    PATH.place(e);

    const heal = e.def.heal;
    if (heal && (e.healTimer -= dt) <= 0) {
      e.healTimer = heal.interval;
      healAround(state, e.x, e.y, heal.radius, heal.amount);
    }
  }
}

/** Medics are rare, so a direct scan is fine here. */
function healAround(state: GameState, x: number, y: number, radius: number, amount: number): void {
  const enemies = state.enemies;
  const rSq = radius * radius;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive || e.hp >= e.maxHp) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy <= rSq) e.hp = Math.min(e.maxHp, e.hp + amount);
  }
}
