# Performance numbers

All rows are measured live in the browser with the in-game benchmark. Nothing here is estimated.

**How to reproduce:** open the perf panel (`` ` ``), click **Stress test**, set the toggles, click **Record 20s**
(5 s warm-up + 20 s recording), then click the generated row to copy it here.

Scene (identical for every row): 5,000 enemies looping the path, 100 max-level towers (archer / cannon / frost),
≈1,000 projectiles in flight, 1x speed, same map, production build (`npm run build && npm run preview`).

Machine: _fill in (CPU, browser, display Hz, power mode)_

| Version | Enemies | Towers | Avg projectiles | FPS | p95 frame | >33 ms frames | Sim / frame | Render / frame | Heap (start→end) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| _paste rows from the panel_ | | | | | | | | | |

Row label = which optimizations were on:

1. `brute-force + naive render` — baseline: every tower scans all 5,000 enemies; one fill + style change per enemy.
2. `grid + naive render` — spatial grid for targeting and splash.
3. `grid + batched render` — final: one canvas path per enemy type, batched HP bars and projectiles.

## Development-time observation (not a formal row)

First baseline run on the dev build: 28 FPS, p95 73.5 ms, 44 % of frames > 33 ms, simulation 13.7 ms/frame,
render 6.1 ms/frame with 5,000 enemies, 100 towers, 988 projectiles. Simulation (targeting) was the largest cost.
