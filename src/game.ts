// The state machine and the world it owns. Still no DOM here -- main.ts does
// the wiring, render.ts does the drawing.

import { LIVES, SPEED } from "./config.ts";
import { centre, wave1, type Arena } from "./map.ts";
import { advance, aim, steer, tank, tankHitsWall, type Tank } from "./sim.ts";

export type Phase = "READY" | "PLAYING" | "DEAD" | "WAVE_CLEAR" | "WON" | "LOST";

export type Boom = { x: number; y: number; t: number; player: boolean };

export type World = {
  phase: Phase;
  arena: Arena;
  player: Tank;
  enemies: Tank[];
  booms: Boom[];
  lives: number;
  wave: number;
  cursor: { x: number; y: number };
  mapDirty: boolean;
  clock: number; // seconds spent in the current phase
};

const DEAD_PAUSE = 1.0;

function spawnPlayer(a: Arena): Tank {
  const p = centre(a.player.cx, a.player.cy);
  return tank(p.x, p.y, a.player.angle, true);
}

export function newGame(): World {
  const arena = wave1();
  const player = spawnPlayer(arena);
  return {
    phase: "READY",
    arena,
    player,
    enemies: arena.enemies.map((s) => {
      const c = centre(s.cx, s.cy);
      return tank(c.x, c.y, s.angle, false, 0);
    }),
    booms: [],
    lives: LIVES,
    wave: 1,
    cursor: { x: player.x + 90, y: player.y },
    mapDirty: true,
    clock: 0,
  };
}

export function step(w: World, dt: number): void {
  w.clock += dt;
  for (const b of w.booms) b.t += dt;
  if (w.booms.length) w.booms = w.booms.filter((b) => b.t < 0.7);

  if (w.phase === "READY" || w.phase === "PLAYING") {
    // Even frozen, the hull answers the cursor: the one thing you can do
    // before the game starts is the one thing the game is made of.
    w.player.target = aim(w.player, w.cursor.x, w.cursor.y);
    steer(w.player, dt);
  }

  if (w.phase === "PLAYING") {
    advance(w.player, dt, SPEED);
    if (tankHitsWall(w.arena.grid, w.player)) destroy(w, w.player);
    return;
  }

  if (w.phase === "DEAD" && w.clock >= DEAD_PAUSE) {
    w.lives -= 1;
    w.clock = 0;
    if (w.lives <= 0) {
      w.phase = "LOST";
    } else {
      // Respawn is the opening state again: same tile, same stillness, and
      // nothing moves until you click. There is no unfair frame.
      w.player = spawnPlayer(w.arena);
      w.phase = "READY";
    }
  }
}

export function destroy(w: World, t: Tank): void {
  if (!t.alive) return;
  t.alive = false;
  w.booms.push({ x: t.x, y: t.y, t: 0, player: t.player });
  if (t.player) {
    w.phase = "DEAD";
    w.clock = 0;
  }
}

export function press(w: World): void {
  if (w.phase === "READY") {
    w.phase = "PLAYING";
    w.clock = 0;
  }
}
