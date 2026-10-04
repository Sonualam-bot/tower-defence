import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/map';
import type { Enemy } from './types';

const CELL = 64;

/**
 * Uniform grid rebuilt every tick with a counting sort into flat arrays:
 * no per-tick allocation, O(enemies) rebuild, and a range query touches only nearby cells.
 */
export class SpatialGrid {
  readonly cols = Math.ceil(WORLD_WIDTH / CELL);
  readonly rows = Math.ceil(WORLD_HEIGHT / CELL);
  /** starts[c]..starts[c+1] indexes this cell's enemies in items. */
  readonly starts = new Int32Array(this.cols * this.rows + 1);
  private readonly cursor = new Int32Array(this.cols * this.rows);
  private readonly cellOf: Int32Array[] = [new Int32Array(1024)];
  items: Enemy[] = [];

  cellX(x: number): number {
    const c = Math.floor(x / CELL);
    return c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
  }

  cellY(y: number): number {
    const r = Math.floor(y / CELL);
    return r < 0 ? 0 : r >= this.rows ? this.rows - 1 : r;
  }

  rebuild(enemies: Enemy[]): void {
    const n = enemies.length;
    if (this.cellOf[0].length < n) this.cellOf[0] = new Int32Array(n * 2);
    const cellOf = this.cellOf[0];
    const starts = this.starts;
    starts.fill(0);
    for (let i = 0; i < n; i++) {
      const c = this.cellY(enemies[i].y) * this.cols + this.cellX(enemies[i].x);
      cellOf[i] = c;
      starts[c + 1]++;
    }
    for (let c = 1; c < starts.length; c++) starts[c] += starts[c - 1];
    this.cursor.set(starts.subarray(0, this.cursor.length));
    if (this.items.length < n) this.items.length = n;
    for (let i = 0; i < n; i++) this.items[this.cursor[cellOf[i]]++] = enemies[i];
  }
}
