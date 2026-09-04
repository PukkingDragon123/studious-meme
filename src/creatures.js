'use strict';
// ---------------------------------------------------------------------------
// Ecosystem expansion: more creatures, and animals that hunt each other so the
// swamp is alive whether or not the player is involved.
// ---------------------------------------------------------------------------
(function buildCreatureSprites() {
  const E = '#111111';
  SPR.mullet = fishFrames(mkSprite([
    '.......SSSSSS...', 'S.....SssssssS..', 'SS..SSsssssssSS.', 'SSSSsssssssseSSm', 'SS..SSwwwwwwwSS.', 'S.....SwwwwwS...', '.......SSSSS....',
  ], { S: '#5c6f78', s: '#b9c8ce', w: '#eef2f4', e: E, m: '#1a1a1a' }), 4);
  SPR.tilapia = fishFrames(mkSprite([
    '.....GGGGGG..', 'G...GgggggggG', 'GG.GgggggggeG', 'GGGgggggggggm', 'GG.GgpppppggG', 'G...GppppppG.', '.....GGGGGG..',
  ], { G: '#4a5a5a', g: '#8a9a92', p: '#d0a0a0', e: E, m: '#1a1a1a' }), 3);
  SPR.peacock = fishFrames(mkSprite([
    '......YYYYYYY....', 'Y....YyyyyyyyY...', 'YY..YyyKyyyKyyY..', 'YYYYyyyyyyyyyyeYo', 'YY..YyoooooooyyYo', 'Y....YooooooooY..', '......YYYYYYY....',
  ], { Y: '#3a5a20', y: '#8ac040', K: '#1a2a10', o: '#e0a020', e: E }), 4);
  SPR.bowfin = fishFrames(mkSprite([
    '.....BBBBBBBBBB..', 'B...BbbbbbbbbbbB.', 'BB.BbbbbbbbbbbbeB', 'BBBbbbbbbbbbbbbbo', 'BB.BbbbbbbbbbbbB.', 'B...BBBBBBBBBBB..',
  ], { B: '#2a3a22', b: '#5a6a42', e: '#c0a030', o: '#1a1a1a' }), 4);
  SPR.snook = fishFrames(mkSprite([
    '.......SSSSSSS....', 'S.....SsssssssS...', 'SS..SSsssssssssSS.', 'SSSSsssssssssssseS', 'SSKKKKKKKKKKKKKKKm', 'SS..SSwwwwwwwwwSS.', 'S.....SwwwwwwwS...', '.......SSSSSS.....',
  ], { S: '#6a7a6a', s: '#c0ccc0', K: '#2a2a2a', w: '#e8eee8', e: E, m: '#1a1a1a' }), 4);
  SPR.eel = fishFrames(mkSprite([
    'e..................', 'EeeeeeeeeeeeeeeeeeE', 'EEeeeeeeeeeeeeeeeEE', 'Ey.yyyyyyyyyyyyyyE.', '...................',
  ], { E: '#2a2418', e: '#5a4a2a', y: '#b0a070' }), 4);
  SPR.grouper = fishFrames(mkSprite([
    '..........GGGGGGGGGG......', '.....GGGGGgggggggggggGG...', '..GGGgggggggggggggggggGG..', 'GGGgggggggggggggggggggggG.', 'GGgggggggggggggggggggggeGm', 'GGgggggggggkgggkgggggggggm', 'GGGgggggggggggggggggggggG.', '..GGGggggggggggggggggGGG..', '.....GGGGGgggggggggGG.....', '..........GGGGGGGG........',
  ], { G: '#4a4030', g: '#8a7a5a', k: '#3a3020', e: E, m: '#2a1a1a' }), 6);
  SPR.sawfish = fishFrames(mkSprite([
    '..............SSSSSSSS....', '..........SSSSssssssssSS..', 'SS....SSSSsssssssssssssSS.', 'SSSSSSssssssssssssssseSSSt', 'SSSSSSwwwwwwwwwwwwwwwwwwtT', 'SS....SSwwwwwwwwwwwwwwwSSt', '..........SSSSwwwwwwSS....',
  ], { S: '#8a8a7a', s: '#c8c8b8', w: '#e8e8dc', e: E, t: '#d0d0c0', T: '#f0f0e0' }), 6);
  SPR.ray = [mkSprite([
    '....RRRRRR....', '..RRrrrrrrRR..', 'RRrrrrrrrrrrRR', 'RrrrrreerrrrrR', 'RRrrrrrrrrrrRR', '..RRrrrrrrRR..', '....RRtttR....', '......t.......', '......t.......', '......b.......',
  ], { R: '#6a5a44', r: '#9a8a6a', e: '#2a2a2a', t: '#6a5a44', b: '#e0e0d0' })];
  SPR.crayfish = [mkSprite([
    'c.c.......', '.ccc.cccc.', 'cCCCcccccC', '.ccc.cccc.', 'c.c.......',
  ], { c: '#8a3a2a', C: '#c05a3a' }), mkSprite([
    '..c......c', 'c.cc.cccc.', '.CCCcccccC', 'c.cc.cccc.', '..c......c',
  ], { c: '#8a3a2a', C: '#c05a3a' })];
  SPR.crab = [mkSprite([
    'C.C....C.C', '.CccccccC.', 'CccEccEccC', '.cccccccc.', 'c.c.cc.c.c',
  ], { C: '#3a6ab0', c: '#5a8ad0', E: '#e0e0e0' }), mkSprite([
    '.C.C..C.C.', 'C.cccccc.C', '.ccEccEcc.', 'C.cccccc.C', '.c.c.c.c.c',
  ], { C: '#3a6ab0', c: '#5a8ad0', E: '#e0e0e0' })];
  SPR.snail = [mkSprite(['.ss..', 'sSSs.', 'sSsSs', '.ss..', 'yyyy.'], { s: '#7a5a2a', S: '#c09a4a', y: '#c0b090' })];
  SPR.nutria = fishFrames(mkSprite([
    '................bb', '...............beb', '.............bbbwo', 'bbbbbbbbbbbbbbbb..', '.bbbbbbbbbbbbbbb..', '..bbbbbbbbbbbbb...', 'tt................',
  ], { b: '#6a4a2a', e: E, w: '#e0a040', o: '#3a2a1a', t: '#8a6a4a' }), 4);
  SPR.babygator = fishFrames(mkSprite([
    '.....gggggggg...', 'g..ggggggggggeg.', 'gggggggggggggggg', 'g..gggggggwwwwg.', '.....gg..gg.....',
  ], { g: '#4a6b2e', w: '#f4f1e6', e: '#e6c440' }), 4);
  // birds
  const flap = (W, g, h, b, l, extra) => [mkSprite([
    '..........WWW.............', '........WWWWWW............', '......WWWWWWW.............', '....WWWWWWW...............', '..WWWWWWW.........hhhbbbbb', 'llllggggggggggggggghheh...', '..llllggggggggggggghh.....', '......gggggggggg..........',
  ], Object.assign({ W, g, h, b, l, e: E }, extra || {})), mkSprite([
    '..................hhhbbbbb', 'llllggggggggggggggghheh...', '..llllggggggggggggghh.....', '......ggggggggggg.........', '.....WWWWWWWW.............', '.......WWWWWWW............', '.........WWWWW............', '...........WWW............',
  ], Object.assign({ W, g, h, b, l, e: E }, extra || {}))];
  SPR.anhingaFly = flap('#2a2a2a', '#1a1a1a', '#3a3a3a', '#d0c060', '#3a3a3a');
  SPR.ospreyFly = flap('#5a4a3a', '#3a2f24', '#e8e8e0', '#2a2a2a', '#d0a020');
  SPR.spoonbillFly = flap('#f0a0b0', '#e87a95', '#f0c0c8', '#c0c0b0', '#c04a60');
  SPR.pelicanFly = flap('#b0b0a8', '#8a8a80', '#e8e8e0', '#e0a040', '#4a4a44');
  SPR.vultureFly = flap('#1a1a1a', '#2a2a2a', '#3a2a2a', '#5a3a2a', '#2a2a2a');
  SPR.anhingaSwim = fishFrames(mkSprite([
    '..............hhbbbbbb', '..............heh.....', '..............hh......', '.............hh.......', 'bbbbbbbbbbbbbh........', '.bbbbbbbbbbbb.........', '..lll....lll..........',
  ], { h: '#2a2a2a', b: '#1a1a1a', e: '#d0c060', l: '#3a3a3a' }), 4);
  // land
  SPR.panther = [mkSprite([
    '....................tttt..', '..................tttt....', '...............ttt........', '.........tttttt...........', '.......ttt................', '.....ttt..................', '...ttt.......TTTTTTTT.....', '..tt.......TTTTTTTTTTT....', '.tt.......TTTTTTTTTTTTTT..', 'tt......TTTTTTTTTTTTTTTTT.', '.......TTTTTTTTTTTTTTTTeTT', '......TTTTTTTTTTTTTTTTTTnn', '......TTTTTTTTTTTTTTTTTTT.', '.....TTTTTTTTTTTTTTTTTTT..', '.....TT.TTT......TTT.TT...', '.....TT.TTT......TTT.TT...', '.....TT.TTT......TTT.TT...', '.....cc.ccc......ccc.cc...',
  ], { T: '#b08a50', t: '#a07a44', e: '#40e060', n: '#3a2a1a', c: '#8a6a3a' })];
  SPR.bear = [mkSprite([
    '..................BBBB....', '.....BBBBBBBBBBBBBBBBBB...', '..BBBBBBBBBBBBBBBBBBBBBB..', '.BBBBBBBBBBBBBBBBBBBBeBBB.', 'BBBBBBBBBBBBBBBBBBBBBBBBnn', 'BBBBBBBBBBBBBBBBBBBBBBBBB.', 'BBBBBBBBBBBBBBBBBBBBBBBB..', '.BBBBBBBBBBBBBBBBBBBBBB...', '.BBB..BBBB.....BBBB..BBB..', '.BBB..BBBB.....BBBB..BBB..', '.ccc..cccc.....cccc..ccc..',
  ], { B: '#2a1e18', e: '#c08030', n: '#4a3a2a', c: '#c0b0a0' })];
  SPR.armadillo = [mkSprite([
    '....aaaaaa....', '..aaAaAaAaaa..', '.aaAaAaAaAaaah', 'aaaaaaaaaaaahe', '.aaaaaaaaaaah.', '..l.l....l.l..',
  ], { a: '#9a8a70', A: '#7a6a50', h: '#8a7a60', e: E, l: '#5a4a3a' })];
  SPR.iguana = [mkSprite([
    'ttt...........................', '.tttttttt.....................', '........ttttt.................', '............gggggggggg........', '...........ggggggggggggg......', '..........gggggggggggggggheh..', '..........gggggggggggggghhhbb', '...........ggggggggggggghh....', '............l..l....l..l......', '............l..l....l..l......',
  ], { t: '#5a7a3a', g: '#7aaa4a', h: '#8aba5a', e: E, b: '#e0a040', l: '#4a6a2a' })];
  SPR.coyote = [mkSprite([
    '....................hh....', '...................hhhh...', '..................hhhehh..', '.......ggggggggggghhhhhnn.', '....gggggggggggggggghhh...', 'ttggggggggggggggggggg.....', 'tggggggggggggggggggg......', '..gg..ggg.....ggg..gg.....', '..gg..ggg.....ggg..gg.....', '..cc..ccc.....ccc..cc.....',
  ], { g: '#8a7a5a', h: '#9a8a6a', t: '#6a5a3a', e: E, n: '#2a2a2a', c: '#5a4a3a' })];
  SPR.ranger = [mkSprite([
    '.hhhhh..', '..sss...', '..sss...', '.ccccc..', 'cccccccc', 'cccccc..', '.ccccc..', '.ppppp..', '.pp.pp..', '.pp.pp..', '.pp.pp..', '.bb.bb..',
  ], { h: '#3a5a2a', s: '#c09070', c: '#4a6a30', p: '#3a4a28', b: '#222' })];
  SPR.dragonfly = [mkSprite(['.WW.WW.', 'bbbbbbb', '.WW.WW.'], { W: '#a0e0f0', b: '#40a0c0' }), mkSprite(['.......', 'WWWWWWW', 'bbbbbbb'], { W: '#a0e0f0', b: '#40a0c0' })];
})();

// ---------------------------------------------------------------------------
// data tables
// ---------------------------------------------------------------------------
Object.assign(FISH, {
  mullet: { frames: SPR.mullet, r: 4, hp: 3, mass: 4, speed: 95, band: [8, 90], school: [4, 8], sizeClass: 0.3, name: 'MULLET', flee: 110, gibs: 2, jumper: true },
  tilapia: { frames: SPR.tilapia, r: 4, hp: 4, mass: 5, speed: 60, band: [15, 220], school: [3, 6], sizeClass: 0.35, name: 'TILAPIA', flee: 100, gibs: 2 },
  peacock: { frames: SPR.peacock, r: 5, hp: 12, mass: 10, speed: 105, band: [20, 260], school: [1, 3], sizeClass: 0.6, name: 'PEACOCK BASS', flee: 130, gibs: 3, aggr: 4, aggrMax: 1.3 },
  bowfin: { frames: SPR.bowfin, r: 5, hp: 18, mass: 14, speed: 70, band: [60, 400], school: [1, 2], sizeClass: 0.7, name: 'BOWFIN', flee: 90, gibs: 3, aggr: 5, aggrMax: 1.5 },
  snook: { frames: SPR.snook, r: 6, hp: 22, mass: 20, speed: 120, band: [20, 300], school: [1, 3], sizeClass: 0.9, name: 'SNOOK', flee: 140, gibs: 3 },
  eel: { frames: SPR.eel, r: 4, hp: 16, mass: 12, speed: 80, band: [300, 900], nearFloor: true, school: [1, 1], sizeClass: 0.6, name: 'AMERICAN EEL', flee: 80, gibs: 3, shock: 6 },
  grouper: { frames: SPR.grouper, r: 12, hp: 300, mass: 380, speed: 55, band: [400, 900], school: [1, 1], sizeClass: 4.2, name: 'GOLIATH GROUPER', flee: 70, gibs: 6, pred: 16 },
  sawfish: { frames: SPR.sawfish, r: 10, hp: 240, mass: 320, speed: 110, band: [200, 800], school: [1, 1], sizeClass: 4.0, name: 'SMALLTOOTH SAWFISH', flee: 90, gibs: 5, aggr: 14, aggrMax: 5 },
  nutria: { frames: SPR.nutria, r: 5, hp: 14, mass: 20, speed: 110, band: [4, 60], school: [1, 3], sizeClass: 0.8, name: 'NUTRIA', flee: 150, gibs: 3, mammal: true },
  babygator: { frames: SPR.babygator, r: 4, hp: 8, mass: 10, speed: 85, band: [4, 120], school: [2, 5], sizeClass: 0.5, name: 'GATOR HATCHLING', flee: 120, gibs: 2 },
});
const BOTTOM = {
  crayfish: { frames: SPR.crayfish, r: 3, hp: 4, mass: 3, sizeClass: 0.18, name: 'CRAYFISH', speed: 26, armor: 3, gibs: 2, shell: true },
  crab: { frames: SPR.crab, r: 4, hp: 8, mass: 5, sizeClass: 0.3, name: 'BLUE CRAB', speed: 34, armor: 6, gibs: 2, pinch: 3, shell: true },
  snail: { frames: SPR.snail, r: 3, hp: 3, mass: 2, sizeClass: 0.15, name: 'APPLE SNAIL', speed: 6, armor: 4, gibs: 1, shell: true },
};
Object.assign(BIRDS, {
  anhinga: { fly: SPR.anhingaFly, hp: 12, mass: 18, sizeClass: 0.8, name: 'ANHINGA', feathers: '#2a2a2a', speed: 105, r: 6, diver: 'swim' },
  osprey: { fly: SPR.ospreyFly, hp: 14, mass: 22, sizeClass: 0.9, name: 'OSPREY', feathers: '#c8c0b0', speed: 140, r: 7, diver: 'plunge' },
  spoonbill: { fly: SPR.spoonbillFly, stand: SPR.heron, hp: 12, mass: 20, sizeClass: 0.8, name: 'ROSEATE SPOONBILL', feathers: '#f0a0b0', speed: 100, r: 6, flee: 130 },
  pelican: { fly: SPR.pelicanFly, hp: 18, mass: 30, sizeClass: 1.0, name: 'BROWN PELICAN', feathers: '#d8d8d0', speed: 115, r: 8, diver: 'plunge' },
  vulture: { fly: SPR.vultureFly, hp: 10, mass: 16, sizeClass: 0.7, name: 'BLACK VULTURE', feathers: '#2a2a2a', speed: 85, r: 6, scavenger: true },
});
Object.assign(LAND, {
  panther: { spr: SPR.panther, hp: 80, mass: 110, sizeClass: 2.3, name: 'FLORIDA PANTHER', speed: 220, flee: 60, r: 10, gibs: 5, charge: 22, h: 9, hunter: true },
  bear: { spr: SPR.bear, hp: 160, mass: 260, sizeClass: 3.2, name: 'BLACK BEAR', speed: 130, flee: 50, r: 12, gibs: 6, charge: 30, h: 6 },
  armadillo: { spr: SPR.armadillo, hp: 14, mass: 12, sizeClass: 0.6, name: 'ARMADILLO', speed: 70, flee: 80, r: 6, gibs: 3, h: 3, armor: 6 },
  iguana: { spr: SPR.iguana, hp: 16, mass: 18, sizeClass: 0.9, name: 'GREEN IGUANA', speed: 120, flee: 110, r: 7, gibs: 3, h: 5 },
  coyote: { spr: SPR.coyote, hp: 34, mass: 45, sizeClass: 1.4, name: 'COYOTE', speed: 180, flee: 90, r: 8, gibs: 4, charge: 10, h: 5, hunter: true },
  ranger: { spr: SPR.ranger, hp: 25, mass: 70, sizeClass: 2.0, name: 'RANGER', speed: 140, flee: 130, r: 6, gibs: 4, human: true, h: 6 },
});

// ---------------------------------------------------------------------------
// NPC predation: the swamp eats itself
// ---------------------------------------------------------------------------
const Eco = {
  // find prey for a predator: smaller, alive, nearby, not the player
  findPrey(hunter, range, maxSize, filter) {
    let best = null, bestD = range;
    for (const e of G.ents) {
      if (e === hunter || e.dead || e.remove || !e.edible) continue;
      if (e.type === 'gib' || e.type === 'proj' || e.type === 'boat' || e.type === 'structure') continue;
      if (e.sizeClass > maxSize) continue;
      if (filter && !filter(e)) continue;
      const d = dist(hunter.x, hunter.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  },
  // one animal eats another: gore, a popup if on screen, and score for nobody
  devour(hunter, prey, opts = {}) {
    if (!prey || prey.dead) return;
    G.fx.gore(prey.x, prey.y, 70, 0, 0, prey.mass > 60);
    if (prey.feathers) G.fx.feathers(prey.x, prey.y, 8, prey.feathers);
    prey.gulped = !!opts.whole;
    prey.dead = true; prey.remove = true;
    if (!opts.whole) prey.explode(0.5);
    SFX.crunch(prey.sizeClass, prey.pan);
    if (Math.abs(prey.x - G.player.x) < 400) G.fx.text(prey.x, prey.y - 12, opts.label || 'EATEN', { color: '#c0a0a0', scale: 1 });
  },
};

// ---------------------------------------------------------------------------
// bottom crawlers: crayfish, crabs, snails
// ---------------------------------------------------------------------------
class Bottom extends Entity {
  constructor(x, kind) {
    super(x, 0); const d = BOTTOM[kind]; this.def = d; this.kind = kind;
    Object.assign(this, { frames: d.frames, r: d.r, hp: d.hp, maxHp: d.hp, mass: d.mass, sizeClass: d.sizeClass, name: d.name, armor: d.armor || 0, gibs: d.gibs });
    this.type = 'bottom'; this.y = World.floorY(x) - 2; this.dir = chance(0.5) ? 1 : -1; this.facing = this.dir; this.layer = -1;
    this.retarget = rand(0.5, 2); this.scuttle = 0; this.bloodColors = ['#7a3010', '#a05020', '#c07040'];
  }
  update(dt) {
    this.tick(dt); const P = G.player;
    this.y = World.floorY(this.x) - 2;
    this.retarget -= dt;
    const scared = this.senses(60) || (P.st.magnet && this.distTo(P) < P.st.magnet);
    if (scared) { this.dir = sign(this.x - P.x) || 1; this.scuttle = 0.8; }
    if (this.retarget <= 0) { this.retarget = rand(1.5, 4); if (!scared) this.dir = chance(0.5) ? 1 : -1; }
    const sp = this.def.speed * (this.scuttle > 0 ? 2.2 : 1) * (1 - this.slow);
    if (this.scuttle > 0) this.scuttle -= dt;
    this.x += this.dir * sp * dt; this.facing = this.dir;
    if (this.def.pinch && !P.dead && P.size < 1.2 && P.nearestDist(this.x, this.y) < 10 && chance(dt * 1.5)) { P.hurt(this.def.pinch, this, 'bite'); SFX.clank(this.pan); }
    this.animate(dt, this.scuttle > 0 ? 12 : 4);
    if (chance(dt * 0.4)) G.fx.add({ type: 'foam', x: this.x, y: this.y + 2, vx: 0, vy: 0, s: 1, life: 0.4 });
  }
  takeDamage(dmg, src, opts) {
    if (this.def.shell && this.armor > 0 && (dmg >= this.armor || opts.pierce)) {
      this.armor = 0; G.fx.splinters(this.x, this.y, 6, 60); SFX.splinter(this.pan);
      if (src === G.player) Meta.event('crack');
    }
    return super.takeDamage(dmg, src, opts);
  }
}
// ---------------------------------------------------------------------------
// stingray: rests on the bottom, stings what steps on it
// ---------------------------------------------------------------------------
class Ray extends Entity {
  constructor(x) {
    super(x, 0); this.frames = SPR.ray; this.r = 7; this.hp = 26; this.maxHp = 26; this.mass = 30; this.sizeClass = 1.1; this.name = 'SOUTHERN STINGRAY'; this.type = 'ray'; this.gibs = 4;
    this.y = World.floorY(x) - 3; this.buried = true; this.glide = 0; this.retarget = rand(3, 8); this.stingCd = 0; this.layer = -1;
  }
  update(dt) {
    this.tick(dt); const P = G.player; this.stingCd -= dt;
    const near = P.nearestDist(this.x, this.y) < 26 + 6 * P.size;
    if (this.buried) {
      this.y = World.floorY(this.x) - 3; this.vx *= 0.9;
      if (near || this.senses(70)) { this.buried = false; this.glide = rand(1.5, 3); this.vy = -50; this.vx = sign(this.x - P.x) * 60; G.fx.smoke(this.x, this.y + 2, 5, '#6b5a3a'); }
      this.retarget -= dt; if (this.retarget <= 0) { this.retarget = rand(4, 10); this.buried = false; this.glide = rand(1, 2.5); this.vy = -30; this.vx = (chance(0.5) ? 1 : -1) * 40; }
    } else {
      this.glide -= dt; this.vy = approach(this.vy, Math.sin(this.t * 3) * 24, 120 * dt); this.vx = approach(this.vx, sign(this.vx || 1) * 55 * (1 - this.slow), 60 * dt);
      this.move(dt); this.clampWater(6); this.facing = sign(this.vx || 1);
      if (this.glide <= 0 && this.y > World.floorY(this.x) - 14) { this.buried = true; G.fx.smoke(this.x, this.y, 4, '#6b5a3a'); }
    }
    if (near && this.stingCd <= 0 && !P.dead) { this.stingCd = 3; P.hurt(9, this, 'bite'); P.envenom(4, 4); G.fx.text(P.x, P.y - 20, 'STUNG!', { color: '#60ff60' }); SFX.hurt(); }
  }
  draw(ctx) {
    const s = this.spr, img = this.flash > 0 ? spriteWhite(s) : s;
    if (this.buried) { ctx.globalAlpha = 0.55; drawSpr(ctx, img, this.x, this.y, 0, this.facing, 0.7); ctx.globalAlpha = 1; }
    else drawSpr(ctx, img, this.x, this.y, clamp(this.vy / 200, -0.3, 0.3), this.facing, 1 + Math.sin(this.t * 4) * 0.12);
  }
}
// ---------------------------------------------------------------------------
// diving birds: anhinga swims after fish, osprey and pelican plunge from the sky
// ---------------------------------------------------------------------------
class DiveBird extends Bird {
  get diving() { return this.phase === 'plunge' || this.phase === 'swimdive' || !!this.carry; }
  constructor(x, y, kind, dir) {
    super(x, y, kind, 'fly', dir);
    this.hunt = null; this.phase = 'cruise'; this.phaseT = rand(0.5, 2.5); this.carry = null; this.carryT = 0; this.swimT = 0;
  }
  update(dt) {
    const d = this.def, P = G.player;
    if (this.mode === 'drown' || this.phase === 'cruise' || this.phase === 'leave') { this.phaseT -= dt; }
    if (this.carry) { // flying off with a meal, swallowed once clear of the water
      if (this.carry.dead || this.carry.remove) { this.carry = null; this.carryT = 0; }
      else {
        this.carryT += dt;
        this.carry.x = this.x; this.carry.y = this.y + 5; this.carry.vx = this.vx; this.carry.vy = this.vy;
        this.carry.stun = 1; this.carry.aware = true;
        if (chance(dt * 8)) G.fx.blood(this.carry.x, this.carry.y, 1, 0, 0, 20, this.carry.bloodColors);
        if (this.carryT > 2.6 && this.y < World.surface(this.x) - 20) { Eco.devour(this, this.carry, { label: 'SNATCHED' }); this.carry = null; this.carryT = 0; }
      }
    }
    // divers patrol the player's stretch of water instead of flying off forever
    if (this.mode === 'fly' && !this.carry && this.phase !== 'plunge' && this.phase !== 'swimdive') {
      const off = this.x - P.x;
      if (Math.abs(off) > 420 && sign(this.vx || this.dir) === sign(off)) { this.dir = -sign(off); this.escaping = 0; }
    }
    if (this.phase === 'cruise' && this.phaseT <= 0 && !this.carry && this.mode === 'fly') {
      const prey = Eco.findPrey(this, 280, 0.7, e => e.type === 'fish' && e.y < (d.diver === 'swim' ? 240 : 130) && e.y > 0);
      if (prey) { this.hunt = prey; this.phase = d.diver === 'swim' ? 'swimdive' : 'plunge'; this.phaseT = 4; SFX.bird(this.pan); }
      else this.phaseT = rand(1, 3);
    }
    if (this.phase === 'plunge') {
      this.phaseT -= dt;
      const h = this.hunt;
      if (!h || h.dead || h.remove || this.phaseT <= 0) { this.phase = 'leave'; this.phaseT = 3; this.hunt = null; }
      else {
        const dx = h.x - this.x, dy = h.y - this.y, dd = Math.hypot(dx, dy) || 1;
        this.vx = dx / dd * 260; this.vy = dy / dd * 300; this.x += this.vx * dt; this.y += this.vy * dt;
        this.facing = sign(this.vx || 1); this.angle = clamp(Math.atan2(this.vy, Math.abs(this.vx)), -1.2, 1.2);
        this.wingT += dt * 4; this.frame = 0;
        if (this.y > World.surface(this.x) && !this.splashed) { this.splashed = true; G.fx.splash(this.x, 1.2, this.vx); SFX.splash(1); }
        if (dd < 12) { this.carry = h; this.carryT = 0; h.stun = 9; h.aware = true; this.phase = 'leave'; this.phaseT = 3; this.vy = -200; G.fx.splash(this.x, 1.4, 0); G.fx.blood(h.x, h.y, 6, 0, 0, 40, h.bloodColors); if (Math.abs(this.x - P.x) < 400) G.fx.text(this.x, this.y - 14, 'SNATCHED!', { color: '#ffd0a0' }); }
      }
      return;
    }
    if (this.phase === 'swimdive') {
      this.phaseT -= dt; this.swimT += dt;
      const h = this.hunt, s = World.surface(this.x);
      if (!h || h.dead || h.remove || this.phaseT <= 0 || this.swimT > 7) { this.phase = 'leave'; this.phaseT = 3; this.hunt = null; this.swimT = 0; if (this.y > s) { this.vy = -120; G.fx.splash(this.x, 0.8, 0); } }
      else {
        const dx = h.x - this.x, dy = h.y - this.y, dd = Math.hypot(dx, dy) || 1;
        const sp = this.y > s ? 150 : 240;
        this.vx = approach(this.vx, dx / dd * sp, 500 * dt); this.vy = approach(this.vy, dy / dd * sp, 500 * dt);
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.facing = sign(this.vx || 1); this.angle = clamp(Math.atan2(this.vy, Math.abs(this.vx)), -1, 1);
        if (!this.splashed && this.y > s) { this.splashed = true; G.fx.splash(this.x, 0.9, this.vx); }
        if (this.y > s && chance(dt * 6)) G.fx.bubbles(this.x, this.y, 1, 3);
        if (dd < 10) { Eco.devour(this, h, { label: 'SPEARED' }); this.hunt = null; this.phase = 'leave'; this.phaseT = 3; this.vy = -100; }
      }
      // the player can eat a diving bird
      if (!P.dead && P.nearestDist(this.x, this.y) < 4 * P.size && P.size > 1.4) this.aware = true;
      return;
    }
    if (this.phase === 'leave') { this.splashed = false; if (this.phaseT <= 0) { this.phase = 'cruise'; this.phaseT = rand(3, 8); } if (this.mode !== 'drown') { this.escaping = Math.max(this.escaping || 0, 0.2); } }
    super.update(dt);
  }
  get spr() {
    if (this.def.diver === 'swim' && (this.phase === 'swimdive' && this.y > World.surface(this.x))) return SPR.anhingaSwim[this.frame % 2];
    return super.spr;
  }
}
// ---------------------------------------------------------------------------
// vulture: circles carrion, lands on it, eats it
// ---------------------------------------------------------------------------
class Vulture extends Bird {
  constructor(x, y, dir) { super(x, y, 'vulture', 'fly', dir); this.target = null; this.circleA = rand(TAU); this.eatT = 0; this.landed = false; }
  update(dt) {
    const P = G.player;
    if (!this.target || this.target.remove || this.target.dead === false) {
      if (chance(dt * 1.5)) {
        let best = null, bestD = 700;
        for (const e of G.ents) { if (e.type !== 'gib' || !e.edible) continue; if (World.floorY(e.x) > 6) continue; const d = dist(this.x, this.y, e.x, e.y); if (d < bestD) { bestD = d; best = e; } }
        this.target = best;
      }
    }
    if (this.target && !this.target.remove) {
      const t = this.target, gy = World.floorY(t.x) - 6;
      if (this.landed) {
        this.y = gy; this.vx = 0; this.vy = 0; this.eatT += dt; this.frame = 0;
        if (chance(dt * 5)) G.fx.blood(t.x, t.y - 2, 1, 0, 0, 20, BLOOD_COLORS);
        if (this.eatT > 2.5) { t.remove = true; this.target = null; this.landed = false; this.eatT = 0; this.vy = -120; this.escaping = 1.5; }
        if (this.senses(80)) { this.landed = false; this.vy = -140; this.escaping = 2; this.target = null; }
        return;
      }
      const dx = t.x - this.x, dy = gy - this.y, dd = Math.hypot(dx, dy) || 1;
      if (dd < 14) { this.landed = true; this.eatT = 0; return; }
      this.vx = approach(this.vx, dx / dd * 110, 200 * dt); this.vy = approach(this.vy, dy / dd * 110, 200 * dt);
      this.x += this.vx * dt; this.y += this.vy * dt; this.facing = sign(this.vx || 1);
      this.wingT += dt * 5; this.frame = Math.sin(this.wingT) > 0 ? 0 : 1;
      this.angle = clamp(this.vy / 300, -0.3, 0.3);
      return;
    }
    // idle soaring circle
    this.circleA += dt * 0.45;
    this.flyH = -150 + Math.sin(this.circleA) * 30;
    super.update(dt);
  }
}
// ---------------------------------------------------------------------------
// jumping mullet schools: leap out of the water in bursts
// ---------------------------------------------------------------------------
class Mullet extends Fish {
  constructor(x, y, leader) { super(x, y, 'mullet', leader); this.jumpT = rand(2, 8); this.airborne = false; }
  update(dt) {
    const s = World.surface(this.x);
    if (this.airborne) {
      this.tick(dt); this.vy += 620 * dt; this.move(dt);
      this.angle = clamp(Math.atan2(this.vy, this.vx), -1.2, 1.2); this.facing = sign(this.vx || 1);
      this.animate(dt, 14);
      if (this.y > s) { this.airborne = false; G.fx.splash(this.x, 0.5, this.vx); SFX.splash(0.4, this.pan); this.vy *= 0.3; }
      return;
    }
    super.update(dt);
    this.jumpT -= dt;
    const spooked = this.state === 'flee';
    if ((this.jumpT <= 0 || (spooked && chance(dt * 2))) && this.y < s + 40 && this.y > s) {
      this.jumpT = rand(4, 12); this.airborne = true; this.vy = -rand(150, 260); this.vx = rand(-70, 70) + (spooked ? sign(this.x - G.player.x) * 90 : 0);
      G.fx.splash(this.x, 0.5, this.vx); SFX.splash(0.4, this.pan);
    }
  }
}
// ---------------------------------------------------------------------------
// ambient dragonflies over the water
// ---------------------------------------------------------------------------
class Dragonfly extends Entity {
  constructor(x) { super(x, -6); this.frames = SPR.dragonfly; this.r = 2; this.hp = 1; this.maxHp = 1; this.mass = 0.2; this.sizeClass = 0.05; this.name = 'DRAGONFLY'; this.type = 'bug'; this.gibs = 1; this.layer = 2; this.tx = x; this.ty = -8; this.retarget = 0; this.edible = true; }
  update(dt) {
    this.tick(dt); this.retarget -= dt;
    if (this.retarget <= 0) { this.retarget = rand(0.4, 1.4); this.tx = this.x + rand(-70, 70); this.ty = World.surface(this.tx) - rand(3, 26); }
    this.swimToward(this.tx, this.ty, 90, 6, dt); this.move(dt);
    this.facing = sign(this.vx || 1); this.animate(dt, 22);
    if (Math.abs(this.x - G.player.x) > 700) this.remove = true;
  }
}
