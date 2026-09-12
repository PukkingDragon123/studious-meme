'use strict';
// ---------------------------------------------------------------------------
// BEING SEEN.
//
// A crocodile's whole life is the difference between being in the water and
// being in the open. This file is that difference, made into a number.
//
// CONCEALMENT is what the water is doing for you right now: how deep you are,
// whether there is weed over you, whether there is a roof, how dark the biome
// is, how much of a wake you are pushing. It is not a stat you buy. It is
// where you chose to be and how fast you chose to move.
//
// The ALARM is what the people on the surface have worked out. It only goes
// up when somebody actually sees something, and it comes down slowly while
// nobody does. Past three quarters the site calls it in, and a capture crew
// comes out with a net gun. A net that holds is not death — it is worse. It is
// going back in the tank.
// ---------------------------------------------------------------------------
const ALARM_STAGES = [
  { at: 0.00, id: 'calm', name: 'UNSEEN', col: '#4f9f90' },
  { at: 0.30, id: 'suspicious', name: 'SOMETHING IN THE WATER', col: '#e0c040' },
  { at: 0.62, id: 'alarmed', name: 'SIGHTED', col: '#ff8c40' },
  { at: 0.88, id: 'hunt', name: 'CAPTURE CREW INBOUND', col: '#ff4030' },
];

const Alarm = {
  level: 0, prev: 0, state: 'calm', flashT: 0, crew: null, crewT: 0,
  lastSeenX: 0, lastSeenY: 0, seenT: 0, quietT: 0, calls: 0,
  reset() {
    this.level = 0; this.prev = 0; this.state = 'calm'; this.flashT = 0;
    this.crew = null; this.crewT = 0; this.seenT = 0; this.quietT = 0; this.calls = 0;
  },
  stage() { let s = ALARM_STAGES[0]; for (const q of ALARM_STAGES) if (this.level >= q.at) s = q; return s; },
  at(id) { return this.stage().id === id; },
  hunting() { return this.level >= 0.88; },

  // ---------- concealment ----------
  // 0 is standing on a bank in daylight. 1 is a shape under four feet of tannin
  // with weed over it. Everything in between is a judgement you are making.
  concealment(P) {
    if (!P || P.dead) return 1;
    const surf = World.surface(P.x), fy = World.floorY(P.x);
    let c = 0;
    // depth under the surface is most of it
    const depth = P.y - surf;
    const B0 = Biome.at(P.x);
    // Clear water does not hide anything. On the shelf you are a shadow on
    // white sand from fifty feet up, and the only thing that helps is getting
    // something solid between you and the sky.
    const clarity = (B0 && B0.clarity) || 0;
    if (depth > 0) c += clamp(depth / (24 + 14 * P.vis), 0, 1) * 0.66 * (1 - clarity * 0.8);
    else c -= 0.16;                                    // hauled out in the open
    // a roof over the water is a roof over you
    const roof = World.roofY(P.x);
    if (roof !== null) c += 0.32;
    // how black the water is here, and how late it is
    if (B0 && B0.dark) c += B0.dark * 0.22;
    const night = G.day !== undefined ? clamp(1 - Math.abs(G.day - 0.5) * 2.6, 0, 1) : 0;
    c += night * 0.2;
    // cover you are actually inside: weed, roots, wreckage
    c += clamp(Foliage.coverAt ? Foliage.coverAt(P.x, P.y) : 0, 0, 1) * (0.26 + clarity * 0.4);
    // hard cover: a hull, a reef head, anything you can put between you and up
    for (const e of G.ents) {
      if (e.type !== 'structure' || e.remove) continue;
      if (e.kind !== 'wreck' && e.kind !== 'dock' && e.kind !== 'stilthouse' && e.kind !== 'shop' && e.kind !== 'seawall' && e.kind !== 'bridge') continue;
      if (Math.abs(e.x - P.x) > (e.r || 20) + 18) continue;
      if (P.y < e.y - 40) continue;
      c += 0.3 + clarity * 0.25; break;
    }
    // and everything you give away by moving
    const speed = Math.hypot(P.vx, P.vy);
    c -= clamp(speed / 420, 0, 1) * 0.34;
    if (P.onLand) c -= 0.3;
    if (depth > -4 && depth < 6 && speed > 90) c -= 0.12;   // a wake on the surface
    if (P.st && P.st.stealth) c += (P.st.stealth - 1) * 0.4;
    if (P.lure) c -= 0.25;
    return clamp(c, 0, 1);
  },
  hidden(P) { return this.concealment(P) > 0.58; },

  // ---------- somebody saw something ----------
  // `weight` is how sure they are. A glimpse of a wake is not a man on a bank
  // watching you take a dog.
  notice(weight, e, why) {
    const P = G.player; if (!P || P.dead) return;
    const before = this.level;
    this.level = clamp(this.level + weight, 0, 1);
    this.quietT = 0;
    if (e) { this.lastSeenX = P.x; this.lastSeenY = P.y; }
    if (this.level > before + 0.02) this.flashT = 0.5;
    // crossing a line is an event, not a number ticking over
    const a = ALARM_STAGES.filter(q => before < q.at && this.level >= q.at).pop();
    if (a) {
      this.state = a.id;
      G.banner = { text: a.name, sub: why || '', t: 2.4, max: 2.4, color: a.col };
      if (a.id === 'alarmed') { SFX.warning && SFX.warning(); this.calls++; }
      if (a.id === 'hunt') { SFX.warning && SFX.warning(); this.crewT = 4; }
      if (a.id === 'suspicious') SFX.ui && SFX.ui();
    }
  },
  // a loud thing happened at x: anyone near enough hears it whether or not
  // they were looking
  noise(x, y, radius, weight) {
    for (const e of G.ents) {
      if (!e.human || e.dead) continue;
      if (Math.abs(e.x - x) > radius) continue;
      e.alertT = Math.max(e.alertT || 0, 0.5);
      e.suspectX = x; e.suspectY = y;
    }
    if (weight) this.notice(weight, null, 'NOISE');
  },

  update(dt) {
    const P = G.player;
    if (this.flashT > 0) this.flashT -= dt;
    if (!P || P.dead) return;
    this.quietT += dt;
    // it comes down, but only after they have stopped finding anything, and
    // the more times they have called it in the slower it forgets
    if (this.quietT > 4) {
      const forget = (this.hunting() ? 0.012 : 0.03) / (1 + this.calls * 0.4);
      this.level = Math.max(0, this.level - forget * dt * 60 * 0.016 * 60 * 0.016);
      this.level = Math.max(0, this.level - forget * dt);
    }
    const st = this.stage();
    if (st.id !== this.state && this.level < this.prev) this.state = st.id;
    this.prev = this.level;
    // the crew: called once, and they take a while to get here
    if (this.crewT > 0) {
      this.crewT -= dt;
      if (this.crewT <= 0 && !this.crew) this.callCrew();
    }
    if (this.crew && (this.crew.dead || this.crew.remove)) { this.crew = null; if (this.level > 0.8) this.crewT = 14; }
  },
  callCrew() {
    const P = G.player; if (!P || P.dead) return;
    // put them on open water upwind of you, far enough that you get a moment
    const side = P.x > this.lastSeenX ? 1 : -1;
    let x = World.findX(P.x + side * 420, xx => World.floorY(xx) > 60, 900, 40);
    if (x === null) x = World.findX(P.x - side * 420, xx => World.floorY(xx) > 60, 900, 40);
    if (x === null) return;
    if (typeof CaptureBoat === 'undefined') return;
    this.crew = G.add(new CaptureBoat(x));
    G.banner = { text: 'CAPTURE CREW', sub: 'THEY WANT YOU ALIVE', t: 2.8, max: 2.8, color: '#ff4030' };
  },
};
