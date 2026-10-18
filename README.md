# scooter

- `index.html` — suivi de la flotte de scooters (Île de Ré).
- `mba/index.html` — **Cockpit MBA** : application de concentration et d'organisation des révisions du MBA Manager de Business Unit.

## Cockpit MBA

Fichier HTML unique, sans installation : ouvrir `mba/index.html` dans un navigateur (ou via GitHub Pages, `/mba/`).

- **Focus** : minuteur Pomodoro (25/5, 50/10, 90/15 ou durées libres), objectif de session, bruit d'ambiance (brun, rose, souffle), mode immersif plein écran, « parking à pensées » pour noter une distraction sans décrocher.
- **Planning** : tâches par module avec échéance, priorité et estimation en sessions ; compte à rebours des rendus et examens.
- **Modules** : 8 modules préremplis (stratégie, finance, marketing, management, commercial, pilotage, projet, RH/droit/RSE), chapitres à cocher (à voir / en cours / maîtrisé), date d'examen et budget d'heures par semaine.
- **Flashcards** : répétition espacée (boîtes de Leitner : 1, 2, 4, 8, 16 jours), 27 cartes de départ sur les grands concepts du programme.
- **Pilotage** : minutes de focus sur 14 jours, série de jours, taux de maîtrise, budget vs réalisé par module.
- **Réglages** : durées, objectif quotidien, sons, export / import des données (JSON).

Les données sont enregistrées dans le navigateur (localStorage). Exporter une sauvegarde régulièrement depuis Réglages.
