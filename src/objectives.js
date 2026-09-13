'use strict';
// ---------------------------------------------------------------------------
// WHAT YOU ARE DOING HERE.
//
// With nobody left to explain the game, the game has to say what it wants. A
// run opens on a card: the place, and three things to do in it. The card slides
// away after a few seconds and the same three lines live in the corner of the
// screen for the rest of the run, ticking themselves off as you do them.
//
// They are deliberately not a tutorial. They tell you the objective, never the
// button — what happens in between is still yours to work out.
// ---------------------------------------------------------------------------
const Objectives = {
  list: [], cardT: 0, stage: null, tickT: 0,

  begin(stage) {
    this.stage = stage || null;
    this.cardT = 6.5; this.tickT = 0;
    const P = G.player;
    const art = stage ? ARTIFACTS.find(a => a.stage === stage.id) : null;
    const grown = (P ? P.tier : 0) + 2;
    this.list = [
      {
        id: 'order', label: 'ORDER',
        text: () => { const h = Missions.hud(); return h ? h.text : 'ORDER COMPLETE'; },
        frac: () => { const m = G.mission; return m ? (m.done ? 1 : clamp(m.n / m.target, 0, 1)) : 1; },
        done: () => !!(G.mission && G.mission.done),
      },
      {
        id: 'relic', label: 'RELIC',
        text: () => (art ? (Missions.has(art.id) ? art.name : 'FINISH THE ORDER AND TAKE ' + art.name) : 'NOTHING TO TAKE HERE'),
        short: () => (art ? (Missions.has(art.id) ? art.name : 'TAKE THE RELIC') : 'NOTHING HERE'),
        frac: () => (art ? (Missions.has(art.id) ? 1 : (G.mission && G.mission.done ? 0.6 : 0.15)) : 1),
        done: () => !art || Missions.has(art.id),
      },
      {
        id: 'grow', label: 'GROW',
        text: () => 'REACH ' + (TIERS[Math.min(grown, TIERS.length - 1)] || TIERS[TIERS.length - 1]).name,
        frac: () => clamp((G.player.tier) / Math.max(1, grown), 0, 1),
        done: () => G.player.tier >= grown,
      },
    ];
    // the system has a fourth thing to say, and it is not optional
    if (false) {
      this.list.push({
        id: 'out', label: 'OUT',
        text: () => 'THERE IS NO WAY OUT OF HERE',
        short: () => 'NO WAY OUT',
        frac: () => 0, done: () => false, grim: true,
      });
    }
  },

  update(dt) { if (typeof Opening !== 'undefined' && Opening.scripted && Opening.scripted()) return; if (this.cardT > 0) this.cardT -= dt; this.tickT += dt; },

  // ---- the card a run opens on ------------------------------------------
  drawCard(ctx) {
    if (this.cardT <= 0 || !this.stage || (typeof Opening !== 'undefined' && Opening.scripted && Opening.scripted())) return 0;
    const W = G.W, H = G.H, st = this.stage;
    const k = clamp(Math.min(this.cardT * 1.6, (6.5 - this.cardT) * 2.6), 0, 1);
    const w = 236, h = 30 + this.list.length * 15;
    const x = Math.round(12 + (1 - k) * -24), y = Math.round(H / 2 - h / 2);
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(4,10,12,0.86)'; ctx.fillRect(x, y, w, h);
    const col = (ZONE_BY_ID[st.zone] || ZONES[0]).col;
    ctx.fillStyle = col; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y, 2, h);
    Font.draw(ctx, st.name, x + 8, y + 7, { color: '#eaf6ee' });
    Font.draw(ctx, st.sub, x + 8, y + 17, { color: '#5f8f84' });
    let ly = y + 30;
    for (const o of this.list) {
      const done = o.done();
      this.box(ctx, x + 9, ly + 1, done, o.grim);
      Font.draw(ctx, o.text(), x + 20, ly, { color: o.grim ? '#ff8c40' : done ? '#6ad040' : '#cfe8e0' });
      ly += 15;
    }
    ctx.globalAlpha = 1;
    return h;
  },
  // a checkbox: empty, ticked, or crossed through for the one you cannot do
  box(ctx, x, y, done, grim) {
    ctx.fillStyle = grim ? '#3a1a12' : done ? '#16381a' : '#12201e';
    ctx.fillRect(x, y, 7, 7);
    ctx.fillStyle = grim ? '#ff8c40' : done ? '#6ad040' : '#3f6f66';
    ctx.fillRect(x, y, 7, 1); ctx.fillRect(x, y + 6, 7, 1); ctx.fillRect(x, y, 1, 7); ctx.fillRect(x + 6, y, 1, 7);
    if (done) { ctx.fillStyle = '#8ef0a0'; ctx.fillRect(x + 2, y + 4, 1, 1); ctx.fillRect(x + 3, y + 3, 1, 2); ctx.fillRect(x + 4, y + 2, 1, 2); }
    else if (grim) { ctx.fillStyle = '#ff8c40'; ctx.fillRect(x + 2, y + 3, 4, 1); }
  },

  // ---- the same list, small, for the rest of the run --------------------
  drawHud(ctx, y) {
    if (!this.list.length) return y;
    // nothing on the list is anything you can do while you are in the pipe
    if (typeof Opening !== 'undefined' && Opening.scripted && Opening.scripted()) return y;
    // while the card is up it is saying all of this already
    if (this.cardT > 0.6) return y;
    const W = 158;
    let ly = y;
    for (const o of this.list) {
      const done = o.done(), f = clamp(o.frac(), 0, 1);
      ctx.fillStyle = 'rgba(6,14,12,0.55)'; ctx.fillRect(8, ly - 2, W, 13);
      ctx.fillStyle = o.grim ? '#ff8c40' : done ? '#6ad040' : '#8ce8a0'; ctx.fillRect(8, ly - 2, 2, 13);
      this.box(ctx, 13, ly, done, o.grim);
      const flash = G.mission && G.mission.flashT > 0 && o.id === 'order' && Math.floor(this.tickT * 12) % 2;
      let txt = (o.short ? o.short() : o.text());
      if (Font.width(txt, 1) > W - 28) txt = txt.slice(0, Math.max(4, Math.floor((W - 28) / 4))) + '.';
      Font.draw(ctx, txt, 24, ly, { color: flash ? '#ffffff' : o.grim ? '#ff8c40' : done ? '#6ad040' : '#cfe8e0' });
      ctx.fillStyle = '#16241f'; ctx.fillRect(10, ly + 9, W - 4, 1);
      ctx.fillStyle = o.grim ? '#5a3018' : done ? '#6ad040' : '#8ce8a0'; ctx.fillRect(10, ly + 9, Math.round((W - 4) * f), 1);
      ly += 15;
    }
    return ly;
  },
};
