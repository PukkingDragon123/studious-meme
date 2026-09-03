'use strict';
const Input = {
  keys: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, rdown: false, clicked: false, rclicked: false, moved: false },
  touch: { joy: false, jx: 0, jy: 0, jid: null, sx: 0, sy: 0, bite: false, dash: false, lastTap: 0 },
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
    const tpos = t => { const r = canvas.getBoundingClientRect(); return [(t.clientX - r.left) / r.width * G.W, (t.clientY - r.top) / r.height * G.H]; };
    canvas.addEventListener('touchstart', e => {
      SFX.init(); SFX.resume(); e.preventDefault();
      for (const t of e.changedTouches) {
        const [x, y] = tpos(t);
        if (x < G.W / 2 && !this.touch.joy) { this.touch.joy = true; this.touch.jid = t.identifier; this.touch.sx = x; this.touch.sy = y; this.touch.jx = 0; this.touch.jy = 0; }
        else { const now = performance.now(); if (now - this.touch.lastTap < 280) this.touch.dash = true; else this.touch.bite = true; this.touch.lastTap = now; this.mouse.clicked = true; this.mouse.x = x; this.mouse.y = y; }
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === this.touch.jid) { const [x, y] = tpos(t); const dx = x - this.touch.sx, dy = y - this.touch.sy, d = Math.hypot(dx, dy); const k = Math.min(1, d / 30); this.touch.jx = d > 4 ? dx / d * k : 0; this.touch.jy = d > 4 ? dy / d * k : 0; } }, { passive: false });
    const tend = e => { for (const t of e.changedTouches) if (t.identifier === this.touch.jid) { this.touch.joy = false; this.touch.jid = null; this.touch.jx = this.touch.jy = 0; } };
    canvas.addEventListener('touchend', tend); canvas.addEventListener('touchcancel', tend);
  },
  setMouse(e) { const r = G.canvas.getBoundingClientRect(); this.mouse.x = (e.clientX - r.left) / r.width * G.W; this.mouse.y = (e.clientY - r.top) / r.height * G.H; },
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
  bitePressed() { return this.hit('Space', 'KeyJ', 'KeyZ') || this.mouse.rclicked || this.touch.bite; },
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
    this.loadSave();
    World.onChunkLoad = (ch, rng) => this.onChunkLoad(ch, rng);
    this.resize(); window.addEventListener('resize', () => this.resize());
    this.startRun(true);
    this.state = 'title';
    requestAnimationFrame(ts => this.loop(ts));
  },
  resize() {
    const s = Math.max(1, Math.floor(Math.min(window.innerWidth / this.W, window.innerHeight / this.H)));
    const fit = Math.min(window.innerWidth / this.W, window.innerHeight / this.H);
    const scale = fit < 1 ? fit : s;
    this.canvas.style.width = Math.floor(this.W * scale) + 'px'; this.canvas.style.height = Math.floor(this.H * scale) + 'px';
  },
  loadSave() { try { this.save = Object.assign({ best: 0, bestLen: 0, runs: 0, kills: 0, bestTier: 0 }, JSON.parse(localStorage.getItem('chompers.save') || '{}')); } catch (e) { this.save = { best: 0, bestLen: 0, runs: 0, kills: 0, bestTier: 0 }; } try { Object.assign(this.settings, JSON.parse(localStorage.getItem('chompers.settings') || '{}')); } catch (e) { } },
  storeSave() { const P = this.player; this.save.best = Math.max(this.save.best, this.score); this.save.bestLen = Math.max(this.save.bestLen, P.lengthFt); this.save.bestTier = Math.max(this.save.bestTier, P.tier); try { localStorage.setItem('chompers.save', JSON.stringify(this.save)); localStorage.setItem('chompers.settings', JSON.stringify(this.settings)); } catch (e) { } },
  startRun(demo = false) {
    World.reset((Math.random() * 1e9) | 0);
    this.player = new Player(); this.ents = []; this.fx.clear(); this.score = 0; this.boss = null; this.banner = null; this.shedPending = false; this.deathInfo = null;
    this.stats = { eaten: 0, kills: 0, bosses: 0, boats: 0, biggest: '', biggestMass: 0, kinds: {} };
    this.t = 0; this.day = 0.1; World.t = 0; this.timeScale = 1; this.slowT = 0; this.slowScale = 1; this.hitstopT = 0; this.red = 0; this.white = 0;
    this.director = { spawnT: 0, predT: 28, flockT: 6, bossQueue: null, bossT: 0 };
    this.cam.x = 0; this.cam.y = 60; this.cam.zoom = 1.6;
    World.ensure(0, 1400);
    // starter nursery
    for (let i = 0; i < 4; i++) Spawn.school(rand(-300, 300), rand(20, 120), 'minnow');
    for (let i = 0; i < 2; i++) Spawn.school(rand(-350, 350), rand(30, 150), 'bluegill');
    for (let i = 0; i < 3; i++) this.add(new Frog(rand(-400, 400)));
    Spawn.duck(rand(150, 300));
    if (!demo) { this.state = 'play'; this.runs++; this.save.runs++; this.storeSave(); }
  },
  onChunkLoad(ch, rng) {
    if (this.state === 'title' && Math.abs(ch.x0) > 700) return;
    const P = this.player; const D = this.difficulty();
    for (let k = 0; k < 3; k++) {
      const x = ch.x0 + rng() * World.CHUNK; if (Math.abs(x - P.x) < 260) continue;
      const fy = World.floorY(x);
      if (fy < -3) { if (rng() < 0.5) this.spawnLand(x, D); continue; }
      if (fy < 30) { if (rng() < 0.5) Spawn.heron(x); continue; }
      const r = rng();
      if (r < 0.45) Spawn.school(x, clamp(20 + rng() * 200, 10, fy - 15), rng() < 0.6 ? 'minnow' : 'bluegill');
      else if (r < 0.6) Spawn.school(x, clamp(30 + rng() * 200, 10, fy - 15), D > 0.3 ? 'bass' : 'bluegill');
      else if (r < 0.7) this.add(new Frog(x));
      else if (r < 0.78 && D > 0.4) this.add(new Turtle(x, clamp(40 + rng() * 100, 10, fy - 15)));
      else if (r < 0.85) Spawn.duck(x);
      else if (r < 0.9 && fy > 250 && D > 0.8) Spawn.school(x, fy - 30, 'catfish');
      else if (r < 0.95 && D > 1.5) Spawn.school(x, clamp(40 + rng() * 200, 10, fy - 15), 'gar');
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
    if (byPlayer) {
      if (e.edible || (P.st.ironStomach && e.type !== 'proj')) { if (!e.edible) e.mass = e.mass || 20; P.eat(e); }
      if (!gulped) e.explode(1);
      if (e.type !== 'gib') { this.stats.kills++; this.save.kills++; }
      if (e.isBoss) this.onBossKilled(e);
    } else if (e.type !== 'gib' && e.bleeds) e.explode(0.6);
    if (this.boss === e) this.boss = null;
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
    for (let i = 0; i < n.length; i++) { const part = i === 0 ? P.parts.head : i <= 5 ? P.parts.body[i - 1] : P.parts.tail[i - 6]; this.fx.husk(part.c, 0, 0, part.w, part.h, n[i].x, n[i].y, n[i].a, P.size, P.facing); }
    for (let i = 0; i < 14; i++) this.fx.glow(P.x + rand(-40, 40) * P.size, P.y + rand(-16, 16) * P.size, rand(2, 5) * P.size, '#ffffff', rand(0.4, 1.0));
    this.fx.bubbles(P.x, P.y, 30, 30 * P.size, -20);
    this.fx.text(P.x, P.y - 30 * P.size, 'SHEDDING!', { color: '#ffffff', scale: 3, life: 1.5 });
  },
  finishShed(card) {
    const P = this.player;
    applyCard(P, card); P.tier = this.shedTier; P.sheds++; P.hp = P.maxHp; P.lastMax = P.maxHp; P.invuln = 2.5; P.hunger = Math.max(P.hunger, 60);
    this.shedPending = false; this.state = 'play'; this.slowT = 0; this.slowScale = 1; this.timeScale = 1;
    this.banner = { text: 'NEW FORM: ' + TIERS[P.tier].name, sub: card.node.name, t: 3.5, max: 3.5, color: card.path ? PATHS[card.path].color : '#ffffff' };
    SFX.pick(); SFX.roar(P.size); this.whiteFlash(0.5); this.fx.glow(P.x, P.y, 60 * P.size, '#ffffff', 0.8); this.addScore(500 * P.tier);
    if (card.node.evo) this.fx.text(P.x, P.y - 40 * P.size, 'EVOLVED!', { color: card.path ? PATHS[card.path].color : '#fff', scale: 3, life: 2 });
    if (BOSSES[P.sheds]) { this.director.bossQueue = BOSSES[P.sheds]; this.director.bossT = 9; }
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
        const table = [['minnow', 5], ['bluegill', 4], ['bass', D >= 0.3 ? 3 : 0.5], ['catfish', fy > 250 && D >= 0.8 ? 2 : 0], ['gar', D >= 1.5 ? 2 : 0], ['tarpon', D >= 2.5 ? 2 : 0], ['otter', D >= 1.5 ? 1 : 0], ['manatee', D >= 3 && fy > 200 ? 0.7 : 0], ['frog', 2.5], ['turtle', D >= 0.5 ? 1.5 : 0], ['duck', 1.5], ['heron', 1.2], ['kayak', D >= 2 ? 0.8 : 0], ['moccasin', D >= 1 ? 1.2 : 0]];
        const kind = weightedPick(table);
        if (FISH[kind]) { const d = FISH[kind]; const y = d.nearFloor ? fy - 30 : clamp(rand(d.band[0], d.band[1]), 10, fy - 15); Spawn.school(x, y, kind); }
        else if (kind === 'frog') this.add(new Frog(x));
        else if (kind === 'turtle') this.add(new Turtle(x, clamp(rand(30, 150), 10, fy - 15)));
        else if (kind === 'duck') Spawn.duck(x);
        else if (kind === 'heron') { const hx = World.findX(x, xx => { const f = World.floorY(xx); return f > 4 && f < 40; }, 500, 12); if (hx !== null) Spawn.heron(hx); else Spawn.flock(x, -side, 'heron', 1); }
        else if (kind === 'kayak') this.add(new Kayak(x, -side));
        else if (kind === 'moccasin') this.add(new Snake(x, 4, 'moccasin'));
      }
    }
    if (landCount < 4 && chance(0.35)) { const bx = World.findX(P.x + (chance(0.5) ? 1 : -1) * (halfW + 300), x => World.floorY(x) < -5, 1400, 40); if (bx !== null && Math.abs(bx - P.x) > halfW * 0.7) this.spawnLand(bx, D); }
  },
  spawnLand(x, D) {
    if (World.floorY(x) > -3) return;
    const table = [['raccoon', 3], ['deer', D >= 0.8 ? 2.5 : 0], ['boar', D >= 2 ? 1.5 : 0], ['fisherman', D >= 1.2 ? 1.5 : 0], ['heron', 1.5]];
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
    const k = weightedPick(opts); if (!k) return;
    let warn = null;
    switch (k) {
      case 'bass': if (fy > 40) Spawn.school(x, 60, 'bass'); break;
      case 'moccasin': if (fy > 20) this.add(new Snake(x, 4, 'moccasin')); break;
      case 'gator': if (fy > 40) { Spawn.gator(x, clamp(rand(20, 150), 10, fy - 20), clamp(P.size * rand(0.65, 1.35), 0.8, 30)); warn = 'SOMETHING IS HUNTING YOU'; } break;
      case 'python': { const bx = World.findX(x, xx => World.floorY(xx) < -3, 800, 30); this.add(new Snake(bx !== null ? bx : x, 4, 'python', clamp(0.8 + D * 0.12, 0.8, 2.2))); break; }
      case 'poacher': case 'tourist': { const wx = World.findX(x, xx => World.floorY(xx) > 60, 600, 30); if (wx !== null) { Spawn.boat(wx, k, -side); if (k === 'poacher') warn = 'POACHERS NEARBY'; } break; }
      case 'shark': this.add(new Fish(x, clamp(rand(100, 400), 60, fy - 30), 'shark')); warn = 'SOMETHING IS HUNTING YOU'; break;
      case 'boar': { const bx = World.findX(x, xx => World.floorY(xx) < -5, 1000, 40); if (bx !== null) this.add(new LandAnimal(bx, 'boar')); break; }
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
        else if (Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ') || Input.mouse.clicked) { SFX.init(); SFX.resume(); SFX.ui(); this.startRun(false); }
        break;
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
        if (Input.hit('Escape')) { this.startRun(true); this.state = 'title'; }
        break;
      case 'pause':
        if (Input.hit('Escape', 'KeyP', 'Enter')) { this.state = 'play'; SFX.ui(); }
        if (Input.hit('KeyQ')) { this.storeSave(); this.startRun(true); this.state = 'title'; }
        if (Input.hit('Digit1')) { this.settings.gore = !this.settings.gore; SFX.ui(); }
        if (Input.hit('Digit2')) { this.settings.shake = !this.settings.shake; SFX.ui(); }
        if (Input.hit('Digit3')) { this.settings.mouseMove = !this.settings.mouseMove; SFX.ui(); }
        break;
      case 'help':
        if (Input.hit('Escape', 'KeyH', 'Enter')) { this.state = this.prevState; SFX.ui(); }
        break;
    }
    // screen fx decay (real time)
    this.shakeAmt *= Math.exp(-6 * raw);
    if (this.shakeAmt < 0.2) this.shakeAmt = 0;
    this.shakeX = Math.round(rand(-1, 1) * this.shakeAmt); this.shakeY = Math.round(rand(-1, 1) * this.shakeAmt);
    this.red *= Math.exp(-3 * raw); this.white *= Math.exp(-4.5 * raw); this.zoomP = lerp(this.zoomP, 1, 0.08);
    Input.mouse.moved = false;
    const P = this.player;
    SFX.update({ dt: raw, night: 1 - World.light(this.day), danger: this.state === 'play' ? this.dangerLevel() : 0, engine: this.engineNear, underwater: P && P.inWater && this.state !== 'title' ? 1 : 0 });
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
    this.t += dt; World.t += dt; this.day = (this.day + dt / 420) % 1;
    const P = this.player;
    const [ax, ay] = Input.axis();
    const inp = demo ? this.demoInput() : { x: ax, y: ay, bite: this.state === 'play' && Input.bitePressed(), dash: this.state === 'play' && Input.dashPressed() };
    this.engineNear = 0;
    P.update(dt, inp);
    World.ensure(P.x, this.W / this.cam.zoom + 900);
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
    const tz = clamp(1.7 / Math.pow(P.size, 0.55), 0.3, 1.7) * this.zoomP * (this.state === 'title' ? 1.1 : 1);
    c.zoom = lerp(c.zoom, tz, 1 - Math.exp(-2.5 * dt));
    const tx = P.x + P.vx * 0.22; let ty = P.y + P.vy * 0.12;
    if (this.state === 'title') ty = Math.max(ty, 75);
    const k = 1 - Math.exp(-5 * dt);
    c.x = lerp(c.x, tx, k); c.y = lerp(c.y, ty, k);
    c.y = Math.max(c.y, -(this.H / 2) / c.zoom + 30);
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
    const left = cam.toWorldX(-120), right = cam.toWorldX(this.W + 120);
    const vis = [];
    for (const e of this.ents) if (e.x > left - e.r * e.size * 4 && e.x < right + e.r * e.size * 4) vis.push(e);
    vis.sort((a, b) => a.layer - b.layer);
    let drewPlayer = false;
    for (const e of vis) { if (!drewPlayer && e.layer >= 2) { P.draw(ctx); drewPlayer = true; } e.draw(ctx); }
    if (!drewPlayer) P.draw(ctx);
    for (const e of vis) if (e.type !== 'gib' && e.type !== 'proj' && !e.isBoss) e.drawHpBar(ctx);
    ctx.restore();
    this.fx.draw(ctx, cam);
    World.drawDecor(ctx, cam, 1, day);
    World.drawSurface(ctx, cam, day);
    World.drawNight(ctx, cam, day);
    this.fx.drawTexts(ctx, cam);
    UI.drawScreenFx(ctx);
    switch (this.state) {
      case 'title': UI.drawTitle(ctx); break;
      case 'play': case 'shedding': case 'dying': UI.drawHUD(ctx); break;
      case 'shed': UI.drawHUD(ctx); UI.drawShed(ctx); break;
      case 'dead': UI.drawDeath(ctx); break;
      case 'pause': UI.drawHUD(ctx); UI.drawPause(ctx); break;
      case 'help': UI.drawHelp(ctx); break;
    }
    if (this.settings.fps) Font.draw(ctx, this.fps + ' FPS', 4, this.H - 24, { color: '#80ff80' });
  },
};
window.addEventListener('load', () => G.init());
