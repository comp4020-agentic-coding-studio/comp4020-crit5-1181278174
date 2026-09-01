// Geometry and stepping. Pure: takes state and dt, returns nothing but
// mutations of what it was handed. No canvas, no window, no timers.

import { DEAD_ZONE, TANK_R, TILE, TURN_RATE } from "./config.ts";
import { at, EMPTY, type Grid } from "./map.ts";

export type Tank = {
  x: number;
  y: number;
  angle: number; // hull heading == gun heading. There is no turret.
  target: number; // where the cursor (or the AI) wants the hull pointed
  alive: boolean;
  player: boolean;
  cooldown: number;
  care: number; // 0 = fires blind, 1 = checks what is in front of it first
};

export function tank(x: number, y: number, angle: number, player: boolean, care = 0): Tank {
  return { x, y, angle, target: angle, alive: true, player, cooldown: 0, care };
}

/** Fold an angle into (-PI, PI]. */
export function wrap(a: number): number {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r <= -Math.PI) r += Math.PI * 2;
  return r;
}

/**
 * Turn `cur` towards `target`, never by more than `maxStep`. This cap is the
 * whole game: it is what gives the tank a turning radius, and therefore what
 * makes a wall something you have to plan around rather than steer around.
 */
export function turnToward(cur: number, target: number, maxStep: number): number {
  const d = wrap(target - cur);
  if (Math.abs(d) <= maxStep) return wrap(target);
  return wrap(cur + Math.sign(d) * maxStep);
}

/**
 * The cursor asks for a heading -- except within DEAD_ZONE, where it is asking
 * for a point the tank physically cannot reach (the interior of its own
 * turning circles). There the previous request stands.
 */
export function aim(t: Tank, cursorX: number, cursorY: number): number {
  const dx = cursorX - t.x;
  const dy = cursorY - t.y;
  if (dx * dx + dy * dy < DEAD_ZONE * DEAD_ZONE) return t.target;
  return Math.atan2(dy, dx);
}

export function steer(t: Tank, dt: number): void {
  t.angle = turnToward(t.angle, t.target, TURN_RATE * dt);
}

export function advance(t: Tank, dt: number, speed: number): void {
  t.x += Math.cos(t.angle) * speed * dt;
  t.y += Math.sin(t.angle) * speed * dt;
}

/** Does a circle of radius r at (x, y) overlap any non-empty tile? */
export function hitsWall(g: Grid, x: number, y: number, r: number): boolean {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (at(g, cx, cy) === EMPTY) continue;
      // nearest point on the tile rect to the circle centre
      const nx = Math.max(cx * TILE, Math.min(x, cx * TILE + TILE));
      const ny = Math.max(cy * TILE, Math.min(y, cy * TILE + TILE));
      const dx = x - nx;
      const dy = y - ny;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

export function tankHitsWall(g: Grid, t: Tank): boolean {
  return hitsWall(g, t.x, t.y, TANK_R);
}
