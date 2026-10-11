# Images du jeu

| Dossier | Contenu |
|---|---|
| `sprites/` | personnages, monstres, objets du décor (PNG transparent) |
| `tuiles/` | sols et murs, 48 × 48 px |
| `portraits/` | portraits de dialogue, carrés (256 × 256) |
| `fonds/` | fond de l'écran titre |
| `fx/` | effets visuels (prévu) |

Chaque image se branche dans `js/core/assets.js` (clé → chemin). Tant qu'une image manque, un visuel provisoire est dessiné.
La liste des clés et formats conseillés est dans `jeu/README.md`.
