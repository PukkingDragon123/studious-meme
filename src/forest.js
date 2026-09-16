'use strict';
// ---------------------------------------------------------------------------
// THE FOREST.
//
// A wooded canyon is not a row of trees on a hill. It is a ceiling: a hundred
// feet of canopy overhead with holes punched in it, columns of light coming
// down through the holes, trunks standing in front of you as well as behind,
// and everything between them full of drifting stuff.
//
// Three layers on top of the ordinary parallax:
//   BACK    haze between the trunks, so the far ones sit back
//   CANOPY  the ceiling and the light coming through it, over the world
//   FRONT   near trunks, hanging moss and falling leaves, over the animal
// ---------------------------------------------------------------------------
const Forest = {
  leaves: [], motes: [], flies: [], t: 0,

  on(x) { const B = Biome.at(x); return !!B.forest; },
  swampy(x) { const B = Biome.at(x); return !!B.swamp; },

  reset() { this.leaves.length = 0; this.motes.length = 0; this.flies.length = 0; },

  update(dt, cam) {
    this.t += dt;
    if (!this.on(cam.x)) { if (this.leaves.length) this.reset(); return; }
    const halfW = G.W / cam.zoom / 2 + 90, halfH = G.H / cam.zoom / 2 + 90;
    const surf = World.surface(cam.x);
    // ---- leaves coming down out of the canopy ---------------------------
    while (this.leaves.length < 22) {
      this.leaves.push({ x: cam.x + rand(-halfW, halfW), y: cam.y - halfH - rand(0, 160),
        vx: rand(-14, 14), s: rand(0.7, 1.5), ph: rand(TAU), sp: rand(1.4, 3.2),
        c: choice(['#7a9a34', '#5d8a2c', '#a8b048', '#c89a3a', '#8a6a24']) });
    }
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const L = this.leaves[i];
      L.ph += dt * L.sp;
      L.y += (10 + L.s * 12) * dt;
      L.x += (L.vx + Math.sin(L.ph) * 22) * dt;
      // it lands on the water and rides it, then it is gone
      if (L.y > surf - 1) { L.y = surf - 1; L.vx *= 0.9; L.land = (L.land || 0) + dt; if (L.land > 5) this.leaves.splice(i, 1); continue; }
      if (Math.abs(L.x - cam.x) > halfW + 140 || L.y > cam.y + halfH) this.leaves.splice(i, 1);
    }
    // ---- pollen and dust hanging in the light ---------------------------
    while (this.motes.length < 40) {
      this.motes.push({ x: cam.x + rand(-halfW, halfW), y: rand(surf - 260, surf - 6), ph: rand(TAU), sp: rand(0.3, 1.1), s: rand(0.6, 1.4) });
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const M = this.motes[i];
      M.ph += dt * M.sp; M.x += Math.sin(M.ph) * 5 * dt; M.y -= (2 + M.s) * dt;
      if (M.y < surf - 300 || Math.abs(M.x - cam.x) > halfW + 120) this.motes.splice(i, 1);
    }
    // ---- fireflies, once the light goes --------------------------------
    const night = 1 - World.light(G.day);
    const want = night > 0.35 ? (this.swampy(cam.x) ? 26 : 14) : 0;
    while (this.flies.length < want) this.flies.push({ x: cam.x + rand(-halfW, halfW), y: rand(surf - 120, surf - 4), ph: rand(TAU), sp: rand(0.8, 2.2), bl: rand(TAU) });
    while (this.flies.length > want) this.flies.pop();
    for (const F of this.flies) {
      F.ph += dt * F.sp; F.bl += dt * rand(2, 5);
      F.x += Math.cos(F.ph) * 16 * dt; F.y += Math.sin(F.ph * 1.7) * 12 * dt;
      if (F.y > surf - 3) F.y = surf - 3;
      if (Math.abs(F.x - cam.x) > halfW) F.x = cam.x + Math.sign(cam.x - F.x) * halfW * 0.95;
    }
  },

  // ---- BACK: haze between the trunks ------------------------------------
  back(ctx, cam, day) {
    if (!this.on(cam.x)) return;
    const W = G.W, hy = cam.toScreen(0, 0)[1];
    if (hy < -40) return;
    const light = World.light(day), B = Biome.mixPal(cam.x);
    // Mist does not lie in a bar. Three shoals of it, each drifting at its own
    // rate, each with a ragged top that rises and falls between the trunks.
    const z = cam.zoom;
    for (let i = 0; i < 3; i++) {
      const y = hy - (8 + i * 19) * z, a = (0.085 - i * 0.022) * (0.5 + light * 0.9);
      const ox = cam.x * (0.24 + i * 0.1) + this.t * (5 + i * 4);
      const g = ctx.createLinearGradient(0, y - 26 * z, 0, y + 14 * z);
      g.addColorStop(0, rgba(B.fog, 0));
      g.addColorStop(0.55, rgba(B.fog, a));
      g.addColorStop(1, rgba(B.fog, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, y + 16 * z);
      for (let sx = 0; sx <= W + 8; sx += 8) {
        const n = fbm((ox + sx / z) * 0.006, 40 + i) - 0.5;
        ctx.lineTo(sx, y - 24 * z + n * 30 * z);
      }
      ctx.lineTo(W, y + 16 * z); ctx.closePath(); ctx.fill();
    }
  },

  // ---- CANOPY: the ceiling, and the light that gets through it ----------
  canopy(ctx, cam, day) {
    if (!this.on(cam.x)) return;
    const W = G.W, H = G.H, z = cam.zoom, hy = cam.toScreen(0, 0)[1];
    const light = World.light(day);
    const swamp = this.swampy(cam.x);
    const B = Biome.mixPal(cam.x);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    // the canopy sits two hundred feet over the water, so how much of it you
    // see is entirely how high the camera has got. Under the surface you see
    // none of it, which is the point.
    const top = hy - 168 * z;
    if (top > H + 40) return;
    const PAR = 0.55, ox = cam.x * PAR;
    const dark = mixColor(swamp ? '#1c2c18' : '#17281a', B.sky[0], 0.12);
    const mid = mixColor(swamp ? '#28401f' : '#24401f', B.sky[1], 0.10);
    const lit = mixColor(swamp ? '#43602a' : '#47682c', '#d8f0a0', 0.22 * light);
    // ---- the mass of it -------------------------------------------------
    // A canopy has a bottom, and the bottom is the interesting part: it hangs
    // in festoons, some of them a long way lower than the rest, and the light
    // comes through where it does not. Back rows first so the near one reads
    // in front, and every clump gets its own height so there is no shelf.
    const festoon = [];
    for (let row = 2; row >= 0; row--) {
      const cell = 36 + row * 14, col = row === 0 ? lit : row === 1 ? mid : dark;
      const k0 = Math.floor((ox - W / z) / cell) - 1, k1 = Math.ceil((ox + W / z) / cell) + 1;
      for (let k = k0; k <= k1; k++) {
        const r = ihash(k, 300 + row);
        if (r > 0.9 && row === 0) continue;            // the hole the light comes through
        const sx = (k * cell + ihash(k, 340 + row) * cell * 0.4 - ox) * z + W / 2;
        if (sx < -80 * z || sx > W + 80 * z) continue;
        // a few clumps hang a long way down; most do not
        const q = ihash(k, 350 + row), hang = row === 0 ? q * q * q * 74 : q * q * 26;
        const yy = top - row * 15 * z + (ihash(k, 360 + row) - 0.4) * 20 * z + hang * z;
        const w = (cell * (0.85 + r * 0.7)) * z, h = (22 + r * 30 + hang * 0.45) * z;
        Leaf.draw(ctx, Leaf.mass(Math.round(w), Math.round(h), qcol(col), qcol(mixColor(col, '#ffffff', 0.12)), qcol(mixColor(col, '#ffffff', 0.24)), k & 7), sx, yy, 1);
        if (row === 0 && hang > 26) festoon.push([sx, yy + h * 0.4, w]);
      }
    }
    // vines off the lowest festoons, swinging a little
    for (const [fx, fy, fw] of festoon) {
      for (let j = 0; j < 3; j++) {
        if (ihash(Math.round(fx) + j, 372) > 0.66) continue;
        const vx = fx - fw * 0.3 + j * fw * 0.3, vl = (18 + ihash(Math.round(fx) + j, 370) * 44) * z;
        const sw = Math.sin(this.t * 0.5 + j + fx * 0.01) * 2.4 * z;
        ctx.fillStyle = 'rgba(38,58,30,0.75)';
        ctx.beginPath(); ctx.moveTo(vx, fy);
        ctx.quadraticCurveTo(vx + sw, fy + vl * 0.6, vx + sw * 1.6, fy + vl);
        ctx.lineTo(vx + sw * 1.6 + 3 * z, fy + vl);
        ctx.quadraticCurveTo(vx + sw + 3 * z, fy + vl * 0.6, vx + 3 * z, fy);
        ctx.closePath(); ctx.fill();
        if (ihash(Math.round(fx) + j, 371) > 0.5) { ctx.fillStyle = 'rgba(58,86,40,0.8)'; ctx.fillRect(Math.round(vx + sw * 1.6 - 2 * z), Math.round(fy + vl), Math.max(1, Math.round(5 * z)), Math.max(1, Math.round(3 * z))); }
      }
    }
    // above the clumps it goes to solid, but as a ramp rather than a wall, so
    // there is no line across the sky where the ceiling starts
    const ramp = Math.max(0, top - 14 * z);
    if (ramp > 0) {
      const g2 = ctx.createLinearGradient(0, Math.max(0, ramp - 60 * z), 0, ramp);
      g2.addColorStop(0, dark); g2.addColorStop(1, rgba(dark, 0));
      ctx.fillStyle = dark; ctx.fillRect(0, 0, W, Math.max(0, ramp - 60 * z));
      ctx.fillStyle = g2; ctx.fillRect(0, Math.max(0, ramp - 60 * z), W, Math.min(60 * z, ramp));
    }
    // ---- and the light coming down through the holes in it ---------------
    if (light > 0.2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cell = 52, k0 = Math.floor((ox - W / z) / cell) - 1, k1 = Math.ceil((ox + W / z) / cell) + 1;
      for (let k = k0; k <= k1; k++) {
        if (ihash(k, 300) <= 0.9) continue;
        const sx = (k * cell - ox) * z + W / 2;
        if (sx < -120 || sx > W + 120) continue;
        const lean = 22 * z, len = (hy - top) + 80 * z;
        const a = (0.055 + 0.02 * Math.sin(this.t * 0.6 + k)) * light;
        const g = ctx.createLinearGradient(0, top, 0, top + len);
        g.addColorStop(0, 'rgba(255,248,200,' + (a * 1.6).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(210,240,180,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx - 9 * z, top); ctx.lineTo(sx + 9 * z, top);
        ctx.lineTo(sx + 26 * z + lean, top + len); ctx.lineTo(sx - 26 * z + lean, top + len);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // ---- pollen in the air ----------------------------------------------
    ctx.globalAlpha = 0.5;
    for (const M of this.motes) {
      const [sx, sy] = cam.toScreen(M.x, M.y);
      if (sx < -4 || sx > W + 4) continue;
      px(sx, sy, M.s * z, M.s * z, Math.sin(M.ph) > 0 ? '#f2f6cf' : '#cfe0b0');
    }
    ctx.globalAlpha = 1;
  },

  // ---- HEAD: the west end of the canyon ---------------------------------
  // The creek has to come from somewhere and the animal has to have come from
  // somewhere, and it is the same place: a wet rock face with the mouth of a
  // hundred-and-forty-foot shaft in it, still running, still with the grating
  // that gave way hanging off one hinge.
  head(ctx, cam) {
    if (cam.x > -5180) return;
    const W = G.W, H = G.H, z = cam.zoom;
    const EX = -5872;
    const [sxr] = cam.toScreen(EX, 0);
    const face = Math.min(sxr, W + 60);
    if (face <= -4) return;
    const hy = cam.toScreen(0, 0)[1];
    const sy = (wy) => cam.toScreen(0, wy)[1];
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const light = World.light(G.day), night = 1 - light;
    const dim = (c) => mixColor(c, '#0e1a14', night * 0.26);

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, face + 1, H); ctx.clip();
    // ---- the body of the rock -------------------------------------------
    // Rock is not courses. It is beds of uneven thickness, broken across into
    // blocks that do not line up, with the fracture running through the lot.
    px(0, 0, face, H, dim('#453d33'));
    let wy = -460, bi = 0;
    while (wy < 640) {
      const th = 14 + ihash(bi, 76) * 40;
      const y0 = sy(wy), y1 = sy(wy + th);
      wy += th; bi++;
      if (y1 < -4 || y0 > H) continue;
      const v = ihash(bi, 77);
      const base = v < 0.3 ? '#544a3c' : v < 0.56 ? '#473f35' : v < 0.8 ? '#5c5242' : '#3d372e';
      px(0, y0, face, y1 - y0, dim(base));
      // blocks across the bed, each one a shade off its neighbour
      let bx = face, j = 0;
      while (bx > -10) {
        const bwd = (24 + ihash(bi * 31 + j, 78) * 70) * z;
        const t2 = ihash(bi * 31 + j, 79);
        px(bx - bwd, y0, bwd, y1 - y0, dim(shade(base, 0.9 + t2 * 0.22)));
        px(bx - bwd, y0, 1.2 * z, y1 - y0, 'rgba(22,26,24,0.4)');     // the joint
        bx -= bwd; j++;
        if (j > 40) break;
      }
      px(0, y0, face, 1 * z, 'rgba(150,152,138,0.16)');               // the bedding plane
      px(0, y1 - 1 * z, face, 1 * z, 'rgba(20,24,22,0.3)');
    }
    // ---- the fracture that runs the height of the face -------------------
    {
      ctx.beginPath();
      const fx0 = face - 190 * z;
      ctx.moveTo(fx0, -10);
      for (let q = 0; q <= 12; q++) { const u = q / 12; ctx.lineTo(fx0 + (u * 120 + (ihash(q, 86) - 0.5) * 26) * z, -10 + u * (H + 20)); }
      ctx.lineTo(fx0 + 130 * z, H + 10);
      ctx.strokeStyle = 'rgba(16,20,20,0.6)'; ctx.lineWidth = Math.max(1, 2.6 * z); ctx.stroke();
      ctx.strokeStyle = 'rgba(140,146,130,0.14)'; ctx.lineWidth = Math.max(1, 1.2 * z);
      ctx.stroke();
    }
    // ---- wet streaks and the moss that lives on them ---------------------
    for (let k = 0; k < 14; k++) {
      const sx2 = face - (6 + ihash(k, 81) * 300) * z;
      if (sx2 < -8) continue;
      const w = (3 + ihash(k, 82) * 9) * z, y0 = sy(-300 + ihash(k, 83) * 200);
      px(sx2, y0, w, hy - y0, 'rgba(26,36,32,0.3)');
      if (ihash(k, 84) > 0.45) px(sx2, y0, w, (30 + ihash(k, 85) * 90) * z, 'rgba(58,86,48,0.35)');
    }
    // ---- ledges, with ferns growing out of them --------------------------
    for (const [ly, lw, seed] of [[-186, 96, 5], [-108, 62, 9], [-52, 78, 13], [-248, 54, 17]]) {
      const ly0 = sy(ly), lx = face - lw * z;
      if (ly0 < -20 || ly0 > H + 20) continue;
      px(lx, ly0, lw * z, 7 * z, dim('#655b49'));
      px(lx, ly0, lw * z, 2 * z, dim('#7a6f58'));
      px(lx, ly0 + 7 * z, lw * z, 3 * z, 'rgba(18,22,20,0.55)');       // the shadow it throws
      px(lx, ly0 - 2 * z, lw * z, 3 * z, dim('#3f5a30'));              // moss along the lip
      for (let j = 0; j < 6; j++) {
        const fx = lx + (6 + j * (lw - 12) / 5) * z;
        if (ihash(j, seed) > 0.72) continue;
        for (let q = 0; q < 5; q++) {
          const a = -Math.PI * 0.86 + q * 0.34, len = (7 + ihash(j * 7 + q, seed + 1) * 9) * z;
          ctx.strokeStyle = dim(q % 2 ? '#3d6b2e' : '#2f5626'); ctx.lineWidth = Math.max(1, 1.4 * z);
          ctx.beginPath(); ctx.moveTo(fx, ly0);
          ctx.quadraticCurveTo(fx + Math.cos(a) * len * 0.6, ly0 + Math.sin(a) * len, fx + Math.cos(a) * len, ly0 + Math.sin(a) * len * 0.4);
          ctx.stroke();
        }
      }
    }
    // ---- THE SHAFT MOUTH -------------------------------------------------
    const MR = 30, MY = sy(-120), MXs = face - 74 * z;
    if (MXs > -70 * z) {
      // the concrete collar set into the rock
      px(MXs - 12 * z, MY - (MR + 13) * z, 96 * z, (MR * 2 + 26) * z, dim('#6e6f66'));
      px(MXs - 12 * z, MY - (MR + 13) * z, 96 * z, 3 * z, dim('#8a8b7e'));
      px(MXs - 12 * z, MY + (MR + 11) * z, 96 * z, 3 * z, 'rgba(24,28,26,0.6)');
      for (let i = 0; i < 6; i++) px(MXs - 10 * z + i * 18 * z, MY - (MR + 13) * z, 1.4 * z, (MR * 2 + 26) * z, 'rgba(32,36,34,0.3)');
      // the bore: dark, with a ring of brick round it
      ctx.save();
      ctx.beginPath(); ctx.ellipse(MXs + 34 * z, MY, MR * 1.2 * z, MR * z, 0, 0, TAU); ctx.closePath();
      ctx.fillStyle = dim('#4a3a30'); ctx.fill();
      ctx.clip();
      px(MXs - 12 * z, MY - MR * z, 96 * z, MR * 2 * z, '#1a1512');
      for (let i = 0; i < 10; i++) px(MXs - 12 * z, MY - MR * z + i * 6 * z, 96 * z, 1 * z, 'rgba(96,74,56,0.26)');
      ctx.restore();
      ctx.strokeStyle = dim('#7d6a52'); ctx.lineWidth = Math.max(1, 3 * z);
      ctx.beginPath(); ctx.ellipse(MXs + 34 * z, MY, MR * 1.2 * z, MR * z, 0, 0, TAU); ctx.stroke();
      // rust bleeding out of it and down the rock
      px(MXs + 6 * z, MY + MR * z, 36 * z, (hy - MY - MR * z), 'rgba(122,74,38,0.22)');
      px(MXs + 16 * z, MY + MR * z, 10 * z, (hy - MY - MR * z), 'rgba(150,92,44,0.18)');
      // the grating that gave way, hanging off its top hinge
      ctx.save();
      ctx.translate(MXs + 34 * z + MR * 1.05 * z, MY - MR * 0.75 * z);
      ctx.rotate(1.38 + Math.sin(this.t * 0.5) * 0.03);
      const gw = 48 * z, gh = 56 * z;
      px(-gw / 2, 0, gw, 2.6 * z, dim('#6b4a30'));
      px(-gw / 2, gh - 2.6 * z, gw, 2.6 * z, dim('#6b4a30'));
      for (let i = 0; i < 6; i++) px(-gw / 2 + i * gw / 5.4, 0, 2.2 * z, gh, dim(i % 2 ? '#7a5636' : '#5f4229'));
      ctx.restore();
      // the water still coming out of it, falling into the pool
      const fallH = hy - MY;
      if (fallH > 0) {
        const FW = 30 * z, FX = MXs + 20 * z;
        // the sheet, widening as it comes down
        const gf = ctx.createLinearGradient(0, MY, 0, hy);
        gf.addColorStop(0, 'rgba(206,232,232,0.50)'); gf.addColorStop(0.7, 'rgba(188,218,220,0.34)'); gf.addColorStop(1, 'rgba(230,246,246,0.46)');
        ctx.fillStyle = gf;
        ctx.beginPath();
        ctx.moveTo(FX, MY + MR * 0.1 * z); ctx.lineTo(FX + FW, MY + MR * 0.1 * z);
        ctx.lineTo(FX + FW + 9 * z, hy + 3 * z); ctx.lineTo(FX - 9 * z, hy + 3 * z);
        ctx.closePath(); ctx.fill();
        // strands running down inside it
        for (let i = 0; i < 12; i++) {
          const u = (this.t * 1.15 + i / 12) % 1;
          const fx = FX + (2 + ihash(i, 91) * 26) * z + u * (ihash(i, 93) - 0.5) * 12 * z;
          px(fx, MY + u * fallH, 1.4 * z, (12 + ihash(i, 92) * 26) * z, 'rgba(240,252,252,0.30)');
        }
        // the white water where it lands, and the spray coming off it
        px(FX - 12 * z, hy - 5 * z, FW + 24 * z, 7 * z, 'rgba(236,250,250,0.55)');
        for (let i = 0; i < 20; i++) {
          const u = ((this.t * 1.6 + i * 0.37) % 1);
          const dx2 = Math.cos(i * 2.1) * (8 + u * 40) * z;
          const sz = (1.6 + ihash(i, 94) * 1.8) * z;
          px(FX + FW / 2 + dx2, hy - (u * 30 + Math.sin(u * 3.1) * 8) * z, sz, sz, 'rgba(236,250,250,' + (0.45 * (1 - u)).toFixed(3) + ')');
        }
        // the mist it throws up, hanging in the light
        const gm = ctx.createRadialGradient(FX + FW / 2, hy - 8 * z, 2, FX + FW / 2, hy - 8 * z, 64 * z);
        gm.addColorStop(0, 'rgba(226,242,240,0.28)'); gm.addColorStop(1, 'rgba(226,242,240,0)');
        ctx.fillStyle = gm; ctx.fillRect(FX + FW / 2 - 64 * z, hy - 72 * z, 128 * z, 80 * z);
      }
    }
    // ---- boulders at the foot, half in the water -------------------------
    for (const [bx, by, bw2, bh2] of [[-30, -6, 30, 22], [-76, -2, 22, 15], [-14, 6, 20, 14], [-104, -8, 26, 18]]) {
      const ox2 = face + bx * z, oy2 = sy(by);
      px(ox2 - bw2 * z / 2, oy2 - bh2 * z, bw2 * z, bh2 * z + 4 * z, dim('#564e42'));
      px(ox2 - bw2 * z / 2, oy2 - bh2 * z, bw2 * z, 2.4 * z, dim('#6b6350'));
      px(ox2 - bw2 * z / 2, oy2 - bh2 * z - 2 * z, bw2 * z * 0.7, 3 * z, dim('#3d5a2e'));
    }
    ctx.restore();
    // ---- the rock is in front of the haze, so a rim of light on its edge --
    px(face - 2 * z, 0, 2 * z, H, 'rgba(150,170,150,0.10)');
  },

  // ---- DEEP: the water under a forest is not an empty green room ---------
  // Blackwater is full of what the trees dropped into it: root curtains off
  // the trunks, whole trunks on the bottom, leaf litter turning over, and the
  // few shafts of light that make it through the canopy and the surface.
  deep(ctx, cam, day) {
    if (!this.on(cam.x)) return;
    const W = G.W, H = G.H, z = cam.zoom, hy = cam.toScreen(0, 0)[1];
    if (hy > H) return;
    const swamp = this.swampy(cam.x);
    const light = World.light(day);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const top = Math.max(hy, -10);
    // ---- shafts of light coming in through the surface --------------------
    if (light > 0.25) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cell = 120, ox = cam.x * 0.9;
      for (let k = Math.floor((ox - W / z) / cell) - 1; k <= Math.ceil((ox + W / z) / cell) + 1; k++) {
        if (ihash(k, 500) > 0.45) continue;
        const sx = (k * cell + ihash(k, 501) * 80 - ox) * z + W / 2;
        const len = (140 + ihash(k, 502) * 190) * z;
        const lean = (ihash(k, 503) - 0.5) * 60 * z;
        const a = (0.05 + 0.018 * Math.sin(this.t * 0.5 + k)) * light * (swamp ? 0.6 : 1);
        const g = ctx.createLinearGradient(0, hy, 0, hy + len);
        g.addColorStop(0, 'rgba(198,232,206,' + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(150,200,170,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx - 7 * z, hy); ctx.lineTo(sx + 7 * z, hy);
        ctx.lineTo(sx + 22 * z + lean, hy + len); ctx.lineTo(sx - 22 * z + lean, hy + len);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // ---- root curtains hanging off the trees into the water ---------------
    const cell2 = 150, ox2 = cam.x * 1.0;
    for (let k = Math.floor((ox2 - W / z) / cell2) - 1; k <= Math.ceil((ox2 + W / z) / cell2) + 1; k++) {
      const r = ihash(k, 510);
      if (r > (swamp ? 0.78 : 0.42)) continue;
      const sx = (k * cell2 + ihash(k, 511) * 110 - ox2) * z + W / 2;
      if (sx < -40 * z || sx > W + 40 * z) continue;
      const fl = World.floorY(cam.toWorldX(sx));
      const dep = Math.min((40 + r * 150), Math.max(20, fl - 20));
      const bot = cam.toScreen(0, dep)[1];
      if (bot < top) continue;
      const n = 4 + Math.floor(r * 5);
      for (let j = 0; j < n; j++) {
        const rx = sx + (j - n / 2) * 4 * z + ihash(k * 7 + j, 512) * 6 * z;
        const rl = (bot - top) * (0.45 + ihash(k * 7 + j, 513) * 0.55);
        const sw = Math.sin(this.t * 0.4 + j * 0.6 + k) * 3 * z;
        ctx.strokeStyle = 'rgba(28,36,24,0.55)';
        ctx.lineWidth = Math.max(1, (1.2 + ihash(k * 7 + j, 514) * 1.4) * z);
        ctx.beginPath(); ctx.moveTo(rx, top);
        ctx.quadraticCurveTo(rx + sw, top + rl * 0.6, rx + sw * 1.8, top + rl);
        ctx.stroke();
        // the fine hair off the end of a root
        if (ihash(k * 7 + j, 515) > 0.6) px(rx + sw * 1.8, top + rl, 1.2 * z, 8 * z, 'rgba(46,58,36,0.4)');
      }
    }
    // ---- trunks that went in years ago and never came out ------------------
    const cell3 = 420, ox3 = cam.x;
    for (let k = Math.floor((ox3 - W / z) / cell3) - 1; k <= Math.ceil((ox3 + W / z) / cell3) + 1; k++) {
      const r = ihash(k, 520);
      if (r > 0.62) continue;
      const wx = k * cell3 + ihash(k, 521) * 300;
      const fl = World.floorY(wx);
      if (fl < 30) continue;
      const wy = fl - 6 - ihash(k, 522) * 10;
      const [sx, sy] = cam.toScreen(wx, wy);
      if (sx < -140 * z || sx > W + 140 * z) continue;
      const L = (70 + r * 130) * z, th = (7 + r * 8) * z, ang = (ihash(k, 523) - 0.5) * 0.5;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
      px(-L / 2, -th / 2, L, th, '#2a2119');
      px(-L / 2, -th / 2, L, th * 0.3, '#3a2f22');
      px(-L / 2, th * 0.2, L, th * 0.3, '#1a140f');
      // branch stubs and the moss on the upper side
      for (let j = 0; j < 5; j++) {
        if (ihash(k * 9 + j, 524) > 0.55) continue;
        const bx = -L / 2 + (j + 0.5) * L / 5, d2 = ihash(k * 9 + j, 525) > 0.5 ? -1 : 1;
        px(bx, d2 < 0 ? -th / 2 - 9 * z : th / 2, 2.4 * z, 10 * z, '#241c15');
      }
      for (let j = 0; j < 8; j++) if (ihash(k * 9 + j, 526) > 0.4) px(-L / 2 + j * L / 8, -th / 2 - 1.4 * z, L / 9, 2.4 * z, 'rgba(50,74,40,0.5)');
      ctx.restore();
    }
    // ---- litter turning over in the water ---------------------------------
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 26; i++) {
      const ph = this.t * 0.22 + i * 0.61;
      const wx = cam.x + ((i * 137.5) % 620) - 310 + Math.sin(ph) * 14;
      const wy = 22 + ((i * 53.7 + this.t * 5) % 240);
      const [sx, sy] = cam.toScreen(wx, wy);
      if (sy < top || sx < -4 || sx > W + 4) continue;
      px(sx, sy, 2.4 * z, 1.4 * z, i % 3 ? 'rgba(96,82,46,0.7)' : 'rgba(60,78,40,0.7)');
    }
    ctx.globalAlpha = 1;
  },

  // ---- FRONT: what is between you and the trees --------------------------
  front(ctx, cam, day) {
    if (!this.on(cam.x)) return;
    const W = G.W, H = G.H, z = cam.zoom;
    const hy = cam.toScreen(0, 0)[1];
    const swamp = this.swampy(cam.x);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    // ---- near trunks, in silhouette, at more than one parallax -----------
    const PAR = 1.22, ox = cam.x * PAR, cell = 340;
    const k0 = Math.floor((ox - W / z) / cell) - 1, k1 = Math.ceil((ox + W / z) / cell) + 1;
    for (let k = k0; k <= k1; k++) {
      const r = ihash(k, 411);
      const sx = (k * cell + r * 160 - ox) * z + W / 2;
      if (sx < -80 * z || sx > W + 80 * z) continue;
      if (r > 0.62) continue;                        // not one every bay
      const bw = (13 + r * 14) * z;
      if (hy < -40) continue;
      const body = swamp ? '#16200f' : '#151d11';
      const wl = Math.max(0, hy);                    // where it goes into the water
      // ---- the shaft, down to the waterline ------------------------------
      px(sx - bw / 2, 0, bw, wl, body);
      px(sx - bw / 2, 0, bw * 0.26, wl, '#22301c');
      px(sx + bw / 2 - bw * 0.22, 0, bw * 0.22, wl, '#090d07');
      // fibrous bark: long broken strips, not a comb of lines
      for (let j = 0; j < 9; j++) {
        const u = ihash(k * 17 + j, 415), by2 = u * wl, bl = (30 + ihash(k * 17 + j, 416) * 120) * z;
        px(sx - bw / 2 + ihash(k * 17 + j, 417) * bw, by2, 1.4 * z, Math.min(bl, wl - by2), ihash(k * 17 + j, 418) > 0.5 ? 'rgba(10,16,9,0.7)' : 'rgba(46,60,38,0.45)');
      }
      // ---- the buttress, spreading just above the water ------------------
      const fl = hy - 6 * z;
      ctx.beginPath();
      ctx.moveTo(sx - bw * 1.15, hy + 2 * z);
      ctx.lineTo(sx - bw * 0.5, fl - 20 * z);
      ctx.lineTo(sx + bw * 0.5, fl - 20 * z);
      ctx.lineTo(sx + bw * 1.15, hy + 2 * z);
      ctx.closePath(); ctx.fillStyle = body; ctx.fill();
      // ---- what is under the water: dimmer, and shifted by the refraction -
      const bot = hy + (34 + ihash(k, 412) * 46) * z;
      if (bot > hy) {
        ctx.save();
        const off = Math.sin(this.t * 1.1 + k) * 1.6 * z;
        const gw2 = ctx.createLinearGradient(0, hy, 0, bot);
        gw2.addColorStop(0, rgba(body, 0.5)); gw2.addColorStop(0.65, rgba(body, 0.26)); gw2.addColorStop(1, rgba(body, 0));
        ctx.fillStyle = gw2;
        // roots splaying out and thinning away into the dark
        ctx.beginPath();
        ctx.moveTo(sx - bw / 2 + off, hy);
        ctx.lineTo(sx + bw / 2 + off, hy);
        ctx.lineTo(sx + bw * 1.3 + off, bot);
        ctx.lineTo(sx + bw * 0.5 + off, bot);
        ctx.lineTo(sx + off, hy + (bot - hy) * 0.55);
        ctx.lineTo(sx - bw * 0.5 + off, bot);
        ctx.lineTo(sx - bw * 1.3 + off, bot);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // the meniscus where bark meets water
      px(sx - bw * 0.8, hy - 1.5 * z, bw * 1.6, 2.4 * z, 'rgba(208,232,220,0.30)');
      // ---- cypress knees round its foot, which is what says swamp --------
      if (swamp) {
        for (let j = 0; j < 4; j++) {
          if (ihash(k * 11 + j, 419) > 0.62) continue;
          const kx = sx + (ihash(k * 11 + j, 420) - 0.5) * bw * 4.4;
          const kh = (5 + ihash(k * 11 + j, 421) * 12) * z, kw = (3 + ihash(k * 11 + j, 422) * 3) * z;
          ctx.beginPath();
          ctx.moveTo(kx - kw, hy + 2 * z);
          ctx.quadraticCurveTo(kx - kw * 0.6, hy - kh, kx, hy - kh);
          ctx.quadraticCurveTo(kx + kw * 0.6, hy - kh, kx + kw, hy + 2 * z);
          ctx.closePath(); ctx.fillStyle = body; ctx.fill();
          px(kx - kw * 0.5, hy - kh, kw * 0.6, kh * 0.7, 'rgba(48,64,38,0.6)');
        }
      }
      // moss hanging off it
      if (swamp) {
        const mo = 'rgba(96,120,64,0.55)';
        for (let j = 0; j < 7; j++) {
          const mx = sx - bw / 2 + j * bw / 6, ml = (14 + ihash(k * 9 + j, 413) * 46) * z;
          const sw = Math.sin(this.t * 0.6 + j + k) * 2 * z;
          px(mx + sw, wl * 0.26, 1.6 * z, ml, mo);
        }
      }
    }
    // ---- leaves coming down ----------------------------------------------
    for (const L of this.leaves) {
      const [sx, sy] = cam.toScreen(L.x, L.y);
      if (sx < -8 || sx > W + 8 || sy < -8 || sy > H + 8) continue;
      const w = Math.max(1, Math.round(3 * L.s * z)), h = Math.max(1, Math.round(1.6 * L.s * z));
      ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); ctx.rotate(L.land ? 0 : Math.sin(L.ph) * 1.1);
      ctx.fillStyle = L.c; ctx.fillRect(-w >> 1, -h >> 1, w, h);
      ctx.fillStyle = mixColor(L.c, '#ffffff', 0.3); ctx.fillRect(-w >> 1, -h >> 1, w, Math.max(1, h >> 1));
      ctx.restore();
    }
    // ---- fireflies --------------------------------------------------------
    if (this.flies.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const F of this.flies) {
        const [sx, sy] = cam.toScreen(F.x, F.y);
        if (sx < -6 || sx > W + 6) continue;
        const b = Math.max(0, Math.sin(F.bl));
        if (b < 0.15) continue;
        ctx.globalAlpha = b * 0.9;
        px(sx, sy, 1.6 * z, 1.6 * z, '#dfff9a');
        ctx.globalAlpha = b * 0.22;
        px(sx - 3 * z, sy - 3 * z, 7 * z, 7 * z, '#9ee060');
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
  },
};
