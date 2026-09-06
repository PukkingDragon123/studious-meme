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
    this.ss = 44 / 60;   // local units are drawn so a person stands 44 px tall
    const surf = 0;
    switch (kind) {
      case 'dock': {
        this.name = 'FISHING DOCK'; this.len = 40 + Math.round(this.seed * 46); this.hp = 120; this.deckY = -13;
        this.dir = World.floorY(x - 60) < 0 ? 1 : -1; // extend out over the water
        this.pilings = []; for (let i = 1; i <= 4; i++) this.pilings.push({ ox: this.dir * (i * this.len / 4), hp: 30, dead: false });
        this.r = this.len * this.ss; break;
      }
      case 'stilthouse': {
        this.name = 'FISH CAMP'; this.hp = 220; this.deckY = -34; this.w = 46; this.r = 34;
        this.pilings = []; for (let i = 0; i < 4; i++) this.pilings.push({ ox: -18 + i * 12, hp: 45, dead: false });
        this.r = 30 * this.ss; break;
      }
      case 'boatramp': { this.name = 'BOAT RAMP'; this.hp = 400; this.armor = 40; this.r = 30 * this.ss; this.dir = World.floorY(x - 50) < 0 ? 1 : -1; break; }
      case 'tower': { this.name = 'RANGER TOWER'; this.hp = 200; this.r = 16 * this.ss; this.deckY = -58; break; }
      case 'crabtrap': { this.name = 'CRAB TRAP'; this.hp = 20; this.r = 8 * this.ss; this.floatY = 0; this.deep = World.floorY(x) - 4; this.baited = true; break; }
      case 'buoy': { this.name = 'CHANNEL MARKER'; this.hp = 40; this.r = 6 * this.ss; break; }
      case 'seawall': {
        const w2 = this.w, dmg = 1 - clamp(this.hp / 260, 0, 1);
        const face = '#6b6d74', faceL = '#8a8c92', faceD = '#43454c', cap = '#7d8088';
        px(-w2 / 2, -30, w2, 32, face);
        px(-w2 / 2, -30, w2, 2, faceL);
        px(-w2 / 2, -2, w2, 3, faceD);
        // panel joints and staining down the face
        for (let i = -w2 / 2 + 10; i < w2 / 2; i += 20) { px(i, -30, 1, 32, faceD); px(i + 1, -30, 1, 12, faceL); }
        for (let i = 0; i < 8; i++) { const sxx = -w2 / 2 + ihash(i, 51) * w2; px(sxx, -26, 1, 6 + ihash(i, 52) * 16, mixColor(face, '#2a3a30', 0.4)); }
        // cracks appear as you work on it
        if (dmg > 0.15) for (let i = 0; i < Math.round(dmg * 12); i++) { const cx2 = -w2 / 2 + ihash(i, 61) * w2, cy2 = -28 + ihash(i, 62) * 22; px(cx2, cy2, 1, 3 + ihash(i, 63) * 7, '#2a2c30'); px(cx2 + 1, cy2 + 2, 2, 1, '#2a2c30'); }
        if (dmg > 0.5) { px(-w2 / 2 + w2 * 0.3, -30, w2 * 0.18, 6, 'rgba(0,0,0,0.55)'); }
        // capping stone and railing
        px(-w2 / 2 - 2, -34, w2 + 4, 4, cap);
        px(-w2 / 2 - 2, -34, w2 + 4, 1, faceL);
        for (let i = -w2 / 2; i <= w2 / 2; i += 9) px(i, -44, 1, 10, '#3f444a');
        px(-w2 / 2, -45, w2, 2, '#4a5058');
        px(-w2 / 2, -40, w2, 1, '#4a5058');
        // harbour lamps looking out over the water
        for (const lp of this.lamps) {
          px(lp.ox - 1, -66, 2, 22, '#3a4046');
          px(lp.ox - 4, -70, 8, 4, '#2e3338');
          if (lp.on) {
            px(lp.ox - 3, -68, 6, 2, '#ffe6a0');
            ctx.globalCompositeOperation = 'lighter';
            const g2 = ctx.createRadialGradient(lp.ox, -64, 2, lp.ox, -64, 46);
            g2.addColorStop(0, 'rgba(255,230,160,0.26)'); g2.addColorStop(1, 'rgba(255,230,160,0)');
            ctx.fillStyle = g2; ctx.fillRect(lp.ox - 46, -66, 92, 92);
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        break;
      }
      case 'sign': { this.name = 'WARNING SIGN'; this.hp = 20; this.r = 8 * this.ss; break; }
      case 'console': { this.name = 'CONSOLE'; this.hp = 26; this.r = 9 * this.ss; break; }
      case 'seawall': {
        this.name = 'SEAWALL'; this.hp = 260; this.r = 40 * this.ss; this.w = 80 * this.ss;
        this.lamps = [-26, 0, 26].map(o => ({ ox: o * this.ss, on: chance(0.8) }));
        break;
      }
      case 'campfire': { this.name = 'CAMPFIRE'; this.hp = 20; this.r = 10 * this.ss; break; }
      case 'tank': { this.name = 'CONTAINMENT TANK'; this.hp = 999; this.r = 40; this.cracks = 0; this.broken = false; break; }
      case 'grate': { this.name = 'OUTFALL GRATE'; this.hp = 46; this.armor = 0; this.r = 30; this.broken = false; break; }
      case 'shop': { this.name = 'BAIT SHOP'; this.hp = 300; this.deckY = -20; this.w = 96; this.r = 60 * this.ss; this.pilings = []; for (let i = 0; i < 5; i++) this.pilings.push({ ox: -40 + i * 20, hp: 60, dead: false }); break; }
      case 'campsite': { this.name = 'CAMPSITE'; this.hp = 90; this.r = 44 * this.ss; this.tent = Math.floor(this.seed * 3); break; }
    }
    this.maxHp = this.hp;
    this.y = kind === 'crabtrap' ? World.surface(x) : kind === 'buoy' ? World.surface(x) : World.floorY(x);
    if (kind === 'dock' || kind === 'stilthouse' || kind === 'tower' || kind === 'campfire' || kind === 'shop' || kind === 'campsite' || kind === 'tank') this.y = World.floorY(x);
    if (kind === 'grate') this.y = World.floorY(x);
  }
  addOccupant(type, ox, oy, pose) { const sp = SPECIES[type] || SPECIES.tourist; this.occupants.push({ type, ox, oy, alive: true, t: rand(10), flash: 0, rig: rigOf(sp, randi(0, 7)), h: gsOf(sp), pose: pose || 'stand' }); }
  get alivePeople() { return this.occupants.filter(o => o.alive); }
  occPos(o) { return [this.x + o.ox * this.ss, this.y + o.oy * this.ss - o.h * 0.5]; }
  hitTest(x, y, r) {
    if (this.collapsed) return false;
    if (this.kind === 'grate') return !this.broken && Math.abs(x - this.x) < r + 26 && y > this.y - 110 && y < this.y + 16;
    if (this.kind === 'tank') return false;
    for (const o of this.alivePeople) { const [px, py] = this.occPos(o); if (Math.abs(x - px) < r + o.h * 0.18 && Math.abs(y - py) < r + o.h * 0.5) return true; }
    if (this.pilings) { for (const p of this.pilings) { if (p.dead) continue; if (Math.abs(x - (this.x + p.ox * this.ss)) < r + 4 * this.ss && y > this.y + (this.deckY || -10) * this.ss && y < World.floorY(this.x) + 4) return true; } }
    if (this.kind === 'crabtrap' || this.kind === 'buoy' || this.kind === 'sign') return dist(x, y, this.x, this.y) < r + this.r;
    return false;
  }
  nearestDist(x, y) { return Math.max(0, dist(x, y, this.x, this.y) - this.r); }
  onBite(P, sx, sy, dx, dy) {
    if (this.kind === 'grate') {
      if (this.broken) return;
      this.hp -= Math.max(7, P.biteDmg * 1.5); this.flash = 0.1;
      G.fx.sparks(sx, sy, 10, dx, dy); SFX.clank(this.pan); G.shake(5); G.hitstop(0.05);
      G.fx.add({ type: 'splinter', x: sx, y: sy, vx: rand(-90, 90), vy: -rand(30, 120), s: 1, w: 3, color: '#8a8a84', rot: rand(TAU), vr: rand(-8, 8), life: 3 });
      if (this.hp <= 0) {
        this.broken = true; G.shake(14); SFX.splinter(this.pan); SFX.thud(this.pan); G.slowmo(0.4, 0.6); G.whiteFlash(0.3);
        for (let i = 0; i < 22; i++) G.fx.add({ type: 'splinter', x: this.x + rand(-14, 14), y: this.y - rand(0, 70), vx: rand(-160, 160), vy: -rand(40, 200), s: randi(1, 3), w: randi(3, 7), color: choice(['#8a8a84', '#6a6a64', '#a8a89c']), rot: rand(TAU), vr: rand(-9, 9), life: 6 });
        Water.splash(this.x, 160, 40);
        if (G.intro) { G.intro.phase = 'out'; G.banner = { text: 'THE EVERGLADES', sub: 'EAT. GROW. NEVER GO BACK.', t: 5, max: 5, color: '#9ad8b0' }; }
      }
      return;
    }
    // people first
    for (const o of this.alivePeople) {
      const [px, py] = this.occPos(o);
      if (Math.abs(sx - px) < P.biteRange + o.h * 0.2 && Math.abs(sy - py) < P.biteRange + o.h * 0.5) { this.eatOccupant(o, P, dx, dy); return; }
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
    if (this.pilings) { let best = 1e9; for (const p of this.pilings) { if (p.dead) continue; const d = Math.abs(sx - (this.x + p.ox * this.ss)); if (d < best) { best = d; hitP = p; } } }
    G.fx.splinters(sx, sy, 12, 120); SFX.splinter(this.pan); G.hitstop(0.05); G.shake(5);
    G.fx.text(sx, sy - 12, choice(['CRACK!', 'SPLINTER!', 'CRUNCH!']), { color: '#e0c080' });
    Meta.event('crack');
    if (hitP) { hitP.hp -= dmg; if (hitP.hp <= 0) { hitP.dead = true; G.fx.splinters(this.x + hitP.ox * this.ss, this.y, 16, 140); G.shake(7); } }
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
    if (P) { G.stats.structures = (G.stats.structures || 0) + 1; Missions.onWreck(); }
  }
  update(dt) {
    this.tick(dt);
    const P = G.player, night = 1 - World.light(G.day);
    this.lightOn = night > 0.45;
    if (this.collapsed) { this.collapseT += dt; if (this.collapseT > 8) this.remove = true; if (chance(dt * 2)) G.fx.bubbles(this.x + rand(-20, 20), World.surface(this.x) + 6, 1, 4); return; }
    if (this.kind === 'crabtrap') { this.y = World.surface(this.x); }
    if (this.kind === 'buoy') { this.y = World.surface(this.x) - 4; }
    if ((this.kind === 'campfire' || this.kind === 'campsite') && chance(dt * 22)) G.fx.add({ type: 'smoke', x: this.x + rand(-2, 2) * this.ss, y: this.y - 6 * this.ss, vx: rand(-6, 6), vy: -rand(14, 28), s: rand(1.5, 3), color: '#6a6a6a', life: rand(0.8, 1.8), t: 0, maxLife: 1.4 });
    if ((this.kind === 'campfire' || this.kind === 'campsite') && this.lightOn) G.fx.glow(this.x + (this.kind === 'campsite' ? 41 * this.ss : 0), this.y - 4 * this.ss, (14 + Math.sin(this.t * 9) * 3) * this.ss, '#ff8020', 0.12);
    for (const o of this.alivePeople) {
      o.t += dt; if (o.panic > 0) o.panic -= dt;
      if (!P.dead && P.size > 1.2 && dist(P.x, P.y, this.x + o.ox * this.ss, this.y + o.oy * this.ss) < 90 + this.r && chance(dt * 0.35)) { o.panic = 2; SFX.yell(this.pan); }
    }
  }
  draw(ctx) {
    const f = this.kind === 'dock' || this.kind === 'boatramp' ? (this.dir || 1) : 1;
    const y = this.y, fy = World.floorY(this.x), sag = this.collapsed ? Math.min(1, this.collapseT * 0.9) : 0, ss = this.ss;
    ctx.save(); ctx.translate(this.x, y); ctx.scale(ss, ss);
    if (sag) { ctx.rotate(sag * 0.4 * f); ctx.translate(0, sag * 14); ctx.globalAlpha = Math.max(0, 1 - this.collapseT / 8); }
    const wood = '#6b5033', woodD = '#4a3524', woodL = '#8a6a44';
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const piling = (ox, top, bot, dead) => {
      if (dead) { ctx.fillStyle = woodD; ctx.fillRect(Math.round(ox - 2), Math.round(bot - 6), 4, 6); ctx.fillStyle = '#3a2a18'; ctx.fillRect(Math.round(ox - 2), Math.round(bot - 7), 4, 2); return; }
      ctx.fillStyle = woodD; ctx.fillRect(Math.round(ox - 2), Math.round(top), 4, Math.round(bot - top));
      ctx.fillStyle = wood; ctx.fillRect(Math.round(ox - 2), Math.round(top), 2, Math.round(bot - top));
      // algae at the waterline
      ctx.fillStyle = '#3a5a3a'; ctx.fillRect(Math.round(ox - 2), Math.round((World.surface(this.x + ox * ss) - y) / ss), 4, 3);
    };
    switch (this.kind) {
      case 'dock': {
        const L = this.len, dY = this.deckY;
        for (const p of this.pilings) piling(p.ox, dY, (fy - y) / ss, p.dead);
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
        for (const p of this.pilings) piling(p.ox, dY, (fy - y) / ss, p.dead);
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
        const bot = (this.deep - y) / ss;
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
      case 'seawall': {
        const w2 = this.w, dmg = 1 - clamp(this.hp / 260, 0, 1);
        const face = '#6b6d74', faceL = '#8a8c92', faceD = '#43454c', cap = '#7d8088';
        px(-w2 / 2, -30, w2, 32, face);
        px(-w2 / 2, -30, w2, 2, faceL);
        px(-w2 / 2, -2, w2, 3, faceD);
        // panel joints and staining down the face
        for (let i = -w2 / 2 + 10; i < w2 / 2; i += 20) { px(i, -30, 1, 32, faceD); px(i + 1, -30, 1, 12, faceL); }
        for (let i = 0; i < 8; i++) { const sxx = -w2 / 2 + ihash(i, 51) * w2; px(sxx, -26, 1, 6 + ihash(i, 52) * 16, mixColor(face, '#2a3a30', 0.4)); }
        // cracks appear as you work on it
        if (dmg > 0.15) for (let i = 0; i < Math.round(dmg * 12); i++) { const cx2 = -w2 / 2 + ihash(i, 61) * w2, cy2 = -28 + ihash(i, 62) * 22; px(cx2, cy2, 1, 3 + ihash(i, 63) * 7, '#2a2c30'); px(cx2 + 1, cy2 + 2, 2, 1, '#2a2c30'); }
        if (dmg > 0.5) { px(-w2 / 2 + w2 * 0.3, -30, w2 * 0.18, 6, 'rgba(0,0,0,0.55)'); }
        // capping stone and railing
        px(-w2 / 2 - 2, -34, w2 + 4, 4, cap);
        px(-w2 / 2 - 2, -34, w2 + 4, 1, faceL);
        for (let i = -w2 / 2; i <= w2 / 2; i += 9) px(i, -44, 1, 10, '#3f444a');
        px(-w2 / 2, -45, w2, 2, '#4a5058');
        px(-w2 / 2, -40, w2, 1, '#4a5058');
        // harbour lamps looking out over the water
        for (const lp of this.lamps) {
          px(lp.ox - 1, -66, 2, 22, '#3a4046');
          px(lp.ox - 4, -70, 8, 4, '#2e3338');
          if (lp.on) {
            px(lp.ox - 3, -68, 6, 2, '#ffe6a0');
            ctx.globalCompositeOperation = 'lighter';
            const g2 = ctx.createRadialGradient(lp.ox, -64, 2, lp.ox, -64, 46);
            g2.addColorStop(0, 'rgba(255,230,160,0.26)'); g2.addColorStop(1, 'rgba(255,230,160,0)');
            ctx.fillStyle = g2; ctx.fillRect(lp.ox - 46, -66, 92, 92);
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        break;
      }
      case 'sign': {
        // post, board, red header, then two 7px text rows that do not collide
        ctx.fillStyle = '#6b5033'; ctx.fillRect(-1, -12, 2, 12);
        ctx.fillStyle = '#8a6a44'; ctx.fillRect(-1, -12, 1, 12);
        ctx.fillStyle = '#e8e8d8'; ctx.fillRect(-14, -31, 28, 19);
        ctx.fillStyle = '#f6f6ec'; ctx.fillRect(-14, -31, 28, 2);
        ctx.fillStyle = '#c02020'; ctx.fillRect(-14, -31, 28, 4);
        ctx.fillStyle = '#8a1414'; ctx.fillRect(-14, -28, 28, 1);
        Font.draw(ctx, 'NO', 0, -26, { color: '#202020', align: 'center' });
        Font.draw(ctx, 'SWIM', 0, -19, { color: '#202020', align: 'center' });
        break;
      }
      case 'console': {
        // lab monitor bank on a stand: the thing the coats watched you through
        const lit = this.hp > 0;
        ctx.fillStyle = '#3a4246'; ctx.fillRect(-3, -12, 6, 12);
        ctx.fillStyle = '#2a3034'; ctx.fillRect(-9, -3, 18, 3);
        ctx.fillStyle = '#20282c'; ctx.fillRect(-15, -30, 30, 18);
        ctx.fillStyle = '#39454a'; ctx.fillRect(-15, -30, 30, 1);
        ctx.fillStyle = '#141a1c'; ctx.fillRect(-13, -28, 26, 14);
        if (lit) {
          ctx.fillStyle = '#123a2a'; ctx.fillRect(-13, -28, 26, 14);
          ctx.fillStyle = '#2fd08a';
          for (let i = 0; i < 5; i++) { const w = 4 + ((i * 7 + Math.floor(this.t * 2 + i)) % 16); ctx.fillRect(-11, -26 + i * 3, w, 1); }
          ctx.fillStyle = 'rgba(120,255,200,0.13)';
          for (let i = 0; i < 7; i++) ctx.fillRect(-13, -28 + i * 2, 26, 1);
          ctx.fillStyle = Math.sin(this.t * 4) > 0 ? '#ff5030' : '#5a2018'; ctx.fillRect(11, -11, 3, 2);
          ctx.fillStyle = '#40ff80'; ctx.fillRect(6, -11, 3, 2);
        }
        ctx.fillStyle = '#39454a'; ctx.fillRect(-11, -11, 22, 4);
        ctx.fillStyle = '#1c2226';
        for (let i = 0; i < 9; i++) ctx.fillRect(-10 + i * 2.4, -10, 1, 1);
        break;
      }
      case 'shop': {
        const W2 = this.w, dY = this.deckY;
        for (const p of this.pilings) piling(p.ox, dY, (fy - y) / this.ss, p.dead);
        px(-W2 / 2 - 4, dY, W2 + 8, 4, woodD); px(-W2 / 2 - 4, dY, W2 + 8, 2, wood);
        px(-W2 / 2 + 3, dY - 40, W2 - 6, 40, '#8a7048'); for (let i = 0; i < 40; i += 5) px(-W2 / 2 + 3, dY - 40 + i, W2 - 6, 1, '#7a6040');
        px(-W2 / 2 + 3, dY - 40, W2 - 6, 2, '#9a8058');
        ctx.fillStyle = '#7a3a2a'; ctx.beginPath(); ctx.moveTo(-W2 / 2 - 10, dY - 40); ctx.lineTo(0, dY - 58); ctx.lineTo(W2 / 2 + 10, dY - 40); ctx.closePath(); ctx.fill();
        px(-W2 / 2 - 10, dY - 41, W2 + 20, 3, '#94493a');
        px(-30, dY - 76, 60, 16, '#e8e0c8'); px(-30, dY - 76, 60, 3, '#c04040'); px(-30, dY - 63, 60, 3, '#c04040');
        px(-2, dY - 60, 4, 20, '#5a4632');
        Font.draw(ctx, 'BAIT', 0, dY - 73, { color: '#2a2018', align: 'center' });
        Font.draw(ctx, 'BEER', 0, dY - 68, { color: '#2a2018', align: 'center' });
        px(-W2 / 2 + 10, dY - 32, 34, 17, this.lightOn ? '#ffd070' : '#3a4a4a');
        px(-W2 / 2 + 8, dY - 16, 40, 3, '#a08050'); px(-W2 / 2 + 8, dY - 15, 40, 1, '#c0a070');
        px(W2 / 2 - 26, dY - 30, 16, 30, '#5a4632'); px(W2 / 2 - 24, dY - 27, 12, 12, this.lightOn ? '#ffd070' : '#2a3a3a');
        px(-W2 / 2 + 6, dY - 9, 13, 9, '#d8d8d0'); px(-W2 / 2 + 6, dY - 9, 13, 2, '#f0f0e8');
        px(W2 / 2 - 44, dY - 8, 10, 8, '#e04040'); px(W2 / 2 - 44, dY - 8, 10, 2, '#f0f0e8');
        for (let i = 0; i < 3; i++) px(W2 / 2 - 20 + i * 6, dY - 7, 5, 7, i % 2 ? '#3a6ab0' : '#e0c040');
        if (this.lightOn) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,200,90,0.12)'; ctx.beginPath(); ctx.arc(0, dY - 24, 70, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; px(-4, dY - 44, 8, 3, '#ffe090'); }
        break;
      }
      case 'campsite': {
        const tc = [['#d84a4a', '#f07a6a'], ['#4a8ad8', '#7ab0f0'], ['#e0b040', '#f0d070']][this.tent % 3];
        ctx.fillStyle = tc[0]; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-22, -30, 0, -32); ctx.quadraticCurveTo(22, -30, 26, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = tc[1]; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-22, -30, 0, -32); ctx.quadraticCurveTo(-8, -18, -10, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2a2a26'; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-7, -20, 0, -22); ctx.quadraticCurveTo(7, -20, 9, 0); ctx.closePath(); ctx.fill();
        px(-27, -2, 54, 3, shade(tc[0], 0.6));
        px(-34, -1, 7, 2, '#c0c0b0'); px(27, -1, 7, 2, '#c0c0b0');
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI, rx = 40 + Math.cos(a) * 11; px(rx - 2, -3 + Math.sin(a) * 2, 4, 3, i % 2 ? '#6a6a64' : '#57574f'); }
        px(36, -6, 10, 3, '#5a4632'); px(38, -9, 7, 3, '#6f5a40');
        if (this.lightOn) { const fl = 5 + Math.sin(this.t * 11) * 2; ctx.fillStyle = '#ff8020'; ctx.beginPath(); ctx.moveTo(37, -6); ctx.lineTo(41, -6 - fl); ctx.lineTo(45, -6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.moveTo(39, -6); ctx.lineTo(41, -6 - fl * 0.6); ctx.lineTo(43, -6); ctx.closePath(); ctx.fill(); }
        px(-48, -9, 13, 9, '#d8d8d0'); px(-48, -9, 13, 2, '#f0f0e8');
        px(54, -8, 10, 8, '#e04040'); px(54, -8, 10, 2, '#f0f0e8');
        for (let i = 0; i < 2; i++) { const cx2 = 60 + i * 12; px(cx2, -13, 2, 13, '#5a5a54'); px(cx2 - 4, -15, 10, 3, '#4a8a5a'); }
        break;
      }
      case 'tank': {
        const bh = 104, bw = 74, crack = this.cracks;
        // pedestal and pipes
        px(-bw / 2 - 6, -10, bw + 12, 12, '#3a4448'); px(-bw / 2 - 6, -10, bw + 12, 3, '#4e5a5e');
        px(-bw / 2 - 2, -bh - 16, bw + 4, 14, '#41494d'); px(-bw / 2 - 2, -bh - 16, bw + 4, 3, '#59656a');
        for (const ox of [-bw / 2 + 6, bw / 2 - 10]) { px(ox, -bh - 30, 5, 16, '#4a5458'); px(ox, -bh - 30, 2, 16, '#5e6a6e'); }
        if (!this.broken) {
          // acid column with a lit meniscus
          ctx.globalAlpha = 0.85; ctx.fillStyle = '#2f7a44'; ctx.fillRect(Math.round(-bw / 2), Math.round(-bh - 2), bw, bh);
          ctx.fillStyle = '#3f9a54'; ctx.fillRect(Math.round(-bw / 2), Math.round(-bh - 2), bw, 6);
          ctx.globalAlpha = 0.35; ctx.fillStyle = '#8ce8a0';
          for (let i = 0; i < 7; i++) { const by = -6 - ((this.t * 22 + i * 31) % (bh - 10)); ctx.fillRect(Math.round(-bw / 2 + 6 + ihash(i, 3) * (bw - 14)), Math.round(by), 2, 3); }
          ctx.globalAlpha = 1;
          // glass: highlight bands and a dark rim
          ctx.globalAlpha = 0.22; ctx.fillStyle = '#cfeef4'; ctx.fillRect(Math.round(-bw / 2 + 5), Math.round(-bh), 5, bh - 4); ctx.fillRect(Math.round(bw / 2 - 12), Math.round(-bh), 3, bh - 4); ctx.globalAlpha = 1;
          ctx.strokeStyle = '#9fc4cc'; ctx.lineWidth = 2; ctx.strokeRect(Math.round(-bw / 2), Math.round(-bh - 2), bw, bh);
          // cracks grow with every hit
          if (crack > 0) {
            ctx.strokeStyle = '#e8f4f8'; ctx.lineWidth = 1;
            for (let k = 0; k < crack * 4; k++) {
              const a = ihash(k, 11) * TAU, len = 6 + ihash(k, 12) * 16 * crack;
              ctx.beginPath(); ctx.moveTo(0, -bh / 2); ctx.lineTo(Math.cos(a) * len, -bh / 2 + Math.sin(a) * len); ctx.stroke();
            }
          }
        } else {
          ctx.strokeStyle = '#7f9aa2'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-bw / 2, -bh - 2); ctx.lineTo(-bw / 2, -bh * 0.45); ctx.lineTo(-bw / 2 + 9, -bh * 0.2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bw / 2, -bh - 2); ctx.lineTo(bw / 2, -bh * 0.5); ctx.lineTo(bw / 2 - 7, -bh * 0.25); ctx.stroke();
          px(-bw / 2 - 2, -bh - 4, bw + 4, 3, '#9fc4cc');
        }
        // label plate
        px(-26, -bh - 30, 52, 13, '#d8d4c4'); px(-26, -bh - 30, 52, 3, '#c04040');
        Font.draw(ctx, 'SUBJECT 7', 0, -bh - 26, { color: '#2a2018', align: 'center' });
        break;
      }
      case 'grate': {
        if (this.broken) { px(-16, -74, 4, 14, '#6a6a64'); px(12, -20, 4, 20, '#6a6a64'); break; }
        px(-22, -84, 44, 8, '#4a4a44'); px(-22, -84, 44, 2, '#6a6a64');
        for (let i = 0; i < 5; i++) { px(-18 + i * 9, -78, 5, 78, this.flash > 0 ? '#ffffff' : '#7a7a72'); px(-18 + i * 9, -78, 2, 78, '#5a5a54'); }
        for (let j = 0; j < 3; j++) px(-22, -66 + j * 24, 44, 4, '#6a6a64');
        px(-24, -86, 6, 88, '#3a3a36'); px(20, -86, 6, 88, '#3a3a36');
        const f = 1 - clamp(this.hp / this.maxHp, 0, 1);
        if (f > 0.2) { ctx.strokeStyle = '#c8c8c0'; ctx.lineWidth = 1; for (let k = 0; k < f * 8; k++) { const a = ihash(k, 7) * TAU; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(Math.cos(a) * 20 * f, -40 + Math.sin(a) * 26 * f); ctx.stroke(); } }
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
    ctx.restore();
    // people, rigged and animated
    for (const o of this.occupants) {
      if (!o.alive) continue;
      const [px, py] = this.occPos(o); const face = o.panic > 0 ? sign(px - G.player.x) || 1 : (o.ox >= 0 ? 1 : -1);
      o.rig.draw(ctx, px, py + o.h * 0.5, face, 0, { phase: o.t, speed: o.panic > 0 ? 0.6 : 0, panic: o.panic > 0 ? 1 : 0, sit: o.pose === 'sit' && o.panic <= 0 ? 1 : 0, cast: o.type === 'fisherman' && o.panic <= 0 ? 1 : 0 }, { scale: o.rig.scale });
      if (o.type === 'fisherman' && !(o.panic > 0)) {
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + face * o.h * 0.5, py - o.h * 0.35); ctx.lineTo(px + face * o.h * 0.9, World.surface(this.x + o.ox + face * o.h * 0.9) + 3 + Math.sin(o.t) * 1); ctx.stroke();
      }
    }
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(ss, ss);
    ctx.restore();
  }
}
// place a structure appropriate to the terrain at x
function trySpawnStructure(x, rng, difficulty) {
  const fy = World.floorY(x), B = Biome.at(x);
  if (!B.structures || !B.structures.length) return false;
  const deepAt = dx => World.floorY(x + dx) > 60;
  const land = fy < -6, open = fy > 70;
  const table = B.structures.filter(([k]) => {
    if (k === 'seawall') return land && (deepAt(110) || deepAt(-110));
    if (k === 'dock') return land && (deepAt(90) || deepAt(-90));
    if (k === 'shop') return land && (deepAt(120) || deepAt(-120));
    if (k === 'stilthouse') return open && fy < 320;
    if (k === 'crabtrap' || k === 'buoy') return open;
    return land;
  });
  if (!table.length) return false;
  let tot = 0; for (const e of table) tot += e[1];
  let r = rng() * tot, kind = table[table.length - 1][0];
  for (const e of table) { r -= e[1]; if (r <= 0) { kind = e[0]; break; } }
  const person = () => (difficulty > 2.4 && rng() < 0.4 ? 'poacher' : rng() < 0.45 ? 'fisherman' : rng() < 0.6 ? 'tourist' : 'camper');
  switch (kind) {
    case 'dock': {
      const s = new Structure(x, 'dock');
      const n = randi(1, 3); for (let i = 0; i < n; i++) s.addOccupant(rng() < 0.6 ? 'fisherman' : 'tourist', s.dir * (16 + i * 20), s.deckY);
      G.add(s);
      if (rng() < 0.45) { const b = new Boat(x + s.dir * (s.len * s.ss + 130), 'jon', -s.dir); b.engineOn = false; b.moored = true; G.add(b); }
      return true;
    }
    case 'shop': {
      const s = new Structure(x, 'shop');
      s.addOccupant('shopkeep', -22, s.deckY);
      const n = randi(1, 3); for (let i = 0; i < n; i++) s.addOccupant(person(), 12 + i * 18, s.deckY);
      G.add(s); return true;
    }
    case 'campsite': {
      const s = new Structure(x, 'campsite');
      const n = randi(1, 3); for (let i = 0; i < n; i++) s.addOccupant(rng() < 0.7 ? 'camper' : 'tourist', 44 + i * 16, 0, 'sit');
      G.add(s);
      if (rng() < 0.4) G.add(new LandAnimal(x + 76, 'dog'));
      return true;
    }
    case 'stilthouse': {
      const s = new Structure(x, 'stilthouse');
      const n = randi(1, 3); for (let i = 0; i < n; i++) s.addOccupant(person(), -18 + i * 17, s.deckY);
      G.add(s); return true;
    }
    case 'tower': { const s = new Structure(x, 'tower'); if (rng() < 0.6) s.addOccupant('ranger', 0, s.deckY); G.add(s); return true; }
    case 'boatramp': G.add(new Structure(x, 'boatramp')); return true;
    case 'crabtrap': G.add(new Structure(x, 'crabtrap')); return true;
    case 'buoy': G.add(new Structure(x, 'buoy')); return true;
    case 'seawall': { const st = new Structure(x, 'seawall'); G.add(st); return true; }
    case 'sign': case 'pipe': G.add(new Structure(x, 'sign')); return true;
  }
  return false;
}
