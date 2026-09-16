'use strict';
// ---------------------------------------------------------------------------
// TERRITORY.
//
// Bosses used to arrive. You shed your skin, a timer ran, and something came
// over the horizon whether you wanted it or not. That is an event, not a
// world: nothing about the map told you it was coming and nothing about the
// map was different once it was dead.
//
// Now every boss owns a stretch. It is always in the same place, it is there
// before you are, and it never leaves. You find its lair the way you find
// anything down here — by the state of the water on the way in: bones on the
// floor, a silt haze, the sound it makes when it is not hunting. Swim into the
// middle of that and it wakes up. Stay out and it never touches you.
// ---------------------------------------------------------------------------
const LAIRS = [
  // ---- the system ------------------------------------------------------
  { id: 'broodmother', x: -4020, r: 200, warn: 520, name: 'THE BROODMOTHER', sign: 'nest', tell: 'SOMETHING HAS BEEN BREEDING IN THE DEEP HOLES' },
  { id: 'gnasher', x: -2280, r: 260, warn: 680, name: 'THE GNASHER', sign: 'bones', tell: 'THERE ARE BONES ON EVERY PILING' },
  { id: 'sludgeking', x: 640, r: 330, warn: 860, name: 'THE GATEKEEPER', sign: 'sludge', tell: 'THE CURRENT IS GOING THE WRONG WAY' },
  // ---- the glades ------------------------------------------------------
  { id: 'oldscar', x: 4250, r: 300, warn: 760, name: 'OLD SCAR', sign: 'bones', tell: 'THIS BANK BELONGS TO SOMETHING' },
  { id: 'python', x: 5950, r: 280, warn: 720, name: 'MOTHER PYTHON', sign: 'sheds', tell: 'SHED SKIN, AND PLENTY OF IT' },
  { id: 'warboat', x: 9300, r: 320, warn: 800, name: 'THE POACHER WARBOAT', sign: 'traps', tell: 'TRAPLINES. SOMEBODY WORKS THIS WATER' },
  { id: 'skunkape', x: 14250, r: 340, warn: 900, name: 'THE SKUNK APE', sign: 'prints', tell: 'PRINTS IN THE MUD, AND THEY ARE NOT YOURS' },
  // ---- the ocean -------------------------------------------------------
  { id: 'anvil', x: 21800, r: 320, warn: 800, name: 'THE ANVIL', sign: 'bones', tell: 'EVERY FISH HERE IS SWIMMING THE OTHER WAY' },
  { id: 'greenwall', x: 25100, r: 320, warn: 800, name: 'THE GREEN WALL', sign: 'holes', tell: 'HOLES IN THE REEF BIG ENOUGH TO SWIM INTO' },
  { id: 'lantern', x: 34200, r: 400, warn: 1100, name: 'THE LANTERN', sign: 'glow', tell: 'THERE IS A LIGHT DOWN THERE' },
];
const LAIR_BY_ID = {};
for (const L of LAIRS) LAIR_BY_ID[L.id] = L;

const Lairs = {
  cleared: {}, warned: {}, woken: {}, nearT: 0, armT: 0,

  // A run opens with a few seconds of grace: nobody wants to be told whose
  // water this is before they have their bearings.
  reset() { this.cleared = {}; this.warned = {}; this.woken = {}; this.nearT = 0; this.armT = 5; },

  // the lair whose territory the player is standing in, if any
  at(x) {
    for (const L of LAIRS) if (Math.abs(x - L.x) < L.r) return L;
    return null;
  },
  // the nearest lair worth mentioning
  near(x) {
    let best = null, bd = 1e9;
    for (const L of LAIRS) { const d = Math.abs(x - L.x); if (d < L.warn && d < bd) { bd = d; best = L; } }
    return best;
  },

  update(dt) {
    const P = G.player;
    if (!P || P.dead || G.state !== 'play') return;
    // nothing holds territory in the facility, and nothing is announced while you are still in the tank
    if ((typeof Opening !== 'undefined' && Opening.on) || Biome.at(P.x).lab || Biome.at(P.x).pipe) return;
    if (this.armT > 0) { this.armT -= dt; return; }
    const L = this.near(P.x);
    if (!L || this.cleared[L.id]) return;
    const d = Math.abs(P.x - L.x);
    // the approach: the map tells you before anything else does
    if (!this.warned[L.id] && d < L.warn) {
      this.warned[L.id] = 1;
      G.banner = { text: 'TERRITORY', sub: L.tell, t: 3.4, max: 3.4, color: '#ff8c40' };
      SFX.growl && SFX.growl(0);
    }
    // signs in the water, thicker the closer you get
    const k = clamp(1 - d / L.warn, 0, 1);
    if (chance(dt * 6 * k)) {
      const sx = P.x + rand(-160, 160), sy = clamp(World.floorY(sx) - rand(2, 26), 4, 4000);
      if (L.sign === 'glow') G.fx.glow(sx, sy, rand(1.5, 3.5), '#7affda', rand(0.2, 0.5));
      else if (L.sign === 'sludge') G.fx.bubbles(sx, sy, 1, 6);
      else G.fx.silt(sx, sy, 1, 10);
    }
    if (k > 0.55 && chance(dt * 0.5)) SFX.growl && SFX.growl(G.panOf(L.x));
    // and the middle of it wakes whatever lives there
    if (!this.woken[L.id] && d < L.r && !G.boss) {
      this.woken[L.id] = 1;
      G.spawnBoss(L.id, L.x);
      // and the door shuts behind you
      if (typeof Arena !== 'undefined') Arena.begin(L, G.boss);
    }
  },

  // called when a boss dies: its stretch is quiet from here on
  clear(kind) { if (kind) this.cleared[kind] = 1; },

  // a marker on the edge of the screen for a territory you are inside of
  draw(ctx) {
    const P = G.player; if (!P || P.dead) return;
    const L = this.near(P.x);
    if (!L || this.cleared[L.id]) return;
    const d = Math.abs(P.x - L.x), k = clamp(1 - d / L.warn, 0, 1);
    const [sx] = G.cam.toScreen(L.x, P.y);
    const col = d < L.r ? '#ff4030' : '#ff8c40';
    if (sx > 16 && sx < G.W - 16) return;
    const x = sx <= 16 ? 12 : G.W - 12, dir = sx <= 16 ? -1 : 1, y = 92;
    ctx.globalAlpha = 0.4 + k * 0.6;
    ctx.fillStyle = 'rgba(8,6,6,0.7)'; ctx.fillRect(x - 9, y - 8, 18, 16);
    ctx.fillStyle = col;
    // a skull, four pixels wide, which is all the warning anybody needs
    ctx.fillRect(x - 4, y - 5, 8, 6); ctx.fillRect(x - 3, y + 1, 6, 3);
    ctx.fillStyle = '#100808'; ctx.fillRect(x - 3, y - 4, 2, 2); ctx.fillRect(x + 1, y - 4, 2, 2); ctx.fillRect(x - 1, y + 1, 2, 2);
    ctx.globalAlpha = 1;
    Font.draw(ctx, Math.round(d / 10) + 'M', x, y + 10, { color: col, align: 'center' });
    ctx.fillStyle = col; ctx.fillRect(x + dir * 6, y - 1, 3, 2);
  },
};
