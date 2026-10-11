/* Combat au tour par tour, joué directement sur la carte vue de dessus :
   le décor s'assombrit, les combattants se placent face à face.
   L'ordre d'action dépend de la vitesse (AGI) à chaque round. */
(function () {
  const U = G.U;
  const T = G.config.TILE;
  const W = G.config.WIDTH, H = G.config.HEIGHT;
  const $ = id => document.getElementById(id);
  const esc = U.esc;
  const STAT_SHORT = { atk: 'ATQ', def: 'DÉF', spd: 'VIT', mag: 'MAG' };
  const DIM = 0.74; // assombrissement du décor pendant le combat

  const B = {
    active: false, units: [], fx: [], texts: [], opts: {},
    hideEnt: null, dim: 0, turnUnit: null, cursor: null, targeting: null,
    skillName: null, banner: null,
  };

  // IA spéciales (boss). Retourner null = choix pondéré classique.
  const AI = {
    kargash(u, b) {
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

  // ───────────── Lancement ─────────────
  B.start = async function (opts) {
    const ow = G.scenes.overworld;
    Object.assign(this, { active: true, opts, units: [], fx: [], texts: [], cursor: null, targeting: null, turnUnit: null, skillName: null, banner: null });
    this.hideEnt = opts.fromEnt || ow.lastEncounter || null;

    const h = G.state.hunter;
    const pPos = ow.screenPos(ow.player);
    const hero = this.makeHero(h);
    hero.x = pPos.x; hero.y = pPos.y;
    this.units.push(hero);
    (G.state.shadows || []).slice(0, G.state.shadowSlots || 0).forEach(s => {
      const u = this.makeShadow(s);
      if (!u) return;
      u.x = pPos.x; u.y = pPos.y; u.alpha = 0;
      this.units.push(u);
    });
    const ePos = this.hideEnt ? ow.screenPos(this.hideEnt) : { x: pPos.x + 120, y: pPos.y };
    opts.enemies.forEach((id, i) => {
      const u = this.makeEnemy(id, i);
      u.x = ePos.x; u.y = ePos.y;
      u.alpha = i === 0 && this.hideEnt ? 1 : 0;
      this.units.push(u);
    });
    this.showUI(true);
    this.layout(this.measureBottom());

    G.fx.flash('#cfe8ff', 0.55);
    this.dim = 0;
    const moves = [U.tween(this, { dim: DIM }, 500)];
    for (const u of this.units) moves.push(U.tween(u, { x: u.homeX, y: u.homeY, alpha: 1 }, 600));
    await Promise.all(moves);
    const isBoss = enemies().some(u => u.data.boss);
    await this.showBanner(opts.intro || (isBoss ? enemies()[0].name : 'Combat'), isBoss ? 'Boss' : 'Rencontre');

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
      base: { atk: d.atk, def: d.def, mag: d.mag, spd: d.spd, crit: d.crit, eva: d.eva },
      skills: h.skills.filter(id => G.data.skills[id] && !G.data.skills[id].passive),
      mods: [], dots: [], alive: true, scale: 1.5, alpha: 1, flash: 0, t: 0, ox: 0, oy: 0,
    };
  };

  B.makeEnemy = function (id, i) {
    const e = G.data.enemies[id];
    return {
      id: `${id}_${i}`, eid: id, side: 'enemy', name: e.name, sprite: e.sprite, data: e,
      hp: e.hp, maxHp: e.hp, mp: 0, maxMp: 0,
      base: { atk: e.atk, def: e.def, mag: e.mag || 0, spd: e.spd, crit: e.crit || 0.05, eva: e.eva || 0 },
      mods: [], dots: [], alive: true, scale: e.battleScale || 1.5, alpha: 1, flash: 0, t: Math.random() * 5, ox: 0, oy: 0,
    };
  };

  // Les ombres grandissent avec le niveau du joueur
  B.makeShadow = function (s) {
    const e = G.data.enemies[s.base];
    if (!e) return null;
    const k = 0.8 + 0.06 * G.state.hunter.level;
    const hp = Math.round(e.hp * k);
    return {
      id: s.id, side: 'ally', isShadow: true, name: s.name, sprite: e.sprite, data: e,
      hp, maxHp: hp, mp: 0, maxMp: 0,
      base: { atk: Math.round(e.atk * k), def: Math.round(e.def * k), mag: Math.round((e.mag || 0) * k), spd: e.spd, crit: e.crit || 0.05, eva: e.eva || 0 },
      mods: [], dots: [], alive: true, scale: e.battleScale || 1.5, alpha: 1, flash: 0, t: Math.random() * 5, ox: 0, oy: 0,
    };
  };

  // Place les combattants en colonnes décalées, sans chevauchement des noms
  // Limite basse du terrain : le haut du panneau de combat s'il recouvre l'écran (grand écran)
  B.measureBottom = function () {
    const st = $('stage').getBoundingClientRect(), ui = $('battle-ui').getBoundingClientRect();
    if (st.height && ui.top > st.top && ui.top < st.bottom) return (ui.top - st.top) / st.height * H - 12;
    return H - 20;
  };

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
        if (act.type === 'flee') {
          if (Math.random() < G.combat.fleeChance(allies(), enemies())) {
            this.float(u, 'Fuite !', '#cfe6ff');
            await U.wait(500);
            return 'flee';
          }
          this.float(u, 'Fuite ratée', '#ff9aa5');
          await U.wait(600);
        } else {
          await this.perform(u, act);
        }
        u.mods = u.mods.filter(m => --m.turns > 0);
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
      this.float(u, `-${d.dmg}`, '#ff6b6b', 20);
      d.turns--;
    }
    u.dots = u.dots.filter(d => d.turns > 0);
    u.flash = 0.6;
    if (u.hp <= 0) this.kill(u);
    this.renderParty();
    await U.wait(380);
  };

  // ───────────── Tour du joueur ─────────────
  B.playerTurn = async function (u) {
    const menu = $('battle-menu'), desc = $('battle-desc');
    for (;;) {
      const inv = G.inventory.list();
      const flee = Math.round(G.combat.fleeChance(allies(), enemies()) * 100);
      const cmd = await G.ui.menu(menu, [
        { label: 'Attaque', value: 'attack', desc: 'Attaque de base avec ton arme.' },
        { label: 'Compétences', value: 'skills', disabled: !u.skills.length, desc: u.skills.length ? 'Utiliser un pouvoir (coûte des PM).' : "Aucune compétence pour l'instant." },
        { label: 'Objets', value: 'items', disabled: !inv.length, desc: inv.length ? 'Utiliser un objet.' : 'Inventaire vide.' },
        { label: 'Défense', value: 'defend', desc: "Dégâts reçus ÷ 2 jusqu'à ton prochain tour. +3 PM." },
        { label: 'Fuite', value: 'flee', disabled: !!this.opts.noFlee, desc: this.opts.noFlee ? 'Impossible de fuir ce combat !' : `Chance de fuite : ${flee} %` },
      ], { title: `Tour de ${u.name}`, descEl: desc, cancel: false, columns: 2 });

      if (cmd === 'attack') {
        const t = await this.pickTarget(u, 'enemy');
        if (t) return { type: 'skill', skill: G.data.skills.attaque, targets: [t] };
      } else if (cmd === 'skills') {
        // « Retour » sur la cible ramène à la liste des compétences, puis au menu principal
        for (;;) {
          const sid = await G.ui.menu(menu, u.skills.map(id => {
            const s = G.data.skills[id], cost = s.cost || 0;
            return { label: s.name, sub: `${cost} PM`, value: id, disabled: cost > u.mp, desc: cost > u.mp ? `PM insuffisants. ${s.desc || ''}` : (s.desc || '') };
          }), { title: 'Compétences', descEl: desc, columns: 2, back: true });
          if (!sid) break;
          const sk = G.data.skills[sid];
          const targets = await this.chooseTargets(u, sk);
          if (targets) return { type: 'skill', skill: sk, targets };
        }
      } else if (cmd === 'items') {
        for (;;) {
          const iid = await G.ui.menu(menu, inv.map(([id, q]) => ({ label: G.data.items[id].name, sub: `× ${q}`, value: id, desc: G.data.items[id].desc })), { title: 'Objets', descEl: desc, columns: 2, back: true });
          if (!iid) break;
          const t = await this.pickTarget(u, 'ally');
          if (t) return { type: 'item', item: iid, targets: [t] };
        }
      } else if (cmd === 'defend') {
        return { type: 'defend' };
      } else if (cmd === 'flee') {
        return { type: 'flee' };
      }
    }
  };

  B.chooseTargets = async function (u, sk) {
    const foes = this.units.filter(x => x.alive && x.side !== u.side);
    const friends = this.units.filter(x => x.alive && x.side === u.side);
    switch (sk.target) {
      case 'enemies': return foes;
      case 'self': return [u];
      case 'allies': return friends;
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
      label: x.name, sub: `${x.hp}/${x.maxHp} PV`, value: i, desc: this.statusText(x) || (x.data && x.data.rank ? `Rang ${x.data.rank}` : ''),
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
    const pool = (e.skills || [['attaque', 1]]).filter(([id]) => this.usable(u, G.data.skills[id]));
    const sk = G.data.skills[U.weighted(pool.length ? pool : [['attaque', 1]])];
    return { type: 'skill', skill: sk, targets: this.autoTargets(u, sk) };
  };

  B.usable = function (u, sk) {
    if (!sk) return false;
    if (u.maxMp > 0 && (sk.cost || 0) > u.mp) return false;
    const mods = (sk.effects || []).filter(f => f.type === 'mod');
    if (mods.length && mods.length === sk.effects.length) {
      const pool = sk.target === 'self' ? [u]
        : sk.target === 'allies' || sk.target === 'ally' ? this.units.filter(x => x.alive && x.side === u.side)
        : this.units.filter(x => x.alive && x.side !== u.side);
      // inutile si tout le monde a déjà l'effet
      return pool.some(t => !t.mods.some(m => m.stat === mods[0].stat && (m.mult > 1) === (mods[0].mult > 1)));
    }
    return true;
  };

  B.autoTargets = function (u, sk) {
    const foes = this.units.filter(x => x.alive && x.side !== u.side);
    const friends = this.units.filter(x => x.alive && x.side === u.side);
    switch (sk.target) {
      case 'enemies': return foes;
      case 'self': return [u];
      case 'allies': return friends;
      case 'ally': return [friends.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]];
      default:
        if (u.isShadow) return [foes.slice().sort((a, b) => a.hp - b.hp)[0]];
        return [U.weighted(foes.map(f => [f, f.isPlayer ? 2 : 1]))];
    }
  };

  // ───────────── Actions ─────────────
  B.perform = async function (u, act) {
    if (act.type === 'defend') {
      u.defending = true;
      if (u.maxMp) u.mp = Math.min(u.maxMp, u.mp + 3);
      this.float(u, 'Défense', '#9ddcff');
      this.ring(u, '#3fb4ff');
      this.renderParty();
      await U.wait(500);
      return;
    }
    if (act.type === 'item') {
      const it = G.data.items[act.item], t = act.targets[0];
      G.inventory.remove(act.item);
      this.showSkillName(it.name, u);
      if (it.heal) {
        if (it.heal.hp) { const n = Math.min(t.maxHp - t.hp, it.heal.hp); t.hp += n; this.float(t, `+${n} PV`, '#4ade80'); }
        if (it.heal.mp && t.maxMp) { const n = Math.min(t.maxMp - t.mp, it.heal.mp); t.mp += n; this.float(t, `+${n} PM`, '#7fb2ff'); }
      }
      this.burst(t, '#4ade80', 14);
      this.renderParty();
      await U.wait(650);
      return;
    }
    await this.useSkill(u, act.skill, act.targets);
  };

  B.useSkill = async function (u, sk, targets) {
    targets = (targets || []).filter(t => t && t.alive);
    if (!targets.length) targets = this.autoTargets(u, sk).filter(Boolean);
    if (!targets.length) return;
    if (sk.cost) u.mp = Math.max(0, u.mp - sk.cost);
    this.renderParty();
    if (sk.id !== 'attaque') this.showSkillName(sk.name, u);
    const anim = sk.anim || 'melee', first = targets[0];
    const melee = anim === 'melee' && first !== u;
    if (melee) await this.lunge(u, first);
    else if (anim === 'cast') await this.cast(u, sk.color);
    else if (anim === 'ranged') await this.projectile(u, first, sk.color);

    for (const eff of sk.effects || []) {
      if (eff.type === 'damage') {
        const hits = eff.hits || 1;
        for (let k = 0; k < hits; k++) {
          for (const t of targets) {
            if (!t.alive) continue;
            const r = G.combat.hit(u, t, eff);
            this.applyHit(t, r, sk.color);
            if (!r.miss && eff.bleed && t.alive && Math.random() < eff.bleed.chance) {
              t.dots.push({ dmg: eff.bleed.dmg, turns: eff.bleed.turns });
              this.float(t, 'Saignement', '#ff6b6b', 16);
            }
          }
          if (k < hits - 1) { if (melee) await this.jab(u); else await U.wait(200); }
        }
      } else if (eff.type === 'heal') {
        for (const t of targets) {
          const n = Math.min(t.maxHp - t.hp, G.combat.healAmount(u, eff));
          t.hp += n;
          this.float(t, `+${n}`, '#4ade80');
          this.burst(t, '#4ade80', 14);
        }
      } else if (eff.type === 'mod') {
        for (const t of targets) {
          if (!t.alive) continue;
          const up = eff.mult > 1;
          t.mods = t.mods.filter(m => m.stat !== eff.stat || (m.mult > 1) !== up);
          t.mods.push({ stat: eff.stat, mult: eff.mult, turns: eff.turns || 3 });
          this.float(t, `${STAT_SHORT[eff.stat] || eff.stat} ${up ? '▲' : '▼'}`, up ? '#ffb86b' : '#b69cff', 18);
          this.burst(t, sk.color || (up ? '#ffb86b' : '#b69cff'), 8);
        }
      }
      await U.wait(150);
    }
    this.renderParty();
    if (melee) await this.retreat(u);
    await U.wait(280);
  };

  B.applyHit = function (t, r, color) {
    if (r.miss) { this.float(t, 'Esquive', '#9fb3c8', 18); return; }
    t.hp = Math.max(0, t.hp - r.dmg);
    t.flash = 1;
    this.float(t, String(r.dmg), r.crit ? '#ffd166' : '#ffffff', r.crit ? 34 : 26, r.crit ? 'CRITIQUE' : null);
    this.burst(t, color || '#ffffff', r.crit ? 22 : 12);
    this.knock(t);
    if (r.crit || r.dmg > t.maxHp * 0.3) G.fx.shake(r.crit ? 260 : 160);
    if (t.hp <= 0) this.kill(t);
    this.renderParty();
  };

  B.kill = function (t) {
    t.alive = false;
    t.hp = 0;
    this.burst(t, t.side === 'enemy' ? '#2a1f45' : '#3fb4ff', 26);
    U.tween(t, { alpha: t.isPlayer ? 0.35 : 0 }, 700);
  };

  // ───────────── Fin du combat ─────────────
  B.finish = async function (result) {
    const hero = this.units.find(u => u.isPlayer), h = G.state.hunter;
    h.hp = Math.round(hero.hp);
    h.mp = Math.round(hero.mp);
    if (result === 'lose' && this.opts.allowDefeat) h.hp = 1;
    if (result !== 'win') { G.hunter.clamp(); return result; }
    h.hp = Math.max(1, h.hp);

    const dead = enemies();
    const xp = dead.reduce((s, u) => s + (u.data.xp || 0), 0);
    const gold = dead.reduce((s, u) => s + (u.data.gold || 0), 0);
    const drops = {};
    for (const u of dead) {
      for (const [id, ch] of u.data.drops || []) {
        if (Math.random() < ch) { drops[id] = (drops[id] || 0) + 1; G.inventory.add(id); }
      }
    }
    G.state.gold += gold;
    G.quests.track('kill', dead.length);

    const awake = !!G.state.flags.eveil;
    const lines = [];
    if (awake) lines.push(`+${xp} EXP`);
    else lines.push("Aucune expérience : le corps d'un rang E n'évolue plus.");
    if (gold) lines.push(`+${gold} or`);
    for (const id in drops) lines.push(`${G.data.items[id].name} × ${drops[id]}`);
    await G.ui.system(lines.join('\n'), awake ? 'Victoire' : 'Tu as survécu');
    if (awake) G.hunter.gainXp(xp);
    if (h.skills.includes('extraction')) await this.extraction(dead);
    G.hunter.clamp();
    return 'win';
  };

  // « Lève-toi. » — transforme un ennemi vaincu en soldat de l'ombre
  B.extraction = async function (dead) {
    const cands = dead.filter(u => u.data.extractable);
    if (!cands.length) return;
    const v = await G.ui.choice("Des cadavres gisent au sol.\nTenter une extraction d'ombre ?", [...cands.map(u => u.name), 'Ne rien faire'], 'Extraction');
    if (v == null || v >= cands.length) return;
    const t = cands[v];
    this.showSkillName('Lève-toi.', this.units.find(u => u.isPlayer));
    t.alpha = 0.7;
    this.ring(t, '#8b5cf6');
    this.burst(t, '#8b5cf6', 30);
    await U.wait(800);
    if (Math.random() < (t.data.extractChance || 0.5)) {
      G.fx.flash('#8b5cf6', 0.6);
      G.state.shadows.push({ id: `ombre_${Date.now()}`, base: t.eid, name: t.data.shadowName || t.data.name });
      await G.ui.system(`Extraction réussie.\n${t.data.name} rejoint l'armée des ombres.`, 'Extraction');
    } else {
      await G.ui.system("L'extraction a échoué. L'ombre s'est dissipée.", 'Extraction', true);
    }
  };

  // ───────────── Animations ─────────────
  B.lunge = function (u, t) {
    const s = Math.sign(t.x - u.x) || 1;
    return U.tween(u, { x: t.x - s * (40 + unitH(t) * 0.25), y: t.y + 2 }, 220, 'inQuad');
  };
  B.retreat = function (u) { return U.tween(u, { x: u.homeX, y: u.homeY }, 260); };
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
  B.cast = async function (u, color) {
    this.ring(u, color || '#9ddcff');
    u.flash = 0.6;
    await U.wait(420);
  };
  B.projectile = async function (u, t, color) {
    const p = { kind: 'proj', x: u.x, y: u.y - unitH(u) * 0.5, color: color || '#ffffff' };
    this.fx.push(p);
    await U.tween(p, { x: t.x, y: t.y - unitH(t) * 0.5 }, 260, 'linear');
    p.dead = true;
  };
  B.burst = function (t, color, n) {
    const cy = t.y - unitH(t) * 0.45;
    for (let i = 0; i < n; i++) {
      this.fx.push({ kind: 'spark', x: t.x + U.rand(-10, 10), y: cy + U.rand(-10, 10), vx: U.rand(-170, 170), vy: U.rand(-220, 40), life: U.rand(0.35, 0.75), age: 0, color, r: U.rand(1.5, 3.5) });
    }
  };
  B.ring = function (u, color) { this.fx.push({ kind: 'ring', x: u.x, y: u.y - 6, life: 0.65, age: 0, color }); };
  B.float = function (t, text, color, size = 22, label = null) {
    const n = this.texts.filter(x => x.unit === t && x.age < 0.5).length;
    this.texts.push({ unit: t, x: t.x + U.rand(-8, 8), y: t.y - unitH(t) - 8 - n * 24, text, color, size, label, age: 0, life: 1.15 });
  };
  B.showSkillName = function (text, u) { this.skillName = { text, side: u ? u.side : 'ally', age: 0 }; };
  B.showBanner = async function (text, top) {
    this.banner = { text, top, a: 0 };
    await U.tween(this.banner, { a: 1 }, 220);
    await U.wait(850);
    await U.tween(this.banner, { a: 0 }, 220);
    this.banner = null;
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
    for (const m of u.mods) parts.push(`${STAT_SHORT[m.stat] || m.stat} ${m.mult > 1 ? '▲' : '▼'} (${m.turns})`);
    if (u.dots.length) parts.push('Saignement');
    return parts.join(' · ');
  };

  B.renderParty = function () {
    const pct = (a, b) => Math.round(100 * U.clamp(a / Math.max(1, b), 0, 1));
    $('party-status').innerHTML = allies().map(u => `
      <div class="pm-row ${u === this.turnUnit ? 'active' : ''} ${u.alive ? '' : 'ko'} ${u.isPlayer ? '' : 'compact'}">
        <div class="pm-name">${esc(u.name)}<small>${u.isPlayer ? (G.state.flags.eveil ? `Niv. ${G.state.hunter.level}` : 'Rang E') : esc(this.statusText(u) || 'Ombre')}</small></div>
        <div class="pm-bars">
          <div><span>PV ${Math.round(u.hp)}/${u.maxHp}</span><div class="bar hp"><i style="width:${pct(u.hp, u.maxHp)}%"></i></div></div>
          ${u.maxMp ? `<div><span>PM ${Math.round(u.mp)}/${u.maxMp}</span><div class="bar mp"><i style="width:${pct(u.mp, u.maxMp)}%"></i></div></div>` : ''}
        </div>
        ${u.isPlayer ? `<div class="pm-status">${esc(this.statusText(u))}</div>` : ''}
      </div>`).join('');
  };

  // ───────────── Mise à jour & rendu canvas ─────────────
  B.update = function (dt) {
    for (const u of this.units) {
      u.t += dt;
      if (u.flash > 0) u.flash = Math.max(0, u.flash - dt * 4);
    }
    for (const p of this.fx) {
      if (p.life != null) p.age += dt;
      if (p.kind === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; }
    }
    this.fx = this.fx.filter(p => !p.dead && (p.life == null || p.age < p.life));
    for (const t of this.texts) { t.age += dt; t.y -= 26 * dt; }
    this.texts = this.texts.filter(t => t.age < t.life);
    if (this.skillName) { this.skillName.age += dt; if (this.skillName.age > 1.4) this.skillName = null; }
  };

  B.render = function (ctx) {
    ctx.fillStyle = `rgba(3,7,18,${this.dim})`;
    ctx.fillRect(0, 0, W, H);
    const k = this.dim / DIM;

    // grille du Système
    if (k > 0.05) {
      ctx.save();
      ctx.strokeStyle = `rgba(63,180,255,${0.07 * k})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = (W % 48) / 2; x < W; x += 48) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (let y = 0; y < H; y += 48) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();
      ctx.restore();
    }

    // cercles au sol
    for (const u of this.units) {
      if (u.alpha < 0.05) continue;
      const rgb = u.side === 'ally' ? (u.isShadow ? '155,123,255' : '63,180,255') : '255,77,94';
      const active = u === this.turnUnit && u.alive;
      const rw = Math.max(28, unitH(u) * 0.36);
      ctx.save();
      ctx.globalAlpha = u.alpha * (active ? 0.6 + 0.4 * Math.sin(G.time * 6) : 0.35);
      ctx.strokeStyle = `rgb(${rgb})`;
      ctx.lineWidth = active ? 2 : 1.2;
      ctx.beginPath(); ctx.ellipse(u.x, u.y - 2, rw, rw * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    const sorted = this.units.slice().sort((a, b) => a.y - b.y);
    for (const u of sorted) {
      if (u.alpha < 0.02) continue;
      G.assets.draw(ctx, u.sprite, u.x + u.ox, u.y + u.oy, {
        scale: u.scale, dir: u.side === 'ally' ? 'right' : 'left', t: u.t, alpha: u.alpha,
        flash: u.flash, shadow: u.isShadow, glow: u.isPlayer && !!G.state.flags.eveil,
      });
    }

    // barres de vie des ennemis
    ctx.save();
    ctx.textAlign = 'center';
    for (const u of enemies()) {
      if (!u.alive || u.alpha < 0.5) continue;
      const w = u.data.boss ? 140 : 76, x = u.x - w / 2, y = u.y - unitH(u) - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 1, y - 1, w + 2, 7);
      ctx.fillStyle = '#e5484d'; ctx.fillRect(x, y, w * U.clamp(u.hp / u.maxHp, 0, 1), 5);
      ctx.font = '600 12px "Chakra Petch", sans-serif';
      ctx.fillStyle = '#e6f2ff';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText(u.name, u.x, y - 6);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // curseur de ciblage
    if (this.cursor && this.cursor.alive) {
      const u = this.cursor, h = unitH(u), w = Math.max(56, h * 0.75), top = u.y - h - 6, bob = Math.sin(G.time * 8) * 3;
      ctx.save();
      ctx.strokeStyle = '#9ddcff'; ctx.lineWidth = 2; ctx.shadowColor = '#3fb4ff'; ctx.shadowBlur = 10;
      const c = 10, l = u.x - w / 2, r = u.x + w / 2, b = u.y + 6;
      ctx.beginPath();
      ctx.moveTo(l, top + c); ctx.lineTo(l, top); ctx.lineTo(l + c, top);
      ctx.moveTo(r - c, top); ctx.lineTo(r, top); ctx.lineTo(r, top + c);
      ctx.moveTo(l, b - c); ctx.lineTo(l, b); ctx.lineTo(l + c, b);
      ctx.moveTo(r - c, b); ctx.lineTo(r, b); ctx.lineTo(r, b - c);
      ctx.stroke();
      ctx.fillStyle = '#9ddcff';
      ctx.beginPath(); ctx.moveTo(u.x - 8, top - 28 + bob); ctx.lineTo(u.x + 8, top - 28 + bob); ctx.lineTo(u.x, top - 18 + bob); ctx.fill();
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
      } else if (p.kind === 'ring') {
        const q = p.age / p.life;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - q;
        ctx.strokeStyle = p.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 16 + q * 80, (16 + q * 80) * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'proj') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1;
        ctx.shadowColor = p.color; ctx.shadowBlur = 14;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
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
      ctx.font = `700 ${Math.round(t.size * pop)}px "Chakra Petch", sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      if (t.label) {
        ctx.font = '700 12px "Chakra Petch", sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeText(t.label, t.x, t.y - t.size * 0.8);
        ctx.fillText(t.label, t.x, t.y - t.size * 0.8);
      }
    }
    ctx.restore();

    // nom de la compétence
    if (this.skillName) {
      const s = this.skillName, a = Math.min(1, s.age * 6) * (1 - Math.max(0, (s.age - 1.1) / 0.3));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = '600 18px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = `[ ${s.text} ]`, w = ctx.measureText(label).width + 40;
      const enemy = s.side === 'enemy';
      ctx.fillStyle = 'rgba(6,16,34,0.88)';
      ctx.fillRect(W / 2 - w / 2, 22, w, 34);
      ctx.strokeStyle = enemy ? '#ff4d5e' : '#3fb4ff';
      ctx.strokeRect(W / 2 - w / 2 + 0.5, 22.5, w - 1, 33);
      ctx.fillStyle = enemy ? '#ffc2c8' : '#cfeaff';
      ctx.fillText(label, W / 2, 40);
      ctx.restore();
    }

    // bannière d'entrée en combat
    if (this.banner) {
      const b = this.banner;
      ctx.save();
      ctx.globalAlpha = b.a;
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(2,6,16,0)'); g.addColorStop(0.2, 'rgba(2,6,16,0.88)'); g.addColorStop(0.8, 'rgba(2,6,16,0.88)'); g.addColorStop(1, 'rgba(2,6,16,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, H / 2 - 54, W, 108);
      const boss = b.top === 'Boss';
      ctx.fillStyle = boss ? '#ff4d5e' : '#3fb4ff';
      ctx.fillRect(W * 0.2, H / 2 - 54, W * 0.6, 1);
      ctx.fillRect(W * 0.2, H / 2 + 53, W * 0.6, 1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 13px "Chakra Petch", sans-serif';
      ctx.fillStyle = boss ? '#ffb3bb' : '#9ddcff';
      ctx.fillText(`[ ${b.top.toUpperCase()} ]`, W / 2, H / 2 - 22);
      ctx.font = '700 34px "Chakra Petch", sans-serif';
      ctx.fillStyle = '#f2f8ff';
      ctx.shadowColor = boss ? '#ff4d5e' : '#3fb4ff'; ctx.shadowBlur = 16;
      ctx.fillText(b.text.toUpperCase(), W / 2, H / 2 + 12);
      ctx.restore();
    }
  };

  G.battle = B;
})();
