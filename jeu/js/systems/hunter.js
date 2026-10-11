/* Le chasseur : statistiques, niveaux, compétences. */
G.hunter = {
  create(name) {
    const h = {
      name: name || G.config.DEFAULT_NAME,
      level: 1,
      xp: 0,
      stats: Object.assign({}, G.config.START_STATS),
      points: 0,
      skills: [],
      title: 'Chasseur de rang E',
      job: 'Aucune',
      hp: 1, mp: 1,
    };
    const d = this.derived(h);
    h.hp = d.maxHp; h.mp = d.maxMp;
    return h;
  },

  // Statistiques de combat calculées à partir des stats de base
  derived(h) {
    const s = h.stats, L = h.level;
    return {
      maxHp: 50 + s.vit * 5 + (L - 1) * 8,
      maxMp: 20 + s.int * 3 + (L - 1) * 2,
      atk: s.str * 2,
      def: Math.round(s.vit * 0.5 + L),
      mag: s.int * 2,
      spd: s.agi,
      crit: Math.min(0.6, 0.05 + s.per * 0.005),
      eva: Math.min(0.4, s.agi * 0.004),
    };
  },

  xpToNext(level) { return Math.round(20 * Math.pow(level, 1.4)); },

  // Gagne de l'XP ; gère les montées de niveau (soin complet, points, compétences)
  gainXp(n) {
    const h = G.state.hunter;
    if (!G.state.flags.eveil || n <= 0) return 0;
    h.xp += n;
    let ups = 0;
    while (h.xp >= this.xpToNext(h.level)) {
      h.xp -= this.xpToNext(h.level);
      h.level++;
      ups++;
      h.points += G.config.STAT_POINTS_PER_LEVEL;
      const d = this.derived(h);
      h.hp = d.maxHp; h.mp = d.maxMp;
      G.ui.notify(`Niveau ${h.level} atteint ! +${G.config.STAT_POINTS_PER_LEVEL} points de statistiques. PV et PM restaurés.`, 'level', 'Niveau supérieur');
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
    G.ui.notify(`${sk.name}${sk.cost ? ` (${sk.cost} PM)` : ''} — ${sk.desc || ''}`, 'skill', 'Nouvelle compétence');
    return true;
  },

  allocate(stat) {
    const h = G.state.hunter;
    if (h.points <= 0 || !(stat in h.stats)) return false;
    const before = this.derived(h);
    h.stats[stat]++;
    h.points--;
    const after = this.derived(h);
    // Les gains de PV/PM max s'ajoutent aussi aux PV/PM actuels
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

// Inventaire
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
  list() {
    return Object.entries(G.state.inventory).filter(([id, q]) => q > 0 && G.data.items[id]);
  },
  // Utilisation hors combat
  use(id) {
    const it = G.data.items[id];
    if (!it || !G.state.inventory[id]) return false;
    const h = G.state.hunter, d = G.hunter.derived(h);
    if (it.heal) {
      if ((!it.heal.hp || h.hp >= d.maxHp) && (!it.heal.mp || h.mp >= d.maxMp)) {
        G.ui.notify('Inutile pour le moment : déjà au maximum.', 'hint');
        return false;
      }
      G.hunter.heal(it.heal.hp, it.heal.mp);
    }
    this.remove(id);
    G.ui.notify(`${it.name} utilisée.`, 'hint');
    return true;
  },
};
