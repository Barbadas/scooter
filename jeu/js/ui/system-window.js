/* Le carnet du survivant : statut et répartition des points, armes, techniques,
   sac, missions, territoires des clans, artefacts. */
(function () {
  const $ = id => document.getElementById(id);
  const esc = G.U.esc;
  const STAT_KEYS = ['for', 'end', 'agi', 'pre', 'ins'];
  const TABS = [
    { id: 'statut', label: 'Statut' },
    { id: 'armes', label: 'Armes' },
    { id: 'techniques', label: 'Techniques' },
    { id: 'sac', label: 'Sac' },
    { id: 'missions', label: 'Missions' },
    { id: 'territoires', label: 'Territoires' },
    { id: 'artefacts', label: 'Artefacts', show: () => G.artifacts.owned().length > 0 },
  ];
  const SW = { open: false, tab: 0, sel: 0 };
  const pct = (a, b) => Math.round(100 * G.U.clamp(a / b, 0, 1));
  const usable = it => !!it.heal;

  function tabs() { return TABS.filter(t => !t.show || t.show()); }
  function current() { const ts = tabs(); SW.tab = Math.min(SW.tab, ts.length - 1); return ts[SW.tab].id; }

  SW.show = function () {
    if (SW.open || !G.state) return Promise.resolve();
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
    if (id === 'sac') return G.inventory.list().length;
    if (id === 'armes') return G.weapons.owned().length;
    if (id === 'artefacts') return G.artifacts.owned().length;
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
    if (id === 'sac') {
      const it = G.inventory.list()[i];
      if (it && usable(G.data.items[it[0]])) G.inventory.use(it[0]);
      SW.sel = Math.min(SW.sel, Math.max(0, G.inventory.list().length - 1));
    }
    if (id === 'armes') {
      const w = G.weapons.owned()[i];
      if (w && G.data.weapons[w].kind === 'gun') { G.state.equipped = w; G.ui.notify(`${G.data.weapons[w].name} en main.`, 'hint'); }
    }
    if (id === 'artefacts') {
      const a = G.artifacts.owned()[i];
      if (a) G.state.artifactEquipped = a;
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
        <div class="st-line"><span>Clan</span><b>${esc(h.clan)}</b></div>
        <div class="st-line"><span>Rôle</span><b>${esc(h.title)}</b></div>
      </div>
      <div class="st-bars">
        <div class="st-bar"><span>PV</span><div class="bar hp"><i style="width:${pct(h.hp, d.maxHp)}%"></i></div><b>${h.hp} / ${d.maxHp}</b></div>
        <div class="st-bar"><span>ÉN</span><div class="bar mp"><i style="width:${pct(h.mp, d.maxMp)}%"></i></div><b>${h.mp} / ${d.maxMp}</b></div>
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
        <span>CORPS À CORPS <b>${d.atk}</b></span><span>TIR <b>${d.tir}</b></span><span>DÉF <b>${d.def}</b></span>
        <span>VITESSE <b>${d.spd}</b></span><span>CRIT <b>${Math.round(d.crit * 100)} %</b></span><span>ESQUIVE <b>${Math.round(d.eva * 100)} %</b></span>
      </div>
      <p class="menu-desc">${esc(G.STATS[STAT_KEYS[SW.sel]].hint)}</p>`;
  }

  function renderWeapons() {
    const owned = G.weapons.owned();
    if (!owned.length) return '<p class="empty-note">Aucune arme.</p>';
    return `<div class="wp-list">${owned.map((id, i) => {
      const w = G.data.weapons[id], eq = G.state.equipped === id;
      return `<div class="wp-item ${i === SW.sel ? 'active' : ''}" data-i="${i}">
        <div class="wp-head"><b>${esc(w.name)}</b><small>${w.kind === 'melee' ? 'Corps à corps' : `Munitions ${esc(G.weapons.ammoText(id))}`}${eq ? ' · en main' : ''}</small></div>
        <div class="wp-cols">
          <ul class="wp-pros">${w.pros.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
          <ul class="wp-cons">${w.cons.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        </div>
        <div class="wp-stats">Dégâts ×${w.power}${w.hits ? ` × ${w.hits} balles` : ''} · Précision ${Math.round(w.acc * 100)} %${w.mag ? ` · Chargeur ${w.mag}` : ''}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderSkills() {
    const h = G.state.hunter;
    const all = Object.values(G.data.skills).filter(s => s.desc && !s.beast);
    const known = h.skills.map(id => G.data.skills[id]).filter(s => s && !s.beast);
    const locked = all.filter(s => !h.skills.includes(s.id)).length;
    return `<div class="sk-list">
      <div class="sk-item"><div class="sk-head"><b>Défense</b><small>0 ÉN</small></div><p>Divise les dégâts reçus par deux jusqu'à ton prochain tour et récupère 3 ÉN.</p></div>
      ${known.map(s => `<div class="sk-item"><div class="sk-head"><b>${esc(s.name)}</b><small>${s.cost || 0} ÉN</small></div><p>${esc(s.desc || '')}</p></div>`).join('')}
      ${locked ? `<div class="sk-item locked"><div class="sk-head"><b>??? × ${locked}</b></div><p>Techniques à apprendre en gagnant des niveaux ou au fil de l’histoire.</p></div>` : ''}
    </div>`;
  }

  function renderBag() {
    const list = G.inventory.list();
    const items = list.map(([id, q], i) => {
      const it = G.data.items[id];
      const tag = it.ammo ? 'Munitions' : it.key ? 'Objet de mission' : it.blast || it.smoke ? 'Combat' : '';
      return `<div class="inv-item ${i === SW.sel ? 'active' : ''}" data-i="${i}">
        <div class="inv-head"><b>${esc(it.name)}</b><small>× ${q}${tag ? ` · ${tag}` : ''}</small></div>
        <p>${esc(it.desc)}</p>
        ${usable(it) ? `<button type="button" class="sys-btn inv-use" data-item="${id}">Utiliser</button>` : ''}
      </div>`;
    }).join('');
    return `<div class="gold-line">Ferraille : ${G.state.gold}</div>`
      + (list.length ? `<div class="inv-list">${items}</div>` : '<p class="empty-note">Sac vide.</p>');
  }

  function renderQuests() {
    const ids = Object.keys(G.state.quests).sort((a, b) => G.state.quests[a].done - G.state.quests[b].done);
    if (!ids.length) return '<p class="empty-note">Aucune mission pour le moment.</p>';
    return `<div class="q-list">${ids.map(id => {
      const q = G.data.quests[id], st = G.state.quests[id];
      return `<div class="q-item">
        <div class="q-head"><b>${esc(q.title)}</b>${st.done ? '<span class="q-done">ACCOMPLIE</span>' : ''}</div>
        <p>${esc(q.desc || '')}</p>
        ${q.objectives.map((o, i) => `<div class="q-obj"><span>${esc(o.label)}</span><span>${Math.min(st.progress[i], o.target)} / ${o.target}</span></div>`).join('')}
      </div>`;
    }).join('')}</div>`;
  }

  function renderTerritories() {
    return `<div class="tr-list">${Object.entries(G.data.territories).map(([id, t]) => {
      const owner = G.state.territories[id] || t.owner, c = G.data.clans[owner];
      return `<div class="tr-item">
        <div class="tr-head"><b>${esc(t.name)}</b><span class="tr-clan" style="--clan:${c.color}">${esc(c.name)}</span></div>
        <p>${esc(t.desc)}</p>
      </div>`;
    }).join('')}</div>`;
  }

  function renderArtifacts() {
    const list = G.artifacts.owned();
    return `<div class="sk-list">${list.map((id, i) => {
      const a = G.data.artifacts[id], eq = G.state.artifactEquipped === id;
      return `<div class="sk-item ${i === SW.sel ? 'active' : ''}" data-i="${i}">
        <div class="sk-head"><b>${esc(a.name)}</b><small>${eq ? 'Équipé' : 'Espace pour équiper'}</small></div>
        <p>${esc(a.desc)}</p>
        <p>Forme : <b>${esc(a.form.name)}</b> pendant ${a.form.turns} tours. Remplis la jauge de BÊTE en combat pour te transformer.</p>
      </div>`;
    }).join('')}</div>`;
  }

  function render() {
    const ts = tabs(), id = current();
    $('system-tabs').innerHTML = ts.map((t, i) => `<button type="button" data-tab="${i}" class="${i === SW.tab ? 'active' : ''}">${t.label}</button>`).join('');
    const html = { statut: renderStatus, armes: renderWeapons, techniques: renderSkills, sac: renderBag, missions: renderQuests, territoires: renderTerritories, artefacts: renderArtifacts }[id]();
    $('system-content').innerHTML = `<div class="sys-title" style="margin-bottom:12px">${esc(ts[SW.tab].label)}</div>${html}`;
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
      if (row) {
        const i = +row.dataset.i;
        if (SW.sel === i && (current() === 'armes' || current() === 'artefacts')) activate(i);
        else { SW.sel = i; render(); }
      }
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
