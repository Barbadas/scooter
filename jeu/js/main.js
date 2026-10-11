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
    shakeT: 0, shakeDur: 1, flashA: 0, flashColor: '#fff',
    shake(ms) { this.shakeT = ms / 1000; this.shakeDur = ms / 1000; },
    flash(color, a = 0.85) { this.flashColor = color; this.flashA = a; },
    update(dt) { this.shakeT = Math.max(0, this.shakeT - dt); this.flashA = Math.max(0, this.flashA - dt * 2.2); },
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

  // ───────────── Boucle principale ─────────────
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    G.time += dt;
    try {
      U.updateTweens(dt);
      G.fx.update(dt);
      if (G.scene && G.scene.update) G.scene.update(dt);
      if (G.battle.active) G.battle.update(dt);

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
