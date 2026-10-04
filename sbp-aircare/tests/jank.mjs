// Rev.26.1 smoothness audit: every section of a page — long main-thread tasks, slow frames, layout shift, errors — while the section
// is in view (after boot) and while scrolling through it. node tests/jank.mjs a.html [w h] [section,…]
// Software GL (swiftshader) makes 3D frames slow by itself, so the report separates main-thread long tasks (our JS) from frame time.
import { launch, BASE } from './_lib.mjs';
const [,, page = 'a.html', w = 1366, hh = 900, only = ''] = process.argv;
const b = await launch(); const p = await b.newPage({ viewport: { width: +w, height: +hh } });
const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => {
  window.__J = { lt: [], cls: 0, frames: [] };
  try { new PerformanceObserver(l => l.getEntries().forEach(e => __J.lt.push({ t: e.startTime, d: e.duration }))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) __J.cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  let last = 0; const f = t => { if (last) __J.frames.push([t, t - last]); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
});
await p.goto(`${BASE}/${page}`); await p.waitForTimeout(3000);
const ids = only ? only.split(',') : await p.evaluate(() => [...document.querySelectorAll('main section[id], body > section[id]')].map(s => s.id));
const rows = [];
for (const id of ids) {
  const e0 = errs.length;
  await p.evaluate(id => { location.hash = '#' + id; }, id); await p.waitForTimeout(400);
  const t0 = await p.evaluate(id => { const s = document.getElementById(id); if (s) s.scrollIntoView({ block: 'start' }); __J.cls0 = __J.cls; return performance.now(); }, id);
  await p.waitForTimeout(2500);   // boot + idle animation
  // scroll through the section in steps (wheel = what a visitor does)
  const H = await p.evaluate(id => (document.getElementById(id) || {}).offsetHeight || 0, id);
  for (let y = 0; y < Math.min(H, 4000); y += 300) { await p.mouse.wheel(0, 300); await p.waitForTimeout(120); }
  await p.waitForTimeout(500);
  const r = await p.evaluate(t0 => {
    const lt = __J.lt.filter(x => x.t >= t0), fr = __J.frames.filter(x => x[0] >= t0).map(x => x[1]);
    const slow = fr.filter(d => d > 50).length, worst = Math.max(0, ...fr);
    return { lt: lt.length, ltMax: Math.round(Math.max(0, ...lt.map(x => x.d))), ltSum: Math.round(lt.reduce((a, x) => a + x.d, 0)), frames: fr.length, slow, worst: Math.round(worst), cls: +(__J.cls - __J.cls0).toFixed(3), ov: document.documentElement.scrollWidth > innerWidth };
  }, t0);
  rows.push({ id, ...r, err: errs.length - e0 });
}
console.log(`page ${page} ${w}×${hh}`);
console.table(rows);
if (errs.length) console.log(errs.slice(0, 10).join('\n'));
await b.close();
