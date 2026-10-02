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
    const ref = clean(d.ref, 20) || ('W' + Date.now());
    const fields = d.fields && typeof d.fields === 'object' ? d.fields : {};
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
    if (q.view === 'board') {
      if (!keyOk(q.key)) return HtmlService.createHtmlOutput('<p style="font:16px sans-serif;padding:24px">ต้องใช้ลิงก์บอร์ดที่มีรหัส (BOARD_KEY)</p>');
      const t = HtmlService.createTemplateFromFile('Board'); t.key = q.key;
      return t.evaluate().setTitle('SBP AirCare · งานจอง').addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
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
  const P = PropertiesService.getScriptProperties(), token = P.getProperty('LINE_TOKEN'), to = P.getProperty('LINE_TO');
  if (!token || !to) return;
  try { UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token }, payload: JSON.stringify({ to, messages: [{ type: 'text', text: text.slice(0, 4900) }] }), muteHttpExceptions: true }); }
  catch (err) { console.error('line push', err); }
}

function keyOk(k) { const want = PropertiesService.getScriptProperties().getProperty('BOARD_KEY'); return !!want && String(k || '') === want; }

// board: newest first, last 200 tickets
function boardData(key) {
  if (!keyOk(key)) throw new Error('key');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.booking);
  if (!sh || sh.getLastRow() < 2) return { head: [], rows: [] };
  const v = sh.getDataRange().getDisplayValues(), head = v[0];
  return { head, rows: v.slice(1).slice(-200).reverse() };
}
const BOARD_EDIT = ['สถานะ', 'ราคาเพิ่มที่แจ้ง (ก่อน VAT)', 'นัดวัน', 'นัดช่วง', 'หมายเหตุทีม'];
function boardUpdate(key, ref, patch) {
  if (!keyOk(key)) throw new Error('key');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.booking), v = sh.getDataRange().getValues(), head = v[0], iRef = head.indexOf('เลขอ้างอิง');
  for (let r = v.length - 1; r > 0; r--) {
    if (String(v[r][iRef]) !== String(ref)) continue;
    Object.keys(patch || {}).forEach(k => { const c = head.indexOf(k); if (c >= 0 && BOARD_EDIT.indexOf(k) >= 0) sh.getRange(r + 1, c + 1).setValue(k === 'นัดวัน' && patch[k] ? "'" + clean(patch[k], 10) : safeCell(clean(patch[k], 500)));   // keep dates as yyyy-mm-dd text });
    if (patch && patch['สถานะ'] === 'ยืนยันคิว' && patch['นัดวัน']) markQueue(String(patch['นัดวัน']), String(patch['นัดช่วง'] || ''));
    return true;
  }
  return false;
}
// a confirmed visit fills its slot in "คิว" (ทั้งวัน = both)
function markQueue(date, slot) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); let sh = ss.getSheetByName('คิว');
  if (!sh) { sh = ss.insertSheet('คิว'); sh.appendRow(['วันที่', 'เช้า', 'บ่าย']); sh.setFrozenRows(1); }
  const v = sh.getDataRange().getDisplayValues(); let r = v.findIndex((x, i) => i > 0 && x[0] === date);
  if (r < 0) { sh.appendRow(["'" + date, '', '']); r = sh.getLastRow() - 1; }
  if (/เช้า|ทั้งวัน/.test(slot) || !slot) sh.getRange(r + 1, 2).setValue('เต็ม');
  if (/บ่าย|ทั้งวัน/.test(slot) || !slot) sh.getRange(r + 1, 3).setValue('เต็ม');
}
