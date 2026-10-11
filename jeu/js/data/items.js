/* Objets. heal: { hp, mp } — 9999 = soin complet. */
G.data.items = {
  potion: {
    name: 'Potion de soin',
    desc: 'Restaure 60 PV.',
    heal: { hp: 60 },
  },
  potion_mana: {
    name: 'Potion de mana',
    desc: 'Restaure 30 PM.',
    heal: { mp: 30 },
  },
  elixir: {
    name: 'Élixir de vie',
    desc: 'Restaure tous les PV et PM.',
    heal: { hp: 9999, mp: 9999 },
  },
};
