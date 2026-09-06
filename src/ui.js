'use strict';
const UI = {
  vignette: null,
  init() {
    const c = mkCanvas(G.W, G.H), x = c.getContext('2d');
    const g = x.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.45, G.W / 2, G.H / 2, G.H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = g; x.fillRect(0, 0, G.W, G.H); this.vignette = c;
  },
  bar(ctx, x, y, w, h, frac, col, bg = '#1a1a1a', border = '#000') {
    ctx.fillStyle = border; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    const fw = Math.round(w * clamp(frac, 0, 1));
    if (fw > 0) { ctx.fillStyle = col; ctx.fillRect(x, y, fw, h); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, fw, 1); }
  },
  panel(ctx, x, y, w, h, col = 'rgba(6,10,12,0.82)', border = '#3a4a3a') {
    ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = border; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  },
  // a chunky outlined meter
  meter(ctx, x, y, w, h, frac, col, bg, icon) {
    ctx.fillStyle = '#0d1210'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    const fw = Math.round(w * clamp(frac, 0, 1));
    if (fw > 0) {
      ctx.fillStyle = col; ctx.fillRect(x, y, fw, h);
      ctx.fillStyle = mixColor(col, '#ffffff', 0.45); ctx.fillRect(x, y, fw, Math.max(1, Math.round(h * 0.3)));
      ctx.fillStyle = shade(col, 0.7); ctx.fillRect(x, y + h - 1, fw, 1);
    }
    ctx.fillStyle = '#2a3a34'; ctx.fillRect(x, y, w, 1);
  },
  drawHUD(ctx) {
    const P = G.player, W = G.W, H = G.H, t = G.t;
    const lowHp = P.hp / P.maxHp < 0.3;
    // vitals block
    ctx.fillStyle = 'rgba(6,12,12,0.55)'; ctx.fillRect(6, 6, 148, 30);
    this.meter(ctx, 30, 10, 118, 8, P.hp / P.maxHp, lowHp && Math.floor(t * 6) % 2 ? '#ff7a6a' : '#d83a2a', '#2a0e0c');
    this.meter(ctx, 30, 23, 118, 6, P.hunger / 100, P.starving && Math.floor(t * 8) % 2 ? '#ffe080' : '#e0902a', '#2a1c0a');
    // heart + jaw icons
    ctx.fillStyle = lowHp && Math.floor(t * 6) % 2 ? '#ff8a7a' : '#d83a2a';
    ctx.fillRect(12, 11, 4, 5); ctx.fillRect(18, 11, 4, 5); ctx.fillRect(11, 13, 12, 3); ctx.fillRect(13, 16, 8, 2); ctx.fillRect(15, 18, 4, 2);
    ctx.fillStyle = '#e0902a'; ctx.fillRect(12, 23, 11, 3); ctx.fillStyle = '#f4f0e0';
    for (let i = 0; i < 4; i++) ctx.fillRect(13 + i * 3, 26, 2, 2);
    ctx.fillRect(12, 28, 11, 2);
    Font.draw(ctx, Math.ceil(P.hp) + '/' + P.maxHp, 146, 11, { color: '#ffe0d8', align: 'right', shadow: true });
    if (P.poisonT > 0) Font.draw(ctx, 'POISONED', 158, 10, { color: '#60ff60', shadow: true });
    if (P.frenzyT > 0) Font.draw(ctx, 'FRENZY', 158, 20, { color: '#ff5030', shadow: true });
    if (P.missingLimbs) Font.draw(ctx, 'BLEEDING', 158, 30, { color: '#ff6060', shadow: true });
    // size / tier
    const tier = TIERS[P.tier], next = TIERS[P.tier + 1];
    Font.draw(ctx, tier.name + '  ' + P.lengthFt.toFixed(1) + ' FT', W / 2, 8, { color: '#eaf2dc', align: 'center', shadow: true });
    if (next) {
      const m0 = sizeToMass(tier.size), m1 = sizeToMass(next.size);
      this.meter(ctx, W / 2 - 62, 18, 124, 5, (P.mass - m0) / (m1 - m0), '#6ad040', '#0d2010');
    }
    // gene points: a hex chip that pulses when you can spend
    const gp = P.genePoints, canBuy = GENES.some(g => Genome.unlocked(P, g) && Genome.cost(P, g) <= gp);
    const gx = W - 42, gy = 19, pulse = canBuy ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
    this.hex(ctx, gx, gy, 14, canBuy ? mixColor('#1a3a34', '#40f0c8', pulse * 0.45) : '#16241f', canBuy ? '#40f0c8' : '#31463f', 2);
    Font.draw(ctx, String(gp), gx, gy - 4, { color: canBuy ? '#b8ffe8' : '#8aa89c', align: 'center', scale: gp > 99 ? 1 : 2, outline: '#06110e' });
    const touchUI = G.touchUI || Input.touch.active;
    if (touchUI) { ctx.globalAlpha = canBuy ? 0.8 : 0.35; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(gx, gy, 17, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    Font.draw(ctx, touchUI ? (canBuy ? 'TAP: SPLICE' : 'GENES') : (canBuy ? 'G: SPLICE' : 'GENES'), gx, gy + 17, { color: canBuy ? '#40f0c8' : '#7f9a90', align: 'center' });
    if (P.newPoints > 0 && G.state === 'play') Font.draw(ctx, '+' + P.newPoints, gx - 20, gy - 3, { color: '#b8ffe8', align: 'right', shadow: true });
    // score
    Font.draw(ctx, fmt(G.score), W - 10, 46, { color: '#fff0a0', align: 'right', shadow: true });
    if (P.combo > 1) {
      const sc = 1 + Math.min(2, Math.floor(P.combo / 5));
      Font.draw(ctx, 'X' + P.combo, W - 10, 56, { color: P.combo >= 10 ? '#ff40c0' : '#ffa030', align: 'right', shadow: true, scale: sc });
    }
    // apex badge and lineage pips
    let px2 = 10, py2 = H - 40;
    for (const k of LIN_KEYS) {
      const d = Genome.depth(P, k); if (!d) continue;
      const L = LINEAGES[k];
      ctx.fillStyle = L.color; ctx.fillRect(px2, py2, 3, 3 + d * 2);
      Font.draw(ctx, L.name.slice(0, 3), px2 + 5, py2, { color: L.color });
      px2 += 24;
    }
    if (P.apex) Font.draw(ctx, LINEAGES[P.apex].name + ' APEX', 10, H - 30, { color: LINEAGES[P.apex].color, shadow: true });
    // dash pips
    Font.draw(ctx, 'DASH', 10, H - 14, { color: '#c0d0e0', shadow: true });
    for (let i = 0; i < P.st.dashCharges; i++) {
      const full = i < P.dashCharges; ctx.fillStyle = '#0d1210'; ctx.fillRect(38 + i * 10, H - 15, 8, 8);
      ctx.fillStyle = full ? '#60c0ff' : '#203040'; ctx.fillRect(39 + i * 10, H - 14, 6, 6);
      if (!full && i === P.dashCharges) { const f = 1 - clamp(P.dashCd / (1.6 * P.st.dashCd), 0, 1); ctx.fillStyle = '#60c0ff'; ctx.fillRect(39 + i * 10, H - 14 + 6 - Math.round(6 * f), 6, Math.round(6 * f)); }
    }
    // biome name, bottom right
    const B = Biome.at(P.x);
    Font.draw(ctx, B.name, W - 10, H - 12, { color: '#7f9a90', align: 'right' });
    // hints, stacked upward so two warnings never print on the same line
    const hints = [];
    if (P.onLand) hints.push(['ON LAND: UP TO HOP', '#c8d8a0', 1]);
    if (P.tether) hints.push(['HARPOONED! BITE TO SNAP THE LINE', '#ff8040', 1]);
    if (P.latched) hints.push(['LATCHED! BITE TO DEATH ROLL', '#ff9080', 1]);
    if (P.grabbed) hints.push(['MASH BITE TO BREAK FREE!', '#ff6040', Math.floor(t * 8) % 2 ? 1 : 2]);
    let hy = H - 20;
    for (const [txt, col, sc] of hints) {
      Font.draw(ctx, txt, W / 2, hy - (sc - 1) * Font.H, { color: col, align: 'center', shadow: true, scale: sc });
      hy -= Font.H * sc + 3;
    }
    // boss bar
    if (G.boss && !G.boss.dead) {
      const b = G.boss, frac = b.hp / b.maxHp;
      Font.draw(ctx, b.name, W / 2, 32, { color: '#ff6060', align: 'center', shadow: true });
      this.meter(ctx, W / 2 - 100, 41, 200, 6, frac, frac < 0.3 ? '#ffb020' : '#e02020', '#200808');
      const [sx] = G.cam.toScreen(b.x, b.y);
      if (sx < 0 || sx > W) { const dir = sx < 0 ? -1 : 1; Font.draw(ctx, dir < 0 ? '<<' : '>>', dir < 0 ? 12 : W - 12, H / 2, { color: '#ff6060', align: 'center', shadow: true, scale: 2 }); }
    }
    if (G.banner) {
      const b = G.banner, a = Math.min(1, b.t / 0.5, (b.max - b.t) / 0.3);
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H * 0.3 - 6, W, b.sub ? 40 : 26);
      Font.draw(ctx, b.text, W / 2, H * 0.3, { color: b.color, align: 'center', scale: 2, outline: '#000' });
      if (b.sub) Font.draw(ctx, b.sub, W / 2, H * 0.3 + 20, { color: '#ffffff', align: 'center', outline: '#000' });
      ctx.globalAlpha = 1;
    }
    if (G.t < 16 && G.state === 'play' && G.runs <= 1) {
      const touch = G.touchUI || Input.touch.active;
      const msgs = touch
        ? ['LEFT THUMB: SWIM AND WALK', 'BITE PAD CHOMPS   DASH PAD LUNGES', 'EAT TO EARN GENES.  GENE CHIP SPLICES THEM']
        : ['WASD / ARROWS: SWIM AND WALK', 'SPACE: BITE   SHIFT: DASH', 'EAT TO EARN GENES.  G: SPLICE THEM'];
      Font.draw(ctx, msgs[Math.min(2, Math.floor(G.t / 5.3))], W / 2, H - 46, { color: '#ffffff', align: 'center', shadow: true });
    }
  },
  // a filled hexagon with a border
  hex(ctx, cx, cy, r, fill, stroke, lw) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  },
  // screen positions of every gene cell
  geneCells() {
    // fit the whole hex field between the header and the footer, whatever its extent
    const W = G.W, H = G.H;
    if (!this._geneFit) {
      let minX = 0, maxX = 0, minY = 0, maxY = 0;
      for (const g of GENES) {
        const ux = 1.5 * g.q, uy = 1.732 * (g.r + g.q / 2);
        if (ux < minX) minX = ux; if (ux > maxX) maxX = ux;
        if (uy < minY) minY = uy; if (uy > maxY) maxY = uy;
      }
      this._geneFit = { minX, maxX, minY, maxY };
    }
    const f = this._geneFit, top = 44, bot = H - 16, pad = 1.3;
    const R = Math.min(26, (W - 12) / ((f.maxX - f.minX) + pad * 2), (bot - top) / ((f.maxY - f.minY) + pad * 2));
    const cx = W / 2 - (f.minX + f.maxX) * 0.5 * R;
    const cy = (top + bot) * 0.5 - (f.minY + f.maxY) * 0.5 * R;
    return GENES.map(g => { const [sx, sy] = Genome.pos(g, cx, cy, R); return { g, sx, sy, R }; });
  },
  drawGenes(ctx) {
    const W = G.W, H = G.H, P = G.player, t = G.t;
    ctx.fillStyle = 'rgba(3,8,10,0.95)'; ctx.fillRect(0, 0, W, H);
    const cells = this.geneCells(), byId = {};
    for (const c of cells) byId[c.g.id] = c;
    // links between adjacent cells
    ctx.lineWidth = 1;
    for (const c of cells) for (const n of hexNbrs(c.g)) {
      const o = byId[n.id]; if (!o || o.sx < c.sx || (o.sx === c.sx && o.sy < c.sy)) continue;
      const both = Genome.has(P, c.g.id) && Genome.has(P, n.id);
      const one = Genome.has(P, c.g.id) || Genome.has(P, n.id);
      ctx.strokeStyle = both ? 'rgba(120,240,210,0.55)' : one ? 'rgba(90,150,140,0.3)' : 'rgba(60,90,86,0.16)';
      ctx.beginPath(); ctx.moveTo(c.sx, c.sy); ctx.lineTo(o.sx, o.sy); ctx.stroke();
    }
    // cells
    for (const c of cells) {
      const g = c.g, own = Genome.has(P, g.id), open = Genome.unlocked(P, g);
      const L = g.lin ? LINEAGES[g.lin] : null, col = L ? L.color : '#9ad8c0';
      const cost = Genome.cost(P, g), afford = open && P.genePoints >= cost;
      const sel = G.geneSel === g.id;
      const r = c.R * (g.root ? 0.8 : g.apex ? 1.06 : 1) * (sel ? 1.12 : 1);
      if (own) { ctx.globalCompositeOperation = 'lighter'; this.hex(ctx, c.sx, c.sy, r * 1.3, rgba(col, 0.12), null); ctx.globalCompositeOperation = 'source-over'; }
      this.hex(ctx, c.sx, c.sy, r, own ? rgba(col, 0.3) : afford ? 'rgba(14,30,28,0.95)' : 'rgba(10,16,18,0.9)', own ? col : afford ? mixColor(col, '#ffffff', 0.2) : open ? shade(col, 0.55) : '#2a3a38', sel ? 2 : 1);
      // icon
      const ic = L ? ICONS[L.icon] : ICONS.croc;
      if (ic) drawIcon(ctx, ic, c.sx, c.sy - 3, r * 1.05, t + c.sx * 0.02, { alpha: own ? 1 : open ? 0.85 : 0.28 });
      if (!open && !own) { ctx.fillStyle = 'rgba(6,10,12,0.55)'; this.hex(ctx, c.sx, c.sy, r, 'rgba(6,10,12,0.5)', null); }
      // cost pip
      if (!own && g.cost) { const cy2 = c.sy + r - 5; ctx.fillStyle = afford ? '#0d2a24' : '#1a1210'; ctx.fillRect(c.sx - 7, cy2 - 4, 14, 9); Font.draw(ctx, String(cost), c.sx, cy2 - 3, { color: afford ? '#7affda' : '#8a6a6a', align: 'center' }); }
      if (own) { ctx.fillStyle = col; ctx.fillRect(c.sx - 2, c.sy + r - 7, 4, 4); }
      if (sel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; this.hex(ctx, c.sx, c.sy, r + 3, null, 'rgba(255,255,255,0.5)', 1); }
    }
    // header
    Font.draw(ctx, 'GENE TREE', W / 2, 8, { color: '#ffffff', align: 'center', scale: 2, outline: '#0a2018' });
    this.hex(ctx, 26, 18, 13, '#16241f', '#40f0c8', 2);
    Font.draw(ctx, String(P.genePoints), 26, 12, { color: '#b8ffe8', align: 'center', scale: 2, outline: '#06110e' });
    Font.draw(ctx, 'POINTS', 26, 32, { color: '#7f9a90', align: 'center' });
    // affinity meters: what your playstyle is discounting
    let ay = 46;
    for (const k of LIN_KEYS) {
      const L = LINEAGES[k], f = Genome.affinityPct(P, k);
      Font.draw(ctx, L.name, 8, ay, { color: f > 0.05 ? L.color : '#4a5a56' });
      this.meter(ctx, 60, ay, 34, 4, f, L.color, '#131c1a');
      if (f > 0.05) Font.draw(ctx, '-' + Math.round(f * 50) + '%', 98, ay, { color: shade(L.color, 0.85) });
      ay += 11;
    }
    // detail panel for the selected gene
    const g = GENE_BY_ID[G.geneSel] || GENES[0], own = Genome.has(P, g.id), open = Genome.unlocked(P, g);
    const L = g.lin ? LINEAGES[g.lin] : null, col = L ? L.color : '#9ad8c0';
    const pw = 214, px3 = W - pw - 8, py3 = 8;
    this.panel(ctx, px3, py3, pw, 84, 'rgba(6,12,14,0.95)', own ? col : shade(col, 0.6));
    Font.draw(ctx, g.name, px3 + 8, py3 + 7, { color: col });
    Font.draw(ctx, L ? L.name + (g.hybrid ? ' HYBRID' : g.apex ? ' APEX' : ' TIER ' + g.ring) : 'ORIGIN', px3 + 8, py3 + 18, { color: '#8aa89c' });
    Font.drawWrapped(ctx, g.desc, px3 + 8, py3 + 32, pw - 16, { color: '#d8e4dc', lineHeight: 9 });
    const cost = Genome.cost(P, g);
    if (own) Font.draw(ctx, 'SPLICED', px3 + pw - 8, py3 + 7, { color: '#7affda', align: 'right' });
    else if (!open) Font.draw(ctx, 'LOCKED', px3 + pw - 8, py3 + 7, { color: '#7a6a6a', align: 'right' });
    else Font.draw(ctx, cost + ' PT' + (cost === 1 ? '' : 'S') + (P.genePoints >= cost ? '  [SPACE]' : '  SHORT'), px3 + pw - 8, py3 + 7, { color: P.genePoints >= cost ? '#7affda' : '#c08a8a', align: 'right' });
    if (G.touchUI || Input.touch.active) {
      Font.draw(ctx, 'TAP A GENE TO SPLICE IT', W / 2, H - 11, { color: '#7f9a90', align: 'center' });
      const bx = W - 22, by = 16;
      ctx.globalAlpha = 0.8; ctx.strokeStyle = '#8fe8c8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(bx, by, 13, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      Font.draw(ctx, 'X', bx, by - 3, { color: '#8fe8c8', align: 'center', scale: 2, outline: '#04120e' });
    } else Font.draw(ctx, 'MOVE: WASD / MOUSE      TAKE: SPACE OR CLICK      G / ESC: BACK', W / 2, H - 11, { color: '#7f9a90', align: 'center' });
  },
  drawLogo(ctx, x, y, scale, t) {
    const txt = 'CHOMPERS', w = Font.width(txt, scale);
    Font.draw(ctx, txt, x + scale, y + scale * 1.5, { color: '#2a0606', align: 'center', scale });
    Font.draw(ctx, txt, x, y, { color: '#e02a1e', align: 'center', scale, outline: '#5a0a0a' });
    // highlight
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y, w, 2 * scale); ctx.clip();
    Font.draw(ctx, txt, x, y, { color: '#ff7a5a', align: 'center', scale }); ctx.restore();
    // drips
    const drips = [0.08, 0.21, 0.37, 0.5, 0.66, 0.81, 0.93];
    drips.forEach((d, i) => {
      const dx = Math.round(x - w / 2 + d * w), len = (0.6 + 0.4 * Math.sin(t * 0.8 + i * 1.7)) * scale * (2 + (i % 3));
      ctx.fillStyle = '#b01a12'; ctx.fillRect(dx, y + 7 * scale, Math.max(1, Math.round(scale / 2)), Math.round(len));
      ctx.fillStyle = '#e02a1e'; ctx.fillRect(dx - 1, y + 7 * scale + Math.round(len) - 1, Math.max(2, Math.round(scale / 2) + 2), 2);
    });
    // teeth under the logo
    ctx.fillStyle = '#f4f1e6';
    for (let i = 0; i < 12; i++) { const tx = Math.round(x - w / 2 + i * (w / 11)); ctx.beginPath(); ctx.moveTo(tx - 3, y - 2); ctx.lineTo(tx + 3, y - 2); ctx.lineTo(tx, y + 4); ctx.closePath(); ctx.fill(); }
  },
  drawTitle(ctx) {
    const W = G.W, H = G.H, t = G.titleT, touch = G.touchUI;
    // darken the top and the bottom only, so the swamp behind stays bright in the middle
    const top = ctx.createLinearGradient(0, 0, 0, 138);
    top.addColorStop(0, 'rgba(4,10,10,0.58)'); top.addColorStop(1, 'rgba(4,10,10,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, 138);
    const bot = ctx.createLinearGradient(0, H - 70, 0, H);
    bot.addColorStop(0, 'rgba(4,10,10,0)'); bot.addColorStop(1, 'rgba(4,10,10,0.7)');
    ctx.fillStyle = bot; ctx.fillRect(0, H - 70, W, 70);
    // vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.88);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    this.drawLogo(ctx, W / 2, 22, 6, t);
    Font.draw(ctx, 'AN EVERGLADES EATER ROGUELIKE', W / 2, 92, { color: '#7fd8b8', align: 'center', outline: '#04100c' });
    Font.draw(ctx, 'THEY SPLICED EVERY ANIMAL INTO YOU. NOW USE THEM ALL.', W / 2, 104, { color: '#e6eede', align: 'center', outline: '#04100c' });

    // start prompt: a chevron pair that breathes rather than a hard blink
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
    const label = touch ? 'TAP TO HUNT' : 'PRESS ENTER TO HUNT';
    const lw = Font.width(label, 2);
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    Font.draw(ctx, label, W / 2, 128, { color: '#ffe060', align: 'center', scale: 2, outline: '#3a1c00' });
    ctx.globalAlpha = 0.3 + 0.7 * pulse;
    const chev = 10 + Math.round(pulse * 4);
    Font.draw(ctx, '>', W / 2 - lw / 2 - chev, 128, { color: '#ffb020', align: 'center', scale: 2, outline: '#3a1c00' });
    Font.draw(ctx, '<', W / 2 + lw / 2 + chev, 128, { color: '#ffb020', align: 'center', scale: 2, outline: '#3a1c00' });
    ctx.globalAlpha = 1;

    // controls: two tidy columns, keyboard or touch depending on the device
    const rows = touch
      ? [['LEFT THUMB', 'SWIM AND WALK'], ['BITE PAD', 'CHOMP, DEATH ROLL'], ['DASH PAD', 'LUNGE'], ['GENE CHIP', 'SPEND WHAT YOU ATE']]
      : [['WASD / ARROWS', 'SWIM AND WALK'], ['SPACE / J', 'CHOMP, DEATH ROLL'], ['SHIFT / K', 'LUNGE'], ['G', 'GENE TREE'], ['UP ON LAND', 'HOP'], ['P H C M', 'PAUSE HELP CODEX MUTE']];
    const _stageHint = 'PICK A STAGE AND A PRIME MUTATION BEFORE EACH RUN';
    const cols = 2, per = Math.ceil(rows.length / cols), pw2 = W - 40, colW = pw2 / cols, x0 = 20 + 12;
    const boxH = per * 11 + 10, boxY = H - 74 - boxH;
    this.panel(ctx, 20, boxY, pw2, boxH, 'rgba(6,14,14,0.68)', 'rgba(120,180,160,0.35)');
    rows.forEach((r, i) => {
      const c = Math.floor(i / per), ry = boxY + 7 + (i % per) * 11, rx = x0 + c * colW;
      Font.draw(ctx, r[0], rx, ry, { color: '#8fe8c8' });
      Font.draw(ctx, r[1], rx + 96, ry, { color: '#d4e0d0' });
    });

    Font.draw(ctx, _stageHint, W / 2, boxY - 10, { color: '#7fd8b8', align: 'center', outline: '#04140f' });
    Font.draw(ctx, 'EAT WHAT IS SMALLER. FLEE WHAT IS BIGGER. KEEP EATING OR STARVE.', W / 2, boxY + boxH + 8, { color: '#ffb060', align: 'center', outline: '#2a1200' });

    const s = G.save;
    const have = ANIMAL_TRAITS.filter(t2 => !t2.unlock || Meta.isUnlocked(t2.id)).length;
    Font.draw(ctx, 'BEST ' + fmt(s.best) + '     LONGEST ' + s.bestLen.toFixed(1) + ' FT     TRAITS ' + have + '/' + ANIMAL_TRAITS.length, W / 2, H - 20, { color: '#90a898', align: 'center', shadow: true });
    Font.draw(ctx, 'SOUND: ' + (SFX.muted ? 'OFF' : 'ON') + '  (M)', W - 8, H - 10, { color: '#708878', align: 'right' });
    if (!touch) Font.draw(ctx, 'H: HELP', 8, H - 10, { color: '#708878' });
  },
  // ---------- stage select: an illustrated world map ----------
  mapRect() { return { x: 16, y: 52, w: G.W - 32, h: 128 }; },
  stageRows() {
    // hit targets are the landmark pins on the map, not a list of rows
    const R = this.mapRect(), x0 = -3200, x1 = 19000;
    return STAGES.map((st, i) => {
      const u = (st.x - x0) / (x1 - x0);
      const px2 = R.x + u * R.w;
      return { x: px2 - 13, y: R.y - 4, w: 26, h: R.h + 8, st, i, px: px2 };
    });
  },
  // one small landmark drawn above the shoreline for each stage
  drawLandmark(ctx, kind, x, y, on) {
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + a), Math.round(y + b), Math.max(1, w), Math.max(1, h)); };
    const dim = c => (on ? c : mixColor(c, '#20302c', 0.62));
    switch (kind) {
      case 'outfall':                              // concrete pipe mouth
        px(-7, -9, 14, 9, dim('#6a6d72')); px(-7, -9, 14, 2, dim('#8b8e94'));
        px(-4, -7, 8, 6, dim('#161c1e')); px(-4, -7, 8, 1, dim('#2a3436'));
        px(-9, 0, 18, 2, dim('#4a4d52'));
        break;
      case 'mangrove':                             // clump on stilt roots
        px(-8, -13, 16, 7, dim('#2f6a34')); px(-6, -16, 12, 4, dim('#3f8a42'));
        px(-5, -15, 4, 2, dim('#58a852'));
        for (let i = -6; i <= 6; i += 3) px(i, -6, 1, 7, dim('#4a3a24'));
        break;
      case 'camp':                                 // shack over the water
        px(-9, -3, 18, 4, dim('#6b5033')); px(-9, -10, 18, 7, dim('#8a6a44'));
        px(-11, -13, 22, 3, dim('#a03a2a')); px(-3, -8, 4, 5, dim('#2a2018'));
        for (let i = -7; i <= 7; i += 5) px(i, 1, 1, 5, dim('#4a3524'));
        break;
      case 'cypress':                              // tiered conifers with knees
        for (const ox of [-6, 2]) { px(ox, -6, 2, 7, dim('#3a2a1a')); for (let k = 0; k < 3; k++) px(ox - 4 + k, -14 + k * 4, 10 - k * 2, 3, dim(k ? '#2f5a2a' : '#3f7a34')); }
        px(-9, 0, 1, 3, dim('#4a3a26')); px(8, 0, 1, 3, dim('#4a3a26'));
        break;
      case 'prairie':                              // sawgrass on a flat
        for (let i = -9; i <= 9; i += 3) { const h = 6 + ((i + 9) % 5); px(i, -h, 1, h, dim('#7a9a4a')); px(i + 1, -h + 1, 1, h - 1, dim('#5f7f34')); }
        px(-10, 0, 20, 2, dim('#6a7a44'));
        break;
      case 'river':                                // channel markers over deep water
        px(-8, -12, 2, 13, dim('#c8c8b8')); px(-9, -14, 4, 3, dim('#20a040'));
        px(6, -10, 2, 11, dim('#c8c8b8')); px(5, -12, 4, 3, dim('#e04040'));
        px(-11, 0, 22, 2, dim('#2a5a68'));
        break;
      case 'campground':                           // two tents and a fire
        px(-10, -8, 9, 8, dim('#3a6ab0')); px(-6, -11, 1, 4, dim('#c8c8b8'));
        px(1, -7, 8, 7, dim('#e0a020')); px(4, -10, 1, 4, dim('#c8c8b8'));
        px(-2, -3, 3, 3, dim('#e06030')); px(-1, -5, 1, 2, dim('#ffd060'));
        break;
      case 'bay':                                  // buoy on the horizon
        px(-1, -13, 3, 10, dim('#20a040')); px(-3, -3, 7, 4, dim('#e0e0d0'));
        px(-3, -3, 7, 1, dim('#20a040')); px(-2, -15, 1, 2, dim('#40ff60'));
        px(-11, 1, 22, 1, dim('#2a7a8a'));
        break;
      case 'seawall':                              // skyline behind a wall
        px(-11, -6, 22, 7, dim('#5e6068')); px(-11, -6, 22, 1, dim('#8a8c92'));
        for (const [ox, h, w] of [[-9, 14, 5], [-3, 20, 6], [4, 11, 4], [8, 17, 4]]) {
          px(ox, -6 - h, w, h, dim('#2c3140'));
          for (let ry = 0; ry < h - 2; ry += 3) for (let cx2 = 0; cx2 < w - 1; cx2 += 2) if (((ox + ry + cx2) % 5) < 2) px(ox + cx2 + 1, -5 - h + ry, 1, 2, dim('#e8d070'));
        }
        break;
    }
  },
  drawStages(ctx) {
    const W = G.W, H = G.H, t = G.menuT, R = this.mapRect();
    ctx.fillStyle = 'rgba(3,9,11,0.93)'; ctx.fillRect(0, 0, W, H);
    Font.draw(ctx, 'CHOOSE YOUR WATER', W / 2, 14, { color: '#ffffff', align: 'center', scale: 2, outline: '#0a2018' });
    Font.draw(ctx, 'THE PIPE RUNS ALL THE WAY TO THE SEA', W / 2, 34, { color: '#7fd8b8', align: 'center' });

    // --- the whole map drawn as a cross-section: sky, water, ground
    const x0 = -3200, x1 = 19000, wl = R.y + 38, dScale = (R.h - 38) / 960;
    const sky = ctx.createLinearGradient(0, R.y, 0, wl);
    sky.addColorStop(0, '#1b3a52'); sky.addColorStop(1, '#4c7d92');
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    ctx.fillStyle = sky; ctx.fillRect(R.x, R.y, R.w, wl - R.y);
    const wg = ctx.createLinearGradient(0, wl, 0, R.y + R.h);
    wg.addColorStop(0, '#2f7f86'); wg.addColorStop(1, '#08222e');
    ctx.fillStyle = wg; ctx.fillRect(R.x, wl, R.w, R.h - (wl - R.y));
    // ground silhouette across the whole world
    ctx.beginPath(); ctx.moveTo(R.x, R.y + R.h + 4);
    for (let sx = 0; sx <= R.w; sx += 2) {
      const wx = x0 + (sx / R.w) * (x1 - x0);
      ctx.lineTo(R.x + sx, wl + MapData.floorY(wx) * dScale);
    }
    ctx.lineTo(R.x + R.w, R.y + R.h + 4); ctx.closePath();
    ctx.fillStyle = '#4a4230'; ctx.fill();
    // a turf lip and a paler shelf under it
    for (let sx = 0; sx <= R.w; sx += 2) {
      const wx = x0 + (sx / R.w) * (x1 - x0), fy = MapData.floorY(wx), gy = wl + fy * dScale;
      ctx.fillStyle = fy < 0 ? '#5f8a3f' : mixColor('#6a6250', '#2a3a3e', clamp(fy / 700, 0, 1));
      ctx.fillRect(R.x + sx, Math.round(gy), 2, 2);
    }
    ctx.fillStyle = 'rgba(230,250,255,0.35)'; ctx.fillRect(R.x, Math.round(wl), R.w, 1);
    ctx.restore();
    this.panel(ctx, R.x, R.y, R.w, R.h, 'rgba(0,0,0,0)', 'rgba(120,180,170,0.4)');

    // --- the route: a dashed line along the surface from the pipe to the sea
    const rows = this.stageRows();
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i], b = rows[i + 1];
      const openBoth = Stages.unlocked(a.st) && Stages.unlocked(b.st);
      ctx.fillStyle = openBoth ? 'rgba(143,232,200,0.5)' : 'rgba(110,130,126,0.25)';
      for (let px2 = a.px; px2 < b.px; px2 += 5) {
        const wx2 = x0 + ((px2 - R.x) / R.w) * (x1 - x0);
        const yy = Math.max(wl, wl + MapData.floorY(wx2) * dScale) + 4;
        ctx.fillRect(Math.round(px2), Math.round(Math.min(R.y + R.h - 6, yy)), 3, 1);
      }
    }
    ctx.restore();
    // --- landmarks and pins
    for (const r of rows) {
      const st = r.st, open = Stages.unlocked(st), sel = r.i === G.stageSel;
      const wx = st.x, gy = wl + MapData.floorY(wx) * dScale;
      const base = Math.min(gy, wl) - 1;
      this.drawLandmark(ctx, st.id, r.px, base, open);
      // the marker sits on the shoreline right under its landmark
      const col = st.kaiju ? '#ff7a40' : open ? '#8fe8c8' : '#5f6f6a';
      // markers sit in a tidy row just under the surface; dangling them down to
      // the seabed made the deep stages look like dropped plumb lines
      const pinY = wl + 6;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(r.px), Math.round(base), 1, Math.max(1, pinY - base - 3));
      const rr = sel ? 4 + Math.sin(t * 5) * 0.8 : 2.6;
      ctx.beginPath(); ctx.arc(r.px, pinY, rr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#06120f'; ctx.beginPath(); ctx.arc(r.px, pinY, rr - 1.5, 0, TAU); ctx.fill();
      if (!open) { ctx.fillStyle = col; ctx.fillRect(Math.round(r.px - 2), Math.round(pinY - 1), 4, 3); ctx.fillRect(Math.round(r.px - 1), Math.round(pinY - 3), 2, 2); }
      else if (sel) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(r.px, pinY, 1.4, 0, TAU); ctx.fill(); }
      if (sel) Font.draw(ctx, st.name, clamp(r.px, 46, W - 46), Math.max(R.y + 3, base - 20), { color: col, align: 'center', outline: '#04120e' });
    }

    // --- detail card for the pin under the cursor
    const cur = STAGES[G.stageSel] || STAGES[0], open = Stages.unlocked(cur);
    const cy2 = R.y + R.h + 12, shake = G.menuShake > 0 ? Math.sin(t * 60) * 3 : 0;
    const accent = cur.kaiju ? '#ff7a40' : open ? '#8fe8c8' : '#a08070';
    this.panel(ctx, 16 + shake, cy2, W - 32, 52, 'rgba(8,18,20,0.92)', accent);
    Font.draw(ctx, open ? cur.name : 'UNCHARTED', 26 + shake, cy2 + 8, { color: accent, scale: 2, outline: '#04120e' });
    Font.draw(ctx, open ? cur.sub : Stages.hint(cur.need), 26 + shake, cy2 + 26, { color: open ? '#c8d8d0' : '#a08070' });
    if (open) {
      Font.draw(ctx, 'START ' + (cur.size * 3.2).toFixed(1) + ' FT', W - 26 + shake, cy2 + 8, { color: '#d4e0d0', align: 'right' });
      Font.draw(ctx, 'THREAT', W - 26 + shake, cy2 + 22, { color: '#8aa89c', align: 'right' });
      const sk = Math.min(5, Math.round(cur.diff + 1));
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k < sk ? (cur.kaiju ? '#ff7a40' : '#e0a040') : '#2c3a36'; ctx.fillRect(Math.round(W - 26 - 40 + k * 8 + shake), cy2 + 32, 6, 6); }
    } else Font.draw(ctx, 'LOCKED', W - 26 + shake, cy2 + 8, { color: '#a08070', align: 'right' });
    Font.draw(ctx, open ? 'ENTER TO DEPLOY' : 'NOT YET', 26 + shake, cy2 + 38, { color: open ? '#ffe060' : '#ff8060' });

    // what the save knows, so the empty half of the screen earns its place
    const sv = G.save, opened = STAGES.filter(x2 => Stages.unlocked(x2)).length;
    const by = cy2 + 62;
    this.panel(ctx, 16, by, W - 32, 46, 'rgba(6,14,16,0.85)', 'rgba(100,150,140,0.28)');
    const stat = (lab, val, cx3) => { Font.draw(ctx, lab, cx3, by + 9, { color: '#7f9a90', align: 'center' }); Font.draw(ctx, val, cx3, by + 22, { color: '#d8e8de', align: 'center', scale: 2, outline: '#04120e' }); };
    const q = (W - 32) / 4;
    stat('WATERS OPEN', opened + '/' + STAGES.length, 16 + q * 0.5);
    stat('LONGEST', (sv.bestLen || 0).toFixed(1) + ' FT', 16 + q * 1.5);
    stat('BEST SCORE', fmt(sv.best || 0), 16 + q * 2.5);
    stat('RUNS', String(sv.runs || 0), 16 + q * 3.5);
    Font.draw(ctx, (G.touchUI || Input.touch.active) ? 'TAP A PIN, TAP AGAIN TO DEPLOY' : 'LEFT / RIGHT ALONG THE MAP      ENTER: DEPLOY      ESC: BACK', W / 2, H - 12, { color: '#7f9a90', align: 'center' });
  },
  // ---------- loadout: the splice bay, with you in the tank ----------
  loadoutCells() {
    const W = G.W, out = [];
    const px0 = 176, pw = Math.floor((W - px0 - 18) / 4), py = 68;
    PRIMES.forEach((p2, i) => out.push({ row: 0, i, x: px0 + (i % 4) * pw, y: py + Math.floor(i / 4) * 22, w: pw - 3, h: 20, item: p2 }));
    const hy = 132, hw = Math.floor((W - px0 - 18) / 3);
    HIDES.forEach((h, i) => out.push({ row: 1, i, x: px0 + (i % 3) * hw, y: hy + Math.floor(i / 3) * 22, w: hw - 3, h: 20, item: h }));
    return out;
  },
  loadoutGoRect() { return { x: G.W - 150, y: G.H - 40, w: 132, h: 24 }; },
  // the croc turning slowly in the acid, wearing whatever you picked
  drawTankPreview(ctx, x, y, w, h, t) {
    const P = G.player;
    // tank glass and the fluid inside
    ctx.fillStyle = '#0a1416'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    const fl = ctx.createLinearGradient(0, y, 0, y + h);
    fl.addColorStop(0, '#2f7a56'); fl.addColorStop(1, '#0d3a2c');
    ctx.fillStyle = fl; ctx.fillRect(x, y, w, h);
    // suspended muck and rising bubbles
    for (let i = 0; i < 26; i++) {
      const bx = x + ((ihash(i, 7) * w + Math.sin(t * 0.6 + i) * 3) % w);
      const by = y + h - ((t * (9 + ihash(i, 8) * 22) + ihash(i, 9) * h) % h);
      ctx.fillStyle = 'rgba(190,255,220,0.35)';
      ctx.fillRect(Math.round(bx), Math.round(by), 1, ihash(i, 10) > 0.6 ? 2 : 1);
    }
    // the specimen: built from the real look so the morph and prime show
    const look = computeLook({
      skills: P ? P.skills : { ripper: 0, behemoth: 0, phantom: 0, abyssal: 0, savage: 0 },
      evo: {}, traits: [], hide: G.loadout.hide,
    });
    const prime = G.loadout.prime;
    if (prime && prime !== 'none' && LINEAGES[prime]) look.glow = LINEAGES[prime].color;
    const parts = buildCrocParts(look);
    const cx = x + w / 2, cy = y + h * 0.5, sway = Math.sin(t * 0.7) * 0.16;
    ctx.save();
    // clip to the glass: a specimen that overflows its tank is not a specimen
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(cx, cy);
    // drawCroc takes a world size, not a pixel scale: the sprite is already
    // authored at world resolution, so anything much over 2 fills the screen
    const ws = 2.1, R0 = 30;
    const nodes = [];
    for (let i = 0; i < CROC_LEN; i++) {
      const u = i / (CROC_LEN - 1), a = -1.4 + sway + u * 4.2, rr2 = R0 * (1 - u * 0.16);
      nodes.push({ x: Math.cos(a) * rr2, y: Math.sin(a) * rr2, a: a + Math.PI / 2 });
    }
    drawCroc(ctx, { nodes }, parts, ws, { jaw: 0.08 + Math.max(0, Math.sin(t * 1.1)) * 0.14, legPhase: t, flipY: 1 });
    ctx.restore();
    // glass: frame, highlight columns and a lid
    ctx.fillStyle = 'rgba(220,255,250,0.1)'; ctx.fillRect(x + 4, y, 3, h);
    ctx.fillStyle = 'rgba(220,255,250,0.06)'; ctx.fillRect(x + w - 10, y, 5, h);
    ctx.strokeStyle = '#7fd8c8'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    ctx.fillStyle = '#39454a'; ctx.fillRect(x - 5, y - 8, w + 10, 6); ctx.fillRect(x - 5, y + h + 1, w + 10, 6);
    ctx.fillStyle = '#5a686e'; ctx.fillRect(x - 5, y - 8, w + 10, 1);
    // plate under the tank
    ctx.fillStyle = '#c8c2a8'; ctx.fillRect(x + w / 2 - 30, y + h + 10, 60, 11);
    ctx.fillStyle = '#9a947c'; ctx.fillRect(x + w / 2 - 30, y + h + 20, 60, 1);
    Font.draw(ctx, 'SUBJECT 7', x + w / 2, y + h + 13, { color: '#2a2018', align: 'center' });
  },
  drawLoadout(ctx) {
    const W = G.W, H = G.H, st = G.pendingStage || STAGES[0], t = G.menuT;
    // --- lab room behind everything
    ctx.fillStyle = '#0d1417'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#141d21';
    for (let sx = 0; sx < W; sx += 16) { if (((sx / 16) | 0) % 3 === 0) ctx.fillRect(sx, 0, 16, H); }
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#0a1013';
    for (let sy = 0; sy < H; sy += 11) ctx.fillRect(0, sy, W, 1);
    ctx.globalAlpha = 1;
    // ceiling ducts and a couple of lamps
    ctx.fillStyle = '#1c262a'; ctx.fillRect(0, 0, W, 12);
    ctx.fillStyle = '#28343a'; ctx.fillRect(0, 11, W, 1);
    for (let lx = 60; lx < W; lx += 150) {
      ctx.fillStyle = '#2a3338'; ctx.fillRect(lx - 1, 12, 2, 5);
      ctx.fillStyle = '#ffe6a0'; ctx.fillRect(lx - 7, 17, 14, 2);
      ctx.globalCompositeOperation = 'lighter';
      const g2 = ctx.createRadialGradient(lx, 18, 2, lx, 18, 70);
      g2.addColorStop(0, 'rgba(255,230,160,0.13)'); g2.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = g2; ctx.fillRect(lx - 70, 12, 140, 140);
      ctx.globalCompositeOperation = 'source-over';
    }
    Font.draw(ctx, 'SPLICE BAY', 18, 22, { color: '#ffffff', scale: 2, outline: '#0a2018' });
    Font.draw(ctx, 'DEPLOYING TO ' + st.name, 18, 42, { color: st.kaiju ? '#ff7a40' : '#7fd8b8' });

    // --- the tank, left side
    this.drawTankPreview(ctx, 30, 62, 118, 150, t);

    // --- specimen readout under the tank
    {
      const bx = 22, by = 240, bw = 134;
      this.panel(ctx, bx, by, bw, 72, 'rgba(6,16,18,0.9)', 'rgba(120,180,160,0.35)');
      Font.draw(ctx, 'SPECIMEN VITALS', bx + 6, by + 6, { color: '#8fe8c8' });
      const primeName = (PRIMES.find(p2 => p2.id === G.loadout.prime) || PRIMES[0]).name;
      const hideName = (HIDE_BY_ID[G.loadout.hide] || HIDES[0]).name;
      const rowsV = [
        ['MASS', (st.size * 3.2).toFixed(1) + ' FT'],
        ['PRIME', primeName.replace(' PRIME', '')],
        ['HIDE', hideName],
        ['THREAT', 'LV ' + Math.min(5, Math.round(st.diff + 1))],
      ];
      rowsV.forEach((r2, i) => {
        Font.draw(ctx, r2[0], bx + 6, by + 18 + i * 10, { color: '#7f9a90' });
        Font.draw(ctx, r2[1], bx + bw - 6, by + 18 + i * 10, { color: '#d8e8de', align: 'right' });
      });
      // a heartbeat trace so the panel feels live
      ctx.fillStyle = '#40f0c8';
      for (let i = 0; i < bw - 12; i++) {
        const u = (i / (bw - 12)) * 6 + t * 2.2, ph = u % 1;
        const yy = by + 66 - (ph < 0.12 ? Math.sin(ph / 0.12 * Math.PI) * 9 : ph < 0.2 ? -3 : 0);
        ctx.globalAlpha = 0.35 + 0.5 * Math.max(0, 1 - ((u % 6) / 6));
        ctx.fillRect(bx + 6 + i, Math.round(yy), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
    // --- console panels, right side
    Font.draw(ctx, 'PRIME MUTATION', 176, 56, { color: '#8fe8c8' });
    Font.draw(ctx, 'HIDE', 176, 120, { color: '#8fe8c8' });
    const cells = this.loadoutCells();
    for (const c of cells) {
      const it = c.item, isPrime = c.row === 0;
      const lin = isPrime && it.id !== 'none' ? LINEAGES[it.id] : null;
      const col = lin ? lin.color : (it.color || '#9ad8c0');
      const open = isPrime || Stages.met(it.need);
      const sel = (isPrime ? G.loadout.prime === it.id : G.loadout.hide === it.id);
      const cur = c.row === (G.loadRow || 0) && c.i === G.loadCol;
      this.panel(ctx, c.x, c.y, c.w, c.h, sel ? 'rgba(20,52,46,0.95)' : 'rgba(10,20,22,0.8)', cur ? '#ffffff' : sel ? col : 'rgba(90,130,120,0.3)');
      const sw = 12;
      if (open && !isPrime) {
        const L = { back: '#4a6a3a', mid: '#5a7a44', belly: '#8a9a6a', dark: '#2a3a20', eye: '#e0c040' };
        if (it.apply) it.apply(L);
        ctx.fillStyle = L.dark; ctx.fillRect(c.x + 4, c.y + 5, sw, 10);
        ctx.fillStyle = L.back; ctx.fillRect(c.x + 4, c.y + 5, sw, 5);
        ctx.fillStyle = L.belly; ctx.fillRect(c.x + 4, c.y + 12, sw, 3);
      } else if (open && isPrime) { ctx.fillStyle = col; ctx.fillRect(c.x + 4, c.y + 7, sw, 6); }
      else { ctx.fillStyle = '#3a3028'; ctx.fillRect(c.x + 4, c.y + 5, sw, 10); }
      Font.draw(ctx, open ? it.name : 'LOCKED', c.x + sw + 9, c.y + 7, { color: open ? (sel ? col : '#c8d8d0') : '#6a5a52' });
    }
    // readout for whatever the cursor is on
    const curCell = cells.find(c => c.row === (G.loadRow || 0) && c.i === G.loadCol);
    if (curCell) {
      this.panel(ctx, 176, 182, W - 194, 34, 'rgba(6,16,18,0.92)', 'rgba(120,180,160,0.4)');
      Font.draw(ctx, curCell.item.name, 184, 188, { color: '#ffffff' });
      const txt = Stages.met(curCell.item.need) ? curCell.item.desc : 'SEALED  -  ' + Stages.hint(curCell.item.need);
      Font.drawWrapped(ctx, txt, 184, 199, W - 210, { color: '#c8d8d0', lineHeight: 9 });
    }
    // --- release lever
    const go = this.loadoutGoRect(), pulse = 0.65 + 0.35 * Math.sin(t * 4);
    this.panel(ctx, go.x, go.y, go.w, go.h, 'rgba(24,58,48,0.95)', '#8fe8c8');
    ctx.globalAlpha = pulse;
    Font.draw(ctx, 'RELEASE', go.x + go.w / 2, go.y + 5, { color: '#b8ffe8', align: 'center', scale: 2, outline: '#04140f' });
    ctx.globalAlpha = 1;
    Font.draw(ctx, (G.touchUI || Input.touch.active) ? 'TAP TO PICK, THEN RELEASE' : 'ARROWS PICK      ENTER: RELEASE      ESC: BACK', 18, H - 12, { color: '#7f9a90' });
  },
  cardRects(n) {
    const w = 168, h = 168, gap = 14, total = n * w + (n - 1) * gap, x0 = (G.W - total) / 2, y = 162;
    const r = []; for (let i = 0; i < n; i++) r.push({ x: x0 + i * (w + gap), y, w, h });
    return r;
  },
  drawShed(ctx) {
    const W = G.W, H = G.H, P = G.player, cards = G.shedCards, t = G.shedUiT;
    ctx.fillStyle = 'rgba(2,6,8,0.80)'; ctx.fillRect(0, 0, W, H);
    const tier = TIERS[G.shedTier];
    const sel = cards[G.shedSel];
    const selCol = sel ? (sel.kind === 'path' ? PATHS[sel.path].color : sel.kind === 'trait' ? sel.trait.color : '#9aa8a0') : '#40f0c8';
    // --- the genome orb ---
    const beads = DNA.beads(P);
    DNA.draw(ctx, W / 2, 96, 58, G.t, beads, { glow: selCol, beadR: 6.5, rungs: 20 });
    // the animal being spliced in, alive at the core of the orb
    const icon = iconFor(sel);
    if (icon) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(selCol, 0.16); ctx.beginPath(); ctx.arc(W / 2, 96, 30 + Math.sin(G.t * 3) * 2, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      drawIcon(ctx, icon, W / 2, 96, 46, G.t, { shadow: true });
    }
    Font.draw(ctx, 'SHEDDING SKIN', W / 2, 8, { color: '#ffffff', align: 'center', scale: 2, outline: '#0a2018' });
    const article = 'AEIOU'.indexOf(tier.name[0]) >= 0 ? 'AN' : 'A';
    Font.draw(ctx, 'YOU HAVE GROWN INTO ' + article + ' ' + tier.name, W / 2, 26, { color: '#c8e8c0', align: 'center', shadow: true });
    Font.draw(ctx, 'SPLICE ' + beads.length + ' STRAND' + (beads.length === 1 ? '' : 'S'), 10, 8, { color: rgba(selCol, 0.9), shadow: true });
    Font.draw(ctx, '1 / 2 / 3 OR CLICK', W - 10, 8, { color: '#80a090', align: 'right', shadow: true });
    // --- cards ---
    const rects = this.cardRects(cards.length);
    cards.forEach((c, i) => {
      const r = rects[i], on = i === G.shedSel, path = c.kind === 'path' ? PATHS[c.path] : null;
      const trait = c.kind === 'trait' ? c.trait : null;
      const col = path ? path.color : trait ? trait.color : '#c0c0c0';
      const dark = path ? path.dark : trait ? shade(trait.color, 0.28) : '#303030';
      const slide = easeOutBack(clamp((t - i * 0.08) / 0.35, 0, 1));
      const y = r.y + (1 - slide) * 60, lift = on ? -8 : 0;
      ctx.globalAlpha = slide;
      // a strand running from the orb down into the selected card
      if (on) {
        ctx.strokeStyle = rgba(col, 0.5); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W / 2, 150); ctx.quadraticCurveTo(W / 2, y + lift - 14, r.x + r.w / 2, y + lift - 2); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(col, 0.10);
        ctx.fillRect(r.x - 4, y + lift - 4, r.w + 8, r.h + 8); ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(r.x + 4, y + lift + 4, r.w, r.h);
      this.panel(ctx, r.x, y + lift, r.w, r.h, on ? 'rgba(10,18,22,0.97)' : 'rgba(6,12,14,0.93)', on ? col : dark);
      if (on) { ctx.fillStyle = col; ctx.fillRect(r.x, y + lift, r.w, 2); ctx.fillRect(r.x, y + lift + r.h - 2, r.w, 2); }
      ctx.fillStyle = dark; ctx.fillRect(r.x + 1, y + lift + 1, r.w - 2, 30);
      // animated animal icon in the card header
      drawIcon(ctx, iconFor(c), r.x + 22, y + lift + 16, 24, G.t + i * 0.7, { alpha: on ? 1 : 0.75 });
      Font.draw(ctx, path ? path.name : trait ? (trait.unlock ? 'UNLOCKED TRAIT' : 'ANIMAL TRAIT') : 'MUTATION', r.x + r.w / 2 + 16, y + lift + 8, { color: col, align: 'center' });
      Font.draw(ctx, path ? 'TIER ' + (c.tier + 1) + (c.node.evo ? '  EVOLUTION' : '') : trait ? trait.animal : 'ANY PATH', r.x + r.w / 2 + 16, y + lift + 19, { color: '#b8c8bc', align: 'center' });
      if (path) for (let k = 0; k < 5; k++) { ctx.fillStyle = k < c.tier ? col : k === c.tier ? '#ffffff' : '#22302a'; ctx.fillRect(r.x + r.w / 2 - 22 + k * 9, y + lift + 34, 6, 3); }
      else { ctx.fillStyle = col; ctx.fillRect(r.x + r.w / 2 - 26, y + lift + 35, 52, 1); }
      Font.draw(ctx, c.node.name, r.x + r.w / 2, y + lift + 44, { color: '#ffffff', align: 'center', outline: '#000' });
      Font.drawWrapped(ctx, c.node.desc, r.x + 8, y + lift + 60, r.w - 16, { color: '#d8e0d0', lineHeight: 10 });
      Font.draw(ctx, String(i + 1), r.x + 6, y + lift + r.h - 12, { color: on ? col : '#607068' });
      ctx.globalAlpha = 1;
    });
    // --- footer: path progress ---
    let px = W / 2 - 4 * 62 / 2 + 6;
    for (const k of PATH_KEYS) {
      const p = PATHS[k];
      Font.draw(ctx, p.name, px + 25, H - 20, { color: P.skills[k] ? p.color : '#4a5a52', align: 'center' });
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i < P.skills[k] ? p.color : '#1e2a22'; ctx.fillRect(px + i * 10, H - 10, 8, 4); }
      px += 62;
    }
    Font.draw(ctx, P.lengthFt.toFixed(1) + ' FT', 10, H - 12, { color: '#90a898' });
    Font.draw(ctx, fmt(G.score), W - 10, H - 12, { color: '#90a898', align: 'right' });
  },
  drawDeath(ctx) {
    const W = G.W, H = G.H, P = G.player, d = G.deathInfo, s = G.stats, t = G.deadT;
    ctx.fillStyle = `rgba(20,0,0,${clamp(t * 0.5, 0, 0.75).toFixed(2)})`; ctx.fillRect(0, 0, W, H);
    if (t < 0.3) return;
    Font.draw(ctx, 'YOU DIED', W / 2, 26, { color: '#e02a1e', align: 'center', scale: 4, outline: '#3a0000' });
    let cause = d.cause;
    if (cause === 'EATEN') cause = 'EATEN BY ' + (d.killer || 'THE SWAMP');
    else if (cause === 'SHOT') cause = 'SHOT BY POACHERS'; else if (cause === 'CRUSHED') cause = 'CRUSHED BY ' + (d.killer || 'SOMETHING HEAVY'); else if (cause === 'POISONED') cause = 'DIED OF VENOM';
    Font.draw(ctx, cause, W / 2, 64, { color: '#ffb0a0', align: 'center', scale: 1, shadow: true });
    this.panel(ctx, W / 2 - 150, 84, 300, 164, 'rgba(6,4,4,0.85)', '#5a2020');
    const mins = Math.floor(G.t / 60), secs = Math.floor(G.t % 60);
    const rows = [
      ['FINAL FORM', TIERS[P.tier].name + '  (' + P.lengthFt.toFixed(1) + ' FT)'], ['SCORE', fmt(G.score) + (G.score >= G.save.best && G.score > 0 ? '  NEW BEST!' : '')], ['SURVIVED', mins + 'M ' + secs + 'S'],
      ['THINGS EATEN', String(s.eaten)], ['KILLS', String(s.kills)], ['BOSSES SLAIN', String(s.bosses)], ['BOATS AND CAMPS WRECKED', String(s.boats + (s.structures || 0))], ['BIGGEST MEAL', s.biggest || '-'],
      ['EVOLUTION', P.picked.filter(p => !p.startsWith('mut')).map(p => PATHS[p.split(':')[0]].name[0] + (+p.split(':')[1] + 1)).join(' ') || 'NONE'],
      ['TRAITS', P.traits.length ? P.traits.map(id => (TRAIT_BY_ID[id] || {}).name || id).join(', ') : 'NONE'],
    ];
    rows.forEach((r, i) => { const y = 92 + i * 14; Font.draw(ctx, r[0], W / 2 - 140, y, { color: '#c09090' }); Font.draw(ctx, r[1], W / 2 + 140, y, { color: '#ffffff', align: 'right' }); });
    Font.draw(ctx, 'BEST ' + fmt(G.save.best) + '     LONGEST ' + G.save.bestLen.toFixed(1) + ' FT', W / 2, 254, { color: '#90a898', align: 'center' });
    if (t > 1 && Math.floor(t * 2) % 2 === 0) Font.draw(ctx, 'PRESS ENTER TO HUNT AGAIN', W / 2, 262, { color: '#ffe060', align: 'center', scale: 2, outline: '#402000' });
    Font.draw(ctx, 'ESC: TITLE      C: TRAIT CODEX', W / 2, 290, { color: '#708878', align: 'center' });
  },
  drawPause(ctx) {
    const W = G.W, H = G.H;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    Font.draw(ctx, 'PAUSED', W / 2, 40, { color: '#ffffff', align: 'center', scale: 3, outline: '#203030' });
    const S = G.settings;
    const opts = [['1', 'GORE', S.gore ? 'ON' : 'REDUCED'], ['2', 'SCREEN SHAKE', S.shake ? 'ON' : 'LOW'], ['3', 'MOUSE STEERING', S.mouseMove ? 'ON' : 'OFF'], ['4', 'TOUCH PADS', S.touch === false ? 'OFF' : 'ON'], ['M', 'SOUND', SFX.muted ? 'OFF' : 'ON']];
    this.panel(ctx, W / 2 - 120, 80, 240, 82);
    opts.forEach((o, i) => { Font.draw(ctx, '[' + o[0] + '] ' + o[1], W / 2 - 110, 90 + i * 14, { color: '#d0dcc8' }); Font.draw(ctx, o[2], W / 2 + 110, 90 + i * 14, { color: '#ffe060', align: 'right' }); });
    this.drawHelpBody(ctx, 164);
    Font.draw(ctx, 'ESC / P: RESUME      Q: QUIT TO TITLE', W / 2, H - 16, { color: '#90a898', align: 'center' });
  },
  drawHelpBody(ctx, y) {
    const W = G.W;
    const lines = [
      'SWIM WITH WASD. BITE WITH SPACE. DASH WITH SHIFT.', 'TINY PREY IS SWALLOWED WHOLE. BIGGER PREY COMES APART.',
      'BITE MEDIUM PREY TO LATCH ON, THEN BITE AGAIN TO DEATH ROLL IT IN HALF.', 'LEAP OUT OF THE WATER TO SNATCH BIRDS. CRAWL ONTO BANKS FOR DEER.',
      'EVERY MEAL PAYS GENE POINTS. PRESS G AND SPEND THEM ON THE HEX TREE.', 'HOW YOU HUNT BUILDS AFFINITY, WHICH MAKES THAT LINEAGE CHEAPER.',
      'POACHERS SHOOT FROM THE BANK AND FROM AIRBOATS. TAKE THEM UNDER.', 'HUNGER DRAINS. ALWAYS BE EATING.',
    ];
    lines.forEach((l, i) => Font.draw(ctx, l, W / 2, y + i * 11, { color: i % 2 ? '#c8d8c0' : '#e8f0e0', align: 'center' }));
  },
  drawHelp(ctx) {
    const W = G.W, H = G.H;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
    Font.draw(ctx, 'HOW TO HUNT', W / 2, 30, { color: '#ffffff', align: 'center', scale: 3, outline: '#203030' });
    this.drawHelpBody(ctx, 70);
    Font.draw(ctx, 'EVOLUTION PATHS', W / 2, 168, { color: '#ffe060', align: 'center', scale: 2, outline: '#402000' });
    PATH_KEYS.forEach((k, i) => { const p = PATHS[k]; Font.draw(ctx, p.name + ': ' + p.tag, W / 2, 190 + i * 12, { color: p.color, align: 'center' }); });
    Font.draw(ctx, 'ESC / H: BACK', W / 2, H - 16, { color: '#90a898', align: 'center' });
  },
  drawIntro(ctx) {
    const W = G.W, H = G.H, e = G.intro; if (!e) return;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (e.phase === 'tank') {
      Font.draw(ctx, 'CHIMERA PROJECT — SUBJECT 7', W / 2, 20, { color: '#8ce8a0', align: 'center', scale: 2, outline: '#04120a' });
      Font.draw(ctx, 'ONE ANIMAL. EVERY GENE. THEY WANTED TO SEE WHAT IT BECOMES.', W / 2, 40, { color: '#a8c8b8', align: 'center', shadow: true });
      const touch = G.touchUI || Input.touch.active;
      const pulse = 0.6 + 0.4 * Math.sin(e.prompt * 6);
      ctx.globalAlpha = 0.65 + 0.35 * pulse;
      Font.draw(ctx, touch ? 'TAP ANYWHERE TO BREAK THE GLASS' : 'MASH BITE TO BREAK THE GLASS', W / 2, H - 74, { color: '#ffe060', align: 'center', scale: 2, outline: '#402000' });
      ctx.globalAlpha = 1;
      const bw = 160, bx = W / 2 - bw / 2, by = H - 50;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 10);
      for (let i = 0; i < e.need; i++) {
        const seg = bw / e.need - 3, sx = bx + i * (bw / e.need);
        ctx.fillStyle = i < e.taps ? '#8ce8a0' : '#22322a'; ctx.fillRect(sx, by, seg, 6);
        if (i === e.taps) { ctx.fillStyle = `rgba(140,232,160,${(pulse * 0.5).toFixed(2)})`; ctx.fillRect(sx, by, seg, 6); }
      }
      Font.draw(ctx, 'GLASS', W / 2, by + 12, { color: '#7f9a90', align: 'center' });
    } else {
      this.drawHUD(ctx);
      // an alarm wash while the escape is on
      const flash = 0.5 + 0.5 * Math.sin(G.t * 5);
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(180,20,20,${(0.05 + 0.06 * flash).toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
      const grate = G.intro.grate;
      if (grate && !grate.broken) {
        const far = G.player.x < grate.x - 240;
        Font.draw(ctx, far ? 'FOLLOW THE PIPE EAST' : 'BITE THROUGH THE GRATE', W / 2, H - 46, { color: '#ffe060', align: 'center', shadow: true });
        if (!far) { const f = 1 - clamp(grate.hp / grate.maxHp, 0, 1); this.meter(ctx, W / 2 - 50, H - 34, 100, 5, f, '#e0a020', '#2a1c0a'); }
      }
    }
  },
  drawEgg(ctx) {
    const W = G.W, H = G.H, e = G.egg; if (!e) return;
    // vignette focus on the nest
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    Font.draw(ctx, 'A CROCODILE BEGINS', W / 2, 26, { color: '#cfe6d4', align: 'center', scale: 2, outline: '#0a1a12' });
    const touch = G.touchUI || Input.touch.active;
    const msg = touch ? 'TAP TO BREAK OUT' : 'MASH BITE TO BREAK OUT';
    const pulse = 0.6 + 0.4 * Math.sin(e.prompt * 6);
    ctx.globalAlpha = 0.65 + 0.35 * pulse;
    Font.draw(ctx, msg, W / 2, H - 74, { color: '#ffe060', align: 'center', scale: 2, outline: '#402000' });
    ctx.globalAlpha = 1;
    // crack meter
    const bw = 150, bx = W / 2 - bw / 2, by = H - 50;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 10);
    for (let i = 0; i < e.need; i++) {
      const seg = bw / e.need - 3, sx = bx + i * (bw / e.need);
      ctx.fillStyle = i < e.taps ? '#ffe0a0' : '#2a2a24'; ctx.fillRect(sx, by, seg, 6);
      if (i === e.taps) { ctx.fillStyle = `rgba(255,224,160,${(pulse * 0.5).toFixed(2)})`; ctx.fillRect(sx, by, seg, 6); }
    }
    Font.draw(ctx, 'SHELL', W / 2, by + 12, { color: '#90a898', align: 'center' });
    if (touch) { const p = Input.pads(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.bite.x, p.bite.y, p.bite.r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; Font.draw(ctx, 'TAP', p.bite.x, p.bite.y - 4, { color: '#ffffff', align: 'center', outline: '#000' }); }
  },
  drawTouch(ctx) {
    const P = Input.pads(), T = Input.touch, pl = G.player;
    const ring = (x, y, r, a, col) => { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; };
    const disc = (x, y, r, a, col) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; };
    // curled in the tank there is nothing to steer, and drawIntro already
    // shows the chomp prompt: pads here would only clutter the glass meter
    if (G.state === 'intro' && G.intro && G.intro.phase === 'tank') return;
    // joystick: shows where the thumb landed
    if (T.joy) {
      ring(T.sx, T.sy, 32, 0.35, '#ffffff');
      disc(T.sx, T.sy, 30, 0.12, '#ffffff');
      disc(T.sx + T.jx * 26, T.sy + T.jy * 26, 12, 0.5, '#8fe8d0');
      ring(T.sx + T.jx * 26, T.sy + T.jy * 26, 12, 0.8, '#ffffff');
    } else {
      ring(70, G.H - 60, 30, 0.16, '#ffffff');
      Font.draw(ctx, pl && pl.onLand ? 'WALK' : 'SWIM', 70, G.H - 64, { color: 'rgba(255,255,255,0.4)', align: 'center' });
    }
    // bite pad (turns red while latched: that is the death-roll button)
    const latched = pl && (pl.latched || pl.grabbed || pl.tether);
    const biteCol = latched ? '#ff5040' : '#e02a1e';
    disc(P.bite.x, P.bite.y, P.bite.r, T.biteHeld ? 0.55 : 0.3, biteCol);
    ring(P.bite.x, P.bite.y, P.bite.r, 0.75, '#ffffff');
    Font.draw(ctx, latched ? 'ROLL' : 'BITE', P.bite.x, P.bite.y - 4, { color: '#ffffff', align: 'center', outline: '#000' });
    // dash pad, dimmed while recharging
    const ready = pl && pl.dashCharges > 0;
    disc(P.dash.x, P.dash.y, P.dash.r, ready ? 0.3 : 0.12, '#40a0ff');
    ring(P.dash.x, P.dash.y, P.dash.r, ready ? 0.7 : 0.3, '#ffffff');
    Font.draw(ctx, 'DASH', P.dash.x, P.dash.y - 3, { color: ready ? '#ffffff' : '#88aabb', align: 'center', outline: '#000' });
    // pause
    disc(P.pause.x, P.pause.y, P.pause.r, 0.25, '#ffffff');
    Font.draw(ctx, 'II', P.pause.x, P.pause.y - 3, { color: '#ffffff', align: 'center', outline: '#000' });
  },
  drawCodex(ctx) {
    const W = G.W, H = G.H, scroll = G.codexScroll || 0;
    ctx.fillStyle = 'rgba(2,6,8,0.92)'; ctx.fillRect(0, 0, W, H);
    DNA.draw(ctx, W / 2, 26, 30, G.t, DNA.beads(G.player), { glow: '#40f0c8', beadR: 4, rungs: 12, speed: 0.6 });
    Font.draw(ctx, 'TRAIT CODEX', W / 2, 10, { color: '#ffffff', align: 'center', scale: 3, outline: '#204030' });
    const total = ANIMAL_TRAITS.length, have = ANIMAL_TRAITS.filter(t => !t.unlock || Meta.isUnlocked(t.id)).length;
    Font.draw(ctx, have + ' / ' + total + ' TRAITS AVAILABLE     LOCKED TRAITS JOIN THE SHED POOL WHEN EARNED', W / 2, 38, { color: '#a0c0b0', align: 'center' });
    const cols = 2, rowsShown = 8, cw = (W - 30) / cols, rh = 30;
    const start = scroll * cols;
    for (let i = 0; i < rowsShown * cols; i++) {
      const t = ANIMAL_TRAITS[start + i]; if (!t) break;
      const cx = 15 + (i % cols) * cw, cy = 52 + Math.floor(i / cols) * rh;
      const open = !t.unlock || Meta.isUnlocked(t.id);
      const [cur, need] = Meta.progress(t);
      UI.panel(ctx, cx, cy, cw - 8, rh - 4, open ? 'rgba(10,18,20,0.9)' : 'rgba(8,8,10,0.85)', open ? shade(t.color, 0.6) : '#2a2a2a');
      ctx.fillStyle = open ? t.color : '#3a3a3a'; ctx.fillRect(cx, cy, 2, rh - 4);
      drawIcon(ctx, ICONS[TRAIT_ICON[t.id]], cx + 16, cy + 13, 20, G.t + cy * 0.02, { alpha: open ? 1 : 0.3 });
      Font.draw(ctx, open ? t.name : '???  ' + t.animal, cx + 30, cy + 4, { color: open ? t.color : '#707070' });
      if (open) Font.drawWrapped(ctx, t.animal, cx + 30, cy + 14, cw - 44, { color: '#90a090', lineHeight: 9 });
      else {
        Font.draw(ctx, t.unlock.label, cx + 30, cy + 13, { color: '#808080' });
        const bw = cw - 20, f = need ? cur / need : 0;
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(cx + 30, cy + 21, bw - 24, 3);
        ctx.fillStyle = t.color; ctx.fillRect(cx + 30, cy + 21, Math.round((bw - 24) * clamp(f, 0, 1)), 3);
        Font.draw(ctx, cur + '/' + need, cx + cw - 14, cy + 4, { color: '#909090', align: 'right' });
      }
    }
    const maxScroll = Math.max(0, Math.ceil(total / cols) - rowsShown);
    if (maxScroll > 0) Font.draw(ctx, 'UP / DOWN TO SCROLL   ' + (scroll + 1) + '/' + (maxScroll + 1), W / 2, H - 26, { color: '#708878', align: 'center' });
    Font.draw(ctx, 'ESC / C: BACK', W / 2, H - 14, { color: '#90a898', align: 'center' });
  },
  drawScreenFx(ctx) {
    const W = G.W, H = G.H;
    ctx.drawImage(this.vignette, 0, 0);
    if (G.red > 0.01) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, `rgba(180,0,0,${Math.min(0.85, G.red).toFixed(3)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (G.white > 0.01) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, G.white).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    const P = G.player;
    if (P && !P.dead && P.hp / P.maxHp < 0.25 && G.state === 'play') { const a = 0.15 + 0.1 * Math.sin(G.t * 6); const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(120,0,0,${a.toFixed(3)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  },
};
