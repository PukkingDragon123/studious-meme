'use strict';
// ---------------------------------------------------------------------------
// Procedural creature rigs. Every animal is generated from a parameter record
// at RIG_PX times world scale: a set of pixel-art parts (body, fins, wings,
// legs, tail...) plus a draw() that poses them from an animation phase.
// Species carry their real length so relative sizes are right.
// ---------------------------------------------------------------------------
const RIG_PX = 2;
// world pixels for a creature of `ft` feet (mildly compressed so giants fit the screen)
const ftToPx = ft => 74.3 * Math.pow(ft, 0.58); // 1.5 ft hatchling = 94 px, the game's reference
const rigCache = new Map();
function rigOf(spec) {
  const key = spec.id;
  if (rigCache.has(key)) return rigCache.get(key);
  let rig;
  switch (spec.rig) {
    case 'fish': rig = buildFish(spec); break;
    case 'bird': rig = buildBird(spec); break;
    case 'quad': rig = buildQuad(spec); break;
    case 'biped': rig = buildBiped(spec); break;
    case 'turtle': rig = buildTurtle(spec); break;
    case 'frog': rig = buildFrog(spec); break;
    case 'crab': rig = buildCrab(spec); break;
    case 'ray': rig = buildRay(spec); break;
    case 'snail': rig = buildSnail(spec); break;
    case 'snake': rig = buildSnakeDisplay(spec); break;
    default: rig = buildFish(spec);
  }
  rig.spec = spec;
  // world draw scale so the body spans the species' real length
  rig.scale = ftToPx(spec.ft) * RIG_PX / rig.len;
  rigCache.set(key, rig);
  return rig;
}
// ---- pixel helpers ----
const R = {
  mk(w, h) { const c = mkCanvas(w, h); return { c, x: c.getContext('2d'), w, h }; },
  px(o, i, j, col, w = 1, h = 1) { o.x.fillStyle = col; o.x.fillRect(Math.round(i), Math.round(j), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); },
  dith(o, i, j, w, h, col, phase = 0, step = 2) { o.x.fillStyle = col; for (let b = 0; b < h; b++) for (let a = (b + phase) % step; a < w; a += step) o.x.fillRect(i + a, j + b, 1, 1); },
  // filled ellipse in pixel rows, with back/mid/belly shading bands and an outline
  ellipse(o, cx, cy, rx, ry, cols, opts = {}) {
    const { back, mid, belly, dark } = cols;
    for (let j = -ry; j <= ry; j++) {
      const f = j / ry, half = rx * Math.sqrt(Math.max(0, 1 - f * f)) * (opts.taper ? opts.taper(f) : 1);
      if (half < 0.5) continue;
      const x0 = Math.round(cx - half), x1 = Math.round(cx + half);
      const band = f < -0.25 ? back : f < 0.4 ? mid : belly;
      R.px(o, x0, cy + j, band, x1 - x0 + 1, 1);
      if (opts.outline !== false) { R.px(o, x0, cy + j, dark); R.px(o, x1, cy + j, dark); }
    }
    R.px(o, cx - rx * 0.6, cy - ry, dark, rx * 1.2, 1); R.px(o, cx - rx * 0.6, cy + ry, dark, rx * 1.2, 1);
  },
  hi: c => mixColor(c, '#ffffff', 0.25), lo: c => shade(c, 0.7), lo2: c => shade(c, 0.5),
  part(o, ox, oy) { return { c: o.c, w: o.w, h: o.h, ox, oy }; },
  draw(ctx, p, x, y, a, sx, sy) { ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a); ctx.scale(sx, sy); ctx.drawImage(p.c, -p.ox, -p.oy); ctx.restore(); },
  drawImg(ctx, img, p, x, y, a, sx, sy) { ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a); ctx.scale(sx, sy); ctx.drawImage(img, -p.ox, -p.oy); ctx.restore(); },
};

// =========================================================== FISH
// spec: {len (part px), h (height ratio), snout: 'blunt'|'point'|'gar'|'sucker', tail: 'fork'|'round'|'lunate'|'eel',
//        back, mid, belly, dark, fin, eye, pattern: 'none'|'bars'|'stripe'|'spots'|'blotch', dorsal: 'soft'|'spiny'|'sail'|'none', barbels, whiskers}
function buildFish(s) {
  const L = s.len || 60, H = Math.round(L * (s.h || 0.36)), cols = { back: s.back, mid: s.mid, belly: s.belly, dark: s.dark };
  const fin = s.fin || R.lo(s.mid);
  const parts = {};
  // ---- body (head at right) ----
  {
    const w = L + 6, h = H + 10, o = R.mk(w, h), cx = L / 2 + 2, cy = h / 2;
    const taper = f => 1; // vertical profile handled by shape fn below
    // body silhouette: per-column height profile so we get a fish shape (thick middle, narrow tail root)
    for (let i = 0; i < L; i++) {
      const u = i / (L - 1);                 // 0 tail root .. 1 snout
      let prof;
      if (s.snout === 'gar') prof = u < 0.55 ? Math.sin(u / 0.55 * Math.PI * 0.5) : (1 - (u - 0.55) / 0.45) * 0.55 + 0.25;
      else if (s.snout === 'point') prof = Math.sin(Math.min(1, u * 1.15) * Math.PI) * 0.9 + 0.1;
      else prof = Math.sin(Math.pow(u, 0.9) * Math.PI) * 0.92 + 0.08;
      if (s.tail === 'eel') prof = 0.55 + 0.45 * Math.min(1, u * 2.2);
      const hh = Math.max(1, Math.round(H / 2 * prof));
      const x = 2 + i, top = cy - hh, bot = cy + hh;
      for (let j = top; j <= bot; j++) {
        const f = (j - cy) / Math.max(1, hh);
        let col = f < -0.3 ? s.back : f < 0.35 ? s.mid : s.belly;
        R.px(o, x, j, col);
      }
      R.px(o, x, top, s.dark); R.px(o, x, bot, s.dark);
      if (hh > 3) { R.px(o, x, top + 1, R.hi(s.back)); }
    }
    // scale texture and lateral line
    R.dith(o, 4, cy - H / 2 + 2, L - 8, H - 4, R.lo(s.mid), 0, 3);
    R.px(o, L * 0.15, cy - 1, R.lo2(s.mid), L * 0.62, 1);
    // pattern
    if (s.pattern === 'bars') for (let k = 0; k < 5; k++) { const x = 6 + L * 0.14 * k + L * 0.08; R.dith(o, x, cy - H / 2 + 2, 3, H - 4, R.lo2(s.back), k % 2, 1); }
    if (s.pattern === 'stripe') R.px(o, L * 0.1, cy, R.lo2(s.dark), L * 0.75, 2);
    if (s.pattern === 'spots') for (let k = 0; k < 9; k++) { const x = 5 + ihash(k, 3) * (L - 14), y = cy - H / 2 + 3 + ihash(k, 4) * (H - 6); R.px(o, x, y, s.spot || R.lo2(s.back), 2, 2); }
    if (s.pattern === 'blotch') for (let k = 0; k < 6; k++) { const x = 5 + ihash(k, 5) * (L - 16), y = cy - H / 2 + 2 + ihash(k, 6) * (H * 0.5); R.px(o, x, y, R.lo2(s.back), 4 + ihash(k, 7) * 4, 3); }
    // gill slit + operculum
    const gx = 2 + L * 0.72; R.px(o, gx, cy - H * 0.3, s.dark, 1, H * 0.6); R.px(o, gx + 1, cy - H * 0.25, R.hi(s.mid), 1, H * 0.5);
    // eye
    const ex = 2 + L * 0.86, ey = cy - H * 0.18, er = Math.max(1, Math.round(H * 0.07));
    R.px(o, ex - er, ey - er, s.eyeRing || '#e8d890', er * 2 + 1, er * 2 + 1); R.px(o, ex - er + 1, ey - er + 1, s.eye || '#101010', Math.max(1, er * 2 - 1), Math.max(1, er * 2 - 1)); R.px(o, ex - er + 1, ey - er + 1, '#ffffff', 1, 1);
    // mouth
    const mx = 2 + L - 1; R.px(o, mx - Math.round(L * 0.08), cy + H * 0.12, s.dark, L * 0.08, 1);
    if (s.snout === 'gar') { for (let k = 0; k < 6; k++) R.px(o, 2 + L * 0.62 + k * (L * 0.06), cy + H * 0.1, '#f0f0e0', 1, 1); }
    if (s.barbels) { R.px(o, mx - 1, cy + H * 0.15, '#3a3a3a', 1, 1); for (let k = 1; k < 5; k++) { R.px(o, mx - 1 + k, cy + H * 0.15 + k, '#3a3a3a', 1, 1); R.px(o, mx - 3 - k, cy + H * 0.5 + k, '#3a3a3a', 1, 1); } }
    // dorsal fin (attached)
    if (s.dorsal !== 'none') {
      const dx0 = 2 + L * 0.3, dl = s.dorsal === 'sail' ? L * 0.5 : L * 0.3, dh = s.dorsal === 'sail' ? H * 0.5 : s.dorsal === 'spiny' ? H * 0.38 : H * 0.3;
      for (let i = 0; i < dl; i++) { const u = i / dl, fh = Math.round(dh * (s.dorsal === 'spiny' ? (0.5 + 0.5 * Math.abs(Math.sin(u * 9))) : Math.sin(u * Math.PI) * 0.9 + 0.1)); const x = dx0 + i, top = cy - H / 2 - fh; R.px(o, x, top, fin, 1, fh + 1); if (i % 3 === 0) R.px(o, x, top, R.lo(fin), 1, fh + 1); }
    }
    // anal + pelvic fins
    { const ax = 2 + L * 0.42, ah = H * 0.32; for (let i = 0; i < L * 0.16; i++) { const fh = Math.round(ah * Math.sin(i / (L * 0.16) * Math.PI)); R.px(o, ax + i, cy + H / 2, fin, 1, fh); } }
    { const pvx = 2 + L * 0.6; for (let i = 0; i < L * 0.1; i++) R.px(o, pvx + i, cy + H / 2 - 1, fin, 1, 3 + Math.round(i * 0.4)); }
    parts.body = R.part(o, cx, cy);
    parts.tailRootX = 2 - cx; parts.pecX = 2 + L * 0.66 - cx; parts.pecY = H * 0.12;
  }
  // ---- tail fin (pivot at its root, on the left edge) ----
  {
    const tl = Math.round(L * (s.tail === 'eel' ? 0.12 : 0.28)), th = Math.round(H * (s.tail === 'lunate' ? 1.4 : s.tail === 'round' ? 0.9 : 1.15));
    const o = R.mk(tl + 2, th + 2), cy = th / 2 + 1;
    for (let i = 0; i < tl; i++) {
      const u = i / tl; let hh;
      if (s.tail === 'round') hh = th / 2 * Math.sin(Math.PI * (0.3 + 0.7 * (1 - u))) ;
      else if (s.tail === 'eel') hh = th / 2 * (1 - u * 0.9);
      else hh = th / 2 * (0.35 + 0.65 * u);
      const x = tl - i; // root at right side? we want root at LEFT edge of canvas so pivot = x 0: mirror
      const xx = i;
      const top = Math.round(cy - hh), bot = Math.round(cy + hh);
      if (s.tail === 'fork' || s.tail === 'lunate') {
        const notch = Math.round(hh * (u > 0.45 ? (u - 0.45) * 1.4 : 0));
        R.px(o, xx, top, fin, 1, Math.max(1, hh - notch)); R.px(o, xx, cy + notch, fin, 1, Math.max(1, hh - notch));
      } else R.px(o, xx, top, fin, 1, bot - top + 1);
      if (i % 3 === 1) R.px(o, xx, top, R.lo(fin), 1, bot - top + 1);
      R.px(o, xx, top, R.lo2(fin)); R.px(o, xx, bot, R.lo2(fin));
    }
    // root is at x=tl (right side) since fish body is to the right; flip canvas horizontally
    const f = R.mk(o.w, o.h); f.x.translate(o.w, 0); f.x.scale(-1, 1); f.x.drawImage(o.c, 0, 0);
    parts.tail = R.part(f, o.w - 1, cy);
  }
  // ---- pectoral fin (pivot at its base) ----
  {
    const pl = Math.max(4, Math.round(L * 0.16)), ph = Math.max(3, Math.round(H * 0.3));
    const o = R.mk(pl + 1, ph + 1);
    for (let i = 0; i < pl; i++) { const hh = Math.round(ph * Math.sin((i / pl) * Math.PI * 0.5 + 0.2)); R.px(o, i, 0, fin, 1, hh); if (i % 2) R.px(o, i, 0, R.lo(fin), 1, hh); }
    // base at left, fin sweeps back to the right -> flipped so base is at right (toward head)
    const f = R.mk(o.w, o.h); f.x.translate(o.w, 0); f.x.scale(-1, 1); f.x.drawImage(o.c, 0, 0);
    parts.pec = R.part(f, o.w - 1, 1);
  }
  const rig = { kind: 'fish', parts, len: L * 1.22, height: H, foot: H * 0.5 };
  // anim: {phase, speed 0..1}; facing 1 = right
  rig.draw = (ctx, x, y, facing, angle, anim, opts = {}) => {
    const k = (opts.scale || 1) / RIG_PX, ph = anim.phase || 0, sw = 0.25 + (anim.speed || 0) * 0.55;
    const img = p => (opts.white ? spriteWhite(p).c : p.c);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k);
    // tail swings around its root
    const ta = Math.sin(ph) * sw;
    ctx.save(); ctx.translate(parts.tailRootX + 1, 0); ctx.rotate(ta); ctx.drawImage(img(parts.tail), -parts.tail.ox, -parts.tail.oy); ctx.restore();
    ctx.drawImage(img(parts.body), -parts.body.ox, -parts.body.oy);
    // pectoral fin flaps
    const pa = Math.sin(ph * 1.3 + 1) * 0.45 + 0.35;
    ctx.save(); ctx.translate(parts.pecX, parts.pecY); ctx.rotate(pa); ctx.drawImage(img(parts.pec), -parts.pec.ox, -parts.pec.oy); ctx.restore();
    ctx.restore();
  };
  rig.main = parts.body;
  return rig;
}

// =========================================================== BIRD
// spec: {len (body px), neck (0..1), legs (0..1), beak: 'spear'|'hook'|'spoon'|'pouch'|'short'|'curve', body, wing, head, beak col, legs col, crest}
function buildBird(s) {
  const L = s.len || 44, H = Math.round(L * 0.5), cols = { back: s.body, mid: s.body, belly: s.belly || R.hi(s.body), dark: s.dark || R.lo2(s.body) };
  const parts = {};
  // body: oval, tail feathers at left
  {
    const w = L + 10, h = H + 6, o = R.mk(w, h), cx = w / 2, cy = h / 2;
    R.ellipse(o, cx + 2, cy, L / 2, H / 2, cols);
    R.dith(o, cx - L / 2 + 4, cy - H / 2 + 2, L - 8, H - 4, R.lo(s.body), 0, 3);
    // tail feathers
    for (let k = -1; k <= 1; k++) { R.px(o, 0, cy + k * 2 - 1, R.lo(s.body), L * 0.2, 2); R.px(o, 0, cy + k * 2 - 1, cols.dark, 1, 2); }
    parts.body = R.part(o, cx, cy);
  }
  // neck + head + beak as one part pivoting at the shoulder
  {
    const nl = Math.round(L * (0.25 + (s.neck || 0.3) * 0.9)), hs = Math.max(5, Math.round(H * 0.55));
    const bl = s.beak === 'spear' || s.beak === 'spoon' ? hs * 1.6 : s.beak === 'pouch' ? hs * 1.5 : s.beak === 'curve' ? hs * 1.3 : hs * 0.7;
    const w = Math.round(hs * 1.6 + bl + 6), h = nl + hs + 6, o = R.mk(w, h);
    const nx = 3, hy = 3;                           // head at top-left, neck runs down to pivot at bottom
    // neck (S-curve for long necks)
    for (let j = 0; j < nl; j++) { const u = j / nl; const bend = s.neck > 0.5 ? Math.sin(u * Math.PI) * hs * 0.5 : 0; const x = nx + hs * 0.35 + bend; R.px(o, x, hy + hs * 0.7 + j, s.body, Math.max(2, hs * 0.3), 1); R.px(o, x, hy + hs * 0.7 + j, cols.dark, 1, 1); R.px(o, x + Math.max(2, hs * 0.3) - 1, hy + hs * 0.7 + j, cols.dark, 1, 1); }
    // head
    R.ellipse(o, nx + hs / 2, hy + hs / 2, hs / 2, hs / 2, { back: s.head || s.body, mid: s.head || s.body, belly: R.hi(s.head || s.body), dark: cols.dark });
    if (s.crest) for (let k = 0; k < 3; k++) R.px(o, nx + hs * 0.2 - k * 2, hy - 1 - k, s.crest, 2, 2);
    // eye
    R.px(o, nx + hs * 0.6, hy + hs * 0.32, '#ffffff', 2, 2); R.px(o, nx + hs * 0.6 + 1, hy + hs * 0.32, '#101010', 1, 2);
    // beak
    const bx = nx + hs, by = hy + hs * 0.45, bc = s.beakCol || '#e0b040';
    if (s.beak === 'spear') { for (let i = 0; i < bl; i++) R.px(o, bx + i, by - 1 + Math.round(i * 0.08), bc, 1, Math.max(1, 3 - i / (bl / 3))); R.px(o, bx, by + 1, R.lo(bc), bl * 0.5, 1); }
    else if (s.beak === 'spoon') { R.px(o, bx, by, bc, bl * 0.65, 2); R.px(o, bx + bl * 0.65, by - 1, bc, bl * 0.35, 4); }
    else if (s.beak === 'pouch') { R.px(o, bx, by - 1, bc, bl, 2); R.px(o, bx, by + 1, R.lo(bc), bl * 0.7, 3); }
    else if (s.beak === 'hook') { R.px(o, bx, by - 1, bc, bl, 2); R.px(o, bx + bl - 2, by + 1, R.lo(bc), 2, 2); }
    else if (s.beak === 'curve') { for (let i = 0; i < bl; i++) R.px(o, bx + i, by + Math.round(i * i * 0.06), bc, 1, 2); }
    else { R.px(o, bx, by, bc, bl, 2); }
    parts.head = R.part(o, nx + hs * 0.5, hy + hs * 0.7 + nl);   // pivot = base of neck
    parts.neckLen = nl;
    // flight head: neck runs horizontally, pivot at its root on the left, beak forward
    { const fl = Math.round(nl * (s.neck > 0.5 ? 0.45 : 0.8)), w2 = fl + hs + bl + 6, h2 = hs + 6, f = R.mk(w2, h2), hy2 = 3;
      for (let i = 0; i < fl; i++) { R.px(f, i, hy2 + hs * 0.35, s.body, 1, Math.max(2, hs * 0.3)); R.px(f, i, hy2 + hs * 0.35, cols.dark); R.px(f, i, hy2 + hs * 0.35 + Math.max(2, hs * 0.3) - 1, cols.dark); }
      const hx2 = fl;
      R.ellipse(f, hx2 + hs / 2, hy2 + hs / 2, hs / 2, hs / 2, { back: s.head || s.body, mid: s.head || s.body, belly: R.hi(s.head || s.body), dark: cols.dark });
      R.px(f, hx2 + hs * 0.6, hy2 + hs * 0.32, '#ffffff', 2, 2); R.px(f, hx2 + hs * 0.6 + 1, hy2 + hs * 0.32, '#101010', 1, 2);
      const bx2 = hx2 + hs, by2 = hy2 + hs * 0.45;
      if (s.beak === 'spear') { for (let i = 0; i < bl; i++) R.px(f, bx2 + i, by2 - 1 + Math.round(i * 0.08), bc, 1, Math.max(1, 3 - i / (bl / 3))); }
      else if (s.beak === 'spoon') { R.px(f, bx2, by2, bc, bl * 0.65, 2); R.px(f, bx2 + bl * 0.65, by2 - 1, bc, bl * 0.35, 4); }
      else if (s.beak === 'pouch') { R.px(f, bx2, by2 - 1, bc, bl, 2); R.px(f, bx2, by2 + 1, R.lo(bc), bl * 0.7, 3); }
      else if (s.beak === 'hook') { R.px(f, bx2, by2 - 1, bc, bl, 2); R.px(f, bx2 + bl - 2, by2 + 1, R.lo(bc), 2, 2); }
      else if (s.beak === 'curve') { for (let i = 0; i < bl; i++) R.px(f, bx2 + i, by2 + Math.round(i * i * 0.06), bc, 1, 2); }
      else R.px(f, bx2, by2, bc, bl, 2);
      parts.headFly = R.part(f, 0, hy2 + hs * 0.5);
    }
  }
  // wing: pivots at the shoulder, drawn folded when standing
  {
    const wl = Math.round(L * 0.95), wh = Math.round(H * 0.42);
    const o = R.mk(wl + 2, wh + 2);
    for (let i = 0; i < wl; i++) { const u = i / wl; const hh = Math.round(wh * (u < 0.7 ? 0.6 + 0.4 * u : 1 - (u - 0.7) / 0.3 * 0.7)); R.px(o, i, 0, s.wing || R.lo(s.body), 1, hh); if (i % 4 === 0) R.px(o, i, 0, R.lo(s.wing || s.body), 1, hh); R.px(o, i, hh - 1, cols.dark); }
    // primaries
    for (let k = 0; k < 4; k++) R.px(o, wl - 2 - k * 3, wh * 0.5, cols.dark, 1, wh * 0.5);
    parts.wing = R.part(o, 1, 1);   // pivot at the leading root (drawn pointing left = trailing)
  }
  // leg
  {
    const ll = Math.max(6, Math.round(L * (0.3 + (s.legs || 0.3) * 1.2)));
    const o = R.mk(6, ll + 3);
    R.px(o, 2, 0, s.legCol || '#4a4a3a', 2, ll); R.px(o, 0, ll, s.legCol || '#4a4a3a', 6, 1); R.px(o, 2, ll * 0.5, R.lo(s.legCol || '#4a4a3a'), 2, 1);
    parts.leg = R.part(o, 3, 0); parts.legLen = ll;
  }
  const rig = { kind: 'bird', parts, len: L + parts.neckLen * 0.6, height: H + parts.legLen, foot: H * 0.35 + parts.legLen, flyLen: L * 1.9 };
  // anim: {phase, mode: 'stand'|'fly'|'dive'|'swim', speed}
  rig.draw = (ctx, x, y, facing, angle, anim, opts = {}) => {
    const k = (opts.scale || 1) / RIG_PX, ph = anim.phase || 0, mode = anim.mode || 'stand';
    const img = p => (opts.white ? spriteWhite(p).c : p.c);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k);
    const P = parts, shoulderX = L * 0.15, shoulderY = -H * 0.3;
    if (mode === 'fly' || mode === 'dive') {
      // wings beat together around the shoulder: up-stroke points above the back, down-stroke below the belly
      const flap = mode === 'dive' ? 0.9 : Math.sin(ph) * 1.0;
      const wingA = Math.PI + 0.25 + flap * 0.85;  // pointing back-left, swung by the stroke
      ctx.save(); ctx.translate(shoulderX + 2, shoulderY + 2); ctx.rotate(wingA + 0.18); ctx.globalAlpha *= 0.7; ctx.scale(1, -0.9); ctx.drawImage(img(P.wing), -P.wing.ox, -P.wing.oy); ctx.restore();
      ctx.drawImage(img(P.body), -P.body.ox, -P.body.oy);
      // trailing legs
      ctx.save(); ctx.translate(-L * 0.25, H * 0.2); ctx.rotate(1.15); ctx.scale(1, 0.6); ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
      // head with the neck stretched forward (herons tuck theirs)
      const hf = P.headFly; ctx.save(); ctx.translate(L * 0.42, -H * 0.1); ctx.drawImage(img(hf), -hf.ox, -hf.oy); ctx.restore();
      ctx.save(); ctx.translate(shoulderX, shoulderY); ctx.rotate(wingA); ctx.scale(1, -1); ctx.drawImage(img(P.wing), -P.wing.ox, -P.wing.oy); ctx.restore();
    } else if (mode === 'swim') {
      // paddling low in the water, neck up
      ctx.save(); ctx.translate(0, H * 0.15); ctx.drawImage(img(P.body), -P.body.ox, -P.body.oy); ctx.restore();
      ctx.save(); ctx.translate(shoulderX, shoulderY + 4); ctx.scale(-1, 0.85); ctx.drawImage(img(P.wing), -P.wing.ox, -P.wing.oy); ctx.restore();
      ctx.save(); ctx.translate(L * 0.32, -H * 0.15); ctx.rotate(0.1 + Math.sin(ph * 0.5) * 0.05); ctx.drawImage(img(P.head), -P.head.ox, -P.head.oy); ctx.restore();
    } else {
      // standing / wading / swimming: legs, body, folded wing, upright neck
      const stride = mode === 'walk' ? Math.sin(ph) * 0.5 : 0;
      if (mode !== 'swim') {
        ctx.save(); ctx.translate(-L * 0.05, H * 0.35); ctx.rotate(stride); ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
        ctx.save(); ctx.translate(L * 0.12, H * 0.35); ctx.rotate(-stride); ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
      }
      ctx.drawImage(img(P.body), -P.body.ox, -P.body.oy);
      ctx.save(); ctx.translate(shoulderX, shoulderY + 2); ctx.scale(-1, 0.85); ctx.drawImage(img(P.wing), -P.wing.ox, -P.wing.oy); ctx.restore();
      const bob = (anim.peck || 0);
      ctx.save(); ctx.translate(L * 0.32, -H * 0.3); ctx.rotate(0.12 + bob * 1.1 + Math.sin(ph * 0.5) * 0.04); ctx.drawImage(img(P.head), -P.head.ox, -P.head.oy); ctx.restore();
    }
    ctx.restore();
  };
  rig.main = parts.body;
  return rig;
}

// =========================================================== QUADRUPED
// spec: {len, h, legs (0..1 length), snout (0..1), ears, antlers, horns, tusks, tail: 'short'|'long'|'bushy'|'none', body, belly, dark, pattern: 'none'|'spots'|'stripes'|'mask', mane}
function buildQuad(s) {
  const L = s.len || 60, H = Math.round(L * (s.h || 0.42)), cols = { back: s.body, mid: s.body, belly: s.belly || R.hi(s.body), dark: s.dark || R.lo2(s.body) };
  const parts = {};
  {
    const w = L + 6, h = H + 6, o = R.mk(w, h), cx = w / 2, cy = h / 2;
    R.ellipse(o, cx, cy, L / 2, H / 2, cols, { taper: f => 1 });
    R.dith(o, cx - L / 2 + 3, cy - H / 2 + 2, L - 6, H - 4, R.lo(s.body), 0, 3);
    R.px(o, cx - L / 2 + 4, cy - H / 2 + 1, R.hi(s.body), L - 8, 1);
    if (s.pattern === 'spots') for (let k = 0; k < 10; k++) R.px(o, cx - L / 2 + 4 + ihash(k, 11) * (L - 10), cy - H / 2 + 2 + ihash(k, 12) * (H - 6), s.spot || '#f0ead8', 2, 2);
    if (s.pattern === 'stripes') for (let k = 0; k < 6; k++) R.dith(o, cx - L / 2 + 6 + k * (L / 6.5), cy - H / 2 + 1, 3, H - 2, cols.dark, k % 2, 1);
    if (s.pattern === 'bands') for (let k = 0; k < 7; k++) R.px(o, cx - L / 2 + 3 + k * (L / 7.5), cy - H / 2 + 1, cols.dark, 1, H * 0.6);
    if (s.mane) R.px(o, cx + L * 0.1, cy - H / 2 - 2, s.mane, L * 0.3, 3);
    parts.body = R.part(o, cx, cy);
  }
  // head with snout, pivot at neck base (left side of the head canvas)
  {
    const hs = Math.max(8, Math.round(H * 0.7)), sn = Math.round(hs * (0.4 + (s.snout || 0.4) * 0.9));
    const w = hs + sn + 8, h = hs + 12, o = R.mk(w, h), hy = 8;
    R.ellipse(o, 3 + hs / 2, hy + hs / 2, hs / 2, hs / 2, { back: s.head || s.body, mid: s.head || s.body, belly: R.hi(s.head || s.body), dark: cols.dark });
    // snout
    for (let i = 0; i < sn; i++) { const u = i / sn; const hh = Math.round(hs * 0.5 * (1 - u * 0.45)); R.px(o, 3 + hs - 1 + i, hy + hs * 0.5 - hh * 0.5, s.head || s.body, 1, hh); R.px(o, 3 + hs - 1 + i, hy + hs * 0.5 - hh * 0.5, cols.dark); R.px(o, 3 + hs - 1 + i, hy + hs * 0.5 + hh * 0.5 - 1, cols.dark); }
    R.px(o, 3 + hs + sn - 2, hy + hs * 0.35, '#1a1a1a', 2, 2);   // nose
    R.px(o, 3 + hs + sn - 4, hy + hs * 0.6, cols.dark, 3, 1);       // mouth
    if (s.mask) R.px(o, 3 + hs * 0.35, hy + hs * 0.25, cols.dark, hs * 0.55, hs * 0.22);
    R.px(o, 3 + hs * 0.55, hy + hs * 0.3, '#ffffff', 3, 2); R.px(o, 3 + hs * 0.55 + 1, hy + hs * 0.3, s.eye || '#101010', 2, 2);
    // ears
    const ec = s.head || s.body;
    if (s.ears !== 'none') { const el = s.ears === 'long' ? hs * 0.6 : hs * 0.32; R.px(o, 3 + hs * 0.15, hy - el + 2, ec, 3, el); R.px(o, 3 + hs * 0.15, hy - el + 2, cols.dark, 1, el); R.px(o, 3 + hs * 0.15 + 1, hy - el + 3, R.hi(ec), 1, el * 0.5); R.px(o, 3 + hs * 0.45, hy - el * 0.8 + 2, ec, 3, el * 0.8); R.px(o, 3 + hs * 0.45 + 2, hy - el * 0.8 + 2, cols.dark, 1, el * 0.8); }
    if (s.antlers) { const ac = '#6b4a2a'; for (let k = 0; k < 6; k++) { R.px(o, 3 + hs * 0.3, hy - k, ac, 1, 1); R.px(o, 3 + hs * 0.3 + (k % 2 ? 1 : -1) * Math.floor(k / 2), hy - k - 1, ac, 1, 1); } R.px(o, 3 + hs * 0.3 - 3, hy - 4, ac, 7, 1); R.px(o, 3 + hs * 0.3 - 4, hy - 6, ac, 1, 3); R.px(o, 3 + hs * 0.3 + 4, hy - 7, ac, 1, 4); }
    if (s.tusks) { R.px(o, 3 + hs + sn - 4, hy + hs * 0.62, '#f0e8d8', 1, 3); R.px(o, 3 + hs + sn - 5, hy + hs * 0.62 + 2, '#f0e8d8', 1, 2); }
    parts.head = R.part(o, 3, hy + hs * 0.5);
  }
  // leg (upper+lower with a hoof/paw), pivot at hip
  {
    const ll = Math.max(6, Math.round(H * (0.6 + (s.legs || 0.5) * 0.9)));
    const o = R.mk(7, ll + 3), lc = s.legCol || s.body;
    R.px(o, 2, 0, lc, 3, ll * 0.55); R.px(o, 2, ll * 0.55, R.lo(lc), 2, ll * 0.45); R.px(o, 1, ll, s.hoof || cols.dark, 4, 2);
    R.px(o, 2, 0, cols.dark, 1, ll); R.px(o, 4, 0, cols.dark, 1, ll * 0.55);
    parts.leg = R.part(o, 3, 0); parts.legLen = ll;
  }
  // tail, pivot at base
  {
    const tl = s.tail === 'long' || s.tail === 'bushy' ? Math.round(L * 0.5) : s.tail === 'none' ? 0 : Math.round(L * 0.15);
    const o = R.mk(Math.max(1, tl + 2), s.tail === 'bushy' ? 7 : 4), tc = s.tailCol || s.body;
    if (tl) { for (let i = 0; i < tl; i++) { const th = s.tail === 'bushy' ? 3 + Math.round(Math.sin(i / tl * Math.PI) * 3) : 2; R.px(o, i, (o.h - th) / 2, tc, 1, th); if (s.tail === 'bushy' && i % 4 < 2) R.px(o, i, (o.h - th) / 2, R.lo(tc), 1, th); } if (s.tailTip) R.px(o, 0, (o.h - 3) / 2, s.tailTip, 3, 3); }
    parts.tail = R.part(o, o.w - 1, o.h / 2); parts.tailLen = tl;
  }
  const rig = { kind: 'quad', parts, len: L + parts.head.w * 0.5, height: H + parts.legLen, foot: H * 0.3 + parts.legLen };
  // anim: {phase, speed, graze}
  rig.draw = (ctx, x, y, facing, angle, anim, opts = {}) => {
    const k = (opts.scale || 1) / RIG_PX, ph = anim.phase || 0, sp = anim.speed || 0;
    const img = p => (opts.white ? spriteWhite(p).c : p.c);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k);
    const P = parts, hipY = H * 0.3, bob = Math.abs(Math.sin(ph)) * -sp * 1.5;
    ctx.translate(0, bob);
    // far legs
    const gait = a => Math.sin(ph + a) * 0.55 * sp;
    ctx.save(); ctx.translate(-L * 0.33, hipY); ctx.rotate(gait(Math.PI)); ctx.globalAlpha = 0.75; ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
    ctx.save(); ctx.translate(L * 0.3, hipY); ctx.rotate(gait(0)); ctx.globalAlpha = 0.75; ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
    // tail
    if (P.tailLen) { ctx.save(); ctx.translate(-L * 0.48, -H * 0.2); ctx.rotate(Math.sin(ph * 0.7) * 0.25 + (s.tail === 'long' ? 0.5 : -0.2)); ctx.drawImage(img(P.tail), -P.tail.ox, -P.tail.oy); ctx.restore(); }
    ctx.drawImage(img(P.body), -P.body.ox, -P.body.oy);
    // near legs
    ctx.save(); ctx.translate(-L * 0.3, hipY); ctx.rotate(gait(0)); ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
    ctx.save(); ctx.translate(L * 0.33, hipY); ctx.rotate(gait(Math.PI)); ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
    // head: lowered when grazing
    ctx.save(); ctx.translate(L * 0.42, -H * 0.3); ctx.rotate((anim.graze || 0) * 0.9 - 0.1 + Math.sin(ph * 0.5) * 0.03); ctx.drawImage(img(P.head), -P.head.ox, -P.head.oy); ctx.restore();
    ctx.restore();
  };
  rig.main = parts.body;
  return rig;
}

// =========================================================== BIPED (people)
// spec: {len (height px), skin, shirt, pants, hair, hat, rifle, rod}
function buildBiped(s) {
  const Hh = s.len || 60, W = Math.round(Hh * 0.36), parts = {};
  const dark = '#1a1410';
  { // torso + head, pivot at hips
    const o = R.mk(W + 6, Math.round(Hh * 0.62) + 4), cx = o.w / 2;
    const headR = Math.round(Hh * 0.09), torsoH = Math.round(Hh * 0.32), neckY = 3 + headR * 2 + 1;
    // head
    R.ellipse(o, cx, 3 + headR, headR, headR, { back: s.hair || '#3a2a1a', mid: s.skin, belly: s.skin, dark });
    R.px(o, cx - headR, 3, s.hair || '#3a2a1a', headR * 2 + 1, headR * 0.8);
    if (s.hat) { R.px(o, cx - headR - 2, 3 + headR * 0.4, s.hat, headR * 2 + 5, 2); R.px(o, cx - headR, 1, s.hat, headR * 2 + 1, headR * 0.8 + 2); }
    R.px(o, cx + 1, 3 + headR, '#101010', 1, 1);
    // torso
    R.px(o, cx - W / 2, neckY, s.shirt, W, torsoH); R.px(o, cx - W / 2, neckY, dark, 1, torsoH); R.px(o, cx + W / 2 - 1, neckY, dark, 1, torsoH);
    R.dith(o, cx - W / 2 + 1, neckY + 1, W - 2, torsoH - 2, R.lo(s.shirt), 0, 3);
    R.px(o, cx - W / 2 + 2, neckY, R.hi(s.shirt), 2, torsoH * 0.5);
    parts.torso = R.part(o, cx, neckY + torsoH);
    parts.shoulderY = neckY + 2 - (neckY + torsoH);
  }
  { // arm, pivot at shoulder
    const al = Math.round(Hh * 0.3), o = R.mk(5, al + 2);
    R.px(o, 1, 0, s.shirt, 3, al * 0.5); R.px(o, 1, al * 0.5, s.skin, 3, al * 0.5); R.px(o, 1, 0, dark, 1, al); R.px(o, 1, al - 2, s.skin, 3, 2);
    parts.arm = R.part(o, 2, 1); parts.armLen = al;
  }
  { // leg, pivot at hip
    const ll = Math.round(Hh * 0.42), o = R.mk(6, ll + 3);
    R.px(o, 1, 0, s.pants, 4, ll); R.px(o, 1, 0, dark, 1, ll); R.px(o, 0, ll, s.boots || '#222', 6, 3);
    parts.leg = R.part(o, 3, 0); parts.legLen = ll;
  }
  if (s.rifle) { const o = R.mk(Math.round(Hh * 0.45), 4); R.px(o, 0, 1, '#2a2a2a', o.w, 2); R.px(o, 2, 2, '#5a3a1a', o.w * 0.35, 2); parts.rifle = R.part(o, o.w * 0.3, 2); }
  if (s.rod) { const o = R.mk(Math.round(Hh * 0.7), 3); R.px(o, 0, 1, '#3a2a1a', o.w, 1); parts.rod = R.part(o, 2, 1); }
  const rig = { kind: 'biped', parts, len: Hh, height: Hh, foot: 0, head: -Hh * 0.95 };
  // anim: {phase, speed, panic, aim}
  rig.draw = (ctx, x, y, facing, angle, anim, opts = {}) => {
    const k = (opts.scale || 1) / RIG_PX, ph = anim.phase || 0, sp = anim.speed || 0;
    const img = p => (opts.white ? spriteWhite(p).c : p.c);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k);
    const P = parts, hipY = -P.legLen, bob = Math.abs(Math.sin(ph * 2)) * -sp * 1.5;
    ctx.translate(0, bob);
    const swing = Math.sin(ph) * 0.6 * sp;
    ctx.save(); ctx.translate(-1, hipY); ctx.rotate(-swing); ctx.globalAlpha = 0.8; ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
    ctx.save(); ctx.translate(1, hipY); ctx.rotate(swing); ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
    ctx.drawImage(img(P.torso), -P.torso.ox, -P.torso.oy + hipY);
    const sh = hipY + P.shoulderY;
    const panic = anim.panic || 0;
    const armA = anim.aim ? -Math.PI / 2 + 0.1 : panic ? -Math.PI + Math.sin(ph * 3) * 0.5 : swing * 0.8;
    ctx.save(); ctx.translate(-2, sh); ctx.rotate(-armA * 0.5); ctx.globalAlpha = 0.8; ctx.drawImage(img(P.arm), -P.arm.ox, -P.arm.oy); ctx.restore();
    ctx.save(); ctx.translate(2, sh); ctx.rotate(armA);
    ctx.drawImage(img(P.arm), -P.arm.ox, -P.arm.oy);
    if (P.rifle && anim.aim) { ctx.translate(0, P.armLen - 2); ctx.rotate(Math.PI / 2 + 0.05); ctx.drawImage(img(P.rifle), -P.rifle.ox, -P.rifle.oy); }
    if (P.rod && !panic) { ctx.translate(0, P.armLen - 2); ctx.rotate(Math.PI / 2 - 0.5); ctx.drawImage(img(P.rod), -P.rod.ox, -P.rod.oy); }
    ctx.restore();
    ctx.restore();
  };
  rig.main = parts.torso;
  return rig;
}

// =========================================================== TURTLE
function buildTurtle(s) {
  const L = s.len || 40, H = Math.round(L * 0.42), parts = {}, dark = s.dark || R.lo2(s.shell);
  { const o = R.mk(L + 4, H + 4), cx = o.w / 2, cy = o.h / 2;
    // domed shell with scute plates
    for (let i = 0; i < L; i++) { const u = i / L, hh = Math.round(H / 2 * Math.sin(u * Math.PI) * 0.95 + 1); R.px(o, 2 + i, cy - hh, s.shell, 1, hh + 2); R.px(o, 2 + i, cy - hh, dark); R.px(o, 2 + i, cy + 1, R.lo(s.shell), 1, 2); R.px(o, 2 + i, cy + 2, dark, 1, 1); }
    for (let k = 0; k < 5; k++) { const x = 2 + L * (0.15 + k * 0.17); R.px(o, x, cy - H / 2 + 2, dark, 1, H * 0.45); }
    R.px(o, 2 + L * 0.15, cy - H * 0.22, dark, L * 0.72, 1);
    for (let k = 0; k < 4; k++) R.px(o, 2 + L * (0.2 + k * 0.17), cy - H * 0.42, R.hi(s.shell), L * 0.09, 2);
    if (s.spiky) for (let k = 0; k < 5; k++) R.px(o, 2 + L * (0.15 + k * 0.17) + 2, cy - H / 2 - 1, dark, 2, 2);
    // plastron
    R.px(o, 2 + L * 0.12, cy + 3, s.belly || '#c8b080', L * 0.76, 2);
    parts.shell = R.part(o, cx, cy); }
  { const hs = Math.round(H * 0.55), o = R.mk(hs * 2 + 2, hs + 2); R.ellipse(o, hs, hs / 2 + 1, hs, hs / 2, { back: s.skin, mid: s.skin, belly: R.hi(s.skin), dark }); R.px(o, hs * 1.3, hs * 0.3, '#ffffff', 2, 2); R.px(o, hs * 1.3 + 1, hs * 0.3, '#101010', 1, 2); if (s.hooked) R.px(o, hs * 2 - 1, hs * 0.6, dark, 1, 2); parts.head = R.part(o, 1, hs / 2 + 1); }
  { const o = R.mk(5, Math.round(H * 0.5) + 1); R.px(o, 1, 0, s.skin, 3, o.h - 1); R.px(o, 0, o.h - 2, dark, 5, 1); parts.leg = R.part(o, 2, 0); }
  const rig = { kind: 'turtle', parts, len: L * 1.3, height: H, foot: H * 0.25 + H * 0.5 };
  rig.draw = (ctx, x, y, facing, angle, anim, opts = {}) => {
    const k = (opts.scale || 1) / RIG_PX, ph = anim.phase || 0, sp = anim.speed || 0;
    const img = p => (opts.white ? spriteWhite(p).c : p.c);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k);
    const P = parts;
    for (const [lx, a] of [[-L * 0.3, 0], [L * 0.25, Math.PI]]) { ctx.save(); ctx.translate(lx, H * 0.25); ctx.rotate(Math.sin(ph + a) * 0.6 * (0.3 + sp)); ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore(); }
    ctx.save(); ctx.translate(L * 0.45, H * 0.05); ctx.rotate(Math.sin(ph * 0.5) * 0.08); ctx.drawImage(img(P.head), -P.head.ox, -P.head.oy); ctx.restore();
    ctx.drawImage(img(P.shell), -P.shell.ox, -P.shell.oy);
    ctx.restore();
  };
  rig.main = parts.shell;
  return rig;
}
// =========================================================== FROG
function buildFrog(s) {
  const L = s.len || 24, H = Math.round(L * 0.55), parts = {}, dark = R.lo2(s.body);
  { const o = R.mk(L + 4, H + 6), cx = o.w / 2, cy = o.h / 2 + 1;
    R.ellipse(o, cx, cy, L / 2, H / 2, { back: s.body, mid: s.body, belly: s.belly || R.hi(s.body), dark });
    R.dith(o, 3, cy - H / 2 + 2, L - 4, H / 2, R.lo(s.body), 0, 3);
    if (s.spots) for (let k = 0; k < 6; k++) R.px(o, 3 + ihash(k, 21) * (L - 6), cy - H / 2 + 2 + ihash(k, 22) * (H * 0.4), R.lo2(s.body), 2, 2);
    // bulging eyes
    for (const ex of [cx + L * 0.28, cx - L * 0.05]) { R.px(o, ex - 2, cy - H / 2 - 3, s.body, 5, 4); R.px(o, ex - 1, cy - H / 2 - 2, '#e0c030', 3, 2); R.px(o, ex, cy - H / 2 - 2, '#101010', 1, 2); }
    R.px(o, cx + L * 0.1, cy + H * 0.2, dark, L * 0.4, 1);
    parts.body = R.part(o, cx, cy); }
  { const o = R.mk(Math.round(L * 0.45), Math.round(H * 0.6)); R.px(o, 0, 0, s.body, o.w, 3); R.px(o, o.w - 3, 0, s.body, 3, o.h); R.px(o, o.w - 5, o.h - 2, s.body, 5, 2); R.px(o, 0, 0, dark, o.w, 1); parts.leg = R.part(o, 1, 1); }
  const rig = { kind: 'frog', parts, len: L, height: H, foot: H * 0.55 };
  rig.draw = (ctx, x, y, facing, angle, anim, opts = {}) => {
    const k = (opts.scale || 1) / RIG_PX, img = p => (opts.white ? spriteWhite(p).c : p.c);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k);
    const P = parts, ext = anim.jump || 0;
    ctx.save(); ctx.translate(-L * 0.35, 0); ctx.rotate(-0.6 + ext * 0.9); ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
    ctx.drawImage(img(P.body), -P.body.ox, -P.body.oy);
    ctx.save(); ctx.translate(L * 0.1, H * 0.2); ctx.rotate(0.2 + ext * 0.4); ctx.scale(0.5, 0.7); ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore();
    ctx.restore();
  };
  rig.main = parts.body;
  return rig;
}
// =========================================================== CRAB / CRAYFISH
function buildCrab(s) {
  const L = s.len || 20, H = Math.round(L * (s.long ? 0.35 : 0.55)), parts = {}, dark = R.lo2(s.body);
  { const o = R.mk(L + 4, H + 4), cx = o.w / 2, cy = o.h / 2;
    R.ellipse(o, cx, cy, L / 2, H / 2, { back: s.body, mid: s.body, belly: R.lo(s.body), dark });
    R.dith(o, 3, cy - H / 2 + 1, L - 4, H - 2, R.lo(s.body), 0, 2);
    if (s.long) for (let k = 0; k < 5; k++) R.px(o, 3 + k * (L / 5), cy - H / 2 + 1, dark, 1, H - 2);
    R.px(o, cx + L * 0.35, cy - H / 2 - 1, '#ffffff', 2, 2); R.px(o, cx + L * 0.35 + 1, cy - H / 2 - 1, '#101010', 1, 1);
    parts.body = R.part(o, cx, cy); }
  { const o = R.mk(Math.round(L * 0.5), 5); R.px(o, 0, 1, s.body, o.w - 3, 2); R.px(o, o.w - 4, 0, s.claw || s.body, 4, 2); R.px(o, o.w - 4, 3, s.claw || s.body, 4, 2); R.px(o, 0, 1, dark, o.w, 1); parts.claw = R.part(o, 0, 2); }
  { const o = R.mk(3, Math.round(H * 0.7)); R.px(o, 1, 0, s.body, 1, o.h); R.px(o, 0, o.h - 1, dark, 3, 1); parts.leg = R.part(o, 1, 0); }
  const rig = { kind: 'crab', parts, len: L * 1.5, height: H, foot: H * 0.2 + H * 0.7 };
  rig.draw = (ctx, x, y, facing, angle, anim, opts = {}) => {
    const k = (opts.scale || 1) / RIG_PX, ph = anim.phase || 0, img = p => (opts.white ? spriteWhite(p).c : p.c);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k);
    const P = parts;
    for (let i = 0; i < 4; i++) { const lx = -L * 0.35 + i * L * 0.22; ctx.save(); ctx.translate(lx, H * 0.2); ctx.rotate(Math.sin(ph * 2 + i * 1.5) * 0.5); ctx.drawImage(img(P.leg), -P.leg.ox, -P.leg.oy); ctx.restore(); }
    ctx.drawImage(img(P.body), -P.body.ox, -P.body.oy);
    ctx.save(); ctx.translate(L * 0.4, -H * 0.1); ctx.rotate(-0.4 + Math.sin(ph) * 0.2); ctx.drawImage(img(P.claw), -P.claw.ox, -P.claw.oy); ctx.restore();
    ctx.save(); ctx.translate(L * 0.35, H * 0.15); ctx.rotate(0.2 + Math.sin(ph + 1) * 0.2); ctx.drawImage(img(P.claw), -P.claw.ox, -P.claw.oy); ctx.restore();
    ctx.restore();
  };
  rig.main = parts.body;
  return rig;
}
// =========================================================== SNAKE PARTS
// spec: {base, band, belly, dark, eye, pattern: 'bands'|'blotch'|'plain', hood}
const snakeCache = new Map();
function snakeParts(spec) {
  if (snakeCache.has(spec.id)) return snakeCache.get(spec.id);
  const S = 12, parts = {};                              // segment is 12x12 at RIG_PX
  const seg = (v) => {
    const o = R.mk(S, S);
    R.px(o, 0, 2, R.lo2(spec.dark), S, 1); R.px(o, 0, 3, spec.base, S, 3); R.px(o, 0, 6, R.lo(spec.base), S, 3); R.px(o, 0, 9, spec.belly, S, 2); R.px(o, 0, 11, R.lo2(spec.dark), S, 1);
    R.dith(o, 0, 3, S, 6, R.lo(spec.base), v, 3);        // keeled scales
    R.px(o, 0, 3, R.hi(spec.base), S, 1);
    if (spec.pattern === 'bands' && v === 0) { R.px(o, 2, 2, spec.band, 6, 8); R.px(o, 3, 3, R.hi(spec.band), 1, 2); }
    if (spec.pattern === 'blotch') { R.px(o, v ? 1 : 5, 3, spec.band, 5, 4); R.px(o, v ? 2 : 6, 4, R.hi(spec.band), 2, 1); R.px(o, v ? 7 : 1, 6, spec.band, 3, 3); }
    for (let i = 1; i < S; i += 4) R.px(o, i, 10, R.lo(spec.belly), 1, 1);
    return R.part(o, S / 2, S / 2 + 1);
  };
  parts.segs = [seg(0), seg(1)];
  { const w = 20, o = R.mk(w, S);
    for (let i = 0; i < w; i++) { const u = i / w, hh = Math.round(4.5 * (u < 0.6 ? 1 : 1 - (u - 0.6) * 1.5)); R.px(o, i, 6 - hh, spec.base, 1, hh); R.px(o, i, 6, R.lo(spec.base), 1, hh - 1); R.px(o, i, 6 - hh, R.lo2(spec.dark)); R.px(o, i, 6 + hh - 2, R.lo2(spec.dark)); }
    R.px(o, 0, 8, spec.belly, w - 4, 2);
    if (spec.hood) { R.px(o, 2, 1, spec.base, 8, 1); R.px(o, 2, 0, R.lo2(spec.dark), 8, 1); }
    R.px(o, 12, 3, spec.eye || '#c0a030', 2, 2); R.px(o, 13, 3, '#101010', 1, 2);
    R.px(o, w - 2, 6, spec.tongue || '#e02020', 2, 1); R.px(o, w - 1, 7, spec.tongue || '#e02020', 1, 1);
    R.px(o, 6, 4, R.lo2(spec.dark), 1, 1); R.px(o, 9, 5, R.lo2(spec.dark), 1, 1);
    parts.head = R.part(o, 4, 6); }
  snakeCache.set(spec.id, parts);
  return parts;
}
function buildSnakeDisplay(spec) {
  const P = snakeParts(spec), n = Math.min(spec.n || 12, 14), sp = 10;
  const rig = { kind: 'snake', parts: { body: P.segs[0] }, len: sp * (n + 1) * 0.7, height: 24, foot: 6 };
  rig.draw = (ctx, x, y, facing, angle, anim, opts = {}) => {
    const k = (opts.scale || 1) / RIG_PX, ph = anim.phase || 0, img = p => (opts.white ? spriteWhite(p).c : p.c);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k);
    for (let i = n; i >= 1; i--) { const u = i / n, sx = -i * sp * 0.7 + sp * n * 0.3, sy = Math.sin(ph + i * 0.8) * 6 * u; const s = P.segs[i % 2]; ctx.drawImage(img(s), Math.round(sx - s.ox), Math.round(sy - s.oy)); }
    ctx.drawImage(img(P.head), Math.round(sp * n * 0.3 - P.head.ox), Math.round(-P.head.oy));
    ctx.restore();
  };
  rig.main = P.segs[0];
  return rig;
}
// =========================================================== SNAIL
function buildSnail(s) {
  const L = s.len || 18, parts = {}, dark = R.lo2(s.shell);
  { const o = R.mk(L + 4, L + 2), cx = o.w / 2, cy = L * 0.5;
    R.ellipse(o, cx + 1, cy, L * 0.45, L * 0.42, { back: s.shell, mid: s.shell, belly: R.lo(s.shell), dark });
    // spiral
    for (let k = 0; k < 4; k++) { const rr = L * 0.42 - k * L * 0.1; R.px(o, cx + 1 - rr * 0.6, cy - rr * 0.3, R.lo(s.shell), rr * 1.2, 1); }
    R.px(o, cx - L * 0.1, cy - L * 0.3, R.hi(s.shell), L * 0.25, 1);
    // body / foot
    R.px(o, 1, cy + L * 0.35, s.body, L + 2, 3); R.px(o, 1, cy + L * 0.35 + 3, dark, L + 2, 1);
    R.px(o, o.w - 3, cy + L * 0.2, s.body, 2, 4); R.px(o, o.w - 2, cy + L * 0.15, dark, 1, 1);
    parts.body = R.part(o, cx, cy); }
  const rig = { kind: 'snail', parts, len: L * 1.3, height: L, foot: L * 0.55 };
  rig.draw = (ctx, x, y, facing, angle, anim, opts = {}) => {
    const k = (opts.scale || 1) / RIG_PX, img = p => (opts.white ? spriteWhite(p).c : p.c);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k * (1 + Math.sin((anim.phase || 0) * 2) * 0.03));
    ctx.drawImage(img(parts.body), -parts.body.ox, -parts.body.oy); ctx.restore();
  };
  rig.main = parts.body;
  return rig;
}
// =========================================================== RAY
function buildRay(s) {
  const L = s.len || 40, parts = {}, dark = R.lo2(s.body);
  { const o = R.mk(L + 4, L * 0.6 + 4), cx = o.w / 2, cy = o.h / 2;
    R.ellipse(o, cx, cy, L / 2, L * 0.3, { back: s.body, mid: s.body, belly: s.body, dark });
    R.dith(o, 3, cy - L * 0.3 + 2, L - 4, L * 0.6 - 4, R.lo(s.body), 0, 3);
    for (let k = 0; k < 8; k++) R.px(o, 3 + ihash(k, 31) * (L - 6), cy - L * 0.3 + 2 + ihash(k, 32) * (L * 0.5), s.spot || R.hi(s.body), 2, 1);
    R.px(o, cx + L * 0.2, cy - 2, '#ffffff', 2, 2); R.px(o, cx + L * 0.2 + 1, cy - 2, '#101010', 1, 2); R.px(o, cx - L * 0.2, cy - 2, '#ffffff', 2, 2); R.px(o, cx - L * 0.2, cy - 2, '#101010', 1, 2);
    parts.body = R.part(o, cx, cy); }
  { const tl = Math.round(L * 0.9), o = R.mk(tl + 2, 4); for (let i = 0; i < tl; i++) R.px(o, i, 1, R.lo(s.body), 1, 2 - Math.round(i / tl)); R.px(o, 2, 0, '#e8e8d8', 4, 1); parts.tail = R.part(o, tl, 2); }
  const rig = { kind: 'ray', parts, len: L * 1.6, height: L * 0.6, foot: L * 0.3 };
  rig.draw = (ctx, x, y, facing, angle, anim, opts = {}) => {
    const k = (opts.scale || 1) / RIG_PX, ph = anim.phase || 0, img = p => (opts.white ? spriteWhite(p).c : p.c);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k);
    const P = parts;
    ctx.save(); ctx.translate(-L * 0.45, 0); ctx.rotate(Math.sin(ph) * 0.3); ctx.drawImage(img(P.tail), -P.tail.ox, -P.tail.oy); ctx.restore();
    ctx.save(); ctx.scale(1, 1 + Math.sin(ph * 1.5) * 0.15 * (anim.speed || 0)); ctx.drawImage(img(P.body), -P.body.ox, -P.body.oy); ctx.restore();
    ctx.restore();
  };
  rig.main = parts.body;
  return rig;
}
