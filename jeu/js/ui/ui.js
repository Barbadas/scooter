/* Interface : dialogues, fenêtres du Système, menus, notifications, HUD. */
(function () {
  const $ = id => document.getElementById(id);
  const U = G.U;
  const ui = { currentMenu: null };

  // ───────────── Menu générique (clavier + souris + tactile) ─────────────
  // items : [{ label, sub, desc, value, disabled }]
  ui.menu = function (el, items, opts = {}) {
    return new Promise(resolve => {
      el.innerHTML = '';
      el.hidden = false;
      const cols = opts.columns || 1;
      el.classList.toggle('cols-2', cols === 2);
      if (opts.title) {
        const head = document.createElement('div');
        head.className = 'menu-head';
        head.textContent = opts.title;
        el.appendChild(head);
      }
      let idx = opts.start != null ? opts.start : Math.max(0, items.findIndex(it => !it.disabled));
      let done = false;
      const btns = items.map((it, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'menu-item' + (it.disabled ? ' disabled' : '');
        b.innerHTML = `<span class="mi-label">${U.esc(it.label)}</span>${it.sub ? `<span class="mi-sub">${U.esc(it.sub)}</span>` : ''}`;
        b.addEventListener('click', () => { idx = i; refresh(); choose(i); });
        b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { idx = i; refresh(); } });
        el.appendChild(b);
        return b;
      });
      function refresh() {
        btns.forEach((b, i) => b.classList.toggle('active', i === idx));
        if (opts.descEl) opts.descEl.textContent = (items[idx] && items[idx].desc) || '';
        if (opts.onFocus) opts.onFocus(items[idx] || null);
      }
      function choose(i) {
        const it = items[i];
        if (it && !it.disabled) finish(it.value);
      }
      function finish(v) {
        if (done) return;
        done = true;
        pop();
        if (ui.currentMenu === handle) ui.currentMenu = null;
        if (opts.descEl) opts.descEl.textContent = '';
        if (opts.onFocus) opts.onFocus(null);
        el.innerHTML = '';
        resolve(v);
      }
      const pop = G.input.push(a => {
        const n = items.length;
        if (!n) { if (a === 'cancel') finish(null); return; }
        if (cols > 1 && (a === 'up' || a === 'down')) { const j = idx + (a === 'up' ? -cols : cols); idx = j < 0 || j >= n ? (idx + n + (a === 'up' ? -1 : 1)) % n : j; refresh(); }
        else if (a === 'up' || (cols > 1 && a === 'left')) { idx = (idx - 1 + n) % n; refresh(); }
        else if (a === 'down' || (cols > 1 && a === 'right')) { idx = (idx + 1) % n; refresh(); }
        else if (a === 'ok') choose(idx);
        else if (a === 'cancel' && opts.cancel !== false) finish(null);
      });
      const handle = {
        items,
        choose(v) { const i = items.findIndex(it => it.value === v); if (i >= 0) { idx = i; refresh(); choose(i); } },
      };
      ui.currentMenu = handle;
      refresh();
    });
  };

  // ───────────── Dialogue / narration ─────────────
  const dlg = $('dialogue'), dlgName = $('dlg-name'), dlgText = $('dlg-text'), dlgPortrait = $('dlg-portrait');
  ui.say = function ({ name, text, portrait, narration }) {
    return new Promise(resolve => {
      const full = G.fmt(text);
      dlg.hidden = false;
      dlg.classList.toggle('narration', !!narration);
      dlgName.textContent = name || '';
      if (portrait) {
        const src = G.assets.src('portrait_' + portrait);
        dlgPortrait.hidden = false;
        dlgPortrait.innerHTML = src ? `<img src="${U.esc(src)}" alt="">` : U.esc((name || '?').charAt(0).toUpperCase());
      } else {
        dlgPortrait.hidden = true;
        dlgPortrait.innerHTML = '';
      }
      let shown = 0, typing = true;
      dlgText.textContent = '';
      const timer = setInterval(() => {
        shown = Math.min(full.length, shown + 2);
        dlgText.textContent = full.slice(0, shown);
        if (shown >= full.length) { clearInterval(timer); typing = false; }
      }, 28);
      const advance = () => {
        if (typing) { clearInterval(timer); typing = false; dlgText.textContent = full; return; }
        pop();
        dlg.onclick = null;
        resolve();
      };
      const pop = G.input.push(a => { if (a === 'ok' || a === 'cancel') advance(); });
      dlg.onclick = advance;
    });
  };
  ui.hideDialogue = () => { dlg.hidden = true; };

  // ───────────── Fenêtre du Système (message / choix) ─────────────
  const sm = $('sysmsg'), smBox = sm.querySelector('.sysmsg-box');
  const smTitle = $('sysmsg-title'), smText = $('sysmsg-text'), smMenu = $('sysmsg-menu'), smOk = $('sysmsg-ok');
  function openSys(title, text, alert) {
    smTitle.textContent = `[ ${title} ]`;
    smText.textContent = text;
    smBox.classList.toggle('alert', !!alert);
    sm.hidden = false;
    smBox.style.animation = 'none';
    void smBox.offsetWidth;
    smBox.style.animation = '';
  }
  ui.system = function (text, title, alert) {
    return new Promise(resolve => {
      openSys(title || 'Notification', text, alert);
      smMenu.innerHTML = '';
      smOk.hidden = false;
      let ready = false;
      setTimeout(() => { ready = true; }, 280);
      const close = () => {
        if (!ready) return;
        pop();
        sm.onclick = null;
        sm.hidden = true;
        resolve();
      };
      const pop = G.input.push(a => { if (a === 'ok' || a === 'cancel') close(); });
      sm.onclick = close;
    });
  };
  ui.choice = async function (text, labels, title) {
    openSys(title || 'Système', text, false);
    smOk.hidden = true;
    sm.onclick = null;
    const v = await ui.menu(smMenu, labels.map((label, i) => ({ label, value: i })), { cancel: false });
    sm.hidden = true;
    return v;
  };

  // ───────────── Notifications ─────────────
  const toasts = $('toasts');
  const HEADS = { level: 'Niveau supérieur', skill: 'Compétence', quest: 'Quête', hint: 'Système', system: 'Notification' };
  ui.notify = function (text, kind = 'system', head) {
    const el = document.createElement('div');
    el.className = 'toast syswin ' + kind;
    el.innerHTML = `<b>[ ${U.esc(head || HEADS[kind] || 'Système')} ]</b>${U.esc(text)}`;
    toasts.appendChild(el);
    while (toasts.children.length > 4) toasts.firstChild.remove();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 450);
    }, kind === 'hint' ? 5500 : 4300);
  };

  // ───────────── Bannière (chapitres, boss) ─────────────
  const banner = $('banner');
  ui.banner = function (top, main, sub, ms = 2600) {
    banner.innerHTML = `<div class="bn-top">${U.esc(top || '')}</div><div class="bn-rule"></div>`
      + `<div class="bn-main">${U.esc(main || '')}</div>${sub ? `<div class="bn-sub">${U.esc(sub)}</div>` : ''}`;
    banner.hidden = false;
    banner.style.opacity = '0';
    void banner.offsetWidth;
    banner.style.opacity = '1';
    return new Promise(resolve => {
      setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => { banner.hidden = true; resolve(); }, 600);
      }, ms);
    });
  };

  // ───────────── Fondu au noir (sur l'écran de jeu) ─────────────
  const fader = $('fader');
  const fadeState = { a: 0 };
  ui.fade = (to, ms = 600) => U.tween(fadeState, { a: to }, ms, 'inOutQuad');
  ui.setFade = a => { fadeState.a = a; };

  // ───────────── Écrans plein cadre (fin de chapitre, game over) ─────────────
  const ov = $('overlay');
  ui.overlay = async function (title, sub, options, alert) {
    $('overlay-title').textContent = `[ ${title} ]`;
    $('overlay-sub').textContent = sub || '';
    ov.querySelector('.overlay-box').classList.toggle('alert', !!alert);
    ov.hidden = false;
    const v = await ui.menu($('overlay-menu'), options, { cancel: false });
    ov.hidden = true;
    return v;
  };
  ui.endChapter = async function ({ title, sub }) {
    const v = await ui.overlay(title, sub, [
      { label: 'Continuer à explorer', value: 'stay' },
      { label: "Retour à l'écran titre", value: 'title' },
    ]);
    if (v === 'title') { G.toTitle(); throw G.events.ABORT; }
  };

  // ───────────── HUD (mis à jour chaque image, écrit seulement si ça change) ─────────────
  const hud = $('hud');
  const battleUI = $('battle-ui'), dockIdle = $('dock-idle'), dockIdleMap = $('dock-idle-map');
  let hudSig = '';
  ui.frame = function () {
    const fo = fadeState.a.toFixed(3);
    if (fader.style.opacity !== fo) fader.style.opacity = fo;

    const st = G.state;
    const idle = !!st && dlg.hidden && battleUI.hidden;
    if (dockIdle.hidden === idle) dockIdle.hidden = !idle;
    if (idle && dockIdleMap.textContent !== G.scenes.overworld.mapName) dockIdleMap.textContent = G.scenes.overworld.mapName || '';
    const show = !!st && G.scene === G.scenes.overworld && !G.battle.active && fadeState.a < 0.5;
    if (!show) { if (!hud.hidden) { hud.hidden = true; hudSig = ''; } return; }
    const h = st.hunter, d = G.hunter.derived(h);
    const sig = [h.name, h.level, h.hp, h.mp, d.maxHp, d.maxMp, st.flags.eveil, st.flags.systeme, G.scenes.overworld.mapName].join('|');
    if (sig === hudSig) return;
    hudSig = sig;
    hud.hidden = false;
    $('hud-name').textContent = h.name;
    $('hud-lvl').textContent = st.flags.eveil ? `Niv. ${h.level}` : 'Rang E';
    $('hud-hp').style.width = `${Math.round(100 * U.clamp(h.hp / d.maxHp, 0, 1))}%`;
    $('hud-mp').style.width = `${Math.round(100 * U.clamp(h.mp / d.maxMp, 0, 1))}%`;
    $('hud-hp-txt').textContent = `${h.hp}/${d.maxHp}`;
    $('hud-mp-txt').textContent = `${h.mp}/${d.maxMp}`;
    $('hud-map').textContent = G.scenes.overworld.mapName || '';
    $('hud-system').hidden = !st.flags.systeme;
  };

  G.ui = ui;
})();
