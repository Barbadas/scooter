# Monarque des Ombres

RPG au tour par tour en vue de dessus, inspiré de *Solo Leveling*.
HTML + JavaScript pur : aucune installation, aucun build.

## Jouer

- **Ouvrir `jeu/index.html`** dans un navigateur (double-clic), ou via GitHub Pages.
- Déplacement : **flèches** ou **ZQSD** (WASD en QWERTY)
- Interagir / valider : **Espace** ou **Entrée**
- Retour : **Échap**
- Fenêtre du Système : **Tab** ou **M** (après l'éveil)
- Sur téléphone : manette tactile sous l'écran.

## Contenu actuel

| Partie | Contenu |
|---|---|
| Prologue | Grotte de rang E, Mira, rats géants, temple caché, Gardien, **éveil du Système** |
| Chapitre 1 | Repaire gobelin (rang D), loups, gobelins, archers, coffres, boss **Kargash** |
| Système | Niveaux, 5 stats à répartir (FOR, VIT, AGI, INT, PER), compétences, inventaire, quêtes |
| Combat | Tour par tour sur la carte, ordre selon la vitesse, critiques, esquive, défense, fuite, saignement, buffs/debuffs |
| Prêt pour la suite | Extraction d'ombre + armée des ombres (mécanique codée, pas encore débloquée dans l'histoire) |

### Pouvoirs

| Pouvoir | Déblocage |
|---|---|
| Frappe rapide (2 coups) | Éveil (prologue) |
| Coup vital (190 %, critique +25 %) | Niveau 3 |
| Soif de sang (ATQ/DÉF ennemis ↓) | Victoire sur Kargash (chapitre 1) |
| Extraction d'ombre | Chapitre 2 — à écrire |

## Structure

```
jeu/
├── index.html            page du jeu
├── css/style.css         interface « fenêtres du Système »
├── assets/               tes images (voir plus bas)
└── js/
    ├── core/             moteur : config, entrées, images, sauvegarde
    ├── data/             ← tout le contenu du jeu se modifie ici
    │   ├── story.js      histoire, dialogues, chapitres, événements
    │   ├── skills.js     pouvoirs (joueur et monstres)
    │   ├── enemies.js    monstres et boss
    │   ├── maps.js       cartes en texte (1 caractère = 1 case)
    │   ├── quests.js     quêtes du Système
    │   └── items.js      objets
    ├── systems/          règles : chasseur, combat, quêtes, événements
    ├── ui/               dialogues, menus, fenêtre du Système
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
| `heros`, `pnj_mira` | personnages | PNG transparent, regard vers la droite |
| `rat_geant`, `loup`, `gobelin`, `gobelin_archer`, `chef_gobelin`, `gardien`, `gardien_fissure` | monstres | PNG transparent |
| `statue`, `autel`, `portail`, `coffre`, `coffre_ouvert`, `brasero`, `tente` | décor | PNG transparent |
| `tuile_sol`, `tuile_sol2`, `tuile_temple`, `tuile_mur`, `tuile_vide` | sols et murs | 48 × 48 px |
| `portrait_heros`, `portrait_mira`, `portrait_kargash` | portraits de dialogue | carré, 256 × 256 |
| `fond_titre` | fond de l'écran titre | 1920 × 1080 |

**Animations** : planche de sprites (cases de même taille). Exemple dans l'en-tête de `assets.js` :
`walk_down`, `walk_up`, `walk_right` (gauche = miroir automatique), `attack`, `hurt`…

## Ajouter un pouvoir

Dans `js/data/skills.js` :

```js
dague_ombre: {
  name: "Dague de l'ombre",
  desc: 'Projette une dague spectrale : 150 % de dégâts magiques.',
  cost: 8, target: 'enemy', anim: 'ranged', color: '#8b5cf6',
  effects: [{ type: 'damage', power: 1.5, magic: true }],
},
```

Puis le débloquer, soit par niveau (`unlockLevel: 6`), soit dans l'histoire (`{ learn: 'dague_ombre' }` dans `story.js`).

## Écrire la suite de l'histoire

Dans `js/data/story.js`, chaque événement est une liste d'étapes :

```js
mon_evenement: [
  { narrate: 'La porte s’ouvre lentement…' },
  { say: 'Mira', portrait: 'mira', text: 'Tu es encore vivant, {nom} ?' },
  { system: 'Quête de changement de classe disponible.', title: 'Quête' },
  { battle: ['chevalier_mort'], noFlee: true, intro: 'Le chevalier maudit' },
  { learn: 'extraction' },
  { flag: 'classe_debloquee' },
],
```

La liste complète des étapes est en tête de `story.js`.

## Tester rapidement

Dans la console du navigateur (F12) :

```js
G.debug.xp(200)               // gagner de l'expérience
G.debug.learn('extraction')   // débloquer un pouvoir
G.debug.shadow('gobelin')     // ajouter une ombre à l'armée
G.debug.go('portail_d')       // changer de carte
```
