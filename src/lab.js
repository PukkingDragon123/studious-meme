'use strict';
// ---------------------------------------------------------------------------
// THE SCIENCE CENTER. The front end is not a title card over a screenshot any
// more, it is a room: a working genetics lab drawn in side elevation, with
// staff walking it, machines running, specimen tanks along the walls and the
// embryo you are about to become suspended in the middle of it.
//
// Everything is procedural and animated. The menu is furniture — you walk the
// camera along the room and the consoles are the buttons.
// ---------------------------------------------------------------------------
const LAB = {
  FLOOR: 300,        // top of the walk surface
  CEIL: 26,
  W: 640, H: 360,
};

const Lab = {
  t: 0, staff: [], sel: 0, ready: false, camX: 0, hint: 0,
  // the room's interactive stations, laid out left to right
  stations: [
    { id: 'create', x: 320, label: 'CREATE' },
    { id: 'research', x: 92, label: 'RESEARCH' },
  ],
  init() {
    this.t = 0; this.staff = []; this.ready = true;
    // Four staff on their own beats: two pacing the floor, one at the left
    // console, one at the right bench. Rigged humans, so they walk properly.
    const rig = typeof SPECIES !== 'undefined' && SPECIES.scientist ? rigOf(SPECIES.scientist, 0) : null;
    const spots = [
      { x: 150, x0: 96, x1: 268, mode: 'walk', spd: 22, v: 1 },
      { x: 470, x0: 386, x1: 566, mode: 'walk', spd: 17, v: 3 },
      { x: 96, x0: 96, x1: 96, mode: 'type', spd: 0, v: 5, face: 1 },
      { x: 566, x0: 566, x1: 566, mode: 'bench', spd: 0, v: 2, face: -1 },
      { x: 250, x0: 210, x1: 300, mode: 'clip', spd: 11, v: 4, face: -1 },
    ];
    for (const s of spots) {
      this.staff.push({
        x: s.x, x0: s.x0, x1: s.x1, mode: s.mode, spd: s.spd, dir: chance(0.5) ? 1 : -1,
        rig: typeof SPECIES !== 'undefined' && SPECIES.scientist ? rigOf(SPECIES.scientist, s.v) : rig,
        phase: rand(TAU), face: s.face || 1, waitT: rand(0, 3), anim: { phase: rand(TAU), speed: 0, mode: 'stand' },
      });
    }
  },
  update(raw) {
    if (!this.ready) this.init();
    this.t += raw;
    if (this.hint > 0) this.hint -= raw;
    if (this._spec) CrocView.update(this._spec, raw, 9.5);
    for (const s of this.staff) {
      if (s.mode === 'walk' || s.mode === 'clip') {
        if (s.waitT > 0) { s.waitT -= raw; s.anim.speed = 0; }
        else {
          s.x += s.dir * s.spd * raw;
          if (s.x > s.x1) { s.x = s.x1; s.dir = -1; s.waitT = rand(1.4, 4); }
          if (s.x < s.x0) { s.x = s.x0; s.dir = 1; s.waitT = rand(1.4, 4); }
          s.face = s.dir;
          s.anim.speed = 1;
        }
        s.anim.phase += raw * (s.anim.speed ? 7 : 1.2);
        s.anim.mode = 'walk';
      } else {
        // stationary: small idle sway, hands up at the console
        s.anim.speed = 0; s.anim.phase += raw * 2.2;
        s.anim.mode = 'stand';
        s.anim.aim = s.mode === 'type' ? (Math.sin(this.t * 3 + s.phase) > -0.3) : false;
      }
    }
  },

  // ---------------------------------------------------------------------------
  // painting
  // ---------------------------------------------------------------------------
  draw(ctx) {
    const W = LAB.W, H = LAB.H, F = LAB.FLOOR, t = this.t;
    this.backWall(ctx, t);
    this.pipes(ctx, t);
    this.leftBank(ctx, t);
    this.rightBank(ctx, t);
    this.tank(ctx, W / 2, t);           // the centrepiece
    this.floor(ctx, t);
    this.acidBath(ctx, t);              // cut into the floor, so painted over it
    // staff walk between the machines and the railing
    for (const s of this.staff) this.drawStaff(ctx, s);
    this.acidFx(ctx, t);
    this.foreground(ctx, t);
    this.lighting(ctx, t);
  },

  // --- back wall: panel tiles, seams, grime, signage
  backWall(ctx, t) {
    const W = LAB.W, F = LAB.FLOOR;
    ctx.fillStyle = '#1b2b30'; ctx.fillRect(0, 0, W, F);
    // panel grid, with a lit top edge on each tile
    for (let y = LAB.CEIL; y < F; y += 24) {
      for (let x = 0; x < W; x += 32) {
        const n = ihash(x * 7 + y, 11);
        ctx.fillStyle = n > 0.7 ? '#213338' : n > 0.35 ? '#1e2f35' : '#1a2a2f';
        ctx.fillRect(x, y, 31, 23);
        ctx.fillStyle = 'rgba(150,200,205,0.06)'; ctx.fillRect(x, y, 31, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x, y + 22, 31, 1);
        // bolt heads
        if (n > 0.55) { ctx.fillStyle = '#2c4046'; ctx.fillRect(x + 2, y + 2, 2, 2); ctx.fillRect(x + 27, y + 2, 2, 2); }
      }
    }
    // ceiling: cable tray, ducting, strip lights
    ctx.fillStyle = '#141f23'; ctx.fillRect(0, 0, W, LAB.CEIL);
    ctx.fillStyle = '#1c2b30'; ctx.fillRect(0, LAB.CEIL - 4, W, 4);
    for (let x = 6; x < W; x += 18) { ctx.fillStyle = '#26383d'; ctx.fillRect(x, 4, 10, 3); ctx.fillRect(x + 2, 7, 6, 2); }
    for (let x = 40; x < W; x += 128) {
      // fluorescent strip, one of them failing
      const bad = (x / 128) % 3 === 1;
      const on = bad ? (Math.sin(t * 26 + x) > -0.55 ? 1 : 0.12) : 1;
      ctx.fillStyle = '#2e4247'; ctx.fillRect(x - 3, LAB.CEIL - 1, 66, 5);
      ctx.globalAlpha = on; ctx.fillStyle = '#e8fbff'; ctx.fillRect(x, LAB.CEIL + 1, 60, 3);
      ctx.globalAlpha = on * 0.16;
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#cfeef4'; ctx.fillRect(x - i * 3, LAB.CEIL + 4 + i * 5, 60 + i * 6, 5); }
      ctx.globalAlpha = 1;
    }
    // signage: hazard stencils and a room number, painted on the wall
    this.stencil(ctx, 58, 104, 'BIO-4', '#c8a020');
    this.stencil(ctx, 420, 100, 'CONTAINMENT', '#b04030');
    ctx.fillStyle = 'rgba(200,160,32,0.5)';
    for (let i = 0; i < 6; i++) ctx.fillRect(180 + i * 7, 80, 4, 3);
    // grime running down from the ceiling
    ctx.globalAlpha = 0.14; ctx.fillStyle = '#0b1417';
    for (let x = 0; x < W; x += 7) { const h = ihash(x, 3) * 46; ctx.fillRect(x, LAB.CEIL, 3, h); }
    ctx.globalAlpha = 1;
  },
  stencil(ctx, x, y, txt, col) {
    ctx.globalAlpha = 0.45;
    Font.draw(ctx, txt, x, y, { color: col, scale: 2 });
    ctx.globalAlpha = 0.18; ctx.fillStyle = col;
    ctx.fillRect(x - 3, y - 4, Font.width(txt, 2) + 6, 1);
    ctx.fillRect(x - 3, y + 15, Font.width(txt, 2) + 6, 1);
    ctx.globalAlpha = 1;
  },

  // --- service pipes crossing the room, with valves and a steam vent
  pipes(ctx, t) {
    const W = LAB.W;
    const run = (y, h, c1, c2) => {
      ctx.fillStyle = c1; ctx.fillRect(0, y, W, h);
      ctx.fillStyle = c2; ctx.fillRect(0, y, W, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, y + h - 1, W, 1);
      for (let x = 20; x < W; x += 74) { ctx.fillStyle = c2; ctx.fillRect(x, y - 1, 5, h + 2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 4, y - 1, 1, h + 2); }
    };
    run(34, 7, '#3e5257', '#546d73');
    run(46, 5, '#4a3a2c', '#63503c');
    // a valve wheel and a dripping joint
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(150, 44, 4, 9);
    Shape.ring(ctx, 152, 42, 6, 2, '#8a5a30');
    if (Math.sin(t * 1.4) > 0.9) { ctx.fillStyle = '#8fd8d0'; ctx.fillRect(152, 54 + ((t * 60) % 40), 1, 3); }
    // steam from a wall vent, drifting up
    ctx.fillStyle = '#26383d'; ctx.fillRect(596, 56, 30, 16);
    for (let i = 0; i < 5; i++) ctx.fillRect(598, 58 + i * 3, 26, 1);
    ctx.globalAlpha = 0.10; ctx.fillStyle = '#dff4f8';
    for (let i = 0; i < 9; i++) {
      const p = (t * 0.5 + i * 0.11) % 1;
      Shape.puff(ctx, 594 - p * 44, 62 - p * 34 + Math.sin(t + i) * 3, 4 + p * 9, '#dff4f8', i * 13);
    }
    ctx.globalAlpha = 1;
  },

  // --- left: server stack, DNA sequencer, wall of monitors
  leftBank(ctx, t) {
    const F = LAB.FLOOR;
    // server racks
    for (let r = 0; r < 2; r++) {
      const x = 8 + r * 44, y = F - 96, w = 38, h = 96;
      ctx.fillStyle = '#151f23'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#203136'; ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + w - 2, y, 2, h);
      for (let b = 0; b < 11; b++) {
        const by = y + 5 + b * 8;
        ctx.fillStyle = '#1b282d'; ctx.fillRect(x + 3, by, w - 6, 6);
        ctx.fillStyle = '#0e1518'; ctx.fillRect(x + 4, by + 1, w - 8, 4);
        // activity lights, blinking on their own clocks
        for (let l = 0; l < 4; l++) {
          const on = Math.sin(t * (3 + l * 2.1 + b) + b * 1.7 + r) > 0.1;
          ctx.fillStyle = on ? (l === 0 ? '#60ff90' : l === 3 ? '#ffb040' : '#40d0ff') : '#16232a';
          ctx.fillRect(x + 6 + l * 4, by + 2, 2, 2);
        }
      }
    }
    // the sequencer: a lit readout with a scrolling base-pair trace
    const sx = 8, sy = F - 150, sw = 82, sh = 46;
    ctx.fillStyle = '#101a1e'; ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = '#25383e'; ctx.fillRect(sx, sy, sw, 2); ctx.fillRect(sx, sy + sh - 2, sw, 2);
    ctx.fillStyle = '#04120e'; ctx.fillRect(sx + 3, sy + 4, sw - 6, sh - 10);
    // four base lanes scrolling right to left
    const cols = ['#40f0a0', '#ff6060', '#50a0ff', '#ffd040'];
    for (let lane = 0; lane < 4; lane++) {
      const ly = sy + 7 + lane * 8;
      ctx.fillStyle = 'rgba(120,200,180,0.12)'; ctx.fillRect(sx + 4, ly + 3, sw - 8, 1);
      for (let i = 0; i < 26; i++) {
        const px = sx + 5 + ((i * 3 - t * 22) % (sw - 10) + (sw - 10)) % (sw - 10);
        if (ihash(i * 4 + lane, 91) > 0.62) { ctx.fillStyle = cols[lane]; ctx.fillRect(Math.round(px), ly, 2, 4); }
      }
    }
    Font.draw(ctx, 'SEQ', sx + 4, sy + sh - 8, { color: '#3f7f74' });
    // three wall monitors above, one showing a rotating helix
    for (let m = 0; m < 3; m++) {
      const mx = 100 + m * 0, my = 0;
    }
    this.monitor(ctx, 104, F - 176, 62, 42, t, m => {
      // rotating double helix
      const cx = 104 + 31, top = F - 176 + 6;
      for (let i = 0; i < 16; i++) {
        const a = t * 1.6 + i * 0.42, y = top + i * 1.9;
        const x1 = cx + Math.sin(a) * 16, x2 = cx + Math.sin(a + Math.PI) * 16;
        const d1 = (Math.cos(a) + 1) * 0.5;
        ctx.globalAlpha = 0.35 + d1 * 0.6; ctx.fillStyle = '#7affda'; ctx.fillRect(Math.round(x1), Math.round(y), 2, 2);
        ctx.globalAlpha = 0.35 + (1 - d1) * 0.6; ctx.fillStyle = '#40b0ff'; ctx.fillRect(Math.round(x2), Math.round(y), 2, 2);
        if (i % 3 === 0) { ctx.globalAlpha = 0.25; ctx.fillStyle = '#cfeef4'; ctx.fillRect(Math.round(Math.min(x1, x2)), Math.round(y), Math.abs(x2 - x1), 1); }
      }
      ctx.globalAlpha = 1;
    });
    this.monitor(ctx, 104, F - 130, 62, 30, t, () => {
      // a growth curve creeping up
      const bx = 108, by = LAB.FLOOR - 104;
      ctx.fillStyle = '#1a4a3a';
      for (let i = 0; i < 54; i++) {
        const h = Math.round(2 + 18 * Math.pow(i / 54, 2.2) * (0.8 + 0.2 * Math.sin(t + i * 0.3)));
        ctx.fillRect(bx + i, by - h, 1, h);
      }
      ctx.fillStyle = '#7affda';
      for (let i = 0; i < 54; i++) {
        const h = Math.round(2 + 18 * Math.pow(i / 54, 2.2) * (0.8 + 0.2 * Math.sin(t + i * 0.3)));
        ctx.fillRect(bx + i, by - h, 1, 1);
      }
    });
  },
  monitor(ctx, x, y, w, h, t, inner) {
    ctx.fillStyle = '#0a1114'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#25383e'; ctx.fillRect(x - 2, y - 2, w + 4, 2);
    ctx.fillStyle = '#04100e'; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    inner(ctx);
    // scanlines and a phosphor sheen
    ctx.globalAlpha = 0.16; ctx.fillStyle = '#000000';
    for (let sy2 = y; sy2 < y + h; sy2 += 2) ctx.fillRect(x, sy2, w, 1);
    ctx.globalAlpha = 0.05; ctx.fillStyle = '#7affda'; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.fillStyle = 'rgba(140,220,210,0.25)'; ctx.fillRect(x, y, w, 1);
  },

  // --- right: specimen tanks, centrifuge, fume hood, whiteboard
  rightBank(ctx, t) {
    const F = LAB.FLOOR;
    // a run of small specimen jars on a shelf, each with something in it
    const shx = 392, shy = F - 116;
    ctx.fillStyle = '#3a2c20'; ctx.fillRect(shx, shy + 26, 130, 4);
    ctx.fillStyle = '#4d3a2a'; ctx.fillRect(shx, shy + 26, 130, 1);
    for (let j = 0; j < 6; j++) {
      const jx = shx + 6 + j * 21, jw = 15, jh = 26;
      // glass
      ctx.fillStyle = 'rgba(120,200,200,0.13)'; ctx.fillRect(jx, shy, jw, jh);
      ctx.fillStyle = 'rgba(40,80,80,0.5)'; ctx.fillRect(jx, shy + jh - 2, jw, 2);
      // fluid
      const fl = 6 + (j % 3) * 3;
      ctx.fillStyle = ['rgba(90,190,150,0.4)', 'rgba(190,170,80,0.35)', 'rgba(180,90,90,0.35)'][j % 3];
      ctx.fillRect(jx + 1, shy + fl, jw - 2, jh - fl - 2);
      // specimen: a curled shape, a bone, an eye
      ctx.fillStyle = '#c8bfa0';
      if (j % 3 === 0) { Shape.blob(ctx, jx + jw / 2, shy + jh - 9, 4, '#d8c8a8'); ctx.fillStyle = '#2a2018'; ctx.fillRect(jx + jw / 2 - 2, shy + jh - 11, 2, 2); }
      else if (j % 3 === 1) { ctx.fillRect(jx + 4, shy + jh - 12, 7, 2); ctx.fillRect(jx + 3, shy + jh - 13, 2, 4); ctx.fillRect(jx + 10, shy + jh - 13, 2, 4); }
      else { Shape.blob(ctx, jx + jw / 2, shy + jh - 10, 3, '#e8e0d0'); Shape.blob(ctx, jx + jw / 2, shy + jh - 10, 1.6, '#2a5a7a'); }
      // rim light and a lid
      ctx.fillStyle = 'rgba(220,250,250,0.3)'; ctx.fillRect(jx, shy, 1, jh);
      ctx.fillStyle = '#5a5248'; ctx.fillRect(jx - 1, shy - 3, jw + 2, 3);
      // slow bubbles
      if (ihash(j, 7) > 0.4) { const bp = (t * 0.4 + j * 0.3) % 1; ctx.fillStyle = 'rgba(230,255,255,0.5)'; ctx.fillRect(jx + 4 + (j % 4), shy + jh - 3 - bp * (jh - fl - 4), 1, 1); }
    }
    // centrifuge: a drum that spins, with a lit window
    const cx = 392, cy = F - 44;
    ctx.fillStyle = '#2a3a40'; ctx.fillRect(cx, cy, 40, 42);
    ctx.fillStyle = '#3a4e55'; ctx.fillRect(cx, cy, 40, 3);
    ctx.fillStyle = '#0d1518'; ctx.fillRect(cx + 5, cy + 7, 30, 22);
    // spinning rotor: four arms, motion-blurred by drawing them faded
    const sp = t * 15;
    for (let k = 0; k < 4; k++) {
      const a = sp + k * (TAU / 4);
      ctx.globalAlpha = 0.85 - (k % 2) * 0.35;
      ctx.fillStyle = '#8fa8b0';
      ctx.fillRect(Math.round(cx + 20 + Math.cos(a) * 10) - 1, Math.round(cy + 18 + Math.sin(a) * 7) - 1, 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ff6040' : '#3a1a14'; ctx.fillRect(cx + 32, cy + 33, 3, 3);
    Font.draw(ctx, 'RPM', cx + 5, cy + 32, { color: '#4f7f74' });
    // fume hood with a raised sash and a burner
    const hx = 464, hy = F - 86, hw = 96, hh = 86;
    ctx.fillStyle = '#1d2c31'; ctx.fillRect(hx, hy, hw, hh);
    ctx.fillStyle = 'rgba(140,220,220,0.10)'; ctx.fillRect(hx + 4, hy + 4, hw - 8, 46);
    ctx.fillStyle = '#33474d'; ctx.fillRect(hx + 2, hy + 46, hw - 4, 4);
    ctx.fillStyle = '#2a3a40'; ctx.fillRect(hx, hy + hh - 12, hw, 12);
    // glassware on the bench inside: flask over a flame
    ctx.fillStyle = 'rgba(200,240,230,0.35)';
    ctx.fillRect(hx + 20, hy + 36, 12, 10); ctx.fillRect(hx + 24, hy + 30, 4, 6);
    ctx.fillStyle = 'rgba(120,240,170,0.5)'; ctx.fillRect(hx + 21, hy + 41, 10, 4);
    const fl2 = 2 + Math.round(Math.abs(Math.sin(t * 9)) * 2);
    ctx.fillStyle = '#40a0ff'; ctx.fillRect(hx + 25, hy + 46 - fl2, 2, fl2);
    ctx.fillStyle = '#a0e0ff'; ctx.fillRect(hx + 25, hy + 46 - fl2, 1, 1);
    // a rack of pipettes and a coiled tube
    for (let i = 0; i < 5; i++) { ctx.fillStyle = '#cfe8e4'; ctx.fillRect(hx + 54 + i * 4, hy + 30, 1, 16); }
    ctx.fillStyle = '#8a5a4a';
    for (let i = 0; i < 12; i++) ctx.fillRect(hx + 66 + Math.round(Math.sin(i * 0.9) * 5), hy + 6 + i * 2, 3, 1);
    // whiteboard with dense scrawl
    const bx = 536, by = F - 190, bw = 98, bh = 62;
    ctx.fillStyle = '#cfd8d0'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#a8b2ac'; ctx.fillRect(bx, by + bh - 3, bw, 3);
    ctx.globalAlpha = 0.75;
    for (let l = 0; l < 9; l++) {
      const ly = by + 5 + l * 6, len = 20 + ihash(l, 5) * 66;
      ctx.fillStyle = l % 3 === 0 ? '#b03030' : '#28323a';
      for (let i = 0; i < len; i += 2) if (ihash(i + l * 31, 17) > 0.25) ctx.fillRect(bx + 4 + i, ly, 2, 1);
    }
    // a sketched helix in the corner of the board
    ctx.fillStyle = '#2a6a8a';
    for (let i = 0; i < 14; i++) { const a = i * 0.5; ctx.fillRect(bx + 74 + Math.round(Math.sin(a) * 8), by + 34 + i * 2, 2, 1); ctx.fillRect(bx + 74 + Math.round(Math.sin(a + Math.PI) * 8), by + 34 + i * 2, 2, 1); }
    ctx.globalAlpha = 1;
  },

  // --- the centrepiece: the embryo tank
  tank(ctx, cx, t) {
    const F = LAB.FLOOR, top = 96, bot = F - 6, w = 104;
    const x0 = Math.round(cx - w / 2), x1 = Math.round(cx + w / 2);
    // plinth and service block
    ctx.fillStyle = '#22343a'; ctx.fillRect(x0 - 10, bot - 6, w + 20, 12);
    ctx.fillStyle = '#2e454c'; ctx.fillRect(x0 - 10, bot - 6, w + 20, 2);
    // cabling into the base
    ctx.fillStyle = '#151f23';
    for (let i = 0; i < 5; i++) ctx.fillRect(x0 - 26 - i * 5, bot - 2 - i, 24, 3);
    // the fluid column
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#1e5e58'); g.addColorStop(0.5, '#18514f'); g.addColorStop(1, '#0e3a3c');
    ctx.fillStyle = g; ctx.fillRect(x0, top, w, bot - top);
    // suspended matter, drifting up
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 46; i++) {
      const px = x0 + 3 + (ihash(i, 31) * (w - 6));
      const py = bot - ((t * (6 + ihash(i, 32) * 12) + ihash(i, 33) * 400) % (bot - top - 8));
      ctx.fillStyle = ihash(i, 34) > 0.6 ? '#8fe8d0' : '#5fa89c';
      ctx.fillRect(Math.round(px), Math.round(py), 1, ihash(i, 35) > 0.8 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    // caustic banding inside the glass
    ctx.globalAlpha = 0.08; ctx.fillStyle = '#bfffee';
    for (let i = 0; i < 7; i++) {
      const yy = top + ((t * 14 + i * 30) % (bot - top));
      ctx.fillRect(x0 + 2, Math.round(yy), w - 4, 2);
    }
    ctx.globalAlpha = 1;
    // The specimen: the real animal, in the real art, floating in the acid.
    // Nothing in this room is a placeholder for something else.
    {
      if (!this._spec) this._spec = CrocView.make();
      const v = this._spec;
      const look = typeof Create !== 'undefined' ? Create.look() : CROC_LOOKS.base;
      const parts = buildCrocParts(look);
      // held under, drifting, occasionally testing the glass
      ctx.save();
      ctx.translate(cx + 8, (top + bot) / 2 - 6 + Math.sin(t * 0.6) * 5);
      ctx.rotate(-Math.PI / 2 + Math.sin(t * 0.35) * 0.22);
      drawCroc(ctx, v.chain, parts, 1.3, { jaw: v.jaw * 0.5, legPhase: v.legPhase, flipY: 1 });
      ctx.restore();
      // the light it sits in
      ctx.globalCompositeOperation = 'lighter';
      Shape.star(ctx, cx, (top + bot) / 2 + 4, 34, '#7affda', 0.10 + 0.04 * Math.sin(t * 1.9));
      ctx.globalCompositeOperation = 'source-over';
    }
    // umbilical feed from the top cap
    ctx.strokeStyle = '#8a6a5a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + 2, top + 6);
    for (let i = 1; i <= 6; i++) ctx.lineTo(cx + 2 + Math.sin(t * 0.8 + i) * (3 + i), top + 6 + i * 9);
    ctx.stroke();
    // glass: rim highlights, a vertical specular band, ring seams
    ctx.globalAlpha = 0.30; ctx.fillStyle = '#dffdf4';
    ctx.fillRect(x0 + 7, top + 4, 3, bot - top - 8);
    ctx.globalAlpha = 0.13; ctx.fillRect(x0 + 13, top + 4, 1, bot - top - 8);
    ctx.fillRect(x1 - 9, top + 10, 2, bot - top - 22);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(150,230,220,0.30)'; ctx.fillRect(x0, top, 2, bot - top); ctx.fillRect(x1 - 2, top, 2, bot - top);
    for (let ry = top + 26; ry < bot - 10; ry += 44) { ctx.fillStyle = '#3a565c'; ctx.fillRect(x0 - 2, ry, w + 4, 4); ctx.fillStyle = '#4e7078'; ctx.fillRect(x0 - 2, ry, w + 4, 1); }
    // top cap with valves and a pressure gauge
    ctx.fillStyle = '#2b4149'; ctx.fillRect(x0 - 6, top - 14, w + 12, 16);
    ctx.fillStyle = '#3d5c65'; ctx.fillRect(x0 - 6, top - 14, w + 12, 2);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x0 + 12 + i * 30, top - 22, 6, 9); Shape.ring(ctx, x0 + 15 + i * 30, top - 24, 5, 2, '#8a5a30'); }
    Shape.blob(ctx, x1 - 4, top - 6, 5, '#cfe8e4');
    ctx.fillStyle = '#20303a'; ctx.fillRect(x1 - 5, top - 7, 3, 1);
    ctx.fillStyle = '#c03020'; ctx.fillRect(x1 - 4, top - 7, 1, Math.sin(t) > 0 ? -3 : -2);
    // label plate
    ctx.fillStyle = '#141e22'; ctx.fillRect(cx - 34, bot - 26, 68, 13);
    Font.draw(ctx, 'SUBJECT 7', cx, bot - 23, { color: '#7affda', align: 'center' });
  },

  // --- floor: grating, a service pit, light spill from the tank
  floor(ctx, t) {
    const W = LAB.W, F = LAB.FLOOR, H = LAB.H;
    ctx.fillStyle = '#16232a'; ctx.fillRect(0, F, W, H - F);
    // epoxy floor with a sheen and a painted safety line
    ctx.fillStyle = '#1d2f36'; ctx.fillRect(0, F, W, 26);
    ctx.fillStyle = 'rgba(160,220,220,0.05)'; ctx.fillRect(0, F, W, 2);
    ctx.fillStyle = '#8a7420'; ctx.fillRect(0, F + 22, W, 2);
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#c8a020';
    for (let x = 0; x < W; x += 12) ctx.fillRect(x, F + 22, 6, 2);
    ctx.globalAlpha = 1;
    // grating over the service trench
    ctx.fillStyle = '#101a1f'; ctx.fillRect(0, F + 26, W, H - F - 26);
    for (let x = 0; x < W; x += 5) { ctx.fillStyle = '#243740'; ctx.fillRect(x, F + 26, 3, H - F - 26); }
    for (let y = F + 28; y < H; y += 9) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, y, W, 2); }
    // reflection of the tank light on the wet floor
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.10; ctx.fillStyle = '#5fe0c8';
    for (let i = 0; i < 9; i++) ctx.fillRect(W / 2 - 52 + i * 12, F + 2 + (i % 3), 8, 18);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  },

  // An open acid bath set into the floor to the left of the tank: a corroded
  // steel trough of green fluid, dissolving something, fuming steadily.
  acidBath(ctx, t) {
    const F = LAB.FLOOR, x = 64, w = 78, h = 20, y = F + 2;
    // trough, eaten away at the lip
    ctx.fillStyle = '#2a3a34'; ctx.fillRect(x - 4, y - 4, w + 8, h + 6);
    ctx.fillStyle = '#3d5249'; ctx.fillRect(x - 4, y - 4, w + 8, 2);
    ctx.fillStyle = '#1b2a26'; ctx.fillRect(x, y, w, h);
    // corrosion pitting the rim
    for (let i = 0; i < 22; i++) { const px2 = x - 3 + ihash(i, 81) * (w + 6); ctx.fillStyle = ihash(i, 82) > 0.5 ? '#6a7a3a' : '#4a5a28'; ctx.fillRect(Math.round(px2), y - 4 + Math.round(ihash(i, 83) * 3), 2, 2); }
    // the fluid: a lit surface, a darker body, and a meniscus that ripples
    const surf = y + 3 + Math.sin(t * 1.7) * 0.6;
    ctx.fillStyle = '#1d5a3c'; ctx.fillRect(x + 1, y + 3, w - 2, h - 4);
    ctx.fillStyle = '#2f8a54'; ctx.fillRect(x + 1, Math.round(surf), w - 2, 2);
    ctx.fillStyle = '#8fffc0'; ctx.fillRect(x + 1, Math.round(surf), w - 2, 1);
    // bubbles bursting at the surface
    for (let i = 0; i < 16; i++) {
      const bp = (t * (0.5 + ihash(i, 84) * 0.7) + ihash(i, 85)) % 1;
      const bx = x + 4 + ihash(i, 86) * (w - 8);
      const by = y + h - 3 - bp * (h - 7);
      ctx.globalAlpha = bp > 0.85 ? (1 - bp) / 0.15 : 0.7;
      ctx.fillStyle = '#b8ffd8';
      ctx.fillRect(Math.round(bx), Math.round(by), ihash(i, 87) > 0.7 ? 2 : 1, 1);
      ctx.globalAlpha = 1;
    }
    // something half dissolved, propped in it
    ctx.fillStyle = '#c8bfa0'; ctx.fillRect(x + 48, y - 6, 3, 10);
    ctx.fillStyle = '#a89878'; ctx.fillRect(x + 51, y - 3, 6, 4);
    ctx.fillStyle = '#8a9a58'; ctx.fillRect(x + 48, y + 2, 9, 2);
    // fumes lifting off it
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const p = (t * 0.34 + i * 0.1) % 1;
      ctx.globalAlpha = (1 - p) * 0.10;
      Shape.puff(ctx, x + 10 + ihash(i, 88) * (w - 20) + Math.sin(t + i) * 4, y - p * 46, 3 + p * 10, '#8fffc0', i * 7);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // hazard plate
    ctx.fillStyle = '#141e22'; ctx.fillRect(x + 2, y + h + 2, 40, 9);
    Font.draw(ctx, 'CORROSIVE', x + 4, y + h + 4, { color: '#8a9a30' });
  },
  // Loose chemistry across the room: a dripping feed line, acid stains eating
  // into the floor, and a green cast to the air near the bath.
  acidFx(ctx, t) {
    const F = LAB.FLOOR, W = LAB.W;
    // corroded feed line running down the wall into the bath
    ctx.fillStyle = '#4a5a3a'; ctx.fillRect(102, 52, 4, F - 52);
    ctx.fillStyle = '#66784a'; ctx.fillRect(102, 52, 1, F - 52);
    for (let i = 0; i < 9; i++) { const yy = 70 + i * 24; ctx.fillStyle = '#7a8a3a'; ctx.fillRect(101, yy, 6, 3); }
    // a drip, falling on its own clock, splashing in the trough
    const dp = (t * 0.55) % 1;
    ctx.fillStyle = '#a8ffc8';
    ctx.fillRect(103, Math.round(60 + dp * (F - 46)), 2, dp > 0.5 ? 3 : 2);
    if (dp > 0.95) { ctx.globalAlpha = (1 - dp) / 0.05; Shape.ripple(ctx, 104, F + 6, 6, '#b8ffd8', 0.8); ctx.globalAlpha = 1; }
    // stains where it has been dripping for years
    ctx.globalAlpha = 0.28;
    Shape.pool(ctx, 104, F + 24, 22, '#3a5a2a', 5, 0.24);
    Shape.pool(ctx, 104, F + 24, 12, '#6a8a30', 9, 0.2);
    ctx.globalAlpha = 0.2;
    Shape.pool(ctx, 470, F + 25, 16, '#3a5a2a', 12, 0.22);
    ctx.globalAlpha = 1;
    // a spill creeping out from under the fume hood, and its fumes
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.05; ctx.fillStyle = '#7affb0';
    ctx.fillRect(34, F - 60, 150, 88);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.28 + i * 0.17) % 1;
      ctx.globalAlpha = (1 - p) * 0.07;
      Shape.puff(ctx, 470 + Math.sin(t * 0.7 + i) * 8, F - p * 40, 4 + p * 9, '#8fffc0', i * 11);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  },
  drawStaff(ctx, s) {
    if (!s.rig) return;
    const F = LAB.FLOOR;
    // long shadow under the strip lights
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#0a1114';
    ctx.fillRect(Math.round(s.x - 9), F + 20, 18, 3);
    ctx.globalAlpha = 1;
    s.rig.draw(ctx, s.x, F + 22, s.face, 0, s.anim, { scale: s.rig.scale * 1.05 });
    // what they are carrying: a clipboard, a tablet, a tray of vials
    if (s.mode === 'clip') {
      ctx.fillStyle = '#d8d0bc'; ctx.fillRect(Math.round(s.x + s.face * 6), F - 2, 6, 8);
      ctx.fillStyle = '#8a8272'; ctx.fillRect(Math.round(s.x + s.face * 6), F - 2, 6, 1);
    } else if (s.mode === 'bench') {
      for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#7affda', '#ffa040', '#ff6070'][i]; ctx.fillRect(Math.round(s.x + s.face * 8 + i * 3), F - 4, 2, 5); }
    }
  },

  // --- foreground: a railing, cables underfoot, crates, dust in the beams
  foreground(ctx, t) {
    const W = LAB.W, H = LAB.H, F = LAB.FLOOR;
    // cables snaking across the floor
    ctx.strokeStyle = '#0e1518'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-4, F + 30);
    for (let x = 0; x < W + 10; x += 40) ctx.lineTo(x, F + 30 + Math.sin(x * 0.05) * 5);
    ctx.stroke();
    ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-4, F + 30);
    for (let x = 0; x < W + 10; x += 40) ctx.lineTo(x, F + 29 + Math.sin(x * 0.05) * 5);
    ctx.stroke();
    // crates
    const crate = (x, y, w, h) => {
      ctx.fillStyle = '#4a3a26'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#5d4a30'; ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + h - 2, w, 2);
      ctx.fillStyle = '#3a2c1c'; ctx.fillRect(x + 3, y + 4, w - 6, 1); ctx.fillRect(x + 3, y + h - 6, w - 6, 1);
      Font.draw(ctx, 'BIO', x + w / 2, y + h / 2 - 3, { color: '#8a7420', align: 'center' });
    };
    crate(24, F + 6, 26, 18);
    crate(586, F + 4, 30, 20);
    // dust hanging in the light
    ctx.globalAlpha = 0.30; ctx.fillStyle = '#dff4f8';
    for (let i = 0; i < 40; i++) {
      const px = (ihash(i, 61) * W + t * (3 + ihash(i, 62) * 5)) % W;
      const py = 30 + ((ihash(i, 63) * 260 + Math.sin(t * 0.5 + i) * 12) % 260);
      ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
    ctx.globalAlpha = 1;
  },

  // --- lighting pass: beams, vignette, cold grade
  lighting(ctx, t) {
    const W = LAB.W, H = LAB.H;
    // light cones from the strips
    ctx.globalCompositeOperation = 'lighter';
    for (let x = 40; x < W; x += 128) {
      const bad = (x / 128) % 3 === 1;
      const on = bad ? (Math.sin(t * 26 + x) > -0.55 ? 1 : 0.1) : 1;
      const gg = ctx.createLinearGradient(0, LAB.CEIL, 0, 250);
      gg.addColorStop(0, `rgba(190,240,250,${(0.10 * on).toFixed(3)})`);
      gg.addColorStop(1, 'rgba(190,240,250,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(x, LAB.CEIL); ctx.lineTo(x + 60, LAB.CEIL);
      ctx.lineTo(x + 108, 250); ctx.lineTo(x - 48, 250); ctx.closePath(); ctx.fill();
    }
    // the tank throws its own green light across the room
    const tg = ctx.createRadialGradient(W / 2, 200, 20, W / 2, 200, 220);
    tg.addColorStop(0, 'rgba(70,220,190,0.13)'); tg.addColorStop(1, 'rgba(70,220,190,0)');
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    // cold grade and a vignette
    ctx.fillStyle = 'rgba(20,50,60,0.10)'; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },
};
