// Everything that touches a canvas lives here.

import { COLS, H, ROWS, TILE, W } from "./config.ts";
import { at, BRICK, EMPTY, STEEL, type Grid } from "./map.ts";
import type { Tank } from "./sim.ts";

const FLOOR = "#111318";
const GRID_DOT = "#1b1f28";
const BRICK_FACE = "#a1553c";
const BRICK_DARK = "#6f3626";
const STEEL_FACE = "#6d7686";
const STEEL_LIT = "#9aa4b3";
const STEEL_DARK = "#454c58";

const PLAYER = { hull: "#e3c264", tread: "#9c8436", barrel: "#f6ecc2" };
const ENEMY = { hull: "#c0543e", tread: "#7f3628", barrel: "#efb9a8" };

/** The map only changes when a brick breaks, so it is drawn once and blitted. */
export function paintMap(grid: Grid): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = FLOOR;
  g.fillRect(0, 0, W, H);

  g.fillStyle = GRID_DOT;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (at(grid, x, y) === EMPTY) g.fillRect(x * TILE + TILE - 1, y * TILE + TILE - 1, 1, 1);
    }
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = at(grid, x, y);
      const px = x * TILE;
      const py = y * TILE;
      if (t === BRICK) {
        g.fillStyle = BRICK_DARK;
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = BRICK_FACE;
        for (let r = 0; r < 4; r++) {
          const off = r % 2 === 0 ? 0 : 4;
          for (let b = 0; b < 2; b++) g.fillRect(px + off + b * 8, py + r * 4, 7, 3);
        }
      } else if (t === STEEL) {
        g.fillStyle = STEEL_FACE;
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = STEEL_LIT;
        g.fillRect(px, py, TILE, 2);
        g.fillRect(px, py, 2, TILE);
        g.fillStyle = STEEL_DARK;
        g.fillRect(px, py + TILE - 2, TILE, 2);
        g.fillRect(px + TILE - 2, py, 2, TILE);
      }
    }
  }
  return c;
}

export function drawTank(g: CanvasRenderingContext2D, t: Tank): void {
  const p = t.player ? PLAYER : ENEMY;
  g.save();
  g.translate(Math.round(t.x), Math.round(t.y));
  g.rotate(t.angle);
  g.fillStyle = p.tread;
  g.fillRect(-8, -8, 15, 3);
  g.fillRect(-8, 5, 15, 3);
  g.fillStyle = p.hull;
  g.fillRect(-7, -5, 13, 10);
  g.fillStyle = p.barrel;
  g.fillRect(2, -2, 10, 4);
  g.fillStyle = p.tread;
  g.fillRect(-3, -3, 6, 6);
  g.restore();
}

/** Lives left, as pips: state, not a caption. */
export function drawLives(g: CanvasRenderingContext2D, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = 8 + i * 10;
    g.fillStyle = PLAYER.hull;
    g.fillRect(x, 8, 6, 5);
    g.fillStyle = PLAYER.tread;
    g.fillRect(x, 7, 6, 1);
    g.fillRect(x, 13, 6, 1);
  }
}

/** The moment of a kill, so a death is something you saw rather than inferred. */
export function drawBoom(g: CanvasRenderingContext2D, x: number, y: number, t: number, player: boolean): void {
  const r = 3 + t * 46;
  const a = Math.max(0, 1 - t / 0.7);
  g.strokeStyle = player ? PLAYER.barrel : ENEMY.barrel;
  g.globalAlpha = a;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
}

/** A crosshair, not an arrow: the pointer is aiming, not clicking widgets. */
export function drawCursor(g: CanvasRenderingContext2D, x: number, y: number): void {
  const cx = Math.round(x);
  const cy = Math.round(y);
  g.fillStyle = "#f6ecc2";
  g.fillRect(cx - 5, cy, 4, 1);
  g.fillRect(cx + 2, cy, 4, 1);
  g.fillRect(cx, cy - 5, 1, 4);
  g.fillRect(cx, cy + 2, 1, 4);
}
