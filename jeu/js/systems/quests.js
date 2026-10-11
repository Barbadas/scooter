/* Suivi des missions. Les récompenses sont distribuées
   dès que le joueur est libre (pas pendant un combat ou un dialogue). */
G.quests = {
  pending: [],

  start(id) {
    const q = G.data.quests[id];
    if (!q || G.state.quests[id]) return;
    G.state.quests[id] = { progress: q.objectives.map(() => 0), done: false };
    G.ui.notify(q.title, 'quest', 'Nouvelle mission');
    this.checkFlags();
  },

  // track('kill', 1, 'chien') : l'objectif peut cibler un ennemi précis (o.enemy)
  track(type, n = 1, what = null) {
    if (!G.state) return;
    for (const id in G.state.quests) {
      const st = G.state.quests[id];
      if (st.done) continue;
      const q = G.data.quests[id];
      q.objectives.forEach((o, i) => {
        if (o.type === type && (!o.enemy || o.enemy === what)) st.progress[i] = Math.min(o.target, st.progress[i] + n);
      });
      this.check(id);
    }
  },

  checkFlags() {
    for (const id in G.state.quests) {
      const st = G.state.quests[id];
      if (st.done) continue;
      G.data.quests[id].objectives.forEach((o, i) => {
        if (o.type === 'flag' && G.state.flags[o.flag]) st.progress[i] = o.target;
      });
      this.check(id);
    }
  },

  check(id) {
    const st = G.state.quests[id], q = G.data.quests[id];
    if (st.done) return;
    if (q.objectives.every((o, i) => st.progress[i] >= o.target)) {
      st.done = true;
      this.pending.push(id);
    }
  },

  // Étapes d'événement qui remettent les récompenses
  rewardSteps(id) {
    const q = G.data.quests[id], r = q.rewards || {};
    const lines = [];
    if (r.xp) lines.push(`+${r.xp} EXP`);
    if (r.gold) lines.push(`+${r.gold} ferraille`);
    if (r.stats) lines.push(`+${r.stats} points de statistiques`);
    if (r.items) for (const it in r.items) lines.push(`${G.data.items[it].name} × ${r.items[it]}`);
    if (r.heal) lines.push('Récupération complète');
    return [
      { system: `${q.title}\n\nMission accomplie !\n${lines.join(' · ')}`, title: 'Mission accomplie' },
      { fn: () => {
        if (r.heal) { const d = G.hunter.derived(G.state.hunter); G.state.hunter.hp = d.maxHp; G.state.hunter.mp = d.maxMp; }
        if (r.stats) G.state.hunter.points += r.stats;
        if (r.gold) G.state.gold += r.gold;
        if (r.items) for (const it in r.items) G.inventory.add(it, r.items[it]);
        if (r.xp) G.hunter.gainXp(r.xp);
      } },
      { save: true },
    ];
  },
};
