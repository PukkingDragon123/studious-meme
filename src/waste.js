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
    // the system only, and not the parts of it somebody still mops: a
    // laboratory corridor and a lined interceptor have no pools in them
    if (!B || !B.indoor || B.lab || B.pipe) return null;
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
  // Not a slab of colour lying in the dip. What you see of a pool is what
  // comes off it: a low bed of vapour breathing over the floor, puffs lifting
  // out of it and thinning as they rise, a scum line where it meets the water,
  // and for the drums a glow with motes in it. Every puff is a hash of the pool
  // and its index, so the smoke is the same smoke every frame and drifts
  // rather than flickers.
  COL: {
    acid: { smoke: [200, 236, 90], scum: '#c8e050', glow: null },
    sludge: { smoke: [110, 92, 60], scum: '#5a4a2a', glow: null },
    rads: { smoke: [110, 240, 140], scum: '#62d080', glow: '#3ef07a' },
  },
  // one soft pixel puff: a dithered cluster of squares with a bright core
  puff(ctx, x, y, r, rgb, a) {
    if (a <= 0.01) return;
    const R = Math.max(1, Math.round(r));
    ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a.toFixed(3) + ')';
    // three rings of squares, sparser toward the edge, on a 2px lattice
    for (let j = -R; j <= R; j += 2) for (let i = -R; i <= R; i += 2) {
      const d = (i * i + j * j) / (R * R); if (d > 1) continue;
      if (d > 0.55 && ((i + j) & 3)) continue;                        // ragged edge
      if (d > 0.25 && ((i * 3 + j) & 5) === 5) continue;
      ctx.fillRect(Math.round(x + i), Math.round(y + j), 2, 2);
    }
  },
  draw(ctx, cam) {
    const L = cam.x - G.W / cam.zoom, R = cam.x + G.W / cam.zoom, z = cam.zoom;
    this.each(L, R, p => {
      const c = this.COL[p.kind], fy = World.floorY(p.x);
      const [sx, sy] = cam.toScreen(p.x, fy);
      const hw = p.w / 2 * z;
      // the bed: a low band of vapour hugging the floor of the dip
      for (let k = 0; k < 6; k++) {
        const u = (k + 0.5) / 6, bx = sx - hw + u * hw * 2, drift = Math.sin(G.t * 0.7 + p.seed * 7 + k) * 3 * z;
        this.puff(ctx, bx + drift, sy - 5 * z, (7 + Math.sin(G.t + k) * 1.5) * z, c.smoke, 0.14);
      }
      // the scum line where it meets the water
      ctx.globalAlpha = 0.35; ctx.fillStyle = c.scum;
      ctx.fillRect(Math.round(sx - hw), Math.round(sy - 2 * z), Math.round(hw * 2), Math.max(1, Math.round(z)));
      ctx.globalAlpha = 1;
      // the drums themselves, for the pools that have them
      if (p.kind === 'rads') {
        const n = 2 + Math.floor(p.seed * 3);
        for (let k = 0; k < n; k++) {
          const dx = p.x + (ihash(p.i * 9 + k, 77) - 0.5) * p.w * 0.8;
          const [bx, by] = cam.toScreen(dx, World.floorY(dx));
          const bw = Math.round(9 * z), bh = Math.round(14 * z), tip = ihash(p.i * 9 + k, 313) > 0.5;
          ctx.save(); ctx.translate(Math.round(bx), Math.round(by)); if (tip) ctx.rotate(1.35);
          ctx.fillStyle = '#4a5a2a'; ctx.fillRect(-bw / 2, -bh, bw, bh);
          ctx.fillStyle = '#39481f'; ctx.fillRect(-bw / 2, -bh + Math.round(3 * z), bw, Math.max(1, Math.round(z))); ctx.fillRect(-bw / 2, -Math.round(4 * z), bw, Math.max(1, Math.round(z)));
          ctx.fillStyle = '#d8ff60'; ctx.fillRect(-Math.round(2 * z), -bh + Math.round(6 * z), Math.round(4 * z), Math.round(4 * z));
          ctx.restore();
        }
      }
    });
  },
  // the rising smoke, drawn after the animals so they wade through it
  drawOver(ctx, cam) {
    const L = cam.x - G.W / cam.zoom, R = cam.x + G.W / cam.zoom, z = cam.zoom, t = G.t;
    this.each(L, R, p => {
      const c = this.COL[p.kind], fy = World.floorY(p.x);
      const [sx, sy] = cam.toScreen(p.x, fy);
      const hw = p.w / 2 * z;
      const N = p.kind === 'sludge' ? 7 : 11, rise = (p.kind === 'sludge' ? 34 : 60) * z, period = p.kind === 'sludge' ? 7 : 5;
      for (let k = 0; k < N; k++) {
        // each puff lives on its own loop: born at the bed, climbs, spreads, fades
        const ph = ((t / period) + ihash(p.i * 31 + k, 5)) % 1;
        const bx = sx - hw * 0.8 + ihash(p.i * 31 + k, 11) * hw * 1.6 + Math.sin(t * 0.6 + k * 1.7 + p.seed * 9) * 6 * z * ph;
        const by = sy - 4 * z - ph * rise;
        const r = (4 + ph * 9) * z, a = (1 - ph) * ph * 4 * (p.kind === 'rads' ? 0.34 : 0.28);
        this.puff(ctx, bx, by, r, c.smoke, a);
      }
      if (c.glow) {
        // a soft glow off the drums — a gradient, not a particle star, which is
        // what used to throw a giant green diamond over the whole chamber
        const gl = ctx.createRadialGradient(sx, sy - 8 * z, 2, sx, sy - 8 * z, hw * 0.9);
        gl.addColorStop(0, 'rgba(62,240,122,0.16)'); gl.addColorStop(1, 'rgba(62,240,122,0)');
        ctx.fillStyle = gl; ctx.fillRect(Math.round(sx - hw), Math.round(sy - 8 * z - hw * 0.9), Math.round(hw * 2), Math.round(hw * 1.8));
        // motes: a few bright specks lifting through the smoke
        ctx.fillStyle = c.glow;
        for (let k = 0; k < 6; k++) { const ph = ((t / 3) + ihash(p.i * 7 + k, 23)) % 1; ctx.globalAlpha = (1 - ph) * 0.8; ctx.fillRect(Math.round(sx - hw * 0.6 + ihash(p.i * 7 + k, 29) * hw * 1.2), Math.round(sy - 6 * z - ph * 50 * z), Math.max(1, Math.round(z)), Math.max(1, Math.round(z))); }
        ctx.globalAlpha = 1;
      }
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
