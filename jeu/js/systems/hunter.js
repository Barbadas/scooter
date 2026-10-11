/* Le survivant : statistiques, niveaux, techniques, armes, équipement, munitions, artefacts.
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
    const b = G.state && G.state.hunter === h ? G.gear.bonus() : {};
    return {
      maxHp: 50 + s.end * 5 + (L - 1) * 8 + (b.hp || 0),
      maxMp: 20 + s.ins * 2 + (L - 1) * 2 + (b.mp || 0),
      atk: s.for * 2 + (b.atk || 0),
      tir: s.pre * 2 + (b.tir || 0),
      def: Math.round(s.end * 0.5 + L) + (b.def || 0),
      spd: Math.max(1, s.agi + (b.spd || 0)),
      crit: Math.min(0.6, 0.04 + s.ins * 0.006 + (b.crit || 0)),
      eva: Math.min(0.45, s.agi * 0.004 + (b.eva || 0)),
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

// Armes et munitions (avec niveaux d'amélioration achetés à l'armurerie)
const WEAPON_MAX_LV = 5;
const wcache = {};
G.weapons = {
  MAX_LV: WEAPON_MAX_LV,
  level(id) { return (G.state.weapons[id] || {}).lv || 0; },
  // Caractéristiques effectives (niveau compris)
  def(id) {
    const base = G.data.weapons[id];
    if (!base || !G.state) return base;
    const lv = this.level(id);
    if (!lv) return base;
    const k = id + ':' + lv;
    if (wcache[k]) return wcache[k];
    const w = Object.assign({}, base);
    w.power = Math.round(base.power * (1 + 0.12 * lv) * 100) / 100;
    w.acc = Math.min(1.15, base.acc + 0.02 * lv);
    w.crit = (base.crit || 0) + 0.01 * lv;
    if (base.mag) w.mag = base.mag + Math.floor(lv / 2) * (base.magStep || 1);
    if (base.bleed) w.bleed = Object.assign({}, base.bleed, { chance: Math.min(0.6, base.bleed.chance + 0.04 * lv) });
    return (wcache[k] = w);
  },
  owned() { return Object.keys(G.data.weapons).filter(id => G.state.weapons[id]); },
  give(id, ammo = 0) {
    const w = this.def(id);
    if (!w) return;
    if (!G.state.weapons[id]) {
      G.state.weapons[id] = { mag: w.mag || 0, lv: 0 };
      G.ui.notify(`${w.name} — ${w.pros.join(' · ')}`, 'skill', 'Nouvelle arme');
      if (w.kind === 'gun') G.state.equipped = id;
    }
    if (ammo && w.ammo) {
      G.inventory.add(w.ammo, ammo);
      G.ui.notify(`${G.data.items[w.ammo].name} × ${ammo}`, 'hint', 'Munitions');
    }
  },
  // Coût du prochain niveau : ferraille + pièces détachées
  upgradeCost(id) {
    const lv = this.level(id), base = G.data.weapons[id];
    if (lv >= WEAPON_MAX_LV) return null;
    return { gold: Math.round((base.upgrade || 30) * (lv + 1) * (1 + lv * 0.25)), pieces: lv + 1 };
  },
  upgrade(id) {
    const c = this.upgradeCost(id);
    if (!c || G.state.gold < c.gold || G.inventory.count('pieces') < c.pieces) return false;
    G.state.gold -= c.gold;
    G.inventory.remove('pieces', c.pieces);
    G.state.weapons[id].lv = this.level(id) + 1;
    return true;
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
  // Nom avec niveau : « Pistolet 9 mm +2 »
  label(id) { const lv = this.level(id); return this.def(id).name + (lv ? ` +${lv}` : ''); },
  // Dessin de l'arme tenue en main hors combat
  shown() { const id = G.state.equipped; return id && G.state.weapons[id] ? this.def(id).sprite : 'knife'; },
};

// Équipement (tête, corps, pieds) — acheté et amélioré à la tente d'équipement
const GEAR_MAX_LV = 4;
G.gear = {
  MAX_LV: GEAR_MAX_LV,
  owned() { return Object.keys(G.data.gear).filter(id => G.state.gear[id]); },
  has(id) { return !!G.state.gear[id]; },
  level(id) { return (G.state.gear[id] || {}).lv || 0; },
  give(id) {
    const g = G.data.gear[id];
    if (!g) return;
    if (!G.state.gear[id]) G.state.gear[id] = { lv: 0 };
    G.ui.notify(`${g.name} — ${this.statText(id)}`, 'skill', 'Équipement');
    if (!G.state.equip[g.slot]) this.equip(id);
  },
  // Caractéristiques effectives (+25 % par niveau)
  stats(id, lv) {
    const g = G.data.gear[id], L = lv != null ? lv : this.level(id), out = {};
    for (const k in g.stats) {
      const v = g.stats[k] * (1 + 0.25 * L);
      out[k] = k === 'eva' || k === 'crit' ? Math.round(v * 1000) / 1000 : (g.stats[k] < 0 ? g.stats[k] : Math.round(v));
    }
    return out;
  },
  statText(id, lv) {
    const st = this.stats(id, lv), N = { hp: 'PV', mp: 'ÉN', def: 'DÉF', spd: 'VIT', eva: 'ESQ', crit: 'CRIT', atk: 'ATQ', tir: 'TIR' };
    return Object.entries(st).map(([k, v]) => `${N[k] || k} ${v > 0 ? '+' : ''}${k === 'eva' || k === 'crit' ? Math.round(v * 100) + ' %' : v}`).join(' · ');
  },
  equipped(slot) { const id = G.state.equip[slot]; return id && G.state.gear[id] ? id : null; },
  equip(id) {
    const g = G.data.gear[id];
    if (!g || !G.state.gear[id]) return;
    const before = G.hunter.derived(G.state.hunter);
    G.state.equip[g.slot] = id;
    this.after(before);
  },
  unequip(slot) {
    const before = G.hunter.derived(G.state.hunter);
    delete G.state.equip[slot];
    this.after(before);
  },
  // Garde les PV / ÉN cohérents quand le maximum change
  after(before) {
    const h = G.state.hunter, d = G.hunter.derived(h);
    if (d.maxHp > before.maxHp) h.hp += d.maxHp - before.maxHp;
    if (d.maxMp > before.maxMp) h.mp += d.maxMp - before.maxMp;
    G.hunter.clamp();
  },
  bonus() {
    const out = {};
    if (!G.state || !G.state.equip) return out;
    for (const slot in G.state.equip) {
      const id = this.equipped(slot);
      if (!id) continue;
      const st = this.stats(id);
      for (const k in st) out[k] = (out[k] || 0) + st[k];
    }
    return out;
  },
  upgradeCost(id) {
    const lv = this.level(id), g = G.data.gear[id];
    if (lv >= GEAR_MAX_LV) return null;
    return { gold: Math.round(g.price * 0.45 * (lv + 1)), pieces: lv + 1 };
  },
  upgrade(id) {
    const c = this.upgradeCost(id);
    if (!c || G.state.gold < c.gold || G.inventory.count('pieces') < c.pieces) return false;
    const before = G.hunter.derived(G.state.hunter);
    G.state.gold -= c.gold;
    G.inventory.remove('pieces', c.pieces);
    G.state.gear[id].lv = this.level(id) + 1;
    this.after(before);
    return true;
  },
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
