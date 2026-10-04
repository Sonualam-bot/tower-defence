import type { EnemyDefinition, EnemyType } from '../config/enemies';
import type { TowerDefinition, TowerType } from '../config/towers';
import type { PathFollower } from './path';

export type GamePhase = 'menu' | 'playing' | 'paused' | 'game-over' | 'victory';
export type Speed = 1 | 2 | 3;
export type WaveStage = 'countdown' | 'spawning' | 'clearing';

export interface Enemy extends PathFollower {
  /** Unique for the lifetime of the run; changes when a pooled object is reused. */
  id: number;
  alive: boolean;
  type: EnemyType;
  def: EnemyDefinition;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  slowFactor: number;
  slowTimer: number;
  healTimer: number;
  hitFlash: number;
}

export interface Tower {
  id: number;
  type: TowerType;
  def: TowerDefinition;
  level: number;
  padIndex: number;
  x: number;
  y: number;
  cooldown: number;
  target: Enemy | null;
  /** The target's id when it was acquired, so a recycled enemy object is never mistaken for it. */
  targetId: number;
  angle: number;
  /** Total money spent (build + upgrades), used for the sell refund. */
  invested: number;
  recoil: number;
}

export interface Projectile {
  alive: boolean;
  towerType: TowerType;
  x: number;
  y: number;
  /** Last known target position; the shell flies here if the target dies mid-flight. */
  tx: number;
  ty: number;
  speed: number;
  radius: number;
  damage: number;
  splashRadius: number;
  slowFactor: number;
  slowDuration: number;
  target: Enemy | null;
  targetId: number;
}

export interface GameState {
  phase: GamePhase;
  speed: Speed;
  /** Simulated seconds since the run started. */
  time: number;

  wave: number;
  waveStage: WaveStage;
  waveTimer: number;
  spawnQueue: EnemyType[];
  spawnIndex: number;
  spawnInterval: number;
  waveHpMultiplier: number;

  baseHealth: number;
  money: number;
  score: number;

  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  /** Tower occupying each build pad, or null. */
  padTowers: (Tower | null)[];

  nextEnemyId: number;
  nextTowerId: number;
}
