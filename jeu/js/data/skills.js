/* Techniques (joueur, forme bestiale et ennemis).
   ─────────────────────────────────────────────
   Ajouter une technique = ajouter une entrée ici, puis la débloquer :
     • par niveau     → unlockLevel: 5
     • par l'histoire → étape { learn: 'id' } dans story.js

   cost   : ÉN (énergie) consommée
   target : 'enemy' (un adversaire) · 'enemies' (tous) · 'self' · 'ally' · 'allies'
   anim   : 'melee' (fonce au contact) · 'cast' (aura) · 'throw' (lancer)
   color  : couleur des effets · vfx : 'slash' · 'cross' · 'claw' · 'smash' · 'dread' · 'blast'
   beast  : technique de la forme bestiale (remplace les armes une fois transformé)
   useWeapon : 'own' = attaque avec l'arme de l'ennemi, ou une arme décrite comme dans weapons.js
   effects (appliqués dans l'ordre) :
     { type: 'damage', power, hits, stat: 'atk' | 'tir', acc, critBonus, sure,
       bleed: { chance, dmg, turns } }
     { type: 'healPct', pct: 0.35 }                 // soin en % des PV max
     { type: 'mod', stat: 'atk'|'tir'|'def'|'spd'|'eva', mult, turns } */
G.data.skills = {
  // ───────────── Techniques du survivant ─────────────
  lame_double: {
    name: 'Lame double',
    desc: 'Deux coups de couteau éclair (2 × 75 %), 20 % de saignement chacun.',
    cost: 4, target: 'enemy', anim: 'melee', color: '#f2d0a0', vfx: 'slash', shown: 'knife',
    effects: [{ type: 'damage', power: 0.75, hits: 2, stat: 'atk', acc: 0.97, bleed: { chance: 0.2, dmg: 3, turns: 3 } }],
  },
  premiers_soins: {
    name: 'Premiers soins',
    desc: 'Bandage de fortune : restaure 35 % des PV.',
    cost: 8, unlockLevel: 2, target: 'self', anim: 'cast', color: '#7fd18b',
    effects: [{ type: 'healPct', pct: 0.35 }],
  },
  coup_grace: {
    name: 'Coup de grâce',
    desc: 'La lame vise un point vital : 190 % de dégâts, critique +25 %.',
    cost: 10, unlockLevel: 3, target: 'enemy', anim: 'melee', color: '#ffd166', vfx: 'cross', shown: 'knife',
    effects: [{ type: 'damage', power: 1.9, critBonus: 0.25, stat: 'atk', acc: 0.95 }],
  },
  intimidation: {
    name: 'Intimidation',
    desc: 'Un regard qui glace le sang : ATQ et TIR ennemis −30 %, DÉF −20 % pendant 3 tours.',
    cost: 12, unlockLevel: 5, target: 'enemies', anim: 'cast', color: '#e0412b', vfx: 'dread',
    effects: [
      { type: 'mod', stat: 'atk', mult: 0.7, turns: 3 },
      { type: 'mod', stat: 'tir', mult: 0.7, turns: 3 },
      { type: 'mod', stat: 'def', mult: 0.8, turns: 3 },
    ],
  },

  // ───────────── Forme bestiale (artefacts) ─────────────
  griffes: {
    name: 'Griffes', beast: true,
    desc: 'Deux coups de griffes (2 × 95 %).',
    target: 'enemy', anim: 'melee', color: '#f2b25c', vfx: 'claw',
    effects: [{ type: 'damage', power: 0.95, hits: 2, stat: 'atk', acc: 0.97 }],
  },
  crocs: {
    name: 'Crocs', beast: true,
    desc: 'Morsure féroce : 170 % de dégâts, saignement garanti.',
    target: 'enemy', anim: 'melee', color: '#e0412b', vfx: 'claw',
    effects: [{ type: 'damage', power: 1.7, stat: 'atk', acc: 0.95, bleed: { chance: 1, dmg: 6, turns: 3 } }],
  },
  hurlement_bestial: {
    name: 'Hurlement bestial', beast: true,
    desc: 'Un cri qui paralyse : ATQ et TIR ennemis −25 % pendant 2 tours.',
    target: 'enemies', anim: 'cast', color: '#f2b25c', vfx: 'dread',
    effects: [
      { type: 'mod', stat: 'atk', mult: 0.75, turns: 2 },
      { type: 'mod', stat: 'tir', mult: 0.75, turns: 2 },
    ],
  },

  laceration: {
    name: 'Lacération', beast: true,
    desc: 'Trois coups de griffes en rafale (3 × 70 %), 40 % de saignement chacun.',
    target: 'enemy', anim: 'melee', color: '#ff9a3c', vfx: 'claw',
    effects: [{ type: 'damage', power: 0.7, hits: 3, stat: 'atk', acc: 0.97, bleed: { chance: 0.4, dmg: 5, turns: 3 } }],
  },
  bond: {
    name: 'Bond du tigre', beast: true,
    desc: 'Saut à la gorge : 200 % de dégâts, critique +30 %.',
    target: 'enemy', anim: 'melee', color: '#ffd166', vfx: 'smash',
    effects: [{ type: 'damage', power: 2.0, critBonus: 0.3, stat: 'atk', acc: 0.92 }],
  },
  rugissement: {
    name: 'Rugissement', beast: true,
    desc: 'Le sol tremble : ATQ et TIR ennemis −30 %, DÉF ennemie −20 % pendant 2 tours.',
    target: 'enemies', anim: 'cast', color: '#ff9a3c', vfx: 'dread',
    effects: [
      { type: 'mod', stat: 'atk', mult: 0.7, turns: 2 },
      { type: 'mod', stat: 'tir', mult: 0.7, turns: 2 },
      { type: 'mod', stat: 'def', mult: 0.8, turns: 2 },
    ],
  },

  // ───────────── Ennemis ─────────────
  arme: { name: 'Attaque', target: 'enemy', useWeapon: 'own' },
  morsure: {
    name: 'Morsure', target: 'enemy', anim: 'melee', color: '#e0412b', vfx: 'claw',
    effects: [{ type: 'damage', power: 1, stat: 'atk', acc: 0.95, bleed: { chance: 0.25, dmg: 3, turns: 3 } }],
  },
  coup_bec: {
    name: 'Coup de bec', target: 'enemy', anim: 'melee', color: '#c9c2b8', vfx: 'claw',
    effects: [{ type: 'damage', power: 0.9, stat: 'atk', acc: 0.95, bleed: { chance: 0.2, dmg: 2, turns: 2 } }],
  },
  pique: {
    name: 'Piqué', target: 'enemy', anim: 'melee', color: '#e0412b', vfx: 'smash',
    effects: [{ type: 'damage', power: 1.4, stat: 'atk', acc: 0.85 }],
  },
  charge: {
    name: 'Charge', target: 'enemy', anim: 'melee', color: '#c9b08a', vfx: 'smash',
    effects: [{ type: 'damage', power: 1.3, stat: 'atk', acc: 0.9 }],
  },
  hurlement: {
    name: 'Hurlement', target: 'allies', anim: 'cast', color: '#e0c27c',
    effects: [{ type: 'mod', stat: 'atk', mult: 1.25, turns: 3 }],
  },
  coup_couteau: {
    name: 'Coup de couteau', target: 'enemy', anim: 'melee', color: '#d8d0c0', vfx: 'slash', shown: 'knife',
    effects: [{ type: 'damage', power: 1.15, stat: 'atk', acc: 0.95, bleed: { chance: 0.15, dmg: 3, turns: 2 } }],
  },
  grenade_e: {
    name: 'Grenade', target: 'enemies', anim: 'throw', color: '#ffb347', vfx: 'blast',
    effects: [{ type: 'damage', power: 0.85, stat: 'tir', sure: true }],
  },
  cri_guerre: {
    name: 'Cri de guerre', target: 'self', anim: 'cast', color: '#ff7a3c',
    effects: [
      { type: 'mod', stat: 'atk', mult: 1.35, turns: 3 },
      { type: 'mod', stat: 'tir', mult: 1.35, turns: 3 },
    ],
  },
  rafale_mortelle: {
    name: 'Rafale', target: 'enemy',
    useWeapon: { kind: 'gun', sprite: 'mg', power: 0.9, hits: 6, acc: 1.2, crit: 0 },
  },
};
for (const id in G.data.skills) G.data.skills[id].id = id;
