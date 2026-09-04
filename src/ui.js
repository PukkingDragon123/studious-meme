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
    // genome strip: a live double helix carrying every splice you have taken
    const beads = DNA.beads(P);
    const gx = W - 96, gy = H - 26;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(gx - 4, gy - 3, 92, 20);
    DNA.drawMini(ctx, gx, gy, 84, 14, G.t, beads, beads.length ? beads[beads.length - 1].color : '#40f0c8');
    Font.draw(ctx, 'GENOME ' + beads.length, gx + 42, gy + 16, { color: '#7f9a90', align: 'center' });
    // acquired animal traits
    if (P.traits.length) {
      let ty = 40;
      for (const id of P.traits.slice(-6)) {
        const t = TRAIT_BY_ID[id]; if (!t) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(9, ty - 1, Font.width(t.name) + 6, 9);
        ctx.fillStyle = t.color; ctx.fillRect(9, ty - 1, 2, 9);
        Font.draw(ctx, t.name, 14, ty, { color: t.color });
        ty += 11;
      }
    }
    if (P.st.magnet) Font.draw(ctx, 'LURE ACTIVE', 10, H - 26, { color: '#ff8a4a', shadow: true });
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
    const lines = ['WASD / ARROWS ..... SWIM (UP ON LAND: HOP)', 'SPACE / J ......... BITE  (AGAIN WHEN LATCHED: DEATH ROLL)', 'SHIFT / K ......... DASH', 'TOUCH ............. LEFT THUMB SWIMS, PADS BITE AND DASH', 'P: PAUSE    H: HELP    C: TRAIT CODEX    M: MUTE', '', 'EAT WHAT IS SMALLER. FLEE WHAT IS BIGGER. KEEP EATING OR STARVE.'];
    lines.forEach((l, i) => Font.draw(ctx, l, W / 2 - 142, 186 + i * 11, { color: i === 6 ? '#ffb060' : '#d0dcc8' }));
    const s = G.save;
    const have = ANIMAL_TRAITS.filter(t => !t.unlock || Meta.isUnlocked(t.id)).length;
    Font.draw(ctx, 'BEST SCORE ' + fmt(s.best) + '     LONGEST CROC ' + s.bestLen.toFixed(1) + ' FT     TRAITS ' + have + '/' + ANIMAL_TRAITS.length, W / 2, H - 22, { color: '#90a898', align: 'center', shadow: true });
    Font.draw(ctx, 'SOUND: ' + (SFX.muted ? 'OFF' : 'ON') + '  (M)', W - 8, H - 10, { color: '#708878', align: 'right' });
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
    // joystick: shows where the thumb landed
    if (T.joy) {
      ring(T.sx, T.sy, 32, 0.35, '#ffffff');
      disc(T.sx, T.sy, 30, 0.12, '#ffffff');
      disc(T.sx + T.jx * 26, T.sy + T.jy * 26, 12, 0.5, '#8fe8d0');
      ring(T.sx + T.jx * 26, T.sy + T.jy * 26, 12, 0.8, '#ffffff');
    } else {
      ring(70, G.H - 60, 30, 0.16, '#ffffff');
      Font.draw(ctx, 'SWIM', 70, G.H - 64, { color: 'rgba(255,255,255,0.4)', align: 'center' });
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
