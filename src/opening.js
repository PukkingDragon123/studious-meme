'use strict';
// ---------------------------------------------------------------------------
// THE TRANSFER.
//
// No cutscene. The opening is the game: a corridor in Facility B two floors
// above the Roman level, a transport tank on a trolley, two people pushing it
// east toward another building, and you inside it. It is all real — the
// corridor is map, the trolley is a structure, the people are people, and the
// camera is the game's camera — which is why you can break it.
//
// Mash bite and the glass cracks, then goes. The two of them run. You are on a
// tiled floor with a drain at the far end of it and nothing under the drain
// but the cistern, two floors down. There is no second act to this: you walk
// east and you fall.
// ---------------------------------------------------------------------------
const Opening = {
  on: false, cart: null, crew: [], phase: null, t: 0, taps: 0, need: 7, prompt: 0, fell: false, splashed: false, stage: null,

  reset() { this.on = false; this.cart = null; this.crew = []; this.phase = null; this.t = 0; this.taps = 0; this.prompt = 0; this.fell = false; this.splashed = false; this.stage = null; },

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

  // the disposal for every other sewer site: no corridor, no chute — a hatch in
  // the crown of the vault opens over the water and you come out of it
  hatch(stage) {
    const P = G.player, x = stage.x;
    const r = World.roofY(x);
    P.y = (r === null ? -80 : r + 14 * P.vis); P.vy = 40; P.vx = 0; P.chain.reset(P.x, P.y, 0);
    P.invuln = 2; G.cam.y = P.y + 40;
    for (let i = 0; i < 24; i++) G.fx.add({ type: 'drop', x: x + rand(-16, 16), y: P.y, vx: rand(-40, 40), vy: rand(20, 120), s: 1, color: '#8ce8a0', life: 1.2 });
    G.shake(6); SFX.clank && SFX.clank(0);
    G.banner = { text: 'DISPOSAL HATCH', sub: 'IN THE SYSTEM. THERE IS NO DOOR ON THE OTHER END.', t: 4, max: 4, color: '#8ab820' };
  },

  update(dt) {
    if (!this.on) return;
    const P = G.player, c = this.cart;
    this.t += dt;
    if (this.phase === 'carry') {
      // the trolley rolls east at a walking pace and stops short of the drain
      const stopX = -3060;
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
    } else if (this.phase === 'loose') {
      // the floor ends at the drain: past it there is nothing but air
      // the two of them run for the west door and are gone through it
      const doorX = this.stage.x - 50;
      for (const w of this.crew) { if (w.remove) continue; w.state = 'flee'; w.stateT = 40; w.fleeDir = -1; w.panicked = true; w.anim.expr = 'scared'; if (w.x < doorX) { w.remove = true; SFX.clank && SFX.clank(-0.6); G.fx.smoke(w.x, w.y, 3, '#8a9aa0'); } }
      if (!this.fell && P.x > -2962 && P.y > -340) {
        this.fell = true; G.banner = { text: 'DOWN', sub: '', t: 1.4, max: 1.4, color: '#c8b070' };
        SFX.breach && SFX.breach(); G.slowmo(0.5, 0.5);
      }
      if (this.fell && !this.splashed && P.inWater) {
        this.splashed = true; this.phase = 'done'; this.on = false;
        G.shake(10); G.fx.splash && G.fx.splash(P.x, 2.6, 0); Water.splash && Water.splash(P.x, 200, 50); SFX.splash && SFX.splash(2.5);
        G.banner = { text: 'UNDER ROME', sub: 'THE MAPS STOP HERE. FIND THE WAY OUT.', t: 4.5, max: 4.5, color: '#c8b070' };
        P.invuln = 2;
      }
    }
  },
  breach() {
    const P = G.player, c = this.cart;
    this.phase = 'loose'; this.t = 0;
    c.broken = true; c.cracks = 1; P.inTank = null; P.frozen = false; P.invuln = 2.5;
    P.y = c.y - 6 * P.vis; P.vx = 90; P.vy = -60;
    G.whiteFlash(0.6); G.shake(16); G.slowmo(0.3, 0.9); SFX.hatch && SFX.hatch(); SFX.splinter && SFX.splinter(0);
    for (let i = 0; i < 70; i++) { const a = rand(-Math.PI, 0.6), sp = rand(60, 280); G.fx.add({ type: 'splinter', x: c.x + rand(-24, 24), y: c.y - 44 + rand(-30, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 1, w: randi(2, 5), color: choice(['#cfeef4', '#9fc4cc', '#e8f4f8', '#7fa8b0']), rot: rand(TAU), vr: rand(-10, 10), life: rand(3, 6) }); }
    for (let i = 0; i < 40; i++) G.fx.add({ type: 'drop', x: c.x + rand(-30, 30), y: c.y - 40 + rand(-20, 10), vx: rand(-180, 180), vy: rand(-40, 140), s: randi(1, 2), color: choice(['#8ce8a0', '#3f9a54', '#cfeef4']), life: 2.4 });
    G.fx.cloud && G.fx.cloud(c.x, c.y - 30, 46, '#3f9a54', 3);
    // the two of them let go and run west, arms up, and do not look back
    for (const w of this.crew) { w.pushing = null; w.anim.push = 0; w.panicked = true; w.state = 'flee'; w.stateT = 40; w.fleeDir = -1; w.anim.expr = 'scared'; SFX.scream && SFX.scream(w.pan); }
    G.banner = { text: 'BREACH', sub: 'THE DRAIN IS EAST', t: 3.4, max: 3.4, color: '#ff8c40' };
  },

  // the one prompt the opening has, and the state of the glass
  draw(ctx) {
    if (!this.on || this.phase !== 'carry' || this.t < 1.0) return;
    const W = G.W, H = G.H, k = Math.floor(G.t * 3) % 2;
    Font.draw(ctx, 'MASH BITE', W / 2, H - 58, { color: k ? '#ffffff' : '#ffd060', align: 'center', scale: 2, outline: '#0a1a08' });
    ctx.fillStyle = '#1a1210'; ctx.fillRect(W / 2 - 41, H - 42, 82, 6);
    ctx.fillStyle = '#cfeef4'; ctx.fillRect(W / 2 - 40, H - 41, Math.round(80 * (1 - this.taps / this.need)), 4);
    Font.draw(ctx, 'GLASS', W / 2, H - 33, { color: '#6f8f88', align: 'center' });
  },
};
