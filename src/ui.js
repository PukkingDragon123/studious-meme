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
    ctx.fillStyle = 'rgba(6,12,12,0.6)'; ctx.fillRect(6, 6, 130, 30);
    this.bracket(ctx, 6, 6, 130, 30, 'rgba(120,220,200,0.45)', 5);
    this.meter(ctx, 30, 10, 100, 8, P.hp / P.maxHp, lowHp && Math.floor(t * 6) % 2 ? '#ff7a6a' : '#d83a2a', '#2a0e0c');
    this.meter(ctx, 30, 23, 100, 6, P.hunger / 100, P.starving && Math.floor(t * 8) % 2 ? '#ffe080' : '#e0902a', '#2a1c0a');
    // heart + jaw icons
    ctx.fillStyle = lowHp && Math.floor(t * 6) % 2 ? '#ff8a7a' : '#d83a2a';
    ctx.fillRect(12, 11, 4, 5); ctx.fillRect(18, 11, 4, 5); ctx.fillRect(11, 13, 12, 3); ctx.fillRect(13, 16, 8, 2); ctx.fillRect(15, 18, 4, 2);
    ctx.fillStyle = '#e0902a'; ctx.fillRect(12, 23, 11, 3); ctx.fillStyle = '#f4f0e0';
    for (let i = 0; i < 4; i++) ctx.fillRect(13 + i * 3, 26, 2, 2);
    ctx.fillRect(12, 28, 11, 2);
    // ---- how much of you they have worked out, and how much the water is
    // doing for you. These two bars are the whole stealth game.
    {
      const st = Alarm.stage(), lv = Alarm.level, con = Alarm.concealment(P), hid = Alarm.hidden(P);
      const ax = 6, ay = 40, aw = 130;
      ctx.fillStyle = 'rgba(6,12,12,0.6)'; ctx.fillRect(ax, ay, aw, 24);
      this.bracket(ctx, ax, ay, aw, 24, Alarm.flashT > 0 && Math.floor(t * 12) % 2 ? st.col : 'rgba(120,220,200,0.35)', 5);
      // an eye that opens as they get surer
      const ec = lv > 0.62 ? st.col : lv > 0.3 ? st.col : '#3f6f66';
      ctx.fillStyle = ec;
      const lid = Math.round(3 * (1 - clamp(lv * 1.4, 0, 1)));
      ctx.fillRect(ax + 6, ay + 5 + lid, 11, 7 - lid * 2);
      ctx.fillStyle = '#0a1412'; ctx.fillRect(ax + 10, ay + 6 + lid, 3, 5 - lid * 2);
      this.meter(ctx, ax + 22, ay + 5, aw - 30, 6, lv, st.col, '#2a1408');
      // and the cover you are under
      ctx.fillStyle = hid ? '#3fd0a8' : '#4a5a58';
      ctx.fillRect(ax + 6, ay + 15, 4, 6); ctx.fillRect(ax + 5, ay + 14, 6, 2);
      this.meter(ctx, ax + 22, ay + 15, aw - 30 - (hid ? 40 : 0), 5, con, hid ? '#3fd0a8' : '#7a8a86', '#0d1e1c');
      if (hid) Font.draw(ctx, 'HIDDEN', ax + aw - 5, ay + 14, { color: '#3fd0a8', align: 'right' });
    }
    // status reads as a column of lit tabs rather than three words
    let ty2 = 8;
    const tab = (col, on) => { if (!on) return; ctx.fillStyle = Math.floor(t * 5) % 2 ? col : mixColor(col, '#101816', 0.45); ctx.fillRect(140, ty2, 4, 8); ty2 += 10; };
    tab('#60ff60', P.poisonT > 0);
    tab('#ff5030', P.frenzyT > 0);
    tab('#ff6060', !!P.missingLimbs);
    // environment meters only exist where the environment is trying to kill you
    let hy2 = 66;                       // under the alarm panel, never over it
    const haz = (label, v, col, warn) => {
      if (v <= 0.5) return;
      const f = clamp(v / 100, 0, 1), hot = f > 0.72;
      ctx.fillStyle = 'rgba(6,12,12,0.6)'; ctx.fillRect(6, hy2, 96, 11);
      Font.draw(ctx, label, 9, hy2 + 3, { color: hot && Math.floor(t * 6) % 2 ? warn : '#7f9a90' });
      this.meter(ctx, 44, hy2 + 3, 54, 5, f, hot && Math.floor(t * 6) % 2 ? warn : col, '#141c1a');
      hy2 += 13;
    };
    haz('FILTH', P.toxin || 0, '#8ab820', '#e0ff40');
    haz('PRESS', P.crush || 0, '#4a9ac8', '#a0e8ff');
    haz('DOSE', P.rads || 0, '#3ef07a', '#d0ffb0');
    // what is in your jaws right now, and how much of it is left to work
    if (P.mouth) {
      const M = P.mouth, f = clamp(M.done / M.need, 0, 1);
      ctx.fillStyle = 'rgba(6,12,12,0.6)'; ctx.fillRect(6, hy2, 96, 11);
      Font.draw(ctx, 'CHEW', 9, hy2 + 3, { color: Math.floor(t * 6) % 2 ? '#ffd060' : '#c0a040' });
      this.meter(ctx, 44, hy2 + 3, 54, 5, f, '#d4564a', '#2a1410');
      hy2 += 13;
    }
    this.hazBottom = hy2;               // the mission bar starts below whatever is lit
    // size / tier
    const tier = TIERS[P.tier], next = TIERS[P.tier + 1];
    Font.draw(ctx, P.lengthFt.toFixed(1), W / 2 - 12, 6, { color: '#eaf2dc', align: 'right', scale: 2, outline: '#0a1a08' });
    Font.draw(ctx, 'FT', W / 2 - 8, 12, { color: '#7f9a90' });
    // tier as a row of notches: the name was a word doing a pip's job
    for (let i = 0; i < TIERS.length; i++) {
      ctx.fillStyle = i < P.tier ? '#6ad040' : i === P.tier ? '#b8ffa0' : '#20301c';
      ctx.fillRect(W / 2 + 6 + i * 5, 8 + (i === P.tier ? -1 : 1), 3, i === P.tier ? 10 : 6);
    }
    if (next) {
      const m0 = sizeToMass(tier.size), m1 = sizeToMass(next.size);
      this.meter(ctx, W / 2 - 62, 22, 124, 4, (P.mass - m0) / (m1 - m0), '#6ad040', '#0d2010');
    }
    // gene points: a hex chip that pulses when you can spend
    const gp = P.genePoints, canBuy = GENES.some(g => Genome.unlocked(P, g) && Genome.cost(P, g) <= gp);
    const gx = W - 42, gy = 19, pulse = canBuy ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
    this.hex(ctx, gx, gy, 14, canBuy ? mixColor('#1a3a34', '#40f0c8', pulse * 0.45) : '#16241f', canBuy ? '#40f0c8' : '#31463f', 2);
    Font.draw(ctx, String(gp), gx, gy - 4, { color: canBuy ? '#b8ffe8' : '#8aa89c', align: 'center', scale: gp > 99 ? 1 : 2, outline: '#06110e' });
    const touchUI = G.touchUI || Input.touch.active;
    if (touchUI) { ctx.globalAlpha = canBuy ? 0.8 : 0.35; this.hex(ctx, gx, gy, 17, null, '#ffffff', 1); ctx.globalAlpha = 1; }
    if (canBuy) { ctx.fillStyle = Math.floor(t * 4) % 2 ? '#40f0c8' : '#1a3a34'; for (let i = 0; i < 3; i++) ctx.fillRect(gx - 4 + i * 4, gy + 16, 2, 2); }
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
      ctx.fillStyle = '#0d1512'; ctx.fillRect(px2 - 1, py2 - 1, 5, 13);
      ctx.fillStyle = L.color;
      for (let k = 0; k < d; k++) ctx.fillRect(px2, py2 + 9 - k * 3, 3, 2);
      px2 += 8;
    }
    if (P.apex) { const AC = LINEAGES[P.apex].color; this.hex(ctx, 16, H - 26, 7, AC, '#04120e', 1); ctx.fillStyle = '#04120e'; ctx.fillRect(15, H - 28, 3, 5); }
    // stamina: the speed button drinks from this, and so does the leap
    {
      const sw = 46, sx2 = 10, sy2 = H - 14, f = clamp(P.stam / P.maxStam, 0, 1);
      const spent = P.noStamT > 0;
      ctx.fillStyle = '#0d1210'; ctx.fillRect(sx2 - 1, sy2 - 1, sw + 2, 8);
      const col2 = spent ? (Math.floor(t * 8) % 2 ? '#ff7060' : '#7a3028') : P.boosting ? '#bfe8ff' : '#60c0ff';
      ctx.fillStyle = '#1a2830'; ctx.fillRect(sx2, sy2, sw, 6);
      ctx.fillStyle = col2; ctx.fillRect(sx2, sy2, Math.round(sw * f), 6);
      ctx.fillStyle = mixColor(col2, '#ffffff', 0.5); ctx.fillRect(sx2, sy2, Math.round(sw * f), 2);
      // the leap threshold, so you can see when an upward flick is affordable
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(sx2 + Math.round(sw * 0.3 / P.maxStam), sy2, 1, 6);
      if (P.boosting) { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) ctx.fillRect(sx2 + sw + 3 + i * 3, sy2 + 1 + (i % 2), 2, 2); }
    }
    // brace: one bar that empties when you use it, so timing it is visible
    {
      const bw = 26, bx = 62, by = H - 13, f = 1 - clamp(P.braceCd / 1.5, 0, 1);
      ctx.fillStyle = '#0d1210'; ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
      ctx.fillStyle = P.braceT > 0 ? '#bfe8ff' : f >= 1 ? '#5f9fbf' : '#233440';
      ctx.fillRect(bx, by, Math.round(bw * (P.braceT > 0 ? 1 : f)), 4);
      if (P.braceFlash > 0) { ctx.globalAlpha = clamp(P.braceFlash * 4, 0, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 1, by - 1, bw + 2, 6); ctx.globalAlpha = 1; }
    }
    // standing order: one line, a hairline of progress under it
    Labyrinth.draw(ctx);
    Lairs.draw(ctx);
    const mh = Missions.hud();
    if (mh) {
      const my = Math.max(70, this.hazBottom || 70), mw = 150;
      ctx.fillStyle = 'rgba(6,14,12,0.55)'; ctx.fillRect(8, my - 2, mw, 13);
      ctx.fillStyle = mh.col; ctx.fillRect(8, my - 2, 2, 13);
      const flash = G.mission && G.mission.flashT > 0 && Math.floor(t * 12) % 2;
      Font.draw(ctx, mh.text, 14, my, { color: flash ? '#ffffff' : mh.col });
      ctx.fillStyle = '#16241f'; ctx.fillRect(10, my + 9, mw - 4, 1);
      ctx.fillStyle = mh.col; ctx.fillRect(10, my + 9, Math.round((mw - 4) * clamp(mh.frac, 0, 1)), 1);
    }
    // dispatch: the lab talking about you on an open channel, typed in
    const dp = G.dispatch;
    if (dp) {
      const dy = H - 78, dw = Math.min(W - 24, Math.max(160, Font.width(dp.text, 1) + 34));
      const fade = clamp(Math.min(dp.t * 3, (dp.life - dp.t) * 3), 0, 1);
      ctx.globalAlpha = fade;
      ctx.fillStyle = 'rgba(4,12,12,0.78)'; ctx.fillRect(12, dy, dw, 20);
      ctx.fillStyle = '#2fd08a'; ctx.fillRect(12, dy, 2, 20);
      // carrier light and a level meter that twitches while the voice runs
      const live = dp.t < dp.life - 1.2;
      ctx.fillStyle = live && Math.floor(t * 6) % 2 ? '#ff5030' : '#40201a';
      ctx.fillRect(18, dy + 4, 3, 3);
      for (let i = 0; i < 5; i++) { const lv = live ? Math.abs(Math.sin(t * (8 + i * 3) + i)) : 0; ctx.fillStyle = lv > 0.4 ? '#2fd08a' : '#17392c'; ctx.fillRect(24 + i * 3, dy + 6 - Math.round(lv * 2), 2, 2 + Math.round(lv * 2)); }
      Font.draw(ctx, 'DISPATCH', 42, dy + 3, { color: '#4f7f74' });
      const shown = dp.text.slice(0, Math.max(0, Math.floor(dp.t * 44)));
      Font.draw(ctx, shown, 18, dy + 12, { color: '#d8e8de' });
      if (shown.length < dp.text.length && Math.floor(t * 10) % 2) { ctx.fillStyle = '#2fd08a'; ctx.fillRect(18 + Font.width(shown, 1) + 1, dy + 12, 4, 7); }
      ctx.globalAlpha = 1;
    }
    // a claimed-but-unreached relic gets an arrow, it is the point of the run
    if (G.mission && G.mission.relic && !G.mission.relic.remove) {
      const r = G.mission.relic, [rsx, rsy] = G.cam.toScreen(r.x, r.y);
      if (rsx < 8 || rsx > W - 8 || rsy < 8 || rsy > H - 8) {
        const ax = clamp(rsx, 14, W - 14), ay = clamp(rsy, 14, H - 14);
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
        drawRelicGlyph(ctx, r.art, ax, ay, t);
        ctx.globalAlpha = 1;
      }
    }
    // biome name, bottom right
    const B = Biome.at(P.x);
    Font.draw(ctx, B.name, W - 10, H - 12, { color: '#7f9a90', align: 'right' });
    // The jaw-lock gauge. This used to be a ring drawn around the crocodile,
    // which put the thing you had to read on top of the thing you had to watch.
    // It is an instrument now, parked at the bottom of the screen where a
    // fighting game would put it, and the window is most of the bar.
    if (P.rollT > 0) this.drawRollGauge(ctx, P, t);
    // hints, stacked upward so two warnings never print on the same line
    const hints = [];
    if (P.tether) hints.push(['BITE THE LINE', '#ff8040', 1]);
    if (P.latched && P.rollT <= 0) hints.push(['BITE TO ROLL', '#ff9080', 1]);
    if (P.grabbed) hints.push(['MASH BITE', '#ff6040', Math.floor(t * 8) % 2 ? 1 : 2]);
    let hy = H - 20;
    for (const [txt, col, sc] of hints) {
      Font.draw(ctx, txt, W / 2, hy - (sc - 1) * Font.H, { color: col, align: 'center', shadow: true, scale: sc });
      hy -= Font.H * sc + 3;
    }
    // boss bar
    if (G.boss && !G.boss.dead && !G.finisher) {
      const b = G.boss, frac = b.hp / b.maxHp;
      Font.draw(ctx, b.name, W / 2, 32, { color: b.staggered ? '#ffd060' : '#ff6060', align: 'center', shadow: true });
      this.meter(ctx, W / 2 - 100, 41, 200, 6, frac, b.staggered ? '#ffd060' : frac < 0.3 ? '#ffb020' : '#e02020', '#200808');
      // phase breaks marked on the bar, and the phase you are in as pips
      if (b.bossMax) {
        ctx.fillStyle = '#0a0404';
        for (let i = 1; i < b.bossMax; i++) { const fx2 = W / 2 - 100 + Math.round(200 * (1 - i / b.bossMax)); ctx.fillRect(fx2, 41, 1, 6); }
        for (let i = 0; i < b.bossMax; i++) { ctx.fillStyle = i < b.bossPhase ? '#ff8040' : '#3a1414'; ctx.fillRect(W / 2 - 100 + i * 5, 49, 3, 2); }
        if (b.invulnB) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 20); Font.draw(ctx, 'BREAKING', W / 2 + 100, 49, { color: '#ff5030', align: 'right', shadow: true }); ctx.globalAlpha = 1; }
        else if (b.staggered) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 12); Font.draw(ctx, 'STAGGERED', W / 2 + 100, 49, { color: '#ffd060', align: 'right', shadow: true }); ctx.globalAlpha = 1; }
      }
      if (b.staggered && !G.finisher) {
        const near = Boss.canFinish(b);
        const blink = Math.floor(t * 8) % 2;
        Font.draw(ctx, near ? 'BITE TO FINISH' : 'CLOSE IN', W / 2, H * 0.72, { color: blink ? '#ffffff' : '#ffd060', align: 'center', scale: 2, outline: '#3a2000' });
        const sT = clamp(b.staggerT / 6, 0, 1);
        ctx.fillStyle = '#2a2008'; ctx.fillRect(W / 2 - 50, H * 0.72 + 14, 100, 2);
        ctx.fillStyle = '#ffd060'; ctx.fillRect(W / 2 - 50, H * 0.72 + 14, Math.round(100 * sT), 2);
      }
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
    // two words on a first run, and only a first run. The game teaches itself.
    if (G.t < 11 && G.state === 'play' && (G.save.runs || 0) < 1 && !G.finisher && P.rollT <= 0) {
      const touch = G.touchUI || Input.touch.active;
      const msgs = touch ? ['LEFT THUMB TO SWIM', 'BITE PAD TO EAT'] : ['ARROWS TO SWIM', 'SPACE TO EAT'];
      ctx.globalAlpha = clamp(Math.min(G.t, 11 - G.t), 0, 1);
      Font.draw(ctx, msgs[G.t < 5.5 ? 0 : 1], W / 2, H - 46, { color: '#ffffff', align: 'center', shadow: true });
      ctx.globalAlpha = 1;
    }
  },
  drawRollGauge(ctx, P, t) {
    const W = G.W, H = G.H;
    const gw = 214, gh = 15, gx = Math.round(W / 2 - gw / 2), gy = H - 60;
    const ph = P.qteT || 0;
    // window bounds as fractions of the bar, wrapped
    const wrap = v => ((v % 1) + 1) % 1;
    const zone = (c, half, col, h2, yoff) => {
      const a = wrap(c - half), b = wrap(c + half);
      ctx.fillStyle = col;
      if (a < b) ctx.fillRect(gx + Math.round(a * gw), gy + yoff, Math.round((b - a) * gw), h2);
      else { ctx.fillRect(gx, gy + yoff, Math.round(b * gw), h2); ctx.fillRect(gx + Math.round(a * gw), gy + yoff, gw - Math.round(a * gw), h2); }
    };
    // housing
    ctx.fillStyle = 'rgba(4,10,12,0.9)'; ctx.fillRect(gx - 5, gy - 12, gw + 10, gh + 26);
    this.bracket(ctx, gx - 5, gy - 12, gw + 10, gh + 26, 'rgba(255,180,90,0.55)', 7);
    // track
    ctx.fillStyle = '#101a1c'; ctx.fillRect(gx, gy, gw, gh);
    // the bands: a wide green tear window with a gold core inside it
    const RW = (P.st && P.st.rollWindow) || 1, WG = QTE_GOOD * RW, WP = QTE_PERFECT * RW;
    zone(QTE_AT, WG, '#1d5a4a', gh, 0);
    zone(QTE_AT, WP, '#8a6a10', gh, 0);
    zone(QTE_AT, WG, '#2f8a72', 2, 0);
    zone(QTE_AT, WP, '#ffd040', 2, 0);
    // tick marks along the track
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let i = 1; i < 16; i++) ctx.fillRect(gx + Math.round(i * gw / 16), gy, 1, i % 4 === 0 ? gh : 3);
    // needle, with a trail behind it so the direction reads at a glance
    const nx = gx + Math.round(wrap(ph) * gw);
    const inWin = Math.min(Math.abs(ph - QTE_AT), 1 - Math.abs(ph - QTE_AT)) < WG;
    for (let k = 1; k <= 5; k++) {
      const tx = nx - k * 3;
      if (tx < gx) continue;
      ctx.globalAlpha = 0.32 - k * 0.05; ctx.fillStyle = '#ffffff';
      ctx.fillRect(tx, gy + 2, 2, gh - 4);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#050a0c'; ctx.fillRect(nx - 2, gy - 3, 5, gh + 6);
    ctx.fillStyle = inWin ? '#ffffff' : '#bfe8ff'; ctx.fillRect(nx - 1, gy - 3, 3, gh + 6);
    // chevrons above and below the needle
    ctx.fillStyle = inWin ? '#ffd040' : '#5f9fbf';
    ctx.fillRect(nx - 3, gy - 6, 7, 2); ctx.fillRect(nx - 2, gy - 8, 5, 2);
    ctx.fillRect(nx - 3, gy + gh + 4, 7, 2); ctx.fillRect(nx - 2, gy + gh + 6, 5, 2);
    // the call to action, on a key cap so it matches the finisher
    const beats = P.qteBeats || 0, hits = P.qteHits || 0;
    const touch = G.touchUI || Input.touch.active;
    const lit = inWin && Math.floor(t * 14) % 2 === 0;
    drawKeyCap(ctx, gx - 2, gy - 34, 52, 18, touch ? 'TAP' : 'BITE', { lit: inWin, color: '#ffd040', scale: 2 });
    Font.draw(ctx, inWin ? 'NOW' : 'WAIT', gx + 58, gy - 29, { color: inWin ? (lit ? '#ffffff' : '#ffd040') : '#5f7f78', scale: 2, outline: '#2a1400' });
    Font.draw(ctx, 'JAW LOCK', gx + gw - 2, gy - 30, { color: '#a86a20', align: 'right' });
    // beats landed, as a row of teeth
    for (let i = 0; i < Math.max(6, beats); i++) {
      const bx = gx + gw - 6 - i * 7;
      const on = i < Math.min(hits, 12);
      ctx.fillStyle = on ? '#ffd040' : '#2a2018';
      ctx.fillRect(bx - 4, gy + gh + 5, 5, 4);
      if (on) { ctx.fillStyle = '#fff0a0'; ctx.fillRect(bx - 4, gy + gh + 5, 5, 1); }
    }
    // the last call, punched out over the gauge
    if (P.qteLastT > 0 && P.qteLast >= 0) {
      const k = clamp(P.qteLastT * 2, 0, 1);
      const txt = P.qteLast === 2 ? 'TEAR!' : P.qteLast === 1 ? 'GOOD' : 'EARLY';
      const col = P.qteLast === 2 ? '#fff060' : P.qteLast === 1 ? '#9ef0c8' : '#ff9080';
      ctx.globalAlpha = k;
      Font.draw(ctx, txt, W / 2, gy - 58 - (1 - k) * 8, { color: col, align: 'center', scale: P.qteLast === 2 ? 4 : 3, outline: '#1a0e00' });
      ctx.globalAlpha = 1;
    }
    if (P.perfectT > 0) {
      ctx.globalAlpha = clamp(P.perfectT, 0, 1);
      Font.draw(ctx, 'PERFECT ROLL', W / 2, 52, { color: '#fff060', align: 'center', scale: 3, outline: '#3a2000' });
      ctx.globalAlpha = 1;
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
    return GENES.map(g => {
      const [sx, sy] = Genome.pos(g, cx, cy, R);
      // node size carries its role: minors are beads on the lateral roads,
      // chimeras and apexes are the far ends of the network
      const k = g.root ? 0.74 : g.minor ? 0.56 : g.chimera ? 0.94 : g.hybrid ? 0.74 : g.apex ? 1.0 : 0.9;
      return { g, sx, sy, R, r: R * k };
    });
  },
  drawGenes(ctx) {
    const W = G.W, H = G.H, P = G.player, t = G.t;
    ctx.fillStyle = 'rgba(3,8,10,0.95)'; ctx.fillRect(0, 0, W, H);
    const cells = this.geneCells(), byId = {};
    for (const c of cells) byId[c.g.id] = c;
    // Links. The tree is really a graph now, so the edges get to carry the
    // reading: dim filaments where nothing is spliced, a lit lineage-coloured
    // trunk with a pulse running along it where both ends are yours.
    const linkCol = (a, b) => {
      const la = a.lin ? LINEAGES[a.lin].color : '#9ad8c0', lb = b.lin ? LINEAGES[b.lin].color : '#9ad8c0';
      return mixColor(la, lb, 0.5);
    };
    const edges = [];
    for (const c of cells) for (const n2 of hexNbrs(c.g)) {
      const o2 = byId[n2.id]; if (!o2) continue;
      if (o2.sx < c.sx || (o2.sx === c.sx && o2.sy < c.sy)) continue;
      edges.push([c, o2]);
    }
    for (const [a, b] of edges) {
      const oa = Genome.has(P, a.g.id), ob = Genome.has(P, b.g.id);
      const both = oa && ob, one = oa || ob;
      const ax = a.sx, ay = a.sy, bx = b.sx, by = b.sy;
      const col = linkCol(a.g, b.g);
      if (both) {
        ctx.strokeStyle = rgba(col, 0.22); ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.strokeStyle = rgba(mixColor(col, '#ffffff', 0.45), 0.9); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      } else {
        ctx.strokeStyle = one ? rgba(col, 0.34) : 'rgba(70,104,100,0.14)';
        ctx.lineWidth = one ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    }
    // signal running down the spliced edges, so the network looks alive
    for (const [a, b] of edges) {
      if (!(Genome.has(P, a.g.id) && Genome.has(P, b.g.id))) continue;
      const ph = ((t * 0.42) + (a.sx + a.sy) * 0.004) % 1;
      const px4 = Math.round(a.sx + (b.sx - a.sx) * ph), py4 = Math.round(a.sy + (b.sy - a.sy) * ph);
      ctx.fillStyle = 'rgba(210,255,240,0.85)'; ctx.fillRect(px4 - 1, py4 - 1, 2, 2);
    }
    // junction stubs: a short tick where an unspliced but reachable node meets
    // something you own, so the frontier of the network is obvious
    for (const [a, b] of edges) {
      const oa = Genome.has(P, a.g.id), ob = Genome.has(P, b.g.id);
      if (oa === ob) continue;
      const from = oa ? a : b, to = oa ? b : a;
      const dx = to.sx - from.sx, dy = to.sy - from.sy, d = Math.hypot(dx, dy) || 1;
      const k2 = (to.r + 3) / d;
      const gx2 = Math.round(to.sx - dx * k2), gy2 = Math.round(to.sy - dy * k2);
      const afford2 = Genome.unlocked(P, to.g) && P.genePoints >= Genome.cost(P, to.g);
      ctx.fillStyle = afford2 && Math.floor(t * 3) % 2 ? '#b8ffe8' : 'rgba(140,220,200,0.5)';
      ctx.fillRect(gx2 - 1, gy2 - 1, 3, 3);
    }
    // cells
    for (const c of cells) {
      const g = c.g, own = Genome.has(P, g.id), open = Genome.unlocked(P, g);
      const L = g.lin ? LINEAGES[g.lin] : null, col = L ? L.color : '#9ad8c0';
      const cost = Genome.cost(P, g), afford = open && P.genePoints >= cost;
      const sel = G.geneSel === g.id;
      const r = c.r * (sel ? 1.14 : 1);
      if (own) { ctx.globalCompositeOperation = 'lighter'; this.hex(ctx, c.sx, c.sy, r * 1.3, rgba(col, 0.12), null); ctx.globalCompositeOperation = 'source-over'; }
      this.hex(ctx, c.sx, c.sy, r, own ? rgba(col, 0.3) : afford ? 'rgba(14,30,28,0.95)' : 'rgba(10,16,18,0.9)', own ? col : afford ? mixColor(col, '#ffffff', 0.2) : open ? shade(col, 0.55) : '#2a3a38', sel ? 2 : 1);
      // icon
      const ic = L ? ICONS[L.icon] : ICONS.croc;
      if (ic && !g.minor) drawIcon(ctx, ic, c.sx, c.sy - 3, r * 1.05, t + c.sx * 0.02, { alpha: own ? 1 : open ? 0.85 : 0.28 });
      // a minor is a bead, not a portrait: a single dot in its lineage colour
      if (g.minor) { ctx.fillStyle = own ? col : open ? shade(col, 0.7) : '#2e3e3c'; ctx.fillRect(Math.round(c.sx) - 2, Math.round(c.sy) - 2, 4, 4); }
      // a chimera gets a second ring: it is the far end of two lineages at once
      if (g.chimera && g.lin2) this.hex(ctx, c.sx, c.sy, r * 0.62, null, own ? LINEAGES[g.lin2].color : shade(LINEAGES[g.lin2].color, 0.5), 1);
      const tb = !own && Genome.tierBlocked(P, g);
      if (tb) { ctx.fillStyle = '#8cd8ff'; ctx.fillRect(Math.round(c.sx) - 3, Math.round(c.sy) + Math.round(r * 0.52), 6, 2); ctx.fillRect(Math.round(c.sx) - 1, Math.round(c.sy) + Math.round(r * 0.52) - 2, 2, 2); }
      const rb = !own && Genome.researchBlocked(g);
      const tp = !rb && Genome.trialBlocked(P, g) ? Trials.progress(P, g) : null;
      if (!open && !own) { ctx.fillStyle = 'rgba(6,10,12,0.55)'; this.hex(ctx, c.sx, c.sy, r, 'rgba(6,10,12,0.5)', null); }
      if (rb) {
        // The lab has not funded this line. Seal it, but seal it in the
        // lineage's own colour — you should still be able to read the shape of
        // the tree and see which branch is the one you have not paid for.
        const sc = mixColor(col, '#16262a', 0.55);
        this.hex(ctx, c.sx, c.sy, r, 'rgba(4,10,12,0.62)', sc, 1);
        ctx.fillStyle = rgba(shade(col, 0.8), 0.35);
        for (let k = -r; k < r; k += 3) ctx.fillRect(Math.round(c.sx + k), Math.round(c.sy - 1), 2, 2);
        ctx.fillStyle = mixColor(col, '#dff0f0', 0.35);
        ctx.fillRect(Math.round(c.sx) - 4, Math.round(c.sy) - 1, 8, 6);
        ctx.fillRect(Math.round(c.sx) - 2, Math.round(c.sy) - 5, 4, 3);
        ctx.fillStyle = '#0e1a1c'; ctx.fillRect(Math.round(c.sx), Math.round(c.sy) + 1, 1, 3);
      }
      if (tp) {
        // a trial gate: the node is reachable, you just have not earned it yet
        this.hex(ctx, c.sx, c.sy, r, null, '#ffa030', 1);
        const f = tp.have / tp.need, n2 = 8, lit = Math.round(f * n2);
        for (let i = 0; i < n2; i++) {
          const a2 = -Math.PI / 2 + (i / n2) * TAU;
          ctx.fillStyle = i < lit ? '#ffd060' : '#4a3418';
          ctx.fillRect(Math.round(c.sx + Math.cos(a2) * (r + 4)) - 1, Math.round(c.sy + Math.sin(a2) * (r + 4)) - 1, 2, 2);
        }
        // a padlock, drawn small
        ctx.fillStyle = Math.floor(t * 3) % 2 ? '#ffd060' : '#c08020';
        ctx.fillRect(Math.round(c.sx) - 3, Math.round(c.sy) - 1, 6, 5);
        ctx.fillRect(Math.round(c.sx) - 2, Math.round(c.sy) - 4, 4, 2);
        ctx.fillStyle = '#2a1c08'; ctx.fillRect(Math.round(c.sx), Math.round(c.sy) + 1, 1, 2);
      }
      // cost pip
      if (!own && g.cost && (open || sel)) { const cy2 = c.sy + r + 1; ctx.fillStyle = afford ? '#0d2a24' : '#141a1c'; ctx.fillRect(c.sx - 7, cy2 - 4, 14, 9); Font.draw(ctx, String(cost), c.sx, cy2 - 3, { color: afford ? '#7affda' : '#8a6a6a', align: 'center' }); }
      if (own && !g.minor) { ctx.fillStyle = col; ctx.fillRect(c.sx - 2, c.sy + r - 5, 4, 4); }
      if (sel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; this.hex(ctx, c.sx, c.sy, r + 3, null, 'rgba(255,255,255,0.5)', 1); }
    }
    // header
    Font.draw(ctx, 'GENE TREE', W / 2, 8, { color: '#ffffff', align: 'center', scale: 2, outline: '#0a2018' });
    this.hex(ctx, 26, 18, 13, '#16241f', '#40f0c8', 2);
    Font.draw(ctx, String(P.genePoints), 26, 12, { color: '#b8ffe8', align: 'center', scale: 2, outline: '#06110e' });
    Font.draw(ctx, 'POINTS', 26, 32, { color: '#7f9a90', align: 'center' });
    {
      // strain: how much instability the body is carrying against what it can hold
      const ld = Genome.load(P), lim = Genome.limit(P), over = ld > lim;
      const frac = clamp(ld / Math.max(1, lim), 0, 1.6);
      Font.draw(ctx, 'STRAIN', 62, 8, { color: over ? '#ff8a7a' : '#7f9a90' });
      this.meter(ctx, 62, 18, 56, 5, Math.min(1, frac), over ? '#ff5a4a' : frac > 0.8 ? '#ffb060' : '#40f0c8', '#1a1210');
      if (frac > 1) { ctx.fillStyle = '#ff5a4a'; ctx.fillRect(118, 17, Math.min(18, (frac - 1) * 40), 7); }
      Font.draw(ctx, ld + '/' + Math.round(lim), 62, 26, { color: over ? '#ff8a7a' : '#7f9a90' });
      if (over) Font.draw(ctx, 'REJECTING', 62, 36, { color: Math.floor(G.t * 4) % 2 ? '#ff5a4a' : '#8a3a34' });
      // splice tax: every extra lineage in you marks up the next gene
      const sp = Genome.spread(P);
      if (sp > 1) Font.draw(ctx, 'SPREAD ' + sp + '  +' + Math.round((sp - 1) * 20) + '%', 128, 26, { color: sp > 2 ? '#ffb060' : '#7f9a90' });
    }
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
    // measure first, then paint the frame at the height the content needs
    const descL = Math.ceil(Font.width(g.desc, 1) / (pw - 16)) + 1, downL = g.down ? Math.ceil(Font.width(g.down, 1) / (pw - 16)) + 1 : 0;
    let phh2 = 30 + descL * 9 + 3 + (downL ? downL * 9 + 3 : 0) + 8;
    if (Trials.of(g) && !Genome.has(P, g.id)) phh2 += 22;
    phh2 = clamp(phh2, 62, 132);
    this.panel(ctx, px3, py3, pw, phh2, 'rgba(6,12,14,0.95)', own ? col : shade(col, 0.6));
    Font.draw(ctx, g.name, px3 + 8, py3 + 7, { color: col });
    const kind = !L ? 'ORIGIN' : g.chimera ? LINEAGES[g.lin2].name + ' CHIMERA' : g.hybrid ? LINEAGES[g.lin2].name + ' HYBRID' : g.minor ? 'MINOR ADAPTATION' : g.apex ? 'APEX' : 'TIER ' + g.ring;
    Font.draw(ctx, (L ? L.name + '  ' : '') + kind, px3 + 8, py3 + 18, { color: g.chimera ? mixColor(col, LINEAGES[g.lin2].color, 0.5) : '#8aa89c' });
    // stack the panel: the downside starts wherever the description ended, and
    // the trial line after that, so a three-line gene never overprints itself
    let panY = py3 + 30;
    panY += Font.drawWrapped(ctx, g.desc, px3 + 8, panY, pw - 16, { color: '#9ef0c8', lineHeight: 9 }) * 9 + 3;
    if (g.down) panY += Font.drawWrapped(ctx, g.down, px3 + 8, panY, pw - 16, { color: '#ff8a7a', lineHeight: 9 }) * 9 + 3;
    if (g.load) Font.draw(ctx, '+' + g.load + ' STRAIN', px3 + pw - 8, py3 + 18, { color: '#ffb060', align: 'right' });
    const cost = Genome.cost(P, g);
    const tprog = Trials.progress(P, g);
    if (tprog && !own) {
      const done = tprog.done;
      const ty2 = Math.max(panY + 2, py3 + 66);
      Font.draw(ctx, 'TRIAL: ' + tprog.t.name, px3 + 8, ty2, { color: done ? '#6ad040' : '#ffa030' });
      const bw2 = pw - 60, bx2 = px3 + 8, by2 = ty2 + 11;
      ctx.fillStyle = '#1a1408'; ctx.fillRect(bx2 - 1, by2 - 1, bw2 + 2, 6);
      ctx.fillStyle = done ? '#6ad040' : '#ffa030'; ctx.fillRect(bx2, by2, Math.round(bw2 * (tprog.have / tprog.need)), 4);
      Font.draw(ctx, Math.floor(tprog.have) + '/' + tprog.need, px3 + pw - 8, by2 - 2, { color: done ? '#6ad040' : '#c08a4a', align: 'right' });
      phh2 = Math.max(phh2, by2 + 10 - py3);
    }
    if (own) Font.draw(ctx, 'SPLICED', px3 + pw - 8, py3 + 7, { color: '#7affda', align: 'right' });
    else if (!open) {
      const tn = Genome.tierBlocked(P, g) ? Genome.tierNeed(g) : 0;
      Font.draw(ctx, g.apex && P.apex ? 'ONE APEX ONLY' : tn ? 'NEEDS ' + TIERS[tn].name : tprog && !tprog.done ? 'TRIAL LOCKED' : 'LOCKED',
        px3 + pw - 8, py3 + 7, { color: tn ? '#8cd8ff' : tprog && !tprog.done ? '#ffa030' : '#7a6a6a', align: 'right' });
    }
    else Font.draw(ctx, cost + ' PT' + (cost === 1 ? '' : 'S') + (P.genePoints >= cost ? '  [SPACE]' : '  SHORT'), px3 + pw - 8, py3 + 7, { color: P.genePoints >= cost ? '#7affda' : '#c08a8a', align: 'right' });
    // the old duplicate close button here is now the shared exit control
    if (!this.exitShown()) Font.draw(ctx, 'SPACE  SPLICE', W / 2, H - 11, { color: '#7f9a90', align: 'center' });
    this.drawExit(ctx);
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
  // ---------- the Science Center front end ----------
  // The room does the talking. This is a hanging sign, a selection bracket
  // around whichever piece of furniture you are pointed at, and a footer.
  labStations() {
    const F = LAB.FLOOR, W = G.W, H = G.H;
    const out = [
      { id: 'habitat', x: 258, y: 78, w: 124, h: 218, label: 'HABITAT' },
      { id: 'lab', x: 400, y: F - 168, w: 234, h: 168, label: 'LAB' },
    ];
    // the induction's dialogue bar owns the foot of the screen, so the plates
    // move up out from under it while it is running
    const pw = 102, ph = 26, gap = 8;   // 'RESEARCH' at double height needs the room
    const py = H - 48;
    const total = out.length * pw + (out.length - 1) * gap;
    out.forEach((s2, i) => { s2.bx = Math.round(W / 2 - total / 2 + i * (pw + gap)); s2.by = py; s2.bw = pw; s2.bh = ph; });
    return out;
  },
  drawTitle(ctx) {
    const W = G.W, H = G.H, t = G.titleT;
    const st = this.labStations(), si = clamp(G.labSel === undefined ? 1 : G.labSel, 0, st.length - 1), sel = st[si];

    // --- the sign, slung from the ceiling pipes. The whole title is the logo.
    const sw = 214, sx = Math.round(W / 2 - sw / 2), sy = 34, sh = 30;
    ctx.fillStyle = '#2a3c42'; ctx.fillRect(sx + 24, 20, 3, 14); ctx.fillRect(sx + sw - 27, 20, 3, 14);
    ctx.fillStyle = '#0c1417'; ctx.fillRect(sx - 3, sy - 3, sw + 6, sh + 6);
    ctx.fillStyle = '#16242a'; ctx.fillRect(sx, sy, sw, sh);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.10 + 0.03 * Math.sin(t * 3);
    ctx.fillStyle = '#ff5030'; ctx.fillRect(sx + 4, sy + 4, sw - 8, sh - 8);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    this.drawLogo(ctx, W / 2, sy + 4, 3, t);

    // --- a bracket in the room around whichever station you are standing at
    const pulse = 0.55 + 0.45 * Math.sin(t * 4);
    ctx.globalAlpha = 0.35 + pulse * 0.5;
    this.bracket(ctx, sel.x, sel.y, sel.w, sel.h, '#7affda', 15);
    ctx.globalAlpha = 1;

    // --- two plates, one per station, always both visible. No tabs, no blurb.
    const py = st[0].by;
    st.forEach((s2, i) => {
      const on = i === si;
      ctx.fillStyle = on ? 'rgba(10,32,29,0.95)' : 'rgba(4,12,12,0.8)';
      ctx.fillRect(s2.bx, s2.by, s2.bw, s2.bh);
      ctx.fillStyle = on ? '#7affda' : '#22403c'; ctx.fillRect(s2.bx, s2.by, s2.bw, 2);
      Font.draw(ctx, s2.label, s2.bx + s2.bw / 2, s2.by + 9, { color: on ? '#e8fff8' : '#4f7f74', align: 'center', scale: 2, outline: '#04120e' });
      if (on) this.bracket(ctx, s2.bx - 3, s2.by - 3, s2.bw + 6, s2.bh + 6, '#7affda', 8);
    });

    // --- one number that matters, and nothing else
    const d = Research.data();
    if (d > 0) Font.draw(ctx, d + ' DATA', W / 2, py - 13, { color: '#ffe060', align: 'center', outline: '#3a2a00' });
    Font.draw(ctx, 'BEST ' + fmt(G.save.best || 0), 8, H - 10, { color: '#3f6f66' });
    Font.draw(ctx, SFX.muted ? 'SOUND OFF' : 'SOUND ON', W - 8, H - 10, { color: '#3f6f66', align: 'right' });
  },
  // ---------- the research lab ----------
  // A wall of five programme cylinders and, beside the one you are looking at,
  // its chain of steps. A step does not say what it does: it SHOWS it. The
  // crocodile it unlocks, the colours it mixes, the lineage it opens, the place
  // it finds. The only writing on this screen is a price and a total.
  // The board is a real object bolted to the lab wall, and the room carries on
  // around it: ceiling and cables above, floor and staff below. Everything on
  // it is a labelled specimen card in a slot, with a picture of what it is.
  resBoard() { return { x: 6, y: 58, w: G.W - 12, h: 240 }; },
  // The bay where animals are grown sits at the head of the rack, above the
  // five programmes: it is the first thing the lab does, so it is the first
  // thing on the board.
  resCatRects() {
    const B = this.resBoard(), h = 42, gap = 4, y0 = B.y + 10;
    return RESEARCH.map((c, i) => ({ x: B.x + 8, y: y0 + i * (h + gap), w: 96, h, c, i }));
  },
  resNodeRects() {
    const B = this.resBoard();
    const cat = RESEARCH[clamp(G.resCat || 0, 0, RESEARCH.length - 1)];
    const x = B.x + 116, n = cat.nodes.length, avail = B.h - 20;
    // a short programme gets taller cards and sits in the middle of the board,
    // rather than hanging off the top of it with dead steel underneath
    const h = clamp(Math.floor((avail - (n - 1) * 4) / n), 18, 44), step = h + 4;
    const y = B.y + Math.round((B.h - (n * h + (n - 1) * 4)) / 2);
    return cat.nodes.map((nd, i) => ({ x, y: Math.round(y + i * step), w: B.x + B.w - 8 - x, h, nd, i }));
  },
  resState(nd) { return Research.has(nd.id) ? 'done' : !Research.open(nd) ? 'locked' : Research.data() >= nd.cost ? 'ready' : 'short'; },
  // one small crocodile, for the steps that unlock a stock
  resCroc(ctx, spId, cx, cy, scale, dim) {
    const sp = SPECIES_BY_ID[spId]; if (!sp) return;
    if (!this._resV) { this._resV = CrocView.make(); this._resV.t = 2.2; for (let k = 0; k < 40; k++) CrocView.update(this._resV, 1 / 60, 7); }
    const L = Object.assign({}, CROC_LOOKS.base, sp.look || {});
    L.girth = sp.girth || 1;
    if (dim) { for (const k of ['back', 'mid', 'belly', 'dark']) if (L[k]) L[k] = mixColor(L[k], '#0e1a1c', 0.72); L.eye = '#2a3a38'; }
    CrocView.draw(ctx, this._resV, this.habParts(L), cx, cy, scale);
  },
  // the pictogram bank: what a treatment does, drawn as well as written
  resPic(ctx, id, x, y, col) {
    const px = (a, b, w, h, c) => { ctx.fillStyle = c || col; ctx.fillRect(Math.round(x + a), Math.round(y + b), Math.max(1, w), Math.max(1, h)); };
    switch (id) {
      case 'heart': px(-5, -4, 4, 3); px(1, -4, 4, 3); px(-6, -2, 12, 3); px(-4, 1, 8, 2); px(-2, 3, 4, 2); break;
      case 'filter': px(-6, -6, 12, 2); px(-5, -4, 10, 2); px(-3, -2, 6, 2); px(-1, 0, 2, 4); px(-3, 4, 6, 2); break;
      case 'shield': px(-5, -6, 10, 7); px(-4, 1, 8, 3); px(-2, 4, 4, 2); px(-3, -4, 6, 2, '#0e1a18'); break;
      case 'jaw': px(-6, -5, 12, 3); for (let i = 0; i < 5; i++) px(-5 + i * 3, -2, 2, 3, '#f2f4e8'); px(-6, 2, 12, 3); break;
      case 'depth': px(-6, -6, 12, 2); px(-4, -2, 8, 2); px(-2, 2, 4, 2); px(-1, 5, 2, 2); break;
      case 'bolt': px(1, -7, 3, 6); px(-2, -2, 4, 3); px(-4, 1, 3, 6); px(-1, -1, 3, 3); break;
      case 'brain': px(-5, -5, 10, 7); px(-3, -7, 6, 3); px(-4, 2, 8, 3); px(-3, -3, 2, 2, '#0e1a18'); px(1, -3, 2, 2, '#0e1a18'); px(-1, 0, 2, 2, '#0e1a18'); break;
      case 'body': px(-7, -2, 14, 5); px(5, -4, 6, 3); px(-8, -1, 3, 3); px(-3, 3, 2, 3); px(2, 3, 2, 3); break;
      case 'drop': for (let dy = -2; dy <= 5; dy++) { const w = 5 - Math.abs(dy - 2) * 0.6; px(-w, dy, w * 2, 1); } px(-1, -7, 2, 5); break;
      case 'helix': for (let k = 0; k < 7; k++) { const a = k / 6 * Math.PI; px(Math.sin(a) * 5 - 1, -7 + k * 2, 2, 2); px(-Math.sin(a) * 5 - 1, -7 + k * 2, 2, 2); } break;
      case 'flask': px(-2, -7, 4, 3); px(-6, -4, 12, 10); px(-4, -1, 8, 6, '#0e1a18'); break;
      case 'globe': Shape.ring(ctx, x, y, 6, 1, col); px(-6, -1, 13, 1); px(-1, -6, 2, 13); break;
      default: px(-4, -4, 8, 8); break;
    }
  },
  // the thumbnail in a card's specimen well: what the step actually hands you
  resGrantArt(ctx, nd, x, y, w, lit, col) {
    const g = nd.grant, dim = !lit;
    if (nd.pic) { this.resPic(ctx, nd.pic, x + w / 2, y, lit ? col : '#3c4a48'); return; }
    if (!g) return;
    const cx = x + w / 2;
    if (g.species) { this.resCroc(ctx, g.species[0], cx + 4, y + 1, 0.42, dim); return; }
    if (g.paint) {
      const n = g.paint.length, sw = 11;
      g.paint.forEach((id, i) => {
        const pt = PAINT_BY_ID[id], px2 = cx - (n * (sw + 2) - 2) / 2 + i * (sw + 2);
        ctx.fillStyle = lit ? (pt && pt.swatch) || '#5f7048' : '#26322f';
        ctx.fillRect(px2, y - 6, sw, 13);
        if (lit) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(px2, y - 6, sw, 3); }
      });
      return;
    }
    if (g.size) { g.size.forEach((i, k) => { ctx.fillStyle = lit ? col : '#31403e'; const bw = 7 + i * 5; ctx.fillRect(cx - 12 + k * 14, y - 1 + k * 5 - 3, bw, 3); }); return; }
    if (g.girth) { g.girth.forEach((i, k) => { ctx.fillStyle = lit ? col : '#31403e'; const hh = 5 + i * 3; ctx.fillRect(cx - 13 + k * 14, y - hh / 2, 11, hh); }); return; }
    if (g.lineage) { const Ln = LINEAGES[g.lineage[0]]; this.hex(ctx, cx, y, 10, lit ? rgba(Ln.color, 0.3) : 'rgba(12,20,20,0.8)', lit ? Ln.color : '#31403e', 1); return; }
    if (g.hybrid) {
      const a = LINEAGES.abyssal, b2 = LINEAGES.savage;
      this.hex(ctx, cx - 6, y, 8, lit ? rgba(a.color, 0.3) : 'rgba(12,20,20,0.8)', lit ? a.color : '#31403e', 1);
      this.hex(ctx, cx + 6, y, 8, lit ? rgba(b2.color, 0.3) : 'rgba(12,20,20,0.8)', lit ? b2.color : '#31403e', 1);
      return;
    }
    const marks = g.zone ? (STAGES_BY_ZONE[g.zone[0]] || []).slice(2, 3).map(s2 => s2.id) : g.site ? g.site.slice(0, 2) : [];
    marks.forEach((id, i) => {
      ctx.save(); ctx.translate(cx + (marks.length > 1 ? (i - 0.5) * 20 : 0), y + 7); ctx.scale(0.8, 0.8);
      this.drawLandmark(ctx, id, 0, 0, lit); ctx.restore();
    });
  },
  drawResearch(ctx) {
    const W = G.W, H = G.H, t = G.menuT;
    const B = this.resBoard();
    const cat = RESEARCH[clamp(G.resCat || 0, 0, RESEARCH.length - 1)];
    const d = Research.data(), tp = Research.totalProgress();
    if (this._resV) CrocView.update(this._resV, 1 / 60, 7);

    // --- the lamp bar above the board, and the cables that hang it there
    ctx.fillStyle = '#2a3238'; ctx.fillRect(B.x + 40, 24, 3, 10); ctx.fillRect(B.x + B.w - 43, 24, 3, 10);
    ctx.fillStyle = '#1a2226'; ctx.fillRect(B.x + 28, 32, B.w - 56, 8);
    ctx.fillStyle = '#39454c'; ctx.fillRect(B.x + 28, 32, B.w - 56, 2);
    ctx.fillStyle = '#ffeec0'; ctx.fillRect(B.x + 34, 38, B.w - 68, 2);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.10;
    ctx.drawImage(this.bake('reslamp', o => {
      const g2 = o.createLinearGradient(0, 40, 0, B.y + 120);
      g2.addColorStop(0, 'rgba(255,238,190,0.9)'); g2.addColorStop(1, 'rgba(255,238,190,0)');
      o.fillStyle = g2; o.fillRect(B.x, 40, B.w, 120);
    }), 0, 0, G.W, G.H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // --- the board: a steel frame around a backlit face
    ctx.fillStyle = '#232e34'; ctx.fillRect(B.x - 3, B.y - 3, B.w + 6, B.h + 6);
    ctx.fillStyle = '#36444c'; ctx.fillRect(B.x - 3, B.y - 3, B.w + 6, 2);
    ctx.fillStyle = '#151d21'; ctx.fillRect(B.x - 3, B.y + B.h + 1, B.w + 6, 2);
    ctx.fillStyle = '#08171a'; ctx.fillRect(B.x, B.y, B.w, B.h);
    // a faint grid etched into the face, and its own backlight
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#0c2126';
    for (let x = B.x + 8; x < B.x + B.w; x += 16) ctx.fillRect(x, B.y, 1, B.h);
    for (let y = B.y + 8; y < B.y + B.h; y += 16) ctx.fillRect(B.x, y, B.w, 1);
    ctx.globalAlpha = 1;
    // bolts at the corners and the mid-spans
    for (const [bx, by] of [[B.x + 4, B.y + 4], [B.x + B.w - 6, B.y + 4], [B.x + 4, B.y + B.h - 6], [B.x + B.w - 6, B.y + B.h - 6],
      [B.x + B.w / 2, B.y + 4], [B.x + B.w / 2, B.y + B.h - 6]]) {
      ctx.fillStyle = '#4a5860'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 4, 4);
      ctx.fillStyle = '#6c7c86'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 4, 1);
      ctx.fillStyle = '#1a2226'; ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
    }
    // the engraved plate at the head of the board
    ctx.fillStyle = '#3a4a44'; ctx.fillRect(B.x + 8, B.y - 12, 112, 11);
    ctx.fillStyle = '#556a62'; ctx.fillRect(B.x + 8, B.y - 12, 112, 1);
    Font.draw(ctx, 'RESEARCH PROGRAMME', B.x + 12, B.y - 9, { color: '#0b1614' });
    // the counter at the other end, a recessed display in a bezel
    const cw = Math.max(84, Font.width(String(d), 2) + 52), xo = this.exitShown() ? 28 : 0;
    ctx.fillStyle = '#2a3238'; ctx.fillRect(B.x + B.w - cw - 8 - xo, B.y - 14, cw, 13);
    ctx.fillStyle = '#0a1c1e'; ctx.fillRect(B.x + B.w - cw - 6 - xo, B.y - 12, cw - 4, 9);
    Font.draw(ctx, 'DATA', B.x + B.w - cw - 2 - xo, B.y - 10, { color: '#4f7f74' });
    Font.draw(ctx, String(d), B.x + B.w - 12 - xo, B.y - 11, { color: d > 0 ? '#ffe060' : '#5f7f78', align: 'right', scale: 2 });
    

    // --- the five programme tubes, racked down the left of the board
    for (const r of this.resCatRects()) {
      const on = r.i === (G.resCat || 0), pr = Research.progress(r.c);
      const col = r.c.col, dark = mixColor(col, '#08161a', 0.7);
      ctx.fillStyle = '#0b1a1d'; ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
      ctx.fillStyle = on ? '#11282c' : '#0a1a1c'; ctx.fillRect(r.x, r.y, r.w, r.h);
      // The level reads in a graduated column down the side of the tube, not as
      // a wash over the whole face of it: a fill behind the writing put half of
      // every word on the wrong ground as it crossed them.
      const gx2 = r.x + r.w - 12, gy = r.y + 4, gh = r.h - 8;
      ctx.fillStyle = '#05100f'; ctx.fillRect(gx2, gy, 8, gh);
      ctx.fillStyle = '#0e1f21'; ctx.fillRect(gx2, gy, 8, 1);
      const fh = Math.round(gh * pr.frac);
      if (fh > 0) {
        ctx.fillStyle = dark; ctx.fillRect(gx2 + 1, gy + gh - fh, 6, fh);
        ctx.fillStyle = col; ctx.fillRect(gx2 + 1, gy + gh - fh, 6, Math.min(fh, 2));
      }
      for (let q = 1; q < 4; q++) { ctx.fillStyle = '#16282a'; ctx.fillRect(gx2, gy + Math.round(gh * q / 4), 3, 1); }
      this.resPic(ctx, r.c.icon, r.x + 14, r.y + 14 + Math.sin(t * 1.2 + r.i) * 1.2, on ? '#e8fff8' : mixColor(col, '#0d1a18', 0.2));
      Font.draw(ctx, pr.got + '/' + pr.total, gx2 - 4, r.y + 10, { color: on ? col : '#3f5f58', align: 'right' });
      Font.draw(ctx, r.c.name, r.x + 5, r.y + 25, { color: on ? '#e8fff8' : '#6f8f88' });
      // one cell per step in the programme, filled as they are funded
      for (let q = 0; q < r.c.nodes.length; q++) {
        ctx.fillStyle = Research.has(r.c.nodes[q].id) ? col : '#1c2a28';
        ctx.fillRect(r.x + 5 + q * 7, r.y + 34, 5, 5);
      }
      ctx.globalAlpha = 0.2; ctx.fillStyle = '#dffdf4'; ctx.fillRect(r.x + 3, r.y + 3, 2, r.h - 6); ctx.globalAlpha = 1;
      ctx.fillStyle = on ? col : mixColor(col, '#0d1a18', 0.55); ctx.fillRect(r.x, r.y, r.w, 2);
      if (on) this.bracket(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, col, 9);
    }

    // --- the chosen programme's cards, slotted into the board
    const rows = this.resNodeRects();
    for (const r of rows) {
      const nd = r.nd, st = this.resState(nd), on = r.i === (G.resNode || 0);
      const lit = st !== 'locked';
      const col = st === 'done' ? cat.col : st === 'ready' ? '#ffe060' : st === 'locked' ? '#42524f' : '#8faaa4';
      const my = r.y + r.h / 2;
      // the slot it sits in, then the card itself
      ctx.fillStyle = '#061417'; ctx.fillRect(r.x - 2, r.y - 1, r.w + 4, r.h + 2);
      ctx.fillStyle = on ? '#12282c' : '#0c1e21'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = on ? '#1b3c3c' : '#122a2c'; ctx.fillRect(r.x, r.y, r.w, 1);
      ctx.fillStyle = st === 'done' ? cat.col : st === 'ready' ? '#ffe060' : '#1e2c2a'; ctx.fillRect(r.x, r.y, 3, r.h);
      // the specimen well, inset, holding the picture of what this is
      const ww = 54, wx = r.x + 8;
      ctx.fillStyle = '#04100f'; ctx.fillRect(wx, r.y + 3, ww, r.h - 6);
      ctx.fillStyle = '#11262a'; ctx.fillRect(wx, r.y + 3, ww, 1);
      this.resGrantArt(ctx, nd, wx, my, ww, lit, st === 'done' ? cat.col : '#a8c8c0');
      if (!lit) {
        ctx.globalAlpha = 0.62; ctx.fillStyle = '#0a1a1c'; ctx.fillRect(wx, r.y + 3, ww, r.h - 6); ctx.globalAlpha = 1;
        ctx.fillStyle = '#5f7f78'; ctx.fillRect(wx + ww / 2 - 5, my - 1, 10, 7); ctx.fillRect(wx + ww / 2 - 3, my - 5, 6, 4);
        ctx.fillStyle = '#0a1a1c'; ctx.fillRect(wx + ww / 2 - 1, my + 1, 2, 3);
      }
      // the label: what it is, and what it gives you
      const tx = wx + ww + 8;
      Font.draw(ctx, nd.name, tx, r.y + Math.round(r.h / 2) - 8, { color: st === 'done' ? cat.col : st === 'locked' ? '#5f7f78' : on ? '#e8fff8' : '#a8c4bc' });
      Font.draw(ctx, st === 'locked' ? 'SEALED UNTIL THE STEP ABOVE' : nd.line, tx, r.y + Math.round(r.h / 2) + 2, { color: st === 'done' ? '#3f6f66' : st === 'locked' ? '#3f5f58' : '#6f9089' });
      // the price, stamped on a little plate at the end of the card
      if (st === 'done') {
        ctx.fillStyle = mixColor(cat.col, '#0a1a1c', 0.55); ctx.fillRect(r.x + r.w - 34, my - 8, 28, 16);
        ctx.fillStyle = cat.col;
        const cxk = r.x + r.w - 28;
        for (let i = 0; i < 3; i++) ctx.fillRect(cxk + i * 2, my + i * 2 - 2, 3, 3);
        for (let i = 0; i < 5; i++) ctx.fillRect(cxk + 4 + i * 2, my - i * 2, 3, 3);
      } else {
        ctx.fillStyle = st === 'ready' ? '#33290c' : '#0a1a1c'; ctx.fillRect(r.x + r.w - 34, my - 8, 28, 16);
        ctx.fillStyle = st === 'ready' ? '#6a5a18' : '#18282a'; ctx.fillRect(r.x + r.w - 34, my - 8, 28, 1);
        Font.draw(ctx, String(nd.cost), r.x + r.w - 8, my - 6, { color: st === 'ready' ? '#ffe060' : st === 'locked' ? '#42524f' : '#5a7068', align: 'right', scale: 2 });
      }
      if (on) this.bracket(ctx, r.x - 3, r.y - 2, r.w + 6, r.h + 4, st === 'ready' ? '#ffe060' : st === 'locked' ? '#4a5a58' : cat.col, 8);
    }

    // --- the floor of the room the board is bolted into, lit from the board so
    // it has to be a place: wall base, skirting, tiles, and the light the board
    // spills down onto them. The gear on it is silhouette only — shapes, not
    // labels, or the eye reads it as another panel to parse.
    this.labFloor(ctx, B.y + B.h + 14);

    // --- the whole programme, on a gauge screwed to the foot of the frame
    const gx = B.x + B.w - 172;
    ctx.fillStyle = '#2a3238'; ctx.fillRect(gx, B.y + B.h + 2, 164, 12);
    ctx.fillStyle = '#3d4b52'; ctx.fillRect(gx, B.y + B.h + 2, 164, 1);
    ctx.fillStyle = '#141d21'; ctx.fillRect(gx, B.y + B.h + 13, 164, 1);
    ctx.fillStyle = '#0a1c1e'; ctx.fillRect(gx + 2, B.y + B.h + 4, 160, 8);
    this.meter(ctx, gx + 5, B.y + B.h + 6, 118, 5, tp.frac, '#3fd0a8', '#0d1e1c');
    Font.draw(ctx, tp.got + '/' + tp.tot, gx + 159, B.y + B.h + 5, { color: '#4f7f74', align: 'right' });

    this.drawExit(ctx);
  },
  // The room behind every front-end screen never changes, and it was being
  // laid down from scratch every frame: some three hundred rects and three
  // gradients before anything you came to look at was drawn. It is baked once
  // per shape, at the resolution we are rendering into, and blitted.
  bake(key, fn) {
    if (!this._bake || this._bakeRs !== G.rs) { this._bake = {}; this._bakeRs = G.rs; }
    let c = this._bake[key];
    if (!c) {
      const rs = Math.max(1, G.rs || 1);
      c = mkCanvas(G.W * rs, G.H * rs);
      const o = ctxOf(c);
      o.setTransform(rs, 0, 0, rs, 0, 0);
      fn(o);
      this._bake[key] = c;
    }
    return c;
  },
  labWall(ctx, lights) { ctx.drawImage(this.bake('wall' + (lights === false ? 0 : 1), o => this.paintWall(o, lights)), 0, 0, G.W, G.H); },
  labFloor(ctx, fy) { ctx.drawImage(this.bake('floor' + fy, o => this.paintFloor(o, fy)), 0, 0, G.W, G.H); },
  // ---------- the room every front-end screen stands in ----------
  // The lab behind these screens used to be the real title room with a thin
  // scrim over it, which meant the whole place — walking staff, the tank, the
  // signage — ghosted through everything drawn on top. It is an opaque wall
  // now, painted here once and shared by all of them.
  paintWall(ctx, lights) {
    const W = G.W, H = G.H;
    ctx.fillStyle = '#08161a'; ctx.fillRect(0, 0, W, H);
    // courses of wall block, with the mortar between them
    for (let y = 0, r = 0; y < H; y += 22, r++) {
      ctx.fillStyle = r % 2 ? '#0a1a1e' : '#091719'; ctx.fillRect(0, y, W, 21);
      ctx.fillStyle = '#050f11'; ctx.fillRect(0, y + 21, W, 1);
      for (let x = r % 2 ? 0 : 23; x < W; x += 46) ctx.fillRect(x, y, 1, 21);
    }
    if (lights !== false) {
      // strip lights along the ceiling, and the cone each one drops
      for (let i = 0; i < 4; i++) {
        const lx = 42 + i * 156;
        ctx.fillStyle = '#141c20'; ctx.fillRect(lx, 0, 92, 7);
        ctx.fillStyle = '#2c383e'; ctx.fillRect(lx, 0, 92, 1);
        ctx.fillStyle = '#0a1216'; ctx.fillRect(lx, 7, 92, 1);
        ctx.fillStyle = '#a9ccc2'; ctx.fillRect(lx + 5, 5, 82, 2);
        const cg = ctx.createLinearGradient(0, 7, 0, 74);
        cg.addColorStop(0, 'rgba(169,204,194,0.13)'); cg.addColorStop(1, 'rgba(169,204,194,0)');
        ctx.fillStyle = cg; ctx.fillRect(lx - 10, 7, 112, 67);
      }
    }
    // and what they lay down the wall
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.7);
    g.addColorStop(0, 'rgba(186,238,228,0.11)'); g.addColorStop(1, 'rgba(186,238,228,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.7);
    // the darkness at the corners, and the scanline it is all filmed through
    const vg = ctx.createLinearGradient(0, 0, W, 0);
    vg.addColorStop(0, 'rgba(2,8,10,0.5)'); vg.addColorStop(0.2, 'rgba(2,8,10,0)');
    vg.addColorStop(0.8, 'rgba(2,8,10,0)'); vg.addColorStop(1, 'rgba(2,8,10,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#0a2a26';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;
  },
  // the strip of floor below it
  paintFloor(ctx, fy) {
    const W = G.W, H = G.H;
    ctx.fillStyle = '#0a1417'; ctx.fillRect(0, fy - 10, W, H - fy + 10);
    ctx.fillStyle = '#101d20'; ctx.fillRect(0, fy - 10, W, 8);
    ctx.fillStyle = '#1b2c30'; ctx.fillRect(0, fy - 2, W, 2);
    ctx.fillStyle = '#0c1619'; ctx.fillRect(0, fy, W, H - fy);
    // tiles, running off toward the far wall
    ctx.fillStyle = '#101e21';
    for (let x = 8; x < W; x += 26) ctx.fillRect(x, fy, 1, H - fy);
    ctx.fillRect(0, fy + 16, W, 1); ctx.fillRect(0, fy + 34, W, 1);
    // the pool of light the board throws down
    const fg = ctx.createLinearGradient(0, fy - 12, 0, H);
    fg.addColorStop(0, 'rgba(150,255,228,0.13)'); fg.addColorStop(1, 'rgba(150,255,228,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, fy - 12, W, H - fy + 12);
    // gear along the back of the room, in silhouette
    const sil = '#060f11', rim = '#1e3438';
    const box = (x, y, w, h) => { ctx.fillStyle = sil; ctx.fillRect(x, y, w, h); ctx.fillStyle = rim; ctx.fillRect(x, y, w, 1); };
    // two gas cylinders, chained to the wall
    for (let i = 0; i < 2; i++) {
      const gx = 236 + i * 15;
      box(gx, fy - 26, 11, 26); ctx.fillStyle = sil; ctx.fillRect(gx + 4, fy - 31, 3, 5);
      ctx.fillStyle = rim; ctx.fillRect(gx, fy - 18, 11, 1);
    }
    // a rolling trolley with a tray on it
    box(296, fy - 20, 52, 3); box(296, fy - 9, 52, 2);
    ctx.fillStyle = sil; ctx.fillRect(299, fy - 17, 3, 18); ctx.fillRect(342, fy - 17, 3, 18);
    ctx.fillRect(303, fy - 24, 16, 4); ctx.fillRect(324, fy - 23, 10, 3);
    ctx.fillRect(301, fy - 1, 4, 3); ctx.fillRect(339, fy - 1, 4, 3);
    // a stool, and a bucket beside it
    box(378, fy - 16, 20, 3);
    ctx.fillStyle = sil; ctx.fillRect(381, fy - 13, 3, 13); ctx.fillRect(392, fy - 13, 3, 13);
    box(410, fy - 11, 14, 11);
    // a floor drain, because every wet lab has one
    ctx.fillStyle = '#0e1b1e'; ctx.fillRect(474, fy + 20, 26, 14);
    ctx.fillStyle = '#060f11'; ctx.fillRect(476, fy + 22, 22, 10);
    ctx.fillStyle = '#0d1a1d'; for (let i = 0; i < 4; i++) ctx.fillRect(477 + i * 6, fy + 22, 4, 10);
    // and the room's own darkness closing in at the edges
    const vg = ctx.createLinearGradient(0, 0, W, 0);
    vg.addColorStop(0, 'rgba(2,8,10,0.55)'); vg.addColorStop(0.22, 'rgba(2,8,10,0)');
    vg.addColorStop(0.78, 'rgba(2,8,10,0)'); vg.addColorStop(1, 'rgba(2,8,10,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, fy - 10, W, H - fy + 10);
  },
  // The cut between the room and a station. The picture is squeezed to a lit
  // line and let back out, the way a tube set changes channel. This was a
  // corrugated roller shutter, which was a great deal of steel to look at
  // every time you crossed the room.
  drawWipe(ctx) {
    const W = G.W, H = G.H;
    const wp = G.labWipe;
    let k = 0;
    if (wp) { k = clamp(wp.t / (wp.dur * 0.5), 0, 1); if (wp.t > wp.dur * 0.5) k = 1; }
    else if (G.wipeIn > 0) { G.wipeIn -= 1 / 60; k = clamp(G.wipeIn / 0.28, 0, 1); }
    else return;
    const e = easeOut(k), mid = H / 2, h = Math.round(mid * e);
    if (h <= 0) return;
    ctx.fillStyle = '#04090b';
    ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
    // the closing edges, lit, with the glow they throw into what is left
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 * e;
    ctx.fillStyle = '#5ac8b4'; ctx.fillRect(0, h, W, 5); ctx.fillRect(0, H - h - 5, W, 5);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(170,255,234,0.9)'; ctx.fillRect(0, h - 1, W, 1); ctx.fillRect(0, H - h, W, 1);
    // sync ticks running along the edges, so the cut reads as a machine doing it
    ctx.fillStyle = 'rgba(122,255,218,0.55)';
    for (let x = (Math.round(G.menuT * 90) % 24) - 24; x < W; x += 24) {
      ctx.fillRect(x, h - 3, 6, 1); ctx.fillRect(W - x - 6, H - h + 2, 6, 1);
    }
  },
  // ---------- the laboratory ----------
  // Two benches. The rack of vials is a rack of vials; the DNA wall is a wall
  // of culture jars. Almost nothing here is a sentence.
  // ---------- the lab ----------
  // One station, three benches. What you take out (BUILD), what the project is
  // funding (RESEARCH), and what you have carried back (RELICS). Research used
  // to be its own door across the room; there is no reason for two.
  benchTabs() {
    const ids = [['build', 'BUILD'], ['research', 'RESEARCH'], ['relics', 'RELICS']];
    const w = 116, gap = 4;
    return ids.map(([id, name], i) => ({ id, name, i, x: 10 + i * (w + gap), y: 8, w, h: 22 }));
  },
  vialRects() {
    const out = [], w = 62, h = 88, gap = 8;
    const total = VIALS.length * w + (VIALS.length - 1) * gap, x0 = Math.round((G.W - total) / 2);
    VIALS.forEach((v, i) => out.push({ v, i, x: x0 + i * (w + gap), y: 44, w, h }));
    return out;
  },
  // the prime mutation you go out carrying, and the relics you carry already
  buildPrimes() {
    const open = PRIMES.filter(p2 => p2.id === 'none' || Research.lineageOpen(p2.id));
    const w = 96, gap = 4, x0 = 18;
    return open.map((p2, i) => ({ p: p2, i, x: x0 + (i % 6) * (w + gap), y: 220 + Math.floor(i / 6) * 24, w, h: 22 }));
  },
  relicCells() {
    const cols = 6, w = 96, h = 50, gx = 6, gy = 6;
    const x0 = Math.round((G.W - (cols * w + (cols - 1) * gx)) / 2);
    return ARTIFACTS.map((a, i) => ({ a, i, x: x0 + (i % cols) * (w + gx), y: 52 + Math.floor(i / cols) * (h + gy), w, h }));
  },
  drawLabBench(ctx) {
    const W = G.W, H = G.H, t = G.menuT;
    this.labWall(ctx);
    const tab = G.benchTab || 'build';
    if (tab !== 'research') this.labFloor(ctx, 306);
    for (const b of this.benchTabs()) {
      const on = b.id === tab;
      ctx.fillStyle = on ? 'rgba(14,34,32,0.96)' : 'rgba(6,16,16,0.85)'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = on ? '#7affda' : '#22403c'; ctx.fillRect(b.x, b.y, b.w, 2);
      const cx = b.x + 16, cy = b.y + 11, c = on ? '#b8ffe8' : '#4f7f74';
      if (b.id === 'build') { ctx.fillStyle = c; ctx.fillRect(cx - 3, cy - 7, 7, 3); ctx.fillRect(cx - 2, cy - 4, 5, 10); }
      else if (b.id === 'research') { ctx.fillStyle = c; ctx.fillRect(cx - 1, cy - 7, 3, 3); ctx.fillRect(cx - 5, cy - 4, 11, 10); ctx.fillStyle = on ? '#0d1a18' : '#0a1614'; ctx.fillRect(cx - 3, cy - 1, 7, 6); }
      else { ctx.fillStyle = c; ctx.fillRect(cx - 1, cy - 7, 3, 13); ctx.fillRect(cx - 5, cy - 3, 11, 3); ctx.fillRect(cx - 4, cy + 4, 9, 2); }
      Font.draw(ctx, b.name, b.x + 30, b.y + 8, { color: on ? '#e8fff8' : '#4f7f74' });
    }
    if (tab === 'research') this.drawResearch(ctx);
    else if (tab === 'relics') this.drawRelics(ctx, t);
    else this.drawVialRack(ctx, t);
    this.drawExit(ctx);
  },
  // ---- RELICS: everything the project has out of the field, and what it gives
  drawRelics(ctx, t) {
    const W = G.W, H = G.H;
    const got = Missions.owned().length;
    Font.draw(ctx, 'THE VAULT', 12, 36, { color: '#4f7f74' });
    Font.draw(ctx, got + ' / ' + ARTIFACTS.length, W - 12, 36, { color: got ? '#ffd060' : '#4f7f74', align: 'right' });
    ctx.fillStyle = 'rgba(120,220,200,0.2)'; ctx.fillRect(12, 46, W - 24, 1);
    const sel = clamp(G.benchSel || 0, 0, ARTIFACTS.length - 1);
    for (const c of this.relicCells()) {
      const have = Missions.has(c.a.id), on = c.i === sel;
      ctx.fillStyle = have ? 'rgba(28,24,8,0.92)' : 'rgba(6,16,16,0.85)'; ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = have ? c.a.col : '#22322e'; ctx.fillRect(c.x, c.y, c.w, 2);
      ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip();
      if (have) drawRelicGlyph(ctx, c.a, c.x + 20, c.y + 24, t * 0.6, 1.0);
      else { ctx.fillStyle = '#22322e'; ctx.fillRect(c.x + 16, c.y + 22, 9, 11); ctx.fillRect(c.x + 18, c.y + 16, 5, 6); }
      Font.drawWrapped(ctx, have ? c.a.name : 'UNCLAIMED', c.x + 36, c.y + 8, c.w - 40, { color: have ? '#e8fff8' : '#4a5f5a', lineHeight: 9 });
      const st2 = STAGE_BY_ID[c.a.stage];
      Font.draw(ctx, st2 ? st2.name : '', c.x + 5, c.y + c.h - 11, { color: have ? '#7f9a90' : '#3a4f4a' });
      ctx.restore();
      if (on) this.bracket(ctx, c.x - 2, c.y - 2, c.w + 4, c.h + 4, have ? c.a.col : '#3a4a48', 7);
    }
    // the one you are looking at, spelled out along the foot
    const a = ARTIFACTS[sel], have = Missions.has(a.id);
    ctx.fillStyle = '#050f12'; ctx.fillRect(10, H - 46, W - 20, 34);
    ctx.fillStyle = have ? a.col : '#22322e'; ctx.fillRect(10, H - 46, 3, 34);
    Font.draw(ctx, have ? a.name : 'NOT RECOVERED', 20, H - 42, { color: have ? a.col : '#5f7f78' });
    Font.drawWrapped(ctx, have ? a.boon : a.line, 20, H - 30, W - 40, { color: have ? '#c8d8d0' : '#5f7f78', lineHeight: 9 });
  },
  drawVialRack(ctx, t) {
    const W = G.W, H = G.H, sel = clamp(G.benchSel || 0, 0, VIALS.length - 1), loaded = LabBench.loaded();
    // the shelf the rack stands on
    const rects = this.vialRects();
    const x0 = rects[0].x - 10, x1 = rects[rects.length - 1].x + rects[0].w + 10, shy = rects[0].y + rects[0].h;
    ctx.fillStyle = '#2a3438'; ctx.fillRect(x0, shy, x1 - x0, 6);
    ctx.fillStyle = '#3d4a4e'; ctx.fillRect(x0, shy, x1 - x0, 2);
    ctx.fillStyle = '#1a2226'; ctx.fillRect(x0 + 6, shy + 6, 6, 14); ctx.fillRect(x1 - 12, shy + 6, 6, 14);
    for (const r of rects) {
      const v = r.v, have = LabBench.have(v), on = r.i === sel, lit = loaded === v.id;
      const gx = r.x + r.w / 2, top = r.y + 14, bh = r.h - 20;
      // cradle
      ctx.fillStyle = '#222c30'; ctx.fillRect(r.x + 8, r.y + r.h - 12, r.w - 16, 8);
      // glass tube: neck, body, meniscus
      ctx.fillStyle = '#8fb0b8'; ctx.fillRect(gx - 7, top - 8, 14, 5);
      ctx.fillStyle = '#0d1618'; ctx.fillRect(gx - 10, top, 20, bh);
      if (have) {
        // the fluid, with a slow slosh on the surface and light through it
        const lvl = 0.62 + Math.sin(t * 0.9 + r.i) * 0.02;
        const fh = Math.round(bh * lvl), fy = top + bh - fh;
        ctx.fillStyle = shade(v.col, 0.55); ctx.fillRect(gx - 9, fy, 18, fh);
        ctx.fillStyle = v.col; ctx.fillRect(gx - 9, fy, 18, Math.max(2, Math.round(fh * 0.55)));
        ctx.fillStyle = mixColor(v.col, '#ffffff', 0.55); ctx.fillRect(gx - 9, fy, 18, 2);
        // bubbles climbing the inside of the glass
        for (let b = 0; b < 5; b++) {
          const by = fy + fh - ((t * (10 + ihash(b, r.i) * 16) + ihash(b, 7) * fh) % fh);
          ctx.fillStyle = mixColor(v.col, '#ffffff', 0.7);
          ctx.fillRect(Math.round(gx - 5 + ihash(b, 3) * 10), Math.round(by), 1, 2);
        }
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = lit ? 0.2 : 0.07;
        ctx.fillStyle = v.col; ctx.fillRect(gx - 12, top - 4, 24, bh + 8);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      } else {
        // an empty tube, with a dusty residue at the bottom
        ctx.fillStyle = '#1a2426'; ctx.fillRect(gx - 9, top + bh - 6, 18, 6);
      }
      // glass highlight and rim
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#dffdf4'; ctx.fillRect(gx - 7, top + 4, 2, bh - 12); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(150,230,220,0.28)'; ctx.fillRect(gx - 10, top, 1, bh); ctx.fillRect(gx + 9, top, 1, bh);
      // the label on the tube: two arrows, up for what it gives, down for what it costs
      if (have) {
        ctx.fillStyle = 'rgba(230,230,214,0.9)'; ctx.fillRect(gx - 9, top + bh * 0.42, 18, 14);
        ctx.fillStyle = '#2a8a4a'; ctx.fillRect(gx - 6, top + bh * 0.42 + 3, 2, 5); ctx.fillRect(gx - 8, top + bh * 0.42 + 4, 6, 1); ctx.fillRect(gx - 7, top + bh * 0.42 + 3, 4, 1);
        ctx.fillStyle = '#a03020'; ctx.fillRect(gx + 3, top + bh * 0.42 + 5, 2, 5); ctx.fillRect(gx + 1, top + bh * 0.42 + 8, 6, 1); ctx.fillRect(gx + 2, top + bh * 0.42 + 9, 4, 1);
      }
      if (lit) { ctx.fillStyle = '#ffe060'; ctx.fillRect(r.x, r.y + 2, r.w, 2); for (let q = 0; q < 3; q++) ctx.fillRect(gx - 4 + q * 4, r.y + 6, 2, 2); }
      if (on) this.bracket(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, have ? '#7affda' : '#3a4a48', 8);
    }
    // the one reading: what the selected tube gives and what it takes
    const v = VIALS[sel], have = LabBench.have(v);
    const cw = 260, cx2 = Math.round(W / 2 - cw / 2), cy2 = 146;
    ctx.fillStyle = '#050f12'; ctx.fillRect(cx2, cy2, cw, 32);
    ctx.fillStyle = have ? shade(v.col, 0.5) : '#1a2628'; ctx.fillRect(cx2, cy2, cw, 2);
    if (have) {
      Font.draw(ctx, v.name, W / 2, cy2 + 5, { color: v.col, align: 'center', scale: 2, outline: '#04120e' });
      Font.draw(ctx, v.up, W / 2 - 24, cy2 + 22, { color: '#4fd07a', align: 'right' });
      ctx.fillStyle = '#4fd07a'; ctx.fillRect(W / 2 - 18, cy2 + 24, 2, 6); ctx.fillRect(W / 2 - 20, cy2 + 25, 6, 1); ctx.fillRect(W / 2 - 19, cy2 + 24, 4, 1);
      ctx.fillStyle = '#d05a40'; ctx.fillRect(W / 2 + 16, cy2 + 24, 2, 6); ctx.fillRect(W / 2 + 14, cy2 + 29, 6, 1); ctx.fillRect(W / 2 + 15, cy2 + 30, 4, 1);
      Font.draw(ctx, v.down, W / 2 + 24, cy2 + 22, { color: '#d05a40' });
    } else {
      Font.draw(ctx, 'NOT ISOLATED', W / 2, cy2 + 13, { color: '#5f7f78', align: 'center' });
    }

    // --- the prime mutation. This used to be asked in a splice bay between the
    // map and the water, one screen too many; it is part of the build now.
    Font.draw(ctx, 'PRIME MUTATION', 18, 198, { color: '#4f7f74' });
    ctx.fillStyle = 'rgba(120,220,200,0.2)'; ctx.fillRect(18, 208, W - 36, 1);
    const cells = this.buildPrimes(), psel = G.loadout.prime || 'none';
    for (const c of cells) {
      const worn = c.p.id === psel, col = c.p.color || (LINEAGES[c.p.id] && LINEAGES[c.p.id].color) || '#9ad8c0';
      ctx.fillStyle = worn ? rgba(col, 0.22) : 'rgba(6,16,16,0.85)'; ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = worn ? col : mixColor(col, '#0a1614', 0.66); ctx.fillRect(c.x, c.y, c.w, 2);
      ctx.fillStyle = col; ctx.fillRect(c.x + 6, c.y + 8, 7, 7);
      Font.draw(ctx, c.p.name.replace(' PRIME', ''), c.x + 18, c.y + 8, { color: worn ? '#e8fff8' : '#8faaa4' });
      if (worn) this.bracket(ctx, c.x - 2, c.y - 2, c.w + 4, c.h + 4, col, 6);
    }
    const pc = PRIMES.find(q => q.id === psel) || PRIMES[0];
    Font.drawWrapped(ctx, pc.desc, 18, 272, W - 36, { color: '#7f9a90', lineHeight: 9 });
  },
  // ---------- the creation bay ----------
  // A projector on a plate, throwing a live crocodile into the air above it,
  // running its own attack loop. The stock you pick is the animal you get, and
  // the first one the project ever grows for you is free.
  createArrows() {
    const S = UI.habStage();
    return [{ id: -1, x: S.x + 4, y: S.y + 68, w: 22, h: 44 }, { id: 1, x: S.x + S.w - 26, y: S.y + 68, w: 22, h: 44 }];
  },
  createGoRect() { return { x: 456, y: 198, w: 174, h: 32 }; },
  createTicks() {
    const S = this.habStage(), n = BASE_SPECIES.length, w = 34, gap = 4;
    const x0 = Math.round(S.x + (S.w - (n * w + (n - 1) * gap)) / 2);
    return BASE_SPECIES.map((sp, i) => ({ sp, i, x: x0 + i * (w + gap), y: S.y + S.h + 4, w, h: 12 }));
  },
  cvView() { if (!this._cvV) { this._cvV = CrocView.make(); this._cvV.t = 1.4; } return this._cvV; },
  cvParts(look) {
    const key = JSON.stringify(look);
    if (this._cvKey !== key) { this._cvKey = key; this._cvParts = buildCrocParts(look); }
    return this._cvParts;
  },
  createSlot() { const L = Habitat.list(); const k = L.findIndex(c => !c); return k < 0 ? -1 : k; },
  createCost() { const sp = BASE_SPECIES[clamp(G.createSel || 0, 0, BASE_SPECIES.length - 1)]; return Habitat.hatchCost(sp.id); },
  // ---------- the habitat ----------
  // Six enclosures along the back wall. Every one of them is a window onto a
  // real animal, at its real size, wearing its real hide — you choose by
  // looking at crocodiles, not by reading a list of them.
  habView(i) {
    if (!this._habV) this._habV = [];
    if (!this._habV[i]) { this._habV[i] = CrocView.make(); this._habV[i].t = i * 1.7; }
    return this._habV[i];
  },
  habParts(look) {
    const key = JSON.stringify(look);
    if (!this._habP) this._habP = {};
    if (!this._habP[key]) { if (Object.keys(this._habP).length > 24) this._habP = {}; this._habP[key] = buildCrocParts(look); }
    return this._habP[key];
  },
  // the three upgrade meters and the hide swatches
  // ---------- the habitat: the creation menu ----------
  // Clicking HABITAT opens the bench where animals are made and raised, not a
  // wall of glass you then have to click through. Six slots along the top, the
  // one you picked thrown up as a hologram in the middle, its papers on the
  // left and everything you can do to it down the right.
  habRoster() {
    const n = HAB_SLOTS, w = 96, gap = 6;
    const x0 = Math.round((G.W - (n * w + (n - 1) * gap)) / 2);
    const out = [];
    for (let i = 0; i < n; i++) out.push({ i, x: x0 + i * (w + gap), y: 26, w, h: 44 });
    return out;
  },
  habStage() { return { x: 152, y: 80, w: 296, h: 168 }; },
  habDossier() { return { x: 10, y: 80, w: 136, h: 168 }; },
  habRows() {
    const out = [], rx = 456, rw = 174;
    HAB_UPGRADES.forEach((u, i) => out.push({ kind: 'up', id: u.id, u, i, x: rx, y: 88 + i * 24, w: rw, h: 21 }));
    out.push({ kind: 'go', i: 0, x: rx, y: 198, w: rw, h: 32 });
    // the build, as a strip of swatches along the foot
    SIZE_GRADES.forEach((gr, i) => out.push({ kind: 'len', gr, i, x: 14 + i * 30, y: 264, w: 27, h: 22 }));
    GIRTH_GRADES.forEach((gi, i) => out.push({ kind: 'girth', gi, i, x: 142 + i * 30, y: 264, w: 27, h: 22 }));
    HIDE_PAINTS.forEach((pt, i) => out.push({ kind: 'hide', pt, i, x: 272 + i * 30, y: 264, w: 27, h: 22 }));
    return out;
  },
  habRowIndex(r) {
    const rows = this.habRows();
    for (let i = 0; i < rows.length; i++) { const o = rows[i]; if (o.kind === r.kind && o.i === r.i && o.id === r.id) return i; }
    return 0;
  },
  drawHabitat(ctx) {
    const W = G.W, H = G.H, t = G.menuT;
    Habitat.ensure();
    const L = Habitat.list(), sel = clamp(G.habSel || 0, 0, HAB_SLOTS - 1), cur = L[sel];
    this.labWall(ctx, false);
    this.labFloor(ctx, 306);
    // the emitter housing over the stage
    const S = this.habStage();
    ctx.fillStyle = '#1a2226'; ctx.fillRect(S.x + 40, 16, S.w - 80, 7);
    ctx.fillStyle = '#7affda'; ctx.fillRect(S.x + 46, 22, S.w - 92, 1);

    // --- the roster: six slots, the animal in each drawn as itself
    for (const k of this.habRoster()) {
      const c = L[k.i], on = k.i === sel, runner = k.i === Habitat.runnerIndex() && c;
      ctx.fillStyle = '#0a1618'; ctx.fillRect(k.x - 2, k.y - 2, k.w + 4, k.h + 4);
      const g = ctx.createLinearGradient(0, k.y, 0, k.y + k.h);
      g.addColorStop(0, c ? '#2f6f66' : '#16302e'); g.addColorStop(1, c ? '#0c2b2c' : '#0a1a1c');
      ctx.fillStyle = g; ctx.fillRect(k.x, k.y, k.w, k.h);
      if (c) {
        const v = this.habView(k.i);
        CrocView.update(v, 0, 6.5 + (k.i % 3));
        ctx.save(); ctx.beginPath(); ctx.rect(k.x, k.y, k.w, k.h); ctx.clip();
        CrocView.draw(ctx, v, this.habParts(Habitat.look(c)), k.x + k.w / 2 - 2, k.y + k.h * 0.46, 0.5);
        ctx.restore();
        ctx.fillStyle = 'rgba(4,12,14,0.9)'; ctx.fillRect(k.x, k.y + k.h - 11, k.w, 11);
        Font.draw(ctx, Habitat.tag(c), k.x + 3, k.y + k.h - 9, { color: on ? '#e8fff8' : '#8fbfb6' });
        Font.draw(ctx, 'L' + c.lv, k.x + k.w - 3, k.y + k.h - 9, { color: '#7affda', align: 'right' });
      } else {
        ctx.fillStyle = '#2e4444';
        ctx.fillRect(k.x + k.w / 2 - 9, k.y + k.h / 2 - 3, 18, 5); ctx.fillRect(k.x + k.w / 2 - 3, k.y + k.h / 2 - 9, 5, 18);
      }
      ctx.fillStyle = 'rgba(150,230,220,0.25)'; ctx.fillRect(k.x, k.y, 2, k.h);
      if (runner) { ctx.fillStyle = '#ffe060'; ctx.fillRect(k.x, k.y - 2, k.w, 2); }
      if (on) this.bracket(ctx, k.x - 3, k.y - 3, k.w + 6, k.h + 6, '#7affda', 9);
    }

    if (!cur) { this.drawHabNew(ctx, sel, t); this.drawExit(ctx); return; }

    // --- the animal itself, thrown up over the stage
    const sp = Habitat.spec(cur), tr = sp.trait, col = sp.holo || '#7affda';
    ctx.fillStyle = 'rgba(4,14,16,0.9)'; ctx.fillRect(S.x, S.y, S.w, S.h);
    this.bracket(ctx, S.x, S.y, S.w, S.h, rgba(col, 0.5), 12);
    ctx.globalAlpha = 0.12; ctx.fillStyle = col;
    for (let i = 0; i < 8; i++) ctx.fillRect(S.x + 8, S.y + 12 + i * 18, S.w - 16, 1);
    for (let i = 0; i < 11; i++) ctx.fillRect(Math.round(S.x + 8 + i * ((S.w - 16) / 10)), S.y + 12, 1, 138);
    ctx.globalAlpha = 1;
    const cy = S.y + S.h * 0.48;
    CrocView.projector(ctx, S.x + S.w / 2, cy, 148, col, t, 1);
    const v2 = this.cvView();
    CrocView.update(v2, 1 / 60, 2.9);
    CrocView.holo(ctx, v2, this.habParts(Habitat.look(cur)), S.x + S.w / 2 + 34, cy, 1.35, col, 1, t);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.10; ctx.fillStyle = col;
    ctx.fillRect(S.x, S.y + ((t * 44) % S.h), S.w, 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // --- the papers on the left
    const D = this.habDossier();
    ctx.fillStyle = 'rgba(5,16,18,0.92)'; ctx.fillRect(D.x, D.y, D.w, D.h);
    this.bracket(ctx, D.x, D.y, D.w, D.h, 'rgba(120,220,200,0.4)', 9);
    Font.draw(ctx, Habitat.tag(cur), D.x + 6, D.y + 6, { color: '#e8fff8', scale: 2, outline: '#04120e' });
    Font.drawWrapped(ctx, sp.name, D.x + 6, D.y + 24, D.w - 12, { color: '#8fbfb6', lineHeight: 9 });
    if (tr) {
      ctx.fillStyle = rgba(tr.col, 0.18); ctx.fillRect(D.x + 4, D.y + 46, D.w - 8, 12);
      ctx.fillStyle = tr.col; ctx.fillRect(D.x + 4, D.y + 46, 2, 12);
      Font.draw(ctx, tr.name, D.x + 10, D.y + 49, { color: tr.col });
      Font.drawWrapped(ctx, tr.line, D.x + 6, D.y + 62, D.w - 12, { color: '#7f9a90', lineHeight: 9 });
    }
    // level, and how far into the next one
    Font.draw(ctx, 'LEVEL', D.x + 6, D.y + 104, { color: '#4f7f74' });
    Font.draw(ctx, String(cur.lv), D.x + D.w - 6, D.y + 100, { color: '#7affda', align: 'right', scale: 2 });
    const need = habXpFor(cur.lv);
    this.meter(ctx, D.x + 6, D.y + 118, D.w - 12, 5, cur.lv >= Habitat.MAX_LV ? 1 : cur.xp / need, '#8ab820', '#16220f');
    for (let p2 = 0; p2 < Habitat.MAX_LV; p2++) {
      ctx.fillStyle = p2 < cur.lv ? (tr ? tr.col : '#7affda') : '#1e2e2c';
      ctx.fillRect(D.x + 6 + p2 * 10, D.y + 128, 8, 4);
    }
    const pts = Habitat.points(cur);
    if (pts > 0) {
      Font.draw(ctx, 'POINTS', D.x + 6, D.y + 140, { color: '#4f7f74' });
      ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ffe060' : '#8a7a20';
      for (let q = 0; q < Math.min(pts, 9); q++) ctx.fillRect(D.x + 52 + q * 8, D.y + 139, 6, 8);
    }
    Font.draw(ctx, 'RUNS ' + (cur.out || 0), D.x + 6, D.y + 154, { color: '#4f7f74' });

    // --- everything you can do, down the right
    for (const r of this.habRows()) {
      const on = this.habRowIndex(r) === (G.habRow || 0);
      if (r.kind === 'up') {
        const have = cur.up[r.id];
        ctx.fillStyle = on ? 'rgba(16,38,36,0.96)' : 'rgba(5,14,15,0.9)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = r.u.col; ctx.fillRect(r.x, r.y, 3, r.h);
        Font.draw(ctx, r.u.name, r.x + 8, r.y + 6, { color: on ? '#e8fff8' : '#8faaa4' });
        for (let q = 0; q < Habitat.MAX_LV - 1; q++) {
          ctx.fillStyle = q < have ? r.u.col : '#1c2a28';
          ctx.fillRect(r.x + 48 + q * 10, r.y + 5, 8, 9);
        }
        if (pts > 0) { ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ffe060' : '#7a6a20'; ctx.fillRect(r.x + r.w - 12, r.y + 7, 7, 3); ctx.fillRect(r.x + r.w - 10, r.y + 5, 3, 7); }
        if (on) this.bracket(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, pts > 0 ? '#ffe060' : r.u.col, 6);
      } else if (r.kind === 'go') {
        const isR = sel === Habitat.runnerIndex();
        ctx.fillStyle = on ? 'rgba(48,22,8,0.96)' : 'rgba(16,10,6,0.9)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = isR ? '#ffe060' : '#8a4a20'; ctx.fillRect(r.x, r.y, r.w, 2);
        Font.draw(ctx, isR ? 'RELEASE' : 'SELECT', r.x + r.w / 2, r.y + 11, { color: isR ? '#ffd0a0' : '#c0a080', align: 'center', scale: 2, outline: '#2a0c00' });
        if (on) this.bracket(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, '#ff8050', 6);
      } else if (r.kind === 'len' || r.kind === 'girth') {
        const isLen = r.kind === 'len';
        const open = isLen ? Create.sizeUnlocked(r.i) : Create.girthUnlocked(r.i);
        const worn = (isLen ? cur.size : cur.girth) === r.i;
        ctx.fillStyle = worn ? 'rgba(30,80,70,0.95)' : 'rgba(8,18,18,0.9)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        const col2 = open ? (isLen ? '#7affda' : '#e0b050') : '#22302e';
        if (isLen) { const hh = 3 + r.i * 3; ctx.fillStyle = col2; ctx.fillRect(r.x + 4, r.y + r.h / 2 - 1, 4 + r.i * 5, 3); ctx.fillRect(r.x + 4, r.y + r.h / 2 - hh / 2, 2, hh); }
        else { const hh = 4 + r.i * 3; ctx.fillStyle = col2; ctx.fillRect(r.x + 7, r.y + r.h / 2 - hh / 2, 13, hh); }
        if (!open) { ctx.fillStyle = '#4a5a58'; ctx.fillRect(r.x + r.w - 8, r.y + 4, 5, 4); ctx.fillRect(r.x + r.w - 7, r.y + 2, 3, 3); }
        if (worn) this.bracket(ctx, r.x, r.y, r.w, r.h, '#ffffff', 5);
        if (on) this.bracket(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, '#7affda', 6);
      } else {
        const open = Create.paintUnlocked(r.pt), worn = cur.hide === r.pt.id;
        ctx.fillStyle = worn ? 'rgba(30,80,70,0.95)' : 'rgba(8,18,18,0.9)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = open ? (r.pt.swatch || '#5f7048') : '#22302e';
        ctx.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
        if (open) { ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(r.x + 4, r.y + 4, r.w - 8, 3); }
        else { ctx.fillStyle = '#4a5a58'; ctx.fillRect(r.x + r.w / 2 - 3, r.y + r.h / 2 - 1, 6, 5); ctx.fillRect(r.x + r.w / 2 - 2, r.y + r.h / 2 - 4, 4, 3); }
        if (worn) this.bracket(ctx, r.x, r.y, r.w, r.h, '#ffffff', 5);
        if (on) this.bracket(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, '#7affda', 6);
      }
    }
    Font.draw(ctx, 'LENGTH', 14, 254, { color: '#4f7f74' });
    Font.draw(ctx, 'GIRTH', 142, 254, { color: '#4f7f74' });
    Font.draw(ctx, 'HIDE', 272, 254, { color: '#4f7f74' });
    const d = Research.data();
    Font.draw(ctx, String(d) + ' DATA', W - 12, H - 14, { color: d > 0 ? '#ffe060' : '#5f7f78', align: 'right', outline: '#3a2a00' });
    this.drawExit(ctx);
  },
  // an empty slot: the stock library, on the same stage the animals stand on
  drawHabNew(ctx, slot, t) {
    const W = G.W, H = G.H;
    const sp = BASE_SPECIES[clamp(G.createSel || 0, 0, BASE_SPECIES.length - 1)];
    const open = Create.speciesUnlocked(sp), col = open ? (sp.holo || '#7affda') : '#4f7f74';
    const S = this.habStage(), cy = S.y + S.h * 0.48;
    const v = this.cvView();
    CrocView.update(v, 1 / 60, 2.9);
    ctx.fillStyle = 'rgba(4,14,16,0.9)'; ctx.fillRect(S.x, S.y, S.w, S.h);
    this.bracket(ctx, S.x, S.y, S.w, S.h, rgba(col, 0.5), 12);
    ctx.globalAlpha = 0.12; ctx.fillStyle = col;
    for (let i = 0; i < 9; i++) ctx.fillRect(S.x + 8, S.y + 12 + i * 18, S.w - 16, 1);
    ctx.globalAlpha = 1;
    CrocView.projector(ctx, S.x + S.w / 2, cy, 148, col, t, open ? 1 : 0.25);
    if (open) {
      const look = Object.assign({}, CROC_LOOKS.base, sp.look || {}, { girth: sp.girth || 1 });
      CrocView.holo(ctx, v, this.cvParts(look), S.x + S.w / 2 + 32, cy, 1.35, col, 1, t);
      const u = (v.t % 2.9) / 2.9;
      const ph = u < 0.30 ? 'IDLE' : u < 0.46 ? 'COIL' : u < 0.58 ? 'LUNGE' : u < 0.64 ? 'STRIKE' : 'RECOVER';
      Font.draw(ctx, ph, S.x + S.w - 32, S.y + 7, { color: u > 0.44 && u < 0.7 ? '#ffffff' : rgba(col, 0.75), align: 'right' });
    } else {
      Font.draw(ctx, 'NO SAMPLE ON FILE', S.x + S.w / 2, cy - 6, { color: '#3f5f58', align: 'center', scale: 2 });
      Font.draw(ctx, 'RESEARCH HAS NOT FUNDED THIS STOCK', S.x + S.w / 2, cy + 12, { color: '#5f7f78', align: 'center' });
    }
    for (const a of this.createArrows()) {
      const lit = Math.sin(t * 5 + (a.id > 0 ? 0 : Math.PI)) > -0.4;
      ctx.fillStyle = 'rgba(10,26,28,0.9)'; ctx.fillRect(a.x, a.y, a.w, a.h);
      this.bracket(ctx, a.x, a.y, a.w, a.h, 'rgba(122,255,218,0.55)', 6);
      ctx.fillStyle = lit ? '#e8fff8' : 'rgba(122,255,218,0.5)';
      const mx = a.x + a.w / 2, my = a.y + a.h / 2;
      for (let i = 0; i < 7; i++) { ctx.fillRect(Math.round(mx + a.id * (4 - i)), my - i, 2, 1); ctx.fillRect(Math.round(mx + a.id * (4 - i)), my + i, 2, 1); }
    }
    for (const r of this.createTicks()) {
      const ok = Create.speciesUnlocked(r.sp), on = r.i === (G.createSel || 0);
      ctx.fillStyle = on ? (r.sp.holo || '#7affda') : ok ? rgba(r.sp.holo || '#7affda', 0.4) : '#22302e';
      ctx.fillRect(r.x, r.y, r.w, on ? 6 : 3);
      if (!ok) { ctx.fillStyle = '#5f7f78'; ctx.fillRect(r.x + r.w / 2 - 3, r.y + 8, 6, 5); ctx.fillRect(r.x + r.w / 2 - 2, r.y + 5, 4, 3); }
    }
    // the papers, and what it costs to grow one
    const D = this.habDossier();
    ctx.fillStyle = 'rgba(5,16,18,0.92)'; ctx.fillRect(D.x, D.y, D.w, D.h);
    this.bracket(ctx, D.x, D.y, D.w, D.h, 'rgba(120,220,200,0.4)', 9);
    if (open) {
      const hd = this.cvParts(Object.assign({}, CROC_LOOKS.base, sp.look || {}, { girth: sp.girth || 1 })).head;
      ctx.save(); ctx.beginPath(); ctx.rect(D.x + 4, D.y + 4, D.w - 8, 44); ctx.clip();
      ctx.translate(D.x + 46, D.y + 28); ctx.scale(1.3, 1.3);
      ctx.drawImage(hd.c, -hd.ox, -hd.oy);
      ctx.restore();
    }
    Font.drawWrapped(ctx, open ? sp.name : 'SEALED', D.x + 6, D.y + 52, D.w - 12, { color: open ? '#e8fff8' : '#5f7f78', lineHeight: 9 });
    if (open && sp.trait) {
      ctx.fillStyle = rgba(sp.trait.col, 0.18); ctx.fillRect(D.x + 4, D.y + 74, D.w - 8, 12);
      ctx.fillStyle = sp.trait.col; ctx.fillRect(D.x + 4, D.y + 74, 2, 12);
      Font.draw(ctx, sp.trait.name, D.x + 10, D.y + 77, { color: sp.trait.col });
      Font.drawWrapped(ctx, sp.trait.line, D.x + 6, D.y + 90, D.w - 12, { color: '#7f9a90', lineHeight: 9 });
    }
    const bars = [['LEN', sp.size / 2.4], ['HP', sp.hp / 1.7], ['SPD', sp.spd / 1.4], ['BITE', sp.bite / 1.7]];
    bars.forEach((b2, i) => {
      const by = D.y + 132 + i * 12;
      Font.draw(ctx, b2[0], D.x + 6, by, { color: '#4f7f74' });
      ctx.fillStyle = '#111c1e'; ctx.fillRect(D.x + 34, by, D.w - 42, 6);
      const bw = Math.round((D.w - 42) * clamp(b2[1], 0.05, 1));
      ctx.fillStyle = open ? col : '#2a3230'; ctx.fillRect(D.x + 34, by, bw, 6);
    });
    // the right-hand column: stock number, cost, and the button
    const R = { x: 456, y: 80, w: 174 };
    Font.draw(ctx, 'STOCK', R.x, R.y, { color: '#4f7f74' });
    Font.draw(ctx, ((G.createSel || 0) + 1) + ' / ' + BASE_SPECIES.length, R.x + R.w, R.y, { color: '#c8d8d0', align: 'right' });
    ctx.fillStyle = 'rgba(120,220,200,0.25)'; ctx.fillRect(R.x, R.y + 11, R.w, 1);
    const cost = Habitat.hatchCost(sp.id), afford = Research.data() >= cost;
    Font.draw(ctx, 'COST', R.x, R.y + 26, { color: '#4f7f74' });
    Font.draw(ctx, cost === 0 ? 'FREE' : String(cost), R.x + R.w, R.y + 22, { color: cost === 0 ? '#7affda' : afford ? '#ffe060' : '#8a5a40', align: 'right', scale: 2 });
    Font.draw(ctx, 'DATA HELD', R.x, R.y + 48, { color: '#4f7f74' });
    Font.draw(ctx, String(Research.data()), R.x + R.w, R.y + 48, { color: '#c8d8d0', align: 'right' });
    Font.draw(ctx, 'ENCLOSURE ' + (slot + 1), R.x, R.y + 68, { color: '#4f7f74' });
    const go = this.createGoRect(), can = open && afford;
    ctx.fillStyle = can ? 'rgba(10,44,38,0.96)' : 'rgba(14,20,20,0.9)'; ctx.fillRect(go.x, go.y, go.w, go.h);
    ctx.fillStyle = can ? (Math.floor(t * 2) % 2 ? '#7affda' : '#2f8a76') : '#33403e'; ctx.fillRect(go.x, go.y, go.w, 2);
    this.bracket(ctx, go.x - 2, go.y - 2, go.w + 4, go.h + 4, can ? '#7affda' : '#3a4a48', 7);
    Font.draw(ctx, !open ? 'SEALED' : !afford ? 'NEED DATA' : 'GROW IT', go.x + go.w / 2, go.y + 11,
      { color: can ? '#dffdf4' : '#6a7f7a', align: 'center', scale: 2, outline: '#04120e' });
  },
  habApply(r, cur, sel) {
    // one place that knows what activating a row means
    if (r.kind === 'up') return Habitat.invest(cur, r.id) ? 'up' : null;
    if (r.kind === 'go') { if (sel !== Habitat.runnerIndex()) { Habitat.select(sel); return 'pick'; } return 'go'; }
    if (r.kind === 'len') { if (!Create.sizeUnlocked(r.i)) return null; cur.size = r.i; G.storeSave(); return 'set'; }
    if (r.kind === 'girth') { if (!Create.girthUnlocked(r.i)) return null; cur.girth = r.i; G.storeSave(); return 'set'; }
    if (r.kind === 'hide') { if (!Create.paintUnlocked(r.pt)) return null; cur.hide = r.pt.id; G.storeSave(); return 'set'; }
    return null;
  },
  // an empty enclosure asks one question: which animal goes in it
  drawLandmark(ctx, kind, x, y, on) {
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + a), Math.round(y + b), Math.max(1, w), Math.max(1, h)); };
    const dim = c => (on ? c : mixColor(c, '#20302c', 0.62));
    switch (kind) {
      case 'outfall':
        px(-7, -9, 14, 9, dim('#6a6d72')); px(-7, -9, 14, 2, dim('#8b8e94'));
        px(-4, -7, 8, 6, dim('#161c1e')); px(-4, -7, 8, 1, dim('#2a3436'));
        px(-9, 0, 18, 2, dim('#4a4d52'));
        break;
      case 'mangrove':
        px(-8, -13, 16, 7, dim('#2f6a34')); px(-6, -16, 12, 4, dim('#3f8a42'));
        px(-5, -15, 4, 2, dim('#58a852'));
        for (let i = -6; i <= 6; i += 3) px(i, -6, 1, 7, dim('#4a3a24'));
        break;
      case 'camp':
        px(-9, -3, 18, 4, dim('#6b5033')); px(-9, -10, 18, 7, dim('#8a6a44'));
        px(-11, -13, 22, 3, dim('#a03a2a')); px(-3, -8, 4, 5, dim('#2a2018'));
        for (let i = -7; i <= 7; i += 5) px(i, 1, 1, 5, dim('#4a3524'));
        break;
      case 'cypress':
        for (const ox of [-6, 2]) { px(ox, -6, 2, 7, dim('#3a2a1a')); for (let k = 0; k < 3; k++) px(ox - 4 + k, -14 + k * 4, 10 - k * 2, 3, dim(k ? '#2f5a2a' : '#3f7a34')); }
        px(-9, 0, 1, 3, dim('#4a3a26')); px(8, 0, 1, 3, dim('#4a3a26'));
        break;
      case 'prairie':
        for (let i = -9; i <= 9; i += 3) { const h = 6 + ((i + 9) % 5); px(i, -h, 1, h, dim('#7a9a4a')); px(i + 1, -h + 1, 1, h - 1, dim('#5f7f34')); }
        px(-10, 0, 20, 2, dim('#6a7a44'));
        break;
      case 'river':
        px(-8, -12, 2, 13, dim('#c8c8b8')); px(-9, -14, 4, 3, dim('#20a040'));
        px(6, -10, 2, 11, dim('#c8c8b8')); px(5, -12, 4, 3, dim('#e04040'));
        px(-11, 0, 22, 2, dim('#2a5a68'));
        break;
      case 'campground':
        px(-10, -8, 9, 8, dim('#3a6ab0')); px(-6, -11, 1, 4, dim('#c8c8b8'));
        px(1, -7, 8, 7, dim('#e0a020')); px(4, -10, 1, 4, dim('#c8c8b8'));
        px(-2, -3, 3, 3, dim('#e06030')); px(-1, -5, 1, 2, dim('#ffd060'));
        break;
      case 'bay':
        px(-1, -13, 3, 10, dim('#20a040')); px(-3, -3, 7, 4, dim('#e0e0d0'));
        px(-3, -3, 7, 1, dim('#20a040')); px(-2, -15, 1, 2, dim('#40ff60'));
        px(-11, 1, 22, 1, dim('#2a7a8a'));
        break;
      // ---- zone 1: the sewer network ----
      case 'undercroft':
        px(-11, -14, 22, 3, dim('#5a6060')); px(-11, -11, 22, 1, dim('#33393a'));
        px(-8, -10, 3, 10, dim('#3f4547')); px(5, -10, 3, 10, dim('#3f4547'));
        px(-4, -6, 8, 6, dim('#7a4a22')); px(-4, -6, 8, 1, dim('#a06a30'));
        px(-2, -9, 1, 3, dim('#ff9030')); px(0, -8, 1, 2, dim('#ffc060'));
        px(-11, 0, 22, 2, dim('#2e3436'));
        break;
      case 'shaft':
        px(-9, -15, 4, 16, dim('#4a5052')); px(5, -15, 4, 16, dim('#4a5052'));
        px(-9, -15, 4, 1, dim('#757c7e')); px(5, -15, 4, 1, dim('#757c7e'));
        for (let k = -13; k < 1; k += 4) { px(-5, k, 10, 1, dim('#252b2c')); }
        px(-5, -15, 10, 15, dim('#101718'));
        px(-2, -4, 4, 5, dim('#2a6a5a')); px(-2, -4, 4, 1, dim('#46a88a'));
        break;
      case 'junction':
        px(-3, -14, 6, 15, dim('#3f4547'));
        px(-12, -10, 24, 4, dim('#4a5052')); px(-12, -10, 24, 1, dim('#727a7c'));
        px(-12, -3, 24, 4, dim('#4a5052')); px(-12, -3, 24, 1, dim('#727a7c'));
        px(-10, -9, 2, 2, dim('#0c1212')); px(8, -9, 2, 2, dim('#0c1212'));
        px(-10, -2, 2, 2, dim('#0c1212')); px(8, -2, 2, 2, dim('#0c1212'));
        px(-2, -12, 4, 4, dim('#7a8a2a')); px(-1, -11, 2, 2, dim('#b4c840'));
        break;
      case 'gallery':
        px(-12, -15, 24, 4, dim('#545a5c')); px(-12, -15, 24, 1, dim('#7c8486'));
        for (let i = -10; i <= 9; i += 5) px(i, -11, 1, 12, dim('#3a4042'));
        px(-12, -11, 24, 1, dim('#2a3032'));
        px(-12, -2, 24, 3, dim('#3a5a2e')); px(-12, -2, 24, 1, dim('#587a3a'));
        px(-6, -8, 3, 1, dim('#96b03a')); px(3, -6, 3, 1, dim('#96b03a'));
        break;
      case 'sump':
        px(-12, -4, 24, 5, dim('#31401f')); px(-12, -4, 24, 1, dim('#5c7a2a'));
        px(-9, -14, 5, 11, dim('#4a5052')); px(-9, -14, 5, 2, dim('#767e80'));
        px(-8, -5, 3, 3, dim('#8ba82a'));
        px(2, -9, 8, 3, dim('#3f4547')); px(2, -9, 8, 1, dim('#6a7274'));
        px(4, -6, 1, 4, dim('#6a8a2a')); px(7, -6, 1, 3, dim('#6a8a2a'));
        break;
      // ---- zone 3: the open ocean ----
      case 'shelf':
        px(-12, -1, 24, 3, dim('#c8bc9a')); px(-12, -1, 24, 1, dim('#e4dcbc'));
        for (let i = -10; i <= 10; i += 3) { const h = 5 + ((i + 12) % 4); px(i, -1 - h, 1, h, dim('#4a9a5a')); px(i + 1, -h, 1, h - 1, dim('#6ec07a')); }
        px(-12, -15, 24, 1, dim('#8ad0e0'));
        break;
      case 'reef':
        px(-12, 0, 24, 2, dim('#c0a884'));
        for (const [ox, hh, c] of [[-9, 9, '#c4566e'], [-4, 13, '#cfa03a'], [2, 10, '#5a94bc'], [7, 12, '#a05aa8']]) {
          px(ox, -hh, 3, hh, dim(c)); px(ox, -hh, 1, hh, dim(mixColor(c, '#ffffff', 0.35)));
          px(ox - 2, -hh + 3, 2, 2, dim(c)); px(ox + 3, -hh + 5, 2, 2, dim(c));
        }
        px(-7, -14, 2, 1, dim('#ffe8a0'));
        break;
      case 'wall':
        px(-12, -16, 11, 32, dim('#5a5246')); px(-12, -16, 11, 1, dim('#84796a'));
        for (let k = -14; k < 14; k += 4) px(-12, k, 11, 1, dim('#3a352c'));
        px(-1, -9, 2, 3, dim('#3a8a80')); px(-1, -2, 2, 3, dim('#3a8a80'));
        px(4, -6, 8, 3, dim('#8a9aa6')); px(4, -6, 6, 1, dim('#d8e0e6'));
        px(10, -7, 3, 2, dim('#5a6a76'));
        break;
      case 'trench':
        px(-13, -2, 8, 18, dim('#34343a')); px(5, -5, 9, 21, dim('#34343a'));
        px(-13, -2, 8, 1, dim('#585862')); px(5, -5, 9, 1, dim('#585862'));
        px(-5, 2, 10, 14, dim('#050a10'));
        px(-2, -8, 1, 6, dim('#c8c0a8')); px(-3, -10, 3, 2, dim('#8affe0'));
        px(-4, -5, 6, 4, dim('#3a2a34')); px(-3, -4, 1, 1, dim('#ff6a6a'));
        px(-1, -4, 3, 1, dim('#e0d8c0'));
        break;
      case 'seawall':
        px(-11, -6, 22, 7, dim('#5e6068')); px(-11, -6, 22, 1, dim('#8a8c92'));
        for (const [ox, h, w] of [[-9, 14, 5], [-3, 20, 6], [4, 11, 4], [8, 17, 4]]) {
          px(ox, -6 - h, w, h, dim('#2c3140'));
          for (let ry = 0; ry < h - 2; ry += 3) for (let cx2 = 0; cx2 < w - 1; cx2 += 2) if (((ox + ry + cx2) % 5) < 2) px(ox + cx2 + 1, -5 - h + ry, 1, 2, dim('#e8d070'));
        }
        break;
    }
  },
  // ---------- release-site display: a spinning globe ----------
  globeGeom() { return { cx: G.W * 0.34, cy: G.H * 0.53, r: Math.round(G.H * 0.32) }; },
  stageRows() {
    // Only the zone you are looking at puts markers on the sphere. Eighteen pins
    // at once read as a line of dots strung round the equator; four or five read
    // as places. The hit target is the whole marker, staff and head.
    const gg = this.globeGeom(), spin = G.globeSpin || 0;
    const cx = gg.cx, cy = gg.cy, r = gg.r;
    const Z = zoneOf(STAGES[clamp(G.stageSel || 0, 0, STAGES.length - 1)]);
    return STAGES.map((st, i) => {
      const mine = st.zone === Z.id;
      const [px2, py2, z2, vis] = Globe.project(st.lon, st.lat, gg.cx, gg.cy, gg.r, spin, G.globeTilt || 0.3);
      const k = 0.62 + clamp(z2, 0, 1) * 0.38;        // pins on the near face stand tallest
      const staff = Math.round(30 * k), head = Math.round(14 * k);
      // A pin stands on the ground it marks. Drawing every staff straight up
      // the screen made the ones near the limb look pasted on over the edge
      // rather than planted in it, so the staff leans out along the normal:
      // radial at the rim, upright in the middle where the normal faces you.
      const dx = (px2 - cx) / r, dy = (py2 - cy) / r;
      const m = clamp(Math.sqrt(dx * dx + dy * dy), 0, 1);
      let ux = 0, uy = -1;
      if (m > 0.02) { const bx = dx / m * m, by = lerp(-1, dy / m, m); const bl = Math.hypot(bx, by) || 1; ux = bx / bl; uy = by / bl; }
      const hx = px2 + ux * staff, hy = py2 + uy * staff;
      return { x: Math.min(px2, hx) - head - 4, y: Math.min(py2, hy) - head - 4,
        w: Math.abs(hx - px2) + head * 2 + 8, h: Math.abs(hy - py2) + head * 2 + 8,
        st, i, px: px2, py: py2, hx, hy, ux, uy, z: z2, vis: vis && mine, mine, k, staff, head };
    });
  },
  // small corner brackets: the readouts all sit inside instrument frames
  // A phone has no escape key. Every screen that can be backed out of carries
  // the same control in the same corner, and it is only drawn on touch.
  exitRect() { return { x: G.W - 26, y: 5, w: 21, h: 21 }; },
  exitShown() { return !!(G.touchUI || Input.touch.active); },
  exitHit() {
    if (!this.exitShown() || !Input.mouse.clicked) return false;
    const r = this.exitRect();
    return Input.mouse.x >= r.x - 4 && Input.mouse.x <= r.x + r.w + 4 && Input.mouse.y >= r.y - 4 && Input.mouse.y <= r.y + r.h + 4;
  },
  drawExit(ctx) {
    if (!this.exitShown()) return;
    const r = this.exitRect();
    ctx.fillStyle = 'rgba(6,16,16,0.85)'; ctx.fillRect(r.x, r.y, r.w, r.h);
    this.bracket(ctx, r.x, r.y, r.w, r.h, 'rgba(255,140,110,0.55)', 6);
    ctx.fillStyle = '#ff8c6e';
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(r.x + 6 + i, r.y + 6 + i, 2, 2);
      ctx.fillRect(r.x + 14 - i, r.y + 6 + i, 2, 2);
    }
  },
  bracket(ctx, x, y, w, h, col, len = 6) {
    ctx.fillStyle = col;
    for (const [bx, by, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      ctx.fillRect(Math.round(bx + (dx < 0 ? -len : 0)), Math.round(by + (dy < 0 ? -1 : 0)), len, 1);
      ctx.fillRect(Math.round(bx + (dx < 0 ? -1 : 0)), Math.round(by + (dy < 0 ? -len : 0)), 1, len);
    }
  },
  drawStages(ctx) {
    const W = G.W, H = G.H, t = G.menuT, gg = this.globeGeom();
    const spin = G.globeSpin || 0, tilt = G.globeTilt || 0.3;
    ctx.fillStyle = '#050a0c'; ctx.fillRect(0, 0, W, H);
    // instrument backdrop: faint grid and scan lines
    ctx.fillStyle = 'rgba(60,140,120,0.07)';
    for (let x2 = 0; x2 < W; x2 += 16) ctx.fillRect(x2, 0, 1, H);
    for (let y2 = 0; y2 < H; y2 += 16) ctx.fillRect(0, y2, W, 1);

    // --- the globe, with a soft glow behind it
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(gg.cx, gg.cy, gg.r * 0.7, gg.cx, gg.cy, gg.r * 1.8);
    gl.addColorStop(0, 'rgba(40,120,150,0.18)'); gl.addColorStop(1, 'rgba(40,120,150,0)');
    ctx.fillStyle = gl; ctx.fillRect(gg.cx - gg.r * 2, gg.cy - gg.r * 2, gg.r * 4, gg.r * 4);
    ctx.globalCompositeOperation = 'source-over';
    Globe.draw(ctx, gg.cx, gg.cy, gg.r, spin, tilt, t);
    // targeting reticle around the sphere
    ctx.strokeStyle = 'rgba(120,220,200,0.35)'; ctx.lineWidth = 1;
    Shape.ring(ctx, gg.cx, gg.cy, gg.r + 7, 1, 'rgba(120,220,200,0.35)');
    ctx.fillStyle = 'rgba(120,220,200,0.5)';
    for (let a = 0; a < 4; a++) { const an = a * Math.PI / 2 + t * 0.25; ctx.fillRect(Math.round(gg.cx + Math.cos(an) * (gg.r + 7) - 1), Math.round(gg.cy + Math.sin(an) * (gg.r + 7) - 1), 3, 3); }

    // --- pins, far side first so near ones sit on top
    const rows = this.stageRows().slice().sort((a, b) => a.z - b.z);
    for (const r of rows) {
      const st = r.st, open = Stages.unlocked(st), sel = r.i === G.stageSel;
      if (!r.vis) continue;
      const fade = clamp(r.z * 2.4, 0, 1);
      const zc = zoneOf(st).col;
      const col = !open ? mixColor(zc, '#2a3a38', 0.72) : st.kaiju ? '#ff7a40' : zc;
      const dk = shade(col, 0.45), lt = mixColor(col, '#ffffff', 0.45);
      const px2 = Math.round(r.px), py2 = Math.round(r.py);
      const bob = sel ? Math.sin(t * 3) * 1.5 : 0;
      const len = r.staff + bob;
      const hx = Math.round(px2 + r.ux * len), hy = Math.round(py2 + r.uy * len), hr = r.head;
      ctx.globalAlpha = fade;
      // the ground it stands on, squashed the way the surface is
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(px2 - 3, py2 - 1, 7, 2);
      // the staff, walked out along the normal a pixel at a time
      const steps = Math.max(2, Math.round(len));
      for (let q = 0; q <= steps; q++) {
        const f2 = q / steps;
        ctx.fillStyle = q % 3 ? dk : col;
        ctx.fillRect(Math.round(px2 + r.ux * len * f2) - 1, Math.round(py2 + r.uy * len * f2) - 1, 3, 3);
      }
      // head: a pixel diamond carrying the site's own landmark, small
      ctx.fillStyle = dk;
      for (let dy = -hr; dy <= hr; dy++) { const w = hr - Math.abs(dy); if (w < 0) continue; ctx.fillRect(hx - w, hy + dy, w * 2 + 1, 1); }
      ctx.fillStyle = col;
      for (let dy = -hr + 2; dy <= hr - 2; dy++) { const w = hr - 2 - Math.abs(dy); if (w < 0) continue; ctx.fillRect(hx - w, hy + dy, w * 2 + 1, 1); }
      ctx.fillStyle = lt;
      for (let dy = -hr + 2; dy <= -hr + 4; dy++) { const w = hr - 2 - Math.abs(dy); if (w < 0) continue; ctx.fillRect(hx - w, hy + dy, w * 2 + 1, 1); }
      {
        ctx.save(); ctx.translate(hx, hy + 3); ctx.scale(0.66 * r.k, 0.66 * r.k);
        this.drawLandmark(ctx, st.id, 0, 0, open);
        ctx.restore();
      }
      if (!open) { ctx.fillStyle = 'rgba(6,14,14,0.55)'; for (let dy = -hr; dy <= hr; dy++) { const w = hr - Math.abs(dy); if (w < 0) continue; ctx.fillRect(hx - w, hy + dy, w * 2 + 1, 1); } }
      // the selected marker gets a halo, ticks and its name on a tag
      if (sel) {
        Shape.ring(ctx, hx, hy, hr + 5 + Math.sin(t * 5) * 1.4, 1, col);
        ctx.fillStyle = col;
        ctx.fillRect(hx - hr - 11, hy, 4, 1); ctx.fillRect(hx + hr + 8, hy, 4, 1);
        const nm = open ? st.name : 'SEALED';
        const tw = Font.width(nm, 1) + 12, tx = clamp(hx - tw / 2, 4, G.W - tw - 4), ty = hy - hr - 22;
        ctx.fillStyle = 'rgba(4,12,14,0.92)'; ctx.fillRect(tx, ty, tw, 14);
        ctx.fillStyle = col; ctx.fillRect(tx, ty, tw, 1);
        ctx.fillRect(hx - 1, ty + 14, 2, 4);
        Font.draw(ctx, nm, tx + tw / 2, ty + 4, { color: open ? '#e8fff8' : '#8f7f78', align: 'center' });
      }
      ctx.globalAlpha = 1;
    }

    // --- readout column on the right: icon, name, two numbers, nothing else
    const cur = STAGES[G.stageSel] || STAGES[0], open = Stages.unlocked(cur);
    const Z = zoneOf(cur), zSites = STAGES_BY_ZONE[Z.id] || [cur], zIdx = zSites.indexOf(cur);
    const accent = cur.kaiju ? '#ff7a40' : open ? Z.col : '#a08070';
    const px0 = W * 0.62, shake = G.menuShake > 0 ? Math.sin(t * 60) * 3 : 0;
    // --- zone header: which of the three worlds this site belongs to
    ctx.fillStyle = 'rgba(6,18,16,0.75)'; ctx.fillRect(10, 8, W * 0.46, 30);
    this.bracket(ctx, 10, 8, W * 0.46, 30, rgba(Z.col, 0.35), 5);
    for (const z of ZONES) {
      // a zone the lab has not surveyed is a blank tab, not a dim one
      const on = z.id === Z.id, surveyed = Research.zoneOpen(z.id), bx = 16 + (z.n - 1) * 12;
      ctx.fillStyle = !surveyed ? '#1b2726' : on ? z.col : mixColor(z.col, '#0a1614', 0.7);
      ctx.fillRect(bx, on ? 13 : 15, 8, on ? 20 : 16);
      if (!surveyed) { ctx.fillStyle = '#3c4a48'; ctx.fillRect(bx + 2, on ? 21 : 21, 4, 2); }
    }
    Font.draw(ctx, 'ZONE ' + Z.n, 58, 13, { color: Z.col, scale: 2, outline: '#04120e' });
    Font.draw(ctx, Z.name, 58, 28, { color: '#c8d8d0' });
    Font.draw(ctx, 'RELEASE SITE', px0 + shake, 26, { color: '#4f7f74' });
    Font.draw(ctx, String(zIdx + 1).padStart(2, '0') + ' / ' + String(zSites.length).padStart(2, '0'), W - 22, 26, { color: '#4f7f74', align: 'right' });
    ctx.fillStyle = 'rgba(120,220,200,0.25)'; ctx.fillRect(px0 + shake, 36, W - 22 - px0, 1);
    // the landmark icon, large, standing in for a paragraph of description
    const iw = 54;
    this.bracket(ctx, px0 + shake, 46, iw, iw, 'rgba(120,220,200,0.4)');
    ctx.save(); ctx.translate(px0 + iw / 2 + shake, 46 + iw * 0.72); ctx.scale(1.7, 1.7);
    this.drawLandmark(ctx, cur.id, 0, 0, open);
    ctx.restore();
    // long site names drop to a single-height face rather than running off the panel
    const nameX = px0 + iw + 10 + shake, nameW = W - 22 - nameX;
    const nameStr = open ? cur.name : 'SEALED';
    const nameSc = Font.width(nameStr, 2) <= nameW ? 2 : 1;
    Font.draw(ctx, nameStr, nameX, nameSc === 2 ? 52 : 55, { color: accent, scale: nameSc, outline: '#04120e' });
    if (open) {
      Font.draw(ctx, (cur.size * 3.2).toFixed(1) + ' FT', px0 + iw + 10 + shake, 72, { color: '#c8d8d0' });
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k < Math.min(5, Math.round(cur.diff + 1)) ? accent : '#22322e'; ctx.fillRect(Math.round(px0 + iw + 10 + k * 8 + shake), 84, 6, 6); }
    } else Font.draw(ctx, Stages.hint(cur.need, cur), px0 + iw + 10 + shake, 72, { color: '#a08070' });

    // --- the chain of sites in this zone, so progress reads at a glance
    const sy2 = 122, sw2 = W - 22 - px0;
    for (let i = 0; i < zSites.length; i++) {
      const st = zSites[i], o2 = Stages.unlocked(st), on = st === cur;
      const bx = px0 + (i + 0.5) * (sw2 / zSites.length);
      ctx.fillStyle = on ? accent : o2 ? mixColor(Z.col, '#12201e', 0.5) : '#26332f';
      ctx.fillRect(Math.round(bx - 3), sy2 + (on ? -2 : 0), 6, on ? 10 : 6);
    }
    ctx.fillStyle = 'rgba(120,220,200,0.2)'; ctx.fillRect(px0, sy2 + 14, sw2, 1);

    // --- the standing order on this site, and what it is worth
    const mdef = MISSIONS[cur.id], mart = ARTIFACTS.find(a2 => a2.stage === cur.id);
    Font.draw(ctx, 'ORDER', px0 + shake, 146, { color: '#4f7f74' });
    if (open && mdef) {
      Font.draw(ctx, mdef.title, px0 + shake, 158, { color: '#d8e8de' });
      Font.draw(ctx, mdef.line, px0 + shake, 170, { color: '#7f9a90' });
    } else Font.draw(ctx, 'SEALED', px0 + shake, 158, { color: '#a08070' });

    // --- the vault: one relic per site in this zone, lit once carried out
    const zArts = ARTIFACTS.filter(a2 => { const st = STAGE_BY_ID[a2.stage]; return st && st.zone === Z.id; });
    const got = Missions.owned().length;
    Font.draw(ctx, 'RELICS', px0 + shake, 190, { color: '#4f7f74' });
    Font.draw(ctx, got + '/' + ARTIFACTS.length, W - 22, 190, { color: got ? '#ffd060' : '#4f7f74', align: 'right' });
    const slotW = sw2 / Math.max(1, zArts.length);
    zArts.forEach((a2, i) => {
      const bx = px0 + (i + 0.5) * slotW, byy = 212, have = Missions.has(a2.id), here = a2.stage === cur.id;
      ctx.fillStyle = have ? 'rgba(255,208,96,0.10)' : 'rgba(120,220,200,0.05)';
      ctx.fillRect(Math.round(bx - slotW / 2 + 1), byy - 11, Math.round(slotW - 2), 22);
      if (here) this.bracket(ctx, Math.round(bx - slotW / 2 + 1), byy - 11, Math.round(slotW - 2), 22, accent, 4);
      if (have) drawRelicGlyph(ctx, a2, Math.round(bx), byy, t * 0.6, 0.9);
      else { ctx.fillStyle = '#22322e'; ctx.fillRect(Math.round(bx - 2), byy - 3, 5, 6); ctx.fillRect(Math.round(bx - 1), byy - 6, 3, 3); }
    });
    if (mart) {
      const have = Missions.has(mart.id);
      Font.draw(ctx, have ? mart.name : 'UNCLAIMED RELIC', px0 + shake, 232, { color: have ? mart.col : '#5f7f78' });
      Font.drawWrapped(ctx, have ? mart.boon : mart.line, px0 + shake, 244, W - 22 - px0, { color: have ? '#7f9a90' : '#3f5f58', lineHeight: 9 });
    }

    // --- the button that actually sends you. It used to be the word ENTER,
    // which is not a key a phone or a tablet has.
    const go = this.stageGoRect(), gx2 = go.x + shake;
    ctx.fillStyle = open ? 'rgba(52,26,6,0.96)' : 'rgba(20,10,10,0.9)'; ctx.fillRect(gx2, go.y, go.w, go.h);
    ctx.fillStyle = open ? (Math.floor(t * 2) % 2 ? '#ffe060' : '#c8a030') : '#6a4038'; ctx.fillRect(gx2, go.y, go.w, 2);
    ctx.fillStyle = '#1a0e04'; ctx.fillRect(gx2, go.y + go.h - 1, go.w, 1);
    this.bracket(ctx, gx2 - 2, go.y - 2, go.w + 4, go.h + 4, open ? '#ff8050' : '#5a4a48', 7);
    Font.draw(ctx, open ? 'RELEASE' : 'SEALED', gx2 + go.w / 2, go.y + 7, { color: open ? '#ffd0a0' : '#a08070', align: 'center', scale: 2, outline: '#2a0c00' });
    Font.draw(ctx, this.exitShown() ? 'DRAG TO SPIN' : 'DRAG  SPIN     UP/DOWN  SITE     ENTER  RELEASE', px0 + shake, H - 11, { color: '#4f7f74' });
    this.drawExit(ctx);
  },
  // the induction's dialogue bar owns the foot of the screen; the button that
  // sends you out moves up above it rather than hiding behind it
  stageGoRect() {
    const px0 = G.W * 0.62, lift = 0;
    return { x: Math.round(px0), y: G.H - 42 - lift, w: Math.round(G.W - 22 - px0), h: 24 };
  },
  // the croc turning slowly in the acid, wearing whatever you picked
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
      Shape.star(ctx, W / 2, 96, 30 + Math.sin(G.t * 3) * 2, selCol, 0.3);
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
    // Six lines. Everything else about the run is already somewhere you can
    // look at it, and a wall of statistics is not a thing anybody reads twice.
    const rows = [
      ['FORM', TIERS[P.tier].name + '  ' + P.lengthFt.toFixed(1) + ' FT'],
      ['SCORE', fmt(G.score) + (G.score >= G.save.best && G.score > 0 ? '  BEST' : '')],
      ['EATEN', String(s.eaten)],
      ['KILLS', String(s.kills) + (s.bosses ? '  (' + s.bosses + ' BOSS)' : '')],
      ['WRECKED', String(s.boats + (s.structures || 0))],
      ['ORDER', G.mission ? (G.mission.claimed ? 'RELIC TAKEN' : G.mission.done ? 'RELIC LEFT' : Math.floor(G.mission.n) + '/' + G.mission.target) : '-'],
    ];
    this.panel(ctx, W / 2 - 150, 84, 300, 14 + rows.length * 16, 'rgba(6,4,4,0.85)', '#5a2020');
    rows.forEach((r, i) => { const y = 92 + i * 16; Font.draw(ctx, r[0], W / 2 - 140, y, { color: '#c09090' }); Font.draw(ctx, r[1], W / 2 + 140, y, { color: '#ffffff', align: 'right' }); });
    // what the lab got out of it: the only thing that leaves this screen with you
    const pay = d.pay;
    if (pay && t > 0.6) {
      const py2 = 200, reveal = clamp((t - 0.6) * 2.2, 0, 1);
      ctx.fillStyle = 'rgba(6,14,12,0.9)'; ctx.fillRect(W / 2 - 150, py2, 300, 20);
      ctx.fillStyle = '#3fd0a8'; ctx.fillRect(W / 2 - 150, py2, 300, 1);
      Font.draw(ctx, 'DATA RECOVERED', W / 2 - 142, py2 + 7, { color: '#4f7f74' });
      const parts = [['SCORE', pay.score], ['GROWTH', pay.tier], ['RELIC', pay.relics]].filter(r => r[1] > 0);
      let bx = W / 2 - 40;
      for (const r of parts) { Font.draw(ctx, r[0] + ' +' + r[1], bx, py2 + 7, { color: '#8fbfb6' }); bx += Font.width(r[0] + ' +' + r[1], 1) + 10; }
      Font.draw(ctx, '+' + Math.round(pay.total * reveal), W / 2 + 142, py2 + 4, { color: '#ffe060', align: 'right', scale: 2, outline: '#3a2a00' });
    }
    if (t > 1 && Math.floor(t * 2) % 2 === 0) Font.draw(ctx, this.exitShown() ? 'TAP TO HUNT AGAIN' : 'ENTER  AGAIN', W / 2, 244, { color: '#ffe060', align: 'center', scale: 2, outline: '#402000' });
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
    this.drawExit(ctx);
  },
  drawHelpBody(ctx, y) {
    const W = G.W;
    const lines = [
      'SWIM WITH WASD. BITE WITH SPACE. HOLD SHIFT TO SPEED UP. BRACE WITH L.', 'TINY PREY IS SWALLOWED WHOLE. BIGGER PREY COMES APART.',
      'BITE MEDIUM PREY TO LATCH ON, THEN BITE ON THE GOLD TO TEAR IT APART.', 'BRACE JUST BEFORE A HIT LANDS TO PARRY IT AND COUNTER.',
      'EVERY GENE CARRIES A COST. TOO MANY AND YOUR BODY REJECTS THEM.', 'BOSSES BREAK INTO PHASES. STAGGER ONE AND BITE TO EXECUTE IT.',
      'EACH SITE HAS ONE ORDER. FINISH IT AND A RELIC SURFACES. RELICS ARE FOREVER.', 'HUNGER DRAINS. ALWAYS BE EATING.',
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
    this.drawExit(ctx);
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
  // The execution. One prompt at a time on a big key cap with a draining bar
  // under it, the whole sequence laid out as a filmstrip so you can see what is
  // coming, and three chances to miss. Cine supplies the bars and the vignette.
  drawFinisher(ctx) {
    const F = G.finisher; if (!F) return;
    const W = G.W, H = G.H, t = G.t;
    const done = F.over > 0;
    const touch = G.touchUI || Input.touch.active;

    // --- title
    const title = done ? (F.won ? 'EXECUTED' : 'THROWN OFF') : 'EXECUTION';
    const tcol = done && !F.won ? '#ff5030' : '#ffd060';
    if (done) {
      // the verdict lands with a scale punch
      const k = clamp(1 - F.over / (F.won ? 0.75 : 0.5), 0, 1);
      const sc = Math.round(4 + (1 - k) * 3);
      Font.draw(ctx, title, W / 2, H * 0.3, { color: tcol, align: 'center', scale: sc, outline: '#2a0c00' });
      if (F.won) Font.draw(ctx, F.e && F.e.name ? F.e.name + ' IS FINISHED' : '', W / 2, H * 0.3 + 34, { color: '#e6eede', align: 'center', outline: '#2a0c00' });
      else Font.draw(ctx, 'IT IS GETTING BACK UP', W / 2, H * 0.3 + 34, { color: '#c08070', align: 'center', outline: '#2a0c00' });
      return;
    }
    Font.draw(ctx, title, W / 2, 34, { color: tcol, align: 'center', scale: 2, outline: '#2a1000' });
    Font.draw(ctx, F.e && F.e.name ? F.e.name : '', W / 2, 50, { color: '#c8a870', align: 'center', outline: '#1a0c00' });

    // --- misses left, as a row of tally marks under the title
    for (let i = 0; i < 3; i++) {
      const on = i < 3 - F.misses;
      ctx.fillStyle = on ? '#ffd060' : '#3a2018';
      ctx.fillRect(W / 2 - 11 + i * 8, 60, 4, 5);
    }

    // --- the sequence as a filmstrip along the bottom band
    const n = F.seq.length, cw = 26, x0 = W / 2 - (n * cw) / 2, fy = H - 36;
    for (let i = 0; i < n; i++) {
      const past = i < F.i, now = i === F.i;
      const hit = F.res[i];
      const col = past ? (hit ? '#6ad040' : '#c04030') : now ? '#ffd060' : '#3d4f52';
      drawKeyCap(ctx, x0 + i * cw + 2, fy, cw - 6, 14, FIN_SHORT[F.seq[i]], { lit: now, color: col, dead: past && !hit, scale: 1 });
      if (past) {
        ctx.fillStyle = hit ? '#6ad040' : '#c04030';
        ctx.fillRect(x0 + i * cw + 2, fy + 16, cw - 6, 2);
      }
    }

    // --- the live prompt: a big cap and a bar draining under it
    const want = F.seq[F.i], f = clamp(F.t / F.dur, 0, 1);
    const cx = W / 2, cy = H * 0.70;
    const label = FIN_LABEL[want], lw = Math.max(74, Font.width(label, 2) + 26);
    // a soft plate behind it so it reads over any background
    ctx.fillStyle = 'rgba(4,8,10,0.55)'; ctx.fillRect(cx - lw / 2 - 8, cy - 22, lw + 16, 52);
    this.bracket(ctx, cx - lw / 2 - 8, cy - 22, lw + 16, 52, 'rgba(255,200,110,0.5)', 8);
    const punch = F.flash > 0 ? Math.round(F.flash * 12) : 0;
    drawKeyCap(ctx, cx - lw / 2, cy - 16 - punch, lw, 26, label, { lit: true, color: '#ffd060', scale: 2 });
    Font.draw(ctx, touch ? 'TAP THE PAD' : 'PRESS IT', cx, cy - 30, { color: '#a88a50', align: 'center' });
    // timing bar: plenty of room, turning red only right at the end
    const bw = lw, bx = cx - bw / 2, by = cy + 15;
    ctx.fillStyle = '#0d1210'; ctx.fillRect(bx - 1, by - 1, bw + 2, 8);
    const bc = f > 0.86 ? '#ff5030' : f > 0.6 ? '#ffa030' : '#6ad040';
    ctx.fillStyle = bc; ctx.fillRect(bx, by, Math.round(bw * (1 - f)), 6);
    ctx.fillStyle = mixColor(bc, '#ffffff', 0.5); ctx.fillRect(bx, by, Math.round(bw * (1 - f)), 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    for (let i = 8; i < bw; i += 8) ctx.fillRect(bx + i, by, 1, 6);

    Font.draw(ctx, 'THREE MISSES AND IT GETS UP', W / 2, H - 12, { color: '#8a6a5a', align: 'center' });
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
    if (touch) { const p = Input.pads(); ctx.globalAlpha = 0.5; Shape.oct(ctx, p.bite.x, p.bite.y, p.bite.r, null, '#ffffff', 2); ctx.globalAlpha = 1; Font.draw(ctx, 'TAP', p.bite.x, p.bite.y - 4, { color: '#ffffff', align: 'center', outline: '#000' }); }
  },
  drawTouch(ctx) {
    const P = Input.pads(), T = Input.touch, pl = G.player;
    const ring = (x, y, r, a, col) => { ctx.globalAlpha = a; Shape.oct(ctx, x, y, r, null, col, 2); ctx.globalAlpha = 1; };
    const disc = (x, y, r, a, col) => { ctx.globalAlpha = a; Shape.oct(ctx, x, y, r, col, null); ctx.globalAlpha = 1; };
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
    // speed pad: hold to run, flick the stick up and press to leap
    const ready = pl && pl.stam > 0.05 && pl.noStamT <= 0;
    const upNow = Input.axis()[1] < -0.4;
    disc(P.dash.x, P.dash.y, P.dash.r, T.dashHeld ? 0.55 : ready ? 0.3 : 0.12, upNow ? '#8fe8d0' : '#40a0ff');
    ring(P.dash.x, P.dash.y, P.dash.r, ready ? 0.7 : 0.3, '#ffffff');
    if (pl) { ctx.globalAlpha = 0.75; Shape.arcSteps(ctx, P.dash.x, P.dash.y, P.dash.r - 4, clamp(pl.stam / pl.maxStam, 0, 1), '#bfe8ff', 12, 3); ctx.globalAlpha = 1; }
    Font.draw(ctx, upNow ? 'LEAP' : 'SPEED', P.dash.x, P.dash.y - 3, { color: ready ? '#ffffff' : '#88aabb', align: 'center', outline: '#000' });
    // brace pad, with the cooldown drawn as a wedge so the timing is readable
    {
      const bready = pl && pl.braceCd <= 0, guard = pl && pl.braceT > 0;
      disc(P.brace.x, P.brace.y, P.brace.r, guard ? 0.65 : bready ? 0.3 : 0.12, guard ? '#ffffff' : '#7fd0ff');
      ring(P.brace.x, P.brace.y, P.brace.r, bready ? 0.7 : 0.3, '#ffffff');
      if (pl && pl.braceCd > 0) {
        const f = 1 - clamp(pl.braceCd / 1.5, 0, 1);
        ctx.globalAlpha = 0.65; Shape.arcSteps(ctx, P.brace.x, P.brace.y, P.brace.r - 4, f, '#7fd0ff', 14, 3); ctx.globalAlpha = 1;
      }
      Font.draw(ctx, 'BRACE', P.brace.x, P.brace.y - 3, { color: bready ? '#ffffff' : '#88aabb', align: 'center', outline: '#000' });
    }
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
    this.drawExit(ctx);
  },
  drawScreenFx(ctx) {
    const W = G.W, H = G.H;
    ctx.drawImage(this.vignette, 0, 0);
    if (G.red > 0.01) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, `rgba(180,0,0,${Math.min(0.85, G.red).toFixed(3)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (G.white > 0.01) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, G.white).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    const P = G.player;
    if (P && !P.dead && P.hp / P.maxHp < 0.25 && G.state === 'play') { const a = 0.15 + 0.1 * Math.sin(G.t * 6); const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(120,0,0,${a.toFixed(3)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (P && !P.dead) {
      // filth stains the view green and greasy; pressure narrows it and shivers
      const tx = clamp((P.toxin || 0) / 100, 0, 1);
      if (tx > 0.12) {
        ctx.globalAlpha = (tx - 0.12) * 0.34;
        ctx.fillStyle = '#7a9a1a'; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = (tx - 0.12) * 0.5;
        // greasy motes drifting over the lens
        for (let i = 0; i < 26; i++) {
          const ph = i * 1.7 + G.t * (0.2 + (i % 5) * 0.05);
          const px2 = (i * 97 + Math.sin(ph) * 30) % W, py2 = (i * 53 + G.t * 9 + Math.cos(ph * 0.7) * 20) % H;
          ctx.fillStyle = i % 3 ? '#94b82a' : '#5a7414';
          ctx.fillRect(Math.round(px2), Math.round(py2), 2 + (i % 2), 1 + (i % 2));
        }
        ctx.globalAlpha = 1;
      }
      const cr = clamp((P.crush || 0) / 100, 0, 1);
      if (cr > 0.1) {
        const k = (cr - 0.1) / 0.9, pulse = 0.5 + 0.5 * Math.sin(G.t * (3 + k * 6));
        const g2 = ctx.createRadialGradient(W / 2, H / 2, H * (0.52 - k * 0.3), W / 2, H / 2, H * 0.9);
        g2.addColorStop(0, 'rgba(4,14,24,0)');
        g2.addColorStop(1, `rgba(4,14,24,${(0.35 + k * 0.5 * pulse).toFixed(3)})`);
        ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
        if (k > 0.5) { ctx.globalAlpha = (k - 0.5) * 0.5 * pulse; ctx.fillStyle = '#8cd8ff'; for (let i = 0; i < 5; i++) ctx.fillRect(0, ((i * 71 + G.t * 130) % H) | 0, W, 1); ctx.globalAlpha = 1; }
      }
    }
  },
};
