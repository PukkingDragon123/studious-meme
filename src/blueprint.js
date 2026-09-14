'use strict';
// ---------------------------------------------------------------------------
// THE BLUEPRINT.
//
// Somebody drew this system before they built it, and the drawing is still in
// a cabinet in a building above it. This is that drawing: a long section of
// the whole works at 1:500, white line on ferro-prussiate blue, with the five
// levels lettered, every flight of steps shown, the manhole shafts drawn up to
// the street and a title block in the corner nobody has filled in since 1974.
//
// It is also the only map in the game, so it carries one thing the draughtsman
// never put on it: a ring round where you are standing.
// ---------------------------------------------------------------------------
const Blueprint = {
  X0: -7700, X1: 1100,           // the sheet covers the works and the system
  Y0: -1760, Y1: 1120,           // and every level of it, top to bottom
  t: 0,

  // the paper, drawn once and reused: a wash of blue with the tooth of the
  // linen in it and the fold marks where it has been in a drawer since 1974
  paper() {
    return Tex.get('bpr', 96, (x, S) => {
      x.fillStyle = '#123a63'; x.fillRect(0, 0, S, S);
      for (let i = 0; i < 700; i++) {
        const gx = ihash(i, 11) * S, gy = ihash(i, 12) * S, v = ihash(i, 13);
        x.fillStyle = v < 0.45 ? 'rgba(255,255,255,0.035)' : v < 0.8 ? 'rgba(0,0,0,0.07)' : 'rgba(140,190,230,0.06)';
        x.fillRect(gx | 0, gy | 0, 1, 1);
      }
      x.fillStyle = 'rgba(255,255,255,0.03)';
      for (let y = 0; y < S; y += 3) x.fillRect(0, y, S, 1);
    });
  },

  open() { this.t = 0; },

  draw(ctx) {
    const W = G.W, H = G.H;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    // ---- the sheet -------------------------------------------------------
    px(0, 0, W, H, '#0a1f36');
    const M = 14, sheetW = W - M * 2, sheetH = H - M * 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(M, M, sheetW, sheetH); ctx.clip();
    Tex.fill(ctx, this.paper(), 0, 0, 1, 1);
    ctx.restore();
    // the drawn border, double ruled, with the trim marks outside it
    px(M, M, sheetW, 1, '#bcd8ee'); px(M, M + sheetH - 1, sheetW, 1, '#bcd8ee');
    px(M, M, 1, sheetH, '#bcd8ee'); px(M + sheetW - 1, M, 1, sheetH, '#bcd8ee');
    px(M + 4, M + 4, sheetW - 8, 1, 'rgba(188,216,238,0.45)'); px(M + 4, M + sheetH - 5, sheetW - 8, 1, 'rgba(188,216,238,0.45)');
    px(M + 4, M + 4, 1, sheetH - 8, 'rgba(188,216,238,0.45)'); px(M + sheetW - 5, M + 4, 1, sheetH - 8, 'rgba(188,216,238,0.45)');

    // ---- the frame the section is drawn in -------------------------------
    const fx = M + 30, fy = M + 34, fw = sheetW - 60, fh = sheetH - 92;
    const sx = (wx) => fx + (wx - this.X0) / (this.X1 - this.X0) * fw;
    const sy = (wy) => fy + (wy - this.Y0) / (this.Y1 - this.Y0) * fh;

    // the grid: a chain line every five hundred feet, the way a section sheet
    // is set out, faint enough to read through
    ctx.globalAlpha = 0.20;
    for (let wx = -7500; wx <= this.X1; wx += 500) { const x = sx(wx); for (let y = fy; y < fy + fh; y += 5) px(x, y, 1, 3, '#8fbfe4'); }
    for (let wy = this.Y0 + 160; wy <= this.Y1; wy += 320) { const y = sy(wy); for (let x = fx; x < fx + fw; x += 5) px(x, y, 3, 1, '#8fbfe4'); }
    ctx.globalAlpha = 1;

    // ---- the ground line, and the street over it -------------------------
    const gy = sy(-1760);
    px(fx, gy + 8, fw, 1, '#cfe6f6');
    for (let x = fx; x < fx + fw; x += 4) px(x, gy + 10, 2, 2, 'rgba(207,230,246,0.5)');
    Font.draw(ctx, 'STREET LEVEL', fx + 4, gy - 2, { color: 'rgba(207,230,246,0.7)' });

    // ---- the works and the system, drawn as a barrel ---------------------
    // the roof and the invert, one polyline each, with the section hatched
    const pts = [];
    for (let i = 0; i <= 260; i++) {
      const wx = this.X0 + (this.X1 - this.X0) * (i / 260);
      const fl = World.floorY(wx), rf = World.roofY(wx);
      pts.push([sx(wx), sy(fl), rf === null ? null : sy(rf)]);
    }
    // the void inside it
    ctx.beginPath();
    let started = false;
    for (const [x, f, r] of pts) { if (r === null) { started = false; continue; } if (!started) { ctx.moveTo(x, r); started = true; } else ctx.lineTo(x, r); }
    for (let i = pts.length - 1; i >= 0; i--) { const [x, f, r] = pts[i]; if (r === null) continue; ctx.lineTo(x, f); }
    ctx.closePath();
    ctx.fillStyle = 'rgba(4,16,30,0.5)'; ctx.fill();
    // and the lines that bound it
    ctx.lineWidth = 1;
    for (const which of [2, 1]) {
      ctx.strokeStyle = which === 2 ? 'rgba(207,230,246,0.75)' : '#eaf4fc';
      ctx.beginPath(); let on = false;
      for (const p of pts) { const v = p[which]; if (v === null) { on = false; continue; } if (!on) { ctx.moveTo(p[0], v); on = true; } else ctx.lineTo(p[0], v); }
      ctx.stroke();
    }
    // the water in it: a hatch below the line the system stands at
    const wl = sy(0);
    ctx.save();
    ctx.beginPath();
    started = false;
    for (const [x, f, r] of pts) { if (r === null) { started = false; continue; } if (!started) { ctx.moveTo(x, Math.max(r, wl)); started = true; } else ctx.lineTo(x, Math.max(r, wl)); }
    for (let i = pts.length - 1; i >= 0; i--) { const [x, f, r] = pts[i]; if (r === null) continue; ctx.lineTo(x, Math.max(f, wl)); }
    ctx.closePath(); ctx.clip();
    ctx.globalAlpha = 0.4;
    for (let d = -fh; d < fw; d += 6) { ctx.strokeStyle = '#7fc8e8'; ctx.beginPath(); ctx.moveTo(fx + d, fy + fh); ctx.lineTo(fx + d + fh, fy); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ---- the flights of steps, drawn as steps ----------------------------
    if (typeof STAIRS !== 'undefined') {
      for (const [a, b] of STAIRS) {
        if (b < this.X0 || a > this.X1) continue;
        ctx.strokeStyle = '#ffd8a0'; ctx.lineWidth = 1;
        ctx.beginPath();
        const n = 9;
        ctx.moveTo(sx(a), sy(World.floorY(a)));
        for (let i = 0; i <= n; i++) {
          const wx0 = a + (b - a) * (i / n), wx1 = a + (b - a) * ((i + 1) / n);
          const y0 = sy(World.floorY(wx0)), y1 = sy(World.floorY(wx1));
          ctx.lineTo(sx(wx0), y0); ctx.lineTo(sx(wx0), y1); ctx.lineTo(sx(wx1), y1);
        }
        ctx.stroke();
        // and the flight marked as a flight, the way a section marks one
        const mx2 = (sx(a) + sx(b)) / 2, my2 = sy(World.floorY((a + b) / 2));
        px(mx2 - 7, my2 - 16, 15, 1, 'rgba(255,216,160,0.7)');
        px(mx2 - 7, my2 - 18, 1, 5, 'rgba(255,216,160,0.7)');
        px(mx2 + 7, my2 - 18, 1, 5, 'rgba(255,216,160,0.7)');
      }
    }

    // ---- the manhole shafts, drawn up to the street ----------------------
    if (typeof MANHOLES !== 'undefined') {
      for (const [mx] of MANHOLES) {
        const rf = World.roofY(mx); if (rf === null) continue;
        const x = sx(mx), top = gy + 8, bot = sy(rf);
        px(x - 2, top, 1, bot - top, 'rgba(207,230,246,0.65)');
        px(x + 2, top, 1, bot - top, 'rgba(207,230,246,0.65)');
        px(x - 4, top - 2, 9, 2, '#eaf4fc');
      }
    }

    // ---- the levels, lettered the way the draughtsman lettered them ------
    const LEVELS = [
      ['LEVEL 1 — THE WAKE', -5880, -4950],
      ['LEVEL 2 — THE MAIN INTERCEPTOR', -4720, -3560],
      ['LEVEL 3 — THE FLOODED GALLERY', -3240, -2100],
      ['LEVEL 4 — THE ACID SUMP', -1760, -820],
      ['LEVEL 5 — THE OUTFALL', -400, 1000],
    ];
    for (let i = 0; i < LEVELS.length; i++) {
      const [name, a, b] = LEVELS[i];
      const x0 = sx(a), x1 = sx(b), y = sy(World.floorY((a + b) / 2)) + 9;
      px(x0, y, x1 - x0, 1, 'rgba(255,216,160,0.55)');
      px(x0, y - 3, 1, 7, 'rgba(255,216,160,0.8)'); px(x1 - 1, y - 3, 1, 7, 'rgba(255,216,160,0.8)');
      Font.draw(ctx, String(i + 1), (x0 + x1) / 2, y + 4, { color: '#ffd8a0', align: 'center' });
    }
    // the key, down the left, because the names will not fit on the section
    let ky = fy + fh + 12;
    for (let i = 0; i < LEVELS.length; i++) {
      const col = i === 3 ? '#b8e050' : '#cfe6f6';
      Font.draw(ctx, (i + 1) + '  ' + LEVELS[i][0].split('— ')[1], M + 34 + (i % 2) * 190, ky + Math.floor(i / 2) * 11, { color: col });
    }

    // ---- labels on the two ends ------------------------------------------
    Font.draw(ctx, 'FACILITY B', sx(-6800), sy(-1400) - 6, { color: '#eaf4fc', align: 'center' });
    px(sx(-7640), sy(-1700) - 2, sx(-5900) - sx(-7640), 1, '#eaf4fc');
    Font.draw(ctx, 'OUTFALL', sx(940), sy(-36) - 8, { color: '#b8f0c8', align: 'center' });
    Font.draw(ctx, 'DROP SHAFT', sx(-5930) + 3, sy(-760), { color: '#ffb0a0' });

    // ---- where you are ---------------------------------------------------
    const P = G.player;
    if (P) {
      const x = clamp(sx(P.x), fx, fx + fw), y = clamp(sy(P.y), fy, fy + fh);
      const r = 5 + Math.sin(this.t * 4) * 1.6;
      ctx.strokeStyle = '#ff6a50'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, TAU); ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
      px(x - 9, y, 6, 1, '#ff6a50'); px(x + 4, y, 6, 1, '#ff6a50');
      px(x, y - 9, 1, 6, '#ff6a50'); px(x, y + 4, 1, 6, '#ff6a50');
      Font.draw(ctx, 'YOU', x, y - 17, { color: '#ff6a50', align: 'center' });
    }

    // ---- the title block -------------------------------------------------
    const tbW = 158, tbH = 40, tbX = M + sheetW - tbW - 6, tbY = M + sheetH - tbH - 6;
    px(tbX, tbY, tbW, tbH, 'rgba(8,30,52,0.85)');
    px(tbX, tbY, tbW, 1, '#cfe6f6'); px(tbX, tbY + tbH - 1, tbW, 1, '#cfe6f6');
    px(tbX, tbY, 1, tbH, '#cfe6f6'); px(tbX + tbW - 1, tbY, 1, tbH, '#cfe6f6');
    px(tbX, tbY + 13, tbW, 1, 'rgba(207,230,246,0.5)');
    px(tbX + 96, tbY + 13, 1, tbH - 13, 'rgba(207,230,246,0.5)');
    Font.draw(ctx, 'RELIEF SYSTEM — LONG SECTION', tbX + 5, tbY + 4, { color: '#eaf4fc' });
    Font.draw(ctx, 'SHEET 3 OF 3', tbX + 5, tbY + 18, { color: 'rgba(207,230,246,0.8)' });
    Font.draw(ctx, 'SCALE 1:500', tbX + 5, tbY + 29, { color: 'rgba(207,230,246,0.8)' });
    Font.draw(ctx, 'REV. C', tbX + 101, tbY + 18, { color: 'rgba(207,230,246,0.8)' });
    Font.draw(ctx, '1974', tbX + 101, tbY + 29, { color: 'rgba(207,230,246,0.8)' });

    // ---- and the one thing the drawing office never wrote on it ----------
    if (Math.floor(this.t * 1.4) % 2) {
      Font.draw(ctx, 'M / ESC — CLOSE', M + sheetW - 10, M + 8, { color: 'rgba(207,230,246,0.7)', align: 'right' });
    }
  },
};
