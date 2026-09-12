'use strict';
// ---------------------------------------------------------------------------
// THE RESEARCH LAB.
//
// You begin with nothing. One stock animal, one hide, one body plan, two gene
// lineages, one map. Everything else is a line item on a research programme the
// project funds out of what you bring back.
//
// A run pays DATA. Data buys nodes. Nodes open species, pigments, body grades,
// gene lineages, standing biological perks and the other two zones. Nothing is
// spent in the field and nothing is lost on death — the lab is the part of you
// that survives.
// ---------------------------------------------------------------------------
const RESEARCH = [
  {
    id: 'morph', name: 'MORPHOLOGY', col: '#7affda', icon: 'body', line: 'BASE STOCK AND BODY PLAN',
    nodes: [
      { id: 'm.size', name: 'GROWTH CONTROL', cost: 2, line: 'RUNT AND OVERGROWN LENGTHS', grant: { size: [0, 2] } },
      { id: 'm.girth', name: 'BODY DEPTH', cost: 3, need: ['m.size'], line: 'LEAN AND HEAVY FRAMES', grant: { girth: [0, 2] } },
      { id: 'm.caiman', name: 'CAIMAN STOCK', cost: 5, need: ['m.size'], line: 'SPECTACLED CAIMAN', grant: { species: ['caiman'] } },
      { id: 'm.gharial', name: 'GAVIAL STOCK', cost: 8, need: ['m.caiman'], line: 'GHARIAL', grant: { species: ['gharial'] } },
      { id: 'm.nile', name: 'NILE STOCK', cost: 10, need: ['m.caiman'], line: 'NILE CROCODILE', grant: { species: ['nile'] } },
      { id: 'm.extreme', name: 'HYPERTROPHY', cost: 12, need: ['m.girth'], line: 'HYPERTROPHIC AND BULL GRADES', grant: { size: [3], girth: [3] } },
      { id: 'm.salt', name: 'ESTUARINE STOCK', cost: 16, need: ['m.nile'], line: 'SALTWATER CROCODILE', grant: { species: ['salt'] } },
      { id: 'm.deino', name: 'FOSSIL RECONSTRUCTION', cost: 26, need: ['m.salt', 'm.extreme'], line: 'DEINOSUCHUS', grant: { species: ['deino'] } },
    ],
  },
  {
    id: 'pigment', name: 'PIGMENTATION', col: '#e0b050', icon: 'drop', line: 'HIDE AND CHROMATOPHORES',
    nodes: [
      { id: 'p.basic', name: 'BASE DYES', cost: 2, line: 'TANNIN AND MARSH GREEN', grant: { paint: ['tannin', 'marsh'] } },
      { id: 'p.dark', name: 'DARK PIGMENT', cost: 4, need: ['p.basic'], line: 'BLACKWATER AND SILT GREY', grant: { paint: ['blackwater', 'silt'] } },
      { id: 'p.rare', name: 'PIGMENT DEFECTS', cost: 8, need: ['p.dark'], line: 'LEUCISTIC AND SULPHUR', grant: { paint: ['leucistic', 'sulphur'] } },
      { id: 'p.exotic', name: 'CLASSIFIED LINES', cost: 14, need: ['p.rare'], line: 'BLOODLINE AND ABYSSAL', grant: { paint: ['bloodline', 'abyssal'] } },
    ],
  },
  {
    id: 'gene', name: 'GENE THERAPY', col: '#ff5a3a', icon: 'helix', line: 'WHICH LINEAGES WILL TAKE',
    nodes: [
      { id: 'g.phantom', name: 'PHANTOM LINE', cost: 4, line: 'SPEED, STEALTH, AMBUSH', grant: { lineage: ['phantom'] } },
      { id: 'g.colossus', name: 'COLOSSUS LINE', cost: 6, line: 'MASS AS A WEAPON', grant: { lineage: ['colossus'] } },
      { id: 'g.abyssal', name: 'ABYSSAL LINE', cost: 8, need: ['g.phantom'], line: 'VENOM, REGENERATION, THE DEEP', grant: { lineage: ['abyssal'] } },
      { id: 'g.savage', name: 'SAVAGE LINE', cost: 8, need: ['g.colossus'], line: 'SPEED AND APPETITE', grant: { lineage: ['savage'] } },
      { id: 'g.hybrid', name: 'SPLICE TOLERANCE', cost: 18, need: ['g.abyssal', 'g.savage'], line: 'HYBRIDS AND CHIMERAS WILL GRAFT', grant: { hybrid: true } },
    ],
  },
  {
    id: 'chem', name: 'BIOCHEMISTRY', col: '#8ab820', icon: 'flask', line: 'STANDING TREATMENTS',
    nodes: [
      { id: 'c.clot', pic: 'heart', name: 'CLOTTING FACTOR', cost: 3, line: 'MEND WHILE FED', perk: P => { P.st.regen += 0.015; } },
      { id: 'c.filter', pic: 'filter', name: 'HEPATIC FILTER', cost: 5, need: ['c.clot'], line: 'FILTH BUILDS 60% SLOWER', perk: P => { P.st.toxRes *= 2.5; } },
      { id: 'c.chitin', pic: 'shield', name: 'CHITIN GRAFT', cost: 6, need: ['c.clot'], line: 'PLUS 10% ARMOUR', perk: P => { P.st.armor += 0.10; } },
      { id: 'c.myo', pic: 'jaw', name: 'MYOSTATIN BLOCK', cost: 8, need: ['c.chitin'], line: 'PLUS 12% BITE', perk: P => { P.st.bite *= 1.12; } },
      { id: 'c.baro', pic: 'depth', name: 'BAROPHILIC MARROW', cost: 10, need: ['c.filter'], line: 'RATED 80% DEEPER', perk: P => { P.st.crushDepth *= 1.8; P.st.crushRes *= 1.5; } },
      { id: 'c.adren', pic: 'bolt', name: 'ADRENAL GLAND', cost: 10, need: ['c.myo'], line: 'PLUS 10% SPEED AND STAMINA', perk: P => { P.st.speed *= 1.10; P.st.dashCd *= 0.9; } },
      { id: 'c.neuro', pic: 'brain', name: 'NEURAL ACCELERANT', cost: 18, need: ['c.adren', 'c.baro'], line: 'ONE EXTRA GENE POINT PER TIER', perk: P => { P.vialTierBonus = (P.vialTierBonus || 0) + 1; } },
    ],
  },
  {
    id: 'field', name: 'FIELD SURVEY', col: '#60a8ff', icon: 'globe', line: 'WHERE THEY WILL DROP YOU',
    nodes: [
      { id: 'f.glades', name: 'OUTFALL SURVEY', cost: 4, line: 'OPENS THE EVERGLADES', grant: { zone: ['glades'] } },
      { id: 'f.ocean', name: 'OFFSHORE SURVEY', cost: 7, need: ['f.glades'], line: 'OPENS THE OPEN OCEAN', grant: { zone: ['ocean'] } },
      { id: 'f.deep', name: 'DEEP SOUNDING', cost: 11, need: ['f.ocean'], line: 'OPENS THE SUMP AND THE TRENCH', grant: { site: ['sump', 'trench'] } },
    ],
  },
];
const RES_NODE = {};
for (const c of RESEARCH) for (const n of c.nodes) { n.cat = c; RES_NODE[n.id] = n; }

const Research = {
  done() { const r = G.save && G.save.research; return Array.isArray(r) ? r : (G.save ? (G.save.research = []) : []); },
  has(id) { return this.done().indexOf(id) >= 0; },
  data() { return (G.save && G.save.data) || 0; },
  addData(n) { if (!G.save) return 0; const g = Math.max(0, Math.round(n)); G.save.data = (G.save.data || 0) + g; return g; },
  // every node whose prerequisites are all bought
  open(n) { return !n.need || n.need.every(id => this.has(id)); },
  canBuy(n) { return !this.has(n.id) && this.open(n) && this.data() >= n.cost; },
  buy(n) {
    if (!this.canBuy(n)) return false;
    G.save.data -= n.cost;
    this.done().push(n.id);
    G.storeSave();
    return true;
  },
  // everything a given grant key has handed out so far
  granted(key) {
    const out = new Set();
    for (const id of this.done()) {
      const n = RES_NODE[id]; if (!n || !n.grant) continue;
      const v = n.grant[key];
      if (Array.isArray(v)) for (const k of v) out.add(k);
      else if (v !== undefined) out.add(v);
    }
    return out;
  },
  // Two gene lineages are native to the animal. The other four are surgery.
  lineageOpen(lin) { return lin === 'ripper' || lin === 'bulwark' || this.granted('lineage').has(lin); },
  hybridsOpen() { return this.has('g.hybrid'); },
  zoneOpen(id) { return id === 'sewer' || this.granted('zone').has(id); },
  siteOpen(id) { return this.granted('site').has(id); },
  // the standing treatments, stamped onto every new animal
  applyTo(P) { for (const id of this.done()) { const n = RES_NODE[id]; if (n && n.perk) n.perk(P); } },
  progress(cat) {
    let got = 0; for (const n of cat.nodes) if (this.has(n.id)) got++;
    return { got, total: cat.nodes.length, frac: got / cat.nodes.length };
  },
  totalProgress() {
    let got = 0, tot = 0;
    for (const c of RESEARCH) for (const n of c.nodes) { tot++; if (this.has(n.id)) got++; }
    return { got, tot, frac: tot ? got / tot : 0 };
  },
  // What a finished run was worth. Deliberately readable: the numbers on the
  // death card add up to the number in the corner.
  payout(stats, score, tier, relics) {
    return {
      score: Math.floor((score || 0) / 2200),
      tier: Math.max(0, (tier || 0) - 1),
      relics: (relics || 0) * 5,
      get total() { return this.score + this.tier + this.relics; },
    };
  },
};
