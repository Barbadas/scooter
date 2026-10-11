/* Sauvegarde locale (navigateur). Toujours protégée : le stockage peut être bloqué. */
G.save = {
  write() {
    if (!G.state) return false;
    if (G.scenes.overworld && G.scenes.overworld.map) G.scenes.overworld.storePos();
    try {
      localStorage.setItem(G.config.SAVE_KEY, JSON.stringify(G.state));
      return true;
    } catch (e) {
      return false;
    }
  },
  read() {
    try {
      const raw = localStorage.getItem(G.config.SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  exists() { return !!this.read(); },
  clear() {
    try { localStorage.removeItem(G.config.SAVE_KEY); } catch (e) { /* stockage indisponible */ }
  },
};
