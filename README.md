# The Midnight Gallery

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/iuzuka/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/iuzuka/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

Built for the [make.fun "Make the best heist game" bounty](https://make.fun/bounty/best-heist-game-20261122-0559).

A top-down stealth heist in a museum at night. You are Wren, a thief slipping
through three gallery rooms past patrolling guards and sweeping security
cameras. Steal the Aurum Star (and the Gilded Orchid in the Vault), grab what
else you can carry, and reach the green exit before the alarm meter fills.

## How to play

- **Move:** WASD or arrow keys. **Shift** sneaks at half speed — sneaking
  halves how fast the alarm rises and lets you pass closer to a cone edge.
- **Click the floor** to walk there. **1 / 2 / 3** select a tool,
  **Space** uses it; while the decoy coin is selected, clicking throws the
  coin to that spot instead.
- **Tools (bought with score):** Smoke pellet ($50, 4s of cover), EMP burst
  ($75, cameras dark for 6s), Decoy coin ($25, the nearest guard investigates
  for 3s). **B** buys one more of the selected tool. You start each room with
  2 smoke, 1 EMP and 3 decoys.
- **P** pauses, **R** restarts the room, **M** mutes the sound.

## The alarm

Guards see you inside their red vision cone, cameras inside their sweeping
amber cone, when nothing blocks their line of sight. While seen, the alarm
rises — faster up close, slower while sneaking or in a blue shadow hall.
Unseen, it falls. At 40 the nearest guard investigates where you were last
seen; at 70 every guard chases you; at 100 you are caught. In the Vault,
live laser beams raise the alarm fast — cross only while they are dark.

Grabbing a room's main loot unlocks its exit. Reaching the exit scores your
loot, a time bonus, and a 300-point Ghost bonus if the alarm never passed
Suspicious. Your best total is kept in the browser.

## How to run it

Serve `game/` with any static server and open `game/index.html` in a desktop
browser — no build step, no network requests, no assets beyond the files
here:

```
node serve.ts
```

then open http://localhost:8080. The screenshots in `screenshots/` are real
renders of this game, staged with `?shot=play|title|spotted|getaway&seed=7`
(see `shots.json` for the exact query behind each file).

## Structure

- `game/src/config.js` — playfield, tuning numbers, palette
- `game/src/random.js` — seeded generator
- `game/src/levels.js` — the three room definitions
- `game/src/world.js` — simulation: movement, patrols, cones, alarm, tools
- `game/src/render.js` — all drawing and the HUD
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — procedural Web Audio sounds
- `game/src/shots.js` — the deterministic screenshot scenes
- `game/src/boot.js` — the game loop, screens and shot staging
- `main.ts` — hands the game and screenshots in with the dossier
