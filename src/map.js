'use strict';
// ---------------------------------------------------------------------------
// The map is authored, not random. A profile of control points defines the
// shore and channel of one long swamp, split into named biomes that each carry
// their own palette, plants, animals and human activity.
// ---------------------------------------------------------------------------
// The drowned municipal system west of the lab is authored as one table so the
// floor and the ceiling can never drift apart: [x, floorY, roofY]. Headroom is
// the whole design here — long tight runs you have to surface in, crawls that
// squeeze, chambers that open overhead, and one shaft that drops away.
// The only roofed part of the world: the building they were moving you through
// and the pipe under it. [x, floorY, roofY]. Everything else is under the sky.
const WORKS_SECTION = [
  // ---- FACILITY B: six rooms in a line, dead level, poured to a tolerance
  // nothing below it has ever been held to.
  [-7700, -1400, -1700], [-7640, -1400, -1700], [-7400, -1400, -1700], [-7100, -1400, -1700],
  [-6800, -1400, -1700], [-6500, -1400, -1700], [-6260, -1400, -1700], [-6100, -1400, -1700],
  [-5990, -1400, -1700], [-5968, -1400, -1700],
  // ---- THE DROP. Eleven stone of cast iron gives way, the floor is not under
  // you any more, and a hundred and forty feet of brick shaft goes past in the
  // dark. Nobody walks this. You are unconscious for it.
  [-5958, -1180, -1560],
  [-5938, -700, -1080],
  [-5918, -260, -600],
  [-5900, -70, -340],
];
// ---------------------------------------------------------------------------
// THE SYSTEM. Five levels, each flatter and deeper than the one above it,
// joined by flights of cast steps. Headroom is the whole design: the top level
// has a roof you can put your head into, the middle has a hand of air at the
// crown, and the bottom two do not have air in them at all.
// [x, floorY, roofY].
// ---------------------------------------------------------------------------
const SEWER_SECTION = [
  // ---- THE SEWER -------------------------------------------------------
  // One chamber and a way out of it. It used to be seven thousand units of
  // drains; it is a thousand now, because the point of a sewer is leaving it.
  [-5880, 300, -300], [-5760, 330, -308], [-5640, 316, -300],
  [-5520, 150, -294], [-5460, -34, -288], [-5390, -36, -288], [-5330, 150, -294],
  [-5240, 300, -302], [-5120, 330, -306], [-5000, 300, -298],
  // ---- THE OUTFALL: four weirs and a hole with a sky behind it ---------
  [-4900, 240, -292], [-4800, 180, -290], [-4700, 120, -294],
  [-4620, 60, -300], [-4540, 10, -306], [-4480, -26, -312], [-4440, -34, -316],
];
// Control points: [x, floorY]. Negative floorY is dry land, positive is depth.
const MAP_PROFILE = [
  ...WORKS_SECTION.map(p => [p[0], p[1]]),
  ...SEWER_SECTION.map(p => [p[0], p[1]]),
  // ===================== SAN FRANCISCO ==========================
  // Out of the pipe and into a city's water: a concrete creek between two
  // embankments, the wharf where it meets the bay, the bay itself, and the
  // strait at the end of it with the bridge over the top.
  // -- ISLAIS CREEK: an urban river, walled both sides, shallow and filthy
  [-4400, -30], [-4340, 60], [-4260, 96], [-4160, 84], [-4060, 110],
  [-3960, 90], [-3860, 120], [-3760, 96], [-3660, 130], [-3560, 104],
  [-3460, 140], [-3360, 112], [-3260, 150], [-3160, 120],
  [-3060, 34], [-3000, -30], [-2940, -34], [-2880, 40],            // a slip you can haul out on
  [-2800, 150],
  // -- THE WHARF: timber piles, floating docks, tourist boats
  [-2700, 220], [-2560, 260], [-2420, 240], [-2280, 280], [-2140, 250],
  [-2020, 190], [-1940, -28], [-1880, -36], [-1820, 200],          // a landing stage
  [-1700, 290], [-1560, 330], [-1420, 300],
  // -- THE BAY: open, deep, cold
  [-1280, 420], [-1120, 560], [-960, 660], [-800, 720], [-640, 700],
  [-480, 760], [-320, 700], [-160, 640],
  [-60, 300], [0, -32], [60, -40], [120, 320],                     // a rock out in the bay
  // -- THE GOLDEN GATE: the strait. Deepest water in the zone, and a current
  [240, 560], [380, 780], [520, 940], [660, 1010], [800, 960],
  [940, 840], [1040, 620],
  [1150, 200], [1260, -30], [1330, 40], [1400, 96], [1460, 74],
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
  // ===================== OPEN OCEAN =============================
  // Past the seawall the bottom falls away: a sand shelf, then reef, then the
  // wall, then blue water over a trench with caves cut into its sides.
  [19300, -60], [19500, 40], [19700, 160], [19950, 280], [20200, 340],          // shelf, shelving out
  [20500, 300], [20800, 360], [21100, 420], [21400, 380], [21700, 300],
  [22000, 260], [22300, 320], [22600, 290], [22900, 220], [23200, 260],         // the reef: broken relief
  [23500, 340], [23800, 300], [24100, 230], [24400, 280], [24700, 360],
  [25000, 420], [25300, 560], [25600, 780], [25900, 1020], [26200, 1180],       // the wall
  [26550, 1240], [26900, 1200], [27250, 1260], [27600, 1220], [27950, 1280],    // blue water
  [28300, 1240], [28650, 1300], [29000, 1260], [29350, 1180], [29700, 1240],
  [30050, 1420], [30400, 1620], [30750, 1780], [31100, 1860], [31450, 1820],    // the trench
  [31800, 1900], [32150, 1960], [32500, 1900], [32850, 1840], [33200, 1880],
  [33550, 1820], [33900, 1760], [34250, 1800], [34600, 1840], [35000, 1820],
];
// ---------------------------------------------------------------------------
// Roof profile. Only the enclosed stretches have one: the building and the
// pipe under it, and the ocean caves cut into the trench wall. Between control
// points the roof is interpolated exactly like the floor, so a tunnel can
// pinch to a crawl, open into a chamber, or rise into a shaft.
// ---------------------------------------------------------------------------
const ROOF_PROFILE = [...WORKS_SECTION.map(p => [p[0], p[2]]), ...SEWER_SECTION.map(p => [p[0], p[2]])];
const OCEAN_CAVES = [
  // [x0, x1, roof] — overhangs and cave mouths in the trench wall
  [26050, 26600, 420], [27400, 27900, 760], [29100, 29700, 900],
  [30600, 31400, 1180], [32200, 32900, 1360],
];
// Manhole shafts: [x, how much light reaches the cover]. Each one is a hole in
// a street somewhere over the system, with a cast cover on it and a shaft of
// rings under it. The ladder in a shaft stops eight feet above the crown,
// which is exactly why it is no use to anything that cannot reach it.
const MANHOLES = [
  [-5700, 0.95], [-5430, 0.8], [-5150, 0.6], [-4880, 0.7],          // over the chamber
];
// Flights of steps. Concrete is not cut by weather, it is cast in lifts, so a
// stair in this world is a real stair: a flat tread and a hard riser, every
// one the same as the last. [x0, x1, rise].
const STAIRS = [
  [-5540, -5310, 26],                    // up onto the staging you wake on
  [-4900, -4440, 34],                    // the weirs, all the way to the light
];
function stairAt(x) { for (const [a, b, r] of STAIRS) if (x >= a && x <= b) return r; return 0; }
// ---------------------------------------------------------------------------
// Monotone cubic interpolation. Straight lines between control points put a
// crease at every one of them, and smoothstep flattens at every one of them,
// which is why the system used to read as a folded paper bag. A monotone cubic
// curves through the points and — unlike a plain Catmull-Rom — never overshoots
// them, which matters when the next control point is a wall.
// ---------------------------------------------------------------------------
function buildSlopes(P) {
  const n = P.length, d = new Float64Array(Math.max(1, n - 1)), m = new Float64Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = (P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) * 0.5;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], ss = a * a + b * b;
    if (ss > 9) { const t = 3 / Math.sqrt(ss); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return m;
}
function splineAt(P, m, lo, x) {
  const a = P[lo], b = P[lo + 1], h = b[0] - a[0], t = (x - a[0]) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * h * m[lo] + (3 * t2 - 2 * t3) * b[1] + (t3 - t2) * h * m[lo + 1];
}
// ---------------------------------------------------------------------------
// Facility B, room by room, west to east. One table, read by the renderer that
// draws the walls and by the opening that walks you down them, so the manhole
// is never in a different place than the chamber it is set in.
// ---------------------------------------------------------------------------
const FACILITY = {
  x0: -7640, x1: -5966,
  MANHOLE: -6180,          // the cover in the floor of the access chamber
  DOCK: -6040,             // cross this and the handlers have you
  rooms: [
    { id: 'bulkhead', x0: -7640, x1: -7560, name: 'WEST BULKHEAD' },
    { id: 'corridor', x0: -7560, x1: -7080, name: 'TRANSFER CORRIDOR' },
    { id: 'pens', x0: -7080, x1: -6440, name: 'HABITAT HALL' },
    { id: 'plant', x0: -6440, x1: -6260, name: 'PLANT ROOM' },
    { id: 'access', x0: -6260, x1: -6110, name: 'ACCESS CHAMBER' },
    { id: 'dock', x0: -6110, x1: -5966, name: 'LOADING DOCK' },
  ],
  roomAt(x) { for (const r of this.rooms) if (x >= r.x0 && x < r.x1) return r; return null; },
};
const MapData = {
  x0: MAP_PROFILE[0][0], x1: MAP_PROFILE[MAP_PROFILE.length - 1][0],
  // How man-made the ground is here, 0..1. It decides two things, and both of
  // them are the difference between a hillside and a floor: whether the profile
  // curves between its control points or runs dead straight to them, and
  // whether the fine noise that gives mud its texture is applied at all.
  // Concrete was poured to a line. Nothing under the city wobbles.
  built(x) {
    // The works end at the mouth of the outfall. Past it is a city, and a city
    // walls its creek in concrete for a mile before it lets it go.
    if (x >= -2800) return 0;
    if (x >= -4400) return clamp((-2800 - x) / 1600, 0, 1) * 0.7;   // the walled creek
    if (x >= -4440) return 1;
    return 1;
  },
  // ---------------------------------------------------------------------
  // THE OLD LANDFORM, KEPT AND NOT USED.
  //
  // Before the benches this was a smooth profile with two octaves of noise
  // laid over it: every bank a sine wave, every bed a sine wave, the whole
  // world in green corduroy. It is kept because it is the only way to get the
  // old world back if the new one ever turns out to be wrong, and because
  // deleting something you might want is how you end up writing it again,
  // worse. Set MapData.legacy = true in the console to put it back.
  // ---------------------------------------------------------------------
  legacy: false,
  legacyY(base, x) {
    return base + (fbm(x * 0.0035, 3) - 0.5) * 48 + (vnoise(x * 0.02, 7) - 0.5) * 10;
  },
  // ---------------------------------------------------------------------
  // LANDFORM.
  //
  // The old ground was a smooth profile with two octaves of noise laid over
  // it, which is a recipe for rolling hills and nothing else: every bank was
  // a sine wave, every bed was a sine wave, and the whole world read as green
  // corduroy. Ground does not do that. Ground gets cut.
  //
  // So the designed profile is quantised onto a ladder of benches and the
  // benches are joined by short risers. A gentle slope becomes a flight of
  // shelves with flat tops and hard edges; a steep one stays a scarp. The
  // step height is a property of the material — rock takes tall benches,
  // alluvium takes low ones — and every riser gets a lip at the top of it,
  // which is the line the eye actually reads as land.
  // ---------------------------------------------------------------------
  bench(y, step, riser) {
    const k = y / step, f = Math.floor(k), t = k - f;
    if (t < 1 - riser) return f * step;                     // the flat top
    return (f + (t - (1 - riser)) / riser) * step;          // and the face
  },
  // how tall the benches are here, and how hard the edge is
  cut(x) {
    if (x < 1100) return { step: 15, riser: 0.24, lip: 2.2 };     // the river: rock, cut square
    if (x < 6100) return { step: 11, riser: 0.3, lip: 1.6 };      // swamp: mud, slumped
    if (x < 11000) return { step: 9, riser: 0.34, lip: 1.2 };     // prairie and bay: soft
    if (x < 19000) return { step: 13, riser: 0.26, lip: 1.8 };    // the harbour: cut stone
    return { step: 18, riser: 0.22, lip: 2.6 };                   // reef and trench: rock
  },
  // interpolation between control points, then the land is cut into it. Built
  // ground gets neither: straight runs, hard angles, nothing on top.
  floorY(x) {
    const P = MAP_PROFILE;
    if (x <= P[0][0]) return P[0][1];
    if (x >= P[P.length - 1][0]) { const last = P[P.length - 1][1]; return last + Math.sin(x * 0.004) * 40 + vnoise(x * 0.01, 5) * 30; }
    let lo = 0, hi = P.length - 1;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (P[m][0] <= x) lo = m; else hi = m; }
    const a = P[lo], b = P[lo + 1], t = (x - a[0]) / (b[0] - a[0]);
    const bu = this.built(x);
    const sm = lerp(a[1], b[1], t * t * (3 - 2 * t));
    if (!this._mF) this._mF = buildSlopes(P);
    const spl = splineAt(P, this._mF, lo, x);
    const base = lerp(sm, spl, bu);
    if (bu >= 1) {
      // Poured ground runs exactly as drawn — except on a flight of steps,
      // where it runs as steps: a flat tread and a hard riser, and the same
      // rise every time, because that is how a stair is cast.
      const rise = stairAt(x);
      if (rise) { const q = this.bench(base, rise, 0.14); return q - (((base / rise) % 1) > 0.84 ? 1.6 : 0); }
      return base;
    }
    if (this.legacy) return this.legacyY(base, x);
    const C = this.cut(x);
    // The ladder is not a ladder all the way: bench height drifts along the
    // reach, so one stretch of bank is cut in low shelves and the next in
    // tall ones. A uniform step reads as a staircase, which is its own kind
    // of wrong.
    const step = C.step * (0.72 + 0.62 * vnoise(x * 0.0016, 5));
    const cutY = this.bench(base, step, C.riser);
    const k = base / step, t2 = k - Math.floor(k);
    const edge = t2 > 1 - C.riser - 0.06 && t2 < 1 - C.riser + 0.02 ? C.lip : 0;
    // stones and scour on the flat tops only: a bench is flat, not smooth
    const grit = t2 < 1 - C.riser ? (vnoise(x * 0.09, 11) - 0.5) * 3.2 : 0;
    return lerp(base, cutY - edge + grit, 1 - bu);
  },
  // interpolated roof, or null where the sky is open
  roofY(x) {
    const R = ROOF_PROFILE;
    // west of the first control point is the bulkhead the system dead-ends on
    if (x < R[0][0] && x > R[0][0] - 400) return R[0][1];
    if (x >= R[0][0] && x <= R[R.length - 1][0]) {
      let lo = 0, hi = R.length - 1;
      while (lo < hi - 1) { const m = (lo + hi) >> 1; if (R[m][0] <= x) lo = m; else hi = m; }
      const a = R[lo], b = R[lo + 1], t = (x - a[0]) / (b[0] - a[0]);
      const bu = this.built(x);
      if (!this._mR) this._mR = buildSlopes(R);
      const base = lerp(lerp(a[1], b[1], t * t * (3 - 2 * t)), splineAt(R, this._mR, lo, x), bu);
      if (bu >= 1) return base;
      return base + (vnoise(x * 0.05, 31) * 8 - 4 + Math.sin(x * 0.021) * 3) * (1 - bu);
    }
    // ocean caves: an overhang that closes over the water for a stretch
    for (const [cx0, cx1, r] of OCEAN_CAVES) {
      if (x < cx0 || x > cx1) continue;
      const u = (x - cx0) / (cx1 - cx0);
      // the mouth flares open at both ends so it never reads as a hard wall
      const flare = Math.min(1, Math.min(u, 1 - u) * 5);
      if (flare <= 0.02) return null;
      return r * flare + vnoise(x * 0.04, 41) * 14 - 7;
    }
    return null;
  },
};
// ---------------------------------------------------------------------------
// Biomes
// ---------------------------------------------------------------------------
const BIOMES = [
  // ===================== SEWER NETWORK ==========================
  {
    id: 'facility', name: 'FACILITY B', x0: -7640, x1: -5900, lab: true,
    sky: ['#0a1418', '#16242a'], water: ['#5aa060', '#2e6438', '#123018'], scum: '#6a9a4a', fog: '#1a2a30',
    parallax: ['block', 'block', 'block'], ground: ['#4a5258', '#343a40', '#1e2428'], grass: '#4a5258',
    indoor: true, roof: -1690, dark: 0.06,
    plants: [['labtank', 0.6], ['console', 0.4], ['crate', 0.2], ['cable', 0.45], ['biohaz', 0.15]],
    fish: [], land: [], structures: [],
    music: 0.9,
  },
  {
    // One chamber, four shafts of daylight, a brick staging to come round on
    // and a way out at the east end. That is the whole sewer now.
    id: 'wake', name: 'THE SEWER', x0: -5900, x1: -4900, indoor: true,
    sky: ['#0d1518', '#1b262a'], water: ['#4c7d72', '#2a5048', '#10241f'], scum: '#6a8a4a', fog: '#162228',
    parallax: ['pipe', 'pipe', 'pipe'], ground: ['#6a5d4e', '#4d4338', '#2f2922'], grass: '#4a5448',
    roof: -300, dark: 0.2, toxic: 0,
    plants: [['algae', 2.6], ['weed', 2.2], ['trash', 1.4], ['rock', 1.6], ['sunkbranch', 1], ['shellbed', 0.8]],
    fish: [['minnow', 5], ['shiner', 4], ['bluegill', 2.4], ['roach', 2.4], ['tilapia', 1.6]],
    land: [['rat', 2.2]], structures: [], music: 0.5,
  },
  {
    // Four weirs and a hole with a sky behind it. The last roofed thing in
    // the zone and the first daylight the animal has ever been under.
    id: 'interceptor', name: 'THE OUTFALL', x0: -4900, x1: -4400, indoor: true,
    sky: ['#12202a', '#2e4450'], water: ['#3e7a70', '#20493f', '#0b1d1a'], scum: '#6a8a4a', fog: '#1c2e34',
    parallax: ['pipe', 'pipe', 'pipe'], ground: ['#6a6254', '#4c463b', '#2e2a23'], grass: '#5a6a42',
    roof: -300, dark: 0.16, toxic: 0.06,
    plants: [['algae', 2.2], ['weed', 2.4], ['rock', 1.8], ['trash', 1.2], ['shellbed', 1]],
    fish: [['tilapia', 3], ['shiner', 3.4], ['bluegill', 2.6], ['minnow', 3], ['walkingcat', 1.6]],
    land: [['rat', 1.4]], structures: [], music: 0.55,
  },
  {
    // ISLAIS CREEK. A city's river: two concrete embankments, a bridge every
    // half mile, a shopping trolley in the bed of it and a heron that has made
    // its peace with all of that.
    id: 'gallery', name: 'ISLAIS CREEK', x0: -4400, x1: -2800, town: true,
    sky: ['#6e8ea6', '#c6d4d8'], water: ['#4a7a72', '#2c4e48', '#12241f'], scum: '#7a8a46', fog: '#b0c0c4',
    parallax: ['block', 'tower', 'block'], ground: ['#7a7468', '#55504a', '#33302c'], grass: '#6a7a44',
    toxic: 0.12,
    plants: [['algae', 2.2], ['weed', 2], ['trash', 2.2], ['rock', 1.6], ['rubble', 1.4], ['reed', 1], ['sunkbranch', 1.2]],
    fish: [['shiner', 3.4], ['bluegill', 2.6], ['tilapia', 2.4], ['walkingcat', 2], ['bass', 1.6], ['catfish', 1.6]],
    land: [['rat', 2.4], ['raccoon', 1.6], ['fisherman', 1], ['tourist', 0.8]],
    structures: [['manhole', 1.4], ['pipe', 1.4], ['billboard', 1], ['boatramp', 1], ['seawall', 1.6], ['wreck', 0.8]],
    music: 0.4,
  },
  {
    // THE WHARF. Timber piles by the thousand, floating docks with sea lions
    // asleep on them, a tourist boat every ten minutes and a crab pot on every
    // fourth piling.
    id: 'sump', name: 'THE WHARF', x0: -2800, x1: -1400, town: true,
    sky: ['#6898b8', '#d4e0e0'], water: ['#3d7f8a', '#22505a', '#0c2026'], scum: '#6a8a4a', fog: '#bcd0d4',
    parallax: ['tower', 'block', 'shack'], ground: ['#6a6458', '#4a463c', '#2c2a24'], grass: '#5f7444',
    plants: [['kelp', 2.4], ['algae', 2], ['oyster', 2], ['shellbed', 1.8], ['weed', 1.4], ['rock', 1.4], ['trash', 1.2]],
    fish: [['shiner', 3], ['sardine', 3.4], ['bluegill', 2], ['bass', 2], ['catfish', 1.6], ['bonnet', 1.2], ['sealion', 2.4], ['harborseal', 2]],
    land: [['tourist', 2.4], ['fisherman', 2], ['raccoon', 1.4], ['rat', 1.6]],
    structures: [['pier', 2.6], ['sealdock', 2.2], ['ferry', 1.8], ['crabtrap', 2], ['buoy', 1.4], ['dock', 1.4], ['boathouse', 1], ['seawall', 1.2]],
    music: 0.35,
  },
  {
    // THE BAY. Cold, deep, grey-green, with a rock out in the middle of it and
    // a container ship going over the top of you.
    id: 'outfall', name: 'THE BAY', x0: -1400, x1: 120,
    sky: ['#5a92c0', '#cfdfe4'], water: ['#2f7484', '#1a4450', '#071a22'], scum: '#5f7a46', fog: '#aac4cc',
    parallax: ['tower', 'island', 'block'], ground: ['#6a6a62', '#494942', '#2b2b26'], grass: '#5a7040',
    pressure: 0.2,
    plants: [['kelp', 2.6], ['algae', 1.8], ['shellbed', 2], ['oyster', 1.4], ['rock', 2.2], ['fan', 1], ['weed', 1.2]],
    fish: [['sardine', 3.6], ['shiner', 2.6], ['bass', 2], ['bonnet', 1.8], ['harborseal', 2.4], ['sealion', 2], ['shark', 1.4], ['ray', 1.4], ['dolphin', 1]],
    land: [['tourist', 1.2], ['fisherman', 1]],
    structures: [['buoy', 2.4], ['wreck', 1.6], ['ferry', 1.4], ['pier', 1], ['crabtrap', 1.2], ['seawall', 1]],
    music: 0.5,
  },
  {
    // THE GOLDEN GATE. The strait, the deepest water in the zone, a current
    // that runs like a river and two towers standing in it.
    id: 'gate', name: 'THE GOLDEN GATE', x0: 120, x1: 1260, open: true,
    sky: ['#4a86bc', '#c8dce6'], water: ['#276c84', '#133c4c', '#04141c'], scum: '#557040', fog: '#a4bcc8',
    parallax: ['tower', 'bluff', 'tower'], ground: ['#5e6060', '#414342', '#26282a'], grass: '#546c3c',
    pressure: 0.45,
    plants: [['kelp', 3.2], ['fan', 1.6], ['rock', 2.4], ['shellbed', 1.6], ['sponge', 1], ['algae', 1.2]],
    fish: [['sardine', 3.4], ['shark', 2.4], ['sealion', 2.6], ['harborseal', 2], ['bonnet', 1.8], ['dolphin', 1.4], ['ray', 1.2], ['grouper', 0.8]],
    land: [], structures: [['gate', 3], ['buoy', 2], ['wreck', 1.4], ['ferry', 1.2]],
    music: 0.8,
  },
  {
    id: 'mangrove', name: 'MANGROVE TANGLE', x0: 1260, x1: 2800,
    sky: ['#4d8fd0', '#cfe6f2'], water: ['#3a9a86', '#1e5c50', '#08201d'], scum: '#6a8a4a', fog: '#bfe0e6',
    parallax: ['mangrove', 'palm', 'mangrove'], ground: ['#5a4a34', '#463726', '#32281a'], grass: '#4f8a3a',
    plants: [['mangrove', 2.4], ['root', 2], ['weed', 1.4], ['oyster', 1.2], ['reed', 1], ['duckweed', 1], ['palm', 0.6], ['fern', 0.8]],
    fish: [['snapper', 3], ['sheepshead', 2], ['mullet', 3], ['snook', 2], ['redfish', 1.6], ['ladyfish', 1.4], ['minnow', 2]],
    land: [['raccoon', 3], ['iguana', 2], ['rabbit', 1.5], ['fox', 1]],
    structures: [['crabtrap', 2], ['buoy', 1], ['dock', 0.8], ['boathouse', 0.8]],
    music: 0.4,
  },
  {
    id: 'camp', name: 'GATOR JOE’S FISH CAMP', x0: 2800, x1: 4200,
    sky: ['#4f9fe0', '#e8dcc0'], water: ['#3a8a80', '#20564e', '#0a1e1c'], scum: '#7a8a4a', fog: '#d8e0d0',
    parallax: ['shack', 'palm', 'oak'], ground: ['#6a5a3a', '#4a3e28', '#332a1c'], grass: '#6a9a3a',
    plants: [['palm', 1.4], ['bush', 1.4], ['flower', 1], ['crate', 1.2], ['reed', 0.8], ['lily', 0.6], ['post', 1.2]],
    fish: [['bluegill', 3], ['bass', 2.5], ['catfish', 2], ['mullet', 2], ['tilapia', 2], ['flgar', 1.4]],
    land: [['dog', 2], ['raccoon', 2], ['rabbit', 1]],
    structures: [['shop', 2.4], ['dock', 2.4], ['stilthouse', 1.6], ['boatramp', 1.4], ['sign', 1], ['boathouse', 2], ['trailer', 1.8], ['watertower', 1], ['billboard', 0.8]],
    town: true, music: 0.5,
  },
  {
    id: 'cypress', name: 'CYPRESS SWAMP', x0: 4200, x1: 6100,
    sky: ['#3a7ab0', '#a8c0b8'], water: ['#2f6a58', '#173f36', '#050f0e'], scum: '#4a6a3a', fog: '#9ab0a8',
    parallax: ['cypress', 'cypress', 'oak'], ground: ['#3f3424', '#2e2618', '#1e1810'], grass: '#3f6a22',
    plants: [['cypress', 2.6], ['knee', 2], ['moss', 1.6], ['fern', 1.4], ['vine', 1.2], ['weed', 1.4], ['lily', 1.2], ['mushroom', 0.8], ['log', 1]],
    fish: [['bowfin', 2.4], ['flgar', 2.2], ['gar', 1.6], ['catfish', 2], ['bluegill', 2], ['eel', 1.4]],
    land: [['panther', 1.2], ['bear', 0.9], ['boar', 1.6], ['deer', 2], ['opossum', 1.4], ['bobcat', 1.2]],
    structures: [['tower', 1], ['sign', 0.6], ['trailer', 0.8], ['billboard', 0.7]],
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
    structures: [['buoy', 1.6], ['dock', 0.8], ['tower', 0.8], ['watertower', 0.9], ['billboard', 0.6]],
    music: 0.9,
  },
  {
    id: 'campground', name: 'PARADISE CAMPGROUND', x0: 9400, x1: 11000,
    sky: ['#4f9fe0', '#f4e0b0'], water: ['#3a9a8a', '#1f5e52', '#0a201d'], scum: '#7a8a4a', fog: '#e0e0c8',
    parallax: ['tent', 'palm', 'oak'], ground: ['#7a6a48', '#5a4e32', '#3e3622'], grass: '#7aa83f',
    plants: [['palm', 1.6], ['bush', 1.6], ['flower', 1.4], ['sawgrass', 1.2], ['cooler', 1], ['firewood', 1.2], ['lily', 0.8]],
    fish: [['bluegill', 3], ['bass', 2.4], ['mullet', 2], ['sunfish', 2], ['snook', 1.4]],
    land: [['dog', 1.6], ['raccoon', 2.4], ['deer', 1.6], ['bear', 1]],
    structures: [['campsite', 2.6], ['dock', 1.2], ['boatramp', 1], ['sign', 0.8], ['trailer', 1.6], ['boathouse', 1], ['watertower', 0.7]],
    town: true, music: 0.5,
  },
  {
    id: 'bay', name: 'FLORIDA BAY', x0: 11000, x1: 15300, clarity: 0.4,
    sky: ['#2f86d8', '#d8ecf4'], water: ['#2aa0b0', '#0f6474', '#03202c'], scum: '#4a8a7a', fog: '#c8e4ee',
    parallax: ['mangrove', 'island', 'island'], ground: ['#7a7460', '#5a5648', '#3a3830'], grass: '#5a8a4a',
    plants: [['seagrass', 2.6], ['shellbed', 2], ['coral', 1.4], ['algae', 1.6], ['rock', 1.4], ['sunkbranch', 1]],
    fish: [['tarpon', 2], ['shark', 1.8], ['sawfish', 1.4], ['grouper', 1.4], ['dolphin', 1.4], ['manatee', 1.4], ['redfish', 1.8], ['bonnet', 1.6]],
    land: [['otter', 1]],
    structures: [['buoy', 2], ['crabtrap', 1.4], ['stilthouse', 1], ['boathouse', 1.2]],
    music: 1,
  },
  {
    // Endgame. A dredged harbour under a city that has finally noticed you.
    id: 'seawall', name: 'THE SEAWALL', x0: 15300, x1: 19000,
    sky: ['#141c34', '#40506e'], water: ['#1d5c74', '#0c3346', '#02121c'], scum: '#3a5a5a', fog: '#5a6a86',
    parallax: ['tower', 'block', 'tower'], ground: ['#5e6068', '#43454c', '#2a2c32'], grass: '#4a5a4a',
    plants: [['rubble', 2.2], ['rock', 1.6], ['trash', 1.8], ['pipe', 1.4], ['algae', 1.2], ['shellbed', 1]],
    fish: [['shark', 2.2], ['tarpon', 1.6], ['sawfish', 1.6], ['grouper', 1.4], ['dolphin', 1], ['bonnet', 1.4]],
    land: [['ranger', 2], ['poacher', 2]],
    structures: [['seawall', 3], ['sign', 0.6], ['pumphouse', 1.4], ['watertower', 0.8], ['manhole', 1.2]],
    town: true, kaiju: true, music: 1.2,
  },
  // ===================== OPEN OCEAN =============================
  {
    id: 'shelf', name: 'THE SHELF', x0: 19000, x1: 21800, clarity: 0.7,
    sky: ['#3a86c8', '#dceaf2'], water: ['#3aa8c0', '#1e6a86', '#0a2a3a'], scum: '#7a9a6a', fog: '#cfe4ee',
    parallax: ['bluff', 'block', 'bluff'], ground: ['#c8bc9a', '#a89a78', '#7a6e54'], grass: '#7aa86a', open: 'coast',
    plants: [['weed', 2.2], ['algae', 1.8], ['reed', 1.2], ['oyster', 1.4], ['rubble', 1]],
    fish: [['mullet', 3], ['snapper', 2.6], ['ladyfish', 2], ['sheepshead', 2], ['redfish', 2], ['ray', 1.6], ['tarpon', 1.4]],
    land: [], structures: [['buoy', 1.6], ['crabtrap', 1.2]],
    music: 0.3,
  },
  {
    id: 'reef', name: 'THE REEF', x0: 21800, x1: 25000, clarity: 0.5,
    sky: ['#2f7ec4', '#cfe8f4'], water: ['#2fb0b8', '#1a7a86', '#07303c'], scum: '#8aa85a', fog: '#c0e2ee',
    parallax: ['bluff', 'bluff', 'block'], ground: ['#c0a884', '#9a8464', '#6e5c44'], grass: '#5ab0a0', open: 'reef',
    plants: [['coral', 3.2], ['fan', 2.4], ['sponge', 2], ['weed', 1.6], ['algae', 1.4], ['oyster', 1.2]],
    fish: [['parrotfish', 3], ['angelfish', 2.8], ['snapper', 2.4], ['lionfish', 1.6], ['barracuda', 1.4], ['grouper', 1], ['moray', 1.2], ['turtle', 1.2]],
    land: [], structures: [['buoy', 1], ['wreck', 1.2]],
    music: 0.35,
  },
  {
    id: 'wall', name: 'THE WALL', x0: 25000, x1: 29800, clarity: 0.45,
    sky: ['#1e5e9e', '#9ac4dc'], water: ['#1f7a92', '#104a62', '#031824'], scum: '#5a7a5a', fog: '#8ab0c8',
    parallax: ['bluff', 'block', 'bluff'], ground: ['#7a7060', '#5a5246', '#3a352c'], grass: '#3a8a80', open: 'rig',
    plants: [['fan', 2.4], ['coral', 2], ['sponge', 1.8], ['kelp', 2.2], ['algae', 1.4]],
    fish: [['tuna', 2.4], ['barracuda', 2.4], ['hammer', 1.2], ['shark', 1.4], ['grouper', 1.6], ['moray', 1.4], ['dolphin', 1.2], ['manatee', 0.8], ['sawfish', 1]],
    land: [], structures: [['wreck', 1.4]],
    dark: 0.2, flora: '#5a8a90', floraMix: 0.4, music: 0.7,
  },
  {
    id: 'trench', name: 'THE TRENCH', x0: 29800, x1: 35400, clarity: 0.15,
    sky: ['#0a2436', '#245878'], water: ['#12465c', '#082a3a', '#010b12'], scum: '#3a5a4a', fog: '#123044',
    parallax: ['bluff', 'bluff', 'block'], ground: ['#4a4a50', '#34343a', '#202024'], grass: '#2a6a70', open: 'deep',
    plants: [['tubeworm', 3.2], ['sponge', 2], ['fan', 1.2], ['coral', 1], ['rubble', 2]],
    fish: [['anglerfish', 2.4], ['oarfish', 1.2], ['isopod', 2.4], ['moray', 1.4], ['hammer', 1.4], ['grouper', 1.2], ['eel', 1.6]],
    land: [], structures: [['wreck', 1.6]],
    dark: 0.72, flora: '#7a8a96', floraMix: 0.6, pressure: 1, music: 0.95,
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
      flora: a.flora || b.flora || null, floraMix: lerp(a.floraMix || 0, b.floraMix || 0, t), open: t > 0.5 ? b.open : a.open,
      toxic: lerp(a.toxic || 0, b.toxic || 0, t), pressure: lerp(a.pressure || 0, b.pressure || 0, t), indoor: t > 0.5 ? b.indoor : a.indoor,
      // These three decide which renderer draws the room, so a blend that drops
      // them makes the last 260 units of a laboratory come out as sewer brick.
      lab: t > 0.5 ? b.lab : a.lab, roman: t > 0.5 ? b.roman : a.roman, pipe: t > 0.5 ? b.pipe : a.pipe, remote: t > 0.5 ? b.remote : a.remote,
      cliff: lerp(a.cliff || 0, b.cliff || 0, t),
    };
  },
  // decor for one strip of ground, chosen from the biome's plant table
  decorAt(x, rng, out) {
    const B = this.at(x), fy = MapData.floorY(x), land = fy < 0, depth = fy;
    if (B.lab) return;        // the lab is laid out, not scattered: see authored()
    const table = B.plants.filter(([k]) => {
      const w = PLANT_RULES[k]; if (!w) return false;
      // Nothing floats on a sewer, and nothing grows on brick you cannot see.
      // A weed bed drawn at y=0 over a floor that is above the waterline is the
      // single thing that made this map look like it was full of litter.
      if (B.indoor && w.float) return false;
      return w.land === undefined || w.land === land ? (w.minD === undefined || depth >= w.minD) && (w.maxD === undefined || depth <= w.maxD) : false;
    });
    if (!table.length) return;
    let tot = 0; for (const e of table) tot += e[1];
    if (rng() > Math.min(0.97, tot * 0.28)) return;
    let r = rng() * tot;
    for (const e of table) { r -= e[1]; if (r <= 0) { PLANT_RULES[e[0]].make(out, x + rng() * 10, fy, rng, B); return; } }
  },
  // Everything in the world that was set out rather than grown, placed once per
  // chunk on its own grid so it never depends on where the sampler happened to
  // land. Today that is the laboratory corridor, which is laid out in bays.
  authored(x0, x1, out) {
    for (let x = Math.ceil(x0 / 120) * 120; x < x1; x += 120) {
      const B = this.at(x);
      // only the corridor and the plant room have loose equipment standing in
      // them: a hall of pens has pens, and a loading dock has a dock
      if (B.lab) { const r = FACILITY.roomAt(x); if (r && (r.id === 'corridor' || r.id === 'plant')) this.labBay(x, out); }
    }
  },
  // One bay of the corridor. Four of them repeat along it: a tank with its
  // console, a stack of crates and a drum, a pair of tanks, and a run of cable
  // off the tray. Every piece sits on the floor at its own x, which in here is
  // the same number all the way along.
  labBay(x, out) {
    const bay = ((Math.floor(x / 120) % 4) + 4) % 4;
    const put = (type, ox, f) => { const px = x + ox; out.push(Object.assign({ type, x: px, y: MapData.floorY(px), ph: (ox % 7) * 0.9 }, f || {})); };
    if (bay === 0) { put('labtank', 12, { v: 0 }); put('console', 54, { v: 0 }); put('crate', 98, { v: 1 }); }
    else if (bay === 1) { put('crate', 16, { v: 0 }); put('crate', 32, { v: 1 }); put('biohaz', 74); put('console', 104, { v: 1 }); }
    else if (bay === 2) { put('labtank', 14, { v: 1 }); put('labtank', 58, { v: 2 }); put('console', 100, { v: 2 }); }
    else { put('biohaz', 14); put('crate', 46, { v: 2 }); put('labtank', 86, { v: 3 }); }
  },
};
// how each plant is placed. land: true = only dry ground, false = only water
const PLANT_RULES = {
  weed: { land: false, minD: 40, make: (o, x, y, r) => o.push({ type: 'weed', x, y, h: 14 + r() * 44, v: r() < 0.5 ? 0 : 1, ph: r() * TAU }) },
  algae: { land: false, minD: 90, make: (o, x, y, r) => o.push({ type: 'algae', x, y, h: 22 + r() * 60, ph: r() * TAU, v: r() < 0.5 ? 0 : 1 }) },
  seagrass: { land: false, minD: 120, make: (o, x, y, r) => o.push({ type: 'seagrass', x, y, h: 18 + r() * 40, ph: r() * TAU }) },
  reed: { land: false, minD: 4, maxD: 110, make: (o, x, y, r) => o.push({ type: 'reed', x, y, top: y - 34 - r() * 40, ph: r() * TAU, v: r() < 0.5 ? 0 : 1 }) },
  cattail: { land: false, minD: 4, maxD: 90, make: (o, x, y, r) => o.push({ type: 'cattail', x, y, top: y - 40 - r() * 44, ph: r() * TAU }) },
  lily: { float: true, land: false, minD: 20, maxD: 300, make: (o, x, y, r) => { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) o.push({ type: 'lily', x: x + k * 12, y: 0, v: r() < 0.3 ? 1 : 0, ph: r() * TAU }); } },
  duckweed: { float: true, land: false, minD: 12, make: (o, x, y, r) => o.push({ type: 'duckweed', x, y: 0, w: 12 + r() * 30, v: Math.floor(r() * 3), ph: r() * TAU }) },
  hyacinth: { float: true, land: false, minD: 24, maxD: 260, make: (o, x, y, r) => o.push({ type: 'hyacinth', x, y: 0, s: 0.9 + r() * 0.8, bloom: r() < 0.5, ph: r() * TAU }) },
  sunkbranch: { land: false, minD: 60, make: (o, x, y, r) => o.push({ type: 'sunkbranch', x, y, s: 0.9 + r() * 0.9, flip: r() < 0.5 }) },
  shellbed: { land: false, minD: 80, make: (o, x, y, r) => o.push({ type: 'shellbed', x, y, n: 3 + Math.floor(r() * 6) }) },
  oyster: { land: false, minD: 10, maxD: 120, make: (o, x, y, r) => o.push({ type: 'oyster', x, y, n: 3 + Math.floor(r() * 5) }) },
  coral: { land: false, minD: 180, make: (o, x, y, r) => { if (r() < 0.45) return; o.push({ type: 'coral', x, y, s: 0.8 + r() * 1.1, v: Math.floor(r() * 4), ph: r() * TAU }); } },
  // --- reef and deep-ocean growth ---
  fan: { land: false, minD: 200, make: (o, x, y, r) => { if (r() < 0.4) return; o.push({ type: 'fan', x, y, s: 0.9 + r() * 1.0, v: Math.floor(r() * 3), lean: r() < 0.5 ? -1 : 1, ph: r() * TAU }); } },
  sponge: { land: false, minD: 240, make: (o, x, y, r) => { if (r() < 0.35) return; o.push({ type: 'sponge', x, y, s: 0.8 + r() * 0.9, n: 1 + Math.floor(r() * 3), v: Math.floor(r() * 3), ph: r() * TAU }); } },
  kelp: { land: false, minD: 200, maxD: 620, make: (o, x, y, r) => o.push({ type: 'kelp', x, y, h: 70 + r() * 150, ph: r() * TAU, v: r() < 0.5 ? 0 : 1 }) },
  tubeworm: { land: false, minD: 700, make: (o, x, y, r) => o.push({ type: 'tubeworm', x, y, n: 3 + Math.floor(r() * 5), s: 0.8 + r() * 0.7, ph: r() * TAU }) },
  rock: { land: false, minD: 20, make: (o, x, y, r) => o.push({ type: 'rock', x, y, v: r() < 0.5 ? 0 : 1, s: 1.1 + r() * 1.8 }) },
  log: { land: false, minD: 20, make: (o, x, y, r) => o.push({ type: 'log', x, y, s: 1 + r() * 1.2 }) },
  trash: { land: false, minD: 20, make: (o, x, y, r) => o.push({ type: 'trash', x, y, v: Math.floor(r() * 4), s: 0.9 + r() * 0.6 }) },
  // --- the catacombs: what two thousand years leave on the floor and the surface
  garbage: { float: true, land: false, minD: 14, make: (o, x, y, r) => { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) o.push({ type: 'garbage', x: x + k * 9 + r() * 6, y: 0, v: Math.floor(r() * 6), ph: r() * TAU, s: 0.9 + r() * 0.4 }); } },
  labtank: { land: true, make: (o, x, y, r) => o.push({ type: 'labtank', x, y, v: Math.floor(r() * 4), ph: r() * TAU }) },
  console: { land: true, make: (o, x, y, r) => o.push({ type: 'console', x, y, v: Math.floor(r() * 3), ph: r() * TAU }) },
  cable: { land: true, make: (o, x, y, r) => o.push({ type: 'cable', x, y, n: 2 + Math.floor(r() * 3), ph: r() * TAU }) },
  biohaz: { land: true, make: (o, x, y, r) => o.push({ type: 'biohaz', x, y }) },
  skeleton: { land: true, make: (o, x, y, r) => o.push({ type: 'skeleton', x, y, v: Math.floor(r() * 2), flip: r() < 0.5 }) },
  bones: { make: (o, x, y, r) => o.push({ type: 'bones', x, y, n: 2 + Math.floor(r() * 3), v: Math.floor(r() * 3), s: 0.5 + r() * 0.4 }) },
  tomb: { land: true, make: (o, x, y, r) => o.push({ type: 'tomb', x, y, v: Math.floor(r() * 2), open: r() < 0.4 }) },
  urn: { land: true, make: (o, x, y, r) => o.push({ type: 'urn', x, y, n: 1 + Math.floor(r() * 3), s: 0.8 + r() * 0.5 }) },
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
  // what a pipe collects: a bank of washed grit against one side of the invert
  grit: { land: true, make: (o, x, y, r) => o.push({ type: 'grit', x, y, n: 3 + Math.floor(r() * 4), s: 0.8 + r() * 0.8, side: r() < 0.5 ? -1 : 1 }) },
  post: { land: true, make: (o, x, y, r) => o.push({ type: 'post', x, y, h: 16 + r() * 16 }) },
  cooler: { land: true, make: (o, x, y, r) => o.push({ type: 'cooler', x, y, v: Math.floor(r() * 2) }) },
  firewood: { land: true, make: (o, x, y, r) => o.push({ type: 'firewood', x, y }) },
};
