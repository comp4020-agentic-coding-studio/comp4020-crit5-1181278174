# COMP4020 Crit 5 — a game

Static site, HTML/CSS/TypeScript on Vite, on GitHub Pages. **The deployed URL is what gets
marked.** The course site's brief and spec (`crits/05-game`) are the fixed contract — the brief
poses the problem, the spec is what the tutor verifies at the crit. Read both on the site before
planning or building.

The crit runs like C4's, with one turn of the screw: **the pod plays it cold, and I stay quiet
until someone has finished it or given up.** The no-tutorial rule is the one line in the spec
that cannot be put under test and cannot be faked — four people's hands settle it in about ten
seconds. No check in this repo can tell you whether a stranger knows what to do; only watching
one try can.

## This prototype

**Not decided yet.** Concept and stack are open as of 2026-09-02 — nothing goes in this section
until I rule on them, and the agent does not fill it in on my behalf. When a decision lands it
is recorded here, quoted, with provenance and a date.

The stack is *undecided*, not *defaulted*: this repo currently ships the template's vanilla
TypeScript + Vite, `base: "./"` already handles the Pages path, and everything below about Vite,
`tsconfig.json` and the minifier assumes that. If I switch stacks, those entries get re-checked
against the new one, not carried on faith.

Order of authority: the course site's published spec wins, then this file, then any plan or task
list in the repo.

## How to work in here

- Keep `pnpm dev` running; run `pnpm check` before pushing. **In this repo `check` is
  typecheck → build → vitest** — the A1 lint stages are still not wired in. Do not describe
  checks this repo does not run.
- **While the repo is private, CI runs nothing** — see Facts that bite. The evidence files must
  be green *before* the flip, not during it. Reproduce CI's checks with its own command from
  `.github/workflows/checks.yml`, not from memory.
- Sensor roster = `package.json`'s `check`, `.github/workflows/checks.yml`, the spec tests in
  `spec/`, and **`pnpm shot`** (`scripts/shot.ts`, machine-local: it needs the Linux chromium
  and `~/chromium-libs`). `pnpm smoke` is **not carried into this repo yet** — C4's version
  drove `window.__inkqin` and its scenarios belong to that prototype. The CDP driver underneath
  it is worth having back once there is a game to drive; carrying it is a decision, not a
  default.
- **"Never commit a red state" means never commit a regression.** The week's spec tests start
  red by design and the commits that flip them green are process evidence. Committing with one
  still red is fine **when the message names which one and why**. Making a test green by
  weakening it never is.
- Read a red check's output before changing anything — the failure message is the instruction,
  and the page is wrong until it is green.
- Open the page in a browser and play it. The rendered, playable page is the truth; my mental
  model of it is not. **This week that means playing, not just looking** — whether a rule is
  discoverable, whether a loss feels fair, and whether the opening screen invites a first move
  are all invisible to `pnpm check`. The spec asks for one change that came from *playing* the
  finished game rather than reading its code; that change has to actually happen, and its commit
  has to say so.
- **Stuck: stop and ask, do not loop.** Two failed attempts on one theory is the signal. Report
  what you tried, what you observed, what you now think, then wait.
- **Can't verify: say so and route it — but check whether it's the tool first.** "Can't be
  checked here" needs evidence like any other claim.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s head points at it.
Replace it and the `description` meta, and copy the head block into any new page. The card URL
resolves against the page that names it, like any link — `./card.png` is wrong one directory
down, and nothing in CI checks it, so look at the deployed head when you add pages.

## Working with me — stopping points and evidence obligations

The marked thing is *my* directing. A fix I never saw is not evidence; a run I could not steer
is not directing.

- **One bounded task per turn**, then stop and report. The next thing you noticed goes under
  "next".
- **Stop at the first red check**, never fix it silently. Paste the failure, say what you think
  went wrong, offer: (a) fix the code, (b) add a rule here, (c) add or tighten a check, (d)
  throw the attempt away. Wait for my pick.
- **Two attempts, then stop.** A third on the same theory is never what is needed.
- **Design decisions are mine.** More than one reasonable answer → at most two options with
  trade-offs and a recommendation, then wait. Decisions go under "This prototype", quoted, with
  provenance.
- **List what you fixed on your own** under "fixed silently", so I can decide whether it earns a
  rule or a check.
- **Cap the run.** After ~10 tool calls without a checkpoint, or ~15 minutes, report progress
  even if unfinished. On interrupt, summarise state and wait.
- **The evidence block ends every turn** — commands + output, diff shape, what you observed at
  both viewports (or "no UI yet"), what you did not verify, fixed silently, next.
- **Never paraphrase a director message as though quoted, and never invent one.** If there is no
  message to quote, say so.
- **Adding to this file:** the trigger is you corrected the agent on the same thing twice, or a
  check caught you unexpectedly — nothing else earns a place.
- **One commit per rule, when it happens** — this file's growth is process evidence and
  `PROCESS.md` cites those commits.

## The working loop

1. **Explore** — read the relevant source *and the checks* first.
2. **Plan** — the change, its boundary, and **how it will be verified, before writing code**.
   One-sentence diffs may skip this; unfamiliar, multi-file or open-ended ones may not.
3. **Implement** — one bounded change; a second worth doing gets its own commit.
4. **Verify** — all three: `git diff --numstat` then read it; `pnpm check`; the rendered page at
   both viewports **and what it is like to play**. **A failed verify sends you to step 1, not to
   a patch.**

**"Done" is a claim.** End every loop — and every commit message — with what you ran, what it
printed, the diff, what you observed in the artefact, and **what you did not verify**.

**A new test has to be proved capable of failing.** Break what it guards on purpose, watch it go
red, put it back. A guard that cannot fail is decoration.

**Mutate the knob the guard names, not merely something nearby.** A guard can sit green while
the property it asserts is upheld by an entirely different mechanism upstream — then it is
decoration even though the property is true, and it will keep being green on the day that
mechanism goes. C5: the no-boxed-in-pocket check survived cutting `BLOCK_GAP` from 4 to 1,
because the generator's rejection radius already forbade the shape; it only went red at 0. If
the honest mutation leaves it green, the test is measuring something other than what you named
it — rewrite it, don't weaken the mutation (`e4056f5`, the corridor-width measure).

**Corrections land in the harness, not in a retry.** Twice wrong → pick one: a rule here (with
its reason and the failing commit), a check (test / lint assertion), or `git revert` with the
reason in the message.

## Facts about this repo that bite

An entry earns its place only after it has cost time and is not guessable from the code. Shape:
what happened, what is actually true, how it was measured. Delete it when it stops being true.
Nothing is carried here unverified — each entry below was re-checked against *this* repo on
2026-09-02 before being carried from C4.

### CI is skipped while the repo is private — not merely "CI-only"

**What happened.** A push showed a run in progress, and the agent reported that Actions minutes
were available and every push would now give real CI signal.

**What is actually true.** Both jobs skip while the repo is private; nothing runs. The first
real run of `check:evidence` is at ship time, and it gates `deploy` — so the evidence files must
be green *before* the flip, not discovered during it.

**How it was measured.** A1 run `31954015672` on `main`: `check` skipped, `deploy` skipped
(`gh run view 31954015672 --json jobs`). This repo is private and ships the same two workflows.

### `tsconfig.json` does not typecheck `src/`

**What happened.** In A1, `pnpm typecheck` was green while `src/` and `scripts/` were not being
looked at. The engine was about to land in `src/sim` entirely unchecked, and the check that
would have said so was reporting success.

**What is actually true here.** Re-read on 2026-09-02: this repo's `include` is
`["*.ts", "spec", "scripts"]` — **`src` is still missing**, exactly as C4 shipped it. `include`
is a whitelist, not a default, so **a green typecheck means nothing until you know what is in
scope.** The moment any code lands in `src/`, add it here; `pnpm typecheck` will not tell you it
was skipped.

**How it was measured.** A1: widening `include` immediately surfaced five pre-existing type
errors in the starter's own `scripts/check-evidence.ts` (`toSorted` against an ES2022 `lib`) —
five errors in a file that had shipped, under a check that had always been green. Here:
`tsconfig.json` read directly, `src` absent.

### A test that passes locally can still time out on CI, and the first run is at ship time

**What happened.** `pnpm check` was green on this machine for the whole week. The flip to public
ran CI for the first time, and the two generator property tests failed on it — not on an
assertion, on `Test timed out in 5000ms`. `deploy` is gated on `check`, so the site did not
publish and the red was discovered with the repo already public.

**What is actually true.** vitest's default `testTimeout` is 5000ms and this repo set none. The
corridor and pocket guards walk 200 seeds x 3 waves and take **2719ms and 2130ms here** — inside
the budget, with no margin. GitHub's shared runner is roughly half this machine's speed, which
is all it takes. So local green is not a prediction of CI green for anything slower than about
2s, and because CI is skipped while the repo is private (above), the first honest measurement
lands at the least recoverable moment.

**How it was measured.** `vitest run --reporter=verbose` for the local numbers; run
`33552148479`, annotations `spec/game.test.ts#71` and `#90`. Fixed by setting
`test: { testTimeout: 30_000 }` in `vite.config.ts` — the ceiling, not the assertions. Watch the
wall-clock of a new property test, not just its colour.

### `vitest` does not typecheck, so a stale import fails at runtime instead

`pnpm check` runs `tsc --noEmit` over the whole repo and *then* vitest, but vitest itself
transpiles without checking types. A spec file that imports a name it no longer uses is caught by
the typecheck; one that uses a name it no longer *imports* is not caught there either — it dies
inside the test as `TANK_R is not defined`, which reads as a broken assertion rather than a
broken import. Measured 2026-09-02: removing `TANK_R` from the import list in `spec/game.test.ts`
while line 140 still used it produced a red test, not a red typecheck. When a test fails on a
name, check the import list before you go looking at the logic.

### Node runs `.ts` in strip-only mode — no parameter properties, no enums

**What happened.** `scripts/smoke.ts` was written with `constructor(private readonly ws: WebSocket)`
and `pnpm smoke` died with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` before doing anything, while
`pnpm typecheck` had been perfectly happy with it.

**What is actually true.** `node scripts/x.ts` strips types; it does not compile TypeScript.
Anything that *emits code* — parameter properties, `enum`, `namespace`, decorators — is refused
at load time. `tsc --noEmit` does not know the script will be run by Node and passes it. Scripts
under `scripts/` are plain TypeScript-as-annotations: declare the field, assign it in the body.

**How it was measured.** Node 24.19, the error's own stack (`stripTypeScriptModuleTypes`); the
one-line rewrite ran first time.

### Vite's minifier rewrites string literals to backticks

**What happened.** Two spec tests grepped the built bundle for `"keydown"` and `"pointerdown"`
and failed, while `grep` found both names sitting in `dist/assets/*.js`. The code was correct
and the tests looked correct.

**What is actually true.** esbuild (via `vite build`) emits ``addEventListener(`keydown`,e=>{``
— **backticks**, not the double quotes written in the source. Any test that asserts a string
literal is present in the bundle must accept `"`, `'` and `` ` ``. Build the regex through a
`QUOTED()` helper instead of hard-coding a quote character.

**How it was measured.** `grep -oE '.{18}(keydown|pointerdown).{6}' dist/assets/*.js` printed
the backticked form. After the fix, mutating the bundle (`keydown`/`keyup`/`pointerdown`
renamed) sent both tests red and restoring it sent them green — so the helper is not vacuously
true.

**The wider lesson.** A test that greps built output is testing the minifier as much as the
code. Assert the *contract* and leave the spelling to the toolchain — an over-specified guard
fails on a correct page, which is worse than no guard, because it trains you to ignore it.

### Windows Chrome headless clamps the viewport to 526 CSS px and crops the PNG

**What happened.** The first 390×844 screenshot of the A1 page looked like a CSS bug: the h1
running off the right edge, content cut off. It was not a CSS bug. The narrow layout was correct
the whole time.

**What is actually true.** `chrome.exe --headless --window-size=390,844` does not give a
390-wide page. Chrome clamps the window, lays the page out at **`clientWidth = 526`**, and then
writes a PNG cropped to 390×844 — so the file has the size you asked for and the layout you did
not. `--headless=new` and `--headless=old` behave identically.
`--force-device-scale-factor=2` with `--window-size=780,1688` does not divide it either: the
layout viewport comes out at 754 while the PNG renders at 2×.

Consequences: **no screenshot from that toolchain evidences the 390 viewport**, and a
phone-width screenshot that looks broken should be measured before it is believed. Name such
files for the width they actually rendered, never for the width requested.

**How it was measured.** A probe page printing `document.documentElement.clientWidth`,
screenshotted at `--window-size=390,844`: it reads **526**. At
`--force-device-scale-factor=2 --window-size=780,1688`: 754.

**How it was fixed.** A **Linux** Chromium has no window manager to clamp it and lays out at
exactly the width asked for. Use **`pnpm shot`** (`scripts/shot.ts`, carried from A1 through C4),
never `chrome.exe`: it drives Playwright's cached `chrome-headless-shell`, shoots both marking
viewports, and **verifies the layout width with `--dump-dom` before trusting each PNG** —
because one silently was not evidence, and nothing but a measurement can tell the difference.
It uses Node built-ins only; there is no package to install.

That binary needs three shared libraries this WSL lacks. Fetched unprivileged, no `sudo`:

```
mkdir -p ~/chromium-libs && cd ~/chromium-libs
apt-get download libnspr4 libnss3 libasound2t64
for d in *.deb; do dpkg-deb -x "$d" root/; done
```

`scripts/shot.ts` puts `~/chromium-libs/root/usr/lib/x86_64-linux-gnu` on `LD_LIBRARY_PATH`, and
names any further missing `lib*.so` in its own error with the command to fetch it. The directory
is machine-local and untracked — it is already present on this machine.

One route still does not work, so it is not retried blind: CDP
(`Emulation.setDeviceMetricsOverride`, which would also set the layout viewport directly) needs
the Windows-side debug port reachable from WSL, and it is not, on `127.0.0.1`, `localhost` or
the default gateway.

## Before you commit the page

Enforced by `spec/invariants.test.ts` against `dist/`: `lang` on `<html>` · non-empty `<title>`
· meta `description` · `og:image` card · viewport meta · exactly one `<h1>` · `alt` on every
`<img>` · **a navigation landmark** — a single page still owes it one.

Enforced by nothing but me, whatever the game turns out to be:

- **Every action has a keyboard path**, or the pointer path is a deliberate, recorded decision
  with a reason — as in C4. Do not let it become an accident.
- `touch-action: none` and pointer capture on any drag surface; coordinates normalised.
- `aria-pressed` on toggles; a throttled `aria-live` readout if there is a changing value.
- `prefers-reduced-motion` honoured — keep informative motion, drop decorative motion.
- **Sound, if there is any, never starts before a gesture.** The autoplay policy suspends the
  `AudioContext`; resuming it anywhere but in a user gesture is both a bug and a spec violation.
- Delete a starter test along with the starter markup it guards — its failure then is not a
  regression, and re-adding `data-testid="intro"` is the wrong fix.

And owed by *this week's* published spec, judged by people, not by `check`:

- **no instructions anywhere** — on screen or off, including the README. Naming the game is
  allowed; explaining it is not.
- **it can be lost** — a wrong move exists and play ends somewhere.
- **a stranger reaches an ending inside five minutes.**
- **one change came from playing the finished game**, not from reading its code.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the harness is
assessed. This file and the sensors wired into `check` carry across the course — both come with
me into next week's repo. The prototype does not: source, and the tests answering this week's
published spec, stay behind. `spec/README.md` draws the line.

When a convention has to hold, a sensor keeps catching you out, or a fact about the stack is
easy to get wrong — write it down here and wire it into `check`. Growing this file is the work.
