'use strict';
// ---------------------------------------------------------------------------
// FACILITY B.
//
// The first thing anybody sees of this game is a wall, and for a long time it
// was one wall, repeated, with a sewer pipe punched through it. It is a
// building now. Six rooms in a line, each with its own job and its own
// fittings, drawn by the same renderer that draws everything else: a transfer
// corridor, a hall of habitat pens with animals in them, a plant room running
// the water for the pens, an access chamber where the building meets the
// system underneath it, and a loading dock with the next truck backed up to it.
//
// The rooms are the level design. You go east because the trolley was going
// east. Past the pens the floor has a manhole in it, and past the manhole is
// the dock, and only one of those is a way out.
// ---------------------------------------------------------------------------
const Facility = {
  // --- palette ----------------------------------------------------------
  C: {
    upper: '#1b2429', upperL: '#26323a', ceil: '#161d22', ceilL: '#2b363d',
    tile: '#b9c5c0', tileD: '#94a29e', tileL: '#d2ded8',
    rail: '#8e9ca0', stripe: '#2a8a70', stripeD: '#1d5f4e',
    steel: '#4a5860', steelL: '#6b7880', steelD: '#2f3a40',
    glass: 'rgba(150,214,206,0.20)', glassL: 'rgba(220,255,250,0.5)',
    warn: '#c8a020', warnL: '#e0c040', hot: '#ff8c40',
    conc: '#7d8388', concD: '#565e63',
  },

  px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); },

  // ---------------------------------------------------------------------
  draw(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom, C = this.C;
    // the building stops where the building stops: past either end the shot is
    // the mass the building was cut into, not more laboratory
    const [bx0] = cam.toScreen(FACILITY.x0, 0), [bx1] = cam.toScreen(FACILITY.x1, 0);
    ctx.fillStyle = '#151a1c'; ctx.fillRect(0, 0, W, H);
    {
      const fillTex = Tex.get('fbmass', 48, (x, S) => {
        x.fillStyle = '#151a1c'; x.fillRect(0, 0, S, S);
        x.fillStyle = '#1b2124'; for (let y = 0; y < S; y += 16) { x.fillRect(0, y, S, 1); const o = ((y / 16) | 0) % 2 ? 16 : 0; for (let xx = o; xx < S; xx += 32) x.fillRect(xx, y, 1, 16); }
        x.fillStyle = 'rgba(255,255,255,0.03)'; for (let y = 1; y < S; y += 16) x.fillRect(0, y, S, 1);
      });
      Tex.fill(ctx, fillTex, cam.x, cam.y, z, 1);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(Math.round(bx0), -10, Math.round(bx1 - bx0), H + 20); ctx.clip();
    const floorS = cam.toScreen(0, World.floorY(cam.x))[1];
    const roofS = cam.toScreen(0, World.roofY(cam.x) || -1700)[1];
    const leftW = cam.toWorldX(-140), rightW = cam.toWorldX(W + 140);
    const px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);

    // --- the shell: upper wall, ceiling, tile dado, skirting --------------
    px(0, 0, W, H, C.upper);
    // ceiling: a coffered soffit with services under it
    this.ceiling(ctx, cam, roofS, leftW, rightW);
    // the tiled dado, which is most of what the camera ever sees
    const tileTop = floorS - 150 * z, tileBot = floorS + 6 * z;
    const tile = Tex.get('fbtile', 32, (x, S) => {
      x.fillStyle = C.tile; x.fillRect(0, 0, S, S);
      x.fillStyle = C.tileD; x.fillRect(0, 0, S, 1); x.fillRect(0, 0, 1, S); x.fillRect(16, 0, 1, S); x.fillRect(0, 16, S, 1);
      x.fillStyle = C.tileL; x.fillRect(1, 1, 14, 1); x.fillRect(17, 17, 14, 1); x.fillRect(1, 1, 1, 14); x.fillRect(17, 17, 1, 14);
      x.fillStyle = '#a7b4af'; x.fillRect(10, 8, 3, 1); x.fillRect(24, 22, 4, 1);
    });
    ctx.save(); ctx.beginPath(); ctx.rect(0, tileTop, W, tileBot - tileTop); ctx.clip();
    Tex.fill(ctx, tile, cam.x, cam.y, z, 0.94); ctx.restore();
    px(0, tileTop - 4 * z, W, 4 * z, C.rail);
    px(0, tileTop - 4 * z, W, z, '#c2ccce');
    px(0, tileTop + 6 * z, W, 3 * z, C.stripe);
    px(0, tileTop + 9 * z, W, z, C.stripeD);
    px(0, floorS - 8 * z, W, 8 * z, 'rgba(28,24,18,0.30)');           // grime at the skirting

    // --- the rooms --------------------------------------------------------
    for (const r of FACILITY.rooms) {
      if (r.x1 < leftW || r.x0 > rightW) continue;
      if (r.id === 'bulkhead') this.bulkhead(ctx, cam, r, floorS, roofS);
      else if (r.id === 'corridor') this.corridor(ctx, cam, r, floorS, roofS, leftW, rightW, tileTop);
      else if (r.id === 'pens') this.pens(ctx, cam, r, floorS, roofS, leftW, rightW);
      else if (r.id === 'plant') this.plant(ctx, cam, r, floorS, roofS);
      else if (r.id === 'access') this.access(ctx, cam, r, floorS, roofS);
      else if (r.id === 'dock') this.dock(ctx, cam, r, floorS, roofS);
      // the room's name, stencilled over the dado where the bay starts
      const [nx] = cam.toScreen(r.x0 + 26, 0);
      if (nx > -120 && nx < W + 40) Font.draw(ctx, r.name, nx, Math.round(roofS + 52 * z), { color: 'rgba(140,164,168,0.5)', scale: Math.max(1, Math.round(z)) });
    }

    // hazard stripe along the base of the wall
    for (let wx = Math.floor(leftW / 24) * 24; wx < rightW; wx += 24) {
      const [sx] = cam.toScreen(wx, 0);
      px(sx, floorS - 3 * z, 24 * z + 1, 3 * z, (Math.floor(wx / 24) & 1) ? C.warn : '#1a1a1a');
    }
    ctx.restore();
  },

  // What is set into the floor rather than standing on the wall: the manhole
  // in the access chamber and the painted edge of the dock. Drawn after the
  // floor itself, from drawBuiltGround, or the floor covers it.
  drawFloor(ctx, cam) {
    const z = cam.zoom, C = this.C, px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    const mx = FACILITY.MANHOLE, [sx, sy] = cam.toScreen(mx, World.floorY(mx));
    if (sx > -140 && sx < G.W + 140) {
      const st = typeof Opening !== 'undefined' && Opening.on ? Opening.coverT || 0 : 0;
      const broken = typeof Opening !== 'undefined' && Opening.coverBroken;
      // the frame, bedded into the slab
      px(sx - 30 * z, sy - 3 * z, 60 * z, 5 * z, '#6f6a5f');
      px(sx - 30 * z, sy - 3 * z, 60 * z, z, '#8a8578');
      px(sx - 26 * z, sy - 5 * z, 52 * z, 4 * z, '#585349');
      if (!broken) {
        // the cover, and what biting it has done to it so far
        px(sx - 24 * z, sy - 7 * z, 48 * z, 5 * z, '#4a463d');
        px(sx - 24 * z, sy - 7 * z, 48 * z, z, '#635e53');
        for (let i = 0; i < 7; i++) px(sx - 20 * z + i * 6 * z, sy - 6 * z, 4 * z, 3 * z, '#565144');
        px(sx - 3 * z, sy - 8 * z, 6 * z, z, '#2c2a25');
        if (st > 0) {
          ctx.strokeStyle = 'rgba(255,220,160,' + (0.4 + st * 0.6).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, Math.round(z));
          for (let k = 0; k < Math.ceil(st * 7); k++) {
            const a = k * 1.9; ctx.beginPath(); ctx.moveTo(sx, sy - 5 * z);
            ctx.lineTo(sx + Math.cos(a) * 22 * z * (0.4 + st * 0.6), sy - 5 * z + Math.sin(a) * 4 * z);
            ctx.stroke();
          }
        }
      } else {
        px(sx - 24 * z, sy - 6 * z, 48 * z, 26 * z, '#080b0c');
        px(sx - 24 * z, sy - 6 * z, 48 * z, 2 * z, '#2a2820');
        px(sx + 26 * z, sy - 18 * z, 5 * z, 18 * z, '#4a463d');   // the cover, thrown clear
        px(sx + 24 * z, sy - 19 * z, 9 * z, 2 * z, '#635e53');
      }
      // and the sign painted on the slab beside it
      px(sx - 44 * z, sy - 2 * z, 10 * z, 2 * z, C.warn);
      px(sx + 34 * z, sy - 2 * z, 10 * z, 2 * z, C.warn);
    }
  },

  // --- the ceiling and everything hung off it ---------------------------
  ceiling(ctx, cam, roofS, leftW, rightW) {
    const W = G.W, z = cam.zoom, C = this.C;
    const px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    px(0, 0, W, Math.max(0, roofS + 10 * z), C.ceil);
    px(0, roofS + 8 * z, W, 3 * z, C.ceilL);
    // beams across the soffit
    for (let wx = Math.floor(leftW / 120) * 120; wx < rightW; wx += 120) {
      const [sx] = cam.toScreen(wx, 0);
      px(sx - 5 * z, roofS + 8 * z, 10 * z, 9 * z, '#202a30');
      px(sx - 5 * z, roofS + 8 * z, 2 * z, 9 * z, '#33404a');
    }
    // duct, cable tray, sprinkler main
    const duct = roofS + 20 * z;
    px(0, duct, W, 15 * z, C.steelD);
    px(0, duct, W, 2 * z, C.steel);
    px(0, duct + 13 * z, W, 2 * z, '#222a2e');
    for (let wx = Math.floor(leftW / 40) * 40; wx < rightW; wx += 40) { const [sx] = cam.toScreen(wx, 0); px(sx, duct, z, 15 * z, '#222a2e'); }
    px(0, duct + 22 * z, W, 2 * z, '#5a6670');
    px(0, duct + 26 * z, W, z, '#c0a040');
    // strip lights and the cones they throw
    for (let wx = Math.floor(leftW / 120) * 120 + 60; wx < rightW; wx += 120) {
      const [sx] = cam.toScreen(wx, 0), lw = 62 * z, ly = roofS + 34 * z;
      px(sx - lw / 2, ly, lw, 5 * z, '#2a3236');
      const on = ihash(Math.floor(wx / 120), 3) > 0.1 || Math.sin(World.t * 17 + wx) > 0.2;
      px(sx - lw / 2 + 2 * z, ly + 4 * z, lw - 4 * z, 2.5 * z, on ? '#e8f4ee' : '#4a5a58');
      if (on) {
        const g = ctx.createLinearGradient(0, ly, 0, ly + 300 * z);
        g.addColorStop(0, 'rgba(214,242,232,0.20)'); g.addColorStop(1, 'rgba(214,242,232,0)');
        ctx.fillStyle = g; ctx.fillRect(Math.round(sx - lw / 2 - 26 * z), Math.round(ly), Math.round(lw + 52 * z), Math.round(300 * z));
      }
    }
  },

  // --- WEST BULKHEAD: the door the building ends at ----------------------
  bulkhead(ctx, cam, r, floorS, roofS) {
    const z = cam.zoom, C = this.C, px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    const [sx] = cam.toScreen(r.x0 + 40, 0);
    const dw = 76 * z, dh = 140 * z, dy = floorS - dh;
    px(sx - dw / 2 - 5 * z, dy - 6 * z, dw + 10 * z, dh + 6 * z, C.steelD);
    px(sx - dw / 2, dy, dw, dh, '#3d4a52');
    px(sx - dw / 2, dy, 3 * z, dh, '#55646e');
    for (let i = 0; i < 4; i++) px(sx - dw / 2 + 4 * z, dy + 10 * z + i * 30 * z, dw - 8 * z, 3 * z, '#313d45');
    // the wheel, and the bar across it
    px(sx - 3 * z, dy + dh * 0.45, 6 * z, 6 * z, '#8d9aa2');
    for (let a = 0; a < 6; a++) { const an = a * TAU / 6 + World.t * 0.05; px(sx + Math.cos(an) * 15 * z - z, dy + dh * 0.45 + Math.sin(an) * 15 * z - z, 3 * z, 3 * z, '#7b8790'); }
    px(sx - dw / 2 - 8 * z, dy + dh * 0.66, dw + 16 * z, 6 * z, C.warn);
    px(sx - 22 * z, dy - 22 * z, 44 * z, 16 * z, '#c8d0cc');
    for (let k = 0; k < 6; k++) px(sx - 18 * z + k * 6 * z, dy - 17 * z, 3 * z, 5 * z, '#1e262b');
  },

  // --- TRANSFER CORRIDOR: doors, fittings, signage ----------------------
  corridor(ctx, cam, r, floorS, roofS, leftW, rightW, tileTop) {
    const z = cam.zoom, C = this.C, px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    const L = Math.max(leftW, r.x0), R = Math.min(rightW, r.x1);
    for (let wx = Math.floor(L / 240) * 240; wx < R; wx += 240) {
      if (wx < r.x0 + 40 || wx > r.x1 - 40) continue;
      const [sx] = cam.toScreen(wx, 0), dw = 46 * z, dh = 96 * z, dy = floorS - dh;
      px(sx - dw / 2 - 3 * z, dy - 3 * z, dw + 6 * z, dh + 3 * z, '#2f3a40');
      px(sx - dw / 2, dy, dw, dh, '#2f6a58');
      px(sx - dw / 2, dy, 2 * z, dh, '#3f8a72');
      px(sx - 9 * z, dy + 14 * z, 18 * z, 22 * z, '#0e1a1e');
      px(sx - 7 * z, dy + 16 * z, 7 * z, 7 * z, 'rgba(150,220,205,0.30)');
      px(sx + dw / 2 - 12 * z, dy + 48 * z, 7 * z, 3 * z, '#c0c8c0');
      px(sx + dw / 2 + 6 * z, dy + 42 * z, 7 * z, 10 * z, '#1a2a2e');
      px(sx + dw / 2 + 8 * z, dy + 44 * z, 2 * z, 2 * z, Math.sin(World.t * 3 + wx) > 0 ? '#40f070' : '#207038');
      px(sx - 16 * z, dy - 14 * z, 32 * z, 9 * z, '#c8d0cc');
      for (let k = 0; k < 5; k++) px(sx - 13 * z + k * 6 * z, dy - 11 * z, 3 * z, 3 * z, '#1e262b');
    }
    // wall fittings between the doors
    for (let wx = Math.floor(L / 120) * 120; wx < R; wx += 120) {
      const [sx] = cam.toScreen(wx, 0), kind = ((Math.floor(wx / 120) % 3) + 3) % 3, by = floorS - 96 * z;
      if (kind === 0) {
        px(sx - 13 * z, by, 26 * z, 26 * z, '#a03024'); px(sx - 13 * z, by, 26 * z, 2 * z, '#c04434');
        px(sx - 9 * z, by + 5 * z, 18 * z, 17 * z, '#2a1a16');
        for (let rr = 6; rr >= 2; rr -= 2) { px(sx - rr * z, by + 13 * z - rr * z, 2 * rr * z, z, '#d8d0c0'); px(sx - rr * z, by + 13 * z + rr * z, 2 * rr * z, z, '#d8d0c0'); }
      } else if (kind === 1) {
        px(sx - 15 * z, by + 2 * z, 30 * z, 22 * z, '#39444a'); px(sx - 15 * z, by + 2 * z, 30 * z, 2 * z, '#4b585e');
        px(sx - 12 * z, by + 6 * z, 24 * z, 14 * z, '#28323a');
        for (let i = 0; i < 5; i++) px(sx - 10 * z + i * 4.4 * z, by + 9 * z, 2 * z, 3 * z, ihash(i + Math.floor(wx / 120), 61) > 0.4 ? '#40c878' : C.warn);
      } else {
        px(sx - 9 * z, by + 10 * z, 18 * z, 14 * z, C.warn); px(sx - 9 * z, by + 10 * z, 18 * z, 2 * z, C.warnL);
        px(sx - 4 * z, by + 14 * z, 8 * z, 6 * z, '#1a1a1a');
      }
    }
  },

  // --- HABITAT HALL: the pens, and what is in them ----------------------
  pens(ctx, cam, r, floorS, roofS, leftW, rightW) {
    const z = cam.zoom, C = this.C, px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    const PEN = 160;
    const first = Math.floor((Math.max(leftW, r.x0) - r.x0) / PEN), last = Math.ceil((Math.min(rightW, r.x1) - r.x0) / PEN);
    for (let i = first; i <= last; i++) {
      const wx = r.x0 + i * PEN;
      if (wx >= r.x1) break;
      const [sx] = cam.toScreen(wx, 0), w = PEN * z;
      const seed = ihash(i + 17, 401);
      const state = i % 4 === 3 ? 'empty' : i % 4 === 1 ? 'cracked' : 'full';
      const pw = w - 18 * z;
      const plinth = 30 * z, top = floorS - 160 * z;
      // the recess the pen sits in
      px(sx + 9 * z, top - 6 * z, pw, floorS - top + 6 * z, '#151d21');
      // the water and the substrate inside it
      const inY = top + 10 * z, botY = floorS - plinth;
      px(sx + 12 * z, inY, pw - 6 * z, botY - inY, '#16302e');
      px(sx + 12 * z, botY - 34 * z, pw - 6 * z, 34 * z, state === 'empty' ? '#2c2a22' : '#1d4a44');
      px(sx + 12 * z, botY - 34 * z, pw - 6 * z, 2 * z, state === 'empty' ? '#3a372c' : '#2f7068');
      px(sx + 12 * z, botY - 9 * z, pw - 6 * z, 9 * z, '#4a4335');                       // the sand bank
      px(sx + 12 * z, botY - 9 * z, pw - 6 * z, 2 * z, '#5d5442');
      // heat lamp and its pool
      const lx = sx + w * 0.34, ly = top + 12 * z;
      px(lx - 7 * z, ly, 14 * z, 5 * z, '#2a2f31');
      px(lx - 5 * z, ly + 5 * z, 10 * z, 3 * z, state === 'empty' ? '#3a2a20' : '#ff9a44');
      if (state !== 'empty') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(lx, ly + 6 * z, 1, lx, ly + 6 * z, 70 * z);
        g.addColorStop(0, 'rgba(255,150,70,0.22)'); g.addColorStop(1, 'rgba(255,150,70,0)');
        ctx.fillStyle = g; ctx.fillRect(lx - 70 * z, ly, 140 * z, 140 * z); ctx.restore();
      }
      // the animal
      if (state !== 'empty') this.penCroc(ctx, sx + w * 0.5, botY - 10 * z, (PEN * 0.42) * z, seed, state);
      // the glass, its frame, and the muck on it
      ctx.fillStyle = C.glass; ctx.fillRect(Math.round(sx + 9 * z), Math.round(top), Math.round(pw), Math.round(botY - top));
      ctx.fillStyle = 'rgba(220,255,250,0.10)';
      ctx.fillRect(Math.round(sx + 9 * z), Math.round(top), Math.round(pw * 0.22), Math.round(botY - top));
      px(sx + 9 * z, top, pw, 2 * z, C.glassL);
      if (state === 'cracked') {
        ctx.strokeStyle = 'rgba(230,255,250,0.75)'; ctx.lineWidth = Math.max(1, Math.round(z));
        const cx = sx + w * 0.6, cy = top + (botY - top) * 0.45;
        for (let k = 0; k < 7; k++) { const a = k * TAU / 7 + seed; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (10 + ihash(k, 9) * 26) * z, cy + Math.sin(a) * (10 + ihash(k, 8) * 26) * z); ctx.stroke(); }
      }
      // the plinth, the mullion, the number plate and the feed hatch
      px(sx + 9 * z, botY, pw, plinth, C.conc);
      px(sx + 9 * z, botY, pw, 3 * z, '#949a9e');
      px(sx + 9 * z, floorS - 6 * z, pw, 6 * z, C.concD);
      px(sx, top - 8 * z, 9 * z, floorS - top + 8 * z, C.steel);
      px(sx + w - 9 * z, top - 8 * z, 9 * z, floorS - top + 8 * z, C.steel);
      px(sx, top - 8 * z, 3 * z, floorS - top + 8 * z, C.steelL);
      px(sx + 9 * z, top - 10 * z, pw, 10 * z, C.steelD);
      px(sx + 9 * z, top - 10 * z, pw, 2 * z, C.steel);
      // number plate
      px(sx + 16 * z, top - 8 * z, 26 * z, 7 * z, '#cdd6d2');
      for (let k = 0; k < 3; k++) px(sx + 19 * z + k * 7 * z, top - 6 * z, 4 * z, 4 * z, '#1e262b');
      // feed hatch and the keeper's hose
      px(sx + w - 40 * z, botY - 26 * z, 20 * z, 18 * z, C.steelD);
      px(sx + w - 38 * z, botY - 24 * z, 16 * z, 14 * z, '#1b2226');
      px(sx + w - 30 * z, botY - 18 * z, 5 * z, 2 * z, '#9aa4a0');
      if (state === 'empty') {
        // the door of this one is open, and there is a chain on the floor
        px(sx + 9 * z, top, 14 * z, botY - top, '#0b1114');
        px(sx + 20 * z, floorS - 10 * z, 22 * z, 3 * z, '#5a6166');
      }
    }
    // the keeper's gantry along the top of the run, and a hose reel
    const gy = floorS - 176 * z;
    px(0, gy, G.W, 4 * z, C.steel);
    px(0, gy, G.W, z, C.steelL);
    for (let wx = Math.floor(Math.max(leftW, r.x0) / 80) * 80; wx < Math.min(rightW, r.x1); wx += 80) {
      const [sx] = cam.toScreen(wx, 0);
      px(sx, gy - 22 * z, 2 * z, 22 * z, C.steelD);
      px(sx, gy - 22 * z, 2 * z, 2 * z, C.steelL);
    }
  },

  // A crocodile in a pen: not the player's rig, just a clean side-on animal
  // that breathes, blinks and moves its tail. Small ones in most of the pens,
  // one that is not small at all.
  penCroc(ctx, cx, by, len, seed, state) {
    const big = seed > 0.72, L = len * (big ? 1.4 : 0.95), h = L * 0.18;
    const t = World.t + seed * 9;
    const breathe = Math.sin(t * 0.8) * h * 0.12;
    const sway = Math.sin(t * 0.55) * L * 0.06;
    const skin = big ? '#5c6b44' : '#6b7b50', skinD = big ? '#3c4830' : '#47543a', skinL = big ? '#7d8c60' : '#8a9a6a';
    const px = (x, y, w, hh, c) => this.px(ctx, x, y, w, hh, c);
    const y0 = by - h - breathe;
    // tail, body, head, all as tapering blocks
    px(cx - L * 0.5 - sway, y0 + h * 0.25, L * 0.28, h * 0.5, skinD);
    px(cx - L * 0.28, y0 + h * 0.1, L * 0.34, h * 0.85, skin);
    px(cx - L * 0.28, y0 + h * 0.1, L * 0.34, h * 0.22, skinL);
    px(cx + L * 0.06, y0 + h * 0.2, L * 0.2, h * 0.62, skin);
    px(cx + L * 0.24, y0 + h * 0.3, L * 0.26, h * 0.42, skinD);   // the snout
    px(cx + L * 0.24, y0 + h * 0.3, L * 0.26, h * 0.12, skinL);
    // scutes along the back
    for (let i = 0; i < 7; i++) px(cx - L * 0.3 + i * L * 0.075, y0 + h * 0.02, L * 0.04, h * 0.14, skinD);
    // legs
    px(cx - L * 0.16, by - h * 0.3, L * 0.05, h * 0.34, skinD);
    px(cx + L * 0.06, by - h * 0.3, L * 0.05, h * 0.34, skinD);
    // eye, and the blink
    const blink = ((t * 0.4) % 6) < 0.16;
    px(cx + L * 0.17, y0 + h * 0.12, L * 0.05, h * 0.2, blink ? skinD : '#e8d86a');
    if (!blink) px(cx + L * 0.185, y0 + h * 0.16, L * 0.02, h * 0.12, '#1a1a12');
    // the tag on the tail, because everything in here is numbered
    px(cx - L * 0.42 - sway, y0 + h * 0.3, L * 0.05, h * 0.2, '#d8d0b0');
  },

  // --- PLANT ROOM: what keeps the pens alive ---------------------------
  plant(ctx, cam, r, floorS, roofS) {
    const z = cam.zoom, C = this.C, px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    const [x0] = cam.toScreen(r.x0, 0), w = (r.x1 - r.x0) * z;
    // filter vessels
    for (let i = 0; i < 3; i++) {
      const vx = x0 + (24 + i * 48) * z, vh = 96 * z;
      px(vx - 15 * z, floorS - vh, 30 * z, vh, '#5c6a70');
      px(vx - 15 * z, floorS - vh, 8 * z, vh, '#748188');
      px(vx - 17 * z, floorS - vh - 7 * z, 34 * z, 8 * z, '#48555c');
      px(vx - 17 * z, floorS - 8 * z, 34 * z, 8 * z, '#3a454b');
      for (let k = 0; k < 3; k++) px(vx - 15 * z, floorS - vh + (16 + k * 26) * z, 30 * z, 2 * z, '#44515a');
      // gauge
      px(vx + 5 * z, floorS - vh + 14 * z, 9 * z, 9 * z, '#d6ded8');
      px(vx + 9 * z, floorS - vh + 18 * z, z, Math.max(1, 3 * z), '#c03828');
    }
    // the manifold across the room with valve wheels on it
    const my = floorS - 118 * z;
    px(x0, my, w, 9 * z, '#5a6670');
    px(x0, my, w, 2 * z, '#76838c');
    for (let i = 0; i < 4; i++) {
      const vx = x0 + (30 + i * 38) * z;
      px(vx - 2 * z, my - 14 * z, 4 * z, 14 * z, '#48555c');
      for (let a = 0; a < 6; a++) { const an = a * TAU / 6 + i; px(vx + Math.cos(an) * 7 * z - z, my - 16 * z + Math.sin(an) * 7 * z - z, 3 * z, 3 * z, '#8c99a0'); }
    }
    // a pump on a plinth, running
    const pxp = x0 + w - 40 * z;
    px(pxp - 20 * z, floorS - 14 * z, 40 * z, 14 * z, C.concD);
    px(pxp - 16 * z, floorS - 34 * z, 32 * z, 20 * z, '#2f6a58');
    px(pxp - 16 * z, floorS - 34 * z, 32 * z, 3 * z, '#3f8a72');
    const spin = Math.floor(World.t * 12) % 4;
    px(pxp - 4 * z + spin * 2 * z, floorS - 27 * z, 5 * z, 5 * z, '#8ad0b8');
    // puddle and a drip off the manifold
    px(x0 + 20 * z, floorS - 3 * z, 54 * z, 3 * z, 'rgba(120,180,170,0.35)');
    if (chance(0.05)) G.fx.add({ type: 'drop', x: r.x0 + 40, y: -1400 + 118, vx: 0, vy: 40, s: 1, color: '#9ad8c0', life: 1.4 });
  },

  // --- ACCESS CHAMBER: the building meets the system ---------------------
  access(ctx, cam, r, floorS, roofS) {
    const z = cam.zoom, C = this.C, px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    const [x0] = cam.toScreen(r.x0, 0), w = (r.x1 - r.x0) * z;
    // a bare block wall, no tile: nobody finishes a room like this
    px(x0, floorS - 200 * z, w, 200 * z, '#3b4448');
    const blk = Tex.get('fbblk', 48, (x, S) => {
      x.fillStyle = '#3b4448'; x.fillRect(0, 0, S, S);
      x.fillStyle = '#2c3438'; for (let y = 0; y < S; y += 12) { x.fillRect(0, y, S, 1); const o = ((y / 12) | 0) % 2 ? 12 : 0; for (let xx = o; xx < S; xx += 24) x.fillRect(xx, y, 1, 12); }
      x.fillStyle = 'rgba(255,255,255,0.06)'; for (let y = 1; y < S; y += 12) x.fillRect(0, y, S, 1);
    });
    ctx.save(); ctx.beginPath(); ctx.rect(x0, floorS - 200 * z, w, 200 * z); ctx.clip();
    Tex.fill(ctx, blk, cam.x, cam.y, z, 1); ctx.restore();
    // the sump pump and its rising main
    px(x0 + 18 * z, floorS - 30 * z, 26 * z, 30 * z, '#4a5258');
    px(x0 + 18 * z, floorS - 30 * z, 26 * z, 3 * z, '#636c72');
    px(x0 + 28 * z, floorS - 96 * z, 6 * z, 66 * z, '#5a6670');
    px(x0 + 28 * z, floorS - 96 * z, 2 * z, 66 * z, '#76838c');
    px(x0 + 22 * z, floorS - 100 * z, 18 * z, 5 * z, '#48555c');
    // the ladder somebody bolted up the wall and never finished
    for (let i = 0; i < 6; i++) px(x0 + w - 40 * z, floorS - 40 * z - i * 16 * z, 20 * z, 3 * z, '#6a6252');
    px(x0 + w - 42 * z, floorS - 140 * z, 3 * z, 104 * z, '#5a5346');
    px(x0 + w - 23 * z, floorS - 140 * z, 3 * z, 104 * z, '#5a5346');
    // the sign nobody reads
    px(x0 + w * 0.45, floorS - 118 * z, 46 * z, 20 * z, C.warn);
    px(x0 + w * 0.45 + 3 * z, floorS - 115 * z, 40 * z, 14 * z, '#1a1a1a');
    for (let k = 0; k < 5; k++) px(x0 + w * 0.45 + 6 * z + k * 7 * z, floorS - 110 * z, 4 * z, 4 * z, C.warnL);
  },

  // --- LOADING DOCK: the other way out of this building ------------------
  dock(ctx, cam, r, floorS, roofS) {
    const z = cam.zoom, C = this.C, px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    const [x0] = cam.toScreen(r.x0, 0), w = (r.x1 - r.x0) * z;
    // the shutter box and the opening under it
    const oy = floorS - 168 * z;
    px(x0 + 16 * z, oy - 18 * z, w - 16 * z, 18 * z, '#39444a');
    px(x0 + 16 * z, oy - 18 * z, w - 16 * z, 3 * z, '#55636b');
    for (let i = 0; i < 4; i++) px(x0 + 16 * z, oy - 14 * z + i * 4 * z, w - 16 * z, 2 * z, '#2c353a');
    // the night outside, and the truck backed into it
    px(x0 + 16 * z, oy, w - 16 * z, floorS - oy, '#0a1014');
    const tx = x0 + 30 * z, tw = w - 44 * z;
    // the chassis and the wheels it is standing on, under the box
    px(tx + 4 * z, floorS - 26 * z, tw - 8 * z, 8 * z, '#23282a');
    for (const ox of [0.22, 0.44, 0.74]) {
      const wx2 = tx + tw * ox;
      px(wx2 - 9 * z, floorS - 20 * z, 18 * z, 20 * z, '#15191b');
      px(wx2 - 6 * z, floorS - 16 * z, 12 * z, 12 * z, '#2c3134');
      px(wx2 - 2 * z, floorS - 12 * z, 4 * z, 4 * z, '#4a5154');
    }
    // the box body, its roll doors open on the dark inside
    px(tx, floorS - 130 * z, tw, 104 * z, '#8f4437');
    px(tx, floorS - 130 * z, tw, 5 * z, '#b85d4c');
    px(tx, floorS - 30 * z, tw, 4 * z, '#5e2c23');
    for (let i = 0; i < 7; i++) px(tx + (5 + i * 15) * z, floorS - 124 * z, 2 * z, 92 * z, '#7a382d');
    px(tx + tw * 0.34, floorS - 124 * z, tw * 0.34, 92 * z, '#1a0f0c');            // the open doors
    px(tx + tw * 0.34, floorS - 124 * z, 3 * z, 92 * z, '#c06a58');
    px(tx + tw * 0.68 - 3 * z, floorS - 124 * z, 3 * z, 92 * z, '#c06a58');
    // a rack of empty transport crates inside it
    for (let i = 0; i < 2; i++) px(tx + tw * 0.38 + i * 16 * z, floorS - 74 * z, 13 * z, 44 * z, '#333a3e');
    // markings, plate, tail light, mud flap
    px(tx + 6 * z, floorS - 112 * z, 30 * z, 10 * z, '#d8cfc0');
    for (let k = 0; k < 4; k++) px(tx + 9 * z + k * 7 * z, floorS - 109 * z, 4 * z, 4 * z, '#7a382d');
    px(tx + tw - 22 * z, floorS - 44 * z, 16 * z, 7 * z, '#d8d4c4');
    px(tx - 6 * z, floorS - 44 * z, 6 * z, 18 * z, '#5a2a22');
    px(tx - 5 * z, floorS - 41 * z, 4 * z, 11 * z, Math.sin(World.t * 4) > 0 ? '#ff6a50' : '#8a2a1e');
    px(tx + 2 * z, floorS - 8 * z, 10 * z, 8 * z, '#1a1d1f');
    // the dock leveller bridging the gap, and the plate on the sill
    px(x0 + 14 * z, floorS - 26 * z, tx - x0 - 10 * z, 6 * z, '#4e565c');
    px(x0 + 14 * z, floorS - 26 * z, tx - x0 - 10 * z, 2 * z, '#6d777d');
    px(x0 + 16 * z, floorS - 18 * z, 26 * z, 18 * z, '#5a6166');
    // the transport crate on the ramp, waiting
    const cx2 = x0 + w * 0.42;
    px(cx2 - 26 * z, floorS - 52 * z, 52 * z, 44 * z, '#4a5258');
    px(cx2 - 26 * z, floorS - 52 * z, 52 * z, 3 * z, '#69737a');
    for (let i = 0; i < 5; i++) px(cx2 - 22 * z + i * 10 * z, floorS - 46 * z, 3 * z, 34 * z, '#20282c');
    px(cx2 - 26 * z, floorS - 30 * z, 52 * z, 3 * z, C.warn);
    // the dock lights over the opening, and what they land on
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const lxx = x0 + (40 + i * 70) * z;
      const g = ctx.createLinearGradient(0, oy, 0, floorS);
      g.addColorStop(0, 'rgba(255,228,170,0.26)'); g.addColorStop(1, 'rgba(255,228,170,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(lxx - 7 * z, oy); ctx.lineTo(lxx + 7 * z, oy);
      ctx.lineTo(lxx + 34 * z, floorS); ctx.lineTo(lxx - 34 * z, floorS); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    for (let i = 0; i < 2; i++) { const lxx = x0 + (40 + i * 70) * z; px(lxx - 8 * z, oy - 4 * z, 16 * z, 4 * z, '#2a2f31'); px(lxx - 6 * z, oy, 12 * z, 2 * z, '#ffe4aa'); }
    // hazard tape across the dock edge and a painted line on the floor
    for (let i = 0; i < 12; i++) px(x0 + i * 12 * z, floorS - 4 * z, 12 * z, 4 * z, i % 2 ? C.warn : '#1a1a1a');
    // pallets stacked against the jamb
    px(x0 + 2 * z, floorS - 34 * z, 14 * z, 34 * z, '#6b5033');
    for (let i = 0; i < 4; i++) px(x0 + 2 * z, floorS - 30 * z + i * 8 * z, 14 * z, 2 * z, '#4a3524');
  },
};
