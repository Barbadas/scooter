/* Quêtes du Système.
   objectives : { type: 'kill' | 'step' | 'flag', target, label, flag? }
   rewards    : { xp, gold, stats (points), heal: true, items: { id: qté } } */
G.data.quests = {
  quotidienne: {
    title: 'Quête quotidienne : préparation pour devenir fort',
    desc: "Le Système exige un entraînement. En cas d'échec, une pénalité s'appliquera.",
    objectives: [
      { type: 'step', target: 300, label: 'Course (pas)' },
      { type: 'kill', target: 5, label: 'Monstres vaincus' },
    ],
    rewards: { xp: 40, stats: 3, heal: true, items: { potion: 1 } },
  },
  boss_d: {
    title: 'Nettoyer le portail de rang D',
    desc: 'Le portail ne se refermera qu’à la mort du maître du donjon.',
    objectives: [{ type: 'flag', flag: 'boss_d', target: 1, label: 'Vaincre le maître du donjon' }],
    rewards: { gold: 50, items: { potion: 2 } },
  },
};
