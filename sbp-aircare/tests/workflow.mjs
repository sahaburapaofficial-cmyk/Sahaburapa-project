// Rev.33 — the customer's whole workflow, clicked (desktop, mouse, 1366) or tapped (phone, touch, 390) the way a person does it.
// Every action goes through Playwright's actionability checks — the control must be visible, stable, enabled and not covered by
// anything (sticky header, bottom bar, floating buttons, an open drawer) — so a control a visitor could not reach fails here.
//   1 home + the six pages through the real menu (header on desktop, "เมนู" sheet on phones) · back button
//   2 "ล้างแอร์" journey → quick booking → job ticket in the quotation → send (fake back office, no real sheet)
//   3 buy an AC right after: catalogue → product → quotation is a NEW request (the sent ticket is not shown/sent again) · trade-in
//   4 repair: symptom assistant → answers → book a check-up → diagnosis line in the ticket
//   5 corporate: sector sample contract → quotation          6 contact form → sent
//   7 search (Ctrl/⌘K palette) → result opens               8 the design's own hero (D film skip · E consultation → booking ·
//     F climate lab · A/B/C viewer)                          9 phones: bottom bar, menu sheet, floating buttons clear of the bar
// after every step: no page error, no sideways scroll. usage: node tests/workflow.mjs a.html [desktop|mobile] [--shots dir]
import { readFileSync, mkdirSync } from 'node:fs';
import { launch, BASE } from './_lib.mjs';
const args = process.argv.slice(2);
const page = args[0] || 'a.html', M = args[1] === 'mobile', prof = M ? 'mobile' : 'desktop';
const shotDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : '';
if (shotDir) mkdirSync(shotDir, { recursive: true });
const V = page[0];
const FAKE = 'https://script.google.com/macros/s/WORKFLOW-TEST/exec';
const SRC = readFileSync(new URL('../assets/submit.js', import.meta.url), 'utf8').replace(/const BACKEND_URL = '[^']*';/, `const BACKEND_URL = '${FAKE}';`);
const b = await launch();
const ctx = await b.newContext(M ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: 1366, height: 900 } });
const p = await ctx.newPage(); p.setDefaultTimeout(20000);
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
const posts = [];
await p.route('**/assets/submit.js', r => r.fulfill({ contentType: 'text/javascript', body: SRC }));
await p.route(FAKE + '**', async r => {
  const H = { 'access-control-allow-origin': '*' };
  if (r.request().method() === 'GET') return r.fulfill({ contentType: 'application/json', headers: H, body: JSON.stringify({ ok: true, days: {} }) });   // live queue: nothing known → "ทีมยืนยันคิว"
  const d = JSON.parse(r.request().postData() || '{}'); posts.push(d);
  return r.fulfill({ contentType: 'application/json', headers: H, body: JSON.stringify({ ok: true, ref: d.ref }) });
});
const act = loc => M ? loc.tap() : loc.click();
const wait = ms => p.waitForTimeout(ms);
const vis = sel => p.locator(sel).filter({ visible: true });
const R = [];
async function shot(name) { if (shotDir) await p.screenshot({ path: `${shotDir}/${V}-${prof}-${name.replace(/[^\w]+/g, '_')}.png` }).catch(() => {}); }
async function step(name, fn) {
  const e0 = errs.length;
  try {
    const note = await fn();
    await closeAll();   // Rev.34: closing with the page's own buttons is part of the step — a covered × fails it (it used to fall back to Escape)
    const ow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const ok = errs.length === e0 && ow <= 0;
    R.push({ name, ok, note: [note, ow > 0 ? `ล้นแนวนอน ${ow}px` : '', errs.length > e0 ? 'error: ' + errs.slice(e0).join(' | ') : ''].filter(Boolean).join(' · ') });
    if (!ok) await shot(name);
  } catch (e) { R.push({ name, ok: false, note: String(e.message || e).split('\n').filter(Boolean).slice(0, 3).join(' / ').slice(0, 400) }); await shot(name); await p.keyboard.press('Escape').catch(() => {}); await closeAll().catch(() => {}); }
}
async function closeAll() {   // close what a visitor left open, with the page's own close controls
  for (let i = 0; i < 3; i++) {
    const cart = vis('.s-cart .s-x'), dr = vis('#drawer [data-close]'), cp = vis('.cp-esc'), sh = vis('.s-msheet.open');
    if (await cart.count()) { await act(cart.first()); await wait(350); continue; }
    if (await dr.count()) { await act(dr.first()); await wait(350); continue; }
    if (await cp.count()) { await p.keyboard.press('Escape'); await wait(250); continue; }
    if (await sh.count()) { await p.keyboard.press('Escape'); await wait(300); continue; }
    if (await vis('#ab-panel').count()) { await act(p.locator('.ab-fab')).catch(() => {}); await wait(300); continue; }
    break;
  }
}
const viewNow = () => p.evaluate(() => { const s = [...document.querySelectorAll('[data-sx]')].find(x => !x.hidden && x.getClientRects().length); return s ? s.dataset.sx : ''; });
const VIEW_TH = { home: 'หน้าแรก', shop: 'ซื้อแอร์', service: 'ล้าง · ติดตั้ง · ซ่อม', business: 'สำหรับองค์กร', knowledge: 'ความรู้', contact: 'ติดต่อเรา',
  clean: 'ล้างแอร์', install: 'ซื้อ · ติดตั้ง', repair: 'ซ่อม', help: 'ราคา · ความรู้ · ติดต่อ' };
// Rev.46: D/F are organised by service — the same journeys live on clean / install / repair / help pages
let SPLIT = false; const ALIAS = { shop: 'install', service: 'clean', knowledge: 'help', contact: 'help' };
async function goView(k) {   // through the menu a visitor sees
  if (SPLIT && ALIAS[k]) k = ALIAS[k];
  if (M) {
    await act(p.locator('.mbar .s-mmenu')); await p.locator('.s-msheet.open').waitFor();
    await act(p.locator(`.s-msheet a[href="#${k}"]`).first());
  } else await act(vis(`header nav a[href="#${k}"]`).first());
  await wait(900);
  const now = await viewNow(); if (now !== k) throw new Error(`menu → ${k}: page shows "${now}"`);
}
const cartItems = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('sbp-quote-v2') || '{}').items || []; } catch (e) { return []; } });
const openCart = async () => { await act(M ? p.locator('.mbar [data-cart-btn]') : vis('header [data-cart-btn]').first()); await p.locator('.s-cart:not([hidden])').waitFor(); await wait(400); };
// fills what the quotation form still needs, the way a visitor does, then sends it — returns what the back office received
async function sendCart() {
  const date = p.locator('#s-q-date');
  if (await date.count() && !(await date.inputValue())) { await date.fill(await p.evaluate(() => { const d = new Date(Date.now() + 6 * 864e5); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })); await wait(400); }
  const zone = p.locator('#s-cart-zone');
  if (await zone.count() && !(await zone.inputValue())) { await zone.fill('บางขุนเทียน'); await wait(500); const o = vis('.s-cart .ap-opt'); if (await o.count()) { await act(o.first()); await wait(400); } }
  for (const [id, v] of [['s-q-addr', '99/1 ถนนพระราม 2 แขวงแสมดำ'], ['s-q-name', 'ทดสอบ เวิร์กโฟลว์'], ['s-q-tel', '0812345678']]) { const f = p.locator('#' + id); if (await f.count() && !(await f.inputValue())) await f.fill(v); }
  const shown = +((await p.locator('.s-cart .tot').last().innerText()).replace(/[^\d]/g, ''));
  const n0 = posts.length;
  await act(p.locator('.s-form button[type="submit"]')); await wait(1800);
  const msg = await p.locator('.s-cart-b').innerText();
  if (!/ส่งถึงทีมแล้ว/.test(msg)) throw new Error('not sent: ' + msg.split('\n').slice(0, 3).join(' / '));
  const got = posts.slice(n0); checkSent(got, shown); return got;
}
// Rev.34 accuracy: the amount the visitor saw is the amount the team receives (field + summary text), and the summary lists every line
function checkSent(got, shown) {
  for (const d of got) {
    const f = d.fields || {}, amt = +String(f['ยอดประมาณการรวม VAT'] ?? '').replace(/[^\d]/g, '');
    if (amt !== shown) throw new Error(`team receives ฿${amt} but the visitor saw ฿${shown}`);
    if (!String(d.text || '').replace(/,/g, '').includes(String(shown))) throw new Error(`summary text does not carry the total ฿${shown}`);
    if (d.variant !== V.toUpperCase()) throw new Error(`request names design "${d.variant}"`);
  }
}
const fresh = async () => { await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.reload(); await wait(2500); };   // a new visitor: the cart lives in memory too
const toTop = () => p.evaluate(() => { const de = document.documentElement, sb = de.style.scrollBehavior; de.style.scrollBehavior = 'auto'; scrollTo(0, 0); de.style.scrollBehavior = sb; });
// waits for the place a control should bring to the middle of the screen — on this software-rendered test browser the busy 3D pages
// delay animation frames by seconds, so the smooth scroll can start late (a phone with a GPU does it at once)
const reach = sel => p.waitForFunction(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.3; }, sel, { timeout: 15000 }).then(() => true, () => false);

await p.goto(`${BASE}/${page}`); await fresh();
SPLIT = await p.evaluate(() => !!document.getElementById('pathsRepair'));

await step('1 หน้าแรกและเมนู 6 หน้า', async () => {
  if (!(await p.locator('h1').first().isVisible())) throw new Error('no visible h1');
  for (const k of SPLIT ? ['install', 'clean', 'repair', 'business', 'help', 'home'] : ['shop', 'service', 'business', 'knowledge', 'contact', 'home']) await goView(k);
  await goView('contact'); await p.goBack(); await wait(900);
  const back = await viewNow(); if (back !== 'home') throw new Error(`back button → "${back}" (expected home)`);
  return '6 หน้า + ปุ่มย้อนกลับ';
});

await step('2 จองล้างแอร์ → ใบจองงาน → ส่ง', async () => {
  await goView('home');
  await act(vis('#startRoot .sx-int').filter({ hasText: 'ล้างแอร์' }).first());
  if (!(await reach('#book'))) throw new Error('journey "ล้างแอร์" did not bring the booking on screen');
  await act(p.locator('#bookRoot button[aria-label="เพิ่ม ติดผนัง"]'));
  const z = p.locator('#qc-zone'); await z.fill('บางขุนเทียน'); await wait(500);
  const opt = vis('#bookRoot .ap-opt'); if (await opt.count()) { await act(opt.first()); await wait(400); }
  await act(vis('#bookRoot .qc-chip').filter({ hasText: 'เร็วสุดแบบจองปกติ' }).first()); await wait(300);
  const quick = +((await p.locator('.qc-total b').innerText()).replace(/[^\d]/g, ''));
  await act(p.locator('#bookRoot .qc-go')); await p.locator('.s-cart:not([hidden])').waitFor(); await wait(500);
  const items = await cartItems(); const units = items.reduce((s, i) => s + (i.group === 'clean' ? i.qty : 0), 0);
  if (units !== 2) throw new Error(`cart has ${units} cleaning units (expected 2)`);
  const cartTot = +((await p.locator('.s-cart .tot').last().innerText()).replace(/[^\d]/g, ''));
  if (cartTot !== quick) throw new Error(`booking total ${quick} ≠ quotation ${cartTot}`);
  const addr = p.locator('#s-q-addr'); if (await addr.count()) await addr.fill('99/1 ถนนพระราม 2 แขวงแสมดำ');
  await p.locator('#s-q-name').fill('ทดสอบ เวิร์กโฟลว์'); await p.locator('#s-q-tel').fill('0812345678');
  const n0 = posts.length;
  await act(p.locator('.s-form button[type="submit"]')); await wait(1800);
  checkSent(posts.slice(n0), cartTot);
  if (posts.slice(n0).some(d => +String((d.fields || {})['ค่าเดินทาง (ก่อน VAT)'] ?? 0) !== 300)) throw new Error('2 units in the core area below ฿4,500: the team should see a ฿300 trip');
  const msg = await p.locator('.s-cart-b').innerText();
  if (!/ส่งถึงทีมแล้ว/.test(msg)) throw new Error('ticket not sent: ' + msg.split('\n').slice(0, 3).join(' / '));
  const sent = posts.slice(n0).map(d => d.kind).join(',');
  if (!/booking/.test(sent)) throw new Error('back office got: ' + sent);
  const tag = posts.slice(n0).map(d => d.variant).join(','); if (!posts.slice(n0).every(d => d.variant === V.toUpperCase())) throw new Error(`ticket names design "${tag}" (expected ${V.toUpperCase()})`);
  await closeAll();
  const strip = await vis('.sx-js .sx-jsi').first().innerText().catch(() => '');
  if (strip && !/ครบทุกขั้น/.test(strip)) throw new Error('journey strip after the ticket was sent: ' + strip.split('\n').slice(0, 2).join(' / '));
  return `฿${quick.toLocaleString('en-US')} · ส่งแล้ว (${sent}) · เส้นทาง${strip ? 'ครบทุกขั้น' : ' (ไม่แสดงในหน้านี้)'}`;
});

await step('3 ซื้อแอร์ต่อหลังส่งใบจอง → ใบใหม่ · เทิร์น', async () => {   // right after step 2's ticket went: the next thing added is a new request
  const sentRef = posts.filter(d => d.kind === 'booking').map(d => d.ref).pop() || '';
  await goView('shop');
  const open = vis('#catalog button.open, #catalog table.rows button');   // cards (A/C/D/E/F) · B lists models as a table with an OPEN chip per row await open.first().waitFor({ timeout: 20000 });
  await act(open.first()); await p.locator('#drawer:not([hidden])').waitFor(); await wait(600);
  const name = (await p.locator('#drawerBody h2, #drawerBody h3').first().innerText().catch(() => '')).slice(0, 40);
  await act(vis('#drawerBody button').filter({ hasText: 'ใส่ใบเสนอราคา' }).first()); await wait(700);
  await closeAll();
  const it = await cartItems();
  if (!it.some(i => i.kind === 'product')) throw new Error('no product line after "ใส่ใบเสนอราคา"');
  if (it.some(i => i.group === 'clean')) throw new Error('the cleaning already sent is still in the new quotation');
  await openCart();
  if (await vis('.s-cart .s-hand-ok').count()) throw new Error('quotation still shows the sent ticket instead of the new line');
  const shown = await p.locator('.s-cart .s-lines li').count(); if (!shown) throw new Error('new quotation shows no lines');
  const note = await p.locator('.s-cart .s-prev').innerText().catch(() => '');
  if (!/ส่งถึงทีมแล้ว/.test(note) || (sentRef && !note.includes(sentRef))) throw new Error('no note about the request sent before: ' + note);
  await closeAll();
  await act(vis('#tradein button').filter({ hasText: 'ขอประเมินมูลค่าเทิร์น' }).first()); await wait(800);
  await closeAll();
  const it2 = await cartItems(); if (!it2.some(i => i.key === 'TI-REQ')) throw new Error('trade-in request not in the quotation');
  await openCart();
  const kept = await p.locator('#s-q-name').inputValue().catch(() => '');
  if (!kept) throw new Error('name typed for the first request is gone — the visitor types it again');
  const got = await sendCart(), job = got.map(d => (d.fields || {})['งาน'] || '').join(' ');
  if (/ล้าง/.test(job)) throw new Error('the cleaning sent in step 2 went to the team again: ' + job);
  return `${name} · ใบใหม่ ${it2.length} รายการ → ส่งแล้ว (${got.map(d => d.kind)}${job ? ' · ' + job : ''}) · ใบเดิม ${sentRef}`;
});

await step('4 แอร์มีปัญหา → ผู้ช่วย → จองช่างตรวจ', async () => {
  await fresh();
  await act(p.locator('.ab-fab')); await p.locator('#ab-panel:not([hidden])').waitFor(); await wait(300);
  await act(vis('#ab-panel .ab-chip').filter({ hasText: 'ไม่เย็น' }).first());
  await p.waitForFunction(() => document.querySelectorAll('#ab-panel .ab-card').length > 0, null, { timeout: 15000 });
  const card = p.locator('#ab-panel .ab-card').last();
  const groups = card.locator('[role="radiogroup"], .ab-q');
  const ng = await groups.count();
  for (let i = 0; i < ng; i++) { const o = groups.nth(i).locator('.ab-o'); if (await o.count()) { await act(o.first()); await wait(150); } }
  await act(card.locator('.ab-book')); await p.locator('.s-cart:not([hidden])').waitFor(); await wait(500);
  const t = await p.locator('.s-cart').innerText();
  if (!/ตรวจวินิจฉัย/.test(t)) throw new Error('no diagnosis line in the ticket');
  if (!(await p.locator('.s-cart .tk-diag').count())) throw new Error('assistant result not shown in the ticket');
  return `ตอบ ${ng} ข้อ · ค่าตรวจในใบจอง`;
});

await step('5 องค์กร → สัญญาตัวอย่าง → ใบเสนอราคา', async () => {
  await goView('business');
  await act(p.locator('#entRoot [data-sector="hospital"]')); await wait(300);
  const amt = await p.locator('#entRoot .en-big b').innerText();
  await act(vis('#entRoot .en-acts button').filter({ hasText: 'ใส่ใบเสนอราคา' }).first()); await wait(800);
  const it = await cartItems(); const line = it.find(i => i.group === 'contract');
  if (!line) throw new Error('no contract line');
  return `โรงพยาบาล ${amt}/ปี`;
});

await step('6 ติดต่อเรา → ส่งข้อความ', async () => {
  await goView('contact');
  const f = p.locator('#qform');
  await f.locator('[id$="-name"]').fill('ทดสอบ ติดต่อ'); await f.locator('[id$="-tel"]').fill('0812345678');   // q-* (A/C/D/E/F) · qb-* (B)
  const n = f.locator('[id$="-n"]'); if (await n.count()) await n.fill('3');
  const msg = f.locator('textarea'); if (await msg.count()) await msg.first().fill('ทดสอบการส่งข้อความจากหน้าติดต่อ');
  const n0 = posts.length;
  await act(f.locator('button:not([type="button"])').first()); await wait(1800);
  const out = await p.locator('.sx-qout').innerText().catch(() => '');
  if (!/ส่งถึงทีมแล้ว/.test(out)) throw new Error('contact not sent: ' + out.split('\n')[0]);
  return 'ส่งแล้ว (' + posts.slice(n0).map(d => d.kind).join(',') + ')';
});

await step('7 ค้นหาทั้งเว็บ', async () => {
  await goView('home');
  await act(vis('.cp-trig').first()); await p.locator('.cp-in').waitFor();
  await p.locator('.cp-in').fill('ล้างแอร์'); await wait(500);
  const n = await p.locator('.cp-opt').count(); if (!n) throw new Error('no search results');
  await act(p.locator('.cp-opt').first()); await wait(1200);
  if (await vis('.cp-in').count()) throw new Error('palette still open after choosing a result');
  return `${n} ผลลัพธ์ · เปิดผลแรกแล้ว (${await viewNow()})`;
});

await step('8 ส่วนเด่นของแบบ ' + V.toUpperCase(), async () => {
  await goView('home'); await toTop(); await wait(500);
  if (V === 'd') {
    await act(vis('.cn-skip').first());
    const past = await p.waitForFunction(() => document.querySelector('.cn-track').getBoundingClientRect().bottom < innerHeight * 0.7, null, { timeout: 6000 }).then(() => true, () => false);
    if (!past) throw new Error('"ข้ามภาพยนตร์" did not move past the film');
    return 'ข้ามภาพยนตร์ไปส่วนจองได้';
  }
  if (V === 'e') {
    await fresh();
    const tapOpt = async th => { await act(vis('#conRoot .at-opt').filter({ hasText: th }).first()); await wait(250); };
    await tapOpt('คอนโด'); await tapOpt('2–3 เครื่อง'); await tapOpt('ไม่ได้ล้างนาน');
    await act(vis('#conRoot .btn-primary').filter({ hasText: 'ถัดไป' }).first()); await wait(250);
    await tapOpt('ภายในสัปดาห์นี้');
    const recs = await p.locator('#conRoot .at-recs li').count(); if (!recs) throw new Error('no plan after 4 answers');
    await act(vis('#conRoot .at-types button').filter({ hasText: 'ติดผนัง' }).first());
    if (!(await reach('#book'))) throw new Error('type chip did not open the booking');
    await act(p.locator('#bookRoot .qc-go')); await p.locator('.s-cart:not([hidden])').waitFor(); await wait(400);
    const units = (await cartItems()).reduce((s, i) => s + (i.group === 'clean' ? i.qty : 0), 0);
    if (units !== 3) throw new Error(`booking prefilled with ${units} units (expected 3)`);
    return `แผน ${recs} ขั้น → จองพร้อม 3 เครื่อง`;
  }
  if (V === 'f') {
    const lab = p.locator('#spRoot');
    const on = lab.locator('.sp-tg button', { hasText: 'เปิดแอร์' });
    await act(on); await wait(400); const off = await lab.locator('.sp-t25').innerText();
    if (!/ปิดแอร์/.test(off)) throw new Error('turning the unit off did not change the lab: ' + off);
    await act(on); await wait(300);
    await act(lab.locator('.sp-scan'));
    if (await lab.locator('.sp-scan').getAttribute('aria-pressed') !== 'true') throw new Error('scan button not pressed');
    if (!(await reach('#spRoot .sp-stage'))) throw new Error('room not on screen after "สแกนห้อง"');
    await act(lab.locator('.sp-tg button', { hasText: 'แผนที่ความร้อน' })); await wait(300);
    return 'เปิด/ปิดแอร์ · สแกนห้อง · แผนที่ความร้อน';
  }
  const u = vis('[data-v-unit="outdoor"]').first();
  if (!(await u.count())) return 'ไม่มีปุ่มสลับคอยล์ร้อนในหน้าแรกของแบบนี้';
  await act(u); await wait(600);
  if (await u.getAttribute('aria-pressed') !== 'true') throw new Error('outdoor-unit button did not switch');
  return 'สลับคอยล์ร้อนในภาพ 3 มิติได้';
});

if (M) await step('9 มือถือ: แถบล่าง เมนู ปุ่มลอย', async () => {
  await goView('home');
  const bar = p.locator('.mbar'); if (!(await bar.isVisible())) throw new Error('bottom bar hidden');
  const rb = await bar.boundingBox();
  for (const sel of ['.ab-fab', '.sx-line, .ln-fab, a.line-fab']) {
    const f = vis(sel); if (!(await f.count())) continue; const r = await f.first().boundingBox();
    if (r && r.y + r.height > rb.y + 2) throw new Error(`${sel} overlaps the bottom bar`);
  }
  await act(p.locator('.mbar .s-mmenu')); await p.locator('.s-msheet.open').waitFor();
  const hub = await p.locator('.s-msheet a.hub').innerText().catch(() => '');
  const want = 'def'.includes(V) ? 'D · E · F' : 'A · B · C';
  await p.keyboard.press('Escape'); await wait(300);
  if (hub && !hub.includes(want)) throw new Error(`menu sheet link says "${hub}" on design ${V.toUpperCase()}`);
  await openCart();
  return 'แถบล่าง · เมนู · ปุ่มลอยไม่ทับแถบ · เปิดใบเสนอราคาจากแถบล่าง';
});

const fail = R.filter(r => !r.ok).length;
console.log(JSON.stringify({ page, prof, pass: R.length - fail, fail, errors: errs.length }));
R.forEach(r => console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.note ? ' — ' + r.note : ''}`));
await b.close(); process.exitCode = fail ? 1 : 0;
