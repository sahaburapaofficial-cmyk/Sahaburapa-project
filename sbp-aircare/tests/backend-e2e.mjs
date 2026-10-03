// Rev.19 — the whole request flow against the real Code.gs + Board.html (backend/test/gas-emulator.mjs), for every model:
// setup() → selfTest() → per page: contact form · job ticket with a photo · beta feedback · status lookup on the site →
// back-office board confirms the visit → the same date / slot shows "คิวเต็มแล้ว" on the site. Prints PASS / FAIL per step.
// usage: node tests/backend-e2e.mjs [pages=a.html,b.html,c.html] [shots dir]   (dev server on :8765)
import { launch, BASE } from './_lib.mjs';
import { mkdirSync } from 'node:fs';
import { createGas, serve } from '../backend/test/gas-emulator.mjs';

const pages = (process.argv[2] || 'a.html,b.html,c.html').split(',');
const SHOTS = process.argv[3] || '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
// the pages talk to a script.google.com /exec address (the only kind submit.js accepts); the browser context forwards it to the emulator
const PORT = 8790, EXEC = 'https://script.google.com/macros/s/LOCAL-EMULATOR/exec', LOCAL = `http://127.0.0.1:${PORT}`;
const forward = async r => { const u = new URL(r.request().url()), path = u.pathname.endsWith('/exec') ? '/exec' : u.pathname;
  const res = await fetch(LOCAL + path + u.search, { method: r.request().method(), body: r.request().postData() || undefined });
  r.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) }); };
const gas = createGas(); gas.setServiceUrl(EXEC);
const srv = await serve(gas, PORT);
const out = [], ok = (name, cond, info = '') => { out.push(`${cond ? 'PASS' : 'FAIL'} ${name}${info ? ' · ' + info : ''}`); console.log(out.at(-1)); };

const su = gas.call('setup'); ok('setup(): แท็บ + โฟลเดอร์รูป + BOARD_KEY', !!su.boardKey && ['ใบเสนอราคา', 'ติดต่อ', 'ความเห็น', 'งานจอง', 'คิว'].every(t => gas.state.sheets.has(t)));
const st = gas.call('selfTest'); ok('selfTest(): ' + st.filter(l => l.startsWith('PASS')).length + ' PASS', st.every(l => !l.startsWith('FAIL')), st.filter(l => l.startsWith('FAIL')).join(' | '));
const KEY = su.boardKey;
const j = async q => (await fetch(`${LOCAL}/exec?${q}`)).json();

const b = await launch();
const tabRows = name => (gas.dump().tabs[name] || []);
const col = (name, k) => tabRows(name)[0].indexOf(k);
for (const page of pages) {
  const V = page[0].toUpperCase();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://script.google.com/**', forward);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route(`**/${page}`, async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace('<head>', `<head><meta name="sbp-backend" content="${EXEC}">`) }); });
  const img = await (async () => { await p.setContent('<div style="width:320px;height:240px;background:linear-gradient(135deg,#3b82f6,#f59e0b)"></div>'); return p.screenshot({ clip: { x: 0, y: 0, width: 320, height: 240 } }); })();

  // 1 · contact form
  await p.goto(`${BASE}/${page}#quote`); await p.waitForTimeout(2500);
  const f = p.locator('#qform'), ins = f.locator('input:not([name="website"]):not([type="hidden"])');
  for (let i = 0, n = await ins.count(); i < n; i++) { const el = ins.nth(i), t = await el.getAttribute('type'); if (t === 'checkbox' || t === 'radio') continue; await el.fill(t === 'number' ? '2' : t === 'email' ? 'test@example.com' : t === 'tel' || /tel|phone/i.test((await el.getAttribute('id')) || '') ? '0812345678' : t === 'date' ? '2026-10-20' : `ทดสอบติดต่อ ${V}`); }
  await f.locator('button:not([type="button"])').first().click(); await p.waitForTimeout(1500);
  const cRows = tabRows('ติดต่อ');
  ok(`${V} ฟอร์มติดต่อ → แท็บ "ติดต่อ"`, (await p.locator('.sx-qout').innerText()).includes('ส่งถึงทีมแล้ว') && cRows.some(r => r[col('ติดต่อ', 'แบบ')] === V));
  const telCol = cRows[0].findIndex(k => /^(โทร|เบอร์)/.test(k));
  ok(`${V} เบอร์โทรเก็บเป็นข้อความ (เลข 0 นำหน้าไม่หาย)`, telCol < 0 || cRows.slice(1).every(r => !r[telCol] || String(r[telCol]).startsWith('0')), telCol < 0 ? 'no tel column' : cRows.at(-1)[telCol]);
  ok(`${V} ช่องตรวจสถานะแสดง (เชื่อมระบบแล้ว)`, await p.locator('.sx-track').count() === 1);

  // 2 · job ticket with a photo (cleaning line from the price table)
  await p.goto(`${BASE}/${page}#prices`); await p.waitForTimeout(3000);
  await p.evaluate(() => { localStorage.clear(); });
  await p.locator('#prices button:has-text("เพิ่ม")').first().click(); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('[data-cart-btn]')?.click()); await p.waitForTimeout(800);
  const date = await p.evaluate(n => { const d = new Date(Date.now() + (9 + n * 2) * 864e5); if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }, pages.indexOf(page));
  await p.fill('#s-q-date', date); await p.dispatchEvent('#s-q-date', 'change'); await p.waitForTimeout(600);
  await p.fill('#s-cart-zone', 'บางขุนเทียน'); await p.waitForTimeout(500);
  await p.locator('#tk-file').setInputFiles({ name: 'site.png', mimeType: 'image/png', buffer: img }); await p.waitForTimeout(1200);
  const thumbs = await p.locator('.tk-thumbs img').count();
  await p.fill('#s-q-addr', '99/1 ถนนพระราม 2 แขวงแสมดำ'); await p.fill('#s-q-name', `ทดสอบจองงาน ${V}`); await p.fill('#s-q-tel', '0812345678');
  if (await p.locator('#s-q-line').count()) await p.fill('#s-q-line', 'sbp-test');
  await p.locator('.s-form button[type="submit"]').click(); await p.waitForTimeout(2500);
  const okBox = p.locator('.s-cart-b .s-hand-ok');
  const okTxt = await okBox.count() ? await okBox.innerText() : await p.locator('.s-cart-b .s-hand').first().innerText().catch(() => '(no box)');
  const ref = (/เลขอ้างอิง\s+([A-Z]\d+)/.exec(okTxt) || [])[1] || '';
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${V}-booking-sent.png` });
  const bRows = tabRows('งานจอง'), H = bRows[0], row = bRows.find(r => r[H.indexOf('เลขอ้างอิง')] === ref) || [];
  const files = gas.dump().files.filter(x => x.folder === ref);
  ok(`${V} ใบจองงาน → "ส่งถึงทีมแล้ว" + เลขอ้างอิง`, /ส่งถึงทีมแล้ว/.test(okTxt) && /^B\d+/.test(ref), ref || okTxt.slice(0, 80));
  ok(`${V} รูปแนบในหน้าเว็บ ${thumbs} รูป → Drive ${files.length} ไฟล์`, thumbs === 1 && files.length === 1 && files[0].type === 'image/jpeg', files.map(x => x.name + ' ' + x.size + 'B').join(','));
  const need = ['ชื่อ / บริษัท', 'โทร', 'วันที่สะดวก', 'ช่วงเวลา', 'พื้นที่', 'ที่อยู่หน้างาน', 'งาน', 'ขอบเขต', 'รูป', 'สรุป'];
  const empty = need.filter(k => !row[H.indexOf(k)]);
  ok(`${V} แถวในแท็บ "งานจอง" ครบช่อง`, !!row.length && !empty.length, empty.length ? 'ว่าง: ' + empty.join(', ') : `วัน ${row[H.indexOf('วันที่สะดวก')]} ${row[H.indexOf('ช่วงเวลา')]} · ${row[H.indexOf('ขอบเขต')]}`);
  ok(`${V} วันที่สะดวกเก็บเป็นข้อความ yyyy-mm-dd`, row[H.indexOf('วันที่สะดวก')] === date, row[H.indexOf('วันที่สะดวก')]);
  ok(`${V} แจ้งเตือนอีเมลทีม`, gas.state.mail.some(m => m.subject.includes(ref)));
  const slotTh = row[H.indexOf('ช่วงเวลา')];

  // 3 · beta feedback
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.sx-fbb')?.click()); await p.waitForTimeout(500);
  if (await p.locator('.sx-fbf').count()) {
    await p.locator('.sx-fbf input[type="radio"]').first().check(); await p.fill('.sx-fbf textarea', `ทดสอบความเห็น ${V}`);
    await p.locator('.sx-fbf button[type="submit"]').click(); await p.waitForTimeout(1500);
    ok(`${V} ความเห็นทดลองใช้ → แท็บ "ความเห็น"`, tabRows('ความเห็น').some(r => r.includes(V)));
    await p.keyboard.press('Escape');
  } else ok(`${V} ความเห็นทดลองใช้`, false, 'button not found');

  // 4 · status lookup on the site
  await p.goto(`${BASE}/${page}#quote`); await p.waitForTimeout(2000);
  const tr = p.locator('.sx-track');
  await tr.locator('input').nth(0).fill(ref); await tr.locator('input').nth(1).fill('5678'); await tr.locator('button').click(); await p.waitForTimeout(1200);
  ok(`${V} ตรวจสถานะบนเว็บ (เลขอ้างอิง + เบอร์ 4 ตัวท้าย)`, (await tr.locator('p').innerText()).includes('สถานะ: ใหม่'), await tr.locator('p').innerText());
  await tr.locator('input').nth(1).fill('0000'); await tr.locator('button').click(); await p.waitForTimeout(1200);
  ok(`${V} เบอร์ไม่ตรง → ไม่บอกสถานะ`, (await tr.locator('p').innerText()).includes('ไม่พบ'));

  // 5 · back office board: the new ticket is there → confirm the visit
  const bp = await ctx.newPage(); bp.on('pageerror', e => errs.push('board: ' + e.message)); bp.on('dialog', d => d.accept());
  await bp.setViewportSize({ width: 1100, height: 900 });
  await bp.goto(`${EXEC}?view=board&key=${KEY}`); await bp.waitForTimeout(1200);
  const card = bp.locator(`article[data-ref="${ref}"]`);
  ok(`${V} บอร์ดหลังบ้านเห็นงาน ${ref}`, await card.count() === 1);
  if (SHOTS) await bp.screenshot({ path: `${SHOTS}/${V}-board.png`, fullPage: false });
  await card.locator('select[name="สถานะ"]').selectOption('ยืนยันคิว');
  await card.locator('input[name="ราคาเพิ่มที่แจ้ง (ก่อน VAT)"]').fill('0');
  await card.locator('input[name="นัดวัน"]').fill(date);
  await card.locator('select[name="นัดช่วง"]').selectOption(slotTh || 'ช่วงเช้า');
  await card.locator('textarea[name="หมายเหตุทีม"]').fill('ทดสอบยืนยันคิว');
  await card.locator('.save').click(); await bp.waitForTimeout(1500);
  const bRow2 = tabRows('งานจอง').find(r => r[H.indexOf('เลขอ้างอิง')] === ref);
  ok(`${V} บอร์ดบันทึกสถานะ/นัดวัน`, bRow2[H.indexOf('สถานะ')] === 'ยืนยันคิว' && bRow2[H.indexOf('นัดวัน')] === date, `${bRow2[H.indexOf('สถานะ')]} ${bRow2[H.indexOf('นัดวัน')]} ${bRow2[H.indexOf('นัดช่วง')]}`);
  const sl = await j('q=slots');
  const want = /ทั้งวัน/.test(slotTh) ? { am: false, pm: false } : /บ่าย/.test(slotTh) ? { pm: false } : { am: false };
  ok(`${V} แท็บคิว: ${date} ${slotTh} = เต็ม`, sl.ok && Object.entries(want).every(([k, v]) => sl.days[date] && sl.days[date][k] === v), JSON.stringify(sl.days[date] || {}));
  await bp.close();

  // 6 · the customer sees the new status, and the same slot is full on the site
  await p.goto(`${BASE}/${page}#quote`); await p.waitForTimeout(2000);
  await tr.locator('input').nth(0).fill(ref); await tr.locator('input').nth(1).fill('5678'); await tr.locator('button').click(); await p.waitForTimeout(1200);
  ok(`${V} ลูกค้าเห็นสถานะ "ยืนยันคิว"`, (await tr.locator('p').innerText()).includes('ยืนยันคิว'));
  await p.goto('about:blank'); await p.goto(`${BASE}/${page}#prices`); await p.waitForTimeout(2500);   // a fresh visit (queue cache is 60 s)
  await p.locator('#prices button:has-text("เพิ่ม")').first().click(); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('[data-cart-btn]')?.click()); await p.waitForTimeout(800);
  const again = p.locator('.s-cart button:has-text("เริ่มใบใหม่")');   // same page: the sent ticket stays on screen until "เริ่มใบใหม่"
  if (await again.count()) { await again.click(); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.locator('#prices button:has-text("เพิ่ม")').first().click(); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('[data-cart-btn]')?.click()); await p.waitForTimeout(800); }
  await p.fill('#s-q-date', date); await p.dispatchEvent('#s-q-date', 'change'); await p.waitForTimeout(1500);
  const fullBtns = await p.locator('.s-cart .qc-slot button.full').allInnerTexts();
  if (SHOTS) await p.locator('.s-when').screenshot({ path: `${SHOTS}/${V}-slot-full.png` }).catch(() => {});
  const chosen = await p.locator('.s-cart .qc-slot button.on').allInnerTexts();
  ok(`${V} เว็บแสดง "${slotTh}" วันนั้นเต็ม และไม่เลือกช่วงที่เต็ม`, fullBtns.some(t => t.includes(slotTh) && t.includes('คิวเต็มแล้ว')) && !chosen.some(t => t.includes(slotTh)), `full=${fullBtns.map(t => t.split('\n')[0]).join('/')} on=${chosen.map(t => t.split('\n')[0]).join('/')}`);
  // a fully booked day: both halves full → the booking asks for another day and offers the nearest free one
  gas.call('markQueue', date, 'ทั้งวัน');
  await p.goto('about:blank'); await p.goto(`${BASE}/${page}#prices`); await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('[data-cart-btn]')?.click()); await p.waitForTimeout(1500);
  await p.fill('#s-q-date', date); await p.dispatchEvent('#s-q-date', 'change'); await p.waitForTimeout(800);
  const alt = p.locator('.s-when .qc-alt');
  await p.fill('#s-q-addr', '99/1'); await p.fill('#s-q-name', 'x'); await p.fill('#s-q-tel', '0812345678');
  const n0 = tabRows('งานจอง').length;
  await p.locator('.s-form button[type="submit"]').click(); await p.waitForTimeout(800);
  const errTxt = await p.locator('.s-err').innerText().catch(() => '');
  ok(`${V} วันเต็มทั้งวัน → ไม่ส่ง + เสนอวันว่างใกล้สุด`, await alt.count() === 1 && /คิวเต็ม/.test(errTxt) && tabRows('งานจอง').length === n0, `${await alt.innerText().catch(() => '-')} · ${errTxt}`);
  await alt.click(); await p.waitForTimeout(600);
  ok(`${V} กดวันว่างใกล้สุด → เปลี่ยนวันให้`, (await p.inputValue('#s-q-date')) > date, await p.inputValue('#s-q-date'));
  ok(`${V} ไม่มี JS error`, !errs.length, errs.slice(0, 3).join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
const fails = out.filter(l => l.startsWith('FAIL'));
console.log(`\n${out.length - fails.length}/${out.length} PASS`);
process.exit(fails.length ? 1 : 0);
