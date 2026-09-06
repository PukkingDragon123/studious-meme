'use strict';
// ---------------------------------------------------------------------------
// Stage select and run loadout. A run no longer always begins in the pipe:
// once you have reached a stretch of the swamp you can drop straight into it,
// bigger and against a harder table. The last stage is the city.
// ---------------------------------------------------------------------------
const STAGES = [
  { id: 'outfall', name: 'THE OUTFALL', sub: 'WHERE THE PIPE SPITS YOU OUT', x: 320, size: 1.0, diff: 0, intro: true },
  { id: 'mangrove', name: 'MANGROVE TANGLE', sub: 'ROOTS, OYSTERS, SNOOK', x: 1650, size: 1.7, diff: 0.5, need: { reach: 1100 } },
  { id: 'camp', name: "GATOR JOE'S CAMP", sub: 'THE FISH CAMP STILL HAS PEOPLE IN IT', x: 3400, size: 2.3, diff: 1.0, need: { reach: 2800 } },
  { id: 'cypress', name: 'CYPRESS SWAMP', sub: 'DEEP TANNIC WATER UNDER THE KNEES', x: 5100, size: 3.0, diff: 1.5, need: { reach: 4200 } },
  { id: 'prairie', name: 'SAWGRASS PRAIRIE', sub: 'SHALLOW, OPEN, NOWHERE TO HIDE', x: 6800, size: 3.7, diff: 2.0, need: { reach: 6100 } },
  { id: 'river', name: 'THE DEEP CUT', sub: 'THE CHANNEL RUNS COLD AND DEEP', x: 8400, size: 4.5, diff: 2.5, need: { reach: 7600 } },
  { id: 'campground', name: 'PARADISE CAMPGROUND', sub: 'A HUNDRED TOURISTS AND ONE OF YOU', x: 10200, size: 5.3, diff: 3.0, need: { reach: 9400 } },
  { id: 'bay', name: 'FLORIDA BAY', sub: 'SALT, SHARKS, OPEN HORIZON', x: 12300, size: 6.4, diff: 3.6, need: { reach: 11000 } },
  { id: 'seawall', name: 'THE SEAWALL', sub: 'THEY BUILT A CITY. EAT IT.', x: 16200, size: 9.5, diff: 4.6, kaiju: true, need: { tier: 7 } },
];
const STAGE_BY_ID = {};
for (const st of STAGES) STAGE_BY_ID[st.id] = st;

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
  unlocked(st) { return this.met(st.need); },
  // one line telling the player what is still missing
  hint(need) {
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
