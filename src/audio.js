'use strict';
// Fully synthesized audio: no asset files. Everything is built from oscillators + filtered noise.
const SFX = {
  ctx: null, master: null, sfxBus: null, musicBus: null, noiseBuf: null,
  muted: false, vol: 0.6, amb: null, mus: null, _last: {},
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : this.vol; this.master.connect(c.destination);
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 5; this.comp.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.comp);
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.3; this.musicBus.connect(this.comp);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.startAmbient();
    this.startMusic();
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : this.vol; return this.muted; },
  // rate limiter so 40 gibs don't play 40 sounds
  gate(name, ms) { const n = performance.now(); if (this._last[name] && n - this._last[name] < ms) return false; this._last[name] = n; return true; },
  tone(o) {
    if (!this.ctx) return null;
    const c = this.ctx, t0 = c.currentTime + (o.delay || 0), t = o.t || 0.2, a = o.a ?? 0.005;
    const osc = c.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(1, o.f || 440), t0);
    if (o.f2 != null) { if (o.lin) osc.frequency.linearRampToValueAtTime(Math.max(1, o.f2), t0 + t); else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + t); }
    if (o.detune) osc.detune.value = o.detune;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(o.v ?? 0.3, t0 + a);
    if (o.hold) g.gain.setValueAtTime(o.v ?? 0.3, t0 + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    let head = osc;
    if (o.filter) { const fl = c.createBiquadFilter(); fl.type = o.filter.type || 'lowpass'; fl.frequency.setValueAtTime(o.filter.f, t0); if (o.filter.f2) fl.frequency.exponentialRampToValueAtTime(Math.max(10, o.filter.f2), t0 + t); fl.Q.value = o.filter.q || 1; head.connect(fl); head = fl; }
    head.connect(g);
    this._out(g, o.pan, o.dest);
    osc.start(t0); osc.stop(t0 + t + 0.05);
    return osc;
  },
  noise(o) {
    if (!this.ctx) return null;
    const c = this.ctx, t0 = c.currentTime + (o.delay || 0), t = o.t || 0.2, a = o.a ?? 0.003;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true; src.playbackRate.value = o.rate || 1;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(o.v ?? 0.3, t0 + a);
    if (o.hold) g.gain.setValueAtTime(o.v ?? 0.3, t0 + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    let head = src;
    if (o.filter) { const fl = c.createBiquadFilter(); fl.type = o.filter.type || 'lowpass'; fl.frequency.setValueAtTime(o.filter.f, t0); if (o.filter.f2) fl.frequency.exponentialRampToValueAtTime(Math.max(10, o.filter.f2), t0 + t); fl.Q.value = o.filter.q || 1; head.connect(fl); head = fl; }
    head.connect(g);
    this._out(g, o.pan, o.dest);
    src.start(t0); src.stop(t0 + t + 0.05);
    return src;
  },
  _out(node, pan, dest) {
    dest = dest || this.sfxBus;
    if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); p.connect(dest); } else node.connect(dest);
  },
  // ---------- one-shots ----------
  chomp(size = 1, pan = 0) {
    if (!this.gate('chomp', 40)) return;
    const k = Math.pow(size, 0.3);
    this.noise({ t: 0.1, v: 0.5, filter: { f: 900 / k, f2: 200 / k }, pan });
    this.tone({ type: 'square', f: 130 / k, f2: 45 / k, t: 0.13, v: 0.3, pan });
    this.tone({ type: 'sine', f: 2200, f2: 500, t: 0.03, v: 0.18, pan });
  },
  crunch(size = 1, pan = 0) {
    if (!this.gate('crunch', 50)) return;
    const k = Math.pow(size, 0.3);
    [[0, 1900], [0.035, 1200], [0.08, 750], [0.12, 500]].forEach(([dl, f]) => this.noise({ delay: dl, t: 0.06, v: 0.45, filter: { type: 'bandpass', f: f / k, q: 2.5 }, pan }));
    this.noise({ t: 0.18, v: 0.55, filter: { f: 350 / k, f2: 90 }, pan });
    this.tone({ type: 'sawtooth', f: 75 / k, f2: 28, t: 0.22, v: 0.3, filter: { f: 400, f2: 80 }, pan });
  },
  gulp(size = 1, pan = 0) {
    if (!this.gate('gulp', 45)) return;
    const k = Math.pow(size, 0.25);
    this.tone({ type: 'sine', f: 340 / k, f2: 100 / k, t: 0.2, v: 0.3, pan });
    this.noise({ delay: 0.04, t: 0.1, v: 0.14, filter: { f: 700, f2: 200 }, pan });
  },
  gib(pan = 0) {
    if (!this.gate('gib', 60)) return;
    this.noise({ t: 0.14, v: 0.4, filter: { f: 900, f2: 180 }, pan });
    this.tone({ type: 'sine', f: 220, f2: 50, t: 0.12, v: 0.2, pan });
  },
  splash(p = 1, pan = 0) {
    if (!this.gate('splash', 70)) return;
    p = clamp(p, 0.2, 2.5);
    this.noise({ t: 0.08, v: 0.25 * p, filter: { type: 'highpass', f: 1800 }, pan });
    this.noise({ t: 0.35 * p, v: 0.4 * p, a: 0.015, filter: { f: 2600, f2: 250 }, pan });
  },
  hurt(pan = 0) {
    if (!this.gate('hurt', 80)) return;
    this.tone({ type: 'sawtooth', f: 200, f2: 45, t: 0.32, v: 0.35, filter: { f: 1400, f2: 180 }, pan });
    this.noise({ t: 0.16, v: 0.3, filter: { type: 'bandpass', f: 420, q: 1.5 }, pan });
  },
  roar(size = 1, pan = 0) {
    const k = Math.pow(size, 0.35);
    this.tone({ type: 'sawtooth', f: 150 / k, f2: 85 / k, t: 0.75, v: 0.42, a: 0.03, filter: { f: 1100, f2: 250, q: 3 }, pan });
    this.tone({ type: 'sawtooth', f: 152 / k, f2: 84 / k, t: 0.75, v: 0.3, a: 0.03, detune: 9, filter: { f: 800, f2: 200, q: 2 }, pan });
    this.noise({ t: 0.7, v: 0.32, a: 0.03, filter: { f: 750, f2: 180 }, pan });
    this.tone({ type: 'sine', f: 58 / k, f2: 40 / k, t: 0.7, v: 0.35, a: 0.02, pan });
  },
  growl(pan = 0) { if (!this.gate('growl', 400)) return; this.tone({ type: 'sawtooth', f: 90, f2: 70, t: 0.5, v: 0.22, a: 0.05, filter: { f: 500, f2: 200, q: 4 }, pan }); this.noise({ t: 0.45, v: 0.12, filter: { f: 400 }, pan }); },
  shed() {
    [523, 659, 784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone({ type: 'sine', f, t: 0.6, v: 0.16, delay: i * 0.085 }));
    [523, 659, 784].forEach((f, i) => this.tone({ type: 'triangle', f: f / 2, t: 1.4, v: 0.1, delay: 0.5 + i * 0.05 }));
    this.noise({ t: 1.3, v: 0.07, a: 0.3, filter: { type: 'highpass', f: 3500 } });
  },
  pick() { this.tone({ type: 'sine', f: 660, t: 0.14, v: 0.2 }); this.tone({ type: 'sine', f: 990, t: 0.25, v: 0.2, delay: 0.09 }); this.tone({ type: 'triangle', f: 1320, t: 0.35, v: 0.12, delay: 0.18 }); },
  ui() { this.tone({ type: 'square', f: 900, t: 0.045, v: 0.08 }); },
  crack(n = 0) {
    const k = 1 + n * 0.35;
    this.noise({ t: 0.09, v: 0.4, filter: { type: 'bandpass', f: 2200 * k, q: 2 } });
    this.noise({ delay: 0.03, t: 0.14, v: 0.3, filter: { f: 900 * k, f2: 300 } });
    this.tone({ type: 'square', f: 220 * k, f2: 90, t: 0.1, v: 0.14 });
  },
  peep() { const f = rand(900, 1300); this.tone({ type: 'square', f, f2: f * 1.4, t: 0.09, v: 0.1 }); this.tone({ type: 'sine', f: f * 1.5, f2: f * 2, t: 0.12, v: 0.06, delay: 0.06 }); },
  hatch() {
    this.crack(3); this.noise({ t: 0.5, v: 0.35, filter: { f: 1800, f2: 300 } });
    [523, 784, 1046].forEach((f, i) => this.tone({ type: 'triangle', f, t: 0.5, v: 0.12, delay: 0.1 + i * 0.07 }));
    this.peep();
  },
  gunshot(pan = 0) {
    this.noise({ t: 0.2, v: 0.6, a: 0.001, filter: { type: 'highpass', f: 900, f2: 150 }, pan });
    this.tone({ type: 'square', f: 160, f2: 35, t: 0.09, v: 0.3, pan });
    this.noise({ delay: 0.03, t: 0.4, v: 0.15, filter: { f: 500, f2: 120 }, pan });
  },
  ricochet(pan = 0) { if (!this.gate('ric', 60)) return; this.tone({ type: 'sine', f: 2600, f2: 800, t: 0.14, v: 0.14, pan }); this.noise({ t: 0.05, v: 0.15, filter: { type: 'highpass', f: 3000 }, pan }); },
  clank(pan = 0) { if (!this.gate('clank', 80)) return; this.tone({ type: 'square', f: 1300, f2: 900, t: 0.09, v: 0.16, pan }); this.tone({ type: 'sine', f: 400, f2: 300, t: 0.12, v: 0.15, pan }); this.noise({ t: 0.05, v: 0.2, filter: { type: 'highpass', f: 2500 }, pan }); },
  dash(pan = 0) { this.noise({ t: 0.28, v: 0.26, a: 0.01, filter: { type: 'bandpass', f: 500, f2: 2200, q: 1.2 }, pan }); this.tone({ type: 'sine', f: 180, f2: 420, t: 0.2, v: 0.08, pan }); },
  bubble(pan = 0) { if (!this.gate('bub', 120)) return; this.tone({ type: 'sine', f: rand(500, 800), f2: rand(1200, 1700), t: 0.07, v: 0.05, pan }); },
  combo(n, pan = 0) { const f = 440 * Math.pow(2, Math.min(n, 14) / 12); this.tone({ type: 'sine', f, t: 0.14, v: 0.14, pan }); this.tone({ type: 'sine', f: f * 1.5, t: 0.18, v: 0.07, delay: 0.04, pan }); },
  scream(pan = 0) {
    if (!this.gate('scream', 250)) return;
    const f = rand(650, 900);
    this.tone({ type: 'sawtooth', f, f2: f * 0.55, t: 0.55, v: 0.14, a: 0.02, filter: { f: 2400, f2: 900, q: 3 }, pan });
    this.tone({ type: 'sawtooth', f: f * 1.5, f2: f * 0.8, t: 0.45, v: 0.06, a: 0.02, detune: 12, pan });
  },
  yell(pan = 0) { if (!this.gate('yell', 300)) return; this.tone({ type: 'square', f: 300, f2: 220, t: 0.25, v: 0.1, filter: { f: 1500, q: 2 }, pan }); },
  warning() { for (let i = 0; i < 3; i++) { this.tone({ type: 'square', f: 110, t: 0.35, v: 0.22, delay: i * 0.45, filter: { f: 600 } }); this.tone({ type: 'sine', f: 55, t: 0.4, v: 0.3, delay: i * 0.45 }); } },
  heartbeat() { if (!this.gate('hb', 700)) return; this.tone({ type: 'sine', f: 65, f2: 40, t: 0.15, v: 0.5 }); this.tone({ type: 'sine', f: 60, f2: 38, t: 0.18, v: 0.4, delay: 0.2 }); },
  shock(pan = 0) { this.noise({ t: 0.6, v: 0.6, filter: { f: 500, f2: 60 }, pan }); this.tone({ type: 'sine', f: 55, f2: 25, t: 0.7, v: 0.5, pan }); this.tone({ type: 'sawtooth', f: 200, f2: 40, t: 0.3, v: 0.25, filter: { f: 700, f2: 100 }, pan }); },
  thud(pan = 0) { if (!this.gate('thud', 60)) return; this.noise({ t: 0.2, v: 0.4, filter: { f: 300, f2: 80 }, pan }); this.tone({ type: 'sine', f: 90, f2: 35, t: 0.2, v: 0.35, pan }); },
  splinter(pan = 0) { if (!this.gate('splinter', 80)) return; this.noise({ t: 0.25, v: 0.45, filter: { type: 'bandpass', f: 1400, f2: 300, q: 1.5 }, pan }); this.tone({ type: 'square', f: 200, f2: 60, t: 0.15, v: 0.15, pan }); this.tone({ type: 'triangle', f: 900, f2: 300, t: 0.1, v: 0.1, pan }); },
  hiss(pan = 0) { if (!this.gate('hiss', 500)) return; this.noise({ t: 0.5, v: 0.2, a: 0.05, filter: { type: 'bandpass', f: 4500, q: 1.5 }, pan }); },
  bird(pan = 0) { const f = rand(2200, 3400); this.tone({ type: 'sine', f, f2: f * 1.25, t: 0.09, v: 0.05, pan }); this.tone({ type: 'sine', f: f * 1.2, f2: f * 0.9, t: 0.1, v: 0.045, delay: 0.12, pan }); },
  frog(pan = 0) { this.tone({ type: 'sawtooth', f: rand(150, 220), f2: 130, t: 0.28, v: 0.06, a: 0.03, filter: { f: 700, q: 2 }, pan }); },
  cricket(pan = 0) { const f = rand(3800, 4600); for (let i = 0; i < 4; i++) this.tone({ type: 'sine', f, t: 0.035, v: 0.022, delay: i * 0.05, pan }); },
  death() { this.roar(2); this.noise({ t: 1.8, v: 0.4, a: 0.1, filter: { f: 600, f2: 40 } }); this.tone({ type: 'sine', f: 50, f2: 20, t: 2.0, v: 0.4, a: 0.1 }); },
  levelup() { [440, 554, 659, 880].forEach((f, i) => this.tone({ type: 'square', f, t: 0.22, v: 0.09, delay: i * 0.07, filter: { f: 2500 } })); },
  breach(pan = 0) { this.splash(1.3, pan); this.noise({ t: 0.5, v: 0.2, a: 0.02, filter: { type: 'highpass', f: 2500, f2: 600 }, pan }); },
  // ---------- ambient layer ----------
  startAmbient() {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 420;
    const g = c.createGain(); g.gain.value = 0.035;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.17; const lg = c.createGain(); lg.gain.value = 0.02;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(fl); fl.connect(g); g.connect(this.musicBus);
    src.start(); lfo.start();
    // underwater rumble (gain controlled per frame)
    const uw = c.createBufferSource(); uw.buffer = this.noiseBuf; uw.loop = true;
    const uf = c.createBiquadFilter(); uf.type = 'lowpass'; uf.frequency.value = 160;
    const ug = c.createGain(); ug.gain.value = 0;
    uw.connect(uf); uf.connect(ug); ug.connect(this.musicBus); uw.start();
    // boat engine drone
    const eo = c.createOscillator(); eo.type = 'sawtooth'; eo.frequency.value = 58;
    const eo2 = c.createOscillator(); eo2.type = 'square'; eo2.frequency.value = 29;
    const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 500;
    const eg = c.createGain(); eg.gain.value = 0;
    eo.connect(ef); eo2.connect(ef); ef.connect(eg); eg.connect(this.sfxBus); eo.start(); eo2.start();
    this.amb = { water: g, uw: ug, engine: eg, t: 0, nextBird: 1, nextFrog: 2, nextCricket: 0.5 };
  },
  startMusic() {
    const c = this.ctx;
    const mk = (f, type) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; return o; };
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 380; fl.Q.value = 2;
    const g = c.createGain(); g.gain.value = 0.16;
    const oscs = [mk(110, 'triangle'), mk(164.8, 'triangle'), mk(55, 'sine'), mk(220.5, 'sawtooth')];
    oscs[3].detune.value = 6;
    const sg = c.createGain(); sg.gain.value = 0.25; oscs[3].connect(sg); sg.connect(fl);
    oscs.slice(0, 3).forEach(o => o.connect(fl));
    fl.connect(g); g.connect(this.musicBus);
    oscs.forEach(o => o.start());
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(fl.frequency); lfo.start();
    // pulsing danger bass
    const bo = c.createOscillator(); bo.type = 'square'; bo.frequency.value = 55;
    const bf = c.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 300;
    const bg = c.createGain(); bg.gain.value = 0; bo.connect(bf); bf.connect(bg); bg.connect(this.musicBus); bo.start();
    this.mus = { oscs, fl, g, bg, bo, chord: 0, nextChord: 12, nextPluck: 2, pulse: 0, danger: 0 };
  },
  // per-frame: env = {night 0..1, danger 0..1, engine 0..1, underwater 0..1, dt}
  update(env) {
    if (!this.ctx || !this.amb) return;
    const a = this.amb, m = this.mus, dt = env.dt;
    a.t += dt;
    a.uw.gain.value = lerp(a.uw.gain.value, env.underwater * 0.09, 0.1);
    a.engine.gain.value = lerp(a.engine.gain.value, env.engine * 0.12, 0.08);
    a.water.gain.value = lerp(a.water.gain.value, env.underwater > 0.5 ? 0.01 : 0.035, 0.05);
    const night = env.night;
    a.nextBird -= dt; if (a.nextBird <= 0) { a.nextBird = rand(2, 7) + night * 12; if (night < 0.6 && chance(0.7)) this.bird(rand(-0.8, 0.8)); }
    a.nextFrog -= dt; if (a.nextFrog <= 0) { a.nextFrog = rand(1.5, 5) - night * 1; if (chance(0.3 + night * 0.6)) this.frog(rand(-0.8, 0.8)); }
    a.nextCricket -= dt; if (a.nextCricket <= 0) { a.nextCricket = rand(0.4, 1.4); if (night > 0.4 && chance(night)) this.cricket(rand(-1, 1)); }
    // music
    m.danger = lerp(m.danger, env.danger, 0.02);
    m.nextChord -= dt;
    const chords = [[110, 164.8, 55, 220.5], [87.3, 130.8, 43.65, 174.6], [130.8, 196, 65.4, 261.6], [98, 146.8, 49, 196], [82.4, 123.5, 41.2, 164.8]];
    if (m.nextChord <= 0) { m.nextChord = rand(10, 18); m.chord = (m.chord + randi(1, chords.length - 1)) % chords.length; const ch = chords[m.chord]; m.oscs.forEach((o, i) => o.frequency.setTargetAtTime(ch[i], this.ctx.currentTime, 1.5)); m.bo.frequency.setTargetAtTime(ch[2], this.ctx.currentTime, 0.5); }
    m.fl.frequency.value = lerp(m.fl.frequency.value, 300 + m.danger * 900 + (1 - night) * 120, 0.02);
    m.nextPluck -= dt;
    if (m.nextPluck <= 0) {
      m.nextPluck = rand(1.6, 4.2) - m.danger * 1.2;
      const root = chords[m.chord][0] * 2;
      const scale = [1, 1.2, 1.5, 1.8, 2, 2.4, 3];
      const f = root * choice(scale);
      this.tone({ type: 'sine', f, t: 1.6, v: 0.07, a: 0.01, dest: this.musicBus });
      this.tone({ type: 'triangle', f: f * 2.01, t: 0.9, v: 0.03, a: 0.01, dest: this.musicBus });
    }
    // danger pulse
    m.pulse += dt * (2 + m.danger * 2);
    const gate = (Math.sin(m.pulse * Math.PI) > 0.2 ? 1 : 0) * m.danger * 0.16;
    m.bg.gain.value = lerp(m.bg.gain.value, gate, 0.3);
  },
};
