/**
 * SBP AirCare — receive website requests (Rev.10)
 * Google Apps Script web app: the website POSTs JSON (as text/plain) → one row in the sheet tab of that kind
 * (ใบเสนอราคา / ติดต่อ / ความเห็น) → one notification e-mail to the sales team → reply {ok, ref}.
 * Set-up: backend/README.md. Runs under the company Google account that owns the sheet.
 * ★Rev.16 job tickets (kind 'booking'): row in "งานจอง" + photos saved to Drive (folder per reference) + instant e-mail and
 * optional LINE push to the team + the back-office board (Board.html: ?view=board&key=BOARD_KEY) where the team checks scope,
 * sets the extra price (before VAT), confirms the date / slot (marks the "คิว" tab) and moves the status.
 * Script properties (Project settings → Script properties): BOARD_KEY (long random text, required for the board),
 * LINE_TOKEN + LINE_TO (optional: LINE Messaging API channel access token + group / user id to push new tickets to).
 */
const NOTIFY_TO = 'Sahaburapa.official@gmail.com';   // comma-separated list allowed; consumer Gmail: 100 recipients / day
const TABS = { quote: 'ใบเสนอราคา', contact: 'ติดต่อ', feedback: 'ความเห็น', booking: 'งานจอง' };
const BOARD_COLS = ['ราคาเพิ่มที่แจ้ง (ก่อน VAT)', 'นัดวัน', 'นัดช่วง', 'หมายเหตุทีม', 'รูป'];   // filled by the team on the board
const MAX_PHOTOS = 8, MAX_PHOTO_B64 = 1500000;
const MAX_TEXT = 8000;
const VERSION = 'Rev.20';
let SILENT = false;   // selfTest(): no e-mail / LINE for the test request

// the company sheet: the one this script is bound to, or SHEET_ID (set by setup() for a standalone script)
function ss_() {
  const a = SpreadsheetApp.getActiveSpreadsheet(); if (a) return a;
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('run setup() first');
  return SpreadsheetApp.openById(id);
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > 12000000) return reply({ ok: false, error: 'too large' });
    const d = JSON.parse(raw);
    if (d.kind !== 'booking' && raw.length > 20000) return reply({ ok: false, error: 'too large' });
    const kind = TABS[d.kind] ? d.kind : null;
    if (!kind) return reply({ ok: false, error: 'bad kind' });
    if (d.hp) return reply({ ok: true, ref: String(d.ref || '') });        // bot filled the hidden field: accept silently, store nothing
    if (!rateOk()) return reply({ ok: false, error: 'busy' });
    const lock = LockService.getScriptLock(); lock.waitLock(20000);   // Rev.19: two requests at once never overwrite a new column or share a reference
    try {
    const ref = uniqueRef(clean(d.ref, 20) || ('W' + Date.now()));
    const fields = safeFields(d.fields);
    const text = clean(d.text, MAX_TEXT);
    const photos = kind === 'booking' ? savePhotos(ref, d.photos) : null;
    if (photos) fields['รูป'] = photos.url;
    const sheet = tab(kind, Object.keys(fields).concat(kind === 'booking' ? BOARD_COLS : []));
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
    notify(kind, ref, d.variant, text + (photos ? `\n\nรูปหน้างาน ${photos.n} รูป: ${photos.url}` : ''));
    if (kind === 'booking') pushLine(`ใบจองงานใหม่ ${ref}\n${String(fields['งาน'] || '')} · ${String(fields['ขอบเขต'] || '')}\nวัน ${String(fields['วันที่สะดวก'] || '-')} ${String(fields['ช่วงเวลา'] || '')}\nโทร ${String(fields['โทร'] || '')}${photos ? `\nรูป ${photos.n} รูป` : ''}`);
    return reply({ ok: true, ref, photos: photos ? photos.n : 0 });
    } finally { lock.releaseLock(); }
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
    if (q.q === 'ping') return reply({ ok: true, service: 'SBP AirCare requests', version: VERSION, sheet: !!ss_(), board: !!PropertiesService.getScriptProperties().getProperty('BOARD_KEY') });
    if (q.q === 'slots') return reply({ ok: true, days: slots() });
    if (q.q === 'status') return reply(rateOk('s', 60) ? status(clean(q.ref, 22), clean(q.tel, 4)) : { ok: false, error: 'busy' });   // Rev.19: no guessing at speed
    if (q.view === 'board') {
      if (!keyOk(q.key)) return HtmlService.createHtmlOutput('<p style="font:16px sans-serif;padding:24px">ต้องใช้ลิงก์บอร์ดที่มีรหัส (BOARD_KEY)</p>');
      const t = HtmlService.createTemplateFromFile('Board'); t.key = q.key;
      return t.evaluate().setTitle('SBP AirCare · งานจอง').addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
  } catch (err) { console.error(err); return reply({ ok: false, error: 'server' }); }
  return reply({ ok: true, service: 'SBP AirCare requests', version: VERSION });
}

function slots() {
  const sh = ss_().getSheetByName('คิว');
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
  const ss = ss_();
  for (const name of [TABS.booking, TABS.quote, TABS.contact]) {
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
  const ss = ss_();
  let sh = ss.getSheetByName(TABS[kind]);
  const base = ['เวลา', 'เลขอ้างอิง', 'สถานะ', 'แบบ', 'หน้า'];
  if (!sh) { sh = ss.insertSheet(TABS[kind]); sh.appendRow(base.concat(keys, ['สรุป'])); sh.setFrozenRows(1); return sh; }
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const missing = keys.filter(k => head.indexOf(k) < 0);
  if (missing.length) sh.getRange(1, head.length + 1, 1, missing.length).setValues([missing]);   // new form field → new column
  return sh;
}

function notify(kind, ref, variant, text) {
  if (SILENT) return;
  const subject = `[SBP AirCare] ${TABS[kind]} ใหม่ · ${ref}`;
  const url = ss_().getUrl();
  try { MailApp.sendEmail({ to: NOTIFY_TO, subject, body: `${text}\n\nแบบเว็บไซต์: ${variant || '-'}\nเปิดตาราง: ${url}\n\n(ยอดเงินในคำขอเป็นยอดประมาณการจากหน้าเว็บ ยืนยันราคาในใบเสนอราคาอย่างเป็นทางการทุกครั้ง)` }); }
  catch (err) { console.error('mail quota or error', err); }   // the row is already saved, so the request is not lost
}

// at most 30 requests per minute for the whole site — slows down floods without blocking real customers
function rateOk(tag, max) {
  const c = CacheService.getScriptCache(), k = (tag || 'n') + Math.floor(Date.now() / 60000), n = Number(c.get(k) || 0);
  if (n >= (max || 30)) return false;
  c.put(k, String(n + 1), 120);
  return true;
}
function clean(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, n); }
// ★Rev.19 every customer value is stored as text ("'" prefix, hidden by Sheets): never a formula, and a phone 0812345678 keeps its 0,
// a date stays as written
function safeCell(v) { return v === '' || v == null ? '' : "'" + v; }
// Rev.19: field names become column headers — keep them short, plain text, and at most 40 per request
function safeFields(f) {
  const out = {}; if (!f || typeof f !== 'object') return out;
  Object.keys(f).slice(0, 40).forEach(k => { const key = clean(k, 60).trim(); if (key && !/^[=+\-@']/.test(key)) out[key] = f[k]; });
  return out;
}
// the website numbers requests from the clock (7 digits repeat about every 3 hours): a reference already in the sheet gets a suffix
function uniqueRef(ref) {
  const ss = ss_(), used = {};
  Object.keys(TABS).forEach(k => { const sh = ss.getSheetByName(TABS[k]); if (!sh || sh.getLastRow() < 2) return; const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], c = h.indexOf('เลขอ้างอิง'); if (c < 0) return; sh.getRange(2, c + 1, sh.getLastRow() - 1, 1).getDisplayValues().forEach(r => { used[r[0]] = 1; }); });
  if (!used[ref]) return ref;
  for (let i = 2; ; i++) if (!used[ref + '-' + i]) return ref + '-' + i;
}
function reply(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }


/* ---------- ★Rev.16 job tickets: photos, LINE push, back-office board ---------- */
function savePhotos(ref, list) {
  if (!Array.isArray(list) || !list.length) return null;
  const root = folder_('SBP AirCare งานจอง'), dir = root.createFolder(ref);
  let n = 0;
  list.slice(0, MAX_PHOTOS).forEach((p, i) => {
    const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(p && p.data || ''));
    if (!m || m[2].length > MAX_PHOTO_B64) return;
    dir.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1], `${ref}-${i + 1}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`)); n++;
  });
  return n ? { n, url: dir.getUrl() } : null;
}
function folder_(name) { const it = DriveApp.getFoldersByName(name); return it.hasNext() ? it.next() : DriveApp.createFolder(name); }

// LINE Messaging API push (LINE Notify ended in 2025) — only when LINE_TOKEN and LINE_TO are set
function pushLine(text) {
  if (SILENT) return;
  const P = PropertiesService.getScriptProperties(), token = P.getProperty('LINE_TOKEN'), to = P.getProperty('LINE_TO');
  if (!token || !to) return;
  try { UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token }, payload: JSON.stringify({ to, messages: [{ type: 'text', text: text.slice(0, 4900) }] }), muteHttpExceptions: true }); }
  catch (err) { console.error('line push', err); }
}

function keyOk(k) { const want = PropertiesService.getScriptProperties().getProperty('BOARD_KEY'); return !!want && String(k || '') === want; }

// board: newest first, last 200 tickets
function boardData(key) {
  if (!keyOk(key)) throw new Error('key');
  const sh = ss_().getSheetByName(TABS.booking);
  if (!sh || sh.getLastRow() < 2) return { head: [], rows: [] };
  const v = sh.getDataRange().getDisplayValues(), head = v[0];
  return { head, rows: v.slice(1).slice(-200).reverse() };
}
const BOARD_EDIT = ['สถานะ', 'ราคาเพิ่มที่แจ้ง (ก่อน VAT)', 'นัดวัน', 'นัดช่วง', 'หมายเหตุทีม'];
function boardUpdate(key, ref, patch) {
  if (!keyOk(key)) throw new Error('key');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { return boardUpdate_(ref, patch || {}); } finally { lock.releaseLock(); }
}
const HOLDS = ['ยืนยันคิว', 'เสร็จ'];   // statuses that keep their visit slot in "คิว"
function boardUpdate_(ref, patch) {
  const sh = ss_().getSheetByName(TABS.booking), v = sh.getDataRange().getDisplayValues(), head = v[0], iRef = head.indexOf('เลขอ้างอิง');
  const at = k => head.indexOf(k);
  for (let r = v.length - 1; r > 0; r--) {
    if (String(v[r][iRef]) !== String(ref)) continue;
    const was = { st: v[r][at('สถานะ')], date: v[r][at('นัดวัน')], slot: v[r][at('นัดช่วง')] };
    Object.keys(patch || {}).forEach(k => { const c = head.indexOf(k); if (c >= 0 && BOARD_EDIT.indexOf(k) >= 0) sh.getRange(r + 1, c + 1).setValue(k === 'นัดวัน' && patch[k] ? "'" + clean(patch[k], 10) : safeCell(clean(patch[k], 500))); });   // keep dates as yyyy-mm-dd text
    const now = { st: 'สถานะ' in patch ? String(patch['สถานะ']) : was.st, date: 'นัดวัน' in patch ? String(patch['นัดวัน']) : was.date, slot: 'นัดช่วง' in patch ? String(patch['นัดช่วง']) : was.slot };
    // Rev.19: cancelled, back to an earlier status, or moved to another day / half → the old slot is free again (unless another confirmed job holds it)
    if (HOLDS.indexOf(was.st) >= 0 && was.date && (HOLDS.indexOf(now.st) < 0 || now.date !== was.date || now.slot !== was.slot)) releaseQueue(was.date, was.slot, ref);
    if (now.st === 'ยืนยันคิว' && now.date) markQueue(now.date, now.slot);
    return true;
  }
  return false;
}
const halves = slot => ({ am: /เช้า|ทั้งวัน/.test(slot) || !slot, pm: /บ่าย|ทั้งวัน/.test(slot) || !slot });
function releaseQueue(date, slot, exceptRef) {
  const sh = ss_().getSheetByName(TABS.booking), v = sh.getDataRange().getDisplayValues(), head = v[0];
  const iRef = head.indexOf('เลขอ้างอิง'), iSt = head.indexOf('สถานะ'), iD = head.indexOf('นัดวัน'), iS = head.indexOf('นัดช่วง');
  const free = halves(slot);
  v.slice(1).forEach(x => { if (x[iRef] === exceptRef || HOLDS.indexOf(x[iSt]) < 0 || x[iD] !== date) return; const o = halves(x[iS]); if (o.am) free.am = false; if (o.pm) free.pm = false; });
  const q = ss_().getSheetByName('คิว'); if (!q) return;
  const qv = q.getDataRange().getDisplayValues(), i = qv.findIndex((x, k) => k > 0 && x[0] === date);
  if (i < 0) return;
  if (free.am) q.getRange(i + 1, 2).setValue('');
  if (free.pm) q.getRange(i + 1, 3).setValue('');
}
// a confirmed visit fills its slot in "คิว" (ทั้งวัน = both)
function markQueue(date, slot) {
  const ss = ss_(); let sh = ss.getSheetByName('คิว');
  if (!sh) { sh = ss.insertSheet('คิว'); sh.appendRow(['วันที่', 'เช้า', 'บ่าย']); sh.setFrozenRows(1); }
  const v = sh.getDataRange().getDisplayValues(); let r = v.findIndex((x, i) => i > 0 && x[0] === date);
  if (r < 0) { sh.appendRow(["'" + date, '', '']); r = sh.getLastRow() - 1; }
  const H = halves(slot);
  if (H.am) sh.getRange(r + 1, 2).setValue('เต็ม');
  if (H.pm) sh.getRange(r + 1, 3).setValue('เต็ม');
}


/* ---------- ★Rev.19 one-time set-up and a self test (run from the Apps Script editor: choose the function → Run) ---------- */
// setup(): creates every tab with its headers, the photo folder, a board key; prints what to do next. Safe to run again.
function setup() {
  const P = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.getActiveSpreadsheet() || (P.getProperty('SHEET_ID') ? SpreadsheetApp.openById(P.getProperty('SHEET_ID')) : SpreadsheetApp.create('SBP AirCare – คำขอจากเว็บ'));
  P.setProperty('SHEET_ID', ss.getId());
  const base = ['เวลา', 'เลขอ้างอิง', 'สถานะ', 'แบบ', 'หน้า'];
  const cols = {
    quote: ['ชื่อ / บริษัท', 'โทร', 'วันที่สะดวก', 'ช่วงเวลา', 'ใบกำกับภาษีในนาม', 'พื้นที่', 'แขวง/ตำบล', 'เขต/อำเภอ', 'จังหวัด', 'รหัสไปรษณีย์', 'ค่าเดินทาง (ก่อน VAT)', 'จำนวนรายการ', 'ยอดประมาณการรวม VAT'],
    booking: ['ชื่อ / บริษัท', 'โทร', 'LINE ID', 'สะดวกให้ติดต่อ', 'วันที่สะดวก', 'ช่วงเวลา', 'พื้นที่', 'แขวง/ตำบล', 'เขต/อำเภอ', 'จังหวัด', 'รหัสไปรษณีย์', 'ระยะถนนประมาณ (กม.)', 'ค่าเดินทาง (ก่อน VAT)', 'ที่อยู่หน้างาน', 'แผนที่', 'งาน', 'ขอบเขต', 'ส่วนเพิ่มประมาณ (ก่อน VAT)', 'ยอดประมาณการรวม VAT', 'หมายเหตุหน้างาน', 'ใบกำกับภาษีในนาม', 'จำนวนรายการ'].concat(BOARD_COLS),
    contact: ['ชื่อ', 'โทร'], feedback: [],
  };
  Object.keys(TABS).forEach(k => { let sh = ss.getSheetByName(TABS[k]); if (!sh) { sh = ss.insertSheet(TABS[k]); sh.appendRow(base.concat(cols[k], ['สรุป'])); sh.setFrozenRows(1); } });
  if (!ss.getSheetByName('คิว')) { const q = ss.insertSheet('คิว'); q.appendRow(['วันที่', 'เช้า', 'บ่าย']); q.setFrozenRows(1); }
  folder_('SBP AirCare งานจอง');
  if (!P.getProperty('BOARD_KEY')) P.setProperty('BOARD_KEY', (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40));
  const url = ScriptApp.getService().getUrl();
  console.log('SET-UP DONE · sheet: ' + ss.getUrl());
  console.log('BOARD_KEY: ' + P.getProperty('BOARD_KEY'));
  console.log(url ? 'board: ' + url + '?view=board&key=' + P.getProperty('BOARD_KEY') : 'next: Deploy → New deployment → Web app (Execute as: Me · Who has access: Anyone), then run setup() again to print the board link');
  return { sheet: ss.getUrl(), boardKey: P.getProperty('BOARD_KEY'), webApp: url || '' };
}

// selfTest(): a full ticket round trip without e-mail / LINE — booking + photo → row + Drive file → status lookup →
// board confirm → queue slot full → slots API; then removes everything it created. Every line says PASS or FAIL.
function selfTest() {
  SILENT = true;
  const out = [], ok = (name, cond, info) => out.push((cond ? 'PASS ' : 'FAIL ') + name + (info ? ' · ' + info : ''));
  const ref = 'TEST' + Date.now().toString().slice(-6), date = Utilities.formatDate(new Date(Date.now() + 5 * 864e5), 'Asia/Bangkok', 'yyyy-MM-dd');
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  let created = null, prevQueue = null;
  try {
    const r = JSON.parse(doPost({ postData: { contents: JSON.stringify({ kind: 'booking', ref, variant: 'T', page: 'selfTest', fields: { 'ชื่อ / บริษัท': 'ทดสอบระบบ', 'โทร': '0800001234', 'วันที่สะดวก': date, 'ช่วงเวลา': 'ช่วงเช้า', 'งาน': 'ล้าง 1 เครื่อง', 'ขอบเขต': 'มาตรฐาน' }, text: 'ทดสอบระบบหลังบ้าน (ลบเอง)', photos: [{ name: 'test.png', data: PNG }] }) } }).getContent());
    ok('รับใบจองงาน', r.ok && r.ref === ref, JSON.stringify(r));
    ok('บันทึกรูปลง Drive', r.photos === 1);
    const sh = ss_().getSheetByName(TABS.booking), v = sh.getDataRange().getValues(), row = v.findIndex(x => String(x[v[0].indexOf('เลขอ้างอิง')]) === ref);
    created = row;
    ok('แถวในแท็บงานจอง', row > 0);
    const st = JSON.parse(doGet({ parameter: { q: 'status', ref, tel: '1234' } }).getContent());
    ok('ตรวจสถานะด้วยเลขอ้างอิง', st.ok && st.status === 'ใหม่', JSON.stringify(st));
    const bad = JSON.parse(doGet({ parameter: { q: 'status', ref, tel: '9999' } }).getContent());
    ok('เบอร์ไม่ตรง ไม่บอกสถานะ', !bad.ok);
    const key = PropertiesService.getScriptProperties().getProperty('BOARD_KEY');
    const q0 = ss_().getSheetByName('คิว'), q0v = q0 ? q0.getDataRange().getDisplayValues() : [], q0i = q0v.findIndex((x, k) => k > 0 && x[0] === date);
    prevQueue = q0i > 0 ? q0v[q0i].slice(1, 3) : ['', ''];   // a real booking may already hold that day: restore it afterwards
    ok('บอร์ดอ่านงาน', boardData(key).rows.some(x => x.indexOf(ref) >= 0));
    ok('บอร์ดยืนยันคิว', boardUpdate(key, ref, { 'สถานะ': 'ยืนยันคิว', 'นัดวัน': date, 'นัดช่วง': 'ช่วงเช้า', 'ราคาเพิ่มที่แจ้ง (ก่อน VAT)': '0' }));
    const sl = JSON.parse(doGet({ parameter: { q: 'slots' } }).getContent());
    ok('คิวเช้าวันนั้นเต็ม', sl.ok && sl.days[date] && sl.days[date].am === false, JSON.stringify(sl.days[date] || {}));
    const st2 = JSON.parse(doGet({ parameter: { q: 'status', ref, tel: '1234' } }).getContent());
    ok('ลูกค้าเห็นสถานะใหม่', st2.status === 'ยืนยันคิว');
    boardUpdate(key, ref, { 'สถานะ': 'ยกเลิก' });
    const sl2 = JSON.parse(doGet({ parameter: { q: 'slots' } }).getContent());
    ok('ยกเลิกแล้วคิวว่างคืน', !(sl2.days[date] && sl2.days[date].am === false) || prevQueue[0] === 'เต็ม', JSON.stringify(sl2.days[date] || {}));
    const pong = JSON.parse(doGet({ parameter: { q: 'ping' } }).getContent());
    ok('ping', pong.ok && pong.version === VERSION);
  } catch (e) { ok('ไม่มี error', false, String(e)); }
  // clean up: the test row, its photo folder and the queue mark
  try {
    const sh = ss_().getSheetByName(TABS.booking), v = sh.getDataRange().getValues(), i = v.findIndex(x => String(x[v[0].indexOf('เลขอ้างอิง')]) === ref);
    if (i > 0) sh.deleteRow(i + 1);
    const it = folder_('SBP AirCare งานจอง').getFoldersByName(ref); while (it.hasNext()) it.next().setTrashed(true);
    const q = ss_().getSheetByName('คิว'), qv = q.getDataRange().getDisplayValues(), qi = qv.findIndex((x, k) => k > 0 && x[0] === date);
    if (qi > 0 && prevQueue) q.getRange(qi + 1, 2, 1, 2).setValues([prevQueue]);
    out.push('ลบข้อมูลทดสอบแล้ว');
  } catch (e) { out.push('ลบข้อมูลทดสอบไม่สำเร็จ: ' + e); }
  SILENT = false;
  out.forEach(l => console.log(l));
  return out;
}
