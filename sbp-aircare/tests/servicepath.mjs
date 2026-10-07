// Rev.38 — D/E/F service journeys: three doors on the home page → six-step path on the services page; every figure shown equals
// the shared constants (clean "from" price, minimum bill, trip fee, rush fee, lead days, diagnosis fee, install from price).
// usage: node tests/servicepath.mjs d.html [mobile]
import { launch, BASE } from './_lib.mjs';
const page = process.argv[2] || 'd.html', M = process.argv[3] === 'mobile';
const b = await launch();
const p = await (await b.newContext(M ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } })).newPage();
p.setDefaultTimeout(30000);
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 160)); });
let fail = 0; const ok = (c, m, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (c ? '' : ' — ' + x)); if (!c) fail++; };
const act = l => M ? l.tap({ timeout: 60000 }) : l.click({ timeout: 60000 });
await p.goto(`${BASE}/${page}`); await p.waitForTimeout(3000);
const K = await p.evaluate(async () => {
  const c = await import('./assets/sbp-core.js'), q = await import('./assets/quickclean.js'), a = await import('./assets/acdiag.js');
  const d = a.diagLine('wall'), ins = c.DATA.instByCode['INS-W-9000-12000-STANDARD'];
  return { from: c.baht(q.cleanFrom()), min: c.baht(c.DATA.minBill), trip: c.baht(c.TRAVEL.baseFee), rush: c.baht(c.QUEUE_RULES.rushFeeEx), lead: c.QUEUE_RULES.leadDays, diag: d && c.baht(d.rate.s), ins: ins && c.baht(ins.ex) };
});
const doors = p.locator('#doors .pa-door');
ok(await doors.count() === 3, 'home: three service doors');
const dt = await doors.allInnerTexts();
ok(dt[0].includes(`เริ่ม ${K.from} ก่อน VAT`), `clean door price = cleanFrom ${K.from}`, dt[0].slice(0, 200));
ok(!K.ins || dt[1].includes(K.ins), `install door price = INS-W 9–12k standard ${K.ins}`);
ok(!K.diag || dt[2].includes(K.diag), `repair door = diagnosis fee ${K.diag}`);
ok(dt.every(t => /เหมาะเมื่อ/.test(t) && /เวลา/.test(t)), 'each door: meaning · when · time · price');
// Rev.46: D/F give each service its own page (#pathsClean / #pathsInstall / #pathsRepair, no tabs); E keeps one #paths with tabs
const SPLIT = await p.evaluate(() => !!document.getElementById('pathsRepair'));
const R = k => SPLIT ? '#paths' + k[0].toUpperCase() + k.slice(1) : '#paths';
await doors.nth(2).scrollIntoViewIfNeeded(); await act(doors.nth(2));
await p.waitForFunction(sel => { const s = document.querySelector(sel); if (!s || s.closest('[hidden]')) return false; const r = s.getBoundingClientRect(); return r.top < innerHeight * 0.7 && r.bottom > 0; }, R('repair'), { timeout: 20000, polling: 250 }).catch(() => {});
ok(await p.evaluate(() => document.documentElement.dataset.sxView) === (SPLIT ? 'repair' : 'service'), `repair door → ${SPLIT ? 'repair' : 'services'} page`);
if (SPLIT) ok(await p.locator(R('repair') + ' .pa-tabs').evaluate(e => e.hidden), 'own repair page: no service tabs');
else ok((await p.locator('#paths .pa-tab[aria-selected=true]').innerText()).includes('ซ่อมแอร์'), 'the repair journey is open');
const steps = k => p.locator(R(k) + ' .pa-list button'), card = k => p.locator(R(k) + ' .pa-card-b');
ok(await steps('repair').count() === 6, 'six steps');
await act(steps('repair').nth(3)); const t4 = await card('repair').innerText();
ok(/อนุมัติ/.test(t4), 'repair step 4: price approved before any repair (rule 13)');
const goSvc = async k => { if (SPLIT) { await p.evaluate(k => { const s = document.getElementById('p' + k); s.scrollIntoView({ behavior: 'instant' }); }, k); await p.waitForFunction(k => document.documentElement.dataset.sxView === k, k, { timeout: 15000 }); } else await act(p.locator('#paths .pa-tab', { hasText: k === 'clean' ? 'ล้างแอร์' : 'ติดตั้งแอร์' })); };
await goSvc('clean');
await act(steps('clean').nth(1)); const t2 = await card('clean').innerText();
ok(t2.includes(K.min) && t2.includes(K.trip), `clean step 2: minimum ${K.min} and trip ${K.trip}`, t2.slice(0, 300));
await act(steps('clean').nth(2)); const t3 = await card('clean').innerText();
ok(t3.includes(`${K.lead} วัน`) && t3.includes(K.rush), `clean step 3: ${K.lead} days ahead, rush +${K.rush}`);
await goSvc('install'); await act(steps('install').nth(5));
ok(/3 ปี/.test(await card('install').innerText()), 'install step 6: warranty 3 years / 1 year (rule 10)');
const bad = ['แก้หายแน่นอน', 'ประหยัดไฟแน่นอน', 'ปลอดเชื้อ', 'สะอาด 100%', 'รับประกันเย็น', 'ไม่มีค่าใช้จ่ายเพิ่มเติมทุกกรณี'];
const all = await p.evaluate(() => [...document.querySelectorAll('#paths, #pathsClean, #pathsInstall, #pathsRepair, #doors')].map(e => e.innerText).join(' '));
ok(!bad.some(w => all.includes(w)), 'no forbidden promise wording (rule 11)');
// Rev.39/40: the step picture becomes a rendered 3D still; the customer can turn it left · front · right
// (software GL — like this test machine — keeps the line art: one still would block the page for seconds)
const soft = await p.evaluate(() => { try { const g = document.createElement('canvas').getContext('webgl'), d = g && g.getExtension('WEBGL_debug_renderer_info'); const r = d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : ''; g && g.getExtension('WEBGL_lose_context')?.loseContext(); return /swiftshader|llvmpipe|software|basic render/i.test(r); } catch (e) { return false; } });
const v3 = soft ? false : await p.waitForFunction(r => document.querySelector(r + ' img.pa-v.in') && !document.querySelector(r + ' .pa-view').hidden, R('install'), { timeout: 60000, polling: 500 }).then(() => true, () => false);
if (soft) ok(await p.waitForFunction(r => document.querySelector(r + ' img.pa-v.in') && document.querySelector(r + ' .pa-view').hidden, R('install'), { timeout: 30000, polling: 500 }).then(() => true, () => false), 'software GL: pre-rendered 3D still shown, angle buttons hidden (no live render)');
else ok(v3, '3D still shown in the journey + angle buttons');
if (v3) { await act(p.locator(R('install') + ' .pa-view button', { hasText: 'มุมขวา' }));
  ok(await p.waitForFunction(r => document.querySelector(r + ' .pa-art').dataset.want.endsWith('|1') && document.querySelector(r + ' .pa-view [data-v="1"]').getAttribute('aria-pressed') === 'true', R('install'), { timeout: 5000 }).then(() => true, () => false), 'angle button turns the still to the right view');
  ok(await p.waitForFunction(r => [...document.querySelectorAll(r + ' img.pa-v.in')].some(i => !i.classList.contains('out')), R('install'), { timeout: 240000, polling: 1000 }).then(() => true, () => false), 'right view rendered'); }
ok((await p.locator(R('install') + ' .pa-facts li').count()) >= 1, 'key facts shown as chips');
await act(p.locator(R('install') + ' .pa-go'));
ok(await p.waitForFunction(() => { const s = document.getElementById('standards'); const r = s.getBoundingClientRect(); return !s.closest('[hidden]') && r.top < innerHeight && r.bottom > 0; }, null, { timeout: 20000, polling: 250 }).then(() => true, () => false), 'step button → the matching section (standards)');
ok(!errs.length, 'no console errors / warnings', errs.slice(0, 3).join(' | '));
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
await b.close(); console.log(fail ? `${page} ${fail} FAILED` : `${page} ALL PASS`); process.exit(fail ? 1 : 0);
