/** Anything that travels along the path: its distance plus a cached segment index. */
export interface PathFollower {
  dist: number;
  seg: number;
  x: number;
  y: number;
}

/**
 * A polyline path with precomputed cumulative lengths, so an enemy's position is
 * fully described by one number (distance travelled) and lookup is O(1) amortised.
 */
export class PathGeometry {
  readonly xs: number[];
  readonly ys: number[];
  /** cum[i] = distance from the start to point i. */
  readonly cum: number[];
  readonly length: number;

  constructor(points: ReadonlyArray<readonly [number, number]>) {
    if (points.length < 2) throw new Error('Path needs at least two points');
    this.xs = points.map((p) => p[0]);
    this.ys = points.map((p) => p[1]);
    this.cum = [0];
    for (let i = 1; i < points.length; i++) {
      const dx = this.xs[i] - this.xs[i - 1];
      const dy = this.ys[i] - this.ys[i - 1];
      this.cum.push(this.cum[i - 1] + Math.hypot(dx, dy));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  /** Updates f.x/f.y (and f.seg) from f.dist. Followers only move forward, so seg never rewinds. */
  place(f: PathFollower): void {
    const cum = this.cum;
    const last = cum.length - 2;
    let seg = f.seg;
    while (seg < last && f.dist > cum[seg + 1]) seg++;
    f.seg = seg;
    const segLen = cum[seg + 1] - cum[seg];
    const t = segLen > 0 ? Math.min(1, Math.max(0, (f.dist - cum[seg]) / segLen)) : 0;
    f.x = this.xs[seg] + (this.xs[seg + 1] - this.xs[seg]) * t;
    f.y = this.ys[seg] + (this.ys[seg + 1] - this.ys[seg]) * t;
  }

  /** Shortest distance from a point to the path. Used at load time only. */
  distanceTo(px: number, py: number): number {
    let best = Infinity;
    for (let i = 0; i < this.xs.length - 1; i++) {
      const ax = this.xs[i];
      const ay = this.ys[i];
      const bx = this.xs[i + 1];
      const by = this.ys[i + 1];
      const abx = bx - ax;
      const aby = by - ay;
      const lenSq = abx * abx + aby * aby;
      const t = lenSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq)) : 0;
      const d = Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
      if (d < best) best = d;
    }
    return best;
  }
}
