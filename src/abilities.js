'use strict';
// ---------------------------------------------------------------------------
// ABILITIES.
//
// Genes used to be numbers: a gene made a bite bigger or a hide thicker and
// that was the whole of it. Eight of them now hand you something to DO — a
// clamp that will not let go, a drain that drinks what you are holding, a gob
// of venom, a shockwave, a pounce, a ram, a pulse of light, a stillness that
// makes you disappear. Each has a key, a cooldown, a big animated icon, and
// most of them are a small game while they run: a beat to hit, a bar to hold,
// a button to mash. Missing the game does not fail the ability. It makes it
// smaller.
// ---------------------------------------------------------------------------
const SKILLS = [
  { id: 'latch', name: 'BITE DOWN', gene: 'ripper:rollmaster', cd: 6, qte: 'mash', col: '#ff5a3a',
    line: 'Clamp on whatever is in reach and hang on. Every press tightens the jaws and tears.' },
  { id: 'leech', name: 'LIFE LEECH', gene: 'ripper:frenzy', cd: 10, qte: 'beat', col: '#e0304a',
    line: 'Drink what you are holding. Bite on the pulse and its blood is yours.' },
  { id: 'spit', name: 'VENOM SPIT', gene: 'abyssal:venom', cd: 7, qte: 'hold', col: '#8af040',
    line: 'Hold to draw the glands, let go to spit. Everything in the spray is poisoned.' },
  { id: 'shock', name: 'SHOCKWAVE', gene: 'abyssal:leviathan', cd: 14, qte: 'hold', col: '#40f0c8',
    line: 'Hold, release in the band, and the water throws everything near you.' },
  { id: 'pounce', name: 'POUNCE', gene: 'savage:claws', cd: 5, qte: 'timing', col: '#ffc040',
    line: 'A lunge off the legs. Hit the mark and it lands twice as hard.' },
  { id: 'ram', name: 'BULL RAM', gene: 'colossus:bulk', cd: 8, qte: 'mash', col: '#e0b050',
    line: 'Put your mass into a charge. Mash to keep it alive; what you hit is thrown.' },
  { id: 'lure', name: 'LURE PULSE', gene: 'abyssal:lure', cd: 12, qte: null, col: '#7affda',
    line: 'One pulse of light. Small things come to see what it was.' },
  { id: 'vanish', name: 'STILL WATER', gene: 'phantom:silent', cd: 12, qte: null, col: '#8cb8ff',
    line: 'Go dead still. For four seconds nothing sees you, and your next bite is an ambush.' },
];
const SKILL_BY_ID = {}; for (const k of SKILLS) SKILL_BY_ID[k.id] = k;
const SKILL_BY_GENE = {}; for (const k of SKILLS) SKILL_BY_GENE[k.gene] = k;

// ---- the icons: big, in colour, alive -------------------------------------
// Each is a 12x12 pixel design drawn into a box, and each has its own motion:
// the jaws close, the drop falls, the rings spread. Drawn with fillRects so
// they stay on the grid at any scale.
const SkillArt = {
  draw(ctx, id, cx, cy, box, t, opts = {}) {
    const k = SKILL_BY_ID[id]; if (!k) return;
    const s = box / 12, px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(cx - box / 2 + x * s), Math.round(cy - box / 2 + y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
    const dim = opts.dim ? 0.35 : 1, a = ctx.globalAlpha;
    ctx.globalAlpha = a * (opts.alpha === undefined ? 1 : opts.alpha);
    // the plate behind every icon: dark, with the skill colour as a rim
    px(0, 0, 12, 12, opts.dim ? '#141a1c' : mixColor(k.col, '#0a1214', 0.82));
    px(0, 0, 12, 1, k.col); px(0, 11, 12, 1, shade(k.col, 0.5)); px(0, 0, 1, 12, shade(k.col, 0.8)); px(11, 0, 1, 12, shade(k.col, 0.5));
    const C = opts.dim ? mixColor(k.col, '#141a1c', 0.6) : k.col, L = mixColor(C, '#ffffff', 0.5), D = shade(C, 0.55);
    const ph = t * 2.6;
    switch (id) {
      case 'latch': {        // two jaws closing on a bone
        const gap = 1 + Math.round((Math.sin(ph) * 0.5 + 0.5) * 3);
        px(2, 2, 8, 2, C); px(2, 8, 8, 2, C); px(2, 4 - 0, 8, 1, D); px(2, 7, 8, 1, D);
        for (let i = 0; i < 4; i++) { px(3 + i * 2, 4, 1, 1 + (gap < 2 ? 1 : 0), L); px(3 + i * 2, 7 - (gap < 2 ? 1 : 0), 1, 1 + (gap < 2 ? 1 : 0), L); }
        px(1, 5 + Math.round(gap / 3), 10, 1, '#e8e0c8');
        break; }
      case 'leech': {        // a heart with a drop leaving it and a pulse
        const beat = Math.sin(ph * 1.5) > 0.6 ? 1 : 0;
        px(3 - beat, 3 - beat, 3 + beat, 3 + beat, C); px(6, 3 - beat, 3 + beat, 3 + beat, C); px(3 - beat, 5, 6 + beat * 2, 3, C); px(5, 8, 2, 2, C);
        px(3, 3, 1, 1, L);
        const dy = (t * 3) % 4; px(8, 7 + Math.round(dy), 1, 2, L);
        break; }
      case 'spit': {         // a gob leaving a mouth in an arc
        px(1, 6, 4, 3, D); px(1, 6, 4, 1, C);
        const u = (t * 1.4) % 1; const gx = 4 + u * 7, gy = 5 - Math.sin(u * Math.PI) * 4;
        px(Math.round(gx), Math.round(gy), 2, 2, L); px(Math.round(gx) - 1, Math.round(gy) + 1, 1, 1, C);
        for (let i = 1; i < 4; i++) { const uu = Math.max(0, u - i * 0.12); px(Math.round(4 + uu * 7), Math.round(5 - Math.sin(uu * Math.PI) * 4) + 1, 1, 1, D); }
        break; }
      case 'shock': {        // rings spreading from a point
        const r = 1 + ((t * 4) % 5);
        for (const rr of [r, r - 2.5]) { if (rr < 0.5) continue; const R2 = Math.round(rr); for (let a2 = 0; a2 < 12; a2++) { const ang = a2 / 12 * TAU; px(6 + Math.round(Math.cos(ang) * R2) - 0.5, 6 + Math.round(Math.sin(ang) * R2 * 0.7) - 0.5, 1, 1, rr === r ? L : C); } }
        px(5.5, 5.5, 1, 1, '#ffffff');
        break; }
      case 'pounce': {       // a claw slash
        const w = (Math.sin(ph) * 0.5 + 0.5);
        for (let i = 0; i < 3; i++) { const x0 = 2 + i * 3, len = 5 + Math.round(w * 3); for (let j = 0; j < len; j++) px(x0 + Math.round(j * 0.5), 9 - j, 1, 1, j > len - 2 ? L : C); }
        px(1, 10, 10, 1, D);
        break; }
      case 'ram': {          // a skull-front with speed lines
        const sh = Math.round(Math.sin(ph * 2) * 1);
        px(5 + sh, 2, 5, 6, C); px(5 + sh, 2, 5, 1, L); px(6 + sh, 4, 1, 1, '#0a0806'); px(8 + sh, 4, 1, 1, '#0a0806'); px(6 + sh, 7, 3, 1, D);
        for (let i = 0; i < 3; i++) px(1, 3 + i * 2, 3 - (i === 1 ? 0 : 1) + sh, 1, i === 1 ? L : D);
        break; }
      case 'lure': {         // an orb on a stalk, glowing in pulses
        const g = Math.sin(ph) * 0.5 + 0.5;
        px(3, 9, 6, 2, D); px(6, 5, 1, 4, D);
        px(5, 3, 3, 3, C); px(5.5, 3.5, 2, 2, L); if (g > 0.5) { px(4, 2, 5, 5, mixColor(C, '#000000', 0.2)); px(5, 3, 3, 3, L); px(6, 4, 1, 1, '#ffffff'); }
        break; }
      case 'vanish': {       // an eye that closes
        const shut = (Math.sin(ph * 0.8) * 0.5 + 0.5) > 0.7;
        px(2, 5, 8, 3, shut ? D : L); px(1, 6, 10, 1, shut ? D : L);
        if (!shut) { px(5, 5, 2, 3, C); px(5, 5, 1, 1, '#0a0806'); } else px(2, 6, 8, 1, C);
        for (let i = 0; i < 3; i++) px(3 + i * 3, 2 + (i % 2), 1, 1, mixColor(C, '#ffffff', 0.3));
        break; }
    }
    ctx.globalAlpha = a;
  },
};

const Abilities = {
  cd: {}, active: null, flash: {},

  reset() { this.cd = {}; this.active = null; this.flash = {}; },
  // the skills this animal has, in the order the genes were taken
  list(P) {
    const out = [];
    for (const id of P.genes || []) { const k = SKILL_BY_GENE[id]; if (k) out.push(k); }
    return out.slice(0, 4);
  },
  ready(k) { return !(this.cd[k.id] > 0); },

  update(dt) {
    const P = G.player; if (!P || P.dead) return;
    for (const id in this.cd) if (this.cd[id] > 0) this.cd[id] -= dt;
    for (const id in this.flash) if (this.flash[id] > 0) this.flash[id] -= dt;
    if (P.vanishT > 0) { P.vanishT -= dt; if (P.vanishT <= 0) G.fx.text(P.x, P.y - 20 * P.vis, 'SEEN', { color: '#8cb8ff', life: 0.8 }); }
    if (this.active) { this.tick(dt); return; }
    if (G.state !== 'play' || P.frozen || Puzzles.qte) return;
    const ks = this.list(P);
    for (let i = 0; i < ks.length; i++) {
      if (Input.hit('Digit' + (i + 1), 'Numpad' + (i + 1))) this.use(ks[i]);
    }
  },
  use(k) {
    const P = G.player;
    if (!this.ready(k)) { G.fx.text(P.x, P.y - 20 * P.vis, 'NOT YET', { color: '#7f9a90', life: 0.6 }); SFX.hurt && SFX.hurt(); return; }
    this.cd[k.id] = k.cd; this.flash[k.id] = 0.4;
    SFX.pick && SFX.pick();
    G.fx.text(P.x, P.y - 26 * P.vis, k.name, { color: k.col, scale: 2, life: 1.1 });
    if (!k.qte) { this.fire(k, 1); return; }
    // the game: what it is depends on the skill
    const Q = { k, type: k.qte, t: 0, got: 0, miss: 0, done: false, score: 0,
      pos: 0, dir: 1, band: [0.5, 0.7], flash: 0,
      held: false, lift: 0, target: [0.6, 0.8],
      beatT: 0, period: 0.62, window: 0.16, beats: 0, need: k.qte === 'mash' ? 8 : k.qte === 'beat' ? 5 : 1, life: k.qte === 'mash' ? 3.2 : k.qte === 'beat' ? 4.2 : 3 };
    if (k.id === 'latch' || k.id === 'leech') {
      // both want something in the jaws first
      let target = P.latched || null;
      if (!target) { let bd = 1e9; for (const e of G.ents) { if (e.dead || e.remove || !e.latchable || e.type === 'gib' || e.type === 'proj') continue; const d = e.nearestDist ? e.nearestDist(P.x, P.y) : dist(P.x, P.y, e.x, e.y); if (d < P.biteRange * 1.8 && d < bd) { bd = d; target = e; } } }
      if (!target) { G.fx.text(P.x, P.y - 20 * P.vis, 'NOTHING IN REACH', { color: '#7f9a90', life: 0.8 }); this.cd[k.id] = 0.6; return; }
      Q.target = target; P.latched = target; P.rollT = 0;
    }
    this.active = Q;
    P.vx *= 0.5; P.vy *= 0.5;
  },
  tick(dt) {
    const Q = this.active, P = G.player, k = Q.k;
    Q.t += dt; if (Q.flash > 0) Q.flash -= dt;
    if (Q.target && (Q.target.dead || Q.target.remove)) { this.finish(Q, Math.max(0.5, Q.got / Q.need)); return; }
    const press = Input.bitePressed() || Input.mouse.clicked || Input.hit('Digit1', 'Digit2', 'Digit3', 'Digit4');
    const down = Input.down('Space', 'KeyZ', 'KeyJ') || Input.mouse.down || (Input.touch && Input.touch.biteHeld);
    if (Q.type === 'mash') {
      if (press) { Q.got++; Q.flash = 0.12; this.pulse(k, Q, 1 / Q.need); }
      if (Q.got >= Q.need || Q.t > Q.life) this.finish(Q, Q.got / Q.need);
    } else if (Q.type === 'beat') {
      Q.beatT += dt;
      if (Q.beatT >= Q.period) { Q.beatT -= Q.period; Q.beats++; SFX.ui && SFX.ui(); }
      const dist2 = Math.min(Q.beatT, Q.period - Q.beatT);
      if (press) {
        if (dist2 < Q.window) { Q.got++; Q.flash = 0.15; this.pulse(k, Q, 1 / Q.need); } else { Q.miss++; SFX.hurt && SFX.hurt(); G.shake(2); }
      }
      if (Q.got >= Q.need || Q.t > Q.life) this.finish(Q, Q.got / Q.need);
    } else if (Q.type === 'hold') {
      if (down) { Q.held = true; Q.lift = Math.min(1, Q.lift + dt * 0.7); if (chance(dt * 20)) G.fx.glow(P.x + rand(-10, 10) * P.vis, P.y + rand(-6, 6) * P.vis, 2 + Q.lift * 4, k.col, 0.5); }
      else if (Q.held || Q.t > Q.life) {
        const inBand = Q.lift >= Q.target[0] && Q.lift <= Q.target[1];
        this.finish(Q, inBand ? 1 : Math.max(0.25, Q.lift * 0.6));
      }
    } else if (Q.type === 'timing') {
      Q.pos += Q.dir * dt * 1.6; if (Q.pos > 1) { Q.pos = 1; Q.dir = -1; } if (Q.pos < 0) { Q.pos = 0; Q.dir = 1; }
      if (press) { const hit = Q.pos >= Q.band[0] && Q.pos <= Q.band[1]; this.finish(Q, hit ? 1 : 0.5); }
      else if (Q.t > Q.life) this.finish(Q, 0.4);
    }
  },
  // a per-beat effect for the games that pay out as they go
  pulse(k, Q, frac) {
    const P = G.player, e = Q.target;
    if (k.id === 'latch' && e && e.takeDamage) {
      e.takeDamage(P.biteDmg * 0.55, P, { dx: 0, dy: 0, pierce: true });
      e.stun = Math.max(e.stun || 0, 0.4); G.shake(3); SFX.crunch && SFX.crunch(P.size, e.pan); G.fx.blood(e.x, e.y, 3, 0, 0, 30, e.bloodColors);
      P.headShakeT = 0.2; P.goreT = Math.max(P.goreT, 2);
    }
    if (k.id === 'leech' && e && e.takeDamage) {
      const d = e.takeDamage(P.biteDmg * 0.5, P, { dx: 0, dy: 0, pierce: true });
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.06); P.hunger = Math.min(100, P.hunger + 6);
      G.fx.blood(e.x, e.y, 4, sign(P.x - e.x) * 40, 0, 40, e.bloodColors);
      for (let i = 0; i < 3; i++) G.fx.add({ type: 'spark', x: e.x, y: e.y, vx: (P.x - e.x) * 2, vy: (P.y - e.y) * 2, s: 1, color: '#ff4a5a', life: 0.4 });
      G.fx.text(P.x, P.y - 16 * P.vis, '+HP', { color: '#ff6a7a', life: 0.6 }); SFX.gulp && SFX.gulp(P.size, 0);
    }
    if (k.id === 'ram') {
      const fx = Math.cos(P.angle), fy = Math.sin(P.angle);
      P.vx += fx * 220; P.vy += fy * 120; G.shake(2);
      for (const o of G.ents) { if (o.dead || o.remove || o.type === 'gib' || o.type === 'proj' || !o.takeDamage) continue; if ((o.nearestDist ? o.nearestDist(P.x, P.y) : dist(P.x, P.y, o.x, o.y) - o.r * o.size) < 14 * P.vis) { o.takeDamage(P.biteDmg * 0.8 * P.st.ramMul, P, { dx: fx, dy: fy }); o.knock(fx, fy, 260); SFX.thud && SFX.thud(o.pan); G.fx.shock(o.x, o.y, 14 * P.vis, '#e0b050', 0.3); } }
    }
  },
  finish(Q, quality) {
    this.active = null;
    this.fire(Q.k, clamp(quality, 0, 1));
  },
  // the payoff, scaled by how well the game went
  fire(k, q) {
    const P = G.player, fx = Math.cos(P.angle), fy = Math.sin(P.angle);
    const grade = q >= 0.99 ? 'PERFECT' : q >= 0.7 ? 'GOOD' : q >= 0.4 ? 'WEAK' : 'SLIPPED';
    if (k.qte) G.fx.text(P.x, P.y - 34 * P.vis, grade, { color: q >= 0.7 ? '#8ce8a0' : '#ffb060', scale: q >= 0.99 ? 3 : 2, life: 1.2 });
    switch (k.id) {
      case 'latch': if (P.latched && !P.latched.dead) { P.latched.stun = Math.max(P.latched.stun || 0, 1.2 * q); } break;
      case 'leech': break;
      case 'spit': {
        const R = (70 + 90 * q) * Math.sqrt(P.vis), [sx, sy] = P.snout;
        for (let i = 0; i < 18; i++) G.fx.add({ type: 'drop', x: sx, y: sy, vx: fx * rand(120, 260) + rand(-40, 40), vy: fy * rand(120, 260) + rand(-40, 40), s: 1, color: choice(['#8af040', '#5ac020', '#c8ff70']), life: 0.7 });
        for (const o of G.ents) { if (o.dead || o.remove || o.type === 'gib' || o.type === 'proj' || !o.takeDamage) continue; const dx = o.x - sx, dy = o.y - sy, d = Math.hypot(dx, dy); if (d > R) continue; if ((dx * fx + dy * fy) / (d || 1) < 0.5) continue; o.poison = Math.max(o.poison || 0, 4 * q + 1); o.poisonDmg = P.biteDmg * 0.35; o.takeDamage(P.biteDmg * 0.4 * q, P, { dx: fx, dy: fy }); G.fx.text(o.x, o.y - 10, 'POISONED', { color: '#8af040', life: 0.8 }); }
        SFX.gulp && SFX.gulp(P.size, 0);
        break; }
      case 'shock': { const R = (60 + 110 * q) * Math.sqrt(P.vis); G.fx.shock(P.x, P.y, R, '#40f0c8', 0.6); G.shake(8 * q); SFX.roar && SFX.roar(P.size, 0);
        for (const o of G.ents) { if (o.dead || o.remove || o.type === 'gib' || o.type === 'proj' || !o.takeDamage) continue; const dx = o.x - P.x, dy = o.y - P.y, d = Math.hypot(dx, dy) || 1; if (d > R) continue; o.takeDamage(P.biteDmg * (0.6 + q), P, { dx: dx / d, dy: dy / d, pierce: true }); o.knock(dx / d, dy / d, 200 + 200 * q); o.stun = Math.max(o.stun || 0, 0.8); }
        break; }
      case 'pounce': { P.vx += fx * (280 + 220 * q); P.vy += fy * 120 - 60; P.pounceT = 0.5; P.pounceMul = 1 + q; G.fx.smoke(P.x, P.y + 4 * P.vis, 4, '#8a7a5a'); SFX.dash && SFX.dash();
        for (const o of G.ents) { if (o.dead || o.remove || o.type === 'gib' || o.type === 'proj' || !o.takeDamage) continue; const dx = o.x - P.x, dy = o.y - P.y, d = Math.hypot(dx, dy); if (d > 40 * P.vis || dx * fx < 0) continue; o.takeDamage(P.biteDmg * (1 + q), P, { dx: fx, dy: fy, crit: q >= 0.99 }); o.knock(fx, -0.4, 180); }
        break; }
      case 'ram': break;
      case 'lure': { G.fx.glow(P.x, P.y, 40 * P.vis, '#7affda', 0.9); G.fx.shock(P.x, P.y, 90, '#7affda', 0.3); SFX.ui && SFX.ui();
        for (const o of G.ents) { if (o.dead || o.remove || o.type !== 'fish' || o.sizeClass > P.size * 0.6) continue; if (dist(P.x, P.y, o.x, o.y) < 320) { o.state = 'lured'; o.aware = false; } }
        break; }
      case 'vanish': { P.vanishT = 4; P.vx = 0; P.vy = 0; P.ambushReady = true; P.stillT = 1; G.fx.bubbles(P.x, P.y, 8, 12 * P.vis); SFX.ui && SFX.ui(); break; }
    }
  },

  // ---- the HUD: a row of icons, keys under them, the game over the top -------
  draw(ctx) {
    const P = G.player; if (!P || P.dead) return;
    const ks = this.list(P); if (!ks.length) return;
    const W = G.W, H = G.H, box = 22, gap = 6;
    const x0 = W - 10 - ks.length * (box + gap) + gap, y0 = H - 52;
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i], x = x0 + i * (box + gap) + box / 2, y = y0 + box / 2;
      const cd = Math.max(0, this.cd[k.id] || 0), f = k.cd ? clamp(cd / k.cd, 0, 1) : 0;
      SkillArt.draw(ctx, k.id, x, y, box, G.t, { dim: f > 0 });
      if (f > 0) { ctx.fillStyle = 'rgba(4,8,10,0.6)'; ctx.fillRect(Math.round(x - box / 2), Math.round(y - box / 2), box, Math.round(box * f)); }
      if (this.flash[k.id] > 0) { ctx.globalAlpha = this.flash[k.id] * 2; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - box / 2), Math.round(y - box / 2), box, box); ctx.globalAlpha = 1; }
      ctx.fillStyle = '#0a1214'; ctx.fillRect(Math.round(x - 4), Math.round(y + box / 2 + 1), 8, 8);
      Font.draw(ctx, String(i + 1), x, y + box / 2 + 2, { color: f > 0 ? '#5f6f68' : '#e8f0e0', align: 'center' });
    }
    if (P.vanishT > 0) Font.draw(ctx, 'UNSEEN ' + P.vanishT.toFixed(1), x0, y0 - 10, { color: '#8cb8ff' });
    // the game
    const Q = this.active; if (!Q) return;
    const bw = 180, bx = W / 2 - bw / 2, y = H - 106;
    ctx.fillStyle = 'rgba(6,10,12,0.82)'; ctx.fillRect(bx - 40, y - 20, bw + 80, 52);
    ctx.fillStyle = Q.k.col; ctx.fillRect(bx - 40, y - 20, bw + 80, 2);
    SkillArt.draw(ctx, Q.k.id, bx - 22, y + 6, 28, G.t);
    Font.draw(ctx, Q.k.name, W / 2, y - 15, { color: Q.k.col, align: 'center' });
    if (Q.type === 'mash') {
      ctx.fillStyle = '#1a1210'; ctx.fillRect(bx, y, bw, 8);
      ctx.fillStyle = Q.flash > 0 ? '#ffffff' : Q.k.col; ctx.fillRect(bx, y, Math.round(bw * Q.got / Q.need), 8);
      Font.draw(ctx, 'MASH BITE', W / 2, y + 12, { color: '#cfe8e0', align: 'center' });
    } else if (Q.type === 'beat') {
      // a pulse: a ring that closes on the centre once per beat; hit it small
      const u = Q.beatT / Q.period, r = 6 + (1 - u) * 60;
      ctx.strokeStyle = Q.flash > 0 ? '#ffffff' : Q.k.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, y + 4, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = Q.k.col; ctx.fillRect(W / 2 - 6, y - 2, 12, 12);
      Font.draw(ctx, 'BITE ON THE PULSE', W / 2, y + 16, { color: '#cfe8e0', align: 'center' });
      for (let i = 0; i < Q.need; i++) { ctx.fillStyle = i < Q.got ? '#8ce8a0' : '#2a2418'; ctx.fillRect(bx + i * 12, y + 26, 8, 4); }
    } else if (Q.type === 'hold') {
      ctx.fillStyle = '#1a1210'; ctx.fillRect(bx, y, bw, 8);
      ctx.fillStyle = '#4a7a4a'; ctx.fillRect(bx + Math.round(Q.target[0] * bw), y, Math.round((Q.target[1] - Q.target[0]) * bw), 8);
      ctx.fillStyle = Q.k.col; ctx.fillRect(bx, y + 1, Math.round(Q.lift * bw), 6);
      Font.draw(ctx, Q.held ? 'LET GO IN THE GREEN' : 'HOLD BITE', W / 2, y + 12, { color: '#cfe8e0', align: 'center' });
    } else if (Q.type === 'timing') {
      ctx.fillStyle = '#1a1210'; ctx.fillRect(bx, y, bw, 8);
      ctx.fillStyle = '#4a7a4a'; ctx.fillRect(bx + Math.round(Q.band[0] * bw), y, Math.round((Q.band[1] - Q.band[0]) * bw), 8);
      ctx.fillStyle = '#ffe060'; ctx.fillRect(bx + Math.round(Q.pos * bw) - 1, y - 3, 3, 14);
      Font.draw(ctx, 'BITE ON THE MARK', W / 2, y + 12, { color: '#cfe8e0', align: 'center' });
    }
  },
};
