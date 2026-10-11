# Terres de Cendre

RPG de survie au tour par tour, vue de dessus. France, 2061 : douze ans après la Dernière Guerre,
les survivants s'organisent en clans et se battent pour reprendre les ruines.
HTML + JavaScript pur : aucune installation, aucun build.

## Jouer

- **Ouvrir `jeu/index.html`** dans un navigateur (double-clic), ou via GitHub Pages.
- Déplacement : **flèches** ou **ZQSD** (WASD en QWERTY)
- Interagir / valider : **Espace** ou **Entrée**
- Retour : **Échap**
- Carnet (statut, armes, sac, missions, territoires) : **Tab** ou **M**
- Sur téléphone : manette tactile sous l'écran.

## Univers

- **Lyon en ruines.** Le héros est récupérateur du **Clan du Corbeau**.
- **Clans rivaux** : Vipères (pillards, à l'ouest du fleuve), Ours (Croix-Rousse), et un clan inconnu à Fourvière.
- **Territoires** : chaque quartier repris passe sous la bannière du clan (onglet *Territoires* du carnet).
- **Plus tard** : des portails s'ouvrent vers un autre monde peuplé de monstres, et des **artefacts**
  permettent de se transformer en bête humanoïde, en plein combat.

## Contenu actuel

| Partie | Contenu |
|---|---|
| Prologue | Ruines de Vaise : Mira, chiens errants, station de métro, embuscade de **Kross**, duel contre **Rico** |
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

### Transformation (prête, pas encore débloquée dans l'histoire)

- Un artefact équipé remplit la jauge **BÊTE** quand tu frappes ou encaisses.
- Jauge pleine → option **Transformation** dans le menu de combat.
- **Artefact du Loup** → *Loup-garou* pendant 4 tours : ATQ ×1,6, DÉF ×1,3, vitesse ×1,4, soin 25 %, attaques bestiales (Griffes, Crocs, Hurlement).

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
    │   ├── weapons.js    armes (dégâts, chargeur, avantages / inconvénients)
    │   ├── skills.js     techniques (joueur, ennemis, forme bestiale)
    │   ├── artifacts.js  artefacts de transformation
    │   ├── clans.js      clans et territoires
    │   ├── enemies.js    ennemis et boss
    │   ├── maps.js       cartes en texte (1 caractère = 1 case)
    │   ├── quests.js     missions
    │   └── items.js      objets et munitions
    ├── systems/          règles : héros, armes, combat, missions, événements
    ├── ui/               dialogues, menus, carnet
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
| `heros`, `pnj_mira`, `forme_loup` | personnages | PNG transparent, regard vers la droite |
| `chien`, `pillard`, `pillard_tireur`, `tireur_elite`, `kross` | ennemis | PNG transparent |
| `caisse`, `caisse_ouverte`, `caisse_medocs`, `baril`, `epave`, `barricade`, `abri`, `pilier`, `escalier`, `drapeau`, `portail` | décor | PNG transparent |
| `tuile_sol`, `tuile_sol2`, `tuile_carrelage`, `tuile_mur`, `tuile_vide` | bitume, gravats, métro, ruines, cratère | 48 × 48 px |
| `portrait_heros`, `portrait_mira`, `portrait_chef`, `portrait_kross` | portraits de dialogue | carré, 256 × 256 |
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
G.debug.go('vaise_sud')         // changer de carte
```
