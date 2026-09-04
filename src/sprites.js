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
  const px = (x, i, j, col, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(i, j, w, h); };
  // checkerboard dither between two colors, for scale texture and soft ramps
  const dith = (x, i, j, w, h, col, phase = 0, step = 2) => {
    x.fillStyle = col;
    for (let b = 0; b < h; b++) for (let a = (b + phase) % step; a < w; a += step) x.fillRect(i + a, j + b, 1, 1);
  };
  const hi = c => mixColor(c, '#ffffff', 0.22), lo = c => shade(c, 0.72), lo2 = c => shade(c, 0.55);
  const spikes = L.spikes || 0;
  const crest = Math.max(spikes ? 6 : 0, L.fin ? 12 : 0, L.shell ? 4 : 0, L.mane ? 6 : 0);

  // ------------------------------------------------ HEAD (hinge at 4, y0+14)
  {
    const w = 40, h = 20 + crest, o = mk(w, h), x = o.x, y0 = crest;
    // --- snout slab ---
    px(x, 17, y0 + 6, lo2(L.back), 22, 1);
    px(x, 17, y0 + 7, L.back, 22, 2);
    dith(x, 17, y0 + 7, 22, 2, hi(L.back), 0, 3);
    px(x, 17, y0 + 9, L.mid, 22, 3);
    dith(x, 18, y0 + 10, 21, 2, lo(L.mid), 1, 3);
    px(x, 17, y0 + 12, L.belly, 22, 2);
    px(x, 17, y0 + 14, lo2(L.dark), 23, 1);
    // rounded tip
    px(x, 39, y0 + 6, '#00000000', 1, 1);
    px(x, 38, y0 + 5, lo2(L.back), 2, 1); px(x, 38, y0 + 6, L.back, 2, 1);
    px(x, 39, y0 + 13, lo2(L.dark), 1, 1);
    // nostrils on the raised tip
    px(x, 35, y0 + 4, lo2(L.back), 4, 2); px(x, 35, y0 + 5, L.back, 4, 1);
    px(x, 36, y0 + 4, L.dark, 1, 1); px(x, 38, y0 + 4, L.dark, 1, 1);
    // --- skull ---
    px(x, 0, y0 + 3, lo2(L.back), 18, 1);
    px(x, 0, y0 + 4, L.back, 18, 3);
    dith(x, 1, y0 + 4, 16, 3, hi(L.back), 0, 3);
    px(x, 0, y0 + 7, L.mid, 18, 4);
    dith(x, 1, y0 + 8, 16, 3, lo(L.mid), 1, 3);
    px(x, 0, y0 + 11, L.belly, 18, 3);
    px(x, 0, y0 + 14, lo2(L.dark), 18, 1);
    // jaw/cheek line and jowl bulge
    px(x, 12, y0 + 11, lo(L.mid), 6, 1);
    px(x, 2, y0 + 13, lo(L.belly), 14, 1);
    // scale pits along the snout and skull
    for (const [sx, sy] of [[20, y0 + 8], [24, y0 + 9], [28, y0 + 8], [32, y0 + 9], [22, y0 + 11], [26, y0 + 12], [30, y0 + 11], [34, y0 + 12], [4, y0 + 6], [8, y0 + 7], [12, y0 + 6]]) px(x, sx, sy, lo2(L.mid), 1, 1);
    // --- eye turret ---
    px(x, 5, y0 + 1, lo2(L.back), 7, 1);          // brow ridge
    px(x, 4, y0 + 2, lo2(L.back), 1, 4); px(x, 12, y0 + 2, lo2(L.back), 1, 4);
    px(x, 5, y0 + 2, L.back, 7, 1); dith(x, 5, y0 + 2, 7, 1, hi(L.back), 0, 2);
    px(x, 5, y0 + 3, L.eye, 7, 2);                // iris
    px(x, 5, y0 + 3, hi(L.eye), 3, 1);
    px(x, 8, y0 + 3, L.pupil, 1, 2);              // vertical slit
    px(x, 11, y0 + 4, shade(L.eye, 0.65), 1, 1);
    px(x, 5, y0 + 5, lo2(L.dark), 7, 1);          // lower lid
    px(x, 6, y0 + 3, '#ffffff', 1, 1);            // catchlight
    // --- upper teeth, interlocking ---
    for (const tx of [19, 22, 25, 28, 31, 34, 37]) { px(x, tx, y0 + 15, L.tooth, 1, 2); px(x, tx, y0 + 17, shade(L.tooth, 0.8), 1, 1); }
    px(x, 16, y0 + 15, L.tooth, 1, 3); px(x, 13, y0 + 15, L.tooth, 1, 2);
    // --- trait features ---
    if (L.scars) { for (let k = 0; k < 5; k++) { px(x, 16 + k * 2, y0 + 7 + k, '#d08a80', 1, 1); px(x, 16 + k * 2, y0 + 8 + k, '#8a4a44', 1, 1); } }
    if (L.ganoid) for (const [gx, gy] of [[20, y0 + 8], [24, y0 + 10], [28, y0 + 8], [32, y0 + 10], [22, y0 + 12], [30, y0 + 12]]) { px(x, gx, gy, mixColor(L.belly, '#ffffff', 0.45), 2, 1); px(x, gx, gy + 1, lo(L.belly), 2, 1); }
    if (L.denticle) dith(x, 18, y0 + 7, 21, 6, lo2(L.mid), 0, 3);
    if (L.frill) { for (let f = 0; f < 7; f++) { px(x, 14, y0 + 4 - f, L.frill, 2, 1); px(x, 15, y0 + 4 - f, shade(L.frill, 0.7), 1, 1); } px(x, 13, y0 + 15, L.frill, 3, 3); }
    if (L.mane) for (const mx of [1, 4, 7, 10]) { px(x, mx, y0 - 1, L.mane, 2, 1); px(x, mx, y0 - 3, shade(L.mane, 0.8), 2, 2); px(x, mx + 1, y0 - 5, L.mane, 1, 2); }
    if (L.tusks) { px(x, 24, y0 + 15, L.tooth, 2, 4); px(x, 25, y0 + 19, L.tooth, 1, 1); px(x, 32, y0 + 15, L.tooth, 2, 4); px(x, 33, y0 + 19, L.tooth, 1, 1); }
    if (L.horn) { px(x, 30, y0 + 4, L.tooth, 1, 2); px(x, 31, y0 + 2, L.tooth, 1, 2); px(x, 32, y0 + 0, L.tooth, 1, 2); }
    if (L.beak) { px(x, 38, y0 + 6, L.beak, 2, 8); px(x, 36, y0 + 12, L.beak, 3, 3); }
    if (spikes) { px(x, 6, y0 - 2, L.dark, 2, 2); px(x, 6, y0 - 4, L.belly, 2, 2); }
    parts.head = { c: o.c, w, h, ox: 4, oy: y0 + 11, eyeX: 7, eyeY: y0 + 3 };
  }
  // ------------------------------------------------ JAW (hinge at 0,0)
  {
    const w = 38, h = 8, o = mk(w, h), x = o.x;
    for (const tx of [17, 20, 23, 26, 29, 32, 35]) { px(x, tx, 0, L.tooth, 1, 2); px(x, tx, 0, shade(L.tooth, 0.85), 1, 1); }
    px(x, 12, 0, L.tooth, 1, 2);
    px(x, 0, 2, lo2(L.dark), 1, 2);
    px(x, 1, 2, L.mouth, 36, 2);                       // gums
    dith(x, 2, 2, 34, 1, shade(L.mouth, 1.25), 0, 4);
    px(x, 1, 4, lo(L.belly), 36, 2);                   // lower jaw plates
    dith(x, 2, 4, 34, 2, L.belly, 0, 4);
    px(x, 0, 6, lo2(L.dark), 37, 2);
    for (let k = 2; k < 36; k += 5) px(x, k, 5, lo2(L.belly), 1, 1);
    parts.jaw = { c: o.c, w, h, ox: 0, oy: 0 };
  }
  // ------------------------------------------------ BODY x5 (oy = y0+12)
  parts.body = [];
  for (let i = 0; i < 5; i++) {
    const w = 20, h = 20 + crest, o = mk(w, h), x = o.x, y0 = crest;
    px(x, 0, y0 + 4, lo2(L.back), w, 1);
    px(x, 0, y0 + 5, L.back, w, 4);
    dith(x, 0, y0 + 5, w, 4, hi(L.back), i % 2, 3);
    px(x, 0, y0 + 9, L.mid, w, 5);
    dith(x, 0, y0 + 10, w, 4, lo(L.mid), (i + 1) % 2, 3);
    px(x, 0, y0 + 14, L.belly, w, 4);
    px(x, 0, y0 + 18, lo2(L.dark), w, 2);
    // dorsal scute rows: two raised paired keels
    const off = i % 2 ? 0 : 2;
    for (let s = off; s < w; s += 5) {
      px(x, s, y0 + 2, lo2(L.back), 3, 2); px(x, s + 1, y0 + 2, hi(L.back), 1, 1);
      px(x, s, y0 + 1, L.dark, 2, 1);
      px(x, s + 1, y0 + 7, lo2(L.back), 2, 1);
    }
    // lateral scale rows
    for (let s = (i % 2 ? 1 : 3); s < w; s += 4) { px(x, s, y0 + 10, lo2(L.mid), 1, 3); px(x, s + 1, y0 + 10, hi(L.mid), 1, 1); }
    // belly plates
    for (let s = 0; s < w; s += 4) { px(x, s, y0 + 14, lo(L.belly), 1, 4); px(x, s + 1, y0 + 15, hi(L.belly), 2, 1); }
    // rim light along the spine, shadow under the gut
    px(x, 0, y0 + 4, hi(L.back), w, 1);
    px(x, 0, y0 + 17, lo(L.belly), w, 1);
    // trait features
    if (L.stripes) { px(x, 7, y0 + 5, shade(L.back, 0.62), 4, 9); dith(x, 6, y0 + 5, 1, 9, shade(L.back, 0.62), 0, 2); }
    if (L.stripe2) for (const s of [1, 10]) { px(x, s, y0 + 4, shade(L.dark, 1.15), 4, 14); dith(x, s + 4, y0 + 4, 2, 14, shade(L.dark, 1.15), 0, 2); }
    if (L.plates) for (const s of [2, 12]) { px(x, s, y0 + 6, '#c9c2a3', 5, 4); px(x, s, y0 + 6, '#e4dfc4', 5, 1); px(x, s + 1, y0 + 8, '#8a846a', 3, 1); }
    if (L.scars && (i === 1 || i === 3)) for (let k = 0; k < 7; k++) { px(x, 3 + k, y0 + 5 + k, '#d08a80', 1, 1); px(x, 3 + k, y0 + 6 + k, '#8a4a44', 1, 1); }
    if (L.spots) for (const [gx, gy] of [[5, y0 + 10], [13, y0 + 12], [9, y0 + 7]]) { px(x, gx, gy, L.spots, 2, 2); px(x, gx, gy, mixColor(L.spots, '#ffffff', 0.4), 1, 1); }
    if (L.ganoid) for (let gy = 0; gy < 4; gy++) for (let gx = (gy % 2 ? 0 : 3); gx < w; gx += 6) { px(x, gx, y0 + 6 + gy * 2, mixColor(L.belly, '#ffffff', 0.4), 3, 1); px(x, gx, y0 + 7 + gy * 2, lo(L.belly), 3, 1); }
    if (L.denticle) dith(x, 0, y0 + 5, w, 9, lo2(L.mid), i % 2, 3);
    if (L.shell) { // turtle carapace with keeled hexagonal scutes
      px(x, 0, y0 + 2, L.shell, w, 5); px(x, 0, y0 + 1, lo2(L.shell), w, 1);
      for (let s = (i % 2 ? 0 : 4); s < w; s += 8) {
        px(x, s, y0 + 2, shade(L.shell, 1.3), 6, 1); px(x, s + 1, y0 + 3, shade(L.shell, 1.12), 4, 2);
        px(x, s, y0 + 5, shade(L.shell, 0.62), 6, 1); px(x, s + 6, y0 + 2, shade(L.shell, 0.5), 1, 4);
      }
      px(x, 0, y0 + 7, shade(L.shell, 0.45), w, 1);
      for (let s = (i % 2 ? 2 : 6); s < w; s += 8) { px(x, s, y0 - 1, shade(L.shell, 0.8), 4, 2); px(x, s + 1, y0 - 3, shade(L.shell, 1.15), 2, 2); }
    }
    if (L.fin && (i === 1 || i === 2)) {
      const fh = i === 1 ? 12 : 8, fc = L.fin;
      for (let f = 0; f < fh; f++) { const fw = Math.max(2, Math.round((fh - f) * 1.5)); const fx = 6 + Math.round(f * 0.5); px(x, fx, y0 - f, fc, fw, 1); px(x, fx, y0 - f, shade(fc, 0.65), 1, 1); if (f % 3 === 0) px(x, fx + 1, y0 - f, shade(fc, 0.8), 1, 1); }
    }
    if (L.gills && i === 0) for (const gx of [3, 7, 11]) { px(x, gx, y0 + 9, shade(L.mouth, 1.15), 2, 5); px(x, gx, y0 + 9, shade(L.mouth, 0.7), 1, 5); }
    if (spikes) for (let s = off; s < w; s += 5) { px(x, s, y0 - 2, L.dark, 3, 2); if (spikes >= 2) { px(x, s, y0 - 5, L.dark, 2, 3); px(x, s, y0 - 6, L.belly, 2, 1); } else px(x, s, y0 - 3, L.belly, 2, 1); }
    parts.body.push({ c: o.c, w, h, ox: 10, oy: y0 + 12 });
  }
  // ------------------------------------------------ TAIL x6
  parts.tail = [];
  for (let k = 0; k < 6; k++) {
    const w = 16, bh = 18 - k * 2, h = bh + 6 + crest, o = mk(w, h), x = o.x, y0 = crest + 4;
    const back = Math.max(2, Math.round((bh - 2) * 0.4)), mid = Math.max(2, Math.round((bh - 2) * 0.34)), bel = Math.max(1, bh - 2 - back - mid);
    px(x, 0, y0, lo2(L.back), w, 1);
    px(x, 0, y0 + 1, L.back, w, back); dith(x, 0, y0 + 1, w, back, hi(L.back), k % 2, 3);
    px(x, 0, y0 + 1 + back, L.mid, w, mid); dith(x, 0, y0 + 1 + back, w, mid, lo(L.mid), (k + 1) % 2, 3);
    px(x, 0, y0 + 1 + back + mid, L.belly, w, bel);
    px(x, 0, y0 + bh - 1, lo2(L.dark), w, 1);
    px(x, 0, y0, hi(L.back), w, 1);
    // tail crest: paired scutes fusing into a single fin toward the tip
    if (k < 3) { for (const s of [1, 6, 11]) { px(x, s, y0 - 2, lo2(L.back), 3, 2); px(x, s, y0 - 3, L.dark, 3, 1); px(x, s + 1, y0 - 2, L.back, 1, 1); } }
    else { for (let s = 0; s < w; s += 4) { const ch = 4 - (k - 3); px(x, s, y0 - ch, lo2(L.back), 3, ch); px(x, s + 1, y0 - ch, L.back, 1, ch); } }
    for (let s = (k % 2 ? 1 : 3); s < w; s += 4) px(x, s, y0 + 1 + back, lo2(L.mid), 1, 2);
    if (L.spots && k % 2 === 0) { px(x, 5, y0 + 1 + back, L.spots, 2, 2); px(x, 5, y0 + 1 + back, mixColor(L.spots, '#ffffff', 0.4), 1, 1); }
    if (L.ganoid) for (let gx = (k % 2 ? 1 : 4); gx < w; gx += 6) px(x, gx, y0 + 3, mixColor(L.belly, '#ffffff', 0.35), 3, 1);
    if (L.denticle) dith(x, 0, y0 + 1, w, bh - 2, lo2(L.mid), k % 2, 3);
    if (L.stripe2 && k % 2 === 0) px(x, 5, y0, shade(L.dark, 1.15), 4, bh);
    if (L.fin && k < 3) { const fh = 10 - k * 3; for (let f = 0; f < fh; f++) px(x, 4 + Math.round(f * 0.6), y0 - 3 - f, L.fin, Math.max(2, fh - f), 1); }
    if (L.barb && k >= 4) { px(x, 6, y0 - 4, L.tooth, 2, 4); px(x, 5, y0 - 2, 1 ? L.tooth : '', 1, 2); px(x, 8, y0 - 2, L.tooth, 1, 2); if (k === 5) { px(x, 7, y0 - 8, L.tooth, 2, 4); px(x, 6, y0 - 6, L.tooth, 1, 2); } }
    if (L.paddle && k >= 4) { const pc = L.paddle; for (let f = 1; f <= 5; f++) px(x, 10 + f, y0 - f, pc, 1, bh + f * 2); }
    if (spikes && k < 3) for (const s of [1, 8]) { px(x, s, y0 - 5, L.dark, 2, 2); if (spikes >= 2) px(x, s, y0 - 7, L.belly, 2, 2); }
    parts.tail.push({ c: o.c, w, h, ox: 8, oy: y0 + Math.floor(bh / 2) });
  }
  // ------------------------------------------------ LEGS x2 frames
  parts.legs = [];
  for (let f = 0; f < 2; f++) {
    const w = 14, h = 14, o = mk(w, h), x = o.x;
    const sw = f ? 3 : 0; // stride offset
    px(x, 2 + sw, 0, lo2(L.back), 7, 2);            // shoulder
    px(x, 2 + sw, 2, L.mid, 7, 4);
    dith(x, 3 + sw, 2, 5, 4, lo(L.mid), 0, 2);
    px(x, 1 + sw, 2, lo2(L.dark), 1, 4);
    px(x, 9 + sw, 1, lo2(L.dark), 1, 4);
    px(x, 3 + sw, 6, L.mid, 5, 4);                  // forearm
    px(x, 3 + sw, 6, lo2(L.dark), 1, 4);
    px(x, 2 + sw, 10, lo2(L.dark), 7, 2);           // foot
    px(x, 3 + sw, 10, L.belly, 5, 1);
    for (const t of [2, 4, 6]) { px(x, t + sw, 12, lo2(L.dark), 1, 2); px(x, t + sw, 12, L.belly, 1, 1); }
    if (L.claws) for (const t of [2, 4, 6]) { px(x, t + sw, 13, L.tooth, 1, 1); px(x, t + sw - 1, 13, L.tooth, 1, 1); }
    if (L.webbed) px(x, 2 + sw, 11, L.webbed, 7, 2);
    parts.legs.push({ c: o.c, w, h, ox: 6, oy: 0 });
  }
  parts.jawY = 3; // the mouth corner sits below the chain node
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
