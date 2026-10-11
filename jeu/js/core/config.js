/* Monarque des Ombres — configuration globale.
   Tous les fichiers partagent l'objet global G (pas de module : le jeu
   s'ouvre aussi en double-cliquant sur index.html). */
window.G = { data: {}, scenes: {}, state: null, time: 0 };

G.config = {
  TITLE: 'Monarque des Ombres',
  WIDTH: 960,            // résolution interne du canvas
  HEIGHT: 576,
  TILE: 48,              // taille d'une tuile en pixels
  STEP_MS: 150,          // durée d'un pas du joueur
  ENEMY_STEP_MS: 300,    // durée d'un pas d'un monstre
  STAT_POINTS_PER_LEVEL: 3,
  START_STATS: { str: 10, vit: 10, agi: 10, int: 10, per: 10 },
  DEFAULT_NAME: 'Kaï',
  SAVE_KEY: 'monarque-des-ombres-v1',
  REGEN_EVERY_STEPS: 4,  // +1 PV et +1 PM tous les N pas (hors combat)
  PLAYER_LIGHT: 4.6,     // rayon de lumière autour du joueur (en tuiles)
};

// Libellés des statistiques façon « Système »
G.STATS = {
  str: { abbr: 'FOR', name: 'Force', hint: 'Augmente les dégâts physiques.' },
  vit: { abbr: 'VIT', name: 'Vitalité', hint: 'Augmente les PV et la défense.' },
  agi: { abbr: 'AGI', name: 'Agilité', hint: "Agit plus tôt dans le tour et esquive plus souvent." },
  int: { abbr: 'INT', name: 'Intelligence', hint: 'Augmente les PM et la puissance magique.' },
  per: { abbr: 'PER', name: 'Perception', hint: 'Augmente les chances de coup critique.' },
};
