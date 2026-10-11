/* Histoire : chapitres + événements.
   ─────────────────────────────────
   Un événement = une liste d'étapes jouées dans l'ordre :
     { say: 'Nom', portrait: 'mira', text: '...' }   dialogue ({nom} = nom du joueur)
     { narrate: '...' }                              narration
     { system: '...', title: 'NOTIFICATION', alert } fenêtre du Système (attend OK)
     { choice: 'Question ?', options: [{ label, steps: [...] }] }
     { notify: '...', kind: 'hint' | 'skill' | 'level' }   notification rapide
     { battle: ['gobelin', ...], from: 'id_entité', noFlee, allowDefeat, intro: 'Titre' }
     { learn: 'skill_id' } · { give: 'potion', qty } · { gold: n } · { xp: n } · { stats: n }
     { quest: 'id' } · { flag: 'nom' } · { unflag: 'nom' }
     { if: 'flag', then: [...], else: [...] } · { call: 'autre_evenement' }
     { heal: 'full' } · { hunter: { title: '...' } }
     { chapter: 1 } · { teleport: { map, x, y, dir } } · { fade: 'out' | 'in' }
     { shake: ms } · { flash: '#couleur' } · { wait: ms } · { save: true }
     { end: { title, sub } }  écran de fin de chapitre */
G.data.story = {
  start: { map: 'portail_e', event: 'intro' },

  chapters: {
    0: { top: 'Prologue', main: 'Le chasseur le plus faible' },
    1: { top: 'Chapitre 1', main: 'Le portail de rang D' },
    2: { top: 'Chapitre 2', main: 'La quête de changement de classe' },
  },

  events: {
    // ═══════════════ PROLOGUE ═══════════════
    intro: [
      { fade: 'out', ms: 1 },
      { narrate: 'Il y a dix ans, des failles appelées « Portails » se sont ouvertes partout dans le monde.' },
      { narrate: "Derrière chacune d'elles se cache un donjon peuplé de monstres. Si personne ne le nettoie, ils finissent par en sortir." },
      { narrate: 'Certains humains se sont alors éveillés à des pouvoirs. On les appelle les Chasseurs, classés du rang E au rang S.' },
      { narrate: '{nom} est un Chasseur de rang E. Le plus faible de tous.' },
      { narrate: "Mais les factures n'attendent pas. Alors aujourd'hui encore, il franchit un portail dont personne ne veut." },
      { fade: 'in' },
      { chapter: 0 },
      { notify: 'Se déplacer : flèches ou ZQSD · Parler / interagir : Espace ou Entrée', kind: 'hint' },
    ],

    mira: [
      { if: 'eveil',
        then: [
          { say: 'Mira', portrait: 'mira', text: "Tu as changé, {nom}. Ton regard… Qu'est-ce qui s'est passé là-dedans ?" },
        ],
        else: [
          { if: 'mira_potions',
            then: [{ say: 'Mira', portrait: 'mira', text: 'Les rats sont plus loin dans la grotte. Ne joue pas les héros.' }],
            else: [
              { say: 'Mira', portrait: 'mira', text: "Encore toi, {nom} ? Le « chasseur le plus faible de l'humanité » en personne." },
              { say: '{nom}', portrait: 'heros', text: "Un portail de rang E, c'est dans mes cordes. Et j'ai besoin de la prime." },
              { say: 'Mira', portrait: 'mira', text: 'Des rats géants rôdent dans les galeries. Ils mordent fort. Prends ça, au cas où.' },
              { give: 'potion', qty: 2 },
              { flag: 'mira_potions' },
              { say: 'Mira', portrait: 'mira', text: 'Je garde l’entrée. Si ça tourne mal, tu cours. Tu sais faire, non ?' },
            ] },
        ] },
    ],

    portail_entree: [
      { if: 'eveil',
        then: [{ say: '{nom}', portrait: 'heros', text: "Pas question de rentrer maintenant. Le portail au fond du temple m'appelle." }],
        else: [{ say: '{nom}', portrait: 'heros', text: 'Je ne peux pas repartir les mains vides. Il faut nettoyer ce donjon.' }] },
    ],

    temple_entree: [
      { shake: 300 },
      { narrate: "Un souffle glacé traverse la galerie. Derrière la roche s'ouvre une salle immense, taillée par une main inconnue." },
      { say: '{nom}', portrait: 'heros', text: 'Un donjon… caché dans le donjon ?' },
      { say: '{nom}', portrait: 'heros', text: "Ces statues… j'ai l'impression qu'elles me regardent." },
    ],

    statue: [
      { narrate: 'Une statue colossale tenant un marteau de pierre. Ses yeux vides semblent suivre chacun de tes gestes.' },
    ],

    gardien_examine: [
      { narrate: 'La plus grande des statues. Une inscription est gravée à ses pieds :' },
      { narrate: '« Prie. Loue. Prouve ta foi. »' },
    ],

    autel: [
      { if: 'eveil',
        then: [{ narrate: "L'autel est froid et silencieux. Ce qui devait arriver ici est déjà arrivé." }],
        else: [
          { narrate: "Au centre de l'autel, une pierre bleue pulse comme un cœur. Tu poses la main dessus." },
          { shake: 600 },
          { flash: '#ff3355' },
          { narrate: "Les yeux des statues s'embrasent d'une lueur écarlate !" },
          { say: '???', text: 'Ceux qui ne prouvent pas leur valeur… périront.' },
          { battle: ['gardien'], from: 'gardien', allowDefeat: true, noFlee: true, intro: 'Le Gardien s’éveille' },
          { call: 'eveil' },
        ] },
    ],

    eveil: [
      { narrate: 'Ton corps ne répond plus. Le sol est glacé. Le marteau de pierre se lève au-dessus de toi…' },
      { narrate: "Alors c'est comme ça que ça se termine ?" },
      { wait: 400 },
      { system: 'Les conditions de la quête secrète « Le courage du faible » sont remplies.', title: 'Notification' },
      { call: 'eveil_choix' },
    ],

    eveil_choix: [
      { choice: 'Vous avez acquis le droit de devenir un Joueur.\nAcceptez-vous ?',
        options: [
          { label: 'Accepter', steps: [{ call: 'eveil_accepte' }] },
          { label: 'Refuser', steps: [
            { system: "Si vous refusez, votre cœur s'arrêtera dans 0,02 seconde.", title: 'Alerte', alert: true },
            { call: 'eveil_choix' },
          ] },
        ] },
    ],

    eveil_accepte: [
      { flash: '#3fb4ff' },
      { flag: 'eveil' },
      { flag: 'systeme' },
      { hunter: { title: 'Le Joueur' } },
      { heal: 'full' },
      { system: 'Félicitations. Vous êtes désormais un Joueur.', title: 'Système' },
      { learn: 'frappe_rapide' },
      { narrate: 'Une énergie inconnue envahit tes veines. Tes blessures se referment.' },
      { narrate: 'Devant toi, le Gardien se fige. Une fissure incandescente parcourt son torse.' },
      { save: true },
      { battle: ['gardien_fissure'], from: 'gardien', noFlee: true, intro: 'Gardien fissuré' },
      { flag: 'gardien_vaincu' },
      { shake: 500 },
      { narrate: "Le colosse s'effondre dans un fracas de pierre." },
      { system: 'Une quête quotidienne est disponible.', title: 'Quête' },
      { quest: 'quotidienne' },
      { notify: 'Ouvre la fenêtre du Système : touche Tab ou M (ou bouton SYSTÈME).', kind: 'hint' },
      { narrate: "Au fond du temple, un portail vient de s'ouvrir." },
      { save: true },
    ],

    portail_temple: [
      { choice: 'Traverser le portail ?\n(Fin du prologue)',
        options: [
          { label: 'Traverser', steps: [{ call: 'vers_chapitre1' }] },
          { label: 'Pas encore', steps: [] },
        ] },
    ],

    vers_chapitre1: [
      { fade: 'out' },
      { narrate: 'Trois jours plus tard.' },
      { narrate: "Les médecins n'en reviennent pas : aucune séquelle. Et chaque matin, une fenêtre bleue t'attend au réveil." },
      { narrate: "Un portail de rang D vient d'apparaître dans une ancienne station de métro. Le raid officiel n'arrivera que demain." },
      { say: '{nom}', portrait: 'heros', text: "Demain, ce sera trop tard. Voyons ce que ce « Système » a dans le ventre." },
      { teleport: { map: 'portail_d' } },
      { fade: 'in' },
      { chapter: 1 },
      { save: true },
    ],

    // ═══════════════ CHAPITRE 1 ═══════════════
    entree_d: [
      { say: '{nom}', portrait: 'heros', text: "Rang D. Il y a une semaine, j'aurais fait demi-tour." },
      { quest: 'boss_d' },
    ],

    portail_d_entree: [
      { if: 'boss_d',
        then: [{ say: '{nom}', portrait: 'heros', text: 'Le donjon est nettoyé. La sortie est au fond de la salle du boss.' }],
        else: [{ say: '{nom}', portrait: 'heros', text: 'Le portail ne se refermera pas tant que le maître du donjon est en vie.' }] },
    ],

    pre_boss: [
      { narrate: 'Une odeur de sang et de fumée. Des tambours résonnent au bout du tunnel.' },
      { say: 'Kargash', portrait: 'kargash', text: "Un humain ? Seul ? Ha ! Ta chair nourrira ma tribu tout l'hiver !" },
      { say: '{nom}', portrait: 'heros', text: 'Viens donc vérifier.' },
    ],

    boss_kargash: [
      { battle: ['chef_gobelin', 'gobelin'], noFlee: true, intro: 'Kargash, chef de guerre' },
      { flag: 'boss_d' },
      { shake: 400 },
      { system: 'Le maître du donjon a été vaincu.\nLe portail va se refermer.', title: 'Donjon nettoyé' },
      { system: 'Récompense spéciale : une nouvelle compétence.', title: 'Récompense' },
      { learn: 'soif_de_sang' },
      { gold: 100 },
      { narrate: "Un portail de sortie s'ouvre au fond de la salle." },
      { save: true },
    ],

    sortie_d: [
      { say: '{nom}', portrait: 'heros', text: 'Je deviens plus fort. Je le sens à chaque combat.' },
      { system: 'Des conditions cachées ont été détectées.\nLa « Quête de changement de classe » sera bientôt disponible.', title: '???' },
      { save: true },
      { end: { title: 'Fin du chapitre 1', sub: 'Chapitre 2 : La quête de changement de classe\n— à suivre —' } },
    ],
  },
};
