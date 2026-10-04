import { spawnEffect } from '../entities';
import { applyDamage, applySlow } from '../rules';
import type { SpatialGrid } from '../SpatialGrid';
import type { GameState, Projectile } from '../types';

const HIT_RADIUS = 4;

/**
 * Projectiles home on a stored target instead of testing collisions against every enemy.
 * Only splash shells look at other enemies, and only at the moment of impact.
 */
export function updateProjectiles(state: GameState, dt: number, grid: SpatialGrid | null): void {
  const projectiles = state.projectiles;
  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i];
    if (!p.alive) continue;

    const target = p.target;
    const targetValid = target !== null && target.alive && target.id === p.targetId;
    if (targetValid) {
      p.tx = target.x;
      p.ty = target.y;
    }

    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = p.speed * dt;
    if (dist > step + HIT_RADIUS) {
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      continue;
    }

    p.x = p.tx;
    p.y = p.ty;
    p.alive = false;
    p.target = null;
    if (p.splashRadius > 0) {
      spawnEffect(state, p.x, p.y, p.splashRadius, 0.3, '#f0743e');
      if (grid) explodeGrid(state, p, grid);
      else explode(state, p);
    } else if (targetValid) {
      applySlow(target, p.slowFactor, p.slowDuration);
      applyDamage(state, target, p.damage);
    }
  }
}

function explode(state: GameState, p: Projectile): void {
  const enemies = state.enemies;
  const rSq = p.splashRadius * p.splashRadius;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    if (dx * dx + dy * dy <= rSq) {
      applySlow(e, p.slowFactor, p.slowDuration);
      applyDamage(state, e, p.damage);
    }
  }
}

function explodeGrid(state: GameState, p: Projectile, grid: SpatialGrid): void {
  const r = p.splashRadius;
  const rSq = r * r;
  const x0 = grid.cellX(p.x - r);
  const x1 = grid.cellX(p.x + r);
  const y0 = grid.cellY(p.y - r);
  const y1 = grid.cellY(p.y + r);
  const { starts, items, cols } = grid;
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      const c = cy * cols + cx;
      for (let k = starts[c]; k < starts[c + 1]; k++) {
        const e = items[k];
        if (!e.alive) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        if (dx * dx + dy * dy <= rSq) {
          applySlow(e, p.slowFactor, p.slowDuration);
          applyDamage(state, e, p.damage);
        }
      }
    }
  }
}
