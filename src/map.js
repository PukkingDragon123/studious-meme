'use strict';
// ---------------------------------------------------------------------------
// The map is authored, not random. A profile of control points defines the
// shore and channel of one long swamp, split into named biomes that each carry
// their own palette, plants, animals and human activity.
// ---------------------------------------------------------------------------
// Control points: [x, floorY]. Negative floorY is dry land, positive is depth.
const MAP_PROFILE = [
  // containment lab: a dry concrete floor with the tank at the west end
  [-3000, -60], [-2700, -60], [-2500, -60], [-2380, -58], [-2300, -56],
  // sewer tunnel: a shallow flooded run east toward daylight
  [-2240, 26], [-2100, 34], [-1900, 30], [-1700, 40], [-1500, 34], [-1300, 44], [-1100, 36],
  [-900, 46], [-700, 38], [-520, 48], [-360, 40], [-240, 46], [-150, 44],
  // the outfall grate opens into the canal
  [-60, 60], [0, 46],
  // outfall canal: straight concrete channel with steep banks
  [90, 120], [220, 150], [380, 145], [520, 165], [660, 150], [800, 120], [900, 70], [980, -26], [1060, -44],
  [1150, -30], [1240, 40], [1330, 96], [1420, 74],
  // mangrove tangle: shallow braided water with root islands
  [1520, 60], [1600, -18], [1660, -26], [1730, 54], [1840, 86], [1950, 70], [2060, -20], [2120, -30],
  [2200, 62], [2320, 104], [2450, 92], [2560, 40], [2660, -30], [2730, -48], [2800, -40],
  // fish camp: a town bank on the left, a working channel on the right
  [2880, -52], [2990, -58], [3100, -50], [3180, 30], [3280, 150], [3420, 210], [3560, 205], [3700, 160],
  [3820, 60], [3900, -40], [3990, -56], [4090, -48], [4180, 40],
  // cypress swamp: dark, deep pockets between wooded hummocks
  [4300, 190], [4420, 250], [4540, 210], [4640, 60], [4720, -40], [4790, -52], [4870, 30],
  [4980, 230], [5120, 300], [5260, 260], [5380, 120], [5470, -30], [5550, -44], [5640, 60],
  [5760, 240], [5880, 210], [5960, 90], [6040, -20],
  // sawgrass prairie: broad shallow sheet flow, low islands
  [6140, 40], [6260, 66], [6380, 52], [6480, -16], [6540, -24], [6620, 46], [6760, 72], [6900, 58],
  [7020, -18], [7080, -26], [7160, 44], [7300, 70], [7440, 84], [7560, 60],
  // deep river: a fast cut channel with undercut banks
  [7680, 210], [7820, 420], [7980, 520], [8160, 560], [8340, 540], [8520, 470], [8680, 380],
  [8820, 260], [8940, 130], [9040, -30], [9120, -60], [9220, -50], [9320, 60],
  // campground: gentle beach shelving into a bay
  [9440, 90], [9560, 60], [9660, -34], [9760, -58], [9880, -60], [9990, -40], [10090, 40],
  [10200, 120], [10340, 160], [10480, 140], [10600, 80], [10700, -20], [10780, -44], [10880, -30],
  // open bay: wide deep water, the far shore is a rumour
  [11000, 140], [11180, 330], [11380, 520], [11600, 660], [11840, 720], [12080, 700], [12320, 640],
  [12560, 600], [12800, 640], [13040, 700], [13300, 740], [13560, 700], [13800, 660],
  [14060, 620], [14320, 600], [14600, 640], [14900, 700], [15200, 720],
  // the shipping channel deepens toward the city, then the seawall: a dredged
  // harbour with a hard concrete lip you can haul out onto
  [15500, 780], [15800, 840], [16100, 880], [16400, 860], [16700, 800],
  [17000, 700], [17250, 520], [17450, 300], [17600, 90], [17700, -70],
  [17900, -96], [18200, -100], [18600, -98], [19000, -100],
];
const MapData = {
  x0: MAP_PROFILE[0][0], x1: MAP_PROFILE[MAP_PROFILE.length - 1][0],
  // smooth interpolation between control points, plus fine noise for texture
  floorY(x) {
    const P = MAP_PROFILE;
    if (x <= P[0][0]) return P[0][1];
    if (x >= P[P.length - 1][0]) { const last = P[P.length - 1][1]; return last + Math.sin(x * 0.004) * 40 + vnoise(x * 0.01, 5) * 30; }
    let lo = 0, hi = P.length - 1;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (P[m][0] <= x) lo = m; else hi = m; }
    const a = P[lo], b = P[lo + 1], t = (x - a[0]) / (b[0] - a[0]);
    const base = lerp(a[1], b[1], t * t * (3 - 2 * t));
    const wob = vnoise(x * 0.045, 11) * 6 - 3 + vnoise(x * 0.012, 3) * 10 - 5;
    return base + wob * (Math.abs(base) > 8 ? 1 : 0.35);
  },
};
// ---------------------------------------------------------------------------
// Biomes
// ---------------------------------------------------------------------------
const BIOMES = [
  {
    id: 'lab', name: 'CONTAINMENT', x0: -3200, x1: -2260,
    sky: ['#0a1418', '#16242a'], water: ['#5aa060', '#2e6438', '#123018'], scum: '#6a9a4a', fog: '#1a2a30',
    parallax: ['block', 'block', 'block'], ground: ['#3a4448', '#2a3236', '#1a2024'], grass: '#3a4448',
    indoor: true, roof: -150, dark: 0.55,
    plants: [['rubble', 1.2], ['pipe', 1.4], ['crate', 1]],
    fish: [], land: [['rat', 3]], structures: [],
    music: 0.9,
  },
  {
    id: 'sewer', name: 'STORM SEWER', x0: -2260, x1: -120,
    sky: ['#0d1a1c', '#1a2a2c'], water: ['#4a7a5a', '#26482e', '#0c1a12'], scum: '#5a7a3a', fog: '#1c2c2e',
    parallax: ['block', 'pipe', 'block'], ground: ['#41474a', '#31373a', '#22282a'], grass: '#3f5a3a',
    indoor: true, roof: -120, dark: 0.45,
    plants: [['trash', 2], ['rubble', 1.6], ['algae', 1.6], ['pipe', 1.2], ['weed', 1]],
    fish: [['minnow', 3], ['walkingcat', 2], ['shiner', 2]],
    land: [['rat', 6], ['opossum', 1]],
    structures: [],
    music: 0.6,
  },
  {
    id: 'outfall', name: 'THE OUTFALL', x0: -120, x1: 1100,
    sky: ['#4a5a6a', '#8a94a0'], water: ['#4a6a5a', '#2a4438', '#0e1c18'], scum: '#5a6a3a', fog: '#7a8490',
    parallax: ['pipe', 'block', 'pipe'], ground: ['#4a4a44', '#3a3a36', '#2a2a26'], grass: '#6a7a4a',
    plants: [['trash', 1.6], ['reed', 1.2], ['weed', 1.4], ['algae', 1.5], ['pipe', 0.7], ['bush', 0.5], ['rubble', 1.4]],
    fish: [['minnow', 4], ['shiner', 3], ['tilapia', 3], ['walkingcat', 2.5], ['snakehead', 1.6], ['bluegill', 2]],
    land: [['rat', 5], ['raccoon', 2], ['opossum', 1.5]],
    structures: [['sign', 1], ['pipe', 1.5]],
    music: 0.2,
  },
  {
    id: 'mangrove', name: 'MANGROVE TANGLE', x0: 1100, x1: 2800,
    sky: ['#4d8fd0', '#cfe6f2'], water: ['#3a9a86', '#1e5c50', '#08201d'], scum: '#6a8a4a', fog: '#bfe0e6',
    parallax: ['mangrove', 'palm', 'mangrove'], ground: ['#5a4a34', '#463726', '#32281a'], grass: '#4f8a3a',
    plants: [['mangrove', 2.4], ['root', 2], ['weed', 1.4], ['oyster', 1.2], ['reed', 1], ['duckweed', 1], ['palm', 0.6], ['fern', 0.8]],
    fish: [['snapper', 3], ['sheepshead', 2], ['mullet', 3], ['snook', 2], ['redfish', 1.6], ['ladyfish', 1.4], ['minnow', 2]],
    land: [['raccoon', 3], ['iguana', 2], ['rabbit', 1.5], ['fox', 1]],
    structures: [['crabtrap', 2], ['buoy', 1], ['dock', 0.8]],
    music: 0.4,
  },
  {
    id: 'camp', name: 'GATOR JOE’S FISH CAMP', x0: 2800, x1: 4200,
    sky: ['#4f9fe0', '#e8dcc0'], water: ['#3a8a80', '#20564e', '#0a1e1c'], scum: '#7a8a4a', fog: '#d8e0d0',
    parallax: ['shack', 'palm', 'oak'], ground: ['#6a5a3a', '#4a3e28', '#332a1c'], grass: '#6a9a3a',
    plants: [['palm', 1.4], ['bush', 1.4], ['flower', 1], ['crate', 1.2], ['reed', 0.8], ['lily', 0.6], ['post', 1.2]],
    fish: [['bluegill', 3], ['bass', 2.5], ['catfish', 2], ['mullet', 2], ['tilapia', 2], ['flgar', 1.4]],
    land: [['dog', 2], ['raccoon', 2], ['rabbit', 1]],
    structures: [['shop', 2.4], ['dock', 2.4], ['stilthouse', 1.6], ['boatramp', 1.4], ['sign', 1]],
    town: true, music: 0.5,
  },
  {
    id: 'cypress', name: 'CYPRESS SWAMP', x0: 4200, x1: 6100,
    sky: ['#3a7ab0', '#a8c0b8'], water: ['#2f6a58', '#173f36', '#050f0e'], scum: '#4a6a3a', fog: '#9ab0a8',
    parallax: ['cypress', 'cypress', 'oak'], ground: ['#3f3424', '#2e2618', '#1e1810'], grass: '#3f6a22',
    plants: [['cypress', 2.6], ['knee', 2], ['moss', 1.6], ['fern', 1.4], ['vine', 1.2], ['weed', 1.4], ['lily', 1.2], ['mushroom', 0.8], ['log', 1]],
    fish: [['bowfin', 2.4], ['flgar', 2.2], ['gar', 1.6], ['catfish', 2], ['bluegill', 2], ['eel', 1.4]],
    land: [['panther', 1.2], ['bear', 0.9], ['boar', 1.6], ['deer', 2], ['opossum', 1.4], ['bobcat', 1.2]],
    structures: [['tower', 1], ['sign', 0.6]],
    dark: 0.18, music: 0.8,
  },
  {
    id: 'prairie', name: 'SAWGRASS PRAIRIE', x0: 6100, x1: 7600,
    sky: ['#5aaee8', '#f0e4c0'], water: ['#4aa88e', '#2a6a58', '#123028'], scum: '#8a9a4a', fog: '#e0e8c8',
    parallax: ['sawgrass', 'palm', 'hammock'], ground: ['#6a6a3a', '#4e4e28', '#35351c'], grass: '#8aae3f',
    plants: [['sawgrass', 3.2], ['cattail', 2.4], ['lily', 1.6], ['duckweed', 1.4], ['hyacinth', 1.2], ['flower', 1.2], ['reed', 1.4]],
    fish: [['minnow', 3], ['sunfish', 2.6], ['bluegill', 2.4], ['mullet', 2], ['peacock', 1.6], ['tilapia', 2]],
    land: [['deer', 2.4], ['doe', 2], ['rabbit', 2], ['coyote', 1.4], ['armadillo', 1.6]],
    structures: [['buoy', 0.8], ['tower', 0.8]],
    music: 0.4,
  },
  {
    id: 'river', name: 'THE DEEP CUT', x0: 7600, x1: 9400,
    sky: ['#3a86c8', '#c8dce8'], water: ['#2a7a86', '#154a56', '#04161c'], scum: '#5a7a5a', fog: '#b0c8d0',
    parallax: ['cypress', 'oak', 'bluff'], ground: ['#4a4438', '#363126', '#221f18'], grass: '#4a7a30',
    plants: [['weed', 2], ['algae', 2], ['sunkbranch', 1.6], ['shellbed', 1.4], ['root', 1.2], ['rock', 1.4], ['bush', 0.8]],
    fish: [['tarpon', 2.2], ['snook', 2], ['gar', 1.8], ['catfish', 2], ['eel', 1.6], ['shark', 1.2], ['bonnet', 1.4], ['redfish', 1.6]],
    land: [['otter', 1.6], ['coyote', 1.2], ['deer', 1.2]],
    structures: [['buoy', 1.6], ['dock', 0.8], ['tower', 0.8]],
    music: 0.9,
  },
  {
    id: 'campground', name: 'PARADISE CAMPGROUND', x0: 9400, x1: 11000,
    sky: ['#4f9fe0', '#f4e0b0'], water: ['#3a9a8a', '#1f5e52', '#0a201d'], scum: '#7a8a4a', fog: '#e0e0c8',
    parallax: ['tent', 'palm', 'oak'], ground: ['#7a6a48', '#5a4e32', '#3e3622'], grass: '#7aa83f',
    plants: [['palm', 1.6], ['bush', 1.6], ['flower', 1.4], ['sawgrass', 1.2], ['cooler', 1], ['firewood', 1.2], ['lily', 0.8]],
    fish: [['bluegill', 3], ['bass', 2.4], ['mullet', 2], ['sunfish', 2], ['snook', 1.4]],
    land: [['dog', 1.6], ['raccoon', 2.4], ['deer', 1.6], ['bear', 1]],
    structures: [['campsite', 2.6], ['dock', 1.2], ['boatramp', 1], ['sign', 0.8]],
    town: true, music: 0.5,
  },
  {
    id: 'bay', name: 'FLORIDA BAY', x0: 11000, x1: 15300,
    sky: ['#2f86d8', '#d8ecf4'], water: ['#2aa0b0', '#0f6474', '#03202c'], scum: '#4a8a7a', fog: '#c8e4ee',
    parallax: ['mangrove', 'island', 'island'], ground: ['#7a7460', '#5a5648', '#3a3830'], grass: '#5a8a4a',
    plants: [['seagrass', 2.6], ['shellbed', 2], ['coral', 1.4], ['algae', 1.6], ['rock', 1.4], ['sunkbranch', 1]],
    fish: [['tarpon', 2], ['shark', 1.8], ['sawfish', 1.4], ['grouper', 1.4], ['dolphin', 1.4], ['manatee', 1.4], ['redfish', 1.8], ['bonnet', 1.6]],
    land: [['otter', 1]],
    structures: [['buoy', 2], ['crabtrap', 1.4], ['stilthouse', 1]],
    music: 1,
  },
  {
    // Endgame. A dredged harbour under a city that has finally noticed you.
    id: 'seawall', name: 'THE SEAWALL', x0: 15300, x1: 99999,
    sky: ['#141c34', '#40506e'], water: ['#1d5c74', '#0c3346', '#02121c'], scum: '#3a5a5a', fog: '#5a6a86',
    parallax: ['tower', 'block', 'tower'], ground: ['#5e6068', '#43454c', '#2a2c32'], grass: '#4a5a4a',
    plants: [['rubble', 2.2], ['rock', 1.6], ['trash', 1.8], ['pipe', 1.4], ['algae', 1.2], ['shellbed', 1]],
    fish: [['shark', 2.2], ['tarpon', 1.6], ['sawfish', 1.6], ['grouper', 1.4], ['dolphin', 1], ['bonnet', 1.4]],
    land: [['ranger', 2], ['poacher', 2]],
    structures: [['seawall', 3], ['sign', 0.6]],
    town: true, kaiju: true, music: 1.2,
  },
];
const Biome = {
  list: BIOMES,
  at(x) { for (const b of BIOMES) if (x >= b.x0 && x < b.x1) return b; return x < BIOMES[0].x0 ? BIOMES[0] : BIOMES[BIOMES.length - 1]; },
  // smooth blend factor toward the next biome, for palette crossfades
  blend(x) {
    const b = this.at(x), FADE = 260;
    if (x > b.x1 - FADE) { const n = this.at(b.x1 + 1); return [b, n, (x - (b.x1 - FADE)) / FADE]; }
    if (x < b.x0 + FADE) { const p = this.at(b.x0 - 1); return [b, p, (b.x0 + FADE - x) / FADE * 0.5]; }
    return [b, b, 0];
  },
  mixPal(x) {
    const [a, b, t] = this.blend(x);
    if (t <= 0) return a;
    return {
      id: a.id, name: a.name, town: a.town, dark: lerp(a.dark || 0, b.dark || 0, t), music: lerp(a.music || 0, b.music || 0, t),
      sky: [mixColor(a.sky[0], b.sky[0], t), mixColor(a.sky[1], b.sky[1], t)],
      water: [mixColor(a.water[0], b.water[0], t), mixColor(a.water[1], b.water[1], t), mixColor(a.water[2], b.water[2], t)],
      scum: mixColor(a.scum, b.scum, t), fog: mixColor(a.fog, b.fog, t), grass: mixColor(a.grass, b.grass, t),
      ground: [mixColor(a.ground[0], b.ground[0], t), mixColor(a.ground[1], b.ground[1], t), mixColor(a.ground[2], b.ground[2], t)],
      parallax: t > 0.5 ? b.parallax : a.parallax, plants: a.plants, fish: a.fish, land: a.land, structures: a.structures,
    };
  },
  // decor for one strip of ground, chosen from the biome's plant table
  decorAt(x, rng, out) {
    const B = this.at(x), fy = MapData.floorY(x), land = fy < 0, depth = fy;
    const table = B.plants.filter(([k]) => {
      const w = PLANT_RULES[k]; if (!w) return false;
      return w.land === undefined || w.land === land ? (w.minD === undefined || depth >= w.minD) && (w.maxD === undefined || depth <= w.maxD) : false;
    });
    if (!table.length) return;
    let tot = 0; for (const e of table) tot += e[1];
    if (rng() > Math.min(0.97, tot * 0.28)) return;
    let r = rng() * tot;
    for (const e of table) { r -= e[1]; if (r <= 0) { PLANT_RULES[e[0]].make(out, x + rng() * 10, fy, rng, B); return; } }
  },
};
// how each plant is placed. land: true = only dry ground, false = only water
const PLANT_RULES = {
  weed: { land: false, minD: 40, make: (o, x, y, r) => o.push({ type: 'weed', x, y, h: 14 + r() * 44, v: r() < 0.5 ? 0 : 1, ph: r() * TAU }) },
  algae: { land: false, minD: 90, make: (o, x, y, r) => o.push({ type: 'algae', x, y, h: 22 + r() * 60, ph: r() * TAU, v: r() < 0.5 ? 0 : 1 }) },
  seagrass: { land: false, minD: 120, make: (o, x, y, r) => o.push({ type: 'seagrass', x, y, h: 18 + r() * 40, ph: r() * TAU }) },
  reed: { land: false, minD: 4, maxD: 110, make: (o, x, y, r) => o.push({ type: 'reed', x, y, top: y - 34 - r() * 40, ph: r() * TAU, v: r() < 0.5 ? 0 : 1 }) },
  cattail: { land: false, minD: 4, maxD: 90, make: (o, x, y, r) => o.push({ type: 'cattail', x, y, top: y - 40 - r() * 44, ph: r() * TAU }) },
  lily: { land: false, minD: 20, maxD: 300, make: (o, x, y, r) => { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) o.push({ type: 'lily', x: x + k * 12, y: 0, v: r() < 0.3 ? 1 : 0, ph: r() * TAU }); } },
  duckweed: { land: false, minD: 12, make: (o, x, y, r) => o.push({ type: 'duckweed', x, y: 0, w: 12 + r() * 30, v: Math.floor(r() * 3), ph: r() * TAU }) },
  hyacinth: { land: false, minD: 24, maxD: 260, make: (o, x, y, r) => o.push({ type: 'hyacinth', x, y: 0, s: 0.9 + r() * 0.8, bloom: r() < 0.5, ph: r() * TAU }) },
  sunkbranch: { land: false, minD: 60, make: (o, x, y, r) => o.push({ type: 'sunkbranch', x, y, s: 0.9 + r() * 0.9, flip: r() < 0.5 }) },
  shellbed: { land: false, minD: 80, make: (o, x, y, r) => o.push({ type: 'shellbed', x, y, n: 3 + Math.floor(r() * 6) }) },
  oyster: { land: false, minD: 10, maxD: 120, make: (o, x, y, r) => o.push({ type: 'oyster', x, y, n: 3 + Math.floor(r() * 5) }) },
  coral: { land: false, minD: 200, make: (o, x, y, r) => o.push({ type: 'coral', x, y, s: 0.8 + r() * 0.8, v: Math.floor(r() * 3) }) },
  rock: { land: false, minD: 20, make: (o, x, y, r) => o.push({ type: 'rock', x, y, v: r() < 0.5 ? 0 : 1, s: 1.1 + r() * 1.8 }) },
  log: { land: false, minD: 20, make: (o, x, y, r) => o.push({ type: 'log', x, y, s: 1 + r() * 1.2 }) },
  trash: { land: false, minD: 20, make: (o, x, y, r) => o.push({ type: 'trash', x, y, v: Math.floor(r() * 4), s: 0.9 + r() * 0.6 }) },
  rubble: { land: true, make: (o, x, y, r) => o.push({ type: 'rubble', x, y, n: 2 + Math.floor(r() * 4), s: 0.8 + r() * 0.7 }) },
  pipe: { land: true, make: (o, x, y, r) => o.push({ type: 'pipe', x, y, s: 0.9 + r() * 0.7 }) },
  root: { land: false, minD: 4, maxD: 140, make: (o, x, y, r) => o.push({ type: 'roots', x, y, n: 3 + Math.floor(r() * 4), len: 20 + r() * 44 }) },
  mangrove: { land: false, minD: -30, maxD: 110, make: (o, x, y, r) => o.push({ type: 'mangrove', x, y, s: 0.9 + r() * 0.9, dir: r() < 0.5 ? -1 : 1 }) },
  cypress: { land: true, make: (o, x, y, r) => o.push({ type: 'cypress', x, y, h: 90 + r() * 130, v: Math.floor(r() * 3), moss: r() < 0.8, knees: r() < 0.6 }) },
  knee: { land: false, minD: -20, maxD: 60, make: (o, x, y, r) => o.push({ type: 'knee', x, y, n: 2 + Math.floor(r() * 4), s: 0.8 + r() * 0.8 }) },
  oak: { land: true, make: (o, x, y, r) => o.push({ type: 'oak', x, y, h: 70 + r() * 60, v: Math.floor(r() * 3), moss: r() < 0.8 }) },
  palm: { land: true, make: (o, x, y, r) => o.push({ type: 'palm', x, y, h: 70 + r() * 80, v: Math.floor(r() * 3), ph: r() * TAU }) },
  moss: { land: true, make: (o, x, y, r) => o.push({ type: 'vine', x, y, h: 44 + r() * 60, ph: r() * TAU }) },
  vine: { land: true, make: (o, x, y, r) => o.push({ type: 'vine', x, y, h: 40 + r() * 60, ph: r() * TAU }) },
  fern: { land: true, make: (o, x, y, r) => o.push({ type: 'fern', x, y, s: 0.9 + r() * 0.8, ph: r() * TAU }) },
  bush: { land: true, make: (o, x, y, r) => o.push({ type: 'bush', x, y, s: 0.9 + r() * 0.9, v: Math.floor(r() * 3) }) },
  sawgrass: { land: true, make: (o, x, y, r) => o.push({ type: 'sawgrass', x, y, s: 0.9 + r() * 0.8, ph: r() * TAU, fly: r() < 0.3 }) },
  flower: { land: true, make: (o, x, y, r) => o.push({ type: 'flower', x, y, c: Math.floor(r() * 4), n: 1 + Math.floor(r() * 3) }) },
  mushroom: { land: true, make: (o, x, y, r) => o.push({ type: 'mushroom', x, y, n: 2 + Math.floor(r() * 3), c: Math.floor(r() * 2) }) },
  crate: { land: true, make: (o, x, y, r) => o.push({ type: 'crate', x, y, v: Math.floor(r() * 3) }) },
  post: { land: true, make: (o, x, y, r) => o.push({ type: 'post', x, y, h: 16 + r() * 16 }) },
  cooler: { land: true, make: (o, x, y, r) => o.push({ type: 'cooler', x, y, v: Math.floor(r() * 2) }) },
  firewood: { land: true, make: (o, x, y, r) => o.push({ type: 'firewood', x, y }) },
};
