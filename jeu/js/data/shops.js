/* Boutiques des tentes du village.
   sections : ce que propose le marchand
     { type: 'weapons', list: [{ id, req }] }        acheter une arme (prix dans weapons.js)
     { type: 'goods',   list: [{ id, qty, price, req }] }  objets / munitions
     { type: 'upgrade_weapons' }                     améliorer une arme possédée
     { type: 'gear',    list: [{ id, req }] }        acheter de l'équipement (prix dans gear.js)
     { type: 'upgrade_gear' } · { type: 'equip' }    améliorer / porter son équipement
   req : drapeau d'histoire nécessaire (sinon l'article est verrouillé, avec reqText). */
G.data.shops = {
  armurerie: {
    name: 'Armurerie', keeper: 'Bastien, armurier',
    greet: 'Bastien relève ses lunettes de soudeur. « Une arme, ça s’entretient, {nom}. Qu’est-ce qu’il te faut ? »',
    sections: [
      { type: 'weapons', label: 'Acheter une arme', list: [
        { id: 'pistolet' },
        { id: 'fusil', req: 'medocs', reqText: 'Bastien attend une livraison. Reviens après ta mission à la station.' },
        { id: 'mitrailleuse', req: 'boss_d', reqText: 'Trop rare. Il faudrait la prendre à un lieutenant des Vipères…' },
      ] },
      { type: 'goods', label: 'Munitions et explosifs', list: [
        { id: 'mun_9mm', qty: 10, price: 18 },
        { id: 'mun_fusil', qty: 4, price: 32 },
        { id: 'mun_bande', qty: 30, price: 48 },
        { id: 'grenade', qty: 1, price: 35 },
        { id: 'fumigene', qty: 1, price: 22 },
      ] },
      { type: 'upgrade_weapons', label: 'Améliorer une arme' },
    ],
  },
  equipement: {
    name: 'Équipement', keeper: 'Rosa, couturière',
    greet: 'Rosa mord dans son fil pour le couper. « Un bon cuir vaut mieux qu’un bon fusil, crois-moi. »',
    sections: [
      { type: 'gear', label: 'Acheter de l’équipement', list: [
        { id: 'bandana' }, { id: 'veste_cuir' }, { id: 'baskets' }, { id: 'casque_moto' }, { id: 'rangers' },
        { id: 'gilet_kevlar', req: 'medocs', reqText: 'Rosa n’a pas encore fini de le recoudre.' },
        { id: 'casque_militaire', req: 'medocs', reqText: 'Rosa en cherche un en bon état.' },
        { id: 'armure_plaques', req: 'boss_d', reqText: 'Il faut des tôles… et du temps. Plus tard.' },
      ] },
      { type: 'upgrade_gear', label: 'Améliorer l’équipement' },
      { type: 'equip', label: 'S’équiper' },
    ],
  },
  infirmerie: {
    name: 'Infirmerie', keeper: 'Sœur Agnès',
    greet: 'Sœur Agnès range des bandages bouillis. « On manque de tout, mais je peux te dépanner. »',
    sections: [
      { type: 'goods', label: 'Soins', list: [
        { id: 'trousse', qty: 1, price: 25 },
        { id: 'stimulant', qty: 1, price: 20 },
        { id: 'kit_chirurgical', qty: 1, price: 90, req: 'medocs', reqText: 'Pas avant le retour des médicaments.' },
      ] },
    ],
  },
};
