/* Équipement : une pièce par emplacement (tête, corps, pieds).
   stats : hp (PV max), mp (ÉN max), def, spd (vitesse), eva (esquive, 0-1), crit (0-1)
   price : prix à la tente d'équipement (ferraille)
   Amélioration (+1 à +4) : caractéristiques +25 % par niveau (les malus restent fixes). */
G.GEAR_SLOTS = { tete: 'Tête', corps: 'Corps', pieds: 'Pieds' };

G.data.gear = {
  // — Tête —
  bandana: {
    name: 'Bandana', slot: 'tete', price: 35, stats: { eva: 0.03 },
    desc: 'Un foulard noué serré. Garde la sueur loin des yeux.',
  },
  casque_moto: {
    name: 'Casque de moto', slot: 'tete', price: 110, stats: { def: 3, hp: 10 },
    desc: 'Visière fendue, mais la coque tient encore.',
  },
  casque_militaire: {
    name: 'Casque militaire', slot: 'tete', price: 260, stats: { def: 6, hp: 20 },
    desc: 'Kevlar d’avant-guerre. Lourd et rassurant.',
  },
  // — Corps —
  veste_cuir: {
    name: 'Veste en cuir', slot: 'corps', price: 70, stats: { def: 3, hp: 15 },
    desc: 'Cuir épais rapiécé. Arrête les crocs, pas les balles.',
  },
  gilet_kevlar: {
    name: 'Gilet pare-balles', slot: 'corps', price: 300, stats: { def: 7, hp: 30, spd: -1 },
    desc: 'Plaques souples. Un peu encombrant.',
  },
  armure_plaques: {
    name: 'Armure de plaques', slot: 'corps', price: 560, stats: { def: 12, hp: 50, spd: -3 },
    desc: 'Tôles de voiture rivetées sur un gilet. Une forteresse ambulante.',
  },
  // — Pieds —
  baskets: {
    name: 'Baskets usées', slot: 'pieds', price: 45, stats: { spd: 2, eva: 0.02 },
    desc: 'Légères et silencieuses.',
  },
  rangers: {
    name: 'Rangers', slot: 'pieds', price: 140, stats: { def: 2, spd: 1, hp: 10 },
    desc: 'Semelles cloutées, tige montante. Pour courir dans les ruines.',
  },
};
for (const id in G.data.gear) G.data.gear[id].id = id;
