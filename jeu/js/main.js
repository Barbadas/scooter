/* Démarrage, boucle principale, écran titre, nouvelle partie / chargement. */
(function () {
  const $ = id => document.getElementById(id);
  const U = G.U;
  const W = G.config.WIDTH, H = G.config.HEIGHT;
  const canvas = $('screen');
  const ctx = canvas.getContext('2d');
  let DPR = 1;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
  }
  resize();
  window.addEventListener('resize', resize);

  G.lock = 0;      // > 0 : un événement est en cours, le joueur ne contrôle pas
  G.scene = null;

  // Tremblement / flash d'écran
  G.fx = {
    shakeT: 0, shakeDur: 1, flashA: 0, flashColor: '#fff', stopT: 0,
    shake(ms) { this.shakeT = ms / 1000; this.shakeDur = ms / 1000; },
    flash(color, a = 0.85) { this.flashColor = color; this.flashA = a; },
    hitstop(ms) { this.stopT = Math.max(this.stopT, ms / 1000); }, // micro-pause à l'impact
    update(dt) { this.shakeT = Math.max(0, this.shakeT - dt); this.flashA = Math.max(0, this.flashA - dt * 2.2); this.stopT = Math.max(0, this.stopT - dt); },
  };

  G.scenes.title = {
    render(c) {
      c.fillStyle = '#04060c';
      c.fillRect(0, 0, W, H);
    },
  };

  function freshState(name) {
    return {
      version: 1,
      hunter: G.hunter.create(name),
      inventory: {}, gold: 0,
      flags: {}, quests: {}, removed: {}, opened: {},
      weapons: { couteau: { mag: 0, lv: 0 } }, equipped: 'couteau',
      gear: {}, equip: {}, cleared: {}, explored: {},
      seed: Math.floor(Math.random() * 1e9), nights: 0,
      artifacts: {}, artifactEquipped: null,
      territories: {},
      chapter: 0, pos: null, steps: 0,
    };
  }

  function resetScreens() {
    ['dialogue', 'battle-ui', 'sysmsg', 'overlay', 'system', 'shop'].forEach(id => { $(id).hidden = true; });
    G.input.reset();
  }

  G.newGame = function (name) {
    G.state = freshState(name);
    G.lock = 0;
    resetScreens();
    $('title').hidden = true;
    G.ui.setFade(1);
    G.scene = G.scenes.overworld;
    const st = G.data.story.start;
    G.scenes.overworld.load(st.map);
    G.events.run(st.event);
  };

  G.continueGame = function (data) {
    if (!data || !data.hunter) { G.toTitle(); return; }
    G.state = Object.assign(freshState(data.hunter.name), data);
    G.hunter.clamp();
    if (G.state.hunter.hp <= 0) G.state.hunter.hp = 1;
    G.lock = 0;
    resetScreens();
    $('title').hidden = true;
    G.ui.setFade(0);
    G.scene = G.scenes.overworld;
    const p = G.state.pos || { map: G.data.story.start.map };
    G.scenes.overworld.load(p.map, p.x, p.y, p.dir);
    G.ui.notify('Partie chargée.', 'hint');
  };

  G.gameOver = async function () {
    const v = await G.ui.overlay('Tu es mort', 'Les ruines ne pardonnent pas.', [
      { label: 'Charger la dernière sauvegarde', value: 'load', disabled: !G.save.exists() },
      { label: "Retour à l'écran titre", value: 'title' },
    ], true);
    if (v === 'load') G.continueGame(G.save.read());
    else G.toTitle();
  };

  G.toTitle = function () {
    G.state = null;
    G.lock = 0;
    resetScreens();
    G.ui.setFade(0);
    G.scene = G.scenes.title;
    showTitle();
  };

  // ───────────── Écran titre ─────────────
  async function showTitle() {
    const el = $('title');
    el.hidden = false;
    if (G.assets.has('fond_titre')) {
      el.style.backgroundImage = `linear-gradient(rgba(4,6,12,0.5), rgba(4,6,12,0.9)), url("${G.assets.src('fond_titre')}")`;
    }
    $('title-nameform').hidden = true;
    const hasSave = G.save.exists();
    const v = await G.ui.menu($('title-main'), [
      { label: 'Continuer', value: 'continue', disabled: !hasSave },
      { label: 'Nouvelle partie', value: 'new' },
    ], { cancel: false, start: hasSave ? 0 : 1 });
    if (v === 'continue') G.continueGame(G.save.read());
    else askName(hasSave);
  }

  function askName(hasSave) {
    const form = $('title-nameform'), input = $('title-nameinput');
    form.hidden = false;
    let warn = $('title-warn');
    if (!warn) {
      warn = document.createElement('p');
      warn.id = 'title-warn';
      warn.className = 'menu-desc';
      warn.style.textAlign = 'center';
      form.insertBefore(warn, form.querySelector('.title-form-btns'));
    }
    warn.textContent = hasSave ? 'La sauvegarde existante sera remplacée.' : '';
    input.value = G.config.DEFAULT_NAME;
    input.focus();
    input.select();
    form.onsubmit = e => {
      e.preventDefault();
      const name = input.value.trim().slice(0, 14) || G.config.DEFAULT_NAME;
      form.hidden = true;
      input.blur();
      G.newGame(name);
    };
    $('title-back').onclick = () => { form.hidden = true; showTitle(); };
  }

  // ───────────── Entrées ─────────────
  G.input.setBase(a => {
    const ow = G.scenes.overworld;
    if (G.scene !== ow) return;
    if (a === 'ok') ow.interact();
    else if (a === 'menu' && ow.canControl()) G.systemWindow.show();
  });
  $('hud-system').addEventListener('click', () => {
    if (G.scenes.overworld.canControl()) G.systemWindow.show();
  });
  canvas.addEventListener('pointerdown', e => {
    if (!G.battle.active) return;
    const r = canvas.getBoundingClientRect();
    G.battle.pointer((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height);
  });

  // ───────────── Fond animé de l'écran titre : une ville en ruines au crépuscule ─────────────
  const tcan = $('title-bg'), tctx = tcan.getContext('2d');
  const tParts = [];
  let skyline = null;
  function buildSkyline(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const layers = [
      { base: h * 0.8, hmin: h * 0.08, hmax: h * 0.26, col: '#2b1912', win: 0.04 },
      { base: h * 0.88, hmin: h * 0.1, hmax: h * 0.32, col: '#140c09', win: 0.07 },
    ];
    for (const L of layers) {
      let px = -20;
      while (px < w + 20) {
        const bw = 26 + Math.random() * 70, bh = L.hmin + Math.random() * (L.hmax - L.hmin);
        x.fillStyle = L.col;
        x.beginPath();
        x.moveTo(px, L.base);
        x.lineTo(px, L.base - bh);
        const steps = 3 + Math.floor(Math.random() * 4);
        for (let i = 1; i <= steps; i++) x.lineTo(px + (bw * i) / steps, L.base - bh + (Math.random() - 0.3) * bh * 0.35);
        x.lineTo(px + bw, L.base);
        x.closePath();
        x.fill();
        for (let wy = L.base - bh + 12; wy < L.base - 8; wy += 12) {
          for (let wx = px + 5; wx < px + bw - 6; wx += 10) {
            if (Math.random() < L.win) { x.fillStyle = 'rgba(255,150,60,0.8)'; x.fillRect(wx, wy, 3, 4); }
          }
        }
        px += bw + Math.random() * 6;
      }
      x.fillStyle = L.col;
      x.fillRect(0, L.base, w, h - L.base);
    }
    return c;
  }
  // Tour Eiffel brisée : la pointe arrachée penche dans le vide
  function eiffel(c, x, base, H) {
    const wb = H * 0.42;
    c.save();
    c.translate(x, base);
    c.fillStyle = '#1d120d';
    c.beginPath();
    c.moveTo(-wb / 2, 0);
    c.quadraticCurveTo(-wb * 0.18, -H * 0.25, -wb * 0.09, -H * 0.42);
    c.lineTo(wb * 0.09, -H * 0.42);
    c.quadraticCurveTo(wb * 0.18, -H * 0.25, wb / 2, 0);
    c.lineTo(wb * 0.33, 0);
    c.quadraticCurveTo(0, -H * 0.19, -wb * 0.33, 0);
    c.closePath();
    c.fill();
    c.fillRect(-wb * 0.27, -H * 0.22, wb * 0.54, H * 0.025);
    c.beginPath();
    c.moveTo(-wb * 0.1, -H * 0.42); c.lineTo(-wb * 0.05, -H * 0.7); c.lineTo(wb * 0.035, -H * 0.665); c.lineTo(wb * 0.1, -H * 0.42);
    c.closePath();
    c.fill();
    c.fillRect(-wb * 0.13, -H * 0.445, wb * 0.26, H * 0.022);
    c.strokeStyle = 'rgba(120,60,30,0.25)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < 6; i++) { const y = -H * (0.05 + i * 0.06); c.moveTo(-wb * (0.42 - i * 0.05), y); c.lineTo(wb * (0.42 - i * 0.05), y - H * 0.03); }
    c.stroke();
    c.save();
    c.translate(-wb * 0.015, -H * 0.685);
    c.rotate(-0.55);
    c.beginPath();
    c.moveTo(-wb * 0.035, 0); c.lineTo(-wb * 0.012, -H * 0.24); c.lineTo(wb * 0.012, -H * 0.24); c.lineTo(wb * 0.035, 0);
    c.closePath();
    c.fill();
    c.restore();
    c.restore();
  }
  function renderTitleBg(dt) {
    if ($('title').hidden) return;
    if (G.assets.has('fond_titre')) { tcan.hidden = true; return; } // l'image fournie remplace l'animation
    const w = tcan.clientWidth, h = tcan.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (tcan.width !== Math.round(w * dpr) || tcan.height !== Math.round(h * dpr)) {
      tcan.width = Math.round(w * dpr); tcan.height = Math.round(h * dpr);
      skyline = buildSkyline(w, h);
    }
    const c = tctx, t = G.time, px = w / 2;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0a0607'); sky.addColorStop(0.45, '#3a1610'); sky.addColorStop(0.72, '#a3441c'); sky.addColorStop(1, '#140c09');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    // lueur d'incendie à l'horizon
    const glow = c.createRadialGradient(px + w * 0.12, h * 0.74, 0, px + w * 0.12, h * 0.74, Math.max(w, h) * 0.55);
    glow.addColorStop(0, 'rgba(255,150,60,0.55)'); glow.addColorStop(1, 'rgba(255,150,60,0)');
    c.fillStyle = glow; c.fillRect(0, 0, w, h);
    // fumées qui dérivent
    for (let i = 0; i < 7; i++) {
      const sx = ((i * 0.23 + t * 0.006 * (1 + i % 3)) % 1.4 - 0.2) * w, sy = h * (0.2 + (i % 4) * 0.1), r = Math.min(w, h) * (0.25 + (i % 3) * 0.08);
      const g = c.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, 'rgba(20,12,10,0.55)'); g.addColorStop(1, 'rgba(20,12,10,0)');
      c.fillStyle = g; c.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    eiffel(c, px + w * 0.16, h * 0.82, Math.min(h * 0.62, w * 0.9));
    if (skyline) c.drawImage(skyline, 0, 0, w, h);
    // drapeau du clan et survivant de dos, fusil à l'épaule
    const unit = h * 0.2 / (1.3 * G.config.TILE);
    G.assets.draw(c, 'drapeau', px - Math.min(w * 0.22, h * 0.3), h * 0.96, { t, scale: unit * 1.1 });
    G.assets.draw(c, 'heros', px, h * 0.95, { dir: 'up', t, scale: unit, weapon: 'rifle' });
    // braises qui montent
    if (tParts.length < 110 && Math.random() < dt * 40) tParts.push({ x: Math.random() * w, y: h + 10, vy: -25 - Math.random() * 60, r: 0.8 + Math.random() * 2, life: 3 + Math.random() * 3, age: 0, rgb: Math.random() < 0.7 ? '255,150,60' : '255,210,140' });
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const q of tParts) {
      q.age += dt; q.y += q.vy * dt; q.x += Math.sin(q.age * 2 + q.r) * 14 * dt;
      c.globalAlpha = Math.min(1, q.age) * Math.max(0, 1 - q.age / q.life);
      c.drawImage(G.scenes.overworld.glowSprite(q.rgb), q.x - q.r * 3, q.y - q.r * 3, q.r * 6, q.r * 6);
    }
    c.restore();
    for (let i = tParts.length - 1; i >= 0; i--) if (tParts[i].age > tParts[i].life) tParts.splice(i, 1);
    const v = c.createRadialGradient(px, h * 0.45, Math.min(w, h) * 0.3, px, h * 0.45, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.7)');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
  }

  // ───────────── Boucle principale ─────────────
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    G.time += dt;
    try {
      const gdt = G.fx.stopT > 0 ? 0 : dt;
      G.fx.update(dt);
      U.updateTweens(gdt);
      if (G.scene && G.scene.update) G.scene.update(gdt);
      if (G.battle.active) G.battle.update(gdt);

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (G.fx.shakeT > 0) {
        const k = G.fx.shakeT / G.fx.shakeDur;
        ctx.translate(U.rand(-6, 6) * k, U.rand(-6, 6) * k);
      }
      if (G.scene && G.scene.render) G.scene.render(ctx);
      if (G.battle.active) G.battle.render(ctx);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (G.fx.flashA > 0) {
        ctx.globalAlpha = Math.min(1, G.fx.flashA);
        ctx.fillStyle = G.fx.flashColor;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      G.ui.frame();
      renderTitleBg(dt);
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(frame);
  }

  // Outils de test (console du navigateur) : G.debug.xp(200), G.debug.weapon('fusil'), G.debug.artifact('loup')…
  G.debug = {
    xp(n = 100) { G.hunter.gainXp(n); },
    learn(id) { G.hunter.learn(id); },
    flag(f) { G.state.flags[f] = true; },
    heal() { const d = G.hunter.derived(G.state.hunter); G.state.hunter.hp = d.maxHp; G.state.hunter.mp = d.maxMp; },
    give(id, q = 1) { G.inventory.add(id, q); },
    go(map, x, y) { G.scenes.overworld.load(map, x, y); },
    weapon(id, ammo = 30) { G.weapons.give(id, ammo); },
    artifact(id = 'loup') { G.artifacts.give(id); },
    gear(id) { G.gear.give(id); },
    gold(n = 200) { G.state.gold += n; },
    shop(id = 'armurerie') { G.events.run([{ shop: id }]); },
  };

  // ───────────── Démarrage ─────────────
  function start(hot) {
    G.assets.load().then(() => {
      requestAnimationFrame(t => { last = t; frame(t); });
      if (hot && hot.state) G.continueGame(hot.state);
      else G.toTitle();
    });
  }

  // Aperçu Artifact : conserve la partie en cours lors d'une mise à jour de la page
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    hot.snapshot(() => {
      if (!G.state) return {};
      G.scenes.overworld.storePos();
      return { state: JSON.parse(JSON.stringify(G.state)) };
    });
  }
  if (hot && hot.ready) hot.ready(start);
  else start((hot && hot.data) || {});
})();
