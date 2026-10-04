import { BALANCE } from '../config/balance';
import { PADS } from '../config/map';
import { TOWERS, type TowerLevel, type TowerType } from '../config/towers';
import { spawnEffect } from './entities';
import type { Enemy, GameState, Tower } from './types';

/** Pure game rules. No rendering, no React, no timing. */

export function damageAfterArmor(raw: number, armor: number): number {
  return Math.max(raw - armor, raw * BALANCE.minDamageFraction);
}

/** Applies a hit; returns true if it killed the enemy. */
export function applyDamage(state: GameState, enemy: Enemy, raw: number): boolean {
  if (!enemy.alive) return false;
  enemy.hp -= damageAfterArmor(raw, enemy.armor);
  enemy.hitFlash = 0.08;
  if (enemy.hp > 0) return false;
  if (state.benchmark) {
    enemy.hp = enemy.maxHp;
    return false;
  }
  enemy.alive = false;
  spawnEffect(state, enemy.x, enemy.y, enemy.def.radius * 2.2, 0.35, enemy.def.color);
  state.money += enemy.def.reward;
  state.score += enemy.def.reward * BALANCE.scorePerReward;
  return true;
}

export function applySlow(enemy: Enemy, factor: number, duration: number): void {
  if (factor >= 1 || !enemy.alive) return;
  enemy.slowFactor = Math.min(enemy.slowFactor, factor);
  enemy.slowTimer = Math.max(enemy.slowTimer, duration);
}

export function towerStats(tower: Tower): TowerLevel {
  return tower.def.levels[tower.level];
}

export function upgradeCost(tower: Tower): number | null {
  const next = tower.def.levels[tower.level + 1];
  return next ? next.cost : null;
}

export function sellValue(tower: Tower): number {
  return Math.floor(tower.invested * BALANCE.sellRefund);
}

export type PlacementResult = 'ok' | 'occupied' | 'no-money' | 'no-pad';

export function canPlace(state: GameState, type: TowerType, padIndex: number): PlacementResult {
  if (padIndex < 0 || padIndex >= PADS.length) return 'no-pad';
  if (state.padTowers[padIndex]) return 'occupied';
  if (state.money < TOWERS[type].levels[0].cost) return 'no-money';
  return 'ok';
}

export function placeTower(state: GameState, type: TowerType, padIndex: number): Tower | null {
  if (canPlace(state, type, padIndex) !== 'ok') return null;
  const def = TOWERS[type];
  const pad = PADS[padIndex];
  const tower: Tower = {
    id: state.nextTowerId++,
    type,
    def,
    level: 0,
    padIndex,
    x: pad.x,
    y: pad.y,
    cooldown: 0,
    target: null,
    targetId: 0,
    angle: -Math.PI / 2,
    invested: def.levels[0].cost,
    recoil: 0,
  };
  state.money -= def.levels[0].cost;
  state.towers.push(tower);
  state.padTowers[padIndex] = tower;
  return tower;
}

export function upgradeTower(state: GameState, tower: Tower): boolean {
  const cost = upgradeCost(tower);
  if (cost === null || state.money < cost) return false;
  state.money -= cost;
  tower.invested += cost;
  tower.level++;
  return true;
}

export function sellTower(state: GameState, tower: Tower): number {
  const index = state.towers.indexOf(tower);
  if (index === -1) return 0;
  const refund = sellValue(tower);
  state.money += refund;
  state.towers.splice(index, 1);
  state.padTowers[tower.padIndex] = null;
  return refund;
}
