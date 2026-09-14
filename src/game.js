'use strict';
const Input = {
  keys: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, rdown: false, clicked: false, rclicked: false, moved: false },
  touch: { active: false, menuId: null, joy: false, jx: 0, jy: 0, jid: null, sx: 0, sy: 0, cx: 0, cy: 0, bite: false, dash: false, brace: false, biteHeld: false, dashHeld: false, biteId: null, dashId: null, braceId: null, holdT: 0, autoBite: false },
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
      brace: { x: W - 100, y: H - 88, r: 21, label: 'BRACE' },
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
        if (!playable) { this.mouse.clicked = true; this.mouse.down = true; T.menuId = t.identifier; if (this.inPad(P.pause, x, y)) this.pressed.Escape = true; continue; }
        // curled in the tank there is nothing to steer: every tap is a chomp
        if (G.state === 'intro' && G.intro && G.intro.phase === 'tank') { T.bite = true; T.biteHeld = true; T.biteId = t.identifier; T.holdT = 0.16; continue; }
        if (this.inPad(P.bite, x, y)) { T.bite = true; T.biteHeld = true; T.biteId = t.identifier; T.holdT = 0.16; }
        else if (this.inPad(P.dash, x, y)) { T.dash = true; T.dashHeld = true; T.dashId = t.identifier; }
        else if (this.inPad(P.brace, x, y)) { T.brace = true; T.braceId = t.identifier; }
        else if (this.inPad(P.pause, x, y)) this.pressed.KeyP = true;
        else if (G.state === 'play' && this.inPad(P.genes, x, y)) this.pressed.KeyG = true;
        else if (x < P.joyMax && !T.joy) { T.joy = true; T.jid = t.identifier; T.sx = x; T.sy = y; T.cx = x; T.cy = y; T.jx = 0; T.jy = 0; }
        else T.bite = true;
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        // a finger dragged across a menu is a pointer, so screens like the globe
        // can be pushed around the same way they are with a mouse
        if (t.identifier === T.menuId) { const [mx, my] = tpos(t); this.mouse.x = mx; this.mouse.y = my; this.mouse.moved = true; continue; }
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
        if (t.identifier === T.menuId) { T.menuId = null; this.mouse.down = false; }
        if (t.identifier === T.jid) { T.joy = false; T.jid = null; T.jx = 0; T.jy = 0; }
        if (t.identifier === T.biteId) { T.biteHeld = false; T.biteId = null; }
        if (t.identifier === T.dashId) { T.dashId = null; T.dashHeld = false; }
        if (t.identifier === T.braceId) T.braceId = null;
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
  endFrame() { this.pressed = {}; this.mouse.clicked = false; this.mouse.rclicked = false; this.touch.bite = false; this.touch.dash = false; this.touch.brace = false; },
  axis() {
    let x = 0, y = 0;
    if (this.down('ArrowLeft', 'KeyA')) x -= 1; if (this.down('ArrowRight', 'KeyD')) x += 1; if (this.down('ArrowUp', 'KeyW')) y -= 1; if (this.down('ArrowDown', 'KeyS')) y += 1;
    if (this.touch.joy) { x = this.touch.jx; y = this.touch.jy; }
    else if (this.mouse.down && x === 0 && y === 0 && G.settings.mouseMove && G.player) { const [wx, wy] = G.cam.toWorld(this.mouse.x, this.mouse.y); const dx = wx - G.player.x, dy = wy - G.player.y, d = Math.hypot(dx, dy); if (d > 10) { x = dx / d; y = dy / d; } }
    return [x, y];
  },
  bitePressed() { return this.hit('Space', 'KeyJ', 'KeyZ') || this.mouse.rclicked || this.touch.bite || this.touch.autoBite; },
  dashPressed() { return this.hit('ShiftLeft', 'ShiftRight', 'KeyK', 'KeyX') || this.touch.dash; },
  // held, not tapped: the button is a throttle now, and only becomes a leap
  // when you are pointing up out of the water
  dashHeld() { return this.down('ShiftLeft', 'ShiftRight', 'KeyK', 'KeyX') || this.touch.dashHeld; },
  // third action: a short brace that turns an incoming hit into a counter
  bracePressed() { return this.hit('KeyL', 'KeyV', 'ControlLeft') || this.touch.brace; },
};

// Each zone keeps its own roster: two minis that turn up as you shed, and one
// world boss that only comes for a full-grown animal. Which one you meet is
// decided by where you are standing, not by a global schedule.
const ZONE_BOSSES = {
  river:  { mini: ['broodmother', 'gnasher'], world: 'sludgeking' },
  glades: { mini: ['oldscar', 'warboat', 'python'], world: 'skunkape' },
  ocean:  { mini: ['anvil', 'greenwall'], world: 'lantern' },
};
// the fish-shaped bosses are all the same job with different numbers
const FISH_BOSS = {
  gnasher:    { kind: 'mutantcat', name: 'THE GNASHER', size: 2.6, cls: 1.2, hp: 900, mass: 700, spd: 150, gibs: 6, depth: 70 },
  sludgeking: { kind: 'sewereel', name: 'THE SLUDGE KING', size: 3.6, cls: 1.7, hp: 1900, mass: 1700, spd: 170, gibs: 7, depth: 120 },
  anvil:      { kind: 'hammer', name: 'THE ANVIL', size: 2.2, cls: 1.35, hp: 1600, mass: 1500, spd: 200, gibs: 6, depth: 220 },
  greenwall:  { kind: 'moray', name: 'THE GREEN WALL', size: 3.0, cls: 1.45, hp: 1400, mass: 1200, spd: 140, gibs: 6, depth: 300 },
  lantern:    { kind: 'anglerfish', name: 'THE LANTERN', size: 4.2, cls: 1.9, hp: 2600, mass: 2400, spd: 155, gibs: 8, depth: 760, glow: '#7affda' },
};
// how many phase breaks a boss walks through, what it calls in, and the line
// it gets on each break
const BOSS_SPEC = {
  oldscar:  { phases: 3, hp: 1.6, adds: ['gator', 'gator', 'moccasin'], cue: ['IT REMEMBERS YOU', 'NOTHING LEFT TO LOSE'] },
  warboat:  { phases: 3, hp: 1.5, adds: ['poacher'], cue: ['THEY CALLED IT IN', 'ALL GUNS'] },
  python:   { phases: 3, hp: 1.5, adds: ['moccasin', 'moccasin'], cue: ['THE NEST WOKE UP', 'IT COILS TIGHTER'] },
  skunkape: { phases: 4, hp: 1.4, adds: ['boar', 'boar'], cue: ['IT STOPPED THROWING', 'THE TREES COME WITH IT', 'NOTHING HUMAN LEFT'] },
  shark:    { phases: 3, hp: 1.5, adds: ['gator'], cue: ['THE WATER GOES QUIET', 'IT SMELLS YOU BLEEDING'] },
  broodmother: { phases: 3, hp: 1.5, adds: ['rat', 'rat', 'bigrat'], cue: ['THE LITTER COMES WITH HER', 'SHE HAS NOWHERE TO RUN'] },
  gnasher:  { phases: 3, hp: 1.4, adds: ['piranha', 'piranha'], cue: ['THE SHOAL TURNS WITH IT', 'IT STOPS PRETENDING TO BE A FISH'] },
  sludgeking: { phases: 4, hp: 1.6, adds: ['sewereel', 'piranha'], cue: ['THE WATER GOES BLACK', 'IT FILLS THE GALLERY', 'THE SYSTEM IS ITS BODY'] },
  anvil:    { phases: 3, hp: 1.5, adds: ['barracuda', 'barracuda'], cue: ['IT CIRCLES WIDER', 'IT HAS DECIDED'] },
  greenwall: { phases: 3, hp: 1.5, adds: ['moray'], cue: ['IT COMES OUT OF THE HOLE', 'ALL OF IT COMES OUT'] },
  lantern:  { phases: 4, hp: 1.7, adds: ['anglerfish', 'isopod'], cue: ['THE LIGHT GOES OUT', 'SOMETHING ELSE LIGHTS UP', 'IT WAS NEVER A FISH'] },
};
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
  player: null, ents: [], fx: null, score: 0, stats: null, save: null, boss: null, mission: null, story: null, dispatch: null, labWipe: null, wipeIn: 0, finisher: null, morph: null, drop: null, embryo: null, labSel: undefined, shedPending: false, shedCards: null, shedSel: 0, shedT: 0, shedUiT: 0, shedTier: 0,
  engineNear: 0, menuT: 0, menuShake: 0, globeSpin: 0, globeTilt: 0.3, stageSel: undefined, pendingStage: null, loadout: { prime: 'none', hide: 'wild' }, settings: { gore: true, shake: true, mouseMove: true }, director: null, banner: null, deathInfo: null, deadT: 0, dyingT: 0, titleT: 0, lastTs: 0, prevState: 'title', fpsT: 0, frames: 0, fps: 60,
  init() {
    this.canvas = document.getElementById('game'); this.ctx = ctxOf(this.canvas);
    this.fx = new FXSystem(); UI.init(); Input.init(this.canvas);
    Meta.load(); this.loadSave();
    this.touchUI = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    this.scale = 1; this.rotated = false; this.rs = 1; this.rsLocked = false; this.slowFrames = 0; this.frameAvg = 0;
    World.onChunkLoad = (ch, rng) => this.onChunkLoad(ch, rng);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    this.startRun(true);
    this.state = 'title';
    requestAnimationFrame(ts => this.loop(ts));
  },
  // How many device pixels of canvas we draw each game pixel into. Everything
  // is authored at 640x360 and drawn through one integer transform, so the art
  // stays exactly on the grid — this is sharper output, not a new layout. It
  // costs fill rate, so it steps back down if the frame rate cannot hold it.
  setRenderScale(rs) {
    rs = clamp(Math.round(rs), 1, 3);
    if (rs === this.rs) return;
    this.rs = rs;
    this.canvas.width = this.W * rs;
    this.canvas.height = this.H * rs;
    this.ctx.imageSmoothingEnabled = false;
  },
  // Drop a step if the machine is visibly missing frames, and never climb back
  // inside the same session: hunting between two costs looks worse than either
  // of them. Judged on a rolling mean so one long frame does not decide it.
  watchFrameRate(raw) {
    if (this.rs <= 1 || this.rsLocked) return;
    this.frameAvg = this.frameAvg ? this.frameAvg * 0.94 + raw * 0.06 : raw;
    this.slowFrames = this.frameAvg > 0.022 ? (this.slowFrames || 0) + 1 : 0;
    if (this.slowFrames > 50) { this.rsLocked = true; this.setRenderScale(1); this.resize(); }
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
    // draw at 2x wherever the canvas is being blown up anyway; there is nothing
    // to gain from it when the screen is already showing one pixel per pixel
    if (!this.rsLocked) this.setRenderScale(this.scale > 1.05 ? 2 : 1);
  },
  // client (page) coordinates -> virtual 640x360 canvas coordinates
  toCanvas(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    if (!this.rotated) return [(clientX - r.left) / r.width * this.W, (clientY - r.top) / r.height * this.H];
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, s = this.scale || 1;
    return [this.W / 2 + (clientY - cy) / s, this.H / 2 - (clientX - cx) / s];
  },
  loadSave() { try { this.save = Object.assign({ best: 0, bestLen: 0, runs: 0, kills: 0, bestTier: 0, artifacts: [], research: [], data: 0 }, JSON.parse(localStorage.getItem('chompers.save') || '{}')); } catch (e) { this.save = { best: 0, bestLen: 0, runs: 0, kills: 0, bestTier: 0, artifacts: [], research: [], data: 0 }; } try { Object.assign(this.settings, JSON.parse(localStorage.getItem('chompers.settings') || '{}')); } catch (e) { } },
  // a save with history in it is not put back through the induction
  storeSave() {
    const P = this.player;
    // the title screen runs a real crocodile through a real map for show;
    // none of what it does is yours, so none of it is recorded
    if (P && !P.demo) {
      this.save.best = Math.max(this.save.best, this.score);
      this.save.bestLen = Math.max(this.save.bestLen, P.lengthFt);
      this.save.bestTier = Math.max(this.save.bestTier, P.tier);
      this.save.reach = Math.max(this.save.reach || 0, Math.round(P.x));
    }
    try { localStorage.setItem('chompers.save', JSON.stringify(this.save)); localStorage.setItem('chompers.settings', JSON.stringify(this.settings)); } catch (e) { } },
  startRun(demo = false, stage = null, load = null) {
    World.reset((Math.random() * 1e9) | 0);
    this.player = new Player(); this.player.demo = !!demo; this.ents = []; this.fx.clear(); this.score = 0; this.boss = null; this.banner = null; this.shedPending = false; this.deathInfo = null; this.mission = null; this.finisher = null; this.morph = null; this.drop = null;
    this.stats = { eaten: 0, kills: 0, bosses: 0, boats: 0, structures: 0, biggest: '', biggestMass: 0, kinds: {} };
    this.nightCounted = false; this.newUnlocks = [];
    this.t = 0; this.day = 0.1; World.t = 0; this.timeScale = 1; this.slowT = 0; this.slowScale = 1; this.hitstopT = 0; this.red = 0; this.white = 0;
    this.director = { spawnT: 0, predT: 28, flockT: 6, bossQueue: null, bossT: 0 };
    Alarm.reset(); Labyrinth.reset(); Lairs.reset(); Puzzles.reset(); Abilities.reset(); Opening.reset();
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
      // the prime picked on the build bench is one free gene, or a spare point
      if (load) {
        P.hide = load.hide || 'wild';
        const pg = Stages.primeGene(load.prime);
        if (pg) { P.genes.push(pg.id); P.primeGene = pg.id; }
        else P.genePoints += 1;                       // unspliced trades the gene for a point
        P.rebuildLook();
      }
      if (typeof Create !== 'undefined') Create.applyTo(P);   // species, growth grade and hide
      Missions.applyAll(P);                           // relics you have already carried out
      Research.applyTo(P);                            // standing treatments out of the lab
      LabBench.applyTo(P);                            // and whatever tube is loaded on the bench
      P.recomputeStats();
      this.stage = stage || STAGES[0];
      this.storeSave();
      // one site starts where you started: in the tank, in the lab
      if (this.stage.intro) this.beginIntro(); else this.beginAtStage(this.stage);
      Missions.start(this.stage);
      Objectives.begin(this.stage);
    }
  },
  // drop straight into a stretch of the swamp, already grown, already hunted
  beginAtStage(st) {
    const P = this.player, x = st.x;
    const sz = st.size * (P.startSize || 1);
    P.size = sz; P.sizeTarget = sz; P.mass = sizeToMass(sz); P.tier = tierFor(sz);
    P.recomputeStats(); P.hp = P.maxHp; P.hunger = 90; P.sheds = P.tier;
    P.x = x; P.y = Math.max(24, World.floorY(x) * 0.4); P.chain.reset(P.x, P.y, 0);
    this.cam.x = x; this.cam.y = P.y;
    World.ensure(x, 2200); Water.init(x); Mud.init(x);
    this.startDiff = (st.diff || 0) * 0.35;   // position already carries most of it out there
    this.state = 'play'; this.intro = null;
    this.seedNursery(x, 1); this.seedNursery(x, -1);
    for (let i = 0; i < 16; i++) { this.director.spawnT = 0; this.populate(1 + (st.diff || 0)); }
    this.banner = null;
    this.placeLandmark(st);
    Labyrinth.begin(st);
    // Nobody flies a specimen out to a municipal trunk main. The sewer gets
    // tipped in through a hatch in the crown of the vault.
    Drop.begin(st);
  },
  // ---- one big handmade thing per site --------------------------------
  // Every release site gets a landmark placed by hand rather than left to the
  // chunk spawner: something you can see coming, orient by, hide under and
  // remember the place by afterwards.
  LANDMARKS: {
    mangrove: ['stilthouse', 260], camp: ['shop', -180], cypress: ['tower', 220],
    prairie: ['tower', -240], river: ['bridge', 200], campground: ['shop', 240],
    bay: ['bridge', -260], seawall: ['seawall', 300],
    undercroft: ['campsite', 180], shaft: ['console', -140], junction: ['console', 200],
    gallery: ['wreck', -220], sump: ['wreck', 240],
    shelf: ['wreck', 260], reef: ['wreck', -260], wall: ['wreck', 300], trench: ['wreck', -300],
  },
  // ---- the rest of the set, also placed by hand -------------------------
  // The landmark tells you where you are; the dressing tells you what happens
  // here. Every site carries its own short list of props at fixed offsets, so
  // a stretch reads as somewhere somebody worked rather than as noise from the
  // chunk spawner.
  DRESSING: {
    // the everglades: people, boats and the things they leave in the water
    mangrove: [['dock', -180], ['crabtrap', -120], ['crabtrap', 60], ['buoy', 320], ['sign', -300]],
    camp: [['dock', 120], ['boatramp', -320], ['crabtrap', 180], ['crabtrap', 240], ['campfire', -120], ['sign', 60], ['buoy', 420]],
    cypress: [['dock', -260], ['sign', 120], ['campsite', 420], ['buoy', -420]],
    prairie: [['sign', -160], ['buoy', 240], ['crabtrap', 380], ['tower', 520]],
    river: [['buoy', -300], ['buoy', 300], ['dock', 420], ['boatramp', -520], ['sign', 140]],
    campground: [['campsite', -260], ['campfire', -200], ['dock', 260], ['crabtrap', 320], ['sign', -60], ['buoy', 480]],
    bay: [['buoy', -420], ['buoy', 180], ['buoy', 560], ['wreck', -260], ['crabtrap', 340]],
    seawall: [['buoy', -360], ['dock', 300], ['wreck', -560], ['sign', 120]],
    // the system: nobody decorates a sewer, but everybody leaves things in it
    undercroft: [['campfire', 60], ['console', -260], ['sign', 220], ['wreck', 420]],
    shaft: [['console', 180], ['sign', -180], ['wreck', 380], ['grate', -420]],
    junction: [['console', -260], ['console', 320], ['sign', 120], ['wreck', -520], ['grate', 560]],
    gallery: [['wreck', 300], ['console', -340], ['sign', -120], ['wreck', -620]],
    sump: [['wreck', -300], ['wreck', 420], ['console', 160], ['sign', -140]],
    // and the ocean, where everything on the bottom got there by sinking
    shelf: [['wreck', -320], ['buoy', 260], ['crabtrap', 420]],
    reef: [['wreck', 380], ['buoy', -300], ['crabtrap', -420]],
    wall: [['wreck', -420], ['buoy', 320]],
    trench: [['wreck', 360], ['wreck', -520]],
  },
  placeLandmark(st) {
    if (!st) return;
    const spec = this.LANDMARKS[st.id];
    const onLand = k => k === 'shop' || k === 'stilthouse' || k === 'tower' || k === 'campsite' || k === 'console' || k === 'campfire' || k === 'sign' || k === 'boatramp';
    const put = (kind, off, span) => {
      const land = onLand(kind);
      const x = World.findX(st.x + off, xx => land ? World.floorY(xx) < 10 : World.floorY(xx) > 40, span || 900, 30);
      if (x === null) return null;
      // never stack two props on the same few feet of bank
      for (const e of this.ents) if (e.type === 'structure' && Math.abs(e.x - x) < 34) return null;
      const b = new Structure(x, kind);
      this.add(b);
      return b;
    };
    if (spec) this.landmark = put(spec[0], spec[1]);
    const dress = this.DRESSING[st.id];
    if (dress) for (const [kind, off] of dress) put(kind, off, 260);
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
  // ---------- the intro: moved in a tank, out through the glass ----------
  // The first run does not start in a room you break out of. It starts on a
  // trolley, in a transfer tank, and goes through the glass, across a floor,
  // down a drain and twenty seconds of chute into the Roman level. All of that
  // is the opening sequence; what it lands you in is the cistern.
  beginIntro() {
    const P = this.player, st = this.stage, x = st.x;
    const sz = (st && st.size) || 0.22;
    P.size = sz; P.sizeTarget = sz; P.mass = sizeToMass(sz); P.tier = tierFor(sz);
    P.recomputeStats(); P.hp = P.maxHp; P.hunger = 92; P.sheds = 0;
    World.ensure(x, 2600); Water.init(x); Mud.init(x);
    P.x = x; P.y = Math.max(24, World.floorY(x) * 0.4); P.chain.reset(P.x, P.y, 0);
    this.cam.x = x; this.cam.y = P.y;
    this.startDiff = 0; this.intro = null;
    // a few first meals in the cistern, and the things that live on them
    for (let i = 0; i < 5; i++) { const rx = x - 260 + i * 130 + rand(-30, 30); Spawn.school(rx, clamp(World.floorY(rx) - 14, 8, 60), chance(0.5) ? 'minnow' : 'shiner'); }
    for (let i = 0; i < 3; i++) { const rx = x + rand(-400, 400); if (World.floorY(rx) > 20) this.add(new Carrion(rx, World.floorY(rx) - 6, 'rat')); }
    this.state = 'play'; this.banner = null;
    Puzzles.begin(st);
    Opening.begin(st);
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
    if (rng() < 0.75 && !Biome.at(ch.x0).remote) { for (let a = 0; a < 3; a++) { const sx = ch.x0 + rng() * World.CHUNK; if (Math.abs(sx - P.x) < 320) continue; if (trySpawnStructure(sx, rng, D)) break; } }
    // ---- work going on in the water -------------------------------------
    // Not props: people in the middle of doing something, who will notice you
    // doing something too. Only outdoors, and never right on top of you.
    {
      const B0 = Biome.at(ch.x0);
      const ax = ch.x0 + rng() * World.CHUNK;
      // A remote reach has nobody working it. That is the whole point of it:
      // at 0.3 ft a surveyor with a net is not an encounter, it is the end.
      if (!B0.indoor && !B0.remote && Math.abs(ax - P.x) > 420 && this.state !== 'title') {
        const busy = B0.town ? 0.5 : B0.id === 'bay' || B0.id === 'river' || B0.id === 'campground' ? 0.34 : 0.2;
        if (rng() < busy) {
          const pick = rng();
          if (pick < 0.34 && (B0.id === 'bay' || B0.id === 'river' || B0.id === 'campground' || B0.town)) spawnManateeWatch(ax);
          else if (pick < 0.62) spawnSurvey(ax);
          else spawnTrapline(ax, 3 + Math.floor(rng() * 3));
        }
      }
    }
    // ---- what already died here -----------------------------------------
    // A small crocodile does not hunt its way up: it finds. Every stretch of
    // map carries a few carcasses, thickest in the system where everything
    // that dies upstream ends up on the floor.
    {
      const Bc = Biome.at(ch.x0);
      const n = Bc.indoor ? (rng() < 0.7 ? 1 + Math.floor(rng() * 2) : 0) : (rng() < 0.35 ? 1 : 0);
      const pool = Bc.indoor ? ['rat', 'rat', 'bigrat'] : ['mullet', 'rat', 'mullet', 'bass'];
      for (let k = 0; k < n; k++) {
        const cx2 = ch.x0 + rng() * World.CHUNK;
        if (Math.abs(cx2 - P.x) < 200) continue;
        const fy2 = World.floorY(cx2); if (fy2 < 2) continue;
        const kind = pool[Math.floor(rng() * pool.length)];
        if (!SPECIES[kind]) continue;
        const c = new Carrion(cx2, fy2 - 6, kind);
        this.add(c);
      }
    }
    const B = Biome.at(ch.x0);
    // Level one is stocked, not thinned: a hatchling that cannot find a meal in
    // the first two minutes has nothing to grow on and the run is over before
    // it starts. Nine passes instead of five, and none of them skipped.
    const passes = B.id === 'wake' ? 9 : 5;
    for (let k = 0; k < passes; k++) {
      const x = ch.x0 + rng() * World.CHUNK; if (Math.abs(x - P.x) < 260) continue;
      const Bx = Biome.at(x);
      if (Bx.indoor && Bx.id !== 'wake' && rng() < 0.5) continue;
      const fy = World.floorY(x);
      if (fy < -3) { if (rng() < 0.6) this.spawnLand(x, D); continue; }
      if (fy < 30) { if (!Bx.indoor && rng() < 0.45) this.add(new Bird(x, 0, choice(['heron', 'egret', 'ibis', 'snowy', 'limpkin']), 'wade')); else if (rng() < 0.4) this.add(new Bottom(x, Bx.indoor || Bx.id === 'outfall' ? 'roach' : 'crayfish')); continue; }
      if (Bx.indoor && !Bx.fish.length) continue;
      const kind = weightedPick(Bx.fish.concat(Bx.indoor ? [['bottom', 2]] : [['frog', 1.4], ['turtle', 1.4], ['bottom', 2], ['duck', 1]]));
      if (!kind) continue;
      if (kind === 'frog') this.add(new Frog(x, chance(0.3) ? 'pigfrog' : 'frog'));
      else if (kind === 'turtle') this.add(new Turtle(x, clamp(40 + rng() * 100, 10, fy - 15), choice(['turtle', 'slider', 'cooter'])));
      else if (kind === 'bottom') this.add(new Bottom(x, B.indoor || B.id === 'outfall' ? (chance(0.7) ? 'roach' : 'crayfish') : choice(['crayfish', 'crab', 'snail', 'shrimp', 'fiddler'])));
      else if (kind === 'duck') Spawn.duck(x);
      else if (SPECIES[kind]) { const d = SPECIES[kind], band = d.band || [10, 200]; Spawn.school(x, d.nearFloor ? fy - 30 : clamp(rand(band[0], band[1]), 10, fy - 15), kind); }
    }
  },
  // the creation bay and the research lab, both reached from the lab floor
  openResearch() { this.openLabBench('research'); },

  openLabBench(tab) {
    this.state = 'bench'; this.menuT = 0;
    this.benchTab = tab || this.benchTab || 'build';
    if (this.resCat === undefined) { this.resCat = 0; this.resNode = 0; }
    if (this.benchSel === undefined) this.benchSel = 0;
    SFX.ui();
  },
  openHabitat() {
    this.state = 'habitat'; this.menuT = 0;
    if (this.createSel === undefined) this.createSel = 0;
    Habitat.ensure();
    if (this.habSel === undefined) this.habSel = Habitat.runnerIndex();
    if (this.habRow === undefined) this.habRow = 0;
    if (this.habHatch === undefined) this.habHatch = 0;
    SFX.ui();
  },
  // the research programme, one of the three benches in the lab
  updateResearch(raw) {

        const cats = UI.resCatRects();
        if (Input.hit('ArrowLeft', 'KeyA')) { this.resCat = (this.resCat + cats.length - 1) % cats.length; this.resNode = 0; SFX.ui(); }
        if (Input.hit('ArrowRight', 'KeyD')) { this.resCat = (this.resCat + 1) % cats.length; this.resNode = 0; SFX.ui(); }
        let rows = UI.resNodeRects();
        if (Input.hit('ArrowUp', 'KeyW')) { this.resNode = (this.resNode + rows.length - 1) % rows.length; SFX.ui(); }
        if (Input.hit('ArrowDown', 'KeyS')) { this.resNode = (this.resNode + 1) % rows.length; SFX.ui(); }
        // pointing at a programme switches to it; pointing at a node selects it,
        // and pointing at the one already selected funds it
        let fund = Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ');
        if (Input.mouse.clicked) {
          const inRect = r => Input.mouse.x > r.x && Input.mouse.x < r.x + r.w && Input.mouse.y > r.y && Input.mouse.y < r.y + r.h;
          let took = false;
          for (const r of cats) if (inRect(r)) { if (this.resCat !== r.i) { this.resCat = r.i; this.resNode = 0; SFX.ui(); } took = true; }
          if (!took) { rows = UI.resNodeRects(); for (const r of rows) if (inRect(r)) { if (this.resNode === r.i) fund = true; else { this.resNode = r.i; SFX.ui(); } took = true; } }
        }
        rows = UI.resNodeRects();
        const cur = rows[clamp(this.resNode || 0, 0, rows.length - 1)];
        if (fund && cur) {
          if (Research.buy(cur.nd)) {
            SFX.levelup(); this.whiteFlash(0.25);
            this.banner = { text: 'FUNDED', sub: cur.nd.name, t: 2.6, max: 2.6, color: cur.nd.cat.col };
          } else { SFX.hurt && SFX.hurt(); this.menuShake = 0.3; }
        }
        if (this.menuShake > 0) this.menuShake -= raw;
          },
  openStages() {
    this.state = 'stages'; this.menuT = 0; this.menuShake = 0;
    if (this.stageSel === undefined) {
      // land on the furthest stage the save has opened, that is where you left off
      let best = 0; STAGES.forEach((st, i) => { if (Stages.unlocked(st)) best = i; });
      this.stageSel = best;
      this.globeSpin = STAGES[best].lon;
    }
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
  // The swamp keeps pace with you, and it keeps pace faster than it used to:
  // distance costs more, the clock costs more, and every shed you take is a
  // standing invitation to whatever else lives out here.
  difficulty() {
    const P = this.player;
    let d = (this.startDiff || 0) + P.sheds * 1.25 + Math.abs(P.x) / 2600 + this.t / 220;
    // The system is the first thing anybody plays, and the animal in it is the
    // length of a hand. Zone one is held down hard, and level one is held down
    // harder: nothing hunts you on the bench you woke up on.
    const B = Biome.at(P.x);
    if (B.id === 'wake' || B.lab) d = Math.min(d, 0.35);
    else if (P.x < 1100) d = Math.min(d * 0.62, 2.4);
    return d;
  },
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
      Missions.onKill(e, true);
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
    // its stretch is quiet from here on: nothing else moves in
    if (typeof Lairs !== 'undefined') Lairs.clear(e.lairId);
    this.banner = { text: e.name + ' DEFEATED', sub: '+10,000', t: 4, max: 4, color: '#ffd060' };
    this.slowmo(0.2, 1.2); this.zoomPunch(1.15); SFX.roar(3); SFX.levelup(); this.whiteFlash(0.6);
    if (this.boss === e) this.boss = null;
    this.player.hp = this.player.maxHp;
    this.fx.text(e.x, e.y - 40, 'BOSS DEVOURED', { scale: 3, color: '#ffd060', life: 2 });
  },
  onPlayerDeath(cause, src) {
    const P = this.player;
    // A run is only worth what the lab can read off it. Pay it out here, once,
    // and hand the breakdown to the death card so the number is never a mystery.
    const relics = this.mission && this.mission.claimed ? 1 : 0;
    const pay = Research.payout(this.stats, this.score, P.tier, relics);
    Research.addData(pay.total);
    // the animal that went out is the animal that grew: a run is its food
    const grew = Habitat.onRunEnd(this.score, P.tier);
    this.save.runs = (this.save.runs || 0) + 1;
    this.save.kills = (this.save.kills || 0) + (this.stats.kills || 0);
    this.deathInfo = { cause, killer: src && src.name, pay, grew, croc: Habitat.runner() };
    this.dyingT = 0; this.state = 'dying'; this.storeSave();
  },
  // growing into a new tier: the body splits out of its old hide on screen,
  // and the tier itself lands at the burst halfway through
  growTier(tier) {
    const P = this.player, t2 = Math.min(tier, TIERS.length - 1);
    Morph.begin({
      kind: 'tier', color: '#9ad8b0',
      title: TIERS[t2].name, sub: 'SHED YOUR SKIN   +2 GENE POINTS',
      apply: () => {
        P.tier = t2; P.sheds++;
        P.hp = P.maxHp; P.lastMax = P.maxHp; P.hunger = Math.max(P.hunger, 55);
        P.genePoints += 2; P.newPoints += 2;
        if (P.tier >= TIERS.length - 1) { Meta.event('swampgod'); for (const t3 of Meta.checkUnlocks()) this.announceUnlock(t3); Meta.save(); }
        this.storeSave();
      },
    });
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
    if (P.tier >= TIERS.length - 1) { Meta.event('swampgod'); for (const t2 of Meta.checkUnlocks()) this.announceUnlock(t2); Meta.save(); }
    this.storeSave();
  },
  // ---------- director ----------
  runDirector(dt) {
    const d = this.director, P = this.player, D = this.difficulty();
    d.spawnT -= dt; if (d.spawnT <= 0) { d.spawnT = 0.32; this.populate(D); this.populate(D); }
    d.predT -= dt; if (d.predT <= 0) { d.predT = clamp(21 - D * 2.6, 5, 21) * rand(0.8, 1.25); this.spawnPredator(D); }
    d.flockT -= dt; if (d.flockT <= 0) { d.flockT = rand(9, 20); if (!World.isIndoor(P.x)) { const dir = chance(0.5) ? 1 : -1, halfW = this.W / this.cam.zoom / 2; Spawn.flock(P.x - dir * (halfW + 140), dir, choice(['egret', 'ibis', 'heron', 'egret']), randi(2, 6)); } }
    // hard cap
    if (this.ents.length > 220) { let n = 0; for (const e of this.ents) if (e.type === 'gib' && n++ > 40) e.remove = true; }
  },
  populate(D) {
    const P = this.player, halfW = this.W / this.cam.zoom / 2;
    // Count what is actually in front of you, not what is somewhere in the
    // chunk. A wide net says the water is full while the screen is empty.
    let fishCount = 0, landCount = 0, total = 0;
    for (const e of this.ents) { if (e.type === 'gib' || e.type === 'proj') continue; if (Math.abs(e.x - P.x) > halfW + 260) continue; total++; if (e.type === 'fish' || e.type === 'frog' || e.type === 'turtle' || e.type === 'bird') fishCount++; if (e.type === 'land') landCount++; }
    if (total > 140) return;
    // Hungry Shark's whole trick is that there is always something in front of
    // you. Sixteen fish in a screen and a half is a pond; this is a system.
    const target = 30 + Math.min(40, P.size * 4.5);
    if (fishCount >= target) { if (landCount < 4 && chance(0.35)) { const bx = World.findX(P.x + (chance(0.5) ? 1 : -1) * (halfW + 300), x => World.floorY(x) < -5, 1400, 40); if (bx !== null && Math.abs(bx - P.x) > halfW * 0.7) this.spawnLand(bx, D); } return; }
    // just past the edge of the shot, so a shoal crosses it rather than
    // spawning half a screen out and wandering off the other way
    const side = chance(0.5) ? 1 : -1, x = P.x + side * (halfW + rand(10, 130)), fy = World.floorY(x);
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
    else if (kind === 'roachswarm') { for (let i = 0; i < 6; i++) this.add(new Bottom(x + rand(-50, 50), 'roach')); }
    else if (SPECIES[kind] && SPECIES[kind].cat === 'fish') {
      const d = SPECIES[kind];
      // In a flooded chamber the band is the whole chamber: a species that
      // likes the top forty feet of a river has nowhere to be in a vault seven
      // hundred deep, and the bottom of the room comes out empty.
      const band = d.band || [10, 200];
      // A chamber seven hundred feet deep spreads a school over ten screens of
      // water and the room comes out empty. Shoals go in at roughly the depth
      // the player is swimming at, so they cross the shot instead of missing it.
      const halfH = this.H / this.cam.zoom / 2;
      const y = d.nearFloor ? fy - 30
        : B.indoor ? clamp(P.y + rand(-halfH * 1.3, halfH * 1.3), 12, Math.max(14, fy - 12))
        : clamp(rand(band[0], band[1]), 10, fy - 15);
      Spawn.school(x, y, kind);
    }
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
    else if (kind === 'pontoon') { if (World.isIndoor(x)) return; const wx = World.findX(x, xx => World.floorY(xx) > 60, 500, 30); if (wx !== null) Spawn.boat(wx, chance(0.5) ? 'pontoon' : 'jon', -side); }
    else if (kind === 'moccasin') this.add(new Snake(x, 4, 'moccasin'));
  },
  spawnLand(x, D) {
    if (World.floorY(x) > -3) return;
    const B = Biome.at(x);
    const table = B.land.map(([k, w]) => { const sp = SPECIES[k]; const hard = sp ? sizeClassOf(sp.ft) : 1; return [k, hard > 3 && D < 1.6 ? w * 0.2 : w]; });
    // the facility is staffed by the two you arrive with and nobody else
    if (B.lab || (typeof Opening !== 'undefined' && Opening.scripted && Opening.scripted())) return;
    if (!B.indoor && !B.remote) {
      // Nobody fishes the foot of a hundred-and-forty-foot outfall, and the
      // gorge has no way down into it. A reach marked remote has animals in
      // it and nothing else, which is what makes it survivable at 0.3 ft.
      if (B.town || D >= 1) table.push(['fisherman', B.town ? 2 : 1], ['tourist', B.town ? 2.4 : 0.8]);
      if (B.id === 'campground') table.push(['camper', 3]);
      if (D >= 1.6) table.push(['ranger', 1], ['poacher', D >= 2.4 ? 1.4 : 0]);
    }
    if (!B.indoor) table.push(['heron', 1.2]);
    const k = weightedPick(table);
    if (!k) return;
    if (k === 'heron') this.add(new Bird(x, 0, choice(['heron', 'egret', 'ibis']), 'wade'));
    else if (LAND[k]) this.add(new LandAnimal(x, k));
    else if (BOTTOM[k]) this.add(new Bottom(x, k));
  },
  spawnPredator(D) {
    const P = this.player, halfW = this.W / this.cam.zoom / 2, side = chance(0.5) ? 1 : -1, x = P.x + side * (halfW + rand(120, 320)), fy = World.floorY(x);
    const opts = [];
    // level one is a tutorial with a roof on it: fish, rats, nothing with teeth
    if (Biome.at(x).id === 'wake' || Biome.at(P.x).id === 'wake') return;
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
      case 'poacher': case 'tourist': { if (World.isIndoor(x)) break; const wx = World.findX(x, xx => World.floorY(xx) > 60, 600, 30); if (wx !== null) { Spawn.boat(wx, k, -side); if (k === 'poacher') warn = 'POACHERS NEARBY'; } break; }
      case 'shark': this.add(new Fish(x, clamp(rand(100, 400), 60, fy - 30), 'shark')); warn = 'SOMETHING IS HUNTING YOU'; break;
      case 'boar': case 'panther': case 'bear': { const bx = World.findX(x, xx => World.floorY(xx) < -5, 1200, 40); if (bx !== null) { this.add(new LandAnimal(bx, k)); if (k !== 'boar') warn = k === 'bear' ? 'A BEAR IS ON THE BANK' : 'SOMETHING STALKS THE BANK'; } break; }
      case 'sawfish': this.add(new Fish(x, clamp(rand(150, 400), 60, fy - 30), 'sawfish')); break;
      case 'grouper': this.add(new Fish(x, clamp(rand(400, 700), 60, fy - 40), 'grouper')); break;
    }
    if (warn) { this.banner = { text: warn, t: 2.5, max: 2.5, color: '#ff8060' }; SFX.growl(side); }
  },
  // Bosses are places now, not events: see src/lairs.js. Nothing queues one.
  // A boss is spawned where it lives. atX is its lair; without one it comes in
  // off the edge of the screen, which is only used by the debug harnesses now.
  spawnBoss(kind, atX) {
    const P = this.player, halfW = this.W / this.cam.zoom / 2, side = (atX !== undefined ? (atX >= P.x ? 1 : -1) : (chance(0.5) ? 1 : -1));
    const x = atX !== undefined ? atX : P.x + side * (halfW + 220), fy = World.floorY(x);
    let boss = null;
    if (kind === 'oldscar') { const wx = World.findX(x, xx => World.floorY(xx) > 80, 900, 30); if (wx !== null) boss = Spawn.gator(wx, clamp(80, 10, World.floorY(wx) - 20), Math.max(1.6, P.size * 1.35), true); }
    else if (kind === 'warboat') { const wx = World.findX(x, xx => World.floorY(xx) > 60, 900, 30); if (wx !== null) boss = Spawn.boat(wx, 'warboat', -side); }
    else if (kind === 'python') { boss = this.add(new Snake(x, fy < 0 ? -10 : 6, 'python', Math.max(2.2, P.size * 0.8))); boss.isBoss = true; boss.persistent = true; boss.name = 'MOTHER PYTHON'; boss.hp = boss.maxHp = Math.round(boss.maxHp * 1.6); }
    else if (kind === 'skunkape') { const bx = World.findX(x, xx => World.floorY(xx) < -8, 6000, 40); if (bx !== null) boss = this.add(new SkunkApe(bx)); }
    else if (kind === 'shark') { const wx = World.findX(x, xx => World.floorY(xx) > 200, 1500, 40); if (wx !== null) { boss = this.add(new Fish(wx, clamp(150, 60, World.floorY(wx) - 40), 'shark')); boss.size = 2.2; boss.sizeClass = Math.max(10, P.size * 1.3); boss.hp = boss.maxHp = 1400; boss.mass = 1500; boss.name = 'BIG BULL'; boss.isBoss = true; boss.persistent = true; boss.speed = 200; boss.gibs = 6; } }
    else if (kind === 'broodmother') {
      // she does not swim: find her a dry ledge to come down off
      const bx = World.findX(x, xx => World.floorY(xx) < -8, 5000, 40);
      if (bx !== null) {
        boss = this.add(new LandAnimal(bx, 'bigrat'));
        boss.size = 3.4; boss.groundOff *= boss.size; boss.r *= boss.size;
        boss.sizeClass = Math.max(4, P.size * 1.05); boss.mass = 520;
        boss.hp = boss.maxHp = 760; boss.name = 'THE BROODMOTHER'; boss.gibs = 7; boss.threat = 1;
        boss.y = World.floorY(bx) - boss.groundOff;
      }
    }
    else if (FISH_BOSS[kind]) {
      const B2 = FISH_BOSS[kind];
      const wx = World.findX(x, xx => World.floorY(xx) > B2.depth * 0.6 + 40, 2600, 45);
      if (wx !== null) {
        const fy2 = World.floorY(wx);
        boss = this.add(new Fish(wx, clamp(B2.depth, 40, fy2 - 40), B2.kind));
        boss.size = B2.size; boss.r *= B2.size;
        boss.sizeClass = Math.max(B2.cls * 6, P.size * B2.cls);
        boss.hp = boss.maxHp = B2.hp; boss.mass = B2.mass; boss.speed = B2.spd;
        boss.name = B2.name; boss.gibs = B2.gibs; boss.threat = 1; boss.flee = 0;
        boss.band = [Math.max(20, B2.depth * 0.4), Math.max(120, B2.depth * 1.6)];
        if (B2.glow) boss.bossGlow = B2.glow;
      }
    }
    if (!boss) { if (typeof Lairs !== 'undefined' && atX !== undefined) Lairs.woken[kind] = 0; return; }
    Boss.init(boss, BOSS_SPEC[kind] || { phases: 3, hp: 1.3 });
    boss.lairId = kind;
    this.boss = boss;
    this.banner = { text: 'ITS TERRITORY', sub: boss.name + ' IS AWAKE', t: 4, max: 4, color: '#ff3030' }; SFX.warning(); this.shake(6);
  },
  // ---------- update ----------
  loop(ts) {
    const raw = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 0.016); this.lastTs = ts;
    this.frames++; this.fpsT += raw; if (this.fpsT >= 1) { this.fps = this.frames; this.frames = 0; this.fpsT -= 1; }
    if (this.slowT > 0) { this.slowT -= raw; if (this.slowT <= 0) this.slowScale = 1; }
    this.timeScale = lerp(this.timeScale, this.slowT > 0 ? this.slowScale : 1, 0.2);
    let dt = raw * this.timeScale;
    if (this.hitstopT > 0) { this.hitstopT -= raw; dt = 0; }
    this.dt = dt;                 // the renderers that animate scenery read this
    this.watchFrameRate(raw);
    this.update(dt, raw);
    this.render();
    Input.endFrame();
    requestAnimationFrame(t => this.loop(t));
  },
  update(dt, raw) {
    // global keys
    if (Input.hit('KeyM')) { const m = SFX.toggleMute(); if (!SFX.ctx) { SFX.init(); if (m) SFX.master && (SFX.master.gain.value = 0); } }
    // The bay shutter outlives the screen that started it. It comes down over
    // the title, hands over to the station halfway, and has to keep rolling
    // from inside that station until it is back up. Ticking it in the title
    // case alone froze it the instant it handed over, and it stayed shut over
    // the whole screen for the rest of the session.
    if (this.labWipe) {
      const wp = this.labWipe;
      wp.t += raw;
      if (!wp.gone && wp.t >= wp.dur * 0.5) {
        wp.gone = true;
        if (wp.id === 'lab') this.openLabBench();
        else this.openHabitat();
        this.wipeIn = 0.28;
      }
      if (wp.t >= wp.dur) this.labWipe = null;
      if (this.state === 'title') { this.titleT += raw; Lab.update(raw); }
      else this.menuT += raw;
      return;
    }
    switch (this.state) {
      case 'title': {
        this.titleT += raw; Lab.update(raw);
        const stn = UI.labStations();
        if (this.labSel === undefined) this.labSel = 1;      // start on CREATE
        if (Input.hit('ArrowLeft', 'KeyA')) { this.labSel = (this.labSel + stn.length - 1) % stn.length; SFX.ui(); }
        if (Input.hit('ArrowRight', 'KeyD')) { this.labSel = (this.labSel + 1) % stn.length; SFX.ui(); }
        // the station in the room and its plate are the same target
        let hit = -1;
        if (Input.mouse.clicked) {
          for (let i = 0; i < stn.length; i++) {
            const s2 = stn[i];
            const inRoom = Input.mouse.x > s2.x && Input.mouse.x < s2.x + s2.w && Input.mouse.y > s2.y && Input.mouse.y < s2.y + s2.h;
            const onPlate = Input.mouse.x > s2.bx && Input.mouse.x < s2.bx + s2.bw && Input.mouse.y > s2.by && Input.mouse.y < s2.by + s2.bh;
            if (inRoom || onPlate) hit = i;
          }
        }
        if (Input.hit('KeyH')) { this.prevState = 'title'; this.state = 'help'; break; }
        if (Input.hit('KeyC')) { this.prevState = 'title'; this.state = 'codex'; this.codexScroll = 0; break; }
        const use = Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ') || (hit >= 0 && hit === this.labSel);
        if (hit >= 0 && hit !== this.labSel) { this.labSel = hit; SFX.ui(); break; }
        if (use && !this.labWipe) {
          SFX.init(); SFX.resume(); SFX.ui();
          const st2 = stn[this.labSel];
          this.labWipe = { t: 0, dur: 0.44, id: st2.id, x: st2.x + st2.w / 2, y: st2.y + st2.h / 2, gone: false };
          SFX.clank && SFX.clank();
        }
        break;
      }
      case 'bench': {
        this.menuT += raw; Lab.update(raw);
        if (Input.hit('Escape', 'KeyH') || UI.exitHit()) { this.state = 'title'; SFX.ui(); break; }
        const inR = r => Input.mouse.x > r.x && Input.mouse.x < r.x + r.w && Input.mouse.y > r.y && Input.mouse.y < r.y + r.h;
        const tabs = UI.benchTabs();
        const goTab = id => { if (this.benchTab === id) return; this.benchTab = id; this.benchSel = 0; SFX.ui(); };
        if (Input.hit('Tab', 'KeyE')) goTab(tabs[(tabs.findIndex(b2 => b2.id === this.benchTab) + 1) % tabs.length].id);
        if (Input.hit('KeyQ')) goTab(tabs[(tabs.findIndex(b2 => b2.id === this.benchTab) + tabs.length - 1) % tabs.length].id);
        if (Input.mouse.clicked) for (const b2 of tabs) if (inR(b2)) { goTab(b2.id); break; }
        if (this.benchTab === 'research') { this.updateResearch(raw); break; }
        if (this.benchTab === 'relics') {
          const cells = UI.relicCells();
          const step = d => { this.benchSel = ((this.benchSel || 0) + d + cells.length) % cells.length; SFX.ui(); };
          if (Input.hit('ArrowLeft', 'KeyA')) step(-1);
          if (Input.hit('ArrowRight', 'KeyD')) step(1);
          if (Input.hit('ArrowUp', 'KeyW')) step(-6);
          if (Input.hit('ArrowDown', 'KeyS')) step(6);
          if (Input.mouse.clicked) for (const c of cells) if (inR(c) && this.benchSel !== c.i) { this.benchSel = c.i; SFX.ui(); }
          break;
        }
        // ---- BUILD: the tube you take out, and the prime you go out carrying
        {
          const rects = UI.vialRects();
          if (Input.hit('ArrowLeft', 'KeyA')) { this.benchSel = (this.benchSel + rects.length - 1) % rects.length; SFX.ui(); }
          if (Input.hit('ArrowRight', 'KeyD')) { this.benchSel = (this.benchSel + 1) % rects.length; SFX.ui(); }
          let take = Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ');
          if (Input.mouse.clicked) {
            for (const c of UI.buildPrimes()) if (inR(c)) { this.loadout.prime = c.p.id; this.storeSave(); SFX.pick(); take = false; }
            for (const r of rects) if (inR(r)) { if (this.benchSel === r.i) take = true; else { this.benchSel = r.i; SFX.ui(); } }
          }
          if (take) {
            const v = VIALS[clamp(this.benchSel, 0, VIALS.length - 1)];
            if (LabBench.have(v)) { LabBench.load(v.id); SFX.pick(); }
            else { SFX.hurt && SFX.hurt(); this.menuShake = 0.3; }
          }
        }
        if (this.menuShake > 0) this.menuShake -= raw;
        break;
      }
      case 'habitat': {
        this.menuT += raw; Lab.update(raw);
        Habitat.ensure();
        const L = Habitat.list();
        const sel = clamp(this.habSel || 0, 0, HAB_SLOTS - 1), cur = L[sel];
        const inR = r => Input.mouse.x > r.x && Input.mouse.x < r.x + r.w && Input.mouse.y > r.y && Input.mouse.y < r.y + r.h;
        if (Input.hit('Escape', 'KeyH') || UI.exitHit()) { this.state = 'title'; SFX.ui(); break; }
        // the roster along the top always moves the selection
        if (Input.mouse.clicked) for (const k of UI.habRoster()) if (inR(k)) { if (this.habSel !== k.i) { this.habSel = k.i; this.habRow = 0; SFX.ui(); } }
        if (Input.hit('ArrowUp', 'KeyW') && !cur) { this.habSel = (sel + HAB_SLOTS - 1) % HAB_SLOTS; this.habRow = 0; SFX.ui(); break; }
        if (Input.hit('ArrowDown', 'KeyS') && !cur) { this.habSel = (sel + 1) % HAB_SLOTS; this.habRow = 0; SFX.ui(); break; }
        if (!cur) {
          // ---- an empty slot: the stock library is on the stage
          const n2 = BASE_SPECIES.length;
          const stepSp = d => { this.createSel = ((this.createSel || 0) + d + n2) % n2; SFX.ui(); };
          if (Input.hit('ArrowLeft', 'KeyA')) stepSp(-1);
          if (Input.hit('ArrowRight', 'KeyD')) stepSp(1);
          let grow = Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ');
          if (Input.mouse.clicked) {
            for (const a2 of UI.createArrows()) if (inR(a2)) { stepSp(a2.id); grow = false; }
            for (const r of UI.createTicks()) if (inR(r) && r.i !== this.createSel) { this.createSel = r.i; SFX.ui(); grow = false; }
            if (inR(UI.createGoRect())) grow = true;
          }
          if (grow) {
            const sp2 = BASE_SPECIES[clamp(this.createSel || 0, 0, n2 - 1)];
            if (Habitat.hatch(sel, sp2.id)) {
              Habitat.select(sel);
              this.habRow = 0;
              SFX.hatch && SFX.hatch(); SFX.levelup(); this.whiteFlash(0.4);
              this.banner = { text: 'GROWN', sub: Habitat.tag(L[sel]), t: 2.6, max: 2.6, color: sp2.holo || '#7affda' };
            } else { SFX.hurt && SFX.hurt(); this.menuShake = 0.3; }
          }
          if (this.menuShake > 0) this.menuShake -= raw;
          break;
        }
        // ---- a living animal: raise it, dress it, send it out
        const rows = UI.habRows();
        const row = clamp(this.habRow || 0, 0, rows.length - 1);
        const step = d => { this.habRow = (row + d + rows.length) % rows.length; SFX.ui(); };
        if (Input.hit('ArrowUp', 'KeyW')) step(-1);
        if (Input.hit('ArrowDown', 'KeyS')) step(1);
        if (Input.hit('ArrowLeft', 'KeyA')) { this.habSel = (sel + HAB_SLOTS - 1) % HAB_SLOTS; this.habRow = 0; SFX.ui(); break; }
        if (Input.hit('ArrowRight', 'KeyD')) { this.habSel = (sel + 1) % HAB_SLOTS; this.habRow = 0; SFX.ui(); break; }
        let act = Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ');
        if (Input.mouse.clicked) for (let i2 = 0; i2 < rows.length; i2++) if (inR(rows[i2])) { if (row === i2) act = true; else { this.habRow = i2; SFX.ui(); } }
        if (act) {
          const r = rows[clamp(this.habRow || 0, 0, rows.length - 1)];
          const res = UI.habApply(r, cur, sel);
          if (!res) { SFX.hurt && SFX.hurt(); this.menuShake = 0.3; }
          else if (res === 'go') { SFX.pick(); this.openStages(); }
          else if (res === 'up') { SFX.pick(); }
          else SFX.ui();
        }
        if (this.menuShake > 0) this.menuShake -= raw;
        break;
      }
      case 'stages': {
        this.menuT += raw;
        const list = STAGES;
        // --- the globe is a thing you turn, not a carousel that turns for you
        {
          const gg = UI.globeGeom();
          const mx = Input.mouse.x, my = Input.mouse.y;
          const overGlobe = dist(mx, my, gg.cx, gg.cy) < gg.r * 1.3;
          if (Input.mouse.down && (this.globeDrag || overGlobe)) {
            if (!this.globeDrag) { this.globeDrag = true; this.globeDragX = mx; this.globeDragY = my; this.globeMoved = 0; }
            const dx = mx - this.globeDragX, dy = my - this.globeDragY;
            this.globeDragX = mx; this.globeDragY = my;
            this.globeMoved += Math.abs(dx) + Math.abs(dy);
            this.globeSpin -= dx / gg.r * 1.1;
            this.globeVel = -dx / gg.r * 1.1 / Math.max(0.008, raw) * 0.016;
            this.globeFree = true;
          } else {
            if (this.globeDrag) this.globeDrag = false;
            if (this.globeFree) {
              // let go and it keeps turning, then settles
              this.globeSpin += (this.globeVel || 0) * raw * 60;
              this.globeVel = (this.globeVel || 0) * Math.pow(0.06, raw);
              if (Math.abs(this.globeVel) < 0.0006) this.globeVel = 0;
            } else {
              const want = list[this.stageSel] ? list[this.stageSel].lon : 0;
              this.globeSpin += angleDiff(this.globeSpin, want) * Math.min(1, raw * 4.5);
            }
            this.globeTilt = 0.3;
          }
          // holding left or right turns it by hand as well
          const hold = (Input.down('ArrowLeft', 'KeyA') ? -1 : 0) + (Input.down('ArrowRight', 'KeyD') ? 1 : 0);
          if (hold) { this.globeSpin += hold * raw * 1.5; this.globeFree = true; this.globeVel = hold * 0.024; }
        }
        if (Input.hit('Escape', 'KeyH')) { this.state = 'title'; SFX.ui(); break; }
        const rows = UI.stageRows();
        // pointing at a pin picks it, but only when the pointer was not being
        // used to turn the globe — a drag that ends over a marker is still a drag
        const picking = !this.globeDrag && this.globeMoved < 6;
        if (picking && (Input.mouse.moved || Input.mouse.clicked)) {
          for (let i = 0; i < rows.length; i++) { const r = rows[i]; if (!r.vis) continue; if (Input.mouse.x > r.x && Input.mouse.x < r.x + r.w && Input.mouse.y > r.y && Input.mouse.y < r.y + r.h) this.stageSel = i; }
        }
        if (!Input.mouse.down) this.globeMoved = 0;
        if (UI.exitHit()) { this.state = 'title'; SFX.ui(); break; }
        // up and down walk the sites in this zone and bring the globe round to
        // them; left and right are the hands on the sphere
        const zHere = zoneOf(list[this.stageSel]), zSites = STAGES_BY_ZONE[zHere.id] || list;
        const stepSite = d => { const k = zSites.indexOf(list[this.stageSel]); const nx = zSites[(k + d + zSites.length) % zSites.length]; this.stageSel = list.indexOf(nx); this.globeFree = false; this.globeVel = 0; SFX.ui(); };
        const stepZone = d => {
          const zi = ZONES.indexOf(zHere), nz = ZONES[(zi + d + ZONES.length) % ZONES.length];
          const sites = STAGES_BY_ZONE[nz.id] || [];
          let best = sites[0];
          for (const st of sites) if (Stages.unlocked(st)) best = st;
          if (best) { this.stageSel = list.indexOf(best); this.globeFree = false; this.globeVel = 0; SFX.ui(); }
        };
        if (Input.hit('ArrowUp', 'KeyW')) stepSite(-1);
        if (Input.hit('ArrowDown', 'KeyS')) stepSite(1);
        if (Input.hit('KeyQ')) stepZone(-1);
        if (Input.hit('KeyE', 'Tab')) stepZone(1);
        const rowHit = picking && Input.mouse.clicked && rows.some((r, i) => i === this.stageSel && Input.mouse.x > r.x && Input.mouse.x < r.x + r.w && Input.mouse.y > r.y && Input.mouse.y < r.y + r.h);
        const gr = UI.stageGoRect();
        const goHit = Input.mouse.clicked && Input.mouse.x > gr.x && Input.mouse.x < gr.x + gr.w && Input.mouse.y > gr.y && Input.mouse.y < gr.y + gr.h;
        if (Input.hit('Enter', 'Space', 'KeyZ', 'KeyJ') || rowHit || goHit) {
          const st = list[this.stageSel];
          if (Stages.unlocked(st)) { SFX.pick(); this.startRun(false, st, this.loadout); } else { SFX.hurt && SFX.hurt(); this.menuShake = 0.3; }
        }
        if (this.menuShake > 0) this.menuShake -= raw;
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
        if (this.finisher) Finisher.update(raw);
        else {
          if (Input.hit('KeyG', 'KeyE', 'Tab')) { this.openGenes(); break; }
          if (Input.hit('KeyH')) { this.prevState = 'play'; this.state = 'help'; break; }
          // the drawing of the system, if you are in the system to read it
          if (Input.hit('KeyM') && World.isIndoor(this.player.x)) { this.prevState = 'play'; this.state = 'plan'; Blueprint.open(); SFX.ui(); break; }
          if (this.boss && Boss.canFinish(this.boss) && Input.bitePressed()) Finisher.begin(this.boss);
        }
        this.updateWorld(dt, false); this.runDirector(dt); Missions.tick(dt);
        break;
      case 'drop':
        this.updateWorld(dt, false);
        Drop.update(raw);
        break;
      case 'morph':
        this.updateWorld(dt * 0.5, false);
        Morph.update(raw);
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
        if (Input.hit('Escape', 'KeyP', 'Enter') || UI.exitHit()) { this.state = 'play'; SFX.ui(); }
        if (Input.hit('KeyQ')) { this.storeSave(); this.startRun(true); this.state = 'title'; }
        if (Input.hit('Digit1')) { this.settings.gore = !this.settings.gore; SFX.ui(); }
        if (Input.hit('Digit2')) { this.settings.shake = !this.settings.shake; SFX.ui(); }
        if (Input.hit('Digit3')) { this.settings.mouseMove = !this.settings.mouseMove; SFX.ui(); }
        if (Input.hit('Digit4')) { this.settings.touch = this.settings.touch === false; SFX.ui(); }
        if (Input.hit('KeyC')) { this.prevState = 'pause'; this.state = 'codex'; this.codexScroll = 0; SFX.ui(); }
        break;
      case 'plan':
        Blueprint.t += raw;
        if (Input.hit('Escape', 'KeyM', 'Enter') || UI.exitHit() || Input.mouse.clicked) { this.state = this.prevState || 'play'; SFX.ui(); }
        break;
      case 'help':
        if (Input.hit('Escape', 'KeyH', 'Enter') || UI.exitHit()) { this.state = this.prevState; SFX.ui(); }
        else if (Input.hit('KeyC')) { this.state = 'codex'; this.codexScroll = 0; SFX.ui(); }
        break;
      case 'genes': {
        const P = this.player;
        if (Input.hit('Escape', 'KeyG', 'KeyE', 'Tab', 'Enter') || UI.exitHit()) { this.state = 'play'; SFX.ui(); break; }
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
        const take = Input.hit('Space', 'KeyJ', 'KeyZ') || (Input.mouse.clicked && cells.some(c => c.g.id === this.geneSel && dist(Input.mouse.x, Input.mouse.y, c.sx, c.sy) < c.r + 4));
        if (take) {
          const g = GENE_BY_ID[this.geneSel];
          // hold the old body so a big splice can grow into the new one on screen
          const wasParts = P.parts, wasLook = P.look;
          if (g && Genome.buy(P, g)) {
            const col = g.lin ? LINEAGES[g.lin].color : '#ffffff';
            if (g.apex || g.chimera) {
              const newParts = P.parts, newLook = P.look;
              P.parts = wasParts; P.look = wasLook;
              Morph.begin({
                kind: 'gene', color: col, title: g.name,
                sub: g.apex ? 'APEX GENE EXPRESSED' : 'CHIMERA EXPRESSED',
                apply: () => { P.parts = newParts; P.look = newLook; },
              });
            } else {
              SFX.pick(); SFX.levelup(); this.whiteFlash(0.3); this.shake(4);
              this.fx.glow(P.x, P.y, 60 * P.vis, col, 0.8);
              P.spliceGlow = 1; P.spliceCol = col;
              this.banner = { text: g.name, sub: 'GENE SPLICED', t: 2.6, max: 2.6, color: col };
            }
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
    Cine.update(raw);
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
    return { x, y, bite, dash: false, boost: false, brace: false };
  },
  updateWorld(dt, demo) {
    this.t += dt; World.t += dt;
    // ambience: the swamp is never completely still
    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT <= 0) {
      this.ambT = 0.085;
      const halfW = this.W / this.cam.zoom / 2 + 70, wx = this.cam.x + rand(-halfW, halfW);
      const fy = World.floorY(wx), su = World.surface(wx);
      if (fy > su + 24) {
        if (chance(0.45)) this.fx.bubbles(wx, fy - rand(1, 6), 1, 3, 8);        // marsh gas off the bed
        else if (chance(0.2)) this.fx.ripple(wx, 2, 0.22);                       // something rising
        else if (chance(0.35)) this.fx.add({ type: 'mote', x: wx, y: su + rand(10, Math.max(20, fy - su - 10)), vx: rand(-5, 5), vy: rand(-6, 3), s: 1, color: choice(['#8fb8ae', '#6d9a92', '#b6d8cf']), seed: rand(TAU), life: rand(3, 7) });
      } else if (fy < -6 && !World.isIndoor(wx) && chance(0.4)) {
        this.fx.leaf(wx, fy - rand(24, 140), choice(['#7a8a4a', '#9aa860', '#c8b070', '#8a9a58']));
      }
      // dust in the air over dry ground, and grit lifting off the banks
      if (fy < -3 && !World.isIndoor(wx)) {
        const wind = 12 + Weather.rain * 20;
        const nd = chance(0.5) ? 2 : 1;
        for (let m = 0; m < nd; m++) this.fx.add({ type: 'mote', x: wx + rand(-30, 30), y: fy - rand(4, 130), vx: rand(-1, 2) + wind * rand(0.2, 0.8), vy: rand(-7, 2), s: 1, color: choice(['#cbb98e', '#a9986f', '#e0d3ae', '#8f8060']), seed: rand(TAU), life: rand(2.5, 6) });
        if (chance(0.14)) this.fx.silt(wx, fy - 1, 1, 16);
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
    const fin = !!this.finisher;
    const inp = demo ? this.demoInput()
      : { x: fin ? 0 : ax, y: fin ? 0 : ay, bite: act && !fin && Input.bitePressed(), dash: act && !fin && Input.dashPressed(), boost: act && !fin && Input.dashHeld(), brace: act && !fin && Input.bracePressed() };
    this.engineNear = 0;
    P.update(dt, inp);
    World.ensure(P.x, this.W / this.cam.zoom + 900);
    Water.recenter(this.cam.x); Mud.recenter(this.cam.x);
    Water.update(dt); Mud.update(dt); Foliage.update(dt); Weather.update(dt); Weather.spawn(dt, this.cam);
    Alarm.update(dt); Labyrinth.update(dt); Labyrinth.clamp(this.player); Lairs.update(dt); Objectives.update(dt); Puzzles.update(dt); Abilities.update(dt); Opening.update(dt);
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
    // A hatchling framed at the same zoom as a bull is a ten-pixel smudge in
    // the middle of an empty room. The shot is framed on the animal, so the
    // smaller it is the closer the camera comes: at 0.3 ft you are looking at
    // a tunnel you could touch, and it opens out as you grow into it.
    const tz = clamp(1.35 / Math.pow(P.vis, 0.95), 0.22, 2.9) * this.zoomP * (this.state === 'title' ? 1.1 : 1);
    // the trolley ride is framed on the tank and the two pushing it; the ride
    // down the pipe wants a little more of the pipe than that
    const tz2 = Opening.on && Opening.phase === 'carry' ? clamp(tz, 1.6, 2.2)
      : Opening.on && Opening.phase === 'drop' ? clamp(tz * 0.62, 1.1, 1.7)
      : Opening.on && (Opening.phase === 'black' || Opening.phase === 'wake') ? clamp(tz * 1.05, 1.9, 3.0) : tz;
    // The zoom used to be a live float that moved a hair every frame. Every
    // background layer is a pattern locked to camera * zoom, so a zoom that
    // never settles makes the grain crawl, the strata shimmer and the whole
    // backdrop look like it is boiling. Track it smoothly, but snap what the
    // renderer actually uses to a fixed ladder so a still camera is still.
    c.zoomRaw = lerp(c.zoomRaw === undefined ? c.zoom : c.zoomRaw, tz2, 1 - Math.exp(-2.5 * dt));
    c.zoom = Math.round(c.zoomRaw * 32) / 32;
    let tx = P.x + P.vx * 0.22, ty = P.y + P.vy * 0.12;
    // an execution is framed on both of them, so the boss never leaves the shot
    if (this.finisher && this.finisher.e && !this.finisher.e.dead) {
      const b = this.finisher.e;
      tx = (P.x + b.x) / 2; ty = (P.y + b.y) / 2;
    }
    if (this.state === 'title') ty = Math.max(ty, 75);
    const k = 1 - Math.exp(-5 * dt);
    c.x = lerp(c.x, tx, k); c.y = lerp(c.y, ty, k);
    // outdoors the camera never climbs into empty sky. Indoors it is the roof
    // that bounds it, so a corridor two floors up can be looked at
    const roof = World.isIndoor(c.x) ? World.roofY(c.x) : null;
    if (roof === null) c.y = Math.max(c.y, -(this.H / 2) / c.zoom + 30);
    else {
      // A run of pipe shorter than the shot cannot be framed by pushing the
      // camera down off the crown: do that and the animal ends up pinned to
      // the top edge. Centre the run instead, and only hold the crown down
      // when there is enough headroom for it to matter.
      const half = (this.H / 2) / c.zoom, fl = World.floorY(c.x);
      c.y = fl - roof < half * 1.7 ? (roof + fl) / 2 : Math.max(c.y, roof + half - 24);
    }
    // and land the camera on a whole device pixel, so the ground, its grain and
    // everything standing on it share one grid instead of sliding against it
    const q = Math.max(0.001, c.zoom * (this.rs || 1));
    if (isFinite(c.x) && isFinite(c.y)) { c.x = Math.round(c.x * q) / q; c.y = Math.round(c.y * q) / q; }
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
    ctx.setTransform(this.rs, 0, 0, this.rs, 0, 0);
    ctx.imageSmoothingEnabled = false;
    // The front end is a room, not a camera on the swamp. Only the title shows
    // the lab floor itself; the three stations paint their own wall over the
    // top of it, so drawing it under them was both wasted and, while the wall
    // was a scrim, visible as the whole room ghosting through the screen.
    if (this.state === 'title') { Lab.draw(ctx); UI.drawTitle(ctx); UI.drawWipe(ctx); return; }
    if (this.state === 'habitat') { UI.drawHabitat(ctx); UI.drawWipe(ctx); return; }
    if (this.state === 'bench') { UI.drawLabBench(ctx); UI.drawWipe(ctx); return; }
    if (this.state === 'stages') { UI.drawStages(ctx); return; }
    const indoor = World.isIndoor(cam.x);
    if (indoor) { World.drawIndoor(ctx, cam, day); World.drawTunnelPipes(ctx, cam); }
    else { World.drawSky(ctx, cam, day); World.drawParallax(ctx, cam, day); }
    World.drawWater(ctx, cam, day);
    World.drawDeepScene(ctx, cam, day);
    World.drawTerrain(ctx, cam);
    if (indoor) World.drawTunnelFloor(ctx, cam);
    World.drawDepthShade(ctx, cam);
    World.drawDecor(ctx, cam, 0, day);
    if (indoor) Waste.draw(ctx, cam);
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
    if (this.morph) Morph.drawWorld(ctx);
    if (this.drop) Drop.drawWorld(ctx);
    for (const e of vis) if (e.type !== 'gib' && e.type !== 'proj' && !e.isBoss) e.drawHpBar(ctx);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    this.fx.draw(ctx, cam);
    this.fx.drawPops(ctx, cam);
    if (indoor) Waste.drawOver(ctx, cam);
    World.drawDecor(ctx, cam, 1, day);
    // the near side of the bore: pipes, chains and rail between you and the animal
    if (indoor && typeof Sewer !== 'undefined') Sewer.foreground(ctx, cam);
    World.drawSurface(ctx, cam, day);
    World.drawMist(ctx, cam, day);
    World.drawNight(ctx, cam, day);
    World.drawDeepGlow(ctx, cam, day);
    World.drawKaiju(ctx, cam, day);
    Cine.draw(ctx);
    UI.drawScreenFx(ctx);
    switch (this.state) {
      case 'title': UI.drawTitle(ctx); break;   // Lab paints the room first, see render()
      case 'stages': UI.drawStages(ctx); break;
      case 'intro': UI.drawIntro(ctx); break;
      case 'play': case 'shedding': case 'dying': UI.drawHUD(ctx); break;
      case 'morph': Morph.drawUI(ctx); break;
      case 'drop': Drop.drawUI(ctx); break;
      case 'genes': UI.drawGenes(ctx); break;
      case 'shed': UI.drawShed(ctx); break;
      case 'dead': UI.drawDeath(ctx); break;
      case 'pause': UI.drawHUD(ctx); UI.drawPause(ctx); break;
      case 'help': UI.drawHelp(ctx); break;
      case 'plan': Blueprint.draw(ctx); break;
      case 'codex': UI.drawCodex(ctx); break;
    }
    if (this.finisher) UI.drawFinisher(ctx);
    if ((this.state === 'play' || this.state === 'intro') && (this.touchUI || Input.touch.active) && this.settings.touch !== false) UI.drawTouch(ctx);
    if (this.settings.fps) Font.draw(ctx, this.fps + ' FPS', 4, this.H - 24, { color: '#80ff80' });
  },
};
window.addEventListener('load', () => G.init());
