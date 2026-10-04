export type EnemyType = 'grunt' | 'runner' | 'tank' | 'armored' | 'medic' | 'boss';

export interface EnemyDefinition {
  type: EnemyType;
  name: string;
  hp: number;
  /** World units per second. */
  speed: number;
  /** Flat damage reduction per hit. */
  armor: number;
  reward: number;
  /** Base health lost when this enemy gets through. */
  leakDamage: number;
  radius: number;
  color: string;
  heal?: { amount: number; radius: number; interval: number };
}

export const ENEMIES: Record<EnemyType, EnemyDefinition> = {
  grunt: { type: 'grunt', name: 'Grunt', hp: 30, speed: 60, armor: 0, reward: 5, leakDamage: 1, radius: 9, color: '#e5534b' },
  runner: { type: 'runner', name: 'Runner', hp: 25, speed: 115, armor: 0, reward: 4, leakDamage: 1, radius: 7, color: '#b07cf0' },
  tank: { type: 'tank', name: 'Tank', hp: 220, speed: 36, armor: 2, reward: 14, leakDamage: 3, radius: 14, color: '#58b368' },
  armored: { type: 'armored', name: 'Armored', hp: 90, speed: 52, armor: 6, reward: 10, leakDamage: 2, radius: 11, color: '#9aa7b8' },
  medic: {
    type: 'medic',
    name: 'Medic',
    hp: 70,
    speed: 56,
    armor: 0,
    reward: 9,
    leakDamage: 1,
    radius: 10,
    color: '#f4f1ea',
    heal: { amount: 6, radius: 70, interval: 1.5 },
  },
  boss: { type: 'boss', name: 'Warlord', hp: 3000, speed: 30, armor: 8, reward: 200, leakDamage: 10, radius: 22, color: '#d6336c' },
};
