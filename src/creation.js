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
    size: 1.0, hp: 1.0, spd: 1.0, bite: 1.0, need: null,
    look: { back: '#4a5a3a', mid: '#5f7048', belly: '#c8c0a0', dark: '#2e3a24', eye: '#c8a030' } },
  { id: 'caiman', name: 'SPECTACLED CAIMAN', latin: 'C. CROCODILUS',
    line: 'BONY BROW, BAD TEMPER. FASTER OUT OF THE GATE, THINNER SKINNED.',
    size: 1.15, hp: 0.9, spd: 1.18, bite: 1.05, need: { runs: 3 },
    look: { back: '#5a5a3a', mid: '#74744a', belly: '#d0c8a0', dark: '#3a3a22', eye: '#a0c840' } },
  { id: 'nile', name: 'NILE CROCODILE', latin: 'C. NILOTICUS',
    line: 'THE STANDARD AGAINST WHICH THE PROJECT MEASURES ITSELF.',
    size: 1.35, hp: 1.15, spd: 1.05, bite: 1.2, need: { bestTier: 5 },
    look: { back: '#4a4436', mid: '#635c46', belly: '#c4bc9c', dark: '#2c281e', eye: '#c8b040' } },
  { id: 'gharial', name: 'GHARIAL', latin: 'G. GANGETICUS',
    line: 'A JAW LIKE A NEEDLE FILE. BUILT FOR FISH AND FOR SPEED.',
    size: 1.25, hp: 0.85, spd: 1.35, bite: 0.9, need: { kills: 400 },
    look: { back: '#3e4a52', mid: '#546470', belly: '#c0c8cc', dark: '#242c33', eye: '#e0e8a0' } },
  { id: 'salt', name: 'SALTWATER CROCODILE', latin: 'C. POROSUS',
    line: 'THE LARGEST LIVING REPTILE. THE PROJECT KEEPS ONE. IT IS NOT FOR SALE.',
    size: 1.7, hp: 1.35, spd: 0.92, bite: 1.35, need: { bestTier: 9 },
    look: { back: '#3a3a2c', mid: '#4e4e3a', belly: '#b8b494', dark: '#20201a', eye: '#d8c050' } },
  { id: 'deino', name: 'DEINOSUCHUS EMBRYO', latin: 'D. RIOGRANDENSIS (RECONSTRUCTED)',
    line: 'GROWN FROM A FRAGMENT. IT SHOULD NOT BE ALIVE. IT IS VERY MUCH ALIVE.',
    size: 2.2, hp: 1.6, spd: 0.85, bite: 1.6, need: { best: 400000 },
    look: { back: '#4a3a3a', mid: '#5f4a48', belly: '#c0a898', dark: '#2a1e1e', eye: '#ff6030', spikes: 1 } },
];
const SPECIES_BY_ID = {};
for (const s of BASE_SPECIES) SPECIES_BY_ID[s.id] = s;

// Size is a real trade, not a difficulty slider: bigger starts you higher up
// the food chain but eats hunger and slows you down.
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
    const e = G.embryo || { species: 'dwarf', size: 1, vial: 'none' };
    const sp = SPECIES_BY_ID[e.species] || BASE_SPECIES[0];
    const gr = SIZE_GRADES[clamp(e.size, 0, SIZE_GRADES.length - 1)] || SIZE_GRADES[1];
    return { sp, gr, size: sp.size * gr.mul, hp: sp.hp * gr.hp, spd: sp.spd * gr.spd, bite: sp.bite, hunger: gr.hunger, vial: VIAL_BY_ID[e.vial] || VIALS[0] };
  },
  // stamp the build onto a fresh player
  applyTo(P) {
    const b = this.spec();
    P.baseSpecies = b.sp.id;
    P.st.hpMul *= b.hp; P.st.speed *= b.spd; P.st.bite *= b.bite; P.st.hungerRate *= b.hunger;
    P.startSize = b.size;
    if (b.vial && b.vial.apply) b.vial.apply(P);
    P.vialId = b.vial ? b.vial.id : 'none';
    // the species' own hide, before genes and morphs
    if (b.sp.look) { P.speciesLook = b.sp.look; P.rebuildLook(); }
  },
};
