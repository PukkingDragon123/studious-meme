'use strict';
// ---------------------------------------------------------------------------
// Pixel shape primitives. Nothing in this game should ever paint a smooth
// vector circle: a canvas arc antialiases its edge, which reads as a soft blob
// pasted over hard pixel art. Everything round here is built out of whole
// pixels — stepped spans, radial dashes, cross flares and octagons — so it sits
// in the same palette and grid as the rest of the frame.
// ---------------------------------------------------------------------------
const Shape = {
  // filled disc as integer horizontal spans; squash < 1 flattens it
  blob(ctx, cx, cy, r, col, squash = 1) {
    if (r < 0.5) return;
    const R = Math.max(1, Math.round(r)), X = Math.round(cx), Y = Math.round(cy);
    ctx.fillStyle = col;
    for (let dy = -R; dy <= R; dy++) {
      const t = dy / R, w = Math.round(R * Math.sqrt(Math.max(0, 1 - t * t)));
      if (w <= 0) continue;
      const y = Y + Math.round(dy * squash);
      ctx.fillRect(X - w, y, w * 2, 1);
    }
  },
  // stepped ring: the same spans, hollowed out
  ring(ctx, cx, cy, r, w, col, squash = 1) {
    if (r < 1) return;
    const R = Math.max(1, Math.round(r)), T = Math.max(1, Math.round(w)), X = Math.round(cx), Y = Math.round(cy);
    ctx.fillStyle = col;
    for (let dy = -R; dy <= R; dy++) {
      const t = dy / R;
      const o = Math.round(R * Math.sqrt(Math.max(0, 1 - t * t)));
      const ti = (R - T) / R, inner = Math.abs(t) < ti ? Math.round((R - T) * Math.sqrt(Math.max(0, 1 - (t / ti) * (t / ti)))) : 0;
      if (o <= 0) continue;
      const y = Y + Math.round(dy * squash);
      if (inner <= 0) ctx.fillRect(X - o, y, o * 2, 1);
      else { ctx.fillRect(X - o, y, o - inner, 1); ctx.fillRect(X + inner, y, o - inner, 1); }
    }
  },
  // an octagon, for pads and frames that want to read as round without being round
  oct(ctx, cx, cy, r, fill, stroke, lw = 1) {
    const R = Math.round(r), c = Math.round(R * 0.42);
    ctx.beginPath();
    ctx.moveTo(cx - R + c, cy - R); ctx.lineTo(cx + R - c, cy - R);
    ctx.lineTo(cx + R, cy - R + c); ctx.lineTo(cx + R, cy + R - c);
    ctx.lineTo(cx + R - c, cy + R); ctx.lineTo(cx - R + c, cy + R);
    ctx.lineTo(cx - R, cy + R - c); ctx.lineTo(cx - R, cy - R + c);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  },
  // four-point pixel flare: a bright core with beams. This is what replaced the
  // soft radial glow, and it is the only "light" shape in the game.
  star(ctx, cx, cy, r, col, alpha = 1) {
    const X = Math.round(cx), Y = Math.round(cy), R = Math.max(1, Math.round(r));
    const a = clamp(alpha, 0, 1);
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = col;
    // beams, tapering in steps
    for (let i = 0; i < R; i++) {
      const w = Math.max(1, Math.round((1 - i / R) * R * 0.34));
      ctx.fillRect(X + i, Y - (w >> 1), 1, Math.max(1, w));
      ctx.fillRect(X - i, Y - (w >> 1), 1, Math.max(1, w));
      ctx.fillRect(X - (w >> 1), Y + i, Math.max(1, w), 1);
      ctx.fillRect(X - (w >> 1), Y - i, Math.max(1, w), 1);
    }
    // diagonal spurs, half length
    const D = Math.max(1, Math.round(R * 0.5));
    ctx.globalAlpha = a * 0.4;
    for (let i = 1; i < D; i++) {
      ctx.fillRect(X + i, Y + i, 1, 1); ctx.fillRect(X - i, Y + i, 1, 1);
      ctx.fillRect(X + i, Y - i, 1, 1); ctx.fillRect(X - i, Y - i, 1, 1);
    }
    // core
    ctx.globalAlpha = a;
    const c = Math.max(1, Math.round(R * 0.34));
    ctx.fillRect(X - c, Y - c, c * 2 + 1, c * 2 + 1);
    ctx.globalAlpha = 1;
  },
  // an expanding shockwave as radial dashes rather than a stroked circle
  burst(ctx, cx, cy, r, col, n = 16, seed = 0, squash = 0.7, len = 0.28) {
    const X = Math.round(cx), Y = Math.round(cy), R = Math.max(1, r);
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + ihash(i, seed) * 0.22;
      const dx = Math.cos(a), dy = Math.sin(a) * squash;
      const L = Math.max(2, R * len * (0.6 + ihash(i, seed + 7) * 0.8));
      const w = Math.max(1, Math.round(R * 0.035));
      for (let s = 0; s < L; s += 1.4) {
        ctx.fillRect(Math.round(X + dx * (R + s)), Math.round(Y + dy * (R + s)), w, w);
      }
    }
  },
  // blocky puff, for smoke and dust
  puff(ctx, cx, cy, r, col, seed = 0) {
    const R = Math.max(1, Math.round(r));
    ctx.fillStyle = col;
    const n = clamp(Math.round(R * 0.9), 2, 7);
    for (let i = 0; i < n; i++) {
      const a = ihash(i, seed) * TAU, d = ihash(i, seed + 3) * R * 0.7;
      const s = Math.max(1, Math.round(R * (0.4 + ihash(i, seed + 9) * 0.5)));
      ctx.fillRect(Math.round(cx + Math.cos(a) * d - s / 2), Math.round(cy + Math.sin(a) * d * 0.7 - s / 2), s, s);
    }
  },
  // a flat, ragged puddle: blood on the floor, water off a body
  pool(ctx, cx, cy, r, col, seed = 0, squash = 0.26) {
    const R = Math.max(1, Math.round(r)), X = Math.round(cx), Y = Math.round(cy);
    ctx.fillStyle = col;
    const H = Math.max(1, Math.round(R * squash));
    for (let dy = -H; dy <= H; dy++) {
      const t = dy / (H + 0.001);
      let w = Math.round(R * Math.sqrt(Math.max(0, 1 - t * t)));
      w = Math.max(0, w - Math.round(ihash(dy + 40, seed) * R * 0.16));
      if (w <= 0) continue;
      ctx.fillRect(X - w, Y + dy, w * 2, 1);
    }
  },
  // a surface ripple seen edge on: two ticks travelling apart
  ripple(ctx, cx, cy, r, col, alpha = 1) {
    const X = Math.round(cx), Y = Math.round(cy), R = Math.max(1, Math.round(r));
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.fillStyle = col;
    const w = Math.max(1, Math.round(R * 0.34));
    ctx.fillRect(X - R, Y, w, 1); ctx.fillRect(X + R - w, Y, w, 1);
    if (R > 6) { ctx.globalAlpha = clamp(alpha, 0, 1) * 0.5; ctx.fillRect(X - R + w + 2, Y, Math.max(1, w >> 1), 1); ctx.fillRect(X + R - w - 2, Y, Math.max(1, w >> 1), 1); }
    ctx.globalAlpha = 1;
  },
  // a stepped arc, for cooldown sweeps
  arcSteps(ctx, cx, cy, r, frac, col, n = 16, size = 2) {
    ctx.fillStyle = col;
    const lit = Math.round(clamp(frac, 0, 1) * n);
    for (let i = 0; i < lit; i++) {
      const a = -Math.PI / 2 + (i / n) * TAU;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r - size / 2), Math.round(cy + Math.sin(a) * r - size / 2), size, size);
    }
  },
};
