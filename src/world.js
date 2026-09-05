'use strict';
// Procedural Everglades: heightmap terrain with banks, chunked decor, sky/day cycle, water rendering.
const World = {
  seed: 1, CHUNK: 640, chunks: new Map(), decor: [], t: 0, onChunkLoad: null,
  reset(seed) { this.seed = seed | 0; this.chunks.clear(); this.decor = []; this.t = 0; },
  // ---------- terrain ----------
  floorY(x) { return MapData.floorY(x); },
  // inside the lab and sewer the world has a ceiling; elsewhere it is open sky
  roofY(x) {
    const B = Biome.at(x); if (!B.indoor) return null;
    const r = B.roof + Math.sin(x * 0.02) * 3 + vnoise(x * 0.05, 21) * 6;
    // the mouth of the tunnel flares open so daylight leaks in
    if (B.id === 'sewer' && x > -320) return r - (x + 320) * 0.45;
    return r;
  },
  isIndoor(x) { const r = this.roofY(x); return r !== null && r < -20; },
  isLand(x) { return this.floorY(x) < 0; },
  surface(x) { return Water.surface(x); },
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
      ctx.fillStyle = halo; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(px, py, r * 2.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
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
  drawParallax(ctx, cam, day) {
    const W = G.W, hy = cam.toScreen(0, 0)[1], sc = this.skyColors(day), light = this.light(day);
    if (hy < -50) return;
    const BP = Biome.mixPal(cam.x), kinds = BP.parallax;
    const layers = [
      { f: 0.12, col: mixColor(sc.bot, '#24402a', 0.4), h: 40, seed: 7, trees: 0.3, dens: 110 },
      { f: 0.18, col: mixColor(sc.bot, '#1e3a24', 0.55), h: 34, seed: 11, trees: 0.62, dens: 62 },
      { f: 0.36, col: mixColor(sc.bot, '#14301c', 0.78), h: 26, seed: 23, trees: 0.8, dens: 44 },
      { f: 0.58, col: mixColor(sc.bot, '#0c2012', 0.9), h: 16, seed: 37, trees: 0.9, dens: 34 },
    ];
    for (const L of layers) {
      ctx.fillStyle = L.col;
      const ox = cam.x * L.f;
      // brush line
      ctx.beginPath(); ctx.moveTo(0, hy + 2);
      for (let sx = 0; sx <= W; sx += 4) { const wx = ox + sx; const h = (fbm(wx * 0.012, L.seed) * 0.8 + 0.2) * L.h; ctx.lineTo(sx, hy - h); }
      ctx.lineTo(W, hy + 2); ctx.closePath(); ctx.fill();
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
        if (kindName === 'pipe') { ctx.fillRect(Math.round(sx - 14), Math.round(hy - 26), 28, 12); ctx.fillRect(Math.round(sx - 3), Math.round(hy - 16), 6, 18); continue; }
        if (kindName === 'sawgrass') { for (let q = 0; q < 9; q++) { const gx = sx - 16 + q * 4; ctx.beginPath(); ctx.moveTo(gx, hy + 2); ctx.lineTo(gx + (q % 2 ? 3 : -3), hy - 12 - ihash(k * 7 + q, L.seed) * 12); ctx.lineWidth = 2; ctx.strokeStyle = L.col; ctx.stroke(); } continue; }
        const kind = kindName === 'palm' ? 0.7 : kindName === 'mangrove' ? 0.9 : 0.2;
        if (kind < 0.6) { // cypress: trunk + layered canopy
          ctx.fillRect(Math.round(sx), Math.round(hy - th), Math.round(tw), Math.round(th));
          ctx.fillRect(Math.round(sx - tw), Math.round(hy - 8), Math.round(tw * 3), 8);
          for (let j = 0; j < 4; j++) { const cw = (26 - j * 5) * (0.7 + ihash(k * 3 + j, L.seed) * 0.6), cy = hy - th * (0.45 + j * 0.16); ctx.fillRect(Math.round(sx + tw / 2 - cw / 2), Math.round(cy), Math.round(cw), Math.round(th * 0.09 + 2)); }
          // moss strands
          for (let j = 0; j < 3; j++) { const mx = sx + tw / 2 + (ihash(k * 5 + j, L.seed + 1) - 0.5) * 20; ctx.fillRect(Math.round(mx), Math.round(hy - th * 0.55), 1, Math.round(10 + ihash(k * 7 + j, L.seed + 2) * 14)); }
        } else if (kind < 0.85) { // palm
          ctx.fillRect(Math.round(sx), Math.round(hy - th * 0.7), 2, Math.round(th * 0.7));
          for (let j = 0; j < 6; j++) { const a = -Math.PI * 0.9 + j * 0.3, len = 14 + ihash(k * 11 + j, L.seed) * 8; ctx.beginPath(); ctx.moveTo(sx + 1, hy - th * 0.7); ctx.lineTo(sx + 1 + Math.cos(a) * len, hy - th * 0.7 + Math.sin(a) * len + 8); ctx.lineWidth = 2; ctx.strokeStyle = L.col; ctx.stroke(); }
        } else { // mangrove clump
          ctx.fillRect(Math.round(sx - 10), Math.round(hy - 18), 24, 12);
          for (let j = 0; j < 5; j++) ctx.fillRect(Math.round(sx - 8 + j * 5), Math.round(hy - 8), 1, 9);
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
    const W = G.W, H = G.H, hy = cam.toScreen(0, 0)[1];
    if (hy > H) return;
    const bands = this.waterBands(day), light = this.light(day);
    for (let i = bands.length - 1; i >= 0; i--) {
      const y0 = cam.toScreen(0, bands[i][0])[1];
      if (y0 > H) continue;
      ctx.fillStyle = bands[i][1]; ctx.fillRect(0, Math.max(Math.round(y0), Math.round(hy)), W, H - Math.max(y0, hy) + 2);
    }
    // sun shafts: chunky angled bars
    if (light > 0.3) {
      ctx.globalAlpha = 0.07 * light; ctx.fillStyle = '#d8fff0';
      for (let i = 0; i < 5; i++) {
        const rx = ((ihash(i, 55) * 900 - cam.x * 0.35 * cam.zoom) % 900 + 900) % 900 - 120 + Math.sin(this.t * 0.35 + i) * 12;
        const rw = (10 + ihash(i, 56) * 16) * cam.zoom, len = 260 * cam.zoom;
        for (let k = 0; k < 10; k++) { const yy = hy + k * len / 10; if (yy > H) break; ctx.fillRect(Math.round(rx + k * 5), Math.round(yy), Math.round(rw), Math.ceil(len / 10) + 1); }
      }
      ctx.globalAlpha = 1;
    }
    // caustic blobs just under the surface
    if (light > 0.25) {
      ctx.globalAlpha = 0.1 * light; ctx.fillStyle = '#dafff2';
      for (let sx2 = -8; sx2 < W + 8; sx2 += 7) {
        const wx = cam.toWorldX(sx2), band = Math.sin(wx * 0.06 + this.t * 1.8) + Math.sin(wx * 0.026 - this.t * 1.2);
        if (band > 0.75) { const sy2 = cam.toScreen(wx, this.surface(wx) + 4)[1]; const hgt = Math.round((3 + band * 3) * cam.zoom); ctx.fillRect(sx2, Math.round(sy2), Math.round(5 * cam.zoom), hgt); }
      }
      ctx.globalAlpha = 1;
    }
    // drifting specks
    ctx.fillStyle = '#9ad0c0'; ctx.globalAlpha = 0.25;
    for (let i = 0; i < 34; i++) {
      const wx = cam.x + ((ihash(i, 70) * 900 - 450) + Math.sin(this.t * 0.3 + i) * 20);
      const wy = 20 + ihash(i, 71) * 700 + Math.sin(this.t * 0.5 + i * 2) * 10;
      const [px2, py2] = cam.toScreen(wx, wy);
      if (px2 < 0 || px2 > W || py2 < hy || py2 > H) continue;
      ctx.fillRect(Math.round(px2), Math.round(py2), 1, ihash(i, 72) > 0.7 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  },
  drawTerrain(ctx, cam) {
    const W = G.W, H = G.H, step = 4, BP = Biome.mixPal(cam.x);
    const pts = [];
    for (let sx = -step; sx <= W + step; sx += step) { const wx = cam.toWorldX(sx); pts.push([sx, cam.toScreen(wx, this.floorY(wx))[1], wx]); }
    // mud body
    ctx.fillStyle = BP.ground[1];
    ctx.beginPath(); ctx.moveTo(pts[0][0], H + 10);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(pts[pts.length - 1][0], H + 10); ctx.closePath(); ctx.fill();
    // strata + roots
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], wx = p[2];
      for (let k = 0; k < 4; k++) {
        const depth = 10 + k * 34 + Math.sin(wx * (0.02 + k * 0.007) + k) * 4 + vnoise(wx * 0.05, k) * 6;
        const y = p[1] + depth * cam.zoom; if (y > H) break;
        ctx.fillStyle = k % 2 ? BP.ground[2] : BP.ground[0]; ctx.fillRect(p[0], Math.round(y), step, Math.max(1, Math.round((k % 2 ? 2 : 1.5) * cam.zoom)));
      }
      if (ihash(Math.floor(wx / 4), 17) < 0.06 && this.floorY(wx) < 0) { ctx.fillStyle = '#2a1e12'; const ry = p[1] + (3 + ihash(Math.floor(wx / 4), 18) * 20) * cam.zoom; ctx.fillRect(p[0], Math.round(ry), Math.max(1, Math.round(cam.zoom)), Math.round((6 + ihash(Math.floor(wx / 4), 19) * 16) * cam.zoom)); }
      // limestone shelf and old shell layer
      const ls = p[1] + (52 + Math.sin(wx * 0.006) * 12) * cam.zoom;
      if (ls < H) { ctx.fillStyle = '#6b6455'; ctx.fillRect(p[0], Math.round(ls), step, Math.max(1, Math.round(3 * cam.zoom))); ctx.fillStyle = '#57503f'; ctx.fillRect(p[0], Math.round(ls + 3 * cam.zoom), step, Math.max(1, Math.round(cam.zoom))); }
      const sh = p[1] + (26 + Math.sin(wx * 0.011 + 2) * 6) * cam.zoom;
      if (sh < H && ihash(Math.floor(wx / 4), 23) < 0.35) { ctx.fillStyle = '#b3a98d'; ctx.fillRect(p[0], Math.round(sh), Math.max(1, Math.round(2 * cam.zoom)), Math.max(1, Math.round(cam.zoom))); }
      if (ihash(Math.floor(wx / 4), 27) < 0.2) { ctx.fillStyle = '#241a10'; ctx.fillRect(p[0], Math.round(p[1] + (8 + ihash(Math.floor(wx / 4), 28) * 34) * cam.zoom), Math.max(1, Math.round(cam.zoom)), Math.max(1, Math.round(cam.zoom))); }
    }
    // top band
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], wx = p[2], fy = this.floorY(wx);
      const md = Mud.depth(wx) * cam.zoom;
      const ty = Math.round(p[1] + md);
      if (md > 0.8) { ctx.fillStyle = '#2e2216'; ctx.fillRect(p[0], Math.round(p[1]), step, Math.round(md)); }
      const gz = Math.max(1, Math.round(2 * cam.zoom));
      if (fy < 0) { // land: a bright grass lip with tufts hanging over the bank
        ctx.fillStyle = BP.grass; ctx.fillRect(p[0], ty - gz, step, gz * 1.5);
        ctx.fillStyle = shade(BP.grass, 0.7); ctx.fillRect(p[0], ty + gz * 0.5, step, gz);
        ctx.fillStyle = BP.ground[0]; ctx.fillRect(p[0], ty + gz * 1.5, step, gz);
        if (ihash(Math.floor(wx / 4), 5) < 0.35) { ctx.fillStyle = mixColor(BP.grass, '#ffffff', 0.25); ctx.fillRect(p[0], ty - gz - Math.round(cam.zoom), Math.max(1, Math.round(cam.zoom)), Math.max(1, Math.round(cam.zoom * 2))); }
        if (fy > -26 && ihash(Math.floor(wx / 7), 15) < 0.4) { ctx.fillStyle = shade(BP.grass, 0.55); ctx.fillRect(p[0], ty + gz * 1.2, Math.max(1, Math.round(cam.zoom)), Math.round((3 + ihash(Math.floor(wx / 7), 16) * 5) * cam.zoom)); }
      } else if (fy < 34) { // wet shore: pale sand fading into mud
        ctx.fillStyle = mixColor(BP.ground[0], '#d8c8a0', 0.45 - fy * 0.008); ctx.fillRect(p[0], ty, step, gz * 1.5);
        ctx.fillStyle = BP.ground[0]; ctx.fillRect(p[0], ty + gz * 1.5, step, gz);
      } else {
        ctx.fillStyle = fy > 450 ? BP.ground[2] : BP.ground[0]; ctx.fillRect(p[0], ty, step, Math.max(1, Math.round(1.5 * cam.zoom)));
      }
      // pebbles / roots texture
      const r = ihash(Math.floor(wx / 4), 9);
      if (r < 0.12) { ctx.fillStyle = r < 0.05 ? '#5a4a34' : '#2a1e12'; ctx.fillRect(p[0], ty + Math.round((4 + r * 120) * cam.zoom), Math.max(1, Math.round(cam.zoom)), Math.max(1, Math.round(cam.zoom))); }
    }
  },
  // concrete shell of the lab and sewer: ceiling, back wall, ribs and lamps
  drawIndoor(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom, step = 4;
    if (!this.isIndoor(cam.toWorldX(W / 2)) && !this.isIndoor(cam.toWorldX(0)) && !this.isIndoor(cam.toWorldX(W))) return;
    const B = Biome.mixPal(cam.x);
    // back wall behind everything
    ctx.fillStyle = B.ground[2]; ctx.fillRect(0, 0, W, H);
    for (let sx = 0; sx < W; sx += 8) {
      const wx = cam.toWorldX(sx), hcol = ihash(Math.floor(wx / 26), 5);
      ctx.fillStyle = hcol < 0.3 ? shade(B.ground[2], 1.14) : hcol < 0.6 ? shade(B.ground[2], 0.9) : B.ground[2];
      ctx.fillRect(sx, 0, 8, H);
    }
    // brick courses
    ctx.globalAlpha = 0.25;
    for (let sy = 0; sy < H; sy += Math.max(4, Math.round(9 * z))) {
      ctx.fillStyle = shade(B.ground[2], 0.7); ctx.fillRect(0, sy, W, 1);
      for (let sx = (Math.floor(sy / 9) % 2) * 12; sx < W; sx += Math.max(8, Math.round(24 * z))) ctx.fillRect(sx, sy, 1, Math.max(4, Math.round(9 * z)));
    }
    ctx.globalAlpha = 1;
    // ceiling slab
    ctx.beginPath(); ctx.moveTo(-4, -10);
    for (let sx = -step; sx <= W + step; sx += step) { const wx = cam.toWorldX(sx), r = this.roofY(wx); ctx.lineTo(sx, r === null ? -20 : cam.toScreen(wx, r)[1]); }
    ctx.lineTo(W + 4, -10); ctx.closePath();
    ctx.fillStyle = B.ground[0]; ctx.fill();
    for (let sx = -step; sx <= W + step; sx += step) {
      const wx = cam.toWorldX(sx), r = this.roofY(wx); if (r === null) continue;
      const sy = cam.toScreen(wx, r)[1];
      ctx.fillStyle = shade(B.ground[0], 0.55); ctx.fillRect(sx, Math.round(sy) - Math.max(1, Math.round(2 * z)), step, Math.max(1, Math.round(2 * z)));
      ctx.fillStyle = shade(B.ground[0], 1.2); ctx.fillRect(sx, Math.round(sy) - Math.max(2, Math.round(4 * z)), step, Math.max(1, Math.round(z)));
    }
    // ribs, hanging lamps and dripping pipes
    const left = cam.toWorldX(-60), right = cam.toWorldX(W + 60);
    for (let wx = Math.floor(left / 150) * 150; wx < right; wx += 150) {
      const r = this.roofY(wx); if (r === null) continue;
      const [sx, sy] = cam.toScreen(wx, r), fy = cam.toScreen(wx, this.floorY(wx))[1];
      ctx.fillStyle = shade(B.ground[0], 0.75); ctx.fillRect(Math.round(sx - 3 * z), Math.round(sy), Math.round(6 * z), Math.round(fy - sy));
      ctx.fillStyle = shade(B.ground[0], 1.1); ctx.fillRect(Math.round(sx - 3 * z), Math.round(sy), Math.max(1, Math.round(z)), Math.round(fy - sy));
      // lamp
      const lx = wx + 75, lr = this.roofY(lx); if (lr === null) continue;
      const [lsx, lsy] = cam.toScreen(lx, lr);
      const on = ihash(Math.floor(lx / 150), 9) > 0.25 || Math.sin(this.t * 9 + lx) > 0;
      ctx.fillStyle = '#2a2e30'; ctx.fillRect(Math.round(lsx - z), Math.round(lsy), Math.max(1, Math.round(2 * z)), Math.round(5 * z));
      ctx.fillStyle = on ? '#ffe8a0' : '#3a3a34'; ctx.fillRect(Math.round(lsx - 5 * z), Math.round(lsy + 5 * z), Math.round(10 * z), Math.round(3 * z));
      if (on) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(lsx, lsy + 6 * z, 2, lsx, lsy + 6 * z, 70 * z); g.addColorStop(0, 'rgba(255,224,150,0.22)'); g.addColorStop(1, 'rgba(255,224,150,0)'); ctx.fillStyle = g; ctx.fillRect(lsx - 70 * z, lsy, 140 * z, 150 * z); ctx.globalCompositeOperation = 'source-over'; }
      if (chance(0.02)) G.fx.add({ type: 'drop', x: lx + rand(-30, 30), y: lr + 8, vx: 0, vy: 20, s: 1, color: '#9ab0b8', life: 3 });
    }
  },
  drawDepthShade(ctx, cam) {
    const H = G.H, hy = cam.toScreen(0, 0)[1];
    const y0 = cam.toScreen(0, 220)[1];
    if (y0 > H) return;
    const g = ctx.createLinearGradient(0, Math.max(y0, hy), 0, H);
    g.addColorStop(0, 'rgba(2,8,10,0)'); g.addColorStop(1, 'rgba(2,8,10,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, Math.max(y0, hy), G.W, H);
  },
  drawDecor(ctx, cam, layer, day) {
    // layer 0 = behind entities (weeds, rocks, logs, reeds, trees), 1 = in front (lilies, sawgrass, fireflies)
    const W = G.W, z = cam.zoom, t = this.t, light = this.light(day), night = 1 - light;
    const left = cam.toWorldX(-80), right = cam.toWorldX(W + 80);
    for (const d of this.decor) {
      if (d.x < left) continue; if (d.x > right) break;
      const [sx, sy] = cam.toScreen(d.x, d.y);
      switch (d.type) {
        case 'seagrass': if (layer !== 0) break; {
          ctx.strokeStyle = d.v ? '#3f8a6a' : '#4f9a72'; ctx.lineWidth = Math.max(1, 1.6 * z);
          for (let b = -2; b <= 2; b++) { const sway = (Math.sin(t * 1.1 + d.ph + b * 0.5) * 5 + (d.bend || 0) * 3) * z; ctx.beginPath(); ctx.moveTo(sx + b * 2 * z, sy); ctx.quadraticCurveTo(sx + b * 3 * z + sway * 0.5, sy - d.h * z * 0.6, sx + b * 3 * z + sway, sy - d.h * z); ctx.stroke(); }
          break; }
        case 'oyster': if (layer !== 0) break; {
          for (let i = 0; i < d.n; i++) { const ox = (ihash(i, Math.floor(d.x)) - 0.5) * 22 * z, oy = ihash(i, 61) * 4 * z;
            ctx.fillStyle = i % 2 ? '#8a8478' : '#6f6a5e'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - 4 * z - oy), Math.max(1, Math.round(3 * z)), Math.max(1, Math.round(5 * z)));
            ctx.fillStyle = '#b0aa9a'; ctx.fillRect(Math.round(sx + ox), Math.round(sy - 4 * z - oy), Math.max(1, Math.round(z)), Math.max(1, Math.round(2 * z))); }
          break; }
        case 'coral': if (layer !== 0) break; {
          const cols = [['#c86a7a', '#e08a98'], ['#c8a050', '#e0c070'], ['#7a9ac0', '#9ab8d8']][d.v % 3];
          for (let b = -1; b <= 1; b++) { const hh = (7 + Math.abs(b) * -2 + 6) * d.s * z; ctx.fillStyle = cols[0]; ctx.fillRect(Math.round(sx + b * 4 * d.s * z), Math.round(sy - hh), Math.max(1, Math.round(3 * d.s * z)), Math.round(hh)); ctx.fillStyle = cols[1]; ctx.fillRect(Math.round(sx + b * 4 * d.s * z), Math.round(sy - hh), Math.max(1, Math.round(z)), Math.round(hh * 0.5)); }
          break; }
        case 'trash': if (layer !== 0) break; {
          const s2 = d.s * z;
          if (d.v === 0) { ctx.fillStyle = '#3a5a8a'; ctx.fillRect(Math.round(sx - 3 * s2), Math.round(sy - 6 * s2), Math.round(6 * s2), Math.round(6 * s2)); ctx.fillStyle = '#6a8ac0'; ctx.fillRect(Math.round(sx - 3 * s2), Math.round(sy - 6 * s2), Math.round(2 * s2), Math.round(4 * s2)); }
          else if (d.v === 1) { ctx.fillStyle = '#8a3a2a'; ctx.fillRect(Math.round(sx - 5 * s2), Math.round(sy - 4 * s2), Math.round(10 * s2), Math.round(4 * s2)); ctx.fillStyle = '#b05a44'; ctx.fillRect(Math.round(sx - 5 * s2), Math.round(sy - 4 * s2), Math.round(10 * s2), Math.max(1, Math.round(s2))); }
          else if (d.v === 2) { ctx.fillStyle = '#c0c8c8'; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(sx - 4 * s2 + i * 2.5 * s2), Math.round(sy - 3 * s2 - ihash(i, 9) * 2 * s2), Math.max(1, Math.round(2 * s2)), Math.max(1, Math.round(3 * s2))); }
          else { ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.arc(sx, sy - 4 * s2, 4 * s2, 0, TAU); ctx.fill(); ctx.fillStyle = '#6a6a6a'; ctx.beginPath(); ctx.arc(sx, sy - 4 * s2, 2 * s2, 0, TAU); ctx.fill(); }
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
          ctx.fillStyle = '#23231f'; ctx.beginPath(); ctx.ellipse(sx + w / 2 - 2 * s2, sy - h / 2, 3 * s2, h * 0.42, 0, 0, TAU); ctx.fill();
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
          ctx.strokeStyle = d.v ? '#2f6a3a' : '#3f7a44'; ctx.lineWidth = Math.max(1, z);
          for (let b = -1; b <= 1; b++) {
            const sway = (Math.sin(t * 1.3 + d.ph + b) * 4 + (d.bend || 0) * 3) * z;
            ctx.beginPath(); ctx.moveTo(sx + b * 2 * z, sy); ctx.quadraticCurveTo(sx + b * 3 * z + sway * 0.5, sy - d.h * z * 0.6, sx + b * 4 * z + sway, sy - d.h * z); ctx.stroke();
          }
          break; }
        case 'rock': if (layer !== 0) break; { const s = SPR.rock[d.v]; drawSpr(ctx, s, sx, sy - s.h * d.s * z * 0.5 + 1, 0, d.s * z, d.s * z); break; }
        case 'log': if (layer !== 0) break; { const s = SPR.log[0]; drawSpr(ctx, s, sx, sy - s.h * d.s * z * 0.5 + 1, 0, d.s * z, d.s * z); break; }
        case 'skull': if (layer !== 0) break; drawSpr(ctx, SPR.skull, sx, sy - 2 * z, 0, z, z); break;
        case 'lily': if (layer !== 1) break; { const s = SPR.lily[d.v]; const wy = cam.toScreen(d.x, this.surface(d.x))[1]; drawSpr(ctx, s, sx, wy - 1 * z, 0, z, z, s.w / 2, s.h - 1); break; }
        case 'reed': if (layer !== 0) break; {
          const top = cam.toScreen(d.x, d.top)[1]; const sway = (Math.sin(t * 1.1 + d.ph) * 3 + (d.bend || 0) * 4) * z;
          ctx.strokeStyle = '#4f7a3a'; ctx.lineWidth = Math.max(1, z); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sway * 0.3, (sy + top) / 2, sx + sway, top); ctx.stroke();
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
          ctx.strokeStyle = d.v ? 'rgba(90,150,90,0.5)' : 'rgba(120,170,110,0.42)'; ctx.lineWidth = Math.max(1, 2 * z);
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
          const cols = ['#2f5a24', '#3a6a2a', '#27491d'], w = 16 * d.s * z, h = 12 * d.s * z;
          ctx.fillStyle = cols[d.v]; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h), Math.round(w), Math.round(h));
          ctx.fillStyle = cols[(d.v + 1) % 3]; ctx.fillRect(Math.round(sx - w / 2 + 2 * z), Math.round(sy - h - 3 * z), Math.round(w - 4 * z), Math.round(4 * z));
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - 2 * z), Math.round(w), Math.round(2 * z));
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
          ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = tw; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sway * 0.5, sy - h * 0.6, sx + sway, sy - h); ctx.stroke();
          ctx.fillStyle = '#5a4a2a'; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(sx + sway * (i / 6) - tw / 2), Math.round(sy - h * (i / 6)), Math.round(tw), Math.max(1, Math.round(z)));
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
          const cols = ['#2f5a2a', '#356630', '#27491d'];
          for (let i = 0; i < 5; i++) {
            const cx2 = sx + (ihash(d.v * 9 + i, 31) - 0.5) * 44 * z, cy2 = sy - h - (ihash(i, 32) - 0.2) * 14 * z, rw = (16 + ihash(i, 33) * 14) * z;
            ctx.fillStyle = cols[i % 3]; ctx.fillRect(Math.round(cx2 - rw / 2), Math.round(cy2), Math.round(rw), Math.round(rw * 0.62));
          }
          if (d.moss) { ctx.fillStyle = '#93a077'; for (let j = 0; j < 6; j++) { const mx = sx + (ihash(d.v * 5 + j, 34) - 0.5) * 46 * z; ctx.fillRect(Math.round(mx), Math.round(sy - h + 2 * z), Math.max(1, Math.round(z)), Math.round((10 + ihash(j, 35) * 20) * z)); } }
          break; }
        case 'cypress': if (layer !== 0) break; {
          const h = d.h * z, tw = 4 * z; if (d.shake) { ctx.save(); ctx.translate(Math.sin(t * 40) * d.shake * 2 * z, 0); }
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - h), Math.round(tw), Math.round(h + 2));
          ctx.fillRect(Math.round(sx - tw * 1.5), Math.round(sy - 8 * z), Math.round(tw * 3), Math.round(8 * z)); // buttress
          ctx.fillStyle = '#2a1e12'; ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - h), Math.max(1, Math.round(z)), Math.round(h));
          const cols = ['#2f5a2a', '#3a6a30', '#2a4a22'];
          for (let j = 0; j < 5; j++) { const cw = (30 - j * 5) * z * (0.8 + ihash(d.v * 7 + j, 3) * 0.5), cy = sy - h * (0.4 + j * 0.15); ctx.fillStyle = cols[(j + d.v) % 3]; ctx.fillRect(Math.round(sx - cw / 2), Math.round(cy), Math.round(cw), Math.round(h * 0.08 + 2 * z)); }
          if (d.knees) { ctx.fillStyle = '#4a3a26'; for (let j = 0; j < 4; j++) { const kx = sx + (ihash(d.v * 3 + j, 41) - 0.5) * 34 * z, kh = (5 + ihash(j, 42) * 9) * z; ctx.fillRect(Math.round(kx), Math.round(sy - kh), Math.max(1, Math.round(3 * z)), Math.round(kh)); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(Math.round(kx), Math.round(sy - kh), Math.max(1, Math.round(z)), Math.round(kh)); ctx.fillStyle = '#4a3a26'; } }
          if (d.moss) { ctx.fillStyle = '#8a9a6a'; for (let j = 0; j < 4; j++) { const mx = sx + (ihash(d.v * 11 + j, 4) - 0.5) * 26 * z, my = sy - h * (0.5 + ihash(j, 5) * 0.3); ctx.fillRect(Math.round(mx), Math.round(my), Math.max(1, Math.round(z)), Math.round((8 + ihash(j, 6) * 12) * z)); } }
          if (d.shake) ctx.restore();
          break; }
        case 'stump': if (layer !== 0) break; ctx.fillStyle = '#4a3524'; ctx.fillRect(Math.round(sx - 4 * z), Math.round(sy - 8 * z), Math.round(8 * z), Math.round(9 * z)); ctx.fillStyle = '#6b5a3a'; ctx.fillRect(Math.round(sx - 3 * z), Math.round(sy - 8 * z), Math.round(6 * z), Math.max(1, Math.round(z))); break;
        case 'mangrove': if (layer !== 0) break; {
          ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = Math.max(1, 2 * z);
          const top = sy - 30 * d.s * z;
          for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(sx + j * 2 * z, top); ctx.quadraticCurveTo(sx + j * 12 * d.s * z, top + 14 * z, sx + j * 16 * d.s * z + d.dir * 6 * z, sy + 12 * z); ctx.stroke(); }
          ctx.fillStyle = '#2f5a2a'; ctx.fillRect(Math.round(sx - 18 * d.s * z), Math.round(top - 12 * z), Math.round(36 * d.s * z), Math.round(12 * z));
          ctx.fillStyle = '#3f7a3a'; ctx.fillRect(Math.round(sx - 12 * d.s * z), Math.round(top - 18 * z), Math.round(24 * d.s * z), Math.round(8 * z));
          break; }
      }
    }
  },
  drawSurface(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom, sc = this.skyColors(day), light = this.light(day);
    const hy0 = cam.toScreen(0, 0)[1];
    if (hy0 < -60 || hy0 > H + 60) return;
    const B = Biome.mixPal(cam.x);
    const step = Math.max(2, Math.round(3 * Math.min(1, z)));
    // underwater tint and depth shade, applied under the surface line
    ctx.fillStyle = rgba(mixColor(B.water[0], '#04202a', 0.4), 0.16); ctx.fillRect(0, Math.max(0, Math.round(hy0)), W, H);
    // sample the surface once
    const xs = [], ys = [];
    for (let sx = -step; sx <= W + step; sx += step) { const wx = cam.toWorldX(sx); xs.push([sx, wx]); ys.push(cam.toScreen(wx, this.surface(wx))[1]); }
    const bandH = Math.max(2, Math.round(3 * z)), foam = mixColor('#eafcf6', B.water[0], 0.25), edge = mixColor(B.water[0], '#0a3038', 0.55);
    // the surface reads as a solid pixel band: bright crest, darker lip, then the water body
    for (let i = 0; i < xs.length; i++) {
      const sx = xs[i][0], wx = xs[i][1], sy = Math.round(ys[i]);
      const lift = Water.surface(wx) - Water.ambient(wx), sl = Water.slope(wx);
      // the band is a shallow lip of lit water, brightest where the surface tilts toward the light
      ctx.fillStyle = mixColor(mixColor(B.water[0], sc.bot, 0.35), foam, clamp(0.18 + sl * 1.6 + light * 0.2, 0, 0.8));
      ctx.fillRect(sx, sy - bandH, step, bandH + Math.max(1, Math.round(z)));
      // the white crest line breaks up instead of running flat across the screen
      const crest = ihash(Math.floor(wx / 9), 33) * 0.6 + Math.abs(sl) * 1.4 + clamp(Math.abs(lift) / 10, 0, 0.5);
      if (crest > 0.55) { ctx.globalAlpha = clamp((crest - 0.5) * 1.6, 0, 1); ctx.fillStyle = foam; ctx.fillRect(sx, sy - bandH, step, Math.max(1, Math.round(z))); ctx.globalAlpha = 1; }
      ctx.fillStyle = edge; ctx.fillRect(sx, sy + bandH * 0.4, step, Math.max(1, Math.round(z)));
    }
    // crest foam: round white blobs where the surface is steep or moving fast
    for (let i = 1; i < xs.length - 1; i++) {
      const wx = xs[i][1], vv = Math.abs(Water.velocity(wx)), sl = Math.abs(Water.slope(wx));
      const f = clamp((vv - 16) / 55, 0, 1) + clamp((sl - 0.22) / 0.7, 0, 1);
      if (f <= 0.08) continue;
      const sy = ys[i], r = Math.max(1, Math.round((1.2 + f * 3) * z));
      ctx.globalAlpha = clamp(f, 0, 1) * 0.95; ctx.fillStyle = '#f4fffb';
      ctx.beginPath(); ctx.arc(xs[i][0], sy - r * 0.5, r, 0, TAU); ctx.fill();
      if (f > 0.7) { ctx.globalAlpha = clamp(f - 0.5, 0, 1) * 0.8; ctx.beginPath(); ctx.arc(xs[i][0] + r, sy - r * 1.4, r * 0.6, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // scum and pollen riding the film
    ctx.globalAlpha = 0.2; ctx.fillStyle = B.scum || '#6a7a4a';
    for (let i = 0; i < xs.length; i += 2) { const wx = xs[i][1]; if (ihash(Math.floor(wx / 7), 44) > 0.74) ctx.fillRect(xs[i][0], Math.round(ys[i]) - 1, step, Math.max(1, Math.round(z))); }
    ctx.globalAlpha = 1;
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
    // sparkle chips on the crests
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < xs.length; i += 2) { const wx = xs[i][1]; if (ihash(Math.floor(wx / 4), 21) < 0.07 && Math.sin(this.t * 4 + wx * 0.12) > 0.65) { ctx.globalAlpha = 0.8 * light; ctx.fillRect(xs[i][0], Math.round(ys[i]) - bandH - 1, Math.max(1, Math.round(z)), Math.max(1, Math.round(z))); } }
    ctx.globalAlpha = 1;
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
