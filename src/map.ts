// The arena grid. Pure data + pure functions -- no canvas, no window, so the
// generator's invariants can be tested headlessly.

import { COLS, ROWS, TILE } from "./config.ts";

export const EMPTY = 0;
export const BRICK = 1;
export const STEEL = 2;

export type Tile = typeof EMPTY | typeof BRICK | typeof STEEL;
export type Grid = Uint8Array;

export type Spawn = { cx: number; cy: number; angle: number };

export type Arena = {
  grid: Grid;
  player: Spawn;
  enemies: Spawn[];
};

export function blank(): Grid {
  return new Uint8Array(COLS * ROWS);
}

export function at(g: Grid, cx: number, cy: number): number {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return STEEL;
  return g[cy * COLS + cx]!;
}

export function put(g: Grid, cx: number, cy: number, t: number): void {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
  g[cy * COLS + cx] = t;
}

export function fill(g: Grid, cx: number, cy: number, w: number, h: number, t: number): void {
  for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) put(g, x, y, t);
}

/** The outer ring is always steel: nothing leaves the arena, everything bounces. */
export function border(g: Grid): void {
  for (let x = 0; x < COLS; x++) {
    put(g, x, 0, STEEL);
    put(g, x, ROWS - 1, STEEL);
  }
  for (let y = 0; y < ROWS; y++) {
    put(g, 0, y, STEEL);
    put(g, COLS - 1, y, STEEL);
  }
}

/** Tile centre in world pixels. */
export function centre(cx: number, cy: number): { x: number; y: number } {
  return { x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2 };
}

/**
 * Wave 1 is hand-placed, not generated. It is the only chance to arrange the
 * arena so the rules teach themselves in the first ten seconds: a long clear
 * runway ahead of the player, and enough steel in the far half that the first
 * enemy has somewhere to shoot itself.
 */
export function wave1(): Arena {
  const g = blank();
  border(g);

  fill(g, 14, 6, 4, 2, STEEL);
  fill(g, 26, 10, 2, 4, STEEL);
  fill(g, 20, 20, 4, 2, STEEL);
  fill(g, 30, 16, 3, 2, STEEL);
  fill(g, 8, 12, 2, 3, STEEL);

  fill(g, 10, 8, 3, 2, BRICK);
  fill(g, 18, 13, 3, 3, BRICK);
  fill(g, 24, 4, 3, 2, BRICK);
  fill(g, 5, 17, 4, 2, BRICK);
  fill(g, 31, 22, 4, 2, BRICK);
  fill(g, 13, 24, 3, 2, BRICK);
  fill(g, 34, 11, 2, 3, BRICK);

  return {
    grid: g,
    player: { cx: 6, cy: 24, angle: 0 },
    enemies: [{ cx: 32, cy: 5, angle: Math.PI * 0.75 }],
  };
}
