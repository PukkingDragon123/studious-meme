'use strict';
// ---------------------------------------------------------------------------
// A spinning pixel globe for the release-site display. The surface is baked
// once into an equirectangular texture using 3D value noise (so it wraps with
// no seam), then every frame each pixel of the disc is unprojected back to a
// latitude and longitude and sampled. Shaded with a dithered terminator, a
// specular glint on the water and an atmosphere rim.
// ---------------------------------------------------------------------------
function noise3(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const h = (a, b, c) => ihash((Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0, seed);
  const c00 = lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u);
  const c10 = lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u);
  const c01 = lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u);
  const c11 = lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u);
  return lerp(lerp(c00, c10, v), lerp(c01, c11, v), w);
}
function fbm3(x, y, z, seed, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f, seed + i * 977); n += a; a *= 0.5; f *= 2.07; }
  return s / n;
}

const Globe = {
  TW: 220, TH: 110,
  height: null, shade: null, ready: false,
  // bake elevation and a per-texel tint index once
  build() {
    if (this.ready) return;
    const W = this.TW, H = this.TH;
    this.height = new Float32Array(W * H);
    for (let j = 0; j < H; j++) {
      const lat = (j / (H - 1) - 0.5) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (let i = 0; i < W; i++) {
        const lon = (i / W) * TAU;
        const x = cl * Math.cos(lon), y = sl, z = cl * Math.sin(lon);
        // two scales of continent plus a ridge term for coastlines
        let h = fbm3(x * 1.9 + 5, y * 1.9, z * 1.9, 11, 5);
        h += 0.24 * fbm3(x * 5.5, y * 5.5, z * 5.5 + 3, 71, 3);
        h = h / 1.24;
        // squeeze the poles down so ice reads as caps rather than land
        h -= Math.pow(Math.abs(y), 3.2) * 0.22;
        this.height[j * W + i] = h;
      }
    }
    this.ready = true;
  },
  sampleH(lon, lat) {
    const W = this.TW, H = this.TH;
    let u = (lon / TAU) % 1; if (u < 0) u += 1;
    const v = clamp((lat / Math.PI + 0.5), 0, 0.999);
    const i = (u * W) | 0, j = (v * (H - 1)) | 0;
    return this.height[j * W + i];
  },
  // colour ramp for an elevation, before lighting
  tint(h, lat) {
    const ice = Math.abs(lat) > 1.16 - (h - 0.5) * 0.2;
    if (ice) return h > 0.5 ? [232, 240, 246] : [186, 208, 220];
    if (h < 0.455) return [12, 30, 58];        // deep ocean
    if (h < 0.492) return [20, 58, 92];        // ocean
    if (h < 0.507) return [30, 96, 122];       // shelf
    if (h < 0.518) return [186, 176, 132];     // sand
    if (h < 0.556) return [58, 106, 58];       // lowland
    if (h < 0.60) return [44, 84, 46];         // forest
    if (h < 0.645) return [96, 100, 62];       // upland
    if (h < 0.69) return [118, 106, 84];       // rock
    return [206, 208, 200];                    // peaks
  },
  // screen position for a lat/lon, plus whether it faces the camera
  project(lon, lat, cx, cy, r, spin, tilt) {
    const cl = Math.cos(lat), sl = Math.sin(lat);
    const l = lon - spin;
    let x = cl * Math.sin(l), y = sl, z = cl * Math.cos(l);
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const y2 = y * ct - z * st, z2 = y * st + z * ct;
    return [cx + x * r, cy - y2 * r, z2, z2 > 0.06];
  },
  // --- the per-pixel cache -------------------------------------------------
  // Every pixel of the disc used to re-derive its latitude and longitude from
  // scratch, every frame: a sqrt, an asin and an atan2 each, plus a freshly
  // allocated colour array. Sixty-eight thousand of those a frame is what made
  // the sphere crawl. None of it depends on the spin — only on the size of the
  // disc and the tilt — so it is worked out once and looked up after.
  PAL: null,
  buildPal() {
    if (this.PAL) return;
    // the elevation ramp, baked into a flat table so a pixel is three lookups
    const P = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const h = 0.2 + (i / 255) * 0.7;
      let c;
      if (h < 0.455) c = [12, 30, 58];
      else if (h < 0.492) c = [20, 58, 92];
      else if (h < 0.507) c = [30, 96, 122];
      else if (h < 0.518) c = [186, 176, 132];
      else if (h < 0.556) c = [58, 106, 58];
      else if (h < 0.60) c = [44, 84, 46];
      else if (h < 0.645) c = [96, 100, 62];
      else if (h < 0.69) c = [118, 106, 84];
      else c = [206, 208, 200];
      P[i * 3] = c[0]; P[i * 3 + 1] = c[1]; P[i * 3 + 2] = c[2];
    }
    this.PAL = P;
  },
  buildLut(d, ox, oy, cx, cy, r, tilt) {
    const N = d * d;
    const L = this._lut = {
      d, tilt, r,
      kind: new Uint8Array(N),        // 0 empty, 1 halo, 2 sphere
      halo: new Uint8Array(N),
      row: new Int32Array(N),         // precomputed texture row offset
      lonU: new Float32Array(N),      // longitude as a 0..1 texture coordinate
      absLat: new Float32Array(N),
      li: new Float32Array(N),        // baked terminator light, dither included
      lam: new Float32Array(N),
      rim: new Float32Array(N),
    };
    const ct = Math.cos(-tilt), st = Math.sin(-tilt);
    const lx = -0.52, ly = 0.60, lz = 0.61;
    const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const TW = this.TW, TH = this.TH;
    for (let j = 0; j < d; j++) {
      const sy = (j + oy + 0.5 - cy) / r;
      for (let i = 0; i < d; i++) {
        const k = j * d + i;
        const sx = (i + ox + 0.5 - cx) / r;
        const q = sx * sx + sy * sy;
        if (q > 1.0) {
          if (q < 1.24) { L.kind[k] = 1; L.halo[k] = Math.max(0, Math.min(255, (1 - (Math.sqrt(q) - 1) / 0.115) * 0.5 * 255)) | 0; }
          continue;
        }
        L.kind[k] = 2;
        const nz = Math.sqrt(1 - q), nx = sx, ny = -sy;
        const uy = ny * ct - nz * st, uz = ny * st + nz * ct;
        const lat = Math.asin(uy < -1 ? -1 : uy > 1 ? 1 : uy);
        let u = Math.atan2(nx, uz) / TAU; u -= Math.floor(u);
        L.lonU[k] = u;
        L.absLat[k] = Math.abs(lat);
        const v = lat / Math.PI + 0.5;
        L.row[k] = (((v < 0 ? 0 : v > 0.999 ? 0.999 : v) * (TH - 1)) | 0) * TW;
        const lam = nx * lx + ny * ly + nz * lz;
        L.lam[k] = lam;
        const bay = BAY[(j & 3) * 4 + (i & 3)] * 0.0625 - 0.5;
        let li = lam * 1.35 + 0.16 + bay * 0.16;
        li = li < 0 ? 0 : li > 1 ? 1 : li;
        L.li[k] = 0.16 + li * li * 1.05;
        L.rim[k] = q > 0.80 ? (q - 0.80) / 0.2 : 0;
      }
    }
    return L;
  },
  // paint the sphere into ctx at (cx, cy) with radius r
  draw(ctx, cx, cy, r, spin, tilt, t) {
    this.build(); this.buildPal();
    const d = Math.ceil(r * 1.12) * 2 + 2, ox = Math.round(cx - d / 2), oy = Math.round(cy - d / 2);
    // paint into an offscreen buffer and blit it: putImageData replaces pixels
    // rather than compositing, so writing it straight to the screen punched a
    // transparent square through whatever was behind the globe
    if (!this._cv || this._cv.width !== d) { this._cv = mkCanvas(d, d); this._cx = ctxOf(this._cv); this._img = this._cx.createImageData(d, d); this._lut = null; }
    // tilt is quantised, so tipping the sphere rebuilds the cache a handful of
    // times across the whole range instead of once a frame
    const qt = Math.round(tilt / 0.04) * 0.04;
    let L = this._lut;
    if (!L || L.d !== d || L.r !== r || L.tilt !== qt) L = this.buildLut(d, ox, oy, cx, cy, r, qt);
    const img = this._img, px = img.data, PAL = this.PAL, H = this.height, TW = this.TW;
    let su = spin / TAU; su -= Math.floor(su);
    const N = d * d;
    for (let k = 0; k < N; k++) {
      const kind = L.kind[k], o = k * 4;
      if (kind === 0) { px[o + 3] = 0; continue; }
      if (kind === 1) { px[o] = 90; px[o + 1] = 170; px[o + 2] = 210; px[o + 3] = L.halo[k]; continue; }
      let u = L.lonU[k] + su; if (u >= 1) u -= 1;
      const row = L.row[k], ti = (u * TW) | 0;
      const h = H[row + ti];
      let cr, cg, cb;
      if (L.absLat[k] > 1.16 - (h - 0.5) * 0.2) {           // ice caps
        if (h > 0.5) { cr = 232; cg = 240; cb = 246; } else { cr = 186; cg = 208; cb = 220; }
      } else {
        let pi = ((h - 0.2) * 365.7) | 0; pi = pi < 0 ? 0 : pi > 255 ? 255 : pi;
        pi *= 3;
        cr = PAL[pi]; cg = PAL[pi + 1]; cb = PAL[pi + 2];
        // relief: shade by the local slope so coastlines and ranges show
        if (h > 0.507) {
          const e = H[row + (ti + 1 === TW ? 0 : ti + 1)] - H[row + (ti === 0 ? TW - 1 : ti - 1)];
          const kk = 1 + (e * 9 < -0.34 ? -0.34 : e * 9 > 0.34 ? 0.34 : e * 9);
          cr *= kk; cg *= kk; cb *= kk;
        }
      }
      const li = L.li[k];
      cr *= li; cg *= li; cb *= li;
      if (h < 0.507 && L.lam[k] > 0.86) { cr += 90; cg += 110; cb += 120; }
      const rim = L.rim[k];
      if (rim > 0) { cr += rim * 26; cg += rim * 60; cb += rim * 84; }
      px[o] = cr > 255 ? 255 : cr | 0;
      px[o + 1] = cg > 255 ? 255 : cg | 0;
      px[o + 2] = cb > 255 ? 255 : cb | 0;
      px[o + 3] = 255;
    }
    this._cx.putImageData(img, 0, 0);
    ctx.drawImage(this._cv, ox, oy);
  },
};
