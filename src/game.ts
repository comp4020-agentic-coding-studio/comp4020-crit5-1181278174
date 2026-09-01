// The state machine and the world it owns. Still no DOM here -- main.ts does
// the wiring, render.ts does the drawing.

import { FIRE_COOLDOWN, LIVES, SPEED, TANK_R, WAVES } from "./config.ts";
import { aimAt, wantsToShoot } from "./ai.ts";
import { centre, generate, wave1, type Arena } from "./map.ts";
import {
  advance,
  aim,
  bulletHits,
  canFire,
  fire,
  steer,
  stepBullet,
  tank,
  tankHitsWall,
  type Bullet,
  type Tank,
} from "./sim.ts";

export type Phase = "READY" | "PLAYING" | "DEAD" | "WAVE_CLEAR" | "WON" | "LOST";

export type Boom = { x: number; y: number; t: number; player: boolean };

export type World = {
  phase: Phase;
  arena: Arena;
  player: Tank;
  enemies: Tank[];
  bullets: Bullet[];
  booms: Boom[];
  lives: number;
  wave: number;
  cursor: { x: number; y: number };
  mapDirty: boolean;
  clock: number; // seconds spent in the current phase
};

const DEAD_PAUSE = 1.0;
const CLEAR_PAUSE = 1.3;

function spawnPlayer(a: Arena): Tank {
  const p = centre(a.player.cx, a.player.cy);
  return tank(p.x, p.y, a.player.angle, true);
}

/** Wave 1 is the hand-placed arena; after that every wave is a fresh draw. */
function arenaFor(wave: number): Arena {
  if (wave === 1) return wave1();
  return generate(Math.floor(Math.random() * 0xffffffff), WAVES[wave - 1]!);
}

function armWave(w: World, wave: number): void {
  const care = WAVES[wave - 1]!.care;
  w.wave = wave;
  w.arena = arenaFor(wave);
  w.player = spawnPlayer(w.arena);
  w.enemies = w.arena.enemies.map((s) => {
    const c = centre(s.cx, s.cy);
    return tank(c.x, c.y, s.angle, false, care);
  });
  w.bullets = [];
  w.mapDirty = true;
  w.phase = "READY";
  w.clock = 0;
}

export function newGame(): World {
  const w: World = {
    phase: "READY",
    arena: wave1(),
    player: tank(0, 0, 0, true),
    enemies: [],
    bullets: [],
    booms: [],
    lives: LIVES,
    wave: 1,
    cursor: { x: 0, y: 0 },
    mapDirty: true,
    clock: 0,
  };
  armWave(w, 1);
  w.cursor = { x: w.player.x + 90, y: w.player.y };
  return w;
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
    for (const t of tanks(w)) if (t.cooldown > 0) t.cooldown -= dt;

    advance(w.player, dt, SPEED);
    for (const e of w.enemies) {
      if (!e.alive) continue;
      e.target = aimAt(w.arena.grid, e, w.player, SPEED);
      steer(e, dt);
      advance(e, dt, SPEED);
      if (w.player.alive && wantsToShoot(w.arena.grid, e, w.player, Math.random())) shoot(w, e);
    }

    for (const t of tanks(w)) if (tankHitsWall(w.arena.grid, t)) destroy(w, t);

    // Ramming kills both. Without it a tank that cannot stop and cannot
    // reverse would have no answer to another one sitting in its path.
    for (const e of w.enemies) {
      if (!e.alive || !w.player.alive) continue;
      const d = TANK_R * 2;
      if ((e.x - w.player.x) ** 2 + (e.y - w.player.y) ** 2 < d * d) {
        destroy(w, e);
        destroy(w, w.player);
      }
    }

    const live: Bullet[] = [];
    for (const b of w.bullets) {
      const fate = stepBullet(w.arena.grid, b, dt);
      if (fate === "brick") {
        w.mapDirty = true;
        continue;
      }
      if (fate === "gone") continue;
      let spent = false;
      for (const t of tanks(w)) {
        if (bulletHits(b, t)) {
          destroy(w, t);
          spent = true;
          break;
        }
      }
      if (!spent) live.push(b);
    }
    w.bullets = live;

    if (w.phase === "PLAYING" && w.enemies.every((e) => !e.alive)) {
      w.phase = "WAVE_CLEAR";
      w.clock = 0;
    }
    return;
  }

  if (w.phase === "WAVE_CLEAR" && w.clock >= CLEAR_PAUSE) {
    if (w.wave >= WAVES.length) {
      w.phase = "WON";
      w.clock = 0;
    } else {
      armWave(w, w.wave + 1);
    }
  }

  if (w.phase === "DEAD" && w.clock >= DEAD_PAUSE) {
    w.lives -= 1;
    w.clock = 0;
    if (w.lives <= 0) {
      w.phase = "LOST";
    } else {
      // Respawn is the opening state again: same tile, same stillness, and
      // nothing moves until you click. There is no unfair frame.
      // The wave does not reset with you: the bricks you broke stay broken
      // and the enemies you killed stay dead. A life buys another attempt at
      // what is left, not a rerun.
      w.player = spawnPlayer(w.arena);
      w.bullets = [];
      w.phase = w.enemies.every((e) => !e.alive) ? "WAVE_CLEAR" : "READY";
    }
  }
}

function tanks(w: World): Tank[] {
  return [w.player, ...w.enemies].filter((t) => t.alive);
}

function shoot(w: World, t: Tank): void {
  const mine = w.bullets.reduce((n, b) => n + (b.owner === t ? 1 : 0), 0);
  if (!canFire(t, mine)) return;
  t.cooldown = FIRE_COOLDOWN;
  w.bullets.push(fire(t));
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
  if (w.phase === "WON" || w.phase === "LOST") {
    w.lives = LIVES;
    w.booms = [];
    armWave(w, 1);
    return;
  }
  // The same click that starts the game fires the first shot -- so the one
  // input you tried is also the one that taught you what clicking does.
  if (w.phase === "READY") {
    w.phase = "PLAYING";
    w.clock = 0;
  }
  if (w.phase === "PLAYING") shoot(w, w.player);
}
