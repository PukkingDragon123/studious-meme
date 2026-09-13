'use strict';
// ---------------------------------------------------------------------------
// DISPOSAL.
//
// There is no helicopter for the sewer. Nobody flies a specimen out to a
// municipal trunk main and lowers it gently into the water. What happens is
// that two people in coveralls strap the transport tank to a trolley, wheel it
// down a corridor with a painted line on the floor, stop at a hatch that says
// what the hatch is for, and tip it.
//
// You do not get out of the tank. The glass is an inch thick and the lid is
// bolted. Everything you do in here is thrashing, and thrashing is what they
// expected, which is why there are straps.
//
// Then the chute. Fifteen seconds of wet concrete falling away under you at an
// angle somebody calculated once in 1974, with grates and stub pipes and valve
// bodies in it, and the only thing you control is which side of it you are on.
// ---------------------------------------------------------------------------
const DELIVERY_PHASES = [
  { id: 'strap', len: 4.2, line: 'SUBJECT SECURED' },
  { id: 'carry', len: 6.4, line: 'IN TRANSIT' },
  { id: 'hatch', len: 3.6, line: 'DISPOSAL HATCH 4' },
  { id: 'tip', len: 2.6, line: 'RELEASE' },
  { id: 'slide', len: 15.0, line: 'STORMWAY 9' },
  { id: 'splash', len: 1.6, line: '' },
];
// The opening is the same corridor with a different ending. They are not
// throwing you away: they are moving you to another building, in a bigger
// tank, and the tank is the mistake. You go through the glass, across the
// floor, into a drain, and then down — twenty seconds of a chute nobody has
// been down since it was cut, so narrow your flanks touch both walls — into
// the Roman level, where the maps stop.
const OPENING_PHASES = [
  { id: 'strap', len: 2.8, line: 'TRANSFER ORDER 11' },
  { id: 'carry', len: 5.2, line: 'FACILITY B  INBOUND' },
  { id: 'break', len: 14, line: 'CONTAINMENT INTACT', hold: true },   // interactive: it ends when the glass does
  { id: 'loose', len: 2.4, line: 'BREACH' },
  { id: 'drain', len: 3.2, line: 'THE DRAIN' },
  { id: 'slide', len: 20.0, line: 'THE OLD SYSTEM' },
  { id: 'splash', len: 1.6, line: '' },
];

const Delivery = {
  begin(stage, opening) {
    const P = G.player;
    G.deliv = {
      t: 0, stage, phase: 'strap', opening: !!opening,
      seq: opening ? OPENING_PHASES : DELIVERY_PHASES, pi: 0, pt: 0,
      taps: 0, need: 7, crack: 0, shards: 0, flood: 0, crawl: 0,
      bang: 0, thrash: 0, tilt: 0,
      // the slide: you are a dot on a chute that scrolls under you
      lane: 0, laneV: 0, spd: 0, dist: 0, hits: 0, sparks: 0,
      obst: [], nextObst: 0, roll: 0, done: false,
      name: (stage && stage.name) || 'THE SYSTEM', sub: (stage && stage.sub) || '',
    };
    G.state = 'delivery';
    P.frozen = true; P.invuln = 60; P.hidden = true;
    G.banner = null;
    SFX.warning && SFX.warning();
  },
  // phases run in sequence; one of them (the glass) only ends when you end it
  phaseAt(t) { const D = G.deliv; return D ? D.seq[D.pi] : DELIVERY_PHASES[0]; },
  local(D) { const p = D.seq[D.pi]; return { p, u: clamp(D.pt / p.len, 0, 1) }; },
  next(D) { if (D.pi < D.seq.length - 1) { D.pi++; D.pt = 0; } },

  update(raw) {
    const D = G.deliv, P = G.player; if (!D) return;
    D.t += raw; D.pt += raw;
    const { p, u } = this.local(D);
    D.phase = p.id;
    if (D.bang > 0) D.bang -= raw;
    if (D.sparks > 0) D.sparks -= raw;
    // a timed phase ends on its clock; the glass ends when you break it
    if (!p.hold && D.pt >= p.len && p.id !== 'splash') { this.next(D); return; }

    // you are in a box and you are furious about it. In the disposal run that
    // changes nothing; in the transfer the tank is bigger, the glass is
    // thinner, and every hit is a crack.
    const mashing = Input.down('Space', 'KeyZ', 'KeyJ') || Input.mouse.down || (Input.touch && Input.touch.bite);
    const tapped = Input.bitePressed() || Input.mouse.clicked;
    if (p.id === 'strap' || p.id === 'carry' || p.id === 'hatch' || p.id === 'tip' || p.id === 'break') {
      D.thrash = lerp(D.thrash, mashing ? 1 : 0.18 + Math.abs(Math.sin(D.t * 2.2)) * 0.2, 0.12);
      if (mashing && chance(raw * 9)) { D.bang = 0.22; G.shake(2.2); SFX.thud && SFX.thud(0); }
    }
    if (p.id === 'break') {
      if (tapped) {
        D.taps++; D.crack = D.taps / D.need; D.bang = 0.3;
        G.shake(4 + D.taps * 1.5); G.hitstop(0.04); SFX.crack && SFX.crack(D.taps);
        for (let i = 0; i < 4 + D.taps * 3; i++) G.fx.add({ type: 'splinter', x: G.W * 0.5 + rand(-30, 30), y: G.H - 110 + rand(-24, 24), vx: rand(-90, 90), vy: rand(-120, 20), s: 1, w: randi(1, 3), color: choice(['#cfeef4', '#9fc4cc', '#e8f4f8']), rot: rand(TAU), vr: rand(-8, 8), life: rand(0.8, 1.6) });
        if (D.taps >= D.need) {
          this.next(D);
          G.whiteFlash(0.7); G.shake(18); G.slowmo(0.3, 0.9); SFX.hatch && SFX.hatch(); SFX.splinter && SFX.splinter(0);
          D.shards = 1;
          for (const [px, f] of [[-96, -1], [-130, -1], [110, 1]]) D['flee' + f + px] = 0;
        }
      }
      // give it long enough and the pressure finishes what you started
      if (D.pt > p.len - 0.1 && D.taps < D.need) { D.taps = D.need; D.crack = 1; this.next(D); G.whiteFlash(0.5); G.shake(12); }
    }
    if (p.id === 'loose') { D.flood = Math.min(1, D.flood + raw * 0.9); D.shards = Math.max(0, D.shards - raw * 0.5); }
    if (p.id === 'drain') { D.crawl = u; D.flood = Math.max(0.35, D.flood - raw * 0.2); if (u > 0.86 && !D.dropped) { D.dropped = true; SFX.splash && SFX.splash(0.6); G.shake(3); } }

    if (p.id === 'carry') D.roll += raw * 210;
    if (p.id === 'tip') D.tilt = lerp(D.tilt, u * 1.5, 0.12);

    // ---- the chute ----------------------------------------------------
    if (p.id === 'slide') {
      D.spd = lerp(D.spd, 1, 0.02);
      D.dist += raw * (260 + D.spd * 340);
      // steering: lean, and the lean carries because it is wet concrete
      const ix = (Input.down('ArrowLeft', 'KeyA') ? -1 : 0) + (Input.down('ArrowRight', 'KeyD') ? 1 : 0)
        + (Input.joy ? Input.joy.x : 0) + (Input.mouse.down ? sign(Input.mouse.x - G.W / 2) * 0.9 : 0);
      D.laneV = approach(D.laneV, clamp(ix, -1, 1) * 2.5, raw * 7);
      D.lane = clamp(D.lane + D.laneV * raw, -1, 1);
      if (Math.abs(D.lane) >= 0.995) D.laneV *= -0.25;
      // the old chute is so narrow that either wall is a scrape
      if (D.opening && Math.abs(D.lane) > 0.62) {
        if (chance(raw * 14)) { D.sparks = Math.max(D.sparks, 0.12); G.shake(1.5); if (chance(0.3)) SFX.ricochet && SFX.ricochet(0); }
        P.hp = Math.max(1, P.hp - P.maxHp * 0.012 * raw);
      }
      // things bolted into the chute, coming up at you
      D.nextObst -= raw;
      if (D.nextObst <= 0) {
        D.nextObst = D.opening ? lerp(1.5, 0.9, u) : lerp(1.1, 0.55, u);
        const kinds = ['grate', 'stub', 'valve'];
        D.obst.push({ d: D.dist + 900, lane: rand(-0.85, 0.85), w: rand(0.34, 0.6), kind: choice(kinds), hit: false });
      }
      for (const o of D.obst) {
        const rel = o.d - D.dist;
        if (rel < 0) continue;
        if (rel < 26 && !o.hit && Math.abs(D.lane - o.lane) < o.w) {
          o.hit = true; D.hits++; D.sparks = 0.3; G.shake(7);
          SFX.thud && SFX.thud(0); SFX.ricochet && SFX.ricochet(0);
          P.hp = Math.max(1, P.hp - P.maxHp * 0.045);
          D.spd *= 0.55; D.laneV = -sign(D.lane - o.lane) * 1.6;
        }
      }
      D.obst = D.obst.filter(o => o.d - D.dist > -120);
      if (chance(raw * 30)) G.fx.add({ type: 'drop', x: rand(0, G.W), y: rand(0, G.H), vx: 0, vy: 400, s: 1, color: '#9fc0b8', life: 0.4 });
    }

    if (p.id === 'splash' && !D.done && u > 0.45) { D.done = true; this.finish(); return; }
    // skippable, but not before they have actually thrown you in
    if (Input.hit('Escape') && D.t > 1) this.finish();
  },

  // ---------------------------------------------------------------------
  draw(ctx) {
    const D = G.deliv; if (!D) return;
    const W = G.W, H = G.H;
    const { p, u } = this.local(D);
    if (p.id === 'slide') return this.drawSlide(ctx, D, u);
    if (p.id === 'splash') return this.drawSplash(ctx, D, u);
    this.drawLab(ctx, D, p, u);
  },

  // the corridor, the trolley, the tank and the two people pushing it
  drawLab(ctx, D, p, u) {
    const W = G.W, H = G.H, t = D.t;
    // corridor: block wall, a painted line, strip lights going by
    ctx.fillStyle = '#0b1418'; ctx.fillRect(0, 0, W, H);
    const scroll = p.id === 'carry' ? D.roll : p.id === 'hatch' ? D.roll + u * 40 : (p.id === 'break' || p.id === 'loose' || p.id === 'drain') ? D.roll : 0;
    for (let y = 0, r = 0; y < H; y += 26, r++) {
      ctx.fillStyle = r % 2 ? '#101e22' : '#0e1a1e'; ctx.fillRect(0, y, W, 25);
      ctx.fillStyle = '#081215'; ctx.fillRect(0, y + 25, W, 1);
      for (let x = -((scroll * 0.6) % 52) + (r % 2 ? 0 : 26); x < W; x += 52) ctx.fillRect(x, y, 1, 25);
    }
    // strip lights overhead, sliding past
    for (let x = -((scroll * 1.4) % 190); x < W + 190; x += 190) {
      ctx.fillStyle = '#1a2226'; ctx.fillRect(Math.round(x), 0, 104, 8);
      ctx.fillStyle = '#cfeee2'; ctx.fillRect(Math.round(x) + 5, 7, 94, 2);
      const g = ctx.createLinearGradient(0, 9, 0, 120);
      g.addColorStop(0, 'rgba(190,230,220,0.13)'); g.addColorStop(1, 'rgba(190,230,220,0)');
      ctx.fillStyle = g; ctx.fillRect(Math.round(x) - 14, 9, 132, 111);
    }
    // the painted line on the floor, and the floor
    const FY = H - 64;
    ctx.fillStyle = '#121c20'; ctx.fillRect(0, FY, W, H - FY);
    ctx.fillStyle = '#1b262a'; ctx.fillRect(0, FY, W, 2);
    ctx.fillStyle = '#7a6a20';
    for (let x = -((scroll * 1.9) % 60); x < W; x += 60) ctx.fillRect(Math.round(x), FY + 26, 34, 3);
    // the transfer corridor has a floor drain in it, which is the whole plot
    const DX = W * 0.80;
    if (D.opening && (p.id === 'break' || p.id === 'loose' || p.id === 'drain')) {
      ctx.fillStyle = '#0a1012'; ctx.fillRect(DX - 22, FY + 6, 44, 14);
      ctx.fillStyle = '#3a4448'; ctx.fillRect(DX - 24, FY + 4, 48, 3);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = '#2a3236'; ctx.fillRect(DX - 20 + k * 7, FY + 8, 3, 10); }
      ctx.fillStyle = '#4a5458'; ctx.fillRect(DX - 24, FY + 4, 48, 1);
      Font.draw(ctx, 'DRAIN', DX, FY + 24, { color: '#5f6f68', align: 'center' });
      // water off the floor running into it
      if (D.flood > 0) { ctx.globalAlpha = 0.5 * D.flood; ctx.fillStyle = '#2a6a58'; ctx.fillRect(0, FY + 2, W, 5); ctx.globalAlpha = 1; }
    }

    // the hatch at the end of the corridor
    if (p.id === 'hatch' || p.id === 'tip') {
      const hx = W * 0.74, open = p.id === 'tip' ? 1 : u;
      ctx.fillStyle = '#0a1013'; ctx.fillRect(hx - 44, FY - 92, 88, 92);
      ctx.fillStyle = '#26343a'; ctx.fillRect(hx - 48, FY - 96, 96, 6);
      ctx.fillStyle = '#3a4a52'; ctx.fillRect(hx - 48, FY - 96, 96, 2);
      // the leaf, rolling up
      const lh = Math.round(86 * (1 - open));
      if (lh > 2) {
        ctx.fillStyle = '#4e5a60'; ctx.fillRect(hx - 42, FY - 90, 84, lh);
        for (let j = 0; j * 12 < lh; j++) { ctx.fillStyle = '#3c4850'; ctx.fillRect(hx - 42, FY - 90 + j * 12, 84, 2); }
        ctx.fillStyle = '#e0c040'; ctx.fillRect(hx - 42, FY - 90 + lh - 4, 84, 3);
        for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? '#1a1a1a' : '#e0c040'; ctx.fillRect(hx - 40 + k * 12, FY - 90 + lh - 10, 10, 5); }
      }
      // what is behind it: nothing, going down
      if (open > 0.05) {
        ctx.fillStyle = '#04080a'; ctx.fillRect(hx - 42, FY - 90 + lh, 84, 90 - lh);
        ctx.fillStyle = 'rgba(120,200,180,0.10)';
        for (let k = 0; k < 5; k++) ctx.fillRect(hx - 40 + k * 18, FY - 86 + lh, 2, 86 - lh);
      }
      // the warning lamp over it
      const lit = Math.floor(t * 5) % 2;
      ctx.fillStyle = lit ? '#ff5030' : '#40181a'; ctx.fillRect(hx - 6, FY - 106, 12, 8);
      if (lit) G.fx.glow && G.fx.glow(0, 0, 0, '#ff5030', 0);
      Font.draw(ctx, 'DISPOSAL', hx, FY - 118, { color: '#8a9a94', align: 'center' });
    }

    // ---- the trolley and the tank ---------------------------------------
    const stopped = p.id === 'break' || p.id === 'loose' || p.id === 'drain';
    const tx = p.id === 'strap' || p.id === 'carry' ? W * 0.36 : stopped ? W * 0.44 : W * 0.5 + u * (p.id === 'tip' ? 40 : 0);
    const ty = FY - 8, tilt = p.id === 'tip' ? D.tilt : Math.sin(t * 3.1) * 0.012 * D.thrash * (D.opening ? 2.4 : 1);
    const broken = p.id === 'loose' || p.id === 'drain';
    ctx.save();
    ctx.translate(Math.round(tx), Math.round(ty));
    ctx.rotate(tilt);
    // trolley frame
    ctx.fillStyle = '#2a3338'; ctx.fillRect(-46, -10, 92, 8);
    ctx.fillStyle = '#3c474e'; ctx.fillRect(-46, -10, 92, 2);
    ctx.fillStyle = '#1a2226'; ctx.fillRect(-40, -2, 7, 9); ctx.fillRect(33, -2, 7, 9);
    // wheels, turning
    for (const wx of [-36, 36]) {
      ctx.fillStyle = '#11181c'; ctx.fillRect(wx - 6, 6, 12, 12);
      ctx.fillStyle = '#39454a';
      const a = D.roll * 0.06 + (wx > 0 ? 1 : 0);
      for (let k = 0; k < 4; k++) { const q = a + k * Math.PI / 4; ctx.fillRect(Math.round(wx + Math.cos(q) * 4) - 1, Math.round(12 + Math.sin(q) * 4) - 1, 2, 2); }
    }
    // the tank: steel base, thick glass, bolted lid, green water. The
    // transfer tank is a size up, because the transfer tank is a mistake.
    const TW = D.opening ? 52 : 36, TH = D.opening ? 74 : 56, TT = -18 - TH;
    ctx.fillStyle = '#25313a'; ctx.fillRect(-TW - 4, -20, TW * 2 + 8, 12);
    if (!broken) {
      ctx.fillStyle = '#0d2420'; ctx.fillRect(-TW, TT, TW * 2, TH);
      const wl = TT + 8;
      ctx.fillStyle = '#1d5a4a'; ctx.fillRect(-TW, wl, TW * 2, TH - 6);
      ctx.fillStyle = '#2a7a62'; ctx.fillRect(-TW, wl, TW * 2, 3);
      // the animal, thrashing. Its own chain is out in the world somewhere, so
      // this uses the preview rig, which is solved in local space.
      {
        const sw = Math.sin(t * (7 + D.thrash * 9)) * (3 + D.thrash * 7);
        ctx.save();
        ctx.beginPath(); ctx.rect(-TW, TT, TW * 2, TH); ctx.clip();
        ctx.translate(sw * 0.35, TT + TH * 0.62 + Math.cos(t * 5) * 2);
        ctx.rotate(sw * 0.05);
        this.croc(ctx, D.opening ? 0.9 : 0.62, 5 + D.thrash * 7);
        ctx.restore();
      }
      // glass: rim light, condensation, and in the transfer tank the cracks
      // you are putting in it
      ctx.globalAlpha = 0.26; ctx.fillStyle = '#cfeee6'; ctx.fillRect(-TW + 4, TT + 4, 4, TH - 8); ctx.globalAlpha = 1;
      if (D.bang > 0) { ctx.globalAlpha = Math.min(1, D.bang * 3); ctx.fillStyle = '#dffdf4'; ctx.fillRect(-TW, TT, TW * 2, TH); ctx.globalAlpha = 1; }
      if (D.crack > 0) {
        ctx.strokeStyle = 'rgba(240,255,250,0.9)'; ctx.lineWidth = 1;
        const n = Math.round(D.crack * 12);
        for (let k = 0; k < n; k++) {
          const a0 = ihash(k, 7) * TAU, len = 10 + ihash(k, 9) * 26 * D.crack;
          let x0 = Math.round(ihash(k, 11) * 30 - 15), y0 = Math.round(TT + TH * 0.5 + (ihash(k, 13) - 0.5) * 30);
          ctx.beginPath(); ctx.moveTo(x0 + 0.5, y0 + 0.5);
          for (let q = 0; q < 4; q++) { const a = a0 + (ihash(k * 5 + q, 17) - 0.5) * 1.2; x0 += Math.round(Math.cos(a) * len / 4); y0 += Math.round(Math.sin(a) * len / 4); ctx.lineTo(x0 + 0.5, y0 + 0.5); }
          ctx.stroke();
        }
      }
      ctx.strokeStyle = 'rgba(210,240,235,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(-TW - 0.5, TT - 0.5, TW * 2 + 1, TH + 1);
    } else {
      // the frame with the glass gone out of it: jagged stumps, dripping
      ctx.fillStyle = '#0d2420'; ctx.fillRect(-TW, TT, TW * 2, 6);
      ctx.fillStyle = 'rgba(210,240,235,0.6)';
      for (let k = 0; k < 9; k++) { const h2 = 4 + ihash(k, 21) * 16; ctx.fillRect(-TW + k * (TW * 2 / 9), TT + 6, 3, h2); ctx.fillRect(-TW + k * (TW * 2 / 9) + 1, -18 - 4 - ihash(k, 23) * 10, 2, 4 + ihash(k, 23) * 10); }
      ctx.fillStyle = '#1d5a4a'; ctx.fillRect(-TW, -24, TW * 2, 6);
    }
    // lid, bolted
    ctx.fillStyle = '#2e3a42'; ctx.fillRect(-TW - 4, TT - 8, TW * 2 + 8, 9);
    ctx.fillStyle = '#44525c'; ctx.fillRect(-TW - 4, TT - 8, TW * 2 + 8, 2);
    for (let k = 0; k < 6; k++) { ctx.fillStyle = '#6a7a84'; ctx.fillRect(-TW + 1 + k * (TW * 2 - 6) / 5, TT - 6, 4, 4); }
    // straps over the lid
    ctx.fillStyle = '#3a2e1e'; ctx.fillRect(-TW - 6, TT + 8, TW * 2 + 12, 5); ctx.fillRect(-TW - 6, TT + TH * 0.55, TW * 2 + 12, 5);
    ctx.fillStyle = '#8a7a4a'; ctx.fillRect(-8, TT + 6, 16, 9); ctx.fillRect(-8, TT + TH * 0.55 - 2, 16, 9);
    // stencil, on the glass, so gone with it
    if (!broken) {
      Font.draw(ctx, D.opening ? 'TRANSFER' : 'LIVE', 0, TT + 16, { color: '#cfe0d8', align: 'center' });
      Font.draw(ctx, D.opening ? 'SUBJECT 11' : 'SPECIMEN', 0, TT + 24, { color: '#6f8f88', align: 'center' });
    }
    ctx.restore();

    // ---- out of the tank --------------------------------------------------
    if (broken) {
      // glass all over the floor, water spreading from the trolley
      ctx.globalAlpha = 0.6 * D.flood; ctx.fillStyle = '#1d5a4a';
      ctx.fillRect(Math.round(tx - 60 - D.flood * 90), FY, Math.round(120 + D.flood * 180), 3);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#cfeef4';
      for (let k = 0; k < 26; k++) ctx.fillRect(Math.round(tx - 60 + ihash(k, 31) * 150), FY - 1 - Math.round(ihash(k, 37) * 2), 1 + Math.round(ihash(k, 41) * 2), 1);
      // the animal, on the floor, then going for the drain
      const cx0 = tx + 8, cx1 = DX - 2;
      const k = p.id === 'loose' ? Math.min(1, u * 1.6) : 1;
      const cx2 = p.id === 'drain' ? lerp(cx0, cx1, D.crawl) : cx0;
      const sink = p.id === 'drain' && D.crawl > 0.86 ? (D.crawl - 0.86) / 0.14 : 0;
      ctx.save();
      ctx.translate(Math.round(cx2), Math.round(FY - 4 + sink * 22));
      ctx.rotate(p.id === 'loose' ? (1 - k) * 0.6 + Math.sin(t * 9) * 0.05 * (1 - k) : Math.sin(t * 8) * 0.03 + sink * 0.9);
      if (sink < 1) this.croc(ctx, 0.9, p.id === 'drain' ? 6 : 8);
      ctx.restore();
      if (p.id === 'drain' && D.crawl > 0.2 && D.crawl < 0.86 && chance(0.4)) G.fx.add({ type: 'drop', x: cx2 - 10, y: FY - 2, vx: rand(-30, 30), vy: -rand(10, 40), s: 1, color: '#8ce8a0', life: 0.5 });
    }

    // ---- the two who are pushing it -------------------------------------
    if (broken) {
      // gone, or going: they run left, arms up, and do not look back
      const run = p.id === 'loose' ? u : 1 + u;
      for (const [ox, f] of [[-72, -1], [-104, -1]]) {
        const px2 = tx + ox - run * 260;
        if (px2 > -30) this.worker(ctx, px2, FY - 2, f, Math.sin(t * 16 + ox), t, true);
      }
    } else if (p.id !== 'tip' || u < 0.5) {
      for (const [ox, f] of [[-72, 1], [-104, 1]]) {
        const px2 = tx + ox, step = p.id === 'carry' ? Math.sin(D.roll * 0.08 + (ox < -80 ? 1.4 : 0)) : p.id === 'break' ? Math.sin(t * 3) * 0.3 : 0;
        this.worker(ctx, px2, FY - 2, f, step, t);
      }
    }
    if (p.id === 'hatch' || p.id === 'tip') this.worker(ctx, W * 0.74 + 56, FY - 2, -1, 0, t);

    this.chrome(ctx, D, p);
  },
  // the specimen itself, at whatever scale the shot wants
  croc(ctx, scale, agitation) {
    if (!this._v) { this._v = CrocView.make(); this._v.t = 1.1; }
    const v = this._v;
    CrocView.update(v, 1 / 60, Math.max(1.2, 7 - agitation * 0.5));
    const P = G.player;
    const parts = (P && P.parts && P.parts.head) ? P.parts : null;
    if (!parts) { ctx.fillStyle = '#5f7048'; ctx.fillRect(-22 * scale, -4 * scale, 44 * scale, 8 * scale); return; }
    CrocView.draw(ctx, v, parts, 0, 0, scale);
  },
  // a person in coveralls, seen from the side, walking
  worker(ctx, x, y, f, step, t, panic) {
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + (f > 0 ? a : -a - w)), Math.round(y + b), Math.max(1, w), Math.max(1, h)); };
    const sw = Math.sin(step * 1) * (panic ? 7 : 4);
    if (panic) { px(6, -58, 4, 18, '#e8e4d0'); px(-8, -56, 4, 16, '#e8e4d0'); }   // arms in the air
    px(-4 + sw * 0.4, -18, 5, 18, '#2c3a44');           // legs
    px(0 - sw * 0.4, -18, 5, 18, '#26333c');
    px(-6 + sw * 0.4, -2, 8, 3, '#14181c');
    px(-1 - sw * 0.4, -2, 8, 3, '#14181c');
    px(-7, -42, 15, 25, '#e8e4d0');                      // coverall
    px(-7, -42, 4, 25, '#c8c4b0');
    px(-7, -30, 15, 2, '#b0ac98');
    px(6, -40, 4, 16, '#e8e4d0');                        // arm out to the handle
    px(9, -26, 4, 3, '#d0a884');
    px(-4, -52, 10, 11, '#d0a884');                      // head
    px(-4, -52, 10, 3, '#3a2a18');
    px(2, -47, 2, 2, '#141414');
    px(-6, -55, 14, 4, '#ffd23a');                       // hard hat
  },
  // the chute: fifteen seconds of wet concrete
  drawSlide(ctx, D, u) {
    const W = G.W, H = G.H;
    // a bore falling away from the camera: one vanishing point, rings of
    // brickwork drawn far-to-near so the near ones frame the far ones.
    const cx = W / 2, vy = Math.round(H * 0.46);
    const wallAt = k => lerp(16, D.opening ? 215 : 330, k * k);          // k: 0 far, 1 near
    const yAt = () => vy;                              // one vanishing point, dead ahead
    ctx.fillStyle = '#05090b'; ctx.fillRect(0, 0, W, H);

    const RINGS = 22, SP = 1 / RINGS;
    const scroll = ((D.dist * 0.0018) % SP);
    const kAt = i => 1 - (i * SP + scroll);
    const ringRect = k => {
      const hw = wallAt(k), hh = hw * 0.62;
      return [cx - hw, vy - hh, hw * 2, hh * 2];
    };
    // the dark at the end of it
    {
      const [x, y, w2, h2] = ringRect(kAt(RINGS - 1));
      ctx.fillStyle = '#020405'; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w2), Math.round(h2));
    }
    for (let i = RINGS - 2; i >= 0; i--) {
      const k = kAt(i), kf = kAt(i + 1);
      if (k <= 0 || k > 1.06) continue;
      const [ox, oy, ow, oh] = ringRect(k), [ix, iy, iw, ih] = ringRect(kf);
      const lit = 0.82 - k * 0.56;                      // the bore falls away into light
      ctx.beginPath();
      ctx.rect(Math.round(ox), Math.round(oy), Math.round(ow), Math.round(oh));
      ctx.rect(Math.round(ix), Math.round(iy), Math.round(iw), Math.round(ih));
      const band = i % 2 ? 1.0 : 0.82;
      ctx.fillStyle = 'rgb(' + Math.round(12 + band * lit * 26) + ',' + Math.round(20 + band * lit * 48) + ',' + Math.round(23 + band * lit * 52) + ')';
      ctx.fill('evenodd');
      // standing water in the bottom of each ring of the bore
      const fy = Math.round(oy + oh), fyi = Math.round(iy + ih);
      ctx.fillStyle = 'rgba(90,190,170,' + (0.05 + k * 0.10).toFixed(3) + ')';
      ctx.fillRect(Math.round(ox), fyi, Math.round(ow), Math.max(1, fy - fyi));
      // the mortar seam at the mouth of each ring
      ctx.strokeStyle = 'rgba(150,215,200,' + (0.05 + k * 0.16).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(ox) + 0.5, Math.round(oy) + 0.5, Math.round(ow) - 1, Math.round(oh) - 1);
      // a service lamp every few rings, on alternating sides
      if (i % 4 === 1 && k > 0.16 && k < 0.95) {
        const side = (i % 8 === 1) ? -1 : 1;
        const lx = cx + side * (wallAt(k) * 0.88), ly = vy - wallAt(k) * 0.40;
        const s2 = Math.max(1, Math.round(k * 5));
        const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, 30 + k * 90);
        gl.addColorStop(0, 'rgba(190,230,150,' + (0.20 * k).toFixed(3) + ')');
        gl.addColorStop(1, 'rgba(190,230,150,0)');
        ctx.fillStyle = gl; ctx.fillRect(lx - 120, ly - 120, 240, 240);
        ctx.fillStyle = '#cfe8a0'; ctx.fillRect(Math.round(lx - s2 / 2), Math.round(ly - s2 / 2), s2, s2);
      }
    }
    // the water sheeting down the floor of it
    for (let i = 0; i < 34; i++) {
      const k = 1 - (((i * 29 + D.dist * 0.9) % 620) / 620);
      if (k <= 0.02) continue;
      const hw = wallAt(k);
      ctx.fillStyle = 'rgba(150,220,200,' + (0.05 + k * 0.15).toFixed(3) + ')';
      ctx.fillRect(Math.round(cx + rand(-hw * 0.82, hw * 0.82)), Math.round(vy + hw * 0.30), Math.max(1, Math.round(k * 3)), Math.round(4 + k * 26));
    }

    // what is bolted into it
    for (const o of D.obst) {
      const rel = o.d - D.dist;
      if (rel < -40 || rel > 700) continue;
      const k = clamp(1 - rel / 700, 0, 1);
      const hw = wallAt(k), yy = vy + hw * 0.62;
      const ox = cx + o.lane * hw * 0.72, ow = Math.round(o.w * hw * 0.9), oh = Math.round(6 + k * 52);
      if (o.kind === 'grate') {
        ctx.fillStyle = o.hit ? '#6a4a3a' : '#43505a'; ctx.fillRect(Math.round(ox - ow / 2), Math.round(yy - oh), ow, oh);
        ctx.fillStyle = '#222c33';
        for (let b = 0; b < 5; b++) ctx.fillRect(Math.round(ox - ow / 2 + b * ow / 5), Math.round(yy - oh), 2, oh);
      } else if (o.kind === 'stub') {
        ctx.fillStyle = o.hit ? '#6a4a3a' : '#4e453a'; ctx.fillRect(Math.round(ox - ow / 2), Math.round(yy - oh), ow, oh);
        ctx.fillStyle = '#2a251e'; ctx.fillRect(Math.round(ox - ow / 2 + 2), Math.round(yy - oh + 2), Math.max(1, ow - 4), Math.max(1, oh - 4));
      } else {
        ctx.fillStyle = o.hit ? '#6a4a3a' : '#5a4a52'; ctx.fillRect(Math.round(ox - ow / 2), Math.round(yy - oh), ow, oh);
        ctx.fillStyle = '#8a3a30'; ctx.fillRect(Math.round(ox - ow / 4), Math.round(yy - oh * 0.7), Math.round(ow / 2), 4);
      }
    }

    // you, on your back, going down it, close to the camera
    {
      const pk = 0.62, hw = wallAt(pk), floorY = vy + hw * 0.62;
      const px2 = cx + D.lane * hw * 0.70, py = floorY - 14;
      // the sheet of water you are riding
      ctx.fillStyle = 'rgba(150,225,205,0.16)';
      ctx.fillRect(Math.round(px2 - 54), Math.round(floorY - 3), 108, 6);
      ctx.save();
      ctx.translate(Math.round(px2), Math.round(py));
      ctx.rotate(D.lane * 0.35 + Math.sin(D.t * 12) * 0.05);
      this.croc(ctx, 1.5, 9);
      ctx.restore();
      // spray off you
      if (chance(0.6)) G.fx.add({ type: 'drop', x: px2 + rand(-16, 16), y: py + 8, vx: rand(-60, 60), vy: rand(-30, 60), s: 1, color: '#bfe0d8', life: 0.5 });
    }
    if (D.sparks > 0) {
      ctx.globalAlpha = D.sparks * 3; ctx.fillStyle = '#ffd06a';
      for (let k = 0; k < 12; k++) ctx.fillRect(Math.round(cx + rand(-120, 120)), Math.round(H * 0.55 + rand(-30, 30)), 2, 2);
      ctx.globalAlpha = 1;
    }
    // speed streaks at the edge
    ctx.fillStyle = 'rgba(200,240,230,0.12)';
    for (let k = 0; k < 14; k++) { const yy = (k * 53 + D.dist * 2.4) % H; ctx.fillRect(6, Math.round(yy), 3, 30); ctx.fillRect(W - 9, Math.round((yy + 120) % H), 3, 30); }
    this.chrome(ctx, D, this.phaseAt(D.t));
    // and the one control it has
    Font.draw(ctx, 'LEAN', 12, H - 30, { color: '#6f8f88' });
    const secs = Math.max(0, Math.ceil(D.seq[D.pi].len - D.pt));
    Font.draw(ctx, String(secs), G.W - 12, 30, { color: '#cfe8e0', align: 'right', scale: 2 });
    if (D.hits) Font.draw(ctx, 'HIT ' + D.hits, G.W - 12, 48, { color: '#ff8060', align: 'right' });
  },
  drawSplash(ctx, D, u) {
    const W = G.W, H = G.H;
    ctx.fillStyle = '#04090b'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = clamp(1 - u * 1.4, 0, 1);
    ctx.fillStyle = '#bfe0d8';
    for (let k = 0; k < 60; k++) { const a = ihash(k, 3) * TAU, r = (0.2 + ihash(k, 9)) * u * 420; ctx.fillRect(Math.round(W / 2 + Math.cos(a) * r), Math.round(H / 2 + Math.sin(a) * r * 0.6), 3, 3); }
    ctx.globalAlpha = 1;
  },
  // the caption card, shared by every phase
  chrome(ctx, D, p) {
    const W = G.W, H = G.H;
    ctx.fillStyle = 'rgba(4,10,12,0.72)'; ctx.fillRect(0, 0, W, 22);
    ctx.fillStyle = 'rgba(4,10,12,0.72)'; ctx.fillRect(0, H - 22, W, 22);
    Font.draw(ctx, D.name, 12, 8, { color: '#cfe8e0' });
    Font.draw(ctx, p.line, W - 12, 8, { color: '#6f8f88', align: 'right' });
    Font.draw(ctx, 'ESC  SKIP', W - 12, H - 14, { color: '#3f6f66', align: 'right' });
    if (p.id === 'break') {
      const k = Math.floor(D.t * 3) % 2;
      Font.draw(ctx, 'MASH BITE', W / 2, H - 44, { color: k ? '#ffffff' : '#ffd060', align: 'center', scale: 2, outline: '#0a1a08' });
      // the glass, as a meter
      ctx.fillStyle = '#1a1210'; ctx.fillRect(W / 2 - 41, H - 30, 82, 6);
      ctx.fillStyle = '#cfeef4'; ctx.fillRect(W / 2 - 40, H - 29, Math.round(80 * (1 - D.crack)), 4);
    }
  },

  finish() {
    const D = G.deliv, P = G.player; if (!D) return;
    P.frozen = false; P.hidden = false; P.invuln = 2.5;
    // you come in at the surface, moving, facing into the system
    const surf = World.surface(P.x);
    P.y = surf + 8; P.vy = 220; P.vx = 120;
    P.chain.reset(P.x, P.y, 0.5);
    G.deliv = null; G.state = 'play';
    G.cam.zoom = 1.6;
    G.fx.splash && G.fx.splash(P.x, 2.2, 0);
    Water.splash && Water.splash(P.x, 160, 40);
    SFX.splash && SFX.splash(2);
    G.shake(8);
    if (D.opening) G.banner = { text: 'UNDER ROME', sub: 'THE MAPS STOP HERE. FIND THE WAY OUT.', t: 4.5, max: 4.5, color: '#c8b070' };
    else G.banner = { text: 'IN THE SYSTEM', sub: 'THERE IS NO DOOR ON THE OTHER END', t: 4, max: 4, color: '#8ab820' };
  },
};
