'use strict';
// ---------------------------------------------------------------------------
// THE LABORATORY.
//
// Two benches, and almost no writing on either of them.
//
//   VIALS — a real rack. Every substance the project has ever drawn is a glass
//   tube on a shelf: full and lit if you have it, empty and dark if you do not.
//   Loading one is picking a tube up. What it does is shown by what it does to
//   the animal standing next to it, not by a paragraph.
//
//   DNA — a wall of gene specimens in culture jars, laid out in the six
//   lineages. A jar is lit when that line has been funded and the gene is in
//   the animal you are taking out; a shape and a colour say which.
//
// You read this room by looking at it.
// ---------------------------------------------------------------------------
const VIALS = [
  { id: 'adren', name: 'ADRENAL', col: '#ff8030', res: 'c.adren', up: 'SPEED', down: 'HEALTH',
    apply: P => { P.st.speed *= 1.16; P.st.dashCd *= 0.82; P.st.hpMul *= 0.9; } },
  { id: 'clot', name: 'CLOTTING', col: '#c02828', res: 'c.clot', up: 'MEND', down: 'SPEED',
    apply: P => { P.st.regen += 0.022; P.st.speed *= 0.92; } },
  { id: 'myo', name: 'MYOSTATIN', col: '#e8d060', res: 'c.myo', up: 'BITE', down: 'HUNGER',
    apply: P => { P.st.bite *= 1.24; P.st.hungerRate *= 1.22; } },
  { id: 'chitin', name: 'CHITIN', col: '#8a9a40', res: 'c.chitin', up: 'ARMOUR', down: 'GROWTH',
    apply: P => { P.st.armor += 0.16; P.st.growth *= 0.88; } },
  { id: 'lumen', name: 'LUMEN', col: '#40f0c8', res: 'c.filter', up: 'LURE', down: 'STEALTH',
    apply: P => { P.st.magnet = Math.max(P.st.magnet, 90); P.st.lure = 1; P.st.stealth *= 1.5; } },
  { id: 'baro', name: 'BAROPHILIC', col: '#4a9ac8', res: 'c.baro', up: 'DEPTH', down: 'SPEED',
    apply: P => { P.st.crushDepth *= 1.9; P.st.crushRes *= 1.6; P.st.speed *= 0.9; } },
  { id: 'bile', name: 'BILE', col: '#7a9a20', res: 'c.filter', up: 'STOMACH', down: 'BITE',
    apply: P => { P.st.ironStomach = true; P.st.swallow *= 1.25; P.st.bite *= 0.92; } },
  { id: 'neuro', name: 'NEURAL', col: '#a070ff', res: 'c.neuro', up: 'GENES', down: 'FRAME',
    apply: P => { P.vialTierBonus = (P.vialTierBonus || 0) + 2; P.st.hpMul *= 0.94; } },
];
const VIAL_BY_ID = {};
for (const v of VIALS) VIAL_BY_ID[v.id] = v;

const LabBench = {
  // a vial is on the rack once the biochemistry step that isolates it is funded
  have(v) { return Research.has(v.res); },
  loaded() { return (G.save && G.save.vial) || null; },
  load(id) { if (!G.save) return; G.save.vial = G.save.vial === id ? null : id; G.storeSave(); },
  applyTo(P) { const v = VIAL_BY_ID[this.loaded()]; if (v && this.have(v)) v.apply(P); },
  // the DNA wall: every gene as a jar, grouped by the line it belongs to
  jars() {
    const out = [];
    for (const g of GENES) {
      if (g.root) continue;
      out.push({ g, lin: g.lin || g.lin2, open: !Genome.researchBlocked(g) });
    }
    return out;
  },
};
