// Rev.30 — page-load smoothness: long main-thread tasks during the first 12 s after opening a page (what a visitor feels as
// "the page froze while opening"). node tests/boot.mjs a.html [w h]
import { launch, BASE } from './_lib.mjs';
const [,, page = 'a.html', w = 1366, hh = 900] = process.argv;
const b = await launch(); const p = await b.newPage({ viewport: { width: +w, height: +hh } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__LT = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => __LT.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }); } catch (e) {} });
await p.goto(`${BASE}/${page}`);
await p.waitForTimeout(12000);
const lt = await p.evaluate(() => __LT);
const sum = lt.reduce((a, x) => a + x[1], 0), max = lt.reduce((a, x) => Math.max(a, x[1]), 0);
const top = [...lt].sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log(JSON.stringify({ page, w: +w, longTasks: lt.length, sumMs: sum, maxMs: max, top, errors: errs.length }));
await b.close();
