export type TowerType = 'archer' | 'cannon' | 'frost';

export interface TowerLevel {
  /** Build cost for level 0, upgrade cost for the rest. */
  cost: number;
  damage: number;
  range: number;
  /** Seconds between shots. */
  interval: number;
  splashRadius: number;
  /** Speed multiplier applied to hit enemies (1 = no slow). */
  slowFactor: number;
  slowDuration: number;
}

export interface TowerDefinition {
  type: TowerType;
  name: string;
  hotkey: string;
  description: string;
  color: string;
  projectileSpeed: number;
  projectileRadius: number;
  levels: TowerLevel[];
}

const level = (cost: number, damage: number, range: number, interval: number, extra: Partial<TowerLevel> = {}): TowerLevel => ({
  cost,
  damage,
  range,
  interval,
  splashRadius: 0,
  slowFactor: 1,
  slowDuration: 0,
  ...extra,
});

export const TOWERS: Record<TowerType, TowerDefinition> = {
  archer: {
    type: 'archer',
    name: 'Archer',
    hotkey: '1',
    description: 'Cheap, fast, long range. Single target.',
    color: '#f2c14e',
    projectileSpeed: 560,
    projectileRadius: 2.5,
    levels: [
      level(50, 8, 150, 0.4),
      level(40, 12, 165, 0.35),
      level(70, 18, 180, 0.3),
      level(120, 28, 200, 0.25),
    ],
  },
  cannon: {
    type: 'cannon',
    name: 'Cannon',
    hotkey: '2',
    description: 'Slow, heavy shells that splash nearby enemies.',
    color: '#f0743e',
    projectileSpeed: 340,
    projectileRadius: 5,
    levels: [
      level(100, 30, 120, 1.4, { splashRadius: 55 }),
      level(80, 45, 130, 1.3, { splashRadius: 60 }),
      level(140, 70, 140, 1.2, { splashRadius: 70 }),
      level(220, 110, 150, 1.0, { splashRadius: 80 }),
    ],
  },
  frost: {
    type: 'frost',
    name: 'Frost',
    hotkey: '3',
    description: 'Low damage, slows enemies it hits.',
    color: '#5ec8f2',
    projectileSpeed: 440,
    projectileRadius: 3.5,
    levels: [
      level(75, 3, 130, 0.8, { slowFactor: 0.55, slowDuration: 1.5 }),
      level(60, 5, 140, 0.7, { slowFactor: 0.5, slowDuration: 1.8 }),
      level(100, 8, 150, 0.6, { slowFactor: 0.45, slowDuration: 2.1 }),
      level(160, 12, 165, 0.5, { slowFactor: 0.4, slowDuration: 2.5 }),
    ],
  },
};

export const TOWER_TYPES: readonly TowerType[] = ['archer', 'cannon', 'frost'];
