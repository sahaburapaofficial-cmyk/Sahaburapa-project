// SBP AirCare — lazy start helpers — Rev.11 (no three.js import here, so any module can use them cheaply)
/**
 * Rev.11 — boot a 3D scene only when its host comes near the screen. Pages (views) that are hidden do not create a WebGL
 * context at all — before, every scene booted at load and the pool then had to tear the hidden ones down again, which cost
 * seconds of main-thread time on phones. Nothing about the scene itself changes (same quality once it is on screen).
 * whenNear(el, fn): run fn once, the first time el is within `margin` of the viewport (hidden elements never are).
 * deferred(el, boot): returns a stand-in for the scene's controller right away; method calls made before the scene exists
 * are remembered (latest call per method) and replayed in order once boot() — sync or async — has returned it.
 */
// Rev.26.1 smooth: heavy work (a scene boot, a product render) waits until the visitor stops scrolling for a moment and the
// browser is idle, so it never lands in the middle of a scroll or a tap. Bounded: it runs within ~1.5 s even if scrolling goes on.
let lastInput = 0;
if (typeof window !== 'undefined') ['scroll', 'wheel', 'touchmove', 'keydown'].forEach(t => addEventListener(t, () => { lastInput = performance.now(); }, { passive: true, capture: true }));
export function whenQuiet(fn, quiet = 220, max = 1500) {
  const t0 = performance.now();
  const idle = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 400 }) : f => setTimeout(f, 16);
  const check = () => { const now = performance.now(); if (now - lastInput >= quiet || now - t0 >= max) idle(() => fn()); else setTimeout(check, quiet - (now - lastInput) + 10); };
  check();
}
export const quiet = () => new Promise(r => whenQuiet(r));
export function whenNear(el, fn, margin = '75% 0px') {
  if (!el || !('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); whenQuiet(fn); } }, { rootMargin: margin });
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
