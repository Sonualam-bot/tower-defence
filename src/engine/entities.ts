import { ENEMIES, type EnemyType } from '../config/enemies';
import { PATH } from '../config/map';
import type { Enemy, GameState, Projectile, Tower } from './types';

export function spawnEnemy(state: GameState, type: EnemyType, hpMultiplier: number): Enemy {
  const def = ENEMIES[type];
  const hp = def.hp * hpMultiplier;
  const enemy: Enemy = {
    id: state.nextEnemyId++,
    alive: true,
    type,
    def,
    hp,
    maxHp: hp,
    speed: def.speed,
    armor: def.armor,
    slowFactor: 1,
    slowTimer: 0,
    healTimer: def.heal?.interval ?? 0,
    hitFlash: 0,
    dist: 0,
    seg: 0,
    x: 0,
    y: 0,
  };
  PATH.place(enemy);
  state.enemies.push(enemy);
  return enemy;
}

export function fireProjectile(state: GameState, tower: Tower, target: Enemy): Projectile {
  const stats = tower.def.levels[tower.level];
  const projectile: Projectile = {
    alive: true,
    towerType: tower.type,
    x: tower.x,
    y: tower.y,
    tx: target.x,
    ty: target.y,
    speed: tower.def.projectileSpeed,
    radius: tower.def.projectileRadius,
    damage: stats.damage,
    splashRadius: stats.splashRadius,
    slowFactor: stats.slowFactor,
    slowDuration: stats.slowDuration,
    target,
    targetId: target.id,
  };
  state.projectiles.push(projectile);
  return projectile;
}

/** Drops dead entities with swap-remove; order inside these lists carries no meaning. */
export function removeDead(state: GameState): void {
  const enemies = state.enemies;
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].alive) {
      enemies[i] = enemies[enemies.length - 1];
      enemies.pop();
    }
  }
  const projectiles = state.projectiles;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    if (!projectiles[i].alive) {
      projectiles[i] = projectiles[projectiles.length - 1];
      projectiles.pop();
    }
  }
}
