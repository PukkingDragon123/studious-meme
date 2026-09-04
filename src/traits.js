'use strict';
// ---------------------------------------------------------------------------
// ANIMAL TRAITS: evolution cards themed on real Everglades animals. Each one
// changes stats AND the crocodile's look. Some are locked behind lifetime
// milestones ("crack and eat 100 snapping turtles") that persist between runs.
// ---------------------------------------------------------------------------
const Meta = {
  data: null,
  DEFAULT: () => ({ eat: {}, ev: {}, unlocked: [], seen: {}, ver: 1 }),
  load() {
    try { this.data = Object.assign(this.DEFAULT(), JSON.parse(localStorage.getItem('chompers.meta') || '{}')); }
    catch (e) { this.data = this.DEFAULT(); }
    if (!this.data.eat) this.data.eat = {}; if (!this.data.ev) this.data.ev = {};
    if (!Array.isArray(this.data.unlocked)) this.data.unlocked = []; if (!this.data.seen) this.data.seen = {};
  },
  save() { try { localStorage.setItem('chompers.meta', JSON.stringify(this.data)); } catch (e) { } },
  eaten(name, n = 1) { this.data.eat[name] = (this.data.eat[name] || 0) + n; this.data.seen[name] = true; },
  event(key, n = 1) { this.data.ev[key] = (this.data.ev[key] || 0) + n; },
  countEat(name) { return this.data.eat[name] || 0; },
  countEv(key) { return this.data.ev[key] || 0; },
  isUnlocked(id) { return this.data.unlocked.indexOf(id) >= 0; },
  unlock(id) { if (!this.isUnlocked(id)) { this.data.unlocked.push(id); this.save(); return true; } return false; },
  // progress on a trait's requirement: [current, needed]
  progress(t) {
    if (!t.unlock) return [1, 1];
    const u = t.unlock;
    let cur = 0;
    if (u.eat) cur = u.eat.reduce((s, n) => s + this.countEat(n), 0);
    else if (u.ev) cur = this.countEv(u.ev);
    return [Math.min(cur, u.need), u.need];
  },
  // called after every kill; returns list of newly unlocked traits
  checkUnlocks() {
    const out = [];
    for (const t of ANIMAL_TRAITS) {
      if (!t.unlock || this.isUnlocked(t.id)) continue;
      const [cur, need] = this.progress(t);
      if (cur >= need && this.unlock(t.id)) out.push(t);
    }
    return out;
  },
};

// look(L) mutates the croc palette/features; see buildCrocParts in sprites.js
const ANIMAL_TRAITS = [
  // ---------------- always available ----------------
  {
    id: 'garscale', name: 'GANOID SCALES', animal: 'ALLIGATOR GAR', color: '#b9c07a',
    desc: 'Interlocking diamond armor. -22% damage taken, bullets glance off.',
    apply: p => { p.st.armor += 0.22; p.st.bulletArmor += 0.2; }, look: L => { L.ganoid = true; },
  },
  {
    id: 'sharkskin', name: 'DERMAL DENTICLES', animal: 'BULL SHARK', color: '#9fb4bd',
    desc: 'Sandpaper hide cuts the water. +18% speed, +12% acceleration, -10% damage taken.',
    apply: p => { p.st.speed *= 1.18; p.st.accel *= 1.12; p.st.armor += 0.1; }, look: L => { L.denticle = true; },
  },
  {
    id: 'otterfoot', name: 'WEBBED CLAWS', animal: 'RIVER OTTER', color: '#8a6a44',
    desc: 'Paddle feet. +30% acceleration, -30% dash cooldown, turn on a dime.',
    apply: p => { p.st.accel *= 1.3; p.st.dashCd *= 0.7; p.st.turn = (p.st.turn || 1) * 1.4; }, look: L => { L.webbed = '#7a5a3a'; },
  },
  {
    id: 'heronneck', name: 'SPEAR STRIKE', animal: 'GREAT BLUE HERON', color: '#8fa3b5',
    desc: 'Your neck snaps out. +45% bite reach and bites lunge you forward.',
    apply: p => { p.st.biteRadius *= 1.45; p.st.lunge = 260; }, look: L => { L.frill = '#8fa3b5'; },
  },
  {
    id: 'carapace', name: 'CARAPACE PLATES', animal: 'SNAPPING TURTLE', color: '#6e7f3e',
    desc: 'A shell grows over your back. -30% damage taken and melee attackers take 30% back.',
    apply: p => { p.st.armor += 0.3; p.st.reflect += 0.3; }, look: L => { L.shell = '#5f7038'; },
  },
  {
    id: 'pythonjaw', name: 'UNHINGED JAW', animal: 'BURMESE PYTHON', color: '#c8a86a',
    desc: 'Swallow prey up to 90% of your own size whole. Gulping restores extra hunger.',
    apply: p => { p.st.swallow *= 1.8; p.st.hungerRestore *= 1.25; }, look: L => { L.stripe2 = true; },
  },
  {
    id: 'blubber', name: 'BLUBBER LAYER', animal: 'MANATEE', color: '#a0a6a6',
    desc: '+35% max HP. You cannot be knocked around or constricted.',
    apply: p => { p.st.hpMul *= 1.35; p.st.knockImmune = true; }, look: L => { L.paddle = '#8a9090'; },
  },
  {
    id: 'tusks', name: 'BOAR TUSKS', animal: 'WILD BOAR', color: '#f0e8d8',
    desc: 'Ivory tusks. Dashing gores anything you hit for 140% bite damage.',
    apply: p => { p.st.bullRush = true; p.st.ramMul = (p.st.ramMul || 1) * 1.4; }, look: L => { L.tusks = true; },
  },
  {
    id: 'stingbarb', name: 'CAUDAL BARB', animal: 'SOUTHERN STINGRAY', color: '#7a6a5a',
    desc: 'A venomous spike on your tail stabs anything chasing you.',
    apply: p => { p.st.barb = 14; p.st.venom += 0.25; }, look: L => { L.barb = true; },
  },
  {
    id: 'pantherclaw', name: 'RETRACTED CLAWS', animal: 'FLORIDA PANTHER', color: '#c8a060',
    desc: 'On land you sprint and pounce. +80% land speed, +60% hop height.',
    apply: p => { p.st.landSpeed *= 1.8; p.st.hop *= 1.6; }, look: L => { L.claws = true; },
  },
  {
    id: 'vulturegut', name: 'CARRION GUT', animal: 'BLACK VULTURE', color: '#5a5a5a',
    desc: 'Rotten meat is a feast. Gibs heal 6% HP each and never spoil.',
    apply: p => { p.st.scavenge += 0.06; p.st.gibLife = 3; }, look: L => { L.mane = '#3a3a3a'; },
  },
  {
    id: 'tarponfin', name: 'DORSAL FIN', animal: 'TARPON', color: '#a9bfc8',
    desc: 'A tall sail cuts the surface. +35% leap height and +15% speed.',
    apply: p => { p.st.leapMul *= 1.35; p.st.speed *= 1.15; }, look: L => { L.fin = '#a9bfc8'; },
  },
  {
    id: 'crabclaw', name: 'CRUSHER JAW', animal: 'BLUE CRAB', color: '#4a80c0',
    desc: 'Bites ignore armor and shatter shells, hulls and bone.',
    apply: p => { p.st.pierce = true; p.st.bite *= 1.1; }, look: L => { L.claws = true; L.horn = true; },
  },
  {
    id: 'skeeter', name: 'HEMATOPHAGY', animal: 'MOSQUITO', color: '#8a4a4a',
    desc: 'Every bite drinks blood. Heal 10% of the damage you deal.',
    apply: p => { p.st.lifesteal += 0.1; }, look: L => { L.spots = '#a03030'; },
  },
  {
    id: 'froglung', name: 'AMPHIBIOUS LUNGS', animal: 'BULLFROG', color: '#5f9e3a',
    desc: 'Hop twice as high on land and regenerate 2% HP a second out of water.',
    apply: p => { p.st.hop *= 2; p.st.landRegen += 0.02; }, look: L => { L.spots = '#7fbf4a'; },
  },
  {
    id: 'garfish', name: 'NEEDLE TEETH', animal: 'FLORIDA GAR', color: '#e0d090',
    desc: 'Long needle teeth. +30% bite damage and prey bleeds out.',
    apply: p => { p.st.bite *= 1.3; p.st.bleed = true; }, look: L => { L.tusks = true; },
  },
  // ---------------- unlockable ----------------
  {
    id: 'snaptongue', name: 'SNAPPING TONGUE', animal: 'ALLIGATOR SNAPPING TURTLE', color: '#ff6a3a',
    desc: 'A worm-like lure on your tongue. Fish swim right into your mouth and are swallowed automatically.',
    unlock: { eat: ['SNAPPING TURTLE', 'ALLIGATOR SNAPPING TURTLE'], need: 100, label: 'CRACK AND EAT 100 SNAPPING TURTLES' },
    apply: p => { p.st.lure = Math.max(p.st.lure, 300); p.st.magnet = 260; p.st.autoEat = true; }, look: L => { L.shell = '#6a5030'; L.frill = '#ff6a3a'; },
  },
  {
    id: 'hullbreak', name: 'HULLBREAKER', animal: 'POACHER BOATS', color: '#e0b050',
    desc: 'Boats are made of matchsticks. Triple damage to hulls and you eat the wreckage.',
    unlock: { ev: 'boat', need: 15, label: 'SINK 15 BOATS' },
    apply: p => { p.st.hullMul = 3; p.st.ironStomach = true; p.st.pierce = true; }, look: L => { L.plates = true; L.horn = true; },
  },
  {
    id: 'wingsnatch', name: 'WINGSNATCHER', animal: 'BIRDS', color: '#f0f0e8',
    desc: 'Breaches slow time and your jaws snap shut on anything airborne. +60% leap.',
    unlock: { eat: ['GREAT BLUE HERON', 'SNOWY EGRET', 'WHITE IBIS', 'MOTTLED DUCK', 'ANHINGA', 'OSPREY', 'ROSEATE SPOONBILL', 'BROWN PELICAN', 'BLACK VULTURE'], need: 60, label: 'EAT 60 BIRDS' },
    apply: p => { p.st.leapMul *= 1.6; p.st.wraith = true; p.st.airGrab = true; }, look: L => { L.fin = '#f0f0e8'; L.mane = '#e8e8e0'; },
  },
  {
    id: 'constrict', name: 'CONSTRICTOR COIL', animal: 'BURMESE PYTHON', color: '#c8a86a',
    desc: 'Nothing escapes your grip. Latched prey cannot break free and death rolls hit twice as hard.',
    unlock: { eat: ['BURMESE PYTHON', 'MOTHER PYTHON'], need: 20, label: 'EAT 20 PYTHONS' },
    apply: p => { p.st.rollDmg *= 2; p.st.rollSpeed *= 1.3; p.st.noEscape = true; p.st.latchMul = Math.max(p.st.latchMul, 3.5); }, look: L => { L.stripe2 = true; L.spots = '#5a3a20'; },
  },
  {
    id: 'bloodscent', name: 'BLOOD SCENT', animal: 'APEX PREDATORS', color: '#ff3020',
    desc: 'You smell blood through the whole swamp. Wounded prey is marked and takes double damage.',
    unlock: { ev: 'kill', need: 400, label: 'KILL 400 CREATURES' },
    apply: p => { p.st.bloodScent = true; p.st.woundMul = 2; }, look: L => { L.glow = '#ff3020'; L.eye = '#ff5030'; },
  },
  {
    id: 'nighteye', name: 'TAPETUM LUCIDUM', animal: 'NOCTURNAL HUNTERS', color: '#a0ffd0',
    desc: 'Your eyes burn in the dark. The night is bright to you and ambushes always crit after sundown.',
    unlock: { ev: 'night', need: 5, label: 'SURVIVE 5 NIGHTS' },
    apply: p => { p.st.nightEyes = true; p.st.ambush = true; }, look: L => { L.glow = '#a0ffd0'; L.eye = '#c0ffe0'; },
  },
  {
    id: 'goliath', name: 'GOLIATH GULLET', animal: 'GOLIATH GROUPER', color: '#8a7a5a',
    desc: 'Swallow anything up to your own size whole, and gain 40% more mass from every meal.',
    unlock: { ev: 'bigmeal', need: 30, label: 'EAT 30 CREATURES OVER 200 LBS' },
    apply: p => { p.st.swallow *= 2; p.st.growth *= 1.4; }, look: L => { L.gills = true; L.frill = '#8a7a5a'; },
  },
  {
    id: 'swarm', name: 'SWARM CALLER', animal: 'BAITFISH', color: '#c4d3dd',
    desc: 'A living bait ball follows you and feeds you. Small fish are drawn in and swallowed on contact.',
    unlock: { eat: ['MINNOW', 'BLUEGILL', 'MULLET', 'TILAPIA'], need: 300, label: 'EAT 300 SMALL FISH' },
    apply: p => { p.st.magnet = Math.max(p.st.magnet, 220); p.st.autoEat = true; p.st.lure = Math.max(p.st.lure, 200); }, look: L => { L.spots = '#c4d3dd'; },
  },
  {
    id: 'electric', name: 'ELECTRIC ORGAN', animal: 'AMERICAN EEL', color: '#60e0ff',
    desc: 'Every sixth bite discharges a shock that stuns and shreds everything nearby.',
    unlock: { eat: ['AMERICAN EEL', 'ELECTRIC EEL'], need: 40, label: 'EAT 40 EELS' },
    apply: p => { p.st.leviathan = true; p.st.shockDmg = (p.st.shockDmg || 1) * 1.4; }, look: L => { L.gills = true; L.glow = '#60e0ff'; },
  },
  {
    id: 'ironshell', name: 'OSTEODERM LATTICE', animal: 'ARMORED PREY', color: '#c9c2a3',
    desc: 'Bone grows through your hide. -35% damage taken, immune to venom, and you digest shells.',
    unlock: { ev: 'crack', need: 150, label: 'CRACK 150 SHELLS AND HULLS' },
    apply: p => { p.st.armor += 0.35; p.st.venomImmune = true; p.st.ironStomach = true; }, look: L => { L.plates = true; L.shell = '#8a846a'; },
  },
  {
    id: 'manhunter', name: 'MAN-EATER', animal: 'HOMO SAPIENS', color: '#d94a4a',
    desc: 'You have learned what people taste like. Humans panic near you and are worth triple.',
    unlock: { eat: ['FISHERMAN', 'TOURIST', 'POACHER', 'KAYAKER', 'AIRBOAT CAPTAIN', 'RANGER'], need: 50, label: 'EAT 50 PEOPLE' },
    apply: p => { p.st.manEater = true; p.st.fearAura = true; }, look: L => { L.scars = true; L.eye = '#ff2010'; L.mane = '#4a1010'; },
  },
  {
    id: 'ancient', name: 'DEINOSUCHUS BLOOD', animal: 'YOUR ANCESTORS', color: '#ffd060',
    desc: 'The old blood wakes. +25% to every stat you have and your bites shake the swamp.',
    unlock: { ev: 'swampgod', need: 1, label: 'REACH SWAMP GOD ONCE' },
    apply: p => { p.st.bite *= 1.25; p.st.speed *= 1.25; p.st.hpMul *= 1.25; p.st.growth *= 1.25; p.st.armor += 0.15; p.st.quake = true; },
    look: L => { L.spikes = 2; L.glow = '#ffd060'; L.plates = true; },
  },
];
const TRAIT_BY_ID = {};
for (const t of ANIMAL_TRAITS) TRAIT_BY_ID[t.id] = t;
function availableTraits(player) {
  return ANIMAL_TRAITS.filter(t => (!t.unlock || Meta.isUnlocked(t.id)) && player.traits.indexOf(t.id) < 0);
}
function applyTrait(player, t) { t.apply(player); player.traits.push(t.id); }
