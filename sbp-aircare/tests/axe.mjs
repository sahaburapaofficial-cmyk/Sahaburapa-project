// Rev.31 — accessibility check with axe-core on every view of a page (WCAG 2.0/2.1/2.2 A + AA rules).
// usage: node tests/axe.mjs a.html [width=1366] [height] [--theme dark] [--detail]   · npm run axe -- e.html 390
//   prints violations by impact; exit 1 when any serious or critical one is found (moderate/minor are listed for review)
import { readFileSync } from 'node:fs';
import { launch, BASE } from './_lib.mjs';
const args = process.argv.slice(2);
const page = args[0] || 'a.html', w = +(args[1] && !args[1].startsWith('--') ? args[1] : 1366), hh = +(args[2] && !args[2].startsWith('--') ? args[2] : (w < 600 ? 844 : 900));
const theme = args.includes('--theme') ? args[args.indexOf('--theme') + 1] : 'light';
const AXE = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const b = await launch(); const p = await b.newPage({ viewport: { width: w, height: hh }, colorScheme: theme === 'dark' ? 'dark' : 'light', hasTouch: w < 1000 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${BASE}/${page}`); await p.waitForTimeout(3000);
if (theme === 'dark') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
const views = await p.evaluate(() => [...new Set([...document.querySelectorAll('[data-sx]')].map(s => s.dataset.sx))]);
await p.addScriptTag({ content: AXE });
const all = {};
for (const v of views) {
  await p.evaluate(v => { location.hash = '#' + v; }, v); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const H = document.body.scrollHeight; for (let y = 0; y < H; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
  await p.waitForTimeout(1200);
  // Rev.33: let finite animations (view fade-in, reveals) end first — a busy machine once caught text mid-fade as low contrast
  await p.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.playState === 'running' && isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 4000))]));
  const r = await p.evaluate(async () => {
    const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return res.violations.map(x => ({ id: x.id, impact: x.impact, help: x.help, n: x.nodes.length, nodes: x.nodes.slice(0, 4).map(n => (n.target || []).join(' ') + (n.any && n.any[0] && n.any[0].message ? ' — ' + n.any[0].message.slice(0, 140) : '')) }));
  });
  r.forEach(x => { const k = x.id; all[k] = all[k] || { impact: x.impact, help: x.help, n: 0, views: [], nodes: [] }; all[k].n += x.n; all[k].views.push(v); x.nodes.forEach(s => all[k].nodes.length < 6 && !all[k].nodes.includes(s) && all[k].nodes.push(s)); });
}
const by = { critical: 0, serious: 0, moderate: 0, minor: 0 };
Object.values(all).forEach(x => { by[x.impact] = (by[x.impact] || 0) + x.n; });
console.log(JSON.stringify({ page, w, theme, ...by, errors: errs.length }));
if (args.includes('--detail') || by.critical || by.serious) Object.entries(all).forEach(([k, x]) => { console.log(`  [${x.impact}] ${k} ×${x.n} (${[...new Set(x.views)].join(',')}) ${x.help}`); x.nodes.forEach(s => console.log('      ' + s)); });
await b.close();
process.exitCode = by.critical || by.serious || errs.length ? 1 : 0;
