// Rev.30 — the four-question consultation on every design: answer it, get a plan from the Pricebook constants, open the cleaning
// form already holding the number of units for the type the customer picks. node tests/concierge.mjs a.html [w]
import { launch, BASE } from './_lib.mjs';
const [,, page = 'a.html', w = 1366] = process.argv;
const b = await launch(); const p = await b.newPage({ viewport: { width: +w, height: +w < 600 ? 844 : 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::|Failed to load resource/.test(m.text())) errs.push(m.text()); });
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
await p.goto(`${BASE}/${page}`); await p.evaluate(() => localStorage.clear()); await p.goto(`${BASE}/${page}`); await p.waitForTimeout(3000);
const lux = await p.evaluate(() => !!document.documentElement.dataset.lux);
if (await p.locator('.s-con > summary').count()) { await p.evaluate(() => document.getElementById('start').scrollIntoView()); await p.locator('.s-con > summary').click(); }   // A · B · C · D · F: under the intent picker (E: its hero)
const C = p.locator('.at-con').first();
await C.waitFor({ timeout: 15000 });
const pick = async th => { await C.locator('.at-opt', { hasText: th }).first().click(); await p.waitForTimeout(80); };
await pick('คอนโด'); await pick('2–3 เครื่อง'); await pick('ไม่ได้ล้างนาน'); await pick('มีกลิ่น');
await C.locator('.at-nav .btn-primary').click(); await p.waitForTimeout(80);
await pick('ด่วน ภายใน 3 วัน');
const recs = await C.locator('.at-recs li').allInnerTexts();
ok(recs.length >= 3, `plan with ${recs.length} steps`);
ok(recs.some(r => /เช็กอาการ/.test(r)) && recs.some(r => /ล้างแอร์ 3 เครื่อง/.test(r)) && recs.some(r => /คิวด่วน/.test(r) && /฿500/.test(r)), 'smell → symptom check · cleaning for 3 units · rush fee ฿500');
ok(!recs.join(' ').match(/แน่นอน|ปลอดเชื้อ|100%|ส่วนลด/), 'no promise words');
await C.locator('.at-types button', { hasText: 'แขวนใต้ฝ้า' }).click(); await p.waitForTimeout(900);
const counts = await p.evaluate(() => [...document.querySelectorAll('#bookRoot output')].map(o => o.textContent));
ok(counts.includes('3') && counts.filter(x => x !== '0').length === 1, `booking form opened with 3 ceiling units (counts ${counts.join('/')})`);
const inView = await p.evaluate(() => { const r = document.getElementById('book').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
ok(inView, 'the booking section is on screen');
ok(!errs.length, 'no console errors ' + errs.slice(0, 2).join(' | '));
console.log(fail ? `${page}: ${fail} FAIL` : `${page}: ALL PASS`);
await b.close(); process.exit(fail ? 1 : 0);
