/* Catalogue des images + dessin des sprites.
   ─────────────────────────────────────────────
   Tant qu'une entrée a `src: null`, le jeu dessine un visuel provisoire
   (voir placeholders.js). Pour brancher une vraie image :

     heros: { src: 'assets/sprites/heros.png', size: 1.25 }

   Planche d'animation (spritesheet) — cases de même taille, lues de gauche
   à droite puis de haut en bas :

     heros: {
       src: 'assets/sprites/heros.png', size: 1.25,
       frame: { w: 64, h: 64 }, fps: 8,
       anims: {
         idle_down: [0], walk_down: [0, 1, 2, 3],
         walk_up: [4, 5, 6, 7], walk_right: [8, 9, 10, 11],  // walk_left = miroir auto
         attack: { frames: [12, 13, 14], fps: 12, loop: false },
       },
     }

   size  : hauteur/largeur max d'affichage, en tuiles (1 tuile = 48 px)
   faces : sens dans lequel regarde une image fixe ('right' par défaut, ou 'left')
   flat  : true = pas d'ombre portée au sol */
(function () {
  const A = {
    manifest: {
      // — Personnages —
      heros:           { src: null, size: 1.3 },
      pnj_mira:        { src: null, size: 1.3 },
      forme_loup:      { src: null, size: 1.65 },   // transformation (artefact du loup)
      // — Ennemis —
      chien:           { src: null, size: 1.15 },
      pillard:         { src: null, size: 1.3 },
      pillard_tireur:  { src: null, size: 1.3 },
      tireur_elite:    { src: null, size: 1.3 },
      kross:           { src: null, size: 1.75 },
      // — Décor —
      caisse:          { src: null, size: 0.85 },
      caisse_ouverte:  { src: null, size: 0.85 },
      caisse_medocs:   { src: null, size: 0.85 },
      baril:           { src: null, size: 1.0 },
      epave:           { src: null, size: 1.8 },
      barricade:       { src: null, size: 1.4 },
      abri:            { src: null, size: 1.7 },
      pilier:          { src: null, size: 2.0 },
      escalier:        { src: null, size: 1.4, flat: true },
      drapeau:         { src: null, size: 2.0 },
      portail:         { src: null, size: 1.7, flat: true },
      // — Tuiles (48×48 conseillé ; `variants: N` = bande de N tuiles côte à côte) —
      tuile_sol:       { src: null, tile: true },   // bitume
      tuile_sol2:      { src: null, tile: true },   // terre, gravats
      tuile_carrelage: { src: null, tile: true },   // sol du métro
      tuile_mur:       { src: null, tile: true },   // ruines
      tuile_vide:      { src: null, tile: true },   // cratère
      // — Portraits de dialogue (carré conseillé, 256×256) —
      portrait_heros:  { src: null },
      portrait_mira:   { src: null },
      portrait_chef:   { src: null },
      portrait_kross:  { src: null },
      // — Fonds —
      fond_titre:      { src: null },
    },

    img: {},

    load() {
      const entries = Object.entries(this.manifest).filter(([, m]) => m.src);
      return Promise.all(entries.map(([key, m]) => new Promise(resolve => {
        const im = new Image();
        im.onload = () => { this.img[key] = im; resolve(); };
        im.onerror = () => { console.warn('[assets] image introuvable :', m.src); resolve(); };
        im.src = m.src;
      })));
    },

    has(key) { return !!this.img[key]; },
    src(key) { return this.img[key] ? this.manifest[key].src : null; },

    /* Dessine le sprite `key` centré en x, pieds posés en y.
       o = { dir, t, moving, anim, scale, alpha, flash (0-1), rot, pose, weapon } */
    draw(ctx, key, cx, by, o = {}) {
      const m = this.manifest[key] || {};
      const size = (m.size || 1) * G.config.TILE * (o.scale || 1);
      const img = this.img[key];
      ctx.save();
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.translate(Math.round(cx), Math.round(by));
      if (img) {
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight, flip = false, directional = false;
        if (m.frame) {
          const a = resolveAnim(m, o.anim);
          const n = a.frames.length;
          let i = Math.floor((o.t || 0) * a.fps);
          i = a.loop === false ? Math.min(i, n - 1) : i % n;
          const f = a.frames[i];
          const cols = Math.max(1, Math.floor(img.naturalWidth / m.frame.w));
          sx = (f % cols) * m.frame.w; sy = Math.floor(f / cols) * m.frame.h;
          sw = m.frame.w; sh = m.frame.h;
          flip = a.flip;
          directional = Object.keys(m.anims || {}).some(k => /_(left|right)$/.test(k));
        }
        if (!directional) {
          const faces = m.faces || 'right';
          if ((o.dir === 'left' && faces === 'right') || (o.dir === 'right' && faces === 'left')) flip = !flip;
        }
        const ratio = sw / sh;
        let dw = size, dh = size;
        if (ratio > 1) dh = size / ratio; else dw = size * ratio;
        if (!m.flat) {
          ctx.beginPath(); ctx.ellipse(0, -2, dw * 0.3, dw * 0.1, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
        }
        if (o.rot) ctx.rotate(o.rot);
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh, dw, dh);
        if (o.flash > 0) {
          ctx.globalAlpha *= Math.min(1, o.flash);
          ctx.drawImage(tinted(img, sx, sy, sw, sh, dw, dh, '#ffffff', 1), -dw / 2, -dh, dw, dh);
        }
      } else {
        const pk = m.ph || key;
        const paint = G.placeholders[pk] || G.placeholders._default;
        const gw = G.placeholders.groundW[pk];
        if (gw && !o.noGround) {
          ctx.beginPath(); ctx.ellipse(0, -1, size * gw, size * gw * 0.32, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
        }
        if (o.rot) ctx.rotate(o.rot);
        // phase de marche / respiration pour les peintres procéduraux
        o.ph = o.moving ? (o.t || 0) * 15 : undefined;
        o.idle = (o.t || 0) * 2.2;
        paint(ctx, size, o);
        if (o.flash > 0) {
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(0, -size * 0.45, 0, 0, -size * 0.45, size * 0.6);
          g.addColorStop(0, `rgba(255,255,255,${0.75 * Math.min(1, o.flash)})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(-size, -size * 1.2, size * 2, size * 1.4);
        }
      }
      ctx.restore();
    },

    // Tuile de carte (image si fournie, sinon peinture procédurale)
    drawTile(ctx, type, x, y, tx, ty, map) {
      const T = G.config.TILE;
      const key = 'tuile_' + type;
      const img = this.img[key];
      if (img) {
        const m = this.manifest[key];
        if (m.variants > 1) {
          const v = Math.floor(G.U.hash(tx, ty, 7) * m.variants);
          const w = img.naturalWidth / m.variants;
          ctx.drawImage(img, v * w, 0, w, img.naturalHeight, x, y, T, T);
        } else {
          ctx.drawImage(img, x, y, T, T);
        }
        return;
      }
      const paint = G.placeholders.tiles[type] || G.placeholders.tiles.sol;
      paint(ctx, x, y, T, tx, ty, map);
    },
  };

  // Choisit l'animation la plus proche de celle demandée
  function resolveAnim(m, name) {
    const an = m.anims || {};
    const tries = [];
    if (name) {
      tries.push([name, false]);
      if (/_left$/.test(name)) tries.push([name.replace(/_left$/, '_right'), true]);
      if (/_right$/.test(name)) tries.push([name.replace(/_right$/, '_left'), true]);
      const dir = (name.match(/_(up|down|left|right)$/) || [])[1];
      const baseName = name.replace(/_(up|down|left|right)$/, '');
      tries.push([baseName, false]);
      if (dir) {
        tries.push(['idle_' + dir, false]);
        if (dir === 'left') tries.push(['idle_right', true]);
      }
    }
    tries.push(['idle', false], ['idle_down', false]);
    for (const [n, flip] of tries) {
      const a = an[n];
      if (!a) continue;
      if (Array.isArray(a)) return { frames: a, fps: m.fps || 8, flip, loop: true };
      return { frames: a.frames, fps: a.fps || m.fps || 8, flip, loop: a.loop !== false };
    }
    return { frames: [0], fps: 1, flip: false, loop: true };
  }

  // Teinte une image (flash blanc)
  const tmp = document.createElement('canvas');
  const tctx = tmp.getContext('2d');
  function tinted(img, sx, sy, sw, sh, dw, dh, color, amount) {
    tmp.width = Math.max(1, Math.ceil(dw));
    tmp.height = Math.max(1, Math.ceil(dh));
    tctx.globalCompositeOperation = 'source-over';
    tctx.globalAlpha = 1;
    tctx.clearRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    tctx.globalCompositeOperation = 'source-atop';
    tctx.globalAlpha = amount;
    tctx.fillStyle = color;
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    return tmp;
  }

  G.assets = A;
})();
