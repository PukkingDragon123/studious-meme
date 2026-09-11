'use strict';
// ---------------------------------------------------------------------------
// THE CREATION BAY.
//
// Before a run you build the thing you are going to be: which base stock the
// lab grows you from, how long and how deep through the body they let you come
// out, and what hide it wears. You start with a dwarf alligator in the colour
// it grew and nothing else. Every other option on this screen is a line item
// on the research programme, and somebody has to fund it first.
// ---------------------------------------------------------------------------
const BASE_SPECIES = [
  { id: 'dwarf', name: 'DWARF ALLIGATOR', latin: 'A. MISSISSIPPIENSIS (DWARF)',
    line: 'STUNTED, STUBBORN, CHEAP TO GROW. THE ONE THEY START EVERYONE ON.',
    size: 1.0, hp: 1.0, spd: 1.0, bite: 1.0, need: null, gene: null, girth: 1.0, holo: '#7affda',
    look: { back: '#4a5a3a', mid: '#5f7048', belly: '#c8c0a0', dark: '#2e3a24', eye: '#c8a030' } },
  { id: 'caiman', name: 'SPECTACLED CAIMAN', latin: 'C. CROCODILUS',
    line: 'BONY BROW, BAD TEMPER. FASTER OUT OF THE GATE, THINNER SKINNED.',
    size: 1.15, hp: 0.9, spd: 1.18, bite: 1.05, need: { runs: 3 }, gene: 'savage:claws', girth: 0.94, holo: '#a0e050',
    look: { back: '#5a5a3a', mid: '#74744a', belly: '#d0c8a0', dark: '#3a3a22', eye: '#a0c840' } },
  { id: 'nile', name: 'NILE CROCODILE', latin: 'C. NILOTICUS',
    line: 'THE STANDARD AGAINST WHICH THE PROJECT MEASURES ITSELF.',
    size: 1.35, hp: 1.15, spd: 1.05, bite: 1.2, need: { bestTier: 5 }, gene: 'ripper:serrate', girth: 1.06, holo: '#ff5a3a',
    look: { back: '#4a4436', mid: '#635c46', belly: '#c4bc9c', dark: '#2c281e', eye: '#c8b040' } },
  { id: 'gharial', name: 'GHARIAL', latin: 'G. GANGETICUS',
    line: 'A JAW LIKE A NEEDLE FILE. BUILT FOR FISH AND FOR SPEED.',
    size: 1.25, hp: 0.85, spd: 1.35, bite: 0.9, need: { kills: 400 }, gene: 'phantom:sleek', girth: 0.8, holo: '#60a8ff',
    look: { back: '#3e4a52', mid: '#546470', belly: '#c0c8cc', dark: '#242c33', eye: '#e0e8a0' } },
  { id: 'salt', name: 'SALTWATER CROCODILE', latin: 'C. POROSUS',
    line: 'THE LARGEST LIVING REPTILE. THE PROJECT KEEPS ONE. IT IS NOT FOR SALE.',
    size: 1.7, hp: 1.35, spd: 0.92, bite: 1.35, need: { bestTier: 9 }, gene: 'bulwark:hide', girth: 1.18, holo: '#e0b050',
    look: { back: '#3a3a2c', mid: '#4e4e3a', belly: '#b8b494', dark: '#20201a', eye: '#d8c050' } },
  { id: 'deino', name: 'DEINOSUCHUS EMBRYO', latin: 'D. RIOGRANDENSIS (RECONSTRUCTED)',
    line: 'GROWN FROM A FRAGMENT. IT SHOULD NOT BE ALIVE. IT IS VERY MUCH ALIVE.',
    size: 2.2, hp: 1.6, spd: 0.85, bite: 1.6, need: { best: 400000 }, gene: 'colossus:bulk', girth: 1.3, holo: '#c88af0',
    look: { back: '#4a3a3a', mid: '#5f4a48', belly: '#c0a898', dark: '#2a1e1e', eye: '#ff6030', spikes: 1 } },
];
// ---------------------------------------------------------------------------
// What the animal IS. A species is not a stat block with a different number in
// it — each one is a character with a signature that changes how you hunt, and
// a line of handling that goes with it. The dwarf grows; the caiman chains; the
// gharial owns the water and hates the bank; the Nile rolls; the saltwater
// waits; the Deinosuchus simply eats the thing.
// ---------------------------------------------------------------------------
const SPECIES_TRAITS = {
  dwarf: {
    name: 'SCRAPPER', icon: 'up', col: '#7affda',
    line: 'SMALL MEALS STILL COUNT. GROWS FAST AND THINKS FASTER.',
    apply: P => { P.st.smallGrowth = 1.9; P.st.hatchling = true; P.vialTierBonus = (P.vialTierBonus || 0) + 1; },
  },
  caiman: {
    name: 'SKIRMISHER', icon: 'chain', col: '#a0e050',
    line: 'BITES FAST AND KEEPS BITING. EVERY THIRD IN A CHAIN LANDS CLEAN.',
    apply: P => { P.st.biteRate = 0.68; P.st.chainCrit = 3; },
  },
  nile: {
    name: 'DEATH ROLLER', icon: 'roll', col: '#ff5a3a',
    line: 'LATCHES ONTO ANYTHING AND TAKES IT UNDER. THE LOCK IS WIDE OPEN.',
    apply: P => { P.st.rollDmg *= 1.55; P.st.latchMul *= 1.4; P.st.rollWindow = 1.7; P.st.bigLatch = 3.2; },
  },
  gharial: {
    name: 'FISH HAWK', icon: 'fish', col: '#60a8ff',
    line: 'FISH ARE FOOD, WHATEVER THE SIZE. THE BANK IS NOT ITS COUNTRY.',
    apply: P => { P.st.fishSlayer = 2.2; P.st.fishSwallow = true; P.st.speed *= 1.2; P.st.turn *= 1.25; P.st.landSpeed *= 0.55; P.st.hop *= 0.7; },
  },
  salt: {
    name: 'AMBUSH APEX', icon: 'eye', col: '#e0b050',
    line: 'STRIKES ONCE, OUT OF NOTHING, AND THAT IS USUALLY ENOUGH.',
    apply: P => { P.st.ambush = true; P.st.ambushMul = 3.2; P.st.stealth *= 0.6; P.st.armor += 0.12; P.st.turn *= 0.82; },
  },
  deino: {
    name: 'TITAN', icon: 'jaw', col: '#c88af0',
    line: 'SWALLOWS WHAT SHOULD NOT FIT. NOTHING MOVES IT, AND IT MOVES THROUGH.',
    apply: P => { P.st.swallow *= 1.8; P.st.knockImmune = true; P.st.bullRush = true; P.st.ramMul *= 1.6; P.st.hullMul *= 2; P.st.quake = true; P.st.accel *= 0.85; },
  },
};
for (const sp of BASE_SPECIES) sp.trait = SPECIES_TRAITS[sp.id];

const SPECIES_BY_ID = {};
for (const s of BASE_SPECIES) SPECIES_BY_ID[s.id] = s;

// Size is a real trade, not a difficulty slider: bigger starts you higher up
// the food chain but eats hunger and slows you down.
// Hide palettes. Cosmetic, and applied over whatever the species came with.
const HIDE_PAINTS = [
  { id: 'wild', name: 'WILD TYPE', swatch: null, apply: null, line: 'THE HIDE THE SPECIES CAME WITH. NO DYE, NO EDITS.' },
  { id: 'blackwater', name: 'BLACKWATER', swatch: '#2a3238', line: 'NEAR BLACK. INVISIBLE IN TANNIC WATER AND IN PIPES.', apply: L => { L.back = '#22282e'; L.mid = '#333c44'; L.belly = '#7a8288'; L.dark = '#12161a'; } },
  { id: 'tannin', name: 'TANNIN', swatch: '#5a4428', line: 'THE BROWN OF STANDING SWAMP WATER. THE DEFAULT DISGUISE.', apply: L => { L.back = '#3e2f1c'; L.mid = '#5a4428'; L.belly = '#b9a473'; L.dark = '#241a10'; } },
  { id: 'marsh', name: 'MARSH GREEN', swatch: '#4a6a34', line: 'SAWGRASS AND ALGAE. LOSES YOU IN THE SHALLOWS.', apply: L => { L.back = '#33481f'; L.mid = '#4a6a34'; L.belly = '#b6c288'; L.dark = '#1c2812'; } },
  { id: 'silt', name: 'SILT GREY', swatch: '#6a6e66', line: 'THE COLOUR OF A DREDGED CHANNEL BOTTOM.', apply: L => { L.back = '#4a4e48'; L.mid = '#6a6e66'; L.belly = '#c0c2b8'; L.dark = '#282c28'; } },
  { id: 'leucistic', name: 'LEUCISTIC', swatch: '#e4e0d0', line: 'NO PIGMENT AT ALL. PINK EYED, AND IMPOSSIBLE TO HIDE.', apply: L => { L.back = '#d8d4c2'; L.mid = '#e8e4d4'; L.belly = '#f6f2e6'; L.dark = '#b0a894'; L.eye = '#e06a6a'; } },
  { id: 'sulphur', name: 'SULPHUR', swatch: '#a8a830', line: 'THE LAB DYE NEVER WASHED OUT OF THE SCUTES.', apply: L => { L.back = '#7a7a20'; L.mid = '#a8a830'; L.belly = '#e0e070'; L.dark = '#4a4a12'; L.eye = '#40f0c8'; } },
  { id: 'bloodline', name: 'BLOODLINE', swatch: '#8a2a28', line: 'THE RED ONES WERE NEVER MEANT TO LEAVE THE BUILDING.', apply: L => { L.back = '#6a1c1c'; L.mid = '#8a2a28'; L.belly = '#c07a68'; L.dark = '#3a0e0e'; L.eye = '#ffd040'; } },
  { id: 'abyssal', name: 'ABYSSAL', swatch: '#1e4454', line: 'GREW UP WHERE THE LIGHT DOES NOT REACH. IT GLOWS FAINTLY.', apply: L => { L.back = '#16303c'; L.mid = '#1e4454'; L.belly = '#3a7a86'; L.dark = '#0a1a22'; L.eye = '#80fff0'; L.glow = '#40f0c8'; } },
];
const PAINT_BY_ID = {};
for (const h of HIDE_PAINTS) PAINT_BY_ID[h.id] = h;

// Girth. Depth of body, independent of length: a real trade of health for speed.
const GIRTH_GRADES = [
  { id: 'lean', name: 'LEAN', mul: 0.82, hp: 0.86, spd: 1.14, line: 'NARROW THROUGH THE CHEST. QUICK, AND EASY TO BREAK.' },
  { id: 'normal', name: 'NORMAL', mul: 1.0, hp: 1, spd: 1, line: 'PROPORTIONED AS THE SPECIES INTENDED.' },
  { id: 'heavy', name: 'HEAVY', mul: 1.14, hp: 1.14, spd: 0.92, line: 'DEEP BODIED. SOAKS PUNISHMENT, TURNS LIKE A BARGE.' },
  { id: 'bull', name: 'BULL', mul: 1.28, hp: 1.3, spd: 0.84, line: 'ALL SHOULDER. NOTHING SHIFTS IT AND IT SHIFTS SLOWLY.' },
];

const SIZE_GRADES = [
  { id: 'runt', name: 'RUNT', mul: 0.78, line: 'SMALLEST VIABLE. FAST, STARVES SLOWLY, DIES TO ANYTHING.', hp: 0.8, spd: 1.22, hunger: 0.72 },
  { id: 'standard', name: 'STANDARD', mul: 1.0, line: 'WHAT THE PAPERWORK SAYS.', hp: 1, spd: 1, hunger: 1 },
  { id: 'large', name: 'OVERGROWN', mul: 1.3, line: 'FED PAST SPEC. HITS HARDER, BURNS THROUGH FOOD.', hp: 1.2, spd: 0.9, hunger: 1.34 },
  { id: 'huge', name: 'HYPERTROPHIC', mul: 1.7, line: 'THEY DO NOT AUTHORISE THIS. IT WILL BE HUNGRY.', hp: 1.45, spd: 0.8, hunger: 1.8 },
];

const Create = {
  rows: ['species', 'size', 'girth', 'hide'],
  // Nothing here is given. You come out of the tank as a dwarf alligator in the
  // hide it grew, at the length and depth the paperwork says, and every other
  // option on this screen is a line item somebody has to fund first.
  speciesUnlocked(sp) { return sp.id === 'dwarf' || Research.granted('species').has(sp.id); },
  paintUnlocked(pt) { return pt.id === 'wild' || Research.granted('paint').has(pt.id); },
  sizeUnlocked(i) { return i === 1 || Research.granted('size').has(i); },
  girthUnlocked(i) { return i === 1 || Research.granted('girth').has(i); },
  rowUnlocked(row, i, item) { return row === 0 ? this.sizeUnlocked(i) : row === 1 ? this.girthUnlocked(i) : this.paintUnlocked(item); },
  // What the animal in the chosen enclosure works out to. There is no embryo
  // and no splice bay any more: the thing you play is a crocodile that already
  // exists, living in the habitat, and this reads it off.
  spec(c) {
    const croc = c || (typeof Habitat !== 'undefined' ? Habitat.runner() : null);
    const sp = croc ? (SPECIES_BY_ID[croc.sp] || BASE_SPECIES[0]) : BASE_SPECIES[0];
    const gr = SIZE_GRADES[clamp(croc ? croc.size : 1, 0, SIZE_GRADES.length - 1)] || SIZE_GRADES[1];
    const gi = GIRTH_GRADES[clamp(croc ? croc.girth : 1, 0, GIRTH_GRADES.length - 1)] || GIRTH_GRADES[1];
    const pt = PAINT_BY_ID[croc ? croc.hide : 'wild'] || HIDE_PAINTS[0];
    return {
      croc, sp, gr, gi, pt,
      size: sp.size * gr.mul,
      girth: (sp.girth || 1) * gi.mul,
      hp: sp.hp * gr.hp * gi.hp, spd: sp.spd * gr.spd * gi.spd, bite: sp.bite, hunger: gr.hunger,
      gene: sp.gene ? GENE_BY_ID[sp.gene] : null,
    };
  },
  // the look the animal is actually wearing, for the preview and the run
  look(c) {
    const b = this.spec(c);
    const L = Object.assign({}, CROC_LOOKS.base, b.sp.look || {});
    if (b.pt && b.pt.apply) b.pt.apply(L);
    L.girth = b.girth;
    return L;
  },
  // stamp the chosen animal onto a fresh player
  applyTo(P) {
    const b = this.spec();
    P.baseSpecies = b.sp.id;
    P.st.hpMul *= b.hp; P.st.speed *= b.spd; P.st.bite *= b.bite; P.st.hungerRate *= b.hunger;
    P.startSize = b.size;
    P.bodyGirth = b.girth;
    P.speciesLook = b.sp.look || null;
    P.paintId = b.pt ? b.pt.id : 'wild';
    // the species' signature gene comes free: it is what the animal already is
    if (b.gene && P.genes.indexOf(b.gene.id) < 0) { P.genes.push(b.gene.id); b.gene.apply(P); if (b.gene.downApply) b.gene.downApply(P); P.speciesGene = b.gene.id; }
    // the signature: what makes this animal that animal and not a recolour
    P.speciesTrait = b.sp.trait || null;
    if (b.sp.trait) b.sp.trait.apply(P);
    // and everything the enclosure put into it
    if (typeof Habitat !== 'undefined') Habitat.applyTo(P, b.croc);
    P.recomputeStats(); P.rebuildLook();
  },
};
