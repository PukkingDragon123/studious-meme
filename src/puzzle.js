'use strict';
// ---------------------------------------------------------------------------
// THE MECHANISMS.
//
// The system is not a place you swim out of. The outfall at the east end is
// barred, and the bar is on gear nobody has turned since 1974: a sluice wheel,
// a bank of gate levers and a counterweight, one on each lift of the weirs,
// each one a thing you have to work with your mouth because it is the only
// tool you have.
//
// Every mechanism is a small game. Bite it and the world holds still around
// you while you play: a wheel you turn on a rhythm, levers you throw in the
// order the lamps showed you, a chain you hold until the weight sits right.
// Miss and it costs you a notch, not your life. Finish all three and the
// outflow opens, and the site's relic surfaces on the way to it.
// ---------------------------------------------------------------------------
const MECH_DEFS = {
  valve: { name: 'THE SLUICE WHEEL', line: 'TURN IT. ON THE BEAT.', game: 'timing', need: 4 },
  levers: { name: 'THE GATE LEVERS', line: 'THE LAMPS SHOW THE ORDER.', game: 'sequence', need: 4 },
  chain: { name: 'THE COUNTERWEIGHT', line: 'HOLD. LET GO IN THE BAND.', game: 'hold', need: 3 },
};
// One to a lift, up the flight of weirs in the outfall, and the gate at the top
const CATACOMB_MECHS = [
  { kind: 'valve', x: -300 }, { kind: 'levers', x: 280 }, { kind: 'chain', x: 640 },
];
const CATACOMB_GATE = 950;

class Mechanism extends Entity {
  constructor(x, kind) {
    super(x, 0);
    this.kind = kind; this.def = MECH_DEFS[kind]; this.name = this.def.name;
    this.type = 'mech'; this.edible = false; this.bleeds = false; this.latchable = false; this.persistent = true;
    this.hp = this.maxHp = 9999; this.armor = 99; this.layer = 0; this.r = 14; this.threat = 0;
    this.y = World.floorY(x); this.done = false; this.turn = 0; this.lampT = 0; this.weight = 0; this.pull = 0;
  }
  hitTest(x, y, r) { return Math.abs(x - this.x) < r + 16 && y > this.y - 40 && y < this.y + 10; }
  // bitten: the game starts, if it is not already finished
  onBite(P) {
    if (this.done) { G.fx.text(this.x, this.y - 30, 'DONE', { color: '#8ce8a0' }); return; }
    if (Puzzles.qte) return;
    Puzzles.start(this);
  }
  update(dt) { this.tick(dt); if (this.lampT > 0) this.lampT -= dt; if (this.kind === 'chain') this.weight = lerp(this.weight, this.done ? 1 : this.pull, 1 - Math.exp(-4 * dt)); }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, Math.max(1, w), Math.max(1, h)); };
    const on = this.done, t = G.t;
    // a plinth of the same stone as the rest of it
    px(-18, -6, 36, 6, '#5e574a'); px(-18, -6, 36, 1, '#8a8272');
    if (this.kind === 'valve') {
      // a bronze wheel on a stem, greened over, with a spoke that shows the turn
      px(-2, -22, 4, 16, '#3a3428'); px(-1, -22, 1, 16, '#5a5040');
      ctx.save(); ctx.translate(x, y - 26); ctx.rotate(this.turn);
      ctx.strokeStyle = on ? '#c8a050' : '#5a7a5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke();
      ctx.fillStyle = on ? '#e0c070' : '#7a9a6a';
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.fillRect(Math.round(Math.cos(a) * 5) - 1, Math.round(Math.sin(a) * 5) - 1, 3, 3); ctx.fillRect(-1, -1, 3, 3); }
      ctx.fillStyle = '#ffe080'; ctx.fillRect(Math.round(Math.cos(-Math.PI / 2) * 8) - 1, Math.round(Math.sin(-Math.PI / 2) * 8) - 1, 3, 3);
      ctx.restore();
    } else if (this.kind === 'levers') {
      // three levers in a bronze rack, each with a lamp over it
      px(-16, -20, 32, 4, '#3a3428'); px(-16, -20, 32, 1, '#6a6050');
      for (let k = 0; k < 3; k++) {
        const lx = -10 + k * 10, thrown = this.done || (Puzzles.qte && Puzzles.qte.mech === this && Puzzles.qte.input.indexOf(k) >= 0 && false);
        px(lx - 1, -18, 3, 12, '#5a5040');
        ctx.save(); ctx.translate(x + lx, y - 18); ctx.rotate(thrown ? 0.7 : -0.5); ctx.fillStyle = '#8a8070'; ctx.fillRect(-1, -12, 3, 12); ctx.fillStyle = '#c8a050'; ctx.fillRect(-2, -14, 5, 4); ctx.restore();
        const lit = this.done || (this.lamp === k && this.lampT > 0);
        px(lx - 2, -30, 5, 5, lit ? ['#ff8060', '#ffe060', '#7affda'][k] : '#2a2418');
        if (lit) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,220,150,0.25)'; ctx.fillRect(x + lx - 6, y - 34, 13, 13); ctx.globalCompositeOperation = 'source-over'; }
      }
    } else {
      // a chain over a pulley with a stone weight on it, and the band it has to sit in
      const top = -70, wy = -18 - this.weight * 40;
      px(-14, top - 4, 28, 4, '#3a3428'); px(0, top, 1, 70, '#8a8070');
      for (let k = 0; k < 14; k++) px(-1, top + 4 + k * 5, 3, 2, k % 2 ? '#a89a80' : '#6a6050');
      px(-6, Math.round(wy) - 10, 12, 12, on ? '#c8a050' : '#7a7262'); px(-6, Math.round(wy) - 10, 12, 1, '#a89a80');
      px(-5, Math.round(wy) - 7, 10, 1, '#4a4438'); px(-5, Math.round(wy) - 4, 10, 1, '#4a4438');
      // the band
      ctx.globalAlpha = 0.5; px(-12, -50, 3, 12, on ? '#8ce8a0' : '#c8a050'); px(9, -50, 3, 12, on ? '#8ce8a0' : '#c8a050'); ctx.globalAlpha = 1;
    }
    if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,160,80,' + (0.12 + Math.sin(t * 3) * 0.05).toFixed(3) + ')'; ctx.fillRect(x - 20, y - 60, 40, 60); ctx.globalCompositeOperation = 'source-over'; }
    // a name over it when you are close, so you know it is a thing and not a prop
    const P = G.player;
    if (P && !this.done && Math.abs(P.x - this.x) < 90) Font.draw(ctx, 'BITE', x, y - (this.kind === 'chain' ? 82 : 44), { color: Math.floor(t * 3) % 2 ? '#ffe060' : '#a88a40', align: 'center' });
  }
}

const Puzzles = {
  mechs: [], gate: null, qte: null, solved: 0, exitOpen: false, stage: null,

  reset() { this.mechs = []; this.gate = null; this.qte = null; this.solved = 0; this.exitOpen = false; this.stage = null; },
  begin(stage) {
    this.reset();
    if (!stage || !stage.intro) return;
    this.stage = stage;
    for (const m of CATACOMB_MECHS) {
      // exactly where it was drawn: these are bolted to a weir, not scattered
      const e = new Mechanism(m.x, m.kind); G.add(e); this.mechs.push(e);
    }
    const g = new Structure(CATACOMB_GATE, 'sluice'); g.puzzleGate = true; g.name = 'THE OUTFALL GATE'; G.add(g); this.gate = g;
  },

  // ---- the games ----------------------------------------------------------
  start(mech) {
    const d = mech.def, P = G.player;
    this.qte = { mech, game: d.game, need: d.need, got: 0, t: 0, miss: 0, done: false, over: 0,
      // timing: a marker sweeping a bar; hit inside the band
      pos: 0, dir: 1, band: [0.42, 0.62], flash: 0,
      // sequence: shown, then asked
      seq: [], showI: 0, showT: 0, input: [], phase: 'show',
      // hold: press and hold, release inside the band
      held: false, lift: 0, target: [0.55, 0.75], round: 0 };
    if (d.game === 'sequence') { const seq = []; for (let i = 0; i < d.need; i++) seq.push(randi(0, 2)); this.qte.seq = seq; }
    P.vx = 0; P.vy = 0; P.frozen = true;
    G.banner = { text: d.name, sub: d.line, t: 2.4, max: 2.4, color: '#c8a050' };
    SFX.clank && SFX.clank(0);
  },
  end(won) {
    const Q = this.qte; if (!Q) return;
    const P = G.player; P.frozen = false; this.qte = null;
    if (won) {
      Q.mech.done = true; this.solved++;
      G.addScore(2500); G.whiteFlash(0.35); G.shake(6); SFX.levelup && SFX.levelup();
      G.fx.text(Q.mech.x, Q.mech.y - 40, 'ENGAGED', { color: '#c8a050', scale: 2, life: 1.6 });
      Missions.bump('puzzle');
      // somewhere in the walls, something old turns over
      G.shake(4); SFX.clank && SFX.clank(0);
      if (this.solved >= CATACOMB_MECHS.length) { this.exitOpen = true; G.banner = { text: 'THE OUTFALL IS OPEN', sub: 'EAST. UP. GO.', t: 4, max: 4, color: '#8ce8a0' }; }
      else G.banner = { text: (CATACOMB_MECHS.length - this.solved) + ' TO GO', sub: 'THE OUTFALL IS STILL SHUT', t: 3, max: 3, color: '#c8a050' };
    } else {
      G.banner = { text: 'IT SLIPPED', sub: 'BITE IT AGAIN', t: 2.2, max: 2.2, color: '#ff8c40' };
      SFX.hurt && SFX.hurt();
    }
  },
  update(dt) {
    // the gate: a wall until the mechanisms say otherwise
    const P = G.player, g = this.gate;
    if (g && !g.remove && P && !P.dead) {
      g.open = approach(g.open, this.exitOpen ? 1 : 0, dt * 0.35);
      if (g.open < 0.55) {
        const d = P.x - g.x, pad = 12 + 5 * P.vis;
        if (Math.abs(d) <= pad) { const side = d >= 0 ? 1 : -1; P.x = g.x + side * pad; if (P.vx * side < 0) { P.vx *= -0.25; if (this.nagT === undefined || this.nagT <= 0) { this.nagT = 5; G.banner = { text: 'BARRED', sub: this.solved + ' OF ' + CATACOMB_MECHS.length + ' MECHANISMS ENGAGED', t: 2.4, max: 2.4, color: '#ff8c40' }; } } }
      }
    }
    if (this.nagT > 0) this.nagT -= dt;
    const Q = this.qte; if (!Q) return;
    Q.t += dt; if (Q.flash > 0) Q.flash -= dt;
    if (Q.over > 0) { Q.over -= dt; if (Q.over <= 0) this.end(Q.done); return; }
    const bite = Input.bitePressed() || Input.mouse.clicked;
    if (Q.game === 'timing') {
      // the marker sweeps faster with every notch you have turned
      Q.pos += Q.dir * dt * (0.9 + Q.got * 0.25);
      if (Q.pos > 1) { Q.pos = 1; Q.dir = -1; } if (Q.pos < 0) { Q.pos = 0; Q.dir = 1; }
      if (bite) {
        if (Q.pos >= Q.band[0] && Q.pos <= Q.band[1]) { Q.got++; Q.flash = 0.2; Q.mech.turn += Math.PI / 2; G.shake(3); SFX.clank && SFX.clank(0); Q.band = [rand(0.2, 0.62), 0]; Q.band[1] = Q.band[0] + 0.18; }
        else { Q.miss++; Q.mech.turn -= Math.PI / 4; G.shake(5); SFX.hurt && SFX.hurt(); if (Q.got > 0) Q.got--; }
        if (Q.got >= Q.need) { Q.done = true; Q.over = 0.5; }
        if (Q.miss >= 4) { Q.done = false; Q.over = 0.5; }
      }
    } else if (Q.game === 'sequence') {
      if (Q.phase === 'show') {
        Q.showT += dt;
        if (Q.showT > 0.7) { Q.showT = 0; if (Q.showI < Q.seq.length) { Q.mech.lamp = Q.seq[Q.showI]; Q.mech.lampT = 0.45; SFX.ui && SFX.ui(); Q.showI++; } else { Q.phase = 'ask'; } }
      } else {
        let k = -1;
        if (Input.hit('ArrowLeft', 'KeyA')) k = 0; else if (Input.hit('ArrowDown', 'KeyS', 'Space', 'KeyJ', 'KeyZ')) k = 1; else if (Input.hit('ArrowRight', 'KeyD')) k = 2;
        if (k < 0 && Input.mouse.clicked) k = Input.mouse.x < G.W / 3 ? 0 : Input.mouse.x > G.W * 2 / 3 ? 2 : 1;
        if (k >= 0) {
          Q.mech.lamp = k; Q.mech.lampT = 0.3;
          if (k === Q.seq[Q.input.length]) { Q.input.push(k); Q.flash = 0.2; SFX.clank && SFX.clank(0); G.shake(2); if (Q.input.length >= Q.seq.length) { Q.done = true; Q.over = 0.6; } }
          else { Q.miss++; Q.input = []; SFX.hurt && SFX.hurt(); G.shake(5); if (Q.miss >= 3) { Q.done = false; Q.over = 0.5; } else { Q.phase = 'show'; Q.showI = 0; Q.showT = -0.6; } }
        }
      }
    } else if (Q.game === 'hold') {
      const down = Input.down('Space', 'KeyZ', 'KeyJ') || Input.mouse.down || (Input.touch && Input.touch.biteHeld);
      if (down) { Q.held = true; Q.lift = Math.min(1, Q.lift + dt * 0.55); }
      else if (Q.held) {
        Q.held = false;
        if (Q.lift >= Q.target[0] && Q.lift <= Q.target[1]) { Q.got++; Q.flash = 0.2; G.shake(3); SFX.clank && SFX.clank(0); Q.target = [rand(0.3, 0.72), 0]; Q.target[1] = Q.target[0] + 0.16; }
        else { Q.miss++; SFX.hurt && SFX.hurt(); G.shake(5); }
        Q.lift = 0;
        if (Q.got >= Q.need) { Q.done = true; Q.over = 0.5; }
        if (Q.miss >= 4) { Q.done = false; Q.over = 0.5; }
      } else Q.lift = Math.max(0, Q.lift - dt * 1.6);
      Q.mech.pull = Q.lift;
    }
    if (Input.hit('Escape')) { this.end(false); }
  },

  // the game itself, drawn over the world, in the space above the mechanism
  draw(ctx) {
    const Q = this.qte; if (!Q) return;
    const W = G.W, H = G.H, y0 = H - 92;
    const bw = 200, bx = W / 2 - bw / 2;
    ctx.fillStyle = 'rgba(6,10,12,0.82)'; ctx.fillRect(bx - 14, y0 - 22, bw + 28, 62);
    ctx.fillStyle = '#c8a050'; ctx.fillRect(bx - 14, y0 - 22, bw + 28, 2);
    Font.draw(ctx, Q.mech.def.name, W / 2, y0 - 17, { color: '#e8d0a0', align: 'center' });
    const pips = (n, of, y) => { for (let i = 0; i < of; i++) { ctx.fillStyle = i < n ? '#8ce8a0' : '#2a2418'; ctx.fillRect(W / 2 - of * 5 + i * 10, y, 6, 6); } };
    if (Q.game === 'timing') {
      ctx.fillStyle = '#1a1410'; ctx.fillRect(bx, y0, bw, 10);
      ctx.fillStyle = Q.flash > 0 ? '#ffffff' : '#7ab86a'; ctx.fillRect(bx + Math.round(Q.band[0] * bw), y0, Math.round((Q.band[1] - Q.band[0]) * bw), 10);
      ctx.fillStyle = '#ffe060'; ctx.fillRect(bx + Math.round(Q.pos * bw) - 1, y0 - 3, 3, 16);
      Font.draw(ctx, 'BITE IN THE GREEN', W / 2, y0 + 14, { color: '#8a9a94', align: 'center' });
      pips(Q.got, Q.need, y0 + 26);
    } else if (Q.game === 'sequence') {
      for (let k = 0; k < 3; k++) {
        const lx = W / 2 - 36 + k * 36, lit = Q.mech.lamp === k && Q.mech.lampT > 0;
        ctx.fillStyle = lit ? ['#ff8060', '#ffe060', '#7affda'][k] : '#2a2418'; ctx.fillRect(lx - 10, y0 - 2, 20, 14);
        Font.draw(ctx, ['LEFT', 'DOWN', 'RIGHT'][k], lx, y0 + 16, { color: '#8a9a94', align: 'center' });
      }
      Font.draw(ctx, Q.phase === 'show' ? 'WATCH' : 'NOW YOU', W / 2, y0 + 26, { color: Q.phase === 'show' ? '#ffe060' : '#8ce8a0', align: 'center' });
      pips(Q.input.length, Q.seq.length, y0 + 34);
    } else {
      ctx.fillStyle = '#1a1410'; ctx.fillRect(bx, y0, bw, 10);
      ctx.fillStyle = Q.flash > 0 ? '#ffffff' : '#7ab86a'; ctx.fillRect(bx + Math.round(Q.target[0] * bw), y0, Math.round((Q.target[1] - Q.target[0]) * bw), 10);
      ctx.fillStyle = '#c8a050'; ctx.fillRect(bx, y0 + 2, Math.round(Q.lift * bw), 6);
      Font.draw(ctx, Q.held ? 'LET GO IN THE GREEN' : 'HOLD BITE', W / 2, y0 + 14, { color: '#8a9a94', align: 'center' });
      pips(Q.got, Q.need, y0 + 26);
    }
    if (Q.miss) Font.draw(ctx, 'SLIPS ' + Q.miss, bx + bw + 10, y0 - 17, { color: '#ff8c40', align: 'right' });
  },
};
