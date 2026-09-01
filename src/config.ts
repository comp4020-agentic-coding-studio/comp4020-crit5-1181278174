// Every tunable number in the game. Nothing here reads the DOM.

export const TILE = 16;
export const COLS = 40;
export const ROWS = 30;
export const W = COLS * TILE; // 640
export const H = ROWS * TILE; // 480

// The HUD had been painted over the top row of steel: 6px tall, on a grey wall,
// the same grey. It gets its own band above the arena instead, so the canvas is
// taller than the playfield and the world is drawn offset by HUD_H.
export const HUD_H = 32;
export const CANVAS_H = H + HUD_H; // 512

// The tank never stops and never reverses. Speed is constant; the only thing
// the player controls is how fast it is allowed to turn.
export const SPEED = 60; // px/s
export const TURN_RATE = 2.0; // rad/s
export const TURN_RADIUS = SPEED / TURN_RATE; // 30px -- just under two tiles
export const TANK_R = 6; // collision circle

// Inside this radius the cursor cannot say anything the tank could act on:
// the whole disc is unreachable geometry. So the heading holds instead of
// snapping to noise under the cursor.
export const DEAD_ZONE = TURN_RADIUS;

export const BULLET_SPEED = 200;
export const BULLET_R = 2;
export const BULLET_BOUNCES = 3;
export const BULLET_LIFE = 4; // seconds
export const MUZZLE = TANK_R + BULLET_R + 1;
export const FIRE_COOLDOWN = 0.35;
export const MAX_BULLETS = 3; // in flight, per tank

// The enemy's gun is on the `care` dial, and it is a slower gun than yours.
// A wave-1 tank fires wide and reloads slowly; a wave-3 tank waits for the
// line. Yours never changes -- the difficulty is theirs, not a nerf to you.
export const ENEMY_RELOAD = (care: number) => 1.6 - 0.8 * care;
export const ENEMY_CLIP = (care: number) => Math.round(1 + care);
export const ENEMY_WINDOW = (care: number) => 0.06 + 0.35 * (1 - care);
export const ENEMY_RANGE = 260; // px: it fights at a distance you can read
export const ENEMY_STANDOFF = 110; // px: closer than this it breaks off

export const LIVES = 3;

export type Wave = {
  enemies: number;
  care: number; // how carefully the enemy checks what is in front of its gun
  steelShare: number; // of the obstacle tiles placed, how many are steel
  coverage: number; // share of the interior taken by obstacles
};

export const WAVES: Wave[] = [
  { enemies: 1, care: 0, steelShare: 0.25, coverage: 0.08 },
  { enemies: 2, care: 0.5, steelShare: 0.5, coverage: 0.11 },
  { enemies: 3, care: 1, steelShare: 0.75, coverage: 0.14 },
];

/** Fixed for every wave and every respawn: you always start from the same tile. */
export const SPAWN = { cx: 6, cy: 24, angle: 0 };
export const RUNWAY = 8; // clear tiles that must lie ahead of the spawn
export const SPAWN_CLEAR = 2 * TURN_RADIUS; // px: room for one full turn
export const ENEMY_MIN_DIST = 12; // tiles from the player spawn
export const BLOCK_GAP = 4; // tiles between obstacles: no corridor narrower than a U-turn
