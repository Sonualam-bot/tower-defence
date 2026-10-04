# Tower Defense

A browser tower-defense game built with Vite, React, TypeScript, Tailwind and Canvas 2D. No backend.

- **Live demo:** _add deployed URL_
- **Demo video:** _add Loom link_
- **Measured performance:** see [NUMBERS.md](NUMBERS.md)

## Features

- 3 towers: **Archer** (fast, single target), **Cannon** (splash), **Frost** (slows). 4 upgrade levels each, sell for 70% refund.
- 6 enemies: Grunt, Runner (fast), Tank (high HP, armor), Armored (heavy armor), Medic (heals nearby enemies), Warlord boss every 10th wave.
- 50 generated waves: enemy count, HP and spawn rate scale with the wave; new enemy types unlock at waves 4, 8, 12 and 16.
- Health, gold, score, victory and game over. Pause, 1x/2x/3x speed, restart, call the next wave early.
- Controls: `1` `2` `3` choose a tower · click a pad to build (Shift keeps building) · click a tower to select it · `U` upgrade · `S` sell · `Space` pause · `N` next wave · `` ` `` performance panel.

## Architecture

```
React (HUD, menus, tower panel)  ──commands──▶  GameEngine  ──▶  CanvasRenderer ──▶ <canvas>
          ▲                                       │
          └──── snapshot ~10 Hz (useSyncExternalStore) ┘
```

- **`src/engine`** owns the simulation and knows nothing about React. Systems are plain functions over a
  `GameState`: waves → movement → targeting/attack → projectiles → cleanup. Game rules (damage, armor, rewards,
  upgrades, selling) are pure functions in `rules.ts` and covered by Vitest.
- **`src/render`** draws the state onto one canvas. No enemy, tower or projectile is a React component.
- **`src/ui`** holds presentational React components: props in, callbacks out.
- **`src/config`** has towers, enemies, waves, map and balance as data. A new tower or enemy is a config entry.

### Why Canvas instead of DOM or SVG
5,000 enemies as DOM nodes would put layout, style and React reconciliation on the hot path. Canvas is a single
surface drawn by one loop, so its cost grows only with the drawing work itself.

### Game loop
There is one `requestAnimationFrame` loop. Simulation runs in **fixed 1/60 s steps** using an accumulator, so
enemy speed, fire rate and wave timing don't change with the display refresh rate (60, 120 or 144 Hz). The speed
setting runs more fixed steps per frame, with a cap on catch-up steps. Rendering happens once per frame. React gets
a snapshot about 10 times per second, never every frame.

## Performance work

Each optimization is a **runtime toggle** in the performance panel. The baseline and the optimized version run in
the same build on the same scene, so before/after comparisons are like for like.

| # | Bottleneck | Fix |
|---|---|---|
| 1 | Targeting: 100 towers × 5,000 enemies = 500k distance checks per tick | **Uniform spatial grid** (64 px cells) rebuilt each tick with a counting sort into flat typed arrays. No allocation, O(n) rebuild. Each tower only scans cells that overlap its range. Cannon splash uses the same grid. |
| 2 | Rendering: a `fillStyle` change and a `fill()` per enemy (~15k canvas calls per frame) | **Batched rendering**: one path and one fill per enemy type, and batched HP bars and projectiles. |
| — | Projectile collision (1,000 × 5,000) | Avoided by design: projectiles home on a stored target (`target` + `targetId`, so a recycled enemy object can't be hit by mistake). Only splash queries other enemies, and only on impact. |
| 3 | GC pressure: the stress scene fires ~1,000 projectiles/s, each a new object | **Object pooling** for enemies, projectiles and effects. Dead objects go to a free list and are re-initialized in place. A recycled enemy gets a new `id`, so stale `targetId`s are detected. |
| — | Allocation in hot loops | Indexed `for` loops with no `map`, `filter` or closures. Swap-remove instead of `splice`. Telemetry uses fixed-size ring buffers. |

**Built-in benchmark:** *Stress test* loads 5,000 enemies that loop the path and can't die, 100 towers and about
1,000 projectiles. *Record 20s* warms up for 5 s, records every frame for 20 s, and outputs a `NUMBERS.md` row:
FPS, p95 frame time, % of frames over 33 ms, simulation and render time, and heap trend.

## Polish
- Placement preview with range circle: green if valid, red ✕ if invalid. Tower recoil on firing. Level pips on each tower.
- Explosion rings for cannon splash, death pops on kills, white hit flash on damaged enemies, and a blue rim on slowed ones.
- Each enemy looks different: a steel rim for armored, a red cross for medics, a dark core for tanks, a gold ring for the boss.
- A "Wave N" banner that names newly unlocked enemies or warns of a boss. The screen edge pulses red when the base takes damage.

## Tradeoffs
- **No culling.** The map always fits the screen, so everything is on screen and culling would save nothing.
- **Simple data layout.** Enemies are plain objects rather than typed arrays (struct of arrays). That's simpler to
  read, and profiling didn't call for more.
- **Medic heal scans all enemies.** Medics are rare in normal waves; this would move to the grid if they became common.

## Local development
```bash
npm install
npm run dev       # http://localhost:5173
npm test          # domain-rule unit tests
npm run build && npm run preview   # production build (use this for benchmark numbers)
```

## Deployment
It's a static site: `npm run build` outputs `dist/`. Deploy to Vercel with `npx vercel --prod`, or connect the
GitHub repo. Framework preset: Vite.
