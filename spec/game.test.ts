import { describe, expect, it } from "vitest";
import {
  BULLET_R,
  COLS,
  ENEMY_MIN_DIST,
  ROWS,
  RUNWAY,
  SPAWN,
  SPAWN_CLEAR,
  TANK_R,
  TILE,
  TURN_RADIUS,
  TURN_RATE,
  WAVES,
} from "../src/config.ts";
import { at, blank, BRICK, EMPTY, generate, put, STEEL, type Grid } from "../src/map.ts";
import { aim, bulletHits, stepBullet, tank, turnToward, type Bullet } from "../src/sim.ts";

const SEEDS = 200;

function solid(g: Grid, x: number, y: number): boolean {
  return at(g, x, y) !== EMPTY;
}

// The headline guard. Every rule in this game is lethal, so a generated arena
// that breaks one of these is not "a hard level" -- it is an unwinnable one,
// and no amount of play-testing finds the seed that does it.
describe("every generated arena is survivable", () => {
  const arenas = WAVES.flatMap((w, i) =>
    Array.from({ length: SEEDS }, (_, s) => ({ wave: i + 1, seed: s, a: generate(s, w) })),
  );

  it("walls the arena in steel, so nothing ever leaves it", () => {
    for (const { seed, a } of arenas) {
      for (let x = 0; x < COLS; x++) {
        expect(at(a.grid, x, 0), `seed ${seed} top`).toBe(STEEL);
        expect(at(a.grid, x, ROWS - 1), `seed ${seed} bottom`).toBe(STEEL);
      }
      for (let y = 0; y < ROWS; y++) {
        expect(at(a.grid, 0, y), `seed ${seed} left`).toBe(STEEL);
        expect(at(a.grid, COLS - 1, y), `seed ${seed} right`).toBe(STEEL);
      }
    }
  });

  it("leaves a runway ahead of the spawn: the first thing you do is not die", () => {
    for (const { seed, a } of arenas) {
      for (let i = 0; i <= RUNWAY; i++) {
        expect(solid(a.grid, SPAWN.cx + i, SPAWN.cy), `seed ${seed} runway +${i}`).toBe(false);
      }
    }
  });

  it("leaves the spawn a full turning circle of room", () => {
    const pad = Math.ceil(SPAWN_CLEAR / TILE);
    for (const { seed, a } of arenas) {
      for (let y = SPAWN.cy - pad; y <= SPAWN.cy + pad; y++) {
        for (let x = SPAWN.cx - pad; x <= SPAWN.cx + pad; x++) {
          if (x < 1 || y < 1 || x > COLS - 2 || y > ROWS - 2) continue;
          expect(solid(a.grid, x, y), `seed ${seed} at ${x},${y}`).toBe(false);
        }
      }
    }
  });

  // A tank that cannot stop needs its turning diameter of room. This is the
  // guard on BLOCK_GAP: measure the free run through every empty tile on both
  // axes -- an open field is wide both ways, a one-way alley is not.
  it("never leaves a channel narrower than the turning circle", () => {
    const minWidth = Math.ceil((2 * TURN_RADIUS) / TILE);
    const run = (g: Grid, x: number, y: number, dx: number, dy: number) => {
      let n = 1;
      for (let i = 1; !solid(g, x + dx * i, y + dy * i); i++) n++;
      for (let i = 1; !solid(g, x - dx * i, y - dy * i); i++) n++;
      return n;
    };
    for (const { seed, a } of arenas) {
      for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
          if (solid(a.grid, x, y)) continue;
          const width = Math.min(run(a.grid, x, y, 1, 0), run(a.grid, x, y, 0, 1));
          expect(width, `seed ${seed} pinched at ${x},${y}`).toBeGreaterThanOrEqual(minWidth);
        }
      }
    }
  });

  it("never boxes a tile in on three sides", () => {
    for (const { seed, a } of arenas) {
      for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
          if (solid(a.grid, x, y)) continue;
          const walls = [
            solid(a.grid, x + 1, y),
            solid(a.grid, x - 1, y),
            solid(a.grid, x, y + 1),
            solid(a.grid, x, y - 1),
          ].filter(Boolean).length;
          expect(walls, `seed ${seed} pocket at ${x},${y}`).toBeLessThan(3);
        }
      }
    }
  });

  it("puts every enemy on open ground, well away from the spawn", () => {
    for (const { wave, seed, a } of arenas) {
      expect(a.enemies.length, `seed ${seed}`).toBe(WAVES[wave - 1]!.enemies);
      for (const e of a.enemies) {
        expect(solid(a.grid, e.cx, e.cy), `seed ${seed} enemy tile`).toBe(false);
        expect(Math.hypot(e.cx - SPAWN.cx, e.cy - SPAWN.cy)).toBeGreaterThanOrEqual(ENEMY_MIN_DIST);
      }
    }
  });
});

describe("the rules the arena is made of", () => {
  function shot(x: number, y: number, vx: number, vy: number): Bullet {
    return { x, y, vx, vy, owner: tank(-99, -99, 0, true), bounces: 0, life: 0 };
  }

  it("bounces a bullet off steel and keeps it alive", () => {
    const g = blank();
    put(g, 5, 4, STEEL);
    // travelling straight down into the top face of that tile
    const b = shot(5 * TILE + 8, 4 * TILE - 3, 0, 200);
    expect(stepBullet(g, b, 1 / 30)).toBe("fly");
    expect(b.vy).toBeLessThan(0);
    expect(b.bounces).toBe(1);
  });

  it("spends the bullet on a brick and takes the brick with it", () => {
    const g = blank();
    put(g, 5, 4, BRICK);
    const b = shot(5 * TILE + 8, 4 * TILE - 3, 0, 200);
    expect(stepBullet(g, b, 1 / 30)).toBe("brick");
    expect(at(g, 5, 4)).toBe(EMPTY);
  });

  it("lets a bullet kill the tank that fired it", () => {
    const me = tank(100, 100, 0, true);
    const b = shot(100 + TANK_R + BULLET_R - 1, 100, -200, 0);
    b.owner = me;
    expect(bulletHits(b, me)).toBe(true);
  });

  it("holds the heading when the cursor is inside the unreachable disc", () => {
    const t = tank(100, 100, 0, true);
    t.target = 1.2;
    expect(aim(t, 104, 103)).toBe(1.2); // under the tank: nothing to ask for
    expect(aim(t, 300, 100)).toBeCloseTo(0); // out in the open: a real request
  });

  it("caps how fast the hull can turn", () => {
    const step = TURN_RATE * (1 / 60);
    expect(Math.abs(turnToward(0, Math.PI, step))).toBeCloseTo(step);
  });
});
