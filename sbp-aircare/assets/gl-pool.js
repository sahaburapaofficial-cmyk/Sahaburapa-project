// SBP AirCare — WebGL context budget (B1, Rev.09). Every 3D scene registers its renderer here; at most MAX contexts stay
// live — the ones nearest the viewport. A scene that scrolls away keeps its JS state (step, camera, sliders) but its GL
// context is released through WEBGL_lose_context; when it comes back near the viewport the context is restored and three.js
// re-uploads geometry/textures by itself. The only GPU-side content three cannot rebuild is a PMREM environment map,
// so the pool regenerates scene.environment on restore. No module needs a suspend/resume rewrite.
// Hysteresis keeps scenes from flapping at the edge; reduced-motion users get the same budget.
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { enhance } from './quality3d.js';

const MAX = (navigator.deviceMemory && navigator.deviceMemory <= 2) ? 2 : 3;
const NEAR = 0.9;                  // "near" = within 0.9 viewport heights above/below the screen
const entries = [];
let queued = 0;

function dist(e) {
  const r = e.el.getBoundingClientRect(), vh = innerHeight || 800;
  if (!r.width && !r.height) return Infinity;                 // hidden (display:none / collapsed)
  if (r.bottom < 0) return -r.bottom / vh;                    // above the screen
  if (r.top > vh) return (r.top - vh) / vh;                   // below the screen
  return 0;                                                   // on screen
}
function balance() {
  queued = 0;
  // disposed scenes leave the pool (only once their canvas has been on the page: track() may run before it is appended)
  for (let i = entries.length - 1; i >= 0; i--) { const e = entries[i]; if (e.renderer.domElement.isConnected) e.seen = true; else if (e.seen) entries.splice(i, 1); }
  entries.forEach(e => { e.d = dist(e); });
  const want = entries.filter(e => e.d <= NEAR).sort((a, b) => a.d - b.d || b.t - a.t).slice(0, MAX);
  const keep = new Set(want);
  const active = () => entries.filter(e => e.state === 'live' || e.state === 'restoring' || e.state === 'losing');
  // free what is needed to fit the wanted scenes (farthest first); scenes just outside the near band stay while there is room
  let excess = active().length + want.filter(e => e.state === 'lost').length - MAX;
  active().filter(e => e.state === 'live' && e.ext && !keep.has(e)).sort((a, b) => b.d - a.d)
    .forEach(e => { if (excess > 0 || e.d > NEAR + 0.4) { lose(e); excess--; } });
  // bring back wanted scenes only once their slot is really free (the async 'lost' event re-runs this)
  let room = MAX - active().length;
  want.forEach(e => { if (e.state === 'lost' && room > 0) { restore(e); room--; } });
}
const schedule = () => { if (!queued) queued = requestAnimationFrame(balance); };
function lose(e) { if (!e.ext) return; e.state = 'losing'; try { e.ext.loseContext(); } catch (_) { e.state = 'live'; } }
function restore(e) { if (!e.ext) return; e.state = 'restoring'; try { e.ext.restoreContext(); } catch (_) { e.state = 'lost'; } }

let wired = false;
function wire() {
  if (wired) return; wired = true;
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', schedule);
  setInterval(schedule, 1500);   // catches layout shifts (lazy sections growing) that fire no scroll event
}

/** register a renderer; el = the element whose position decides priority. opts.scene → its RoomEnvironment map is rebuilt
 *  after a restore; opts.redraw() → called after a restore for scenes that render on demand. Returns { release() }. */
export function track(renderer, el, opts = {}) {
  const gl = renderer.getContext();
  // Rev.26.1 smooth: three.js reads every shader / program log after compiling (checkShaderErrors) — a synchronous GPU round trip
  // that froze the page 1–4 s while a scene booted. Off in production; add ?glcheck to the URL when debugging shaders.
  try { renderer.debug.checkShaderErrors = /[?&]glcheck/.test(location.search); } catch (_) {}
  const e = { renderer, el, scene: opts.scene || null, env: !!(opts.scene && opts.scene.environment), redraw: opts.redraw || null, ext: gl && gl.getExtension('WEBGL_lose_context'), state: 'live', t: performance.now(), d: 0 };
  const cv = renderer.domElement;
  // loseContext() makes the context unusable at once but three.js only learns of it from the async event — until then a
  // render would compile programs on a dead context (getProgramInfoLog → null). So render only while the slot is live.
  const render0 = renderer.render.bind(renderer);
  // Rev.12: on capable computers the scene gets sharper shadows and texture filtering (quality3d.js); otherwise as before
  const fx = enhance(renderer);
  // Rev.26.1 smooth: the first frame of each scene compiles its shaders in the background (KHR_parallel_shader_compile via
  // renderer.compileAsync) instead of freezing the page; the loading shimmer stays until it is ready. Without the extension
  // (some software GL) it renders at once as before.
  const par = !!(gl && gl.getExtension('KHR_parallel_shader_compile')) && typeof renderer.compileAsync === 'function';
  const ready = new WeakSet(), busy = new WeakSet();
  // the canvas fades in on its first real frame (no pop from the loading shimmer to a finished scene)
  let shown = false; const RMq = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (cv && cv.style && !RMq) { cv.style.opacity = '0'; cv.style.transition = 'opacity .35s ease-out'; }
  const show = () => { if (!shown) { shown = true; if (cv && cv.style) cv.style.opacity = ''; } };
  renderer.render = (s, c) => {
    if (e.state !== 'live') return; fx && fx.prepare(s);
    if (par && s && c && !ready.has(s) && renderer.getRenderTarget() === null) {   // screen frames only: PMREM / render-to-texture passes need the frame now
      if (!busy.has(s)) { busy.add(s); renderer.compileAsync(s, c).catch(() => {}).then(() => { ready.add(s); busy.delete(s); if (e.state === 'live') { render0(s, c); show(); } }); }
      return;
    }
    render0(s, c); show();
  };
  cv.addEventListener('webglcontextlost', () => { e.state = 'lost'; schedule(); });
  cv.addEventListener('webglcontextrestored', () => {
    e.state = 'live'; e.t = performance.now();
    // three.js restores its own state on this event (registered first); rebuild the GPU-generated environment map after it
    setTimeout(() => {
      if (e.env && e.scene) { try { const pm = new THREE.PMREMGenerator(renderer); const old = e.scene.environment; e.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); old && old.dispose && old.dispose(); } catch (_) {} }
      e.redraw && e.redraw();
      schedule();
    }, 0);
  });
  // balance now, not on the next frame: scenes that boot back to back (fast scroll, single-file build) must not overshoot
  entries.push(e); wire(); if (queued) { cancelAnimationFrame(queued); } balance();
  return { release() { const i = entries.indexOf(e); if (i >= 0) entries.splice(i, 1); schedule(); } };
}
export { whenNear, deferred } from './lazy.js';   // Rev.11 (moved to lazy.js so 2D modules can use it without three.js)
export const glBudget = () => ({ max: MAX, live: entries.filter(e => e.state === 'live').length, total: entries.length });
