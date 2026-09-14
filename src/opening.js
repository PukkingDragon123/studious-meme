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
// river, through a headwall in the side of a gorge. The ride down takes about twenty seconds. It is drawn
// with the same world, the same physics and the same camera as everything
// else, because it is the same world.
// ---------------------------------------------------------------------------
const Opening = {
  // the cover you have to break, the line the handlers own, the head of the
  // interceptor under the building, and the mouth it lets out of
  LIP: -5968, DRAIN: -5950, MOUTH: -2996,
  // where the game picks you up again: the brick staging in the intake,
  // which is the only dry thing in the room
  WAKE: -5025,
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
    else if (this.phase === 'black') this.black(dt);
    else if (this.phase === 'wake') this.wake(dt);
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

  // ---- THE DROP --------------------------------------------------------
  // Eleven stone of cast iron gives way and the floor is not under you any
  // more. What follows is not a ride down a pipe. It is a hundred and forty
  // feet of brick shaft in the dark, and nothing the length of a hand stays
  // awake through it.
  drop(dt) {
    const P = G.player;
    P.frozen = true;
    this.fall += 1250 * dt; P.y += this.fall * dt;
    P.x = approach(P.x, this.DRAIN, dt * 300);
    P.vx = 0; P.vy = this.fall;
    P.angle = lerp(P.angle, 1.15, 1 - Math.exp(-dt * 3.6));
    P.facing = 1; P.jaw = 0.5;
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, 1.4, false);
    // brick dust and cover fragments going past upward, because you are not
    if (chance(dt * 26)) G.fx.add({ type: 'splinter', x: P.x + rand(-18, 18), y: P.y - rand(10, 90), vx: rand(-40, 40), vy: rand(-320, -140), s: 1, w: randi(1, 3), color: choice(['#6a6252', '#3e3a32', '#8a8578']), rot: rand(TAU), vr: rand(-10, 10), life: 1.2 });
    G.fx.glow && G.fx.glow(P.x, P.y, 14 * P.vis, '#a8e0c8', 0.10);
    if (this.t > 1.15) this.blackOut();
  },

  // ---- THE BLACKOUT ----------------------------------------------------
  // The screen goes out. The game moves you a hundred and forty feet and
  // three quarters of a mile while it is out, and you do not get to see it,
  // because neither did the animal.
  blackOut() {
    const P = G.player;
    this.phase = 'black'; this.t = 0; this.fall = 0;
    P.frozen = true; P.vx = 0; P.vy = 0; P.invuln = 14;
    G.shake(13); SFX.thud && SFX.thud(0);
    this.land();
    G.banner = null; G.dispatch = null;
  },
  // put the animal on the bench on level one, with the camera already on it
  land() {
    const P = G.player;
    P.x = this.WAKE; P.y = World.floorY(this.WAKE) - 4 * P.vis;
    P.angle = 0.12; P.vx = 0; P.vy = 0;
    P.chain.reset(P.x, P.y, 0);
    G.cam.x = P.x; G.cam.y = P.y - 16;
  },
  black(dt) {
    const P = G.player;
    P.frozen = true; P.vx = 0; P.vy = 0;
    P.y = World.floorY(P.x) - 4 * P.vis;
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, 0.08, false);
    G.cam.x = P.x; G.cam.y = P.y - 16;
    if (this.t > 3.2) { this.phase = 'wake'; this.t = 0; SFX.splash && SFX.splash(0.5); }
  },
  // Coming round. The eye opens twice before it stays open, and the first
  // thing in it is a shaft of daylight a hundred and forty feet up.
  wake(dt) {
    const P = G.player;
    P.frozen = true;
    P.y = World.floorY(P.x) - 4 * P.vis;
    P.angle = lerp(P.angle, 0, 1 - Math.exp(-dt * 2.2));
    P.jaw = Math.max(0, 0.45 - this.t * 0.22);
    P.facing = 1;
    P.chain.solve(P.x, P.y, P.angle, P.vis, dt, 0.22 + Math.max(0, 1 - this.t) * 0.5, false);
    G.cam.x = lerp(G.cam.x, P.x + 30, 1 - Math.exp(-dt * 1.4));
    G.cam.y = lerp(G.cam.y, P.y - 24, 1 - Math.exp(-dt * 1.4));
    if (chance(dt * 3)) G.fx.add({ type: 'drop', x: P.x + rand(-20, 20), y: World.floorY(P.x) - 60, vx: 0, vy: 90, s: 1, color: '#9ad8c0', life: 1.1 });
    if (this.t > 3.6) {
      this.phase = 'done'; this.on = false; this.splashed = true;
      P.frozen = false; P.invuln = 3;
      G.banner = { text: 'THE INTAKE', sub: 'ALIVE, AND A HUNDRED AND FORTY FEET DOWN. EAT.', t: 4.5, max: 4.5, color: '#9fe0c8' };
    }
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
    // ---- the shaft closing over, the dark, and the eye opening again -----
    if (this.phase === 'drop') {
      // the light of the access chamber going up and away from you
      const u = clamp(this.t / 1.15, 0, 1);
      ctx.fillStyle = 'rgba(3,5,6,' + (u * u * 0.94).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
      return;
    }
    if (this.phase === 'black') {
      ctx.fillStyle = '#030506'; ctx.fillRect(0, 0, W, H);
      // a pulse, because something down there is still working
      const b = 0.10 + 0.09 * Math.max(0, Math.sin(this.t * 3.4));
      const g = ctx.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W * 0.42);
      g.addColorStop(0, 'rgba(120,30,30,' + b.toFixed(3) + ')'); g.addColorStop(1, 'rgba(120,30,30,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (this.t > 1.5) {
        const a = Math.min(1, (this.t - 1.5) / 0.9) * (Math.floor(G.t * 1.6) % 2 ? 0.85 : 0.5);
        Font.draw(ctx, 'SOME TIME LATER', W / 2, H / 2 - 6, { color: 'rgba(150,176,172,' + a.toFixed(2) + ')', align: 'center' });
      }
      return;
    }
    if (this.phase === 'wake') {
      // two blinks and then it stays open: the lids come in from top and
      // bottom and the gap between them is the only thing you can see through
      const u = clamp(this.t / 3.6, 0, 1);
      let open = clamp(u * 2.4, 0, 1);
      if (this.t < 0.5) open = this.t / 0.5 * 0.45;
      else if (this.t < 0.85) open = 0.45 - (this.t - 0.5) / 0.35 * 0.42;
      else if (this.t < 1.6) open = 0.03 + (this.t - 0.85) / 0.75 * 0.72;
      else if (this.t < 1.85) open = 0.75 - (this.t - 1.6) / 0.25 * 0.35;
      else open = Math.min(1, 0.4 + (this.t - 1.85) / 1.1 * 0.6);
      const lid = Math.round((H / 2) * (1 - open));
      if (lid > 0) {
        ctx.fillStyle = '#030506';
        ctx.fillRect(0, 0, W, lid); ctx.fillRect(0, H - lid, W, lid);
        ctx.fillStyle = 'rgba(30,44,44,0.9)';
        ctx.fillRect(0, lid, W, 2); ctx.fillRect(0, H - lid - 2, W, 2);
      }
      // whatever is left of the dark, and the swimming that goes with it
      ctx.fillStyle = 'rgba(3,5,6,' + ((1 - open) * 0.55).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
      const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.16, W / 2, H / 2, W * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,6,8,' + (0.7 - open * 0.4).toFixed(2) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      if (this.t > 2.2 && Math.floor(G.t * 2) % 2) Font.draw(ctx, 'THE SYSTEM', W / 2, 30, { color: 'rgba(159,224,200,0.8)', align: 'center', outline: '#04100c' });
      return;
    }
  },
};
