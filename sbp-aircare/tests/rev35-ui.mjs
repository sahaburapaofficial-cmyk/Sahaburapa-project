// Rev.35 — the new pieces in the browser: A แอร์ของฉัน → booking · B BOQ = quotation total + copy · C wall try-on drag / type ·
// D E F "ในหน้านี้" dock. usage: node tests/rev35-ui.mjs a.html [mobile|desktop]
import { launch, BASE } from './_lib.mjs';
const page = process.argv[2] || 'a.html', M = process.argv[3] === 'mobile', v = page[0];
const b = await launch();
const p = await (await b.newContext(M ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } })).newPage();
p.setDefaultTimeout(20000);
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
let fail = 0; const ok = (c, m, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (c ? '' : ' — ' + x)); if (!c) fail++; };
const act = l => M ? l.tap() : l.click();
const wait = ms => p.waitForTimeout(ms);
const inView = sel => p.waitForFunction(s => { const r = document.querySelector(s).getBoundingClientRect(); return r.top < innerHeight * 0.6 && r.bottom > 80; }, sel, { timeout: 15000, polling: 250 }).then(() => true, () => false);

if (v === 'a') {
  await p.goto(`${BASE}/a.html#myac`); await wait(2500);
  const sel = p.locator('#myac .ma-unit select').nth(3);
  await sel.selectOption('24'); await wait(300);
  ok(await p.locator('#myac .ma-unit.ma-due').count() === 1, 'แอร์ของฉัน: last cleaned 2 years ago → "ถึงรอบล้างแล้ว"');
  await act(p.locator('#myac .ma-add')); await wait(300);
  ok(await p.locator('#myac .ma-unit').count() === 2, 'add a unit → 2 tiles');
  const go = p.locator('#myac .ma-go'); ok(/จองล้าง 2 เครื่อง/.test(await go.textContent()), 'button books the 2 due units', await go.textContent());
  await act(go); ok(await inView('#book'), 'button → the booking section on screen');
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('sbp-myac-v1')).units.length);
  ok(kept === 2, 'units kept in this browser (localStorage) for the next visit');
}
if (v === 'b') {
  await p.goto(`${BASE}/b.html#boq`); await wait(2500);
  ok(await p.locator('#boq .bq-empty').count() === 1, 'BOQ empty state before any line');
  await p.evaluate(async () => { const { cart } = await import('./assets/commerce.js'); cart.add({ key: 'QC-t', name: 'ล้างแอร์ติดผนัง', group: 'clean', kind: 'service', qty: 2, unitEx: 700 }); });
  await wait(500);
  const want = await p.evaluate(async () => { const { cart, quoteTotals } = await import('./assets/commerce.js'); return quoteTotals(cart.items, cart.zone).inc; });
  const got = (await p.locator('#boq .bq-tot td').last().textContent()).replace(/[^\d]/g, '');
  ok(+got === want, `BOQ total = quotation total ฿${want}`, got);
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await act(p.locator('#boq .bq-acts .s-btn.primary')); await wait(500);
  ok(/คัดลอก/.test(await p.locator('#boq .bq-out').textContent()), 'copy button answers in the status line');
}
if (v === 'c') {
  await p.goto(`${BASE}/c.html#wallfit`); await wait(2500);
  const u = p.locator('#wallfit .wf-unit'); await u.scrollIntoViewIfNeeded(); await wait(300);
  const b0 = await u.boundingBox();
  if (M) { await u.dispatchEvent('pointerdown', { clientX: b0.x + b0.width / 2, clientY: b0.y + 5, pointerId: 1 }); await u.dispatchEvent('pointermove', { clientX: b0.x + b0.width / 2 - 60, clientY: b0.y + 25, pointerId: 1 }); await u.dispatchEvent('pointerup', { pointerId: 1 }); }
  else { await p.mouse.move(b0.x + b0.width / 2, b0.y + 5); await p.mouse.down(); await p.mouse.move(b0.x + b0.width / 2 - 120, b0.y + 40, { steps: 6 }); await p.mouse.up(); }
  const b1 = await u.boundingBox();
  ok(b1.x < b0.x - 20, 'drag moves the unit on the wall', `${b0.x} → ${b1.x}`);
  await u.focus(); await p.keyboard.press('ArrowRight'); await wait(100);
  ok((await u.boundingBox()).x > b1.x, 'arrow key moves it too');
  const w0 = b1.width;
  await act(p.locator('#wallfit input[type=range]')).catch(() => {}); await p.locator('#wallfit input[type=range]').fill('2.5'); await wait(200);
  ok((await u.boundingBox()).width > w0 * 1.2, 'narrower wall in the photo → the unit is drawn bigger (same real size)');
  await act(p.locator('#wallfit .wf-seg button', { hasText: 'ตู้ตั้งพื้น' })); await wait(200);
  const tag = await p.locator('#wallfit .wf-tag').textContent();
  ok(/× 1[78]\d ซม/.test(tag), 'floor-standing: a tall unit (~1.75–1.85 m)', tag);
  ok(/ไม่ถูกส่ง/.test(await p.locator('#wallfit').textContent()), 'says the photo stays on this device');
}
if ('def'.includes(v)) {
  await p.goto(`${BASE}/${page}#service`); await wait(3000);
  const n = await p.locator('.lx-dock a').count();
  if (M) ok(!(await p.locator('.lx-dock').isVisible()), 'phone: no dock (menu sheet + jump links instead)');
  else {
    ok(n >= 3 && await p.locator('.lx-dock').isVisible(), `dock lists the sections of this page (${n})`);
    const last = p.locator('.lx-dock a').last(), id = (await last.getAttribute('href')).slice(1);
    await p.locator('.lx-dock').hover(); await last.click();
    ok(await inView('#' + id), `dock → #${id} on screen`, JSON.stringify(await p.evaluate(s => [scrollY, Math.round(document.getElementById(s).getBoundingClientRect().top), location.hash], id)));
    ok(await p.waitForFunction(() => { const a = document.querySelector('.lx-dock a[aria-current]'); return a && a === document.querySelector('.lx-dock a:last-child'); }, null, { timeout: 15000 }).then(() => true, () => false), 'the section being read is lit');
    await p.locator('header nav a', { hasText: 'ซื้อแอร์' }).first().click({ timeout: 60000 }); await wait(800);   // software GL in the test machine: a 3D scene on screen can hold the page for seconds
    ok(await p.evaluate(() => [...document.querySelectorAll('.lx-dock a')].some(a => a.getAttribute('href') === '#catalog')), 'another page → the dock lists that page');
  }
}
ok(!errs.length, 'no console / page errors', errs.slice(0, 3).join(' | '));
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
await b.close(); console.log(fail ? `${page} ${fail} FAILED` : `${page} ALL PASS`); process.exit(fail ? 1 : 0);
