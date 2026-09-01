# Crit 5 — No Reverse

## What was the breakthrough that moved the work forward?

My `CLAUDE.md` already required that a new test be proved capable of failing:
break what it guards, watch it go red, put it back. This week that was not
enough. I had a test asserting the generator never boxes an empty tile in on
three sides, written to guard the minimum gap between obstacles. I cut that gap
from 4 tiles to 1 and the test stayed green. The property it names was still
true — blocks still could not touch — but the thing I actually cared about was
already broken: a corridor wide enough for a tank that cannot reverse to turn
around in. The test only went red at a gap of 0, a value I would never ship.

So it was decoration. I wrote the check I should have written first: it measures
the free run through every empty tile on both axes and requires twice the
turning radius, and it fails at a gap of 1. It states the constraint the game
actually has, rather than a shape that happens to correlate with it.

## What did this work change about who I want to be as a software developer?

Passing is not evidence. A test earns its place only if it can fail for the
right reason, and the only way to find that out is to break the specific thing
it names — not something nearby — and watch. That is now a written rule rather
than something I remember to do.

It also changed how I lay code out. Map generation, physics, enemy decisions and
game state are plain functions with no browser in them, so 200 seeds across 3
waves runs as a test instead of by hand. Code I cannot test is code I cannot
check, and I would rather design for the check up front.
