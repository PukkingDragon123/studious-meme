'use strict';
// ---------------------------------------------------------------------------
// THE HABITAT.
//
// Six enclosures down the back wall of the lab, each with water in it and,
// if you have hatched one, a crocodile living in it. An animal here is a
// character and not a loadout slot: it is a species with a signature, a name,
// a level it grew to by being fed, three things you can put points into, and a
// hide. You pick which one goes out on a run, and it is the one that comes
// back — bigger, if it lived.
//
// Nothing here is text if it can be a picture: the enclosure shows the real
// animal, at the real size, in the real colours.
// ---------------------------------------------------------------------------
const HAB_SLOTS = 6;
const HAB_UPGRADES = [
  { id: 'body', name: 'BODY', col: '#ff6a5a', icon: 'heart', per: 0.07, line: 'MASS AND MEAT' },
  { id: 'jaws', name: 'JAWS', col: '#ffd060', icon: 'jaw', per: 0.06, line: 'BITE AND HOLD' },
  { id: 'blood', name: 'BLOOD', col: '#60c8ff', icon: 'drop', per: 0.05, line: 'SPEED AND WIND' },
];
// XP needed to reach each level. Feeding is the only way in, and it is cheap
// early so a first animal grows visibly inside one session.
function habXpFor(lv) { return Math.round(10 + lv * lv * 7 + lv * 9); }

const Habitat = {
  MAX_LV: 12,
  list() {
    const s = G.save;
    if (!s) return [];
    if (!Array.isArray(s.habitat)) s.habitat = [];
    while (s.habitat.length < HAB_SLOTS) s.habitat.push(null);
    return s.habitat;
  },
  // Nothing is handed to you. An empty habitat is the correct state of a new
  // save: the first animal is grown in the creation bay, and the induction
  // walks you there. This only keeps the selection pointing at something real.
  ensure() {
    const L = this.list();
    if (!this.runner()) { const k = L.findIndex(c => c); if (k >= 0) G.save.runner = k; }
    return L;
  },
  make(spId) {
    const sp = SPECIES_BY_ID[spId] || BASE_SPECIES[0];
    const seed = (Math.random() * 1e9) | 0;
    return { sp: sp.id, hide: 'wild', size: 1, girth: 1, lv: 1, xp: 0, up: { body: 0, jaws: 0, blood: 0 }, seed, out: 0 };
  },
  at(i) { const L = this.list(); return L[clamp(i, 0, L.length - 1)] || null; },
  runner() { return this.at(G.save ? (G.save.runner || 0) : 0); },
  runnerIndex() { return clamp((G.save && G.save.runner) || 0, 0, HAB_SLOTS - 1); },
  select(i) { if (this.at(i)) { G.save.runner = i; G.storeSave(); return true; } return false; },
  spec(c) { return c ? (SPECIES_BY_ID[c.sp] || BASE_SPECIES[0]) : BASE_SPECIES[0]; },
  // what a name-plate says. Species initial plus the seed, so every animal in
  // the room is telling you apart from the others without a word of prose.
  tag(c) { return c ? (this.spec(c).name[0] + '-' + (100 + (c.seed % 900))) : '--'; },
  // ---------- growing ----------
  // the first animal the project ever grows for you is on the project
  hatchCost(spId) {
    if (!this.list().some(c => c)) return 0;
    const sp = SPECIES_BY_ID[spId] || BASE_SPECIES[0];
    return Math.round(4 + (sp.size - 1) * 9);
  },
  canHatch(slot, spId) {
    const sp = SPECIES_BY_ID[spId]; if (!sp) return false;
    if (this.at(slot)) return false;
    if (!Create.speciesUnlocked(sp)) return false;
    return Research.data() >= this.hatchCost(spId);
  },
  hatch(slot, spId) {
    if (!this.canHatch(slot, spId)) return false;
    G.save.data -= this.hatchCost(spId);
    this.list()[slot] = this.make(spId);
    G.storeSave();
    return true;
  },
  // like the first animal, the first meal is on the project — otherwise the
  // induction tells a brand new save to feed something it cannot pay for
  feedCost(c) {
    if (typeof Tutor !== 'undefined' && Tutor.at('feed')) return 0;
    return c ? 1 + Math.floor(c.lv / 3) : 1;
  },
  feedXp(c) { return 12 + c.lv * 3; },
  canFeed(c) { return !!c && c.lv < this.MAX_LV && Research.data() >= this.feedCost(c); },
  feed(c) {
    if (!this.canFeed(c)) return 0;
    G.save.data -= this.feedCost(c);
    return this.addXp(c, this.feedXp(c));
  },
  // returns how many levels it gained
  addXp(c, n) {
    if (!c) return 0;
    let up = 0;
    c.xp += n;
    while (c.lv < this.MAX_LV && c.xp >= habXpFor(c.lv)) { c.xp -= habXpFor(c.lv); c.lv++; up++; }
    if (c.lv >= this.MAX_LV) c.xp = 0;
    G.storeSave();
    return up;
  },
  spent(c) { return c ? c.up.body + c.up.jaws + c.up.blood : 0; },
  points(c) { return c ? Math.max(0, (c.lv - 1) - this.spent(c)) : 0; },
  invest(c, id) {
    if (!c || this.points(c) <= 0 || c.up[id] === undefined) return false;
    c.up[id]++; G.storeSave(); return true;
  },
  // ---------- what it is worth in the field ----------
  look(c) {
    const sp = this.spec(c);
    const L = Object.assign({}, CROC_LOOKS.base, sp.look || {});
    const pt = PAINT_BY_ID[c ? c.hide : 'wild'];
    if (pt && pt.apply) pt.apply(L);
    L.girth = (sp.girth || 1) * (GIRTH_GRADES[clamp(c ? c.girth : 1, 0, 3)] || GIRTH_GRADES[1]).mul;
    return L;
  },
  // levels are real: a level 12 animal is meaningfully a different beast
  applyTo(P, c) {
    if (!c) return;
    const lv = c.lv - 1;
    P.st.hpMul *= 1 + lv * 0.04 + c.up.body * HAB_UPGRADES[0].per;
    P.st.bite *= 1 + lv * 0.03 + c.up.jaws * HAB_UPGRADES[1].per;
    P.st.speed *= 1 + lv * 0.015 + c.up.blood * HAB_UPGRADES[2].per;
    P.st.dashCd *= 1 - Math.min(0.35, c.up.blood * 0.03);
    P.habLevel = c.lv;
  },
  // a run that ends feeds the animal that went on it
  onRunEnd(score, tier) {
    const c = this.runner(); if (!c) return 0;
    c.out = (c.out || 0) + 1;
    return this.addXp(c, Math.round(Math.max(0, tier - 1) * 6 + score / 3000));
  },
};
