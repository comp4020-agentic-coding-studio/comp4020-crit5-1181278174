// The enemy. It is bound by every rule the player is -- constant speed, no
// reverse, capped turn rate, its own bullets kill it -- so the only dial is
// `care`: how much it looks before it drives and before it shoots.

import {
  ENEMY_RANGE,
  ENEMY_STANDOFF,
  ENEMY_WINDOW,
  SPEED,
  TANK_R,
  TILE,
  TURN_RATE,
} from "./config.ts";
import { at, EMPTY, STEEL, type Grid } from "./map.ts";
import { hitsWall, turnToward, wrap, type Tank } from "./sim.ts";

const LOOK = TILE * 7; // far enough ahead to still be able to turn out of it
const STEP = 4;

/** How far a point travels from (x, y) before it meets anything -- a bullet. */
export function rayDist(g: Grid, x: number, y: number, a: number, max = LOOK): number {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  for (let d = STEP; d <= max; d += STEP) {
    const cx = Math.floor((x + dx * d) / TILE);
    const cy = Math.floor((y + dy * d) / TILE);
    if (at(g, cx, cy) !== EMPTY) return d;
  }
  return max;
}

/** Is the first thing down this ray steel -- i.e. will the shot come back? */
function steelAhead(g: Grid, x: number, y: number, a: number, max: number): boolean {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  for (let d = STEP; d <= max; d += STEP) {
    const t = at(g, Math.floor((x + dx * d) / TILE), Math.floor((y + dy * d) / TILE));
    if (t !== EMPTY) return t === STEEL;
  }
  return false;
}

// Candidate headings, nearest first: go where you wanted unless the arena
// says otherwise, and then go as little sideways as the arena allows.
const SWEEP = [0, 0.45, -0.45, 0.9, -0.9, 1.5, -1.5, 2.2, -2.2, Math.PI];

const HORIZON = 1.6; // seconds of future to check
const PLAN_STEP = 1 / 12;
const MARGIN = 2; // px of slack around the hull, so it does not shave corners

/**
 * How long this tank survives if it commits to `heading` now -- simulated with
 * the same turn cap, the same speed and the same collision test the game kills
 * it with. Rays could not do this: the tank travels an arc, so the thing it
 * hits is usually beside its centreline, not on it.
 */
export function safeFor(g: Grid, e: Tank, heading: number): number {
  let x = e.x;
  let y = e.y;
  let a = e.angle;
  for (let t = 0; t < HORIZON; t += PLAN_STEP) {
    a = turnToward(a, heading, TURN_RATE * PLAN_STEP);
    x += Math.cos(a) * SPEED * PLAN_STEP;
    y += Math.sin(a) * SPEED * PLAN_STEP;
    if (hitsWall(g, x, y, TANK_R + MARGIN)) return t;
  }
  return HORIZON;
}

/**
 * Choose a heading. Reading the arena is not on the `care` dial -- an enemy
 * that drove into a wall would end the wave by itself and teach the player
 * nothing. `care` is only about the trigger.
 */
export function chooseHeading(g: Grid, e: Tank, want: number): number {
  let best = want;
  let bestScore = -Infinity;
  for (const off of SWEEP) {
    const a = wrap(want + off);
    const score = safeFor(g, e, a) * 100 - Math.abs(off) * 6;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

/**
 * Should it pull the trigger? At care 0 it never checks, so it shoots into
 * steel and its own bullet comes back for it -- which is how the arena
 * explains ricochets without a word of text.
 */
export function wantsToShoot(g: Grid, e: Tank, target: Tank, roll: number): boolean {
  const range = Math.hypot(target.x - e.x, target.y - e.y);
  if (range > ENEMY_RANGE) return false;
  const want = Math.atan2(target.y - e.y, target.x - e.x);
  if (Math.abs(wrap(want - e.angle)) > ENEMY_WINDOW(e.care)) return false;
  const blocked = rayDist(g, e.x, e.y, e.angle, range) < range;
  if (!blocked) return true;
  return !(steelAhead(g, e.x, e.y, e.angle, range) && roll < e.care);
}

/** Where to point, given how well this enemy leads a moving target. */
export function aimAt(g: Grid, e: Tank, target: Tank, targetSpeed: number): number {
  const dx = target.x - e.x;
  const dy = target.y - e.y;
  const range = Math.hypot(dx, dy);
  const lead = e.care * (range / 200) * targetSpeed;
  let want = Math.atan2(dy + Math.sin(target.angle) * lead, dx + Math.cos(target.angle) * lead);
  // Break off rather than ram: a collision trades one enemy for one of your
  // three lives, and an enemy that always takes that trade wins on arithmetic
  // rather than on play.
  if (range < ENEMY_STANDOFF) want = wrap(want + (wrap(want - e.angle) > 0 ? -1.1 : 1.1));
  return chooseHeading(g, e, want);
}
