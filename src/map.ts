// The arena grid. Pure data + pure functions -- no canvas, no window, so the
// generator's invariants can be tested headlessly.

import {
  BLOCK_GAP,
  COLS,
  ENEMY_CORNERS,
  ENEMY_MIN_DIST,
  ROWS,
  RUNWAY,
  SPAWN,
  SPAWN_CLEAR,
  TILE,
  type Wave,
} from "./config.ts";

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
  fill(g, 14, 26, 3, 2, BRICK);
  fill(g, 34, 11, 2, 3, BRICK);

  return {
    grid: g,
    player: { ...SPAWN },
    enemies: [{ cx: 32, cy: 5, angle: Math.PI * 0.75 }],
  };
}

// --- generation ------------------------------------------------------------

/**
 * The open tile closest to `anchor` that an enemy can start on: clear for `pad`
 * tiles around, far enough from the player, and not on top of another enemy.
 * The padding relaxes rather than giving up, because a wave short an enemy is a
 * wave that never ends.
 */
function nearestOpen(
  g: Grid,
  anchor: { cx: number; cy: number },
  taken: readonly Spawn[],
): Spawn | undefined {
  // Two tiles of clearance, not the player's three. The player is stationary in
  // READY and has to be able to turn around on the spot; an enemy is already
  // moving at the player the frame it appears. Asking for the player's room
  // here inverted the priority -- the search would satisfy a 7x7 block eleven
  // tiles from the corner rather than take a 5x5 block right in it.
  for (let pad = 2; pad >= 1; pad--) {
    let best: { cx: number; cy: number } | undefined;
    let bestD = Infinity;
    for (let cy = 2; cy < ROWS - 2; cy++) {
      for (let cx = 2; cx < COLS - 2; cx++) {
        if (Math.hypot(cx - SPAWN.cx, cy - SPAWN.cy) < ENEMY_MIN_DIST) continue;
        if (taken.some((e) => Math.hypot(e.cx - cx, e.cy - cy) < 6)) continue;
        if (!clearAround(g, cx, cy, pad)) continue;
        const d = Math.hypot(cx - anchor.cx, cy - anchor.cy);
        if (d < bestD) {
          bestD = d;
          best = { cx, cy };
        }
      }
    }
    if (best) {
      return { ...best, angle: Math.atan2(SPAWN.cy - best.cy, SPAWN.cx - best.cx) };
    }
  }
  return undefined;
}

/** Deterministic per-seed: the same seed is the same arena, so a bad one is reportable. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clearAround(g: Grid, cx: number, cy: number, pad: number): boolean {
  for (let y = cy - pad; y <= cy + pad; y++)
    for (let x = cx - pad; x <= cx + pad; x++) if (at(g, x, y) !== EMPTY) return false;
  return true;
}

/**
 * Obstacles are separated rectangles, never a maze. Two reasons, and they are
 * the same reason: a tank that cannot stop needs a turning circle's worth of
 * room, and a gap narrower than that is not a corridor, it is a sentence.
 */
export function generate(seed: number, w: Wave): Arena {
  const r = rng(seed);
  const g = blank();
  border(g);

  const spawnPad = Math.ceil(SPAWN_CLEAR / TILE);
  const budget = Math.round((COLS - 2) * (ROWS - 2) * w.coverage);
  let placed = 0;

  for (let tries = 0; tries < 600 && placed < budget; tries++) {
    const bw = 2 + Math.floor(r() * 3);
    const bh = 2 + Math.floor(r() * 3);
    const x = 1 + Math.floor(r() * (COLS - 2 - bw));
    const y = 1 + Math.floor(r() * (ROWS - 2 - bh));

    // keep BLOCK_GAP clear on every side, which also keeps every block off the
    // border ring -- so no empty tile is ever boxed in on three sides
    let ok = true;
    for (let yy = y - BLOCK_GAP; yy < y + bh + BLOCK_GAP && ok; yy++)
      for (let xx = x - BLOCK_GAP; xx < x + bw + BLOCK_GAP && ok; xx++)
        if (xx > 0 && yy > 0 && xx < COLS - 1 && yy < ROWS - 1 && at(g, xx, yy) !== EMPTY) ok = false;
    if (!ok) continue;
    if (x - BLOCK_GAP < 1 || y - BLOCK_GAP < 1) continue;
    if (x + bw + BLOCK_GAP > COLS - 1 || y + bh + BLOCK_GAP > ROWS - 1) continue;

    // never inside the spawn's turning room, never across its runway
    if (
      x - spawnPad <= SPAWN.cx &&
      SPAWN.cx <= x + bw + spawnPad &&
      y - spawnPad <= SPAWN.cy &&
      SPAWN.cy <= y + bh + spawnPad
    )
      continue;
    if (y <= SPAWN.cy && SPAWN.cy < y + bh && x > SPAWN.cx && x <= SPAWN.cx + RUNWAY) continue;

    fill(g, x, y, bw, bh, r() < w.steelShare ? STEEL : BRICK);
    placed += bw * bh;
  }

  // Enemies take the corners the player does not have, farthest first. This
  // used to sample the whole floor for any tile >= ENEMY_MIN_DIST away, which
  // is a weak guarantee: 12 tiles is inside one approach, so a wave could open
  // with an enemy already on you. Anchoring to corners makes every wave start
  // as a long diagonal you can watch coming, and it costs the generator nothing
  // -- it is a search for the nearest legal tile to a fixed point, not a dart.
  const enemies: Spawn[] = [];
  for (const anchor of ENEMY_CORNERS.slice(0, w.enemies)) {
    const spot = nearestOpen(g, anchor, enemies);
    if (spot) enemies.push(spot);
  }

  return { grid: g, player: { ...SPAWN }, enemies };
}
