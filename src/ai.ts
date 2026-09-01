// The enemy. It is bound by every rule the player is -- constant speed, no
// reverse, capped turn rate, its own bullets kill it -- so the only dial is
// `care`: how much it looks before it drives and before it shoots.

import { TILE } from "./config.ts";
import { at, EMPTY, STEEL, type Grid } from "./map.ts";
import { wrap, type Tank } from "./sim.ts";

const LOOK = TILE * 7; // far enough ahead to still be able to turn out of it
const STEP = 4;

/** How far a ray travels from (x, y) before it meets anything. */
export function clearance(g: Grid, x: number, y: number, a: number, max = LOOK): number {
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

// Candidate headings, nearest first: go where you wanted unless the wall says
// otherwise, and then go as little sideways as the wall allows.
const SWEEP = [0, 0.45, -0.45, 0.9, -0.9, 1.5, -1.5, 2.2, -2.2, Math.PI];

/**
 * Choose a heading. Wall-reading is not on the `care` dial -- an enemy that
 * drove straight into the border would end the wave by itself and teach the
 * player nothing.
 */
export function chooseHeading(g: Grid, e: Tank, want: number): number {
  let best = want;
  let bestScore = -Infinity;
  for (const off of SWEEP) {
    const a = wrap(want + off);
    const score = clearance(g, e.x, e.y, a) - Math.abs(off) * TILE * 1.3;
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
  const want = Math.atan2(target.y - e.y, target.x - e.x);
  if (Math.abs(wrap(want - e.angle)) > 0.2) return false;
  const range = Math.hypot(target.x - e.x, target.y - e.y);
  const blocked = clearance(g, e.x, e.y, e.angle, range) < range;
  if (!blocked) return true;
  return !(steelAhead(g, e.x, e.y, e.angle, range) && roll < e.care);
}

/** Where to point, given how well this enemy leads a moving target. */
export function aimAt(g: Grid, e: Tank, target: Tank, targetSpeed: number): number {
  const dx = target.x - e.x;
  const dy = target.y - e.y;
  const range = Math.hypot(dx, dy);
  const lead = e.care * (range / 200) * targetSpeed;
  const want = Math.atan2(dy + Math.sin(target.angle) * lead, dx + Math.cos(target.angle) * lead);
  return chooseHeading(g, e, want);
}
