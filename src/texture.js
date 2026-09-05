'use strict';
// ---------------------------------------------------------------------------
// Tiling texture patterns. Everything here is authored once at screen-pixel
// scale and then scrolled with the camera, so grain stays crisp and one fill
// covers the whole screen instead of thousands of little rectangles.
// ---------------------------------------------------------------------------
const Tex = {
  cache: new Map(),
  get(key, size, paint) {
    let p = this.cache.get(key);
    if (p) return p;
    const c = mkCanvas(size, size), x = ctxOf(c);
    paint(x, size);
    p = { pat: G.ctx.createPattern(c, 'repeat'), size, canvas: c };
    this.cache.set(key, p);
    return p;
  },
  // fill a already-clipped region with a pattern locked to world coordinates
  fill(ctx, p, camX, camY, zoom, alpha = 1, comp) {
    const W = G.W, H = G.H, s = p.size;
    let ox = -Math.round(camX * zoom) % s, oy = -Math.round(camY * zoom) % s;
    ctx.save();
    if (comp) ctx.globalCompositeOperation = comp;
    ctx.globalAlpha = alpha;
    ctx.translate(ox, oy);
    ctx.fillStyle = p.pat;
    ctx.fillRect(-s - 2, -s - 2, W + s * 2 + 4, H + s * 2 + 4);
    ctx.restore();
  },
  // 4x4 ordered dither: `level` 0..1 decides how many of the 16 cells are solid
  dither(color, level) {
    return this.get('d|' + color + '|' + level.toFixed(2), 4, (x) => {
      const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const on = Math.round(level * 16);
      x.fillStyle = color;
      for (let i = 0; i < 16; i++) if (BAYER[i] < on) x.fillRect(i % 4, (i / 4) | 0, 1, 1);
    });
  },
  // soil grain: specks, grit and a scatter of small stones over transparent
  soil(dark, light, stone) {
    return this.get('s|' + dark + '|' + light + '|' + stone, 96, (x, S) => {
      const r = mulberry32(0x50117);
      x.globalAlpha = 0.5;
      x.fillStyle = dark;
      for (let i = 0; i < 260; i++) x.fillRect((r() * S) | 0, (r() * S) | 0, 1, 1);
      x.globalAlpha = 0.34;
      x.fillStyle = light;
      for (let i = 0; i < 150; i++) x.fillRect((r() * S) | 0, (r() * S) | 0, 1, 1);
      // grit streaks lie flat, the way sediment settles
      x.globalAlpha = 0.3;
      for (let i = 0; i < 26; i++) { x.fillStyle = r() < 0.5 ? light : dark; x.fillRect((r() * S) | 0, (r() * S) | 0, 2 + ((r() * 4) | 0), 1); }
      // small stones with a lit top edge
      x.globalAlpha = 0.55;
      for (let i = 0; i < 16; i++) {
        const px = (r() * S) | 0, py = (r() * S) | 0, w = 2 + ((r() * 3) | 0), h = 1 + ((r() * 2) | 0);
        x.fillStyle = stone; x.fillRect(px, py, w, h);
        x.fillStyle = light; x.fillRect(px, py, w - 1, 1);
      }
      x.globalAlpha = 1;
    });
  },
  // horizontal sediment courses. Real strata are level, so screen-space stripes
  // clipped to the ground read correctly and cost one fill instead of hundreds.
  strata(dark, light) {
    return this.get('st|' + dark + '|' + light, 64, (x, S) => {
      const r = mulberry32(0x5ed1);
      const rows = [3, 5, 4, 7, 3, 6, 5, 4, 8, 4, 5, 6];
      let y = 0, i = 0;
      while (y < S) {
        const gap = rows[i % rows.length];
        const dk = r() < 0.5;
        x.globalAlpha = 0.1 + r() * 0.16;
        x.fillStyle = dk ? dark : light;
        x.fillRect(0, y, S, 1);
        if (r() < 0.4) { x.globalAlpha = 0.07 + r() * 0.1; x.fillStyle = dk ? light : dark; x.fillRect(0, y + 1, S, 1); }
        // courses break up rather than running dead straight
        x.globalAlpha = 0.14;
        x.fillStyle = dk ? light : dark;
        for (let k = 0; k < 3; k++) x.fillRect((r() * S) | 0, y, 3 + ((r() * 9) | 0), 1);
        y += gap; i++;
      }
      x.globalAlpha = 1;
    });
  },
  // Caustics: only the crest lines of a distorted wave field, so they read as
  // thin drifting filaments rather than a repeating stamp. All frequencies are
  // whole numbers so the tile still wraps.
  caustic(color) {
    return this.get('c|' + color, 128, (x, S) => {
      const val = (px, py) => {
        const u = px / S * TAU, v = py / S * TAU;
        return Math.sin(u * 2 + Math.sin(v * 3) * 1.7) + Math.sin(v * 3 - Math.sin(u * 2) * 1.5)
          + 0.7 * Math.sin(u * 5 + v * 3) + 0.5 * Math.sin(v * 5 - u * 3);
      };
      x.fillStyle = color;
      for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
        const n = val(px, py);
        if (n < 1.72) continue;
        // keep the ridge, drop the interior, so lines stay thin
        const nb = Math.min(val((px + 1) % S, py), val(px, (py + 1) % S), val((px + S - 1) % S, py), val(px, (py + S - 1) % S));
        if (nb > 1.72 && n < 2.35) continue;
        x.fillRect(px, py, 1, 1);
      }
    });
  },
  // fine suspended silt for the water column
  motes(color) {
    return this.get('m|' + color, 128, (x, S) => {
      const r = mulberry32(0x9e3);
      x.fillStyle = color;
      for (let i = 0; i < 90; i++) { x.globalAlpha = 0.2 + r() * 0.5; x.fillRect((r() * S) | 0, (r() * S) | 0, 1, r() < 0.25 ? 2 : 1); }
      x.globalAlpha = 1;
    });
  },
  // bark / trunk grain, used by the foliage pass
  bark(dark) {
    return this.get('b|' + dark, 32, (x, S) => {
      const r = mulberry32(0x8a71);
      x.globalAlpha = 0.4; x.fillStyle = dark;
      for (let i = 0; i < 34; i++) x.fillRect((r() * S) | 0, (r() * S) | 0, 1, 2 + ((r() * 5) | 0));
      x.globalAlpha = 1;
    });
  },
};

// ---------------------------------------------------------------------------
// Leaf masses. Canopies used to be plain fillRects, which read as green boxes.
// These are painted once at world scale into a cached canvas and then blitted,
// so a tree costs one drawImage no matter how much shading it carries.
// ---------------------------------------------------------------------------
const Leaf = {
  cache: new Map(),
  // filled ellipse as horizontal spans, so the edge stays hard like the rest of the art
  blob(x, cx, cy, rw, rh, col) {
    x.fillStyle = col;
    const h = Math.max(1, Math.round(rh));
    for (let y = -h; y <= h; y++) {
      const t = y / h, w = Math.round(rw * Math.sqrt(Math.max(0, 1 - t * t)));
      if (w <= 0) continue;
      x.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
    }
  },
  // w,h in world pixels. base/mid/lit shade from the underside up to the sunlit crown
  mass(w, h, base, mid, lit, seed, opts = {}) {
    const key = 'L|' + w + '|' + h + '|' + base + '|' + mid + '|' + lit + '|' + seed + '|' + (opts.tag || '');
    let c = this.cache.get(key);
    if (c) return c;
    const P = 3, cw = Math.max(4, Math.round(w) + P * 2), ch = Math.max(4, Math.round(h) + P * 2);
    const cv = mkCanvas(cw, ch), x = ctxOf(cv);
    const cx = cw / 2, cy = ch / 2, rw = w / 2, rh = h / 2;
    const r = mulberry32((seed * 2654435761) >>> 0);
    const n = 4 + ((r() * 4) | 0);
    const lobes = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + r() * 0.8;
      lobes.push({ ox: Math.cos(a) * rw * 0.36, oy: Math.sin(a) * rh * 0.34, k: 0.46 + r() * 0.34 });
    }
    lobes.push({ ox: 0, oy: 0, k: 0.82 });
    // underside
    for (const l of lobes) this.blob(x, cx + l.ox, cy + l.oy, rw * l.k, rh * l.k, base);
    // sunlit body, pulled up and to the left
    const dx = -rw * 0.1, dy = -rh * 0.14;
    for (const l of lobes) this.blob(x, cx + l.ox + dx, cy + l.oy + dy, rw * l.k * 0.86, rh * l.k * 0.84, mid);
    // crown highlight
    for (const l of lobes) if (l.oy <= rh * 0.1) this.blob(x, cx + l.ox + dx * 1.9, cy + l.oy + dy * 2.1, rw * l.k * 0.52, rh * l.k * 0.46, lit);
    // leaf speckle: light on top, dark underneath
    for (let i = 0; i < Math.round(w * h * 0.02); i++) {
      const px2 = (r() * cw) | 0, py2 = (r() * ch) | 0;
      const u = (px2 - cx) / rw, v = (py2 - cy) / rh;
      if (u * u + v * v > 0.92) continue;
      x.fillStyle = v < -0.15 ? lit : v > 0.3 ? base : mid;
      x.fillRect(px2, py2, 1, 1);
    }
    // chew the silhouette so it never reads as a smooth pill
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < Math.max(6, Math.round((w + h) * 0.22)); i++) {
      const a = r() * TAU, rad = 0.86 + r() * 0.2;
      x.fillRect(Math.round(cx + Math.cos(a) * rw * rad), Math.round(cy + Math.sin(a) * rh * rad), 1 + ((r() * 2) | 0), 1 + ((r() * 2) | 0));
    }
    x.globalCompositeOperation = 'source-over';
    this.cache.set(key, cv);
    return cv;
  },
  // draw a cached mass centred at (sx, sy) on screen, scaled by zoom
  draw(ctx, cv, sx, sy, z) {
    const w = Math.max(1, Math.round(cv.width * z)), h = Math.max(1, Math.round(cv.height * z));
    ctx.drawImage(cv, Math.round(sx - w / 2), Math.round(sy - h / 2), w, h);
  },
};
