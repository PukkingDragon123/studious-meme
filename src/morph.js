'use strict';
// ---------------------------------------------------------------------------
// The transformation. Growing a tier or expressing an apex gene is the loudest
// thing that happens to the crocodile, and it used to be a white flash and a
// banner. Now it is a scene: the body seizes, a seam of light runs head to tail
// splitting the old hide off plate by plate, the animal bursts a third bigger
// than it will settle at, and the new form comes down out of the overshoot.
//
// It runs on real time, not the slowed clock it causes, so the beats land the
// same however hard the game is lagging.
// ---------------------------------------------------------------------------
const Morph = {
  DUR: 2.5,
  BURST: 0.5,          // where in the run the change is actually applied
  begin(o) {
    const P = G.player;
    if (G.morph || P.dead) return;
    G.morph = {
      t: 0, dur: this.DUR, color: o.color || '#9ad8b0',
      title: o.title || 'TRANSFORMING', sub: o.sub || '', kind: o.kind || 'tier',
      apply: o.apply || null, applied: false,
      base: P.size, seam: -0.2, husked: 0, ring: 0,
    };
    G.state = 'morph';
    P.frozen = true; P.latched = null; P.latchT = 0; P.rollT = 0; P.qteT = 0;
    if (P.grabbed) { if (P.grabbed.release) P.grabbed.release(); P.grabbed = null; }
    if (P.tether) { if (P.tether.boat) P.tether.boat.cutTether(); P.tether = null; }
    G.banner = null; G.finisher = null;
    G.slowmo(0.4, 0.5); SFX.shed(); SFX.warning && SFX.warning();
  },
  // 1 at rest. Coils in, snaps out past the target, then rings down onto it.
  scaleAt(u) {
    if (u < 0.16) return 1 + Math.sin(u * 190) * 0.014;                       // tremor
    if (u < this.BURST) { const k = (u - 0.16) / (this.BURST - 0.16); return 1 - 0.08 * k * k; }   // coil
    if (u < 0.6) { const k = (u - this.BURST) / (0.6 - this.BURST); return 0.92 + 0.44 * Math.sqrt(k); }  // burst
    const k = u - 0.6;
    return 1 + 0.36 * Math.exp(-k * 9) * Math.cos(k * 20);                    // elastic settle
  },
  update(raw) {
    const M = G.morph, P = G.player; if (!M) return;
    const prev = M.t / M.dur;
    M.t += raw;
    const u = M.t / M.dur;
    P.invuln = Math.max(P.invuln, 0.6);
    P.vx = 0; P.vy = 0;
    // a frozen player skips its own timers, so the strobe has to be decayed
    // here or the first flash sticks and paints the croc white all scene
    if (P.hurtFlash > 0) P.hurtFlash -= raw;
    // the seam runs head to tail across the split
    if (u > 0.16) M.seam = clamp((u - 0.16) / (this.BURST - 0.16), 0, 1) * 1.25 - 0.05;
    // size: the whole animation reads through this one curve
    P.size = M.base * this.scaleAt(u);
    // thrash while it is fighting the change, then hold still while it settles
    const swim = u < this.BURST ? 1.5 : Math.max(0, 1.2 - (u - this.BURST) * 3);
    P.legPhase += raw * (u < this.BURST ? 26 : 6);
    P.chain.solve(P.x, P.y, P.angle, P.vis, raw, swim, false);
    // spin the body through the split, then let it come to rest square
    if (u > 0.16 && u < 0.72) P.roll = (u - 0.16) * TAU * 3.2;
    else if (u >= 0.72) P.roll = lerp(P.roll, Math.round(P.roll / TAU) * TAU, 1 - Math.exp(-8 * raw));
    // push the camera in and let it fall back at the end
    const zi = u < this.BURST ? u / this.BURST : clamp(1 - (u - 0.72) / 0.28, 0, 1);
    G.zoomP = 1 + 0.5 * zi;
    // ---- phase beats
    if (u < 0.16) {
      if (chance(raw * 22)) { G.fx.sparks(P.x + rand(-14, 14) * P.vis, P.y + rand(-8, 8) * P.vis, 2); }
      if (chance(raw * 6)) { G.shake(3); P.hurtFlash = 0.05; }
      if (P.inWater && chance(raw * 20)) G.fx.bubbles(P.x + rand(-16, 16) * P.vis, P.y, 1, 6 * P.vis, -30);
    } else if (u < this.BURST) {
      G.shake(2 + u * 6);
      // shed one plate of the old hide behind the seam as it passes
      const n = P.chain.nodes, want = Math.min(n.length, Math.floor(clamp(M.seam, 0, 1) * n.length + 0.001));
      while (M.husked < want) {
        const i = M.husked++;
        const part = i === 0 ? P.parts.head : i <= 5 ? P.parts.body[i - 1] : P.parts.tail[i - 6];
        // the plate lifts off the spine rather than hanging on it: without a
        // real escape velocity twelve of them stack into one white plank
        if (part) {
          const a = n[i].a - Math.PI / 2 * (i % 2 ? 1 : -1);
          G.fx.husk(part.c, 0, 0, part.w, part.h, n[i].x, n[i].y, n[i].a, P.vis / CROC_PX, P.facing,
            { vx: Math.cos(a) * rand(40, 90) - Math.cos(n[i].a) * 25, vy: Math.sin(a) * rand(40, 90) - 20, vr: rand(-4, 4), life: rand(1.8, 2.8) });
        }
        G.fx.glow(n[i].x, n[i].y, 5 * P.vis, M.color, 0.5);
        G.fx.sparks(n[i].x, n[i].y, 5);
        SFX.crack && SFX.crack(i);
        if (P.inWater) G.fx.bubbles(n[i].x, n[i].y, 2, 7 * P.vis, -20);
      }
    }
    // ---- the burst: this is where the change actually lands
    if (!M.applied && u >= this.BURST) {
      M.applied = true;
      if (M.apply) M.apply();
      P.recomputeStats();
      G.whiteFlash(0.85); G.shake(20); G.hitstop(0.1); G.slowmo(0.22, 1.1);
      G.fx.shock(P.x, P.y, 90 * Math.sqrt(P.vis), M.color, 0.7);
      G.fx.glow(P.x, P.y, 12 * P.vis, '#ffffff', 0.7);
      for (let i = 0; i < 26; i++) G.fx.glow(P.x + rand(-50, 50) * P.vis, P.y + rand(-30, 30) * P.vis, rand(1.5, 4) * P.vis, M.color, rand(0.4, 1));
      if (P.inWater) { G.fx.bubbles(P.x, P.y, 22, 20 * P.vis, -30); Water.splash(P.x, 160, 24 * P.size); }
      else G.fx.smoke(P.x, P.y, 10, '#7a6a4a');
      SFX.roar(P.size); SFX.levelup(); SFX.shock && SFX.shock();
    }
    // ---- the new form snapping into place
    if (M.applied && u < 0.82 && chance(raw * 26)) {
      const n = P.chain.nodes, k = n[randi(0, n.length - 1)];
      G.fx.sparks(k.x, k.y, 4); G.fx.glow(k.x, k.y, 5 * P.vis, M.color, 0.5);
    }
    if (prev < 0.66 && u >= 0.66) SFX.roar(P.size * 1.2);
    // ---- out
    if (u >= 1 || Input.hit('Escape', 'Enter', 'KeyP')) this.finish();
  },
  finish() {
    const M = G.morph, P = G.player; if (!M) return;
    if (!M.applied && M.apply) { M.apply(); P.recomputeStats(); }
    P.size = massToSize(P.mass); P.sizeTarget = P.size;
    P.hp = Math.min(P.hp, P.maxHp); P.roll = 0; P.frozen = false; P.invuln = Math.max(P.invuln, 1.4);
    G.morph = null; G.zoomP = 1;
    G.state = 'play'; G.slowT = 0; G.slowScale = 1; G.timeScale = 1;
    // the title hands off to a banner as the letterbox closes
    G.banner = { text: M.title, sub: M.sub, t: 2.2, max: 2.2, color: M.color };
  },
  // world-space: the seam of light, drawn over the body
  drawWorld(ctx) {
    const M = G.morph, P = G.player; if (!M) return;
    const u = M.t / M.dur, col = M.color, n = P.chain.nodes, N = n.length;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const ni = i / (N - 1), d = M.seam - ni;
      if (d < -0.08) continue;
      const peak = Math.max(0, 1 - Math.abs(d) * 6);
      // behind the seam the split keeps glowing, but faintly: a hot line down
      // the back, never a slab of white over the animal
      const resid = d > 0 ? clamp(1 - (u - this.BURST) * 3.4, 0, 1) * 0.16 : 0;
      const a = clamp(peak + resid, 0, 1);
      if (a <= 0.03) continue;
      const w = (7 + 9 * peak) * P.vis * (1 - ni * 0.45);
      ctx.save(); ctx.translate(n[i].x, n[i].y); ctx.rotate(n[i].a);
      ctx.fillStyle = rgba(col, a * 0.4); ctx.fillRect(-0.9 * P.vis, -w / 2, 1.8 * P.vis, w);
      if (peak > 0.08) { ctx.fillStyle = rgba('#ffffff', peak * 0.65); ctx.fillRect(-0.5 * P.vis, -w * 0.42, 1 * P.vis, w * 0.84); }
      ctx.restore();
    }
    // the bloom around the burst
    // a tight flare on the burst itself: big enough to punctuate, small enough
    // that the animal is never hidden behind it
    const bl = clamp(1 - Math.abs(u - this.BURST) * 16, 0, 1);
    if (bl > 0.01) {
      ctx.fillStyle = rgba(col, bl * 0.20);
      ctx.beginPath(); ctx.arc(P.x, P.y, 30 * P.vis * bl, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba('#ffffff', bl * 0.34);
      ctx.beginPath(); ctx.arc(P.x, P.y, 15 * P.vis * bl, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  // screen-space: letterbox, a title that lands on the burst, a rewrite meter
  drawUI(ctx) {
    const M = G.morph; if (!M) return;
    const W = G.W, H = G.H, u = M.t / M.dur;
    const band = Math.round(24 * clamp(Math.min(u / 0.12, (1 - u) / 0.12), 0, 1));
    if (band > 0) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, band); ctx.fillRect(0, H - band, W, band); }
    // vignette that tightens into the burst and opens after it
    const vg = clamp(1 - Math.abs(u - this.BURST) * 2.2, 0, 1);
    if (vg > 0.02) {
      const g2 = ctx.createRadialGradient(W / 2, H / 2, H * 0.16, W / 2, H / 2, H * (0.8 - vg * 0.3));
      g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, rgba('#000000', 0.3 + vg * 0.45));
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    }
    if (u < this.BURST) {
      const f = u / this.BURST;
      Font.draw(ctx, M.kind === 'gene' ? 'EXPRESSING' : 'SHEDDING', W / 2, H * 0.22, { color: M.color, align: 'center', scale: 2, outline: '#04120e' });
      const bw = 120, bx = W / 2 - bw / 2, by = H * 0.22 + 22;
      ctx.fillStyle = '#0d1210'; ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
      ctx.fillStyle = M.color; ctx.fillRect(bx, by, Math.round(bw * f), 4);
      // scanning ticks, so the meter reads as a machine and not a loading bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      for (let i = 8; i < bw; i += 8) ctx.fillRect(bx + i, by, 1, 4);
    } else {
      const k = clamp((u - this.BURST) / 0.16, 0, 1);
      const sc = 3 + (1 - k) * 3;
      ctx.globalAlpha = clamp(Math.min(k * 3, (1 - u) / 0.18), 0, 1);
      Font.draw(ctx, M.title, W / 2, H * 0.2, { color: M.color, align: 'center', scale: Math.round(sc), outline: '#04120e' });
      if (M.sub) Font.draw(ctx, M.sub, W / 2, H * 0.2 + 26, { color: '#e6eede', align: 'center', outline: '#04120e' });
      ctx.globalAlpha = 1;
    }
    if (u > 0.3) Font.draw(ctx, (G.touchUI || Input.touch.active) ? '' : 'ESC: SKIP', W - 8, H - 10, { color: 'rgba(160,190,180,0.5)', align: 'right' });
  },
};
