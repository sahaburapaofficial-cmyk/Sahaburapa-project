// Rev.42 — AI image / video slots: with a manifest that fills one slot of each kind, every section shows the picture with the
// "ภาพประกอบ (AI)" label; with the real (empty) manifest nothing changes. The manifest and files are served by route interception,
// so the repo needs no test images. usage: node tests/aislots.mjs d.html [mobile]
import { launch, BASE } from './_lib.mjs';
const page = process.argv[2] || 'd.html', M = process.argv[3] === 'mobile', V = page[0].toUpperCase();
const b = await launch();
const ctx = await b.newContext(M ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
const p = await ctx.newPage(); p.setDefaultTimeout(60000);
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
let fail = 0; const ok = (c, m, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (c ? '' : ' — ' + x)); if (!c) fail++; };
// a plain 64×40 PNG
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAoCAIAAADBrGu+AAAAWUlEQVR4nO3PUQkAIBTAwBfHiEY0liH8OITBAtxm7fN1wwUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWPHYBiwkQ0yw6AlsAAAAASUVORK5CYII=', 'base64');
const MAN = { 'door:clean': { file: 't-door.png', kind: 'image' }, [`hero:${V}`]: { file: 't-hero.mp4', kind: 'video', poster: 't-hero.png' }, 'sym:drip': { file: 't-sym.png', kind: 'image' }, 'kn:btu': { file: 't-kn.png', kind: 'image' }, 'ent:hospital': { file: 't-ent.png', kind: 'image' } };
await p.route('**/assets/ai/manifest.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(MAN) }));
await p.route('**/assets/ai/t-*.png', r => r.fulfill({ contentType: 'image/png', body: png }));
await p.route('**/assets/ai/t-*.mp4', r => r.fulfill({ contentType: 'video/mp4', body: Buffer.alloc(0) }));
const wait = (fn, arg, t = 30000) => p.waitForFunction(fn, arg, { timeout: t, polling: 250 }).then(() => true, () => false);
await p.goto(`${BASE}/${page}`); await p.waitForTimeout(2500);
// 1 hero band (video) above the doors
await p.locator('#doors').scrollIntoViewIfNeeded();
ok(await wait(() => { const b = document.querySelector('#doors .lx-ai-hero'); return b && !b.hidden && b.querySelector('video.ai-fill') && b.querySelector('.ai-fill-tag'); }), `hero:${V} video band shown above the doors with label`);
ok(await p.evaluate(() => { const v = document.querySelector('#doors .lx-ai-hero video'); return v.muted && v.loop && v.hasAttribute('playsinline') && !!v.poster; }), 'hero video is muted, looping, inline, with a poster');
// 2 door picture
ok(await wait(() => document.querySelector('#doors .pa-door[data-svc="clean"] .pa-door-art.is-ai img.pa-v.ai.in')), 'door:clean uses the AI image');
ok(await p.evaluate(() => !document.querySelector('#doors .pa-door[data-svc="install"] .pa-door-art.is-ai')), 'empty slot (door:install) unchanged');
// 3 symptom card
await p.evaluate(() => document.getElementById('symptoms').scrollIntoView()); await p.waitForTimeout(800);
await p.locator('#symptoms .sg-it[data-sym="drip"]').first().click();
ok(await wait(() => document.querySelector('#symptoms .ai.big.ai-has img.ai-fill.in')), 'sym:drip picture in the symptom card');
// 4 knowledge topic
await p.evaluate(() => { const d = document.getElementById('kh-btu'); d.scrollIntoView(); d.open = true; });
ok(await wait(() => { const f = document.querySelector('#kh-btu .kh-ai-pic'); return f && !f.hidden && f.querySelector('img.ai-fill'); }), 'kn:btu picture at the top of the opened topic');
ok(await p.evaluate(() => { const f = document.querySelector('#kh-types .kh-ai-pic'); return !f || f.hidden; }), 'empty knowledge slot stays hidden');
// 5 enterprise sector
await p.evaluate(() => document.getElementById('enterprise').scrollIntoView()); await p.waitForTimeout(500);
await p.locator('#en-tab-hospital').click();
ok(await wait(() => { const f = document.querySelector('#enterprise .en-ai-pic'); return f && !f.hidden && f.querySelector('img.ai-fill'); }), 'ent:hospital picture in the sector panel');
// Rev.43: with no AI pictures, the pre-rendered 3D stills and the 3D film of this design fill the pictures at once (no WebGL needed)
await p.unroute('**/assets/ai/manifest.json'); await p.route('**/assets/ai/manifest.json', r => r.fulfill({ contentType: 'application/json', body: '{}' }));
await p.goto(`${BASE}/${page}`); await p.waitForTimeout(2500); await p.locator('#doors').scrollIntoViewIfNeeded();
ok(await wait(() => { const b = document.querySelector('#doors .lx-ai-hero'); return b && !b.hidden && b.querySelector('video.ai-fill') && /3 มิติ/.test(b.querySelector('.ai-fill-tag').textContent); }), `3D film of ${V} in the band (label ภาพจำลอง 3 มิติ)`);
ok(await wait(() => [...document.querySelectorAll('#doors .pa-door-art')].every(a => a.classList.contains('has-v') && !a.classList.contains('is-ai') && a.querySelector('img.pa-v.in'))), 'all three doors show the pre-rendered stills');
ok(await wait(() => { const im = document.querySelector('#doors .pa-door-art img.pa-v'); return im && im.src.includes(`/assets/stills/${V}-`); }), `stills are this design's own (${V}-…)`);
ok(!errs.length, 'no console errors', errs.slice(0, 3).join(' | '));
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
await b.close(); console.log(fail ? `${page} ${fail} FAILED` : `${page} ALL PASS`); process.exit(fail ? 1 : 0);
