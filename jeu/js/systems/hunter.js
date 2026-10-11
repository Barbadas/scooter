/* Le survivant : statistiques, niveaux, techniques, armes, munitions, artefacts.
   (Le nom de fichier « hunter » est historique : l'objet G.hunter gère le personnage.) */
G.hunter = {
  create(name) {
    const h = {
      name: name || G.config.DEFAULT_NAME,
      level: 1,
      xp: 0,
      stats: Object.assign({}, G.config.START_STATS),
      points: 0,
      skills: [],
      title: 'Récupérateur',
      clan: 'Clan du Corbeau',
      hp: 1, mp: 1,
    };
    const d = this.derived(h);
    h.hp = d.maxHp; h.mp = d.maxMp;
    return h;
  },

  // Statistiques de combat calculées (mp = énergie)
  derived(h) {
    const s = h.stats, L = h.level;
    return {
      maxHp: 50 + s.end * 5 + (L - 1) * 8,
      maxMp: 20 + s.ins * 2 + (L - 1) * 2,
      atk: s.for * 2,
      tir: s.pre * 2,
      def: Math.round(s.end * 0.5 + L),
      spd: s.agi,
      crit: Math.min(0.6, 0.04 + s.ins * 0.006),
      eva: Math.min(0.4, s.agi * 0.004),
      acc: 1 + (s.pre - 10) * 0.01,
    };
  },

  xpToNext(level) { return Math.round(20 * Math.pow(level, 1.4)); },

  gainXp(n) {
    const h = G.state.hunter;
    if (n <= 0) return 0;
    h.xp += n;
    let ups = 0;
    while (h.xp >= this.xpToNext(h.level)) {
      h.xp -= this.xpToNext(h.level);
      h.level++;
      ups++;
      h.points += G.config.STAT_POINTS_PER_LEVEL;
      const d = this.derived(h);
      h.hp = d.maxHp; h.mp = d.maxMp;
      G.ui.notify(`Niveau ${h.level} ! +${G.config.STAT_POINTS_PER_LEVEL} points à répartir dans le carnet. PV et ÉN restaurés.`, 'level', 'Niveau supérieur');
      for (const id in G.data.skills) {
        const sk = G.data.skills[id];
        if (sk.unlockLevel && sk.unlockLevel <= h.level) this.learn(id);
      }
    }
    return ups;
  },

  learn(id) {
    const h = G.state.hunter;
    const sk = G.data.skills[id];
    if (!sk || h.skills.includes(id)) return false;
    h.skills.push(id);
    G.ui.notify(`${sk.name}${sk.cost ? ` (${sk.cost} ÉN)` : ''} — ${sk.desc || ''}`, 'skill', 'Nouvelle technique');
    return true;
  },

  allocate(stat) {
    const h = G.state.hunter;
    if (h.points <= 0 || !(stat in h.stats)) return false;
    const before = this.derived(h);
    h.stats[stat]++;
    h.points--;
    const after = this.derived(h);
    h.hp += after.maxHp - before.maxHp;
    h.mp += after.maxMp - before.maxMp;
    return true;
  },

  heal(hp, mp) {
    const h = G.state.hunter, d = this.derived(h);
    h.hp = Math.min(d.maxHp, h.hp + (hp || 0));
    h.mp = Math.min(d.maxMp, h.mp + (mp || 0));
  },

  clamp() {
    const h = G.state.hunter, d = this.derived(h);
    h.hp = G.U.clamp(Math.round(h.hp), 0, d.maxHp);
    h.mp = G.U.clamp(Math.round(h.mp), 0, d.maxMp);
  },
};

// Inventaire (munitions comprises : 1 unité = 1 balle)
G.inventory = {
  add(id, qty = 1) {
    const inv = G.state.inventory;
    inv[id] = (inv[id] || 0) + qty;
  },
  remove(id, qty = 1) {
    const inv = G.state.inventory;
    if (!inv[id]) return false;
    inv[id] -= qty;
    if (inv[id] <= 0) delete inv[id];
    return true;
  },
  count(id) { return G.state.inventory[id] || 0; },
  list(filter) {
    return Object.entries(G.state.inventory).filter(([id, q]) => q > 0 && G.data.items[id] && (!filter || filter(G.data.items[id])));
  },
  // Utilisation hors combat
  use(id) {
    const it = G.data.items[id];
    if (!it || !G.state.inventory[id] || !it.heal) return false;
    const h = G.state.hunter, d = G.hunter.derived(h);
    if ((!it.heal.hp || h.hp >= d.maxHp) && (!it.heal.mp || h.mp >= d.maxMp)) {
      G.ui.notify('Inutile pour le moment : déjà au maximum.', 'hint');
      return false;
    }
    G.hunter.heal(it.heal.hp, it.heal.mp);
    this.remove(id);
    G.ui.notify(`${it.name} utilisée.`, 'hint');
    return true;
  },
};

// Armes et munitions
G.weapons = {
  def(id) { return G.data.weapons[id]; },
  owned() { return Object.keys(G.data.weapons).filter(id => G.state.weapons[id]); },
  give(id, ammo = 0) {
    const w = this.def(id);
    if (!w) return;
    if (!G.state.weapons[id]) {
      G.state.weapons[id] = { mag: w.mag || 0 };
      G.ui.notify(`${w.name} — ${w.pros.join(' · ')}`, 'skill', 'Nouvelle arme');
      if (w.kind === 'gun') G.state.equipped = id;
    }
    if (ammo && w.ammo) {
      G.inventory.add(w.ammo, ammo);
      G.ui.notify(`${G.data.items[w.ammo].name} × ${ammo}`, 'hint', 'Munitions');
    }
  },
  reserve(id) { const w = this.def(id); return w && w.ammo ? G.inventory.count(w.ammo) : 0; },
  mag(id) { return (G.state.weapons[id] || {}).mag || 0; },
  canFire(id) { const w = this.def(id); return w.kind === 'melee' || this.mag(id) >= (w.perShot || 1); },
  needsReload(id) { const w = this.def(id); return w.kind === 'gun' && this.mag(id) < w.mag && this.reserve(id) > 0; },
  spend(id) { const w = this.def(id); if (w.kind === 'gun') G.state.weapons[id].mag = Math.max(0, this.mag(id) - (w.perShot || 1)); },
  reload(id) {
    const w = this.def(id);
    if (w.kind !== 'gun') return 0;
    const n = Math.min(w.mag - this.mag(id), this.reserve(id));
    if (n <= 0) return 0;
    G.state.weapons[id].mag += n;
    G.inventory.remove(w.ammo, n);
    return n;
  },
  reloadAll() { for (const id of this.owned()) this.reload(id); },
  // Texte court des munitions : « 6/8 · 16 »
  ammoText(id) {
    const w = this.def(id);
    return w.kind === 'melee' ? '∞' : `${this.mag(id)}/${w.mag} · ${this.reserve(id)}`;
  },
  // Dessin de l'arme tenue en main hors combat
  shown() { const id = G.state.equipped; return id && G.state.weapons[id] ? this.def(id).sprite : 'knife'; },
};

// Artefacts de transformation
G.artifacts = {
  owned() { return Object.keys(G.state.artifacts || {}).filter(id => G.data.artifacts[id]); },
  equipped() { const id = G.state.artifactEquipped; return id && G.state.artifacts[id] ? G.data.artifacts[id] : null; },
  give(id) {
    const a = G.data.artifacts[id];
    if (!a) return;
    G.state.artifacts[id] = true;
    if (!G.state.artifactEquipped) G.state.artifactEquipped = id;
    G.ui.notify(`${a.name} — ${a.desc}`, 'skill', 'Artefact');
  },
};
