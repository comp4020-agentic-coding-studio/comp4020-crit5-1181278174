// Everything that touches a canvas lives here.

import { COLS, H, HUD_H, LIVES, ROWS, TILE, W } from "./config.ts";
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

/**
 * Yours is a pale square, theirs is a red diamond. With several in the air at
 * once, "what killed me" has to be answerable at a glance.
 */
export function drawBullet(g: CanvasRenderingContext2D, x: number, y: number, mine: boolean): void {
  const cx = Math.round(x);
  const cy = Math.round(y);
  if (mine) {
    g.fillStyle = "#3a3527";
    g.fillRect(cx - 3, cy - 3, 6, 6);
    g.fillStyle = "#fff6d8";
    g.fillRect(cx - 2, cy - 2, 4, 4);
  } else {
    g.fillStyle = "#3a1e18";
    g.fillRect(cx - 1, cy - 4, 2, 8);
    g.fillRect(cx - 4, cy - 1, 8, 2);
    g.fillStyle = "#ff7a55";
    g.fillRect(cx - 1, cy - 3, 2, 6);
    g.fillRect(cx - 3, cy - 1, 6, 2);
  }
}

const HUD_BG = "#0d0f14";
const HUD_RULE = "#232936";
const SPENT = { hull: "#222834", tread: "#1b202a", barrel: "#2b3240" };
const BEATEN = { hull: "#4a2b23", tread: "#341e18", barrel: "#573129" };
const PENDING = { hull: "#242a35", tread: "#1c212b", barrel: "#2d3441" };

type Skin = { hull: string; tread: string; barrel: string };

/** One tank at icon scale, facing `dir`. Same shape as the thing it stands for. */
function icon(g: CanvasRenderingContext2D, x: number, y: number, s: Skin, dir: number): void {
  g.save();
  g.translate(x, y);
  g.scale(dir, 1);
  g.fillStyle = s.tread;
  g.fillRect(-8, -8, 15, 3);
  g.fillRect(-8, 5, 15, 3);
  g.fillStyle = s.hull;
  g.fillRect(-7, -5, 13, 10);
  g.fillStyle = s.barrel;
  g.fillRect(2, -2, 10, 4);
  g.fillStyle = s.tread;
  g.fillRect(-3, -3, 6, 6);
  g.restore();
}

/**
 * The band. Left: one tank per life, spent ones left as empty silhouettes so
 * three-of-three is readable without counting. Right: one enemy per wave,
 * beaten / here / still coming, with a bar under the one you are in.
 */
export function drawHud(g: CanvasRenderingContext2D, lives: number, wave: number, waves: number): void {
  g.fillStyle = HUD_BG;
  g.fillRect(0, 0, W, HUD_H);
  g.fillStyle = HUD_RULE;
  g.fillRect(0, HUD_H - 1, W, 1);

  for (let i = 0; i < LIVES; i++) icon(g, 18 + i * 26, 15, i < lives ? PLAYER : SPENT, 1);

  for (let i = 0; i < waves; i++) {
    const x = W - 18 - (waves - 1 - i) * 26;
    icon(g, x, 15, i < wave - 1 ? BEATEN : i === wave - 1 ? ENEMY : PENDING, -1);
    if (i === wave - 1) {
      g.fillStyle = PLAYER.barrel;
      g.fillRect(x - 10, HUD_H - 6, 20, 2);
    }
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

/** The two endings. Words are allowed here; they are not telling you anything. */
export function drawEnding(g: CanvasRenderingContext2D, won: boolean, t: number): void {
  g.fillStyle = "rgba(6, 7, 10, 0.78)";
  g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = won ? PLAYER.hull : ENEMY.hull;
  g.font = "bold 34px ui-monospace, SFMono-Regular, Menlo, monospace";
  g.fillText(won ? "ALL CLEAR" : "WRECKED", W / 2, H / 2 - 10);
  // a slow pulse where the next click belongs -- an invitation, not a caption
  const a = 0.35 + 0.35 * Math.sin(t * 3);
  g.globalAlpha = a;
  g.strokeStyle = "#c9ced8";
  g.lineWidth = 1;
  g.strokeRect(W / 2 - 26, H / 2 + 30, 52, 52);
  g.globalAlpha = 1;
  // Offset so the whole glyph sits centred in the box: the flag hangs up and
  // to the right of the point it marks, the box does not.
  drawCursor(g, W / 2 - 4, H / 2 + 62);
}

const POLE = "#d4dae6";
const FLAG = "#ff3b30";
const FLAG_SHADE = "#7d1a15";

/**
 * A flag planted where you are steering, not a crosshair: the tank takes a
 * second and a wide arc to get there, so the target wants to look like a place
 * rather than a shot. The base tick is the exact point; the banner leans away
 * from the ceiling so it never rides up into the HUD.
 */
export function drawCursor(g: CanvasRenderingContext2D, x: number, y: number): void {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const d = cy > 15 ? -1 : 1;
  const far = cy + 12 * d;
  const top = d < 0 ? far : far - 6;

  g.fillStyle = POLE;
  g.fillRect(cx, Math.min(cy, far), 1, 13);
  g.fillRect(cx - 2, cy, 5, 1);

  for (let r = 0; r < 7; r++) {
    const bite = 3 - Math.abs(r - 3);
    g.fillStyle = FLAG_SHADE;
    g.fillRect(cx + 1, top + r, 10 - bite, 1);
    g.fillStyle = FLAG;
    g.fillRect(cx + 1, top + r, 9 - bite, 1);
  }
}
