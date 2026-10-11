/* Combat au tour par tour, joué directement sur la carte vue de dessus :
   le décor s'assombrit, les combattants se placent face à face.
   L'ordre d'action dépend de la vitesse (AGI) à chaque round.
   Armes : couteau (contact), pistolet, fusil, mitrailleuse — munitions et rechargement.
   Artefacts : la jauge de BÊTE se remplit au fil des coups ; pleine, elle permet de se transformer. */
(function () {
  const U = G.U;
  const T = G.config.TILE;
  const W = G.config.WIDTH, H = G.config.HEIGHT;
  const $ = id => document.getElementById(id);
  const esc = U.esc;
  const STAT_SHORT = { atk: 'ATQ', tir: 'TIR', def: 'DÉF', spd: 'VIT', eva: 'ESQ' };
  const DIM = 0.74; // assombrissement du décor pendant le combat

  const B = {
    active: false, units: [], fx: [], texts: [], opts: {},
    hideEnt: null, dim: 0, turnUnit: null, cursor: null, targeting: null,
    skillName: null, banner: null,
  };

  // IA spéciales (boss). Retourner null = choix pondéré classique.
  const AI = {
    kross(u, b) {
      if (!u.rage && u.hp < u.maxHp * 0.5) {
        u.rage = true;
        b.float(u, 'FUREUR !', '#ff7a3c', 26);
        return { type: 'skill', skill: G.data.skills.cri_guerre, targets: [u] };
      }
      return null;
    },
  };
  B.AI = AI;

  const unitH = u => (G.assets.manifest[u.sprite]?.size || 1) * T * u.scale;
  const allies = () => B.units.filter(u => u.side === 'ally');
  const enemies = () => B.units.filter(u => u.side === 'enemy');
  const foesOf = u => B.units.filter(x => x.alive && x.side !== u.side);
  const friendsOf = u => B.units.filter(x => x.alive && x.side === u.side);

  // ───────────── Lancement ─────────────
  B.start = async function (opts) {
    const ow = G.scenes.overworld;
    Object.assign(this, { active: true, opts, units: [], fx: [], texts: [], cursor: null, targeting: null, turnUnit: null, skillName: null, banner: null });
    this.hideEnt = opts.fromEnt || ow.lastEncounter || null;

    const pPos = ow.screenPos(ow.player);
    const hero = this.makeHero(G.state.hunter);
    hero.x = pPos.x; hero.y = pPos.y;
    this.units.push(hero);
    const ePos = this.hideEnt ? ow.screenPos(this.hideEnt) : { x: pPos.x + 120, y: pPos.y };
    opts.enemies.forEach((id, i) => {
      const u = this.makeEnemy(id, i);
      u.x = ePos.x; u.y = ePos.y;
      u.alpha = i === 0 && this.hideEnt ? 1 : 0;
      this.units.push(u);
    });
    for (const u of this.units) Object.assign(u, { rot: 0, pose: null, poseT: 0, dashing: false, ox: 0, oy: 0, flash: 0 });
    this.showUI(true);
    this.layout(this.measureBottom());

    G.fx.flash('#ffe2b8', 0.5);
    this.fx.push({ kind: 'speed', life: 0.5, age: 0, lines: Array.from({ length: 34 }, () => [Math.random() * Math.PI * 2, U.rand(0.55, 0.95)]) });
    this.dim = 0;
    const moves = [U.tween(this, { dim: DIM }, 500)];
    for (const u of this.units) moves.push(U.tween(u, { x: u.homeX, y: u.homeY, alpha: 1 }, 600));
    await Promise.all(moves);
    const isBoss = enemies().some(u => u.data.boss);
    await this.showBanner(opts.intro || (isBoss ? enemies()[0].name : 'Combat'), isBoss ? 'Boss' : 'Accrochage');

    let result;
    try {
      result = await this.loop();
    } finally {
      this.showUI(false);
    }
    result = await this.finish(result);
    await U.tween(this, { dim: 0 }, 350);
    Object.assign(this, { active: false, units: [], fx: [], texts: [], hideEnt: null, cursor: null, turnUnit: null });
    return result;
  };

  B.makeHero = function (h) {
    const d = G.hunter.derived(h);
    return {
      id: 'hero', side: 'ally', isPlayer: true, name: h.name, sprite: 'heros',
      hp: h.hp, maxHp: d.maxHp, mp: h.mp, maxMp: d.maxMp,
      base: { atk: d.atk, tir: d.tir, def: d.def, spd: d.spd, crit: d.crit, eva: d.eva, acc: d.acc },
      skills: h.skills.filter(id => G.data.skills[id] && !G.data.skills[id].passive && !G.data.skills[id].beast),
      mods: [], dots: [], alive: true, scale: 1.5, alpha: 1, t: 0,
      weaponShown: G.weapons.shown(), beast: G.config.TRIAL && G.artifacts.equipped() ? G.config.TRIAL_BEAST_START : 0, form: null,
    };
  };

  B.makeEnemy = function (id, i) {
    const e = G.data.enemies[id];
    return {
      id: `${id}_${i}`, eid: id, side: 'enemy', name: e.name, sprite: e.sprite, data: e,
      hp: e.hp, maxHp: e.hp, mp: 0, maxMp: 0,
      base: { atk: e.atk, tir: e.tir != null ? e.tir : e.atk, def: e.def, spd: e.spd, crit: e.crit || 0.05, eva: e.eva || 0, acc: 1 },
      mods: [], dots: [], alive: true, scale: e.battleScale || 1.5, alpha: 1, t: Math.random() * 5,
      weaponShown: e.weapon ? G.data.weapons[e.weapon].sprite : null,
    };
  };

  // Limite basse du terrain : le haut du panneau de combat s'il recouvre l'écran (grand écran)
  B.measureBottom = function () {
    const st = $('stage').getBoundingClientRect(), ui = $('battle-ui').getBoundingClientRect();
    if (st.height && ui.top > st.top && ui.top < st.bottom) return (ui.top - st.top) / st.height * H - 12;
    return H - 20;
  };

  // Place les combattants en colonnes décalées, sans chevauchement des noms
  B.layout = function (limit = H - 20) {
    const place = (list, x, dirX) => {
      let gaps = list.slice(1).map(u => Math.max(92, unitH(u) * 0.62 + 30));
      const top = list.length ? unitH(list[0]) + 40 : 0, bottom = Math.max(top + 60, Math.min(H * 0.7, limit));
      let total = gaps.reduce((a, b) => a + b, 0);
      if (top + total > bottom) { const k = (bottom - top) / total; gaps = gaps.map(g => g * k); total = bottom - top; }
      let y = U.clamp(H * 0.43 - total / 2, top, bottom - total);
      list.forEach((u, i) => {
        if (i > 0) y += gaps[i - 1];
        u.homeY = y;
        u.homeX = x + (i % 2 ? 72 * dirX : 0);
      });
    };
    place(allies(), W * 0.3, -1);
    place(enemies(), W * 0.68, 1);
  };

  // ───────────── Boucle des tours ─────────────
  B.loop = async function () {
    for (;;) {
      const order = this.units
        .filter(u => u.alive)
        .map(u => ({ u, k: G.combat.stat(u, 'spd') + Math.random() * 3 }))
        .sort((a, b) => b.k - a.k)
        .map(o => o.u);
      for (const u of order) {
        if (!u.alive) continue;
        let end = this.checkEnd();
        if (end) return end;
        this.turnUnit = u;
        u.defending = false;
        this.renderParty();
        await this.tickDots(u);
        if (!u.alive) { end = this.checkEnd(); if (end) return end; continue; }

        if (!u.isPlayer) $('battle-menu').innerHTML = `<div class="menu-head">Tour de ${esc(u.name)}…</div>`;
        const act = u.isPlayer ? await this.playerTurn(u) : this.decide(u);
        let res = null;
        if (act.type === 'flee') {
          if (Math.random() < G.combat.fleeChance(allies(), enemies())) res = 'flee';
          else { this.float(u, 'Fuite ratée', '#e8a090'); await U.wait(600); }
        } else {
          res = await this.perform(u, act);
        }
        if (res === 'flee') {
          this.float(u, 'Repli !', '#efe6d2');
          await U.wait(500);
          return 'flee';
        }
        u.mods = u.mods.filter(m => --m.turns > 0);
        if (u.form) this.formTick(u);
        this.renderParty();
        end = this.checkEnd();
        if (end) return end;
      }
    }
  };

  B.checkEnd = function () {
    const hero = this.units.find(u => u.isPlayer);
    if (!hero.alive) return 'lose';
    if (!enemies().some(u => u.alive)) return 'win';
    return null;
  };

  B.tickDots = async function (u) {
    if (!u.dots.length) return;
    for (const d of u.dots) {
      u.hp = Math.max(0, u.hp - d.dmg);
      this.float(u, `-${d.dmg}`, '#e0412b', 20);
      d.turns--;
    }
    u.dots = u.dots.filter(d => d.turns > 0);
    u.flash = 0.6;
    if (u.hp <= 0) this.kill(u);
    this.renderParty();
    await U.wait(380);
  };

  // ───────────── Tour du joueur ─────────────
  const battleItem = it => it.heal || it.blast || it.smoke;

  B.playerTurn = async function (u) {
    const menu = $('battle-menu'), desc = $('battle-desc');
    for (;;) {
      const inv = G.inventory.list(battleItem);
      const flee = Math.round(G.combat.fleeChance(allies(), enemies()) * 100);
      const art = G.artifacts.equipped();
      const items = u.form
        ? [{ label: 'Attaques bestiales', value: 'beast', desc: `${u.form.def.name} : encore ${u.form.left} tour(s).` }]
        : [{ label: 'Attaque', value: 'attack', desc: 'Frapper ou tirer avec une de tes armes.' }];
      items.push(
        { label: 'Techniques', value: 'skills', disabled: !!u.form || !u.skills.length, desc: u.form ? 'Impossible sous forme bestiale.' : u.skills.length ? 'Utiliser une technique (coûte de l’ÉN).' : 'Aucune technique pour l’instant.' },
        { label: 'Objets', value: 'items', disabled: !inv.length, desc: inv.length ? 'Soins, grenades, fumigènes.' : 'Rien d’utilisable.' },
        { label: 'Défense', value: 'defend', desc: 'Dégâts reçus ÷ 2 jusqu’à ton prochain tour. +3 ÉN.' },
        { label: 'Fuite', value: 'flee', disabled: !!this.opts.noFlee, desc: this.opts.noFlee ? 'Impossible de fuir ce combat !' : `Chance de fuite : ${flee} %` },
      );
      if (art && !u.form && u.beast >= G.config.BEAST_MAX) {
        items.unshift({ label: `Transformation : ${art.form.name}`, value: 'transform', desc: `${art.name} — force, défense et vitesse décuplées pendant ${art.form.turns} tours.` });
      }
      const cmd = await G.ui.menu(menu, items, { title: `Tour de ${u.name}`, descEl: desc, cancel: false, columns: 2 });

      if (cmd === 'attack') {
        const act = await this.chooseWeapon(u);
        if (act) return act;
      } else if (cmd === 'beast') {
        const skills = u.form.def.skills.map(id => G.data.skills[id]);
        for (;;) {
          const sid = await G.ui.menu(menu, skills.map(s => ({ label: s.name, value: s.id, desc: s.desc })), { title: 'Attaques bestiales', descEl: desc, columns: 2, back: true });
          if (!sid) break;
          const sk = G.data.skills[sid];
          const targets = await this.chooseTargets(u, sk);
          if (targets) return { type: 'skill', skill: sk, targets };
        }
      } else if (cmd === 'skills') {
        for (;;) {
          const sid = await G.ui.menu(menu, u.skills.map(id => {
            const s = G.data.skills[id], cost = s.cost || 0;
            return { label: s.name, sub: `${cost} ÉN`, value: id, disabled: cost > u.mp, desc: cost > u.mp ? `Énergie insuffisante. ${s.desc || ''}` : (s.desc || '') };
          }), { title: 'Techniques', descEl: desc, columns: 2, back: true });
          if (!sid) break;
          const sk = G.data.skills[sid];
          const targets = await this.chooseTargets(u, sk);
          if (targets) return { type: 'skill', skill: sk, targets };
        }
      } else if (cmd === 'items') {
        for (;;) {
          const iid = await G.ui.menu(menu, inv.map(([id, q]) => ({ label: G.data.items[id].name, sub: `× ${q}`, value: id, desc: G.data.items[id].desc })), { title: 'Objets', descEl: desc, columns: 2, back: true });
          if (!iid) break;
          const it = G.data.items[iid];
          if (it.blast) return { type: 'item', item: iid, targets: foesOf(u) };
          if (it.smoke) return { type: 'item', item: iid, targets: [] };
          const t = await this.pickTarget(u, 'ally');
          if (t) return { type: 'item', item: iid, targets: [t] };
        }
      } else if (cmd === 'transform') {
        return { type: 'transform' };
      } else if (cmd === 'defend') {
        return { type: 'defend' };
      } else if (cmd === 'flee') {
        return { type: 'flee' };
      }
    }
  };

  // Choix de l'arme, avec munitions, avantages / inconvénients et rechargement
  B.chooseWeapon = async function (u) {
    const menu = $('battle-menu'), desc = $('battle-desc');
    for (;;) {
      const owned = G.weapons.owned();
      const list = owned.map(id => {
        const w = G.weapons.def(id), can = G.weapons.canFire(id);
        return {
          label: G.weapons.label(id), sub: G.weapons.ammoText(id), value: 'w:' + id, disabled: !can,
          desc: can ? `+ ${w.pros.join(' · ')}   − ${w.cons.join(' · ')}` : (G.weapons.reserve(id) ? 'Chargeur vide : recharge (1 tour).' : 'Plus aucune munition.'),
        };
      });
      if (owned.some(id => G.weapons.needsReload(id))) list.push({ label: 'Recharger…', value: 'reload', desc: 'Recharger une arme à feu. Prend le tour.' });
      const v = await G.ui.menu(menu, list, { title: 'Armes', descEl: desc, columns: 2, back: true });
      if (!v) return null;
      if (v === 'reload') {
        const guns = owned.filter(id => G.weapons.needsReload(id));
        const gid = await G.ui.menu(menu, guns.map(id => ({ label: G.weapons.label(id), sub: G.weapons.ammoText(id), value: id, desc: `Chargeur : ${G.weapons.mag(id)}/${G.weapons.def(id).mag} · réserve : ${G.weapons.reserve(id)}` })), { title: 'Recharger', descEl: desc, columns: 2, back: true });
        if (gid) return { type: 'reload', weapon: gid };
        continue;
      }
      const id = v.slice(2), w = G.weapons.def(id);
      if (w.spread) return { type: 'weapon', weapon: id, targets: foesOf(u) };
      const t = await this.pickTarget(u, 'enemy');
      if (t) return { type: 'weapon', weapon: id, targets: [t] };
    }
  };

  B.chooseTargets = async function (u, sk) {
    switch (sk.target) {
      case 'enemies': return foesOf(u);
      case 'self': return [u];
      case 'allies': return friendsOf(u);
      case 'ally': { const t = await this.pickTarget(u, 'ally'); return t ? [t] : null; }
      default: { const t = await this.pickTarget(u, 'enemy'); return t ? [t] : null; }
    }
  };

  B.pickTarget = async function (u, rel) {
    const side = rel === 'enemy' ? (u.side === 'ally' ? 'enemy' : 'ally') : u.side;
    const list = this.units.filter(x => x.alive && x.side === side);
    if (rel === 'ally' && list.length === 1) return list[0];
    this.targeting = list;
    const v = await G.ui.menu($('battle-menu'), list.map((x, i) => ({
      label: x.name, sub: `${x.hp}/${x.maxHp} PV`, value: i, desc: this.statusText(x) || (x.data && x.data.threat ? `Menace : ${x.data.threat}` : ''),
    })), { title: 'Choisir une cible', descEl: $('battle-desc'), columns: 2, back: true, onFocus: it => { this.cursor = it && !it.back ? list[it.value] : null; } });
    this.targeting = null;
    this.cursor = null;
    return v == null ? null : list[v];
  };

  // Clic / toucher sur un combattant pendant le ciblage
  B.pointer = function (x, y) {
    if (!this.active || !this.targeting || !G.ui.currentMenu) return;
    const i = this.targeting.findIndex(u => {
      const h = unitH(u), w = Math.max(50, h * 0.7);
      return x > u.x - w / 2 && x < u.x + w / 2 && y > u.y - h && y < u.y + 10;
    });
    if (i >= 0) G.ui.currentMenu.choose(i);
  };

  // ───────────── IA ─────────────
  B.decide = function (u) {
    const e = u.data;
    if (e.ai && AI[e.ai]) {
      const a = AI[e.ai](u, this);
      if (a) return a;
    }
    const pool = (e.skills || [['arme', 1]]).filter(([id]) => this.usable(u, G.data.skills[id]));
    const sk = G.data.skills[U.weighted(pool.length ? pool : [['arme', 1]])];
    if (sk.useWeapon) {
      const w = sk.useWeapon === 'own' ? G.data.weapons[e.weapon || 'couteau'] : sk.useWeapon;
      return { type: 'weapon', wdef: w, targets: w.spread ? foesOf(u) : this.autoTargets(u, { target: 'enemy' }) };
    }
    return { type: 'skill', skill: sk, targets: this.autoTargets(u, sk) };
  };

  B.usable = function (u, sk) {
    if (!sk) return false;
    if (u.maxMp > 0 && (sk.cost || 0) > u.mp) return false;
    const mods = (sk.effects || []).filter(f => f.type === 'mod');
    if (mods.length && mods.length === sk.effects.length) {
      const pool = sk.target === 'self' ? [u] : sk.target === 'allies' || sk.target === 'ally' ? friendsOf(u) : foesOf(u);
      return pool.some(t => !t.mods.some(m => m.stat === mods[0].stat && (m.mult > 1) === (mods[0].mult > 1)));
    }
    return true;
  };

  B.autoTargets = function (u, sk) {
    const foes = foesOf(u), friends = friendsOf(u);
    switch (sk.target) {
      case 'enemies': return foes;
      case 'self': return [u];
      case 'allies': return friends;
      case 'ally': return [friends.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]];
      default: return [U.weighted(foes.map(f => [f, f.isPlayer ? 2 : 1]))];
    }
  };

  // ───────────── Actions ─────────────
  B.perform = async function (u, act) {
    if (act.type === 'defend') {
      u.defending = true;
      if (u.maxMp) u.mp = Math.min(u.maxMp, u.mp + 3);
      this.float(u, 'Défense', '#f2b25c');
      this.fx.push({ kind: 'ring', x: u.x, y: u.y - 6, life: 0.65, age: 0, color: '#f2b25c' });
      this.renderParty();
      await U.wait(500);
      return null;
    }
    if (act.type === 'reload') {
      const n = G.weapons.reload(act.weapon), w = G.weapons.def(act.weapon);
      u.weaponShown = w.sprite;
      G.state.equipped = act.weapon;
      u.pose = 'attack';
      this.float(u, `Rechargé (+${n})`, '#e8c547', 18);
      for (let i = 0; i < 3; i++) this.fx.push({ kind: 'casing', x: u.x + U.rand(-6, 6), y: u.y - unitH(u) * 0.45, vx: U.rand(-60, 60), vy: U.rand(-120, -60), life: 0.6, age: 0 });
      this.renderParty();
      await U.wait(650);
      u.pose = null;
      return null;
    }
    if (act.type === 'item') return this.useItem(u, act.item, act.targets);
    if (act.type === 'transform') { await this.transform(u); return null; }
    if (act.type === 'weapon') {
      const w = act.wdef || G.weapons.def(act.weapon);
      await this.attackWeapon(u, w, act.targets, act.weapon);
      return null;
    }
    await this.useSkill(u, act.skill, act.targets);
    return null;
  };

  B.useItem = async function (u, iid, targets) {
    const it = G.data.items[iid];
    G.inventory.remove(iid);
    this.showSkillName(it.name, u);
    if (it.heal) {
      const t = targets[0];
      if (it.heal.hp) { const n = Math.min(t.maxHp - t.hp, it.heal.hp); t.hp += n; this.float(t, `+${n} PV`, '#7fd18b'); }
      if (it.heal.mp && t.maxMp) { const n = Math.min(t.maxMp - t.mp, it.heal.mp); t.mp += n; this.float(t, `+${n} ÉN`, '#4fb3a9'); }
      this.burst(t, '#7fd18b', 14);
      this.renderParty();
      await U.wait(650);
      return null;
    }
    if (it.blast) {
      const foes = targets.filter(t => t.alive);
      await this.lob(u, foes);
      for (const t of foes) {
        let dmg = Math.round(it.blast * U.rand(0.85, 1.15));
        if (t.defending) dmg = Math.round(dmg / 2);
        this.applyHit(t, { dmg, crit: false }, '#ffb347', u);
      }
      await U.wait(500);
      return null;
    }
    if (it.smoke) {
      for (let i = 0; i < 24; i++) this.fx.push({ kind: 'smoke', x: u.x + U.rand(-60, 60), y: u.y - U.rand(0, 70), vx: U.rand(-20, 20), vy: U.rand(-30, -8), r: U.rand(14, 30), life: U.rand(1, 1.6), age: 0 });
      await U.wait(700);
      if (this.opts.noFlee) { this.float(u, 'Impossible de fuir !', '#e8a090'); await U.wait(500); return null; }
      return 'flee';
    }
    return null;
  };

  // Attaque avec une arme (joueur ou ennemi)
  B.attackWeapon = async function (u, w, targets, wid) {
    targets = (targets || []).filter(t => t && t.alive);
    if (!targets.length) targets = this.autoTargets(u, { target: 'enemy' }).filter(Boolean);
    if (!targets.length) return;
    if (u.isPlayer && wid) {
      G.weapons.spend(wid);
      if (w.kind === 'gun') G.state.equipped = wid;
    }
    if (w.sprite) u.weaponShown = w.sprite;
    this.renderParty();

    if (w.kind === 'melee') {
      const t = targets[0];
      await this.lunge(u, t);
      this.vfx(t, { vfx: 'slash', color: '#f0e6d6' }, 0, u);
      const r = G.combat.hit(u, t, { power: w.power, stat: 'atk', acc: w.acc, critBonus: w.crit, armor: w.armor });
      this.applyHit(t, r, '#f0e6d6', u);
      if (!r.miss && w.bleed && t.alive && Math.random() < w.bleed.chance) {
        t.dots.push({ dmg: w.bleed.dmg, turns: w.bleed.turns });
        this.float(t, 'Saignement', '#e0412b', 16);
      }
      await U.wait(220);
      await this.retreat(u);
      await U.wait(200);
      return;
    }

    const hits = w.hits || 1;
    if (hits > 1) this.showSkillName('Rafale', u);
    u.pose = 'attack';
    for (let k = 0; k < hits; k++) {
      const alive = foesOf(u);
      if (!alive.length) break;
      const t = w.spread ? U.pick(alive) : (targets[0].alive ? targets[0] : U.pick(alive));
      const r = G.combat.hit(u, t, { power: w.power, stat: 'tir', acc: w.acc, critBonus: w.crit, pierce: w.pierce });
      this.shot(u, t, w, r);
      if (r.miss) this.float(t, 'Raté', '#a39a86', 16);
      else this.applyHit(t, r, '#ffd9a0', u);
      await U.wait(hits > 1 ? 90 : 240);
    }
    if (w.exposed) this.addMod(u, 'eva', 0, 2, 'À découvert');
    if (w.heavy) this.addMod(u, 'spd', 0.6, 2);
    await U.wait(260);
    u.pose = null;
    this.renderParty();
  };

  B.addMod = function (t, stat, mult, turns, label) {
    const up = mult > 1;
    t.mods = t.mods.filter(m => m.stat !== stat || (m.mult > 1) !== up);
    t.mods.push({ stat, mult, turns, label });
    this.float(t, label || `${STAT_SHORT[stat] || stat} ${up ? '▲' : '▼'}`, up ? '#ffb86b' : '#c9a4ff', 16);
  };

  B.useSkill = async function (u, sk, targets) {
    if (sk.useWeapon) {
      const w = sk.useWeapon === 'own' ? G.data.weapons[u.data.weapon || 'couteau'] : sk.useWeapon;
      return this.attackWeapon(u, w, targets);
    }
    targets = (targets || []).filter(t => t && t.alive);
    if (!targets.length) targets = this.autoTargets(u, sk).filter(Boolean);
    if (!targets.length) return;
    if (sk.cost) u.mp = Math.max(0, u.mp - sk.cost);
    if (sk.shown) u.weaponShown = sk.shown;
    this.renderParty();
    this.showSkillName(sk.name, u);
    const anim = sk.anim || 'melee', first = targets[0];
    const melee = anim === 'melee' && first !== u;
    if (melee) await this.lunge(u, first);
    else if (anim === 'cast') await this.cast(u, sk.color, sk.vfx);
    else if (anim === 'throw') await this.lob(u, targets);

    for (const eff of sk.effects || []) {
      if (eff.type === 'damage') {
        const hits = eff.hits || 1;
        for (let k = 0; k < hits; k++) {
          for (const t of targets) {
            if (!t.alive) continue;
            if (anim !== 'throw') this.vfx(t, sk, k, u);
            const r = G.combat.hit(u, t, eff);
            this.applyHit(t, r, sk.color, u);
            if (!r.miss && eff.bleed && t.alive && Math.random() < eff.bleed.chance) {
              t.dots.push({ dmg: eff.bleed.dmg, turns: eff.bleed.turns });
              this.float(t, 'Saignement', '#e0412b', 16);
            }
          }
          if (k < hits - 1) { if (melee) await this.jab(u); else await U.wait(200); }
        }
      } else if (eff.type === 'healPct') {
        for (const t of targets) {
          const n = Math.min(t.maxHp - t.hp, Math.round(t.maxHp * eff.pct));
          t.hp += n;
          this.float(t, `+${n}`, '#7fd18b');
          this.burst(t, '#7fd18b', 14);
        }
      } else if (eff.type === 'mod') {
        for (const t of targets) if (t.alive) this.addMod(t, eff.stat, eff.mult, eff.turns || 3);
      }
      await U.wait(150);
    }
    this.renderParty();
    if (melee) await this.retreat(u);
    await U.wait(280);
  };

  B.applyHit = function (t, r, color, attacker) {
    if (r.miss) { this.float(t, 'Esquive', '#a39a86', 18); return; }
    t.hp = Math.max(0, t.hp - r.dmg);
    t.flash = 1;
    this.float(t, String(r.dmg), r.crit ? '#ffd166' : '#ffffff', r.crit ? 36 : 26, r.crit ? 'CRITIQUE !' : null, r.crit);
    this.burst(t, color || '#ffffff', r.crit ? 24 : 12);
    this.fx.push({ kind: 'impact', x: t.x, y: t.y - unitH(t) * 0.5, r: unitH(t) * (r.crit ? 0.6 : 0.4), color: color || '#ffffff', life: 0.24, age: 0, rot: Math.random() * Math.PI });
    G.fx.hitstop(r.crit ? 130 : 60);
    if (r.crit) G.fx.flash('#ffffff', 0.22);
    t.pose = 'hurt'; t.poseT = 0.4;
    t.rot = t.side === 'ally' ? -0.16 : 0.16;
    U.tween(t, { rot: 0 }, 340);
    this.knock(t);
    if (r.crit || r.dmg > t.maxHp * 0.3) G.fx.shake(r.crit ? 280 : 160);
    // jauge de bête
    if (attacker && attacker.isPlayer && !attacker.form) this.addBeast(attacker, r.crit ? 10 : 6);
    if (t.isPlayer && !t.form) this.addBeast(t, (r.dmg / t.maxHp) * 70);
    if (t.hp <= 0) this.kill(t);
    this.renderParty();
  };

  B.kill = function (t) {
    t.alive = false;
    t.hp = 0;
    if (t.isPlayer) {
      this.burst(t, '#e0412b', 20);
      U.tween(t, { alpha: 0.45, rot: -1.25 }, 600);
      return;
    }
    const h = unitH(t);
    for (let i = 0; i < 18; i++) {
      this.fx.push({ kind: 'mote', x: t.x + U.rand(-h * 0.25, h * 0.25), y: t.y - U.rand(0, h * 0.5), vx: U.rand(-40, 40), vy: U.rand(-120, -20), life: U.rand(0.5, 0.9), age: 0, r: U.rand(1.5, 3), color: U.pick(['#5a1a14', '#8a2a1e', '#2a2420']), grav: true });
    }
    U.tween(t, { alpha: 0, rot: t.side === 'enemy' ? 1.3 : -1.3 }, 650);
  };

  // ───────────── Jauge de bête & transformation ─────────────
  B.addBeast = function (u, n) {
    if (!G.artifacts.equipped()) return;
    const max = G.config.BEAST_MAX, before = u.beast;
    u.beast = Math.min(max, u.beast + n);
    if (before < max && u.beast >= max) {
      this.float(u, 'BÊTE PRÊTE', '#ffb347', 20);
      this.fx.push({ kind: 'ring', x: u.x, y: u.y - 6, life: 0.8, age: 0, color: '#ffb347' });
    }
  };

  B.transform = async function (u) {
    const a = G.artifacts.equipped(), f = a.form;
    this.showSkillName(`Transformation : ${f.name}`, u);
    u.pose = 'attack';
    for (let i = 0; i < 36; i++) this.fx.push({ kind: 'mote', x: u.x + U.rand(-30, 30), y: u.y - U.rand(0, 80), vx: U.rand(-60, 60), vy: U.rand(-160, -40), life: U.rand(0.6, 1.1), age: 0, r: U.rand(1.5, 3.5), color: '#ffb347', glow: true });
    this.fx.push({ kind: 'pillar', x: u.x, y: u.y, h: unitH(u) * 1.8, w: unitH(u) * 0.8, color: '#ffb347', life: 0.9, age: 0 });
    await U.wait(450);
    G.fx.flash('#ffcf8a', 0.6);
    G.fx.shake(500);
    G.fx.hitstop(160);
    this.fx.push({ kind: 'shock', x: u.x, y: u.y - 2, r: unitH(u), color: '#ffb347', life: 0.6, age: 0 });
    u.form = { def: f, left: f.turns, fresh: true, sprite0: u.sprite, base0: Object.assign({}, u.base) };
    u.sprite = f.sprite;
    for (const k in f.mult) u.base[k] = u.base[k] * f.mult[k];
    const heal = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * f.heal));
    u.hp += heal;
    u.flash = 1;
    this.float(u, f.name.toUpperCase(), '#ffb347', 28);
    if (heal) this.float(u, `+${heal}`, '#7fd18b');
    this.layout(this.measureBottom());
    U.tween(u, { x: u.homeX, y: u.homeY }, 300);
    this.renderParty();
    await U.wait(700);
    u.pose = null;
  };

  B.formTick = function (u) {
    if (u.form.fresh) { u.form.fresh = false; return; }
    u.form.left--;
    u.beast = (u.form.left / u.form.def.turns) * G.config.BEAST_MAX;
    if (u.form.left <= 0) this.revert(u);
  };

  B.revert = function (u) {
    if (!u.form) return;
    u.sprite = u.form.sprite0;
    u.base = u.form.base0;
    u.form = null;
    u.beast = 0;
    for (let i = 0; i < 16; i++) this.fx.push({ kind: 'smoke', x: u.x + U.rand(-20, 20), y: u.y - U.rand(10, 70), vx: U.rand(-15, 15), vy: U.rand(-25, -8), r: U.rand(8, 16), life: U.rand(0.8, 1.2), age: 0 });
    if (u.alive) this.float(u, 'Forme humaine', '#efe6d2', 18);
  };

  // ───────────── Fin du combat ─────────────
  B.finish = async function (result) {
    const hero = this.units.find(u => u.isPlayer), h = G.state.hunter;
    if (hero.form) this.revert(hero);
    h.hp = Math.round(hero.hp);
    h.mp = Math.round(hero.mp);
    if (result === 'lose' && this.opts.allowDefeat) h.hp = 1;
    G.weapons.reloadAll();
    if (result !== 'win') { G.hunter.clamp(); return result; }
    h.hp = Math.max(1, h.hp);

    const dead = enemies();
    const xp = dead.reduce((s, u) => s + (u.data.xp || 0), 0);
    const gold = dead.reduce((s, u) => s + (u.data.gold || 0), 0);
    const drops = {};
    for (const u of dead) {
      for (const [id, ch, qty] of u.data.drops || []) {
        if (Math.random() < ch) { drops[id] = (drops[id] || 0) + (qty || 1); G.inventory.add(id, qty || 1); }
      }
      G.quests.track('kill', 1, u.eid);
    }
    G.state.gold += gold;

    const lines = [`+${xp} EXP`];
    if (gold) lines.push(`+${gold} ferraille`);
    for (const id in drops) lines.push(`${G.data.items[id].name} × ${drops[id]}`);
    await G.ui.system(lines.join('\n'), 'Victoire');
    G.hunter.gainXp(xp);
    G.hunter.clamp();
    return 'win';
  };

  // ───────────── Animations ─────────────
  B.lunge = async function (u, t) {
    const s = Math.sign(t.x - u.x) || 1;
    u.pose = 'attack';
    u.dashing = true;
    U.tween(u, { rot: 0.14 * s }, 150);
    await U.tween(u, { x: t.x - s * (40 + unitH(t) * 0.25), y: t.y + 2 }, 210, 'inQuad');
    u.dashing = false;
  };
  B.retreat = async function (u) {
    u.pose = null;
    U.tween(u, { rot: 0 }, 220);
    await U.tween(u, { x: u.homeX, y: u.homeY }, 260);
  };
  B.jab = async function (u) {
    const s = u.side === 'ally' ? 1 : -1;
    await U.tween(u, { ox: -s * 14 }, 70);
    await U.tween(u, { ox: 0 }, 90);
  };
  B.knock = async function (t) {
    const s = t.side === 'ally' ? -1 : 1;
    await U.tween(t, { ox: s * 10 }, 60);
    await U.tween(t, { ox: 0 }, 160);
  };
  B.cast = async function (u, color, vfx) {
    const c = color || '#f2b25c', h = unitH(u);
    this.fx.push({ kind: 'circle', x: u.x, y: u.y - 2, r: h * 0.6, color: c, life: 0.95, age: 0 });
    this.fx.push({ kind: 'pillar', x: u.x, y: u.y, h: h * 1.35, w: h * 0.5, color: c, life: 0.75, age: 0 });
    for (let i = 0; i < 12; i++) this.fx.push({ kind: 'mote', x: u.x + U.rand(-h * 0.3, h * 0.3), y: u.y - U.rand(0, h * 0.4), vx: U.rand(-8, 8), vy: U.rand(-120, -50), life: U.rand(0.5, 0.9), age: 0, r: U.rand(1.2, 2.6), color: c, glow: true });
    u.pose = 'attack';
    u.flash = 0.5;
    if (vfx === 'dread') {
      G.fx.flash('#e0412b', 0.3);
      G.fx.shake(260);
      this.fx.push({ kind: 'wave', x: u.x, y: u.y - h * 0.5, color: c, life: 0.85, age: 0 });
    }
    await U.wait(480);
    u.pose = null;
  };
  // Tir : éclair au canon, traçante, douille éjectée, recul
  B.shot = function (u, t, w, r) {
    const dir = Math.sign(t.x - u.x) || 1, h = unitH(u);
    const reach = w.sprite === 'pistol' ? 0.3 : 0.44;
    const mx = u.x + dir * h * reach, my = u.y - h * 0.47;
    const tx = t.x + (r.miss ? dir * U.rand(70, 150) : U.rand(-6, 6));
    const ty = t.y - unitH(t) * U.rand(0.35, 0.6) + (r.miss ? U.rand(-36, 36) : 0);
    const big = w.sprite === 'rifle';
    this.fx.push({ kind: 'muzzle', x: mx, y: my, dir, size: big ? 1.6 : w.sprite === 'mg' ? 1.15 : 1, life: 0.08, age: 0 });
    this.fx.push({ kind: 'tracer', x0: mx, y0: my, x1: tx, y1: ty, life: big ? 0.22 : 0.12, age: 0, width: big ? 3 : 1.6 });
    this.fx.push({ kind: 'casing', x: mx - dir * 10, y: my, vx: -dir * U.rand(40, 90), vy: U.rand(-160, -90), life: 0.6, age: 0 });
    if (big) G.fx.shake(150);
    U.tween(u, { ox: -dir * (big ? 9 : 4) }, 40).then(() => U.tween(u, { ox: 0 }, 120));
  };
  // Lancer de grenade en cloche, puis explosion
  B.lob = async function (u, targets) {
    if (!targets.length) return;
    const cx = targets.reduce((s, t) => s + t.x, 0) / targets.length;
    const cy = targets.reduce((s, t) => s + t.y, 0) / targets.length - 20;
    const g = { kind: 'grenade', x0: u.x, y0: u.y - unitH(u) * 0.6, x1: cx, y1: cy, k: 0 };
    this.fx.push(g);
    u.pose = 'attack';
    await U.tween(g, { k: 1 }, 520, 'linear');
    g.dead = true;
    u.pose = null;
    G.fx.flash('#ffb347', 0.3);
    G.fx.shake(380);
    G.fx.hitstop(90);
    this.fx.push({ kind: 'blast', x: cx, y: cy, r: 90, life: 0.55, age: 0 });
    this.fx.push({ kind: 'shock', x: cx, y: cy + 20, r: 120, color: '#ffb347', life: 0.55, age: 0 });
    for (let i = 0; i < 16; i++) this.fx.push({ kind: 'smoke', x: cx + U.rand(-50, 50), y: cy + U.rand(-30, 20), vx: U.rand(-25, 25), vy: U.rand(-35, -10), r: U.rand(12, 26), life: U.rand(0.9, 1.5), age: 0 });
    for (let i = 0; i < 20; i++) this.fx.push({ kind: 'spark', x: cx, y: cy, vx: U.rand(-260, 260), vy: U.rand(-300, 40), life: U.rand(0.3, 0.7), age: 0, color: '#ffd27a', r: U.rand(1.5, 3) });
    await U.wait(150);
  };
  B.burst = function (t, color, n) {
    const cy = t.y - unitH(t) * 0.45;
    for (let i = 0; i < n; i++) {
      this.fx.push({ kind: 'spark', x: t.x + U.rand(-10, 10), y: cy + U.rand(-10, 10), vx: U.rand(-170, 170), vy: U.rand(-220, 40), life: U.rand(0.35, 0.75), age: 0, color, r: U.rand(1.5, 3.5) });
    }
  };
  // Effet visuel à l'impact selon la technique
  B.vfx = function (t, sk, k, u) {
    const kind = sk.vfx || (sk.anim === 'melee' ? 'slash' : null);
    if (!kind) return;
    const h = unitH(t), cx = t.x, cy = t.y - h * 0.5, col = sk.color || '#ffffff';
    const s = Math.sign(t.x - u.x) || 1;
    if (kind === 'slash') {
      this.fx.push({ kind: 'slash', x: cx, y: cy, r: h * 0.45, rot: (k % 2 ? 2.5 : -0.65) * s + (s < 0 ? Math.PI : 0), color: col, life: 0.3, age: 0 });
    } else if (kind === 'cross') {
      this.fx.push({ kind: 'slash', x: cx, y: cy, r: h * 0.55, rot: -0.8, color: col, life: 0.36, age: 0, wide: true });
      this.fx.push({ kind: 'slash', x: cx, y: cy, r: h * 0.55, rot: 0.8 + Math.PI, color: col, life: 0.36, age: -0.06, wide: true });
    } else if (kind === 'claw') {
      this.fx.push({ kind: 'claw', x: cx, y: cy, r: h * 0.38, color: col, life: 0.36, age: 0, s });
    } else if (kind === 'smash') {
      this.fx.push({ kind: 'shock', x: t.x, y: t.y - 2, r: h * 0.6, color: col, life: 0.55, age: 0 });
      for (let i = 0; i < 10; i++) this.fx.push({ kind: 'mote', x: t.x + U.rand(-h * 0.3, h * 0.3), y: t.y - 4, vx: U.rand(-90, 90), vy: U.rand(-90, -20), life: U.rand(0.4, 0.7), age: 0, r: U.rand(2, 4), color: '#6b6258', grav: true });
    }
  };
  B.float = function (t, text, color, size = 22, label = null, crit = false) {
    const n = this.texts.filter(x => x.unit === t && x.age < 0.5).length;
    this.texts.push({ unit: t, x: t.x + U.rand(-10, 10), y: t.y - unitH(t) - 4 - n * 24, vy: -190, text, color, size, label, crit, age: 0, life: 1.2 });
  };
  B.showSkillName = function (text, u) { this.skillName = { text, side: u ? u.side : 'ally', age: 0 }; };
  B.showBanner = async function (text, top) {
    this.banner = { text, top, a: 0 };
    await U.tween(this.banner, { a: 1 }, 220);
    await U.wait(850);
    await U.tween(this.banner, { a: 0 }, 220);
    this.banner = null;
  };

  // Marqueur tactique au sol (vu en perspective)
  B.runeCircle = function (ctx, x, y, r, rgb, rot, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.34);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.strokeStyle = `rgb(${rgb})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, rot, rot + Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(rot);
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const an = (i / 4) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.06, an - 0.18, an + 0.18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Math.cos(an) * r * 0.7, Math.sin(an) * r * 0.7); ctx.lineTo(Math.cos(an) * r * 0.92, Math.sin(an) * r * 0.92); ctx.stroke();
    }
    ctx.restore();
  };

  B.drawFx = function (ctx, p) {
    const q = Math.max(0, p.age / p.life);
    if (p.age < 0) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    switch (p.kind) {
      case 'slash': {
        const sweep = Math.min(1, q / 0.45), fade = q < 0.45 ? 1 : 1 - (q - 0.45) / 0.55;
        const span = p.wide ? 2.6 : 2.2, a0 = -span / 2, a1 = a0 + span * sweep;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        for (const [w, col, al] of [[1, p.color, 0.55], [0.45, '#ffffff', 0.95]]) {
          ctx.globalAlpha = al * fade;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(0, 0, p.r, a0, a1);
          ctx.arc(p.r * 0.16 * w, p.r * 0.1 * w, p.r * (1 - 0.14 * w), a1, a0, true);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'claw': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(0.7 * p.s);
        for (let i = -1; i <= 1; i++) {
          const len = p.r * 1.6 * Math.min(1, q * 4);
          ctx.globalAlpha = 1 - q;
          ctx.strokeStyle = p.color; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(i * p.r * 0.32, -len / 2); ctx.lineTo(i * p.r * 0.32 + p.r * 0.1, len / 2); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'impact': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 1 - q;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 0.6);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.strokeStyle = p.color; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const an = (i / 8) * Math.PI * 2, r0 = p.r * (0.25 + q * 0.5), r1 = p.r * (0.55 + q * 0.6) * (i % 2 ? 0.7 : 1);
          ctx.moveTo(Math.cos(an) * r0, Math.sin(an) * r0);
          ctx.lineTo(Math.cos(an) * r1, Math.sin(an) * r1);
        }
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'shock': {
        const rr = p.r * (0.3 + q * 1.2);
        ctx.globalAlpha = (1 - q) * 0.9;
        ctx.strokeStyle = p.color; ctx.lineWidth = 6 * (1 - q) + 1;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, rr * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, rr * 0.8, rr * 0.26, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'circle': {
        const grow = Math.min(1, q * 3), fade = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
        const n = parseInt(p.color.replace('#', ''), 16);
        this.runeCircle(ctx, p.x, p.y, p.r * grow, `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`, p.age * 3, 0.95 * fade);
        ctx.globalCompositeOperation = 'lighter';
        break;
      }
      case 'pillar': {
        const fade = q < 0.3 ? q / 0.3 : 1 - (q - 0.3) / 0.7;
        const g = ctx.createLinearGradient(0, p.y, 0, p.y - p.h);
        g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.45 * fade;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 2, p.w / 2, p.w * 0.16, 0, 0, Math.PI);
        ctx.lineTo(p.x - p.w * 0.35, p.y - p.h);
        ctx.lineTo(p.x + p.w * 0.35, p.y - p.h);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'wave': {
        const rr = 30 + q * W * 0.75;
        ctx.globalAlpha = (1 - q) * 0.7;
        ctx.strokeStyle = p.color; ctx.lineWidth = 10 * (1 - q) + 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'ring': {
        ctx.globalAlpha = 1 - q;
        ctx.strokeStyle = p.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 16 + q * 80, (16 + q * 80) * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'mote': {
        ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
        ctx.globalAlpha = 1 - q;
        ctx.fillStyle = p.color;
        const r = p.r * (p.glow ? 1 : 1 + q * 0.5);
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        break;
      }
      case 'smoke': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (1 - q) * 0.45;
        const r = p.r * (1 + q * 0.8);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, 'rgba(70,64,58,0.9)'); g.addColorStop(1, 'rgba(70,64,58,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        break;
      }
      case 'muzzle': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.dir, 1);
        ctx.globalAlpha = 1 - q;
        const s = 14 * p.size;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.6);
        g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.4, 'rgba(255,190,90,0.8)'); g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-s * 1.6, -s * 1.6, s * 3.2, s * 3.2);
        ctx.fillStyle = '#fff6d8';
        ctx.beginPath(); ctx.moveTo(0, -s * 0.35); ctx.lineTo(s * 2.2, 0); ctx.lineTo(0, s * 0.35); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(s * 0.3, 0); ctx.lineTo(s * 1.0, -s * 0.9); ctx.lineTo(s * 0.6, 0); ctx.lineTo(s * 1.0, s * 0.9); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'tracer': {
        const t0 = Math.min(1, q * 2.2), t1 = Math.max(0, q * 2.2 - 0.6);
        const ax = p.x0 + (p.x1 - p.x0) * t1, ay = p.y0 + (p.y1 - p.y0) * t1;
        const bx = p.x0 + (p.x1 - p.x0) * t0, by = p.y0 + (p.y1 - p.y0) * t0;
        const g = ctx.createLinearGradient(ax, ay, bx, by);
        g.addColorStop(0, 'rgba(255,200,120,0)'); g.addColorStop(1, 'rgba(255,240,200,0.95)');
        ctx.strokeStyle = g; ctx.lineWidth = p.width; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        break;
      }
      case 'casing': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1 - q * 0.6;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.age * 18);
        ctx.fillStyle = '#d8a84a';
        ctx.fillRect(-2.5, -1, 5, 2);
        ctx.restore();
        break;
      }
      case 'grenade': {
        const x = p.x0 + (p.x1 - p.x0) * p.k, y = p.y0 + (p.y1 - p.y0) * p.k - Math.sin(p.k * Math.PI) * 110;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#3d4632';
        ctx.beginPath(); ctx.ellipse(x, y, 5, 6, p.k * 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#11140d'; ctx.lineWidth = 1; ctx.stroke();
        break;
      }
      case 'blast': {
        const r = p.r * (0.4 + q * 0.9);
        ctx.globalAlpha = 1 - q;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.3, 'rgba(255,180,70,0.95)'); g.addColorStop(0.7, 'rgba(200,70,20,0.6)'); g.addColorStop(1, 'rgba(80,20,10,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        break;
      }
      case 'speed': {
        ctx.globalAlpha = (1 - q) * 0.7;
        ctx.strokeStyle = '#fff1dc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const R = Math.hypot(W, H) / 2;
        for (const [an, k2] of p.lines) {
          const r0 = R * (k2 - q * 0.35), r1 = R * 1.05;
          ctx.moveTo(W / 2 + Math.cos(an) * r0, H / 2 + Math.sin(an) * r0);
          ctx.lineTo(W / 2 + Math.cos(an) * r1, H / 2 + Math.sin(an) * r1);
        }
        ctx.stroke();
        break;
      }
    }
  };

  // ───────────── Interface DOM ─────────────
  B.showUI = function (on) {
    const el = $('battle-ui');
    el.hidden = !on;
    if (on) { G.ui.hideDialogue(); this.renderParty(); }
    else { $('battle-menu').innerHTML = ''; $('battle-desc').textContent = ''; }
  };

  B.statusText = function (u) {
    const parts = [];
    if (u.defending) parts.push('Défense');
    for (const m of u.mods) parts.push(`${m.label || `${STAT_SHORT[m.stat] || m.stat} ${m.mult > 1 ? '▲' : '▼'}`} (${m.turns})`);
    if (u.dots.length) parts.push('Saignement');
    return parts.join(' · ');
  };

  B.renderParty = function () {
    const pct = (a, b) => Math.round(100 * U.clamp(a / Math.max(1, b), 0, 1));
    const art = G.artifacts.equipped();
    $('party-status').innerHTML = allies().map(u => {
      const wid = G.state.equipped;
      const wline = u.isPlayer && !u.form && wid && G.state.weapons[wid] ? `${G.weapons.label(wid)} · ${G.weapons.ammoText(wid)}` : (u.form ? u.form.def.name : '');
      return `
      <div class="pm-row ${u === this.turnUnit ? 'active' : ''} ${u.alive ? '' : 'ko'}">
        <div class="pm-name">${esc(u.name)}<small>${u.isPlayer ? `Niv. ${G.state.hunter.level}` : ''}</small></div>
        <div class="pm-bars">
          <div><span>PV ${Math.round(u.hp)}/${u.maxHp}</span><div class="bar hp"><i style="width:${pct(u.hp, u.maxHp)}%"></i></div></div>
          ${u.maxMp ? `<div><span>ÉN ${Math.round(u.mp)}/${u.maxMp}</span><div class="bar mp"><i style="width:${pct(u.mp, u.maxMp)}%"></i></div></div>` : ''}
        </div>
        ${u.isPlayer && art ? `<div class="pm-beast"><span>BÊTE</span><div class="bar beast${u.beast >= G.config.BEAST_MAX ? ' full' : ''}"><i style="width:${pct(u.beast, G.config.BEAST_MAX)}%"></i></div></div>` : ''}
        <div class="pm-status">${esc([wline, this.statusText(u)].filter(Boolean).join(' · '))}</div>
      </div>`;
    }).join('');
  };

  // ───────────── Mise à jour & rendu canvas ─────────────
  B.update = function (dt) {
    for (const u of this.units) {
      u.t += dt;
      if (u.flash > 0) u.flash = Math.max(0, u.flash - dt * 4);
      if (u.poseT > 0) { u.poseT -= dt; if (u.poseT <= 0 && u.pose === 'hurt') u.pose = null; }
      if (u.dashing && Math.random() < 0.8) this.fx.push({ kind: 'ghost', unit: u, x: u.x, y: u.y, rot: u.rot, life: 0.2, age: 0 });
    }
    // poussière et cendres en suspension
    if (this.dim > 0.3 && Math.random() < dt * 12) {
      this.fx.push({ kind: 'amb', x: U.rand(0, W), y: U.rand(H * 0.25, H), vy: U.rand(-24, -8), vx: U.rand(-6, 6), life: U.rand(2, 3.5), age: 0, r: U.rand(0.8, 1.6), rgb: Math.random() < 0.5 ? '255,170,90' : '200,190,175' });
    }
    for (const p of this.fx) {
      if (p.life != null) p.age += dt;
      if (p.kind === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; }
      else if (p.kind === 'mote') { p.x += p.vx * dt; p.y += p.vy * dt; if (p.grav) p.vy += 300 * dt; else p.vx *= 1 - dt; }
      else if (p.kind === 'casing') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; }
      else if (p.kind === 'smoke') { p.x += p.vx * dt; p.y += p.vy * dt; }
      else if (p.kind === 'amb') { p.y += p.vy * dt; p.x += p.vx * dt; }
    }
    this.fx = this.fx.filter(p => !p.dead && (p.life == null || p.age < p.life));
    for (const t of this.texts) {
      t.age += dt;
      t.vy = Math.min(24, t.vy + 520 * dt);
      t.y += t.vy * dt;
    }
    this.texts = this.texts.filter(t => t.age < t.life);
    if (this.skillName) { this.skillName.age += dt; if (this.skillName.age > 1.4) this.skillName = null; }
  };

  B.render = function (ctx) {
    const k = this.dim / DIM;
    const bg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.95);
    bg.addColorStop(0, `rgba(14,10,7,${this.dim})`);
    bg.addColorStop(1, `rgba(0,0,0,${Math.min(1, this.dim + 0.22 * k)})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // marqueurs tactiques sous chaque camp
    if (k > 0.05) {
      for (const [list, rgb, dirR] of [[allies(), '242,178,92', 1], [enemies(), '224,65,43', -1]]) {
        if (!list.length) continue;
        const cx = list.reduce((a, u) => a + u.homeX, 0) / list.length;
        const cy = list.reduce((a, u) => a + u.homeY, 0) / list.length;
        const spread = Math.max(...list.map(u => Math.abs(u.homeY - cy))) * 1.6;
        this.runeCircle(ctx, cx, cy + 6, 110 + spread, rgb, G.time * 0.2 * dirR, 0.26 * k);
      }
    }
    for (const p of this.fx) {
      if (p.kind !== 'amb') continue;
      const q = p.age / p.life, a = q < 0.2 ? q / 0.2 : 1 - (q - 0.2) / 0.8;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.7 * k;
      ctx.drawImage(G.scenes.overworld.glowSprite(p.rgb), p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
      ctx.restore();
    }

    // cercle sous chaque combattant
    for (const u of this.units) {
      if (u.alpha < 0.05) continue;
      const rgb = u.side === 'ally' ? (u.form ? '255,179,71' : '242,178,92') : '224,65,43';
      const active = u === this.turnUnit && u.alive;
      const rw = Math.max(28, unitH(u) * 0.36);
      if (active) { this.runeCircle(ctx, u.x, u.y - 2, rw * 1.25, rgb, G.time * 1.2, 0.9 * u.alpha); continue; }
      ctx.save();
      ctx.globalAlpha = u.alpha * 0.35;
      ctx.strokeStyle = `rgb(${rgb})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(u.x, u.y - 2, rw, rw * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // images rémanentes pendant les charges
    for (const p of this.fx) {
      if (p.kind !== 'ghost') continue;
      const u = p.unit;
      G.assets.draw(ctx, u.sprite, p.x + u.ox, p.y + u.oy, {
        scale: u.scale, dir: u.side === 'ally' ? 'right' : 'left', t: u.t, alpha: 0.3 * (1 - p.age / p.life) * u.alpha,
        rot: p.rot, pose: 'attack', noGround: true, weapon: u.weaponShown,
      });
    }

    const sorted = this.units.slice().sort((a, b) => a.y - b.y);
    for (const u of sorted) {
      if (u.alpha < 0.02) continue;
      G.assets.draw(ctx, u.sprite, u.x + u.ox, u.y + u.oy, {
        scale: u.scale, dir: u.side === 'ally' ? 'right' : 'left', t: u.t, alpha: u.alpha,
        flash: u.flash, rot: u.rot, pose: u.pose || (u.alive ? null : 'hurt'), weapon: u.weaponShown,
      });
    }

    // barres de vie des ennemis
    ctx.save();
    ctx.textAlign = 'center';
    for (const u of enemies()) {
      if (!u.alive || u.alpha < 0.5) continue;
      const w = u.data.boss ? 140 : 76, x = u.x - w / 2, y = u.y - unitH(u) - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 1, y - 1, w + 2, 7);
      ctx.fillStyle = '#d9472b'; ctx.fillRect(x, y, w * U.clamp(u.hp / u.maxHp, 0, 1), 5);
      ctx.font = '600 13px "Barlow Semi Condensed", sans-serif';
      ctx.fillStyle = '#efe6d2';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText(u.name, u.x, y - 6);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // réticule de ciblage
    if (this.cursor && this.cursor.alive) {
      const u = this.cursor, h = unitH(u), cx = u.x, cy = u.y - h * 0.5, r = Math.max(30, h * 0.42) + Math.sin(G.time * 8) * 2;
      ctx.save();
      ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(cx + dx * r * 0.7, cy + dy * r * 0.7); ctx.lineTo(cx + dx * r * 1.3, cy + dy * r * 1.3); }
      ctx.stroke();
      ctx.restore();
    }

    // effets
    ctx.save();
    for (const p of this.fx) {
      if (p.kind === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - p.age / p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind !== 'amb' && p.kind !== 'ghost') {
        this.drawFx(ctx, p);
      }
    }
    ctx.restore();

    // textes flottants
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const a = 1 - Math.max(0, (t.age - 0.65) / 0.5);
      const pop = t.age < 0.12 ? 1 + (0.12 - t.age) * 4 : 1;
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = `700 ${Math.round(t.size * pop)}px "Barlow Semi Condensed", sans-serif`;
      ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.strokeText(t.text, t.x, t.y);
      if (t.crit) {
        const g = ctx.createLinearGradient(0, t.y - t.size / 2, 0, t.y + t.size / 2);
        g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#ffd166'); g.addColorStop(1, '#ff8a3c');
        ctx.fillStyle = g;
      } else ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      if (t.label) {
        ctx.font = '700 13px "Barlow Semi Condensed", sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeText(t.label, t.x, t.y - t.size * 0.8);
        ctx.fillText(t.label, t.x, t.y - t.size * 0.8);
      }
    }
    ctx.restore();

    // nom de l'action
    if (this.skillName) {
      const s = this.skillName, a = Math.min(1, s.age * 6) * (1 - Math.max(0, (s.age - 1.1) / 0.3));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = '700 18px "Barlow Semi Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = s.text.toUpperCase(), w = ctx.measureText(label).width + 44;
      const enemy = s.side === 'enemy';
      ctx.fillStyle = 'rgba(20,16,12,0.9)';
      ctx.fillRect(W / 2 - w / 2, 22, w, 34);
      ctx.fillStyle = enemy ? '#e0412b' : '#f2b25c';
      ctx.fillRect(W / 2 - w / 2, 22, 4, 34);
      ctx.fillRect(W / 2 + w / 2 - 4, 22, 4, 34);
      ctx.fillStyle = enemy ? '#ffc8bc' : '#ffe2b8';
      ctx.fillText(label, W / 2, 40);
      ctx.restore();
    }

    // bannière d'entrée en combat
    if (this.banner) {
      const b = this.banner;
      ctx.save();
      ctx.globalAlpha = b.a;
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(10,8,6,0)'); g.addColorStop(0.2, 'rgba(10,8,6,0.9)'); g.addColorStop(0.8, 'rgba(10,8,6,0.9)'); g.addColorStop(1, 'rgba(10,8,6,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, H / 2 - 54, W, 108);
      const boss = b.top === 'Boss';
      // bandes de danger
      ctx.save();
      ctx.beginPath(); ctx.rect(W * 0.2, H / 2 - 54, W * 0.6, 6); ctx.rect(W * 0.2, H / 2 + 48, W * 0.6, 6); ctx.clip();
      ctx.fillStyle = boss ? '#e0412b' : '#f2b25c';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#14100c';
      for (let x = W * 0.2 - 20; x < W * 0.8 + 20; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, H / 2 + 60); ctx.lineTo(x + 9, H / 2 + 60); ctx.lineTo(x + 19, H / 2 - 60); ctx.lineTo(x + 10, H / 2 - 60); ctx.fill();
      }
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 14px "Barlow Semi Condensed", sans-serif';
      ctx.fillStyle = boss ? '#ffb3a6' : '#f2b25c';
      ctx.fillText(b.top.toUpperCase(), W / 2, H / 2 - 22);
      ctx.font = '36px "Saira Stencil One", "Barlow Semi Condensed", sans-serif';
      ctx.fillStyle = '#efe6d2';
      ctx.fillText(b.text.toUpperCase(), W / 2, H / 2 + 12);
      ctx.restore();
    }
  };

  G.battle = B;
})();
