'use strict';
// ---------------------------------------------------------------------------
// THE SYSTEM, DRAWN AS A SYSTEM.
//
// A sewer is not a room with a floor and a ceiling. It is a bore: a section of
// masonry with a hole through it, and the hole goes somewhere. Drawing it as a
// flat back wall between two lines gives you a corridor with a pond in it,
// which is what this used to be.
//
// So: the mass is masonry, brick by brick, every brick its own value. The
// cavity is cut out of it and behind the cavity is another wall, half a
// parallax step back, with arch ribs marching away down it at three depths and
// the middle of the run going black. In front of that is the arch you are
// actually inside — crown band, haunch, invert — with a rib every bay, a cable
// slung between the ribs and a bulkhead lamp under every other one throwing
// the only light there is.
// ---------------------------------------------------------------------------
const Sewer = {
  // Which works this stretch was built as. null means it is not the system at
  // all — open sky, or the laboratory, which draws itself.
  styleOf(B) {
    if (!B || !B.indoor || B.lab) return null;
    return B.pipe ? 'pipe' : B.roman ? 'stone' : 'brick';
  },

  pal(B, style) {
    const g = B.ground;
    if (style === 'pipe') return {
      face: '#4a5257', lit: '#7a858b', mid: '#394045', dark: '#1e2427', void: '#070a0b',
      joint: '#2a3135', slime: '#41533c', grease: '#22281f', wet: '#5d6a6c', course: 26, radial: false, smooth: true,
    };
    if (style === 'stone') return {
      face: shade(g[0], 1.02), lit: shade(g[0], 1.5), mid: shade(g[1], 0.92), dark: shade(g[2], 0.64), void: '#0a0806',
      joint: shade(g[2], 0.5), slime: '#5d6a33', grease: '#2a2418', wet: shade(g[0], 1.2), course: 22, radial: true,
    };
    return {
      face: shade(g[0], 0.94), lit: shade(g[0], 1.42), mid: shade(g[1], 0.86), dark: shade(g[2], 0.6), void: '#050809',
      joint: shade(g[2], 0.46), slime: '#46602f', grease: '#1d2317', wet: shade(g[0], 1.18), course: 14, radial: true,
    };
  },

  // ---- the section across the screen, sampled once a frame ----------------
  section(cam, step) {
    const W = G.W, n = Math.ceil((W + step * 3) / step);
    const out = { n, step, sx: new Float64Array(n), top: new Float64Array(n), bot: new Float64Array(n), ok: new Uint8Array(n), wx: new Float64Array(n) };
    for (let i = 0; i < n; i++) {
      const sx = -step + i * step, wx = cam.toWorldX(sx);
      const rf = World.roofY(wx), fl = World.floorY(wx);
      out.sx[i] = sx; out.wx[i] = wx;
      if (rf === null) { out.ok[i] = 0; out.top[i] = -50; out.bot[i] = G.H + 50; continue; }
      out.top[i] = cam.toScreen(0, rf)[1];
      out.bot[i] = cam.toScreen(0, fl)[1];
      out.ok[i] = 1;
    }
    return out;
  },

  // the cavity, as a closed path
  path(ctx, S, inset) {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < S.n; i++) { if (!S.ok[i]) continue; const py = S.top[i] + inset; if (!started) { ctx.moveTo(S.sx[i], py); started = true; } else ctx.lineTo(S.sx[i], py); }
    if (!started) return false;
    for (let i = S.n - 1; i >= 0; i--) { if (!S.ok[i]) continue; ctx.lineTo(S.sx[i], S.bot[i] - inset); }
    ctx.closePath();
    return true;
  },

  vanish(cam) {
    const rf = World.roofY(cam.x), fl = World.floorY(cam.x);
    const mid = rf === null ? 0 : (rf + fl) * 0.5;
    return [G.W / 2, cam.toScreen(0, mid)[1]];
  },

  draw(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom, step = Math.max(3, Math.round(3 * z));
    const style = this.styleOf(Biome.at(cam.x));
    if (!style) return false;
    const B = Biome.mixPal(cam.x);
    const P = this.pal(B, style);

    // --- the mass: everything is masonry until the bore is cut out of it ---
    ctx.fillStyle = P.mid; ctx.fillRect(0, 0, W, H);
    this.masonry(ctx, cam, P, style, 1, 0.9);

    // --- inside the bore: a wall further back, ribbed, going dark ---------
    const S = this.section(cam, step);
    ctx.save();
    if (this.path(ctx, S, 0)) {
      ctx.clip();
      ctx.fillStyle = mixColor(P.face, P.void, 0.55); ctx.fillRect(0, 0, W, H);
      this.masonry(ctx, cam, P, style, 0.55, 0.5);
      // BACKGROUND: another gallery behind this one, at a third of the
      // parallax, with its own piers and its own stair going up out of shot
      this.farGallery(ctx, cam, S, P, style);
      this.farRibs(ctx, cam, S, P, style);
      this.depth(ctx, cam, S, P);
      this.tide(ctx, cam, S, P);
      this.streaks(ctx, cam, S, P);
    }
    ctx.restore();

    // --- MIDGROUND: the arch you are actually inside ----------------------
    this.nearRing(ctx, cam, S, P, style, step);
    this.steps(ctx, cam, P);
    this.railings(ctx, cam, P);
    this.fittings(ctx, cam, S, P, style);
    this.crownDetail(ctx, cam, S, P, style, World.t);
    if ((Biome.at(cam.x).toxic || 0) > 0.35) this.acid(ctx, cam, S, Biome.at(cam.x));
    return true;
  },

  // ---- BACKGROUND -------------------------------------------------------
  // A second run of the system behind this one, half a parallax step back:
  // piers with arch heads over them, a black gallery between the piers, a side
  // opening or two with the dead light of another level in it, and somewhere
  // down there a flight of steps going up into nothing. It is what stops the
  // back wall being a wall.
  farGallery(ctx, cam, S, P, style) {
    const W = G.W, H = G.H, z = cam.zoom, PAR = 0.42;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const back = mixColor(P.face, P.void, 0.86), pier = mixColor(P.face, P.void, 0.62);
    const pierL = mixColor(pier, P.lit, 0.22), pierD = mixColor(P.void, pier, 0.22);
    // the camera moves less back here, so the arcade slides against the bore
    const ox = cam.x * PAR, oy = cam.y * PAR;
    const cell = 104;
    const k0 = Math.floor((ox - W / z) / cell) - 1, k1 = Math.ceil((ox + W / z) / cell) + 1;
    // the middle of the run is the darkest thing on the screen
    const fl = cam.toScreen(0, World.floorY(cam.x))[1], rf = cam.toScreen(0, World.roofY(cam.x) || 0)[1];
    const midY = clamp((fl + rf) / 2, H * 0.22, H * 0.78);
    for (let k = k0; k <= k1; k++) {
      const sx = (k * cell - ox) * z + W / 2;
      if (sx < -90 * z || sx > W + 90 * z) continue;
      const h = ihash(k, 211);
      const top = midY - (40 + h * 18) * z, bot = midY + (44 + ihash(k, 212) * 18) * z;
      const pw = (8 + h * 4) * z;
      // the opening between this pier and the next: the black of another run
      px(sx, top, cell * z, bot - top, back);
      // the pier, its lit face and the shadow it throws into the opening
      px(sx - pw / 2, top - 6 * z, pw, bot - top + 12 * z, pier);
      px(sx - pw / 2, top - 6 * z, pw * 0.3, bot - top + 12 * z, pierL);
      px(sx + pw / 2 - pw * 0.24, top - 6 * z, pw * 0.24, bot - top + 12 * z, pierD);
      px(sx - pw / 2, top - 6 * z, pw, 2 * z, pierL);
      // an arch head springing off it
      ctx.fillStyle = pier;
      ctx.beginPath();
      ctx.moveTo(sx + pw / 2, top);
      for (let q = 0; q <= 8; q++) { const u = q / 8; ctx.lineTo(sx + pw / 2 + u * (cell * z - pw), top - Math.sin(u * Math.PI) * 20 * z); }
      ctx.lineTo(sx + cell * z - pw / 2, top - 5 * z);
      for (let q = 8; q >= 0; q--) { const u = q / 8; ctx.lineTo(sx + pw / 2 + u * (cell * z - pw), top - Math.sin(u * Math.PI) * 20 * z - 5 * z); }
      ctx.closePath(); ctx.fill();
      // every fourth bay is a doorway with the dead light of another level in it
      if ((((k % 4) + 4) % 4) === 0) {
        const dw = 26 * z, dh = 44 * z, dx = sx + cell * z * 0.5 - dw / 2;
        px(dx, bot - dh, dw, dh, '#05090a');
        px(dx, bot - dh, dw, 2 * z, pierD);
        const gl = 0.10 + 0.04 * Math.sin(World.t * 1.6 + k);
        px(dx + 2 * z, bot - dh + 4 * z, dw - 4 * z, dh - 6 * z, 'rgba(150,196,186,' + gl.toFixed(3) + ')');
        // and a flight of steps going up out of it
        for (let q = 0; q < 6; q++) px(dx + dw - 4 * z - q * 4 * z, bot - q * 5 * z - 5 * z, 5 * z, 2 * z, mixColor(pier, P.lit, 0.18));
      }
      // a side pipe discharging into the far run, because something always is
      if ((((k % 7) + 7) % 7) === 3) {
        const py2 = bot - 30 * z;
        px(sx + cell * z * 0.34, py2, 11 * z, 11 * z, pierD);
        px(sx + cell * z * 0.34 + 2 * z, py2 + 2 * z, 7 * z, 7 * z, '#04080a');
        px(sx + cell * z * 0.34 + 4 * z, py2 + 8 * z, 2 * z, 26 * z, 'rgba(150,190,180,0.16)');
      }
    }
    // the whole arcade sits behind a wash of the dark between here and there
    const g = ctx.createLinearGradient(0, midY - 90 * z, 0, midY + 90 * z);
    g.addColorStop(0, 'rgba(4,7,8,0.45)'); g.addColorStop(0.5, 'rgba(4,7,8,0.12)'); g.addColorStop(1, 'rgba(4,7,8,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, midY - 90 * z, W, 180 * z);
  },

  // ---- the stairs -------------------------------------------------------
  // A flight in this world is cast, not worn: a flat tread, a hard riser and a
  // nosing that catches whatever light there is. Drawn on top of the floor so
  // the steps read as steps and not as a ramp with a texture on it.
  steps(ctx, cam, P) {
    if (typeof stairAt !== 'function') return;
    const W = G.W, z = cam.zoom, step = Math.max(2, Math.round(2 * z));
    const nose = mixColor(P.lit, '#ffffff', 0.2), riser = mixColor(P.dark, '#000000', 0.3), tread = mixColor(P.face, P.lit, 0.22);
    let prevY = null, prevX = null;
    for (let sx = -step; sx <= W + step; sx += step) {
      const wx = cam.toWorldX(sx);
      if (!stairAt(wx)) { prevY = null; continue; }
      const [, sy] = cam.toScreen(wx, World.floorY(wx));
      ctx.fillStyle = tread; ctx.fillRect(sx, Math.round(sy), step, Math.ceil(3 * z));
      ctx.fillStyle = nose; ctx.fillRect(sx, Math.round(sy), step, Math.max(1, Math.round(1.4 * z)));
      if (prevY !== null && Math.abs(sy - prevY) > 2.2 * z) {
        // the riser, and the shadow the nosing throws down its face
        const top = Math.min(sy, prevY), hgt = Math.abs(sy - prevY);
        ctx.fillStyle = riser; ctx.fillRect(sx - step, Math.round(top), step * 2, Math.round(hgt));
        ctx.fillStyle = nose; ctx.fillRect(sx - step, Math.round(top), step * 2, Math.max(1, Math.round(1.2 * z)));
        ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.fillRect(sx - step, Math.round(top + 1.2 * z), step * 2, Math.max(1, Math.round(2.4 * z)));
      }
      prevY = sy; prevX = sx;
    }
    // the handrail up the flight: standards every ten feet and two rails
    const left = cam.toWorldX(-40), right = cam.toWorldX(W + 40);
    for (let wx = Math.floor(left / 32) * 32; wx < right; wx += 32) {
      if (!stairAt(wx)) continue;
      const [sx2, sy2] = cam.toScreen(wx, World.floorY(wx));
      const [, sy3] = cam.toScreen(0, World.floorY(wx + 32));
      ctx.fillStyle = '#57605e'; ctx.fillRect(Math.round(sx2), Math.round(sy2 - 34 * z), Math.max(1, Math.round(2.6 * z)), Math.round(34 * z));
      ctx.fillStyle = '#7b8683'; ctx.fillRect(Math.round(sx2), Math.round(sy2 - 34 * z), Math.max(1, Math.round(1.2 * z)), Math.round(34 * z));
      for (const off of [34, 20]) {
        ctx.save();
        ctx.strokeStyle = off === 34 ? '#8d9895' : '#5d6764';
        ctx.lineWidth = Math.max(1, Math.round(2 * z));
        ctx.beginPath(); ctx.moveTo(sx2, sy2 - off * z); ctx.lineTo(sx2 + 32 * z, sy3 - off * z); ctx.stroke();
        ctx.restore();
      }
    }
  },

  // ---- the railings -----------------------------------------------------
  // Anywhere there is dry brick to stand on, somebody bolted a rail to it in
  // 1974 and nobody has leaned on it since.
  railings(ctx, cam, P) {
    const W = G.W, z = cam.zoom;
    const left = cam.toWorldX(-40), right = cam.toWorldX(W + 40);
    const post = '#4e5654', postL = '#79837f', rail = '#8a9591', railD = '#3c4342';
    let run = null;
    for (let wx = Math.floor(left / 20) * 20; wx < right + 20; wx += 20) {
      const dry = World.floorY(wx) < -8 && (typeof stairAt !== 'function' || !stairAt(wx));
      if (dry && !run) run = wx;
      if ((!dry || wx >= right) && run !== null) {
        if (wx - run > 70) this.railRun(ctx, cam, run + 12, wx - 12, post, postL, rail, railD);
        run = null;
      }
    }
  },
  railRun(ctx, cam, x0, x1, post, postL, rail, railD) {
    const z = cam.zoom;
    const H1 = 40, H2 = 24;
    const pt = (wx, h) => cam.toScreen(wx, World.floorY(wx) - h);
    for (const h of [H1, H2]) {
      ctx.strokeStyle = h === H1 ? rail : railD; ctx.lineWidth = Math.max(1, Math.round((h === H1 ? 2.4 : 1.8) * z));
      ctx.beginPath();
      for (let wx = x0; wx <= x1; wx += 18) { const [sx, sy] = pt(wx, h); if (wx === x0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy); }
      const [ex, ey] = pt(x1, h); ctx.lineTo(ex, ey); ctx.stroke();
    }
    for (let wx = x0; wx <= x1; wx += 34) {
      const [sx, sy] = cam.toScreen(wx, World.floorY(wx));
      ctx.fillStyle = post; ctx.fillRect(Math.round(sx - z), Math.round(sy - H1 * z - 2 * z), Math.max(1, Math.round(3 * z)), Math.round(H1 * z + 3 * z));
      ctx.fillStyle = postL; ctx.fillRect(Math.round(sx - z), Math.round(sy - H1 * z - 2 * z), Math.max(1, Math.round(1.2 * z)), Math.round(H1 * z + 3 * z));
      ctx.fillStyle = '#2c3231'; ctx.fillRect(Math.round(sx - 4 * z), Math.round(sy - 2 * z), Math.round(9 * z), Math.round(3 * z));
    }
  },

  // ---- the acid ---------------------------------------------------------
  // The plating line drained into the bottom of this thing for thirty years.
  // What is down there now is bright, it is green, and it is still working.
  acid(ctx, cam, S, B) {
    const W = G.W, H = G.H, z = cam.zoom;
    const wl = cam.toScreen(0, 0)[1];
    const lit = '#c8f030', mid = '#7aa825';
    // the glow that comes up out of it
    const g = ctx.createLinearGradient(0, Math.max(0, wl), 0, H);
    g.addColorStop(0, 'rgba(150,220,50,0.06)'); g.addColorStop(1, 'rgba(110,190,40,0.20)');
    ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, wl), W, H);
    // the scum line where it meets the brick, breathing
    for (let i = 0; i < S.n; i++) {
      if (!S.ok[i]) continue;
      const sx = S.sx[i], b = S.bot[i];
      const k = Math.sin(World.t * 1.3 + S.wx[i] * 0.02) * 1.6 * z;
      ctx.fillStyle = 'rgba(168,208,32,0.30)'; ctx.fillRect(sx, Math.round(b - 16 * z + k), S.step + 1, Math.round(16 * z));
      ctx.fillStyle = mid; ctx.fillRect(sx, Math.round(b - 16 * z + k), S.step + 1, Math.max(1, Math.round(1.6 * z)));
    }
    // fume coming off it, and the odd drip going in
    ctx.globalAlpha = 0.14;
    for (let i = 0; i < 22; i++) {
      const u = ((World.t * 0.11 + ihash(i, 301)) % 1);
      const sx = (ihash(i, 302) * W + Math.sin(World.t * 0.4 + i) * 10) % W;
      ctx.fillStyle = lit;
      ctx.fillRect(Math.round(sx), Math.round(wl - u * 70 * z), Math.round((5 + ihash(i, 303) * 16) * z), Math.round(3 * z));
    }
    ctx.globalAlpha = 1;
    if (chance(0.5)) G.fx.add({ type: 'drop', x: cam.toWorldX(rand(0, W)), y: -rand(20, 90), vx: 0, vy: 120, s: 1, color: '#b8e030', life: 0.9 });
  },

  // ---- FOREGROUND -------------------------------------------------------
  // What is between the camera and the animal: a main crossing the bore, a
  // chain off a lifting eye, a bracket, a length of handrail. All of it in
  // near-silhouette and all of it moving faster than the wall behind, because
  // that is the only thing that tells you there is a depth to be in.
  foreground(ctx, cam) {
    const style = this.styleOf(Biome.at(cam.x));
    if (!style) return;
    const W = G.W, H = G.H, z = cam.zoom, PAR = 1.34;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const ox = cam.x * PAR, oy = cam.y * PAR;
    const sxOf = (wx) => (wx - ox) * z + W / 2;
    const syOf = (wy) => (wy - oy) * z + H / 2;
    const fl = World.floorY(cam.x), rf = World.roofY(cam.x);
    if (rf === null) return;
    const dark = '#070b0c', darkL = '#141b1c', darkR = '#2a1c14';
    const cell = 300;
    const k0 = Math.floor((ox - W / z) / cell) - 1, k1 = Math.ceil((ox + W / z) / cell) + 1;
    for (let k = k0; k <= k1; k++) {
      const wx = k * cell, sx = sxOf(wx);
      if (sx < -200 * z || sx > W + 200 * z) continue;
      const pick = ((k % 4) + 4) % 4, h = ihash(k, 401);
      if (pick === 0) {
        // a main crossing the bore under the crown, on two brackets
        const y = syOf(rf + 22 + h * 26), th = (16 + h * 10) * z;
        px(sx - 190 * z, y, 380 * z, th, dark);
        px(sx - 190 * z, y, 380 * z, 2.4 * z, darkL);
        px(sx - 190 * z, y + th - 2 * z, 380 * z, 2 * z, '#030506');
        for (const bx of [-120, 0, 120]) { px(sx + bx * z - 4 * z, y - 5 * z, 9 * z, th + 10 * z, darkL); px(sx + bx * z - 4 * z, y - 5 * z, 9 * z, 2 * z, '#1e2728'); }
        // a joint with a bolt ring on it
        px(sx - 12 * z, y - 3 * z, 24 * z, th + 6 * z, '#0d1314');
        for (let i = 0; i < 4; i++) px(sx - 9 * z + i * 6 * z, y - 1 * z, 3 * z, 3 * z, '#232c2d');
      } else if (pick === 1) {
        // a chain off a lifting eye, swinging a little
        const y0 = syOf(rf + 6), sw = Math.sin(World.t * 0.7 + k) * 5 * z;
        px(sx - 6 * z, y0, 13 * z, 7 * z, darkL);
        for (let i = 0; i < 16; i++) {
          const u = i / 16, yy = y0 + 6 * z + i * 9 * z;
          if (yy > H + 20) break;
          px(sx + sw * u - 2 * z, yy, 5 * z, 6 * z, i % 2 ? dark : darkL);
        }
        px(sx + sw - 7 * z, y0 + 6 * z + 16 * 9 * z, 15 * z, 10 * z, darkR);
      } else if (pick === 2) {
        // a length of handrail along the near bench. It is anchored to the
        // bottom of the frame, not to the floor: a rail across the middle of
        // the shot is not a foreground, it is a fence between you and the game
        const y = H - Math.min(H * 0.2, 44 * z);
        px(sx - 200 * z, y, 400 * z, 3.4 * z, darkL);
        px(sx - 200 * z, y + 16 * z, 400 * z, 2.4 * z, dark);
        for (let i = -4; i <= 4; i++) px(sx + i * 46 * z, y, 4 * z, H - y);
      } else {
        // a cable bundle sagging across, with a tag hanging off it
        ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, Math.round(5 * z));
        const y = syOf(rf + 40 + h * 30);
        ctx.beginPath(); ctx.moveTo(sx - 200 * z, y);
        ctx.quadraticCurveTo(sx, y + 34 * z, sx + 200 * z, y); ctx.stroke();
        ctx.strokeStyle = darkL; ctx.lineWidth = Math.max(1, Math.round(1.6 * z));
        ctx.beginPath(); ctx.moveTo(sx - 200 * z, y - 2 * z);
        ctx.quadraticCurveTo(sx, y + 32 * z, sx + 200 * z, y - 2 * z); ctx.stroke();
        px(sx - 3 * z, y + 30 * z, 7 * z, 10 * z, '#2a2a1c');
      }
    }
    // the frame itself goes dark at the edges: you are inside a pipe
    const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.74);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,5,6,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },

  // Courses. Every brick its own value, because a wall that repeats exactly is
  // a grid and reads as wallpaper. Precast pipe gets concrete and ring joints
  // instead: a pipe is not laid brick by brick.
  masonry(ctx, cam, P, style, par, alpha) {
    const z = cam.zoom, c = P.course;
    const tex = Tex.get('sw3|' + style + '|' + P.face + '|' + c, 96, (x, S) => {
      x.fillStyle = P.face; x.fillRect(0, 0, S, S);
      if (P.smooth) {
        for (let i = 0; i < 240; i++) {
          const gx = ihash(i, 41) * S, gy = ihash(i, 42) * S, v = ihash(i, 43);
          x.fillStyle = v < 0.4 ? 'rgba(255,255,255,0.045)' : v < 0.8 ? 'rgba(0,0,0,0.07)' : 'rgba(120,140,132,0.07)';
          x.fillRect(gx | 0, gy | 0, 1 + (v > 0.93 ? 2 : 0), 1);
        }
        for (let y = 0; y < S; y += c) {
          x.fillStyle = P.joint; x.fillRect(0, y, S, 2);
          x.fillStyle = shade(P.face, 1.18); x.fillRect(0, y + 2, S, 1);
        }
      } else {
        const rows = Math.round(S / c);
        for (let r = 0; r < rows; r++) {
          const y = r * c, off = (r % 2) * c;
          for (let bx = -c; bx < S; bx += c * 2) {
            const hh = ihash(r * 37 + Math.floor((bx + off) / c), 5);
            x.fillStyle = hh < 0.16 ? shade(P.face, 0.76) : hh < 0.34 ? shade(P.face, 0.89) : hh < 0.72 ? P.face : shade(P.face, 1.1);
            x.fillRect(bx + off + 1, y + 1, c * 2 - 2, c - 2);
            x.globalAlpha = 0.3; x.fillStyle = shade(P.face, 1.28);
            x.fillRect(bx + off + 1, y + 1, c * 2 - 2, 1);
            x.globalAlpha = 1;
          }
          x.fillStyle = P.joint; x.fillRect(0, y, S, 1);
        }
        x.fillStyle = P.joint;
        for (let r = 0; r < rows; r++) { const y = r * c, off = (r % 2) * c; for (let bx = -c; bx < S; bx += c * 2) x.fillRect(bx + off, y, 1, c); }
      }
      // Salts and damp, as scatters of single pixels. A soft disc at this zoom
      // is a lens flare, which is what the wall used to be covered in.
      for (let i = 0; i < 26; i++) {
        const cx2 = ihash(i, 21) * S, cy2 = ihash(i, 22) * S, r2 = 3 + ihash(i, 23) * 7;
        const pale = ihash(i, 25) > 0.5;
        x.globalAlpha = pale ? 0.09 : 0.11;
        x.fillStyle = pale ? '#cfd6c8' : '#0a0e0c';
        for (let k = 0; k < 26; k++) {
          const a = ihash(i * 31 + k, 26) * TAU, d = Math.sqrt(ihash(i * 31 + k, 27)) * r2;
          x.fillRect((cx2 + Math.cos(a) * d) | 0, (cy2 + Math.sin(a) * d) | 0, 1, 1);
        }
      }
      x.globalAlpha = 1;
    });
    ctx.globalAlpha = alpha;
    Tex.fill(ctx, tex, cam.x * par, cam.y * par, z, 1);
    ctx.globalAlpha = 1;
  },

  // Arch ribs on the far wall, one a bay, each a band that follows the crown
  // down both haunches. Three depths, smaller and darker going back, so the
  // eye has somewhere to go.
  farRibs(ctx, cam, S, P, style) {
    const W = G.W, z = cam.zoom, BAY = 120;
    const leftW = cam.toWorldX(-BAY), rightW = cam.toWorldX(W + BAY);
    for (let d = 2; d >= 0; d--) {
      const k = 0.16 + d * 0.17;
      const col = mixColor(P.face, P.void, 0.5 + d * 0.16);
      const lit = mixColor(P.lit, P.void, 0.55 + d * 0.15);
      for (let wx = Math.floor(leftW / BAY) * BAY + d * 34; wx < rightW; wx += BAY) {
        const rf = World.roofY(wx); if (rf === null) continue;
        const fl = World.floorY(wx), h = fl - rf;
        const [sx, sy] = cam.toScreen(wx, rf + h * k);
        const [, by] = cam.toScreen(wx, fl - h * k * 0.5);
        const w2 = Math.max(2, Math.round((13 - d * 3) * z));
        ctx.fillStyle = col; ctx.fillRect(Math.round(sx - w2 / 2), Math.round(sy), w2, Math.round(by - sy));
        ctx.fillStyle = lit; ctx.fillRect(Math.round(sx - w2 / 2), Math.round(sy), Math.max(1, Math.round(1.6 * z)), Math.round(by - sy));
        ctx.fillStyle = col; ctx.fillRect(Math.round(sx - w2), Math.round(by), w2 * 2, Math.max(1, Math.round(3 * z)));
      }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = col;
      for (let i = 0; i < S.n; i++) {
        if (!S.ok[i]) continue;
        const hh = S.bot[i] - S.top[i];
        ctx.fillRect(S.sx[i], Math.round(S.top[i] + hh * k), S.step, Math.max(1, Math.round(3 * z)));
      }
      ctx.globalAlpha = 1;
    }
  },

  // The dark down the middle of the run.
  depth(ctx, cam, S, P) {
    const W = G.W, H = G.H;
    const vp = this.vanish(cam);
    const g = ctx.createRadialGradient(vp[0], vp[1], 4, vp[0], vp[1], Math.max(W, H) * 0.42);
    g.addColorStop(0, P.void);
    g.addColorStop(0.45, mixColor(P.void, P.face, 0.18));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },

  // The tide line the system left when it was running fuller than it is now.
  tide(ctx, cam, S, P) {
    const z = cam.zoom, W = G.W;
    const [, wy] = cam.toScreen(0, World.surface(cam.x));
    if (wy < -20 || wy > G.H + 20) return;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = P.grease; ctx.fillRect(0, Math.round(wy - 7 * z), W, Math.ceil(7 * z));
    ctx.fillStyle = P.slime; ctx.fillRect(0, Math.round(wy), W, Math.ceil(3 * z));
    ctx.globalAlpha = 0.25;
    for (let sx = 0; sx < W; sx += Math.max(3, Math.round(6 * z))) {
      const h = ihash(Math.floor((cam.x + sx / cam.zoom) / 7), 71);
      if (h > 0.5) continue;
      ctx.fillStyle = P.slime;
      ctx.fillRect(sx, Math.round(wy + 3 * z), Math.max(1, Math.round(2 * z)), Math.ceil((2 + h * 18) * z));
    }
    ctx.globalAlpha = 1;
  },

  // Water has run down this wall for a hundred years and left it in stripes.
  streaks(ctx, cam, S, P) {
    const W = G.W, z = cam.zoom;
    const leftW = cam.toWorldX(-30), rightW = cam.toWorldX(W + 30);
    for (let wx = Math.floor(leftW / 19) * 19; wx < rightW; wx += 19) {
      const h = ihash(Math.floor(wx / 19), 811);
      if (h > 0.5) continue;
      const rf = World.roofY(wx); if (rf === null) continue;
      const fl = World.floorY(wx);
      const [sx, sy] = cam.toScreen(wx, rf);
      const len = (fl - rf) * (0.2 + h * 0.9) * z;
      ctx.globalAlpha = 0.10 + h * 0.18;
      ctx.fillStyle = h < 0.2 ? mixColor(P.lit, '#ffffff', 0.4) : P.grease;
      ctx.fillRect(Math.round(sx), Math.round(sy), Math.max(1, Math.round((1 + h * 3) * z)), Math.round(len));
      ctx.globalAlpha = 1;
    }
  },

  // The arch you are inside: voussoirs round the crown, the invert lip, and a
  // deep shadow top and bottom so the bore has a roof and a floor rather than
  // reading as a cut-out.
  nearRing(ctx, cam, S, P, style, step) {
    const W = G.W, H = G.H, z = cam.zoom, TH = 15;
    for (let i = 0; i < S.n; i++) {
      if (!S.ok[i]) continue;
      const sx = S.sx[i], top = S.top[i], bot = S.bot[i], wx = S.wx[i], th = TH * z;
      if (top > -th - 4 && top < H + 4) {
        ctx.fillStyle = P.face; ctx.fillRect(sx, Math.round(top - th), Math.ceil(step), Math.ceil(th));
        ctx.fillStyle = P.lit; ctx.fillRect(sx, Math.round(top - 3 * z), Math.ceil(step), Math.max(1, Math.round(3 * z)));
        ctx.fillStyle = P.joint; ctx.fillRect(sx, Math.round(top), Math.ceil(step), Math.max(1, Math.round(2 * z)));
        if (P.radial && ((wx % P.course) + P.course) % P.course < step / z) {
          ctx.fillStyle = P.joint; ctx.fillRect(sx, Math.round(top - th), Math.max(1, Math.round(1.6 * z)), Math.ceil(th));
        }
      }
      if (bot > -4 && bot < H + th + 4) {
        ctx.fillStyle = P.wet; ctx.fillRect(sx, Math.round(bot - 2 * z), Math.ceil(step), Math.max(1, Math.round(2 * z)));
        ctx.fillStyle = P.dark; ctx.fillRect(sx, Math.round(bot), Math.ceil(step), Math.ceil(6 * z));
      }
    }
    const gTop = ctx.createLinearGradient(0, 0, 0, H);
    gTop.addColorStop(0, 'rgba(0,0,0,0.55)'); gTop.addColorStop(0.34, 'rgba(0,0,0,0)');
    gTop.addColorStop(0.72, 'rgba(0,0,0,0)'); gTop.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = gTop; ctx.fillRect(0, 0, W, H);
  },

  // What the engineers left in it: a rib every bay, a cable run slung between
  // the ribs, and a bulkhead lamp under every other one.
  fittings(ctx, cam, S, P, style) {
    const W = G.W, z = cam.zoom, BAY = 150;
    const leftW = cam.toWorldX(-BAY), rightW = cam.toWorldX(W + BAY);
    const rib = shade(P.face, 0.72), ribL = shade(P.face, 1.3);
    for (let wx = Math.floor(leftW / BAY) * BAY; wx < rightW; wx += BAY) {
      const rf = World.roofY(wx); if (rf === null) continue;
      const fl = World.floorY(wx);
      const [sx, sy] = cam.toScreen(wx, rf), fy = cam.toScreen(wx, fl)[1];
      const drop = Math.min(fy - sy, (fl - rf) * 0.3 * z);
      ctx.fillStyle = rib; ctx.fillRect(Math.round(sx - 6 * z), Math.round(sy), Math.round(12 * z), Math.round(drop));
      ctx.fillStyle = ribL; ctx.fillRect(Math.round(sx - 6 * z), Math.round(sy), Math.max(1, Math.round(1.8 * z)), Math.round(drop));
      ctx.fillStyle = shade(P.face, 0.46); ctx.fillRect(Math.round(sx + 4 * z), Math.round(sy), Math.max(1, Math.round(2 * z)), Math.round(drop));
      ctx.fillStyle = rib; ctx.fillRect(Math.round(sx - 10 * z), Math.round(sy + drop), Math.round(20 * z), Math.max(1, Math.round(4 * z)));
      const nx = wx + BAY, nr = World.roofY(nx);
      if (nr !== null) {
        const [nsx, nsy] = cam.toScreen(nx, nr);
        ctx.strokeStyle = shade(P.face, 0.4); ctx.lineWidth = Math.max(1, Math.round(2 * z));
        ctx.beginPath(); ctx.moveTo(sx, sy + 7 * z); ctx.quadraticCurveTo((sx + nsx) / 2, (sy + nsy) / 2 + 14 * z, nsx, nsy + 7 * z); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = Math.max(1, Math.round(z));
        ctx.beginPath(); ctx.moveTo(sx, sy + 6 * z); ctx.quadraticCurveTo((sx + nsx) / 2, (sy + nsy) / 2 + 13 * z, nsx, nsy + 6 * z); ctx.stroke();
      }
    }
    for (let wx = Math.floor(leftW / BAY) * BAY + BAY / 2; wx < rightW; wx += BAY) {
      const rf = World.roofY(wx); if (rf === null) continue;
      const [lx, ly] = cam.toScreen(wx, rf);
      const seed = ihash(Math.floor(wx / BAY), 9);
      const dead = seed < 0.2;
      const flick = seed < 0.34 ? (Math.sin(World.t * 13 + wx) > -0.35 ? 1 : 0.25) : 1;
      const on = dead ? 0 : flick;
      ctx.fillStyle = shade(P.face, 0.45); ctx.fillRect(Math.round(lx - z), Math.round(ly), Math.max(1, Math.round(2 * z)), Math.round(7 * z));
      ctx.fillStyle = '#23282a'; ctx.fillRect(Math.round(lx - 8 * z), Math.round(ly + 6 * z), Math.round(16 * z), Math.round(5 * z));
      ctx.fillStyle = '#39403f'; ctx.fillRect(Math.round(lx - 8 * z), Math.round(ly + 6 * z), Math.round(16 * z), Math.max(1, Math.round(z)));
      ctx.fillStyle = on ? mixColor('#ffe8a8', '#ffffff', 0.25 * on) : '#38383a';
      ctx.fillRect(Math.round(lx - 6 * z), Math.round(ly + 10 * z), Math.round(12 * z), Math.round(3 * z));
      ctx.fillStyle = '#1b1f20';
      for (let k = 0; k < 4; k++) ctx.fillRect(Math.round(lx - 6 * z + k * 4 * z), Math.round(ly + 10 * z), Math.max(1, Math.round(z)), Math.round(3 * z));
      if (!on) continue;
      const su = World.surface(wx), fl = World.floorY(wx);
      const hit = Math.min(su > 0 ? su : fl, fl);
      const hy = cam.toScreen(wx, hit)[1];
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, ly, 0, hy);
      g.addColorStop(0, `rgba(255,226,150,${(0.24 * on).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,214,130,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(lx - 8 * z, ly + 10 * z); ctx.lineTo(lx + 8 * z, ly + 10 * z);
      ctx.lineTo(lx + 30 * z, hy); ctx.lineTo(lx - 30 * z, hy); ctx.closePath(); ctx.fill();
      const rg = ctx.createRadialGradient(lx, ly + 11 * z, 1, lx, ly + 11 * z, 40 * z);
      rg.addColorStop(0, `rgba(255,230,164,${(0.30 * on).toFixed(3)})`); rg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = rg; ctx.fillRect(lx - 40 * z, ly - 24 * z, 80 * z, 80 * z);
      ctx.restore();
      if (chance(0.02)) G.fx.add({ type: 'drop', x: wx + rand(-18, 18), y: rf + 12, vx: 0, vy: 26, s: 1, color: '#9ab0b8', life: 3 });
    }
  },

  // What hangs off the crown: a lime stalactite, efflorescence bleeding out of
  // a joint, and a root that got in and is doing the rest of the damage slowly.
  crownDetail(ctx, cam, S, P, style, t) {
    const W = G.W, H = G.H, z = cam.zoom;
    const leftW = cam.toWorldX(-40), rightW = cam.toWorldX(W + 40);
    for (let wx = Math.floor(leftW / 34) * 34; wx < rightW; wx += 34) {
      const h = ihash(Math.floor(wx / 34), 617);
      const rf = World.roofY(wx); if (rf === null) continue;
      const [sx, sy] = cam.toScreen(wx, rf);
      if (sy < -30 || sy > H + 10) continue;
      if (h < 0.22) {
        const len = (4 + h * 26) * z;
        ctx.fillStyle = mixColor(P.lit, '#e8e4d0', 0.5);
        for (let d = 0; d < len; d += Math.max(1, Math.round(2 * z))) {
          const w2 = Math.max(1, Math.round((3 - 3 * d / len) * z));
          ctx.fillRect(Math.round(sx - w2 / 2), Math.round(sy + d), w2, Math.max(1, Math.round(2 * z)));
        }
        if (chance(0.006)) G.fx.add({ type: 'drop', x: wx, y: rf + len / z, vx: 0, vy: 40, s: 1, color: '#a8c0c0', life: 3 });
      } else if (h < 0.44) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = mixColor(P.lit, '#ffffff', 0.55);
        ctx.fillRect(Math.round(sx - 3 * z), Math.round(sy), Math.ceil(6 * z), Math.ceil((6 + h * 30) * z));
        ctx.globalAlpha = 1;
      } else if (h < 0.52 && style !== 'pipe') {
        ctx.strokeStyle = mixColor('#6a5a38', P.dark, 0.35); ctx.lineWidth = Math.max(1, Math.round(1.4 * z));
        ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + 6 * z, sy + 14 * z, sx - 8 * z, sy + 22 * z, sx + 2 * z, sy + 38 * z);
        ctx.stroke();
      }
    }
  },
};
