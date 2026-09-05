# CHOMPERS

A 2D pixel-art, side-scrolling **eater roguelike** set in the Florida Everglades. You are Subject 7:
a lab-made crocodile spliced with the genes of every animal alive. You break your tank, take the storm
sewer out, and surface in the swamp with the whole genome to spend.

Eat anything that fits in your jaws. Every meal pays **gene points**, and you spend them whenever you
like on a hexagonal **gene tree** of six lineages. How you hunt builds affinity, so the lineage that
matches your style keeps getting cheaper, and specialising far enough down one branch unlocks its apex
gene. Inspired by the *Hungry Shark* games, with roguelike runs, a hand-authored map of named biomes,
simulated water, mud and weather, and a cartoon cast of ninety animals that come apart when bitten.

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
| Gene tree | `G` / `E` / `TAB` | tap the gene chip |
| Trait codex | `C` | via pause |
| Break the tank | mash `SPACE` | tap |
| Help | `H` | via pause |
| Mute | `M` | via pause |

On a phone held upright the canvas turns sideways automatically so the game fills the screen; touch
input is mapped through the rotation. The touch pads can be switched off in the pause menu.

## How a run works

- **You start in a tank.** A containment lab, acid, and scientists on the other side of the glass. Mash bite to crack it, drop into the drain, and follow the storm sewer east past the rats.
- **Chew through the outfall grate** and the Everglades open up in front of you.
- **Eat** anything under half your size to swallow it whole. Bigger prey takes bites, bleeds, loses limbs and comes apart.
- **Latch** onto medium prey with a bite, then bite again to **death roll** and tear it in half.
- **Hunger** drains constantly. Starving drains your health. Keep eating.
- **Gene points** drop from every meal. Press `G` at any moment, in the middle of a fight if you want, and spend them.
- **Grow** through twelve size tiers: Hatchling, Juvenile, Sub-adult, Adult, Bull, Elder, Ancient, Titan, Leviathan, Sarcosuchus, Deinosuchus, Swamp God. Each tier sheds your skin and pays two free points.
- **Predators** hunt you while you are small and flee when you are big.
- **Bosses** arrive after certain sheds: Old Scar, the Poacher Warboat, Mother Python, the Skunk Ape, and Big Bull.
- Death is permanent, but the traits you unlock are not.

## The gene tree

Six lineages radiate from one primordial cell on a hex grid, four genes deep, with hybrid genes sitting
between neighbouring lineages. A gene can be taken whenever it touches something you already own, so
you can drive straight down one branch or weave across the middle.

| Lineage | Theme | Apex |
| --- | --- | --- |
| **Ripper** | bite damage, bleeding, death rolls, blood frenzy | Apex Ripper: colossal jaws that hit everything in reach |
| **Bulwark** | armor, plating, iron stomach | Living Fortress: attackers take 40% back and nothing can move you |
| **Phantom** | speed, ambush, stealth | Wraith: two dashes, higher leaps, slow-motion breaches |
| **Abyssal** | venom, regeneration, lure | Leviathan: shockwaves, toxic blood, venom immunity |
| **Colossus** | growth, swallowing, bulk | Titan: quaking bites and a crushing ram |
| **Savage** | land speed, night vision, people | Man-Eater: people panic, boats break like sticks |

**Affinity** is the quiet half of the system. Rolling and dismembering feeds Ripper, ambush kills feed
Phantom, taking hits feeds Bulwark, eating big meals feeds Colossus, and hunting people and land
animals feeds Savage. Each lineage's genes get up to 50% cheaper as its affinity climbs, so the
crocodile you end up with is the one you actually played.

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

## The map

The world is authored, not shuffled. One long swamp runs west to east through named places, each with
its own palette, plants, animals and human activity:

| Biome | What it is |
| --- | --- |
| **Containment** | the lab you were made in: concrete, crates, a broken tank |
| **Storm Sewer** | a flooded pipe run full of rats, roaches and trash |
| **The Outfall** | a concrete canal under a city skyline, thick with tilapia and walking catfish |
| **Mangrove Tangle** | shallow braided water, root islands, snapper and sheepshead |
| **Gator Joe's Fish Camp** | a working town: bait shop, docks, stilt houses, moored jon boats |
| **Cypress Swamp** | dark deep pockets, knees and moss, panthers and bears on the hummocks |
| **Sawgrass Prairie** | broad shallow sheet flow, wading birds, deer on the low islands |
| **The Deep Cut** | a fast cut channel with tarpon, bull sharks and undercut banks |
| **Paradise Campground** | tents, fire rings, coolers, campers who did not read the sign |
| **Florida Bay** | open deep water, dolphins, sawfish, manatees, a far shore you never reach |

The ecosystem runs with or without you. Ospreys and pelicans plunge for fish, anhingas chase them
underwater, vultures land on carrion, panthers stalk raccoons along the banks, herons spear hatchlings
in the shallows, and predatory fish eat the schools.

**The swamp is simulated, not painted.** The water surface is a bouncy spring-mass field: every splash,
bite, breach, hull and swimming body pushes it, waves travel and reflect, foam blobs form on the
crests, and rain pocks it. The mud is a deformable bed that your belly presses into. Weather rolls
through in showers with wind, lightning and delayed thunder. Plants are sprung, so they bend and shed
leaves when you crash through them.

People are everywhere: fishing docks, the bait shop, stilt-house camps lit at night, ranger towers,
campsites, crab traps and channel markers, plus airboats, pontoons, jon boats, poacher skiffs and
kayaks. Armed people hold their ground and shoot with lead on their aim, then break and run when you
get inside their nerve. Watching a neighbour get eaten sets the whole group running.

## Gore

Bites tear limbs off. A wounded animal keeps moving with one leg gone, trailing blood, until something
finishes it. Death rolls cut prey clean in half. Bodies burst into their own rig parts plus hearts,
guts, livers, eyes and bone, and the soft pieces float while the heavy ones sink. Blood spreads as
slicks across the water surface and soaks into pools on the mud. All of it can be switched down in the
pause menu.

## Art

Every sprite is drawn in code, no image files, in a chunky hand-drawn cartoon style: round bodies,
dark outlines, three-tone shading and big expressive eyes.

Animals are **rigged, jointed puppets** generated from a species description, then posed every frame
from an animation state, so limbs swing, tails wag, wings beat and heads bob. Because each part is a
separate piece, a bite can take one off and a death can scatter the rest. Fish have articulated tails
and pectoral fins; birds have two-part wings, smooth tube necks that stretch and spear, and legs that
trail in flight; quadrupeds have four swinging legs and heads that dip to graze; turtles pull into
their shells; frogs kick; crabs scuttle; snakes slither as chains of beads.

**People are procedurally varied.** Skin, hair style and colour, clothes, hats, glasses, beards and
props are all rolled per person, so the campsite is full of different-looking campers. Everyone has a
big head and big eyes, and a second scared face with blown pupils and an open mouth that shows the
moment they notice you.

The crocodile is authored at double the world pixel density with a thick outline that survives being
drawn at half scale: a raised eye turret with a big cartoon eye, a rounded snout, dorsal scute keels,
belly plates and clawed feet. Genes redraw it: a keeled carapace, ganoid diamond scales, shark
denticles, a dorsal sail, tusks, a tail barb, glowing eyes.

The swamp is layered. Four parallax bands of cypress, palm and oak sit behind live oaks with hanging
moss, cypress knees, palmettos, ferns, cattails, vines and flowers on the banks. Underwater there is
duckweed and flowering water hyacinth on the surface film, algae strands, sunken branches, shell beds,
hanging roots, drifting detritus, rippling caustics, a hazy thermocline and limestone strata in the
mud. Dawn and dusk raise mist off the water.

## Tech

Plain HTML5 canvas and vanilla JavaScript. Everything is generated in code: sprites are painted by
drawing routines, creatures are toon rigs built from a species catalogue and posed per frame, the
crocodile is a segment chain, terrain is an authored profile of control points, water is a bouncy
spring-mass surface, mud is a pressure field, gore is real rig parts plus organs, and all audio is
synthesized with WebAudio.

```
index.html
build.js            bundles everything into dist/
css/style.css
src/util.js         math, noise, colors
src/font.js         5x7 bitmap font
src/audio.js        synthesized SFX, ambience, music
src/sprites.js      pixel sprites, procedural crocodile, segment chain
src/rig.js          toon rig generators: fish, birds, quadrupeds, people, turtles, snakes...
src/species.js      the species catalogue: sizes, weights, behaviour, colours
src/particles.js    blood, gibs, bubbles, splashes, silt, leaves, footprints, rain
src/gore.js         dismemberment, organs, blood slicks and pools
src/map.js          the authored terrain profile and the biome table
src/physics.js      water waves, mud deformation, weather, sprung foliage
src/world.js        terrain, chunks, sky/day cycle, water, forest
src/traits.js       animal traits, unlock milestones, saved progress
src/dna.js          animated animal icons and the DNA genome orb
src/skills.js       size tiers and legacy trait cards
src/genome.js       the hex gene tree, gene points and playstyle affinity
src/entities.js     prey, predators, boats, bosses
src/creatures.js    the wider ecosystem and animals that hunt each other
src/structures.js   docks, fish camps, towers, traps
src/player.js       the crocodile
src/ui.js           HUD, title, shed screen, codex, touch pads, death screen
src/game.js         loop, camera, spawn director, input
```
