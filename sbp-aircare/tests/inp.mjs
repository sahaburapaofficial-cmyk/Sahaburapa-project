// Rev.26.1 interaction latency (INP-like): time from a click to the next painted frame for the controls visitors use most. node tests/inp.mjs a.html [w h]
import { launch, BASE } from './_lib.mjs';
const [,, page = 'a.html', w = 1366, hh = 900] = process.argv;
const b = await launch(); const p = await b.newPage({ viewport: { width: +w, height: +hh } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${BASE}/${page}`); await p.waitForTimeout(3000);
const ACTS = [
  ['catalog', '#catalog button[aria-pressed]:not([aria-pressed="true"])', 'ตัวกรองแคตตาล็อก'],
  ['prices', '#priceCenter [role=tab]:nth-child(3)', 'แท็บค่าซ่อม'],
  ['prices', '#allSvc .as-card[data-g="drain"]', 'การ์ดงานบริการ'],
  ['tradein', '#tradein .ti-why button', 'เป้าหมายเทิร์น'],
  ['tradein', '#tradein .ti-issues button:nth-child(3)', 'อาการเครื่องเดิม'],
  ['b2b', '[data-b-step$=":1"]', 'เพิ่มจำนวนเครื่อง'],
  ['b2b', '[data-b-visits] + span, [data-b-visits]', 'ความถี่ต่อปี'],
  ['symptoms', '.sg-it[data-sym="ice"]', 'เลือกอาการ'],
  ['learn', '.kh-card summary', 'เปิดหัวข้อความรู้'],
  ['enterprise', '#enterprise [role=tab]:nth-child(2), #enterprise button[aria-pressed="false"]', 'ประเภทองค์กร'],
  ['quote', '[data-cart-btn], .s-cart-btn, button[aria-label^="ใบเสนอราคา"]', 'เปิดใบเสนอราคา'],
];
const rows = [];
for (const [sec, sel, th] of ACTS) {
  await p.evaluate(id => { location.hash = '#' + id; }, sec); await p.waitForTimeout(1200);
  const el = await p.$(`#${sec} ${sel.split(',')[0].includes('#') ? '' : ''}`) && await p.$(sel);
  if (!el) { rows.push({ th, ms: 'ไม่พบปุ่ม' }); continue; }
  await el.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(600);
  await p.evaluate(() => { window.__t = null; document.addEventListener('click', () => { const t0 = performance.now(); requestAnimationFrame(() => setTimeout(() => { window.__t = performance.now() - t0; }, 0)); }, { once: true, capture: true }); });
  await el.click({ timeout: 5000 }).catch(e => rows.push({ th, ms: 'คลิกไม่ได้ ' + e.message.slice(0, 40) }));
  await p.waitForTimeout(800);
  const ms = await p.evaluate(() => window.__t); if (ms != null) rows.push({ th, ms: Math.round(ms) });
  await p.keyboard.press('Escape');
}
console.log(`page ${page} ${w}×${hh}`); console.table(rows); if (errs.length) console.log(errs.join('\n'));
await b.close();
