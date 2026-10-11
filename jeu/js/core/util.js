/* Outils partagés : hasard, interpolations, tweens, formatage. */
(function () {
  const U = {};

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  U.chance = p => Math.random() < p;
  U.wait = ms => new Promise(r => setTimeout(r, ms));
  U.clone = o => JSON.parse(JSON.stringify(o));

  // Tirage pondéré : [[valeur, poids], ...]
  U.weighted = list => {
    const total = list.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [v, w] of list) { r -= w; if (r <= 0) return v; }
    return list[list.length - 1][0];
  };

  // Bruit déterministe par case (pour varier les tuiles sans clignoter)
  U.hash = (x, y, s = 0) => {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  };

  U.ease = {
    linear: t => t,
    inQuad: t => t * t,
    outQuad: t => 1 - (1 - t) * (1 - t),
    inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };

  // Tweens mis à jour par la boucle principale
  const tweens = [];
  U.tween = (obj, props, ms, ease = 'outQuad') => new Promise(resolve => {
    const from = {};
    for (const k in props) from[k] = obj[k];
    tweens.push({ obj, from, to: props, ms: Math.max(1, ms), t: 0, ease: U.ease[ease] || U.ease.outQuad, resolve });
  });
  U.updateTweens = dt => {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt * 1000;
      const p = Math.min(1, tw.t / tw.ms);
      const e = tw.ease(p);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (p >= 1) { tweens.splice(i, 1); tw.resolve(); }
    }
  };

  U.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  G.U = U;

  // Remplace {nom} par le nom du héros
  G.fmt = s => String(s == null ? '' : s)
    .replace(/\{nom\}/g, (G.state && G.state.hunter && G.state.hunter.name) || G.config.DEFAULT_NAME);
})();
