/* Monstres.
   sprite      : clé dans assets.js
   skills      : [[id, poids], ...] — tirage pondéré à chaque tour
   drops       : [[objet, chance], ...]
   extractable : peut devenir une ombre (une fois l'Extraction débloquée)
   extractChance : chance de réussite de l'extraction (0-1) · shadowName : nom une fois devenu ombre
   battleScale : taille en combat (1.5 par défaut)
   ai          : nom d'une IA spéciale définie dans battle.js (boss) */
G.data.enemies = {
  rat_geant: {
    name: 'Rat géant', rank: 'E', sprite: 'rat_geant',
    hp: 26, atk: 11, def: 2, mag: 0, spd: 9, crit: 0.05, eva: 0.04,
    xp: 8, gold: 3,
    skills: [['attaque', 3], ['morsure', 2]],
    drops: [['potion', 0.12]],
  },
  gardien: {
    name: 'Gardien de pierre', rank: '?', sprite: 'gardien',
    hp: 9999, atk: 60, def: 999, mag: 0, spd: 6, crit: 0, eva: 0,
    xp: 0, gold: 0, boss: true, battleScale: 1.25,
    skills: [['frappe_titan', 1]],
  },
  gardien_fissure: {
    name: 'Gardien fissuré', rank: 'C', sprite: 'gardien_fissure',
    hp: 120, atk: 14, def: 6, mag: 8, spd: 7, crit: 0.05, eva: 0,
    xp: 50, gold: 30, boss: true, battleScale: 1.25,
    skills: [['attaque', 3], ['ecrasement', 2], ['regard_ecarlate', 1]],
    drops: [['potion', 1]],
  },
  loup: {
    name: 'Loup des cavernes', rank: 'D', sprite: 'loup',
    hp: 40, atk: 15, def: 3, mag: 0, spd: 15, crit: 0.08, eva: 0.08,
    xp: 14, gold: 5,
    skills: [['attaque', 3], ['morsure', 3], ['hurlement', 1]],
    drops: [['potion', 0.15]],
    extractable: true, extractChance: 0.5,
  },
  gobelin: {
    name: 'Gobelin', rank: 'D', sprite: 'gobelin',
    hp: 44, atk: 14, def: 5, mag: 0, spd: 10, crit: 0.06, eva: 0.05,
    xp: 16, gold: 8,
    skills: [['attaque', 3], ['coup_dague', 2]],
    drops: [['potion', 0.2], ['potion_mana', 0.1]],
    extractable: true, extractChance: 0.6,
  },
  gobelin_archer: {
    name: 'Gobelin archer', rank: 'D', sprite: 'gobelin_archer',
    hp: 34, atk: 16, def: 3, mag: 0, spd: 12, crit: 0.1, eva: 0.06,
    xp: 18, gold: 10,
    skills: [['tir', 1]],
    drops: [['potion_mana', 0.2]],
    extractable: true, extractChance: 0.55,
  },
  chef_gobelin: {
    name: 'Kargash, chef de guerre', shadowName: 'Kargash', rank: 'C', sprite: 'chef_gobelin',
    hp: 280, atk: 23, def: 10, mag: 0, spd: 11, crit: 0.08, eva: 0.03,
    xp: 180, gold: 120, boss: true, battleScale: 1.3,
    skills: [['attaque', 3], ['massue', 2], ['seisme', 1], ['cri_guerre', 1]],
    ai: 'kargash',
    drops: [['elixir', 1]],
    extractable: true, extractChance: 0.35,
  },
};
