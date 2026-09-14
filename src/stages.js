'use strict';
// ---------------------------------------------------------------------------
// Stage select and run loadout. A run no longer always begins in the pipe:
// once you have reached a stretch of the swamp you can drop straight into it,
// bigger and against a harder table. The last stage is the city.
// ---------------------------------------------------------------------------
// Three zones. The globe carries every release site; the zone decides which
// face of it you are looking at, what the water does to you, and what is
// waiting at the bottom of it.
const ZONES = [
  { id: 'river', n: 1, name: 'THE SYSTEM', sub: 'FIVE LEVELS OF SOMEBODY ELSE\'S DRAINS. THE ONLY WAY OUT IS DOWN AND THEN UP.', col: '#8ab820', x0: -7700, x1: 1100 },
  { id: 'glades', n: 2, name: 'THE EVERGLADES', sub: 'PAST THE GRATE. OPEN WATER, OPEN SEASON.', col: '#7fffd8', x0: -120, x1: 19000 },
  { id: 'ocean', n: 3, name: 'THE OPEN OCEAN', sub: 'PAST THE SEAWALL. SALT, DEPTH, AND NOTHING TO HOLD ON TO.', col: '#60a8ff', x0: 19000, x1: 99999 },
];
const ZONE_BY_ID = {};
for (const z of ZONES) ZONE_BY_ID[z.id] = z;

const STAGES = [
  // ---- ZONE 1: THE SYSTEM. Five levels down, and one long climb back up.
  { id: 'facility', zone: 'river', lat: 0.14, lon: 2.68, name: 'FACILITY B', sub: 'TRANSFER ORDER 11. GET OUT OF THE BUILDING.', x: -7480, size: 0.22, diff: 0, intro: true },
  { id: 'wake', zone: 'river', lat: 0.30, lon: 2.86, name: 'THE INTAKE', sub: 'OPEN WATER, A ROOF OVER IT, AND EVERYTHING IN IT SMALLER THAN YOU.', x: -5500, size: 0.3, diff: 0.2, need: { deep: 900 } },
  { id: 'interceptor', zone: 'river', lat: -0.02, lon: 3.06, name: 'THE GRIT CHANNEL', sub: 'THE WALLS COME IN AND THE CROWN COMES DOWN. GO THROUGH IT FAST.', x: -4260, size: 0.55, diff: 0.8, need: { deep: 1800 } },
  { id: 'gallery', zone: 'river', lat: 0.42, lon: 3.30, name: 'THE GREAT VAULT', sub: 'SEVEN HUNDRED FEET OF WATER AND FOUR HUNDRED OF AIR OVER IT.', x: -3400, size: 0.9, diff: 1.5, need: { deep: 3200 } },
  { id: 'sump', zone: 'river', lat: 0.20, lon: 3.16, name: 'THE SUMP', sub: 'THE DEEPEST WATER IN THE WORLD SO FAR, AND IT IS STILL WORKING.', x: -1300, size: 1.4, diff: 2.2, need: { deep: 4600 } },
  { id: 'outfall', survey: true, zone: 'river', lat: 0.08, lon: 3.46, name: 'THE OUTFALL', sub: 'A FLIGHT OF WEIRS AND A HOLE WITH A SKY BEHIND IT.', x: 400, size: 2.0, diff: 2.8, need: { deep: 6000 } },
  // ---- ZONE 2: THE EVERGLADES. Past the grate, under the sky.
  { id: 'mangrove', zone: 'glades', lat: -0.52, lon: 0.66, name: 'MANGROVE TANGLE', sub: 'ROOTS, OYSTERS, SNOOK', x: 1650, size: 0.55, diff: 0.5, need: { reach: 600 } },
  { id: 'camp', zone: 'glades', lat: -0.12, lon: 0.18, name: "GATOR JOE'S CAMP", sub: 'THE FISH CAMP STILL HAS PEOPLE IN IT', x: 3400, size: 0.85, diff: 1.0, need: { reach: 1800 } },
  { id: 'cypress', zone: 'glades', lat: 0.16, lon: 0.52, name: 'CYPRESS SWAMP', sub: 'DEEP TANNIC WATER UNDER THE KNEES', x: 5100, size: 1.25, diff: 1.5, need: { reach: 3000 } },
  { id: 'prairie', zone: 'glades', lat: -0.38, lon: 1.02, name: 'SAWGRASS PRAIRIE', sub: 'SHALLOW, OPEN, NOWHERE TO HIDE', x: 6800, size: 1.7, diff: 2.0, need: { reach: 4200 } },
  { id: 'river', zone: 'glades', lat: 0.44, lon: 0.92, name: 'THE DEEP CUT', sub: 'THE CHANNEL RUNS COLD AND DEEP', x: 8400, size: 2.3, diff: 2.5, need: { reach: 5400 } },
  { id: 'campground', zone: 'glades', lat: 0.02, lon: 1.30, name: 'PARADISE CAMPGROUND', sub: 'A HUNDRED TOURISTS AND ONE OF YOU', x: 10200, size: 3.0, diff: 3.0, need: { reach: 6800 } },
  { id: 'bay', zone: 'glades', lat: -0.62, lon: 1.16, name: 'FLORIDA BAY', sub: 'SALT, SHARKS, OPEN HORIZON', x: 12300, size: 4.0, diff: 3.6, need: { reach: 8200 } },
  { id: 'seawall', zone: 'glades', lat: 0.30, lon: 1.44, name: 'THE SEAWALL', sub: 'THEY BUILT A CITY. EAT IT.', x: 16200, size: 8.0, diff: 4.6, kaiju: true, need: { tier: 6 } },
  // ---- ZONE 3: THE OPEN OCEAN. Past the seawall, down the wall, into the dark.
  { id: 'shelf', zone: 'ocean', lat: -0.20, lon: 4.58, name: 'THE SHELF', sub: 'SAND AND SEAGRASS. THE LAST OF THE LIGHT.', x: 20500, size: 2.0, diff: 3.0, need: { reach: 8200 } },
  { id: 'reef', zone: 'ocean', lat: -0.58, lon: 4.98, name: 'THE REEF', sub: 'A CITY BUILT BY ANIMALS. IT IS FULL.', x: 23200, size: 2.9, diff: 3.8, need: { reach: 11000 } },
  { id: 'wall', zone: 'ocean', lat: 0.26, lon: 5.02, name: 'THE WALL', sub: 'THE BOTTOM STOPS. KEEP SWIMMING.', x: 27000, size: 4.4, diff: 4.5, need: { tier: 5 } },
  { id: 'trench', survey: true, zone: 'ocean', lat: -0.12, lon: 5.46, name: 'THE TRENCH', sub: 'NOTHING DOWN HERE HAS EVER SEEN THE SUN', x: 32000, size: 7.6, diff: 5.4, kaiju: true, need: { tier: 7 } },
];
const STAGE_BY_ID = {};
for (const st of STAGES) STAGE_BY_ID[st.id] = st;
STAGE_BY_ID.catacomb = STAGE_BY_ID.facility;     // the old names for the first site
STAGE_BY_ID.plunge = STAGE_BY_ID.wake;
STAGE_BY_ID.gorge = STAGE_BY_ID.interceptor;
STAGE_BY_ID.rapids = STAGE_BY_ID.gallery;
STAGE_BY_ID.oxbow = STAGE_BY_ID.outfall;
// sites in the order they appear on the globe, grouped by zone
const STAGES_BY_ZONE = {};
for (const z of ZONES) STAGES_BY_ZONE[z.id] = STAGES.filter(st => st.zone === z.id);
const zoneOf = st => ZONE_BY_ID[(st && st.zone) || 'glades'] || ZONES[1];
// which of the three worlds a stretch of map belongs to
const zoneAt = x => { for (const z of ZONES) if (x >= z.x0 && x < z.x1) return z; return ZONES[1]; };

// Prime mutation: one lineage gene, free, chosen before the run starts.
const PRIMES = [
  { id: 'none', name: 'UNSPLICED', desc: 'NO PRIME. ONE EXTRA GENE POINT TO SPEND HOW YOU LIKE.', color: '#9ad8c0' },
  { id: 'ripper', name: 'RIPPER PRIME', desc: 'START WITH THE FIRST RIPPER GENE. TEETH FIRST, QUESTIONS NEVER.', color: null },
  { id: 'bulwark', name: 'BULWARK PRIME', desc: 'START WITH THE FIRST BULWARK GENE. HARDER TO KILL THAN TO FEED.', color: null },
  { id: 'phantom', name: 'PHANTOM PRIME', desc: 'START WITH THE FIRST PHANTOM GENE. NOTHING SEES YOU COMING.', color: null },
  { id: 'abyssal', name: 'ABYSSAL PRIME', desc: 'START WITH THE FIRST ABYSSAL GENE. THE DEEP IS YOURS.', color: null },
  { id: 'colossus', name: 'COLOSSUS PRIME', desc: 'START WITH THE FIRST COLOSSUS GENE. MASS IS A WEAPON.', color: null },
  { id: 'savage', name: 'SAVAGE PRIME', desc: 'START WITH THE FIRST SAVAGE GENE. SPEED AND APPETITE.', color: null },
];

// Cosmetic morphs. Purely a skin: they change the hide, never the numbers.
const HIDES = [
  { id: 'wild', name: 'WILD TYPE', desc: 'THE HIDE THEY GREW YOU WITH.', need: null },
  { id: 'leucistic', name: 'LEUCISTIC', desc: 'PALE, PINK-EYED, IMPOSSIBLE TO HIDE.', need: { runs: 3 }, apply: L => { L.back = '#e8e4d4'; L.mid = '#d8d2c0'; L.belly = '#f4f0e4'; L.dark = '#b8b0a0'; L.eye = '#e06a6a'; } },
  { id: 'melanistic', name: 'MELANISTIC', desc: 'BLACK ON BLACK. A SHADOW WITH TEETH.', need: { runs: 6 }, apply: L => { L.back = '#22262a'; L.mid = '#2e343a'; L.belly = '#4a5058'; L.dark = '#12161a'; L.eye = '#e0a020'; } },
  { id: 'sulphur', name: 'SULPHUR', desc: 'THE LAB DYE NEVER WASHED OUT.', need: { tier: 4 }, apply: L => { L.back = '#7a7a20'; L.mid = '#a8a830'; L.belly = '#e0e070'; L.dark = '#4a4a12'; L.eye = '#40f0c8'; } },
  { id: 'bloodline', name: 'BLOODLINE', desc: 'THE RED ONES WERE NEVER RELEASED.', need: { kills: 250 }, apply: L => { L.back = '#6a1c1c'; L.mid = '#8a2a28'; L.belly = '#c07a68'; L.dark = '#3a0e0e'; L.eye = '#ffd040'; } },
  { id: 'abyss', name: 'ABYSSAL', desc: 'GREW UP WHERE THE LIGHT DOES NOT REACH.', need: { tier: 7 }, apply: L => { L.back = '#16303c'; L.mid = '#1e4454'; L.belly = '#3a7a86'; L.dark = '#0a1a22'; L.eye = '#80fff0'; L.glow = '#40f0c8'; } },
];
const HIDE_BY_ID = {};
for (const h of HIDES) HIDE_BY_ID[h.id] = h;

const Stages = {
  // what the save has to show before a stage or morph opens up
  met(need) {
    if (!need) return true;
    const s = G.save || {};
    if (need.reach !== undefined && (s.reach || 0) < need.reach) return false;
    // the system runs west, so distance into it is its own counter
    if (need.deep !== undefined && (s.deep || 0) < need.deep) return false;
    if (need.tier !== undefined && (s.bestTier || 0) < need.tier) return false;
    if (need.runs !== undefined && (s.runs || 0) < need.runs) return false;
    if (need.kills !== undefined && (s.kills || 0) < need.kills) return false;
    return true;
  },
  unlocked(st) {
    // a site opens on two counts: the lab has surveyed its zone, and the animal
    // has done enough in the field to be trusted with it
    if (typeof Research !== 'undefined') {
      const z = zoneOf(st);
      if (!Research.zoneOpen(z.id)) return false;
      if (st.survey && !Research.siteOpen(st.id)) return false;
    }
    return this.met(st.need);
  },
  // one line telling the player what is still missing
  hint(need, st) {
    // the zone survey outranks everything: there is no point telling somebody to
    // grow when the lab has not found the place yet
    if (st && typeof Research !== 'undefined') {
      const z = zoneOf(st);
      if (!Research.zoneOpen(z.id)) return 'SURVEY ' + z.name;
      if (st.survey && !Research.siteOpen(st.id)) return 'DEEP SOUNDING';
    }
    if (!need) return '';
    if (need.reach !== undefined) {
      const b = Biome.at(need.reach);
      return 'REACH ' + (b ? b.name : Math.round(need.reach) + 'M');
    }
    if (need.deep !== undefined) {
      const b = Biome.at(-need.deep);
      return 'REACH ' + (b ? b.name : Math.round(need.deep) + 'M DEEP');
    }
    if (need.tier !== undefined) return 'GROW TO ' + (TIERS[need.tier] ? TIERS[need.tier].name : 'TIER ' + need.tier);
    if (need.runs !== undefined) return 'FINISH ' + need.runs + ' RUNS';
    if (need.kills !== undefined) return 'TAKE ' + need.kills + ' KILLS';
    return '';
  },
  // remember how far this run got, so later stages open for the next one
  noteProgress(P) {
    const s = G.save;
    s.reach = Math.max(s.reach || 0, Math.round(P.x));
    s.deep = Math.max(s.deep || 0, Math.round(-P.x));
    s.bestTier = Math.max(s.bestTier || 0, P.tier);
  },
  primeGene(id) {
    if (id === 'none' || !id) return null;
    return GENES.find(g => g.lin === id && g.ring === 1 && !g.hybrid) || null;
  },
};
