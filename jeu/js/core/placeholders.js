/* Visuels provisoires dessinés au canvas.
   Chaque peintre reçoit (ctx, s, o) : origine = pieds du personnage,
   s = taille de la boîte en pixels, o = options (dir, t, moving, shadow, glow…).
   Ils disparaissent automatiquement dès qu'une image est branchée dans assets.js. */
(function () {
  const TAU = Math.PI * 2;
  const U = G.U;
  const P = {};

  // Palette « ombre » (soldats de l'armée des ombres)
  const SH = { skin: '#1a1433', coat: '#100c22', coat2: '#1d1640', pants: '#07050f', hair: '#05030a', eye: '#b69cff', metal: '#3a2f6e', wood: '#1d1640' };

  // ---------- primitives ----------
  function ell(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
  function circ(ctx, x, y, r, fill) { ell(ctx, x, y, r, r, fill); }
  function rrect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, Math.abs(w), Math.abs(h), Math.max(0, r)); else ctx.rect(x, y, Math.abs(w), Math.abs(h));
    ctx.fillStyle = fill; ctx.fill();
  }
  function poly(ctx, pts, fill) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function glow(ctx, x, y, r, color, blur) {
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur || r * 6; circ(ctx, x, y, r, color); ctx.restore();
  }
  function ground(ctx, s, w) { ell(ctx, 0, -s * 0.015, s * w, s * w * 0.34, 'rgba(0,0,0,0.42)'); }
  function aura(ctx, s, color) {
    const g = ctx.createRadialGradient(0, -s * 0.4, 0, 0, -s * 0.4, s * 0.6);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(-s * 0.7, -s * 1.05, s * 1.4, s * 1.1);
  }

  // ---------- armes ----------
  function blade(ctx, len, w, metal, hilt) {
    poly(ctx, [-w / 2, 0, w / 2, 0, w / 2, -len * 0.85, 0, -len, -w / 2, -len * 0.85], metal);
    ctx.fillStyle = hilt;
    ctx.fillRect(-w * 1.4, -w * 0.3, w * 2.8, w * 0.7);
    ctx.fillRect(-w * 0.35, 0, w * 0.7, w * 2.2);
  }
  function bowShape(ctx, s, wood) {
    ctx.strokeStyle = wood; ctx.lineWidth = s * 0.03; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.22, -1.25, 1.25); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,230,210,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.cos(-1.25) * s * 0.22, Math.sin(-1.25) * s * 0.22); ctx.lineTo(Math.cos(1.25) * s * 0.22, Math.sin(1.25) * s * 0.22); ctx.stroke();
  }
  function weapon(ctx, s, c, mode, asw, bw, hy) {
    const w = c.weapon;
    if (!w) return;
    ctx.save();
    if (mode === 'back') {
      if (w === 'sword' || w === 'bow') {
        ctx.translate(0, -s * 0.36); ctx.rotate(0.6);
        if (w === 'sword') blade(ctx, s * 0.5, s * 0.035, '#cfd8e6', '#6b4b2a');
        else bowShape(ctx, s, c.wood || '#7a5530');
      }
      ctx.restore();
      return;
    }
    if (mode === 'front') ctx.translate(bw / 2 + s * 0.03, hy); else ctx.translate(asw + s * 0.03, hy);
    ctx.rotate(mode === 'front' ? 0.25 : 1.1);
    const k = c.bulk || 1;
    switch (w) {
      case 'dagger': blade(ctx, s * 0.21, s * 0.03, c.metal || '#cfd8e6', '#2c3140'); break;
      case 'sword': blade(ctx, s * 0.44, s * 0.036, '#dde6f3', '#8a6a3a'); break;
      case 'club':
        poly(ctx, [-s * 0.03, 0, s * 0.03, 0, s * 0.08 * k, -s * 0.42 * k, -s * 0.08 * k, -s * 0.42 * k], c.wood || '#6b4a2b');
        circ(ctx, 0, -s * 0.42 * k, s * 0.085 * k, c.wood || '#6b4a2b');
        for (let i = 0; i < 4; i++) {
          const yy = -s * (0.22 + i * 0.06) * k, side = i % 2 ? 1 : -1;
          poly(ctx, [side * s * 0.05 * k, yy, side * s * 0.11 * k, yy - s * 0.02, side * s * 0.05 * k, yy - s * 0.04], '#b9b2a0');
        }
        break;
      case 'hammer':
        ctx.fillStyle = c.pants; ctx.fillRect(-s * 0.025, -s * 0.5, s * 0.05, s * 0.55);
        rrect(ctx, -s * 0.16, -s * 0.62, s * 0.32, s * 0.16, 3, c.stoneCol || '#7b828e');
        break;
      case 'bow': ctx.rotate(mode === 'front' ? -1.45 : -1.1); bowShape(ctx, s, c.wood || '#7a5530'); break;
    }
    ctx.restore();
  }

  // ---------- têtes ----------
  function ears(ctx, hr, hy, dir, skin) {
    if (dir === 'left' || dir === 'right') {
      poly(ctx, [-hr * 0.3, hy - hr * 0.25, -hr * 1.6, hy - hr * 0.8, -hr * 0.45, hy + hr * 0.35], skin);
      return;
    }
    poly(ctx, [-hr * 0.75, hy - hr * 0.15, -hr * 1.75, hy - hr * 0.65, -hr * 0.8, hy + hr * 0.35], skin);
    poly(ctx, [hr * 0.75, hy - hr * 0.15, hr * 1.75, hy - hr * 0.65, hr * 0.8, hy + hr * 0.35], skin);
  }
  function hair(ctx, c, hr, hy, dir) {
    const side = dir === 'left' || dir === 'right';
    const st = c.hairStyle;
    if (st === 'none') return;
    if (st === 'stone') {
      rrect(ctx, -hr * 1.05, hy - hr * 1.1, hr * 2.1, hr * 0.7, 2, c.coat2);
      return;
    }
    if (st === 'hood') {
      ctx.fillStyle = c.hood;
      ctx.beginPath(); ctx.arc(0, hy - hr * 0.05, hr * 1.18, Math.PI * 0.9, Math.PI * 2.1); ctx.lineTo(hr * 1.1, hy + hr * 0.6); ctx.lineTo(-hr * 1.1, hy + hr * 0.6); ctx.closePath(); ctx.fill();
      if (dir === 'up') circ(ctx, 0, hy, hr * 1.12, c.hood);
      return;
    }
    if (st === 'helmet') {
      ctx.fillStyle = '#5b5f66';
      ctx.beginPath(); ctx.arc(0, hy - hr * 0.1, hr * 1.1, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#41444a'; ctx.fillRect(-hr * 1.1, hy - hr * 0.15, hr * 2.2, hr * 0.22);
      // cornes
      poly(ctx, [-hr * 0.8, hy - hr * 0.6, -hr * 1.6, hy - hr * 1.6, -hr * 0.4, hy - hr * 0.95], '#e8dcc0');
      poly(ctx, [hr * 0.8, hy - hr * 0.6, hr * 1.6, hy - hr * 1.6, hr * 0.4, hy - hr * 0.95], '#e8dcc0');
      return;
    }
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    if (dir === 'up') ctx.arc(0, hy, hr * 1.07, 0, TAU);
    else if (side) ctx.arc(-hr * 0.05, hy - hr * 0.05, hr * 1.08, Math.PI * 0.5, Math.PI * 2.05);
    else ctx.arc(0, hy - hr * 0.06, hr * 1.08, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    if (st === 'spiky') {
      const spikes = side
        ? [[-0.9, -0.4, -1.5, -0.9, -0.5, -0.85], [-0.4, -0.9, -0.5, -1.5, 0.2, -1.0], [0.2, -1.0, 0.6, -1.45, 0.8, -0.6]]
        : [[-0.9, -0.5, -1.2, -1.2, -0.3, -0.95], [-0.35, -1.0, 0, -1.55, 0.35, -1.0], [0.3, -0.95, 1.2, -1.2, 0.9, -0.5]];
      for (const [a, b, c2, d, e, f] of spikes) poly(ctx, [a * hr, hy + b * hr, c2 * hr, hy + d * hr, e * hr, hy + f * hr], c.hair);
      if (dir === 'down') poly(ctx, [-hr * 0.7, hy - hr * 0.55, -hr * 0.1, hy - hr * 0.55, -hr * 0.45, hy - hr * 0.05], c.hair);
      if (side) poly(ctx, [hr * 0.2, hy - hr * 0.8, hr * 1.1, hy - hr * 0.55, hr * 0.5, hy - hr * 0.2], c.hair);
    }
    if (st === 'ponytail') {
      if (dir === 'up') ell(ctx, 0, hy + hr * 0.9, hr * 0.35, hr * 0.9, c.hair);
      else if (side) ell(ctx, -hr * 1.1, hy + hr * 0.3, hr * 0.32, hr * 0.85, c.hair);
    }
  }
  function eyes(ctx, c, hr, hy, dir, o) {
    if (dir === 'up') return;
    const side = dir === 'left' || dir === 'right';
    const lit = c.eyeGlow || o.glow || o.shadow;
    const col = o.glow && !c.eyeGlow && !o.shadow ? '#5fc8ff' : c.eye;
    const r = hr * 0.14;
    const pts = side ? [[hr * 0.5, hy + hr * 0.1]] : [[-hr * 0.38, hy + hr * 0.12], [hr * 0.38, hy + hr * 0.12]];
    for (const [x, y] of pts) {
      if (lit) glow(ctx, x, y, r, col, r * 7);
      else ell(ctx, x, y, r * 0.9, r * 1.2, col);
    }
  }

  // ---------- humanoïde générique ----------
  function humanoid(ctx, s, o, c) {
    const t = o.t || 0, dir = o.dir || 'down', mv = !!o.moving;
    if (o.shadow) c = Object.assign({}, c, { skin: SH.skin, coat: SH.coat, coat2: SH.coat2, pants: SH.pants, hair: SH.hair, eye: SH.eye, eyeGlow: true, metal: SH.metal, wood: SH.wood, hood: SH.coat2, trim: null, belt: SH.coat2, paint: false, necklace: false, cracks: null, stoneCol: SH.coat2 });
    const side = dir === 'left' || dir === 'right';
    const bk = c.bulk || 1, hd = c.head || 1;
    ground(ctx, s, 0.2 * bk);
    if (o.shadow) aura(ctx, s, 'rgba(139,92,246,0.35)');
    if (dir === 'left') ctx.scale(-1, 1);
    const ph = Math.sin(t * 15);
    const bob = mv ? Math.abs(ph) * s * 0.03 : Math.sin(t * 2.2) * s * 0.006;
    ctx.translate(0, -bob);

    const bw = s * 0.3 * bk;
    const lw = s * 0.085 * bk, lh = s * 0.2;
    const sw = mv ? ph * s * 0.05 : 0;
    if (side) {
      rrect(ctx, -lw / 2 - sw, -lh, lw, lh, 2, c.pants);
      rrect(ctx, -lw / 2 + sw, -lh, lw, lh, 2, c.pants);
    } else {
      rrect(ctx, -bw * 0.3 - lw / 2, -lh - Math.max(0, sw) * 0.6, lw, lh, 2, c.pants);
      rrect(ctx, bw * 0.3 - lw / 2, -lh - Math.max(0, -sw) * 0.6, lw, lh, 2, c.pants);
    }
    if (dir === 'up') weapon(ctx, s, c, 'back', 0, bw, 0);

    const th = s * 0.42, ty = -lh - th + s * 0.04;
    rrect(ctx, -bw / 2, ty, bw, th, s * 0.07, c.coat);
    if (c.belt) { ctx.fillStyle = c.belt; ctx.fillRect(-bw / 2, ty + th * 0.58, bw, s * 0.04); }
    if (c.trim && dir === 'down') { ctx.fillStyle = c.trim; ctx.fillRect(-s * 0.012, ty + s * 0.04, s * 0.024, th * 0.5); }
    if (c.necklace && dir !== 'up') {
      for (let i = -2; i <= 2; i++) poly(ctx, [i * bw * 0.16 - 2, ty + s * 0.05, i * bw * 0.16 + 2, ty + s * 0.05, i * bw * 0.16, ty + s * 0.11], '#efe6d0');
    }
    if (c.stone) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-bw * 0.3, ty + th * 0.2); ctx.lineTo(-bw * 0.05, ty + th * 0.45); ctx.lineTo(-bw * 0.2, ty + th * 0.8); ctx.stroke();
    }
    if (c.cracks) {
      ctx.save(); ctx.strokeStyle = c.cracks; ctx.shadowColor = c.cracks; ctx.shadowBlur = 10; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-bw * 0.1, ty + 4); ctx.lineTo(bw * 0.12, ty + th * 0.35); ctx.lineTo(-bw * 0.08, ty + th * 0.6); ctx.lineTo(bw * 0.15, ty + th * 0.95); ctx.stroke();
      ctx.restore();
    }

    const aw = s * 0.075 * bk, ah = s * 0.28;
    const asw = mv ? -ph * s * 0.05 : 0;
    if (side) rrect(ctx, -aw / 2 + asw, ty + s * 0.04, aw, ah, aw / 2, c.coat2);
    else {
      rrect(ctx, -bw / 2 - aw * 0.75, ty + s * 0.04, aw, ah, aw / 2, c.coat2);
      rrect(ctx, bw / 2 - aw * 0.25, ty + s * 0.04, aw, ah, aw / 2, c.coat2);
    }
    if (dir !== 'up') weapon(ctx, s, c, side ? 'side' : 'front', asw, bw, ty + s * 0.04 + ah);

    const hr = s * 0.15 * hd, hy = ty - hr * 0.8;
    if (c.ears) ears(ctx, hr, hy, dir, c.skin);
    circ(ctx, 0, hy, hr, c.skin);
    hair(ctx, c, hr, hy, dir);
    eyes(ctx, c, hr, hy, dir, o);
    if (c.paint && dir !== 'up') {
      ctx.fillStyle = '#c0262d';
      if (side) ctx.fillRect(hr * 0.1, hy + hr * 0.3, hr * 0.8, hr * 0.12);
      else { ctx.fillRect(-hr * 0.7, hy + hr * 0.32, hr * 0.45, hr * 0.12); ctx.fillRect(hr * 0.25, hy + hr * 0.32, hr * 0.45, hr * 0.12); }
    }
  }

  const H = {
    heros: { skin: '#e9c7a6', coat: '#1a2030', coat2: '#232b40', pants: '#10131c', hair: '#0b0d14', hairStyle: 'spiky', eye: '#2a2f3a', trim: '#3a4a6a', weapon: 'dagger', metal: '#cfd8e6' },
    pnj_mira: { skin: '#f0cdb0', coat: '#d9e2ee', coat2: '#b9c6d8', pants: '#3b4a66', hair: '#c2412d', hairStyle: 'ponytail', eye: '#2f5a3a', trim: '#3f8cff', belt: '#3b4a66', weapon: 'sword' },
    gobelin: { skin: '#5d9a3f', coat: '#6b4a2b', coat2: '#5d9a3f', pants: '#4a8432', hairStyle: 'none', ears: true, eye: '#ffd23f', eyeGlow: true, weapon: 'dagger', metal: '#9aa3ad', bulk: 0.95, head: 1.15, belt: '#3a2716' },
  };
  H.gobelin_archer = Object.assign({}, H.gobelin, { coat: '#3f5a2c', hairStyle: 'hood', hood: '#3d3426', weapon: 'bow', wood: '#7a5530' });
  H.chef_gobelin = { skin: '#3f7a2c', coat: '#5a2e1c', coat2: '#3f7a2c', pants: '#33661f', hairStyle: 'helmet', ears: true, eye: '#ff3b3b', eyeGlow: true, weapon: 'club', wood: '#5a3a1e', bulk: 1.35, head: 1.05, paint: true, necklace: true, belt: '#2a160c' };
  H.statue = { skin: '#6f7682', coat: '#5f6672', coat2: '#6a717d', pants: '#565c67', hairStyle: 'stone', eye: '#2b2f36', weapon: 'hammer', stoneCol: '#7b828e', bulk: 1.3, head: 0.95, stone: true };
  H.gardien = Object.assign({}, H.statue, { eye: '#ff2b4a', eyeGlow: true });
  H.gardien_fissure = Object.assign({}, H.gardien, { cracks: '#ff5a3c' });
  for (const k in H) P[k] = (ctx, s, o) => humanoid(ctx, s, o, H[k]);

  // ---------- quadrupèdes ----------
  function quadruped(ctx, s, o, c) {
    const t = o.t || 0, mv = !!o.moving;
    let dir = o.dir || 'right';
    if (dir === 'up' || dir === 'down') dir = o.faceX || 'right';
    if (o.shadow) c = Object.assign({}, c, { body: SH.coat, belly: SH.coat2, ear: SH.coat2, eye: SH.eye, tail: SH.coat2, nose: SH.pants });
    ground(ctx, s, 0.32);
    if (o.shadow) aura(ctx, s, 'rgba(139,92,246,0.35)');
    if (dir === 'left') ctx.scale(-1, 1);
    const ph = Math.sin(t * (mv ? 18 : 3));
    const bob = mv ? Math.abs(ph) * s * 0.025 : 0;
    const bodyY = -s * (c.legH + 0.13) - bob;

    ctx.strokeStyle = c.tail; ctx.lineWidth = s * c.tailW; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.26, bodyY);
    ctx.quadraticCurveTo(-s * 0.46, bodyY - s * 0.04 + ph * s * 0.04, -s * 0.5, bodyY - s * c.tailUp);
    ctx.stroke();

    const legs = [-0.19, -0.09, 0.11, 0.21];
    legs.forEach((lx, i) => {
      const swing = mv ? (i % 2 ? ph : -ph) * s * 0.04 : 0;
      rrect(ctx, s * lx - s * 0.03 + swing, bodyY, s * 0.06, -bodyY, 2, i < 2 ? c.belly : c.body);
    });
    ell(ctx, 0, bodyY, s * 0.3, s * 0.15, c.body);
    ell(ctx, s * 0.02, bodyY + s * 0.06, s * 0.21, s * 0.065, c.belly);

    const hx = s * 0.3, hy = bodyY - s * 0.08;
    if (c.earRound) { circ(ctx, hx - s * 0.06, hy - s * 0.1, s * 0.05, c.ear); circ(ctx, hx + s * 0.03, hy - s * 0.11, s * 0.045, c.ear); }
    else { poly(ctx, [hx - s * 0.08, hy - s * 0.05, hx - s * 0.06, hy - s * 0.2, hx + s * 0.01, hy - s * 0.08], c.ear); poly(ctx, [hx, hy - s * 0.06, hx + s * 0.04, hy - s * 0.2, hx + s * 0.08, hy - s * 0.06], c.ear); }
    circ(ctx, hx, hy, s * 0.115, c.body);
    ell(ctx, hx + s * 0.11, hy + s * 0.03, s * c.snout, s * 0.055, c.body);
    circ(ctx, hx + s * 0.11 + s * c.snout, hy + s * 0.02, s * 0.022, c.nose);
    if (c.teeth) {
      poly(ctx, [hx + s * 0.1, hy + s * 0.07, hx + s * 0.12, hy + s * 0.12, hx + s * 0.14, hy + s * 0.07], '#f2efe6');
      poly(ctx, [hx + s * 0.15, hy + s * 0.07, hx + s * 0.165, hy + s * 0.11, hx + s * 0.18, hy + s * 0.07], '#f2efe6');
    }
    glow(ctx, hx + s * 0.04, hy - s * 0.03, s * 0.022, c.eye, s * 0.15);
  }
  const Q = {
    rat_geant: { body: '#6b5444', belly: '#8a7262', ear: '#d58b8b', eye: '#ff3b3b', tail: '#d58b8b', tailW: 0.025, tailUp: -0.02, legH: 0.07, snout: 0.08, nose: '#e7a0a0', earRound: true },
    loup: { body: '#596170', belly: '#7a8291', ear: '#3d434f', eye: '#ffe066', tail: '#596170', tailW: 0.07, tailUp: 0.12, legH: 0.17, snout: 0.1, nose: '#14161b', teeth: true },
  };
  for (const k in Q) P[k] = (ctx, s, o) => quadruped(ctx, s, o, Q[k]);

  // ---------- objets ----------
  P.autel = (ctx, s, o) => {
    const t = o.t || 0;
    ground(ctx, s, 0.45);
    rrect(ctx, -s * 0.42, -s * 0.42, s * 0.84, s * 0.42, 3, '#363b4b');
    rrect(ctx, -s * 0.5, -s * 0.52, s * 1.0, s * 0.13, 3, '#4b5164');
    ctx.fillStyle = '#262a36'; ctx.fillRect(-s * 0.42, -s * 0.18, s * 0.84, s * 0.03);
    const pulse = 0.6 + Math.sin(t * 3) * 0.4;
    const col = o.dim ? '#3b4a66' : '#3fb4ff';
    ctx.save();
    ctx.shadowColor = col; ctx.shadowBlur = 20 * pulse;
    poly(ctx, [0, -s * 0.86, s * 0.1, -s * 0.68, 0, -s * 0.53, -s * 0.1, -s * 0.68], col);
    ctx.restore();
    ctx.strokeStyle = `rgba(63,180,255,${0.25 + 0.35 * pulse})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.09, 0, TAU); ctx.stroke();
  };

  P.portail = (ctx, s, o) => {
    const t = o.t || 0;
    const rx = s * 0.3, ry = s * 0.46, cy = -s * 0.5;
    const rgb = o.red ? '255,60,80' : '63,180,255';
    const g = ctx.createRadialGradient(0, cy, 0, 0, cy, s * 0.65);
    g.addColorStop(0, `rgba(${rgb},0.5)`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(-s * 0.7, cy - s * 0.7, s * 1.4, s * 1.4);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#030b20'; ctx.fillRect(-rx, cy - ry, rx * 2, ry * 2);
    for (let i = 0; i < 6; i++) {
      const a = t * (1.3 + i * 0.2) + i * 1.7;
      ctx.strokeStyle = `rgba(${rgb},${0.22 + i * 0.09})`;
      ctx.lineWidth = 2 + i * 0.5;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * rx * 0.12, cy + Math.sin(a) * ry * 0.08, rx * (1 - i * 0.13), ry * (1 - i * 0.13), a * 0.25, a, a + TAU * 0.65);
      ctx.stroke();
    }
    const c = ctx.createRadialGradient(0, cy, 0, 0, cy, rx * 0.7);
    c.addColorStop(0, 'rgba(230,245,255,0.85)'); c.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = c; ctx.fillRect(-rx, cy - ry, rx * 2, ry * 2);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = `rgb(${rgb})`; ctx.shadowBlur = 18;
    ctx.strokeStyle = `rgba(${rgb},0.95)`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  };

  function chest(ctx, s, open) {
    ground(ctx, s, 0.42);
    const w = s * 0.8, h = s * 0.45;
    if (open) {
      rrect(ctx, -w / 2, -h - s * 0.32, w, s * 0.3, 3, '#5a3a22');
      ctx.fillStyle = '#c9a54a'; ctx.fillRect(-w / 2, -h - s * 0.06, w, s * 0.04);
    }
    rrect(ctx, -w / 2, -h, w, h, 3, '#6e4728');
    if (open) { ctx.fillStyle = '#1a0f08'; ctx.fillRect(-w / 2 + 3, -h, w - 6, s * 0.08); }
    else {
      rrect(ctx, -w / 2 - 1, -h - s * 0.12, w + 2, s * 0.2, 4, '#7d5230');
      ctx.fillStyle = '#c9a54a'; ctx.fillRect(-w / 2, -h + s * 0.04, w, s * 0.04);
      rrect(ctx, -s * 0.06, -h + s * 0.02, s * 0.12, s * 0.12, 2, '#e3c25a');
    }
    ctx.fillStyle = '#c9a54a';
    ctx.fillRect(-w / 2 + s * 0.08, -h, s * 0.05, h); ctx.fillRect(w / 2 - s * 0.13, -h, s * 0.05, h);
  }
  P.coffre = (ctx, s) => chest(ctx, s, false);
  P.coffre_ouvert = (ctx, s) => chest(ctx, s, true);

  P.brasero = (ctx, s, o) => {
    const t = o.t || 0;
    ground(ctx, s, 0.3);
    rrect(ctx, -s * 0.08, -s * 0.42, s * 0.16, s * 0.42, 2, '#3a3f4b');
    rrect(ctx, -s * 0.24, -s * 0.38, s * 0.48, s * 0.06, 2, '#30343e');
    ctx.beginPath(); ctx.ellipse(0, -s * 0.48, s * 0.28, s * 0.12, 0, 0, Math.PI); ctx.fillStyle = '#4a4f5c'; ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const f = Math.sin(t * (9 + i * 3) + i * 2) * 0.5 + 0.5;
      const fx = (i - 1) * s * 0.1, fh = s * (0.3 + f * 0.18) * (i === 1 ? 1.25 : 0.85);
      ctx.fillStyle = i === 1 ? 'rgba(255,200,90,0.85)' : 'rgba(255,110,40,0.75)';
      ctx.beginPath();
      ctx.moveTo(fx - s * 0.09, -s * 0.5);
      ctx.quadraticCurveTo(fx - s * 0.08, -s * 0.5 - fh * 0.6, fx, -s * 0.5 - fh);
      ctx.quadraticCurveTo(fx + s * 0.08, -s * 0.5 - fh * 0.6, fx + s * 0.09, -s * 0.5);
      ctx.fill();
    }
    ctx.restore();
  };

  P.tente = (ctx, s) => {
    ground(ctx, s, 0.45);
    poly(ctx, [-s * 0.48, 0, 0, -s * 0.75, s * 0.48, 0], '#7a5a3a');
    poly(ctx, [-s * 0.48, 0, 0, -s * 0.75, -s * 0.1, 0], '#634830');
    poly(ctx, [-s * 0.12, 0, 0, -s * 0.38, s * 0.12, 0], '#1b120b');
    ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.06, -s * 0.84); ctx.lineTo(s * 0.04, -s * 0.66); ctx.moveTo(s * 0.06, -s * 0.84); ctx.lineTo(-s * 0.04, -s * 0.66); ctx.stroke();
  };

  P._default = (ctx, s) => {
    ground(ctx, s, 0.3);
    poly(ctx, [0, -s * 0.9, s * 0.3, -s * 0.5, 0, -s * 0.1, -s * 0.3, -s * 0.5], '#d946ef');
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(s * 0.35)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, -s * 0.5);
  };

  // ---------- tuiles ----------
  const TL = {};
  const FLOOR = ['#191f2c', '#1b2130', '#1d2333', '#182030'];
  function wallShadow(ctx, x, y, S, tx, ty, map) {
    if (!map || map.tileAt(tx, ty - 1) !== 'mur') return;
    const g = ctx.createLinearGradient(0, y, 0, y + S * 0.35);
    g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, S, S * 0.35);
  }
  TL.sol = (ctx, x, y, S, tx, ty, map) => {
    ctx.fillStyle = FLOOR[Math.floor(U.hash(tx, ty, 1) * FLOOR.length)];
    ctx.fillRect(x, y, S, S);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(x, y + S - 1, S, 1); ctx.fillRect(x + S - 1, y, 1, S);
    for (let i = 0; i < 3; i++) {
      const a = U.hash(tx, ty, 10 + i);
      if (a < 0.55) continue;
      ctx.fillStyle = a > 0.82 ? 'rgba(160,180,210,0.08)' : 'rgba(0,0,0,0.22)';
      const px = x + 3 + U.hash(tx, ty, 20 + i) * (S - 6), py = y + 3 + U.hash(tx, ty, 30 + i) * (S - 6);
      ctx.beginPath(); ctx.ellipse(px, py, 1.5 + a * 2.5, 1 + a * 1.5, 0, 0, TAU); ctx.fill();
    }
    if (U.hash(tx, ty, 40) > 0.86) {
      const sx = x + U.hash(tx, ty, 41) * S * 0.7, sy = y + U.hash(tx, ty, 42) * S * 0.7;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 8, sy + 5); ctx.lineTo(sx + 12, sy + 13); ctx.stroke();
    }
    wallShadow(ctx, x, y, S, tx, ty, map);
  };
  TL.sol2 = (ctx, x, y, S, tx, ty, map) => {
    TL.sol(ctx, x, y, S, tx, ty, map);
    for (let i = 0; i < 4; i++) {
      const px = x + U.hash(tx, ty, 50 + i) * S, py = y + U.hash(tx, ty, 60 + i) * S;
      ell(ctx, px, py, 4 + U.hash(tx, ty, 70 + i) * 7, 3 + U.hash(tx, ty, 80 + i) * 4, 'rgba(56,120,84,0.22)');
    }
  };
  TL.temple = (ctx, x, y, S, tx, ty, map) => {
    ctx.fillStyle = (tx + ty) % 2 ? '#1c1a2b' : '#201d31';
    ctx.fillRect(x, y, S, S);
    ctx.strokeStyle = 'rgba(130,120,190,0.15)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 2.5, y + 2.5, S - 5, S - 5);
    if (U.hash(tx, ty, 5) > 0.86) {
      ctx.strokeStyle = 'rgba(63,180,255,0.2)';
      ctx.beginPath(); ctx.arc(x + S / 2, y + S / 2, S * 0.18, 0, TAU);
      ctx.moveTo(x + S / 2, y + S * 0.25); ctx.lineTo(x + S / 2, y + S * 0.75); ctx.stroke();
    }
    wallShadow(ctx, x, y, S, tx, ty, map);
  };
  TL.mur = (ctx, x, y, S, tx, ty, map) => {
    const below = map ? map.tileAt(tx, ty + 1) : 'mur';
    ctx.fillStyle = '#0a0d14'; ctx.fillRect(x, y, S, S);
    if (U.hash(tx, ty, 3) > 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect(x + U.hash(tx, ty, 4) * S * 0.6, y + U.hash(tx, ty, 5) * S * 0.6, S * 0.3, S * 0.2);
    }
    if (below && below !== 'mur') {
      const fh = S * 0.62, fy = y + S - fh;
      const g = ctx.createLinearGradient(0, fy, 0, y + S);
      g.addColorStop(0, below === 'temple' ? '#2c2840' : '#2b3345');
      g.addColorStop(1, below === 'temple' ? '#1b1829' : '#1a2030');
      ctx.fillStyle = g; ctx.fillRect(x, fy, S, fh);
      ctx.fillStyle = 'rgba(170,200,240,0.16)'; ctx.fillRect(x, fy, S, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(x, fy + fh * 0.42, S, 1); ctx.fillRect(x, fy + fh * 0.76, S, 1);
      const off = (tx % 2) * S * 0.5;
      ctx.fillRect(x + (S * 0.3 + off) % S, fy + 2, 1, fh * 0.4);
      ctx.fillRect(x + (S * 0.75 + off) % S, fy + fh * 0.42, 1, fh * 0.34);
    }
  };
  TL.vide = (ctx, x, y, S, tx, ty, map) => {
    ctx.fillStyle = '#010206'; ctx.fillRect(x, y, S, S);
    for (let i = 0; i < 2; i++) {
      if (U.hash(tx, ty, 90 + i) > 0.55) {
        ctx.fillStyle = 'rgba(120,170,255,0.35)';
        ctx.fillRect(x + U.hash(tx, ty, 92 + i) * S, y + U.hash(tx, ty, 94 + i) * S, 1, 1);
      }
    }
    if (map && map.tileAt(tx, ty - 1) !== 'vide') {
      const g = ctx.createLinearGradient(0, y, 0, y + S * 0.5);
      g.addColorStop(0, 'rgba(40,60,90,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, S, S * 0.5);
    }
  };

  P.tiles = TL;
  G.placeholders = P;
})();
