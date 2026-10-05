// SBP AirCare — "เทิร์นแอร์เก่า · ซ่อมหรือเปลี่ยนดี" — Rev.24 (owner 3 ต.ค. 2569: "เสริมระบบเทิร์นแอร์เก่า เพื่อกลุ่มลูกค้าต้องการ
// รีโนเวทพื้นที่ โดยแอร์มีอายุเกิน 7–10 ปีขึ้นไป เพื่อนำมาเป็นส่วนลดและลดค่าใช้จ่ายในการซ่อมแซมที่แพง")
//   · the visitor gives age, type, size, compressor system, refrigerant, the problem and how many units → side by side:
//     repair the old unit (repair lines from the Pricebook — lines without a standard rate stay "ประเมินหน้างาน", the known
//     part is shown as "อย่างน้อย") vs. trade it in for a new inverter unit (catalogue prices of that type and size + the
//     standard installation; ★Rev.27 taking the old unit out = removal (pump-down included) + carrying it away at the standard
//     rates of rates.js, added to the total before the trade-in value) + electricity old vs new (studio-model energy())
//   · trade-in value — Rev.24.1 (owner 3 ต.ค. 2569: "ตารางมูลค่าหาได้จากราคามาตรฐานที่ HomePro หรือเว็บขายแอร์ออนไลน์รับเทิร์น
//     ทุกอย่างและใช้ได้เลย"): TRADE_IN.table = the Bangkok 2569 market rates for old units by size and condition (working / not
//     working) as published by AC buy-back / trade-in shops (banoldair.simdif.com 2569 cash table 9k 900 · 12k 1,200 · 18k 1,600 ·
//     36k 3,200; the 2569 working / not-working ranges; hatyaiair.com trade-in 500–1,800) — shown as a range per unit, confirmed when
//     the team inspects the unit · conditions follow common retail trade-in terms (HomePro: ≥ 9,000 BTU, indoor + outdoor units
//     complete with front panel and covers, any brand, working or not). Fixed baht per unit, never a % (CLAUDE.md §6.6 rule 4);
//     the site names no retailer.
//   · verdict = rules of thumb technicians use (age, major fault, R22, repair ≥ 50 % of a new set, age × repair ≥ new set) —
//     shown as reasons, never as a promise (rule 11: no "ประหยัดไฟแน่นอน")
//   · Rev.26 (owner 4 ต.ค. 2569: "ตรวจเช็คข้อมูลและวิธีการจัดเก็บข้อมูล workflow ให้ละเอียด ให้ลูกค้าได้คำตอบและความกระจ่างมากที่สุด และ
//     จุดประสงค์ลูกค้าคืออะไรในการเทิร์น"): the purpose of the trade-in (PURPOSES, several) with what to check for each · old unit
//     brand / model from the nameplate (optional — empty stays empty) · questions and answers (QA) · tradeInSummary() = the one
//     structured record that goes to the team (cart.draft.tradein → quote / booking field "ข้อมูลเทิร์นแอร์เก่า" → Sheet column) and
//     is shown to the visitor before sending ("ข้อมูลที่ส่งถึงทีม")
import { h, baht, DATA, DEMO, TYPES, TYPE_BY_ID, BRANDS, VOLUME_HINT, installOptions, btuFmt } from './sbp-core.js';
import { energy, RATE } from './studio-model.js';
import { cart } from './commerce.js';
import { askTeam } from './contact.js';
import { toast } from './proto-ui.js';

/** owner-set trade-in values: null = not published yet (the page then says the team assesses it) */
export const TRADE_IN = {
  minAge: 7, minBtu: 9000,
  // per unit, baht: working (ok) / not working or for repair (bad) — size bands by the old unit's BTU
  table: [
    { max: 12000, th: 'ไม่เกิน 12,000 BTU', ok: [900, 1300], bad: [300, 700] },
    { max: 24000, th: '12,001–24,000 BTU', ok: [1400, 2200], bad: [500, 1200] },
    { max: Infinity, th: '24,001 BTU ขึ้นไป', ok: [2400, 3500], bad: [800, 1800] },
  ],
  terms: [
    'รับเครื่องเดิมทุกยี่ห้อ ไม่ว่าซื้อจากที่ไหน ใช้งานได้หรือเสียแล้ว ขนาด 9,000 BTU ขึ้นไป',
    'ต้องมีครบทั้งคอยล์เย็นและคอยล์ร้อน พร้อมหน้ากากและฝาครอบ',
    'ทีมช่างเก็บน้ำยาและรื้อเครื่องเดิมเอง ในวันติดตั้งเครื่องใหม่',
    'มูลค่าเทิร์นหักจากใบเสนอราคาเครื่องใหม่พร้อมติดตั้งของบริษัท ไม่จ่ายเป็นเงินสด',
    'มูลค่าจริงยืนยันเมื่อทีมตรวจเครื่อง ตามขนาด อายุ และสภาพ · ส่งมอบแล้วขอคืนไม่ได้',
  ],
};
const WORKING = { reno: 1, weak: 1 };   // the problem picked says whether the old unit still runs
/** trade-in value range for one old unit, or null when it does not qualify (smaller than 9,000 BTU) */
export function tradeValue(x) {
  if (!(x.btu >= TRADE_IN.minBtu)) return null;
  const b = TRADE_IN.table.find(r => x.btu <= r.max), ok = !!WORKING[x.issue];
  return { lo: (ok ? b.ok : b.bad)[0], hi: (ok ? b.ok : b.bad)[1], working: ok, band: b.th };
}

export const AGES = [
  { id: 'a3', th: 'ไม่ถึง 5 ปี', y: 3 }, { id: 'a6', th: '5–7 ปี', y: 6 }, { id: 'a8', th: '7–10 ปี', y: 8.5 },
  { id: 'a12', th: '10–15 ปี', y: 12 }, { id: 'a16', th: 'เกิน 15 ปี', y: 16 },
];
export const SIZES = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];
export const SYSTEMS = [{ id: 'fix', th: 'Fixed speed (ธรรมดา)' }, { id: 'inv', th: 'Inverter' }, { id: 'unk', th: 'ไม่ทราบ' }];
export const REFS = [{ id: 'r22', th: 'R22 (รุ่นเก่า)' }, { id: 'r410', th: 'R410A' }, { id: 'r32', th: 'R32' }, { id: 'unk', th: 'ไม่ทราบ' }];
// problems: major = the fault class where technicians weigh replacing an old unit
export const ISSUES = [
  { id: 'reno', th: 'ยังใช้ได้ แต่จะรีโนเวท / อยากเปลี่ยนให้ทันสมัย', major: false },
  { id: 'comp', th: 'คอมเพรสเซอร์เสีย / ไม่ติด / ตัดบ่อย', major: true },
  { id: 'leak', th: 'น้ำยารั่ว ต้องเติมบ่อย', major: true },
  { id: 'coilOut', th: 'แผงคอยล์ร้อนผุ / รั่ว', major: true },
  { id: 'coilIn', th: 'แผงคอยล์เย็นรั่ว', major: true },
  { id: 'board', th: 'บอร์ดควบคุมเสีย', major: false },
  { id: 'fanIn', th: 'มอเตอร์พัดลมคอยล์เย็นเสีย', major: false },
  { id: 'fanOut', th: 'มอเตอร์พัดลมคอยล์ร้อนเสีย', major: false },
  { id: 'weak', th: 'ไม่ค่อยเย็น ค่าไฟสูง ยังไม่รู้สาเหตุ', major: false },
];
// Rev.26 — why the visitor is looking at a trade-in; each purpose says what to check and where the page answers it
export const PURPOSES = [
  { id: 'reno', th: 'รีโนเวท / ตกแต่งห้องใหม่', tip: 'แจ้งแบบห้องใหม่และตำแหน่งที่อยากติด ทีมวางแนวท่อและรางให้เข้ากับงานตกแต่ง และนัดติดตั้งหลังงานที่มีฝุ่น (ทาสี ขัดพื้น) เสร็จ' },
  { id: 'cost', th: 'ค่าซ่อมแพง ไม่อยากซ่อมซ้ำ', tip: 'เทียบการ์ดซ่อมเครื่องเดิมกับเครื่องใหม่หลังหักมูลค่าเทิร์นด้านล่าง ทีมให้ใบเสนอราคาทั้งสองทางพร้อมกันได้ ตัดสินใจหลังเห็นราคาจริง' },
  { id: 'bill', th: 'ค่าไฟสูง', tip: 'ค่าไฟด้านล่างเป็นประมาณการตามชั่วโมงที่ใช้ ถ้าเครื่องเดิมไม่ได้ล้างนาน ลองล้างก่อนแล้วดูบิลเดือนถัดไป จะเห็นว่าส่วนต่างมาจากความสกปรกหรือจากอายุเครื่อง' },
  { id: 'upgrade', th: 'อยากได้เครื่องใหม่ เงียบกว่า / Inverter', tip: 'ดูรุ่น Inverter ขนาดเดียวกันในแคตตาล็อก เทียบเสียง ฟังก์ชัน และการรับประกันของผู้ผลิตแต่ละรุ่น' },
  { id: 'size', th: 'เย็นไม่พอ / ห้องเปลี่ยนการใช้งาน', tip: 'คำนวณ BTU ที่ห้องต้องการในห้องจำลองก่อน เครื่องใหม่อาจต้องใหญ่กว่าเดิม ทีมตรวจสายไฟและเบรกเกอร์ในวันสำรวจ' },
  { id: 'move', th: 'ขาย / ปล่อยเช่า / ส่งมอบห้อง', tip: 'แจ้งวันที่ต้องส่งมอบห้อง ทีมนัดวันรื้อและติดตั้งให้ทันกำหนด และมีใบส่งมอบงานเป็นหลักฐานกับผู้ซื้อหรือผู้เช่า' },
  { id: 'r22', th: 'เครื่องใช้น้ำยา R22 เติมยาก', tip: 'R22 ทยอยเลิกใช้ ค่าเติมสูงกว่า R32 ตามตารางราคา ดูป้ายข้างเครื่องเพื่อยืนยันชนิดน้ำยา' },
];
// Rev.26 — questions visitors ask before a trade-in (answers follow TRADE_IN.terms and the Pricebook; nothing promised beyond them)
export const QA = [
  ['มูลค่าเทิร์นคิดจากอะไร', 'ขนาด BTU และสภาพเครื่อง (ใช้งานได้ / เสีย) ตามตารางมูลค่าเทิร์น ทีมยืนยันตัวเลขเมื่อตรวจเครื่องจริง แล้วระบุในใบเสนอราคา'],
  ['เครื่องเสียแล้ว หรือคนละยี่ห้อกับเครื่องใหม่ รับไหม', 'รับทุกยี่ห้อ ใช้งานได้หรือเสียแล้ว ขนาด 9,000 BTU ขึ้นไป ขอให้มีคอยล์เย็นและคอยล์ร้อนครบพร้อมหน้ากากและฝาครอบ'],
  ['รับเป็นเงินสดได้ไหม', 'ไม่ได้ มูลค่าเทิร์นหักจากใบเสนอราคาเครื่องใหม่พร้อมติดตั้งของบริษัท'],
  ['ต้องเตรียมข้อมูลอะไร', 'รูปป้ายข้างคอยล์เย็นและคอยล์ร้อน (รุ่น ปีผลิต ชนิดน้ำยา) รูปตัวเครื่องทั้งสองด้าน และอาการที่เป็น ส่งทาง LINE พร้อมเลขอ้างอิง'],
  ['ไม่รู้อายุเครื่องหรือชนิดน้ำยา', 'เลือก "ไม่ทราบ" ได้ ป้ายข้างเครื่องมีปีผลิตและชนิดน้ำยา ทีมอ่านจากรูปให้'],
  ['ติดตั้งที่ตำแหน่งเดิมได้ไหม', 'ส่วนใหญ่ได้ ทีมตรวจขายึด แนวท่อ สายไฟ และเบรกเกอร์เดิม แล้วแจ้งในใบเสนอราคาว่าส่วนไหนใช้ต่อได้ ส่วนไหนควรเปลี่ยน'],
  ['รื้อเครื่องเดิมกับติดตั้งเครื่องใหม่วันเดียวกันไหม', 'นัดเป็นวันเดียวกันได้ ทีมเก็บน้ำยาเครื่องเดิมก่อนรื้อ ไม่ปล่อยทิ้งสู่อากาศ แล้วติดตั้งเครื่องใหม่ เวลาขึ้นกับหน้างานและจำนวนเครื่อง'],
  ['ค่ารื้อและเก็บน้ำยาเครื่องเดิมเท่าไร', () => { const I = c => DATA.instByCode[c] || {}, f = c => (I(c).ex != null ? baht(I(c).ex) : 'ประเมินหน้างาน');
    return `อัตรามาตรฐานก่อน VAT ต่อเครื่อง รวมเก็บน้ำยากลับคอยล์ร้อนแล้ว: ติดผนัง ${f('REM-W')} · แขวนใต้ฝ้า ${f('REM-C')} · สี่ทิศทาง ${f('REM-K')} · ตู้ตั้งพื้น ${f('REM-FS')} · ขนเครื่องเดิมออกจากพื้นที่ ${f('DISPOSE')} · งานสูงเกิน 3 ม. หรือเครื่องที่เข้าถึงยาก ทีมแจ้งเพิ่มในใบเสนอราคาก่อนยืนยัน`; }],
  ['ถ้าตัดสินใจซ่อมแทน', 'เริ่มจากค่าตรวจวินิจฉัย ทีมแจ้งราคาซ่อมให้อนุมัติก่อนทุกครั้ง ไม่ซ่อมก่อนลูกค้าอนุมัติ'],
  ['ข้อมูลที่กรอกเก็บไว้ที่ไหน', 'ระหว่างกรอก ข้อมูลอยู่ในเบราว์เซอร์ของเครื่องนี้เท่านั้น เมื่อกดส่งใบเสนอราคา ข้อมูลเครื่องเดิมและช่วงมูลค่าเทิร์นไปกับคำขอถึงทีมพร้อมเลขอ้างอิง เว็บไม่เก็บรูป'],
];
const AGE_LOSS = y => Math.min(0.15, Math.max(0, y - 3) * 0.01);   // assumed efficiency loss with age: 1 %/yr after year 3, at most 15 %

const rep = re => DATA.rep.find(r => re.test(r.name));
const line = (r, qty = 1, note) => (r ? { name: r.name, ex: r.rate.s, unit: r.unit, qty, note } : null);
/** repair lines for one unit, from the Pricebook (rate.s null = assessed on site) */
export function repairLines(x) {
  const big = x.btu > 36000, inv = x.sys === 'inv', r22 = x.ref === 'r22';
  const refill = rep(r22 ? /^เติมสารทำความเย็น R22/ : /^เติมสารทำความเย็น R32\/R410A/);
  const sealed = [rep(/^Recover\//), rep(/^Vacuum ระบบอย่างเดียว/), refill];   // opening the refrigerant circuit
  const diag = rep(x.type === 'wall' ? /^ตรวจวินิจฉัยแอร์ติดผนัง/ : /^ตรวจวินิจฉัยแอร์แขวน/);
  const comp = inv ? /^เปลี่ยนคอมเพรสเซอร์ Inverter/ : x.btu <= 20000 ? /^เปลี่ยนคอมเพรสเซอร์ 9,000-20,000/ : x.btu <= 36000 ? /^เปลี่ยนคอมเพรสเซอร์ 21,000-36,000/ : /^เปลี่ยนคอมเพรสเซอร์ 37,000-60,000/;
  const L = {
    reno: [],
    comp: [rep(comp), rep(/^ตรวจรั่วด้วยไนโตรเจน/), ...sealed],
    leak: [rep(/^ตรวจรั่วด้วยไนโตรเจน/), rep(/^ซ่อมรั่วเฉพาะจุด/), refill],
    coilOut: [rep(/^เปลี่ยนแผงคอยล์ร้อน/), ...sealed],
    coilIn: [rep(/^เปลี่ยนแผงคอยล์เย็น/), ...sealed],
    board: [rep(inv ? /^ซ่อม\/เปลี่ยนบอร์ด Inverter/ : big ? /^ซ่อม\/เปลี่ยนบอร์ด Inverter/ : /^เปลี่ยนบอร์ดควบคุม Fixed Speed/)],
    fanIn: [rep(big ? /^เปลี่ยนมอเตอร์ FCU\/CDU/ : /^เปลี่ยนมอเตอร์คอยล์เย็น/)],
    fanOut: [rep(big ? /^เปลี่ยนมอเตอร์ FCU\/CDU/ : /^เปลี่ยนมอเตอร์คอยล์ร้อนพร้อมใบพัด/)],
    weak: [],
  }[x.issue] || [];
  if (x.issue === 'reno') return [];
  return [line(diag), ...L.map(r => line(r))].filter(Boolean);
}

/** the new unit: catalogue prices of the same type, inverter, nominal size (±10 %) + the standard installation + taking the old one out */
export function newSet(x) {
  const lo = x.btu * 0.9, hi = x.btu * 1.12;
  const px = DEMO.models.filter(m => m.type === x.type && m.inverter).flatMap(m => m.skus.filter(s => s.btu >= lo && s.btu <= hi && s.px > 0).map(s => s.px)).sort((a, b) => a - b);
  const med = px.length ? px[Math.floor((px.length - 1) / 2)] : null;
  const ins = (installOptions(x.type, x.btu).find(o => o.key === 'STANDARD') || {}).item || null;
  const I = c => DATA.instByCode[c];
  const rem = I({ wall: 'REM-W', ceiling: 'REM-C', cassette: 'REM-K', floor: 'REM-FS', duct: 'REM-DUCT' }[x.type]);
  // ★Rev.27 the removal rate already includes the pump-down (refrigerant kept in the outdoor unit) — not charged twice
  const out = [rem, I('DISPOSE')].filter(Boolean).map(i => ({ name: i.name + (i.code === 'DISPOSE' ? ' (เครื่องเดิม)' : ' + เก็บน้ำยา (เครื่องเดิม)'), ex: i.ex ?? null, unit: i.unit, qty: 1 }));
  const outEx = out.every(l => l.ex != null) ? out.reduce((n, l) => n + l.ex, 0) : null;
  return { n: px.length, min: px[0] ?? null, max: px[px.length - 1] ?? null, med, install: ins ? { name: ins.name, ex: ins.ex } : null, out, outEx };
}

/** full comparison for x = { age, type, btu, sys, ref, issue, qty, hrs, rate } */
export function tradeIn(x) {
  const A = AGES.find(a => a.id === x.age) || AGES[2], I = ISSUES.find(i => i.id === x.issue) || ISSUES[0];
  const q = Math.max(1, Math.min(200, Math.round(+x.qty || 1)));
  const R = repairLines(x), known = R.reduce((a, l) => a + (l.ex ?? 0) * l.qty, 0), unknown = R.filter(l => l.ex == null).length;
  const N = newSet(x), setEx = N.med != null && N.install && N.install.ex != null ? N.med + N.install.ex : null;
  // electricity: old (age-worn; "ไม่ทราบ" counts as fixed speed from 7 years on) vs a new inverter unit, both clean
  const oldInv = x.sys === 'inv' || (x.sys === 'unk' && A.y < 7), hrs = +x.hrs || 8, rate = x.rate || RATE.home;
  const eOld = energy(x.btu, x.type, oldInv, hrs, 0, rate), eNew = energy(x.btu, x.type, true, hrs, 0, rate), loss = AGE_LOSS(A.y);
  const oldYear = eOld.bahtMonthClean * 12 / (1 - loss), newYear = eNew.bahtMonthClean * 12, save = Math.max(0, oldYear - newYear);
  // rules of thumb → verdict + reasons
  const why = [];
  if (A.y >= 10) why.push(`อายุเครื่อง ${A.th} อะไหล่และน้ำยาบางชนิดหายากขึ้น ค่าซ่อมครั้งต่อไปมีแนวโน้มสูงขึ้น`);
  if (I.major) why.push('อาการนี้ต้องเปิดระบบน้ำยา (เก็บน้ำยา ทำสุญญากาศ เติมใหม่) เป็นงานซ่อมใหญ่');
  if (x.ref === 'r22') { const a = rep(/^เติมสารทำความเย็น R22/), b = rep(/^เติมสารทำความเย็น R32\/R410A/); why.push(`ใช้น้ำยา R22 ซึ่งทยอยเลิกใช้ตามพิธีสารมอนทรีออล ค่าเติมตามตารางราคาเรา ${a ? baht(a.rate.s) : '—'} เทียบ R32/R410A ${b ? baht(b.rate.s) : '—'} (ไม่เกิน 1 kg)`); }
  if (setEx && known >= setEx * 0.5) why.push(`ค่าซ่อมที่รู้ราคาแล้ว ≥ ครึ่งหนึ่งของเครื่องใหม่พร้อมติดตั้ง (หลักคิด 50%)`);
  if (setEx && A.y >= 7 && known * A.y >= setEx) why.push(`อายุ × ค่าซ่อม (${A.y} ปี × ${baht(known)}) ≥ ราคาเครื่องใหม่พร้อมติดตั้ง`);
  if (A.y < 5 && I.id !== 'reno') why.push('เครื่องอายุไม่ถึง 5 ปี ตรวจใบรับประกันของผู้ผลิตก่อน อะไหล่บางชิ้นอาจยังอยู่ในประกัน');
  if (!oldInv && save > 0) why.push(`เครื่องเดิมเป็น Fixed speed ค่าไฟโดยประมาณสูงกว่าเครื่อง Inverter ใหม่ราว ${baht(Math.round(save / 100) * 100)} ต่อปีต่อเครื่อง`);
  let verdict;
  if (I.id === 'reno') verdict = A.y >= 10 ? 'replace' : A.y >= 7 ? 'compare' : 'keep';
  else if (I.id === 'weak') verdict = A.y >= 10 ? 'compare' : 'repair';
  else if ((I.major && A.y >= 10) || (I.major && x.ref === 'r22' && A.y >= 7) || (setEx && known >= setEx * 0.5)) verdict = 'replace';
  else if (I.major && A.y >= 7) verdict = 'compare';
  else if (setEx && A.y >= 7 && known * A.y >= setEx) verdict = 'compare';
  else verdict = 'repair';
  const VERD = {
    replace: ['เทิร์นเป็นเครื่องใหม่คุ้มกว่า', 'อายุและอาการนี้ ซ่อมแล้วมักเสียจุดอื่นตามมา เทิร์นเครื่องเดิมแล้วติดตั้งเครื่อง Inverter ใหม่ในวันเดียวกัน'],
    compare: ['ควรเทียบใบเสนอราคาทั้งสองทาง', 'ให้ทีมตรวจก่อน แล้วรับใบเสนอราคาซ่อม และใบเสนอราคาเครื่องใหม่หักมูลค่าเทิร์นพร้อมกัน'],
    repair: ['ซ่อมเครื่องเดิมคุ้มกว่า', 'อาการนี้ซ่อมได้ในราคามาตรฐาน ยังไม่ถึงจุดที่ควรเปลี่ยนเครื่อง'],
    keep: ['ยังไม่จำเป็นต้องเปลี่ยน', 'ถ้ารีโนเวทแล้วต้องย้ายตำแหน่ง ใช้บริการรื้อย้ายติดตั้งใหม่ และล้างเครื่องก่อนติดกลับ'],
  }[verdict];
  return {
    q, age: A, issue: I, repair: { lines: R, known, unknown }, set: N, setEx,
    energy: { old: oldYear, now: newYear, save, loss, oldInv, hrs },
    // ★Rev.27 the quotation total = new unit + standard installation + taking the old unit out (when priced), minus the trade-in value
    allEx: setEx != null ? setEx + (N.outEx || 0) : null,
    trade: tradeValue(x), net: setEx != null && tradeValue(x) ? [setEx + (N.outEx || 0) - tradeValue(x).hi, setEx + (N.outEx || 0) - tradeValue(x).lo] : null,
    verdict, title: VERD[0], sub: VERD[1], why, special: q >= VOLUME_HINT, eligible: A.y >= TRADE_IN.minAge || I.major,
  };
}

/** Rev.26 — the one record the team receives (text for the request / e-mail / Sheet column, data kept in cart.draft.tradein) */
export function tradeInSummary(x) {
  const R = tradeIn(x), t = TYPE_BY_ID[x.type] || { th: x.type }, q = R.q;
  const why = (x.why || []).map(id => (PURPOSES.find(p => p.id === id) || {}).th).filter(Boolean);
  const unit = [x.brand ? `ยี่ห้อ ${x.brand}` : 'ยี่ห้อ (ไม่ได้ระบุ)', x.model ? `รุ่น ${x.model}` : null, `${t.th} ${btuFmt(x.btu)}`, `อายุ ${R.age.th}`,
    (SYSTEMS.find(s => s.id === x.sys) || {}).th, `น้ำยา ${(REFS.find(s => s.id === x.ref) || {}).th}`].filter(Boolean).join(' · ');
  const lines = [
    `เทิร์นแอร์เก่า ${q} เครื่อง`,
    `เป้าหมาย: ${why.length ? why.join(' / ') : '(ไม่ได้ระบุ)'}`,
    `เครื่องเดิม: ${unit}`,
    `อาการ: ${R.issue.th}`,
    `คำแนะนำจากหน้าเว็บ: ${R.title}`,
    R.trade ? `มูลค่าเทิร์นโดยประมาณ: ${baht(R.trade.lo)}–${baht(R.trade.hi)} ต่อเครื่อง (${R.trade.working ? 'ใช้งานได้' : 'เสีย / ต้องซ่อม'}) — ทีมยืนยันเมื่อตรวจเครื่อง` : 'มูลค่าเทิร์น: ทีมประเมินหน้างาน',
    R.repair.lines.length ? `ค่าซ่อมที่รู้ราคา: ${R.repair.unknown ? 'อย่างน้อย ' : ''}${baht(R.repair.known * q)}${R.repair.unknown ? ` + ${R.repair.unknown} รายการประเมินหน้างาน` : ''} (ก่อน VAT)` : null,
    R.allEx != null ? `เครื่องใหม่ Inverter + ติดตั้งมาตรฐาน${R.set.outEx ? ' + รื้อ/ขนเครื่องเดิม' : ''} (ราคากลางในเว็บ): ${baht(R.allEx * q)} ก่อน VAT` : null,
    R.net ? `หลังหักมูลค่าเทิร์น ≈ ${baht(R.net[0] * q)}–${baht(R.net[1] * q)} ก่อน VAT (ไม่รวมงานประเมินหน้างาน)` : null,
  ].filter(Boolean);
  return { text: lines.join('\n'), data: { q, why: x.why || [], brand: x.brand || '', model: x.model || '', type: x.type, btu: x.btu, age: x.age, sys: x.sys, ref: x.ref, issue: x.issue, verdict: R.verdict, trade: R.trade && [R.trade.lo, R.trade.hi], setEx: R.setEx, net: R.net } };
}

// ★Rev.27 relocation rate for this unit (rates.js: removal + standard installation at the new spot)
function moveTh(x) {
  const c = TYPE_BY_ID[x.type] && TYPE_BY_ID[x.type].code, r = DATA.inst.find(i => i.code.startsWith(`MOVE-${c}-`) && x.btu <= +i.code.split('-').pop() && x.btu >= +i.code.split('-')[2] - 1000) || DATA.inst.find(i => i.code.startsWith(`MOVE-${c}-`) && x.btu <= +i.code.split('-').pop());
  return r ? `ย้ายแอร์ (รื้อ + ติดตั้งมาตรฐานจุดใหม่) ${baht(r.ex)} ก่อน VAT ต่อเครื่อง` : 'ใช้บริการรื้อ ย้าย และติดตั้งใหม่ (ประเมินหน้างาน)';
}
/** UI — the section body (#tradein) */
export function mountTradeIn(root, { catalog, openCart } = {}) {
  if (!root) return null;
  const st = { age: 'a12', type: 'wall', btu: 12000, sys: 'unk', ref: 'unk', issue: 'comp', qty: 1, hrs: 8, why: [], brand: '', model: '' };
  try { Object.assign(st, JSON.parse(localStorage.getItem('sbp-tradein') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('sbp-tradein', JSON.stringify(st)); } catch (e) {} };
  const form = h('div', { class: 'ti-form' }), out = h('div', { class: 'ti-out', 'aria-live': 'polite' });
  root.append(h('div', { class: 'ti' }, form, out));
  const seg = (label, list, key, cls = '') => h('fieldset', { class: 'ti-f ' + cls }, h('legend', {}, label), h('div', { class: 'ti-chips' },
    list.map(o => h('button', { type: 'button', 'aria-pressed': String(st[key] === o.id), onclick: () => { st[key] = o.id; draw(); } }, o.th))));
  const multi = (label, list, key) => h('fieldset', { class: 'ti-f ti-why' }, h('legend', {}, label, h('small', {}, ' (เลือกได้หลายข้อ)')), h('div', { class: 'ti-chips' },
    list.map(o => h('button', { type: 'button', 'aria-pressed': String(st[key].includes(o.id)), onclick: () => { st[key] = st[key].includes(o.id) ? st[key].filter(x => x !== o.id) : [...st[key], o.id]; draw(); } }, o.th))));
  const brandNames = () => [...new Set(BRANDS.map(b => b.name))].sort((a, b) => a.localeCompare(b));
  const num = (label, key, min, max, unit) => h('label', { class: 'ti-num' }, label, h('input', { type: 'number', inputmode: 'numeric', min, max, value: st[key],
    onchange: e => { const v = Math.max(min, Math.min(max, Math.round(+e.target.value || min))); st[key] = v; e.target.value = v; draw(); } }), h('span', {}, unit));
  const priceOf = l => (l.ex == null ? h('em', { class: 'ti-sv' }, 'ประเมินหน้างาน') : h('b', {}, baht(l.ex * l.qty)));
  function drawForm() {
    form.innerHTML = '';
    const types = TYPES.filter(t => t.id !== 'duct');
    if (!Array.isArray(st.why)) st.why = [];
    form.append(
      multi('เทิร์นเพื่ออะไร', PURPOSES, 'why'),
      seg('แอร์อายุเท่าไร', AGES, 'age'),
      h('div', { class: 'ti-row' },
        h('label', { class: 'ti-sel' }, 'ประเภท', h('select', { onchange: e => { st.type = e.target.value; draw(); } }, types.map(t => h('option', { value: t.id, selected: t.id === st.type }, t.th)))),
        h('label', { class: 'ti-sel' }, 'ขนาด', h('select', { onchange: e => { st.btu = +e.target.value; draw(); } }, SIZES.filter(b => st.type !== 'wall' || b <= 30000).map(b => h('option', { value: b, selected: b === st.btu }, btuFmt(b)))))),
      h('div', { class: 'ti-row' },
        h('label', { class: 'ti-sel' }, 'ยี่ห้อเครื่องเดิม', h('select', { onchange: e => { st.brand = e.target.value; draw(); } },
          h('option', { value: '', selected: !st.brand }, 'ไม่ระบุ / ไม่ทราบ'), brandNames().map(n => h('option', { value: n, selected: n === st.brand }, n)), h('option', { value: 'อื่น ๆ', selected: st.brand === 'อื่น ๆ' }, 'ยี่ห้ออื่น'))),
        h('label', { class: 'ti-sel' }, 'รุ่น (จากป้ายเครื่อง ถ้ามี)', h('input', { type: 'text', maxlength: 40, value: st.model || '', autocomplete: 'off', placeholder: 'เว้นว่างได้', onchange: e => { st.model = e.target.value.trim().slice(0, 40); draw(); } }))),
      seg('ระบบคอมเพรสเซอร์', SYSTEMS, 'sys'),
      seg('น้ำยาแอร์ (ดูจากป้ายข้างเครื่อง)', REFS, 'ref'),
      seg('ตอนนี้เป็นอย่างไร', ISSUES, 'issue', 'ti-issues'),
      h('div', { class: 'ti-row' }, num('จำนวนเครื่อง', 'qty', 1, 200, 'เครื่อง'), num('เปิดวันละ', 'hrs', 1, 24, 'ชม.')));
  }
  function drawOut() {
    const R = tradeIn(st), q = R.q, t = TYPE_BY_ID[st.type], S0 = tradeInSummary(st);
    out.innerHTML = '';
    const repCard = h('div', { class: 'ti-card' + (R.verdict === 'repair' || R.verdict === 'keep' ? ' pick' : '') },
      h('h3', {}, R.issue.id === 'reno' ? 'ใช้เครื่องเดิมต่อ' : 'ซ่อมเครื่องเดิม'),
      R.repair.lines.length ? h('ul', {}, R.repair.lines.map(l => h('li', {}, h('span', {}, l.name), priceOf(l)))) : h('p', { class: 'ti-mut' }, R.issue.id === 'reno' ? `ไม่มีงานซ่อม · ถ้าต้องย้ายตำแหน่งตอนรีโนเวท ${moveTh(st)}` : 'เริ่มจากค่าตรวจวินิจฉัย แล้วทีมแจ้งราคาซ่อมให้อนุมัติก่อน'),
      R.repair.lines.length ? h('p', { class: 'ti-sum' }, R.repair.unknown ? 'อย่างน้อย ' : 'รวม ', h('b', {}, baht(R.repair.known * q)), q > 1 ? ` (${q} เครื่อง)` : '', R.repair.unknown ? h('small', {}, ` + ${R.repair.unknown} รายการประเมินหน้างาน (ยังไม่มีราคามาตรฐาน เช่น ตัวอะไหล่หลัก)`) : null) : null,
      h('p', { class: 'ti-mut' }, `ค่าไฟโดยประมาณ ≈ ${baht(Math.round(R.energy.old / 100) * 100)} / ปี / เครื่อง (${R.energy.oldInv ? 'Inverter' : 'Fixed speed'} อายุ ${R.age.th}${R.energy.loss ? ` · ประสิทธิภาพลดตามอายุ ~${Math.round(R.energy.loss * 100)}%` : ''})`));
    const S = R.set;
    const newCard = h('div', { class: 'ti-card' + (R.verdict === 'replace' ? ' pick' : '') },
      h('h3', {}, 'เทิร์นเป็นเครื่องใหม่ (Inverter)'),
      h('ul', {},
        h('li', {}, h('span', {}, `เครื่องใหม่ ${t.th} ${btuFmt(st.btu)} · ${S.n} รุ่นในเว็บ${S.n ? ` ช่วง ${baht(S.min)}–${baht(S.max)}` : ''}`), S.med != null ? h('b', {}, `กลาง ${baht(S.med)}`) : h('em', { class: 'ti-sv' }, 'สอบถามรุ่น')),
        S.install ? h('li', {}, h('span', {}, S.install.name), S.install.ex != null ? h('b', {}, baht(S.install.ex)) : h('em', { class: 'ti-sv' }, 'ประเมินหน้างาน')) : null,
        S.out.map(l => h('li', {}, h('span', {}, l.name), priceOf(l))),
        h('li', { class: 'ti-trade' }, h('span', {}, `มูลค่าเทิร์นเครื่องเดิม (${R.trade ? (R.trade.working ? 'ใช้งานได้' : 'เสีย / ต้องซ่อม') : '—'}) หักจากใบเสนอราคา`), R.trade ? h('b', {}, `− ${baht(R.trade.lo)}–${baht(R.trade.hi).replace('฿', '')}`) : h('em', { class: 'ti-sv' }, 'ทีมประเมินหน้างาน'))),
      R.allEx != null ? h('p', { class: 'ti-sum' }, S.outEx ? 'เครื่อง + ติดตั้งมาตรฐาน + รื้อเครื่องเดิม ' : 'เครื่อง + ติดตั้งมาตรฐาน ', h('b', {}, baht(R.allEx * q)), q > 1 ? ` (${q} เครื่อง)` : '', h('small', {}, ' ราคากลางของรุ่นในเว็บ ก่อนหักมูลค่าเทิร์น')) : null,
      R.net ? h('p', { class: 'ti-sum ti-net' }, 'หลังหักมูลค่าเทิร์น ≈ ', h('b', {}, `${baht(R.net[0] * q)}–${baht(R.net[1] * q).replace('฿', '')}`), h('small', {}, ' ไม่รวมงานที่ประเมินหน้างาน · มูลค่าเทิร์นยืนยันเมื่อทีมตรวจเครื่อง')) : null,
      h('p', { class: 'ti-mut' }, `ค่าไฟโดยประมาณ ≈ ${baht(Math.round(R.energy.now / 100) * 100)} / ปี / เครื่อง`, R.energy.save > 0 ? ` · ต่างจากเครื่องเดิมราว ${baht(Math.round(R.energy.save * q / 100) * 100)} / ปี${q > 1 ? ` (${q} เครื่อง)` : ''}` : ''));
    out.append(
      h('div', { class: 'ti-verdict ti-' + R.verdict }, h('b', {}, R.title), h('p', {}, R.sub),
        R.why.length ? h('ul', {}, R.why.map(w => h('li', {}, w))) : null),
      ...(st.why.length ? [h('div', { class: 'ti-for' }, h('b', {}, 'สำหรับเป้าหมายของคุณ'), h('ul', {}, PURPOSES.filter(p => st.why.includes(p.id)).map(p => h('li', {}, h('span', {}, p.th), p.tip))))] : []),
      h('div', { class: 'ti-cmp' }, repCard, newCard),
      h('details', { class: 'ti-terms' }, h('summary', {}, 'ตารางมูลค่าเทิร์นและเงื่อนไข'),
        h('table', {}, h('caption', {}, 'มูลค่าเทิร์นต่อเครื่อง (บาท) ตามขนาดเครื่องเดิม'), h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'ขนาดเครื่องเดิม'), h('th', { scope: 'col' }, 'ใช้งานได้'), h('th', { scope: 'col' }, 'เสีย / ต้องซ่อม'))),
          h('tbody', {}, TRADE_IN.table.map(r => h('tr', { class: R.trade && R.trade.band === r.th ? 'on' : '' }, h('th', { scope: 'row' }, r.th), h('td', {}, `${r.ok[0].toLocaleString('en-US')}–${r.ok[1].toLocaleString('en-US')}`), h('td', {}, `${r.bad[0].toLocaleString('en-US')}–${r.bad[1].toLocaleString('en-US')}`))))),
        h('ul', {}, TRADE_IN.terms.map(t2 => h('li', {}, t2))),
        h('p', { class: 'ti-mut' }, 'อ้างอิงราคารับซื้อและรับเทิร์นแอร์เก่าที่ร้านแอร์ประกาศในปี 2569 · มูลค่าจริงขึ้นกับยี่ห้อ อายุ และสภาพเครื่อง')),
      h('ol', { class: 'ti-steps', 'aria-label': 'ขั้นตอนเทิร์นแอร์เก่า' }, [
        ['ส่งข้อมูลเครื่องเดิม', 'รูปป้ายข้างเครื่อง (รุ่น ปีผลิต น้ำยา) และรูปคอยล์ร้อน'],
        ['ทีมยืนยันมูลค่าเทิร์น', 'ตามตารางด้านบน จากขนาด อายุ และสภาพจริง แจ้งในใบเสนอราคา'],
        ['ใบเสนอราคาเดียว', 'เครื่องใหม่ + ติดตั้ง หักมูลค่าเทิร์นเครื่องเดิม'],
        ['วันติดตั้ง', 'เก็บน้ำยาเครื่องเดิมก่อนรื้อ ไม่ปล่อยทิ้งสู่อากาศ รื้อ ขนออก แล้วติดตั้งเครื่องใหม่'],
        ['ส่งมอบ', 'ทดสอบ วัดค่า ใบรับมอบงาน และรับประกันงานติดตั้ง'],
      ].map(([a, b], i) => h('li', {}, h('span', {}, String(i + 1)), h('b', {}, a), h('small', {}, b)))),
      h('details', { class: 'ti-terms ti-data' }, h('summary', {}, 'ข้อมูลที่ส่งถึงทีมเมื่อขอประเมิน'),
        h('ul', {}, S0.text.split('\n').map(x => h('li', {}, x))),
        h('p', { class: 'ti-mut' }, 'ข้อมูลนี้แนบไปกับใบเสนอราคาเมื่อคุณกดส่ง และบันทึกในระบบรับคำขอของทีมพร้อมเลขอ้างอิง · ระหว่างนี้อยู่ในเบราว์เซอร์ของเครื่องนี้เท่านั้น · รูปป้ายเครื่องส่งทาง LINE')),
      h('div', { class: 'ti-acts' },
        h('button', { type: 'button', class: 's-btn primary', onclick: () => {
          cart.items.filter(i => /^TI-/.test(i.key || '')).forEach(i => cart.remove(i.id));   // one trade-in request, always the latest answers
          cart.add({ kind: 'survey', group: 'install', key: 'TI-REQ', name: `ประเมินเทิร์นแอร์เก่า ${q} เครื่อง → เครื่องใหม่ Inverter`, detail: `${st.brand ? st.brand + ' · ' : ''}${t.th} ${btuFmt(st.btu)} · อายุ ${R.age.th} · ${R.issue.th}${R.trade ? ` · มูลค่าเทิร์นโดยประมาณ ${baht(R.trade.lo)}–${baht(R.trade.hi)} ต่อเครื่อง` : ''}`, unitEx: null, qty: 1 });
          cart.draft.tradein = tradeInSummary(st); cart.saveDraft();
          toast('เพิ่มคำขอประเมินเทิร์นในใบเสนอราคาแล้ว'); openCart && openCart(); } }, 'ขอประเมินมูลค่าเทิร์น'),
        catalog ? h('button', { type: 'button', class: 's-btn', onclick: () => {
          catalog.setType(st.type); catalog.setBtu(st.btu); const c = document.getElementById('catalog'); c && c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } }, `ดูเครื่องใหม่ ${btuFmt(st.btu)}`) : null,
        h('button', { type: 'button', class: 's-btn ghost', onclick: () => askTeam('เทิร์นแอร์เก่า', `${S0.text.replace(/\n/g, ' · ')} · จะส่งรูปป้ายเครื่องให้ทีม`) }, 'ส่งรูปป้ายเครื่องให้ทีม')),
      h('div', { class: 'ti-qa' }, h('h3', {}, 'คำถามก่อนเทิร์น'), h('div', { class: 'ti-qa-g' }, QA.map(([qq, a]) => h('details', {}, h('summary', {}, qq), h('p', {}, typeof a === 'function' ? a() : a))))),
      h('p', { class: 'ti-note' }, `ราคาก่อน VAT ตาม Pricebook อัตรามาตรฐาน · ราคาเครื่องใหม่ = ราคากลางของรุ่น Inverter ขนาดใกล้เคียงในเว็บ · ค่าไฟเป็นประมาณการ (เปิดวันละ ${R.energy.hrs} ชม. · ${RATE.home} บาท/หน่วย · สมมติประสิทธิภาพลดลงราว 1% ต่อปีหลังปีที่ 3) ไม่ใช่การรับประกันค่าไฟ · ซ่อมทุกครั้งแจ้งราคาให้อนุมัติก่อน${R.special ? ' · จำนวนนี้อาจได้อัตราพิเศษตามเงื่อนไข ทีมขายยืนยันในใบเสนอราคา' : ''}`));
  }
  function draw() { save(); drawForm(); drawOut(); }
  draw();
  document.addEventListener('sbp:tradein', e => { const d = e.detail || {}; if (ISSUES.some(i => i.id === d.issue)) st.issue = d.issue; if (!AGES.find(x => x.id === st.age) || AGES.find(x => x.id === st.age).y < 7) st.age = 'a8'; draw(); });   // from the symptom checker
  return { set(v) { Object.assign(st, v); draw(); }, state: () => ({ ...st }) };
}
