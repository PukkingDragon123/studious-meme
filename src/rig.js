'use strict';
// ---------------------------------------------------------------------------
// Toon rigs. Every animal is generated as a small set of hand-drawn-looking
// pixel parts (round bodies, dark outlines, big eyes) that a pose() function
// arranges from an animation state, so limbs swing, tails wag, wings beat and
// heads bob. Parts are separate so bites can tear them off and deaths can
// scatter them. Art is authored at world resolution (1 sprite px = 1 world px).
// ---------------------------------------------------------------------------
const RIG_PX = 1;
// stylized game sizes: body length (or height for people) in world px at scale 1
const GS_K = { fish: 22, bird: 20, land: 22, snake: 24, turtle: 24, frog: 20, bottom: 20, ray: 24 };
function gsOf(sp) {
  if (sp.gs) return sp.gs;
  if (sp.cat === 'human') return 44;
  if (sp.cat === 'boss') return 96;
  return Math.max(8, Math.round((GS_K[sp.cat] || 22) * Math.pow(sp.ft || 1, 0.5)));
}
const ftToPx = ft => 22 * Math.pow(ft, 0.5);   // same curve, for things that are not species (boats, docks)
const rigCache = new Map();
function rigOf(spec, variant = 0) {
  const key = spec.id + ':' + variant;
  if (rigCache.has(key)) return rigCache.get(key);
  const s = Object.assign({}, spec, { len: gsOf(spec), variant });
  if (s.cat === 'human') Object.assign(s, humanVariant(s, variant));
  let rig;
  switch (s.rig) {
    case 'fish': rig = buildFish(s); break;
    case 'bird': rig = buildBird(s); break;
    case 'quad': rig = buildQuad(s); break;
    case 'biped': rig = buildBiped(s); break;
    case 'turtle': rig = buildTurtle(s); break;
    case 'frog': rig = buildFrog(s); break;
    case 'crab': rig = buildCrab(s); break;
    case 'ray': rig = buildRay(s); break;
    case 'snail': rig = buildSnail(s); break;
    case 'snake': rig = buildSnakeDisplay(s); break;
    default: rig = buildFish(s);
  }
  rig.spec = s; rig.scale = 1;
  if (!rig.draw) rig.draw = (ctx, x, y, facing, angle, anim, opts) => toonDraw(rig, ctx, x, y, facing, angle, anim, opts || {});
  if (!rig.world) rig.world = (x, y, facing, angle, anim, scale) => toonWorld(rig, x, y, facing, angle, anim, scale);
  rigCache.set(key, rig);
  return rig;
}
// ---- toon painter ----
const R = {
  mk(w, h) { w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); const c = mkCanvas(w, h); return { c, x: c.getContext('2d'), w, h }; },
  px(o, i, j, col, w = 1, h = 1) { o.x.fillStyle = col; o.x.fillRect(Math.round(i), Math.round(j), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); },
  hi: c => mixColor(c, '#ffffff', 0.28), hi2: c => mixColor(c, '#ffffff', 0.5), lo: c => shade(c, 0.72), lo2: c => shade(c, 0.5),
  ol: c => mixColor(shade(c, 0.35), '#140c08', 0.5),
  // solid disc
  disc(o, cx, cy, r, col) {
    if (r < 1) { R.px(o, cx - 0.5, cy - 0.5, col); return; }
    for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++) { const dy = j + 0.5 - cy; const hw = Math.sqrt(Math.max(0, r * r - dy * dy)); if (hw < 0.4) continue; R.px(o, Math.round(cx - hw), j, col, Math.round(cx + hw) - Math.round(cx - hw), 1); }
  },
  // toon-shaded ellipse: base colour, darker underside, a highlight spot up and forward
  blob(o, cx, cy, rx, ry, base, opts = {}) {
    const light = opts.light || R.hi(base), dark = opts.shade || R.lo(base), hl = opts.hl !== false && rx >= 3 && ry >= 3;
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const u = (i + 0.5 - cx) / rx, v = (j + 0.5 - cy) / ry, d = u * u + v * v;
      if (d > 1) continue;
      let col = base;
      if (v > 0.4 || (d > 0.72 && v > 0.05)) col = dark;
      if (hl && (u - (opts.hx ?? 0.25)) * (u - (opts.hx ?? 0.25)) + (v + 0.5) * (v + 0.5) < 0.09) col = light;
      if (opts.pat) { const pc = opts.pat(i, j, u, v); if (pc) col = pc; }
      o.x.fillStyle = col; o.x.fillRect(i, j, 1, 1);
    }
  },
  // rounded rectangle
  rrect(o, x, y, w, h, r, col) {
    for (let j = 0; j < h; j++) { let inset = 0; if (j < r) inset = r - Math.round(Math.sqrt(r * r - (r - j - 0.5) * (r - j - 0.5))); else if (j >= h - r) inset = r - Math.round(Math.sqrt(r * r - (j + 0.5 - (h - r)) * (j + 0.5 - (h - r)))); R.px(o, x + inset, y + j, col, w - inset * 2, 1); }
  },
  // 1px dark outline around everything opaque on the canvas
  outline(o, col = '#1c1410') {
    const { w, h } = o, img = o.x.getImageData(0, 0, w, h), d = img.data, a = new Uint8Array(w * h);
    for (let k = 0; k < w * h; k++) a[k] = d[k * 4 + 3] > 40 ? 1 : 0;
    const [r, g, b] = hexToRgb(col);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i; if (a[k]) continue;
      if ((i > 0 && a[k - 1]) || (i < w - 1 && a[k + 1]) || (j > 0 && a[k - w]) || (j < h - 1 && a[k + w])) { d[k * 4] = r; d[k * 4 + 1] = g; d[k * 4 + 2] = b; d[k * 4 + 3] = 255; }
    }
    o.x.putImageData(img, 0, 0);
  },
  // big cartoon eye: dark ring, white, pupil looking `look` (dx,dy in -1..1), catchlight
  eye(o, x, y, r, opts = {}) {
    const ring = opts.ring || '#1c1410';
    if (r < 1.6) { R.px(o, x - 1, y - 1, ring, 3, 3); R.px(o, x - 1, y - 1, '#ffffff', 2, 2); R.px(o, x, y, '#141414'); return; }
    const rr = opts.scared ? r * 1.25 : r;
    R.disc(o, x, y, rr + 1, ring); R.disc(o, x, y, rr, '#ffffff');
    const pr = Math.max(1, Math.round(rr * (opts.scared ? 0.38 : 0.58)));
    const look = opts.look || [0.35, 0.05], lx = look[0] * Math.max(0, rr - pr), ly = look[1] * Math.max(0, rr - pr);
    if (opts.iris) R.disc(o, x + lx, y + ly, Math.min(rr - 0.5, pr + 1), opts.iris);
    R.disc(o, x + lx, y + ly, pr, opts.pupil || '#141414');
    R.px(o, x + lx - Math.max(0, pr - 1), y + ly - Math.max(0, pr - 1), '#ffffff');
    if (opts.lid) { R.px(o, x - rr - 1, y - rr - 1, opts.lid, rr * 2 + 3, Math.round(rr * 0.7)); }
  },
  part(o, ox, oy) { return { c: o.c, w: o.w, h: o.h, ox, oy }; },
  // a torn stump where a part used to be
  stump(ctx, pl) { ctx.fillStyle = '#5a0808'; ctx.fillRect(pl.x - 2, pl.y - 2, 4, 4); ctx.fillStyle = '#c02020'; ctx.fillRect(pl.x - 1, pl.y - 1, 2, 2); },
  draw(ctx, p, x, y, a, sx, sy) { ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a); ctx.scale(sx, sy); ctx.drawImage(p.c, -p.ox, -p.oy); ctx.restore(); },
  drawImg(ctx, img, p, x, y, a, sx, sy) { ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a); ctx.scale(sx, sy); ctx.drawImage(img, -p.ox, -p.oy); ctx.restore(); },
};
// shared renderer for posed rigs. opts: {scale, white, alpha, missing:Set(ids)}
function toonDraw(rig, ctx, x, y, facing, angle, anim, opts) {
  const k = (opts.scale || 1) / RIG_PX, list = rig.pose(anim, opts), miss = opts.missing;
  const img = p => (opts.white ? spriteWhite(p).c : p.c);
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle * facing); ctx.scale(k * facing, k);
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  for (const pl of list) {
    if (miss && pl.id && miss.has(pl.id)) { R.stump(ctx, pl); continue; }
    ctx.save(); ctx.translate(pl.x, pl.y); if (pl.a) ctx.rotate(pl.a); if (pl.sx != null || pl.sy != null) ctx.scale(pl.sx ?? 1, pl.sy ?? 1);
    if (pl.alpha != null) ctx.globalAlpha *= pl.alpha;
    ctx.drawImage(img(pl.p), -pl.p.ox, -pl.p.oy); ctx.restore();
  }
  ctx.restore();
}
// the same placements in world space, for gibs and stump blood
function toonWorld(rig, x, y, facing, angle, anim, scale) {
  const k = (scale || 1) / RIG_PX, A = angle * facing, ca = Math.cos(A), sa = Math.sin(A);
  return rig.pose(anim, {}).map(pl => {
    const X = pl.x * k * facing, Y = pl.y * k;
    return { p: pl.p, id: pl.id, kind: pl.kind, wx: x + X * ca - Y * sa, wy: y + X * sa + Y * ca, wa: A + (pl.a || 0) * facing, k, facing };
  });
}
// ---- fin / lobe shapes ----
// a rounded fin lobe drawn into its own canvas; `dir` = 1 lobe points right, -1 left. pivot at the base edge.
function lobePart(len, hgt, col, dark, opts = {}) {
  const o = R.mk(len + 3, hgt + 3);
  for (let i = 0; i < len; i++) {
    const u = (i + 0.5) / len;
    let hh;
    if (opts.fork) { const n = u > 0.5 ? (u - 0.5) * 1.3 : 0; hh = hgt / 2 * (0.4 + 0.6 * u); const notch = Math.round(hh * n); R.px(o, 1 + i, 1 + hgt / 2 - hh, col, 1, Math.max(1, hh - notch)); R.px(o, 1 + i, 1 + hgt / 2 + notch, col, 1, Math.max(1, hh - notch)); if (i % 3 === 1) { R.px(o, 1 + i, 1 + hgt / 2 - hh, dark, 1, Math.max(1, hh - notch) * 0.5); } continue; }
    hh = hgt / 2 * (opts.round ? Math.sin(Math.PI * (0.15 + 0.85 * u)) : (0.35 + 0.65 * Math.sin(u * Math.PI * 0.5)));
    if (opts.taper) hh = hgt / 2 * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - u * 0.3);
    R.px(o, 1 + i, 1 + hgt / 2 - hh, col, 1, hh * 2);
    if (i % 3 === 1) R.px(o, 1 + i, 1 + hgt / 2 - hh, dark, 1, Math.max(1, hh * 0.6));
  }
  R.outline(o, R.ol(col));
  return R.part(o, 1, 1 + hgt / 2);
}
// flip a part horizontally, keeping the pivot mirrored
function flipPart(p) { const o = R.mk(p.w, p.h); o.x.translate(p.w, 0); o.x.scale(-1, 1); o.x.drawImage(p.c, 0, 0); return R.part(o, p.w - 1 - p.ox, p.oy); }

// =========================================================== FISH
// spec: {len, h, snout:'blunt'|'point'|'gar'|'sucker', tail:'fork'|'round'|'lunate'|'eel', back, mid, belly, dark, fin, pattern:'none'|'bars'|'stripe'|'spots'|'blotch', dorsal:'soft'|'spiny'|'sail'|'none', barbels, teeth}
function buildFish(s) {
  const L = s.len, H = Math.max(5, Math.round(L * (s.h || 0.42) * 1.18)), fin = s.fin || R.lo(s.mid), OL = R.ol(s.back), parts = {};
  const dorsalH = s.dorsal === 'none' ? 0 : Math.round(H * (s.dorsal === 'sail' ? 0.55 : s.dorsal === 'spiny' ? 0.42 : 0.32));
  {
    const mT = dorsalH + 3, mB = Math.round(H * 0.35) + 3, o = R.mk(L + 4, H + mT + mB), cx = 2 + L / 2, cy = mT + H / 2;
    const prof = u => {
      let p;
      if (s.snout === 'gar') p = u < 0.55 ? Math.sqrt(Math.max(0, 1 - Math.pow((0.55 - u) / 0.6, 2))) : Math.max(0.28, 0.9 - (u - 0.55) * 1.4);
      else if (s.snout === 'point') p = Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.42) / 0.6, 2)));
      else if (s.snout === 'sucker') p = u < 0.6 ? Math.sqrt(Math.max(0, 1 - Math.pow((0.6 - u) / 0.68, 2))) : Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.6) / 0.42, 2))) * 0.85 + 0.15;
      else p = Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.45) / 0.58, 2)));
      if (s.tail === 'eel') p = Math.max(p * 0.6, 0.5 + 0.5 * Math.min(1, u * 1.6));
      return Math.max(0.14, p);
    };
    for (let i = 0; i < L; i++) {
      const u = (i + 0.5) / L, hh = H / 2 * prof(u), x = 2 + i, top = Math.round(cy - hh), bot = Math.round(cy + hh);
      for (let j = top; j <= bot; j++) { const f = (j + 0.5 - cy) / Math.max(1, hh); const col = f < -0.3 ? s.back : f < 0.42 ? s.mid : s.belly; R.px(o, x, j, col); }
      if (hh >= 2.5 && u < 0.92) R.px(o, x, top, R.hi(s.back));
    }
    // highlight spot behind the eye
    if (H >= 8) R.blob(o, 2 + L * 0.66, cy - H * 0.2, Math.max(1.5, L * 0.07), Math.max(1, H * 0.1), R.hi2(s.mid), { hl: false, shade: R.hi2(s.mid) });
    // patterns
    const bandW = Math.max(1, Math.round(L * 0.05));
    if (s.pattern === 'bars') for (let k = 0; k < 5; k++) { const x = 2 + L * (0.14 + k * 0.13); for (let j = 0; j < H; j++) { const jy = cy - H / 2 + j; if (R.inside(o, x, jy)) R.px(o, x, jy, R.lo2(s.back), bandW, 1); } }
    if (s.pattern === 'stripe') R.px(o, 2 + L * 0.12, cy, R.lo2(s.mid), L * 0.7, Math.max(1, H * 0.1));
    if (s.pattern === 'spots') for (let k = 0; k < 8; k++) { const x = 4 + ihash(k, 3) * (L - 12), y = cy - H * 0.38 + ihash(k, 4) * (H * 0.55); R.disc(o, x, y, Math.max(0.8, H * 0.07), s.spot || R.lo2(s.back)); }
    if (s.pattern === 'blotch') for (let k = 0; k < 5; k++) { const x = 5 + ihash(k, 5) * (L - 14), y = cy - H * 0.35 + ihash(k, 6) * (H * 0.4); R.blob(o, x, y, Math.max(1.5, L * 0.06), Math.max(1, H * 0.12), R.lo2(s.back), { hl: false, shade: R.lo2(s.back) }); }
    // gill arc
    const gx = 2 + L * 0.74; for (let j = -H * 0.28; j <= H * 0.28; j++) { const bulge = Math.round(Math.sqrt(Math.max(0, 1 - (j / (H * 0.3)) ** 2)) * L * 0.03); R.px(o, gx + bulge, cy + j, R.lo2(s.mid)); }
    // eye
    const er = Math.max(1.2, H * 0.17), ex = 2 + L * (s.snout === 'gar' ? 0.7 : 0.84), ey = cy - H * 0.16;
    R.eye(o, ex, ey, er, { ring: OL, iris: s.eye, look: [0.4, 0.05] });
    // mouth
    const mx = 2 + L - 1, my = cy + H * 0.14;
    if (s.snout === 'gar') { for (let i = 0; i < L * 0.22; i++) R.px(o, mx - i, my - 1 + (i % 2), R.lo2(s.mid)); for (let i = 1; i < L * 0.2; i += 2) R.px(o, mx - i, my, '#f4f0e0'); }
    else { for (let i = 0; i < L * 0.1; i++) R.px(o, mx - i, my - Math.round(i * 0.25), R.lo2(s.mid)); if (s.teeth) for (let i = 1; i < L * 0.09; i += 2) R.px(o, mx - i, my - Math.round(i * 0.25) + 1, '#f4f0e0'); }
    if (s.barbels) { for (let k = 1; k < 5; k++) { R.px(o, mx - 1 + k * 0.7, my + 1 + k, '#3a3a3a'); R.px(o, mx - 3 - k, my + 3 + k * 0.6, '#3a3a3a'); } }
    // dorsal fin
    if (dorsalH) {
      const dx0 = 2 + L * (s.dorsal === 'sail' ? 0.22 : 0.32), dl = L * (s.dorsal === 'sail' ? 0.55 : 0.32);
      for (let i = 0; i < dl; i++) {
        const u = (i + 0.5) / dl, x = dx0 + i, hh = H / 2 * prof((x - 2 + 0.5) / L), top = Math.round(cy - hh);
        const fh = Math.round(dorsalH * (s.dorsal === 'spiny' ? (0.55 + 0.45 * Math.abs(Math.sin(u * 7))) * Math.sin(u * Math.PI) ** 0.5 : Math.sin(u * Math.PI) ** 0.6));
        if (fh <= 0) continue; R.px(o, x, top - fh, fin, 1, fh); if (i % 3 === 0) R.px(o, x, top - fh, R.lo(fin), 1, fh);
      }
    }
    // anal and pelvic fins
    { const ax = 2 + L * 0.4, al = L * 0.15, ah = Math.max(2, H * 0.3); for (let i = 0; i < al; i++) { const u = (i + 0.5) / al, hh = H / 2 * prof((ax + i - 2 + 0.5) / L), bot = Math.round(cy + hh); const fh = Math.round(ah * Math.sin(u * Math.PI) ** 0.7); if (fh > 0) { R.px(o, ax + i, bot, fin, 1, fh); if (i % 3 === 1) R.px(o, ax + i, bot, R.lo(fin), 1, fh); } } }
    R.outline(o, OL);
    parts.body = R.part(o, cx, cy);
    parts.tailRootX = 2 - cx + 1; parts.pecX = 2 + L * 0.66 - cx; parts.pecY = H * 0.14;
  }
  // tail fin (points left, pivot at the root)
  { const tl = Math.round(L * (s.tail === 'eel' ? 0.14 : 0.3)), th = Math.round(H * (s.tail === 'lunate' ? 1.35 : s.tail === 'round' ? 0.95 : 1.15)); parts.tail = flipPart(lobePart(tl, th, fin, R.lo(fin), { fork: s.tail === 'fork' || s.tail === 'lunate', round: s.tail === 'round' || s.tail === 'eel' })); }
  // pectoral fin: a small lobe hanging back and down, pivot at its base
  { const pl = Math.max(3, Math.round(L * 0.16)), ph = Math.max(2, Math.round(H * 0.28)); parts.pec = flipPart(lobePart(pl, ph, fin, R.lo(fin), { taper: true })); }
  const rig = { kind: 'fish', parts, len: L * 1.25, height: H + dorsalH, foot: H * 0.5 };
  rig.pose = anim => {
    const ph = anim.phase || 0, sp = clamp(anim.speed || 0, 0, 1.3), sw = 0.25 + sp * 0.45;
    const sq = 1 + Math.sin(ph * 2 + 1) * 0.035 * (0.3 + sp);
    return [
      { p: parts.tail, x: parts.tailRootX, y: 0, a: Math.sin(ph) * sw, id: 'tail', kind: 'tail' },
      { p: parts.body, x: 0, y: 0, a: 0, sx: 1 / sq, sy: sq, id: 'body', kind: 'body' },
      { p: parts.pec, x: parts.pecX, y: parts.pecY, a: 0.35 + Math.sin(ph * 1.4 + 1) * 0.4, id: 'fin', kind: 'fin' },
    ];
  };
  rig.main = parts.body;
  return rig;
}
R.inside = (o, x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= o.w || y >= o.h) return false; return o.x.getImageData(x, y, 1, 1).data[3] > 40; };

// =========================================================== BIRD
// spec: {len (body px), neck 0..1, legs 0..1, beak:'spear'|'hook'|'spoon'|'pouch'|'short'|'curve', body, belly, wing, head, beakCol, legCol, crest}
function buildBird(s) {
  const L = s.len, H = Math.max(6, Math.round(L * 0.66)), OL = R.ol(s.body), parts = {};
  const hs = Math.max(3, Math.round(L * 0.23)), neckLen = Math.round(L * (0.06 + (s.neck || 0.3) * 0.5)), legLen = Math.max(3, Math.round(L * (0.1 + (s.legs || 0.3) * 0.5)));
  { // body: plump oval with tail feathers
    const o = R.mk(L + 12, H + 6), cx = 8 + L / 2, cy = 3 + H / 2;
    for (let k = -1; k <= 1; k++) { R.px(o, 2, cy + k * Math.max(1, H * 0.16) - 1, s.wing || R.lo(s.body), L * 0.3, Math.max(1, H * 0.14)); }
    R.blob(o, cx, cy, L / 2, H / 2, s.body, { pat: (i, j, u, v) => (v > 0.15 && u * u + v * v < 0.98 ? (v > 0.55 ? R.lo(s.belly || R.hi(s.body)) : (s.belly || R.hi(s.body))) : null) });
    R.outline(o, OL);
    parts.body = R.part(o, cx, cy);
  }
  { // head: round with a big eye and a beak
    const bl = Math.round(hs * (s.beak === 'spear' || s.beak === 'spoon' ? 1.7 : s.beak === 'pouch' ? 1.5 : s.beak === 'curve' ? 1.4 : 0.8));
    const o = R.mk(hs * 2 + bl + 6, hs * 2 + 8), hx = 3 + hs, hy = 4 + hs, hc = s.head || s.body, bc = s.beakCol || '#e0b040';
    R.blob(o, hx, hy, hs, hs, hc);
    if (s.crest) for (let k = 0; k < 3; k++) R.px(o, hx - hs * 0.4 - k * 2, hy - hs - 1 - k, s.crest, 2, 2 + k);
    const bx = hx + hs - 1, by = hy + hs * 0.1;
    if (s.beak === 'spear') for (let i = 0; i < bl; i++) R.px(o, bx + i, by - 1 + Math.round(i * 0.06), bc, 1, Math.max(1, 3 - i * 2.2 / bl));
    else if (s.beak === 'spoon') { R.px(o, bx, by, bc, bl * 0.6, 2); R.blob(o, bx + bl * 0.75, by + 1, bl * 0.3, 2.2, bc, { hl: false }); }
    else if (s.beak === 'pouch') { R.px(o, bx, by - 1, bc, bl, 2); R.blob(o, bx + bl * 0.45, by + 2.5, bl * 0.45, 2.5, R.lo(bc), { hl: false }); }
    else if (s.beak === 'hook') { R.px(o, bx, by - 1, bc, bl, 3); R.px(o, bx + bl - 2, by + 2, R.lo(bc), 2, 2); }
    else if (s.beak === 'curve') for (let i = 0; i < bl; i++) R.px(o, bx + i, by + Math.round(i * i * 0.08), bc, 1, 2);
    else { R.px(o, bx, by, bc, bl, 2); R.px(o, bx, by + 1, R.lo(bc), bl, 1); }
    R.eye(o, hx + hs * 0.3, hy - hs * 0.15, Math.max(1.5, hs * 0.36), { ring: OL, look: [0.4, 0.1] });
    R.outline(o, OL);
    parts.head = R.part(o, hx, hy + hs * 0.6);   // pivot at the top of the neck
  }
  { const ns = Math.max(1.5, L * 0.085); const o = R.mk(ns * 2 + 3, ns * 2 + 3); R.disc(o, ns + 1, ns + 1, ns, s.body); R.disc(o, ns + 1 - ns * 0.35, ns + 1, ns * 0.5, R.hi(s.body)); parts.neck = R.part(o, ns + 1, ns + 1);
    const e = R.mk(ns * 2 + 5, ns * 2 + 5); R.disc(e, ns + 2, ns + 2, ns + 1, OL); parts.neckEdge = R.part(e, ns + 2, ns + 2); parts.neckR = ns; }
  { // wing lobe, pivot at the shoulder root (left end), extends right; drawn mirrored so it trails
    const wl = Math.round(L * 0.9), wh = Math.max(3, Math.round(H * 0.45));
    parts.wing = flipPart(lobePart(wl, wh, s.wing || R.lo(s.body), R.lo2(s.wing || s.body), { round: true }));
    const far = R.mk(parts.wing.w, parts.wing.h); far.x.drawImage(parts.wing.c, 0, 0); far.x.globalCompositeOperation = 'source-atop'; far.x.fillStyle = 'rgba(0,0,0,0.28)'; far.x.fillRect(0, 0, far.w, far.h); parts.wingFar = R.part(far, parts.wing.ox, parts.wing.oy);
  }
  { const lc = s.legCol || '#4a4a3a', o = R.mk(7, legLen + 3); R.px(o, 3, 0, lc, 1, legLen); R.px(o, 1, legLen, lc, 5, 1); R.px(o, 3, legLen - 1, lc, 1, 2); R.outline(o, R.ol(lc)); parts.leg = R.part(o, 3, 0); }
  const rig = { kind: 'bird', parts, len: L + neckLen * 0.5, height: H + neckLen + legLen, foot: H * 0.5 + legLen, flyLen: L * 1.8 };
  rig.pose = anim => {
    const ph = anim.phase || 0, mode = anim.mode || 'stand', P = parts, out = [];
    const shoulder = [L * 0.05, -H * 0.28], hip = [-L * 0.02, H * 0.3];
    const neckCurve = (sx, sy, tx, ty, bend) => {
      const n = Math.max(2, Math.round(neckLen / Math.max(1, P.neckR * 0.55)));
      const pts = [];
      for (let i = 0; i <= n + 1; i++) { const t = i / (n + 1), mx = (sx + tx) / 2 + bend, my = (sy + ty) / 2; pts.push([(1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * tx, (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ty]); }
      for (const q of pts) out.push({ p: P.neckEdge, x: q[0], y: q[1], a: 0, kind: 'neck' });
      for (const q of pts) out.push({ p: P.neck, x: q[0], y: q[1], a: 0, kind: 'neck' });
    };
    if (mode === 'fly' || mode === 'dive') {
      const flap = mode === 'dive' ? 0.7 : Math.sin(ph), wingA = -0.35 - flap * 0.95;
      out.push({ p: P.wingFar, x: shoulder[0] + 2, y: shoulder[1] + 2, a: -wingA * 0.9 + 0.4, sx: 1, sy: -1, id: 'wing1', kind: 'wing' });
      out.push({ p: P.leg, x: hip[0] - L * 0.15, y: hip[1] - 2, a: 1.25, sx: 1, sy: 0.7, id: 'leg0', kind: 'leg' });
      out.push({ p: P.body, x: 0, y: 0, a: 0.1, id: 'body', kind: 'body' });
      const tuck = s.neck > 0.6 && mode === 'fly';
      const hx = L * 0.46 + neckLen * (tuck ? 0.1 : 0.7), hy = -H * 0.12 + (mode === 'dive' ? H * 0.25 : 0);
      neckCurve(L * 0.3, -H * 0.2, hx, hy, tuck ? -L * 0.12 : 0);
      out.push({ p: P.head, x: hx, y: hy, a: mode === 'dive' ? 0.6 : 0.25, id: 'head', kind: 'head' });
      out.push({ p: P.wing, x: shoulder[0], y: shoulder[1], a: wingA, sx: 1, sy: -1, id: 'wing0', kind: 'wing' });
    } else if (mode === 'swim') {
      out.push({ p: P.body, x: 0, y: H * 0.15, a: 0, id: 'body', kind: 'body' });
      out.push({ p: P.wing, x: shoulder[0], y: shoulder[1] + H * 0.25, a: 0.25, sx: 1, sy: 0.8, id: 'wing0', kind: 'wing' });
      const hx = L * 0.32, hy = -H * 0.34 - neckLen * 0.75; neckCurve(L * 0.26, -H * 0.18, hx, hy, L * 0.08);
      out.push({ p: P.head, x: hx, y: hy, a: 0.1 + Math.sin(ph * 0.5) * 0.05, id: 'head', kind: 'head' });
    } else {
      const stride = mode === 'walk' ? Math.sin(ph) * 0.5 : 0, peck = anim.peck || 0;
      out.push({ p: P.leg, x: hip[0] - 2, y: hip[1], a: stride, id: 'leg0', kind: 'leg' });
      out.push({ p: P.leg, x: hip[0] + 3, y: hip[1], a: -stride, id: 'leg1', kind: 'leg' });
      out.push({ p: P.body, x: 0, y: 0, a: peck * 0.25, id: 'body', kind: 'body' });
      out.push({ p: P.wing, x: shoulder[0], y: shoulder[1] + 1, a: 0.15, sx: 1, sy: 0.85, id: 'wing0', kind: 'wing' });
      const up = -H * 0.42 - neckLen * (1 - peck * 1.25), fwd = L * 0.3 + neckLen * (0.2 + peck * 0.9);
      neckCurve(L * 0.24, -H * 0.24, fwd, up, -L * 0.1 * (1 - peck));
      out.push({ p: P.head, x: fwd, y: up, a: 0.1 + peck * 0.9 + Math.sin(ph * 0.5) * 0.04, id: 'head', kind: 'head' });
    }
    return out;
  };
  rig.main = parts.body;
  return rig;
}

// =========================================================== QUADRUPED
// spec: {len, h, legs, snout, ears:'short'|'long'|'none', antlers, horns, tusks, tail:'short'|'long'|'bushy'|'none', body, belly, dark, pattern, mane, mask, hoof}
function buildQuad(s) {
  const L = s.len, H = Math.max(7, Math.round(L * (s.h || 0.46) * 1.16)), OL = R.ol(s.body), parts = {};
  const legLen = Math.max(3, Math.round(H * (0.24 + (s.legs || 0.5) * 0.52))), hs = Math.max(4, Math.round(H * 0.64));
  {
    const o = R.mk(L + 6, H + 8), cx = 3 + L / 2, cy = 4 + H / 2, belly = s.belly || R.hi(s.body);
    R.blob(o, cx, cy, L / 2, H / 2, s.body, { pat: (i, j, u, v) => {
      if (s.pattern === 'spots' && ((ihash(Math.floor(i / 3) * 7 + Math.floor(j / 3), 11) > 0.72))) return s.spot || '#f0ead8';
      if (s.pattern === 'stripes' && Math.floor((i + j * 0.3) / 3) % 3 === 0 && v < 0.3) return R.lo2(s.body);
      if (s.pattern === 'bands' && Math.floor(i / 4) % 2 === 0 && v < 0.4) return R.lo(s.body);
      if (v > 0.52 && u * u + v * v < 0.94) return v > 0.78 ? R.lo(belly) : belly;
      return null;
    } });
    if (s.mane) R.px(o, cx, cy - H / 2 - 2, s.mane, L * 0.3, 3);
    R.outline(o, OL);
    parts.body = R.part(o, cx, cy);
  }
  { // head: round skull, snout blob, ears, big eye, nose
    const sn = Math.round(hs * (0.3 + (s.snout || 0.4) * 0.8)), hc = s.head || s.body, o = R.mk(hs * 2 + sn + 8, hs * 2 + 12), hx = 3 + hs, hy = 8 + hs;
    const el = s.ears === 'none' ? 0 : s.ears === 'long' ? hs * 0.8 : hs * 0.45;
    if (el) { R.blob(o, hx - hs * 0.35, hy - hs - el * 0.3, Math.max(1.5, hs * 0.22), el * 0.6, hc, { hl: false }); R.blob(o, hx + hs * 0.25, hy - hs - el * 0.25, Math.max(1.5, hs * 0.22), el * 0.55, hc, { hl: false }); R.px(o, hx - hs * 0.35, hy - hs - el * 0.3, R.hi(s.belly || hc), 1, el * 0.35); }
    if (s.antlers) { const ac = '#7a5a34'; for (const ox of [-hs * 0.4, hs * 0.1]) { R.px(o, hx + ox, hy - hs - 6, ac, 1, 7); R.px(o, hx + ox - 2, hy - hs - 5, ac, 5, 1); R.px(o, hx + ox - 2, hy - hs - 7, ac, 1, 3); R.px(o, hx + ox + 2, hy - hs - 8, ac, 1, 4); } }
    if (s.horns) { R.px(o, hx - hs * 0.5, hy - hs - 3, '#d8c8a0', 3, 4); R.px(o, hx + hs * 0.3, hy - hs - 3, '#d8c8a0', 3, 4); }
    R.blob(o, hx, hy, hs, hs, hc);
    R.blob(o, hx + hs * 0.7, hy + hs * 0.25, sn * 0.75, Math.max(2, hs * 0.5), hc, { hl: false, pat: (i, j, u, v) => (v > 0.2 ? (s.belly ? R.lo(s.belly) : R.lo(hc)) : null) });
    if (s.mask) R.px(o, hx - hs * 0.3, hy - hs * 0.45, R.lo2(hc), hs * 1.1, hs * 0.5);
    R.disc(o, hx + hs * 0.7 + sn * 0.6, hy + hs * 0.05, Math.max(1, hs * 0.16), '#1a1410');           // nose
    R.px(o, hx + hs * 0.7 + sn * 0.3, hy + hs * 0.5, R.lo2(hc), sn * 0.5, 1);                          // mouth
    if (s.tusks) { R.px(o, hx + hs * 0.7 + sn * 0.5, hy + hs * 0.45, '#f4f0e0', 1, 3); R.px(o, hx + hs * 0.7 + sn * 0.5 - 1, hy + hs * 0.45 + 2, '#f4f0e0', 1, 2); }
    R.eye(o, hx + hs * 0.25, hy - hs * 0.2, Math.max(1.5, hs * 0.3), { ring: OL, iris: s.eye, look: [0.35, 0.1] });
    R.outline(o, OL);
    parts.head = R.part(o, hx - hs * 0.6, hy + hs * 0.4);   // pivot at the neck
  }
  { const lc = s.legCol || s.body, o = R.mk(7, legLen + 4), lw = Math.max(2, Math.round(H * 0.16)); R.px(o, 3 - lw / 2, 1, lc, lw, legLen); R.px(o, 3 - lw / 2, 1, R.lo(lc), 1, legLen); R.px(o, 2 - lw / 2, legLen, s.hoof || R.lo2(lc), lw + 2, 2); R.outline(o, OL); parts.leg = R.part(o, 3, 1); }
  { const tl = s.tail === 'long' || s.tail === 'bushy' ? Math.round(L * 0.5) : s.tail === 'none' ? 0 : Math.round(L * 0.14), tc = s.tailCol || s.body;
    if (tl) { const o = R.mk(tl + 4, (s.tail === 'bushy' ? 9 : 5)); const th = s.tail === 'bushy' ? 3 : 1.5; for (let i = 0; i < tl; i++) { const hh = s.tail === 'bushy' ? th * Math.sin((i + 1) / (tl + 1) * Math.PI) ** 0.5 + 0.8 : th; R.px(o, 1 + i, o.h / 2 - hh, i < tl * 0.25 && s.tailTip ? s.tailTip : tc, 1, hh * 2); } R.outline(o, OL); parts.tail = R.part(o, tl + 1, o.h / 2); }
  }
  const rig = { kind: 'quad', parts, len: L + hs * 1.2, height: H + legLen, foot: H * 0.35 + legLen };
  rig.pose = anim => {
    const ph = anim.phase || 0, sp = clamp(anim.speed || 0, 0, 1.3), P = parts, out = [];
    const hipY = H * 0.34, bob = Math.abs(Math.sin(ph)) * -1.5 * sp, gait = a => Math.sin(ph + a) * 0.6 * sp;
    out.push({ p: P.leg, x: -L * 0.32, y: hipY + bob, a: gait(Math.PI), alpha: 0.75, id: 'leg2', kind: 'leg' });
    out.push({ p: P.leg, x: L * 0.3, y: hipY + bob, a: gait(0), alpha: 0.75, id: 'leg3', kind: 'leg' });
    if (P.tail) out.push({ p: P.tail, x: -L * 0.47, y: -H * 0.15 + bob, a: (s.tail === 'long' ? 0.55 : -0.3) + Math.sin(ph * 0.7) * 0.25, id: 'tail', kind: 'tail' });
    out.push({ p: P.body, x: 0, y: bob, a: 0, id: 'body', kind: 'body' });
    out.push({ p: P.leg, x: -L * 0.3, y: hipY + bob, a: gait(0), id: 'leg0', kind: 'leg' });
    out.push({ p: P.leg, x: L * 0.34, y: hipY + bob, a: gait(Math.PI), id: 'leg1', kind: 'leg' });
    out.push({ p: P.head, x: L * 0.42, y: -H * 0.3 + bob, a: (anim.graze || 0) * 0.95 - 0.06 + Math.sin(ph * 0.5) * 0.03, id: 'head', kind: 'head' });
    return out;
  };
  rig.main = parts.body;
  return rig;
}

// =========================================================== BIPED (cartoon people)
// spec: {len (height), skin, shirt, pants, hair, hairStyle, hat, hatCol, prop:'rifle'|'shotgun'|'rod'|'harpoon'|'camera'|'can'|'clipboard'|'syringe'|'net', coat, glasses}
const HUMAN_SKINS = ['#f0c8a0', '#e0b090', '#c89068', '#a06a44', '#704828', '#f4d0b0'];
const HUMAN_HAIR = ['#2a1a0a', '#5a3a1a', '#8a5a2a', '#c08040', '#e8d8a0', '#1a1a1a', '#a03a2a', '#d0d0d0'];
const HUMAN_SHIRTS = ['#d94a4a', '#3a6ab0', '#e0a020', '#4a9a5a', '#e06aa0', '#f0f0e0', '#7a4ab0', '#e07030', '#2a2a2a', '#40b0c0'];
const HUMAN_PANTS = ['#3050a0', '#3a3a4a', '#6a5a4a', '#c8b890', '#2a3a2a', '#8a3a3a'];
function humanVariant(sp, v) {
  const r = mulberry32((ihash(v, 77) * 1e9) ^ (sp.id.length * 131));
  const pick = a => a[Math.floor(r() * a.length)];
  const o = { skin: pick(HUMAN_SKINS), hair: pick(HUMAN_HAIR), hairStyle: pick(['short', 'short', 'long', 'bun', 'bald', 'mohawk', 'curly']), shirt: pick(HUMAN_SHIRTS), pants: pick(HUMAN_PANTS), glasses: r() < 0.2, beard: r() < 0.25 };
  if (sp.id === 'tourist') { o.hat = r() < 0.6 ? 'cap' : r() < 0.5 ? 'sun' : null; o.hatCol = pick(['#f0f0e0', '#e04040', '#3060c0', '#e0c040']); o.pattern = r() < 0.5 ? 'hawaii' : null; o.prop = r() < 0.5 ? 'camera' : r() < 0.5 ? 'can' : null; o.shorts = true; }
  if (sp.id === 'fisherman') { o.hat = r() < 0.8 ? 'bucket' : 'cap'; o.hatCol = pick(['#8a7a5a', '#5a6a4a', '#c8b890']); o.shirt = pick(['#556b2f', '#7a8a6a', '#c8b890', '#3a5a7a']); o.prop = 'rod'; o.vest = r() < 0.5; }
  if (sp.id === 'poacher') { o.hat = r() < 0.6 ? 'bandana' : 'cap'; o.hatCol = pick(['#8a2020', '#3a3a2a', '#2a2a2a']); o.shirt = pick(['#4a4a30', '#5a4a3a', '#2a3020', '#7a6a4a']); o.pattern = r() < 0.5 ? 'camo' : null; o.prop = r() < 0.7 ? 'rifle' : 'shotgun'; o.beard = r() < 0.6; }
  if (sp.id === 'ranger') { o.hat = 'ranger'; o.hatCol = '#5a4a2a'; o.shirt = '#4a6a30'; o.pants = '#3a4a28'; o.prop = r() < 0.6 ? 'rifle' : 'harpoon'; o.badge = true; }
  if (sp.id === 'kayaker') { o.hat = r() < 0.7 ? 'helmet' : null; o.hatCol = pick(['#e04040', '#e0c040', '#3060c0']); o.shirt = pick(['#e0a020', '#40b0c0', '#e06aa0']); }
  if (sp.id === 'scientist') { o.coat = true; o.hat = null; o.glasses = r() < 0.7; o.prop = r() < 0.5 ? 'clipboard' : 'syringe'; o.shirt = pick(['#3a6ab0', '#4a9a5a', '#7a4ab0']); o.pants = '#3a3a4a'; }
  if (sp.id === 'shopkeep') { o.hat = 'cap'; o.hatCol = '#e04040'; o.shirt = '#f0f0e0'; o.apron = true; o.prop = null; }
  if (sp.id === 'camper') { o.hat = r() < 0.4 ? 'beanie' : null; o.hatCol = pick(['#e04040', '#4a4a4a', '#e0c040']); o.prop = r() < 0.5 ? 'can' : 'stick'; }
  return o;
}
function buildBiped(s) {
  const Hh = s.len, hr = Math.max(4, Math.round(Hh * 0.19)), tw = Math.max(5, Math.round(Hh * 0.3)), th = Math.max(5, Math.round(Hh * 0.3)), legLen = Math.max(4, Math.round(Hh * 0.28)), armLen = Math.max(4, Math.round(Hh * 0.27));
  const skin = s.skin || '#e0b090', hair = s.hair || '#3a2a1a', shirt = s.coat ? '#f4f4f0' : (s.shirt || '#d94a4a'), pants = s.pants || '#3050a0', OL = '#1c1410', parts = {};
  const mkHead = scared => {
    const o = R.mk(hr * 2 + 10, hr * 2 + 12), hx = 5 + hr, hy = 7 + hr;
    R.blob(o, hx, hy, hr, hr * 1.05, skin, { hx: 0.15 });
    // hair
    const hs = s.hairStyle || 'short';
    if (hs !== 'bald') { R.blob(o, hx - 1, hy - hr * 0.55, hr * 0.95, hr * 0.55, hair, { hl: false }); if (hs === 'long') { R.px(o, hx - hr - 1, hy - hr * 0.5, hair, 2, hr * 1.4); R.px(o, hx - hr * 0.6, hy + hr * 0.3, hair, 1, hr * 0.7); } if (hs === 'bun') R.disc(o, hx - hr * 0.7, hy - hr * 0.9, Math.max(1.5, hr * 0.35), hair); if (hs === 'mohawk') R.px(o, hx - 1, hy - hr * 1.7, hair, 3, hr * 0.8); if (hs === 'curly') { R.disc(o, hx - hr * 0.8, hy - hr * 0.5, hr * 0.4, hair); R.disc(o, hx + hr * 0.6, hy - hr * 0.6, hr * 0.4, hair); } }
    if (s.beard) R.blob(o, hx + hr * 0.15, hy + hr * 0.62, hr * 0.62, hr * 0.42, hair, { hl: false });
    // eyes: big, wide apart; scared = wider with tiny pupils
    const er = Math.max(1.6, hr * 0.3), ey = hy - hr * 0.05;
    R.eye(o, hx + hr * 0.5, ey, er, { ring: OL, look: [0.3, 0.15], scared });
    R.eye(o, hx - hr * 0.2, ey, er * 0.9, { ring: OL, look: [0.4, 0.15], scared });
    if (s.glasses) { R.px(o, hx - hr * 0.2 - er - 1, ey - er, '#1c1410', hr * 0.7 + er * 2 + 2, 1); R.px(o, hx + hr * 0.5 + er, ey - er + 1, '#1c1410', 1, er * 1.6); }
    // mouth
    if (scared) R.blob(o, hx + hr * 0.3, hy + hr * 0.6, Math.max(1.5, hr * 0.28), Math.max(1.5, hr * 0.3), '#3a0a0a', { hl: false, shade: '#3a0a0a' });
    else { R.px(o, hx + hr * 0.1, hy + hr * 0.55, R.lo2(skin), hr * 0.5, 1); R.px(o, hx + hr * 0.6, hy + hr * 0.45, R.lo2(skin), 1, 1); }
    // brows
    if (scared) { R.px(o, hx + hr * 0.3, ey - er * 1.8, hair, hr * 0.45, 1); R.px(o, hx - hr * 0.5, ey - er * 1.8, hair, hr * 0.45, 1); }
    // hats
    const hc = s.hatCol || '#f0f0e0';
    if (s.hat === 'cap') { R.blob(o, hx, hy - hr * 0.75, hr * 1.02, hr * 0.5, hc, { hl: false }); R.px(o, hx, hy - hr * 0.45, hc, hr * 1.4, 2); R.px(o, hx, hy - hr * 0.44, R.lo(hc), hr * 1.4, 1); }
    else if (s.hat === 'bucket') { R.blob(o, hx, hy - hr * 0.7, hr * 0.95, hr * 0.55, hc, { hl: false }); R.px(o, hx - hr * 1.3, hy - hr * 0.42, hc, hr * 2.6, 2); }
    else if (s.hat === 'ranger') { R.blob(o, hx, hy - hr * 0.9, hr * 0.75, hr * 0.6, hc, { hl: false }); R.px(o, hx - hr * 1.5, hy - hr * 0.5, hc, hr * 3, 2); R.px(o, hx - hr * 0.6, hy - hr * 0.55, '#2a1a0a', hr * 1.2, 1); }
    else if (s.hat === 'sun') { R.blob(o, hx, hy - hr * 0.7, hr * 0.9, hr * 0.5, hc, { hl: false }); R.px(o, hx - hr * 1.6, hy - hr * 0.42, hc, hr * 3.2, 2); R.px(o, hx - hr * 0.8, hy - hr * 0.55, '#e04080', hr * 1.6, 1); }
    else if (s.hat === 'bandana') { R.blob(o, hx, hy - hr * 0.7, hr * 0.98, hr * 0.48, hc, { hl: false }); R.px(o, hx - hr - 2, hy - hr * 0.4, hc, 3, hr * 0.5); }
    else if (s.hat === 'helmet') { R.blob(o, hx, hy - hr * 0.55, hr * 1.05, hr * 0.7, hc, { hl: false }); R.px(o, hx - hr, hy - hr * 0.2, R.lo(hc), hr * 2, 1); }
    else if (s.hat === 'beanie') { R.blob(o, hx, hy - hr * 0.7, hr * 1.0, hr * 0.55, hc, { hl: false }); R.px(o, hx - hr, hy - hr * 0.3, R.lo(hc), hr * 2, 1); R.disc(o, hx, hy - hr * 1.25, 1.5, R.hi(hc)); }
    R.outline(o, OL);
    return R.part(o, hx, hy + hr * 1.05);   // pivot: chin / top of the neck
  };
  parts.head = mkHead(false); parts.headScared = mkHead(true);
  { // torso, pivot at the hips
    const o = R.mk(tw + 6, th + 4), x0 = 3, y0 = 2;
    R.rrect(o, x0, y0, tw, th, Math.max(1, Math.round(tw * 0.25)), shirt);
    R.px(o, x0 + 1, y0 + 1, R.hi(shirt), 2, th * 0.5); R.px(o, x0 + 1, y0 + th - 2, R.lo(shirt), tw - 2, 1);
    if (s.pattern === 'hawaii') for (let k = 0; k < 6; k++) R.disc(o, x0 + 1 + ihash(k, 41) * (tw - 2), y0 + 1 + ihash(k, 42) * (th - 2), 1, k % 2 ? '#f0e060' : '#f0f0f0');
    if (s.pattern === 'camo') for (let k = 0; k < 5; k++) R.px(o, x0 + 1 + ihash(k, 43) * (tw - 4), y0 + 1 + ihash(k, 44) * (th - 3), R.lo2(shirt), 2 + ihash(k, 45) * 2, 2);
    if (s.vest) { R.px(o, x0 + 1, y0, '#8a7a4a', 2, th * 0.7); R.px(o, x0 + tw - 3, y0, '#8a7a4a', 2, th * 0.7); }
    if (s.apron) { R.px(o, x0 + 1, y0 + 2, '#f0f0e0', tw - 2, th - 3); R.px(o, x0 + 2, y0 + 3, '#c04040', tw - 4, 1); }
    if (s.coat) { R.px(o, x0 + tw / 2 - 1, y0, '#c8c8c0', 1, th); R.px(o, x0 + 2, y0 + 2, s.shirt || '#3a6ab0', tw / 2 - 3, 2); }
    if (s.badge) R.px(o, x0 + 2, y0 + 2, '#e0c040', 2, 2);
    if (s.shorts) { R.px(o, x0, y0 + th - 1, pants, tw, 1); }
    R.outline(o, OL);
    parts.torso = R.part(o, x0 + tw / 2, y0 + th);
  }
  { const o = R.mk(7, armLen + 5), aw = Math.max(2, Math.round(Hh * 0.07)); R.px(o, 3 - aw / 2, 1, s.coat ? '#f4f4f0' : shirt, aw, armLen * 0.45); R.px(o, 3 - aw / 2, 1 + armLen * 0.45, skin, aw, armLen * 0.55); R.disc(o, 3, 1 + armLen, Math.max(1.2, aw * 0.75), skin); R.outline(o, OL); parts.arm = R.part(o, 3, 1); }
  { const o = R.mk(9, legLen + 5), lw = Math.max(2, Math.round(Hh * 0.09)); R.px(o, 4 - lw / 2, 1, pants, lw, s.shorts ? legLen * 0.45 : legLen); if (s.shorts) R.px(o, 4 - lw / 2, 1 + legLen * 0.45, skin, lw, legLen * 0.55); R.px(o, 4 - lw / 2 - 1, legLen, s.boots || '#2a2018', lw + 3, 2); R.outline(o, OL); parts.leg = R.part(o, 4, 1); }
  const propLen = Math.round(Hh * 0.5);
  const mkProp = kind => {
    if (kind === 'rifle') { const o = R.mk(propLen + 2, 6); R.px(o, 1, 2, '#2a2a2a', propLen, 2); R.px(o, 1, 3, '#5a3a1a', propLen * 0.4, 2); R.px(o, propLen * 0.55, 1, '#3a3a3a', 3, 1); R.outline(o, OL); return R.part(o, propLen * 0.35, 3); }
    if (kind === 'shotgun') { const o = R.mk(propLen, 7); R.px(o, 1, 2, '#3a3a3a', propLen - 2, 3); R.px(o, 1, 4, '#6a4a2a', propLen * 0.45, 2); R.outline(o, OL); return R.part(o, propLen * 0.35, 3); }
    if (kind === 'harpoon') { const o = R.mk(propLen + 6, 7); R.px(o, 1, 3, '#4a4a3a', propLen, 2); R.px(o, propLen - 2, 1, '#c0c0c0', 6, 1); R.px(o, propLen + 3, 0, '#e0e0e0', 2, 3); R.px(o, 2, 4, '#e0c040', propLen * 0.3, 2); R.outline(o, OL); return R.part(o, propLen * 0.3, 3); }
    if (kind === 'rod') { const o = R.mk(propLen * 1.4, 4); R.px(o, 1, 1, '#4a3a2a', propLen * 1.4 - 2, 1); R.px(o, 1, 2, '#2a2a2a', propLen * 0.2, 2); R.outline(o, OL); return R.part(o, 3, 2); }
    if (kind === 'camera') { const o = R.mk(8, 7); R.px(o, 1, 1, '#2a2a2a', 6, 5); R.px(o, 3, 2, '#60a0e0', 2, 2); R.px(o, 2, 0, '#4a4a4a', 3, 1); R.outline(o, OL); return R.part(o, 4, 4); }
    if (kind === 'can') { const o = R.mk(5, 7); R.px(o, 1, 1, '#c0c0c8', 3, 5); R.px(o, 1, 2, '#e04040', 3, 2); R.outline(o, OL); return R.part(o, 2, 3); }
    if (kind === 'clipboard') { const o = R.mk(7, 9); R.px(o, 1, 1, '#a08050', 5, 7); R.px(o, 2, 2, '#f4f4f0', 3, 5); R.px(o, 2, 3, '#8080a0', 3, 1); R.outline(o, OL); return R.part(o, 3, 5); }
    if (kind === 'syringe') { const o = R.mk(10, 5); R.px(o, 1, 2, '#e0e0f0', 6, 2); R.px(o, 2, 2, '#60e080', 4, 2); R.px(o, 7, 2, '#c0c0c0', 3, 1); R.outline(o, OL); return R.part(o, 4, 3); }
    if (kind === 'stick') { const o = R.mk(propLen * 0.8, 4); R.px(o, 1, 1, '#6a4a2a', propLen * 0.8 - 2, 2); R.px(o, propLen * 0.8 - 5, 0, '#f0e0b0', 4, 4); R.outline(o, OL); return R.part(o, 2, 2); }
    return null;
  };
  if (s.prop) parts.prop = mkProp(s.prop);
  const rig = { kind: 'biped', parts, len: Hh, height: Hh, foot: 0, head: -Hh * 0.95 };
  // anim: {phase, speed, panic, aim, sit, swim, cast}
  rig.pose = anim => {
    const ph = anim.phase || 0, sp = clamp(anim.speed || 0, 0, 1.3), P = parts, out = [];
    const panic = anim.panic ? 1 : 0, aim = anim.aim ? 1 : 0, sit = anim.sit ? 1 : 0;
    const hipY = -legLen - 1 + sit * legLen * 0.75, bob = Math.abs(Math.sin(ph * 2)) * -1.2 * sp, swing = Math.sin(ph) * 0.65 * sp;
    if (sit) { out.push({ p: P.leg, x: -1, y: hipY, a: -1.35, id: 'leg0', kind: 'leg' }); out.push({ p: P.leg, x: 2, y: hipY, a: -1.2, id: 'leg1', kind: 'leg' }); }
    else if (anim.swim) { out.push({ p: P.leg, x: -1, y: hipY, a: -0.5 + Math.sin(ph * 2) * 0.5, id: 'leg0', kind: 'leg' }); out.push({ p: P.leg, x: 2, y: hipY, a: -0.5 - Math.sin(ph * 2) * 0.5, id: 'leg1', kind: 'leg' }); }
    else { out.push({ p: P.leg, x: -1, y: hipY + bob, a: -swing, alpha: 0.85, id: 'leg0', kind: 'leg' }); out.push({ p: P.leg, x: 2, y: hipY + bob, a: swing, id: 'leg1', kind: 'leg' }); }
    const ty = hipY + bob, sh = ty - th + 2;
    // far arm
    const armA = aim ? -Math.PI / 2 + 0.05 : panic ? -Math.PI + Math.sin(ph * 3) * 0.6 : anim.swim ? -Math.PI * 0.6 + Math.sin(ph * 2) * 0.8 : anim.cast ? -Math.PI * 0.6 : swing * 0.9 + 0.1;
    out.push({ p: P.arm, x: -2, y: sh, a: panic ? -armA * 0.9 : -armA * 0.6, alpha: 0.85, id: 'arm1', kind: 'arm' });
    out.push({ p: P.torso, x: 0, y: ty, a: anim.swim ? 0 : Math.sin(ph) * 0.03 * sp, id: 'torso', kind: 'body' });
    const hy = sh - 1, headA = panic ? Math.sin(ph * 4) * 0.12 : Math.sin(ph * 0.5) * 0.03 + (anim.swim ? -0.4 : 0);
    out.push({ p: panic ? P.headScared : P.head, x: 0, y: hy, a: headA, id: 'head', kind: 'head' });
    out.push({ p: P.arm, x: 2, y: sh, a: armA, id: 'arm0', kind: 'arm' });
    if (P.prop && !panic) {
      const hx = 2 + Math.sin(armA) * armLen, hyy = sh + Math.cos(armA) * armLen;   // hand position
      const pa = aim ? 0.05 : s.prop === 'rod' ? -0.55 : s.prop === 'camera' ? 0 : -0.2;
      out.push({ p: P.prop, x: hx, y: hyy, a: pa, id: 'prop', kind: 'prop' });
    }
    return out;
  };
  rig.main = parts.torso;
  return rig;
}

// =========================================================== TURTLE
function buildTurtle(s) {
  const L = s.len, H = Math.max(5, Math.round(L * 0.5)), OL = R.ol(s.shell), parts = {};
  { const o = R.mk(L + 4, H + 6), cx = 2 + L / 2, cy = 3 + H * 0.55;
    // dome shell with scutes, a plastron below
    R.blob(o, cx, cy - H * 0.1, L / 2, H * 0.48, s.shell, { hx: 0.1, pat: (i, j, u, v) => { if (v > 0.55) return null; const gx = Math.floor((i - cx + L / 2) / Math.max(3, L * 0.22)), gy = Math.floor((j - cy + H) / Math.max(2, H * 0.3)); const edge = ((i - cx + L / 2) % Math.max(3, Math.round(L * 0.22)) === 0) || ((j - cy + H) % Math.max(2, Math.round(H * 0.3)) === 0); return edge ? R.lo(s.shell) : ((gx + gy) % 2 ? R.hi(s.shell) : null); } });
    R.px(o, cx - L * 0.4, cy + H * 0.3, s.belly || '#c8b080', L * 0.8, Math.max(1, H * 0.18));
    if (s.spiky) for (let k = 0; k < 4; k++) R.px(o, cx - L * 0.3 + k * L * 0.2, cy - H * 0.58 - 1, R.lo2(s.shell), 2, 3);
    R.outline(o, OL);
    parts.shell = R.part(o, cx, cy); }
  { const hs = Math.max(2, Math.round(H * 0.42)), o = R.mk(hs * 2.4 + 4, hs * 2 + 4), hx = 2 + hs * 1.2, hy = 2 + hs; R.blob(o, hx, hy, hs * 1.2, hs, s.skin); R.eye(o, hx + hs * 0.45, hy - hs * 0.2, Math.max(1.2, hs * 0.38), { ring: OL, look: [0.4, 0.1] }); R.px(o, hx + hs * 0.8, hy + hs * 0.45, R.lo2(s.skin), hs * 0.5, 1); if (s.hooked) R.px(o, hx + hs * 1.2, hy + hs * 0.2, R.lo2(s.skin), 1, 2); R.outline(o, OL); parts.head = R.part(o, 2, hy); }
  { const ll = Math.max(2, Math.round(H * 0.5)), o = R.mk(6, ll + 3); R.px(o, 2, 1, s.skin, 2, ll); R.px(o, 1, ll, R.lo(s.skin), 4, 1); R.outline(o, OL); parts.leg = R.part(o, 3, 1); }
  const rig = { kind: 'turtle', parts, len: L * 1.4, height: H, foot: H * 0.3 + H * 0.5 };
  rig.pose = anim => {
    const ph = anim.phase || 0, sp = clamp(anim.speed || 0, 0, 1), P = parts, out = [], hide = anim.hide || 0;
    out.push({ p: P.leg, x: -L * 0.32, y: H * 0.25, a: Math.sin(ph) * 0.7 * (0.3 + sp), id: 'leg0', kind: 'leg' });
    out.push({ p: P.leg, x: L * 0.26, y: H * 0.25, a: Math.sin(ph + Math.PI) * 0.7 * (0.3 + sp), id: 'leg1', kind: 'leg' });
    out.push({ p: P.head, x: L * 0.42 - hide * L * 0.3, y: H * 0.05, a: Math.sin(ph * 0.5) * 0.08, id: 'head', kind: 'head' });
    out.push({ p: P.shell, x: 0, y: 0, a: 0, id: 'body', kind: 'body' });
    return out;
  };
  rig.main = parts.shell;
  return rig;
}
// =========================================================== FROG
function buildFrog(s) {
  const L = s.len, H = Math.max(4, Math.round(L * 0.6)), OL = R.ol(s.body), parts = {};
  { const o = R.mk(L + 4, H + 8), cx = 2 + L / 2, cy = 5 + H / 2;
    R.blob(o, cx, cy, L / 2, H / 2, s.body, { pat: (i, j, u, v) => (v > 0.3 ? (s.belly || R.hi(s.body)) : (s.spots && ihash(Math.floor(i / 2) * 3 + Math.floor(j / 2), 21) > 0.8 ? R.lo2(s.body) : null)) });
    // bulging eyes on top
    const er = Math.max(1.5, H * 0.32);
    for (const ex of [cx + L * 0.28, cx - L * 0.02]) { R.disc(o, ex, cy - H / 2 - er * 0.3, er + 0.5, s.body); R.eye(o, ex, cy - H / 2 - er * 0.3, er * 0.7, { ring: OL, iris: '#e0c030', look: [0.3, 0.2] }); }
    R.px(o, cx + L * 0.1, cy + H * 0.15, R.lo2(s.body), L * 0.36, 1);
    R.outline(o, OL);
    parts.body = R.part(o, cx, cy); }
  { const o = R.mk(Math.round(L * 0.5) + 2, Math.round(H * 0.7) + 2); R.px(o, 1, 1, s.body, o.w - 2, Math.max(2, H * 0.2)); R.px(o, o.w - 3 - Math.max(0, H * 0.1), 1, s.body, Math.max(2, H * 0.2), o.h - 2); R.px(o, o.w - 6, o.h - 3, s.body, 5, 2); R.outline(o, OL); parts.leg = R.part(o, 1, 1); }
  const rig = { kind: 'frog', parts, len: L, height: H * 1.4, foot: H * 0.6 };
  rig.pose = anim => { const ext = anim.jump || 0, P = parts; return [
    { p: P.leg, x: -L * 0.35, y: 0, a: -0.6 + ext * 1.0, id: 'leg0', kind: 'leg' },
    { p: P.body, x: 0, y: 0, a: 0, sx: 1 + ext * 0.1, sy: 1 - ext * 0.08, id: 'body', kind: 'body' },
    { p: P.leg, x: L * 0.1, y: H * 0.2, a: 0.2 + ext * 0.4, sx: 0.5, sy: 0.7, id: 'leg1', kind: 'leg' }]; };
  rig.main = parts.body;
  return rig;
}
// =========================================================== CRAB / CRAYFISH / SHRIMP
function buildCrab(s) {
  const L = s.len, H = Math.max(3, Math.round(L * (s.long ? 0.4 : 0.6))), OL = R.ol(s.body), parts = {};
  { const o = R.mk(L + 4, H + 6), cx = 2 + L / 2, cy = 4 + H / 2;
    R.blob(o, cx, cy, L / 2, H / 2, s.body, { pat: (i, j, u, v) => (s.long && Math.floor((i - cx + L / 2) / Math.max(2, L * 0.18)) % 2 === 0 && v < 0.4 ? R.lo(s.body) : null) });
    // eye stalks
    const er = Math.max(1, H * 0.22);
    for (const ex of [cx + L * 0.3, cx + L * 0.1]) { if (!s.long) R.px(o, ex, cy - H / 2 - er, s.body, 1, er + 1); R.eye(o, s.long ? ex + L * 0.12 : ex, s.long ? cy - H * 0.15 : cy - H / 2 - er, er * (s.long ? 0.8 : 1), { ring: OL, look: [0.3, 0] }); }
    R.outline(o, OL);
    parts.body = R.part(o, cx, cy); }
  { const cl = Math.max(3, Math.round(L * 0.45)), o = R.mk(cl + 3, 7), cc = s.claw || s.body; R.px(o, 1, 3, s.body, cl - 3, 2); R.blob(o, cl - 1, 3, 2.5, 2.5, cc, { hl: false }); R.px(o, cl, 2, R.lo2(cc), 2, 1); R.outline(o, OL); parts.claw = R.part(o, 1, 3.5); }
  { const ll = Math.max(2, Math.round(H * 0.8)), o = R.mk(4, ll + 3); R.px(o, 1, 1, s.body, 1, ll); R.px(o, 0, ll, R.lo(s.body), 3, 1); R.outline(o, OL); parts.leg = R.part(o, 1.5, 1); }
  const rig = { kind: 'crab', parts, len: L * 1.5, height: H, foot: H * 0.25 + H * 0.8 };
  rig.pose = anim => { const ph = anim.phase || 0, P = parts, out = [];
    for (let i = 0; i < 4; i++) out.push({ p: P.leg, x: -L * 0.35 + i * L * 0.22, y: H * 0.2, a: Math.sin(ph * 2 + i * 1.5) * 0.5, id: 'leg' + i, kind: 'leg' });
    out.push({ p: P.body, x: 0, y: Math.sin(ph * 2) * 0.5, a: 0, id: 'body', kind: 'body' });
    out.push({ p: P.claw, x: L * 0.38, y: -H * 0.1, a: -0.5 + Math.sin(ph) * 0.25, id: 'claw0', kind: 'claw' });
    out.push({ p: P.claw, x: L * 0.34, y: H * 0.15, a: 0.15 + Math.sin(ph + 1) * 0.25, id: 'claw1', kind: 'claw' });
    return out; };
  rig.main = parts.body;
  return rig;
}
// =========================================================== SNAKE PARTS
// spec: {base, band, belly, dark, eye, pattern:'bands'|'blotch'|'plain'}
const snakeCache = new Map();
function snakeParts(spec) {
  if (snakeCache.has(spec.id)) return snakeCache.get(spec.id);
  const D = 10, OL = R.ol(spec.base), parts = { D };
  const seg = v => { const o = R.mk(D + 4, D + 4); R.blob(o, 2 + D / 2, 2 + D / 2, D / 2, D / 2, spec.base, { hl: false, pat: (i, j, u, vv) => (vv > 0.45 ? spec.belly : (spec.pattern === 'bands' && v === 0 && Math.abs(u) < 0.45 && vv < 0.45) ? spec.band : (spec.pattern === 'blotch' && ((u - (v ? 0.3 : -0.3)) ** 2 + (vv + 0.1) ** 2 < 0.2)) ? spec.band : null) }); R.outline(o, OL); return R.part(o, 2 + D / 2, 2 + D / 2); };
  parts.segs = [seg(0), seg(1)];
  { const o = R.mk(D * 2 + 6, D + 6), hx = 3 + D * 0.7, hy = 3 + D / 2; R.blob(o, hx, hy, D * 0.7, D * 0.55, spec.base, { hx: -0.1, pat: (i, j, u, v) => (v > 0.5 ? spec.belly : null) });
    R.blob(o, hx + D * 0.75, hy + D * 0.08, D * 0.45, D * 0.36, spec.base, { hl: false, pat: (i, j, u, v) => (v > 0.4 ? spec.belly : null) });
    R.eye(o, hx + D * 0.2, hy - D * 0.15, Math.max(1.5, D * 0.22), { ring: OL, iris: spec.eye || '#c0a030', look: [0.4, 0], pupil: '#141414' });
    R.px(o, hx + D * 1.15, hy + D * 0.1, spec.tongue || '#e02020', 3, 1); R.px(o, hx + D * 1.4, hy - D * 0.05, spec.tongue || '#e02020', 1, 1); R.px(o, hx + D * 1.4, hy + D * 0.2, spec.tongue || '#e02020', 1, 1);
    R.outline(o, OL); parts.head = R.part(o, hx - D * 0.5, hy); }
  snakeCache.set(spec.id, parts);
  return parts;
}
function buildSnakeDisplay(spec) {
  const P = snakeParts(spec), n = Math.min(spec.n || 12, 14), gs = spec.len, sp = gs / (n + 2), k = sp * 1.5 / P.D;
  const rig = { kind: 'snake', parts: { body: P.segs[0], head: P.head }, len: gs, height: P.D * k * 1.6, foot: P.D * k * 0.5 };
  rig.pose = anim => { const ph = anim.phase || 0, out = [];
    for (let i = n; i >= 1; i--) { const u = i / n; out.push({ p: P.segs[i % 2], x: -i * sp + gs * 0.35, y: Math.sin(ph + i * 0.8) * 3 * u, a: 0, sx: k * (1 - u * 0.3), sy: k * (1 - u * 0.3), id: 'seg' + i, kind: 'body' }); }
    out.push({ p: P.head, x: gs * 0.35, y: 0, a: 0, sx: k, sy: k, id: 'head', kind: 'head' });
    return out; };
  rig.main = P.head;
  return rig;
}
// =========================================================== SNAIL
function buildSnail(s) {
  const L = s.len, OL = R.ol(s.shell), parts = {};
  { const o = R.mk(L + 4, L + 4), cx = 2 + L / 2, cy = 2 + L * 0.45;
    R.px(o, 1, cy + L * 0.28, s.body, L + 2, Math.max(2, L * 0.2)); R.px(o, o.w - 3, cy + L * 0.05, s.body, 2, L * 0.3); R.eye(o, o.w - 2.5, cy + L * 0.02, 1.2, { ring: OL });
    R.blob(o, cx - 1, cy, L * 0.42, L * 0.4, s.shell, { pat: (i, j, u, v) => (Math.abs(Math.hypot(u, v) - 0.55) < 0.08 || Math.abs(Math.hypot(u, v) - 0.25) < 0.08 ? R.lo(s.shell) : null) });
    R.outline(o, OL);
    parts.body = R.part(o, cx, cy); }
  const rig = { kind: 'snail', parts, len: L * 1.3, height: L, foot: L * 0.55 };
  rig.pose = anim => [{ p: parts.body, x: 0, y: 0, a: 0, sx: 1, sy: 1 + Math.sin((anim.phase || 0) * 2) * 0.04, id: 'body', kind: 'body' }];
  rig.main = parts.body;
  return rig;
}
// =========================================================== RAY
function buildRay(s) {
  const L = s.len, OL = R.ol(s.body), parts = {};
  { const o = R.mk(L + 4, L * 0.65 + 4), cx = o.w / 2, cy = o.h / 2;
    R.blob(o, cx, cy, L / 2, L * 0.3, s.body, { pat: (i, j, u, v) => (ihash(Math.floor(i / 3) * 5 + Math.floor(j / 3), 31) > 0.78 && u * u + v * v < 0.8 ? (s.spot || R.hi(s.body)) : null) });
    R.eye(o, cx + L * 0.16, cy - L * 0.06, Math.max(1.3, L * 0.05), { ring: OL, look: [0.3, -0.2] }); R.eye(o, cx - L * 0.16, cy - L * 0.06, Math.max(1.3, L * 0.05), { ring: OL, look: [-0.3, -0.2] });
    R.outline(o, OL);
    parts.body = R.part(o, cx, cy); }
  { const tl = Math.round(L * 0.9), o = R.mk(tl + 3, 5); for (let i = 0; i < tl; i++) R.px(o, 1 + i, 2, R.lo(s.body), 1, i < tl * 0.5 ? 2 : 1); R.px(o, 3, 1, '#e8e8d8', 4, 1); R.outline(o, OL); parts.tail = R.part(o, tl + 1, 2.5); }
  const rig = { kind: 'ray', parts, len: L * 1.6, height: L * 0.65, foot: L * 0.32 };
  rig.pose = anim => { const ph = anim.phase || 0, sp = anim.speed || 0; return [
    { p: parts.tail, x: -L * 0.45, y: 0, a: Math.sin(ph) * 0.3, id: 'tail', kind: 'tail' },
    { p: parts.body, x: 0, y: 0, a: 0, sx: 1, sy: 1 + Math.sin(ph * 1.5) * 0.15 * sp, id: 'body', kind: 'body' }]; };
  rig.main = parts.body;
  return rig;
}
