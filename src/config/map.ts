import { PathGeometry } from '../engine/path';

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;

export const PATH_WIDTH = 44;
export const PAD_SIZE = 46;

const PATH_POINTS: ReadonlyArray<readonly [number, number]> = [
  [-40, 110],
  [250, 110],
  [250, 590],
  [540, 590],
  [540, 140],
  [840, 140],
  [840, 590],
  [1110, 590],
  [1110, 340],
  [1230, 340],
];

export const PATH = new PathGeometry(PATH_POINTS);

export const BASE_POSITION = { x: 1230, y: 340 } as const;

export interface BuildPad {
  readonly x: number;
  readonly y: number;
}

/**
 * Build pads sit on a regular grid, kept only where they hug the path:
 * close enough to matter, far enough not to overlap it.
 */
function generatePads(): BuildPad[] {
  const pads: BuildPad[] = [];
  const spacing = 70;
  for (let y = 50; y <= WORLD_HEIGHT - 40; y += spacing) {
    for (let x = 60; x <= WORLD_WIDTH - 40; x += spacing) {
      const d = PATH.distanceTo(x, y);
      const nearBase = Math.hypot(x - BASE_POSITION.x, y - BASE_POSITION.y) < 70;
      if (d >= 50 && d <= 110 && !nearBase) pads.push({ x, y });
    }
  }
  return pads;
}

export const PADS: readonly BuildPad[] = generatePads();
