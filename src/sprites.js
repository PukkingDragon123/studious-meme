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

// ---------- egg + nest, for the start of a run ----------
SPR.egg = (function () {
  const stages = [];
  for (let st = 0; st < 4; st++) {
    const w = 22, h = 28, c = mkCanvas(w, h), x = c.getContext('2d');
    const px = (i, j, col, ww = 1, hh = 1) => { x.fillStyle = col; x.fillRect(i, j, ww, hh); };
    // ovoid shell, wider at the base
    const shell = '#e8e0cc', shellHi = '#f6f2e4', shellLo = '#c4b99e', shellDk = '#9c9078';
    const rows = [4, 7, 9, 10, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 10, 9, 7, 4];
    rows.forEach((rw, k) => {
      const j = 3 + k, i = Math.round((w - rw) / 2);
      px(i, j, shell, rw, 1);
      px(i, j, shellLo, 1, 1); px(i + rw - 1, j, shellLo, 1, 1);
    });
    // speckles and a soft highlight
    for (const [a, b] of [[7, 8], [12, 11], [9, 15], [14, 17], [8, 20], [13, 22], [10, 6]]) px(a, b, shellLo, 1, 1);
    px(7, 7, shellHi, 3, 2); px(6, 9, shellHi, 2, 3); px(8, 6, shellHi, 1, 1);
    px(5, 18, shellDk, 2, 4); px(15, 16, shellDk, 2, 5);
    // progressive cracks
    const cracks = [
      [[11, 8], [12, 9], [11, 10], [12, 11]],
      [[11, 8], [12, 9], [11, 10], [12, 11], [13, 12], [10, 12], [9, 13], [14, 13], [11, 14]],
      [[11, 7], [12, 9], [11, 10], [12, 11], [13, 12], [10, 12], [9, 13], [14, 13], [11, 14], [8, 15], [15, 15], [10, 16], [13, 17], [7, 17], [16, 17], [11, 18], [9, 19], [14, 19]],
    ];
    if (st > 0) for (const [a, b] of cracks[st - 1]) { px(a, b, '#4a4335', 1, 1); px(a + 1, b, shellDk, 1, 1); }
    stages.push({ c, w, h });
  }
  return stages;
})();
SPR.nest = mkSprite([
  '.....gggggggggggg.....',
  '...ggGgggGggggGgggg...',
  '..gGgggggggggggggGgg..',
  '.gggGggmmmmmmggggggGg.',
  'gGgggmmmmmmmmmmgggggGg',
  'ggggmmmmmmmmmmmmgggggg',
  '.GggmmmmmmmmmmmmggGgg.',
  '..ggggmmmmmmmmgggggg..',
], { g: '#6b5a34', G: '#8a7448', m: '#4a3a20' });
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
// Croc parts are authored at CROC_PX times the world scale, so the art can carry
// real detail; everything that draws a part divides by it.
const CROC_PX = 2;
function buildCrocParts(L) {
  const key = JSON.stringify(L);
  if (crocPartCache.has(key)) return crocPartCache.get(key);
  const parts = {};
  const mk = (w, h) => { const c = mkCanvas(w, h); return { c, x: c.getContext('2d'), w, h }; };
  const px = (o, i, j, col, w = 1, h = 1) => { o.x.fillStyle = col; o.x.fillRect(Math.round(i), Math.round(j), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const hi = c => mixColor(c, '#ffffff', 0.3), lo = c => shade(c, 0.72), lo2 = c => shade(c, 0.5);
  const OL = mixColor(shade(L.dark, 0.75), '#150e08', 0.45);
  // a 2px dark edge, so the toon outline survives being drawn at half scale
  const edge = o => { R.outline(o, OL); R.outline(o, OL); };
  const spikes = L.spikes || 0;
  const crest = Math.max(spikes ? 7 : 0, L.fin ? 13 : 0, L.shell ? 6 : 0, L.mane ? 7 : 0);
  // ------------------------------------------------ HEAD: rounded skull, long snout, big eye
  {
    const w = 44, h = 22 + crest, o = mk(w, h), y0 = crest, cy = y0 + 10;
    // snout: a tapering rounded slab
    for (let i = 0; i < 26; i++) {
      const u = i / 25, hh = 4.6 - u * 1.5, x = 17 + i;
      for (let j = -hh; j <= hh; j++) { const f = j / hh; px(o, x, cy + j, f < -0.3 ? L.back : f < 0.4 ? L.mid : L.belly); }
      if (i % 3 === 0) px(o, x, cy - hh, hi(L.back));
    }
    // rounded snout tip and nostril pad
    R.disc({ c: o.c, x: o.x, w, h }, 42, cy - 1, 3.1, L.mid);
    px(o, 40, cy - 4, L.back, 4, 3); px(o, 41, cy - 4, lo2(L.dark), 1, 1); px(o, 43, cy - 4, lo2(L.dark), 1, 1);
    // skull: a fat rounded blob
    R.blob({ c: o.c, x: o.x, w, h }, 9, cy - 1, 10, 7.5, L.mid, { light: hi(L.back), shade: lo(L.mid), hx: 0.1,
      pat: (i, j, u, v) => (v < -0.15 ? (v < -0.55 ? lo2(L.back) : L.back) : v > 0.45 ? L.belly : null) });
    // cheek line and jowl
    px(o, 4, cy + 4, lo(L.belly), 12, 1);
    // eye turret: raised bump, big cartoon eye
    R.disc({ c: o.c, x: o.x, w, h }, 8, cy - 7, 4.2, L.back);
    R.eye({ c: o.c, x: o.x, w, h }, 8, cy - 7, 3, { ring: OL, iris: L.eye, pupil: L.pupil, look: [0.45, 0.05] });
    px(o, 6, cy - 10, hi(L.back), 5, 1);
    // upper teeth
    for (const tx of [19, 23, 27, 31, 35, 39]) { px(o, tx, cy + 4, L.tooth, 2, 3); px(o, tx, cy + 6, shade(L.tooth, 0.82), 2, 1); }
    px(o, 15, cy + 4, L.tooth, 2, 4);
    // trait features
    if (L.scars) for (let k = 0; k < 5; k++) { px(o, 15 + k * 2, cy - 3 + k, '#d08a80', 1, 1); px(o, 15 + k * 2, cy - 2 + k, '#8a4a44', 1, 1); }
    if (L.ganoid) for (const [gx, gy] of [[20, cy - 2], [25, cy], [30, cy - 2], [35, cy]]) { px(o, gx, gy, mixColor(L.belly, '#ffffff', 0.45), 3, 1); px(o, gx, gy + 1, lo(L.belly), 3, 1); }
    if (L.denticle) R.dith({ c: o.c, x: o.x, w, h }, 18, cy - 3, 22, 6, lo2(L.mid), 0, 3);
    if (L.frill) { for (let f = 0; f < 8; f++) { px(o, 14, cy - 8 - f, L.frill, 3, 1); px(o, 15, cy - 8 - f, shade(L.frill, 0.7), 1, 1); } px(o, 13, cy + 4, L.frill, 3, 4); }
    if (L.mane) for (const mx of [1, 5, 9]) { px(o, mx, y0 - 1, L.mane, 3, 2); px(o, mx + 1, y0 - 4, shade(L.mane, 0.8), 2, 3); }
    if (L.tusks) { px(o, 26, cy + 4, L.tooth, 2, 6); px(o, 34, cy + 4, L.tooth, 2, 6); }
    if (L.horn) { px(o, 30, cy - 8, L.tooth, 2, 3); px(o, 32, cy - 11, L.tooth, 2, 3); }
    if (spikes) { px(o, 6, y0 + 1, L.dark, 3, 3); px(o, 6, y0 - 2, L.belly, 3, 3); }
    edge(o);
    parts.head = { c: o.c, w, h, ox: 6, oy: cy, eyeX: 8, eyeY: cy - 7 };
  }
  // ------------------------------------------------ JAW
  {
    const w = 40, h = 9, o = mk(w, h);
    for (const tx of [17, 21, 25, 29, 33, 37]) px(o, tx, 0, L.tooth, 2, 3);
    px(o, 11, 0, L.tooth, 2, 3);
    px(o, 1, 2, L.mouth, 38, 3);
    px(o, 1, 5, lo(L.belly), 38, 3);
    for (let k = 3; k < 38; k += 6) px(o, k, 6, lo2(L.belly), 2, 1);
    edge(o);
    parts.jaw = { c: o.c, w, h, ox: 1, oy: 1 };
  }
  // ------------------------------------------------ BODY x5: rounded barrels
  parts.body = [];
  for (let i = 0; i < 5; i++) {
    const w = 22, h = 24 + crest, o = mk(w, h), y0 = crest, cy = y0 + 11, half = 8.4 - Math.abs(i - 1.4) * 0.35;
    for (let x = 1; x < w - 1; x++) {
      const hh = half * (1 - Math.pow(Math.abs(x - w / 2) / (w / 1.7), 4));
      for (let j = -hh; j <= hh; j++) { const f = j / hh; px(o, x, cy + j, f < -0.34 ? L.back : f < 0.36 ? L.mid : L.belly); }
      if (x % 3 === (i % 3)) px(o, x, cy - hh, hi(L.back));
      px(o, x, cy + hh - 1, lo(L.belly));
    }
    // dorsal scute keels
    const off = i % 2 ? 1 : 3;
    for (let s2 = off; s2 < w - 2; s2 += 5) { px(o, s2, cy - half - 1, lo2(L.back), 3, 2); px(o, s2 + 1, cy - half - 2, L.back, 1, 1); }
    // belly plates
    for (let s2 = 1; s2 < w - 1; s2 += 4) px(o, s2, cy + half * 0.45, lo(L.belly), 1, half * 0.5);
    if (L.stripes) px(o, 8, cy - half, shade(L.back, 0.6), 5, half * 1.6);
    if (L.stripe2) for (const s2 of [2, 12]) px(o, s2, cy - half, shade(L.dark, 1.2), 5, half * 1.9);
    if (L.plates) for (const s2 of [3, 13]) { px(o, s2, cy - half * 0.6, '#c9c2a3', 6, 5); px(o, s2, cy - half * 0.6, '#e4dfc4', 6, 1); }
    if (L.scars && (i === 1 || i === 3)) for (let k = 0; k < 7; k++) { px(o, 4 + k, cy - 4 + k, '#d08a80', 1, 1); px(o, 4 + k, cy - 3 + k, '#8a4a44', 1, 1); }
    if (L.spots) for (const [gx, gy] of [[6, cy + 1], [14, cy + 3], [10, cy - 3]]) { px(o, gx, gy, L.spots, 3, 3); px(o, gx, gy, mixColor(L.spots, '#ffffff', 0.4), 1, 1); }
    if (L.ganoid) for (let gy = -3; gy < 4; gy += 2) for (let gx = (gy % 4 ? 2 : 5); gx < w - 2; gx += 6) { px(o, gx, cy + gy, mixColor(L.belly, '#ffffff', 0.4), 3, 1); px(o, gx, cy + gy + 1, lo(L.belly), 3, 1); }
    if (L.denticle) R.dith({ c: o.c, x: o.x, w, h }, 2, cy - half + 1, w - 4, half * 1.6, lo2(L.mid), i % 2, 3);
    if (L.shell) {
      for (let x = 2; x < w - 2; x++) { const hh = half * 0.95 * Math.sqrt(Math.max(0, 1 - Math.pow((x - w / 2) / (w / 2.1), 2))); px(o, x, cy - hh - 3, L.shell, 1, hh * 0.75); }
      for (let s2 = (i % 2 ? 1 : 5); s2 < w - 3; s2 += 7) { px(o, s2, cy - half - 2, shade(L.shell, 1.25), 5, 1); px(o, s2 + 5, cy - half - 2, shade(L.shell, 0.55), 1, 4); }
    }
    if (L.fin && (i === 1 || i === 2)) { const fh = i === 1 ? 13 : 9, fc = L.fin; for (let f = 0; f < fh; f++) { const fw = Math.max(2, Math.round((fh - f) * 1.4)); px(o, 7 + Math.round(f * 0.4), cy - half - f, fc, fw, 1); px(o, 7 + Math.round(f * 0.4), cy - half - f, shade(fc, 0.65), 1, 1); } }
    if (L.gills && i === 0) for (const gx of [4, 8, 12]) px(o, gx, cy - 1, shade(L.mouth, 1.1), 2, 5);
    if (spikes) for (let s2 = off; s2 < w - 2; s2 += 5) { px(o, s2, cy - half - 3, L.dark, 3, 3); if (spikes >= 2) px(o, s2, cy - half - 6, L.belly, 3, 3); }
    edge(o);
    parts.body.push({ c: o.c, w, h, ox: 11, oy: cy });
  }
  // ------------------------------------------------ TAIL x6: tapering with a crest
  parts.tail = [];
  for (let k = 0; k < 6; k++) {
    const w = 18, bh = 15 - k * 2.1, h = bh * 2 + 10 + crest, o = mk(w, h), cy = crest + bh + 4;
    for (let x = 1; x < w - 1; x++) {
      const hh = Math.max(1.2, bh * 0.5 * (1 - (x - 1) / (w * 2.6)));
      for (let j = -hh; j <= hh; j++) { const f = j / hh; px(o, x, cy + j, f < -0.34 ? L.back : f < 0.36 ? L.mid : L.belly); }
      if (x % 3 === (k % 3)) px(o, x, cy - hh, hi(L.back));
    }
    const th = Math.max(1.5, bh * 0.5);
    if (k < 3) { for (const s2 of [2, 7, 12]) { px(o, s2, cy - th - 2, lo2(L.back), 3, 3); px(o, s2 + 1, cy - th - 3, L.back, 1, 1); } }
    else { for (let s2 = 1; s2 < w - 2; s2 += 4) { const ch = Math.max(1, 5 - (k - 3) * 1.2); px(o, s2, cy - th - ch, lo2(L.back), 3, ch); px(o, s2 + 1, cy - th - ch, L.back, 1, ch); } }
    if (L.spots && k % 2 === 0) px(o, 6, cy - 1, L.spots, 3, 3);
    if (L.ganoid) for (let gx = (k % 2 ? 2 : 5); gx < w - 2; gx += 6) px(o, gx, cy - 1, mixColor(L.belly, '#ffffff', 0.35), 3, 1);
    if (L.denticle) R.dith({ c: o.c, x: o.x, w, h }, 1, cy - th, w - 2, th * 1.6, lo2(L.mid), k % 2, 3);
    if (L.stripe2 && k % 2 === 0) px(o, 6, cy - th, shade(L.dark, 1.2), 5, th * 2);
    if (L.fin && k < 3) { const fh = 11 - k * 3; for (let f = 0; f < fh; f++) px(o, 5 + Math.round(f * 0.5), cy - th - 3 - f, L.fin, Math.max(2, fh - f), 1); }
    if (L.barb && k >= 4) { px(o, 7, cy - th - 5, L.tooth, 2, 5); if (k === 5) px(o, 8, cy - th - 10, L.tooth, 2, 5); }
    if (L.paddle && k >= 4) { const pc = L.paddle; for (let f = 1; f <= 6; f++) px(o, 11 + f, cy - f, pc, 1, th * 2 + f * 2); }
    if (spikes && k < 3) for (const s2 of [2, 9]) { px(o, s2, cy - th - 6, L.dark, 3, 3); if (spikes >= 2) px(o, s2, cy - th - 9, L.belly, 3, 3); }
    edge(o);
    parts.tail.push({ c: o.c, w, h, ox: 9, oy: cy });
  }
  // ------------------------------------------------ LEGS x2 frames
  parts.legs = [];
  for (let f = 0; f < 2; f++) {
    const w = 16, h = 17, o = mk(w, h), sw = f ? 3 : 0;
    R.blob({ c: o.c, x: o.x, w, h }, 5 + sw, 4, 4.2, 3.6, L.mid, { light: hi(L.mid), shade: lo(L.mid), hl: false });
    px(o, 4 + sw, 6, L.mid, 5, 6);
    px(o, 4 + sw, 6, lo(L.mid), 1, 6);
    px(o, 2 + sw, 12, lo2(L.dark), 9, 3);
    px(o, 3 + sw, 12, L.belly, 7, 2);
    for (const t of [3, 6, 9]) px(o, t + sw - 1, 14, lo2(L.dark), 2, 2);
    if (L.claws) for (const t of [3, 6, 9]) px(o, t + sw - 1, 15, L.tooth, 2, 2);
    if (L.webbed) px(o, 3 + sw, 13, L.webbed, 8, 2);
    edge(o);
    parts.legs.push({ c: o.c, w, h, ox: 7, oy: 0 });
  }
  parts.jawY = 4;
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
  solve(hx, hy, ha, size, dt, swim, ground = false) {
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
      // walking, the belly rides the ground instead of sinking through the bank.
      // only the position is lifted: feeding the lifted angle back into `back`
      // for the next link makes one bump curl the whole tail up into a hook
      if (ground) {
        const fy = World.floorY(s.x) - 3 * size;
        if (s.y > fy) s.y = fy;
      }
      s.a = a + Math.PI;
    }
  }
}
// draw a croc chain. opts: {jaw, legPhase, flipY, alpha, flash, roll}
function drawCroc(ctx, chain, parts, worldSize, opts = {}) {
  const size = worldSize / CROC_PX;
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
      ctx.drawImage(img(leg), -leg.ox - 4, 4); ctx.drawImage(img(leg), -leg.ox + 6, 4);
    }
    ctx.drawImage(img(part), -part.ox, -part.oy);
    ctx.restore();
  }
  const h = n[0];
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.a); ctx.scale(size, sy);
  ctx.save(); ctx.translate(0, parts.jawY); ctx.rotate(jaw * 0.8); ctx.drawImage(img(parts.jaw), 0, 0); ctx.restore();
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
