// Rev.10 — request sending (assets/submit.js) for the contact form, the quotation cart and beta feedback.
// Serves a patched submit.js with a fake endpoint and answers it from the test, so no real sheet is touched.
// usage: node tests/submit.mjs [page=a.html]   (dev server on :8765)   modes: ok (Apps Script) · fail · off (ENDPOINT empty = hand-off box) · fs (FormSubmit e-mail)
import { launch, BASE } from './_lib.mjs';
import { readFileSync } from 'node:fs';
const page = process.argv[2] || 'a.html';
const FAKES = { ok: 'https://script.google.com/macros/s/TEST/exec', fail: 'https://script.google.com/macros/s/TEST/exec', fs: 'https://formsubmit.co/ajax/TEST' };
const SRC = readFileSync(new URL('../assets/submit.js', import.meta.url), 'utf8');
const b = await launch();
const results = [];
for (const mode of ['ok', 'fail', 'off', 'fs']) {
  const FAKE = FAKES[mode] || FAKES.ok;
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const posts = [];
  await p.route('**/assets/submit.js', r => r.fulfill({ contentType: 'text/javascript', body: SRC.replace(/export const ENDPOINT = '[^']*';/, `export const ENDPOINT = '${mode === 'off' ? '' : FAKE}';`) }));
  await p.route(FAKE, async r => {
    const d = JSON.parse(r.request().postData() || '{}'); posts.push(mode === 'fs' ? { kind: d['ประเภท'], ref: d['เลขอ้างอิง'], fields: d, ct: r.request().headers()['content-type'] } : d);
    if (mode === 'fs') return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"success":"true","message":"The form was submitted successfully."}' });
    if (mode === 'fail') return r.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":false,"error":"server"}' });
    return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, ref: d.ref }) });
  });
  await p.goto(`${BASE}/${page}#quote`); await p.waitForTimeout(2500);
  const out = { mode };
  // 1 · contact form
  const f = p.locator('#qform');
  const inputs = f.locator('input:not([name="website"]):not([type="hidden"])');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) { const el = inputs.nth(i), t = await el.getAttribute('type'); if (t === 'checkbox' || t === 'radio') continue; await el.fill(t === 'number' ? '2' : t === 'email' ? 'test@example.com' : t === 'tel' || /tel|phone|โทร/i.test((await el.getAttribute('id')) || '') ? '0812345678' : t === 'date' ? '2026-10-20' : 'ทดสอบ'); }
  await f.locator('button:not([type="button"])').first().click();
  await p.waitForTimeout(1500);
  out.contact = (await p.locator('.sx-qout').innerText()).split('\n').slice(0, 2).join(' / ');
  // 2 · quotation cart: add one priced item, then request the formal quotation
  await p.goto(`${BASE}/${page}#prices`); await p.waitForTimeout(3000);
  const add = p.locator('#prices button:has-text("เพิ่ม")').first();
  if (await add.count()) { await add.click(); await p.waitForTimeout(500); }
  await p.evaluate(() => document.querySelector('[data-cart-btn]')?.click()); await p.waitForTimeout(800);
  if (await p.locator('#s-q-name').count()) {
    await p.fill('#s-q-name', 'ทดสอบ ใบเสนอราคา'); await p.fill('#s-q-tel', '0812345678');
    await p.locator('.s-form button[type="submit"]').click(); await p.waitForTimeout(1500);
    out.quote = (await p.locator('.s-cart-b .s-hand').first().innerText()).split('\n').slice(0, 2).join(' / ');
  } else out.quote = 'cart form not found';
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // 3 · beta feedback dialog
  await p.evaluate(() => document.querySelector('.sx-fbb')?.click()); await p.waitForTimeout(500);
  if (await p.locator('.sx-fbf').count()) {
    await p.locator('.sx-fbf input[type="radio"]').first().check(); await p.fill('.sx-fbf textarea', 'ทดสอบความเห็น');
    await p.locator('.sx-fbf button[type="submit"]').click(); await p.waitForTimeout(1500);
    out.feedback = (await p.locator('.sx-dlg .s-hand').first().innerText()).split('\n').slice(0, 2).join(' / ');
  } else out.feedback = 'feedback button not found';
  out.posts = posts.map(d => `${d.kind}:${d.ref}:${Object.keys(d.fields || {}).length}f`);
  out.errors = errs.length;
  results.push(out);
  await p.close();
}
console.log(JSON.stringify({ page, results }, null, 1));
await b.close();
const bad = results.some(r => r.errors) ||
  !results[0].contact.includes('ส่งถึงทีมแล้ว') || !results[0].quote.includes('ส่งถึงทีมแล้ว') || !results[0].feedback.includes('ส่งถึงทีมแล้ว') || results[0].posts.length !== 3 ||
  !results[1].contact.includes('ช่วงทดลองใช้') || results[1].posts.length !== 3 ||
  results[2].posts.length !== 0 || results[2].contact.includes('ส่งถึงทีมแล้ว') ||
  !results[3].contact.includes('ส่งถึงทีมแล้ว') || !results[3].quote.includes('ส่งถึงทีมแล้ว') || !results[3].feedback.includes('ส่งถึงทีมแล้ว') || results[3].posts.length !== 3;
process.exit(bad ? 1 : 0);
