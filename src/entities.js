'use strict';
SPR.meat = mkSprite(['.rrR.', 'rRRrr', 'rrrbr', '.rrr.'], { r: '#9a1a1a', R: '#c84040', b: '#efe6d6' });
let ENT_ID = 0;
class Entity {
  constructor(x, y) {
    this.id = ENT_ID++; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.angle = 0; this.facing = 1;
    this.size = 1; this.r = 6; this.hp = 10; this.maxHp = 10; this.mass = 5; this.armor = 0; this.sizeClass = 0.5;
    this.dead = false; this.remove = false; this.flash = 0; this.t = rand(10); this.layer = 0;
    this.edible = true; this.type = 'ent'; this.name = 'THING'; this.bleeds = true; this.bloodColors = BLOOD_COLORS;
    this.gibs = 3; this.aware = false; this.awareT = 0; this.poison = 0; this.poisonDmg = 0; this.bleedT = 0; this.bleedDmg = 0; this.slow = 0; this.stun = 0;
    this.threat = 0; this.latchable = true; this.frames = null; this.frame = 0; this.animT = 0; this.persistent = false; this.isBoss = false;
    this.lastHitT = -9; this.gulped = false; this.feathers = null; this.wasAir = false;
  }
  get inWater() { return this.y > World.surface(this.x); }
  get spr() { return this.frames ? this.frames[this.frame % this.frames.length] : null; }
  get pan() { return G.panOf(this.x); }
  distTo(o) { return dist(this.x, this.y, o.x, o.y); }
  drag(dt, k) { const f = Math.exp(-k * dt); this.vx *= f; this.vy *= f; }
  move(dt) { this.x += this.vx * dt; this.y += this.vy * dt; }
  swimToward(tx, ty, speed, accel, dt) {
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, accel * dt);
    this.vx += (dx / d * speed - this.vx) * k; this.vy += (dy / d * speed - this.vy) * k;
  }
  faceVel(pitchMax = 0.6, turn = 0.15) {
    if (Math.abs(this.vx) > 3) this.facing = sign(this.vx);
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 5) { const a = clamp(Math.atan2(this.vy, Math.abs(this.vx)), -pitchMax, pitchMax); this.angle = angleLerp(this.angle, a, turn); }
  }
  clampWater(margin = 6) {
    const fy = World.floorY(this.x);
    if (this.y > fy - margin) { this.y = fy - margin; if (this.vy > 0) this.vy *= -0.3; }
    const s = World.surface(this.x) + margin;
    if (this.y < s) { this.y = s; if (this.vy < 0) this.vy *= -0.3; }
  }
  animate(dt, rate) { this.animT += dt * rate; this.frame = Math.floor(this.animT); }
  senses(baseRange) {
    const P = G.player; if (P.dead) return false;
    const d = this.distTo(P);
    const range = baseRange * P.st.stealth * (P.moving ? 1.25 : 0.7) * Math.sqrt(P.size);
    if (d < range) { this.aware = true; this.awareT = Math.max(this.awareT, 1.5); return true; }
    return this.awareT > 0;
  }
  playerRatio() { return G.player.size / this.sizeClass; }
  hitTest(x, y, r) { return dist(x, y, this.x, this.y) < r + this.r * this.size; }
  knock(dx, dy, power) { if (!dx && !dy) return; this.vx += dx * power; this.vy += dy * power; }
  takeDamage(dmg, src, opts = {}) {
    if (this.dead) return 0;
    if (this.armor > 0 && !opts.pierce && dmg < this.armor) {
      G.fx.sparks(this.x, this.y, 6, opts.dx, opts.dy); SFX.clank(this.pan);
      if (src === G.player) G.fx.text(this.x, this.y - 12 * this.size, 'TOO TOUGH', { color: '#c0c0c0' });
      this.flash = 0.08; this.knock(opts.dx, opts.dy, 60); this.aware = true; this.awareT = 3;
      return 0;
    }
    this.hp -= dmg; this.flash = 0.1; this.lastHitT = G.t; this.aware = true; this.awareT = 3;
    if (this.bleeds) {
      const gm = src === G.player ? G.player.st.goreMul : 1;
      G.fx.blood(this.x, this.y, clamp(dmg * 1.2, 5, 40) * gm, opts.dx || 0, opts.dy || 0, 70 + Math.min(dmg, 60), this.bloodColors);
      G.fx.cloud(this.x, this.y, (8 + Math.min(dmg, 40) * 0.4) * Math.sqrt(this.size), this.bloodColors[0]);
    } else G.fx.sparks(this.x, this.y, 8, opts.dx, opts.dy);
    if (this.hp <= 0) this.die(src);
    return dmg;
  }
  die(killer) { if (this.dead) return; this.dead = true; this.remove = true; G.onEntityKilled(this, killer === G.player, this.gulped); }
  explode(power = 1) {
    const s = this.spr, big = this.mass >= 60;
    if (this.bleeds) G.fx.gore(this.x, this.y, 90 * Math.sqrt(power), 0, 0, big);
    if (s) {
      const pieces = sliceSprite(s, clamp(this.gibs, 2, 6));
      for (const p of pieces) {
        const g = new Gib(this.x + (p.sx + p.sw / 2 - s.w / 2) * this.size * this.facing, this.y + (p.sy + p.sh / 2 - s.h / 2) * this.size, s, p, this.size, this.facing, this.bleeds, this.bloodColors);
        g.mass = this.edible && this.bleeds ? this.mass * 0.25 / pieces.length : 0; g.edible = g.mass > 0;
        const a = rand(TAU), sp = rand(40, 130) * Math.sqrt(power);
        g.vx = this.vx * 0.3 + Math.cos(a) * sp; g.vy = this.vy * 0.3 + Math.sin(a) * sp - 20; g.vr = rand(-8, 8);
        G.add(g);
      }
    }
    if (this.feathers) G.fx.feathers(this.x, this.y, 14, this.feathers);
    SFX.gib(this.pan);
  }
  tick(dt) {
    this.t += dt; if (this.flash > 0) this.flash -= dt;
    if (this.awareT > 0) this.awareT -= dt; else this.aware = false;
    if (this.stun > 0) this.stun -= dt;
    this.slow = 0;
    if (this.poison > 0) { this.poison -= dt; this.slow = 0.6; this.hp -= this.poisonDmg * dt; if (chance(dt * 8)) G.fx.blood(this.x, this.y, 1, 0, 0, 20, ['#40c040', '#208030', '#80ff80']); if (this.hp <= 0) this.die(G.player); }
    if (this.bleedT > 0) { this.bleedT -= dt; this.hp -= this.bleedDmg * dt; if (chance(dt * 10)) G.fx.blood(this.x, this.y, 1, 0, 0, 15, this.bloodColors); if (this.hp <= 0) this.die(G.player); }
  }
  update(dt) { this.tick(dt); }
  draw(ctx) {
    const s = this.spr; if (!s) return;
    drawSpr(ctx, this.flash > 0 ? spriteWhite(s) : s, this.x, this.y, this.angle * this.facing, this.size * this.facing, this.size);
    if (this.poison > 0) { ctx.globalAlpha = 0.35; drawSpr(ctx, spriteTint(s, '#40ff60', 1), this.x, this.y, this.angle * this.facing, this.size * this.facing, this.size); ctx.globalAlpha = 1; }
  }
  drawHpBar(ctx) {
    if (this.hp >= this.maxHp || this.dead || this.maxHp < 8) return;
    const w = Math.max(12, this.r * this.size * 2), h = 2, x = this.x - w / 2, y = this.y - this.r * this.size - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#c02020'; ctx.fillRect(x, y, w * clamp(this.hp / this.maxHp, 0, 1), h);
  }
}
// ---------- gibs (edible meat pieces, sprite slices) ----------
class Gib extends Entity {
  constructor(x, y, src, piece, size, facing, bleeds, colors) {
    super(x, y); this.src = src; this.p = piece; this.size = size; this.facing = facing; this.rot = rand(TAU); this.vr = 0;
    this.r = Math.max(piece.sw, piece.sh) * 0.4; this.life = rand(10, 16) * (G.player && G.player.st ? G.player.st.gibLife : 1); this.bleedFx = bleeds ? rand(0.6, 1.6) : 0; this.colors = colors;
    this.type = 'gib'; this.name = 'MEAT'; this.hp = 1; this.maxHp = 1; this.sizeClass = 0.05; this.bleeds = false; this.gibs = 0; this.layer = -1; this.latchable = false; this.mass = 0;
  }
  update(dt) {
    this.tick(dt); this.life -= dt; if (this.life <= 0) this.remove = true;
    if (this.inWater) { this.drag(dt, 2.5); this.vy += 30 * dt; this.vr *= 0.97; if (this.wasAir) { this.wasAir = false; G.fx.splash(this.x, 0.35, this.vx); this.vx *= 0.4; this.vy *= 0.4; } }
    else { this.vy += 600 * dt; this.wasAir = true; }
    this.move(dt); this.rot += this.vr * dt;
    const fy = World.floorY(this.x), rr = this.r * this.size * 0.5;
    if (this.y > fy - rr) { this.y = fy - rr; this.vy = 0; this.vx *= 0.8; this.vr *= 0.8; }
    if (this.bleedFx > 0) { this.bleedFx -= dt; if (chance(dt * 12)) G.fx.blood(this.x, this.y, 1, 0, 0, 15, this.colors); }
  }
  draw(ctx) {
    const p = this.p; ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot); ctx.scale(this.size * this.facing, this.size);
    ctx.globalAlpha = this.life < 2 ? this.life / 2 : 1;
    ctx.drawImage(this.src.c, p.sx, p.sy, p.sw, p.sh, -p.sw / 2, -p.sh / 2, p.sw, p.sh); ctx.restore(); ctx.globalAlpha = 1;
  }
}
function dropMeat(x, y, n, massEach, colors = BLOOD_COLORS) {
  for (let i = 0; i < n; i++) {
    const g = new Gib(x, y, SPR.meat, { sx: 0, sy: 0, sw: 5, sh: 4 }, 1 + rand(0.5), 1, true, colors);
    g.mass = massEach; g.edible = true; const a = rand(TAU), sp = rand(40, 120); g.vx = Math.cos(a) * sp; g.vy = Math.sin(a) * sp - 30; g.vr = rand(-8, 8); G.add(g);
  }
}
// ---------- fish & swimmers ----------
const FISH = {
  minnow: { frames: SPR.minnow, r: 3, hp: 1, mass: 1, speed: 45, band: [8, 220], school: [4, 9], sizeClass: 0.12, name: 'MINNOW', flee: 90, gibs: 2 },
  bluegill: { frames: SPR.bluegill, r: 4, hp: 3, mass: 3, speed: 55, band: [15, 260], school: [2, 5], sizeClass: 0.25, name: 'BLUEGILL', flee: 110, gibs: 2 },
  bass: { frames: SPR.bass, r: 6, hp: 10, mass: 8, speed: 85, band: [20, 320], school: [1, 2], sizeClass: 0.55, name: 'LARGEMOUTH BASS', flee: 120, gibs: 3, aggr: 4, aggrMax: 1.3 },
  catfish: { frames: SPR.catfish, r: 6, hp: 14, mass: 12, speed: 50, band: [200, 900], nearFloor: true, school: [1, 1], sizeClass: 0.65, name: 'CATFISH', flee: 90, gibs: 3 },
  gar: { frames: SPR.gar, r: 6, hp: 30, mass: 22, speed: 95, band: [30, 400], school: [1, 2], sizeClass: 1.0, name: 'ALLIGATOR GAR', flee: 100, gibs: 4, armor: 9, aggr: 7, aggrMax: 2.2 },
  tarpon: { frames: SPR.tarpon, r: 9, hp: 40, mass: 45, speed: 130, band: [30, 500], school: [1, 3], sizeClass: 1.6, name: 'TARPON', flee: 160, gibs: 4 },
  otter: { frames: SPR.otter, r: 6, hp: 25, mass: 35, speed: 150, band: [5, 120], school: [1, 2], sizeClass: 1.0, name: 'RIVER OTTER', flee: 180, gibs: 3, mammal: true },
  manatee: { frames: SPR.manatee, r: 16, hp: 220, mass: 400, speed: 30, band: [20, 300], school: [1, 1], sizeClass: 5, name: 'MANATEE', flee: 60, gibs: 6, mammal: true },
  shark: { frames: SPR.shark, r: 12, hp: 260, mass: 300, speed: 175, band: [60, 800], school: [1, 1], sizeClass: 4.5, name: 'BULL SHARK', flee: 0, gibs: 6, pred: 22 },
};
class Fish extends Entity {
  constructor(x, y, kind, leader) {
    super(x, y); const d = FISH[kind];
    Object.assign(this, { kind, frames: d.frames, r: d.r, hp: d.hp, maxHp: d.hp, mass: d.mass, speed: d.speed, band: d.band, sizeClass: d.sizeClass, name: d.name, gibs: d.gibs, armor: d.armor || 0, def: d });
    this.type = 'fish'; this.leader = leader || null; this.tx = x; this.ty = y; this.retarget = 0; this.state = 'wander'; this.stateT = 0;
    this.threat = d.pred ? 1 : 0; this.facing = chance(0.5) ? 1 : -1; this.attackCd = 0; this.layer = kind === 'minnow' ? -1 : 0;
  }
  update(dt) {
    this.tick(dt);
    const P = G.player, d = this.def, dP = this.distTo(P), ratio = this.playerRatio();
    const sp = this.speed * (1 - this.slow) * (this.stun > 0 ? 0 : 1);
    const sees = this.senses(d.flee || 120);
    if (P.st.fearAura && this.sizeClass < P.size * 0.6 && dP < 260) { this.state = 'flee'; this.stateT = 1; }
    else if (d.pred && !P.dead && (ratio < 1.15 || (this.hp < this.maxHp && dP < 320)) && dP < 560) { this.state = 'hunt'; this.aware = true; }
    else if (d.aggr && !P.dead && P.size < d.aggrMax && dP < 170 && this.aware) this.state = 'hunt';
    else if (this.lured) { this.state = 'lured'; this.lured = 0; }
    else if (sees && ratio > 0.6 && d.flee) { this.state = 'flee'; this.stateT = 1.2; }
    else if (this.stateT > 0) this.stateT -= dt;
    else this.state = 'wander';
    if (P.st.lure && this.sizeClass < P.size * 0.5 && dP < P.st.lure && this.state === 'wander') this.state = 'lured';
    switch (this.state) {
      case 'wander': {
        this.retarget -= dt;
        if (this.retarget <= 0 || dist(this.x, this.y, this.tx, this.ty) < 12) {
          this.retarget = rand(1, 3); const base = this.leader && !this.leader.dead ? this.leader : this;
          this.tx = base.x + rand(-120, 120); const fy = World.floorY(this.tx);
          this.ty = d.nearFloor ? fy - rand(10, 40) : clamp(rand(this.band[0], this.band[1]), 8, fy - 12);
        }
        this.swimToward(this.tx, this.ty, sp * 0.55, 2, dt); break;
      }
      case 'lured': this.swimToward(P.x, P.y, sp * 0.5, 2, dt); break;
      case 'flee': { const dx = this.x - P.x, dy = this.y - P.y, dd = Math.hypot(dx, dy) || 1; this.swimToward(this.x + dx / dd * 200, this.y + dy / dd * 80, sp * 1.7, 5, dt); break; }
      case 'hunt': {
        this.attackCd -= dt;
        const reach = this.r * this.size + 6 * P.size;
        if (this.attackCd <= 0 && P.nearestDist(this.x, this.y) < reach) {
          const dmg = (d.pred || d.aggr) * Math.pow(this.sizeClass / P.size, 0.5);
          if (P.hurt(dmg, this, 'bite') > 0) { SFX.chomp(this.sizeClass, this.pan); if (d.shock) { P.envenom(3, 2); G.fx.shock(P.x, P.y, 40, '#60e0ff', 0.4); SFX.shock(this.pan); } }
          this.attackCd = d.pred ? 1.4 : 1.8; this.vx *= -0.6; this.vy *= -0.6;
        }
        if (d.shock && this.attackCd > 1.0) { G.fx.shock(this.x, this.y, 30, '#60e0ff', 0.3); }
        if (this.attackCd > 0.6 && d.pred) { const dx = this.x - P.x, dy = this.y - P.y, dd = Math.hypot(dx, dy) || 1; this.swimToward(P.x + dx / dd * 200, P.y + dy / dd * 70, sp, 3, dt); }
        else this.swimToward(P.x + P.vx * 0.2, P.y, sp * 1.25, 4, dt);
        break;
      }
    }
    this.clampWater(4 + this.r * this.size * 0.5);
    this.move(dt); this.faceVel(0.5);
    this.animate(dt, 3 + Math.hypot(this.vx, this.vy) / 18);
  }
}
class Turtle extends Entity {
  constructor(x, y) {
    super(x, y); this.frames = SPR.turtle; this.r = 7; this.hp = 40; this.maxHp = 40; this.mass = 18; this.armor = 12; this.sizeClass = 0.8; this.name = 'SNAPPING TURTLE'; this.type = 'turtle'; this.gibs = 4;
    this.tx = x; this.ty = y; this.retarget = 0; this.breath = rand(5, 12); this.snapCd = 0;
  }
  update(dt) {
    this.tick(dt); this.retarget -= dt; this.breath -= dt;
    if (this.retarget <= 0) { this.retarget = rand(2, 5); this.tx = this.x + rand(-90, 90); this.ty = this.breath < 0 ? 6 : World.floorY(this.tx) - rand(8, 30); if (this.breath < -2) this.breath = rand(8, 16); }
    this.swimToward(this.tx, this.ty, 22 * (1 - this.slow), 1.5, dt);
    const P = G.player; this.snapCd -= dt;
    if (!P.dead && P.size < 1.7 && P.nearestDist(this.x, this.y) < 14 && this.snapCd <= 0) { P.hurt(6, this, 'bite'); this.snapCd = 2; SFX.chomp(0.8, this.pan); }
    this.clampWater(6); this.move(dt); this.faceVel(0.3);
  }
  takeDamage(dmg, src, opts) {
    if (this.armor > 0 && (dmg >= this.armor || opts.pierce)) { this.armor = 0; G.fx.splinters(this.x, this.y, 10, 90); G.fx.text(this.x, this.y - 12, 'SHELL CRACKED!', { color: '#e0d0a0' }); SFX.splinter(this.pan); }
    return super.takeDamage(dmg, src, opts);
  }
}
class Frog extends Entity {
  constructor(x) {
    super(x, 0); this.frames = SPR.frog; this.r = 4; this.hp = 2; this.maxHp = 2; this.mass = 4; this.sizeClass = 0.25; this.name = 'BULLFROG'; this.type = 'frog'; this.gibs = 2;
    this.y = World.surface(x) - 2; this.hopCd = rand(1, 4); this.onSurface = true; this.bloodColors = ['#7a1010', '#a02020', '#c03030'];
  }
  update(dt) {
    this.tick(dt); const P = G.player, s = World.surface(this.x);
    if (this.onSurface) {
      this.y = s - 2; this.vy = 0; this.vx *= 0.9; this.hopCd -= dt;
      const near = this.senses(70);
      if ((near && this.hopCd <= 0) || this.hopCd <= -4) {
        this.hopCd = rand(1.5, 3); const dir = near ? sign(this.x - P.x) : (chance(0.5) ? 1 : -1);
        this.vx = dir * rand(60, 110); this.vy = -rand(140, 210); this.onSurface = false; this.facing = dir; G.fx.ripple(this.x, 4, 0.5); if (chance(0.4)) SFX.frog(this.pan);
      }
    } else if (this.y < s) { this.vy += 520 * dt; this.wasAir = true; }
    else { if (this.wasAir) { this.wasAir = false; this.vy *= 0.15; G.fx.splash(this.x, 0.3, this.vx); } this.vy = approach(this.vy, -60, 500 * dt); this.vx *= 0.95; if (this.y <= s + 1 && this.vy < 0) { this.y = s - 2; this.vy = 0; this.onSurface = true; G.fx.ripple(this.x, 3, 0.4); } }
    this.move(dt);
    const fy = World.floorY(this.x); if (this.y > fy - 4) { this.y = fy - 4; this.vy = 0; }
  }
}
// ---------- birds ----------
const BIRDS = {
  heron: { stand: SPR.heron, fly: SPR.heronFly, hp: 14, mass: 25, sizeClass: 0.9, name: 'GREAT BLUE HERON', flee: 120, feathers: '#8fa3b5', speed: 120, r: 7 },
  egret: { fly: SPR.egretFly, hp: 8, mass: 15, sizeClass: 0.7, name: 'SNOWY EGRET', feathers: '#f0f0e8', speed: 110, r: 6 },
  ibis: { fly: SPR.ibisFly, hp: 8, mass: 14, sizeClass: 0.6, name: 'WHITE IBIS', feathers: '#f4f0ea', speed: 100, r: 6 },
  duck: { stand: SPR.duck, fly: SPR.egretFly, hp: 6, mass: 10, sizeClass: 0.5, name: 'MOTTLED DUCK', flee: 80, feathers: '#a08060', speed: 95, floats: true, r: 5 },
};
class Bird extends Entity {
  get diving() { return false; }
  constructor(x, y, kind, mode, dir) {
    super(x, y); const d = BIRDS[kind]; this.def = d; this.kind = kind;
    Object.assign(this, { hp: d.hp, maxHp: d.hp, mass: d.mass, sizeClass: d.sizeClass, name: d.name, feathers: d.feathers, r: d.r });
    this.type = 'bird'; this.mode = mode; this.dir = dir || (chance(0.5) ? 1 : -1); this.facing = this.dir; this.flyH = -rand(70, 170); this.gibs = 3; this.dipT = rand(4, 12); this.wingT = rand(10); this.peck = 0; this.drownT = 0;
    if (mode === 'wade') { this.y = World.floorY(x) - 11; }
    if (mode === 'float') { this.y = World.surface(x) - 3; }
  }
  update(dt) {
    this.tick(dt); const P = G.player, d = this.def;
    switch (this.mode) {
      case 'wade': {
        this.y = World.floorY(this.x) - 11; this.peck -= dt;
        if (this.peck <= 0) { this.peck = rand(1.5, 4); this.pecking = 0.5; }
        if (this.pecking > 0) this.pecking -= dt;
        if (this.senses(d.flee)) this.takeoff(P);
        break;
      }
      case 'float': {
        this.y = World.surface(this.x) - 3; this.vx = approach(this.vx, this.dir * 8, 20 * dt); this.x += this.vx * dt;
        if (chance(dt * 0.1)) this.dir *= -1; this.facing = sign(this.vx || this.dir);
        if (this.senses(d.flee)) this.takeoff(P);
        break;
      }
      case 'fly': {
        const s = World.surface(this.x);
        if (this.y > s + 2 && !this.diving) { // knocked into water
          this.mode = 'drown'; this.drownT = 0; G.fx.splash(this.x, 0.8, this.vx); break;
        }
        this.dipT -= dt;
        let targetH = this.flyH;
        if (this.dipT < 0 && this.dipT > -2.5 && this.kind !== 'duck') targetH = -14; // skim the surface
        if (this.dipT < -2.5) this.dipT = rand(6, 14);
        if (this.escaping > 0) { this.escaping -= dt; targetH = this.flyH - 60; }
        this.vy += ((targetH - this.y) * 2.2 - this.vy) * Math.min(1, 2.5 * dt);
        this.vx = approach(this.vx, this.dir * d.speed * (this.escaping > 0 ? 1.4 : 1), 200 * dt);
        this.move(dt); this.facing = sign(this.vx || this.dir);
        this.angle = clamp(this.vy / 300, -0.35, 0.35);
        this.wingT += dt * (this.escaping > 0 ? 14 : 9); this.frame = Math.sin(this.wingT) > 0 ? 0 : 1;
        if (Math.abs(this.x - G.cam.x) > 1500) this.remove = true;
        break;
      }
      case 'drown': {
        this.drownT += dt; const s = World.surface(this.x);
        this.vy = approach(this.vy, -25, 100 * dt); this.vx *= 0.97; this.move(dt);
        this.wingT += dt * 12; this.frame = Math.sin(this.wingT) > 0 ? 0 : 1; this.angle = 0;
        if (chance(dt * 6)) G.fx.splash(this.x, 0.25, 0);
        if (this.y <= s - 2) { this.y = s - 2; if (this.drownT > 2) { this.mode = 'fly'; this.escaping = 2; this.vy = -80; this.vx = this.dir * 60; } }
        break;
      }
    }
  }
  takeoff(P) {
    if (this.mode === 'fly') return;
    this.mode = 'fly'; this.dir = sign(this.x - P.x) || 1; this.vy = -90; this.vx = this.dir * 40; this.escaping = 2.5; this.dipT = rand(5, 10);
    if (this.def.floats) G.fx.splash(this.x, 0.5, 0);
    SFX.bird(this.pan);
  }
  takeDamage(dmg, src, opts) { const r = super.takeDamage(dmg, src, opts); if (!this.dead) { G.fx.feathers(this.x, this.y, 5, this.feathers); if (this.mode !== 'fly') this.takeoff(G.player); this.vy -= 40; } return r; }
  get spr() {
    if (this.mode === 'fly' || this.mode === 'drown') return this.def.fly[this.frame % 2];
    return this.def.stand[0];
  }
  draw(ctx) {
    const s = this.spr; if (!s) return;
    const img = this.flash > 0 ? spriteWhite(s) : s;
    if (this.mode === 'wade') { drawSpr(ctx, img, this.x, this.y + (this.pecking > 0 ? 1 : 0), (this.pecking > 0 ? 0.25 : 0) * this.facing, this.facing, 1, s.w / 2, s.h / 2); }
    else drawSpr(ctx, img, this.x, this.y, this.angle * this.facing, this.facing, 1);
  }
}
// ---------- land animals ----------
const LAND = {
  deer: { spr: SPR.deer, hp: 60, mass: 120, sizeClass: 2.6, name: 'WHITETAIL DEER', speed: 170, flee: 150, r: 10, gibs: 5, h: 11 },
  raccoon: { spr: SPR.raccoon, hp: 12, mass: 28, sizeClass: 0.9, name: 'RACCOON', speed: 110, flee: 90, r: 6, gibs: 3, h: 4 },
  boar: { spr: SPR.boar, hp: 90, mass: 150, sizeClass: 2.4, name: 'WILD BOAR', speed: 150, flee: 70, r: 10, gibs: 5, charge: 16, h: 6 },
  fisherman: { spr: SPR.human, hp: 20, mass: 70, sizeClass: 2.0, name: 'FISHERMAN', speed: 130, flee: 110, r: 6, gibs: 4, human: true, h: 6 },
  survivor: { spr: SPR.tourist, hp: 15, mass: 70, sizeClass: 2.0, name: 'TOURIST', speed: 140, flee: 200, r: 6, gibs: 4, human: true, h: 6 },
};
class LandAnimal extends Entity {
  constructor(x, kind) {
    super(x, 0); const d = LAND[kind]; this.def = d; this.kind = kind; this.frames = [d.spr[0]];
    Object.assign(this, { hp: d.hp, maxHp: d.hp, mass: d.mass, sizeClass: d.sizeClass, name: d.name, r: d.r, gibs: d.gibs });
    this.armor = d.armor || 0; this.prey = null; this.huntCd = rand(2, 8);
    this.type = 'land'; this.facing = chance(0.5) ? 1 : -1; this.state = 'idle'; this.stateT = rand(1, 3); this.swimT = 0; this.layer = 1; this.rodT = 0; this.chargeCd = 0;
    this.y = World.floorY(x) - d.h; this.grazeT = 0;
  }
  landAt(x) { return World.floorY(x) < -2; }
  update(dt) {
    this.tick(dt); const P = G.player, d = this.def;
    const fy = World.floorY(this.x);
    if (fy > 0 || this.y > World.surface(this.x) + 4) { this.updateSwim(dt, P, d); return; }
    this.y = fy - d.h; this.vy = 0;
    const sees = this.senses(d.flee), dP = this.distTo(P);
    // land predators hunt other land animals when the player is not a factor
    if (d.hunter) {
      this.huntCd -= dt;
      if ((!this.prey || this.prey.dead || this.prey.remove) && this.huntCd <= 0) {
        this.huntCd = rand(3, 9);
        this.prey = Eco.findPrey(this, 340, this.sizeClass * 1.4, e => (e.type === 'land' || (e.type === 'bird' && e.mode === 'wade')) && Math.abs(World.floorY(e.x)) > 0 && World.floorY(e.x) < -2 && e !== this);
      }
      if (this.prey && !this.prey.dead && !this.prey.remove && !sees) {
        const t = this.prey, dir2 = sign(t.x - this.x);
        if (Math.abs(t.x - this.x) < 18) { Eco.devour(this, t, { label: 'HUNTED' }); this.prey = null; this.state = 'idle'; this.stateT = 2.5; this.vx = 0; }
        else if (this.landAt(this.x + dir2 * 20)) { this.facing = dir2; this.vx = approach(this.vx, dir2 * d.speed * 0.9, 500 * dt); this.state = 'stalk'; this.x += this.vx * dt; if (t.takeoff && Math.abs(t.x - this.x) < 90) t.takeoff(this); return; }
        else this.prey = null;
      }
    }
    if (d.charge && !P.dead && P.size < 2.9 && dP < 140 && (P.y < 40) && this.chargeCd <= 0) this.state = 'charge';
    if (this.state !== 'charge' && sees && (P.size > this.sizeClass * 0.45 || d.human)) { if (this.state !== 'flee') { this.state = 'flee'; if (d.human) SFX.yell(this.pan); } this.stateT = 2; }
    this.chargeCd -= dt;
    switch (this.state) {
      case 'idle': this.stateT -= dt; this.vx = approach(this.vx, 0, 300 * dt); if (this.stateT <= 0) { this.state = 'walk'; this.stateT = rand(1, 3); this.facing = chance(0.5) ? 1 : -1; } break;
      case 'walk': this.stateT -= dt; this.vx = approach(this.vx, this.facing * d.speed * 0.25, 300 * dt); if (!this.landAt(this.x + this.facing * 20)) this.facing *= -1; if (this.stateT <= 0) { this.state = 'idle'; this.stateT = rand(1, 4); } break;
      case 'stalk': this.state = 'idle'; this.stateT = 1; break;
      case 'flee': {
        this.stateT -= dt; const dir = sign(this.x - P.x) || this.facing;
        if (this.kind === 'iguana' && chance(dt * 1.2)) { const wx = World.findX(this.x, x => World.floorY(x) > 40, 300, 12); if (wx !== null) { this.x = wx; this.y -= 4; this.vy = 60; this.vx = rand(-30, 30); G.fx.splash(this.x, 0.6, 0); this.state = 'swim'; this.swimT = 0; break; } }
        if (!this.landAt(this.x + dir * 24)) { // cornered at the water's edge
          if (chance(dt * 0.8)) { this.vx = dir * 120; this.vy = -80; this.y -= 2; this.state = 'swim'; G.fx.splash(this.x, 0.8, this.vx); break; }
          this.facing = -dir;
        } else this.facing = dir;
        this.vx = approach(this.vx, this.facing * d.speed, 600 * dt);
        if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 1; }
        break;
      }
      case 'charge': {
        const dir = sign(P.x - this.x); this.facing = dir; this.vx = approach(this.vx, dir * d.speed * 1.2, 500 * dt);
        if (!this.landAt(this.x + dir * 12) && Math.abs(P.x - this.x) > 20) { this.vx = 0; this.state = 'idle'; this.stateT = 1; this.chargeCd = 3; }
        if (P.nearestDist(this.x, this.y) < 14 + 5 * P.size) { P.hurt(d.charge, this, 'crush'); P.vx += dir * 260; P.vy -= 120; this.state = 'idle'; this.stateT = 1.5; this.chargeCd = 3; SFX.thud(this.pan); G.shake(6); }
        if (chance(dt * 10)) G.fx.smoke(this.x - dir * 8, this.y + 4, 1, '#6b5a3a');
        break;
      }
    }
    this.x += this.vx * dt;
    if (Math.abs(this.vx) > 10) this.grazeT += dt * Math.abs(this.vx) * 0.1;
    if (d.human && this.kind === 'fisherman') this.rodT += dt;
  }
  updateSwim(dt, P, d) {
    this.swimT += dt; this.state = 'swim';
    const s = World.surface(this.x); this.vy = approach(this.vy, this.y > s - 2 ? -30 : 20, 150 * dt);
    const landX = World.findX(this.x, x => World.floorY(x) < -2, 900, 30);
    const dir = landX === null ? this.facing : sign(landX - this.x); this.facing = dir;
    this.vx = approach(this.vx, dir * 38, 60 * dt);
    this.move(dt); if (this.y > s - d.h * 0.5) this.y = Math.min(this.y, s - 1);
    if (chance(dt * 4)) G.fx.splash(this.x, 0.2, 0);
    if (d.human && chance(dt * 0.5)) SFX.scream(this.pan);
    if (this.swimT > 14) { this.hp -= 4 * dt; if (chance(dt * 3)) G.fx.bubbles(this.x, this.y + 4, 2); if (this.hp <= 0) { this.die(null); } }
    if (World.floorY(this.x) < -2 && this.y < 0) { this.state = 'flee'; this.stateT = 2; this.swimT = 0; }
  }
  draw(ctx) {
    const s = this.spr, img = this.flash > 0 ? spriteWhite(s) : s;
    const bob = this.state === 'swim' ? Math.sin(this.t * 6) * 1 : (Math.abs(this.vx) > 10 ? Math.abs(Math.sin(this.grazeT)) * -1.5 : 0);
    drawSpr(ctx, img, this.x, this.y + bob, this.state === 'swim' ? 0.3 * this.facing : 0, this.facing, 1);
    if (this.kind === 'fisherman' && this.state !== 'swim' && this.state !== 'flee') {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.x + this.facing * 3, this.y - 2); ctx.lineTo(this.x + this.facing * 16, this.y - 10); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(this.x + this.facing * 16, this.y - 10); ctx.lineTo(this.x + this.facing * 26, World.surface(this.x) + 4 + Math.sin(this.rodT) * 1); ctx.stroke();
    }
  }
}
// ---------- snakes ----------
class Snake extends Entity {
  constructor(x, y, kind, size = 1) {
    super(x, y); this.kind = kind; this.size = size; this.type = 'snake';
    if (kind === 'moccasin') { this.head = SPR.moccasinHead; this.segs = SPR.moccasinSeg; this.n = 9; this.sp = 3.2; this.hp = 12; this.mass = 12; this.sizeClass = 0.8; this.name = 'WATER MOCCASIN'; this.speed = 75; this.venom = 3; this.r = 3; this.gibs = 0; }
    else { this.head = SPR.pythonHead; this.segs = SPR.pythonSeg; this.n = 14; this.sp = 6.5; this.hp = 110 * size; this.mass = 220 * size; this.sizeClass = 3.4 * size; this.name = size > 1.6 ? 'MOTHER PYTHON' : 'BURMESE PYTHON'; this.speed = 60; this.constrict = 7 * size; this.r = 4; this.gibs = 0; this.threat = 1; }
    this.maxHp = this.hp; this.chain = []; for (let i = 0; i <= this.n; i++) this.chain.push({ x: x - i * this.sp * size, y, a: 0 });
    this.tx = x; this.ty = y; this.retarget = 0; this.phase = rand(TAU); this.state = 'wander'; this.strikeCd = 0; this.grabT = 0; this.bloodColors = ['#7a1010', '#a02020', '#c03030', '#5a0808'];
  }
  hitTest(x, y, r) { const rr = r + this.r * this.size; for (const c of this.chain) if (dist(x, y, c.x, c.y) < rr) return true; return false; }
  nearestDist(x, y) { let m = 1e9; for (const c of this.chain) m = Math.min(m, dist(x, y, c.x, c.y)); return m; }
  update(dt) {
    this.tick(dt); const P = G.player, dP = this.distTo(P);
    const land = World.floorY(this.x) < -2, surf = World.surface(this.x);
    const ratio = this.playerRatio(); const sp = this.speed * (1 - this.slow) * (this.stun > 0 ? 0 : 1);
    this.strikeCd -= dt;
    const aggro = !P.dead && (this.kind === 'moccasin' ? P.size < 1.7 : ratio < 1.25) && dP < 150 && this.senses(140);
    if (this.grabbing) {
      // constricting the player
      this.grabT += dt; this.x = lerp(this.x, P.x, 0.3); this.y = lerp(this.y, P.y, 0.3); this.vx = this.vy = 0;
      P.hurt(this.constrict * dt, this, 'crush');
      if (P.grabbed !== this || this.grabT > 6 || P.dead) { this.release(); }
    } else if (aggro && this.strikeCd <= 0 && dP < 90) {
      this.state = 'strike'; this.strikeCd = 2.2; const dx = P.x - this.x, dy = P.y - this.y, d = Math.hypot(dx, dy) || 1; this.vx = dx / d * 260; this.vy = dy / d * 260; SFX.hiss(this.pan);
    } else if (aggro) { this.state = 'hunt'; this.swimToward(P.x, P.y, sp, 3, dt); }
    else if (ratio > 1.4 && this.senses(120)) { const dx = this.x - P.x, dy = this.y - P.y, d = Math.hypot(dx, dy) || 1; this.swimToward(this.x + dx / d * 100, this.kind === 'moccasin' ? surf + 4 : this.y + dy / d * 50, sp * 1.4, 4, dt); this.state = 'flee'; }
    else {
      this.state = 'wander'; this.retarget -= dt;
      if (this.retarget <= 0) { this.retarget = rand(2, 5); this.tx = this.x + rand(-140, 140); this.ty = this.kind === 'moccasin' ? 4 : (chance(0.5) ? 6 : World.floorY(this.tx) - 12); }
      this.swimToward(this.tx, this.ty, sp * 0.5, 1.5, dt);
    }
    if (this.state === 'strike') {
      this.drag(dt, 3);
      if (P.nearestDist(this.x, this.y) < 8 + 5 * P.size && this.strikeCd > 1.6) {
        if (this.kind === 'moccasin') { if (P.hurt(4, this, 'bite') > 0) { P.envenom(this.venom, 4); G.fx.text(P.x, P.y - 20, 'VENOM!', { color: '#60ff60' }); } this.strikeCd = 2.5; this.vx *= -0.5; }
        else if (!P.st.knockImmune && P.size < this.sizeClass * 1.1) { this.grabbing = true; this.grabT = 0; P.grabbed = this; G.fx.text(P.x, P.y - 22, 'CONSTRICTED!', { color: '#ff8040', scale: 2 }); G.shake(8); SFX.growl(this.pan); }
        else { P.hurt(8 * this.size, this, 'bite'); this.strikeCd = 2.5; this.vx *= -0.5; }
      }
      if (this.strikeCd < 1.4) this.state = 'hunt';
    }
    // environment
    if (land && this.kind === 'python') { const fy = World.floorY(this.x); this.y = fy - 4; this.vy = 0; }
    else { if (this.kind === 'moccasin') { this.y = lerp(this.y, surf + 3, 0.1); } this.clampWater(4); }
    this.move(dt);
    if (this.kind === 'python' && this.y < surf && !land) { this.vy += 400 * dt; }
    // chain follow with sine slither
    this.phase += dt * (3 + Math.hypot(this.vx, this.vy) * 0.05);
    const c = this.chain; c[0].x = this.x; c[0].y = this.y; if (Math.hypot(this.vx, this.vy) > 3) c[0].a = Math.atan2(this.vy, this.vx);
    for (let i = 1; i < c.length; i++) {
      const p = c[i - 1], s = c[i], sp2 = this.sp * this.size;
      let a = Math.atan2(s.y - p.y, s.x - p.x); const back = p.a + Math.PI; let d = angleDiff(back, a); d = clamp(d, -0.7, 0.7);
      const wig = Math.sin(this.phase - i * 0.9) * 0.35; const aa = back + d * 0.8 + wig;
      s.x = p.x + Math.cos(aa) * sp2; s.y = p.y + Math.sin(aa) * sp2; s.a = aa + Math.PI;
    }
    this.facing = Math.cos(c[0].a) >= 0 ? 1 : -1;
  }
  release() { this.grabbing = false; if (G.player.grabbed === this) G.player.grabbed = null; this.strikeCd = 3; this.vx = -this.facing * 120; this.vy = -40; this.stun = 0.8; }
  die(k) { if (this.grabbing) this.release(); super.die(k); }
  explode(power = 1) {
    G.fx.gore(this.x, this.y, 80 * Math.sqrt(power), 0, 0, this.kind === 'python');
    for (let i = 0; i < this.chain.length; i++) {
      const c = this.chain[i], s = i === 0 ? this.head : this.segs[i % 2];
      const g = new Gib(c.x, c.y, s, { sx: 0, sy: 0, sw: s.w, sh: s.h }, this.size, 1, true, this.bloodColors);
      g.rot = c.a; g.mass = this.mass * 0.3 / this.chain.length; g.edible = true; const a = rand(TAU), spd = rand(30, 90); g.vx = Math.cos(a) * spd; g.vy = Math.sin(a) * spd - 20; g.vr = rand(-6, 6);
      G.add(g);
    }
    SFX.gib(this.pan);
  }
  draw(ctx) {
    const c = this.chain, white = this.flash > 0;
    for (let i = c.length - 1; i >= 1; i--) { const s = this.segs[i % 2]; drawSpr(ctx, white ? spriteWhite(s) : s, c[i].x, c[i].y, c[i].a, this.size, this.size); }
    drawSpr(ctx, white ? spriteWhite(this.head) : this.head, c[0].x, c[0].y, c[0].a, this.size, this.size * (Math.cos(c[0].a) >= 0 ? 1 : -1), 2, this.head.h / 2);
  }
}
// ---------- rival gators / OLD SCAR ----------
class Gator extends Entity {
  constructor(x, y, size, boss = false) {
    super(x, y); this.size = size; this.sizeClass = size; this.type = 'gator'; this.isBoss = boss; this.threat = 1;
    this.hp = Math.round((boss ? 75 : 55) * Math.pow(size, 1.5)); this.maxHp = this.hp; this.mass = Math.round(120 * size * (boss ? 1.6 : 1));
    this.name = boss ? 'OLD SCAR' : 'RIVAL GATOR'; this.r = 5; this.gibs = 0; this.persistent = boss;
    this.chain = new CrocChain(x, y, 0); this.parts = buildCrocParts(CROC_LOOKS[boss ? 'oldscar' : 'gator']);
    this.jaw = 0; this.biteT = 0; this.biteCd = rand(0.5, 1.5); this.state = 'patrol'; this.tx = x; this.ty = y; this.retarget = 0; this.legPhase = 0; this.roll = 0; this.rollT = 0; this.grabbing = false; this.grabT = 0; this.wasAir = false; this.roarCd = 0;
    this.bloodColors = ['#7a1010', '#a51a1a', '#c02020', '#5a0808'];
  }
  hitTest(x, y, r) { const rr = r + this.r * this.size; for (const n of this.chain.nodes) if (dist(x, y, n.x, n.y) < rr) return true; return false; }
  nearestDist(x, y) { let m = 1e9; for (const n of this.chain.nodes) m = Math.min(m, dist(x, y, n.x, n.y)); return m; }
  get snout() { const h = this.chain.nodes[0], L = 17 * this.size; return [h.x + Math.cos(h.a) * L, h.y + Math.sin(h.a) * L]; }
  update(dt) {
    this.tick(dt); const P = G.player, dP = this.distTo(P), ratio = P.size / this.size;
    const maxSp = (120 + 40 * Math.sqrt(this.size)) * (1 - this.slow * 0.7) * (this.stun > 0 ? 0 : 1);
    this.biteCd -= dt; this.roarCd -= dt;
    // state selection
    if (this.grabbing) this.state = 'grab';
    else if (!P.dead && this.hp < this.maxHp * 0.22 && !this.isBoss) this.state = 'flee';
    else if (!P.dead && ((ratio < 1.15 && dP < 480 && (this.aware || dP < 260 || this.isBoss)) || dP < 70 || (this.hp < this.maxHp && dP < 400))) { this.state = 'hunt'; this.aware = true; this.awareT = 4; }
    else if (!P.dead && ratio > 1.4 && dP < 260) this.state = 'flee';
    else this.state = 'patrol';
    switch (this.state) {
      case 'patrol': {
        this.retarget -= dt;
        if (this.retarget <= 0) { this.retarget = rand(2, 5); this.tx = this.x + rand(-250, 250); this.ty = clamp(rand(10, 200), 8, World.floorY(this.tx) - 12); }
        this.swimToward(this.tx, this.ty, maxSp * 0.4, 1.5, dt); break;
      }
      case 'hunt': {
        if (this.roarCd <= 0 && dP < 300) { this.roarCd = rand(5, 9); SFX.growl(this.pan); }
        const lead = 0.25; let tx = P.x + P.vx * lead, ty = P.y + P.vy * lead;
        if (this.biteCd > 0 && this.biteCd < 1.0) { const dx = this.x - P.x, dy = this.y - P.y, d = Math.hypot(dx, dy) || 1; tx = P.x + dx / d * 120; ty = P.y + dy / d * 40; }
        this.swimToward(tx, ty, maxSp * (this.isBoss ? 1.15 : 1), 3.5, dt);
        const [sx, sy] = this.snout;
        if (this.biteCd <= 0 && P.nearestDist(sx, sy) < 8 + 5 * P.size + 4 * this.size) {
          this.biteT = 0.16; this.biteCd = this.isBoss ? 1.2 : 1.6;
          const dmg = 11 * Math.pow(this.size, 0.8) * (this.isBoss ? 1.1 : 1);
          if (P.hurt(dmg, this, 'bite') > 0) {
            SFX.chomp(this.size, this.pan); G.hitstop(0.05);
            const dx = P.x - this.x, dy = P.y - this.y, d = Math.hypot(dx, dy) || 1; if (!P.st.knockImmune) { P.vx += dx / d * 180; P.vy += dy / d * 120; }
            if (this.isBoss && !P.st.knockImmune && P.size < this.size * 1.05 && chance(0.4)) { this.grabbing = true; this.grabT = 0; P.grabbed = this; G.fx.text(P.x, P.y - 24, 'DEATH ROLLED!', { color: '#ff6040', scale: 2 }); }
          }
        }
        break;
      }
      case 'grab': {
        this.grabT += dt; this.rollT += dt * 6; this.roll = this.rollT;
        this.x = lerp(this.x, P.x - Math.cos(this.chain.nodes[0].a) * 14 * this.size, 0.3); this.y = lerp(this.y, P.y, 0.3); this.vx *= 0.9; this.vy *= 0.9;
        P.hurt(9 * this.size * dt, this, 'crush');
        if (chance(dt * 30)) { G.fx.bubbles(P.x, P.y, 2, 14 * P.size); G.fx.blood(P.x, P.y, 2, 0, 0, 90); }
        if (this.grabT > 2.2 || P.grabbed !== this || P.dead) this.release();
        break;
      }
      case 'flee': { const dx = this.x - P.x, dy = this.y - P.y, d = Math.hypot(dx, dy) || 1; this.swimToward(this.x + dx / d * 300, clamp(this.y + dy / d * 60, 10, World.floorY(this.x) - 20), maxSp * 1.1, 3, dt); if (chance(dt * 4)) G.fx.blood(this.x, this.y, 1, 0, 0, 10, this.bloodColors); break; }
    }
    if (this.state !== 'grab') { this.roll = lerp(this.roll, Math.round(this.roll / TAU) * TAU, 0.2); }
    // physics
    const under = this.inWater;
    if (under) { this.drag(dt, 1.1); if (this.wasAir) { this.wasAir = false; G.fx.splash(this.x, Math.sqrt(this.size), this.vx); } }
    else { this.vy += 700 * dt; this.wasAir = true; }
    this.move(dt);
    const fy = World.floorY(this.x); if (this.y > fy - 5 * this.size) { this.y = fy - 5 * this.size; if (this.vy > 0) this.vy *= -0.2; }
    if (this.y < World.surface(this.x) - 300) this.vy += 200 * dt;
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > 12) this.angle = angleLerp(this.angle, Math.atan2(this.vy, this.vx), 1 - Math.exp(-5 * dt));
    this.facing = Math.cos(this.angle) >= 0 ? 1 : -1;
    this.chain.solve(this.x, this.y, this.angle, this.size, dt, clamp(spd / maxSp, 0, 1.2));
    this.legPhase += dt * (2 + spd * 0.05);
    if (this.biteT > 0) { this.biteT -= dt; this.jaw = this.biteT > 0.08 ? (0.16 - this.biteT) / 0.08 : this.biteT / 0.08; } else this.jaw = this.state === 'hunt' && dP < 120 ? 0.3 : 0;
    if (under && spd > 80 && chance(dt * 4)) G.fx.bubbles(this.x, this.y, 1, 4 * this.size);
  }
  release() { this.grabbing = false; this.rollT = 0; if (G.player.grabbed === this) G.player.grabbed = null; this.biteCd = 2.2; const dx = this.x - G.player.x; this.vx = sign(dx) * 140; this.stun = 0.6; }
  die(k) { if (this.grabbing) this.release(); super.die(k); }
  explode(power = 1) {
    G.fx.gore(this.x, this.y, 110 * Math.sqrt(power), 0, 0, true);
    const n = this.chain.nodes;
    for (let i = 0; i < n.length; i++) {
      const part = i === 0 ? this.parts.head : i <= 5 ? this.parts.body[i - 1] : this.parts.tail[i - 6];
      const g = new Gib(n[i].x, n[i].y, part, { sx: 0, sy: 0, sw: part.w, sh: part.h }, this.size / CROC_PX, 1, true, this.bloodColors);
      g.rot = n[i].a; g.mass = this.mass * 0.3 / n.length; g.edible = true; const a = rand(TAU), sp = rand(30, 110) * Math.sqrt(power); g.vx = Math.cos(a) * sp; g.vy = Math.sin(a) * sp - 30; g.vr = rand(-6, 6);
      G.add(g);
    }
    G.fx.flesh(this.x, this.y, 20, 120);
    SFX.gib(this.pan); SFX.roar(this.size, this.pan);
  }
  draw(ctx) { drawCroc(ctx, this.chain, this.parts, this.size, { jaw: this.jaw, legPhase: this.legPhase, flipY: this.facing, flash: this.flash, roll: this.roll }); }
}
// ---------- humans in the water ----------
class Human extends Entity {
  constructor(x, y, kind = 'swimmer') {
    super(x, y); this.frames = SPR.swimmer; this.r = 6; this.hp = 15; this.maxHp = 15; this.mass = 70; this.sizeClass = 2; this.name = kind === 'poacher' ? 'POACHER' : 'TOURIST'; this.type = 'human'; this.gibs = 4; this.kind = kind; this.layer = 1; this.life = 45; this.screamT = rand(0.5, 2);
  }
  update(dt) {
    this.tick(dt); this.life -= dt; const s = World.surface(this.x);
    this.vy = approach(this.vy, this.y > s - 2 ? -40 : 30, 200 * dt);
    const landX = World.findX(this.x, x => World.floorY(x) < -2, 800, 30); const dir = landX === null ? 1 : sign(landX - this.x);
    this.vx = approach(this.vx, dir * 32, 50 * dt); this.facing = dir;
    this.move(dt); if (this.y < s - 3) this.y = s - 3;
    this.animate(dt, 5); this.screamT -= dt; if (this.screamT <= 0) { this.screamT = rand(1.5, 4); SFX.scream(this.pan); }
    if (chance(dt * 5)) G.fx.splash(this.x, 0.2, 0);
    if (World.floorY(this.x) < -2) { this.remove = true; const s2 = new LandAnimal(this.x, 'survivor'); s2.state = 'flee'; s2.stateT = 3; G.add(s2); }
    if (this.life <= 0) { this.bleeds = true; this.die(null); }
  }
  explode(p) { super.explode(p); dropMeat(this.x, this.y, 2, 6); if (chance(0.7)) { const g = new Gib(this.x, this.y, SPR.armGib, { sx: 0, sy: 0, sw: 3, sh: 3 }, 1.5, 1, true, BLOOD_COLORS); g.mass = 6; g.edible = true; g.vx = rand(-80, 80); g.vy = -rand(60, 140); g.vr = rand(-9, 9); G.add(g); } }
}
// ---------- boats ----------
class Boat extends Entity {
  constructor(x, kind = 'poacher', dir = 1) {
    super(x, 0); this.kind = kind; this.type = 'boat'; this.edible = false; this.bleeds = false; this.latchable = false; this.dir = dir; this.facing = dir; this.layer = 1;
    this.war = kind === 'warboat'; this.isBoss = this.war; this.persistent = this.war;
    this.jon = kind === 'jon'; this.pontoon = kind === 'pontoon'; this.airboat = !this.jon && !this.pontoon;
    this.hp = this.war ? 320 : this.pontoon ? 160 : this.jon ? 55 : 90; this.maxHp = this.hp;
    this.armor = this.war ? 14 : this.jon ? 5 : 9; this.sizeClass = 5; this.r = this.pontoon ? 34 : this.jon ? 18 : 26; this.mass = 0;
    this.name = this.war ? 'POACHER WARBOAT' : this.pontoon ? 'PARTY PONTOON' : this.jon ? 'JON BOAT' : kind === 'tourist' ? 'AIRBOAT TOUR' : 'POACHERS';
    this.threat = (kind === 'tourist' || this.pontoon || this.jon) ? 0 : 1;
    this.speed = this.war ? 55 : this.pontoon ? 26 : this.jon ? 40 : kind === 'tourist' ? 35 : 45;
    this.fan = 0; this.sinking = false; this.sinkT = 0; this.engineOn = true; this.harpoonCd = 5; this.turnCd = 0; this.moored = false;
    this.pass = [];
    const n = this.war ? 3 : this.pontoon ? 5 : this.jon ? 2 : kind === 'tourist' ? 4 : 2;
    const ptype = this.pontoon ? 'tourist' : this.jon ? 'fisherman' : kind === 'tourist' ? 'tourist' : 'poacher';
    const spread = this.pontoon ? 13 : this.jon ? 12 : this.war ? 11 : 8;
    for (let i = 0; i < n; i++) this.pass.push({ ox: -(n - 1) * spread / 2 + i * spread, oy: -6, alive: true, shootCd: rand(0.5, 2), type: ptype, flash: 0 });
    this.tether = null; this.debris = 0;
  }
  get alivePass() { return this.pass.filter(p => p.alive); }
  passPos(p) { return [this.x + p.ox * this.facing, this.y + p.oy - 6]; }
  hitTest(x, y, r) {
    if (this.sinking) return false;
    for (const p of this.alivePass) { const [px, py] = this.passPos(p); if (dist(x, y, px, py) < r + 6) return true; }
    return Math.abs(x - this.x) < r + 24 && Math.abs(y - this.y) < r + 8;
  }
  nearestDist(x, y) { return Math.max(0, Math.hypot(Math.max(0, Math.abs(x - this.x) - 24), Math.max(0, Math.abs(y - this.y) - 6))); }
  onBite(P, sx, sy, dx, dy) {
    // passengers first
    for (const p of this.alivePass) {
      const [px, py] = this.passPos(p);
      if (dist(sx, sy, px, py) < P.biteRange + 6) { this.killPassenger(p, P, dx, dy); return; }
    }
    // hull
    const dmg = P.biteDmg * (P.st.pierce ? 3 : 1) * (P.st.hullMul || 1);
    if (dmg < this.armor && !P.st.pierce) { G.fx.sparks(sx, sy, 8, dx, dy); SFX.clank(this.pan); G.fx.text(this.x, this.y - 20, 'TOO TOUGH', { color: '#c0c0c0' }); this.vx += dx * 40; return; }
    this.hp -= dmg; this.flash = 0.1; G.fx.splinters(sx, sy, 10, 110); SFX.splinter(this.pan); G.hitstop(0.05); G.shake(4);
    G.fx.text(sx, sy - 14, choice(['CRACK!', 'CRUNCH!', 'SMASH!']), { color: '#e0c080' });
    this.vx += dx * 60; this.engineOn = this.engineOn && chance(0.8);
    if (P.st.ironStomach) { P.eatMass(6, sx, sy); }
    if (this.hp <= 0) this.sink(P);
  }
  killPassenger(p, P, dx, dy) {
    p.alive = false; const [px, py] = this.passPos(p);
    G.fx.gore(px, py, 130, dx, dy, true); G.fx.text(px, py - 16, choice(['CHOMP!', 'DEVOURED!', 'SNATCHED!']), { color: '#ffffff', scale: 2 });
    SFX.crunch(P.size, this.pan); SFX.scream(this.pan); G.hitstop(0.09); G.shake(7); G.slowmo(0.35, 0.45);
    const fake = new Human(px, py, p.type); fake.gulped = true; fake.dead = true; G.onEntityKilled(fake, true, true);
    // arm gib
    const g = new Gib(px, py, SPR.armGib, { sx: 0, sy: 0, sw: 3, sh: 3 }, 1.5, 1, true, BLOOD_COLORS); g.mass = 6; g.edible = true; g.vx = rand(-90, 90); g.vy = -rand(80, 160); g.vr = rand(-9, 9); G.add(g);
    if (this.alivePass.length === 0) { this.engineOn = false; if (this.tether) this.cutTether(); }
  }
  sink(P) {
    if (this.sinking) return; this.sinking = true; this.sinkT = 0; this.engineOn = false; this.threat = 0;
    G.fx.splinters(this.x, this.y, 30, 160); G.fx.splash(this.x, 2.5, this.vx); SFX.splinter(this.pan); SFX.splash(2, this.pan); G.shake(12); G.slowmo(0.4, 0.6);
    G.fx.text(this.x, this.y - 30, 'BOAT DESTROYED!', { color: '#ffd060', scale: 2, life: 1.8 });
    for (const p of this.alivePass) { const [px, py] = this.passPos(p); const h = new Human(px, py + 6, p.type); h.vx = rand(-60, 60); h.vy = -rand(40, 120); G.add(h); p.alive = false; }
    if (this.tether) this.cutTether();
    G.addScore(this.war ? 5000 : 800); G.stats.boats++;
    if (this.war) G.onBossKilled(this);
  }
  cutTether() { if (this.tether && G.player.tether === this.tether) G.player.tether = null; this.tether = null; }
  update(dt) {
    this.tick(dt); const P = G.player, s = World.surface(this.x);
    if (this.sinking) {
      this.sinkT += dt; this.vy = approach(this.vy, 25, 30 * dt); this.vx *= 0.97; this.angle += this.dir * 0.25 * dt; this.move(dt);
      if (chance(dt * 8)) G.fx.bubbles(this.x + rand(-20, 20), this.y, 2, 4);
      if (chance(dt * 3)) G.fx.splinters(this.x + rand(-20, 20), this.y, 1, 30);
      if (this.y > World.floorY(this.x) - 8) { this.vy = 0; this.y = World.floorY(this.x) - 8; }
      if (this.sinkT > 12) this.remove = true;
      return;
    }
    this.y = s - 3 + Math.sin(this.t * 2.5) * 0.6;
    // movement / patrol
    this.turnCd -= dt;
    if (this.moored) { this.vx *= 0.9; this.fan *= 0.95; }
    else if (this.engineOn) {
      const ahead = World.floorY(this.x + this.dir * 60);
      if ((ahead < 12 || Math.abs(this.x - P.x) > 700) && this.turnCd <= 0) { this.dir *= -1; this.turnCd = 3; }
      if (this.threat && !P.dead && Math.abs(P.x - this.x) > 90 && chance(dt * 0.6)) this.dir = sign(P.x - this.x);
      this.vx = approach(this.vx, this.dir * this.speed, 60 * dt); this.fan += dt * 40;
      if (chance(dt * 6)) G.fx.smoke(this.x - this.facing * 22, this.y - 14, 1, '#7a7a7a');
      if (chance(dt * 10)) G.fx.foam && 0;
      G.fx.add({ type: 'foam', x: this.x - this.facing * 26 + rand(-4, 4), y: s, vx: -this.facing * rand(10, 40), vy: 0, s: 1, life: rand(0.4, 1.2) });
    } else { this.vx *= 0.98; this.fan *= 0.97; }
    this.x += this.vx * dt; if (Math.abs(this.vx) > 4) this.facing = sign(this.vx);
    this.angle = clamp(this.vx / 400, -0.06, 0.06) * -1;
    // shooting
    const inRange = !P.dead && Math.abs(P.x - this.x) < 300 && P.y < 110 && P.y > -160;
    for (const p of this.alivePass) {
      if (p.flash > 0) p.flash -= dt;
      if (p.type !== 'poacher') continue;
      p.shootCd -= dt;
      if (inRange && p.shootCd <= 0) {
        p.shootCd = this.war ? rand(0.7, 1.1) : rand(0.9, 1.5);
        const [px, py] = this.passPos(p); const tx = P.x + P.vx * 0.3 + rand(-14, 14), ty = P.y + P.vy * 0.3 + rand(-10, 10);
        const a = Math.atan2(ty - py, tx - px); const b = new Projectile(px, py - 4, Math.cos(a) * 520, Math.sin(a) * 520, 'bullet', this); G.add(b);
        p.flash = 0.06; SFX.gunshot(this.pan); G.fx.smoke(px + Math.cos(a) * 8, py - 4 + Math.sin(a) * 8, 1, '#c0c0c0');
      }
    }
    if (this.war && inRange && this.alivePass.length) {
      this.harpoonCd -= dt;
      if (this.harpoonCd <= 0 && !this.tether) {
        this.harpoonCd = 7; const a = Math.atan2(P.y - (this.y - 10), P.x - this.x);
        const h = new Projectile(this.x, this.y - 10, Math.cos(a) * 420, Math.sin(a) * 420, 'harpoon', this); G.add(h); SFX.gunshot(this.pan); G.fx.text(this.x, this.y - 30, 'HARPOON!', { color: '#ff8040' });
      }
    }
    if (this.tether) {
      const T = this.tether; T.t += dt;
      const dx = this.x - P.x, dy = this.y - P.y, d = Math.hypot(dx, dy) || 1;
      if (d > 60) { P.vx += dx / d * 260 * dt; P.vy += dy / d * 260 * dt; }
      P.hurt(3 * dt, this, 'crush');
      if (chance(dt * 6)) G.fx.blood(P.x, P.y, 1, 0, 0, 30);
      if (T.t > 5 || P.tether !== T) this.cutTether();
    }
    G.engineNear = Math.max(G.engineNear, this.engineOn ? clamp(1 - Math.abs(this.x - P.x) / 700, 0, 1) : 0);
    if (Math.abs(this.x - P.x) > 1900 && !this.war) this.remove = true;
  }
  draw(ctx) {
    const f = this.facing;
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.scale(f, 1);
    if (this.sinking) ctx.rotate(this.dir * f * this.sinkT * 0.12);
    const L = this.war ? 34 : this.pontoon ? 42 : this.jon ? 20 : 26;
    const hullCol = this.flash > 0 ? '#ffffff' : this.war ? '#4a4a3a' : this.pontoon ? '#d0d4d8' : this.jon ? '#4a7a4a' : this.kind === 'tourist' ? '#c8c8c0' : '#8a8a80';
    // hull
    ctx.fillStyle = hullCol; ctx.beginPath(); ctx.moveTo(-L, -2); ctx.lineTo(L - 6, -2); ctx.lineTo(L, -8); ctx.lineTo(L, -2); ctx.lineTo(L - 2, 5); ctx.lineTo(-L + 2, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = this.war ? '#2a2a20' : '#5a5a50'; ctx.fillRect(-L, 3, L * 2, 2);
    ctx.fillStyle = this.war ? '#8a2020' : '#c04040'; ctx.fillRect(-L + 2, -1, L * 2 - 6, 1);
    // deck / seat
    ctx.fillStyle = '#3a3a30'; ctx.fillRect(-4, -12, 8, 10); ctx.fillRect(-6, -14, 12, 2);
    if (this.pontoon) { // railings, canopy and pontoons
      ctx.fillStyle = '#9aa0a6'; ctx.fillRect(-L, 4, L * 2, 4); ctx.fillRect(-L + 2, 8, L * 2 - 4, 2);
      ctx.fillStyle = '#7a8086'; for (let i = -L; i < L; i += 8) ctx.fillRect(i, 4, 1, 4);
      ctx.fillStyle = '#c0c4c8'; for (let i = -L + 3; i < L; i += 9) ctx.fillRect(i, -12, 1, 10);
      ctx.fillStyle = '#c0c4c8'; ctx.fillRect(-L + 2, -13, L * 2 - 4, 1);
      ctx.fillStyle = '#3a8a6a'; ctx.fillRect(-L + 4, -26, L * 2 - 8, 3);
      ctx.fillStyle = '#2a6a50'; for (let i = -L + 4; i < L - 4; i += 10) ctx.fillRect(i, -26, 5, 3);
      ctx.fillStyle = '#8a9096'; ctx.fillRect(-L + 6, -26, 1, 13); ctx.fillRect(L - 8, -26, 1, 13);
      ctx.fillStyle = '#333'; ctx.fillRect(-L - 2, -8, 6, 8);
    }
    if (this.jon) { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-L - 3, -10, 6, 10); ctx.fillStyle = '#444'; ctx.fillRect(-L - 2, -12, 4, 3); }
    if (this.pontoon || this.jon) { ctx.restore(); this.drawPeople(ctx, f); return; }
    // fan cage at back (left in local space)
    const cx = -L + 8, cy = -12, R = 10;
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(40,40,40,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c0c0b0'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const a = this.fan + i * TAU / 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2)); ctx.stroke(); }
    ctx.fillStyle = '#333'; ctx.fillRect(cx - 1, cy - 1, 3, 3); ctx.fillRect(cx - 2, cy + R - 2, 4, 4);
    if (this.war) { ctx.fillStyle = '#333'; ctx.fillRect(L - 14, -16, 10, 3); ctx.fillRect(L - 10, -20, 2, 5); }
    ctx.restore(); this.drawPeople(ctx, f); return;
  }
  drawPeople(ctx, f) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.scale(f, 1);
    if (this.sinking) ctx.rotate(this.dir * f * this.sinkT * 0.12);
    // passengers
    for (const p of this.pass) {
      if (!p.alive) continue;
      const spr = p.type === 'tourist' ? SPR.tourist[0] : p.type === 'fisherman' ? SPR.human[0] : SPR.poacher[0];
      ctx.drawImage(spr.c, Math.round(p.ox - 4), Math.round(p.oy - 12));
      if (p.type === 'poacher') { ctx.fillStyle = '#222'; ctx.fillRect(p.ox + 2, p.oy - 6, 9, 1); if (p.flash > 0) { ctx.fillStyle = '#fff0a0'; ctx.fillRect(p.ox + 11, p.oy - 8, 3, 4); } }
      else if (chance(0.01)) { G.fx.glow(this.x + p.ox * f, this.y + p.oy - 10, 6, '#ffffff', 0.15); }
    }
    ctx.restore();
    if (this.tether) { const P = G.player; ctx.strokeStyle = '#d0d0c0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.x, this.y - 10); ctx.lineTo(P.x, P.y); ctx.stroke(); }
  }
}
class Kayak extends Entity {
  constructor(x, dir) { super(x, 0); this.frames = SPR.kayak; this.dir = dir || (chance(0.5) ? 1 : -1); this.facing = this.dir; this.r = 12; this.hp = 10; this.maxHp = 10; this.mass = 0; this.sizeClass = 2; this.name = 'KAYAKER'; this.type = 'kayak'; this.bleeds = false; this.layer = 1; this.latchable = false; this.paddle = 0; }
  update(dt) { this.tick(dt); const s = World.surface(this.x); this.y = s - 2 + Math.sin(this.t * 2) * 0.5; this.paddle += dt * 4; if (World.floorY(this.x + this.dir * 40) < 10) this.dir *= -1; this.vx = approach(this.vx, this.dir * 28, 30 * dt); this.facing = sign(this.vx || this.dir); this.x += this.vx * dt; if (this.senses(60)) { this.vx = this.facing * 60; if (chance(dt * 1)) SFX.yell(this.pan); } if (chance(dt * 3)) G.fx.ripple(this.x - this.facing * 8, 3, 0.3); if (Math.abs(this.x - G.player.x) > 1800) this.remove = true; }
  takeDamage(dmg, src, opts) {
    // capsize: kayaker into the water, kayak splinters
    G.fx.splash(this.x, 1.5, this.vx); G.fx.splinters(this.x, this.y, 12, 120); SFX.splinter(this.pan); SFX.scream(this.pan); G.shake(5);
    const h = new Human(this.x, this.y + 4, 'tourist'); h.vy = -60; G.add(h);
    G.fx.text(this.x, this.y - 16, 'CAPSIZED!', { color: '#ffd060', scale: 2 });
    const s = this.spr; const g = new Gib(this.x, this.y, s, { sx: 0, sy: 4, sw: s.w, sh: 3 }, 1, this.facing, false, []); g.vr = rand(-3, 3); g.vy = 20; G.add(g);
    this.remove = true; return dmg;
  }
  draw(ctx) { const s = this.spr; drawSpr(ctx, s, this.x, this.y, 0, this.facing, 1, s.w / 2, s.h - 2); ctx.strokeStyle = '#e0d0a0'; ctx.lineWidth = 1; const a = Math.sin(this.paddle) * 0.6; ctx.beginPath(); ctx.moveTo(this.x + Math.cos(a + 0.4) * -8, this.y - 6 + Math.sin(a) * 4); ctx.lineTo(this.x + Math.cos(a + 0.4) * 8, this.y - 6 - Math.sin(a) * 4); ctx.stroke(); }
}
// ---------- projectiles ----------
class Projectile extends Entity {
  constructor(x, y, vx, vy, kind, owner) {
    super(x, y); this.vx = vx; this.vy = vy; this.kind = kind; this.owner = owner; this.type = 'proj'; this.edible = false; this.bleeds = false; this.latchable = false; this.life = kind === 'rock' ? 4 : 1.6; this.r = kind === 'rock' ? 4 : 1; this.hp = 1; this.layer = 2; this.stuck = false; this.name = kind;
  }
  hitTest() { return false; }
  update(dt) {
    this.tick(dt); this.life -= dt; if (this.life <= 0) this.remove = true;
    const P = G.player, under = this.inWater;
    if (this.kind === 'bullet') {
      if (under) { if (!this.wasWater) { this.wasWater = true; G.fx.splash(this.x, 0.4, 0); G.fx.bubbles(this.x, this.y, 3, 2, 40); } this.drag(dt, 5); if (Math.hypot(this.vx, this.vy) < 60) this.remove = true; }
      if (chance(0.5) && under) G.fx.bubbles(this.x, this.y, 1, 1);
    } else if (this.kind === 'rock') { this.vy += 620 * dt; if (under) { if (!this.wasWater) { this.wasWater = true; G.fx.splash(this.x, 1.2, this.vx); } this.drag(dt, 4); } }
    else if (this.kind === 'harpoon') { if (under) this.drag(dt, 1.2); this.vy += 60 * dt; if (chance(0.7)) G.fx.bubbles(this.x, this.y, 1, 1); }
    this.move(dt);
    this.angle = Math.atan2(this.vy, this.vx);
    if (this.y > World.floorY(this.x) - 2) { this.remove = true; if (this.kind === 'rock') G.fx.smoke(this.x, this.y, 3, '#6b5a3a'); }
    // hit player
    if (!P.dead && P.nearestDist(this.x, this.y) < 5 * P.size + this.r) {
      const spd = Math.hypot(this.vx, this.vy);
      if (this.kind === 'bullet') { const dmg = 9 * clamp(spd / 500, 0.2, 1); if (P.hurt(dmg, this.owner, 'bullet') > 0) G.fx.text(P.x, P.y - 18 * P.size, 'SHOT!', { color: '#ffb040' }); else { G.fx.sparks(this.x, this.y, 6); SFX.ricochet(this.pan); } }
      else if (this.kind === 'rock') { P.hurt(22, this.owner, 'crush'); G.shake(8); SFX.thud(this.pan); P.vx += this.vx * 0.3; P.vy += this.vy * 0.2; }
      else if (this.kind === 'harpoon' && this.owner && !this.owner.sinking) { const T = { boat: this.owner, t: 0 }; this.owner.tether = T; P.tether = T; P.hurt(10, this.owner, 'bullet'); G.fx.text(P.x, P.y - 20, 'HARPOONED! BITE TO BREAK FREE', { color: '#ff6040', scale: 1, life: 2 }); G.shake(8); }
      this.remove = true;
    }
  }
  draw(ctx) {
    if (this.kind === 'bullet') { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = '#ffe080'; ctx.fillRect(-3, 0, 4, 1); ctx.fillStyle = 'rgba(255,220,120,0.4)'; ctx.fillRect(-9, 0, 6, 1); ctx.restore(); }
    else if (this.kind === 'rock') drawSpr(ctx, SPR.rockProj, this.x, this.y, this.t * 6, 1.6, 1.6);
    else if (this.kind === 'harpoon') { drawSpr(ctx, SPR.harpoon, this.x, this.y, this.angle, 1, 1); if (this.owner) { ctx.strokeStyle = '#d0d0c0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.owner.x, this.owner.y - 10); ctx.lineTo(this.x, this.y); ctx.stroke(); } }
  }
}
// ---------- SKUNK APE (land boss) ----------
class SkunkApe extends Entity {
  constructor(x) {
    super(x, 0); this.frames = SPR.skunkape; this.size = 1.6; this.r = 16; this.hp = 900; this.maxHp = 900; this.mass = 1200; this.sizeClass = 6; this.name = 'THE SKUNK APE'; this.type = 'skunkape'; this.isBoss = true; this.persistent = true; this.threat = 1; this.gibs = 6; this.layer = 1;
    this.y = World.floorY(x) - 20 * this.size; this.throwCd = 2; this.poundCd = 0; this.walkT = 0; this.rage = false; this.bloodColors = ['#7a1010', '#a51a1a', '#c02020', '#5a0808']; this.roarCd = 0;
  }
  update(dt) {
    this.tick(dt); const P = G.player; const fy = World.floorY(this.x);
    if (fy > 0) { // fell into water: wade back
      this.vy = approach(this.vy, 40, 100 * dt); const landX = World.findX(this.x, x => World.floorY(x) < -2, 1200, 30); const dir = landX === null ? 1 : sign(landX - this.x); this.vx = approach(this.vx, dir * 40, 80 * dt); this.move(dt); if (this.y > fy - 20 * this.size) this.y = fy - 20 * this.size; this.facing = dir; return;
    }
    this.y = fy - 20 * this.size; this.vy = 0;
    if (!this.rage && this.hp < this.maxHp * 0.35) { this.rage = true; SFX.roar(3, this.pan); G.fx.text(this.x, this.y - 40, 'ENRAGED!', { color: '#ff4020', scale: 2 }); G.shake(10); }
    const spd = this.rage ? 110 : 70; const dP = this.distTo(P);
    this.throwCd -= dt; this.poundCd -= dt; this.roarCd -= dt;
    if (this.roarCd <= 0 && dP < 400) { this.roarCd = rand(6, 10); SFX.roar(2.5, this.pan); }
    const dir = sign(P.x - this.x); this.facing = dir;
    const canWalk = World.floorY(this.x + dir * 16) < -2;
    if (P.dead) { this.vx = 0; }
    else if (dP < 34 + 5 * P.size && this.poundCd <= 0) {
      this.poundCd = 1.8; P.hurt(28, this, 'crush'); P.vx += dir * 300; P.vy -= 150; G.shake(14); SFX.thud(this.pan); SFX.shock(this.pan); G.fx.shock(this.x, this.y + 20, 60, '#c0a080'); G.fx.smoke(this.x + dir * 20, this.y + 20, 6, '#6b5a3a');
    } else if (P.y > 10 && dP < 420 && this.throwCd <= 0) {
      this.throwCd = this.rage ? 1.6 : 2.6; const tx = P.x + P.vx * 0.5, ty = P.y;
      const dx = tx - this.x, T = clamp(Math.abs(dx) / 260, 0.6, 1.4); const vx = dx / T, vy = (ty - (this.y - 20)) / T - 0.5 * 620 * T;
      G.add(new Projectile(this.x + dir * 12, this.y - 20, vx, vy, 'rock', this)); this.throwAnim = 0.3;
      G.fx.text(this.x, this.y - 44, 'HRRAAGH!', { color: '#ff8060' });
    } else if (canWalk && dP > 30) { this.vx = approach(this.vx, dir * spd, 400 * dt); this.walkT += dt * 8; }
    else this.vx = approach(this.vx, 0, 400 * dt);
    if (this.throwAnim > 0) this.throwAnim -= dt;
    this.x += this.vx * dt;
  }
  draw(ctx) {
    const s = this.spr, img = this.flash > 0 ? spriteWhite(s) : s; const bob = Math.abs(Math.sin(this.walkT)) * -2 * (Math.abs(this.vx) > 5 ? 1 : 0);
    drawSpr(ctx, img, this.x, this.y + bob, this.throwAnim > 0 ? -0.2 * this.facing : 0, this.size * this.facing, this.size);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,30,0.6)'; const ex = this.x + this.facing * 4 * this.size, ey = this.y + bob - 18 * this.size; ctx.fillRect(ex - 2, ey, 2, 1); ctx.fillRect(ex + 3, ey, 2, 1); ctx.globalCompositeOperation = 'source-over';
  }
  explode(p) { super.explode(p); G.fx.flesh(this.x, this.y, 40, 160); dropMeat(this.x, this.y, 8, 30, this.bloodColors); }
}
// ---------- spawn helpers ----------
const Spawn = {
  school(x, y, kind) { const d = FISH[kind]; const n = randi(d.school[0], d.school[1]); const leader = new Fish(x, y, kind); G.add(leader); for (let i = 1; i < n; i++) G.add(new Fish(x + rand(-30, 30), y + rand(-20, 20), kind, leader)); return leader; },
  flock(x, dir, kind, n) { for (let i = 0; i < n; i++) { const b = new Bird(x - dir * i * 26 + rand(-8, 8), -rand(80, 170) + i * 4, kind, 'fly', dir); b.vx = dir * BIRDS[kind].speed; G.add(b); } },
  heron(x) { const b = new Bird(x, 0, 'heron', 'wade'); G.add(b); return b; },
  duck(x) { const b = new Bird(x, 0, 'duck', 'float'); G.add(b); return b; },
  gator(x, y, size, boss) { const g = new Gator(x, y, size, boss); G.add(g); return g; },
  boat(x, kind, dir) { const b = new Boat(x, kind, dir); G.add(b); return b; },
};
