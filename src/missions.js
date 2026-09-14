'use strict';
// ---------------------------------------------------------------------------
// Contracts and relics. Every release site carries one standing order and one
// thing worth taking off it. Finish the order and the relic surfaces somewhere
// nearby with a beacon on it; swim to it and it is yours for good. Relics are
// the only progression that survives death, so they are the reason to go back
// to a site you have already cleared.
// ---------------------------------------------------------------------------
const ARTIFACTS = [
  { id: 'tag', stage: 'facility', name: 'SUBJECT TAG', line: 'THE NUMBER THEY GAVE YOU. YOU KEPT IT.',
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
    boon: '+50% STAMINA', col: '#40f0c8', glyph: 'core', apply: P => { P.st.dashCharges += 1; } },
  // ---- ZONE 1: the river ----
  { id: 'lamp', stage: 'wake', name: "THE GANGER'S LAMP", line: 'LEFT ON THE BENCH IN 1974 BY SOMEBODY WHO MEANT TO COME BACK FOR IT.',
    boon: 'YOU SEE IN THE DARK', col: '#ffbe50', glyph: 'lamp2', apply: P => { P.st.nightEyes = true; } },
  { id: 'bolt', stage: 'interceptor', name: 'A RING SEGMENT BOLT', line: 'IT HELD THE BARREL SHUT FOR FIFTY YEARS. NOW IT HOLDS YOU TOGETHER.',
    boon: '+15% ARMOUR', col: '#9aa2a8', glyph: 'bolt', apply: P => { P.st.armor += 0.15; } },
  { id: 'valve', stage: 'gallery', name: 'THE PENSTOCK WHEEL', line: 'TURNED ONCE, IN 1974, AND NEVER AGAIN.',
    boon: 'FILTH BUILDS HALF AS FAST', col: '#b4c840', glyph: 'valve', apply: P => { P.st.toxRes *= 2; } },
  { id: 'rebar', stage: 'outfall', name: 'A LENGTH OF REBAR', line: 'WASHED OUT OF A WEIR AND CARRIED SIX MILES, STILL BENT WHERE IT TORE.',
    boon: 'BITES PIERCE ARMOUR', col: '#a86a3a', glyph: 'rebar', apply: P => { P.st.pierce = true; } },
  { id: 'crown', stage: 'sump', name: 'THE SLUDGE CROWN', line: 'IT SETTLED OUT OF THE PLATING LINE AND SET. NOTHING ELSE DOWN THERE IS THIS CLEAN.',
    boon: 'TOXIC BLOOD, IMMUNE TO VENOM', col: '#a8d020', glyph: 'core', apply: P => { P.st.venomRes = 1; P.st.toxRes *= 2; P.st.spiteDmg = (P.st.spiteDmg || 0) + 0.25; } },
  // ---- ZONE 3: the open ocean ----
  { id: 'net', stage: 'shelf', name: 'A TORN TRAWL NET', line: 'IT TOOK EVERYTHING ON THIS SHELF FOR THIRTY YEARS. YOU TOOK IT.',
    boon: '+25% LATCH DAMAGE', col: '#cfd4c0', glyph: 'net', apply: P => { P.st.latchMul *= 1.25; } },
  { id: 'shell', stage: 'reef', name: 'NAUTILUS SHELL', line: 'A CHAMBERED SPIRAL, EMPTY. THE DESIGN IS 500 MILLION YEARS OLD.',
    boon: '+12% MAX HEALTH', col: '#e8d6b4', glyph: 'shell', apply: P => { P.st.hpMul *= 1.12; } },
  { id: 'plate', stage: 'wall', name: 'SUBMERSIBLE VIEWPORT', line: 'SIX INCHES OF ACRYLIC. WHATEVER LOOKED THROUGH IT DID NOT COME BACK.',
    boon: 'RATED 60% DEEPER', col: '#8cd8ff', glyph: 'plate', apply: P => { P.st.crushDepth *= 1.6; } },
  { id: 'esca', stage: 'trench', name: 'THE ESCA', line: 'STILL LIT. WHATEVER GREW IT DID NOT NEED THE REST OF ITSELF.',
    boon: 'PREY COMES TO YOU IN THE DARK', col: '#7affda', glyph: 'esca', apply: P => { P.st.lure = 220; P.st.magnet = Math.max(P.st.magnet, 160); } },
];
const ARTIFACT_BY_ID = {};
for (const a of ARTIFACTS) ARTIFACT_BY_ID[a.id] = a;

// One standing order per site. `kind` decides which hook counts.
const MISSIONS = {
  facility:   { title: 'GET DOWNRIVER', line: 'OPEN THE WEIR', kind: 'puzzle', target: 3 },
  mangrove:   { title: 'THIN THE ROOTS', line: 'TAKE 14 FISH', kind: 'fish', target: 14 },
  camp:       { title: 'CLOSE THE CAMP', line: 'WRECK 3 BUILDS', kind: 'wreck', target: 3 },
  cypress:    { title: 'OWN THE DEEP', line: 'KILL 5 PREDATORS', kind: 'threat', target: 5 },
  prairie:    { title: 'CROSS THE OPEN', line: 'CROSS THE OPEN', kind: 'travel', target: 1600, unit: 'M' },
  river:      { title: 'RUN THE CHANNEL', line: 'KILL A BOSS', kind: 'boss', target: 1 },
  campground: { title: 'HOLIDAY OVER', line: 'TAKE 10 PEOPLE', kind: 'human', target: 10 },
  bay:        { title: 'SALT AND TEETH', line: 'KILL 4 SHARKS', kind: 'shark', target: 4 },
  seawall:    { title: 'KAIJU PROTOCOL', line: 'WRECK 8 BOATS OR BUILDS', kind: 'wreck', target: 8 },
  // ---- ZONE 1 ----
  wake:        { title: 'FIND YOUR FEET', line: 'TAKE 5 FISH', kind: 'fish', target: 5 },
  interceptor: { title: 'WORK THE BARREL', line: 'TAKE 9 FISH', kind: 'fish', target: 9 },
  gallery:     { title: 'HOLD THE GALLERY', line: 'KILL 3 PREDATORS', kind: 'threat', target: 3 },
  sump:        { title: 'THE BOTTOM', line: 'DIVE TO', kind: 'depth', target: 900, unit: 'M' },
  outfall:     { title: 'GET OUT', line: 'OPEN THE WEIR', kind: 'puzzle', target: 3 },
  // ---- ZONE 3 ----
  shelf:      { title: 'GRAZE THE MEADOW', line: 'TAKE 18 FISH', kind: 'fish', target: 18 },
  reef:       { title: 'STRIP THE REEF', line: 'TAKE 24 FISH', kind: 'fish', target: 24 },
  wall:       { title: 'OVER THE EDGE', line: 'KILL 4 SHARKS', kind: 'shark', target: 4 },
  trench:     { title: 'PUT OUT THE LIGHT', line: 'KILL A BOSS', kind: 'boss', target: 1 },
};

// ---------------------------------------------------------------------------
// The story is told on the radio. Every site carries four transmissions, fired
// at the beats of its standing order: arrival, halfway, order complete, relic
// in your teeth. Nobody is talking to you. You are what they are talking about.
// ---------------------------------------------------------------------------
const STORY = {
  facility: ['SUBJECT 11 IS OUT OF THE TANK AND INSIDE THE BUILDING.', 'IT WENT DOWN THE INTERCEPTOR. THAT COMES OUT IN THE RIVER.',
    'SOMETHING IS WORKING THE WEIR GATES FROM THE WATER SIDE.',
    'THE OUTFLOW GATE IS OPEN. IT HAS NOT BEEN OPEN SINCE THE EMPIRE.', 'IT KEPT THE TAG. IT KNOWS WHAT IT IS.'],
  mangrove: ['THE ROOT LINE IS SHALLOW. IT WILL HAVE TO SURFACE TO CROSS.', 'IT IS NOT CROSSING. IT IS FEEDING.',
    'SIXTY POUNDS OF SNOOK IN ELEVEN MINUTES.', 'THAT RING CAME OFF A DIVER WE NEVER FOUND.'],
  camp: ['THERE ARE PEOPLE AT THAT CAMP. ADVISE THEM.', 'NOBODY IS ANSWERING AT THE CAMP.',
    'THE CAMP IS IN THE WATER.', 'JOE BUILT THAT PLACE WITH HIS HANDS. YOU HAVE HIS HEAD.'],
  cypress: ['TANNIC WATER. WE LOSE THE TRANSPONDER UNDER THE KNEES.', 'SOMETHING ELSE IS HUNTING IN THERE WITH IT.',
    'WHATEVER WAS HUNTING IT IS NOT ANY MORE.', 'THE KNEE GREW AROUND A SURVEY STAKE. NOBODY SURVEYED THAT FAR IN.'],
  prairie: ['SHEET FLOW. NO COVER FOR MILES. IT WILL TURN BACK.', 'IT IS NOT TURNING BACK.',
    'IT CROSSED THE OPEN IN DAYLIGHT.', 'THAT BLADE WILL OPEN A MAN TO THE BONE. IT IS A LEAF.'],
  river: ['THE CHANNEL IS DREDGED TO SIXTY FEET. IT CANNOT HOLD THE BOTTOM.', 'IT IS HOLDING THE BOTTOM.',
    'THE CHANNEL IS ITS NOW.', 'WE PUT THAT PROP THROUGH IT IN MARCH. IT KEPT THE PROP.'],
  campground: ['EVACUATE PARADISE. ALL LOOPS, ALL SITES.', 'THE EVACUATION IS NOT GOING WELL.',
    'PARADISE IS CLOSED.', 'THE LANTERN WAS STILL BURNING WHEN YOU TOOK IT.'],
  bay: ['OPEN SALT. IT SHOULD NOT TOLERATE THIS SALINITY.', 'SALINITY IS NOT SLOWING IT DOWN.',
    'THE BULL SHARKS HAVE LEFT THE BAY.', 'NOTHING THAT SIZE HAS SWUM HERE IN SIX MILLION YEARS. IT HAS ITS TOOTH.'],
  seawall: ['IT IS AT THE HARBOUR WALL. THE CITY IS BEHIND THE HARBOUR WALL.', 'IT IS TAKING THE WALL APART.',
    'THE WALL IS GONE. GET EVERYBODY OUT.', 'THAT CORE IS WHAT WE BUILT IT AROUND. IT HAS COME BACK FOR IT.'],
  // ---- ZONE 1 ----
  wake: ['IT WENT DOWN THE SHAFT AND IT IS NOT AT THE BOTTOM OF IT.', 'SOMETHING IS MOVING ON LEVEL ONE.',
    'IT IS EATING. THAT IS ALL IT IS DOING.'],
  interceptor: ['LEVEL TWO IS A FLOODED BARREL. WE CANNOT PUT ANYBODY IN IT.', 'IT IS USING THE PIERS TO BREATHE.',
    'WE HAVE LOST IT IN THE INTERCEPTOR.'],
  gallery: ['LEVEL THREE HAS NO AIR IN IT. IT SHOULD NOT BE ABLE TO STAY DOWN THERE.', 'IT IS HOLDING THE GALLERY.',
    'THE GALLERY IS ITS NOW.'],
  sump: ['LEVEL FOUR IS THE SUMP. THE PLATING LINE DRAINED INTO IT FOR THIRTY YEARS.', 'IT IS SWIMMING IN THE SUMP. DELIBERATELY.',
    'WHATEVER IS DOWN THERE IS NOT WHAT WE PUT IN.'],
  outfall: ['IT IS ON THE WEIRS. THE WEIRS GO UP.', 'IT IS THREE LIFTS OFF DAYLIGHT.',
    'IF IT MAKES THE OUTFALL WE LOSE IT FOR GOOD.'],
  // ---- ZONE 3 ----
  shelf: ['PAST THE WALL THE BOTTOM SHELVES OUT. TWENTY MILES OF SEAGRASS.', 'THE SHELF IS EMPTYING AHEAD OF IT.',
    'NOTHING LEFT ON THE SHELF BUT SAND.', 'THIRTY YEARS OF THAT NET DRAGGING THIS BOTTOM. IT LASTED ONE AFTERNOON.'],
  reef: ['THE REEF IS A PROTECTED SITE. IT IS ALSO A LARDER.', 'THE REEF FISH ARE STACKING UP AGAINST THE WALL.',
    'THE REEF IS STRIPPED.', 'FIVE HUNDRED MILLION YEARS OF DESIGN, AND IT FITS IN YOUR MOUTH.'],
  wall: ['THE WALL DROPS TWELVE HUNDRED FEET. BEYOND IT WE HAVE NO CHARTS.', 'IT IS HUNTING ALONG THE FACE OF THE WALL.',
    'THE PELAGICS HAVE LEFT THE WALL.', 'THAT VIEWPORT CAME OFF ALVIN-CLASS. WE NEVER RECOVERED THE HULL.'],
  trench: ['TRENCH FLOOR. NINETEEN HUNDRED FEET. NOTHING SHOULD HOLD TOGETHER DOWN THERE.', 'IT IS HOLDING TOGETHER DOWN THERE.',
    'THE LIGHT IN THE TRENCH HAS GONE OUT.', 'IT IS STILL GLOWING IN ITS TEETH. THE PROJECT IS OVER.'],
};
const Story = {
  begin(stage) { G.story = { id: stage && stage.id, said: [0, 0, 0, 0] }; this.say(0); },
  say(i) {
    const st = G.story; if (!st) return;
    const lines = STORY[st.id]; if (!lines || !lines[i] || st.said[i]) return;
    st.said[i] = 1;
    G.dispatch = { text: lines[i], t: 0, life: 5.5 + lines[i].length * 0.03 };
    SFX.ui && SFX.ui();
  },
  tick(dt) { const d = G.dispatch; if (!d) return; d.t += dt; if (d.t > d.life) G.dispatch = null; },
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
    if (!def) { G.mission = null; G.story = null; G.dispatch = null; return; }
    const art = ARTIFACTS.find(a => a.stage === stage.id);
    // a site you have already stripped still plays, it just has nothing left on it
    const x0 = G.player.x;
    // a "reach" order is a place, not a distance: the span depends on where the
    // run actually starts
    const target = def.atX !== undefined ? Math.max(60, Math.round(def.atX - x0)) : def.target;
    G.mission = { id: stage.id, def, art, target, n: 0, done: this.has(art && art.id), claimed: this.has(art && art.id), relic: null, x0, flashT: 0, halfSaid: false };
    Story.begin(stage);
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
  onWreck() { this.bump('wreck'); if (G.player && !G.player.dead) Trials.bump(G.player, 'wrecks'); },
  tick(dt) {
    Story.tick(dt);
    const m = G.mission; if (!m) return;
    if (m.flashT > 0) m.flashT -= dt;
    if (m.done) return;
    const P = G.player;
    if (m.def.kind === 'reach') { m.n = clamp(P.x - m.x0, 0, m.target); if (m.n >= m.target) this.complete(); }
    if (m.def.kind === 'travel') { m.n = Math.max(m.n, clamp(Math.abs(P.x - m.x0), 0, m.target)); if (m.n >= m.target) this.complete(); }
    if (m.def.kind === 'depth') { m.n = Math.max(m.n, clamp(P.y - World.surface(P.x), 0, m.target)); if (m.n >= m.target) this.complete(); }
    if (!m.halfSaid && m.n >= m.target * 0.5) { m.halfSaid = true; Story.say(1); }
  },
  complete() {
    const m = G.mission; if (!m || m.done) return;
    m.done = true; m.n = m.target;
    Story.say(2);
    G.addScore(4000);
    if (!m.art || this.has(m.art.id)) {
      G.banner = { text: 'ORDER COMPLETE', sub: m.def.title, t: 3.5, max: 3.5, color: '#ffd060' };
      SFX.levelup(); return;
    }
    // drop the relic in reachable water ahead of you, with a beacon on it
    const P = G.player, side = P.facing || 1;
    // a relic dropped in the sewer has to be allowed to land in the sewer
    const roofOk = World.isIndoor(P.x);
    let rx = null;
    for (const d of [220, 340, 460, 160, 620]) {
      const x = World.findX(P.x + side * d, xx => World.floorY(xx) > 34 && (roofOk || !World.isIndoor(xx)), 400, 20);
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
    Story.say(3);
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
    Shape.star(ctx, x, y, 13 + k * 6, a.col, 0.28 + k * 0.3);
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
    case 'lamp2': w(-1 + tilt, -8, 2, 2, d); w(-4 + tilt, -6, 8, 2, d); w(-3 + tilt, -4, 6, 7, c); w(-2 + tilt, -3, 4, 5, '#fff0b0'); w(-1 + tilt, -2, 2, 3, '#ffffff'); w(-4 + tilt, 3, 8, 2, d); break;
    case 'bolt': w(-3 + tilt, -7, 6, 3, l); w(-2 + tilt, -4, 4, 10, c); w(-2 + tilt, -4, 1, 10, d); for (let i = -2; i < 5; i += 2) w(-2 + tilt, i, 4, 1, d); break;
    case 'valve': w(-6 + tilt, -1, 12, 2, c); w(-1 + tilt, -6, 2, 12, c); w(-5 + tilt, -5, 10, 2, c); w(-5 + tilt, 3, 10, 2, c); w(-2 + tilt, -2, 4, 4, d); w(-1 + tilt, -1, 2, 2, l); break;
    case 'rebar': w(-1 + tilt, -8, 2, 12, c); w(-1 + tilt, -8, 1, 12, l); w(0 + tilt, 4, 4, 2, c); for (let i = -7; i < 4; i += 3) w(-2 + tilt, i, 4, 1, d); break;
    case 'crown': w(-6 + tilt, -1, 12, 5, c); w(-6 + tilt, -1, 12, 1, l); w(-6 + tilt, -5, 2, 4, c); w(-1 + tilt, -7, 2, 6, c); w(4 + tilt, -5, 2, 4, c); w(-1 + tilt, -8, 2, 2, l); w(-5 + tilt, 1, 1, 1, d); w(3 + tilt, 1, 1, 1, d); break;
    case 'net': for (let i = -6; i <= 6; i += 3) w(i + tilt, -6, 1, 12, c); for (let j = -6; j <= 5; j += 3) w(-6 + tilt, j, 13, 1, c); w(-6 + tilt, -6, 13, 1, l); w(2 + tilt, 0, 4, 4, d); break;
    case 'shell': w(-2 + tilt, -6, 5, 2, c); w(-5 + tilt, -4, 9, 2, c); w(-6 + tilt, -2, 11, 3, c); w(-5 + tilt, 1, 9, 2, c); w(-3 + tilt, 3, 6, 2, c); w(-2 + tilt, -4, 3, 1, l); w(-1 + tilt, -1, 3, 1, d); break;
    case 'plate': w(-6 + tilt, -5, 12, 10, d); w(-5 + tilt, -4, 10, 8, c); w(-4 + tilt, -3, 7, 5, l); w(-4 + tilt, -3, 3, 2, '#ffffff'); break;
    case 'esca': w(-1 + tilt, 1, 2, 5, d); w(-2 + tilt, -1, 4, 3, d); w(-3 + tilt, -6, 6, 5, c); w(-2 + tilt, -5, 4, 3, l); w(-1 + tilt, -8, 2, 2, l); break;
    default: w(-4 + tilt, -4, 8, 8, d); w(-3 + tilt, -3, 6, 6, c); w(-2 + tilt, -2, 4, 4, l); w(-1 + tilt, -6, 2, 2, c); w(-1 + tilt, 4, 2, 2, c); break;
  }
}
