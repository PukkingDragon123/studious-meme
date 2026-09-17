'use strict';
// ---------------------------------------------------------------------------
// THE RIVER OF GRASS.
//
// The Everglades is the flattest landscape on the continent. There is no ridge
// on the horizon, there is no valley, there is nothing to put behind anything
// else: it is sixty miles of grass standing in a foot of water, and the only
// vertical objects in it are the tree islands, which are eight feet high and
// look like mountains because nothing else is.
//
// So the background is not a hill. It is:
//   BACK    a dead-flat grass horizon, tree islands and cypress domes sitting
//           on it, a wall of heat over the lot
//   DEEP    what the water is full of: marl in suspension, periphyton drifting
//           off the bed, light coming through the grass, solution holes
//   FRONT   the grass you are actually in, across the bottom of the frame,
//           with dragonflies over it and a heron's legs in it
// ---------------------------------------------------------------------------
const Glades = {
  flies: [], motes: [], birds: [], t: 0,

  on(x) { const B = Biome.at(x); return !!B.glades; },
  park(x) { const B = Biome.at(x); return !!B.park; },

  reset() { this.flies.length = 0; this.motes.length = 0; this.birds.length = 0; },

  update(dt, cam) {
    this.t += dt;
    if (!this.on(cam.x)) { if (this.flies.length) this.reset(); return; }
    const halfW = G.W / cam.zoom / 2 + 90;
    const surf = World.surface(cam.x);
    const light = World.light(G.day);
    // ---- dragonflies: the thing that is always over the grass -------------
    const want = light > 0.3 ? 9 : 2;
    while (this.flies.length < want) {
      this.flies.push({ x: cam.x + rand(-halfW, halfW), y: surf - rand(6, 54), ph: rand(TAU), sp: rand(1.2, 3),
        tx: 0, ty: 0, rest: 0, c: chance(0.5) ? '#4aa8d8' : '#c04a3a' });
    }
    while (this.flies.length > want) this.flies.pop();
    for (const F of this.flies) {
      F.ph += dt * F.sp;
      F.rest -= dt;
      if (F.rest <= 0) { F.rest = rand(0.5, 2.2); F.tx = cam.x + rand(-halfW, halfW); F.ty = surf - rand(4, 60); }
      F.x += (F.tx - F.x) * Math.min(1, dt * 1.6) + Math.sin(F.ph * 3) * 14 * dt;
      F.y += (F.ty - F.y) * Math.min(1, dt * 1.6);
      if (Math.abs(F.x - cam.x) > halfW + 100) F.x = cam.x + Math.sign(cam.x - F.x) * halfW;
    }
    // ---- marl and periphyton hanging in the water -------------------------
    const fl = World.floorY(cam.x);
    while (this.motes.length < 34) this.motes.push({ x: cam.x + rand(-halfW, halfW), y: rand(surf + 4, Math.max(surf + 10, fl - 4)), ph: rand(TAU), sp: rand(0.2, 0.8), s: rand(0.6, 1.5) });
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const M = this.motes[i];
      M.ph += dt * M.sp;
      M.x += Math.sin(M.ph) * 4 * dt; M.y += Math.cos(M.ph * 0.7) * 3 * dt;
      if (Math.abs(M.x - cam.x) > halfW + 90) this.motes.splice(i, 1);
    }
    // ---- wading birds out in the grass ------------------------------------
    const wantB = light > 0.25 ? 3 : 0;
    while (this.birds.length < wantB) this.birds.push({ x: cam.x + rand(-halfW * 1.4, halfW * 1.4), ph: rand(TAU), sp: rand(0.2, 0.6), k: choice(['egret', 'heron', 'ibis', 'stork']), step: 0 });
    while (this.birds.length > wantB) this.birds.pop();
    for (const B of this.birds) {
      B.ph += dt * B.sp;
      B.step += dt * 0.5;
      if (Math.abs(B.x - cam.x) > halfW * 1.6) B.x = cam.x + Math.sign(cam.x - B.x) * halfW * 1.5;
    }
  },

  // ---- BACK: a horizon with nothing on it -------------------------------
  back(ctx, cam, day) {
    if (!this.on(cam.x)) return;
    const W = G.W, H = G.H, z = cam.zoom, hy = cam.toScreen(0, 0)[1];
    if (hy < -60) return;
    const light = World.light(day), night = 1 - light;
    const B = Biome.mixPal(cam.x);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const dim = (c) => mixColor(c, '#131e22', night * 0.55);

    // ---- the far grass: one flat band, because the land is flat -----------
    // Three layers of it, each a shade darker and a few pixels taller, and
    // none of them with a hill in it.
    const bands = [
      { f: 0.07, h: 5, col: dim(mixColor(B.sky[1], '#9aae6a', 0.52)) },
      { f: 0.13, h: 8, col: dim(mixColor(B.sky[1], '#7d9450', 0.68)) },
      { f: 0.22, h: 12, col: dim(mixColor(B.sky[1], '#5f7a38', 0.82)) },
      { f: 0.36, h: 17, col: dim(mixColor(B.sky[1], '#445c26', 0.92)) },
    ];
    for (const L of bands) {
      const ox = cam.x * L.f;
      ctx.fillStyle = L.col;
      ctx.beginPath(); ctx.moveTo(0, hy + 3);
      for (let sx = 0; sx <= W; sx += 3) {
        const wx = ox + sx;
        // a grass line is not a hill line: it is flat with a tuft in it
        const n = (vnoise(wx * 0.05, 11) - 0.5) * 2.2 + (vnoise(wx * 0.012, 5) - 0.5) * 3.4;
        ctx.lineTo(sx, hy - L.h - n);
      }
      ctx.lineTo(W, hy + 3); ctx.closePath(); ctx.fill();
      // the blades that break the top of it
      ctx.fillStyle = mixColor(L.col, '#ffffff', 0.1);
      for (let sx = 0; sx < W; sx += 2) {
        const wx = ox + sx;
        if (ihash(Math.round(wx), 31) > 0.72) {
          const n = (vnoise(wx * 0.05, 11) - 0.5) * 2.2 + (vnoise(wx * 0.012, 5) - 0.5) * 3.4;
          ctx.fillRect(sx, Math.round(hy - L.h - n - 2 - ihash(Math.round(wx), 32) * 4), 1, 4);
        }
      }
    }

    // ---- tree islands and cypress domes sitting on it ---------------------
    // A hammock is a teardrop of hardwood eight feet high. A dome is a ring of
    // cypress that gets taller toward the middle because the hole under it is
    // deeper there. They are the only things out here with a top edge.
    for (const [f, seed, scale, dens] of [[0.13, 21, 0.62, 520], [0.24, 33, 0.85, 400], [0.4, 47, 1.15, 330]]) {
      const ox = cam.x * f;
      const col = dim(mixColor(B.sky[1], '#2c4423', 0.7 + f * 0.3));
      const lit = mixColor(col, '#b8d08a', 0.16);
      for (let k = Math.floor(ox / dens) - 1; k <= Math.floor((ox + W) / dens) + 1; k++) {
        const r = ihash(k, seed);
        if (r > 0.82) continue;
        const sx = k * dens + ihash(k, seed + 1) * dens - ox;
        if (sx < -160 || sx > W + 160) continue;
        const dome = ihash(k, seed + 2) > 0.45;
        const wdt = (60 + ihash(k, seed + 3) * 110) * scale;
        const hgt = (14 + ihash(k, seed + 4) * 20) * scale;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(sx - wdt / 2, hy + 2);
        if (dome) {
          // a dome: tallest in the middle, ragged with individual crowns
          for (let q = 0; q <= 14; q++) {
            const u = q / 14;
            const prof = Math.sin(u * Math.PI);
            const jag = (ihash(k * 17 + q, seed + 5) - 0.5) * 5 * scale;
            ctx.lineTo(sx - wdt / 2 + u * wdt, hy - hgt * (0.28 + prof * 0.85) + jag);
          }
        } else {
          // a hammock: a flat-topped teardrop, taller at the upstream end
          for (let q = 0; q <= 12; q++) {
            const u = q / 12;
            const prof = Math.pow(Math.sin(u * Math.PI), 0.45);
            const jag = (ihash(k * 13 + q, seed + 6) - 0.5) * 3.4 * scale;
            ctx.lineTo(sx - wdt / 2 + u * wdt, hy - hgt * (0.3 + prof * 0.7) + jag);
          }
        }
        ctx.lineTo(sx + wdt / 2, hy + 2); ctx.closePath(); ctx.fill();
        // the sunlit side of it
        ctx.fillStyle = lit;
        for (let q = 0; q < 7; q++) {
          const u = 0.12 + q / 9;
          const prof = dome ? Math.sin(u * Math.PI) : Math.pow(Math.sin(u * Math.PI), 0.45);
          ctx.fillRect(Math.round(sx - wdt / 2 + u * wdt), Math.round(hy - hgt * (0.3 + prof * (dome ? 0.85 : 0.7))), Math.max(1, Math.round(wdt * 0.06)), 2);
        }
        // a dead cypress standing out of the middle of it, bare and white
        if (dome && ihash(k, seed + 7) > 0.55) {
          const tx = sx + (ihash(k, seed + 8) - 0.5) * wdt * 0.4;
          const th = hgt * (1.5 + ihash(k, seed + 9) * 0.7);
          ctx.fillStyle = dim('#8f9482');
          ctx.fillRect(Math.round(tx), Math.round(hy - th), Math.max(1, Math.round(1.6 * scale)), Math.round(th));
          for (let b = 0; b < 3; b++) {
            const by = hy - th * (0.55 + b * 0.16), d2 = b % 2 ? 1 : -1;
            ctx.fillRect(Math.round(tx + (d2 < 0 ? -7 * scale : 0)), Math.round(by), Math.max(1, Math.round(7 * scale)), 1);
          }
          // and something sitting in the top of it
          if (ihash(k, seed + 10) > 0.6) ctx.fillRect(Math.round(tx - 1), Math.round(hy - th - 3), 3, 3, dim('#4a4a44'));
        }
      }
    }

    // ---- the heat: a wall of it, because it is always ninety out here -----
    if (light > 0.4) {
      const hg = ctx.createLinearGradient(0, hy - 34, 0, hy + 4);
      hg.addColorStop(0, rgba(B.fog, 0));
      hg.addColorStop(0.7, rgba(B.fog, 0.30 * light));
      hg.addColorStop(1, rgba(B.fog, 0.48 * light));
      ctx.fillStyle = hg; ctx.fillRect(0, hy - 34, W, 38);
      // and the shimmer in it: the horizon wobbling a pixel at a time
      ctx.globalAlpha = 0.2 * light;
      for (let sx = 0; sx < W; sx += 2) {
        const o = Math.round(Math.sin(this.t * 2.2 + sx * 0.09) * 1.4);
        ctx.fillStyle = B.fog;
        ctx.fillRect(sx, Math.round(hy - 6 + o), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    // ---- wading birds, standing in it ------------------------------------
    for (const b of this.birds) {
      const [sx] = cam.toScreen(b.x, 0);
      if (sx < -30 || sx > W + 30) continue;
      this.wader(ctx, sx, hy, z * 0.8, b, dim);
    }
  },

  // a heron, drawn small and still, because that is what they do
  wader(ctx, sx, hy, s, b, dim) {
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const body = b.k === 'heron' ? '#7d8e96' : b.k === 'ibis' ? '#d8d0c4' : b.k === 'stork' ? '#e4e0d4' : '#eef0ea';
    const dark = b.k === 'heron' ? '#4a5a62' : '#8a8478';
    const leg = b.k === 'ibis' ? '#b05a40' : '#3a4038';
    const H0 = 20 * s;
    const kn = Math.sin(b.step * 2) * 1.4 * s;
    // legs in the water
    px(sx - 1.6 * s, hy - H0 * 0.42, 1.4 * s, H0 * 0.42, dim(leg));
    px(sx + 1.6 * s, hy - H0 * 0.42 + kn, 1.4 * s, H0 * 0.42 - kn, dim(leg));
    // body
    px(sx - 4 * s, hy - H0 * 0.72, 9 * s, H0 * 0.3, dim(body));
    px(sx - 4 * s, hy - H0 * 0.72, 9 * s, 1.6 * s, dim(mixColor(body, '#ffffff', 0.25)));
    px(sx + 3 * s, hy - H0 * 0.6, 4 * s, 3 * s, dim(dark));                     // folded wing tip
    // neck: an S when it is hunting, straight up when it is not
    const hunt = Math.sin(b.ph) > 0.2;
    if (hunt) {
      px(sx + 2 * s, hy - H0 * 0.86, 1.6 * s, H0 * 0.16, dim(body));
      px(sx + 3 * s, hy - H0 * 0.92, 4 * s, 1.6 * s, dim(body));
      px(sx + 6 * s, hy - H0 * 0.9, 5 * s, 1.4 * s, dim(b.k === 'stork' ? '#3a3a34' : '#d8c048'));   // the bill, level
    } else {
      px(sx + 1.6 * s, hy - H0 * 1.06, 1.6 * s, H0 * 0.36, dim(body));
      px(sx + 1.6 * s, hy - H0 * 1.12, 3.4 * s, 3 * s, dim(body));
      px(sx + 4.6 * s, hy - H0 * 1.1, 5 * s, 1.4 * s, dim(b.k === 'stork' ? '#3a3a34' : '#d8c048'));
      px(sx + 3.4 * s, hy - H0 * 1.11, 1.2 * s, 1.2 * s, '#161a18');
    }
    // its reflection, which is most of what you see of a bird out here
    ctx.globalAlpha = 0.22;
    px(sx - 4 * s, hy + 1, 9 * s, H0 * 0.26, dim(body));
    ctx.globalAlpha = 1;
  },

  // ---- DEEP: what a foot of blackwater over marl actually looks like -----
  deep(ctx, cam, day) {
    if (!this.on(cam.x)) return;
    const W = G.W, H = G.H, z = cam.zoom, hy = cam.toScreen(0, 0)[1];
    if (hy > H) return;
    const light = World.light(day);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const top = Math.max(hy, -10);
    // ---- light coming down through the grass ------------------------------
    if (light > 0.25) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cell = 64, ox = cam.x * 0.95;
      for (let k = Math.floor((ox - W / z) / cell) - 1; k <= Math.ceil((ox + W / z) / cell) + 1; k++) {
        if (ihash(k, 610) > 0.5) continue;
        const sx = (k * cell + ihash(k, 611) * 40 - ox) * z + W / 2;
        const len = (70 + ihash(k, 612) * 130) * z;
        const a = (0.05 + 0.02 * Math.sin(this.t * 0.7 + k)) * light;
        const g = ctx.createLinearGradient(0, hy, 0, hy + len);
        g.addColorStop(0, 'rgba(214,236,196,' + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(180,214,160,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx - 5 * z, hy); ctx.lineTo(sx + 5 * z, hy);
        ctx.lineTo(sx + 16 * z, hy + len); ctx.lineTo(sx - 16 * z, hy + len);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // ---- solution holes in the limestone bed ------------------------------
    const cell2 = 260, ox2 = cam.x;
    for (let k = Math.floor((ox2 - W / z) / cell2) - 1; k <= Math.ceil((ox2 + W / z) / cell2) + 1; k++) {
      if (ihash(k, 620) > 0.5) continue;
      const wx = k * cell2 + ihash(k, 621) * 180;
      const fl = World.floorY(wx);
      if (fl < 24) continue;
      const [sx, sy] = cam.toScreen(wx, fl);
      if (sx < -80 * z || sx > W + 80 * z) continue;
      const r = (14 + ihash(k, 622) * 26) * z;
      ctx.fillStyle = 'rgba(10,20,18,0.5)';
      ctx.beginPath(); ctx.ellipse(sx, sy - 1, r, r * 0.34, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(150,158,120,0.4)';
      ctx.beginPath(); ctx.ellipse(sx, sy - r * 0.16, r, r * 0.3, 0, Math.PI, TAU); ctx.fill();
      // and the pale rock lip round it
      px(sx - r, sy - 2 * z, r * 2, 2 * z, 'rgba(178,184,148,0.28)');
    }
    // ---- sunken logs and the stems of the grass ---------------------------
    const cell3 = 190, ox3 = cam.x;
    for (let k = Math.floor((ox3 - W / z) / cell3) - 1; k <= Math.ceil((ox3 + W / z) / cell3) + 1; k++) {
      const r = ihash(k, 630);
      if (r > 0.42) continue;
      const wx = k * cell3 + ihash(k, 631) * 140;
      const fl = World.floorY(wx);
      if (fl < 18) continue;
      const [sx, sy] = cam.toScreen(wx, fl - 3 - ihash(k, 632) * 6);
      if (sx < -110 * z || sx > W + 110 * z) continue;
      const L = (40 + r * 120) * z, th = (4 + r * 7) * z, ang = (ihash(k, 633) - 0.5) * 0.34;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
      px(-L / 2, -th / 2, L, th, '#2f2419');
      px(-L / 2, -th / 2, L, th * 0.32, '#41321f');
      px(-L / 2, th * 0.18, L, th * 0.32, '#1c1610');
      for (let j = 0; j < 7; j++) if (ihash(k * 9 + j, 634) > 0.45) px(-L / 2 + j * L / 7, -th / 2 - 1.4 * z, L / 8, 2.4 * z, 'rgba(150,160,110,0.45)');
      ctx.restore();
    }
    // ---- marl in suspension -----------------------------------------------
    ctx.globalAlpha = 0.45;
    for (const M of this.motes) {
      const [sx, sy] = cam.toScreen(M.x, M.y);
      if (sy < top || sx < -4 || sx > W + 4) continue;
      px(sx, sy, M.s * z, M.s * z, Math.sin(M.ph) > 0 ? '#cfd8ae' : '#9aa87e');
    }
    ctx.globalAlpha = 1;
  },

  // ---- FRONT: the grass you are in --------------------------------------
  front(ctx, cam, day) {
    if (!this.on(cam.x)) return;
    const W = G.W, H = G.H, z = cam.zoom, hy = cam.toScreen(0, 0)[1];
    const light = World.light(day);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    // ---- a stand of grass right in front of the camera --------------------
    // Drawn at more than one parallax so going through it reads as going
    // through something, not past a wallpaper.
    const P = G.player;
    for (const [PAR, cell, scale, col0, col1, alpha] of [
      [1.14, 150, 1.0, '#22371a', '#3c5a24', 0.92],
      [1.36, 210, 1.5, '#16260f', '#26401a', 1.0],
    ]) {
      const ox = cam.x * PAR;
      const k0 = Math.floor((ox - W / z) / cell) - 1, k1 = Math.ceil((ox + W / z) / cell) + 1;
      for (let k = k0; k <= k1; k++) {
        const r = ihash(k, 700);
        if (r > 0.44) continue;
        const sx = (k * cell + r * cell * 1.4 - ox) * z + W / 2;
        if (sx < -90 * z || sx > W + 90 * z) continue;
        const base = hy + (10 + ihash(k, 701) * 26) * z;
        const nb = 7 + Math.floor(ihash(k, 702) * 6);
        ctx.globalAlpha = alpha;
        for (let b = 0; b < nb; b++) {
          const u = b / (nb - 1) - 0.5;
          const bx = sx + u * 34 * z * scale;
          const hgt = (52 + ihash(k * 13 + b, 703) * 54) * z * scale;
          const sway = Math.sin(this.t * 0.8 + k + b * 0.5) * 4 * z;
          // pushed aside where the animal is going through it
          const near = P ? clamp(1 - Math.abs(cam.toScreen(P.x, 0)[0] - bx) / (70 * z), 0, 1) : 0;
          const push = near * sign(P ? P.vx : 1) * 9 * z * Math.min(1, Math.abs(P ? P.vx : 0) / 120);
          const tipx = bx + sway + u * 16 * z * scale + push;
          ctx.strokeStyle = b % 2 ? col0 : col1;
          ctx.lineWidth = Math.max(1, (1.8 + scale) * z);
          ctx.beginPath(); ctx.moveTo(bx, base);
          ctx.quadraticCurveTo(bx + sway * 0.4 + push * 0.3, base - hgt * 0.55, tipx, base - hgt);
          ctx.stroke();
          if (((b * 5 + k) % 4) === 0) px(tipx - z, base - hgt - 4 * z, 2.4 * z, 5 * z, '#a08c4a');
        }
        ctx.globalAlpha = 1;
      }
    }
    // ---- dragonflies ------------------------------------------------------
    for (const F of this.flies) {
      const [sx, sy] = cam.toScreen(F.x, F.y);
      if (sx < -8 || sx > W + 8) continue;
      const s = Math.max(1, z);
      const wingUp = Math.sin(this.t * 40 + F.ph) > 0;
      px(sx - 4 * s, sy, 9 * s, 1.2 * s, F.c);                       // the body
      px(sx + 4 * s, sy - 0.5 * s, 2 * s, 2 * s, '#1a2226');         // the head
      ctx.globalAlpha = 0.55;
      px(sx - 1 * s, sy + (wingUp ? -3 : 1) * s, 7 * s, 1 * s, '#dff0f8');
      px(sx - 3 * s, sy + (wingUp ? -2 : 2) * s, 6 * s, 1 * s, '#cfe4ee');
      ctx.globalAlpha = 1;
    }
    // ---- and the light lying on everything --------------------------------
    if (light > 0.5) {
      ctx.globalAlpha = (light - 0.5) * 0.1;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#fff2c0'); g.addColorStop(0.5, 'rgba(255,242,192,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  },
};
