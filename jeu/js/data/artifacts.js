/* Artefacts de transformation (découverts plus tard, de l'autre côté des portails).
   En combat, la jauge de BÊTE se remplit quand tu frappes et quand tu es blessé.
   Pleine, elle permet de se transformer en plein combat (« Transformation »).
   form.mult  : multiplicateurs de statistiques pendant la transformation
   form.heal  : soin immédiat (% des PV max) · form.turns : durée en tours
   form.skills: techniques disponibles sous forme bestiale (skills.js, beast: true) */
G.data.artifacts = {
  loup: {
    name: 'Artefact du Loup',
    desc: 'Un éclat d’os gravé de runes inconnues, chaud comme un cœur qui bat.',
    form: {
      name: 'Loup-garou', sprite: 'forme_loup',
      mult: { atk: 1.6, def: 1.3, spd: 1.4, eva: 1.5 },
      heal: 0.25, turns: 4,
      skills: ['griffes', 'crocs', 'hurlement_bestial'],
    },
  },
};
