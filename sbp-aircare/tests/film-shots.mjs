// Rev.29 — screenshots of the design-D film at five scroll positions. usage: node tests/film-shots.mjs <outdir> [d.html] [w] [h]
import { launch, BASE } from './_lib.mjs';
const OUT = process.argv[2], page = process.argv[3] || 'd.html', W = +(process.argv[4] || 1366), H = +(process.argv[5] || 860);
const b = await launch(); const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`${BASE}/${page}`); await p.waitForTimeout(4000);
for (const q of [0.03, 0.3, 0.5, 0.7, 0.97]) {
  await p.evaluate(q => { const t = document.querySelector('.cn-track'); const r = t.getBoundingClientRect(); scrollTo(0, scrollY + r.top + q * (r.height - innerHeight)); }, q);
  await p.waitForTimeout(9000);
  await p.screenshot({ path: `${OUT}/film-${W}-${q}.png` });
}
console.log('errors', errs.slice(0, 5));
await b.close();
