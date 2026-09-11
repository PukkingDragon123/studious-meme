'use strict';
// ---------------------------------------------------------------------------
// DOC CROC.
//
// The project's lead herpetologist spliced himself years ago and it took. He
// walks his own lab floor in a coat that does not fit any more, and he teaches
// you the building one job at a time.
//
// He is entirely optional. Every lesson is a thing you were going to do anyway;
// doing it pays you, and if you would rather just play you can send him away
// and he stays away.
// ---------------------------------------------------------------------------
const DOC_LESSONS = [
  { id: 'l.feed', ev: 'feed', pay: 6, icon: 'meat', line: 'FEED ONE' },
  { id: 'l.fund', ev: 'fund', pay: 8, icon: 'flask', line: 'FUND A STEP' },
  { id: 'l.point', ev: 'point', pay: 8, icon: 'star', line: 'SPEND A POINT' },
  { id: 'l.hatch', ev: 'hatch', pay: 10, icon: 'egg', line: 'HATCH ANOTHER' },
  { id: 'l.vial', ev: 'vial', pay: 8, icon: 'vial', line: 'LOAD A TUBE' },
  { id: 'l.gene', ev: 'gene', pay: 10, icon: 'hex', line: 'SPLICE IN THE FIELD' },
  { id: 'l.relic', ev: 'relic', pay: 15, icon: 'relic', line: 'BRING A RELIC BACK' },
  { id: 'l.zone', ev: 'zone', pay: 12, icon: 'globe', line: 'SURVEY A ZONE' },
];

const Doc = {
  // ---------- state ----------
  save() {
    const s = G.save; if (!s) return { done: [], off: false };
    if (!s.doc) s.doc = { done: [], off: false };
    if (!Array.isArray(s.doc.done)) s.doc.done = [];
    return s.doc;
  },
  off() { return !!this.save().off; },
  dismiss() { this.save().off = true; G.storeSave(); },
  recall() { this.save().off = false; G.storeSave(); },
  done(id) { return this.save().done.indexOf(id) >= 0; },
  // the lesson he is on: the first one you have not done
  current() { if (this.off()) return null; for (const l of DOC_LESSONS) if (!this.done(l.id)) return l; return null; },
  progress() { const d = this.save(); return { got: d.done.length, tot: DOC_LESSONS.length }; },
  // Something happened. If it is what he was waiting for, pay up and move on.
  note(ev) {
    const l = this.current();
    if (!l || l.ev !== ev) return false;
    this.save().done.push(l.id);
    Research.addData(l.pay);
    this.cheer = 2.6; this.cheerPay = l.pay;
    G.storeSave();
    if (typeof SFX !== 'undefined' && SFX.levelup) SFX.levelup();
    return true;
  },
  cheer: 0, cheerPay: 0, t: 0, x: 196, dir: 1, waitT: 0, blink: 0,
  update(raw) {
    this.t += raw;
    if (this.cheer > 0) this.cheer -= raw;
    if (this.blink > 0) this.blink -= raw; else if (chance(raw * 0.4)) this.blink = 0.14;
    // he paces the middle of the floor, stopping to look at things
    if (this.waitT > 0) { this.waitT -= raw; return; }
    this.x += this.dir * raw * 16;
    if (this.x > 300) { this.x = 300; this.dir = -1; this.waitT = rand(1.4, 3.4); }
    if (this.x < 140) { this.x = 140; this.dir = 1; this.waitT = rand(1.4, 3.4); }
  },
  // ---------- the animal himself ----------
  // A crocodile's head and tail on a man's frame, in a lab coat that gave up.
  draw(ctx) {
    const F = LAB.FLOOR, x = Math.round(this.x), t = this.t;
    const walking = this.waitT <= 0;
    const bob = walking ? Math.round(Math.abs(Math.sin(t * 4)) * 2) : Math.round(Math.sin(t * 1.4) * 0.6);
    const y = F + 22 - bob, f = this.dir;
    const SKIN = '#4f6a45', SKIN_D = '#33472c', SKIN_L = '#6d8a5c', COAT = '#e4e8e0', COAT_D = '#b8bfb6';
    // mirroring has to flip the far edge of a rect, not just its origin, or
    // the animal comes apart when he turns round
    const px = (a, b, w, h, c) => {
      ctx.fillStyle = c;
      const ax = f > 0 ? x + a : x - a - w;
      ctx.fillRect(Math.round(ax), Math.round(y + b), Math.max(1, w), Math.max(1, h));
    };
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#0a1114'; ctx.fillRect(x - 10, F + 20, 20, 3); ctx.globalAlpha = 1;
    // tail, swinging with the walk — the coat was never cut for it
    const sw = Math.sin(t * (walking ? 4 : 1.1)) * 3;
    for (let i = 0; i < 7; i++) {
      const tw = 5 - i * 0.6;
      px(-7 - i * 3, -8 + i * 1.4 + sw * (i / 7), tw, tw, i % 2 ? SKIN : SKIN_D);
    }
    // legs
    const st = walking ? Math.sin(t * 8) * 3 : 0;
    px(-5 + st, -10, 4, 10, '#2f3a44'); px(1 - st, -10, 4, 10, '#3a4550');
    px(-6 + st, -1, 6, 3, '#20262c'); px(0 - st, -1, 6, 3, '#20262c');
    // body in the coat
    px(-6, -28, 12, 19, COAT);
    px(-6, -28, 3, 19, COAT_D);
    px(-1, -28, 1, 19, COAT_D);
    // the coat does not close over the chest
    px(-3, -26, 5, 9, SKIN_L);
    for (let i = 0; i < 3; i++) px(-3, -25 + i * 3, 5, 1, SKIN_D);
    // arms: one holding a slate
    px(-9, -26, 3, 12, COAT); px(6, -26, 3, 11, COAT);
    px(-9, -15, 3, 3, SKIN); px(6, -16, 3, 3, SKIN);
    px(7, -22, 7, 9, '#2a3438'); px(8, -21, 5, 7, this.cheer > 0 ? '#8ce8a0' : '#3fd0a8');
    for (let i = 0; i < 3; i++) px(9, -20 + i * 2, 3 - i, 1, '#0d1a18');
    // neck and the head: long snout, brow ridge, a working eye
    px(-2, -33, 6, 6, SKIN);
    px(-4, -40, 10, 8, SKIN);
    px(-4, -40, 10, 2, SKIN_L);
    px(4, -38, 13, 5, SKIN);           // snout
    px(4, -38, 13, 1, SKIN_L);
    px(4, -34, 13, 1, SKIN_D);
    // teeth along the jaw line
    ctx.fillStyle = '#f2f4e8';
    for (let i = 0; i < 6; i++) px(5 + i * 2, -34, 1, 2, '#f2f4e8');
    // nostril, brow, eye
    px(15, -37, 2, 2, SKIN_D);
    px(1, -41, 5, 2, SKIN_D);
    if (this.blink > 0) px(2, -39, 3, 1, SKIN_D);
    else { px(2, -40, 3, 3, '#f0e8c0'); px(3, -39, 1, 2, '#101a10'); }
    // scutes down the skull
    for (let i = 0; i < 4; i++) px(-3 + i * 3, -41, 2, 2, SKIN_D);
    // round spectacles, pushed up onto the brow where they are no use
    ctx.strokeStyle = '#c8b070'; ctx.lineWidth = 1;
    Shape.ring(ctx, x + f * 4, y - 43, 3, 1, '#c8b070');
    Shape.ring(ctx, x + f * 10, y - 43, 3, 1, '#c8b070');
    px(5, -44, 3, 1, '#c8b070');
    // an ID badge on the coat
    px(-5, -20, 4, 5, '#d8d0a0'); px(-5, -20, 4, 1, '#8a8260');
  },
  // ---------- the speech bubble ----------
  // An icon and two or three words. He is a crocodile; he is not verbose.
  drawBubble(ctx) {
    const l = this.current();
    if (this.off() || (!l && this.cheer <= 0)) return;
    const x = Math.round(this.x), F = LAB.FLOOR;
    const cheering = this.cheer > 0;
    const txt = cheering ? '+' + this.cheerPay : (l ? l.line : '');
    const w = Math.max(58, Font.width(txt, 1) + 34), h = 24;
    const bx = clamp(x - w / 2, 6, G.W - w - 6), by = F - 78;
    ctx.fillStyle = 'rgba(6,16,16,0.92)'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = cheering ? '#ffe060' : '#7affda'; ctx.fillRect(bx, by, w, 2);
    // the tail of the bubble, pointing at him
    ctx.fillStyle = 'rgba(6,16,16,0.92)';
    for (let i = 0; i < 5; i++) ctx.fillRect(clamp(x - 3 + i, bx, bx + w - 1), by + h + i, 5 - i, 1);
    this.icon(ctx, cheering ? 'tick' : (l ? l.icon : 'tick'), bx + 13, by + 12, cheering ? '#ffe060' : '#7affda');
    Font.draw(ctx, txt, bx + 25, by + 9, { color: cheering ? '#ffe060' : '#d8e8de' });
    // how far through the course you are, as pips
    const p = this.progress();
    for (let i = 0; i < p.tot; i++) { ctx.fillStyle = i < p.got ? '#3fd0a8' : '#1c2e2c'; ctx.fillRect(bx + 4 + i * 5, by + h - 5, 3, 3); }
  },
  // tiny pictograms, so a lesson is a picture with a caption rather than prose
  icon(ctx, id, x, y, col) {
    const px = (a, b, w, h, c) => { ctx.fillStyle = c || col; ctx.fillRect(Math.round(x + a), Math.round(y + b), Math.max(1, w), Math.max(1, h)); };
    switch (id) {
      case 'meat': for (let dy = -4; dy <= 4; dy++) { const w = 5 - Math.abs(dy) * 0.4; px(-w, dy, w * 2, 1, '#c0443a'); } px(-3, -3, 4, 2, '#e0685a'); px(1, 1, 4, 2, '#e8dcc0'); break;
      case 'flask': px(-1, -5, 3, 3, col); px(-4, -2, 9, 7, col); px(-2, 0, 5, 4, '#0d1a18'); break;
      case 'star': for (let i = 0; i < 5; i++) { px(-1, -5 + i, 3, 1, col); } px(-5, -1, 11, 3, col); break;
      case 'egg': for (let dy = -5; dy <= 4; dy++) { const w = 4 - Math.abs(dy + 1) * 0.35; px(-w, dy, w * 2, 1, col); } px(-2, -2, 4, 1, '#0d1a18'); break;
      case 'vial': px(-3, -6, 7, 2, col); px(-2, -4, 5, 9, col); px(-1, -1, 3, 5, '#0d1a18'); break;
      case 'hex': for (let dy = -4; dy <= 4; dy++) { const w = 4 - Math.abs(dy) * 0.5; px(-w, dy, w * 2, 1, col); } px(-2, -2, 4, 4, '#0d1a18'); break;
      case 'relic': px(-1, -6, 3, 12, col); px(-4, -3, 9, 3, col); px(-3, 3, 7, 2, col); break;
      case 'globe': Shape.ring(ctx, x, y, 5, 1, col); px(-5, -1, 11, 1, col); px(-1, -5, 2, 11, col); break;
      default: px(-5, 0, 3, 3, col); px(-3, 2, 3, 3, col); px(-1, 0, 3, 3, col); px(1, -2, 3, 3, col); px(3, -4, 3, 3, col); break;
    }
  },
  // the hit box for sending him away, or calling him back
  bubbleRect() {
    const l = this.current();
    if (!l) return null;
    const w = Math.max(58, Font.width(l.line, 1) + 34);
    return { x: clamp(Math.round(this.x) - w / 2, 6, G.W - w - 6), y: LAB.FLOOR - 78, w, h: 24 };
  },
};
