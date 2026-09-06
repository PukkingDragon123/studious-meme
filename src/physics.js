'use strict';
// ---------------------------------------------------------------------------
// Sandbox physics: a simulated water surface, deformable shore mud with tracks,
// silt plumes, reactive vegetation and weather. Everything here is a small
// spring system; the visuals fall out of the state.
// ---------------------------------------------------------------------------
const Water = {
  DX: 4, N: 720, x0: 0, h: null, v: null, t: 0, wind: 0,
  init(cx) { this.h = new Float32Array(this.N); this.v = new Float32Array(this.N); this.x0 = cx - this.N * this.DX / 2; },
  recenter(cx) {
    const mid = this.x0 + this.N * this.DX / 2, shift = Math.round((cx - mid) / this.DX);
    if (Math.abs(shift) < this.N / 6) return;
    const h = new Float32Array(this.N), v = new Float32Array(this.N);
    for (let i = 0; i < this.N; i++) { const j = i + shift; if (j >= 0 && j < this.N) { h[i] = this.h[j]; v[i] = this.v[j]; } }
    this.h = h; this.v = v; this.x0 += shift * this.DX;
  },
  // background swell the springs ride on: a long roller, a mid wave and fine chop
  ambient(x) {
    const t = this.t, w = this.wind;
    // Most of the energy travels with the wind; one small train runs against it
    // so the field never reads as a single sliding sheet. The mid wave is phase
    // modulated by the long roller, which is what stops the pattern repeating
    // visibly across a screen.
    const roll = Math.sin(x * 0.0083 + t * 0.62);
    let s = roll * (2.6 + w * 3.4)
      + Math.sin(x * 0.019 + t * 1.35 + roll * 1.5) * (2.2 + w * 2.2)
      + Math.sin(x * 0.044 + t * 2.30 + roll * 0.9) * (1.3 + w * 1.6)
      + Math.sin(x * 0.095 - t * 3.9) * (0.5 + w * 0.9);
    // water is not a sine: crests come to a point, troughs are long and flat.
    // Adding a term in s^2 lifts the peaks and fills the hollows; the constant
    // takes the mean back out so the waterline does not climb with the wind.
    const a = 4.4 + w * 5.2;
    return s + 0.2 * (s * s / a - a * 0.42);
  },
  surface(x) {
    if (!this.h) return this.ambient(x);
    const f = (x - this.x0) / this.DX, i = Math.floor(f);
    if (i < 0 || i >= this.N - 1) return this.ambient(x);
    const u = f - i;
    return this.ambient(x) + this.h[i] * (1 - u) + this.h[i + 1] * u;
  },
  // vertical velocity of the surface at x (for foam and spray)
  velocity(x) { if (!this.h) return 0; const f = (x - this.x0) / this.DX, i = Math.floor(f); if (i < 0 || i >= this.N - 1) return 0; const u = f - i; return this.v[i] * (1 - u) + this.v[i + 1] * u; },
  update(dt) {
    if (!this.h) return; this.t += dt;
    const h = this.h, v = this.v, N = this.N;
    dt = Math.min(dt, 1 / 30);
    // The old solver ran three Laplacian passes without ever advancing h, which
    // is one step of size S*dt, not three of S*dt/3 — far past the CFL limit, so
    // the surface sat in permanent grid-scale chatter held down by clamps.
    // Proper substepping instead: C2 is (cells/sec)^2, and sqrt(C2)*sdt stays
    // well under 1.
    const SUB = 4, sdt = dt / SUB, C2 = 900, K = 16, D = 0.85;
    for (let s = 0; s < SUB; s++) {
      for (let i = 1; i < N - 1; i++) v[i] += (C2 * (h[i - 1] + h[i + 1] - 2 * h[i]) - K * h[i] - D * v[i]) * sdt;
      for (let i = 1; i < N - 1; i++) h[i] += v[i] * sdt;
      // soak waves up at the ends rather than reflecting them back into view
      h[0] = h[1] * 0.55; h[N - 1] = h[N - 2] * 0.55;
      v[0] = v[1] * 0.45; v[N - 1] = v[N - 2] * 0.45;
    }
    for (let i = 0; i < N; i++) { if (h[i] > 60) h[i] = 60; else if (h[i] < -60) h[i] = -60; }
  },
  // push the surface down (force > 0) or up around x
  splash(x, force, width = 14) {
    if (!this.h) return;
    const c = (x - this.x0) / this.DX, w = Math.max(1, width / this.DX);
    const a = Math.max(1, Math.floor(c - w)), b = Math.min(this.N - 2, Math.ceil(c + w));
    for (let i = a; i <= b; i++) { const d = Math.abs(i - c) / w; if (d > 1) continue; const k = 0.5 * (1 + Math.cos(d * Math.PI)); this.v[i] += force * k; }
  },
  // a moving body dragging the surface along
  wake(x, vx, size, dt) { if (Math.abs(vx) < 20) return; this.splash(x, clamp(Math.abs(vx) * 0.13, 3, 30) * size * dt * 60 * 0.14, 12 * size); this.splash(x - sign(vx) * 13 * size, -clamp(Math.abs(vx) * 0.08, 2, 20) * size * dt * 60 * 0.14, 10 * size); },
  // steepness of the surface at x, for crest foam
  slope(x) { return (this.surface(x + 4) - this.surface(x - 4)) / 8; },
};

// shore mud: a recovering depression field along x, plus footprints
const Mud = {
  DX: 6, N: 400, x0: 0, d: null,
  init(cx) { this.d = new Float32Array(this.N); this.x0 = cx - this.N * this.DX / 2; },
  recenter(cx) {
    const mid = this.x0 + this.N * this.DX / 2, shift = Math.round((cx - mid) / this.DX);
    if (Math.abs(shift) < this.N / 6) return;
    const d = new Float32Array(this.N);
    for (let i = 0; i < this.N; i++) { const j = i + shift; if (j >= 0 && j < this.N) d[i] = this.d[j]; }
    this.d = d; this.x0 += shift * this.DX;
  },
  depth(x) { if (!this.d) return 0; const f = (x - this.x0) / this.DX, i = Math.floor(f); if (i < 0 || i >= this.N - 1) return 0; const u = f - i; return this.d[i] * (1 - u) + this.d[i + 1] * u; },
  // how soft the ground is at x: 1 at the waterline, 0 well inland or under deep water
  softness(x) { const fy = World.floorY(x); if (fy > 0) return clamp(1 - fy / 60, 0, 1) * 0.6; return clamp(1 + fy / 45, 0, 1); },
  press(x, amount, width = 10) {
    if (!this.d) return; const soft = this.softness(x); if (soft <= 0) return;
    const c = (x - this.x0) / this.DX, w = Math.max(1, width / this.DX);
    const a = Math.max(0, Math.floor(c - w)), b = Math.min(this.N - 1, Math.ceil(c + w));
    for (let i = a; i <= b; i++) { const k = 1 - Math.abs(i - c) / w; if (k <= 0) continue; const target = amount * soft * k; if (this.d[i] < target) this.d[i] = Math.min(target, this.d[i] + target * 0.3); }
  },
  update(dt) { if (!this.d) return; const r = Math.exp(-0.06 * dt); for (let i = 0; i < this.N; i++) this.d[i] *= r; },
};

// weather: rain showers roll through, with lightning
const Weather = {
  rain: 0, target: 0, timer: 40, thunder: 0, flash: 0, wind: 0,
  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) { if (this.target > 0) { this.target = 0; this.timer = rand(70, 200); } else { this.target = rand(0.4, 1); this.timer = rand(30, 75); } }
    this.rain = approach(this.rain, this.target, dt * 0.12);
    this.wind = lerp(this.wind, this.rain * 0.8, dt * 0.2); Water.wind = this.wind;
    if (this.flash > 0) this.flash -= dt * 3;
    if (this.rain > 0.6 && chance(dt * 0.05 * this.rain)) { this.flash = 1; this.thunder = rand(0.6, 2.2); SFX.lightning && SFX.lightning(); }
    if (this.thunder > 0) { this.thunder -= dt; if (this.thunder <= 0) SFX.thunder && SFX.thunder(); }
  },
  // rain drops around the camera; each drop that hits the surface disturbs it
  spawn(dt, cam) {
    if (this.rain <= 0.02) return;
    const W = G.W, n = Math.round(this.rain * 90 * dt * 60 / 60 * 4);
    for (let i = 0; i < n; i++) {
      const wx = cam.toWorldX(rand(-40, W + 40));
      if (World.isIndoor(wx)) continue;  // there is a roof over the lab and the sewer
      const top = cam.toWorld(0, -10)[1];
      G.fx.add({ type: 'rain', x: wx, y: Math.min(top, -300) + rand(-60, 0), vx: -this.wind * 60 + rand(-8, 8), vy: rand(420, 520), life: 3 });
    }
  },
};

// reactive plants: decor items get a bend spring that things push on
const Foliage = {
  // apply a push to plants near (x, y) moving with vx; r is the body radius
  disturb(x, y, vx, r) {
    const D = World.decor; if (!D.length) return;
    // decor is sorted by x: find the window
    let lo = 0, hi = D.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (D[m].x < x - r - 20) lo = m + 1; else hi = m; }
    for (let i = lo; i < D.length; i++) {
      const d = D[i]; if (d.x > x + r + 20) break;
      const k = FOLIAGE_KIND[d.type]; if (!k) continue;
      const top = k.top(d), base = d.y;
      if (y < Math.min(top, base) - 6 || y > Math.max(top, base) + 6) continue;
      // fall off with distance so a passing body parts the bed rather than
      // snapping every stem in the window by the same amount
      const near = clamp(1 - Math.abs(d.x - x) / (r + 20), 0, 1);
      const push = clamp(vx * 0.075, -9, 9) + (x < d.x ? 1.8 : -1.8);
      d.bv = (d.bv || 0) + push * 5.5 * (0.35 + near * 0.65);
      if (k.water && Math.abs(vx) > 90 && chance(0.12)) G.fx.bubbles(d.x, y, 1, 4);
      if (k.tree && Math.abs(vx) > 60) { d.shake = 1; if (chance(0.5)) G.fx.leaf(d.x + rand(-14, 14), top + rand(0, 20), k.leaf || '#4f7a2a'); }
      if (k.water && chance(0.3)) G.fx.bubbles(d.x, y, 1, 3);
    }
  },
  update(dt) {
    const D = World.decor;
    for (const d of D) {
      if (d.bv === undefined && !d.shake) continue;
      d.bend = (d.bend || 0); d.bv = (d.bv || 0);
      d.bv += (-d.bend * 15 - d.bv * 2.4) * dt; d.bend += d.bv * dt;
      if (d.bend > 1.6) d.bend = 1.6; else if (d.bend < -1.6) d.bend = -1.6;
      if (d.shake) { d.shake = Math.max(0, d.shake - dt * 1.6); }
      if (Math.abs(d.bend) < 0.02 && Math.abs(d.bv) < 0.02 && !d.shake) { d.bend = 0; d.bv = 0; }
    }
  },
};
const FOLIAGE_KIND = {
  weed: { top: d => d.y - d.h, water: true }, algae: { top: d => d.y - d.h, water: true }, reed: { top: d => d.top }, cattail: { top: d => d.top },
  sawgrass: { top: d => d.y - 12 * d.s }, seagrass: { top: d => d.y - d.h, water: true }, mushroom: { top: d => d.y - 6 }, palmetto: { top: d => d.y - 16 * d.s }, fern: { top: d => d.y - 13 * d.s }, bush: { top: d => d.y - 12 * d.s },
  hyacinth: { top: d => -10, water: true }, duckweed: { top: d => -3, water: true }, lily: { top: d => -3, water: true },
  cypress: { top: d => d.y - d.h, tree: true, leaf: '#3a6a30' }, oak: { top: d => d.y - d.h, tree: true, leaf: '#4a7a3a' }, palm: { top: d => d.y - d.h, tree: true, leaf: '#5a8a3a' },
  mangrove: { top: d => d.y - 30 * d.s, tree: true, leaf: '#3f7a3a' }, vine: { top: d => d.y - d.h }, flower: { top: d => d.y - 10 },
};
