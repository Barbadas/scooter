/* Visuels provisoires dessinés au canvas, style « cel-shading » :
   contours sombres, dégradés, reflets. Univers : France en ruines, 2061.
   Chaque peintre reçoit (ctx, s, o) : origine = pieds du personnage,
   s = taille de la boîte en pixels,
   o = { dir, ph (phase de marche, absente à l'arrêt), idle, t, pose, faceX, weapon }.
   Ils disparaissent automatiquement dès qu'une image est branchée dans assets.js. */
(function () {
  const TAU = Math.PI * 2;
  const U = G.U;
  const P = {};
  let LW = 1;
  const OUT = '#0c0907';

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
  function begin(s) { LW = Math.max(1, s * 0.022); }
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
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
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
  // Flammes additives (barils, feux de poubelle)
  function flames(ctx, s, x, y, t, k = 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [fx0, hk, seed] of [[-0.12, 0.85, 0], [0.12, 0.8, 1.7], [0, 1.25, 3.1]]) {
      const f = Math.sin(t * 11 + seed) * 0.5 + 0.5, f2 = Math.sin(t * 17 + seed * 2);
      const fx = x + fx0 * s * k, fh = s * (0.28 + f * 0.14) * hk * k;
      for (const [m, colr] of [[1, 'rgba(255,90,30,0.7)'], [0.62, 'rgba(255,170,60,0.85)'], [0.3, 'rgba(255,245,200,0.95)']]) {
        ctx.fillStyle = colr;
        ctx.beginPath();
        ctx.moveTo(fx - s * 0.1 * k * m, y);
        ctx.quadraticCurveTo(fx - s * 0.1 * k * m + f2 * s * 0.02, y - fh * 0.6 * m, fx + f2 * s * 0.03, y - fh * m);
        ctx.quadraticCurveTo(fx + s * 0.1 * k * m, y - fh * 0.5 * m, fx + s * 0.1 * k * m, y);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ═════════════ Armes ═════════════
  // Repère local : la main est à l'origine, le canon / la lame pointe vers -y,
  // le dessus de l'arme est du côté -x (après rotation de π/2 : canon vers la droite).
  const TWO_HANDED = { rifle: true, mg: true };
  const GUN = '#2a2c30', GUN2 = '#17181b', STEEL = '#b9c0c8';
  function weapon(ctx, s, w, rot, k = 1) {
    if (!w) return;
    ctx.save();
    ctx.rotate(rot);
    if (w === 'knife') {
      const len = 0.25 * s * k, bw = 0.042 * s;
      rr(ctx, -bw * 0.42, -s * 0.005, bw * 0.84, s * 0.08, 2, '#2b221b');
      for (let i = 1; i < 3; i++) line(ctx, [-bw * 0.4, s * 0.02 * i, bw * 0.4, s * 0.02 * i], '#4a3a2c', 1);
      poly(ctx, [-bw / 2, -s * 0.012, bw / 2, -s * 0.012, bw * 0.5, -len * 0.72, -bw * 0.05, -len, -bw / 2, -len * 0.84], lg(ctx, -bw / 2, 0, bw / 2, 0, lite(STEEL, 0.35), dark(STEEL, 0.35)));
      line(ctx, [-bw * 0.18, -s * 0.03, -bw * 0.18, -len * 0.78], 'rgba(255,255,255,0.6)', Math.max(1, LW * 0.6));
      for (let i = 0; i < 3; i++) line(ctx, [bw * 0.5, -s * 0.04 - i * s * 0.025, bw * 0.3, -s * 0.05 - i * s * 0.025], OUT, 1);
      rr(ctx, -bw * 1.3, -s * 0.02, bw * 2.6, s * 0.022, 1, '#3c3f45');
    } else if (w === 'pistol') {
      const L = 0.2 * s * k;
      // poignée (sous la main), pontet, culasse
      poly(ctx, [-s * 0.025, -s * 0.035, s * 0.05, -s * 0.05, s * 0.06, s * 0.0, -s * 0.012, s * 0.022], lg(ctx, -s * 0.02, 0, s * 0.06, 0, GUN, GUN2));
      ctx.beginPath(); ctx.arc(-s * 0.005, -s * 0.07, s * 0.022, -0.2, Math.PI * 0.9); ctx.strokeStyle = OUT; ctx.lineWidth = LW; ctx.stroke();
      rr(ctx, -s * 0.06, -L, s * 0.04, L + s * 0.03, 2, lg(ctx, -s * 0.06, 0, -s * 0.02, 0, lite(GUN, 0.25), GUN2));
      for (let i = 0; i < 4; i++) line(ctx, [-s * 0.058, s * 0.005 - i * s * 0.01, -s * 0.045, s * 0.005 - i * s * 0.01], 'rgba(0,0,0,0.6)', 1);
      line(ctx, [-s * 0.055, -L + s * 0.01, -s * 0.055, -s * 0.03], 'rgba(255,255,255,0.22)', 1);
      rr(ctx, -s * 0.048, -L - s * 0.004, s * 0.016, s * 0.008, 1, '#050505', false);
    } else if (w === 'rifle') {
      const L = 0.62 * s * k;
      const wood = lg(ctx, -s * 0.05, 0, s * 0.03, 0, '#8a5a32', '#4a2e18');
      poly(ctx, [-s * 0.05, s * 0.02, s * 0.0, s * 0.02, s * 0.035, s * 0.17, -s * 0.045, s * 0.17], wood);   // crosse
      rr(ctx, -s * 0.055, -s * 0.22, s * 0.05, s * 0.26, 2, lg(ctx, -s * 0.055, 0, -s * 0.005, 0, lite(GUN, 0.2), GUN2));   // boîtier
      rr(ctx, -s * 0.004, -s * 0.13, s * 0.032, s * 0.06, 1, GUN2);   // chargeur
      rr(ctx, -s * 0.052, -s * 0.4, s * 0.044, s * 0.19, 3, wood);   // garde-main
      rr(ctx, -s * 0.039, -L, s * 0.018, L - s * 0.38, 1, GUN);   // canon
      rr(ctx, -s * 0.045, -L - s * 0.01, s * 0.03, s * 0.03, 1, GUN2);   // frein de bouche
      rr(ctx, -s * 0.098, -s * 0.25, s * 0.036, s * 0.16, 3, lg(ctx, -s * 0.098, 0, -s * 0.062, 0, '#3a3d42', '#111214'));   // lunette
      ell(ctx, -s * 0.08, -s * 0.255, s * 0.02, s * 0.008, '#7fc8ff', false);
      line(ctx, [-s * 0.09, -s * 0.22, -s * 0.09, -s * 0.12], 'rgba(255,255,255,0.25)', 1);
    } else if (w === 'mg') {
      const L = 0.58 * s * k;
      rr(ctx, -s * 0.06, s * 0.01, s * 0.06, s * 0.13, 3, GUN2);   // crosse
      rr(ctx, -s * 0.08, -s * 0.24, s * 0.09, s * 0.28, 3, lg(ctx, -s * 0.08, 0, s * 0.01, 0, lite(GUN, 0.2), GUN2));   // boîtier
      rr(ctx, s * 0.008, -s * 0.18, s * 0.075, s * 0.12, 2, lg(ctx, 0, -s * 0.18, 0, -s * 0.06, '#5a6340', '#353b25'));   // caisse à munitions
      for (let i = 0; i < 5; i++) rr(ctx, s * 0.05 + i * s * 0.008, -s * 0.05 + i * s * 0.018, s * 0.022, s * 0.012, 1, '#d8a640');   // bande
      rr(ctx, -s * 0.068, -s * 0.48, s * 0.06, s * 0.25, 3, lg(ctx, -s * 0.068, 0, -s * 0.008, 0, '#4a4d52', '#1d1e21'));   // manchon
      for (let i = 0; i < 5; i++) ell(ctx, -s * 0.038, -s * 0.27 - i * s * 0.045, s * 0.012, s * 0.012, '#050505', false);
      rr(ctx, -s * 0.048, -L, s * 0.02, L - s * 0.47, 1, GUN);   // canon
      ctx.beginPath(); ctx.arc(-s * 0.11, -s * 0.12, s * 0.05, Math.PI * 0.5, Math.PI * 1.5); ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(2, s * 0.018); ctx.stroke();   // poignée
      line(ctx, [-s * 0.01, -s * 0.46, s * 0.06, -s * 0.33], GUN2, Math.max(1.5, s * 0.012));   // bipied replié
    }
    ctx.restore();
  }
  // Rotation de l'arme selon la vue et la pose
  function weaponRot(w, view, attack) {
    if (view === 'side') {
      if (w === 'knife') return attack ? Math.PI / 2 - 0.1 : Math.PI - 0.5;
      if (attack) return Math.PI / 2;
      return w === 'pistol' ? Math.PI / 2 + 0.9 : Math.PI / 2 + 0.5;
    }
    if (w === 'knife') return attack ? 0.6 : Math.PI - 0.35;
    if (w === 'pistol') return attack ? 0.2 : Math.PI - 0.3;
    if (w === 'rifle') return attack ? -0.25 : -0.62;
    return attack ? -0.6 : -0.8;   // mitrailleuse portée à la hanche
  }

  // ═════════════ Têtes ═════════════
  function face(ctx, c, o, view, hx, hy, hr) {
    const side = view === 'side';
    const pts = side ? [[hx + hr * 0.52, hy + hr * 0.08]] : [[hx - hr * 0.37, hy + hr * 0.1], [hx + hr * 0.37, hy + hr * 0.1]];
    if (c.mask === 'gas') return gasMask(ctx, c, o, view, hx, hy, hr, pts);
    for (const [x, y] of pts) {
      if (o.pose === 'hurt') {
        line(ctx, [x - hr * 0.13, y - hr * 0.1, x + hr * 0.13, y + hr * 0.1], OUT, Math.max(1, hr * 0.1));
        line(ctx, [x - hr * 0.13, y + hr * 0.1, x + hr * 0.13, y - hr * 0.1], OUT, Math.max(1, hr * 0.1));
        continue;
      }
      ell(ctx, x, y, hr * 0.12, hr * 0.16, c.eye, false);
      ell(ctx, x - hr * 0.04, y - hr * 0.06, hr * 0.045, hr * 0.045, 'rgba(255,255,255,0.95)', false);
    }
    // sourcils froncés
    if (c.brows !== false) {
      const bc = c.browCol || dark(c.hair || c.skin, 0.2);
      for (const [x, y] of pts) {
        const k = side ? 1 : (x < hx ? 1 : -1);
        line(ctx, [x - k * hr * 0.17, y - hr * 0.3, x + k * hr * 0.12, y - hr * 0.2], bc, Math.max(1, hr * 0.09));
      }
    }
    if (c.nose) {
      if (side) poly(ctx, [hx + hr * 0.8, hy, hx + hr * 1.2, hy + hr * 0.32, hx + hr * 0.78, hy + hr * 0.36], lite(c.skin, 0.05));
      else poly(ctx, [hx - hr * 0.1, hy + hr * 0.18, hx, hy + hr * 0.5, hx + hr * 0.1, hy + hr * 0.18], dark(c.skin, 0.12), false);
    }
    if (c.scar && !side) line(ctx, [hx + hr * 0.25, hy - hr * 0.25, hx + hr * 0.5, hy + hr * 0.35], '#9a4a3c', Math.max(1, hr * 0.08));
    if (c.beard) {
      ctx.beginPath();
      if (side) {
        ctx.moveTo(hx - hr * 0.2, hy + hr * 0.1);
        ctx.quadraticCurveTo(hx + hr * 0.2, hy + hr * 1.35, hx + hr * 0.95, hy + hr * 0.42);
        ctx.lineTo(hx + hr * 0.5, hy + hr * 0.38);
      } else {
        ctx.moveTo(hx - hr * 0.92, hy + hr * 0.05);
        ctx.quadraticCurveTo(hx - hr * 0.7, hy + hr * 1.3, hx, hy + hr * 1.32);
        ctx.quadraticCurveTo(hx + hr * 0.7, hy + hr * 1.3, hx + hr * 0.92, hy + hr * 0.05);
        ctx.quadraticCurveTo(hx, hy + hr * 0.5, hx - hr * 0.92, hy + hr * 0.05);
      }
      ctx.closePath();
      done(ctx, lg(ctx, 0, hy, 0, hy + hr * 1.3, c.beard, dark(c.beard, 0.3)));
    }
    if (c.mask === 'scarf') return scarfMask(ctx, c, view, hx, hy, hr);
    // bouche
    const mx = side ? hx + hr * 0.55 : hx, my = hy + hr * 0.6;
    if (c.grin) {
      const w = side ? hr * 0.35 : hr * 0.62;
      ctx.beginPath();
      ctx.moveTo(mx - w / 2, my - hr * 0.05);
      ctx.quadraticCurveTo(mx, my + hr * 0.28, mx + w / 2, my - hr * 0.05);
      ctx.closePath();
      done(ctx, '#2a0b0b');
      for (let i = 0; i < 3; i++) {
        const tx = mx - w * 0.3 + i * w * 0.3;
        rr(ctx, tx - hr * 0.06, my - hr * 0.04, hr * 0.11, hr * 0.1, 1, i === 1 ? '#d9b84a' : '#efe8d6', false);
      }
    } else if (!side && !c.beard) {
      line(ctx, [mx - hr * 0.1, my, mx + hr * 0.1, my], dark(c.skin, 0.45), Math.max(1, hr * 0.07));
    }
  }

  function scarfMask(ctx, c, view, hx, hy, hr) {
    const col = c.maskCol || '#6b2a22';
    ctx.beginPath();
    if (view === 'side') {
      ctx.moveTo(hx - hr * 0.35, hy + hr * 0.2);
      ctx.quadraticCurveTo(hx + hr * 0.5, hy + hr * 0.28, hx + hr * 1.08, hy + hr * 0.22);
      ctx.quadraticCurveTo(hx + hr * 1.0, hy + hr * 0.95, hx + hr * 0.3, hy + hr * 1.08);
      ctx.quadraticCurveTo(hx - hr * 0.3, hy + hr * 0.9, hx - hr * 0.35, hy + hr * 0.2);
    } else {
      ctx.moveTo(hx - hr * 0.98, hy + hr * 0.22);
      ctx.quadraticCurveTo(hx, hy + hr * 0.34, hx + hr * 0.98, hy + hr * 0.22);
      ctx.quadraticCurveTo(hx + hr * 0.9, hy + hr * 1.05, hx, hy + hr * 1.12);
      ctx.quadraticCurveTo(hx - hr * 0.9, hy + hr * 1.05, hx - hr * 0.98, hy + hr * 0.22);
    }
    ctx.closePath();
    done(ctx, lg(ctx, 0, hy + hr * 0.2, 0, hy + hr * 1.1, lite(col, 0.12), dark(col, 0.25)));
    const x0 = view === 'side' ? hx : hx - hr * 0.6, x1 = view === 'side' ? hx + hr * 0.9 : hx + hr * 0.6;
    for (let i = 1; i < 3; i++) line(ctx, [x0, hy + hr * (0.4 + i * 0.2), x1, hy + hr * (0.45 + i * 0.2)], dark(col, 0.35), Math.max(1, hr * 0.05));
  }

  function gasMask(ctx, c, o, view, hx, hy, hr, pts) {
    const rub = c.maskCol || '#2b2d2a', side = view === 'side';
    if (side) {
      ell(ctx, hx + hr * 0.35, hy + hr * 0.25, hr * 0.75, hr * 0.7, lg(ctx, hx, hy - hr * 0.4, hx, hy + hr, lite(rub, 0.15), dark(rub, 0.3)));
      rr(ctx, hx + hr * 0.75, hy + hr * 0.45, hr * 0.55, hr * 0.5, hr * 0.12, lg(ctx, 0, hy + hr * 0.45, 0, hy + hr, '#6b6f63', '#33362f'));
      for (let i = 1; i < 3; i++) line(ctx, [hx + hr * (0.8 + i * 0.15), hy + hr * 0.5, hx + hr * (0.8 + i * 0.15), hy + hr * 0.9], 'rgba(0,0,0,0.5)', 1);
    } else {
      ell(ctx, hx, hy + hr * 0.25, hr * 0.88, hr * 0.78, lg(ctx, hx, hy - hr * 0.5, hx, hy + hr, lite(rub, 0.15), dark(rub, 0.3)));
      ell(ctx, hx, hy + hr * 0.82, hr * 0.32, hr * 0.28, lg(ctx, 0, hy + hr * 0.55, 0, hy + hr * 1.1, '#6b6f63', '#33362f'));
      for (let i = -1; i <= 1; i++) line(ctx, [hx + i * hr * 0.12, hy + hr * 0.66, hx + i * hr * 0.12, hy + hr * 0.98], 'rgba(0,0,0,0.5)', 1);
    }
    const lens = c.lens || '#c9a24a', lensRGB = c.lensRGB || '255,190,90';
    for (const [x, y] of pts) {
      ell(ctx, x, y, hr * 0.24, hr * 0.24, '#141512');
      if (c.lensGlow) glowDot(ctx, x, y, hr * 0.12, lensRGB, 0.7);
      ell(ctx, x, y, hr * 0.17, hr * 0.17, lg(ctx, x - hr * 0.17, y - hr * 0.17, x + hr * 0.17, y + hr * 0.17, lite(lens, 0.3), dark(lens, 0.4)), false);
      if (o.pose === 'hurt') line(ctx, [x - hr * 0.15, y - hr * 0.08, x + hr * 0.02, y + hr * 0.02, x + hr * 0.12, y + hr * 0.14], OUT, 1);
      else ell(ctx, x - hr * 0.06, y - hr * 0.07, hr * 0.05, hr * 0.035, 'rgba(255,255,255,0.8)', false);
    }
  }

  function goggles(ctx, c, view, hx, hy, hr) {
    const y = hy - hr * 0.5;
    if (view === 'back') { line(ctx, [hx - hr, y + hr * 0.1, hx + hr, y + hr * 0.1], '#2a2420', Math.max(2, hr * 0.16)); return; }
    line(ctx, [view === 'side' ? hx - hr : hx - hr * 1.02, y, hx + hr * 1.02, y], '#2a2420', Math.max(2, hr * 0.16));
    const xs = view === 'side' ? [hx + hr * 0.55] : [hx - hr * 0.36, hx + hr * 0.36];
    for (const x of xs) {
      ell(ctx, x, y, hr * 0.24, hr * 0.2, '#3a3530');
      ell(ctx, x, y, hr * 0.16, hr * 0.13, lg(ctx, x, y - hr * 0.13, x, y + hr * 0.13, '#9fd4c8', '#2d5c58'), false);
      ell(ctx, x - hr * 0.05, y - hr * 0.04, hr * 0.04, hr * 0.03, 'rgba(255,255,255,0.85)', false);
    }
  }

  function hair(ctx, c, view, hx, hy, hr) {
    const st = c.hairStyle;
    if (!st || st === 'bald' || st === 'none') return;
    if (st === 'hood') {
      const f = lg(ctx, 0, hy - hr, 0, hy + hr, lite(c.hood, 0.12), dark(c.hood, 0.25));
      if (view === 'back') { ell(ctx, hx, hy - hr * 0.02, hr * 1.2, hr * 1.16, f); line(ctx, [hx, hy - hr * 1.1, hx, hy + hr * 0.9], dark(c.hood, 0.35), Math.max(1, LW * 0.8)); return; }
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
    if (st === 'beanie') {
      const col = c.beanie || '#3c4a3a';
      const f = lg(ctx, 0, hy - hr * 1.2, 0, hy, lite(col, 0.15), dark(col, 0.25));
      const low = view === 'back' ? hy + hr * 0.25 : hy - hr * 0.2;
      ctx.beginPath();
      ctx.arc(hx, hy - hr * 0.08, hr * 1.1, Math.PI, TAU);
      ctx.lineTo(hx + hr * 1.1, low);
      ctx.lineTo(hx - hr * 1.1, low);
      ctx.closePath();
      done(ctx, f);
      rr(ctx, hx - hr * 1.14, low - hr * 0.3, hr * 2.28, hr * 0.32, hr * 0.1, dark(col, 0.12));
      for (let i = -3; i <= 3; i++) line(ctx, [hx + i * hr * 0.3, low - hr * 0.28, hx + i * hr * 0.3, low - hr * 0.02], dark(col, 0.35), 1);
      return;
    }
    const col = c.hair;
    const f = lg(ctx, 0, hy - hr * 1.2, 0, hy + hr * 0.6, lite(col, 0.18), dark(col, 0.15));
    const spike = pts => poly(ctx, pts.map((v, i) => (i % 2 ? hy + v * hr : hx + v * hr)), f);
    if (st === 'mohawk') {
      // côtés rasés + crête
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(hx, hy - hr * 0.02, hr * 1.0, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath();
      ctx.fillStyle = dark(c.skin, 0.4); ctx.fill();
      ctx.restore();
      if (view === 'side') {
        for (let i = 0; i < 6; i++) {
          const a = -0.35 - i * 0.48, a2 = a - 0.24;
          spike([Math.cos(a) * 0.92, Math.sin(a) * 0.92, Math.cos(a - 0.12) * 1.6, Math.sin(a - 0.12) * 1.6 - 0.1, Math.cos(a2) * 0.92, Math.sin(a2) * 0.92]);
        }
      } else {
        for (const [x, h] of [[-0.12, 1.45], [0.0, 1.62], [0.12, 1.45]]) spike([x - 0.14, -0.85, x, -h, x + 0.14, -0.85]);
        rr(ctx, hx - hr * 0.2, hy - hr * 1.1, hr * 0.4, hr * 0.32, hr * 0.1, f);
      }
      return;
    }
    const spiky = st === 'spiky';
    if (view === 'back') {
      if (spiky) for (const sp of [[-0.75, -0.6, -1.2, -1.15, -0.25, -0.95], [-0.3, -0.95, 0.05, -1.5, 0.35, -0.95], [0.25, -0.95, 0.85, -1.25, 0.85, -0.55], [-1.0, -0.2, -1.3, -0.6, -0.85, -0.6], [0.95, -0.2, 1.3, -0.55, 0.85, -0.6]]) spike(sp);
      ell(ctx, hx, hy - hr * 0.02, hr * 1.06, hr * 1.04, f);
      if (spiky) for (const sp of [[-0.75, 0.45, -0.55, 1.05, -0.2, 0.6], [-0.3, 0.6, 0, 1.15, 0.3, 0.6], [0.2, 0.6, 0.55, 1.05, 0.75, 0.45]]) spike(sp);
      if (st === 'ponytail') {
        ell(ctx, hx, hy + hr * 1.15, hr * 0.32, hr * 0.85, f);
        rr(ctx, hx - hr * 0.22, hy + hr * 0.42, hr * 0.44, hr * 0.16, 2, c.trim || '#d9a441');
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
    if (view !== 'back' || spiky) {
      ctx.strokeStyle = lite(col, 0.4);
      ctx.lineWidth = Math.max(1, hr * 0.1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(hx - hr * 0.15, hy - hr * 0.35, hr * 0.55, Math.PI * 1.15, Math.PI * 1.5);
      ctx.stroke();
    }
  }

  // Tête de loup-garou
  function wolfHead(ctx, c, o, view, hx, hy, hr) {
    const fur = c.skin, f = rg(ctx, hx - hr * 0.3, hy - hr * 0.4, hr * 0.1, hr * 1.4, lite(fur, 0.15), dark(fur, 0.3));
    // crinière
    const n = 9, side = view === 'side';
    const a0 = side ? Math.PI * 0.45 : Math.PI * 0.85, span = side ? Math.PI * 1.0 : Math.PI * 1.3;
    const mane = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (span * i) / n;
      const r = i % 2 ? hr * 1.12 : hr * (side ? 1.42 : 1.6);
      mane.push(hx + Math.cos(a) * r, hy + hr * 0.15 + Math.sin(a) * r);
    }
    if (side) mane.push(hx + hr * 0.2, hy - hr * 0.6, hx + hr * 0.2, hy + hr * 0.9);
    else mane.push(hx + hr * 0.6, hy + hr * 1.0, hx - hr * 0.6, hy + hr * 1.0);
    poly(ctx, mane, dark(fur, 0.25));
    // oreilles
    const earXs = view === 'side' ? [-0.35] : [-0.62, 0.62];
    for (const k of earXs) {
      const ex = hx + k * hr;
      poly(ctx, [ex - hr * 0.3, hy - hr * 0.55, ex + k * hr * 0.2, hy - hr * 1.65, ex + hr * 0.32, hy - hr * 0.6], fur);
      if (view !== 'back') poly(ctx, [ex - hr * 0.15, hy - hr * 0.65, ex + k * hr * 0.15, hy - hr * 1.3, ex + hr * 0.17, hy - hr * 0.68], '#4a2c2c', false);
    }
    ell(ctx, hx, hy, hr * 1.02, hr * 0.95, f);
    if (view === 'back') return;
    const glow = c.eyeRGB || '255,190,60';
    if (view === 'side') {
      // museau allongé
      poly(ctx, [hx + hr * 0.3, hy - hr * 0.3, hx + hr * 1.55, hy + hr * 0.05, hx + hr * 1.6, hy + hr * 0.3, hx + hr * 1.2, hy + hr * 0.62, hx + hr * 0.2, hy + hr * 0.7], lg(ctx, hx, hy - hr * 0.3, hx, hy + hr * 0.7, lite(fur, 0.1), c.belly || lite(fur, 0.3)));
      ell(ctx, hx + hr * 1.55, hy + hr * 0.08, hr * 0.15, hr * 0.12, '#111');
      line(ctx, [hx + hr * 0.5, hy + hr * 0.5, hx + hr * 1.45, hy + hr * 0.38], '#2a0b0b', Math.max(1.5, hr * 0.1));
      for (const tx of [0.75, 1.05, 1.3]) poly(ctx, [hx + hr * tx - hr * 0.06, hy + hr * 0.42, hx + hr * tx + hr * 0.06, hy + hr * 0.42, hx + hr * tx, hy + hr * 0.62], '#f4efe0', false);
      const ex = hx + hr * 0.45, ey = hy - hr * 0.15;
      glowDot(ctx, ex, ey, hr * 0.15, glow, 1);
      poly(ctx, [ex - hr * 0.16, ey - hr * 0.02, ex + hr * 0.18, ey - hr * 0.12, ex + hr * 0.1, ey + hr * 0.08], '#ffe7a0', false);
    } else {
      ell(ctx, hx, hy + hr * 0.45, hr * 0.55, hr * 0.42, lg(ctx, 0, hy, 0, hy + hr * 0.9, lite(fur, 0.1), c.belly || lite(fur, 0.3)));
      ell(ctx, hx, hy + hr * 0.22, hr * 0.2, hr * 0.14, '#111');
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.38, hy + hr * 0.55);
      ctx.quadraticCurveTo(hx, hy + hr * 0.95, hx + hr * 0.38, hy + hr * 0.55);
      ctx.closePath();
      done(ctx, '#2a0b0b');
      for (const k of [-1, 1]) poly(ctx, [hx + k * hr * 0.28, hy + hr * 0.56, hx + k * hr * 0.16, hy + hr * 0.58, hx + k * hr * 0.22, hy + hr * 0.82], '#f4efe0', false);
      for (const k of [-1, 1]) {
        const ex = hx + k * hr * 0.4, ey = hy - hr * 0.12;
        if (o.pose === 'hurt') { line(ctx, [ex - hr * 0.13, ey - hr * 0.08, ex + hr * 0.13, ey + hr * 0.08], OUT, Math.max(1, hr * 0.1)); continue; }
        glowDot(ctx, ex, ey, hr * 0.14, glow, 1);
        poly(ctx, [ex - k * hr * 0.18, ey - hr * 0.1, ex + k * hr * 0.16, ey + hr * 0.02, ex - k * hr * 0.12, ey + hr * 0.08], '#ffe7a0', false);
      }
      for (const k of [-1, 1]) line(ctx, [hx + k * hr * 0.62, hy - hr * 0.35, hx + k * hr * 0.15, hy - hr * 0.22], dark(fur, 0.5), Math.max(1, hr * 0.1));
    }
  }

  // Tête de tigre-garou : oreilles rondes, museau court, rayures, moustaches
  function tigerHead(ctx, c, o, view, hx, hy, hr) {
    const fur = c.skin, st = c.stripes || '#1a120c', side = view === 'side';
    // collerette de poils sur les joues
    const ruff = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (side ? 0.35 + 1.0 * i / 10 : 0.15 + 0.7 * i / 10);
      const r = i % 2 ? hr * 1.05 : hr * 1.32;
      ruff.push(hx + Math.cos(a) * r * (side ? 0.9 : 1), hy + hr * 0.1 + Math.sin(a) * r * 0.85);
    }
    poly(ctx, ruff, c.belly);
    // oreilles rondes
    for (const k of side ? [-0.35] : [-0.68, 0.68]) {
      ell(ctx, hx + k * hr, hy - hr * 0.78, hr * 0.32, hr * 0.3, fur);
      if (view !== 'back') ell(ctx, hx + k * hr, hy - hr * 0.76, hr * 0.17, hr * 0.15, '#3a2418', false);
    }
    ell(ctx, hx, hy, hr * 1.05, hr * 0.96, rg(ctx, hx - hr * 0.3, hy - hr * 0.4, hr * 0.1, hr * 1.4, lite(fur, 0.18), dark(fur, 0.25)));
    // rayures du crâne
    for (const [dx, len] of [[-0.35, 0.45], [0, 0.55], [0.35, 0.45]]) line(ctx, [hx + dx * hr, hy - hr * 0.95, hx + dx * hr * 0.8, hy - hr * (0.95 - len)], st, Math.max(1.5, hr * 0.13));
    if (view === 'back') { for (const k of [-1, 1]) line(ctx, [hx + k * hr, hy - hr * 0.1, hx + k * hr * 0.55, hy + hr * 0.05], st, Math.max(1.5, hr * 0.12)); return; }
    const glow = c.eyeRGB || '255,200,60';
    if (side) {
      poly(ctx, [hx + hr * 0.45, hy - hr * 0.2, hx + hr * 1.3, hy + hr * 0.1, hx + hr * 1.32, hy + hr * 0.38, hx + hr * 1.0, hy + hr * 0.66, hx + hr * 0.3, hy + hr * 0.62], lg(ctx, hx, hy - hr * 0.2, hx, hy + hr * 0.7, lite(fur, 0.1), c.belly));
      ell(ctx, hx + hr * 1.26, hy + hr * 0.12, hr * 0.13, hr * 0.1, '#5a2a24');
      line(ctx, [hx + hr * 0.55, hy + hr * 0.5, hx + hr * 1.2, hy + hr * 0.44], '#2a0b0b', Math.max(1.5, hr * 0.09));
      for (const tx of [0.8, 1.1]) poly(ctx, [hx + hr * tx - hr * 0.06, hy + hr * 0.46, hx + hr * tx + hr * 0.06, hy + hr * 0.46, hx + hr * tx, hy + hr * 0.7], '#f4efe0', false);
      line(ctx, [hx + hr * 0.1, hy + hr * 0.05, hx + hr * 0.45, hy + hr * 0.2], st, Math.max(1.5, hr * 0.1));
      const ex = hx + hr * 0.55, ey = hy - hr * 0.12;
      glowDot(ctx, ex, ey, hr * 0.14, glow, 1);
      poly(ctx, [ex - hr * 0.15, ey, ex + hr * 0.18, ey - hr * 0.1, ex + hr * 0.1, ey + hr * 0.08], '#fff0a0', false);
      for (let i = -1; i <= 1; i++) line(ctx, [hx + hr * 1.1, hy + hr * 0.35, hx + hr * 1.75, hy + hr * (0.3 + i * 0.18)], 'rgba(240,235,220,0.7)', 1);
      return;
    }
    // museau large et clair
    ell(ctx, hx, hy + hr * 0.45, hr * 0.62, hr * 0.42, lg(ctx, 0, hy, 0, hy + hr * 0.9, lite(c.belly, 0.05), c.belly));
    poly(ctx, [hx - hr * 0.16, hy + hr * 0.18, hx + hr * 0.16, hy + hr * 0.18, hx, hy + hr * 0.36], '#5a2a24');
    ctx.beginPath(); ctx.moveTo(hx - hr * 0.36, hy + hr * 0.58); ctx.quadraticCurveTo(hx, hy + hr * 0.92, hx + hr * 0.36, hy + hr * 0.58); ctx.closePath(); done(ctx, '#2a0b0b');
    for (const k of [-1, 1]) poly(ctx, [hx + k * hr * 0.26, hy + hr * 0.6, hx + k * hr * 0.14, hy + hr * 0.62, hx + k * hr * 0.2, hy + hr * 0.86], '#f4efe0', false);
    // rayures des joues
    for (const k of [-1, 1]) {
      line(ctx, [hx + k * hr * 1.0, hy + hr * 0.1, hx + k * hr * 0.6, hy + hr * 0.2], st, Math.max(1.5, hr * 0.11));
      line(ctx, [hx + k * hr * 0.98, hy + hr * 0.38, hx + k * hr * 0.66, hy + hr * 0.4], st, Math.max(1.5, hr * 0.1));
      for (let i = -1; i <= 1; i++) line(ctx, [hx + k * hr * 0.45, hy + hr * 0.45, hx + k * hr * 1.3, hy + hr * (0.38 + i * 0.16)], 'rgba(240,235,220,0.7)', 1);
    }
    for (const k of [-1, 1]) {
      const ex = hx + k * hr * 0.42, ey = hy - hr * 0.1;
      if (o.pose === 'hurt') { line(ctx, [ex - hr * 0.13, ey - hr * 0.08, ex + hr * 0.13, ey + hr * 0.08], OUT, Math.max(1, hr * 0.1)); continue; }
      glowDot(ctx, ex, ey, hr * 0.14, glow, 1);
      poly(ctx, [ex - k * hr * 0.18, ey - hr * 0.08, ex + k * hr * 0.16, ey + hr * 0.02, ex - k * hr * 0.12, ey + hr * 0.08], '#fff0a0', false);
      line(ctx, [hx + k * hr * 0.66, hy - hr * 0.34, hx + k * hr * 0.16, hy - hr * 0.22], dark(fur, 0.55), Math.max(1, hr * 0.1));
    }
  }

  // ═════════════ Humanoïdes ═════════════
  function humanoid(ctx, s, o, c) {
    begin(s);
    const dir = o.dir || 'down';
    const view = dir === 'up' ? 'back' : dir === 'down' ? 'front' : 'side';
    const side = view === 'side';
    if (dir === 'left') ctx.scale(-1, 1);
    const walking = o.ph !== undefined;
    const sw = walking ? Math.sin(o.ph) : 0;
    const bob = walking ? Math.abs(Math.sin(o.ph)) * s * 0.025 : Math.sin(o.idle || 0) * s * 0.008;
    const bk = c.bulk || 1, hd = c.head || 1, hunch = c.hunch || 0;
    const attack = o.pose === 'attack';
    const wpn = c.noWeapon ? null : (o.weapon || c.weapon || null);
    const twoH = !!TWO_HANDED[wpn];
    ctx.translate(0, -bob);

    const legH = s * 0.2 * (c.legs || 1);
    const bw = s * 0.32 * bk;
    const top = -legH - s * 0.36 + hunch * s * 0.04;
    const hr = s * 0.165 * hd;
    const hx = side ? s * 0.02 + hunch * s * 0.07 : 0;
    const hy = top - hr * 0.78 + hunch * s * 0.06;
    const aw = s * 0.075 * bk;
    const hand = c.hand || c.skin;
    const w0 = side ? bw * 0.74 : bw;

    // — arrière-plan —
    if (c.tail && c.feline) {
      // queue de félin : épaisse, annelée de noir, qui ondule
      const tx = side ? -w0 * 0.4 : w0 * 0.2, ty = -legH + s * 0.02, k = side ? -1 : 1, wv = Math.sin((o.idle || 0) * 1.5) * s * 0.03;
      const pts = [[tx, ty], [tx + k * s * 0.16, ty + s * 0.04], [tx + k * s * 0.3, ty - s * 0.02 + wv], [tx + k * s * 0.36, ty - s * 0.16 + wv]];
      for (let i = 0; i < pts.length - 1; i++) limb(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], s * 0.055, i === pts.length - 2 ? c.stripes : c.skin);
      for (let i = 1; i < pts.length - 1; i++) ell(ctx, pts[i][0], pts[i][1], s * 0.03, s * 0.03, c.stripes, false);
    } else if (c.tail) {
      const tx = side ? -w0 * 0.45 : 0, ty = -legH + s * 0.02, k = side ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(tx - s * 0.04, ty - s * 0.04);
      ctx.quadraticCurveTo(tx + k * s * 0.32 * (side ? 1 : 0.7), ty + s * 0.02 + sw * s * 0.03, tx + k * s * (side ? 0.4 : 0.28), ty - s * 0.2);
      ctx.quadraticCurveTo(tx + k * s * 0.2, ty + s * 0.08, tx + s * 0.04, ty + s * 0.02);
      ctx.closePath();
      done(ctx, lg(ctx, tx, ty - s * 0.2, tx, ty + s * 0.05, lite(c.skin, 0.1), dark(c.skin, 0.3)));
      if (c.stripes) for (let i = 1; i < 4; i++) {
        const px = tx + k * s * (side ? 0.1 : 0.07) * i, py = ty + s * 0.02 - i * s * 0.04;
        line(ctx, [px, py - s * 0.03, px + k * s * 0.02, py + s * 0.03], c.stripes, Math.max(1.5, s * 0.018));
      }
    }
    if (c.backpack && view === 'front') rr(ctx, -bw * 0.58, top + s * 0.01, bw * 1.16, s * 0.26, s * 0.04, dark(c.backpack, 0.25));
    if (c.hairStyle === 'ponytail' && view !== 'back') {
      const pf = lg(ctx, 0, hy, 0, hy + hr * 2, lite(c.hair, 0.1), dark(c.hair, 0.2));
      if (side) ell(ctx, hx - hr * 1.15, hy + hr * 0.35 + sw * hr * 0.1, hr * 0.32, hr * 0.85, pf, true, 0.35 - sw * 0.15);
      else ell(ctx, hx + hr * 0.95, hy + hr * 0.55, hr * 0.26, hr * 0.7, pf, true, -0.2);
    }
    // bras arrière (vue de profil) : soutient le canon d'une arme lourde
    if (side) {
      let bx = -sw * s * 0.1, by = top + s * 0.27;
      if (twoH) {
        const rot = weaponRot(wpn, view, attack);
        const fx = attack ? s * 0.18 : s * 0.1, fy = attack ? top + s * 0.12 : top + s * 0.21;
        const d = s * (wpn === 'mg' ? 0.2 : 0.17) * bk;
        bx = fx + Math.sin(rot) * d - Math.cos(rot) * s * 0.03;
        by = fy - Math.cos(rot) * d - Math.sin(rot) * s * 0.03;
      }
      limb(ctx, -s * 0.01, top + s * 0.05, bx, by, aw, dark(c.coat2, 0.28));
      ell(ctx, bx, by, aw * 0.55, aw * 0.55, dark(hand, 0.25));
    }

    // — jambes —
    const lw = s * 0.085 * bk;
    if (side) {
      for (const k of [-1, 1]) {
        const off = sw * s * 0.075 * k;
        const pc = k < 0 ? dark(c.pants, 0.3) : c.pants, bc = k < 0 ? dark(c.boots, 0.3) : c.boots;
        limb(ctx, 0, -legH, off, -s * 0.05, lw, pc);
        if (c.kneepad && k > 0) ell(ctx, off * 0.5 + lw * 0.2, -legH * 0.55, lw * 0.55, lw * 0.45, c.kneepad);
        rr(ctx, off - lw * 0.55, -s * 0.065, lw * 1.45, s * 0.065, s * 0.02, bc);
      }
    } else {
      for (const k of [-1, 1]) {
        const lift = Math.max(0, sw * k) * s * 0.035, x = k * bw * 0.26;
        limb(ctx, x, -legH, x, -s * 0.05 - lift, lw, lg(ctx, x - lw, 0, x + lw, 0, lite(c.pants, 0.08), dark(c.pants, 0.2)));
        if (c.kneepad && view === 'front') ell(ctx, x, -legH * 0.55 - lift * 0.5, lw * 0.5, lw * 0.4, c.kneepad);
        if (c.torn && view === 'front') line(ctx, [x - lw * 0.3, -legH * 0.6, x + lw * 0.2, -legH * 0.45], dark(c.pants, 0.45), 1);
        rr(ctx, x - lw * 0.62, -s * 0.07 - lift, lw * 1.24, s * 0.07, s * 0.02, c.boots);
      }
    }

    // — torse —
    const type = c.torso;
    const hem = type === 'jacket' ? -s * 0.07 : -legH + s * 0.03;
    const w1 = (side ? bw * 0.8 : bw) * (type === 'jacket' ? 1.22 : type === 'armor' ? 1.0 : 0.95);
    const main = type === 'jacket' ? c.coat : type === 'fur' ? c.skin : c.shirt;
    const tf = lg(ctx, -w0 / 2, top, w0 / 2, hem, lite(main, 0.14), dark(main, 0.28));
    const flap = type === 'jacket' ? sw * s * 0.02 : 0;
    trapezoid(ctx, side ? -s * 0.01 : 0, top, hem, w0, w1, s * 0.07, tf,
      side ? -s * 0.04 - Math.abs(sw) * s * 0.02 : -flap, side ? sw * s * 0.012 : flap);

    const thin = Math.max(1, LW * 0.8);
    if (type === 'jacket') {
      if (view === 'front') {
        poly(ctx, [-s * 0.05, top + s * 0.02, s * 0.05, top + s * 0.02, s * 0.03, top + s * 0.24, -s * 0.03, top + s * 0.24], c.shirt, false);
        line(ctx, [-s * 0.05, top + s * 0.02, -s * 0.03, top + s * 0.24], lite(c.coat, 0.25), thin);
        line(ctx, [s * 0.05, top + s * 0.02, s * 0.03, top + s * 0.24], lite(c.coat, 0.25), thin);
        line(ctx, [0, top + s * 0.27, flap * 0.5, hem], dark(c.coat, 0.5), thin);
        for (const k of [-1, 1]) rr(ctx, k * w0 * 0.3 - s * 0.04, top + s * 0.3, s * 0.08, s * 0.06, 1, dark(c.coat, 0.15));
      } else if (view === 'back') {
        line(ctx, [0, top + s * 0.1, 0, hem], dark(c.coat, 0.45), thin);
        if (c.hood) ell(ctx, 0, top + s * 0.03, w0 * 0.34, s * 0.065, dark(c.coat, 0.15));
      } else {
        line(ctx, [w0 * 0.3, top + s * 0.05, w0 * 0.42 + sw * s * 0.012, hem], dark(c.coat, 0.5), thin);
      }
      rr(ctx, -w0 * 0.53, top + s * 0.22, w0 * 1.06, s * 0.04, 1, c.belt);
      if (view === 'front') rr(ctx, -s * 0.025, top + s * 0.217, s * 0.05, s * 0.046, 1, c.metal);
      // patchs / reprises
      if (view !== 'back' && c.patch) rr(ctx, side ? w0 * 0.05 : -w0 * 0.38, top + s * 0.33, s * 0.07, s * 0.06, 1, c.patch);
    } else if (type === 'vest') {
      const vx = side ? -s * 0.01 : 0;
      trapezoid(ctx, vx, top + s * 0.02, -legH + s * 0.08, w0 * 0.9, w1 * 0.95, s * 0.05, lg(ctx, 0, top, 0, -legH, lite(c.coat, 0.12), dark(c.coat, 0.25)));
      if (view !== 'back') {
        const xs = side ? [w0 * 0.12] : [-w0 * 0.22, w0 * 0.22];
        for (const px of xs) {
          rr(ctx, px - s * 0.045, top + s * 0.12, s * 0.09, s * 0.08, 2, dark(c.coat, 0.15));
          line(ctx, [px - s * 0.04, top + s * 0.14, px + s * 0.04, top + s * 0.14], 'rgba(0,0,0,0.4)', 1);
        }
      } else {
        rr(ctx, -w0 * 0.3, top + s * 0.06, w0 * 0.6, s * 0.18, 2, dark(c.coat, 0.1));
      }
      rr(ctx, -w0 * 0.5, -legH + s * 0.02, w0 * 1.0, s * 0.04, 1, c.belt);
    } else if (type === 'armor') {
      const ax = side ? -s * 0.01 : 0;
      trapezoid(ctx, ax, top + s * 0.02, top + s * 0.26, w0 * 0.92, w0 * 0.82, s * 0.05, lg(ctx, -w0 / 2, top, w0 / 2, top + s * 0.26, lite(c.metal, 0.2), dark(c.metal, 0.35)));
      for (const rx of side ? [w0 * 0.25] : [-w0 * 0.35, w0 * 0.35]) for (const ry of [0.06, 0.2]) ell(ctx, rx + ax, top + s * ry, s * 0.012, s * 0.012, lite(c.metal, 0.45), false);
      if (view !== 'back') line(ctx, [ax - w0 * 0.25, top + s * 0.12, ax + w0 * 0.2, top + s * 0.15], 'rgba(0,0,0,0.45)', 1);
      rr(ctx, -w0 * 0.52, -legH + s * 0.02, w0 * 1.04, s * 0.045, 1, c.belt);
      if (c.bandolier && view !== 'back') {
        const x0 = side ? -w0 * 0.3 : -w0 * 0.42, x1 = side ? w0 * 0.35 : w0 * 0.4;
        line(ctx, [x0, top + s * 0.02, x1, -legH + s * 0.02], '#3a2b1c', Math.max(3, s * 0.035));
        for (let i = 1; i < 7; i++) {
          const t = i / 7, bxx = x0 + (x1 - x0) * t, byy = top + s * 0.02 + (-legH + s * 0.02 - top - s * 0.02) * t;
          rr(ctx, bxx - s * 0.008, byy - s * 0.02, s * 0.016, s * 0.03, 1, '#d8a640', false);
        }
      }
      // épaulières à pointes
      for (const k of side ? [0] : [-1, 1]) {
        const px = k * w0 * 0.5 + (side ? -s * 0.01 : 0), py = top + s * 0.03;
        ell(ctx, px, py, s * 0.1, s * 0.07, lg(ctx, 0, py - s * 0.07, 0, py + s * 0.07, lite(c.metal, 0.25), dark(c.metal, 0.35)));
        for (const d of [-1, 0, 1]) poly(ctx, [px + d * s * 0.05 - s * 0.015, py - s * 0.05, px + d * s * 0.05 + s * 0.015, py - s * 0.05, px + d * s * 0.06, py - s * 0.11], '#c9ccd0');
      }
    } else if (type === 'fur') {
      if (view !== 'back') ell(ctx, side ? w0 * 0.12 : 0, top + s * 0.15, w0 * (side ? 0.28 : 0.32), s * 0.12, lg(ctx, 0, top, 0, top + s * 0.27, c.belly, dark(c.belly, 0.2)), false);
      if (c.stripes) {
        for (const k of side ? [1] : [-1, 1]) for (let i = 0; i < 3; i++) {
          const y = top + s * (0.06 + i * 0.09), x0 = k * w0 * 0.5;
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(x0 - k * w0 * 0.18, y + s * 0.02, x0 - k * w0 * 0.3, y + s * 0.05);
          ctx.strokeStyle = c.stripes; ctx.lineWidth = Math.max(2, s * 0.022); ctx.lineCap = 'round'; ctx.stroke();
        }
        if (view === 'back') for (let i = 0; i < 4; i++) line(ctx, [-w0 * 0.3, top + s * (0.05 + i * 0.07), w0 * 0.3, top + s * (0.07 + i * 0.07)], c.stripes, Math.max(2, s * 0.02));
      } else {
        for (let i = 0; i < 6; i++) {
          const x = -w0 * 0.4 + i * w0 * 0.16, y = top + s * (0.06 + (i % 2) * 0.04);
          line(ctx, [x, y, x + s * 0.02, y + s * 0.04, x + s * 0.04, y], dark(c.skin, 0.4), thin);
        }
      }
      rr(ctx, -w0 * 0.5, -legH + s * 0.01, w0 * 1.0, s * 0.03, 1, dark(c.pants, 0.2));
    }
    if (c.backpack && view === 'back') {
      rr(ctx, -bw * 0.4, top + s * 0.02, bw * 0.8, s * 0.27, s * 0.04, lg(ctx, 0, top, 0, top + s * 0.3, lite(c.backpack, 0.1), dark(c.backpack, 0.25)));
      rr(ctx, -bw * 0.36, top + s * 0.02, bw * 0.72, s * 0.08, s * 0.03, dark(c.backpack, 0.15));
      ell(ctx, 0, top - s * 0.005, bw * 0.38, s * 0.035, '#5a4a36');
    } else if (c.backpack && side) {
      rr(ctx, -w0 / 2 - s * 0.1, top + s * 0.02, s * 0.13, s * 0.26, s * 0.03, lg(ctx, -w0, 0, -w0 / 2, 0, dark(c.backpack, 0.2), c.backpack));
    } else if (c.backpack) {
      for (const k of [-1, 1]) line(ctx, [k * w0 * 0.3, top + s * 0.01, k * w0 * 0.28, top + s * 0.2], dark(c.backpack, 0.1), Math.max(2, s * 0.025));
    }
    // arme lourde portée en bandoulière (vue de dos)
    if (view === 'back' && twoH) { ctx.save(); ctx.translate(-bw * 0.22, top + s * 0.3); weapon(ctx, s, wpn, 0.55, bk); ctx.restore(); }

    // — bras —
    const shoulderY = top + s * 0.05;
    const armband = (x0, y0, x1, y1) => { if (c.armband && view !== 'back') { const t = 0.3; ell(ctx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, aw * 0.58, aw * 0.4, c.armband, true, Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2); } };
    const claws = (x, y, k) => { if (c.claws) for (let i = -1; i <= 1; i++) poly(ctx, [x + i * aw * 0.3 - aw * 0.1, y + aw * 0.3, x + i * aw * 0.3 + aw * 0.1, y + aw * 0.3, x + i * aw * 0.4 + k * aw * 0.1, y + aw * 0.95], '#efe8d6', false); };
    const sleeve0 = type === 'fur' ? c.skin : c.coat2;
    if (side) {
      let fx, fy;
      if (wpn && wpn !== 'knife') { fx = attack ? s * 0.18 : s * 0.1; fy = attack ? top + s * 0.12 : top + s * 0.21; if (!twoH && !attack) fx += sw * s * 0.03; }
      else { fx = attack ? s * 0.24 : sw * s * 0.1 + s * 0.02; fy = attack ? top + s * 0.1 : top + s * 0.27; }
      limb(ctx, s * 0.01, shoulderY, fx, fy, aw, lg(ctx, 0, top, 0, fy, lite(sleeve0, 0.1), dark(sleeve0, 0.2)));
      armband(s * 0.01, shoulderY, fx, fy);
      if (wpn) { ctx.save(); ctx.translate(fx, fy); weapon(ctx, s, wpn, weaponRot(wpn, view, attack), bk); ctx.restore(); }
      ell(ctx, fx, fy, aw * 0.55, aw * 0.55, hand);
      claws(fx, fy, 1);
    } else {
      for (const k of [-1, 1]) {
        const lift = view === 'front' ? sw * k * s * 0.025 : -sw * k * s * 0.025;
        const raise = attack && k === 1;
        const sx = k * (w0 / 2 - aw * 0.1);
        let hx2 = k * (w0 / 2 + aw * (raise ? 0.7 : 0.3)), hy2 = raise ? top + s * 0.06 : top + s * 0.27 + lift;
        // arme lourde tenue à deux mains, en travers du corps
        if (twoH && view === 'front') { hx2 = k === 1 ? w0 * 0.42 : -w0 * 0.05; hy2 = k === 1 ? top + s * 0.28 : top + s * 0.17; }
        const sleeve = view === 'back' ? dark(sleeve0, 0.12) : sleeve0;
        limb(ctx, sx, shoulderY, hx2, hy2, aw, lg(ctx, sx - aw, 0, sx + aw, 0, lite(sleeve, 0.1), dark(sleeve, 0.2)));
        armband(sx, shoulderY, hx2, hy2);
        if (k === 1 && wpn && view === 'front') { ctx.save(); ctx.translate(hx2, hy2); weapon(ctx, s, wpn, weaponRot(wpn, view, attack), twoH ? 0.8 : bk); ctx.restore(); }
        ell(ctx, hx2, hy2, aw * 0.55, aw * 0.55, hand);
        claws(hx2, hy2, k);
      }
      if (twoH && view === 'front') ell(ctx, -w0 * 0.05, top + s * 0.17, aw * 0.55, aw * 0.55, hand);
    }

    // — écharpe au cou —
    if (c.scarf) {
      const sc = c.scarf, sf = lg(ctx, 0, top - s * 0.03, 0, top + s * 0.06, lite(sc, 0.12), dark(sc, 0.2));
      if (side) {
        poly(ctx, [-w0 * 0.3, top - s * 0.01, -w0 * 0.3 - s * 0.16, top + s * 0.03 + sw * s * 0.03, -w0 * 0.3 - s * 0.14, top + s * 0.08 + sw * s * 0.03, -w0 * 0.25, top + s * 0.06], dark(sc, 0.15));
        ell(ctx, 0, top + s * 0.01, w0 * 0.42, s * 0.045, sf);
      } else {
        ell(ctx, 0, top + s * 0.01, w0 * 0.4, s * 0.05, sf);
        if (view === 'front') poly(ctx, [w0 * 0.08, top + s * 0.03, w0 * 0.22, top + s * 0.03, w0 * 0.2 + sw * s * 0.01, top + s * 0.19, w0 * 0.1 + sw * s * 0.01, top + s * 0.18], sf);
        else poly(ctx, [-w0 * 0.1, top + s * 0.03, w0 * 0.05, top + s * 0.03, w0 * 0.02, top + s * 0.17, -w0 * 0.12, top + s * 0.16], sf);
      }
    }

    // — tête —
    if (c.feline) { tigerHead(ctx, c, o, view, hx, hy, hr); return; }
    if (c.wolf) { wolfHead(ctx, c, o, view, hx, hy, hr); return; }
    if (c.hairStyle === 'hood' && view !== 'back') ell(ctx, hx - (side ? hr * 0.25 : 0), hy, hr * 1.18, hr * 1.12, dark(c.hood, 0.2));
    ell(ctx, hx, hy, hr, hr * 0.97, rg(ctx, hx - hr * 0.35, hy - hr * 0.45, hr * 0.1, hr * 1.3, lite(c.skin, 0.16), dark(c.skin, 0.24)));
    if (view !== 'back') face(ctx, c, o, view, hx, hy, hr);
    hair(ctx, c, view, hx, hy, hr);
    if (c.goggles) goggles(ctx, c, view, hx, hy, hr);
  }

  const H = {
    // Le héros : récupérateur du Clan du Corbeau
    heros: {
      skin: '#dcb08a', coat: '#4c5138', coat2: '#42472f', shirt: '#2a2620', pants: '#3a3b36', boots: '#221b15',
      hair: '#2b2018', belt: '#3a2b1c', metal: '#a3a8ae', eye: '#1e1a16', torso: 'jacket', hairStyle: 'spiky',
      hood: true, scarf: '#8e3326', backpack: '#5d4e38', armband: '#d9a441', patch: '#6b5a3c', kneepad: '#2e2a25',
    },
    pnj_mira: {
      skin: '#c48d68', coat: '#5b5f46', coat2: '#4b4f3a', shirt: '#33302a', pants: '#3e3a33', boots: '#211b16',
      hair: '#b4462d', belt: '#3a2b1c', metal: '#a3a8ae', trim: '#d9a441', eye: '#2f5a3e', torso: 'vest',
      hairStyle: 'ponytail', weapon: 'rifle', goggles: true, armband: '#d9a441', kneepad: '#2e2a25',
    },
    // Pillards du clan des Vipères (vert)
    pillard: {
      skin: '#c9a080', coat: '#4a4a30', coat2: '#3e3e2a', shirt: '#2a2a20', pants: '#3b382c', boots: '#1e1a14',
      hood: '#3d5a2c', belt: '#2a2016', metal: '#8a8f94', eye: '#1e1a16', torso: 'jacket', hairStyle: 'hood',
      mask: 'gas', lens: '#7fd36b', lensRGB: '120,220,100', lensGlow: true, armband: '#6fb35f', torn: true, brows: false,
    },
    pillard_tireur: {
      skin: '#b98c6c', coat: '#4d5a3a', coat2: '#3d3a30', shirt: '#2b2a24', pants: '#34332c', boots: '#1e1a14',
      hair: '#1d1712', beanie: '#2f4a2a', belt: '#2a2016', metal: '#8a8f94', eye: '#1e1a16', torso: 'vest',
      hairStyle: 'beanie', mask: 'scarf', maskCol: '#4f7a3a', armband: '#6fb35f', kneepad: '#24221d',
    },
    tireur_elite: {
      skin: '#c9a080', coat: '#5a5640', coat2: '#4a4734', shirt: '#2a2a20', pants: '#3f3c30', boots: '#1e1a14',
      hood: '#4a5a36', belt: '#2a2016', metal: '#8a8f94', eye: '#1e1a16', torso: 'jacket', hairStyle: 'hood',
      mask: 'scarf', maskCol: '#3a4a2c', goggles: true, armband: '#6fb35f', patch: '#3a4a2c',
    },
    // Kross, lieutenant des Vipères
    kross: {
      skin: '#b8835e', coat: '#3a3a2c', coat2: '#3a3a2c', shirt: '#2b2b24', pants: '#2f2e28', boots: '#18140f',
      hair: '#5fae4a', belt: '#2a2016', metal: '#6c7177', eye: '#d23a2a', torso: 'armor', hairStyle: 'mohawk',
      bulk: 1.45, head: 0.95, beard: '#3a2a1e', scar: true, grin: true, bandolier: true, armband: '#6fb35f', kneepad: '#3a3d40',
    },
    // Forme bestiale (artefact du tigre)
    forme_tigre: {
      skin: '#d0782c', belly: '#f0e2c8', coat2: '#d0782c', pants: '#3b3f4a', boots: '#b8682a', hand: '#c06a26',
      stripes: '#1c120a', torso: 'fur', feline: true, claws: true, tail: true, noWeapon: true, bulk: 1.34,
      hunch: 0.75, head: 1.12, eyeRGB: '255,210,70', torn: true, legs: 1.05,
    },
    // Forme bestiale (artefact du loup)
    forme_loup: {
      skin: '#6d5e4f', belly: '#a8977f', coat2: '#6d5e4f', pants: '#3b3f4a', boots: '#4e4236', hand: '#5a4c3f',
      torso: 'fur', wolf: true, claws: true, tail: true, noWeapon: true, bulk: 1.38, hunch: 0.9, head: 1.12,
      eyeRGB: '255,190,60', torn: true, legs: 1.05,
    },
  };
  for (const k in H) P[k] = (ctx, s, o) => humanoid(ctx, s, o, H[k]);

  // ═════════════ Quadrupèdes ═════════════
  function quadruped(ctx, s, o, c) {
    begin(s);
    let dir = o.dir || 'right';
    if (dir === 'up' || dir === 'down') dir = o.faceX || 'right';
    if (dir === 'left') ctx.scale(-1, 1);
    const walking = o.ph !== undefined;
    const ph = walking ? o.ph * 1.2 : 0;
    const bob = walking ? Math.abs(Math.sin(ph)) * s * 0.02 : Math.sin(o.idle || 0) * s * 0.006;
    const by = -s * (c.legH + 0.14) - bob;
    const L = s * c.len;

    // queue
    ctx.beginPath();
    ctx.moveTo(-L * 0.9, by - s * 0.05);
    ctx.quadraticCurveTo(-L * 1.4, by - s * 0.02 + Math.sin(ph) * s * 0.03, -L * 1.6, by - s * c.tailUp);
    ctx.quadraticCurveTo(-L * 1.25, by + s * 0.06, -L * 0.85, by + s * 0.04);
    ctx.closePath();
    done(ctx, lg(ctx, -L * 1.6, 0, -L * 0.8, 0, lite(c.tail, 0.2), dark(c.tail, 0.15)));
    // pattes
    const legs = [[-0.62, 0], [0.55, Math.PI], [-0.45, Math.PI], [0.72, 0]];
    const lw = s * (c.legW || 0.055);
    legs.forEach(([lx, off], i) => {
      const far = i < 2;
      const swing = walking ? Math.sin(ph + off) * s * 0.06 : 0;
      const x = lx * L;
      limb(ctx, x, by + s * 0.04, x + swing, -s * 0.03, lw, far ? dark(c.body, 0.3) : c.body);
      ell(ctx, x + swing + lw * 0.2, -s * 0.025, lw * 0.75, lw * 0.45, far ? dark(c.belly, 0.3) : c.belly);
    });
    // corps (maigre : côtes visibles)
    ctx.beginPath();
    ctx.moveTo(-L, by);
    ctx.bezierCurveTo(-L, by - s * 0.17, L * 0.4, by - s * 0.21, L * 0.75, by - s * 0.12);
    ctx.bezierCurveTo(L * 1.05, by - s * 0.05, L * 1.0, by + s * 0.12, L * 0.55, by + s * 0.11);
    ctx.bezierCurveTo(L * 0.1, by + s * 0.04, -L * 0.6, by + s * 0.14, -L, by);
    ctx.closePath();
    done(ctx, lg(ctx, 0, by - s * 0.2, 0, by + s * 0.14, dark(c.body, 0.15), lite(c.belly, 0.05)));
    for (let i = 0; i < 3; i++) line(ctx, [L * (0.05 + i * 0.13), by - s * 0.06, L * (0.0 + i * 0.13), by + s * 0.05], dark(c.body, 0.35), Math.max(1, LW * 0.7));
    if (c.patches) for (let i = 0; i < 2; i++) ell(ctx, -L * (0.4 - i * 0.5), by - s * 0.08, L * 0.18, s * 0.05, c.patches, false, 0.2);
    for (let i = 0; i < 5; i++) {
      const x = -L * 0.7 + i * L * 0.32, y = by - s * 0.14 + Math.abs(i - 2) * s * 0.012;
      line(ctx, [x, y, x + s * 0.03, y - s * 0.03, x + s * 0.05, y], dark(c.body, 0.35), Math.max(1, LW * 0.8));
    }
    // tête
    const hx = L * 0.95, hy = by - s * 0.1;
    const hr = s * c.head;
    poly(ctx, [hx - hr * 0.75, hy - hr * 0.35, hx - hr * 0.55, hy - hr * 1.45, hx - hr * 0.05, hy - hr * 0.55], c.ear);
    poly(ctx, [hx - hr * 0.62, hy - hr * 0.45, hx - hr * 0.52, hy - hr * 1.1, hx - hr * 0.2, hy - hr * 0.55], lite(c.ear, 0.25), false);
    ell(ctx, hx, hy, hr, hr * 0.9, lg(ctx, hx, hy - hr, hx, hy + hr, dark(c.body, 0.05), lite(c.belly, 0.05)));
    poly(ctx, [hx + hr * 0.3, hy - hr * 0.5, hx + hr * (1 + c.snout), hy - hr * 0.05, hx + hr * (1 + c.snout), hy + hr * 0.3, hx + hr * 0.2, hy + hr * 0.65], lg(ctx, hx, hy - hr, hx, hy + hr, lite(c.body, 0.05), c.belly));
    ell(ctx, hx + hr * (1 + c.snout), hy + hr * 0.02, hr * 0.17, hr * 0.14, c.nose);
    for (let i = 0; i < 2; i++) {
      const tx = hx + hr * (0.75 + i * 0.35);
      poly(ctx, [tx - hr * 0.07, hy + hr * 0.38, tx + hr * 0.07, hy + hr * 0.38, tx, hy + hr * 0.62], '#f4efe0', false);
    }
    if (c.collar) {
      rr(ctx, hx - hr * 1.05, hy + hr * 0.25, hr * 0.5, hr * 0.7, hr * 0.15, c.collar);
      ell(ctx, hx - hr * 0.75, hy + hr * 1.0, hr * 0.12, hr * 0.12, '#c9ccd0');
    }
    const ex = hx + hr * 0.25, ey = hy - hr * 0.2;
    glowDot(ctx, ex, ey, hr * 0.14, c.eyeRGB, 0.8);
    ell(ctx, ex, ey, hr * 0.16, hr * 0.11, c.eye, false, -0.25);
    ell(ctx, ex + hr * 0.02, ey, hr * 0.06, hr * 0.06, '#ffffff', false);
  }
  const Q = {
    chien: { body: '#6e5540', belly: '#a2865f', ear: '#4e3a2b', eye: '#ffcf5a', eyeRGB: '255,190,80', tail: '#6e5540', nose: '#121212', legH: 0.17, len: 0.28, head: 0.11, snout: 0.8, tailUp: 0.12, patches: '#3e2e22', collar: '#7a2a20' },
  };
  for (const k in Q) P[k] = (ctx, s, o) => quadruped(ctx, s, o, Q[k]);

  // ═════════════ Objets ═════════════
  // Caisses : bois militaire, ouverte, ou trousse médicale
  function crate(ctx, s, o, kind) {
    begin(s);
    const w = s * 0.8, h = s * 0.46, d = s * 0.16;
    const wood = kind === 'medic' ? '#4f5a3c' : '#7a5a36';
    const top = lg(ctx, 0, -h - d, 0, -h, lite(wood, 0.2), lite(wood, 0.05));
    if (kind === 'open') {
      poly(ctx, [-w / 2 + s * 0.02, -h - d, -w / 2 + s * 0.06, -h - d - s * 0.36, w / 2 - s * 0.02, -h - d - s * 0.36, w / 2 - s * 0.06, -h - d], lg(ctx, 0, -h - d - s * 0.36, 0, -h - d, dark(wood, 0.05), dark(wood, 0.35)));
      for (let i = 1; i < 3; i++) line(ctx, [-w / 2 + s * 0.05, -h - d - s * 0.12 * i, w / 2 - s * 0.05, -h - d - s * 0.12 * i], dark(wood, 0.45), 1);
    }
    poly(ctx, [-w / 2, -h, -w / 2 + s * 0.06, -h - d, w / 2 + s * 0.06, -h - d, w / 2, -h], kind === 'open' ? '#1a120a' : top);
    if (kind === 'open') {
      glowDot(ctx, s * 0.03, -h - d * 0.5, s * 0.05, '255,200,120', 0.5);
      poly(ctx, [-w / 2 + s * 0.08, -h - d * 0.3, -w / 2 + s * 0.1, -h - d * 0.8, -w / 2 + s * 0.3, -h - d * 0.8, -w / 2 + s * 0.28, -h - d * 0.3], '#d8cfb8', false);
    }
    rr(ctx, -w / 2, -h, w, h, 2, lg(ctx, 0, -h, 0, 0, lite(wood, 0.1), dark(wood, 0.32)));
    poly(ctx, [w / 2, -h, w / 2 + s * 0.06, -h - d, w / 2 + s * 0.06, -d, w / 2, 0], dark(wood, 0.4));
    if (kind === 'medic') {
      ell(ctx, 0, -h / 2, s * 0.13, s * 0.13, '#e8e2d2');
      rr(ctx, -s * 0.03, -h / 2 - s * 0.09, s * 0.06, s * 0.18, 1, '#c62828', false);
      rr(ctx, -s * 0.09, -h / 2 - s * 0.03, s * 0.18, s * 0.06, 1, '#c62828', false);
      rr(ctx, -s * 0.1, -h - d - s * 0.04, s * 0.2, s * 0.05, 2, '#2a2c2e');
      for (const k of [-1, 1]) rr(ctx, k * w * 0.42 - s * 0.02, -h + s * 0.06, s * 0.04, s * 0.07, 1, '#8a8f94');
    } else {
      for (let i = 1; i < 3; i++) line(ctx, [-w / 2 + 2, -h + (h * i) / 3, w / 2 - 2, -h + (h * i) / 3], dark(wood, 0.45), 1);
      line(ctx, [-w / 2 + s * 0.05, -s * 0.04, w / 2 - s * 0.05, -h + s * 0.04], dark(wood, 0.35), Math.max(2, s * 0.03));
      ctx.fillStyle = 'rgba(20,16,10,0.55)';
      ctx.font = `bold ${Math.round(s * 0.09)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('F-07', -w * 0.18, -h * 0.68);
      for (const x of [-w / 2 + s * 0.05, w / 2 - s * 0.09]) rr(ctx, x, -h + s * 0.03, s * 0.04, h - s * 0.06, 1, '#5a5f66');
    }
  }
  P.caisse = (ctx, s, o) => crate(ctx, s, o, 'closed');
  P.caisse_ouverte = (ctx, s, o) => crate(ctx, s, o, 'open');
  P.caisse_medocs = (ctx, s, o) => crate(ctx, s, o, 'medic');

  // Bidon d'essence transformé en brasero
  P.baril = (ctx, s, o) => {
    begin(s);
    const t = o.t || 0, w = s * 0.46, h = s * 0.62, rust = '#7a3e22';
    rr(ctx, -w / 2, -h, w, h, s * 0.04, lg(ctx, -w / 2, 0, w / 2, 0, lite(rust, 0.12), dark(rust, 0.45)));
    for (const y of [0.3, 0.66]) { line(ctx, [-w / 2, -h * y, w / 2, -h * y], dark(rust, 0.5), Math.max(2, s * 0.025)); line(ctx, [-w / 2, -h * y - 2, w / 2, -h * y - 2], lite(rust, 0.2), 1); }
    for (let i = 0; i < 3; i++) ell(ctx, -w * 0.25 + i * w * 0.25, -h * 0.48, s * 0.025, s * 0.035, '#ffb24a', false);
    glowDot(ctx, 0, -h * 0.48, s * 0.06, '255,150,60', 0.5);
    ell(ctx, 0, -h, w / 2, s * 0.07, '#1a0d06');
    ell(ctx, 0, -h, w * 0.42, s * 0.05, '#ff8a3a', false);
    ell(ctx, 0, -h, w * 0.28, s * 0.03, '#ffd27a', false);
    flames(ctx, s, 0, -h, t + (o.seed || 0), 0.95);
  };

  // Épave de voiture calcinée
  P.epave = (ctx, s, o) => {
    begin(s);
    const W = s * 0.98, rust = '#5a3a28', soot = '#2a2420';
    for (const x of [-W * 0.3, W * 0.3]) { rr(ctx, x - s * 0.06, -s * 0.08, s * 0.12, s * 0.08, 1, '#4a4a4a'); ell(ctx, x, -s * 0.12, s * 0.09, s * 0.09, '#2a2a2a'); ell(ctx, x, -s * 0.12, s * 0.05, s * 0.05, '#6a6560', false); }
    ctx.beginPath();
    ctx.moveTo(-W / 2, -s * 0.12);
    ctx.lineTo(-W / 2, -s * 0.28);
    ctx.lineTo(-W * 0.3, -s * 0.31);
    ctx.lineTo(-W * 0.18, -s * 0.48);
    ctx.lineTo(W * 0.2, -s * 0.48);
    ctx.lineTo(W * 0.32, -s * 0.31);
    ctx.lineTo(W / 2, -s * 0.27);
    ctx.lineTo(W / 2, -s * 0.12);
    ctx.closePath();
    done(ctx, lg(ctx, 0, -s * 0.48, 0, -s * 0.1, lite(rust, 0.05), soot));
    poly(ctx, [-W * 0.26, -s * 0.31, -W * 0.16, -s * 0.45, -W * 0.02, -s * 0.45, -W * 0.02, -s * 0.31], '#0e0c0a');
    poly(ctx, [W * 0.02, -s * 0.31, W * 0.02, -s * 0.45, W * 0.18, -s * 0.45, W * 0.28, -s * 0.31], '#0e0c0a');
    poly(ctx, [W * 0.04, -s * 0.44, W * 0.1, -s * 0.44, W * 0.06, -s * 0.38], 'rgba(190,210,220,0.5)', false);
    for (let i = 0; i < 6; i++) ell(ctx, -W * 0.4 + U.hash(i, 3, 9) * W * 0.8, -s * (0.16 + U.hash(i, 4, 9) * 0.1), s * 0.04, s * 0.02, '#8a4a2a', false);
    line(ctx, [-W * 0.02, -s * 0.31, -W * 0.02, -s * 0.13], 'rgba(0,0,0,0.5)', 1);
    line(ctx, [-W / 2 + 2, -s * 0.2, W / 2 - 2, -s * 0.2], 'rgba(0,0,0,0.35)', 1);
    rr(ctx, W / 2 - s * 0.05, -s * 0.25, s * 0.05, s * 0.04, 1, '#d8b04a', false);
  };

  // Barricade : sacs de sable, palette et barbelés
  P.barricade = (ctx, s, o) => {
    begin(s);
    const W = s * 0.92, sand = '#9a8a62';
    rr(ctx, -W * 0.45, -s * 0.62, W * 0.9, s * 0.3, 2, '#6b5232');
    for (let i = 0; i < 4; i++) line(ctx, [-W * 0.45 + 2, -s * 0.6 + i * s * 0.09, W * 0.45 - 2, -s * 0.6 + i * s * 0.09], '#3e2e1c', 1);
    for (let row = 0; row < 3; row++) {
      const n = 4 - (row === 2 ? 1 : 0), y = -s * 0.1 - row * s * 0.12, off = row % 2 ? W * 0.11 : 0;
      for (let i = 0; i < n; i++) {
        const x = -W / 2 + off + s * 0.02 + i * W * 0.24;
        rr(ctx, x, y - s * 0.07, W * 0.24, s * 0.12, s * 0.05, lg(ctx, 0, y - s * 0.07, 0, y + s * 0.05, lite(sand, 0.1), dark(sand, 0.3)));
        line(ctx, [x + W * 0.06, y - s * 0.01, x + W * 0.18, y - s * 0.01], dark(sand, 0.35), 1);
      }
    }
    ctx.strokeStyle = '#8f949a'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) { const x = -W * 0.44 + i * W * 0.11; ctx.moveTo(x + s * 0.06, -s * 0.48); ctx.ellipse(x, -s * 0.48, s * 0.06, s * 0.05, 0, 0, TAU); }
    ctx.stroke();
  };

  // Abri de bâches et de tôles
  P.abri = (ctx, s, o) => {
    begin(s);
    const tarp = '#4a5a6a', tin = '#6a6e70';
    for (const x of [-s * 0.42, s * 0.42]) limb(ctx, x, 0, x, -s * 0.55, s * 0.03, '#4a3a28');
    poly(ctx, [-s * 0.5, -s * 0.5, s * 0.5, -s * 0.62, s * 0.5, -s * 0.36, -s * 0.5, -s * 0.28], lg(ctx, 0, -s * 0.62, 0, -s * 0.28, lite(tin, 0.1), dark(tin, 0.35)));
    for (let i = 1; i < 8; i++) line(ctx, [-s * 0.5 + i * s * 0.125, -s * 0.5 - i * s * 0.015, -s * 0.5 + i * s * 0.125, -s * 0.28 - i * s * 0.01], 'rgba(0,0,0,0.3)', 1);
    ctx.beginPath();
    ctx.moveTo(-s * 0.46, -s * 0.3);
    ctx.lineTo(s * 0.46, -s * 0.38);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.15, s * 0.44, 0);
    ctx.lineTo(-s * 0.44, 0);
    ctx.quadraticCurveTo(-s * 0.5, -s * 0.15, -s * 0.46, -s * 0.3);
    ctx.closePath();
    done(ctx, lg(ctx, 0, -s * 0.38, 0, 0, lite(tarp, 0.08), dark(tarp, 0.35)));
    poly(ctx, [-s * 0.12, 0, -s * 0.06, -s * 0.24, s * 0.1, -s * 0.26, s * 0.14, 0], '#100c08');
    // serpent peint à la bombe
    line(ctx, [-s * 0.38, -s * 0.12, -s * 0.32, -s * 0.2, -s * 0.26, -s * 0.12, -s * 0.2, -s * 0.2, -s * 0.16, -s * 0.15], '#6fb35f', Math.max(2, s * 0.025));
    ell(ctx, -s * 0.15, -s * 0.15, s * 0.025, s * 0.02, '#6fb35f', false);
  };

  // Pilier de station de métro (faïence + affiches déchirées)
  P.pilier = (ctx, s, o) => {
    begin(s);
    const W = s * 0.34, H = s * 0.98;
    rr(ctx, -W / 2, -H, W, H, 2, lg(ctx, -W / 2, 0, W / 2, 0, '#8d877a', '#4c4840'));
    ctx.save();
    ctx.beginPath(); ctx.rect(-W / 2, -H * 0.5, W, H * 0.5); ctx.clip();
    ctx.strokeStyle = 'rgba(40,36,30,0.45)'; ctx.lineWidth = 1;
    for (let y = 0; y < 8; y++) { ctx.beginPath(); ctx.moveTo(-W / 2, -y * H * 0.065); ctx.lineTo(W / 2, -y * H * 0.065); ctx.stroke(); }
    for (let x = -1; x <= 1; x++) { ctx.beginPath(); ctx.moveTo(x * W * 0.25, 0); ctx.lineTo(x * W * 0.25, -H * 0.5); ctx.stroke(); }
    ctx.restore();
    rr(ctx, -W / 2 - s * 0.02, -H * 0.52, W + s * 0.04, s * 0.04, 1, '#b8862e');
    rr(ctx, -W * 0.4, -H * 0.86, W * 0.65, H * 0.26, 1, '#cbbf9a');
    poly(ctx, [-W * 0.4, -H * 0.6, -W * 0.1, -H * 0.6, -W * 0.25, -H * 0.66], '#4c4840', false);
    for (let i = 0; i < 3; i++) line(ctx, [-W * 0.32, -H * (0.81 - i * 0.05), W * 0.15, -H * (0.81 - i * 0.05)], 'rgba(40,30,20,0.5)', 1);
    rr(ctx, -W * 0.05, -H * 0.97, W * 0.45, H * 0.14, 1, '#8a2a20');
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-W * 0.4, -H * 0.62, W * 0.4, H * 0.04);
    rr(ctx, -W / 2 - s * 0.03, -s * 0.05, W + s * 0.06, s * 0.05, 1, '#5a564e');
  };

  // Escalier de service qui remonte vers la surface
  P.escalier = (ctx, s, o) => {
    begin(s);
    const t = o.t || 0, W = s * 0.7;
    const g = ctx.createRadialGradient(0, -s * 0.85, 0, 0, -s * 0.85, s * 0.6);
    g.addColorStop(0, `rgba(255,210,150,${0.45 + Math.sin(t * 2) * 0.08})`); g.addColorStop(1, 'rgba(255,210,150,0)');
    ctx.fillStyle = g; ctx.fillRect(-s * 0.6, -s * 1.45, s * 1.2, s * 1.2);
    poly(ctx, [-W / 2, 0, -W * 0.32, -s * 0.85, W * 0.32, -s * 0.85, W / 2, 0], '#1a1714');
    for (let i = 0; i < 7; i++) {
      const k0 = i / 7, k1 = (i + 1) / 7, y0 = -k0 * s * 0.85, y1 = -k1 * s * 0.85;
      const w0 = W / 2 - (W / 2 - W * 0.32) * k0, w1 = W / 2 - (W / 2 - W * 0.32) * k1;
      const lum = 0.15 + k1 * 0.5;
      poly(ctx, [-w0, y0, -w1, y1 + s * 0.04, w1, y1 + s * 0.04, w0, y0], mix('#3a352e', '#c9b89a', lum), false);
      line(ctx, [-w1, y1 + s * 0.04, w1, y1 + s * 0.04], 'rgba(255,230,190,0.35)', 1);
    }
    for (const k of [-1, 1]) line(ctx, [k * W * 0.5, -s * 0.25, k * W * 0.33, -s * 1.0], '#8a8f94', Math.max(2, s * 0.025));
    rr(ctx, -s * 0.2, -s * 1.2, s * 0.4, s * 0.12, 2, '#1f6a3a');
    ctx.fillStyle = '#e8f4e0';
    ctx.font = `bold ${Math.round(s * 0.075)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SORTIE', 0, -s * 1.14);
  };

  // Drapeau du Clan du Corbeau
  P.drapeau = (ctx, s, o) => {
    begin(s);
    const t = o.t || 0, amber = '#d9a441';
    for (const x of [-s * 0.12, s * 0.12]) ell(ctx, x, -s * 0.06, s * 0.13, s * 0.065, '#2a2a2a');
    ell(ctx, 0, -s * 0.12, s * 0.13, s * 0.065, '#333');
    limb(ctx, 0, -s * 0.1, 0, -s * 0.98, s * 0.025, '#8a8f94');
    ctx.beginPath();
    const x0 = s * 0.01, y0 = -s * 0.96, fw = s * 0.48, fh = s * 0.3;
    ctx.moveTo(x0, y0);
    for (let i = 0; i <= 8; i++) { const k = i / 8; ctx.lineTo(x0 + fw * k, y0 + Math.sin(t * 4 + k * 5) * s * 0.025 * k); }
    for (let i = 8; i >= 0; i--) { const k = i / 8; ctx.lineTo(x0 + fw * k, y0 + fh + Math.sin(t * 4 + k * 5) * s * 0.025 * k); }
    ctx.closePath();
    done(ctx, lg(ctx, x0, y0, x0 + fw, y0 + fh, lite(amber, 0.1), dark(amber, 0.3)));
    // corbeau stylisé
    const cx = x0 + fw * 0.5, cy = y0 + fh * 0.5 + Math.sin(t * 4 + 2.5) * s * 0.012;
    poly(ctx, [cx - s * 0.13, cy - s * 0.02, cx - s * 0.03, cy - s * 0.01, cx, cy - s * 0.07, cx + s * 0.04, cy - s * 0.01, cx + s * 0.13, cy - s * 0.04, cx + s * 0.05, cy + s * 0.04, cx - s * 0.02, cy + s * 0.08, cx - s * 0.05, cy + s * 0.03], '#16120c', false);
  };

  // Portail (révélé plus tard dans l'histoire)
  P.portail = (ctx, s, o) => {
    const t = o.t || 0;
    const rx = s * 0.3, ry = s * 0.46, cy = -s * 0.5;
    const col = o.red ? '255,60,80' : '170,90,255';
    const g = ctx.createRadialGradient(0, cy, 0, 0, cy, s * 0.75);
    g.addColorStop(0, `rgba(${col},0.45)`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(-s * 0.8, cy - s * 0.8, s * 1.6, s * 1.6);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, TAU); ctx.clip();
    const bg = ctx.createRadialGradient(0, cy, 0, 0, cy, ry);
    bg.addColorStop(0, '#f4e6ff'); bg.addColorStop(0.25, `rgba(${col},0.9)`); bg.addColorStop(0.7, '#1a0636'); bg.addColorStop(1, '#0a0218');
    ctx.fillStyle = bg; ctx.fillRect(-rx, cy - ry, rx * 2, ry * 2);
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 4; arm++) {
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const k = i / 24, a = arm / 4 * TAU + t * 1.6 + k * 4.2;
        const x = Math.cos(a) * rx * (1 - k) * 1.05, y = cy + Math.sin(a) * ry * (1 - k) * 1.05;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(235,210,255,${0.35 + 0.1 * arm})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(${col},0.95)`;
    ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, TAU); ctx.stroke();
    const fg = ctx.createRadialGradient(0, -s * 0.02, 0, 0, -s * 0.02, s * 0.5);
    fg.addColorStop(0, `rgba(${col},0.35)`); fg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = fg; ctx.fillRect(-s * 0.5, -s * 0.2, s, s * 0.3);
  };

  // ═════════════ Village du Corbeau ═════════════
  // Tente vue de face : toile, mâts, haubans, rabats noués, enseigne au-dessus de l'entrée
  function tent(ctx, s, o, c) {
    begin(s);
    const W = s * 0.9, Hh = s * (c.big ? 0.66 : 0.6), wall = s * 0.16;
    const cloth = c.cloth, t = o.t || 0;
    // haubans et piquets
    ctx.strokeStyle = 'rgba(40,30,20,0.8)'; ctx.lineWidth = 1;
    for (const k of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(k * W * 0.3, -Hh * 0.82); ctx.lineTo(k * W * 0.6, -s * 0.02); ctx.stroke();
      rr(ctx, k * W * 0.6 - 2, -s * 0.05, 4, s * 0.05, 1, '#4a3622', false);
    }
    // toit (deux pans) + muret de toile
    poly(ctx, [-W / 2, -wall, -W * 0.08, -Hh, W * 0.08, -Hh, W / 2, -wall], lg(ctx, -W / 2, 0, W / 2, 0, lite(cloth, 0.1), dark(cloth, 0.3)));
    poly(ctx, [-W / 2, -wall, 0, -Hh, 0, -wall], lg(ctx, 0, -Hh, 0, -wall, lite(cloth, 0.14), dark(cloth, 0.15)), false);
    rr(ctx, -W / 2, -wall, W, wall, 2, lg(ctx, 0, -wall, 0, 0, dark(cloth, 0.12), dark(cloth, 0.38)));
    // coutures, pièces de réparation
    ctx.strokeStyle = dark(cloth, 0.4); ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-W / 2 + (W / 2) * i / 4, -wall - (Hh - wall) * i / 4); ctx.lineTo(-W / 2 + (W / 2) * i / 4, -wall); ctx.stroke(); }
    if (c.patch) { rr(ctx, W * 0.18, -Hh * 0.55, s * 0.1, s * 0.08, 1, c.patch); rr(ctx, -W * 0.36, -wall - s * 0.06, s * 0.08, s * 0.06, 1, c.patch); }
    // entrée
    const dw = s * 0.24, dh = Hh * 0.72;
    poly(ctx, [-dw / 2, 0, 0, -dh, dw / 2, 0], '#120c07');
    const glowA = 0.25 + Math.sin(t * 3) * 0.05;
    const g = ctx.createRadialGradient(0, -dh * 0.25, 0, 0, -dh * 0.25, dw);
    g.addColorStop(0, `rgba(255,190,110,${glowA})`); g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-dw / 2, 0); ctx.lineTo(0, -dh); ctx.lineTo(dw / 2, 0); ctx.closePath(); ctx.fill();
    for (const k of [-1, 1]) poly(ctx, [k * s * 0.01, -dh, k * dw * 0.75, -s * 0.02, k * dw * 0.42, -s * 0.02], lite(cloth, 0.05));
    // mâts
    limb(ctx, -W * 0.08, -Hh - s * 0.08, -W * 0.08, -Hh + s * 0.04, Math.max(2, s * 0.02), '#5a4330');
    limb(ctx, W * 0.08, -Hh - s * 0.08, W * 0.08, -Hh + s * 0.04, Math.max(2, s * 0.02), '#5a4330');
    if (c.flag) {
      const fx = W * 0.08, fy = -Hh - s * 0.08;
      ctx.beginPath(); ctx.moveTo(fx, fy);
      for (let i = 0; i <= 5; i++) ctx.lineTo(fx + s * 0.16 * i / 5, fy + Math.sin(t * 4 + i) * 1.5);
      for (let i = 5; i >= 0; i--) ctx.lineTo(fx + s * 0.16 * i / 5, fy + s * 0.09 + Math.sin(t * 4 + i) * 1.5);
      ctx.closePath(); done(ctx, c.flag);
    }
    // enseigne
    if (c.sign) sign(ctx, s, c.sign, W, Hh, wall);
  }
  function sign(ctx, s, kind, W, Hh, wall) {
    const sx = -W * 0.38, sy = -wall - s * 0.2, w = s * 0.2, h = s * 0.14;
    limb(ctx, sx + w / 2, sy + h, sx + w / 2, -s * 0.01, Math.max(1.5, s * 0.015), '#4a3622');
    rr(ctx, sx, sy, w, h, 2, lg(ctx, 0, sy, 0, sy + h, '#8a6a46', '#5a4330'));
    const cx = sx + w / 2, cy = sy + h / 2, k = s * 0.045;
    ctx.save();
    ctx.strokeStyle = '#efe0bf'; ctx.fillStyle = '#efe0bf'; ctx.lineWidth = Math.max(1.5, s * 0.014); ctx.lineCap = 'round';
    if (kind === 'repos') {
      // croissant de lune + Z
      ctx.beginPath(); ctx.arc(cx - k * 0.5, cy, k * 0.9, 0.6, TAU - 0.6); ctx.stroke();
      ctx.font = `bold ${Math.round(k * 1.4)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('z', cx + k * 0.9, cy - k * 0.3);
    } else if (kind === 'armes') {
      // deux fusils croisés
      for (const a of [-0.7, 0.7]) { ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * k * 1.4, cy - Math.sin(a) * k * 0.9); ctx.lineTo(cx + Math.cos(a) * k * 1.4, cy + Math.sin(a) * k * 0.9); ctx.stroke(); }
    } else if (kind === 'equip') {
      // casque
      ctx.beginPath(); ctx.arc(cx, cy + k * 0.4, k * 1.0, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.fillRect(cx - k * 1.3, cy + k * 0.35, k * 2.6, k * 0.3);
    } else if (kind === 'soin') {
      ctx.fillStyle = '#d23a2a'; ctx.fillRect(cx - k * 0.3, cy - k, k * 0.6, k * 2); ctx.fillRect(cx - k, cy - k * 0.3, k * 2, k * 0.6);
    } else if (kind === 'cuisine') {
      ctx.beginPath(); ctx.arc(cx, cy + k * 0.1, k * 0.9, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - k * 0.4, cy - k * 0.3); ctx.quadraticCurveTo(cx - k * 0.1, cy - k * 0.8, cx - k * 0.4, cy - k * 1.1); ctx.stroke();
    }
    ctx.restore();
  }
  const TENTS = {
    tente_repos: { cloth: '#6b6a4a', patch: '#8a6a46', sign: 'repos' },
    tente_armes: { cloth: '#5a5a48', patch: '#3a3a30', sign: 'armes' },
    tente_equip: { cloth: '#7a5a3e', patch: '#5a4a6a', sign: 'equip' },
    tente_chef: { cloth: '#4a3e32', patch: '#6a5a40', big: true, flag: '#d9a441' },
    tente_soin: { cloth: '#8a8470', patch: '#a8a090', sign: 'soin' },
    tente_cuisine: { cloth: '#6a4e36', patch: '#8a6a46', sign: 'cuisine' },
    tente: { cloth: '#5e5a44', patch: '#7a6a4a' },
    tente_2: { cloth: '#4e5a4a', patch: '#6a5a3a' },
    tente_3: { cloth: '#6e5444', patch: '#4a5a5a' },
  };
  for (const k in TENTS) P[k] = (ctx, s, o) => tent(ctx, s, o, TENTS[k]);

  // Coffre de bois cerclé de fer
  function trunk(ctx, s, o, open) {
    begin(s);
    const w = s * 0.78, h = s * 0.4, wood = '#6e4a2a';
    if (open) {
      ctx.save(); ctx.translate(0, -h);
      poly(ctx, [-w / 2, 0, -w / 2 + s * 0.02, -s * 0.3, w / 2 - s * 0.02, -s * 0.3, w / 2, 0], lg(ctx, 0, -s * 0.3, 0, 0, dark(wood, 0.1), dark(wood, 0.4)));
      ctx.restore();
      rr(ctx, -w / 2 + s * 0.04, -h - s * 0.04, w - s * 0.08, s * 0.08, 2, '#140c06', false);
      glowDot(ctx, 0, -h, s * 0.06, '255,200,120', 0.5);
    }
    rr(ctx, -w / 2, -h, w, h, 3, lg(ctx, 0, -h, 0, 0, lite(wood, 0.12), dark(wood, 0.35)));
    for (let i = 1; i < 3; i++) line(ctx, [-w / 2 + 2, -h + (h * i) / 3, w / 2 - 2, -h + (h * i) / 3], dark(wood, 0.45), 1);
    if (!open) {
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h);
      ctx.quadraticCurveTo(0, -h - s * 0.24, w / 2, -h);
      ctx.closePath();
      done(ctx, lg(ctx, 0, -h - s * 0.2, 0, -h, lite(wood, 0.22), wood));
    }
    const band = lg(ctx, 0, -h - s * 0.2, 0, 0, '#9aa0a6', '#4a4f55');
    for (const bx of [-w * 0.32, w * 0.27]) rr(ctx, bx, open ? -h : -h - s * 0.15, s * 0.05, open ? h : h + s * 0.15, 1, band);
    if (!open) { rr(ctx, -s * 0.05, -h - s * 0.03, s * 0.1, s * 0.11, 2, '#c9a54a'); ell(ctx, 0, -h + s * 0.03, s * 0.015, s * 0.022, '#2a1a0a', false); }
  }
  P.coffre = (ctx, s, o) => trunk(ctx, s, o, false);
  P.coffre_ouvert = (ctx, s, o) => trunk(ctx, s, o, true);

  // Corbeau charognard : vole sur place, ailes battantes
  P.corbeau = (ctx, s, o) => {
    begin(s);
    let dir = o.dir || 'right';
    if (dir === 'up' || dir === 'down') dir = o.faceX || 'right';
    if (dir === 'left') ctx.scale(-1, 1);
    const t = o.t || 0, flap = Math.sin(t * (o.ph !== undefined ? 16 : 10)), hover = -s * 0.5 + Math.sin(t * 3) * s * 0.05;
    ctx.translate(0, hover);
    const black = '#17151a', sheen = '#3a3550';
    // aile arrière
    const wing = (k, back) => {
      const up = flap * s * 0.32 * k;
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, -s * 0.02);
      ctx.quadraticCurveTo(-s * 0.18, -s * 0.12 - up, -s * 0.4, -s * 0.06 - up * 1.3);
      ctx.lineTo(-s * 0.32, -s * 0.02 - up * 0.9);
      ctx.lineTo(-s * 0.36, s * 0.02 - up * 0.7);
      ctx.lineTo(-s * 0.24, s * 0.02 - up * 0.45);
      ctx.quadraticCurveTo(-s * 0.1, s * 0.05, s * 0.06, s * 0.02);
      ctx.closePath();
      done(ctx, back ? dark(black, 0.2) : lg(ctx, 0, -s * 0.2, 0, s * 0.05, sheen, black));
    };
    wing(0.8, true);
    // queue
    poly(ctx, [-s * 0.14, 0, -s * 0.3, -s * 0.03, -s * 0.32, s * 0.05, -s * 0.15, s * 0.04], black);
    // corps
    ell(ctx, 0, 0, s * 0.17, s * 0.09, lg(ctx, 0, -s * 0.09, 0, s * 0.09, sheen, black), true, -0.1);
    // tête et bec
    ell(ctx, s * 0.15, -s * 0.06, s * 0.075, s * 0.07, black);
    poly(ctx, [s * 0.2, -s * 0.08, s * 0.33, -s * 0.045, s * 0.2, -s * 0.03], '#3c3a36');
    glowDot(ctx, s * 0.17, -s * 0.075, s * 0.018, '255,60,40', 0.9);
    ell(ctx, s * 0.17, -s * 0.075, s * 0.016, s * 0.016, '#ff5a3c', false);
    wing(1, false);
    // pattes
    line(ctx, [s * 0.02, s * 0.08, s * 0.04, s * 0.14], '#3c3a36', 1.5);
    line(ctx, [-s * 0.03, s * 0.08, -s * 0.02, s * 0.14], '#3c3a36', 1.5);
  };

  // Feu de camp
  P.feu_camp = (ctx, s, o) => {
    begin(s);
    const t = o.t || 0;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ell(ctx, Math.cos(a) * s * 0.28, -s * 0.06 + Math.sin(a) * s * 0.1, s * 0.07, s * 0.05, i % 2 ? '#6a655c' : '#57524a');
    }
    limb(ctx, -s * 0.22, -s * 0.04, s * 0.18, -s * 0.12, s * 0.06, '#4a3622');
    limb(ctx, s * 0.22, -s * 0.04, -s * 0.16, -s * 0.13, s * 0.06, '#5a4330');
    ell(ctx, 0, -s * 0.09, s * 0.16, s * 0.05, '#ff8a3a', false);
    flames(ctx, s, 0, -s * 0.1, t, 1.1);
  };

  // Torche plantée
  P.torche = (ctx, s, o) => {
    begin(s);
    limb(ctx, 0, 0, 0, -s * 0.62, Math.max(2, s * 0.04), '#5a4330');
    rr(ctx, -s * 0.05, -s * 0.72, s * 0.1, s * 0.12, 2, '#3a2a1c');
    flames(ctx, s * 0.55, 0, -s * 0.72, (o.t || 0) * 1.1 + 2, 1);
  };

  // Puits de pierre
  P.puits = (ctx, s, o) => {
    begin(s);
    const w = s * 0.56;
    for (const k of [-1, 1]) limb(ctx, k * w * 0.42, -s * 0.2, k * w * 0.42, -s * 0.78, Math.max(2, s * 0.03), '#5a4330');
    poly(ctx, [-w * 0.62, -s * 0.74, 0, -s * 0.98, w * 0.62, -s * 0.74, w * 0.5, -s * 0.7, 0, -s * 0.9, -w * 0.5, -s * 0.7], lg(ctx, 0, -s, 0, -s * 0.7, '#7a5a3a', '#4a3622'));
    line(ctx, [0, -s * 0.72, 0, -s * 0.45], '#8a7a5a', 1);
    rr(ctx, -s * 0.05, -s * 0.47, s * 0.1, s * 0.08, 2, '#5a4a3a');
    rr(ctx, -w / 2, -s * 0.3, w, s * 0.3, 4, lg(ctx, 0, -s * 0.3, 0, 0, '#7a756c', '#45413b'));
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
      const bx = -w / 2 + ((i + (r % 2) * 0.5) / 4) * w;
      line(ctx, [bx, -s * 0.3 + r * s * 0.1, bx, -s * 0.2 + r * s * 0.1], 'rgba(0,0,0,0.35)', 1);
    }
    for (let r = 1; r < 3; r++) line(ctx, [-w / 2, -s * 0.3 + r * s * 0.1, w / 2, -s * 0.3 + r * s * 0.1], 'rgba(0,0,0,0.35)', 1);
    ell(ctx, 0, -s * 0.3, w / 2, s * 0.07, '#8a857a');
    ell(ctx, 0, -s * 0.3, w * 0.38, s * 0.045, '#0d1416', false);
  };

  // Habitants du village
  Object.assign(H, {
    pnj_chef: {
      skin: '#c99a76', coat: '#3a3530', coat2: '#2f2b27', shirt: '#5a4a36', pants: '#2e2b26', boots: '#1a1612',
      hair: '#8a8478', beard: '#9a948a', belt: '#3a2b1c', metal: '#c9a54a', eye: '#2a241e', torso: 'jacket',
      hairStyle: 'short', scarf: '#d9a441', armband: '#d9a441', bulk: 1.12, nose: true,
    },
    pnj_hugo: {
      skin: '#d8a882', coat: '#e0d6c0', coat2: '#8a6a4a', shirt: '#6a5a46', pants: '#3a3630', boots: '#221b15',
      hair: '#3a2a1e', beard: '#4a3426', belt: '#5a4330', metal: '#a3a8ae', eye: '#2a241e', torso: 'vest',
      hairStyle: 'bald', bulk: 1.3, nose: true,
    },
    pnj_gaspard: {
      skin: '#d2a888', coat: '#5a5244', coat2: '#4a4438', shirt: '#3a352e', pants: '#3a3630', boots: '#221b15',
      hair: '#d8d2c6', beard: '#e2ddd2', belt: '#3a2b1c', metal: '#a3a8ae', eye: '#2a241e', torso: 'jacket',
      hairStyle: 'short', hunch: 0.8, nose: true,
    },
    pnj_lina: {
      skin: '#e2b896', coat: '#8a3a2a', coat2: '#7a3424', shirt: '#d8c8a8', pants: '#3a4a5a', boots: '#2a2018',
      hair: '#5a3a22', belt: '#3a2b1c', metal: '#a3a8ae', eye: '#2a241e', torso: 'vest', hairStyle: 'ponytail',
      trim: '#d9a441', head: 1.22, legs: 0.85,
    },
    pnj_bastien: {
      skin: '#c48d68', coat: '#5a4a3a', coat2: '#3a3430', shirt: '#2a2824', pants: '#33302a', boots: '#1e1a14',
      hair: '#2a2420', beard: '#2a2420', belt: '#3a2b1c', metal: '#a3a8ae', eye: '#2a241e', torso: 'vest',
      hairStyle: 'short', goggles: true, bulk: 1.18,
    },
    pnj_rosa: {
      skin: '#b98060', coat: '#6a4a5a', coat2: '#5a3e4c', shirt: '#d8c8a8', pants: '#3e3a33', boots: '#211b16',
      hair: '#2a1a14', belt: '#3a2b1c', metal: '#a3a8ae', trim: '#d9a441', eye: '#2a241e', torso: 'jacket',
      hairStyle: 'ponytail', scarf: '#c9a54a',
    },
  });
  for (const k of ['pnj_chef', 'pnj_hugo', 'pnj_gaspard', 'pnj_lina', 'pnj_bastien', 'pnj_rosa']) P[k] = (ctx, s, o) => humanoid(ctx, s, o, H[k]);

  P._default = (ctx, s) => {
    begin(s);
    poly(ctx, [0, -s * 0.9, s * 0.3, -s * 0.5, 0, -s * 0.1, -s * 0.3, -s * 0.5], '#d9a441');
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(s * 0.35)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, -s * 0.5);
  };

  // Largeur de l'ombre portée au sol (fraction de la taille)
  P.groundW = {
    heros: 0.2, pnj_mira: 0.2, pillard: 0.2, pillard_tireur: 0.2, tireur_elite: 0.2, kross: 0.26, forme_loup: 0.26,
    chien: 0.3, forme_tigre: 0.26, caisse: 0.44, caisse_ouverte: 0.44, caisse_medocs: 0.44, baril: 0.26, epave: 0.52, barricade: 0.5,
    abri: 0.5, pilier: 0.22, drapeau: 0.2, _default: 0.25,
    tente_repos: 0.44, tente_armes: 0.44, tente_equip: 0.44, tente_chef: 0.44, tente_soin: 0.44, tente_cuisine: 0.44,
    tente: 0.44, tente_2: 0.44, tente_3: 0.44, coffre: 0.42, coffre_ouvert: 0.42, corbeau: 0.16, feu_camp: 0.34,
    torche: 0.1, puits: 0.32, pnj_chef: 0.2, pnj_hugo: 0.22, pnj_gaspard: 0.2, pnj_lina: 0.2, pnj_bastien: 0.2, pnj_rosa: 0.2,
  };

  // ═════════════ Tuiles ═════════════
  const TL = {};
  const isSolid = t => t === 'mur' || t === 'vide';
  const speck = (ctx, x, y, S, tx, ty, seed, n, light, darkC) => {
    for (let i = 0; i < n; i++) {
      const a = U.hash(tx, ty, seed + i);
      ctx.fillStyle = a > 0.6 ? light : darkC;
      ctx.fillRect(x + U.hash(tx, ty, seed + 40 + i) * (S - 2), y + U.hash(tx, ty, seed + 80 + i) * (S - 2), 1 + a * 1.5, 1 + a);
    }
  };
  function crack(ctx, x, y, S, tx, ty, seed, color) {
    let px = x + S * (0.15 + U.hash(tx, ty, seed) * 0.5), py = y + S * (0.15 + U.hash(tx, ty, seed + 1) * 0.5);
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let i = 0; i < 4; i++) {
      px += (U.hash(tx, ty, seed + 2 + i) - 0.3) * S * 0.25;
      py += (U.hash(tx, ty, seed + 8 + i) - 0.4) * S * 0.25;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    return [px, py];
  }

  // Bitume fissuré
  const ASPHALT = ['#2b2825', '#2e2a27', '#292623', '#302c28'];
  TL.sol = (ctx, x, y, S, tx, ty) => {
    ctx.fillStyle = ASPHALT[Math.floor(U.hash(tx, ty, 3) * ASPHALT.length)];
    ctx.fillRect(x, y, S, S);
    speck(ctx, x, y, S, tx, ty, 10, 14, 'rgba(200,185,160,0.09)', 'rgba(0,0,0,0.28)');
    if (U.hash(tx, ty, 5) > 0.72) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + U.hash(tx, ty, 6) * S * 0.4, y + U.hash(tx, ty, 7) * S * 0.4, S * 0.5, S * 0.45);
    }
    if (U.hash(tx, ty, 40) > 0.55) {
      const [ex, ey] = crack(ctx, x, y, S, tx, ty, 41, 'rgba(0,0,0,0.55)');
      if (U.hash(tx, ty, 49) > 0.5) {
        ctx.strokeStyle = 'rgba(120,130,60,0.55)';
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 2, ey - 4); ctx.moveTo(ex + 1, ey); ctx.lineTo(ex + 3, ey - 3); ctx.stroke();
      }
    }
    if (U.hash(tx, ty, 60) > 0.985) {
      const cx = x + S / 2, cy = y + S / 2;
      ctx.fillStyle = '#1c1a18'; ctx.beginPath(); ctx.arc(cx, cy, S * 0.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(160,150,130,0.25)'; ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * S * 0.1, cy - S * 0.26); ctx.lineTo(cx + i * S * 0.1, cy + S * 0.26); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.3, 0, TAU); ctx.stroke();
    } else if (ty % 7 === 3 && tx % 3 === 0 && U.hash(tx, ty, 61) > 0.4) {
      ctx.fillStyle = 'rgba(210,190,120,0.16)';
      ctx.fillRect(x + S * 0.15, y + S * 0.45, S * 0.7, S * 0.1);
    }
  };
  // Terre et gravats
  const DIRT = ['#3a3027', '#3d322a', '#362d25'];
  TL.sol2 = (ctx, x, y, S, tx, ty) => {
    ctx.fillStyle = DIRT[Math.floor(U.hash(tx, ty, 3) * DIRT.length)];
    ctx.fillRect(x, y, S, S);
    speck(ctx, x, y, S, tx, ty, 10, 16, 'rgba(210,180,140,0.1)', 'rgba(0,0,0,0.3)');
    for (let i = 0; i < 5; i++) {
      const px = x + 3 + U.hash(tx, ty, 50 + i) * (S - 8), py = y + 3 + U.hash(tx, ty, 60 + i) * (S - 8);
      const r = 1.5 + U.hash(tx, ty, 70 + i) * 3;
      ctx.fillStyle = U.hash(tx, ty, 75 + i) > 0.5 ? '#6a3a2a' : '#5e5a52';
      ctx.fillRect(px, py, r * 1.6, r);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, py + r, r * 1.6, 1);
    }
    for (let i = 0; i < 4; i++) {
      const px = x + 4 + U.hash(tx, ty, 80 + i) * (S - 8), py = y + 6 + U.hash(tx, ty, 90 + i) * (S - 8);
      ctx.strokeStyle = i % 2 ? 'rgba(130,140,70,0.6)' : 'rgba(160,145,80,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 1, py - 5); ctx.moveTo(px + 1, py); ctx.lineTo(px + 3, py - 4); ctx.moveTo(px, py); ctx.lineTo(px - 3, py - 3); ctx.stroke();
    }
  };
  // Carrelage de métro sale
  TL.carrelage = (ctx, x, y, S, tx, ty) => {
    ctx.fillStyle = '#34302a';
    ctx.fillRect(x, y, S, S);
    const n = 3, ts = S / n;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const h = U.hash(tx * 3 + i, ty * 3 + j, 4);
        if (h > 0.96) { ctx.fillStyle = '#1e1b17'; ctx.fillRect(x + i * ts + 1, y + j * ts + 1, ts - 1, ts - 1); continue; }
        const base = mix('#6f6a5f', '#5a554b', h);
        ctx.fillStyle = base;
        ctx.fillRect(x + i * ts + 1, y + j * ts + 1, ts - 1.5, ts - 1.5);
        ctx.fillStyle = 'rgba(255,245,220,0.07)';
        ctx.fillRect(x + i * ts + 1, y + j * ts + 1, ts - 1.5, 1);
      }
    }
    const grime = rg(ctx, x + S * U.hash(tx, ty, 8), y + S * U.hash(tx, ty, 9), 0, S * 0.8, 'rgba(30,24,16,0.45)', 'rgba(30,24,16,0)');
    ctx.fillStyle = grime; ctx.fillRect(x, y, S, S);
    if (U.hash(tx, ty, 40) > 0.7) crack(ctx, x, y, S, tx, ty, 41, 'rgba(0,0,0,0.5)');
  };
  // Ruines : béton éventré vu du dessus, façade de briques (ou faïence) côté sol
  TL.mur = (ctx, x, y, S, tx, ty, map) => {
    const at = (dx, dy) => (map ? map.tileAt(tx + dx, ty + dy) : 'mur');
    const below = at(0, 1);
    ctx.fillStyle = '#12100e';
    ctx.fillRect(x, y, S, S);
    for (let i = 0; i < 5; i++) {
      const a = U.hash(tx, ty, 100 + i);
      if (a < 0.25) continue;
      const px = x + U.hash(tx, ty, 110 + i) * S * 0.8, py = y + U.hash(tx, ty, 120 + i) * S * 0.8, w = 6 + a * 10;
      ctx.fillStyle = `rgba(150,135,115,${0.05 + a * 0.06})`;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + w, py + 2); ctx.lineTo(px + w * 0.7, py + w * 0.7); ctx.lineTo(px - 2, py + w * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(220,200,170,0.08)';
      ctx.fillRect(px, py, w * 0.8, 1);
    }
    if (U.hash(tx, ty, 125) > 0.65) {
      ctx.strokeStyle = 'rgba(140,70,40,0.55)'; ctx.lineWidth = 1;
      const cx0 = x + U.hash(tx, ty, 126) * S, cy0 = y + U.hash(tx, ty, 127) * S;
      ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + 9, cy0 - 3); ctx.moveTo(cx0 + 2, cy0 + 4); ctx.lineTo(cx0 + 11, cy0 + 2); ctx.stroke();
    }
    const rim = 'rgba(230,200,160,0.18)';
    if (at(-1, 0) !== 'mur' && at(-1, 0) !== undefined) { ctx.fillStyle = rim; ctx.fillRect(x, y, 1.5, S); }
    if (at(1, 0) !== 'mur') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + S - 2, y, 2, S); ctx.fillStyle = rim; ctx.fillRect(x + S - 3, y, 1, S); }
    if (at(0, -1) !== 'mur') { ctx.fillStyle = rim; ctx.fillRect(x, y, S, 1.5); }
    if (below && below !== 'mur') {
      const fh = S * 0.6, fy = y + S - fh;
      if (below === 'carrelage') {
        // faïence blanche biseautée du métro
        ctx.fillStyle = lg(ctx, 0, fy, 0, y + S, '#8c877b', '#4e4a42');
        ctx.fillRect(x, fy, S, fh);
        const rows = 4, rh = fh / rows;
        for (let r = 0; r < rows; r++) {
          const off = (r % 2) * S * 0.25, ry = fy + r * rh;
          ctx.fillStyle = 'rgba(30,26,20,0.5)';
          ctx.fillRect(x, ry + rh - 1, S, 1);
          for (let b = 0; b < 3; b++) { const bx = x + off + b * S * 0.5; if (bx > x && bx < x + S) ctx.fillRect(bx, ry, 1, rh); }
          ctx.fillStyle = 'rgba(255,250,235,0.12)';
          ctx.fillRect(x, ry + 1, S, 1);
        }
        if ((tx + ty) % 5 === 0) { ctx.fillStyle = '#7a2e22'; ctx.fillRect(x, fy + rh * 1.4, S, rh * 0.5); }
        if (U.hash(tx, ty, 140) > 0.55) {
          ctx.fillStyle = 'rgba(40,30,20,0.35)';
          ctx.fillRect(x + U.hash(tx, ty, 141) * S * 0.8, fy + 2, 2, fh * (0.4 + U.hash(tx, ty, 142) * 0.5));
        }
      } else {
        // briques
        ctx.fillStyle = lg(ctx, 0, fy, 0, y + S, '#5e3727', '#2c1912');
        ctx.fillRect(x, fy, S, fh);
        const rows = 5, rh = fh / rows;
        for (let r = 0; r < rows; r++) {
          const off = ((r + tx) % 2) * S * 0.17, ry = fy + r * rh;
          ctx.fillStyle = 'rgba(20,12,8,0.55)';
          ctx.fillRect(x, ry + rh - 1, S, 1);
          for (let b = -1; b < 3; b++) { const bx = x + off + b * S * 0.34; if (bx > x && bx < x + S) ctx.fillRect(bx, ry, 1, rh); }
          if (U.hash(tx, ty + r, 133) > 0.75) { ctx.fillStyle = 'rgba(160,90,60,0.25)'; ctx.fillRect(x + off + U.hash(tx, r, 134) * S * 0.6, ry + 1, S * 0.3, rh - 2); }
        }
        const v = U.hash(tx, ty, 145);
        if (v > 0.78) {
          // fenêtre éventrée
          const wx = x + S * 0.3, wy = fy + fh * 0.15, ww = S * 0.4, wh = fh * 0.5;
          ctx.fillStyle = '#0b0908'; ctx.fillRect(wx, wy, ww, wh);
          ctx.fillStyle = 'rgba(190,210,220,0.35)';
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + ww * 0.35, wy); ctx.lineTo(wx, wy + wh * 0.4); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#4a3a2a'; ctx.fillRect(wx - 1, wy + wh, ww + 2, 2);
        } else if (v < 0.12) {
          // graffiti
          const cols = ['#d9a441', '#6fb35f', '#c9473a', '#d8d2c0'];
          ctx.strokeStyle = cols[Math.floor(U.hash(tx, ty, 146) * cols.length)]; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
          ctx.beginPath();
          let gx = x + S * 0.15, gy = fy + fh * 0.5;
          ctx.moveTo(gx, gy);
          for (let i = 0; i < 6; i++) { gx += S * 0.12; gy = fy + fh * (0.3 + U.hash(tx, ty, 147 + i) * 0.4); ctx.lineTo(gx, gy); }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, fy, S, fh * 0.25);
      }
      ctx.fillStyle = 'rgba(230,205,170,0.25)';
      ctx.fillRect(x, fy, S, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x, y + S - 2, S, 2);
      // béton cassé qui déborde
      for (let i = 0; i < 3; i++) {
        if (U.hash(tx, ty, 150 + i) < 0.5) continue;
        const px = x + U.hash(tx, ty, 155 + i) * S, w = 3 + U.hash(tx, ty, 158 + i) * 5;
        ctx.fillStyle = '#4a4540';
        ctx.beginPath(); ctx.moveTo(px, fy - 1); ctx.lineTo(px + w, fy - 1); ctx.lineTo(px + w * 0.6, fy + w * 0.8); ctx.closePath(); ctx.fill();
      }
    }
  };
  // Cratère / effondrement
  TL.vide = (ctx, x, y, S, tx, ty, map) => {
    const at = (dx, dy) => (map ? map.tileAt(tx + dx, ty + dy) : 'vide');
    ctx.fillStyle = '#080605';
    ctx.fillRect(x, y, S, S);
    if (at(0, -1) !== 'vide') {
      ctx.fillStyle = lg(ctx, 0, y, 0, y + S * 0.9, '#4a3f35', 'rgba(8,6,5,0)');
      ctx.fillRect(x, y, S, S * 0.9);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 3; i++) ctx.fillRect(x, y + S * (0.18 + i * 0.16), S, 1);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + U.hash(tx, ty, 150 + i) * S, y, 1, S * (0.2 + U.hash(tx, ty, 160 + i) * 0.4));
      }
      ctx.fillStyle = 'rgba(230,205,170,0.2)';
      ctx.fillRect(x, y, S, 1.5);
      for (let i = 0; i < 3; i++) {
        const px = x + U.hash(tx, ty, 165 + i) * S;
        ctx.fillStyle = '#3a342e'; ctx.fillRect(px, y - 1, 4 + U.hash(tx, ty, 168 + i) * 5, 3);
      }
    }
    if (at(-1, 0) !== 'vide') { ctx.fillStyle = lg(ctx, x, 0, x + S * 0.3, 0, 'rgba(56,46,38,0.8)', 'rgba(8,6,5,0)'); ctx.fillRect(x, y, S * 0.3, S); }
    if (at(1, 0) !== 'vide') { ctx.fillStyle = lg(ctx, x + S, 0, x + S * 0.7, 0, 'rgba(56,46,38,0.8)', 'rgba(8,6,5,0)'); ctx.fillRect(x + S * 0.7, y, S * 0.3, S); }
    for (let i = 0; i < 3; i++) {
      if (U.hash(tx, ty, 170 + i) > 0.6) {
        ctx.fillStyle = `rgba(255,120,40,${0.15 + U.hash(tx, ty, 180 + i) * 0.35})`;
        ctx.fillRect(x + U.hash(tx, ty, 190 + i) * S, y + S * 0.3 + U.hash(tx, ty, 200 + i) * S * 0.7, 1.5, 1.5);
      }
    }
  };

  // ═════════════ Forêt ═════════════
  const GRASS = ['#3b4728', '#3f4b2b', '#384426', '#424e2c'];
  function grassBase(ctx, x, y, S, tx, ty) {
    ctx.fillStyle = GRASS[Math.floor(U.hash(tx, ty, 3) * GRASS.length)];
    ctx.fillRect(x, y, S, S);
    // taches plus sèches / plus sombres (raccord par case voisine)
    const p = U.hash(tx >> 1, ty >> 1, 4);
    if (p > 0.6) { ctx.fillStyle = `rgba(150,140,70,${(p - 0.6) * 0.35})`; ctx.fillRect(x, y, S, S); }
    else if (p < 0.25) { ctx.fillStyle = `rgba(10,20,8,${(0.25 - p) * 0.6})`; ctx.fillRect(x, y, S, S); }
    speck(ctx, x, y, S, tx, ty, 10, 12, 'rgba(190,200,120,0.12)', 'rgba(0,0,0,0.22)');
  }
  function blades(ctx, x, y, S, tx, ty, n, seed) {
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const px = x + 3 + U.hash(tx, ty, seed + i) * (S - 6), py = y + 6 + U.hash(tx, ty, seed + 20 + i) * (S - 8);
      const h = 3 + U.hash(tx, ty, seed + 40 + i) * 4, lean = (U.hash(tx, ty, seed + 60 + i) - 0.5) * 3;
      ctx.strokeStyle = i % 3 ? 'rgba(120,145,70,0.7)' : 'rgba(165,170,90,0.6)';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + lean, py - h); ctx.moveTo(px + 1, py); ctx.lineTo(px + 1 + lean * 1.5, py - h * 0.8); ctx.stroke();
    }
  }
  TL.herbe = (ctx, x, y, S, tx, ty) => {
    grassBase(ctx, x, y, S, tx, ty);
    blades(ctx, x, y, S, tx, ty, 6, 100);
  };
  // Chemin de terre : bords mangés par l'herbe voisine
  TL.chemin = (ctx, x, y, S, tx, ty, map) => {
    const at = (dx, dy) => (map ? map.tileAt(tx + dx, ty + dy) : 'chemin');
    grassBase(ctx, x, y, S, tx, ty);
    const soft = t => t === 'herbe' || t === 'arbre' || t === 'palissade' || t === 'eau';
    const m = S * 0.16;
    const l = soft(at(-1, 0)) ? m : 0, r = soft(at(1, 0)) ? m : 0, t = soft(at(0, -1)) ? m : 0, b = soft(at(0, 1)) ? m : 0;
    ctx.fillStyle = lg(ctx, x, y, x + S, y + S, '#5d4a33', '#4c3c29');
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + l, y + t, S - l - r, S - t - b, Math.max(l, r, t, b) ? 6 : 0); else ctx.rect(x + l, y + t, S - l - r, S - t - b);
    ctx.fill();
    speck(ctx, x + l, y + t, S - l - r, tx, ty, 30, 10, 'rgba(210,180,130,0.14)', 'rgba(0,0,0,0.25)');
    // ornières
    const vert = soft(at(-1, 0)) && soft(at(1, 0));
    ctx.strokeStyle = 'rgba(30,22,14,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (vert) { ctx.moveTo(x + S * 0.38, y); ctx.lineTo(x + S * 0.38, y + S); ctx.moveTo(x + S * 0.62, y); ctx.lineTo(x + S * 0.62, y + S); }
    else { ctx.moveTo(x, y + S * 0.4); ctx.lineTo(x + S, y + S * 0.4); ctx.moveTo(x, y + S * 0.64); ctx.lineTo(x + S, y + S * 0.64); }
    ctx.stroke();
    if (l || r || t || b) blades(ctx, x, y, S, tx, ty, 3, 140);
  };
  // Arbres : pins, feuillus (parfois roussis) ou arbres morts. Le feuillage déborde vers le haut.
  const LEAF = ['#2f4a26', '#365329', '#3f5a2b', '#4a5a2a', '#344f2c'];
  const SICK = ['#6d5a26', '#7a4e22', '#5a5226'];
  TL.arbre = (ctx, x, y, S, tx, ty, map) => {
    const at = (dx, dy) => (map ? map.tileAt(tx + dx, ty + dy) : 'arbre');
    ctx.fillStyle = '#26301c';
    ctx.fillRect(x, y, S, S);
    speck(ctx, x, y, S, tx, ty, 200, 10, 'rgba(120,100,60,0.18)', 'rgba(0,0,0,0.3)');
    const kind = U.hash(tx, ty, 210), cx = x + S * (0.42 + U.hash(tx, ty, 211) * 0.16), base = y + S * 0.92;
    const open = at(0, 1) !== 'arbre';
    // ombre portée
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx + S * 0.08, base - S * 0.04, S * 0.42, S * 0.14, 0, 0, TAU); ctx.fill();
    if (open || kind > 0.9) {
      const tw = S * 0.11, th = S * 0.42;
      ctx.fillStyle = lg(ctx, cx - tw, 0, cx + tw, 0, '#5a4330', '#2e2218');
      ctx.fillRect(cx - tw / 2, base - th, tw, th);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(cx + tw * 0.1, base - th, tw * 0.4, th);
    }
    if (kind > 0.9) {
      // arbre mort
      ctx.strokeStyle = '#4a3d31'; ctx.lineCap = 'round';
      for (const [a, len, w] of [[-1.9, 0.5, 3], [-1.2, 0.45, 2.5], [-2.5, 0.35, 2], [-0.9, 0.3, 1.5]]) {
        ctx.lineWidth = w;
        const sx = cx, sy = base - S * 0.35;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * S * len, sy + Math.sin(a) * S * len); ctx.stroke();
      }
      return;
    }
    const pine = kind < 0.55;
    const col = U.hash(tx, ty, 212) > 0.88 ? SICK[Math.floor(U.hash(tx, ty, 213) * SICK.length)] : LEAF[Math.floor(U.hash(tx, ty, 213) * LEAF.length)];
    if (pine) {
      const top = y - S * 0.62, w = S * 0.5;
      for (let i = 0; i < 3; i++) {
        const y0 = top + i * S * 0.38, y1 = y0 + S * 0.62, ww = w * (0.55 + i * 0.25);
        ctx.fillStyle = lg(ctx, cx - ww, 0, cx + ww, 0, lite(col, 0.12), dark(col, 0.35));
        ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx + ww, y1); ctx.lineTo(cx - ww, y1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = dark(col, 0.55); ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx + ww, y1); ctx.lineTo(cx + ww * 0.2, y1); ctx.closePath(); ctx.fill();
      }
    } else {
      const cy = y + S * 0.12, r = S * 0.4;
      const blobs = [[0, -0.35, 0.95], [-0.45, 0.05, 0.75], [0.45, 0.05, 0.78], [0, 0.2, 0.85]];
      ctx.fillStyle = dark(col, 0.45);
      for (const [dx, dy, k] of blobs) { ctx.beginPath(); ctx.arc(cx + dx * r, cy + dy * r + 2, r * k, 0, TAU); ctx.fill(); }
      for (const [dx, dy, k] of blobs) {
        ctx.fillStyle = rg(ctx, cx + dx * r - r * 0.3, cy + dy * r - r * 0.35, r * 0.1, r * k * 1.2, lite(col, 0.18), dark(col, 0.2));
        ctx.beginPath(); ctx.arc(cx + dx * r, cy + dy * r, r * k * 0.94, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 6; i++) {
        const a = U.hash(tx, ty, 220 + i) * TAU, d = U.hash(tx, ty, 230 + i) * r * 0.8;
        ctx.fillStyle = 'rgba(210,220,140,0.16)';
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d - r * 0.15, cy - r * 0.2 + Math.sin(a) * d * 0.6, 2.2, 0, TAU); ctx.fill();
      }
    }
  };
  // Eau stagnante : berges éclairées, reflets
  TL.eau = (ctx, x, y, S, tx, ty, map) => {
    const at = (dx, dy) => (map ? map.tileAt(tx + dx, ty + dy) : 'eau');
    ctx.fillStyle = lg(ctx, x, y, x, y + S, '#1f3438', '#172a2e');
    ctx.fillRect(x, y, S, S);
    for (let i = 0; i < 3; i++) {
      const px = x + U.hash(tx, ty, 240 + i) * S * 0.7, py = y + 6 + U.hash(tx, ty, 250 + i) * (S - 10);
      ctx.strokeStyle = 'rgba(170,210,200,0.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + S * 0.25, py); ctx.stroke();
    }
    if (at(0, -1) !== 'eau') {
      ctx.fillStyle = lg(ctx, 0, y, 0, y + S * 0.35, '#4a3c2a', 'rgba(74,60,42,0)');
      ctx.fillRect(x, y, S, S * 0.35);
      ctx.fillStyle = 'rgba(200,230,220,0.25)'; ctx.fillRect(x, y + S * 0.3, S, 1);
    }
    if (at(0, 1) !== 'eau') { ctx.fillStyle = 'rgba(200,230,220,0.18)'; ctx.fillRect(x, y + S - 3, S, 1.5); }
    if (at(-1, 0) !== 'eau') { ctx.fillStyle = 'rgba(200,230,220,0.14)'; ctx.fillRect(x + 1, y, 1.5, S); }
    if (at(1, 0) !== 'eau') { ctx.fillStyle = 'rgba(200,230,220,0.14)'; ctx.fillRect(x + S - 2.5, y, 1.5, S); }
    if (U.hash(tx, ty, 260) > 0.85) {
      // nénuphar
      const px = x + S * (0.3 + U.hash(tx, ty, 261) * 0.4), py = y + S * (0.4 + U.hash(tx, ty, 262) * 0.3);
      ctx.fillStyle = '#3d5a2c'; ctx.beginPath(); ctx.arc(px, py, S * 0.09, 0.4, TAU - 0.1); ctx.lineTo(px, py); ctx.fill();
    }
  };
  // Palissade de pieux taillés
  TL.palissade = (ctx, x, y, S, tx, ty, map) => {
    const at = (dx, dy) => (map ? map.tileAt(tx + dx, ty + dy) : 'palissade');
    grassBase(ctx, x, y, S, tx, ty);
    const horiz = at(-1, 0) === 'palissade' || at(1, 0) === 'palissade';
    const stakes = horiz ? [0.17, 0.5, 0.83] : [0.38, 0.62];
    const by = y + S * 0.86;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, by - 2, S, S * 0.16);
    for (const k of stakes) {
      const sx = x + S * k, w = S * (horiz ? 0.3 : 0.26), h = S * (0.95 + U.hash(tx * 3 + k * 10, ty, 270) * 0.25);
      ctx.fillStyle = lg(ctx, sx - w / 2, 0, sx + w / 2, 0, '#8a6a46', '#4a3622');
      ctx.beginPath(); ctx.moveTo(sx - w / 2, by); ctx.lineTo(sx - w / 2, by - h + w * 0.6); ctx.lineTo(sx, by - h); ctx.lineTo(sx + w / 2, by - h + w * 0.6); ctx.lineTo(sx + w / 2, by); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#21170d'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,230,180,0.14)'; ctx.fillRect(sx - w / 2 + 1, by - h + w * 0.6, 1.5, h - w * 0.6);
    }
    ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, by - S * 0.55); ctx.lineTo(x + S, by - S * 0.55); ctx.moveTo(x, by - S * 0.25); ctx.lineTo(x + S, by - S * 0.25); ctx.stroke();
  };

  P.TALL = { arbre: true, palissade: true };

  // Ombres de contact (par case) : pied des murs, sous les arbres, le long des palissades
  const SOLIDS = { mur: 1, vide: 1, arbre: 1, eau: 1, palissade: 1 };
  P.aoTile = function (ctx, map, S, tx, ty) {
    if (SOLIDS[map.tileAt(tx, ty)]) return;
    const x = tx * S, y = ty * S;
    const shade = { mur: [0.55, 0.4, 0.3], arbre: [0.45, 0.22, 0.12], palissade: [0.35, 0.2, 0.15] };
    const edge = (dx, dy, x0, y0, x1, y1, w, h, idx) => {
      const k = shade[map.tileAt(tx + dx, ty + dy)];
      if (!k) return;
      ctx.fillStyle = lg(ctx, x0, y0, x1, y1, `rgba(0,0,0,${k[idx]})`, 'rgba(0,0,0,0)');
      ctx.fillRect(x + (dx > 0 ? S - w : 0), y + (dy > 0 ? S - h : 0), w, h);
    };
    edge(0, -1, x, y, x, y + S * 0.45, S, S * 0.45, 0);
    edge(-1, 0, x, y, x + S * 0.3, y, S * 0.3, S, 1);
    edge(1, 0, x + S, y, x + S * 0.7, y, S * 0.3, S, 1);
    edge(0, 1, x, y + S, x, y + S * 0.8, S, S * 0.2, 2);
  };

  // Décor semé sur le sol (non bloquant). Avec ctx = null : renvoie seulement la lumière éventuelle.
  P.decorTile = function (ctx, map, S, tx, ty) {
    const t = map.tileAt(tx, ty);
    const x = tx * S, y = ty * S, r = U.hash(tx, ty, 300);
    const wallUp = map.tileAt(tx, ty - 1) === 'mur', wallLeft = map.tileAt(tx - 1, ty) === 'mur', wallRight = map.tileAt(tx + 1, ty) === 'mur';
    if (t === 'carrelage') {
      if (wallUp && r < 0.12) { if (ctx) lamp(ctx, x, y, S); return { x: tx, y: ty, r: 1.5, color: '255,70,50', pulse: true }; }
      if (!ctx) return null;
      if (wallUp && wallLeft && U.hash(tx, ty, 301) < 0.6) cobweb(ctx, x, y, S, 1);
      else if (wallUp && wallRight && U.hash(tx, ty, 302) < 0.6) cobweb(ctx, x + S, y, S, -1);
      if (r > 0.88) papers(ctx, x, y, S, tx, ty);
      else if (r > 0.8) casings(ctx, x, y, S, tx, ty);
      return null;
    }
    if (t === 'sol' || t === 'sol2') {
      if (r > 0.988 && t === 'sol' && !wallUp) { if (ctx) trashFire(ctx, x, y, S, tx, ty); return { x: tx, y: ty, r: 1.8, color: '255,140,50', flicker: true }; }
      if (!ctx) return null;
      if (wallUp && r < 0.12) rubble(ctx, x, y, S, tx, ty, true);
      else if (r > 0.965) tire(ctx, x, y, S, tx, ty);
      else if (r > 0.935) cans(ctx, x, y, S, tx, ty);
      else if (r > 0.91 && t === 'sol') puddle(ctx, x, y, S, tx, ty);
      else if (r > 0.88) papers(ctx, x, y, S, tx, ty);
      else if (r > 0.86) casings(ctx, x, y, S, tx, ty);
      else if (r > 0.7) rubble(ctx, x, y, S, tx, ty, false);
      return null;
    }
    if (!ctx) return null;
    if (t === 'herbe') {
      const treeUp = map.tileAt(tx, ty - 1) === 'arbre';
      if (treeUp && r < 0.35) ferns(ctx, x, y, S, tx, ty);
      else if (r > 0.965) bush(ctx, x, y, S, tx, ty);
      else if (r > 0.95) log(ctx, x, y, S, tx, ty);
      else if (r > 0.93) mushroomsF(ctx, x, y, S, tx, ty);
      else if (r > 0.86) flowers(ctx, x, y, S, tx, ty);
      else if (r > 0.8) rubble(ctx, x, y, S, tx, ty, false);
      else if (r > 0.76) leaves(ctx, x, y, S, tx, ty);
    } else if (t === 'chemin') {
      if (r > 0.82) rubble(ctx, x, y, S, tx, ty, false);
      else if (r > 0.76) leaves(ctx, x, y, S, tx, ty);
    }
    return null;
  };
  function ferns(ctx, x, y, S, tx, ty) {
    for (let i = 0; i < 3; i++) {
      const fx = x + S * (0.2 + i * 0.3 + U.hash(tx, ty, 500 + i) * 0.1), fy = y + S * (0.35 + U.hash(tx, ty, 510 + i) * 0.25);
      ctx.strokeStyle = 'rgba(95,140,70,0.85)'; ctx.lineWidth = 1.2;
      for (const a of [-2.4, -1.9, -1.2, -0.7]) { ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + Math.cos(a) * S * 0.12, fy + Math.sin(a) * S * 0.2, fx + Math.cos(a) * S * 0.2, fy + Math.sin(a) * S * 0.12); ctx.stroke(); }
    }
  }
  function bush(ctx, x, y, S, tx, ty) {
    const cx = x + S * 0.5, cy = y + S * 0.6, col = LEAF[Math.floor(U.hash(tx, ty, 520) * LEAF.length)];
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx + 2, cy + S * 0.16, S * 0.32, S * 0.1, 0, 0, TAU); ctx.fill();
    for (const [dx, dy, k] of [[-0.18, 0.02, 0.2], [0.17, 0.03, 0.21], [0, -0.1, 0.24]]) {
      ctx.fillStyle = rg(ctx, cx + dx * S - 3, cy + dy * S - 4, 1, S * k, lite(col, 0.15), dark(col, 0.3));
      ctx.beginPath(); ctx.arc(cx + dx * S, cy + dy * S, S * k, 0, TAU); ctx.fill();
    }
    if (U.hash(tx, ty, 521) > 0.5) for (let i = 0; i < 4; i++) { ctx.fillStyle = '#a8243a'; ctx.beginPath(); ctx.arc(cx + (U.hash(tx, ty, 522 + i) - 0.5) * S * 0.4, cy + (U.hash(tx, ty, 526 + i) - 0.6) * S * 0.25, 1.6, 0, TAU); ctx.fill(); }
  }
  function log(ctx, x, y, S, tx, ty) {
    const cx = x + S * 0.5, cy = y + S * 0.62, a = (U.hash(tx, ty, 530) - 0.5) * 0.6;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-S * 0.38, 2, S * 0.76, S * 0.12);
    ctx.fillStyle = lg(ctx, 0, -S * 0.08, 0, S * 0.08, '#6a5038', '#3a2a1c'); ctx.fillRect(-S * 0.38, -S * 0.08, S * 0.76, S * 0.16);
    ctx.fillStyle = '#8a6c4a'; ctx.beginPath(); ctx.ellipse(S * 0.38, 0, S * 0.04, S * 0.08, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-S * 0.3, -S * 0.02); ctx.lineTo(S * 0.2, -S * 0.03); ctx.stroke();
    ctx.fillStyle = 'rgba(90,130,70,0.6)'; ctx.fillRect(-S * 0.2, -S * 0.09, S * 0.12, S * 0.04);
    ctx.restore();
  }
  function mushroomsF(ctx, x, y, S, tx, ty) {
    for (let i = 0; i < 3; i++) {
      const mx = x + S * (0.3 + i * 0.18 + U.hash(tx, ty, 540 + i) * 0.08), my = y + S * (0.55 + U.hash(tx, ty, 545 + i) * 0.2), r = S * (0.045 + (i % 2) * 0.02);
      ctx.fillStyle = '#d8ccb0'; ctx.fillRect(mx - 1, my - r, 2, r * 1.3);
      ctx.fillStyle = i === 1 ? '#a8432a' : '#b88a4a';
      ctx.beginPath(); ctx.ellipse(mx, my - r, r * 1.4, r * 0.8, 0, Math.PI, TAU); ctx.fill();
    }
  }
  function flowers(ctx, x, y, S, tx, ty) {
    const cols = ['#d8c25a', '#c9d0e0', '#b8607a', '#d89a4a'];
    const c = cols[Math.floor(U.hash(tx, ty, 550) * cols.length)];
    for (let i = 0; i < 5; i++) {
      const fx = x + 5 + U.hash(tx, ty, 551 + i) * (S - 10), fy = y + 7 + U.hash(tx, ty, 556 + i) * (S - 12);
      ctx.strokeStyle = 'rgba(90,120,60,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy + 4); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, TAU); ctx.fill();
    }
  }
  function leaves(ctx, x, y, S, tx, ty) {
    for (let i = 0; i < 5; i++) {
      const lx = x + 4 + U.hash(tx, ty, 560 + i) * (S - 8), ly = y + 4 + U.hash(tx, ty, 565 + i) * (S - 8);
      ctx.fillStyle = i % 2 ? 'rgba(140,90,40,0.7)' : 'rgba(110,100,40,0.7)';
      ctx.beginPath(); ctx.ellipse(lx, ly, 2.4, 1.3, U.hash(tx, ty, 570 + i) * 3, 0, TAU); ctx.fill();
    }
  }

  function rubble(ctx, x, y, S, tx, ty, big) {
    const n = big ? 6 : 2 + Math.floor(U.hash(tx, ty, 310) * 3);
    for (let i = 0; i < n; i++) {
      const px = x + 5 + U.hash(tx, ty, 311 + i) * (S - 10), py = y + (big ? 4 : 8) + U.hash(tx, ty, 321 + i) * (big ? S * 0.45 : S - 14);
      const r = (big ? 2.5 : 1.5) + U.hash(tx, ty, 331 + i) * (big ? 4 : 2.5);
      const brick = U.hash(tx, ty, 341 + i) > 0.55;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(px + 1, py + 1.5, r * 1.2, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lg(ctx, px - r, py - r, px + r, py + r, brick ? '#7a4a36' : '#6a655c', brick ? '#3a2219' : '#2e2b27');
      ctx.beginPath(); ctx.moveTo(px - r, py); ctx.lineTo(px - r * 0.3, py - r * 0.8); ctx.lineTo(px + r, py - r * 0.4); ctx.lineTo(px + r * 0.7, py + r * 0.6); ctx.lineTo(px - r * 0.5, py + r * 0.6); ctx.closePath(); ctx.fill();
    }
    if (big) {
      ctx.strokeStyle = 'rgba(150,80,50,0.6)'; ctx.lineWidth = 1;
      const px = x + S * 0.3, py = y + S * 0.2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + S * 0.2, py - S * 0.12); ctx.moveTo(px + S * 0.1, py + S * 0.05); ctx.lineTo(px + S * 0.35, py - S * 0.02); ctx.stroke();
    }
  }
  function cobweb(ctx, x, y, S, k) {
    ctx.strokeStyle = 'rgba(220,210,190,0.14)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { const a = (i / 3) * Math.PI / 2; ctx.moveTo(x, y); ctx.lineTo(x + k * Math.cos(a) * S * 0.5, y + Math.sin(a) * S * 0.5); }
    for (const rad of [0.18, 0.32, 0.46]) { ctx.moveTo(x + k * S * rad, y); ctx.quadraticCurveTo(x + k * S * rad * 0.62, y + S * rad * 0.62, x, y + S * rad); }
    ctx.stroke();
  }
  function lamp(ctx, x, y, S) {
    const cx = x + S * 0.5, cy = y + S * 0.08;
    ctx.fillStyle = rg(ctx, cx, cy, 0, S * 0.5, 'rgba(255,70,50,0.35)', 'rgba(255,70,50,0)');
    ctx.fillRect(cx - S * 0.5, cy - S * 0.2, S, S * 0.7);
    ctx.fillStyle = '#2a2622'; ctx.fillRect(cx - S * 0.1, cy - S * 0.04, S * 0.2, S * 0.1);
    ctx.fillStyle = '#ff6a50'; ctx.fillRect(cx - S * 0.07, cy - S * 0.01, S * 0.14, S * 0.05);
  }
  function papers(ctx, x, y, S, tx, ty) {
    for (let i = 0; i < 3; i++) {
      const px = x + 6 + U.hash(tx, ty, 400 + i) * (S - 14), py = y + 8 + U.hash(tx, ty, 410 + i) * (S - 16), a = U.hash(tx, ty, 420 + i) * Math.PI;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-4, -2.5, 9, 6);
      ctx.fillStyle = i % 2 ? '#a89c80' : '#8e8470'; ctx.fillRect(-5, -3.5, 9, 6);
      ctx.fillStyle = 'rgba(40,30,20,0.4)'; ctx.fillRect(-4, -2, 6, 1); ctx.fillRect(-4, 0, 5, 1);
      ctx.restore();
    }
  }
  function casings(ctx, x, y, S, tx, ty) {
    for (let i = 0; i < 5; i++) {
      const px = x + 6 + U.hash(tx, ty, 430 + i) * (S - 12), py = y + 8 + U.hash(tx, ty, 440 + i) * (S - 14), a = U.hash(tx, ty, 450 + i) * Math.PI;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a);
      ctx.fillStyle = '#c99a3a'; ctx.fillRect(-2, -0.8, 4, 1.8);
      ctx.fillStyle = 'rgba(255,240,180,0.5)'; ctx.fillRect(-2, -0.8, 4, 0.6);
      ctx.restore();
    }
  }
  function tire(ctx, x, y, S, tx, ty) {
    const cx = x + S * (0.4 + U.hash(tx, ty, 460) * 0.2), cy = y + S * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(cx + 1, cy + 2, S * 0.27, S * 0.14, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1918'; ctx.beginPath(); ctx.ellipse(cx, cy, S * 0.26, S * 0.13, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,115,105,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#0a0908'; ctx.beginPath(); ctx.ellipse(cx, cy - 1, S * 0.12, S * 0.055, 0, 0, TAU); ctx.fill();
  }
  function cans(ctx, x, y, S, tx, ty) {
    for (let i = 0; i < 3; i++) {
      const px = x + 8 + U.hash(tx, ty, 470 + i) * (S - 16), py = y + 10 + U.hash(tx, ty, 480 + i) * (S - 18), a = U.hash(tx, ty, 490 + i) * Math.PI;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-3, -1, 8, 5);
      ctx.fillStyle = i === 1 ? '#3a5a3a' : '#8a3a2a'; ctx.fillRect(-4, -2.5, 8, 4.5);
      ctx.fillStyle = '#b8b2a4'; ctx.fillRect(-4, -2.5, 1.5, 4.5);
      ctx.restore();
    }
  }
  function trashFire(ctx, x, y, S, tx, ty) {
    const cx = x + S * 0.5, cy = y + S * 0.6;
    ctx.fillStyle = rg(ctx, cx, cy, 0, S * 0.7, 'rgba(255,140,50,0.35)', 'rgba(255,140,50,0)');
    ctx.fillRect(cx - S * 0.7, cy - S * 0.7, S * 1.4, S * 1.4);
    ctx.fillStyle = '#1a1310'; ctx.beginPath(); ctx.ellipse(cx, cy, S * 0.22, S * 0.1, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.fillStyle = i % 2 ? '#ff8a3a' : '#ffd27a';
      ctx.fillRect(cx + Math.cos(a) * S * 0.1 - 1, cy + Math.sin(a) * S * 0.04 - 1, 2.5, 2.5);
    }
    ctx.fillStyle = 'rgba(255,200,120,0.85)';
    ctx.beginPath(); ctx.moveTo(cx - S * 0.08, cy); ctx.quadraticCurveTo(cx, cy - S * 0.3, cx + S * 0.08, cy); ctx.fill();
  }
  function puddle(ctx, x, y, S, tx, ty) {
    const cx = x + S * 0.5, cy = y + S * 0.55, rx = S * (0.3 + U.hash(tx, ty, 380) * 0.12);
    ctx.fillStyle = 'rgba(12,10,8,0.8)';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, rx * 0.45, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(170,120,200,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx - rx * 0.2, cy - rx * 0.1, rx * 0.55, rx * 0.18, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,200,180,0.18)';
    ctx.beginPath(); ctx.ellipse(cx + rx * 0.1, cy, rx * 0.4, rx * 0.12, 0, Math.PI * 0.1, Math.PI * 0.8); ctx.stroke();
  }

  P.tiles = TL;
  P.mix = mix;
  G.placeholders = P;
})();
