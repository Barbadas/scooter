/* Butin des coffres (tiré au hasard à l'ouverture).
   gold  : [min, max] de ferraille
   rolls : [[objet, chance, quantité | [min, max]], ...] */
G.data.loot = {
  foret: {
    gold: [12, 30],
    rolls: [
      ['pieces', 0.6, [1, 2]],
      ['trousse', 0.45, 1],
      ['mun_9mm', 0.45, [6, 10]],
      ['stimulant', 0.25, 1],
      ['grenade', 0.12, 1],
    ],
  },
  foret_rare: {
    gold: [35, 80],
    rolls: [
      ['pieces', 1, [2, 3]],
      ['trousse', 0.6, [1, 2]],
      ['mun_fusil', 0.35, [2, 4]],
      ['mun_9mm', 0.5, [8, 14]],
      ['grenade', 0.35, 1],
      ['fumigene', 0.25, 1],
      ['kit_chirurgical', 0.12, 1],
    ],
  },
};
