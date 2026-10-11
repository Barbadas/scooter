/* Terres de Cendre — configuration globale.
   Tous les fichiers partagent l'objet global G (pas de module : le jeu
   s'ouvre aussi en double-cliquant sur index.html). */
window.G = { data: {}, scenes: {}, state: null, time: 0 };

G.config = {
  TITLE: 'Terres de Cendre',
  WIDTH: 960,            // résolution interne du canvas
  HEIGHT: 576,
  TILE: 48,              // taille d'une tuile en pixels
  STEP_MS: 150,          // durée d'un pas du joueur
  ENEMY_STEP_MS: 300,    // durée d'un pas d'un ennemi
  STAT_POINTS_PER_LEVEL: 3,
  START_STATS: { for: 10, end: 10, agi: 10, pre: 10, ins: 10 },
  DEFAULT_NAME: 'Kaï',
  SAVE_KEY: 'terres-de-cendre-v1',
  REGEN_EVERY_STEPS: 4,  // +1 PV et +1 ÉN tous les N pas (hors combat)
  PLAYER_LIGHT: 4.6,     // rayon de lumière autour du joueur (en tuiles)
  BEAST_MAX: 100,        // jauge de bête (transformation par artefact)
  // Version d'essai : l'Artefact du Tigre est donné dès le début et la jauge de bête
  // démarre à moitié pleine à chaque combat. Mettre TRIAL à false pour l'histoire normale.
  TRIAL: true,
  TRIAL_ARTIFACT: 'tigre',
  TRIAL_BEAST_START: 50,
};

// Statistiques du survivant
G.STATS = {
  for: { abbr: 'FOR', name: 'Force', hint: 'Dégâts au couteau et au corps à corps.' },
  end: { abbr: 'END', name: 'Endurance', hint: 'Points de vie et défense.' },
  agi: { abbr: 'AGI', name: 'Agilité', hint: 'Agir plus tôt dans le tour et esquiver plus souvent.' },
  pre: { abbr: 'PRÉ', name: 'Précision', hint: 'Dégâts et précision des armes à feu.' },
  ins: { abbr: 'INS', name: 'Instinct', hint: 'Coups critiques et réserve d’énergie.' },
};
