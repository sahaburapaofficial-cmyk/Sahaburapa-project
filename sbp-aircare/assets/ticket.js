// SBP AirCare — job ticket (ใบจองงาน) — Rev.16 (owner 2 ต.ค. 2569: "การจอง slot booking งานให้ใส่หมายเหตุงาน หน้างานล้างเป็นยังไง แนบรูป
// และรายละเอียดเพื่อประเมินราคา หากเกินขอบเขตมาตรฐาน · ทำให้เป็น ticket real time เหมือนส่งข้อความแล้วเด้งมาระบบหลังบ้าน · จองคิวงานล้าง
// และติดตั้งทั้งหมด · คิดใน workflow ลูกค้าที่สะดวก · ข้อมูลที่บริษัทได้รับประเมินง่าย ลดปัญหาบวกเพิ่มหน้างานที่ไม่ชัดเจน")
//   · a few tap-only questions per job (cleaning / installation) — the facts that decide whether the visit stays inside the
//     standard package: height, access, where the outdoor unit sits, pipe / power / drain runs, wall, building rules
//   · scope(): each answer that leaves the standard maps to the Pricebook line that covers it — priced ones give an amount
//     (before VAT), the rest are marked "ประเมินจากรูป" — so the customer sees possible extras BEFORE booking and the team
//     gets the same list on the ticket (no surprise add-ons on site)
//   · photos: resized in the browser (≤ 1280 px JPEG) — sent with the ticket when the back office (Apps Script) is connected;
//     otherwise the customer is told plainly to send them in LINE with the reference number
//   · ticket → BACKEND (Apps Script): row in "งานจอง" + photos in Drive + instant e-mail / LINE push to the team + back-office
//     board (backend/apps-script/Board.html). No backend → the normal quotation hand-off (submit.js) + LINE for photos.
import { h, DATA, baht, addonsFor, COMPANY } from './sbp-core.js';
import { SURVEY } from './survey.js';
import { lineLink } from './contact.js';
import { BACKEND, canReach } from './submit.js';

const O = (id, th) => [id, th];
export const QUESTIONS = {
  clean: [
    { id: 'height', th: 'ตัวเครื่องสูงจากพื้นประมาณ', opts: [O('lo', 'ไม่เกิน 3 ม.'), O('hi', 'เกิน 3 ม.'), O('lift', 'สูงมาก ต้องนั่งร้าน / รถกระเช้า')] },
    { id: 'access', th: 'การเข้าถึงตัวเครื่อง', opts: [O('ok', 'ปกติ วางบันไดได้'), O('move', 'มีของบัง ต้องย้ายของ'), O('ceil', 'อยู่เหนือฝ้า ต้องเปิดฝ้า')] },
    { id: 'cdu', th: 'คอยล์ร้อนอยู่ที่', opts: [O('floor', 'พื้น / ระเบียง'), O('wall', 'แขวนผนังนอกอาคาร'), O('high', 'ดาดฟ้า / หลังคา / ที่สูง')] },
    { id: 'last', th: 'ล้างครั้งล่าสุด', opts: [O('6', 'ไม่เกิน 6 เดือน'), O('12', '6–12 เดือน'), O('24', 'เกิน 1 ปี'), O('na', 'ไม่ทราบ')] },
    { id: 'dirt', th: 'สภาพที่เห็น', multi: true, opts: [O('mold', 'คราบดำ / เชื้อรา'), O('oil', 'คราบน้ำมัน (ครัว ร้านอาหาร)'), O('smell', 'กลิ่นอับรุนแรง'), O('none', 'ไม่พบ')] },
    { id: 'sym', th: 'อาการ', multi: true, opts: [O('drip', 'น้ำหยด'), O('warm', 'เย็นน้อย / ไม่เย็น'), O('noise', 'เสียงดัง'), O('none', 'ปกติ')] },
    { id: 'site', th: 'สถานที่', opts: [O('home', 'บ้าน'), O('condo', 'คอนโด / อาคารต้องแจ้งนิติ'), O('shop', 'ร้านค้า / สำนักงาน'), O('ctrl', 'ห้อง Server / รพ. / พื้นที่ควบคุม')] },
  ],
  // Rev.18: repair / check-up visits book the same way — symptoms and access decide what the technician brings
  repair: [
    // Rev.21: the same symptom list as the triage assistant (acdiag.js) — ice / breaker / weak air / louver added
    { id: 'sym', th: 'อาการ', multi: true, opts: [O('warm', 'ไม่เย็น / เย็นน้อย'), O('drip', 'น้ำหยด / น้ำไหล'), O('ice', 'น้ำแข็งเกาะ'), O('dead', 'เปิดไม่ติด / ตัดบ่อย'), O('trip', 'เบรกเกอร์ตัด'), O('code', 'ไฟกะพริบ / ขึ้นรหัส'), O('noise', 'เสียงดัง / สั่น'), O('smell', 'มีกลิ่น'), O('weak', 'ลมเบา'), O('swing', 'บานสวิง')] },
    { id: 'age', th: 'อายุเครื่อง', opts: [O('3', 'ไม่เกิน 3 ปี'), O('7', '3–7 ปี'), O('old', 'เกิน 7 ปี'), O('na', 'ไม่ทราบ')] },
    { id: 'last', th: 'ล้างครั้งล่าสุด', opts: [O('6', 'ไม่เกิน 6 เดือน'), O('12', '6–12 เดือน'), O('24', 'เกิน 1 ปี'), O('na', 'ไม่ทราบ')] },
    { id: 'height', th: 'ตัวเครื่องสูงจากพื้นประมาณ', opts: [O('lo', 'ไม่เกิน 3 ม.'), O('hi', 'เกิน 3 ม.'), O('lift', 'สูงมาก ต้องนั่งร้าน / รถกระเช้า')] },
    { id: 'cdu', th: 'คอยล์ร้อนอยู่ที่', opts: [O('floor', 'พื้น / ระเบียง'), O('wall', 'แขวนผนังนอกอาคาร'), O('high', 'ดาดฟ้า / หลังคา / ที่สูง')] },
    { id: 'site', th: 'สถานที่', opts: [O('home', 'บ้าน'), O('condo', 'คอนโด / อาคารต้องแจ้งนิติ'), O('shop', 'ร้านค้า / สำนักงาน'), O('ctrl', 'ห้อง Server / รพ. / พื้นที่ควบคุม')] },
  ],
  install: [
    { id: 'job', th: 'ลักษณะงาน', opts: [O('new', 'ติดตั้งจุดใหม่'), O('move', 'ย้ายจากจุดเดิม'), O('replace', 'เปลี่ยนแทนเครื่องเดิม')] },
    { id: 'pipe', th: 'ระยะคอยล์เย็นถึงคอยล์ร้อนตามแนวท่อ (เมตร)', num: [1, 40, 4] },
    { id: 'wall', th: 'ผนังที่ต้องเจาะผ่าน', opts: [O('brick', 'อิฐ / ปูนฉาบ'), O('conc', 'คอนกรีตเสริมเหล็ก / ผนังหนา'), O('light', 'ยิปซัม / ไม้ / สมาร์ทบอร์ด'), O('glass', 'กระจก / ต้องผ่านช่องอื่น')] },
    { id: 'cdu', th: 'วางคอยล์ร้อนที่', opts: [O('floor', 'พื้น / ระเบียง'), O('wall', 'แขวนผนัง เอื้อมถึงจากระเบียง'), O('high', 'ผนังสูง ต้องนั่งร้าน / โรยตัว'), O('roof', 'ดาดฟ้า / หลังคา')] },
    { id: 'power', th: 'ไฟฟ้าสำหรับแอร์', opts: [O('ready', 'มีเบรกเกอร์ / สายแอร์เดิม'), O('new', 'ต้องเดินสายเมนใหม่'), O('na', 'ไม่แน่ใจ')] },
    { id: 'powerM', th: 'ระยะตู้ไฟถึงจุดติดตั้ง (เมตร)', num: [1, 60, 10], when: a => a.power === 'new' },
    { id: 'drain', th: 'น้ำทิ้ง', opts: [O('near', 'มีจุดทิ้งใกล้ (ไม่เกิน 4 ม.)'), O('far', 'ต้องเดินท่อยาว'), O('pump', 'ไม่มีทางลาด ต้องใช้ปั๊มน้ำทิ้ง')] },
    { id: 'drainM', th: 'ความยาวท่อน้ำทิ้งโดยประมาณ (เมตร)', num: [1, 40, 6], when: a => a.drain === 'far' },
    { id: 'hide', th: 'การเก็บท่อ', opts: [O('trunk', 'รางครอบท่อ (มาตรฐาน)'), O('chase', 'ฝังในผนัง / ซ่อนท่อ')] },
    { id: 'site', th: 'สถานที่', opts: [O('home', 'บ้าน'), O('condo', 'คอนโด / อาคารต้องแจ้งนิติ'), O('shop', 'ร้านค้า / สำนักงาน'), O('ctrl', 'ห้อง Server / รพ. / พื้นที่ควบคุม')] },
  ],
};
export const DEFAULTS = { clean: { height: 'lo', access: 'ok', cdu: 'floor', last: 'na', dirt: ['none'], sym: ['none'], site: 'home' },
  repair: { sym: ['warm'], age: 'na', last: 'na', height: 'lo', cdu: 'floor', site: 'home' },
  install: { job: 'new', pipe: 4, wall: 'brick', cdu: 'floor', power: 'ready', powerM: 10, drain: 'near', drainM: 6, hide: 'trunk', site: 'home' } };

/* ---------- which jobs the quotation holds ---------- */
const INS_T = { W: 'wall', C: 'ceiling', K: 'cassette', FS: 'floor' };
export const INS_KEY = /^I[NV]?-INS-(W|C|K|FS)-(\d+)-(\d+)/;
// ★Rev.21.1 (review BUG-02): every installation line keeps its own type / BTU / quantity — extras that depend on the unit
// (pipe per metre, removal) are priced per line and added up, never from the first unit times all units.
// Add-on lines already in the quotation (pipe, removal, power, drain …) are machines of nobody: they are not counted as units,
// and the ticket does not add the same Pricebook item again (codes).
export function jobsIn(items) {
  const clean = items.filter(i => i.group === 'clean' && i.unitEx != null);
  const inst = items.filter(i => i.group === 'install');
  const units = []; inst.forEach(i => { const m = INS_KEY.exec(i.key || ''); if (m) units.push({ key: i.key, name: i.name, type: INS_T[m[1]], btu: +m[3], qty: i.qty }); });
  const surveys = inst.filter(i => i.kind === 'survey').length, addOns = inst.filter(i => i.kind !== 'survey' && !INS_KEY.test(i.key || ''));
  const codes = new Set(addOns.map(i => (/^I[NV]?-(.+)$/.exec(i.key || '') || [])[1]).filter(Boolean));
  const nUnits = units.reduce((n, u) => n + u.qty, 0) + surveys;
  return { clean: clean.reduce((n, i) => n + i.qty, 0), repair: items.filter(i => i.group === 'repair').reduce((n, i) => n + (i.unitEx == null ? 1 : i.qty), 0), install: nUnits || (addOns.length ? 1 : 0),
    units, surveys, codes, type: units[0] ? units[0].type : 'wall', btu: units[0] ? units[0].btu : 12000 };
}
const TYPE_TH = { wall: 'ติดผนัง', ceiling: 'แขวน', cassette: 'สี่ทิศทาง', floor: 'ตู้ตั้ง' };
export const unitLabel = u => `${TYPE_TH[u.type] || u.type} ${Math.round(u.btu / 1000)}k BTU${u.qty > 1 ? ` × ${u.qty}` : ''}`;
// pipe length of one installation line (metres): its own answer, else the shared one
export const pipeOf = (a, u) => +((a.pipeBy || {})[u.key] ?? a.pipe) || 0;

/* ---------- scope: answers outside the standard package → Pricebook lines ---------- */
const cleanAdd = re => DATA.clean.find(r => !r.type && re.test(r.name));
const inst = c => DATA.instByCode[c];
const diag = () => DATA.rep.find(r => r.cat === 'ตรวจวินิจฉัย');
// one line: th (what), ex (unit price before VAT or null = assessed from photos), qty, unit, why
// src missing (or not in the Pricebook) → still listed, as "ประเมินจากรูป"
const L = (th, src, qty, why) => ({ th, ex: !src ? null : src.ex !== undefined ? src.ex : src.rate ? src.rate.s : null, qty, unit: (src && src.unit) || '', why });
export function scope(kind, a, ctx = {}) {
  const out = [], push = x => x && out.push(x), n = Math.max(1, ctx.units || 1), held = [];
  if (kind === 'clean') {
    if (a.height === 'hi') push(L('งานสูงเกิน 3 เมตร', cleanAdd(/ความสูงเกิน 3/), 1, 'ต้องใช้บันไดสูงและอุปกรณ์กันตก'));
    if (a.height === 'lift' || a.cdu === 'high') push(L('บันไดพิเศษ / นั่งร้าน / รถกระเช้า', cleanAdd(/นั่งร้าน|รถกระเช้า/), 1, a.height === 'lift' ? 'ตัวเครื่องสูงมาก' : 'คอยล์ร้อนอยู่ที่สูง'));
    if (a.access === 'ceil') push(L('เปิดฝ้า / ปิดฝ้าคืน', cleanAdd(/เปิดฝ้า/), n, 'ตัวเครื่องอยู่เหนือฝ้า'));
    const d = a.dirt || [];
    if (d.some(x => x !== 'none')) push(L('คราบหนัก / เชื้อรา / คราบน้ำมัน / กลิ่นรุนแรง', cleanAdd(/คราบน้ำมัน|คราบหนัก/), n, 'ทีมยืนยันจากรูปว่าต้องใช้หรือไม่ (ต่อเครื่อง)'));
    if (a.site === 'ctrl') push(L('พื้นที่ควบคุม (Server / รพ. / Cleanroom)', cleanAdd(/Server|พื้นที่ควบคุม/), 1, 'ต้องวางแผนวิธีทำงานและป้องกันพื้นที่'));
    const s = a.sym || [];
    if (s.some(x => x !== 'none')) push(L('ตรวจอาการเพิ่มเติม (แจ้งราคาก่อนซ่อมทุกครั้ง)', diag() && { ex: diag().rate.s, unit: diag().unit }, 1, 'มีอาการ ' + s.filter(x => x !== 'none').map(x => ({ drip: 'น้ำหยด', warm: 'เย็นน้อย', noise: 'เสียงดัง' })[x]).join(' / ') + ' — ล้างอาจไม่หาย'));
  }
  if (kind === 'repair') {
    if (a.height === 'hi') push(L('งานสูงเกิน 3 เมตร', cleanAdd(/ความสูงเกิน 3/), 1, 'ต้องใช้บันไดสูงและอุปกรณ์กันตก'));
    if (a.height === 'lift' || a.cdu === 'high') push(L('บันไดพิเศษ / นั่งร้าน / รถกระเช้า', cleanAdd(/นั่งร้าน|รถกระเช้า/), 1, a.height === 'lift' ? 'ตัวเครื่องสูงมาก' : 'คอยล์ร้อนอยู่ที่สูง'));
    if (a.site === 'ctrl') push(L('พื้นที่ควบคุม (Server / รพ. / Cleanroom)', cleanAdd(/Server|พื้นที่ควบคุม/), 1, 'ต้องวางแผนวิธีทำงานและป้องกันพื้นที่'));
  }
  if (kind === 'install') {
    // one entry per installation line (type / BTU / qty); a quotation with only a survey line behaves like one wall unit as before
    const lines = ctx.lines && ctx.lines.length ? ctx.lines : [{ key: '', type: ctx.type || 'wall', btu: ctx.btu || 12000, qty: n }];
    const many = lines.length > 1, codes = ctx.codes || new Set();
    const pushOnce = (x, src) => { if (src && src.code && codes.has(src.code)) { held.push(x.th); return; } push(x); };   // already a line in the quotation
    lines.forEach(u => {
      const pipeItem = addonsFor(u.type, u.btu)[0].items[0].item, m = pipeOf(a, u), extra = Math.max(0, Math.ceil(m - 4)), tag = many ? ` · ${unitLabel(u)}` : '';
      if (extra) pushOnce(L(`ท่อน้ำยาส่วนเกิน ${extra} ม.${tag} (ราคาติดตั้งรวม 4 ม. แรก)`, pipeItem, extra * u.qty, `ระยะประมาณ ${m} ม.${u.qty > 1 ? ' ต่อเครื่อง' : ''} · ${baht(pipeItem.ex)}/ม.`), pipeItem);
      const rem = inst({ wall: 'REM-W', ceiling: 'REM-C', cassette: 'REM-K', floor: 'REM-FS' }[u.type] || 'REM-W');
      if (a.job !== 'new') pushOnce(L('รื้อเครื่องเดิม' + tag, rem, u.qty, a.job === 'move' ? 'ย้ายจากจุดเดิม' : 'เปลี่ยนแทนเครื่องเดิม'), rem);
    });
    // the same for every unit (wall, roof stand, power run, drain, permit): counted per unit or once per visit, as before
    const I = c => inst(c);
    if (a.wall === 'conc' || a.wall === 'glass') pushOnce(L('เจาะ Core Drill / ทางผ่านพิเศษ', I('CIV-CORE'), n, a.wall === 'conc' ? 'ผนังคอนกรีต / หนา' : 'ผนังกระจก'), I('CIV-CORE'));
    if (a.cdu === 'high') { const x = I('ACC-SCAFF') || I('ACC-HEIGHT'); pushOnce(L('งานที่สูง (นั่งร้าน / โรยตัว)', x, 1, 'วางคอยล์ร้อนที่สูง'), x); }
    if (a.cdu === 'roof') pushOnce(L('ฐานรองบนหลังคาพร้อมกันซึม', I('SUP-ROOF'), n, 'วางบนดาดฟ้า / หลังคา'), I('SUP-ROOF'));
    if (a.power === 'new') { const m = Math.max(1, +a.powerM || 0); pushOnce(L(`เดินเมนไฟจากตู้ไฟ ${m} ม.`, I('ELE-MAIN-1P-2.5'), m * n, 'ขนาดสายจริงตามกระแสของรุ่น ช่างยืนยันก่อนติดตั้ง · เบรกเกอร์ 1 ตัวรวมในแพ็กเกจแล้ว'), I('ELE-MAIN-1P-2.5')); }   // Rev.17: the package already has the breaker — no RCBO line
    if (a.power === 'na') push(L('ตรวจระบบไฟก่อนติดตั้ง', null, 1, 'ส่งรูปตู้ไฟให้ทีมดู'));
    if (a.drain === 'far') { const m = Math.max(0, Math.ceil((+a.drainM || 0) - 4)); if (m) pushOnce(L(`ท่อน้ำทิ้งเพิ่ม ${m} ม.`, I('MAT-SCG-DRAIN-34'), m * n, `ยาวประมาณ ${a.drainM} ม. · แพ็กเกจรวม 4 ม. แรก`), I('MAT-SCG-DRAIN-34')); }   // Rev.17: 4 m are in the package (was 3)
    if (a.drain === 'pump') pushOnce(L('ชุดปั๊มน้ำทิ้ง', I('DRAIN-PUMP-15'), n, 'ไม่มีทางลาดให้น้ำไหล'), I('DRAIN-PUMP-15'));
    if (a.hide === 'chase') pushOnce(L('กรีดผนังฝังท่อ / คืนสภาพ', I('CIV-CHASE'), 1, 'ซ่อนท่อในผนัง'), I('CIV-CHASE'));
    if (a.site === 'ctrl') pushOnce(L('ประสาน Permit / ควบคุมพื้นที่', I('ACC-PERMIT'), 1, 'พื้นที่ควบคุม'), I('ACC-PERMIT'));
  }
  const lines = out;
  const priced = lines.filter(l => l.ex != null), est = priced.reduce((s, l) => s + l.ex * l.qty, 0);
  const notes = [];
  if (kind === 'repair') notes.push('ค่าตรวจตามรายการในใบ · ค่าอะไหล่ / น้ำยา / ค่าซ่อม ช่างตรวจแล้วแจ้งราคาให้อนุมัติก่อนซ่อมทุกครั้ง ไม่ซ่อมก่อนคุณอนุมัติ');
  if (kind === 'repair' && (a.sym || []).includes('code')) notes.push('ถ่ายวิดีโอไฟกะพริบ / รหัสบนจอแนบมาด้วย ช่างเตรียมอะไหล่ได้ตรงขึ้น');
  if (kind === 'repair' && (a.last === '24' || a.last === 'na') && (a.sym || []).some(x => ['warm', 'drip', 'smell', 'ice', 'weak'].includes(x))) notes.push('อาการนี้หลายครั้งหายด้วยการล้าง — ช่างตรวจแล้วแนะนำว่าควรล้างหรือซ่อม');
  if (kind === 'repair' && (a.sym || []).includes('trip')) notes.push('เบรกเกอร์ตัดซ้ำ: ปิดเบรกเกอร์แอร์ทิ้งไว้และไม่เปิดใช้จนกว่าช่างตรวจ ถ้ามีกลิ่นไหม้หรือควัน โทรแจ้งทีมเพื่อเร่งคิว');
  if (a.site === 'condo') notes.push('คอนโด / อาคาร: แจ้งนิติและจองลิฟต์ขนของล่วงหน้า ทีมส่งรายชื่อช่างให้ได้');
  if (kind === 'clean' && (a.last === '24' || a.last === 'na')) notes.push('ไม่ได้ล้างเกิน 1 ปี หรือไม่ทราบ — ถ้ามีคราบดำที่ใบพัด ทีมอาจแนะนำล้างใหญ่ (C2) จากรูป');
  if (kind === 'install' && a.power === 'ready') notes.push('ใช้สายเดิมได้เมื่อขนาดสายและเบรกเกอร์พอกับรุ่นใหม่ — ช่างตรวจก่อนต่อไฟ');
  if (held.length) notes.push(`อยู่ในรายการด้านบนแล้ว ไม่คิดซ้ำ: ${held.join(' · ')}`);
  if (kind === 'install' && (ctx.lines || []).length > 1) notes.push('คิดส่วนเพิ่มแยกตามชนิดและขนาดของแต่ละรายการ แล้วรวมกัน');
  return { lines, est, review: lines.length > 0, assess: lines.filter(l => l.ex == null).length, notes };
}

/* ---------- photos: resize in the browser ---------- */
export async function shrink(file, max = 1280, q = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  } finally { URL.revokeObjectURL(url); }
}
export const MAX_PHOTOS = 8;

/* ---------- the ticket panel inside the quotation drawer ---------- */
// draft lives on the cart (memory only — photos are never written to localStorage); onChange re-renders the totals
export function ticketPanel(draft, jobs, { onChange = () => {} } = {}) {
  const kinds = ['clean', 'repair', 'install'].filter(k => jobs[k] > 0);
  const box = h('div', { class: 'tk' });
  if (!kinds.length) return box;
  kinds.forEach(k => { draft.ans[k] = { ...DEFAULTS[k], ...(draft.ans[k] || {}) }; });
  const res = h('div', { class: 'tk-scope', 'aria-live': 'polite' });
  const drawScope = () => {
    res.innerHTML = '';
    kinds.slice(1).forEach(k => { draft.ans[k].site = draft.ans[kinds[0]].site; });
    const all = kinds.map(k => ({ k, r: scope(k, draft.ans[k], { units: jobs[k], type: jobs.type, btu: jobs.btu, lines: jobs.units, codes: jobs.codes }) }));
    draft.scope = all; draft.units = jobs.units || [];
    const lines = all.flatMap(x => x.r.lines), est = all.reduce((s, x) => s + x.r.est, 0), notes = all.flatMap(x => x.r.notes);
    if (!lines.length) res.append(h('p', { class: 'tk-ok' }, h('b', {}, 'อยู่ในขอบเขตงานมาตรฐาน'), ' · ราคาตามรายการด้านบน ทีมยืนยันจากรูปอีกครั้ง'));
    else res.append(h('p', { class: 'tk-warn' }, h('b', {}, `มี ${lines.length} จุดที่อาจเกินงานมาตรฐาน`), est ? ` · ประมาณ ${baht(est)} ก่อน VAT` : '', lines.some(l => l.ex == null) ? ' + รายการที่ทีมประเมินจากรูป' : ''),
      h('ul', { class: 'tk-lines' }, lines.map(l => h('li', {}, h('span', {}, l.th, h('small', {}, l.why)), h('b', {}, l.ex == null ? 'ประเมินจากรูป' : `${baht(l.ex * l.qty)}${l.qty > 1 ? ` (${l.qty} ${l.unit})` : ''}`)))),
      h('p', { class: 'tk-promise' }, 'ทีมแจ้งราคาส่วนเพิ่มทั้งหมดให้คุณอนุมัติก่อนยืนยันคิว หน้างานไม่เพิ่มรายการโดยไม่แจ้ง — ถ้าสภาพจริงต่างจากข้อมูลหรือรูป ช่างแจ้งและรอคุณอนุมัติก่อนทำ'));
    if (notes.length) res.append(h('ul', { class: 'tk-notes' }, notes.map(n => h('li', {}, n))));
    onChange();
  };
  kinds.forEach(k => {
    const A = draft.ans[k];
    const sec = h('fieldset', { class: 'tk-q' }, h('legend', {}, k === 'clean' ? `สภาพหน้างานล้าง (${jobs.clean} เครื่อง)` : k === 'repair' ? `อาการและหน้างานซ่อม / ตรวจเช็ก (${jobs.repair} รายการ)` : `สภาพหน้างานติดตั้ง (${jobs.install} เครื่อง)`));
    // Rev.21: the triage assistant's result travels with the booking so the technician prepares for the likely point
    if (k === 'repair' && draft.diag && draft.diag.text) {
      const dg = h('div', { class: 'tk-diag' + (draft.diag.urgent ? ' urgent' : '') },
        h('p', { class: 'tk-l' }, 'ผลประเมินเบื้องต้นจากผู้ช่วยตรวจอาการ', h('small', {}, ' · ส่งไปกับใบจอง ช่างยืนยันหน้างานก่อนเสนอราคาซ่อม')),
        h('ul', {}, draft.diag.text.split('\n').map(x => h('li', {}, x))),
        h('button', { type: 'button', class: 'tk-diag-x', onclick: () => { delete draft.diag; dg.remove(); onChange(); } }, 'ไม่ส่งผลประเมินนี้'));
      sec.append(dg);
    }
    const draw = () => {
      [...sec.querySelectorAll('.tk-row')].forEach(x => x.remove());
      QUESTIONS[k].forEach(q => {
        if (q.when && !q.when(A)) return;
        if (q.id === 'site' && k !== kinds[0]) return;   // asked once (cleaning section) when both jobs are booked
        const row = h('div', { class: 'tk-row' }, h('p', { class: 'tk-l', id: `tk-${k}-${q.id}` }, q.th, q.multi ? h('small', {}, ' (เลือกได้หลายข้อ)') : null));
        if (q.id === 'pipe' && k === 'install' && (jobs.units || []).length > 1) {   // ★Rev.21.1 BUG-02: pipe length per installation line
          A.pipeBy = A.pipeBy || {};
          const [mn, mx] = q.num;
          row.append(h('div', { class: 'tk-per' }, jobs.units.map((u, ui) => { const id = `tk-pipe-${ui}`;
            return h('label', { class: 'tk-per-r', for: id }, h('span', {}, unitLabel(u), u.qty > 1 ? h('small', {}, ' (ระยะเดียวกันทุกเครื่องในรายการนี้)') : null),
              h('input', { id, type: 'number', min: mn, max: mx, step: 1, inputmode: 'numeric', class: 'tk-num', value: pipeOf(A, u),
                onchange: e => { A.pipeBy[u.key] = Math.max(mn, Math.min(mx, +e.target.value || mn)); e.target.value = A.pipeBy[u.key]; drawScope(); } })); })));
        } else if (q.num) {
          const [mn, mx] = q.num;
          row.append(h('input', { type: 'number', min: mn, max: mx, step: 1, inputmode: 'numeric', value: A[q.id], 'aria-labelledby': `tk-${k}-${q.id}`, class: 'tk-num',
            onchange: e => { A[q.id] = Math.max(mn, Math.min(mx, +e.target.value || mn)); e.target.value = A[q.id]; drawScope(); } }));
        } else {
          row.append(h('div', { class: 'tk-opts', role: q.multi ? 'group' : 'radiogroup', 'aria-labelledby': `tk-${k}-${q.id}` }, q.opts.map(([id, th]) => {
            const on = q.multi ? (A[q.id] || []).includes(id) : A[q.id] === id;
            return h('button', { type: 'button', class: 'tk-o' + (on ? ' on' : ''), role: q.multi ? null : 'radio', 'aria-checked': q.multi ? null : String(on), 'aria-pressed': q.multi ? String(on) : null,
              onclick: () => {
                if (q.multi) { let v = (A[q.id] || []).filter(x => x !== id); if (!on) v = id === 'none' ? ['none'] : [...v.filter(x => x !== 'none'), id]; A[q.id] = v.length ? v : ['none']; }
                else A[q.id] = id;
                draw(); drawScope();
              } }, th);
          })));
        }
        sec.append(row);
      });
    };
    draw(); box.append(sec);
  });
  box.append(res);

  /* photos + note */
  const hint = kinds.flatMap(k => SURVEY[k].items.filter(([kind]) => kind === 'photo').map(([, t]) => t));
  const thumbs = h('div', { class: 'tk-thumbs' });
  const drawThumbs = () => { thumbs.innerHTML = ''; draft.photos.forEach((p, i) => thumbs.append(h('figure', {}, h('img', { src: p.data, alt: `รูปหน้างาน ${i + 1}` }), h('button', { type: 'button', class: 'tk-rm', 'aria-label': `ลบรูปที่ ${i + 1}`, onclick: () => { draft.photos.splice(i, 1); drawThumbs(); } }, '×')))); cnt.textContent = `${draft.photos.length} / ${MAX_PHOTOS} รูป`; };
  const cnt = h('small', { class: 'tk-cnt' });
  const file = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'tk-file', id: 'tk-file',
    onchange: async e => { const fs = [...e.target.files].slice(0, MAX_PHOTOS - draft.photos.length); for (const f of fs) { try { draft.photos.push({ name: f.name.replace(/\.[^.]+$/, '') + '.jpg', data: await shrink(f) }); } catch (er) { /* not an image the browser can read */ } } e.target.value = ''; drawThumbs(); } });
  const note = h('textarea', { class: 'tk-note', rows: 3, placeholder: 'เช่น เครื่องอยู่ห้องนอนชั้น 2 · มีน้ำหยดตอนเปิดนาน ๆ · จอดรถหน้าบ้านได้ · คอนโดต้องแลกบัตร', 'aria-label': 'หมายเหตุหน้างาน', oninput: e => { draft.note = e.target.value; onChange(); } }, draft.note || '');
  box.append(h('div', { class: 'tk-ph' },
    h('p', { class: 'tk-l' }, 'รูปหน้างาน ', h('small', {}, '(ช่วยให้ทีมประเมินได้ก่อนนัด ไม่ต้องรอช่างไปดู)')),
    h('ul', { class: 'tk-hint' }, hint.map(t => h('li', {}, t))),
    h('label', { class: 's-btn ghost tk-add', for: 'tk-file' }, 'เพิ่มรูป', file), cnt, thumbs,
    h('p', { class: 'tk-l' }, 'หมายเหตุหน้างาน'), note));
  drawThumbs(); drawScope();
  return box;
}

/* ---------- text for the team (same facts as the ticket row) ---------- */
export function ticketText(draft) {
  const out = [];
  (draft.scope || []).forEach(({ k, r }) => {
    const A = draft.ans[k];
    out.push(`— สภาพหน้างาน${k === 'clean' ? 'ล้าง' : k === 'repair' ? 'ซ่อม / ตรวจเช็ก' : 'ติดตั้ง'} —`);
    const U = k === 'install' ? (draft.units || []) : [];
    QUESTIONS[k].forEach(q => { if (q.when && !q.when(A)) return; const v = A[q.id];
      if (q.id === 'pipe' && U.length > 1) { U.forEach(u => out.push(`${q.th} · ${unitLabel(u)}: ${pipeOf(A, u)}`)); return; }
      out.push(`${q.th}: ${q.num ? v : [].concat(v).map(x => (q.opts.find(o => o[0] === x) || [, x])[1]).join(', ')}`); });
    out.push(r.lines.length ? `เกินมาตรฐาน ${r.lines.length} จุด${r.est ? ` · ประมาณ ${baht(r.est)} ก่อน VAT` : ''}:` : 'อยู่ในขอบเขตงานมาตรฐาน');
    r.lines.forEach(l => out.push(`  • ${l.th} — ${l.ex == null ? 'ประเมินจากรูป' : baht(l.ex * l.qty)} (${l.why})`));
  });
  if (draft.diag && draft.diag.text && (draft.scope || []).some(x => x.k === 'repair')) out.push('— ผลประเมินเบื้องต้นจากผู้ช่วยตรวจอาการ (ช่างยืนยันหน้างาน) —', draft.diag.text);
  if (draft.note) out.push(`หมายเหตุ: ${draft.note}`);
  out.push(`รูปที่แนบ: ${draft.photos.length} รูป`);
  return out.join('\n');
}

/* ---------- send: Apps Script back office (with photos) or the e-mail hand-off + LINE for photos ---------- */
export async function sendTicket(payload) {
  if (!BACKEND || !canReach()) return { ok: false, reason: 'off' };
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(BACKEND, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ kind: 'booking', ...payload, ts: new Date().toISOString() }) });
    const j = await r.json().catch(() => null);
    return j && j.ok ? { ok: true, ref: j.ref || payload.ref, photos: j.photos || 0 } : { ok: false, reason: (j && j.error) || 'http ' + r.status };
  } catch (e) { return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network' }; } finally { clearTimeout(t); }
}
// LINE hand-off for photos when they could not travel with the ticket
export const photoLine = (ref, n) => h('div', { class: 's-hand tk-line' },
  h('p', {}, n ? `รูป ${n} รูปยังไม่ได้ส่งถึงทีม (${BACKEND && canReach() ? 'ส่งอัตโนมัติไม่สำเร็จ' : 'ระบบรับรูปยังไม่เปิดใช้'}) กรุณาส่งทาง LINE พร้อมเลขอ้างอิง ${ref}` : `ส่งรูปหน้างานทาง LINE พร้อมเลขอ้างอิง ${ref} ทีมจะประเมินได้เร็วขึ้น`),
  h('a', { class: 's-btn primary', href: lineLink(`เลขอ้างอิง ${ref} · ส่งรูปหน้างานเพื่อประเมิน`), target: '_blank', rel: 'noopener' }, `ส่งรูปทาง LINE ${COMPANY.line || ''}`.trim()));
