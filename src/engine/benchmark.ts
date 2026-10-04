import type { EnemyType } from '../config/enemies';
import { PATH, WORLD_HEIGHT, WORLD_WIDTH } from '../config/map';
import { TOWER_TYPES, TOWERS, type TowerDefinition, type TowerType } from '../config/towers';
import { spawnEnemy } from './entities';
import { createGameState } from './state';
import type { GameState } from './types';

export const BENCHMARK = {
  enemies: 5000,
  towersPerSide: 10,
  warmupSeconds: 5,
  recordSeconds: 20,
} as const;

const ENEMY_MIX: EnemyType[] = ['grunt', 'runner', 'tank', 'armored'];

/**
 * Stress towers fire fast, slow projectiles so ~1,000 are in flight at once.
 * Same code paths as normal towers; only the numbers differ.
 */
const STRESS_DEFS: Record<TowerType, TowerDefinition> = Object.fromEntries(
  TOWER_TYPES.map((type) => {
    const def = TOWERS[type];
    const top = def.levels[def.levels.length - 1];
    return [type, { ...def, projectileSpeed: 160, levels: [{ ...top, interval: 0.1 }] }];
  }),
) as Record<TowerType, TowerDefinition>;

/** The fixed scene every NUMBERS.md row is measured on: 5,000 looping enemies and 100 towers. */
export function createBenchmarkState(): GameState {
  const state = createGameState();
  state.phase = 'playing';
  state.benchmark = true;
  state.waveStage = 'clearing';

  for (let i = 0; i < BENCHMARK.enemies; i++) {
    const enemy = spawnEnemy(state, ENEMY_MIX[i % ENEMY_MIX.length], 1);
    enemy.dist = (i / BENCHMARK.enemies) * PATH.length;
    PATH.place(enemy);
  }

  const n = BENCHMARK.towersPerSide;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const type = TOWER_TYPES[(r * n + c) % TOWER_TYPES.length];
      const def = STRESS_DEFS[type];
      state.towers.push({
        id: state.nextTowerId++,
        type,
        def,
        level: 0,
        padIndex: -1,
        x: 70 + (c * (WORLD_WIDTH - 140)) / (n - 1),
        y: 40 + (r * (WORLD_HEIGHT - 80)) / (n - 1),
        cooldown: ((r * n + c) % 10) * 0.01,
        target: null,
        targetId: 0,
        angle: 0,
        invested: 0,
        recoil: 0,
      });
    }
  }
  return state;
}
