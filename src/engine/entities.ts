import { ENEMIES, type EnemyType } from '../config/enemies';
import { PATH } from '../config/map';
import type { Effect, EntityPools, Enemy, GameState, Projectile, Tower } from './types';

export function createPools(): EntityPools {
  return { enemies: [], projectiles: [], effects: [] };
}

/**
 * With pooling on, dead objects are re-initialised in place instead of allocated,
 * so long runs and the stress test produce almost no garbage.
 */
export function spawnEnemy(state: GameState, type: EnemyType, hpMultiplier: number): Enemy {
  const def = ENEMIES[type];
  const hp = def.hp * hpMultiplier;
  const enemy = state.pools?.enemies.pop() ?? ({} as Enemy);
  enemy.id = state.nextEnemyId++;
  enemy.alive = true;
  enemy.type = type;
  enemy.def = def;
  enemy.hp = hp;
  enemy.maxHp = hp;
  enemy.speed = def.speed;
  enemy.armor = def.armor;
  enemy.slowFactor = 1;
  enemy.slowTimer = 0;
  enemy.healTimer = def.heal?.interval ?? 0;
  enemy.hitFlash = 0;
  enemy.dist = 0;
  enemy.seg = 0;
  enemy.x = 0;
  enemy.y = 0;
  PATH.place(enemy);
  state.enemies.push(enemy);
  return enemy;
}

export function fireProjectile(state: GameState, tower: Tower, target: Enemy): Projectile {
  const stats = tower.def.levels[tower.level];
  const p = state.pools?.projectiles.pop() ?? ({} as Projectile);
  p.alive = true;
  p.towerType = tower.type;
  p.x = tower.x;
  p.y = tower.y;
  p.tx = target.x;
  p.ty = target.y;
  p.speed = tower.def.projectileSpeed;
  p.radius = tower.def.projectileRadius;
  p.damage = stats.damage;
  p.splashRadius = stats.splashRadius;
  p.slowFactor = stats.slowFactor;
  p.slowDuration = stats.slowDuration;
  p.target = target;
  p.targetId = target.id;
  state.projectiles.push(p);
  return p;
}

const MAX_EFFECTS = 400;

export function spawnEffect(state: GameState, x: number, y: number, radius: number, life: number, color: string): void {
  if (state.effects.length >= MAX_EFFECTS) return;
  const fx = state.pools?.effects.pop() ?? ({} as Effect);
  fx.x = x;
  fx.y = y;
  fx.radius = radius;
  fx.life = life;
  fx.maxLife = life;
  fx.color = color;
  state.effects.push(fx);
}

export function updateEffects(state: GameState, dt: number): void {
  const effects = state.effects;
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    fx.life -= dt;
    if (fx.life > 0) continue;
    effects[i] = effects[effects.length - 1];
    effects.pop();
    state.pools?.effects.push(fx);
  }
}

/** Drops dead entities with swap-remove; order inside these lists carries no meaning. */
export function removeDead(state: GameState): void {
  const pools = state.pools;
  const enemies = state.enemies;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.alive) continue;
    enemies[i] = enemies[enemies.length - 1];
    enemies.pop();
    pools?.enemies.push(e);
  }
  const projectiles = state.projectiles;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.alive) continue;
    projectiles[i] = projectiles[projectiles.length - 1];
    projectiles.pop();
    p.target = null;
    pools?.projectiles.push(p);
  }
}
