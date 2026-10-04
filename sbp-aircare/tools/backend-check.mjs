// SBP AirCare — live check of the deployed back office (Apps Script web app) — Rev.19
//   node tools/backend-check.mjs https://script.google.com/macros/s/<id>/exec           read-only: ping · slots · status
//   node tools/backend-check.mjs https://script.google.com/macros/s/<id>/exec --write   + one test booking with a photo
// The test booking is a real row (ref TEST…, name "ทดสอบระบบ") and sends the team e-mail / LINE: delete the row and its
// Drive folder afterwards, or run selfTest() in the Apps Script editor instead (it cleans up after itself).
const url = process.argv[2], write = process.argv.includes('--write');
if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url || '')) { console.error('usage: node tools/backend-check.mjs https://script.google.com/macros/s/<id>/exec [--write]'); process.exit(2); }
const out = [], ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ' · ' + i : ''}`); console.log(out.at(-1)); };
const get = async q => { const r = await fetch(`${url}?${q}`, { redirect: 'follow' }); const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { ok: false, error: 'not JSON (deployment access must be "Anyone")', body: t.slice(0, 120) }; } };

const ping = await get('q=ping');
ok('ping: web app ตอบ', ping.ok, JSON.stringify(ping));
ok('เวอร์ชันโค้ด Rev.19 ขึ้นไป', ping.ok && /^Rev\.(19|[2-9]\d)/.test(ping.version || ''), ping.version || 'old Code.gs — paste the new one and Deploy → Manage deployments → Edit → New version');
ok('ผูกกับ Google Sheet แล้ว', ping.sheet === true);
ok('ตั้ง BOARD_KEY แล้ว (บอร์ดหลังบ้านใช้ได้)', ping.board === true, ping.board ? '' : 'run setup() once');
const sl = await get('q=slots');
ok('ตารางคิว (?q=slots)', sl.ok && typeof sl.days === 'object', `${Object.keys(sl.days || {}).length} วันที่มีการบันทึก`);
const no = await get('q=status&ref=NOPE000&tel=0000');
ok('ตรวจสถานะ: เลขที่ไม่มี → ไม่พบ', no.ok === false);
if (write) {
  const ref = 'TEST' + String(Date.now()).slice(-6), PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow',
    body: JSON.stringify({ kind: 'booking', ref, variant: 'T', page: 'backend-check', fields: { 'ชื่อ / บริษัท': 'ทดสอบระบบ', 'โทร': '0800001234', 'งาน': 'ทดสอบ', 'ขอบเขต': 'ทดสอบ' }, text: 'ทดสอบระบบหลังบ้าน (ลบแถวนี้ได้)', photos: [{ name: 't.png', data: PNG }] }) });
  const j = await r.json().catch(() => ({}));
  ok('ส่งใบจองทดสอบ + รูป', j.ok && j.ref === ref && j.photos === 1, JSON.stringify(j));
  const s = await get(`q=status&ref=${ref}&tel=1234`);
  ok('ตรวจสถานะใบจองทดสอบ', s.ok && s.status === 'ใหม่', JSON.stringify(s));
  console.log(`→ ลบแถว ${ref} ในแท็บ "งานจอง" และโฟลเดอร์ ${ref} ใน Drive "SBP AirCare งานจอง" หลังตรวจ`);
}
const fails = out.filter(l => l.startsWith('FAIL')).length;
console.log(`\n${out.length - fails}/${out.length} PASS`);
process.exit(fails ? 1 : 0);
