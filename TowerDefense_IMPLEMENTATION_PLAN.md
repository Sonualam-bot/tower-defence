# Tower Defense — End-to-End Implementation Plan

## 0. Goal

Build a polished, fully playable browser tower-defense game using:

- **Vite**
- **React + TypeScript**
- **Tailwind CSS**
- **HTML Canvas 2D** for the game world
- **No backend / no runtime external services**

The implementation should be simple enough to reason about, but strong enough to survive the required stress case of:

- 5,000 active enemies
- 100 towers
- 1,000 active projectiles
- 45+ FPS for 95% of frames
- fewer than 5% frames above 33 ms
- stable memory through a 50-wave run

The central architectural decision is:

> **React owns the application shell and UI; a framework-independent game engine owns simulation; Canvas owns world rendering.**

Do **not** make each enemy, tower, projectile, health bar, or map tile a React component.

---

# 1. Architecture Decision

## 1.1 High-level architecture

```text
React Application Shell
│
├── HUD / Menus / Controls / Tower Panel / Wave Panel
│
└── GameScreen
      │
      └── GameCanvas
            │
            └── GameEngine
                 │
                 ├── Simulation Clock
                 ├── Wave System
                 ├── Spawn System
                 ├── Enemy Movement System
                 ├── Targeting System
                 ├── Attack System
                 ├── Projectile System
                 ├── Collision / Damage System
                 ├── Economy / Score System
                 ├── Game State System
                 └── Performance Monitor

GameEngine
   │
   ├── GameState
   ├── Entity Pools
   ├── Spatial Grid
   ├── Static Game Config
   └── Canvas Renderer
```

### Core rule

React should update from the engine; the engine should **not depend on React**.

This keeps the hot path free from React reconciliation and makes the simulation easier to test.

---

# 2. Why Canvas Instead of React DOM/SVG

The performance requirement makes this the most important rendering choice.

A DOM/SVG implementation would create thousands of independently rendered elements and would unnecessarily involve layout, style calculation, reconciliation, and DOM updates.

Canvas gives us:

- one main visual surface
- one render loop
- direct drawing commands
- easy camera/viewport culling
- no React reconciliation for entities
- straightforward object pooling
- predictable rendering architecture

### Rendering rule

```text
Simulation data → Renderer → Canvas
```

Never:

```text
Enemy array → setState() → 5000 React components → DOM updates
```

---

# 3. SOLID Principles Without Overengineering

We should use SOLID as a design discipline, **not as an excuse to create 50 classes**.

## Single Responsibility

Each system has one job.

```text
WaveSystem          → decides what wave/spawns should happen
SpawnSystem         → creates/recycles enemies
MovementSystem      → moves enemies along the path
TargetingSystem     → selects tower targets
AttackSystem        → decides when attacks happen
ProjectileSystem    → moves/resolves projectiles
DamageSystem        → applies damage/effects
EconomySystem       → currency/rewards/selling
GameStateSystem     → victory/game-over/pause state
Renderer            → draws current simulation state
PerformanceMonitor  → measures runtime performance
```

## Open/Closed

Add a new tower or enemy primarily through configuration/strategies, rather than rewriting the engine.

Example:

```ts
const towerDefinitions = {
  archer: {...},
  cannon: {...},
  frost: {...},
};
```

A new `laser` tower should not require changes to unrelated systems.

## Liskov Substitution

Avoid deep inheritance trees such as:

```text
Entity
 ├── Enemy
 │    ├── FastEnemy
 │    ├── TankEnemy
 │    └── ArmoredEnemy
```

Instead use shared data + behavior/configuration.

```ts
Enemy = {
  type,
  hp,
  maxHp,
  speed,
  armor,
  waypointIndex,
  distanceOnPath,
  ...
}
```

Different enemy behavior comes from their definition.

## Interface Segregation

Keep interfaces small.

Prefer:

```ts
interface TargetingStrategy {
  findTarget(...): EntityId | null;
}
```

instead of a giant interface containing rendering, movement, attacking, upgrading, etc.

## Dependency Inversion

The engine depends on abstractions for things that genuinely benefit from substitution:

- clock/time source
- renderer
- performance monitor
- random source (useful for deterministic tests)

Do not abstract every helper function.

---

# 4. Architecture Style: Functional Core + Imperative Shell

A large portion of the game can be written as deterministic systems/functions that consume state and mutate/update it in controlled ways.

```text
Imperative shell:
  requestAnimationFrame
  Canvas
  browser input
  audio
  deployment

Functional/domain core:
  enemy movement
  targeting
  damage
  upgrades
  wave generation
  balance formulas
  game rules
```

This gives us a strong balance between testability and implementation simplicity.

---

# 5. Suggested Project Structure

```text
src/
├── app/
│   ├── App.tsx
│   └── routes.tsx
│
├── components/
│   ├── game/
│   │   ├── GameScreen.tsx
│   │   ├── GameCanvas.tsx
│   │   └── GameOverlay.tsx
│   │
│   ├── hud/
│   │   ├── TopBar.tsx
│   │   ├── WavePanel.tsx
│   │   ├── EconomyPanel.tsx
│   │   ├── HealthPanel.tsx
│   │   └── SpeedControls.tsx
│   │
│   ├── towers/
│   │   ├── TowerPalette.tsx
│   │   ├── TowerCard.tsx
│   │   └── TowerUpgradePanel.tsx
│   │
│   ├── states/
│   │   ├── StartScreen.tsx
│   │   ├── PauseScreen.tsx
│   │   ├── GameOverScreen.tsx
│   │   └── VictoryScreen.tsx
│   │
│   └── debug/
│       └── PerformancePanel.tsx
│
├── engine/
│   ├── GameEngine.ts
│   ├── GameClock.ts
│   ├── GameState.ts
│   │
│   ├── systems/
│   │   ├── WaveSystem.ts
│   │   ├── SpawnSystem.ts
│   │   ├── EnemyMovementSystem.ts
│   │   ├── TargetingSystem.ts
│   │   ├── AttackSystem.ts
│   │   ├── ProjectileSystem.ts
│   │   ├── DamageSystem.ts
│   │   ├── EconomySystem.ts
│   │   └── GameFlowSystem.ts
│   │
│   ├── spatial/
│   │   └── SpatialGrid.ts
│   │
│   └── pooling/
│       ├── EnemyPool.ts
│       └── ProjectilePool.ts
│
├── game/
│   ├── config/
│   │   ├── towers.ts
│   │   ├── enemies.ts
│   │   ├── waves.ts
│   │   └── balance.ts
│   │
│   ├── domain/
│   │   ├── types.ts
│   │   ├── entities.ts
│   │   └── rules.ts
│   │
│   └── logic/
│       ├── targeting.ts
│       ├── damage.ts
│       ├── upgrades.ts
│       └── scoring.ts
│
├── rendering/
│   ├── CanvasRenderer.ts
│   ├── drawMap.ts
│   ├── drawEnemies.ts
│   ├── drawTowers.ts
│   ├── drawProjectiles.ts
│   └── drawEffects.ts
│
├── hooks/
│   ├── useGameEngine.ts
│   └── useGameSnapshot.ts
│
├── lib/
│   ├── math.ts
│   ├── geometry.ts
│   └── random.ts
│
├── styles/
│   └── index.css
│
└── main.tsx
```

### Important simplification

This structure looks large, but most files remain small. We are splitting by **responsibility**, not building an elaborate enterprise framework.

---

# 6. Game State Architecture

## 6.1 Engine state

The engine owns mutable simulation state.

```ts
interface GameState {
  phase: 'menu' | 'playing' | 'paused' | 'game-over' | 'victory';
  wave: number;
  baseHealth: number;
  money: number;
  score: number;
  speedMultiplier: 1 | 2 | 3;
  selectedTowerType: TowerType | null;
}
```

Separate simulation collections:

```ts
interface EnemyState { ... }
interface TowerState { ... }
interface ProjectileState { ... }
```

## 6.2 IDs, not object references everywhere

Use stable numeric IDs for active entities.

```ts
type EnemyId = number;
type TowerId = number;
type ProjectileId = number;
```

This makes recycling/pooling much easier.

---

# 7. Enemy Representation

Use compact mutable objects initially, then move the hottest fields into typed arrays only if profiling demonstrates it is necessary.

Example hot fields:

```ts
positionX
positionY
hp
maxHp
speed
waypointIndex
progress
alive
slowMultiplier
armor
```

### Data-oriented rule

Store frequently accessed data together and avoid creating garbage every frame.

Do not do this inside the update loop:

```ts
const nearby = enemies.filter(...).map(...).sort(...)
```

Prefer indexed loops and reusable scratch buffers.

---

# 8. Enemy Types

Use at least five so the gameplay feels richer than the minimum requirement.

| Enemy | Role | Key difference |
|---|---|---|
| Grunt | Basic | Balanced HP/speed |
| Runner | Fast | Low HP, high speed |
| Tank | Heavy | High HP, low speed |
| Armored | Defensive | Reduces incoming damage |
| Medic | Support | Heals nearby enemies periodically |

Optional later:

- Boss every 10 waves
- Flying enemy only if the map/tower design supports it

Do not add optional mechanics until the required loop is stable.

---

# 9. Tower Types

Use three core towers with clearly different decisions.

## Archer / Machine Gun

- low damage
- fast fire rate
- single target
- long range
- cheap

Purpose: reliable DPS and cleanup.

## Cannon

- high damage
- slow fire rate
- splash damage
- medium range
- expensive

Purpose: handle enemy clusters.

## Frost

- low direct damage
- applies slow
- medium/large range
- lower DPS

Purpose: crowd control and synergy.

### Tower configuration

```ts
interface TowerDefinition {
  type: TowerType;
  cost: number;
  range: number;
  damage: number;
  attackInterval: number;
  projectileSpeed: number;
  targetMode: TargetMode;
  effect?: TowerEffect;
}
```

Upgrades modify values rather than creating separate component trees.

---

# 10. Targeting Design

This is one of the most important performance decisions.

## Bad baseline implementation

```text
For every tower:
  scan every enemy
  calculate distance
  choose target
```

100 towers × 5,000 enemies = **500,000 distance checks per targeting pass**.

That is useful for the baseline because it gives us a visible performance bottleneck.

## Optimized implementation

Use a **uniform spatial grid**.

```text
World
┌────┬────┬────┬────┐
│    │    │    │    │
├────┼────┼────┼────┤
│    │    │    │    │
├────┼────┼────┼────┤
│    │    │    │    │
└────┴────┴────┴────┘
```

Each active enemy is indexed into one cell.

A tower only inspects cells overlapping its range.

### Why a grid

- much simpler than a quadtree
- predictable memory usage
- excellent for moving point-like entities
- easy to rebuild/update each simulation tick
- easy to debug

Do **not** introduce a quadtree unless profiling proves the uniform grid insufficient.

---

# 11. Projectile Design

The projectile system must avoid an expensive projectile-vs-all-enemies collision check.

For normal projectiles:

```text
Tower chooses target
        ↓
Projectile stores targetId
        ↓
Projectile travels toward target position
        ↓
When within hit radius → resolve damage
```

Therefore:

```text
1,000 projectiles × 5,000 enemies
```

is avoided entirely.

Area-of-effect attacks can query the spatial grid around the impact point.

---

# 12. Object Pooling

Projectile and enemy lifetime churn can create garbage collection pressure.

Do not continuously do:

```ts
projectiles.push({ ... });
projectiles.splice(...);
```

Instead:

```text
enemy pool
projectile pool
```

Lifecycle:

```text
inactive → acquire → active → deactivate → pool
```

Reuse objects/slots instead of repeatedly allocating them.

### First implementation rule

Implement a simple indexed free-list pool; do not pull in a third-party ECS library.

---

# 13. Game Loop

There must be **one** main animation loop.

```ts
requestAnimationFrame(frame)
```

No:

- timer per enemy
- timer per tower
- timer per projectile
- `setInterval` per entity
- React effect per entity

## Fixed simulation timestep

Use an accumulator.

```text
requestAnimationFrame
        ↓
accumulate real elapsed time
        ↓
run fixed simulation steps, e.g. 1/60 sec
        ↓
render once
```

This keeps game behavior consistent on 60 Hz, 120 Hz, and other refresh rates.

Speed controls change simulation time, not the browser's animation frequency.

Example:

```text
1x → normal simulation delta
2x → 2 × simulation delta
3x → 3 × simulation delta
```

But still keep an upper cap on catch-up steps to avoid a spiral of death.

---

# 14. Render Loop vs Simulation Loop

Conceptually:

```text
                ┌───────────────┐
                │ requestAF     │
                └───────┬───────┘
                        ↓
               calculate elapsed
                        ↓
              ┌─────────────────┐
              │ Fixed simulation│
              │  60 Hz target   │
              └────────┬────────┘
                       ↓
              ┌─────────────────┐
              │ Canvas render   │
              │ current state   │
              └─────────────────┘
```

Rendering may happen at 60/120/144 Hz while simulation remains deterministic.

---

# 15. Canvas Rendering Strategy

## Static layer

Draw once or only when the map changes:

- background
- path
- build pads
- decorations
- base

Potentially cache this using an offscreen canvas.

## Dynamic layer

Draw every frame:

- enemies
- tower range highlight
- towers
- projectiles
- damage numbers/effects
- selection indicators

## Visibility culling

Only draw objects that intersect the current visible viewport.

At 5,000 enemies, this ensures rendering cost does not scale with objects outside the visible area.

---

# 16. Rendering Quality

The game should feel polished, not like a benchmark.

Visual priorities:

- clear path contrast
- distinct tower silhouettes
- different enemy silhouettes/colors
- enemy HP bars only when useful
- projectile trails
- hit feedback
- tower attack animation
- damage flashes
- placement preview
- invalid-placement feedback
- wave countdown
- satisfying upgrade/sell feedback
- win/loss transitions

Avoid expensive particle systems until the core game is stable.

---

# 17. Placement System

The map should contain predefined buildable zones.

This is simpler and more reliable than allowing completely arbitrary placement.

Flow:

```text
Click tower type
      ↓
Hover build pad
      ↓
Show preview + range
      ↓
Green = valid / red = invalid
      ↓
Click
      ↓
Deduct money
      ↓
Create tower
```

This makes placement understandable and prevents path-blocking complexity.

---

# 18. Upgrade + Sell System

Each tower has 3–4 upgrade levels.

Example:

```text
Level 1
Level 2
Level 3
Level 4
```

Upgrade changes:

- damage
- range
- attack speed
- special effect

Selling returns a percentage of total investment.

All of these rules should live in `game/logic/upgrades.ts`, not UI components.

---

# 19. Wave System

Need at least 50 waves.

Do not manually author 50 unrelated wave definitions.

Generate waves from predictable rules.

Example scaling:

```text
enemyCount = baseCount + wave * countGrowth
hpMultiplier = 1 + wave * hpGrowth
speedMultiplier = 1 + wave * speedGrowth
```

Then unlock enemy types progressively.

Example:

| Waves | New difficulty |
|---|---|
| 1–5 | Grunts |
| 6–10 | Runners |
| 11–20 | Tanks |
| 21–30 | Armored |
| 31–40 | Medics |
| 41–49 | Mixed high-density waves |
| 50 | Final boss / heavy final wave |

Every 10th wave can be a difficulty spike.

---

# 20. Game Flow

```text
START
  ↓
Wave countdown
  ↓
Spawn wave
  ↓
Enemies travel
  ↓
Towers attack
  ↓
Enemies die → money + score
  ↓
Enemy reaches base → health - damage
  ↓
If health <= 0 → GAME OVER
  ↓
If wave complete and wave < 50 → next wave
  ↓
If wave 50 complete → VICTORY
```

---

# 21. Pause / Restart / Speed Controls

UI controls:

```text
Pause | 1x | 2x | 3x | Restart
```

Pause must stop simulation time while leaving the UI interactive.

Restart should create a fresh engine state rather than attempting to mutate every field back manually.

---

# 22. React Responsibilities

React is responsible for:

- start screen
- game HUD
- tower palette
- selected tower panel
- upgrade/sell controls
- wave counter
- money
- health
- score
- pause menu
- game-over screen
- victory screen
- debug/performance panel

React is **not** responsible for:

- moving enemies
- calculating projectile positions
- tower targeting
- per-frame entity rendering
- collision loops

---

# 23. Dumb / Presentational Components

Most UI components should receive props and emit callbacks.

Example:

```tsx
<TowerCard
  definition={tower}
  canAfford={money >= tower.cost}
  onSelect={onSelectTower}
/>
```

The card does not know how the engine works.

Similarly:

```tsx
<SpeedControls
  speed={speed}
  paused={paused}
  onPause={pause}
  onSpeedChange={setSpeed}
/>
```

This keeps UI reusable and testable.

---

# 24. Engine ↔ React Bridge

Do not call `setState()` every frame.

Instead expose a small snapshot API.

```ts
interface GameSnapshot {
  wave: number;
  money: number;
  health: number;
  score: number;
  phase: GamePhase;
  selectedTowerId: TowerId | null;
  fps: number;
  frameTimeMs: number;
}
```

The engine publishes UI snapshots at a modest rate such as 8–15 times/sec, while Canvas continues rendering at the normal frame rate.

This prevents the HUD from becoming another per-frame React workload.

---

# 25. Input Handling

Canvas handles world interactions:

- click build pad
- select tower
- sell
- upgrade
- placement preview

React controls handle UI interactions:

- pause
- restart
- speed
- tower selection
- menus

Convert pointer coordinates to world coordinates once per input event.

Do not attach separate event listeners to individual entities.

---

# 26. Performance Measurement Architecture

Build performance measurement **before optimizing**.

The debug panel should display:

```text
FPS: 58
Frame: 17.1 ms
Simulation: 6.4 ms
Rendering: 5.7 ms
Enemies: 5,000
Towers: 100
Projectiles: 1,000
Memory: ~X MB (when available)
```

Also record:

- average FPS
- p95 frame time
- percentage of frames > 33 ms
- entity counts
- simulation time
- render time

---

# 27. Benchmark Protocol

Every optimization must use the **same benchmark scenario**.

Recommended scenario:

```text
Enemies: 5,000
Towers: 100
Projectiles: 1,000
Map: same
Camera: same
Browser: same
Device: same
Power mode: same
```

Warm up for 10 seconds, then record 30–60 seconds.

Run the benchmark multiple times and report the median/representative run rather than cherry-picking the best frame.

### Metrics

Record:

1. FPS
2. p95 frame time
3. % frames > 33 ms
4. simulation time/frame
5. render time/frame
6. memory trend when possible
7. maximum stable entity counts

---

# 28. Optimization Roadmap

## Version 0 — Naive baseline

Intentionally build the straightforward implementation first.

Likely characteristics:

- enemy objects
- projectile objects
- brute-force tower targeting
- no spatial index
- no pooling
- simple loops

This is important because the assignment explicitly asks the video to show where the initial implementation breaks.

Tag it:

```text
git tag baseline
```

Run the stress scenario and capture the breaking point.

---

## Optimization 1 — Spatial Grid

Replace tower-vs-all-enemy scans with spatial partitioning.

Expected benefit:

```text
O(towers × enemies)
```

toward something closer to:

```text
O(towers × localCandidates)
```

This should be the **first optimization shown in the first 30 seconds of the demo video** because the difference can be demonstrated immediately.

Record before/after numbers live.

---

## Optimization 2 — Object Pooling

Pool:

- enemies
- projectiles
- temporary effects

Goal:

- reduce allocation churn
- reduce garbage collection spikes
- stabilize long runs

---

## Optimization 3 — Avoid Per-Frame Allocations

Remove hot-loop patterns such as:

- `map`
- `filter`
- `reduce`
- `sort`
- spread copies
- temporary object creation
- temporary arrays

Use indexed `for` loops in simulation/rendering hot paths.

Reusable scratch arrays are allowed.

---

## Optimization 4 — Projectile Targeting

Use target IDs instead of broad collision detection.

Only search the spatial grid for AoE impacts.

---

## Optimization 5 — Render Culling + Static Layer Cache

Cache static map content.

Cull off-screen dynamic entities.

This ensures rendering cost is driven primarily by visible entities.

---

## Optimization 6 — Hot Data Compaction

Only do this if profiling says JS object overhead is actually the bottleneck.

Potential move:

```text
Array<EnemyObject>
```

toward:

```text
Float32Array / Int32Array / Uint8Array
```

for the hottest fields.

Do **not** start here. It makes the code less readable and should be earned by profiling.

---

# 29. Profiling Strategy

Use browser DevTools rather than guessing.

Main profiling tools:

- Performance panel
- CPU flame chart
- Memory panel
- JS heap snapshots
- FPS meter / custom telemetry

Look for:

```text
1. TargetingSystem
2. Rendering
3. ProjectileSystem
4. Garbage collection
5. React commits
```

Optimize the biggest measured bottleneck first.

---

# 30. Memory Stability Plan

For a complete 50-wave run:

- reuse enemies
- reuse projectiles
- avoid listener accumulation
- avoid unbounded event logs
- avoid storing every historical frame
- clear dead references
- avoid creating closures in hot loops
- avoid retaining canvas image data unnecessarily

Memory should not continuously climb because of game events.

---

# 31. Determinism / Refresh Rate Testing

Test at:

- 60 Hz
- 120 Hz if available
- throttled CPU if useful

The simulation should use fixed time steps so that:

```text
same input + same simulation time
→ same game result
```

The number of rendered frames should not alter enemy speed, attack speed, or wave timing.

---

# 32. Testing Strategy

Do not attempt exhaustive game testing.

Focus on domain rules.

## Unit tests

Test:

- enemy movement along path
- damage calculation
- armor reduction
- frost slow
- tower upgrades
- tower selling
- wave generation
- reward calculation
- base damage
- game-over condition
- victory condition

## Manual tests

Verify:

- placement
- selection
- upgrade
- sell
- pause
- restart
- speed changes
- 50-wave completion
- browser resize
- different refresh rates
- stress benchmark

---

# 33. Balance Strategy

Do not hand-tune every wave individually.

Tune a few global parameters:

```ts
const balance = {
  startingMoney,
  startingHealth,
  hpGrowth,
  countGrowth,
  speedGrowth,
  killReward,
  sellRefundPercent,
  bossMultiplier,
};
```

Then simulate several waves and adjust.

Target experience:

```text
Waves 1–10  → learn
Waves 11–20 → build optimization
Waves 21–35 → real pressure
Waves 36–49 → high-density strategy
Wave 50      → climax
```

---

# 34. Visual Design Direction

Aim for a polished modern strategy-game dashboard rather than a generic coding demo.

Suggested visual hierarchy:

```text
┌─────────────────────────────────────────────────────┐
│ HEALTH   WAVE 24/50   SCORE      MONEY      1x  II │
├───────────────────────────────────────┬─────────────┤
│                                       │   TOWERS    │
│              GAME MAP                 │             │
│                                       │ Archer      │
│        path → → → → → base            │ Cannon      │
│                                       │ Frost       │
│                                       │             │
├───────────────────────────────────────┴─────────────┤
│ Selected tower details / upgrade / sell / messages │
└─────────────────────────────────────────────────────┘
```

Responsive behavior should preserve the playable area rather than letting controls cover the map.

---

# 35. Accessibility / UX Basics

Include:

- keyboard-friendly buttons where practical
- clear selected states
- visible disabled states
- readable text contrast
- tooltips for tower stats
- clear pause state
- no color-only meaning for critical states

Do not spend excessive time on this, but make the interface understandable.

---

# 36. No External Runtime Services

The game itself should work after the page loads without:

- backend APIs
- database
- authentication
- external game servers
- remote asset APIs

Use local/static assets bundled by Vite.

Deployment can still be on Vercel/Netlify/Cloudflare/etc.

---

# 37. Deployment Plan

Preferred:

```text
GitHub → Vercel
```

Steps:

```text
npm run build
npm run preview
```

Then connect repository to Vercel.

Verify:

- direct page load
- refresh
- game starts
- 50 waves can run
- debug/performance panel works
- no console errors
- production build behaves like local build

Save deployed URL in README.

---

# 38. README Requirements

The final README should contain exactly the evidence the evaluator cares about.

Recommended sections:

```md
# Tower Defense

## Live Demo

## Demo Video

## Features

## Architecture

## Rendering Approach

## Game Loop

## Performance Bottlenecks

## Optimizations

## Benchmark Methodology

## Results

## Design Decisions

## Tradeoffs

## Local Development

## Deployment
```

The README should explain **why** each major decision was made, not merely list technologies.

---

# 39. NUMBERS.md Requirements

Keep a separate root-level file:

```text
NUMBERS.md
```

Template:

| Version | Optimization | Enemies | Towers | Projectiles | FPS | p95 frame | >33ms frames | Memory trend | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| Baseline | None | TBD | TBD | TBD | TBD | TBD | TBD | TBD | Initial breaking point |
| V1 | Spatial grid | TBD | TBD | TBD | TBD | TBD | TBD | TBD | Targeting optimized |
| V2 | Pooling | TBD | TBD | TBD | TBD | TBD | TBD | TBD | GC reduced |
| V3 | Allocation cleanup | TBD | TBD | TBD | TBD | TBD | TBD | TBD | Hot loops cleaned |
| V4 | Rendering culling/cache | TBD | TBD | TBD | TBD | TBD | TBD | TBD | Final candidate |
| Final | All accepted optimizations | TBD | TBD | TBD | TBD | TBD | TBD | TBD | Production build |

### Important

Never invent these numbers.

Generate them live from the browser and copy the measured results into this file.

---

# 40. Demo Video Plan (3–4 Minutes)

The evaluator specifically wants the optimization journey, not merely the finished game.

## 0:00–0:30 — Mandatory before/after

Show the browser with the **baseline implementation** under stress.

Example sequence:

```text
Open debug panel
Set enemies/towers/projectiles high
Show FPS/frame time falling
Increase until visible break point

Then switch to spatial-grid implementation
Run the same scenario
Show FPS/frame-time improvement visually
```

Do not merely say “it became faster.” Show the browser telemetry changing.

## 0:30–1:20 — Explain the bottleneck

Explain:

- brute-force targeting
- 100 towers × many enemies
- unnecessary projectile collision checks
- allocation pressure

Keep the explanation visual and simple.

## 1:20–2:20 — Optimization walkthrough

Show:

1. spatial grid
2. pooling
3. allocation cleanup
4. culling/static rendering

For each meaningful optimization:

```text
before benchmark
→ change
→ after benchmark
```

Record the numbers in `NUMBERS.md`.

## 2:20–3:20 — Final game

Play normally:

- place towers
- upgrade
- sell
- speed up
- defeat waves
- show score/money/health

## 3:20–4:00 — Final stress test + conclusion

Show final limits achieved.

Then briefly summarize:

- architecture
- biggest bottleneck
- largest optimization win
- final stress capacity
- deployed URL

### Face requirement

Keep your camera/webcam visible while speaking in English.

---

# 41. Development Order

This exact order prevents getting stuck polishing a broken core.

## Phase 1 — Bootstrap

```text
Vite + React + TS
Tailwind
Canvas screen
basic layout
```

## Phase 2 — Core game loop

```text
GameEngine
requestAnimationFrame
fixed timestep
pause
speed
restart
```

## Phase 3 — Enemy pathing

```text
path
enemy spawn
movement
base damage
```

## Phase 4 — Towers

```text
tower placement
tower selection
targeting
auto attack
projectiles
damage
```

## Phase 5 — Economy

```text
money
kill reward
upgrade
sell
score
```

## Phase 6 — Waves

```text
wave generator
1–50 scaling
enemy variety
victory
game over
```

## Phase 7 — Baseline benchmark

Before optimizing, deliberately benchmark the naive version.

Create the first `NUMBERS.md` row.

## Phase 8 — Performance optimization

```text
spatial grid
pooling
allocation cleanup
projectile target IDs
culling/static cache
```

Benchmark after each major change.

## Phase 9 — Polish

```text
visual effects
animations
sounds if available locally
better HUD
placement feedback
transitions
```

## Phase 10 — Final verification

```text
50 waves
stress scenario
memory stability
refresh-rate consistency
build
production deploy
README
NUMBERS.md
video
```

---

# 42. 8-Hour Execution Plan

The assignment gives an 09:00–17:00 window, so time discipline matters.

| Time | Goal |
|---|---|
| 09:00–09:25 | Architecture + setup |
| 09:25–10:15 | Canvas + game loop + input |
| 10:15–11:00 | Enemy movement + path + base |
| 11:00–12:00 | Towers + targeting + projectiles |
| 12:00–12:30 | Economy + upgrade + sell |
| 12:30–13:00 | Waves + win/loss |
| 13:00–13:25 | Baseline stress benchmark |
| 13:25–14:30 | Spatial grid + pooling + allocation cleanup |
| 14:30–15:00 | Rendering culling + cache |
| 15:00–15:45 | UI polish + gameplay balance |
| 15:45–16:15 | Final stress testing + NUMBERS.md |
| 16:15–16:35 | Production build + deployment |
| 16:35–17:00 | README + video capture/submission |

### Priority rule

When behind schedule:

```text
Gameplay correctness
    > performance
    > required UI
    > polish
    > optional features
```

Never sacrifice the playable 50-wave loop for visual extras.

---

# 43. What I Would Do Differently From a Naive React Implementation

The tempting implementation is:

```text
Enemy component × 5,000
Tower component × 100
Projectile component × 1,000
React state updated every frame
```

Do not do this.

The stronger implementation is:

```text
React
  ↓
UI only

Canvas
  ↓
GameRenderer

GameEngine
  ↓
Systems operating on plain data
  ↓
Pools + spatial grid
```

This gives us both:

- clean component separation
- performance appropriate for a simulation-heavy game

---

# 44. What Should NOT Be Added

Avoid these unless the benchmark proves they are needed:

- Redux
- full ECS framework
- RxJS/event-bus architecture
- Web Workers
- WebGL
- physics engine
- pathfinding library
- backend service
- multiplayer
- procedural map generation
- complex dependency injection container

These add cognitive overhead without helping the required deliverable early.

Canvas 2D + a lightweight custom engine is the sweet spot.

---

# 45. Recommended Improvement to the User's Initial Architecture Idea

Your React + TypeScript + Tailwind choice is good.

The main thing I would change is this:

> **Do not try to make the game architecture “React-first.” Make it “engine-first with a React shell.”**

Still keep components dumb and representational, but move the actual game into a standalone domain/engine layer.

That gives us loose coupling:

```text
UI can change without changing the game engine

Canvas renderer can change without changing simulation

Game rules can change without changing React

Performance optimizations can happen without touching most UI code
```

This is much stronger than attempting to satisfy SOLID by creating many React components/classes.

---

# 46. Final Acceptance Checklist

## Gameplay

- [ ] Game starts
- [ ] 50 waves exist
- [ ] At least 3 tower types
- [ ] At least 4 enemy types
- [ ] Towers auto-target and attack
- [ ] Enemies follow path
- [ ] Tower placement works
- [ ] Tower upgrades work
- [ ] Tower selling works
- [ ] Player health works
- [ ] Currency works
- [ ] Score works
- [ ] Victory state works
- [ ] Game-over state works
- [ ] Pause works
- [ ] Restart works
- [ ] 1x / 2x / 3x speed works
- [ ] Difficulty increases progressively

## Performance

- [ ] 5,000 enemies tested
- [ ] 100 towers tested
- [ ] 1,000 projectiles tested
- [ ] 45+ FPS target evaluated
- [ ] p95 frame time recorded
- [ ] >33 ms percentage recorded
- [ ] memory trend checked
- [ ] off-screen rendering is culled
- [ ] no per-entity timers
- [ ] no per-entity React components
- [ ] fixed timestep verified

## Deliverables

- [ ] deployed URL
- [ ] README.md
- [ ] NUMBERS.md
- [ ] 2–5 minute demo video
- [ ] face visible
- [ ] English narration
- [ ] initial breaking point shown
- [ ] first optimization before/after shown in first 30 sec
- [ ] each major optimization benchmarked
- [ ] final stress limit shown

---

# 47. Final Engineering Principles

1. **Keep React out of the hot path.**
2. **Start with the simplest correct implementation.**
3. **Create a baseline before optimizing.**
4. **Profile before changing architecture.**
5. **Use one animation loop.**
6. **Use fixed-step simulation.**
7. **Use a spatial grid for local queries.**
8. **Pool high-churn entities.**
9. **Do not allocate inside hot loops.**
10. **Cull work that cannot affect the visible result.**
11. **Keep game rules independent from rendering/UI.**
12. **Use configuration/composition before inheritance.**
13. **Every optimization needs before/after numbers.**
14. **Polish the required gameplay loop before adding fancy features.**
15. **Let measured bottlenecks—not assumptions—drive the final architecture.**

---

# 48. First Coding Session Checklist

Start here and do not jump around:

```text
[ ] npm create vite@latest tower-defense -- --template react-ts
[ ] install Tailwind
[ ] remove default Vite demo
[ ] create full-screen GameScreen
[ ] create GameCanvas
[ ] create GameEngine
[ ] implement one requestAnimationFrame loop
[ ] implement fixed timestep
[ ] draw map/path
[ ] spawn one enemy
[ ] move enemy along path
[ ] make enemy reach base
[ ] display health
[ ] add one tower
[ ] make tower target enemy
[ ] add one projectile
[ ] damage enemy
```

Once this vertical slice works, expand it horizontally into the complete game.

---

# 49. The Core Vertical Slice

The most important milestone is:

```text
PLACE TOWER
    ↓
TOWER TARGETS ENEMY
    ↓
PROJECTILE HITS
    ↓
ENEMY DIES
    ↓
MONEY INCREASES
    ↓
NEXT ENEMY SPAWNS
    ↓
WAVE COMPLETES
```

When this works, the project is structurally alive.

Everything after that is scale, variety, polish, and optimization.

