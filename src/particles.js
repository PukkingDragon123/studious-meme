'use strict';
// Particle + popup system. Particles live in world space, are drawn in screen space (crisp pixels at any zoom).
const BLOOD_COLORS = ['#8a0b0b', '#b31212', '#d42020', '#5c0606', '#a51a1a'];
class FXSystem {
  constructor() { this.list = []; this.clouds = []; this.texts = []; this.max = 2400; }
  clear() { this.list.length = 0; this.clouds.length = 0; this.texts.length = 0; }
  add(p) { if (this.list.length >= this.max) this.list.splice(0, 300); p.t = 0; p.maxLife = p.life; this.list.push(p); return p; }
  // ---------- emitters ----------
  blood(x, y, n, dx = 0, dy = 0, power = 60, colors = BLOOD_COLORS) {
    n = Math.round(n * (G.settings.gore ? 1 : 0.3));
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), sp = rand(0.2, 1) * power;
      this.add({ type: 'blood', x: x + rand(-2, 2), y: y + rand(-2, 2), vx: dx * power * rand(0.3, 1.2) + Math.cos(a) * sp, vy: dy * power * rand(0.3, 1.2) + Math.sin(a) * sp, s: chance(0.3) ? 2 : 1, color: choice(colors), life: rand(1.4, 3.2), settled: false });
    }
  }
  cloud(x, y, r, color = '#6a0a0a', life = 2.6) {
    if (this.clouds.length > 120) this.clouds.shift();
    this.clouds.push({ x, y, r: r * 0.4, r1: r, life, maxLife: life, color, vx: rand(-4, 4), vy: rand(-3, 3), a0: 0.55 });
  }
  gore(x, y, power, dx = 0, dy = 0, big = false) {
    // combined splatter: particles + cloud + chunks (non-edible gristle)
    this.blood(x, y, big ? 70 : 28, dx, dy, power);
    this.cloud(x, y, big ? 40 : 18);
    for (let i = 0; i < (big ? 8 : 3); i++) {
      const a = rand(TAU), sp = rand(0.4, 1) * power * 0.8;
      this.add({ type: 'gristle', x, y, vx: Math.cos(a) * sp + dx * power * 0.5, vy: Math.sin(a) * sp + dy * power * 0.5, s: randi(2, 3), color: choice(['#7a1010', '#c04040', '#e8b0a0', '#efe6d6']), life: rand(4, 8), rot: rand(TAU), settled: false });
    }
  }
  bubbles(x, y, n, spread = 6, vel = 0) {
    for (let i = 0; i < n; i++) this.add({ type: 'bubble', x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-8, 8), vy: rand(-30, -5) + vel, s: chance(0.3) ? 2 : 1, seed: rand(TAU), life: rand(1.5, 3.5) });
  }
  splash(x, power = 1, vx = 0) {
    Water.splash(x, clamp(power, 0.2, 4) * 60, 10 + power * 8);
    const surf = World.surface(x);
    const n = Math.round(clamp(power * 14, 5, 60));
    for (let i = 0; i < n; i++) this.add({ type: 'drop', x: x + rand(-8, 8) * power, y: surf - 1, vx: vx * 0.3 + rand(-50, 50) * Math.sqrt(power), vy: -rand(60, 240) * Math.sqrt(power), s: chance(0.4) ? 2 : 1, color: choice(['#cfe9e6', '#9fd0cb', '#ffffff', '#7fb8b2']), life: 2 });
    this.ripple(x, 6 * power, power);
    for (let i = 0; i < Math.round(power * 6); i++) this.add({ type: 'foam', x: x + rand(-14, 14) * power, y: surf, vx: rand(-20, 20), vy: 0, s: 1, life: rand(0.6, 1.6) });
  }
  ripple(x, r = 6, power = 1) { Water.splash(x, power * 12, 6); this.add({ type: 'ripple', x, y: World.surface(x), r, gr: 40 * power, life: 0.9 + power * 0.3, alpha: 0.7 }); }
  // silt kicked up off the bottom
  silt(x, y, n = 6, power = 30) { for (let i = 0; i < n; i++) this.add({ type: 'silt', x: x + rand(-4, 4), y: y - 2, vx: rand(-1, 1) * power, vy: -rand(0.2, 1) * power, s: rand(2, 5), color: choice(['#5a4a34', '#6b5a44', '#4a3c2a']), life: rand(1.5, 3.2) }); }
  leaf(x, y, color = '#4f7a2a') { this.add({ type: 'leaf', x, y, vx: rand(-20, 20), vy: rand(-10, 10), s: 2, color, seed: rand(TAU), life: rand(3, 6) }); }
  // a footprint or drag mark pressed into the shore mud
  print(x, y, w, dir) { this.add({ type: 'print', x, y, w, dir, life: 40 }); }
  feathers(x, y, n, color = '#f0f0e8') { for (let i = 0; i < n; i++) this.add({ type: 'feather', x, y, vx: rand(-60, 60), vy: rand(-90, 10), s: 1, color: chance(0.7) ? color : '#b8b8b0', seed: rand(TAU), life: rand(2.5, 5) }); }
  sparks(x, y, n, dx = 0, dy = 0) { for (let i = 0; i < n; i++) { const a = rand(TAU), sp = rand(40, 180); this.add({ type: 'spark', x, y, vx: Math.cos(a) * sp + dx * 80, vy: Math.sin(a) * sp + dy * 80, s: 1, color: choice(['#fff8c0', '#ffd060', '#ff9030']), life: rand(0.15, 0.4) }); } }
  splinters(x, y, n, power = 100) { for (let i = 0; i < n; i++) { const a = rand(TAU), sp = rand(0.3, 1) * power; this.add({ type: 'splinter', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, s: randi(1, 3), w: randi(2, 6), color: choice(['#6b4a2e', '#8a6a44', '#4a3524', '#a0a0a0']), rot: rand(TAU), vr: rand(-6, 6), life: rand(5, 9) }); } }
  smoke(x, y, n = 1, color = '#888') { for (let i = 0; i < n; i++) this.add({ type: 'smoke', x: x + rand(-3, 3), y: y + rand(-3, 3), vx: rand(-10, 10), vy: rand(-30, -10), s: rand(2, 4), color, life: rand(0.6, 1.4) }); }
  husk(img, sx, sy, sw, sh, x, y, angle, size, flipY) { this.add({ type: 'husk', img, sx, sy, sw, sh, x, y, angle, size, flipY, vx: rand(-15, 15), vy: rand(-25, 5), vr: rand(-1.2, 1.2), life: rand(2.2, 3.4) }); }
  glow(x, y, r, color, life = 0.5) { this.add({ type: 'glow', x, y, r, color, life }); }
  shock(x, y, r, color = '#ffffff', life = 0.5) { this.add({ type: 'shock', x, y, r0: 4, r, color, life }); }
  flesh(x, y, n, power = 90) { // meat flecks used for boss/large gore
    for (let i = 0; i < n; i++) { const a = rand(TAU), sp = rand(0.3, 1) * power; this.add({ type: 'gristle', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: randi(1, 3), color: choice(['#9a1a1a', '#c04040', '#e8a090', '#f0e8d8']), life: rand(3, 7), rot: rand(TAU), settled: false }); }
  }
  text() { /* floating text was retired: feedback is visual now */ }
  _textUnused(x, y, str, opts = {}) {
    if (G.state === 'title' || G.state === 'shed' || G.state === 'codex' || G.state === 'help') return;
    if (this.texts.length > 40) this.texts.shift();
    this.texts.push({ x, y, str, color: opts.color || '#ffffff', scale: opts.scale || 1, life: opts.life || 1.1, maxLife: opts.life || 1.1, vy: opts.vy ?? -30, vx: opts.vx || 0, outline: opts.outline || '#000000', shake: opts.shake || 0, t: 0 });
  }
  // ---------- simulation ----------
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life -= dt; p.t += dt;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
      const surf = World.surface(p.x), under = p.y > surf;
      switch (p.type) {
        case 'blood': case 'gristle': {
          if (p.settled) break;
          if (under) {
            const k = Math.exp(-3.2 * dt); p.vx *= k; p.vy *= k; p.vy += (p.type === 'gristle' ? 40 : 14) * dt;
            if (p.wasAir) { p.wasAir = false; p.vx *= 0.35; p.vy *= 0.3; if (chance(0.25)) this.ripple(p.x, 2, 0.3); }
          } else { p.vy += 720 * dt; p.wasAir = true; }
          p.x += p.vx * dt; p.y += p.vy * dt;
          const fy = World.floorY(p.x);
          if (p.y >= fy - 1) { p.y = fy - 1; p.settled = true; p.life = Math.min(p.life + 3, 6); }
          break;
        }
        case 'bubble': {
          p.vy = approach(p.vy, -70, 90 * dt); p.x += (p.vx + Math.sin(p.t * 7 + p.seed) * 14) * dt; p.y += p.vy * dt;
          if (p.y <= surf) { p.life = 0; if (chance(0.15)) this.ripple(p.x, 2, 0.25); }
          break;
        }
        case 'drop': {
          p.vy += 620 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.vy > 0 && p.y >= surf) { p.life = 0; if (chance(0.2)) this.ripple(p.x, 2, 0.3); }
          break;
        }
        case 'foam': { p.x += p.vx * dt; p.y = World.surface(p.x); p.vx *= 0.96; break; }
        case 'slick': { p.r = lerp(p.r, p.r1, 1 - Math.exp(-0.7 * dt)); p.x += p.vx * dt; p.y = World.surface(p.x); p.vx *= 0.98; break; }
        case 'pool': { p.r = lerp(p.r, p.r1, 1 - Math.exp(-1.2 * dt)); p.y = World.floorY(p.x); break; }
        case 'ripple': { p.r += p.gr * dt; break; }
        case 'feather': {
          if (under) { p.vy = approach(p.vy, 9, 40 * dt); p.vx *= 0.97; p.x += (p.vx + Math.sin(p.t * 2 + p.seed) * 6) * dt; }
          else { p.vy = approach(p.vy, 28, 120 * dt); p.vx *= 0.99; p.x += (p.vx + Math.sin(p.t * 4 + p.seed) * 22) * dt; }
          p.y += p.vy * dt; break;
        }
        case 'spark': { p.vy += 250 * dt; p.x += p.vx * dt; p.y += p.vy * dt; break; }
        case 'splinter': {
          if (under) { p.vy = approach(p.vy, p.y > surf + 3 ? -35 : 0, 160 * dt); p.vx *= 0.97; p.vr *= 0.9; if (p.y < surf + 3) p.y = surf + Math.sin(p.t * 3) * 1.2; }
          else { p.vy += 560 * dt; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; break;
        }
        case 'smoke': { p.x += p.vx * dt; p.y += p.vy * dt; p.s += 3 * dt; break; }
        case 'silt': { p.vx *= 0.96; p.vy = approach(p.vy, 6, 20 * dt); p.x += p.vx * dt; p.y += p.vy * dt; p.s += 4 * dt; const fy = World.floorY(p.x); if (p.y > fy - 1) p.y = fy - 1; break; }
        case 'leaf': { if (under) { p.vy = approach(p.vy, 5, 30 * dt); p.vx *= 0.96; } else { p.vy = approach(p.vy, 22, 60 * dt); p.x += Math.sin(p.t * 3 + p.seed) * 18 * dt; } p.x += p.vx * dt; p.y += p.vy * dt; const fy2 = World.floorY(p.x); if (p.y > fy2 - 1) { p.y = fy2 - 1; p.vx = 0; p.vy = 0; } break; }
        case 'rain': {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y >= surf) { p.life = 0; Water.splash(p.x, 9, 5); if (chance(0.35)) this.add({ type: 'drop', x: p.x, y: surf - 1, vx: rand(-30, 30), vy: -rand(40, 110), s: 1, color: '#d8f0ee', life: 0.6 }); }
          else { const fy3 = World.floorY(p.x); if (fy3 < 0 && p.y >= fy3) { p.life = 0; if (chance(0.3)) this.add({ type: 'drop', x: p.x, y: fy3 - 1, vx: rand(-20, 20), vy: -rand(20, 60), s: 1, color: '#c8d8d0', life: 0.35 }); } }
          break;
        }
        case 'print': break;
        case 'suck': { const [sx, sy] = G.player.snout; const k = Math.min(1, 16 * dt); p.x = lerp(p.x, sx, k); p.y = lerp(p.y, sy, k); break; }
        case 'husk': { p.vy += (under ? 10 : 300) * dt; if (under) { p.vx *= 0.98; p.vy *= 0.97; } p.x += p.vx * dt; p.y += p.vy * dt; p.angle += p.vr * dt; break; }
        default: break;
      }
    }
    const C = this.clouds;
    for (let i = C.length - 1; i >= 0; i--) {
      const c = C[i]; c.life -= dt;
      if (c.life <= 0) { C.splice(i, 1); continue; }
      c.r = lerp(c.r, c.r1, 1 - Math.exp(-2 * dt));
      // blood underwater rides the current and slowly sinks
      const drift = Water.velocity(c.x) * 0.02 + Math.sin(World.t * 0.5 + c.x * 0.01) * 2.2 + Water.wind * 6;
      c.x += (c.vx + drift) * dt; c.y += (c.vy + 3) * dt;
      c.vx *= Math.exp(-0.6 * dt); c.vy *= Math.exp(-0.6 * dt);
    }
    const T = this.texts;
    for (let i = T.length - 1; i >= 0; i--) { const t = T[i]; t.life -= dt; t.t += dt; if (t.life <= 0) { T.splice(i, 1); continue; } t.y += t.vy * dt; t.x += t.vx * dt; t.vy *= 0.95; }
  }
  // ---------- rendering ----------
  drawClouds(ctx, cam) {
    for (const c of this.clouds) {
      const [sx, sy] = cam.toScreen(c.x, c.y); const r = c.r * cam.zoom;
      if (sx < -r || sx > G.W + r || sy < -r || sy > G.H + r) continue;
      ctx.globalAlpha = c.a0 * (c.life / c.maxLife);
      ctx.fillStyle = c.color; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.75, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = c.a0 * 0.6 * (c.life / c.maxLife); ctx.beginPath(); ctx.ellipse(sx + r * 0.3, sy - r * 0.2, r * 0.6, r * 0.5, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  draw(ctx, cam) {
    const z = cam.zoom, W = G.W, H = G.H;
    for (const p of this.list) {
      const [sx, sy] = cam.toScreen(p.x, p.y);
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      const lf = p.life / p.maxLife;
      switch (p.type) {
        case 'blood': { const s = Math.max(1, Math.round(p.s * z)); ctx.globalAlpha = lf < 0.35 ? lf / 0.35 : 1; ctx.fillStyle = p.color; ctx.fillRect(Math.round(sx), Math.round(sy), s, s); break; }
        case 'gristle': { const s = Math.max(1, Math.round(p.s * z)); ctx.globalAlpha = lf < 0.3 ? lf / 0.3 : 1; ctx.fillStyle = p.color; ctx.fillRect(Math.round(sx), Math.round(sy), s, s); if (s > 1) { ctx.fillStyle = '#5a0808'; ctx.fillRect(Math.round(sx), Math.round(sy) + s - 1, Math.max(1, s >> 1), 1); } break; }
        case 'bubble': { const s = Math.max(1, Math.round(p.s * z)); ctx.globalAlpha = 0.7; ctx.fillStyle = '#cfeae8'; ctx.fillRect(Math.round(sx), Math.round(sy), s, s); if (s > 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1); } break; }
        case 'drop': case 'foam': { const s = Math.max(1, Math.round(p.s * z)); ctx.globalAlpha = p.type === 'foam' ? lf : 0.9; ctx.fillStyle = p.color || '#e8f4f2'; ctx.fillRect(Math.round(sx), Math.round(sy), s, s); break; }
        case 'slick': { const r = p.r * z; ctx.globalAlpha = clamp(lf, 0, 1) * 0.6; ctx.fillStyle = '#6a0c0c'; ctx.beginPath(); ctx.ellipse(sx, sy, r, Math.max(1, r * 0.22), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = clamp(lf, 0, 1) * 0.45; ctx.fillStyle = '#a01a1a'; ctx.beginPath(); ctx.ellipse(sx - r * 0.2, sy, r * 0.55, Math.max(1, r * 0.14), 0, 0, TAU); ctx.fill(); break; }
        case 'pool': { const r = p.r * z; ctx.globalAlpha = clamp(lf, 0, 1) * 0.75; ctx.fillStyle = '#5a0a0a'; ctx.beginPath(); ctx.ellipse(sx, sy, r, Math.max(1, r * 0.3), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = clamp(lf, 0, 1) * 0.5; ctx.fillStyle = '#8a1414'; ctx.beginPath(); ctx.ellipse(sx - r * 0.15, sy - r * 0.06, r * 0.6, Math.max(1, r * 0.18), 0, 0, TAU); ctx.fill(); break; }
        case 'ripple': { ctx.globalAlpha = p.alpha * lf; ctx.strokeStyle = '#d8f0ee'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(sx, sy, p.r * z, Math.max(1, p.r * z * 0.22), 0, 0, TAU); ctx.stroke(); break; }
        case 'feather': { const s = Math.max(1, Math.round(2 * z)); ctx.globalAlpha = lf < 0.3 ? lf / 0.3 : 1; ctx.fillStyle = p.color; ctx.fillRect(Math.round(sx), Math.round(sy), s, Math.max(1, s >> 1)); break; }
        case 'spark': { ctx.globalAlpha = lf; ctx.fillStyle = p.color; const s = Math.max(1, Math.round(z)); ctx.fillRect(Math.round(sx), Math.round(sy), s, s); break; }
        case 'splinter': { ctx.globalAlpha = lf < 0.3 ? lf / 0.3 : 1; ctx.fillStyle = p.color; ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot); ctx.fillRect(0, 0, Math.max(1, p.w * z), Math.max(1, p.s * z)); ctx.restore(); break; }
        case 'smoke': { ctx.globalAlpha = 0.35 * lf; ctx.fillStyle = p.color; const r = p.s * z; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); break; }
        case 'silt': { ctx.globalAlpha = 0.28 * lf; ctx.fillStyle = p.color; const r = p.s * z; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.7, 0, 0, TAU); ctx.fill(); break; }
        case 'leaf': { ctx.globalAlpha = lf < 0.3 ? lf / 0.3 : 1; ctx.fillStyle = p.color; const s = Math.max(1, Math.round(2 * z)); ctx.fillRect(Math.round(sx), Math.round(sy), s, Math.max(1, s >> 1)); break; }
        case 'rain': { ctx.globalAlpha = 0.45; ctx.strokeStyle = '#c8e0e8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - p.vx * 0.02 * z, sy - p.vy * 0.02 * z); ctx.stroke(); break; }
        case 'print': { ctx.globalAlpha = 0.5 * Math.min(1, lf * 3); ctx.fillStyle = '#2a1f14'; const w = Math.max(2, Math.round(p.w * z)); ctx.fillRect(Math.round(sx - w / 2), Math.round(sy), w, Math.max(1, Math.round(1.5 * z))); ctx.fillStyle = '#4a3a26'; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy) - 1, w, 1); break; }
        case 'suck': { const k = Math.max(0.05, lf); ctx.save(); ctx.translate(sx, sy); ctx.scale(p.size * z * k * p.facing, p.size * z * k); ctx.drawImage(p.img, -p.w / 2, -p.h / 2); ctx.restore(); break; }
        case 'husk': { ctx.globalAlpha = 0.75 * lf; ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.angle); ctx.scale(p.size * z, p.size * z * p.flipY); ctx.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, -p.sw / 2, -p.sh / 2, p.sw, p.sh); ctx.restore(); break; }
        case 'glow': { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * lf; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(sx, sy, p.r * z * (1.3 - lf * 0.3), 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break; }
        case 'shock': { ctx.globalAlpha = lf; ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, 3 * lf * z); ctx.beginPath(); ctx.arc(sx, sy, lerp(p.r0, p.r, easeOut(1 - lf)) * z, 0, TAU); ctx.stroke(); break; }
      }
    }
    ctx.globalAlpha = 1;
  }
  drawTexts(ctx, cam) {
    if (G.state === 'shed' || G.state === 'codex' || G.state === 'help') return;
    for (const t of this.texts) {
      const [sx, sy] = cam.toScreen(t.x, t.y);
      const lf = t.life / t.maxLife;
      const pop = t.t < 0.15 ? easeOutBack(t.t / 0.15) : 1;
      const sc = Math.max(1, Math.round(t.scale * pop));
      ctx.globalAlpha = lf < 0.3 ? lf / 0.3 : 1;
      const jx = t.shake ? rand(-t.shake, t.shake) : 0;
      Font.draw(ctx, t.str, sx + jx, sy - 4 * sc, { color: t.color, scale: sc, align: 'center', outline: t.outline });
    }
    ctx.globalAlpha = 1;
  }
}
