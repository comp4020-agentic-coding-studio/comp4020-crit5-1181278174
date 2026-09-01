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
const BEATEN = { hull: "#6b3b2f", tread: "#4a2a21", barrel: "#7d4638" };
const PENDING = { hull: "#2e3644", tread: "#232a36", barrel: "#39424f" };

type Skin = { hull: string; tread: string; barrel: string };

/** One tank at icon scale, facing `dir`. Same shape as the thing it stands for. */
function icon(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: Skin,
  dir: number,
  k = 1,
): void {
  g.save();
  g.translate(x, y);
  g.scale(dir * k, k);
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
/** 0..1 with the ends eased off, for a stage starting at `at` and lasting `dur`. */
function stage(t: number, at: number, dur: number): number {
  const x = Math.max(0, Math.min(1, (t - at) / dur));
  return x * x * (3 - 2 * x);
}

/**
 * The result screen. It is a band, like the HUD is a band -- the same shape
 * means the same kind of thing, so the row of wave icons inside it is read with
 * the vocabulary the top of the screen has been teaching all game. It wipes
 * open from a single line, which is the only motion here and the only thing
 * `motion: false` takes away.
 */
export function drawEnding(
  g: CanvasRenderingContext2D,
  won: boolean,
  t: number,
  wave: number,
  waves: number,
  motion = true,
): void {
  const clock = motion ? t : 99; // settled state, no wipe, no pulse
  const accent = won ? PLAYER.hull : ENEMY.hull;

  // A wash, warmed toward the outcome so the screen has a temperature before
  // a single word of it is read.
  const wash = stage(clock, 0, 0.3);
  g.globalAlpha = wash * 0.94;
  g.fillStyle = "#06070a";
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, W * 0.55);
  glow.addColorStop(0, won ? "#3d3113" : "#3d1712");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  g.globalAlpha = wash * 0.7;
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;

  // The band wipes open from a 2px line on the centre.
  const full = 124;
  const open = stage(clock, 0.1, 0.34);
  const half = Math.max(1, Math.round((full / 2) * open));
  const mid = Math.round(H / 2 - 24);
  const top = mid - half;
  const bot = mid + half;

  g.fillStyle = "#0b0d12";
  g.fillRect(0, top, W, bot - top);
  g.fillStyle = accent;
  g.fillRect(0, top, W, 2);
  g.fillRect(0, bot - 2, W, 2);

  g.save();
  g.beginPath();
  g.rect(0, top + 2, W, bot - top - 4);
  g.clip();
  g.textAlign = "center";
  g.textBaseline = "middle";

  const title = stage(clock, 0.36, 0.3);
  g.globalAlpha = title;
  g.font = "bold 34px ui-monospace, SFMono-Regular, Menlo, monospace";
  const ty = mid - 24 + (1 - title) * 6;
  g.fillStyle = "#05060a";
  g.fillText(won ? "ALL CLEAR" : "WRECKED", W / 2 + 2, ty + 2);
  g.fillStyle = accent;
  g.fillText(won ? "ALL CLEAR" : "WRECKED", W / 2, ty);

  // How far the run got, in the same icons the HUD uses: killed, still
  // standing, never reached. A win is three dead; a loss shows you the one
  // that is still on its feet.
  for (let i = 0; i < waves; i++) {
    const pop = stage(clock, 0.66 + i * 0.11, 0.26);
    if (pop <= 0) continue;
    g.globalAlpha = pop;
    const skin = won || i < wave - 1 ? BEATEN : i === wave - 1 ? ENEMY : PENDING;
    icon(g, W / 2 + (i - (waves - 1) / 2) * 64, mid + 32 + (1 - pop) * 6, skin, -1, 2.2);
  }
  g.globalAlpha = 1;
  g.restore();

  // Where the next click belongs: a plate holding the same flag the cursor is,
  // breathing. An invitation in the game's own vocabulary, not a caption -- and
  // the flag is drawn magnified about the plate's centre rather than redrawn
  // bigger, so it is the identical glyph and cannot drift from the real one.
  const invite = stage(clock, 1.05, 0.4);
  if (invite <= 0) return;
  const pulse = motion ? 0.45 + 0.3 * Math.sin(t * 3) : 0.75;
  const side = 58;
  const px = Math.round(W / 2 - side / 2);
  const py = bot + 24;
  const mx = px + side / 2;
  const my = py + side / 2;

  g.globalAlpha = invite;
  g.fillStyle = "#0b0d12";
  g.fillRect(px, py, side, side);
  g.globalAlpha = invite * pulse;
  g.fillStyle = accent;
  g.fillRect(px, py, side, 1);
  g.fillRect(px, py + side - 1, side, 1);
  g.fillRect(px, py, 1, side);
  g.fillRect(px + side - 1, py, 1, side);

  g.globalAlpha = invite;
  g.save();
  g.translate(mx, my);
  g.scale(2, 2);
  g.translate(-mx, -my);
  // The flag hangs up and to the right of the point it marks, so the point it
  // marks is offset from the plate's centre by exactly that much, the other way.
  drawCursor(g, mx - 4, my + 6);
  g.restore();
  g.globalAlpha = 1;
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
