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

  // ---- SURFACES ---------------------------------------------------------
  // A flat fill is a flat fill at any zoom, and this building was four fifths
  // flat fill. Everything in it bigger than a hand now gets a real texture:
  // brushed steel, chequer plate, board-marked concrete, rolled paint, rust.
  // All of it keyed to the world, so it stays put when the camera moves.
  TEX: {
    steel: (x, S) => {
      for (let y = 0; y < S; y++) { const v = ihash(y, 7); x.fillStyle = v < 0.34 ? 'rgba(255,255,255,0.055)' : v < 0.7 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.02)'; x.fillRect(0, y, S, 1); }
      for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(255,255,255,0.07)'; x.fillRect((ihash(i, 8) * S) | 0, (ihash(i, 9) * S) | 0, 3 + (ihash(i, 10) * 8) | 0, 1); }
    },
    plate: (x, S) => {
      // chequer plate: two teardrops a quarter out of phase, on a 12px pitch
      for (let gy = 0; gy < S; gy += 12) for (let gx = 0; gx < S; gx += 12) {
        const o = ((gy / 12) | 0) % 2 ? 6 : 0;
        x.fillStyle = 'rgba(255,255,255,0.13)'; x.fillRect(gx + o + 1, gy + 3, 7, 2);
        x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(gx + o + 1, gy + 5, 7, 2);
        x.fillStyle = 'rgba(255,255,255,0.09)'; x.fillRect(gx + o + 4, gy + 8, 2, 4);
        x.fillStyle = 'rgba(0,0,0,0.16)'; x.fillRect(gx + o + 4, gy + 10, 2, 2);
      }
    },
    conc: (x, S) => {
      for (let i = 0; i < 420; i++) { const v = ihash(i, 21); x.fillStyle = v < 0.4 ? 'rgba(255,255,255,0.05)' : v < 0.78 ? 'rgba(0,0,0,0.07)' : 'rgba(190,180,150,0.08)'; x.fillRect((ihash(i, 22) * S) | 0, (ihash(i, 23) * S) | 0, 1 + (v > 0.94 ? 2 : 0), 1); }
      for (let y = 0; y < S; y += 16) { x.fillStyle = 'rgba(0,0,0,0.11)'; x.fillRect(0, y, S, 1); x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(0, y + 1, S, 1); }
    },
    paint: (x, S) => {
      for (let i = 0; i < 300; i++) { const v = ihash(i, 31); x.fillStyle = v < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'; x.fillRect((ihash(i, 32) * S) | 0, (ihash(i, 33) * S) | 0, 2, 1); }
      for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect((ihash(i, 34) * S) | 0, (ihash(i, 35) * S) | 0, 2 + (ihash(i, 36) * 3) | 0, 2); }
    },
    rust: (x, S) => {
      for (let i = 0; i < 160; i++) { const v = ihash(i, 41); x.fillStyle = v < 0.4 ? 'rgba(150,84,40,0.22)' : v < 0.75 ? 'rgba(96,52,26,0.24)' : 'rgba(200,140,80,0.14)'; x.fillRect((ihash(i, 42) * S) | 0, (ihash(i, 43) * S) | 0, 2 + (v * 4) | 0, 1 + (v > 0.8 ? 2 : 0)); }
    },
  },
  surf(ctx, cam, x, y, w, h, base, kind, alpha) {
    this.px(ctx, x, y, w, h, base);
    if (w < 2 || h < 2) return;
    const tex = Tex.get('fbs|' + kind, 48, this.TEX[kind] || this.TEX.steel);
    ctx.save();
    ctx.beginPath(); ctx.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); ctx.clip();
    Tex.fill(ctx, tex, cam.x, cam.y, cam.zoom, alpha === undefined ? 1 : alpha);
    ctx.restore();
  },

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
    const tileTop = floorS - 104 * z, tileBot = floorS + 6 * z;
    const tile = Tex.get('fbtile', 32, (x, S) => {
      x.fillStyle = C.tile; x.fillRect(0, 0, S, S);
      x.fillStyle = C.tileD; x.fillRect(0, 0, S, 1); x.fillRect(0, 0, 1, S); x.fillRect(16, 0, 1, S); x.fillRect(0, 16, S, 1);
      x.fillStyle = C.tileL; x.fillRect(1, 1, 14, 1); x.fillRect(17, 17, 14, 1); x.fillRect(1, 1, 1, 14); x.fillRect(17, 17, 1, 14);
      x.fillStyle = '#a7b4af'; x.fillRect(10, 8, 3, 1); x.fillRect(24, 22, 4, 1);
    });
    ctx.save(); ctx.beginPath(); ctx.rect(0, tileTop, W, tileBot - tileTop); ctx.clip();
    Tex.fill(ctx, tile, cam.x, cam.y, z, 0.94);
    // fifty years of trolleys: the dirt in the grout, the scuff band at knee
    // height where everything has been wheeled past, and the tiles that have
    // been knocked out and never replaced
    const g0 = ctx.createLinearGradient(0, tileTop, 0, tileBot);
    g0.addColorStop(0, 'rgba(36,46,44,0.22)'); g0.addColorStop(0.35, 'rgba(36,46,44,0.02)');
    g0.addColorStop(1, 'rgba(28,24,16,0.34)');
    ctx.fillStyle = g0; ctx.fillRect(0, tileTop, W, tileBot - tileTop);
    for (let wx = Math.floor(leftW / 16) * 16; wx < rightW; wx += 16) {
      const k = Math.floor(wx / 16), [tx] = cam.toScreen(wx, 0), r = ihash(k, 61);
      if (r < 0.10) {                                   // a tile off the wall
        const ty = tileTop + (8 + ihash(k, 62) * 120) * z;
        if (ty > tileBot - 18 * z) continue;
        px(tx, ty, 15 * z, 15 * z, '#6d736e');
        px(tx, ty, 15 * z, 2 * z, '#4c524e');
        px(tx + 2 * z, ty + 3 * z, 11 * z, 10 * z, '#7e837c');
        for (let i = 0; i < 6; i++) px(tx + 2 * z + ihash(k * 7 + i, 63) * 11 * z, ty + 3 * z + ihash(k * 7 + i, 64) * 10 * z, 1.6 * z, 1.6 * z, '#9aa09a');
      } else if (r < 0.22) {                            // a crack across one
        const ty = tileTop + (10 + ihash(k, 65) * 120) * z;
        ctx.strokeStyle = 'rgba(70,80,76,0.6)'; ctx.lineWidth = Math.max(1, Math.round(z));
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 9 * z, ty + 7 * z); ctx.lineTo(tx + 6 * z, ty + 15 * z); ctx.stroke();
      }
      if (r > 0.5) px(tx, tileBot - (18 + ihash(k, 66) * 14) * z, (6 + ihash(k, 67) * 12) * z, (3 + ihash(k, 68) * 5) * z, 'rgba(52,44,30,0.20)');
    }
    // the scuff band the trolleys have left along the whole run
    px(0, tileBot - 38 * z, W, 9 * z, 'rgba(44,40,30,0.18)');
    px(0, tileBot - 34 * z, W, 2 * z, 'rgba(30,26,18,0.26)');
    ctx.restore();
    px(0, tileTop - 4 * z, W, 4 * z, C.rail);
    px(0, tileTop - 4 * z, W, z, '#c2ccce');
    px(0, tileTop + 6 * z, W, 3 * z, C.stripe);
    px(0, tileTop + 9 * z, W, z, C.stripeD);
    px(0, floorS - 8 * z, W, 8 * z, 'rgba(28,24,18,0.30)');           // grime at the skirting
    this.upperWall(ctx, cam, tileTop, roofS, leftW, rightW);

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

    // a chequer-plate walkway laid the length of the building, because a
    // floor a trolley runs on is not a painted slab
    this.surf(ctx, cam, 0, floorS - 14 * z, W, 14 * z, '#3f4a4e', 'plate', 0.95);
    px(0, floorS - 14 * z, W, 1.6 * z, '#5f6c70');
    px(0, floorS - 1.6 * z, W, 1.6 * z, '#2a3236');
    for (let wx = Math.floor(leftW / 64) * 64; wx < rightW; wx += 64) {
      const [sx] = cam.toScreen(wx, 0);
      px(sx, floorS - 14 * z, 1.4 * z, 14 * z, '#2b3337');            // the joint between plates
      px(sx + 2 * z, floorS - 11 * z, 3 * z, 3 * z, '#6d797d');       // and the screw that holds it
      px(sx + 2 * z, floorS - 5 * z, 3 * z, 3 * z, '#6d797d');
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

  // --- THE UPPER WALL ---------------------------------------------------
  // Above the dado a building is never blank. It is conduit, trunking, signs
  // nobody reads, a camera, a hose reel, and a louvre where the air comes in.
  // The band between the soffit and the handrail is a third of every shot in
  // this level, so it gets the same treatment as the floor.
  upperWall(ctx, cam, tileTop, roofS, leftW, rightW) {
    const W = G.W, z = cam.zoom, C = this.C;
    const px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    const top = roofS + 12 * z, bot = tileTop - 4 * z;
    if (bot - top < 6) return;
    const fy = bot - 74 * z;                     // where everything hangs from
    // the wall itself: painted blockwork, coursed, with the roller marks in it
    ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, bot - top); ctx.clip();
    const blk = Tex.get('fbblock', 48, (x, S) => {
      x.fillStyle = '#39474d'; x.fillRect(0, 0, S, S);
      x.fillStyle = '#313e44';
      for (let y = 0; y < S; y += 12) { x.fillRect(0, y, S, 1); const o = ((y / 12) | 0) % 2 ? 12 : 0; for (let xx = o; xx < S; xx += 24) x.fillRect(xx, y, 1, 12); }
      x.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 1; y < S; y += 12) x.fillRect(0, y, S, 1);
      for (let i = 0; i < 26; i++) { x.fillStyle = ihash(i, 71) > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)'; x.fillRect((ihash(i, 72) * S) | 0, (ihash(i, 73) * S) | 0, 3, 2); }
    });
    Tex.fill(ctx, blk, cam.x, cam.y, z, 1);
    // two trunking runs the length of the building, clipped to the wall
    for (const [off, col, hi] of [[50, '#4e5a60', '#6c7a80'], [61, '#3f4d54', '#59686f']]) {
      const y = fy + off * z;
      if (y > bot) continue;
      px(0, y, W, 7 * z, col); px(0, y, W, 1.6 * z, hi); px(0, y + 6 * z, W, 1.4 * z, '#2a3338');
      for (let wx = Math.floor(leftW / 42) * 42; wx < rightW; wx += 42) { const [cx] = cam.toScreen(wx, 0); px(cx, y - 1.4 * z, 4 * z, 9 * z, '#6e7c82'); }
    }
    // a single conduit dropping to each socket, and the sockets themselves
    for (let wx = Math.floor(leftW / 120) * 120; wx < rightW; wx += 120) {
      const [cx] = cam.toScreen(wx, 0), k = Math.floor(wx / 120);
      const dy = fy + 68 * z, len = Math.max(2, (bot - dy) * (0.4 + ihash(k, 81) * 0.4));
      px(cx + 30 * z, dy, 2.4 * z, len, '#59686f');
      px(cx + 27 * z, dy + len, 9 * z, 8 * z, '#2e3a40');
      px(cx + 28 * z, dy + len + 1.5 * z, 7 * z, 3 * z, ihash(k, 82) > 0.5 ? '#2a8a70' : '#8a7a20');
    }
    ctx.restore();
    // --- the fittings, one per 120 units, on a fixed world grid -----------
    for (let wx = Math.floor(leftW / 120) * 120; wx < rightW; wx += 120) {
      const [cx] = cam.toScreen(wx, 0), k = Math.floor(wx / 120), pick = Math.abs(k) % 6;
      const y = fy;
      if (y + 60 * z < 0 || y > G.H) continue;
      if (pick === 0) {
        // an observation window into a room you are not going into
        px(cx, y, 76 * z, 46 * z, '#20292e');
        px(cx + 3 * z, y + 3 * z, 70 * z, 40 * z, 'rgba(96,150,146,0.30)');
        px(cx + 3 * z, y + 3 * z, 70 * z, 2 * z, 'rgba(200,240,236,0.35)');
        for (let i = 0; i < 3; i++) px(cx + (10 + i * 22) * z, y + 20 * z, 14 * z, 20 * z, 'rgba(16,26,30,0.5)');
        px(cx + 30 * z, y + 8 * z, 18 * z, 4 * z, 'rgba(230,255,250,0.30)');   // a lamp inside
        px(cx, y + 44 * z, 76 * z, 3 * z, '#4b5a60');
      } else if (pick === 1) {
        // a louvred supply grille with the duct coming out of the soffit
        px(cx + 10 * z, Math.max(top, y - 62 * z), 12 * z, 62 * z, '#495860');
        px(cx, y, 62 * z, 34 * z, '#54636a');
        px(cx, y, 62 * z, 2 * z, '#75848b');
        for (let i = 0; i < 6; i++) { px(cx + 3 * z, y + (4 + i * 5) * z, 56 * z, 3 * z, '#38454c'); px(cx + 3 * z, y + (4 + i * 5) * z, 56 * z, z, '#66757c'); }
        px(cx, y + 33 * z, 62 * z, 2 * z, '#2c363b');
      } else if (pick === 2) {
        // a sign nobody has read since the day it went up
        px(cx + 8 * z, y + 6 * z, 54 * z, 26 * z, '#d6d2c2');
        px(cx + 8 * z, y + 6 * z, 54 * z, 2 * z, '#efebd8');
        px(cx + 12 * z, y + 11 * z, 16 * z, 16 * z, ihash(k, 91) > 0.5 ? '#b8341e' : '#1f6ea8');
        px(cx + 18 * z, y + 14 * z, 4 * z, 8 * z, '#f0ece0');
        px(cx + 18 * z, y + 23 * z, 4 * z, 2 * z, '#f0ece0');
        for (let i = 0; i < 4; i++) px(cx + 32 * z, y + (12 + i * 4) * z, (14 - i * 2) * z, 1.6 * z, '#585448');
      } else if (pick === 3) {
        // the camera that watched the trolley go past
        px(cx + 26 * z, y, 4 * z, 12 * z, '#3d474c');
        px(cx + 18 * z, y + 11 * z, 22 * z, 10 * z, '#59666c');
        px(cx + 16 * z, y + 13 * z, 4 * z, 6 * z, '#10181c');
        px(cx + 16 * z, y + 14 * z, 2 * z, 3 * z, '#9fe0d4');
        px(cx + 36 * z, y + 12 * z, 3 * z, 3 * z, Math.sin(World.t * 2.4 + k) > 0 ? '#ff5a40' : '#5a2018');
      } else if (pick === 4) {
        // a hose reel, and the extinguisher bracketed beside it
        px(cx + 6 * z, y + 4 * z, 40 * z, 40 * z, '#8d2a1c');
        px(cx + 10 * z, y + 8 * z, 32 * z, 32 * z, '#a8372a');
        px(cx + 20 * z, y + 18 * z, 12 * z, 12 * z, '#5c1c12');
        for (let i = 0; i < 4; i++) px(cx + (13 + i * 4) * z, y + 11 * z, 2 * z, 26 * z, '#c04a38');
        px(cx + 52 * z, y + 14 * z, 12 * z, 30 * z, '#b8341e');
        px(cx + 52 * z, y + 10 * z, 6 * z, 5 * z, '#3a3a36');
        px(cx + 54 * z, y + 20 * z, 8 * z, 8 * z, '#e8e2d0');
      } else {
        // a panel of breakers, half of them thrown
        px(cx + 8 * z, y + 2 * z, 56 * z, 44 * z, '#4a565c');
        px(cx + 8 * z, y + 2 * z, 56 * z, 2 * z, '#6b787e');
        px(cx + 11 * z, y + 6 * z, 50 * z, 36 * z, '#2b353a');
        for (let i = 0; i < 4; i++) for (let j2 = 0; j2 < 5; j2++) {
          const on = ihash(k * 29 + i * 7 + j2, 95) > 0.35;
          px(cx + (14 + j2 * 9) * z, y + (10 + i * 8) * z, 6 * z, 5 * z, on ? '#3e8a62' : '#8a4030');
        }
        px(cx + 60 * z, y + 8 * z, 3 * z, 8 * z, '#9aa4a8');
      }
    }
  },

  // --- THE SERVICE VOID -------------------------------------------------
  // What is under the slab: the mains this building runs on. Drawn from
  // drawBuiltGround inside the clip below the floor, so it is the thing the
  // camera looks into for the whole lower third of the shot.
  services(ctx, cam, pts, step) {
    const z = cam.zoom, H = G.H, px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    const leftW = cam.toWorldX(-80), rightW = cam.toWorldX(G.W + 80);
    const top = (i) => pts[i][1] + 38 * z;
    // hangers: the threaded rod every run is slung from
    for (let wx = Math.floor(leftW / 46) * 46; wx < rightW; wx += 46) {
      const [hx] = cam.toScreen(wx, 0), hy = cam.toScreen(0, World.floorY(wx))[1] + 38 * z;
      px(hx, hy, 1.6 * z, 108 * z, '#39434a');
      px(hx - 5 * z, hy + 104 * z, 12 * z, 3 * z, '#4a555c');
    }
    // the runs themselves, biggest and dirtiest at the bottom
    const runs = [
      { d: 16, h: 11, col: '#4d585e', hi: '#6e7c83', lo: '#333c42', lag: 0 },
      { d: 34, h: 8, col: '#3f5048', hi: '#5b7065', lo: '#28342f', lag: 0 },
      { d: 54, h: 15, col: '#8d8a76', hi: '#b0ac94', lo: '#5d5a4c', lag: 1 },
      { d: 78, h: 20, col: '#3a4348', hi: '#55616a', lo: '#232a2e', lag: 0 },
    ];
    for (const R of runs) {
      for (let i = 0; i < pts.length; i++) {
        const [sx] = pts[i], y = top(i) + R.d * z;
        px(sx, y, step + 1, R.h * z, R.col);
        px(sx, y, step + 1, 2 * z, R.hi);
        px(sx, y + (R.h - 2) * z, step + 1, 2 * z, R.lo);
      }
      // flanges and valves at intervals, and the lagging bands on the hot run
      for (let wx = Math.floor(leftW / 96) * 96; wx < rightW; wx += 96) {
        const [fx] = cam.toScreen(wx, 0), fy = cam.toScreen(0, World.floorY(wx))[1] + (38 + R.d) * z;
        px(fx - 3 * z, fy - 2 * z, 7 * z, (R.h + 4) * z, R.hi);
        px(fx - 3 * z, fy - 2 * z, 7 * z, 1.6 * z, '#c2cbcf');
        const k = Math.floor(wx / 96);
        if (R.lag) { for (let i = 0; i < 3; i++) px(fx + (14 + i * 20) * z, fy, 4 * z, R.h * z, '#6d6a5a'); }
        if (ihash(k, R.d + 3) > 0.62) {
          // a valve, with a wheel on it and a tag hanging off the wheel
          px(fx + 40 * z, fy - 4 * z, 12 * z, (R.h + 8) * z, R.col);
          px(fx + 44 * z, fy - 18 * z, 3 * z, 14 * z, '#6a757b');
          px(fx + 38 * z, fy - 22 * z, 16 * z, 4 * z, '#8a5a2a');
          px(fx + 44 * z, fy - 21 * z, 3 * z, 2 * z, '#c08a4a');
          px(fx + 52 * z, fy - 16 * z, 5 * z, 7 * z, '#d8d2be');
        }
      }
    }
    // a cable tray with the bundles lying in it
    for (let i = 0; i < pts.length; i++) {
      const [sx] = pts[i], y = top(i) + 96 * z;
      px(sx, y, step + 1, 3 * z, '#4a545a');
      px(sx, y - 7 * z, step + 1, 2 * z, '#3c2a1c');
      px(sx, y - 5 * z, step + 1, 2 * z, '#2a3a4a');
      px(sx, y - 3 * z, step + 1, 2 * z, '#3a3a24');
    }
    for (let wx = Math.floor(leftW / 30) * 30; wx < rightW; wx += 30) {
      const [tx] = cam.toScreen(wx, 0), ty = cam.toScreen(0, World.floorY(wx))[1] + 96 * z;
      px(tx, ty - 8 * z, 2 * z, 12 * z, '#5a656b');
    }
    // a sump every so often, with a pump sitting in it and the float switch up
    for (let wx = Math.floor(leftW / 380) * 380; wx < rightW; wx += 380) {
      const [mx] = cam.toScreen(wx, 0), my = cam.toScreen(0, World.floorY(wx))[1] + 124 * z;
      if (my > H + 40) continue;
      px(mx - 34 * z, my, 68 * z, 30 * z, '#161c1f');
      px(mx - 34 * z, my, 68 * z, 2 * z, '#39444a');
      const wl = my + 14 * z + Math.sin(World.t * 0.9 + wx) * 1.2 * z;
      px(mx - 32 * z, wl, 64 * z, 16 * z, 'rgba(48,92,88,0.75)');
      px(mx - 32 * z, wl, 64 * z, 1.6 * z, 'rgba(150,210,204,0.45)');
      px(mx - 10 * z, my + 4 * z, 18 * z, 20 * z, '#39444a');
      px(mx - 10 * z, my + 4 * z, 18 * z, 2 * z, '#5b686f');
      px(mx - 2 * z, my - 14 * z, 3 * z, 18 * z, '#4c585e');
      px(mx + 12 * z, my - 4 * z, 8 * z, 5 * z, '#c8a020');
      if (chance(0.04)) G.fx.add({ type: 'drop', x: wx + rand(-20, 20), y: World.floorY(wx) + 100, vx: 0, vy: 70, s: 1, color: '#7f9a92', life: 1.4 });
    }
  },

  // --- the ceiling and everything hung off it ---------------------------
  ceiling(ctx, cam, roofS, leftW, rightW) {
    const W = G.W, z = cam.zoom, C = this.C;
    const px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    this.surf(ctx, cam, 0, 0, W, Math.max(0, roofS + 10 * z), C.ceil, 'conc', 0.8);
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
    this.surf(ctx, cam, sx - dw / 2 - 5 * z, dy - 6 * z, dw + 10 * z, dh + 6 * z, C.steelD, 'steel');
    this.surf(ctx, cam, sx - dw / 2, dy, dw, dh, '#3d4a52', 'steel');
    this.surf(ctx, cam, sx - dw / 2, dy + dh * 0.7, dw, dh * 0.3, '#3d4a52', 'rust', 0.75);
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
      // gravel over the bed, graded coarse at the back
      for (let k = 0; k < 30; k++) {
        const gx = sx + 14 * z + ihash(k + i * 31, 111) * (pw - 12 * z);
        const gy = botY - (1 + ihash(k, 112) * 9) * z, gs = (1.4 + ihash(k, 113) * 3) * z;
        px(gx, gy, gs, gs * 0.7, ihash(k, 114) > 0.55 ? '#6a6250' : '#3c372c');
      }
      // the haul-out: a poured ramp up out of the water at one end
      const rampW = 44 * z, rx = i % 2 ? sx + 14 * z : sx + pw - rampW - 2 * z;
      ctx.fillStyle = '#585244';
      ctx.beginPath(); ctx.moveTo(rx, botY - 8 * z); ctx.lineTo(rx + rampW, botY - 8 * z);
      ctx.lineTo(rx + (i % 2 ? rampW : 0), botY - 30 * z); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6d6653';
      ctx.beginPath(); ctx.moveTo(rx, botY - 8 * z); ctx.lineTo(rx + rampW, botY - 8 * z);
      ctx.lineTo(rx + (i % 2 ? rampW : 0), botY - 30 * z); ctx.closePath();
      ctx.save(); ctx.clip(); ctx.fillRect(Math.round(rx), Math.round(botY - 30 * z), Math.round(rampW), Math.round(2 * z)); ctx.restore();
      // planting at the back, and an air line under it
      for (let k = 0; k < 7; k++) {
        const gx = sx + 18 * z + ihash(k + i * 5, 121) * (pw - 20 * z);
        const gh = (10 + ihash(k, 122) * 22) * z;
        for (let q = 0; q < 4; q++) {
          const sway = Math.sin(World.t * 0.8 + k + q * 0.5) * 2 * z;
          px(gx + sway * (q / 4), botY - 8 * z - gh * (q + 1) / 4, 1.6 * z, gh / 4 + z, q > 1 ? '#2f6a4a' : '#24523c');
        }
      }
      if (state !== 'empty') {
        px(sx + 14 * z, botY - 7 * z, pw - 10 * z, 1.4 * z, '#2a3a3e');                  // the air line
        ctx.globalAlpha = 0.5;
        for (let k = 0; k < 12; k++) {
          const bx = sx + 18 * z + ((k * 37) % Math.max(1, Math.round(pw - 20))) * z;
          const u = ((World.t * 0.5 + ihash(k + i, 131)) % 1);
          px(bx, botY - 8 * z - u * (botY - inY - 12 * z), 1.6 * z, 1.6 * z, '#cfeae8');
        }
        ctx.globalAlpha = 1;
      }
      // --- the back of the pen: nobody built a glass box with nothing in it
      {
        const bw2 = pw - 6 * z, bx2 = sx + 12 * z, bh2 = botY - 34 * z - inY;
        // painted blockwork up to a datum line, bare above it
        const wall = Tex.get('fbpen', 32, (x, S) => {
          x.fillStyle = '#1d3a36'; x.fillRect(0, 0, S, S);
          x.fillStyle = '#193330';
          for (let y = 0; y < S; y += 8) { x.fillRect(0, y, S, 1); const o = ((y / 8) | 0) % 2 ? 8 : 0; for (let xx = o; xx < S; xx += 16) x.fillRect(xx, y, 1, 8); }
          x.fillStyle = 'rgba(255,255,255,0.035)'; for (let y = 1; y < S; y += 8) x.fillRect(0, y, S, 1);
        });
        ctx.save(); ctx.beginPath(); ctx.rect(bx2, inY, bw2, bh2); ctx.clip();
        Tex.fill(ctx, wall, cam.x, cam.y, z, 1);
        // the pen number, stencilled a foot high on the back wall
        const num = ((Math.abs(i) % 9) + 1);
        for (let d = 0; d < 2; d++) {
          const dx = bx2 + bw2 * 0.5 - 16 * z + d * 18 * z, dy = inY + bh2 * 0.3;
          const digit = d === 0 ? Math.floor((Math.abs(i) % 30) / 10) : num;
          const segs = [[0, 0, 14, 3], [0, 0, 3, 20], [11, 0, 3, 20], [0, 18, 14, 3], [0, 9, 14, 3], [0, 9, 3, 12], [11, 9, 3, 12]];
          const on = [[1, 1, 1, 1, 0, 1, 1], [0, 0, 1, 0, 0, 0, 1], [1, 0, 1, 1, 1, 1, 0], [1, 0, 1, 1, 1, 0, 1],
            [0, 1, 1, 0, 1, 0, 1], [1, 1, 0, 1, 1, 0, 1], [1, 1, 0, 1, 1, 1, 1], [1, 0, 1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 0, 1]][digit % 10];
          for (let q = 0; q < 7; q++) if (on[q]) px(dx + segs[q][0] * z, dy + segs[q][1] * z, segs[q][2] * z, segs[q][3] * z, 'rgba(168,200,192,0.42)');
        }
        // a datum line and the stains that hang off everything above it
        px(bx2, inY + bh2 * 0.52, bw2, 2 * z, 'rgba(120,160,152,0.22)');
        for (let k = 0; k < 9; k++) {
          const gx = bx2 + ihash(k + i * 13, 151) * bw2;
          px(gx, inY + bh2 * 0.2, (2 + ihash(k, 152) * 4) * z, bh2 * (0.3 + ihash(k, 153) * 0.6), 'rgba(20,44,38,0.35)');
        }
        // the mist line across the top, with a nozzle every so often
        px(bx2, inY + 10 * z, bw2, 2 * z, '#2e4a48');
        for (let k = 0; k < 4; k++) {
          const nx = bx2 + (0.16 + k * 0.24) * bw2;
          px(nx, inY + 12 * z, 3 * z, 4 * z, '#3d5e5a');
          if (state !== 'empty') { ctx.globalAlpha = 0.10 + 0.05 * Math.sin(World.t * 1.3 + k); px(nx - 8 * z, inY + 16 * z, 19 * z, bh2 * 0.5, '#cfeae8'); ctx.globalAlpha = 1; }
        }
        // a mesh screen panel and the hose bib beside it
        const mx2 = bx2 + bw2 * (i % 2 ? 0.62 : 0.12), mw2 = bw2 * 0.26, mh2 = bh2 * 0.34, my2 = inY + bh2 * 0.34;
        px(mx2, my2, mw2, mh2, '#17302d');
        for (let q = 0; q * 5 * z < mw2; q++) px(mx2 + q * 5 * z, my2, 1.4 * z, mh2, 'rgba(126,158,152,0.28)');
        for (let q = 0; q * 5 * z < mh2; q++) px(mx2, my2 + q * 5 * z, mw2, 1.4 * z, 'rgba(126,158,152,0.20)');
        px(mx2 - 2 * z, my2 - 2 * z, mw2 + 4 * z, 2 * z, '#3e5e5a');
        px(bx2 + bw2 * 0.86, inY + bh2 * 0.66, 4 * z, 14 * z, '#4a6460');
        px(bx2 + bw2 * 0.84, inY + bh2 * 0.66, 8 * z, 3 * z, '#5e7a74');
        // a branch leaning on the wall, which is the only thing in here that grew
        ctx.strokeStyle = '#3a2f20'; ctx.lineWidth = Math.max(1, Math.round(2.4 * z));
        ctx.beginPath(); ctx.moveTo(bx2 + bw2 * 0.2, botY - 34 * z);
        ctx.lineTo(bx2 + bw2 * 0.34, inY + bh2 * 0.45); ctx.lineTo(bx2 + bw2 * 0.3, inY + bh2 * 0.22); ctx.stroke();
        ctx.lineWidth = Math.max(1, Math.round(1.4 * z)); ctx.strokeStyle = '#4a3c28';
        ctx.beginPath(); ctx.moveTo(bx2 + bw2 * 0.32, inY + bh2 * 0.36); ctx.lineTo(bx2 + bw2 * 0.44, inY + bh2 * 0.3); ctx.stroke();
        // the dark the lamp does not reach
        const gg = ctx.createLinearGradient(0, inY, 0, inY + bh2);
        gg.addColorStop(0, 'rgba(4,12,14,0.55)'); gg.addColorStop(0.5, 'rgba(4,12,14,0.12)'); gg.addColorStop(1, 'rgba(4,12,14,0.30)');
        ctx.fillStyle = gg; ctx.fillRect(bx2, inY, bw2, bh2);
        ctx.restore();
      }
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
      // the back of the pen: a tiled board with a stencil on it, and the
      // waterline the keepers hold it at
      px(sx + 12 * z, inY, pw - 6 * z, 3 * z, '#0f2422');
      for (let k = 0; k < 5; k++) px(sx + 16 * z + k * (pw - 14 * z) / 5, inY + 5 * z, 2 * z, (botY - inY) * 0.8, 'rgba(255,255,255,0.03)');
      px(sx + 12 * z, botY - 36 * z, pw - 6 * z, 2 * z, state === 'empty' ? '#4a4436' : '#63b0a4');
      // a haul-out rock and a drain in the corner
      px(sx + 22 * z, botY - 18 * z, 22 * z, 9 * z, '#4e4a40');
      px(sx + 22 * z, botY - 18 * z, 22 * z, 2 * z, '#66604f');
      px(sx + pw - 16 * z, botY - 5 * z, 10 * z, 4 * z, '#22282a');
      // the animal
      if (state !== 'empty') this.penCroc(ctx, sx + w * 0.5, botY - 12 * z, (PEN * 0.46) * z, seed, state, i);
      // algae creeping up the inside of the glass
      ctx.globalAlpha = 0.35;
      for (let k = 0; k < 14; k++) {
        const gx = sx + 12 * z + ihash(k + i * 7, 91) * (pw - 10 * z);
        px(gx, botY - (4 + ihash(k, 92) * 16) * z, 2 * z, (4 + ihash(k, 92) * 16) * z, '#3f6a4a');
      }
      ctx.globalAlpha = 1;
      // caustics: the lamp on the surface, printed on everything under it
      if (state !== 'empty') {
        ctx.globalAlpha = 0.10;
        for (let k = 0; k < 6; k++) {
          const u = ((World.t * 0.12 + k / 6) % 1);
          px(sx + 12 * z + u * (pw - 20 * z), botY - 34 * z, (6 + ihash(k, 141) * 14) * z, 34 * z, '#bff0e6');
        }
        ctx.globalAlpha = 1;
      }
      // the glass, its frame, and the muck on it
      ctx.fillStyle = C.glass; ctx.fillRect(Math.round(sx + 9 * z), Math.round(top), Math.round(pw), Math.round(botY - top));
      ctx.fillStyle = 'rgba(220,255,250,0.10)';
      ctx.fillRect(Math.round(sx + 9 * z), Math.round(top), Math.round(pw * 0.22), Math.round(botY - top));
      px(sx + 9 * z, top, pw, 2 * z, C.glassL);
      if (state === 'cracked') {
        // an impact and everything that ran out of it: radials first, then the
        // rings between them, then the white bruise where it was hit
        const cx = sx + w * 0.6, cy = top + (botY - top) * 0.45, R = 30 * z;
        ctx.lineWidth = Math.max(1, Math.round(z));
        const ends = [];
        for (let k = 0; k < 9; k++) {
          const a = k * TAU / 9 + seed * 6, len = (10 + ihash(k, 9) * 22) * z;
          ends.push([a, len]);
          ctx.strokeStyle = 'rgba(236,255,252,0.55)';
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
          ctx.strokeStyle = 'rgba(20,40,44,0.35)';
          ctx.beginPath(); ctx.moveTo(cx + z, cy + z); ctx.lineTo(cx + Math.cos(a) * len + z, cy + Math.sin(a) * len + z); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(220,250,246,0.4)';
        for (const ring of [0.34, 0.62, 0.86]) {
          ctx.beginPath();
          for (let k = 0; k <= ends.length; k++) {
            const [a, len] = ends[k % ends.length], rr = len * ring;
            const qx = cx + Math.cos(a) * rr, qy = cy + Math.sin(a) * rr;
            if (k === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
          }
          ctx.stroke();
        }
        px(cx - 3 * z, cy - 3 * z, 6 * z, 6 * z, 'rgba(240,255,252,0.8)');
        ctx.globalAlpha = 0.25; px(cx - R, cy - R, R * 2, R * 2, '#dff6f2'); ctx.globalAlpha = 1;
      }
      // the paperwork: a record card in a holder and a temperature strip
      px(sx + pw - 30 * z, top + 16 * z, 22 * z, 28 * z, '#e2ded0');
      px(sx + pw - 30 * z, top + 16 * z, 22 * z, 3 * z, '#f2eee0');
      for (let k = 0; k < 5; k++) px(sx + pw - 27 * z, top + (23 + k * 4) * z, (14 - k * 2) * z, 1.4 * z, '#6a665a');
      px(sx + pw - 30 * z, top + 40 * z, 22 * z, 4 * z, '#b8341e');
      px(sx + 16 * z, top + 18 * z, 5 * z, 34 * z, '#20282c');
      for (let k = 0; k < 6; k++) px(sx + 16 * z, top + (20 + k * 5) * z, 5 * z, 2 * z, k > 3 ? '#d04a2a' : '#3e9a6a');
      // the plinth, the mullion, the number plate and the feed hatch
      this.surf(ctx, cam, sx + 9 * z, botY, pw, plinth, C.conc, 'conc');
      px(sx + 9 * z, botY, pw, 3 * z, '#949a9e');
      // the plinth is cast concrete with things let into it, not a grey block
      px(sx + 9 * z, botY + 3 * z, pw, 2 * z, '#5f666a');
      px(sx + 16 * z, botY + 9 * z, 30 * z, 16 * z, '#5e666b');           // inspection hatch
      px(sx + 16 * z, botY + 9 * z, 30 * z, 2 * z, '#7f878c');
      px(sx + 28 * z, botY + 15 * z, 6 * z, 4 * z, '#333a3e');
      for (let k = 0; k < 5; k++) px(sx + pw - 46 * z + k * 8 * z, botY + 12 * z, 5 * z, 10 * z, '#3b4348');   // drainage slots
      px(sx + pw - 52 * z, botY + 10 * z, 46 * z, 2 * z, '#7c848a');
      px(sx + w * 0.5 - 12 * z, botY + 20 * z, 24 * z, 5 * z, C.warn);    // the bay stripe
      for (let k = 0; k < 3; k++) px(sx + w * 0.5 - 9 * z + k * 8 * z, botY + 21 * z, 4 * z, 3 * z, '#1a1a1a');
      px(sx + 9 * z, floorS - 6 * z, pw, 6 * z, C.concD);
      this.surf(ctx, cam, sx, top - 8 * z, 9 * z, floorS - top + 8 * z, C.steel, 'steel');
      this.surf(ctx, cam, sx + w - 9 * z, top - 8 * z, 9 * z, floorS - top + 8 * z, C.steel, 'steel');
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
    // a services bulkhead over the run: feed pipe, valves and a light every pen
    const by2 = floorS - 196 * z;
    px(0, by2, G.W, 7 * z, C.steelD);
    px(0, by2, G.W, 2 * z, C.steel);
    for (let wx = Math.floor(Math.max(leftW, r.x0) / PEN) * PEN; wx < Math.min(rightW, r.x1); wx += PEN) {
      const [sx] = cam.toScreen(wx + PEN * 0.5, 0);
      px(sx - 2 * z, by2 + 7 * z, 4 * z, 9 * z, '#48555c');
      for (let a = 0; a < 5; a++) { const an = a * TAU / 5; px(sx + Math.cos(an) * 6 * z - z, by2 + 4 * z + Math.sin(an) * 6 * z - z, 3 * z, 3 * z, '#8c99a0'); }
      px(sx + 30 * z, by2 + 7 * z, 14 * z, 4 * z, '#2a3236');
      px(sx + 32 * z, by2 + 10 * z, 10 * z, 2 * z, '#e8f4ee');
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

  // A crocodile in a pen is a crocodile. Not a row of blocks standing in for
  // one: the same chain, the same parts and the same renderer the player is
  // drawn with, solved on a slow idle so the animals breathe, drift and open
  // their mouths at nothing. One pen has something in it that is not a
  // hatchling any more.
  penCroc(ctx, cx, by, len, seed, state, i) {
    if (typeof CrocView === 'undefined' || !G.player) return;
    this._pen = this._pen || {};
    let v = this._pen[i];
    if (!v) {
      v = this._pen[i] = CrocView.make();
      v.t = seed * 11;
      for (let k = 0; k < 30; k++) v.chain.solve(0, 0, 0, 1, 1 / 60, 0.15, false);
    }
    const dt = Math.min(0.05, G.dt || 1 / 60);
    v.t += dt;
    const big = seed > 0.72;
    // an idle: a long slow drift, a tail that follows it, and a jaw that
    // opens every so often for no reason anybody has written down
    const drift = Math.sin(v.t * 0.42) * 5 + Math.sin(v.t * 0.17 + 2) * 3;
    const gape = Math.max(0, Math.sin(v.t * 0.31 + seed * 5) - 0.86) * 6;
    v.x = drift; v.y = Math.sin(v.t * 0.6 + seed) * 1.2;
    v.a = Math.sin(v.t * 0.23 + seed * 3) * 0.07;
    v.jaw = clamp(gape, 0, 0.55);
    v.chain.solve(v.x, v.y, v.a, 1, dt, 0.2 + Math.abs(Math.sin(v.t * 0.42)) * 0.3, false);
    v.legPhase += dt * 0.5;
    const scale = (len / 64) * (big ? 1.5 : 1);
    ctx.save();
    ctx.globalAlpha = 0.96;
    CrocView.draw(ctx, v, G.player.parts, cx, by - len * 0.03, scale);
    ctx.restore();
    // the numbered tag on its tail, because everything in here is numbered
    this.px(ctx, cx - len * 0.46, by - len * 0.16, Math.max(1, len * 0.05), Math.max(1, len * 0.06), '#d8d0b0');
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
    // --- everything a crew leaves standing round an open chamber ----------
    const [mxS] = cam.toScreen(FACILITY.MANHOLE, 0);
    // the tripod they winch a man out on, legs straddling the cover
    const legH = 92 * z, spread = 40 * z;
    ctx.strokeStyle = '#8a7f5e'; ctx.lineWidth = Math.max(1, Math.round(3 * z));
    for (const dxn of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(mxS + dxn * spread, floorS); ctx.lineTo(mxS + dxn * 3 * z, floorS - legH); ctx.stroke();
    }
    ctx.strokeStyle = '#6f6650'; ctx.lineWidth = Math.max(1, Math.round(2 * z));
    ctx.beginPath(); ctx.moveTo(mxS - spread * 0.6, floorS - legH * 0.45); ctx.lineTo(mxS + spread * 0.6, floorS - legH * 0.45); ctx.stroke();
    px(mxS - 7 * z, floorS - legH - 5 * z, 15 * z, 6 * z, '#5c5544');
    px(mxS - 2 * z, floorS - legH + 1 * z, 2 * z, 46 * z, '#3f4a4e');      // the wire, hanging
    px(mxS - 5 * z, floorS - legH + 46 * z, 8 * z, 7 * z, '#8a6a2a');      // and the hook on the end of it
    // the winch drum clamped to one leg
    px(mxS - spread * 0.72, floorS - 44 * z, 14 * z, 13 * z, '#8a4030');
    px(mxS - spread * 0.72, floorS - 44 * z, 14 * z, 2 * z, '#b85a44');
    px(mxS - spread * 0.72 + 14 * z, floorS - 40 * z, 5 * z, 5 * z, '#cdd6d2');
    // the confined-space board, a gas monitor hung off it, and the log sheet
    px(mxS + 56 * z, floorS - 96 * z, 4 * z, 96 * z, '#59626a');
    px(mxS + 40 * z, floorS - 132 * z, 38 * z, 36 * z, '#d8d4c2');
    px(mxS + 40 * z, floorS - 132 * z, 38 * z, 4 * z, '#b8341e');
    px(mxS + 45 * z, floorS - 124 * z, 12 * z, 12 * z, '#1f6ea8');
    for (let k = 0; k < 4; k++) px(mxS + 60 * z, floorS - (122 - k * 5) * z, (14 - k * 3) * z, 1.6 * z, '#5a564a');
    px(mxS + 46 * z, floorS - 90 * z, 10 * z, 14 * z, '#2c3438');
    px(mxS + 47 * z, floorS - 88 * z, 8 * z, 5 * z, Math.sin(World.t * 3) > 0 ? '#6ee0a8' : '#2a6a4e');
    // a coil of hose and a stack of spare covers against the wall
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = k % 2 ? '#c8a020' : '#9a7a18'; ctx.lineWidth = Math.max(1, Math.round(2.4 * z));
      ctx.beginPath(); ctx.arc(x0 + 70 * z, floorS - 12 * z, (6 + k * 4) * z, Math.PI, TAU); ctx.stroke();
    }
    for (let k = 0; k < 3; k++) { px(x0 + w - 90 * z + k * 2 * z, floorS - 6 * z - k * 5 * z, 34 * z, 5 * z, '#4a463d'); px(x0 + w - 90 * z + k * 2 * z, floorS - 6 * z - k * 5 * z, 34 * z, z, '#635e53'); }
    // cones and the tape between them, which is the only thing keeping you out
    for (const cxn of [mxS - 74 * z, mxS + 96 * z]) {
      ctx.fillStyle = '#d8642a';
      ctx.beginPath(); ctx.moveTo(cxn - 8 * z, floorS); ctx.lineTo(cxn, floorS - 22 * z); ctx.lineTo(cxn + 8 * z, floorS); ctx.closePath(); ctx.fill();
      px(cxn - 5 * z, floorS - 12 * z, 10 * z, 3 * z, '#e8e2d0');
      px(cxn - 10 * z, floorS - 2 * z, 20 * z, 3 * z, '#b04a18');
    }
    for (let k = 0; k * 12 * z < 170 * z; k++) px(mxS - 74 * z + k * 12 * z, floorS - 22 * z + Math.sin(k * 0.7) * 2 * z, 7 * z, 3 * z, k % 2 ? C.warn : '#1a1a1a');
  },

  // The headwall, seen from the river. A hundred and forty feet of concrete
  // in the side of a gorge with one hole in it, and everything the building
  // has ever flushed coming out of the hole. It is the first thing the animal
  // sees of the outside and the last thing it will ever see of the inside.
  drawHeadwall(ctx, cam) {
    const z = cam.zoom, W = G.W, H = G.H;
    const px = (x, y, w, h, c) => this.px(ctx, x, y, w, h, c);
    const MX = -2996;
    const [sxr] = cam.toScreen(MX, 0);
    const sx = Math.min(sxr, W + 60);
    if (sx <= -2) return;
    const sy = (wy2) => cam.toScreen(0, wy2)[1];
    const my = sy(-36);                                  // invert of the mouth
    const wl = sy(World.surface(MX + 70));               // the pool surface
    const cop = sy(-196);                                // top of the coping
    const bed = sy(World.floorY(MX + 52));               // where the pool floor is

    // ---- what stands above the coping: the end of the building ----------
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, sx + 1, Math.max(1, cop + 2)); ctx.clip();
    // a stair tower and two plant boxes, stepping down toward the river
    const blocks = [[-3300, 150, '#4d5450'], [-3180, 96, '#565d58'], [-3080, 62, '#4a514d']];
    for (const [bx, bh, col] of blocks) {
      const [bs] = cam.toScreen(bx, 0), [be] = cam.toScreen(bx + 110, 0);
      px(bs, cop - bh * z, be - bs, bh * z + 4 * z, col);
      px(bs, cop - bh * z, be - bs, 3 * z, shade(col, 1.25));
      for (let i = 0; i < 4; i++) px(bs + (8 + i * 24) * z, cop - (bh - 14) * z, 14 * z, 20 * z, i % 2 ? '#2b3436' : '#39434a');
      for (let i = 1; i < 5; i++) px(bs, cop - (bh - i * 26) * z, be - bs, 2 * z, shade(col, 0.82));
    }
    // two vent stacks and the floodlight mast that still burns at night
    for (const [vx, vh] of [[-3268, 60], [-3222, 44]]) {
      const [vs] = cam.toScreen(vx, 0);
      px(vs, cop - (150 + vh) * z, 13 * z, vh * z, '#6a6f68');
      px(vs - 3 * z, cop - (150 + vh) * z, 19 * z, 5 * z, '#82877e');
      px(vs + 2 * z, cop - (150 + vh - 5) * z, 3 * z, (vh - 6) * z, '#50554f');
    }
    const [ms] = cam.toScreen(-3128, 0);
    px(ms, cop - 150 * z, 3 * z, 88 * z, '#4a4f4a');
    px(ms - 6 * z, cop - 150 * z, 15 * z, 6 * z, '#3a3f3a');
    px(ms - 4 * z, cop - 145 * z, 11 * z, 4 * z, 'rgba(255,232,170,0.45)');
    // the parapet with its coping cap
    px(0, cop - 16 * z, sx, 16 * z, '#676d64');
    px(0, cop - 16 * z, sx, 3 * z, '#8b9186');
    for (let i = 0; i < 24; i++) { const [gx] = cam.toScreen(-3400 + i * 26, 0); if (gx > sx) break; px(gx, cop - 15 * z, 2 * z, 14 * z, 'rgba(40,46,44,0.35)'); }
    ctx.restore();

    // ---- the wall itself -------------------------------------------------
    ctx.save();
    ctx.beginPath(); ctx.rect(0, cop - 1, sx + 1, H - cop + 2); ctx.clip();
    px(0, cop, sx, H - cop, '#70716a');
    px(0, cop, sx, 5 * z, '#959688');                                     // the cap, catching the sky
    px(0, cop + 5 * z, sx, 2 * z, '#565850');
    // poured in lifts: each lift is its own pour and its own shade of grey
    const lifts = [];
    for (let ly = -196; ly < 520; ly += 26) lifts.push(ly);
    for (let i = 0; i < lifts.length; i++) {
      const y0 = sy(lifts[i]), y1 = sy(lifts[i] + 26);
      if (y1 < cop || y0 > H) continue;
      const v = ihash(i, 61);
      px(0, y0, sx, y1 - y0, v < 0.34 ? '#75766e' : v < 0.68 ? '#6c6d66' : '#787970');
      px(0, y0, sx, 1.6 * z, 'rgba(160,162,150,0.5)');
      px(0, y0 + 1.6 * z, sx, 1.4 * z, 'rgba(48,52,48,0.45)');
    }
    // form panels: vertical seams and the tie holes that held the forms shut
    for (let k = 0; k < 30; k++) {
      const wx2 = MX - k * 27, [px2] = cam.toScreen(wx2, 0);
      if (px2 < -8) break;
      px(px2, cop, 1.4 * z, H - cop, 'rgba(52,56,52,0.30)');
      for (let i = 0; i < lifts.length; i++) {
        const y0 = sy(lifts[i] + 13);
        if (y0 < cop || y0 > H) continue;
        const h = ihash(k * 31 + i, 87);
        px(px2 - 13 * z, y0, 2.4 * z, 2.4 * z, h < 0.4 ? '#4a4236' : '#3e423e');
        if (h < 0.4) px(px2 - 13 * z, y0 + 2 * z, 2 * z, (5 + h * 34) * z, 'rgba(122,84,44,0.28)');   // rust out of the hole
      }
    }
    // counterforts: the wall is not a slab, it is ribs with panels between them
    for (let k = 0; k < 12; k++) {
      const wx2 = MX - 58 - k * 168, [bx] = cam.toScreen(wx2, 0);
      if (bx < -34) break;
      const bw = 34 * z;
      px(bx, cop + 4 * z, bw, H - cop, '#7b7c73');
      px(bx, cop + 4 * z, 4 * z, H - cop, '#95968a');                     // lit edge
      px(bx + bw - 4 * z, cop + 4 * z, 4 * z, H - cop, '#4f5049');        // shadowed edge
      px(bx + bw, cop + 4 * z, 7 * z, H - cop, 'rgba(24,28,26,0.28)');    // the shadow it throws
      px(bx, cop + 2 * z, bw, 4 * z, '#a3a498');                          // its own cap
    }
    // spalls where the frost has had the face off, and the aggregate under it
    for (let k = 0; k < 34; k++) {
      const wx2 = MX - 8 - ihash(k, 11) * 720, wy2 = -190 + ihash(k, 12) * 560;
      const [ax] = cam.toScreen(wx2, 0), ay = sy(wy2);
      if (ax < -20 || ax > sx || ay < cop || ay > H) continue;
      const w2 = (5 + ihash(k, 13) * 16) * z, h2 = (4 + ihash(k, 14) * 12) * z;
      px(ax, ay, w2, h2, '#5d5e57');
      px(ax, ay, w2, 1.4 * z, '#4a4b45');
      px(ax + 1 * z, ay + 1.4 * z, w2 - 2 * z, h2 - 2 * z, '#7d7b6d');
      for (let i = 0; i < 5; i++) px(ax + ihash(k * 7 + i, 15) * w2, ay + 2 * z + ihash(k * 7 + i, 16) * (h2 - 3 * z), 1.4 * z, 1.4 * z, '#9a9684');
    }
    // long stains: everything this wall has ever had run down it
    for (let k = 0; k < 16; k++) {
      const wx2 = MX - 4 - ihash(k, 21) * 700, [ax] = cam.toScreen(wx2, 0);
      if (ax < -16 || ax > sx) continue;
      const h = ihash(k, 22), top = cop + 6 * z, len = (60 + h * 300) * z;
      ctx.fillStyle = h > 0.62 ? 'rgba(52,68,52,0.26)' : h > 0.3 ? 'rgba(36,44,46,0.22)' : 'rgba(112,74,38,0.20)';
      ctx.fillRect(Math.round(ax), Math.round(top), Math.max(1, Math.round((2 + h * 5) * z)), Math.round(Math.min(len, H - top)));
    }
    // weep holes, still weeping
    for (let k = 0; k < 5; k++) {
      const wx2 = MX - 70 - k * 150, wy2 = -120 + ihash(k, 31) * 90;
      const [ax] = cam.toScreen(wx2, 0), ay = sy(wy2);
      if (ax < -10 || ax > sx) continue;
      px(ax - 4 * z, ay - 4 * z, 9 * z, 8 * z, '#3a3d38');
      px(ax - 3 * z, ay - 3 * z, 7 * z, 6 * z, '#0d1112');
      if (wl > ay) {
        px(ax - 1 * z, ay + 2 * z, 2 * z, Math.min((wl - ay), 400), 'rgba(196,224,222,0.28)');
        px(ax - 2 * z, ay + 2 * z, 5 * z, Math.min((wl - ay), 400), 'rgba(70,96,76,0.22)');
        if (chance(0.25)) G.fx.add({ type: 'drop', x: wx2 + 4, y: wy2 + 6, vx: rand(-4, 8), vy: rand(20, 70), s: 1, color: '#cfe6e0', life: rand(0.4, 1.0) });
      }
    }
    // the green belt: what grows where the spray reaches and the sun does not
    const mossTop = wl - 46 * z;
    ctx.globalAlpha = 0.5;
    for (let k = 0; k < 140; k++) {
      const ax = ihash(k, 41) * sx, u = ihash(k, 42);
      px(ax, mossTop + u * u * 46 * z, (2 + ihash(k, 43) * 7) * z, (2 + ihash(k, 44) * 4) * z, u > 0.55 ? '#4a6b3c' : '#3d5a38');
    }
    ctx.globalAlpha = 1;
    // under the water the wall goes black and grows fur
    if (wl < H) {
      const gd = ctx.createLinearGradient(0, wl, 0, Math.min(H, wl + 200 * z));
      gd.addColorStop(0, 'rgba(20,52,54,0.45)'); gd.addColorStop(1, 'rgba(6,20,24,0.88)');
      ctx.fillStyle = gd; ctx.fillRect(0, Math.round(wl), Math.round(sx), Math.round(H - wl));
      ctx.globalAlpha = 0.4;
      for (let k = 0; k < 90; k++) {
        const ax = ihash(k, 51) * sx, ay = wl + ihash(k, 52) * Math.max(1, Math.min(H - wl, 150 * z));
        px(ax, ay, (3 + ihash(k, 53) * 9) * z, (2 + ihash(k, 54) * 3) * z, '#2c4a3c');
      }
      ctx.globalAlpha = 1;
    }
    // the talus: what has come off the wall in fifty years, heaped at its foot
    if (bed < H + 60) {
      for (let k = 0; k < 26; k++) {
        const wx2 = MX - 6 - ihash(k, 61) * 460, [ax] = cam.toScreen(wx2, 0);
        if (ax < -30 || ax > sx + 20) continue;
        const r = (7 + ihash(k, 62) * 20) * z, ay = bed - ihash(k, 63) * 70 * z;
        if (ay < wl) continue;
        Shape.oct(ctx, ax, ay, r, '#3c4038');
        Shape.oct(ctx, ax, ay - r * 0.22, r * 0.72, '#4c5047');
        px(ax - r * 0.5, ay - r * 0.7, r * 0.7, r * 0.24, '#5c6055');
      }
      px(0, bed, sx, Math.max(0, H - bed), '#2a2e2a');
    }
    ctx.restore();

    // ---- the mouth -------------------------------------------------------
    const mh = 58 * z, mw = 50 * z;
    px(sx - mw - 7 * z, my - mh - 7 * z, mw + 11 * z, mh + 14 * z, '#585951');   // the surround
    px(sx - mw - 7 * z, my - mh - 7 * z, mw + 11 * z, 3 * z, '#9d9e8f');
    px(sx - mw - 7 * z, my - mh - 7 * z, 3 * z, mh + 14 * z, '#8a8b7d');
    px(sx - mw, my - mh, mw + 4 * z, mh, '#080c0d');                             // the dark
    // the pipe inside it: a ring of lining and a wet invert catching the light
    px(sx - mw, my - mh, mw + 4 * z, 4 * z, '#31363a');
    px(sx - mw, my - 5 * z, mw + 4 * z, 5 * z, '#243033');
    px(sx - mw, my - 3 * z, mw + 4 * z, 2 * z, 'rgba(150,196,196,0.35)');
    for (let i = 0; i < 3; i++) px(sx - mw + (10 + i * 14) * z, my - mh + 4 * z, 1.6 * z, mh - 8 * z, 'rgba(120,150,150,0.10)');
    // the grille that used to be across it, hanging off one hinge
    px(sx - mw + 2 * z, my - mh - 2 * z, 5 * z, 5 * z, '#8a7a58');            // the hinge it swung on
    ctx.save(); ctx.translate(sx - mw + 4 * z, my - mh + 2 * z); ctx.rotate(0.62);
    for (let i = 0; i < 5; i++) px(0, i * 9 * z, 34 * z, 2.2 * z, '#4a4436');
    for (let i = 0; i < 4; i++) px(i * 10 * z, 0, 2.2 * z, 40 * z, '#585040');
    for (let i = 0; i < 4; i++) px(i * 10 * z, 0, 1 * z, 40 * z, '#6d6450');
    ctx.restore();
    px(sx - mw - 13 * z, my, mw + 20 * z, 7 * z, '#7d7e72');                      // the apron
    px(sx - mw - 13 * z, my, mw + 20 * z, 2 * z, '#9a9b8c');

    // ---- the plume -------------------------------------------------------
    if (wl > my) {
      const fall = wl - my, spread = 18 * z;
      const g = ctx.createLinearGradient(0, my, 0, wl);
      g.addColorStop(0, 'rgba(150,196,196,0.50)');    // glassy where it leaves the lip
      g.addColorStop(0.22, 'rgba(206,236,232,0.44)');
      g.addColorStop(0.7, 'rgba(226,246,242,0.34)');  // broken white lower down
      g.addColorStop(1, 'rgba(200,230,228,0.18)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx - mw + 3 * z, my - 4 * z); ctx.lineTo(sx + 3 * z, my - 4 * z);
      ctx.lineTo(sx + 3 * z + spread, wl); ctx.lineTo(sx - mw + 3 * z - spread, wl);
      ctx.closePath(); ctx.fill();
      px(sx - mw + 3 * z, my - 5 * z, mw + 3 * z, 4 * z, 'rgba(240,252,250,0.6)');   // the crest
      // strings of water in the sheet, falling
      for (let i = 0; i < 10; i++) {
        const u = ((World.t * 1.7 + i / 10) % 1), yy = my + u * fall;
        const w2 = (mw - 10 * z) * 0.9, ox = ihash(i, 71) * w2;
        px(sx - mw + 5 * z + ox - u * spread * 0.6, yy, (1.6 + ihash(i, 72) * 2.2) * z, (10 + u * 22) * z, 'rgba(255,255,255,0.34)');
      }
      // where it lands: a white boil and a ring of foam going out from it
      ctx.globalAlpha = 0.62;
      for (let i = 0; i < 30; i++) {
        const ph = World.t * 1.1 + i * 1.7, d = (i % 10) * 7 - 34;
        px(sx - mw * 0.5 + (d + Math.sin(ph) * 5) * z, wl - 3 * z + Math.sin(ph * 1.6) * 3 * z, (3 + ihash(i, 73) * 7) * z, 2.4 * z, i % 3 ? '#eaf7f3' : '#c9e2dd');
      }
      ctx.globalAlpha = 1;
      if (chance(0.7)) G.fx.add({ type: 'drop', x: MX + rand(-46, 6), y: rand(-34, -2), vx: rand(-46, 30), vy: rand(-70, 60), s: 1, color: '#e4f6f1', life: rand(0.5, 1.4) });
      if (chance(0.35)) G.fx.add({ type: 'bubble', x: MX + rand(-40, 20), y: World.surface(MX + 40) + rand(6, 40), vx: rand(-6, 6), vy: -16, s: 0.8, seed: rand(TAU), life: rand(0.6, 1.4) });
    }

    // ---- the ladder and the gauge board, both long out of use -------------
    px(sx - 98 * z, my - 152 * z, 3 * z, 156 * z, '#5f5747');
    px(sx - 80 * z, my - 152 * z, 3 * z, 156 * z, '#5f5747');
    for (let i = 0; i < 12; i++) px(sx - 98 * z, my - 148 * z + i * 13 * z, 21 * z, 2.4 * z, '#6f6653');
    px(sx - 100 * z, my - 156 * z, 24 * z, 5 * z, '#7a7160');
    px(sx - 168 * z, my - 132 * z, 10 * z, 132 * z, '#ccc8b6');
    px(sx - 168 * z, my - 132 * z, 10 * z, 3 * z, '#e6e2d0');
    for (let i = 0; i < 13; i++) px(sx - 168 * z, my - 128 * z + i * 10 * z, (i % 2 ? 5 : 10) * z, 2 * z, '#24241f');
    px(sx - 174 * z, my - 60 * z, 22 * z, 12 * z, '#b8341e');
    px(sx - 171 * z, my - 57 * z, 16 * z, 6 * z, '#e8d8c0');
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
