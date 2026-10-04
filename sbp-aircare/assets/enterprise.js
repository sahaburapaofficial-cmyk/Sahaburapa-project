// SBP AirCare — "ลูกค้าองค์กร" section: sector by sector — Rev.22 (owner 3 ต.ค. 2569: "สำหรับองค์กรต้องโชว์มากกว่านี้ เช่น สำนักงาน
// บริษัท คอนโด โรงพยาบาล โรงเรียน หรือสถานที่ที่เรียกได้ว่าเป็น enterprise หรือมีหลายสาขา ครอบคลุมทุกอย่าง จัดเตรียมเป็น Sample และสัญญา
// รายปีที่เหมาะแต่ละประเภท เพื่อแก้ painpoint กลุ่มลูกค้าองค์กรทั้งหมด")
//   · per sector: who it is for → the problems those buyers name → what the company already does about each (package /
//     company form) or what is agreed in the contract → a sample annual contract computed live from the Pricebook
//     (estimateContract: standard rate only, before VAT, CLAUDE.md §6.6 rules 1–3) → a draft scope of work to copy
//   · honesty rules: samples are examples to size a budget, not real customers (rule 15: no client names / logos / reviews);
//     no discount or special rate on the page (rule 3: "may qualify — confirmed in the quotation" from VOLUME_HINT units);
//     out-of-hours work = "มีค่าใช้จ่ายเพิ่มเติม" with no amount (rule 22); terms the company has not set (response time,
//     invoice format …) are left blank in the draft — "ตกลงในสัญญา", never guessed; VRV / VRF are separate projects (rule 16)
import { h, baht, DATA, CLEAN_PKGS, SIZE_BANDS, TYPE_BY_ID, VOLUME_HINT, estimateContract, incVat, up100, COMPANY, TRAVEL, jobTravel } from './sbp-core.js';
// {min} / {fee} in sector texts = the cleaning minimum and the travel fee from the Pricebook data (never typed twice)
const fill = t => t.replace('{min}', baht(DATA.minBill)).replace('{fee}', baht(TRAVEL.baseFee));
import { cart } from './commerce.js';
import { askTeam, copyText } from './contact.js';
import { toast } from './proto-ui.js';

// what every promise below rests on: P = in the package / company form already · D = agreed in the contract (filled per customer)
const P = 'pkg', D = 'deal';
const ICON = {
  office: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M3 21h18',
  chain: 'M3 10h18l-1.5-5h-15L3 10zM5 10v10h14V10M9 20v-5h6v5M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0',
  condo: 'M6 21V3h12v18M10 7h1M13 7h1M10 11h1M13 11h1M10 15h1M13 15h1M3 21h18',
  hospital: 'M4 21V7l8-4 8 4v14M12 8v6M9 11h6M9 21v-4h6v4M3 21h18',
  school: 'M2 9l10-5 10 5-10 5L2 9zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6',
  hotel: 'M3 21V8h18v13M3 13h18M7 13v-2h4v2M3 21h18M7 8V5h10v3',
  factory: 'M3 21V11l5 3v-3l5 3v-3l5 3V5h3v16H3zM7 18h2M11 18h2M15 18h2',
};
const icon = d => h('span', { class: 'en-ico', 'aria-hidden': 'true', html: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>` });

// add-on lines from the cleaning Pricebook (by name) — priced, "ประเมินหน้างาน", or out-of-hours (never an amount, rule 22)
const ADD = {
  ooh: /นอกเวลาทำการ/, ctrl: /Server\/โรงพยาบาล/, dry: /เป่าฝุ่น\/ดูดฝุ่นแห้ง/, protect: /ป้องกันพื้นที่\/คลุมสินค้า/, height: /ความสูงเกิน 3/,
  lift: /บันไดพิเศษ\/นั่งร้าน/, ceilingOpen: /เปิดฝ้า\/ปิดฝ้า/, cduGroup: /คอยล์ร้อนหลายชุด/, heavy: /คราบน้ำมัน\/คราบหนัก/, ahu: /ล้าง AHU ไม่เกิน 100,000/,
};
function addOn(k, pkg) {
  const r = DATA.clean.find(r => r.pkg === pkg && r.level === 'C1' && !r.type && ADD[k].test(r.name)) || DATA.clean.find(r => !r.type && ADD[k].test(r.name));
  if (!r) return null;
  return { name: r.name, price: k === 'ooh' ? 'มีค่าใช้จ่ายเพิ่มเติม แจ้งในใบเสนอราคา' : r.rate.s == null ? 'ประเมินหน้างาน' : `${baht(r.rate.s)} / ${r.unit}` };
}

/* sectors — samples are examples to size a budget (counts by type, size band, package, visits a year incl. one deep clean) */
export const SECTORS = [
  { id: 'office', th: 'สำนักงาน / บริษัท', who: 'สำนักงานใหญ่ อาคารสำนักงาน Co-working ห้องประชุม ห้อง Server',
    pains: [
      ['ปล่อยจนแอร์มีกลิ่น น้ำหยดใส่โต๊ะ แล้วค่อยเรียกช่าง', 'วางปฏิทินล้างทั้งปีตั้งแต่วันเซ็นสัญญา รอบละ 4 เดือน ทีมแจ้งล่วงหน้าก่อนเข้างานทุกรอบ', P],
      ['ล้างแล้วรบกวนการทำงานทั้งชั้น', 'แบ่งโซนทำทีละชั้น ทีละห้อง ระบบคำนวณกำลังคนต่อรอบให้รู้ล่วงหน้าว่าใช้กี่ทีม-วัน', P],
      ['ฝ่ายจัดซื้อไม่มีหลักฐานว่าทำอะไรไปบ้าง', 'Service Report พร้อมภาพก่อน–หลังทุกเครื่อง เกรดสภาพ A–D และลงนามรับงาน 3 ฝ่าย ตามแบบฟอร์มบริษัท', P],
      ['มีค่าใช้จ่ายบวกหน้างานที่ไม่ได้ตกลงไว้', 'ราคาตาม Pricebook ก่อน VAT ส่วนเพิ่มทุกรายการแจ้งให้อนุมัติก่อนทำ หน้างานไม่เพิ่มรายการเอง', P],
      ['อยากให้ทำนอกเวลางานหรือวันอาทิตย์', 'จัดได้ตามที่ตกลงในสัญญา งานนอกเวลามีค่าใช้จ่ายเพิ่มเติม แจ้งในใบเสนอราคา', D],
    ],
    sample: { label: 'สำนักงาน 1 ชั้น 30 เครื่อง', units: { wall: 12, cassette: 14, ceiling: 4 }, size: 1, pkg: 'Standard Care', visits: 3 },
    addOns: ['ooh', 'ctrl', 'ceilingOpen'],
    window: 'วันทำการ 08:30–17:30 น. หรือนอกเวลาตามที่ตกลง (มีค่าใช้จ่ายเพิ่มเติม)' },
  { id: 'chain', th: 'องค์กรหลายสาขา', who: 'ธนาคาร ร้านค้าปลีก ร้านอาหาร คลินิกเครือข่าย แฟรนไชส์ ศูนย์บริการ', branches: 12,
    pains: [
      ['แต่ละสาขาจ้างช่างเอง ราคาและมาตรฐานไม่เท่ากัน', 'สัญญาเดียว ราคามาตรฐานเดียวกันทุกสาขาตาม Pricebook และขั้นตอนงานตามแบบฟอร์มเดียวกัน', P],
      ['สำนักงานใหญ่ไม่เห็นภาพรวมว่าสาขาไหนทำแล้ว', 'Asset Report รายเครื่องแยกตามสาขา (แพ็กเกจ Corporate Control) ใช้ติดตามรอบล้างและสภาพเครื่องทุกสาขา', P],
      ['สาขาเล็กมีแอร์ไม่กี่เครื่อง ยอดต่อรอบต่ำ', 'สาขาในพื้นที่หลักที่ยอดงานล้างถึง {min} ไม่มีค่าเดินทาง ต่ำกว่านั้นคิดค่าเดินทาง {fee} ต่อการเข้างาน แสดงให้เห็นในใบเสนอราคา', P],
      ['สาขาต่างจังหวัด ค่าเดินทางไม่ชัด', 'คิดตามระยะถนนจริงจากสำนักงานใหญ่ตามอัตราที่ประกาศบนเว็บ ทุกสาขาเห็นตัวเลขเดียวกัน', P],
      ['ร้านเปิดทุกวัน ปิดร้านไม่ได้', 'จัดเวลาเข้างานก่อนร้านเปิดหรือหลังปิดตามที่ตกลงในสัญญา (นอกเวลามีค่าใช้จ่ายเพิ่มเติม)', D],
    ],
    sample: { label: 'สาขาละ 6 เครื่อง × 12 สาขา', units: { wall: 4, cassette: 2 }, size: 1, pkg: 'Corporate Control', visits: 3 },
    addOns: ['ooh', 'heavy'],
    window: 'ก่อนเปิดร้าน / หลังปิดร้าน หรือวันทำการ ตามที่ตกลงต่อสาขา' },
  { id: 'condo', th: 'คอนโด / อาคารชุด / นิติบุคคล', who: 'นิติบุคคลอาคารชุด หมู่บ้านจัดสรร อาคารพักอาศัยให้เช่า',
    pains: [
      ['ส่วนกลางเปิดตลอด ล็อบบี้ ฟิตเนส ห้องประชุมใช้งานทุกวัน', 'วางรอบล้างส่วนกลางทั้งปี แบ่งพื้นที่ทำทีละจุดให้ส่วนกลางยังเปิดใช้ได้', P],
      ['ช่างภายนอกเข้าออกไม่เป็นระบบ ต้องแลกบัตรและลงทะเบียน', 'ทีมส่งรายชื่อช่างและวันเข้างานล่วงหน้าให้นิติ ทุกคนมีป้ายชื่อ ใช้ลิฟต์ขนของตามที่นิติกำหนด', D],
      ['ต้องรายงานคณะกรรมการและที่ประชุมใหญ่', 'Service Report พร้อมภาพทุกเครื่องของส่วนกลาง ใช้แนบรายงานผลการดำเนินงานได้', P],
      ['ลูกบ้านร้องเรียนน้ำหยด ไม่รู้จะเรียกใคร', 'ลูกบ้านจองล้างหรือซ่อมได้เองผ่านเว็บ ราคามาตรฐานเดียวกับที่นิติเห็น ส่วนวันล้างแอร์ลูกบ้านทั้งอาคาร ตกลงรูปแบบในสัญญา', D],
    ],
    sample: { label: 'ส่วนกลางอาคาร 20 เครื่อง', units: { wall: 10, cassette: 6, ceiling: 4 }, size: 1, pkg: 'Standard Care', visits: 2 },
    addOns: ['height', 'lift', 'cduGroup'],
    window: 'ตามเวลาที่นิติกำหนดและลงทะเบียนผู้รับเหมา' },
  { id: 'hospital', th: 'โรงพยาบาล / คลินิก', who: 'โรงพยาบาล คลินิก ศูนย์ทันตกรรม ห้องแล็บ ศูนย์ดูแลผู้สูงอายุ',
    pains: [
      ['หยุดพื้นที่บริการผู้ป่วยไม่ได้', 'วางแผนทีละโซนร่วมกับฝ่ายอาคาร พื้นที่ผู้ป่วยนอกทำนอกเวลาให้บริการได้ตามที่ตกลง (นอกเวลามีค่าใช้จ่ายเพิ่มเติม)', D],
      ['กังวลฝุ่นและละอองน้ำในพื้นที่ควบคุม', 'พื้นที่ควบคุมใช้วิธีเป่าฝุ่น/ดูดฝุ่นแห้งไม่ใช้น้ำ หรือวิธีที่ตกลงกับโรงพยาบาล คลุมพื้นที่ทุกครั้ง ประเมินหน้างานก่อนเสนอราคา', P],
      ['ต้องมีเอกสารย้อนหลังสำหรับการตรวจประเมินคุณภาพ', 'Asset Report รายเครื่อง และประวัติงานทุกรอบ (แพ็กเกจ Corporate Control) ตามแบบฟอร์มบริษัท ลงนามรับงาน 3 ฝ่าย', P],
      ['แอร์เสียกลางคันในห้องที่ต้องใช้ตลอด', 'รอบล้างทุก 3 เดือนช่วยพบอาการเริ่มต้นเร็ว งานซ่อมแจ้งราคาให้อนุมัติก่อนทุกครั้ง ระยะเวลาตอบสนองเมื่อแจ้งเหตุ ตกลงในสัญญา', D],
    ],
    sample: { label: 'คลินิก / รพ.ขนาดเล็ก 46 เครื่อง', units: { wall: 20, cassette: 16, ceiling: 6, duct: 4 }, size: 1, pkg: 'Corporate Control', visits: 4 },
    addOns: ['ctrl', 'dry', 'ooh', 'ceilingOpen'],
    window: 'ทีละโซนตามแผนของโรงพยาบาล บางพื้นที่นอกเวลาให้บริการ (มีค่าใช้จ่ายเพิ่มเติม)' },
  { id: 'school', th: 'โรงเรียน / มหาวิทยาลัย', who: 'โรงเรียน มหาวิทยาลัย สถาบันกวดวิชา ศูนย์ฝึกอบรม',
    pains: [
      ['ต้องตั้งงบประมาณทั้งปีล่วงหน้า', 'ประมาณงบทั้งปีจาก Pricebook ได้ทันทีบนหน้านี้ แล้วทีมขายออกใบเสนอราคาอย่างเป็นทางการสำหรับการจัดซื้อ', P],
      ['ทำได้เฉพาะช่วงปิดภาคเรียนหรือวันหยุด', 'วางรอบล้าง 2 ครั้งต่อปีให้ตรงช่วงปิดภาคเรียน (ล้างใหญ่ 1 ครั้ง) ทำวันอาทิตย์ได้ตามที่ตกลง (มีค่าใช้จ่ายเพิ่มเติม)', D],
      ['ห้องเรียนจำนวนมาก กลัวทำไม่ทันช่วงปิดเทอม', 'ระบบคำนวณกำลังคนต่อรอบจากจำนวนเครื่อง ทีมวางจำนวนทีมให้จบในช่วงที่กำหนดก่อนเริ่มงาน', P],
      ['ต้องใช้เอกสารประกอบการจัดซื้อจัดจ้าง', 'ใบเสนอราคา ร่างขอบเขตงานด้านล่าง และรายงานผลงานทุกรอบ ใช้ประกอบการตรวจรับงาน', P],
    ],
    sample: { label: 'โรงเรียน 80 ห้อง', units: { wall: 60, ceiling: 10, cassette: 10 }, size: 1, pkg: 'Standard Care', visits: 2 },
    addOns: ['ooh', 'height'],
    window: 'ช่วงปิดภาคเรียน / วันหยุด ตามปฏิทินการศึกษา' },
  { id: 'hotel', th: 'โรงแรม / ที่พัก', who: 'โรงแรม รีสอร์ต เซอร์วิสอพาร์ตเมนต์ โฮสเทล',
    pains: [
      ['ปิดห้องนานเท่ากับเสียรายได้', 'ทยอยทำตามห้องว่างที่ฝ่ายแม่บ้านจัดให้ เวลาโดยประมาณติดผนังล้างปกติ 30–60 นาทีต่อเครื่อง ช่วยวางแผนบล็อกห้อง', P],
      ['กลิ่นอับและเสียงแอร์ถูกเขียนในรีวิว', 'แพ็กเกจ Standard Care บันทึกสภาพเครื่องเป็นเกรด A–D พร้อมภาพ เครื่องที่มีกลิ่นหรือคราบหนักแจ้งงานเพิ่มให้อนุมัติก่อน', P],
      ['ช่วงไฮซีซันเข้าห้องไม่ได้', 'วางรอบปีละ 3 ครั้ง ให้รอบล้างใหญ่อยู่ช่วงอัตราเข้าพักต่ำตามที่โรงแรมเลือก', D],
      ['ล็อบบี้ ห้องอาหาร ห้องประชุมใช้งานทุกวัน', 'ทำพื้นที่สาธารณะนอกเวลาให้บริการได้ตามที่ตกลง (นอกเวลามีค่าใช้จ่ายเพิ่มเติม)', D],
    ],
    sample: { label: 'โรงแรม 80 ห้องพัก + ส่วนกลาง', units: { wall: 80, cassette: 8, duct: 6 }, size: 0, pkg: 'Standard Care', visits: 3 },
    addOns: ['heavy', 'ooh', 'ceilingOpen'],
    window: 'ตามห้องว่างที่ฝ่ายแม่บ้านกำหนด / พื้นที่สาธารณะนอกเวลาให้บริการ' },
  { id: 'factory', th: 'โรงงาน / คลังสินค้า', who: 'โรงงาน คลังสินค้า ศูนย์กระจายสินค้า ห้องควบคุมเครื่องจักร',
    pains: [
      ['ฝุ่นมาก แอร์ตันเร็ว เครื่องจักรร้อน', 'รอบล้างทุก 3 เดือน (4 ครั้งต่อปี รวมล้างใหญ่ 1 ครั้ง) งานคราบหนักแจ้งราคาให้อนุมัติก่อน', P],
      ['หยุดไลน์ผลิตไม่ได้ ต้องคลุมสินค้า', 'วางแผนตามกะการผลิต คลุมพื้นที่และสินค้า ประเมินหน้างานก่อนเสนอราคา', D],
      ['เครื่องติดสูง ต้องใช้นั่งร้านหรือรถกระเช้า', 'สำรวจก่อนเสนอราคา รายการงานสูงและอุปกรณ์ยกแยกในใบเสนอราคาให้เห็นชัด', P],
      ['ต้องมีทะเบียนเครื่องสำหรับงานบำรุงรักษา', 'Asset Report รายเครื่อง และทะเบียนชิ้นส่วนในงานล้างใหญ่ ตามแบบฟอร์มบริษัท (แพ็กเกจ Corporate Control)', P],
    ],
    sample: { label: 'โรงงาน / โกดัง 46 เครื่อง', units: { wall: 10, ceiling: 20, floor: 8, duct: 8 }, size: 2, pkg: 'Corporate Control', visits: 4 },
    addOns: ['protect', 'height', 'lift', 'cduGroup', 'ahu'],
    window: 'ตามกะการผลิตหรือวันหยุดไลน์ ตามที่ตกลง' },
];

const months = v => ({ 2: 6, 3: 4, 4: 3 })[v] || Math.round(12 / v);
/** one sector's sample contract — per site, then × branches (each branch is its own visit) */
export function sampleContract(s, over = {}) {
  const x = { ...s.sample, ...over }, n = s.branches || 1;
  const e = estimateContract({ units: x.units, visits: x.visits, pkg: x.pkg, size: x.size, deep: true });
  const annualEx = e.annualEx * n;
  return { ...e, x, branches: n, perSite: e.annualEx, annualEx, annualInc: incVat(annualEx), unitsAll: e.count * n, every: months(x.visits) };
}

/** Rev.23 (owner 3 ต.ค. 2569: "ใช้บริการจำนวนเยอะจะได้สิทธิประโยชน์อะไร ช่วยอะไรได้บ้าง") — what volume under one contract changes,
 *  computed only from published rules (standard rates, the cleaning minimum + travel fee, crew productivity, package terms):
 *  no discount, no special-rate figure (rule 3), no energy promise (rule 11). Compared with booking every unit on its own. */
export function volumeBenefits(s, c) {
  const n = c.branches, V = c.x.visits, deep = 1;
  // booked one unit at a time: each job is priced alone → under the cleaning minimum it carries the travel fee (core area)
  let splitJobs = 0, splitTravel = 0;
  c.lines.forEach(l => { splitJobs += l.n * V; splitTravel += l.n * ((V - deep) * jobTravel(null, l.c1).fee + deep * jobTravel(null, l.c2).fee); });
  splitJobs *= n; splitTravel *= n;
  const sum1 = c.lines.reduce((a, l) => a + l.c1 * l.n, 0), sum2 = c.lines.reduce((a, l) => a + l.c2 * l.n, 0);
  const contractTravel = n * ((V - deep) * jobTravel(null, sum1).fee + deep * jobTravel(null, sum2).fee);
  const td = c.teamDaysPerVisit, td2 = Math.ceil(td) <= 1 ? td : Math.ceil(td) / 2;   // two crews share a round
  const pk = CLEAN_PKGS.find(p => p.id === c.x.pkg), basic = c.x.pkg === 'Basic Clean';
  const gap = 12 / V, rounds = Array.from({ length: V }, (_, i) => ({ m: Math.round(i * gap) + 1, deep: i === 0 }));   // example order: the deep clean first, then every `gap` months
  return {
    splitJobs, contractVisits: V * n, splitTravel, contractTravel, travelAvoided: Math.max(0, splitTravel - contractTravel),
    teamDays: td, teamDays2: td2, reports: c.unitsAll * V, reportKind: basic ? 'ใบรับมอบงานแบบย่อ' : c.x.pkg === 'Corporate Control' ? 'Asset Report รายเครื่อง' : 'Service Report พร้อมภาพก่อน–หลัง',
    perUnitMonth: c.annualEx / c.unitsAll / 12, terms: pk.sub, special: c.unitsAll >= VOLUME_HINT, rounds,
  };
}

function benefitsBlock(s, c) {
  const b = volumeBenefits(s, c), br = c.branches > 1;
  const tile = (k, v, d) => h('div', { class: 'en-bf' }, h('span', {}, k), h('b', {}, v), h('small', {}, d));
  return h('section', { class: 'en-bfw', 'aria-label': 'ใช้บริการจำนวนมากได้อะไร' },
    h('h4', {}, `ใช้บริการ ${c.unitsAll} เครื่องในสัญญาเดียว ได้อะไรบ้าง`),
    h('p', { class: 'en-bf-sub' }, 'คำนวณจากตัวอย่างนี้ด้วยกฎที่ประกาศบนเว็บ เทียบกับการเรียกช่างแยกทีละเครื่อง · ไม่ใช่ส่วนลด'),
    h('div', { class: 'en-bfs' },
      tile('ค่าเดินทางที่ไม่เกิดขึ้น', `≈ ${baht(b.travelAvoided)} / ปี`, `เรียกแยกทีละเครื่อง ${b.splitJobs.toLocaleString('th-TH')} ครั้ง/ปี แต่ละงานต่ำกว่าขั้นต่ำ ${baht(DATA.minBill)} จึงมีค่าเดินทาง ${baht(TRAVEL.baseFee)} ทุกครั้ง · ในสัญญายอดต่อรอบถึงขั้นต่ำ (พื้นที่หลักกรุงเทพฯ)`),
      tile('เปิดพื้นที่ให้ช่าง', `${b.contractVisits} รอบ / ปี`, `แทนการนัดช่าง ${b.splitJobs.toLocaleString('th-TH')} ครั้ง${br ? ` · ${c.branches} สาขา สาขาละ ${c.x.visits} รอบ` : ''} · รู้วันเข้างานล่วงหน้าทั้งปี`),
      tile('กำลังคนต่อรอบ', `≈ ${b.teamDays} ทีม-วัน${br ? ' / สาขา' : ''}`, b.teamDays > 1 ? `จัด 2 ทีมพร้อมกันเหลือ ≈ ${b.teamDays2} วัน · ทำทีละโซนให้พื้นที่อื่นใช้งานต่อได้` : 'จบในวันเดียว · ทำทีละโซนให้พื้นที่อื่นใช้งานต่อได้'),
      tile('หลักฐานการทำงาน', `${b.reports.toLocaleString('th-TH')} ฉบับ / ปี`, `${b.reportKind} ทุกเครื่องทุกรอบ ลงนามรับงาน 3 ฝ่าย · ใช้ตรวจรับงานและตอบฝ่ายจัดซื้อ / ผู้ตรวจสอบได้`),
      tile('งบต่อเครื่อง', `≈ ${baht(Math.ceil(b.perUnitMonth))} / เดือน`, `ราคามาตรฐานก่อน VAT ตั้งงบรายปีได้ล่วงหน้า · งานซ่อมแจ้งราคาให้อนุมัติก่อนทุกครั้ง`),
      tile('เงื่อนไขในแพ็กเกจ', c.x.pkg, b.terms)),
    h('ol', { class: 'en-cal', 'aria-label': 'ปฏิทินรอบล้างตัวอย่าง 12 เดือน' }, Array.from({ length: 12 }, (_, i) => { const r = b.rounds.find(x => x.m === i + 1);
      return h('li', { class: r ? (r.deep ? 'deep' : 'on') : '' }, h('span', {}, `เดือน ${i + 1}`), r ? h('b', {}, r.deep ? 'ล้างใหญ่' : 'ล้างปกติ') : null); })),
    h('p', { class: 'en-note' }, `ลำดับเป็นตัวอย่าง ปรับตามฤดูและแผนงานของลูกค้า${b.special ? ' · จำนวนนี้อาจได้อัตราพิเศษตามเงื่อนไข ทีมขายยืนยันในใบเสนอราคา' : ''}`));
}

/** a draft scope of work to copy into an RFQ / TOR — blanks stay blank (agreed per customer) */
export function scopeText(s, c) {
  const pk = CLEAN_PKGS.find(p => p.id === c.x.pkg), band = SIZE_BANDS[c.x.size];
  const fleet = c.lines.map(l => `   - ${TYPE_BY_ID[l.type].th} ${l.range} BTU จำนวน ${l.n} เครื่อง${c.branches > 1 ? ' ต่อสาขา' : ''}`).join('\n');
  return [
    `ร่างขอบเขตงาน (ตัวอย่าง) — สัญญาล้างและดูแลเครื่องปรับอากาศรายปี`,
    `ประเภทสถานที่: ${s.th}${c.branches > 1 ? ` · ${c.branches} สาขา` : ''}`,
    `ผู้ให้บริการ: ${COMPANY.th} (SBP AirCare) · โทร ${COMPANY.tel}`,
    '',
    `1. รายการเครื่อง (ตัวอย่าง ยืนยันหลังสำรวจ · ขนาดส่วนใหญ่ ${band.th})`,
    fleet,
    `   รวม ${c.unitsAll} เครื่อง · ระบบ VRV / VRF ไม่รวมในสัญญานี้ (เสนอแยกเป็นงานโครงการ)`,
    `2. ความถี่: ปีละ ${c.x.visits} ครั้ง ประมาณทุก ${c.every} เดือน — ล้างปกติ (C1) ${c.x.visits - 1} ครั้ง และล้างใหญ่ (C2) 1 ครั้ง`,
    `3. มาตรฐานงาน: แบบฟอร์มงานล้างของบริษัท SBP-SR-ACCL-UNI-001 · แพ็กเกจ ${pk.th}: ${pk.sub} · ลงนามรับงาน 3 ฝ่ายทุกรอบ`,
    `4. ราคา: อัตรามาตรฐานตาม Pricebook 2569 ก่อน VAT — ตัวอย่าง ${baht(c.annualEx)} ต่อปี (รวม VAT ${baht(c.annualInc)}) · ยืนยันในใบเสนอราคาอย่างเป็นทางการหลังสำรวจ${c.unitsAll >= VOLUME_HINT ? ' · จำนวนเครื่องนี้อาจได้อัตราพิเศษตามเงื่อนไขบริษัท ทีมขายยืนยันในใบเสนอราคา' : ''}`,
    `5. งานนอกขอบเขต: งานซ่อมและอะไหล่แจ้งราคาให้อนุมัติก่อนทุกครั้ง · งานสูง พื้นที่ควบคุม และการเข้าถึงพิเศษ ประเมินหน้างาน · งานนอกเวลาทำการมีค่าใช้จ่ายเพิ่มเติม · ค่าเดินทางนอกพื้นที่หลักตามอัตราที่ประกาศ`,
    `6. ช่วงเวลาเข้างาน: ${s.window}`,
    `7. ข้อที่ตกลงร่วมกัน (กรอกเมื่อทำสัญญา)`,
    `   - ระยะเวลาตอบสนองเมื่อแจ้งเหตุ: ________`,
    `   - ผู้ประสานงานของลูกค้า / ของบริษัท: ________ / ________`,
    `   - รูปแบบใบแจ้งหนี้และรอบวางบิล: ________`,
    `   - ระยะเวลาสัญญา: ________`,
  ].join('\n');
}

export function mountEnterprise(root, { openCart, builder } = {}) {
  if (!root) return null;
  let cur = SECTORS[0], pkgOver = null;
  const tabs = h('div', { class: 'en-tabs', role: 'tablist', 'aria-label': 'ประเภทองค์กร' });
  const panel = h('div', { class: 'en-panel', role: 'tabpanel', id: 'en-panel', tabindex: '-1' });
  SECTORS.forEach(s => tabs.append(h('button', { type: 'button', role: 'tab', id: `en-tab-${s.id}`, 'aria-controls': 'en-panel', 'aria-selected': 'false', 'data-sector': s.id,
    onclick: () => pick(s.id, true) }, icon(ICON[s.id]), h('span', {}, s.th))));
  tabs.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const i = SECTORS.indexOf(cur), j = (i + (e.key === 'ArrowRight' ? 1 : SECTORS.length - 1)) % SECTORS.length;
    pick(SECTORS[j].id, true); tabs.querySelector(`[data-sector="${SECTORS[j].id}"]`).focus();
  });

  function contractCard(s) {
    const c = sampleContract(s, pkgOver ? { pkg: pkgOver } : {}), pk = CLEAN_PKGS.find(p => p.id === c.x.pkg);
    const card = h('div', { class: 'en-k', 'aria-live': 'polite' },
      h('p', { class: 'en-k-eb' }, 'สัญญารายปีตัวอย่าง'),
      h('h4', {}, c.x.label),
      h('div', { class: 'en-pkg', role: 'radiogroup', 'aria-label': 'แพ็กเกจ' }, CLEAN_PKGS.map(p => h('button', { type: 'button', role: 'radio', 'aria-checked': String(p.id === c.x.pkg),
        onclick: () => { pkgOver = p.id === s.sample.pkg ? null : p.id; draw(); } }, p.th))),
      h('p', { class: 'en-pkg-sub' }, pk.sub),
      h('div', { class: 'en-big' }, h('b', {}, baht(c.annualEx)), h('span', {}, `ต่อปี ก่อน VAT · รวม VAT ${baht(c.annualInc)}`)),
      h('dl', { class: 'en-dl' },
        h('dt', {}, 'เครื่องทั้งหมด'), h('dd', {}, `${c.unitsAll} เครื่อง${c.branches > 1 ? ` (${c.count} × ${c.branches} สาขา)` : ''}`),
        h('dt', {}, 'รอบต่อปี'), h('dd', {}, `${c.x.visits} ครั้ง · ทุก ${c.every} เดือน (ล้างใหญ่ 1)`),
        h('dt', {}, c.branches > 1 ? 'ล้างปกติต่อสาขา/รอบ' : 'ล้างปกติต่อรอบ'), h('dd', {}, baht(c.perVisitC1)),
        h('dt', {}, c.branches > 1 ? 'ล้างใหญ่ต่อสาขา/รอบ' : 'ล้างใหญ่ต่อรอบ'), h('dd', {}, baht(c.perVisitC2)),
        h('dt', {}, 'เฉลี่ยต่อเครื่องต่อปี'), h('dd', {}, `≈ ${baht(up100(c.perUnitYear))}`),
        h('dt', {}, 'กำลังคนต่อรอบ'), h('dd', {}, `${c.teamDaysPerVisit} ทีม-วัน${c.branches > 1 ? ' ต่อสาขา' : ''} (ประมาณ)`)),
      h('table', { class: 'en-fleet' }, h('caption', {}, `รายการเครื่อง${c.branches > 1 ? 'ต่อสาขา' : ''} · ราคาต่อเครื่องก่อน VAT`),
        h('thead', {}, h('tr', {}, h('th', {}, 'ประเภท'), h('th', {}, 'เครื่อง'), h('th', {}, 'ล้างปกติ'), h('th', {}, 'ล้างใหญ่'))),
        h('tbody', {}, c.lines.map(l => h('tr', {}, h('td', {}, `${TYPE_BY_ID[l.type].th}`, h('small', {}, `${l.range} BTU`)), h('td', {}, String(l.n)), h('td', {}, baht(l.c1)), h('td', {}, baht(l.c2)))))),
      h('p', { class: 'en-note' }, `ตัวอย่างเพื่อประมาณงบ ไม่ใช่ลูกค้าจริง · คิดในพื้นที่หลักกรุงเทพฯ อัตรามาตรฐาน Pricebook 2569${c.unitsAll >= VOLUME_HINT ? ' · จำนวนนี้อาจได้อัตราพิเศษตามเงื่อนไขบริษัท ทีมขายยืนยันในใบเสนอราคา' : ''}`),
      h('div', { class: 'en-acts' },
        h('button', { type: 'button', class: 's-btn primary', onclick: () => {
          cart.add({ kind: 'service', group: 'contract', key: `K-EN-${s.id}-${c.x.pkg}-${c.x.visits}`, name: `สัญญาล้างรายปี · ${s.th} (ตัวอย่าง ${c.unitsAll} เครื่อง × ${c.x.visits} ครั้ง/ปี)`, detail: `${c.x.pkg}${c.branches > 1 ? ` · ${c.branches} สาขา` : ''} · ยืนยันหลังสำรวจ`, unitEx: c.annualEx, qty: 1, units: c.unitsAll });
          toast('เพิ่มสัญญาตัวอย่างในใบเสนอราคาแล้ว'); openCart && openCart(); } }, 'ใส่ใบเสนอราคา'),
        builder && builder.load ? h('button', { type: 'button', class: 's-btn', onclick: () => {
          builder.load({ units: c.x.units, visits: c.x.visits, pkg: c.x.pkg, size: c.x.size, deep: true });
          const b = document.getElementById('b2b'); if (b) b.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
          toast(c.branches > 1 ? 'ใส่จำนวนเครื่องต่อสาขาในเครื่องคำนวณแล้ว' : 'ใส่ตัวอย่างในเครื่องคำนวณแล้ว ปรับจำนวนได้'); } }, 'ปรับจำนวนเครื่องเอง') : null,
        h('button', { type: 'button', class: 's-btn ghost', onclick: async () => toast((await copyText(scopeText(s, c))) ? 'คัดลอกร่างขอบเขตงานแล้ว วางในเอกสารจัดซื้อได้' : 'คัดลอกไม่ได้ในหน้านี้ เปิดดูร่างด้านล่างแทน') }, 'คัดลอกร่างขอบเขตงาน'),
        h('button', { type: 'button', class: 's-btn ghost', onclick: () => askTeam('สัญญาล้างรายปี', `ขอใบเสนอราคาสัญญารายปี · ${s.th} · ประมาณ ${c.unitsAll} เครื่อง${c.branches > 1 ? ` ${c.branches} สาขา` : ''} · ${c.x.pkg} ${c.x.visits} ครั้ง/ปี · ขอนัดสำรวจหน้างาน`) }, 'นัดสำรวจหน้างาน')),
      h('details', { class: 'en-sow' }, h('summary', {}, 'ดูร่างขอบเขตงาน (ตัวอย่าง)'), h('pre', {}, scopeText(s, c))));
    return card;
  }

  function draw() {
    const s = cur;
    panel.setAttribute('aria-labelledby', `en-tab-${s.id}`);
    panel.innerHTML = '';
    const adds = s.addOns.map(k => addOn(k, (pkgOver || s.sample.pkg))).filter(Boolean);
    panel.append(
      h('div', { class: 'en-main' },
        h('div', { class: 'en-hd' }, icon(ICON[s.id]), h('div', {}, h('h3', {}, s.th), h('p', {}, s.who))),
        h('ol', { class: 'en-pains' }, s.pains.map(([pain, fix, kind]) => h('li', {},
          h('p', { class: 'en-pain' }, pain),
          h('p', { class: 'en-fix' }, fill(fix), h('span', { class: 'en-tag ' + kind }, kind === P ? 'มีในแพ็กเกจ / แบบฟอร์มบริษัท' : 'ตกลงในสัญญา'))))),
        h('div', { class: 'en-side' },
          h('div', {}, h('b', {}, 'ช่วงเวลาเข้างาน'), h('p', {}, s.window)),
          adds.length ? h('div', {}, h('b', {}, 'รายการเพิ่มที่มักใช้กับสถานที่ประเภทนี้'), h('ul', {}, adds.map(a => h('li', {}, h('span', {}, a.name), h('em', {}, a.price))))) : null)),
      contractCard(s),
      benefitsBlock(s, sampleContract(s, pkgOver ? { pkg: pkgOver } : {})));
  }
  function pick(id, user) {
    const s = SECTORS.find(x => x.id === id); if (!s) return;
    if (s !== cur) pkgOver = null;
    cur = s;
    tabs.querySelectorAll('[role="tab"]').forEach(b => { const on = b.dataset.sector === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    draw();
    if (user) try { localStorage.setItem('sbp-en-sector', id); } catch (e) {}
  }

  // every sector side by side — the same live calculation
  const matrix = h('div', { class: 'en-mx' }, h('table', {},
    h('caption', {}, 'สัญญาตัวอย่างทุกประเภท · ราคาต่อปีก่อน VAT (Pricebook 2569 อัตรามาตรฐาน · พื้นที่หลักกรุงเทพฯ)'),
    h('thead', {}, h('tr', {}, ['ประเภท', 'ตัวอย่าง', 'แพ็กเกจที่แนะนำ', 'รอบต่อปี', 'ต่อปี'].map(t => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, SECTORS.map(s => { const c = sampleContract(s); return h('tr', {},
      h('th', { scope: 'row' }, h('button', { type: 'button', class: 'en-mx-go', onclick: () => { pick(s.id, true); root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } }, s.th)),
      h('td', {}, `${c.unitsAll} เครื่อง${c.branches > 1 ? ` (${c.branches} สาขา)` : ''}`), h('td', {}, c.x.pkg), h('td', {}, `${c.x.visits} ครั้ง (ทุก ${c.every} เดือน)`), h('td', { class: 'num' }, baht(c.annualEx))); }))));

  // the three packages — what each contract level delivers (CLEAN_PKGS, company form)
  const pkgs = h('div', { class: 'en-pkgs' }, CLEAN_PKGS.map(p => h('div', { class: 'en-pk' }, h('b', {}, p.th), h('p', {}, p.sub),
    h('small', {}, { 'Basic Clean': 'เหมาะกับ: ร้านค้า สำนักงานเล็ก งานที่ต้องการราคาประหยัด', 'Standard Care': 'เหมาะกับ: สำนักงาน คอนโด โรงเรียน โรงแรม', 'Corporate Control': 'เหมาะกับ: หลายสาขา โรงพยาบาล โรงงาน งานที่ต้องตรวจสอบย้อนหลัง' }[p.id] || ''))));

  root.append(h('div', { class: 'en' }, tabs, panel,
    h('h3', { class: 'en-h3' }, 'เทียบแพ็กเกจสัญญา'), pkgs,
    h('h3', { class: 'en-h3' }, 'เทียบสัญญาตัวอย่างทุกประเภท'), matrix,
    h('p', { class: 'en-note' }, 'ทุกตัวเลขคำนวณสดจาก Pricebook ของบริษัท ไม่มีส่วนลดบนหน้าเว็บ · ขั้นตอนงานตามแบบฟอร์มงานล้างของบริษัท · ระยะเวลาตอบสนอง รูปแบบใบแจ้งหนี้ และระยะเวลาสัญญา ตกลงเป็นรายองค์กรในใบเสนอราคา')));
  let first = SECTORS[0].id; try { const v = localStorage.getItem('sbp-en-sector'); if (SECTORS.some(s => s.id === v)) first = v; } catch (e) {}
  cur = null; pick(first);
  return { pick };
}
