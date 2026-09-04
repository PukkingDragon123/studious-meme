'use strict';
// ---------- sprite construction ----------
function mkSprite(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = mkCanvas(w, h), x = c.getContext('2d');
  for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) {
    const ch = rows[j][i]; if (ch === '.' || ch === ' ') continue;
    const col = pal[ch]; if (!col) continue;
    x.fillStyle = col; x.fillRect(i, j, 1, 1);
  }
  return { c, w, h };
}
function spriteFlipX(s) {
  if (s.flipX) return s.flipX;
  const c = mkCanvas(s.w, s.h), x = c.getContext('2d');
  x.translate(s.w, 0); x.scale(-1, 1); x.drawImage(s.c, 0, 0);
  return (s.flipX = { c, w: s.w, h: s.h });
}
function spriteWhite(s) {
  if (s.white) return s.white;
  const c = mkCanvas(s.w, s.h), x = c.getContext('2d');
  x.drawImage(s.c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, s.w, s.h);
  return (s.white = { c, w: s.w, h: s.h });
}
function spriteTint(s, color, alpha) {
  const c = mkCanvas(s.w, s.h), x = c.getContext('2d');
  x.drawImage(s.c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = alpha; x.fillStyle = color; x.fillRect(0, 0, s.w, s.h);
  return { c, w: s.w, h: s.h };
}
// squash the tail columns to create a swim frame
function fishFrames(s, tailW) {
  const c = mkCanvas(s.w, s.h), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(s.c, tailW, 0, s.w - tailW, s.h, tailW, 0, s.w - tailW, s.h);
  const sq = Math.max(1, Math.round(s.h * 0.55)), oy = Math.round((s.h - sq) / 2);
  x.drawImage(s.c, 0, 0, tailW, s.h, 0, oy, tailW, sq);
  return [s, { c, w: s.w, h: s.h }];
}
// draw sprite centered at (x,y) with rotation; sy negative flips belly-side
function drawSpr(ctx, s, x, y, angle = 0, sx = 1, sy = 1, ox, oy) {
  ctx.save(); ctx.translate(x, y); if (angle) ctx.rotate(angle); ctx.scale(sx, sy);
  ctx.drawImage(s.c, -(ox === undefined ? s.w / 2 : ox), -(oy === undefined ? s.h / 2 : oy));
  ctx.restore();
}
// split a sprite into n rectangular pieces (for gibs)
function sliceSprite(s, n) {
  const pieces = [];
  const horiz = s.w >= s.h;
  const len = horiz ? s.w : s.h;
  const cuts = [0];
  for (let i = 1; i < n; i++) cuts.push(Math.round(len * i / n + rand(-len / (n * 3), len / (n * 3))));
  cuts.push(len); cuts.sort((a, b) => a - b);
  for (let i = 0; i < n; i++) {
    const a = clamp(cuts[i], 0, len), b = clamp(cuts[i + 1], 0, len);
    if (b - a < 1) continue;
    if (horiz) pieces.push({ sx: a, sy: 0, sw: b - a, sh: s.h });
    else pieces.push({ sx: 0, sy: a, sw: s.w, sh: b - a });
  }
  // sometimes split a big piece vertically too
  if (pieces.length && s.h > 8 && s.w > 8 && chance(0.6)) {
    const p = pieces.splice(randi(0, pieces.length - 1), 1)[0];
    if (horiz) { const cy = Math.round(p.sh / 2); pieces.push({ sx: p.sx, sy: 0, sw: p.sw, sh: cy }, { sx: p.sx, sy: cy, sw: p.sw, sh: p.sh - cy }); }
    else { const cx = Math.round(p.sw / 2); pieces.push({ sx: 0, sy: p.sy, sw: cx, sh: p.sh }, { sx: cx, sy: p.sy, sw: p.sw - cx, sh: p.sh }); }
  }
  return pieces;
}

// ---------- creature sprites (all face right) ----------
const SPR = {};
(function buildSprites() {
  const E = '#111111';
  SPR.minnow = fishFrames(mkSprite(['S...ssss.', 'sSssssses', 'S...ssss.'], { s: '#c4d3dd', S: '#7f95a8', e: E }), 2);
  SPR.bluegill = fishFrames(mkSprite([
    '......GGGG..', 'G....GggggG.', 'GG..GgggggGG', 'GGG.GgggOeGG', 'GGGGGgyyyggm', 'GG..Gyyyyyg.', 'G....GyyyG..', '......GGG...',
  ], { G: '#2b5230', g: '#4f8a52', y: '#d9a83c', O: '#1c3020', e: E, m: '#1a1a1a' }), 4);
  SPR.bass = fishFrames(mkSprite([
    '........GGGGGG....', 'G......GggggggG...', 'GG...GGgggggggGG..', 'GGG.GgggggggggeGG.', 'GGGGgggggggggggggm', 'GG..GgllllllllllG.', 'G....GllllllllG...', '......GGGGGG......',
  ], { G: '#33451f', g: '#607a3a', l: '#c1c78f', e: E, m: '#1a1a1a' }), 4);
  SPR.catfish = fishFrames(mkSprite([
    '.........BBBBBB...', 'B.......BbbbbbbB..', 'BB....BBbbbbbbbbB.', 'BBB.BBbbbbbbbbeBBw', 'BBBBbbbbbbbbbbbbBw', 'BB..BBllllllllBB.w', 'B.....BBBBBBBB....',
  ], { B: '#3a2a1a', b: '#6b4b2e', l: '#b09a70', e: E, w: '#2a2a2a' }), 4);
  SPR.gar = fishFrames(mkSprite([
    'A......AAAAAAAAAAA........', 'AA...AAaaaaaaaaaaaAAAAAAA.', 'AAAAAaaaaaaaaaaaeaaaaattAA', 'AA...AAlllllllllllAAAAAAA.', 'A......AAAAAAAAAA.........',
  ], { A: '#3e4a2e', a: '#7b8a58', l: '#b5bb8f', e: '#e0c020', t: '#f0f0e0' }), 5);
  SPR.tarpon = fishFrames(mkSprite([
    '............SSSSSSSSSS......', 'S..........SssssssssssS.....', 'SS.......SSsssssssssssSS....', 'SSS....SSsssssssssssssseSS..', 'SSSS.SSssssssssssssssssssSSm', 'SSS..SSwwwwwwwwwwwwwwwwwwS..', 'SS....SSwwwwwwwwwwwwwwwS....', 'S.......SSwwwwwwwwwwS.......', '..........SSSSSSSSS.........',
  ], { S: '#5a6f7a', s: '#a9bfc8', w: '#e2ecef', e: E, m: '#1a1a1a' }), 5);
  SPR.frog = [mkSprite(['.GG...GG.', 'GeGgggGeG', '.ggggggg.', 'ggggggggg', 'Gyyyyyyy.', 'G.G...G.G'], { G: '#2f5a1e', g: '#5f9e3a', y: '#cfe08a', e: E })];
  SPR.turtle = [mkSprite([
    '.....SSSSSS.....', '...SsSsSsSsS....', '..SSsSsSsSsSS...', '.SsSsSsSsSsSsS..', '.SSSSSSSSSSSSShh', '..LLLL....LLLhhe', '..LL.L....LL.hhh', '...L.L.....L.L..',
  ], { S: '#3b4a2a', s: '#6e7f3e', L: '#5a5a3a', h: '#7d8a48', e: E })];
  SPR.duck = [mkSprite([
    '.......hhh.', '......hheh.', '......hhhbb', '.BBBBBhhh..', 'bBBBBBBhh..', 'bBBBBBBB...', '.BBBBBB....', '..wwww.....',
  ], { h: '#2d6a3e', e: E, b: '#e0a030', B: '#6b4a30', w: '#e8e0d0' })];
  SPR.heron = [mkSprite([
    '.........hhhbbbb', '.........heh....', '..........hh....', '.........hh.....', '.........h......', '........hh......', '.......hh.......', '..gggggh........', '.gggggggg.......', 'gggggggggg......', '.ggggggggg......', '..gggggggg......', '...ggggggg......', '....ggggg.......', '.....g..g.......', '.....l..l.......', '.....l..l.......', '.....l..l.......', '.....l..l.......', '.....l..l.......', '....ll..ll......',
  ], { h: '#8fa3b5', g: '#6f8798', b: '#e0b040', e: E, l: '#4a4a3a' })];
  const flyRows = (W, g, h, b, l) => [mkSprite([
    '..........WWW.............', '........WWWWWW............', '......WWWWWWW.............', '....WWWWWWW...............', '..WWWWWWW.........hhhbbbbb', 'llllggggggggggggggghheh...', '..llllggggggggggggghh.....', '......gggggggggg..........',
  ], { W, g, h, b, l, e: E }), mkSprite([
    '..................hhhbbbbb', 'llllggggggggggggggghheh...', '..llllggggggggggggghh.....', '......ggggggggggg.........', '.....WWWWWWWW.............', '.......WWWWWWW............', '.........WWWWW............', '...........WWW............',
  ], { W, g, h, b, l, e: E })];
  SPR.heronFly = flyRows('#7f95a8', '#6f8798', '#8fa3b5', '#e0b040', '#4a4a3a');
  SPR.egretFly = flyRows('#f2f2ea', '#e2e2d8', '#f2f2ea', '#e0b040', '#333333');
  SPR.ibisFly = flyRows('#f4f0ea', '#e8e2d8', '#f4f0ea', '#d9573a', '#d9573a');
  SPR.raccoon = [mkSprite([
    '..............GG', '.............GeG', 'TtTt.......GGkkG', 'tTtTGGGGGGGGkkGG', 'TtTtGGGGGGGGGGGw', '.tTGGGGGGGGGGGG.', '..GGGGGGGGGGGG..', '...GG.GG.GG.GG..', '...G..G...G..G..',
  ], { G: '#6e6e6e', k: '#1a1a1a', e: '#ffffff', T: '#3a3a3a', t: '#9a9a9a', w: E })];
  SPR.deer = [mkSprite([
    '.....................aa...', '....................a.a...', '.....................aa...', '...................hhhh...', '..................hhehh...', '..................hhhhhh..', '..................hh..nn..', '.................hh.......', '.....bbbbbbbbbbbbhh.......', '....bbbbbbbbbbbbbh........', '...bbbbbbbbbbbbbbh........', '...bbbbbbbbbbbbbb.........', '...bbbbbbbbbbbbb..........', '...wbbbbbbbbbbbb..........', '....wwbbbbbbbbww..........', '....ll.....ll.............', '....ll.....ll.............', '....ll.....ll.............', '....ll.....ll.............', '....l.......l.............', '....l.......l.............', '...dd......dd.............',
  ], { a: '#6b4a2a', h: '#a67c52', e: E, n: '#222', b: '#b08050', w: '#efe6d2', l: '#8a6540', d: '#2a2018' })];
  SPR.boar = [mkSprite([
    '..............BBBB....', '.....BBBBBBBBBBBBBB...', '...BBBBBBBBBBBBBBBBB..', '..BBBBBBBBBBBBBBBBeBB.', '.BBBBBBBBBBBBBBBBBBBBB', '.BBBBBBBBBBBBBBBBBBBnn', '.BBBBBBBBBBBBBBBBBBtt.', '..BBBBBBBBBBBBBBBBB...', '..BBBBBBBBBBBBBBBB....', '...BB..BB....BB..BB...', '...BB..BB....BB..BB...', '...bb..bb....bb..bb...',
  ], { B: '#3a2a20', e: '#e0c030', n: '#5a4030', t: '#f0e8d8', b: '#1a1410' })];
  SPR.otter = fishFrames(mkSprite([
    '..................bb', '.................beb', '...............bbbbw', 'bbbbbbbbbbbbbbbbbb..', '.bbbbbbbbbbbbbbbbb..', '..bbbbbbbbbbbbbbb...', '....b..b.....b..b...',
  ], { b: '#5a3e2a', e: E, w: '#cccccc' }), 5);
  SPR.manatee = fishFrames(mkSprite([
    '..............gggggggggggggg............', '.........gggggggggggggggggggggggg.......', '......gggggggggggggggggggggggggggggg....', 'gg..ggggggggggggggggggggggggggggggggggg.', 'ggggggggggggggggggggggggggggggggggggeggg', 'gggggggggggggggggggggggggggggggggggggggw', 'gg..gggggggggggggggggggggggggggggggggwww', '......ggggggggggggglllllllllllllggggg...', '.........gggggggggllllllllllllllgg......', '............ggggg.gggggg..llllllg.......', '.................gggg.....ggggg.........',
  ], { g: '#7a8080', l: '#a0a6a6', e: E, w: '#555b5b' }), 6);
  SPR.shark = fishFrames(mkSprite([
    '..............gggg......................', '.............ggggg......................', '............gggggg......................', 'gg.......ggggggggggggggggg..............', 'ggg....ggggggggggggggggggggggg..........', '.ggggggggggggggggggggggggggggggggg......', '..gggggggggggggggggggggggggggggggggge...', '...ggggggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwm.', '..ggggggwwwwwwwwwwwwwwwwwwwwwwwwtwtwtw..', '.ggg.....wwwwwwwwwwwwwwwwwwwwwwwww......', 'gg..........gwwwwwwwwwwwwww.............', '............ggwwwww.....................', '.............ggg........................',
  ], { g: '#6a7f8a', w: '#d8dfe0', e: E, m: '#3a0a0a', t: '#ffffff' }), 6);
  SPR.human = [mkSprite([
    '..hhh...', '..sss...', '..sss...', '.ccccc..', 'cccccccc', 'cccccc..', '.ccccc..', '.ppppp..', '.pp.pp..', '.pp.pp..', '.pp.pp..', '.bb.bb..',
  ], { h: '#3a2a1a', s: '#e0b090', c: '#556b2f', p: '#3a3a4a', b: '#222' })];
  SPR.tourist = [mkSprite([
    '.hhhhh..', '..sss...', '..sss...', '.ccccc..', 'cccccccc', 'cccccc..', '.ccccc..', '.ppppp..', '.pp.pp..', '.pp.pp..', '.pp.pp..', '.bb.bb..',
  ], { h: '#e8d8a0', s: '#e0b090', c: '#d94a4a', p: '#3050a0', b: '#222' })];
  SPR.poacher = [mkSprite([
    '..hhh...', '..sss...', '..sss...', '.ccccc..', 'cccccccc', 'cccccc..', '.ccccc..', '.ppppp..', '.pp.pp..', '.pp.pp..', '.pp.pp..', '.bb.bb..',
  ], { h: '#5a3a1a', s: '#d0a080', c: '#4a4a30', p: '#2a3020', b: '#111' })];
  SPR.swimmer = [mkSprite([
    '..a......a....', '..a.hhhh.a....', '..a.sese.a....', '..aassssaa....', '...cccccc.....', '..cccccccc....',
  ], { a: '#e0b090', h: '#3a2a1a', s: '#e0b090', e: E, c: '#556b2f' }), mkSprite([
    '..............', '....hhhh......', 'a...sese...a..', '.aa.ssss.aa...', '...cccccc.....', '..cccccccc....',
  ], { a: '#e0b090', h: '#3a2a1a', s: '#e0b090', e: E, c: '#556b2f' })];
  SPR.kayak = [mkSprite([
    '............hhh.............', '............sss.............', '..........ccccccc...........', '.........ccccccccc..........', 'yyyyyyyyyyyyyyyyyyyyyyyyyyyy', '.yyyyyyyyyyyyyyyyyyyyyyyyyy.', '...YYYYYYYYYYYYYYYYYYYYYY...',
  ], { h: '#2a1a0a', s: '#e0b090', c: '#e0a020', y: '#d9573a', Y: '#a03a24' })];
  SPR.moccasinHead = mkSprite(['.BBBB..', 'BBeBBB.', 'BBBBBBt', '.BBBB..'], { B: '#2f2218', e: '#c0a030', t: '#e02020' });
  SPR.moccasinSeg = [mkSprite(['BBBB', 'BbbB', 'BbbB', 'BBBB'], { B: '#2f2218', b: '#5a4030' }), mkSprite(['bbbb', 'bBBb', 'bBBb', 'bbbb'], { B: '#2f2218', b: '#5a4030' })];
  SPR.pythonHead = mkSprite(['..tttttt..', '.tteettttt', 'ttttttttttt', 'tTTTtttttt', '..tttttt..'], { t: '#c8a86a', T: '#5a3a20', e: E });
  SPR.pythonSeg = [mkSprite(['.tttttt.', 'tttTTttt', 'ttTTTTtt', 'tttTTttt', 'ttttttty', '.tyyyyy.'], { t: '#c8a86a', T: '#5a3a20', y: '#e8d8a8' }), mkSprite(['.tttttt.', 'tttttttt', 'tTTttttt', 'ttTTtttt', 'ttttttty', '.tyyyyy.'], { t: '#c8a86a', T: '#5a3a20', y: '#e8d8a8' })];
  SPR.skunkape = [mkSprite([
    '..........FFFFFFFF..........', '........FFFFFFFFFFFF........', '.......FFFFffffffFFFF.......', '.......FFFfeffffefFFF.......', '.......FFFFffffffFFFF.......', '.......FFFFFfmmmfFFFF.......', '........FFFFFFFFFFFF........', '....FFFFFFFFFFFFFFFFFFFF....', '..FFFFFFFFFFFFFFFFFFFFFFFF..', '.FFFFFFFFFFFFFFFFFFFFFFFFFF.', 'FFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'FFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'FFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'FFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'FFFF.FFFFFFFFFFFFFFFFFF.FFFF', 'FFFF.FFFFFFFFFFFFFFFFFF.FFFF', 'FFFF.FFFFFFFFFFFFFFFFFF.FFFF', 'ffff.FFFFFFFFFFFFFFFFFF.ffff', 'ffff..FFFFFFFFFFFFFFFF..ffff', '......FFFFFFFFFFFFFFFF......', '......FFFFFFF..FFFFFFF......', '......FFFFFF....FFFFFF......', '......FFFFFF....FFFFFF......', '......FFFFFF....FFFFFF......', '......FFFFFF....FFFFFF......', '.....fffffff....fffffff.....',
  ], { F: '#2a1e14', f: '#5a4030', e: '#ff3020', m: '#1a0a0a' })];
  SPR.armGib = mkSprite(['sss', 'ssb', 'ssb'], { s: '#e0b090', b: '#8a1010' });
  SPR.lily = [mkSprite(['..gggggg..', '.gggGggggg', 'ggggggggg.'], { g: '#4f8a3a', G: '#2f5a24' }), mkSprite(['...pp.....', '..gggggg..', '.gggGggggg', 'ggggggggg.'], { g: '#4f8a3a', G: '#2f5a24', p: '#e88ab0' })];
  SPR.rock = [mkSprite(['..rrrr..', '.rrrRRr.', 'rrrRRRrr', 'rrrrrrrr', '.rrrrrr.'], { r: '#5a5f55', R: '#7a8075' }), mkSprite(['...rr...', '.rrrRr..', 'rrrRRrr.', 'rrrrrrrr'], { r: '#4f5449', R: '#6f746a' })];
  SPR.log = [mkSprite(['.bbbbbbbbbbbbbbbbbbb.', 'bBBbbbbbbbbbbbbbbbbBb', 'bBBbbbbBBbbbbbbBBbbBb', 'bBBbbbbbbbbbbbbbbbbBb', '.bbbbbbbbbbbbbbbbbbb.'], { b: '#4a3524', B: '#2e2016' })];
  SPR.skull = mkSprite(['.www.', 'wwwww', 'wewew', 'wwwww', '.w.w.'], { w: '#e8e2d0', e: '#222' });
  SPR.bullet = mkSprite(['yy'], { y: '#ffe080' });
  SPR.harpoon = mkSprite(['sssssssssst'], { s: '#777', t: '#ddd' });
  SPR.rockProj = mkSprite(['.rrr.', 'rrRrr', 'rrrrr', '.rrr.'], { r: '#5a5f55', R: '#7a8075' });
})();

// ---------- procedural crocodile ----------
// look: {back, mid, belly, dark, eye, pupil, tooth, mouth, spikes, plates, glow, scars, spots, stripes}
const CROC_LOOKS = {
  base: { back: '#4a6b2e', mid: '#6f8f3f', belly: '#c9c48a', dark: '#22301a', eye: '#e6c440', pupil: '#111111', tooth: '#f4f1e6', mouth: '#7a1f2b' },
  ripper: { back: '#5c2b26', mid: '#8e3b30', belly: '#d0a58a', dark: '#2a1210', eye: '#ff4a20', pupil: '#200000', tooth: '#f4f1e6', mouth: '#5a0f18' },
  behemoth: { back: '#3d4a3c', mid: '#5e6d52', belly: '#aaa88c', dark: '#1d241b', eye: '#e0b030', pupil: '#111111', tooth: '#f4f1e6', mouth: '#6a1f28' },
  phantom: { back: '#1f2a44', mid: '#31476f', belly: '#8aa0c2', dark: '#0b1020', eye: '#e8f4ff', pupil: '#3060a0', tooth: '#f4f1e6', mouth: '#3a1030' },
  abyssal: { back: '#3a2450', mid: '#5c3c7e', belly: '#8fb8b0', dark: '#160c22', eye: '#40ffd0', pupil: '#103030', tooth: '#f4f1e6', mouth: '#4a1040' },
  gator: { back: '#3a4a2a', mid: '#586e38', belly: '#b8b48a', dark: '#1a2212', eye: '#d8c040', pupil: '#111111', tooth: '#f4f1e6', mouth: '#7a1f2b' },
  oldscar: { back: '#2c3520', mid: '#4a5a30', belly: '#a8a080', dark: '#121810', eye: '#ffffff', pupil: '#111111', tooth: '#f4f1e6', mouth: '#6a1020', scars: true, spikes: 1 },
};
function mixLook(a, b, t) {
  const o = Object.assign({}, a);
  for (const k of ['back', 'mid', 'belly', 'dark', 'eye', 'pupil', 'mouth']) o[k] = mixColor(a[k], b[k], t);
  return o;
}
const crocPartCache = new Map();
function buildCrocParts(L) {
  const key = JSON.stringify(L);
  if (crocPartCache.has(key)) return crocPartCache.get(key);
  const px = (x, i, j, col, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(i, j, w, h); };
  const parts = {};
  const spikes = L.spikes || 0, top = Math.max(spikes ? 3 : 0, L.fin ? 6 : 0, L.shell ? 2 : 0, L.mane ? 3 : 0);
  // HEAD (hinge at (2, 7+top))
  {
    const w = 20, h = 10 + top, c = mkCanvas(w, h), x = c.getContext('2d');
    const y0 = top;
    px(x, 0, y0 + 2, L.dark, 9, 1);
    px(x, 0, y0 + 3, L.back, 9, 2);
    px(x, 0, y0 + 5, L.mid, 9, 2);
    px(x, 0, y0 + 7, L.belly, 9, 1);
    px(x, 2, y0 + 0, L.dark, 4, 1); px(x, 1, y0 + 1, L.dark, 1, 1); px(x, 6, y0 + 1, L.dark, 1, 1);
    px(x, 2, y0 + 1, L.back, 1, 1); px(x, 3, y0 + 1, L.eye, 2, 1); px(x, 4, y0 + 1, L.pupil, 1, 1); px(x, 5, y0 + 1, L.back, 1, 1);
    px(x, 9, y0 + 3, L.dark, 10, 1);
    px(x, 9, y0 + 4, L.back, 10, 1);
    px(x, 9, y0 + 5, L.mid, 10, 2);
    px(x, 9, y0 + 7, L.belly, 10, 1);
    px(x, 18, y0 + 2, L.dark, 1, 1); px(x, 19, y0 + 3, L.dark, 1, 1); px(x, 19, y0 + 4, L.back, 1, 1); px(x, 19, y0 + 5, L.mid, 1, 2); px(x, 19, y0 + 7, L.dark, 1, 1);
    px(x, 0, y0 + 2, L.dark, 1, 6);
    // subtle scales
    px(x, 11, y0 + 4, L.dark, 1, 1); px(x, 14, y0 + 4, L.dark, 1, 1); px(x, 17, y0 + 4, L.dark, 1, 1);
    // upper teeth
    for (const tx of [7, 9, 11, 13, 15, 17]) px(x, tx, y0 + 8, L.tooth, 1, 1);
    px(x, 19, y0 + 8, L.tooth, 1, 1);
    if (L.scars) { px(x, 8, y0 + 4, '#d08080', 1, 1); px(x, 9, y0 + 5, '#d08080', 1, 1); px(x, 10, y0 + 6, '#d08080', 1, 1); }
    if (spikes) { px(x, 3, y0 - 1, L.dark, 1, 1); px(x, 3, y0 - 2, L.belly, 1, 1); }
    if (L.ganoid) for (const [gx, gy] of [[10, y0 + 4], [13, y0 + 5], [16, y0 + 4], [11, y0 + 6], [14, y0 + 6]]) px(x, gx, gy, mixColor(L.belly, '#ffffff', 0.4), 1, 1);
    if (L.denticle) for (const [gx, gy] of [[11, y0 + 4], [15, y0 + 4], [13, y0 + 6], [17, y0 + 5]]) px(x, gx, gy, shade(L.mid, 0.75), 1, 1);
    if (L.frill) { for (let f = 0; f < 4; f++) { px(x, 7, y0 + 2 - f, L.frill, 1, 1); px(x, 8, y0 + 2 - f, shade(L.frill, 0.7), 1, 1); } px(x, 7, y0 + 8, L.frill, 2, 2); }
    if (L.mane) { for (const mx of [1, 3, 5, 7]) { px(x, mx, y0 - 1, L.mane, 1, 1); px(x, mx, y0 - 2, shade(L.mane, 0.8), 1, 1); px(x, mx + 1, y0 - 3, L.mane, 1, 1); } }
    if (L.tusks) { px(x, 12, y0 + 8, L.tooth, 1, 2); px(x, 13, y0 + 9, L.tooth, 1, 1); px(x, 16, y0 + 8, L.tooth, 1, 2); px(x, 17, y0 + 9, L.tooth, 1, 1); }
    if (L.horn) { px(x, 15, y0 + 2, L.tooth, 1, 1); px(x, 16, y0 + 1, L.tooth, 1, 1); px(x, 17, y0, L.tooth, 1, 1); }
    if (L.beak) { px(x, 19, y0 + 3, L.beak, 1, 5); px(x, 18, y0 + 6, L.beak, 2, 2); }
    parts.head = { c, w, h, ox: 2, oy: y0 + 7, eyeX: 4, eyeY: y0 + 1 };
  }
  // JAW (hinge at (0,0))
  {
    const w = 19, h = 4, c = mkCanvas(w, h), x = c.getContext('2d');
    for (const tx of [6, 8, 10, 12, 14, 16]) px(x, tx, 0, L.tooth, 1, 1);
    px(x, 0, 1, L.dark, 1, 1); px(x, 1, 1, L.mouth, 17, 1); px(x, 18, 1, L.dark, 1, 1);
    px(x, 0, 2, L.dark, 1, 1); px(x, 1, 2, L.belly, 17, 1); px(x, 18, 2, L.dark, 1, 1);
    px(x, 0, 3, L.dark, 18, 1);
    parts.jaw = { c, w, h, ox: 0, oy: 0 };
  }
  // BODY segments x5 (center origin); canvas 10 wide, 10 + top tall
  parts.body = [];
  for (let i = 0; i < 5; i++) {
    const w = 10, h = 10 + top, c = mkCanvas(w, h), x = c.getContext('2d');
    const y0 = top;
    px(x, 0, y0 + 2, L.dark, 10, 1);
    px(x, 0, y0 + 3, L.back, 10, 2);
    px(x, 0, y0 + 5, L.mid, 10, 2);
    px(x, 0, y0 + 7, L.belly, 10, 2);
    px(x, 0, y0 + 9, L.dark, 10, 1);
    // scutes
    const sx = i % 2 ? [1, 4, 7] : [2, 5, 8];
    for (const s of sx) { px(x, s, y0 + 1, L.dark, 1, 1); px(x, s, y0 + 3, L.dark, 1, 1); }
    // highlight
    px(x, 3, y0 + 4, mixColor(L.back, '#ffffff', 0.15), 1, 1); px(x, 8, y0 + 5, mixColor(L.mid, '#ffffff', 0.12), 1, 1);
    if (L.stripes) px(x, 4, y0 + 3, shade(L.back, 0.7), 2, 6);
    if (L.plates) { px(x, 1, y0 + 3, '#c9c2a3', 2, 2); px(x, 6, y0 + 3, '#c9c2a3', 2, 2); px(x, 2, y0 + 4, '#8a846a', 1, 1); px(x, 7, y0 + 4, '#8a846a', 1, 1); }
    if (L.scars && (i === 1 || i === 3)) { px(x, 2, y0 + 3, '#d08080', 1, 1); px(x, 3, y0 + 4, '#d08080', 1, 1); px(x, 4, y0 + 5, '#d08080', 1, 1); px(x, 5, y0 + 6, '#d08080', 1, 1); }
    if (L.spots) { px(x, 3, y0 + 5, L.spots, 1, 1); px(x, 7, y0 + 6, L.spots, 1, 1); }
    if (L.ganoid) { for (let gy = 0; gy < 3; gy++) for (let gx = (gy % 2 ? 0 : 2); gx < 10; gx += 4) px(x, gx, y0 + 3 + gy * 2, mixColor(L.belly, '#ffffff', 0.35), 2, 1); }
    if (L.denticle) { for (let gy = 0; gy < 4; gy++) for (let gx = (gy % 2 ? 1 : 3); gx < 10; gx += 3) px(x, gx, y0 + 3 + gy, shade(L.mid, 0.72), 1, 1); }
    if (L.shell) { // turtle carapace: hex plates with a keel
      px(x, 0, y0 + 1, L.shell, 10, 3); px(x, 0, y0, shade(L.shell, 0.7), 10, 1);
      for (const s2 of [1, 5]) { px(x, s2, y0 + 1, shade(L.shell, 1.25), 3, 1); px(x, s2 + 1, y0 + 2, shade(L.shell, 0.75), 1, 1); }
      px(x, 0, y0 + 4, shade(L.shell, 0.6), 10, 1);
      for (const s2 of [2, 6]) { px(x, s2, y0 - 1, shade(L.shell, 0.8), 2, 1); px(x, s2, y0 - 2, shade(L.shell, 1.1), 1, 1); }
    }
    if (L.stripe2) { for (const s2 of [0, 5]) px(x, s2, y0 + 2, shade(L.dark, 1.1), 2, 7); }
    if (L.fin && (i === 1 || i === 2)) { // dorsal fin
      const fh = i === 1 ? 6 : 4, fc = L.fin, fd = shade(fc, 0.7);
      for (let f = 0; f < fh; f++) { const w2 = Math.max(1, Math.round((fh - f) * 1.1)); px(x, 3 + Math.round(f * 0.4), y0 - f, fc, w2, 1); px(x, 3 + Math.round(f * 0.4), y0 - f, fd, 1, 1); }
    }
    if (L.gills && i === 0) { for (const gx of [2, 4, 6]) px(x, gx, y0 + 5, shade(L.mouth, 1.1), 1, 3); }
    if (spikes) for (const s of sx) { px(x, s, y0, L.dark, 1, 1); if (spikes >= 2) { px(x, s, y0 - 1, L.dark, 1, 1); px(x, s, y0 - 2, L.belly, 1, 1); } else px(x, s, y0 - 1, L.belly, 1, 1); }
    parts.body.push({ c, w, h, ox: 5, oy: y0 + 6 });
  }
  // TAIL segments x6, tapering
  parts.tail = [];
  for (let k = 0; k < 6; k++) {
    const w = 8, bh = 8 - k, h = bh + 2 + top, c = mkCanvas(w, h), x = c.getContext('2d');
    const y0 = top + 2; // room for tail fin ridge
    px(x, 0, y0, L.dark, 8, 1);
    const back = Math.max(1, Math.round((bh - 2) * 0.4)), mid = Math.max(1, Math.round((bh - 2) * 0.35)), bel = Math.max(1, bh - 2 - back - mid);
    px(x, 0, y0 + 1, L.back, 8, back);
    px(x, 0, y0 + 1 + back, L.mid, 8, mid);
    px(x, 0, y0 + 1 + back + mid, L.belly, 8, bel);
    px(x, 0, y0 + bh - 1, L.dark, 8, 1);
    // tail ridge (vertical scales)
    for (const s of [1, 4, 7]) { px(x, s, y0 - 1, L.dark, 1, 1); if (k < 4) px(x, s, y0 - 2, L.dark, 1, 1); }
    if (spikes && k < 3) for (const s of [1, 4]) { px(x, s, y0 - 3, L.dark, 1, 1); if (spikes >= 2) px(x, s, y0 - 4, L.belly, 1, 1); }
    if (L.spots && k % 2 === 0) px(x, 4, y0 + 1 + back, L.spots, 1, 1);
    if (L.ganoid) for (let gx = (k % 2 ? 1 : 3); gx < 8; gx += 4) px(x, gx, y0 + 2, mixColor(L.belly, '#ffffff', 0.3), 2, 1);
    if (L.denticle) for (let gx = (k % 2 ? 1 : 2); gx < 8; gx += 3) px(x, gx, y0 + 2, shade(L.mid, 0.72), 1, 1);
    if (L.stripe2 && k % 2 === 0) px(x, 3, y0, shade(L.dark, 1.1), 2, bh);
    if (L.fin && k < 3) { const fh = 5 - k; for (let f = 0; f < fh; f++) px(x, 2 + Math.round(f * 0.5), y0 - 1 - f, L.fin, Math.max(1, fh - f), 1); }
    if (L.barb && k >= 4) { px(x, 3, y0 - 1, L.tooth, 1, 1); px(x, 3, y0 - 2, L.tooth, 1, 1); px(x, 2, y0 - 1, L.tooth, 1, 1); if (k === 5) { px(x, 4, y0 - 3, L.tooth, 1, 1); px(x, 3, y0 - 4, L.tooth, 1, 1); } }
    if (L.paddle && k >= 4) { const pc = L.paddle; for (let f = 1; f <= 3; f++) { px(x, 5 + f, y0 - f, pc, 1, bh + f); } }
    parts.tail.push({ c, w, h, ox: 4, oy: y0 + Math.floor(bh / 2) });
  }
  // LEGS 2 frames
  parts.legs = [];
  for (let f = 0; f < 2; f++) {
    const w = 6, h = 6, c = mkCanvas(w, h), x = c.getContext('2d');
    if (f === 0) { px(x, 1, 0, L.dark, 3, 1); px(x, 1, 1, L.mid, 3, 2); px(x, 0, 1, L.dark, 1, 3); px(x, 4, 1, L.dark, 1, 2); px(x, 1, 3, L.mid, 2, 2); px(x, 0, 4, L.dark, 1, 1); px(x, 3, 4, L.dark, 1, 1); px(x, 0, 5, L.dark, 1, 1); px(x, 2, 5, L.dark, 1, 1); }
    else { px(x, 2, 0, L.dark, 3, 1); px(x, 2, 1, L.mid, 3, 2); px(x, 1, 1, L.dark, 1, 2); px(x, 5, 1, L.dark, 1, 3); px(x, 3, 3, L.mid, 2, 2); px(x, 2, 4, L.dark, 1, 1); px(x, 5, 4, L.dark, 1, 1); px(x, 3, 5, L.dark, 1, 1); px(x, 5, 5, L.dark, 1, 1); }
    if (L.claws) { px(x, f ? 2 : 0, 5, L.tooth, 1, 1); px(x, f ? 4 : 2, 5, L.tooth, 1, 1); px(x, f ? 5 : 3, 4, L.tooth, 1, 1); }
    if (L.webbed) { px(x, f ? 2 : 0, 4, L.webbed, 4, 2); }
    parts.legs.push({ c, w, h, ox: 3, oy: 0 });
  }
  parts.look = L;
  crocPartCache.set(key, parts);
  return parts;
}

// chain geometry (at size 1)
const CROC_SPACING = [0, 7, 9, 9, 9, 9, 8, 7, 7, 7, 7, 7]; // distance from previous node
const CROC_LEN = CROC_SPACING.length;
class CrocChain {
  constructor(x, y, a) { this.nodes = []; for (let i = 0; i < CROC_LEN; i++) this.nodes.push({ x: x - i * 8 * Math.cos(a), y: y - i * 8 * Math.sin(a), a }); this.phase = 0; }
  reset(x, y, a) { for (let i = 0; i < CROC_LEN; i++) { const n = this.nodes[i]; n.x = x - i * 8 * Math.cos(a); n.y = y - i * 8 * Math.sin(a); n.a = a; } }
  // solve follow-the-leader with bend limit and swimming undulation
  solve(hx, hy, ha, size, dt, swim) {
    const n = this.nodes; n[0].x = hx; n[0].y = hy; n[0].a = ha;
    this.phase += dt * (4 + swim * 9);
    for (let i = 1; i < CROC_LEN; i++) {
      const p = n[i - 1], s = n[i], sp = CROC_SPACING[i] * size;
      let want = Math.atan2(s.y - p.y, s.x - p.x); // direction from prev to this (pointing backwards)
      const back = p.a + Math.PI;
      let d = angleDiff(back, want);
      const maxBend = 0.25;
      d = clamp(d, -maxBend, maxBend) * Math.exp(-3.5 * dt);
      const wig = Math.sin(this.phase - i * 0.75) * (0.05 + swim * 0.16) * Math.pow(i / CROC_LEN, 1.4);
      const a = back + d + wig;
      s.x = p.x + Math.cos(a) * sp; s.y = p.y + Math.sin(a) * sp;
      s.a = a + Math.PI;
    }
  }
}
// draw a croc chain. opts: {jaw, legPhase, flipY, alpha, flash, roll}
function drawCroc(ctx, chain, parts, size, opts = {}) {
  const n = chain.nodes, flipY = opts.flipY || 1, jaw = opts.jaw || 0;
  const rk = opts.roll ? Math.cos(opts.roll) : 1, sy = size * flipY * (Math.abs(rk) < 0.2 ? 0.2 * sign(rk) : rk);
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  const white = opts.flash > 0;
  const img = p => (white ? spriteWhite(p).c : p.c);
  for (let i = CROC_LEN - 1; i >= 1; i--) {
    const s = n[i], part = i <= 5 ? parts.body[i - 1] : parts.tail[i - 6];
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.scale(size, sy);
    if (i === 1 || i === 4) {
      const lp = opts.legPhase || 0, f = Math.sin(lp + (i === 1 ? 0 : Math.PI)) > 0 ? 0 : 1;
      const leg = parts.legs[f];
      ctx.drawImage(img(leg), -leg.ox - 2, 2); ctx.drawImage(img(leg), -leg.ox + 3, 2);
    }
    ctx.drawImage(img(part), -part.ox, -part.oy);
    ctx.restore();
  }
  const h = n[0];
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.a); ctx.scale(size, sy);
  ctx.save(); ctx.rotate(jaw * 0.8); ctx.drawImage(img(parts.jaw), 0, 0); ctx.restore();
  ctx.drawImage(img(parts.head), -parts.head.ox, -parts.head.oy);
  if (parts.look.glow && !white) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(parts.look.glow, 0.55); ctx.fillRect(parts.head.eyeX - parts.head.ox - 1, parts.head.eyeY - parts.head.oy - 1, 3, 3);
    ctx.fillStyle = rgba(parts.look.glow, 0.25); ctx.fillRect(parts.head.eyeX - parts.head.ox - 2, parts.head.eyeY - parts.head.oy - 2, 5, 5);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
// approximate world-space length of a croc at size
const crocLength = size => 94 * size;
