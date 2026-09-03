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
  drawHUD(ctx) {
    const P = G.player, W = G.W, H = G.H, t = G.t;
    // HP + hunger
    const lowHp = P.hp / P.maxHp < 0.3;
    this.bar(ctx, 10, 10, 120, 7, P.hp / P.maxHp, lowHp && Math.floor(t * 6) % 2 ? '#ff6060' : '#d02828', '#2a0a0a');
    Font.draw(ctx, 'HP', 12, 10, { color: '#ffffff', shadow: true });
    Font.draw(ctx, Math.ceil(P.hp) + '/' + P.maxHp, 128, 10, { color: '#ffd0d0', align: 'right', shadow: true });
    this.bar(ctx, 10, 21, 120, 5, P.hunger / 100, P.starving && Math.floor(t * 8) % 2 ? '#ffe080' : '#e08a20', '#2a1a0a');
    Font.draw(ctx, P.starving ? 'STARVING!' : 'HUNGER', 12, 20, { color: '#ffffff', shadow: true });
    if (P.poisonT > 0) Font.draw(ctx, 'POISONED', 12, 30, { color: '#60ff60', shadow: true });
    if (P.frenzyT > 0) Font.draw(ctx, 'FRENZY!', 70, 30, { color: '#ff5030', shadow: true });
    // tier / length / growth
    const tier = TIERS[P.tier], next = TIERS[P.tier + 1];
    const label = tier.name + '  ' + P.lengthFt.toFixed(1) + ' FT';
    Font.draw(ctx, label, W / 2, 8, { color: '#e8f0d8', align: 'center', shadow: true, scale: 1 });
    if (next) {
      const m0 = sizeToMass(tier.size), m1 = sizeToMass(next.size), frac = (P.mass - m0) / (m1 - m0);
      this.bar(ctx, W / 2 - 70, 18, 140, 4, frac, '#6ad040', '#0a1a0a');
      Font.draw(ctx, 'NEXT SHED: ' + next.name, W / 2, 24, { color: '#a0c890', align: 'center', shadow: true });
    }
    // score / combo
    Font.draw(ctx, 'SCORE', W - 10, 10, { color: '#c0c0a0', align: 'right', shadow: true });
    Font.draw(ctx, fmt(G.score), W - 10, 19, { color: '#fff0a0', align: 'right', shadow: true, scale: 1 });
    if (P.combo > 1) {
      const sc = 1 + Math.min(2, Math.floor(P.combo / 5)), pulse = 1 + 0.1 * Math.sin(t * 20);
      Font.draw(ctx, 'X' + P.combo, W - 10, 30, { color: P.combo >= 10 ? '#ff40c0' : '#ffa030', align: 'right', shadow: true, scale: sc });
      this.bar(ctx, W - 60, 30 + 8 * sc, 50, 2, P.comboT / 2.4, '#ffa030', '#1a1a1a');
    }
    // dash pips
    Font.draw(ctx, 'DASH', 10, H - 14, { color: '#c0d0e0', shadow: true });
    for (let i = 0; i < P.st.dashCharges; i++) {
      const full = i < P.dashCharges; ctx.fillStyle = '#000'; ctx.fillRect(38 + i * 10, H - 15, 8, 8);
      ctx.fillStyle = full ? '#60c0ff' : '#203040'; ctx.fillRect(39 + i * 10, H - 14, 6, 6);
      if (!full && i === P.dashCharges) { const f = 1 - clamp(P.dashCd / (1.6 * P.st.dashCd), 0, 1); ctx.fillStyle = '#60c0ff'; ctx.fillRect(39 + i * 10, H - 14 + 6 - Math.round(6 * f), 6, Math.round(6 * f)); }
    }
    // evolution mini tree
    let tx = W - 10 - 4 * 14;
    for (const k of PATH_KEYS) {
      const p = PATHS[k], lvl = P.skills[k];
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#000'; ctx.fillRect(tx, H - 12 - i * 5, 10, 4); ctx.fillStyle = i < lvl ? p.color : '#1e2a22'; ctx.fillRect(tx + 1, H - 11 - i * 5, 8, 2); }
      Font.draw(ctx, p.name[0], tx + 5, H - 42, { color: lvl ? p.color : '#405040', align: 'center', shadow: true });
      tx += 14;
    }
    // hints
    if (P.latched) Font.draw(ctx, 'LATCHED! BITE TO DEATH ROLL', W / 2, H - 30, { color: '#ff9080', align: 'center', shadow: true });
    if (P.grabbed) Font.draw(ctx, 'MASH BITE TO BREAK FREE!', W / 2, H - 30, { color: '#ff6040', align: 'center', shadow: true, scale: Math.floor(t * 8) % 2 ? 1 : 2 });
    if (P.tether) Font.draw(ctx, 'HARPOONED! BITE TO SNAP THE LINE', W / 2, H - 30, { color: '#ff8040', align: 'center', shadow: true });
    if (P.onLand) Font.draw(ctx, 'ON LAND: UP TO HOP', W / 2, H - 20, { color: '#c8d8a0', align: 'center', shadow: true });
    // boss bar
    if (G.boss && !G.boss.dead) {
      const b = G.boss, frac = b.hp / b.maxHp;
      Font.draw(ctx, b.name, W / 2, 34, { color: '#ff6060', align: 'center', shadow: true });
      this.bar(ctx, W / 2 - 100, 43, 200, 5, frac, frac < 0.3 ? '#ffb020' : '#e02020', '#200808', '#601010');
      // offscreen arrow
      const [sx] = G.cam.toScreen(b.x, b.y);
      if (sx < 0 || sx > W) { const dir = sx < 0 ? -1 : 1; Font.draw(ctx, dir < 0 ? '<<' : '>>', dir < 0 ? 12 : W - 12, H / 2, { color: '#ff6060', align: 'center', shadow: true, scale: 2 }); }
    }
    // banner
    if (G.banner) {
      const b = G.banner, a = Math.min(1, b.t / 0.5, (b.max - b.t) / 0.3);
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H * 0.3 - 6, W, b.sub ? 40 : 26);
      Font.draw(ctx, b.text, W / 2, H * 0.3, { color: b.color, align: 'center', scale: 2, outline: '#000' });
      if (b.sub) Font.draw(ctx, b.sub, W / 2, H * 0.3 + 20, { color: '#ffffff', align: 'center', outline: '#000' });
      ctx.globalAlpha = 1;
    }
    // early tutorial
    if (G.t < 14 && G.state === 'play' && G.runs <= 1) {
      const msgs = ['WASD / ARROWS: SWIM', 'SPACE: BITE   SHIFT: DASH', 'EAT SMALL THINGS TO GROW. AVOID BIG THINGS.'];
      Font.draw(ctx, msgs[Math.min(2, Math.floor(G.t / 4.5))], W / 2, H - 46, { color: '#ffffff', align: 'center', shadow: true });
    }
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
    const W = G.W, H = G.H, t = G.titleT;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
    this.drawLogo(ctx, W / 2, 40, 6, t);
    Font.draw(ctx, 'AN EVERGLADES EATER ROGUELIKE', W / 2, 98, { color: '#a8d0b0', align: 'center', shadow: true });
    Font.draw(ctx, 'HATCH. EAT. SHED. EVOLVE. BECOME THE SWAMP GOD.', W / 2, 110, { color: '#e0e8d0', align: 'center', shadow: true });
    if (Math.floor(t * 2) % 2 === 0) Font.draw(ctx, '> PRESS ENTER OR CLICK TO HUNT <', W / 2, 150, { color: '#ffe060', align: 'center', scale: 2, outline: '#402000' });
    this.panel(ctx, W / 2 - 150, 178, 300, 92);
    const lines = ['WASD / ARROWS ..... SWIM (UP ON LAND: HOP)', 'SPACE / J ......... BITE  (AGAIN WHEN LATCHED: DEATH ROLL)', 'SHIFT / K ......... DASH', 'MOUSE ............. HOLD LEFT TO STEER, RIGHT TO BITE', 'P / ESC ........... PAUSE      M: MUTE      H: HELP', '', 'EAT WHAT IS SMALLER. FLEE WHAT IS BIGGER. KEEP EATING OR STARVE.'];
    lines.forEach((l, i) => Font.draw(ctx, l, W / 2 - 142, 186 + i * 11, { color: i === 6 ? '#ffb060' : '#d0dcc8' }));
    const s = G.save;
    Font.draw(ctx, 'BEST SCORE ' + fmt(s.best) + '     LONGEST CROC ' + s.bestLen.toFixed(1) + ' FT     RUNS ' + s.runs, W / 2, H - 22, { color: '#90a898', align: 'center', shadow: true });
    Font.draw(ctx, 'SOUND: ' + (SFX.muted ? 'OFF' : 'ON') + '  (M)', W - 8, H - 10, { color: '#708878', align: 'right' });
  },
  cardRects(n) {
    const w = 168, h = 178, gap = 14, total = n * w + (n - 1) * gap, x0 = (G.W - total) / 2, y = 94;
    const r = []; for (let i = 0; i < n; i++) r.push({ x: x0 + i * (w + gap), y, w, h });
    return r;
  },
  drawShed(ctx) {
    const W = G.W, H = G.H, P = G.player, cards = G.shedCards, t = G.shedUiT;
    ctx.fillStyle = 'rgba(2,6,8,0.72)'; ctx.fillRect(0, 0, W, H);
    const tier = TIERS[G.shedTier];
    Font.draw(ctx, 'SHEDDING SKIN', W / 2, 14, { color: '#ffffff', align: 'center', scale: 3, outline: '#204030' });
    Font.draw(ctx, 'YOU HAVE GROWN INTO A ' + tier.name + '.  CHOOSE YOUR EVOLUTION.', W / 2, 44, { color: '#c8e8c0', align: 'center', shadow: true });
    Font.draw(ctx, '1 / 2 / 3 OR CLICK    ARROWS + ENTER', W / 2, 56, { color: '#80a090', align: 'center' });
    const rects = this.cardRects(cards.length);
    cards.forEach((c, i) => {
      const r = rects[i], sel = i === G.shedSel, path = c.path ? PATHS[c.path] : null;
      const col = path ? path.color : '#c0c0c0', dark = path ? path.dark : '#303030';
      const slide = easeOutBack(clamp((t - i * 0.08) / 0.35, 0, 1));
      const y = r.y + (1 - slide) * 60, lift = sel ? -6 : 0;
      ctx.globalAlpha = slide;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(r.x + 4, y + lift + 4, r.w, r.h);
      this.panel(ctx, r.x, y + lift, r.w, r.h, sel ? 'rgba(14,22,26,0.97)' : 'rgba(8,14,16,0.92)', sel ? col : dark);
      if (sel) { ctx.fillStyle = col; ctx.fillRect(r.x, y + lift, r.w, 2); ctx.fillRect(r.x, y + lift + r.h - 2, r.w, 2); }
      ctx.fillStyle = dark; ctx.fillRect(r.x + 1, y + lift + 1, r.w - 2, 22);
      Font.draw(ctx, path ? path.name : 'MUTATION', r.x + r.w / 2, y + lift + 6, { color: col, align: 'center', scale: 1 });
      Font.draw(ctx, path ? 'TIER ' + (c.tier + 1) + (c.node.evo ? '  EVOLUTION' : '') : 'ANY PATH', r.x + r.w / 2, y + lift + 15, { color: '#c0c0c0', align: 'center' });
      // tier pips
      if (path) for (let k = 0; k < 5; k++) { ctx.fillStyle = k < c.tier ? col : k === c.tier ? '#ffffff' : '#2a3a30'; ctx.fillRect(r.x + r.w / 2 - 22 + k * 9, y + lift + 27, 6, 3); }
      Font.draw(ctx, c.node.name, r.x + r.w / 2, y + lift + 36 + (c.node.name.length > 16 ? 0 : 0), { color: '#ffffff', align: 'center', scale: c.node.name.length > 14 ? 1 : 1, outline: '#000' });
      Font.drawWrapped(ctx, c.node.desc, r.x + 8, y + lift + 52, r.w - 16, { color: '#d8e0d0', lineHeight: 10 });
      if (path) Font.draw(ctx, path.tag, r.x + r.w / 2, y + lift + r.h - 14, { color: dark === '#303030' ? '#888' : col, align: 'center' });
      Font.draw(ctx, String(i + 1), r.x + 6, y + lift + r.h - 12, { color: '#ffffff', scale: 1 });
      ctx.globalAlpha = 1;
    });
    // path progress
    let px = W / 2 - 4 * 62 / 2 + 6;
    for (const k of PATH_KEYS) { const p = PATHS[k]; Font.draw(ctx, p.name, px + 25, H - 40, { color: p.color, align: 'center' }); for (let i = 0; i < 5; i++) { ctx.fillStyle = i < P.skills[k] ? p.color : '#1e2a22'; ctx.fillRect(px + i * 10, H - 30, 8, 4); } px += 62; }
    Font.draw(ctx, 'LENGTH ' + P.lengthFt.toFixed(1) + ' FT     SCORE ' + fmt(G.score), W / 2, H - 16, { color: '#90a898', align: 'center' });
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
    this.panel(ctx, W / 2 - 150, 84, 300, 150, 'rgba(6,4,4,0.85)', '#5a2020');
    const mins = Math.floor(G.t / 60), secs = Math.floor(G.t % 60);
    const rows = [
      ['FINAL FORM', TIERS[P.tier].name + '  (' + P.lengthFt.toFixed(1) + ' FT)'], ['SCORE', fmt(G.score) + (G.score >= G.save.best && G.score > 0 ? '  NEW BEST!' : '')], ['SURVIVED', mins + 'M ' + secs + 'S'],
      ['THINGS EATEN', String(s.eaten)], ['KILLS', String(s.kills)], ['BOSSES SLAIN', String(s.bosses)], ['BOATS SUNK', String(s.boats)], ['BIGGEST MEAL', s.biggest || '-'],
      ['EVOLUTION', P.picked.filter(p => !p.startsWith('mut')).map(p => PATHS[p.split(':')[0]].name[0] + (+p.split(':')[1] + 1)).join(' ') || 'NONE'],
    ];
    rows.forEach((r, i) => { const y = 92 + i * 14; Font.draw(ctx, r[0], W / 2 - 140, y, { color: '#c09090' }); Font.draw(ctx, r[1], W / 2 + 140, y, { color: '#ffffff', align: 'right' }); });
    Font.draw(ctx, 'BEST ' + fmt(G.save.best) + '     LONGEST ' + G.save.bestLen.toFixed(1) + ' FT', W / 2, 244, { color: '#90a898', align: 'center' });
    if (t > 1 && Math.floor(t * 2) % 2 === 0) Font.draw(ctx, 'PRESS ENTER TO HUNT AGAIN', W / 2, 262, { color: '#ffe060', align: 'center', scale: 2, outline: '#402000' });
    Font.draw(ctx, 'ESC: TITLE', W / 2, 290, { color: '#708878', align: 'center' });
  },
  drawPause(ctx) {
    const W = G.W, H = G.H;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    Font.draw(ctx, 'PAUSED', W / 2, 40, { color: '#ffffff', align: 'center', scale: 3, outline: '#203030' });
    const S = G.settings;
    const opts = [['1', 'GORE', S.gore ? 'ON' : 'REDUCED'], ['2', 'SCREEN SHAKE', S.shake ? 'ON' : 'LOW'], ['3', 'MOUSE STEERING', S.mouseMove ? 'ON' : 'OFF'], ['M', 'SOUND', SFX.muted ? 'OFF' : 'ON']];
    this.panel(ctx, W / 2 - 120, 80, 240, 70);
    opts.forEach((o, i) => { Font.draw(ctx, '[' + o[0] + '] ' + o[1], W / 2 - 110, 90 + i * 14, { color: '#d0dcc8' }); Font.draw(ctx, o[2], W / 2 + 110, 90 + i * 14, { color: '#ffe060', align: 'right' }); });
    this.drawHelpBody(ctx, 164);
    Font.draw(ctx, 'ESC / P: RESUME      Q: QUIT TO TITLE', W / 2, H - 16, { color: '#90a898', align: 'center' });
  },
  drawHelpBody(ctx, y) {
    const W = G.W;
    const lines = [
      'SWIM WITH WASD. BITE WITH SPACE. DASH WITH SHIFT.', 'TINY PREY IS SWALLOWED WHOLE. BIGGER PREY TAKES BITES.',
      'BITE MEDIUM PREY TO LATCH ON, THEN BITE AGAIN TO DEATH ROLL.', 'LEAP OUT OF THE WATER TO SNATCH BIRDS. CRAWL ONTO BANKS FOR DEER.',
      'GROW TO A NEW SIZE TIER TO SHED YOUR SKIN AND PICK AN EVOLUTION.', 'PREDATORS HUNT YOU WHEN YOU ARE SMALL. THEY FLEE WHEN YOU ARE BIG.',
      'POACHERS SHOOT FROM AIRBOATS. BREACH TO EAT THEM OR CRUSH THE HULL.', 'HUNGER DRAINS. ALWAYS BE EATING.',
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
  drawScreenFx(ctx) {
    const W = G.W, H = G.H;
    ctx.drawImage(this.vignette, 0, 0);
    if (G.red > 0.01) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, `rgba(180,0,0,${Math.min(0.85, G.red).toFixed(3)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (G.white > 0.01) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, G.white).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    const P = G.player;
    if (P && !P.dead && P.hp / P.maxHp < 0.25 && G.state === 'play') { const a = 0.15 + 0.1 * Math.sin(G.t * 6); const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(120,0,0,${a.toFixed(3)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  },
};
