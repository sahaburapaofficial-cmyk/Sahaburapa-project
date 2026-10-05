// Rev.32 — the D/E/F sound layer: silent until the header button is pressed, then a running AudioContext; off again on the second
// press; the scene modules report airflow and cues without errors. usage: node tests/sound.mjs d.html
import { launch, BASE } from './_lib.mjs';
const page = process.argv[2] || 'd.html';
const b = await launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
// count AudioContexts created and their state (wrap the constructor before the page loads)
await p.addInitScript(() => { const AC = window.AudioContext; window.__ac = []; window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__ac.push(this); } }; });
await p.goto(`${BASE}/${page}`); await p.waitForTimeout(3500);
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
ok(await p.evaluate(() => window.__ac.length === 0), 'no audio before the visitor asks (no autoplay)');
const btn = p.locator('.hdr .lx-snd'); ok(await btn.count() === 1, 'one sound button in the header');
ok(await btn.getAttribute('aria-pressed') === 'false', 'button starts off');
await btn.click(); await p.waitForTimeout(800);
ok(await btn.getAttribute('aria-pressed') === 'true', 'button on after click');
ok(await p.evaluate(() => window.__ac.length === 1 && window.__ac[0].state === 'running'), 'one AudioContext, running');
// scroll the hero scene and let it report airflow / cues
await p.evaluate(async () => { for (let y = 0; y < innerHeight * 3; y += 200) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
await p.waitForTimeout(1500);
await btn.click(); await p.waitForTimeout(1500);
ok(await btn.getAttribute('aria-pressed') === 'false', 'off after the second click');
ok(await p.evaluate(() => window.__ac[0].state !== 'running'), 'context suspended when off');
ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail ? `${page}: ${fail} FAIL` : `${page}: ALL PASS`);
await b.close(); process.exitCode = fail ? 1 : 0;
