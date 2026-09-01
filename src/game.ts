// The state machine and the world it owns. Still no DOM here -- main.ts does
// the wiring, render.ts does the drawing.

import { LIVES, SPEED } from "./config.ts";
import { centre, wave1, type Arena } from "./map.ts";
import { advance, aim, steer, tank, tankHitsWall, type Tank } from "./sim.ts";

export type Phase = "READY" | "PLAYING" | "DEAD" | "WAVE_CLEAR" | "WON" | "LOST";

export type World = {
  phase: Phase;
  arena: Arena;
  player: Tank;
  enemies: Tank[];
  lives: number;
  wave: number;
  cursor: { x: number; y: number };
  mapDirty: boolean;
  clock: number; // seconds spent in the current phase
};

function place(a: Arena): { player: Tank; enemies: Tank[] } {
  const p = centre(a.player.cx, a.player.cy);
  return {
    player: tank(p.x, p.y, a.player.angle, true),
    enemies: a.enemies.map((s) => {
      const c = centre(s.cx, s.cy);
      return tank(c.x, c.y, s.angle, false, 0);
    }),
  };
}

export function newGame(): World {
  const arena = wave1();
  const { player, enemies } = place(arena);
  return {
    phase: "READY",
    arena,
    player,
    enemies,
    lives: LIVES,
    wave: 1,
    cursor: { x: player.x + 100, y: player.y },
    mapDirty: true,
    clock: 0,
  };
}

export function step(w: World, dt: number): void {
  w.clock += dt;

  // In READY the arena is frozen -- but the hull still answers the cursor, so
  // the one thing you can do before the game starts is the one thing the game
  // is made of.
  w.player.target = aim(w.player, w.cursor.x, w.cursor.y);
  steer(w.player, dt);

  if (w.phase !== "PLAYING") return;

  advance(w.player, dt, SPEED);
  if (tankHitsWall(w.arena.grid, w.player)) kill(w);
}

function kill(w: World): void {
  w.player.alive = false;
  w.phase = "DEAD";
  w.clock = 0;
}

export function press(w: World): void {
  if (w.phase === "READY") {
    w.phase = "PLAYING";
    w.clock = 0;
  }
}
