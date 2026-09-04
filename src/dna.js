'use strict';
// ---------------------------------------------------------------------------
// Animated animal icons + the DNA orb that fronts the evolution interface.
// Icons reuse the game's own creature sprites, so what you see on a card is the
// animal you ate.
// ---------------------------------------------------------------------------
const ICONS = {};
(function buildIcons() {
  // kind: how the icon idles. 'swim' wiggles, 'fly' flaps, 'walk' bobs, 'still' breathes.
  const I = (frames, kind, scale) => ({ frames: Array.isArray(frames) ? frames : [frames], kind, scale: scale || 1 });
  SPR.mosquito = [mkSprite(['.W.W.', 'WWWWW', '.bbb.', '..t..'], { W: '#b0d0e0', b: '#5a3030', t: '#8a4040' }),
                  mkSprite(['.....', 'WWWWW', '.bbb.', '..t..'], { W: '#b0d0e0', b: '#5a3030', t: '#8a4040' })];
  SPR.eggIcon = mkSprite(['.eee.', 'eeeee', 'eeeee', 'eeeee', '.eee.'], { e: '#e8e0cc' });
  Object.assign(ICONS, {
    gar: I(SPR.gar, 'swim'), shark: I(SPR.shark, 'swim'), otter: I(SPR.otter, 'swim'), heron: I(SPR.heron, 'still'),
    turtle: I(SPR.turtle, 'still'), python: I(SPR.pythonHead, 'swim'), manatee: I(SPR.manatee, 'swim'), boar: I(SPR.boar, 'walk'),
    ray: I(SPR.ray, 'swim'), panther: I(SPR.panther, 'walk'), vulture: I(SPR.vultureFly, 'fly'), tarpon: I(SPR.tarpon, 'swim'),
    crab: I(SPR.crab, 'walk'), mosquito: I(SPR.mosquito, 'fly'), frog: I(SPR.frog, 'still'), egret: I(SPR.egretFly, 'fly'),
    grouper: I(SPR.grouper, 'swim'), minnow: I(SPR.minnow, 'swim'), eel: I(SPR.eel, 'swim'), human: I(SPR.human, 'walk'),
    boat: I(SPR.kayak, 'still'), croc: I(SPR.babygator, 'swim'), bluegill: I(SPR.bluegill, 'swim'), deer: I(SPR.deer, 'walk'),
    dragonfly: I(SPR.dragonfly, 'fly'), bass: I(SPR.bass, 'swim'), duck: I(SPR.duck, 'still'), egg: I(SPR.eggIcon, 'still'),
  });
})();
// trait id -> icon key
const TRAIT_ICON = {
  garscale: 'gar', sharkskin: 'shark', otterfoot: 'otter', heronneck: 'heron', carapace: 'turtle', pythonjaw: 'python',
  blubber: 'manatee', tusks: 'boar', stingbarb: 'ray', pantherclaw: 'panther', vulturegut: 'vulture', tarponfin: 'tarpon',
  crabclaw: 'crab', skeeter: 'mosquito', froglung: 'frog', garfish: 'gar', snaptongue: 'turtle', hullbreak: 'boat',
  wingsnatch: 'egret', constrict: 'python', bloodscent: 'shark', nighteye: 'panther', goliath: 'grouper', swarm: 'minnow',
  electric: 'eel', ironshell: 'turtle', manhunter: 'human', ancient: 'croc',
};
const PATH_ICON = { ripper: 'shark', behemoth: 'manatee', phantom: 'otter', abyssal: 'eel' };
function iconFor(card) {
  if (!card) return null;
  if (card.kind === 'trait') return ICONS[TRAIT_ICON[card.trait.id]] || ICONS.croc;
  if (card.kind === 'path') return ICONS[PATH_ICON[card.path]] || ICONS.croc;
  return ICONS.dragonfly;
}
// Draw an animated icon centred at (x,y), fitted into a box of `box` pixels.
function drawIcon(ctx, icon, x, y, box, t, opts = {}) {
  if (!icon) return;
  const n = icon.frames.length;
  let f = 0, bob = 0, rot = 0, sq = 1;
  switch (icon.kind) {
    case 'swim': f = n > 1 ? Math.floor(t * 7) % n : 0; bob = Math.sin(t * 3) * 0.06; rot = Math.sin(t * 3) * 0.09; break;
    case 'fly': f = n > 1 ? (Math.sin(t * 11) > 0 ? 0 : 1) : 0; bob = Math.sin(t * 5.5) * 0.12; break;
    case 'walk': f = n > 1 ? Math.floor(t * 6) % n : 0; bob = Math.abs(Math.sin(t * 5)) * -0.09; break;
    default: f = n > 1 ? Math.floor(t * 2) % n : 0; sq = 1 + Math.sin(t * 2.4) * 0.05; break;
  }
  const s = icon.frames[f];
  const k = Math.max(1, Math.floor(box / Math.max(s.w, s.h) * icon.scale)) * (opts.scale || 1);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob * box));
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (rot) ctx.rotate(rot);
  ctx.scale(k * (opts.flip ? -1 : 1), k * sq);
  if (opts.shadow) { ctx.globalAlpha = (opts.alpha ?? 1) * 0.35; ctx.drawImage(spriteWhite(s).c, -s.w / 2 + 1, -s.h / 2 + 1); ctx.globalAlpha = opts.alpha ?? 1; }
  ctx.drawImage(s.c, -Math.round(s.w / 2), -Math.round(s.h / 2));
  ctx.restore();
}

// ---------------------------------------------------------------------------
// DNA ORB: a double helix wound around a glowing sphere. Each acquired trait or
// path node is a base pair on the strand, carrying its animal icon.
// ---------------------------------------------------------------------------
const DNA = {
  // beads: [{color, icon, label}] oldest first
  draw(ctx, cx, cy, R, t, beads, opts = {}) {
    const rungs = opts.rungs || 22, spin = t * (opts.speed || 0.9), tilt = opts.tilt ?? 0.34;
    const glow = opts.glow || '#40f0c8';
    // --- sphere body ---
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R * 1.05);
    g.addColorStop(0, rgba(glow, 0.20)); g.addColorStop(0.55, rgba(glow, 0.07)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, TAU); ctx.fill();
    // latitude rings, for volume
    ctx.strokeStyle = rgba(glow, 0.13); ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const yy = cy - R + (2 * R) * i / 5, rr = Math.sqrt(Math.max(0, R * R - (yy - cy) * (yy - cy)));
      ctx.beginPath(); ctx.ellipse(cx, yy, rr, rr * tilt, 0, 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = rgba(glow, 0.22); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    // --- helix ---
    const pts = [];
    for (let i = 0; i <= rungs; i++) {
      const u = i / rungs, yy = cy - R * 0.94 + u * R * 1.88;
      const rr = Math.sqrt(Math.max(0, R * R - (yy - cy) * (yy - cy))) * 0.92;
      const a = spin + u * Math.PI * 3.4;
      pts.push({
        i, u, y: yy,
        ax: cx + Math.cos(a) * rr, az: Math.sin(a),
        bx: cx + Math.cos(a + Math.PI) * rr, bz: Math.sin(a + Math.PI),
      });
    }
    const dep = z => 0.35 + 0.65 * ((z + 1) / 2);
    // rungs first, back to front
    const order = pts.slice().sort((p, q) => Math.min(p.az, p.bz) - Math.min(q.az, q.bz));
    for (const p of order) {
      const d = dep((p.az + p.bz) / 2);
      ctx.strokeStyle = rgba(glow, 0.10 + 0.28 * d); ctx.lineWidth = Math.max(1, 1.6 * d);
      ctx.beginPath(); ctx.moveTo(p.ax, p.y); ctx.lineTo(p.bx, p.y); ctx.stroke();
    }
    // strand backbones
    for (const side of ['a', 'b']) {
      ctx.beginPath();
      pts.forEach((p, i) => { const X = side === 'a' ? p.ax : p.bx; if (i === 0) ctx.moveTo(X, p.y); else ctx.lineTo(X, p.y); });
      ctx.strokeStyle = rgba(glow, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
    }
    // --- beads on the strand ---
    const slots = [];
    for (let i = 0; i < pts.length; i++) if (i % 2 === 1) slots.push(pts[i]);
    const drawn = [];
    beads.forEach((b, k) => {
      const p = slots[k % slots.length]; if (!p) return;
      const onA = k % 2 === 0;
      drawn.push({ b, x: onA ? p.ax : p.bx, y: p.y, z: onA ? p.az : p.bz });
    });
    drawn.sort((m, n) => m.z - n.z);
    for (const d of drawn) {
      const dp = dep(d.z), r = (opts.beadR || 7) * dp;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(d.b.color, 0.30 * dp); ctx.beginPath(); ctx.arc(d.x, d.y, r * 1.9, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgba('#04100e', 0.85); ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(d.b.color, 0.4 + 0.6 * dp); ctx.lineWidth = 1.5; ctx.stroke();
      if (d.b.icon && dp > 0.55) drawIcon(ctx, d.b.icon, d.x, d.y, r * 1.9, t + d.y * 0.03, { alpha: dp });
    }
    // --- orbiting motes ---
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const a = spin * 1.7 + i * TAU / 14, rr = R * (1.05 + 0.1 * Math.sin(t * 1.3 + i));
      const mx = cx + Math.cos(a) * rr, my = cy + Math.sin(a) * rr * tilt * 1.5;
      ctx.fillStyle = rgba(glow, 0.25 + 0.35 * ((Math.sin(a) + 1) / 2));
      ctx.fillRect(Math.round(mx), Math.round(my), 2, 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  // the player's genome as beads
  beads(P) {
    const out = [];
    for (const key of P.picked) {
      if (key.startsWith('mut:')) { out.push({ color: '#9aa8a0', icon: ICONS.dragonfly, label: key.slice(4) }); continue; }
      const [pk, tier] = key.split(':');
      const path = PATHS[pk]; if (!path) continue;
      out.push({ color: path.color, icon: ICONS[PATH_ICON[pk]], label: path.nodes[+tier].name });
    }
    for (const id of P.traits) { const t = TRAIT_BY_ID[id]; if (t) out.push({ color: t.color, icon: ICONS[TRAIT_ICON[id]], label: t.name }); }
    return out;
  },
  // compact HUD version: a slim helix strip
  drawMini(ctx, x, y, w, h, t, beads, glow) {
    const spin = t * 1.4;
    ctx.strokeStyle = rgba(glow, 0.35); ctx.lineWidth = 1;
    for (const off of [0, Math.PI]) {
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const u = i / 24, px = x + u * w, a = spin + u * Math.PI * 2.6 + off; const py = y + h / 2 + Math.sin(a) * h / 2; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke();
    }
    beads.slice(-8).forEach((b, k) => {
      const u = (k + 0.5) / 8, px = x + u * w, a = spin + u * Math.PI * 2.6 + (k % 2 ? Math.PI : 0);
      const py = y + h / 2 + Math.sin(a) * h / 2, d = 0.45 + 0.55 * ((Math.cos(a) + 1) / 2);
      ctx.fillStyle = rgba(b.color, 0.5 + 0.5 * d); ctx.fillRect(Math.round(px - 1.5 * d), Math.round(py - 1.5 * d), Math.max(2, Math.round(3 * d)), Math.max(2, Math.round(3 * d)));
    });
  },
};
