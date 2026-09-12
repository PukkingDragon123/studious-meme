'use strict';
// ---------------------------------------------------------------------------
// THE FIRST HOUR.
//
// A new save owns nothing: no animal, no colour, no map but the one outside
// the door. So the first thing that happens is that Doc walks you through
// making a crocodile, and until it is made there is nothing else to press.
//
// This is not the optional course he teaches later. It is a rail: each step
// names one control, lights it, and refuses the others until you use it. Five
// steps and you are in the water.
// ---------------------------------------------------------------------------
const TUTOR_STEPS = [
  { id: 'tohabitat', room: 'title', icon: 'egg',
    line: 'EVERY TANK IN HERE IS EMPTY.', hint: 'OPEN THE HABITAT' },
  { id: 'hatch', room: 'habitat', icon: 'egg',
    line: 'PICK A STOCK. THE FIRST ONE IS ON THE PROJECT.', hint: 'GROW IT' },
  { id: 'feed', room: 'habitat', icon: 'meat',
    line: 'IT IS ALIVE, AND IT IS SMALL.', hint: 'FEED IT' },
  { id: 'release', room: 'habitat', icon: 'star',
    line: 'BIGGER. IT IS READY TO GO OUT.', hint: 'RELEASE IT' },
  { id: 'site', room: 'stages', icon: 'globe',
    line: 'YOUR CALL WHERE IT GOES IN THE WATER.', hint: 'PICK A SITE AND RELEASE' },
];

const Tutor = {
  // ---------- state ----------
  on() { return !!(G.save && !G.save.tutDone); },
  index() { return clamp((G.save && G.save.tutStep) || 0, 0, TUTOR_STEPS.length - 1); },
  step() { return this.on() ? TUTOR_STEPS[this.index()] : null; },
  at(id) { const s = this.step(); return !!s && s.id === id; },
  // A save that already has animals in it, or runs on the clock, has plainly
  // been played before: it does not get put back through the induction.
  adopt() {
    const s = G.save; if (!s || s.tutDone) return;
    const lived = (s.runs || 0) > 0 || (Array.isArray(s.habitat) && s.habitat.some(c => c)) || (Array.isArray(s.research) && s.research.length);
    if (lived) { s.tutDone = true; s.tutStep = TUTOR_STEPS.length - 1; }
  },
  // the step is done; move on, and finish the whole thing at the end
  pass(id) {
    if (!this.at(id)) return false;
    const n = this.index() + 1;
    if (n >= TUTOR_STEPS.length) { G.save.tutDone = true; G.save.tutStep = n - 1; }
    else G.save.tutStep = n;
    G.storeSave();
    if (typeof SFX !== 'undefined' && SFX.ui) SFX.ui();
    this.flash = 0.5;
    return true;
  },
  flash: 0,
  update(raw) { if (this.flash > 0) this.flash -= raw; },
  // ---------- the rail ----------
  // Each of these answers "may I press that yet". Anything not named by the
  // step you are on says no, which is what makes it a tutorial and not a hint.
  // which door the induction will let you through right now
  wantStation() { return this.on() ? 'habitat' : null; },
  allowStation(id) { const w = this.on() && this.wantStation(); return !w || id === w; },
  allowHabRow(kind) {
    if (!this.on()) return true;
    if (this.at('feed')) return kind === 'feed';
    if (this.at('release')) return kind === 'go';
    return false;
  },
  // an empty enclosure has its own hatch panel; during the induction the only
  // way to make an animal is the bay, or the rail has a hole in it
  allowHabHatch() { return !this.on() || this.at('hatch'); },
  // ---------- the dialogue box ----------
  barRect() { return { x: 0, y: G.H - 42, w: G.W, h: 42 }; },
  // a bouncing chevron over whatever you are supposed to press
  point(ctx, r) {
    if (!this.on() || !r) return;
    const t = G.menuT, bob = Math.round(Math.abs(Math.sin(t * 4)) * 3);
    const x = Math.round(r.x + r.w / 2), y = Math.round(r.y) - 6 - bob;
    // a target right up against the top of the screen has nowhere to hang an
    // arrow; the pulsing frame says it well enough on its own
    if (r.y >= 28) {
      ctx.fillStyle = '#ffe060';
      for (let i = 0; i < 5; i++) { ctx.fillRect(x - 4 + i, y - i, 2, 1); ctx.fillRect(x + 4 - i, y - i, 2, 1); }
      ctx.fillRect(x - 1, y - 8, 2, 6);
    }
    // and a frame round the target, so there is no doubt which thing it is
    ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.25;
    UI.bracket(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, '#ffe060', 8);
    ctx.globalAlpha = 1;
  },
  // his head, in a box, at the left of the bar
  portrait(ctx, x, y) {
    const t = G.menuT;
    const SKIN = '#4f6a45', SKIN_D = '#33472c', SKIN_L = '#6d8a5c';
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + a), Math.round(y + b), Math.max(1, w), Math.max(1, h)); };
    ctx.fillStyle = '#0a1c1a'; ctx.fillRect(x - 15, y - 15, 30, 30);
    ctx.fillStyle = '#16302c'; ctx.fillRect(x - 15, y - 15, 30, 1);
    px(-9, -9, 15, 11, SKIN);              // skull
    px(-9, -9, 15, 3, SKIN_L);
    px(4, -5, 11, 6, SKIN);                // snout
    px(4, -5, 11, 2, SKIN_L);
    px(4, 1, 11, 2, SKIN_D);
    for (let i = 0; i < 5; i++) px(5 + i * 2, 1, 1, 2, '#e8ecd8');   // teeth
    px(-9, 2, 13, 3, SKIN_D);              // jaw
    // the working eye, with a blink on a slow clock
    const shut = (t % 4.4) > 4.15;
    px(-4, -6, 5, shut ? 1 : 4, shut ? SKIN_D : '#0e1a10');
    if (!shut) { px(-3, -5, 2, 2, '#c8e860'); px(-3, -5, 1, 1, '#f0ffd0'); }
    px(-10, -8, 3, 4, SKIN_D);             // brow
    // the glasses he has never once looked through
    ctx.fillStyle = '#d8c840';
    ctx.fillRect(Math.round(x - 10), Math.round(y - 12), 13, 1);
    ctx.fillRect(Math.round(x - 10), Math.round(y - 14), 4, 3);
    ctx.fillRect(Math.round(x - 4), Math.round(y - 14), 4, 3);
    UI.bracket(ctx, x - 15, y - 15, 30, 30, 'rgba(122,255,218,0.45)', 7);
  },
  // the bar itself: who is talking, what they said, and what to do about it
  draw(ctx) {
    if (!this.on()) return;
    const s = this.step(); if (!s) return;
    const W = G.W, t = G.menuT, r = this.barRect();
    ctx.fillStyle = '#04100f'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#0a1f1d'; ctx.fillRect(r.x, r.y + 2, r.w, r.h - 2);
    ctx.fillStyle = this.flash > 0 ? '#ffe060' : '#7affda'; ctx.fillRect(r.x, r.y, r.w, 2);
    // a soft wash off the top edge so the bar sits in the room, not on it
    const g = ctx.createLinearGradient(0, r.y - 16, 0, r.y);
    g.addColorStop(0, 'rgba(4,16,15,0)'); g.addColorStop(1, 'rgba(4,16,15,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, r.y - 16, W, 16);
    this.portrait(ctx, 26, r.y + 21);
    const tx = 50;
    Font.draw(ctx, 'DOC CROC', tx, r.y + 6, { color: '#4f9f90' });
    Font.draw(ctx, s.line, tx, r.y + 17, { color: '#e2f0e8' });
    // the instruction, lit, with his icon on it
    Doc.icon(ctx, s.icon, tx + 6, r.y + 32, '#ffe060');
    Font.draw(ctx, s.hint, tx + 16, r.y + 29, { color: '#ffe060' });
    // six pips: how far along the induction you are
    const n = TUTOR_STEPS.length, i = this.index();
    for (let q = 0; q < n; q++) {
      ctx.fillStyle = q < i ? '#3fd0a8' : q === i ? (Math.floor(t * 3) % 2 ? '#ffe060' : '#8a7a20') : '#1c2e2c';
      ctx.fillRect(W - 14 - (n - q) * 9, r.y + 18, 6, 6);
    }
    Font.draw(ctx, (i + 1) + '/' + n, W - 14, r.y + 6, { color: '#4f7f74', align: 'right' });
  },
};
