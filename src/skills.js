'use strict';
// Evolution paths and skill nodes. Each node's apply() mutates player.st (stats) or flags.
const PATHS = {
  ripper: {
    name: 'RIPPER', color: '#ff4a2a', dark: '#5a1810', tag: 'TEAR. ROLL. FEAST.',
    nodes: [
      { name: 'SERRATED TEETH', desc: '+35% bite damage. Bites leave prey bleeding out.', apply: p => { p.st.bite *= 1.35; p.st.bleed = true; } },
      { name: 'DEATH ROLL MASTER', desc: 'Death rolls hit +70% harder and faster. Latch onto prey up to 3.5x your size.', apply: p => { p.st.rollDmg *= 1.7; p.st.rollSpeed *= 1.4; p.st.latchMul = 3.5; } },
      { name: 'BLOOD FRENZY', desc: 'Kills grant +40% speed and +30% damage for 4s. Heal 8% HP per kill.', apply: p => { p.st.frenzy = true; p.st.lifesteal += 0.08; } },
      { name: 'BONE CRUSHER', desc: 'Bites ignore armor and shatter shells and hulls. 25% chance to crit for 3x.', apply: p => { p.st.pierce = true; p.st.crit += 0.25; } },
      { name: 'APEX RIPPER', evo: true, desc: 'EVOLUTION: colossal jaws. +50% bite radius, bites hit everything in reach. Double gore.', apply: p => { p.st.biteRadius *= 1.5; p.st.multiChomp = true; p.st.goreMul = 2; p.evo.ripper = true; } },
    ],
  },
  behemoth: {
    name: 'BEHEMOTH', color: '#e0b050', dark: '#4a3a14', tag: 'UNSTOPPABLE MASS.',
    nodes: [
      { name: 'THICK HIDE', desc: '-25% damage taken. +30% max HP.', apply: p => { p.st.armor += 0.25; p.st.hpMul *= 1.3; } },
      { name: 'OSTEODERM PLATES', desc: 'Bullets and bites deal -35% more. Immune to knockback and constriction.', apply: p => { p.st.armor += 0.2; p.st.bulletArmor += 0.35; p.st.knockImmune = true; } },
      { name: 'IRON STOMACH', desc: 'Everything is food: shells, hulls, bones. Hunger drains 35% slower.', apply: p => { p.st.ironStomach = true; p.st.hungerRate *= 0.65; } },
      { name: 'BULL RUSH', desc: 'Dash becomes a ramming charge that crushes and scatters everything in your path. -30% dash cooldown.', apply: p => { p.st.bullRush = true; p.st.dashCd *= 0.7; } },
      { name: 'TITAN', evo: true, desc: 'EVOLUTION: meals grow you 40% more. Max HP x1.5. Anything under 60% of your size flees in terror.', apply: p => { p.st.growth *= 1.4; p.st.hpMul *= 1.5; p.st.fearAura = true; p.evo.behemoth = true; } },
    ],
  },
  phantom: {
    name: 'PHANTOM', color: '#60a8ff', dark: '#10244a', tag: 'THEY NEVER SEE YOU.',
    nodes: [
      { name: 'SLEEK BODY', desc: '+25% swim speed, +25% acceleration.', apply: p => { p.st.speed *= 1.25; p.st.accel *= 1.25; } },
      { name: 'AMBUSH', desc: 'Unaware prey take 2.5x damage. Striking from stillness always crits.', apply: p => { p.st.ambush = true; } },
      { name: 'SILENT WAKE', desc: 'Prey detect you at half range. Birds barely notice you.', apply: p => { p.st.stealth *= 0.5; } },
      { name: 'SHADOW DASH', desc: 'Two dash charges, +60% dash distance. Dashing through prey bites them.', apply: p => { p.st.dashCharges += 1; p.st.dashDist *= 1.6; p.st.dashBite = true; } },
      { name: 'WRAITH', evo: true, desc: 'EVOLUTION: leaps go 60% higher and time slows when you breach. You leave afterimages.', apply: p => { p.st.leapMul *= 1.6; p.st.wraith = true; p.evo.phantom = true; } },
    ],
  },
  abyssal: {
    name: 'ABYSSAL', color: '#40f0c8', dark: '#0e3a34', tag: 'SOMETHING ANCIENT STIRS.',
    nodes: [
      { name: 'VENOM GLANDS', desc: 'Bites poison prey: 40% extra damage over 3s, poisoned prey slow to a crawl.', apply: p => { p.st.venom += 0.4; } },
      { name: 'REGENERATION', desc: 'Regenerate 2.5% HP per second while not starving.', apply: p => { p.st.regen += 0.025; } },
      { name: 'LURE', desc: 'A bioluminescent glow draws small prey toward you.', apply: p => { p.st.lure = 160; } },
      { name: 'TOXIC BLOOD', desc: 'Getting hurt releases a toxic cloud that poisons attackers. Immune to venom.', apply: p => { p.st.toxicBlood = true; p.st.venomImmune = true; } },
      { name: 'LEVIATHAN', evo: true, desc: 'EVOLUTION: every 6th bite unleashes a shockwave that shreds everything nearby. +30% hunger from meals.', apply: p => { p.st.leviathan = true; p.st.hungerRestore *= 1.3; p.evo.abyssal = true; } },
    ],
  },
};
const PATH_KEYS = ['ripper', 'behemoth', 'phantom', 'abyssal'];
// filler mutations once paths run out
const MUTATIONS = [
  { name: 'DENSE BONES', desc: '+20% max HP.', apply: p => { p.st.hpMul *= 1.2; } },
  { name: 'TWITCH MUSCLE', desc: '+12% speed.', apply: p => { p.st.speed *= 1.12; } },
  { name: 'JAW STRENGTH', desc: '+15% bite damage.', apply: p => { p.st.bite *= 1.15; } },
  { name: 'SLOW METABOLISM', desc: 'Hunger drains 20% slower.', apply: p => { p.st.hungerRate *= 0.8; } },
  { name: 'GORGE', desc: 'Meals grow you 15% more.', apply: p => { p.st.growth *= 1.15; } },
  { name: 'SCAR TISSUE', desc: '-10% damage taken.', apply: p => { p.st.armor += 0.1; } },
  { name: 'QUICK RECOVERY', desc: '-25% dash cooldown.', apply: p => { p.st.dashCd *= 0.75; } },
];
// pick n cards for the shed screen: a mix of path nodes and animal traits
function rollCards(player, n = 3) {
  const pool = [];
  for (const k of PATH_KEYS) {
    const tier = player.skills[k];
    if (tier < 5) pool.push({ kind: 'path', path: k, tier, node: PATHS[k].nodes[tier], w: tier > 0 ? 2.4 : 1.1 });
  }
  for (const t of availableTraits(player)) pool.push({ kind: 'trait', trait: t, node: { name: t.name, desc: t.desc }, w: t.unlock ? 2.6 : 1.5 });
  const picks = [], bag = pool.slice();
  const drawFrom = list => {
    let tot = list.reduce((s, c) => s + c.w, 0), r = Math.random() * tot;
    for (let i = 0; i < list.length; i++) { r -= list[i].w; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  };
  const take = c => { picks.push(c); bag.splice(bag.indexOf(c), 1); };
  const paths = bag.filter(c => c.kind === 'path'), traits = bag.filter(c => c.kind === 'trait');
  if (n >= 2 && paths.length && traits.length) { take(drawFrom(paths)); take(drawFrom(traits)); }
  while (picks.length < n && bag.length) take(drawFrom(bag));
  const used = new Set(picks.map(c => c.node.name));
  let guard = 0;
  while (picks.length < n && guard++ < 40) {
    const m = choice(MUTATIONS); if (used.has(m.name)) continue;
    used.add(m.name); picks.push({ kind: 'mut', node: m, w: 1 });
  }
  for (let i = picks.length - 1; i > 0; i--) { const j = randi(0, i); const t = picks[i]; picks[i] = picks[j]; picks[j] = t; }
  return picks;
}
function applyCard(player, card) {
  if (card.kind === 'trait') applyTrait(player, card.trait);
  else {
    card.node.apply(player);
    if (card.kind === 'path') { player.skills[card.path]++; player.picked.push(card.path + ':' + card.tier); }
    else player.picked.push('mut:' + card.node.name);
  }
  player.recomputeStats();
  player.rebuildLook();
}
// dominant path drives the croc palette; animal traits layer features on top
function computeLook(player) {
  const sk = player.skills, entries = PATH_KEYS.map(k => [k, sk[k]]).sort((a, b) => b[1] - a[1]);
  const [k1, t1] = entries[0], [k2, t2] = entries[1];
  const total = t1 + t2;
  let L;
  if (t1 === 0) L = Object.assign({}, CROC_LOOKS.base);
  else {
    const primary = mixLook(CROC_LOOKS.base, CROC_LOOKS[k1], clamp(0.35 + t1 * 0.16, 0, 1));
    L = t2 > 0 ? mixLook(primary, CROC_LOOKS[k2], t2 / (total * 2)) : primary;
  }
  if (sk.ripper >= 2) L.scars = true;
  if (sk.ripper >= 4) L.spikes = Math.max(L.spikes || 0, 1);
  if (sk.behemoth >= 2) L.plates = true;
  if (sk.behemoth >= 4) L.spikes = 2;
  if (sk.phantom >= 2) L.stripes = true;
  if (sk.phantom >= 3) L.pupil = '#3060a0';
  if (sk.abyssal >= 2) L.spots = '#40f0c8';
  if (player.evo.ripper) { L.glow = '#ff3020'; L.spikes = Math.max(L.spikes || 0, 1); }
  if (player.evo.behemoth) { L.spikes = 2; L.plates = true; }
  if (player.evo.phantom) { L.glow = '#c0e8ff'; L.eye = '#ffffff'; }
  if (player.evo.abyssal) { L.glow = '#40f0c8'; L.spots = '#80fff0'; }
  for (const id of player.traits) { const t = TRAIT_BY_ID[id]; if (t && t.look) t.look(L); }
  // spliced genes change the animal, not just the numbers: tusks, plates,
  // stripes, glow. Without this the gene tree was invisible on the body.
  for (const id of player.genes || []) { const g = GENE_BY_ID[id]; if (g && g.look) g.look(L); }
  // the morph picked in the loadout is cosmetic and applied last
  const hide = typeof HIDE_BY_ID !== 'undefined' && HIDE_BY_ID[player.hide];
  if (hide && hide.apply) hide.apply(L);
  return L;
}
// size tiers (croc size units). Reaching a new tier triggers a shed.
const TIERS = [
  { name: 'HATCHLING', size: 1.0 }, { name: 'JUVENILE', size: 1.35 }, { name: 'SUB-ADULT', size: 1.8 }, { name: 'ADULT', size: 2.4 },
  { name: 'BULL', size: 3.1 }, { name: 'ELDER', size: 4.0 }, { name: 'ANCIENT', size: 5.2 }, { name: 'TITAN', size: 6.7 },
  { name: 'LEVIATHAN', size: 8.6 }, { name: 'SARCOSUCHUS', size: 11 }, { name: 'DEINOSUCHUS', size: 14 }, { name: 'SWAMP GOD', size: 18 },
];
const massToSize = m => Math.cbrt(1 + m / 15);
const sizeToMass = s => (s * s * s - 1) * 15;
function tierFor(size) { let t = 0; for (let i = 0; i < TIERS.length; i++) if (size >= TIERS[i].size - 1e-6) t = i; return t; }
