'use strict';
// ---------------------------------------------------------------------------
// Gore. Bites tear limbs off, kills burst bodies into their own rig parts plus
// organs, blood pools soak into the mud and slicks spread across the water.
// ---------------------------------------------------------------------------
const ORGANS = {};
(function buildOrgans() {
  const mk = (w, h) => R.mk(w, h);
  const fin = (o, col) => { R.outline(o, mixColor(shade(col, 0.4), '#1a0404', 0.5)); return { c: o.c, w: o.w, h: o.h, ox: o.w / 2, oy: o.h / 2 }; };
  { const o = mk(11, 12); R.blob(o, 5, 7, 4.5, 4.5, '#a01818', { hx: -0.2 }); R.px(o, 3, 1, '#7a1010', 2, 4); R.px(o, 6, 0, '#7a1010', 2, 5); R.px(o, 4, 2, '#d04040', 1, 2); ORGANS.heart = fin(o, '#a01818'); }
  { const o = mk(14, 11); for (let k = 0; k < 4; k++) R.blob(o, 3 + k * 2.6, 5 + Math.sin(k * 2) * 2.2, 2.6, 2.4, k % 2 ? '#c05a4a' : '#a84a3a', { hl: false }); ORGANS.gut = fin(o, '#a84a3a'); }
  { const o = mk(12, 9); R.blob(o, 6, 4.5, 5, 3.5, '#6a2018', { hx: -0.1 }); R.px(o, 3, 3, '#8a3028', 4, 1); ORGANS.liver = fin(o, '#6a2018'); }
  { const o = mk(9, 9); R.disc(o, 4, 4, 3.6, '#f0eae0'); R.disc(o, 5, 4, 2.2, '#40a0d0'); R.disc(o, 5, 4, 1.1, '#141414'); R.px(o, 2, 3, '#c04040', 2, 1); R.px(o, 1, 5, '#c04040', 2, 1); ORGANS.eye = fin(o, '#e0d8d0'); }
  { const o = mk(13, 7); R.px(o, 3, 3, '#efe6d2', 7, 2); R.blob(o, 2.5, 3.5, 2.5, 3, '#efe6d2', { hl: false }); R.blob(o, 10.5, 3.5, 2.5, 3, '#efe6d2', { hl: false }); R.px(o, 4, 4, '#c8bfa8', 5, 1); ORGANS.bone = fin(o, '#efe6d2'); }
  { const o = mk(12, 10); R.blob(o, 6, 5, 5, 4.2, '#e8e0cc'); R.disc(o, 4, 4, 1.6, '#2a2018'); R.disc(o, 8, 4, 1.6, '#2a2018'); R.px(o, 5, 8, '#2a2018', 3, 1); ORGANS.skull = fin(o, '#e8e0cc'); }
  { const o = mk(10, 8); R.blob(o, 5, 4, 4, 3, '#b03030', { hl: false }); R.px(o, 2, 2, '#d05050', 3, 2); ORGANS.meat = fin(o, '#b03030'); }
  { const o = mk(16, 7); for (let i = 0; i < 13; i++) R.px(o, 2 + i, 3 + Math.round(Math.sin(i * 0.8) * 1.5), '#c05a5a', 1, 2); ORGANS.rope = fin(o, '#c05a5a'); }
})();
const Gore = {
  // spawn one organ gib with a blood trail
  organ(x, y, kind, power = 1, colors) {
    const p = ORGANS[kind] || ORGANS.meat;
    const g = new Gib(x, y, p, { sx: 0, sy: 0, sw: p.w, sh: p.h }, 1, chance(0.5) ? 1 : -1, true, colors || BLOOD_COLORS);
    g.name = 'ORGAN'; g.organ = kind; g.mass = kind === 'bone' || kind === 'skull' ? 0 : 4;
    g.edible = g.mass > 0; g.buoyant = kind === 'gut' || kind === 'rope' || kind === 'eye';
    const a = rand(TAU), sp = rand(30, 120) * power;
    g.vx = Math.cos(a) * sp; g.vy = Math.sin(a) * sp - 40 * power; g.vr = rand(-9, 9); g.bleedFx = rand(2, 5);
    G.add(g); return g;
  },
  // a body comes apart: rig parts + a spray of organs
  burst(e, power = 1, dx = 0, dy = 0) {
    const big = e.mass >= 60, n = clamp(Math.round(2 + Math.log2(1 + e.mass) * (G.settings.gore ? 1 : 0.4)), 2, big ? 9 : 5);
    G.fx.gore(e.x, e.y, 110 * Math.sqrt(power), dx, dy, big);
    const pool = ['gut', 'gut', 'heart', 'liver', 'rope', 'meat', 'bone', 'eye'];
    for (let i = 0; i < n; i++) Gore.organ(e.x + rand(-4, 4), e.y + rand(-4, 4), choice(pool), power, e.bloodColors);
    if (big) Gore.organ(e.x, e.y, 'skull', power, e.bloodColors);
    const bc3 = (e.bloodColors || BLOOD_COLORS)[0];
    for (let k = 0; k < (big ? 5 : 3); k++) G.fx.cloud(e.x + rand(-7, 7), e.y + rand(-5, 5), rand(7, 16) * Math.sqrt(power), bc3, rand(2.6, 5));
    Gore.slick(e.x, e.y, 6 + Math.min(26, e.mass * 0.25));
    SFX.gib(e.pan);
  },
  // tear one rig part off a living body
  tear(e, id, dx, dy) {
    if (!e.rig || !e.rig.world || !id) return false;
    e.missing = e.missing || new Set();
    if (e.missing.has(id)) return false;
    const pl = e.rig.world(e.x, e.y, e.facing, e.angle, e.anim, e.size * e.rig.scale).find(q => q.id === id);
    if (!pl) return false;
    e.missing.add(id);
    const g = new Gib(pl.wx, pl.wy, pl.p, { sx: 0, sy: 0, sw: pl.p.w, sh: pl.p.h }, pl.k, pl.facing, true, e.bloodColors);
    g.rot = pl.wa; g.mass = e.edible ? Math.max(2, e.mass * 0.14) : 0; g.edible = g.mass > 0; g.bleedFx = rand(3, 6); g.name = 'LIMB';
    g.vx = e.vx * 0.3 + (dx || rand(-1, 1)) * rand(60, 160); g.vy = e.vy * 0.3 + (dy || 0) * 90 - rand(20, 90); g.vr = rand(-10, 10);
    G.add(g);
    G.fx.blood(pl.wx, pl.wy, 22, dx, dy, 130, e.bloodColors);
    Gore.organ(pl.wx, pl.wy, chance(0.5) ? 'rope' : 'meat', 0.7, e.bloodColors);
    Gore.slick(pl.wx, pl.wy, 8);
    // a mist of fine droplets and a lingering plume at the wound
    const bc = (e.bloodColors || BLOOD_COLORS)[0];
    for (let k = 0; k < 3; k++) G.fx.cloud(pl.wx + rand(-3, 3), pl.wy + rand(-3, 3), rand(5, 11), bc, rand(2.4, 4.6));
    G.fx.sparks && G.fx.flesh(pl.wx, pl.wy, 4, 70);
    SFX.gib(e.pan); G.hitstop(0.05); G.shake(4);
    e.dismembered = (e.dismembered || 0) + 1;
    return true;
  },
  // which parts can come off, worst first
  limbsOf(e) {
    if (!e.rig || !e.rig.pose) return [];
    if (!e._limbCache) e._limbCache = e.rig.pose(e.anim, {}).filter(p => p.kind === 'leg' || p.kind === 'arm' || p.kind === 'wing' || p.kind === 'fin' || p.kind === 'tail' || p.kind === 'claw' || p.kind === 'head').map(p => ({ id: p.id, kind: p.kind }));
    return e._limbCache;
  },
  // a bite may take a limb with it
  maybeTear(e, dmg, dx, dy) {
    if (!G.settings.gore || !e.bleeds || e.dead) return false;
    const limbs = Gore.limbsOf(e).filter(l => !(e.missing && e.missing.has(l.id)));
    if (!limbs.length) return false;
    const hurt = clamp(dmg / Math.max(6, e.maxHp * 0.5), 0, 1);
    if (!chance(0.22 + hurt * 0.5)) return false;
    const soft = limbs.filter(l => l.kind !== 'head');
    const pick = (e.hp < e.maxHp * 0.34 && chance(0.4)) || !soft.length ? choice(limbs) : choice(soft);
    const ok = Gore.tear(e, pick.id, dx, dy);
    if (ok && pick.kind === 'head') { e.hp = 0; e.beheaded = true; }
    else if (ok) { e.hp -= e.maxHp * 0.12; e.bleedT = Math.max(e.bleedT, 6); e.bleedDmg = Math.max(e.bleedDmg, e.maxHp * 0.02); e.slow = 0.5; }
    if (e.hp <= 0 && !e.dead) e.die(G.player);
    return ok;
  },
  // rip a body clean in two: front half keeps the head, back half trails guts
  bisect(e, dx, dy) {
    if (!e.rig || !e.rig.world) return;
    const pls = e.rig.world(e.x, e.y, e.facing, e.angle, e.anim, e.size * e.rig.scale);
    const cut = e.x;
    for (const pl of pls) {
      if (e.missing && e.missing.has(pl.id)) continue;
      const front = (pl.wx - cut) * e.facing > 0;
      const g = new Gib(pl.wx, pl.wy, pl.p, { sx: 0, sy: 0, sw: pl.p.w, sh: pl.p.h }, pl.k, pl.facing, true, e.bloodColors);
      g.rot = pl.wa; g.mass = e.edible ? e.mass * 0.3 / pls.length : 0; g.edible = g.mass > 0; g.bleedFx = rand(3, 7);
      g.vx = (front ? 1 : -1) * e.facing * rand(60, 200) + (dx || 0) * 60; g.vy = -rand(30, 130); g.vr = rand(-9, 9);
      G.add(g);
    }
    for (let i = 0; i < 6; i++) Gore.organ(e.x + rand(-6, 6), e.y, choice(['gut', 'gut', 'rope', 'heart', 'liver', 'meat']), 1.2, e.bloodColors);
    for (let i = 0; i < 3; i++) Gore.organ(e.x + rand(-8, 8), e.y + rand(-4, 4), 'bone', 1.1, e.bloodColors);
    const bc2 = (e.bloodColors || BLOOD_COLORS)[0];
    for (let k = 0; k < 6; k++) G.fx.cloud(e.x + rand(-9, 9), e.y + rand(-6, 6), rand(9, 20), bc2, rand(3.2, 6));
    G.fx.flesh(e.x, e.y, 10, 120);
    G.fx.gore(e.x, e.y, 150, dx, dy, true); Gore.slick(e.x, e.y, 24);
    G.hitstop(0.1); G.shake(11); SFX.gib(e.pan); SFX.crunch(2, e.pan);
  },
  // a spreading blood mark: a slick on the water surface, a pool on the ground
  slick(x, y, r) {
    if (!G.settings.gore) return;
    const surf = World.surface(x), fy = World.floorY(x);
    if (y > surf + 4 && y < fy - 6) { G.fx.cloud(x, y, r * 1.2, '#6a0a0a', 4); return; }
    if (y <= surf + 4) G.fx.add({ type: 'slick', x, y: surf, r: r * 0.4, r1: r, life: rand(14, 24), vx: rand(-4, 4) });
    else G.fx.add({ type: 'pool', x, y: fy, r: r * 0.3, r1: r, life: rand(20, 40) });
  },
};
