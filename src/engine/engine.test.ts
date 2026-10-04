import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance';
import { PADS, PATH } from '../config/map';
import { TOWERS } from '../config/towers';
import { spawnEnemy } from './entities';
import { PathGeometry } from './path';
import { applyDamage, damageAfterArmor, placeTower, sellTower, upgradeTower } from './rules';
import { STEP_SECONDS, step } from './simulate';
import { createGameState } from './state';

function playingState() {
  const state = createGameState();
  state.phase = 'playing';
  return state;
}

function run(state: ReturnType<typeof createGameState>, seconds: number) {
  const steps = Math.round(seconds / STEP_SECONDS);
  for (let i = 0; i < steps; i++) step(state, STEP_SECONDS);
}

describe('PathGeometry', () => {
  const path = new PathGeometry([
    [0, 0],
    [100, 0],
    [100, 50],
  ]);

  it('measures total length', () => {
    expect(path.length).toBe(150);
  });

  it('places a follower by distance across segments', () => {
    const f = { dist: 120, seg: 0, x: 0, y: 0 };
    path.place(f);
    expect(f.seg).toBe(1);
    expect(f.x).toBeCloseTo(100);
    expect(f.y).toBeCloseTo(20);
  });
});

describe('map', () => {
  it('has enough build pads for a real game', () => {
    expect(PADS.length).toBeGreaterThanOrEqual(25);
  });
});

describe('rules', () => {
  it('armor reduces damage but never below the floor', () => {
    expect(damageAfterArmor(10, 4)).toBe(6);
    expect(damageAfterArmor(10, 100)).toBe(10 * BALANCE.minDamageFraction);
  });

  it('kills award money and score exactly once', () => {
    const state = playingState();
    const enemy = spawnEnemy(state, 'grunt', 1);
    const money = state.money;
    expect(applyDamage(state, enemy, 1000)).toBe(true);
    expect(applyDamage(state, enemy, 1000)).toBe(false);
    expect(state.money).toBe(money + enemy.def.reward);
  });

  it('builds, upgrades and sells with a partial refund', () => {
    const state = playingState();
    state.money = 1000;
    const tower = placeTower(state, 'archer', 0)!;
    expect(tower).not.toBeNull();
    expect(placeTower(state, 'cannon', 0)).toBeNull(); // pad occupied
    expect(upgradeTower(state, tower)).toBe(true);
    const invested = TOWERS.archer.levels[0].cost + TOWERS.archer.levels[1].cost;
    expect(tower.invested).toBe(invested);
    const before = state.money;
    sellTower(state, tower);
    expect(state.money).toBe(before + Math.floor(invested * BALANCE.sellRefund));
    expect(state.padTowers[0]).toBeNull();
  });

  it('refuses to build without enough money', () => {
    const state = playingState();
    state.money = 0;
    expect(placeTower(state, 'archer', 0)).toBeNull();
  });
});

describe('simulation', () => {
  it('enemies that reach the base cost health and can end the game', () => {
    const state = playingState();
    state.baseHealth = 1;
    const enemy = spawnEnemy(state, 'grunt', 1);
    run(state, PATH.length / enemy.speed + 1);
    expect(state.baseHealth).toBe(0);
    expect(state.phase).toBe('game-over');
  });

  it('vertical slice: towers kill wave 1, earn money and the next countdown starts', () => {
    const state = playingState();
    state.money = 10_000;
    // Ring the first stretch of path with archers.
    let built = 0;
    for (let i = 0; i < PADS.length && built < 8; i++) {
      if (PADS[i].x < 400 && placeTower(state, 'archer', i)) built++;
    }
    const moneyAfterBuild = state.money;
    run(state, BALANCE.firstCountdown + 60);
    expect(state.wave).toBeGreaterThanOrEqual(2);
    expect(state.baseHealth).toBe(BALANCE.startingHealth);
    expect(state.money).toBeGreaterThan(moneyAfterBuild);
  });

  it('is deterministic for the same inputs', () => {
    const a = playingState();
    const b = playingState();
    for (const s of [a, b]) {
      s.money = 1000;
      placeTower(s, 'cannon', 3);
      placeTower(s, 'frost', 5);
    }
    run(a, 40);
    run(b, 40);
    expect(a.score).toBe(b.score);
    expect(a.enemies.length).toBe(b.enemies.length);
  });
});
