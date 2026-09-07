'use strict';
// ---------------------------------------------------------------------------
// THE DROP. Between the creation bay and the first frame of gameplay there is
// a release: a transport helicopter comes in over the site with a containment
// crate slung under it, holds, drops the crate, and the crate opens.
//
// It runs on real time and it is skippable. The world underneath is the real
// world, already loaded, so the camera simply hands over at the end.
// ---------------------------------------------------------------------------
const Drop = {
  DUR: 7.2,
  begin(stage) {
    const P = G.player;
    G.drop = {
      t: 0, dur: this.DUR, stage,
      hx: -180, hy: 62,            // helicopter, in world space relative to the site
      cy: 0, released: false, opened: false, landed: false,
      rotor: 0, tilt: 0, shake: 0,
      name: (stage && stage.name) || 'RELEASE SITE', sub: (stage && stage.sub) || '',
    };
    G.state = 'drop';
    P.frozen = true; P.invuln = 30; P.hidden = true;
    G.banner = null;
    SFX.warning && SFX.warning();
  },
  update(raw) {
    const D = G.drop, P = G.player; if (!D) return;
    D.t += raw;
    const u = D.t / D.dur;
    D.rotor += raw * 34;
    P.vx = 0; P.vy = 0;
    // camera: hold on the site, high and wide, then settle onto the animal
    const site = P.x;
    // --- 0.00-0.42  inbound. the helicopter crosses from the left and slows.
    if (u < 0.42) {
      const k = u / 0.42, e = 1 - Math.pow(1 - k, 3);
      D.hx = lerp(-320, 0, e);
      D.hy = lerp(96, 58, e);
      D.tilt = (1 - e) * 0.26;
      D.cy = D.hy + 40;
      G.cam.x = site + D.hx * 0.5;
      G.cam.y = -30;
      G.cam.zoom = 0.62;
      if (chance(raw * 26)) G.fx.add({ type: 'mote', x: site + D.hx + rand(-30, 30), y: -D.hy + rand(-8, 8), vx: rand(-30, -10), vy: rand(-4, 4), s: 1, color: '#cbb98e', seed: rand(TAU), life: 1.2 });
    // --- 0.42-0.58  hover. rotor wash flattens the water and the reeds.
    } else if (u < 0.58) {
      const k = (u - 0.42) / 0.16;
      D.hx = Math.sin(k * 6) * 3; D.hy = 58 - Math.sin(k * Math.PI) * 5;
      D.tilt = Math.sin(k * 9) * 0.03;
      D.cy = D.hy + 40;
      G.cam.x = site; G.cam.y = -20; G.cam.zoom = lerp(0.62, 0.8, k);
      this.wash(raw, site, 1);
    // --- 0.58-0.78  the crate falls.
    } else if (u < 0.78) {
      const k = (u - 0.58) / 0.20;
      D.released = true;
      D.hx = Math.sin(k * 3) * 2; D.hy = 54 - k * 6;
      D.cy = lerp(D.hy + 40, -6, k * k);
      G.cam.x = site; G.cam.y = lerp(-20, 20, k); G.cam.zoom = lerp(0.8, 1.05, k);
      this.wash(raw, site, 1 - k * 0.6);
      if (k > 0.95 && !D.landed) {
        D.landed = true;
        // it hits the water or the ground, hard
        const fy = World.floorY(site), su = World.surface(site);
        if (fy > su + 20) { G.fx.splash(site, 3.4, 0); Water.splash(site, 320, 40); SFX.splash(3); G.fx.bubbles(site, su + 20, 40, 40, -30); }
        else { G.fx.smoke(site, fy - 4, 12, '#8a7a5a'); G.fx.silt(site, fy - 2, 14, 60); SFX.thud(0); }
        G.shake(16); G.hitstop(0.06); D.shake = 1;
      }
    // --- 0.78-0.92  the crate opens and the specimen comes out.
    } else if (u < 0.92) {
      const k = (u - 0.78) / 0.14;
      D.released = true; D.landed = true;
      D.hx = k * 120; D.hy = 54 + k * 30; D.tilt = -0.2;
      if (!D.opened && k > 0.25) {
        D.opened = true;
        P.hidden = false;
        G.fx.splinters(P.x, P.y, 26, 150);
        G.whiteFlash(0.25); G.shake(9); SFX.crack && SFX.crack(4); SFX.roar(P.size);
        for (let i = 0; i < 10; i++) G.fx.glow(P.x + rand(-20, 20), P.y + rand(-10, 10), rand(2, 5), '#7affda', 0.5);
        if (P.inWater) G.fx.bubbles(P.x, P.y, 26, 26, -20);
      }
      G.cam.x = lerp(G.cam.x, P.x, Math.min(1, raw * 5));
      G.cam.y = lerp(G.cam.y, P.y, Math.min(1, raw * 5));
      G.cam.zoom = lerp(G.cam.zoom, 1.35, Math.min(1, raw * 3));
      if (D.opened) { P.frozen = false; P.vx = 40; }
    // --- 0.92-1.00  hand over.
    } else {
      D.hx += raw * 220; D.hy += raw * 20;
      if (D.shake > 0) D.shake -= raw * 2;
    }
    if (u >= 1 || Input.hit('Escape', 'Enter') || (Input.mouse.clicked && u > 0.15)) this.finish();
  },
  // rotor downwash: it presses the water down and drags the reeds flat
  wash(raw, site, k) {
    if (k <= 0) return;
    Water.splash(site + rand(-40, 40), 30 * k * raw * 60, 60);
    if (chance(raw * 40 * k)) G.fx.add({ type: 'drop', x: site + rand(-70, 70), y: World.surface(site) - rand(0, 26), vx: rand(-90, 90) * k, vy: rand(-30, 20), s: 1, color: '#cfe9e6', life: 0.9 });
    if (chance(raw * 22 * k)) G.fx.smoke(site + rand(-90, 90), World.surface(site) - rand(0, 14), 1, '#dff4f8');
    if (typeof Foliage !== 'undefined' && Foliage.disturb) Foliage.disturb(site + rand(-90, 90), 40 * k);
  },
  finish() {
    const D = G.drop, P = G.player; if (!D) return;
    P.frozen = false; P.hidden = false; P.invuln = 2.5;
    G.drop = null; G.state = 'play';
    G.banner = { text: D.name, sub: D.sub, t: 4, max: 4, color: '#8ce8a0' };
  },

  // ---------------------------------------------------------------------------
  // painting. The helicopter and the crate live in world space above the site.
  // ---------------------------------------------------------------------------
  drawWorld(ctx) {
    const D = G.drop, P = G.player; if (!D) return;
    const site = P.x, u = D.t / D.dur;
    const hx = site + D.hx, hy = -D.hy;
    // --- sling line and crate
    if (!D.landed || u < 0.8) {
      const cy = -D.cy;
      if (!D.released) { ctx.strokeStyle = '#2a2620'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, hy + 8); ctx.lineTo(site, cy - 10); ctx.stroke(); }
      this.crate(ctx, site, cy, D);
    } else if (D.landed) {
      this.crate(ctx, site, World.floorY(site) > World.surface(site) + 20 ? World.surface(site) + 6 : World.floorY(site) - 10, D);
    }
    // --- the helicopter
    if (u < 0.99) this.heli(ctx, hx, hy, D);
  },
  // A transport helicopter in side elevation: boom, tail rotor, skids, glass,
  // and a disc of motion-blurred main rotor.
  heli(ctx, x, y, D) {
    const f = D.hx > 0 ? 1 : 1;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(D.tilt);
    const body = '#2c3630', bodyL = '#414d44', bodyD = '#1a221d', glass = '#7fb8c8';
    // tail boom
    ctx.fillStyle = body; ctx.fillRect(10, -3, 46, 7);
    ctx.fillStyle = bodyL; ctx.fillRect(10, -3, 46, 2);
    ctx.fillStyle = bodyD; ctx.fillRect(10, 3, 46, 1);
    // tail fin and rotor
    ctx.fillStyle = body; ctx.fillRect(52, -16, 7, 16);
    ctx.fillStyle = bodyL; ctx.fillRect(52, -16, 7, 2);
    ctx.fillStyle = '#8a9a90';
    const tr = D.rotor * 2.2;
    for (let i = 0; i < 3; i++) { const a = tr + i * (TAU / 3); ctx.globalAlpha = 0.5 + 0.4 * Math.abs(Math.cos(a)); ctx.fillRect(Math.round(56 + Math.cos(a) * 9) - 1, Math.round(-8 + Math.sin(a) * 9) - 1, 2, 2); }
    ctx.globalAlpha = 1;
    // cabin
    ctx.fillStyle = body; Shape.blob(ctx, 0, 0, 15, body, 0.72);
    ctx.fillStyle = bodyL; ctx.fillRect(-13, -9, 24, 3);
    ctx.fillStyle = bodyD; ctx.fillRect(-12, 7, 24, 2);
    // cockpit glass, with a lit interior and a pilot silhouette
    ctx.fillStyle = glass; ctx.fillRect(-15, -6, 10, 9);
    ctx.fillStyle = '#b8e4ee'; ctx.fillRect(-15, -6, 10, 2);
    ctx.fillStyle = '#16221e'; ctx.fillRect(-11, -4, 3, 5);
    // side door, open, with a crewman leaning out
    ctx.fillStyle = '#101815'; ctx.fillRect(-2, -5, 9, 10);
    ctx.fillStyle = '#c8a888'; ctx.fillRect(1, -4, 3, 4);
    ctx.fillStyle = '#3a4a5a'; ctx.fillRect(1, 0, 3, 5);
    // skids
    ctx.fillStyle = '#8a9a90'; ctx.fillRect(-12, 9, 22, 1);
    ctx.fillRect(-8, 5, 1, 5); ctx.fillRect(6, 5, 1, 5);
    // markings
    ctx.fillStyle = '#a8b020'; ctx.fillRect(-6, -2, 8, 1);
    // main rotor: a blurred disc plus two crisp blades
    const rr = 44;
    ctx.globalAlpha = 0.16; ctx.fillStyle = '#c8d8d0';
    ctx.fillRect(-rr, -13, rr * 2, 2);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 4; i++) {
      const a = D.rotor + i * (TAU / 4), c = Math.cos(a);
      ctx.globalAlpha = 0.25 + 0.5 * Math.abs(c);
      ctx.fillRect(Math.round(-rr * c), -13, Math.round(rr * c * 2) || 1, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#8a9a90'; ctx.fillRect(-2, -14, 4, 4);
    // strobe
    if (Math.sin(D.rotor * 0.5) > 0.85) { ctx.fillStyle = '#ff4030'; ctx.fillRect(-1, 8, 2, 2); Shape.star(ctx, 0, 9, 8, '#ff4030', 0.5); }
    ctx.restore();
  },
  // the containment crate: steel cage, hazard stripes, a hinged front
  crate(ctx, x, y, D) {
    const w = 30, h = 22;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    if (D.opened) ctx.rotate(0.25);
    ctx.fillStyle = '#3a3a34'; ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = '#4d4d44'; ctx.fillRect(-w / 2, -h, w, 2);
    ctx.fillStyle = '#22221e'; ctx.fillRect(-w / 2, -3, w, 3);
    // bars
    ctx.fillStyle = '#151512';
    for (let i = 1; i < 6; i++) ctx.fillRect(-w / 2 + i * 5, -h + 3, 2, h - 6);
    // hazard stripes along the top
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#c8a020' : '#22221e'; ctx.fillRect(-w / 2 + i * 6, -h + 2, 6, 3); }
    // the hinged front, swung open once it lands
    ctx.save();
    if (D.opened) ctx.rotate(-1.5);
    ctx.fillStyle = '#44443c'; ctx.fillRect(w / 2 - 3, -h, 4, h);
    ctx.fillStyle = '#56564c'; ctx.fillRect(w / 2 - 3, -h, 4, 2);
    ctx.restore();
    ctx.fillStyle = '#8a7420'; Font.draw(ctx, 'BIO-4', 0, -h / 2 - 3, { color: '#c8a020', align: 'center' });
    ctx.restore();
  },
  // screen space: the site card, bars, and the pilot chatter
  drawUI(ctx) {
    const D = G.drop; if (!D) return;
    const W = G.W, H = G.H, u = D.t / D.dur;
    const band = Math.round(30 * clamp(Math.min(u / 0.06, (1 - u) / 0.08), 0, 1));
    if (band > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(0, 0, W, band); ctx.fillRect(0, H - band, W, band);
      ctx.fillStyle = 'rgba(140,220,200,0.14)'; ctx.fillRect(0, band, W, 1); ctx.fillRect(0, H - band - 1, W, 1);
    }
    // the site card, typed on
    if (u > 0.08 && u < 0.62) {
      const k = clamp((u - 0.08) / 0.1, 0, 1), out = clamp((0.62 - u) / 0.08, 0, 1);
      ctx.globalAlpha = Math.min(k, out);
      const n = Math.round(D.name.length * k);
      Font.draw(ctx, D.name.slice(0, n), 22, 48, { color: '#b8ffe8', scale: 3, outline: '#04120e' });
      if (k > 0.9) Font.draw(ctx, D.sub, 22, 74, { color: '#7f9f96', outline: '#04120e' });
      ctx.fillStyle = '#7affda'; ctx.fillRect(22, 42, Math.round(180 * k), 1);
      ctx.globalAlpha = 1;
    }
    // pilot chatter, bottom left
    const lines = [
      [0.10, 'BIO-4 TRANSPORT, TWO MINUTES OUT.'],
      [0.30, 'CRATE IS HOT. SUBJECT IS AWAKE.'],
      [0.46, 'ON STATION. HOLDING AT FIFTY FEET.'],
      [0.58, 'RELEASING.'],
      [0.80, 'SUBJECT IS IN THE WATER. GOOD LUCK.'],
    ];
    let msg = null;
    for (const [at, txt] of lines) if (u >= at) msg = [at, txt];
    if (msg && u - msg[0] < 0.16) {
      const k = clamp((u - msg[0]) / 0.03, 0, 1) * clamp((0.16 - (u - msg[0])) / 0.04, 0, 1);
      ctx.globalAlpha = clamp(k, 0, 1);
      ctx.fillStyle = 'rgba(4,10,12,0.75)'; ctx.fillRect(16, H - 52, Font.width(msg[1], 1) + 12, 14);
      Font.draw(ctx, msg[1], 22, H - 48, { color: '#9ef0c8' });
      ctx.globalAlpha = 1;
    }
    if (u > 0.2 && u < 0.95) Font.draw(ctx, 'ESC: SKIP', W - 8, H - 10, { color: 'rgba(150,190,180,0.5)', align: 'right' });
  },
};
