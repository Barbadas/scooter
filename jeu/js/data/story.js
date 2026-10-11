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
     { quest: 'id' } · { flag: 'nom' } · { unflag: 'nom' }
     { if: 'flag', then: [...], else: [...] } · { call: 'autre_evenement' }
     { heal: 'full' } · { hunter: { title: '...' } }
     { chapter: 1 } · { teleport: { map, x, y, dir } } · { fade: 'out' | 'in' }
     { shake: ms } · { flash: '#couleur' } · { wait: ms } · { save: true }
     { end: { title, sub } }  écran de fin de chapitre */
G.data.story = {
  start: { map: 'ruines_vaise', event: 'intro' },

  chapters: {
    0: { top: 'Prologue', main: 'Les ruines de Vaise' },
    1: { top: 'Chapitre 1', main: 'Le château d’eau' },
    2: { top: 'Chapitre 2', main: 'La lumière de Fourvière' },
  },

  events: {
    // ═══════════════ PROLOGUE ═══════════════
    intro: [
      { fade: 'out', ms: 1 },
      { narrate: 'En 2047, la Dernière Guerre a embrasé le monde. Deux ans de bombes, de famines, puis le silence radio.' },
      { narrate: 'Quand la poussière est retombée, la France n’était plus qu’un archipel de ruines. Plus d’État. Plus d’armée. Plus de lois.' },
      { narrate: 'Les survivants se sont regroupés en clans. Chaque rue, chaque puits, chaque bidon d’essence se gagne désormais les armes à la main.' },
      { narrate: 'Lyon, 2061. Tu t’appelles {nom}. Récupérateur du Clan du Corbeau.' },
      { narrate: 'Une fièvre ravage le camp. Les médicaments manquent. Le dernier stock connu dort sous la station Gorge-de-Loup, en territoire contesté.' },
      { fade: 'in' },
      { chapter: 0 },
      { quest: 'medocs' },
      { notify: 'Se déplacer : flèches ou ZQSD · Parler / fouiller : Espace ou Entrée', kind: 'hint' },
    ],

    mira: [
      { if: 'medocs',
        then: [{ say: 'Mira', portrait: 'mira', text: 'Tu tiens à peine debout, {nom}. Remonte par l’escalier de service, je te rejoins au camp.' }],
        else: [
          { if: 'mira_arme',
            then: [{ say: 'Mira', portrait: 'mira', text: 'La station est au nord-est, derrière les immeubles effondrés. Je couvre la barricade.' }],
            else: [
              { say: 'Mira', portrait: 'mira', text: 'Te voilà enfin, {nom}. Des Vipères ont été vues dans le secteur cette nuit.' },
              { say: '{nom}', portrait: 'heros', text: 'Des Vipères, à Vaise ? Elles ne traversent jamais le fleuve.' },
              { say: 'Mira', portrait: 'mira', text: 'Plus maintenant. Tiens, prends le pistolet de Paulo. Il n’en aura plus besoin.' },
              { weapon: 'pistolet', ammo: 16 },
              { flag: 'mira_arme' },
              { system: 'Chaque arme a ses forces et ses faiblesses.\nCouteau : aucune munition, mais au contact.\nPistolet : précis, à distance, mais 8 balles par chargeur.\nRecharger coûte un tour en combat. Les balles sont rares.', title: 'Conseil' },
              { say: 'Mira', portrait: 'mira', text: 'Et méfie-toi des chiens. Une meute rôde dans les ruines. Si tu peux en abattre quelques-uns, le clan respirera mieux.' },
              { quest: 'chiens' },
            ] },
        ] },
    ],

    barricade_camp: [
      { if: 'medocs',
        then: [{ say: '{nom}', portrait: 'heros', text: 'L’escalier de service, au fond de la station, rejoint directement le camp.' }],
        else: [{ say: '{nom}', portrait: 'heros', text: 'Pas sans les médicaments. Le camp compte sur moi.' }] },
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
      { narrate: 'Les médicaments arrivent à temps. Au camp du Corbeau, la fièvre recule.' },
      { narrate: 'Mais la nouvelle de l’embuscade fait le tour des feux de camp : les Vipères ont franchi le fleuve.' },
      { say: 'Valmont', portrait: 'chef', text: 'Kross s’est installé au château d’eau de Vaise-Sud. Qui tient l’eau tient le quartier.' },
      { say: 'Valmont', portrait: 'chef', text: 'Le clan n’a pas assez de bras pour un assaut. Mais un récupérateur discret, qui connaît les ruines…' },
      { say: '{nom}', portrait: 'heros', text: 'J’y vais. Kross me doit une revanche.' },
      { say: 'Valmont', portrait: 'chef', text: 'Prends ça. Et ramène-moi ce château d’eau.' },
      { give: 'mun_9mm', qty: 12 },
      { give: 'grenade', qty: 1 },
      { teleport: { map: 'vaise_sud' } },
      { fade: 'in' },
      { chapter: 1 },
      { save: true },
    ],

    // ═══════════════ CHAPITRE 1 ═══════════════
    entree_d: [
      { say: '{nom}', portrait: 'heros', text: 'Vaise-Sud. Les Vipères ont tagué leurs serpents sur tous les murs.' },
      { quest: 'vaise_sud' },
    ],

    barricade_d: [
      { if: 'boss_d',
        then: [{ say: '{nom}', portrait: 'heros', text: 'Le drapeau du Corbeau m’attend au pied du château d’eau.' }],
        else: [{ say: '{nom}', portrait: 'heros', text: 'Pas de retour au camp tant que Kross tient le château d’eau.' }] },
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
