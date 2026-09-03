'use strict';
// ---------- math & helpers ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(rand(a, b + 1));
const choice = arr => arr[(Math.random() * arr.length) | 0];
const chance = p => Math.random() < p;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const sqr = v => v * v;
const sign = v => (v < 0 ? -1 : 1);
const angleDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
const angleLerp = (a, b, t) => a + angleDiff(a, b) * t;
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn = t => t * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const fmt = n => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------- deterministic randomness ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function ihash(i, seed = 0) {
  let x = (i | 0) ^ (seed | 0);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function vnoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(ihash(i, seed), ihash(i + 1, seed), u);
}
function fbm(x, seed = 0, oct = 3) {
  let v = 0, a = 0.5, f = 1, n = 0;
  for (let k = 0; k < oct; k++) { v += a * vnoise(x * f, seed + k * 131); n += a; a *= 0.5; f *= 2.13; }
  return v / n;
}

// ---------- colors ----------
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (r, g, b) => '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1);
function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }
function mixColor(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return rgbToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}
function shade(h, k) { const [r, g, b] = hexToRgb(h); return rgbToHex(r * k, g * k, b * k); }

// ---------- canvas helpers ----------
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctxOf(c) { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return x; }
