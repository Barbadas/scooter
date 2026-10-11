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
      shadows: [], shadowSlots: 2,   // ombres invoquées en combat (augmente avec l'histoire)
      chapter: 0, pos: null, steps: 0,
    };
  }

  function resetScreens() {
    ['dialogue', 'battle-ui', 'sysmsg', 'overlay', 'system'].forEach(id => { $(id).hidden = true; });
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
    const v = await G.ui.overlay('Vous êtes mort', 'Le Système ne tolère pas la faiblesse.', [
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

  // ───────────── Fond animé de l'écran titre ─────────────
  const tcan = $('title-bg'), tctx = tcan.getContext('2d');
  const tParts = [];
  const ARMY = [
    ['chef_gobelin', -0.3, 0.9, 1.0], ['gobelin', -0.19, 0.84, 0.75], ['loup', -0.4, 0.8, 0.7], ['gobelin_archer', -0.12, 0.78, 0.55],
    ['gardien', 0.3, 0.9, 0.9], ['gobelin', 0.2, 0.83, 0.75], ['loup', 0.41, 0.81, 0.7], ['gobelin', 0.12, 0.78, 0.55],
  ];
  function renderTitleBg(dt) {
    if ($('title').hidden) return;
    if (G.assets.has('fond_titre')) { tcan.hidden = true; return; } // l'image fournie remplace l'animation
    const w = tcan.clientWidth, h = tcan.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (tcan.width !== Math.round(w * dpr) || tcan.height !== Math.round(h * dpr)) { tcan.width = Math.round(w * dpr); tcan.height = Math.round(h * dpr); }
    const c = tctx, t = G.time;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#02040a'); bg.addColorStop(1, '#0a0820');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    const px = w / 2, py = h * 0.36, S = Math.min(w * 0.9, h * 0.95);
    // portail géant derrière le titre
    c.save();
    c.translate(px, py + S * 0.5);
    G.placeholders.portail(c, S, { t: t * 0.6 });
    c.restore();
    // cercle runique au sol
    G.battle.runeCircle(c, px, h * 0.9, Math.min(w * 0.42, h * 0.55), '63,180,255', t * 0.15, 0.35);
    // l'armée des ombres émerge de chaque côté
    const unit = Math.min(w, h * 1.2);
    for (const [key, xk, yk, sk] of ARMY) {
      const m = G.assets.manifest[key] || { size: 1 };
      const scale = (unit * 0.16 * sk) / (m.size * G.config.TILE);
      G.assets.draw(c, key, px + xk * unit, h * yk, { dir: xk < 0 ? 'right' : 'left', t: t + xk * 7, shadow: true, scale, alpha: 0.55 + 0.25 * Math.sin(t * 1.3 + xk * 9) });
    }
    // le héros, de dos, face au portail
    const hs = (h * 0.2) / (1.3 * G.config.TILE);
    G.assets.draw(c, 'heros', px, h * 0.93, { dir: 'up', t, scale: hs, glow: true });
    // particules qui montent
    if (tParts.length < 90 && Math.random() < dt * 30) tParts.push({ x: Math.random() * w, y: h + 10, vy: -20 - Math.random() * 50, r: 0.8 + Math.random() * 2, life: 3 + Math.random() * 3, age: 0, rgb: Math.random() < 0.6 ? '90,170,255' : '160,120,255' });
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const q of tParts) {
      q.age += dt; q.y += q.vy * dt; q.x += Math.sin(q.age * 2 + q.r) * 8 * dt;
      const a = Math.min(1, q.age) * Math.max(0, 1 - q.age / q.life);
      c.globalAlpha = a;
      c.drawImage(G.scenes.overworld.glowSprite(q.rgb), q.x - q.r * 3, q.y - q.r * 3, q.r * 6, q.r * 6);
    }
    c.restore();
    for (let i = tParts.length - 1; i >= 0; i--) if (tParts[i].age > tParts[i].life) tParts.splice(i, 1);
    const v = c.createRadialGradient(px, h * 0.45, Math.min(w, h) * 0.3, px, h * 0.45, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.75)');
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

  // Outils de test (console du navigateur) : G.debug.xp(200), G.debug.learn('extraction')…
  G.debug = {
    xp(n = 100) { G.hunter.gainXp(n); },
    learn(id) { G.hunter.learn(id); },
    flag(f) { G.state.flags[f] = true; },
    heal() { const d = G.hunter.derived(G.state.hunter); G.state.hunter.hp = d.maxHp; G.state.hunter.mp = d.maxMp; },
    give(id, q = 1) { G.inventory.add(id, q); },
    go(map, x, y) { G.scenes.overworld.load(map, x, y); },
    shadow(base) { const e = G.data.enemies[base]; G.state.shadows.push({ id: `ombre_${Date.now()}`, base, name: e.shadowName || e.name }); },
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
