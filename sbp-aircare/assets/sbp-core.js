// SBP AirCare prototype core — shared data + business logic (no rendering).
// Data source: assets/sbp-data.json, extracted from the company's approved price files
//   "ใบเสนอราคาติดตั้งแอร์ Final จริง.xlsx" (714 models, 194 install/add-on items)
//   "ใบเสนอราคาล้างและซ่อม Final จริง.xlsx" (cleaning pricebook 3 packages × C1/C2, 86 repair items)
// All source prices are before VAT. The site shows VAT-inclusive prices first, with the pre-VAT figure beside it.

export const VAT = 0.07;
export const incVat = n => Math.round(n * (1 + VAT));
// ★Rev.16 owner decision (2 ต.ค. 2569: "ราคาก่อนแวททั้งหมด ทุกราคา งานบริการให้เป็นตัวเลข round up hundred digit และระบุราคาก่อน VAT เสมอ"):
// every price on the site is shown BEFORE VAT and labelled so; VAT 7% appears only in the totals of a quotation.
// Service rates (cleaning, repair, installation service) are rounded UP to the next 100 baht when loaded — the Pricebook file
// is not edited (tools_recon.py still checks it 1:1). Materials sold per metre / piece keep their exact Pricebook price.
export const up100 = n => n == null ? n : Math.ceil(n / 100) * 100;
export const EX_TH = 'ก่อน VAT';

/* ---------- taxonomy ---------- */
export const TYPES = [
  { id: 'wall',     th: 'ติดผนัง',            en: 'Wall type',          color: '#1B5AA8', code: 'W',  clean: 'ติดผนัง' },
  { id: 'ceiling',  th: 'แขวนใต้ฝ้า',          en: 'Ceiling suspended',  color: '#7A4FB5', code: 'C',  clean: 'แขวนใต้ฝ้า' },
  { id: 'cassette', th: 'สี่ทิศทาง',           en: 'Cassette',           color: '#0E8C7A', code: 'K',  clean: 'สี่ทิศทาง' },
  { id: 'floor',    th: 'ตู้ตั้งพื้น',            en: 'Floor standing',     color: '#B4560D', code: 'FS', clean: 'ตั้งพื้น/ตั้งตู้' },
  { id: 'duct',     th: 'ซ่อนในฝ้า / ท่อลม',   en: 'Ducted / concealed', color: '#5A6675', code: 'DUCT', clean: 'ซ่อนในฝ้า/ต่อท่อลม' },
];
export const TYPE_BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));
const TYPE_FROM_CLEAN = Object.fromEntries(TYPES.map(t => [t.clean, t.id]));

export const BRANDS = [];          // filled by loadData()
export const BRAND_BY_ID = {};
export const DEMO = { models: [], skuCount: 0 };   // name kept for compatibility: now real catalog
export const DATA = { inst: [], instByCode: {}, clean: [], rep: [], minBill: 4500, version: '', loaded: false };
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function loadData(url) {
  if (DATA.loaded) return DATA;
  // single-file builds inline the data as globalThis.__SBP_DATA; the multi-file prototype fetches it
  const j = globalThis.__SBP_DATA || await (await fetch(url || new URL('./sbp-data.json', import.meta.url))).json();
  const S = i => (i == null || i < 0 ? null : j.pool[i]);
  DATA.version = j.v; DATA.minBill = j.minBill;
  await loadAddr();   // Rev.20 address book for the area picker + travel rule
  // products -> series cards
  const groups = new Map();
  let skuCount = 0;
  for (const r of j.prods) {
    const [type, brand, model, btu, px, ix, approved, se, sys, ref, pl, pg, idim, iwt, odim, owt, pw, comp, war, lead, od, lmax, hmax] = r;
    const d = { series: S(se), system: S(sys), refrigerant: S(ref), pipeLiquid: S(pl), pipeGas: S(pg), indoorDim: S(idim), indoorKg: S(iwt), outdoorDim: S(odim), outdoorKg: S(owt), power: S(pw), compressor: S(comp), warranty: S(war), lead: S(lead), outdoorModel: S(od), maxPipe: S(lmax), maxLift: S(hmax), approved: !!approved };
    const bid = slug(brand);
    if (!BRAND_BY_ID[bid]) { const b = { id: bid, name: brand, n: 0 }; BRANDS.push(b); BRAND_BY_ID[bid] = b; }
    BRAND_BY_ID[bid].n++;
    const inverter = /inverter/i.test(d.system || '');
    const key = [bid, d.series || model, type, inverter].join('|');
    if (!groups.has(key)) groups.set(key, { id: slug(key), code: model, brand: bid, type, inverter, label: d.refrigerant || '—', series: (d.series || model) + (/inverter|fixed/i.test(d.series || '') ? '' : inverter ? ' · Inverter' : d.system ? ' · ' + d.system : ''), popular: false, isNew: false, skus: [] });
    groups.get(key).skus.push({ sku: model, btu, px, price: px, installStdEx: ix, stock: 'check', d });
    skuCount++;
  }
  DEMO.models = [...groups.values()].map(m => (m.skus.sort((a, b) => a.btu - b.btu), m.code = m.skus[0].sku, m));
  DEMO.skuCount = skuCount;
  BRANDS.sort((a, b) => b.n - a.n);
  const fj = { id: 'fujiva', name: 'FUJIVA', own: true, n: 0 }; BRANDS.unshift(fj); BRAND_BY_ID.fujiva = fj;
  // install + add-on items
  // Owner decision (Rev.07): the web sells Standard + Premium installation only (premium-grade materials in every job);
  // the Basic/MASS tier stays in the Pricebook for the sales team. Copper brand shown as O-TWO (Pricebook to be updated to match).
  // Rev.08 owner decision: the web shows one copper spec only — O-TWO 0.70 mm. Type L / project-grade copper stays in the Pricebook (QTN/BOQ work) but is not listed on the web.
  const brand = t => t == null ? t : t.replace(/K Copper Type L/g, 'O-TWO').replace(/K Copper/g, 'O-TWO').replace(/ท่อน้ำยาทองแดง 0\.70 มม\./g, 'ท่อน้ำยาทองแดง O-TWO 0.70 มม.').replace(/ท่อ Type L หรือ Project-grade ใช้เมื่อระบุใน QTN\/BOQ;\s*ไม่รวมอัตโนมัติหากไม่ระบุ;\s*/g, '');
  DATA.inst = j.inst.map(([c, cat, n, u, p, inc, exc, w, sv]) => ({ code: c, cat: S(cat), name: brand(n), unit: S(u), ex: /^INS-/.test(c) ? up100(p) : p, inc: brand(S(inc)), exc: S(exc), warranty: S(w), survey: S(sv) })).filter(i => !/-MASS$/.test(i.code) && !/^MAT-CU-L-/.test(i.code));
  DATA.instByCode = Object.fromEntries(DATA.inst.map(i => [i.code, i]));
  DATA.clean = j.clean.map(([pk, lv, ty, rg, u, s, sp, pj, w, care, doc, inc, exc, st, n]) => ({ pkg: S(pk), level: lv, ty: S(ty), type: TYPE_FROM_CLEAN[S(ty)] || null, range: S(rg), unit: S(u), rate: { s: up100(s), sp, pj, pb: s }, warranty: S(w), care: S(care), doc: S(doc), inc: S(inc), exc: S(exc), status: S(st), name: n }));
  DATA.rep = j.rep.map(([ty, n, u, s, sp, pj, w, inc, exc, st]) => ({ cat: S(ty), name: n.replace(/^ซ่อมแอร์:\s*/, ''), unit: S(u), rate: { s: up100(s), sp, pj, pb: s }, warranty: S(w), inc: S(inc), exc: S(exc), status: S(st) }));
  // headline "from" prices for service cards
  const minOf = arr => Math.min(...arr.filter(x => x != null));
  const c1 = DATA.clean.filter(r => r.pkg === 'Basic Clean' && r.level === 'C1' && r.type).map(r => r.rate.s);
  const ins = DATA.inst.filter(i => /^INS-/.test(i.code) && i.ex).map(i => i.ex);
  const dia = DATA.rep.filter(r => r.cat === 'ตรวจวินิจฉัย').map(r => r.rate.s);
  const set = (id, from) => { const s = SERVICES.find(x => x.id === id); if (s) s.from = from; };
  set('clean', `เริ่ม ${baht((minOf(c1)))} / เครื่อง`);
  set('install', `เริ่ม ${baht((minOf(ins)))} / เครื่อง`);
  set('repair', `ค่าตรวจเริ่ม ${baht((minOf(dia)))}`);
  DATA.loaded = true;
  return DATA;
}

export const stockTh = s => (s.stock === 'ready' ? 'พร้อมส่ง' : s.stock === 'order' ? 'สั่งจอง' : 'ยืนยันสต็อกก่อนสั่ง');

/* ---------- install packages + add-ons for one SKU ---------- */
const INS_LEVELS = [
  { key: 'STANDARD', th: 'มาตรฐาน', note: 'แนะนำ · รับประกันงานติดตั้งตามเงื่อนไข 1–3 ปี' },
  { key: 'PREMIUM', th: 'พรีเมียม', note: 'เพิ่ม Support และงานเก็บรายละเอียด' },
];
export function installOptions(type, btu) {
  const code = TYPE_BY_ID[type]?.code;
  const bands = [...new Set(DATA.inst.filter(i => i.code.startsWith(`INS-${code}-`) && !/SURVEY/.test(i.code)).map(i => i.code.split('-').slice(2, 4).join('-')))]
    .map(b => ({ b, lo: +b.split('-')[0], hi: +b.split('-')[1] })).sort((a, b) => a.lo - b.lo);
  const band = bands.find(x => btu <= x.hi);
  if (!band) return [];
  return INS_LEVELS.map(l => ({ ...l, item: DATA.instByCode[`INS-${code}-${band.b}-${l.key}`] })).filter(o => o.item);
}
const PIPE_SET = [[12000, 'PIP-PKG-1438'], [18000, 'PIP-PKG-1412'], [24000, 'PIP-PKG-1458'], [36000, 'PIP-PKG-3858'], [48000, 'PIP-PKG-3834'], [60000, 'PIP-PKG-3878']];
export function addonsFor(type, btu) {
  const I = c => DATA.instByCode[c];
  const pipe = I((PIPE_SET.find(([m]) => btu <= m) || PIPE_SET[PIPE_SET.length - 1])[1]);
  const rem = { wall: 'REM-W', ceiling: 'REM-C', cassette: 'REM-K', floor: 'REM-FS', duct: 'REM-DUCT' }[type];
  return [
    { group: 'วัสดุส่วนเกิน', items: [
      { item: pipe, qty: 'm', note: 'ในราคาติดตั้งรวมท่อ 4 เมตรแรกแล้ว ใส่เฉพาะส่วนที่เกิน' },
      { item: I('MAT-SCG-DRAIN-34'), qty: 'm' },
    ] },
    { group: 'ระบบไฟ', items: [
      { choose: ['ELE-MAIN-1P-2.5', 'ELE-MAIN-1P-4', 'ELE-MAIN-1P-6'].map(I), qty: 'm', note: 'ช่างยืนยันขนาดสายตามกระแสของรุ่นก่อนติดตั้ง' },
      { choose: ['ELE-NANO-RCBO20', 'ELE-NANO-RCBO32'].map(I), qty: 'pc' },
    ] },
    { group: 'น้ำทิ้งและงานอื่น', items: [
      { item: I('DRAIN-PUMP-15'), qty: 'pc' }, { item: I('DRAIN-TRAP-34'), qty: 'pc' }, { item: I('FIRESTOP-4'), qty: 'pc' },
    ] },
    { group: 'ประเมินหน้างาน (ไม่มีราคาตายตัว)', items: [
      { item: I(rem), qty: 'flag' }, { item: I('DISPOSE'), qty: 'flag' }, { item: I('ACC-HEIGHT'), qty: 'flag' }, { item: I('SUP-STD'), qty: 'flag' },
      { item: I('CIV-CHASE'), qty: 'flag' }, { item: I('CIV-CEIL'), qty: 'flag' }, { item: I('LOG-NIGHT'), qty: 'flag' }, { item: I('LOG-SUN'), qty: 'flag' },
    ].filter(x => x.item) },
  ];
}

/* ---------- catalog query ---------- */
export const PRICE_BANDS = [
  { id: 'p1', th: 'ต่ำกว่า 15,000', min: 0, max: 15000 },
  { id: 'p2', th: '15,000–25,000', min: 15000, max: 25000 },
  { id: 'p3', th: '25,000–40,000', min: 25000, max: 40000 },
  { id: 'p4', th: '40,000–70,000', min: 40000, max: 70000 },
  { id: 'p5', th: '70,000 ขึ้นไป', min: 70000, max: Infinity },
];
export const BTU_BANDS = [
  { id: 'b1', th: '≤ 12,000', min: 0, max: 12000 },
  { id: 'b2', th: '12,001–18,000', min: 12001, max: 18000 },
  { id: 'b3', th: '18,001–30,000', min: 18001, max: 30000 },
  { id: 'b4', th: '30,001–48,000', min: 30001, max: 48000 },
  { id: 'b5', th: '> 48,000', min: 48001, max: Infinity },
];
export function emptyFilter() { return { q: '', type: new Set(), brand: new Set(), btu: new Set(), price: new Set(), inverter: '', sort: 'rec' }; }
function skuMatches(sku, f) {
  if (f.btu.size && ![...f.btu].some(id => { const b = BTU_BANDS.find(x => x.id === id); return sku.btu >= b.min && sku.btu <= b.max; })) return false;
  if (f.price.size && ![...f.price].some(id => { const b = PRICE_BANDS.find(x => x.id === id); return sku.price >= b.min && sku.price < b.max; })) return false;
  return true;
}
function modelMatches(m, f, skip) {
  if (skip !== 'type' && f.type.size && !f.type.has(m.type)) return false;
  if (skip !== 'brand' && f.brand.size && !f.brand.has(m.brand)) return false;
  if (skip !== 'inverter' && f.inverter && (f.inverter === 'inv') !== m.inverter) return false;
  if (f.q) {
    const q = f.q.toLowerCase().replace(/[,\s\-\/]/g, '');
    const hay = (m.series + BRAND_BY_ID[m.brand].name + TYPE_BY_ID[m.type].th + m.skus.map(s => s.sku + s.btu).join('')).toLowerCase().replace(/[,\s\-\/]/g, '');
    if (!hay.includes(q)) return false;
  }
  const g = { ...f };
  if (skip === 'btu') g.btu = new Set();
  if (skip === 'price') g.price = new Set();
  return m.skus.some(s => skuMatches(s, g));
}
export function queryCatalog(f) {
  let list = DEMO.models.filter(m => modelMatches(m, f));
  const minP = m => Math.min(...m.skus.filter(s => skuMatches(s, f)).map(s => s.price));
  if (f.sort === 'price-asc') list.sort((a, b) => minP(a) - minP(b));
  else if (f.sort === 'price-desc') list.sort((a, b) => minP(b) - minP(a));
  else if (f.sort === 'btu') list.sort((a, b) => a.skus[0].btu - b.skus[0].btu);
  else list.sort((a, b) => TYPES.findIndex(t => t.id === a.type) - TYPES.findIndex(t => t.id === b.type) || BRAND_BY_ID[b.brand].n - BRAND_BY_ID[a.brand].n || a.skus[0].btu - b.skus[0].btu);
  const skuTotal = list.reduce((n, m) => n + m.skus.filter(s => skuMatches(s, f)).length, 0);
  return { list, skuTotal, visibleSkus: m => m.skus.filter(s => skuMatches(s, f)) };
}
export function facetCounts(f) {
  const out = { type: {}, brand: {}, btu: {}, price: {}, inverter: {} };
  const base = key => DEMO.models.filter(m => modelMatches(m, f, key));
  const bt = base('type'); TYPES.forEach(t => out.type[t.id] = bt.filter(m => m.type === t.id).length);
  const bb = base('brand'); BRANDS.forEach(b => out.brand[b.id] = bb.filter(m => m.brand === b.id).length);
  const bu = base('btu'); BTU_BANDS.forEach(b => out.btu[b.id] = bu.filter(m => m.skus.some(s => s.btu >= b.min && s.btu <= b.max && skuMatches(s, { ...f, btu: new Set() }))).length);
  const bp = base('price'); PRICE_BANDS.forEach(b => out.price[b.id] = bp.filter(m => m.skus.some(s => s.price >= b.min && s.price < b.max && skuMatches(s, { ...f, price: new Set() }))).length);
  const bi = base('inverter'); out.inverter.inv = bi.filter(m => m.inverter).length; out.inverter.fix = bi.filter(m => !m.inverter).length;
  return out;
}
export function filterToParams(f) {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  for (const k of ['type', 'brand', 'btu', 'price']) if (f[k].size) p.set(k, [...f[k]].join(','));
  if (f.inverter) p.set('inv', f.inverter);
  if (f.sort !== 'rec') p.set('sort', f.sort);
  return p.toString();
}

/* ---------- formatting ---------- */
export const baht = n => '฿' + Math.round(n).toLocaleString('en-US');
export const btuFmt = n => n.toLocaleString('en-US') + ' BTU';
export const kbtu = n => (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'k';

/* ---------- company + HQ point (service area: see TRAVEL below) ---------- */
export const HQ = { th: 'สำนักงานใหญ่ 593 ถ.พระราม 2', lat: 13.664, lon: 100.44 };   // approximate point
// Rev.10 (2 ต.ค. 2569) — company facts for the about / contact blocks. Email from the owner; address, phone, LINE OA and Facebook
// from the official site sahaburapagroup.com (home + contact pages); tax id = juristic person registration no. 0105553009307
// (DBD public listing, registered 20 Jan 2010). www.sahaburapa.com no longer belongs to the company (it now serves an unrelated
// gambling site) → never link to it. Opening hours (owner, 2 ต.ค. 2569): Mon–Sat 08:30–17:30, closed Sunday; work outside those hours
// is possible at an extra charge (amount not published → the team states it in the quotation; never invent a figure).
export const COMPANY = {
  th: 'บริษัท สหบูรพากรุ๊ป จำกัด', en: 'Saha Burapa Group Co., Ltd.', brand: 'SBP AirCare', service: 'Sahaburapa Service',
  addr: '593 ถนนพระราม 2 แขวงบางมด เขตจอมทอง กรุงเทพฯ 10150', tel: '02-459-3299', telHref: 'tel:024593299', email: 'Sahaburapa.official@gmail.com',
  web: 'www.sahaburapagroup.com', webUrl: 'https://www.sahaburapagroup.com', years: 'กว่า 30 ปี', taxId: '0105553009307',
  line: '@sahaservices', lineUrl: 'https://line.me/R/ti/p/@sahaservices', fbUrl: 'https://www.facebook.com/profile.php?id=61560113712375',
  hours: 'จันทร์–เสาร์ 08:30–17:30 น. (หยุดวันอาทิตย์)', hoursNote: 'นอกเวลาทำการและวันอาทิตย์ให้บริการได้ มีค่าใช้จ่ายเพิ่มเติม ทีมแจ้งในใบเสนอราคา',
  open: { days: [1, 2, 3, 4, 5, 6], from: '08:30', to: '17:30' },   // 0 = Sunday (Date#getDay)
  trade: 'จำหน่ายและนำเข้าน้ำยาแอร์ อุปกรณ์ เครื่องมือ และอะไหล่แอร์ ทั้งปลีกและส่ง',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('สหบูรพากรุ๊ป 593 ถนนพระราม 2 บางมด จอมทอง กรุงเทพฯ'),
};
/* ---------- ★Rev.20 service area + travel (owner 3 ต.ค. 2569: "รับระยะ 1–30 กม. เฉพาะในกรุงเทพ และมีข้อจำกัดต่อ 1 งาน หากไม่ถึง
   มีค่าเดินทาง และถ้าระยะเกินกว่านั้นบวกตามระยะทางไปเหมือนคอนเซ็ปบริษัทอื่น ๆ") ----------
   · พื้นที่หลัก = ที่อยู่ในกรุงเทพมหานคร และระยะถนนจากสำนักงานใหญ่ไม่เกิน freeKm → ไม่มีค่าเดินทาง เมื่องานล้างถึงยอดขั้นต่ำ
     (DATA.minBill) · งานล้างที่ยอดต่ำกว่าขั้นต่ำ → ค่าเดินทาง baseFee แทนการเติมยอดขั้นต่ำ
   · นอกพื้นที่หลัก (กรุงเทพฯ ที่ไกลกว่า freeKm หรือจังหวัดอื่น) ≤ maxKm → baseFee + perKm × กม. ที่เกิน freeKm ต่อเที่ยว (ปัดขึ้นหลักร้อย)
   · เกิน maxKm → ไม่รับรายเครื่อง (งานโครงการ / สัญญา)
   baseFee 300 และ perKm 10 คือค่าที่เว็บประกาศอยู่แล้วจากการสำรวจร้านแอร์ (29 ก.ย. 2569) — เจ้าของยืนยันตัวเลขได้ที่นี่ที่เดียว
   ระยะ = เส้นตรงจากจุดที่ว่าการเขต/อำเภอ (หรือจุดกลางแขวง/ตำบล) × roadFactor — ค่าประมาณ ทีมยืนยันจากที่อยู่จริง */
export const TRAVEL = {
  roadFactor: 1.35, freeKm: 30, freeProvince: 'กรุงเทพมหานคร', baseFee: 300, perKm: 10, maxKm: 150,
  source: 'ค่าเดินทางเริ่มต้นและต่อกิโลเมตรจากการสำรวจราคาที่ร้านแอร์ในไทยประกาศ (29 ก.ย. 2569)',
};
export const TIER_TH = {
  core: { th: 'พื้นที่ให้บริการหลัก', note: `กรุงเทพฯ ในระยะ ${TRAVEL.freeKm} กม. จากสำนักงานใหญ่ ไม่มีค่าเดินทางเมื่อยอดงานล้างถึงขั้นต่ำ` },
  extended: { th: 'รับงานได้ คิดค่าเดินทางตามระยะ', note: `ค่าเดินทางต่อเที่ยว = ${TRAVEL.baseFee} บาท + ${TRAVEL.perKm} บาทต่อ กม. ที่เกิน ${TRAVEL.freeKm} กม. (ก่อน VAT ปัดขึ้นหลักร้อย)` },
  out: { th: 'เกินระยะรับงานรายเครื่อง', note: `ไกลกว่า ${TRAVEL.maxKm} กม. ฝากข้อมูลไว้ ทีมประเมินเป็นงานโครงการหรือสัญญา` },
  unknown: { th: 'ไม่พบพื้นที่นี้', note: 'เลือกจากรายการ หรือพิมพ์ชื่อแขวง/ตำบล เขต/อำเภอ หรือรหัสไปรษณีย์' },
};
// fee for one trip at `km` road km outside the core area (null = beyond maxKm)
export const travelFee = km => km > TRAVEL.maxKm ? null : up100(TRAVEL.baseFee + TRAVEL.perKm * Math.max(0, km - TRAVEL.freeKm));

/* address book (assets/th-address.json, built by tools/build-address.py): provinces near HQ with every district / subdistrict /
   postcode and a point; other provinces by name. Loaded by loadData() (or globalThis.__SBP_ADDR in single-file builds). */
export const ADDR = { list: [], other: [], loaded: false };
export async function loadAddr(url) {
  if (ADDR.loaded) return ADDR;
  try {
    const j = globalThis.__SBP_ADDR || await (await fetch(url || new URL('./th-address.json', import.meta.url))).json();
    const list = [];
    j.p.forEach(([p, ds]) => ds.forEach(([d, la, lo, subs]) => subs.forEach(([s, z, sla, slo]) => list.push({ p, d, s, z, lat: sla ?? la, lon: slo ?? lo }))));
    Object.assign(ADDR, { list, other: j.o, src: j.v, loaded: true });
  } catch (e) { ADDR.loaded = true; }
  return ADDR;
}
const hav = (a, b, c, d) => { const R = 6371, t = x => x * Math.PI / 180; const dl = t(c - a), dn = t(d - b); const s = Math.sin(dl / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };
export const roadKm = (lat, lon) => Math.round(hav(HQ.lat, HQ.lon, lat, lon) * TRAVEL.roadFactor);
const pTh = p => p === 'กรุงเทพมหานคร' ? 'กรุงเทพฯ' : p;
const BKK = p => p === 'กรุงเทพมหานคร';
// display name of one address: แขวง… เขต… กรุงเทพฯ / ต.… อ.… จ.…
export const addrTh = a => !a ? '' : BKK(a.p) ? `${a.s ? 'แขวง' + a.s + ' ' : ''}${a.d ? 'เขต' + a.d + ' ' : ''}กรุงเทพฯ${a.z ? ' ' + a.z : ''}` : `${a.s ? 'ต.' + a.s + ' ' : ''}${a.d ? 'อ.' + a.d + ' ' : ''}จ.${a.p}${a.z ? ' ' + a.z : ''}`;
/** zone of a picked address {p, d?, s?, z?} → { tier, km, fee, province, district, sub, zip, match } */
export function zoneOf(a) {
  if (!a || !a.p) return null;
  const base = { province: a.p, district: a.d || '', sub: a.s || '', zip: a.z || '', match: addrTh(a), districts: [] };
  const rows = ADDR.list.filter(r => r.p === a.p && (!a.d || r.d === a.d) && (!a.s || r.s === a.s) && (!a.z || r.z === a.z));
  if (!rows.length) return ADDR.other.includes(a.p) ? { ...base, tier: 'out', km: null, fee: null } : { ...base, tier: 'unknown', km: null, fee: null };
  // a whole province / district: the nearest part decides (the team confirms from the exact address)
  const km = Math.min(...rows.map(r => roadKm(r.lat, r.lon)));
  if (BKK(a.p) && km <= TRAVEL.freeKm) return { ...base, tier: 'core', km, fee: 0 };
  const fee = travelFee(km);
  return fee == null ? { ...base, tier: 'out', km, fee: null } : { ...base, tier: 'extended', km, fee };
}
const nrm = s => (s || '').replace(/\s|แขวง|เขต|ตำบล|อำเภอ|จังหวัด|ต\.|อ\.|จ\./g, '').replace(/^กทม$|^กรุงเทพฯ?$/, 'กรุงเทพมหานคร').toLowerCase();
/** type-ahead: subdistrict / district / province / postcode → up to n picks, best first */
export function addrSearch(q, n = 8) {
  const k = nrm(q); if (k.length < 2) return [];
  const out = [], seen = new Set(), add = (a, score) => { const key = `${a.p}|${a.d || ''}|${a.s || ''}|${a.z || ''}`; if (!seen.has(key)) { seen.add(key); out.push({ ...a, score }); } };
  const zip = /^\d{2,5}$/.test(k);
  for (const r of ADDR.list) {
    if (zip) { if (r.z.startsWith(k)) add({ p: r.p, d: r.d, s: r.s, z: r.z }, r.z === k ? 3 : 1); continue; }
    const s = nrm(r.s), d = nrm(r.d), p = nrm(r.p);
    if (s === k) add({ p: r.p, d: r.d, s: r.s, z: r.z }, 6); else if (s.startsWith(k)) add({ p: r.p, d: r.d, s: r.s, z: r.z }, 4);
    if (d === k) add({ p: r.p, d: r.d }, 7); else if (d.startsWith(k)) add({ p: r.p, d: r.d }, 5);
    if (p === k || p.startsWith(k)) add({ p: r.p }, p === k ? 5 : 2);
  }
  if (!zip) ADDR.other.forEach(p => { if (nrm(p).startsWith(k)) add({ p }, 1); });
  return out.sort((a, b) => b.score - a.score || (a.s ? 1 : 0) - (b.s ? 1 : 0) || roadKmOf(a) - roadKmOf(b)).slice(0, n);
}
const roadKmOf = a => { const r = ADDR.list.find(x => x.p === a.p && (!a.d || x.d === a.d)); return r ? roadKm(r.lat, r.lon) : 999; };
/** free text (older inputs, tests): the best pick, or "unknown" */
export function checkZone(input) {
  if (input && typeof input === 'object') return zoneOf(input);
  const q = nrm(input); if (q.length < 2) return null;
  const best = addrSearch(input, 1)[0];
  return best ? zoneOf(best) : { province: '', match: input, tier: 'unknown', districts: [], km: null, fee: null };
}
/** travel for one visit: zone (or null when not given yet) + the cleaning amount of that visit (before VAT)
 *  → { fee, small (cleaning below the minimum), distance (part for km beyond freeKm), label } */
export function jobTravel(zone, cleanEx = 0) {
  const small = cleanEx > 0 && cleanEx < DATA.minBill;
  if (zone && zone.tier === 'extended') return { fee: zone.fee, small, distance: true, label: `ค่าเดินทาง ${zone.km} กม. (ระยะถนนโดยประมาณ)` };
  if (small && (!zone || zone.tier === 'core' || zone.tier === 'unknown')) return { fee: TRAVEL.baseFee, small, distance: false, label: `ค่าเดินทาง (งานล้างต่ำกว่าขั้นต่ำ ${baht(DATA.minBill)})` };
  return { fee: 0, small, distance: false, label: '' };
}
export const travelNote = z => !z ? '' : z.tier === 'core' ? `ในระยะ ${z.km} กม. · ไม่มีค่าเดินทางเมื่องานล้างถึง ${baht(DATA.minBill)}` : z.tier === 'extended' ? `ระยะถนนประมาณ ${z.km} กม. · ค่าเดินทาง ${baht(z.fee)}/เที่ยว (ก่อน VAT)` : z.tier === 'out' ? TIER_TH.out.note : TIER_TH.unknown.note;

/* ---------- annual cleaning contract (real pricebook rates) ---------- */
export const CLEAN_PKGS = [
  { id: 'Basic Clean', th: 'Basic Clean', sub: 'ใบรับมอบงานแบบย่อ · รับประกันงาน 30 วัน' },
  { id: 'Standard Care', th: 'Standard Care', sub: 'Service Report พร้อมภาพ · รับประกัน 45 วัน · Service Care 90 วัน' },
  { id: 'Corporate Control', th: 'Corporate Control', sub: 'Asset Report รายเครื่อง · รับประกัน 60 วัน · Service Care Plus 90 วัน' },
];
export const SIZE_BANDS = [
  { id: 0, th: 'เล็ก', wall: '9,000-18,000', other: '<=24,000' },
  { id: 1, th: 'กลาง', wall: '19,000-24,000', other: '25,000-36,000' },
  { id: 2, th: 'ใหญ่', wall: '25,000-36,000', other: '37,000-48,000' },
  { id: 3, th: 'ใหญ่มาก', wall: '37,000-60,000', other: '49,000-60,000' },
];
// Public site shows the STANDARD rate only. Special / project rates need conditions + approval (Approval Matrix)
// and are never sent to the browser — the sales team offers them in the formal quotation.
export const VOLUME_LEVELS = [ { min: 0, key: 's', th: 'อัตรามาตรฐาน' } ];
export const VOLUME_HINT = 10;   // from this many units the page says "may qualify for a special rate — confirmed in the quotation"
// Crew productivity per team-day for standard cleaning (C1) — company manual §1.9 (SBP-GRW-001): wall 20–25, ceiling/cassette 12–16 → mid-points.
// Floor-standing uses the ceiling/cassette range; ducted uses its lower bound (no separate figure in the manual).
export const PRICING = { unitsPerTeamDay: { wall: 22, ceiling: 14, cassette: 14, floor: 14, duct: 12 } };
export function cleanRate(pkg, level, type, sizeId) {
  const band = SIZE_BANDS[sizeId] || SIZE_BANDS[0];
  const rg = type === 'wall' ? band.wall : band.other;
  return DATA.clean.find(r => r.pkg === pkg && r.level === level && r.type === type && r.range === rg);
}
export const PRESETS = [
  { id: 'office-s', th: 'สำนักงานเล็ก', sub: '10 เครื่อง', units: { wall: 8, cassette: 2 }, visits: 3 },
  { id: 'office-m', th: 'สำนักงาน 1 ชั้น', sub: '30 เครื่อง', units: { wall: 12, cassette: 14, ceiling: 4 }, visits: 3 },
  { id: 'factory', th: 'โรงงาน / โกดัง', sub: '46 เครื่อง', units: { wall: 10, ceiling: 20, floor: 8, duct: 8 }, visits: 4 },
  { id: 'building', th: 'อาคาร / คอนโด', sub: '120 เครื่อง', units: { wall: 96, cassette: 16, duct: 8 }, visits: 2 },
];
export function estimateContract({ units, visits, zone = null, high = false, pkg = 'Standard Care', size = 0, deep = true }) {
  const count = Object.values(units).reduce((a, b) => a + (+b || 0), 0);
  if (!count) return { count: 0 };
  const lvl = VOLUME_LEVELS.find(v => count >= v.min);
  let c1 = 0, c2 = 0, teamDays = 0; const lines = [];
  for (const [t, n] of Object.entries(units)) {
    if (!(+n)) continue;
    const r1 = cleanRate(pkg, 'C1', t, size), r2 = cleanRate(pkg, 'C2', t, size);
    const p1 = r1 ? r1.rate[lvl.key] ?? r1.rate.s : 0, p2 = r2 ? r2.rate[lvl.key] ?? r2.rate.s : 0;
    c1 += p1 * n; c2 += p2 * n; teamDays += n / (PRICING.unitsPerTeamDay[t] || 5);
    lines.push({ type: t, n: +n, range: r1?.range, c1: p1, c2: p2 });
  }
  const deepVisits = deep ? 1 : 0;
  const normalVisits = Math.max(0, visits - deepVisits);
  const minBill = DATA.minBill;
  // ★Rev.20 below the cleaning minimum a visit carries the travel fee (no top-up to the minimum); outside the core area every visit does
  const t1 = jobTravel(zone, c1), t2 = jobTravel(zone, c2);
  const v1 = c1 + t1.fee, v2 = c2 + t2.fee, travel = t1.fee;
  const annualEx = v1 * normalVisits + v2 * deepVisits;
  return {
    count, visits, level: lvl, lines, perVisitC1: v1, perVisitC2: v2, travel, travelLabel: t1.label, travelWaived: false, travelShort: 0,
    minBillApplied: c1 < minBill || (deep && c2 < minBill),
    annualEx, vat: Math.round(annualEx * VAT), annualInc: incVat(annualEx),
    perUnitYear: annualEx / count, teamDaysPerVisit: Math.ceil(teamDays * 2) / 2, high,
    // aliases kept for older markup
    low: annualEx, high_: incVat(annualEx),
  };
}

/* ---------- BTU helper (rule of thumb, preliminary) ---------- */
export function recommendBtu({ w, d, h = 2.7, sun = 1, people = 2, use = 'home' }) {
  const area = w * d;
  const perM2 = [700, 750, 820][sun];
  const useF = { home: 1, office: 1.06, shop: 1.15 }[use] || 1;
  let btu = area * perM2 * useF * Math.max(1, h / 2.7) + Math.max(0, people - 2) * 600;
  const sizes = [9000, 12000, 15000, 18000, 24000, 30000, 36000, 48000, 60000];
  const pick = sizes.find(s => s >= btu) || sizes[sizes.length - 1];
  return { area, btu: Math.round(btu / 100) * 100, pick };
}

/* ---------- services ---------- */
export const SERVICES = [
  { id: 'clean-b2b', th: 'สัญญาล้างรายปี', sub: 'องค์กร · อาคาร · โรงงาน', from: 'อัตราตามจำนวนเครื่อง', time: 'วางแผนรอบทั้งปี', key: true },
  { id: 'clean', th: 'ล้างแอร์', sub: 'ล้างปกติ C1 / ล้างใหญ่ C2', from: '—', time: 'ตามจำนวนเครื่อง' },
  { id: 'install', th: 'ติดตั้งแอร์', sub: 'พื้นฐาน · มาตรฐาน · พรีเมียม', from: '—', time: 'รวมท่อ 4 เมตรแรก' },
  { id: 'repair', th: 'ตรวจเช็ก / ซ่อม', sub: '86 รายการ พร้อมราคาและประกัน', from: '—', time: 'แจ้งราคาก่อนซ่อม' },
  { id: 'move', th: 'รื้อ ย้าย ติดตั้งใหม่', sub: 'เก็บน้ำยา ถอด ย้าย ติดตั้ง', from: 'ประเมินหน้างาน', time: 'ตามระยะท่อจริง' },
  { id: 'project', th: 'งานโครงการ · VRV / VRF', sub: 'VRV · VRF · Package · AHU · Duct', from: 'ติดต่อทีมโครงการ', time: 'สำรวจ + ออกแบบ + BOQ', contact: true },
];
// Rev.09 owner decision (1 ต.ค. 2569): cleaning and installation on the web cover every system type EXCEPT VRV / VRF —
// those are designed per project, so every VRV/VRF item routes to a separate inquiry instead of the quote basket.
export const isVRF = (...t) => /VRV|VRF/i.test(t.filter(Boolean).join(' '));
export const VRF_NOTE = 'ระบบ VRV / VRF ออกแบบเฉพาะโครงการ ไม่มีราคาบนเว็บ ติดต่อทีมโครงการเพื่อสำรวจและออกแบบ';
// topics offered in every page's contact form (askTeam() pre-selects one)
export const CONTACT_TOPICS = ['ล้างแอร์', 'ติดตั้งแอร์', 'ซ่อม / ตรวจเช็ก', 'เทิร์นแอร์เก่า', 'สัญญาล้างรายปี', 'ซื้อแอร์', 'FUJIVA', 'ระบบ VRV / VRF', 'งานโครงการอื่น', 'อื่น ๆ'];
export const PROCESS = [
  { th: 'เลือกบริการหรือรุ่น', d: 'ดูราคาบนเว็บ ใส่ลงใบเสนอราคาเบื้องต้น ระบบรวมยอดและ VAT ให้' },
  { th: 'ยืนยันหน้างาน', d: 'ทีมโทรยืนยัน รายการที่ต้องประเมินหน้างานจะแจ้งราคาก่อนเริ่มงาน' },
  { th: 'ลงมือทำงาน', d: 'คลุมพื้นที่ ทำตามขั้นตอน ถ่ายภาพก่อน–หลัง' },
  { th: 'ส่งมอบ + รายงาน', d: 'ทดสอบการทำงาน ส่งเอกสารตามแพ็กเกจ และเงื่อนไขรับประกันต่อรายการ' },
];
// ★Rev.15 owner rule (2 ต.ค. 2569): normal booking at least 3 days ahead · คิวด่วน (earlier, today included) +500 before VAT per
// visit, only when a crew is free. queue.js works out everything else from these two numbers.
export const QUEUE_RULES = { leadDays: 3, rushFeeEx: 500 };
export const FAQ = [
  { q: 'ต้องจองล่วงหน้ากี่วัน ถ้าต้องการด่วนได้ไหม', a: `จองปกติล่วงหน้า ${QUEUE_RULES.leadDays} วัน ถ้าต้องการเร็วกว่านั้น (รวมถึงวันนี้) เลือกคิวด่วน มีค่าบริการเพิ่ม ${(QUEUE_RULES.rushFeeEx).toLocaleString('en-US')} บาทต่อการเข้างาน (ก่อน VAT) รับเมื่อมีทีมว่างเท่านั้น ทีมยืนยันคิวก่อนทุกครั้ง ถ้าไม่มีคิวจะไม่เก็บค่าคิวด่วนและเสนอวันที่ใกล้ที่สุดให้ งานนอกเวลาทำการและวันอาทิตย์มีค่าใช้จ่ายเพิ่มเติม ทีมแจ้งในใบเสนอราคา` },
  { q: 'ราคาบนเว็บรวม VAT แล้วหรือยัง', a: 'ทุกราคาบนเว็บเป็นราคาก่อน VAT ราคางานบริการปัดเป็นหลักร้อยให้อ่านง่าย VAT 7% คิดครั้งเดียวที่ยอดรวมของใบเสนอราคา (แสดงยอดก่อน VAT · VAT · รวมทั้งสิ้น แยกให้เห็น)' },
  { q: 'ราคาติดตั้งรวมอะไรบ้าง', a: 'รวมท่อน้ำยาและวัสดุ 4 เมตรแรก ท่อน้ำทิ้ง สายไฟตามระยะที่ระบุ เบรกเกอร์ ขาแขวน Vacuum และทดสอบ ส่วนที่เกินเลือกเพิ่มได้ในหน้าสินค้า' },
  { q: 'รายการที่ขึ้นว่า "ประเมินหน้างาน" คืออะไร', a: 'งานที่ราคาขึ้นกับสภาพจริง เช่น รื้อเครื่องเดิม งานสูง นั่งร้าน เปิดฝ้า ทีมจะแจ้งราคาให้ยืนยันก่อนเริ่มงานทุกครั้ง' },
  { q: 'สัญญารายปีต่างจากเรียกล้างทีละครั้งอย่างไร', a: 'ทีมวางรอบล่วงหน้าทั้งปี ได้อัตราตามจำนวนเครื่อง มีรายงานตามแพ็กเกจหลังทุกรอบ และวางบิลตามรอบ' },
  // Rev.18: numbers come from TRAVEL / DATA.minBill so the answers can never drift from the calculators
  { q: 'พื้นที่ให้บริการและค่าเดินทางคิดอย่างไร', get a() { const T = TRAVEL; return `พื้นที่หลักคือกรุงเทพฯ ในระยะ ${T.freeKm} กม. จากสำนักงานใหญ่ พระราม 2 ไม่มีค่าเดินทางเมื่อยอดงานล้างถึง ${(DATA.minBill || 4500).toLocaleString('en-US')} บาท ถ้าต่ำกว่านั้นคิดค่าเดินทาง ${T.baseFee} บาทต่อการเข้างาน นอกพื้นที่หลักรับถึงประมาณ ${T.maxKm} กม. ค่าเดินทางต่อเที่ยว ${T.baseFee} บาท + ${T.perKm} บาทต่อกิโลเมตรที่เกิน ${T.freeKm} กม. (ก่อน VAT ปัดขึ้นหลักร้อย) ไกลกว่านั้นรับเป็นงานโครงการหรือสัญญา`; } },
  { q: 'รับงานระบบ VRV / VRF ไหม', a: 'รับเป็นงานโครงการแยกจากงานล้างและติดตั้งทั่วไป เพราะต้องสำรวจ ออกแบบท่อและคอนโทรล และทำ BOQ ตามอาคารจริง กด "ติดต่อสอบถาม VRV / VRF" แล้วทีมโครงการจะติดต่อกลับ' },
  { q: 'มียอดขั้นต่ำไหม', get a() { return 'งานล้างมียอดขั้นต่ำต่อการเข้าหน้างาน ' + (DATA.minBill || 4500).toLocaleString('en-US') + ` บาทก่อน VAT ถ้ายอดงานล้างต่ำกว่านี้ คิดค่าเดินทาง ${TRAVEL.baseFee} บาทต่อการเข้างาน ใบเสนอราคาเบื้องต้นแสดงให้เห็นก่อนส่งทุกครั้ง`; } },
];

/* ---------- utilities used by all variants ---------- */
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (typeof v === 'boolean' && k.startsWith('aria-')) { el.setAttribute(k, String(v)); continue; }   // aria-pressed="true"/"false", never ""
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
export function countUp(el, to, dur = 900, fmt = n => Math.round(n).toLocaleString('en-US')) {
  if (reduceMotion()) { el.textContent = fmt(to); return; }
  const from = parseFloat(el.dataset.v || 0) || 0; el.dataset.v = to;
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// Rev.12/15 estimated on-site time per unit for one crew of two (minutes) — from what Thai air-con shops publish online.
// Owner: depends on the site and the unit, never a promise / pass-fail line / price basis → always shown with TIME_NOTE.
export const JOB_TIME = {
  C1: { wall: [30, 60], ceiling: [40, 90], cassette: [40, 90], floor: [40, 90] },
  C2: { wall: [90, 150], ceiling: [90, 120], cassette: [90, 120], floor: [90, 120] },
  install: { wall: [120, 240], ceiling: [180, 360], cassette: [180, 480], floor: [180, 360] },
};
export const TIME_NOTE = 'เวลาโดยประมาณจากข้อมูลร้านแอร์ทั่วไป ขึ้นกับหน้างานและสภาพเครื่อง ไม่ใช่เกณฑ์หรือคำรับรอง';
const minTh = m => m < 60 ? `${m} นาที` : `${+(m / 60).toFixed(1)} ชม.`.replace('.0 ', ' ');
export const timeTh = ([a, b]) => (a < 60 && b <= 60) ? `${a}–${b} นาที` : `${minTh(a)}–${minTh(b)}`.replace(/ ชม\.–/, '–');
