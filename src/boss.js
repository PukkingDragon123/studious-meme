'use strict';
// ---------------------------------------------------------------------------
// Boss behaviour that sits on top of whatever the creature already does.
// A boss walks down a set of health thresholds; each crossing is a phase break
// that heals nothing but makes it faster, angrier and louder, and calls in
// help. Below the last threshold it staggers, and a stagger is an invitation:
// close the distance and the fight ends in a button sequence instead of one
// more chomp.
// ---------------------------------------------------------------------------
const Boss = {
  // extra scaling laid on top of the creature's own numbers
  init(e, opts = {}) {
    e.isBoss = true; e.persistent = true;
    e.bossPhase = 1; e.bossMax = opts.phases || 3;
    e.bossSpd = 1; e.bossDmg = 1;
    e.bossBreakT = 0; e.staggerT = 0; e.staggered = false; e.finisherDone = false;
    e.bossAdds = opts.adds || null;
    e.bossTell = 0; e.bossTellT = 0;
    e.hp = e.maxHp = Math.round(e.maxHp * (opts.hp || 1));
    e.bossCue = opts.cue || null;
    return e;
  },
  thresholds(e) {
    const n = e.bossMax;
    const out = [];
    for (let i = 1; i < n; i++) out.push(1 - i / n);
    return out;
  },
  // call once per frame from the boss's own update
  tick(e, dt) {
    if (e.dead) return;
    if (e.bossBreakT > 0) { e.bossBreakT -= dt; e.stun = Math.max(e.stun, 0.05); e.invulnB = true; }
    else e.invulnB = false;
    const frac = e.hp / e.maxHp, th = this.thresholds(e);
    const want = 1 + th.filter(t => frac < t).length;
    if (want > e.bossPhase && e.bossPhase < e.bossMax) this.breakPhase(e, want);
    // the last sliver of health is not a health bar, it is an opening
    if (!e.staggered && !e.finisherDone && frac <= 0.13) this.stagger(e);
    if (e.staggered) {
      e.staggerT -= dt;
      e.stun = Math.max(e.stun, 0.05);
      if (chance(dt * 24)) G.fx.glow(e.x + rand(-16, 16) * e.size, e.y + rand(-12, 12) * e.size, rand(2, 5), '#ffd060', 0.6);
      if (e.staggerT <= 0) this.recover(e, 0.24);
    }
  },
  breakPhase(e, n) {
    e.bossPhase = n;
    e.bossBreakT = 0.9;
    e.bossSpd *= 1.16; e.bossDmg *= 1.28;
    e.hp = Math.max(e.hp, 1);
    G.slowmo(0.22, 0.8); G.shake(14); G.whiteFlash(0.4); G.hitstop(0.1);
    SFX.roar(3, e.pan); SFX.warning && SFX.warning();
    G.fx.shock(e.x, e.y, 70 * Math.sqrt(e.size || 1), '#ff5030', 0.5);
    for (let i = 0; i < 20; i++) G.fx.glow(e.x + rand(-30, 30), e.y + rand(-24, 24), rand(2, 6), '#ff6030', rand(0.3, 0.8));
    G.fx.text(e.x, e.y - 36, 'PHASE ' + n, { color: '#ff5030', scale: 3, life: 1.6 });
    G.banner = { text: e.name, sub: (e.bossCue && e.bossCue[n - 2]) || 'IT IS NOT DONE', t: 2.6, max: 2.6, color: '#ff5030' };
    if (e.bossAdds) this.summon(e);
  },
  summon(e) {
    const kinds = e.bossAdds, P = G.player;
    for (let i = 0; i < 2; i++) {
      const x = e.x + rand(-160, 160), fy = World.floorY(x), su = World.surface(x);
      const k = choice(kinds);
      if (k === 'gator' && fy > su + 40) Spawn.gator(x, clamp(su + 40, su + 10, fy - 20), Math.max(0.9, P.size * 0.55));
      else if (k === 'moccasin' && fy > su + 20) G.add(new Snake(x, su + 6, 'moccasin'));
      else if (k === 'boar') { const bx = World.findX(x, xx => World.floorY(xx) < -5, 700, 30); if (bx !== null) G.add(new LandAnimal(bx, 'boar')); }
      else if (k === 'poacher') { const wx = World.findX(x, xx => World.floorY(xx) > 60, 600, 30); if (wx !== null) Spawn.boat(wx, 'poacher', sign(e.x - x) || 1); }
      else if (fy > su + 40) Spawn.school(x, clamp(su + 50, su + 10, fy - 20), 'bass');
    }
    G.fx.text(e.x, e.y - 24, 'IT CALLED FOR HELP', { color: '#ffa060', life: 1.4 });
  },
  stagger(e) {
    e.staggered = true; e.staggerT = 6;
    e.vx *= 0.2; e.vy *= 0.2;
    G.slowmo(0.3, 0.7); G.shake(9); SFX.roar(2, e.pan);
    G.fx.text(e.x, e.y - 30, 'STAGGERED', { color: '#ffd060', scale: 3, life: 1.8 });
    G.banner = { text: 'FINISH IT', sub: 'GET CLOSE AND BITE', t: 3, max: 3, color: '#ffd060' };
  },
  recover(e, frac) {
    e.staggered = false; e.finisherDone = true; e.staggerT = 0;
    e.hp = Math.max(e.hp, Math.round(e.maxHp * frac));
    e.bossSpd *= 1.15; e.bossDmg *= 1.2; e.stun = 0;
    G.fx.text(e.x, e.y - 30, 'IT GOT UP', { color: '#ff5030', scale: 2, life: 1.6 });
    SFX.roar(3, e.pan); G.shake(10); G.redFlash(0.35);
  },
  // is the player close enough to start the execution?
  canFinish(e) {
    const P = G.player;
    if (!e || e.dead || !e.staggered || P.dead) return false;
    const d = e.nearestDist ? e.nearestDist(P.x, P.y) : dist(P.x, P.y, e.x, e.y);
    return d < 40 + 14 * P.vis;
  },
};

// ---------------------------------------------------------------------------
// The execution. Three to five prompts, each a different button, each with a
// closing window. Miss two and the boss throws you off and gets back up.
// ---------------------------------------------------------------------------
const FIN_KEYS = ['bite', 'dash', 'brace'];
const FIN_LABEL = { bite: 'BITE', dash: 'DASH', brace: 'BRACE' };
const FIN_SHORT = { bite: 'BT', dash: 'DS', brace: 'BR' };
const Finisher = {
  begin(e) {
    const steps = 3 + Math.min(2, (e.bossPhase || 1) - 1);
    const seq = [];
    let last = null;
    for (let i = 0; i < steps; i++) { let k = choice(FIN_KEYS); if (k === last) k = FIN_KEYS[(FIN_KEYS.indexOf(k) + 1) % 3]; seq.push(k); last = k; }
    G.finisher = { e, seq, res: [], i: 0, t: 0, dur: 1.05, hits: 0, misses: 0, flash: 0, over: 0, won: false };
    G.banner = null;
    G.slowmo(0.28, 0.5); G.shake(6); SFX.roar(2.4, e.pan); G.zoomPunch(1.18);
    G.fx.text(G.player.x, G.player.y - 34 * G.player.vis, 'EXECUTION', { color: '#ffd060', scale: 3, life: 1.2 });
    e.vx = 0; e.vy = 0;
  },
  // real-time: the sequence must not stretch with the slow-mo it causes
  update(raw) {
    const F = G.finisher; if (!F) return;
    const e = F.e, P = G.player;
    if (F.over > 0) { F.over -= raw; if (F.over <= 0) this.end(); return; }
    if (!e || e.dead || P.dead) { G.finisher = null; return; }
    if (F.flash > 0) F.flash -= raw;
    // hold the two of them together while it plays
    P.vx *= 0.8; P.vy *= 0.8; e.vx *= 0.8; e.vy *= 0.8;
    P.invuln = Math.max(P.invuln, 0.2);
    F.t += raw;
    F.dur = 1.05 - F.i * 0.11;
    const want = F.seq[F.i];
    let got = null;
    if (Input.bitePressed()) got = 'bite';
    else if (Input.dashPressed()) got = 'dash';
    else if (Input.bracePressed()) got = 'brace';
    if (got) {
      if (got === want) this.score(true); else this.score(false);
    } else if (F.t >= F.dur) this.score(false);
  },
  score(hit) {
    const F = G.finisher, e = F.e, P = G.player;
    F.res.push(hit);
    if (hit) {
      F.hits++;
      G.hitstop(0.06); G.shake(8); SFX.crunch(2, e.pan); SFX.gib(e.pan);
      G.fx.gore(e.x, e.y, 90, 0, 0, true);
      G.fx.text(e.x, e.y - 20 - F.i * 6, choice(['RIP!', 'TEAR!', 'CRUNCH!']), { color: '#fff060', scale: 2, life: 0.8 });
      if (e.bleeds && G.settings.gore) { const l = Gore.limbsOf(e).filter(q => !(e.missing && e.missing.has(q.id))); if (l.length) Gore.tear(e, choice(l).id, rand(-1, 1), rand(-1, 0)); }
    } else {
      F.misses++;
      G.shake(5); G.redFlash(0.3); SFX.hurt && SFX.hurt();
      G.fx.text(P.x, P.y - 24 * P.vis, 'MISSED', { color: '#ff7060', scale: 2, life: 0.8 });
    }
    F.flash = 0.14; F.t = 0; F.i++;
    if (F.misses >= 2) { F.over = 0.4; F.won = false; return; }
    if (F.i >= F.seq.length) { F.over = 0.5; F.won = F.hits >= F.seq.length - 1; }
  },
  end() {
    const F = G.finisher; if (!F) return;
    const e = F.e, P = G.player;
    G.finisher = null;
    if (!e || e.dead) return;
    if (F.won) {
      G.fx.text(e.x, e.y - 40, 'EXECUTED', { color: '#ffd060', scale: 3, life: 2.2 });
      G.slowmo(0.16, 1.4); G.whiteFlash(0.7); G.shake(18); SFX.roar(3, e.pan);
      e.hp = 0;
      P.lastKillHow = 'roll';
      // a boat comes apart rather than dying, and takes its crew with it
      if (e.sink) e.sink(P);
      else { if (e.bleeds && G.settings.gore && Gore.bisect) Gore.bisect(e, P.facing, 0); e.die(P); }
      P.hp = P.maxHp; P.hunger = Math.min(100, P.hunger + 40);
      P.genePoints += 2; P.newPoints += 2;
      G.addScore(8000);
    } else {
      Boss.recover(e, 0.3);
      const dx = sign(P.x - e.x) || 1;
      P.vx = dx * 320; P.vy = -160;
      P.hurt(18 * (e.bossDmg || 1), e, 'crush');
      G.fx.text(P.x, P.y - 26 * P.vis, 'THROWN OFF', { color: '#ff5030', scale: 2, life: 1.4 });
    }
  },
};
