/* Missions.
   objectives : { type: 'kill' (enemy: id optionnel) | 'step' | 'flag', target, label, flag? }
   rewards    : { xp, gold (ferraille), stats (points), heal: true, items: { id: qté } } */
G.data.quests = {
  medocs: {
    title: 'Médicaments pour le clan',
    desc: 'La fièvre ravage le village. Récupère le stock caché sous la station Gorge-de-Loup, dans les ruines de Vaise (vieille route, à l’ouest).',
    objectives: [{ type: 'flag', flag: 'medocs', target: 1, label: 'Récupérer les médicaments' }],
    rewards: { xp: 40, gold: 20, items: { trousse: 1 } },
  },
  chiens: {
    title: 'Meute errante',
    desc: 'Des chiens affamés rôdent dans la forêt et attaquent les cueilleurs du clan. Abats-en quatre.',
    objectives: [{ type: 'kill', enemy: 'chien', target: 4, label: 'Chiens abattus' }],
    rewards: { xp: 30, items: { mun_9mm: 12 } },
  },
  vaise_sud: {
    title: 'Reprendre Vaise-Sud',
    desc: 'Chasser Kross et les Vipères du château d’eau.',
    objectives: [{ type: 'flag', flag: 'boss_d', target: 1, label: 'Vaincre Kross' }],
    rewards: { xp: 60, gold: 80, items: { trousse: 2 } },
  },
};
