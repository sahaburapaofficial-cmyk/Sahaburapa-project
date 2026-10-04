// SBP AirCare — "งานบริการทั้งหมด" overview + visit rules — Rev.26 (owner 4 ต.ค. 2569: "งานบริการอื่น ๆ เสริมให้ครบไม่ให้ขาดตกบกพร่อง
// โดยใช้ logic ว่าราคาที่เสนอขายราคามาตรฐาน และต้องคำนวณหากงานยิบย่อยวิ่งไม่คุ้มค่าน้ำมันต้องมีขั้นต่ำเท่าไหร่ และครอบคลุมอะไรบ้าง
// โดยมองภาพรวมจากบริษัทใหญ่ที่ไม่ได้ใช้ช่าง sub เป็นช่างประจำ")
//   · every service group in the Pricebook as one card: what it covers, how many items, "เริ่ม ฿x" from the standard rates (rate.s / ex),
//     items without a rate counted as "ประเมินหน้างาน" → opens the price centre on that tab with the search filled
//   · visit rules, computed only from rules already published (CLAUDE.md §6.6 8, 9, 13, 22, 23): cleaning minimum (DATA.minBill) and
//     the travel charge below it (TRAVEL.baseFee) · repair = the diagnosis visit (Pricebook) · distance · rush queue · out of hours
//     without an amount · a visit with add-on items only = the team confirms the visit charge in the quotation (no figure until the
//     owner approves one — the cost-based proposal is in the owner's report, never in the browser: rule 4)
import { h, baht, DATA, TRAVEL, QUEUE_RULES } from './sbp-core.js';

const rep = (...cats) => DATA.rep.filter(r => cats.some(c => c.test(r.cat))).map(r => ({ name: r.name, ex: r.rate.s, unit: r.unit }));
const inst = (...pre) => DATA.inst.filter(i => pre.some(p => (i.cat || '').startsWith(p))).map(i => ({ name: i.name, ex: i.ex, unit: i.unit }));
/** groups: [id, title, covers, tab, search, rows()] */
export const GROUPS = [
  ['clean', 'ล้างแอร์ทุกประเภท', 'ล้างปกติ C1 / ล้างใหญ่ C2 · 3 แพ็กเกจ · ติดผนัง แขวน สี่ทิศทาง ตู้ตั้ง AHU', 'clean', '', () => DATA.clean.filter(r => r.type && (r.level === 'C1' || r.level === 'C2')).map(r => ({ name: r.name, ex: r.rate.s, unit: r.unit }))],
  ['install', 'ติดตั้งแอร์ใหม่', 'มาตรฐาน / พรีเมียม รวมท่อและวัสดุ 4 เมตรแรก · รับประกัน 3 ปีเมื่อซื้อเครื่องกับบริษัท', 'install', '', () => DATA.inst.filter(i => /^INS-/.test(i.code)).map(i => ({ name: i.name, ex: i.ex, unit: i.unit }))],
  ['diag', 'ตรวจเช็ก วินิจฉัย และค่าแรงซ่อม', 'ตรวจหาสาเหตุ แจ้งราคาซ่อมให้อนุมัติก่อนลงมือ · ค่าแรงเปลี่ยนอะไหล่ที่ลูกค้าจัดหา · ถอดอะไหล่ส่งซ่อม · งานตามรุ่น', 'repair', '', () => rep(/ตรวจวินิจฉัย|^Labor$|Other Repair/)],
  ['elec', 'ไฟฟ้า บอร์ด และระบบควบคุม', 'คาปาซิเตอร์ แมกเนติก เบรกเกอร์ ฟิวส์ เซ็นเซอร์ บอร์ด รีโมตแบบมีสาย', 'repair', '', () => rep(/ไฟฟ้า|Electrical|PCB|Control|Sensor/)],
  ['ref', 'น้ำยาแอร์ รอยรั่ว และคอมเพรสเซอร์', 'ตรวจรั่วไนโตรเจน ซ่อมรั่ว Vacuum เติมน้ำยา เปลี่ยนวาล์ว คอมเพรสเซอร์ แผงคอยล์', 'repair', '', () => rep(/Refrigerant|Compressor|Coil/)],
  ['drain', 'น้ำหยด น้ำทิ้ง และปั๊มน้ำทิ้ง', 'แก้ท่อตัน ถาดน้ำทิ้ง ข้อต่อแตก แก้ Slope ปั๊มน้ำทิ้ง Float Switch', 'repair', '', () => [...rep(/น้ำทิ้ง|Drainage/), ...inst('10')]],
  ['motor', 'มอเตอร์ พัดลม บานสวิง เสียงดัง', 'มอเตอร์คอยล์เย็น/ร้อน ใบพัด Bearing ยางรอง บานสวิง', 'repair', '', () => rep(/Motor|Mechanical/)],
  ['move', 'รื้อ ย้าย ขนย้าย และเครื่องเดิม', 'รื้อ ย้ายจุดติดตั้ง เก็บน้ำยาก่อนรื้อ ขนย้าย ทิ้งเครื่องเก่า ติดตั้งเครื่องที่ลูกค้าจัดหา', 'move', '', () => [...inst('13'), ...inst('11')]],
  ['mat', 'วัสดุ ท่อ ราง ไฟฟ้า ฐานรอง', 'ท่อทองแดง O-TWO 0.70 ฉนวน รางครอบท่อ สายไฟ เบรกเกอร์ ฐานรองกันสั่น', 'mat', '', () => [...inst('06', '07', '08', '09'), ...inst('12')]],
  ['access', 'งานสูง นั่งร้าน เปิดฝ้า งานโยธา', 'บันไดสูง นั่งร้าน รถกระเช้า เครน เปิด-ปิดฝ้า เจาะผนัง Core drill', 'move', '', () => [...inst('14'), ...inst('15'), ...rep(/Access/)]],
  ['ahu', 'AHU · FCU · ระบบน้ำเย็น', 'สายพาน Bearing แผ่นกรอง HEPA วาล์วน้ำเย็น VFD Thermostat', 'repair', 'AHU', () => rep(/AHU|FCU|Chilled|VFD|Filter/)],
  ['doc', 'เอกสาร ทดสอบ และส่งมอบ', 'Commissioning Method Statement Shop Drawing ควบคุมงาน รายงานสำรวจ เอกสารรับประกัน', 'move', '', () => inst('17')],
];

/** summary of one group: count, priced, assessed, lowest standard rate */
export function groupSummary(rows) {
  const priced = rows.filter(r => r.ex != null && r.ex > 0);
  const lo = priced.reduce((a, r) => (!a || r.ex < a.ex ? r : a), null);
  return { n: rows.length, priced: priced.length, assess: rows.length - priced.length, from: lo ? lo.ex : null, unit: lo ? lo.unit || '' : '' };
}

/** visit rules, all from published constants (no new figure) */
export function visitRules() {
  const diag = DATA.rep.filter(r => r.cat === 'ตรวจวินิจฉัย').map(r => r.rate.s).filter(x => x != null);
  return [
    { k: 'clean', t: 'งานล้าง', d: `ยอดงานล้างถึง ${baht(DATA.minBill)} ต่อการเข้างาน ไม่มีค่าเดินทางในพื้นที่หลัก · ต่ำกว่านั้นคิดค่าเดินทาง ${baht(TRAVEL.baseFee)} ต่อการเข้างานแทนการเติมยอด` },
    { k: 'repair', t: 'งานซ่อม / ตรวจเช็ก', d: `เริ่มจากค่าตรวจวินิจฉัย ${diag.length ? `${baht(Math.min(...diag))}–${baht(Math.max(...diag)).replace('฿', '')}` : ''} ตามประเภทแอร์ ซึ่งเป็นค่าเข้างานของงานซ่อม · ค่าซ่อมแจ้งให้อนุมัติก่อนลงมือ` },
    { k: 'install', t: 'งานติดตั้ง', d: 'ราคาติดตั้งต่อเครื่องรวมการเดินทางในพื้นที่หลัก · วัสดุส่วนเกินและงานพิเศษคิดตามรายการ' },
    { k: 'small', t: 'งานย่อยอย่างเดียว', d: 'เช่น เปลี่ยนรีโมต เติมรางครอบท่อ ย้ายท่อน้ำทิ้ง โดยไม่มีงานล้าง ติดตั้ง หรือตรวจซ่อมในวันเดียวกัน — ทีมแจ้งค่าเข้างานในใบเสนอราคาก่อนนัด · แนะนำให้รวมกับรอบล้างครั้งถัดไปเพื่อไม่ต้องเสียค่าเข้างานแยก' },
    { k: 'far', t: 'นอกพื้นที่หลัก', d: `กรุงเทพฯ ระยะเกิน ${TRAVEL.freeKm} กม. หรือจังหวัดอื่นถึง ${TRAVEL.maxKm} กม. ค่าเดินทาง ${baht(TRAVEL.baseFee)} + ${TRAVEL.perKm} บาทต่อ กม. ที่เกิน ${TRAVEL.freeKm} กม. ต่อเที่ยว` },
    { k: 'time', t: 'คิวด่วนและนอกเวลา', d: `จองปกติล่วงหน้า ${QUEUE_RULES.leadDays} วัน · คิวด่วน +${baht(QUEUE_RULES.rushFeeEx)} ต่อการเข้างาน (ต้องมีคิวว่าง) · นอกเวลาทำการและวันอาทิตย์มีค่าใช้จ่ายเพิ่มเติม ทีมแจ้งในใบเสนอราคา` },
  ];
}

const EVERY = ['ทีมช่างประจำของบริษัท ไม่ส่งต่องานให้ผู้รับเหมาช่วง', 'ราคามาตรฐานตาม Pricebook ก่อน VAT · ใบเสนอราคาก่อนเริ่มงาน', 'ส่วนเพิ่มทุกรายการแจ้งให้อนุมัติก่อนทำ', 'ปูผ้าใบรองพื้นและเก็บพื้นที่หลังงาน', 'ใบรับมอบงาน / รายงานตามแพ็กเกจ', 'รับประกันงานตามรายการ'];

export function mountAllServices(root, { prices } = {}) {
  if (!root) return null;
  const open = (tab, q) => {
    if (prices && prices.show) prices.show(tab);
    const s = document.getElementById('pc-search');
    if (s) { s.value = q || ''; s.dispatchEvent(new Event('input')); }
    const pc = document.getElementById('priceCenter'); pc && pc.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  const cards = GROUPS.map(([id, th, covers, tab, q, rows]) => {
    const S = groupSummary(rows());
    return h('button', { type: 'button', class: 'as-card', 'data-g': id, onclick: () => open(tab, q) },
      h('b', {}, th), h('small', {}, covers),
      h('span', { class: 'as-meta' }, h('em', {}, `${S.n} รายการ`), S.from != null ? h('strong', {}, `เริ่ม ${baht(S.from)}${S.unit ? ' / ' + S.unit : ''}`) : h('strong', { class: 'sv' }, 'ประเมินหน้างาน'), S.assess && S.from != null ? h('em', {}, `${S.assess} รายการประเมินหน้างาน`) : null));
  });
  root.append(h('div', { class: 'as' },
    h('div', { class: 'as-head' }, h('h3', {}, 'งานบริการทั้งหมด'), h('p', {}, 'ทุกงานที่บริษัทรับ แยกตามหมวด ราคาเริ่มต้นเป็นอัตรามาตรฐานก่อน VAT · กดหมวดเพื่อดูรายการและราคาในตารางด้านล่าง')),
    h('div', { class: 'as-grid' }, cards),
    h('div', { class: 'as-rules' },
      h('div', {}, h('h4', {}, 'ค่าเข้างานคิดอย่างไร'), h('dl', {}, visitRules().map(r => [h('dt', {}, r.t), h('dd', {}, r.d)]).flat())),
      h('div', {}, h('h4', {}, 'ทุกการเข้างานได้'), h('ul', {}, EVERY.map(x => h('li', {}, x)))))));
  return { open };
}
