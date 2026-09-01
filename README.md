# No Reverse — COMP4020 crit 5, "a game"

A tank that cannot stop and cannot reverse. It is always moving forward at one
speed; the only thing that ever changes is where forward points, and it turns
at a fixed rate, so it arrives where you sent it late and wide. Touching a wall
kills it. So does any bullet, including its own. The enemies obey every one of
those rules too — the only thing they have that you don't is a `care` dial that
opens up over three waves.

You get three lives. There are six enemies, they don't come back, and the walls
you break stay broken.

**This README does not say how to play, and that is the point.** The brief
forbids instructions, so the game teaches itself or it fails. Nothing on the
page or in this repo tells you what the mouse does.

The arenas after the first are generated per run — rejection-sampled rectangles
with a guaranteed runway at the spawn and no corridor tighter than the tank's
turning circle. TypeScript, Canvas 2D, Vite, no framework and no assets: every
pixel is drawn at runtime.

- **`PLAN.md`** is the decision record, arguments and overrules included;
  **`PROCESS.md`** maps how it was built; **`reflections/crit-5.md`** is the
  reflection.
- The simulation (`src/map.ts`, `src/sim.ts`, `src/ai.ts`, `src/game.ts`) never
  touches the DOM, which is why `spec/game.test.ts` can play two hundred
  arenas per run without a browser.

## Working on it

```sh
mise install && pnpm install
pnpm dev             # local dev server
pnpm check           # typecheck → build → vitest (what CI runs, minus links and secrets)
pnpm shot            # screenshots at both marking viewports, layout width verified
pnpm check:evidence  # the process-evidence check CI runs before deploy
```

`shot` needs a Linux `chrome-headless-shell` (Playwright's cache) and three
shared libraries fetched into `~/chromium-libs` — see `CLAUDE.md`, "Facts about
this repo that bite". Windows Chrome silently lays out at 526 CSS px and will
lie to you about the mobile viewport.

This repo was provisioned from the course's static template: the CI in
`.github/workflows/checks.yml` runs once the repo is public and deploys `dist/`
to GitHub Pages.
