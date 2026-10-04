import { BALANCE } from '../config/balance';
import { PADS } from '../config/map';
import type { GameState } from './types';

/** Restart builds a fresh state rather than resetting fields one by one. */
export function createGameState(): GameState {
  return {
    phase: 'menu',
    benchmark: false,
    speed: 1,
    time: 0,

    wave: 0,
    waveStage: 'countdown',
    waveTimer: BALANCE.firstCountdown,
    spawnQueue: [],
    spawnIndex: 0,
    spawnInterval: 1,
    waveHpMultiplier: 1,

    baseHealth: BALANCE.startingHealth,
    money: BALANCE.startingMoney,
    score: 0,

    enemies: [],
    towers: [],
    projectiles: [],
    effects: [],
    pools: null,
    padTowers: PADS.map(() => null),

    nextEnemyId: 1,
    nextTowerId: 1,
  };
}
