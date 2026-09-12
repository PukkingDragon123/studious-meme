'use strict';
// ---------------------------------------------------------------------------
// LOCKED IN. FOR GOOD.
//
// A sewer run is not a stretch of water you swim along and leave when you have
// had enough. It is a system, and the system was not built with you leaving in
// mind. They tipped you in through a disposal hatch; a hatch only goes one way.
//
// The reach is barred east and west by sluice gates. They are welded, not shut:
// there is no key, no relic, no hydraulics that will ever start. You can bite
// them, ram them, sit against them and wait. They do not move. What is in here
// is everything there is — the food, the filth, the things that grew up in it,
// and you. The only way out of the system is a stomach, and it does not have
// to be yours.
// ---------------------------------------------------------------------------
const Labyrinth = {
  on: false, gates: [], x0: 0, x1: 0, done: false, nagT: 0, tries: 0,

  reset() { this.on = false; this.gates = []; this.done = false; this.nagT = 0; this.tries = 0; },

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
    G.banner = { text: 'THE GATES ARE WELDED', sub: 'THERE IS NO KEY', t: 4, max: 4, color: '#ff8c40' };
  },

  // Nothing keys these. The relic is worth taking for what it does to you, not
  // for any door it opens — there is no door.
  keyed() { return false; },

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
        this.nagT = 6; this.tries++;
        const subs = ['IT DOES NOT OPEN', 'IT HAS NEVER OPENED', 'STOP', 'THE SYSTEM KEEPS WHAT IT IS GIVEN'];
        G.banner = { text: 'WELDED', sub: subs[Math.min(this.tries - 1, subs.length - 1)], t: 2.2, max: 2.2, color: '#ff8c40' };
      }
    }
  },

  update(dt) { if (this.nagT > 0) this.nagT -= dt; },

  // a marker on the HUD edge pointing at the nearest wall of the world, so the
  // reach always has a shape even when you cannot see either end of it
  draw(ctx) {
    if (!this.on || this.done) return;
    const P = G.player; if (!P || P.dead) return;
    let best = null, bd = 1e9;
    for (const g of this.gates) { if (g.remove) continue; const d = Math.abs(g.x - P.x); if (d < bd) { bd = d; best = g; } }
    if (!best) return;
    const [sx] = G.cam.toScreen(best.x, best.y);
    const y = 78, col = '#ff8c40';
    if (sx > 12 && sx < G.W - 12) return;                       // it is on screen; you can see it
    const x = sx <= 12 ? 10 : G.W - 10, dir = sx <= 12 ? -1 : 1;
    ctx.fillStyle = 'rgba(6,14,14,0.7)'; ctx.fillRect(x - 8, y - 7, 16, 14);
    ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x + dir * (3 - i)), y - i, 2, 1), ctx.fillRect(Math.round(x + dir * (3 - i)), y + i, 2, 1);
    Font.draw(ctx, Math.round(bd / 10) + 'M', x, y + 9, { color: col, align: 'center' });
  },
};
