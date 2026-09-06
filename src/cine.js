'use strict';
// ---------------------------------------------------------------------------
// The cinematic layer. Two moments in the game are meant to stop being a
// side-scroller for a second — the death roll and a boss execution — and both
// want the same furniture: bars closing in, the camera leaning forward, speed
// lines, and a held impact frame on every hit. This owns all of it so the two
// sequences look like they belong to the same film.
// ---------------------------------------------------------------------------
const Cine = {
  k: 0, mode: null, bar: 0, flash: 0, flashCol: '#ffffff', shockT: 0, tint: 0, tintCol: '#ff3020',
  // what the current game state wants from the camera
  want() {
    if (G.finisher) return { k: 1, zoom: 1.42, bar: 30, mode: 'finish' };
    const P = G.player;
    if (P && !P.dead && P.rollT > 0) {
      // rolling a minnow should not get the full treatment; only something
      // worth the drama pulls the bars in
      const e = P.latched, big = !!e && (e.isBoss || e.threat || e.mass >= 40);
      return { k: 1, zoom: big ? 1.16 : 1.05, bar: big ? 15 : 5, mode: big ? 'roll' : 'rolls' };
    }
    return { k: 0, zoom: 1, bar: 0, mode: null };
  },
  update(raw) {
    const w = this.want();
    // in fast, out slow: the cut should snap and the release should breathe
    const rate = w.k > this.k ? 12 : 4.5;
    this.k += (w.k - this.k) * Math.min(1, rate * raw);
    if (w.mode) this.mode = w.mode; else if (this.k < 0.02) this.mode = null;
    this.bar = lerp(this.bar, w.bar, Math.min(1, rate * raw));
    if (this.flash > 0) this.flash -= raw * 4.5;
    if (this.shockT > 0) this.shockT -= raw * 3;
    if (this.tint > 0) this.tint -= raw * 2.2;
    // Morph runs its own camera; never fight it
    if (this.k > 0.01 && !G.morph) G.zoomP = Math.max(G.zoomP, lerp(1, w.zoom, this.k));
  },
  // a held frame on a landed hit
  hit(power = 1, col = '#ffffff') {
    this.flash = Math.min(1, 0.55 + power * 0.45); this.flashCol = col;
    this.shockT = 1; G.hitstop(0.05 + power * 0.05);
  },
  wash(col = '#ff3020', amount = 1) { this.tint = Math.max(this.tint, amount); this.tintCol = col; },
  draw(ctx) {
    const W = G.W, H = G.H;
    if (this.k <= 0.01 && this.flash <= 0 && this.tint <= 0) return;
    const k = clamp(this.k, 0, 1);
    if (k > 0.01) {
      // the bars
      const b = Math.round(this.bar * k);
      if (b > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.fillRect(0, 0, W, b); ctx.fillRect(0, H - b, W, b);
        ctx.fillStyle = 'rgba(140,220,200,0.18)';
        ctx.fillRect(0, b, W, 1); ctx.fillRect(0, H - b - 1, W, 1);
      }
      // a corner frame, so it reads as a viewfinder rather than a black border
      const m = 6, len = 10, a = 0.22 * k;
      ctx.fillStyle = `rgba(190,240,225,${a.toFixed(3)})`;
      for (const [cx, cy, dx, dy] of [[m, b + m, 1, 1], [W - m, b + m, -1, 1], [m, H - b - m, 1, -1], [W - m, H - b - m, -1, -1]]) {
        ctx.fillRect(dx > 0 ? cx : cx - len, cy, len, 1);
        ctx.fillRect(cx, dy > 0 ? cy : cy - len, 1, len);
      }
      // speed lines converging on the middle: only while the roll is spinning
      if (this.mode === 'roll') {
        const t = G.t, cx = W / 2, cy = H / 2;
        ctx.globalAlpha = 0.3 * k;
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 26; i++) {
          const a2 = ihash(i, 400) * TAU + t * 0.6;
          const r0 = 90 + ihash(i, 401) * 60 + Math.sin(t * 9 + i) * 12;
          const ln = 12 + ihash(i, 402) * 26;
          const dx = Math.cos(a2), dy = Math.sin(a2);
          for (let s = 0; s < ln; s += 3) {
            const x = Math.round(cx + dx * (r0 + s)), y = Math.round(cy + dy * (r0 + s) * 0.62);
            if (x < 0 || x > W || y < 0 || y > H) break;
            ctx.fillRect(x, y, 2, 1);
          }
        }
        ctx.globalAlpha = 1;
      }
      // vignette
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${(0.42 * k).toFixed(3)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // impact: a fat ring plus a one-frame wash, the comic-book hit
    if (this.shockT > 0) {
      const s = 1 - this.shockT, r = 26 + s * 170;
      ctx.globalAlpha = clamp(this.shockT, 0, 1) * 0.34;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, Math.round(4 * this.shockT));
      ctx.beginPath(); ctx.ellipse(W / 2, H / 2, r, r * 0.66, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (this.flash > 0) { ctx.globalAlpha = clamp(this.flash, 0, 1) * 0.3; ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (this.tint > 0) { ctx.globalAlpha = clamp(this.tint, 0, 1) * 0.35; ctx.fillStyle = this.tintCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  },
};

// ---------------------------------------------------------------------------
// A chunky pixel key cap, used everywhere a button is asked for.
// ---------------------------------------------------------------------------
function drawKeyCap(ctx, x, y, w, h, label, opts = {}) {
  const lit = opts.lit, col = opts.color || '#ffd060', dead = opts.dead;
  const base = dead ? '#1a2224' : lit ? mixColor(col, '#ffffff', 0.35) : '#22323a';
  const top = dead ? '#243036' : lit ? '#ffffff' : mixColor(col, '#101a1e', 0.55);
  const rim = dead ? '#101618' : col;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  // drop shadow / side
  ctx.fillStyle = '#050a0c'; ctx.fillRect(x + 1, y + 3, w, h);
  // body
  ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
  // bevel: lit top edge, dark bottom
  ctx.fillStyle = top; ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y + h - 2, w, 2);
  // rim
  ctx.fillStyle = rim;
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  // corner notches, so it reads as a cap and not a box
  ctx.fillStyle = '#050a0c';
  ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + w - 1, y, 1, 1);
  ctx.fillRect(x, y + h - 1, 1, 1); ctx.fillRect(x + w - 1, y + h - 1, 1, 1);
  if (label) {
    const sc = opts.scale || 1;
    Font.draw(ctx, label, x + w / 2, y + Math.round((h - Font.H * sc) / 2), { color: dead ? '#4a5a5e' : lit ? '#10201c' : '#dff4ec', align: 'center', scale: sc });
  }
}
