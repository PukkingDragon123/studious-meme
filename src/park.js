'use strict';
// ---------------------------------------------------------------------------
// EVERGLADES HOLIDAY PARK.
//
// A real place: twenty-nine acres on the levee at the end of Griffin Road,
// west of Fort Lauderdale, with the L-67A canal running dead straight behind
// it. It is the last thing before sixty miles of nothing, and everything about
// it is built for coaches turning up at ten and leaving at two.
//
// Laid out the way it is laid out, west to east:
//
//   THE SIGN      off the highway, on two poles, with a gator on it
//   PARKING       painted bays, a coach, pickups with trailers
//   MAIN BUILDING ticket windows, gift shop, cafe, and the grand concourse
//                 running straight through the middle of it to the water
//   THE GATOR PIT stadium seating round a sand ring, under a louvered roof
//                 that they can crank shut when the sun comes round
//   THE DOCKS     four airboat berths off a timber concourse, a photo stand,
//                 a fishing dock and two public ramps
//   THE CANAL     forty feet of dead-straight dredged water behind the lot
//
// It is drawn in world space, after the ground, so it stands on the levee
// rather than under it.
// ---------------------------------------------------------------------------
const PARK = {
  X0: 2600, X1: 3900,
  SIGN: 2660,
  LOT0: 2730, LOT1: 2960,
  BLD0: 2985, BLD1: 3210,
  PIT: 3360,
  BOARD0: 3470, BOARD1: 3540,
  DOCK0: 3555, DOCK1: 3880,
};
// Everything in the park is drawn relative to the world scale, and the world
// scale is set by the sawgrass: six feet of grass is thirty units, so a
// twenty-five foot building is a hundred and twenty. PS is that multiplier.
const PS = 2.4;

const Park = {
  t: 0,
  on(x) { return x > PARK.X0 - 420 && x < PARK.X1 + 420; },

  update(dt) { this.t += dt; },

  // ---- helpers ----------------------------------------------------------
  draw(ctx, cam) {
    if (!this.on(cam.x)) return;
    const W = G.W, H = G.H, z = cam.zoom, T = this.t;
    const light = World.light(G.day), night = 1 - light;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    // world → screen, and world size → screen size
    const S = (wx, wy) => cam.toScreen(wx, wy);
    const dim = (c) => mixColor(c, '#101c22', night * 0.5);
    const lamp = (c) => mixColor(c, '#ffd88a', night * 0.35);
    const G0 = (wx) => S(0, World.floorY(wx))[1];        // ground at a world x

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    this.lot(ctx, S, z, px, dim, lamp, night);
    this.building(ctx, S, z, px, dim, lamp, night, T);
    this.pit(ctx, S, z, px, dim, lamp, night, T);
    this.docks(ctx, S, z, px, dim, lamp, night, T);
    this.sign(ctx, S, z, px, dim, lamp, night, T);

    ctx.restore();
  },

  // ---- the car park -----------------------------------------------------
  lot(ctx, S, z, px, dim, lamp, night) {
    const Z = z * PS;
    const gy = S(0, World.floorY(PARK.LOT0))[1];
    const [x0] = S(PARK.LOT0, 0), [x1] = S(PARK.LOT1, 0);
    if (x1 < -200 || x0 > G.W + 200) return;
    // the asphalt, and the bays painted on it
    px(x0, gy - 2 * Z, x1 - x0, 3 * Z, dim('#3c3c3a'));
    px(x0, gy + 1 * Z, x1 - x0, 26 * Z, dim('#333331'));
    for (let i = 0; i <= 9; i++) {
      const [bx] = S(PARK.LOT0 + i * (PARK.LOT1 - PARK.LOT0) / 9, 0);
      px(bx, gy - 1.6 * Z, 1.4 * Z, 9 * Z, dim('#b8b49a'));
    }
    px(x0, gy - 11 * Z, x1 - x0, 1.6 * Z, dim('#8e8a72'));    // the kerb at the back
    // a coach, two pickups and a truck with a boat trailer
    this.coach(ctx, S, z, px, dim, PARK.LOT0 + 12, gy);
    this.pickup(ctx, S, z, px, dim, PARK.LOT0 + 48, gy, '#8a3830');
    this.pickup(ctx, S, z, px, dim, PARK.LOT0 + 66, gy, '#2c5a80');
    // and the light poles over it
    for (const ox of [16, 62]) {
      const [lx] = S(PARK.LOT0 + ox, 0);
      px(lx, gy - 44 * Z, 2.6 * Z, 44 * Z, dim('#5a5e58'));
      px(lx - 6 * Z, gy - 46 * Z, 15 * Z, 3 * Z, dim('#6e7268'));
      if (night > 0.35) {
        const g = ctx.createRadialGradient(lx + 1 * Z, gy - 44 * Z, 2, lx + 1 * Z, gy - 44 * Z, 60 * Z);
        g.addColorStop(0, 'rgba(255,224,150,' + (0.22 * night).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,224,150,0)');
        ctx.fillStyle = g; ctx.fillRect(lx - 60 * Z, gy - 100 * Z, 120 * Z, 110 * Z);
        px(lx - 5 * Z, gy - 45 * Z, 13 * Z, 2 * Z, '#ffe8a8');
      }
    }
  },

  coach(ctx, S, z, px, dim, wx, gy) {
    const Z = z * PS;
    const [x] = S(wx, 0);
    const w = 62 * Z, h = 22 * Z, y = gy - h - 3 * Z;
    px(x, y, w, h, dim('#e4e6e2'));
    px(x, y, w, 4 * Z, dim('#f4f6f2'));
    px(x, y + h - 5 * Z, w, 5 * Z, dim('#2e4a70'));          // the stripe along the skirt
    px(x, y + 6 * Z, w, 8 * Z, dim('#2a3a44'));              // the glass
    for (let i = 0; i < 9; i++) px(x + 3 * Z + i * 6.6 * Z, y + 6 * Z, 1.4 * Z, 8 * Z, dim('#e4e6e2'));
    px(x + w - 9 * Z, y + 4 * Z, 8 * Z, 11 * Z, dim('#38505c'));  // the windscreen
    px(x + 5 * Z, gy - 3 * Z, 8 * Z, 4 * Z, '#14181a');      // wheels
    px(x + w - 16 * Z, gy - 3 * Z, 8 * Z, 4 * Z, '#14181a');
    px(x + 4 * Z, y + 1.4 * Z, 22 * Z, 3 * Z, dim('#c8cc4a'));    // the destination blind
  },

  pickup(ctx, S, z, px, dim, wx, gy, col) {
    const Z = z * PS;
    const [x] = S(wx, 0);
    const w = 30 * Z, h = 11 * Z, y = gy - h - 3 * Z;
    px(x, y + 3 * Z, w, h - 3 * Z, dim(col));
    px(x + 4 * Z, y - 5 * Z, 13 * Z, 9 * Z, dim(col));       // the cab
    px(x + 5 * Z, y - 4 * Z, 11 * Z, 5 * Z, dim('#4a6a78'));
    px(x, y + 3 * Z, w, 1.6 * Z, dim(mixColor(col, '#ffffff', 0.3)));
    px(x + 3 * Z, gy - 3 * Z, 6 * Z, 4 * Z, '#14181a');
    px(x + w - 9 * Z, gy - 3 * Z, 6 * Z, 4 * Z, '#14181a');
  },

  // ---- the main building ------------------------------------------------
  building(ctx, S, z, px, dim, lamp, night, T) {
    const Z = z * PS;
    const gy = S(0, World.floorY(PARK.BLD0))[1];
    const [x0] = S(PARK.BLD0, 0), [x1] = S(PARK.BLD1, 0);
    if (x1 < -260 || x0 > G.W + 260) return;
    const w = x1 - x0, h = 56 * Z, y0 = gy - h;
    // ---- the slab and the walls -------------------------------------------
    px(x0 - 4 * Z, gy - 3 * Z, w + 8 * Z, 5 * Z, dim('#b0a894'));
    px(x0, y0, w, h, dim('#dcd2bc'));                        // stucco
    px(x0, y0, w, 3 * Z, dim('#efe6d2'));
    px(x0, y0 + h - 6 * Z, w, 6 * Z, dim('#9e9madb'.slice(0, 7)));
    px(x0, y0 + h - 6 * Z, w, 6 * Z, dim('#9a917c'));
    // a hip roof in green standing seam
    ctx.fillStyle = dim('#2f5a3e');
    ctx.beginPath();
    ctx.moveTo(x0 - 8 * Z, y0);
    ctx.lineTo(x0 + 14 * Z, y0 - 16 * Z);
    ctx.lineTo(x1 - 14 * Z, y0 - 16 * Z);
    ctx.lineTo(x1 + 8 * Z, y0);
    ctx.closePath(); ctx.fill();
    px(x0 + 14 * Z, y0 - 17 * Z, w - 28 * Z, 2.4 * Z, dim('#3f7350'));
    for (let i = 0; i < 16; i++) {
      const u = i / 16;
      const rx = x0 - 8 * Z + u * (w + 16 * Z);
      const ry = y0 - 16 * Z * Math.min(1, Math.min(u, 1 - u) * (w / (22 * Z)));
      px(rx, ry, 1.2 * Z, y0 - ry, 'rgba(18,40,26,0.35)');
    }
    // ---- the concourse: a gap straight through the middle to the water ----
    const cx0 = x0 + w * 0.42, cw = w * 0.16;
    px(cx0, y0 + 6 * Z, cw, h - 6 * Z, dim('#2a3230'));
    px(cx0, y0 + 6 * Z, cw, 3 * Z, dim('#1a2220'));
    // daylight at the far end of it
    const cg = ctx.createLinearGradient(cx0, 0, cx0 + cw, 0);
    cg.addColorStop(0, 'rgba(180,210,180,0)'); cg.addColorStop(0.5, 'rgba(198,222,190,0.35)'); cg.addColorStop(1, 'rgba(180,210,180,0)');
    ctx.fillStyle = cg; ctx.fillRect(Math.round(cx0), Math.round(y0 + 10 * Z), Math.round(cw), Math.round(h - 16 * Z));
    // people going through it
    for (let i = 0; i < 3; i++) {
      const u = ((T * 0.1 + i * 0.37) % 1);
      const hx = cx0 + 3 * Z + u * (cw - 8 * Z);
      const hh = 13 * Z;
      px(hx, gy - hh, 3.4 * Z, hh, dim(choice0(i, ['#3a4a6a', '#6a3a3a', '#4a5a3a'])));
      px(hx, gy - hh - 3 * Z, 3.4 * Z, 3.4 * Z, dim('#c8a084'));
    }
    // ---- ticket windows, left of the concourse ----------------------------
    for (let i = 0; i < 3; i++) {
      const wx0 = x0 + 8 * Z + i * 13 * Z;
      px(wx0, y0 + 20 * Z, 10 * Z, 14 * Z, dim('#2a3a40'));
      px(wx0, y0 + 20 * Z, 10 * Z, 2 * Z, dim('#7e8a86'));
      px(wx0 + 1 * Z, y0 + 23 * Z, 8 * Z, 8 * Z, lamp(dim('#6a8a94')));
      px(wx0, y0 + 34 * Z, 10 * Z, 2.4 * Z, dim('#b8ae96'));       // the sill
    }
    px(x0 + 6 * Z, y0 + 12 * Z, 42 * Z, 6 * Z, dim('#2b5f8a'));
    Font.draw(ctx, 'TICKETS', Math.round(x0 + 9 * Z), Math.round(y0 + 13 * Z), { color: '#e8f0f4' });
    // ---- gift shop, right of the concourse --------------------------------
    const sx0 = cx0 + cw + 5 * Z;
    px(sx0, y0 + 16 * Z, x1 - sx0 - 6 * Z, 22 * Z, dim('#2e4046'));
    px(sx0, y0 + 16 * Z, x1 - sx0 - 6 * Z, 2 * Z, dim('#8a968e'));
    // shopfront glass with plush gators and shirts behind it
    for (let i = 0; i < 4; i++) {
      const gx = sx0 + 2 * Z + i * ((x1 - sx0 - 10 * Z) / 4);
      px(gx, y0 + 18 * Z, (x1 - sx0 - 12 * Z) / 4, 18 * Z, lamp(dim('#7ea8b4')));
      px(gx + 2 * Z, y0 + 30 * Z, 5 * Z, 5 * Z, dim(choice0(i, ['#3f8a3a', '#c8a030', '#b03848', '#3a6ab0'])));
      px(gx + 2 * Z, y0 + 22 * Z, 6 * Z, 2.4 * Z, dim('#e8e0c8'));
    }
    px(sx0, y0 + 8 * Z, x1 - sx0 - 6 * Z, 7 * Z, dim('#1d5b3a'));
    Font.draw(ctx, 'GIFT SHOP', Math.round(sx0 + 3 * Z), Math.round(y0 + 9.5 * Z), { color: '#e8f0e0' });
    // an awning over the shopfront
    px(sx0 - 2 * Z, y0 + 15 * Z, x1 - sx0 - 2 * Z, 3 * Z, dim('#1d5b3a'));
    for (let i = 0; i < 7; i++) px(sx0 + i * ((x1 - sx0) / 7), y0 + 15 * Z, ((x1 - sx0) / 14), 3 * Z, dim('#e8e0c8'));
    // ---- the cafe, on the near corner, with tables out in front -----------
    px(x0 + 6 * Z, y0 + 38 * Z, 34 * Z, 7 * Z, dim('#8a3428'));
    Font.draw(ctx, 'CAFE', Math.round(x0 + 9 * Z), Math.round(y0 + 39.5 * Z), { color: '#f4e8d0' });
    for (let i = 0; i < 2; i++) {
      const tx = x0 + 14 * Z + i * 24 * Z;
      px(tx, gy - 12 * Z, 16 * Z, 2.4 * Z, dim('#c8c0a8'));      // the table
      px(tx + 7 * Z, gy - 10 * Z, 2 * Z, 10 * Z, dim('#8a8474'));
      // a parasol over it
      px(tx + 7 * Z, gy - 30 * Z, 2 * Z, 18 * Z, dim('#8a8474'));
      ctx.fillStyle = dim(i ? '#2b6f4a' : '#b04a30');
      ctx.beginPath(); ctx.moveTo(tx - 6 * Z, gy - 28 * Z); ctx.lineTo(tx + 8 * Z, gy - 36 * Z); ctx.lineTo(tx + 22 * Z, gy - 28 * Z); ctx.closePath(); ctx.fill();
    }
    // ---- the flagpole and a vending machine -------------------------------
    const [fx] = S(PARK.BLD0 - 10, 0);
    px(fx, gy - 62 * Z, 2 * Z, 62 * Z, dim('#b0b4ac'));
    const fl = Math.sin(T * 2.4) * 2 * Z;
    px(fx + 2 * Z, gy - 60 * Z, 20 * Z, 12 * Z, dim('#b03038'));
    px(fx + 2 * Z, gy - 60 * Z + fl, 20 * Z, 4 * Z, dim('#e8e8e0'));
    px(fx + 2 * Z, gy - 52 * Z - fl, 20 * Z, 4 * Z, dim('#2b4f9a'));
  },

  // ---- the gator pit ----------------------------------------------------
  pit(ctx, S, z, px, dim, lamp, night, T) {
    const Z = z * PS;
    const gy = S(0, World.floorY(PARK.PIT))[1];
    const [cx] = S(PARK.PIT, 0);
    if (cx < -320 || cx > G.W + 320) return;
    const R = 34 * Z;                                         // half the pit
    // ---- the sand ring ----------------------------------------------------
    px(cx - R, gy - 4 * Z, R * 2, 8 * Z, dim('#c8b284'));
    px(cx - R, gy - 4 * Z, R * 2, 2 * Z, dim('#e0cc9e'));
    // a shallow pool in the middle of it, which is where the gators are
    px(cx - 22 * Z, gy - 3 * Z, 44 * Z, 6 * Z, dim('#2f6a58'));
    px(cx - 22 * Z, gy - 3 * Z, 44 * Z, 1.6 * Z, dim('#63a48a'));
    // ---- the wall round it ------------------------------------------------
    for (const sgn of [-1, 1]) {
      const wx = cx + sgn * R;
      px(wx - (sgn < 0 ? 0 : 5 * Z), gy - 20 * Z, 5 * Z, 22 * Z, dim('#cfc6ae'));
      px(wx - (sgn < 0 ? 0 : 5 * Z), gy - 20 * Z, 5 * Z, 2 * Z, dim('#e8e0c8'));
    }
    // ---- stadium seating, both sides, stepping up and back ----------------
    for (const sgn of [-1, 1]) {
      for (let r = 0; r < 5; r++) {
        const rx = cx + sgn * (R + 2 * Z + r * 13 * Z);
        const ry = gy - 20 * Z - r * 10 * Z;
        const rw = 13 * Z;
        px(sgn < 0 ? rx - rw : rx, ry, rw, 10 * Z, dim('#9aa29a'));
        px(sgn < 0 ? rx - rw : rx, ry, rw, 2.4 * Z, dim('#b6bcb2'));
        // the bench on the step, and the people on it
        px(sgn < 0 ? rx - rw + 1 * Z : rx + 1 * Z, ry - 4 * Z, rw - 2 * Z, 4 * Z, dim('#5a6a60'));
        for (let i = 0; i < 2; i++) {
          if (ihash(r * 7 + i + (sgn > 0 ? 40 : 0), 88) > 0.42) continue;
          const hx = (sgn < 0 ? rx - rw + 2 * Z : rx + 2 * Z) + i * 6 * Z;
          px(hx, ry - 13 * Z, 4 * Z, 9 * Z, dim(choice0(r * 3 + i, ['#3a4a6a', '#6a3a3a', '#4a5a3a', '#6a5a2a', '#5a3a6a'])));
          px(hx + 0.5 * Z, ry - 17 * Z, 3.4 * Z, 4 * Z, dim(choice0(r + i, ['#c8a084', '#8e6244', '#e0bc9a'])));
        }
      }
    }
    // ---- the louvered roof over the lot -----------------------------------
    const roofY = gy - 76 * Z;
    for (const sgn of [-1, 1]) {
      px(cx + sgn * (R + 62 * Z), roofY, 5 * Z, gy - roofY - 6 * Z, dim('#6e766e'));
    }
    px(cx - R - 66 * Z, roofY - 5 * Z, (R + 66 * Z) * 2, 5 * Z, dim('#5e665e'));
    // the louvre blades, half open, throwing stripes on everything under them
    const nl = 13;
    for (let i = 0; i < nl; i++) {
      const lx = cx - R - 64 * Z + i * ((R + 64 * Z) * 2 / nl);
      const tilt = 0.46;
      ctx.save();
      ctx.translate(lx + ((R + 64 * Z) / nl), roofY - 1 * Z);
      ctx.rotate(tilt);
      px(-((R + 64 * Z) / nl), -1.6 * Z, ((R + 64 * Z) * 2 / nl) * 0.92, 3.2 * Z, dim('#8e968e'));
      px(-((R + 64 * Z) / nl), -1.6 * Z, ((R + 64 * Z) * 2 / nl) * 0.92, 1.2 * Z, dim('#aeb6ae'));
      ctx.restore();
    }
    // the light that gets through them, on the ground under the roof only
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - R - 70 * Z, gy - 26 * Z, (R + 70 * Z) * 2, 28 * Z); ctx.clip();
    ctx.globalAlpha = 0.16 * World.light(G.day);
    for (let i = 0; i < nl; i++) {
      const lx = cx - R - 64 * Z + i * ((R + 64 * Z) * 2 / nl) + 5 * Z;
      px(lx, gy - 26 * Z, 6 * Z, 28 * Z, '#fff0c0');
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // ---- the show: a handler, a microphone and something with teeth -------
    const showU = (T * 0.22) % 1;
    const hx2 = cx + Math.sin(showU * TAU) * 22 * Z;
    px(hx2, gy - 22 * Z, 5 * Z, 18 * Z, dim('#2e3a2c'));              // the handler
    px(hx2 - 1 * Z, gy - 27 * Z, 7 * Z, 5 * Z, dim('#c8a084'));
    px(hx2 - 2 * Z, gy - 30 * Z, 9 * Z, 3.4 * Z, dim('#3a3a30'));     // the hat
    px(hx2 + 5 * Z, gy - 22 * Z, 8 * Z, 2 * Z, dim('#2e3a2c'));       // an arm out
    // and the animal he is standing over
    const ax = cx + Math.sin(showU * TAU + 1.2) * 16 * Z;
    px(ax - 18 * Z, gy - 5 * Z, 36 * Z, 5 * Z, dim('#38492a'));
    px(ax - 18 * Z, gy - 5 * Z, 36 * Z, 1.6 * Z, dim('#4f6538'));
    px(ax + 16 * Z, gy - 7 * Z, 12 * Z, 4 * Z, dim('#38492a'));       // the head
    px(ax + 26 * Z, gy - 6 * Z, 3 * Z, 1.4 * Z, '#e8e4d0');           // teeth
    px(ax - 30 * Z, gy - 3.4 * Z, 14 * Z, 2.4 * Z, dim('#38492a'));   // the tail
    // ---- the sign over the pit --------------------------------------------
    px(cx - 44 * Z, roofY - 18 * Z, 88 * Z, 13 * Z, dim('#1d4f2e'));
    px(cx - 44 * Z, roofY - 18 * Z, 88 * Z, 2 * Z, dim('#2f7546'));
    Font.draw(ctx, 'GATOR SHOW', Math.round(cx), Math.round(roofY - 15 * Z), { color: '#f0e8c0', align: 'center' });
  },

  // ---- the docks --------------------------------------------------------
  docks(ctx, S, z, px, dim, lamp, night, T) {
    const Z = z * PS;
    const [x0] = S(PARK.DOCK0, 0), [x1] = S(PARK.DOCK1, 0);
    if (x1 < -260 || x0 > G.W + 260) return;
    const surf = S(0, World.surface(PARK.DOCK0 + 40))[1];
    const deckY = surf - 16 * Z;
    // ---- the boardwalk down from the concourse ----------------------------
    const [bw0] = S(PARK.BOARD0, 0), [bw1] = S(PARK.BOARD1, 0);
    const bgy = S(0, World.floorY(PARK.BOARD0))[1];
    ctx.fillStyle = dim('#8a7048');
    ctx.beginPath();
    ctx.moveTo(bw0, bgy - 4 * Z); ctx.lineTo(bw1, deckY); ctx.lineTo(bw1, deckY + 5 * Z); ctx.lineTo(bw0, bgy + 1 * Z);
    ctx.closePath(); ctx.fill();
    // ---- the timber concourse over the water ------------------------------
    px(x0, deckY, x1 - x0, 5 * Z, dim('#9a7c50'));
    px(x0, deckY, x1 - x0, 1.6 * Z, dim('#bb9964'));
    px(x0, deckY + 5 * Z, x1 - x0, 2 * Z, dim('#5e4a2c'));
    for (let wx = PARK.DOCK0; wx < PARK.DOCK1; wx += 7) {
      const [sx] = S(wx, 0);
      px(sx, deckY, 1 * Z, 5 * Z, 'rgba(60,44,24,0.35)');
    }
    // piles down into the water
    for (let wx = PARK.DOCK0 + 4; wx < PARK.DOCK1; wx += 22) {
      const [sx] = S(wx, 0);
      const fl = S(0, World.floorY(wx))[1];
      px(sx, deckY + 4 * Z, 4 * Z, fl - deckY - 2 * Z, dim('#6a5436'));
      px(sx, deckY + 4 * Z, 1.4 * Z, fl - deckY - 2 * Z, dim('#876c48'));
      // a tyre fender and the weed on the waterline
      px(sx - 1 * Z, surf - 3 * Z, 6 * Z, 5 * Z, dim('#26282a'));
      px(sx, surf + 2 * Z, 4 * Z, 4 * Z, 'rgba(60,96,48,0.55)');
    }
    // the rail along the back of it
    for (let wx = PARK.DOCK0; wx < PARK.DOCK1; wx += 16) {
      const [sx] = S(wx, 0);
      px(sx, deckY - 14 * Z, 2 * Z, 14 * Z, dim('#8a7048'));
    }
    px(x0, deckY - 14 * Z, x1 - x0, 2 * Z, dim('#a8885a'));
    px(x0, deckY - 8 * Z, x1 - x0, 1.6 * Z, dim('#93764c'));
    // ---- four airboats in their berths ------------------------------------
    for (let i = 0; i < 4; i++) {
      const wx = PARK.DOCK0 + 26 + i * 42;
      this.airboat(ctx, S, z, px, dim, wx, surf, T, i);
    }
    // ---- the photo stand at the head of the dock --------------------------
    {
      const [sx] = S(PARK.DOCK0 + 10, 0);
      px(sx, deckY - 30 * Z, 24 * Z, 16 * Z, dim('#2b5f8a'));
      px(sx, deckY - 30 * Z, 24 * Z, 2 * Z, dim('#3f7cae'));
      Font.draw(ctx, 'PHOTO', Math.round(sx + 2 * Z), Math.round(deckY - 26 * Z), { color: '#e8f0f4' });
      px(sx + 4 * Z, deckY - 14 * Z, 3 * Z, 14 * Z, dim('#4a4e48'));
      px(sx + 16 * Z, deckY - 14 * Z, 3 * Z, 14 * Z, dim('#4a4e48'));
    }
    // ---- people on the boards, in a queue ---------------------------------
    for (let i = 0; i < 9; i++) {
      const wx = PARK.DOCK0 + 30 + i * 17 + Math.sin(T * 0.4 + i) * 2;
      const [sx] = S(wx, 0);
      if (sx < -20 || sx > G.W + 20) continue;
      const hh = (12 + (i % 3)) * Z;
      const sway = Math.sin(T * 1.2 + i * 1.7) * 0.8 * Z;
      px(sx + sway, deckY - hh, 4 * Z, hh, dim(choice0(i, ['#3a4a6a', '#6a3a3a', '#4a5a3a', '#6a5a2a', '#5a3a6a', '#2a5a5a'])));
      px(sx + sway, deckY - hh - 4 * Z, 4 * Z, 4 * Z, dim(choice0(i * 3, ['#c8a084', '#8e6244', '#e0bc9a'])));
      if (i % 3 === 0) px(sx + sway - 1 * Z, deckY - hh - 6 * Z, 6 * Z, 2.4 * Z, dim(choice0(i, ['#b03838', '#2b5f8a', '#c8a030'])));  // a hat
      // a life jacket on some of them
      if (i % 4 === 1) px(sx + sway, deckY - hh + 2 * Z, 4 * Z, 5 * Z, dim('#e07a20'));
    }
    // ---- the fishing dock and the two ramps, at the far end ---------------
    {
      const [rx] = S(PARK.DOCK1 - 34, 0);
      const fl = S(0, World.floorY(PARK.DOCK1 - 34))[1];
      // a concrete ramp going down into the basin
      ctx.fillStyle = dim('#b4b0a0');
      ctx.beginPath();
      ctx.moveTo(rx, deckY + 4 * Z); ctx.lineTo(rx + 40 * Z, fl); ctx.lineTo(rx + 40 * Z, fl + 4 * Z); ctx.lineTo(rx, deckY + 9 * Z);
      ctx.closePath(); ctx.fill();
      for (let i = 0; i < 8; i++) {
        const u = i / 8;
        px(rx + u * 40 * Z, deckY + 4 * Z + u * (fl - deckY - 4 * Z), 1.4 * Z, 5 * Z, 'rgba(90,88,78,0.4)');
      }
    }
  },

  // an airboat: a flat aluminium hull, a cage, a huge prop and a bench of
  // seats on a stand above it
  airboat(ctx, S, z, px, dim, wx, surf, T, i) {
    const Z = z * PS;
    const [x] = S(wx, 0);
    if (x < -120 * Z || x > G.W + 120 * Z) return;
    const bob = Math.sin(T * 1.3 + i * 1.7) * 1.4 * Z;
    const y = surf + bob;
    const w = 46 * Z;
    // the hull: flat-bottomed, with a rubbing strake
    px(x - w / 2, y - 7 * Z, w, 8 * Z, dim('#b8bec0'));
    px(x - w / 2, y - 7 * Z, w, 2 * Z, dim('#d8dee0'));
    px(x - w / 2, y - 1 * Z, w, 2 * Z, dim('#7c8284'));
    px(x - w / 2 - 3 * Z, y - 6 * Z, 4 * Z, 6 * Z, dim('#a8aeb0'));     // the bow, blunt
    // the bench seats, stepped up toward the back
    for (let r = 0; r < 3; r++) {
      const sx = x - w / 2 + 5 * Z + r * 11 * Z;
      px(sx, y - 12 * Z - r * 3 * Z, 10 * Z, 4 * Z, dim('#3a4a44'));
      px(sx, y - 8 * Z - r * 3 * Z, 2 * Z, 4 * Z, dim('#2c3a36'));
      // a couple of passengers with ear defenders on
      if (ihash(i * 7 + r, 96) > 0.45) {
        px(sx + 2 * Z, y - 22 * Z - r * 3 * Z, 4 * Z, 10 * Z, dim(choice0(i + r, ['#3a4a6a', '#6a3a3a', '#4a5a3a'])));
        px(sx + 2 * Z, y - 26 * Z - r * 3 * Z, 4 * Z, 4 * Z, dim('#c8a084'));
        px(sx + 1 * Z, y - 26 * Z - r * 3 * Z, 6 * Z, 1.6 * Z, dim('#2a2e30'));
      }
    }
    // the driver's chair, up on a post at the back
    px(x + w / 2 - 14 * Z, y - 30 * Z, 3 * Z, 22 * Z, dim('#7c8284'));
    px(x + w / 2 - 18 * Z, y - 34 * Z, 11 * Z, 5 * Z, dim('#3a4a44'));
    px(x + w / 2 - 16 * Z, y - 44 * Z, 5 * Z, 11 * Z, dim('#2e4a34'));
    px(x + w / 2 - 16 * Z, y - 48 * Z, 5 * Z, 4 * Z, dim('#c8a084'));
    // the cage and the prop
    const px0 = x + w / 2 - 4 * Z;
    px(px0, y - 40 * Z, 3 * Z, 34 * Z, dim('#6a7072'));
    ctx.strokeStyle = dim('#6a7072'); ctx.lineWidth = Math.max(1, 1.6 * Z);
    ctx.beginPath(); ctx.arc(px0 + 2 * Z, y - 24 * Z, 18 * Z, -Math.PI * 0.55, Math.PI * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.arc(px0 + 2 * Z, y - 24 * Z, 12 * Z, -Math.PI * 0.55, Math.PI * 0.55); ctx.stroke();
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(px0 + 2 * Z, y - 24 * Z);
      ctx.lineTo(px0 + 2 * Z + Math.cos(k * 0.5) * 18 * Z, y - 24 * Z + Math.sin(k * 0.5) * 18 * Z);
      ctx.stroke();
    }
    // the blade, stopped, because it is tied up
    px(px0, y - 40 * Z, 2.4 * Z, 32 * Z, dim('#4a5052'));
    // and the rudders behind it
    for (const oy of [-8, 0, 8]) px(px0 + 6 * Z, y - 24 * Z + oy * Z - 6 * Z, 2 * Z, 12 * Z, dim('#8a9092'));
    // a light spray ring where it sits in the water
    px(x - w / 2 - 4 * Z, y + 0.5 * Z, w + 8 * Z, 1.6 * Z, 'rgba(226,244,240,0.35)');
  },

  // ---- the roadside sign ------------------------------------------------
  sign(ctx, S, z, px, dim, lamp, night, T) {
    const Z = z * PS;
    const gy = S(0, World.floorY(PARK.SIGN))[1];
    const [x] = S(PARK.SIGN, 0);
    if (x < -160 || x > G.W + 160) return;
    const w = 78 * Z, h = 40 * Z, y = gy - 92 * Z;
    // two poles
    px(x - w / 2 + 8 * Z, y + h, 5 * Z, gy - y - h, dim('#5a5e58'));
    px(x + w / 2 - 13 * Z, y + h, 5 * Z, gy - y - h, dim('#5a5e58'));
    // the board
    px(x - w / 2, y, w, h, dim('#1d5b3a'));
    px(x - w / 2, y, w, 3 * Z, dim('#2f8455'));
    px(x - w / 2, y + h - 3 * Z, w, 3 * Z, dim('#123a26'));
    px(x - w / 2 + 2 * Z, y + 2 * Z, w - 4 * Z, h - 4 * Z, 'rgba(0,0,0,0)');
    ctx.strokeStyle = dim('#e8d88a'); ctx.lineWidth = Math.max(1, 1.4 * Z);
    ctx.strokeRect(Math.round(x - w / 2 + 3 * Z), Math.round(y + 3 * Z), Math.round(w - 6 * Z), Math.round(h - 6 * Z));
    Font.draw(ctx, 'EVERGLADES', Math.round(x), Math.round(y + 8 * Z), { color: '#f0e8c0', align: 'center' });
    Font.draw(ctx, 'HOLIDAY PARK', Math.round(x), Math.round(y + 17 * Z), { color: '#f0e8c0', align: 'center' });
    Font.draw(ctx, 'AIRBOAT TOURS', Math.round(x), Math.round(y + 29 * Z), { color: '#e8c060', align: 'center' });
    // a gator along the bottom of it
    px(x - w / 2 + 6 * Z, y + h - 9 * Z, 30 * Z, 3.4 * Z, dim('#7aa845'));
    px(x - w / 2 + 34 * Z, y + h - 10 * Z, 9 * Z, 3 * Z, dim('#7aa845'));
    // and the lamps on it after dark
    if (night > 0.3) {
      const g = ctx.createRadialGradient(x, y + h / 2, 4, x, y + h / 2, 70 * Z);
      g.addColorStop(0, 'rgba(255,232,170,' + (0.16 * night).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,232,170,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 70 * Z, y - 30 * Z, 140 * Z, 120 * Z);
    }
  },
};
// deterministic pick so a shirt colour does not change every frame
function choice0(i, arr) { return arr[((i % arr.length) + arr.length) % arr.length]; }
