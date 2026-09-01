import { CANVAS_H, HUD_H, W, WAVES } from "./src/config.ts";
import { newGame, press, step } from "./src/game.ts";
import {
  drawBoom,
  drawBullet,
  drawCursor,
  drawEnding,
  drawHud,
  drawTank,
  paintMap,
} from "./src/render.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#arena")!;
canvas.width = W;
canvas.height = CANVAS_H;
const g = canvas.getContext("2d")!;
g.imageSmoothingEnabled = false;

const world = newGame();
let mapLayer = paintMap(world.arena.grid);

function toWorld(e: PointerEvent): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * W,
    y: ((e.clientY - r.top) / r.height) * CANVAS_H - HUD_H,
  };
}

let aiming = false;
canvas.addEventListener("pointermove", (e) => {
  world.cursor = toWorld(e);
  if (!aiming) {
    aiming = true;
    canvas.classList.add("aiming");
  }
});
canvas.addEventListener("pointerdown", (e) => {
  world.cursor = toWorld(e);
  canvas.setPointerCapture(e.pointerId);
  press(world);
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  step(world, dt);

  if (world.mapDirty) {
    mapLayer = paintMap(world.arena.grid);
    world.mapDirty = false;
  }
  drawHud(g, world.lives, world.wave, WAVES.length);
  g.save();
  g.translate(0, HUD_H);
  g.drawImage(mapLayer, 0, 0);
  for (const e of world.enemies) if (e.alive) drawTank(g, e);
  if (world.player.alive) drawTank(g, world.player);
  for (const b of world.bullets) drawBullet(g, b.x, b.y, b.owner.player);
  for (const b of world.booms) drawBoom(g, b.x, b.y, b.t, b.player);
  if (world.phase === "WON" || world.phase === "LOST") {
    drawEnding(g, world.phase === "WON", world.clock);
  }
  if (aiming) drawCursor(g, world.cursor.x, world.cursor.y);
  g.restore();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
