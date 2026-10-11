/* Compétences (joueur, ombres et monstres).
   ────────────────────────────────────────
   Ajouter un pouvoir = ajouter une entrée ici, puis le débloquer :
     • par niveau  → unlockLevel: 5
     • par l'histoire → étape { learn: 'id' } dans story.js

   cost   : PM consommés
   target : 'enemy' (un adversaire) · 'enemies' (tous) · 'self' · 'ally' · 'allies'
   anim   : 'melee' (le lanceur fonce sur la cible) · 'ranged' (projectile) · 'cast' (aura)
   color  : couleur des effets
   vfx    : effet visuel à l'impact — 'slash' · 'cross' · 'claw' · 'smash' · 'quake' · 'dread'
   effects (appliqués dans l'ordre) :
     { type: 'damage', power: 1.2, hits: 2, magic: false, critBonus: 0.1,
       bleed: { chance: 0.3, dmg: 4, turns: 3 } }
     { type: 'heal', power: 1.5 }        // soigne (puissance × MAG)
     { type: 'mod', stat: 'atk'|'def'|'spd'|'mag', mult: 0.7, turns: 3 }
   passive: true → n'apparaît pas dans le menu de combat (ex. Extraction). */
G.data.skills = {
  // ───────────── Joueur ─────────────
  attaque: {
    name: 'Attaque',
    target: 'enemy', anim: 'melee', color: '#cfe6ff', vfx: 'slash',
    effects: [{ type: 'damage', power: 1 }],
  },
  frappe_rapide: {
    name: 'Frappe rapide',
    desc: 'Deux coups de dague ultra-rapides (2 × 75 %).',
    cost: 4, target: 'enemy', anim: 'melee', color: '#7fd4ff', vfx: 'slash',
    effects: [{ type: 'damage', power: 0.75, hits: 2 }],
  },
  coup_vital: {
    name: 'Coup vital',
    desc: 'Vise un point vital : 190 % de dégâts, +25 % de chance de critique.',
    cost: 10, unlockLevel: 3, target: 'enemy', anim: 'melee', color: '#ffd166', vfx: 'cross',
    effects: [{ type: 'damage', power: 1.9, critBonus: 0.25 }],
  },
  soif_de_sang: {
    name: 'Soif de sang',
    desc: 'Une aura meurtrière paralyse les ennemis : ATQ −30 % et DÉF −20 % pendant 3 tours.',
    cost: 12, target: 'enemies', anim: 'cast', color: '#ff4d5e', vfx: 'dread',
    effects: [
      { type: 'mod', stat: 'atk', mult: 0.7, turns: 3 },
      { type: 'mod', stat: 'def', mult: 0.8, turns: 3 },
    ],
  },
  extraction: {
    name: "Extraction d'ombre",
    desc: "Après un combat, tente d'arracher l'ombre d'un ennemi vaincu pour en faire un soldat. « Lève-toi. »",
    passive: true,
  },

  // ───────────── Monstres ─────────────
  morsure: {
    name: 'Morsure', target: 'enemy', anim: 'melee', color: '#ff6b6b', vfx: 'claw',
    effects: [{ type: 'damage', power: 1, bleed: { chance: 0.25, dmg: 3, turns: 3 } }],
  },
  hurlement: {
    name: 'Hurlement', target: 'allies', anim: 'cast', color: '#e0c27c',
    effects: [{ type: 'mod', stat: 'atk', mult: 1.25, turns: 3 }],
  },
  coup_dague: {
    name: 'Coup de dague', target: 'enemy', anim: 'melee', color: '#c7d0da', vfx: 'slash',
    effects: [{ type: 'damage', power: 1.15 }],
  },
  tir: {
    name: 'Tir de flèche', target: 'enemy', anim: 'ranged', color: '#e8d9a8',
    effects: [{ type: 'damage', power: 1.05 }],
  },
  frappe_titan: {
    name: 'Frappe du titan', target: 'enemy', anim: 'melee', color: '#ff2b4a', vfx: 'smash',
    effects: [{ type: 'damage', power: 3, critBonus: -1 }],
  },
  ecrasement: {
    name: 'Écrasement', target: 'enemy', anim: 'melee', color: '#c3cad6', vfx: 'smash',
    effects: [{ type: 'damage', power: 1.5 }],
  },
  regard_ecarlate: {
    name: 'Regard écarlate', target: 'enemy', anim: 'cast', color: '#ff3355',
    effects: [{ type: 'mod', stat: 'def', mult: 0.7, turns: 2 }],
  },
  massue: {
    name: 'Coup de massue', target: 'enemy', anim: 'melee', color: '#e8a25a', vfx: 'smash',
    effects: [{ type: 'damage', power: 1.6 }],
  },
  cri_guerre: {
    name: 'Cri de guerre', target: 'self', anim: 'cast', color: '#ff7a3c',
    effects: [{ type: 'mod', stat: 'atk', mult: 1.35, turns: 3 }],
  },
  seisme: {
    name: 'Séisme', target: 'enemies', anim: 'cast', color: '#d9a066', vfx: 'quake',
    effects: [{ type: 'damage', power: 0.95 }],
  },
};
for (const id in G.data.skills) G.data.skills[id].id = id;
