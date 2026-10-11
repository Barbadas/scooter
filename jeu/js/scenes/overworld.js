/* Exploration vue de dessus : déplacement case par case, ennemis visibles,
   interactions, portails, éclairage nocturne. */
(function () {
  const U = G.U;
  const T = G.config.TILE;
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const BASE_TILES = {
    '#': 'mur', '.': 'sol', ',': 'sol2', '~': 'vide', '=': 'carrelage',
    '"': 'herbe', ':': 'chemin', '^': 'arbre', '%': 'eau', '-': 'palissade',
  };
  const SOLID_TILES = { mur: true, vide: true, arbre: true, eau: true, palissade: true };
  const CH = 16;              // taille d'un bloc de rendu (en tuiles)
  const ACTIVE_RANGE = 26;    // les ennemis plus loin que ça (en cases) restent immobiles

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
    if (G.state) this.explore();
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
    if (data.spawns && G.state) spawnRandom(data, mapId, map, ents);
    return { map, ents, start };
  }

  // ───────────── Placement aléatoire (coffres, bêtes) ─────────────
  // Graine propre à la partie : la même sauvegarde retrouve les mêmes coffres.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const SPAWN_GROUND = { herbe: 1, sol2: 0.8, sol: 0.5, chemin: 0.3 };
  function spawnRandom(data, mapId, map, ents, which) {
    const sp = data.spawns, st = G.state, [cx, cy] = sp.center, av = sp.avoid;
    const taken = new Set();
    const mark = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) taken.add((x + dx) + ',' + (y + dy)); };
    for (const e of ents) mark(e.x, e.y);
    // case dégagée : ses 8 voisines sont praticables (jamais un couloir bouché)
    const open = (x, y) => {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && SPAWN_GROUND[map.tileAt(x + dx, y + dy)]) n++;
      return n === 8;
    };
    const place = (groups, seed, prefix, kind) => {
      const R = rng(seed);
      for (const ch in groups) {
        const rule = groups[ch], placed = [];
        for (let i = 0; i < rule.count; i++) {
          for (let tries = 0; tries < 600; tries++) {
            const x = 2 + Math.floor(R() * (map.w - 4)), y = 2 + Math.floor(R() * (map.h - 4));
            const w = SPAWN_GROUND[map.tiles[y][x]];
            if (!w || R() > w || taken.has(x + ',' + y) || !open(x, y)) continue;
            if (av && x >= av[0] && x <= av[2] && y >= av[1] && y <= av[3]) continue;
            const d = Math.hypot(x - cx, y - cy);
            if (d < (rule.min || 0) || (rule.max && d > rule.max)) continue;
            if (placed.some(p => Math.abs(p[0] - x) + Math.abs(p[1] - y) < (rule.gap || 4))) continue;
            placed.push([x, y]);
            mark(x, y);
            const e = makeEnt(Object.assign({}, data.legend[ch], { id: `${prefix}_${ch}_${i}` }), ch, x, y, mapId);
            e.spawned = kind;
            ents.push(e);
            break;
          }
        }
      }
    };
    if (which !== 'beasts' && sp.chests) place(sp.chests, st.seed, 'coffre', 'chest');
    if (which !== 'chests' && sp.beasts) place(sp.beasts, st.seed + (st.nights || 0) * 7919 + 101, 'bete', 'beast');
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
    return best === 'sol2' ? 'sol' : best === 'chemin' && count.herbe ? 'herbe' : best;
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

  // Le décor fixe (tuiles, ombres de contact, gravats, déchets…) est peint par blocs de 16×16 cases,
  // à la demande, puis gardé en cache : une grande carte ne coûte que ce qui est à l'écran.
  OW.prerender = function () {
    this.tileScale = Math.min(1.5, window.devicePixelRatio || 1);
    this.chunks = new Map();
    this.occupied = new Set(this.ents.filter(e => e.kind !== 'trigger').map(e => e.x + ',' + e.y));
    this.occupied.add(this.player.x + ',' + this.player.y);
    const P = G.placeholders, map = this.map;
    this.decorLights = [];
    this.voidTiles = [];
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = map.tiles[y][x];
        if (t === 'vide') this.voidTiles.push([x, y]);
        if (!this.occupied.has(x + ',' + y)) { const l = P.decorTile(null, map, T, x, y); if (l) this.decorLights.push(l); }
      }
    }
    this.parts = [];
  };

  // Peint les cases [x0,x1[ × [y0,y1[ ligne par ligne : d'abord le sol (et son décor),
  // puis les éléments hauts (arbres, palissade) qui débordent sur leurs voisins.
  OW.paintRange = function (ctx, x0, y0, x1, y1) {
    const map = this.map, P = G.placeholders, A = G.assets;
    for (let y = Math.max(0, y0); y < Math.min(map.h, y1); y++) {
      for (let pass = 0; pass < 2; pass++) {
        for (let x = Math.max(0, x0); x < Math.min(map.w, x1); x++) {
          const t = map.tiles[y][x], tall = !!P.TALL[t];
          if (tall !== (pass === 1)) continue;
          A.drawTile(ctx, t, x * T, y * T, x, y, map);
          if (!tall) {
            P.aoTile(ctx, map, T, x, y);
            if (!this.occupied.has(x + ',' + y)) P.decorTile(ctx, map, T, x, y);
          }
        }
      }
    }
  };

  OW.chunk = function (cx, cy) {
    const key = cx + ',' + cy;
    let c = this.chunks.get(key);
    if (c) { this.chunks.delete(key); this.chunks.set(key, c); return c; }
    const sc = this.tileScale, S = CH * T;
    c = document.createElement('canvas');
    c.width = Math.ceil(S * sc);
    c.height = Math.ceil(S * sc);
    const ctx = c.getContext('2d');
    ctx.scale(sc, sc);
    ctx.translate(-cx * S, -cy * S);
    ctx.beginPath(); ctx.rect(cx * S, cy * S, S, S); ctx.clip();
    // une case de marge : les arbres du bloc voisin débordent sur celui-ci
    this.paintRange(ctx, cx * CH - 1, cy * CH - 1, (cx + 1) * CH + 1, (cy + 1) * CH + 2);
    this.chunks.set(key, c);
    if (this.chunks.size > 36) this.chunks.delete(this.chunks.keys().next().value);
    return c;
  };

  // Prépare un bloc proche de l'écran par image, pour éviter les à-coups en marchant
  OW.warmChunks = function () {
    const W = G.config.WIDTH, H = G.config.HEIGHT, S = CH * T;
    const mx = Math.ceil(this.map.w / CH), my = Math.ceil(this.map.h / CH);
    const ax = Math.floor((this.cam.x - S / 2) / S), bx = Math.floor((this.cam.x + W + S / 2) / S);
    const ay = Math.floor((this.cam.y - S / 2) / S), by = Math.floor((this.cam.y + H + S / 2) / S);
    for (let j = Math.max(0, ay); j <= Math.min(my - 1, by); j++) {
      for (let i = Math.max(0, ax); i <= Math.min(mx - 1, bx); i++) {
        if (!this.chunks.has(i + ',' + j)) { this.chunk(i, j); return; }
      }
    }
  };

  // ───────────── Requêtes ─────────────
  OW.visible = function (e) {
    const f = G.state.flags;
    if (e.dead) return false;
    if (e.hiddenIf && f[e.hiddenIf]) return false;
    if (e.showIf && !f[e.showIf]) return false;
    if (G.state.removed[e.key]) return false;
    if (e.kind === 'enemy' && G.state.cleared && G.state.cleared[e.key]) return false;
    return true;
  };
  OW.findEnt = function (id) { return this.ents.find(e => e.id === id) || null; };
  OW.occupies = (e, x, y) => {
    if (e.wide || e.deep) return Math.abs(x - e.x) <= (e.wide || 0) && y <= e.y && y >= e.y - (e.deep || 0);
    return (e.x === x && e.y === y) || (e.moving && e.tx === x && e.ty === y);
  };
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
    this.updateParts(dt);
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
    for (let i = 0; i < 3; i++) {
      this.spawn({ layer: 'world', x: p.px + T / 2 + U.rand(-8, 8), y: p.py + T - 6, vx: U.rand(-14, 14), vy: U.rand(-10, -2), drag: true, life: U.rand(0.35, 0.6), age: 0, r: U.rand(2, 3.5), rgb: '140,125,105' });
    }
    G.state.steps = (G.state.steps || 0) + 1;
    this.explore();
    G.quests.track('step');
    if (G.state.steps % G.config.REGEN_EVERY_STEPS === 0) G.hunter.heal(1, 1);
    this.storePos();
    const here = this.ents.find(e => e.x === p.x && e.y === p.y && this.visible(e) && (e.kind === 'trigger' || e.kind === 'portal'));
    if (here) { this.activate(here); return; }
    this.checkContact();
  };

  // Carte du carnet : zones découvertes, par cellules de 4×4 cases
  OW.explore = function () {
    if (!G.state.explored) G.state.explored = {};
    const ex = G.state.explored[this.mapId] || (G.state.explored[this.mapId] = {});
    const p = this.player, cx = Math.floor(p.x / 4), cy = Math.floor(p.y / 4);
    for (let j = cy - 2; j <= cy + 2; j++) for (let i = cx - 2; i <= cx + 2; i++) {
      if (Math.abs(i - cx) + Math.abs(j - cy) <= 3) ex[i + ',' + j] = 1;
    }
  };

  // Repos à la tente : soins, sauvegarde, les bêtes reviennent
  OW.rest = function () {
    G.state.cleared = {};
    delete G.state.flags.repas;
    G.state.nights = (G.state.nights || 0) + 1;
    // les bêtes de la forêt changent de territoire pendant la nuit
    if (this.data.spawns) {
      this.ents = this.ents.filter(e => e.spawned !== 'beast');
      spawnRandom(this.data, this.mapId, this.map, this.ents, 'beasts');
    }
    for (const e of this.ents) {
      if (e.kind !== 'enemy' || e.unique) continue;
      e.dead = false; e.moving = false; e.stun = 0; e.chasing = false;
      e.x = e.tx = e.homeX; e.y = e.ty = e.homeY;
      e.px = e.x * T; e.py = e.y * T;
    }
    const h = G.state.hunter, d = G.hunter.derived(h);
    h.hp = d.maxHp; h.mp = d.maxMp;
    G.weapons.reloadAll();
    G.save.write();
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
    return this.ents.find(e => e.kind !== 'trigger' && this.visible(e) && this.occupies(e, p.x + dx, p.y + dy)) || null;
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
    if (G.state.opened[e.key]) return G.events.run([{ narrate: e.sprite === 'coffre' ? 'Le coffre est vide.' : 'La caisse est vide.' }]);
    G.state.opened[e.key] = true;
    const got = [];
    if (e.weapon) G.weapons.give(e.weapon, e.ammo || 0);
    if (e.gear) G.gear.give(e.gear);
    const add = (id, q) => { if (q > 0) { G.inventory.add(id, q); got.push(`${G.data.items[id].name} × ${q}`); } };
    if (e.item) add(e.item, e.qty || 1);
    for (const id in e.extra || {}) add(id, e.extra[id]);
    if (e.gold) { G.state.gold += e.gold; got.unshift(`${e.gold} ferraille`); }
    const L = e.loot && G.data.loot[e.loot];
    if (L) {
      const n = U.randInt(L.gold[0], L.gold[1]);
      G.state.gold += n;
      got.unshift(`${n} ferraille`);
      for (const [id, chance, qty] of L.rolls) {
        if (Math.random() < chance) add(id, Array.isArray(qty) ? U.randInt(qty[0], qty[1]) : qty);
      }
    }
    if (got.length) G.events.run([{ system: got.join('\n'), title: e.sprite === 'coffre' ? 'Coffre ouvert' : 'Caisse fouillée' }]);
    G.save.write();
  };

  // Arme dessinée dans la main des ennemis / PNJ sur la carte
  function enemyWeapon(e) {
    const id = e.kind === 'enemy' ? e.group[0] : null;
    const data = id && G.data.enemies[id];
    if (data && data.weapon) return G.data.weapons[data.weapon].sprite;
    return e.weapon || null;
  }

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
          else G.state.cleared[e.key] = true;
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
      if (Math.abs(e.x - p.x) + Math.abs(e.y - p.y) > ACTIVE_RANGE) continue;
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
    // Pendant un combat, le décor est figé : on le peint une fois puis on réutilise l'image
    if (G.battle.active && this.map) {
      if (!this.snap) {
        const dpr = ctx.canvas.width / W;
        this.snap = document.createElement('canvas');
        this.snap.width = ctx.canvas.width;
        this.snap.height = ctx.canvas.height;
        const sc = this.snap.getContext('2d');
        sc.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.renderScene(sc);
      }
      ctx.drawImage(this.snap, 0, 0, W, H);
      return;
    }
    this.snap = null;
    this.renderScene(ctx);
  };

  OW.renderScene = function (ctx) {
    const W = G.config.WIDTH, H = G.config.HEIGHT;
    ctx.fillStyle = '#020307';
    ctx.fillRect(0, 0, W, H);
    if (!this.map) return;
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    const S = CH * T, mx = Math.ceil(this.map.w / CH), my = Math.ceil(this.map.h / CH);
    for (let j = Math.max(0, Math.floor(cy / S)); j <= Math.min(my - 1, Math.floor((cy + H - 1) / S)); j++) {
      for (let i = Math.max(0, Math.floor(cx / S)); i <= Math.min(mx - 1, Math.floor((cx + W - 1) / S)); i++) {
        ctx.drawImage(this.chunk(i, j), i * S - cx, j * S - cy, S, S);
      }
    }
    if (!G.battle.active) this.warmChunks();
    this.renderParts(ctx, cx, cy, 'world');

    const p = this.player, inBattle = G.battle.active;
    const near = e => e.px > cx - 200 && e.px < cx + W + 200 && e.py > cy - 120 && e.py < cy + H + 260;
    const list = this.ents.filter(e => e.kind !== 'trigger' && e.sprite && near(e) && this.visible(e) && !(inBattle && G.battle.hideEnt === e));
    if (!inBattle) list.push(p);
    list.sort((a, b) => (a.py + (a.kind === 'portal' ? -T : 0)) - (b.py + (b.kind === 'portal' ? -T : 0)));

    for (const e of list) {
      const x = e.px + T / 2 - cx, y = e.py + T - 4 - cy;
      if (x < -150 || x > W + 150 || y < -60 || y > H + 200) continue;
      if (e === p) {
        G.assets.draw(ctx, 'heros', x, y, { dir: p.dir, t: p.anim, moving: p.moving, weapon: G.weapons.shown() });
        continue;
      }
      const sprite = e.kind === 'chest' && G.state.opened[e.key] ? (e.sprite === 'coffre' ? 'coffre_ouvert' : 'caisse_ouverte') : e.sprite;
      const alpha = e.stun > 0 ? 0.5 + 0.3 * Math.sin(e.t * 20) : 1;
      const wpn = e.kind === 'enemy' || e.kind === 'npc' ? enemyWeapon(e) : null;
      G.assets.draw(ctx, sprite, x, e.kind === 'portal' ? y + 2 : y, { dir: e.dir, t: e.t, moving: e.moving, faceX: e.faceX, alpha, weapon: wpn });
      if (e.kind === 'enemy' && e.chasing && e.stun <= 0) this.drawMark(ctx, x, y - (G.assets.manifest[sprite]?.size || 1) * T - 6, '!', '#ff4d5e');
    }

    if (this.data.darkness) this.renderLights(ctx, cx, cy, this.data.darkness);
    this.renderParts(ctx, cx, cy, 'glow');

    // indice d'interaction
    if (this.canControl() && !p.moving) {
      const f = this.facing();
      if (f && (f.event || f.examine || f.kind === 'chest' || f.kind === 'npc')) {
        const size = (G.assets.manifest[f.sprite]?.size || 1) * T;
        this.drawMark(ctx, f.px + T / 2 - cx, f.py + T - 4 - cy - size - 8, 'Espace', '#9ddcff');
      }
    }

    if (!this.data.darkness) {
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }
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

  // Une seule couche demi-résolution : obscurité teintée de brume, trous de lumière,
  // teinte colorée des sources, vignette. Puis un seul dessin plein écran.
  const LS = 0.5;
  OW.renderLights = function (ctx, cx, cy, dark) {
    const W = G.config.WIDTH, H = G.config.HEIGHT;
    if (!this.lightCanvas) {
      this.lightCanvas = document.createElement('canvas');
      this.lightCanvas.width = Math.round(W * LS);
      this.lightCanvas.height = Math.round(H * LS);
    }
    const lc = this.lightCanvas.getContext('2d');
    lc.setTransform(LS, 0, 0, LS, 0, 0);
    lc.globalAlpha = 1;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = `rgba(8,7,6,${dark})`;
    lc.fillRect(0, 0, W, H);
    // brume : éclaircit l'obscurité par endroits
    if (!fogTex) fogTex = makeFog();
    const S = fogTex.width;
    lc.globalCompositeOperation = 'source-atop';
    for (const [speed, par, alpha] of [[9, 0.6, 0.55], [-5, 0.85, 0.4]]) {
      lc.globalAlpha = alpha;
      const ox = -((cx * par + G.time * speed) % S + S) % S, oy = -((cy * par + G.time * speed * 0.3) % S + S) % S;
      for (let x = ox; x < W; x += S) for (let y = oy; y < H; y += S) lc.drawImage(fogTex, x, y);
    }
    lc.globalAlpha = 1;

    const p = this.player;
    const lights = [{ x: p.px + T / 2 - cx, y: p.py + T / 2 - cy, r: G.config.PLAYER_LIGHT * T, color: '255,220,170' }];
    for (const e of this.ents) {
      if (!e.light || !this.visible(e)) continue;
      const fl = e.light.flicker ? 1 + Math.sin(G.time * 9 + e.x) * 0.04 + Math.sin(G.time * 23 + e.y) * 0.03 : 1;
      lights.push({ x: e.px + T / 2 - cx, y: e.py + T / 2 - cy, r: e.light.r * T * fl, color: e.light.color, hot: e.light.flicker });
    }
    for (const l of this.decorLights || []) {
      const k = l.flicker ? 1 + Math.sin(G.time * 11 + l.x) * 0.05 + Math.sin(G.time * 27 + l.y) * 0.04 : 1 + Math.sin(G.time * 2 + l.x * 1.7) * 0.08;
      lights.push({ x: l.x * T + T / 2 - cx, y: l.y * T + T * 0.4 - cy, r: l.r * T * k, color: l.color, hot: l.flicker });
    }
    const vis = lights.filter(l => l.x > -l.r && l.x < W + l.r && l.y > -l.r && l.y < H + l.r);
    lc.globalCompositeOperation = 'destination-out';
    for (const l of vis) {
      const g = lc.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    // teinte colorée des sources de lumière
    lc.globalCompositeOperation = 'source-over';
    for (const l of vis) {
      if (!l.color) continue;
      const r = l.r * 0.85, g = lc.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
      g.addColorStop(0, `rgba(${l.color},${l.hot ? 0.24 : 0.18})`);
      g.addColorStop(0.45, `rgba(${l.color},${l.hot ? 0.09 : 0.06})`);
      g.addColorStop(1, `rgba(${l.color},0)`);
      lc.fillStyle = g;
      lc.fillRect(l.x - r, l.y - r, r * 2, r * 2);
    }
    // vignette
    const v = lc.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
    lc.fillStyle = v;
    lc.fillRect(0, 0, W, H);
    ctx.drawImage(this.lightCanvas, 0, 0, W, H);
  };

  // ───────────── Particules (braises, poussière, portails, gouffre) ─────────────
  OW.spawn = function (p) {
    if (this.parts.length < 240) this.parts.push(p);
  };
  OW.updateParts = function (dt) {
    if (!this.parts) return;
    const W = G.config.WIDTH, H = G.config.HEIGHT, cx = this.cam.x, cy = this.cam.y;
    const onScreen = (x, y, m = 60) => x > cx - m && x < cx + W + m && y > cy - m && y < cy + H + m;
    const R = (rate) => Math.random() < rate * dt;
    for (const e of this.ents) {
      if (!this.visible(e)) continue;
      const ex = e.px + T / 2, ey = e.py + T / 2;
      if (!onScreen(ex, ey)) continue;
      if (e.light && e.light.flicker && R(9)) {
        this.spawn({ layer: 'glow', x: ex + U.rand(-8, 8), y: e.py + T * 0.1, vx: U.rand(-10, 10), vy: U.rand(-55, -30), life: U.rand(0.7, 1.4), age: 0, r: U.rand(1, 2.2), rgb: Math.random() < 0.5 ? '255,170,70' : '255,220,140', wob: Math.random() * 6 });
      }
      if (e.kind === 'portal' && e.sprite === 'portail' && R(10)) {
        const a = Math.random() * Math.PI * 2;
        this.spawn({ layer: 'glow', x: ex + Math.cos(a) * T * 0.55, y: e.py + T * 0.15 + Math.sin(a) * T * 0.75, vx: -Math.cos(a) * 18, vy: -Math.sin(a) * 18 - 14, life: U.rand(0.8, 1.5), age: 0, r: U.rand(1, 2), rgb: '190,120,255' });
      }
    }
    for (const l of this.decorLights || []) {
      const lx = l.x * T + T / 2, ly = l.y * T + T * 0.4;
      if (onScreen(lx, ly) && R(l.flicker ? 4 : 1.2)) this.spawn({ layer: 'glow', x: lx + U.rand(-8, 8), y: ly + U.rand(-6, 6), vx: U.rand(-6, 6), vy: U.rand(-40, -14), life: U.rand(0.6, 1.4), age: 0, r: U.rand(0.8, 1.6), rgb: l.color, wob: l.flicker ? Math.random() * 6 : 0 });
    }
    // poussière en suspension dans la lumière du joueur
    const p = this.player;
    if (R(7)) this.spawn({ layer: 'glow', dust: true, x: p.px + T / 2 + U.rand(-T * 4, T * 4), y: p.py + T / 2 + U.rand(-T * 3, T * 3), vx: U.rand(-6, 6), vy: U.rand(-5, 3), life: U.rand(2.5, 4.5), age: 0, r: U.rand(0.6, 1.3), rgb: '230,210,180' });
    // lueurs qui montent du gouffre
    if (this.voidTiles && this.voidTiles.length && R(5)) {
      const [vx, vy] = U.pick(this.voidTiles);
      const x = vx * T + Math.random() * T, y = vy * T + Math.random() * T;
      if (onScreen(x, y)) this.spawn({ layer: 'world', x, y, vx: U.rand(-4, 4), vy: U.rand(-16, -8), life: U.rand(1.5, 2.5), age: 0, r: U.rand(4, 7), rgb: '90,84,78' });
    }
    for (const q of this.parts) {
      q.age += dt;
      q.x += (q.vx + (q.wob ? Math.sin(q.age * 8 + q.wob) * 12 : 0)) * dt;
      q.y += q.vy * dt;
      if (q.drag) { q.vx *= 1 - dt * 3; q.vy *= 1 - dt * 3; }
    }
    this.parts = this.parts.filter(q => q.age < q.life);
  };
  OW.renderParts = function (ctx, cx, cy, layer) {
    if (!this.parts || !this.parts.length) return;
    const p = this.player, lx = p.px + T / 2, ly = p.py + T / 2, lr = G.config.PLAYER_LIGHT * T;
    ctx.save();
    if (layer === 'glow') ctx.globalCompositeOperation = 'lighter';
    for (const q of this.parts) {
      if (q.layer !== layer) continue;
      const k = q.age / q.life;
      let a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      if (q.dust) a *= Math.max(0, 1 - Math.hypot(q.x - lx, q.y - ly) / lr) * (0.5 + 0.5 * Math.sin(q.age * 5));
      if (a <= 0.01) continue;
      const x = q.x - cx, y = q.y - cy;
      if (layer === 'world') {
        ctx.fillStyle = `rgba(${q.rgb},${0.35 * a})`;
        ctx.beginPath(); ctx.arc(x, y, q.r * (1 + k * 1.5), 0, Math.PI * 2); ctx.fill();
      } else {
        const r = q.r * 3;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(glowSprite(q.rgb), x - r, y - r, r * 2, r * 2);
      }
    }
    ctx.restore();
  };

  // Halo lumineux pré-rendu par couleur
  const glowCache = {};
  function glowSprite(rgbStr) {
    let c = glowCache[rgbStr];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, `rgba(${rgbStr},0.95)`);
    g.addColorStop(0.35, `rgba(${rgbStr},0.38)`);
    g.addColorStop(1, `rgba(${rgbStr},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 32);
    return (glowCache[rgbStr] = c);
  }
  OW.glowSprite = glowSprite;

  // Brume qui dérive lentement (texture générée une fois, raccord sans couture)
  let fogTex = null;
  function makeFog() {
    const S = 384, c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    for (let i = 0; i < 46; i++) {
      const px = Math.random() * S, py = Math.random() * S, r = 30 + Math.random() * 70, a = 0.05 + Math.random() * 0.08;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
        g.addColorStop(0, `rgba(175,160,140,${a})`); g.addColorStop(1, 'rgba(175,160,140,0)');
        x.fillStyle = g;
        x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2);
      }
    }
    return c;
  }
  G.scenes.overworld = OW;
})();
