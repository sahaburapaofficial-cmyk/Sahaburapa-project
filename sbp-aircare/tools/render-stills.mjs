// Rev.43 — pre-render the D · E · F service pictures (vignette3d.js) at full size, once, in each design's colours, so the pages show
// them instantly on every device (no WebGL work in the browser for the front view). Run after changing a scene or a price figure:
//   npm run serve &  node tools/render-stills.mjs [DEF] [key,key,…]
// Writes assets/stills/<V>-<key>.webp and assets/stills/manifest.json { fig, D: {key: file}, … }. `fig` is the exact figures printed
// on the glass panels; the page uses a still only while its own figures are the same (a price change → live render until re-run).
import { launch, BASE } from '../tests/_lib.mjs';
import fs from 'node:fs';
const OUT = new URL('../assets/stills/', import.meta.url);
const LOOK = { D: ['dark', '#63E6FF'], E: ['light', '#2F47F5'], F: ['dark', '#9A8CFF'] };
const vs = (process.argv[2] || 'DF').split(''), only = process.argv[3] ? process.argv[3].split(',') : null;
const KEYS = only || ['door:clean', 'door:install', 'door:repair', ...['c', 'i', 'r'].flatMap(s => [1, 2, 3, 4, 5, 6].map(i => s + i)),
  // Rev.45: D · F show every picture in 3D — symptoms, knowledge topics, unit types, materials, building types
  ...'warm drip ice dead code trip cycle noise smell weak swing cduwater bill care'.split(' ').map(k => 'sym:' + k),
  ...'btu types inverter clean c1c2 install place contract packages docs vrf area'.split(' ').map(k => 'kn:' + k),
  ...'wall ceiling cassette floor'.split(' ').map(k => 'type:' + k), ...'copper insul duct cable drain mount rcbo'.split(' ').map(k => 'mat:' + k),
  ...'office chain condo hospital school hotel factory'.split(' ').map(k => 'ent:' + k)];
const manFile = new URL('manifest.json', OUT);
const man = fs.existsSync(manFile) ? JSON.parse(fs.readFileSync(manFile, 'utf8')) : {};
const b = await launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto(`${BASE}/test-vignette.html?k=none`); await p.waitForTimeout(500);
const fig = await p.evaluate(async () => { await (await import('./assets/sbp-core.js')).loadData(); const s = await import('./assets/servicepath.js'); return JSON.stringify(s.figures()); });
if (man.fig && man.fig !== fig && only) { console.log('figures changed since the last full run — run without a key list'); process.exit(1); }
man.fig = fig;
for (const V of vs) {
  man[V] = man[V] || {};
  for (const k of KEYS) {
    const t0 = Date.now();
    const url = await p.evaluate(async ([k, theme, accent, fig]) => { const v = await import('./assets/vignette3d.js'); return v.vignette(k, { theme, accent, info: JSON.parse(fig), force: true, keep: false }); }, [k, ...LOOK[V], fig]);
    if (!url) { console.log('no image', V, k); continue; }
    const file = `${V}-${k.replace(':', '-')}.webp`;
    fs.writeFileSync(new URL(file, OUT), Buffer.from(url.split(',')[1], 'base64'));
    man[V][k] = file;
    console.log(V, k, Math.round((Date.now() - t0) / 1000) + 's', Math.round(fs.statSync(new URL(file, OUT)).size / 1024) + 'KB');
    fs.writeFileSync(manFile, JSON.stringify(man, null, 1));
  }
}
await b.close();
