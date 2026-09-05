'use strict';
const Input = {
  keys: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, rdown: false, clicked: false, rclicked: false, moved: false },
  touch: { active: false, joy: false, jx: 0, jy: 0, jid: null, sx: 0, sy: 0, cx: 0, cy: 0, bite: false, dash: false, biteHeld: false, biteId: null, dashId: null, holdT: 0, autoBite: false },
  init(canvas) {
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.pressed[e.code] = true; this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      SFX.init(); SFX.resume();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
    canvas.addEventListener('mousemove', e => { this.setMouse(e); this.mouse.moved = true; });
    canvas.addEventListener('mousedown', e => { this.setMouse(e); if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; } if (e.button === 2) { this.mouse.rdown = true; this.mouse.rclicked = true; } SFX.init(); SFX.resume(); e.preventDefault(); });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.mouse.down = false; if (e.button === 2) this.mouse.rdown = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.initTouch(canvas);
  },
  // ---- on-screen (touch) controls ----
  pads() {
    const W = G.W, H = G.H;
    return {
      bite: { x: W - 54, y: H - 54, r: 30, label: 'BITE' },
      dash: { x: W - 112, y: H - 34, r: 21, label: 'DASH' },
      pause: { x: W - 15, y: 15, r: 13, label: 'II' },
      joyMax: W * 0.52,
    };
  },
  inPad(p, x, y) { return dist(x, y, p.x, p.y) < p.r + 12; },
  initTouch(canvas) {
    const tpos = t => G.toCanvas(t.clientX, t.clientY);
    const T = this.touch;
    canvas.addEventListener('touchstart', e => {
      SFX.init(); SFX.resume(); e.preventDefault(); T.active = true;
      const P = this.pads();
      for (const t of e.changedTouches) {
        const [x, y] = tpos(t);
        this.mouse.x = x; this.mouse.y = y; this.mouse.moved = true;
        if (G.state !== 'play') { this.mouse.clicked = true; if (this.inPad(P.pause, x, y)) this.pressed.Escape = true; continue; }
        if (this.inPad(P.bite, x, y)) { T.bite = true; T.biteHeld = true; T.biteId = t.identifier; T.holdT = 0.16; }
        else if (this.inPad(P.dash, x, y)) { T.dash = true; T.dashId = t.identifier; }
        else if (this.inPad(P.pause, x, y)) this.pressed.KeyP = true;
        else if (x < P.joyMax && !T.joy) { T.joy = true; T.jid = t.identifier; T.sx = x; T.sy = y; T.cx = x; T.cy = y; T.jx = 0; T.jy = 0; }
        else T.bite = true;
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== T.jid) continue;
        const [x, y] = tpos(t); T.cx = x; T.cy = y;
        let dx = x - T.sx, dy = y - T.sy; let d = Math.hypot(dx, dy); const R = 32;
        if (d > R) { T.sx += dx * (1 - R / d); T.sy += dy * (1 - R / d); dx = x - T.sx; dy = y - T.sy; d = Math.hypot(dx, dy); }
        const k = Math.min(1, d / 24);
        T.jx = d > 3 ? dx / (d || 1) * k : 0; T.jy = d > 3 ? dy / (d || 1) * k : 0;
      }
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === T.jid) { T.joy = false; T.jid = null; T.jx = 0; T.jy = 0; }
        if (t.identifier === T.biteId) { T.biteHeld = false; T.biteId = null; }
        if (t.identifier === T.dashId) T.dashId = null;
      }
    };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
  },
  // holding the bite pad keeps chomping
  tickTouch(dt) {
    const T = this.touch; T.autoBite = false;
    if (T.biteHeld) { T.holdT -= dt; if (T.holdT <= 0) { T.holdT = 0.16; T.autoBite = true; } }
  },
  setMouse(e) { const p = G.toCanvas(e.clientX, e.clientY); this.mouse.x = p[0]; this.mouse.y = p[1]; },
  down(...codes) { return codes.some(c => this.keys[c]); },
  hit(...codes) { return codes.some(c => this.pressed[c]); },
  endFrame() { this.pressed = {}; this.mouse.clicked = false; this.mouse.rclicked = false; this.touch.bite = false; this.touch.dash = false; },
  axis() {
    let x = 0, y = 0;
    if (this.down('ArrowLeft', 'KeyA')) x -= 1; if (this.down('ArrowRight', 'KeyD')) x += 1; if (this.down('ArrowUp', 'KeyW')) y -= 1; if (this.down('ArrowDown', 'KeyS')) y += 1;
    if (this.touch.joy) { x = this.touch.jx; y = this.touch.jy; }
    else if (this.mouse.down && x === 0 && y === 0 && G.settings.mouseMove && G.player) { const [wx, wy] = G.cam.toWorld(this.mouse.x, this.mouse.y); const dx = wx - G.player.x, dy = wy - G.player.y, d = Math.hypot(dx, dy); if (d > 10) { x = dx / d; y = dy / d; } }
    return [x, y];
  },
  bitePressed() { return this.hit('Space', 'KeyJ', 'KeyZ') || this.mouse.rclicked || this.touch.bite || this.touch.autoBite; },
  dashPressed() { return this.hit('ShiftLeft', 'ShiftRight', 'KeyK', 'KeyX') || this.touch.dash; },
};

const BOSSES = { 2: 'oldscar', 4: 'warboat', 6: 'python', 8: 'skunkape', 10: 'shark' };
function weightedPick(table) { const t = table.filter(e => e[1] > 0); let tot = t.reduce((s, e) => s + e[1], 0), r = Math.random() * tot; for (const e of t) { r -= e[1]; if (r <= 0) return e[0]; } return t.length ? t[t.length - 1][0] : null; }

const G = {
  W: 640, H: 360, canvas: null, ctx: null, state: 'title', runs: 0,
  t: 0, day: 0.12, timeScale: 1, slowT: 0, slowScale: 1, hitstopT: 0, shakeAmt: 0, shakeX: 0, shakeY: 0, red: 0, white: 0, zoomP: 1,
  cam: {
    x: 0, y: 40, zoom: 1.5,
    toScreen(wx, wy) { return [(wx - this.x) * this.zoom + G.W / 2 + G.shakeX, (wy - this.y) * this.zoom + G.H / 2 + G.shakeY]; },
    toWorldX(sx) { return (sx - G.W / 2 - G.shakeX) / this.zoom + this.x; },
    toWorld(sx, sy) { return [this.toWorldX(sx), (sy - G.H / 2 - G.shakeY) / this.zoom + this.y]; },
  },
  player: null, ents: [], fx: null, score: 0, stats: null, save: null, boss: null, shedPending: false, shedCards: null, shedSel: 0, shedT: 0, shedUiT: 0, shedTier: 0,
  engineNear: 0, settings: { gore: true, shake: true, mouseMove: true }, director: null, banner: null, deathInfo: null, deadT: 0, dyingT: 0, titleT: 0, lastTs: 0, prevState: 'title', fpsT: 0, frames: 0, fps: 60,
  init() {
    this.canvas = document.getElementById('game'); this.ctx = ctxOf(this.canvas);
    this.fx = new FXSystem(); UI.init(); Input.init(this.canvas);
    Meta.load(); this.loadSave();
    this.touchUI = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    this.scale = 1; this.rotated = false;
    World.onChunkLoad = (ch, rng) => this.onChunkLoad(ch, rng);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    this.startRun(true);
    this.state = 'title';
    requestAnimationFrame(ts => this.loop(ts));
  },
  resize() {
    const vw = window.innerWidth, vh = window.innerHeight, c = this.canvas;
    // a phone held upright gets the canvas turned sideways so the game fills the screen
    this.rotated = this.touchUI && vh > vw * 1.25;
    if (this.rotated) {
      this.scale = Math.min(vw / this.H, vh / this.W);
      c.style.transform = 'rotate(90deg)';
    } else {
      const fit = Math.min(vw / this.W, vh / this.H);
      this.scale = fit >= 2 ? Math.floor(fit) : fit; // crisp integer scale on desktop, exact fit elsewhere
      c.style.transform = 'none';
    }
    c.style.width = Math.round(this.W * this.scale) + 'px';
    c.style.height = Math.round(this.H * this.scale) + 'px';
  },
  // client (page) coordinates -> virtual 640x360 canvas coordinates
  toCanvas(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    if (!this.rotated) return [(clientX - r.left) / r.width * this.W, (clientY - r.top) / r.height * this.H];
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, s = this.scale || 1;
    return [this.W / 2 + (clientY - cy) / s, this.H / 2 - (clientX - cx) / s];
  },
  loadSave() { try { this.save = Object.assign({ best: 0, bestLen: 0, runs: 0, kills: 0, bestTier: 0 }, JSON.parse(localStorage.getItem('chompers.save') || '{}')); } catch (e) { this.save = { best: 0, bestLen: 0, runs: 0, kills: 0, bestTier: 0 }; } try { Object.assign(this.settings, JSON.parse(localStorage.getItem('chompers.settings') || '{}')); } catch (e) { } },
  storeSave() { const P = this.player; this.save.best = Math.max(this.save.best, this.score); this.save.bestLen = Math.max(this.save.bestLen, P.lengthFt); this.save.bestTier = Math.max(this.save.bestTier, P.tier); try { localStorage.setItem('chompers.save', JSON.stringify(this.save)); localStorage.setItem('chompers.settings', JSON.stringify(this.settings)); } catch (e) { } },
  startRun(demo = false) {
    World.reset((Math.random() * 1e9) | 0);
    this.player = new Player(); this.ents = []; this.fx.clear(); this.score = 0; this.boss = null; this.banner = null; this.shedPending = false; this.deathInfo = null;
    this.stats = { eaten: 0, kills: 0, bosses: 0, boats: 0, structures: 0, biggest: '', biggestMass: 0, kinds: {} };
    this.nightCounted = false; this.newUnlocks = [];
    this.t = 0; this.day = 0.1; World.t = 0; this.timeScale = 1; this.slowT = 0; this.slowScale = 1; this.hitstopT = 0; this.red = 0; this.white = 0;
    this.director = { spawnT: 0, predT: 28, flockT: 6, bossQueue: null, bossT: 0 };
    this.cam.x = 0; this.cam.y = 60; this.cam.zoom = 1.6;
    World.ensure(0, 1400);
    Water.init(0); Mud.init(0); Weather.rain = 0; Weather.target = 0; Weather.timer = rand(40, 120);
    if (demo) this.seedNursery(0, 1);
    if (!demo) { this.runs++; this.save.runs++; this.storeSave(); this.beginEgg(); }
  },
  // easy first meals, close to wherever the run begins
  seedNursery(cx, dir) {
    const w = x => World.floorY(x) > 30;
    const pick = (a, b) => { const x = cx + dir * rand(a, b); return w(x) ? x : null; };
    for (let i = 0; i < 6; i++) { const x = pick(40, 420); if (x !== null) Spawn.school(x, clamp(rand(12, 90), 8, World.floorY(x) - 12), chance(0.6) ? 'minnow' : 'bluegill'); }
    for (let i = 0; i < 2; i++) { const x = pick(60, 400); if (x !== null) Spawn.school(x, clamp(rand(12, 60), 8, World.floorY(x) - 12), 'tilapia'); }
    for (let i = 0; i < 4; i++) { const x = pick(30, 380); if (x !== null) this.add(new Frog(x)); }
    for (let i = 0; i < 5; i++) { const x = pick(30, 380); if (x !== null) this.add(new Bottom(x, chance(0.6) ? 'crayfish' : 'snail')); }
    for (let i = 0; i < 3; i++) { const x = pick(20, 300); if (x !== null) this.add(new Dragonfly(x)); }
    const mx = pick(80, 300);
    if (mx !== null) { const lead = new Mullet(mx, 30); this.add(lead); for (let i = 1; i < 5; i++) this.add(new Mullet(mx + rand(-30, 30), 30 + rand(-14, 14), lead)); }
    const dx = pick(120, 340); if (dx !== null) Spawn.duck(dx);
  },
  // ---------- the egg ----------
  beginEgg() {
    const P = this.player;
    // a nest on a bank with open water within a short crawl
    const shoreDir = x => {
      for (let d = 20; d < 110; d += 10) { if (World.floorY(x + d) > 40) return 1; if (World.floorY(x - d) > 40) return -1; }
      return 0;
    };
    let nx = World.findX(0, x => { const f = World.floorY(x); return f < -4 && f > -46 && shoreDir(x) !== 0; }, 5000, 16);
    if (nx === null) nx = World.findX(0, x => World.floorY(x) < -4, 8000, 20);
    if (nx === null) { this.state = 'play'; return; }
    const gy = World.floorY(nx);
    const dir = shoreDir(nx) || 1;
    this.egg = { x: nx, y: gy, dir, t: 0, taps: 0, need: 3, wob: 0, shake: 0, hatched: false, prompt: 0 };
    this.seedNursery(nx, dir);
    P.x = nx; P.y = gy - 5; P.angle = 0; P.facing = 1; P.frozen = true; P.hidden = true;
    P.chain.reset(P.x, P.y, 0);
    this.cam.x = nx + dir * 6; this.cam.y = gy - 20; this.cam.zoom = 4.6;
    this.state = 'egg'; this.banner = null;
    SFX.peep();
  },
  crackEgg() {
    const e = this.egg; if (!e || e.hatched) return;
    e.taps++; e.shake = 1; e.wob = rand(-1, 1) * 0.5;
    this.shake(4 + e.taps * 2); this.hitstop(0.04);
    SFX.crack(e.taps); if (chance(0.6)) SFX.peep();
    for (let i = 0; i < 6 + e.taps * 4; i++) {
      const a = rand(-Math.PI, 0), sp = rand(40, 130);
      this.fx.add({ type: 'splinter', x: e.x + rand(-4, 4), y: e.y - 14 + rand(-6, 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 1, w: randi(1, 3), color: choice(['#e8e0cc', '#c4b99e', '#f6f2e4']), rot: rand(TAU), vr: rand(-8, 8), life: rand(2, 4) });
    }
    if (e.taps >= e.need) this.hatch();
  },
  hatch() {
    const e = this.egg, P = this.player;
    e.hatched = true; e.t = 0;
    this.whiteFlash(0.5); this.shake(10); this.slowmo(0.35, 0.8); SFX.hatch();
    for (let i = 0; i < 40; i++) {
      const a = rand(-Math.PI, 0.4), sp = rand(60, 220);
      this.fx.add({ type: 'splinter', x: e.x + rand(-6, 6), y: e.y - 14 + rand(-8, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 1, w: randi(2, 5), color: choice(['#e8e0cc', '#c4b99e', '#f6f2e4', '#9c9078']), rot: rand(TAU), vr: rand(-10, 10), life: rand(4, 7) });
    }
    this.fx.glow(e.x, e.y - 12, 40, '#ffffff', 0.8);
    this.fx.text(e.x, e.y - 34, 'HATCHED', { color: '#ffffff', scale: 3, life: 2 });
    P.hidden = false; P.frozen = false; P.y = e.y - 6;
    P.vx = 90 * e.dir; P.vy = -70; P.facing = e.dir; P.angle = e.dir > 0 ? 0 : Math.PI;
    this.banner = { text: 'HATCHLING', sub: e.dir > 0 ? 'THE WATER IS TO YOUR RIGHT' : 'THE WATER IS TO YOUR LEFT', t: 4, max: 4, color: '#9ad8b0' };
    this.state = 'play';
  },
  onChunkLoad(ch, rng) {
    if (this.state === 'title' && Math.abs(ch.x0) > 700) return;
    const P = this.player, D = this.difficulty();
    // human activity: structures cluster where there is water access
    if (rng() < 0.75) { for (let a = 0; a < 3; a++) { const sx = ch.x0 + rng() * World.CHUNK; if (Math.abs(sx - P.x) < 320) continue; if (trySpawnStructure(sx, rng, D)) break; } }
    for (let k = 0; k < 5; k++) {
      const x = ch.x0 + rng() * World.CHUNK; if (Math.abs(x - P.x) < 260) continue;
      const fy = World.floorY(x);
      if (fy < -3) { if (rng() < 0.6) this.spawnLand(x, D); continue; }
      if (fy < 30) { if (rng() < 0.5) Spawn.heron(x); else if (rng() < 0.4) this.add(new Bottom(x, 'crayfish')); continue; }
      const r = rng();
      if (r < 0.3) Spawn.school(x, clamp(20 + rng() * 200, 10, fy - 15), rng() < 0.6 ? 'minnow' : 'bluegill');
      else if (r < 0.4) Spawn.school(x, clamp(10 + rng() * 60, 8, fy - 15), 'mullet');
      else if (r < 0.5) Spawn.school(x, clamp(30 + rng() * 200, 10, fy - 15), D > 0.3 ? 'bass' : 'tilapia');
      else if (r < 0.57) this.add(new Frog(x));
      else if (r < 0.64 && D > 0.3) this.add(new Turtle(x, clamp(40 + rng() * 100, 10, fy - 15)));
      else if (r < 0.7) this.add(new Bottom(x, rng() < 0.4 ? 'crayfish' : rng() < 0.5 ? 'crab' : rng() < 0.5 ? 'snail' : rng() < 0.5 ? 'shrimp' : 'fiddler'));
      else if (r < 0.76) Spawn.duck(x);
      else if (r < 0.8) this.add(new Dragonfly(x));
      else if (r < 0.84 && fy > 250) Spawn.school(x, fy - 30, rng() < 0.5 ? 'catfish' : 'eel');
      else if (r < 0.88 && fy > 200 && D > 0.6) this.add(new Ray(x));
      else if (r < 0.92 && D > 1.2) Spawn.school(x, clamp(40 + rng() * 200, 10, fy - 15), rng() < 0.5 ? 'gar' : 'bowfin');
      else if (r < 0.96 && D > 0.5) Spawn.school(x, clamp(10 + rng() * 60, 8, fy - 15), rng() < 0.5 ? 'babygator' : 'shiner');
    }
  },
  add(e) { this.ents.push(e); return e; },
  panOf(x) { return clamp((x - this.cam.x) / 450, -1, 1); },
  hitstop(t) { this.hitstopT = Math.max(this.hitstopT, t); },
  shake(a) { if (!this.settings.shake) a *= 0.25; this.shakeAmt = Math.min(22, Math.max(this.shakeAmt, a)); },
  slowmo(scale, dur) { this.slowScale = Math.min(this.slowScale, scale); this.slowT = Math.max(this.slowT, dur); },
  zoomPunch(k) { this.zoomP = k; },
  redFlash(a) { this.red = Math.max(this.red, a); },
  whiteFlash(a) { this.white = Math.max(this.white, a); },
  addScore(n) { this.score += Math.round(n); },
  difficulty() { const P = this.player; return P.sheds + Math.abs(P.x) / 3500 + this.t / 300; },
  dangerLevel() {
    const P = this.player; let d = 0;
    for (const e of this.ents) if (e.threat && !e.dead && Math.abs(e.x - P.x) < 500) d = Math.max(d, e.isBoss ? 1 : 0.6);
    if (P.hp / P.maxHp < 0.3) d = Math.max(d, 0.5);
    return d;
  },
  // ---------- kill / eat bookkeeping ----------
  onEntityKilled(e, byPlayer, gulped) {
    const P = this.player;
    if (byPlayer && e.type !== 'gib') {
      Meta.eaten(e.name); Meta.event('kill');
      if (e.mass >= 200) Meta.event('bigmeal');
      const got = Meta.checkUnlocks();
      for (const t of got) this.announceUnlock(t);
      if (got.length) Meta.save();
    }
    if (byPlayer) {
      if (e.edible || (P.st.ironStomach && e.type !== 'proj')) { if (!e.edible) e.mass = e.mass || 20; P.eat(e); }
      if (!gulped) e.explode(1);
      if (e.type !== 'gib') { this.stats.kills++; this.save.kills++; }
      if (e.isBoss) this.onBossKilled(e);
    } else if (e.type !== 'gib' && e.bleeds) e.explode(0.6);
    if (this.boss === e) this.boss = null;
  },
  announceUnlock(t) {
    this.newUnlocks.push(t.id);
    this.banner = { text: 'TRAIT UNLOCKED', sub: t.name + '  (' + t.animal + ')', t: 5, max: 5, color: t.color };
    this.fx.text(this.player.x, this.player.y - 40 * this.player.size, 'UNLOCKED: ' + t.name, { color: t.color, scale: 2, life: 3 });
    SFX.levelup(); SFX.pick(); this.whiteFlash(0.35); this.slowmo(0.3, 0.6);
  },
  onBossKilled(e) {
    this.stats.bosses++; this.addScore(10000);
    this.banner = { text: e.name + ' DEFEATED', sub: '+10,000', t: 4, max: 4, color: '#ffd060' };
    this.slowmo(0.2, 1.2); this.zoomPunch(1.15); SFX.roar(3); SFX.levelup(); this.whiteFlash(0.6);
    if (this.boss === e) this.boss = null;
    this.player.hp = this.player.maxHp;
    this.fx.text(e.x, e.y - 40, 'BOSS DEVOURED', { scale: 3, color: '#ffd060', life: 2 });
  },
  onPlayerDeath(cause, src) { this.deathInfo = { cause, killer: src && src.name }; this.dyingT = 0; this.state = 'dying'; this.storeSave(); },
  // ---------- shedding ----------
  startShed(tier) {
    const P = this.player;
    this.shedPending = true; this.shedTier = Math.min(P.tier + 1, TIERS.length - 1); this.shedT = 0; this.state = 'shedding';
    this.slowmo(0.12, 1.4); SFX.shed(); this.whiteFlash(0.8); this.shake(6);
    const n = P.chain.nodes;
    for (let i = 0; i < n.length; i++) { const part = i === 0 ? P.parts.head : i <= 5 ? P.parts.body[i - 1] : P.parts.tail[i - 6]; this.fx.husk(part.c, 0, 0, part.w, part.h, n[i].x, n[i].y, n[i].a, P.vis / CROC_PX, P.facing); }
    for (let i = 0; i < 14; i++) this.fx.glow(P.x + rand(-40, 40) * P.vis, P.y + rand(-16, 16) * P.vis, rand(2, 5) * P.vis, '#ffffff', rand(0.4, 1.0));
    this.fx.bubbles(P.x, P.y, 30, 30 * P.vis, -20);
    this.fx.text(P.x, P.y - 30 * P.size, 'SHEDDING!', { color: '#ffffff', scale: 3, life: 1.5 });
  },
  finishShed(card) {
    const P = this.player;
    applyCard(P, card); P.tier = this.shedTier; P.sheds++; P.hp = P.maxHp; P.lastMax = P.maxHp; P.invuln = 2.5; P.hunger = Math.max(P.hunger, 60);
    this.shedPending = false; this.state = 'play'; this.slowT = 0; this.slowScale = 1; this.timeScale = 1;
    this.banner = { text: 'NEW FORM: ' + TIERS[P.tier].name, sub: card.node.name, t: 3.5, max: 3.5, color: card.path ? PATHS[card.path].color : '#ffffff' };
    SFX.pick(); SFX.roar(P.size); this.whiteFlash(0.5); this.fx.glow(P.x, P.y, 60 * P.vis, '#ffffff', 0.8); this.addScore(500 * P.tier);
    if (card.node.evo) this.fx.text(P.x, P.y - 40 * P.size, 'EVOLVED!', { color: card.path ? PATHS[card.path].color : '#fff', scale: 3, life: 2 });
    if (BOSSES[P.sheds]) { this.director.bossQueue = BOSSES[P.sheds]; this.director.bossT = 9; }
    if (P.tier >= TIERS.length - 1) { Meta.event('swampgod'); for (const t2 of Meta.checkUnlocks()) this.announceUnlock(t2); Meta.save(); }
    this.storeSave();
  },
  // ---------- director ----------
  runDirector(dt) {
    const d = this.director, P = this.player, D = this.difficulty();
    d.spawnT -= dt; if (d.spawnT <= 0) { d.spawnT = 0.7; this.populate(D); }
    d.predT -= dt; if (d.predT <= 0) { d.predT = clamp(30 - D * 2.2, 10, 30) * rand(0.8, 1.25); this.spawnPredator(D); }
    d.flockT -= dt; if (d.flockT <= 0) { d.flockT = rand(9, 20); const dir = chance(0.5) ? 1 : -1, halfW = this.W / this.cam.zoom / 2; Spawn.flock(P.x - dir * (halfW + 140), dir, choice(['egret', 'ibis', 'heron', 'egret']), randi(2, 6)); }
    if (d.bossQueue && !this.boss) { d.bossT -= dt; if (d.bossT <= 0) this.spawnBoss(d.bossQueue); }
    // hard cap
    if (this.ents.length > 220) { let n = 0; for (const e of this.ents) if (e.type === 'gib' && n++ > 40) e.remove = true; }
  },
  populate(D) {
    const P = this.player, halfW = this.W / this.cam.zoom / 2;
    let fishCount = 0, landCount = 0, total = 0;
    for (const e of this.ents) { if (e.type === 'gib' || e.type === 'proj') continue; if (Math.abs(e.x - P.x) > halfW + 700) continue; total++; if (e.type === 'fish' || e.type === 'frog' || e.type === 'turtle' || e.type === 'bird') fishCount++; if (e.type === 'land') landCount++; }
    if (total > 90) return;
    const target = 16 + Math.min(24, P.size * 3);
    if (fishCount < target) {
      const side = chance(0.5) ? 1 : -1, x = P.x + side * (halfW + rand(80, 520)), fy = World.floorY(x);
      if (fy < 20) { this.spawnLand(x, D); }
      else {
        const night = World.light(this.day) < 0.4;
        const table = [
          ['minnow', 4], ['shiner', 3], ['sunfish', 3], ['bluegill', 3.5], ['mullet', 3], ['ladyfish', 1.5], ['tilapia', 2.5], ['snapper', 1.6], ['babygator', 1.4],
          ['bass', D >= 0.3 ? 2.5 : 0.5], ['peacock', D >= 0.5 ? 2 : 0], ['sheepshead', D >= 0.5 ? 1.2 : 0], ['walkingcat', D >= 0.4 ? 1.2 : 0], ['bowfin', D >= 0.8 ? 1.6 : 0], ['snook', D >= 1 ? 1.6 : 0], ['redfish', D >= 1 ? 1.2 : 0], ['snakehead', D >= 1.2 ? 1.2 : 0],
          ['catfish', fy > 250 && D >= 0.8 ? 1.6 : 0], ['eel', fy > 300 && D >= 1 ? 1.2 : 0], ['flgar', D >= 0.8 ? 1.6 : 0],
          ['gar', D >= 1.5 ? 1.4 : 0], ['tarpon', D >= 2.5 ? 1.6 : 0], ['bonnet', D >= 2 && fy > 200 ? 1 : 0], ['otter', D >= 1.5 ? 1 : 0], ['nutria', D >= 0.5 ? 1.4 : 0],
          ['manatee', D >= 3 && fy > 200 ? 0.7 : 0], ['dolphin', D >= 3.5 && fy > 260 ? 0.6 : 0], ['grouper', D >= 3.5 && fy > 420 ? 0.8 : 0], ['sawfish', D >= 4 && fy > 260 ? 0.7 : 0],
          ['frog', 2], ['pigfrog', 1.2], ['treefrog', 1], ['turtle', D >= 0.4 ? 2.2 : 0.8], ['slider', 1.6], ['cooter', 1.2], ['softshell', D >= 0.6 ? 1 : 0], ['gatorsnapper', D >= 1.5 && fy > 120 ? 0.8 : 0],
          ['bottom', 2.4], ['ray', fy > 180 && D >= 0.6 ? 1.2 : 0],
          ['duck', 1.2], ['heron', 1.2], ['divebird', 1.6], ['vulture', 0.6], ['skybird', 1], ['dragonfly', 1.2],
          ['kayak', D >= 2 ? 0.7 : 0], ['pontoon', D >= 1.5 ? 0.7 : 0], ['moccasin', D >= 1 ? 1 : 0],
        ];
        const kind = weightedPick(table);
        if (kind === 'mullet') { const n = randi(4, 8); const lead = new Mullet(x, clamp(rand(10, 70), 8, fy - 15)); this.add(lead); for (let i = 1; i < n; i++) this.add(new Mullet(x + rand(-30, 30), lead.y + rand(-16, 16), lead)); }
        else if (FISH[kind]) { const d = FISH[kind]; const y = d.nearFloor ? fy - 30 : clamp(rand(d.band[0], d.band[1]), 10, fy - 15); Spawn.school(x, y, kind); }
        else if (kind === 'frog' || kind === 'pigfrog' || kind === 'treefrog') this.add(new Frog(x, kind));
        else if (kind === 'turtle' || kind === 'slider' || kind === 'cooter' || kind === 'softshell' || kind === 'gatorsnapper') this.add(new Turtle(x, clamp(rand(30, 150), 10, fy - 15), kind));
        else if (kind === 'bottom') { const n = randi(1, 3); for (let i = 0; i < n; i++) this.add(new Bottom(x + rand(-40, 40), weightedPick([['crayfish', 3], ['crab', 2], ['snail', 1.5], ['fiddler', 1.5], ['shrimp', 2]]))); }
        else if (kind === 'skybird') { const k2 = weightedPick([['kite', 1.5], ['hawk', 1.2], ['owl', night ? 2 : 0], ['eagle', D >= 1.5 ? 0.8 : 0], ['egret', 1], ['woodstork', 0.8], ['ibis', 1]]); Spawn.flock(x, -side, k2, k2 === 'ibis' || k2 === 'egret' ? randi(2, 5) : 1); }
        else if (kind === 'ray') this.add(new Ray(x));
        else if (kind === 'duck') Spawn.duck(x);
        else if (kind === 'dragonfly') { const n = randi(1, 3); for (let i = 0; i < n; i++) this.add(new Dragonfly(x + rand(-40, 40))); }
        else if (kind === 'divebird') { const k2 = choice(['anhinga', 'osprey', 'pelican', 'anhinga', 'cormorant', 'kingfisher', 'kingfisher']); this.add(new DiveBird(x, -rand(70, 150), k2, -side)); }
        else if (kind === 'vulture') this.add(new Vulture(x, -rand(120, 180), -side));
        else if (kind === 'heron') { const hx = World.findX(x, xx => { const f = World.floorY(xx); return f > 4 && f < 40; }, 500, 12); if (hx !== null) { const k2 = weightedPick([['heron', 3], ['egret', 2], ['snowy', 2], ['littleblue', 1.2], ['tricolor', 1.2], ['ibis', 1.5], ['spoonbill', 1], ['woodstork', 0.8], ['limpkin', 1], ['gallinule', 1]]); this.add(new Bird(hx, 0, k2, 'wade')); } else Spawn.flock(x, -side, 'egret', 2); }
        else if (kind === 'kayak') this.add(new Kayak(x, -side));
        else if (kind === 'pontoon') { const wx = World.findX(x, xx => World.floorY(xx) > 60, 500, 30); if (wx !== null) Spawn.boat(wx, chance(0.5) ? 'pontoon' : 'jon', -side); }
        else if (kind === 'moccasin') this.add(new Snake(x, 4, 'moccasin'));
      }
    }
    if (landCount < 4 && chance(0.35)) { const bx = World.findX(P.x + (chance(0.5) ? 1 : -1) * (halfW + 300), x => World.floorY(x) < -5, 1400, 40); if (bx !== null && Math.abs(bx - P.x) > halfW * 0.7) this.spawnLand(bx, D); }
  },
  spawnLand(x, D) {
    if (World.floorY(x) > -3) return;
    const table = [
      ['raccoon', 3], ['rabbit', 2.5], ['armadillo', 2.2], ['iguana', 2], ['opossum', World.light(this.day) < 0.5 ? 2 : 0.6], ['deer', D >= 0.6 ? 2 : 0.6], ['doe', D >= 0.4 ? 2 : 0.8],
      ['fox', D >= 0.8 ? 1.2 : 0], ['coyote', D >= 1 ? 1.4 : 0], ['bobcat', D >= 1.2 ? 1 : 0], ['dog', D >= 1 ? 0.8 : 0],
      ['boar', D >= 1.6 ? 1.5 : 0], ['panther', D >= 2.4 ? 1.2 : 0], ['bear', D >= 3 ? 0.9 : 0], ['cow', D >= 2.5 ? 0.6 : 0],
      ['fisherman', D >= 1 ? 1.4 : 0], ['ranger', D >= 1.6 ? 1 : 0], ['survivor', D >= 0.6 ? 0.8 : 0], ['heron', 1.5],
    ];
    const k = weightedPick(table); if (k === 'heron') Spawn.heron(x); else this.add(new LandAnimal(x, k));
  },
  spawnPredator(D) {
    const P = this.player, halfW = this.W / this.cam.zoom / 2, side = chance(0.5) ? 1 : -1, x = P.x + side * (halfW + rand(120, 320)), fy = World.floorY(x);
    const opts = [];
    if (D < 2) opts.push(['bass', 2]);
    if (D >= 0.8) opts.push(['moccasin', 2]);
    if (D >= 1.2) opts.push(['gator', 4]);
    if (D >= 2.2) opts.push(['python', 2]);
    if (D >= 2.8) opts.push(['poacher', 3]);
    if (D >= 1.5) opts.push(['tourist', 1.5]);
    if (D >= 3.5 && fy > 350) opts.push(['shark', 3]);
    if (D >= 2) opts.push(['boar', 1]);
    if (D >= 2.6) opts.push(['panther', 1.5]);
    if (D >= 3) opts.push(['bear', 1]);
    if (D >= 3.2 && fy > 260) opts.push(['sawfish', 1.5]);
    if (D >= 3.8 && fy > 420) opts.push(['grouper', 1.2]);
    const k = weightedPick(opts); if (!k) return;
    let warn = null;
    switch (k) {
      case 'bass': if (fy > 40) Spawn.school(x, 60, 'bass'); break;
      case 'moccasin': if (fy > 20) this.add(new Snake(x, 4, 'moccasin')); break;
      case 'gator': if (fy > 40) { Spawn.gator(x, clamp(rand(20, 150), 10, fy - 20), clamp(P.size * rand(0.65, 1.35), 0.8, 30)); warn = 'SOMETHING IS HUNTING YOU'; } break;
      case 'python': { const bx = World.findX(x, xx => World.floorY(xx) < -3, 800, 30); this.add(new Snake(bx !== null ? bx : x, 4, 'python', clamp(0.8 + D * 0.12, 0.8, 2.2))); break; }
      case 'poacher': case 'tourist': { const wx = World.findX(x, xx => World.floorY(xx) > 60, 600, 30); if (wx !== null) { Spawn.boat(wx, k, -side); if (k === 'poacher') warn = 'POACHERS NEARBY'; } break; }
      case 'shark': this.add(new Fish(x, clamp(rand(100, 400), 60, fy - 30), 'shark')); warn = 'SOMETHING IS HUNTING YOU'; break;
      case 'boar': case 'panther': case 'bear': { const bx = World.findX(x, xx => World.floorY(xx) < -5, 1200, 40); if (bx !== null) { this.add(new LandAnimal(bx, k)); if (k !== 'boar') warn = k === 'bear' ? 'A BEAR IS ON THE BANK' : 'SOMETHING STALKS THE BANK'; } break; }
      case 'sawfish': this.add(new Fish(x, clamp(rand(150, 400), 60, fy - 30), 'sawfish')); break;
      case 'grouper': this.add(new Fish(x, clamp(rand(400, 700), 60, fy - 40), 'grouper')); break;
    }
    if (warn) { this.banner = { text: warn, t: 2.5, max: 2.5, color: '#ff8060' }; SFX.growl(side); }
  },
  spawnBoss(kind) {
    const P = this.player, halfW = this.W / this.cam.zoom / 2, side = chance(0.5) ? 1 : -1, x = P.x + side * (halfW + 220), fy = World.floorY(x);
    let boss = null;
    if (kind === 'oldscar') { const wx = World.findX(x, xx => World.floorY(xx) > 80, 900, 30); if (wx !== null) boss = Spawn.gator(wx, clamp(80, 10, World.floorY(wx) - 20), Math.max(1.6, P.size * 1.35), true); }
    else if (kind === 'warboat') { const wx = World.findX(x, xx => World.floorY(xx) > 60, 900, 30); if (wx !== null) boss = Spawn.boat(wx, 'warboat', -side); }
    else if (kind === 'python') { boss = this.add(new Snake(x, fy < 0 ? -10 : 6, 'python', Math.max(2.2, P.size * 0.8))); boss.isBoss = true; boss.persistent = true; boss.name = 'MOTHER PYTHON'; boss.hp = boss.maxHp = Math.round(boss.maxHp * 1.6); }
    else if (kind === 'skunkape') { const bx = World.findX(P.x + side * (halfW + 100), xx => World.floorY(xx) < -8, 6000, 40); if (bx !== null) boss = this.add(new SkunkApe(bx)); }
    else if (kind === 'shark') { const wx = World.findX(x, xx => World.floorY(xx) > 200, 1500, 40); if (wx !== null) { boss = this.add(new Fish(wx, clamp(150, 60, World.floorY(wx) - 40), 'shark')); boss.size = 2.2; boss.sizeClass = Math.max(10, P.size * 1.3); boss.hp = boss.maxHp = 1400; boss.mass = 1500; boss.name = 'BIG BULL'; boss.isBoss = true; boss.persistent = true; boss.speed = 200; boss.gibs = 6; } }
    if (!boss) { this.director.bossT = 8; return; }
    this.boss = boss; this.director.bossQueue = null;
    this.banner = { text: 'WARNING', sub: boss.name + ' APPROACHES', t: 4, max: 4, color: '#ff3030' }; SFX.warning(); this.shake(6);
  },
  // ---------- update ----------
  loop(ts) {
    const raw = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 0.016); this.lastTs = ts;
    this.frames++; this.fpsT += raw; if (this.fpsT >= 1) { this.fps = this.frames; this.frames = 0; this.fpsT -= 1; }
    if (this.slowT > 0) { this.slowT -= raw; if (this.slowT <= 0) this.slowScale = 1; }
    this.timeScale = lerp(this.timeScale, this.slowT > 0 ? this.slowScale : 1, 0.2);
    let dt = raw * this.timeScale;
    if (this.hitstopT > 0) { this.hitstopT -= raw; dt = 0; }
    this.update(dt, raw);
    this.render();
    Input.endFrame();
    requestAnimationFrame(t => this.loop(t));
  },
  update(dt, raw) {
    // global keys
    if (Input.hit('KeyM')) { const m = SFX.toggleMute(); if (!SFX.ctx) { SFX.init(); if (m) SFX.master && (SFX.master.gain.value = 0); } }
    switch (this.state) {
      case 'title':
        this.titleT += raw; this.updateWorld(dt, true);
        if (Input.hit('KeyH')) { this.prevState = 'title'; this.state = 'help'; }
        else if (Input.hit('KeyC')) { this.prevState = 'title'; this.state = 'codex'; this.codexScroll = 0; }
        else if (Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ') || Input.mouse.clicked) { SFX.init(); SFX.resume(); SFX.ui(); this.startRun(false); }
        break;
      case 'egg': {
        const e = this.egg;
        e.t += raw; e.prompt += raw;
        e.shake = Math.max(0, e.shake - raw * 3.5);
        e.wob = lerp(e.wob, Math.sin(e.t * 1.6) * 0.06, 0.06);
        this.updateWorld(dt, 'egg');
        this.cam.zoom = lerp(this.cam.zoom, 4.6 - e.taps * 0.45, 0.06);
        if (Input.bitePressed() || Input.hit('Enter') || Input.mouse.clicked || Input.dashPressed()) this.crackEgg();
        if (e.t > 14) this.hatch();   // never leave anyone stuck in the shell
        break;
      }
      case 'play':
        if (Input.hit('Escape', 'KeyP')) { this.state = 'pause'; SFX.ui(); break; }
        if (Input.hit('KeyH')) { this.prevState = 'play'; this.state = 'help'; break; }
        this.updateWorld(dt, false); this.runDirector(dt);
        break;
      case 'shedding':
        this.updateWorld(dt, false); this.shedT += raw;
        if (this.shedT > 1.3) { this.state = 'shed'; this.shedCards = rollCards(this.player, 3); this.shedSel = 0; this.shedUiT = 0; this.slowT = 0; this.slowScale = 1; }
        break;
      case 'shed': {
        this.shedUiT += raw;
        const n = this.shedCards.length;
        if (Input.hit('ArrowLeft', 'KeyA')) { this.shedSel = (this.shedSel + n - 1) % n; SFX.ui(); }
        if (Input.hit('ArrowRight', 'KeyD')) { this.shedSel = (this.shedSel + 1) % n; SFX.ui(); }
        const rects = UI.cardRects(n);
        if (Input.mouse.moved) rects.forEach((r, i) => { if (Input.mouse.x >= r.x && Input.mouse.x <= r.x + r.w && Input.mouse.y >= r.y - 6 && Input.mouse.y <= r.y + r.h) this.shedSel = i; });
        let pick = -1;
        if (Input.hit('Digit1')) pick = 0; if (Input.hit('Digit2')) pick = 1; if (Input.hit('Digit3')) pick = 2;
        if (Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ')) pick = this.shedSel;
        if (Input.mouse.clicked) rects.forEach((r, i) => { if (Input.mouse.x >= r.x && Input.mouse.x <= r.x + r.w && Input.mouse.y >= r.y - 6 && Input.mouse.y <= r.y + r.h) pick = i; });
        if (pick >= 0 && pick < n && this.shedUiT > 0.3) this.finishShed(this.shedCards[pick]);
        break;
      }
      case 'dying':
        this.updateWorld(dt, false); this.dyingT += raw;
        if (this.dyingT > 2.6) { this.state = 'dead'; this.deadT = 0; this.slowT = 0; this.slowScale = 1; }
        break;
      case 'dead':
        this.deadT += raw; this.updateWorld(dt * 0.3, false);
        if (this.deadT > 1 && (Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ') || Input.mouse.clicked)) { SFX.ui(); this.startRun(false); }
        if (Input.hit('KeyC')) { this.prevState = 'dead'; this.state = 'codex'; this.codexScroll = 0; SFX.ui(); }
        if (Input.hit('Escape')) { this.startRun(true); this.state = 'title'; }
        break;
      case 'pause':
        if (Input.hit('Escape', 'KeyP', 'Enter')) { this.state = 'play'; SFX.ui(); }
        if (Input.hit('KeyQ')) { this.storeSave(); this.startRun(true); this.state = 'title'; }
        if (Input.hit('Digit1')) { this.settings.gore = !this.settings.gore; SFX.ui(); }
        if (Input.hit('Digit2')) { this.settings.shake = !this.settings.shake; SFX.ui(); }
        if (Input.hit('Digit3')) { this.settings.mouseMove = !this.settings.mouseMove; SFX.ui(); }
        if (Input.hit('Digit4')) { this.settings.touch = this.settings.touch === false; SFX.ui(); }
        if (Input.hit('KeyC')) { this.prevState = 'pause'; this.state = 'codex'; this.codexScroll = 0; SFX.ui(); }
        break;
      case 'help':
        if (Input.hit('Escape', 'KeyH', 'Enter')) { this.state = this.prevState; SFX.ui(); }
        else if (Input.hit('KeyC')) { this.state = 'codex'; this.codexScroll = 0; SFX.ui(); }
        break;
      case 'codex': {
        const maxScroll = Math.max(0, Math.ceil(ANIMAL_TRAITS.length / 2) - 8);
        if (Input.hit('ArrowDown', 'KeyS')) this.codexScroll = Math.min(maxScroll, (this.codexScroll || 0) + 1);
        if (Input.hit('ArrowUp', 'KeyW')) this.codexScroll = Math.max(0, (this.codexScroll || 0) - 1);
        if (Input.hit('Escape', 'KeyC', 'Enter', 'KeyH') || (Input.mouse.clicked && Input.mouse.y > this.H - 26)) { this.state = this.prevState || 'title'; SFX.ui(); }
        break;
      }
    }
    // screen fx decay (real time)
    this.shakeAmt *= Math.exp(-6 * raw);
    if (this.shakeAmt < 0.2) this.shakeAmt = 0;
    this.shakeX = Math.round(rand(-1, 1) * this.shakeAmt); this.shakeY = Math.round(rand(-1, 1) * this.shakeAmt);
    this.red *= Math.exp(-3 * raw); this.white *= Math.exp(-4.5 * raw); this.zoomP = lerp(this.zoomP, 1, 0.08);
    Input.tickTouch(raw);
    Input.mouse.moved = false;
    const P = this.player;
    SFX.update({ dt: raw, night: 1 - World.light(this.day), danger: this.state === 'play' ? this.dangerLevel() : 0, engine: this.engineNear, underwater: P && P.inWater && this.state !== 'title' ? 1 : 0, rain: Weather.rain });
  },
  demoInput() {
    const P = this.player, t = this.titleT;
    P.hunger = 100; P.hp = P.maxHp;
    let x = Math.cos(t * 0.45) * 0.8, y = Math.sin(t * 0.9) * 0.35 + (P.y < 50 ? 0.7 : 0) + (P.y > 150 ? -0.7 : 0);
    if (P.x > 500) x = -1; if (P.x < -500) x = 1;
    let bite = false;
    for (const e of this.ents) if (e.type === 'fish' && !e.dead && dist(e.x, e.y, P.x, P.y) < 60) { const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1; x = dx / d; y = dy / d; if (d < 26 && P.biteCd <= 0) bite = true; break; }
    return { x, y, bite, dash: false };
  },
  updateWorld(dt, demo) {
    this.t += dt; World.t += dt;
    const prevDay = this.day; this.day = (this.day + dt / 420) % 1;
    if (this.state === 'play') {
      if (prevDay < 0.62 && this.day >= 0.62) this.nightCounted = false;
      if (!this.nightCounted && this.day >= 0.95) { this.nightCounted = true; Meta.event('night'); for (const t2 of Meta.checkUnlocks()) this.announceUnlock(t2); Meta.save(); }
    }
    const P = this.player;
    const [ax, ay] = Input.axis();
    if (demo === 'egg') demo = false;
    const inp = demo ? this.demoInput() : { x: ax, y: ay, bite: this.state === 'play' && Input.bitePressed(), dash: this.state === 'play' && Input.dashPressed() };
    this.engineNear = 0;
    P.update(dt, inp);
    World.ensure(P.x, this.W / this.cam.zoom + 900);
    Water.recenter(this.cam.x); Mud.recenter(this.cam.x);
    Water.update(dt); Mud.update(dt); Foliage.update(dt); Weather.update(dt); Weather.spawn(dt, this.cam);
    for (let i = 0; i < this.ents.length; i++) {
      const e = this.ents[i]; if (e.remove) continue;
      const dx = Math.abs(e.x - P.x);
      if (dx > 1800 && !e.persistent) { e.remove = true; continue; }
      if (dx < 1400 || e.persistent) e.update(dt);
    }
    if (this.ents.some(e => e.remove)) this.ents = this.ents.filter(e => !e.remove);
    this.fx.update(dt);
    this.updateCamera(dt);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
  },
  updateCamera(dt) {
    const P = this.player, c = this.cam;
    const tz = clamp(1.45 / Math.pow(P.vis, 0.95), 0.26, 1.45) * this.zoomP * (this.state === 'title' ? 1.1 : 1);
    c.zoom = lerp(c.zoom, tz, 1 - Math.exp(-2.5 * dt));
    const tx = P.x + P.vx * 0.22; let ty = P.y + P.vy * 0.12;
    if (this.state === 'title') ty = Math.max(ty, 75);
    const k = 1 - Math.exp(-5 * dt);
    c.x = lerp(c.x, tx, k); c.y = lerp(c.y, ty, k);
    c.y = Math.max(c.y, -(this.H / 2) / c.zoom + 30);
  },
  drawEgg(ctx) {
    const e = this.egg; if (!e || e.hatched) return;
    const n = SPR.nest, nx = Math.round(e.x - n.w / 2), ny = Math.round(e.y - n.h + 4);
    ctx.drawImage(n.c, nx, ny);                                   // nest, back to front
    const st = Math.min(3, e.taps), s = SPR.egg[st];
    const jx = e.shake > 0 ? rand(-1, 1) * e.shake * 2 : 0;
    ctx.save();
    ctx.translate(e.x + jx, e.y - 1);
    ctx.rotate(e.wob + (e.shake > 0 ? rand(-0.08, 0.08) * e.shake : 0));
    ctx.drawImage(s.c, -Math.round(s.w / 2), -s.h + 2);           // egg sits down in the bowl
    ctx.restore();
    ctx.drawImage(n.c, 0, 4, n.w, 4, nx, ny + 4, n.w, 4);         // front rim overlaps the shell
  },
  // ---------- render ----------
  render() {
    const ctx = this.ctx, cam = this.cam, day = this.day, P = this.player;
    ctx.imageSmoothingEnabled = false;
    World.drawSky(ctx, cam, day);
    World.drawParallax(ctx, cam, day);
    World.drawWater(ctx, cam, day);
    World.drawTerrain(ctx, cam);
    World.drawDecor(ctx, cam, 0, day);
    this.fx.drawClouds(ctx, cam);
    // world space
    ctx.save(); ctx.translate(this.W / 2 + this.shakeX, this.H / 2 + this.shakeY); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
    // zoomed out past 1:1 the rigged sprites are minified; nearest sampling turns their dithered scales into moire,
    // so let the browser box-filter them (mipmapped at 'medium') and go back to crisp pixels for the HUD
    ctx.imageSmoothingEnabled = cam.zoom < 0.97; ctx.imageSmoothingQuality = 'medium';
    const left = cam.toWorldX(-120), right = cam.toWorldX(this.W + 120);
    const vis = [];
    for (const e of this.ents) if (e.x > left - e.r * e.size * 4 && e.x < right + e.r * e.size * 4) vis.push(e);
    vis.sort((a, b) => a.layer - b.layer);
    let drewPlayer = false;
    for (const e of vis) { if (!drewPlayer && e.layer >= 2) { P.draw(ctx); drewPlayer = true; } e.draw(ctx); }
    if (!drewPlayer) P.draw(ctx);
    if (this.state === 'egg') this.drawEgg(ctx);
    for (const e of vis) if (e.type !== 'gib' && e.type !== 'proj' && !e.isBoss) e.drawHpBar(ctx);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    this.fx.draw(ctx, cam);
    World.drawDecor(ctx, cam, 1, day);
    World.drawSurface(ctx, cam, day);
    World.drawMist(ctx, cam, day);
    World.drawNight(ctx, cam, day);
    UI.drawScreenFx(ctx);
    switch (this.state) {
      case 'title': UI.drawTitle(ctx); break;
      case 'egg': UI.drawEgg(ctx); break;
      case 'play': case 'shedding': case 'dying': UI.drawHUD(ctx); break;
      case 'shed': UI.drawShed(ctx); break;
      case 'dead': UI.drawDeath(ctx); break;
      case 'pause': UI.drawHUD(ctx); UI.drawPause(ctx); break;
      case 'help': UI.drawHelp(ctx); break;
      case 'codex': UI.drawCodex(ctx); break;
    }
    if (this.state === 'play' && (this.touchUI || Input.touch.active) && this.settings.touch !== false) UI.drawTouch(ctx);
    if (this.settings.fps) Font.draw(ctx, this.fps + ' FPS', 4, this.H - 24, { color: '#80ff80' });
  },
};
window.addEventListener('load', () => G.init());
