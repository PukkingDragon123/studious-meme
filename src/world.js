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
    return r;
  },
  // Anywhere with a roof over it is indoors, however low that roof is: a
  // squeeze with the crown a hand above the water is still under the city.
  isIndoor(x) { const r = this.roofY(x); if (r === null) return false; const B = Biome.at(x); return !!B.indoor || r < -20; },
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
    Biome.authored(x0, x1, decor);
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
    // a camera that has gone non-finite for a frame (a teleport, a bad spawn)
    // used to throw out of the gradient and leave the backdrop unpainted
    const hy0 = cam.toScreen(0, 0)[1];
    const hy = isFinite(hy0) ? clamp(hy0, -4000, 4000) : H * 0.4;
    ctx.fillStyle = sc.bot; ctx.fillRect(0, 0, W, H);
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
    // In the open, water is the world below the line and there is nothing
    // behind it. In a pipe there is a pipe behind it, and hiding the pipe is
    // what made the system read as a wall with a pond in front of it.
    if (this.isIndoor(cam.x)) ctx.globalAlpha = 0.7;
    ctx.fillRect(0, y0, W, H - y0 + 2);
    ctx.globalAlpha = 1;
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
    const rays = roofed ? 2 : 6, rayCol = roofed ? [255, 226, 150] : [215, 255, 240];
    const rayLen = roofed ? 0.45 : 1, rayA = roofed ? 0.28 : 1;
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
  // Under a roof the ground is not ground. It is poured concrete and laid
  // brick: a flat invert, ledges with a formwork edge, courses of block down
  // the face of every step, and nothing that looks like a hillside.
  drawBuiltGround(ctx, cam) {
    const W = G.W, H = G.H, z = cam.zoom, BP = Biome.mixPal(cam.x), B = Biome.at(cam.x), step = 3;
    const pts = [];
    for (let sx = -step; sx <= W + step; sx += step) { const wx = cam.toWorldX(sx); pts.push([sx, cam.toScreen(wx, this.floorY(wx))[1], wx]); }
    const last = pts.length - 1;
    const cap = (off) => { ctx.beginPath(); ctx.moveTo(pts[0][0], H + 30); for (const p of pts) ctx.lineTo(p[0], p[1] + off); ctx.lineTo(pts[last][0], H + 30); ctx.closePath(); };
    const g0 = BP.ground[0], g1 = BP.ground[1], g2 = BP.ground[2];
    // the mass: one flat concrete tone, darker with depth in two hard steps
    cap(0); ctx.fillStyle = B.lab ? '#2c3438' : mixColor(g1, '#000000', 0.1); ctx.fill();
    cap(28 * z); ctx.fillStyle = B.lab ? '#232a2e' : mixColor(g1, '#000000', 0.3); ctx.fill();
    cap(90 * z); ctx.fillStyle = B.lab ? '#1a2024' : mixColor(g2, '#000000', 0.12); ctx.fill();
    // Under the invert is the same masonry the bore is lined with, so the
    // ground and the wall are one building instead of two textures meeting.
    if (!B.lab && typeof Sewer !== 'undefined' && Sewer.styleOf(B)) {
      ctx.save(); cap(0); ctx.clip();
      const SP2 = Sewer.pal(BP, Sewer.styleOf(B));
      ctx.fillStyle = mixColor(SP2.face, SP2.void, 0.3); ctx.fillRect(0, 0, W, H);
      Sewer.masonry(ctx, cam, SP2, Sewer.styleOf(B), 1, 0.85);
      // and it goes dark with depth, because you are looking into the invert
      const gg = ctx.createLinearGradient(0, 0, 0, H);
      gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,0.62)');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // brick or block courses down the face of the ground, locked to the world
    ctx.save(); cap(2 * z); ctx.clip();
    const brick = B.roman ? Tex.get('brick|r|' + g2, 32, (x, S) => {
      x.fillStyle = shade(g2, 0.55); x.globalAlpha = 0.5;
      for (let y = 0; y < S; y += 8) { x.fillRect(0, y, S, 1); const off = (y / 8) % 2 ? 8 : 0; for (let xx = off; xx < S; xx += 16) x.fillRect(xx, y, 1, 8); }
      x.globalAlpha = 0.18; x.fillStyle = '#ffffff'; for (let y = 1; y < S; y += 8) x.fillRect(0, y, S, 1);
      x.globalAlpha = 1;
    }) : Tex.get('brick|c|' + g2 + (B.lab ? 'L' : ''), 48, (x, S) => {
      x.fillStyle = shade(g2, 0.5); x.globalAlpha = 0.45;
      for (let y = 0; y < S; y += 12) { x.fillRect(0, y, S, 1); const off = (y / 12) % 2 ? 12 : 0; for (let xx = off; xx < S; xx += 24) x.fillRect(xx, y, 1, 12); }
      x.globalAlpha = 0.14; x.fillStyle = '#ffffff'; for (let y = 1; y < S; y += 12) x.fillRect(0, y, S, 1);
      x.globalAlpha = 1;
    });
    Tex.fill(ctx, brick, cam.x, cam.y, z, 0.9);
    ctx.restore();
    // the lip: a lit edge along the top of every surface, dark below it, and
    // a formwork line where a ledge steps
    for (let i = 0; i < pts.length; i++) {
      const [sx, sy] = pts[i];
      if (sy < -20 || sy > H + 10) continue;
      ctx.fillStyle = B.lab ? '#5a666c' : mixColor(g0, '#ffffff', 0.18); ctx.fillRect(sx, Math.round(sy), step, Math.max(1, Math.round(1.6 * z)));
      ctx.fillStyle = B.lab ? '#3a4448' : shade(g0, 0.7); ctx.fillRect(sx, Math.round(sy + 1.6 * z), step, Math.max(1, Math.round(1.4 * z)));
      // a vertical face where the floor jumps: draw the drop as blockwork with a coping
      if (i > 0) { const dy = sy - pts[i - 1][1]; if (Math.abs(dy) > 6 * z) { const top = Math.min(sy, pts[i - 1][1]); ctx.fillStyle = shade(g1, 0.7); ctx.fillRect(sx - 1, Math.round(top), 2, Math.round(Math.abs(dy))); ctx.fillStyle = mixColor(g0, '#ffffff', 0.22); ctx.fillRect(sx - 1, Math.round(top), 2, Math.max(1, Math.round(2 * z))); } }
    }
    // under the crown of a pipe the ground below the invert is fill too, and
    // the invert itself is a benched channel with the wash running down it
    if (B.pipe) {
      ctx.save(); cap(13 * z); ctx.clip(); this.buriedGround(ctx, cam); ctx.restore();
      this.pipeLining(ctx, cam, 1);
      ctx.save(); cap(0); ctx.beginPath();
      ctx.moveTo(pts[0][0], H + 30); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.lineTo(pts[last][0], H + 30); ctx.closePath(); ctx.clip();
      for (let i = 0; i < pts.length; i++) {
        const [sx, sy, wx] = pts[i];
        // the channel: a wet strip down the middle, benches either side of it
        ctx.fillStyle = '#2e3a38'; ctx.fillRect(sx, Math.round(sy), step, Math.ceil(7 * z));
        ctx.fillStyle = '#3d5450'; ctx.fillRect(sx, Math.round(sy + 1 * z), step, Math.max(1, Math.round(2 * z)));
        if (((wx % 26) + 26) % 26 < 3) { ctx.fillStyle = '#22292c'; ctx.fillRect(sx, Math.round(sy), Math.max(1, Math.round(1.6 * z)), Math.ceil(13 * z)); }
      }
      ctx.restore();
    }
    // in the lab the floor is tiled, with a painted line and a drain grate now and then
    if (B.lab) {
      ctx.save(); cap(0); ctx.clip();
      const tile = Tex.get('labtile', 24, (x, S) => { x.fillStyle = '#39454a'; x.fillRect(0, 0, S, S); x.fillStyle = '#2a3438'; x.fillRect(0, 0, S, 1); x.fillRect(0, 0, 1, S); x.fillRect(12, 0, 1, S); x.fillRect(0, 12, S, 1); x.fillStyle = '#44525a'; x.fillRect(1, 1, 5, 1); });
      ctx.globalAlpha = 1; Tex.fill(ctx, tile, cam.x, cam.y, z, 1);
      ctx.restore();
      // and under the tile a slab, not more tile: this is what you see when
      // the floor ends and you are looking at the edge of it
      cap(12 * z); ctx.fillStyle = '#7d8388'; ctx.fill();
      cap(15 * z); ctx.fillStyle = '#5c6469'; ctx.fill();
      cap(34 * z); ctx.fillStyle = '#2b3236'; ctx.fill();
      cap(38 * z); ctx.fillStyle = '#12171a'; ctx.fill();
      // Under the slab is not more slab: it is the void the building runs its
      // services through, and you are about to drop through it.
      ctx.save(); cap(38 * z); ctx.clip();
      const void1 = Tex.get('fbvoid', 64, (x, S) => {
        x.fillStyle = '#12171a'; x.fillRect(0, 0, S, S);
        for (let i = 0; i < 60; i++) { const gx = ihash(i, 31) * S, gy = ihash(i, 32) * S; x.fillStyle = ihash(i, 33) > 0.5 ? 'rgba(90,104,108,0.28)' : 'rgba(20,26,28,0.6)'; x.fillRect(gx | 0, gy | 0, 2, 1); }
      });
      Tex.fill(ctx, void1, cam.x, cam.y, z, 1);
      for (let i = 0; i < pts.length; i += 1) {
        const [sx, sy, wx] = pts[i];
        const m = ((wx % 90) + 90) % 90;
        if (m < 10) { ctx.fillStyle = '#2a3338'; ctx.fillRect(sx, Math.round(sy + 38 * z), step, Math.round(80 * z)); ctx.fillStyle = '#3b464c'; ctx.fillRect(sx, Math.round(sy + 38 * z), Math.max(1, Math.round(2 * z)), Math.round(80 * z)); }
      }
      // two service runs below the slab, one of them dripping
      for (const [d, col, hi] of [[22, '#454f54', '#616d73'], [40, '#3a4a44', '#54685f']]) {
        for (let i = 0; i < pts.length; i += 1) { const [sx, sy] = pts[i]; ctx.fillStyle = col; ctx.fillRect(sx, Math.round(sy + (38 + d) * z), step, Math.round(9 * z)); ctx.fillStyle = hi; ctx.fillRect(sx, Math.round(sy + (38 + d) * z), step, Math.max(1, Math.round(2 * z))); }
      }
      ctx.restore();
      if (chance(0.05)) { const wx = cam.toWorldX(rand(0, W)); G.fx.add({ type: 'drop', x: wx, y: this.floorY(wx) + 48, vx: 0, vy: 60, s: 1, color: '#7f9a92', life: 2 }); }
      for (let i = 0; i < pts.length; i += 1) { const [sx, sy, wx] = pts[i]; if (Math.abs(wx % 60) < 34) { ctx.fillStyle = '#8a7a20'; ctx.fillRect(sx, Math.round(sy + 4 * z), step, Math.max(1, Math.round(1.6 * z))); } }
    }
    if (B.lab || B.pipe) Facility.drawFloor(ctx, cam);
  },
  drawTerrain(ctx, cam) {
    if (this.isIndoor(cam.x)) { this.drawBuiltGround(ctx, cam); return; }
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
  // The made ground a pipe is buried in. Above the crown and below the invert
  // there is no rock: there is fill, in courses, with two thousand years of
  // other people's work laid through it — clay drains, brick footings, a duct
  // bank, a gas main somebody abandoned. Drawn into whatever is clipped.
  buriedGround(ctx, cam) {
    const W = G.W, H = G.H, z = cam.zoom;
    ctx.fillStyle = '#1d1c1a'; ctx.fillRect(0, 0, W, H);
    const band = 17, leftW = cam.toWorldX(-60), rightW = cam.toWorldX(W + 60);
    const wy0 = cam.toWorld(0, -20)[1], wy1 = cam.toWorld(0, H + 20)[1];
    for (let wy = Math.floor(wy0 / band) * band; wy < wy1; wy += band) {
      const h = ihash(Math.floor(wy / band), 401);
      const [, sy] = cam.toScreen(0, wy);
      ctx.fillStyle = h < 0.3 ? '#26241f' : h < 0.55 ? '#181816' : h < 0.8 ? '#211f1b' : '#2b2620';
      ctx.fillRect(0, Math.round(sy), W, Math.ceil(band * z));
      ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(0, Math.round(sy), W, Math.max(1, Math.round(z)));
    }
    // gravel and brick rubble through the fill
    const grit = Tex.get('fill|grit', 32, (x, S) => {
      for (let i = 0; i < 90; i++) { const gx = ihash(i, 7) * S, gy = ihash(i, 8) * S, v = ihash(i, 9);
        x.fillStyle = v < 0.4 ? 'rgba(120,104,84,0.5)' : v < 0.75 ? 'rgba(70,58,46,0.6)' : 'rgba(150,96,70,0.4)';
        x.fillRect(gx | 0, gy | 0, 1 + (v > 0.9 ? 1 : 0), 1); }
    });
    Tex.fill(ctx, grit, cam.x, cam.y, z, 0.55);
    // what was laid in the ground before the pipe was
    for (let wx = Math.floor(leftW / 170) * 170; wx < rightW; wx += 170) {
      const k = Math.floor(wx / 170), h = ihash(k, 411);
      const wy = wy0 + ihash(k, 412) * (wy1 - wy0);
      const [sx, sy] = cam.toScreen(wx, wy);
      if (h < 0.3) {                                   // an old clay drain, cut through
        const r = (7 + ihash(k, 413) * 5) * z;
        Shape.oct(ctx, sx, sy, r + 2 * z, '#6a4a34'); Shape.oct(ctx, sx, sy, r, '#8a6446'); Shape.oct(ctx, sx, sy, r * 0.6, '#120e0a');
      } else if (h < 0.55) {                           // a brick footing
        const bw = 34 * z, bh = 16 * z;
        for (let ry = 0; ry < 3; ry++) for (let rx = 0; rx < 4; rx++) {
          ctx.fillStyle = (rx + ry) % 2 ? '#5c3a2c' : '#6a4434';
          ctx.fillRect(Math.round(sx - bw / 2 + rx * bw / 4 + (ry % 2 ? 2 * z : 0)), Math.round(sy + ry * bh / 3), Math.ceil(bw / 4 - z), Math.ceil(bh / 3 - z));
        }
      } else if (h < 0.78) {                           // a duct bank: four ways, in concrete
        const dw = 26 * z, dh = 18 * z;
        ctx.fillStyle = '#3e3a34'; ctx.fillRect(Math.round(sx - dw / 2), Math.round(sy), Math.round(dw), Math.round(dh));
        for (let i = 0; i < 4; i++) Shape.oct(ctx, sx - dw / 2 + dw * (0.25 + (i % 2) * 0.5), sy + dh * (i < 2 ? 0.32 : 0.7), 4 * z, '#14100c');
      } else if (h < 0.9) {                            // a main, still in service, still leaking
        ctx.fillStyle = '#4a4640'; ctx.fillRect(Math.round(sx - 30 * z), Math.round(sy), Math.round(60 * z), Math.round(9 * z));
        ctx.fillStyle = '#5e5a52'; ctx.fillRect(Math.round(sx - 30 * z), Math.round(sy), Math.round(60 * z), Math.max(1, Math.round(2 * z)));
        ctx.fillStyle = '#2a2622'; ctx.fillRect(Math.round(sx - 4 * z), Math.round(sy - 2 * z), Math.round(8 * z), Math.round(13 * z));
      }
    }
  },
  // The lining, seen edge on: the wall thickness of the pipe itself, a band of
  // pale concrete following the crown and the invert with a ring joint in it
  // every segment. It is the one line that tells you this is a pipe and not a
  // hole, so it is drawn last and it is drawn light.
  pipeLining(ctx, cam, dir) {
    const W = G.W, z = cam.zoom, step = 3, th = 13;
    for (let sx = -step; sx <= W + step; sx += step) {
      const wx = cam.toWorldX(sx), r = dir < 0 ? this.roofY(wx) : this.floorY(wx);
      if (r === null) continue;
      const [, sy] = cam.toScreen(wx, r);
      const y0 = dir < 0 ? sy - th * z : sy;
      ctx.fillStyle = '#5b6166'; ctx.fillRect(sx, Math.round(y0), step, Math.ceil(th * z));
      ctx.fillStyle = dir < 0 ? '#787f84' : '#6d757a'; ctx.fillRect(sx, Math.round(dir < 0 ? sy - 3 * z : sy), step, Math.max(1, Math.round(3 * z)));
      ctx.fillStyle = '#3b4145'; ctx.fillRect(sx, Math.round(dir < 0 ? y0 : sy + th * z - 2 * z), step, Math.max(1, Math.round(2 * z)));
      // a ring joint every 26 units: this pipe was laid in segments
      if (((wx % 26) + 26) % 26 < 3) { ctx.fillStyle = '#333a3e'; ctx.fillRect(sx, Math.round(y0), Math.max(1, Math.round(1.6 * z)), Math.ceil(th * z)); }
    }
  },
  // Manhole shafts. Every one of them is a hole in a street with a cast cover
  // on it, a shaft of rings under the cover and a ladder down the side of the
  // shaft whose bottom rung stops well short of the crown — which is the whole
  // reason a thing your size cannot use one. What comes down is light and rain.
  drawManholes(ctx, cam) {
    const W = G.W, H = G.H, z = cam.zoom;
    const leftW = cam.toWorldX(-90), rightW = cam.toWorldX(W + 90);
    for (const [mx, lit] of MANHOLES) {
      if (mx < leftW || mx > rightW) continue;
      const r = this.roofY(mx); if (r === null) continue;
      const rad = 17, top = r - 150;
      const [sx, sy] = cam.toScreen(mx, r);
      const [, ty] = cam.toScreen(mx, top);
      const x0 = Math.round(sx - rad * z), wdt = Math.ceil(rad * 2 * z);
      // the bore of the shaft, and the rings it is built out of
      ctx.fillStyle = '#12100e'; ctx.fillRect(x0, Math.round(ty), wdt, Math.round(sy - ty));
      ctx.fillStyle = '#3a3a36'; ctx.fillRect(x0 - Math.round(3 * z), Math.round(ty), Math.round(3 * z), Math.round(sy - ty));
      ctx.fillStyle = '#2c2c28'; ctx.fillRect(Math.round(sx + rad * z), Math.round(ty), Math.round(3 * z), Math.round(sy - ty));
      for (let wy = top; wy < r; wy += 24) {
        const [, jy] = cam.toScreen(mx, wy);
        ctx.fillStyle = '#26251f'; ctx.fillRect(x0, Math.round(jy), wdt, Math.max(1, Math.round(2 * z)));
        ctx.fillStyle = '#443f36'; ctx.fillRect(x0, Math.round(jy + 2 * z), wdt, Math.max(1, Math.round(z)));
      }
      // the ladder, down one side, stopping short
      for (let wy = top + 16; wy < r - 54; wy += 15) {
        const [, ry] = cam.toScreen(mx, wy);
        ctx.fillStyle = '#6a6252'; ctx.fillRect(Math.round(sx - 7 * z), Math.round(ry), Math.round(14 * z), Math.max(1, Math.round(2 * z)));
        ctx.fillStyle = '#2a2620'; ctx.fillRect(Math.round(sx - 7 * z), Math.round(ry + 2 * z), Math.round(14 * z), Math.max(1, Math.round(z)));
      }
      // the cover, and the daylight round the edge of it
      const day = clamp(lit * (0.35 + 0.65 * World.light(G.day)), 0, 1);
      ctx.fillStyle = '#1a1a16'; ctx.fillRect(x0 - Math.round(4 * z), Math.round(ty - 9 * z), wdt + Math.round(8 * z), Math.round(9 * z));
      ctx.fillStyle = '#3c3a32'; ctx.fillRect(x0 - Math.round(2 * z), Math.round(ty - 7 * z), wdt + Math.round(4 * z), Math.round(5 * z));
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#54514a'; ctx.fillRect(Math.round(sx - rad * z + 3 * z + i * 7 * z), Math.round(ty - 6 * z), Math.max(1, Math.round(3 * z)), Math.max(1, Math.round(3 * z))); }
      // the cast frame where the shaft breaks through the crown: the one line
      // that says a hole in the ceiling is a hole and not a stain
      ctx.fillStyle = '#787f84'; ctx.fillRect(x0 - Math.round(5 * z), Math.round(sy - 3 * z), wdt + Math.round(10 * z), Math.max(1, Math.round(3 * z)));
      ctx.fillStyle = '#3b4145'; ctx.fillRect(x0 - Math.round(5 * z), Math.round(sy), wdt + Math.round(10 * z), Math.max(1, Math.round(2 * z)));
      ctx.fillStyle = '#0c0e0e'; ctx.fillRect(x0, Math.round(sy - 3 * z), wdt, Math.max(1, Math.round(3 * z)));
      if (day > 0.04) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        // the light through the slots in the cover, spreading as it falls, and
        // strongest where it comes through the crown
        const fy0 = this.floorY(mx), [, fS] = cam.toScreen(mx, fy0);
        const g = ctx.createLinearGradient(0, ty, 0, fS + 10 * z);
        g.addColorStop(0, `rgba(210,230,244,${(0.78 * day).toFixed(3)})`);
        g.addColorStop(0.5, `rgba(200,222,238,${(0.44 * day).toFixed(3)})`);
        g.addColorStop(0.82, `rgba(192,216,234,${(0.22 * day).toFixed(3)})`);
        g.addColorStop(1, 'rgba(180,206,226,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx - 9 * z, ty); ctx.lineTo(sx + 9 * z, ty);
        ctx.lineTo(sx + 34 * z, fS + 10 * z); ctx.lineTo(sx - 34 * z, fS + 10 * z);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        // and a puddle of it on the invert
        const gy = fS;
        if (gy > -40 && gy < H + 40) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const p = ctx.createRadialGradient(sx, gy, 1, sx, gy, 44 * z);
          p.addColorStop(0, `rgba(196,218,236,${(0.34 * day).toFixed(3)})`); p.addColorStop(1, 'rgba(190,214,232,0)');
          ctx.fillStyle = p; ctx.fillRect(sx - 44 * z, gy - 26 * z, 88 * z, 52 * z); ctx.restore();
        }
        if (chance(0.06)) G.fx.add({ type: 'drop', x: mx + rand(-10, 10), y: top + 20, vx: rand(-3, 3), vy: 60, s: 1, color: '#a8c4d0', life: 3.4 });
      }
    }
  },
  drawIndoor(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom, step = 4;
    if (!this.isIndoor(cam.toWorldX(W / 2)) && !this.isIndoor(cam.toWorldX(0)) && !this.isIndoor(cam.toWorldX(W))) return;
    const B = Biome.mixPal(cam.x);
    // Facility B is a building and the system is a bore. Each has its own
    // renderer; the generic indoor path below is only the fallback. Which one
    // runs is decided by the biome the camera is actually in, never by the
    // crossfade: the fade is 260 units wide and the loading dock is 144, so
    // reading the blended flags drew the whole dock as sewer brick.
    const BA = Biome.at(cam.x);
    if (BA.lab) { Facility.draw(ctx, cam, day); return; }
    if (typeof Sewer !== 'undefined' && Sewer.draw(ctx, cam, day)) { this.drawManholes(ctx, cam); return; }
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
    const leftW = cam.toWorldX(-80), rightW = cam.toWorldX(W + 80);
    // Under Rome the wall is not municipal brick. It is tufa block laid two
    // thousand years ago, with blind arches every so often and, in the
    // necropolis, rows of niches with what the niches were cut for still in
    // them. Drawn behind everything, in the wall's own tones.
    if (B.lab) {
      // FACILITY B. White tile to shoulder height with a dark band above it,
      // strip lights, ducting and cable trays along the crown, containment
      // tanks and consoles on the wall, doors with a window in them, a painted
      // line, and signage nobody reads. Everything is on the world grid.
      const roofS = cam.toScreen(0, this.roofY(cam.x) || -650)[1], floorS = cam.toScreen(0, this.floorY(cam.x))[1];
      // upper wall: dark painted block
      ctx.fillStyle = '#1e262b'; ctx.fillRect(0, 0, W, H);
      // tile band: from a little above the floor to two metres up. It is the
      // only bright surface in the game and it is meant to be: you spend the
      // first minute of a run looking at it.
      const tileTop = floorS - 150 * z, tileBot = floorS + 6 * z;
      const tile = Tex.get('labwall2', 32, (x, S) => {
        x.fillStyle = '#b9c5c0'; x.fillRect(0, 0, S, S);
        x.fillStyle = '#94a29e'; x.fillRect(0, 0, S, 1); x.fillRect(0, 0, 1, S); x.fillRect(16, 0, 1, S); x.fillRect(0, 16, S, 1);
        x.fillStyle = '#d2ded8'; x.fillRect(1, 1, 14, 1); x.fillRect(17, 17, 14, 1); x.fillRect(1, 1, 1, 14); x.fillRect(17, 17, 1, 14);
        x.fillStyle = '#a7b4af'; x.fillRect(10, 8, 3, 1); x.fillRect(24, 22, 4, 1);
      });
      ctx.save(); ctx.beginPath(); ctx.rect(0, tileTop, W, tileBot - tileTop); ctx.clip();
      Tex.fill(ctx, tile, cam.x, cam.y, z, 0.94); ctx.restore();
      // the dado: a capping rail over the tile, then the painted stripe
      ctx.fillStyle = '#8e9ca0'; ctx.fillRect(0, Math.round(tileTop - 4 * z), W, Math.max(1, Math.round(4 * z)));
      ctx.fillStyle = '#c2ccce'; ctx.fillRect(0, Math.round(tileTop - 4 * z), W, Math.max(1, Math.round(z)));
      ctx.fillStyle = '#2a8a70'; ctx.fillRect(0, Math.round(tileTop + 6 * z), W, Math.max(1, Math.round(3 * z)));       // the coloured stripe every facility has
      ctx.fillStyle = '#1d5f4e'; ctx.fillRect(0, Math.round(tileTop + 9 * z), W, Math.max(1, Math.round(z)));
      // grime where the floor meets the wall
      ctx.fillStyle = 'rgba(30,26,20,0.35)'; ctx.fillRect(0, Math.round(floorS - 8 * z), W, Math.round(8 * z));
      // ducting, cable tray and conduit along the crown
      const duct = roofS + 26 * z;
      ctx.fillStyle = '#3a4448'; ctx.fillRect(0, Math.round(duct), W, Math.round(14 * z));
      ctx.fillStyle = '#4a565c'; ctx.fillRect(0, Math.round(duct), W, Math.max(1, Math.round(2 * z)));
      ctx.fillStyle = '#2a3236'; ctx.fillRect(0, Math.round(duct + 12 * z), W, Math.max(1, Math.round(2 * z)));
      for (let wx = Math.floor(leftW / 40) * 40; wx < rightW; wx += 40) { const [sx] = cam.toScreen(wx, 0); ctx.fillStyle = '#2a3236'; ctx.fillRect(Math.round(sx), Math.round(duct), Math.max(1, Math.round(z)), Math.round(14 * z)); }
      ctx.fillStyle = '#5a6670'; ctx.fillRect(0, Math.round(duct + 20 * z), W, Math.max(1, Math.round(2 * z)));
      ctx.fillStyle = '#c0a040'; ctx.fillRect(0, Math.round(duct + 24 * z), W, Math.max(1, Math.round(z)));
      // strip lights, and the cones they throw down the tile
      for (let wx = Math.floor(leftW / 120) * 120; wx < rightW; wx += 120) {
        const [sx] = cam.toScreen(wx, 0), lw = 60 * z, ly = roofS + 8 * z;
        ctx.fillStyle = '#2a3236'; ctx.fillRect(Math.round(sx - lw / 2), Math.round(ly), Math.round(lw), Math.round(5 * z));
        const on = ihash(Math.floor(wx / 120), 3) > 0.12 || Math.sin(this.t * 17 + wx) > 0.2;
        ctx.fillStyle = on ? '#e8f4ee' : '#4a5a58'; ctx.fillRect(Math.round(sx - lw / 2 + 2 * z), Math.round(ly + 4 * z), Math.round(lw - 4 * z), Math.max(1, Math.round(2 * z)));
        if (on) { const g = ctx.createLinearGradient(0, ly, 0, floorS); g.addColorStop(0, 'rgba(210,240,230,0.16)'); g.addColorStop(1, 'rgba(210,240,230,0)'); ctx.fillStyle = g; ctx.fillRect(Math.round(sx - lw / 2 - 20 * z), Math.round(ly), Math.round(lw + 40 * z), Math.round(floorS - ly)); }
      }
      // doors, every 480, with a porthole and a keypad
      for (let wx = Math.floor(leftW / 480) * 480 + 240; wx < rightW; wx += 480) {
        if (!Biome.at(wx).lab) continue;
        const [sx] = cam.toScreen(wx, 0), dw = 44 * z, dh = 92 * z, dy = floorS - dh;
        ctx.fillStyle = '#2f3a40'; ctx.fillRect(Math.round(sx - dw / 2 - 3 * z), Math.round(dy - 3 * z), Math.round(dw + 6 * z), Math.round(dh + 3 * z));
        ctx.fillStyle = '#4a5860'; ctx.fillRect(Math.round(sx - dw / 2), Math.round(dy), Math.round(dw), Math.round(dh));
        ctx.fillStyle = '#5a6a72'; ctx.fillRect(Math.round(sx - dw / 2), Math.round(dy), Math.max(1, Math.round(2 * z)), Math.round(dh));
        ctx.fillStyle = '#0e1a1e'; ctx.fillRect(Math.round(sx - 9 * z), Math.round(dy + 14 * z), Math.round(18 * z), Math.round(20 * z));
        ctx.fillStyle = 'rgba(120,200,180,0.25)'; ctx.fillRect(Math.round(sx - 7 * z), Math.round(dy + 16 * z), Math.round(6 * z), Math.round(6 * z));
        ctx.fillStyle = '#c0c8c0'; ctx.fillRect(Math.round(sx + dw / 2 - 12 * z), Math.round(dy + 46 * z), Math.round(6 * z), Math.round(3 * z));   // handle
        ctx.fillStyle = '#1a2a2e'; ctx.fillRect(Math.round(sx + dw / 2 + 6 * z), Math.round(dy + 40 * z), Math.round(6 * z), Math.round(9 * z));    // keypad
        ctx.fillStyle = Math.sin(this.t * 3 + wx) > 0 ? '#40f070' : '#207038'; ctx.fillRect(Math.round(sx + dw / 2 + 8 * z), Math.round(dy + 42 * z), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(2 * z)));
        // a stencil over the door
        ctx.fillStyle = '#c8d0cc'; ctx.fillRect(Math.round(sx - 16 * z), Math.round(dy - 14 * z), Math.round(32 * z), Math.round(8 * z));
        ctx.fillStyle = '#1e262b'; for (let k = 0; k < 5; k++) ctx.fillRect(Math.round(sx - 13 * z + k * 6 * z), Math.round(dy - 11 * z), Math.round(3 * z), Math.round(2 * z));
      }
      // fittings, on the grid, at the height the shot actually sees: a hose reel
      // in its cabinet, a panel with its door shut, a socket and a spill kit.
      for (let wx = Math.floor(leftW / 120) * 120; wx < rightW; wx += 120) {
        if (!Biome.at(wx).lab) continue;
        const [sx] = cam.toScreen(wx, 0), kind = ((Math.floor(wx / 120) % 4) + 4) % 4;
        const by = floorS - 96 * z;
        if (kind === 0) {                                     // hose reel, in a cabinet
          ctx.fillStyle = '#a03024'; ctx.fillRect(Math.round(sx - 13 * z), Math.round(by), Math.round(26 * z), Math.round(26 * z));
          ctx.fillStyle = '#c04434'; ctx.fillRect(Math.round(sx - 13 * z), Math.round(by), Math.round(26 * z), Math.max(1, Math.round(2 * z)));
          ctx.fillStyle = '#2a1a16'; ctx.fillRect(Math.round(sx - 9 * z), Math.round(by + 5 * z), Math.round(18 * z), Math.round(17 * z));
          ctx.fillStyle = '#d8d0c0'; for (let r = 6; r >= 2; r -= 2) { ctx.fillRect(Math.round(sx - r * z), Math.round(by + 13 * z - r * z), Math.round(2 * r * z), Math.max(1, Math.round(z))); ctx.fillRect(Math.round(sx - r * z), Math.round(by + 13 * z + r * z), Math.round(2 * r * z), Math.max(1, Math.round(z))); }
        } else if (kind === 1) {                              // a distribution board
          ctx.fillStyle = '#39444a'; ctx.fillRect(Math.round(sx - 15 * z), Math.round(by + 2 * z), Math.round(30 * z), Math.round(22 * z));
          ctx.fillStyle = '#4b585e'; ctx.fillRect(Math.round(sx - 15 * z), Math.round(by + 2 * z), Math.round(30 * z), Math.max(1, Math.round(2 * z)));
          ctx.fillStyle = '#28323a'; ctx.fillRect(Math.round(sx - 12 * z), Math.round(by + 6 * z), Math.round(24 * z), Math.round(14 * z));
          for (let i = 0; i < 5; i++) { ctx.fillStyle = ihash(i + Math.floor(wx / 120), 61) > 0.4 ? '#40c878' : '#c8a020'; ctx.fillRect(Math.round(sx - 10 * z + i * 4.4 * z), Math.round(by + 9 * z), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(3 * z))); }
        } else if (kind === 2) {                              // a spill kit and a socket
          ctx.fillStyle = '#c8a020'; ctx.fillRect(Math.round(sx - 9 * z), Math.round(by + 10 * z), Math.round(18 * z), Math.round(14 * z));
          ctx.fillStyle = '#e0c040'; ctx.fillRect(Math.round(sx - 9 * z), Math.round(by + 10 * z), Math.round(18 * z), Math.max(1, Math.round(2 * z)));
          ctx.fillStyle = '#1a1a1a'; ctx.fillRect(Math.round(sx - 4 * z), Math.round(by + 14 * z), Math.round(8 * z), Math.round(6 * z));
          ctx.fillStyle = '#b8c0bc'; ctx.fillRect(Math.round(sx + 16 * z), Math.round(by + 16 * z), Math.round(7 * z), Math.round(8 * z));
          ctx.fillStyle = '#2a3236'; ctx.fillRect(Math.round(sx + 18 * z), Math.round(by + 18 * z), Math.max(1, Math.round(z)), Math.round(3 * z)); ctx.fillRect(Math.round(sx + 20 * z), Math.round(by + 18 * z), Math.max(1, Math.round(z)), Math.round(3 * z));
        } else {                                              // a window into the next bay, lit green
          ctx.fillStyle = '#2f3a40'; ctx.fillRect(Math.round(sx - 22 * z), Math.round(by - 6 * z), Math.round(44 * z), Math.round(34 * z));
          ctx.fillStyle = '#0e1a1e'; ctx.fillRect(Math.round(sx - 19 * z), Math.round(by - 3 * z), Math.round(38 * z), Math.round(28 * z));
          ctx.fillStyle = 'rgba(90,200,160,0.18)'; ctx.fillRect(Math.round(sx - 19 * z), Math.round(by - 3 * z), Math.round(38 * z), Math.round(28 * z));
          ctx.fillStyle = '#1c6a86'; ctx.fillRect(Math.round(sx - 12 * z), Math.round(by + 4 * z), Math.round(9 * z), Math.round(21 * z));
          ctx.fillStyle = '#227058'; ctx.fillRect(Math.round(sx + 3 * z), Math.round(by + 9 * z), Math.round(11 * z), Math.round(16 * z));
          ctx.fillStyle = '#3a4448'; ctx.fillRect(Math.round(sx - 19 * z), Math.round(by + 11 * z), Math.round(38 * z), Math.max(1, Math.round(z)));
        }
      }
      // hazard stripe along the base of the wall, and a warning placard now and then
      for (let wx = Math.floor(leftW / 24) * 24; wx < rightW; wx += 24) { const [sx] = cam.toScreen(wx, 0); ctx.fillStyle = (Math.floor(wx / 24) & 1) ? '#c8a020' : '#1a1a1a'; ctx.fillRect(Math.round(sx), Math.round(floorS - 3 * z), Math.round(24 * z) + 1, Math.max(1, Math.round(3 * z))); }
      for (let wx = Math.floor(leftW / 300) * 300 + 40; wx < rightW; wx += 300) {
        if (!Biome.at(wx).lab) continue;
        const [sx] = cam.toScreen(wx, 0), py = tileTop - 30 * z;
        ctx.fillStyle = '#e0c040'; ctx.fillRect(Math.round(sx - 10 * z), Math.round(py), Math.round(20 * z), Math.round(20 * z));
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(Math.round(sx - 6 * z), Math.round(py + 4 * z), Math.round(12 * z), Math.round(12 * z));
        ctx.fillStyle = '#e0c040'; for (let k = 0; k < 3; k++) { const a = k * TAU / 3 - Math.PI / 2; ctx.fillRect(Math.round(sx + Math.cos(a) * 4 * z) - 1, Math.round(py + 10 * z + Math.sin(a) * 4 * z) - 1, Math.max(2, Math.round(3 * z)), Math.max(2, Math.round(3 * z))); }
      }
    } else if (B.pipe) {
      // THE INTERCEPTOR. Precast rings, a benched invert and nothing else: no
      // brick, no niches, no growth. The back of the pipe is the back of the
      // pipe, lit by whatever falls down the shafts.
      ctx.fillStyle = '#1b2124'; ctx.fillRect(0, 0, W, H);
      for (let wx = Math.floor(leftW / 26) * 26; wx < rightW; wx += 26) {
        const [sx] = cam.toScreen(wx, 0);
        ctx.fillStyle = '#232a2e'; ctx.fillRect(Math.round(sx), 0, Math.max(1, Math.round(2.4 * z)), H);
        ctx.fillStyle = '#141a1d'; ctx.fillRect(Math.round(sx + 2.4 * z), 0, Math.max(1, Math.round(z)), H);
      }
      // step irons up the back of the pipe at every access: the system was
      // built for men to get into, which is the joke of being in it as this
      for (let wx = Math.floor(leftW / 26) * 26; wx < rightW; wx += 26) {
        if (ihash(Math.floor(wx / 26), 205) > 0.22 || !Biome.at(wx).pipe) continue;
        const rf = this.roofY(wx), fl2 = this.floorY(wx); if (rf === null) continue;
        const [sx] = cam.toScreen(wx, 0);
        for (let wy = fl2 - 14; wy > rf + 6; wy -= 14) {
          const [, ry] = cam.toScreen(wx, wy);
          ctx.fillStyle = '#575043'; ctx.fillRect(Math.round(sx - 5 * z), Math.round(ry), Math.round(10 * z), Math.max(1, Math.round(2 * z)));
          ctx.fillStyle = '#2a2822'; ctx.fillRect(Math.round(sx - 5 * z), Math.round(ry + 2 * z), Math.round(10 * z), Math.max(1, Math.round(z)));
        }
      }
      // the wash down the middle of it, and the tide marks either side
      const fS = cam.toScreen(0, this.floorY(cam.x))[1], rS = cam.toScreen(0, this.roofY(cam.x) || -100)[1];
      ctx.fillStyle = 'rgba(40,60,54,0.5)'; ctx.fillRect(0, Math.round(fS - 22 * z), W, Math.round(22 * z));
      ctx.fillStyle = 'rgba(122,150,120,0.22)'; ctx.fillRect(0, Math.round(fS - 22 * z), W, Math.max(1, Math.round(z)));
      ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(0, Math.round(rS), W, Math.round(Math.max(0, fS - rS) * 0.45));
    } else if (B.roman) {
      const arch = shade(B.ground[2], 0.78), archL = shade(B.ground[2], 1.5), hole = shade(B.ground[2], 0.36);
      for (let wx = Math.floor(leftW / 120) * 120; wx < rightW; wx += 120) {
        const [ax] = cam.toScreen(wx, 0), aw = Math.round(38 * z), ah = Math.round(70 * z);
        const roofS = cam.toScreen(wx, this.roofY(wx) || -100)[1];
        const ay = Math.round(roofS + 18 * z);
        // the arch: a dark opening with a lit voussoir ring, pixel-stepped
        ctx.fillStyle = hole; ctx.fillRect(Math.round(ax - aw / 2), ay + Math.round(aw / 2), aw, ah);
        for (let k = 0; k <= 8; k++) { const a = Math.PI + k * (Math.PI / 8); const rx = ax + Math.cos(a) * aw / 2, ry = ay + aw / 2 + Math.sin(a) * aw / 2; ctx.fillStyle = k % 2 ? arch : archL; ctx.fillRect(Math.round(rx - 2 * z), Math.round(ry - 2 * z), Math.max(2, Math.round(4 * z)), Math.max(2, Math.round(4 * z))); }
        for (let yy = ay + aw / 2; yy < ay + aw / 2 + ah; yy += Math.max(3, Math.round(6 * z))) { ctx.fillStyle = hole; ctx.fillRect(Math.round(ax - aw / 2), Math.round(yy), aw, Math.max(1, Math.round(z))); }
        // ossuary niches in the piers between arches, three rows, skulls in most
        if (B.id === 'necropolis') {
          for (let row = 0; row < 3; row++) for (let col = -1; col <= 1; col += 2) {
            const nx = Math.round(ax + col * (aw / 2 + 14 * z)), ny = Math.round(ay + 20 * z + row * 22 * z);
            const nw = Math.round(9 * z), nh = Math.round(11 * z);
            ctx.fillStyle = hole; ctx.fillRect(nx - nw / 2, ny, nw, nh);
            ctx.fillStyle = archL; ctx.fillRect(nx - nw / 2, ny, nw, Math.max(1, Math.round(z)));
            if (ihash(Math.floor(wx / 120) * 7 + row * 3 + col, 55) < 0.72) {
              ctx.fillStyle = '#b8b09a'; ctx.fillRect(nx - Math.round(2.5 * z), ny + Math.round(3 * z), Math.round(5 * z), Math.round(5 * z));
              ctx.fillStyle = '#2a2418'; ctx.fillRect(nx - Math.round(1.6 * z), ny + Math.round(4.4 * z), Math.max(1, Math.round(1.2 * z)), Math.max(1, Math.round(1.2 * z))); ctx.fillRect(nx + Math.round(0.4 * z), ny + Math.round(4.4 * z), Math.max(1, Math.round(1.2 * z)), Math.max(1, Math.round(1.2 * z)));
            }
          }
        }
      }
    }
    // pilasters: shallow piers standing off the wall every 150 units
    for (let wx = Math.floor(leftW / 150) * 150; wx < rightW; wx += 150) {
      if (B.roman || B.lab) break;
      const [sx] = cam.toScreen(wx, 0), pw = Math.max(2, Math.round(9 * z));
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = wallD; ctx.fillRect(Math.round(sx - pw / 2), 0, pw, H);
      ctx.fillStyle = wallL; ctx.fillRect(Math.round(sx - pw / 2), 0, Math.max(1, Math.round(z)), H);
      ctx.globalAlpha = 1;
    }
    // damp streaks running down the brick
    ctx.globalAlpha = B.lab ? 0.08 : 0.3;
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
    // above the crown of a pipe there is no rock: there is fill, in courses,
    // with everything anybody ever laid in a street running through it
    if (B.pipe) { ctx.save(); ctx.clip(); this.buriedGround(ctx, cam); ctx.restore(); this.pipeLining(ctx, cam, -1); }
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
      if (B.lab || B.pipe) continue;
      if (B.roman) {
        // a rib of the vault, and one guttering torch bracket per bay
        const [sx, sy] = cam.toScreen(wx, r), fy = cam.toScreen(wx, this.floorY(wx))[1];
        ctx.fillStyle = shade(B.ground[0], 0.7); ctx.fillRect(Math.round(sx - 4 * z), Math.round(sy), Math.round(8 * z), Math.round(fy - sy));
        ctx.fillStyle = shade(B.ground[0], 1.15); ctx.fillRect(Math.round(sx - 4 * z), Math.round(sy), Math.max(1, Math.round(1.4 * z)), Math.round(fy - sy));
        const lit = ihash(Math.floor(wx / 150), 19) > 0.45;
        const tx = sx + 40 * z, ty = sy + 30 * z;
        ctx.fillStyle = '#3a3026'; ctx.fillRect(Math.round(tx - z), Math.round(ty), Math.max(1, Math.round(2 * z)), Math.round(9 * z));
        if (lit) {
          const fl2 = Math.sin(this.t * 13 + wx) * 0.5 + 0.5;
          ctx.fillStyle = '#ff9a30'; ctx.fillRect(Math.round(tx - 2 * z), Math.round(ty - 4 * z - fl2 * 2 * z), Math.round(4 * z), Math.round(4 * z + fl2 * 2 * z));
          ctx.fillStyle = '#ffe080'; ctx.fillRect(Math.round(tx - z), Math.round(ty - 2 * z), Math.round(2 * z), Math.round(2 * z));
          ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(tx, ty, 2, tx, ty, 60 * z); g.addColorStop(0, 'rgba(255,150,60,0.20)'); g.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = g; ctx.fillRect(tx - 60 * z, ty - 60 * z, 120 * z, 120 * z); ctx.globalCompositeOperation = 'source-over';
          if (chance(0.03)) G.fx.add({ type: 'smoke', x: wx + 40, y: r + 26, vx: rand(-3, 3), vy: -12, s: 1.2, color: '#4a4038', life: 1.6, t: 0, maxLife: 1.6 });
        }
        continue;
      }
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
    this.drawManholes(ctx, cam);
  },
  // The deep is not an empty black rectangle. Below the light there is marine
  // snow drifting down forever, the far side of the canyon showing as a flat
  // silhouette, and things that make their own light.
  drawDeepScene(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom;
    const depth = cam.y;
    if (depth < 240) return;
    // there is no far side of a canyon under a city: the deep sewer is a wall
    if (this.isIndoor(cam.x)) return;
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
    this.drawDropShaft(ctx, cam);
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
  // The shaft under the manhole. The heightmap can only say how high the
  // ground is at x, so a hole that goes down and east under the loading dock
  // is not something it can hold: this draws the shaft the map cannot, as a
  // raking bore from the broken cover to the head of the interceptor. Rings,
  // a ladder that stops where ladders always stop, and the wash down one side.
  drawDropShaft(ctx, cam) {
    if (typeof Opening === 'undefined' || !Opening.coverBroken) return;
    const z = cam.zoom, HW = 26;
    const mx = Opening.MANHOLE, dx = Opening.DRAIN;
    const top = this.floorY(mx), bot = -972;
    if (Math.max(mx, dx) + 60 < cam.toWorldX(-60) || Math.min(mx, dx) - 60 > cam.toWorldX(G.W + 60)) return;
    const A = cam.toScreen(mx - HW, top), B = cam.toScreen(mx + HW, top);
    const C = cam.toScreen(dx + HW + 6, bot), D = cam.toScreen(dx - HW - 6, bot);
    const poly = () => { ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(D[0], D[1]); ctx.closePath(); };
    ctx.save(); poly(); ctx.clip();
    ctx.fillStyle = '#0c0f10'; ctx.fillRect(0, 0, G.W, G.H);
    // rings down the shaft, following the rake
    const N = 14;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const lx = lerp(A[0], D[0], u), rx = lerp(B[0], C[0], u);
      const ly = lerp(A[1], D[1], u), ry = lerp(B[1], C[1], u);
      ctx.fillStyle = '#20262a'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.lineTo(rx, ry + 3 * z); ctx.lineTo(lx, ly + 3 * z); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#39433f'; ctx.fillRect(Math.round(lx), Math.round(ly + 3 * z), Math.round(rx - lx), Math.max(1, Math.round(z)));
      // the ladder down the west side, stopping short of the bottom
      if (i < N - 3) { ctx.fillStyle = '#5f5849'; ctx.fillRect(Math.round(lx + 4 * z), Math.round(ly + 6 * z), Math.round(14 * z), Math.max(1, Math.round(2 * z))); }
    }
    // what the building has been letting down here for years
    ctx.fillStyle = 'rgba(120,160,150,0.14)';
    ctx.beginPath(); ctx.moveTo(lerp(A[0], B[0], 0.55), A[1]); ctx.lineTo(lerp(A[0], B[0], 0.62), A[1]);
    ctx.lineTo(lerp(D[0], C[0], 0.62), D[1]); ctx.lineTo(lerp(D[0], C[0], 0.55), D[1]); ctx.closePath(); ctx.fill();
    ctx.restore();
    // the lit lip on the near edge of the hole
    ctx.fillStyle = '#6e787e'; ctx.fillRect(Math.round(A[0]) - Math.round(3 * z), Math.round(A[1]) - Math.round(2 * z), Math.round(B[0] - A[0]) + Math.round(6 * z), Math.max(1, Math.round(2 * z)));
    if (chance(0.10)) G.fx.add({ type: 'drop', x: mx + rand(-18, 18), y: top + 8, vx: 22, vy: 120, s: 1, color: '#9ad8c0', life: 2.6 });
  },
  // Pipe mouths punched through the back wall. The system is a network, and a
  // network has to visibly go somewhere other than left and right.
  drawTunnelPipes(ctx, cam) {
    const W = G.W, H = G.H, z = cam.zoom;
    const B = Biome.mixPal(cam.x);
    if (B.lab) return;        // a laboratory wall does not have sewer mouths in it
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
    const yT = Math.max(y0, hy), k = this.isIndoor(cam.x) ? 0.55 : 1;
    const g = ctx.createLinearGradient(0, yT, 0, cam.toScreen(0, 760)[1]);
    g.addColorStop(0, `rgba(${haze[0]},${haze[1]},${haze[2]},0)`);
    g.addColorStop(0.45, `rgba(${haze[0]},${haze[1]},${haze[2]},${(0.3 * k).toFixed(3)})`);
    g.addColorStop(1, `rgba(${haze[0]},${haze[1]},${haze[2]},${(0.45 * k).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, yT, G.W, H - yT);
  },
  drawDecor(ctx, cam, layer, day) {
    // layer 0 = behind entities (weeds, rocks, logs, reeds, trees), 1 = in front (lilies, sawgrass, fireflies)
    const W = G.W, z = cam.zoom, t = this.t, light = this.light(day), night = 1 - light;
    const left = cam.toWorldX(-80), right = cam.toWorldX(W + 80);
    // A blade is three tapering strokes: shadow, body, lit edge. One flat stroke
    // per blade is what made the weed beds look like scribbled wire.
    // A blade is walked along its curve in whole pixels and laid down as
    // stacked squares: a dark spine, a mid body that tapers to the tip, and a
    // lit edge one pixel wide on the side facing the light. Nothing here is a
    // stroked path — an anti-aliased curve through a pixel scene is exactly
    // what made the weed beds read as wire.
    const blade = (bx, by, tx, ty, mx, my, w, cDark, cMid, cLit, opts) => {
      const n = Math.max(3, Math.round(Math.hypot(tx - bx, ty - by) / Math.max(1.5, z)));
      const wid = Math.max(1, w);
      let px0 = null, py0 = null;
      for (let i = 0; i <= n; i++) {
        const u = i / n, q = 1 - u;
        const x = q * q * bx + 2 * q * u * mx + u * u * tx, y = q * q * by + 2 * q * u * my + u * u * ty;
        const X = Math.round(x), Y = Math.round(y);
        if (X === px0 && Y === py0) continue; px0 = X; py0 = Y;
        // the blade thins toward the tip; the last few pixels are a point
        const ww = Math.max(1, Math.round(wid * (opts && opts.strap ? (u < 0.85 ? 1 : (1 - u) / 0.15) : (1 - u * 0.75))));
        ctx.fillStyle = cDark; ctx.fillRect(X - Math.floor(ww / 2), Y, ww, 1);
        if (ww > 1) { ctx.fillStyle = cMid; ctx.fillRect(X - Math.floor(ww / 2) + 1, Y, Math.max(1, ww - 1), 1); }
        if (ww > 2 || (ww > 1 && (i & 1))) { ctx.fillStyle = cLit; ctx.fillRect(X - Math.floor(ww / 2), Y, 1, 1); }
        // a midrib down a broad strap
        if (opts && opts.rib && ww > 3) { ctx.fillStyle = cDark; ctx.fillRect(X, Y, 1, 1); }
      }
    };
    // a leaflet off a stalk: a small pointed lobe of pixels, lit on top
    const leaflet = (x, y, dir, len, cMid, cLit, cDark) => {
      const L2 = Math.max(2, Math.round(len));
      for (let i = 0; i < L2; i++) {
        const hh = Math.max(1, Math.round((1 - i / L2) * Math.min(3, L2 * 0.45)));
        ctx.fillStyle = cMid; ctx.fillRect(Math.round(x + dir * i), Math.round(y - hh + 1 - i * 0.3), 1, hh);
        if (hh > 1) { ctx.fillStyle = cLit; ctx.fillRect(Math.round(x + dir * i), Math.round(y - hh + 1 - i * 0.3), 1, 1); }
      }
      ctx.fillStyle = cDark; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
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
          // a tuft of broad straps out of one crown, each with a midrib, the
          // longest in the middle; the tips curl over in the current
          const fw = flowAt(d.x), dk = fl(d.v ? '#1f4a38' : '#26543f'), md = fl(d.v ? '#3f8a6a' : '#4f9a72'), lt = fl(d.v ? '#6fc79a' : '#7fd6a6');
          for (let b = -3; b <= 3; b++) {
            const bl = d.h * (0.55 + (1 - Math.abs(b) / 4) * 0.5) * (0.85 + ihash(Math.floor(d.x) * 7 + b, 71) * 0.3);
            const sway = (Math.sin(t * 1.1 + d.ph + b * 0.5) * 4 + fw + (d.bend || 0) * 5) * z;
            const bx = sx + b * 1.6 * z, ty = sy - bl * z;
            blade(bx, sy, bx + sway * 1.3 + b * 2 * z, ty, bx + sway * 0.3, sy - bl * z * 0.6, 2.6 * z, dk, md, lt, { strap: true, rib: true });
          }
          // the crown it grows from
          ctx.fillStyle = dk; ctx.fillRect(Math.round(sx - 4 * z), Math.round(sy - z), Math.round(8 * z), Math.max(1, Math.round(2 * z)));
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
        case 'grit': if (layer !== 0) break; {
          // a bank of washed grit against one side of the invert, with whatever
          // was heavy enough to stop with it
          const sd = d.side, s2 = d.s * z;
          for (let i = 0; i < d.n; i++) {
            const ox = sd * (2 + i * 5) * s2, hh = (5 - i * 0.7) * s2;
            if (hh <= 0) continue;
            ctx.fillStyle = i % 2 ? '#4c4a40' : '#413f36';
            ctx.fillRect(Math.round(sx + ox), Math.round(sy - hh), Math.ceil(6 * s2), Math.ceil(hh + z));
            ctx.fillStyle = '#5e5b4e'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - hh), Math.ceil(6 * s2), Math.max(1, Math.round(z)));
          }
          ctx.fillStyle = '#6a6656'; ctx.fillRect(Math.round(sx - 2 * s2), Math.round(sy - z), Math.ceil(3 * s2), Math.max(1, Math.round(z)));
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
          // pondweed: three stalks, each carrying pairs of leaflets up its
          // length and a whorl at the tip, so it reads as a plant with leaves
          const fw = flowAt(d.x), dk = fl(d.v ? '#1b3f24' : '#25492a'), md = fl(d.v ? '#2f6a3a' : '#3f7a44'), lt = fl(d.v ? '#5f9c58' : '#6fae62');
          for (let b = -1; b <= 1; b++) {
            const bl = d.h * (0.6 + ihash(Math.floor(d.x) * 5 + b, 73) * 0.5);
            const sway = (Math.sin(t * 1.3 + d.ph + b) * 3.4 + fw * 0.8 + (d.bend || 0) * 5) * z;
            const bx = sx + b * 3 * z, ty = sy - bl * z;
            blade(bx, sy, bx + sway, ty, bx + sway * 0.4, sy - bl * z * 0.6, 1.2 * z, dk, md, lt);
            const pairs = Math.max(2, Math.round(bl / 9));
            for (let q = 1; q <= pairs; q++) {
              const u = q / (pairs + 1), lx = bx + sway * u * u, ly = sy - bl * z * u;
              const len = (3 + (1 - u) * 3) * z;
              leaflet(lx, ly, 1, len, md, lt, dk); leaflet(lx, ly, -1, len * 0.9, md, lt, dk);
            }
            // the whorl at the top
            for (const dir of [-1, 1]) leaflet(bx + sway, ty, dir, 2.5 * z, lt, lt, md);
          }
          break; }
        case 'rock': if (layer !== 0) break; { const s = SPR.rock[d.v]; drawSpr(ctx, s, sx, sy - s.h * d.s * z * 0.5 + 1, 0, d.s * z, d.s * z); break; }
        case 'log': if (layer !== 0) break; { const s = SPR.log[0]; drawSpr(ctx, s, sx, sy - s.h * d.s * z * 0.5 + 1, 0, d.s * z, d.s * z); break; }
        case 'skull': if (layer !== 0) break; drawSpr(ctx, SPR.skull, sx, sy - 2 * z, 0, z, z); break;
        case 'lily': if (layer !== 1) break; { const s = SPR.lily[d.v]; const wy = cam.toScreen(d.x, this.surface(d.x))[1]; drawSpr(ctx, s, sx, wy - 1 * z, 0, z, z, s.w / 2, s.h - 1); break; }
        case 'reed': if (layer !== 0) break; {
          const top = cam.toScreen(d.x, d.top)[1]; const sway = (Math.sin(t * 1.1 + d.ph) * 3 + (d.bend || 0) * 4) * z;
          const dk = fl('#2a4a20'), md = fl('#4f7a3a'), lt = fl('#7aa85a');
          blade(sx, sy, sx + sway, top, sx + sway * 0.3, (sy + top) / 2, 1.8 * z, dk, md, lt, { strap: true });
          // nodes up the stem, and one leaf off it
          for (let k = 1; k <= 3; k++) { const u = k / 4, nx = sx + sway * u * u, ny = sy + (top - sy) * u; ctx.fillStyle = dk; ctx.fillRect(Math.round(nx - z), Math.round(ny), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(z))); }
          { const u = 0.55, lx = sx + sway * u * u, ly = sy + (top - sy) * u; blade(lx, ly, lx + 9 * z + sway * 0.5, ly - 10 * z, lx + 6 * z, ly - 3 * z, 1.4 * z, dk, md, lt); }
          if (d.v) {
            // the brown seed head, a fuzzy spike of pixels
            ctx.fillStyle = '#6b4a2e'; ctx.fillRect(Math.round(sx + sway - z), Math.round(top - 9 * z), Math.max(1, Math.round(2.4 * z)), Math.max(2, Math.round(8 * z)));
            ctx.fillStyle = '#8a6a44'; for (let k = 0; k < 5; k++) ctx.fillRect(Math.round(sx + sway - z + (k % 2) * 1.6 * z), Math.round(top - 8 * z + k * 1.5 * z), 1, 1);
            ctx.fillStyle = '#c8b070'; ctx.fillRect(Math.round(sx + sway), Math.round(top - 11 * z), 1, Math.max(1, Math.round(2 * z)));
          } else blade(sx + sway, top, sx + sway + 6 * z, top - 7 * z, sx + sway + 4 * z, top - 2 * z, 1.4 * z, dk, md, lt);
          break; }
        case 'sawgrass': if (layer !== 1) break; {
          for (let b = -3; b <= 3; b++) {
            const sway = (Math.sin(t * 1.6 + d.ph + b * 0.4) * 2 + (d.bend || 0) * 2.5) * z;
            const hgt = (11 - Math.abs(b) * 1.8) * d.s * z, tx = sx + b * 3.2 * z * d.s + sway;
            blade(sx, sy + 1, tx, sy - hgt, sx + b * 1.4 * z * d.s + sway * 0.3, sy - hgt * 0.6, 1.3 * z, '#4a6a22', '#7a9a3a', '#a8c060');
          }
          if (d.fly && night > 0.3) { // firefly
            const fx = sx + Math.sin(t * 0.9 + d.ph) * 14 * z, fy = sy - (14 + Math.sin(t * 1.7 + d.ph * 2) * 8) * z;
            const pulse = 0.5 + 0.5 * Math.sin(t * 3 + d.ph * 5);
            if (pulse > 0.35) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * pulse; ctx.fillStyle = '#e8ff60'; ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1); ctx.globalAlpha = night * pulse * 0.3; ctx.fillRect(Math.round(fx) - 1, Math.round(fy) - 1, 3, 3); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
          }
          break; }
        case 'palmetto': if (layer !== 1) break; {
          // a fan of stiff fronds off one stem, each frond a ribbed strap with
          // a split tip
          const sway = (Math.sin(t * 1.2 + d.ph) * 1.5 + (d.bend || 0) * 3) * z;
          ctx.fillStyle = '#4a3a22'; ctx.fillRect(Math.round(sx - z), Math.round(sy - 5 * z * d.s), Math.max(1, Math.round(2 * z)), Math.round(5 * z * d.s));
          for (let b = -3; b <= 3; b++) {
            const hgt = (17 - Math.abs(b) * 2.6) * d.s * z, tx = sx + b * 4.2 * z * d.s + sway;
            blade(sx, sy - 5 * z * d.s, tx, sy - 5 * z * d.s - hgt, sx + b * 2 * z * d.s + sway * 0.4, sy - 5 * z * d.s - hgt * 0.55, 2.2 * z, '#274a24', '#3f7a3a', '#6aa858', { strap: true, rib: true });
            leaflet(tx, sy - 5 * z * d.s - hgt, b < 0 ? -1 : 1, 2.5 * z, '#6aa858', '#8ac870', '#274a24');
          }
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
          // filamentous algae: thin translucent ribbons that wave as a sheet
          const ac = fl(d.v ? '#5a965a' : '#78aa6e');
          ctx.globalAlpha = d.v ? 0.55 : 0.45;
          for (let b = -2; b <= 2; b++) {
            const sw2 = Math.sin(t * 0.8 + d.ph + b * 0.6) * 7 * z, bl = d.h * (0.7 + ihash(Math.floor(d.x) + b, 83) * 0.5);
            blade(sx + b * 2.2 * z, sy, sx + b * 2.2 * z + sw2, sy - bl * z, sx + b * 2.2 * z + sw2 * 0.3, sy - bl * z * 0.5, 1.6 * z, shade(ac, 0.7), ac, mixColor(ac, '#ffffff', 0.3), { strap: true });
          }
          ctx.globalAlpha = 1;
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
            blade(sx + ox, sy, sx + ox + (ihash(i, 9) - 0.5) * 14 * z, sy + len, sx + ox + Math.sin(t * 0.5 + i) * 4 * z, sy + len * 0.6, 2 * z, '#2e2014', '#4a3524', '#6a5034');
            // root hairs off the main tendril
            for (let k = 1; k <= 2; k++) { const u = k / 3; leaflet(sx + ox + (ihash(i, 9) - 0.5) * 14 * z * u, sy + len * u, k % 2 ? 1 : -1, 3 * z, '#4a3524', '#6a5034', '#2e2014'); }
          }
          break; }
        case 'vine': if (layer !== 0) break; {
          const top = cam.toScreen(d.x, d.y - d.h)[1];
          let vx0 = sx, vy0 = top;
          for (let k = 1; k <= 6; k++) {
            const kk = k / 6, vx1 = sx + Math.sin(t * 0.6 + d.ph + kk * 4) * 5 * z * kk, vy1 = lerp(top, sy, kk);
            blade(vx0, vy0, vx1, vy1, (vx0 + vx1) / 2, (vy0 + vy1) / 2, 1.4 * z, '#2e4a22', '#4a6a34', '#6a8a48', { strap: true });
            // a heart-shaped leaf at each node, alternating sides
            leaflet(vx1, vy1, k % 2 ? 1 : -1, 4 * z, '#5f8a3a', '#8ab858', '#2e4a22');
            vx0 = vx1; vy0 = vy1;
          }
          break; }
        case 'cattail': if (layer !== 1) break; {
          const top = cam.toScreen(d.x, d.top)[1], sway = (Math.sin(t * 1.3 + d.ph) * 3 + (d.bend || 0) * 4) * z;
          blade(sx, sy, sx + sway, top, sx + sway * 0.4, (sy + top) / 2, 1.4 * z, '#3a5a24', '#5a7a3a', '#8aa858', { strap: true });
          blade(sx, sy, sx + sway * 0.8 + 7 * z, top + 14 * z, sx + sway * 0.3 + 3 * z, (sy + top) / 2 + 6 * z, 1.4 * z, '#3a5a24', '#5a7a3a', '#8aa858');
          // the velvet head, with its spike
          ctx.fillStyle = '#5a3a20'; ctx.fillRect(Math.round(sx + sway - z), Math.round(top - 1), Math.max(2, Math.round(2.4 * z)), Math.max(2, Math.round(9 * z)));
          ctx.fillStyle = '#7a5030'; ctx.fillRect(Math.round(sx + sway - z), Math.round(top - 1), Math.max(1, Math.round(z)), Math.max(2, Math.round(9 * z)));
          ctx.fillStyle = '#8aa858'; ctx.fillRect(Math.round(sx + sway), Math.round(top - 4 * z), 1, Math.max(1, Math.round(3 * z)));
          break; }
        case 'fern': if (layer !== 1) break; {
          for (let b = -2; b <= 2; b++) {
            const sway = (Math.sin(t * 1.4 + d.ph + b) * 1.5 + (d.bend || 0) * 3) * z, len = (13 - Math.abs(b) * 2) * d.s * z;
            const tx = sx + b * 7 * z + sway, ty = sy - len, mx = sx + b * 4 * z + sway, my = sy - len * 0.7;
            blade(sx, sy, tx, ty, mx, my, 1.2 * z, '#2a4a1c', '#3f6a2a', '#6a9a48');
            // pinnae: leaflets paired down each frond, shortening to the tip
            for (let k = 1; k <= 4; k++) { const u = k / 5, q = 1 - u, px2 = q * q * sx + 2 * q * u * mx + u * u * tx, py2 = q * q * sy + 2 * q * u * my + u * u * ty; const ll = (4 - k * 0.6) * d.s * z; leaflet(px2, py2, 1, ll, '#3f6a2a', '#6a9a48', '#2a4a1c'); leaflet(px2, py2, -1, ll, '#3f6a2a', '#6a9a48', '#2a4a1c'); }
          }
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
          const fsw = Math.sin(t + d.c) * z;
          blade(sx, sy, sx + fsw, sy - 8 * z, sx + fsw * 0.5, sy - 4 * z, 1 * z, '#2e5a24', '#4a7a3a', '#6a9a50');
          leaflet(sx + fsw * 0.4, sy - 4 * z, 1, 3 * z, '#4a7a3a', '#6a9a50', '#2e5a24');
          // petals around a centre
          ctx.fillStyle = cols[d.c];
          for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillRect(Math.round(sx + fsw + ox * 1.6 * z - z * 0.5), Math.round(sy - 10 * z + oy * 1.6 * z), Math.max(1, Math.round(z)), Math.max(1, Math.round(z)));
          ctx.fillStyle = '#ffe080'; ctx.fillRect(Math.round(sx + fsw - z * 0.5), Math.round(sy - 10 * z), Math.max(1, Math.round(z)), Math.max(1, Math.round(z)));
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
          const top = sy - 30 * d.s * z;
          // prop roots: arched, stepped, lit along one side, each one a
          // separate limb rather than a wire
          for (let j = -2; j <= 2; j++) blade(sx + j * 2 * z, top, sx + j * 16 * d.s * z + d.dir * 6 * z, sy + 12 * z, sx + j * 12 * d.s * z, top + 14 * z, 2.4 * z, '#2e2214', '#4a3a24', '#6e5a38', { strap: true });
          ctx.fillStyle = '#4a3a24'; ctx.fillRect(Math.round(sx - 3 * z), Math.round(top - 2 * z), Math.round(6 * z), Math.round(6 * z));
          const mw2 = Math.round(38 * d.s);
          Leaf.draw(ctx, Leaf.mass(mw2, Math.round(mw2 * 0.55), '#1b3d22', '#2f6a34', '#55a04a', d.v * 17 + 5), sx, top - 10 * z, z);
          break; }
        // ---- the catacombs -----------------------------------------------
        case 'garbage': if (layer !== 1) break; {
          // what floats: bottles, a bag, a can, a plank, a shoe, a foam cup.
          // Each one rides the surface and turns a little in the current.
          const wy = cam.toScreen(d.x, this.surface(d.x))[1] + Math.sin(t * 1.4 + d.ph) * 1.2 * z;
          const s2 = d.s * z, r2 = (x, y, w2, h2, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(sx + x * s2), Math.round(wy + y * s2), Math.max(1, Math.round(w2 * s2)), Math.max(1, Math.round(h2 * s2))); };
          const tilt = Math.sin(t * 0.9 + d.ph) * 1.5;
          switch (d.v) {
            case 0: r2(-2, -7, 4, 7, '#3a7a5a'); r2(-1, -9, 2, 2, '#2a5a44'); r2(-2, -7, 1, 5, '#8ad0a8'); r2(-2, -2, 4, 2, '#1f4a36'); break;      // green bottle
            case 1: r2(-6, -4 + tilt, 12, 4, '#cfd4d8'); r2(-4, -6 + tilt, 8, 2, '#e8ecee'); r2(-6, -4 + tilt, 12, 1, '#f4f6f8'); r2(-3, -3 + tilt, 2, 1, '#9aa4aa'); break;   // bag
            case 2: r2(-3, -5, 6, 5, '#c04030'); r2(-3, -5, 6, 1, '#e8e0d0'); r2(-2, -3, 1, 2, '#ffffff'); r2(-3, -1, 6, 1, '#7a2018'); break;    // can
            case 3: r2(-9, -2, 18, 3, '#6a5034'); r2(-9, -2, 18, 1, '#8a6a44'); r2(-6, -1, 1, 1, '#3a2814'); r2(3, -1, 1, 1, '#3a2814'); break; // plank
            case 4: r2(-4, -4, 8, 4, '#2a2a34'); r2(-4, -5, 5, 1, '#3a3a48'); r2(2, -6, 2, 2, '#2a2a34'); r2(-4, -1, 8, 1, '#e0e0e0'); break;   // shoe
            default: r2(-3, -6, 6, 6, '#eeeee4'); r2(-3, -6, 1, 6, '#ffffff'); r2(-3, -1, 6, 1, '#b8b8a8'); r2(-4, -6, 8, 1, '#ffffff'); break;   // foam cup
          }
          // the ring it leaves on the water
          ctx.globalAlpha = 0.25; ctx.fillStyle = '#e8f0e0'; ctx.fillRect(Math.round(sx - 7 * s2), Math.round(wy), Math.round(14 * s2), Math.max(1, Math.round(z))); ctx.globalAlpha = 1;
          break; }
        case 'bones': if (layer !== 0) break; {
          // a pile: long bones lying across each other, a rib arch, and a skull
          // sitting on top of it looking at nothing
          const s2 = d.s * z, seed = Math.floor(d.x);
          const bone = '#d8d0b8', boneD = '#a89e84', boneL = '#f0ead8';
          for (let i = 0; i < d.n; i++) {
            const ox = (ihash(i, seed) - 0.5) * 22 * s2, len = (8 + ihash(i, seed + 3) * 8) * s2, oy = -(1 + ihash(i, seed + 5) * 3) * s2;
            const tiltB = (ihash(i, seed + 7) - 0.5) * 0.7;
            ctx.save(); ctx.translate(Math.round(sx + ox), Math.round(sy + oy)); ctx.rotate(tiltB);
            ctx.fillStyle = boneD; ctx.fillRect(Math.round(-len / 2), 0, Math.round(len), Math.max(1, Math.round(1.6 * s2)));
            ctx.fillStyle = bone; ctx.fillRect(Math.round(-len / 2), -Math.max(1, Math.round(s2 * 0.6)), Math.round(len), Math.max(1, Math.round(s2)));
            ctx.fillStyle = boneL; ctx.fillRect(Math.round(-len / 2), -Math.max(1, Math.round(s2 * 0.6)), Math.round(len * 0.4), Math.max(1, Math.round(s2 * 0.5)));
            // the knuckle ends
            ctx.fillStyle = bone; ctx.fillRect(Math.round(-len / 2 - s2), -Math.round(s2), Math.max(1, Math.round(2 * s2)), Math.max(1, Math.round(3 * s2))); ctx.fillRect(Math.round(len / 2 - s2), -Math.round(s2), Math.max(1, Math.round(2 * s2)), Math.max(1, Math.round(3 * s2)));
            ctx.restore();
          }
          if (d.v > 0) {
            // ribs: a fan of curved strokes, pixel-stepped
            const rx = sx - 4 * s2, ry = sy - 3 * s2;
            ctx.fillStyle = bone;
            for (let r0 = 0; r0 < 4; r0++) for (let k = 0; k < 6; k++) { const a = 0.4 + k * 0.28; ctx.fillRect(Math.round(rx + r0 * 3 * s2 + Math.cos(a) * 5 * s2), Math.round(ry - Math.sin(a) * 6 * s2), Math.max(1, Math.round(s2)), Math.max(1, Math.round(s2))); }
          }
          // the skull
          const kx = sx + (ihash(seed, 9) - 0.5) * 10 * s2, ky = sy - 5 * s2;
          ctx.fillStyle = boneD; ctx.fillRect(Math.round(kx - 3 * s2), Math.round(ky - 2 * s2), Math.round(6 * s2), Math.round(6 * s2));
          ctx.fillStyle = bone; ctx.fillRect(Math.round(kx - 3 * s2), Math.round(ky - 3 * s2), Math.round(6 * s2), Math.round(4 * s2));
          ctx.fillStyle = boneL; ctx.fillRect(Math.round(kx - 3 * s2), Math.round(ky - 3 * s2), Math.round(3 * s2), Math.max(1, Math.round(s2)));
          ctx.fillStyle = '#1a1410'; ctx.fillRect(Math.round(kx - 2 * s2), Math.round(ky - s2), Math.max(1, Math.round(1.4 * s2)), Math.max(1, Math.round(1.4 * s2))); ctx.fillRect(Math.round(kx + 0.6 * s2), Math.round(ky - s2), Math.max(1, Math.round(1.4 * s2)), Math.max(1, Math.round(1.4 * s2)));
          ctx.fillRect(Math.round(kx - s2), Math.round(ky + 1.4 * s2), Math.max(1, Math.round(2 * s2)), Math.max(1, Math.round(s2)));
          for (let q = 0; q < 3; q++) ctx.fillRect(Math.round(kx - 2 * s2 + q * 1.6 * s2), Math.round(ky + 2.6 * s2), Math.max(1, Math.round(s2 * 0.6)), Math.max(1, Math.round(s2)));
          break; }
        case 'tomb': if (layer !== 0) break; {
          // a sarcophagus on the ledge: stone chest, heavy lid, an inscription
          // panel, and if the lid is off, what is left inside
          const w2 = 30 * z, h2 = 14 * z, x0 = Math.round(sx - w2 / 2), y0 = Math.round(sy - h2);
          const st = '#8a8272', stD = '#5e574a', stL = '#aca492';
          ctx.fillStyle = stD; ctx.fillRect(x0, y0, Math.round(w2), Math.round(h2 + z));
          ctx.fillStyle = st; ctx.fillRect(x0 + Math.round(z), y0, Math.round(w2 - 2 * z), Math.round(h2 - z));
          ctx.fillStyle = stL; ctx.fillRect(x0 + Math.round(z), y0, Math.round(w2 - 2 * z), Math.max(1, Math.round(z)));
          // inscription panel
          ctx.fillStyle = stD; ctx.fillRect(x0 + Math.round(6 * z), y0 + Math.round(4 * z), Math.round(w2 - 12 * z), Math.round(6 * z));
          ctx.fillStyle = '#3a3428'; for (let k = 0; k < 4; k++) ctx.fillRect(x0 + Math.round((8 + k * 4) * z), y0 + Math.round(6 * z), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(z)));
          if (d.open) {
            // lid slid off and leaning against the side; bones inside
            ctx.fillStyle = st; ctx.save(); ctx.translate(x0 + Math.round(w2 + 2 * z), y0 + Math.round(h2)); ctx.rotate(-1.15); ctx.fillRect(0, -Math.round(4 * z), Math.round(w2 * 0.9), Math.round(4 * z)); ctx.restore();
            ctx.fillStyle = '#1a160f'; ctx.fillRect(x0 + Math.round(2 * z), y0 - Math.round(2 * z), Math.round(w2 - 4 * z), Math.round(3 * z));
            ctx.fillStyle = '#d8d0b8'; ctx.fillRect(x0 + Math.round(5 * z), y0 - Math.round(z), Math.round(4 * z), Math.round(2 * z)); ctx.fillRect(x0 + Math.round(12 * z), y0 - Math.round(z), Math.round(9 * z), Math.max(1, Math.round(z)));
          } else {
            // the lid, a pitched slab with a lit ridge
            ctx.fillStyle = st; ctx.fillRect(x0 - Math.round(z), y0 - Math.round(4 * z), Math.round(w2 + 2 * z), Math.round(4 * z));
            ctx.fillStyle = stL; ctx.fillRect(x0 - Math.round(z), y0 - Math.round(4 * z), Math.round(w2 + 2 * z), Math.max(1, Math.round(z)));
            ctx.fillStyle = stD; ctx.fillRect(x0 - Math.round(z), y0 - Math.round(z), Math.round(w2 + 2 * z), Math.max(1, Math.round(z)));
          }
          if (d.v) { ctx.fillStyle = '#6a7a4a'; for (let k = 0; k < 4; k++) ctx.fillRect(x0 + Math.round((3 + k * 7) * z), y0 + Math.round((9 + (k % 2) * 3) * z), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(2 * z))); } // moss
          break; }
        case 'labtank': if (layer !== 0) break; {
          // a containment column on the wall: steel base and cap, green fluid,
          // a specimen hanging in it, bubbles, a readout that blinks
          const tw = 26 * z, th2 = 70 * z, x0 = Math.round(sx - tw / 2), y0 = Math.round(sy - th2 - 10 * z);
          ctx.fillStyle = '#2a343a'; ctx.fillRect(x0 - Math.round(2 * z), Math.round(sy - 10 * z), Math.round(tw + 4 * z), Math.round(10 * z));
          ctx.fillStyle = '#0d2a24'; ctx.fillRect(x0, y0, Math.round(tw), Math.round(th2));
          ctx.fillStyle = '#165444'; ctx.fillRect(x0, y0 + Math.round(6 * z), Math.round(tw), Math.round(th2 - 6 * z));
          ctx.fillStyle = '#227058'; ctx.fillRect(x0, y0 + Math.round(6 * z), Math.round(tw), Math.max(1, Math.round(2 * z)));
          // the specimen: a dark shape, one of four, drifting
          const dy = Math.sin(t * 0.8 + d.ph) * 2 * z, cx2 = sx, cy2 = y0 + th2 * 0.55 + dy;
          ctx.fillStyle = '#11332a';
          if (d.v === 0) { ctx.fillRect(Math.round(cx2 - 9 * z), Math.round(cy2 - 3 * z), Math.round(18 * z), Math.round(6 * z)); ctx.fillRect(Math.round(cx2 + 6 * z), Math.round(cy2 - 2 * z), Math.round(6 * z), Math.round(3 * z)); }   // a small croc
          else if (d.v === 1) { for (let k = 0; k < 5; k++) ctx.fillRect(Math.round(cx2 - 6 * z + k * 3 * z), Math.round(cy2 - 12 * z + Math.sin(k * 1.4 + t) * 5 * z), Math.round(3 * z), Math.round(6 * z)); }     // a snake coil
          else if (d.v === 2) { ctx.fillRect(Math.round(cx2 - 4 * z), Math.round(cy2 - 10 * z), Math.round(8 * z), Math.round(20 * z)); ctx.fillRect(Math.round(cx2 - 7 * z), Math.round(cy2 - 4 * z), Math.round(14 * z), Math.round(4 * z)); }  // something upright
          else { ctx.fillRect(Math.round(cx2 - 5 * z), Math.round(cy2 - 5 * z), Math.round(10 * z), Math.round(10 * z)); ctx.fillStyle = '#e0e0d0'; ctx.fillRect(Math.round(cx2 - 2 * z), Math.round(cy2 - 2 * z), Math.round(2 * z), Math.round(2 * z)); }   // a skull
          for (let k = 0; k < 4; k++) { const bph = ((t * 0.4) + ihash(k, Math.floor(d.x))) % 1; ctx.fillStyle = 'rgba(190,240,230,0.5)'; ctx.fillRect(Math.round(x0 + 4 * z + ihash(k, 7) * (tw - 8 * z)), Math.round(y0 + th2 - bph * (th2 - 8 * z)), Math.max(1, Math.round(z)), Math.max(1, Math.round(z))); }
          ctx.fillStyle = 'rgba(210,240,235,0.35)'; ctx.fillRect(x0 + Math.round(2 * z), y0 + Math.round(8 * z), Math.max(1, Math.round(2 * z)), Math.round(th2 - 12 * z));
          ctx.strokeStyle = 'rgba(200,230,225,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, Math.round(tw) - 1, Math.round(th2) - 1);
          ctx.fillStyle = '#2a343a'; ctx.fillRect(x0 - Math.round(2 * z), y0 - Math.round(7 * z), Math.round(tw + 4 * z), Math.round(8 * z));
          ctx.fillStyle = Math.floor(t * 2 + d.ph) % 2 ? '#40f070' : '#207038'; ctx.fillRect(x0 + Math.round(3 * z), y0 - Math.round(5 * z), Math.round(4 * z), Math.round(3 * z));
          ctx.fillStyle = '#c0c8c4'; ctx.fillRect(x0 + Math.round(9 * z), y0 - Math.round(5 * z), Math.round(12 * z), Math.max(1, Math.round(z)));
          break; }
        case 'console': if (layer !== 0) break; {
          // a desk with a monitor on it, a keyboard, a chair pushed back
          const w2 = 30 * z, h2 = 14 * z, x0 = Math.round(sx - w2 / 2), y0 = Math.round(sy - h2);
          ctx.fillStyle = '#4a5258'; ctx.fillRect(x0, y0, Math.round(w2), Math.round(h2));
          ctx.fillStyle = '#5c666c'; ctx.fillRect(x0, y0, Math.round(w2), Math.max(1, Math.round(2 * z)));
          ctx.fillStyle = '#2a3236'; ctx.fillRect(x0 + Math.round(2 * z), y0 + Math.round(3 * z), Math.round(w2 - 4 * z), Math.max(1, Math.round(z)));
          const mx = x0 + Math.round(6 * z), my = y0 - Math.round(16 * z);
          ctx.fillStyle = '#1a2226'; ctx.fillRect(mx, my, Math.round(16 * z), Math.round(12 * z));
          const on = d.v !== 2 || Math.sin(t * 5 + d.ph) > 0;
          ctx.fillStyle = on ? (d.v === 1 ? '#3a8ad0' : '#2fd08a') : '#0a1412'; ctx.fillRect(mx + Math.round(z), my + Math.round(z), Math.round(14 * z), Math.round(9 * z));
          if (on) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 4; k++) ctx.fillRect(mx + Math.round(2 * z), my + Math.round((2 + k * 2) * z), Math.round((4 + ihash(k, Math.floor(d.x) + Math.floor(t)) * 8) * z), Math.max(1, Math.round(z))); }
          ctx.fillStyle = '#3a4448'; ctx.fillRect(mx + Math.round(6 * z), my + Math.round(12 * z), Math.round(4 * z), Math.round(4 * z));
          ctx.fillStyle = '#2a3236'; ctx.fillRect(x0 + Math.round(w2 - 10 * z), y0 - Math.round(3 * z), Math.round(8 * z), Math.round(3 * z));                // keyboard
          // a chair
          ctx.fillStyle = '#26303a'; ctx.fillRect(x0 - Math.round(12 * z), Math.round(sy - 12 * z), Math.round(8 * z), Math.round(3 * z)); ctx.fillRect(x0 - Math.round(12 * z), Math.round(sy - 26 * z), Math.round(2 * z), Math.round(14 * z)); ctx.fillRect(x0 - Math.round(9 * z), Math.round(sy - 9 * z), Math.round(2 * z), Math.round(9 * z));
          break; }
        case 'cable': if (layer !== 0) break; {
          // loose cable off the tray, hanging in loops down the wall, plugged into a box
          const top = cam.toScreen(d.x, this.roofY(d.x) === null ? d.y - 200 : this.roofY(d.x) + 50)[1];
          for (let i = 0; i < d.n; i++) {
            const ox = (i - (d.n - 1) / 2) * 6 * z, sag = (20 + ihash(i, Math.floor(d.x)) * 30) * z;
            blade(sx + ox, top, sx + ox + 14 * z, sy - 30 * z - ihash(i, 3) * 20 * z, sx + ox + 4 * z, top + sag, 1.4 * z, '#1a1a1a', '#2c2c30', '#4a4a50', { strap: true });
          }
          ctx.fillStyle = '#3a4448'; ctx.fillRect(Math.round(sx + 8 * z), Math.round(sy - 40 * z), Math.round(12 * z), Math.round(10 * z));
          ctx.fillStyle = Math.sin(t * 4 + d.ph) > 0 ? '#ff5030' : '#602018'; ctx.fillRect(Math.round(sx + 10 * z), Math.round(sy - 38 * z), Math.round(2 * z), Math.round(2 * z));
          break; }
        case 'biohaz': if (layer !== 0) break; {
          // a yellow drum with the trefoil, and a puddle under it
          const w2 = 14 * z, h2 = 20 * z, x0 = Math.round(sx - w2 / 2), y0 = Math.round(sy - h2);
          ctx.fillStyle = '#c8a020'; ctx.fillRect(x0, y0, Math.round(w2), Math.round(h2));
          ctx.fillStyle = '#e0c040'; ctx.fillRect(x0, y0, Math.round(3 * z), Math.round(h2));
          ctx.fillStyle = '#8a6a10'; ctx.fillRect(x0, y0 + Math.round(4 * z), Math.round(w2), Math.max(1, Math.round(z))); ctx.fillRect(x0, y0 + Math.round(h2 - 5 * z), Math.round(w2), Math.max(1, Math.round(z)));
          ctx.fillStyle = '#1a1a1a'; ctx.fillRect(Math.round(sx - 3 * z), Math.round(y0 + 8 * z), Math.round(6 * z), Math.round(6 * z));
          ctx.fillStyle = '#e0c040'; ctx.fillRect(Math.round(sx - z), Math.round(y0 + 10 * z), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(2 * z)));
          ctx.fillStyle = 'rgba(120,200,60,0.4)'; ctx.fillRect(Math.round(sx - 10 * z), Math.round(sy - z), Math.round(20 * z), Math.max(1, Math.round(2 * z)));
          break; }
        case 'skeleton': if (layer !== 0) break; {
          // somebody who sat down against the wall and stayed: a slumped
          // skeleton, skull dropped forward, one arm in the lap, legs out
          const f = d.flip ? -1 : 1, s2 = z, bone = '#d8d0b8', boneD = '#a89e84';
          const px2 = (a, b, w2, h2, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(sx + a * f * s2 - (f < 0 ? w2 * s2 : 0)), Math.round(sy + b * s2), Math.max(1, Math.round(w2 * s2)), Math.max(1, Math.round(h2 * s2))); };
          // pelvis and spine, against the wall
          px2(-4, -8, 8, 4, boneD); for (let k = 0; k < 6; k++) px2(-1, -12 - k * 3, 3, 2, k % 2 ? bone : boneD);
          // ribs
          for (let k = 0; k < 4; k++) { px2(-5 + k * 0.5, -24 + k * 3, 10 - k, 1, bone); }
          // legs out along the floor, one bent
          px2(2, -6, 14, 2, bone); px2(15, -6, 2, 5, boneD); px2(16, -2, 6, 2, bone);
          px2(1, -8, 9, 2, boneD); px2(9, -8, 2, 6, bone);
          // arm in the lap, arm hanging
          px2(3, -24, 2, 12, bone); px2(3, -13, 8, 2, boneD); px2(-6, -26, 2, 14, boneD);
          // skull, dropped forward onto the chest
          px2(0, -34, 8, 8, bone); px2(0, -31, 8, 5, boneD); px2(2, -32, 2, 2, '#1a1410'); px2(5, -32, 2, 2, '#1a1410'); px2(2, -28, 4, 1, '#1a1410');
          if (d.v) { // what they had with them: a bottle and a blanket
            px2(-12, -6, 3, 6, '#3a7a5a'); px2(-12, -8, 1, 2, '#2a5a44');
            ctx.globalAlpha = 0.6; px2(-8, -4, 22, 3, '#4a3a5a'); ctx.globalAlpha = 1;
          }
          break; }
        case 'urn': if (layer !== 0) break; {
          // amphorae: a pale clay body, two handles, a dark mouth, some broken
          const s2 = d.s * z, seed = Math.floor(d.x);
          for (let i = 0; i < d.n; i++) {
            const ox = (i - (d.n - 1) / 2) * 11 * s2, broken = ihash(i, seed + 2) < 0.3, hh = (broken ? 7 : 12) * s2;
            const bx = Math.round(sx + ox), by = Math.round(sy);
            ctx.fillStyle = '#8a6a48'; ctx.fillRect(bx - Math.round(3.5 * s2), by - Math.round(hh), Math.round(7 * s2), Math.round(hh));
            ctx.fillStyle = '#a88460'; ctx.fillRect(bx - Math.round(3.5 * s2), by - Math.round(hh), Math.round(2 * s2), Math.round(hh));
            ctx.fillStyle = '#5e4630'; ctx.fillRect(bx - Math.round(3.5 * s2), by - Math.round(hh * 0.45), Math.round(7 * s2), Math.max(1, Math.round(s2)));
            if (!broken) {
              ctx.fillStyle = '#6e5238'; ctx.fillRect(bx - Math.round(2 * s2), by - Math.round(hh + 2 * s2), Math.round(4 * s2), Math.round(2 * s2));
              ctx.fillStyle = '#1a140c'; ctx.fillRect(bx - Math.round(1.5 * s2), by - Math.round(hh + 2 * s2), Math.round(3 * s2), Math.max(1, Math.round(s2)));
              ctx.fillStyle = '#8a6a48'; ctx.fillRect(bx - Math.round(5 * s2), by - Math.round(hh - s2), Math.max(1, Math.round(1.5 * s2)), Math.round(4 * s2)); ctx.fillRect(bx + Math.round(3.5 * s2), by - Math.round(hh - s2), Math.max(1, Math.round(1.5 * s2)), Math.round(4 * s2));
            } else { ctx.fillStyle = '#5e4630'; for (let k = 0; k < 3; k++) ctx.fillRect(bx - Math.round(3 * s2) + Math.round(k * 2.4 * s2), by - Math.round(hh + (k % 2) * s2), Math.max(1, Math.round(s2)), Math.max(1, Math.round(2 * s2))); }
          }
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
    // Mist gathers on open water at dawn. Under the city there is no dawn, and
    // three banks of it lying across the bore was the single messiest thing in
    // the system: a grey stripe over the waterline that never went away.
    if (this.isIndoor(cam.x)) return;
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
