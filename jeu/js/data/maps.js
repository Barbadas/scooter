/* Cartes vues de dessus.
   ─────────────────────
   Chaque caractère de `rows` = une case de 48 px.
   Tuiles de base :  #  mur   .  sol   ,  sol moussu   ~  gouffre   =  dalles du temple
   Les autres lettres sont décrites dans `legend` (entités posées sur la carte) :
     kind : 'enemy' | 'npc' | 'object' | 'chest' | 'portal' | 'trigger'
     id   : identifiant unique (sinon généré automatiquement)
     tile : tuile sous l'entité (par défaut : déduite des cases voisines)
     event: événement de story.js lancé au contact / à l'interaction
     group: monstres du combat (ennemis)  · wander/chase : rayon d'errance / de poursuite
     showIf / hiddenIf : n'apparaît que si le drapeau (flag) est actif / inactif
     light: { r: rayon en tuiles, color, flicker }  · examine: texte affiché à l'interaction
   P = position de départ du joueur. */
(function () {
  const BRASERO = { kind: 'object', sprite: 'brasero', solid: true, light: { r: 3.2, color: '255,150,60', flicker: true }, examine: 'Un brasero. Ses flammes ne vacillent jamais.' };
  const PORTAL_LIGHT = { r: 2.8, color: '63,180,255' };

  G.data.maps = {
    // ════════════════════════ PROLOGUE ════════════════════════
    portail_e: {
      name: 'Portail de rang E — Grotte humide',
      darkness: 0.8,
      rows: [
        '####################################',
        '####################################',
        '######################S===A===S#####',
        '######################====Q====#####',
        '######################S===G===S#####',
        '######################=========#####',
        '######################S=======S#####',
        '######################==b===b==#####',
        '##########################x#########',
        '##########################.#########',
        '###....###################.#########',
        '##.....,....#####.......,..##.....##',
        '#O.P.......r......,....r.......c..##',
        '##..M...b..#####..........R...,...##',
        '###.......########...~~~~.....######',
        '######..##########..~~~~~...########',
        '######..r..........~~~~...c#########',
        '#######..........,.........#########',
        '####################################',
        '####################################',
      ],
      legend: {
        O: { kind: 'portal', id: 'entree', sprite: 'portail', event: 'portail_entree', light: PORTAL_LIGHT },
        M: { kind: 'npc', id: 'mira', sprite: 'pnj_mira', event: 'mira', dir: 'right' },
        r: { kind: 'enemy', group: ['rat_geant'], wander: 2, chase: 3 },
        R: { kind: 'enemy', group: ['rat_geant', 'rat_geant'], wander: 1, chase: 3 },
        b: BRASERO,
        c: { kind: 'chest', sprite: 'coffre', item: 'potion', qty: 1 },
        S: { kind: 'object', sprite: 'statue', solid: true, tile: 'temple', event: 'statue' },
        A: { kind: 'object', id: 'autel', sprite: 'autel', solid: true, tile: 'temple', event: 'autel', light: { r: 2.4, color: '63,180,255' } },
        G: { kind: 'object', id: 'gardien', sprite: 'gardien', solid: true, tile: 'temple', event: 'gardien_examine', hiddenIf: 'gardien_vaincu', faceDown: true },
        Q: { kind: 'portal', id: 'portail_temple', sprite: 'portail', tile: 'temple', showIf: 'gardien_vaincu', event: 'portail_temple', light: PORTAL_LIGHT },
        x: { kind: 'trigger', id: 'seuil_temple', tile: 'temple', event: 'temple_entree', once: true },
      },
    },

    // ════════════════════════ CHAPITRE 1 ════════════════════════
    portail_d: {
      name: 'Portail de rang D — Repaire gobelin',
      darkness: 0.74,
      onEnter: 'entree_d',
      rows: [
        '############################################',
        '##############################,.........####',
        '######.......#################....K.....####',
        '#####..,..e...################..........####',
        '#####....W....################b...E....b####',
        '######..c....#####################.#########',
        '#######...#######.......##########x#########',
        '#######...######....,....#########.#########',
        '######.....####...w.....c..#####.......#####',
        '#####...w....##.......##..........a....#####',
        '#####........#......####..............,#####',
        '######..,........h..##...T....T........#####',
        '########.....##........,........g....c.#####',
        '#########...####....######.........#########',
        '##########.######..#######...h.....#########',
        '##########.#######..######.........#########',
        '######.......######............#############',
        '#####..........####..w....##################',
        '#####.O.P...............c.##################',
        '#####..........####.......##################',
        '############################################',
      ],
      legend: {
        O: { kind: 'portal', id: 'entree_d', sprite: 'portail', event: 'portail_d_entree', light: PORTAL_LIGHT },
        w: { kind: 'enemy', group: ['loup'], wander: 2, chase: 4 },
        W: { kind: 'enemy', group: ['loup', 'loup'], wander: 1, chase: 4 },
        g: { kind: 'enemy', group: ['gobelin'], wander: 2, chase: 4 },
        h: { kind: 'enemy', group: ['gobelin', 'gobelin'], wander: 1, chase: 4 },
        a: { kind: 'enemy', group: ['gobelin_archer', 'gobelin'], wander: 1, chase: 3 },
        T: { kind: 'object', sprite: 'tente', solid: true, examine: 'Une tente en peaux. Ça sent le chien mouillé et le sang séché.' },
        b: BRASERO,
        c: { kind: 'chest', sprite: 'coffre', item: 'potion', qty: 1 },
        e: { kind: 'chest', sprite: 'coffre', item: 'potion_mana', qty: 2 },
        x: { kind: 'trigger', id: 'avant_boss', event: 'pre_boss', once: true },
        K: { kind: 'enemy', id: 'kargash', sprite: 'chef_gobelin', group: ['chef_gobelin', 'gobelin'], event: 'boss_kargash', hiddenIf: 'boss_d', wander: 0, chase: 0, boss: true },
        E: { kind: 'portal', id: 'sortie_d', sprite: 'portail', showIf: 'boss_d', event: 'sortie_d', light: PORTAL_LIGHT },
      },
    },
  };
})();
