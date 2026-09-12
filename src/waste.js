'use strict';
// ---------------------------------------------------------------------------
// WHAT THEY POUR DOWN HERE.
//
// The system is not just dark water. It is the end of a pipe, and everything
// that went into the top of that pipe is lying in the bottom of it: acid off a
// plating line, raw sludge off the town, and drums nobody signed for, still
// warm, still leaking.
//
// Three pools, three costs. Acid eats you now. Sludge fills your blood with
// filth and drags at you. The drums do neither — they rewrite you. Sit in the
// green long enough and something you did not choose gets grafted on, and it
// is never only a gift.
// ---------------------------------------------------------------------------

// A forced splice: every one of these is a trade. You do not get to decline.
const WASTE_MUTATIONS = [
  {
    id: 'gigantism', short: 'GROW FASTER / STARVE FASTER', name: 'RUNAWAY GROWTH', good: 'Meals grow you 35% more.', bad: 'Hunger drains 30% faster.',
    apply: p => { p.st.growth *= 1.35; p.st.hungerRate *= 1.3; }, look: L => { L.girth = (L.girth || 1) * 1.08; },
  },
  {
    id: 'tumours', short: 'TOUGHER / SLOWER', name: 'TUMOUROUS HIDE', good: '-22% damage taken.', bad: '-12% swim speed.',
    apply: p => { p.st.armor += 0.22; p.st.speed *= 0.88; }, look: L => { L.plates = true; L.spots = '#9ad02a'; },
  },
  {
    id: 'glowblood', short: 'YOU HEAL / YOU GLOW', name: 'GLOWING BLOOD', good: 'Regenerate 2% HP per second.', bad: 'You glow. Everything sees you further off.',
    apply: p => { p.st.regen += 0.02; p.st.stealth *= 1.45; }, look: L => { L.glow = '#a8f030'; },
  },
  {
    id: 'jawsplit', short: 'HARDER BITE / THINNER SKIN', name: 'SPLIT JAW', good: '+30% bite damage.', bad: '-15% max HP.',
    apply: p => { p.st.bite *= 1.3; p.st.hpMul *= 0.85; }, look: L => { L.spikes = Math.max(L.spikes || 0, 1); },
  },
  {
    id: 'gills', short: 'CLEANER BLOOD / USELESS ON LAND', name: 'RAGGED GILLS', good: 'Filth builds 55% slower.', bad: 'On land you can barely drag yourself: -45% land speed.',
    apply: p => { p.st.toxRes *= 1.55; p.st.landSpeed *= 0.55; }, look: L => { L.stripes = true; },
  },
  {
    id: 'twitch', short: 'FASTER / SLOWER TO RECOVER', name: 'SEIZING MUSCLE', good: '+20% speed, +1 dash charge.', bad: 'Stamina recovers 25% slower.',
    apply: p => { p.st.speed *= 1.2; p.st.dashCharges += 1; p.st.dashCd *= 1.25; }, look: L => { L.spots = '#c8f050'; },
  },
  {
    id: 'blind', short: 'PREY COMES TO YOU / YOU NEVER SEE IT COMING', name: 'CLOUDED EYES', good: 'You feel prey through the water instead: small things drift to you.', bad: 'You take 12% more damage from what you never saw.',
    apply: p => { p.st.lure = Math.max(p.st.lure, 150); p.st.armor -= 0.12; }, look: L => { L.eye = '#d8e8c0'; L.pupil = '#a8b890'; },
  },
  {
    id: 'acidskin', short: 'ACID CANNOT TOUCH YOU / NOTHING WILL COME NEAR YOU', name: 'ACID SKIN', good: 'Acid barely touches you. Attackers take damage back.', bad: 'Everything alive avoids you: prey flees 30% sooner.',
    apply: p => { p.st.acidRes = (p.st.acidRes || 1) * 4; p.st.toxicBlood = true; p.st.stealth *= 1.2; }, look: L => { L.glow = '#d0ff40'; },
  },
];
const WASTE_MUT_BY_ID = {}; for (const m of WASTE_MUTATIONS) WASTE_MUT_BY_ID[m.id] = m;

const Waste = {
  SPACING: 560,

  // Pools are a function of the world, not a spawn list: the same stretch of
  // tunnel always holds the same drums, loaded or not.
  poolAt(i) {
    const h = ihash(i, 811);
    if (h > 0.62) return null;                                 // most gaps are clean-ish
    const x = i * this.SPACING + (ihash(i, 907) - 0.5) * 280;
    const B = Biome.at(x);
    if (!B || !B.indoor) return null;                           // the system only
    const k = ihash(i, 131);
    const kind = k < 0.34 ? 'acid' : k < 0.68 ? 'sludge' : 'rads';
    const w = 90 + ihash(i, 433) * (kind === 'rads' ? 120 : 190);
    return { i, x, w, kind, seed: ihash(i, 55) };
  },
  each(x0, x1, fn) {
    const i0 = Math.floor((x0 - 300) / this.SPACING), i1 = Math.ceil((x1 + 300) / this.SPACING);
    for (let i = i0; i <= i1; i++) { const p = this.poolAt(i); if (p) fn(p); }
  },
  // the pool covering a point, if any
  at(x) {
    let out = null;
    this.each(x, x, p => { if (Math.abs(x - p.x) < p.w / 2) out = p; });
    return out;
  },

  // ---- how it looks ------------------------------------------------------
  COL: {
    acid: { a: '#b8e82a', b: '#6f9a10', edge: '#e8ff80', fog: 'rgba(180,232,42,0.16)' },
    sludge: { a: '#4a4028', b: '#2a2416', edge: '#6a5a30', fog: 'rgba(80,70,40,0.20)' },
    rads: { a: '#3ef07a', b: '#128a44', edge: '#b8ffcf', fog: 'rgba(62,240,122,0.18)' },
  },
  draw(ctx, cam) {
    const L = cam.x - G.W / cam.zoom, R = cam.x + G.W / cam.zoom;
    this.each(L, R, p => {
      const c = this.COL[p.kind], fy = World.floorY(p.x);
      // it lies in the dip, not on top of it: one level, and the floor decides
      // how much of it there is at each step across.
      const lvl = fy - (p.kind === 'sludge' ? 15 : 10);
      const wob = Math.sin(G.t * 1.6 + p.seed * 9) * 1.5;
      const step = 6;
      for (let wx = p.x - p.w / 2; wx < p.x + p.w / 2; wx += step) {
        const f = World.floorY(wx);
        if (f <= lvl + 1) continue;
        const top = lvl + wob * Math.sin((wx - p.x) * 0.05 + G.t * 2);
        const [px, py] = cam.toScreen(wx, top);
        const h = (f - top) * cam.zoom;
        const sw = Math.ceil(step * cam.zoom) + 1;
        ctx.fillStyle = c.b; ctx.fillRect(Math.round(px), Math.round(py), sw, Math.round(h + 4 * cam.zoom));
        ctx.fillStyle = c.a; ctx.fillRect(Math.round(px), Math.round(py), sw, Math.max(1, Math.round(h * 0.5)));
        ctx.fillStyle = c.edge; ctx.fillRect(Math.round(px), Math.round(py), sw, Math.max(1, Math.round(cam.zoom)));
      }
      // bubbles coming up out of it
      if (chance(0.02 * (p.kind === 'sludge' ? 1 : 2.5))) G.fx.bubbles(p.x + rand(-p.w / 2, p.w / 2), fy - 6, 1, 6);
      // the drums, for the ones that are drums
      if (p.kind === 'rads') {
        const n = 2 + Math.floor(p.seed * 3);
        for (let k = 0; k < n; k++) {
          const dx = p.x + (ihash(p.i * 9 + k, 77) - 0.5) * p.w * 0.8;
          const [bx, by] = cam.toScreen(dx, World.floorY(dx));
          const bw = Math.round(9 * cam.zoom), bh = Math.round(14 * cam.zoom);
          const tip = ihash(p.i * 9 + k, 313) > 0.5;
          ctx.save(); ctx.translate(Math.round(bx), Math.round(by)); if (tip) ctx.rotate(1.35);
          ctx.fillStyle = '#4a5a2a'; ctx.fillRect(-bw / 2, -bh, bw, bh);
          ctx.fillStyle = '#39481f'; ctx.fillRect(-bw / 2, -bh + Math.round(3 * cam.zoom), bw, Math.max(1, Math.round(cam.zoom)));
          ctx.fillRect(-bw / 2, -Math.round(4 * cam.zoom), bw, Math.max(1, Math.round(cam.zoom)));
          ctx.fillStyle = '#d8ff60'; ctx.fillRect(-Math.round(2 * cam.zoom), -bh + Math.round(6 * cam.zoom), Math.round(4 * cam.zoom), Math.round(4 * cam.zoom));
          ctx.restore();
        }
        G.fx.glow && G.fx.glow(p.x, fy - 10, p.w * 0.4, '#3ef07a', 0.08);
      }
    });
  },
  // the haze over the top of it, drawn after the animals so they wade in it
  drawOver(ctx, cam) {
    const L = cam.x - G.W / cam.zoom, R = cam.x + G.W / cam.zoom;
    this.each(L, R, p => {
      const c = this.COL[p.kind], fy = World.floorY(p.x);
      const [sx, sy] = cam.toScreen(p.x, fy);
      const hw = p.w / 2 * cam.zoom, hh = 46 * cam.zoom;
      const g = ctx.createLinearGradient(0, sy - hh, 0, sy + 4);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, c.fog);
      ctx.fillStyle = g; ctx.fillRect(Math.round(sx - hw), Math.round(sy - hh), Math.round(hw * 2), Math.round(hh + 4));
    });
  },
};

// A splice you did not ask for. Costs nothing, takes something.
function forceMutate(player) {
  const had = new Set(player.wasteMuts || []);
  const pool = WASTE_MUTATIONS.filter(m => !had.has(m.id));
  if (!pool.length) return null;
  const m = choice(pool);
  player.wasteMuts = (player.wasteMuts || []).concat(m.id);
  m.apply(player);
  player.recomputeStats();
  player.rebuildLook();
  G.banner = { text: m.name, sub: m.short, t: 5, max: 5, color: '#a8f030' };
  G.fx.text && G.fx.text(player.x, player.y - 34 * player.vis, 'SPLICED', { color: '#a8f030', scale: 2, life: 1.8 });
  G.whiteFlash && G.whiteFlash(0.6); G.slowmo && G.slowmo(0.35, 0.9); G.shake(9);
  SFX.levelup && SFX.levelup();
  G.fx.blood(player.x, player.y, 14, 0, 0, 60, ['#a8f030', '#5a8a10']);
  return m;
}
