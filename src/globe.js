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
  // paint the sphere into ctx at (cx, cy) with radius r
  draw(ctx, cx, cy, r, spin, tilt, t) {
    this.build();
    const d = Math.ceil(r * 1.12) * 2 + 2, ox = Math.round(cx - d / 2), oy = Math.round(cy - d / 2);
    // paint into an offscreen buffer and blit it: putImageData replaces pixels
    // rather than compositing, so writing it straight to the screen punched a
    // transparent square through whatever was behind the globe
    if (!this._cv || this._cv.width !== d) { this._cv = mkCanvas(d, d); this._cx = ctxOf(this._cv); this._img = this._cx.createImageData(d, d); }
    const img = this._img, px = img.data;
    const ct = Math.cos(-tilt), st = Math.sin(-tilt);
    // light from up and to the left, the same key the rest of the art uses
    const lx = -0.52, ly = 0.60, lz = 0.61;
    const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let j = 0; j < d; j++) {
      const sy = (j + oy + 0.5 - cy) / r;
      for (let i = 0; i < d; i++) {
        const k = (j * d + i) * 4;
        const sx = (i + ox + 0.5 - cx) / r;
        px[k] = 0; px[k + 1] = 0; px[k + 2] = 0;
        const q = sx * sx + sy * sy;
        if (q > 1.0) {
          // atmosphere: a thin halo just outside the limb
          if (q < 1.24) {
            const a = (1 - (Math.sqrt(q) - 1) / 0.115) * 0.5;
            px[k] = 90; px[k + 1] = 170; px[k + 2] = 210; px[k + 3] = Math.max(0, Math.min(255, a * 255)) | 0;
          } else px[k + 3] = 0;
          continue;
        }
        const nz = Math.sqrt(Math.max(0, 1 - q));
        const nx = sx, ny = -sy;
        // undo the tilt, then the spin, to get the surface coordinate
        const uy = ny * ct - nz * st, uz = ny * st + nz * ct;
        const lat = Math.asin(clamp(uy, -1, 1));
        const lon = Math.atan2(nx, uz) + spin;
        const h = this.sampleH(lon, lat);
        let [cr, cg, cb] = this.tint(h, lat);
        // relief: shade by the local slope so coastlines and ranges show
        if (h > 0.507) {
          const e = this.sampleH(lon + 0.02, lat) - this.sampleH(lon - 0.02, lat);
          const kk = 1 + clamp(e * 9, -0.34, 0.34);
          cr *= kk; cg *= kk; cb *= kk;
        }
        // day / night with an ordered dither on the terminator
        const lam = nx * lx + ny * ly + nz * lz;
        const bay = BAY[(j & 3) * 4 + (i & 3)] * 0.0625 - 0.5;
        let li = clamp(lam * 1.35 + 0.16 + bay * 0.16, 0, 1);
        li = 0.16 + li * li * 1.05;
        cr *= li; cg *= li; cb *= li;
        // specular glint off the water, and a cool rim on the limb
        if (h < 0.507 && lam > 0.86) { cr += 90; cg += 110; cb += 120; }
        const rim = q > 0.80 ? (q - 0.80) / 0.2 : 0;
        if (rim > 0) { cr += rim * 26; cg += rim * 60; cb += rim * 84; }
        px[k] = cr > 255 ? 255 : cr | 0;
        px[k + 1] = cg > 255 ? 255 : cg | 0;
        px[k + 2] = cb > 255 ? 255 : cb | 0;
        px[k + 3] = 255;
      }
    }
    this._cx.putImageData(img, 0, 0);
    ctx.drawImage(this._cv, ox, oy);
  },
};
