/* Objets.
   heal  : { hp, mp } — 9999 = soin complet (mp = énergie)
   blast : dégâts d'explosion sur tous les ennemis (combat)
   smoke : fumigène, garantit la fuite (sauf boss)
   ammo  : munitions (1 unité = 1 balle), utilisées en rechargeant
   key   : objet de quête · material : matériau d'amélioration */
G.data.items = {
  trousse: { name: 'Trousse de soin', desc: 'Restaure 60 PV.', heal: { hp: 60 } },
  stimulant: { name: 'Stimulant', desc: 'Restaure 30 ÉN.', heal: { mp: 30 } },
  kit_chirurgical: { name: 'Kit chirurgical', desc: 'Restaure tous les PV et l’ÉN.', heal: { hp: 9999, mp: 9999 } },
  grenade: { name: 'Grenade', desc: 'Explose au milieu des ennemis : environ 40 dégâts à chacun.', blast: 40 },
  fumigene: { name: 'Fumigène', desc: 'Écran de fumée : fuite assurée (impossible contre un boss).', smoke: true },
  mun_9mm: { name: 'Munitions 9 mm', desc: 'Pour le pistolet.', ammo: true },
  mun_fusil: { name: 'Cartouches 7,62', desc: 'Pour le fusil à lunette. Rares.', ammo: true },
  mun_bande: { name: 'Bande de mitrailleuse', desc: 'Balles pour la mitrailleuse.', ammo: true },
  pieces: { name: 'Pièces détachées', desc: 'Ressorts, vis, tubes, rivets… Servent à améliorer armes et équipement.', material: true },
  medicaments: { name: 'Caisse de médicaments', desc: 'Antibiotiques, morphine, pansements. Le camp en a désespérément besoin.', key: true },
};
