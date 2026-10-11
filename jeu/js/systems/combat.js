/* Règles de combat (calculs purs, sans affichage). */
G.combat = {
  stat(u, k) {
    let v = u.base[k];
    for (const m of u.mods) if (m.stat === k) v *= m.mult;
    return v;
  },

  // Résultat d'un coup : { dmg, crit, miss }
  hit(att, def, eff) {
    const power = eff.power || 1;
    if (Math.random() < this.stat(def, 'eva')) return { dmg: 0, miss: true };
    const crit = Math.random() < this.stat(att, 'crit') + (eff.critBonus || 0);
    const a = eff.magic ? this.stat(att, 'mag') : this.stat(att, 'atk');
    let d = a * power * 60 / (60 + Math.max(0, this.stat(def, 'def')));
    d *= G.U.rand(0.9, 1.1);
    if (crit) d *= 1.75;
    if (def.defending) d *= 0.5;
    return { dmg: Math.max(1, Math.round(d)), crit };
  },

  healAmount(user, eff) {
    return Math.round(this.stat(user, 'mag') * (eff.power || 1) * G.U.rand(0.95, 1.05));
  },

  fleeChance(allies, enemies) {
    const a = allies.filter(u => u.alive), e = enemies.filter(u => u.alive);
    const sa = a.reduce((s, u) => s + this.stat(u, 'spd'), 0) / Math.max(1, a.length);
    const se = e.reduce((s, u) => s + this.stat(u, 'spd'), 0) / Math.max(1, e.length);
    return G.U.clamp(0.5 + (sa - se) * 0.04, 0.2, 0.9);
  },
};
