import { fireProjectile } from '../entities';
import type { GameState } from '../types';
import type { TargetFinder } from './targeting';

export function updateTowers(state: GameState, dt: number, findTarget: TargetFinder): void {
  const towers = state.towers;
  for (let i = 0; i < towers.length; i++) {
    const tower = towers[i];
    const stats = tower.def.levels[tower.level];
    if (tower.cooldown > 0) tower.cooldown -= dt;
    if (tower.recoil > 0) tower.recoil -= dt;

    const target = findTarget(state, tower, stats.range);
    tower.target = target;
    tower.targetId = target ? target.id : 0;
    if (!target) continue;

    tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    if (tower.cooldown <= 0) {
      fireProjectile(state, tower, target);
      tower.cooldown += stats.interval;
      if (tower.cooldown < 0) tower.cooldown = 0;
      tower.recoil = 0.1;
    }
  }
}
