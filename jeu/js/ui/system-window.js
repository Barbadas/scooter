/* La fenêtre du Système : statut, répartition des points, compétences, inventaire, quêtes, ombres. */
(function () {
  const $ = id => document.getElementById(id);
  const esc = G.U.esc;
  const STAT_KEYS = ['str', 'vit', 'agi', 'int', 'per'];
  const TABS = [
    { id: 'statut', label: 'Statut' },
    { id: 'competences', label: 'Compétences' },
    { id: 'inventaire', label: 'Inventaire' },
    { id: 'quetes', label: 'Quêtes' },
    { id: 'ombres', label: 'Ombres', show: () => G.state.hunter.skills.includes('extraction') },
  ];
  const SW = { open: false, tab: 0, sel: 0 };
  const pct = (a, b) => Math.round(100 * G.U.clamp(a / b, 0, 1));

  function tabs() { return TABS.filter(t => !t.show || t.show()); }
  function current() { const ts = tabs(); SW.tab = Math.min(SW.tab, ts.length - 1); return ts[SW.tab].id; }

  SW.show = function () {
    if (SW.open || !G.state || !G.state.flags.systeme) return Promise.resolve();
    SW.open = true;
    SW.sel = 0;
    $('system').hidden = false;
    render();
    return new Promise(resolve => {
      SW._resolve = resolve;
      SW._pop = G.input.push(onAction);
    });
  };
  SW.close = function () {
    if (!SW.open) return;
    SW.open = false;
    $('system').hidden = true;
    SW._pop();
    SW._resolve();
  };

  function selectable() {
    const id = current();
    if (id === 'statut') return STAT_KEYS.length;
    if (id === 'inventaire') return G.inventory.list().length;
    return 0;
  }

  function onAction(a) {
    const ts = tabs();
    if (a === 'cancel' || a === 'menu') return SW.close();
    if (a === 'left') { SW.tab = (SW.tab - 1 + ts.length) % ts.length; SW.sel = 0; return render(); }
    if (a === 'right') { SW.tab = (SW.tab + 1) % ts.length; SW.sel = 0; return render(); }
    const n = selectable();
    if (!n) return;
    if (a === 'up') { SW.sel = (SW.sel - 1 + n) % n; render(); }
    else if (a === 'down') { SW.sel = (SW.sel + 1) % n; render(); }
    else if (a === 'ok') activate(SW.sel);
  }

  function activate(i) {
    const id = current();
    if (id === 'statut') G.hunter.allocate(STAT_KEYS[i]);
    if (id === 'inventaire') {
      const it = G.inventory.list()[i];
      if (it) G.inventory.use(it[0]);
      SW.sel = Math.min(SW.sel, Math.max(0, G.inventory.list().length - 1));
    }
    render();
  }

  // ───────────── Rendu des onglets ─────────────
  function renderStatus() {
    const h = G.state.hunter, d = G.hunter.derived(h), need = G.hunter.xpToNext(h.level);
    return `
      <div class="st-grid">
        <div class="st-line"><span>Nom</span><b>${esc(h.name)}</b></div>
        <div class="st-line"><span>Niveau</span><b>${h.level}</b></div>
        <div class="st-line"><span>Classe</span><b>${esc(h.job)}</b></div>
        <div class="st-line"><span>Titre</span><b>${esc(h.title)}</b></div>
      </div>
      <div class="st-bars">
        <div class="st-bar"><span>PV</span><div class="bar hp"><i style="width:${pct(h.hp, d.maxHp)}%"></i></div><b>${h.hp} / ${d.maxHp}</b></div>
        <div class="st-bar"><span>PM</span><div class="bar mp"><i style="width:${pct(h.mp, d.maxMp)}%"></i></div><b>${h.mp} / ${d.maxMp}</b></div>
        <div class="st-bar"><span>EXP</span><div class="bar xp"><i style="width:${pct(h.xp, need)}%"></i></div><b>${h.xp} / ${need}</b></div>
      </div>
      <div class="st-stats">
        ${STAT_KEYS.map((k, i) => `
          <div class="st-stat ${i === SW.sel ? 'active' : ''}" data-i="${i}">
            <abbr title="${esc(G.STATS[k].name)}">${G.STATS[k].abbr}</abbr><em>${G.STATS[k].name}</em><b>${h.stats[k]}</b>
            <button type="button" class="st-plus" data-stat="${k}" ${h.points ? '' : 'disabled'} aria-label="Augmenter ${esc(G.STATS[k].name)}">+</button>
          </div>`).join('')}
      </div>
      <div class="st-points">Points disponibles : <b>${h.points}</b></div>
      <div class="st-derived">
        <span>ATQ <b>${d.atk}</b></span><span>DÉF <b>${d.def}</b></span><span>MAG <b>${d.mag}</b></span>
        <span>VITESSE <b>${d.spd}</b></span><span>CRIT <b>${Math.round(d.crit * 100)} %</b></span><span>ESQUIVE <b>${Math.round(d.eva * 100)} %</b></span>
      </div>
      <p class="menu-desc">${esc(G.STATS[STAT_KEYS[SW.sel]].hint)}</p>`;
  }

  function renderSkills() {
    const h = G.state.hunter;
    const all = Object.values(G.data.skills).filter(s => s.desc);
    const known = h.skills.map(id => G.data.skills[id]).filter(Boolean);
    const locked = all.filter(s => !h.skills.includes(s.id)).length;
    return `<div class="sk-list">
      <div class="sk-item"><div class="sk-head"><b>Attaque</b><small>0 PM</small></div><p>Attaque de base avec ton arme.</p></div>
      <div class="sk-item"><div class="sk-head"><b>Défense</b><small>0 PM</small></div><p>Divise les dégâts reçus par deux jusqu'à ton prochain tour et récupère 3 PM.</p></div>
      ${known.map(s => `<div class="sk-item"><div class="sk-head"><b>${esc(s.name)}</b><small>${s.passive ? 'Passive' : `${s.cost || 0} PM`}</small></div><p>${esc(s.desc || '')}</p></div>`).join('')}
      ${locked ? `<div class="sk-item locked"><div class="sk-head"><b>??? × ${locked}</b></div><p>Compétences verrouillées. Le Système les révélera au fil de ta progression.</p></div>` : ''}
    </div>`;
  }

  function renderInventory() {
    const list = G.inventory.list();
    const items = list.map(([id, q], i) => {
      const it = G.data.items[id];
      return `<div class="inv-item ${i === SW.sel ? 'active' : ''}" data-i="${i}">
        <div class="inv-head"><b>${esc(it.name)}</b><small>× ${q}</small></div>
        <p>${esc(it.desc)}</p>
        ${it.heal ? `<button type="button" class="sys-btn inv-use" data-item="${id}">Utiliser</button>` : ''}
      </div>`;
    }).join('');
    return `<div class="gold-line">Or : ${G.state.gold}</div>`
      + (list.length ? `<div class="inv-list">${items}</div>` : '<p class="empty-note">Inventaire vide.</p>');
  }

  function renderQuests() {
    const ids = Object.keys(G.state.quests).sort((a, b) => G.state.quests[a].done - G.state.quests[b].done);
    if (!ids.length) return '<p class="empty-note">Aucune quête pour le moment.</p>';
    return `<div class="q-list">${ids.map(id => {
      const q = G.data.quests[id], st = G.state.quests[id];
      return `<div class="q-item">
        <div class="q-head"><b>${esc(q.title)}</b>${st.done ? '<span class="q-done">TERMINÉE</span>' : ''}</div>
        <p>${esc(q.desc || '')}</p>
        ${q.objectives.map((o, i) => `<div class="q-obj"><span>${esc(o.label)}</span><span>${Math.min(st.progress[i], o.target)} / ${o.target}</span></div>`).join('')}
      </div>`;
    }).join('')}</div>`;
  }

  function renderShadows() {
    const list = G.state.shadows || [];
    if (!list.length) return '<p class="empty-note">Aucune ombre pour l’instant. Après une victoire, tente une extraction sur un ennemi vaincu.</p>';
    return `<div class="sk-list">${list.map(s => {
      const e = G.data.enemies[s.base];
      return `<div class="sk-item"><div class="sk-head"><b>${esc(s.name)}</b><small>Rang ${esc(e ? e.rank : '?')}</small></div><p>Soldat de l'armée des ombres. Combat à tes côtés.</p></div>`;
    }).join('')}</div>`;
  }

  function render() {
    const ts = tabs(), id = current();
    $('system-tabs').innerHTML = ts.map((t, i) => `<button type="button" data-tab="${i}" class="${i === SW.tab ? 'active' : ''}">${t.label}</button>`).join('');
    const html = { statut: renderStatus, competences: renderSkills, inventaire: renderInventory, quetes: renderQuests, ombres: renderShadows }[id]();
    $('system-content').innerHTML = `<div class="sys-title" style="margin-bottom:12px">[ ${esc(ts[SW.tab].label)} ]</div>${html}`;
  }

  // ───────────── Souris / tactile ─────────────
  function bind() {
    $('system-tabs').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (b) { SW.tab = +b.dataset.tab; SW.sel = 0; render(); }
    });
    $('system-content').addEventListener('click', e => {
      const plus = e.target.closest('.st-plus');
      if (plus) { SW.sel = STAT_KEYS.indexOf(plus.dataset.stat); G.hunter.allocate(plus.dataset.stat); render(); return; }
      const use = e.target.closest('.inv-use');
      if (use) { G.inventory.use(use.dataset.item); render(); return; }
      const row = e.target.closest('[data-i]');
      if (row) { SW.sel = +row.dataset.i; render(); }
    });
    $('system-save').addEventListener('click', () => {
      if (G.save.write()) G.ui.notify('Partie sauvegardée.', 'hint');
      else G.ui.notify('Sauvegarde impossible : le stockage du navigateur est bloqué.', 'hint');
    });
    $('system-close').addEventListener('click', () => SW.close());
    $('system').addEventListener('click', e => { if (e.target.id === 'system') SW.close(); });
  }
  bind();

  G.systemWindow = SW;
})();
