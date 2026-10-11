/* Boutiques des tentes : acheter, améliorer, s'équiper (données dans data/shops.js). */
(function () {
  const $ = id => document.getElementById(id);
  const esc = G.U.esc;
  const SH = {};

  const gold = () => G.state.gold;
  const pieces = () => G.inventory.count('pieces');
  const locked = e => e.req && !G.state.flags[e.req];
  const costText = c => `${c.gold} ferraille + ${c.pieces} pièce${c.pieces > 1 ? 's' : ''}`;
  const canPay = c => gold() >= c.gold && pieces() >= c.pieces;

  function money() {
    $('shop-money').innerHTML = `<span><b>${gold()}</b> ferraille</span><span><b>${pieces()}</b> pièces détachées</span>`;
  }
  function info(html) { $('shop-info').innerHTML = html || ''; }

  // ───────────── Fiches d'information (panneau de droite) ─────────────
  const pct = v => Math.round(v * 100) + ' %';
  function weaponSheet(w, lv) {
    return `<div class="sh-line">Dégâts <b>×${w.power}</b>${w.hits ? ` × ${w.hits} balles` : ''}</div>
      <div class="sh-line">Précision <b>${pct(w.acc)}</b> · Critique <b>+${pct(w.crit || 0)}</b></div>
      ${w.mag ? `<div class="sh-line">Chargeur <b>${w.mag}</b> · Munitions : ${esc(G.data.items[w.ammo].name)}</div>` : '<div class="sh-line">Aucune munition</div>'}
      ${lv != null ? `<div class="sh-line">Niveau <b>+${lv}</b> / +${G.weapons.MAX_LV}</div>` : ''}`;
  }
  function prosCons(w) {
    return `<ul class="wp-pros">${w.pros.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      <ul class="wp-cons">${w.cons.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`;
  }
  function gearCompare(id, lv) {
    const g = G.data.gear[id], cur = G.gear.equipped(g.slot);
    const now = cur && cur !== id ? `<div class="sh-line sh-dim">Porté : ${esc(G.data.gear[cur].name)}${G.gear.level(cur) ? ` +${G.gear.level(cur)}` : ''} — ${esc(G.gear.statText(cur))}</div>` : '';
    return `<div class="sh-line">${esc(G.GEAR_SLOTS[g.slot])} · <b>${esc(G.gear.statText(id, lv))}</b></div>${now}<p>${esc(g.desc)}</p>`;
  }

  // ───────────── Sections ─────────────
  const SECTIONS = {
    weapons(sec) {
      return sec.list.map(e => {
        const w = G.data.weapons[e.id], owned = !!G.state.weapons[e.id], lock = locked(e);
        return {
          label: w.name, value: e.id,
          sub: owned ? 'Possédée' : lock ? 'Indisponible' : `${w.price} ferraille`,
          disabled: owned || lock || gold() < w.price,
          info: `<h4>${esc(w.name)}</h4>${lock ? `<p class="sh-warn">${esc(e.reqText || 'Pas encore disponible.')}</p>` : ''}${weaponSheet(w)}<div class="wp-cols">${prosCons(w)}</div>
            ${!owned && !lock && gold() < w.price ? '<p class="sh-warn">Pas assez de ferraille.</p>' : ''}`,
          buy() { G.state.gold -= w.price; G.weapons.give(e.id, w.ammo ? Math.min(w.mag, 12) : 0); },
        };
      });
    },
    goods(sec) {
      return sec.list.map(e => {
        const it = G.data.items[e.id], lock = locked(e);
        return {
          label: `${it.name}${e.qty > 1 ? ` × ${e.qty}` : ''}`, value: e.id,
          sub: lock ? 'Indisponible' : `${e.price} ferraille`,
          disabled: lock || gold() < e.price,
          info: `<h4>${esc(it.name)}</h4><p>${esc(it.desc)}</p>${lock ? `<p class="sh-warn">${esc(e.reqText || '')}</p>` : ''}
            <div class="sh-line sh-dim">Dans ton sac : ${G.inventory.count(e.id)}</div>`,
          buy() { G.state.gold -= e.price; G.inventory.add(e.id, e.qty); G.ui.notify(`${it.name} × ${e.qty}`, 'hint', 'Acheté'); },
        };
      });
    },
    upgrade_weapons() {
      return G.weapons.owned().map(id => {
        const w = G.weapons.def(id), lv = G.weapons.level(id), c = G.weapons.upgradeCost(id);
        let next = '';
        if (c) {
          G.state.weapons[id].lv = lv + 1;
          const n = G.weapons.def(id);
          G.state.weapons[id].lv = lv;
          next = `<div class="sh-arrow">Niveau +${lv + 1}</div>${weaponSheet(n)}<div class="sh-line">Coût : <b>${costText(c)}</b></div>
            ${!canPay(c) ? '<p class="sh-warn">Il te manque de la ferraille ou des pièces détachées (coffres, ennemis).</p>' : ''}`;
        }
        return {
          label: G.weapons.label(id), value: id,
          sub: c ? `${c.gold} · ${c.pieces} pc` : 'MAX',
          disabled: !c || !canPay(c),
          info: `<h4>${esc(G.weapons.label(id))}</h4>${weaponSheet(w, lv)}${c ? next : '<p>Amélioration maximale atteinte.</p>'}`,
          buy() { if (G.weapons.upgrade(id)) G.ui.notify(`${G.weapons.label(id)} — dégâts et précision en hausse.`, 'level', 'Arme améliorée'); },
        };
      });
    },
    gear(sec) {
      return sec.list.map(e => {
        const g = G.data.gear[e.id], owned = G.gear.has(e.id), lock = locked(e);
        return {
          label: g.name, value: e.id,
          sub: owned ? 'Possédé' : lock ? 'Indisponible' : `${g.price} ferraille`,
          disabled: owned || lock || gold() < g.price,
          info: `<h4>${esc(g.name)}</h4>${lock ? `<p class="sh-warn">${esc(e.reqText || '')}</p>` : ''}${gearCompare(e.id, 0)}
            ${!owned && !lock && gold() < g.price ? '<p class="sh-warn">Pas assez de ferraille.</p>' : ''}`,
          buy() { G.state.gold -= g.price; G.gear.give(e.id); },
        };
      });
    },
    upgrade_gear() {
      return G.gear.owned().map(id => {
        const g = G.data.gear[id], lv = G.gear.level(id), c = G.gear.upgradeCost(id);
        return {
          label: g.name + (lv ? ` +${lv}` : ''), value: id,
          sub: c ? `${c.gold} · ${c.pieces} pc` : 'MAX',
          disabled: !c || !canPay(c),
          info: `<h4>${esc(g.name)}${lv ? ` +${lv}` : ''}</h4>${gearCompare(id, lv)}
            ${c ? `<div class="sh-arrow">Niveau +${lv + 1}</div><div class="sh-line"><b>${esc(G.gear.statText(id, lv + 1))}</b></div><div class="sh-line">Coût : <b>${costText(c)}</b></div>
            ${!canPay(c) ? '<p class="sh-warn">Il te manque de la ferraille ou des pièces détachées.</p>' : ''}` : '<p>Amélioration maximale atteinte.</p>'}`,
          buy() { if (G.gear.upgrade(id)) G.ui.notify(`${g.name} +${G.gear.level(id)}`, 'level', 'Équipement amélioré'); },
        };
      });
    },
    equip() {
      return G.gear.owned().map(id => {
        const g = G.data.gear[id], on = G.gear.equipped(g.slot) === id, lv = G.gear.level(id);
        return {
          label: g.name + (lv ? ` +${lv}` : ''), value: id,
          sub: on ? 'Porté' : G.GEAR_SLOTS[g.slot],
          info: `<h4>${esc(g.name)}</h4>${gearCompare(id, lv)}<p class="sh-dim">${on ? 'Valider pour le retirer.' : 'Valider pour le porter.'}</p>`,
          buy() { if (on) G.gear.unequip(g.slot); else G.gear.equip(id); },
        };
      });
    },
  };

  async function runSection(sec) {
    let start = 0;
    for (;;) {
      money();
      const items = SECTIONS[sec.type](sec);
      if (!items.length) {
        info(`<p>${sec.type === 'equip' || sec.type === 'upgrade_gear' ? 'Tu ne possèdes encore aucun équipement.' : 'Rien à proposer.'}</p>`);
      }
      const v = await G.ui.menu($('shop-menu'), items, {
        title: sec.label, back: true, start: Math.min(start, Math.max(0, items.length - 1)),
        onFocus: it => { if (it && it.info) info(it.info); else if (it && it.back) info(''); },
      });
      if (v == null) return;
      start = items.findIndex(it => it.value === v);
      const it = items[start];
      if (it && it.buy) it.buy();
    }
  }

  SH.open = async function (id) {
    const S = G.data.shops[id];
    if (!S) return;
    const box = $('shop');
    $('shop-title').textContent = S.name;
    $('shop-keeper').textContent = S.keeper || '';
    $('shop-greet').textContent = G.fmt(S.greet || '');
    box.hidden = false;
    let start = 0;
    try {
      for (;;) {
        money();
        info('');
        const items = S.sections.map((s, i) => ({ label: s.label, value: i }));
        items.push({ label: 'Partir', value: 'quit' });
        const v = await G.ui.menu($('shop-menu'), items, { start, onFocus: () => info('') });
        if (v == null || v === 'quit') break;
        start = v;
        await runSection(S.sections[v]);
      }
    } finally {
      box.hidden = true;
      G.save.write();
    }
  };

  G.shop = SH;
})();
