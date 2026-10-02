// SBP AirCare — lazy start helpers — Rev.11 (no three.js import here, so any module can use them cheaply)
/**
 * Rev.11 — boot a 3D scene only when its host comes near the screen. Pages (views) that are hidden do not create a WebGL
 * context at all — before, every scene booted at load and the pool then had to tear the hidden ones down again, which cost
 * seconds of main-thread time on phones. Nothing about the scene itself changes (same quality once it is on screen).
 * whenNear(el, fn): run fn once, the first time el is within `margin` of the viewport (hidden elements never are).
 * deferred(el, boot): returns a stand-in for the scene's controller right away; method calls made before the scene exists
 * are remembered (latest call per method) and replayed in order once boot() — sync or async — has returned it.
 */
export function whenNear(el, fn, margin = '75% 0px') {
  if (!el || !('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin });
  io.observe(el);
}
export function deferred(el, boot, margin) {
  let real = null, done = false; const q = new Map();
  const land = v => { real = v || null; done = true; if (real) q.forEach((a, k) => { if (typeof real[k] === 'function') real[k](...a); }); q.clear(); };
  whenNear(el, () => { const r = boot(); if (r && typeof r.then === 'function') r.then(land, () => land(null)); else land(r); }, margin);
  return new Proxy({}, {
    get(_, k) {
      if (real) { const v = real[k]; return typeof v === 'function' ? v.bind(real) : v; }
      if (k === 'then' || typeof k === 'symbol') return undefined;   // not a thenable: `await mountX()` resolves to this stand-in
      if (k === 'state') return {};
      return (...a) => { if (!done) { q.delete(k); q.set(k, a); } };
    },
  });
}
