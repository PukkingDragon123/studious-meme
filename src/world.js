'use strict';
// Procedural Everglades: heightmap terrain with banks, chunked decor, sky/day cycle, water rendering.
const World = {
  seed: 1, CHUNK: 640, chunks: new Map(), decor: [], t: 0, onChunkLoad: null,
  reset(seed) { this.seed = seed | 0; this.chunks.clear(); this.decor = []; this.t = 0; },
  // ---------- terrain ----------
  floorY(x) { return MapData.floorY(x); },
  // inside the lab and sewer the world has a ceiling; elsewhere it is open sky
  roofY(x) {
    // An authored roof beats a flat one: the sewer network and the ocean caves
    // both want headroom that changes along their length — crawls, chambers,
    // shafts — and a per-biome constant cannot express any of that.
    const pr = MapData.roofY(x);
    if (pr !== null) {
      // the mouth of the storm drain flares open so daylight leaks in
      if (x > -320 && x < 200) return pr - (x + 320) * 0.45;
      return pr;
    }
    const B = Biome.at(x); if (!B.indoor) return null;
    const r = B.roof + Math.sin(x * 0.02) * 3 + vnoise(x * 0.05, 21) * 6;
    if (B.id === 'sewer' && x > -320) return r - (x + 320) * 0.45;
    return r;
  },
  isIndoor(x) { const r = this.roofY(x); return r !== null && r < -20; },
  isLand(x) { return this.floorY(x) < 0; },
  surface(x) { return Water.surface(x); },
  // The wave surface in screen space, sampled once a frame and shared by the
  // water body and the waterline detail so the two cannot drift apart. Columns
  // are integer-aligned: the top edge is meant to be a hard pixel staircase,
  // not an antialiased diagonal.
  waterTop(cam) {
    const W = G.W, step = 3;
    if (this._wt && this._wtT === G.t && this._wtX === cam.x && this._wtY === cam.y && this._wtZ === cam.zoom) return this._wt;
    const n = Math.ceil((W + step * 4) / step), xs = new Int32Array(n), ys = new Int32Array(n), wxs = new Float64Array(n), sus = new Float64Array(n), wet = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const sx = -step * 2 + i * step, wx = cam.toWorldX(sx), su = this.surface(wx);
      xs[i] = sx; wxs[i] = wx; sus[i] = su; ys[i] = Math.round(cam.toScreen(wx, su)[1]);
      wet[i] = this.floorY(wx) > su + 1 ? 1 : 0;
    }
    this._wtT = G.t; this._wtX = cam.x; this._wtY = cam.y; this._wtZ = cam.zoom;
    return (this._wt = { xs, ys, wxs, sus, wet, n, step });
  },
  // clip the context to everything below the wave surface
  clipWater(ctx, cam) {
    const T = this.waterTop(cam), H = G.H;
    ctx.beginPath();
    for (let i = 0; i < T.n; i++) { const y = T.ys[i]; if (y < H + 40 && T.wet[i]) ctx.rect(T.xs[i], y, T.step, H + 40 - y); }
    ctx.clip();
    return T;
  },
  // nearest x (searching outward) where predicate holds, or null
  findX(fromX, pred, maxD = 4000, step = 24) {
    for (let d = 0; d < maxD; d += step) { if (pred(fromX + d)) return fromX + d; if (pred(fromX - d)) return fromX - d; }
    return null;
  },
  // ---------- chunks ----------
  ensure(px, range) {
    const a = Math.floor((px - range) / this.CHUNK), b = Math.floor((px + range) / this.CHUNK);
    for (let ci = a; ci <= b; ci++) if (!this.chunks.has(ci)) this.genChunk(ci);
    for (const [ci, ch] of this.chunks) if (ci < a - 2 || ci > b + 2) { this.chunks.delete(ci); ch.unloaded = true; }
    this.decor = []; for (const ch of this.chunks.values()) for (const d of ch.decor) this.decor.push(d);
    this.decor.sort((a, b) => a.x - b.x);
  },
  genChunk(ci) {
    const visits = (this._visits = this._visits || new Map()).get(ci) || 0; this._visits.set(ci, visits + 1);
    const rng = mulberry32((ci * 104729 + 12345) >>> 0);   // the map is fixed, so decor is too
    const x0 = ci * this.CHUNK, x1 = x0 + this.CHUNK, decor = [];
    for (let x = x0; x < x1; x += 6) Biome.decorAt(x, rng, decor);
    const ch = { ci, x0, x1, decor, visits };
    this.chunks.set(ci, ch);
    if (this.onChunkLoad) this.onChunkLoad(ch, rng);
  },
  // ---------- sky / lighting ----------
  // day in [0,1): 0 dawn, .25 noon, .5 dusk, .75 midnight
  skyColors(day) {
    const B = Biome.mixPal(G.cam.x);
    const keys = [
      [0.00, '#3a2f5c', '#f0985a'], [0.10, '#4d8fd0', '#cfe6f2'], [0.25, '#4f9fe0', '#c8e6f4'], [0.42, '#5f8fc8', '#f0c090'],
      [0.50, '#3a2a60', '#f07a48'], [0.58, '#141a3a', '#3a3a70'], [0.75, '#04061a', '#0e1838'], [0.92, '#10142e', '#3a3050'], [1.00, '#3a2f5c', '#f0985a'],
    ];
    let i = 0; while (i < keys.length - 2 && keys[i + 1][0] <= day) i++;
    const a = keys[i], b = keys[i + 1], t = clamp((day - a[0]) / (b[0] - a[0]), 0, 1);
    const light = clamp(0.5 + 0.62 * Math.cos((day - 0.25) * TAU), 0.05, 1);
    return { top: mixColor(mixColor(a[1], b[1], t), B.sky[0], 0.45 * light), bot: mixColor(mixColor(a[2], b[2], t), B.sky[1], 0.5 * light) };
  },
  light(day) { return clamp(0.5 + 0.62 * Math.cos((day - 0.25) * TAU), 0.08, 1) * (1 - 0.45 * (Weather ? Weather.rain : 0)); },
  drawSky(ctx, cam, day) {
    const W = G.W, H = G.H, sc = this.skyColors(day);
    const hy = cam.toScreen(0, 0)[1];
    const g = ctx.createLinearGradient(0, Math.min(hy - 220 * cam.zoom, 0), 0, hy);
    g.addColorStop(0, sc.top); g.addColorStop(1, sc.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.max(0, hy));
    const roofed = World.isIndoor(G.cam.x);
    if (!roofed && Weather.rain > 0.02) { ctx.fillStyle = `rgba(60,70,80,${(Weather.rain * 0.55).toFixed(3)})`; ctx.fillRect(0, 0, W, Math.max(0, hy)); }
    if (!roofed && Weather.flash > 0) { ctx.fillStyle = `rgba(230,240,255,${(Weather.flash * 0.7).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    const light = this.light(day), night = 1 - light;
    // stars
    if (night > 0.15) {
      ctx.globalAlpha = clamp((night - 0.15) / 0.5, 0, 1);
      for (let i = 0; i < 90; i++) {
        const sx = ((ihash(i, 77) * 1400 - cam.x * 0.03) % 1400 + 1400) % 1400 - 300, sy = ihash(i, 78) * (hy * 0.9);
        if (sx < 0 || sx > W || sy > hy) continue;
        const tw = 0.5 + 0.5 * Math.sin(this.t * (1 + ihash(i, 79) * 3) + i);
        ctx.fillStyle = tw > 0.7 ? '#ffffff' : '#a8b8d8'; ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
    // sun / moon
    const drawOrb = (phase, r, col, halo) => {
      const px = W * (0.08 + 0.84 * phase), py = hy - Math.sin(phase * Math.PI) * (hy * 0.85 + 30) + 10;
      ctx.globalAlpha = 0.25; Shape.blob(ctx, px, py, r * 1.9, halo); ctx.globalAlpha = 1;
      Shape.blob(ctx, px, py, r, col);
      // pixelate edge a touch
      ctx.fillRect(Math.round(px - r), Math.round(py - 1), 1, 2); ctx.fillRect(Math.round(px + r - 1), Math.round(py - 1), 1, 2);
      return [px, py];
    };
    if (day < 0.55) { const ph = clamp(day / 0.5, 0, 1); drawOrb(ph, 12, day > 0.42 || day < 0.06 ? '#ffb060' : '#fff4c0', '#ffe090'); }
    if (day > 0.5) { const ph = clamp((day - 0.5) / 0.5, 0, 1); drawOrb(ph, 9, '#e8ecf4', '#a0b0e0'); }
    // clouds (parallax)
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 10; i++) {
      const spd = 6 + ihash(i, 91) * 8;
      const cx = ((ihash(i, 90) * 1600 - cam.x * 0.08 - this.t * spd) % 1600 + 1600) % 1600 - 400, cy = 10 + ihash(i, 92) * Math.max(10, hy * 0.5);
      if (cx < -120 || cx > W + 40) continue;
      const cw = 40 + ihash(i, 93) * 70, base = mixColor(sc.bot, '#ffffff', 0.55 * light + 0.05), shadeC = mixColor(sc.bot, '#000000', 0.15);
      const puffs = 4 + Math.floor(ihash(i, 94) * 4);
      for (let k = 0; k < puffs; k++) {
        const pw = cw / puffs * 1.6, ph = 6 + ihash(i * 13 + k, 95) * 10, px = cx + k * (cw / puffs), py = cy - ph * 0.6 + ihash(i * 7 + k, 96) * 4;
        ctx.fillStyle = shadeC; ctx.fillRect(Math.round(px), Math.round(py + 2), Math.round(pw), Math.round(ph));
        ctx.fillStyle = base; ctx.fillRect(Math.round(px), Math.round(py), Math.round(pw), Math.round(ph - 1));
      }
    }
    ctx.globalAlpha = 1;
  },
  // Open water has no treeline. Out past the seawall the horizon is empty
  // except for what floats on it, so the parallax becomes shipping: hulls at
  // three distances, a rig standing over the wall, and birds working a bait
  // ball. Everything sits ON the waterline instead of behind a shore.
  drawOceanHorizon(ctx, cam, day) {
    const W = G.W, hy = cam.toScreen(0, 0)[1], sc = this.skyColors(day), light = this.light(day), night = 1 - light, t = this.t;
    if (hy < -50) return;
    const BP = Biome.mixPal(cam.x), mode = BP.open;
    const haze = mixColor(sc.bot, BP.fog, 0.5);
    // a low bank of haze sitting on the join, so the sea meets the sky softly
    const g0 = ctx.createLinearGradient(0, hy - 26, 0, hy + 3);
    g0.addColorStop(0, rgba(haze, 0)); g0.addColorStop(1, rgba(haze, 0.7));
    ctx.fillStyle = g0; ctx.fillRect(0, hy - 26, W, 29);
    // the last of the land, only while the shelf is still in sight
    if (mode === 'coast') {
      const col = mixColor(sc.bot, '#3c5a48', 0.2), ox = cam.x * 0.04;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, hy + 2);
      for (let sx = 0; sx <= W; sx += 6) { const wx = ox + sx; const h = Math.max(0, fbm(wx * 0.0016, 3) - 0.42) * 90; ctx.lineTo(sx, hy - h); }
      ctx.lineTo(W, hy + 2); ctx.closePath(); ctx.fill();
    }
    const SHIPS = [
      { f: 0.06, s: 0.45, col: 0.68, dens: 1400 },
      { f: 0.11, s: 0.7, col: 0.45, dens: 1100 },
      { f: 0.2, s: 1, col: 0.22, dens: 900 },
    ];
    for (const L of SHIPS) {
      const ox = cam.x * L.f, col = mixColor(haze, '#1c2c38', 1 - L.col);
      for (let k = Math.floor(ox / L.dens) - 1; k <= Math.floor((ox + W) / L.dens) + 1; k++) {
        const r = ihash(k, 401); if (r > 0.78) continue;
        const sx = k * L.dens + ihash(k, 402) * L.dens - ox;
        if (sx < -160 || sx > W + 160) continue;
        const kind = r < 0.3 ? 'trawler' : r < 0.58 ? 'container' : 'sail';
        const S = L.s, bob = Math.sin(t * 0.5 + k) * 0.8 * S;
        const base = hy + bob;
        ctx.fillStyle = col;
        if (kind === 'sail') {
          ctx.fillRect(Math.round(sx - 9 * S), Math.round(base - 3 * S), Math.round(18 * S), Math.round(3 * S));
          ctx.beginPath(); ctx.moveTo(sx, base - 4 * S); ctx.lineTo(sx, base - 30 * S); ctx.lineTo(sx + 11 * S, base - 4 * S); ctx.closePath(); ctx.fill();
        } else if (kind === 'trawler') {
          ctx.fillRect(Math.round(sx - 16 * S), Math.round(base - 5 * S), Math.round(32 * S), Math.round(5 * S));
          ctx.fillRect(Math.round(sx - 6 * S), Math.round(base - 12 * S), Math.round(11 * S), Math.round(7 * S));
          ctx.fillRect(Math.round(sx - 2 * S), Math.round(base - 26 * S), Math.round(2 * S), Math.round(14 * S));
          // derrick booms out over the water
          ctx.fillRect(Math.round(sx - 16 * S), Math.round(base - 18 * S), Math.round(15 * S), Math.max(1, Math.round(S)));
          if (night > 0.4) { ctx.fillStyle = mixColor(col, '#ffe2a0', 0.7); ctx.fillRect(Math.round(sx - 3 * S), Math.round(base - 27 * S), Math.max(1, Math.round(2 * S)), Math.max(1, Math.round(2 * S))); ctx.fillStyle = col; }
        } else {
          ctx.fillRect(Math.round(sx - 44 * S), Math.round(base - 7 * S), Math.round(88 * S), Math.round(7 * S));
          ctx.fillRect(Math.round(sx + 20 * S), Math.round(base - 20 * S), Math.round(14 * S), Math.round(13 * S));
          ctx.fillRect(Math.round(sx + 25 * S), Math.round(base - 30 * S), Math.round(3 * S), Math.round(10 * S));
          // deck cargo, stacked in blocks
          for (let q = 0; q < 7; q++) { const bw = 10 * S, bh = (5 + (ihash(k * 9 + q, 403) * 9)) * S; ctx.fillRect(Math.round(sx - 42 * S + q * 11 * S), Math.round(base - 7 * S - bh), Math.round(bw), Math.round(bh)); }
        }
      }
    }
    // the rig: a platform standing over the drop, legs going down into the blue
    if (mode === 'rig' || mode === 'deep') {
      const ox = cam.x * 0.16, dens = 2600, col = mixColor(haze, '#16242e', 0.82);
      for (let k = Math.floor(ox / dens) - 1; k <= Math.floor((ox + W) / dens) + 1; k++) {
        if (ihash(k, 411) > 0.55) continue;
        const sx = k * dens + ihash(k, 412) * dens - ox;
        if (sx < -180 || sx > W + 180) continue;
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(sx - 34), Math.round(hy - 34), 68, 9);
        for (const lx of [-26, -9, 9, 26]) { ctx.fillRect(Math.round(sx + lx), Math.round(hy - 25), 3, 27); }
        for (let q = 0; q < 3; q++) ctx.fillRect(Math.round(sx - 30), Math.round(hy - 22 + q * 8), 60, 1);
        ctx.fillRect(Math.round(sx - 20), Math.round(hy - 50), 15, 16);
        ctx.fillRect(Math.round(sx + 12), Math.round(hy - 74), 4, 40);
        // flare stack
        const fl = 3 + Math.sin(t * 7 + k) * 1.5;
        ctx.fillStyle = mixColor(col, '#ff9040', 0.75);
        ctx.fillRect(Math.round(sx + 11), Math.round(hy - 74 - fl), 6, Math.round(fl));
        if (night > 0.3) { ctx.fillStyle = mixColor(col, '#ffe2a0', 0.8); for (let q = 0; q < 5; q++) ctx.fillRect(Math.round(sx - 30 + q * 14), Math.round(hy - 32), 2, 2); }
      }
    }
    // working birds over a bait ball
    const bo = cam.x * 0.3;
    for (let k = Math.floor(bo / 700) - 1; k <= Math.floor((bo + W) / 700) + 1; k++) {
      if (ihash(k, 421) > 0.5) continue;
      const cx = k * 700 + ihash(k, 422) * 700 - bo;
      ctx.fillStyle = mixColor(haze, '#20303a', 0.8);
      for (let q = 0; q < 9; q++) {
        const a = t * 0.5 + q * 0.7 + k, bx = cx + Math.cos(a) * (30 + q * 3), by = hy - 26 - Math.abs(Math.sin(a * 1.3)) * 20 - q;
        const flap = Math.sin(t * 9 + q * 2) > 0 ? 1 : -1;
        ctx.fillRect(Math.round(bx), Math.round(by), 2, 1);
        ctx.fillRect(Math.round(bx - 2), Math.round(by - flap), 2, 1);
        ctx.fillRect(Math.round(bx + 2), Math.round(by - flap), 2, 1);
      }
    }
  },
  drawParallax(ctx, cam, day) {
    const W = G.W, H = G.H, hy = cam.toScreen(0, 0)[1], sc = this.skyColors(day), light = this.light(day), night = 1 - light, t = this.t;
    if (hy < -50) return;
    const BP = Biome.mixPal(cam.x), kinds = BP.parallax;
    if (BP.open) { this.drawOceanHorizon(ctx, cam, day); return; }
    // furthest ridge: bare hills, no trees, barely separated from the sky
    {
      const col = mixColor(sc.bot, '#3c5a48', 0.26), ox = cam.x * 0.05;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, hy + 2);
      for (let sx = 0; sx <= W; sx += 6) { const wx = ox + sx; const h = (fbm(wx * 0.004, 3) * 0.75 + 0.25) * 58; ctx.lineTo(sx, hy - h); }
      ctx.lineTo(W, hy + 2); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip();
      Tex.fill(ctx, Tex.dither(mixColor(col, '#ffffff', 0.35), 0.1), ox, cam.y * 0.05, 1, 0.5);
      ctx.restore();
    }
    const layers = [
      { f: 0.12, col: mixColor(sc.bot, '#24402a', 0.4), h: 40, seed: 7, trees: 0.3, dens: 110 },
      { f: 0.18, col: mixColor(sc.bot, '#1e3a24', 0.55), h: 34, seed: 11, trees: 0.62, dens: 62 },
      { f: 0.36, col: mixColor(sc.bot, '#14301c', 0.78), h: 26, seed: 23, trees: 0.8, dens: 44 },
      { f: 0.58, col: mixColor(sc.bot, '#0c2012', 0.9), h: 16, seed: 37, trees: 0.9, dens: 34 },
    ];
    for (const L of layers) {
      // canopies for this layer, shaded just enough to have form without
      // breaking the flat silhouette that sells the distance
      L.qc = qcol(L.col);
      L.qm = qcol(mixColor(L.col, '#ffffff', 0.1));
      L.ql = qcol(mixColor(L.col, '#ffffff', 0.2));
      ctx.fillStyle = L.col;
      const ox = cam.x * L.f;
      // brush line
      ctx.beginPath(); ctx.moveTo(0, hy + 2);
      for (let sx = 0; sx <= W; sx += 4) { const wx = ox + sx; const h = (fbm(wx * 0.012, L.seed) * 0.8 + 0.2) * L.h; ctx.lineTo(sx, hy - h); }
      ctx.lineTo(W, hy + 2); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip();
      Tex.fill(ctx, Tex.dither(mixColor(L.col, '#ffffff', 0.3), 0.12), ox, cam.y * L.f, 1, 0.45);
      ctx.restore();
      // trees
      const dens = L.dens;
      for (let k = Math.floor(ox / dens) - 1; k <= Math.floor((ox + W) / dens) + 1; k++) {
        const r = ihash(k, L.seed + 5); if (r > L.trees) continue;
        const sx = k * dens + ihash(k, L.seed + 6) * dens - ox;
        const th = 40 + ihash(k, L.seed + 7) * 60, tw = 3 + ihash(k, L.seed + 8) * 3;
        const kindName = kinds[Math.floor(ihash(k, L.seed + 9) * kinds.length) % kinds.length];
        if (kindName === 'block' || kindName === 'shack' || kindName === 'tent' || kindName === 'island' || kindName === 'bluff' || kindName === 'hammock') {
          const bw = kindName === 'island' || kindName === 'bluff' || kindName === 'hammock' ? 40 + ihash(k, L.seed + 3) * 60 : 22 + ihash(k, L.seed + 3) * 20;
          const bh = kindName === 'island' ? th * 0.3 : kindName === 'tent' ? th * 0.35 : th * 0.7;
          if (kindName === 'tent') { ctx.beginPath(); ctx.moveTo(sx - bw / 2, hy); ctx.lineTo(sx, hy - bh); ctx.lineTo(sx + bw / 2, hy); ctx.closePath(); ctx.fill(); }
          else if (kindName === 'island' || kindName === 'hammock') { ctx.beginPath(); ctx.moveTo(sx - bw / 2, hy + 2); for (let q = 0; q <= 8; q++) { const u = q / 8; ctx.lineTo(sx - bw / 2 + u * bw, hy - bh * Math.sin(u * Math.PI) * (0.7 + ihash(k * 5 + q, L.seed) * 0.5)); } ctx.lineTo(sx + bw / 2, hy + 2); ctx.closePath(); ctx.fill(); }
          else { ctx.fillRect(Math.round(sx - bw / 2), Math.round(hy - bh), Math.round(bw), Math.round(bh + 2)); if (kindName === 'shack') { ctx.fillRect(Math.round(sx - bw * 0.6), Math.round(hy - bh - 4), Math.round(bw * 1.2), 5); } }
          continue;
        }
        if (kindName === 'tower') {
          const bw = 16 + ihash(k, L.seed + 2) * 22, bh = th * (0.9 + ihash(k, L.seed + 4) * 1.5);
          ctx.fillRect(Math.round(sx - bw / 2), Math.round(hy - bh), Math.round(bw), Math.round(bh + 2));
          // a lit crown strip and a mast
          ctx.fillStyle = mixColor(L.col, '#ffffff', 0.16);
          ctx.fillRect(Math.round(sx - bw / 2), Math.round(hy - bh), Math.round(bw), 1);
          if (ihash(k, L.seed + 6) < 0.4) { ctx.fillRect(Math.round(sx - 1), Math.round(hy - bh - 9), 2, 9); ctx.fillStyle = Math.sin(t * 3 + k) > 0 ? '#ff5040' : '#5a2018'; ctx.fillRect(Math.round(sx - 1), Math.round(hy - bh - 10), 2, 2); }
          // windows: brighter and denser after dark
          const lit = mixColor(L.col, '#ffe6a0', 0.35 + night * 0.5);
          const cols2 = Math.max(1, Math.floor(bw / 5)), rows2 = Math.max(1, Math.floor(bh / 6));
          for (let cxi = 0; cxi < cols2; cxi++) for (let ryi = 0; ryi < rows2; ryi++) {
            if (ihash(k * 131 + cxi * 17 + ryi, L.seed + 8) > 0.34 + night * 0.22) continue;
            ctx.fillStyle = lit;
            ctx.fillRect(Math.round(sx - bw / 2 + 2 + cxi * 5), Math.round(hy - bh + 4 + ryi * 6), 2, 3);
          }
          ctx.fillStyle = L.col;
          continue;
        }
        if (kindName === 'pipe') { ctx.fillRect(Math.round(sx - 14), Math.round(hy - 26), 28, 12); ctx.fillRect(Math.round(sx - 3), Math.round(hy - 16), 6, 18); continue; }
        if (kindName === 'sawgrass') { for (let q = 0; q < 9; q++) { const gx = sx - 16 + q * 4; ctx.beginPath(); ctx.moveTo(gx, hy + 2); ctx.lineTo(gx + (q % 2 ? 3 : -3), hy - 12 - ihash(k * 7 + q, L.seed) * 12); ctx.lineWidth = 2; ctx.strokeStyle = L.col; ctx.stroke(); } continue; }
        const kind = kindName === 'palm' ? 0.7 : kindName === 'mangrove' ? 0.9 : 0.2;
        if (kind < 0.6) { // cypress: trunk + layered canopy
          ctx.fillRect(Math.round(sx), Math.round(hy - th), Math.round(tw), Math.round(th));
          ctx.fillRect(Math.round(sx - tw), Math.round(hy - 8), Math.round(tw * 3), 8);
          for (let j = 0; j < 4; j++) {
            const cwRaw = (26 - j * 5) * (0.7 + ihash(k * 3 + j, L.seed) * 0.6);
            const cw = Math.max(6, Math.round(cwRaw / 3) * 3), cy = hy - th * (0.45 + j * 0.16);
            const ch = Math.max(4, Math.round((th * 0.11 + 3) / 2) * 2);
            Leaf.draw(ctx, Leaf.mass(cw, ch, L.qc, L.qm, L.ql, (k * 3 + j) & 7), sx + tw / 2, cy, 1);
          }
          // moss strands
          for (let j = 0; j < 3; j++) { const mx = sx + tw / 2 + (ihash(k * 5 + j, L.seed + 1) - 0.5) * 20; ctx.fillRect(Math.round(mx), Math.round(hy - th * 0.55), 1, Math.round(10 + ihash(k * 7 + j, L.seed + 2) * 14)); }
        } else if (kind < 0.85) { // palm
          ctx.fillRect(Math.round(sx), Math.round(hy - th * 0.7), 2, Math.round(th * 0.7));
          for (let j = 0; j < 6; j++) { const a = -Math.PI * 0.9 + j * 0.3, len = 14 + ihash(k * 11 + j, L.seed) * 8; ctx.beginPath(); ctx.moveTo(sx + 1, hy - th * 0.7); ctx.lineTo(sx + 1 + Math.cos(a) * len, hy - th * 0.7 + Math.sin(a) * len + 8); ctx.lineWidth = 2; ctx.strokeStyle = L.col; ctx.stroke(); }
        } else { // mangrove clump
          for (let j = 0; j < 5; j++) ctx.fillRect(Math.round(sx - 8 + j * 5), Math.round(hy - 8), 1, 9);
          Leaf.draw(ctx, Leaf.mass(26, 14, L.qc, L.qm, L.ql, (k * 7) & 7), sx + 2, hy - 13, 1);
        }
      }
    }
    // fog band on horizon
    const g = ctx.createLinearGradient(0, hy - 40, 0, hy);
    g.addColorStop(0, rgba(sc.bot, 0)); g.addColorStop(1, rgba(sc.bot, 0.45 * light));
    ctx.fillStyle = g; ctx.fillRect(0, hy - 40, W, 40);
  },
  // flat banded body: pixel-art depth steps instead of a smooth gradient
  waterBands(day) {
    const light = this.light(day), B = Biome.mixPal(G.cam.x), tint = B.water;
    const top = mixColor(tint[0], '#08202a', 1 - light), mid = mixColor(tint[1], '#06181f', 1 - light), deep = mixColor(tint[2], '#030c10', 1 - light);
    return [[0, top], [60, mixColor(top, mid, 0.45)], [150, mid], [300, mixColor(mid, deep, 0.5)], [520, deep], [820, shade(deep, 0.7)]];
  },
  drawWater(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom, hy = cam.toScreen(0, 0)[1];
    if (hy > H) return;
    const light = this.light(day), B = Biome.mixPal(cam.x), tint = B.water;
    const top = mixColor(tint[0], '#08202a', 1 - light);
    const mid = mixColor(tint[1], '#06181f', 1 - light);
    const deep = mixColor(tint[2], '#030c10', 1 - light);
    // everything below is clipped to the actual wave surface, so a crest holds
    // water above the still line and a trough shows the sky through it
    ctx.save();
    const T = this.clipWater(ctx, cam);
    let minY = H;
    for (let i = 0; i < T.n; i++) if (T.ys[i] < minY) minY = T.ys[i];
    const y0 = Math.max(minY, 0);
    // --- depth ramp anchored to world depth, so the water does not slide with the camera
    const yA = cam.toScreen(0, -10)[1], yB = cam.toScreen(0, 820)[1];
    if (yB - yA > 1) {
      const g = ctx.createLinearGradient(0, yA, 0, yB);
      g.addColorStop(0, mixColor(top, '#ffffff', 0.06));
      g.addColorStop(0.06, top);
      g.addColorStop(0.2, mixColor(top, mid, 0.6));
      g.addColorStop(0.38, mid);
      g.addColorStop(0.64, mixColor(mid, deep, 0.72));
      g.addColorStop(1, deep);
      ctx.fillStyle = g;
    } else ctx.fillStyle = deep;
    ctx.fillRect(0, y0, W, H - y0 + 2);
    // keep a little pixel grain in the ramp so it never reads as an airbrush
    ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, H - y0 + 2); ctx.clip();
    Tex.fill(ctx, Tex.dither(mixColor(mid, '#ffffff', 0.5), 0.12), cam.x * 0.6, cam.y * 0.6, z, 0.09);
    ctx.restore();
    // --- caustics: two counter-drifting meshes shimmering under the surface
    if (light > 0.22) {
      const cau = Tex.caustic('#ccfff0');
      // two bands: bright right under the surface, a hint further down
      const bands = [[-4, 46, 0.075], [46, 130, 0.035]];
      for (const [d0, d1, a] of bands) {
        const cTop = cam.toScreen(0, d0)[1], cBot = cam.toScreen(0, d1)[1];
        const yT = Math.max(y0, cTop), yB2 = Math.min(H, cBot);
        if (yB2 <= yT) continue;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, yT, W, yB2 - yT); ctx.clip();
        Tex.fill(ctx, cau, cam.x * 0.5 - this.t * 9, cam.y * 0.5 - this.t * 2, z, a * light, 'lighter');
        Tex.fill(ctx, cau, -cam.x * 0.4 - this.t * 5, cam.y * 0.4 + this.t * 3, z, a * 0.7 * light, 'lighter');
        ctx.restore();
      }
    }
    // --- god rays: soft wedges falling from the surface. Under a concrete
    // crown they are lamplight through the scum, not sun, so they go warm,
    // short and sparse; in the deep there is nothing left to make them at all.
    const roofed = this.isIndoor(cam.x);
    const rays = roofed ? 3 : 6, rayCol = roofed ? [255, 226, 150] : [215, 255, 240];
    const rayLen = roofed ? 0.55 : 1, rayA = roofed ? 0.7 : 1;
    if (light > 0.3 || roofed) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const lightK = roofed ? 1 : light;
      for (let i = 0; i < rays; i++) {
        const seed = ihash(i, 55), sway = Math.sin(this.t * 0.28 + i * 1.7) * 14 * z;
        const bx = (((seed * 1400 - cam.x * 0.4 * z) % 1400) + 1400) % 1400 - 240 + sway;
        const bw = (14 + ihash(i, 56) * 26) * z, len = (200 + ihash(i, 57) * 220) * z * rayLen;
        const gy0 = hy, gy1 = hy + len;
        if (gy0 > H || gy1 < 0) continue;
        const gr = ctx.createLinearGradient(0, gy0, 0, gy1);
        gr.addColorStop(0, `rgba(${rayCol[0]},${rayCol[1]},${rayCol[2]},${(0.11 * lightK * rayA).toFixed(3)})`);
        gr.addColorStop(0.45, `rgba(${rayCol[0]},${rayCol[1]},${rayCol[2]},${(0.05 * lightK * rayA).toFixed(3)})`);
        gr.addColorStop(1, `rgba(${rayCol[0]},${rayCol[1]},${rayCol[2]},0)`);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(bx, gy0); ctx.lineTo(bx + bw, gy0);
        ctx.lineTo(bx + bw + len * 0.24, gy1); ctx.lineTo(bx + len * 0.24, gy1);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // --- suspended silt on two parallax layers
    ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, H - y0 + 2); ctx.clip();
    const mo = Tex.motes('#cfe8dc');
    Tex.fill(ctx, mo, cam.x * 0.9 + Math.sin(this.t * 0.2) * 9, cam.y * 0.9 - this.t * 3, z, 0.3);
    Tex.fill(ctx, mo, cam.x * 0.55 - 40 + Math.sin(this.t * 0.14 + 2) * 6, cam.y * 0.55 - this.t * 1.4, z, 0.16);
    ctx.restore();
    ctx.restore();          // release the wave-surface clip
  },
  drawTerrain(ctx, cam) {
    const W = G.W, H = G.H, z = cam.zoom, BP = Biome.mixPal(cam.x), step = 3;
    // contour of the ground across the screen, sampled once and reused
    const pts = [];
    for (let sx = -step; sx <= W + step; sx += step) { const wx = cam.toWorldX(sx); pts.push([sx, cam.toScreen(wx, this.floorY(wx))[1], wx]); }
    const last = pts.length - 1;
    const capTop = (off) => { ctx.beginPath(); ctx.moveTo(pts[0][0], H + 30); for (const p of pts) ctx.lineTo(p[0], p[1] + off); ctx.lineTo(pts[last][0], H + 30); ctx.closePath(); };
    const band = (a, b) => {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] + a);
      for (const p of pts) ctx.lineTo(p[0], p[1] + a);
      for (let i = last; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + b);
      ctx.closePath();
    };
    // --- strata, shallow first: each fill covers everything below its own line,
    // so drawing deeper layers later lets the deep colours win at depth
    const g0 = BP.ground[0], g1 = BP.ground[1], g2 = BP.ground[2];
    // Depth ramp built from many closely spaced fills: enough steps that the
    // ground reads as one continuous body instead of a handful of stripes.
    const humus = mixColor(g0, '#2a1d10', 0.55);
    // Widen the value range: the old ramp ran through three near-identical
    // browns, so at close range the ground was one featureless slab.
    const topsoil = mixColor(g0, '#1c1208', 0.5), subsoil = mixColor(g0, '#c8b48a', 0.3);
    const stops = [[0, humus], [4, topsoil], [12, subsoil], [30, g1], [72, mixColor(g1, '#8a7a5c', 0.22)],
      [130, g2], [260, mixColor(g2, '#2e3540', 0.34)], [430, mixColor(g2, '#252c36', 0.55)]];
    const strata = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const [d0, c0] = stops[i], [d1, c1] = stops[i + 1], n = i === 0 ? 2 : 5;
      for (let k = 0; k < n; k++) { const u = k / n; strata.push([lerp(d0, d1, u), mixColor(c0, c1, u)]); }
    }
    strata.push([stops[stops.length - 1][0], stops[stops.length - 1][1]]);
    for (const [off, col] of strata) { const y = off * z; capTop(y); ctx.fillStyle = col; ctx.fill(); }
    // --- dithered seams so the strata read as sediment, not painted stripes
    for (let i = 1; i < strata.length; i++) {
      const top = strata[i][0] * z, h2 = (strata[i][0] - strata[i - 1][0]) * z * 0.5;
      if (h2 < 2.5) continue;
      const col = strata[i][1];
      ctx.save(); band(top - h2, top); ctx.clip();
      Tex.fill(ctx, Tex.dither(col, 0.4), cam.x, cam.y, z, 0.7);
      ctx.restore();
      ctx.save(); band(top - h2 * 2, top - h2); ctx.clip();
      Tex.fill(ctx, Tex.dither(col, 0.14), cam.x, cam.y, z, 0.6);
      ctx.restore();
    }
    // --- grain over the whole body: grit, specks and small stones
    ctx.save(); capTop(0); ctx.clip();
    Tex.fill(ctx, Tex.soil(shade(g2, 0.5), mixColor(g0, '#e8dcc0', 0.5), mixColor(g1, '#8a8068', 0.55)), cam.x, cam.y, z, 0.7);
    ctx.restore();
    // courses only bed down in the upper soil; deeper than that it is solid marl
    ctx.save(); band(6 * z, 150 * z); ctx.clip();
    Tex.fill(ctx, Tex.strata(shade(g2, 0.4), mixColor(g0, '#f0e4c4', 0.55)), cam.x, cam.y, z, 0.85);
    ctx.restore();
    // --- features on a fixed world grid, so density never changes with zoom
    const left = cam.toWorldX(-40), right = cam.toWorldX(W + 40);
    const GRID = 11, x0 = Math.floor(left / GRID) * GRID;
    const px = (sx, sy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(sx), Math.round(sy), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const rockLit = mixColor(g1, '#cfc6a8', 0.62), rockMid = mixColor(g1, '#7d7460', 0.6), rockDark = shade(g2, 0.62);
    const rootCol = mixColor(g2, '#40301c', 0.55), rootLit = mixColor(g1, '#7a5c38', 0.55);
    for (let wx = x0; wx < right; wx += GRID) {
      const cell = Math.floor(wx / GRID), fy = this.floorY(wx), [sx, sy] = cam.toScreen(wx, fy);
      if (sy > H + 40) continue;
      const r1 = ihash(cell, 301), r2 = ihash(cell, 302), r3 = ihash(cell, 303), r4 = ihash(cell, 304);
      // limestone lumps: a lit cap, a body and a shadow line
      if (r1 < 0.44) {
        const y = sy + (14 + r2 * 230) * z;
        if (y < H + 10) {
          const w = (2.5 + r3 * 5) * z, h = (1.8 + r4 * 3) * z;
          px(sx - w / 2, y, w, h, rockMid);
          px(sx - w / 2, y, w - z * 0.8, z * 0.8, rockLit);
          px(sx - w / 2, y + h - z * 0.7, w, z * 0.7, rockDark);
        }
      }
      // roots reaching down out of the bank: thin, tapering, never a fence post
      if (fy < 4 && r2 < 0.3) {
        const len = (9 + r3 * 40) * z, lean = (r4 - 0.5) * 2.4, wig = 0.6 + r1 * 1.4;
        const steps2 = Math.max(3, Math.round(len));
        let cx2 = sx, cy2 = sy + 1.5 * z;
        for (let k = 0; k < steps2; k++) {
          const u = k / steps2;
          if (cy2 > H + 4) break;
          const tw = Math.max(1, Math.round(z * (1.3 - u * 1.0)));
          ctx.fillStyle = u < 0.25 ? rootLit : rootCol;
          ctx.fillRect(Math.round(cx2), Math.round(cy2), tw, 1);
          cx2 += Math.sin(lean + u * wig * 5) * 0.45 * z; cy2 += 1;
        }
      }
      // pale shell and sand lenses in the upper metre
      if (r3 < 0.4) {
        const y = sy + (5 + r1 * 52) * z;
        if (y < H) px(sx, y, (1.5 + r4 * 3) * z, Math.max(1, z * 0.8), mixColor(g0, '#e6dcbe', 0.7));
      }
      // charcoal flecks and buried grit
      if (r4 < 0.55) { const y = sy + (6 + r2 * 280) * z; if (y < H) px(sx + r1 * GRID * z * 0.5, y, z * 0.8, z * 0.8, shade(g2, 0.42)); }
      // dried cracks lacing the topsoil where the bank is out of the water
      if (fy < -4 && r1 > 0.55 && r1 < 0.78) {
        const cx3 = sx, cy3 = sy + (3 + r2 * 9) * z, len2 = (5 + r3 * 16) * z, lean2 = (r4 - 0.5) * 1.6;
        ctx.fillStyle = shade(g2, 0.6);
        for (let k = 0; k < len2; k++) ctx.fillRect(Math.round(cx3 + Math.sin(lean2 + k * 0.35) * 1.6 * z), Math.round(cy3 + k), Math.max(1, Math.round(z * 0.5)), 1);
      }
    }
    // --- coarse pass: boulders, buried logs and root bundles large enough to
    // break up the soil mass. The fine grid above only places specks.
    const BIG = 74, bx0 = Math.floor(left / BIG) * BIG;
    for (let wx = bx0; wx < right; wx += BIG) {
      const cell = Math.floor(wx / BIG), fy = this.floorY(wx), [sx, sy] = cam.toScreen(wx, fy);
      if (sy > H + 60) continue;
      const q1 = ihash(cell, 511), q2 = ihash(cell, 512), q3 = ihash(cell, 513), q4 = ihash(cell, 514);
      const ox = (q4 - 0.5) * BIG * 0.7 * z;
      if (q1 < 0.4) {
        // boulder: a lit cap, a body, a shadowed underside and a seated shadow
        const rw = (6 + q2 * 8) * z, rh = rw * (0.62 + q3 * 0.26), y = sy + (22 + q3 * 150) * z;
        if (y < H + 30) {
          // a lumpy silhouette with grain, not a smooth grey disc
          const lit2 = mixColor(rockLit, '#ffffff', 0.15);
          for (let j = -rh; j <= rh; j++) {
            const u = j / rh;
            const bulge = 1 + Math.sin(u * 3.1 + q2 * 6) * 0.09;
            const hw = rw * Math.sqrt(Math.max(0, 1 - u * u)) * bulge;
            if (hw < 0.5) continue;
            for (let i = -hw; i <= hw; i++) {
              const v = i / Math.max(1, hw);
              const lam = -(u * 0.9 + v * 0.35);
              const gr = ihash(Math.round(i) * 31 + Math.round(j) * 17, cell) ;
              let c = lam > 0.5 ? lit2 : lam > 0.02 ? rockMid : rockDark;
              if (gr > 0.86) c = shade(c, 0.85); else if (gr < 0.1) c = mixColor(c, lit2, 0.4);
              ctx.fillStyle = c; ctx.fillRect(Math.round(sx + ox + i), Math.round(y + j), 1, 1);
            }
          }
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(Math.round(sx + ox - rw * 0.8), Math.round(y + rh - z * 0.5), Math.round(rw * 1.6), Math.max(1, Math.round(1.6 * z)));
        }
      } else if (q1 < 0.62) {
        // a log buried on its side, bark up
        const lw = (11 + q2 * 14) * z, lh = (3 + q3 * 3) * z, y = sy + (16 + q3 * 90) * z;
        if (y < H + 20) {
          // rounded ends and a lit upper curve; a flat box with stripes read as a barcode
          const barkD = mixColor(g2, '#33240f', 0.55), barkM = mixColor(g1, '#5f4526', 0.6), barkL = mixColor(g0, '#8a6a42', 0.55);
          for (let i = -lw; i <= lw; i++) {
            const u = i / lw, cap = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, Math.abs(u) - 0.72) / 0.28, 2)));
            const hh = lh * (Math.abs(u) > 0.72 ? cap : 1);
            if (hh < 0.5) continue;
            for (let j = -hh; j <= hh; j++) {
              const v = j / hh;
              let c = v < -0.36 ? barkL : v < 0.4 ? barkM : barkD;
              if (ihash(Math.round(i) * 7 + Math.round(j) * 53, cell + 3) > 0.84) c = shade(c, 0.86);
              ctx.fillStyle = c; ctx.fillRect(Math.round(sx + ox + i), Math.round(y + j), 1, 1);
            }
          }
        }
      } else if (q1 < 0.85 && fy < 8) {
        // a bundle of thick roots reaching well down from the bank
        const n2 = 2 + ((q2 * 3) | 0);
        for (let b = 0; b < n2; b++) {
          const len2 = (34 + ihash(cell * 7 + b, 515) * 96) * z, lean2 = (ihash(cell * 11 + b, 516) - 0.5) * 2.6;
          let cx3 = sx + ox + (b - n2 / 2) * 5 * z, cy3 = sy + 2 * z;
          for (let k = 0; k < len2; k++) {
            if (cy3 > H + 6) break;
            const u = k / len2, tw = Math.max(1, Math.round(z * (2.4 - u * 1.9)));
            ctx.fillStyle = u < 0.2 ? rootLit : rootCol;
            ctx.fillRect(Math.round(cx3), Math.round(cy3), tw, 1);
            cx3 += Math.sin(lean2 + u * 4) * 0.5 * z; cy3 += 1;
          }
        }
      }
    }
    // --- the surface itself: grass lip, wet shore or river bed
    const grassLit = mixColor(BP.grass, '#f0ffd0', 0.35), grassDark = shade(BP.grass, 0.6), grassDeep = shade(BP.grass, 0.42);
    for (let i = 0; i <= last; i++) {
      const p = pts[i], wx = p[2], fy = this.floorY(wx);
      const md = Mud.depth(wx) * z, ty = p[1] + md;
      if (ty > H + 6) continue;
      if (md > 0.8) { ctx.fillStyle = shade(g2, 0.72); ctx.fillRect(p[0], Math.round(p[1]), step, Math.round(md)); }
      const gz = Math.max(1, Math.round(2 * z));
      if (fy < 0) {
        // turf: a bright lip, a shaded underside, then soil
        ctx.fillStyle = BP.grass; ctx.fillRect(p[0], Math.round(ty - gz), step, Math.round(gz * 1.6));
        ctx.fillStyle = grassLit; ctx.fillRect(p[0], Math.round(ty - gz), step, Math.max(1, Math.round(z)));
        ctx.fillStyle = grassDark; ctx.fillRect(p[0], Math.round(ty + gz * 0.6), step, gz);
        ctx.fillStyle = mixColor(g0, grassDeep, 0.45); ctx.fillRect(p[0], Math.round(ty + gz * 1.6), step, gz);
        // sod does not end in a straight cut: hang a ragged root mat under it
        const rg = ihash(Math.floor(wx / 5), 121);
        if (rg < 0.5) ctx.fillRect(p[0], Math.round(ty + gz * 2.6), step, Math.max(1, Math.round((1 + rg * 5) * z)));
      } else if (fy < 34) {
        const wet = clamp(1 - fy / 34, 0, 1);
        ctx.fillStyle = mixColor(g0, '#ded0a8', 0.2 + wet * 0.4); ctx.fillRect(p[0], Math.round(ty), step, Math.round(gz * 1.6));
        ctx.fillStyle = mixColor(g0, '#6e6248', 0.4); ctx.fillRect(p[0], Math.round(ty + gz * 1.6), step, gz);
      } else {
        ctx.fillStyle = mixColor(fy > 450 ? g2 : g0, '#000000', 0.12); ctx.fillRect(p[0], Math.round(ty), step, Math.max(1, Math.round(2 * z)));
      }
    }
    // grass blades and shore pebbles, again on the world grid
    for (let wx = x0; wx < right; wx += 5) {
      const cell = Math.floor(wx / 5), fy = this.floorY(wx);
      const [sx, sy0] = cam.toScreen(wx, fy), sy = sy0 + Mud.depth(wx) * z;
      if (sy > H || sy < -20) continue;
      const r1 = ihash(cell, 411), r2 = ihash(cell, 412);
      if (fy < -2) {
        if (r1 < 0.55) {
          const bh = (2 + r2 * 5) * z, lean = (r1 - 0.27) * 6 * z;
          ctx.fillStyle = r2 < 0.4 ? grassLit : BP.grass;
          const steps2 = Math.max(1, Math.round(bh));
          for (let k = 0; k < steps2; k++) ctx.fillRect(Math.round(sx + lean * (k / steps2)), Math.round(sy - 2 * z - k), Math.max(1, Math.round(z * 0.7)), 1);
        }
      } else if (fy < 40 && r1 < 0.3) {
        const w = (2 + r2 * 4) * z;
        ctx.fillStyle = mixColor(g1, '#b8ae90', 0.55); ctx.fillRect(Math.round(sx), Math.round(sy + z), Math.round(w), Math.max(1, Math.round(z * 1.4)));
        ctx.fillStyle = mixColor(g0, '#e8e0c4', 0.6); ctx.fillRect(Math.round(sx), Math.round(sy + z), Math.round(w - z * 0.5), Math.max(1, Math.round(z * 0.6)));
      }
    }
  },
  // concrete shell of the lab and sewer: ceiling, back wall, ribs and lamps
  drawIndoor(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom, step = 4;
    if (!this.isIndoor(cam.toWorldX(W / 2)) && !this.isIndoor(cam.toWorldX(0)) && !this.isIndoor(cam.toWorldX(W))) return;
    const B = Biome.mixPal(cam.x);
    // --- back wall: glazed brick, courses and pilasters -------------------
    const wall = shade(B.ground[2], 1.2), wallD = shade(B.ground[2], 0.62), wallL = shade(B.ground[2], 1.55);
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
    for (let sx = 0; sx < W; sx += 8) {
      const wx = cam.toWorldX(sx), hcol = ihash(Math.floor(wx / 26), 5);
      ctx.fillStyle = hcol < 0.3 ? shade(wall, 1.14) : hcol < 0.6 ? shade(wall, 0.88) : wall;
      ctx.fillRect(sx, 0, 8, H);
    }
    const course = Math.max(3, Math.round(7 * z));
    ctx.globalAlpha = 0.42;
    for (let sy = 0; sy < H; sy += course) {
      ctx.fillStyle = wallD; ctx.fillRect(0, sy, W, 1);
      const off = ((sy / course) | 0) % 2 ? Math.round(7 * z) : 0;
      for (let sx = off; sx < W; sx += Math.max(6, Math.round(14 * z))) ctx.fillRect(sx, sy, 1, course);
    }
    ctx.globalAlpha = 1;
    // pilasters: shallow piers standing off the wall every 150 units
    const leftW = cam.toWorldX(-80), rightW = cam.toWorldX(W + 80);
    for (let wx = Math.floor(leftW / 150) * 150; wx < rightW; wx += 150) {
      const [sx] = cam.toScreen(wx, 0), pw = Math.max(2, Math.round(9 * z));
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = wallD; ctx.fillRect(Math.round(sx - pw / 2), 0, pw, H);
      ctx.fillStyle = wallL; ctx.fillRect(Math.round(sx - pw / 2), 0, Math.max(1, Math.round(z)), H);
      ctx.globalAlpha = 1;
    }
    // damp streaks running down the brick
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 24; i++) {
      const wx = leftW + ihash(i + Math.floor(leftW / 900) * 31, 77) * (rightW - leftW);
      const [sx] = cam.toScreen(wx, 0);
      ctx.fillStyle = mixColor(wallD, B.scum, 0.35);
      ctx.fillRect(Math.round(sx), 0, Math.max(1, Math.round(1.6 * z)), H * (0.3 + ihash(i, 78) * 0.7));
    }
    ctx.globalAlpha = 1;
    // --- the vault overhead ----------------------------------------------
    const slab = shade(B.ground[0], 1.05), slabD = shade(B.ground[0], 0.5), slabL = shade(B.ground[0], 1.4);
    ctx.beginPath(); ctx.moveTo(-4, -10);
    for (let sx = -step; sx <= W + step; sx += step) { const wx = cam.toWorldX(sx), r = this.roofY(wx); ctx.lineTo(sx, r === null ? -20 : cam.toScreen(wx, r)[1]); }
    ctx.lineTo(W + 4, -10); ctx.closePath();
    ctx.fillStyle = slab; ctx.fill();
    // segment joints: short ticks up into the slab every 26 units of arch
    for (let wx = Math.floor(leftW / 26) * 26; wx < rightW; wx += 26) {
      const r = this.roofY(wx); if (r === null) continue;
      const [sx, sy] = cam.toScreen(wx, r);
      ctx.fillStyle = slabD; ctx.fillRect(Math.round(sx), Math.round(sy - 12 * z), Math.max(1, Math.round(1.4 * z)), Math.round(12 * z));
    }
    // the arch edge itself, three bands so the vault has a soffit
    for (let sx = -step; sx <= W + step; sx += step) {
      const wx = cam.toWorldX(sx), r = this.roofY(wx); if (r === null) continue;
      const sy = cam.toScreen(wx, r)[1];
      ctx.fillStyle = slabL; ctx.fillRect(sx, Math.round(sy) - Math.max(2, Math.round(5 * z)), step, Math.max(1, Math.round(2 * z)));
      ctx.fillStyle = slab; ctx.fillRect(sx, Math.round(sy) - Math.max(1, Math.round(3 * z)), step, Math.max(1, Math.round(2 * z)));
      ctx.fillStyle = slabD; ctx.fillRect(sx, Math.round(sy) - Math.max(1, Math.round(1.4 * z)), step, Math.max(1, Math.round(1.6 * z)));
      // soot and scum where the water once stood against the crown
      if (ihash(Math.floor(wx / 7), 91) < 0.3) { ctx.globalAlpha = 0.35; ctx.fillStyle = B.scum; ctx.fillRect(sx, Math.round(sy) - Math.round(2 * z), step, Math.max(1, Math.round(z))); ctx.globalAlpha = 1; }
    }
    // ribs, hanging lamps and dripping pipes
    for (let wx = Math.floor(leftW / 150) * 150; wx < rightW; wx += 150) {
      const r = this.roofY(wx); if (r === null) continue;
      const [sx, sy] = cam.toScreen(wx, r), fy = cam.toScreen(wx, this.floorY(wx))[1];
      ctx.fillStyle = shade(B.ground[0], 0.75); ctx.fillRect(Math.round(sx - 3 * z), Math.round(sy), Math.round(6 * z), Math.round(fy - sy));
      ctx.fillStyle = shade(B.ground[0], 1.1); ctx.fillRect(Math.round(sx - 3 * z), Math.round(sy), Math.max(1, Math.round(z)), Math.round(fy - sy));
      // conduit slung along the crown between the ribs
      const nx = wx + 150, nr = this.roofY(nx);
      if (nr !== null) {
        const [nsx, nsy] = cam.toScreen(nx, nr);
        const sag = 5 * z;
        ctx.strokeStyle = shade(B.ground[0], 0.55); ctx.lineWidth = Math.max(1, Math.round(1.6 * z));
        ctx.beginPath(); ctx.moveTo(sx, sy + 4 * z); ctx.quadraticCurveTo((sx + nsx) / 2, (sy + nsy) / 2 + sag, nsx, nsy + 4 * z); ctx.stroke();
      }
      // lamp
      const lx = wx + 75, lr = this.roofY(lx); if (lr === null) continue;
      const [lsx, lsy] = cam.toScreen(lx, lr);
      const on = ihash(Math.floor(lx / 150), 9) > 0.25 || Math.sin(this.t * 9 + lx) > 0;
      ctx.fillStyle = '#2a2e30'; ctx.fillRect(Math.round(lsx - z), Math.round(lsy), Math.max(1, Math.round(2 * z)), Math.round(5 * z));
      ctx.fillStyle = '#3a3f42'; ctx.fillRect(Math.round(lsx - 6 * z), Math.round(lsy + 4 * z), Math.round(12 * z), Math.max(1, Math.round(2 * z)));
      ctx.fillStyle = on ? '#ffe8a0' : '#3a3a34'; ctx.fillRect(Math.round(lsx - 5 * z), Math.round(lsy + 5 * z), Math.round(10 * z), Math.round(3 * z));
      if (on) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(lsx, lsy + 6 * z, 2, lsx, lsy + 6 * z, 70 * z); g.addColorStop(0, 'rgba(255,224,150,0.22)'); g.addColorStop(1, 'rgba(255,224,150,0)'); ctx.fillStyle = g; ctx.fillRect(lsx - 70 * z, lsy, 140 * z, 150 * z); ctx.globalCompositeOperation = 'source-over'; }
      if (chance(0.02)) G.fx.add({ type: 'drop', x: lx + rand(-30, 30), y: lr + 8, vx: 0, vy: 20, s: 1, color: '#9ab0b8', life: 3 });
    }
  },
  // The deep is not an empty black rectangle. Below the light there is marine
  // snow drifting down forever, the far side of the canyon showing as a flat
  // silhouette, and things that make their own light.
  drawDeepScene(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom;
    const depth = cam.y;
    if (depth < 240) return;
    const B = Biome.mixPal(cam.x);
    const k = clamp((depth - 240) / 700, 0, 1);
    // --- the far side of the canyon, two layers of flat strata ----------
    // Anchored to the seabed rather than to the camera: a distant wall does
    // not slide up and down as you swim, it only slides sideways.
    if (B.open || B.pressure) {
      const bed = this.floorY(cam.x);
      const WALLS = [
        { f: 0.24, mix: 0.22, amp: 190, rise: 560, sc: 0.0011, seed: 61, a: 0.5 },
        { f: 0.44, mix: 0.1, amp: 260, rise: 380, sc: 0.0007, seed: 83, a: 0.62 },
      ];
      for (const L of WALLS) {
        const col = mixColor(B.water[1], B.fog, L.mix);
        const ox = cam.x * L.f;
        const crest = cam.toScreen(0, Math.max(160, bed - L.rise))[1];
        ctx.globalAlpha = L.a * (0.35 + k * 0.65);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(-4, H + 8);
        let minY = H;
        for (let sx = -8; sx <= W + 8; sx += 8) {
          const wx = ox + sx / z;
          const h = (fbm(wx * L.sc, L.seed) * 0.85 + 0.15) * L.amp * z;
          const yy = crest - h; if (yy < minY) minY = yy;
          ctx.lineTo(sx, yy);
        }
        ctx.lineTo(W + 4, H + 8); ctx.closePath(); ctx.fill();
        // horizontal bedding planes so the rock has grain at this distance
        ctx.save(); ctx.clip();
        ctx.fillStyle = shade(col, 0.72);
        for (let yy = Math.max(0, minY); yy < H; yy += Math.max(3, Math.round(11 * z))) ctx.fillRect(0, Math.round(yy), W, Math.max(1, Math.round(1.4 * z)));
        ctx.fillStyle = shade(col, 1.25);
        for (let yy = Math.max(0, minY); yy < H; yy += Math.max(6, Math.round(23 * z))) ctx.fillRect(0, Math.round(yy), W, Math.max(1, Math.round(z)));
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }
    // --- marine snow: three drifting layers, denser the deeper you go ----
    const t = this.t;
    ctx.globalAlpha = 1;
    for (let L = 0; L < 3; L++) {
      const f = 0.35 + L * 0.3, cell = 34 - L * 8, fall = 9 + L * 7;
      const ox = cam.x * f, oy = cam.y * f + t * fall;
      const sz = Math.max(1, Math.round((L === 2 ? 2 : 1) * z * 0.7));
      ctx.fillStyle = rgba(mixColor('#dfeef0', B.water[0], 0.3), (0.1 + L * 0.07) * (0.35 + k * 0.65));
      const i0 = Math.floor(ox / cell) - 1, i1 = Math.floor((ox + W / z) / cell) + 1;
      const j0 = Math.floor(oy / cell) - 1, j1 = Math.floor((oy + H / z) / cell) + 1;
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const h = ihash(i * 733 + j * 91, 17 + L); if (h > 0.55) continue;
        const wx = i * cell + ihash(i + j * 7, 23 + L) * cell;
        const wy = j * cell + ihash(i * 3 + j, 29 + L) * cell;
        const sx = (wx - ox) * z + Math.sin(t * 0.5 + j) * 2 * z, sy = (wy - oy) * z;
        if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
        ctx.fillRect(Math.round(sx), Math.round(sy), sz, sz);
      }
    }
  },
  // Bioluminescence rides on top of the night pass: these are the only lights
  // down here, so nothing is allowed to dim them.
  drawDeepGlow(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom, t = this.t;
    const k = clamp((cam.y - 240) / 700, 0, 1);
    if (k <= 0.45) return;
    const B = Biome.mixPal(cam.x);
    if (!B.open && !B.pressure) return;
    ctx.globalCompositeOperation = 'lighter';
    const cell = 70, ox = cam.x * 0.9, oy = cam.y * 0.9;
    const i0 = Math.floor(ox / cell) - 1, i1 = Math.floor((ox + W / z) / cell) + 1;
    const j0 = Math.floor(oy / cell) - 1, j1 = Math.floor((oy + H / z) / cell) + 1;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const h = ihash(i * 977 + j * 131, 53); if (h > 0.5) continue;
      const ph = h * 40 + i * 0.7 + j * 1.3;
      const pulse = Math.max(0, Math.sin(t * (0.6 + h) + ph));
      if (pulse < 0.12) continue;
      const wx = i * cell + ihash(i + j * 5, 57) * cell, wy = j * cell + ihash(i * 5 + j, 59) * cell;
      const sx = (wx - ox) * z + Math.sin(t * 0.3 + j) * 7 * z, sy = (wy - oy) * z + Math.cos(t * 0.24 + i) * 6 * z;
      if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
      const col = h < 0.18 ? '#6affd8' : h < 0.34 ? '#58c8ff' : '#c08cff';
      const a0 = pulse * (k - 0.45) / 0.55;
      ctx.globalAlpha = a0 * 0.9; ctx.fillStyle = col;
      ctx.fillRect(Math.round(sx), Math.round(sy), Math.max(1, Math.round(1.4 * z)), Math.max(1, Math.round(1.4 * z)));
      ctx.globalAlpha = a0 * 0.34;
      ctx.fillRect(Math.round(sx) - Math.round(z), Math.round(sy) - Math.round(z), Math.max(3, Math.round(4 * z)), Math.max(3, Math.round(4 * z)));
      ctx.globalAlpha = a0 * 0.1;
      ctx.fillRect(Math.round(sx) - Math.round(3 * z), Math.round(sy) - Math.round(3 * z), Math.max(6, Math.round(9 * z)), Math.max(6, Math.round(9 * z)));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },
  // Concrete dressing for the drowned system: a hard capping course on every
  // invert, expansion joints, slime at the waterline and outfall pipes set into
  // the back wall. Runs after the terrain so it sits on top of the soil.
  drawTunnelFloor(ctx, cam) {
    const W = G.W, H = G.H, z = cam.zoom, step = Math.max(2, Math.round(3 * z));
    const B = Biome.mixPal(cam.x);
    const cap = shade(B.ground[0], 1.18), capD = shade(B.ground[0], 0.62), joint = shade(B.ground[2], 0.7);
    const slime = mixColor(B.scum, '#1a2a12', 0.35);
    for (let sx = 0; sx <= W; sx += step) {
      const wx = cam.toWorldX(sx), r = this.roofY(wx); if (r === null) continue;
      const fy = this.floorY(wx), su = this.surface(wx);
      const [, sy] = cam.toScreen(wx, fy);
      if (sy < -20 || sy > H + 10) continue;
      ctx.fillStyle = cap; ctx.fillRect(sx, Math.round(sy), step, Math.max(1, Math.round(1.6 * z)));
      ctx.fillStyle = capD; ctx.fillRect(sx, Math.round(sy + 1.6 * z), step, Math.max(1, Math.round(2.4 * z)));
      // expansion joints every 120 units, cut down into the invert
      const cell = Math.floor(wx / 120);
      if (Math.abs(wx - cell * 120) < 3) { ctx.fillStyle = joint; ctx.fillRect(sx, Math.round(sy), Math.max(1, Math.round(1.4 * z)), Math.round(9 * z)); }
      // slime band where the water has stood against the concrete
      if (fy < su + 26 && fy > su - 40) {
        const [, wy] = cam.toScreen(wx, su);
        ctx.globalAlpha = 0.6; ctx.fillStyle = slime;
        ctx.fillRect(sx, Math.round(wy - 1.5 * z), step, Math.max(1, Math.round(4 * z)));
        ctx.globalAlpha = 1;
      }
    }
  },
  // Pipe mouths punched through the back wall. The system is a network, and a
  // network has to visibly go somewhere other than left and right.
  drawTunnelPipes(ctx, cam) {
    const W = G.W, H = G.H, z = cam.zoom;
    const B = Biome.mixPal(cam.x);
    const left = cam.toWorldX(-140), right = cam.toWorldX(W + 140);
    const rim = shade(B.ground[0], 0.9), rimL = shade(B.ground[0], 1.25), bore = shade(B.ground[2], 0.34);
    for (let wx = Math.floor(left / 260) * 260; wx < right; wx += 260) {
      const h = ihash(Math.floor(wx / 260), 313);
      if (h > 0.72) continue;
      const r0 = this.roofY(wx); if (r0 === null) continue;
      const fy = this.floorY(wx), su = this.surface(wx);
      // set into the wall between the ceiling and the invert
      const rad = (14 + h * 22);
      const wy = lerp(r0 + rad + 8, fy - rad - 6, 0.25 + ihash(Math.floor(wx / 260), 317) * 0.55);
      if (wy - rad < r0 || wy + rad > fy) continue;
      const [sx, sy] = cam.toScreen(wx, wy);
      Shape.oct(ctx, sx, sy, (rad + 4) * z, rim);
      Shape.oct(ctx, sx, sy, (rad + 2) * z, rimL);
      Shape.oct(ctx, sx, sy, rad * z, bore);
      Shape.oct(ctx, sx, sy, rad * z * 0.72, '#04080a');
      // brickwork ring
      for (let a = 0; a < 8; a++) {
        const an = a / 8 * TAU + 0.4;
        ctx.fillStyle = a % 2 ? rim : shade(rim, 0.8);
        ctx.fillRect(Math.round(sx + Math.cos(an) * (rad + 3) * z), Math.round(sy + Math.sin(an) * (rad + 3) * z), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(2 * z)));
      }
      // a live one still runs
      if (h < 0.3) {
        const fall = Math.min(fy, su) - wy;
        if (fall > 0) {
          ctx.globalAlpha = 0.5; ctx.fillStyle = mixColor(B.water[0], '#d8e8e0', 0.5);
          ctx.fillRect(Math.round(sx - 2 * z), Math.round(sy), Math.max(1, Math.round(4 * z)), Math.round(fall * z));
          ctx.globalAlpha = 0.25; ctx.fillRect(Math.round(sx - 4 * z), Math.round(sy), Math.max(1, Math.round(8 * z)), Math.round(fall * z * 0.7));
          ctx.globalAlpha = 1;
          if (chance(0.25)) G.fx.add({ type: 'drop', x: wx + rand(-4, 4), y: wy + 6, vx: rand(-6, 6), vy: 90, s: 1, color: '#a8c4c0', life: 1.6 });
        }
      } else if (chance(0.02)) G.fx.add({ type: 'drop', x: wx + rand(-6, 6), y: wy, vx: 0, vy: 30, s: 1, color: '#8aa4a8', life: 2.4 });
    }
  },
  // Aerial perspective under water. Fading toward the deep water colour keeps the
  // ground readable at depth; fading to black just erased all of its texture.
  // Searchlights sweeping the harbour. Drawn late, after the water body, or the
  // water fill covers them completely.
  drawKaiju(ctx, cam, day) {
    const W = G.W, H = G.H, hy = cam.toScreen(0, 0)[1], light = this.light(day), night = 1 - light, t = this.t;
  // under one. Only in the kaiju biome, and only worth drawing after dusk.
  const BK = Biome.at(cam.x);
  if (BK.kaiju) {
    const P = G.player, dark = clamp(night * 1.5, 0.25, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const bx = (((ihash(i, 121) * 900 + i * 180 - cam.x * 0.3) % 900) + 900) % 900 - 130;
      if (bx < -320 || bx > W + 320) continue;
      const by = hy - 44 - ihash(i, 122) * 46;
      const sweep = Math.sin(t * (0.22 + ihash(i, 123) * 0.16) + i * 2.1);
      // lock on when the sweep happens to be pointing at the player
      const px2 = P ? cam.toScreen(P.x, P.y)[1] : 0, pxs = P ? cam.toScreen(P.x, P.y)[0] : -999;
      const aim = bx + sweep * 260;
      const onTarget = P && !P.dead && Math.abs(pxs - aim) < 60 && P.y < 40;
      const len = H + 120, wTop = 5, wBot = 34 + Math.abs(sweep) * 30;
      const col = onTarget ? '255,120,90' : '210,235,255';
      const gr = ctx.createLinearGradient(bx, by, aim, by + len);
      gr.addColorStop(0, `rgba(${col},${(0.3 * dark).toFixed(3)})`);
      gr.addColorStop(0.5, `rgba(${col},${(0.09 * dark).toFixed(3)})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(bx - wTop, by); ctx.lineTo(bx + wTop, by);
      ctx.lineTo(aim + wBot, by + len); ctx.lineTo(aim - wBot, by + len);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = onTarget ? 'rgba(255,180,150,0.9)' : 'rgba(230,245,255,0.75)';
      ctx.fillRect(Math.round(bx - 2), Math.round(by - 2), 4, 4);
    }
    ctx.restore();
  }

  },
  drawDepthShade(ctx, cam) {
    const H = G.H, hy = cam.toScreen(0, 0)[1];
    const y0 = cam.toScreen(0, 90)[1];
    if (y0 > H) return;
    const B = Biome.mixPal(cam.x), haze = hexToRgb(mixColor(B.water[1], '#04141a', 0.45));
    const yT = Math.max(y0, hy);
    const g = ctx.createLinearGradient(0, yT, 0, cam.toScreen(0, 760)[1]);
    g.addColorStop(0, `rgba(${haze[0]},${haze[1]},${haze[2]},0)`);
    g.addColorStop(0.45, `rgba(${haze[0]},${haze[1]},${haze[2]},0.3)`);
    g.addColorStop(1, `rgba(${haze[0]},${haze[1]},${haze[2]},0.45)`);
    ctx.fillStyle = g; ctx.fillRect(0, yT, G.W, H - yT);
  },
  drawDecor(ctx, cam, layer, day) {
    // layer 0 = behind entities (weeds, rocks, logs, reeds, trees), 1 = in front (lilies, sawgrass, fireflies)
    const W = G.W, z = cam.zoom, t = this.t, light = this.light(day), night = 1 - light;
    const left = cam.toWorldX(-80), right = cam.toWorldX(W + 80);
    // A blade is three tapering strokes: shadow, body, lit edge. One flat stroke
    // per blade is what made the weed beds look like scribbled wire.
    const blade = (bx, by, tx, ty, mx, my, w, cDark, cMid, cLit) => {
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1, w); ctx.strokeStyle = cDark;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      ctx.lineWidth = Math.max(1, w * 0.6); ctx.strokeStyle = cMid;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      ctx.lineWidth = Math.max(1, w * 0.26); ctx.strokeStyle = cLit;
      ctx.beginPath(); ctx.moveTo(bx - w * 0.22, by); ctx.quadraticCurveTo(mx - w * 0.22, my, tx - w * 0.1, ty); ctx.stroke();
      ctx.lineCap = 'butt';
    };
    // ambient current: everything under water leans the same way and breathes
    const flowAt = (wx) => Math.sin(t * 0.55 + wx * 0.008) * 3.4 + Water.velocity(wx) * 0.035 + Water.wind * 4;
    // Biome tint for growing things. Nothing in a storm drain is the green of a
    // sawgrass prairie; the same weed painter has to read sickly down there and
    // lush out in the glades, so the palette is pulled toward the biome's own.
    const BP = Biome.mixPal(cam.x), fc = BP.flora, fk = BP.floraMix || 0;
    const fl = fc && fk > 0 ? (c) => mixColor(c, fc, fk) : (c) => c;
    const AO_W = { bush: 15, oak: 30, palm: 9, cypress: 12, mangrove: 20, fern: 9, sawgrass: 8, palmetto: 12,
      crate: 10, cooler: 9, firewood: 10, post: 4, stump: 9, log: 20, rock: 10, mushroom: 4, flower: 3, fallen: 20 };
    for (const d of this.decor) {
      if (d.x < left) continue; if (d.x > right) break;
      const [sx, sy] = cam.toScreen(d.x, d.y);
      // contact shadow first, under everything that stands on dry ground
      const aw = AO_W[d.type];
      if (aw && layer === (d.type === 'bush' || d.type === 'fern' || d.type === 'sawgrass' || d.type === 'flower' || d.type === 'mushroom' ? 1 : 0) && d.y < 6) {
        const w2 = aw * (d.s || 1) * z;
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#0a1008';
        ctx.fillRect(Math.round(sx - w2 * 0.5), Math.round(sy - z), Math.round(w2), Math.max(1, Math.round(1.8 * z)));
        ctx.fillRect(Math.round(sx - w2 * 0.34), Math.round(sy - 2 * z), Math.round(w2 * 0.68), Math.max(1, Math.round(2.4 * z)));
        ctx.globalAlpha = 1;
      }
      switch (d.type) {
        case 'seagrass': if (layer !== 0) break; {
          const fw = flowAt(d.x), dk = fl(d.v ? '#1f4a38' : '#26543f'), md = fl(d.v ? '#3f8a6a' : '#4f9a72'), lt = fl(d.v ? '#6fc79a' : '#7fd6a6');
          for (let b = -3; b <= 3; b++) {
            const bl = d.h * (0.66 + ihash(Math.floor(d.x) * 7 + b, 71) * 0.42);
            const sway = (Math.sin(t * 1.1 + d.ph + b * 0.5) * 4 + fw + (d.bend || 0) * 5) * z;
            const bx = sx + b * 2.1 * z, ty = sy - bl * z;
            blade(bx, sy, bx + sway, ty, bx + sway * 0.4, sy - bl * z * 0.55, 1.7 * z, dk, md, lt);
          }
          break; }
        case 'oyster': if (layer !== 0) break; {
          for (let i = 0; i < d.n; i++) { const ox = (ihash(i, Math.floor(d.x)) - 0.5) * 22 * z, oy = ihash(i, 61) * 4 * z;
            ctx.fillStyle = i % 2 ? '#8a8478' : '#6f6a5e'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - 4 * z - oy), Math.max(1, Math.round(3 * z)), Math.max(1, Math.round(5 * z)));
            ctx.fillStyle = '#b0aa9a'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - 4 * z - oy), Math.max(1, Math.round(z)), Math.max(1, Math.round(2 * z))); }
          break; }
        case 'coral': if (layer !== 0) break; {
          // branching stag coral. Three generations of tapering limbs, each
          // segment a chunky pixel block with a lit edge and a pale polyp tip.
          const CP = [['#8e3a52', '#c4566e', '#eb92a4'], ['#986a1e', '#cfa03a', '#f2d879'],
            ['#37678e', '#5a94bc', '#93c4e2'], ['#6d3474', '#a05aa8', '#d295d6']][d.v % 4];
          const s2 = d.s * z, seed = Math.floor(d.x), fl = flowAt(d.x) * 0.012;
          const limb = (bx, by, ang, len, w, gen) => {
            const steps = Math.max(2, Math.round(len / 2.4));
            let x0 = bx, y0 = by, a = ang;
            for (let i = 0; i < steps; i++) {
              a += (ihash(seed + gen * 37 + i, 17) - 0.5) * 0.26 + fl;
              const x1 = x0 + Math.sin(a) * 2.4 * s2, y1 = y0 - Math.cos(a) * 2.4 * s2;
              const ww = Math.max(1, Math.round(w * (1 - i / steps * 0.5) * s2));
              const top = Math.min(y0, y1), hh = Math.abs(y1 - y0) + 1.2 * s2;
              ctx.fillStyle = CP[0]; ctx.fillRect(Math.round((x0 + x1) / 2 - ww / 2), Math.round(top), ww, Math.max(1, Math.round(hh)));
              ctx.fillStyle = CP[1]; ctx.fillRect(Math.round((x0 + x1) / 2 - ww / 2), Math.round(top), Math.max(1, Math.round(ww * 0.45)), Math.max(1, Math.round(hh)));
              x0 = x1; y0 = y1;
            }
            ctx.fillStyle = CP[2];
            ctx.fillRect(Math.round(x0 - 0.9 * s2), Math.round(y0 - 1.4 * s2), Math.max(1, Math.round(1.9 * s2)), Math.max(1, Math.round(1.9 * s2)));
            if (gen < 2) {
              limb(x0, y0, ang - 0.46 - ihash(seed + gen, 23) * 0.34, len * 0.6, w * 0.72, gen + 1);
              limb(x0, y0, ang + 0.46 + ihash(seed + gen, 29) * 0.34, len * 0.56, w * 0.72, gen + 1);
            }
          };
          // rubble foot so it is rooted rather than floating on the sand
          ctx.fillStyle = '#7e7462'; ctx.fillRect(Math.round(sx - 4 * s2), Math.round(sy - 1.5 * s2), Math.round(8 * s2), Math.max(1, Math.round(2.5 * s2)));
          const trunks = 2 + (seed & 1);
          for (let k = 0; k < trunks; k++) limb(sx + (k - (trunks - 1) / 2) * 4 * s2, sy, (k - (trunks - 1) / 2) * 0.34, 13 + ihash(seed + k, 43) * 7, 3.2, 0);
          break; }
        case 'fan': if (layer !== 0) break; {
          // gorgonian sea fan: a stem, radiating ribs and cross-links, leaning
          // into the current and breathing with it
          const FP = [['#8a2f3e', '#c4515f', '#e0868f'], ['#7a4a18', '#b8842c', '#dcb35c'], ['#5a2f6a', '#8f4fa0', '#c087cf']][d.v % 3];
          const s2 = d.s * z, seed = Math.floor(d.x);
          const sway = (Math.sin(t * 0.8 + d.ph) * 0.1 + flowAt(d.x) * 0.02) * d.lean;
          const H = 22 * s2, base = 0.28 * d.lean + sway;
          ctx.save(); ctx.translate(sx, sy); ctx.rotate(base);
          ctx.fillStyle = FP[0]; ctx.fillRect(Math.round(-1 * s2), Math.round(-7 * s2), Math.max(1, Math.round(2.2 * s2)), Math.round(7.4 * s2));
          const RIBS = 7;
          for (let r0 = 0; r0 < RIBS; r0++) {
            const a0 = (r0 / (RIBS - 1) - 0.5) * 1.5;
            const rl = H * (0.62 + 0.38 * Math.cos(a0 * 1.1));
            let px0 = 0, py0 = -6 * s2;
            for (let i = 1; i <= 6; i++) {
              const u = i / 6, bend = a0 * (0.7 + u * 0.6);
              const px1 = Math.sin(bend) * rl * u, py1 = -6 * s2 - Math.cos(bend) * rl * u;
              ctx.fillStyle = i > 4 ? FP[2] : FP[1];
              ctx.fillRect(Math.round((px0 + px1) / 2 - 0.6 * s2), Math.round(Math.min(py0, py1)), Math.max(1, Math.round(1.4 * s2)), Math.max(1, Math.round(Math.abs(py1 - py0) + s2)));
              // web between neighbouring ribs
              if (r0 > 0 && i % 2 === 0) { ctx.fillStyle = FP[0]; ctx.globalAlpha = 0.65; ctx.fillRect(Math.round(px1 - 2.6 * s2), Math.round(py1), Math.max(1, Math.round(2.6 * s2)), Math.max(1, Math.round(s2))); ctx.globalAlpha = 1; }
              px0 = px1; py0 = py1;
            }
            ctx.fillStyle = FP[2]; ctx.fillRect(Math.round(px0 - 0.6 * s2), Math.round(py0 - s2), Math.max(1, Math.round(1.6 * s2)), Math.max(1, Math.round(1.6 * s2)));
          }
          ctx.restore();
          ctx.fillStyle = '#6e6a5c'; ctx.fillRect(Math.round(sx - 3 * s2), Math.round(sy - s2), Math.round(6 * s2), Math.max(1, Math.round(2 * s2)));
          break; }
        case 'sponge': if (layer !== 0) break; {
          // barrel sponges: thick mottled tubes with a dark mouth on top
          const SPP = [['#9a5a2a', '#c07a3a', '#5a3418'], ['#8a4a5a', '#b06a78', '#4a2430'], ['#6a7a3a', '#90a250', '#36401c']][d.v % 3];
          const s2 = d.s * z, seed = Math.floor(d.x);
          for (let i = 0; i < d.n; i++) {
            const ox = (ihash(i, seed) - 0.5) * 20 * s2;
            const hh = (9 + ihash(i, seed + 7) * 13) * s2, ww = (6 + ihash(i, seed + 11) * 4) * s2;
            const bx = sx + ox, top = sy - hh;
            ctx.fillStyle = SPP[0]; ctx.fillRect(Math.round(bx - ww / 2), Math.round(top), Math.round(ww), Math.round(hh + s2));
            ctx.fillStyle = SPP[1]; ctx.fillRect(Math.round(bx - ww / 2), Math.round(top), Math.max(1, Math.round(ww * 0.35)), Math.round(hh));
            // pitted surface
            for (let k = 0; k < 6; k++) { const px2 = bx - ww / 2 + ihash(k, seed + i * 3) * ww, py2 = top + 2 * s2 + ihash(k, seed + i * 5) * (hh - 3 * s2);
              ctx.fillStyle = SPP[2]; ctx.fillRect(Math.round(px2), Math.round(py2), Math.max(1, Math.round(s2)), Math.max(1, Math.round(s2))); }
            // mouth, breathing a slow exhalation
            ctx.fillStyle = SPP[2]; ctx.fillRect(Math.round(bx - ww * 0.32), Math.round(top), Math.round(ww * 0.64), Math.max(1, Math.round(2 * s2)));
            if (chance(0.01) && layer === 0) G.fx.add({ type: 'bubble', x: d.x + ox / z, y: d.y - hh / z, vx: 0, vy: -14, s: 0.7, seed: rand(TAU), life: 2 });
          }
          break; }
        case 'kelp': if (layer !== 0) break; {
          // a stipe that runs most of the way to the light, with blades down it
          const dk = fl(d.v ? '#2a4418' : '#33421c'), md = fl(d.v ? '#4a6e26' : '#567a2c'), lt = fl(d.v ? '#7ea84a' : '#8cb455');
          const fw = flowAt(d.x), top = sy - d.h * z;
          const swayTop = (Math.sin(t * 0.62 + d.ph) * 16 + fw * 2.2 + (d.bend || 0) * 8) * z;
          blade(sx, sy, sx + swayTop, top, sx + swayTop * 0.18, sy - d.h * z * 0.55, 2.4 * z, dk, md, lt);
          // broad ribbon blades, alternating down the stipe, each one a tapered
          // strap rather than a twig — a bare stalk reads as bamboo, not kelp
          const N = Math.max(4, Math.round(d.h / 17));
          for (let i = 1; i <= N; i++) {
            const u = i / (N + 1), bx = sx + swayTop * u * u, by = sy - d.h * z * u;
            const dir = i % 2 ? 1 : -1, bl = (17 + ihash(i, Math.floor(d.x)) * 15) * z * (0.6 + u * 0.6);
            const lean = Math.sin(t * 0.9 + d.ph + i) * 3 * z;
            const segs = 6, bh = (7 + ihash(i, 71) * 4) * z;
            for (let q = 0; q < segs; q++) {
              const uq = q / segs, taper = Math.sin((1 - uq) * 1.9) ;
              const bxq = bx + dir * bl * uq + lean * uq * uq;
              const byq = by - bl * 0.28 * uq + Math.sin(t * 1.1 + d.ph + i + uq * 2.4) * 2 * z * uq;
              ctx.fillStyle = q < 2 ? dk : md;
              ctx.fillRect(Math.round(bxq), Math.round(byq - bh * taper * 0.5), Math.max(1, Math.round(bl / segs + z)), Math.max(1, Math.round(bh * taper)));
              if (q > 0) { ctx.fillStyle = lt; ctx.fillRect(Math.round(bxq), Math.round(byq - bh * taper * 0.5), Math.max(1, Math.round(bl / segs + z)), Math.max(1, Math.round(z))); }
            }
            // gas bladder at the base of the blade
            ctx.fillStyle = dk; ctx.fillRect(Math.round(bx + dir * z), Math.round(by - 2 * z), Math.max(1, Math.round(2.4 * z)), Math.max(1, Math.round(3.4 * z)));
          }
          break; }
        case 'tubeworm': if (layer !== 0) break; {
          // vent worms: pale calcified tubes, red plumes that flinch back in
          const s2 = d.s * z, seed = Math.floor(d.x);
          for (let i = 0; i < d.n; i++) {
            const ox = (ihash(i, seed) - 0.5) * 26 * s2, hh = (10 + ihash(i, seed + 3) * 20) * s2;
            const lean = Math.sin(t * 0.4 + d.ph + i) * 1.6 * s2;
            const bx = sx + ox, top = sy - hh;
            ctx.fillStyle = '#b8b2a4'; ctx.fillRect(Math.round(bx - 1.6 * s2), Math.round(top), Math.max(1, Math.round(3.2 * s2)), Math.round(hh + s2));
            ctx.fillStyle = '#e0dccc'; ctx.fillRect(Math.round(bx - 1.6 * s2), Math.round(top), Math.max(1, Math.round(s2)), Math.round(hh));
            ctx.fillStyle = '#8a8478'; for (let k = 1; k * 4 * s2 < hh; k++) ctx.fillRect(Math.round(bx - 1.6 * s2), Math.round(top + k * 4 * s2), Math.max(1, Math.round(3.2 * s2)), Math.max(1, Math.round(s2)));
            // plume: out most of the time, snapped in on a slow cycle
            const out = 0.35 + 0.65 * clamp(Math.sin(t * 0.5 + d.ph + i * 1.7) * 2.2, 0, 1);
            const pl = 5 * s2 * out;
            if (pl > 0.6) {
              ctx.fillStyle = '#8e1c22'; ctx.fillRect(Math.round(bx - 1.8 * s2 + lean), Math.round(top - pl), Math.max(1, Math.round(3.6 * s2)), Math.max(1, Math.round(pl)));
              ctx.fillStyle = '#d8343a'; ctx.fillRect(Math.round(bx - 1.2 * s2 + lean), Math.round(top - pl), Math.max(1, Math.round(1.4 * s2)), Math.max(1, Math.round(pl * 0.8)));
              ctx.fillStyle = '#f06a6a'; ctx.fillRect(Math.round(bx - 2.2 * s2 + lean), Math.round(top - pl), Math.max(1, Math.round(s2)), Math.max(1, Math.round(s2)));
            }
          }
          break; }
        case 'trash': if (layer !== 0) break; {
          const s2 = d.s * z;
          if (d.v === 0) { ctx.fillStyle = '#3a5a8a'; ctx.fillRect(Math.round(sx - 3 * s2), Math.round(sy - 6 * s2), Math.round(6 * s2), Math.round(6 * s2)); ctx.fillStyle = '#6a8ac0'; ctx.fillRect(Math.round(sx - 3 * s2), Math.round(sy - 6 * s2), Math.round(2 * s2), Math.round(4 * s2)); }
          else if (d.v === 1) { ctx.fillStyle = '#8a3a2a'; ctx.fillRect(Math.round(sx - 5 * s2), Math.round(sy - 4 * s2), Math.round(10 * s2), Math.round(4 * s2)); ctx.fillStyle = '#b05a44'; ctx.fillRect(Math.round(sx - 5 * s2), Math.round(sy - 4 * s2), Math.round(10 * s2), Math.max(1, Math.round(s2))); }
          else if (d.v === 2) { ctx.fillStyle = '#c0c8c8'; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(sx - 4 * s2 + i * 2.5 * s2), Math.round(sy - 3 * s2 - ihash(i, 9) * 2 * s2), Math.max(1, Math.round(2 * s2)), Math.max(1, Math.round(3 * s2))); }
          else { Shape.blob(ctx, sx, sy - 4 * s2, 4 * s2, '#4a4a4a'); Shape.blob(ctx, sx, sy - 4 * s2, 2 * s2, '#6a6a6a'); }
          break; }
        case 'rubble': if (layer !== 0) break; {
          for (let i = 0; i < d.n; i++) { const ox = (ihash(i, Math.floor(d.x)) - 0.5) * 26 * z * d.s, hh = (3 + ihash(i, 71) * 5) * d.s * z;
            ctx.fillStyle = i % 2 ? '#6a6a64' : '#57574f'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - hh), Math.round(5 * d.s * z), Math.round(hh + z));
            ctx.fillStyle = '#83837a'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - hh), Math.round(5 * d.s * z), Math.max(1, Math.round(z))); }
          break; }
        case 'pipe': if (layer !== 0) break; {
          const s2 = d.s * z, w = 16 * s2, h = 11 * s2;
          ctx.fillStyle = '#5a5a54'; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h), Math.round(w), Math.round(h + z));
          ctx.fillStyle = '#74746c'; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h), Math.round(w), Math.max(1, Math.round(2 * z)));
          Shape.blob(ctx, sx + w / 2 - 2 * s2, sy - h / 2, 3 * s2, '#23231f', h * 0.42 / Math.max(0.5, 3 * s2));
          ctx.fillStyle = '#3a5a3a'; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h * 0.35), Math.round(w), Math.max(1, Math.round(2 * z)));
          break; }
        case 'knee': if (layer !== 0) break; {
          for (let i = 0; i < d.n; i++) { const ox = (ihash(i, Math.floor(d.x) + 3) - 0.5) * 30 * z, kh = (6 + ihash(i, 42) * 12) * d.s * z;
            ctx.fillStyle = '#5a4632'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - kh), Math.max(1, Math.round(4 * d.s * z)), Math.round(kh + z));
            ctx.fillStyle = '#3a2c1c'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - kh), Math.max(1, Math.round(z)), Math.round(kh));
            ctx.fillStyle = '#6f5a40'; ctx.fillRect(Math.round(sx + ox + z), Math.round(sy - kh), Math.max(1, Math.round(z)), Math.max(1, Math.round(2 * z))); }
          break; }
        case 'mushroom': if (layer !== 1) break; {
          const cols = d.c ? ['#d05a4a', '#f0f0e0'] : ['#c8a050', '#e8d8b0'];
          for (let i = 0; i < d.n; i++) { const ox = (ihash(i, Math.floor(d.x)) - 0.5) * 14 * z, hh = (3 + ihash(i, 8) * 3) * z;
            ctx.fillStyle = '#e0dcc8'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - hh), Math.max(1, Math.round(z)), Math.round(hh));
            ctx.fillStyle = cols[0]; ctx.fillRect(Math.round(sx + ox - 1.5 * z), Math.round(sy - hh - 2 * z), Math.round(4 * z), Math.round(2 * z));
            ctx.fillStyle = cols[1]; ctx.fillRect(Math.round(sx + ox - 0.5 * z), Math.round(sy - hh - 2 * z), Math.max(1, Math.round(z)), Math.max(1, Math.round(z))); }
          break; }
        case 'crate': if (layer !== 1) break; {
          const w = 13 * z, h = 11 * z, cols = ['#8a6a3a', '#6a5a3a', '#9a7a4a'][d.v % 3];
          ctx.fillStyle = cols; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h), Math.round(w), Math.round(h));
          ctx.fillStyle = shade(cols, 0.7); ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h * 0.55), Math.round(w), Math.max(1, Math.round(2 * z)));
          ctx.fillStyle = mixColor(cols, '#ffffff', 0.25); ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h), Math.round(w), Math.max(1, Math.round(z)));
          ctx.fillStyle = '#2a1e12'; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - z), Math.round(w), Math.max(1, Math.round(z)));
          break; }
        case 'post': if (layer !== 0) break; {
          const h = d.h * z; ctx.fillStyle = '#5a4632'; ctx.fillRect(Math.round(sx - 2 * z), Math.round(sy - h), Math.round(4 * z), Math.round(h + z));
          ctx.fillStyle = '#75603f'; ctx.fillRect(Math.round(sx - 2 * z), Math.round(sy - h), Math.max(1, Math.round(z)), Math.round(h));
          ctx.fillStyle = '#3a5a3a'; ctx.fillRect(Math.round(sx - 2 * z), Math.round(sy - h * 0.25), Math.round(4 * z), Math.max(1, Math.round(2 * z)));
          break; }
        case 'cooler': if (layer !== 1) break; {
          const w = 12 * z, h = 8 * z, c = d.v ? '#d8d8d0' : '#e04040';
          ctx.fillStyle = c; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h), Math.round(w), Math.round(h));
          ctx.fillStyle = '#f0f0e8'; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h), Math.round(w), Math.max(1, Math.round(2 * z)));
          ctx.fillStyle = shade(c, 0.7); ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - z), Math.round(w), Math.max(1, Math.round(z)));
          break; }
        case 'firewood': if (layer !== 1) break; {
          for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#5a4632' : '#6f5a40'; ctx.save(); ctx.translate(sx, sy - 2 * z - i * 2.5 * z); ctx.rotate((i - 1) * 0.35); ctx.fillRect(Math.round(-7 * z), 0, Math.round(14 * z), Math.max(1, Math.round(3 * z))); ctx.restore(); }
          break; }

        case 'weed': if (layer !== 0) break; {
          const fw = flowAt(d.x), dk = fl(d.v ? '#1b3f24' : '#25492a'), md = fl(d.v ? '#2f6a3a' : '#3f7a44'), lt = fl(d.v ? '#5f9c58' : '#6fae62');
          for (let b = -2; b <= 2; b++) {
            const bl = d.h * (0.6 + ihash(Math.floor(d.x) * 5 + b, 73) * 0.5);
            const sway = (Math.sin(t * 1.3 + d.ph + b) * 3.4 + fw * 0.8 + (d.bend || 0) * 5) * z;
            const bx = sx + b * 2 * z, ty = sy - bl * z;
            blade(bx, sy, bx + sway, ty, bx + sway * 0.4, sy - bl * z * 0.6, 1.4 * z, dk, md, lt);
            // a few leaflets so it is not a bare stalk
            if (b % 2 === 0) for (let q = 1; q <= 2; q++) { const u = q / 3, lx = bx + sway * u * u, ly = sy - bl * z * u; ctx.fillStyle = md; ctx.fillRect(Math.round(lx + (q % 2 ? 1 : -3) * z), Math.round(ly), Math.max(1, Math.round(2.4 * z)), Math.max(1, Math.round(z))); }
          }
          break; }
        case 'rock': if (layer !== 0) break; { const s = SPR.rock[d.v]; drawSpr(ctx, s, sx, sy - s.h * d.s * z * 0.5 + 1, 0, d.s * z, d.s * z); break; }
        case 'log': if (layer !== 0) break; { const s = SPR.log[0]; drawSpr(ctx, s, sx, sy - s.h * d.s * z * 0.5 + 1, 0, d.s * z, d.s * z); break; }
        case 'skull': if (layer !== 0) break; drawSpr(ctx, SPR.skull, sx, sy - 2 * z, 0, z, z); break;
        case 'lily': if (layer !== 1) break; { const s = SPR.lily[d.v]; const wy = cam.toScreen(d.x, this.surface(d.x))[1]; drawSpr(ctx, s, sx, wy - 1 * z, 0, z, z, s.w / 2, s.h - 1); break; }
        case 'reed': if (layer !== 0) break; {
          const top = cam.toScreen(d.x, d.top)[1]; const sway = (Math.sin(t * 1.1 + d.ph) * 3 + (d.bend || 0) * 4) * z;
          blade(sx, sy, sx + sway, top, sx + sway * 0.3, (sy + top) / 2, 1.8 * z, fl('#2a4a20'), fl('#4f7a3a'), fl('#7aa85a'));
          if (d.v) { ctx.fillStyle = '#6b4a2e'; ctx.fillRect(Math.round(sx + sway - z), Math.round(top - 8 * z), Math.max(1, Math.round(2 * z)), Math.max(2, Math.round(7 * z))); }
          else { ctx.strokeStyle = '#7fae5f'; ctx.beginPath(); ctx.moveTo(sx + sway, top); ctx.lineTo(sx + sway + 4 * z, top - 6 * z); ctx.stroke(); }
          break; }
        case 'sawgrass': if (layer !== 1) break; {
          ctx.strokeStyle = '#7a9a3a'; ctx.lineWidth = Math.max(1, z);
          for (let b = -2; b <= 2; b++) { const sway = (Math.sin(t * 1.6 + d.ph + b * 0.4) * 2 + (d.bend || 0) * 2.5) * z; ctx.beginPath(); ctx.moveTo(sx, sy + 1); ctx.lineTo(sx + b * 3 * z * d.s + sway, sy - (9 + Math.abs(b) * -1.5) * d.s * z); ctx.stroke(); }
          if (d.fly && night > 0.3) { // firefly
            const fx = sx + Math.sin(t * 0.9 + d.ph) * 14 * z, fy = sy - (14 + Math.sin(t * 1.7 + d.ph * 2) * 8) * z;
            const pulse = 0.5 + 0.5 * Math.sin(t * 3 + d.ph * 5);
            if (pulse > 0.35) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * pulse; ctx.fillStyle = '#e8ff60'; ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1); ctx.globalAlpha = night * pulse * 0.3; ctx.fillRect(Math.round(fx) - 1, Math.round(fy) - 1, 3, 3); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
          }
          break; }
        case 'palmetto': if (layer !== 1) break; {
          ctx.strokeStyle = '#3f7a3a'; ctx.lineWidth = Math.max(1, 1.5 * z);
          for (let b = -3; b <= 3; b++) { const sway = (Math.sin(t * 1.2 + d.ph) * 1.5 + (d.bend || 0) * 3) * z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + b * 4 * z * d.s + sway, sy - (16 - Math.abs(b) * 2.5) * d.s * z); ctx.stroke(); }
          break; }
        case 'duckweed': if (layer !== 1) break; {
          const wy = cam.toScreen(d.x, this.surface(d.x))[1], ww = d.w * z;
          const cols = ['#4f8a3a', '#5f9a44', '#3f7a30'];
          ctx.fillStyle = cols[d.v];
          for (let i = 0; i < ww; i += Math.max(1, Math.round(2 * z))) {
            const h = (1.6 + Math.sin(i * 0.7 + d.ph + t * 0.6) * 0.7) * z;
            ctx.fillRect(Math.round(sx - ww / 2 + i), Math.round(wy - h), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(h + z)));
          }
          ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(Math.round(sx - ww / 2), Math.round(wy - 2 * z), Math.round(ww), Math.max(1, Math.round(z)));
          break; }
        case 'hyacinth': if (layer !== 1) break; {
          const wy = cam.toScreen(d.x, this.surface(d.x))[1], sw = Math.sin(t * 0.7 + d.ph) * 1.5 * z;
          ctx.fillStyle = '#3f7a3a'; ctx.fillRect(Math.round(sx - 5 * d.s * z + sw), Math.round(wy - 2 * z), Math.round(10 * d.s * z), Math.max(1, Math.round(3 * z)));
          for (let b = -2; b <= 2; b++) {
            const bh = (7 - Math.abs(b) * 1.6) * d.s * z;
            ctx.fillStyle = b % 2 ? '#4f9a44' : '#5faa50';
            ctx.fillRect(Math.round(sx + b * 3.4 * d.s * z + sw), Math.round(wy - 2 * z - bh), Math.max(1, Math.round(3 * d.s * z)), Math.round(bh));
          }
          if (d.bloom) { ctx.fillStyle = '#b28ae0'; ctx.fillRect(Math.round(sx + sw - z), Math.round(wy - 13 * d.s * z), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(3 * z))); ctx.fillStyle = '#e0d060'; ctx.fillRect(Math.round(sx + sw - z), Math.round(wy - 13 * d.s * z), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(z))); }
          break; }
        case 'algae': if (layer !== 0) break; {
          ctx.strokeStyle = rgba(fl(d.v ? '#5a965a' : '#78aa6e'), d.v ? 0.5 : 0.42); ctx.lineWidth = Math.max(1, 2 * z);
          for (let b = -1; b <= 1; b++) {
            ctx.beginPath(); ctx.moveTo(sx + b * 3 * z, sy);
            for (let k = 1; k <= 4; k++) { const kk = k / 4, yy = sy - d.h * z * kk, xx = sx + b * 3 * z + Math.sin(t * 0.8 + d.ph + kk * 3) * 7 * z * kk; ctx.lineTo(xx, yy); }
            ctx.stroke();
          }
          break; }
        case 'sunkbranch': if (layer !== 0) break; {
          ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = Math.max(1, 3 * d.s * z);
          const f = d.flip ? -1 : 1;
          ctx.beginPath(); ctx.moveTo(sx - 16 * d.s * z, sy); ctx.quadraticCurveTo(sx, sy - 12 * d.s * z, sx + 18 * d.s * z * f, sy - 4 * d.s * z); ctx.stroke();
          ctx.lineWidth = Math.max(1, 1.6 * d.s * z);
          ctx.beginPath(); ctx.moveTo(sx + 2 * z, sy - 7 * d.s * z); ctx.lineTo(sx + 10 * d.s * z * f, sy - 18 * d.s * z); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx - 6 * z, sy - 5 * d.s * z); ctx.lineTo(sx - 14 * d.s * z, sy - 15 * d.s * z); ctx.stroke();
          break; }
        case 'shellbed': if (layer !== 0) break; {
          for (let i = 0; i < d.n; i++) {
            const ox = (ihash(i, Math.floor(d.x)) - 0.5) * 26 * z;
            ctx.fillStyle = i % 2 ? '#cfc6ad' : '#b3a98d';
            ctx.fillRect(Math.round(sx + ox), Math.round(sy - 2 * z), Math.max(1, Math.round(3 * z)), Math.max(1, Math.round(2 * z)));
            ctx.fillStyle = '#e6dfc9'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - 2 * z), Math.max(1, Math.round(z)), Math.max(1, Math.round(z)));
          }
          break; }
        case 'roots': if (layer !== 0) break; {
          ctx.strokeStyle = '#4a3524'; ctx.lineWidth = Math.max(1, 1.6 * z);
          for (let i = 0; i < d.n; i++) {
            const ox = (ihash(i, Math.floor(d.x) + 3) - 0.5) * 26 * z, len = d.len * (0.6 + ihash(i, 7) * 0.6) * z;
            ctx.beginPath(); ctx.moveTo(sx + ox, sy);
            ctx.quadraticCurveTo(sx + ox + Math.sin(t * 0.5 + i) * 4 * z, sy + len * 0.6, sx + ox + (ihash(i, 9) - 0.5) * 14 * z, sy + len);
            ctx.stroke();
          }
          break; }
        case 'vine': if (layer !== 0) break; {
          const top = cam.toScreen(d.x, d.y - d.h)[1];
          ctx.strokeStyle = '#4a6a34'; ctx.lineWidth = Math.max(1, z);
          ctx.beginPath(); ctx.moveTo(sx, top);
          for (let k = 1; k <= 5; k++) { const kk = k / 5; ctx.lineTo(sx + Math.sin(t * 0.6 + d.ph + kk * 4) * 5 * z * kk, lerp(top, sy, kk)); }
          ctx.stroke();
          ctx.fillStyle = '#5f8a3a';
          for (let k = 1; k <= 4; k++) { const kk = k / 5, vy = lerp(top, sy, kk), vx = sx + Math.sin(t * 0.6 + d.ph + kk * 4) * 5 * z * kk; ctx.fillRect(Math.round(vx + 2 * z), Math.round(vy), Math.max(1, Math.round(3 * z)), Math.max(1, Math.round(2 * z))); }
          break; }
        case 'cattail': if (layer !== 1) break; {
          const top = cam.toScreen(d.x, d.top)[1], sway = (Math.sin(t * 1.3 + d.ph) * 3 + (d.bend || 0) * 4) * z;
          ctx.strokeStyle = '#5a7a3a'; ctx.lineWidth = Math.max(1, z); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sway * 0.4, (sy + top) / 2, sx + sway, top); ctx.stroke();
          ctx.fillStyle = '#5a3a20'; ctx.fillRect(Math.round(sx + sway - z * 0.5), Math.round(top - 1), Math.max(1, Math.round(1.6 * z)), Math.max(2, Math.round(8 * z)));
          break; }
        case 'fern': if (layer !== 1) break; {
          ctx.strokeStyle = '#3f6a2a'; ctx.lineWidth = Math.max(1, z);
          for (let b = -2; b <= 2; b++) { const sway = (Math.sin(t * 1.4 + d.ph + b) * 1.5 + (d.bend || 0) * 3) * z, len = (13 - Math.abs(b) * 2) * d.s * z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + b * 4 * z + sway, sy - len * 0.7, sx + b * 7 * z + sway, sy - len); ctx.stroke(); }
          break; }
        case 'bush': if (layer !== 1) break; {
          const bw = Math.round(17 * d.s), bh = Math.round(13 * d.s);
          const cv = Leaf.mass(bw, bh, '#1f3d17', '#336126', '#5c9440', d.v * 7 + bw);
          // a few twigs poking out of the base
          ctx.fillStyle = '#3a2c1c';
          for (let i = 0; i < 3; i++) { const ox = (ihash(d.v * 5 + i, 61) - 0.5) * bw * z * 0.7; ctx.fillRect(Math.round(sx + ox), Math.round(sy - 3 * z), Math.max(1, Math.round(z)), Math.round(3 * z)); }
          Leaf.draw(ctx, cv, sx, sy - bh * z * 0.5, z);
          ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(Math.round(sx - bw * z * 0.5), Math.round(sy - z), Math.round(bw * z), Math.max(1, Math.round(1.6 * z)));
          break; }
        case 'flower': if (layer !== 1) break; {
          const cols = ['#e8d84a', '#e87ab0', '#f0f0e0', '#c880e8'];
          ctx.strokeStyle = '#4a7a3a'; ctx.lineWidth = Math.max(1, z); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.sin(t + d.c) * z, sy - 8 * z); ctx.stroke();
          ctx.fillStyle = cols[d.c]; ctx.fillRect(Math.round(sx - z), Math.round(sy - 10 * z), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(2 * z)));
          break; }
        case 'fallen': if (layer !== 0) break; {
          const w = 34 * d.s * z, h = 7 * d.s * z;
          ctx.save(); ctx.translate(sx, sy); ctx.rotate((d.flip ? -1 : 1) * 0.12);
          ctx.fillStyle = '#4a3524'; ctx.fillRect(Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h));
          ctx.fillStyle = '#6b5033'; ctx.fillRect(Math.round(-w / 2), Math.round(-h), Math.round(w), Math.max(1, Math.round(h * 0.35)));
          ctx.fillStyle = '#3a5a2a'; for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(-w / 2 + i * w / 5), Math.round(-h - z), Math.max(1, Math.round(3 * z)), Math.max(1, Math.round(z)));
          ctx.restore(); break; }
        case 'palm': if (layer !== 0) break; {
          const h = d.h * z, tw = Math.max(1, 3 * z), sway = Math.sin(t * 0.8 + d.ph) * 3 * z;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#4a3d24'; ctx.lineWidth = tw; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sway * 0.5, sy - h * 0.6, sx + sway, sy - h); ctx.stroke();
          ctx.strokeStyle = '#7a6842'; ctx.lineWidth = Math.max(1, tw * 0.55); ctx.beginPath(); ctx.moveTo(sx - tw * 0.2, sy); ctx.quadraticCurveTo(sx + sway * 0.5 - tw * 0.2, sy - h * 0.6, sx + sway - tw * 0.2, sy - h); ctx.stroke();
          ctx.lineCap = 'butt';
          // leaf scars ringing the trunk
          ctx.fillStyle = '#3a2f1c';
          for (let i = 0; i < 10; i++) { const u = i / 10; ctx.fillRect(Math.round(sx + sway * u * u - tw / 2), Math.round(sy - h * u), Math.round(tw), Math.max(1, Math.round(z * 0.7))); }
          for (let b = 0; b < 7; b++) {
            const a = -Math.PI * 0.95 + b * 0.32, len = (16 + (b % 2) * 7) * z;
            ctx.strokeStyle = b % 2 ? '#3f7a3a' : '#356a30'; ctx.lineWidth = Math.max(1, 2.4 * z);
            ctx.beginPath(); ctx.moveTo(sx + sway, sy - h); ctx.quadraticCurveTo(sx + sway + Math.cos(a) * len * 0.7, sy - h + Math.sin(a) * len * 0.7, sx + sway + Math.cos(a) * len, sy - h + Math.sin(a) * len + 9 * z); ctx.stroke();
          }
          if (d.v === 0) { ctx.fillStyle = '#8a6a2a'; ctx.fillRect(Math.round(sx + sway - 2 * z), Math.round(sy - h + 2 * z), Math.max(1, Math.round(4 * z)), Math.max(1, Math.round(3 * z))); }
          break; }
        case 'oak': if (layer !== 0) break; {
          const h = d.h * z, tw = Math.max(1, 5 * z);
          ctx.fillStyle = '#3a2a1c'; ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - h), Math.round(tw), Math.round(h + 2));
          ctx.fillStyle = '#4a3a26'; ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - h), Math.max(1, Math.round(tw * 0.4)), Math.round(h));
          ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = Math.max(1, 2 * z);
          for (const bd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx, sy - h * 0.6); ctx.quadraticCurveTo(sx + bd * 14 * z, sy - h * 0.75, sx + bd * 22 * z, sy - h * 0.95); ctx.stroke(); }
          for (let i = 0; i < 5; i++) {
            const cx2 = sx + (ihash(d.v * 9 + i, 31) - 0.5) * 44 * z, cy2 = sy - h - (ihash(i, 32) - 0.35) * 14 * z;
            const mw = Math.round((20 + ihash(i, 33) * 16) / 4) * 4;
            Leaf.draw(ctx, Leaf.mass(mw, Math.round(mw * 0.72), '#1d3a19', '#2f5a2a', '#598f3e', d.v * 13 + i), cx2, cy2, z);
          }
          if (d.moss) { ctx.fillStyle = '#93a077'; for (let j = 0; j < 6; j++) { const mx = sx + (ihash(d.v * 5 + j, 34) - 0.5) * 46 * z; ctx.fillRect(Math.round(mx), Math.round(sy - h + 2 * z), Math.max(1, Math.round(z)), Math.round((10 + ihash(j, 35) * 20) * z)); } }
          break; }
        case 'cypress': if (layer !== 0) break; {
          const h = d.h * z, tw = 4 * z; if (d.shake) { ctx.save(); ctx.translate(Math.sin(t * 40) * d.shake * 2 * z, 0); }
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - h), Math.round(tw), Math.round(h + 2));
          ctx.fillRect(Math.round(sx - tw * 1.5), Math.round(sy - 8 * z), Math.round(tw * 3), Math.round(8 * z)); // buttress
          ctx.fillStyle = '#2a1e12'; ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - h), Math.max(1, Math.round(z)), Math.round(h));
          for (let j = 0; j < 5; j++) {
            const cw = Math.round((30 - j * 5) * (0.8 + ihash(d.v * 7 + j, 3) * 0.5) / 3) * 3, cy = sy - h * (0.4 + j * 0.15);
            Leaf.draw(ctx, Leaf.mass(Math.max(6, cw), Math.max(4, Math.round(cw * 0.42)), '#1b361a', '#2f5a2a', '#4f8437', d.v * 3 + j), sx, cy, z);
          }
          if (d.knees) { ctx.fillStyle = '#4a3a26'; for (let j = 0; j < 4; j++) { const kx = sx + (ihash(d.v * 3 + j, 41) - 0.5) * 34 * z, kh = (5 + ihash(j, 42) * 9) * z; ctx.fillRect(Math.round(kx), Math.round(sy - kh), Math.max(1, Math.round(3 * z)), Math.round(kh)); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(Math.round(kx), Math.round(sy - kh), Math.max(1, Math.round(z)), Math.round(kh)); ctx.fillStyle = '#4a3a26'; } }
          if (d.moss) { ctx.fillStyle = '#8a9a6a'; for (let j = 0; j < 4; j++) { const mx = sx + (ihash(d.v * 11 + j, 4) - 0.5) * 26 * z, my = sy - h * (0.5 + ihash(j, 5) * 0.3); ctx.fillRect(Math.round(mx), Math.round(my), Math.max(1, Math.round(z)), Math.round((8 + ihash(j, 6) * 12) * z)); } }
          if (d.shake) ctx.restore();
          break; }
        case 'stump': if (layer !== 0) break; ctx.fillStyle = '#4a3524'; ctx.fillRect(Math.round(sx - 4 * z), Math.round(sy - 8 * z), Math.round(8 * z), Math.round(9 * z)); ctx.fillStyle = '#6b5a3a'; ctx.fillRect(Math.round(sx - 3 * z), Math.round(sy - 8 * z), Math.round(6 * z), Math.max(1, Math.round(z))); break;
        case 'mangrove': if (layer !== 0) break; {
          ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = Math.max(1, 2 * z);
          const top = sy - 30 * d.s * z;
          for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(sx + j * 2 * z, top); ctx.quadraticCurveTo(sx + j * 12 * d.s * z, top + 14 * z, sx + j * 16 * d.s * z + d.dir * 6 * z, sy + 12 * z); ctx.stroke(); }
          const mw2 = Math.round(38 * d.s);
          Leaf.draw(ctx, Leaf.mass(mw2, Math.round(mw2 * 0.55), '#1b3d22', '#2f6a34', '#55a04a', d.v * 17 + 5), sx, top - 10 * z, z);
          break; }
      }
    }
  },
  drawSurface(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom, sc = this.skyColors(day), light = this.light(day);
    const hy0 = cam.toScreen(0, 0)[1];
    if (hy0 < -160 || hy0 > H + 160) return;
    const B = Biome.mixPal(cam.x);
    // exactly the columns the water body was filled with, so the trim can never
    // sit off the edge it is trimming
    const T = this.waterTop(cam), step = T.step, xs = T.xs, ys = T.ys, wxs = T.wxs, wet = T.wet, n = T.n;

    // --- shallow tint under the film, fading out with depth
    {
      const yB = cam.toScreen(0, 120)[1];
      const tc = hexToRgb(mixColor(B.water[0], '#06222c', 0.4));
      const yTmin = Math.max(0, Math.round(hy0) - 40);
      if (yB > yTmin) {
        const gg = ctx.createLinearGradient(0, yTmin, 0, yB);
        gg.addColorStop(0, `rgba(${tc[0]},${tc[1]},${tc[2]},0.16)`);
        gg.addColorStop(1, `rgba(${tc[0]},${tc[1]},${tc[2]},0.03)`);
        ctx.fillStyle = gg;
        for (let i = 0; i < n; i++) { if (!wet[i]) continue; const y = Math.max(0, ys[i]); if (y < yB) ctx.fillRect(xs[i], y, step, Math.min(H, yB) - y); }
      }
    }

    const px = Math.max(1, Math.round(z));                       // one "art pixel" at this zoom
    const foam = mixColor('#eafcf6', B.water[0], 0.14);
    const skin = mixColor(B.water[0], '#e8fbf4', 0.58);          // the lit film on the water's back
    const face = mixColor(B.water[0], '#04181f', 0.62);          // the shaded front of a wave
    const deepLip = mixColor(B.water[1] || B.water[0], '#04161c', 0.5);

    // --- The surface itself. Crest and trough are judged against a smoothed
    // baseline of the visible span rather than screen-space curvature: the
    // screen ys are rounded to integers, so at low zoom curvature is mostly
    // quantisation noise and the whole waterline lights up as foam.
    let mean = 0, cnt = 0;
    for (let i = 0; i < n; i++) if (wet[i]) { mean += T.sus[i]; cnt++; }
    if (!cnt) return;
    mean /= cnt;
    let amp = 0;
    for (let i = 0; i < n; i++) if (wet[i]) { const d = T.sus[i] - mean; amp += d * d; }
    amp = Math.sqrt(amp / cnt);
    const norm = Math.max(0.9, amp * 1.35), h = step / Math.max(0.05, z);
    for (let i = 1; i < n - 1; i++) {
      if (!wet[i]) continue;
      const sx = xs[i], sy = ys[i];
      if (sy < -24 || sy > H + 24) continue;
      // world-space, so nothing here depends on the zoom
      const rel = (mean - T.sus[i]) / norm;              // + above the mean, - below
      const slope = (T.sus[i + 1] - T.sus[i - 1]) / (2 * h);   // + falling to the right
      const crest = clamp(rel, 0, 1), trough = clamp(-rel, 0, 1);
      const steep = clamp(Math.abs(slope) * 2.6, 0, 1);
      // key light comes from up and to the left: the back of a wave catches it
      const lit = clamp(slope * 3.2, 0, 1), shade2 = clamp(-slope * 3.2, 0, 1);

      // body skin: lighter water hugging the top edge, brightest on the backs
      ctx.globalAlpha = 0.6 + lit * 0.4;
      ctx.fillStyle = mixColor(skin, foam, lit * 0.5);
      ctx.fillRect(sx, sy, step, px * 2);
      // the shaded face, pushed a little deeper
      if (shade2 > 0.08) {
        ctx.globalAlpha = 0.62 * shade2;
        ctx.fillStyle = face;
        ctx.fillRect(sx, sy + px, step, px * 4);
      }
      // the film line on top
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = mixColor(sc.bot, foam, 0.4 + lit * 0.45);
      ctx.fillRect(sx, sy - px, step, px);
      // crest cap: foam on the tops of waves, more of it the steeper they are
      const cap = crest * (0.35 + steep * 0.95);
      if (cap > 0.3) {
        ctx.globalAlpha = clamp((cap - 0.25) * 1.6, 0, 1);
        ctx.fillStyle = foam;
        ctx.fillRect(sx, sy - px * 2, step, px * 2);
        if (cap > 0.72) { ctx.globalAlpha = clamp((cap - 0.68) * 2.4, 0, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy - px * 3, step, px); }
      }
      // troughs read darker, which is what gives the swell its volume
      if (trough > 0.25) { ctx.globalAlpha = 0.45 * trough; ctx.fillStyle = deepLip; ctx.fillRect(sx, sy, step, px * 5); }
      ctx.globalAlpha = 1;
    }

    // --- breaking crests: white caps where the surface is moving fast or is
    // very steep, drawn as blocks rather than circles to stay in the palette
    for (let i = 1; i < n - 1; i++) {
      if (!wet[i]) continue;
      const wx = wxs[i], vv = Math.abs(Water.velocity(wx));
      const sl = Math.abs((T.sus[i + 1] - T.sus[i - 1]) / (2 * (step / Math.max(0.05, z))));
      const f = clamp((vv - 26) / 70, 0, 1) + clamp((sl - 0.42) / 0.9, 0, 1);
      if (f <= 0.14) continue;
      const sy = ys[i], w = Math.max(1, Math.round((1 + f * 2) * px));
      ctx.globalAlpha = clamp(f, 0, 1) * 0.9; ctx.fillStyle = '#f4fffb';
      ctx.fillRect(xs[i], sy - w, step, w);
      if (f > 0.8) { ctx.globalAlpha = clamp(f - 0.6, 0, 1) * 0.85; ctx.fillRect(xs[i] - step, sy - w - px, step * 3, px); }
      ctx.globalAlpha = 1;
    }

    // --- scum and pollen riding the film
    ctx.globalAlpha = 0.2; ctx.fillStyle = B.scum || '#6a7a4a';
    for (let i = 0; i < n; i += 2) { if (!wet[i]) continue; const wx = wxs[i]; if (ihash(Math.floor(wx / 7), 44) > 0.74) ctx.fillRect(xs[i], ys[i] + px, step, px); }
    ctx.globalAlpha = 1;

    // --- pollen drifting in the air over the water
    if (light > 0.15) {
      ctx.globalAlpha = 0.28 * light; ctx.fillStyle = '#f4ecc0';
      for (let i = 0; i < 22; i++) {
        const wx = cam.x + ((ihash(i, 80) * 800 - 400) + this.t * (4 + ihash(i, 81) * 6)) % 800;
        const wy = -6 - ihash(i, 82) * 40 + Math.sin(this.t * 1.2 + i) * 4;
        const [px2, py2] = cam.toScreen(wx, wy);
        if (px2 < 0 || px2 > W || py2 < 0 || py2 > H) continue;
        ctx.fillRect(Math.round(px2), Math.round(py2), 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    // --- sun glitter, only on the backs of waves that face the light
    if (light > 0.2) {
      ctx.fillStyle = '#ffffff';
      for (let i = 1; i < n - 1; i += 2) {
        if (!wet[i]) continue;
        const slope = (T.sus[i + 1] - T.sus[i - 1]) / (2 * (step / Math.max(0.05, z)));
        if (slope < 0.08) continue;
        const wx = wxs[i];
        if (ihash(Math.floor(wx / 5), 21) > 0.22) continue;
        if (Math.sin(this.t * 5 + wx * 0.19) < 0.3) continue;
        ctx.globalAlpha = 0.85 * light;
        ctx.fillRect(xs[i], ys[i] - px * 2, px, px);
      }
      ctx.globalAlpha = 1;
    }
  },
  drawMist(ctx, cam, day) {
    const W = G.W, H = G.H, hy = cam.toScreen(0, 0)[1];
    // mist gathers at dawn and after sundown
    const m = Math.max(smoothstep(0.02, 0.10, day) * (1 - smoothstep(0.14, 0.24, day)), smoothstep(0.46, 0.56, day) * (1 - smoothstep(0.62, 0.76, day)));
    if (m < 0.02 || hy < -40 || hy > H + 40) return;
    for (let k = 0; k < 3; k++) {
      const band = hy - 6 - k * 9 * cam.zoom, drift = (cam.x * (0.35 + k * 0.2) + this.t * (6 + k * 4));
      ctx.globalAlpha = m * (0.30 - k * 0.06);
      ctx.fillStyle = k === 0 ? '#e8f4f0' : '#cfe2de';
      for (let sx = -40; sx < W + 40; sx += 8) {
        const n = fbm((sx + drift) * 0.012, 90 + k * 13, 2);
        const h = (6 + n * 20) * cam.zoom;
        ctx.fillRect(sx, Math.round(band - h), 8, Math.round(h));
      }
    }
    ctx.globalAlpha = 1;
  },
  drawNight(ctx, cam, day) {
    const night = 1 - this.light(day);
    if (night > 0.02) { ctx.fillStyle = `rgba(4,8,26,${(night * 0.55).toFixed(3)})`; ctx.fillRect(0, 0, G.W, G.H); }
  },
};
