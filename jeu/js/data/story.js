/* Histoire : chapitres + événements.
   ─────────────────────────────────
   France, 2061. Douze ans après la Dernière Guerre, les survivants se battent en clans
   pour reprendre les ruines. Plus tard : des portails vers un monde de monstres, et des
   artefacts qui transforment en bête humanoïde.

   Un événement = une liste d'étapes jouées dans l'ordre :
     { say: 'Nom', portrait: 'mira', text: '...' }   dialogue ({nom} = nom du joueur)
     { narrate: '...' }                              narration
     { system: '...', title: 'Radio', alert }        message encadré (attend OK)
     { choice: 'Question ?', options: [{ label, steps: [...] }] }
     { notify: '...', kind: 'hint' | 'skill' | 'level' | 'quest' }
     { battle: ['pillard', ...], from: 'id_entité', noFlee, allowDefeat, intro: 'Titre' }
     { learn: 'technique' } · { give: 'objet', qty } · { gold: n } · { xp: n } · { stats: n }
     { weapon: 'fusil', ammo: 6 } · { artifact: 'loup' } · { territory: { id, owner } }
     { gear: 'bandana' } · { shop: 'armurerie' } · { rest: true } (repos : soins, sauvegarde, les bêtes reviennent)
     { take: 'objet', qty }  retire un objet du sac
     { quest: 'id' } · { flag: 'nom' } · { unflag: 'nom' }
     { if: 'flag', then: [...], else: [...] } · { call: 'autre_evenement' }
     { heal: 'full' } · { hunter: { title: '...' } }
     { chapter: 1 } · { teleport: { map, x, y, dir } } · { fade: 'out' | 'in' }
     { shake: ms } · { flash: '#couleur' } · { wait: ms } · { save: true }
     { end: { title, sub } }  écran de fin de chapitre */
G.data.story = {
  start: { map: 'foret', event: 'intro' },

  chapters: {
    0: { top: 'Prologue', main: 'La fièvre' },
    1: { top: 'Chapitre 1', main: 'Le château d’eau' },
    2: { top: 'Chapitre 2', main: 'La lumière de Fourvière' },
  },

  events: {
    // ═══════════════ VILLAGE DU CORBEAU ═══════════════
    valmont: [
      { if: 'medocs',
        then: [
          { if: 'boss_d',
            then: [{ say: 'Valmont', portrait: 'chef', text: 'Vaise-Sud est à nous, {nom}. Mais cette lumière au-dessus de Fourvière… je n’aime pas ça.' }],
            else: [{ say: 'Valmont', portrait: 'chef', text: 'La route de l’est mène à Vaise-Sud. Kross tient le château d’eau. Prépare-toi bien avant d’y aller.' }] },
        ],
        else: [
          { if: 'mission_medocs',
            then: [{ say: 'Valmont', portrait: 'chef', text: 'La station Gorge-de-Loup. Sors par la porte sud, puis suis la vieille route vers l’ouest jusqu’aux ruines de Vaise.' }],
            else: [
              { say: 'Valmont', portrait: 'chef', text: 'La fièvre gagne du terrain. Sœur Agnès n’a plus rien pour soigner.' },
              { say: 'Valmont', portrait: 'chef', text: 'Avant la guerre, il y avait une réserve de secours sous la station Gorge-de-Loup. Si quelqu’un peut encore y trouver des médicaments, c’est toi.' },
              { say: '{nom}', portrait: 'heros', text: 'Les ruines de Vaise… J’y vais.' },
              { say: 'Valmont', portrait: 'chef', text: 'Prends cette ferraille, tout le clan a participé. Passe voir Bastien et Rosa avant de partir.' },
              { gold: 60 },
              { flag: 'mission_medocs' },
              { quest: 'medocs' },
              { system: 'Le village du Corbeau :\n• Tente de repos (lune) : dormir, se soigner, sauvegarder.\n• Armurerie (fusils croisés) : armes, munitions, améliorations.\n• Équipement (casque) : protections, améliorations.\n• Infirmerie (croix rouge) : soins.\n\nLes améliorations coûtent de la ferraille et des pièces détachées : fouille les coffres de la forêt.', title: 'Le village' },
            ] },
        ] },
    ],

    tente_chef: [
      { narrate: 'La grande tente de Valmont. Des cartes de Lyon couvrent une table de fortune ; des épingles rouges marquent les territoires perdus.' },
      { call: 'valmont' },
    ],

    tente_repos: [
      { choice: 'Tente de repos.\nDormir jusqu’au matin ?\n(PV et énergie restaurés, chargeurs remplis, partie sauvegardée — les bêtes de la forêt reviennent.)',
        options: [
          { label: 'Dormir', steps: [{ fade: 'out' }, { rest: true }, { wait: 700 }, { fade: 'in' }, { notify: 'Tu te sens reposé. Partie sauvegardée.', kind: 'hint' }] },
          { label: 'Pas maintenant', steps: [] },
        ] },
    ],

    tente_armes: [{ shop: 'armurerie' }],
    tente_equip: [{ shop: 'equipement' }],

    tente_soin: [
      { if: 'medocs',
        then: [{ narrate: 'Les malades dorment enfin d’un sommeil calme. Sœur Agnès te sourit.' }],
        else: [{ narrate: 'Des lits de camp alignés. Des fiévreux gémissent sous des couvertures humides.' }] },
      { shop: 'infirmerie' },
    ],

    tente_cuisine: [
      { if: '!repas',
        then: [
          { say: 'Hugo', portrait: 'hugo', text: 'Ragoût de lapin et pommes de terre de la clairière ! Assieds-toi, {nom}.' },
          { heal: 'full' },
          { flag: 'repas' },
          { notify: 'PV et énergie restaurés.', kind: 'hint' },
        ],
        else: [{ say: 'Hugo', portrait: 'hugo', text: 'La marmite est vide ! Repasse après une bonne nuit.' }] },
    ],

    hugo: [
      { say: 'Hugo', portrait: 'hugo', text: 'Les corbeaux me volent mes lapins. Si tu en descends quelques-uns, je te garde une double ration.' },
      { call: 'tente_cuisine' },
    ],

    tente_gaspard: [
      { narrate: 'La tente de Gaspard sent le tabac froid. Des livres moisis s’empilent jusqu’au plafond.' },
    ],

    gaspard: [
      { if: 'gaspard_cadeau',
        then: [
          { say: 'Gaspard', portrait: 'gaspard', text: 'Avant la guerre, cette forêt, c’était des randonneurs le dimanche. Maintenant, même les corbeaux ont faim.' },
          { say: 'Gaspard', portrait: 'gaspard', text: 'Il y a une vieille ferme à l’est et une chapelle au sud-est. Les pillards n’y sont pas encore passés, je crois.' },
        ],
        else: [
          { say: 'Gaspard', portrait: 'gaspard', text: 'Ah, le petit {nom}. Tu pars encore fouiller les ruines ?' },
          { say: 'Gaspard', portrait: 'gaspard', text: 'Tiens, mon vieux bandana. Il m’a sauvé la vie plus d’une fois : la sueur dans les yeux, ça ne pardonne pas.' },
          { gear: 'bandana' },
          { flag: 'gaspard_cadeau' },
          { system: 'L’équipement se porte sur la tête, le corps et les pieds.\nChange-le dans le carnet (onglet Équipement) ou chez Rosa, qui peut aussi l’améliorer.', title: 'Équipement' },
        ] },
    ],

    lina: [
      { if: 'lina_secret',
        then: [{ say: 'Lina', portrait: 'lina', text: 'Les corbeaux adorent ce qui brille. Leurs nids sont pleins de trucs ! Au nord-est, près des grands arbres morts.' }],
        else: [
          { say: 'Lina', portrait: 'lina', text: 'Psst, {nom} ! Tu veux un secret ?' },
          { say: 'Lina', portrait: 'lina', text: 'Le vieux chasseur avait une cabane à l’ouest. Il y a un coffre dedans, j’en suis sûre !' },
          { flag: 'lina_secret' },
        ] },
    ],
    tente_lina: [{ narrate: 'Une tente pleine de dessins d’enfants : des arbres, un feu, et un grand oiseau noir.' }],
    tente_reserve: [{ narrate: 'La réserve du clan. Un cadenas rouillé, et Valmont garde la clé.' }],
    tente_mira: [{ narrate: 'La tente de Mira. Un fusil démonté repose sur une couverture, impeccablement huilé.' }],

    barrage_viperes: [
      { narrate: 'Une barricade de sacs de sable et de troncs bloque la route de l’est. Un serpent vert y est peint à la bombe.' },
      { say: '{nom}', portrait: 'heros', text: 'Les Vipères jusqu’ici… Impossible de passer seul pour l’instant.' },
    ],

    // ═══════════════ PROLOGUE ═══════════════
    intro: [
      { fade: 'out', ms: 1 },
      { narrate: 'En 2047, la Dernière Guerre a embrasé le monde. Deux ans de bombes, de famines, puis le silence radio.' },
      { narrate: 'Quand la poussière est retombée, la France n’était plus qu’un archipel de ruines. Plus d’État. Plus d’armée. Plus de lois.' },
      { narrate: 'Les survivants se sont regroupés en clans. Chaque rue, chaque puits, chaque bidon d’essence se gagne désormais les armes à la main.' },
      { narrate: 'Le Clan du Corbeau a fui les ruines de Lyon. Il vit caché au cœur de la forêt des Monts d’Or : dix tentes, une palissade, et un feu qui ne s’éteint jamais.' },
      { narrate: 'Tu t’appelles {nom}. Récupérateur du clan. Ton métier : fouiller les ruines… et en revenir vivant.' },
      { narrate: 'Cette nuit, la fièvre a encore emporté quelqu’un. À l’infirmerie, il ne reste plus un seul cachet.' },
      { fade: 'in' },
      { chapter: 0 },
      { notify: 'Se déplacer : flèches ou ZQSD · Parler / fouiller : Espace ou Entrée · Carnet et carte : Tab', kind: 'hint' },
      { say: 'Valmont', portrait: 'chef', text: '{nom} ! Viens me voir, devant la grande tente. Vite.' },
      { if: G => G.config.TRIAL, then: [{ call: 'version_essai' }] },
    ],

    // Version d'essai : transformation en Tigre-garou disponible dès le départ
    version_essai: [
      { artifact: 'tigre' },
      { system: 'VERSION D’ESSAI\nTu possèdes l’Artefact du Tigre.\n\nEn combat, la jauge BÊTE se remplit quand tu frappes ou encaisses (elle démarre à moitié pleine).\nPleine, choisis « Transformation : Tigre-garou » : 4 tours de griffes, de bonds et de rugissements.', title: 'Tigre-garou' },
    ],

    mira: [
      { if: 'medocs',
        then: [{ say: 'Mira', portrait: 'mira', text: 'Tu as tenu parole, {nom}. Le camp te doit une fière chandelle.' }],
        else: [
          { if: '!mission_medocs',
            then: [{ say: 'Mira', portrait: 'mira', text: 'Valmont te cherche. Il est devant la grande tente, au nord du feu.' }],
            else: [
              { if: 'mira_arme',
                then: [{ say: 'Mira', portrait: 'mira', text: 'Sors par ici, puis suis la vieille route vers l’ouest jusqu’aux ruines de Vaise. Et méfie-toi des corbeaux : ils attaquent en bande.' }],
                else: [
                  { say: 'Mira', portrait: 'mira', text: 'Tu pars pour Vaise ? Seul, avec un couteau ?' },
                  { say: '{nom}', portrait: 'heros', text: 'Les chiens ne m’ont jamais fait peur.' },
                  { say: 'Mira', portrait: 'mira', text: 'Les Vipères, si. Tiens, prends le pistolet de Paulo. Il n’en aura plus besoin.' },
                  { weapon: 'pistolet', ammo: 16 },
                  { flag: 'mira_arme' },
                  { system: 'Chaque arme a ses forces et ses faiblesses.\nCouteau : aucune munition, mais au contact.\nPistolet : précis, à distance, mais 8 balles par chargeur.\nRecharger coûte un tour en combat. Les balles sont rares : l’armurerie en vend.', title: 'Conseil' },
                  { say: 'Mira', portrait: 'mira', text: 'Une meute de chiens rôde dans la forêt. Si tu en abats quelques-uns en chemin, les cueilleurs respireront mieux.' },
                  { quest: 'chiens' },
                ] },
            ] },
        ] },
    ],

    barricade_camp: [
      { choice: 'Retourner dans la forêt des Monts d’Or ?',
        options: [
          { label: 'Rentrer au village', steps: [{ fade: 'out' }, { teleport: { map: 'foret', x: 3, y: 61, dir: 'right' } }, { fade: 'in' }] },
          { label: 'Rester ici', steps: [] },
        ] },
    ],

    station: [
      { narrate: 'Les escaliers de la station Gorge-de-Loup plongent dans le noir. Ça sent l’humidité… et la poudre.' },
      { say: '{nom}', portrait: 'heros', text: 'Des douilles. Toutes fraîches. Je ne suis pas le premier.' },
    ],

    pilier: [
      { narrate: 'Un pilier couvert d’affiches à moitié brûlées : « Évacuation obligatoire — Préfecture du Rhône, 2047 ».' },
    ],

    kross_parle: [
      { say: 'Kross', portrait: 'kross', text: 'Bouge pas, gamin.' },
    ],

    caisse_medocs: [
      { if: 'embuscade',
        then: [{ narrate: 'La caisse est vide. Tu as tout pris.' }],
        else: [
          { narrate: 'Une caisse marquée d’une croix rouge. Antibiotiques, morphine, pansements. De quoi sauver le camp.' },
          { give: 'medicaments', qty: 1 },
          { shake: 300 },
          { flag: 'embuscade' },
          { say: '???', text: 'Pose ça, gamin. Doucement.' },
          { say: 'Kross', portrait: 'kross', text: 'Ces médocs appartiennent aux Vipères. Comme tout ce qui dort sous terre.' },
          { say: '{nom}', portrait: 'heros', text: 'Le Corbeau a des malades. On était là avant vous.' },
          { say: 'Kross', portrait: 'kross', text: 'Alors le Corbeau va apprendre à prier.' },
          { battle: ['kross_intro'], from: 'kross', allowDefeat: true, noFlee: true, intro: 'Kross, lieutenant des Vipères' },
          { call: 'apres_embuscade' },
        ] },
    ],

    apres_embuscade: [
      { narrate: 'Une rafale te projette contre le carrelage. Tes oreilles sifflent. Le goût du sang emplit ta bouche.' },
      { say: 'Kross', portrait: 'kross', text: 'Rico, finis-le et rapporte la caisse. Je retourne au château d’eau.' },
      { flag: 'kross_parti' },
      { narrate: 'Les pas de Kross s’éloignent dans le tunnel. Un pillard s’approche en ricanant, pistolet au poing.' },
      { narrate: 'L’adrénaline te remet debout. Ta main trouve ton couteau. Pas question de mourir ici.' },
      { heal: 'full' },
      { learn: 'lame_double' },
      { save: true },
      { battle: ['rico'], noFlee: true, intro: 'Rico, pillard Vipère' },
      { narrate: 'Rico s’effondre. Le silence retombe sur la station.' },
      { say: '{nom}', portrait: 'heros', text: 'Le château d’eau… Si les Vipères tiennent l’eau, elles tiennent tout le quartier.' },
      { flag: 'medocs' },
      { narrate: 'Au fond du quai, un escalier de service remonte vers la surface.' },
      { save: true },
    ],

    escalier: [
      { choice: 'Remonter à la surface ?\n(Fin du prologue)',
        options: [
          { label: 'Remonter', steps: [{ call: 'vers_chapitre1' }] },
          { label: 'Pas encore', steps: [] },
        ] },
    ],

    vers_chapitre1: [
      { fade: 'out' },
      { narrate: 'Tu remontes à la surface et regagnes la forêt à la nuit tombée, la caisse sur le dos.' },
      { teleport: { map: 'foret', x: 50, y: 33, dir: 'up' } },
      { take: 'medicaments' },
      { narrate: 'Les médicaments arrivent à temps. À l’infirmerie, la fièvre recule.' },
      { narrate: 'Mais la nouvelle de l’embuscade fait le tour du feu de camp : les Vipères ont franchi le fleuve.' },
      { fade: 'in' },
      { say: 'Valmont', portrait: 'chef', text: 'Kross s’est installé au château d’eau de Vaise-Sud. Qui tient l’eau tient le quartier… et bientôt la forêt.' },
      { say: 'Valmont', portrait: 'chef', text: 'Nos guetteurs ont fait sauter la barricade des Vipères, sur la route de l’est. Le chemin de Vaise-Sud est ouvert.' },
      { say: '{nom}', portrait: 'heros', text: 'J’y vais. Kross me doit une revanche.' },
      { say: 'Valmont', portrait: 'chef', text: 'Prends ça. Passe voir Bastien et Rosa : ils ont reçu de quoi t’équiper. Et ramène-moi ce château d’eau.' },
      { give: 'mun_9mm', qty: 12 },
      { give: 'grenade', qty: 1 },
      { gold: 100 },
      { flag: 'route_sud' },
      { chapter: 1 },
      { quest: 'vaise_sud' },
      { save: true },
    ],

    // ═══════════════ CHAPITRE 1 ═══════════════
    entree_d: [
      { say: '{nom}', portrait: 'heros', text: 'Vaise-Sud. Les Vipères ont tagué leurs serpents sur tous les murs.' },
      { quest: 'vaise_sud' },
    ],

    barricade_d: [
      { choice: 'Retourner dans la forêt des Monts d’Or ?',
        options: [
          { label: 'Rentrer au village', steps: [{ fade: 'out' }, { teleport: { map: 'foret', x: 96, y: 38, dir: 'left' } }, { fade: 'in' }] },
          { label: 'Rester ici', steps: [] },
        ] },
    ],

    pre_boss: [
      { narrate: 'Le château d’eau domine la place. Des bidons enflammés brûlent à son pied.' },
      { say: 'Kross', portrait: 'kross', text: 'Le gamin du Corbeau ! T’as la peau dure, je te l’accorde.' },
      { say: '{nom}', portrait: 'heros', text: 'Et toi, tu prends ce qui n’est pas à toi.' },
    ],

    boss_kross: [
      { battle: ['kross', 'pillard_tireur'], noFlee: true, intro: 'Kross, lieutenant des Vipères' },
      { flag: 'boss_d' },
      { shake: 400 },
      { system: 'Kross est tombé.\nLes Vipères battent en retraite vers le sud.', title: 'Radio' },
      { narrate: 'Tu récupères la mitrailleuse de Kross. Lourde, brûlante, gourmande en balles.' },
      { weapon: 'mitrailleuse', ammo: 60 },
      { narrate: 'Il ne reste qu’à planter le drapeau du Corbeau au pied du château d’eau.' },
      { save: true },
    ],

    sortie_d: [
      { say: '{nom}', portrait: 'heros', text: 'Ce quartier appartient au Corbeau.' },
      { territory: { id: 'vaise_sud', owner: 'corbeau' } },
      { system: 'Territoire repris : Vaise-Sud.\nLe clan contrôle désormais le château d’eau.', title: 'Territoire' },
      { narrate: 'Cette nuit-là, la terre tremble.' },
      { shake: 700 },
      { narrate: 'Au-dessus de la colline de Fourvière, le ciel se déchire d’une lumière violette.' },
      { say: '{nom}', portrait: 'heros', text: 'C’est quoi, ça… ?' },
      { save: true },
      { end: { title: 'Fin du chapitre 1', sub: 'Chapitre 2 : La lumière de Fourvière\n— à suivre —' } },
    ],
  },
};
