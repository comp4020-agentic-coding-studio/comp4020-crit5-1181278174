// Every tunable number in the game. Nothing here reads the DOM.

export const TILE = 16;
export const COLS = 40;
export const ROWS = 30;
export const W = COLS * TILE; // 640
export const H = ROWS * TILE; // 480

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

export const LIVES = 3;
