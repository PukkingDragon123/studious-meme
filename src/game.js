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
      genes: { x: W - 42, y: 19, r: 16, label: 'G' },
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
        // the intro is playable, so the pads have to live through it too
        const playable = G.state === 'play' || G.state === 'intro';
        if (!playable) { this.mouse.clicked = true; if (this.inPad(P.pause, x, y)) this.pressed.Escape = true; continue; }
        // curled in the tank there is nothing to steer: every tap is a chomp
        if (G.state === 'intro' && G.intro && G.intro.phase === 'tank') { T.bite = true; T.biteHeld = true; T.biteId = t.identifier; T.holdT = 0.16; continue; }
        if (this.inPad(P.bite, x, y)) { T.bite = true; T.biteHeld = true; T.biteId = t.identifier; T.holdT = 0.16; }
        else if (this.inPad(P.dash, x, y)) { T.dash = true; T.dashId = t.identifier; }
        else if (this.inPad(P.pause, x, y)) this.pressed.KeyP = true;
        else if (G.state === 'play' && this.inPad(P.genes, x, y)) this.pressed.KeyG = true;
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
  engineNear: 0, menuT: 0, menuShake: 0, stageSel: undefined, pendingStage: null, loadRow: 0, loadCol: 0, loadout: { prime: 'none', hide: 'wild' }, settings: { gore: true, shake: true, mouseMove: true }, director: null, banner: null, deathInfo: null, deadT: 0, dyingT: 0, titleT: 0, lastTs: 0, prevState: 'title', fpsT: 0, frames: 0, fps: 60,
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
  storeSave() { const P = this.player; this.save.best = Math.max(this.save.best, this.score); this.save.bestLen = Math.max(this.save.bestLen, P.lengthFt); this.save.bestTier = Math.max(this.save.bestTier, P.tier); this.save.reach = Math.max(this.save.reach || 0, Math.round(P.x)); this.save.kills = Math.max(this.save.kills || 0, (this.save.kills || 0)); try { localStorage.setItem('chompers.save', JSON.stringify(this.save)); localStorage.setItem('chompers.settings', JSON.stringify(this.settings)); } catch (e) { } },
  startRun(demo = false, stage = null, load = null) {
    World.reset((Math.random() * 1e9) | 0);
    this.player = new Player(); this.ents = []; this.fx.clear(); this.score = 0; this.boss = null; this.banner = null; this.shedPending = false; this.deathInfo = null;
    this.stats = { eaten: 0, kills: 0, bosses: 0, boats: 0, structures: 0, biggest: '', biggestMass: 0, kinds: {} };
    this.nightCounted = false; this.newUnlocks = [];
    this.t = 0; this.day = 0.1; World.t = 0; this.timeScale = 1; this.slowT = 0; this.slowScale = 1; this.hitstopT = 0; this.red = 0; this.white = 0;
    this.director = { spawnT: 0, predT: 28, flockT: 6, bossQueue: null, bossT: 0 };
    this.startDiff = 0; this.stage = STAGES[0];
    this.cam.x = 0; this.cam.y = 60; this.cam.zoom = 1.6;
    World.ensure(0, 1400);
    Water.init(0); Mud.init(0); Weather.rain = 0; Weather.target = 0; Weather.timer = rand(40, 120);
    if (demo) {
      // the title runs a live game: a grown croc hunting the mangroves in morning light
      const DX = 5100;   // cypress swamp: deep open water with trees on both banks
      this.day = 0.24; Weather.rain = 0; Weather.target = 0; Weather.timer = 400;
      const P = this.player;
      P.size = 4.2; P.sizeTarget = 4.2; P.mass = sizeToMass(4.2); P.tier = tierFor(4.2); P.hp = P.maxHp;
      P.x = DX; P.y = 90; P.chain.reset(DX, 90, 0);
      this.cam.x = DX; this.cam.y = 70; this.cam.zoom = 1.45;
      World.ensure(DX, 1600); this.seedNursery(DX, 1); this.seedNursery(DX, -1);
      for (let i = 0; i < 20; i++) { this.director.spawnT = 0; this.populate(1.2); }
    }
    if (!demo) {
      this.runs++; this.save.runs++;
      const P = this.player;
      // the loadout is cosmetic plus one free gene; the stage sets where and how big
      if (load) {
        P.hide = load.hide || 'wild';
        const pg = Stages.primeGene(load.prime);
        if (pg) { P.genes.push(pg.id); P.primeGene = pg.id; }
        else P.genePoints += 1;                       // unspliced trades the gene for a point
        P.rebuildLook();
      }
      this.stage = stage || STAGES[0];
      this.storeSave();
      if (this.stage.intro) this.beginIntro();
      else this.beginAtStage(this.stage);
    }
  },
  // drop straight into a stretch of the swamp, already grown, already hunted
  beginAtStage(st) {
    const P = this.player, x = st.x;
    P.size = st.size; P.sizeTarget = st.size; P.mass = sizeToMass(st.size); P.tier = tierFor(st.size);
    P.recomputeStats(); P.hp = P.maxHp; P.hunger = 90;
    P.x = x; P.y = Math.max(24, World.floorY(x) * 0.4); P.chain.reset(P.x, P.y, 0);
    this.cam.x = x; this.cam.y = P.y;
    World.ensure(x, 2200); Water.init(x); Mud.init(x);
    this.startDiff = (st.diff || 0) * 0.35;   // position already carries most of it out there
    this.state = 'play'; this.intro = null;
    this.seedNursery(x, 1); this.seedNursery(x, -1);
    for (let i = 0; i < 16; i++) { this.director.spawnT = 0; this.populate(1 + (st.diff || 0)); }
    this.banner = st.kaiju
      ? { text: 'KAIJU PROTOCOL', sub: 'THE CITY IS AWAKE AND IT IS AFRAID OF YOU', t: 5, max: 5, color: '#ff6a40' }
      : { text: st.name, sub: st.sub, t: 4, max: 4, color: '#8ce8a0' };
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
    const dx = pick(120, 340); if (dx !== null && !World.isIndoor(dx)) Spawn.duck(dx);
  },
  // ---------- the intro: born in a tank, out through the sewer ----------
  beginIntro() {
    const P = this.player;
    const TANK = -2520;
    this.intro = { phase: 'tank', t: 0, taps: 0, need: 5, prompt: 0, shake: 0 };
    World.ensure(TANK, 2600);
    const tank = new Structure(TANK, 'tank'); this.add(tank); this.intro.tank = tank;
    // the people who made you, watching through the glass
    for (const [ox, dir] of [[-72, 1], [-104, 1], [78, -1]]) {
      const s2 = new LandAnimal(TANK + ox, 'scientist'); s2.facing = dir; s2.state = 'idle'; s2.stateT = 99; s2.watching = true; this.add(s2);
    }
    const desk = new Structure(TANK + 150, 'console'); this.add(desk);
    // the grate at the end of the run
    const grate = new Structure(-150, 'grate'); this.add(grate); this.intro.grate = grate;
    // a few rats and roaches to eat on the way out
    for (let i = 0; i < 9; i++) { const rx = -2150 + i * 210 + rand(-40, 40); if (World.floorY(rx) < -2) this.add(new LandAnimal(rx, 'rat')); else this.add(new Bottom(rx, 'roach')); }
    for (let i = 0; i < 6; i++) { const rx = -2000 + i * 300; Spawn.school(rx, clamp(World.floorY(rx) - 12, 6, 30), chance(0.5) ? 'minnow' : 'shiner'); }
    P.x = TANK; P.y = World.floorY(TANK) - 42; P.angle = -0.3; P.facing = 1; P.frozen = true; P.hidden = false;
    P.chain.reset(P.x, P.y, -0.3);
    this.cam.x = TANK; this.cam.y = World.floorY(TANK) - 46; this.cam.zoom = 2.6;
    this.state = 'intro'; this.banner = null;
    SFX.peep();
  },
  crackTank() {
    const e = this.intro; if (!e || e.phase !== 'tank') return;
    e.taps++; e.shake = 1;
    this.shake(4 + e.taps * 2); this.hitstop(0.04);
    SFX.crack(e.taps); if (chance(0.5)) SFX.peep();
    if (e.tank) e.tank.cracks = e.taps / e.need;
    for (let i = 0; i < 5 + e.taps * 4; i++) {
      const a = rand(-Math.PI, 0), sp = rand(40, 140);
      this.fx.add({ type: 'splinter', x: this.player.x + rand(-10, 10), y: this.player.y + rand(-10, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 1, w: randi(1, 3), color: choice(['#cfeef4', '#9fc4cc', '#e8f4f8']), rot: rand(TAU), vr: rand(-8, 8), life: rand(1.5, 3) });
    }
    if (e.taps >= e.need) this.breakTank();
  },
  breakTank() {
    const e = this.intro, P = this.player;
    e.phase = 'escape'; e.t = 0; if (e.tank) e.tank.broken = true;
    this.whiteFlash(0.6); this.shake(16); this.slowmo(0.3, 1); SFX.hatch(); SFX.splinter(0);
    for (let i = 0; i < 60; i++) {
      const a = rand(-Math.PI, 0.5), sp = rand(60, 260);
      this.fx.add({ type: 'splinter', x: P.x + rand(-24, 24), y: P.y + rand(-40, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 1, w: randi(2, 5), color: choice(['#cfeef4', '#9fc4cc', '#e8f4f8', '#7fa8b0']), rot: rand(TAU), vr: rand(-10, 10), life: rand(3, 6) });
    }
    for (let i = 0; i < 34; i++) this.fx.add({ type: 'drop', x: P.x + rand(-30, 30), y: P.y + rand(-30, 10), vx: rand(-160, 160), vy: rand(-40, 120), s: randi(1, 2), color: choice(['#8ce8a0', '#3f9a54', '#cfeef4']), life: 2.4 });
    this.fx.cloud(P.x, P.y, 46, '#3f9a54', 3);
    P.frozen = false; P.vx = 120; P.vy = -60;
    // everyone in the room runs
    for (const en of this.ents) if (en.type === 'land' && en.watching) { en.watching = false; en.state = 'flee'; en.stateT = 20; en.panicked = true; SFX.scream(en.pan); }
    this.banner = { text: 'SUBJECT 7 IS LOOSE', sub: 'FOLLOW THE PIPE EAST', t: 5, max: 5, color: '#8ce8a0' };
  },
  onChunkLoad(ch, rng) {
    if (this.state === 'title' && Math.abs(ch.x0) > 700) return;
    const P = this.player, D = this.difficulty();
    // human activity: structures cluster where there is water access
    if (rng() < 0.75) { for (let a = 0; a < 3; a++) { const sx = ch.x0 + rng() * World.CHUNK; if (Math.abs(sx - P.x) < 320) continue; if (trySpawnStructure(sx, rng, D)) break; } }
    const B = Biome.at(ch.x0);
    for (let k = 0; k < 5; k++) {
      const x = ch.x0 + rng() * World.CHUNK; if (Math.abs(x - P.x) < 260) continue;
      const Bx = Biome.at(x);
      if (Bx.indoor && rng() < 0.5) continue;
      const fy = World.floorY(x);
      if (fy < -3) { if (rng() < 0.6) this.spawnLand(x, D); continue; }
      if (fy < 30) { if (!Bx.indoor && rng() < 0.45) this.add(new Bird(x, 0, choice(['heron', 'egret', 'ibis', 'snowy', 'limpkin']), 'wade')); else if (rng() < 0.4) this.add(new Bottom(x, Bx.id === 'outfall' || Bx.indoor ? 'roach' : 'crayfish')); continue; }
      if (Bx.indoor && !Bx.fish.length) continue;
      const kind = weightedPick(Bx.fish.concat(Bx.indoor ? [['bottom', 2]] : [['frog', 1.4], ['turtle', 1.4], ['bottom', 2], ['duck', 1]]));
      if (!kind) continue;
      if (kind === 'frog') this.add(new Frog(x, chance(0.3) ? 'pigfrog' : 'frog'));
      else if (kind === 'turtle') this.add(new Turtle(x, clamp(40 + rng() * 100, 10, fy - 15), choice(['turtle', 'slider', 'cooter'])));
      else if (kind === 'bottom') this.add(new Bottom(x, B.id === 'outfall' ? 'roach' : choice(['crayfish', 'crab', 'snail', 'shrimp', 'fiddler'])));
      else if (kind === 'duck') Spawn.duck(x);
      else if (SPECIES[kind]) { const d = SPECIES[kind], band = d.band || [10, 200]; Spawn.school(x, d.nearFloor ? fy - 30 : clamp(rand(band[0], band[1]), 10, fy - 15), kind); }
    }
  },
  openStages() {
    this.state = 'stages'; this.menuT = 0; this.menuShake = 0;
    if (this.stageSel === undefined) {
      // land on the furthest stage the save has opened, that is where you left off
      let best = 0; STAGES.forEach((st, i) => { if (Stages.unlocked(st)) best = i; });
      this.stageSel = best;
    }
    SFX.ui();
  },
  openLoadout(st) {
    this.pendingStage = st; this.state = 'loadout'; this.menuT = 0;
    this.loadRow = 0; this.loadCol = Math.max(0, PRIMES.findIndex(p => p.id === this.loadout.prime));
    SFX.ui();
  },
  openGenes() { this.state = 'genes'; this.geneUiT = 0; if (!this.geneSel) this.geneSel = 'core'; this.player.newPoints = 0; SFX.ui(); },
  add(e) { this.ents.push(e); return e; },
  panOf(x) { return clamp((x - this.cam.x) / 450, -1, 1); },
  hitstop(t) { this.hitstopT = Math.max(this.hitstopT, t); },
  shake(a) { if (!this.settings.shake) a *= 0.25; this.shakeAmt = Math.min(22, Math.max(this.shakeAmt, a)); },
  slowmo(scale, dur) { this.slowScale = Math.min(this.slowScale, scale); this.slowT = Math.max(this.slowT, dur); },
  zoomPunch(k) { this.zoomP = k; },
  redFlash(a) { this.red = Math.max(this.red, a); },
  whiteFlash(a) { this.white = Math.max(this.white, a); },
  addScore(n) { this.score += Math.round(n); },
  difficulty() { const P = this.player; return (this.startDiff || 0) + P.sheds + Math.abs(P.x) / 3500 + this.t / 300; },
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
  // growing into a new tier: shed the skin, gain a gene point, no menu
  growTier(tier) {
    const P = this.player;
    P.tier = Math.min(tier, TIERS.length - 1); P.sheds++;
    P.hp = P.maxHp; P.lastMax = P.maxHp; P.invuln = 1.6; P.hunger = Math.max(P.hunger, 55);
    P.genePoints += 2; P.newPoints += 2;
    this.slowmo(0.35, 0.7); SFX.shed(); this.whiteFlash(0.45); this.shake(6);
    const n = P.chain.nodes;
    for (let i = 0; i < n.length; i++) { const part = i === 0 ? P.parts.head : i <= 5 ? P.parts.body[i - 1] : P.parts.tail[i - 6]; this.fx.husk(part.c, 0, 0, part.w, part.h, n[i].x, n[i].y, n[i].a, P.vis / CROC_PX, P.facing); }
    for (let i = 0; i < 16; i++) this.fx.glow(P.x + rand(-40, 40) * P.vis, P.y + rand(-16, 16) * P.vis, rand(2, 5) * P.vis, '#ffffff', rand(0.4, 1.0));
    this.fx.bubbles(P.x, P.y, 30, 30 * P.vis, -20);
    this.banner = { text: TIERS[P.tier].name, sub: 'SHED YOUR SKIN  +2 GENE POINTS', t: 3, max: 3, color: '#9ad8b0' };
    if (BOSSES[P.sheds]) { this.director.bossQueue = BOSSES[P.sheds]; this.director.bossT = 9; }
    if (P.tier >= TIERS.length - 1) { Meta.event('swampgod'); for (const t2 of Meta.checkUnlocks()) this.announceUnlock(t2); Meta.save(); }
    this.storeSave();
  },
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
    d.flockT -= dt; if (d.flockT <= 0) { d.flockT = rand(9, 20); if (!World.isIndoor(P.x)) { const dir = chance(0.5) ? 1 : -1, halfW = this.W / this.cam.zoom / 2; Spawn.flock(P.x - dir * (halfW + 140), dir, choice(['egret', 'ibis', 'heron', 'egret']), randi(2, 6)); } }
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
    if (fishCount >= target) { if (landCount < 4 && chance(0.35)) { const bx = World.findX(P.x + (chance(0.5) ? 1 : -1) * (halfW + 300), x => World.floorY(x) < -5, 1400, 40); if (bx !== null && Math.abs(bx - P.x) > halfW * 0.7) this.spawnLand(bx, D); } return; }
    const side = chance(0.5) ? 1 : -1, x = P.x + side * (halfW + rand(80, 520)), fy = World.floorY(x);
    if (fy < 20) { this.spawnLand(x, D); return; }
    const B = Biome.at(x);
    if (B.indoor && !B.fish.length) return;  // nothing swims in a dry containment cell
    const sky = !B.indoor;                   // no ducks or herons under a concrete roof
    // the biome decides what lives here; difficulty only gates the dangerous half
    const table = B.fish.map(([k, w]) => { const sp = SPECIES[k]; const hard = sp ? sizeClassOf(sp.ft) : 1; return [k, hard > 2.5 && D < 1.2 ? w * 0.15 : hard > 4 && D < 2.2 ? w * 0.3 : w]; });
    const extra = [['frog', B.indoor ? 0.4 : 1.6], ['turtle', B.indoor ? 0 : D >= 0.4 ? 1.8 : 0.7], ['bottom', 2.2], ['duck', sky ? 1 : 0], ['heron', sky ? 1.2 : 0], ['divebird', sky ? 1.4 : 0], ['vulture', sky ? 0.5 : 0], ['dragonfly', sky ? 1 : 0], ['babygator', B.indoor ? 0 : D >= 0.5 ? 1.2 : 0]];
    if (fy > 180 && D >= 0.6) extra.push(['ray', 1.2]);
    if (D >= 1) extra.push(['moccasin', 0.9]);
    if (B.town && D >= 1.2) extra.push(['kayak', 0.7], ['pontoon', 0.8]);
    const kind = weightedPick(table.concat(extra));
    if (kind === 'mullet') { const n = randi(4, 8); const lead = new Mullet(x, clamp(rand(10, 70), 8, fy - 15)); this.add(lead); for (let i = 1; i < n; i++) this.add(new Mullet(x + rand(-30, 30), lead.y + rand(-16, 16), lead)); }
    else if (kind === 'babygator') Spawn.school(x, clamp(rand(10, 60), 8, fy - 15), 'babygator');
    else if (SPECIES[kind] && SPECIES[kind].cat === 'fish') { const d = SPECIES[kind]; const y = d.nearFloor ? fy - 30 : clamp(rand((d.band || [10, 200])[0], (d.band || [10, 200])[1]), 10, fy - 15); Spawn.school(x, y, kind); }
    else if (kind === 'frog') this.add(new Frog(x, chance(0.3) ? 'pigfrog' : 'frog'));
    else if (kind === 'turtle') this.add(new Turtle(x, clamp(rand(30, 150), 10, fy - 15), weightedPick([['turtle', 2], ['slider', 2], ['cooter', 1.5], ['softshell', 1], ['gatorsnapper', D >= 1.5 ? 1 : 0]])));
    else if (kind === 'bottom') { const n = randi(1, 3); const kinds = B.id === 'outfall' ? [['roach', 3], ['crayfish', 2]] : B.id === 'bay' ? [['crab', 3], ['shrimp', 2], ['fiddler', 1.5]] : [['crayfish', 3], ['crab', 2], ['snail', 1.5], ['shrimp', 1.5], ['fiddler', 1]]; for (let i = 0; i < n; i++) this.add(new Bottom(x + rand(-40, 40), weightedPick(kinds))); }
    else if (kind === 'ray') this.add(new Ray(x));
    else if (kind === 'duck') Spawn.duck(x);
    else if (kind === 'dragonfly') { const n = randi(1, 3); for (let i = 0; i < n; i++) this.add(new Dragonfly(x + rand(-40, 40))); }
    else if (kind === 'divebird') { const k2 = choice(['anhinga', 'osprey', 'pelican', 'cormorant', 'kingfisher']); this.add(new DiveBird(x, -rand(70, 150), k2, -side)); }
    else if (kind === 'vulture') this.add(new Vulture(x, -rand(120, 180), -side));
    else if (kind === 'heron') { const hx = World.findX(x, xx => { const f = World.floorY(xx); return f > 4 && f < 44; }, 500, 12); const wader = choice(['heron', 'egret', 'snowy', 'ibis', 'spoonbill', 'woodstork', 'littleblue', 'tricolor', 'limpkin', 'gallinule']); if (hx !== null) this.add(new Bird(hx, 0, wader, 'wade')); else Spawn.flock(x, -side, 'egret', 2); }
    else if (kind === 'kayak') this.add(new Kayak(x, -side));
    else if (kind === 'pontoon') { const wx = World.findX(x, xx => World.floorY(xx) > 60, 500, 30); if (wx !== null) Spawn.boat(wx, chance(0.5) ? 'pontoon' : 'jon', -side); }
    else if (kind === 'moccasin') this.add(new Snake(x, 4, 'moccasin'));
  },
  spawnLand(x, D) {
    if (World.floorY(x) > -3) return;
    const B = Biome.at(x);
    const table = B.land.map(([k, w]) => { const sp = SPECIES[k]; const hard = sp ? sizeClassOf(sp.ft) : 1; return [k, hard > 3 && D < 1.6 ? w * 0.2 : w]; });
    if (B.town || D >= 1) table.push(['fisherman', B.town ? 2 : 1], ['tourist', B.town ? 2.4 : 0.8]);
    if (B.id === 'campground') table.push(['camper', 3]);
    if (D >= 1.6) table.push(['ranger', 1], ['poacher', D >= 2.4 ? 1.4 : 0]);
    if (!B.indoor) table.push(['heron', 1.2]);
    const k = weightedPick(table);
    if (!k) return;
    if (k === 'heron') this.add(new Bird(x, 0, choice(['heron', 'egret', 'ibis']), 'wade'));
    else this.add(new LandAnimal(x, k));
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
    if (D >= 3 && fy > 300 && (Biome.at(x).id === 'river' || Biome.at(x).id === 'bay')) opts.push(['shark', 3]);
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
        else if (Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ') || Input.mouse.clicked) { SFX.init(); SFX.resume(); SFX.ui(); this.openStages(); }
        break;
      case 'stages': {
        this.menuT += raw; this.updateWorld(dt, true);
        const list = STAGES;
        if (Input.hit('Escape', 'KeyH')) { this.state = 'title'; SFX.ui(); break; }
        const rows = UI.stageRows();
        if (Input.mouse.moved || Input.mouse.clicked) { for (let i = 0; i < rows.length; i++) { const r = rows[i]; if (Input.mouse.x > r.x && Input.mouse.x < r.x + r.w && Input.mouse.y > r.y && Input.mouse.y < r.y + r.h) this.stageSel = i; } }
        if (Input.hit('ArrowUp', 'KeyW')) { this.stageSel = (this.stageSel + list.length - 1) % list.length; SFX.ui(); }
        if (Input.hit('ArrowDown', 'KeyS')) { this.stageSel = (this.stageSel + 1) % list.length; SFX.ui(); }
        const rowHit = Input.mouse.clicked && rows.some((r, i) => i === this.stageSel && Input.mouse.x > r.x && Input.mouse.x < r.x + r.w && Input.mouse.y > r.y && Input.mouse.y < r.y + r.h);
        if (Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ') || rowHit) {
          const st = list[this.stageSel];
          if (Stages.unlocked(st)) { this.openLoadout(st); } else { SFX.hurt && SFX.hurt(); this.menuShake = 0.3; }
        }
        if (this.menuShake > 0) this.menuShake -= raw;
        break;
      }
      case 'loadout': {
        this.menuT += raw; this.updateWorld(dt, true);
        if (Input.hit('Escape')) { this.state = 'stages'; SFX.ui(); break; }
        const cells = UI.loadoutCells();
        if (Input.mouse.moved || Input.mouse.clicked) {
          for (const c of cells) if (Input.mouse.x > c.x && Input.mouse.x < c.x + c.w && Input.mouse.y > c.y && Input.mouse.y < c.y + c.h) { this.loadRow = c.row; this.loadCol = c.i; }
        }
        const n0 = (this.loadRow || 0) === 0 ? PRIMES.length : HIDES.length;
        if (Input.hit('ArrowLeft', 'KeyA')) { this.loadCol = (this.loadCol + n0 - 1) % n0; SFX.ui(); }
        if (Input.hit('ArrowRight', 'KeyD')) { this.loadCol = (this.loadCol + 1) % n0; SFX.ui(); }
        if (Input.hit('ArrowUp', 'KeyW') || Input.hit('ArrowDown', 'KeyS')) {
          // jump to the row's current pick rather than resetting it to the first cell
          this.loadRow = (this.loadRow || 0) === 0 ? 1 : 0;
          this.loadCol = this.loadRow === 0
            ? Math.max(0, PRIMES.findIndex(x2 => x2.id === this.loadout.prime))
            : Math.max(0, HIDES.findIndex(x2 => x2.id === this.loadout.hide));
          SFX.ui();
        }
        // read the row after the arrows, and never select a locked morph
        const row = this.loadRow || 0;
        if (row === 0) this.loadout.prime = PRIMES[clamp(this.loadCol, 0, PRIMES.length - 1)].id;
        else { const h = HIDES[clamp(this.loadCol, 0, HIDES.length - 1)]; if (Stages.met(h.need)) this.loadout.hide = h.id; }
        const go = UI.loadoutGoRect();
        const goHit = Input.mouse.clicked && Input.mouse.x > go.x && Input.mouse.x < go.x + go.w && Input.mouse.y > go.y && Input.mouse.y < go.y + go.h;
        if (Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ') || goHit) { SFX.ui(); this.startRun(false, this.pendingStage, this.loadout); }
        break;
      }
      case 'intro': {
        const e = this.intro;
        e.t += raw; e.prompt += raw; e.shake = Math.max(0, e.shake - raw * 3.5);
        this.updateWorld(dt, false);
        if (e.phase === 'tank') {
          const P = this.player;
          // curled into a C inside the glass, drifting in the acid
          P.frozen = true; P.facing = 1;
          const tx = e.tank ? e.tank.x : P.x, ty = World.floorY(tx) - 52 + Math.sin(e.t * 1.4) * 2;
          const R0 = 17, spin = Math.sin(e.t * 0.7) * 0.25 + e.taps * 0.12;
          const n = P.chain.nodes;
          for (let i = 0; i < n.length; i++) {
            const u = i / (n.length - 1), a = -1.5 + spin + u * 4.4;
            n[i].x = tx + Math.cos(a) * R0 * (1 - u * 0.16); n[i].y = ty + Math.sin(a) * R0 * (1 - u * 0.16);
            n[i].a = a + Math.PI / 2;
          }
          P.x = n[0].x; P.y = n[0].y; P.angle = n[0].a;
          if (chance(raw * 7)) this.fx.bubbles(tx + rand(-10, 10), ty + 14, 1, 4, -14);
          this.cam.zoom = lerp(this.cam.zoom, 2.6 - e.taps * 0.12, 0.05);
          if (Input.bitePressed() || Input.hit('Enter') || Input.mouse.clicked || Input.dashPressed()) this.crackTank();
          if (e.t > 22) this.breakTank();
        } else {
          this.runDirector(dt);
          if (this.player.x > -110 && (!e.grate || e.grate.broken)) { this.state = 'play'; this.intro = null; }
        }
        if (Input.hit('Escape', 'KeyP')) { this.state = 'pause'; SFX.ui(); }
        break;
      }
      case 'play':
        if (Input.hit('Escape', 'KeyP')) { this.state = 'pause'; SFX.ui(); break; }
        if (Input.hit('KeyG', 'KeyE', 'Tab')) { this.openGenes(); break; }
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
      case 'genes': {
        const P = this.player;
        if (Input.hit('Escape', 'KeyG', 'KeyE', 'Tab', 'Enter')) { this.state = 'play'; SFX.ui(); break; }
        const cells = UI.geneCells();
        if (Input.mouse.clicked && dist(Input.mouse.x, Input.mouse.y, this.W - 22, 16) < 15) { this.state = 'play'; SFX.ui(); break; }
        if (Input.mouse.moved || Input.mouse.clicked) {
          let best = null, bd = (cells[0] ? cells[0].R : 25) + 1;
          for (const c of cells) { const d = dist(Input.mouse.x, Input.mouse.y, c.sx, c.sy); if (d < bd) { bd = d; best = c; } }
          if (best) this.geneSel = best.g.id;
        }
        if (Input.hit('ArrowLeft', 'KeyA') || Input.hit('ArrowRight', 'KeyD') || Input.hit('ArrowUp', 'KeyW') || Input.hit('ArrowDown', 'KeyS')) {
          const cur = cells.find(c => c.g.id === this.geneSel) || cells[0];
          const dx = Input.hit('ArrowLeft', 'KeyA') ? -1 : Input.hit('ArrowRight', 'KeyD') ? 1 : 0;
          const dy = Input.hit('ArrowUp', 'KeyW') ? -1 : Input.hit('ArrowDown', 'KeyS') ? 1 : 0;
          let best = null, bd = 1e9;
          for (const c of cells) { if (c === cur) continue; const ox = c.sx - cur.sx, oy = c.sy - cur.sy; if (ox * dx + oy * dy <= 4) continue; const d = Math.hypot(ox, oy) + Math.abs(ox * dy - oy * dx) * 1.5; if (d < bd) { bd = d; best = c; } }
          if (best) { this.geneSel = best.g.id; SFX.ui(); }
        }
        const take = Input.hit('Space', 'KeyJ', 'KeyZ') || (Input.mouse.clicked && cells.some(c => c.g.id === this.geneSel && dist(Input.mouse.x, Input.mouse.y, c.sx, c.sy) < c.R + 1));
        if (take) {
          const g = GENE_BY_ID[this.geneSel];
          if (g && Genome.buy(P, g)) {
            SFX.pick(); SFX.levelup(); this.whiteFlash(0.3); this.shake(4);
            this.fx.glow(P.x, P.y, 60 * P.vis, LINEAGES[g.lin] ? LINEAGES[g.lin].color : '#ffffff', 0.8);
            this.banner = { text: g.name, sub: g.apex ? 'APEX GENE SPLICED' : 'GENE SPLICED', t: 2.6, max: 2.6, color: g.lin ? LINEAGES[g.lin].color : '#ffffff' };
          } else SFX.clank();
        }
        break;
      }
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
    let x = Math.cos(t * 0.45) * 0.8, y = Math.sin(t * 0.9) * 0.3 + (P.y < 34 ? 0.8 : 0) + (P.y > 104 ? -0.8 : 0);
    if (P.x > 500) x = -1; if (P.x < -500) x = 1;
    let bite = false;
    for (const e of this.ents) if (e.type === 'fish' && !e.dead && dist(e.x, e.y, P.x, P.y) < 60) { const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1; x = dx / d; y = dy / d; if (d < 26 && P.biteCd <= 0) bite = true; break; }
    return { x, y, bite, dash: false };
  },
  updateWorld(dt, demo) {
    this.t += dt; World.t += dt;
    // ambience: the swamp is never completely still
    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT <= 0) {
      this.ambT = 0.13;
      const halfW = this.W / this.cam.zoom / 2 + 70, wx = this.cam.x + rand(-halfW, halfW);
      const fy = World.floorY(wx), su = World.surface(wx);
      if (fy > su + 24) {
        if (chance(0.45)) this.fx.bubbles(wx, fy - rand(1, 6), 1, 3, 8);        // marsh gas off the bed
        else if (chance(0.2)) this.fx.ripple(wx, 2, 0.22);                       // something rising
      } else if (fy < -6 && !World.isIndoor(wx) && chance(0.4)) {
        this.fx.leaf(wx, fy - rand(24, 140), choice(['#7a8a4a', '#9aa860', '#c8b070', '#8a9a58']));
      }
    }
    const prevDay = this.day; this.day = (this.day + dt / 420) % 1;
    if (this.state === 'play') {
      if (prevDay < 0.62 && this.day >= 0.62) this.nightCounted = false;
      if (!this.nightCounted && this.day >= 0.95) { this.nightCounted = true; Meta.event('night'); for (const t2 of Meta.checkUnlocks()) this.announceUnlock(t2); Meta.save(); }
    }
    const P = this.player;
    const [ax, ay] = Input.axis();
    if (demo === 'egg') demo = false;
    const act = this.state === 'play' || (this.state === 'intro' && this.intro && this.intro.phase !== 'tank');
    const inp = demo ? this.demoInput() : { x: ax, y: ay, bite: act && Input.bitePressed(), dash: act && Input.dashPressed() };
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
    const tz = clamp(1.2 / Math.pow(P.vis, 0.92), 0.22, 1.35) * this.zoomP * (this.state === 'title' ? 1.1 : 1);
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
    const indoor = World.isIndoor(cam.x);
    if (indoor) World.drawIndoor(ctx, cam, day);
    else { World.drawSky(ctx, cam, day); World.drawParallax(ctx, cam, day); }
    World.drawWater(ctx, cam, day);
    World.drawTerrain(ctx, cam);
    World.drawDepthShade(ctx, cam);
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
    // contact shadows: anything on or just above land gets one, so creatures sit
    // on the ground instead of hovering over it
    ctx.globalAlpha = 0.26; ctx.fillStyle = '#080d06';
    const shadow = (ex, ey, rr) => {
      const fy = World.floorY(ex);
      if (fy > 8) return;
      const d = fy - ey;
      if (d < -6 || d > 40) return;
      const k = 1 - Math.max(0, d) / 40, w = Math.max(1.5, rr * 1.6 * k);
      // stacked rects rather than an arc: matches the pixel look and costs a
      // fraction of a filled path when a hundred creatures are on screen
      const h = Math.max(1, w * 0.26);
      ctx.fillRect(ex - w, fy - 1 - h * 0.5, w * 2, h);
      ctx.fillRect(ex - w * 0.72, fy - 1 - h, w * 1.44, h * 2);
    };
    for (const e of vis) { if (e.type === 'gib' || e.type === 'proj' || e.type === 'structure') continue; shadow(e.x, e.y, (e.r || 5) * (e.size || 1)); }
    if (P.onLand || World.floorY(P.x) < 8) shadow(P.x, P.y, 9 * P.vis);
    ctx.globalAlpha = 1;
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
      case 'stages': UI.drawStages(ctx); break;
      case 'loadout': UI.drawLoadout(ctx); break;
      case 'intro': UI.drawIntro(ctx); break;
      case 'play': case 'shedding': case 'dying': UI.drawHUD(ctx); break;
      case 'genes': UI.drawGenes(ctx); break;
      case 'shed': UI.drawShed(ctx); break;
      case 'dead': UI.drawDeath(ctx); break;
      case 'pause': UI.drawHUD(ctx); UI.drawPause(ctx); break;
      case 'help': UI.drawHelp(ctx); break;
      case 'codex': UI.drawCodex(ctx); break;
    }
    if ((this.state === 'play' || this.state === 'intro') && (this.touchUI || Input.touch.active) && this.settings.touch !== false) UI.drawTouch(ctx);
    if (this.settings.fps) Font.draw(ctx, this.fps + ' FPS', 4, this.H - 24, { color: '#80ff80' });
  },
};
window.addEventListener('load', () => G.init());
