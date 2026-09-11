'use strict';
// ---------------------------------------------------------------------------
// THE CREATION BAY and the SUBSTANCE STORE.
//
// Before a run you build the thing you are going to be. Three decisions:
// which base species the lab grows you from, how big they let you come out,
// and which recovered artifacts get spliced into the embryo. You start with a
// dwarf alligator and nothing else; everything past that is earned.
//
// Vials are the other half of progression: biological substances recovered in
// the field. One is loaded before a run and its effects are permanent for that
// run. They are the reason to go back into a map you have already cleared.
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

// ---------------------------------------------------------------------------
// Vials. Each is a substance with a real upside and a real cost.
// ---------------------------------------------------------------------------
const VIALS = [
  { id: 'none', name: 'NO SUBSTANCE', col: '#5f7f78', line: 'CLEAN BLOOD. NOTHING TO REJECT.', eff: 'NO EFFECT', apply: () => {} },
  { id: 'adren', name: 'ADRENAL CONCENTRATE', col: '#ff8030', line: 'DRAWN FROM A PANTHER THAT WOULD NOT STOP RUNNING.',
    eff: '+18% SPEED AND STAMINA, -12% MAX HEALTH', apply: P => { P.st.speed *= 1.18; P.st.dashCd *= 0.8; P.st.hpMul *= 0.88; } },
  { id: 'clot', name: 'CLOTTING FACTOR IX', col: '#c02828', line: 'IT MENDS. IT ALSO THICKENS.',
    eff: 'REGENERATE WHILE FED, -10% SPEED', apply: P => { P.st.regen += 0.02; P.st.speed *= 0.9; } },
  { id: 'myo', name: 'MYOSTATIN BLOCKER', col: '#e8d060', line: 'THE MUSCLE NEVER GETS THE MESSAGE TO STOP.',
    eff: '+25% BITE, HUNGER DRAINS 25% FASTER', apply: P => { P.st.bite *= 1.25; P.st.hungerRate *= 1.25; } },
  { id: 'chitin', name: 'CHITIN GRAFT SERUM', col: '#8a9a40', line: 'HARVESTED OFF SOMETHING THAT LIVED IN THE PIPES.',
    eff: '-18% DAMAGE TAKEN, -15% GROWTH', apply: P => { P.st.armor += 0.18; P.st.growth *= 0.85; } },
  { id: 'lumen', name: 'LUMINOUS PLASMA', col: '#40f0c8', line: 'IT GLOWS. THINGS COME TO LOOK.',
    eff: 'PREY IS DRAWN TO YOU, EVERYTHING SEES YOU COMING', apply: P => { P.st.magnet = Math.max(P.st.magnet, 90); P.st.lure = 1; P.st.stealth *= 1.5; } },
  { id: 'neuro', name: 'NEURAL ACCELERANT', col: '#a070ff', line: 'TIME OPENS UP. SO DOES THE HEADACHE.',
    eff: '+2 GENE POINTS PER TIER, +1 STRAIN TOLERANCE', apply: P => { P.vialTierBonus = 2; P.strainBonus = (P.strainBonus || 0) + 1; } },
  { id: 'bile', name: 'DIGESTIVE BILE', col: '#7a9a20', line: 'DISSOLVES BONE, SHELL AND HULL.',
    eff: 'EAT ARMOURED PREY WHOLE, -10% BITE', apply: P => { P.st.ironStomach = true; P.st.swallow *= 1.3; P.st.bite *= 0.9; } },
  { id: 'filter', name: 'HEPATIC FILTER CULTURE', col: '#8ab820', line: 'GROWN IN A SUMP. IT DRINKS WHAT WOULD KILL YOU.',
    eff: 'FILTH BUILDS 70% SLOWER, -10% BITE', apply: P => { P.st.toxRes *= 3.2; P.st.bite *= 0.9; } },
  { id: 'baro', name: 'BAROPHILIC MARROW', col: '#4a9ac8', line: 'TAKEN OFF SOMETHING DREDGED UP FROM A MILE DOWN.',
    eff: 'RATED TWICE AS DEEP, -12% SPEED AT THE SURFACE', apply: P => { P.st.crushDepth *= 2.2; P.st.crushRes *= 1.8; P.st.speed *= 0.88; } },
];
const VIAL_BY_ID = {};
for (const v of VIALS) VIAL_BY_ID[v.id] = v;

const Create = {
  rows: ['species', 'size', 'vial', 'artifacts'],
  met(need) { return typeof Stages !== 'undefined' ? Stages.met(need) : true; },
  speciesUnlocked(sp) { if (!sp.need) return true; const s = G.save || {}; if (sp.need.best !== undefined && (s.best || 0) < sp.need.best) return false; return this.met(sp.need); },
  vialUnlocked(v) {
    if (v.id === 'none') return true;
    const owned = (G.save && G.save.vials) || [];
    return owned.indexOf(v.id) >= 0;
  },
  // what the current build works out to
  spec() {
    const e = G.embryo || {};
    const sp = SPECIES_BY_ID[e.species] || BASE_SPECIES[0];
    const gr = SIZE_GRADES[clamp(e.size === undefined ? 1 : e.size, 0, SIZE_GRADES.length - 1)] || SIZE_GRADES[1];
    const gi = GIRTH_GRADES[clamp(e.girth === undefined ? 1 : e.girth, 0, GIRTH_GRADES.length - 1)] || GIRTH_GRADES[1];
    const pt = PAINT_BY_ID[e.paint] || HIDE_PAINTS[0];
    return {
      sp, gr, gi, pt,
      size: sp.size * gr.mul,
      girth: (sp.girth || 1) * gi.mul,
      hp: sp.hp * gr.hp * gi.hp, spd: sp.spd * gr.spd * gi.spd, bite: sp.bite, hunger: gr.hunger,
      vial: VIAL_BY_ID[e.vial] || VIALS[0],
      gene: sp.gene ? GENE_BY_ID[sp.gene] : null,
    };
  },
  // the look the specimen is actually wearing, for the preview and the run
  look() {
    const b = this.spec();
    const L = Object.assign({}, CROC_LOOKS.base, b.sp.look || {});
    if (b.pt && b.pt.apply) b.pt.apply(L);
    L.girth = b.girth;
    return L;
  },
  // stamp the build onto a fresh player
  applyTo(P) {
    const b = this.spec();
    P.baseSpecies = b.sp.id;
    P.st.hpMul *= b.hp; P.st.speed *= b.spd; P.st.bite *= b.bite; P.st.hungerRate *= b.hunger;
    P.startSize = b.size;
    P.bodyGirth = b.girth;
    P.speciesLook = b.sp.look || null;
    P.paintId = (G.embryo && G.embryo.paint) || 'wild';
    // the species' signature gene comes free: it is what the animal already is
    if (b.gene && P.genes.indexOf(b.gene.id) < 0) { P.genes.push(b.gene.id); b.gene.apply(P); if (b.gene.downApply) b.gene.downApply(P); P.speciesGene = b.gene.id; }
    if (b.vial && b.vial.apply) b.vial.apply(P);
    P.vialId = b.vial ? b.vial.id : 'none';
    P.recomputeStats(); P.rebuildLook();
  },
};
