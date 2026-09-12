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
  { id: 'sewer', n: 1, name: 'THE SEWER NETWORK', sub: 'A DROWNED CITY SYSTEM. NO SKY, NO WAY BACK UP.', col: '#8ab820', x0: -16600, x1: -3200 },
  { id: 'glades', n: 2, name: 'THE EVERGLADES', sub: 'OPEN WATER, OPEN SEASON. THE MAP THEY RELEASED YOU INTO.', col: '#7fffd8', x0: -3200, x1: 19000 },
  { id: 'ocean', n: 3, name: 'THE OPEN OCEAN', sub: 'PAST THE SEAWALL. SALT, DEPTH, AND NOTHING TO HOLD ON TO.', col: '#60a8ff', x0: 19000, x1: 99999 },
];
const ZONE_BY_ID = {};
for (const z of ZONES) ZONE_BY_ID[z.id] = z;

const STAGES = [
  // ---- ZONE 2: THE EVERGLADES. Where a run starts and where it is learned.
  { id: 'outfall', zone: 'glades', lat: -0.30, lon: 0.34, name: 'THE OUTFALL', sub: 'WHERE THE PIPE SPITS YOU OUT', x: 320, size: 1.0, diff: 0 },
  { id: 'mangrove', zone: 'glades', lat: -0.52, lon: 0.66, name: 'MANGROVE TANGLE', sub: 'ROOTS, OYSTERS, SNOOK', x: 1650, size: 1.7, diff: 0.5, need: { reach: 1100 } },
  { id: 'camp', zone: 'glades', lat: -0.12, lon: 0.18, name: "GATOR JOE'S CAMP", sub: 'THE FISH CAMP STILL HAS PEOPLE IN IT', x: 3400, size: 2.3, diff: 1.0, need: { reach: 2800 } },
  { id: 'cypress', zone: 'glades', lat: 0.16, lon: 0.52, name: 'CYPRESS SWAMP', sub: 'DEEP TANNIC WATER UNDER THE KNEES', x: 5100, size: 3.0, diff: 1.5, need: { reach: 4200 } },
  { id: 'prairie', zone: 'glades', lat: -0.38, lon: 1.02, name: 'SAWGRASS PRAIRIE', sub: 'SHALLOW, OPEN, NOWHERE TO HIDE', x: 6800, size: 3.7, diff: 2.0, need: { reach: 6100 } },
  { id: 'river', zone: 'glades', lat: 0.44, lon: 0.92, name: 'THE DEEP CUT', sub: 'THE CHANNEL RUNS COLD AND DEEP', x: 8400, size: 4.5, diff: 2.5, need: { reach: 7600 } },
  { id: 'campground', zone: 'glades', lat: 0.02, lon: 1.30, name: 'PARADISE CAMPGROUND', sub: 'A HUNDRED TOURISTS AND ONE OF YOU', x: 10200, size: 5.3, diff: 3.0, need: { reach: 9400 } },
  { id: 'bay', zone: 'glades', lat: -0.62, lon: 1.16, name: 'FLORIDA BAY', sub: 'SALT, SHARKS, OPEN HORIZON', x: 12300, size: 6.4, diff: 3.6, need: { reach: 11000 } },
  { id: 'seawall', zone: 'glades', lat: 0.30, lon: 1.44, name: 'THE SEAWALL', sub: 'THEY BUILT A CITY. EAT IT.', x: 16200, size: 9.5, diff: 4.6, kaiju: true, need: { tier: 7 } },
  // ---- ZONE 1: THE SEWER NETWORK. Under the city, west of the lab.
  { id: 'undercroft', zone: 'sewer', lat: 0.30, lon: 2.86, name: 'THE UNDERCROFT', sub: 'SOMEBODY STILL LIVES DOWN HERE', x: -4800, size: 1.4, diff: 0.8, need: { reach: 2800 } },
  { id: 'shaft', zone: 'sewer', lat: -0.02, lon: 3.06, name: 'THE DROP SHAFT', sub: 'THE SYSTEM FALLS AWAY UNDER THE CITY', x: -5700, size: 2.1, diff: 1.6, need: { reach: 4200 } },
  { id: 'junction', zone: 'sewer', lat: 0.42, lon: 3.30, name: 'JUNCTION 9', sub: 'NINE PIPES MEET. SOMETHING LIVES IN THE VAULT.', x: -9000, size: 3.0, diff: 2.4, need: { reach: 6100 } },
  { id: 'gallery', zone: 'sewer', lat: 0.08, lon: 3.46, name: 'THE DEEP GALLERY', sub: 'THE TRUNK MAIN. IT RUNS FOR MILES.', x: -13000, size: 4.0, diff: 3.2, need: { reach: 7600 } },
  { id: 'sump', survey: true, zone: 'sewer', lat: -0.28, lon: 3.22, name: 'THE OUTFALL SUMP', sub: 'THE END OF THE LINE. EVERYTHING SETTLES HERE.', x: -15500, size: 5.4, diff: 4.2, need: { tier: 5 } },
  // ---- ZONE 3: THE OPEN OCEAN. Past the seawall, down the wall, into the dark.
  { id: 'shelf', zone: 'ocean', lat: -0.20, lon: 4.58, name: 'THE SHELF', sub: 'SAND AND SEAGRASS. THE LAST OF THE LIGHT.', x: 20500, size: 4.4, diff: 3.0, need: { reach: 11000 } },
  { id: 'reef', zone: 'ocean', lat: -0.58, lon: 4.98, name: 'THE REEF', sub: 'A CITY BUILT BY ANIMALS. IT IS FULL.', x: 23200, size: 5.6, diff: 3.8, need: { reach: 15300 } },
  { id: 'wall', zone: 'ocean', lat: 0.26, lon: 5.02, name: 'THE WALL', sub: 'THE BOTTOM STOPS. KEEP SWIMMING.', x: 27000, size: 7.2, diff: 4.5, need: { tier: 6 } },
  { id: 'trench', survey: true, zone: 'ocean', lat: -0.12, lon: 5.46, name: 'THE TRENCH', sub: 'NOTHING DOWN HERE HAS EVER SEEN THE SUN', x: 32000, size: 9.0, diff: 5.4, kaiju: true, need: { tier: 8 } },
];
const STAGE_BY_ID = {};
for (const st of STAGES) STAGE_BY_ID[st.id] = st;
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
    if (need.tier !== undefined) return 'GROW TO ' + (TIERS[need.tier] ? TIERS[need.tier].name : 'TIER ' + need.tier);
    if (need.runs !== undefined) return 'FINISH ' + need.runs + ' RUNS';
    if (need.kills !== undefined) return 'TAKE ' + need.kills + ' KILLS';
    return '';
  },
  // remember how far this run got, so later stages open for the next one
  noteProgress(P) {
    const s = G.save;
    s.reach = Math.max(s.reach || 0, Math.round(P.x));
    s.bestTier = Math.max(s.bestTier || 0, P.tier);
  },
  primeGene(id) {
    if (id === 'none' || !id) return null;
    return GENES.find(g => g.lin === id && g.ring === 1 && !g.hybrid) || null;
  },
};
