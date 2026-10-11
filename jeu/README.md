# Terres de Cendre

RPG de survie au tour par tour, vue de dessus. France, 2061 : douze ans après la Dernière Guerre,
les survivants s'organisent en clans et se battent pour reprendre les ruines.
HTML + JavaScript pur : aucune installation, aucun build.

## Jouer

- **Ouvrir `jeu/index.html`** dans un navigateur (double-clic), ou via GitHub Pages.
- Déplacement : **flèches** ou **ZQSD** (WASD en QWERTY)
- Interagir / valider : **Espace** ou **Entrée**
- Retour : **Échap**
- Carnet (statut, armes, équipement, sac, missions, **carte**, territoires) : **Tab** ou **M**
- Sur téléphone : manette tactile sous l'écran.

## Univers

- **La forêt des Monts d'Or**, aux portes de Lyon en ruines. Le héros est récupérateur du **Clan du Corbeau**,
  dont le village de tentes se cache au milieu des bois.
- **Clans rivaux** : Vipères (pillards, à l'ouest du fleuve), Ours (Croix-Rousse), et un clan inconnu à Fourvière.
- **Territoires** : chaque quartier repris passe sous la bannière du clan (onglet *Territoires* du carnet).
- **Plus tard** : des portails s'ouvrent vers un autre monde peuplé de monstres, et des **artefacts**
  permettent de se transformer en bête humanoïde, en plein combat.

## Monde ouvert

- Le jeu commence **au village du Corbeau**, au centre d'une forêt de 100 × 76 cases : lac, ferme en ruine,
  chapelle, cratères de bombes, cabane du chasseur, vieille route.
- **Coffres** (butin tiré au hasard : ferraille, pièces détachées, soins, munitions, grenades) et **bêtes**
  (chiens errants, meutes, corbeaux charognards) sont **placés au hasard** : chaque nouvelle partie a sa forêt.
- Une bête vaincue le reste jusqu'à la prochaine nuit à la tente de repos ; pendant la nuit, les bêtes
  reviennent… ailleurs.
- Sorties : la vieille route mène aux **ruines de Vaise** (sud-ouest), la route de l'est à **Vaise-Sud**
  (barricade des Vipères levée au chapitre 1).
- Onglet **Carte** du carnet : zones découvertes, tentes, coffres repérés, sorties.

### Le village (10 tentes)

| Tente | Rôle |
|---|---|
| Repos (lune) | dormir : PV / énergie / chargeurs restaurés, sauvegarde, les bêtes reviennent |
| Armurerie (fusils croisés) — Bastien | acheter armes, munitions, grenades · **améliorer les armes** (+1 à +5) |
| Équipement (casque) — Rosa | acheter tête / corps / pieds · **améliorer** (+1 à +4) · s'équiper |
| Infirmerie (croix) — Sœur Agnès | trousses, stimulants, kits chirurgicaux |
| Cuisine — Hugo | un repas complet par nuit |
| Grande tente de Valmont | le chef du clan, les missions |
| Gaspard, Lina, Mira, réserve | habitants, indices, histoire |

Améliorer coûte de la **ferraille** et des **pièces détachées** (coffres, ennemis).
Arme : dégâts +12 %, précision +2 %, critique +1 % par niveau, chargeur agrandi tous les 2 niveaux.
Équipement : caractéristiques +25 % par niveau.

## Contenu actuel

| Partie | Contenu |
|---|---|
| Prologue | Village du Corbeau, Valmont, Mira, la forêt ; ruines de Vaise : station de métro, embuscade de **Kross**, duel contre **Rico** |
| Chapitre 1 | Vaise-Sud, territoire des Vipères : pillards, tireurs, tireur d'élite, boss **Kross** au château d'eau |
| Fin du chapitre 1 | Territoire repris, puis une lumière violette déchire le ciel de Fourvière (le premier portail) |

### Armes

| Arme | Avantages | Inconvénients |
|---|---|---|
| Couteau | aucune munition, critique +15 %, saignement | corps à corps, faible contre les armures |
| Pistolet 9 mm | à distance, précis, munitions courantes | dégâts moyens, chargeur de 8 |
| Fusil à lunette | dégâts très élevés, ignore 50 % d'armure | chargeur de 4, munitions rares, aucune esquive au tour suivant |
| Mitrailleuse | rafale de 6 balles sur tous les ennemis | imprécise, vide vite le chargeur, lourde (vitesse −40 %) |

Les armes à feu ont un **chargeur** et une **réserve** : recharger prend le tour. Les chargeurs se remplissent après chaque combat.

### Techniques

| Technique | Déblocage |
|---|---|
| Lame double (2 coups de couteau) | Prologue, après l'embuscade |
| Premiers soins | Niveau 2 |
| Coup de grâce | Niveau 3 |
| Intimidation | Niveau 5 |

### Transformation — version d'essai : Tigre-garou

- **Version d'essai** (`TRIAL: true` dans `js/core/config.js`) : l'**Artefact du Tigre** est donné dès le début
  et la jauge démarre à moitié pleine à chaque combat. Mettre `TRIAL: false` pour l'histoire normale.
- Un artefact équipé remplit la jauge **BÊTE** quand tu frappes ou encaisses.
- Jauge pleine → option **Transformation** dans le menu de combat.
- **Tigre-garou** (4 tours) : ATQ ×1,7, DÉF ×1,2, vitesse ×1,5, esquive ×1,6, soin 20 % ;
  attaques **Lacération** (3 coups + saignement), **Bond du tigre** (200 %, critique +30 %), **Rugissement** (affaiblit tous les ennemis).
- **Loup-garou** (Artefact du Loup, pour plus tard) : Griffes, Crocs, Hurlement.

## Structure

```
jeu/
├── index.html            page du jeu
├── css/style.css         interface (tôle rivetée, accents ambre)
├── assets/               tes images (voir plus bas)
└── js/
    ├── core/             moteur : config, entrées, images, visuels provisoires, sauvegarde
    ├── data/             ← tout le contenu du jeu se modifie ici
    │   ├── story.js      histoire, dialogues, chapitres, événements
    │   ├── weapons.js    armes (dégâts, chargeur, prix, avantages / inconvénients)
    │   ├── gear.js       équipement (tête, corps, pieds)
    │   ├── shops.js      boutiques des tentes
    │   ├── loot.js       butin des coffres
    │   ├── skills.js     techniques (joueur, ennemis, forme bestiale)
    │   ├── artifacts.js  artefacts de transformation
    │   ├── clans.js      clans et territoires
    │   ├── enemies.js    ennemis et boss
    │   ├── maps.js       cartes en texte (1 caractère = 1 case), placement aléatoire
    │   ├── quests.js     missions
    │   └── items.js      objets et munitions
    ├── systems/          règles : héros, armes, combat, missions, événements
    ├── ui/               dialogues, menus, carnet, boutiques
    └── scenes/           exploration (overworld.js) et combat (battle.js)
```

## Ajouter tes images

Tant qu'une image manque, le jeu dessine un visuel provisoire : tout reste jouable.

1. Dépose le fichier dans `jeu/assets/` (ou envoie-le dans la conversation).
2. Renseigne son chemin dans `js/core/assets.js` :

```js
heros: { src: 'assets/sprites/heros.png', size: 1.3 },
```

| Clé | Quoi | Format conseillé |
|---|---|---|
| `heros`, `pnj_mira`, `forme_tigre`, `forme_loup` | personnages | PNG transparent, regard vers la droite |
| `pnj_chef`, `pnj_hugo`, `pnj_gaspard`, `pnj_lina`, `pnj_bastien`, `pnj_rosa` | habitants du village | PNG transparent |
| `chien`, `corbeau`, `pillard`, `pillard_tireur`, `tireur_elite`, `kross` | ennemis | PNG transparent |
| `tente_repos`, `tente_armes`, `tente_equip`, `tente_soin`, `tente_cuisine`, `tente_chef`, `tente`, `tente_2`, `tente_3` | tentes (≈ 2 cases de large) | PNG transparent |
| `coffre`, `coffre_ouvert`, `feu_camp`, `torche`, `puits` | village et forêt | PNG transparent |
| `caisse`, `caisse_ouverte`, `caisse_medocs`, `baril`, `epave`, `barricade`, `abri`, `pilier`, `escalier`, `drapeau`, `portail` | décor | PNG transparent |
| `tuile_herbe`, `tuile_chemin`, `tuile_arbre`, `tuile_eau`, `tuile_palissade` | forêt et village | 48 × 48 px |
| `tuile_sol`, `tuile_sol2`, `tuile_carrelage`, `tuile_mur`, `tuile_vide` | bitume, gravats, métro, ruines, cratère | 48 × 48 px |
| `portrait_heros`, `portrait_mira`, `portrait_chef`, `portrait_kross`, `portrait_hugo`, `portrait_gaspard`, `portrait_lina`, `portrait_bastien`, `portrait_rosa` | portraits de dialogue | carré, 256 × 256 |
| `fond_titre` | fond de l'écran titre | 1920 × 1080 |

**Animations** : planche de sprites (cases de même taille). Exemple dans l'en-tête de `assets.js` :
`walk_down`, `walk_up`, `walk_right` (gauche = miroir automatique), `attack`, `hurt`…

## Ajouter une arme

Dans `js/data/weapons.js` :

```js
fusil_pompe: {
  name: 'Fusil à pompe', kind: 'gun', sprite: 'rifle',
  ammo: 'mun_pompe', mag: 2, perShot: 1, power: 1.4, hits: 1, spread: true, acc: 0.85,
  pros: ['Touche tous les ennemis', 'Gros dégâts'],
  cons: ['Chargeur de 2', 'Courte portée'],
},
```

Ajouter la munition `mun_pompe` dans `items.js` (`ammo: true`), puis donner l'arme dans l'histoire : `{ weapon: 'fusil_pompe', ammo: 6 }` dans `story.js`.

## Ajouter un artefact

Dans `js/data/artifacts.js`, sur le modèle du loup : `form.mult` (multiplicateurs), `form.turns`,
`form.skills` (techniques marquées `beast: true` dans `skills.js`), `form.sprite`.
Le donner : `{ artifact: 'ours' }` dans `story.js`.

## Écrire la suite de l'histoire

Dans `js/data/story.js`, chaque événement est une liste d'étapes :

```js
mon_evenement: [
  { narrate: 'La lumière violette pulse au sommet de la colline…' },
  { say: 'Mira', portrait: 'mira', text: 'Tu es encore vivant, {nom} ?' },
  { battle: ['pillard', 'pillard_tireur'], noFlee: true, intro: 'Embuscade' },
  { artifact: 'loup' },
  { territory: { id: 'fourviere', owner: 'corbeau' } },
  { flag: 'portail_vu' },
],
```

La liste complète des étapes est en tête de `story.js`.

## Tester rapidement

Dans la console du navigateur (F12) :

```js
G.debug.xp(200)                 // gagner de l'expérience
G.debug.weapon('fusil', 12)     // obtenir une arme + munitions
G.debug.give('grenade', 2)      // obtenir un objet
G.debug.artifact('loup')        // obtenir l'artefact du loup
G.debug.gold(300)               // ferraille
G.debug.give('pieces', 5)       // pièces détachées (améliorations)
G.debug.gear('gilet_kevlar')    // équipement
G.debug.shop('armurerie')       // ouvrir une boutique
G.debug.go('foret', 50, 40)     // changer de carte (forêt, ruines_vaise, vaise_sud)
```
