# Process overview

## What I built

**No Reverse**, a top-down tank game: the tank always moves forward and turns at
a capped rate — no brake, no reverse — and a click sets where it steers. Walls
kill, your own bullet kills you, and nothing on screen explains it. Three waves,
three lives, generated arenas.

## The moments that mattered

### The generator could produce arenas nobody could survive

A tank that cannot stop dies in any corridor narrower than its turning circle,
so unconstrained obstacle placement makes levels that are impossible rather than
hard, and playing never finds the bad seed. So I wrote what "survivable" means
as a property test over 200 seeds × 3 waves and made the generator satisfy it:
the corridor check measures the free run through every empty tile on both axes
against twice the turning radius.
[`e4056f5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-1181278174/commit/e4056f5)

### The enemies were killing themselves

They drove into walls and rammed me, ending waves by themselves. The wall check
was a ray along the enemy's centreline, but a tank that cannot stop travels an
arc, so it hits walls beside that line. I replaced the ray with a 1.6-second
forward simulation using the game's own turn cap, speed and collision test, and
added a standoff distance — ramming trades one enemy for one of my three lives,
a trade the enemy wins. [`c45b1dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-1181278174/commit/c45b1dd)

### Wave 3 was not harder than wave 2

I raised the enemy's magazine from two rounds to three and nothing changed, so I
measured instead of guessing: mean enemy rounds in the air, 24 runs per setting.
Three rounds gave 0.90, *below* wave 2's 0.99 — the magazine was never the
limit, the aim window was. Shortening the reload did move it: 0.95 at 0.8s, 1.24
at 0.6s, 1.55 at 0.25s. I shipped 0.6s and kept the measurements beside the
constant. [`bda6f96`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-1181278174/commit/bda6f96)
