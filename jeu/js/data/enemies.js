/* Ennemis.
   sprite   : clé dans assets.js · weapon : arme utilisée (weapons.js), munitions illimitées
   atk      : corps à corps · tir : armes à feu (= atk par défaut)
   skills   : [[id, poids], ...] — tirage pondéré à chaque tour ('arme' = tirer / frapper avec son arme)
   drops    : [[objet, chance, quantité], ...]
   threat   : niveau de menace affiché
   battleScale : taille en combat (1.5 par défaut) · ai : IA spéciale (battle.js) */
G.data.enemies = {
  chien: {
    name: 'Chien errant', threat: 'Faible', sprite: 'chien',
    hp: 26, atk: 11, def: 2, spd: 11, crit: 0.06, eva: 0.06,
    xp: 8, gold: 2,
    skills: [['morsure', 3], ['charge', 1]],
    drops: [['trousse', 0.08, 1]],
  },
  chien_alpha: {
    name: 'Chien de meute', threat: 'Moyenne', sprite: 'chien',
    hp: 40, atk: 15, def: 3, spd: 14, crit: 0.08, eva: 0.08,
    xp: 14, gold: 3,
    skills: [['morsure', 3], ['charge', 2], ['hurlement', 1]],
    drops: [['trousse', 0.15, 1]],
  },
  pillard: {
    name: 'Pillard Vipère', threat: 'Moyenne', sprite: 'pillard', weapon: 'couteau',
    hp: 42, atk: 14, def: 5, spd: 10, crit: 0.06, eva: 0.05,
    xp: 16, gold: 8,
    skills: [['arme', 3], ['coup_couteau', 2]],
    drops: [['trousse', 0.2, 1], ['mun_9mm', 0.35, 4]],
  },
  pillard_tireur: {
    name: 'Tireur Vipère', threat: 'Moyenne', sprite: 'pillard_tireur', weapon: 'pistolet',
    hp: 34, atk: 9, tir: 15, def: 3, spd: 12, crit: 0.08, eva: 0.06,
    xp: 18, gold: 10,
    skills: [['arme', 1]],
    drops: [['mun_9mm', 0.6, 6], ['stimulant', 0.15, 1]],
  },
  tireur_elite: {
    name: 'Tireur d’élite', threat: 'Élevée', sprite: 'tireur_elite', weapon: 'fusil',
    hp: 30, atk: 8, tir: 20, def: 2, spd: 8, crit: 0.12, eva: 0.04,
    xp: 22, gold: 14,
    skills: [['arme', 1]],
    drops: [['mun_fusil', 0.7, 2]],
  },
  rico: {
    name: 'Rico, pillard Vipère', threat: 'Élevée', sprite: 'pillard_tireur', weapon: 'pistolet',
    hp: 110, atk: 13, tir: 12, def: 5, spd: 9, crit: 0.06, eva: 0.04,
    xp: 50, gold: 25, boss: true, battleScale: 1.6,
    skills: [['arme', 3], ['coup_couteau', 2]],
    drops: [['mun_9mm', 1, 10], ['trousse', 1, 1]],
  },
  kross_intro: {
    name: 'Kross, lieutenant des Vipères', threat: 'Mortelle', sprite: 'kross', weapon: 'mitrailleuse',
    hp: 9999, atk: 40, tir: 60, def: 999, spd: 6, crit: 0, eva: 0,
    xp: 0, gold: 0, boss: true, battleScale: 1.3,
    skills: [['rafale_mortelle', 1]],
  },
  kross: {
    name: 'Kross, lieutenant des Vipères', threat: 'Élevée', sprite: 'kross', weapon: 'mitrailleuse',
    hp: 260, atk: 20, tir: 17, def: 10, spd: 11, crit: 0.06, eva: 0.03,
    xp: 180, gold: 120, boss: true, battleScale: 1.3, ai: 'kross',
    skills: [['arme', 4], ['grenade_e', 1], ['cri_guerre', 1]],
    drops: [['kit_chirurgical', 1, 1]],
  },
};
