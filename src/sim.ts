// Geometry and stepping. Pure: takes state and dt, returns nothing but
// mutations of what it was handed. No canvas, no window, no timers.

import {
  BULLET_BOUNCES,
  BULLET_LIFE,
  BULLET_R,
  BULLET_SPEED,
  DEAD_ZONE,
  MUZZLE,
  TANK_R,
  TILE,
  TURN_RATE,
} from "./config.ts";
import { at, BRICK, EMPTY, put, type Grid } from "./map.ts";

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

export type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: Tank;
  bounces: number;
  life: number;
};

/** What happened to a bullet during one step. */
export type BulletFate = "fly" | "gone" | "brick";

export function fire(t: Tank): Bullet {
  return {
    x: t.x + Math.cos(t.angle) * MUZZLE,
    y: t.y + Math.sin(t.angle) * MUZZLE,
    vx: Math.cos(t.angle) * BULLET_SPEED,
    vy: Math.sin(t.angle) * BULLET_SPEED,
    owner: t,
    bounces: 0,
    life: 0,
  };
}

export function canFire(t: Tank, inFlight: number, clip: number): boolean {
  return t.alive && t.cooldown <= 0 && inFlight < clip;
}

/**
 * Move one bullet. Steel flips the component that ran into it -- which is why
 * a shot down a steel corridor comes back for whoever fired it. Brick eats the
 * bullet and is gone: one wall costs one shot.
 */
export function stepBullet(g: Grid, b: Bullet, dt: number): BulletFate {
  b.life += dt;
  if (b.life > BULLET_LIFE) return "gone";

  const dist = Math.hypot(b.vx, b.vy) * dt;
  const parts = Math.max(1, Math.ceil(dist / 4));
  const h = dt / parts;

  for (let i = 0; i < parts; i++) {
    const nx = b.x + b.vx * h;
    if (at(g, Math.floor(nx / TILE), Math.floor(b.y / TILE)) !== EMPTY) {
      const cx = Math.floor(nx / TILE);
      const cy = Math.floor(b.y / TILE);
      if (at(g, cx, cy) === BRICK) {
        put(g, cx, cy, EMPTY);
        return "brick";
      }
      b.vx = -b.vx;
      if (++b.bounces > BULLET_BOUNCES) return "gone";
    } else {
      b.x = nx;
    }

    const ny = b.y + b.vy * h;
    if (at(g, Math.floor(b.x / TILE), Math.floor(ny / TILE)) !== EMPTY) {
      const cx = Math.floor(b.x / TILE);
      const cy = Math.floor(ny / TILE);
      if (at(g, cx, cy) === BRICK) {
        put(g, cx, cy, EMPTY);
        return "brick";
      }
      b.vy = -b.vy;
      if (++b.bounces > BULLET_BOUNCES) return "gone";
    } else {
      b.y = ny;
    }
  }
  return "fly";
}

/** Bullets do not ask whose they are. That is the whole point of them. */
export function bulletHits(b: Bullet, t: Tank): boolean {
  if (!t.alive) return false;
  const d = TANK_R + BULLET_R;
  const dx = b.x - t.x;
  const dy = b.y - t.y;
  return dx * dx + dy * dy < d * d;
}
