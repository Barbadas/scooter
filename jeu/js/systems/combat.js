/* Règles de combat (calculs purs, sans affichage). */
G.combat = {
  stat(u, k) {
    let v = u.base[k] != null ? u.base[k] : 0;
    for (const m of u.mods) if (m.stat === k) v *= m.mult;
    return v;
  },

  /* Résultat d'un coup : { dmg, crit, miss }
     eff = { power, stat: 'atk'|'tir', acc, critBonus, armor, pierce, sure } */
  hit(att, def, eff) {
    const power = eff.power || 1;
    const acc = (eff.acc != null ? eff.acc : 0.95) * (att.base.acc || 1);
    const chance = G.U.clamp(acc - this.stat(def, 'eva'), 0.05, 0.99);
    if (!eff.sure && Math.random() > chance) return { dmg: 0, miss: true };
    const crit = Math.random() < this.stat(att, 'crit') + (eff.critBonus || 0);
    const a = eff.stat === 'tir' ? this.stat(att, 'tir') : this.stat(att, 'atk');
    const armor = Math.max(0, this.stat(def, 'def')) * (eff.armor || 1) * (1 - (eff.pierce || 0));
    let d = a * power * 60 / (60 + armor);
    d *= G.U.rand(0.9, 1.1);
    if (crit) d *= 1.75;
    if (def.defending) d *= 0.5;
    return { dmg: Math.max(1, Math.round(d)), crit };
  },

  fleeChance(allies, enemies) {
    const a = allies.filter(u => u.alive), e = enemies.filter(u => u.alive);
    const sa = a.reduce((s, u) => s + this.stat(u, 'spd'), 0) / Math.max(1, a.length);
    const se = e.reduce((s, u) => s + this.stat(u, 'spd'), 0) / Math.max(1, e.length);
    return G.U.clamp(0.5 + (sa - se) * 0.04, 0.2, 0.9);
  },
};
