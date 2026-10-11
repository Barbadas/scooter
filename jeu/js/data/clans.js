/* Clans et territoires de Lyon.
   Le propriétaire d'un territoire change avec l'histoire : étape { territory: { id, owner } }. */
G.data.clans = {
  corbeau: { name: 'Clan du Corbeau', color: '#d9a441', desc: 'Ton clan. Des récupérateurs retranchés au cœur de la forêt des Monts d’Or.' },
  viperes: { name: 'Les Vipères', color: '#6fb35f', desc: 'Pillards venus du sud. Ils taguent leurs serpents sur chaque mur conquis.' },
  ours: { name: 'Clan de l’Ours', color: '#b0754a', desc: 'Montagnards de la Croix-Rousse. Neutres… pour l’instant.' },
  inconnu: { name: 'Inconnu', color: '#8a8478', desc: 'Personne ne sait.' },
};

G.data.territories = {
  monts_or: { name: 'Forêt des Monts d’Or', owner: 'corbeau', desc: 'Le village du Corbeau et ses dix tentes, au milieu des bois.' },
  vaise_nord: { name: 'Ruines de Vaise', owner: 'inconnu', desc: 'Terre de personne. Chiens errants, pillards, et la station Gorge-de-Loup.' },
  vaise_sud: { name: 'Vaise-Sud', owner: 'viperes', desc: 'Le château d’eau et ses citernes. Qui tient l’eau tient le quartier.' },
  croix_rousse: { name: 'Croix-Rousse', owner: 'ours', desc: 'Les pentes fortifiées du Clan de l’Ours.' },
  confluence: { name: 'Confluence', owner: 'viperes', desc: 'Le repaire principal des Vipères, entre les deux fleuves.' },
  fourviere: { name: 'Fourvière', owner: 'inconnu', desc: 'La colline est silencieuse depuis la guerre. Personne n’en revient.' },
};
