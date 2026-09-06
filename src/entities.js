'use strict';
SPR.meat = mkSprite(['.rrR.', 'rRRrr', 'rrrbr', '.rrr.'], { r: '#9a1a1a', R: '#c84040', b: '#efe6d6' });
// behaviour tables, filled from the species catalogue
const FISH = {}, BIRDS = {}, LAND = {}, BOTTOM = {};
for (const id in SPECIES) { const sp = SPECIES[id]; if (sp.cat === 'fish') FISH[id] = sp; else if (sp.cat === 'bird') BIRDS[id] = sp; else if (sp.cat === 'land' || sp.cat === 'human') LAND[id] = sp; else if (sp.cat === 'bottom') BOTTOM[id] = sp; }
LAND.survivor = SPECIES.tourist;
for (const id in LAND) if (LAND[id].cat === 'human') LAND[id].human = true;
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
    this.rig = null; this.species = null; this.anim = { phase: rand(TAU), speed: 0, mode: 'stand' }; this.worldLen = 0; this.groundOff = 0;
    this.missing = null; this.dismembered = 0; this.beheaded = false;
  }
  // adopt a species from the catalogue: real size, weight-based food value, rigged art
  useSpecies(id, variant = 0) {
    const sp = SPECIES[id]; if (!sp) return;
    this.species = sp; this.name = sp.name; this.rig = rigOf(sp, variant); this.kind = id;
    this.worldLen = gsOf(sp); this.size = 1;
    this.r = this.worldLen * (sp.cat === 'bird' ? 0.18 : sp.cat === 'human' ? 0.14 : 0.2);
    this.sizeClass = sizeClassOf(sp.ft); this.mass = massOf(sp.lb);
    this.hp = this.maxHp = sp.hp || (sp.cat === 'human' ? 30 : sp.cat === 'bird' ? Math.round(4 + sp.lb * 3) : Math.round(4 + Math.pow(sp.lb, 0.75) * 3));
    this.armor = sp.armor || 0; this.gibs = sp.gibs || clamp(Math.round(2 + Math.log2(1 + sp.lb)), 2, 6);
    this.groundOff = (this.rig.foot || 0) * this.rig.scale / RIG_PX;
    if (sp.cat === 'bird') this.feathers = sp.body;
    if (sp.mammal || sp.cat === 'land' || sp.cat === 'human') this.bloodColors = BLOOD_COLORS;
  }
  get drawScale() { return this.rig ? this.size * this.rig.scale / RIG_PX : this.size; }
  get inWater() { return this.y > World.surface(this.x); }
  get spr() { if (this.rig) return this.rig.main; return this.frames ? this.frames[this.frame % this.frames.length] : null; }
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
    const surf = World.surface(this.x), fy = World.floorY(this.x);
    // A column with no real water in it is not somewhere a swimmer can be. Back
    // out to the last wet spot instead of trying to place the body somewhere in
    // the mud or the air, neither of which is a position a fish should hold.
    if (fy < surf + 6) {
      if (this._wetX !== undefined) this.x = this._wetX;
      this.vx *= -0.5;
      const f2 = World.floorY(this.x), s2 = World.surface(this.x);
      this.y = clamp(this.y, s2 + Math.min(margin, (f2 - s2) * 0.3), f2 - Math.min(margin, (f2 - s2) * 0.3));
      return;
    }
    this._wetX = this.x;
    const s = surf + margin, bed = fy - margin;
    if (bed <= s) { this.y = (surf + fy) * 0.5; if (this.vy > 0) this.vy = 0; return; }
    if (this.y > bed) { this.y = bed; if (this.vy > 0) this.vy *= -0.3; }
    if (this.y < s) { this.y = s; if (this.vy < 0) this.vy *= -0.3; }
  }
  animate(dt, rate) { this.animT += dt * rate; this.frame = Math.floor(this.animT); this.anim.phase += dt * rate * 1.6; }
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
    this.squash = 1;
    if (this.bleeds) {
      const gm = (src === G.player ? G.player.st.goreMul : 1) * (G.settings.gore ? 1.6 : 0.5);
      G.fx.blood(this.x, this.y, clamp(dmg * 1.4, 6, 48) * gm, opts.dx || 0, opts.dy || 0, 80 + Math.min(dmg, 70), this.bloodColors);
      G.fx.cloud(this.x, this.y, (10 + Math.min(dmg, 40) * 0.5) * Math.sqrt(this.size), this.bloodColors[0]);
      Gore.slick(this.x, this.y, 5 + Math.min(14, dmg * 0.4));
      if (src === G.player && !this.dead) Gore.maybeTear(this, dmg, opts.dx || 0, opts.dy || 0);
    } else G.fx.sparks(this.x, this.y, 8, opts.dx, opts.dy);
    if (this.hp <= 0) this.die(src);
    return dmg;
  }
  die(killer) {
    if (this.dead) return; this.dead = true; this.remove = true;
    if (this.human && killer === G.player) for (const o of G.ents) if (o !== this && o.human && !o.dead && Math.abs(o.x - this.x) < 300) { o.panicked = true; o.state = 'flee'; o.stateT = 6; o.watching = false; }
    G.onEntityKilled(this, killer === G.player, this.gulped);
  }
  explode(power = 1) {
    const s = this.spr, big = this.mass >= 60;
    if (this.bleeds) Gore.burst(this, power);
    if (this.rig && this.rig.world) {
      const pls = this.rig.world(this.x, this.y, this.facing, this.angle, this.anim, this.size * this.rig.scale), n = Math.max(1, pls.length);
      for (const pl of pls) {
        if (this.missing && this.missing.has(pl.id)) continue;
        const g = new Gib(pl.wx, pl.wy, pl.p, { sx: 0, sy: 0, sw: pl.p.w, sh: pl.p.h }, pl.k, pl.facing, this.bleeds, this.bloodColors);
        g.rot = pl.wa; g.mass = this.edible && this.bleeds ? this.mass * 0.3 / n : 0; g.edible = g.mass > 0;
        const a = rand(TAU), sp = rand(40, 130) * Math.sqrt(power); g.vx = this.vx * 0.3 + Math.cos(a) * sp; g.vy = this.vy * 0.3 + Math.sin(a) * sp - 20; g.vr = rand(-8, 8);
        G.add(g);
      }
    } else if (s) {
      const pieces = sliceSprite(s, clamp(this.gibs, 2, 6)), ds = this.drawScale;
      for (const p of pieces) {
        const g = new Gib(this.x + (p.sx + p.sw / 2 - s.w / 2) * ds * this.facing, this.y + (p.sy + p.sh / 2 - s.h / 2) * ds, s, p, ds, this.facing, this.bleeds, this.bloodColors);
        g.mass = this.edible && this.bleeds ? this.mass * 0.25 / pieces.length : 0; g.edible = g.mass > 0;
        const a = rand(TAU), sp = rand(40, 130) * Math.sqrt(power);
        g.vx = this.vx * 0.3 + Math.cos(a) * sp; g.vy = this.vy * 0.3 + Math.sin(a) * sp - 20; g.vr = rand(-8, 8);
        G.add(g);
      }
    }
    if (this.feathers) G.fx.feathers(this.x, this.y, 18, this.feathers);
    SFX.gib(this.pan);
  }
  tick(dt) {
    this.t += dt; if (this.flash > 0) this.flash -= dt;
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 5);
    if (this.missing && this.missing.size && this.bleeds && chance(dt * 6)) { const pls = this.rig && this.rig.world ? this.rig.world(this.x, this.y, this.facing, this.angle, this.anim, this.size * this.rig.scale) : []; const pl = pls.find(q => this.missing.has(q.id)); if (pl) G.fx.blood(pl.wx, pl.wy, 2, 0, 0.4, 30, this.bloodColors); }
    if (this.awareT > 0) this.awareT -= dt; else this.aware = false;
    if (this.stun > 0) this.stun -= dt;
    this.slow = 0;
    if (this.poison > 0) { this.poison -= dt; this.slow = 0.6; this.hp -= this.poisonDmg * dt; if (chance(dt * 8)) G.fx.blood(this.x, this.y, 1, 0, 0, 20, ['#40c040', '#208030', '#80ff80']); if (this.hp <= 0) this.die(G.player); }
    if (this.bleedT > 0) { this.bleedT -= dt; this.hp -= this.bleedDmg * dt; if (chance(dt * 10)) G.fx.blood(this.x, this.y, 1, 0, 0, 15, this.bloodColors); if (this.hp <= 0) this.die(G.player); }
  }
  update(dt) { this.tick(dt); }
  draw(ctx) {
    if (this.rig) {
      const sq = this.squash > 0 ? this.squash : 0;
      if (sq > 0) { ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1 + sq * 0.25, 1 - sq * 0.25); ctx.translate(-this.x, -this.y); }
      this.rig.draw(ctx, this.x, this.y, this.facing, this.angle, this.anim, { scale: this.size * this.rig.scale, white: this.flash > 0, missing: this.missing });
      if (sq > 0) ctx.restore();
      if (this.poison > 0) { ctx.globalAlpha = 0.3; ctx.fillStyle = '#40ff60'; ctx.fillRect(this.x - this.r, this.y - this.r * 0.6, this.r * 2, this.r * 1.2); ctx.globalAlpha = 1; }
      return;
    }
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
    if (this.inWater) { this.drag(dt, 2.5); this.vy += (this.buoyant ? -26 : 30) * dt; this.vr *= 0.97; if (this.wasAir) { this.wasAir = false; G.fx.splash(this.x, 0.35, this.vx); Water.splash(this.x, 18, 10); this.vx *= 0.4; this.vy *= 0.4; if (this.bleedFx > 0) Gore.slick(this.x, this.y, 7); } if (this.buoyant) { const s = World.surface(this.x); if (this.y < s + 2) { this.y = s + 2; this.vy = 0; this.vx *= 0.9; } } }
    else { this.vy += 600 * dt; this.wasAir = true; }
    this.move(dt); this.rot += this.vr * dt;
    const fy = World.floorY(this.x), rr = this.r * this.size * 0.5;
    if (this.y > fy - rr) { if (this.vy > 25) { G.fx.silt(this.x, fy, 3, 20); if (this.bleedFx > 0 && chance(0.5)) Gore.slick(this.x, this.y, 6); } this.y = fy - rr; this.vy = 0; this.vx *= 0.8; this.vr *= 0.8; }
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
class Fish extends Entity {
  constructor(x, y, kind, leader) {
    super(x, y); const d = FISH[kind] || SPECIES[kind]; this.useSpecies(kind);
    Object.assign(this, { speed: d.speed, band: d.band || [5, 100], def: d });
    this.type = 'fish'; this.leader = leader || null; this.tx = x; this.ty = y; this.retarget = 0; this.state = 'wander'; this.stateT = 0;
    this.threat = d.pred ? 1 : 0; this.facing = chance(0.5) ? 1 : -1; this.attackCd = 0; this.layer = d.layer || 0;
    this.anim.mode = 'swim';
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
        const reach = this.r * this.size + 6 * P.vis;
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
    this.move(dt); this.clampWater(4 + this.r * this.size * 0.5); this.faceVel(0.5);
    const spd = Math.hypot(this.vx, this.vy); this.anim.phase += dt * (3 + spd / 14); this.anim.speed = clamp(spd / (this.speed || 60), 0, 1.2);
  }
}
class Turtle extends Entity {
  constructor(x, y, kind = 'turtle') {
    super(x, y); this.useSpecies(kind); this.type = 'turtle'; this.snap = this.species.snap || 6;
    this.tx = x; this.ty = y; this.retarget = 0; this.breath = rand(5, 12); this.snapCd = 0; this.anim.mode = 'swim';
  }
  update(dt) {
    this.tick(dt); this.retarget -= dt; this.breath -= dt;
    if (this.retarget <= 0) { this.retarget = rand(2, 5); this.tx = this.x + rand(-90, 90); this.ty = this.breath < 0 ? 6 : World.floorY(this.tx) - rand(8, 30); if (this.breath < -2) this.breath = rand(8, 16); }
    this.swimToward(this.tx, this.ty, 22 * (1 - this.slow), 1.5, dt);
    const P = G.player; this.snapCd -= dt;
    if (!P.dead && P.size < this.sizeClass * 2.2 && P.nearestDist(this.x, this.y) < this.r + 8 * P.vis && this.snapCd <= 0) { P.hurt(this.snap, this, 'bite'); this.snapCd = 2; SFX.chomp(0.8, this.pan); }
    this.move(dt); this.clampWater(this.r); this.faceVel(0.3);
    const spd = Math.hypot(this.vx, this.vy); this.anim.phase += dt * (1.5 + spd / 10); this.anim.speed = clamp(spd / 30, 0, 1);
  }
  takeDamage(dmg, src, opts) {
    if (this.armor > 0 && (dmg >= this.armor || opts.pierce)) { this.armor = 0; G.fx.splinters(this.x, this.y, 10, 90); G.fx.text(this.x, this.y - 12, 'SHELL CRACKED!', { color: '#e0d0a0' }); SFX.splinter(this.pan); }
    return super.takeDamage(dmg, src, opts);
  }
}
class Frog extends Entity {
  constructor(x, kind = 'frog') {
    super(x, 0); this.useSpecies(kind); this.type = 'frog';
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
    this.anim.jump = this.onSurface ? 0 : 1; this.anim.phase += dt * 3;
  }
}
// ---------- birds ----------
class Bird extends Entity {
  get diving() { return false; }
  constructor(x, y, kind, mode, dir) {
    super(x, y); const d = BIRDS[kind]; this.useSpecies(kind); this.def = d;
    this.type = 'bird'; this.mode = mode; this.dir = dir || (chance(0.5) ? 1 : -1); this.facing = this.dir; this.flyH = -rand(70, 170); this.dipT = rand(4, 12); this.wingT = rand(10); this.peck = 0; this.drownT = 0;
    if (mode === 'wade') { this.y = World.floorY(x) - this.groundOff; }
    if (mode === 'float') { this.y = World.surface(x) - this.r * 0.4; }
  }
  update(dt) {
    this.tick(dt); const P = G.player, d = this.def;
    switch (this.mode) {
      case 'wade': {
        this.y = World.floorY(this.x) - this.groundOff; this.peck -= dt; this.anim.phase += dt * 1.2;
        if (this.peck <= 0) { this.peck = rand(1.5, 4); this.pecking = 0.5; }
        if (this.pecking > 0) this.pecking -= dt;
        // a heron will spear a hatchling that swims too close
        if (d.hunts && !P.dead && P.size < d.hunts * 1.6 && P.nearestDist(this.x, this.y) < this.r * 1.8 && this.peck > 0.8) {
          this.peck = 0.6; this.pecking = 0.5; if (P.hurt(6 + d.lb, this, 'bite') > 0) { SFX.chomp(0.6, this.pan); G.fx.blood(P.x, P.y, 6, 0, 1, 60); }
          break;
        }
        if (this.senses(d.flee) && !(d.hunts && P.size < d.hunts * 1.2)) this.takeoff(P);
        break;
      }
      case 'float': {
        this.y = World.surface(this.x) - this.r * 0.4; this.vx = approach(this.vx, this.dir * 8, 20 * dt); this.x += this.vx * dt; this.anim.phase += dt * 1.5;
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
        this.wingT += dt * (this.escaping > 0 ? 14 : 9); this.frame = Math.sin(this.wingT) > 0 ? 0 : 1; this.anim.phase = this.wingT;
        if (Math.abs(this.x - G.cam.x) > 1500) this.remove = true;
        break;
      }
      case 'drown': {
        this.drownT += dt; const s = World.surface(this.x);
        this.vy = approach(this.vy, -25, 100 * dt); this.vx *= 0.97; this.move(dt);
        this.wingT += dt * 12; this.frame = Math.sin(this.wingT) > 0 ? 0 : 1; this.angle = 0; this.anim.phase = this.wingT;
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
  draw(ctx) {
    const mode = (this.mode === 'fly') ? 'fly' : (this.mode === 'drown' || this.mode === 'float') ? 'swim' : 'stand';
    this.anim.mode = mode; this.anim.peck = this.pecking > 0 ? 1 : 0;
    this.rig.draw(ctx, this.x, this.y, this.facing, mode === 'fly' ? this.angle : 0, this.anim, { scale: this.size * this.rig.scale, white: this.flash > 0 });
  }
}
// ---------- land animals ----------
class LandAnimal extends Entity {
  constructor(x, kind) {
    super(x, 0); const d = LAND[kind]; this.useSpecies(kind === 'survivor' ? 'tourist' : kind, d.human ? randi(0, 7) : 0); this.def = d; this.kind = kind;
    this.human = !!d.human; this.prey = null; this.huntCd = rand(2, 8);
    this.type = 'land'; this.facing = chance(0.5) ? 1 : -1; this.state = 'idle'; this.stateT = rand(1, 3); this.swimT = 0; this.layer = 1; this.rodT = 0; this.chargeCd = 0;
    this.y = World.floorY(x) - this.groundOff; this.grazeT = 0; this.grazeK = 0;
  }
  landAt(x) { return World.floorY(x) < -2; }
  update(dt) {
    this.tick(dt); const P = G.player, d = this.def;
    const fy = World.floorY(this.x);
    if (fy > 0 || this.y > World.surface(this.x) + 4) { this.updateSwim(dt, P, d); return; }
    this.y = fy - this.groundOff; this.vy = 0;
    if (this.watching) { this.vx = 0; this.anim.phase += dt * 0.8; this.facing = sign(P.x - this.x) || this.facing; return; }
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
    // armed people stand their ground and shoot until you get too close
    if (this.armed === undefined) { const v = this.rig && this.rig.spec ? this.rig.spec.prop : null; this.armed = v === 'rifle' || v === 'shotgun' || v === 'harpoon' ? v : null; this.shootCd = rand(0.6, 2); }
    if (this.armed && !P.dead && !this.panicked) {
      const seesP = dP < 420 && P.y > -200 && Math.abs(P.y - this.y) < 260;
      if (seesP && dP > 76) {
        this.state = 'shoot'; this.stateT = 1.2; this.facing = sign(P.x - this.x) || this.facing;
        this.shootCd -= dt;
        if (this.shootCd <= 0) {
          this.shootCd = this.armed === 'shotgun' ? rand(1.5, 2.4) : this.armed === 'harpoon' ? rand(2.6, 4) : rand(0.9, 1.6);
          const hx = this.x + this.facing * this.r * 0.8, hy = this.y - this.worldLen * 0.55;
          // lead the shot at where the croc is going
          const tx = P.x + P.vx * 0.35 + rand(-10, 10), ty = P.y + P.vy * 0.3 + rand(-8, 8);
          const a = Math.atan2(ty - hy, tx - hx);
          if (this.armed === 'shotgun') { for (let k = -1; k <= 1; k++) G.add(new Projectile(hx, hy, Math.cos(a + k * 0.08) * 460, Math.sin(a + k * 0.08) * 460, 'bullet', this)); }
          else if (this.armed === 'harpoon') G.add(new Projectile(hx, hy, Math.cos(a) * 420, Math.sin(a) * 420, 'harpoon', this));
          else G.add(new Projectile(hx, hy, Math.cos(a) * 520, Math.sin(a) * 520, 'bullet', this));
          this.muzzle = 0.07; SFX.gunshot(this.pan); G.fx.smoke(hx + Math.cos(a) * 8, hy + Math.sin(a) * 8, 1, '#c0c0c0');
        }
        this.vx = approach(this.vx, 0, 400 * dt);
        this.x += this.vx * dt; if (this.muzzle > 0) this.muzzle -= dt;
        return;
      }
      if (seesP && dP <= 76) { this.panicked = true; SFX.scream(this.pan); }   // too close: break and run
    }
    if (this.muzzle > 0) this.muzzle -= dt;
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
        if (P.nearestDist(this.x, this.y) < 14 + 5 * P.vis) { P.hurt(d.charge, this, 'crush'); P.vx += dir * 260; P.vy -= 120; this.state = 'idle'; this.stateT = 1.5; this.chargeCd = 3; SFX.thud(this.pan); G.shake(6); }
        if (chance(dt * 10)) G.fx.smoke(this.x - dir * 8, this.y + 4, 1, '#6b5a3a');
        break;
      }
    }
    this.x += this.vx * dt;
    if (Math.abs(this.vx) > 10) { this.grazeT += dt * Math.abs(this.vx) * 0.1; Foliage.disturb(this.x, this.y, this.vx, this.r); if (Mud.softness(this.x) > 0.3 && chance(dt * 3)) G.fx.print(this.x, World.floorY(this.x) - 1, 3, this.facing); }
    if (d.human && this.kind === 'fisherman') this.rodT += dt;
  }
  updateSwim(dt, P, d) {
    this.swimT += dt; this.state = 'swim';
    const s = World.surface(this.x); this.vy = approach(this.vy, this.y > s - 2 ? -30 : 20, 150 * dt);
    const landX = World.findX(this.x, x => World.floorY(x) < -2, 900, 30);
    const dir = landX === null ? this.facing : sign(landX - this.x); this.facing = dir;
    this.vx = approach(this.vx, dir * 38, 60 * dt);
    this.move(dt); if (this.y > s - this.r * 0.5) this.y = Math.min(this.y, s - 1);
    if (chance(dt * 4)) G.fx.splash(this.x, 0.2, 0);
    if (d.human && chance(dt * 0.5)) SFX.scream(this.pan);
    if (this.swimT > 14) { this.hp -= 4 * dt; if (chance(dt * 3)) G.fx.bubbles(this.x, this.y + 4, 2); if (this.hp <= 0) { this.die(null); } }
    if (World.floorY(this.x) < -2 && this.y < 0) { this.state = 'flee'; this.stateT = 2; this.swimT = 0; }
  }
  draw(ctx) {
    const moving = Math.abs(this.vx) > 10, sp = clamp(Math.abs(this.vx) / (this.def.speed || 100), 0, 1.3);
    this.anim.speed = this.state === 'swim' ? 0.5 : sp;
    if (moving || this.state === 'swim') this.anim.phase += 0.016 * (6 + sp * 10);
    this.grazeK = lerp(this.grazeK, this.state === 'idle' && !this.human ? 1 : 0, 0.05); this.anim.graze = this.grazeK;
    this.anim.panic = this.state === 'flee' || this.state === 'swim' ? 1 : 0;
    this.anim.aim = this.state === 'shoot' ? 1 : 0;
    this.anim.cast = this.kind === 'fisherman' && this.state === 'idle' ? 1 : 0;
    const ang = this.state === 'swim' ? (this.human ? -Math.PI / 2 + 0.3 : 0.25) : 0;
    this.rig.draw(ctx, this.x, this.y, this.facing, ang, this.anim, { scale: this.size * this.rig.scale, white: this.flash > 0 });
    if (this.muzzle > 0) { ctx.fillStyle = '#fff0a0'; const mx = this.x + this.facing * this.r * 1.5, my = this.y - this.worldLen * 0.55; ctx.fillRect(mx - 2, my - 2, 5, 4); ctx.fillStyle = '#ffd040'; ctx.fillRect(mx + this.facing * 3, my - 1, 3, 2); }
    if (this.kind === 'fisherman' && this.state !== 'swim' && this.state !== 'flee') {
      const hx = this.x + this.facing * this.r * 0.9, hy = this.y - this.groundOff * 0.72;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx + this.facing * this.r * 1.6, hy - this.r * 0.8); ctx.lineTo(hx + this.facing * this.r * 2.6, World.surface(this.x) + 4 + Math.sin(this.rodT) * 1); ctx.stroke();
    }
  }
}
// ---------- snakes ----------
class Snake extends Entity {
  constructor(x, y, kind, mul = 1) {
    super(x, y); this.kind = kind; this.type = 'snake';
    const sp = SPECIES[kind] || SPECIES.moccasin; this.species = sp; this.name = sp.name;
    const P2 = snakeParts(sp); this.head = P2.head; this.segs = P2.segs; this.n = sp.n; this.D = P2.D;
    // segment spacing so the whole chain spans the game length (times the boss multiplier)
    const worldLen = gsOf(sp) * mul; this.sp = worldLen / (this.n + 1); this.k = this.sp * 1.7 / this.D; this.size = 1; this.mul = mul;
    this.hp = Math.round(sp.hp * mul * mul); this.mass = massOf(sp.lb * mul * mul); this.sizeClass = sizeClassOf(sp.ft) * mul; this.speed = sp.speed;
    this.venom = sp.venom || 0; this.constrict = (sp.constrict || 0) * mul; this.r = this.sp * 0.8; this.gibs = 0; this.threat = sp.constrict ? 1 : 0;
    if (kind === 'python' && mul > 1.3) this.name = 'MOTHER PYTHON';
    this.maxHp = this.hp; this.chain = []; for (let i = 0; i <= this.n; i++) this.chain.push({ x: x - i * this.sp, y, a: 0 });
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
      if (P.nearestDist(this.x, this.y) < 8 + 5 * P.vis && this.strikeCd > 1.6) {
        if (this.venom) { if (P.hurt(4, this, 'bite') > 0) { P.envenom(this.venom, 4); G.fx.text(P.x, P.y - 20, 'VENOM!', { color: '#60ff60' }); } this.strikeCd = 2.5; this.vx *= -0.5; }
        else if (this.constrict && !P.st.knockImmune && P.size < this.sizeClass * 1.1) { this.grabbing = true; this.grabT = 0; P.grabbed = this; G.fx.text(P.x, P.y - 22, 'CONSTRICTED!', { color: '#ff8040', scale: 2 }); G.shake(8); SFX.growl(this.pan); }
        else { P.hurt(4 + 4 * this.mul, this, 'bite'); this.strikeCd = 2.5; this.vx *= -0.5; }
      }
      if (this.strikeCd < 1.4) this.state = 'hunt';
    }
    // environment
    const surfaceSwimmer = this.kind === 'moccasin' || this.kind === 'ratsnake';
    if (land && !surfaceSwimmer) { const fy = World.floorY(this.x); this.y = fy - this.r; this.vy = 0; }
    else if (surfaceSwimmer) this.y = lerp(this.y, surf + this.r * 0.6, 0.1);
    this.move(dt);
    if (!land) this.clampWater(this.r);
    if (!surfaceSwimmer && this.y < surf && !land) { this.vy += 400 * dt; }
    // chain follow with sine slither
    this.phase += dt * (3 + Math.hypot(this.vx, this.vy) * 0.05);
    const c = this.chain; c[0].x = this.x; c[0].y = this.y; if (Math.hypot(this.vx, this.vy) > 3) c[0].a = Math.atan2(this.vy, this.vx);
    for (let i = 1; i < c.length; i++) {
      const p = c[i - 1], s = c[i], sp2 = this.sp;
      let a = Math.atan2(s.y - p.y, s.x - p.x); const back = p.a + Math.PI; let d = angleDiff(back, a); d = clamp(d, -0.7, 0.7);
      const wig = Math.sin(this.phase - i * 0.9) * 0.35; const aa = back + d * 0.8 + wig;
      s.x = p.x + Math.cos(aa) * sp2; s.y = p.y + Math.sin(aa) * sp2; s.a = aa + Math.PI;
    }
    this.facing = Math.cos(c[0].a) >= 0 ? 1 : -1;
  }
  release() { this.grabbing = false; if (G.player.grabbed === this) G.player.grabbed = null; this.strikeCd = 3; this.vx = -this.facing * 120; this.vy = -40; this.stun = 0.8; }
  die(k) { if (this.grabbing) this.release(); super.die(k); }
  explode(power = 1) {
    G.fx.gore(this.x, this.y, 80 * Math.sqrt(power), 0, 0, this.constrict > 0);
    for (let i = 0; i < this.chain.length; i++) {
      const c = this.chain[i], s = i === 0 ? this.head : this.segs[i % 2];
      const g = new Gib(c.x, c.y, s, { sx: 0, sy: 0, sw: s.w, sh: s.h }, this.k, 1, true, this.bloodColors);
      g.rot = c.a; g.mass = this.mass * 0.3 / this.chain.length; g.edible = true; const a = rand(TAU), spd = rand(30, 90); g.vx = Math.cos(a) * spd; g.vy = Math.sin(a) * spd - 20; g.vr = rand(-6, 6);
      G.add(g);
    }
    SFX.gib(this.pan);
  }
  draw(ctx) {
    const c = this.chain, white = this.flash > 0;
    const k = this.k, flip = Math.cos(c[0].a) >= 0 ? 1 : -1;
    for (let i = c.length - 1; i >= 1; i--) { const s = this.segs[i % 2]; const taper = i > c.length - 6 ? 1 - (i - (c.length - 6)) * 0.13 : 1; R.drawImg(ctx, white ? spriteWhite(s).c : s.c, s, c[i].x, c[i].y, c[i].a, k * taper, k * flip * taper); }
    R.drawImg(ctx, white ? spriteWhite(this.head).c : this.head.c, this.head, c[0].x, c[0].y, c[0].a, k, k * flip);
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
  get vis() { return Math.pow(this.size, 0.58); }
  hitTest(x, y, r) { const rr = r + this.r * this.vis; for (const n of this.chain.nodes) if (dist(x, y, n.x, n.y) < rr) return true; return false; }
  nearestDist(x, y) { let m = 1e9; for (const n of this.chain.nodes) m = Math.min(m, dist(x, y, n.x, n.y)); return m; }
  get snout() { const h = this.chain.nodes[0], L = 17 * this.vis; return [h.x + Math.cos(h.a) * L, h.y + Math.sin(h.a) * L]; }
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
        if (this.biteCd <= 0 && P.nearestDist(sx, sy) < 8 + 5 * P.vis + 4 * this.vis) {
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
        this.x = lerp(this.x, P.x - Math.cos(this.chain.nodes[0].a) * 14 * this.vis, 0.3); this.y = lerp(this.y, P.y, 0.3); this.vx *= 0.9; this.vy *= 0.9;
        P.hurt(9 * this.size * dt, this, 'crush');
        if (chance(dt * 30)) { G.fx.bubbles(P.x, P.y, 2, 14 * P.vis); G.fx.blood(P.x, P.y, 2, 0, 0, 90); }
        if (this.grabT > 2.2 || P.grabbed !== this || P.dead) this.release();
        break;
      }
      case 'flee': { const dx = this.x - P.x, dy = this.y - P.y, d = Math.hypot(dx, dy) || 1; this.swimToward(this.x + dx / d * 300, clamp(this.y + dy / d * 60, 10, World.floorY(this.x) - 20), maxSp * 1.1, 3, dt); if (chance(dt * 4)) G.fx.blood(this.x, this.y, 1, 0, 0, 10, this.bloodColors); break; }
    }
    if (this.state !== 'grab') { this.roll = lerp(this.roll, Math.round(this.roll / TAU) * TAU, 0.2); }
    // physics
    const under = this.inWater;
    if (under) { this.drag(dt, 1.1); if (this.wasAir) { this.wasAir = false; G.fx.splash(this.x, Math.sqrt(this.vis), this.vx); } }
    else { this.vy += 700 * dt; this.wasAir = true; }
    this.move(dt);
    const fy = World.floorY(this.x); if (this.y > fy - 5 * this.vis) { this.y = fy - 5 * this.vis; if (this.vy > 0) this.vy *= -0.2; }
    if (this.y < World.surface(this.x) - 300) this.vy += 200 * dt;
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > 12) this.angle = angleLerp(this.angle, Math.atan2(this.vy, this.vx), 1 - Math.exp(-5 * dt));
    this.facing = Math.cos(this.angle) >= 0 ? 1 : -1;
    this.chain.solve(this.x, this.y, this.angle, this.vis, dt, clamp(spd / maxSp, 0, 1.2));
    this.legPhase += dt * (2 + spd * 0.05);
    if (this.biteT > 0) { this.biteT -= dt; this.jaw = this.biteT > 0.08 ? (0.16 - this.biteT) / 0.08 : this.biteT / 0.08; } else this.jaw = this.state === 'hunt' && dP < 120 ? 0.3 : 0;
    if (under && spd > 80 && chance(dt * 4)) G.fx.bubbles(this.x, this.y, 1, 4 * this.vis);
  }
  release() { this.grabbing = false; this.rollT = 0; if (G.player.grabbed === this) G.player.grabbed = null; this.biteCd = 2.2; const dx = this.x - G.player.x; this.vx = sign(dx) * 140; this.stun = 0.6; }
  die(k) { if (this.grabbing) this.release(); super.die(k); }
  explode(power = 1) {
    G.fx.gore(this.x, this.y, 110 * Math.sqrt(power), 0, 0, true);
    const n = this.chain.nodes;
    for (let i = 0; i < n.length; i++) {
      const part = i === 0 ? this.parts.head : i <= 5 ? this.parts.body[i - 1] : this.parts.tail[i - 6];
      const g = new Gib(n[i].x, n[i].y, part, { sx: 0, sy: 0, sw: part.w, sh: part.h }, this.vis / CROC_PX, 1, true, this.bloodColors);
      g.rot = n[i].a; g.mass = this.mass * 0.3 / n.length; g.edible = true; const a = rand(TAU), sp = rand(30, 110) * Math.sqrt(power); g.vx = Math.cos(a) * sp; g.vy = Math.sin(a) * sp - 30; g.vr = rand(-6, 6);
      G.add(g);
    }
    G.fx.flesh(this.x, this.y, 20, 120);
    SFX.gib(this.pan); SFX.roar(this.size, this.pan);
  }
  draw(ctx) { drawCroc(ctx, this.chain, this.parts, this.vis, { jaw: this.jaw, legPhase: this.legPhase, flipY: this.facing, flash: this.flash, roll: this.roll }); }
}
// ---------- humans in the water ----------
class Human extends Entity {
  constructor(x, y, kind = 'swimmer') {
    super(x, y); this.useSpecies(SPECIES[kind] ? kind : 'tourist', randi(0, 7)); this.type = 'human'; this.human = true; this.kind = kind; this.layer = 1; this.life = 45; this.screamT = rand(0.5, 2); this.anim.panic = 1; this.anim.swim = 1;
  }
  update(dt) {
    this.tick(dt); this.life -= dt; const s = World.surface(this.x);
    this.vy = approach(this.vy, this.y > s - 2 ? -40 : 30, 200 * dt);
    const landX = World.findX(this.x, x => World.floorY(x) < -2, 800, 30); const dir = landX === null ? 1 : sign(landX - this.x);
    this.vx = approach(this.vx, dir * 32, 50 * dt); this.facing = dir;
    this.move(dt); if (this.y < s - 3) this.y = s - 3;
    this.anim.phase += dt * 5; this.anim.speed = 1; this.screamT -= dt; if (this.screamT <= 0) { this.screamT = rand(1.5, 4); SFX.scream(this.pan); }
    if (chance(dt * 5)) G.fx.splash(this.x, 0.2, 0);
    if (World.floorY(this.x) < -2) { this.remove = true; const s2 = new LandAnimal(this.x, 'survivor'); s2.state = 'flee'; s2.stateT = 3; G.add(s2); }
    if (this.life <= 0) { this.bleeds = true; this.die(null); }
  }
  draw(ctx) { this.rig.draw(ctx, this.x, this.y + this.worldLen * 0.42, this.facing, -Math.PI / 2 + 0.4, this.anim, { scale: this.size * this.rig.scale, white: this.flash > 0, missing: this.missing }); }
  explode(p) { super.explode(p); dropMeat(this.x, this.y, 2, 6); if (chance(0.7)) { const g = new Gib(this.x, this.y, SPR.armGib, { sx: 0, sy: 0, sw: 3, sh: 3 }, 1.5, 1, true, BLOOD_COLORS); g.mass = 6; g.edible = true; g.vx = rand(-80, 80); g.vy = -rand(60, 140); g.vr = rand(-9, 9); G.add(g); } }
}
// ---------- boats ----------
class Boat extends Entity {
  constructor(x, kind = 'poacher', dir = 1) {
    super(x, 0); this.kind = kind; this.type = 'boat'; this.edible = false; this.bleeds = false; this.latchable = false; this.dir = dir; this.facing = dir; this.layer = 1;
    this.war = kind === 'warboat'; this.isBoss = this.war; this.persistent = this.war;
    this.jon = kind === 'jon'; this.pontoon = kind === 'pontoon'; this.airboat = !this.jon && !this.pontoon;
    // hull lengths in game px: jon boat 84, airboat 100, warboat 130, pontoon 150
    this.ft = this.pontoon ? 24 : this.war ? 22 : this.jon ? 14 : 18;
    this.baseL = this.pontoon ? 84 : this.war ? 68 : this.jon ? 40 : 52;      // hull half-length in local px
    this.bs = (this.pontoon ? 150 : this.war ? 130 : this.jon ? 84 : 100) / (this.baseL * 2);   // local px -> world px
    this.hp = this.war ? 320 : this.pontoon ? 160 : this.jon ? 55 : 90; this.maxHp = this.hp;
    this.armor = this.war ? 14 : this.jon ? 5 : 9; this.sizeClass = this.ft / 1.5; this.r = this.baseL * this.bs; this.mass = 0;
    this.name = this.war ? 'POACHER WARBOAT' : this.pontoon ? 'PARTY PONTOON' : this.jon ? 'JON BOAT' : kind === 'tourist' ? 'AIRBOAT TOUR' : 'POACHERS';
    this.threat = (kind === 'tourist' || this.pontoon || this.jon) ? 0 : 1;
    this.speed = this.war ? 55 : this.pontoon ? 26 : this.jon ? 40 : kind === 'tourist' ? 35 : 45;
    this.fan = 0; this.sinking = false; this.sinkT = 0; this.engineOn = true; this.harpoonCd = 5; this.turnCd = 0; this.moored = false;
    this.pass = [];
    const n = this.war ? 3 : this.pontoon ? 5 : this.jon ? 2 : kind === 'tourist' ? 4 : 2;
    const ptype = this.pontoon ? 'tourist' : this.jon ? 'fisherman' : kind === 'tourist' ? 'tourist' : 'poacher';
    const spread = this.pontoon ? 26 : this.jon ? 22 : this.war ? 22 : 18;
    for (let i = 0; i < n; i++) this.pass.push({ ox: -(n - 1) * spread / 2 + i * spread + (this.airboat ? 6 : 0), oy: -4, alive: true, shootCd: rand(0.5, 2), type: ptype, flash: 0, rig: rigOf(SPECIES[ptype], randi(0, 7)), phase: rand(TAU), panic: 0 });
    this.tether = null; this.debris = 0;
  }
  get alivePass() { return this.pass.filter(p => p.alive); }
  passPos(p) { const ph = gsOf(SPECIES[p.type]); return [this.x + p.ox * this.bs * this.facing, this.y + p.oy * this.bs - ph * 0.5]; }
  hitTest(x, y, r) {
    if (this.sinking) return false;
    for (const p of this.alivePass) { const [px, py] = this.passPos(p); const ph = gsOf(SPECIES[p.type]); if (Math.abs(x - px) < r + ph * 0.18 && Math.abs(y - py) < r + ph * 0.5) return true; }
    return Math.abs(x - this.x) < r + this.r && Math.abs(y - this.y) < r + 10 * this.bs;
  }
  nearestDist(x, y) { return Math.max(0, Math.hypot(Math.max(0, Math.abs(x - this.x) - this.r), Math.max(0, Math.abs(y - this.y) - 8 * this.bs))); }
  onBite(P, sx, sy, dx, dy) {
    for (const p of this.alivePass) {
      const [px, py] = this.passPos(p); const ph = gsOf(SPECIES[p.type]);
      if (Math.abs(sx - px) < P.biteRange + ph * 0.2 && Math.abs(sy - py) < P.biteRange + ph * 0.5) { this.killPassenger(p, P, dx, dy); return; }
    }
    const dmg = P.biteDmg * (P.st.pierce ? 3 : 1) * (P.st.hullMul || 1);
    if (dmg < this.armor && !P.st.pierce) { G.fx.sparks(sx, sy, 8, dx, dy); SFX.clank(this.pan); this.vx += dx * 40; return; }
    this.hp -= dmg; this.flash = 0.1; G.fx.splinters(sx, sy, 10, 110); SFX.splinter(this.pan); G.hitstop(0.05); G.shake(4);
    Water.splash(sx, 40, 20);
    this.vx += dx * 60; this.engineOn = this.engineOn && chance(0.8);
    if (P.st.ironStomach) P.eatMass(6, sx, sy);
    if (this.hp <= 0) this.sink(P);
  }
  killPassenger(p, P, dx, dy) {
    p.alive = false; const [px, py] = this.passPos(p);
    G.fx.gore(px, py, 130, dx, dy, true);
    SFX.crunch(P.size, this.pan); SFX.scream(this.pan); G.hitstop(0.09); G.shake(7); G.slowmo(0.35, 0.45);
    const fake = new Human(px, py, p.type); fake.gulped = true; fake.dead = true; G.onEntityKilled(fake, true, true);
    const g = new Gib(px, py, SPR.armGib, { sx: 0, sy: 0, sw: 3, sh: 3 }, 2.5, 1, true, BLOOD_COLORS); g.mass = 6; g.edible = true; g.vx = rand(-90, 90); g.vy = -rand(80, 160); g.vr = rand(-9, 9); G.add(g);
    if (this.alivePass.length === 0) { this.engineOn = false; if (this.tether) this.cutTether(); }
    for (const o of this.alivePass) o.panic = 3;
  }
  sink(P) {
    if (this.sinking) return; this.sinking = true; this.sinkT = 0; this.engineOn = false; this.threat = 0;
    G.fx.splinters(this.x, this.y, 40, 190); G.fx.splash(this.x, 3, this.vx); Water.splash(this.x, 220, this.r); SFX.splinter(this.pan); SFX.splash(2, this.pan); G.shake(12); G.slowmo(0.4, 0.6);
    for (const p of this.alivePass) { const [px, py] = this.passPos(p); const h = new Human(px, py + 6, p.type); h.vx = rand(-60, 60); h.vy = -rand(40, 120); G.add(h); p.alive = false; }
    if (this.tether) this.cutTether();
    G.addScore(this.war ? 5000 : 800); G.stats.boats++; Meta.event('boat');
    if (this.war) G.onBossKilled(this);
  }
  cutTether() { if (this.tether && G.player.tether === this.tether) G.player.tether = null; this.tether = null; }
  update(dt) {
    this.tick(dt); const P = G.player, s = World.surface(this.x);
    if (this.sinking) {
      this.sinkT += dt; this.vy = approach(this.vy, 25, 30 * dt); this.vx *= 0.97; this.angle += this.dir * 0.25 * dt; this.move(dt);
      if (chance(dt * 8)) G.fx.bubbles(this.x + rand(-this.r, this.r), this.y, 2, 4);
      if (chance(dt * 3)) G.fx.splinters(this.x + rand(-this.r, this.r), this.y, 1, 30);
      if (this.y > World.floorY(this.x) - 8) { this.vy = 0; this.y = World.floorY(this.x) - 8; }
      if (this.sinkT > 12) this.remove = true;
      return;
    }
    // the hull rides the simulated surface, pitching with the slope under it
    const sA = World.surface(this.x - this.r * 0.7), sB = World.surface(this.x + this.r * 0.7);
    this.y = (sA + sB) / 2 - 3 * this.bs;
    this.angle = Math.atan2(sB - sA, this.r * 1.4) * 0.6;
    this.turnCd -= dt;
    if (this.moored) { this.vx *= 0.9; this.fan *= 0.95; }
    else if (this.engineOn) {
      const ahead = World.floorY(this.x + this.dir * (this.r + 40));
      if ((ahead < 12 || Math.abs(this.x - P.x) > 900) && this.turnCd <= 0) { this.dir *= -1; this.turnCd = 3; }
      if (this.threat && !P.dead && Math.abs(P.x - this.x) > 90 && chance(dt * 0.6)) this.dir = sign(P.x - this.x);
      this.vx = approach(this.vx, this.dir * this.speed, 60 * dt); this.fan += dt * 40;
      if (this.airboat && chance(dt * 6)) G.fx.smoke(this.x - this.facing * this.r * 0.8, this.y - 14 * this.bs, 1, '#7a7a7a');
      if (this.jon && chance(dt * 4)) G.fx.smoke(this.x - this.facing * this.r, this.y - 4, 1, '#9a9aa0');
      G.fx.add({ type: 'foam', x: this.x - this.facing * this.r + rand(-4, 4), y: s, vx: -this.facing * rand(10, 40), vy: 0, s: 1, life: rand(0.4, 1.2) });
    } else { this.vx *= 0.98; this.fan *= 0.97; }
    this.x += this.vx * dt; if (Math.abs(this.vx) > 4) this.facing = sign(this.vx);
    if (Math.abs(this.vx) > 10) { Water.splash(this.x + this.facing * this.r * 0.9, -Math.abs(this.vx) * 0.5 * dt * 60 * 0.1, 10 * this.bs); Water.splash(this.x - this.facing * this.r * 0.8, Math.abs(this.vx) * 0.45 * dt * 60 * 0.1, 12 * this.bs); }
    // shooting
    const inRange = !P.dead && Math.abs(P.x - this.x) < 320 + this.r && P.y < 110 && P.y > -160;
    for (const p of this.alivePass) {
      p.phase += dt * 2; if (p.flash > 0) p.flash -= dt; if (p.panic > 0) p.panic -= dt;
      if (!P.dead && P.size > 1.4 && Math.abs(P.x - this.x) < 120 + this.r && P.y < 60 && chance(dt * 0.3)) { p.panic = 2; SFX.yell(this.pan); }
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
        const h = new Projectile(this.x, this.y - 10 * this.bs, Math.cos(a) * 420, Math.sin(a) * 420, 'harpoon', this); G.add(h); SFX.gunshot(this.pan);
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
    if (Math.abs(this.x - P.x) > 2200 && !this.war) this.remove = true;
  }
  draw(ctx) {
    const f = this.facing, bs = this.bs, L = this.baseL;
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    if (this.sinking) ctx.rotate(this.dir * this.sinkT * 0.12);
    ctx.scale(f * bs, bs);
    const white = this.flash > 0;
    const hull = white ? '#ffffff' : this.war ? '#4a4a3a' : this.pontoon ? '#d0d4d8' : this.jon ? '#4a7a4a' : this.kind === 'tourist' ? '#c8c8c0' : '#8a8a80';
    const hullLo = shade(hull, 0.72), hullHi = mixColor(hull, '#ffffff', 0.25);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    if (this.pontoon) {
      // twin aluminium pontoons, deck, rails, canopy
      for (const py of [4]) { px(-L, py, L * 2, 6, '#9aa0a6'); px(-L, py, L * 2, 1, '#c8ccd0'); px(-L, py + 5, L * 2, 1, '#5a6066'); for (let i = -L; i < L; i += 9) px(i, py + 1, 1, 4, '#7a8086'); px(L - 4, py + 1, 4, 4, '#b0b4b8'); }
      px(-L + 2, 0, L * 2 - 4, 4, hull); px(-L + 2, 0, L * 2 - 4, 1, hullHi); px(-L + 2, 3, L * 2 - 4, 1, hullLo);
      for (let i = -L + 3; i < L - 3; i += 10) px(i, -14, 1, 14, '#b8bcc0');
      px(-L + 3, -15, L * 2 - 6, 1, '#d8dce0'); px(-L + 3, -8, L * 2 - 6, 1, '#b8bcc0');
      px(-L + 6, -30, L * 2 - 12, 4, '#3a8a6a'); for (let i = -L + 6; i < L - 6; i += 12) px(i, -30, 6, 4, '#2a6a50'); px(-L + 6, -26, L * 2 - 12, 1, '#1e4a38');
      px(-L + 8, -26, 1, 12, '#8a9096'); px(L - 9, -26, 1, 12, '#8a9096');
      px(-L - 2, -6, 6, 8, '#333'); px(-L - 5, -2, 3, 6, '#555'); // outboard
      px(L * 0.3, -12, 10, 6, '#c04040'); px(L * 0.3 + 1, -11, 8, 1, '#e08080'); // cooler
    } else if (this.jon) {
      px(-L, -3, L * 2, 9, hull); px(-L, -3, L * 2, 1, hullHi); px(-L, 5, L * 2, 1, hullLo); px(L - 2, -4, 3, 10, hullLo);
      for (let i = -L + 4; i < L; i += 8) px(i, -3, 1, 8, hullLo);           // ribs
      px(-L + 8, -6, 14, 3, '#5a6a4a'); px(L * 0.2, -6, 14, 3, '#5a6a4a');  // bench seats
      px(-L - 4, -14, 7, 12, '#2a2a2a'); px(-L - 3, -16, 5, 3, '#444'); px(-L - 2, -2, 3, 8, '#333'); // outboard motor
      px(L * 0.55, -7, 6, 4, '#c04040');                                     // gas can
    } else {
      // airboat: flat hull with a raised bow, driver's tower seat, big prop cage
      ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-L, -2); ctx.lineTo(L - 10, -2); ctx.lineTo(L, -9); ctx.lineTo(L, -2); ctx.lineTo(L - 2, 6); ctx.lineTo(-L + 2, 6); ctx.closePath(); ctx.fill();
      px(-L, 4, L * 2, 2, hullLo); px(-L + 2, -2, L * 2 - 12, 1, hullHi);
      px(-L + 2, -1, L * 2 - 6, 1, this.war ? '#8a2020' : '#c04040');
      for (let i = -L + 6; i < L - 12; i += 10) px(i, 0, 1, 5, hullLo);        // hull ribs / rivets
      px(-6, -16, 12, 2, '#3a3a30'); px(-4, -14, 8, 12, '#3a3a30'); px(-8, -18, 16, 2, '#2a2a20');  // seat tower
      px(-L + 22, -6, 10, 5, '#5a5a50'); px(L * 0.35, -6, 12, 5, '#5a5a50');     // bench, cooler
      // engine block + prop cage
      const cx = -L + 12, cy = -18, Rr = 15;
      px(cx - 6, cy + 10, 12, 8, '#2a2a2a'); px(cx - 4, cy + 12, 8, 2, '#5a5a5a');
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#444'; for (let k = 0; k < 8; k++) { const a = k * TAU / 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * Rr, cy + Math.sin(a) * Rr); ctx.stroke(); }
      ctx.fillStyle = 'rgba(40,40,40,0.3)'; ctx.beginPath(); ctx.arc(cx, cy, Rr - 1, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#d0d0c0'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const a = this.fan + i * TAU / 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (Rr - 3), cy + Math.sin(a) * (Rr - 3)); ctx.stroke(); }
      px(cx - 2, cy - 2, 4, 4, '#333');
      px(cx - 3, cy + Rr - 1, 6, 4, '#333'); px(cx - 8, cy + Rr + 2, 16, 2, '#2a2a2a');
      if (this.war) { px(L - 22, -14, 14, 3, '#333'); px(L - 14, -20, 2, 7, '#333'); px(L - 26, -12, 6, 6, '#3a3a2a'); }
    }
    ctx.restore();
    this.drawPeople(ctx);
  }
  drawPeople(ctx) {
    for (const p of this.pass) {
      if (!p.alive) continue;
      const [px, py] = this.passPos(p), ph = gsOf(SPECIES[p.type]);
      const aim = p.type === 'poacher' && !G.player.dead && Math.abs(G.player.x - this.x) < 320 + this.r && G.player.y > -160 && G.player.y < 110;
      const face = aim ? sign(G.player.x - px) || this.facing : this.facing;
      p.rig.draw(ctx, px, py + ph * 0.5, face, this.angle, { phase: p.phase, speed: 0, panic: p.panic > 0 ? 1 : 0, aim: aim ? 1 : 0 }, { scale: p.rig.scale, white: this.flash > 0 });
      if (p.flash > 0) { ctx.fillStyle = '#fff0a0'; ctx.fillRect(px + face * ph * 0.42, py - ph * 0.12, 5, 5); }
    }
    if (this.tether) { const P = G.player; ctx.strokeStyle = '#d0d0c0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.x, this.y - 10 * this.bs); ctx.lineTo(P.x, P.y); ctx.stroke(); }
  }
}
class Kayak extends Entity {
  constructor(x, dir) {
    super(x, 0); this.dir = dir || (chance(0.5) ? 1 : -1); this.facing = this.dir; this.type = 'kayak'; this.bleeds = false; this.layer = 1; this.latchable = false; this.paddle = 0;
    this.bs = 70 / 60; this.r = 30 * this.bs; this.hp = 10; this.maxHp = 10; this.mass = 0; this.sizeClass = 12 / 1.5; this.name = 'KAYAKER';
    this.rider = rigOf(SPECIES.kayaker, randi(0, 7)); this.rh = gsOf(SPECIES.kayaker); this.ph = rand(TAU);
  }
  update(dt) {
    this.tick(dt); const s = World.surface(this.x); this.y = s - 2 * this.bs; this.paddle += dt * 4; this.ph += dt;
    if (World.floorY(this.x + this.dir * (this.r + 20)) < 10) this.dir *= -1;
    this.vx = approach(this.vx, this.dir * 28, 30 * dt); this.facing = sign(this.vx || this.dir); this.x += this.vx * dt;
    if (this.senses(60)) { this.vx = this.facing * 60; if (chance(dt * 1)) SFX.yell(this.pan); }
    if (Math.abs(this.vx) > 8) { Water.splash(this.x + this.facing * this.r * 0.8, -Math.abs(this.vx) * 0.3 * dt * 6, 8); if (chance(dt * 3)) G.fx.ripple(this.x - this.facing * this.r, 3, 0.3); }
    if (Math.abs(this.x - G.player.x) > 1800) this.remove = true;
  }
  takeDamage(dmg, src, opts) {
    G.fx.splash(this.x, 1.5, this.vx); G.fx.splinters(this.x, this.y, 16, 120); SFX.splinter(this.pan); SFX.scream(this.pan); G.shake(5); Water.splash(this.x, 90, this.r);
    const h = new Human(this.x, this.y + 4, 'kayaker'); h.vy = -60; G.add(h);
    this.remove = true; return dmg;
  }
  draw(ctx) {
    const bs = this.bs, f = this.facing;
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(f * bs, bs);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    // hull: pointed bow and stern, cockpit, deck lines
    ctx.fillStyle = '#d9573a'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-22, -4); ctx.lineTo(22, -4); ctx.lineTo(30, 0); ctx.lineTo(22, 4); ctx.lineTo(-22, 4); ctx.closePath(); ctx.fill();
    px(-22, -4, 44, 1, '#f08060'); px(-22, 3, 44, 1, '#a03a24'); px(-8, -4, 16, 3, '#2a1a10'); px(-8, -4, 16, 1, '#5a3a2a');
    px(-24, -1, 4, 2, '#e8e0c0'); px(20, -1, 4, 2, '#e8e0c0');
    ctx.restore();
    // paddler: torso only (legs are in the cockpit), arms swinging with the paddle
    ctx.save(); ctx.translate(this.x, this.y - 3 * bs);
    ctx.save(); ctx.beginPath(); ctx.rect(-this.rh, -this.rh, this.rh * 2, this.rh * 0.56); ctx.clip();
    this.rider.draw(ctx, 0, this.rh * 0.5, this.facing, 0, { phase: this.paddle, speed: 0.6, panic: 0 }, { scale: this.rider.scale });
    ctx.restore();
    const a = Math.sin(this.paddle) * 0.6, pl = this.rh * 0.55;
    ctx.strokeStyle = '#e0d0a0'; ctx.lineWidth = Math.max(1.5, bs); ctx.beginPath(); ctx.moveTo(-Math.cos(a + 0.4) * pl, -this.rh * 0.25 + Math.sin(a) * pl * 0.5); ctx.lineTo(Math.cos(a + 0.4) * pl, -this.rh * 0.25 - Math.sin(a) * pl * 0.5); ctx.stroke();
    ctx.fillStyle = '#e8d8a0'; ctx.fillRect(Math.cos(a + 0.4) * pl - 3, -this.rh * 0.25 - Math.sin(a) * pl * 0.5 - 4, 6, 9);
    ctx.restore();
  }
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
    if (!P.dead && P.nearestDist(this.x, this.y) < 5 * P.vis + this.r) {
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
    super(x, 0); this.useSpecies('skunkape'); this.hp = 900; this.maxHp = 900; this.mass = 1200; this.type = 'skunkape'; this.isBoss = true; this.persistent = true; this.threat = 1; this.gibs = 6; this.layer = 1;
    this.hh = gsOf(SPECIES.skunkape); this.y = World.floorY(x) - this.hh * 0.5; this.throwCd = 2; this.poundCd = 0; this.walkT = 0; this.rage = false; this.bloodColors = ['#7a1010', '#a51a1a', '#c02020', '#5a0808']; this.roarCd = 0;
  }
  update(dt) {
    this.tick(dt); const P = G.player; const fy = World.floorY(this.x);
    if (fy > 0) { // fell into water: wade back
      this.vy = approach(this.vy, 40, 100 * dt); const landX = World.findX(this.x, x => World.floorY(x) < -2, 1200, 30); const dir = landX === null ? 1 : sign(landX - this.x); this.vx = approach(this.vx, dir * 40, 80 * dt); this.move(dt); if (this.y > fy - this.hh * 0.5) this.y = fy - this.hh * 0.5; this.facing = dir; return;
    }
    this.y = fy - this.hh * 0.5; this.vy = 0;
    if (!this.rage && this.hp < this.maxHp * 0.35) { this.rage = true; SFX.roar(3, this.pan); G.fx.text(this.x, this.y - 40, 'ENRAGED!', { color: '#ff4020', scale: 2 }); G.shake(10); }
    const spd = this.rage ? 110 : 70; const dP = this.distTo(P);
    this.throwCd -= dt; this.poundCd -= dt; this.roarCd -= dt;
    if (this.roarCd <= 0 && dP < 400) { this.roarCd = rand(6, 10); SFX.roar(2.5, this.pan); }
    const dir = sign(P.x - this.x); this.facing = dir;
    const canWalk = World.floorY(this.x + dir * 16) < -2;
    if (P.dead) { this.vx = 0; }
    else if (dP < this.hh * 0.35 + 5 * P.vis && this.poundCd <= 0) {
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
    const moving = Math.abs(this.vx) > 5;
    this.anim.phase = this.walkT; this.anim.speed = moving ? 1 : 0; this.anim.panic = this.throwAnim > 0 || this.rage ? 1 : 0;
    this.rig.draw(ctx, this.x, this.y + this.hh * 0.5, this.facing, this.throwAnim > 0 ? -0.15 : 0, this.anim, { scale: this.rig.scale, white: this.flash > 0 });
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,30,0.7)'; const ex = this.x + this.facing * this.hh * 0.06, ey = this.y - this.hh * 0.42; ctx.fillRect(ex - 3, ey, 3, 2); ctx.fillRect(ex + 3, ey, 3, 2); ctx.globalCompositeOperation = 'source-over';
  }
  explode(p) { super.explode(p); G.fx.flesh(this.x, this.y, 40, 160); dropMeat(this.x, this.y, 8, 30, this.bloodColors); }
}
// ---------- spawn helpers ----------
const Spawn = {
  school(x, y, kind) { if (kind === 'babygator') { const n = randi(2, 5); for (let i = 0; i < n; i++) { const g = new Gator(x + rand(-30, 30), y + rand(-10, 10), rand(0.35, 0.5)); g.name = 'GATOR HATCHLING'; g.threat = 0; G.add(g); } return null; } const d = FISH[kind] || SPECIES[kind]; const n = randi(d.school ? d.school[0] : 1, d.school ? d.school[1] : 2); const leader = new Fish(x, y, kind); G.add(leader); for (let i = 1; i < n; i++) G.add(new Fish(x + rand(-30, 30), y + rand(-20, 20), kind, leader)); return leader; },
  flock(x, dir, kind, n) { for (let i = 0; i < n; i++) { const b = new Bird(x - dir * i * 26 + rand(-8, 8), -rand(80, 170) + i * 4, kind, 'fly', dir); b.vx = dir * BIRDS[kind].speed; G.add(b); } },
  heron(x) { const b = new Bird(x, 0, 'heron', 'wade'); G.add(b); return b; },
  duck(x) { const b = new Bird(x, 0, 'duck', 'float'); G.add(b); return b; },
  gator(x, y, size, boss) { const g = new Gator(x, y, size, boss); G.add(g); return g; },
  boat(x, kind, dir) { const b = new Boat(x, kind, dir); G.add(b); return b; },
};
