'use strict';
// ---------------------------------------------------------------------------
// LOCKED IN.
//
// A sewer run is not a stretch of water you swim along and leave when you have
// had enough. It is a system with a door at each end, and both doors are shut
// before you get there.
//
// You are put down inside the reach. The tunnel is barred east and west by
// sluice gates you cannot bite through, cannot climb and cannot squeeze past.
// Somewhere in between, in a vault or a sump or behind something that wants to
// eat you, is the site's relic — and the relic is the key. Carry it and the
// hydraulics start; swim out through an open gate and the run ends the way it
// is supposed to end, which is the only way out of here that is not a stomach.
// ---------------------------------------------------------------------------
const Labyrinth = {
  on: false, gates: [], x0: 0, x1: 0, done: false, nagT: 0,

  reset() { this.on = false; this.gates = []; this.done = false; this.nagT = 0; },

  // Called when a run begins. Only the sewer network is a labyrinth: the
  // swamp and the ocean you can leave whenever you like.
  begin(stage) {
    this.reset();
    if (!stage || stage.zone !== 'sewer') return;
    const span = 1500 + (stage.diff || 0) * 380;
    this.x0 = stage.x - span; this.x1 = stage.x + span;
    // put each gate on a stretch with a roof, so it reads as a door in a
    // tunnel and not a fence standing in open water
    const place = wx => {
      const gx = World.findX(wx, xx => World.roofY(xx) !== null && World.floorY(xx) > 30, 700, 30);
      if (gx === null) return null;
      const g = new Structure(gx, 'sluice'); G.add(g); this.gates.push(g); return g;
    };
    const a = place(this.x0), b = place(this.x1);
    if (!a && !b) return;
    this.on = true;
    G.banner = { text: 'THE GATES ARE DOWN', sub: 'FIND THE KEY', t: 4, max: 4, color: '#ff8c40' };
  },

  // you are holding the site's relic
  keyed() {
    if (!this.on) return true;
    const st = G.stage; if (!st) return false;
    const art = ARTIFACTS.find(a => a.stage === st.id);
    return !!(art && Missions.has(art.id));
  },

  // a closed gate is a wall. Push the animal back off it rather than letting
  // it tunnel through, and let it know what it just hit.
  clamp(P) {
    if (!this.on || this.done || !P || P.dead) return;
    for (const g of this.gates) {
      if (g.remove || g.open > 0.55) continue;
      const d = P.x - g.x;
      const pad = 12 + 5 * P.vis;
      if (Math.abs(d) > pad) continue;
      const side = d >= 0 ? 1 : -1;
      P.x = g.x + side * pad;
      if (P.vx * side < 0) { P.vx *= -0.25; if (Math.abs(P.vx) > 40) { G.shake(3); SFX.thud && SFX.thud(0); } }
      if (this.nagT <= 0) {
        this.nagT = 6;
        G.banner = { text: 'SHUT', sub: this.keyed() ? 'IT IS COMING UP' : 'THE KEY IS STILL IN HERE', t: 2.2, max: 2.2, color: '#ff8c40' };
      }
    }
  },

  update(dt) { if (this.nagT > 0) this.nagT -= dt; },

  // out through an open gate: the run ends, and it ends well
  escaped() {
    if (!this.on || this.done) return;
    this.done = true;
    const P = G.player;
    G.addScore(12000);
    G.banner = { text: 'OUT', sub: 'THE SYSTEM DID NOT KEEP YOU', t: 4, max: 4, color: '#3fd0a8' };
    SFX.levelup && SFX.levelup(); G.whiteFlash(0.5); G.slowmo(0.3, 1.2);
    if (P && !P.dead) P.die('ESCAPED');
  },

  // a marker on the HUD edge pointing at the nearest gate, so the reach always
  // has a shape even when you cannot see either end of it
  draw(ctx) {
    if (!this.on || this.done) return;
    const P = G.player; if (!P || P.dead) return;
    const keyed = this.keyed();
    let best = null, bd = 1e9;
    for (const g of this.gates) { if (g.remove) continue; const d = Math.abs(g.x - P.x); if (d < bd) { bd = d; best = g; } }
    if (!best) return;
    const [sx] = G.cam.toScreen(best.x, best.y);
    const y = 78, col = keyed ? '#3fd0a8' : '#ff8c40';
    if (sx > 12 && sx < G.W - 12) return;                       // it is on screen; you can see it
    const x = sx <= 12 ? 10 : G.W - 10, dir = sx <= 12 ? -1 : 1;
    ctx.fillStyle = 'rgba(6,14,14,0.7)'; ctx.fillRect(x - 8, y - 7, 16, 14);
    ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x + dir * (3 - i)), y - i, 2, 1), ctx.fillRect(Math.round(x + dir * (3 - i)), y + i, 2, 1);
    Font.draw(ctx, Math.round(bd / 10) + 'M', x, y + 9, { color: col, align: 'center' });
  },
};
