import { BASE_POSITION, PAD_SIZE, PADS, PATH, PATH_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from '../config/map';
import { ENEMIES, type EnemyType } from '../config/enemies';
import { TOWER_TYPES, TOWERS, type TowerType } from '../config/towers';
import type { GameState, Tower } from '../engine/types';

/** UI-only state the renderer needs: what the pointer is doing and what is selected. */
export interface RenderView {
  buildType: TowerType | null;
  hoverPad: number;
  /** Whether the hovered pad would accept the current build type. */
  hoverValid: boolean;
  selectedTower: Tower | null;
}

const ENEMY_TYPES = Object.keys(ENEMIES) as EnemyType[];

const COLORS = {
  background: '#11161d',
  grid: 'rgba(255,255,255,0.025)',
  pathEdge: '#2b2620',
  path: '#3a332a',
  pathCenter: 'rgba(255,255,255,0.05)',
  pad: 'rgba(255,255,255,0.05)',
  padEdge: 'rgba(255,255,255,0.10)',
  base: '#4f8cff',
  hpBack: 'rgba(0,0,0,0.6)',
  hp: '#5fd068',
  hpLow: '#e5534b',
  valid: '#5fd068',
  invalid: '#e5534b',
};

/** Draws the world into a canvas, scaled to fit while preserving the world's aspect ratio. */
export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dpr = 1;
  /** Optimized path: one fill per enemy type instead of one per enemy. */
  batched = false;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
  }

  /** Called on container resize with CSS pixel size. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    const canvas = this.ctx.canvas;
    this.dpr = dpr;
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.scale = Math.min(cssWidth / WORLD_WIDTH, cssHeight / WORLD_HEIGHT);
    this.offsetX = (cssWidth - WORLD_WIDTH * this.scale) / 2;
    this.offsetY = (cssHeight - WORLD_HEIGHT * this.scale) / 2;
  }

  /** Converts a CSS-pixel position relative to the canvas into world coordinates. */
  screenToWorld(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.offsetX) / this.scale, y: (y - this.offsetY) / this.scale };
  }

  render(state: GameState, view: RenderView): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const s = this.scale * this.dpr;
    ctx.setTransform(s, 0, 0, s, this.offsetX * this.dpr, this.offsetY * this.dpr);

    this.drawMap(state);
    this.drawRangeIndicators(view);
    this.drawTowers(state);
    if (this.batched) {
      this.drawEnemiesBatched(state);
      this.drawProjectilesBatched(state);
    } else {
      this.drawEnemies(state);
      this.drawProjectiles(state);
    }
    this.drawPlacementPreview(view);
  }

  private drawMap(state: GameState): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= WORLD_WIDTH; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
    }
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.tracePath();
    ctx.strokeStyle = COLORS.pathEdge;
    ctx.lineWidth = PATH_WIDTH + 8;
    ctx.stroke();
    ctx.strokeStyle = COLORS.path;
    ctx.lineWidth = PATH_WIDTH;
    ctx.stroke();
    ctx.setLineDash([10, 14]);
    ctx.strokeStyle = COLORS.pathCenter;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    const half = PAD_SIZE / 2;
    for (let i = 0; i < PADS.length; i++) {
      if (state.padTowers[i]) continue;
      const pad = PADS[i];
      ctx.fillStyle = COLORS.pad;
      ctx.fillRect(pad.x - half, pad.y - half, PAD_SIZE, PAD_SIZE);
      ctx.strokeStyle = COLORS.padEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(pad.x - half + 0.5, pad.y - half + 0.5, PAD_SIZE - 1, PAD_SIZE - 1);
    }

    // Base: a glowing core whose ring shrinks as health drops.
    const { x, y } = BASE_POSITION;
    ctx.fillStyle = 'rgba(79,140,255,0.15)';
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.base;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  private tracePath(): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(PATH.xs[0], PATH.ys[0]);
    for (let i = 1; i < PATH.xs.length; i++) ctx.lineTo(PATH.xs[i], PATH.ys[i]);
  }

  private drawRangeIndicators(view: RenderView): void {
    const tower = view.selectedTower;
    if (!tower) return;
    const range = tower.def.levels[tower.level].range;
    this.rangeCircle(tower.x, tower.y, range, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.35)');
  }

  private rangeCircle(x: number, y: number, r: number, fill: string, stroke: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawTowers(state: GameState): void {
    const towers = state.towers;
    for (let i = 0; i < towers.length; i++) this.drawTower(towers[i]);
  }

  private drawTower(tower: Tower, alpha = 1): void {
    const ctx = this.ctx;
    const color = tower.def.color;
    const half = PAD_SIZE / 2 - 3;
    ctx.globalAlpha = alpha;

    ctx.fillStyle = '#1c232d';
    ctx.fillRect(tower.x - half, tower.y - half, half * 2, half * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(tower.x - half, tower.y - half, half * 2, half * 2);

    // Level pips along the bottom edge.
    ctx.fillStyle = color;
    for (let l = 0; l <= tower.level; l++) ctx.fillRect(tower.x - half + 4 + l * 7, tower.y + half - 6, 4, 3);

    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.rotate(tower.angle);
    const kick = tower.recoil > 0 ? tower.recoil * 30 : 0;
    ctx.fillStyle = color;
    switch (tower.type) {
      case 'archer':
        ctx.fillRect(2 - kick, -2.5, 18, 5);
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'cannon':
        ctx.fillRect(2 - kick, -5, 17, 10);
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'frost':
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** Baseline renderer: one path + fill per enemy, style set per enemy. */
  private drawEnemies(state: GameState): void {
    const ctx = this.ctx;
    const enemies = state.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.def.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.def.radius, 0, Math.PI * 2);
      ctx.fill();
      if (e.slowFactor < 1) {
        ctx.strokeStyle = TOWERS.frost.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (e.hp < e.maxHp) {
        const w = e.def.radius * 2;
        const frac = Math.max(0, e.hp / e.maxHp);
        const top = e.y - e.def.radius - 6;
        ctx.fillStyle = COLORS.hpBack;
        ctx.fillRect(e.x - w / 2, top, w, 3);
        ctx.fillStyle = frac > 0.35 ? COLORS.hp : COLORS.hpLow;
        ctx.fillRect(e.x - w / 2, top, w * frac, 3);
      }
    }
  }

  /**
   * Batched: one path + one fill per enemy type, one path for all HP bar backs and fronts.
   * Canvas state changes drop from ~3 per enemy to a handful per frame.
   */
  private drawEnemiesBatched(state: GameState): void {
    const ctx = this.ctx;
    const enemies = state.enemies;
    for (let t = 0; t < ENEMY_TYPES.length; t++) {
      const type = ENEMY_TYPES[t];
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.type !== type) continue;
        const r = e.def.radius;
        ctx.moveTo(e.x + r, e.y);
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        any = true;
      }
      if (any) {
        ctx.fillStyle = ENEMIES[type].color;
        ctx.fill();
      }
    }
    ctx.beginPath();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hitFlash <= 0) continue;
      ctx.moveTo(e.x + e.def.radius, e.y);
      ctx.arc(e.x, e.y, e.def.radius, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();

    ctx.fillStyle = COLORS.hpBack;
    ctx.beginPath();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hp >= e.maxHp) continue;
      const w = e.def.radius * 2;
      ctx.rect(e.x - w / 2, e.y - e.def.radius - 6, w, 3);
    }
    ctx.fill();
    ctx.fillStyle = COLORS.hp;
    ctx.beginPath();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hp >= e.maxHp) continue;
      const w = e.def.radius * 2;
      ctx.rect(e.x - w / 2, e.y - e.def.radius - 6, w * Math.max(0, e.hp / e.maxHp), 3);
    }
    ctx.fill();
  }

  private drawProjectilesBatched(state: GameState): void {
    const ctx = this.ctx;
    const projectiles = state.projectiles;
    for (let t = 0; t < TOWER_TYPES.length; t++) {
      const type = TOWER_TYPES[t];
      ctx.beginPath();
      for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        if (p.towerType !== type) continue;
        ctx.rect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
      }
      ctx.fillStyle = TOWERS[type].color;
      ctx.fill();
    }
  }

  private drawProjectiles(state: GameState): void {
    const ctx = this.ctx;
    const projectiles = state.projectiles;
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      ctx.fillStyle = TOWERS[p.towerType].color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlacementPreview(view: RenderView): void {
    if (!view.buildType || view.hoverPad < 0) return;
    const pad = PADS[view.hoverPad];
    const def = TOWERS[view.buildType];
    const color = view.hoverValid ? COLORS.valid : COLORS.invalid;
    this.rangeCircle(pad.x, pad.y, def.levels[0].range, view.hoverValid ? 'rgba(95,208,104,0.08)' : 'rgba(229,83,75,0.08)', color);
    if (view.hoverValid) {
      GHOST_TOWER.type = def.type;
      GHOST_TOWER.def = def;
      GHOST_TOWER.x = pad.x;
      GHOST_TOWER.y = pad.y;
      this.drawTower(GHOST_TOWER, 0.6);
    } else {
      const ctx = this.ctx;
      const h = PAD_SIZE / 2 - 8;
      ctx.strokeStyle = COLORS.invalid;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pad.x - h, pad.y - h);
      ctx.lineTo(pad.x + h, pad.y + h);
      ctx.moveTo(pad.x + h, pad.y - h);
      ctx.lineTo(pad.x - h, pad.y + h);
      ctx.stroke();
    }
  }
}

/** Reused for the placement preview so hovering never allocates. */
const GHOST_TOWER: Tower = {
  id: 0,
  type: 'archer',
  def: TOWERS.archer,
  level: 0,
  padIndex: -1,
  x: 0,
  y: 0,
  cooldown: 0,
  target: null,
  targetId: 0,
  angle: -Math.PI / 2,
  invested: 0,
  recoil: 0,
};
