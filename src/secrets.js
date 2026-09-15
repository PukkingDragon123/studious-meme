'use strict';
// ---------------------------------------------------------------------------
// SECRETS.
//
// Every stretch of this map has one thing in it that is not on the way to
// anything. A drain in the embankment with a rusted grate over it, a gap
// behind a kelp bed, a chamber under a pier that only opens if you go under
// the deck instead of over it. They are authored, they are always in the same
// place, and they are worth going and finding: gene points, a full heal, and
// a lot of score.
//
// You find one by seeing it — a glint on a grate in a wall — and you open it
// by biting the grate. Nothing tells you they are there.
// ---------------------------------------------------------------------------
const SECRETS = [
  // ---- zone 1: the building, the sewer and San Francisco ---------------
  { id: 's.pens', x: -6700, y: -1452, name: 'A SEALED PEN', line: 'PEN NINE WAS NEVER ON THE MANIFEST.', gp: 2 },
  { id: 's.plant', x: -6380, y: -1452, name: 'THE PLANT ROOM VOID', line: 'SOMEBODY LIVED DOWN HERE FOR A WHILE.', gp: 2 },
  { id: 's.sewer', x: -5240, name: 'A BRICKED-UP CONNECTION', line: 'IT GOES SOMEWHERE. IT DOES NOT GO FAR.', gp: 3 },
  { id: 's.weir', x: -4700, name: 'UNDER THE SECOND WEIR', line: 'FIFTY YEARS OF THINGS THAT WOULD NOT GO OVER.', gp: 3 },
  { id: 's.creek', x: -3980, name: 'A STORM DRAIN', line: 'THE CITY PUTS ITS RAIN IN HERE AND FORGETS.', gp: 3 },
  { id: 's.bridge', x: -3260, name: 'THE BRIDGE FOOTING', line: 'A VOID IN THE PIER NOBODY POURED PROPERLY.', gp: 4 },
  { id: 's.pier', x: -2420, name: 'UNDER THE PIER DECK', line: 'GO UNDER IT. NOBODY EVER GOES UNDER IT.', gp: 4 },
  { id: 's.hull', x: -1700, name: 'A SUNK HULL', line: 'SHE WENT DOWN AT HER MOORING IN 1961.', gp: 4 },
  { id: 's.bay', x: -820, name: 'AN OUTFALL NOBODY LOGGED', line: 'IT IS NOT ON ANY DRAWING IN THE CITY.', gp: 5 },
  { id: 's.rock', x: 60, name: 'UNDER THE ROCK', line: 'THERE IS A WAY IN AT THE BOTTOM OF IT.', gp: 5 },
  { id: 's.gate', x: 720, name: 'THE TOWER CAISSON', line: 'THEY SANK IT IN 1933 AND SEALED IT WITH SOMETHING INSIDE.', gp: 6 },
];
const SECRET_BY_ID = {};
for (const s of SECRETS) SECRET_BY_ID[s.id] = s;

const Secrets = {
  found: {}, live: [], nearT: 0,

  reset() { this.found = {}; this.live = []; this.nearT = 0; },

  // put every one within reach of this run into the world
  begin() {
    this.reset();
    for (const S of SECRETS) {
      // on the wall of whatever it is set into: the nearest ground below it
      const y = S.y !== undefined ? S.y : World.floorY(S.x) - 22;
      this.live.push({ def: S, x: S.x, y, open: false, hp: 26, t: rand(0, TAU), flash: 0, openT: 0 });
    }
  },

  count() { return Object.keys(this.found).length; },
  total() { return SECRETS.length; },

  at(x, y, r) {
    for (const s of this.live) if (!s.open && Math.abs(s.x - x) < r + 16 && Math.abs(s.y - y) < r + 18) return s;
    return null;
  },

  // bitten: the grate gives on the third or fourth go
  hit(s, P, sx, sy, dx, dy) {
    if (s.open) return;
    s.hp -= Math.max(7, P.biteDmg * 1.4); s.flash = 0.12;
    G.fx.sparks(sx, sy, 8, dx, dy);
    SFX.clank && SFX.clank(G.panOf(s.x)); G.shake(4); G.hitstop(0.05);
    for (let i = 0; i < 4; i++) G.fx.add({ type: 'splinter', x: sx, y: sy, vx: rand(-90, 90), vy: -rand(20, 110), s: 1, w: 3, color: choice(['#8a7050', '#6a5438']), rot: rand(TAU), vr: rand(-8, 8), life: 2.4 });
    if (s.hp > 0) return;
    this.open(s);
  },

  open(s) {
    s.open = true; s.openT = 2.6; this.found[s.def.id] = 1;
    const P = G.player;
    P.genePoints += s.def.gp; P.newPoints += s.def.gp;
    P.hp = P.maxHp; P.hunger = 100;
    G.addScore(2500 + s.def.gp * 600);
    G.shake(10); G.slowmo(0.35, 0.7); G.whiteFlash(0.25);
    SFX.levelup && SFX.levelup(); SFX.pick && SFX.pick();
    G.fx.sparks(s.x, s.y, 16);
    for (let i = 0; i < 26; i++) G.fx.add({ type: 'spark', x: s.x, y: s.y, vx: rand(-200, 200), vy: rand(-220, 120), s: 1, color: choice(['#ffe86a', '#ffffff', '#ffb040']), life: rand(0.5, 1.4) });
    G.banner = { text: 'SECRET FOUND  ' + this.count() + '/' + this.total(), sub: s.def.name + ' — ' + s.def.line, t: 4.6, max: 4.6, color: '#ffe86a' };
    G.stats.secrets = (G.stats.secrets || 0) + 1;
  },

  update(dt) {
    for (const s of this.live) { s.t += dt; if (s.flash > 0) s.flash -= dt; if (s.openT > 0) s.openT -= dt; }
  },

  // drawn in world space with the rest of the decor
  draw(ctx, cam) {
    const z = cam.zoom, W = G.W;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    for (const s of this.live) {
      const [sx, sy] = cam.toScreen(s.x, s.y);
      if (sx < -60 || sx > W + 60) continue;
      const w = 30 * z, h = 34 * z;
      // the alcove: a squared hole in whatever it is set into
      px(sx - w / 2 - 3 * z, sy - h / 2 - 3 * z, w + 6 * z, h + 6 * z, '#3a352c');
      px(sx - w / 2 - 3 * z, sy - h / 2 - 3 * z, w + 6 * z, 2 * z, '#5d564a');
      px(sx - w / 2, sy - h / 2, w, h, '#07090a');
      if (s.open) {
        // what was in it, still glittering
        const k = clamp(s.openT / 2.6, 0, 1);
        px(sx - w / 2, sy - h / 2, w, h, 'rgba(255,210,90,' + (0.10 + 0.16 * k).toFixed(3) + ')');
        for (let i = 0; i < 7; i++) {
          const a = s.t * 0.7 + i, r = (6 + (i % 3) * 5) * z;
          px(sx + Math.cos(a) * r, sy + Math.sin(a * 1.3) * r * 0.6, 2 * z, 2 * z, i % 2 ? '#ffe86a' : '#ffffff');
        }
        px(sx - 9 * z, sy + h / 2 - 5 * z, 18 * z, 4 * z, '#8a6a2a');
        continue;
      }
      // the grate: flats and uprights, rusted, with one bar already gone
      const rust = s.flash > 0 ? '#ffd8a0' : '#7a5a34';
      for (let i = 0; i < 5; i++) { if (i === 3) continue; px(sx - w / 2 + 2 * z + i * (w - 4 * z) / 5, sy - h / 2 + 2 * z, 3 * z, h - 4 * z, rust); }
      for (let i = 0; i < 3; i++) px(sx - w / 2 + 2 * z, sy - h / 2 + 3 * z + i * (h - 8 * z) / 2, w - 4 * z, 2.4 * z, shade(rust, 1.2));
      px(sx - w / 2, sy - h / 2, w, 2 * z, '#9a7a48');
      // the glint that is the only thing telling you it is there
      const g = 0.4 + 0.6 * Math.max(0, Math.sin(s.t * 1.7));
      px(sx + 4 * z, sy - 2 * z, 2.4 * z, 2.4 * z, 'rgba(255,232,106,' + g.toFixed(2) + ')');
      if (g > 0.85) { px(sx + 1 * z, sy - 1 * z, 9 * z, 1 * z, 'rgba(255,240,160,0.5)'); px(sx + 4 * z, sy - 5 * z, 1 * z, 9 * z, 'rgba(255,240,160,0.5)'); }
    }
  },
};
