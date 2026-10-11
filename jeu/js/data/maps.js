/* Cartes vues de dessus.
   ─────────────────────
   Chaque caractère de `rows` = une case de 48 px.
   Tuiles de base :  #  mur / immeuble   .  bitume   ,  gravats, terre   ~  cratère   =  carrelage
                     "  herbe   :  chemin   ^  arbre   %  eau   -  palissade
   (arbre, eau, palissade, mur et cratère bloquent le passage)
   Les autres lettres sont décrites dans `legend` (entités posées sur la carte) :
     kind : 'enemy' | 'npc' | 'object' | 'chest' | 'portal' | 'trigger'
     id   : identifiant unique (sinon généré automatiquement)
     tile : tuile sous l'entité (par défaut : déduite des cases voisines)
     event: événement de story.js lancé au contact / à l'interaction
     group: ennemis du combat · wander/chase : rayon d'errance / de poursuite
     chest: item + qty, ou weapon + ammo (munitions offertes)
     showIf / hiddenIf : n'apparaît que si le drapeau (flag) est actif / inactif
     light: { r: rayon en tuiles, color, flicker }  · examine: texte affiché à l'interaction
     wide / deep : l'entité occupe aussi N cases à gauche/droite / au-dessus (tentes)
     to   : (portal) { map, x, y, dir } — passage vers une autre carte
     chest: loot (table de loot.js), gold, gear (équipement)
   spawns : (option de carte) entités de la légende placées au hasard — voir la forêt.
   P = position de départ du joueur. */
(function () {
  const BARIL = { kind: 'object', sprite: 'baril', solid: true, light: { r: 3.2, color: '255,140,50', flicker: true }, examine: 'Un bidon d’essence transformé en brasero. Quelqu’un l’entretient.' };
  const EPAVE = { kind: 'object', sprite: 'epave', solid: true, examine: 'Une voiture calcinée. Les pneus ont été récupérés depuis longtemps.' };
  const LANTERNE = { r: 1.9, color: '255,190,110' };

  G.data.maps = {
    // ═══════════════ MONDE OUVERT : la forêt et le village du Corbeau ═══════════════
    foret: {
      name: 'Forêt des Monts d’Or',
      darkness: 0.46,
      // Coffres et bêtes placés au hasard (nouvelle partie = nouvelle forêt ; les bêtes
      // changent de place à chaque nuit passée à la tente de repos).
      // min / max : distance au feu du village · gap : écart minimal entre deux tirages
      spawns: {
        center: [50, 38], avoid: [30, 24, 70, 52],
        chests: { z: { count: 7, min: 14, max: 34, gap: 7 }, Z: { count: 6, min: 30, gap: 10 } },
        beasts: {
          d: { count: 8, min: 14, gap: 6 }, k: { count: 6, min: 14, gap: 6 },
          D: { count: 5, min: 25, gap: 8 }, C: { count: 4, min: 27, gap: 8 },
        },
      },
      rows: [
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^""""^^^^^^^^^^^""""^^^^^^^^^^^^^^^^^^^^^^^"""""""""""^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"""^^',
        '^^^^^""""^^^^^^^^^^^^""""^^^^^^^^^^^^^^^^^^^^"""""""""""""^"""^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^""""^^',
        '^^"""""""^^^^^^^^^^^^""""^^^^^^^^^^^^^^^^"^"""""""""""""""""""""^^^^^"""""^^^^^^^^^^^^^^^^^^""""""^^',
        '^^""""""""""""^^^^^""""""^^^^^^^^^^^^^^"^""""""""""""""""""""""""^""""""""^^^^^^^"^""^^^^^^""""^^^^^',
        '^^"""""""""""""""""""""""^^^^^^^^^^^^^^""""""""""%%%%%%%""""""""""""""""""^^^^^^"""""""""^"""""^^^^^',
        '^^"""""""""""""""""""""""^^^^^^^^^^^^^""""""""%%%%%%%%%%%%%"""""""""""""""^^^^"""""""""""""""""^^^^^',
        '^^""""""""""""""""""""""""^^^^^^^^^^^^^""""""%%%%%%%%%%%%%%%"""""""""""""""^""""""""""""""""""^^^^^^',
        '^^"""^^^""""""""""""",,,,"^^^^^^^^^^^""""""""%%%%%%%%%%%%%%%"""""""""""""""^"""""""""""""""""^^^^^^^',
        '^^^^^^^^^""",,,,""""",~~,""^^^^^^^^^^^"""""""%%%%%%%%%%%%%%%"""""""""""""""""""""""""""""""""^^^^^^^',
        '^^^^^^^^"""",~~,""""",~~,"""^^^^^^^^^^""""""""%%%%%%%%%%%%%"""":::::"""""""""""""""""""""""""^^^^^^^',
        '^^^^^^^""""",~~,""""",,,,"""""""^^^^^^^^""""""""%%%%%%%%%""""""""""::::::::::::::""""""""""""^^^^^^^',
        '^^^^^^^^"""",,,,""""""""""""""""""^^^^^^"""""""""""""""""""""""""""""""""""""""""""""""""""""^^^^^^^',
        '^^^^^^^^"""""""""""""""""""""""""""""^^^^^""""""""""""""""""""""^^^^^^^^^^^^""""""""""""""""^^^^^^^^',
        '^^^^^^^"""""""""""",,,,"""""""""""""""^^^^^^"""""""::"""""""^^""^^^^^^^^^^^^^^^"""""""""""""^^^^^^^^',
        '^^^^^^^"""""""""""",~~,"""""^^^^^""""""^^^^^^^^"""":""^""^^^^^^"^^^^^^^^^^^^^^^""""""""""""^^^^^^^^^',
        '^^^^^^^^^"""""",,,,,~~,"""""^^^^^"""""^^^^^^^^^^""::"^^^^^^^^^"""^^^^^^^^^^^^""""^^^^""^^^^^^^^^^^^^',
        '^^^^^^^^^"""""",~~,,,,,""""""""^^""""^^^^^^^^^^^^":""^^^^^^^^"""""^^^^^^^^^"""""^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^""""",~~,""""""^"""""^^"""^^^^^^^^^^^^^":"^^^^^^^^^"""""^^^^^^^^^""""^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^^"""",,,"":""^"^^^^^^^^""""^^^^^^^^^^^^":"^^^^^^^^^^"""""^"""""^^""""^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^^^^""""""":"^^^^^^^^^^^"""""^^^^^^^^^^^":"^^^^^^^^^^^""""""""""""""""^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^^^^^""^"^":"""^^^^^^^^^""""""^^^^^"""^^":"^^"^^^^^^^^^""""""""""""""^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^":::"^^^^^^^^^^"""""^^^"^"^"^"":"^"""^^^""^^"""""""""""""^^^^^^^"""^^^^^^^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^""":"^^^^^^^^^^^^^^"""""""""""":""""""""""^""^^"""^^^^"^^^^^^"""""""""^^^^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^":"^^^^^"^^^^^"^""""""""""""":"""""""""""""^^^^^^^^^^^^^^^""""""""""""^^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^":"^^^^^"^^^^^""""""""""""""":"""""""""""""""^^^^^^^^^^^"""""""""""""""^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^""":""^^^""^^^^^--------------:::--------------^^^^^^^^^""""""##=######""""^^^^^^',
        '^^^^^^^^^^^^^^^^""""""::""^^""^^"^-"""""""""""""t":"t"""""""""""""-^^^^^^^^""""""#=======#"""^^^^^^^',
        '^^^^^^^^^^^^^^^^"""""""::"""""^""-"""""""""""""""":""""""""""""""""-""^^^^^""""""#====q===""""^^^^^^',
        '^^^^^^^^^^^^^^^^^^"""""":::"^^^""-"""""""""""""""":""""""""""""""""-""""^^^""""""#========""""^^^^^^',
        '^^^^^^^^^^^^^^^^^^^""""""":""^"""-"""""""""""""""":"""f""""""""""""-"""^^^^""""""#=======#"""""^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^""^^":"^""""-""""G""""R""""""V""""""A""""E""""-"""^^^^""""""####=####""""^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^":""^"""-"":::::::::::::::::::::::::::::""-""""^^^""""::"""""""""""""^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^":""""""-"""""""""P"""""":"v""""""""""""""-"""""^^"":::"""""""""""""^^^^"^^',
        '^^^^^^^^^^^^"^^^^^^^^^^^^":"^""""-""g""""""""""""","""""""""""""o""-"""""^^^":"""""""""""""""^^"""^^',
        '^^^^^^^^^^"""""""^^^^^^^^":""""""-t"""""""""""",,,,,,,b"""""""""""t-"""""^^^":""""""""""""""^^^^^"^^',
        '^^^^^^^^""""""""""^^^^^^^":"""""":""""""""""""",,,,,,,""""""""""""":""""""""":"""""""""""""""^""":^^',
        '^^^^^^^^"""#####"""^^"""""::::::::::::::::::::,,,,F,,,,::::::::::::::::::::::::::::::::::::::N::::Y^',
        '^^^^^^"""""#===#"""""":::::"""""":""""""""""""",,,,,,,""""""""""""":"""""""""""""""""""""""""^""":^^',
        '^^^^^""""""#=y=#"::::::""""""""""-t""""""u""""b,,,,,,,l"""""""""""t-"""""^^^^^^^""^^^^^^^^^^^^^^""^^',
        '^^^^"""""""##=##""""""""^^^""""""-"""""""""""""""",""""""""""""""""-"""""^^^^^^""""""^^^^^^^^^^"""^^',
        '^^^^"""""""""""""""^^"""^^^^"""""-"x"""""""""""""":"""""""""""""xx"-""""^^^^^^^""""""^^^^^^^^^^"""^^',
        '^^^^^"""""""""""""""""""^^^^^^"""-"""""""""""""""":""""""""""""""""-"""""^^^^^^^^^"""^^^^^^^^^^"""^^',
        '^^^^^^^^""""""""""""""""""^^^""""-"""I""""K"""S""":""""L""""W""""""-""""^^^^""^^^^^""^^^^^^^^^^"""^^',
        '^^^^^^^^^"""^^"""""""""""""^"""""-"":::::::::::::::::::::::::::::""-"""^^^^^"""^^^^^^^^^^^^^^^^"""^^',
        '^^^^^^^^^^"^^^^^"""""""""""^^^^^"-""""""""""h""""":""""""""n"""""""-""^^^^^""""^^^^^^^^^^^^^^^""""^^',
        '^^^^^^^^^^^^^^^^^"""""""""""^^^^^-"""""""""""""""m:""""""""""""""""-""^^""""""""^^^^^^^^^^^^^""^""^^',
        '^^^^^^^^^^^^^^^^^^""""""""""""^^^^-"""""""""""""t":"t"""""""""""""-^""""""""""""^^^^^^^^^^"""""^^"^^',
        '^^^^^^^^^^^^^^^^^^"""""""""""""""^^--------------:::--------------^^""""""""""""^^^^^^^^^"""""""""^^',
        '^^^^^^^^^^^^^^^^^^"""""""""""""""""""""""""""""""":""""""""""""""""""""""""""""^^^^^^^^^^"""^^^"""^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^"""""""""""""^^"""""""""":""""""""""""""""""""""""""""^^^^^^^^^^""^^^^"""^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^^""""""""^^^^^^"^"""""""":""""""""""""""""""""""""""""^^^^^^^^^^""^^^^""^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^"""""""""^^^^^^""^^""^""":"""""""""""""""""""""""""""^^^^^^^^^^^""^^^^^"^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^"""^^^^^^^^^^^^^^^^^^"""":"""""""^^^^"""""""""""^^^^^^^^^^^^^^^""""^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^^""^^^^^^^^^^^^^^^""""::::::::::"^^^^"""""""""""^^^^^^^^^^^^^^^^""^^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^""""""::::"""""""":"""""""""""""""""""""^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"::::::""""^^^^^^":::"""""""""""""""""""""^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"":""""""^^^^^^^^^""":::""""""""""""""""""^^^^^^^^^^^^^^^^^^^^^',
        '^,,,^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^""::"^^^^^^^^^^^^^^^"""":"""^""#######""^^^^^^^^^^^^^^^^^^^^^^^^',
        '^,,,^,,,,^,,^,,,",^,,^,,^,,,,^,,,^^""::"",,,,,,,^^^,^^^,,,^":::""""#=====#""""^^^^^^^^^^^^^^^^^^^^^^',
        '^X........c.............c........................................."#=====#"""""^^^^^^^^^^^^^^^^^^^^^',
        '^X.......................................c.............c.........."===j==#""""^^^^^^^^^^^^^^^^^^^^^^',
        '^,,,,^^,,,,"""",^,""""""""""""""""",^,,,,,,,,,,b^,,,,""""^^,,,""::"#=====#""""^^^^^^^^^^^^^^^^^^^^^^',
        '^,,,^^^^^^^""""^^^"""""""""""""""""""^^^^^^^^^^^^^^^^""""^^^^^"""""#=====#""""^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^"""""^^^""""""""""""""""""""^^^^^^^^^^^^^^^""""^^^"^^""""###=###""""^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^"""""^^^""""""""""""""""""""^^^^^^^^^^^^^^^^""""^"""^""""""""""""""^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^""""""^""""""""""""""""""""^^^^^^^^^^^^^^^^^""""""""^^"""""""""""""^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^""""""""""""""""""""""""""""^^^^^^^^^^^^^^^^^"""""""""^^^"""""""""^^^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^""""""""""""""""""""""""""""^^^^^^^^^^^^^^^^^^^""""""""""^^^^""""^^^^^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^"""""""""""""^^""""""""""""^^^^^^^^^^^^^^^^^^^^^^^""""""""""^^^^""^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^"""""""""""""^^""""^^""""""^^^^^^^^^^^^^^^^^^^^^^^""""""""""^^^"""^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^"""""""""""""^^^^"""^^""""""^^^^^^^^^^^^^^^^^^^^^^""""""""""""^^"""^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^"""""""""""""""^^^^"""^^""""""^^^^^^^^^^^^^^^^^^^^"""""""""""""""""""^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
      ],
      legend: {
        // Tentes : la porte est sur la case de l'entité ; wide/deep = cases voisines occupées par la toile
        R: { kind: 'object', id: 'tente_repos', sprite: 'tente_repos', solid: true, wide: 1, deep: 1, event: 'tente_repos', light: LANTERNE },
        A: { kind: 'object', id: 'tente_armes', sprite: 'tente_armes', solid: true, wide: 1, deep: 1, event: 'tente_armes', light: LANTERNE },
        E: { kind: 'object', id: 'tente_equip', sprite: 'tente_equip', solid: true, wide: 1, deep: 1, event: 'tente_equip', light: LANTERNE },
        V: { kind: 'object', id: 'tente_chef', sprite: 'tente_chef', solid: true, wide: 2, deep: 1, event: 'tente_chef', light: LANTERNE },
        I: { kind: 'object', id: 'tente_soin', sprite: 'tente_soin', solid: true, wide: 1, deep: 1, event: 'tente_soin', light: LANTERNE },
        K: { kind: 'object', id: 'tente_cuisine', sprite: 'tente_cuisine', solid: true, wide: 1, deep: 1, event: 'tente_cuisine', light: LANTERNE },
        G: { kind: 'object', id: 'tente_gaspard', sprite: 'tente_2', solid: true, wide: 1, deep: 1, event: 'tente_gaspard' },
        S: { kind: 'object', id: 'tente_reserve', sprite: 'tente_3', solid: true, wide: 1, deep: 1, event: 'tente_reserve' },
        L: { kind: 'object', id: 'tente_lina', sprite: 'tente', solid: true, wide: 1, deep: 1, event: 'tente_lina' },
        W: { kind: 'object', id: 'tente_mira', sprite: 'tente_2', solid: true, wide: 1, deep: 1, event: 'tente_mira' },
        // Village
        F: { kind: 'object', id: 'feu_camp', sprite: 'feu_camp', solid: true, light: { r: 4.4, color: '255,150,60', flicker: true }, examine: 'Le feu du camp. Depuis la fondation du village, on ne l’a jamais laissé s’éteindre.' },
        f: { kind: 'object', id: 'drapeau_camp', sprite: 'drapeau', solid: true, examine: 'Le drapeau du Clan du Corbeau : un oiseau noir sur fond d’ambre.' },
        t: { kind: 'object', sprite: 'torche', solid: true, light: { r: 2.5, color: '255,160,70', flicker: true } },
        u: { kind: 'object', id: 'puits', sprite: 'puits', solid: true, examine: 'Le puits du village. Une eau claire, filtrée par la roche : le vrai trésor du clan.' },
        x: { kind: 'object', sprite: 'caisse', solid: true, examine: 'Des caisses de ravitaillement clouées. On n’y touche pas sans l’accord de Valmont.' },
        b: BARIL,
        c: EPAVE,
        // Habitants
        v: { kind: 'npc', id: 'valmont', sprite: 'pnj_chef', event: 'valmont' },
        m: { kind: 'npc', id: 'mira', sprite: 'pnj_mira', event: 'mira', dir: 'down' },
        h: { kind: 'npc', id: 'hugo', sprite: 'pnj_hugo', event: 'hugo' },
        g: { kind: 'npc', id: 'gaspard', sprite: 'pnj_gaspard', event: 'gaspard', dir: 'right' },
        l: { kind: 'npc', id: 'lina', sprite: 'pnj_lina', event: 'lina', dir: 'left' },
        o: { kind: 'npc', id: 'bastien', sprite: 'pnj_bastien', event: 'tente_armes', dir: 'left' },
        n: { kind: 'npc', id: 'rosa', sprite: 'pnj_rosa', event: 'tente_equip', dir: 'down' },
        // Bêtes de la forêt (placées au hasard ; elles reviennent quand tu dors à la tente de repos)
        d: { kind: 'enemy', group: ['chien'], wander: 3, chase: 4 },
        D: { kind: 'enemy', group: ['chien_alpha', 'chien'], wander: 2, chase: 5 },
        k: { kind: 'enemy', group: ['corbeau', 'corbeau'], wander: 3, chase: 5 },
        C: { kind: 'enemy', group: ['corbeau', 'corbeau', 'corbeau'], wander: 2, chase: 5 },
        // Coffres (z, Z placés au hasard ; butin tiré au hasard : voir loot.js)
        z: { kind: 'chest', sprite: 'coffre', loot: 'foret' },
        Z: { kind: 'chest', sprite: 'coffre', loot: 'foret_rare' },
        y: { kind: 'chest', sprite: 'coffre', gear: 'casque_moto', loot: 'foret' },
        q: { kind: 'chest', sprite: 'caisse', weapon: 'fusil', ammo: 6, item: 'pieces', qty: 2 },
        j: { kind: 'chest', sprite: 'coffre', gold: 40, item: 'pieces', qty: 4, extra: { grenade: 2 } },
        // Sorties
        X: { kind: 'portal', to: { map: 'ruines_vaise', x: 3, y: 12, dir: 'right' } },
        Y: { kind: 'portal', to: { map: 'vaise_sud', x: 8, y: 18, dir: 'right' } },
        N: { kind: 'object', id: 'barrage_viperes', sprite: 'barricade', solid: true, hiddenIf: 'route_sud', event: 'barrage_viperes' },
      },
    },

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
        '##......b..#####..........R...,...##',
        '###.......########...~~~~.....######',
        '######..##########..~~~~~...########',
        '######..r...v......~~~~...c#########',
        '#######..........,.........#########',
        '####################################',
        '####################################',
      ],
      legend: {
        O: { kind: 'object', id: 'barricade_camp', sprite: 'barricade', solid: true, event: 'barricade_camp' },
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
