# CHOMPERS

A 2D pixel-art, side-scrolling **eater roguelike** set in the Florida Everglades. You are a crocodile.
Hatch small, eat everything that fits in your jaws, grow, shed your skin, and pick an evolution path
until you are the swamp god. Then something bigger finds you and you start again.

Inspired by the *Hungry Shark* games, with roguelike runs, procedural swamps and a skill tree.

## Play

No build step, no dependencies. Open `index.html` in a modern browser, or serve the folder:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

## Controls

| Action | Keys |
| --- | --- |
| Swim | `WASD` / arrow keys (on land: `UP` hops) |
| Bite | `SPACE` / `J` / right mouse button |
| Death roll (while latched) | `SPACE` again |
| Dash / ram | `SHIFT` / `K` |
| Steer with the mouse | hold left mouse button |
| Pause / settings | `P` / `ESC` |
| Help | `H` |
| Mute | `M` |
| Touch | left half: drag to swim, right half: tap to bite, double tap to dash |

## How a run works

- **Eat** anything smaller than half your size to swallow it whole. Bigger prey takes bites, bleeds, and comes apart.
- **Latch** onto medium prey with a bite, then bite again to **death roll** and shred it.
- **Hunger** drains constantly. Starving drains your health. Keep eating.
- **Grow** through size tiers: Hatchling, Juvenile, Sub-adult, Adult, Bull, Elder, Ancient, Titan, Leviathan, Sarcosuchus, Deinosuchus, Swamp God.
- Every new tier makes you **shed your skin** and choose one of three evolution cards.
- **Predators** (rival gators, bull sharks, pythons, poachers) hunt you while you are small and flee when you are big.
- **Bosses** appear after certain sheds: Old Scar, the Poacher Warboat, Mother Python, the Skunk Ape, and Big Bull.
- Death is permanent. Your best score and longest croc are remembered.

## Evolution paths

| Path | Theme | Evolution |
| --- | --- | --- |
| **Ripper** | bite damage, bleeding, death rolls, blood frenzy, crits | Apex Ripper: colossal jaws that hit everything in reach |
| **Behemoth** | armor, HP, iron stomach, bull rush | Titan: grow faster, enemies flee in terror |
| **Phantom** | speed, ambush crits, stealth, shadow dash | Wraith: higher leaps, slow-motion breaches, afterimages |
| **Abyssal** | venom, regeneration, lure, toxic blood | Leviathan: periodic shockwaves |

Paths mix: your crocodile's colors, scars, plates, spines and glowing eyes change with the nodes you pick.

## Tech

Plain HTML5 canvas and vanilla JavaScript. Everything is procedural: pixel sprites are defined in code,
the crocodile is built from parts and drawn as an undulating segment chain, the terrain is a noise heightmap,
gore is sprite slicing plus particles, and all audio is synthesized with WebAudio.

```
index.html
css/style.css
src/util.js       math, noise, colors
src/font.js       5x7 bitmap font
src/audio.js      synthesized SFX, ambience, music
src/sprites.js    pixel sprites, procedural crocodile, segment chain
src/particles.js  blood, gibs FX, bubbles, splashes, popups
src/world.js      terrain, chunks, sky/day cycle, water, decor
src/skills.js     evolution paths, size tiers
src/entities.js   prey, predators, boats, bosses
src/player.js     the crocodile
src/ui.js         HUD, title, shed screen, death screen
src/game.js       loop, camera, spawn director, input
```
