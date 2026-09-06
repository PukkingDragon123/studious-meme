'use strict';
// ---------------------------------------------------------------------------
// Contracts and relics. Every release site carries one standing order and one
// thing worth taking off it. Finish the order and the relic surfaces somewhere
// nearby with a beacon on it; swim to it and it is yours for good. Relics are
// the only progression that survives death, so they are the reason to go back
// to a site you have already cleared.
// ---------------------------------------------------------------------------
const ARTIFACTS = [
  { id: 'tag', stage: 'outfall', name: 'SUBJECT TAG', line: 'THE NUMBER THEY GAVE YOU. YOU KEPT IT.',
    boon: 'START EVERY RUN WITH 2 GENE POINTS', col: '#9ad8c0', glyph: 'tag', apply: P => { P.genePoints += 2; } },
  { id: 'oyster', stage: 'mangrove', name: "DROWNED MAN'S RING", line: 'PRISED OUT OF AN OYSTER BED WITH A FINGER STILL IN IT.',
    boon: '+8% BITE', col: '#d8c8a0', glyph: 'ring', apply: P => { P.st.bite *= 1.08; } },
  { id: 'skull', stage: 'camp', name: "GATOR JOE'S SKULL", line: 'HE NAMED THE CAMP AFTER HIMSELF. YOU KEPT THE REST.',
    boon: '+10% MAX HEALTH', col: '#e4dcc4', glyph: 'skull', apply: P => { P.st.hpMul *= 1.10; } },
  { id: 'knee', stage: 'cypress', name: 'BLACKWATER KNEE', line: 'A CYPRESS KNEE THAT GREW AROUND SOMETHING METAL.',
    boon: '+2 STRAIN TOLERANCE', col: '#8a6a44', glyph: 'knee', apply: P => { P.strainBonus = (P.strainBonus || 0) + 2; } },
  { id: 'blade', stage: 'prairie', name: 'SAWGRASS BLADE', line: 'ONE LEAF, HONED BY A HUNDRED MILES OF WIND.',
    boon: 'BITES CAUSE BLEEDING', col: '#a8c060', glyph: 'blade', apply: P => { P.st.bleed = true; } },
  { id: 'prop', stage: 'river', name: 'BENT PROPELLER', line: 'IT WENT THROUGH YOU ONCE. NOW YOU CARRY IT.',
    boon: '+12% SWIM SPEED', col: '#b0b8c0', glyph: 'prop', apply: P => { P.st.speed *= 1.12; } },
  { id: 'lantern', stage: 'campground', name: 'CAMP LANTERN', line: 'STILL LIT. NOBODY LEFT TO SEE BY IT.',
    boon: 'PREY LURED FROM FURTHER OFF', col: '#ffd070', glyph: 'lantern', apply: P => { P.st.magnet = Math.max(P.st.magnet, 40); P.st.lure = Math.max(P.st.lure, 1); } },
  { id: 'tooth', stage: 'bay', name: 'MEGALODON TOOTH', line: 'DREDGED UP FROM UNDER THE BAY. NOTHING THAT SIZE SWIMS NOW.',
    boon: '+15% DEATH ROLL DAMAGE', col: '#cfc0a8', glyph: 'tooth', apply: P => { P.st.rollDmg *= 1.15; } },
  { id: 'core', stage: 'seawall', name: 'CONTAINMENT CORE', line: 'THE THING THEY GREW YOU AROUND. IT STILL HUMS.',
    boon: '+1 DASH CHARGE', col: '#40f0c8', glyph: 'core', apply: P => { P.st.dashCharges += 1; } },
];
const ARTIFACT_BY_ID = {};
for (const a of ARTIFACTS) ARTIFACT_BY_ID[a.id] = a;

// One standing order per site. `kind` decides which hook counts.
const MISSIONS = {
  outfall:    { title: 'GET OUT', line: 'REACH OPEN WATER', kind: 'reach', atX: 980, unit: 'M' },
  mangrove:   { title: 'THIN THE ROOTS', line: 'TAKE 14 FISH', kind: 'fish', target: 14 },
  camp:       { title: 'CLOSE THE CAMP', line: 'WRECK 3 BUILDS', kind: 'wreck', target: 3 },
  cypress:    { title: 'OWN THE DEEP', line: 'KILL 5 PREDATORS', kind: 'threat', target: 5 },
  prairie:    { title: 'CROSS THE OPEN', line: 'CROSS THE OPEN', kind: 'travel', target: 1600, unit: 'M' },
  river:      { title: 'RUN THE CHANNEL', line: 'KILL A BOSS', kind: 'boss', target: 1 },
  campground: { title: 'HOLIDAY OVER', line: 'TAKE 10 PEOPLE', kind: 'human', target: 10 },
  bay:        { title: 'SALT AND TEETH', line: 'KILL 4 SHARKS', kind: 'shark', target: 4 },
  seawall:    { title: 'KAIJU PROTOCOL', line: 'WRECK 8 BOATS OR BUILDS', kind: 'wreck', target: 8 },
};

const Missions = {
  owned() { const a = G.save && G.save.artifacts; return Array.isArray(a) ? a : []; },
  has(id) { return this.owned().indexOf(id) >= 0; },
  // the permanent half of progression: everything you have ever carried out
  applyAll(P) {
    for (const id of this.owned()) { const a = ARTIFACT_BY_ID[id]; if (a) a.apply(P); }
  },
  start(stage) {
    const def = stage && MISSIONS[stage.id];
    if (!def) { G.mission = null; return; }
    const art = ARTIFACTS.find(a => a.stage === stage.id);
    // a site you have already stripped still plays, it just has nothing left on it
    const x0 = G.player.x;
    // a "reach" order is a place, not a distance: the span depends on where the
    // run actually starts, which for the outfall is back in the tank
    const target = def.atX !== undefined ? Math.max(60, Math.round(def.atX - x0)) : def.target;
    G.mission = { id: stage.id, def, art, target, n: 0, done: this.has(art && art.id), claimed: this.has(art && art.id), relic: null, x0, flashT: 0 };
  },
  bump(kind, n = 1) {
    const m = G.mission; if (!m || m.done || m.def.kind !== kind) return;
    m.n = Math.min(m.target, m.n + n);
    m.flashT = 0.5;
    if (m.n >= m.target) this.complete();
    else SFX.ui && SFX.ui();
  },
  onKill(e, byPlayer) {
    if (!byPlayer || !G.mission || G.mission.done) return;
    if (e.type === 'gib' || e.type === 'proj') return;
    if (e.isBoss) this.bump('boss');
    if (e.human) this.bump('human');
    if (e.threat) this.bump('threat');
    if (e.type === 'fish') this.bump('fish');
    if (e.kind === 'shark' || e.name === 'BIG BULL') this.bump('shark');
  },
  onWreck() { this.bump('wreck'); },
  tick(dt) {
    const m = G.mission; if (!m) return;
    if (m.flashT > 0) m.flashT -= dt;
    if (m.done) return;
    const P = G.player;
    if (m.def.kind === 'reach') { m.n = clamp(P.x - m.x0, 0, m.target); if (m.n >= m.target) this.complete(); }
    if (m.def.kind === 'travel') { m.n = Math.max(m.n, clamp(Math.abs(P.x - m.x0), 0, m.target)); if (m.n >= m.target) this.complete(); }
  },
  complete() {
    const m = G.mission; if (!m || m.done) return;
    m.done = true; m.n = m.target;
    G.addScore(4000);
    if (!m.art || this.has(m.art.id)) {
      G.banner = { text: 'ORDER COMPLETE', sub: m.def.title, t: 3.5, max: 3.5, color: '#ffd060' };
      SFX.levelup(); return;
    }
    // drop the relic in reachable water ahead of you, with a beacon on it
    const P = G.player, side = P.facing || 1;
    let rx = null;
    for (const d of [220, 340, 460, 160, 620]) {
      const x = World.findX(P.x + side * d, xx => World.floorY(xx) > 34 && !World.isIndoor(xx), 400, 20);
      if (x !== null) { rx = x; break; }
    }
    if (rx === null) rx = P.x + side * 200;
    const fy = World.floorY(rx), su = World.surface(rx);
    const ry = fy > su + 30 ? fy - 18 : (fy + su) * 0.5;
    m.relic = G.add(new Relic(rx, ry, m.art));
    G.banner = { text: 'ORDER COMPLETE', sub: 'A RELIC SURFACED. TAKE IT.', t: 4, max: 4, color: '#ffd060' };
    SFX.levelup(); G.whiteFlash(0.3); G.slowmo(0.35, 0.6);
  },
  claim(art) {
    const m = G.mission;
    const list = this.owned();
    if (list.indexOf(art.id) < 0) list.push(art.id);
    G.save.artifacts = list;
    if (m) { m.claimed = true; m.relic = null; }
    const P = G.player;
    P.genePoints += 3; P.newPoints += 3;
    art.apply(P);
    G.addScore(6000);
    G.banner = { text: art.name, sub: art.boon, t: 5, max: 5, color: art.col };
    G.fx.text(P.x, P.y - 34 * P.vis, 'RELIC CLAIMED', { color: art.col, scale: 3, life: 2 });
    SFX.levelup(); SFX.pick(); G.whiteFlash(0.6); G.slowmo(0.25, 1.1); G.shake(8);
    for (let i = 0; i < 26; i++) G.fx.glow(P.x + rand(-40, 40) * P.vis, P.y + rand(-26, 26) * P.vis, rand(2, 6), art.col, rand(0.4, 1));
    G.storeSave();
  },
  // one short line for the HUD
  hud() {
    const m = G.mission; if (!m) return null;
    if (m.claimed && m.done) return null;
    if (m.done) return { text: 'TAKE THE RELIC', frac: 1, col: '#ffd060' };
    const d = m.def;
    // a place-based order just says the place; a counted one shows the count
    const txt = d.atX !== undefined ? d.line : d.line + '  ' + Math.floor(m.n) + '/' + m.target + (d.unit || '');
    return { text: txt, frac: m.n / m.target, col: '#8ce8a0' };
  },
};

// ---------- the relic itself ----------
class Relic extends Entity {
  constructor(x, y, art) {
    super(x, y);
    this.art = art; this.type = 'relic'; this.name = art.name; this.edible = false; this.bleeds = false;
    this.latchable = false; this.persistent = true; this.mass = 0; this.hp = this.maxHp = 1e9;
    this.r = 9; this.size = 1; this.sizeClass = 0.2; this.bob = rand(TAU); this.y0 = y; this.pulse = 0;
  }
  takeDamage() { return 0; }
  update(dt) {
    this.bob += dt * 1.6; this.pulse += dt;
    this.y = this.y0 + Math.sin(this.bob) * 4;
    const P = G.player;
    // beacon: a column of light so it can be found from off screen
    if (chance(dt * 26)) G.fx.add({ type: 'bubble', x: this.x + rand(-6, 6), y: this.y, vx: rand(-6, 6), vy: -34, s: 1, seed: rand(TAU), life: 1.4 });
    if (chance(dt * 9)) G.fx.glow(this.x + rand(-8, 8), this.y + rand(-8, 8), rand(2, 4), this.art.col, 0.5);
    if (!P.dead && P.nearestDist(this.x, this.y) < 14 + 4 * P.vis) { Missions.claim(this.art); this.remove = true; }
  }
  draw(ctx) {
    const a = this.art, x = Math.round(this.x), y = Math.round(this.y);
    const k = 0.5 + 0.5 * Math.sin(this.pulse * 3);
    // beam
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = a.col; ctx.globalAlpha = 0.05 + k * 0.05;
    ctx.fillRect(x - 4, y - 260, 8, 260);
    ctx.globalAlpha = 0.10 + k * 0.10;
    ctx.beginPath(); ctx.arc(x, y, 14 + k * 5, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    drawRelicGlyph(ctx, a, x, y, this.bob * 0.4);
  }
}
// small procedural pixel object, also used by the vault screen
function drawRelicGlyph(ctx, art, x, y, spin = 0, s = 1) {
  const c = art.col, d = shade(c, 0.5), l = shade(c, 1.5);
  const w = (px, py, pw, ph, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x + px * s), Math.round(y + py * s), Math.max(1, Math.round(pw * s)), Math.max(1, Math.round(ph * s))); };
  const tilt = Math.sin(spin) * 1.4;
  switch (art.glyph) {
    case 'tag': w(-3 + tilt, -6, 6, 11, c); w(-3 + tilt, -6, 6, 1, l); w(-3 + tilt, 4, 6, 1, d); w(-1 + tilt, -4, 2, 2, d); w(-2 + tilt, 0, 4, 1, d); break;
    case 'ring': w(-5 + tilt, -3, 10, 2, c); w(-5 + tilt, -1, 2, 4, c); w(3 + tilt, -1, 2, 4, c); w(-5 + tilt, 3, 10, 2, c); w(-1 + tilt, -5, 2, 2, l); break;
    case 'skull': w(-5 + tilt, -5, 10, 7, c); w(-5 + tilt, -5, 10, 1, l); w(-3 + tilt, -3, 2, 2, d); w(1 + tilt, -3, 2, 2, d); w(-4 + tilt, 2, 8, 4, c); w(-3 + tilt, 3, 1, 3, d); w(0 + tilt, 3, 1, 3, d); w(3 + tilt, 3, 1, 3, d); break;
    case 'knee': w(-2 + tilt, -6, 4, 12, c); w(-2 + tilt, -6, 1, 12, l); w(-4 + tilt, 2, 8, 3, d); w(1 + tilt, -2, 2, 2, '#b0b8c0'); break;
    case 'blade': w(-1 + tilt, -7, 2, 13, c); w(-1 + tilt, -7, 1, 13, l); w(1 + tilt, -5, 1, 2, d); w(1 + tilt, -1, 1, 2, d); w(1 + tilt, 3, 1, 2, d); break;
    case 'prop': w(-6 + tilt, -1, 12, 2, c); w(-1 + tilt, -6, 2, 12, c); w(-1 + tilt, -1, 2, 2, l); w(4 + tilt, -1, 2, 2, d); w(-1 + tilt, 4, 2, 2, d); break;
    case 'lantern': w(-3 + tilt, -6, 6, 2, d); w(-4 + tilt, -4, 8, 8, c); w(-2 + tilt, -2, 4, 4, '#fff0a0'); w(-4 + tilt, 4, 8, 2, d); w(-1 + tilt, -8, 2, 2, d); break;
    case 'tooth': w(-4 + tilt, -6, 8, 4, c); w(-4 + tilt, -6, 8, 1, l); w(-3 + tilt, -2, 6, 3, c); w(-2 + tilt, 1, 4, 3, c); w(-1 + tilt, 4, 2, 3, c); w(2 + tilt, -2, 1, 3, d); break;
    default: w(-4 + tilt, -4, 8, 8, d); w(-3 + tilt, -3, 6, 6, c); w(-2 + tilt, -2, 4, 4, l); w(-1 + tilt, -6, 2, 2, c); w(-1 + tilt, 4, 2, 2, c); break;
  }
}
