'use strict';
// ---------------------------------------------------------------------------
// THE AIRLIFT.
//
// Nobody is pushing you anywhere any more. Facility B signed you over and a
// twin-engine machine came for you: a steel transport crate lashed to the
// cabin floor of a helicopter, two handlers on the bench in flight helmets,
// the side door open because it is ninety degrees at four hundred feet, and
// forty minutes of the River of Grass going past underneath it.
//
// They are taking you to a crocodile reserve in the Everglades. You are not
// going to a crocodile reserve in the Everglades.
//
// It is all real. The crate is a thing you break. The door is a hole in the
// side of the aircraft that you walk out of. The fall is the game's own
// physics with the game's own camera on it, four hundred feet of it, and the
// water at the bottom is the water you spend the rest of the run in.
//
//   FLIGHT   the crate, and mashing bite until the welds give
//   LOOSE    on the cabin floor with two people trying to get hold of you
//   FALL     out the door, and nothing under you for four hundred feet
//   SPLASH   the Everglades
//
// There is a way to lose it. Stay in the cabin and the reserve comes up, the
// skids touch, and the transfer order gets completed after all.
// ---------------------------------------------------------------------------
const Opening = {
  // Where the cabin sits while it is being drawn. The world is not rendered
  // during the cabin phases, so this only has to be air over the glades.
  CAB_X: 3700, CAB_Y: -2260,
  // where you go out of the door, and where the water is when you get there
  WAKE: 3700,
  // Kept so the laboratory's floor plate still knows it is intact: the manhole
  // in Facility B is a thing you look at now, not a thing you go down.
  coverBroken: false, coverHits: 0, coverT: 0,
  get MANHOLE() { return FACILITY.MANHOLE; },
  get DOCK() { return FACILITY.DOCK; },

  // The set has its own camera. The world camera is clamped to the waterline
  // and a cabin four hundred feet up is nowhere near it.
  cx: 0, cy: 0, cz: 2.5,
  on: false, phase: null, t: 0, taps: 0, need: 8, crate: 1, crew: [], stage: null,
  flightT: 0, LAND_AT: 42, doorT: 0, fallT: 0, splashed: false, fell: false,
  wind: 0, shakeT: 0, hintT: 0, nagged: false, caughtT: 0, heli: null, jumped: false,

  reset() {
    this.on = false; this.phase = null; this.t = 0; this.taps = 0; this.crate = 1; this.crew = [];
    this.stage = null; this.flightT = 0; this.doorT = 0; this.fallT = 0; this.splashed = false;
    this.fell = false; this.wind = 0; this.shakeT = 0; this.hintT = 0; this.nagged = false;
    this.caughtT = 0; this.heli = null; this.jumped = false; this.cx = 0; this.cy = 0; this.cz = 2.5;
    this.coverBroken = false; this.coverHits = 0; this.coverT = 0;
  },

  begin(stage) {
    this.reset();
    const P = G.player;
    this.on = true; this.stage = stage; this.phase = 'flight';
    P.frozen = true; P.hidden = false; P.invuln = 999;
    P.x = this.CAB_X; P.y = this.CAB_Y; P.angle = 0; P.facing = 1;
    P.vx = 0; P.vy = 0;
    P.chain.reset(P.x, P.y, 0);
    const g0 = this.geo();
    this.cx = g0.crate + 10; this.cy = g0.floor - 30; this.cz = 2.5;
    // the world under the aircraft has to exist before you land in it
    World.ensure(this.WAKE, 2600); Water.init(this.WAKE); Mud.init(this.WAKE);
    G.banner = { text: 'AIRLIFT 11', sub: 'TO THE EVERGLADES RESERVE', t: 3.4, max: 3.4, color: '#7fd8c0' };
    SFX.peep && SFX.peep();
  },

  // the disposal for every other site: you go in over the side of a boat
  hatch(stage) {
    const P = G.player, x = stage.x;
    P.y = World.surface(x) - 90; P.vy = 40; P.vx = 0; P.chain.reset(P.x, P.y, 0);
    P.invuln = 2; G.cam.y = P.y + 40;
    for (let i = 0; i < 24; i++) G.fx.add({ type: 'drop', x: x + rand(-16, 16), y: P.y, vx: rand(-40, 40), vy: rand(20, 120), s: 1, color: '#8ce8a0', life: 1.2 });
    G.shake(6); SFX.splash && SFX.splash(1.2);
    G.banner = { text: 'OVER THE SIDE', sub: 'NOBODY IS COMING BACK FOR YOU', t: 4, max: 4, color: '#8ab820' };
  },

  // true while the animal is in the aircraft or in the air: the HUD, the
  // alarm and the wildlife all stand off for the length of it
  scripted() { return this.on && this.phase !== 'fall'; },
  // true while the cabin set is what you are looking at instead of the world
  cabin() { return this.on && (this.phase === 'flight' || this.phase === 'loose' || this.phase === 'caught'); },

  // ---- the crate the animal is in ---------------------------------------
  // World-space geometry for the set, all of it hung off CAB_X/CAB_Y so the
  // camera behaves exactly as it does everywhere else.
  geo() {
    const x = this.CAB_X, y = this.CAB_Y;
    return {
      floor: y + 22,          // the cabin floor
      roof: y - 86,           // the cabin roof
      fwd: x - 150,           // the pilots' bulkhead, forward
      aft: x + 198,           // the aft bulkhead
      door0: x + 60,          // the open side door
      door1: x + 150,
      crate: x,               // where the crate is lashed down
    };
  },

  update(dt) {
    if (!this.on) return;
    this.t += dt;
    this.wind = lerp(this.wind, this.phase === 'fall' ? 1 : this.phase === 'caught' ? 0 : 0.35, 1 - Math.exp(-dt * 3));
    if (this.phase !== 'fall' && this.phase !== 'splash') this.flightT += dt;
    switch (this.phase) {
      case 'flight': this.flight(dt); break;
      case 'loose': this.loose(dt); break;
      case 'fall': this.fall(dt); break;
      case 'splash': this.splash(dt); break;
      case 'caught': this.caughtHold(dt); break;
    }
  },

  // ---- FLIGHT: mash bite ------------------------------------------------
  flight(dt) {
    const P = G.player, g = this.geo();
    P.frozen = true;
    // the airframe never stops moving, and neither do you
    const buzz = Math.sin(G.t * 46) * 0.7 + Math.sin(G.t * 19) * 0.5;
    P.x = g.crate + buzz * 0.5;
    P.y = g.floor - 13 - 5 * P.vis + Math.sin(G.t * 23) * 0.6;
    P.angle = lerp(P.angle, 0.05 + Math.sin(G.t * 3) * 0.05, 1 - Math.exp(-dt * 4));
    P.jaw = 0.18 + Math.max(0, Math.sin(G.t * 2.4)) * 0.22;
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, 0.5, false);
    this.cx = g.crate + 10; this.cy = g.floor - 30; this.cz = 2.5;
    if (chance(dt * 1.4)) G.shake(1.2);
    const tapped = Input.bitePressed() || Input.mouse.clicked || (Input.touch && Input.touch.bite);
    if (tapped && this.t > 0.6) {
      this.taps++;
      this.crate = 1 - this.taps / this.need;
      G.shake(3 + this.taps * 1.5); G.hitstop(0.04);
      SFX.clank && SFX.clank(0); SFX.chomp && SFX.chomp(0.6, 0);
      for (let i = 0; i < 5 + this.taps * 2; i++) {
        G.fx.add({ type: 'splinter', x: g.crate + rand(-16, 16), y: g.floor - rand(8, 34), vx: rand(-80, 80), vy: rand(-120, -10), s: 1, w: randi(1, 3),
          color: choice(['#b8c2c4', '#7e8a8e', '#dfe8ea']), rot: rand(TAU), vr: rand(-9, 9), life: rand(0.5, 1.2) });
      }
      // the handlers look round, then start to get up
      for (const w of this.crew) w.anim.expr = this.taps > this.need * 0.5 ? 'scared' : 'calm';
      if (this.taps >= this.need) this.breach();
    }
    if (this.flightT > this.LAND_AT) this.caught();
  },

  // the welds go and the door of the crate comes off its hinge
  breach() {
    const P = G.player, g = this.geo();
    this.phase = 'loose'; this.t = 0; this.crate = 0; this.hintT = 0;
    P.frozen = false; P.invuln = 6;
    P.x = g.crate + 20; P.y = g.floor - 16 - 5 * P.vis; P.vx = 150; P.vy = -110;
    G.whiteFlash(0.5); G.shake(18); G.slowmo(0.3, 0.9);
    SFX.hatch && SFX.hatch(); SFX.splinter && SFX.splinter(0); SFX.roar && SFX.roar(0.6, 0);
    for (let i = 0; i < 70; i++) {
      const a = rand(-Math.PI, 0.5), sp = rand(70, 300);
      G.fx.add({ type: 'splinter', x: g.crate + rand(-22, 22), y: g.floor - 26 + rand(-22, 16), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 1, w: randi(2, 5),
        color: choice(['#c8d2d4', '#8a969a', '#e8f0f2', '#5e686c']), rot: rand(TAU), vr: rand(-11, 11), life: rand(2, 4.5) });
    }
    G.fx.cloud && G.fx.cloud(g.crate, g.floor - 30, 40, '#7e8a8e', 2.6);
    G.banner = { text: 'CONTAINMENT BREACH', sub: 'THE SIDE DOOR IS OPEN', t: 4, max: 4, color: '#ff8c40' };
  },

  // ---- LOOSE: the cabin floor, and a hole in the side of it -------------
  loose(dt) {
    const P = G.player, g = this.geo();
    this.hintT += dt;
    // The cabin is a box. You can walk it, and the only way out of the box is
    // the one they left open.
    P.y = Math.min(P.y, g.floor - 5 * P.vis);
    if (P.y >= g.floor - 5 * P.vis - 0.5) { P.y = g.floor - 5 * P.vis; if (P.vy > 0) P.vy = 0; P.onLand = true; }
    else P.vy += 900 * dt;
    P.x += P.vx * dt; P.y += P.vy * dt;
    P.vx *= Math.exp(-3.4 * dt);
    const [ix] = Input.axis();
    P.vx += ix * 520 * dt;
    P.vx = clamp(P.vx, -190, 190);
    if (P.x < g.fwd + 18) { P.x = g.fwd + 18; P.vx = Math.max(0, P.vx); }
    if (P.x > g.aft - 14) { P.x = g.aft - 14; P.vx = Math.min(0, P.vx); }
    if (Math.abs(P.vx) > 6) P.facing = sign(P.vx);
    P.angle = lerp(P.angle, 0, 1 - Math.exp(-dt * 6));
    P.legPhase = (P.legPhase || 0) + dt * (2 + Math.abs(P.vx) * 0.05);
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, clamp(Math.abs(P.vx) / 160, 0, 1.2), false);
    this.cx = lerp(this.cx, clamp(P.x + 14, g.fwd + 80, g.aft - 60), 1 - Math.exp(-dt * 5));
    this.cy = lerp(this.cy, g.floor - 30, 1 - Math.exp(-dt * 5));
    this.cz = lerp(this.cz, 2.1, 1 - Math.exp(-dt * 2));
    // the handlers come for you, and they are not fast
    for (const w of this.crew) {
      w.scared = true;
      w.facing = sign(P.x - w.x) || 1;
      w.x += w.facing * 34 * dt;
      w.x = clamp(w.x, g.fwd + 12, g.aft - 10);
      w.y = g.floor - (w.groundOff || 0) * w.size;
      w.anim.mode = 'walk'; w.anim.speed = 1; w.anim.phase += dt * 6; w.anim.expr = 'scared';
    }
    // out the door
    if (P.x > g.door0 + 6 && P.x < g.door1 && this.t > 0.4) this.jump();
    if (this.flightT > this.LAND_AT) this.caught();
    if (this.hintT > 7 && !this.nagged) {
      this.nagged = true;
      G.banner = { text: 'THE DOOR', sub: 'GO AFT AND GO OUT OF IT', t: 3.4, max: 3.4, color: '#c8b070' };
    }
  },

  // ---- FALL: four hundred feet ------------------------------------------
  jump() {
    const P = G.player;
    this.phase = 'fall'; this.t = 0; this.fallT = 0; this.jumped = true; this.fell = true;
    // out of the set and into the world, high over the water
    P.frozen = false; P.invuln = 999; P.hidden = false;
    P.x = this.WAKE - 190; P.y = World.surface(this.WAKE) - 1180;
    P.vx = 150; P.vy = -40;
    P.chain.reset(P.x, P.y, 0);
    // the aircraft you just left, which carries on without you
    this.heli = { x: P.x - 30, y: P.y - 40, vx: 210, vy: -26, t: 0 };
    G.cam.x = P.x; G.cam.y = P.y; G.cam.zoomRaw = 0.9; G.cam.zoom = 0.9;
    G.shake(8); G.slowmo(0.45, 1.1);
    SFX.breach && SFX.breach(0); SFX.roar && SFX.roar(1, 0);
    G.banner = { text: 'OUT', sub: 'FOUR HUNDRED FEET OF NOTHING', t: 2.6, max: 2.6, color: '#ffd060' };
  },

  fall(dt) {
    const P = G.player;
    this.fallT += dt;
    const h = this.heli;
    if (h) { h.t += dt; h.x += h.vx * dt; h.y += h.vy * dt; h.vy -= 5 * dt; }
    // steerable, because falling with nothing to do is not a thing to play
    const [ix, iy] = Input.axis();
    P.vx += ix * 240 * dt;
    P.vy += 900 * dt + iy * 120 * dt;
    P.vx *= Math.exp(-0.5 * dt);
    P.vy = Math.min(P.vy, 900);
    P.x += P.vx * dt; P.y += P.vy * dt;
    // nose over into the dive the way a thing that is falling does
    const want = Math.atan2(P.vy, Math.abs(P.vx) + 40);
    P.angle = angleLerp(P.angle, want, 1 - Math.exp(-dt * 3));
    P.facing = P.vx >= 0 ? 1 : -1;
    P.jaw = 0.35 + Math.sin(this.fallT * 12) * 0.2;
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, 1.6, false);
    G.cam.x = lerp(G.cam.x, P.x + P.vx * 0.18, 1 - Math.exp(-dt * 6));
    G.cam.y = lerp(G.cam.y, P.y + 70, 1 - Math.exp(-dt * 5));
    if (chance(dt * 26)) G.fx.add({ type: 'drop', x: P.x + rand(-26, 26), y: P.y + rand(-40, 40), vx: 0, vy: -380, s: 1, color: '#cfe8f0', life: 0.34 });
    if (P.y > World.surface(P.x) - 4) this.hitWater();
  },

  hitWater() {
    const P = G.player;
    this.phase = 'splash'; this.t = 0; this.splashed = true;
    const p = 3.2;
    P.vy *= 0.28; P.vx *= 0.7;
    G.fx.splash(P.x, p, P.vx); Water.splash(P.x, p * 130, 26);
    G.fx.bubbles(P.x, P.y + 10, 30, 30, 40);
    G.shake(11); G.slowmo(0.5, 0.7);
    SFX.splash && SFX.splash(1.8); SFX.breach && SFX.breach(0);
    G.banner = { text: 'THE EVERGLADES', sub: 'NOBODY KNOWS WHERE YOU WENT IN', t: 4.6, max: 4.6, color: '#9fe0c8' };
  },

  splash(dt) {
    const P = G.player;
    P.angle = angleLerp(P.angle, 0, 1 - Math.exp(-dt * 3));
    if (chance(dt * 12)) G.fx.bubbles(P.x, P.y, 2, 12 * P.vis);
    if (this.t > 1.2) { this.phase = 'done'; this.on = false; P.invuln = 3; }
  },

  // ---- the other ending: the skids touch down ---------------------------
  caught() {
    const P = G.player;
    this.phase = 'caught'; this.t = 0; this.caughtT = 0;
    P.frozen = true; P.invuln = 999; P.vx = 0; P.vy = 0;
    G.shake(9); SFX.warning && SFX.warning();
    G.banner = { text: 'RECAPTURED', sub: 'WELCOME TO THE RESERVE', t: 5, max: 5, color: '#ff8c40' };
  },

  caughtHold(dt) {
    const P = G.player, g = this.geo();
    this.caughtT += dt;
    P.frozen = true; P.vx = 0; P.vy = 0;
    if (P.grabbed && P.grabbed.release) P.grabbed.release();
    P.grabbed = false; P.haulT = 0; P.haulBy = null; P.netT = 0;
    const lift = clamp((this.caughtT - 1.1) / 1.2, 0, 1);
    P.x = lerp(P.x, g.crate + 30, 1 - Math.exp(-dt * 3));
    P.y = g.floor - 5 * P.vis - lift * 40 * P.vis;
    P.angle = lerp(P.angle, -0.5, 1 - Math.exp(-dt * 4));
    P.jaw = 0.4 + Math.sin(this.caughtT * 9) * 0.25;
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, 1.4, false);
    this.crew.forEach((w, i) => {
      const off = (i === 0 ? 1 : -1) * (20 + 4 * i);
      w.x = P.x + off; w.y = g.floor - (w.groundOff || 0) * w.size;
      w.vx = 0; w.vy = 0; w.facing = sign(P.x - w.x) || -1;
      w.anim.mode = 'stand'; w.anim.speed = 0; w.anim.expr = 'calm'; w.anim.push = clamp((this.caughtT - 0.4) * 2, 0, 1);
      w.anim.phase += dt * 2;
    });
    this.cx = lerp(this.cx, P.x, 1 - Math.exp(-dt * 3)); this.cy = lerp(this.cy, g.floor - 34, 1 - Math.exp(-dt * 3));
    if (this.caughtT > 3.4 && !P.dead) {
      P.dead = true; P.cause = 'RECAPTURED'; P.hp = 0; this.on = false;
      G.onPlayerDeath('RECAPTURED', null);
    }
  },

  // =======================================================================
  // THE SET
  // =======================================================================
  drawCabin(ctx) {
    const W = G.W, H = G.H, P = G.player, g = this.geo();
    const T = G.t, z = this.cz, camx = this.cx, camy = this.cy;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const S = (wx, wy) => [W / 2 + (wx - camx) * z, H / 2 + (wy - camy) * z];
    // the airframe is never still
    const vib = Math.sin(T * 44) * 0.8 + Math.sin(T * 17.3) * 0.5;
    ctx.save();
    ctx.translate(0, Math.round(vib));

    // ---- what is out of the door: the glades from four hundred feet ------
    this.drawAerial(ctx);

    const [fwdX] = S(g.fwd, 0), [aftX] = S(g.aft, 0), [d0] = S(g.door0, 0), [d1] = S(g.door1, 0);
    const [, flY] = S(0, g.floor), [, rfY] = S(0, g.roof);

    // ---- the far side of the cabin --------------------------------------
    // Everything between the two doorposts is sky; everything else is the
    // aircraft, which is a riveted aluminium box with a lot going on in it.
    const skin = '#5e6a6c', skinLo = '#485254', skinHi = '#7b8789';
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    // the far wall, in panels, with a window in it
    const wallTop = rfY, wallBot = flY;
    px(fwdX, wallTop, d0 - fwdX, wallBot - wallTop, skinLo);
    px(d1, wallTop, aftX - d1, wallBot - wallTop, skinLo);
    // longerons: the horizontal frames the skin is riveted to
    for (let i = 0; i < 4; i++) {
      const yy = wallTop + (wallBot - wallTop) * (0.16 + i * 0.22);
      px(fwdX, yy, d0 - fwdX, 2 * z, shade(skinLo, 1.18));
      px(d1, yy, aftX - d1, 2 * z, shade(skinLo, 1.18));
      px(fwdX, yy + 2 * z, d0 - fwdX, 1.2 * z, shade(skinLo, 0.78));
      px(d1, yy + 2 * z, aftX - d1, 1.2 * z, shade(skinLo, 0.78));
    }
    // frames: the ribs going up the wall, and the rivets on them
    for (let wx = g.fwd; wx < g.aft; wx += 26) {
      const [sx] = S(wx, 0);
      if (sx > d0 - 2 && sx < d1) continue;
      px(sx, wallTop, 3.2 * z, wallBot - wallTop, shade(skinLo, 1.1));
      px(sx + 3.2 * z, wallTop, 1.2 * z, wallBot - wallTop, shade(skinLo, 0.72));
      for (let r = 0; r < 9; r++) px(sx + 1.2 * z, wallTop + 4 * z + r * (wallBot - wallTop - 8 * z) / 9, 1.2 * z, 1.2 * z, shade(skinLo, 1.35));
    }
    // a porthole forward of the door, with the glades going past in it
    {
      const [wx0] = S(g.fwd + 52, 0), ww = 40 * z, wh = 26 * z, wy = wallTop + (wallBot - wallTop) * 0.24;
      px(wx0 - 2 * z, wy - 2 * z, ww + 4 * z, wh + 4 * z, shade(skinLo, 0.7));
      ctx.save();
      ctx.beginPath(); ctx.rect(wx0, wy, ww, wh); ctx.clip();
      const gg = ctx.createLinearGradient(0, wy, 0, wy + wh);
      gg.addColorStop(0, '#8fb6c8'); gg.addColorStop(0.46, '#a9c6cc'); gg.addColorStop(0.52, '#4d6a4a'); gg.addColorStop(1, '#3d5c3e');
      ctx.fillStyle = gg; ctx.fillRect(wx0, wy, ww, wh);
      for (let i = 0; i < 7; i++) {
        const sx2 = wx0 + ((i * 17 - T * 44) % (ww + 20)) - 10;
        px(sx2, wy + wh * (0.58 + (i % 3) * 0.1), 9 * z, 2 * z, '#2f4a32');
      }
      ctx.restore();
      px(wx0, wy, ww, 1.4 * z, 'rgba(230,246,250,0.5)');
    }
    // a placard, a fire bottle and a first aid box, because a cabin has those
    px(fwdX + 12 * z, wallTop + 10 * z, 22 * z, 12 * z, '#8c3028');
    px(fwdX + 13 * z, wallTop + 11 * z, 20 * z, 3 * z, '#c04a3a');
    px(aftX - 34 * z, wallTop + 14 * z, 16 * z, 22 * z, '#d8d2c0');
    px(aftX - 32 * z, wallTop + 18 * z, 12 * z, 3 * z, '#b03030');
    px(aftX - 30 * z, wallTop + 16 * z, 3 * z, 9 * z, '#b03030');
    ctx.restore();

    // ---- the pilots' bulkhead, forward ----------------------------------
    px(fwdX - 40 * z, rfY - 10 * z, 40 * z + 2, flY - rfY + 14 * z, skin);
    px(fwdX - 40 * z, rfY - 10 * z, 40 * z, 3 * z, skinHi);
    px(fwdX - 4 * z, rfY - 10 * z, 4 * z, flY - rfY + 14 * z, shade(skin, 0.7));
    // the instrument panel bleeding through the doorway to the cockpit
    {
      const ix0 = fwdX - 34 * z, iy0 = rfY + 14 * z;
      px(ix0, iy0, 26 * z, 34 * z, '#1a2224');
      for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
        const on = ihash(r * 7 + c, 91) > 0.35;
        px(ix0 + 3 * z + c * 6 * z, iy0 + 4 * z + r * 6 * z, 3.4 * z, 3 * z, on ? (ihash(r * 5 + c, 92) > 0.6 ? '#ffb040' : '#50e090') : '#2a3436');
      }
      // and the back of a helmet in the right-hand seat
      px(ix0 + 4 * z, iy0 - 13 * z, 16 * z, 13 * z, '#2c3438');
      px(ix0 + 5 * z, iy0 - 12 * z, 14 * z, 4 * z, '#3e484c');
      px(ix0 + 16 * z, iy0 - 7 * z, 6 * z, 4 * z, '#14181a');
    }

    // ---- the roof, the rail and the hoist --------------------------------
    px(fwdX - 40 * z, rfY - 10 * z, aftX - fwdX + 80 * z, 12 * z, shade(skin, 0.86));
    px(fwdX - 40 * z, rfY + 2 * z, aftX - fwdX + 80 * z, 2.4 * z, shade(skin, 0.6));
    for (let wx = g.fwd - 20; wx < g.aft + 20; wx += 34) {
      const [sx] = S(wx, 0);
      px(sx, rfY - 10 * z, 4 * z, 12 * z, shade(skin, 1.12));
    }
    // the load rail, and the strop hanging off it
    px(fwdX, rfY + 5 * z, aftX - fwdX, 2.4 * z, '#8e9a9c');
    px(fwdX, rfY + 7.4 * z, aftX - fwdX, 1.4 * z, '#3c4446');
    for (const ox of [-70, 24, 96]) {
      const [sx] = S(g.crate + ox, 0);
      const sw = Math.sin(T * 1.6 + ox) * 3 * z;
      ctx.strokeStyle = '#2e3638'; ctx.lineWidth = Math.max(1, 1.6 * z);
      ctx.beginPath(); ctx.moveTo(sx, rfY + 8 * z); ctx.quadraticCurveTo(sx + sw, rfY + 22 * z, sx + sw * 1.6, rfY + 34 * z); ctx.stroke();
      px(sx + sw * 1.6 - 2 * z, rfY + 34 * z, 5 * z, 4 * z, '#6a7476');
    }
    // two cabin lamps
    for (const ox of [-96, 60]) {
      const [sx] = S(g.crate + ox, 0);
      px(sx - 5 * z, rfY + 2 * z, 10 * z, 3 * z, '#ffe8a0');
      const gl = ctx.createRadialGradient(sx, rfY + 4 * z, 1, sx, rfY + 4 * z, 40 * z);
      gl.addColorStop(0, 'rgba(255,228,150,0.20)'); gl.addColorStop(1, 'rgba(255,228,150,0)');
      ctx.fillStyle = gl; ctx.fillRect(sx - 40 * z, rfY, 80 * z, 60 * z);
    }

    // ---- the floor: tie-down rails and a lot of scuffed grey -------------
    px(fwdX - 40 * z, flY, aftX - fwdX + 80 * z, H - flY, '#4a5254');
    px(fwdX - 40 * z, flY, aftX - fwdX + 80 * z, 2.4 * z, '#79858a');
    px(fwdX - 40 * z, flY + 2.4 * z, aftX - fwdX + 80 * z, 1.6 * z, '#333b3c');
    // the diamond tread on it
    ctx.save(); ctx.beginPath(); ctx.rect(0, flY + 4 * z, W, H - flY); ctx.clip();
    for (let wx = g.fwd - 40; wx < g.aft + 40; wx += 9) {
      const [sx] = S(wx, 0);
      for (let r = 0; r < 4; r++) px(sx + (r % 2 ? 4 * z : 0), flY + 7 * z + r * 6 * z, 4 * z, 1.6 * z, 'rgba(126,140,142,0.5)');
    }
    // tie-down rails, and the rings in them
    for (const oy of [10, 24]) {
      px(fwdX - 40 * z, flY + oy * z, aftX - fwdX + 80 * z, 2.4 * z, '#606a6c');
      px(fwdX - 40 * z, flY + oy * z + 2.4 * z, aftX - fwdX + 80 * z, 1.2 * z, '#2c3436');
      for (let wx = g.fwd - 30; wx < g.aft + 30; wx += 22) { const [sx] = S(wx, 0); px(sx, flY + oy * z - 1.2 * z, 3 * z, 4 * z, '#8a9698'); }
    }
    ctx.restore();

    // ---- the open door ---------------------------------------------------
    // the sill, the slid-back door panel, and the wind coming in over it
    px(d0 - 5 * z, rfY - 10 * z, 5 * z, flY - rfY + 16 * z, shade(skin, 1.2));
    px(d1, rfY - 10 * z, 5 * z, flY - rfY + 16 * z, shade(skin, 1.2));
    px(d0 - 5 * z, flY - 2 * z, d1 - d0 + 10 * z, 5 * z, '#8e9a9c');
    px(d0 - 5 * z, flY + 3 * z, d1 - d0 + 10 * z, 2 * z, '#2c3436');
    // the slid-back panel, stacked outboard aft of the opening
    px(d1 + 5 * z, rfY - 6 * z, 22 * z, flY - rfY + 8 * z, shade(skin, 0.94));
    px(d1 + 5 * z, rfY - 6 * z, 22 * z, 2.4 * z, skinHi);
    px(d1 + 8 * z, rfY + 10 * z, 16 * z, 12 * z, '#2a3436');
    // wind: streaks of it coming in through the hole
    ctx.save(); ctx.beginPath(); ctx.rect(d0, rfY, d1 - d0, flY - rfY); ctx.clip();
    for (let i = 0; i < 12; i++) {
      const u = ((T * 1.7 + i * 0.37) % 1);
      const yy = rfY + ((i * 13) % Math.max(1, flY - rfY));
      ctx.globalAlpha = 0.22 * (1 - u);
      px(d1 - u * (d1 - d0) * 1.4, yy, 16 * z, 1.4 * z, '#dff0f4');
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // ---- the cage, behind the animal --------------------------------------
    this.drawCrate(ctx, S, z, g, false);

    // ---- the animal ------------------------------------------------------
    ctx.save();
    ctx.translate(W / 2 + G.shakeX, H / 2 + G.shakeY);
    ctx.scale(z, z);
    ctx.translate(-camx, -camy);
    ctx.imageSmoothingEnabled = false;
    P.draw(ctx);
    ctx.restore();

    // ---- and the bars between it and you ---------------------------------
    this.drawCrate(ctx, S, z, g, true);

    // ---- the two of them on the bench -----------------------------------
    this.drawCrew(ctx, S, z, g);

    // ---- the near side of the cabin, between you and the camera ----------
    // a cargo net across the aft end and a strap across the near doorpost
    {
      const [nx0] = S(g.aft - 54, 0), [nx1] = S(g.aft, 0);
      ctx.globalAlpha = 0.85;
      for (let i = 0; i <= 8; i++) { const sx = nx0 + (nx1 - nx0) * i / 8; px(sx, rfY, 1.6 * z, flY - rfY, '#2e3a30'); }
      for (let i = 0; i <= 5; i++) { const sy = rfY + (flY - rfY) * i / 5; px(nx0, sy, nx1 - nx0, 1.6 * z, '#2e3a30'); }
      ctx.globalAlpha = 1;
    }
    // the rotor's shadow going over everything, four times a second
    {
      const k = (T * 5.4) % 1;
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#04100e';
      ctx.fillRect(0, 0, W, H * 0.24 + Math.sin(k * TAU) * H * 0.3);
      ctx.globalAlpha = 1;
    }
    // and the grade over the top of it
    const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.66);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,10,12,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // what is out of the door: four hundred feet of River of Grass
  drawAerial(ctx) {
    const W = G.W, H = G.H, T = G.t;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    // sky at the top, water and grass below, and a horizon that sits high
    // because you are looking down out of a door
    const hz = H * 0.22;
    const sky = ctx.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#6f9dc0'); sky.addColorStop(1, '#bcd4dc');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz);
    const grd = ctx.createLinearGradient(0, hz, 0, H);
    grd.addColorStop(0, '#8fa99a'); grd.addColorStop(0.24, '#6d8a6a'); grd.addColorStop(1, '#41603f');
    ctx.fillStyle = grd; ctx.fillRect(0, hz, W, H - hz);
    // the scroll: everything below moves aft at a rate set by how far down it is
    const sc = (depth, rate) => ((T * rate) % 1);
    // sheet water: long pale strips lying in the grass, going past
    for (let i = 0; i < 26; i++) {
      const d = 0.1 + (i % 7) / 7 * 0.9;
      const y = hz + d * (H - hz);
      const speed = 40 + d * 210;
      const w = (30 + ihash(i, 7) * 90) * (0.4 + d);
      const x = W - ((T * speed + ihash(i, 8) * 900) % (W + 240)) + 120;
      ctx.globalAlpha = 0.5 + d * 0.3;
      px(x, y, w, (1.4 + d * 3), '#a9c6c2');
      px(x + w * 0.2, y + (1 + d * 2), w * 0.5, (1 + d * 2), '#7fa49c');
      ctx.globalAlpha = 1;
    }
    // tree islands: dark blobs with a tail of shadow
    for (let i = 0; i < 14; i++) {
      const d = 0.16 + (i % 5) / 5 * 0.84;
      const y = hz + d * (H - hz);
      const speed = 44 + d * 220;
      const r = (3 + ihash(i, 9) * 9) * (0.5 + d);
      const x = W - ((T * speed + ihash(i, 10) * 1400) % (W + 300)) + 150;
      px(x - r, y - r * 0.5, r * 2, r, '#22381f');
      px(x - r * 0.7, y - r * 0.9, r * 1.4, r * 0.7, '#2e4826');
      px(x - r * 0.5, y + r * 0.4, r * 1.6, r * 0.34, 'rgba(10,20,14,0.35)');
    }
    // and a canal, dead straight, because a man drew it
    {
      const y = hz + 0.62 * (H - hz);
      px(0, y, W, 3, '#5a7f86');
      px(0, y + 3, W, 2, '#3e5c62');
      px(0, y - 3, W, 2, '#6f8a62');           // the spoil bank alongside it
    }
    // haze over the lot
    const hzg = ctx.createLinearGradient(0, hz - 8, 0, hz + 40);
    hzg.addColorStop(0, 'rgba(198,216,220,0.9)'); hzg.addColorStop(1, 'rgba(198,216,220,0)');
    ctx.fillStyle = hzg; ctx.fillRect(0, hz - 8, W, 48);
  },

  // A barred steel transport cage, not a box: you can see the whole animal in
  // it, and when it goes you can see exactly what went.
  drawCrate(ctx, S, z, g, front) {
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const [cx] = S(g.crate, 0), [, flY] = S(0, g.floor);
    const w = 108 * z, h = 62 * z;
    const x0 = cx - w / 2, y0 = flY - h;
    const brk = this.crate <= 0;
    const STEEL = '#7d878a', STEEL_HI = '#a5b0b2', STEEL_LO = '#4c5456';
    if (brk) {
      if (front) return;
      // the pan, the posts, and the bars peeled out of the way
      px(x0, flY - 12 * z, w, 12 * z, STEEL_LO);
      px(x0, flY - 12 * z, w, 2.4 * z, STEEL);
      px(x0, y0, 5 * z, h, STEEL_LO); px(x0 + w - 5 * z, y0, 5 * z, h, STEEL_LO);
      px(x0, y0, w, 5 * z, STEEL_LO);
      for (let i = 0; i < 7; i++) {
        const bx = x0 + 12 * z + i * (w - 24 * z) / 7;
        const bend = (i - 3) * 5 * z;
        ctx.strokeStyle = STEEL_LO; ctx.lineWidth = Math.max(1, 3 * z);
        ctx.beginPath(); ctx.moveTo(bx, y0 + 5 * z);
        ctx.quadraticCurveTo(bx + bend * 1.6, y0 + h * 0.5, bx + bend * 2.4, flY - 12 * z);
        ctx.stroke();
      }
      // the door, off its hinge, on the deck
      px(x0 - 34 * z, flY - 5 * z, 36 * z, 5 * z, STEEL_LO);
      px(x0 - 34 * z, flY - 7 * z, 36 * z, 2 * z, STEEL);
      for (let i = 0; i < 6; i++) px(x0 - 32 * z + i * 6 * z, flY - 5 * z, 2 * z, 5 * z, '#333b3c');
      return;
    }
    if (!front) {
      // the box behind the animal: a solid back panel and the pan it stands on
      px(x0, y0, w, h, '#39423f');
      px(x0 + 4 * z, y0 + 4 * z, w - 8 * z, h - 12 * z, '#2c3432');
      for (let i = 0; i < 5; i++) px(x0 + 4 * z, y0 + 8 * z + i * (h - 20 * z) / 5, w - 8 * z, 1.4 * z, 'rgba(120,132,130,0.20)');
      // straw on the pan, because they are required to bed it
      px(x0 + 5 * z, flY - 12 * z, w - 10 * z, 12 * z, '#3c3a2c');
      for (let i = 0; i < 22; i++) {
        const sx = x0 + 6 * z + ihash(i, 71) * (w - 12 * z);
        px(sx, flY - 12 * z + ihash(i, 72) * 9 * z, (3 + ihash(i, 73) * 6) * z, 1.4 * z, ihash(i, 74) > 0.5 ? '#6e6444' : '#544c34');
      }
      return;
    }
    // ---- everything in front of the animal -------------------------------
    // the pan lip
    px(x0, flY - 12 * z, w, 12 * z, STEEL_LO);
    px(x0, flY - 12 * z, w, 2.4 * z, STEEL);
    px(x0, flY - 3 * z, w, 3 * z, '#2e3436');
    // corner posts and rails
    px(x0, y0, 6 * z, h, STEEL);
    px(x0 + w - 6 * z, y0, 6 * z, h, STEEL);
    px(x0 + 1.4 * z, y0, 1.6 * z, h, STEEL_HI);
    px(x0 + w - 2.4 * z, y0, 1.6 * z, h, STEEL_LO);
    px(x0, y0, w, 7 * z, STEEL);
    px(x0, y0, w, 2 * z, STEEL_HI);
    px(x0, y0 + 5 * z, w, 2 * z, STEEL_LO);
    px(x0, y0 + h * 0.52, w, 5 * z, STEEL);
    px(x0, y0 + h * 0.52, w, 1.6 * z, STEEL_HI);
    // the bars
    const nb = 11;
    for (let i = 0; i < nb; i++) {
      const bx = x0 + 9 * z + i * (w - 18 * z) / (nb - 1);
      px(bx, y0 + 6 * z, 2.6 * z, h - 18 * z, STEEL);
      px(bx, y0 + 6 * z, 1 * z, h - 18 * z, STEEL_HI);
      px(bx + 2.6 * z, y0 + 6 * z, 1 * z, h - 18 * z, '#343c3e');
    }
    // the door in the middle of the front, with a latch and a padlock
    const dx = x0 + w * 0.5 - 20 * z;
    px(dx, y0 + 5 * z, 40 * z, h - 16 * z, 'rgba(0,0,0,0)');
    px(dx - 2 * z, y0 + 5 * z, 2.6 * z, h - 16 * z, STEEL_HI);
    px(dx + 40 * z, y0 + 5 * z, 2.6 * z, h - 16 * z, STEEL_HI);
    px(dx + 38 * z, y0 + h * 0.42, 12 * z, 5 * z, STEEL);           // the latch bar
    px(dx + 47 * z, y0 + h * 0.42 + 1 * z, 5 * z, 7 * z, '#c8a030'); // the padlock
    px(dx + 48 * z, y0 + h * 0.42 - 2 * z, 3 * z, 3 * z, '#8a7020');
    for (const hy of [0.2, 0.74]) { px(dx - 4 * z, y0 + 5 * z + (h - 16 * z) * hy, 5 * z, 6 * z, STEEL_LO); }
    // placards: a red diamond and a stencil, because a live animal in a cabin
    // is a regulated thing
    px(x0 + 8 * z, y0 - 12 * z, 30 * z, 12 * z, '#c8b884');
    Font.draw(ctx, 'LIVE', Math.round(x0 + 10 * z), Math.round(y0 - 10 * z), { color: '#2a2414' });
    px(x0 + w - 32 * z, y0 - 14 * z, 14 * z, 14 * z, '#b03030');
    px(x0 + w - 30 * z, y0 - 12 * z, 10 * z, 10 * z, '#e8d8c0');
    px(x0 + w - 26 * z, y0 - 10 * z, 2 * z, 5 * z, '#b03030');
    px(x0 + w - 26 * z, y0 - 4 * z, 2 * z, 2 * z, '#b03030');
    // the straps holding it to the floor rails
    for (const ox of [-34, 34]) {
      const [sx] = S(g.crate + ox, 0);
      px(sx - 2.4 * z, y0 - 3 * z, 5 * z, h + 15 * z, '#c8a030');
      px(sx - 2.4 * z, y0 + h * 0.3, 5 * z, 5 * z, '#6a5418');
      px(sx - 4 * z, flY - 2 * z, 8 * z, 4 * z, '#8a9698');
    }
    // and what your hitting it has done: bars bowing out, one at a time
    for (let i = 0; i < this.taps; i++) {
      const k = (i * 3 + 2) % nb;
      const bx = x0 + 9 * z + k * (w - 18 * z) / (nb - 1);
      const bend = ((i % 2) ? 1 : -1) * (2 + i * 0.7) * z;
      ctx.strokeStyle = STEEL; ctx.lineWidth = Math.max(1, 2.6 * z);
      ctx.beginPath(); ctx.moveTo(bx, y0 + 6 * z);
      ctx.quadraticCurveTo(bx + bend * 3, y0 + h * 0.5, bx, flY - 12 * z);
      ctx.stroke();
      ctx.strokeStyle = STEEL_HI; ctx.lineWidth = Math.max(1, 1 * z); ctx.stroke();
    }
    if (this.taps > 4) {
      px(dx + 38 * z, y0 + h * 0.42 - 1 * z, 12 * z, 2 * z, '#e8e0c0');   // the latch working loose
    }
  },

  drawCrew(ctx, S, z, g) {
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const [, flY] = S(0, g.floor);
    // the bench they sit on, first, so they sit on it
    const [bx0] = S(g.crate - 132, 0), [bx1] = S(g.crate - 62, 0);
    px(bx0, flY - 34 * z, bx1 - bx0, 5 * z, '#40504c');
    px(bx0, flY - 34 * z, bx1 - bx0, 1.6 * z, '#5c706a');
    px(bx0 + 2 * z, flY - 29 * z, 4 * z, 29 * z, '#2c3a38');
    px(bx1 - 6 * z, flY - 29 * z, 4 * z, 29 * z, '#2c3a38');
    // The two of them: flight suit, harness, helmet with the visor down. Drawn
    // rather than spawned — there is no ground under a cabin for a land animal
    // to stand on, and these two never leave it.
    const up = this.phase !== 'flight';
    const scared = this.phase === 'loose';
    for (let i = 0; i < 2; i++) {
      const ox = i === 0 ? -116 : -82;
      const walk = up ? Math.min(60, this.t * 26) : 0;
      const [sx] = S(g.crate + ox + walk, 0);
      const H0 = 56 * z;                                   // how tall a person is here
      const hipY = flY - (up ? H0 * 0.52 : H0 * 0.42);
      const shY = hipY - H0 * 0.34;
      const sway = up ? Math.sin(G.t * 7 + i) * 1.2 * z : Math.sin(G.t * 1.5 + i) * 0.5 * z;
      const suit = '#4a6350', suitHi = '#5e7a64', suitLo = '#33473a';
      const skin = i === 0 ? '#c8a084' : '#8e6244';
      // ---- legs ----------------------------------------------------------
      if (up) {
        const k = Math.sin(G.t * 7 + i * 2);
        px(sx - 6 * z, hipY, 5 * z, flY - hipY + k * 2 * z, suit);
        px(sx + 2 * z, hipY, 5 * z, flY - hipY - k * 2 * z, suit);
        px(sx - 6 * z, hipY, 5 * z, 3 * z, suitHi); px(sx + 2 * z, hipY, 5 * z, 3 * z, suitHi);
        px(sx - 7 * z, flY - 3 * z, 7 * z, 3 * z, '#14181a'); px(sx + 1 * z, flY - 3 * z, 7 * z, 3 * z, '#14181a');
      } else {
        // sitting: thighs forward, shins down off the bench
        px(sx - 4 * z, hipY, 16 * z, 6 * z, suit);
        px(sx - 4 * z, hipY, 16 * z, 2 * z, suitHi);
        px(sx + 8 * z, hipY + 5 * z, 5 * z, flY - hipY - 8 * z, suit);
        px(sx + 7 * z, flY - 3 * z, 8 * z, 3 * z, '#14181a');
      }
      // ---- torso ---------------------------------------------------------
      px(sx - 7 * z + sway, shY, 15 * z, hipY - shY + 2 * z, suit);
      px(sx - 7 * z + sway, shY, 15 * z, 2.4 * z, suitHi);
      px(sx + 5 * z + sway, shY, 3 * z, hipY - shY, suitLo);
      // the harness over it
      px(sx - 5 * z + sway, shY + 2 * z, 3 * z, hipY - shY - 4 * z, '#1e2a30');
      px(sx + 1 * z + sway, shY + 2 * z, 3 * z, hipY - shY - 4 * z, '#1e2a30');
      px(sx - 7 * z + sway, shY + (hipY - shY) * 0.5, 15 * z, 3 * z, '#1e2a30');
      px(sx - 2 * z + sway, shY + (hipY - shY) * 0.5, 4 * z, 4 * z, '#8a9298');
      // a radio on the chest
      px(sx + 2 * z + sway, shY + 3 * z, 4 * z, 6 * z, '#22282a');
      if (Math.sin(G.t * 4 + i * 2) > 0.6) px(sx + 3 * z + sway, shY + 4 * z, 2 * z, 2 * z, '#50e090');
      // ---- arms ----------------------------------------------------------
      if (scared) {
        // both out in front, going for the animal
        px(sx + 7 * z + sway, shY + 3 * z, 16 * z, 4.4 * z, suit);
        px(sx + 21 * z + sway, shY + 2 * z, 5 * z, 6 * z, skin);
        px(sx - 12 * z + sway, shY + 5 * z, 6 * z, 4 * z, suit);
      } else if (up) {
        px(sx + 7 * z + sway, shY + 2 * z, 4.4 * z, 12 * z, suit);
        px(sx + 7 * z + sway, shY + 14 * z, 5 * z, 5 * z, skin);
        px(sx - 10 * z + sway, shY + 2 * z, 4 * z, 12 * z, suit);
      } else {
        px(sx + 6 * z + sway, shY + 2 * z, 4.4 * z, 11 * z, suit);
        px(sx + 6 * z + sway, shY + 12 * z, 6 * z, 4 * z, skin);      // hands on knees
      }
      // ---- neck and helmet -----------------------------------------------
      px(sx - 2 * z + sway, shY - 3 * z, 6 * z, 4 * z, skin);
      const hy = shY - 15 * z;
      px(sx - 8 * z + sway, hy, 17 * z, 14 * z, '#2a3236');
      px(sx - 8 * z + sway, hy, 17 * z, 3 * z, '#404a4e');
      px(sx - 8 * z + sway, hy + 12 * z, 17 * z, 2.4 * z, '#171d1f');
      // visor, down, with the cabin in it
      px(sx - 5 * z + sway, hy + 5 * z, 13 * z, 6 * z, scared ? '#8fe8d8' : '#3f5d66');
      px(sx - 5 * z + sway, hy + 5 * z, 13 * z, 1.6 * z, '#a8d8e0');
      // earcup and mic boom
      px(sx + 8 * z + sway, hy + 4 * z, 3.4 * z, 7 * z, '#1a2022');
      px(sx - 10 * z + sway, hy + 4 * z, 3 * z, 7 * z, '#1a2022');
      ctx.strokeStyle = '#1a2022'; ctx.lineWidth = Math.max(1, 1.4 * z);
      ctx.beginPath(); ctx.moveTo(sx + 9 * z + sway, hy + 10 * z);
      ctx.quadraticCurveTo(sx + 6 * z + sway, hy + 17 * z, sx + 1 * z + sway, hy + 16 * z); ctx.stroke();
    }
  },

  // ---- the helicopter, once you are out of it ---------------------------
  drawWorld(ctx, cam) {
    if (!this.on || !this.heli) return;
    const h = this.heli, z = cam.zoom, T = G.t;
    const px = (x, y, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(hh))); };
    const [sx, sy] = cam.toScreen(h.x, h.y);
    if (sx < -400 || sx > G.W + 400 || sy < -400) return;
    const s = z * 1.0;
    // fuselage: a fat nose, a cabin, a tail boom and a fin
    px(sx - 26 * s, sy - 9 * s, 44 * s, 18 * s, '#3d4a50');
    px(sx - 26 * s, sy - 9 * s, 44 * s, 4 * s, '#5c6b72');
    px(sx - 26 * s, sy + 5 * s, 44 * s, 4 * s, '#242c30');
    px(sx - 30 * s, sy - 6 * s, 6 * s, 11 * s, '#2c363a');            // nose
    px(sx - 24 * s, sy - 7 * s, 12 * s, 7 * s, '#9fd0dc');            // windscreen
    px(sx - 2 * s, sy - 6 * s, 10 * s, 8 * s, '#101618');             // the open door
    px(sx + 18 * s, sy - 4 * s, 34 * s, 6 * s, '#3d4a50');            // tail boom
    px(sx + 18 * s, sy - 4 * s, 34 * s, 2 * s, '#5c6b72');
    px(sx + 48 * s, sy - 16 * s, 5 * s, 14 * s, '#3d4a50');           // fin
    px(sx + 44 * s, sy - 16 * s, 12 * s, 3 * s, '#5c6b72');
    px(sx - 18 * s, sy + 9 * s, 30 * s, 2 * s, '#6a767c');            // skids
    px(sx - 16 * s, sy + 9 * s, 2 * s, 5 * s, '#6a767c');
    px(sx + 6 * s, sy + 9 * s, 2 * s, 5 * s, '#6a767c');
    // the rotor, which is a disc at this speed
    const blur = 0.3 + 0.2 * Math.sin(T * 40);
    ctx.globalAlpha = blur;
    px(sx - 54 * s, sy - 15 * s, 108 * s, 2 * s, '#c8d4d8');
    ctx.globalAlpha = 0.85;
    px(sx - 2 * s, sy - 18 * s, 5 * s, 5 * s, '#5c6b72');
    ctx.globalAlpha = 1;
    // a beacon
    if (Math.sin(T * 5) > 0.4) px(sx - 2 * s, sy + 9 * s, 3 * s, 3 * s, '#ff5040');
  },

  // ---- the overlay: the prompt, and what the fall looks like ------------
  draw(ctx) {
    if (!this.on) return;
    const W = G.W, H = G.H;
    if (this.phase === 'flight') {
      const k = Math.floor(G.t * 3) % 2;
      Font.draw(ctx, 'MASH BITE', W / 2, H - 58, { color: k ? '#ffffff' : '#ffd060', align: 'center', scale: 2, outline: '#0a1a08' });
      ctx.fillStyle = '#1a1210'; ctx.fillRect(W / 2 - 41, H - 42, 82, 6);
      ctx.fillStyle = '#c8a030'; ctx.fillRect(W / 2 - 40, H - 41, Math.round(80 * (1 - this.crate)), 4);
      Font.draw(ctx, 'THE CRATE', W / 2, H - 33, { color: '#6f8f88', align: 'center' });
      // how long until the skids touch
      const left = Math.max(0, this.LAND_AT - this.flightT);
      if (left < 18) {
        const c = left < 8 && Math.floor(G.t * 5) % 2 ? '#ff5040' : '#ff9a50';
        Font.draw(ctx, 'RESERVE IN ' + Math.ceil(left), W / 2, 32, { color: c, align: 'center', outline: '#1a0a06' });
      }
      return;
    }
    if (this.phase === 'loose') {
      const P = G.player, g = this.geo();
      if (P.x < g.door0) Font.draw(ctx, 'AFT — THE DOOR IS OPEN', W / 2, H - 44, { color: Math.floor(G.t * 2) % 2 ? '#ffd060' : '#e8f0e0', align: 'center', outline: '#0a1a08' });
      const left = Math.max(0, this.LAND_AT - this.flightT);
      if (left < 18) {
        const c = left < 8 && Math.floor(G.t * 5) % 2 ? '#ff5040' : '#ff9a50';
        Font.draw(ctx, 'RESERVE IN ' + Math.ceil(left), W / 2, 32, { color: c, align: 'center', outline: '#1a0a06' });
      }
      return;
    }
    if (this.phase === 'caught') {
      Font.draw(ctx, 'AIRLIFT 11 COMPLETE', W / 2, H - 44, { color: '#ff8c40', align: 'center', outline: '#1a0a06' });
      return;
    }
    if (this.phase === 'fall') {
      // the air going past, and how much of it is left
      const P = G.player;
      const drop = Math.max(0, World.surface(P.x) - P.y);
      ctx.globalAlpha = clamp(this.fallT * 1.6, 0, 1) * 0.5;
      for (let i = 0; i < 26; i++) {
        const u = ((G.t * 2.4 + i * 0.3) % 1);
        const x = (i * 71) % W, y = u * (H + 60) - 30;
        ctx.fillStyle = '#dff0f6';
        ctx.fillRect(Math.round(x), Math.round(y), 1, Math.round(16 + u * 26));
      }
      ctx.globalAlpha = 1;
      const ft = Math.round(drop / 3.2);
      Font.draw(ctx, ft + ' FT', W / 2, 28, { color: ft < 120 ? '#ff9a50' : '#cfe8f0', align: 'center', scale: 2, outline: '#08121a' });
      const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.22, W / 2, H / 2, W * 0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,14,20,' + (0.3 + 0.25 * Math.sin(G.t * 6)).toFixed(2) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      return;
    }
  },
};
