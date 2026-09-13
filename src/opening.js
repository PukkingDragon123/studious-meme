'use strict';
// ---------------------------------------------------------------------------
// THE TRANSFER.
//
// No cutscene. The opening is the game: a corridor in Facility B a hundred and
// forty feet above the old relief works, a transport tank on a trolley, two
// people pushing it east toward another building, and you inside it. It is all
// real — the corridor is map, the trolley is a structure, the people are
// people, and the camera is the game's camera — which is why you can break it.
//
// Mash bite and the glass cracks, then goes. The two of them run. You are on a
// tiled floor with a floor drain at the end of it and the cover off the drain,
// and under the cover is the interceptor: a lined pipe that gives up its
// hundred and forty feet in six steps and puts what it is given into the
// cistern under Rome. The ride down takes about twenty seconds. It is drawn
// with the same world, the same physics and the same camera as everything
// else, because it is the same world.
// ---------------------------------------------------------------------------
const Opening = {
  // the cover you have to break, the line the handlers own, the head of the
  // interceptor under the building, and the mouth it lets out of
  LIP: -5968, DRAIN: -5950, MOUTH: -2996,
  get MANHOLE() { return FACILITY.MANHOLE; },
  get DOCK() { return FACILITY.DOCK; },
  NEED_COVER: 6,
  on: false, cart: null, crew: [], phase: null, t: 0, taps: 0, need: 7, prompt: 0, fell: false, splashed: false, stage: null,
  slideV: 0, air: 0, rideT: 0, hintT: 0, fall: 0, caughtX: 0, coverT: 0, coverHits: 0, coverBroken: false, caughtT: 0, nagged: false,

  reset() { this.on = false; this.cart = null; this.crew = []; this.phase = null; this.t = 0; this.taps = 0; this.prompt = 0; this.fell = false; this.splashed = false; this.stage = null; this.slideV = 0; this.air = 0; this.rideT = 0; this.hintT = 0; this.fall = 0; this.coverT = 0; this.coverHits = 0; this.coverBroken = false; this.caughtT = 0; this.nagged = false; },

  begin(stage) {
    this.reset();
    const P = G.player;
    this.on = true; this.stage = stage; this.phase = 'carry';
    const x0 = stage.x;
    const fy = World.floorY(x0);
    // the trolley and the tank on it
    const cart = new Structure(x0, 'transport'); cart.y = fy; cart.vx = 0; G.add(cart); this.cart = cart;
    // the two pushing it, behind it, hands on the bar
    for (const [ox, kind] of [[-46, 'worker'], [-72, 'worker']]) {
      const w = new LandAnimal(x0 + ox, kind); w.pushing = cart; w.pushOff = ox; w.facing = 1; w.state = 'idle'; w.stateT = 999; w.watching = false;
      w.y = fy - w.groundOff; G.add(w); this.crew.push(w);
    }
    // you: frozen, in the water in the tank
    P.frozen = true; P.hidden = false; P.inTank = cart; P.invuln = 60;
    P.x = cart.x; P.y = fy - 40; P.angle = 0; P.facing = 1; P.chain.reset(P.x, P.y, 0);
    G.cam.x = cart.x; G.cam.y = fy - 40; G.cam.zoomRaw = 2.2; G.cam.zoom = 2.2;
    G.banner = { text: 'FACILITY B', sub: 'TRANSFER ORDER 11', t: 3.2, max: 3.2, color: '#7fd8c0' };
    SFX.peep && SFX.peep();
  },

  // the disposal for every other sewer site: no corridor, no interceptor — a
  // hatch in the crown of the vault opens over the water and you come out of it
  hatch(stage) {
    const P = G.player, x = stage.x;
    const r = World.roofY(x);
    P.y = (r === null ? -80 : r + 14 * P.vis); P.vy = 40; P.vx = 0; P.chain.reset(P.x, P.y, 0);
    P.invuln = 2; G.cam.y = P.y + 40;
    for (let i = 0; i < 24; i++) G.fx.add({ type: 'drop', x: x + rand(-16, 16), y: P.y, vx: rand(-40, 40), vy: rand(20, 120), s: 1, color: '#8ce8a0', life: 1.2 });
    G.shake(6); SFX.clank && SFX.clank(0);
    G.banner = { text: 'DISPOSAL HATCH', sub: 'IN THE SYSTEM. THERE IS NO DOOR ON THE OTHER END.', t: 4, max: 4, color: '#8ab820' };
  },

  // true while the animal is being carried, dropped or ridden down: the HUD,
  // the alarm and the wildlife all stand off for the length of it
  scripted() { return this.on && this.phase !== 'loose'; },

  update(dt) {
    if (!this.on) return;
    const P = G.player, c = this.cart;
    this.t += dt;
    if (this.phase === 'carry') this.carry(dt);
    else if (this.phase === 'loose') this.loose(dt);
    else if (this.phase === 'drop') this.drop(dt);
    else if (this.phase === 'slide') this.slide(dt);
    else if (this.phase === 'launch') this.launch(dt);
    else if (this.phase === 'caught') this.caughtHold(dt);
  },

  carry(dt) {
    const P = G.player, c = this.cart;
    // the trolley rolls east at a walking pace and stops short of the drain
    const stopX = this.stage.x + 460;
    c.vx = c.x < stopX ? approach(c.vx, 42, dt * 60) : approach(c.vx, 0, dt * 120);
    c.x += c.vx * dt; c.y = World.floorY(c.x); c.roll = (c.roll || 0) + c.vx * dt;
    // you ride in it, curled in the water, and the camera rides with you
    P.frozen = true; P.x = c.x + Math.sin(this.t * 2.3) * 2; P.y = c.y - 42 + Math.cos(this.t * 1.7) * 1.5;
    P.angle = Math.sin(this.t * 1.1) * 0.15 + (this.taps > 0 ? Math.sin(this.t * 14) * 0.08 * Math.min(1, this.taps / 3) : 0);
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, 0.4 + this.taps * 0.1, false);
    P.jaw = 0.1 + Math.abs(Math.sin(this.t * 3)) * 0.2;
    // the crew keep their hands on the bar
    for (const w of this.crew) { w.x = c.x + w.pushOff; w.facing = 1; w.vx = c.vx; w.y = World.floorY(w.x) - w.groundOff; w.anim.push = 1; w.anim.speed = clamp(c.vx / 40, 0, 1); w.anim.phase += dt * (1 + c.vx * 0.12); w.anim.expr = this.taps >= 4 ? 'alert' : 'calm'; }
    this.prompt += dt;
    // the glass
    const tapped = Input.bitePressed() || Input.mouse.clicked || (Input.touch && Input.touch.bite);
    if (tapped && this.t > 1.0) {
      this.taps++; c.cracks = this.taps / this.need;
      G.shake(3 + this.taps * 1.4); G.hitstop(0.04); SFX.crack && SFX.crack(this.taps);
      for (let i = 0; i < 4 + this.taps * 3; i++) G.fx.add({ type: 'splinter', x: c.x + rand(-14, 14), y: c.y - 44 + rand(-16, 16), vx: rand(-80, 80), vy: rand(-110, 20), s: 1, w: randi(1, 3), color: choice(['#cfeef4', '#9fc4cc', '#e8f4f8']), rot: rand(TAU), vr: rand(-8, 8), life: rand(0.8, 1.6) });
      if (this.taps >= 3) for (const w of this.crew) { w.anim.expr = 'alert'; }
      if (this.taps >= this.need) this.breach();
    }
    // given long enough, the pressure finishes what you started
    if (this.t > 28 && this.taps < this.need) { this.taps = this.need; this.breach(); }
  },

  loose(dt) {
    const P = G.player;
    // the two of them run for the west door and are gone through it
    const doorX = this.stage.x - 50;
    for (const w of this.crew) { if (w.remove) continue; w.state = 'flee'; w.stateT = 40; w.fleeDir = -1; w.panicked = true; w.anim.expr = 'scared'; if (w.x < doorX) { w.remove = true; SFX.clank && SFX.clank(-0.6); G.fx.smoke(w.x, w.y, 3, '#8a9aa0'); } }
    this.hintT += dt;
    // The cover. Stand on it and bite it: cast iron, eleven stone of it, and
    // it gives on the sixth go. Every hit you land stays landed.
    const onCover = Math.abs(P.x - this.MANHOLE) < 26 && P.onLand;
    if (onCover && !this.coverBroken) {
      const tapped = Input.bitePressed() || Input.mouse.clicked || (Input.touch && Input.touch.bite);
      if (tapped) {
        this.coverHits++; this.coverT = this.coverHits / this.NEED_COVER;
        G.shake(4 + this.coverHits * 1.6); G.hitstop(0.05);
        SFX.clank && SFX.clank(0); SFX.thud && SFX.thud(0);
        for (let i = 0; i < 6 + this.coverHits * 3; i++) G.fx.add({ type: 'splinter', x: this.MANHOLE + rand(-22, 22), y: World.floorY(this.MANHOLE) - 4, vx: rand(-90, 90), vy: rand(-140, -20), s: 1, w: randi(1, 3), color: choice(['#8a8578', '#c8c0a8', '#5e5a52']), rot: rand(TAU), vr: rand(-9, 9), life: rand(0.6, 1.4) });
        if (this.coverHits >= this.NEED_COVER) this.breakCover();
      }
    }
    // The dock. Past this line there are two handlers, a crate and a truck,
    // and the transfer order gets completed after all.
    if (!this.coverBroken && P.x > this.DOCK) { this.caught(); return; }
    if (this.hintT > 12 && !this.nagged) {
      this.nagged = true;
      G.banner = { text: 'THE COVER', sub: 'STAND ON IT AND BITE IT', t: 3.4, max: 3.4, color: '#c8b070' };
    }
  },

  // the cast iron goes, and the system takes what the building was sending it
  breakCover() {
    const P = G.player;
    this.coverBroken = true; this.coverT = 1;
    this.fell = true; this.phase = 'drop'; this.t = 0; this.fall = 60;
    P.frozen = true; P.invuln = 999; P.vx = 0; P.vy = 60;
    P.x = this.MANHOLE; P.y = World.floorY(this.MANHOLE) - 4 * P.vis;
    G.whiteFlash(0.35); G.shake(14); G.slowmo(0.4, 0.8);
    SFX.breach && SFX.breach(); SFX.splinter && SFX.splinter(0);
    for (let i = 0; i < 40; i++) G.fx.add({ type: 'splinter', x: this.MANHOLE + rand(-26, 26), y: P.y, vx: rand(-200, 200), vy: rand(-220, -30), s: 1, w: randi(2, 4), color: choice(['#8a8578', '#c8c0a8', '#4a463d']), rot: rand(TAU), vr: rand(-12, 12), life: rand(1.6, 3) });
    G.fx.cloud && G.fx.cloud(this.MANHOLE, P.y - 10, 34, '#6a6a60', 2.2);
    G.banner = { text: 'DOWN', sub: 'INTO THE SYSTEM', t: 2, max: 2, color: '#c8b070' };
  },

  // the other ending: you walked the length of the building to the next truck
  caught() {
    const P = G.player;
    this.phase = 'caught'; this.t = 0; this.caughtT = 0; this.caughtX = P.x;
    P.frozen = true; P.invuln = 999; P.vx = 0; P.vy = 0;
    G.shake(8); SFX.warning && SFX.warning();
    G.banner = { text: 'RECAPTURED', sub: 'TRANSFER ORDER 11 COMPLETE', t: 5, max: 5, color: '#ff8c40' };
    // two handlers step in from the dock and take hold
    for (const ox of [28, 48]) {
      const h = new LandAnimal(this.DOCK + ox, 'worker');
      h.facing = -1; h.state = 'idle'; h.stateT = 999; h.watching = false; h.panicked = false;
      h.y = World.floorY(h.x) - h.groundOff; G.add(h); this.crew.push(h);
    }
  },

  // held, lifted, crated, and the run is over
  caughtHold(dt) {
    const P = G.player;
    this.caughtT += dt;
    P.frozen = true;
    // a handler that has hold of you will carry you off down the pipe if its
    // own routine is left running, so the animal is pinned where it was taken
    P.x = this.caughtX;
    if (P.grabbed && P.grabbed.release) P.grabbed.release();
    P.grabbed = false; P.haulT = 0; P.haulBy = null; P.netT = 0;
    // The handlers are not wildlife and they are not running: they do this for
    // a living. Their own AI is overridden every frame or it panics them east
    // into the pipe, which is a funny thing to watch exactly once.
    const hands = this.crew.filter(w => !w.remove && w.x > this.DOCK - 200);
    hands.forEach((w, i) => {
      const off = (i === 0 ? 1 : -1) * (20 + 4 * i);
      w.x = P.x + off; w.y = World.floorY(w.x) - w.groundOff;
      w.vx = 0; w.vy = 0; w.state = 'idle'; w.stateT = 999; w.panicked = false; w.fleeDir = 0; w.carrying = null;
      w.facing = sign(P.x - w.x) || -1;
      w.anim.expr = 'calm'; w.anim.push = clamp((this.caughtT - 0.4) * 2, 0, 1);
      w.anim.speed = 0; w.anim.phase += dt * 2;
    });
    // lifted off the floor, nose up, the way a thing that is being carried goes
    const lift = clamp((this.caughtT - 1.1) / 1.2, 0, 1);
    P.y = World.floorY(P.x) - 4 * P.vis - lift * 46 * P.vis;
    P.angle = lerp(P.angle, -0.5, 1 - Math.exp(-dt * 4));
    P.jaw = 0.4 + Math.sin(this.caughtT * 9) * 0.25;
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, 1.4, false);
    if (chance(dt * 6)) G.fx.add({ type: 'drop', x: P.x + rand(-8, 8), y: P.y, vx: rand(-30, 30), vy: rand(-40, 20), s: 1, color: '#8ce8a0', life: 0.9 });
    if (this.caughtT > 3.4 && !P.dead) {
      P.dead = true; P.cause = 'RECAPTURED'; P.hp = 0; this.on = false;
      G.onPlayerDeath('RECAPTURED', null);
    }
  },

  // Straight down the shaft under the drain, turning as you go, until the head
  // of the pipe comes up to meet you.
  drop(dt) {
    const P = G.player;
    // a frozen animal has its velocity cleared for it every frame, so the fall
    // is carried here and handed back for the camera to lead on
    P.frozen = true;
    this.fall += 1150 * dt; P.y += this.fall * dt;
    P.x = approach(P.x, this.DRAIN, dt * 330);
    P.vx = 0; P.vy = this.fall;
    P.angle = lerp(P.angle, 1.05, 1 - Math.exp(-dt * 3.2));
    P.facing = 1; P.jaw = 0.35;
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, 1.2, false);
    if (chance(dt * 20)) G.fx.add({ type: 'drop', x: P.x + rand(-10, 10), y: P.y - rand(0, 40), vx: rand(-14, 14), vy: rand(120, 240), s: 1, color: '#9ad8c0', life: 1 });
    G.fx.glow && G.fx.glow(P.x, P.y, 14 * P.vis, '#a8e0c8', 0.12);
    // The building's own floor is still under you for the first half of this,
    // and it is not a landing: the shaft rakes east under the dock and only
    // the head of the interceptor counts as ground.
    const gy = World.floorY(P.x) - 4 * P.vis;
    if ((P.x >= this.DRAIN - 10 && P.y >= gy) || this.t > 2.4) {
      P.x = Math.max(P.x, this.DRAIN - 10);
      this.startSlide();
    }
  },

  startSlide() {
    const P = G.player;
    this.phase = 'slide'; this.t = 0; this.rideT = 0; this.slideV = 80; this.air = 0;
    P.y = World.floorY(P.x) - 4 * P.vis; P.vy = 0; this.fall = 0;
    G.shake(7); SFX.thud && SFX.thud(0); SFX.splash && SFX.splash(1.2);
    G.fx.splash && G.fx.splash(P.x, 1.2, 0);
    G.banner = { text: 'THE INTERCEPTOR', sub: 'IT ONLY GOES ONE WAY', t: 3.4, max: 3.4, color: '#7fd8c0' };
  },

  // Twenty seconds of lined pipe. The floor is real map, the physics are the
  // game's, and the only thing the script does is hold you facing down it and
  // keep a hand on the throttle so the ride reads.
  slide(dt) {
    const P = G.player;
    this.rideT += dt;
    P.frozen = true;
    const fy = World.floorY(P.x), slope = (World.floorY(P.x + 26) - fy) / 26;
    // steep pipe, faster ride; the benches at the foot of each step slow you
    const steer = Input.axis()[0];
    const target = clamp(78 + Math.max(0, slope) * 150 + steer * 34, 54, 210);
    this.slideV = approach(this.slideV, target, dt * (slope > 0.3 ? 140 : 50));
    P.x += this.slideV * dt;
    P.vx = this.slideV;                       // so the camera leads down the pipe
    // gravity does the rest: where the floor falls away faster than you do, you
    // leave it, and you come down again on the bench at the bottom of the step
    this.fall += 1150 * dt; P.y += this.fall * dt; P.vy = this.fall;
    const gy = World.floorY(P.x) - 4 * P.vis;
    if (P.y >= gy) {
      if (this.air > 0.18 && this.fall > 150) {
        G.shake(Math.min(8, this.fall / 50)); SFX.thud && SFX.thud(0);
        for (let i = 0; i < 10; i++) G.fx.add({ type: 'drop', x: P.x + rand(-8, 8), y: gy, vx: rand(-70, 70), vy: rand(-120, -20), s: 1, color: '#9ad8c0', life: 0.7 });
      }
      P.y = gy; this.fall = 0; P.vy = 0; this.air = 0;
    } else this.air += dt;
    // nose down the pipe, and up a little while airborne
    const aim = Math.atan2(slope, 1) * (this.air > 0.12 ? 0.45 : 1) + (this.air > 0.12 ? 0.18 : 0);
    P.angle = lerp(P.angle, aim, 1 - Math.exp(-dt * 9));
    P.facing = 1; P.jaw = 0.2 + Math.abs(Math.sin(this.rideT * 5)) * 0.2;
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, 0.5 + this.slideV / 160, false);
    // the wash you are riding on, and the grit coming off the invert
    if (this.air <= 0.02) {
      if (chance(dt * 34)) G.fx.add({ type: 'drop', x: P.x - rand(0, 14), y: gy - rand(0, 5), vx: -this.slideV * rand(0.2, 0.5), vy: rand(-90, -20), s: 1, color: choice(['#9ad8c0', '#cfe8dc', '#7fb8a0']), life: rand(0.5, 1) });
      if (chance(dt * 8)) G.fx.smoke && G.fx.smoke(P.x - 10, gy - 2, 1, '#5a6a60');
    }
    if (chance(dt * 2.2)) SFX.clank && SFX.clank(rand(-0.5, 0.5));
    // a wet animal in a dark pipe: keep a highlight on it or it is a smudge
    G.fx.glow && G.fx.glow(P.x, P.y, 13 * P.vis, '#a8e0c8', 0.10);
    if (P.x > this.MOUTH) this.launchOut();
  },

  launchOut() {
    const P = G.player;
    this.phase = 'launch'; this.t = 0;
    P.frozen = false; P.invuln = 4;
    P.vx = this.slideV * 1.15; P.vy = -30; this.fall = 0;
    G.slowmo(0.45, 0.7); G.shake(6);
    G.banner = { text: 'OUT', sub: '', t: 1.2, max: 1.2, color: '#c8b070' };
    for (let i = 0; i < 30; i++) G.fx.add({ type: 'drop', x: P.x + rand(-10, 6), y: P.y + rand(-8, 6), vx: rand(40, 220), vy: rand(-90, 60), s: 1, color: choice(['#9ad8c0', '#cfe8dc']), life: rand(0.8, 1.8) });
  },

  launch(dt) {
    const P = G.player;
    if (!this.splashed && P.inWater) {
      this.splashed = true; this.phase = 'done'; this.on = false;
      G.shake(10); G.fx.splash && G.fx.splash(P.x, 2.6, 0); Water.splash && Water.splash(P.x, 200, 50); SFX.splash && SFX.splash(2.5);
      G.banner = { text: 'UNDER ROME', sub: 'THE MAPS STOP HERE. FIND THE WAY OUT.', t: 4.5, max: 4.5, color: '#c8b070' };
      P.invuln = 2;
    }
    // a bad bounce off the lip: if it has not found water in four seconds, it
    // is on the cistern floor somewhere, and the run starts anyway
    if (this.t > 4 && !this.splashed) { this.splashed = true; this.phase = 'done'; this.on = false; G.banner = { text: 'UNDER ROME', sub: 'THE MAPS STOP HERE. FIND THE WAY OUT.', t: 4.5, max: 4.5, color: '#c8b070' }; }
  },

  breach() {
    const P = G.player, c = this.cart;
    this.phase = 'loose'; this.t = 0; this.hintT = 0;
    c.broken = true; c.cracks = 1; P.inTank = null; P.frozen = false; P.invuln = 2.5;
    P.y = c.y - 6 * P.vis; P.vx = 90; P.vy = -60;
    G.whiteFlash(0.6); G.shake(16); G.slowmo(0.3, 0.9); SFX.hatch && SFX.hatch(); SFX.splinter && SFX.splinter(0);
    for (let i = 0; i < 70; i++) { const a = rand(-Math.PI, 0.6), sp = rand(60, 280); G.fx.add({ type: 'splinter', x: c.x + rand(-24, 24), y: c.y - 44 + rand(-30, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 1, w: randi(2, 5), color: choice(['#cfeef4', '#9fc4cc', '#e8f4f8', '#7fa8b0']), rot: rand(TAU), vr: rand(-10, 10), life: rand(3, 6) }); }
    for (let i = 0; i < 40; i++) G.fx.add({ type: 'drop', x: c.x + rand(-30, 30), y: c.y - 40 + rand(-20, 10), vx: rand(-180, 180), vy: rand(-40, 140), s: randi(1, 2), color: choice(['#8ce8a0', '#3f9a54', '#cfeef4']), life: 2.4 });
    G.fx.cloud && G.fx.cloud(c.x, c.y - 30, 46, '#3f9a54', 3);
    // the two of them let go and run west, arms up, and do not look back
    for (const w of this.crew) { w.pushing = null; w.anim.push = 0; w.panicked = true; w.state = 'flee'; w.stateT = 40; w.fleeDir = -1; w.anim.expr = 'scared'; SFX.scream && SFX.scream(w.pan); }
    G.banner = { text: 'BREACH', sub: 'THERE IS A COVER IN THE FLOOR EAST OF HERE', t: 3.8, max: 3.8, color: '#ff8c40' };
  },

  // the one prompt the opening has, the state of the glass, and how far down
  // the pipe has taken you
  draw(ctx) {
    if (!this.on) return;
    const W = G.W, H = G.H;
    if (this.phase === 'carry' && this.t > 1.0) {
      const k = Math.floor(G.t * 3) % 2;
      Font.draw(ctx, 'MASH BITE', W / 2, H - 58, { color: k ? '#ffffff' : '#ffd060', align: 'center', scale: 2, outline: '#0a1a08' });
      ctx.fillStyle = '#1a1210'; ctx.fillRect(W / 2 - 41, H - 42, 82, 6);
      ctx.fillStyle = '#cfeef4'; ctx.fillRect(W / 2 - 40, H - 41, Math.round(80 * (1 - this.taps / this.need)), 4);
      Font.draw(ctx, 'GLASS', W / 2, H - 33, { color: '#6f8f88', align: 'center' });
      return;
    }
    if (this.phase === 'loose' && !this.coverBroken) {
      const P = G.player, near = Math.abs(P.x - this.MANHOLE) < 26 && P.onLand;
      if (near) {
        const k = Math.floor(G.t * 3) % 2;
        Font.draw(ctx, 'BITE THE COVER', W / 2, H - 58, { color: k ? '#ffffff' : '#ffd060', align: 'center', scale: 2, outline: '#0a1a08' });
        ctx.fillStyle = '#1a1210'; ctx.fillRect(W / 2 - 41, H - 42, 82, 6);
        ctx.fillStyle = '#c8c0a8'; ctx.fillRect(W / 2 - 40, H - 41, Math.round(80 * (1 - this.coverT)), 4);
        Font.draw(ctx, 'CAST IRON', W / 2, H - 33, { color: '#6f8f88', align: 'center' });
      } else if (P.x > this.MANHOLE + 20) {
        Font.draw(ctx, 'THE DOCK IS THAT WAY', W / 2, 30, { color: '#ff8c40', align: 'center', outline: '#1a0a06' });
      }
      return;
    }
    if (this.phase === 'caught') {
      Font.draw(ctx, 'TRANSFER ORDER 11 COMPLETE', W / 2, H - 44, { color: '#ff8c40', align: 'center', outline: '#1a0a06' });
      return;
    }
    if (this.phase === 'slide') {
      // a depth gauge: how much pipe is left under you
      const P = G.player, u = clamp((P.x - this.DRAIN) / (this.MOUTH - this.DRAIN), 0, 1);
      ctx.fillStyle = 'rgba(6,14,14,0.6)'; ctx.fillRect(W - 18, 40, 8, 120);
      ctx.fillStyle = '#2a3a34'; ctx.fillRect(W - 17, 41, 6, 118);
      ctx.fillStyle = '#7fd8c0'; ctx.fillRect(W - 17, 41, 6, Math.round(118 * u));
      ctx.fillStyle = '#cfe8dc'; ctx.fillRect(W - 19, Math.round(41 + 118 * u) - 1, 10, 2);
      Font.draw(ctx, Math.round((1 - u) * 140) + 'FT', W - 14, 166, { color: '#7fd8c0', align: 'center' });
      if (this.rideT < 3.2 && Math.floor(G.t * 3) % 2) Font.draw(ctx, 'HOLD RIGHT TO GO FASTER', W / 2, H - 40, { color: '#cfe8dc', align: 'center', outline: '#0a1a08' });
    }
  },
};
