# CHOMPERS

A 2D pixel-art, side-scrolling **eater roguelike** set in the Florida Everglades. You are a crocodile.
Hatch small, eat everything that fits in your jaws, grow, shed your skin, and graft on traits from the
animals you devour until you are the swamp god. Then something bigger finds you and you start again.

Inspired by the *Hungry Shark* games, with roguelike runs, a procedural swamp, a living ecosystem and
a skill tree of animal traits you unlock permanently.

## Play

No build step, no dependencies, no assets. Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

`node build.js` bundles everything into two single files in `dist/`: `chompers.html` (a complete
standalone page you can open from disk or host anywhere) and `chompers.artifact.html` (the same game
as a fragment for hosts that supply their own document shell).

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Swim | `WASD` / arrows (on land: `UP` hops) | left thumb anywhere on the left half |
| Bite | `SPACE` / `J` / right mouse | `BITE` pad (hold to keep chomping) |
| Death roll (while latched) | `SPACE` again | `BITE` pad again |
| Dash / ram | `SHIFT` / `K` | `DASH` pad |
| Steer with the mouse | hold left mouse | - |
| Pause / settings | `P` / `ESC` | `II` button |
| Trait codex | `C` | via pause |
| Crack the egg | mash `SPACE` | tap |
| Help | `H` | via pause |
| Mute | `M` | via pause |

On a phone held upright the canvas turns sideways automatically so the game fills the screen; touch
input is mapped through the rotation. The touch pads can be switched off in the pause menu.

## How a run works

- **Start as an egg.** Every run opens on a nest at the water's edge. Mash bite (or tap) to crack the shell, hatch, and crawl for the water.
- **Eat** anything under half your size to swallow it whole. Bigger prey takes bites, bleeds, and comes apart.
- **Latch** onto medium prey with a bite, then bite again to **death roll** and shred it.
- **Hunger** drains constantly. Starving drains your health. Keep eating.
- **Grow** through twelve size tiers: Hatchling, Juvenile, Sub-adult, Adult, Bull, Elder, Ancient, Titan, Leviathan, Sarcosuchus, Deinosuchus, Swamp God.
- Every new tier makes you **shed your skin** and choose one of three cards: an evolution path node or an animal trait.
- **Predators** hunt you while you are small and flee when you are big.
- **Bosses** arrive after certain sheds: Old Scar, the Poacher Warboat, Mother Python, the Skunk Ape, and Big Bull.
- Death is permanent, but the traits you unlock are not.

## Evolution paths

Four tiered paths, five nodes each, ending in an evolution that changes how you play.

| Path | Theme | Evolution |
| --- | --- | --- |
| **Ripper** | bite damage, bleeding, death rolls, blood frenzy, crits | Apex Ripper: colossal jaws that hit everything in reach |
| **Behemoth** | armor, HP, iron stomach, bull rush | Titan: grow faster, enemies flee in terror |
| **Phantom** | speed, ambush crits, stealth, shadow dash | Wraith: higher leaps, slow-motion breaches, afterimages |
| **Abyssal** | venom, regeneration, lure, toxic blood | Leviathan: periodic shockwaves |

## Animal traits

Every shed opens the **genome orb**: a rotating DNA double helix wound around a glowing sphere,
carrying one bead for every splice you have taken. Each bead wears the animated icon of the animal it
came from, and the animal you are about to splice in swims, flaps or prowls at the core of the orb
while you choose. A slim live helix in the corner of the HUD tracks the same genome during play, and
the codex lists every trait beside its animal.

Alongside the paths, shed cards offer **traits grafted from real Everglades animals**, each of which
changes your crocodile's body as well as its stats: ganoid scales from the alligator gar, dermal
denticles from the bull shark, a carapace from the snapping turtle, an unhinged python jaw, manatee
blubber, boar tusks, a stingray's caudal barb, panther claws, a tarpon's dorsal fin, and more.

Ten further traits are **locked until you earn them**, and they stay unlocked across runs:

| Trait | Unlocked by |
| --- | --- |
| Snapping Tongue | crack and eat 100 snapping turtles |
| Hullbreaker | sink 15 boats |
| Wingsnatcher | eat 60 birds |
| Constrictor Coil | eat 20 pythons |
| Blood Scent | kill 400 creatures |
| Tapetum Lucidum | survive 5 nights |
| Goliath Gullet | eat 30 creatures over 200 lbs |
| Swarm Caller | eat 300 small fish |
| Electric Organ | eat 40 eels |
| Osteoderm Lattice | crack 150 shells and hulls |
| Man-Eater | eat 50 people |
| Deinosuchus Blood | reach Swamp God once |

**Snapping Tongue** and **Swarm Caller** drag small fish into your mouth and swallow them
automatically, so a parked crocodile keeps eating and growing on its own. Press `C` for the codex,
which lists every trait and your progress toward the locked ones.

## The swamp

The ecosystem runs with or without you. Ospreys and pelicans plunge out of the sky for fish, anhingas
chase them underwater, vultures circle and land on carrion, panthers and coyotes stalk raccoons along
the banks, and predatory fish eat the schools. Around forty creature types live here, from apple
snails and crayfish on the bottom to goliath grouper, sawfish and manatees in the deep channels.

People are everywhere too: fishing docks, stilt-house fish camps lit up at night, ranger towers, boat
ramps, crab traps, channel markers and campfires, plus airboats, party pontoons, jon boats and kayaks.
Most of it can be smashed, and everyone on it can be eaten.

## Art

Every sprite is defined in code, no image files. The crocodile is authored at double the world pixel
density so it can carry real detail: a raised eye turret with a slit pupil and catchlight, nostrils on
the snout tip, paired dorsal scute keels, dithered lateral scale rows, rectangular belly plates,
interlocking teeth and clawed feet. Traits redraw it: a keeled turtle carapace, ganoid diamond scales,
shark denticles, a dorsal sail, tusks, a tail barb.

The swamp is layered. Four parallax bands of cypress, palm and oak sit behind live oaks with hanging
moss, cypress knees, palmettos, ferns, cattails, vines and flowers on the banks. Underwater there is
duckweed and flowering water hyacinth on the surface film, algae strands, sunken branches, shell beds,
hanging roots, drifting detritus, rippling caustics, a hazy thermocline and limestone strata in the
mud. Dawn and dusk raise mist off the water.

## Tech

Plain HTML5 canvas and vanilla JavaScript. Everything is procedural: pixel sprites are defined in
code, the crocodile is built from parts and drawn as an undulating segment chain, terrain is a noise
heightmap, gore is sprite slicing plus particles, and all audio is synthesized with WebAudio.

```
index.html
build.js            bundles everything into dist/
css/style.css
src/util.js         math, noise, colors
src/font.js         5x7 bitmap font
src/audio.js        synthesized SFX, ambience, music
src/sprites.js      pixel sprites, procedural crocodile, segment chain
src/particles.js    blood, gibs, bubbles, splashes, popups
src/world.js        terrain, chunks, sky/day cycle, water, forest
src/traits.js       animal traits, unlock milestones, saved progress
src/dna.js          animated animal icons and the DNA genome orb
src/skills.js       evolution paths, size tiers, shed cards
src/entities.js     prey, predators, boats, bosses
src/creatures.js    the wider ecosystem and animals that hunt each other
src/structures.js   docks, fish camps, towers, traps
src/player.js       the crocodile
src/ui.js           HUD, title, shed screen, codex, touch pads, death screen
src/game.js         loop, camera, spawn director, input
```
