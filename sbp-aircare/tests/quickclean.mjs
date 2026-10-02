// Rev.11 — quick cleaning booking (assets/quickclean.js): the live total must equal the quotation cart's total for the same
// lines (same rules: VAT, cleaning minimum per visit, travel by zone), and "จองล้างแอร์" must put exactly those lines in the
// cart, carry the zone and the preferred date over, and replace (not duplicate) them when pressed again.
// Rev.15: and the queue rules (คิวด่วน +500 before VAT within 3 days, one line per visit, gone again for a normal date).
// usage: node tests/quickclean.mjs [page=a.html] [width=1366]   (dev server on :8765, or BASE=…)
import { launch, BASE } from './_lib.mjs';
const [,, page = 'a.html', w = '1366'] = process.argv;
const b = await launch();
const p = await b.newPage({ viewport: { width: +w, height: 900 }, isMobile: +w < 500, hasTouch: +w < 500 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
await p.goto(`${BASE}/${page}#book`); await p.waitForTimeout(2500);
await p.evaluate(() => localStorage.removeItem('sbp-quote-v2'));
const baht = s => +String(s).replace(/[^\d]/g, '');
const total = async () => baht(await p.locator('.qc-total b').innerText());
const out = { page, w: +w };
out.start = await total();                                                   // 1 wall unit → raised to the cleaning minimum
await p.click('#bookRoot button[aria-label="เพิ่ม ติดผนัง"]'); await p.click('#bookRoot button[aria-label="เพิ่ม แขวนใต้ฝ้า"]');
await p.locator('#bookRoot .qc-seg button', { hasText: 'ล้างใหญ่' }).click();
await p.fill('#qc-zone', 'ศรีราชา'); await p.fill('#qc-date', '2026-11-20'); await p.dispatchEvent('#qc-date', 'change'); await p.waitForTimeout(600);
out.quick = await total();
await p.locator('.qc-go').click(); await p.waitForTimeout(800);
const cart = await p.evaluate(() => { const j = JSON.parse(localStorage.getItem('sbp-quote-v2')); return { n: j.items.length, qty: j.items.reduce((s, i) => s + i.qty, 0), zone: j.zoneInput, date: document.getElementById('s-q-date')?.value || '' }; });
out.cart = cart;
out.cartTotal = baht(await p.locator('.s-cart .tot').last().innerText());
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await p.locator('.qc-go').click(); await p.waitForTimeout(600);                // pressing again must not duplicate
out.again = await p.evaluate(() => JSON.parse(localStorage.getItem('sbp-quote-v2')).items.reduce((s, i) => s + i.qty, 0));
// Rev.15 queue rules: "พรุ่งนี้" is a rush date → +500 before VAT (535) on the live total and one fixed "คิวด่วน" line in the cart;
// back to the earliest normal date → no rush line
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
const norm = await total();
await p.locator('.qc-chip', { hasText: 'พรุ่งนี้' }).click(); await p.waitForTimeout(300);
out.rushAdds = (await total()) - norm;
await p.locator('.qc-go').click(); await p.waitForTimeout(600);
out.rushLine = await p.evaluate(() => JSON.parse(localStorage.getItem('sbp-quote-v2')).items.filter(i => i.group === 'rush').length);
out.rushCart = baht(await p.locator('.s-cart .tot').last().innerText()) === await total();
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await p.locator('.qc-chip', { hasText: 'เร็วสุดแบบจองปกติ' }).click(); await p.locator('.qc-go').click(); await p.waitForTimeout(600);
out.rushGone = await p.evaluate(() => JSON.parse(localStorage.getItem('sbp-quote-v2')).items.filter(i => i.group === 'rush').length) === 0;
out.lineHref = (await p.locator('.qc-line').getAttribute('href')).slice(0, 48);
out.errors = errs.length; if (errs.length) out.err = errs.slice(0, 3);
console.log(JSON.stringify(out));
await b.close();
const bad = errs.length || !(out.start > 0) || out.quick !== out.cartTotal || cart.n !== 2 || cart.qty !== 3 || cart.zone !== 'ศรีราชา' || cart.date !== '2026-11-20' || out.again !== 3 || out.rushAdds !== 535 || out.rushLine !== 1 || !out.rushCart || !out.rushGone || !out.lineHref.startsWith('https://line.me/R/oaMessage/%40sahaservices/');
process.exit(bad ? 1 : 0);
