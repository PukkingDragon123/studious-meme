'use strict';
// ---------------------------------------------------------------------------
// THE ARENA.
//
// A boss that turns up in open water is an encounter you can swim away from,
// which means it is an encounter you never learn. So every lair is a room now.
// Walk into the middle of one and two walls of fog come down across the water,
// one either side, and they stay down until one of you is dead.
//
// While they are down the shot changes: the name goes up in the middle of the
// screen, the bar under it is the only thing on the HUD that matters, and the
// water between the gates is the whole world. Kill it and the fog lifts with a
// line of gold across the screen. Die and it lifts anyway, and the thing is
// still in there waiting the next time you come.
// ---------------------------------------------------------------------------
const Arena = {
  on: false, x: 0, r: 0, t: 0, openT: 0, closeT: 0, lair: null, name: '', wonT: 0,

  reset() { this.on = false; this.lair = null; this.t = 0; this.openT = 0; this.closeT = 0; this.wonT = 0; },

  // shut the gates around a lair
  begin(L, boss) {
    this.on = true; this.lair = L; this.x = L.x; this.r = Math.max(210, L.r);
    this.name = (boss && boss.name) || L.name; this.t = 0; this.closeT = 1.1; this.openT = 0; this.wonT = 0;
    G.shake(9); SFX.growl && SFX.growl(0);
    G.banner = { text: this.name, sub: 'NO WAY PAST', t: 3, max: 3, color: '#ff8c40' };
  },

  // the fight is over, whoever won it
  end(won) {
    if (!this.on) return;
    this.on = false; this.openT = 1.3; this.wonT = won ? 3.2 : 0;
    if (won) { G.shake(6); G.slowmo(0.4, 0.8); }
  },

  update(dt) {
    if (this.openT > 0) this.openT -= dt;
    if (this.wonT > 0) this.wonT -= dt;
    if (!this.on) return;
    this.t += dt;
    if (this.closeT > 0) this.closeT -= dt;
    const P = G.player;
    if (!P || P.dead) { this.end(false); return; }
    // the boss got away, or was never there
    if (!G.boss || G.boss.dead) { this.end(!!(G.boss && G.boss.dead)); return; }
    // the gates: you can put your nose in them and nothing more
    const half = this.r;
    for (const side of [-1, 1]) {
      const gx = this.x + side * half;
      const d = (P.x - gx) * side;
      if (d > -6) {
        P.x = gx - side * 6;
        if (P.vx * side > 0) P.vx *= -0.35;
        if (chance(dt * 24)) G.fx.add({ type: 'smoke', x: gx, y: P.y + rand(-20, 20), vx: -side * rand(10, 40), vy: rand(-20, 6), s: rand(3, 8), color: '#cfd8e0', life: rand(0.6, 1.4) });
        if (this.nagT === undefined || this.nagT <= 0) { this.nagT = 3; G.fx.text(P.x, P.y - 24 * P.vis, 'NO WAY PAST', { color: '#ffd060' }); }
      }
    }
    if (this.nagT > 0) this.nagT -= dt;
    // fog boiling off both gates, all the time, so you never forget they are there
    if (chance(dt * 18)) {
      const side = chance(0.5) ? 1 : -1, gx = this.x + side * half;
      const sy = rand(World.surface(gx) - 20, World.floorY(gx));
      G.fx.add({ type: 'smoke', x: gx + rand(-5, 5), y: sy, vx: rand(-8, 8), vy: rand(-26, -4), s: rand(4, 11), color: chance(0.5) ? '#d8e2ea' : '#aebcc8', life: rand(1.2, 2.6) });
    }
  },

  // the wall itself, drawn in world space so it sits in the water properly
  drawWorld(ctx) {
    if (!this.on && this.openT <= 0) return;
    const cam = G.cam, z = cam.zoom, H = G.H;
    const k = this.on ? clamp(1 - this.closeT / 1.1, 0, 1) : clamp(this.openT / 1.3, 0, 1);
    if (k <= 0.01) return;
    for (const side of [-1, 1]) {
      const gx = this.x + side * this.r;
      const [sx] = cam.toScreen(gx, 0);
      if (sx < -90 || sx > G.W + 90) continue;
      const w = 26 * z * k;
      // the body of it: a curtain with a lit edge, breathing
      const g = ctx.createLinearGradient(sx - w, 0, sx + w, 0);
      g.addColorStop(0, 'rgba(150,170,190,0)');
      g.addColorStop(0.35, 'rgba(198,214,226,' + (0.30 * k).toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(236,244,250,' + (0.52 * k).toFixed(3) + ')');
      g.addColorStop(0.65, 'rgba(198,214,226,' + (0.30 * k).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(150,170,190,0)');
      ctx.fillStyle = g; ctx.fillRect(Math.round(sx - w), 0, Math.round(w * 2), H);
      // bands drifting up it
      ctx.globalAlpha = 0.30 * k;
      for (let i = 0; i < 9; i++) {
        const u = ((this.t * 0.16 + i / 9) % 1);
        const yy = H - u * (H + 40);
        const ww = w * (0.55 + 0.5 * Math.sin(u * 7 + i));
        ctx.fillStyle = i % 2 ? '#eef6fb' : '#b8c8d6';
        ctx.fillRect(Math.round(sx - ww), Math.round(yy), Math.round(ww * 2), Math.max(1, Math.round(5 * z)));
      }
      ctx.globalAlpha = 1;
      // the hard line down the middle, which is the bit that says "no"
      ctx.fillStyle = 'rgba(248,252,255,' + (0.55 * k).toFixed(3) + ')';
      ctx.fillRect(Math.round(sx - 1 * z), 0, Math.max(1, Math.round(2 * z)), H);
    }
  },

  // and the frame round the fight, in screen space
  draw(ctx) {
    const W = G.W, H = G.H;
    if (this.wonT > 0) {
      const u = clamp(this.wonT / 3.2, 0, 1), a = u > 0.85 ? (1 - u) / 0.15 : u / 0.85;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(10,8,4,0.5)'; ctx.fillRect(0, H / 2 - 26, W, 52);
      ctx.fillStyle = '#c8a24a'; ctx.fillRect(0, H / 2 - 26, W, 1); ctx.fillRect(0, H / 2 + 25, W, 1);
      Font.draw(ctx, 'TERRITORY TAKEN', W / 2, H / 2 - 10, { color: '#ffe8a0', align: 'center', scale: 2, outline: '#2a1c06' });
      Font.draw(ctx, this.name, W / 2, H / 2 + 10, { color: '#c8a24a', align: 'center' });
      ctx.globalAlpha = 1;
    }
    if (!this.on) return;
    // the arena is a room, so it gets a room's letterbox
    const k = clamp(1 - this.closeT / 1.1, 0, 1), bar = Math.round(12 * k);
    ctx.fillStyle = 'rgba(4,6,8,0.85)';
    ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    ctx.fillStyle = 'rgba(200,162,74,0.5)';
    ctx.fillRect(0, bar, W, 1); ctx.fillRect(0, H - bar - 1, W, 1);
    // which way the thing is, if it is off the side of the shot
    const b = G.boss;
    if (b && !b.dead) {
      const [bx] = G.cam.toScreen(b.x, b.y);
      if (bx < 0 || bx > W) { const d = bx < 0 ? -1 : 1; Font.draw(ctx, d < 0 ? '<' : '>', d < 0 ? 8 : W - 8, H / 2 - 4, { color: '#ff6060', align: 'center', scale: 3, shadow: true }); }
    }
  },
};
