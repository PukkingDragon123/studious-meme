'use strict';
// death-roll timing: the window sits three quarters through each beat
// Death-roll timing. Deliberately generous: the window is most of the beat and
// the beat is slow, so the roll is a rhythm you play along to rather than a
// reflex test you fail. Missing costs payout, never the grip.
const QTE_AT = 0.72, QTE_PERFECT = 0.20, QTE_GOOD = 0.40;
class Player {
  constructor() { this.reset(); }
  reset() {
    this.x = 0; this.y = 70; this.vx = 0; this.vy = 0; this.angle = 0; this.facing = 1;
    this.mass = 0; this.size = 1; this.sizeTarget = 1; this.tier = 0; this.sheds = 0;
    this.netT = 0; this.netHp = 0; this.netBy = null; this.netHeld = false;
    this.haulT = 0; this.haulHp = 0; this.haulBy = null; this.haulHeld = false;
    this.skills = { ripper: 0, behemoth: 0, phantom: 0, abyssal: 0 }; this.evo = {}; this.picked = [];
    this.hide = 'wild'; this.primeGene = null; this.strain = 0;
    this.genes = ['core']; this.genePoints = 0; this.geneSpent = 0; this.affinity = {}; this.apex = null; this.newPoints = 0;
    this.st = {
      speed: 1, accel: 1, bite: 1, biteRadius: 1, hpMul: 1, armor: 0, bulletArmor: 0, hungerRate: 1, regen: 0, lifesteal: 0,
      rollDmg: 1, rollSpeed: 1, latchMul: 2, pierce: false, crit: 0, multiChomp: false, goreMul: 1, frenzy: false, ironStomach: false, bullRush: false,
      growth: 1, fearAura: false, knockImmune: false, ambush: false, stealth: 1, dashCharges: 1, dashCd: 1, dashDist: 1, dashBite: false, wraith: false, leapMul: 1,
      venom: 0, lure: 0, toxicBlood: false, venomImmune: false, leviathan: false, hungerRestore: 1, bleed: false,
      // animal traits
      swallow: 1, magnet: 0, autoEat: false, reflect: 0, barb: 0, lunge: 0, landSpeed: 1, hop: 1, landRegen: 0, scavenge: 0,
      hullMul: 1, ramMul: 1, turn: 1, bloodScent: false, woundMul: 1, nightEyes: false, airGrab: false, noEscape: false,
      quake: false, manEater: false, gibLife: 1, shockDmg: 1,
      // environment tolerance: how fast filth and pressure accumulate, and how
      // deep you can go before the water starts squeezing
      toxRes: 1, crushRes: 1, crushDepth: 560, acidRes: 1,
      // species signatures
      smallGrowth: 1, hatchling: false, biteRate: 1, chainCrit: 0, rollWindow: 1, bigLatch: 0,
      fishSlayer: 1, fishSwallow: false, ambushMul: 2.5,
    };
    this.traits = [];
    this.lastMax = this.maxHp; this.hp = this.maxHp; this.hunger = 100;
    this.chain = new CrocChain(this.x, this.y, 0); this.look = CROC_LOOKS.base; this.parts = buildCrocParts(this.look);
    this.jaw = 0; this.biteT = 0; this.biteCd = 0; this.biteHit = false; this.biteCount = 0;
    this.latched = null; this.latchT = 0; this.rollT = 0; this.roll = 0; this.rollCount = 0;
    this.grabbed = null; this.tether = null; this.breakFree = 0;
    this.dashCd = 0; this.dashCharges = 1; this.dashT = 0; this.ramHit = new Set();
    this.stam = 1; this.boosting = false; this.boostT = 0; this.noStamT = 0;
    this.braceT = 0; this.braceCd = 0; this.braceFlash = 0; this.parries = 0; this.strainBonus = 0;
    this.spliceGlow = 0; this.spliceCol = '#40f0c8';
    this.qteLast = -1; this.qteLastT = 0; this.perfectT = 0;
    this.invuln = 0; this.hurtFlash = 0; this.hurtT = -9; this.dead = false; this.deathT = 0; this.cause = ''; this.killer = null;
    this.toxin = 0; this.rads = 0; this.crush = 0; this.hazT = 0;
    this.combo = 0; this.comboT = 0; this.frenzyT = 0; this.stillT = 0; this.ambushReady = false; this.ambushT = 0; this.moving = false; this.wasAir = false; this.airT = 0; this.onLand = false; this.jumpCd = 0;
    this.poisonT = 0; this.venomDps = 0; this.legPhase = 0; this.ghosts = []; this.ghostT = 0; this.starving = false; this.gulpT = 0;
    this.frozen = false; this.hidden = false; this.mudT = 0; this.printT = 0;
    this.wet = 1; this.dripT = 0;
    Trials.reset(this);
  }
  // visual/geometric scale: the same compression every other creature uses, so a 27 ft croc is drawn 27 ft long
  get vis() { return Math.pow(this.size, 0.58); }
  get maxHp() { return Math.round((60 + 45 * this.size) * this.st.hpMul); }
  // The exponent is what makes a bull's bite matter; the floor under it is what
  // stops a hatchling needing ten chews to open a minnow.
  get biteDmg() { return Math.max(2.4, 5 * Math.pow(this.size, 1.3)) * this.st.bite * this.strainMul * (this.frenzyT > 0 ? 1.3 : 1); }
  get biteRange() { return (9 + 6 * this.vis) * this.st.biteRadius * (this.st.airGrab && !this.inWater ? 1.7 : 1); }
  get snout() { const h = this.chain.nodes[0], L = 16 * this.vis; return [h.x + Math.cos(h.a) * L, h.y + Math.sin(h.a) * L]; }
  get lengthFt() { return 1.5 * this.size; }
  get strainMul() { return 1 / (1 + (this.strain || 0) * 0.6); }
  get maxStam() { return 1 + 0.5 * Math.max(0, this.st.dashCharges - 1); }
  get boostMul() { return this.boosting ? 1.75 : 1; }
  get speedMax() { return (150 + 30 * Math.sqrt(this.size)) * this.st.speed * this.strainMul * this.boostMul * (this.frenzyT > 0 ? 1.4 : 1); }
  get inWater() { return this.y > World.surface(this.x); }
  nearestDist(x, y) { let m = 1e9; for (const n of this.chain.nodes) { const d = dist(x, y, n.x, n.y); if (d < m) m = d; } return m - 4 * this.vis; }
  recomputeStats() { const ratio = this.hp / this.lastMax; this.lastMax = this.maxHp; this.hp = clamp(ratio * this.maxHp, 1, this.maxHp); }
  rebuildLook() { this.look = computeLook(this); this.parts = buildCrocParts(this.look); }

  // A net has landed on you. This is not damage — you cannot be hurt out of
  // it and healing does not help. You have a few seconds of thrashing to tear
  // it, and if you do not, they winch you in and the run ends in a tank.
  snare(src) {
    if (this.dead || this.netT > 0) return;
    this.netT = 4.2; this.netHp = 6 + Math.round(this.size * 2); this.netBy = src || null;
    G.shake(9); SFX.thud && SFX.thud(0);
    G.fx.text(this.x, this.y - 22 * this.vis, 'NETTED - MASH TO TEAR', { color: '#ff6040', life: 2.2 });
    G.banner = { text: 'NETTED', sub: 'TEAR IT OR THEY TAKE YOU', t: 2.4, max: 2.4, color: '#ff4030' };
  }
  // thrashing inside it: every bite tears a strand
  updateNet(dt, inp) {
    this.netT -= dt;
    this.vx = approach(this.vx, 0, 260 * dt);
    this.vy = approach(this.vy, this.y > World.surface(this.x) ? -18 : 40, 160 * dt);
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.chain.solve(this.x, this.y, this.angle + Math.sin(this.t * 26) * 0.12, this.vis, dt, 0);
    this.jaw = 0.4 + Math.abs(Math.sin(this.t * 18)) * 0.5;
    if (chance(dt * 14)) G.fx.bubbles(this.x + rand(-10, 10) * this.vis, this.y, 1, 4);
    if (inp && (inp.bite || inp.dash || inp.brace)) {
      if (!this.netHeld) { this.netHeld = true; this.netHp -= 1; G.shake(3); SFX.bite && SFX.bite(this.size, 0);
        G.fx.sparks(this.x + rand(-8, 8) * this.vis, this.y + rand(-6, 6) * this.vis, 3); }
    } else this.netHeld = false;
    if (this.netHp <= 0) {
      this.netT = 0; this.invuln = Math.max(this.invuln, 1.2);
      G.fx.text(this.x, this.y - 22 * this.vis, 'TORE FREE', { color: '#7affda', life: 1.6 });
      SFX.levelup && SFX.levelup();
      if (this.netBy) this.netBy.netCd = Math.max(this.netBy.netCd, 4);
      return;
    }
    if (this.netT <= 0) this.die('CAPTURED', this.netBy);
  }
  // ---- picked up ---------------------------------------------------------
  // Small enough to lift, and a man who has decided to lift you will. He does
  // not stop to fight: he gets a grip under the belly, tucks you under an arm
  // and walks. Where he is walking is a crate, and the crate is the end of the
  // run. Mash to buck out of his hands before he gets there.
  hauled(by) {
    if (this.dead || this.haulT > 0 || this.netT > 0) return;
    this.haulT = 6.0; this.haulHp = 5 + Math.round(this.size * 6); this.haulBy = by || null; this.haulHeld = false;
    this.grabbed = false;
    G.shake(10); SFX.thud && SFX.thud(0); SFX.yell && SFX.yell(0);
    Alarm.notice && Alarm.notice(0.5, by, 'THEY HAVE YOU');
    G.fx.text(this.x, this.y - 20 * this.vis, 'GRABBED - MASH', { color: '#ff6040', life: 2 });
    G.banner = { text: 'PICKED UP', sub: 'BUCK OUT OR THEY BAG YOU', t: 2.4, max: 2.4, color: '#ff4030' };
  }
  updateHaul(dt, inp) {
    const by = this.haulBy;
    this.haulT -= dt;
    if (!by || by.dead || by.remove) {                      // he dropped you
      this.haulT = 0; this.vy = 40; this.invuln = Math.max(this.invuln, 0.8); return;
    }
    // carried under the arm, head forward, thrashing
    by.carrying = this;
    this.x = by.x + by.facing * 6;
    this.y = by.y - (by.worldLen || 24) * 0.42;
    this.vx = by.vx; this.vy = 0;
    this.angle = Math.sin(this.t * 22) * 0.22;
    this.chain.solve(this.x, this.y, this.angle, this.vis, dt, 0);
    this.jaw = 0.3 + Math.abs(Math.sin(this.t * 16)) * 0.6;
    if (chance(dt * 6)) G.fx.print && G.fx.print(by.x, World.floorY(by.x) - 1, 3, by.facing);
    if (inp && (inp.bite || inp.dash || inp.brace)) {
      if (!this.haulHeld) {
        this.haulHeld = true; this.haulHp -= 1; G.shake(3);
        SFX.bite && SFX.bite(this.size, 0);
        by.hp -= this.biteDmg * 0.35; by.flash = 0.1;
        G.fx.blood(by.x, by.y - (by.worldLen || 24) * 0.4, 2, 0, 0, 24);
      }
    } else this.haulHeld = false;
    if (this.haulHp <= 0 || by.hp <= 0) {                   // bucked out of his arms
      this.haulT = 0; by.carrying = null; by.panicked = true; by.hurtCd = 1.2;
      this.vy = -120; this.vx = -by.facing * 180; this.invuln = Math.max(this.invuln, 1.2);
      G.fx.text(this.x, this.y - 22 * this.vis, 'BUCKED OUT', { color: '#7affda', life: 1.6 });
      SFX.levelup && SFX.levelup(); SFX.scream && SFX.scream(by.pan);
      return;
    }
    if (this.haulT <= 0) { by.carrying = null; this.die('TAKEN', by); }
  }
  update(dt, inp) {
    if (this.dead) { this.updateDead(dt); return; }
    if (this.netT > 0) { this.updateNet(dt, inp); return; }
    if (this.haulT > 0) { this.updateHaul(dt, inp); return; }
    if (this.frozen) { this.vx = this.vy = 0; this.chain.solve(this.x, this.y, this.angle, this.vis, dt, 0); return; }
    if (this.invuln > 0) this.invuln -= dt; if (this.hurtFlash > 0) this.hurtFlash -= dt; if (this.biteCd > 0) this.biteCd -= dt; if (this.jumpCd > 0) this.jumpCd -= dt;
    if (this.frenzyT > 0) this.frenzyT -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    // Stamina drives both halves of the speed button: hold it to run, flick it
    // upward to leap. One pool, so pushing the throttle costs you the jump.
    if (this.noStamT > 0) this.noStamT -= dt;
    if (this.boostT > 0) this.boostT -= dt;
    this.boosting = false;
    if (inp.boost && this.stam > 0.02 && this.noStamT <= 0 && !this.grabbed && this.dashT <= 0) {
      this.boosting = true;
      this.stam = Math.max(0, this.stam - dt * 0.42);
      if (this.stam <= 0) { this.noStamT = 1.1; SFX.hurt && SFX.hurt(); }
    } else {
      this.stam = Math.min(this.maxStam, this.stam + dt * (this.noStamT > 0 ? 0.18 : 0.34) / Math.max(0.4, this.st.dashCd));
    }
    // growth
    this.sizeTarget = massToSize(this.mass); this.size += (this.sizeTarget - this.size) * Math.min(1, 4 * dt);
    // hunger
    this.hunger -= dt * 1.3 * this.st.hungerRate * (1 + this.size * 0.04);
    if (this.hunger <= 0) {
      this.hunger = 0; this.starving = true; this.hp -= this.maxHp * 0.035 * dt; SFX.heartbeat();
      if (chance(dt * 0.8)) G.fx.text(this.x, this.y - 22 * this.vis, 'STARVING', { color: '#ff8040' });
      if (this.hp <= 0) return this.die('STARVED');
    } else this.starving = false;
    // genetic rejection: past the body's tolerance the splices start fighting.
    // Growing a tier raises the limit, so an overloaded build is survivable if
    // you can feed through it.
    this.strain = Genome.strain(this);
    if (this.strain > 0) {
      this.hp -= this.maxHp * 0.012 * this.strain * dt;
      if (chance(dt * 2.4 * Math.min(1, this.strain))) {
        G.fx.blood(this.x, this.y + rand(-6, 6) * this.vis, 1, 0, 0, 24, ['#7a1030', '#a02040']);
        if (chance(0.25)) G.fx.text(this.x, this.y - 20 * this.vis, 'REJECTION', { color: '#ff5090', life: 1 });
      }
      if (this.hp <= 0) return this.die('REJECTED');
    }
    if (this.st.regen > 0 && this.hunger > 25) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.st.regen * dt);
    if (this.st.landRegen > 0 && this.onLand) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.st.landRegen * dt);
    if (this.poisonT > 0) { this.poisonT -= dt; this.hp -= this.venomDps * dt; if (chance(dt * 6)) G.fx.blood(this.x, this.y, 1, 0, 0, 20, ['#40c040', '#208030']); if (this.hp <= 0) return this.die('POISONED'); }
    if (this.hazards(dt)) return;
    // input
    let ix = inp.x, iy = inp.y; const mag = Math.hypot(ix, iy); if (mag > 1) { ix /= mag; iy /= mag; }
    this.moving = mag > 0.15;
    if (this.moving) { if (this.stillT > 0.5) { this.ambushReady = true; this.ambushT = 0.5; } this.stillT = 0; } else this.stillT += dt;
    if (this.ambushT > 0) { this.ambushT -= dt; if (this.ambushT <= 0) this.ambushReady = false; }
    if (this.stillT > 0.5) this.ambushReady = true;
    if (this.braceCd > 0) this.braceCd -= dt;
    if (this.braceT > 0) this.braceT -= dt;
    if (this.braceFlash > 0) this.braceFlash -= dt;
    // Wet. A crocodile that has just come out of the water is soaked, and stays
    // soaked: the hide darkens, it beads, it drips, and it leaves wet ground
    // behind it until it has been out for the best part of a minute.
    {
      const sub = this.y > World.surface(this.x) + 2 * this.vis;
      if (sub) this.wet = 1;
      else if (this.y > World.surface(this.x) - 6 * this.vis) this.wet = Math.min(1, this.wet + dt * 0.9);
      else this.wet = Math.max(0, this.wet - dt * (0.028 + (Weather.rain > 0.2 ? -0.05 : 0)));
      if (Weather.rain > 0.25 && !World.isIndoor(this.x)) this.wet = Math.min(1, this.wet + dt * 0.35 * Weather.rain);
      if (!sub && this.wet > 0.08) {
        // drips: more of them the wetter you are and the more you are moving
        this.dripT -= dt * (0.6 + this.wet * 2.4 + Math.min(2, Math.abs(this.vx) / 90));
        if (this.dripT <= 0) {
          this.dripT = 0.05 + rand(0, 0.08);
          const n = this.chain.nodes, k = n[randi(0, n.length - 1)];
          G.fx.add({ type: 'drop', x: k.x + rand(-3, 3) * this.vis, y: k.y + 3 * this.vis, vx: this.vx * 0.1 + rand(-8, 8), vy: rand(6, 30), s: 1, color: chance(0.4) ? '#cfe9e6' : '#9fd0cb', life: 1.4 });
        }
        // and a wet patch where a soaked animal stands on dry ground
        if (this.onLand && this.wet > 0.4 && chance(dt * 5 * this.wet)) {
          const fy = World.floorY(this.x + rand(-8, 8) * this.vis);
          G.fx.add({ type: 'wetmark', x: this.x + rand(-10, 10) * this.vis, y: fy - 1, r: rand(3, 7) * this.vis, seed: randi(0, 900), life: rand(4, 9) });
        }
      }
    }
    if (this.onLand) Trials.bump(this, 'land', Math.abs(this.vx) * dt * 0.5);
    if (World.light(G.day) < 0.3 && !World.isIndoor(this.x)) Trials.bump(this, 'night', dt);
    Trials.best(this, 'deep', Math.max(0, this.y - World.surface(this.x)));
    if (this.qteLastT > 0) this.qteLastT -= dt;
    if (this.perfectT > 0) this.perfectT -= dt;
    if (this.spliceGlow > 0) { this.spliceGlow -= dt * 0.8; if (chance(dt * 20)) G.fx.sparks(this.x + rand(-16, 16) * this.vis, this.y + rand(-8, 8) * this.vis, 2); }
    if (inp.brace) this.brace();
    if (inp.bite) this.bite();
    if (inp.dash) this.dash(ix, iy);
    const surf = World.surface(this.x), fy = World.floorY(this.x), under = this.y > surf, landHere = fy < 0;
    if (this.grabbed) { ix *= 0.2; iy *= 0.2; }
    if (under) {
      const acc = 560 * this.st.accel * (this.latched ? 0.4 : 1) * (this.grabbed ? 0.2 : 1);
      this.vx += ix * acc * dt; this.vy += iy * acc * dt;
      const sp = Math.hypot(this.vx, this.vy), max = this.speedMax * (this.latched ? 0.55 : 1);
      if (sp > max && this.dashT <= 0) { const k = 1 - Math.min(1, 5 * dt) * (1 - max / sp); this.vx *= k; this.vy *= k; }
      const dragK = this.moving ? 1.0 : 2.4; this.vx *= Math.exp(-dragK * dt); this.vy *= Math.exp(-dragK * dt);
      this.vy -= 5 * dt;
      if (this.wasAir) { this.wasAir = false; const p = clamp(Math.hypot(this.vx, this.vy) / 200, 0.4, 3) * Math.sqrt(this.vis); G.fx.splash(this.x, p, this.vx); Water.splash(this.x, p * 90, 16 * this.size); SFX.splash(p); G.shake(p * 1.5); G.fx.bubbles(this.x, this.y + 8, Math.round(8 * p), 10 * this.size, 20); if (this.mudT > 0.2) { G.fx.silt(this.x, this.y, 8, 30); this.mudT = 0; } }
      this.onLand = false; this.airT = 0;
    } else {
      this.vy += 900 * dt;
      if (landHere && this.y >= fy - 5 * this.vis - 1) {
        this.onLand = true; this.y = fy - 5 * this.vis; if (this.vy > 0) this.vy = 0;
        // a crocodile on land is slower than in the water, but it is not helpless
        const landSpeed = this.speedMax * 0.62 * this.st.landSpeed;
        const grip = ix !== 0 ? 7 : 9;   // pushes off quickly, stops quickly
        this.vx += (ix * landSpeed - this.vx) * Math.min(1, grip * dt);
        // walk up a slope instead of grinding to a halt against it
        const ahead = World.floorY(this.x + 8 * this.vis * sign(this.vx || ix || 1));
        const rise = fy - ahead;
        if (rise > 1 && Math.abs(this.vx) > 6) this.vx *= 1 - Math.min(0.45, rise / (26 * this.vis));
        if (iy < -0.5 && this.jumpCd <= 0) { this.vy = -230 * this.st.hop; this.jumpCd = 0.6; Trials.bump(this, 'jumps'); G.fx.smoke(this.x, this.y + 4 * this.vis, 3, '#6b5a3a'); SFX.thud && SFX.thud(); }
        // one puff of grit per footfall rather than a random dribble
        if (Math.abs(this.vx) > 14) {
          this.stepT = (this.stepT || 0) + Math.abs(this.vx) * dt;
          const stride = 13 * this.vis;
          if (this.stepT > stride) {
            this.stepT = 0;
            G.fx.smoke(this.x - sign(this.vx) * 8 * this.vis, this.y + 4 * this.vis, 1, '#7a6a4a');
            // past leviathan the footfalls themselves are an event
            if (this.size >= 8) { G.shake(Math.min(7, (this.size - 7) * 1.6)); SFX.thud && SFX.thud(); G.fx.smoke(this.x, this.y + 4 * this.vis, 3, '#8a7a5a'); }
          }
        } else this.stepT = 0;
        if (this.wasAir) { this.wasAir = false; SFX.thud(); G.shake(2); }
      } else {
        this.onLand = false; this.vx += ix * 140 * dt; this.airT += dt;
        if (!this.wasAir) {
          this.wasAir = true; const p = clamp(Math.hypot(this.vx, this.vy) / 220, 0.5, 3) * Math.sqrt(this.vis);
          G.fx.splash(this.x, p, this.vx); SFX.breach(); this.vy *= this.st.leapMul;
          if (this.st.wraith) G.slowmo(0.35, 0.7);
          if (this.vy < -160) G.fx.text(this.x, this.y - 20 * this.vis, 'BREACH!', { color: '#a0e0ff' });
        }
      }
    }
    // --- sandbox interactions ---
    const sp = Math.hypot(this.vx, this.vy);
    if (this.mudT > 0) this.mudT -= dt * 0.25;
    if (Math.abs(this.y - surf) < 14 * this.vis && Math.abs(this.vx) > 30) Water.wake(this.x, this.vx, this.vis, dt);
    if (this.onLand) {
      const soft = Mud.softness(this.x);
      if (soft > 0.1) {
        for (const n of this.chain.nodes) Mud.press(n.x, 1.8 * this.vis, 6 * this.vis);
        this.mudT = Math.max(this.mudT, soft);
        this.printT -= dt * Math.abs(this.vx);
        if (this.printT <= 0 && Math.abs(this.vx) > 8) { this.printT = 16 * this.vis; const legs = [this.chain.nodes[1], this.chain.nodes[4]]; for (const l of legs) G.fx.print(l.x, World.floorY(l.x) - 1, 5 * this.vis, this.facing); }
      }
      Foliage.disturb(this.x, this.y, this.vx, 10 * this.vis);
    } else if (under) {
      const fy0 = World.floorY(this.x);
      if (this.y > fy0 - 9 * this.vis && sp > 40 && chance(dt * 10)) G.fx.silt(this.x, fy0, 3, 25 + sp * 0.2);
      Foliage.disturb(this.x, this.y, this.vx, 9 * this.vis);
      // the tail drags through the bed too
      const tn = this.chain.nodes[7];
      if (tn) Foliage.disturb(tn.x, tn.y, this.vx * 0.7, 7 * this.vis);
    }
    // dash
    if (this.dashT > 0) {
      this.dashT -= dt; if (under && chance(0.9)) G.fx.bubbles(this.x, this.y, 2, 6 * this.vis, 0);
      if (this.st.bullRush || this.st.dashBite) this.ramCheck();
      this.ghostT -= dt; if (this.ghostT <= 0) { this.ghostT = 0.04; this.pushGhost(0.35); }
    } else this.ramHit.clear();
    if (this.boosting) {
      const sp2 = Math.hypot(this.vx, this.vy);
      if (under) {
        if (chance(dt * 34)) G.fx.bubbles(this.x - Math.cos(this.angle) * 12 * this.vis, this.y, 1, 5 * this.vis, -10);
        if (chance(dt * 14)) G.fx.add({ type: 'spark', x: this.x - Math.cos(this.angle) * 14 * this.vis + rand(-6, 6), y: this.y + rand(-5, 5) * this.vis, vx: -this.vx * 0.2, vy: rand(-8, 8), s: 1, color: '#bfe8ff', life: 0.3 });
        if (sp2 > 60) Water.splash(this.x, 6 * dt * 60 * this.vis, 12 * this.vis);
      } else if (this.onLand && Math.abs(this.vx) > 30) {
        if (chance(dt * 22)) G.fx.smoke(this.x - sign(this.vx) * 10 * this.vis, this.y + 4 * this.vis, 1, '#8a7a5a');
        if (chance(dt * 16)) G.fx.silt(this.x - sign(this.vx) * 8 * this.vis, this.y + 5 * this.vis, 1, 26);
      }
      if (this.pushGhost && chance(dt * 24)) this.pushGhost(0.18);
    }
    if (this.st.wraith && Math.hypot(this.vx, this.vy) > this.speedMax * 0.7) { this.ghostT -= dt; if (this.ghostT <= 0) { this.ghostT = 0.08; this.pushGhost(0.3); } }
    for (let i = this.ghosts.length - 1; i >= 0; i--) { this.ghosts[i].life -= dt; if (this.ghosts[i].life <= 0) this.ghosts.splice(i, 1); }
    // integrate
    this.x += this.vx * dt; this.y += this.vy * dt;
    const fy2 = World.floorY(this.x);
    if (this.y > fy2 - 5 * this.vis) { this.y = fy2 - 5 * this.vis; if (this.vy > 0) this.vy *= -0.15; if (fy2 < 0) this.onLand = true; }
    if (this.y < -700) { this.y = -700; this.vy = Math.max(this.vy, 0); }
    // the system dead-ends on a concrete bulkhead; there is nothing west of it
    const wall = MapData.x0 + 26 * this.vis;
    if (this.x < wall) { this.x = wall; if (this.vx < 0) this.vx *= -0.2; }
    if (G.intro && G.intro.grate && !G.intro.grate.broken) { const gx = G.intro.grate.x - 26 * this.vis; if (this.x > gx) { this.x = gx; if (this.vx > 0) this.vx = 0; } }
    const roof = World.roofY(this.x);
    if (roof !== null) { const lim = roof + 6 * this.vis; if (this.y < lim) { this.y = lim; if (this.vy < 0) this.vy *= -0.2; } }
    // heading
    let targetA = this.angle;
    if (this.onLand) {
      if (Math.abs(this.vx) > 8) this.facing = sign(this.vx);
      // follow the ground, but never rear up: a croc on a steep bank still reads as a croc
      const slope = Math.atan2(World.floorY(this.x + 10 * this.facing) - World.floorY(this.x - 10 * this.facing), 20 * this.facing);
      const pitch = clamp(slope, -0.7, 0.7);
      targetA = (this.facing > 0 ? 0 : Math.PI) + (this.facing > 0 ? pitch : -pitch);
    } else if (sp > 12) targetA = Math.atan2(this.vy, this.vx);
    if (this.grabbed) targetA = this.angle;
    this.angle = angleLerp(this.angle, targetA, 1 - Math.exp(-(under ? 7 * this.st.turn : 3.5) * dt));
    if (!this.onLand) this.facing = Math.cos(this.angle) >= 0 ? 1 : -1;
    // body
    const swim = clamp(sp / this.speedMax, 0, 1.3);
    this.chain.solve(this.x, this.y, this.angle, this.vis, dt, this.onLand ? 0.15 : swim, this.onLand);
    if (this.onLand) this.legPhase += Math.abs(this.vx) * dt * (TAU / Math.max(7, 13 * this.vis));
    else this.legPhase += dt * (2 + swim * 7);
    // jaws
    if (this.biteT > 0) {
      this.biteT -= dt;
      if (this.biteT > 0.1) this.jaw = (0.18 - this.biteT) / 0.08;
      else { this.jaw = this.biteT / 0.1; if (!this.biteHit) { this.biteHit = true; this.doBiteHit(); } }
      if (this.biteT <= 0) this.jaw = 0;
    } else if (this.latched) this.jaw = 0.3;
    else if (this.grabbed) this.jaw = 0.6;
    else this.jaw = lerp(this.jaw, this.moving && sp > this.speedMax * 0.6 ? 0.12 : 0, 0.1);
    // latched prey
    if (this.latched) {
      const e = this.latched;
      if (e.dead || e.remove) this.latched = null;
      else {
        const [sx, sy] = this.snout; e.x = lerp(e.x, sx, 0.5); e.y = lerp(e.y, sy, 0.5); e.vx = this.vx; e.vy = this.vy; e.stun = 0.3; e.aware = true; e.awareT = 2;
        this.latchT += dt;
        if (this.latchT > 3 && !this.st.noEscape && chance(dt * 1.2)) { this.latched = null; e.vx = -this.facing * 220; e.vy = -60; e.stun = 0; G.fx.text(e.x, e.y - 12, 'ESCAPED!', { color: '#ffb0b0' }); }
        if (chance(dt * 6)) G.fx.blood(e.x, e.y, 2, 0, 0, 30, e.bloodColors);
      }
    }
    // death roll: a timing test, not a cutscene
    if (this.rollT > 0) {
      this.rollT -= dt * 0.9 * this.st.rollSpeed;
      this.roll = (1 - Math.max(0, this.rollT)) * TAU;
      G.shake(1.2);
      // the marker sweeps once per beat; the window sits at the far side
      this.qteT = (this.qteT || 0) + dt * 1.35 * Math.sqrt(this.st.rollSpeed);
      if (this.qteT >= 1) { this.qteT -= 1; this.qteMissed = true; this.qteBeats = (this.qteBeats || 0) + 1; }
      if (under) { G.fx.bubbles(this.x, this.y, 2, 12 * this.vis, -20); if (chance(0.5)) G.fx.add({ type: 'foam', x: this.x + rand(-14, 14) * this.vis, y: World.surface(this.x), vx: rand(-30, 30), vy: 0, s: 1, life: 0.5 }); }
      if (this.rollT <= 0) { this.roll = 0; this.rollT = 0; this.qteT = 0; this.rollHit(); }
    }
    if (this.gulpT > 0) this.gulpT -= dt;
    if (this.st.lure && chance(dt * 3)) G.fx.glow(this.x, this.y, 8 * this.vis, '#40f0c8', 0.6);
    this.magnetTick(dt);
    if (this.st.barb) this.barbTick(dt);
    if (under && sp > this.speedMax * 0.5 && chance(dt * 5)) G.fx.bubbles(this.x - Math.cos(this.angle) * 10 * this.vis, this.y, 1, 3 * this.vis);
    // growing into a new size tier sheds your skin: a free gene point and a new name
    const tier = tierFor(this.sizeTarget);
    if (tier > this.tier && G.state === 'play') G.growTier(tier);
  }
  // SNAPPING TONGUE / SWARM CALLER: drag small prey into your mouth and swallow
  // it automatically, so a parked crocodile still eats.
  magnetTick(dt) {
    const R = this.st.magnet; if (!R) return;
    const [sx, sy] = this.snout, maxSize = this.vis * 0.5 * this.st.swallow;
    for (const e of G.ents) {
      if (e.dead || e.remove || !e.edible) continue;
      if (e.type === 'proj' || e.type === 'boat' || e.type === 'structure') continue;
      if (e.sizeClass > maxSize) continue;
      const dx = sx - e.x, dy = sy - e.y, d = Math.hypot(dx, dy);
      if (d > R || d < 0.001) continue;
      const pull = (1 - d / R) * 420 * dt;
      e.vx += dx / d * pull; e.vy += dy / d * pull;
      e.lured = 1;
      if (this.st.autoEat && d < this.biteRange * 0.85) { this.gulp(e); this.biteT = Math.max(this.biteT, 0.12); this.biteHit = true; }
      else if (chance(dt * 0.6)) G.fx.add({ type: 'bubble', x: e.x, y: e.y, vx: 0, vy: -20, s: 1, seed: rand(TAU), life: 0.5 });
    }
    if (chance(dt * 6)) G.fx.glow(sx, sy, 5 * this.vis, '#ff8a4a', 0.35);
  }
  // CAUDAL BARB: the tail stabs anything crowding you from behind
  barbTick(dt) {
    this.barbCd = (this.barbCd || 0) - dt; if (this.barbCd > 0) return;
    const tail = this.chain.nodes[CROC_LEN - 1];
    for (const e of G.ents) {
      if (e.dead || e.remove || e.type === 'gib' || e.type === 'proj' || !e.takeDamage) continue;
      const d = e.nearestDist ? e.nearestDist(tail.x, tail.y) : dist(tail.x, tail.y, e.x, e.y) - e.r * e.size;
      if (d > 10 * this.vis) continue;
      this.barbCd = 0.7;
      e.takeDamage(this.st.barb * Math.sqrt(this.size), this, { dx: 0, dy: 0, pierce: true });
      e.poison = Math.max(e.poison, 3); e.poisonDmg = this.st.barb * 0.3;
      G.fx.text(e.x, e.y - 12, 'BARB!', { color: '#a0ff60' }); G.fx.sparks(tail.x, tail.y, 5); SFX.hurt(e.pan);
      break;
    }
  }
  pushGhost(life) { this.ghosts.push({ nodes: this.chain.nodes.map(n => ({ x: n.x, y: n.y, a: n.a })), life, flip: this.facing }); if (this.ghosts.length > 8) this.ghosts.shift(); }
  bite() {
    if (this.biteCd > 0) return;
    if (this.grabbed) {
      this.breakFree++; this.biteCd = 0.25; this.rollT = 1; SFX.chomp(this.size); G.shake(4); G.fx.bubbles(this.x, this.y, 6, 10 * this.size);
      G.fx.text(this.x, this.y - 20 * this.vis, this.breakFree >= 3 ? 'BROKE FREE!' : 'STRUGGLE! ' + (3 - this.breakFree), { color: '#ffd060' });
      if (this.breakFree >= 3) { const g = this.grabbed; this.grabbed = null; this.breakFree = 0; if (g.release) g.release(); if (g.takeDamage) g.takeDamage(this.biteDmg * 1.5, this, { pierce: true }); this.invuln = 0.8; }
      return;
    }
    if (this.tether) {
      this.breakFree++; this.biteCd = 0.25; SFX.chomp(this.size); G.fx.sparks(this.x, this.y, 5);
      if (this.breakFree >= 3) { const T = this.tether; this.tether = null; if (T.boat) T.boat.cutTether(); this.breakFree = 0; G.fx.text(this.x, this.y - 20 * this.vis, 'LINE SNAPPED!', { color: '#ffd060' }); }
      return;
    }
    if (this.rollT > 0) {
      // scoring the beat: dead centre of the window is a tear, the edges graze
      const ph = this.qteT || 0;
      let off = Math.abs(ph - QTE_AT); if (off > 0.5) off = 1 - off;   // the window wraps
      const e = this.latched;
      const WP = QTE_PERFECT * this.st.rollWindow, WG = QTE_GOOD * this.st.rollWindow;
      if (off < WP) {
        this.qteHits = (this.qteHits || 0) + 2; Trials.bump(this, 'rollHits', 2);
        G.shake(8); SFX.crunch(1.4, this.pan); Cine.hit(1, '#fff0a0');
        if (e) { G.fx.gore(e.x, e.y, 70, 0, 0, false); G.fx.sparks(e.x, e.y, 8); }
      } else if (off < WG) {
        this.qteHits = (this.qteHits || 0) + 1; Trials.bump(this, 'rollHits');
        G.shake(5); SFX.chomp(this.size, this.pan); Cine.hit(0.45, '#9ef0c8');
        if (e) G.fx.blood(e.x, e.y, 6, 0, 0, 50, e.bloodColors);
      } else { this.qteMissed = true; SFX.chomp(this.size, this.pan); }
      this.qteLast = off < WP ? 2 : off < WG ? 1 : 0; this.qteLastT = 0.5;
      this.qteBeats = (this.qteBeats || 0) + 1;
      this.qteT = 0;
      this.biteCd = 0.1;
      return;
    }
    if (this.latched && this.rollT <= 0) {
      this.rollT = 1; this.biteCd = 0.45 / this.st.rollSpeed;
      this.qteT = 0; this.qteHits = 0; this.qteBeats = 0; this.qteMissed = false;
      G.fx.text(this.x, this.y - 18 * this.size, 'DEATH ROLL!', { color: '#ff5040', scale: 2 }); SFX.roar(this.size); return;
    }
    this.biteT = 0.18; this.biteHit = false; this.biteCd = 0.3 * this.st.biteRate;
    if (this.st.lunge) { this.vx += Math.cos(this.angle) * this.st.lunge; this.vy += Math.sin(this.angle) * this.st.lunge; }
  }
  doBiteHit() {
    const [sx, sy] = this.snout, R = this.biteRange, dx = Math.cos(this.angle), dy = Math.sin(this.angle);
    const targets = [];
    for (const e of G.ents) if (!e.dead && !e.remove && e.type !== 'proj' && e.hitTest(sx, sy, R)) targets.push(e);
    targets.sort((a, b) => dist(sx, sy, a.x, a.y) - dist(sx, sy, b.x, b.y));
    let hit = false, chomped = false;
    for (const e of targets) {
      if (e.type === 'gib') { if (e.edible) { this.gulp(e); hit = true; } continue; }
      if (chomped && !this.st.multiChomp) continue;
      this.chompEntity(e, sx, sy, dx, dy); hit = true; chomped = true;
    }
    if (!hit) { SFX.chomp(this.size); if (this.inWater) G.fx.bubbles(sx, sy, 3, 4 * this.size); }
    this.biteCount++;
    if (this.st.leviathan && this.biteCount % 6 === 0) this.shockwave();
  }
  chompEntity(e, sx, sy, dx, dy) {
    if (e.onBite) { e.onBite(this, sx, sy, dx, dy); return; }
    // a gharial takes fish whole whatever the size: that is the whole animal
    const fishy = e.type === 'fish' && this.st.fishSwallow;
    // What goes down whole. A crocodile swallows anything it can get past its
    // own head, and a hatchling's head is small but so is a minnow — the flat
    // term is what keeps the first ten minutes of a run edible.
    const maw = (this.size * 0.62 + 0.2) * this.st.swallow;
    if ((fishy && e.edible) || (e.sizeClass <= maw && e.edible && (!e.armor || this.st.pierce || this.st.ironStomach))) { this.gulp(e); return; }
    let dmg = this.biteDmg, crit = false;
    if (this.st.fishSlayer > 1 && e.type === 'fish') dmg *= this.st.fishSlayer;
    if (this.st.ambush && (!e.aware || this.ambushReady)) { dmg *= this.st.ambushMul; crit = true; this.lastKillHow = 'ambush'; Trials.bump(this, 'ambush'); }
    // a skirmisher does not crit by luck, it crits on a rhythm
    if (this.st.chainCrit && this.comboT > 0 && this.combo > 0 && (this.combo + 1) % this.st.chainCrit === 0) { dmg *= 2.4; crit = true; }
    if (chance(this.st.crit)) { dmg *= 3; crit = true; }
    if (this.st.woundMul > 1 && e.hp < e.maxHp * 0.6) { dmg *= this.st.woundMul; crit = true; }
    const applied = e.takeDamage(dmg, this, { dx, dy, pierce: this.st.pierce, crit });
    if (applied <= 0) return;
    const big = e.mass >= 60;
    G.hitstop(big ? 0.09 : 0.05); G.shake((this.st.quake ? 6 : 3) + Math.min(dmg, 40) * 0.15);
    if (this.st.quake) { G.fx.shock(e.x, e.y, 26 * Math.sqrt(this.size), '#ffd060', 0.3); }
    G.fx.text(e.x, e.y - 14 * e.size, crit ? 'CRITICAL!' : choice(['CHOMP!', 'CRUNCH!', 'SNAP!', 'RIP!']), { color: crit ? '#ffe040' : '#ffffff', scale: crit ? 2 : 1 });
    SFX.crunch(this.size, e.pan);
    if (this.st.venom && !e.dead) { e.poison = Math.max(e.poison, 3); e.poisonDmg = dmg * this.st.venom / 3; }
    if (this.st.bleed && !e.dead) { e.bleedT = 3; e.bleedDmg = dmg * 0.12; }
    const latchCap = this.size * Math.max(this.st.latchMul, this.st.bigLatch);
    if (!e.dead && e.latchable && e.sizeClass <= latchCap && e.sizeClass > this.size * 0.5 && !this.latched) {
      this.latched = e; this.latchT = 0; G.fx.text(this.x, this.y - 22 * this.vis, 'LATCHED! BITE TO ROLL', { color: '#ff9080' });
    }
  }
  gulp(e) {
    e.gulped = true; const s = e.spr;
    if (s) G.fx.add({ type: 'suck', img: s.c, x: e.x, y: e.y, w: s.w, h: s.h, size: e.size, facing: e.facing, life: 0.16 });
    if (e.bleeds || e.type === 'gib') G.fx.blood(e.x, e.y, 4, 0, 0, 30, e.bloodColors || BLOOD_COLORS);
    e.die(this); SFX.gulp(this.size, e.pan); this.gulpT = 0.2;
  }
  rollHit() {
    const e = this.latched; if (!e || e.dead) return; this.rollCount++;
    // the roll is worth what you timed out of it: whiff every beat and it barely bruises
    const beats = Math.max(1, this.qteBeats || 1), hits = this.qteHits || 0;
    const acc = clamp(hits / (beats * 2), 0, 1);
    // a roll you barely played still tears; timing it well makes it brutal
    const qmul = 0.8 + acc * 1.4;
    const dmg = this.biteDmg * 1.6 * this.st.rollDmg * qmul, dx = Math.cos(this.angle), dy = Math.sin(this.angle);
    const lethal = e.hp <= dmg; this.lastKillHow = 'roll';
    e.takeDamage(dmg, this, { dx: -dx, dy: -dy, pierce: true });
    if (lethal && e.bleeds && G.settings.gore) { this.latched = null; Gore.bisect(e, dx, dy); }
    else if (e.bleeds && G.settings.gore && chance(0.6)) { const l = Gore.limbsOf(e).filter(q => !(e.missing && e.missing.has(q.id))); if (l.length) Gore.tear(e, choice(l).id, -dx, -dy); }
    G.fx.gore(e.x, e.y, 130, 0, 0, true); G.hitstop(0.08); G.shake(9); SFX.crunch(this.size * 1.5, e.pan); SFX.gib(e.pan);
    G.fx.text(e.x, e.y - 16 * e.size, choice(['TEAR!', 'SHRED!', 'RIP!']), { color: '#ff4040', scale: 2 });
    G.addScore(Math.round(25 * qmul));
    if (acc >= 0.85) { this.perfectT = 1.2; G.addScore(120); G.whiteFlash(0.3); Cine.hit(1, '#fff060'); }
    if (!e.dead) this.latchT = 0;
  }
  ramCheck() {
    for (const e of G.ents) {
      if (e.dead || e.remove || this.ramHit.has(e.id) || e.type === 'proj' || e.type === 'gib') continue;
      const near = e.nearestDist ? e.nearestDist(this.x, this.y) < 6 * this.vis : e.hitTest(this.x, this.y, 6 * this.vis);
      if (!near) continue;
      this.ramHit.add(e.id);
      const dx = Math.cos(this.angle), dy = Math.sin(this.angle);
      if (this.st.bullRush) {
        const dmg = this.biteDmg * 0.8;
        if (e.type === 'boat') { e.hp -= dmg; e.flash = 0.1; G.fx.splinters(e.x, e.y, 8, 100); SFX.splinter(e.pan); if (e.hp <= 0) e.sink(this); }
        else { e.takeDamage(dmg, this, { dx, dy, pierce: true }); e.knock(dx, dy, 260); e.stun = 1; }
        G.shake(5); SFX.thud(e.pan); G.fx.text(e.x, e.y - 12, 'RAMMED!', { color: '#ffd060' });
      } else if (this.st.dashBite) { const [sx, sy] = this.snout; this.chompEntity(e, sx, sy, dx, dy); }
    }
  }
  shockwave() {
    const R = 70 * Math.sqrt(this.vis) + 40;
    G.fx.shock(this.x, this.y, R, '#40f0c8', 0.6); G.fx.glow(this.x, this.y, R * 0.22, '#40f0c8', 0.35); SFX.shock(); G.shake(10); G.hitstop(0.06);
    G.fx.text(this.x, this.y - 24 * this.vis, 'SHOCKWAVE!', { color: '#40f0c8', scale: 2 });
    for (const e of G.ents) {
      if (e.dead || e.remove || e.type === 'proj' || e.type === 'gib') continue;
      const d = e.nearestDist ? e.nearestDist(this.x, this.y) : dist(this.x, this.y, e.x, e.y) - e.r * e.size;
      if (d > R) continue;
      const dx = e.x - this.x, dy = e.y - this.y, dd = Math.hypot(dx, dy) || 1;
      if (e.type === 'boat') { e.hp -= this.biteDmg; e.flash = 0.1; G.fx.splinters(e.x, e.y, 6, 80); if (e.hp <= 0) e.sink(this); }
      else e.takeDamage(this.biteDmg * 1.2, this, { dx: dx / dd, dy: dy / dd, pierce: true });
      e.knock(dx / dd, dy / dd, 200); e.stun = 0.8;
    }
  }
  // BRACE: a short guard. Anything that lands in the first sliver of it is
  // turned back on whoever threw it; the rest of the window is only armour, so
  // pressing it early still costs you the cooldown.
  // ---------- environment hazards ----------
  // Two meters, both of them places rather than attacks. Filth builds while you
  // are under polluted water and burns off in clean water or in air; pressure
  // builds past the depth your body is rated for. Neither kills quickly — they
  // make a stretch of map cost something to stay in.
  hazards(dt) {
    const B = Biome.at(this.x), surf = World.surface(this.x);
    const under = this.y > surf + 2, depth = Math.max(0, this.y - surf);
    // --- pollution ---
    const tox = (B.toxic || 0) * (under ? 1 : 0);
    if (tox > 0) this.toxin = Math.min(130, this.toxin + tox * 15 * dt / Math.max(0.2, this.st.toxRes));
    else this.toxin = Math.max(0, this.toxin - (under ? 12 : 26) * dt);
    if (this.toxin >= 100) {
      this.hp -= this.maxHp * 0.028 * dt;
      if (chance(dt * 7)) G.fx.blood(this.x + rand(-14, 14) * this.vis, this.y + rand(-8, 8) * this.vis, 1, 0, 0, 16, ['#8aa82a', '#5a7a18']);
      if (chance(dt * 3)) G.fx.bubbles(this.x, this.y, 1, 8 * this.vis, 20);
      if (this.hp <= 0) { this.die('DISSOLVED'); return true; }
    }
    // --- what is lying in the bottom of the system -----------------------
    // Acid eats, sludge clogs, drums rewrite. Only the pools: the stretch of
    // tunnel between two of them costs you nothing.
    const pool = (typeof Waste !== 'undefined' && under) ? Waste.at(this.x) : null;
    const inPool = pool && this.y > World.floorY(this.x) - 30;
    if (inPool && pool.kind === 'acid') {
      const res = Math.max(0.25, this.st.acidRes || 1);
      this.hp -= this.maxHp * 0.055 * dt / res;
      this.toxin = Math.min(130, this.toxin + 22 * dt);
      if (chance(dt * 14)) G.fx.blood(this.x + rand(-16, 16) * this.vis, this.y + rand(-8, 8) * this.vis, 1, 0, 0, 24, ['#d8ff60', '#8aa820']);
      if (chance(dt * 6)) G.fx.bubbles(this.x, this.y, 1, 10 * this.vis, 30);
      if (this.hp <= 0) { this.die('DISSOLVED'); return true; }
    }
    if (inPool && pool.kind === 'sludge') {
      this.toxin = Math.min(130, this.toxin + 34 * dt / Math.max(0.2, this.st.toxRes));
      this.vx *= Math.pow(0.28, dt); this.vy *= Math.pow(0.4, dt);      // it holds you
      if (chance(dt * 4)) G.fx.silt && G.fx.silt(this.x + rand(-12, 12), this.y, 2, 12);
    }
    // --- the drums ---
    if (inPool && pool.kind === 'rads') {
      this.rads = Math.min(140, (this.rads || 0) + 26 * dt);
      if (chance(dt * 10)) G.fx.add({ type: 'spark', x: this.x + rand(-18, 18) * this.vis, y: this.y + rand(-12, 12) * this.vis, vx: rand(-20, 20), vy: rand(-30, 10), s: 1, color: '#a8f030', life: 0.6 });
    } else this.rads = Math.max(0, (this.rads || 0) - 5 * dt);
    if ((this.rads || 0) >= 100) {
      this.rads = 0;
      if (typeof forceMutate === 'function') forceMutate(this);
    }

    // --- pressure ---
    const lim = this.st.crushDepth * (this.st.leviathan ? 1.8 : 1) + this.size * 26;
    const over = (B.pressure || 0) > 0 ? Math.max(0, depth - lim) : 0;
    if (over > 0) this.crush = Math.min(130, this.crush + (0.6 + over / 240) * 16 * dt / Math.max(0.2, this.st.crushRes));
    else this.crush = Math.max(0, this.crush - 30 * dt);
    if (this.crush >= 100) {
      this.hp -= this.maxHp * 0.035 * dt;
      if (chance(dt * 5)) { G.fx.bubbles(this.x + rand(-16, 16) * this.vis, this.y, 2, 10 * this.vis, -30); G.shake(1.4); }
      if (this.hp <= 0) { this.die('CRUSHED'); return true; }
    }
    // one warning bark each time a meter crosses into the red
    this.hazT -= dt;
    if (this.hazT <= 0 && (this.toxin > 72 || this.crush > 72)) {
      this.hazT = 2.4;
      const bad = this.crush > this.toxin;
      G.fx.text(this.x, this.y - 30 * this.vis, bad ? 'HULL PRESSURE' : 'FILTH IN THE BLOOD', { color: bad ? '#8cd8ff' : '#b8e030', scale: 2, life: 1.4 });
      SFX.warning && SFX.warning();
    }
    return false;
  }
  brace() {
    if (this.braceCd > 0) return;
    this.braceCd = 1.5; this.braceT = 0.30;
    SFX.clank(this.pan); G.fx.shock(this.x, this.y, 16 * this.vis, '#9ad8ff', 0.22);
    if (this.grabbed) {
      // clamped in something's jaws, bracing is how you get an arm free
      this.breakFree += 1;
      G.fx.text(this.x, this.y - 20 * this.vis, this.breakFree >= 3 ? 'BROKE FREE!' : 'BRACED! ' + (3 - this.breakFree), { color: '#9ad8ff' });
      G.shake(4); G.fx.bubbles(this.x, this.y, 6, 10 * this.size);
      if (this.breakFree >= 3) { const g = this.grabbed; this.grabbed = null; this.breakFree = 0; if (g.release) g.release(); if (g.takeDamage) g.takeDamage(this.biteDmg * 1.5, this, { pierce: true }); this.invuln = 0.8; }
    }
  }
  // returns true when the hit was turned
  tryParry(dmg, src, kind) {
    if (this.braceT <= 0.12) return false;          // late in the window it is only armour
    this.braceT = 0; this.braceCd = 0.4; this.braceFlash = 0.25; this.invuln = 0.45; this.parries++; Trials.bump(this, 'parries');
    G.hitstop(0.1); G.whiteFlash(0.35); G.shake(7); G.slowmo(0.35, 0.22);
    SFX.clank(this.pan); SFX.crunch(this.size, this.pan);
    G.fx.sparks(this.x, this.y, 14); G.fx.shock(this.x, this.y, 34 * this.vis, '#bfe8ff', 0.45);
    G.fx.text(this.x, this.y - 26 * this.vis, 'PARRY!', { color: '#bfe8ff', scale: 2, life: 1 });
    G.addScore(150);
    if (src && src.takeDamage && kind !== 'bullet') {
      const dx = sign(src.x - this.x) || 1;
      src.takeDamage(this.biteDmg * 1.6, this, { dx, dy: 0, pierce: true, crit: true });
      src.knock(dx, -0.3, 260); src.stun = Math.max(src.stun || 0, 1.3);
      if (src.staggered !== undefined && src.isBoss) src.staggerT = (src.staggerT || 0) + 0.8;
    }
    return true;
  }
  // The speed button is a throttle. Aim UP and press it and the throttle
  // becomes a leap instead: same burst it always was, paid for out of the same
  // stamina the run drinks from.
  dash(ix, iy) {
    if (this.grabbed) return;
    const up = iy < -0.4;
    if (!up || this.stam < 0.3 || this.noStamT > 0) return;
    this.stam -= 0.3;
    Trials.bump(this, 'jumps');
    let dx = ix, dy = iy; if (Math.hypot(dx, dy) < 0.2) { dx = Math.cos(this.angle); dy = Math.sin(this.angle); }
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const p = (150 + 30 * Math.sqrt(this.size)) * this.st.speed * 2.6 * this.st.dashDist;
    this.vx = dx * p; this.vy = dy * p; this.dashT = 0.22 * this.st.dashDist;
    if (this.latched) { this.latched.vx = -dx * 100; this.latched = null; }
    SFX.dash();
    if (this.inWater) { G.fx.bubbles(this.x, this.y, 14, 8 * this.vis, 0); G.fx.silt(this.x, this.y, 3, 20); }
    else G.fx.smoke(this.x, this.y + 4 * this.vis, 4, '#8a7a5a');
    for (let i = 0; i < 6; i++) G.fx.add({ type: 'spark', x: this.x - dx * i * 4, y: this.y - dy * i * 4, vx: -dx * 40, vy: -dy * 40, s: 1, color: '#cfeef4', life: 0.25 });
    if (this.st.bullRush) G.shake(3);
    this.ramHit.clear();
  }
  eat(e) {
    // a scrapper is the animal that makes a meal out of things too small to
    // be worth a bigger crocodile's time
    const rel = e.mass / Math.max(1, this.mass);
    const small = this.st.smallGrowth > 1 && rel < 0.18 ? this.st.smallGrowth : 1;
    // Snacks keep you alive; they do not build an animal. A meal is worth its
    // full mass only when it is a real share of yours, and everything under
    // that pays a fraction. Growing means hunting up, not grazing down.
    const share = clamp(0.3 + 0.7 * (rel / 0.15), 0.3, 1);
    const gain = e.mass * share * this.st.growth * small * (1 + Math.min(this.combo, 20) * 0.03) * (1 + 0.05 * this.tier);
    this.mass += gain;
    this.hunger = Math.min(100, this.hunger + e.mass * 30 / Math.pow(this.size, 1.8) * this.st.hungerRestore);
    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * clamp(e.mass / (12 * Math.pow(this.size, 1.5)), 0.02, 0.35));
    this.combo++; this.comboT = 2.4;
    const pan = G.panOf(e.x);
    if (this.combo > 1) { G.fx.text(this.x, this.y - 20 * this.vis, 'COMBO X' + this.combo, { color: this.combo >= 10 ? '#ff40c0' : this.combo >= 5 ? '#ffa030' : '#ffe060', scale: Math.min(1 + Math.floor(this.combo / 4), 3) }); SFX.combo(this.combo, pan); }
    const pts = Math.round(e.mass * 10 * (1 + this.combo * 0.1) * (e.threat ? 2 : 1));
    G.addScore(pts);
    if (e.type !== 'gib') {
      // the score for the meal, thrown off the meal
      const big = e.mass >= 60 || e.threat || e.human;
      G.fx.pop(e.x, e.y - 6 * e.size, pts, this.combo >= 10 ? '#ff70d0' : this.combo >= 5 ? '#ffa030' : big ? '#ffe060' : '#e8f0c0', big ? 3 : this.combo >= 5 ? 2 : 1);
      if (this.combo > 1) G.fx.pop(e.x + rand(-10, 10), e.y - 20 * e.size, 0, this.combo >= 10 ? '#ff70d0' : '#ffffff', this.combo >= 8 ? 2 : 1, 'X' + this.combo);
    }
    if (e.mass >= 60) { G.slowmo(0.3, 0.55); G.zoomPunch(1.07); G.fx.text(e.x, e.y - 30, e.threat ? 'PREDATOR SLAIN!' : 'DEVOURED!', { scale: 2, color: '#ff6040', life: 1.5 }); SFX.roar(this.size, pan); }
    if (this.st.frenzy) this.frenzyT = 4;
    if (this.st.lifesteal) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.st.lifesteal);
    if (this.st.scavenge && e.type === 'gib') this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.st.scavenge);
    if (this.st.manEater && e.human) G.addScore(Math.round(e.mass * 20));
    const gp = Genome.pointsFor(e, this); this.genePoints += gp; this.newPoints += gp;
    Affinity.onEat(this, e); Affinity.onKill(this, e, this.lastKillHow || 'bite'); this.lastKillHow = null;
    G.stats.eaten++; G.stats.genePoints = (G.stats.genePoints || 0) + gp;
    Trials.bump(this, 'eaten');
    if (e.type === 'bird' || (e.species && e.species.cat === 'bird')) Trials.bump(this, 'birds');
    if (e.threat) Trials.bump(this, 'threats');
    if (e.mass > G.stats.biggestMass) { G.stats.biggestMass = e.mass; G.stats.biggest = e.name; }
    if (e.type !== 'gib') G.stats.kinds[e.name] = (G.stats.kinds[e.name] || 0) + 1;
  }
  eatMass(m, x, y) { this.mass += m * this.st.growth; this.hunger = Math.min(100, this.hunger + m * 20 / Math.pow(this.size, 1.8)); G.fx.text(x, y, '+' + Math.round(m), { color: '#ffd860', vy: -18 }); G.addScore(m * 5); }
  hurt(dmg, src, kind = 'bite') {
    if (this.dead || dmg <= 0) return 0;
    const dot = kind === 'crush' || kind === 'venom';
    if (this.invuln > 0 && !dot) return 0;
    if (this.braceT > 0 && kind !== 'venom' && this.tryParry(dmg, src, kind)) return 0;
    let mult = 1 - clamp(this.st.armor, 0, 0.75);
    if (this.braceT > 0) mult *= 0.4;               // late brace still soaks most of it
    // the swamp keeps pace with you: everything hits harder the longer you last
    mult *= 1 + Math.min(0.5, G.difficulty() * 0.05);
    if (kind === 'bullet') mult *= (1 - clamp(this.st.bulletArmor, 0, 0.85)) / Math.pow(this.size, 0.55);
    dmg *= mult; if (dmg < 0.05) return 0;
    this.hp -= dmg; this.hurtT = G.t; Affinity.onHurtTaken(this, dmg);
    if (!dot) {
      this.invuln = 0.4; this.hurtFlash = 0.1; G.shake(4 + Math.min(dmg, 40) * 0.25); G.redFlash(0.4); SFX.hurt();
      G.fx.blood(this.x, this.y, Math.round(6 + Math.min(dmg, 40)), 0, 0, 90); G.fx.cloud(this.x, this.y, (10 + Math.min(dmg, 30) * 0.3) * Math.sqrt(this.vis));
    } else if (chance(0.15)) G.redFlash(0.12);
    if (this.st.reflect > 0 && src && src.takeDamage && kind === 'bite') {
      src.takeDamage(dmg * this.st.reflect, this, { dx: 0, dy: 0, pierce: true });
      G.fx.sparks(this.x, this.y, 6); SFX.clank(this.pan);
    }
    if (this.st.toxicBlood && src && src.takeDamage && kind !== 'venom') { G.fx.cloud(this.x, this.y, 30 * Math.sqrt(this.vis), '#30a050', 2); src.poison = Math.max(src.poison || 0, 3); src.poisonDmg = this.biteDmg * 0.25; }
    if (this.hp <= 0) this.die(kind === 'bullet' ? 'SHOT' : kind === 'crush' ? 'CRUSHED' : kind === 'venom' ? 'POISONED' : 'EATEN', src);
    return dmg;
  }
  envenom(dps, dur) { if (this.st.venomImmune) { G.fx.text(this.x, this.y - 20, 'IMMUNE', { color: '#80ff80' }); return; } this.poisonT = Math.max(this.poisonT, dur); this.venomDps = dps; }
  die(cause, src) {
    if (this.dead) return; this.dead = true; this.deathT = 0; this.cause = cause; this.killer = src && src.name ? src.name : null; this.hp = 0;
    if (this.grabbed && this.grabbed.release) this.grabbed.release(); this.grabbed = null; this.latched = null;
    if (this.tether) { if (this.tether.boat) this.tether.boat.cutTether(); this.tether = null; }
    G.fx.gore(this.x, this.y, 140 * Math.sqrt(this.vis), 0, 0, true); G.fx.flesh(this.x, this.y, 20, 100); Gore.slick(this.x, this.y, 30);
    SFX.death(); G.shake(20); G.slowmo(0.25, 2.5);
    G.onPlayerDeath(cause, src);
  }
  updateDead(dt) {
    this.deathT += dt; const under = this.inWater;
    if (under) { this.vx *= 0.97; this.vy = approach(this.vy, 18, 40 * dt); } else this.vy += 600 * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const fy = World.floorY(this.x); if (this.y > fy - 5 * this.vis) { this.y = fy - 5 * this.vis; this.vy = 0; }
    this.chain.solve(this.x, this.y, this.angle, this.vis, dt, 0.05);
    this.roll = lerp(this.roll, Math.PI, 1 - Math.exp(-2 * dt));
    if (chance(dt * 8)) G.fx.blood(this.x + rand(-20, 20) * this.vis, this.y, 2, 0, 0, 20);
    if (under && chance(dt * 3)) G.fx.bubbles(this.x, this.y, 1, 8 * this.vis);
  }
  draw(ctx) {
    if (this.hidden) return;
    for (const g of this.ghosts) drawCroc(ctx, { nodes: g.nodes }, this.parts, this.vis, { flipY: g.flip, alpha: g.life * 0.7 });
    const blink = this.invuln > 0 && !this.dead && Math.floor(G.t * 30) % 2 === 0 && this.hurtFlash <= 0;
    if (this.st.lure) { ctx.globalCompositeOperation = 'lighter'; Shape.burst(ctx, this.x, this.y, 26 * this.vis, '#40f0c8', 12, 17, 0.8, 0.16); ctx.globalCompositeOperation = 'source-over'; }
    drawCroc(ctx, this.chain, this.parts, this.vis, { jaw: this.jaw, legPhase: this.legPhase, flipY: this.facing, flash: this.hurtFlash, roll: this.roll, alpha: blink ? 0.5 : 1 });
    if (this.wet > 0.06 && !this.hidden) {
      const n = this.chain.nodes, w = this.wet;
      // Darken: water on a hide sinks its value. Drawn as one non-overlapping
      // column per segment — stamping a rect per vertebra double-darkens where
      // they overlap and stripes the animal.
      ctx.globalAlpha = 0.22 * w;
      ctx.fillStyle = '#0d2026';
      for (let i = 0; i < n.length - 1; i++) {
        const a2 = n[i], b2 = n[i + 1];
        const x0 = Math.round(Math.min(a2.x, b2.x)), x1 = Math.round(Math.max(a2.x, b2.x));
        const cy2 = Math.round((a2.y + b2.y) * 0.5), hh = Math.round(4.2 * this.vis * (1 - i / n.length * 0.5));
        ctx.fillRect(x0, cy2 - hh, Math.max(1, x1 - x0), hh * 2);
      }
      ctx.globalAlpha = 1;
      // specular: a broken line of highlights riding the back
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * w;
      ctx.fillStyle = '#d8f4ff';
      for (let i = 0; i < n.length; i++) {
        if (ihash(i, 21 + Math.floor(G.t * 1.5)) > 0.55) continue;
        const k = n[i], px2 = Math.round(k.x + Math.cos(k.a - Math.PI / 2) * 3 * this.vis);
        const py2 = Math.round(k.y + Math.sin(k.a - Math.PI / 2) * 3 * this.vis);
        ctx.fillRect(px2, py2, Math.max(1, Math.round(this.vis)), Math.max(1, Math.round(this.vis)));
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (this.mudT > 0.05) { ctx.globalAlpha = 0.35 * Math.min(1, this.mudT); ctx.fillStyle = '#4a3a24'; for (const n of this.chain.nodes) ctx.fillRect(n.x - 4 * this.vis, n.y - 1 * this.vis, 8 * this.vis, 5 * this.vis); ctx.globalAlpha = 1; }
    if (this.poisonT > 0) { ctx.globalAlpha = 0.25; ctx.fillStyle = '#40ff60'; for (const n of this.chain.nodes) ctx.fillRect(n.x - 3 * this.vis, n.y - 3 * this.vis, 6 * this.vis, 6 * this.vis); ctx.globalAlpha = 1; }
    if (this.spliceGlow > 0) {
      // the splice still settling in: a colour bleed along the body that fades
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = clamp(this.spliceGlow, 0, 1) * 0.35;
      ctx.fillStyle = this.spliceCol;
      for (const n of this.chain.nodes) ctx.fillRect(n.x - 4 * this.vis, n.y - 3 * this.vis, 8 * this.vis, 6 * this.vis);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (this.frenzyT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.t * 20); Shape.burst(ctx, this.x, this.y, 22 * this.vis, '#ff3c1e', 14, 29, 0.75, 0.2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }
}
