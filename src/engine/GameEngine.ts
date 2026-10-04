import { BALANCE } from '../config/balance';
import { PAD_SIZE, PADS } from '../config/map';
import type { TowerType } from '../config/towers';
import { CanvasRenderer, type RenderView } from '../render/CanvasRenderer';
import { PerfMonitor, type PerfStats } from './PerfMonitor';
import { canPlace, placeTower, sellTower, sellValue, towerStats, upgradeCost, upgradeTower } from './rules';
import { BENCHMARK, createBenchmarkState } from './benchmark';
import { DEFAULT_STRATEGIES, STEP_SECONDS, step, strategiesFor, type SimulationStrategies } from './simulate';
import { SpatialGrid } from './SpatialGrid';
import { createPools } from './entities';
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

export interface EngineOptions {
  spatialGrid: boolean;
  pooling: boolean;
  batchedRender: boolean;
}

export interface BenchmarkStatus {
  active: boolean;
  /** 'warmup' | 'recording' while a measurement runs, else 'idle'. */
  stage: 'idle' | 'warmup' | 'recording';
  secondsLeft: number;
  /** Markdown row for NUMBERS.md from the last finished recording. */
  lastRow: string | null;
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
  options: EngineOptions;
  benchmark: BenchmarkStatus;
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

  private options: EngineOptions = { spatialGrid: false, pooling: false, batchedRender: false };
  private readonly grid = new SpatialGrid();
  private bench = { stage: 'idle' as BenchmarkStatus['stage'], until: 0, lastRow: null as string | null };
  private readonly rec = {
    frame: new Float64Array(BENCHMARK.recordSeconds * 300),
    sim: new Float64Array(BENCHMARK.recordSeconds * 300),
    render: new Float64Array(BENCHMARK.recordSeconds * 300),
    count: 0,
    projectiles: 0,
    heapStart: 0,
  };

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
    this.renderer.batched = this.options.batchedRender;
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
    if (frameMs < SUSPENDED_FRAME_MS) {
      this.perf.record(frameMs, t1 - t0, t2 - t1);
      this.trackBenchmark(now, frameMs, t1 - t0, t2 - t1);
    }
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
      options: { ...this.options },
      benchmark: {
        active: s.benchmark,
        stage: this.bench.stage,
        secondsLeft: this.bench.stage === 'idle' ? 0 : Math.max(0, (this.bench.until - performance.now()) / 1000),
        lastRow: this.bench.lastRow,
      },
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
    this.applyPooling();
    this.bench.stage = 'idle';
    this.accumulator = 0;
    this.view.buildType = null;
    this.view.selectedTower = null;
    this.view.hoverPad = -1;
    this.perf.reset();
    this.publish();
  }

  setOption(key: keyof EngineOptions, value: boolean): void {
    this.options[key] = value;
    this.strategies = strategiesFor(this.options.spatialGrid ? this.grid : null);
    this.applyPooling();
    if (this.renderer) this.renderer.batched = this.options.batchedRender;
    this.perf.reset();
    this.publish();
  }

  private applyPooling(): void {
    if (!this.options.pooling) this.state.pools = null;
    else if (!this.state.pools) this.state.pools = createPools();
  }

  /** Loads the fixed stress scene (5,000 enemies, 100 towers, ~1,000 projectiles). */
  startStressTest(): void {
    this.state = createBenchmarkState();
    this.applyPooling();
    this.accumulator = 0;
    this.view.buildType = null;
    this.view.selectedTower = null;
    this.bench.stage = 'idle';
    this.perf.reset();
    this.publish();
  }

  /** Warm up, then record every frame for a fixed window and produce a NUMBERS.md row. */
  recordBenchmark(): void {
    if (!this.state.benchmark) this.startStressTest();
    this.bench.stage = 'warmup';
    this.bench.until = performance.now() + BENCHMARK.warmupSeconds * 1000;
    this.publish();
  }

  private trackBenchmark(now: number, frameMs: number, simMs: number, renderMs: number): void {
    const bench = this.bench;
    if (bench.stage === 'idle') return;
    const rec = this.rec;
    if (bench.stage === 'warmup') {
      if (now < bench.until) return;
      bench.stage = 'recording';
      bench.until = now + BENCHMARK.recordSeconds * 1000;
      rec.count = 0;
      rec.projectiles = 0;
      rec.heapStart = this.perf.stats().heapMb ?? 0;
      return;
    }
    if (rec.count < rec.frame.length) {
      rec.frame[rec.count] = frameMs;
      rec.sim[rec.count] = simMs;
      rec.render[rec.count] = renderMs;
      rec.count++;
      rec.projectiles += this.state.projectiles.length;
    }
    if (now >= bench.until) {
      bench.stage = 'idle';
      bench.lastRow = this.summarizeRecording();
      console.log('[benchmark]', bench.lastRow);
    }
  }

  private summarizeRecording(): string {
    const rec = this.rec;
    const n = Math.max(1, rec.count);
    let frameSum = 0;
    let simSum = 0;
    let renderSum = 0;
    let slow = 0;
    for (let i = 0; i < n; i++) {
      frameSum += rec.frame[i];
      simSum += rec.sim[i];
      renderSum += rec.render[i];
      if (rec.frame[i] > 33.4) slow++;
    }
    const sorted = rec.frame.slice(0, n).sort();
    const p95 = sorted[Math.min(n - 1, Math.floor(n * 0.95))];
    const heapEnd = this.perf.stats().heapMb;
    const memory = heapEnd === null ? 'n/a' : `${rec.heapStart.toFixed(0)}→${heapEnd.toFixed(0)} MB`;
    const label = [
      this.options.spatialGrid ? 'grid' : 'brute-force',
      this.options.pooling ? 'pooling' : 'no pooling',
      this.options.batchedRender ? 'batched render' : 'naive render',
    ].join(' + ');
    const cells = [
      label,
      this.state.enemies.length,
      this.state.towers.length,
      Math.round(rec.projectiles / n),
      (1000 / (frameSum / n)).toFixed(1),
      `${p95.toFixed(1)} ms`,
      `${((slow / n) * 100).toFixed(1)} %`,
      `${(simSum / n).toFixed(2)} ms`,
      `${(renderSum / n).toFixed(2)} ms`,
      memory,
    ];
    return `| ${cells.join(' | ')} |`;
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
