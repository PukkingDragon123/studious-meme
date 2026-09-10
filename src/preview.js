'use strict';
// ---------------------------------------------------------------------------
// The specimen viewer. Two jobs:
//
//   * a live animated crocodile, using the real in-game body and art, so what
//     you see in the creation bay is literally the animal you will play;
//   * a holographic projection of it running an attack loop — coil, lunge,
//     snap, recoil — for the species select.
//
// The hologram is not a filter over the sprite. The animal is rendered to an
// offscreen buffer, tinted through its own alpha, then composited additively
// with scanlines cut out of it and a projector cone under it, so it reads as
// light in the air rather than a coloured sprite.
// ---------------------------------------------------------------------------
const CrocView = {
  make() {
    return { chain: new CrocChain(0, 0, 0), t: 0, jaw: 0, legPhase: 0, x: 0, y: 0, a: 0, hit: 0, roll: 0 };
  },
  // one attack cycle, in normalised phase. Returns the head pose.
  script(v, u) {
    // 0.00-0.30 hold, drifting          0.30-0.46 coil back, jaw cracks open
    // 0.46-0.58 lunge                   0.58-0.64 snap
    // 0.64-1.00 recoil and settle
    let x = 0, a = 0, jaw = 0;
    if (u < 0.30) { const k = u / 0.30; x = Math.sin(k * TAU) * 2; a = Math.sin(k * TAU * 0.5) * 0.05; jaw = 0.06; }
    else if (u < 0.46) { const k = (u - 0.30) / 0.16, e = k * k; x = -14 * e; a = -0.18 * e; jaw = 0.06 + 0.62 * e; }
    else if (u < 0.58) { const k = (u - 0.46) / 0.12, e = 1 - Math.pow(1 - k, 3); x = lerp(-14, 26, e); a = lerp(-0.18, 0.12, e); jaw = 0.68 + 0.22 * e; }
    else if (u < 0.64) { const k = (u - 0.58) / 0.06; x = 26 + k * 2; a = 0.12 - k * 0.1; jaw = 0.9 * (1 - k * k); v.hit = Math.max(v.hit, 1 - k); }
    else { const k = (u - 0.64) / 0.36, e = 1 - Math.pow(1 - k, 2); x = lerp(28, 0, e); a = lerp(0.02, 0, e); jaw = 0.04; }
    return { x, a, jaw };
  },
  update(v, dt, cycle = 2.9) {
    v.t += dt;
    const u = (v.t % cycle) / cycle;
    const p = this.script(v, u);
    v.x = p.x; v.a = p.a; v.jaw = p.jaw;
    if (v.hit > 0) v.hit -= dt * 3.4;
    // the body follows the head, so the whole animal whips through the lunge
    const swim = u > 0.44 && u < 0.66 ? 1.3 : 0.35;
    v.chain.solve(v.x, v.y, v.a, 1, dt, swim, false);
    v.legPhase += dt * 2.2;
    return u;
  },
  // solid render, for the customise stage: the actual animal, actual art
  draw(ctx, v, parts, cx, cy, worldSize) {
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(cy));
    drawCroc(ctx, v.chain, parts, worldSize, { jaw: v.jaw, legPhase: v.legPhase, flipY: 1 });
    ctx.restore();
  },
  // holographic render. `col` tints it; `k` is projector strength 0..1.
  holo(ctx, v, parts, cx, cy, worldSize, col, k, t) {
    const W = 320, H = 150;
    if (!this._cv) { this._cv = mkCanvas(W, H); this._cx = ctxOf(this._cv); }
    const o = this._cx;
    o.clearRect(0, 0, W, H);
    // 1. the animal, in its own art, into the buffer
    o.save();
    o.translate(W * 0.74, H * 0.52);
    drawCroc(o, v.chain, parts, worldSize, { jaw: v.jaw, legPhase: v.legPhase, flipY: 1 });
    o.restore();
    // 2. tint through its own alpha: keeps the internal shading as luminance
    o.save();
    o.globalCompositeOperation = 'source-atop';
    o.globalAlpha = 0.62;
    o.fillStyle = col; o.fillRect(0, 0, W, H);
    o.globalAlpha = 1;
    // 3. Dim scanlines into it rather than punching them out. A full-alpha cut
    // every third row removed a third of the animal and left horizontal bars
    // where a crocodile should be.
    o.globalCompositeOperation = 'destination-out';
    o.globalAlpha = 0.42;
    o.fillStyle = '#000';
    const roll = Math.round((t * 22) % 4);
    for (let y = 0; y < H; y += 4) o.fillRect(0, (y + roll) % H, W, 1);
    o.globalAlpha = 1;
    o.globalCompositeOperation = 'source-over';
    o.restore();

    // 4. composite: a jittered double exposure plus a bright core
    const jx = Math.round(Math.sin(t * 41) * 1.2), jy = Math.round(Math.cos(t * 33) * 0.8);
    const bx = Math.round(cx - W * 0.74), by = Math.round(cy - H * 0.52);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.30 * k; ctx.drawImage(this._cv, bx + jx + 2, by + jy);
    ctx.globalAlpha = 0.22 * k; ctx.drawImage(this._cv, bx + jx - 2, by + jy);
    ctx.globalAlpha = 0.95 * k; ctx.drawImage(this._cv, bx, by);
    ctx.restore();
    // 5. the strike flash, on the snap frame
    if (v.hit > 0.02) {
      const hx = cx + Math.cos(v.a) * 20 * worldSize, hy = cy + Math.sin(v.a) * 20 * worldSize;
      ctx.globalCompositeOperation = 'lighter';
      Shape.star(ctx, hx, hy, 14 + v.hit * 16, '#ffffff', v.hit * 0.8);
      Shape.burst(ctx, hx, hy, 8 + (1 - v.hit) * 26, col, 12, 3, 0.8, 0.3);
      ctx.globalCompositeOperation = 'source-over';
    }
  },
  // the emitter plate and the cone of light it throws up
  projector(ctx, cx, cy, w, col, t, k) {
    const base = cy + 44;
    // plate
    ctx.fillStyle = '#22343a'; ctx.fillRect(cx - 26, base, 52, 6);
    ctx.fillStyle = '#3a5a62'; ctx.fillRect(cx - 26, base, 52, 1);
    ctx.fillStyle = '#0d1518'; ctx.fillRect(cx - 20, base + 2, 40, 2);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = Math.sin(t * 7 + i) > 0 ? col : '#1a2a2e'; ctx.fillRect(cx - 18 + i * 9, base + 2, 3, 2); }
    // cone
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, base, 0, cy - 56);
    g.addColorStop(0, rgba(col, 0.20 * k)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - 20, base); ctx.lineTo(cx + 20, base);
    ctx.lineTo(cx + w / 2, cy - 56); ctx.lineTo(cx - w / 2, cy - 56);
    ctx.closePath(); ctx.fill();
    // motes riding the cone
    ctx.globalAlpha = 0.5 * k; ctx.fillStyle = col;
    for (let i = 0; i < 22; i++) {
      const p = ((t * 0.3 + ihash(i, 71)) % 1);
      const spread = lerp(20, w / 2, p);
      ctx.fillRect(Math.round(cx + (ihash(i, 72) * 2 - 1) * spread), Math.round(base - p * (base - (cy - 56))), 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },
};
