import { BALANCE } from '../config/balance';
import { PAD_SIZE, PADS } from '../config/map';
import type { TowerType } from '../config/towers';
import { CanvasRenderer, type RenderView } from '../render/CanvasRenderer';
import { PerfMonitor, type PerfStats } from './PerfMonitor';
import { canPlace, placeTower, sellTower, sellValue, towerStats, upgradeCost, upgradeTower } from './rules';
import { DEFAULT_STRATEGIES, STEP_SECONDS, step, type SimulationStrategies } from './simulate';
import { createGameState } from './state';
import type { GamePhase, GameState, Speed, Tower, WaveStage } from './types';

export interface SelectedTowerInfo {
  id: number;
  type: TowerType;
  name: string;
  level: number;
  maxLevel: number;
  damage: number;
  range: number;
  shotsPerSecond: number;
  upgradeCost: number | null;
  sellValue: number;
}

/** Everything React needs, published at ~10 Hz (and right after any command). */
export interface GameSnapshot {
  phase: GamePhase;
  speed: Speed;
  wave: number;
  totalWaves: number;
  waveStage: WaveStage;
  countdown: number;
  baseHealth: number;
  maxHealth: number;
  money: number;
  score: number;
  buildType: TowerType | null;
  selectedTower: SelectedTowerInfo | null;
  enemyCount: number;
  towerCount: number;
  projectileCount: number;
  perf: PerfStats;
}

const PUBLISH_INTERVAL_MS = 100;
/** Max fixed steps per displayed frame; beyond this we drop time instead of spiralling. */
const MAX_STEPS_PER_FRAME = 12;
const MAX_FRAME_SECONDS = 0.25;
const SUSPENDED_FRAME_MS = 1000;

/**
 * Owns the simulation, the single requestAnimationFrame loop and the renderer.
 * Knows nothing about React: the UI talks to it through commands + subscribe/getSnapshot.
 */
export class GameEngine {
  readonly perf = new PerfMonitor();
  private state: GameState = createGameState();
  private strategies: SimulationStrategies = DEFAULT_STRATEGIES;
  private renderer: CanvasRenderer | null = null;
  private view: RenderView = { buildType: null, hoverPad: -1, hoverValid: false, selectedTower: null };

  private rafId = 0;
  private lastFrameTime = 0;
  private accumulator = 0;

  private readonly listeners = new Set<() => void>();
  private snapshot: GameSnapshot;
  private lastPublish = 0;

  constructor() {
    this.snapshot = this.buildSnapshot();
  }

  // ---- lifecycle ----------------------------------------------------------

  attach(canvas: HTMLCanvasElement): void {
    this.renderer = new CanvasRenderer(canvas);
    this.lastFrameTime = 0;
    if (!this.rafId) this.rafId = requestAnimationFrame(this.frame);
  }

  detach(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.renderer = null;
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.renderer?.resize(cssWidth, cssHeight, dpr);
  }

  private readonly frame = (now: number): void => {
    this.rafId = requestAnimationFrame(this.frame);
    const frameMs = this.lastFrameTime ? now - this.lastFrameTime : STEP_SECONDS * 1000;
    this.lastFrameTime = now;

    const t0 = performance.now();
    if (this.state.phase === 'playing') {
      this.accumulator += Math.min(frameMs / 1000, MAX_FRAME_SECONDS) * this.state.speed;
      let steps = 0;
      while (this.accumulator >= STEP_SECONDS && steps < MAX_STEPS_PER_FRAME) {
        step(this.state, STEP_SECONDS, this.strategies);
        this.accumulator -= STEP_SECONDS;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
      this.validateSelection();
    }
    const t1 = performance.now();
    this.renderer?.render(this.state, this.view);
    const t2 = performance.now();

    // A gap this long means the tab was hidden, not that a frame was slow.
    if (frameMs < SUSPENDED_FRAME_MS) this.perf.record(frameMs, t1 - t0, t2 - t1);
    if (now - this.lastPublish >= PUBLISH_INTERVAL_MS) this.publish(now);
  };

  // ---- React bridge -------------------------------------------------------

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): GameSnapshot => this.snapshot;

  private publish(now = performance.now()): void {
    this.lastPublish = now;
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private buildSnapshot(): GameSnapshot {
    const s = this.state;
    return {
      phase: s.phase,
      speed: s.speed,
      wave: s.wave,
      totalWaves: BALANCE.totalWaves,
      waveStage: s.waveStage,
      countdown: s.waveStage === 'countdown' ? Math.max(0, s.waveTimer) : 0,
      baseHealth: s.baseHealth,
      maxHealth: BALANCE.startingHealth,
      money: s.money,
      score: s.score,
      buildType: this.view.buildType,
      selectedTower: this.view.selectedTower ? describeTower(this.view.selectedTower) : null,
      enemyCount: s.enemies.length,
      towerCount: s.towers.length,
      projectileCount: s.projectiles.length,
      perf: this.perf.stats(),
    };
  }

  // ---- commands -----------------------------------------------------------

  start(): void {
    if (this.state.phase === 'menu') this.state.phase = 'playing';
    this.perf.reset();
    this.publish();
  }

  restart(): void {
    this.state = createGameState();
    this.state.phase = 'playing';
    this.accumulator = 0;
    this.view.buildType = null;
    this.view.selectedTower = null;
    this.view.hoverPad = -1;
    this.perf.reset();
    this.publish();
  }

  togglePause(): void {
    const s = this.state;
    if (s.phase === 'playing') s.phase = 'paused';
    else if (s.phase === 'paused') s.phase = 'playing';
    this.publish();
  }

  setSpeed(speed: Speed): void {
    this.state.speed = speed;
    this.publish();
  }

  /** Skip the countdown and call the next wave immediately. */
  callNextWave(): void {
    const s = this.state;
    if (s.phase === 'playing' && s.waveStage === 'countdown') s.waveTimer = 0;
  }

  /** Selecting the active build type again cancels build mode. */
  chooseBuildType(type: TowerType | null): void {
    this.view.buildType = this.view.buildType === type ? null : type;
    if (this.view.buildType) this.view.selectedTower = null;
    this.refreshHover();
    this.publish();
  }

  upgradeSelected(): void {
    const tower = this.view.selectedTower;
    if (tower && this.isInteractive()) upgradeTower(this.state, tower);
    this.publish();
  }

  sellSelected(): void {
    const tower = this.view.selectedTower;
    if (tower && this.isInteractive()) {
      sellTower(this.state, tower);
      this.view.selectedTower = null;
    }
    this.publish();
  }

  deselect(): void {
    this.view.buildType = null;
    this.view.selectedTower = null;
    this.publish();
  }

  // ---- pointer input (CSS pixels relative to the canvas) ------------------

  pointerMove(sx: number, sy: number): void {
    if (!this.renderer) return;
    const { x, y } = this.renderer.screenToWorld(sx, sy);
    this.view.hoverPad = padAt(x, y);
    this.refreshHover();
  }

  pointerLeave(): void {
    this.view.hoverPad = -1;
  }

  /** keepBuilding: stay in build mode after placing (e.g. Shift held). */
  pointerDown(sx: number, sy: number, keepBuilding: boolean): void {
    if (!this.renderer || !this.isInteractive()) return;
    const { x, y } = this.renderer.screenToWorld(sx, sy);
    const pad = padAt(x, y);
    const view = this.view;

    const occupant = pad >= 0 ? this.state.padTowers[pad] : null;
    if (view.buildType && pad >= 0 && !occupant) {
      if (placeTower(this.state, view.buildType, pad) && !keepBuilding) view.buildType = null;
    } else {
      view.buildType = null;
      view.selectedTower = occupant;
    }
    view.hoverPad = pad;
    this.refreshHover();
    this.publish();
  }

  private isInteractive(): boolean {
    return this.state.phase === 'playing' || this.state.phase === 'paused';
  }

  private refreshHover(): void {
    const view = this.view;
    view.hoverValid = view.buildType !== null && view.hoverPad >= 0 && canPlace(this.state, view.buildType, view.hoverPad) === 'ok';
  }

  private validateSelection(): void {
    const tower = this.view.selectedTower;
    if (tower && this.state.padTowers[tower.padIndex] !== tower) this.view.selectedTower = null;
    if (this.view.buildType) this.refreshHover();
  }
}

function padAt(x: number, y: number): number {
  const half = PAD_SIZE / 2;
  for (let i = 0; i < PADS.length; i++) {
    const pad = PADS[i];
    if (Math.abs(x - pad.x) <= half && Math.abs(y - pad.y) <= half) return i;
  }
  return -1;
}

function describeTower(tower: Tower): SelectedTowerInfo {
  const stats = towerStats(tower);
  return {
    id: tower.id,
    type: tower.type,
    name: tower.def.name,
    level: tower.level + 1,
    maxLevel: tower.def.levels.length,
    damage: stats.damage,
    range: stats.range,
    shotsPerSecond: 1 / stats.interval,
    upgradeCost: upgradeCost(tower),
    sellValue: sellValue(tower),
  };
}
