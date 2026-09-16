'use strict';
// ---------------------------------------------------------------------------
// BREEDING.
//
// Everything else in this game is about eating. This is the other half of what
// an animal is for, and it is the only system where the thing you are trying to
// keep alive is not you.
//
// The shape of it:
//   COURT     find a wild crocodile in the forest or the swamp and bellow at
//             it until it believes you. You have to be an adult. It will not
//             look at a fingerling.
//   PAIR      it follows you, and it fights whatever comes at you. Having a
//             second set of jaws in the water changes how the swamp reads.
//   NEST      haul out on a hummock and build a mound. Five eggs go in it.
//   INCUBATE  and now the swamp knows there is a nest on that bank. Raccoons
//             come up the mud, herons stand off and wait, rival bulls come up
//             the channel. You and your mate are the whole defence.
//   BROOD     they hatch and they follow you in a line, and they are made of
//             paper. Feed them off your kills until they are weaned.
//
// Every one you wean is a gene point and a mark on the run. Every one that
// gets taken is not.
// ---------------------------------------------------------------------------

// The banks worth nesting on: dry ground, out of the current, with water at
// both ends of it. They are authored into MAP_PROFILE as the hummocks.
const NEST_SITES = [
  { x: -5190, name: 'THE GRAVEL BAR' },
  { x: -4550, name: 'THE CREEK BANK' },
  { x: -3420, name: 'THE NEAR HUMMOCK' },
  { x: -2730, name: 'THE FAR HUMMOCK' },
];

// ---------------------------------------------------------------------------
// A wild crocodile. Same body as a rival, none of the appetite.
// ---------------------------------------------------------------------------
class Mate extends Gator {
  constructor(x, y, size) {
    super(x, y, size, false);
    this.name = 'WILD CROCODILE';
    this.parts = buildCrocParts(CROC_LOOKS.mate);
    this.mateable = true; this.paired = false; this.threat = 0;
    this.hp = this.maxHp = Math.round(90 * Math.pow(size, 1.5));
    this.home = x; this.bellowT = rand(1, 5); this.persistent = true;
    this.foe = null; this.foeT = 0; this.courtGlow = 0;
  }
  update(dt) {
    this.tick(dt);
    const P = G.player;
    const maxSp = (130 + 45 * Math.sqrt(this.size)) * (1 - this.slow * 0.7) * (this.stun > 0 ? 0 : 1);
    this.biteCd -= dt; this.bellowT -= dt; this.foeT -= dt;
    this.courtGlow = Math.max(0, this.courtGlow - dt);
    let tx = this.x, ty = this.y, sp = maxSp * 0.38;
    if (this.paired) {
      // A paired animal has one job that is not following you: whatever is
      // trying to get at the nest, or at you.
      if (this.foeT <= 0 || !this.foe || this.foe.dead || this.foe.remove) { this.foe = Breed.raider(this); this.foeT = 1.2; }
      if (this.foe) {
        this.state = 'hunt';
        tx = this.foe.x; ty = this.foe.y; sp = maxSp;
        const [sx, sy] = this.snout;
        if (this.biteCd <= 0 && dist(sx, sy, this.foe.x, this.foe.y) < 16 + this.foe.r + 5 * this.vis) {
          this.biteCd = 1.1; this.biteT = 0.16;
          const dmg = 26 * Math.pow(this.size, 0.8);
          this.foe.flash = 0.12; this.foe.hp -= dmg;
          SFX.chomp(this.size, this.pan);
          G.fx.blood(this.foe.x, this.foe.y, 5, 0, 0, 70, this.foe.bloodColors);
          if (this.foe.hp <= 0) { this.foe.die(this); this.foe = null; }
        }
      } else {
        // station-keeping: just off your flank, a body length back
        this.state = 'patrol';
        const side = this.x < P.x ? -1 : 1;
        tx = P.x + side * (42 + 16 * this.vis); ty = P.y + 14;
        const d = this.distTo(P);
        sp = d > 260 ? maxSp : d > 90 ? maxSp * 0.7 : maxSp * 0.2;
        if (Breed.nest && Breed.phase === 'incubating' && dist(P.x, P.y, Breed.nest.x, Breed.nest.y) > 420) {
          // if you wander off during an incubation, it stays on the bank
          tx = Breed.nest.x; ty = Math.max(World.surface(Breed.nest.x) + 10, Breed.nest.y + 24); sp = maxSp;
        }
      }
    } else {
      this.state = 'patrol';
      this.retarget -= dt;
      if (this.retarget <= 0) {
        this.retarget = rand(2.5, 5.5);
        this.tx = clamp(this.home + rand(-260, 260), World.WEST + 40, -2460);
        this.ty = clamp(rand(14, 130), 10, Math.max(16, World.floorY(this.tx) - 14));
      }
      tx = this.tx; ty = this.ty;
      // a bellow: the water over its back jumps, and you can hear it
      if (this.bellowT <= 0) { this.bellowT = rand(5, 11); this.bellow(); }
    }
    this.swimToward(tx, ty, sp, this.paired ? 3 : 1.6, dt);
    this.physics(dt, maxSp, this.distTo(P));
  }
  bellow() {
    SFX.growl(this.pan);
    const s = World.surface(this.x);
    if (Math.abs(this.y - s) < 40) { G.fx.ripple(this.x, 10, 0.8); for (let i = 0; i < 7; i++) G.fx.bubbles(this.x + rand(-14, 14), s + 2, 1, 5); }
    this.jaw = 0.5; this.courtGlow = 1.2;
  }
  hurt(n, src, kind) {
    // you can kill a wild one; it just makes the swamp a lonelier place
    const r = super.hurt ? super.hurt(n, src, kind) : 0;
    if (src === G.player && this.paired) { this.paired = false; Breed.breakPair('YOUR MATE WILL NOT FOLLOW YOU NOW'); }
    return r;
  }
  die(k) { if (this.paired) Breed.breakPair('YOUR MATE IS DEAD'); super.die(k); }
}

// ---------------------------------------------------------------------------
// One of yours. Follows the animal in front of it, eats what it can reach,
// and dies to almost anything.
// ---------------------------------------------------------------------------
class Hatchling extends Gator {
  constructor(x, y, idx) {
    super(x, y, 0.3, false);
    this.name = 'YOUR HATCHLING';
    this.parts = buildCrocParts(CROC_LOOKS.hatchling);
    this.type = 'young'; this.mine = true; this.threat = 0; this.edible = false;
    this.hp = this.maxHp = 30; this.mass = 8; this.persistent = true; this.latchable = false;
    this.idx = idx; this.fed = 0; this.weaned = false; this.peepT = rand(0.5, 3); this.food = null;
  }
  update(dt) {
    this.tick(dt);
    const P = G.player;
    const maxSp = 150 * (1 - this.slow * 0.7) * (this.stun > 0 ? 0 : 1);
    this.biteCd -= dt; this.peepT -= dt;
    this.state = 'patrol';
    // ---- something to eat beats anything else -----------------------------
    if (this.food && this.food.remove) this.food = null;
    if (!this.food && chance(dt * 3) && (this.dryT || 0) < 1.2) this.food = Breed.scrapNear(this.x, this.y, 150);
    let tx, ty, sp = maxSp * 0.7;
    if (this.food) {
      tx = this.food.x; ty = this.food.y; sp = maxSp;
      if (dist(this.x, this.y, this.food.x, this.food.y) < 12 + this.food.r) {
        this.food.remove = true; this.food = null;
        this.fed++; this.biteT = 0.16;
        SFX.gulp(0.4, this.pan); G.fx.blood(this.x, this.y, 4, 0, 0, 50);
        this.size = Math.min(0.62, this.size + 0.055); this.sizeClass = this.size;
        this.hp = this.maxHp = 30 + this.fed * 9;
        if (this.fed >= Breed.WEAN) Breed.wean(this);
      }
    } else {
      // ---- otherwise: the line ---------------------------------------------
      const lead = Breed.leaderOf(this);
      const dir = lead.facing || 1;
      tx = lead.x - dir * 26; ty = lead.y + 6;
      const d = dist(this.x, this.y, tx, ty);
      sp = d > 200 ? maxSp : d > 40 ? maxSp * 0.75 : maxSp * 0.15;
      // and never below the mud
      ty = Math.min(ty, World.floorY(this.x) - 8);
    }
    // A hatchling's first act is getting off the bank it was laid on, and an
    // animal this size left out of the water is an animal a heron takes. If it
    // has been dry for more than a moment, nothing else matters.
    this.dryT = World.floorY(this.x) < 30 ? (this.dryT || 0) + dt : 0;
    if (this.dryT > 1.2) {
      if (this.wetX === undefined || this.wetX === null || World.floorY(this.wetX) < 60) this.wetX = World.findX(this.x, xx => World.floorY(xx) > 70, 600, 20);
      if (this.wetX !== null && this.wetX !== undefined) { tx = this.wetX; ty = World.surface(this.wetX) + 14; sp = maxSp; this.food = null; }
    }
    this.swimToward(tx, ty, sp, 3.4, dt);
    if (this.peepT <= 0) { this.peepT = rand(2.5, 7); if (Math.abs(this.x - P.x) < 240) SFX.peep(); }
    this.physics(dt, maxSp, 9999);
  }
  die(k) { Breed.onYoungLost(this, k); super.die(k); }
}

// ---------------------------------------------------------------------------
const Breed = {
  MIN_TIER: 4,            // SUB-ADULT. A fingerling is not breeding with anything.
  COURT_NEED: 3.2,        // seconds of holding the call
  BUILD_NEED: 1.8,        // seconds of piling the mound up
  INCUBATE: 78,           // seconds on the bank
  CLUTCH: 5,
  WEAN: 5,                // feeds before one of them is a real animal

  phase: 'none',          // none | paired | nesting | incubating | brood
  mate: null, courtT: 0, courtOn: null, buildT: 0,
  nest: null, young: [], raised: 0, lost: 0, clutches: 0,
  spawnT: 0, raidT: 0, wave: 0, t: 0, hint: '', hintT: 0, flashT: 0,

  reset() {
    this.phase = 'none'; this.mate = null; this.courtT = 0; this.courtOn = null; this.buildT = 0;
    this.nest = null; this.young.length = 0; this.raised = 0; this.lost = 0; this.clutches = 0;
    this.spawnT = 6; this.raidT = 0; this.wave = 0; this.t = 0; this.hint = ''; this.hintT = 0; this.flashT = 0; this.hearts.length = 0;
  },

  // is this a reach where wild crocodiles live at all
  country(x) { return typeof Forest !== 'undefined' && Forest.on(x) && !World.isIndoor(x); },
  ready() { return G.player.tier >= this.MIN_TIER; },

  // the nearest bank worth nesting on, if you are standing on it
  siteAt(x) {
    for (const s of NEST_SITES) if (Math.abs(x - s.x) < 90) return s;
    return null;
  },

  say(text, sub, color) {
    G.banner = { text, sub: sub || '', t: 3.4, max: 3.4, color: color || '#ffb0c8' };
  },

  // ---- wild crocodiles in the water -------------------------------------
  spawnMates(dt) {
    const P = G.player;
    if (!this.ready() || !this.country(P.x)) return;
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = rand(7, 13);
    let n = 0;
    for (const e of G.ents) if (e instanceof Mate && !e.remove) n++;
    if (n >= (this.phase === 'none' ? 2 : 1)) return;
    const halfW = G.W / G.cam.zoom / 2;
    const side = chance(0.5) ? 1 : -1;
    const x = P.x + side * (halfW + rand(40, 170));
    if (!this.country(x) || x < World.WEST + 60) return;
    const fy = World.floorY(x);
    if (fy < 60) return;                                   // it needs water to be in
    const y = clamp(rand(20, 90), 12, fy - 20);
    const m = new Mate(x, y, clamp(G.player.size * rand(0.8, 1.15), 1.2, 4.2));
    G.add(m);
  },

  // the nearest wild one you could court right now
  candidate() {
    const P = G.player;
    let best = null, bd = 130;
    for (const e of G.ents) {
      if (!(e instanceof Mate) || e.remove || e.dead || e.paired) continue;
      const d = e.distTo(P); if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  // ---- COURTSHIP --------------------------------------------------------
  court(dt) {
    const P = G.player;
    if (this.phase !== 'none') { this.courtOn = null; this.courtT = 0; return; }
    const c = this.candidate();
    if (!c) { this.courtOn = null; this.courtT = Math.max(0, this.courtT - dt * 2); return; }
    this.courtOn = c;
    if (Input.down('KeyF') || Input.touch.court) {
      this.courtT += dt;
      c.courtGlow = Math.max(c.courtGlow, 0.5);
      // it answers, and swings round to face you
      c.swimToward(P.x + sign(c.x - P.x) * 40, P.y + 8, 130, 3, dt);
      if (chance(dt * 5)) G.fx.bubbles(P.x + rand(-10, 10), P.y, 1, 6);
      if (chance(dt * 2.4)) this.heart(lerp(P.x, c.x, rand(0.2, 0.8)), lerp(P.y, c.y, rand(0.2, 0.8)));
      if (Math.floor(this.courtT * 1.4) !== Math.floor((this.courtT - dt) * 1.4)) c.bellow();
      if (this.courtT >= this.COURT_NEED) this.pair(c);
    } else {
      this.courtT = Math.max(0, this.courtT - dt * 1.4);
    }
  },

  pair(c) {
    c.paired = true; c.name = 'YOUR MATE'; c.persistent = true;
    this.mate = c; this.phase = 'paired'; this.courtT = 0; this.courtOn = null;
    SFX.levelup();
    for (let i = 0; i < 14; i++) this.heart(c.x + rand(-26, 26), c.y + rand(-20, 6));
    this.say('PAIRED', 'HAUL OUT ON A BANK AND MAKE A NEST', '#ff8ab0');
    this.hintAt('FIND A BANK');
  },

  breakPair(why) {
    this.mate = null;
    if (this.phase === 'paired' || this.phase === 'nesting') this.phase = 'none';
    this.say('ALONE AGAIN', why, '#c08090');
  },

  hearts: [],
  heart(x, y) {
    if (this.hearts.length > 90) this.hearts.shift();
    this.hearts.push({ x, y, vx: rand(-14, 14), vy: -rand(20, 46), s: rand(1, 1.9), life: rand(0.8, 1.5), max: 1.5, c: choice(['#ff6a90', '#ff9ab8', '#e04a72']) });
  },
  updateHearts(dt) {
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      h.life -= dt; if (h.life <= 0) { this.hearts.splice(i, 1); continue; }
      h.x += h.vx * dt; h.y += h.vy * dt; h.vy += 14 * dt; h.vx *= 0.98;
    }
  },

  hintAt(h) { this.hint = h; this.hintT = 6; },

  // ---- THE NEST ---------------------------------------------------------
  nesting(dt) {
    const P = G.player;
    if (this.phase !== 'paired') { if (this.phase !== 'nesting') this.buildT = 0; return; }
    const s = this.siteAt(P.x);
    const dry = World.floorY(P.x) < 4;                     // actually hauled out
    if (!s || !dry) { this.buildT = Math.max(0, this.buildT - dt * 2); return; }
    if (Input.down('KeyF') || Input.touch.court) {
      this.buildT += dt;
      if (chance(dt * 24)) G.fx.silt(P.x + rand(-18, 18), World.floorY(P.x) - 2, 2, 40);
      if (this.buildT >= this.BUILD_NEED) this.lay(s);
    } else this.buildT = Math.max(0, this.buildT - dt * 1.5);
  },

  lay(site) {
    const x = site.x, fy = World.floorY(x);
    this.nest = { x, y: fy - 4, eggs: this.CLUTCH, max: this.CLUTCH, t: 0, site, shake: 0, hit: 0 };
    this.phase = 'incubating';
    this.buildT = 0; this.raidT = rand(5, 8); this.wave = 0; this.clutches++;
    SFX.shed && SFX.shed();
    G.fx.silt(x, fy - 4, 10, 34);
    this.say('A CLUTCH OF ' + this.CLUTCH, 'EVERYTHING ON THIS BANK KNOWS', '#ffd070');
    this.hintAt('KEEP THEM OFF IT');
  },

  // whatever is currently trying to get at the nest or at you
  raider(from) {
    const P = G.player, N = this.nest;
    let best = null, bd = 1e9;
    for (const e of G.ents) {
      if (e.remove || e.dead || e === from || e.mine || e instanceof Mate) continue;
      if (!e.raider && e.threat <= 0) continue;
      const d = N ? Math.min(dist(e.x, e.y, N.x, N.y), e.distTo(P)) : e.distTo(P);
      if (d > 340) continue;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  incubate(dt) {
    const N = this.nest;
    if (this.phase !== 'incubating' || !N) return;
    const P = G.player;
    N.t += dt; N.shake = Math.max(0, N.shake - dt * 3); N.hit = Math.max(0, N.hit - dt * 2);
    // ---- the swamp comes for it ------------------------------------------
    this.raidT -= dt;
    if (this.raidT <= 0) {
      this.raidT = rand(9, 14) - Math.min(5, this.wave * 0.7);
      this.wave++;
      this.sendRaid();
    }
    // ---- anything that reaches it takes an egg ---------------------------
    for (const e of G.ents) {
      if (e.remove || e.dead || e.mine || e instanceof Mate) continue;
      if (!e.raider) continue;
      if (dist(e.x, e.y, N.x, N.y) > 22) continue;
      e.raidT = (e.raidT || 0) - dt;
      if (e.raidT > 0) continue;
      e.raidT = 2.4;
      N.eggs--; N.shake = 1; N.hit = 1;
      SFX.crack(1); G.fx.splinters(N.x, N.y - 4, 4, 34);
      if (N.eggs <= 0) { this.clutchLost(); return; }
    }
    // ---- and eventually they come out ------------------------------------
    if (N.t >= this.INCUBATE) this.hatch();
    if (N.t > 4 && N.t < 4.3) this.hintAt('THEY ARE COMING');
  },

  sendRaid() {
    const N = this.nest; if (!N) return;
    const D = G.difficulty ? G.difficulty() : 1;
    const bankSide = chance(0.5) ? 1 : -1;
    const n = 1 + (this.wave > 2 ? 1 : 0) + (this.wave > 5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const roll = Math.random();
      if (roll < 0.46) {
        // up the mud: the ones that actually eat eggs
        // a hummock is a small piece of dry ground in a lot of water, so the
        // ones that walk come up the bank itself rather than out of nowhere
        let bx = World.findX(N.x + bankSide * rand(50, 200), xx => World.floorY(xx) < -4, 320, 12);
        if (bx === null) bx = World.findX(N.x - bankSide * rand(50, 200), xx => World.floorY(xx) < -4, 320, 12);
        if (bx === null) bx = N.x + bankSide * 46;
        const a = new LandAnimal(bx, choice(this.wave > 3 ? ['raccoon', 'boar', 'opossum'] : ['raccoon', 'opossum', 'rat']));
        a.raider = true; a.nestTarget = N; a.threat = Math.max(a.threat, 0.4);
        a.pushing = true;                        // Breed drives it, not its own wandering
        G.add(a);
      } else if (roll < 0.74) {
        // standing off in the shallows, waiting for you to leave
        const b = new Bird(N.x + bankSide * rand(90, 220), 0, choice(['heron', 'egret']), 'wade');
        b.raider = true; b.nestTarget = N; b.threat = Math.max(b.threat, 0.3);
        G.add(b);
      } else {
        // and up the channel, something that wants the bank as well as the eggs
        const wx = World.findX(N.x + bankSide * rand(200, 420), xx => World.floorY(xx) > 70, 700, 30);
        if (wx === null) continue;
        const g = new Gator(wx, clamp(rand(20, 80), 12, World.floorY(wx) - 20), clamp(G.player.size * rand(0.6, 0.95), 0.8, 3.4));
        g.raider = true; g.nestTarget = N; g.name = 'NEST RAIDER';
        G.add(g);
      }
    }
    if (Math.abs(G.player.x - N.x) < 900) this.hintAt('RAIDERS');
  },

  clutchLost() {
    this.nest = null; this.phase = this.mate ? 'paired' : 'none';
    SFX.warning();
    this.say('THE CLUTCH IS GONE', 'THERE ARE OTHER BANKS', '#ff6050');
    this.clearRaiders();
  },

  clearRaiders() { for (const e of G.ents) if (e.raider) { e.raider = false; e.nestTarget = null; } },

  hatch() {
    const N = this.nest; if (!N) return;
    const n = N.eggs;
    SFX.hatch && SFX.hatch();
    for (let i = 0; i < n; i++) {
      const h = new Hatchling(N.x + rand(-14, 14), N.y - 6, i);
      this.young.push(h); G.add(h);
    }
    G.fx.splinters(N.x, N.y - 4, 10, 44);
    this.nest = null; this.phase = 'brood';
    this.clearRaiders();
    this.say(n + (n === 1 ? ' HATCHLING' : ' HATCHLINGS'), 'FEED THEM OFF YOUR KILLS', '#a8ff90');
    this.hintAt('KILL NEAR THEM');
  },

  // ---- THE BROOD --------------------------------------------------------
  // The one in front of you is the player; after that it is a line.
  leaderOf(h) {
    const live = this.young.filter(y => !y.remove && !y.dead);
    const i = live.indexOf(h);
    return i <= 0 ? G.player : live[i - 1];
  },

  // a loose piece of something one of them could swallow
  scrapNear(x, y, r) {
    let best = null, bd = r;
    for (const e of G.ents) {
      if (e.remove || !e.edible) continue;
      if (e.type !== 'gib' && e.type !== 'carrion') continue;
      const d = dist(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  wean(h) {
    if (h.weaned) return;
    h.weaned = true; h.remove = true;
    this.raised++;
    Missions.bump('brood');
    const P = G.player;
    P.genePoints += 1;
    G.score += 2500;
    SFX.levelup();
    G.fx.pop(h.x, h.y - 14, 2500, '#a8ff90', 1.4, 'WEANED');
    for (let i = 0; i < 8; i++) this.heart(h.x + rand(-12, 12), h.y + rand(-10, 4));
    this.say('ONE OF YOURS MADE IT', '+1 GENE POINT', '#a8ff90');
    this.checkBroodDone();
  },

  onYoungLost(h) {
    if (h.weaned) return;
    h.lostFlag = true; this.lost++;
    SFX.peep();
    this.say('YOU LOST ONE', this.liveYoung() > 0 ? 'GET THE REST CLEAR' : 'THAT WAS THE LAST OF THEM', '#ff6050');
    this.checkBroodDone();
  },

  liveYoung() { let n = 0; for (const y of this.young) if (!y.remove && !y.dead && !y.weaned && !y.lostFlag) n++; return n; },

  checkBroodDone() {
    if (this.phase !== 'brood') return;
    if (this.liveYoung() > 0) return;
    this.young.length = 0;
    this.phase = this.mate && !this.mate.remove ? 'paired' : 'none';
    if (this.phase === 'paired') this.hintAt('NEST AGAIN');
  },

  broodUpdate() {
    if (this.phase !== 'brood') return;
    for (let i = this.young.length - 1; i >= 0; i--) { const y = this.young[i]; if (y.remove || y.dead) this.young.splice(i, 1); }
    if (!this.young.length) this.checkBroodDone();
  },

  // raiders walk to the nest instead of wandering: one line, bolted onto
  // whatever AI they already had
  steerRaiders(dt) {
    const N = this.nest; if (!N) return;
    const P = G.player;
    for (const e of G.ents) {
      if (!e.raider || e.remove || e.dead) continue;
      // they will not come in over the top of you
      const shy = e.distTo(P) < 80 || (this.mate && e.distTo(this.mate) < 70);
      const tx = shy ? e.x + sign(e.x - P.x) * 120 : N.x;
      const want = shy ? sign(e.x - P.x) || 1 : sign(tx - e.x);
      const arrived = !shy && Math.abs(e.x - N.x) < 5;
      if (e.type === 'land') {
        // its own AI is parked; this walks it
        const sp = (e.def && e.def.speed ? e.def.speed : 60) * (shy ? 1.3 : 0.62);
        if (!arrived) { e.x += want * sp * dt; e.facing = want; }
        e.anim.mode = arrived ? 'stand' : 'walk';
        e.anim.speed = arrived ? 0 : 1;
        e.anim.phase += dt * (arrived ? 1 : 7);
        const fy = World.floorY(e.x);
        e.y = fy - (e.groundOff || 0) * e.size;
        if (fy > 30) { e.raider = false; e.pushing = false; }   // walked itself into the water
      } else if (e.type === 'bird') {
        if (!arrived) e.x += want * 26 * dt;
        e.facing = want;
      } else {
        e.tx = tx; e.ty = Math.max(N.y + 30, World.surface(N.x) + 24);
        if (!arrived) e.x += want * 12 * dt;
      }
    }
  },

  update(dt) {
    this.updateHearts(dt);
    if (G.state !== 'play' || G.player.dead) return;
    this.t += dt;
    if (this.hintT > 0) this.hintT -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.mate && (this.mate.remove || this.mate.dead)) this.mate = null;
    this.spawnMates(dt);
    this.court(dt);
    this.nesting(dt);
    this.incubate(dt);
    this.steerRaiders(dt);
    this.broodUpdate();
  },

  // ---- what it looks like in the world ----------------------------------
  drawWorld(ctx, cam) {
    const P = G.player, z = cam.zoom;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    // ---- the nest ---------------------------------------------------------
    const N = this.nest;
    if (N) {
      const [sx, sy] = cam.toScreen(N.x, N.y);
      const sh = N.shake > 0 ? Math.sin(this.t * 50) * N.shake * 2 * z : 0;
      // A mound is about two of you across, and a crocodile egg is the size of
      // a fist: the sprites are shared with the hatching screen, so both have
      // to be brought down to world scale rather than drawn at sprite scale.
      const n = SPR.nest, s = 1.9 * z;
      ctx.save();
      ctx.translate(Math.round(sx + sh), Math.round(sy));
      ctx.scale(s, s);
      ctx.drawImage(n.c, -Math.round(n.w / 2), -n.h + 3);
      const st = Math.min(3, Math.floor(N.t / this.INCUBATE * 3.4));
      const eg = SPR.egg[st];
      for (let i = 0; i < N.eggs; i++) {
        const a = (i - (N.eggs - 1) / 2) * 2.6;
        const wob = Math.sin(this.t * 3 + i) * (N.t > this.INCUBATE * 0.75 ? 1 : 0.2);
        ctx.save(); ctx.translate(a, -2.6 + (i % 2) * 0.5); ctx.rotate(wob * 0.1); ctx.scale(0.1, 0.1);
        ctx.drawImage(eg.c, -Math.round(eg.w / 2), -eg.h + 2);
        ctx.restore();
      }
      ctx.restore();
      // the shadow it throws on the mud, and the red when something gets one
      px(sx - 22 * z, sy + 1, 44 * z, 2.4 * z, 'rgba(12,18,10,0.45)');
      if (N.hit > 0) { ctx.globalAlpha = N.hit; px(sx - 24 * z, sy - 20 * z, 48 * z, 24 * z, 'rgba(255,80,60,0.18)'); ctx.globalAlpha = 1; }
    }
    // ---- a ring on the wild one you could court --------------------------
    const c = this.courtOn;
    if (c && this.phase === 'none') {
      const [cx, cy] = cam.toScreen(c.x, c.y);
      const r = (22 + 8 * c.vis) * z + Math.sin(this.t * 4) * 2 * z;
      ctx.strokeStyle = 'rgba(255,140,180,' + (0.35 + 0.25 * Math.sin(this.t * 5)).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1, 1.4 * z);
      ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.5, r, 0, 0, TAU); ctx.stroke();
    }
    // ---- the hearts ------------------------------------------------------
    for (const h of this.hearts) {
      const [hx, hy] = cam.toScreen(h.x, h.y);
      const a = Math.min(1, h.life / 0.5), w = Math.max(1, Math.round(h.s * 1.2 * z));
      ctx.globalAlpha = a;
      px(hx - w, hy - w, w, w, h.c); px(hx, hy - w, w, w, h.c);
      px(hx - w, hy, w * 2, w, h.c); px(hx - w / 2, hy + w, w, w, h.c);
      ctx.globalAlpha = 1;
    }
    // ---- a raider you should be looking at -------------------------------
    if (N) for (const e of G.ents) {
      if (!e.raider || e.remove || e.dead) continue;
      const [ex, ey] = cam.toScreen(e.x, e.y - 18);
      const b = Math.sin(this.t * 7) > 0 ? '#ff5040' : '#ffb0a0';
      px(ex - 3 * z, ey - 6 * z, 6 * z, 2 * z, b);
      px(ex - 1.5 * z, ey - 4 * z, 3 * z, 2 * z, b);
    }
  },

  // is there something to hold the key on right now (the touch pad asks)
  prompting() {
    const P = G.player;
    if (!P || G.state !== 'play') return false;
    if (this.phase === 'none') return !!this.courtOn;
    if (this.phase === 'paired') return !!this.siteAt(P.x) && World.floorY(P.x) < 4;
    return false;
  },

  // ---- the prompt, and what the brood is doing --------------------------
  drawHud(ctx) {
    const W = G.W, H = G.H, P = G.player;
    const touch = Input.touch.active;
    // ---- HOLD F ----------------------------------------------------------
    let prompt = null, frac = 0, label = '';
    if (this.phase === 'none' && this.courtOn) { prompt = 'CALL'; frac = this.courtT / this.COURT_NEED; label = 'COURT'; }
    else if (this.phase === 'paired' && this.siteAt(P.x) && World.floorY(P.x) < 4) { prompt = 'BUILD'; frac = this.buildT / this.BUILD_NEED; label = 'MAKE A NEST'; }
    if (prompt) {
      const cx = W / 2, y = H - 74;
      const lw = Font.width(label) + 16;
      ctx.fillStyle = 'rgba(8,14,14,0.72)'; ctx.fillRect(cx - lw / 2, y - 2, lw, 24);
      UI.bracket(ctx, cx - lw / 2, y - 2, lw, 24, 'rgba(255,150,190,0.5)', 5);
      Font.draw(ctx, label, cx, y + 2, { color: '#ffc8dc', align: 'center' });
      UI.meter(ctx, cx - lw / 2 + 5, y + 12, lw - 10, 6, clamp(frac, 0, 1), '#ff7aa8', '#2a1018');
      drawKeyCap(ctx, cx - 14, y - 22, 28, 17, touch ? 'TAP' : 'F', { lit: frac > 0, color: '#ff9ac0', scale: 1 });
    }
    // ---- the brood readout ----------------------------------------------
    if (this.phase === 'none' && !this.raised) return;
    let y = (UI.hazBottom || 60);
    const t = this.t;
    ctx.fillStyle = 'rgba(6,12,12,0.6)'; ctx.fillRect(6, y, 108, 11);
    let text = '', col = '#ff9ac0', f = -1;
    if (this.phase === 'incubating' && this.nest) { text = 'EGGS ' + this.nest.eggs; col = '#ffd070'; f = this.nest.t / this.INCUBATE; }
    else if (this.phase === 'brood') { text = 'BROOD ' + this.liveYoung(); col = '#a8ff90'; }
    else if (this.phase === 'paired' || this.phase === 'nesting') { text = 'PAIRED'; col = '#ff9ac0'; }
    else { text = 'RAISED ' + this.raised; col = '#a8ff90'; }
    Font.draw(ctx, text, 9, y + 3, { color: f >= 0 && Math.floor(t * 6) % 2 && this.nest && this.nest.hit > 0 ? '#ff6050' : col });
    if (f >= 0) UI.meter(ctx, 58, y + 3, 52, 5, clamp(f, 0, 1), col, '#2a1c0a');
    else if (this.raised || this.lost) Font.draw(ctx, this.raised + '/' + (this.raised + this.lost), 111, y + 3, { color: '#7f9a90', align: 'right' });
    y += 13;
    UI.hazBottom = y;
    // ---- one word of direction ------------------------------------------
    if (this.hintT > 0) {
      const a = Math.min(1, this.hintT / 1.2);
      ctx.globalAlpha = a;
      Font.draw(ctx, this.hint, 9, y + 2, { color: '#7f9a90' });
      ctx.globalAlpha = 1;
      UI.hazBottom = y + 12;
    }
  },
};
