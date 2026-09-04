'use strict';
// ---------------------------------------------------------------------------
// Human activity: docks, stilt fish camps, boat ramps, ranger towers, crab
// traps. Most of them are breakable, and the people on them are edible.
// ---------------------------------------------------------------------------
class Structure extends Entity {
  constructor(x, kind) {
    super(x, 0); this.kind = kind; this.type = 'structure'; this.edible = false; this.bleeds = false; this.latchable = false;
    this.persistent = true; this.layer = 1; this.mass = 0; this.threat = 0; this.armor = 10; this.collapsed = false; this.collapseT = 0;
    this.occupants = []; this.seed = ihash(Math.round(x), 13); this.lightOn = false;
    const surf = 0;
    switch (kind) {
      case 'dock': {
        this.name = 'FISHING DOCK'; this.len = 40 + Math.round(this.seed * 46); this.hp = 120; this.deckY = -13;
        this.dir = World.floorY(x - 60) < 0 ? 1 : -1; // extend out over the water
        this.pilings = []; for (let i = 1; i <= 4; i++) this.pilings.push({ ox: this.dir * (i * this.len / 4), hp: 30, dead: false });
        this.r = this.len; break;
      }
      case 'stilthouse': {
        this.name = 'FISH CAMP'; this.hp = 220; this.deckY = -34; this.w = 46; this.r = 34;
        this.pilings = []; for (let i = 0; i < 4; i++) this.pilings.push({ ox: -18 + i * 12, hp: 45, dead: false });
        this.r = 30; break;
      }
      case 'boatramp': { this.name = 'BOAT RAMP'; this.hp = 400; this.armor = 40; this.r = 30; this.dir = World.floorY(x - 50) < 0 ? 1 : -1; break; }
      case 'tower': { this.name = 'RANGER TOWER'; this.hp = 200; this.r = 16; this.deckY = -58; break; }
      case 'crabtrap': { this.name = 'CRAB TRAP'; this.hp = 20; this.r = 8; this.floatY = 0; this.deep = World.floorY(x) - 4; this.baited = true; break; }
      case 'buoy': { this.name = 'CHANNEL MARKER'; this.hp = 40; this.r = 6; break; }
      case 'sign': { this.name = 'WARNING SIGN'; this.hp = 20; this.r = 8; break; }
      case 'campfire': { this.name = 'CAMPFIRE'; this.hp = 20; this.r = 10; break; }
    }
    this.maxHp = this.hp;
    this.y = kind === 'crabtrap' ? World.surface(x) : kind === 'buoy' ? World.surface(x) : World.floorY(x);
    if (kind === 'dock' || kind === 'stilthouse' || kind === 'tower' || kind === 'campfire') this.y = Math.min(0, World.floorY(x));
  }
  addOccupant(type, ox, oy) { this.occupants.push({ type, ox, oy, alive: true, t: rand(10), flash: 0 }); }
  get alivePeople() { return this.occupants.filter(o => o.alive); }
  occPos(o) { return [this.x + o.ox, this.y + o.oy]; }
  hitTest(x, y, r) {
    if (this.collapsed) return false;
    for (const o of this.alivePeople) { const [px, py] = this.occPos(o); if (dist(x, y, px, py) < r + 7) return true; }
    if (this.pilings) { for (const p of this.pilings) { if (p.dead) continue; if (Math.abs(x - (this.x + p.ox)) < r + 4 && y > this.y + (this.deckY || -10) && y < World.floorY(this.x) + 4) return true; } }
    if (this.kind === 'crabtrap' || this.kind === 'buoy' || this.kind === 'sign') return dist(x, y, this.x, this.y) < r + this.r;
    return false;
  }
  nearestDist(x, y) { return Math.max(0, dist(x, y, this.x, this.y) - this.r); }
  onBite(P, sx, sy, dx, dy) {
    // people first
    for (const o of this.alivePeople) {
      const [px, py] = this.occPos(o);
      if (dist(sx, sy, px, py) < P.biteRange + 7) { this.eatOccupant(o, P, dx, dy); return; }
    }
    if (this.kind === 'crabtrap') {
      this.hp = 0; G.fx.splinters(this.x, this.y, 12, 100); SFX.splinter(this.pan); Meta.event('crack');
      if (this.baited) { const c = new Bottom(this.x, 'crab'); c.y = this.y; c.armor = 0; G.add(c); G.fx.text(this.x, this.y - 14, 'TRAP CRACKED!', { color: '#e0c080' }); }
      P.eatMass(8, this.x, this.y); this.remove = true; return;
    }
    if (this.kind === 'buoy' || this.kind === 'sign') { G.fx.splinters(this.x, this.y, 10, 90); SFX.splinter(this.pan); G.fx.text(this.x, this.y - 12, 'SMASHED', { color: '#e0c080' }); this.remove = true; return; }
    // pilings
    const dmg = P.biteDmg * (P.st.hullMul || 1) * (P.st.pierce ? 2.5 : 1);
    if (dmg < this.armor && !P.st.pierce) { G.fx.sparks(sx, sy, 6, dx, dy); SFX.clank(this.pan); G.fx.text(this.x, this.y - 24, 'TOO SOLID', { color: '#c0c0c0' }); return; }
    let hitP = null;
    if (this.pilings) { let best = 1e9; for (const p of this.pilings) { if (p.dead) continue; const d = Math.abs(sx - (this.x + p.ox)); if (d < best) { best = d; hitP = p; } } }
    G.fx.splinters(sx, sy, 12, 120); SFX.splinter(this.pan); G.hitstop(0.05); G.shake(5);
    G.fx.text(sx, sy - 12, choice(['CRACK!', 'SPLINTER!', 'CRUNCH!']), { color: '#e0c080' });
    Meta.event('crack');
    if (hitP) { hitP.hp -= dmg; if (hitP.hp <= 0) { hitP.dead = true; G.fx.splinters(this.x + hitP.ox, this.y, 16, 140); G.shake(7); } }
    this.hp -= dmg;
    if (P.st.ironStomach) P.eatMass(5, sx, sy);
    const standing = this.pilings ? this.pilings.filter(p => !p.dead).length : 1;
    if (this.hp <= 0 || (this.pilings && standing <= 1)) this.collapse(P);
  }
  eatOccupant(o, P, dx, dy) {
    o.alive = false; const [px, py] = this.occPos(o);
    G.fx.gore(px, py, 130, dx, dy, true);
    G.fx.text(px, py - 16, choice(['CHOMP!', 'DEVOURED!', 'DRAGGED UNDER!']), { color: '#ffffff', scale: 2 });
    SFX.crunch(P.size, this.pan); SFX.scream(this.pan); G.hitstop(0.09); G.shake(7); G.slowmo(0.35, 0.45);
    const fake = new Human(px, py, o.type); fake.gulped = true; fake.dead = true; fake.name = o.type === 'ranger' ? 'RANGER' : o.type === 'poacher' ? 'POACHER' : 'TOURIST';
    G.onEntityKilled(fake, true, true);
    const g = new Gib(px, py, SPR.armGib, { sx: 0, sy: 0, sw: 3, sh: 3 }, 1.5, 1, true, BLOOD_COLORS); g.mass = 6; g.edible = true; g.vx = rand(-90, 90); g.vy = -rand(80, 160); g.vr = rand(-9, 9); G.add(g);
    for (const other of this.alivePeople) other.panic = 2.5;
  }
  collapse(P) {
    if (this.collapsed) return; this.collapsed = true; this.collapseT = 0; this.threat = 0;
    G.fx.splinters(this.x, this.y - 10, 40, 190); G.fx.splash(this.x, 2.2, 0); G.shake(14); SFX.splinter(this.pan); SFX.thud(this.pan); G.slowmo(0.4, 0.5);
    G.fx.text(this.x, this.y - 40, this.kind === 'stilthouse' ? 'FISH CAMP DESTROYED!' : 'DOCK DESTROYED!', { color: '#ffd060', scale: 2, life: 1.8 });
    for (const o of this.alivePeople) { const [px, py] = this.occPos(o); const h = new Human(px, py + 4, o.type); h.vx = rand(-70, 70); h.vy = -rand(30, 90); G.add(h); o.alive = false; }
    G.addScore(1200); Meta.event('structure');
    if (P) G.stats.structures = (G.stats.structures || 0) + 1;
  }
  update(dt) {
    this.tick(dt);
    const P = G.player, night = 1 - World.light(G.day);
    this.lightOn = night > 0.45;
    if (this.collapsed) { this.collapseT += dt; if (this.collapseT > 8) this.remove = true; if (chance(dt * 2)) G.fx.bubbles(this.x + rand(-20, 20), World.surface(this.x) + 6, 1, 4); return; }
    if (this.kind === 'crabtrap') { this.y = World.surface(this.x); }
    if (this.kind === 'buoy') { this.y = World.surface(this.x) - 4; }
    if (this.kind === 'campfire' && chance(dt * 22)) G.fx.add({ type: 'smoke', x: this.x + rand(-2, 2), y: this.y - 6, vx: rand(-6, 6), vy: -rand(14, 28), s: rand(1.5, 3), color: '#6a6a6a', life: rand(0.8, 1.8), t: 0, maxLife: 1.4 });
    if (this.kind === 'campfire' && this.lightOn) G.fx.glow(this.x, this.y - 4, 14 + Math.sin(this.t * 9) * 3, '#ff8020', 0.12);
    for (const o of this.alivePeople) {
      o.t += dt; if (o.panic > 0) o.panic -= dt;
      if (!P.dead && P.size > 1.2 && dist(P.x, P.y, this.x + o.ox, this.y + o.oy) < 90 && chance(dt * 0.35)) { o.panic = 2; SFX.yell(this.pan); }
    }
  }
  draw(ctx) {
    const f = this.kind === 'dock' || this.kind === 'boatramp' ? (this.dir || 1) : 1;
    const y = this.y, fy = World.floorY(this.x), sag = this.collapsed ? Math.min(1, this.collapseT * 0.9) : 0;
    ctx.save(); ctx.translate(this.x, y);
    if (sag) { ctx.rotate(sag * 0.4 * f); ctx.translate(0, sag * 14); ctx.globalAlpha = Math.max(0, 1 - this.collapseT / 8); }
    const wood = '#6b5033', woodD = '#4a3524', woodL = '#8a6a44';
    const piling = (ox, top, bot, dead) => {
      if (dead) { ctx.fillStyle = woodD; ctx.fillRect(Math.round(ox - 2), Math.round(bot - 6), 4, 6); ctx.fillStyle = '#3a2a18'; ctx.fillRect(Math.round(ox - 2), Math.round(bot - 7), 4, 2); return; }
      ctx.fillStyle = woodD; ctx.fillRect(Math.round(ox - 2), Math.round(top), 4, Math.round(bot - top));
      ctx.fillStyle = wood; ctx.fillRect(Math.round(ox - 2), Math.round(top), 2, Math.round(bot - top));
      // algae at the waterline
      ctx.fillStyle = '#3a5a3a'; ctx.fillRect(Math.round(ox - 2), Math.round(World.surface(this.x + ox) - y), 4, 3);
    };
    switch (this.kind) {
      case 'dock': {
        const L = this.len, dY = this.deckY;
        for (const p of this.pilings) piling(p.ox, dY, fy - y, p.dead);
        ctx.fillStyle = woodD; ctx.fillRect(Math.round(Math.min(0, f * L)), Math.round(dY), Math.round(L), 3);
        ctx.fillStyle = wood; ctx.fillRect(Math.round(Math.min(0, f * L)), Math.round(dY), Math.round(L), 2);
        for (let i = 0; i < L; i += 6) { ctx.fillStyle = woodD; ctx.fillRect(Math.round(Math.min(0, f * L) + i), Math.round(dY), 1, 2); }
        // rail posts
        for (let i = 0; i <= 3; i++) { const px = f * (i * L / 3); ctx.fillStyle = wood; ctx.fillRect(Math.round(px - 1), Math.round(dY - 8), 2, 8); }
        ctx.fillStyle = woodL; ctx.fillRect(Math.round(Math.min(0, f * L)), Math.round(dY - 8), Math.round(L), 1);
        if (this.lightOn) { ctx.fillStyle = '#ffd070'; ctx.fillRect(Math.round(f * L - 2), Math.round(dY - 12), 3, 3); }
        break;
      }
      case 'stilthouse': {
        const dY = this.deckY, W = this.w;
        for (const p of this.pilings) piling(p.ox, dY, fy - y, p.dead);
        ctx.fillStyle = woodD; ctx.fillRect(-W / 2 - 3, dY, W + 6, 3);
        ctx.fillStyle = wood; ctx.fillRect(-W / 2 - 3, dY, W + 6, 2);
        // walls
        ctx.fillStyle = '#7a6a52'; ctx.fillRect(-W / 2 + 4, dY - 22, W - 8, 22);
        ctx.fillStyle = '#6a5a44'; for (let i = 0; i < 22; i += 4) ctx.fillRect(-W / 2 + 4, dY - 22 + i, W - 8, 1);
        // roof
        ctx.fillStyle = '#4a4a44'; ctx.beginPath(); ctx.moveTo(-W / 2 - 2, dY - 22); ctx.lineTo(0, dY - 33); ctx.lineTo(W / 2 + 2, dY - 22); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5a5a52'; ctx.fillRect(-W / 2 - 2, dY - 23, W + 4, 2);
        // window + door
        ctx.fillStyle = this.lightOn ? '#ffd070' : '#2a2a2a'; ctx.fillRect(-W / 2 + 8, dY - 17, 7, 6); ctx.fillRect(W / 2 - 15, dY - 17, 7, 6);
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-4, dY - 12, 8, 12);
        if (this.lightOn) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,200,90,0.10)'; ctx.beginPath(); ctx.arc(0, dY - 14, 40, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
        // ladder to the water
        ctx.fillStyle = wood; ctx.fillRect(W / 2 + 1, dY, 2, Math.max(0, -dY + 8)); for (let i = 4; i < -dY + 8; i += 5) ctx.fillRect(W / 2 - 1, dY + i, 6, 1);
        break;
      }
      case 'boatramp': {
        ctx.fillStyle = '#8a8a84'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(f * 46, 16); ctx.lineTo(f * 46, 24); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#a0a09a'; for (let i = 0; i < 46; i += 7) { ctx.fillRect(Math.round(f * i), Math.round(-4 + i * 0.43), 2, 2); }
        ctx.fillStyle = '#5a5a54'; ctx.fillRect(Math.round(f * -10), -6, 12, 4);
        break;
      }
      case 'tower': {
        const dY = this.deckY;
        for (const ox of [-10, 10]) { ctx.fillStyle = woodD; ctx.fillRect(ox - 2, dY, 4, -dY); ctx.fillStyle = wood; ctx.fillRect(ox - 2, dY, 2, -dY); }
        for (let i = 1; i < 5; i++) { const yy = dY + (-dY) * i / 5; ctx.fillStyle = wood; ctx.fillRect(-11, Math.round(yy), 22, 1); ctx.fillRect(Math.round(-10 + (i % 2) * 8), Math.round(yy), 12, 1); }
        ctx.fillStyle = woodD; ctx.fillRect(-14, dY, 28, 3); ctx.fillStyle = wood; ctx.fillRect(-14, dY, 28, 2);
        ctx.fillStyle = '#5a6a4a'; ctx.fillRect(-12, dY - 16, 24, 16);
        ctx.fillStyle = this.lightOn ? '#ffe090' : '#20303a'; ctx.fillRect(-9, dY - 13, 18, 7);
        ctx.fillStyle = '#3a4a34'; ctx.beginPath(); ctx.moveTo(-15, dY - 16); ctx.lineTo(0, dY - 24); ctx.lineTo(15, dY - 16); ctx.closePath(); ctx.fill();
        break;
      }
      case 'crabtrap': {
        ctx.fillStyle = '#e04030'; ctx.fillRect(-3, -3, 6, 5); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(-3, -3, 6, 2);
        const bot = this.deep - y;
        ctx.strokeStyle = 'rgba(220,220,200,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(2, bot); ctx.stroke();
        ctx.fillStyle = '#4a5a4a'; ctx.fillRect(-6, Math.round(bot - 6), 14, 7);
        ctx.fillStyle = '#7a8a7a'; for (let i = 0; i < 14; i += 3) ctx.fillRect(-6 + i, Math.round(bot - 6), 1, 7);
        for (let i = 0; i < 7; i += 3) ctx.fillRect(-6, Math.round(bot - 6 + i), 14, 1);
        break;
      }
      case 'buoy': {
        ctx.fillStyle = '#20a040'; ctx.fillRect(-4, 0, 8, 6); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(-4, 0, 8, 2);
        ctx.fillStyle = '#20a040'; ctx.fillRect(-1, -10, 2, 10);
        if (this.lightOn && Math.sin(this.t * 3) > 0) { ctx.fillStyle = '#40ff60'; ctx.fillRect(-2, -13, 4, 3); }
        break;
      }
      case 'sign': {
        ctx.fillStyle = '#6b5033'; ctx.fillRect(-1, -14, 2, 14);
        ctx.fillStyle = '#e8e8d8'; ctx.fillRect(-11, -26, 22, 13);
        ctx.fillStyle = '#c02020'; ctx.fillRect(-11, -26, 22, 3);
        Font.draw(ctx, 'NO', 0, -22, { color: '#202020', align: 'center' });
        Font.draw(ctx, 'SWIM', 0, -19, { color: '#202020', align: 'center' });
        break;
      }
      case 'campfire': {
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-7, -2, 14, 3);
        ctx.fillStyle = '#4a3524'; ctx.fillRect(-6, -5, 5, 4); ctx.fillRect(1, -5, 5, 4);
        const fl = 6 + Math.sin(this.t * 11) * 2;
        ctx.fillStyle = '#ff8020'; ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(0, -3 - fl); ctx.lineTo(4, -3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(0, -3 - fl * 0.6); ctx.lineTo(2, -3); ctx.closePath(); ctx.fill();
        break;
      }
    }
    // people
    for (const o of this.occupants) {
      if (!o.alive) continue;
      const spr = o.type === 'ranger' ? SPR.ranger[0] : o.type === 'poacher' ? SPR.poacher[0] : o.type === 'fisherman' ? SPR.human[0] : SPR.tourist[0];
      const shake = o.panic > 0 ? rand(-1, 1) : 0, bob = o.panic > 0 ? Math.abs(Math.sin(o.t * 14)) * -2 : Math.sin(o.t * 1.4) * 0.4;
      ctx.drawImage(spr.c, Math.round(o.ox - 4 + shake), Math.round(o.oy - 12 + bob));
      if (o.type === 'fisherman' && o.panic <= 0) {
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(o.ox + 3, o.oy - 4); ctx.lineTo(o.ox + 16, o.oy - 14); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(o.ox + 16, o.oy - 14); ctx.lineTo(o.ox + 22, World.surface(this.x + o.ox + 22) - this.y + Math.sin(o.t) * 1); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
// place a structure appropriate to the terrain at x
function trySpawnStructure(x, rng, difficulty) {
  const fy = World.floorY(x), r = rng();
  const deepAt = dx => World.floorY(x + dx) > 60;
  if (fy < -6) { // on a bank
    if (r < 0.3 && (deepAt(70) || deepAt(-70))) {
      const s = new Structure(x, 'dock');
      const n = randi(1, 2); for (let i = 0; i < n; i++) s.addOccupant(chance(0.7) ? 'fisherman' : 'tourist', s.dir * (14 + i * 16), s.deckY);
      G.add(s);
      if (chance(0.4)) { const b = new Boat(x + s.dir * (s.len + 20), 'jon', -s.dir); b.engineOn = false; b.moored = true; G.add(b); }
      return true;
    }
    if (r < 0.45) { G.add(new Structure(x, 'boatramp')); return true; }
    if (r < 0.6) { const s = new Structure(x, 'tower'); if (chance(0.5)) s.addOccupant('ranger', 0, s.deckY); G.add(s); return true; }
    if (r < 0.72) { const s = new Structure(x, 'campfire'); const n = randi(1, 3); for (let i = 0; i < n; i++) s.addOccupant(chance(0.5) ? 'tourist' : 'fisherman', -14 + i * 13, 0); G.add(s); return true; }
    if (r < 0.8) { G.add(new Structure(x, 'sign')); return true; }
    return false;
  }
  if (fy > 70) { // over open water
    if (r < 0.34 && fy < 240) {
      const s = new Structure(x, 'stilthouse');
      const n = randi(1, 3); for (let i = 0; i < n; i++) s.addOccupant(difficulty > 2.4 && chance(0.5) ? 'poacher' : chance(0.5) ? 'fisherman' : 'tourist', -16 + i * 15, s.deckY);
      G.add(s); return true;
    }
    if (r < 0.62) { G.add(new Structure(x, 'crabtrap')); return true; }
    if (r < 0.78) { G.add(new Structure(x, 'buoy')); return true; }
  }
  return false;
}
