export interface PerfStats {
  fps: number;
  /** Average interval between displayed frames, ms. */
  frameMs: number;
  p95FrameMs: number;
  /** Percent of frames whose interval exceeded 33 ms. */
  slowFramePct: number;
  simMs: number;
  renderMs: number;
  /** Used JS heap in MB (Chrome only), or null. */
  heapMb: number | null;
}

const WINDOW = 300; // ~5 s at 60 Hz

interface ChromeMemory {
  memory?: { usedJSHeapSize: number };
}

/**
 * Fixed-size ring buffers of per-frame timings. Records never allocate;
 * stats() sorts a preallocated scratch copy and is called a few times per second.
 */
export class PerfMonitor {
  private readonly frame = new Float64Array(WINDOW);
  private readonly sim = new Float64Array(WINDOW);
  private readonly render = new Float64Array(WINDOW);
  private readonly scratch = new Float64Array(WINDOW);
  private index = 0;
  private count = 0;

  record(frameMs: number, simMs: number, renderMs: number): void {
    this.frame[this.index] = frameMs;
    this.sim[this.index] = simMs;
    this.render[this.index] = renderMs;
    this.index = (this.index + 1) % WINDOW;
    if (this.count < WINDOW) this.count++;
  }

  reset(): void {
    this.index = 0;
    this.count = 0;
  }

  stats(): PerfStats {
    const n = this.count;
    const heap = (performance as Performance & ChromeMemory).memory;
    const heapMb = heap ? heap.usedJSHeapSize / 1048576 : null;
    if (n === 0) return { fps: 0, frameMs: 0, p95FrameMs: 0, slowFramePct: 0, simMs: 0, renderMs: 0, heapMb };

    let frameSum = 0;
    let simSum = 0;
    let renderSum = 0;
    let slow = 0;
    for (let i = 0; i < n; i++) {
      const f = this.frame[i];
      frameSum += f;
      simSum += this.sim[i];
      renderSum += this.render[i];
      if (f > 33.4) slow++;
      this.scratch[i] = f;
    }
    const sorted = this.scratch.subarray(0, n).sort();
    const p95 = sorted[Math.min(n - 1, Math.floor(n * 0.95))];
    const frameMs = frameSum / n;
    return {
      fps: frameMs > 0 ? 1000 / frameMs : 0,
      frameMs,
      p95FrameMs: p95,
      slowFramePct: (slow / n) * 100,
      simMs: simSum / n,
      renderMs: renderSum / n,
      heapMb,
    };
  }
}
