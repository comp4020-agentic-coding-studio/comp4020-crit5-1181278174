# Crit 5 · No Reverse — implementation plan (PLAN.md)

> This is a decision record: the director rules, the agent proposes. Only the
> plan published on the course site is the **spec** (`crits/05-game`), and it
> wins any conflict; then `CLAUDE.md`; then this file.
>
> Work started 2026-09-02 03:32 AEST, cutoff 08:30 — **4.9 hours**. Every
> section below is written against that budget.

## Decision record (2026-09-02 02:50–03:30, design conversation, before any code)

The agent pushed back three times; the director's rulings follow. Where the body
of this plan disagrees with this section, this section wins.

### Ruled on, not reopening

**The core verb**

1. **The tank moves forward at a fixed speed, always.** No stopping, no reverse.
2. **The cursor sets the heading, but there is a maximum angular velocity** — so
   there is a turning radius, and there is inertia.
3. **Hull heading is gun heading.** No independent turret: a turret needs a
   second input to steer with, and pure pointer control is then bankrupt.
4. **Two inputs for the whole game: move the pointer, and click.**

**The world, and what kills you**

5. **Two kinds of wall. Brick breaks in one hit; steel is indestructible and
   reflects bullets.** The outer ring must be steel. One bullet cannot both blow
   a wall open and bounce off it.
6. **A bullet that breaks brick is consumed** and does not fly on. This makes
   "brick eats the bullet and opens a way / steel sends the bullet back" a clean
   dichotomy, and makes shooting your way out a move you can rely on.
7. **A bullet kills the tank that fired it.** Firing down a steel corridor is
   posting yourself a delayed round.
8. **Touching a wall kills you.** Added late, and it closes a hole that would
   have voided the core constraint entirely: pressed against a wall the
   tangential component is zero, so the tank stops while still free to rotate —
   hugging a wall becomes a safe zone. Lethal walls have no such zone. Bonus: a
   wall death is 100% attributable, which makes it the most teachable rule here.
9. **Ramming an enemy kills both** — the player loses a life, that enemy dies.
10. **One hit kills, and enemies are bound by exactly the same rules**: same
    speed, same turn limit, walls kill them, their own bullets kill them.

**The arena**

11. **Open ground with scattered obstacles, procedurally generated. Not a maze.**
    Geometry: turning radius r = v/ω, and turning around inside a corridor needs
    2r + the hull across. Any corridor narrower than that is one-way, and lethal
    walls turn one-way into unwinnable. Battle City's 1–2 tile maze does not hold
    up under these rules. The reference is Atari *Combat*.

**Runs and lives**

12. **Three lives.**
13. **Enemies die in one hit and do not respawn.** Wave 1 has 1, wave 2 has 2 at
    once, wave 3 has 3 at once. **Clearing three waves is the win.**
    (We discussed giving enemies three lives too, and cut it: the player's three
    lives are not a rule, they are learning scaffolding for someone meeting this
    for the first time. Symmetry of rules is the spine; symmetry of scaffolding
    is not symmetry, because only one side is a person.)
14. **Each wave is harder**, on three dials: enemy count, enemy
    self-preservation, and the generator's steel:brick ratio.
15. **Dying does not reset wave progress** — enemies already killed stay dead.
16. **The tank does not move at the start.** There is a start.
17. **Respawn at a fixed spawn point.**
18. **The ending screens may use words.** The spec forbids *instructions* — text
    that teaches you how to play — not text as a resource. Naming the game, the
    lives indicator, the wave count and the result screen are none of them
    instructions. **There is one red line: nothing may tell the player what the
    input is.**

### Proposed by the agent in the body, adopted

- **Start and respawn are the same state**: stationary, hull tracking the
  cursor, **click to go**. It makes "fixed spawn point" and "safe respawn"
  compatible when they started out in conflict — safety is no longer a
  generator predicate, the player picks their own moment. It costs nothing (same
  state as the start) and it re-teaches the opening lesson on every death.
- **The click that starts you is also your first shot**: the risk that the
  player never discovers they can fire becomes the gate on starting. The
  property that matters is not that it is conspicuous, but that **the state
  before the start has no danger and no clock** — being slow to find it costs
  nothing.
- **The spawn faces open ground, not a brick wall.** The first bullet has to
  cross open floor to teach "click = a thing flies out along the hull"; brick a
  tile away swallows the flight.

### 03:40, three more rulings (agent asked, director answered each)

- **Stack: adopted.** Vanilla TS + Vite + Canvas 2D. It ships in the template,
  zero conversion.
- **One bullet at a time: vetoed.** Several bullets are fine; a bullet must not
  live forever. This is a game about dodging fire, and with one bullet on the
  field there is nothing to dodge. **Several in the air, each with a life
  limit.** The cost is
  that "who killed me" gets muddy again, mitigated two cheaper ways instead:
  **player bullets and enemy bullets must be distinguishable at a glance**
  (colour and shape — not an instruction), and every tank has a fire cooldown
  and a cap on bullets in flight so clicking fast cannot flood the arena.
- **Fixed layout for wave 1: adopted.**
- **Touch**: pointer events unify mouse/touch/pen, but on a touchscreen "move
  the cursor" and "click" are the same gesture. Reuse crit 4's TAP threshold
  (lift within 10 px / 250 ms = fire, otherwise it was a steering drag). After
  the core.
- **Name**: No Reverse.

## 0. The goal

A tank that only goes forward, an open arena, three waves of enemies. The player
has a mouse and nothing else. **Not one word of explanation.**

Six of the spec's seven lines are engineering. One is only design: **it teaches
itself**. §4 is where this plan puts its weight.

## 1. Explicitly not doing (drift guard)

- No audio. The spec does not ask for it this week and it would eat the budget.
  Revisit only if everything else is done.
- No menu, settings, difficulty select, save, high score.
- No enemy pathfinding (A\*). Steer-at-target plus wall avoidance is enough; see §5.
- No enemy types, no pickups, no particle system.
- No mobile-only UI (touch control is the same pointer handling above, not a
  second interface).
- **Do not touch `base: "./"` in `vite.config.ts`.** The Pages path depends on it.

## 2. Interaction model (specification)

### 2.1 Steering

- Target heading = the vector from the hull to the cursor.
- **Dead zone**: while the cursor is inside the circle of radius r (the turning
  radius) centred on the hull, **the target heading holds last frame's value**.
  This is not a hack: for a car turning at radius r, the interiors of the two
  circles of radius r tangent to the current heading are unreachable (Dubins
  car), so a cursor in there is pointing somewhere the tank cannot get to. It
  reads as "cursor near the tank = drive straight".
  Without it, the frame the tank passes the cursor the target angle flips 180°
  and triggers an involuntary full-rate turn — with lethal walls that is a
  fairness problem, not a feel problem.
- **Steering is bang-bang**: always turn at maximum angular velocity toward the
  target angle, snapping when the difference drops under ω·dt. Proportional
  control would hide the fact that an angular velocity limit exists at all;
  bang-bang keeps it visible every second.

### 2.2 State machine

```
READY ──click (and fire)──> PLAYING ──wall/bullet/ram──> DEAD ──(lives>0)──> READY
                                │                          └──(lives=0)──> LOST
                                └──wave cleared──> WAVE_CLEAR ──> READY (next) / WON (after 3)
```

- `READY`: the tank sits still at the fixed spawn, hull tracking the cursor, and
  the enemies **are frozen too** — the whole run holds, so the player gets an
  unhurried moment to read the board.
- `WON` / `LOST`: a definite end screen. The spec's line 2 wants "play ends
  somewhere", and an arcade loop that restarts seamlessly strictly never does.
  Words allowed.

### 2.3 Bullets

- Spawned at a muzzle offset (otherwise you shoot yourself leaving the barrel).
- Steel: mirror reflection (flip vx or vy depending on which edge was hit).
- Brick: the brick goes, the bullet goes.
- Any tank, **including the one that fired it**: both are killed.
- **Life limit**: gone after 3 bounces or 4 seconds. A bullet that ricochets
  forever across open ground is a permanent hazard.
- **Several in the air**, with a 0.35 s cooldown and a cap of 3 in flight per tank.
- **Player bullets and enemy bullets must be distinguishable at a glance.** This
  is the mitigation for allowing several: when a bullet kills you, you have to be
  able to see whose it was.

### 2.4 Collision and death

- Tank vs wall: **contact kills**, no sliding resolution. (The cheapest ruling in
  this whole plan.)
- Tank vs tank: both die.
- Circle vs grid AABB, not a rotated rectangle — the hull is approximated by a
  circle, and contact should be forgiving.

## 3. Map generator (specification)

- 40 × 30 grid, 16 px tiles, 640 × 480 logical canvas. Integer-scaled to the viewport.
- The outer ring is all steel.
- Obstacles scattered **sparsely** inside: single tiles or 2×2 blocks, steel:brick
  by wave (see §6). Target coverage 8%–15%.
- The spawn is fixed at bottom-centre, initially facing up.

**Invariants (this is what the test in §7 guards)**

1. The outer ring is entirely steel.
2. **≥ 8 tiles** of clear ground directly ahead of the spawn (the runway: walls
   kill, so a respawn must come with reaction time).
3. No obstacle inside the disc of **turning-diameter** radius around the spawn
   (you can turn around).
4. **No empty tile is enclosed by steel on three sides** (a steel dead end is a
   place you die on entering, and cannot even shoot your way out of).
5. Enemy spawns are ≥ 12 tiles from the player spawn.

Invariant 4 is the "every dead end must be capped with brick" rule. Note that it
is simultaneously a **fairness guarantee** and the director's original fantasy of
being pushed into a corner by inertia and shooting an escape route: the rule that
makes the game fair and the rule that produces that moment are the same rule.

## 4. The tutorial-free teaching schedule ★

The spec's line 3. Every rule needs a moment that teaches it without words, **and
every rule that can kill the player must be taught on someone else first.**

| Rule | Teaching moment | Cost |
|---|---|---|
| Cursor steers | In `READY`, the hull tracks the cursor | none — still, no clock |
| **Click = fire** | **Clicking is the only way out of `READY`**, and that click is the first bullet, crossing open floor | none |
| Cannot stop | Self-evident 2 seconds after launch | none |
| Angular velocity limit | Throw the cursor around and watch it arc; 3 seconds | none |
| Walls kill | The first wall. 100% attributable, costs one life, and the respawn drops you back into `READY` to re-teach the opening | one life |
| Brick breaks in one hit | There is brick in the wave 1 arena; hit it and it goes | none |
| One hit kills an enemy | Killing the wave 1 enemy | none |
| **Steel does not break + bullets reflect + your own bullet kills you** | **Demonstrated by the enemy**: wave 1's enemy has self-preservation 0, so it fires at steel from close range and is killed by its own returning bullet | none — taught on someone else |
| Ramming kills both | Not staged; it happens by accident soon enough | one life |
| Clearing advances the wave | The screen changes at the wave boundary | none |

That last one is a gift from the design: **because enemies are bound by exactly
the same rules, an enemy will be killed by its own ricochet.** Three of the most
dangerous rules, taught at once, with no words. It is the only reason wave 1
needs a fixed layout — procedural generation cannot guarantee it happens on screen.

**The cursor is a reticle shape, not an arrow.** In a game with no tutorial that
is not an art decision.
(Later: playing it turned this into a small red flag planted at the target point.
"Not an arrow" holds; "reticle" was wrong — a reticle says *shoot here*, but the
tank has to swing a 30 px radius to arrive, so it is a **place**, not a firing
point. See `7be15f2`.)

## 5. Enemies (specification)

A very dumb controller is enough, because **the constraints do the AI for you**:
nobody can stop, so an enemy's gun is off you most of the time, and that alone
produces an approach–threaten–pass–re-approach rhythm.

- Steering: turn toward the player (the same bang-bang function the player uses).
- Wall avoidance: if there is wall within N tiles ahead, bend the target angle
  away. N scales with self-preservation.
- Firing: fire when roughly lined up on the player and there is no steel within
  some distance ahead.
- **Self-preservation `care` ∈ [0,1]** is the difficulty dial, and also the tutorial:
  - `care = 0` (wave 1): fires without checking for steel ahead → kills itself.
    Short avoidance distance too, so it clips walls occasionally.
  - `care = 0.5` (wave 2): checks for steel, avoids walls properly.
  - `care = 1` (wave 3): checks steel, leads the player, and stays out of corners.
- Replacement enemies do not spawn at fixed points (fixed points get camped).

## 6. Waves and endings

| Wave | Enemies | `care` | steel:brick | Coverage |
|---|---|---|---|---|
| 1 | 1 | 0 | 1:3 (brick-heavy = escape routes, safe to shoot) | 8%, **fixed layout** |
| 2 | 2 | 0.5 | 1:1 | 11%, generated |
| 3 | 3 | 1 | 3:1 (steel-heavy = ricochets, no way through) | 14%, generated |

The steel:brick ratio is this design's own dial: it does not turn a number up, it
**changes the arena's character** — and procedural generation gives it away free.

Three waves cleared → `WON`. Three lives spent → `LOST`. Both are definite end screens.

## 7. Automated tests (first half of spec line 5)

`spec/game.test.ts`, alongside `spec/invariants.test.ts` (any `spec/*.test.ts`
runs with `pnpm check`).

**The headline test: the generator invariants, as a property test over 200 seeds.**
Asserting the five in §3.

Why that one: procedural generation moves the testable surface from "feel" to
"pure function", which is a gift the random map hands you. And what it guards is
**fairness** — in a game where walls kill, a generated map that can trap the
player is an unacceptable bug. That makes it the best candidate for "a rule of
the game".

Smaller tests alongside (pure functions, no DOM):

- Bullet hits a horizontal steel edge → vy flips, vx unchanged.
- Bullet hits brick → the brick is cleared and the bullet is gone (does not fly on).
- The shooter walks into its own bullet's path → it dies.
- Dead zone: cursor within radius r leaves the target heading unchanged.

**Every test must be shown capable of failing** (`CLAUDE.md`'s rule): pull the
dead-end capping out of the generator, watch it go red, put it back. That commit
is the process evidence.

## 8. Module split

Code lives in `src/`, so **the first thing to do is add `src` to `include` in
`tsconfig.json`** — it is currently `["*.ts", "spec", "scripts"]`, `include` is a
whitelist, and without it `pnpm typecheck` silently skips the entire engine
(`CLAUDE.md`, "Facts about this repo that bite", second entry — A1 already paid
for this lesson once).

| File | Job |
|---|---|
| `src/config.ts` | Every tunable, in one place |
| `src/map.ts` | Grid, generator, invariant checks |
| `src/sim.ts` | Tank step, bullet step, reflection, collision and death (pure, no DOM) |
| `src/ai.ts` | Enemy steering and firing decisions, the `care` parameter |
| `src/game.ts` | State machine, waves, lives |
| `src/render.ts` | Canvas drawing |
| `main.ts` | Pointer input, rAF loop, assembly |

`sim.ts` and `map.ts` having no DOM dependency is deliberate — every test in §7
lands on those two files.

## 9. Build order and time budget (4.9 hours left)

| Time | What | What is visible when it lands |
|---|---|---|
| 03:35–04:00 | tsconfig include, config, canvas, rAF, `READY` | A stationary tank tracking the cursor |
| 04:00–04:30 | Movement, lethal walls, map rendering (fixed map first) | **The first playable thing**: it drives, it dies |
| 04:30–05:00 | Bullets: firing, steel reflection, brick destruction, self-kill | The complete shooting rules |
| 05:00–05:30 | Generator + invariants + `spec/game.test.ts` (red → green) | A test going red to green: process evidence |
| 05:30–06:10 | Enemy AI + `care` | A game with an opponent |
| 06:10–06:40 | Waves, lives, respawn, win/lose endings | One complete run |
| 06:40–07:10 | **Play it.** Both marking viewports (`pnpm shot`) | The change for the second half of spec line 5 |
| 07:10–07:35 | Polish: pixel art, `prefers-reduced-motion`, a11y, card.png, meta | Something worth looking at |
| 07:35–08:00 | `PROCESS.md` + `reflections/crit-5.md` + screenshots | `pnpm check:evidence` goes green |
| 08:00–08:25 | **ship**: flip public, Pages, wait for CI, verify the deployed URL | Live |

**07:10 is the content freeze.** After it, documents and shipping only. If the
schedule slips, cut polish, never documents — `pnpm check:evidence` is a hard
gate (four red right now: no reflection, `PROCESS.md` still template comments,
two placeholder commit hashes that do not exist), and **CI does not run a single
line while the repo is private**. Its first real run is the moment it goes public
after 08:00, and that is too late to find anything.

## 10. Starting parameters (all of them wait for play)

| Parameter | Start | Note |
|---|---|---|
| Tile | 16 px | 640×480 logical canvas, integer scaling |
| Tank speed v | 60 px/s | 3.75 tiles/s |
| Max angular velocity ω | 2.0 rad/s | turning radius r = 30 px ≈ 1.9 tiles, diameter ≈ 3.8 tiles |
| Bullet speed b | 200 px/s | 3.3 × tank speed |
| Bullet life | 3 bounces / 4 s | must not live forever |
| Fire cooldown | 0.35 s | stops click-spam flooding the arena |
| Bullets in flight per tank | 3 | |
| Hull radius | 6 px | collision circle |
| Dead zone radius | = r = 30 px | |

**Suicide distance**: after firing at steel directly ahead, the time to escape is
t = 2d/(b+v) and the lateral displacement is ≈ v·ω·t²/2, i.e. **proportional to
d²**. On the table above: at d = 10 tiles, t ≈ 1.2 s, easy; at d = 3 tiles the
lateral move is half a hull width, dangerous; at d = 2 tiles it is certain death.
So "do not fire within 3 tiles of steel" is a feel the player has to learn, and
the d² means the threshold is steep. This was the agent's argument for the
single-bullet limit — with one bullet on the field you can see which side of the
threshold you are on. It lost (see the 03:40 rulings), and the two mitigations
there stand in for it.

## 11. Things only playing it can tell you (second half of spec line 5)

The spec explicitly wants one change that came from playing the finished thing
rather than reading the code. Candidates, **not to be ruled on in advance**:

- How large ω has to be to have inertia without feeling strangled.
- Whether a 0.35 s cooldown is too fast (arena floods) or too slow (dodging is
  not satisfying).
- Whether `care = 0` kills itself often enough — too rarely and it teaches
  nothing, too often and the game plays itself.
- Whether lethal walls plus three lives reads as "learned it" or "put off" in the
  first minute.
- Whether a dead zone of r is too large.
- Whether the cause of death is still legible with three enemies on screen in wave 3.

When the change lands, the commit message must say **it came from playing, not
from reading**, and `PROCESS.md` cites that commit.

### What playing actually turned up (three, none of them on the list above)

Not one of the six candidates became a change. The parameters were settled by
180 headless runs; what actually playing it exposed was entirely **things you can
see and cannot read**:

| Commit | What playing showed |
| --- | --- |
| `36fef06` | Lives and waves were 6 px pips painted on the top row of steel — grey on grey. Playing, you have no idea how many lives you have left. → Canvas raised to 512, the HUD gets its own 32 px band, and lives and waves are drawn as the shape of the thing they stand for: tanks. |
| `59b7444` | The ARENA / COLOPHON links in the header looked clickable and did nothing visible (the page is one screen to begin with). → Two links that actually respond: Colophon opens in place, Source goes to the repo. |
| `7be15f2` | The reticle (see the note in §4). |

## 12. Risks

1. **Three waves is six kills, and a good player might finish in 2 minutes**,
   where the brief wants it still interesting at five. Mitigation: make wave 3
   genuinely hard; if play says it is too short, **another wave is cheaper than
   another mechanic** — wave 4 (4 enemies, all-steel arena) is already sitting
   there.
2. **The wave 1 suicide demonstration is not guaranteed to happen** → fixed
   layout, with steel placed on its patrol line. If three playthroughs go by
   without it, make wave 1's `care` negative (actively fire at the nearest steel).
3. **Touch is unplayable**, and 390 is one of the marking viewports. Add the TAP
   threshold after the core is done.
4. **CI only runs once the repo is public.** Before 08:00, `pnpm check` and
   `pnpm check:evidence` must be green locally.
