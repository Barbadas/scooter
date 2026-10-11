/* Visuels provisoires dessinés au canvas, style « cel-shading » :
   contours sombres, dégradés, reflets, yeux lumineux.
   Chaque peintre reçoit (ctx, s, o) : origine = pieds du personnage,
   s = taille de la boîte en pixels,
   o = { dir, ph (phase de marche, absente à l'arrêt), idle, t, shadow, glow, pose, faceX }.
   Ils disparaissent automatiquement dès qu'une image est branchée dans assets.js. */
(function () {
  const TAU = Math.PI * 2;
  const U = G.U;
  const P = {};
  let LW = 1, OUT = '#06080d';

  // ═════════════ Couleurs ═════════════
  const memo = new Map();
  function rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const k = a + b + t;
    let r = memo.get(k);
    if (r) return r;
    const A = rgb(a), B = rgb(b);
    r = '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
    memo.set(k, r);
    return r;
  }
  const lite = (c, t) => mix(c, '#ffffff', t);
  const dark = (c, t) => mix(c, '#000000', t);

  // ═════════════ Primitives (remplissage + contour) ═════════════
  function begin(s, o) {
    LW = Math.max(1, s * 0.022);
    OUT = o.shadow ? '#6f52e0' : '#06080d';
  }
  function lg(ctx, x0, y0, x1, y1, c0, c1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    return g;
  }
  function rg(ctx, x, y, r0, r1, c0, c1) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    return g;
  }
  function done(ctx, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke !== false) {
      ctx.lineWidth = LW;
      ctx.strokeStyle = OUT;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }
  function poly(ctx, pts, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    done(ctx, fill, stroke);
  }
  function ell(ctx, x, y, rx, ry, fill, stroke, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU);
    done(ctx, fill, stroke);
  }
  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
    else ctx.rect(x, y, w, h);
    done(ctx, fill, stroke);
  }
  // Membre = segment épais à bouts ronds, contour compris
  function limb(ctx, x0, y0, x1, y1, w, fill) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT; ctx.lineWidth = w + LW * 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  function line(ctx, pts, color, w) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.stroke();
  }
  // Lueur douce (sans shadowBlur, coûteux)
  function glowDot(ctx, x, y, r, rgbStr, a = 1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(${rgbStr},${0.85 * a})`);
    g.addColorStop(0.3, `rgba(${rgbStr},${0.35 * a})`);
    g.addColorStop(1, `rgba(${rgbStr},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  function trapezoid(ctx, x, y0, y1, w0, w1, r, fill, dx0 = 0, dx1 = 0) {
    ctx.beginPath();
    ctx.moveTo(x - w0 / 2 + r, y0);
    ctx.lineTo(x + w0 / 2 - r, y0);
    ctx.quadraticCurveTo(x + w0 / 2, y0, x + w0 / 2 + r * 0.1, y0 + r);
    ctx.lineTo(x + w1 / 2 + dx1, y1);
    ctx.quadraticCurveTo(x, y1 + r * 0.25, x - w1 / 2 + dx0, y1);
    ctx.lineTo(x - w0 / 2 - r * 0.1, y0 + r);
    ctx.quadraticCurveTo(x - w0 / 2, y0, x - w0 / 2 + r, y0);
    ctx.closePath();
    done(ctx, fill);
  }

  // Palette des soldats de l'ombre
  const SHP = {
    skin: '#2a2150', coat: '#16112f', coat2: '#201945', shirt: '#0c0a1c', pants: '#0f0b22', boots: '#09070f',
    hair: '#0b0818', metal: '#5a49a8', wood: '#2c2356', belt: '#221a4a', fur: '#231b4c', hood: '#1b153a',
    trim: '#4a3a98', cloth: '#221a4a', stone: '#251d4e', bone: '#4a3a98', horn: '#4a3a98', hand: null,
    eye: '#e2d8ff', eyeRGB: '190,160,255', eyeGlow: true, paint: null, cracks: null, moss: null,
  };

  // ═════════════ Humanoïdes ═════════════
  function weapon(ctx, s, c, x, y, rot, k = 1) {
    const w = c.weapon;
    if (!w) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const metal = c.metal || '#cfd9e8';
    if (w === 'dagger' || w === 'sword') {
      const len = (w === 'sword' ? 0.46 : 0.24) * s * k, bw = (w === 'sword' ? 0.045 : 0.038) * s;
      rr(ctx, -bw * 0.35, 0, bw * 0.7, s * 0.07, 1, w === 'sword' ? '#7a5a32' : '#252a36');
      poly(ctx, [-bw / 2, -s * 0.01, bw / 2, -s * 0.01, bw / 2, -len * 0.82, 0, -len, -bw / 2, -len * 0.82], lg(ctx, -bw / 2, 0, bw / 2, 0, lite(metal, 0.35), dark(metal, 0.3)));
      line(ctx, [-bw * 0.15, -s * 0.02, -bw * 0.15, -len * 0.8], 'rgba(255,255,255,0.55)', Math.max(1, LW * 0.6));
      rr(ctx, -bw * 1.5, -s * 0.015, bw * 3, s * 0.025, 1, w === 'sword' ? '#c9a54a' : '#3b4252');
    } else if (w === 'club') {
      const L = 0.46 * s * k;
      poly(ctx, [-s * 0.03, s * 0.04, s * 0.03, s * 0.04, s * 0.085 * k, -L, -s * 0.085 * k, -L], lg(ctx, -s * 0.08, 0, s * 0.08, 0, lite(c.wood, 0.15), dark(c.wood, 0.3)));
      ell(ctx, 0, -L, s * 0.095 * k, s * 0.075 * k, lite(c.wood, 0.08));
      for (let i = 0; i < 5; i++) {
        const yy = -L * (0.55 + i * 0.1), sd = i % 2 ? 1 : -1, x0 = sd * s * 0.06 * k;
        poly(ctx, [x0, yy, x0 + sd * s * 0.07, yy - s * 0.02, x0, yy - s * 0.045], '#d8d2c0');
      }
    } else if (w === 'hammer') {
      rr(ctx, -s * 0.025, -s * 0.52, s * 0.05, s * 0.6, 2, dark(c.coat2, 0.2));
      rr(ctx, -s * 0.17, -s * 0.66, s * 0.34, s * 0.17, 3, lg(ctx, 0, -s * 0.66, 0, -s * 0.49, lite(c.stone || '#7b828e', 0.15), dark(c.stone || '#7b828e', 0.25)));
      line(ctx, [-s * 0.12, -s * 0.6, s * 0.1, -s * 0.6], 'rgba(255,255,255,0.18)', LW);
    } else if (w === 'bow') {
      ctx.lineCap = 'round';
      ctx.strokeStyle = OUT; ctx.lineWidth = s * 0.045;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.24, -1.2, 1.2); ctx.stroke();
      ctx.strokeStyle = c.wood || '#7a5530'; ctx.lineWidth = s * 0.028;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.24, -1.2, 1.2); ctx.stroke();
      line(ctx, [Math.cos(-1.2) * s * 0.24, Math.sin(-1.2) * s * 0.24, Math.cos(1.2) * s * 0.24, Math.sin(1.2) * s * 0.24], 'rgba(235,230,210,0.85)', 1);
    }
    ctx.restore();
  }

  function ears(ctx, c, view, hx, hy, hr) {
    const inner = dark(c.skin, 0.25);
    if (view === 'side') {
      poly(ctx, [hx - hr * 0.25, hy - hr * 0.2, hx - hr * 1.75, hy - hr * 0.95, hx - hr * 0.45, hy + hr * 0.35], c.skin);
      poly(ctx, [hx - hr * 0.45, hy - hr * 0.1, hx - hr * 1.35, hy - hr * 0.7, hx - hr * 0.55, hy + hr * 0.15], inner, false);
      return;
    }
    for (const k of [-1, 1]) {
      poly(ctx, [hx + k * hr * 0.7, hy - hr * 0.2, hx + k * hr * 1.95, hy - hr * 0.8, hx + k * hr * 0.78, hy + hr * 0.38], c.skin);
      if (view === 'front') poly(ctx, [hx + k * hr * 0.85, hy - hr * 0.1, hx + k * hr * 1.6, hy - hr * 0.6, hx + k * hr * 0.88, hy + hr * 0.2], inner, false);
    }
  }

  function face(ctx, c, o, view, hx, hy, hr) {
    const side = view === 'side';
    const lit = c.eyeGlow || o.glow || o.shadow;
    const eyeRGB = o.shadow ? '190,160,255' : (o.glow && !c.eyeGlow ? '95,200,255' : (c.eyeRGB || '255,255,255'));
    const eyeCol = o.shadow ? '#e2d8ff' : (o.glow && !c.eyeGlow ? '#9fe2ff' : c.eye);
    const pts = side ? [[hx + hr * 0.52, hy + hr * 0.08]] : [[hx - hr * 0.37, hy + hr * 0.1], [hx + hr * 0.37, hy + hr * 0.1]];
    for (const [x, y] of pts) {
      if (o.pose === 'hurt') {
        line(ctx, [x - hr * 0.13, y - hr * 0.1, x + hr * 0.13, y + hr * 0.1], OUT, Math.max(1, hr * 0.1));
        line(ctx, [x - hr * 0.13, y + hr * 0.1, x + hr * 0.13, y - hr * 0.1], OUT, Math.max(1, hr * 0.1));
        continue;
      }
      if (lit) glowDot(ctx, x, y, hr * 0.14, eyeRGB, 0.95);
      ell(ctx, x, y, hr * 0.12, hr * 0.17, eyeCol, false);
      if (!lit) ell(ctx, x - hr * 0.04, y - hr * 0.06, hr * 0.045, hr * 0.045, 'rgba(255,255,255,0.95)', false);
      else ell(ctx, x, y, hr * 0.05, hr * 0.08, '#ffffff', false);
    }
    // sourcils froncés
    if (c.brows !== false && c.hairStyle !== 'stonehelm') {
      const bc = c.browCol || dark(c.hair || c.skin, 0.2);
      for (const [x, y] of pts) {
        const k = side ? 1 : (x < hx ? 1 : -1);
        line(ctx, [x - k * hr * 0.17, y - hr * 0.3, x + k * hr * 0.12, y - hr * 0.2], bc, Math.max(1, hr * 0.09));
      }
    }
    // nez
    if (c.nose) {
      if (side) poly(ctx, [hx + hr * 0.8, hy, hx + hr * 1.35, hy + hr * 0.32, hx + hr * 0.78, hy + hr * 0.36], lite(c.skin, 0.05));
      else poly(ctx, [hx - hr * 0.12, hy + hr * 0.15, hx, hy + hr * 0.62, hx + hr * 0.12, hy + hr * 0.15], dark(c.skin, 0.1));
    }
    // bouche
    const mx = side ? hx + hr * 0.55 : hx, my = hy + hr * 0.58;
    if (c.grin) {
      const w = side ? hr * 0.35 : hr * 0.62;
      ctx.beginPath();
      ctx.moveTo(mx - w / 2, my - hr * 0.05);
      ctx.quadraticCurveTo(mx, my + hr * 0.28, mx + w / 2, my - hr * 0.05);
      ctx.closePath();
      done(ctx, '#2a0b0b');
      for (let i = 0; i < 3; i++) {
        const tx = mx - w * 0.3 + i * w * 0.3;
        poly(ctx, [tx - hr * 0.06, my - hr * 0.02, tx + hr * 0.06, my - hr * 0.02, tx, my + hr * 0.12], '#f4efe0', false);
      }
    } else if (!side) {
      line(ctx, [mx - hr * 0.1, my, mx + hr * 0.1, my], dark(c.skin, 0.45), Math.max(1, hr * 0.07));
    }
    if (c.paint) {
      if (side) rr(ctx, hx + hr * 0.1, hy + hr * 0.28, hr * 0.7, hr * 0.12, 1, c.paint, false);
      else for (const k of [-1, 1]) rr(ctx, hx + k * hr * 0.25 - hr * 0.22, hy + hr * 0.32, hr * 0.44, hr * 0.11, 1, c.paint, false);
    }
  }

  function hair(ctx, c, view, hx, hy, hr) {
    const st = c.hairStyle;
    if (st === 'none' || st === 'stonehelm') return;
    if (st === 'helmet') return helmet(ctx, c, view, hx, hy, hr);
    if (st === 'hood') {
      const f = lg(ctx, 0, hy - hr, 0, hy + hr, lite(c.hood, 0.12), dark(c.hood, 0.25));
      if (view === 'back') { ell(ctx, hx, hy - hr * 0.02, hr * 1.2, hr * 1.16, f); return; }
      ctx.beginPath();
      if (view === 'side') {
        ctx.arc(hx - hr * 0.05, hy - hr * 0.02, hr * 1.18, -0.6, Math.PI * 0.7, true);
        ctx.quadraticCurveTo(hx - hr * 0.2, hy - hr * 0.2, hx + hr * 0.75, hy - hr * 0.75);
      } else {
        ctx.arc(hx, hy, hr * 1.2, Math.PI * 0.92, Math.PI * 2.08);
        ctx.quadraticCurveTo(hx, hy - hr * 1.0, hx - hr * 1.2 * Math.cos(Math.PI * 0.08), hy + hr * 1.2 * Math.sin(Math.PI * 0.08));
      }
      ctx.closePath();
      done(ctx, f);
      return;
    }
    const col = c.hair;
    const f = lg(ctx, 0, hy - hr * 1.2, 0, hy + hr * 0.6, lite(col, 0.18), dark(col, 0.15));
    const spike = pts => poly(ctx, pts.map((v, i) => (i % 2 ? hy + v * hr : hx + v * hr)), f);
    const spiky = st === 'spiky';
    if (view === 'back') {
      if (spiky) for (const sp of [[-0.75, -0.6, -1.2, -1.15, -0.25, -0.95], [-0.3, -0.95, 0.05, -1.5, 0.35, -0.95], [0.25, -0.95, 0.85, -1.25, 0.85, -0.55], [-1.0, -0.2, -1.3, -0.6, -0.85, -0.6], [0.95, -0.2, 1.3, -0.55, 0.85, -0.6]]) spike(sp);
      ell(ctx, hx, hy - hr * 0.02, hr * 1.06, hr * 1.04, f);
      if (spiky) for (const sp of [[-0.75, 0.45, -0.55, 1.05, -0.2, 0.6], [-0.3, 0.6, 0, 1.15, 0.3, 0.6], [0.2, 0.6, 0.55, 1.05, 0.75, 0.45]]) spike(sp);
      if (st === 'ponytail') {
        ell(ctx, hx, hy + hr * 1.15, hr * 0.32, hr * 0.85, f);
        rr(ctx, hx - hr * 0.22, hy + hr * 0.42, hr * 0.44, hr * 0.16, 2, c.trim || '#3f8cff');
      }
    } else if (view === 'side') {
      if (spiky) for (const sp of [[-0.85, -0.55, -1.6, -0.75, -1.0, -0.15], [-0.9, -0.05, -1.55, 0.15, -0.85, 0.4], [-0.45, -0.95, -0.95, -1.4, -0.05, -1.0], [0.05, -1.0, 0.3, -1.5, 0.5, -0.85]]) spike(sp);
      ctx.beginPath();
      ctx.arc(hx - hr * 0.03, hy - hr * 0.02, hr * 1.08, -0.3, -Math.PI * 1.36, true);
      ctx.lineTo(hx - hr * 0.1, hy + hr * 0.15);
      ctx.quadraticCurveTo(hx + hr * 0.25, hy - hr * 0.55, hx + hr * 1.02, hy - hr * 0.33);
      ctx.closePath();
      done(ctx, f);
      if (spiky) { spike([0.35, -0.85, 1.1, -0.55, 0.55, -0.28]); spike([0.6, -0.5, 1.02, 0.0, 0.5, -0.18]); }
      else spike([0.2, -0.9, 1.05, -0.45, 0.4, -0.3]);
    } else {
      if (spiky) for (const sp of [[-1.0, -0.15, -1.3, -0.6, -0.8, -0.6], [-0.85, -0.6, -1.0, -1.15, -0.35, -0.9], [-0.4, -0.95, -0.15, -1.45, 0.15, -0.95], [0.1, -0.98, 0.6, -1.3, 0.6, -0.78], [0.62, -0.72, 1.2, -0.9, 0.98, -0.32]]) spike(sp);
      ctx.beginPath();
      ctx.moveTo(hx - hr * 1.04, hy + hr * 0.08);
      ctx.arc(hx, hy - hr * 0.02, hr * 1.07, Math.PI * 0.97, Math.PI * 2.03);
      ctx.lineTo(hx + hr * 1.04, hy + hr * 0.08);
      ctx.quadraticCurveTo(hx, hy - hr * 0.68, hx - hr * 1.04, hy + hr * 0.08);
      ctx.closePath();
      done(ctx, f);
      if (spiky) {
        for (const sp of [[-0.82, -0.5, -0.6, 0.02, -0.38, -0.48], [-0.42, -0.58, -0.15, -0.04, 0.06, -0.55], [0.0, -0.58, 0.32, 0.0, 0.46, -0.52], [0.42, -0.52, 0.78, -0.08, 0.86, -0.46]]) spike(sp);
        for (const k of [-1, 1]) spike([k * 0.95, -0.2, k * 1.02, 0.42, k * 0.72, -0.1]);
      } else {
        spike([-0.95, -0.25, -0.2, -0.75, 0.55, -0.55, -0.35, -0.2, -0.85, 0.35]);
        for (const k of [-1, 1]) spike([k * 0.98, -0.1, k * 1.05, 0.55, k * 0.8, 0.0]);
      }
    }
    // reflet « anime »
    if (view !== 'back' || spiky) {
      ctx.strokeStyle = lite(col, 0.45);
      ctx.lineWidth = Math.max(1, hr * 0.12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(hx - hr * 0.15, hy - hr * 0.35, hr * 0.55, Math.PI * 1.15, Math.PI * 1.5);
      ctx.stroke();
    }
  }

  function helmet(ctx, c, view, hx, hy, hr) {
    const metal = lg(ctx, hx - hr, 0, hx + hr, 0, lite(c.metal, 0.25), dark(c.metal, 0.3));
    const horn = (k, behind) => {
      const x0 = hx + k * hr * 0.75, y0 = hy - hr * 0.55;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + hr * 0.18);
      ctx.quadraticCurveTo(x0 + k * hr * 1.0, y0 + hr * 0.1, x0 + k * hr * 1.0, y0 - hr * 1.05);
      ctx.quadraticCurveTo(x0 + k * hr * 0.55, y0 - hr * 0.35, x0 - k * hr * 0.15, y0 - hr * 0.1);
      ctx.closePath();
      done(ctx, behind ? dark(c.horn, 0.3) : lg(ctx, x0, y0, x0 + k * hr, y0 - hr, c.horn, dark(c.horn, 0.25)));
    };
    if (view === 'side') { horn(-1, true); }
    else { horn(-1); horn(1); }
    ctx.beginPath();
    ctx.arc(hx, hy - hr * 0.08, hr * 1.1, Math.PI, TAU);
    ctx.lineTo(hx + hr * 1.1, hy + hr * 0.05);
    ctx.lineTo(hx - hr * 1.1, hy + hr * 0.05);
    ctx.closePath();
    done(ctx, metal);
    rr(ctx, hx - hr * 1.15, hy - hr * 0.12, hr * 2.3, hr * 0.26, 2, dark(c.metal, 0.15));
    for (let i = -2; i <= 2; i++) ell(ctx, hx + i * hr * 0.45, hy + hr * 0.01, hr * 0.06, hr * 0.06, lite(c.metal, 0.4), false);
    if (view === 'front') rr(ctx, hx - hr * 0.09, hy - hr * 0.1, hr * 0.18, hr * 0.55, 1, dark(c.metal, 0.1));
    if (view === 'side') horn(1);
  }

  function stoneHead(ctx, c, o, view, hx, hy, hr) {
    const st = c.stone || '#7b828e';
    rr(ctx, hx - hr * 0.2, hy - hr * 1.35, hr * 0.4, hr * 0.5, 2, dark(st, 0.1));
    rr(ctx, hx - hr * 1.0, hy - hr * 1.0, hr * 2.0, hr * 1.9, hr * 0.3, lg(ctx, hx - hr, hy - hr, hx + hr, hy + hr, lite(st, 0.18), dark(st, 0.3)));
    if (view === 'back') return;
    const x0 = view === 'side' ? hx - hr * 0.1 : hx - hr * 0.78, w = view === 'side' ? hr * 1.05 : hr * 1.56;
    rr(ctx, x0, hy - hr * 0.18, w, hr * 0.34, 2, '#0b0c10');
    const lit = c.eyeGlow || o.shadow;
    const eyeRGB = o.shadow ? '190,160,255' : (c.eyeRGB || '255,43,74');
    const eyes = view === 'side' ? [hx + hr * 0.6] : [hx - hr * 0.38, hx + hr * 0.38];
    for (const ex of eyes) {
      if (lit) { glowDot(ctx, ex, hy, hr * 0.16, eyeRGB, 1); ell(ctx, ex, hy, hr * 0.14, hr * 0.08, '#ffe0e4', false); }
      else ell(ctx, ex, hy, hr * 0.12, hr * 0.06, '#2b2f36', false);
    }
  }

  function humanoid(ctx, s, o, c0) {
    begin(s, o);
    const c = o.shadow ? Object.assign({}, c0, SHP) : c0;
    const dir = o.dir || 'down';
    const view = dir === 'up' ? 'back' : dir === 'down' ? 'front' : 'side';
    const side = view === 'side';
    if (dir === 'left') ctx.scale(-1, 1);
    const walking = o.ph !== undefined;
    const sw = walking ? Math.sin(o.ph) : 0;
    const bob = walking ? Math.abs(Math.sin(o.ph)) * s * 0.025 : Math.sin(o.idle || 0) * s * 0.008;
    const bk = c.bulk || 1, hd = c.head || 1, hunch = c.hunch || 0;
    const attack = o.pose === 'attack';
    ctx.translate(0, -bob);
    if (o.shadow) {
      const a = ctx.createRadialGradient(0, -s * 0.45, 0, 0, -s * 0.45, s * 0.65);
      a.addColorStop(0, 'rgba(139,92,246,0.32)'); a.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.fillStyle = a; ctx.fillRect(-s * 0.7, -s * 1.1, s * 1.4, s * 1.15);
    }

    const legH = s * 0.2 * (c.legs || 1);
    const bw = s * 0.32 * bk;
    const top = -legH - s * 0.36 + hunch * s * 0.04;
    const hr = s * 0.165 * hd;
    const hx = side ? s * 0.02 + hunch * s * 0.07 : 0;
    const hy = top - hr * 0.78 + hunch * s * 0.06;
    const aw = s * 0.075 * bk;
    const hand = c.hand || c.skin;

    // — arrière-plan —
    if (c.cape && view !== 'back') cape(ctx, s, c, view, bw, top, false);
    if (view === 'back' && c.weapon) weapon(ctx, s, c, bw * 0.15, top + s * 0.05, c.weapon === 'bow' ? 0.4 : -0.5, bk);
    if (c.quiver && view !== 'back') {
      const qx = side ? -bw * 0.45 : bw * 0.3;
      rr(ctx, qx - s * 0.04, top - s * 0.06, s * 0.08, s * 0.28, 3, '#5a3b22');
      for (let i = 0; i < 3; i++) line(ctx, [qx - s * 0.02 + i * s * 0.02, top - s * 0.06, qx - s * 0.02 + i * s * 0.02, top - s * 0.13], '#e8e0c8', Math.max(1, LW));
    }
    if (c.hairStyle === 'ponytail' && view !== 'back') {
      const pf = lg(ctx, 0, hy, 0, hy + hr * 2, lite(c.hair, 0.1), dark(c.hair, 0.2));
      if (side) ell(ctx, hx - hr * 1.15, hy + hr * 0.35 + sw * hr * 0.1, hr * 0.32, hr * 0.85, pf, true, 0.35 - sw * 0.15);
      else ell(ctx, hx + hr * 0.95, hy + hr * 0.55, hr * 0.26, hr * 0.7, pf, true, -0.2);
    }
    if (side) {
      const bx = -sw * s * 0.1;
      limb(ctx, -s * 0.01, top + s * 0.05, bx, top + s * 0.27, aw, dark(c.coat2, 0.28));
      ell(ctx, bx, top + s * 0.27, aw * 0.55, aw * 0.55, dark(hand, 0.25));
    }

    // — jambes —
    const lw = s * 0.085 * bk;
    if (side) {
      for (const k of [-1, 1]) {
        const off = sw * s * 0.075 * k;
        const pc = k < 0 ? dark(c.pants, 0.3) : c.pants, bc = k < 0 ? dark(c.boots, 0.3) : c.boots;
        limb(ctx, 0, -legH, off, -s * 0.05, lw, pc);
        rr(ctx, off - lw * 0.55, -s * 0.065, lw * 1.45, s * 0.065, s * 0.02, bc);
      }
    } else {
      for (const k of [-1, 1]) {
        const lift = Math.max(0, sw * k) * s * 0.035, x = k * bw * 0.26;
        limb(ctx, x, -legH, x, -s * 0.05 - lift, lw, lg(ctx, x - lw, 0, x + lw, 0, lite(c.pants, 0.08), dark(c.pants, 0.2)));
        rr(ctx, x - lw * 0.62, -s * 0.07 - lift, lw * 1.24, s * 0.07, s * 0.02, c.boots);
      }
    }

    // — torse —
    const type = c.torso;
    const hem = type === 'coat' ? -s * 0.06 : -legH + s * 0.03;
    const w0 = side ? bw * 0.74 : bw;
    const w1 = (side ? bw * 0.8 : bw) * (type === 'coat' ? 1.3 : type === 'stone' ? 1.05 : 0.95);
    const main = type === 'loin' ? c.skin : c.coat;
    const tf = lg(ctx, -w0 / 2, top, w0 / 2, hem, lite(main, 0.14), dark(main, 0.28));
    const flap = type === 'coat' ? sw * s * 0.025 : 0;
    trapezoid(ctx, side ? -s * 0.01 : 0, top, hem, w0, w1, s * 0.07, tf,
      side ? -s * 0.04 - Math.abs(sw) * s * 0.02 : -flap, side ? sw * s * 0.012 : flap);

    if (type === 'coat') {
      if (view === 'front') {
        poly(ctx, [-s * 0.045, top + s * 0.02, s * 0.045, top + s * 0.02, s * 0.03, top + s * 0.22, -s * 0.03, top + s * 0.22], c.shirt, false);
        line(ctx, [-s * 0.045, top + s * 0.02, -s * 0.03, top + s * 0.22], lite(c.coat, 0.3), Math.max(1, LW * 0.8));
        line(ctx, [s * 0.045, top + s * 0.02, s * 0.03, top + s * 0.22], lite(c.coat, 0.3), Math.max(1, LW * 0.8));
        line(ctx, [0, top + s * 0.25, flap * 0.5, hem], dark(c.coat, 0.5), Math.max(1, LW * 0.8));
      } else if (view === 'back') {
        line(ctx, [0, top + s * 0.1, 0, hem], dark(c.coat, 0.45), Math.max(1, LW * 0.8));
        if (c.hood) ell(ctx, 0, top + s * 0.03, w0 * 0.34, s * 0.065, dark(c.coat, 0.15));
      } else {
        line(ctx, [w0 * 0.3, top + s * 0.05, w0 * 0.42 + sw * s * 0.012, hem], dark(c.coat, 0.5), Math.max(1, LW * 0.8));
      }
      rr(ctx, -w0 * 0.53, top + s * 0.2, w0 * 1.06, s * 0.045, 1, c.belt);
      if (view === 'front') rr(ctx, -s * 0.025, top + s * 0.197, s * 0.05, s * 0.05, 1, c.metal);
    } else if (type === 'armor') {
      if (view !== 'back') {
        line(ctx, [side ? w0 * 0.15 : 0, top + s * 0.04, side ? w0 * 0.2 : 0, top + s * 0.24], lite(c.coat, 0.6), Math.max(1, LW));
        ell(ctx, side ? w0 * 0.05 : -w0 * 0.2, top + s * 0.1, w0 * 0.14, s * 0.035, 'rgba(255,255,255,0.35)', false);
      }
      trapezoid(ctx, side ? -s * 0.01 : 0, top + s * 0.25, -legH + s * 0.07, w0 * 0.95, w1 * 1.2, s * 0.03, lg(ctx, 0, top + s * 0.25, 0, -legH, lite(c.shirt, 0.15), dark(c.shirt, 0.2)));
      rr(ctx, -w0 * 0.52, top + s * 0.22, w0 * 1.04, s * 0.04, 1, c.trim);
      const pads = side ? [0] : [-1, 1];
      for (const k of pads) ell(ctx, k * w0 * 0.48 + (side ? -s * 0.01 : 0), top + s * 0.04, s * 0.085, s * 0.06, lg(ctx, 0, top - s * 0.02, 0, top + s * 0.1, lite(c.metal, 0.2), dark(c.metal, 0.25)));
    } else if (type === 'loin') {
      if (view === 'front') ell(ctx, 0, top + s * 0.2, w0 * 0.28, s * 0.09, lite(c.skin, 0.12), false);
      if (c.chest) rr(ctx, -w0 * 0.42, top + s * 0.03, w0 * 0.84, s * 0.17, s * 0.03, lg(ctx, 0, top, 0, top + s * 0.2, lite(c.chest, 0.12), dark(c.chest, 0.25)));
      if (view !== 'back' && !c.chest) line(ctx, [-w0 * 0.45, top + s * 0.03, w0 * 0.4, top + s * 0.27], c.belt, Math.max(2, s * 0.03));
      rr(ctx, -w0 * 0.52, top + s * 0.27, w0 * 1.04, s * 0.04, 1, c.belt);
      const fx = side ? w0 * 0.15 : 0;
      poly(ctx, [fx - s * 0.07, top + s * 0.3, fx + s * 0.07, top + s * 0.3, fx + s * 0.06 + sw * s * 0.01, -legH + s * 0.11, fx - s * 0.06 + sw * s * 0.01, -legH + s * 0.11], lg(ctx, 0, top, 0, -legH, lite(c.cloth, 0.1), dark(c.cloth, 0.25)));
      if (c.necklace && view !== 'back') {
        for (let i = -2; i <= 2; i++) {
          if (side && i < 0) continue;
          const bx = (side ? w0 * 0.1 : 0) + i * w0 * 0.17, by = top + s * 0.05 + Math.abs(i) * -s * 0.008 + s * 0.02;
          poly(ctx, [bx - s * 0.018, by, bx + s * 0.018, by, bx, by + s * 0.06], c.bone);
        }
      }
    } else if (type === 'stone') {
      rr(ctx, -w0 * 0.42, top + s * 0.06, w0 * 0.84, s * 0.14, s * 0.03, lg(ctx, 0, top, 0, top + s * 0.2, lite(c.coat2, 0.15), dark(c.coat2, 0.2)));
      rr(ctx, -w0 * 0.5, top + s * 0.25, w0 * 1.0, s * 0.05, 1, dark(c.coat, 0.2));
      if (c.moss) { ell(ctx, -w0 * 0.25, top + s * 0.27, w0 * 0.18, s * 0.025, c.moss, false); ell(ctx, w0 * 0.3, top + s * 0.09, w0 * 0.1, s * 0.02, c.moss, false); }
      if (c.cracks) {
        line(ctx, [-w0 * 0.1, top + s * 0.04, w0 * 0.12, top + s * 0.14, -w0 * 0.06, top + s * 0.22, w0 * 0.15, top + s * 0.32], 'rgba(255,120,60,0.35)', Math.max(3, LW * 3));
        line(ctx, [-w0 * 0.1, top + s * 0.04, w0 * 0.12, top + s * 0.14, -w0 * 0.06, top + s * 0.22, w0 * 0.15, top + s * 0.32], c.cracks, Math.max(1, LW * 1.2));
      } else {
        line(ctx, [-w0 * 0.3, top + s * 0.08, -w0 * 0.12, top + s * 0.17, -w0 * 0.22, top + s * 0.24], 'rgba(0,0,0,0.35)', Math.max(1, LW * 0.7));
      }
      const pads = side ? [0] : [-1, 1];
      for (const k of pads) rr(ctx, k * w0 * 0.5 - s * 0.1 + (side ? -s * 0.02 : 0), top - s * 0.03, s * 0.2, s * 0.13, s * 0.03, lg(ctx, 0, top - s * 0.03, 0, top + s * 0.1, lite(c.stone, 0.2), dark(c.stone, 0.25)));
    }
    if (c.cape && view === 'back') cape(ctx, s, c, view, bw, top, true);
    else if (c.cape) cape(ctx, s, c, view, bw, top, true, true);

    // — bras —
    const shoulderY = top + s * 0.05;
    if (side) {
      const fx = attack ? s * 0.24 : sw * s * 0.1 + s * 0.02, fy = attack ? top + s * 0.1 : top + s * 0.27;
      limb(ctx, s * 0.01, shoulderY, fx, fy, aw, lg(ctx, 0, top, 0, fy, lite(c.coat2, 0.1), dark(c.coat2, 0.2)));
      ell(ctx, fx, fy, aw * 0.55, aw * 0.55, hand);
      if (c.weapon && view !== 'back') {
        const rot = attack ? Math.PI / 2 - 0.1 : c.grip === 'reverse' ? Math.PI - 0.5 : c.weapon === 'bow' ? 0 : 0.5;
        weapon(ctx, s, c, fx, fy, rot, bk);
      }
    } else {
      for (const k of [-1, 1]) {
        const lift = view === 'front' ? sw * k * s * 0.025 : -sw * k * s * 0.025;
        const raise = attack && k === 1;
        const sx = k * (w0 / 2 - aw * 0.1), hx2 = k * (w0 / 2 + aw * (raise ? 0.7 : 0.3)), hy2 = raise ? top + s * 0.06 : top + s * 0.27 + lift;
        const sleeve = view === 'back' ? dark(c.coat2, 0.12) : c.coat2;
        limb(ctx, sx, shoulderY, hx2, hy2, aw, lg(ctx, sx - aw, 0, sx + aw, 0, lite(sleeve, 0.1), dark(sleeve, 0.2)));
        ell(ctx, hx2, hy2, aw * 0.55, aw * 0.55, hand);
        if (k === 1 && c.weapon && view === 'front') {
          const rot = raise ? 0.6 : c.grip === 'reverse' ? Math.PI - 0.35 : c.weapon === 'bow' ? 0.05 : 0.35;
          weapon(ctx, s, c, hx2, hy2, rot, bk);
        }
      }
    }

    // — tête —
    if (c.ears && view !== 'back') ears(ctx, c, view, hx, hy, hr);
    if (c.hairStyle === 'stonehelm') {
      stoneHead(ctx, c, o, view, hx, hy, hr);
    } else {
      if (c.hairStyle === 'hood' && view !== 'back') ell(ctx, hx - (side ? hr * 0.25 : 0), hy, hr * 1.18, hr * 1.12, dark(c.hood, 0.2));
      ell(ctx, hx, hy, hr, hr * 0.97, rg(ctx, hx - hr * 0.35, hy - hr * 0.45, hr * 0.1, hr * 1.3, lite(c.skin, 0.16), dark(c.skin, 0.24)));
      if (view !== 'back') face(ctx, c, o, view, hx, hy, hr);
      hair(ctx, c, view, hx, hy, hr);
      if (c.ears && view === 'back') ears(ctx, c, view, hx, hy, hr);
    }
  }

  // Cape / mantelet de fourrure
  function cape(ctx, s, c, view, bw, top, front, collarOnly) {
    const fur = lg(ctx, 0, top - s * 0.05, 0, top + s * 0.3, lite(c.fur, 0.15), dark(c.fur, 0.3));
    if (!front) {
      poly(ctx, [-bw * 0.6, top + s * 0.02, bw * 0.6, top + s * 0.02, bw * 0.7, top + s * 0.4, -bw * 0.7, top + s * 0.4], dark(c.fur, 0.35));
      return;
    }
    const n = 7, w = bw * (collarOnly ? 1.25 : 1.35), y0 = top - s * 0.04, y1 = top + (collarOnly ? s * 0.12 : s * 0.38);
    const pts = [-w / 2, y0 + s * 0.04, -w * 0.3, y0, w * 0.3, y0, w / 2, y0 + s * 0.04];
    for (let i = n; i >= 0; i--) {
      const x = -w / 2 + (w * i) / n;
      pts.push(x, i % 2 ? y1 : y1 - s * 0.05);
    }
    ctx.save();
    if (view === 'side') ctx.scale(0.75, 1);
    poly(ctx, pts, fur);
    for (let i = 0; i < 5; i++) {
      const x = -w * 0.35 + i * w * 0.17;
      line(ctx, [x, y0 + s * 0.03, x + s * 0.01, y0 + s * 0.08], lite(c.fur, 0.3), Math.max(1, LW * 0.6));
    }
    ctx.restore();
  }

  const H = {
    heros: {
      skin: '#efd2b8', coat: '#1c2232', coat2: '#262e45', shirt: '#0e1119', pants: '#161a26', boots: '#0b0d13',
      hair: '#141721', belt: '#2b3040', metal: '#d4ddeb', eye: '#1a1f2c', torso: 'coat', hairStyle: 'spiky',
      weapon: 'dagger', grip: 'reverse', hood: true,
    },
    pnj_mira: {
      skin: '#f3d6c0', coat: '#e2e9f3', coat2: '#c6d2e3', shirt: '#2d4f8a', pants: '#2c3b58', boots: '#1d2638',
      hair: '#c4422e', belt: '#2d4f8a', metal: '#e6edf7', trim: '#3f8cff', eye: '#2f6b4a', torso: 'armor',
      hairStyle: 'ponytail', weapon: 'sword', hand: '#c6d2e3',
    },
    gobelin: {
      skin: '#6aa244', coat: '#6e4a2a', coat2: '#6aa244', pants: '#5a8f37', boots: '#3d2a18', cloth: '#7a5330',
      belt: '#3a2716', metal: '#a7b0ba', torso: 'loin', hairStyle: 'none', ears: true, eye: '#ffd23f',
      eyeRGB: '255,210,63', eyeGlow: true, weapon: 'dagger', bulk: 0.9, head: 1.22, hunch: 1, grin: true,
      nose: true, legs: 0.85, brows: false,
    },
  };
  H.gobelin_archer = Object.assign({}, H.gobelin, { hairStyle: 'hood', hood: '#4f412c', weapon: 'bow', wood: '#7a5530', quiver: true, cloth: '#3f5a2c', belt: '#2e2418' });
  H.chef_gobelin = {
    skin: '#4f8a33', coat: '#5e321e', coat2: '#4f8a33', chest: '#5e321e', pants: '#3f6e25', boots: '#2a1a10',
    cloth: '#6e4428', belt: '#2a160c', fur: '#6b5a48', bone: '#ece2c8', horn: '#efe3c6', metal: '#6b7079',
    torso: 'loin', hairStyle: 'helmet', ears: true, eye: '#ff3b3b', eyeRGB: '255,59,59', eyeGlow: true,
    weapon: 'club', wood: '#5a3a1e', bulk: 1.38, head: 1.05, hunch: 0.6, paint: '#c0262d', necklace: true,
    cape: true, grin: true, nose: true, brows: false,
  };
  H.statue = {
    skin: '#7d8592', stone: '#737b88', coat: '#646c79', coat2: '#6d7582', pants: '#5a616d', boots: '#4e5560',
    metal: '#808896', torso: 'stone', hairStyle: 'stonehelm', weapon: 'hammer', bulk: 1.35, head: 0.95,
    eye: '#22262d', moss: '#3f6b4a', hand: '#6d7582', brows: false,
  };
  H.gardien = Object.assign({}, H.statue, { eyeRGB: '255,43,74', eyeGlow: true });
  H.gardien_fissure = Object.assign({}, H.gardien, { cracks: '#ff7a45', moss: null });
  for (const k in H) P[k] = (ctx, s, o) => humanoid(ctx, s, o, H[k]);

  // ═════════════ Quadrupèdes ═════════════
  function quadruped(ctx, s, o, c0) {
    begin(s, o);
    const c = o.shadow ? Object.assign({}, c0, { body: '#16112f', belly: '#221a4a', ear: '#2c2356', eye: '#e2d8ff', eyeRGB: '190,160,255', tail: '#16112f', nose: '#0b0818' }) : c0;
    let dir = o.dir || 'right';
    if (dir === 'up' || dir === 'down') dir = o.faceX || 'right';
    if (dir === 'left') ctx.scale(-1, 1);
    if (o.shadow) {
      const a = ctx.createRadialGradient(0, -s * 0.3, 0, 0, -s * 0.3, s * 0.6);
      a.addColorStop(0, 'rgba(139,92,246,0.32)'); a.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.fillStyle = a; ctx.fillRect(-s * 0.7, -s * 0.9, s * 1.4, s * 0.95);
    }
    const walking = o.ph !== undefined;
    const ph = walking ? o.ph * 1.2 : 0;
    const bob = walking ? Math.abs(Math.sin(ph)) * s * 0.02 : Math.sin(o.idle || 0) * s * 0.006;
    const by = -s * (c.legH + 0.14) - bob;
    const L = s * c.len;

    // queue
    if (c.bushy) {
      ctx.beginPath();
      ctx.moveTo(-L * 0.9, by - s * 0.05);
      ctx.quadraticCurveTo(-L * 1.4, by - s * 0.02 + Math.sin(ph) * s * 0.03, -L * 1.6, by - s * c.tailUp);
      ctx.quadraticCurveTo(-L * 1.25, by + s * 0.08, -L * 0.85, by + s * 0.04);
      ctx.closePath();
      done(ctx, lg(ctx, -L * 1.6, 0, -L * 0.8, 0, lite(c.tail, 0.2), dark(c.tail, 0.15)));
    } else {
      ctx.lineCap = 'round';
      const path = () => { ctx.beginPath(); ctx.moveTo(-L * 0.9, by); ctx.quadraticCurveTo(-L * 1.5, by + s * 0.1 + Math.sin(ph) * s * 0.03, -L * 1.9, by - s * 0.02); };
      path(); ctx.strokeStyle = OUT; ctx.lineWidth = s * 0.035 + LW * 2; ctx.stroke();
      path(); ctx.strokeStyle = c.tail; ctx.lineWidth = s * 0.035; ctx.stroke();
    }
    // pattes
    const legs = [[-0.62, 0], [0.55, Math.PI], [-0.45, Math.PI], [0.72, 0]];
    const lw = s * (c.legW || 0.055);
    legs.forEach(([lx, off], i) => {
      const far = i < 2;
      const swing = walking ? Math.sin(ph + off) * s * 0.06 : 0;
      const x = lx * L;
      const col = far ? dark(c.body, 0.3) : c.body;
      limb(ctx, x, by + s * 0.04, x + swing, -s * 0.03, lw, col);
      ell(ctx, x + swing + lw * 0.2, -s * 0.025, lw * 0.75, lw * 0.45, far ? dark(c.belly, 0.3) : c.belly);
    });
    // corps
    ctx.beginPath();
    ctx.moveTo(-L, by);
    ctx.bezierCurveTo(-L, by - s * 0.17, L * 0.4, by - s * 0.21, L * 0.75, by - s * 0.12);
    ctx.bezierCurveTo(L * 1.05, by - s * 0.05, L * 1.0, by + s * 0.12, L * 0.55, by + s * 0.13);
    ctx.bezierCurveTo(L * 0.1, by + s * 0.1, -L * 0.6, by + s * 0.15, -L, by);
    ctx.closePath();
    done(ctx, lg(ctx, 0, by - s * 0.2, 0, by + s * 0.14, dark(c.body, 0.15), lite(c.belly, 0.05)));
    // pelage
    if (c.bushy) {
      for (let i = 0; i < 5; i++) {
        const x = -L * 0.7 + i * L * 0.32, y = by - s * 0.14 + Math.abs(i - 2) * s * 0.012;
        line(ctx, [x, y, x + s * 0.03, y - s * 0.03, x + s * 0.05, y], dark(c.body, 0.35), Math.max(1, LW * 0.8));
      }
    }
    // tête
    const hx = L * 0.95, hy = by - s * 0.1;
    const hr = s * c.head;
    if (c.earRound) {
      ell(ctx, hx - hr * 0.5, hy - hr * 0.85, hr * 0.42, hr * 0.42, c.ear);
      ell(ctx, hx - hr * 0.5, hy - hr * 0.85, hr * 0.22, hr * 0.22, lite(c.ear, 0.3), false);
    } else {
      poly(ctx, [hx - hr * 0.75, hy - hr * 0.35, hx - hr * 0.55, hy - hr * 1.45, hx - hr * 0.05, hy - hr * 0.55], c.ear);
      poly(ctx, [hx - hr * 0.62, hy - hr * 0.45, hx - hr * 0.52, hy - hr * 1.1, hx - hr * 0.2, hy - hr * 0.55], lite(c.ear, 0.25), false);
    }
    ell(ctx, hx, hy, hr, hr * 0.9, lg(ctx, hx, hy - hr, hx, hy + hr, dark(c.body, 0.05), lite(c.belly, 0.05)));
    // museau
    poly(ctx, [hx + hr * 0.3, hy - hr * 0.5, hx + hr * (1 + c.snout), hy - hr * 0.05, hx + hr * (1 + c.snout), hy + hr * 0.3, hx + hr * 0.2, hy + hr * 0.65], lg(ctx, hx, hy - hr, hx, hy + hr, lite(c.body, 0.05), c.belly));
    ell(ctx, hx + hr * (1 + c.snout), hy + hr * 0.02, hr * 0.17, hr * 0.14, c.nose);
    if (c.teeth) {
      for (let i = 0; i < 2; i++) {
        const tx = hx + hr * (0.75 + i * 0.35);
        poly(ctx, [tx - hr * 0.07, hy + hr * 0.38, tx + hr * 0.07, hy + hr * 0.38, tx, hy + hr * 0.62], '#f4efe0', false);
      }
    }
    if (c.whiskers) {
      for (let i = -1; i <= 1; i++) line(ctx, [hx + hr * 1.3, hy + hr * 0.1, hx + hr * 2.1, hy + hr * (0.05 + i * 0.25)], 'rgba(230,220,210,0.6)', 1);
    }
    // œil
    const ex = hx + hr * 0.25, ey = hy - hr * 0.2;
    glowDot(ctx, ex, ey, hr * 0.16, c.eyeRGB, 1);
    ell(ctx, ex, ey, hr * 0.16, hr * 0.11, c.eye, false, -0.25);
    ell(ctx, ex + hr * 0.02, ey, hr * 0.06, hr * 0.06, '#ffffff', false);
  }
  const Q = {
    rat_geant: { body: '#6e5646', belly: '#9a8270', ear: '#d58b8b', eye: '#ff4b4b', eyeRGB: '255,75,75', tail: '#d9908c', nose: '#e7a0a0', legH: 0.06, len: 0.26, head: 0.1, snout: 0.7, earRound: true, whiskers: true, legW: 0.045 },
    loup: { body: '#5b6372', belly: '#8a92a0', ear: '#3e4450', eye: '#ffe066', eyeRGB: '255,224,102', tail: '#5b6372', nose: '#121419', legH: 0.17, len: 0.28, head: 0.11, snout: 0.85, teeth: true, bushy: true, tailUp: 0.16 },
  };
  for (const k in Q) P[k] = (ctx, s, o) => quadruped(ctx, s, o, Q[k]);

  // ═════════════ Objets ═════════════
  P.autel = (ctx, s, o) => {
    begin(s, o);
    const t = o.t || 0;
    const pulse = 0.6 + Math.sin(t * 3) * 0.4;
    // cercle runique au sol
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.35 * pulse;
    ctx.strokeStyle = '#3fb4ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -s * 0.02, s * 0.62, s * 0.2, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + t * 0.4;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.5, -s * 0.02 + Math.sin(a) * s * 0.16); ctx.lineTo(Math.cos(a) * s * 0.6, -s * 0.02 + Math.sin(a) * s * 0.19); ctx.stroke();
    }
    ctx.restore();
    rr(ctx, -s * 0.38, -s * 0.44, s * 0.76, s * 0.42, 3, lg(ctx, 0, -s * 0.44, 0, 0, '#4a5065', '#262a37'));
    rr(ctx, -s * 0.48, -s * 0.54, s * 0.96, s * 0.13, 3, lg(ctx, 0, -s * 0.54, 0, -s * 0.41, '#5d6480', '#3a3f52'));
    ctx.strokeStyle = `rgba(63,180,255,${0.3 + 0.4 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -s * 0.24, s * 0.09, 0, TAU); ctx.moveTo(0, -s * 0.36); ctx.lineTo(0, -s * 0.12); ctx.stroke();
    const gy = -s * 0.78 + Math.sin(t * 2) * s * 0.03;
    glowDot(ctx, 0, gy, s * 0.07, '63,180,255', pulse);
    poly(ctx, [0, gy - s * 0.15, s * 0.09, gy, 0, gy + s * 0.13, -s * 0.09, gy], lg(ctx, -s * 0.09, gy - s * 0.15, s * 0.09, gy + s * 0.13, '#bfe9ff', '#2a8fe0'));
    line(ctx, [-s * 0.03, gy - s * 0.06, 0, gy - s * 0.12], 'rgba(255,255,255,0.9)', Math.max(1, LW * 0.7));
  };

  P.portail = (ctx, s, o) => {
    const t = o.t || 0;
    const rx = s * 0.3, ry = s * 0.46, cy = -s * 0.5;
    const col = o.red ? '255,60,80' : '63,180,255';
    const g = ctx.createRadialGradient(0, cy, 0, 0, cy, s * 0.75);
    g.addColorStop(0, `rgba(${col},0.45)`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(-s * 0.8, cy - s * 0.8, s * 1.6, s * 1.6);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, TAU); ctx.clip();
    const bg = ctx.createRadialGradient(0, cy, 0, 0, cy, ry);
    bg.addColorStop(0, '#dff4ff'); bg.addColorStop(0.25, `rgba(${col},0.9)`); bg.addColorStop(0.7, '#06163a'); bg.addColorStop(1, '#020818');
    ctx.fillStyle = bg; ctx.fillRect(-rx, cy - ry, rx * 2, ry * 2);
    // bras de la spirale
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 4; arm++) {
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const k = i / 24, a = arm / 4 * TAU + t * 1.6 + k * 4.2;
        const x = Math.cos(a) * rx * (1 - k) * 1.05, y = cy + Math.sin(a) * ry * (1 - k) * 1.05;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(200,235,255,${0.35 + 0.1 * arm})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(${col},0.95)`;
    ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(230,248,255,0.9)';
    ctx.beginPath(); ctx.ellipse(0, cy, rx - 2, ry - 2, 0, Math.PI * 1.1 + t, Math.PI * 1.6 + t); ctx.stroke();
    ctx.restore();
    // reflet au sol
    const fg = ctx.createRadialGradient(0, -s * 0.02, 0, 0, -s * 0.02, s * 0.5);
    fg.addColorStop(0, `rgba(${col},0.35)`); fg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = fg; ctx.fillRect(-s * 0.5, -s * 0.2, s, s * 0.3);
  };

  function chest(ctx, s, o, open) {
    begin(s, o);
    const w = s * 0.82, h = s * 0.44, wood = '#7a4e2c';
    if (open) {
      rr(ctx, -w / 2, -h - s * 0.34, w, s * 0.3, 4, lg(ctx, 0, -h - s * 0.34, 0, -h, '#6a4326', '#4a2e19'));
      rr(ctx, -w / 2 + s * 0.06, -h - s * 0.3, w - s * 0.12, s * 0.2, 2, '#2a190d', false);
    }
    rr(ctx, -w / 2, -h, w, h, 3, lg(ctx, 0, -h, 0, 0, lite(wood, 0.12), dark(wood, 0.3)));
    for (let i = 1; i < 3; i++) line(ctx, [-w / 2 + 2, -h + (h * i) / 3, w / 2 - 2, -h + (h * i) / 3], dark(wood, 0.4), 1);
    if (open) {
      rr(ctx, -w / 2 + s * 0.05, -h, w - s * 0.1, s * 0.09, 2, '#1a0f07', false);
      glowDot(ctx, 0, -h + s * 0.03, s * 0.06, '255,215,120', 0.6);
    } else {
      rr(ctx, -w / 2 - s * 0.01, -h - s * 0.15, w + s * 0.02, s * 0.2, 6, lg(ctx, 0, -h - s * 0.15, 0, -h + s * 0.05, lite(wood, 0.2), dark(wood, 0.15)));
    }
    const band = lg(ctx, 0, -h - s * 0.15, 0, 0, '#f0d27a', '#a07a2a');
    for (const bx of [-w / 2 + s * 0.09, w / 2 - s * 0.14]) rr(ctx, bx, open ? -h : -h - s * 0.15, s * 0.05, open ? h : h + s * 0.15, 1, band);
    if (!open) {
      rr(ctx, -s * 0.06, -h - s * 0.02, s * 0.12, s * 0.13, 2, band);
      ell(ctx, 0, -h + s * 0.04, s * 0.018, s * 0.025, '#2a1a0a', false);
    }
  }
  P.coffre = (ctx, s, o) => chest(ctx, s, o, false);
  P.coffre_ouvert = (ctx, s, o) => chest(ctx, s, o, true);

  P.brasero = (ctx, s, o) => {
    begin(s, o);
    const t = o.t || 0;
    const iron = '#3a3f4b';
    for (const k of [-1, 0, 1]) limb(ctx, k * s * 0.05, -s * 0.36, k * s * 0.17, -s * 0.02, s * 0.035, dark(iron, 0.2));
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.5);
    ctx.quadraticCurveTo(0, -s * 0.26, s * 0.3, -s * 0.5);
    ctx.closePath();
    done(ctx, lg(ctx, 0, -s * 0.5, 0, -s * 0.3, '#5a606e', '#2a2e38'));
    ell(ctx, 0, -s * 0.5, s * 0.3, s * 0.07, '#ff8a3a');
    ell(ctx, 0, -s * 0.5, s * 0.22, s * 0.045, '#ffd27a', false);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flames = [[-0.12, 0.85, 0], [0.12, 0.8, 1.7], [0, 1.25, 3.1]];
    for (const [fx0, hk, seed] of flames) {
      const f = Math.sin(t * 11 + seed) * 0.5 + 0.5, f2 = Math.sin(t * 17 + seed * 2);
      const fx = fx0 * s, fh = s * (0.28 + f * 0.14) * hk;
      for (const [k, colr] of [[1, 'rgba(255,90,30,0.7)'], [0.62, 'rgba(255,170,60,0.85)'], [0.3, 'rgba(255,245,200,0.95)']]) {
        ctx.fillStyle = colr;
        ctx.beginPath();
        ctx.moveTo(fx - s * 0.1 * k, -s * 0.5);
        ctx.quadraticCurveTo(fx - s * 0.1 * k + f2 * s * 0.02, -s * 0.5 - fh * 0.6 * k, fx + f2 * s * 0.03, -s * 0.5 - fh * k);
        ctx.quadraticCurveTo(fx + s * 0.1 * k, -s * 0.5 - fh * 0.5 * k, fx + s * 0.1 * k, -s * 0.5);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  P.tente = (ctx, s, o) => {
    begin(s, o);
    const hide = '#7d5c3c';
    poly(ctx, [-s * 0.5, 0, 0, -s * 0.78, s * 0.5, 0], lg(ctx, -s * 0.5, 0, s * 0.5, 0, lite(hide, 0.1), dark(hide, 0.3)));
    poly(ctx, [-s * 0.5, 0, 0, -s * 0.78, -s * 0.08, 0], lg(ctx, -s * 0.5, 0, 0, 0, dark(hide, 0.1), dark(hide, 0.3)), false);
    poly(ctx, [-s * 0.13, 0, 0, -s * 0.4, s * 0.13, 0], '#140c06');
    for (let i = 1; i < 4; i++) line(ctx, [-s * 0.5 + i * s * 0.12, -i * s * 0.19, i * s * 0.12, -s * 0.04], 'rgba(0,0,0,0.25)', 1);
    line(ctx, [-s * 0.07, -s * 0.88, s * 0.05, -s * 0.68], '#3b2a1a', Math.max(2, LW * 1.5));
    line(ctx, [s * 0.07, -s * 0.88, -s * 0.05, -s * 0.68], '#3b2a1a', Math.max(2, LW * 1.5));
    poly(ctx, [-s * 0.18, -s * 0.5, s * 0.02, -s * 0.48, -s * 0.06, -s * 0.36], '#e8dcc0');
  };

  P._default = (ctx, s, o) => {
    begin(s, o);
    poly(ctx, [0, -s * 0.9, s * 0.3, -s * 0.5, 0, -s * 0.1, -s * 0.3, -s * 0.5], '#d946ef');
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(s * 0.35)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, -s * 0.5);
  };

  // Largeur de l'ombre portée au sol (fraction de la taille)
  P.groundW = {
    heros: 0.2, pnj_mira: 0.2, gobelin: 0.2, gobelin_archer: 0.2, chef_gobelin: 0.26, statue: 0.24, gardien: 0.24,
    gardien_fissure: 0.24, rat_geant: 0.28, loup: 0.3, autel: 0.44, coffre: 0.44, coffre_ouvert: 0.44,
    brasero: 0.24, tente: 0.48, _default: 0.25,
  };

  // ═════════════ Tuiles ═════════════
  const TL = {};
  const FLOOR = ['#1f2637', '#222a3c', '#1d2434', '#242c3f'];
  const isSolid = t => t === 'mur' || t === 'vide';

  function slabs(ctx, x, y, S, tx, ty, palette, seam) {
    ctx.fillStyle = seam;
    ctx.fillRect(x, y, S, S);
    const v = U.hash(tx, ty, 3);
    const rects = v < 0.35 ? [[0, 0, 1, 1]]
      : v < 0.6 ? [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]]
      : v < 0.85 ? [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]]
      : [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
    rects.forEach(([rx, ry, rw, rh], i) => {
      const px = x + rx * S + 1, py = y + ry * S + 1, pw = rw * S - 2, ph = rh * S - 2;
      const col = palette[Math.floor(U.hash(tx * 3 + i, ty * 5 + i, 4) * palette.length)];
      ctx.fillStyle = lg(ctx, px, py, px + pw, py + ph, lite(col, 0.06), dark(col, 0.12));
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 3); else ctx.rect(px, py, pw, ph);
      ctx.fill();
      ctx.fillStyle = 'rgba(190,210,240,0.07)';
      ctx.fillRect(px + 2, py, pw - 4, 1);
      ctx.fillRect(px, py + 2, 1, ph - 4);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(px + 2, py + ph - 1, pw - 4, 1);
      ctx.fillRect(px + pw - 1, py + 2, 1, ph - 4);
    });
    for (let i = 0; i < 4; i++) {
      const a = U.hash(tx, ty, 10 + i);
      if (a < 0.5) continue;
      ctx.fillStyle = a > 0.8 ? 'rgba(170,190,220,0.1)' : 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 3 + U.hash(tx, ty, 20 + i) * (S - 6), y + 3 + U.hash(tx, ty, 30 + i) * (S - 6), 1 + a * 1.5, 1 + a * 1.5);
    }
    if (U.hash(tx, ty, 40) > 0.88) {
      const sx = x + 6 + U.hash(tx, ty, 41) * S * 0.5, sy = y + 6 + U.hash(tx, ty, 42) * S * 0.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 7, sy + 4); ctx.lineTo(sx + 9, sy + 11); ctx.lineTo(sx + 15, sy + 14); ctx.stroke();
    }
  }

  TL.sol = (ctx, x, y, S, tx, ty) => slabs(ctx, x, y, S, tx, ty, FLOOR, '#10141e');
  TL.sol2 = (ctx, x, y, S, tx, ty) => {
    slabs(ctx, x, y, S, tx, ty, FLOOR, '#10141e');
    for (let i = 0; i < 5; i++) {
      const px = x + U.hash(tx, ty, 50 + i) * S, py = y + U.hash(tx, ty, 60 + i) * S;
      const r = 3 + U.hash(tx, ty, 70 + i) * 7;
      ctx.fillStyle = rg(ctx, px, py, 0, r, 'rgba(70,140,90,0.38)', 'rgba(70,140,90,0)');
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
    for (let i = 0; i < 4; i++) {
      const px = x + 4 + U.hash(tx, ty, 80 + i) * (S - 8), py = y + 6 + U.hash(tx, ty, 90 + i) * (S - 8);
      ctx.strokeStyle = 'rgba(110,170,110,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 1, py - 4); ctx.moveTo(px + 1, py); ctx.lineTo(px + 2, py - 3); ctx.stroke();
    }
  };
  TL.temple = (ctx, x, y, S, tx, ty) => {
    ctx.fillStyle = '#0e0d18';
    ctx.fillRect(x, y, S, S);
    const base = (tx + ty) % 2 ? '#1d1b2e' : '#222036';
    ctx.fillStyle = lg(ctx, x, y, x + S, y + S, lite(base, 0.08), dark(base, 0.15));
    ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
    ctx.strokeStyle = 'rgba(201,165,74,0.16)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 4.5, y + 4.5, S - 9, S - 9);
    if ((tx + ty) % 2 === 0) {
      ctx.strokeStyle = 'rgba(90,170,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(x + S / 2, y + S * 0.28); ctx.lineTo(x + S * 0.72, y + S / 2); ctx.lineTo(x + S / 2, y + S * 0.72); ctx.lineTo(x + S * 0.28, y + S / 2); ctx.closePath();
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x + 2, y + 2, S * 0.4, 2);
  };
  TL.mur = (ctx, x, y, S, tx, ty, map) => {
    const at = (dx, dy) => (map ? map.tileAt(tx + dx, ty + dy) : 'mur');
    const below = at(0, 1);
    ctx.fillStyle = '#080a11';
    ctx.fillRect(x, y, S, S);
    // roche : plaques irrégulières éclairées par le haut + fissures
    for (let i = 0; i < 5; i++) {
      const a = U.hash(tx, ty, 100 + i);
      if (a < 0.25) continue;
      const px = x + U.hash(tx, ty, 110 + i) * S * 0.8, py = y + U.hash(tx, ty, 120 + i) * S * 0.8, w = 6 + a * 10;
      ctx.fillStyle = `rgba(120,140,185,${0.05 + a * 0.05})`;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + w, py + 2); ctx.lineTo(px + w * 0.7, py + w * 0.7); ctx.lineTo(px - 2, py + w * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(170,190,230,0.08)';
      ctx.fillRect(px, py, w * 0.8, 1);
    }
    if (U.hash(tx, ty, 125) > 0.6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
      const cx0 = x + U.hash(tx, ty, 126) * S, cy0 = y + U.hash(tx, ty, 127) * S;
      ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + 6, cy0 + 5); ctx.lineTo(cx0 + 4, cy0 + 12); ctx.stroke();
    }
    const rim = 'rgba(150,175,215,0.22)';
    if (at(-1, 0) !== 'mur' && at(-1, 0) !== undefined) { ctx.fillStyle = rim; ctx.fillRect(x, y, 1.5, S); }
    if (at(1, 0) !== 'mur') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + S - 2, y, 2, S); ctx.fillStyle = rim; ctx.fillRect(x + S - 3, y, 1, S); }
    if (at(0, -1) !== 'mur') { ctx.fillStyle = rim; ctx.fillRect(x, y, S, 1.5); }
    if (below && below !== 'mur') {
      const fh = S * 0.6, fy = y + S - fh;
      const temple = below === 'temple';
      ctx.fillStyle = lg(ctx, 0, fy, 0, y + S, temple ? '#302b47' : '#2f3850', temple ? '#17142a' : '#161b28');
      ctx.fillRect(x, fy, S, fh);
      const rows = 3, rh = fh / rows;
      for (let r = 0; r < rows; r++) {
        const off = ((r + tx) % 2) * S * 0.5;
        const ry = fy + r * rh;
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.fillRect(x, ry + rh - 1, S, 1.2);
        for (let b = -1; b < 2; b++) {
          const bx = x + off + b * S * 0.5 + U.hash(tx, ty + r, 130 + b) * 4;
          if (bx > x && bx < x + S) ctx.fillRect(bx, ry + 1, 1.2, rh - 2);
        }
        ctx.fillStyle = 'rgba(200,220,255,0.06)';
        ctx.fillRect(x, ry + 1, S, 1);
      }
      ctx.fillStyle = 'rgba(190,210,245,0.28)';
      ctx.fillRect(x, fy, S, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x, y + S - 2, S, 2);
      if (U.hash(tx, ty, 140) > 0.7) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + U.hash(tx, ty, 141) * S * 0.8, fy + 3, 2, fh * (0.4 + U.hash(tx, ty, 142) * 0.5));
      }
    }
  };
  TL.vide = (ctx, x, y, S, tx, ty, map) => {
    const at = (dx, dy) => (map ? map.tileAt(tx + dx, ty + dy) : 'vide');
    ctx.fillStyle = '#010207';
    ctx.fillRect(x, y, S, S);
    if (at(0, -1) !== 'vide') {
      ctx.fillStyle = lg(ctx, 0, y, 0, y + S * 0.9, '#3a4560', 'rgba(1,2,7,0)');
      ctx.fillRect(x, y, S, S * 0.9);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 3; i++) ctx.fillRect(x, y + S * (0.18 + i * 0.16), S, 1);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + U.hash(tx, ty, 150 + i) * S, y, 1, S * (0.2 + U.hash(tx, ty, 160 + i) * 0.4));
      }
      ctx.fillStyle = 'rgba(190,210,245,0.2)';
      ctx.fillRect(x, y, S, 1.5);
    }
    if (at(-1, 0) !== 'vide') { ctx.fillStyle = lg(ctx, x, 0, x + S * 0.3, 0, 'rgba(30,38,56,0.8)', 'rgba(1,2,7,0)'); ctx.fillRect(x, y, S * 0.3, S); }
    if (at(1, 0) !== 'vide') { ctx.fillStyle = lg(ctx, x + S, 0, x + S * 0.7, 0, 'rgba(30,38,56,0.8)', 'rgba(1,2,7,0)'); ctx.fillRect(x + S * 0.7, y, S * 0.3, S); }
    for (let i = 0; i < 3; i++) {
      if (U.hash(tx, ty, 170 + i) > 0.5) {
        ctx.fillStyle = `rgba(110,160,255,${0.15 + U.hash(tx, ty, 180 + i) * 0.35})`;
        ctx.fillRect(x + U.hash(tx, ty, 190 + i) * S, y + S * 0.3 + U.hash(tx, ty, 200 + i) * S * 0.7, 1, 1);
      }
    }
  };

  // Ombres de contact au pied des murs (passe après les tuiles)
  P.ambientOcclusion = function (ctx, map, S) {
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const t = map.tileAt(tx, ty);
        if (isSolid(t)) continue;
        const x = tx * S, y = ty * S;
        const edge = (dx, dy, x0, y0, x1, y1, w, h, a) => {
          if (map.tileAt(tx + dx, ty + dy) !== 'mur') return;
          ctx.fillStyle = lg(ctx, x0, y0, x1, y1, `rgba(0,0,0,${a})`, 'rgba(0,0,0,0)');
          ctx.fillRect(x + (dx > 0 ? S - w : 0), y + (dy > 0 ? S - h : 0), w, h);
        };
        edge(0, -1, x, y, x, y + S * 0.45, S, S * 0.45, 0.55);
        edge(-1, 0, x, y, x + S * 0.3, y, S * 0.3, S, 0.4);
        edge(1, 0, x + S, y, x + S * 0.7, y, S * 0.3, S, 0.4);
        edge(0, 1, x, y + S, x, y + S * 0.8, S, S * 0.2, 0.3);
      }
    }
  };

  // Décor semé au hasard sur le sol (non bloquant). Renvoie les lumières des cristaux/champignons.
  P.decor = function (ctx, map, S, occupied) {
    const lights = [];
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const t = map.tileAt(tx, ty);
        if (t !== 'sol' && t !== 'sol2') continue;
        if (occupied.has(tx + ',' + ty)) continue;
        const x = tx * S, y = ty * S, r = U.hash(tx, ty, 300);
        const wallUp = map.tileAt(tx, ty - 1) === 'mur', wallLeft = map.tileAt(tx - 1, ty) === 'mur', wallRight = map.tileAt(tx + 1, ty) === 'mur';
        if (wallUp && wallLeft && U.hash(tx, ty, 301) < 0.6) cobweb(ctx, x, y, S, 1);
        else if (wallUp && wallRight && U.hash(tx, ty, 302) < 0.6) cobweb(ctx, x + S, y, S, -1);
        if (wallUp && r < 0.09) { crystals(ctx, x, y, S, tx, ty); lights.push({ x: tx, y: ty, r: 1.7, color: '150,120,255', pulse: true }); continue; }
        if (r > 0.97) { mushrooms(ctx, x, y, S, tx, ty); lights.push({ x: tx, y: ty, r: 1.1, color: '90,220,255', pulse: true }); continue; }
        if (r > 0.945) { bones(ctx, x, y, S, tx, ty); continue; }
        if (r > 0.91 && t === 'sol') { puddle(ctx, x, y, S, tx, ty); continue; }
        if (r > 0.72) pebbles(ctx, x, y, S, tx, ty);
      }
    }
    return lights;
  };
  function pebbles(ctx, x, y, S, tx, ty) {
    const n = 2 + Math.floor(U.hash(tx, ty, 310) * 3);
    for (let i = 0; i < n; i++) {
      const px = x + 6 + U.hash(tx, ty, 311 + i) * (S - 12), py = y + 8 + U.hash(tx, ty, 321 + i) * (S - 14);
      const r = 1.5 + U.hash(tx, ty, 331 + i) * 2.5;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(px + 1, py + 1.5, r * 1.2, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lg(ctx, px - r, py - r, px + r, py + r, '#4a5470', '#232a3b');
      ctx.beginPath(); ctx.ellipse(px, py, r * 1.1, r * 0.8, 0, 0, TAU); ctx.fill();
    }
  }
  function cobweb(ctx, x, y, S, k) {
    ctx.strokeStyle = 'rgba(200,210,230,0.16)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { const a = (i / 3) * Math.PI / 2; ctx.moveTo(x, y); ctx.lineTo(x + k * Math.cos(a) * S * 0.5, y + Math.sin(a) * S * 0.5); }
    for (const rad of [0.18, 0.32, 0.46]) { ctx.moveTo(x + k * S * rad, y); ctx.quadraticCurveTo(x + k * S * rad * 0.62, y + S * rad * 0.62, x, y + S * rad); }
    ctx.stroke();
  }
  function crystals(ctx, x, y, S, tx, ty) {
    const cx = x + S * (0.3 + U.hash(tx, ty, 340) * 0.4), cy = y + S * 0.35;
    ctx.fillStyle = rg(ctx, cx, cy, 0, S * 0.6, 'rgba(150,120,255,0.35)', 'rgba(150,120,255,0)');
    ctx.fillRect(cx - S * 0.6, cy - S * 0.6, S * 1.2, S * 1.2);
    const shards = [[-0.12, 0.3, -0.25], [0.02, 0.42, 0.05], [0.13, 0.26, 0.3]];
    for (const [dx, h, rot] of shards) {
      ctx.save();
      ctx.translate(cx + dx * S, cy + S * 0.05);
      ctx.rotate(rot);
      const w = S * 0.07, hh = S * h;
      ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w * 0.8, -hh * 0.75); ctx.lineTo(0, -hh); ctx.lineTo(w * 0.8, -hh * 0.75); ctx.lineTo(w, 0); ctx.closePath();
      ctx.fillStyle = lg(ctx, -w, -hh, w, 0, '#e6dcff', '#6a4ce0'); ctx.fill();
      ctx.strokeStyle = '#2a1a66'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-w * 0.35, -hh * 0.7, 1, hh * 0.5);
      ctx.restore();
    }
  }
  function mushrooms(ctx, x, y, S, tx, ty) {
    for (let i = 0; i < 3; i++) {
      const mx = x + S * (0.25 + i * 0.22 + U.hash(tx, ty, 350 + i) * 0.08), my = y + S * (0.55 + U.hash(tx, ty, 360 + i) * 0.25), r = S * (0.06 + i % 2 * 0.03);
      ctx.fillStyle = rg(ctx, mx, my - r, 0, r * 4, 'rgba(90,220,255,0.35)', 'rgba(90,220,255,0)');
      ctx.fillRect(mx - r * 4, my - r * 5, r * 8, r * 8);
      ctx.fillStyle = '#c8d6e0'; ctx.fillRect(mx - 1, my - r, 2, r * 1.2);
      ctx.beginPath(); ctx.ellipse(mx, my - r, r * 1.3, r * 0.75, 0, Math.PI, TAU); ctx.fillStyle = lg(ctx, mx, my - r * 2, mx, my - r, '#c9f6ff', '#2bb8e8'); ctx.fill();
      ctx.strokeStyle = '#0b3a52'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  function bones(ctx, x, y, S, tx, ty) {
    const cx = x + S * 0.5, cy = y + S * 0.6, rot = U.hash(tx, ty, 370) * Math.PI;
    for (const a of [rot, rot + 1.2]) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = '#d9d2bf'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
      ctx.fillRect(-S * 0.16, -1.5, S * 0.32, 3);
      for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(e * S * 0.16, -2, 2.4, 0, TAU); ctx.arc(e * S * 0.16, 2, 2.4, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    if (U.hash(tx, ty, 371) > 0.5) {
      const sx = cx + S * 0.18, sy = cy - S * 0.12;
      ctx.beginPath(); ctx.ellipse(sx, sy, S * 0.09, S * 0.08, 0, 0, TAU); ctx.fillStyle = '#e2dccb'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
      ctx.fillStyle = '#141414'; ctx.fillRect(sx - S * 0.05, sy - S * 0.01, S * 0.035, S * 0.03); ctx.fillRect(sx + S * 0.015, sy - S * 0.01, S * 0.035, S * 0.03);
    }
  }
  function puddle(ctx, x, y, S, tx, ty) {
    const cx = x + S * 0.5, cy = y + S * 0.55, rx = S * (0.3 + U.hash(tx, ty, 380) * 0.12);
    ctx.fillStyle = 'rgba(10,20,40,0.75)';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, rx * 0.45, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(140,180,255,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx - rx * 0.2, cy - rx * 0.1, rx * 0.55, rx * 0.18, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  }

  P.tiles = TL;
  P.mix = mix;
  G.placeholders = P;
})();
