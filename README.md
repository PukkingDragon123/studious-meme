# CHOMPERS

A 2D pixel-art, side-scrolling **eater roguelike**. You are Subject 7: a lab-made crocodile spliced
with the genes of every animal alive. You break your tank, take the storm sewer out, and surface in the
swamp with the whole genome to spend — then go back down into the city's drowned pipework, or east
past the seawall and over the edge of the shelf.

Eat anything that fits in your jaws. Every meal pays **gene points**, and you spend them whenever you
like on a hexagonal **gene tree** of six lineages. How you hunt builds affinity, so the lineage that
matches your style keeps getting cheaper, and specialising far enough down one branch unlocks its apex
gene. Inspired by the *Hungry Shark* games, with roguelike runs, a hand-authored map of three zones and
twenty named biomes, simulated water, mud and weather, and a cast of a hundred and eleven animals that
come apart when bitten.

## The Science Center

The front end is a room, not a title card. A working genetics lab in side
elevation: server racks with live activity lights, a DNA sequencer running four
base lanes, monitors with a rotating helix and a growth curve, a shelf of
specimen jars, a centrifuge spinning behind glass, a fume hood with a flask
over a burner, a whiteboard covered in scrawl, service pipes, a steam vent, and
five staff walking the floor on their own beats — two pacing, one at the
console, one at the bench, one carrying a clipboard. Ceiling strips throw
visible cones and one of them is failing. An **open acid bath** is set into the floor: a corroded steel trough of green
fluid with something half dissolved propped in it, bubbling and fuming, fed by
a drip line that has been eating a stain into the concrete for years. In the
middle of the room, a containment column with a specimen suspended in it.

The menu is the furniture. Two stations, two plates, no tabs and no blurb: walk
the selection along the room and whichever one you are standing at gets a
targeting bracket. Choosing one cuts to it: the picture is squeezed to a lit
line and let back out, the way a tube set changes channel.

Each station is its own opaque room — block wall, strip lights along the
ceiling, and a floor at the foot of it with a trolley, gas bottles, a stool and
a drain on it in silhouette. They are painted, not laid over the title room as a
scrim: while they were, the whole lab behind them — the walking staff, the
containment column, the signage — ghosted through everything drawn on top.

- **HABITAT** — where animals are made and raised
- **LAB** — the bench: what you take out, what is being funded, what you brought back

Nobody walks the floor between them. There is no guide, no induction, no
speech bubble pointing at the one thing you are allowed to press — the project
that made you does not explain itself, and neither does the building. What each
station is, what DATA buys, what a vial does on the bench: you find out by
opening it.

The only thing that ever tells you what to do is the objective card a run opens
on, and that names the objective, never the button.

## The habitat — the creation menu

Clicking HABITAT does not open a wall of glass you then have to click through.
It opens the bench where crocodiles are made and raised, in one screen:

- **Six slots along the top**, each showing the animal in it swimming, or a
  plus if it is empty.
- **The stage in the middle**: a projector on a plate throwing your animal into
  the air above it, scanlined and jittered and doubled and tinted to its
  stock's own colour. On an empty slot it runs the stock library instead —
  arrows either side, the specimen running its own attack loop (idle, coil,
  lunge, strike, recover) with the phase called out like a readout, and a stock
  research has not funded showing **NO SAMPLE ON FILE**.
- **The papers on the left**: tag, species, signature, level, how far into the
  next one, spare points, runs survived.
- **Everything you can do on the right**: the three upgrade tracks and the
  button that sends it out.
- **The build along the foot**: length, girth and the nine hides, as swatches.

An animal here is a **character**, not a loadout slot. It has a species with a
signature, a tag, a level it grew to by surviving, three tracks you can put
points into, and a build. You pick which one goes out, and it is the one that
comes back, and what it did out there is the only thing that grows it. There is
no feeding it in here: what it eats, it eats in the field.

- **BODY / JAWS / BLOOD** — where the points go, as three rows of notches.
- **LENGTH / GIRTH / HIDE** — its build, and every grade is a research line item.
- **GROW** more of them on the stage, one per empty slot.

### Every species is a different animal

Not a stat block with a different number in it. The signature changes how you hunt:

| Stock | Signature | What it does |
| --- | --- | --- |
| Dwarf Alligator | **SCRAPPER** | small meals still feed it — 90% more growth off anything under a fifth its mass, and an extra gene point a tier |
| Spectacled Caiman | **SKIRMISHER** | jaw resets a third faster, and every third bite in a chain lands clean |
| Nile Crocodile | **DEATH ROLLER** | latches onto things three times its size, and the jaw-lock window is 70% wider |
| Gharial | **FISH HAWK** | fish take double and go down whole whatever the size; fast and sharp in the water, hopeless on the bank |
| Saltwater Crocodile | **AMBUSH APEX** | a strike out of stillness hits for over three times, and it is hard to notice coming |
| Deinosuchus | **TITAN** | swallows what should not fit, cannot be moved, and goes through hulls |

There is no splice bay any more. The animal you play already exists, living in
the habitat, and the enclosure is where it is built.

## Research

**You begin with nothing.** One stock animal — a dwarf alligator — in the hide it
grew, at the length and depth the paperwork says, with two gene lineages and one
map. Not a second colour. Everything else in this game is a line item on a
research programme, and the programme is funded out of what you bring back.

A finished run pays **DATA**: one per 2,200 points, one per size tier past the
first, five for a relic carried out. The death card shows the arithmetic. Data is
never spent in the field and never lost on death — the lab is the part of you
that survives.

The research screen is a lit board bolted to a wall of the lab, not a menu over
it: a lamp bar on two cables above it, a steel frame with bolts through it, an
engraved plate at its head, and the floor of the room still visible underneath —
tiles, a trolley, gas bottles and a drain. Five programme cylinders are racked down the left of the board, each filled
with its own colour to however far it has got. Beside the one you are looking at,
its chain of steps, slotted into the board.

Every step is written **and** drawn. Its name and what it gives you are on the
card; in the specimen well beside them is the thing itself — the crocodile it
unlocks, swimming; the two pigments it mixes, as swatches; the lineage it opens,
as that line's hex; the place it finds, as that site's landmark. A padlock over
the well means the step above has not been paid for. The price is stamped on a
plate at the end of the card, and a tick replaces it once the step is funded.

| Programme | What it buys |
| --- | --- |
| **MORPHOLOGY** | length and girth grades, then caiman, gharial, Nile, saltwater and a reconstructed *Deinosuchus* |
| **PIGMENTATION** | the nine hides, in four batches, from base dyes up to the lines that were never released |
| **GENE THERAPY** | the four gene lineages a crocodile is not born with, then splice tolerance for hybrids and chimeras |
| **BIOCHEMISTRY** | standing treatments stamped onto every animal after: clotting, filtration, chitin, myostatin block, barophilic marrow, adrenal, neural accelerant |
| **FIELD SURVEY** | the sewer network, the open ocean, and a deep sounding that opens the sump and the trench |

Until Gene Therapy has funded a line, its genes are sealed shut in the tree —
crosshatched and stamped, not merely dim — and its prime is not on the loadout
menu at all. Until Field Survey has been out there, a zone is a blank tab on the
globe.

## The laboratory

One station, three benches. Research used to be its own door across the room;
there was no reason for two.

**BUILD** is what you take out. A rack of glass tubes on a steel shelf — full,
lit and bubbling if biochemistry has isolated it, empty and dusty if it has not,
each wearing a label with two arrows, green up for what it gives you and red
down for what it costs. Under it, the **prime mutation** you go out carrying.
That used to be asked in a splice bay between the map and the water, which was
one screen too many; it is part of the build now.

**RESEARCH** is the programme board, described above.

**RELICS** is the vault: every artifact in the game as a slot, lit and holding
its own animated glyph once you have carried it out, sealed and grey until then,
with the site it comes from written under it and what it gives you along the
foot. Eighteen slots, and the count in the corner is the game's long score.

## The catacombs, and how you got there

The game starts under Rome. **THE CATACOMBS** is the first site and the only one
open on a new save: a labyrinth authored as a string of vaults — the cistern
you land in, the ossuary, the tomb hall, the drowned forum, the columbarium,
the outflow — each shut off from the next by a squeeze only a small animal
fits through. Tufa block and blind arches on the walls, niches with what they
were cut for still in them, torch brackets in the piers, bone piles with a
skull on top, sarcophagi with their lids on or off, amphorae, and a surface
carrying two thousand years of what floats. A roof a hand above the water is
still a roof, so the squeezes stay dark.

You got there by transfer, and the transfer is not a cutscene. It is the game.
**FACILITY B** is a building, not a wall: six rooms in a line, a hundred and
forty feet above the Roman level, dead level because they are floors, drawn by
the same renderer as everything else.

| Room | What is in it |
| --- | --- |
| **West bulkhead** | a blast door with a wheel on it, and the stencil over it |
| **Transfer corridor** | white tile to shoulder height under a capping rail and a painted stripe, doors with portholes and keypads, a hose reel, a distribution board, a spill kit |
| **Habitat hall** | a run of glass-fronted pens with crocodiles in them: shallow water, a sand bank, a heat lamp over each, feed hatches, a keeper's gantry, numbered plates, one pane cracked from the inside and one pen standing open |
| **Plant room** | the filtration that keeps the pens alive — vessels, a manifold with valve wheels, a pump running, a puddle under the leak |
| **Access chamber** | bare block, a sump pump and its rising main, a ladder somebody never finished, and a cast manhole set in the floor |
| **Loading dock** | a shutter, a leveller, and the next truck backed up to it with its doors open and empty crates racked inside |

The trolley is a structure on castors that turn. The tank on it is a real tank,
blue water, straps, TRANSFER / SUBJECT 11 stencilled on the glass. The two
people pushing it are people, leaning into the bar with their knees bent. The
camera is the game camera.

**Mash bite** and the glass cracks, then goes. The two of them run west with
their arms up and are gone through a door, and you are loose in a building with
exactly two ways out of it.

**The cover.** Stand on the manhole in the access chamber and bite it. Cast
iron, eleven stone of it, and it goes on the sixth go — then the floor is not
under you any more and what catches you is **the relief interceptor**.

**The dock.** Keep walking east instead and you get to the end of the building,
where two handlers are waiting beside a crate with a truck behind them. They do
not fight you. They pick you up. **RECAPTURED — TRANSFER ORDER 11 COMPLETE**,
and the run is over before it started.

That is the ride down, and it takes about twenty seconds with the throttle held. It is not a cutscene
either: the interceptor is three thousand units of authored map, a lined pipe
that gives up its hundred and forty feet in six steps with a bench at the foot
of each one. Precast rings every segment, a benched invert with the wash down
the middle of it, banks of washed grit, step irons up the back, side inlets
spitting in as you pass, and three **manhole shafts** overhead — cast cover,
rings, a ladder whose bottom rung stops well short of the crown, and a cone of
daylight that lands on the invert in front of you. Where the floor falls away
faster than you do you leave it and come down on the next bench. Hold right to
go faster. A gauge on the edge of the screen counts the feet off. The pipe ends
in a mouth in the wall of the cistern with a long drop under it, and the splash
is your first location. Every other sewer site puts you in through a hatch in
the crown of the vault instead.

The way out is a system. Three mechanisms, each in its own chamber, each a
small game you start by biting it: **the cistern valve** turned on a beat, **the
ossuary levers** thrown in the order the lamps showed you, **the counterweight**
held and let go in the band. A miss costs a notch, not your life. Engage all
three and the outflow gate opens, and the site's relic surfaces on the way to
it. The everglades are past that, once the lab has surveyed them.

## Locked in

A sewer run is not a stretch of water you leave when you have had enough. The
reach is barred east and west by **sluice gates**, and they are welded, not
locked. There is no key. There is no relic that opens them, no hydraulics that
will ever start, and no door at the other end of the chute you came down. What
is in here is all there is, and the only way out of the system is a stomach — it
does not have to be yours. A marker on the edge of the screen points at the
nearest wall of the world and tells you how far, so the reach has a shape even
when you cannot see either end of it.

## What they poured down here

The system is not just dark water. **Acid** pools off a plating line eat you
where you sit. **Sludge** fills your blood with filth and holds onto you.
What you see of a pool is what comes off it: a bed of vapour breathing over
the floor, puffs lifting and thinning, a scum line where it meets the water.
And the **drums** — still leaking, glowing green through the smoke — do neither:
they fill a **DOSE** meter, and when it tops out something gets grafted onto you
that you did not choose. Eight forced splices, and every one is a trade: runaway
growth that starves you, a tumourous hide that slows you, glowing blood that
heals you and shows everything where you are.

## Work going on in the water

Not props — people in the middle of doing something, who will notice you doing
something too.

**MANATEE WATCHING** is the most human thing in the swamp: a pontoon moored over
something grey and slow, six people who have paid forty dollars each leaning
over the rail to look at it. It is also six pairs of eyes pointed straight down
into the water you are trying to cross, and what they came to see is a hundred
and eighty pounds of meat that does not run. Taking it while they watch is the
single biggest jump the alarm can make.

There are also **survey crews** shooting levels across the channel from the bank,
and **traplines** somebody is coming back for.

## You start the length of a hand

Three rungs were added under HATCHLING — the bottom of the ladder used to be a
yard of animal, already the top of the food chain in the shallows. A release is
now a release of something small: **0.3 ft out of the tank**, and the mass curve
floors at 0.3 so the bottom rungs are reachable at all. Growing off that floor
is the whole game: the mass-to-size curve is flat enough that a rung is a
campaign, and a meal is only worth its full mass when it is a real share of
yours. Snacks keep you alive. They do not build an animal.

> HATCHLING · YEARLING · FINGERLING · JUVENILE · SUB-ADULT · ADULT · BULL ·
> ELDER · ANCIENT · TITAN · LEVIATHAN · SARCOSUCHUS · DEINOSUCHUS · SWAMP GOD

## Landmarks and dressing

Every release site has one big thing placed by hand rather than left to the
chunk spawner, and a short list of authored props around it — a dock and two
crab traps and a boat ramp at the fish camp, consoles and a grate and a sunken
hull at Junction 9, channel markers out in the bay. Nothing is placed twice on
the same few feet of bank — something you can see coming, orient by, hide under and remember
the place by afterwards. The biggest is **THE CAUSEWAY**: four lanes on concrete
piers with its middle span in the water, lamp standards still on the parapet,
rebar hanging out of the tear. The shadow under the deck is the best cover for
miles.

The bank has buildings on it now, and they are buildings rather than props. A
**water tower** on four braced legs with a town name half gone off the tank and
a light on top for the aircraft nobody flies. A **pump station**: a concrete box
with a screened intake running out into the channel and a vent turning on the
roof. A **boathouse** — a tin roof over a slip with a boat on its lines in the
slip, a bench and two cans on the walkway, a light on the gable. A **trailer**
on blocks, ribbed, skirted, air conditioner in the window and a dish on the
end nobody has pointed at anything since. A **billboard** on two poles for
something forty miles up the road. And a **manhole**, set in what is left of a
road, breathing the system you came out of straight back up at you.

## The animals are animals

The mammals have skeletons now. A quadruped in profile is a deep chest, a
shallower barrel, a round haunch that sits higher, a neck out of the chest to
carry the head, withers on the tall ones; forelegs hang nearly straight, hind
legs are a Z with the hock bent back; the gait is diagonal pairs that open into
a bound past a run, and standing still the chest breathes. Rats are rats.

The crocodile is slower — it cruises, it does not sprint — the leap is off the
table for now, and its bite is the strike the hologram in the lab runs: the
head draws back and the jaw cracks open, the whole animal whips forward, the
jaws close, and it settles. On land the spine works with the legs in the
lateral S of a real high walk.

No cartoon eyes. The white sclera with a big roving pupil in it is a human
face, and putting one on a deer, a bass and a heron alike is what made
everything in the game read as a mascot. A wild animal's eye is a dark wet bead
set into the skull: a socket a shade darker than the coat, an iris, a pupil,
and one pixel of light. Under two pixels across it is two pixels of dark and
one of light, and nothing else fits. The people keep their whites, because a
human face does want them.

Proportions went with it. A head two-thirds the depth of the body over stub
legs is a plush toy. Mammals now carry a small skull on a real neck — five
blended masses climbing from the shoulder — over legs with a joint in them: a
thigh that sweeps back to a hock, a thin cannon bone under it, and a hoof or a
pad at the bottom. A single straight taper is a stilt. Muzzles are longer, eyes
are smaller and set high and forward on the skull, and a long tail hangs and
tapers instead of sticking out like a broom handle. Birds got a smaller head on
the same terms; fish got the bead.

## People, and the ones who live down here

Every human is built on one rig now: a round head, a block torso, and jointed
stick limbs — an upper arm and a forearm with a hand on it, a thigh and a shin
with a boot on it — the way a physics-sandbox ragdoll is put together. That
gives them knees that bend, arms that lock forward on a trolley bar, a slump
when they sit, a lean when they run, and a face that can change: dot eyes and
a brow line that go **calm**, **alert**, **scared** (wide eyes, a screaming
mouth), **pain** (squint, open mouth), **happy** (shut eyes, a grin) or
**dead** (crossed eyes, tongue out), and the game sets it from what they are
doing. Hats, coats, hi-vis, aprons, badges, beards, a hood and a bottle finish
each kind off.

There are no boats in the sewer. Below the Roman level the people you meet are
the ones who ended up there: **drifters** and **users** sitting slumped
against the walls of the drier ledges, nodding, who only get up and run when
something a good deal bigger than a hatchling comes at them, and **skeletons**
who did the same thing a long time ago, still sitting where they sat. The
capture crews that come when the alarm goes are on foot down here, armed.

The sewer is man-made from the floor up. Indoors the ground is poured
concrete in hard steps with brick or block coursing down the face of it, a lit
lip along every surface, and blockwork wherever a ledge steps; the lab is
tiled. No soil strata, no roots, no mountains behind the pipes — it is dark
wall, vault and water all the way down.

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

The world is authored, not shuffled. One continuous map runs from a drowned city system in the far
west, out through the swamp, and off the edge of the continental shelf into the dark. It is split into
**three zones**, and the zone decides what the water does to you as much as what lives in it.

You pick where you go in on a **globe you turn with your thumb** — drag it, let go and it keeps
spinning, and it settles on whatever you last chose. Only the zone you are looking at puts markers on
the sphere, each one a staff and a diamond head carrying that site's own landmark, standing taller on
the near face than the far. A pin leans out along the surface it is planted in — upright in the middle
of the disc where the ground faces you, tipped right over at the limb — because drawing every staff
straight up the screen made the ones near the edge look pasted on over it rather than standing in it. The sites are scattered across their region rather than stepped evenly
along it, so a zone reads as a place with locations in it and not as a string of beads round the
equator. A site you have not earned is a sealed grey pin.

A **RELEASE** button sends you. It used to be the word ENTER, which is not a key a tablet has.

### Zone 1 — The Sewer Network

The system is drawn as a bore, not as a room. A sewer is a section of masonry
with a hole through it, and the hole goes somewhere: the cavity between invert
and crown is filled with nested copies of the same section scaled toward a
vanishing point, so the ring joints, the tide line and the light from the shafts
all run away down the tunnel together. Nothing in that backdrop is a separate
painting that can drift out of register with the level — every ring is the
level's own floor and roof profile, smaller. In front of it goes the near arch:
radial voussoirs round the crown, courses down the haunch, a rib every bay with
a cable run sagging between the ribs, and a bulkhead lamp under every other one
throwing the only light there is. Underground the water body goes translucent,
because there is a pipe behind it and hiding the pipe is what made the system
read as a wall with a pond in front of it. And the dawn mist no longer gathers
a hundred feet under a city.

West of the lab is a municipal system nobody has opened since 1974. Floor and ceiling are authored
together, so headroom is the level design: long low runs where you have to surface between breaths,
crawls that pinch down to a hand of air, vaulted chambers, dry maintenance ledges to haul out on, and
one shaft that drops eight hundred feet under the city. None of it wobbles. Ground that was poured
runs dead straight between its control points and carries none of the fine noise that gives mud its
texture, so a floor reads as a floor and a hillside stays outside. The concrete is dressed with
capping courses, expansion joints, slime at the standing waterline and pipe mouths punched through
the back wall — some of them still running. Manhole shafts break the crown here and there, and the
light down them is the only daylight in the zone. The water is toxic, and it builds a **FILTH** meter that eventually starts
taking health. Lamplight, not sunlight, comes down through the scum.

| Site | What it is |
| --- | --- |
| **The Relief Interceptor** | the lined pipe you came down. Six steps, five benches, three manholes, one way |
| **The Undercroft** | brick vault under the city, lit by wall lamps, with people living in the pipes |
| **The Drop Shaft** | the system falls away: a vertical chamber down to six hundred feet |
| **Junction 9** | nine mains meet at a sealed vault. Something is in the vault |
| **The Deep Gallery** | eleven miles of trunk main, ledges, side chambers, mutant catfish |
| **The Outfall Sump** | the dead end. Everything the city ever flushed has settled here |

### Zone 2 — The Everglades

The map they released you into, west to east through named places, each with its own palette, plants,
animals and human activity:

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
| **The Seawall** | a dredged harbour under a city that has finally noticed you |

### Zone 3 — The Open Ocean

Past the seawall the bottom falls away. There is no treeline out here: the horizon is shipping —
trawlers, container ships and sails at three parallax distances, a rig standing over the drop, and
birds working a bait ball. Below, the sand shelves out into reef, the reef ends at a wall that drops
twelve hundred feet, and under that is a trench with caves cut into its sides. Past the depth your
body is rated for, a **PRESSURE** meter fills and the view narrows and shivers.

| Site | What it is |
| --- | --- |
| **The Shelf** | twenty miles of seagrass meadow over clean sand, the last of the light |
| **The Reef** | coral bommies, sea fans, barrel sponges, parrotfish, lionfish, a sunken hull |
| **The Wall** | kelp on the face, tuna and hammerheads working it, nothing below |
| **The Trench** | nineteen hundred feet down. Tube worms, marine snow and things that make their own light |

Down there the dark is furnished rather than empty: marine snow drifts on three parallax layers, the
far side of the canyon shows as banded strata anchored to the seabed, and bioluminescence pulses in
cyan, blue and violet — drawn above the night pass, because those are the only lights there are.

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

## Orders and relics

Every release site carries one standing order and one thing worth taking off it. The order is tracked
on the HUD; finish it and the relic surfaces in reachable water with a beam on it. Relics are stored in
the vault on the globe screen and apply to every run afterwards.

| Site | Order | Relic | What it does |
| --- | --- | --- | --- |
| The Outfall | reach open water | Subject Tag | start every run with 2 gene points |
| Mangrove Tangle | take 14 fish | Drowned Man's Ring | +8% bite |
| Gator Joe's Camp | wreck 3 builds | Gator Joe's Skull | +10% max health |
| Cypress Swamp | kill 5 predators | Blackwater Knee | +2 strain tolerance |
| Sawgrass Prairie | cross 1600m | Sawgrass Blade | bites cause bleeding |
| The Deep Cut | kill a boss | Bent Propeller | +12% swim speed |
| Paradise Campground | take 10 people | Camp Lantern | prey lured from further off |
| Florida Bay | kill 4 sharks | Megalodon Tooth | +15% death roll damage |
| The Seawall | wreck 8 boats or builds | Containment Core | +1 dash charge |
| The Undercroft | take 6 people | The Drifter's Lamp | you see in the dark |
| The Drop Shaft | dive to 600m | Shaft Anchor Bolt | +15% armour |
| Junction 9 | kill a boss | Junction 9 Valve Wheel | filth builds half as fast |
| The Deep Gallery | travel 3000m | A Length of Rebar | bites pierce armour |
| The Outfall Sump | kill 6 predators | The Sludge Crown | toxic blood, immune to venom |
| The Shelf | take 18 fish | A Torn Trawl Net | +25% latch damage |
| The Reef | take 24 fish | Nautilus Shell | +12% max health |
| The Wall | kill 4 sharks | Submersible Viewport | rated 60% deeper |
| The Trench | kill a boss | The Esca | prey comes to you in the dark |

### Bosses

Each zone keeps its own roster: two mini-bosses that turn up as you shed, and one world boss that only
comes for a full-grown animal. Which one you meet is decided by where you are standing.

| Zone | Mini-bosses | World boss |
| --- | --- | --- |
| The Sewer Network | The Broodmother, The Gnasher | The Sludge King |
| The Everglades | Old Scar, the war boat, Mother Python | The Skunk Ape |
| The Open Ocean | The Anvil, The Green Wall | The Lantern |

### Dispatch

The story is told on the radio. Every site carries four transmissions, fired at the beats of its
standing order — arrival, halfway, order complete, relic in your teeth — typed into a carrier strip at
the bottom of the screen with a level meter that twitches while the voice runs. Nobody is talking to
you. You are what they are talking about.

## Wet, dust and bone

A crocodile that has been in the water stays wet. Wetness fills instantly under the surface and takes
most of a minute to leave you: the hide darkens, a broken line of highlights rides the spine, drops
fall off the body wherever it is, and a soaked animal leaves wet patches on dry ground behind it. Rain
soaks you too.

The air carries dust over dry ground and silt through the water column, both drifting on their own
wander. Running kicks up grit; a leap throws a puff.

Kills shed bone. Bodies coming apart throw ribs, shards and chunks that tumble, settle on the bed and
stay there long after the blood has soaked away — so a stretch of swamp keeps a record of what you
have done in it. Every meal throws its score off it as pixel digits, scaled and coloured by the combo.

## No circles

Nothing in the game paints a smooth vector circle any more. A canvas `arc` antialiases its edge, which
reads as a soft blob pasted over hard pixel art, and the game was full of them: glows, shockwaves,
blood pools, ripples, smoke, lamp halos, the sun, touch pads, menu reticles. They are all pixel
primitives now — stepped spans, radial dashes, cross flares, octagons, ragged puddles — in `shape.js`.
Shockwaves are bursts of radial dashes; glows are four-point pixel flares; ripples are ticks
travelling apart.

## Water

The surface is a spring-mass system riding a four-component swell, substepped so
it stays inside its CFL limit. The water *body* is clipped to that surface rather
than filled to a flat line, so a crest holds water above the still level and a
trough shows the bank through it, and the top edge is a hard pixel staircase
instead of an antialiased diagonal. Crest and trough are judged against a
smoothed baseline of the visible span in world units, so foam caps the actual
tops at any zoom. The waves themselves carry an `s²` term that peaks the crests
and flattens the troughs, which is what stops them reading as stacked sine waves.

## Gore

Bites tear limbs off. A wounded animal keeps moving with one leg gone, trailing blood, until something
finishes it. People come apart more readily than anything with a hide, and losing a limb is loud,
wet and long: a scream, more of them comes out with it, the face goes to pain, a leg gone means a
limp, and they bleed into the water for as long as they last. Death rolls cut prey clean in half. Bodies burst into their own rig parts plus hearts,
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

**Resolution.** The game is authored at 640x360 and drawn through one integer transform into a
backing store that is a whole multiple of it, so every rect of art still lands exactly on the grid —
this is sharper output, not a second layout. Where the canvas is being blown up anyway it renders at
2x, which on a tablet means the browser upscales from 1280x720 rather than from 640x360. It costs
fill rate, so a rolling mean of frame time watches it: about a second of sustained sub-45fps and it
steps back down to 1x and stays there, because hunting between two costs looks worse than either.

**Overdraw.** The room behind every front-end screen never changes and was being laid down from
scratch every frame — some three hundred rects and three gradients before anything you came to look
at was drawn. The wall, the floor and the title room's floor are each baked once, at the resolution
being rendered into, and blitted.

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
