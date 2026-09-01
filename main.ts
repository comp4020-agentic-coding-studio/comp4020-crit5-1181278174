import { H, W } from "./src/config.ts";
import { newGame, press, step } from "./src/game.ts";
import { drawBoom, drawCursor, drawLives, drawTank, paintMap } from "./src/render.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#arena")!;
canvas.width = W;
canvas.height = H;
const g = canvas.getContext("2d")!;
g.imageSmoothingEnabled = false;

const world = newGame();
let mapLayer = paintMap(world.arena.grid);

function toWorld(e: PointerEvent): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
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
  g.drawImage(mapLayer, 0, 0);
  for (const e of world.enemies) if (e.alive) drawTank(g, e);
  if (world.player.alive) drawTank(g, world.player);
  for (const b of world.booms) drawBoom(g, b.x, b.y, b.t, b.player);
  drawLives(g, world.lives);
  if (aiming) drawCursor(g, world.cursor.x, world.cursor.y);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
