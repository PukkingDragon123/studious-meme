'use strict';
// Procedural Everglades: heightmap terrain with banks, chunked decor, sky/day cycle, water rendering.
const World = {
  seed: 1, CHUNK: 640, chunks: new Map(), decor: [], t: 0, onChunkLoad: null,
  reset(seed) { this.seed = seed | 0; this.chunks.clear(); this.decor = []; this.t = 0; },
  // ---------- terrain ----------
  waterFloor(x) { return 360 + fbm(x * 0.0016, this.seed) * 560 + vnoise(x * 0.012, this.seed + 7) * 36; },
  bankN(x) { return fbm(x * 0.0011 + 500, this.seed + 3); },
  bankMask(x) { return smoothstep(0.56, 0.74, this.bankN(x)) * smoothstep(350, 900, Math.abs(x)); },
  landY(x) { const m = this.bankMask(x); return -18 - vnoise(x * 0.009, this.seed + 11) * 22 - m * m * 26; },
  floorY(x) { const m = this.bankMask(x); if (m <= 0) return this.waterFloor(x); return lerp(this.waterFloor(x), this.landY(x), m); },
  isLand(x) { return this.floorY(x) < 0; },
  surface(x) { const t = this.t; return Math.sin(x * 0.021 + t * 2.1) * 1.6 + Math.sin(x * 0.053 - t * 3.3) * 0.9 + Math.sin(x * 0.0071 + t * 0.7) * 1.2; },
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
    const rng = mulberry32((this.seed * 7919 + ci * 104729 + 12345) >>> 0);
    const x0 = ci * this.CHUNK, x1 = x0 + this.CHUNK, decor = [];
    for (let x = x0; x < x1; x += 20) {
      const fy = this.floorY(x), m = this.bankMask(x), land = fy < 0, depth = fy;
      if (!land) {
        if (depth > 50 && rng() < 0.55) decor.push({ type: 'weed', x: x + rng() * 16, y: fy, h: 12 + rng() * 34, v: rng() < 0.5 ? 0 : 1, ph: rng() * TAU });
        if (rng() < 0.12) decor.push({ type: 'rock', x: x + rng() * 16, y: fy, v: rng() < 0.5 ? 0 : 1, s: 1 + rng() * 1.5 });
        if (rng() < 0.05) decor.push({ type: 'log', x: x + rng() * 16, y: fy, s: 1 + rng() * 1.2 });
        if (depth > 25 && depth < 360 && rng() < 0.22) { const n = 1 + Math.floor(rng() * 3); for (let k = 0; k < n; k++) decor.push({ type: 'lily', x: x + k * 11 + rng() * 6, y: 0, v: rng() < 0.3 ? 1 : 0, ph: rng() * TAU }); }
        if (m > 0.12 && m < 0.7 && depth < 90 && rng() < 0.7) decor.push({ type: 'reed', x: x + rng() * 16, y: fy, top: -10 - rng() * 34, ph: rng() * TAU, v: rng() < 0.5 ? 0 : 1 });
        if (depth > 300 && rng() < 0.08) decor.push({ type: 'skull', x: x + rng() * 16, y: fy });
      } else {
        if (rng() < 0.75) decor.push({ type: 'sawgrass', x: x + rng() * 16, y: fy, s: 0.8 + rng() * 0.7, ph: rng() * TAU, fly: rng() < 0.35 });
        if (rng() < 0.16 && m > 0.85) decor.push({ type: 'cypress', x: x + rng() * 16, y: fy, h: 70 + rng() * 80, v: Math.floor(rng() * 3), moss: rng() < 0.7 });
        if (rng() < 0.05) decor.push({ type: 'stump', x: x + rng() * 16, y: fy });
        if (rng() < 0.1) decor.push({ type: 'palmetto', x: x + rng() * 16, y: fy, s: 0.8 + rng() * 0.6, ph: rng() * TAU });
      }
      if (m > 0.55 && m < 0.9 && rng() < 0.18) decor.push({ type: 'mangrove', x: x + rng() * 16, y: fy, s: 0.8 + rng() * 0.8, dir: rng() < 0.5 ? -1 : 1 });
    }
    const ch = { ci, x0, x1, decor, visits };
    this.chunks.set(ci, ch);
    if (this.onChunkLoad) this.onChunkLoad(ch, rng);
  },
  // ---------- sky / lighting ----------
  // day in [0,1): 0 dawn, .25 noon, .5 dusk, .75 midnight
  skyColors(day) {
    const keys = [
      [0.00, '#3a2f5c', '#f0985a'], [0.10, '#4d8fd0', '#cfe6f2'], [0.25, '#4f9fe0', '#c8e6f4'], [0.42, '#5f8fc8', '#f0c090'],
      [0.50, '#3a2a60', '#f07a48'], [0.58, '#141a3a', '#3a3a70'], [0.75, '#04061a', '#0e1838'], [0.92, '#10142e', '#3a3050'], [1.00, '#3a2f5c', '#f0985a'],
    ];
    let i = 0; while (i < keys.length - 2 && keys[i + 1][0] <= day) i++;
    const a = keys[i], b = keys[i + 1], t = clamp((day - a[0]) / (b[0] - a[0]), 0, 1);
    return { top: mixColor(a[1], b[1], t), bot: mixColor(a[2], b[2], t) };
  },
  light(day) { return clamp(0.5 + 0.62 * Math.cos((day - 0.25) * TAU), 0.08, 1); },
  drawSky(ctx, cam, day) {
    const W = G.W, H = G.H, sc = this.skyColors(day);
    const hy = cam.toScreen(0, 0)[1];
    const g = ctx.createLinearGradient(0, Math.min(hy - 220 * cam.zoom, 0), 0, hy);
    g.addColorStop(0, sc.top); g.addColorStop(1, sc.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.max(0, hy));
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
    const layers = [
      { f: 0.18, col: mixColor(sc.bot, '#1e3a24', 0.55), h: 34, seed: 11, trees: 0.35, dens: 90 },
      { f: 0.36, col: mixColor(sc.bot, '#14301c', 0.78), h: 26, seed: 23, trees: 0.5, dens: 70 },
      { f: 0.58, col: mixColor(sc.bot, '#0c2012', 0.9), h: 14, seed: 37, trees: 0.6, dens: 60 },
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
        const kind = ihash(k, L.seed + 9);
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
  drawWater(ctx, cam, day) {
    const W = G.W, H = G.H, hy = cam.toScreen(0, 0)[1];
    if (hy > H) return;
    const y0 = Math.max(0, hy), y700 = cam.toScreen(0, 750)[1];
    const g = ctx.createLinearGradient(0, hy, 0, Math.max(hy + 1, y700));
    const light = this.light(day);
    g.addColorStop(0, mixColor('#2f8a78', '#0a2a30', 1 - light)); g.addColorStop(0.35, mixColor('#1f5a52', '#08201f', 1 - light)); g.addColorStop(1, mixColor('#07201d', '#030c0b', 1 - light));
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
    // light rays
    if (light > 0.3) {
      ctx.globalAlpha = 0.06 * light; ctx.fillStyle = '#c8f0e0';
      for (let i = 0; i < 6; i++) {
        const rx = ((ihash(i, 55) * 900 - cam.x * 0.5 * cam.zoom) % 900 + 900) % 900 - 100 + Math.sin(this.t * 0.4 + i) * 14;
        const rw = 12 + ihash(i, 56) * 20, len = 200 * cam.zoom + 100;
        ctx.beginPath(); ctx.moveTo(rx, hy); ctx.lineTo(rx + rw, hy); ctx.lineTo(rx + rw + 60, hy + len); ctx.lineTo(rx - 10, hy + len); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // motes
    ctx.fillStyle = '#9ad0c0'; ctx.globalAlpha = 0.28;
    for (let i = 0; i < 40; i++) {
      const wx = (ihash(i, 60) * 2000 + this.t * (3 + ihash(i, 61) * 5)) % 2000 + Math.floor(cam.x / 2000) * 2000 - 1000 + ((cam.x % 2000) > 0 ? 0 : 0);
      const wy = 20 + ihash(i, 62) * 600 + Math.sin(this.t + i) * 6;
      const [sx, sy] = cam.toScreen(wx, wy);
      if (sx < 0 || sx > W || sy < hy || sy > H) continue;
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
    ctx.globalAlpha = 1;
  },
  drawTerrain(ctx, cam) {
    const W = G.W, H = G.H, step = 4;
    const pts = [];
    for (let sx = -step; sx <= W + step; sx += step) { const wx = cam.toWorldX(sx); pts.push([sx, cam.toScreen(wx, this.floorY(wx))[1], wx]); }
    // mud body
    ctx.fillStyle = '#3b2c1c';
    ctx.beginPath(); ctx.moveTo(pts[0][0], H + 10);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(pts[pts.length - 1][0], H + 10); ctx.closePath(); ctx.fill();
    // strata + roots
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], wx = p[2];
      for (let k = 0; k < 4; k++) {
        const depth = 10 + k * 34 + Math.sin(wx * (0.02 + k * 0.007) + k) * 4 + vnoise(wx * 0.05, k) * 6;
        const y = p[1] + depth * cam.zoom; if (y > H) break;
        ctx.fillStyle = k % 2 ? '#2e2218' : '#443222'; ctx.fillRect(p[0], Math.round(y), step, Math.max(1, Math.round((k % 2 ? 2 : 1.5) * cam.zoom)));
      }
      if (ihash(Math.floor(wx / 4), 17) < 0.06 && this.floorY(wx) < 0) { ctx.fillStyle = '#2a1e12'; const ry = p[1] + (3 + ihash(Math.floor(wx / 4), 18) * 20) * cam.zoom; ctx.fillRect(p[0], Math.round(ry), Math.max(1, Math.round(cam.zoom)), Math.round((6 + ihash(Math.floor(wx / 4), 19) * 16) * cam.zoom)); }
    }
    // top band
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], wx = p[2], fy = this.floorY(wx);
      const ty = Math.round(p[1]);
      if (fy < 0) { // land: grass
        ctx.fillStyle = '#5d8a2f'; ctx.fillRect(p[0], ty, step, Math.max(1, Math.round(2 * cam.zoom)));
        ctx.fillStyle = '#3f6a22'; ctx.fillRect(p[0], ty + Math.max(1, Math.round(2 * cam.zoom)), step, Math.max(1, Math.round(2 * cam.zoom)));
        if (ihash(Math.floor(wx / 4), 5) < 0.3) { ctx.fillStyle = '#7fae3f'; ctx.fillRect(p[0], ty - 1, 1, 1); }
      } else if (fy < 30) { // shore mud
        ctx.fillStyle = '#6b5a3a'; ctx.fillRect(p[0], ty, step, Math.max(1, Math.round(2 * cam.zoom)));
      } else {
        ctx.fillStyle = fy > 450 ? '#4a3a28' : '#5e4a30'; ctx.fillRect(p[0], ty, step, Math.max(1, Math.round(1.5 * cam.zoom)));
      }
      // pebbles / roots texture
      const r = ihash(Math.floor(wx / 4), 9);
      if (r < 0.12) { ctx.fillStyle = r < 0.05 ? '#5a4a34' : '#2a1e12'; ctx.fillRect(p[0], ty + Math.round((4 + r * 120) * cam.zoom), Math.max(1, Math.round(cam.zoom)), Math.max(1, Math.round(cam.zoom))); }
    }
  },
  drawDecor(ctx, cam, layer, day) {
    // layer 0 = behind entities (weeds, rocks, logs, reeds, trees), 1 = in front (lilies, sawgrass, fireflies)
    const W = G.W, z = cam.zoom, t = this.t, light = this.light(day), night = 1 - light;
    const left = cam.toWorldX(-80), right = cam.toWorldX(W + 80);
    for (const d of this.decor) {
      if (d.x < left) continue; if (d.x > right) break;
      const [sx, sy] = cam.toScreen(d.x, d.y);
      switch (d.type) {
        case 'weed': if (layer !== 0) break; {
          ctx.strokeStyle = d.v ? '#2f6a3a' : '#3f7a44'; ctx.lineWidth = Math.max(1, z);
          for (let b = -1; b <= 1; b++) {
            const sway = Math.sin(t * 1.3 + d.ph + b) * 4 * z;
            ctx.beginPath(); ctx.moveTo(sx + b * 2 * z, sy); ctx.quadraticCurveTo(sx + b * 3 * z + sway * 0.5, sy - d.h * z * 0.6, sx + b * 4 * z + sway, sy - d.h * z); ctx.stroke();
          }
          break; }
        case 'rock': if (layer !== 0) break; { const s = SPR.rock[d.v]; drawSpr(ctx, s, sx, sy - s.h * d.s * z * 0.5 + 1, 0, d.s * z, d.s * z); break; }
        case 'log': if (layer !== 0) break; { const s = SPR.log[0]; drawSpr(ctx, s, sx, sy - s.h * d.s * z * 0.5 + 1, 0, d.s * z, d.s * z); break; }
        case 'skull': if (layer !== 0) break; drawSpr(ctx, SPR.skull, sx, sy - 2 * z, 0, z, z); break;
        case 'lily': if (layer !== 1) break; { const s = SPR.lily[d.v]; const wy = cam.toScreen(d.x, this.surface(d.x))[1]; drawSpr(ctx, s, sx, wy - 1 * z, 0, z, z, s.w / 2, s.h - 1); break; }
        case 'reed': if (layer !== 0) break; {
          const top = cam.toScreen(d.x, d.top)[1]; const sway = Math.sin(t * 1.1 + d.ph) * 3 * z;
          ctx.strokeStyle = '#4f7a3a'; ctx.lineWidth = Math.max(1, z); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sway * 0.3, (sy + top) / 2, sx + sway, top); ctx.stroke();
          if (d.v) { ctx.fillStyle = '#6b4a2e'; ctx.fillRect(Math.round(sx + sway - z), Math.round(top - 8 * z), Math.max(1, Math.round(2 * z)), Math.max(2, Math.round(7 * z))); }
          else { ctx.strokeStyle = '#7fae5f'; ctx.beginPath(); ctx.moveTo(sx + sway, top); ctx.lineTo(sx + sway + 4 * z, top - 6 * z); ctx.stroke(); }
          break; }
        case 'sawgrass': if (layer !== 1) break; {
          ctx.strokeStyle = '#7a9a3a'; ctx.lineWidth = Math.max(1, z);
          for (let b = -2; b <= 2; b++) { const sway = Math.sin(t * 1.6 + d.ph + b * 0.4) * 2 * z; ctx.beginPath(); ctx.moveTo(sx, sy + 1); ctx.lineTo(sx + b * 3 * z * d.s + sway, sy - (9 + Math.abs(b) * -1.5) * d.s * z); ctx.stroke(); }
          if (d.fly && night > 0.3) { // firefly
            const fx = sx + Math.sin(t * 0.9 + d.ph) * 14 * z, fy = sy - (14 + Math.sin(t * 1.7 + d.ph * 2) * 8) * z;
            const pulse = 0.5 + 0.5 * Math.sin(t * 3 + d.ph * 5);
            if (pulse > 0.35) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * pulse; ctx.fillStyle = '#e8ff60'; ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1); ctx.globalAlpha = night * pulse * 0.3; ctx.fillRect(Math.round(fx) - 1, Math.round(fy) - 1, 3, 3); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
          }
          break; }
        case 'palmetto': if (layer !== 1) break; {
          ctx.strokeStyle = '#3f7a3a'; ctx.lineWidth = Math.max(1, 1.5 * z);
          for (let b = -3; b <= 3; b++) { const sway = Math.sin(t * 1.2 + d.ph) * 1.5 * z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + b * 4 * z * d.s + sway, sy - (16 - Math.abs(b) * 2.5) * d.s * z); ctx.stroke(); }
          break; }
        case 'cypress': if (layer !== 0) break; {
          const h = d.h * z, tw = 4 * z;
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - h), Math.round(tw), Math.round(h + 2));
          ctx.fillRect(Math.round(sx - tw * 1.5), Math.round(sy - 8 * z), Math.round(tw * 3), Math.round(8 * z)); // buttress
          ctx.fillStyle = '#2a1e12'; ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - h), Math.max(1, Math.round(z)), Math.round(h));
          const cols = ['#2f5a2a', '#3a6a30', '#2a4a22'];
          for (let j = 0; j < 5; j++) { const cw = (30 - j * 5) * z * (0.8 + ihash(d.v * 7 + j, 3) * 0.5), cy = sy - h * (0.4 + j * 0.15); ctx.fillStyle = cols[(j + d.v) % 3]; ctx.fillRect(Math.round(sx - cw / 2), Math.round(cy), Math.round(cw), Math.round(h * 0.08 + 2 * z)); }
          if (d.moss) { ctx.fillStyle = '#8a9a6a'; for (let j = 0; j < 4; j++) { const mx = sx + (ihash(d.v * 11 + j, 4) - 0.5) * 26 * z, my = sy - h * (0.5 + ihash(j, 5) * 0.3); ctx.fillRect(Math.round(mx), Math.round(my), Math.max(1, Math.round(z)), Math.round((8 + ihash(j, 6) * 12) * z)); } }
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
    if (hy0 < -30 || hy0 > H + 30) return;
    // reflection band
    ctx.globalAlpha = 0.16 + 0.1 * light; ctx.fillStyle = sc.bot;
    ctx.fillRect(0, Math.round(hy0), W, Math.max(2, Math.round(10 * z)));
    ctx.globalAlpha = 1;
    // underwater tint (drawn before surface line so the line stays bright)
    ctx.fillStyle = 'rgba(8, 44, 52, 0.22)'; ctx.fillRect(0, Math.max(0, Math.round(hy0)), W, H);
    const dg = ctx.createLinearGradient(0, hy0, 0, cam.toScreen(0, 800)[1]);
    dg.addColorStop(0, 'rgba(0,4,10,0)'); dg.addColorStop(1, 'rgba(0,4,10,0.55)');
    ctx.fillStyle = dg; ctx.fillRect(0, Math.max(0, Math.round(hy0)), W, H);
    // wave line
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let sx = 0; sx <= W; sx += 2) { const wx = cam.toWorldX(sx); const sy = cam.toScreen(wx, this.surface(wx))[1]; if (sx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy); }
    ctx.strokeStyle = mixColor('#b8ece6', '#3a6a68', 1 - light); ctx.stroke();
    // sparkles
    ctx.fillStyle = '#ffffff';
    for (let sx = 0; sx < W; sx += 3) { const wx = cam.toWorldX(sx); const h = ihash(Math.floor(wx / 3), 21); if (h < 0.08 && Math.sin(this.t * 5 + wx * 0.1) > 0.6) { const sy = cam.toScreen(wx, this.surface(wx))[1]; ctx.globalAlpha = 0.7 * light; ctx.fillRect(sx, Math.round(sy) - 1, 1, 1); } }
    ctx.globalAlpha = 1;
  },
  drawNight(ctx, cam, day) {
    const night = 1 - this.light(day);
    if (night > 0.02) { ctx.fillStyle = `rgba(4,8,26,${(night * 0.55).toFixed(3)})`; ctx.fillRect(0, 0, G.W, G.H); }
  },
};
