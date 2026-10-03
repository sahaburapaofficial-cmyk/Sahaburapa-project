// e2e: the AC symptom assistant — typed symptoms → triage card → answers rank the likely point → booking carries the result — Rev.21
// usage: node tests/acbot.mjs a.html [width]   (serve the folder first: npm run serve)
import { launch, BASE } from './_lib.mjs';
const [,, page = 'a.html', w = 1366] = process.argv;
const b = await launch(); const p = await b.newPage({ viewport: { width: +w, height: +w < 600 ? 844 : 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::|Failed to load resource/.test(m.text())) errs.push(m.text()); });
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
await p.goto(`${BASE}/${page}`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500);
await p.click('.ab-fab'); await p.waitForTimeout(300);
ok(await p.locator('#ab-panel:not([hidden])').count() === 1, 'panel opens');
ok(await p.locator('.ab-chip').count() >= 14, 'symptom chips listed');
const ask = async q => {   // waits for the new card (the reply comes after a short typing indicator)
  const n = await p.locator('.ab-card').count(); await p.fill('#ab-q', q); await p.press('#ab-q', 'Enter');
  await p.waitForFunction(n => document.querySelectorAll('.ab-card').length > n, n, { timeout: 15000 }).catch(() => {}); return p.locator('.ab-card').last(); };
// the owner's examples
for (const [q, id] of [['น้ำไหล', 'drip'], ['แอร์เปิดไม่ติด', 'dead'], ['แอร์ไม่เย็น', 'warm'], ['แอร์เป็นน้ำแข็ง', 'ice'], ['เบรกเกอร์ตัด', 'trip']]) {
  const c = await ask(q); ok(await c.getAttribute('data-sym') === id, `"${q}" → card ${id}`);
}
// answer the drip questions: no water at the outside end, under the unit, wall type → drain clog first, Pricebook 900
let c = await ask('แอร์น้ำหยดใส่เตียง');
const pick = async (card, label) => { await card.locator('.ab-o', { hasText: label }).first().click(); await p.waitForTimeout(120); };
await pick(c, 'ไม่มีน้ำออก'); await pick(c, 'ใต้ตัวเครื่อง'); await pick(c, 'ติดผนัง');
const first = (await c.locator('.ab-causes li').first().innerText()).split('\n')[0];
ok(/ท่อน้ำทิ้งหรือถาดน้ำทิ้งอุดตัน/.test(first), 'drip answers → drain clog first: ' + first);
ok(/แก้ท่อน้ำทิ้งตัน[\s\S]*฿900/.test(await c.locator('.ab-jobs').innerText()), 'Pricebook line ฿900 shown');
ok(await c.locator('.ab-o.on[aria-checked="true"]').count() === 3, 'chosen answers marked (aria-checked)');
// breaker trips at once → urgent banner
c = await ask('เบรกเกอร์ตัด'); await pick(c, 'ตัดทันทีที่ยกขึ้น');
ok(await c.locator('.ab-urgent').count() === 1, 'short circuit → urgent safety banner');
// warm, outdoor unit runs, not cleaned for a year → cleaning recommended + book cleaning button
c = await ask('แอร์ไม่ค่อยเย็น มีแต่ลม'); await pick(c, 'ทำงานปกติ'); await pick(c, 'เกิน 1 ปี'); await pick(c, 'ไม่เห็น');
ok(await c.locator('.ab-cleanrec').count() === 1 && await c.locator('.ab-acts button', { hasText: 'จองล้างแอร์' }).count() === 1, 'dirty first → clean recommendation');
// AC type remembered across cards (answered ติดผนัง above)
ok(await c.locator('.ab-o.on', { hasText: 'ติดผนัง' }).count() === 1, 'AC type remembered between symptoms');
// unknown text → fallback
c = null; await p.fill('#ab-q', 'แอร์บินได้ไหม'); await p.press('#ab-q', 'Enter'); await p.waitForFunction(() => /ยังไม่พบอาการ/.test(document.querySelector('.ab-log').innerText), null, { timeout: 15000 }).catch(() => {});
ok(/ยังไม่พบอาการที่ตรงกับข้อความนี้/.test(await p.locator('.ab-bot').last().innerText()), 'unknown text → fallback + chips');
// ice: big unit → diagnosis 1,200 → book → cart has the line, the ticket shows the result and the symptom
c = await ask('น้ำแข็งเกาะท่อ'); await pick(c, 'ไม่เกิน 6 เดือน'); await pick(c, 'แรงปกติ'); await pick(c, 'ที่ท่อหรือวาล์ว'); await pick(c, 'แขวน / สี่ทิศทาง');
ok(/น้ำยาแอร์ไม่พอ/.test(await c.locator('.ab-causes li').first().innerText()), 'ice on pipe, strong air, recently cleaned → refrigerant first');
await c.locator('.ab-book').click(); await p.waitForTimeout(900);
ok(await p.locator('#ab-panel[hidden]').count() === 1, 'panel closes on booking');
const cart = p.locator('.s-cart:not([hidden])');
ok(await cart.count() === 1, 'quotation drawer opens');
const ct = await cart.innerText();
ok(/ตรวจวินิจฉัย.*(แขวน|ฝังฝ้า|สี่ทิศทาง)/.test(ct), 'diagnosis line for ceiling/cassette in the cart');
ok(await cart.locator('.tk-diag').count() === 1 && /น้ำแข็ง/.test(await cart.locator('.tk-diag').innerText()), 'ticket shows the assistant result');
ok(await cart.locator('.tk-o.on', { hasText: 'น้ำแข็งเกาะ' }).count() === 1, 'ticket symptom preselected (น้ำแข็งเกาะ)');
const st = await p.evaluate(() => JSON.parse(localStorage.getItem('sbp-booking-v1') || '{}'));
ok(st.draft && st.draft.diag && /จุดที่น่าจะเป็น/.test(st.draft.diag.text), 'result kept in the booking draft');
// change mind → wall unit → the 1,200 line is swapped, not doubled
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await p.click('.ab-fab'); await p.waitForTimeout(300);
c = await ask('น้ำแข็งเกาะ'); await pick(c, 'ติดผนัง'); await c.locator('.ab-book').click(); await p.waitForTimeout(900);
const lines = await p.evaluate(() => JSON.parse(localStorage.getItem('sbp-quote-v2')).items.filter(i => /ตรวจวินิจฉัย/.test(i.name)).map(i => i.name + ' x' + i.qty));
ok(lines.length === 1 && /ติดผนัง/.test(lines[0]), 'diagnosis line swapped on type change: ' + lines.join(' | '));
await p.screenshot({ path: process.env.SHOT || '/dev/null' }).catch(() => {});
ok(!errs.length, 'no page errors ' + errs.join(' | '));
console.log(fail ? `\n${page}: ${fail} FAIL` : `\n${page}: ALL PASS`);
await b.close(); process.exit(fail ? 1 : 0);
