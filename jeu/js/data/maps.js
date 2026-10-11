/* Cartes vues de dessus.
   ─────────────────────
   Chaque caractère de `rows` = une case de 48 px.
   Tuiles de base :  #  mur / immeuble   .  bitume   ,  trottoir envahi d'herbes
                     ~  cratère           =  carrelage (métro)
   Les autres lettres sont décrites dans `legend` (entités posées sur la carte) :
     kind : 'enemy' | 'npc' | 'object' | 'chest' | 'portal' | 'trigger'
     id   : identifiant unique (sinon généré automatiquement)
     tile : tuile sous l'entité (par défaut : déduite des cases voisines)
     event: événement de story.js lancé au contact / à l'interaction
     group: ennemis du combat · wander/chase : rayon d'errance / de poursuite
     chest: item + qty, ou weapon + ammo (munitions offertes)
     showIf / hiddenIf : n'apparaît que si le drapeau (flag) est actif / inactif
     light: { r: rayon en tuiles, color, flicker }  · examine: texte affiché à l'interaction
   P = position de départ du joueur. */
(function () {
  const BARIL = { kind: 'object', sprite: 'baril', solid: true, light: { r: 3.2, color: '255,140,50', flicker: true }, examine: 'Un bidon d’essence transformé en brasero. Quelqu’un l’entretient.' };
  const EPAVE = { kind: 'object', sprite: 'epave', solid: true, examine: 'Une voiture calcinée. Les pneus ont été récupérés depuis longtemps.' };

  G.data.maps = {
    // ════════════════════════ PROLOGUE ════════════════════════
    ruines_vaise: {
      name: 'Ruines de Vaise — Station Gorge-de-Loup',
      darkness: 0.74,
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
        '######..r...v......~~~~...c#########',
        '#######..........,.........#########',
        '####################################',
        '####################################',
      ],
      legend: {
        O: { kind: 'object', id: 'barricade_camp', sprite: 'barricade', solid: true, event: 'barricade_camp' },
        M: { kind: 'npc', id: 'mira', sprite: 'pnj_mira', event: 'mira', dir: 'right' },
        r: { kind: 'enemy', group: ['chien'], wander: 2, chase: 3 },
        R: { kind: 'enemy', group: ['chien', 'chien'], wander: 1, chase: 3 },
        b: BARIL,
        v: EPAVE,
        c: { kind: 'chest', sprite: 'caisse', item: 'trousse', qty: 1 },
        S: { kind: 'object', sprite: 'pilier', solid: true, tile: 'carrelage', event: 'pilier' },
        A: { kind: 'object', id: 'caisse_medocs', sprite: 'caisse_medocs', solid: true, tile: 'carrelage', event: 'caisse_medocs', light: { r: 1.8, color: '255,90,80' } },
        G: { kind: 'npc', id: 'kross', sprite: 'kross', tile: 'carrelage', dir: 'up', showIf: 'embuscade', hiddenIf: 'kross_parti', event: 'kross_parle' },
        Q: { kind: 'portal', id: 'escalier', sprite: 'escalier', tile: 'carrelage', showIf: 'medocs', event: 'escalier', light: { r: 2.2, color: '255,200,140' } },
        x: { kind: 'trigger', id: 'seuil_station', tile: 'carrelage', event: 'station', once: true },
      },
    },

    // ════════════════════════ CHAPITRE 1 ════════════════════════
    vaise_sud: {
      name: 'Vaise-Sud — Territoire des Vipères',
      darkness: 0.7,
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
        '######.....####...w.....m..#####B.....B#####',
        '#####...w....##.......##..........a....#####',
        '#####........#......####......v.......,#####',
        '######..,........h..##...T....T........#####',
        '########.....##........,........g....c.#####',
        '#########...####....######.........#########',
        '##########.######..#######...h.....#########',
        '##########.#######..######.........#########',
        '######.......######...v........#############',
        '#####..........####..w....##################',
        '#####.O.P...............c.##################',
        '#####..........####.......##################',
        '############################################',
      ],
      legend: {
        O: { kind: 'object', id: 'barricade_d', sprite: 'barricade', solid: true, event: 'barricade_d' },
        w: { kind: 'enemy', group: ['chien'], wander: 2, chase: 4 },
        W: { kind: 'enemy', group: ['chien_alpha', 'chien'], wander: 1, chase: 4 },
        g: { kind: 'enemy', group: ['pillard'], wander: 2, chase: 4 },
        h: { kind: 'enemy', group: ['pillard', 'pillard_tireur'], wander: 1, chase: 4 },
        a: { kind: 'enemy', group: ['tireur_elite', 'pillard'], wander: 1, chase: 3 },
        T: { kind: 'object', sprite: 'abri', solid: true, examine: 'Un abri de bâches et de tôles. Un serpent est peint à la bombe sur la toile.' },
        b: BARIL,
        v: EPAVE,
        B: { kind: 'object', sprite: 'barricade', solid: true, examine: 'Une barricade de sacs de sable et de palettes. Les Vipères tiennent la place.' },
        c: { kind: 'chest', sprite: 'caisse', item: 'trousse', qty: 1 },
        m: { kind: 'chest', sprite: 'caisse', item: 'mun_9mm', qty: 10, extra: { grenade: 1 } },
        e: { kind: 'chest', sprite: 'caisse', weapon: 'fusil', ammo: 6 },
        x: { kind: 'trigger', id: 'avant_boss', event: 'pre_boss', once: true },
        K: { kind: 'enemy', id: 'kross', sprite: 'kross', group: ['kross', 'pillard_tireur'], event: 'boss_kross', hiddenIf: 'boss_d', wander: 0, chase: 0, boss: true },
        E: { kind: 'object', id: 'drapeau', sprite: 'drapeau', solid: true, showIf: 'boss_d', event: 'sortie_d', light: { r: 2.4, color: '255,190,90' } },
      },
    },
  };
})();
