/* Entrées clavier + tactiles.
   Actions : up, down, left, right, ok, cancel, menu.
   Les écrans (dialogue, menus, messages) s'empilent : seul celui du dessus reçoit les actions. */
(function () {
  // e.code = position physique : WASD en QWERTY = ZQSD en AZERTY
  const CODES = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'ok', Enter: 'ok', NumpadEnter: 'ok', KeyE: 'ok',
    Escape: 'cancel', Backspace: 'cancel', KeyX: 'cancel',
    Tab: 'menu',
  };
  const DIRS = ['up', 'down', 'left', 'right'];
  const held = new Set();
  let order = [];
  const stack = [];
  let base = null;

  function actionFrom(e) {
    if (e.key && e.key.toLowerCase() === 'm') return 'menu';
    return CODES[e.code] || null;
  }

  function dispatch(a) {
    if (stack.length) stack[stack.length - 1](a);
    else if (base) base(a);
  }

  function hold(a) {
    if (!DIRS.includes(a)) return;
    if (!held.has(a)) order.push(a);
    held.add(a);
  }
  function release(a) {
    held.delete(a);
    order = order.filter(x => x !== a);
  }

  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const a = actionFrom(e);
    if (!a) return;
    e.preventDefault();
    hold(a);
    // Répétition clavier autorisée seulement pour naviguer dans les menus
    if (!e.repeat || (DIRS.includes(a) && stack.length)) dispatch(a);
  });
  window.addEventListener('keyup', e => {
    const a = actionFrom(e);
    if (a) release(a);
  });
  window.addEventListener('blur', () => { held.clear(); order = []; });

  G.input = {
    // Direction maintenue (la dernière pressée gagne)
    dir() {
      for (let i = order.length - 1; i >= 0; i--) if (held.has(order[i])) return order[i];
      return null;
    },
    push(fn) {
      stack.push(fn);
      return () => { const i = stack.lastIndexOf(fn); if (i >= 0) stack.splice(i, 1); };
    },
    setBase(fn) { base = fn; },
    free() { return stack.length === 0; },
    press(a) { hold(a); dispatch(a); },
    release,
    reset() { held.clear(); order = []; },
  };

  // Manette tactile
  function bindTouch() {
    document.querySelectorAll('#touch button[data-key]').forEach(btn => {
      const a = btn.dataset.key;
      const down = e => { e.preventDefault(); btn.classList.add('on'); G.input.press(a); };
      const up = e => { e.preventDefault(); btn.classList.remove('on'); release(a); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('contextmenu', e => e.preventDefault());
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindTouch);
  else bindTouch();
})();
