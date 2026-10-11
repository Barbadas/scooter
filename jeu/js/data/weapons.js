/* Armes. Chacune a ses avantages et ses inconvénients.
   kind    : 'melee' (le porteur fonce au contact) · 'gun' (tir à distance)
   sprite  : dessin de l'arme en main ('knife' · 'pistol' · 'rifle' · 'mg')
   power   : multiplicateur de dégâts · hits : nombre de balles par tir
   acc     : précision de base (0-1) · crit : bonus de critique
   ammo    : objet munition consommé · mag : taille du chargeur · perShot : balles par attaque
   armor   : multiplie l'armure adverse (couteau : ×2)
   pierce  : part de l'armure ignorée (fusil : 0,5)
   spread  : les balles se répartissent au hasard sur les ennemis
   exposed : le tireur perd son esquive jusqu'à la fin de son prochain tour
   heavy   : vitesse −40 % jusqu'à la fin du prochain tour
   price   : prix à l'armurerie (ferraille) · upgrade : coût de base d'une amélioration
   magStep : balles ajoutées au chargeur tous les 2 niveaux d'amélioration
   Amélioration (niveau +1 à +5) : dégâts +12 %, précision +2 %, critique +1 % par niveau. */
G.data.weapons = {
  couteau: {
    name: 'Couteau de combat', kind: 'melee', sprite: 'knife',
    power: 0.9, acc: 0.97, crit: 0.15, armor: 2, price: 0, upgrade: 20,
    bleed: { chance: 0.3, dmg: 4, turns: 3 },
    pros: ['Aucune munition', 'Critique +15 %', '30 % de chance de saignement'],
    cons: ['Corps à corps', 'Faible contre les armures (×2)'],
  },
  pistolet: {
    name: 'Pistolet 9 mm', kind: 'gun', sprite: 'pistol',
    ammo: 'mun_9mm', mag: 8, perShot: 1, magStep: 2, price: 90, upgrade: 30,
    power: 1.0, acc: 0.95, crit: 0.06,
    pros: ['À distance', 'Précis', 'Munitions courantes'],
    cons: ['Dégâts moyens', 'Chargeur de 8 balles'],
  },
  fusil: {
    name: 'Fusil à lunette', kind: 'gun', sprite: 'rifle',
    ammo: 'mun_fusil', mag: 4, perShot: 1, magStep: 1, price: 280, upgrade: 50,
    power: 1.9, acc: 1.0, crit: 0.12, pierce: 0.5, exposed: true,
    pros: ['Dégâts très élevés', 'Ignore 50 % de l’armure', 'Très précis'],
    cons: ['Chargeur de 4', 'Munitions rares', 'À découvert : aucune esquive jusqu’à ton prochain tour'],
  },
  mitrailleuse: {
    name: 'Mitrailleuse légère', kind: 'gun', sprite: 'mg',
    ammo: 'mun_bande', mag: 30, perShot: 6, magStep: 6, price: 560, upgrade: 70,
    power: 0.42, hits: 6, spread: true, acc: 0.7, crit: 0.03, heavy: true,
    pros: ['Rafale de 6 balles', 'Arrose tous les ennemis'],
    cons: ['Imprécise (70 %)', 'Vide le chargeur en 5 rafales', 'Lourde : vitesse −40 % au tour suivant'],
  },
};
for (const id in G.data.weapons) G.data.weapons[id].id = id;
