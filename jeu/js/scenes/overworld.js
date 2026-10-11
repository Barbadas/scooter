/* Exploration vue de dessus : déplacement case par case, monstres visibles,
   interactions, portails, éclairage du donjon. */
(function () {
  const U = G.U;
  const T = G.config.TILE;
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const BASE_TILES = { '#': 'mur', '.': 'sol', ',': 'sol2', '~': 'vide', '=': 'temple' };
  const SOLID_TILES = { mur: true, vide: true };

  const OW = {
    map: null, mapId: null, mapName: '', data: null, ents: [], player: null,
    cam: { x: 0, y: 0 }, tileCanvas: null, lightCanvas: null,
    pendingEnter: null, busy: false, lastEncounter: null,
  };

  // ───────────── Chargement ─────────────
  OW.load = function (mapId, x, y, dir) {
    const data = G.data.maps[mapId];
    if (!data) { console.error('[carte] inconnue :', mapId); return; }
    const parsed = parse(data, mapId);
    this.mapId = mapId;
    this.data = data;
    this.mapName = data.name;
    this.map = parsed.map;
    this.ents = parsed.ents;
    const sx = x != null ? x : parsed.start.x, sy = y != null ? y : parsed.start.y;
    this.player = { x: sx, y: sy, px: sx * T, py: sy * T, fx: sx, fy: sy, tx: sx, ty: sy, dir: dir || 'down', moving: false, t: 0, anim: 0 };
    this.pendingEnter = data.onEnter && !G.state.flags['visite_' + mapId] ? data.onEnter : null;
    this.prerender();
    this.updateCamera();
    this.storePos();
  };

  function parse(data, mapId) {
    const rows = data.rows, h = rows.length, w = Math.max(...rows.map(r => r.length));
    const tiles = [], ents = [];
    let start = { x: 1, y: 1 };
    for (let y = 0; y < h; y++) {
      tiles.push([]);
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x] || '#';
        if (BASE_TILES[ch]) { tiles[y].push(BASE_TILES[ch]); continue; }
        if (ch === 'P') { start = { x, y }; tiles[y].push(inferTile(rows, x, y)); continue; }
        const spec = data.legend && data.legend[ch];
        if (!spec) { console.warn(`[carte] caractère inconnu « ${ch} » en ${x},${y}`); tiles[y].push('sol'); continue; }
        tiles[y].push(spec.tile || inferTile(rows, x, y));
        ents.push(makeEnt(spec, ch, x, y, mapId));
      }
    }
    const map = {
      w, h, tiles,
      tileAt(tx, ty) { return tx < 0 || ty < 0 || tx >= w || ty >= h ? 'mur' : tiles[ty][tx]; },
    };
    return { map, ents, start };
  }

  // Sol sous une entité = sol le plus fréquent autour d'elle
  function inferTile(rows, x, y) {
    const count = {};
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const t = BASE_TILES[(rows[y + dy] || '')[x + dx]];
      if (t && !SOLID_TILES[t]) count[t] = (count[t] || 0) + 1;
    }
    let best = 'sol', n = 0;
    for (const k in count) if (count[k] > n) { best = k; n = count[k]; }
    return best === 'sol2' ? 'sol' : best;
  }

  function makeEnt(spec, ch, x, y, mapId) {
    const e = Object.assign({}, spec);
    e.id = spec.id || `${ch}_${x}_${y}`;
    e.key = `${mapId}:${e.id}`;
    e.x = x; e.y = y; e.tx = x; e.ty = y; e.homeX = x; e.homeY = y;
    e.px = x * T; e.py = y * T;
    e.dir = spec.dir || (spec.kind === 'enemy' ? 'left' : 'down');
    e.faceX = 'left';
    e.t = Math.random() * 10;
    e.moving = false; e.mt = 0; e.cool = U.rand(0.5, 2); e.stun = 0;
    if (e.kind === 'enemy') {
      if (!e.sprite) e.sprite = G.data.enemies[e.group[0]].sprite;
      e.solid = true;
    }
    if (e.kind === 'chest' || e.kind === 'npc') e.solid = true;
    return e;
  }

  OW.prerender = function () {
    const c = document.createElement('canvas');
    c.width = this.map.w * T;
    c.height = this.map.h * T;
    const ctx = c.getContext('2d');
    for (let y = 0; y < this.map.h; y++) {
      for (let x = 0; x < this.map.w; x++) G.assets.drawTile(ctx, this.map.tiles[y][x], x * T, y * T, x, y, this.map);
    }
    this.tileCanvas = c;
  };

  // ───────────── Requêtes ─────────────
  OW.visible = function (e) {
    const f = G.state.flags;
    if (e.dead) return false;
    if (e.hiddenIf && f[e.hiddenIf]) return false;
    if (e.showIf && !f[e.showIf]) return false;
    if (G.state.removed[e.key]) return false;
    return true;
  };
  OW.findEnt = function (id) { return this.ents.find(e => e.id === id) || null; };
  OW.occupies = (e, x, y) => (e.x === x && e.y === y) || (e.moving && e.tx === x && e.ty === y);
  OW.blocked = function (x, y, self) {
    if (SOLID_TILES[this.map.tileAt(x, y)]) return true;
    return this.ents.some(e => e !== self && e.solid && this.visible(e) && this.occupies(e, x, y));
  };
  OW.canControl = function () {
    return G.scene === this && !!this.map && G.input.free() && G.lock === 0 && !G.battle.active && !this.busy;
  };
  OW.storePos = function () {
    if (!this.player || !G.state) return;
    const p = this.player;
    G.state.pos = { map: this.mapId, x: p.moving ? p.fx : p.x, y: p.moving ? p.fy : p.y, dir: p.dir };
  };
  OW.screenPos = function (e) {
    return { x: e.px + T / 2 - this.cam.x, y: e.py + T - 4 - this.cam.y };
  };

  // ───────────── Mise à jour ─────────────
  OW.update = function (dt) {
    if (!this.map) return;
    const p = this.player;
    for (const e of this.ents) e.t += dt;
    p.anim += dt;

    if (this.canControl()) {
      if (this.pendingEnter) {
        const ev = this.pendingEnter;
        this.pendingEnter = null;
        G.state.flags['visite_' + this.mapId] = true;
        G.events.run(ev);
        return;
      }
      if (G.quests.pending.length) {
        G.events.run(G.quests.rewardSteps(G.quests.pending.shift()));
        return;
      }
    }

    if (p.moving) {
      p.t += dt * 1000 / G.config.STEP_MS;
      if (p.t >= 1) {
        const carry = p.t - 1;
        p.x = p.tx; p.y = p.ty; p.moving = false; p.t = 0;
        this.onStep();
        if (this.canControl()) {
          const d = G.input.dir();
          if (d) { this.tryMove(d); if (p.moving) p.t = carry; }
        }
      }
    } else if (this.canControl()) {
      const d = G.input.dir();
      if (d) this.tryMove(d);
    }
    if (p.moving) {
      p.px = U.lerp(p.fx, p.tx, p.t) * T;
      p.py = U.lerp(p.fy, p.ty, p.t) * T;
    } else {
      p.px = p.x * T; p.py = p.y * T;
    }

    if (!G.battle.active) this.updateEnemies(dt, this.canControl());
    this.updateCamera();
  };

  OW.tryMove = function (d) {
    const p = this.player;
    p.dir = d;
    const [dx, dy] = DIRV[d];
    const nx = p.x + dx, ny = p.y + dy;
    const foe = this.ents.find(e => e.kind === 'enemy' && this.visible(e) && this.occupies(e, nx, ny));
    if (foe) { this.encounter(foe); return; }
    if (this.blocked(nx, ny)) return;
    p.fx = p.x; p.fy = p.y; p.tx = nx; p.ty = ny;
    p.moving = true; p.t = 0;
  };

  OW.onStep = function () {
    const p = this.player;
    G.state.steps = (G.state.steps || 0) + 1;
    if (G.state.flags.eveil) G.quests.track('step');
    if (G.state.steps % G.config.REGEN_EVERY_STEPS === 0) G.hunter.heal(1, 1);
    this.storePos();
    const here = this.ents.find(e => e.x === p.x && e.y === p.y && this.visible(e) && (e.kind === 'trigger' || e.kind === 'portal'));
    if (here) { this.activate(here); return; }
    this.checkContact();
  };

  OW.checkContact = function () {
    const p = this.player;
    for (const e of this.ents) {
      if (e.kind !== 'enemy' || !this.visible(e) || e.stun > 0 || e.moving) continue;
      if (Math.abs(e.x - p.x) + Math.abs(e.y - p.y) <= 1) { this.encounter(e); return true; }
    }
    return false;
  };

  OW.activate = function (e) {
    if (e.kind === 'trigger') {
      const k = 'trig_' + e.key;
      if (e.once && G.state.flags[k]) return;
      if (e.once) G.state.flags[k] = true;
      if (e.event) G.events.run(e.event);
      return;
    }
    if (e.kind === 'portal') {
      if (e.event) G.events.run(e.event);
      else if (e.to) G.events.run([{ fade: 'out' }, { teleport: e.to }, { fade: 'in' }]);
    }
  };

  OW.facing = function () {
    const p = this.player, [dx, dy] = DIRV[p.dir];
    return this.ents.find(e => e.x === p.x + dx && e.y === p.y + dy && this.visible(e) && e.kind !== 'trigger') || null;
  };

  OW.interact = function () {
    if (!this.canControl() || this.player.moving) return;
    const e = this.facing();
    if (!e) return;
    if (e.kind === 'enemy') return this.encounter(e);
    if (e.kind === 'chest') return this.openChest(e);
    if (e.kind === 'npc') e.dir = OPPOSITE[this.player.dir];
    if (e.event) return G.events.run(e.event);
    if (e.examine) return G.events.run([{ narrate: e.examine }]);
  };

  OW.openChest = function (e) {
    if (G.state.opened[e.key]) return G.events.run([{ narrate: 'Le coffre est vide.' }]);
    G.state.opened[e.key] = true;
    G.inventory.add(e.item, e.qty || 1);
    G.ui.notify(`${G.data.items[e.item].name} × ${e.qty || 1}`, 'hint', 'Coffre ouvert');
  };

  // Contact avec un monstre → combat (ou événement de boss)
  OW.encounter = async function (e) {
    if (this.busy) return;
    this.busy = true;
    G.lock++;
    const p = this.player;
    if (Math.abs(e.x - p.x) + Math.abs(e.y - p.y) === 1) {
      p.dir = e.x > p.x ? 'right' : e.x < p.x ? 'left' : e.y > p.y ? 'down' : 'up';
      e.dir = OPPOSITE[p.dir];
    }
    this.lastEncounter = e;
    let res = null;
    try {
      if (e.event) {
        await G.events.run(e.event);
      } else {
        res = await G.battle.start({ enemies: e.group, fromEnt: e, noFlee: e.noFlee });
        if (res === 'win') {
          e.dead = true;
          if (e.unique) G.state.removed[e.key] = true;
          G.save.write();
        } else if (res === 'flee') {
          e.stun = 2.5;
        }
      }
    } finally {
      this.lastEncounter = null;
      G.lock = Math.max(0, G.lock - 1);
      this.busy = false;
    }
    if (res === 'lose') G.gameOver();
  };

  OW.updateEnemies = function (dt, think) {
    const p = this.player;
    for (const e of this.ents) {
      if (e.kind !== 'enemy' || !this.visible(e)) continue;
      if (e.stun > 0) e.stun -= dt;
      if (e.moving) {
        e.mt += dt * 1000 / (G.config.ENEMY_STEP_MS * (e.chasing ? 0.85 : 1));
        if (e.mt >= 1) {
          e.x = e.tx; e.y = e.ty; e.moving = false; e.mt = 0;
          e.px = e.x * T; e.py = e.y * T;
          if (think && !p.moving && e.stun <= 0 && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) <= 1) { this.encounter(e); return; }
        } else {
          e.px = U.lerp(e.x, e.tx, e.mt) * T;
          e.py = U.lerp(e.y, e.ty, e.mt) * T;
        }
        continue;
      }
      if (!think || (!e.wander && !e.chase)) continue;
      e.cool -= dt;
      if (e.cool > 0) continue;
      const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
      let dir = null;
      e.chasing = e.stun <= 0 && dist <= (e.chase || 0);
      if (e.chasing) {
        const dx = p.x - e.x, dy = p.y - e.y;
        const h = dx > 0 ? 'right' : dx < 0 ? 'left' : null;
        const v = dy > 0 ? 'down' : dy < 0 ? 'up' : null;
        const order = Math.abs(dx) > Math.abs(dy) ? [h, v] : [v, h];
        dir = order.find(d => d && this.canEnemyMove(e, d)) || null;
        e.cool = 0.05;
      } else {
        e.cool = U.rand(0.8, 2.2);
        if (Math.random() < 0.65) {
          const d = U.pick(['up', 'down', 'left', 'right']);
          const [dx, dy] = DIRV[d];
          if (Math.abs(e.x + dx - e.homeX) + Math.abs(e.y + dy - e.homeY) <= (e.wander || 0) && this.canEnemyMove(e, d)) dir = d;
        }
      }
      if (dir) {
        const [dx, dy] = DIRV[dir];
        e.tx = e.x + dx; e.ty = e.y + dy;
        e.moving = true; e.mt = 0; e.dir = dir;
        if (dir === 'left' || dir === 'right') e.faceX = dir;
      }
    }
  };

  OW.canEnemyMove = function (e, d) {
    const [dx, dy] = DIRV[d];
    const nx = e.x + dx, ny = e.y + dy, p = this.player;
    if ((p.x === nx && p.y === ny) || (p.moving && p.tx === nx && p.ty === ny)) return false;
    if (this.blocked(nx, ny, e)) return false;
    return !this.ents.some(o => o !== e && o.x === nx && o.y === ny && this.visible(o) && (o.kind === 'portal' || o.kind === 'trigger'));
  };

  OW.updateCamera = function () {
    const W = G.config.WIDTH, H = G.config.HEIGHT, p = this.player;
    const mw = this.map.w * T, mh = this.map.h * T;
    const cx = p.px + T / 2 - W / 2, cy = p.py + T / 2 - H / 2;
    this.cam.x = mw <= W ? (mw - W) / 2 : U.clamp(cx, 0, mw - W);
    this.cam.y = mh <= H ? (mh - H) / 2 : U.clamp(cy, 0, mh - H);
  };

  // ───────────── Rendu ─────────────
  OW.render = function (ctx) {
    const W = G.config.WIDTH, H = G.config.HEIGHT;
    ctx.fillStyle = '#020307';
    ctx.fillRect(0, 0, W, H);
    if (!this.map) return;
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    const sx = Math.max(0, cx), sy = Math.max(0, cy), dx = sx - cx, dy = sy - cy;
    const sw = Math.min(this.tileCanvas.width - sx, W - dx), sh = Math.min(this.tileCanvas.height - sy, H - dy);
    if (sw > 0 && sh > 0) ctx.drawImage(this.tileCanvas, sx, sy, sw, sh, dx, dy, sw, sh);

    const p = this.player, inBattle = G.battle.active;
    const list = this.ents.filter(e => e.kind !== 'trigger' && this.visible(e) && !(inBattle && G.battle.hideEnt === e));
    if (!inBattle) list.push(p);
    list.sort((a, b) => (a.py + (a.kind === 'portal' ? -T : 0)) - (b.py + (b.kind === 'portal' ? -T : 0)));

    for (const e of list) {
      const x = e.px + T / 2 - cx, y = e.py + T - 4 - cy;
      if (x < -150 || x > W + 150 || y < -60 || y > H + 200) continue;
      if (e === p) {
        G.assets.draw(ctx, 'heros', x, y, { dir: p.dir, t: p.anim, moving: p.moving, glow: !!G.state.flags.eveil });
        continue;
      }
      const sprite = e.kind === 'chest' && G.state.opened[e.key] ? 'coffre_ouvert' : e.sprite;
      const alpha = e.stun > 0 ? 0.5 + 0.3 * Math.sin(e.t * 20) : 1;
      G.assets.draw(ctx, sprite, x, e.kind === 'portal' ? y + 2 : y, { dir: e.dir, t: e.t, moving: e.moving, faceX: e.faceX, alpha });
      if (e.kind === 'enemy' && e.chasing && e.stun <= 0) this.drawMark(ctx, x, y - (G.assets.manifest[sprite]?.size || 1) * T - 6, '!', '#ff4d5e');
    }

    if (this.data.darkness) this.renderLights(ctx, cx, cy, this.data.darkness);

    // indice d'interaction
    if (this.canControl() && !p.moving) {
      const f = this.facing();
      if (f && (f.event || f.examine || f.kind === 'chest' || f.kind === 'npc')) {
        const size = (G.assets.manifest[f.sprite]?.size || 1) * T;
        this.drawMark(ctx, f.px + T / 2 - cx, f.py + T - 4 - cy - size - 8, 'Espace', '#9ddcff');
      }
    }

    // vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  };

  OW.drawMark = function (ctx, x, y, text, color) {
    const bob = Math.sin(G.time * 5) * 2;
    ctx.save();
    ctx.font = '600 12px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = Math.max(18, ctx.measureText(text).width + 12);
    ctx.fillStyle = 'rgba(6,16,34,0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.fillRect(x - w / 2, y - 9 + bob, w, 18);
    ctx.strokeRect(x - w / 2 + 0.5, y - 8.5 + bob, w - 1, 17);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + bob + 1);
    ctx.restore();
  };

  OW.renderLights = function (ctx, cx, cy, dark) {
    const W = G.config.WIDTH, H = G.config.HEIGHT;
    if (!this.lightCanvas) {
      this.lightCanvas = document.createElement('canvas');
      this.lightCanvas.width = W;
      this.lightCanvas.height = H;
    }
    const lc = this.lightCanvas.getContext('2d');
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = `rgba(2,4,14,${dark})`;
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';
    const p = this.player;
    const lights = [{ x: p.px + T / 2 - cx, y: p.py + T / 2 - cy, r: G.config.PLAYER_LIGHT * T }];
    for (const e of this.ents) {
      if (!e.light || !this.visible(e)) continue;
      const fl = e.light.flicker ? 1 + Math.sin(G.time * 9 + e.x) * 0.04 + Math.sin(G.time * 23 + e.y) * 0.03 : 1;
      lights.push({ x: e.px + T / 2 - cx, y: e.py + T / 2 - cy, r: e.light.r * T * fl, color: e.light.color });
    }
    for (const l of lights) {
      if (l.x < -l.r || l.x > W + l.r || l.y < -l.r || l.y > H + l.r) continue;
      const g = lc.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.drawImage(this.lightCanvas, 0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      if (!l.color) continue;
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
      g.addColorStop(0, `rgba(${l.color},0.16)`);
      g.addColorStop(1, `rgba(${l.color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.restore();
  };

  G.scenes.overworld = OW;
})();
