/* Moteur d'événements : joue les listes d'étapes de story.js. */
(function () {
  const ABORT = { abort: true };

  G.events = {
    ABORT,

    async run(steps) {
      if (typeof steps === 'string') steps = G.data.story.events[steps] || [];
      G.lock++;
      try {
        await this.seq(steps);
      } catch (e) {
        if (e !== ABORT) console.error(e);
      } finally {
        G.lock = Math.max(0, G.lock - 1);
        G.ui.hideDialogue();
      }
    },

    async seq(steps) {
      for (let i = 0; i < steps.length; i++) {
        await this.step(steps[i]);
        const next = steps[i + 1];
        if (!next || (next.say === undefined && next.narrate === undefined)) G.ui.hideDialogue();
      }
    },

    test(cond) {
      if (typeof cond === 'function') return !!cond(G);
      if (cond.startsWith('!')) return !G.state.flags[cond.slice(1)];
      return !!G.state.flags[cond];
    },

    async step(st) {
      const U = G.U, h = G.state.hunter;
      if (st.say !== undefined) return G.ui.say({ name: G.fmt(st.say), text: st.text, portrait: st.portrait });
      if (st.narrate !== undefined) return G.ui.say({ text: st.narrate, narration: true });
      if (st.system !== undefined) return G.ui.system(G.fmt(st.system), st.title, st.alert);
      if (st.choice !== undefined) {
        const i = await G.ui.choice(G.fmt(st.choice), st.options.map(o => o.label), st.title);
        const opt = st.options[i];
        if (opt && opt.steps) await this.seq(opt.steps);
        return;
      }
      if (st.notify !== undefined) { G.ui.notify(G.fmt(st.notify), st.kind || 'hint'); return; }
      if (st.battle) {
        const fromEnt = st.from ? G.scenes.overworld.findEnt(st.from) : null;
        const res = await G.battle.start({ enemies: st.battle, noFlee: st.noFlee, allowDefeat: st.allowDefeat, intro: st.intro, fromEnt });
        if (res === 'lose' && !st.allowDefeat) { G.gameOver(); throw ABORT; }
        return;
      }
      if (st.learn) { G.hunter.learn(st.learn); return U.wait(300); }
      if (st.give) {
        G.inventory.add(st.give, st.qty || 1);
        G.ui.notify(`${G.data.items[st.give].name} × ${st.qty || 1}`, 'hint', 'Objet obtenu');
        return;
      }
      if (st.gold !== undefined) { G.state.gold += st.gold; G.ui.notify(`+${st.gold} or`, 'hint'); return; }
      if (st.xp !== undefined) { G.hunter.gainXp(st.xp); return; }
      if (st.stats !== undefined) { h.points += st.stats; G.ui.notify(`+${st.stats} points de statistiques`, 'level'); return; }
      if (st.quest) { G.quests.start(st.quest); return; }
      if (st.flag) { G.state.flags[st.flag] = true; G.quests.checkFlags(); return; }
      if (st.unflag) { delete G.state.flags[st.unflag]; return; }
      if (st.if !== undefined) { await this.seq(this.test(st.if) ? (st.then || []) : (st.else || [])); return; }
      if (st.call) { await this.seq(G.data.story.events[st.call] || []); return; }
      if (st.heal !== undefined) { const d = G.hunter.derived(h); h.hp = d.maxHp; h.mp = d.maxMp; return; }
      if (st.hunter) { Object.assign(h, st.hunter); return; }
      if (st.chapter !== undefined) {
        G.state.chapter = st.chapter;
        const c = G.data.story.chapters[st.chapter];
        if (c) await G.ui.banner(c.top, c.main);
        return;
      }
      if (st.teleport) { const t = st.teleport; G.scenes.overworld.load(t.map, t.x, t.y, t.dir); return; }
      if (st.fade) return G.ui.fade(st.fade === 'out' ? 1 : 0, st.ms);
      if (st.shake) { G.fx.shake(st.shake); return U.wait(Math.min(st.shake, 400)); }
      if (st.flash) { G.fx.flash(st.flash); return U.wait(250); }
      if (st.wait) return U.wait(st.wait);
      if (st.save) { G.save.write(); return; }
      if (st.end) return G.ui.endChapter(st.end);
      if (st.fn) return st.fn(G);
      console.warn('[events] étape inconnue :', st);
    },
  };
})();
