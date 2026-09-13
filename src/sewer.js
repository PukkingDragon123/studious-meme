'use strict';
// ---------------------------------------------------------------------------
// THE SYSTEM, DRAWN AS A SYSTEM.
//
// A sewer is not a room with a floor and a ceiling. It is a bore: a section of
// masonry with a hole through it, and the hole goes somewhere. Drawing it as a
// flat back wall between two lines gives you a corridor with a pond in it,
// which is what this used to be.
//
// So the tunnel is drawn as a tunnel. The cavity between the invert and the
// crown is filled with nested shells of the same section, each one narrower,
// shorter and darker than the last, sampled a little further out in world x so
// it recedes horizontally as well as vertically. Five of those and the eye
// reads a bore running away from you, with the ring joints, the tide line and
// the light from the shafts all receding along with it. Nothing here is a
// separate backdrop that can drift out of register with the level: every shell
// is the level's own floor and roof profile, scaled.
//
// On top of that goes the near ring — the masonry you are actually swimming
// through. Radial voussoirs round the crown, courses down the haunch, a
// benching fillet where the wall turns into the channel, and the grease line
// the water left when it was higher than it is now.
// ---------------------------------------------------------------------------
const Sewer = {
  SHELLS: 5,
  // how far each shell recedes: wider world sample, shorter section, darker
  SPREAD: 0.46, SQUASH: 0.40, FADE: 0.78,

  // Which works this stretch was built as. null means it is not the system at
  // all — open sky, or the laboratory, which draws itself.
  styleOf(B) {
    if (!B || !B.indoor || B.lab) return null;
    return B.pipe ? 'pipe' : B.roman ? 'stone' : 'brick';
  },

  // the palette for one style, off the biome's own ground tones so a section
  // still reads as its own place
  pal(B, style) {
    const g = B.ground;
    if (style === 'pipe') return {
      face: '#4a5257', lit: '#79848a', mid: '#394045', dark: '#1e2427', void: '#070a0b',
      joint: '#2a3135', slime: '#41533c', grease: '#22281f', wet: '#5d6a6c', course: 26, radial: false,
    };
    if (style === 'stone') return {
      face: shade(g[0], 1.02), lit: shade(g[0], 1.5), mid: shade(g[1], 0.92), dark: shade(g[2], 0.64), void: '#0a0806',
      joint: shade(g[2], 0.5), slime: '#5d6a33', grease: '#2a2418', wet: shade(g[0], 1.2), course: 22, radial: true,
    };
    return {
      face: shade(g[0], 0.94), lit: shade(g[0], 1.42), mid: shade(g[1], 0.86), dark: shade(g[2], 0.6), void: '#050809',
      joint: shade(g[2], 0.46), slime: '#46602f', grease: '#1d2317', wet: shade(g[0], 1.18), course: 14, radial: true,
    };
  },

  // ---- the section across the screen, sampled once a frame ----------------
  // The near ring, in screen space. Everything behind it is this same outline
  // scaled toward the vanishing point, which is how a tunnel actually recedes:
  // the far rings are the near ring, smaller, not a different profile sampled
  // somewhere else. Sampling somewhere else is what turned the old backdrop
  // into a black hill sitting in the middle of the shot.
  section(cam, step) {
    const W = G.W, n = Math.ceil((W + step * 3) / step);
    const out = { n, sx: new Float64Array(n), top: new Float64Array(n), bot: new Float64Array(n), ok: new Uint8Array(n), wx: new Float64Array(n) };
    for (let i = 0; i < n; i++) {
      const sx = -step + i * step, wx = cam.toWorldX(sx);
      const rf = World.roofY(wx), fl = World.floorY(wx);
      out.sx[i] = sx; out.wx[i] = wx;
      if (rf === null) { out.ok[i] = 0; out.top[i] = -50; out.bot[i] = G.H + 50; continue; }
      out.top[i] = cam.toScreen(0, rf)[1];
      out.bot[i] = cam.toScreen(0, fl)[1];
      out.ok[i] = 1;
    }
    return out;
  },

  // where the bore runs away to
  vanish(cam) {
    const rf = World.roofY(cam.x), fl = World.floorY(cam.x);
    const mid = rf === null ? 0 : (rf + fl) * 0.5;
    return [G.W / 2, cam.toScreen(0, mid)[1]];
  },

  // one ring as a closed path, scaled about the vanishing point
  path(ctx, S, k, VP) {
    const s = Math.pow(0.82, k);
    const vx = VP[0], vy = VP[1];
    const X = (x) => vx + (x - vx) * s, Y = (y) => vy + (y - vy) * s;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < S.n; i++) { if (!S.ok[i]) continue; const px = X(S.sx[i]), py = Y(S.top[i]); if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py); }
    if (!started) return false;
    for (let i = S.n - 1; i >= 0; i--) { if (!S.ok[i]) continue; ctx.lineTo(X(S.sx[i]), Y(S.bot[i])); }
    ctx.closePath();
    return true;
  },

  draw(ctx, cam, day) {
    const W = G.W, H = G.H, z = cam.zoom, step = Math.max(3, Math.round(3 * z));
    const B = Biome.mixPal(cam.x), style = this.styleOf(Biome.at(cam.x));
    if (!style) return false;
    const P = this.pal(B, style);
    const VP = this.vanish(cam);

    // --- the solid: everything is masonry until the bore is cut out of it ---
    ctx.fillStyle = P.mid; ctx.fillRect(0, 0, W, H);
    this.masonry(ctx, cam, P, style, 0);

    // --- the bore, five rings deep, near ring first ------------------------
    const near = this.section(cam, step);
    for (let k = 0; k < this.SHELLS; k++) {
      ctx.save();
      if (!this.path(ctx, near, k, VP)) { ctx.restore(); continue; }
      ctx.clip();
      const u = k / (this.SHELLS - 1);
      ctx.fillStyle = k === this.SHELLS - 1 ? P.void : mixColor(P.face, P.void, Math.pow(u, 0.75) * 0.95);
      ctx.fillRect(0, 0, W, H);
      if (k < 2) this.masonry(ctx, cam, P, style, k + 1);
      this.tide(ctx, cam, near, P, k, VP);
      ctx.restore();
      // the lit lip on the mouth of each ring: five fills only read as five
      // rings once each one has an edge catching the light
      if (k > 0 && k < this.SHELLS - 1) {
        ctx.save(); ctx.globalAlpha = 0.8 * (1 - u * 0.45);
        ctx.strokeStyle = mixColor(P.lit, P.void, u * 0.62); ctx.lineWidth = Math.max(1, Math.round(2.4 * z));
        this.path(ctx, near, k, VP); ctx.stroke(); ctx.restore();
      }
    }

    // --- the near ring: the arch you are actually inside -------------------
    this.nearRing(ctx, cam, near, P, style, step);
    this.fittings(ctx, cam, near, P, style);
    this.crownDetail(ctx, cam, near, P, style, World.t);
    return true;
  },

  // What the engineers left in it: an arch rib every bay, a cable run slung
  // between the ribs, and a bulkhead lamp under every other one. The lamps are
  // the whole lighting model down here — a pool of light, then nothing, then
  // another pool — and without them a bore is just a dark hole.
  fittings(ctx, cam, S, P, style) {
    const W = G.W, H = G.H, z = cam.zoom, BAY = 150;
    const leftW = cam.toWorldX(-BAY), rightW = cam.toWorldX(W + BAY);
    const rib = shade(P.face, 0.72), ribL = shade(P.face, 1.3);
    // ribs and the conduit between them
    for (let wx = Math.floor(leftW / BAY) * BAY; wx < rightW; wx += BAY) {
      const rf = World.roofY(wx); if (rf === null) continue;
      const fl = World.floorY(wx);
      const [sx, sy] = cam.toScreen(wx, rf), fy = cam.toScreen(wx, fl)[1];
      const drop = Math.min(fy - sy, (fl - rf) * 0.42 * z);
      ctx.fillStyle = rib; ctx.fillRect(Math.round(sx - 5 * z), Math.round(sy), Math.round(10 * z), Math.round(drop));
      ctx.fillStyle = ribL; ctx.fillRect(Math.round(sx - 5 * z), Math.round(sy), Math.max(1, Math.round(1.6 * z)), Math.round(drop));
      ctx.fillStyle = shade(P.face, 0.5); ctx.fillRect(Math.round(sx + 3 * z), Math.round(sy), Math.max(1, Math.round(2 * z)), Math.round(drop));
      // the cable run to the next rib, sagging
      const nx = wx + BAY, nr = World.roofY(nx);
      if (nr !== null) {
        const [nsx, nsy] = cam.toScreen(nx, nr);
        ctx.strokeStyle = shade(P.face, 0.42); ctx.lineWidth = Math.max(1, Math.round(1.8 * z));
        ctx.beginPath(); ctx.moveTo(sx, sy + 6 * z); ctx.quadraticCurveTo((sx + nsx) / 2, (sy + nsy) / 2 + 13 * z, nsx, nsy + 6 * z); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = Math.max(1, Math.round(z));
        ctx.beginPath(); ctx.moveTo(sx, sy + 5 * z); ctx.quadraticCurveTo((sx + nsx) / 2, (sy + nsy) / 2 + 12 * z, nsx, nsy + 5 * z); ctx.stroke();
      }
    }
    // the lamps, between the ribs
    for (let wx = Math.floor(leftW / BAY) * BAY + BAY / 2; wx < rightW; wx += BAY) {
      const rf = World.roofY(wx); if (rf === null) continue;
      const [lx, ly] = cam.toScreen(wx, rf);
      const seed = ihash(Math.floor(wx / BAY), 9);
      const dead = seed < 0.2;
      const flick = seed < 0.34 ? (Math.sin(World.t * 13 + wx) > -0.35 ? 1 : 0.25) : 1;
      const on = dead ? 0 : flick;
      // the bracket and the fitting under it
      ctx.fillStyle = shade(P.face, 0.45); ctx.fillRect(Math.round(lx - z), Math.round(ly), Math.max(1, Math.round(2 * z)), Math.round(6 * z));
      ctx.fillStyle = '#2a2f30'; ctx.fillRect(Math.round(lx - 7 * z), Math.round(ly + 5 * z), Math.round(14 * z), Math.round(4 * z));
      ctx.fillStyle = on ? mixColor('#ffe8a8', '#ffffff', 0.2 * on) : '#38383a';
      ctx.fillRect(Math.round(lx - 6 * z), Math.round(ly + 8 * z), Math.round(12 * z), Math.round(3 * z));
      if (!on) continue;
      // the pool: a cone down the bore and a disc on whatever is under it
      const su = World.surface(wx), fl = World.floorY(wx);
      const hit = Math.min(su > 0 ? su : fl, fl);
      const hy = cam.toScreen(wx, hit)[1];
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, ly, 0, hy);
      g.addColorStop(0, `rgba(255,226,150,${(0.3 * on).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,214,130,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(lx - 8 * z, ly + 8 * z); ctx.lineTo(lx + 8 * z, ly + 8 * z);
      ctx.lineTo(lx + 44 * z, hy); ctx.lineTo(lx - 44 * z, hy); ctx.closePath(); ctx.fill();
      const rg = ctx.createRadialGradient(lx, ly + 9 * z, 1, lx, ly + 9 * z, 52 * z);
      rg.addColorStop(0, `rgba(255,230,164,${(0.34 * on).toFixed(3)})`); rg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = rg; ctx.fillRect(lx - 52 * z, ly - 30 * z, 104 * z, 104 * z);
      ctx.restore();
      if (chance(0.02)) G.fx.add({ type: 'drop', x: wx + rand(-24, 24), y: rf + 10, vx: 0, vy: 26, s: 1, color: '#9ab0b8', life: 3 });
    }
  },

  // Courses. On the sidewalls they run horizontal; round the arch they turn
  // radial, which is the single thing that stops a tunnel reading as a wall.
  masonry(ctx, cam, P, style, k) {
    const W = G.W, H = G.H, z = cam.zoom;
    const c = P.course;
    const tex = Tex.get('sw|' + style + '|' + P.face + '|' + c, 64, (x, S) => {
      x.fillStyle = P.face; x.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += c) {
        x.fillStyle = P.joint; x.fillRect(0, y, S, 1);
        const off = ((y / c) | 0) % 2 ? c : 0;
        for (let xx = off; xx < S; xx += c * 2) x.fillRect(xx, y, 1, c);
        x.globalAlpha = 0.4; x.fillStyle = P.lit; x.fillRect(0, y + 1, S, 1); x.globalAlpha = 1;
      }
      // the odd blown brick, so the bond is not perfect
      for (let i = 0; i < 26; i++) {
        const bx = Math.floor(ihash(i, 3) * (S / c)) * c, by = Math.floor(ihash(i, 4) * (S / c)) * c;
        x.fillStyle = ihash(i, 5) > 0.5 ? shade(P.face, 0.82) : shade(P.face, 1.12);
        x.fillRect(bx, by + 1, c - 1, c - 1);
      }
    });
    ctx.globalAlpha = k === 0 ? 0.85 : 0.4 / k;
    Tex.fill(ctx, tex, cam.x * (1 + k * 0.3), cam.y, z, 1);
    ctx.globalAlpha = 1;
  },

  // The tide line: the system ran full once and left a band of grease on the
  // masonry, with slime hanging under it. It follows the shell, so it runs
  // away down the tunnel with everything else.
  tide(ctx, cam, S, P, k, VP) {
    const z = cam.zoom, s = Math.pow(0.82, k);
    const [, wy] = cam.toScreen(0, World.surface(cam.x));
    const ty = VP[1] + (wy - VP[1]) * s;
    ctx.globalAlpha = 0.55 - k * 0.09;
    ctx.fillStyle = P.grease; ctx.fillRect(0, Math.round(ty - 6 * z * s), G.W, Math.ceil(6 * z * s));
    ctx.fillStyle = P.slime; ctx.fillRect(0, Math.round(ty), G.W, Math.ceil(3 * z * s));
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = P.slime;
    for (let sx = 0; sx < G.W; sx += Math.max(3, Math.round(7 * z * s))) {
      const h = ihash(Math.floor((cam.x + sx / cam.zoom) / 7) + k * 31, 71);
      if (h > 0.55) continue;
      ctx.fillRect(sx, Math.round(ty + 3 * z * s), Math.max(1, Math.round(2 * z * s)), Math.ceil((2 + h * 16) * z * s));
    }
    ctx.globalAlpha = 1;
  },

  // The arch you are inside: voussoirs round the crown, a haunch course down
  // each side, a benching fillet into the channel, and the wet shine on it.
  nearRing(ctx, cam, S, P, style, step) {
    const W = G.W, H = G.H, z = cam.zoom;
    const TH = 15;                                   // the ring, in world units
    for (let i = 0; i < S.n; i++) {
      if (!S.ok[i]) continue;
      const sx = S.sx[i], top = S.top[i], bot = S.bot[i];
      const wx = S.wx[i];
      const th = TH * z;
      // the crown: a band of masonry with a lit soffit under it
      if (top > -th - 4 && top < H + 4) {
        ctx.fillStyle = P.face; ctx.fillRect(sx, Math.round(top - th), Math.ceil(step), Math.ceil(th));
        ctx.fillStyle = P.lit; ctx.fillRect(sx, Math.round(top - 3 * z), Math.ceil(step), Math.max(1, Math.round(3 * z)));
        ctx.fillStyle = P.joint; ctx.fillRect(sx, Math.round(top), Math.ceil(step), Math.max(1, Math.round(2 * z)));
        // voussoirs: a radial joint every so often round the arch
        if (P.radial && ((wx % P.course) + P.course) % P.course < step / z) {
          ctx.fillStyle = P.joint; ctx.fillRect(sx, Math.round(top - th), Math.max(1, Math.round(1.6 * z)), Math.ceil(th));
        }
      }
      // the invert lip and the benching fillet either side of the channel
      if (bot > -4 && bot < H + th + 4) {
        ctx.fillStyle = P.wet; ctx.fillRect(sx, Math.round(bot - 2 * z), Math.ceil(step), Math.max(1, Math.round(2 * z)));
        ctx.fillStyle = P.dark; ctx.fillRect(sx, Math.round(bot), Math.ceil(step), Math.ceil(6 * z));
      }
    }
    // a deep shadow under the springing on both sides of the shot, so the bore
    // has a top and a bottom rather than reading as a flat cut-out
    const gTop = ctx.createLinearGradient(0, 0, 0, H);
    gTop.addColorStop(0, 'rgba(0,0,0,0.55)'); gTop.addColorStop(0.34, 'rgba(0,0,0,0)');
    gTop.addColorStop(0.72, 'rgba(0,0,0,0)'); gTop.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = gTop; ctx.fillRect(0, 0, W, H);
  },

  // What hangs off the crown: efflorescence, a stalactite here and there, the
  // drip off it, and roots that found a joint.
  crownDetail(ctx, cam, S, P, style, t) {
    const W = G.W, H = G.H, z = cam.zoom;
    const leftW = cam.toWorldX(-40), rightW = cam.toWorldX(W + 40);
    for (let wx = Math.floor(leftW / 34) * 34; wx < rightW; wx += 34) {
      const h = ihash(Math.floor(wx / 34), 617);
      const rf = World.roofY(wx); if (rf === null) continue;
      const [sx, sy] = cam.toScreen(wx, rf);
      if (sy < -30 || sy > H + 10) continue;
      if (h < 0.22) {
        // a lime stalactite, and the drip that made it
        const len = (4 + h * 26) * z;
        ctx.fillStyle = mixColor(P.lit, '#e8e4d0', 0.5);
        for (let d = 0; d < len; d += Math.max(1, Math.round(2 * z))) {
          const w2 = Math.max(1, Math.round((3 - 3 * d / len) * z));
          ctx.fillRect(Math.round(sx - w2 / 2), Math.round(sy + d), w2, Math.max(1, Math.round(2 * z)));
        }
        if (chance(0.006)) G.fx.add({ type: 'drop', x: wx, y: rf + len / z, vx: 0, vy: 40, s: 1, color: '#a8c0c0', life: 3 });
      } else if (h < 0.44) {
        // efflorescence bleeding out of a joint
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = mixColor(P.lit, '#ffffff', 0.55);
        ctx.fillRect(Math.round(sx - 3 * z), Math.round(sy), Math.ceil(6 * z), Math.ceil((6 + h * 30) * z));
        ctx.globalAlpha = 1;
      } else if (h < 0.52 && style !== 'pipe') {
        // a root that got in and is doing the rest of the damage slowly
        ctx.strokeStyle = mixColor('#6a5a38', P.dark, 0.35); ctx.lineWidth = Math.max(1, Math.round(1.4 * z));
        ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + 6 * z, sy + 14 * z, sx - 8 * z, sy + 22 * z, sx + 2 * z, sy + 38 * z);
        ctx.stroke();
      }
    }
  },
};
