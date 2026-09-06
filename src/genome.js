'use strict';
// ---------------------------------------------------------------------------
// The gene tree. Everything you eat yields GENE POINTS; you spend them whenever
// you like on a hexagonal tree of six lineages. What you do also builds
// AFFINITY: hunt from ambush and the phantom lineage gets cheaper, crush hulls
// and the armored one does. Specialising far down one lineage unlocks its
// apex gene, which changes how the crocodile plays and looks.
// ---------------------------------------------------------------------------
const LINEAGES = {
  ripper:   { name: 'RIPPER',   color: '#ff5a3a', dark: '#5a1810', icon: 'shark',   tag: 'TEAR THINGS APART', affinity: 'gore' },
  bulwark:  { name: 'BULWARK',  color: '#e0b050', dark: '#4a3a14', icon: 'turtle',  tag: 'NOTHING GETS THROUGH', affinity: 'tank' },
  phantom:  { name: 'PHANTOM',  color: '#60a8ff', dark: '#10244a', icon: 'otter',   tag: 'THEY NEVER SEE YOU', affinity: 'stealth' },
  abyssal:  { name: 'ABYSSAL',  color: '#40f0c8', dark: '#0e3a34', icon: 'eel',     tag: 'SOMETHING OLD AND WET', affinity: 'venom' },
  colossus: { name: 'COLOSSUS', color: '#c88af0', dark: '#3a1a4a', icon: 'manatee', tag: 'GROW WITHOUT END', affinity: 'glut' },
  savage:   { name: 'SAVAGE',   color: '#a0e050', dark: '#2a4a10', icon: 'panther', tag: 'THE SWAMP IS YOURS', affinity: 'land' },
};
const LIN_KEYS = Object.keys(LINEAGES);
// The tree is laid out on a hex grid: ring 0 is the core, ring 1..3 spread out
// along each lineage's axis, with cross-links between neighbouring lineages.
// q,r are axial hex coordinates.
const HEX_DIR = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const GENES = [];
function gene(o) { GENES.push(o); return o; }
(function buildTree() {
  gene({ id: 'core', lin: null, ring: 0, q: 0, r: 0, name: 'PRIMORDIAL CELL', cost: 0, desc: 'Every gene grows from here.', apply: () => {}, root: true });
  const T = {
    ripper: [
      ['serrate', 'SERRATED TEETH', '+35% bite damage, and bites leave prey bleeding.', p => { p.st.bite *= 1.35; p.st.bleed = true; }, L => { L.tusks = true; }, 'Bone-thin skull: -15% max HP.', p => { p.st.hpMul *= 0.85; }, 2],
      ['rollmaster', 'DEATH ROLL MASTER', 'Rolls hit 70% harder and faster. Latch onto prey 3.5x your size.', p => { p.st.rollDmg *= 1.7; p.st.rollSpeed *= 1.4; p.st.latchMul = 3.5; }, L => { L.scars = true; }, 'You commit to the roll: -20% armour.', p => { p.st.armor -= 0.2; }, 3],
      ['frenzy', 'BLOOD FRENZY', 'Kills grant +40% speed and +30% damage for 4s. Heal 8% per kill.', p => { p.st.frenzy = true; p.st.lifesteal += 0.08; }, L => { L.eye = '#ff4a20'; }, 'Burns through you: hunger drains 45% faster.', p => { p.st.hungerRate *= 1.45; }, 4],
      ['apex', 'APEX RIPPER', 'APEX: colossal jaws hit everything in reach, doubled gore, bites shatter armor.', p => { p.st.biteRadius *= 1.5; p.st.multiChomp = true; p.st.goreMul = 2; p.st.pierce = true; p.evo.ripper = true; }, L => { L.glow = '#ff3020'; L.spikes = Math.max(L.spikes || 0, 1); }, 'All jaw, no body: -25% max HP.', p => { p.st.hpMul *= 0.75; }, 6],
    ],
    bulwark: [
      ['hide', 'THICK HIDE', '-25% damage taken, +30% max HP.', p => { p.st.armor += 0.25; p.st.hpMul *= 1.3; }, L => { L.plates = true; }, 'All that plate is heavy: -15% swim speed.', p => { p.st.speed *= 0.85; }, 2],
      ['osteoderm', 'OSTEODERM PLATES', 'Bullets glance off. Immune to knockback and constriction.', p => { p.st.armor += 0.18; p.st.bulletArmor += 0.4; p.st.knockImmune = true; }, L => { L.shell = shade(L.back, 1.2); }, 'Slow to get going: -25% acceleration.', p => { p.st.accel *= 0.75; }, 3],
      ['ironstomach', 'IRON STOMACH', 'Shells, hulls and bone are food. Hunger drains 35% slower.', p => { p.st.ironStomach = true; p.st.hungerRate *= 0.65; }, L => { L.ganoid = true; }, 'Grinding jaws, blunt teeth: -20% bite.', p => { p.st.bite *= 0.8; }, 4],
      ['fortress', 'LIVING FORTRESS', 'APEX: attackers take 40% back, and you cannot be moved by anything.', p => { p.st.reflect += 0.4; p.st.armor += 0.15; p.st.knockImmune = true; p.evo.bulwark = true; }, L => { L.spikes = 2; L.plates = true; }, 'A wall does not chase: -25% speed.', p => { p.st.speed *= 0.75; }, 6],
    ],
    phantom: [
      ['sleek', 'SLEEK BODY', '+25% swim speed and acceleration.', p => { p.st.speed *= 1.25; p.st.accel *= 1.25; }, L => { L.stripes = true; }, 'Nothing spare on the frame: -20% max HP.', p => { p.st.hpMul *= 0.8; }, 2],
      ['ambush', 'AMBUSH', 'Unaware prey take 2.5x. Striking from stillness always crits.', p => { p.st.ambush = true; }, L => { L.pupil = '#3060a0'; }, 'Built for one strike: -20% armour.', p => { p.st.armor -= 0.2; }, 3],
      ['silent', 'SILENT WAKE', 'Prey notice you at half range, and you leave no wake.', p => { p.st.stealth *= 0.5; }, L => { L.spots = '#5a7a9a'; }, 'Soft mouth: -15% bite.', p => { p.st.bite *= 0.85; }, 4],
      ['wraith', 'WRAITH', 'APEX: two dashes, +60% leap, time slows when you breach, afterimages.', p => { p.st.dashCharges += 1; p.st.dashDist *= 1.6; p.st.dashBite = true; p.st.leapMul *= 1.6; p.st.wraith = true; p.evo.phantom = true; }, L => { L.glow = '#c0e8ff'; L.eye = '#ffffff'; }, 'Barely there: -30% max HP.', p => { p.st.hpMul *= 0.7; }, 6],
    ],
    abyssal: [
      ['venom', 'VENOM GLANDS', 'Bites poison: 40% extra damage over 3s, and poisoned prey crawls.', p => { p.st.venom += 0.4; }, L => { L.spots = '#40f0c8'; }, 'Glands where muscle was: -15% bite.', p => { p.st.bite *= 0.85; }, 2],
      ['regen', 'REGENERATION', 'Regenerate 2.5% HP a second while fed.', p => { p.st.regen += 0.025; }, L => { L.gills = true; }, 'Mending costs mass: -20% growth.', p => { p.st.growth *= 0.8; }, 3],
      ['lure', 'BIOLUMINESCENT LURE', 'A glow draws small prey to your mouth.', p => { p.st.lure = 200; p.st.magnet = Math.max(p.st.magnet, 150); }, L => { L.glow = '#40f0c8'; }, 'An ambusher waits: -20% speed.', p => { p.st.speed *= 0.8; }, 4],
      ['leviathan', 'LEVIATHAN', 'APEX: every 6th bite unleashes a shockwave. Toxic blood, immune to venom.', p => { p.st.leviathan = true; p.st.toxicBlood = true; p.st.venomImmune = true; p.evo.abyssal = true; }, L => { L.glow = '#40f0c8'; L.spots = '#80fff0'; L.fin = '#40f0c8'; }, 'Soft between the plates: -25% armour.', p => { p.st.armor -= 0.25; }, 6],
    ],
    colossus: [
      ['gorge', 'GORGE', 'Meals grow you 30% more.', p => { p.st.growth *= 1.3; }, L => { L.belly = mixColor(L.belly, '#f0e8c0', 0.3); }, 'Always hungry: hunger drains 30% faster.', p => { p.st.hungerRate *= 1.3; }, 2],
      ['unhinged', 'UNHINGED JAW', 'Swallow prey up to 90% of your size whole.', p => { p.st.swallow *= 1.8; p.st.hungerRestore *= 1.25; }, L => { L.stripe2 = true; }, 'A loose jaw drags: -15% speed.', p => { p.st.speed *= 0.85; }, 3],
      ['bulk', 'DENSE BULK', '+50% max HP and prey under 60% of your size flees in terror.', p => { p.st.hpMul *= 1.5; p.st.fearAura = true; }, L => { L.paddle = shade(L.mid, 0.8); }, 'Turns like a barge: -25% acceleration, -20% turn.', p => { p.st.accel *= 0.75; p.st.turn *= 0.8; }, 4],
      ['titan', 'TITAN', 'APEX: +40% growth again, bites shake the swamp, and you crush what you ram.', p => { p.st.growth *= 1.4; p.st.quake = true; p.st.bullRush = true; p.st.ramMul *= 1.5; p.evo.colossus = true; }, L => { L.spikes = 2; L.horn = true; }, 'Mass is not momentum: -30% speed.', p => { p.st.speed *= 0.7; }, 6],
    ],
    savage: [
      ['claws', 'RETRACTED CLAWS', '+80% land speed, +60% hop height.', p => { p.st.landSpeed *= 1.8; p.st.hop *= 1.6; }, L => { L.claws = true; }, 'Legs are not fins: -15% swim speed.', p => { p.st.speed *= 0.85; }, 2],
      ['lungs', 'AMPHIBIOUS LUNGS', 'Regenerate on land and hop twice as high.', p => { p.st.hop *= 1.6; p.st.landRegen += 0.02; }, L => { L.frill = '#8fa3b5'; }, 'Air costs blood: -15% max HP.', p => { p.st.hpMul *= 0.85; }, 3],
      ['nighteye', 'TAPETUM LUCIDUM', 'The night is bright to you, and ambushes always crit after dark.', p => { p.st.nightEyes = true; p.st.ambush = true; }, L => { L.glow = '#a0ffd0'; L.eye = '#c0ffe0'; }, 'Daylight blinds you: -15% armour.', p => { p.st.armor -= 0.15; }, 4],
      ['manhunter', 'MAN-EATER', 'APEX: people panic near you, are worth triple, and boats break like sticks.', p => { p.st.manEater = true; p.st.fearAura = true; p.st.hullMul = 3; p.st.airGrab = true; p.evo.savage = true; }, L => { L.scars = true; L.eye = '#ff2010'; L.mane = '#4a1010'; }, 'Lean and reckless: -25% max HP.', p => { p.st.hpMul *= 0.75; }, 6],
    ],
  };
  // Two small adaptations flank every lineage, sitting out on ring 3 between it
  // and its neighbour. They are cheap, low-strain and, crucially, adjacent to
  // BOTH lineages either side of them: the network's lateral roads.
  const MINOR = {
    ripper: [
      ['fangs', 'HOOKED FANGS', '+12% bite, and torn prey drops more meat.', p => { p.st.bite *= 1.12; p.st.goreMul *= 1.2; }, null, '-6% swim speed.', p => { p.st.speed *= 0.94; }],
      ['ragged', 'RAGGED EDGE', 'Wounds keep bleeding for half again as long.', p => { p.st.bleed = true; p.st.woundMul = Math.max(p.st.woundMul, 1.3); }, null, '-8% armour.', p => { p.st.armor -= 0.08; }],
    ],
    bulwark: [
      ['grit', 'DERMAL GRIT', '-8% damage taken.', p => { p.st.armor += 0.08; }, null, '-6% acceleration.', p => { p.st.accel *= 0.94; }],
      ['ballast', 'BALLAST', '+14% max health.', p => { p.st.hpMul *= 1.14; }, null, '-8% swim speed.', p => { p.st.speed *= 0.92; }],
    ],
    phantom: [
      ['finescale', 'FINE SCALES', '+10% swim speed.', p => { p.st.speed *= 1.10; }, null, '-8% max health.', p => { p.st.hpMul *= 0.92; }],
      ['lowwake', 'LOW WAKE', 'Prey notices you 25% later.', p => { p.st.stealth *= 0.75; }, null, '-8% bite.', p => { p.st.bite *= 0.92; }],
    ],
    abyssal: [
      ['gillslit', 'GILL SLITS', 'Regenerate 1% health a second while fed.', p => { p.st.regen += 0.01; }, null, '-8% growth.', p => { p.st.growth *= 0.92; }],
      ['toxinsac', 'TOXIN SAC', 'Bites carry a small dose of venom.', p => { p.st.venom += 0.18; }, null, '-6% bite.', p => { p.st.bite *= 0.94; }],
    ],
    colossus: [
      ['widegullet', 'WIDE GULLET', 'Swallow prey 30% larger whole.', p => { p.st.swallow *= 1.3; }, null, '-6% turn rate.', p => { p.st.turn *= 0.94; }],
      ['fatstore', 'FAT STORES', 'Hunger drains 18% slower.', p => { p.st.hungerRate *= 0.82; }, null, '-8% acceleration.', p => { p.st.accel *= 0.92; }],
    ],
    savage: [
      ['padfeet', 'PADDED FEET', '+35% land speed.', p => { p.st.landSpeed *= 1.35; }, null, '-6% swim speed.', p => { p.st.speed *= 0.94; }],
      ['nightpupil', 'NIGHT PUPIL', 'You see in the dark.', p => { p.st.nightEyes = true; }, L => { L.eye = '#c0ffe0'; }, '-8% armour.', p => { p.st.armor -= 0.08; }],
    ],
  };
  // Ring-2 hybrids, sitting between two neighbouring lineages.
  const HYB = {
    'ripper|bulwark': ['bonecrusher', 'BONE CRUSHER', 'Bites ignore armor and crack shells, hulls and bone. 20% crit.', p => { p.st.pierce = true; p.st.crit += 0.2; }, L => { L.horn = true; }, 'Brittle enamel: -15% max HP.', p => { p.st.hpMul *= 0.85; }, 5],
    'bulwark|phantom': ['keel', 'KEELED SCUTES', '-15% damage taken and +15% speed: armor that swims.', p => { p.st.armor += 0.15; p.st.speed *= 1.15; }, L => { L.denticle = true; }, 'Ridges catch: -15% acceleration.', p => { p.st.accel *= 0.85; }, 5],
    'phantom|abyssal': ['barb', 'CAUDAL BARB', 'Your tail stabs and poisons whatever crowds you.', p => { p.st.barb = 16; p.st.venom += 0.2; }, L => { L.barb = true; }, 'Tail busy stabbing: -12% speed.', p => { p.st.speed *= 0.88; }, 5],
    'abyssal|colossus': ['gullet', 'GOLIATH GULLET', 'Swallow anything your own size, and gain 25% more mass.', p => { p.st.swallow *= 2; p.st.growth *= 1.25; }, L => { L.gills = true; }, 'A full gullet is slow: -18% acceleration.', p => { p.st.accel *= 0.82; }, 5],
    'colossus|savage': ['tusks', 'BOAR TUSKS', 'Dashing gores for 140% bite damage.', p => { p.st.bullRush = true; p.st.ramMul *= 1.4; }, L => { L.tusks = true; }, 'Tusks foul the bite: -12% bite.', p => { p.st.bite *= 0.88; }, 5],
    'savage|ripper': ['scent', 'BLOOD SCENT', 'Wounded prey is marked and takes double damage.', p => { p.st.bloodScent = true; p.st.woundMul = 2; }, L => { L.eye = '#ff5030'; }, 'Nose over armour: -15% armour.', p => { p.st.armor -= 0.15; }, 5],
  };
  // Ring-4 chimeras: the far side of the network, where two lineages fuse into
  // something neither of them would have made on its own.
  const DEEP = {
    'ripper|bulwark': ['siegejaw', 'SIEGE JAW', 'CHIMERA: +30% bite, nothing can be too tough, and you cannot be moved.', p => { p.st.bite *= 1.3; p.st.pierce = true; p.st.hullMul = Math.max(p.st.hullMul, 2.5); p.st.knockImmune = true; }, L => { L.horn = true; L.plates = true; }, 'A siege engine does not chase: -22% speed.', p => { p.st.speed *= 0.78; }],
    'bulwark|phantom': ['mirror', 'MIRROR SCUTE', 'CHIMERA: attackers take 30% back, bullets glance, +20% speed.', p => { p.st.reflect += 0.3; p.st.bulletArmor += 0.35; p.st.speed *= 1.2; }, L => { L.denticle = true; L.glow = '#bfe8ff'; }, 'Mirrors are thin: -18% max HP.', p => { p.st.hpMul *= 0.82; }],
    'phantom|abyssal': ['ghostvenom', 'GHOST VENOM', 'CHIMERA: ambushes inject a killing dose, and venom cannot touch you.', p => { p.st.ambush = true; p.st.venom += 0.6; p.st.venomImmune = true; p.st.stealth *= 0.7; }, L => { L.glow = '#7affda'; L.spots = '#40f0c8'; }, 'Hollow-boned: -22% armour.', p => { p.st.armor -= 0.22; }],
    'abyssal|colossus': ['deepgorge', 'DEEP GORGE', 'CHIMERA: swallow anything, +35% growth, and mend as you feed.', p => { p.st.swallow *= 2.4; p.st.growth *= 1.35; p.st.regen += 0.02; p.st.lifesteal += 0.05; }, L => { L.gills = true; L.paddle = shade(L.mid, 0.8); }, 'A whale is not quick: -25% speed.', p => { p.st.speed *= 0.75; }],
    'colossus|savage': ['stampede', 'STAMPEDE', 'CHIMERA: rams hit triple, footfalls shake the bank, +50% land speed.', p => { p.st.bullRush = true; p.st.ramMul *= 3; p.st.quake = true; p.st.landSpeed *= 1.5; p.st.hop *= 1.4; }, L => { L.tusks = true; L.mane = '#4a3a1a'; }, 'All shoulder, no jaw: -20% bite.', p => { p.st.bite *= 0.8; }],
    'savage|ripper': ['bloodhunt', 'BLOOD HUNT', 'CHIMERA: wounded prey takes 2.5x, and every kill heals 12%.', p => { p.st.bloodScent = true; p.st.woundMul = 2.5; p.st.lifesteal += 0.12; p.st.frenzy = true; }, L => { L.eye = '#ff2010'; L.scars = true; }, 'It burns: hunger drains 40% faster.', p => { p.st.hungerRate *= 1.4; }],
  };
  // hex ring walk: start at dir 4 scaled by N, then N steps along each direction
  const ring = N => { const out = []; let q = HEX_DIR[4][0] * N, r = HEX_DIR[4][1] * N; for (let i = 0; i < 6; i++) for (let j = 0; j < N; j++) { out.push([q, r, i, j]); q += HEX_DIR[i][0]; r += HEX_DIR[i][1]; } return out; };
  // segment i of a ring runs from lineage (i+4)%6 to lineage (i+5)%6
  const segA = i => LIN_KEYS[(i + 4) % 6], segB = i => LIN_KEYS[(i + 5) % 6];
  // ---- lineage spines: one major per ring, out along each lineage's axis
  LIN_KEYS.forEach((lin, li) => {
    const dir = HEX_DIR[li];
    T[lin].forEach((n, i) => {
      const rr = i + 1;
      gene({ id: lin + ':' + n[0], lin, ring: rr, q: dir[0] * rr, r: dir[1] * rr, name: n[1], desc: n[2], apply: n[3], look: n[4], down: n[5], downApply: n[6], load: n[7], cost: [2, 4, 7, 12][i], apex: i === 3 });
    });
  });
  // ---- ring 2: the hybrids, on the edge between two lineages
  for (const [q, r, i, j] of ring(2)) {
    if (j !== 1) continue;
    const h = HYB[segA(i) + '|' + segB(i)]; if (!h) continue;
    gene({ id: 'hy:' + h[0], lin: segA(i), lin2: segB(i), ring: 2, q, r, name: h[1], desc: h[2], apply: h[3], look: h[4], down: h[5], downApply: h[6], load: h[7], cost: 6, hybrid: true });
  }
  // ---- ring 3: two minor adaptations per edge, one owned by each side
  for (const [q, r, i, j] of ring(3)) {
    if (j === 0) continue;
    const lin = j === 1 ? segA(i) : segB(i);
    const m = MINOR[lin] && MINOR[lin][j === 1 ? 0 : 1]; if (!m) continue;
    gene({ id: 'mn:' + m[0], lin, ring: 3, q, r, name: m[1], desc: m[2], apply: m[3], look: m[4], down: m[5], downApply: m[6], load: 1, cost: 3, minor: true });
  }
  // ---- ring 4: the chimeras, halfway between two apexes
  for (const [q, r, i, j] of ring(4)) {
    if (j !== 2) continue;
    const d = DEEP[segA(i) + '|' + segB(i)]; if (!d) continue;
    gene({ id: 'ch:' + d[0], lin: segA(i), lin2: segB(i), ring: 4, q, r, name: d[1], desc: d[2], apply: d[3], look: d[4], down: d[5], downApply: d[6], load: 7, cost: 11, hybrid: true, chimera: true });
  }
})();
const GENE_BY_ID = {};
for (const g of GENES) GENE_BY_ID[g.id] = g;
// hex neighbours, for the "must be adjacent to something you own" rule
function hexNbrs(g) { return GENES.filter(o => HEX_DIR.some(d => o.q === g.q + d[0] && o.r === g.r + d[1])); }
const Genome = {
  // pixel position of a hex cell
  pos(g, cx, cy, R) { return [cx + R * 1.5 * g.q, cy + R * 1.732 * (g.r + g.q / 2)]; },
  owned(P) { return P.genes; },
  has(P, id) { return P.genes.indexOf(id) >= 0; },
  // a gene can be taken when it touches one you already have
  unlocked(P, g) {
    if (g.root) return false;
    if (this.has(P, g.id)) return false;
    if (this.has(P, 'core') === false) return false;
    // one apex per crocodile: the four ends of the tree are exclusive
    if (g.apex && P.apex) return false;
    return hexNbrs(g).some(n => this.has(P, n.id));
  },
  // how many separate lineages the build has already opened
  spread(P) { const set = {}; for (const id of P.genes) { const g = GENE_BY_ID[id]; if (g && g.lin) set[g.lin] = 1; if (g && g.lin2) set[g.lin2] = 1; } return Object.keys(set).length; },
  // Cost has three parts: the gene's own price, an affinity discount for
  // playing to that lineage, and a splice tax for every OTHER lineage already
  // in you. Scattering across the tree is the expensive way to build.
  tax(P, g) {
    const open = this.spread(P);
    const mine = (g.lin && this.depth(P, g.lin) > 0) ? 1 : 0;
    return 1 + 0.2 * Math.max(0, open - mine);
  },
  cost(P, g) {
    const a = g.lin ? (P.affinity[LINEAGES[g.lin].affinity] || 0) : 0;
    const disc = clamp(a / 60, 0, 0.5);
    return Math.max(1, Math.round(g.cost * (1 - disc) * this.tax(P, g)));
  },
  affinityPct(P, lin) { return clamp((P.affinity[LINEAGES[lin].affinity] || 0) / 60, 0, 1); },
  buy(P, g) {
    if (!this.unlocked(P, g)) return false;
    const c = this.cost(P, g);
    if (P.genePoints < c) return false;
    P.genePoints -= c; P.genes.push(g.id); P.geneSpent += c;
    g.apply(P);
    if (g.downApply) g.downApply(P);
    if (g.apex) { P.apex = g.lin; Meta.event('apex'); }
    P.recomputeStats(); P.rebuildLook();
    return true;
  },
  // total instability from everything spliced in
  load(P) { let n = 0; for (const id of P.genes) { const g = GENE_BY_ID[id]; if (g && g.load) n += g.load; } return n; },
  // what the body can carry: it grows with you, so late genes need late mass
  limit(P) { return 9 + P.tier * 2.2 + (P.strainBonus || 0); },
  // 0 while stable, rising past 1 once the genome is over its limit
  strain(P) { const l = this.limit(P); return l <= 0 ? 0 : Math.max(0, (this.load(P) - l) / Math.max(4, l * 0.5)); },
  // how far down each lineage the player has gone
  depth(P, lin) { let d = 0; for (const id of P.genes) { const g = GENE_BY_ID[id]; if (g && g.lin === lin && !g.hybrid && !g.minor) d = Math.max(d, g.ring); } return d; },
  // Gene points from a meal. Deliberately scarce: a run should fund maybe two
  // lineages, not the whole tree. Minnows feed you, they do not evolve you —
  // only prey that is a real share of your own mass, a threat, a person or a
  // boss counts, and eating a species for the first time pays a discovery bonus.
  pointsFor(e, P) {
    const mine = Math.max(1, P ? P.mass : 1), rel = e.mass / mine;
    let p = 0;
    if (e.isBoss) p = 10;
    else if (e.threat) p = rel >= 0.16 ? 3 : 1;
    else if (e.human) p = 2;
    else if (rel >= 0.22) p = rel >= 0.6 ? 2 : 1;
    // first of a kind this run pays a discovery bonus, but only for prey worth
    // studying: a new species of minnow teaches you nothing
    if (P && e.spec && e.spec.id && e.mass >= 10) {
      P.seen = P.seen || new Set();
      if (!P.seen.has(e.spec.id)) { P.seen.add(e.spec.id); p += 1; }
    }
    return p;
  },
};
// playstyle affinity: what you do decides which lineages come cheap
const Affinity = {
  add(P, key, n) { P.affinity[key] = (P.affinity[key] || 0) + n; },
  // called from combat and movement
  onKill(P, e, how) {
    if (how === 'roll' || (e.dismembered || 0) > 0) this.add(P, 'gore', 2);
    if (how === 'ambush') this.add(P, 'stealth', 3);
    if (e.human || e.type === 'boat' || e.type === 'structure') this.add(P, 'land', 2.5);
    if (e.type === 'land' || e.type === 'bird') this.add(P, 'land', 1.5);
    if (e.mass >= 60) this.add(P, 'glut', 2);
    if (P.st.venom && e.poison > 0) this.add(P, 'venom', 2);
    if (e.armor > 0 || e.type === 'turtle') this.add(P, 'tank', 2);
  },
  onHurtTaken(P, dmg) { this.add(P, 'tank', clamp(dmg * 0.05, 0, 1.5)); },
  onEat(P, e) { this.add(P, 'glut', clamp(e.mass * 0.02, 0.1, 2)); },
};
