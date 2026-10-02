/**
 * SBP AirCare — receive website requests (Rev.10)
 * Google Apps Script web app: the website POSTs JSON (as text/plain) → one row in the sheet tab of that kind
 * (ใบเสนอราคา / ติดต่อ / ความเห็น) → one notification e-mail to the sales team → reply {ok, ref}.
 * Set-up: backend/README.md. Runs under the company Google account that owns the sheet.
 */
const NOTIFY_TO = 'Sahaburapa.official@gmail.com';   // comma-separated list allowed; consumer Gmail: 100 recipients / day
const TABS = { quote: 'ใบเสนอราคา', contact: 'ติดต่อ', feedback: 'ความเห็น' };
const MAX_TEXT = 8000;

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > 20000) return reply({ ok: false, error: 'too large' });
    const d = JSON.parse(raw);
    const kind = TABS[d.kind] ? d.kind : null;
    if (!kind) return reply({ ok: false, error: 'bad kind' });
    if (d.hp) return reply({ ok: true, ref: String(d.ref || '') });        // bot filled the hidden field: accept silently, store nothing
    if (!rateOk()) return reply({ ok: false, error: 'busy' });
    const ref = clean(d.ref, 20) || ('W' + Date.now());
    const fields = d.fields && typeof d.fields === 'object' ? d.fields : {};
    const text = clean(d.text, MAX_TEXT);
    const sheet = tab(kind, Object.keys(fields));
    const head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = head.map(k => {
      if (k === 'เวลา') return new Date();
      if (k === 'เลขอ้างอิง') return ref;
      if (k === 'แบบ') return clean(d.variant, 4);
      if (k === 'หน้า') return clean(d.page, 200);
      if (k === 'สรุป') return text;
      if (k === 'สถานะ') return 'ใหม่';
      return k in fields ? safeCell(clean(fields[k], 1000)) : '';
    });
    sheet.appendRow(row);
    notify(kind, ref, d.variant, text);
    return reply({ ok: true, ref });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: 'server' });
  }
}

// Rev.15 read-only lookups for the website (GET, no customer data returned):
//   ?q=slots  → { ok, days: { 'YYYY-MM-DD': { am: bool, pm: bool } } } for the next 21 days, from the tab "คิว"
//              (columns: วันที่ | เช้า | บ่าย — write "เต็ม" when a slot is taken; blank / anything else = free)
//   ?q=status&ref=Q1234567&tel=5678 → { ok, status } — the "สถานะ" cell of that request, only when the last 4 digits of the phone match
function doGet(e) {
  const q = (e && e.parameter) || {};
  try {
    if (q.q === 'slots') return reply({ ok: true, days: slots() });
    if (q.q === 'status') return reply(status(clean(q.ref, 20), clean(q.tel, 4)));
  } catch (err) { console.error(err); return reply({ ok: false, error: 'server' }); }
  return reply({ ok: true, service: 'SBP AirCare requests' });
}

function slots() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('คิว');
  if (!sh || sh.getLastRow() < 2) return {};
  const tz = 'Asia/Bangkok', today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'), until = Utilities.formatDate(new Date(Date.now() + 21 * 864e5), tz, 'yyyy-MM-dd');
  const out = {};
  sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach(([d, am, pm]) => {
    const k = d instanceof Date ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : String(d).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || k < today || k > until) return;
    out[k] = { am: String(am).trim() !== 'เต็ม', pm: String(pm).trim() !== 'เต็ม' };
  });
  return out;
}

function status(ref, tel4) {
  if (!ref || !/^\d{4}$/.test(tel4)) return { ok: false, error: 'missing' };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const name of [TABS.quote, TABS.contact]) {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) continue;
    const v = sh.getDataRange().getValues(), head = v[0], iRef = head.indexOf('เลขอ้างอิง'), iSt = head.indexOf('สถานะ'), iTel = head.findIndex(k => /^(โทร|เบอร์)/.test(String(k)));
    for (let r = v.length - 1; r > 0; r--) {
      if (String(v[r][iRef]) !== ref) continue;
      if (iTel < 0 || String(v[r][iTel]).replace(/\D/g, '').slice(-4) !== tel4) return { ok: false, error: 'not found' };
      return { ok: true, status: String(v[r][iSt] || 'ใหม่') };
    }
  }
  return { ok: false, error: 'not found' };
}

function tab(kind, keys) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(TABS[kind]);
  const base = ['เวลา', 'เลขอ้างอิง', 'สถานะ', 'แบบ', 'หน้า'];
  if (!sh) { sh = ss.insertSheet(TABS[kind]); sh.appendRow(base.concat(keys, ['สรุป'])); sh.setFrozenRows(1); return sh; }
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const missing = keys.filter(k => head.indexOf(k) < 0);
  if (missing.length) sh.getRange(1, head.length + 1, 1, missing.length).setValues([missing]);   // new form field → new column
  return sh;
}

function notify(kind, ref, variant, text) {
  const subject = `[SBP AirCare] ${TABS[kind]} ใหม่ · ${ref}`;
  const url = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  try { MailApp.sendEmail({ to: NOTIFY_TO, subject, body: `${text}\n\nแบบเว็บไซต์: ${variant || '-'}\nเปิดตาราง: ${url}\n\n(ยอดเงินในคำขอเป็นยอดประมาณการจากหน้าเว็บ ยืนยันราคาในใบเสนอราคาอย่างเป็นทางการทุกครั้ง)` }); }
  catch (err) { console.error('mail quota or error', err); }   // the row is already saved, so the request is not lost
}

// at most 30 requests per minute for the whole site — slows down floods without blocking real customers
function rateOk() {
  const c = CacheService.getScriptCache(), k = 'n' + Math.floor(Date.now() / 60000), n = Number(c.get(k) || 0);
  if (n >= 30) return false;
  c.put(k, String(n + 1), 120);
  return true;
}
function clean(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, n); }
function safeCell(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }   // never let customer text become a spreadsheet formula
function reply(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
