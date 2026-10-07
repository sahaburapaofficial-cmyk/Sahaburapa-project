#!/usr/bin/env node
// Rev.47 — export every table and constant the A · B · C pages use, exactly as the browser sees them after loadData()
// (service rates rounded up to the hundred, MASS / Type L hidden, K Copper → O-TWO, decided rates applied), for the developer
// hand-over: CSV files that open in Excel (UTF-8 with BOM) + one constants.json. No special / project rates exist in the public
// data (they are null) and none are written. node tools/export-data.mjs [out dir = data-export]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const OUT = new URL(`../${process.argv[2] || 'data-export'}/`, import.meta.url);
mkdirSync(OUT, { recursive: true });
globalThis.__SBP_DATA = JSON.parse(readFileSync(new URL('../assets/sbp-data.json', import.meta.url)));
globalThis.__SBP_ADDR = JSON.parse(readFileSync(new URL('../assets/th-address.json', import.meta.url)));
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.location = { pathname: '/a.html', hash: '', hostname: 'localhost' };
globalThis.Image = class { set src(v) {} };
const core = await import('../assets/sbp-core.js'); await core.loadData();
const R = await import('../assets/rates.js');
const { DATA, DEMO, TRAVEL, QUEUE_RULES, COMPANY, VAT, VOLUME_HINT, PRICING, JOB_TIME, TIME_NOTE } = core;

const cell = v => { if (v == null) return ''; const s = String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = (name, head, rows) => { writeFileSync(new URL(name, OUT), '﻿' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n'); return rows.length; };
const n = {};

// 1 products (705 approved models) — machine prices are Pricebook prices, not rounded
const brandName = id => (core.BRAND_BY_ID[id] || {}).name || id;
n.products = csv('products.csv',
  ['ประเภท', 'แบรนด์', 'ซีรีส์', 'รุ่น', 'BTU', 'Inverter', 'ราคาเครื่อง ก่อน VAT', 'ราคาติดตั้งมาตรฐาน ก่อน VAT (Pricebook)', 'ระบบ', 'น้ำยา', 'ท่อเล็ก', 'ท่อใหญ่', 'ขนาดคอยล์เย็น', 'นน.คอยล์เย็น', 'ขนาดคอยล์ร้อน', 'นน.คอยล์ร้อน', 'ไฟ', 'คอมเพรสเซอร์', 'รับประกันผู้ผลิต', 'ระยะส่งของ', 'รุ่นคอยล์ร้อน'],
  DEMO.models.flatMap(m => m.skus.map(s => [m.type, brandName(m.brand), m.series, s.sku, s.btu, m.inverter ? 'ใช่' : '', s.px, s.installStdEx, s.d.system, s.d.refrigerant, s.d.pipeLiquid, s.d.pipeGas, s.d.indoorDim, s.d.indoorKg, s.d.outdoorDim, s.d.outdoorKg, s.d.power, s.d.compressor, s.d.warranty, s.d.lead, s.d.outdoorModel])));

// 2 installation, add-ons, materials, removal / relocation (as shown on the web)
const how = { m: 'ราคากลางตลาด 2569 (rates.js)', c: 'อัตราบริษัทในตารางซ่อม (rates.js)', k: 'รื้อ + ติดตั้งมาตรฐาน (rates.js)' };
n.install = csv('install-and-materials.csv',
  ['รหัส', 'หมวด', 'รายการ', 'หน่วย', 'ราคาบนเว็บ ก่อน VAT', 'ที่มาของราคา', 'รวม', 'ไม่รวม', 'รับประกัน', 'ต้องสำรวจ'],
  DATA.inst.map(i => [i.code, i.cat, i.name, i.unit, i.ex, i.ex == null ? 'ประเมินหน้างาน' : i.decided ? how[i.decided] : /^INS-/.test(i.code) ? 'Pricebook ปัดขึ้นหลักร้อย' : 'Pricebook', i.inc, i.exc, i.warranty, i.survey]));

// 3 cleaning (3 packages × C1/C2 × type × size) — web rate = Pricebook rounded up to the hundred
n.clean = csv('cleaning.csv',
  ['แพ็กเกจ', 'ระดับ', 'ประเภท (Pricebook)', 'ประเภท (เว็บ)', 'ขนาด', 'รายการ', 'หน่วย', 'ราคาบนเว็บ ก่อน VAT', 'ราคา Pricebook ก่อน VAT', 'รับประกัน', 'การดูแล', 'เอกสาร', 'รวม', 'ไม่รวม', 'สถานะ'],
  DATA.clean.map(c => [c.pkg, c.level, c.ty, c.type, c.range, c.name, c.unit, c.rate.s, c.rate.pb, c.warranty, c.care, c.doc, c.inc, c.exc, c.status]));

// 4 repair (86)
n.repair = csv('repair.csv',
  ['หมวด', 'รายการ', 'หน่วย', 'ราคาบนเว็บ ก่อน VAT', 'ราคา Pricebook ก่อน VAT', 'รับประกัน', 'รวม', 'ไม่รวม', 'สถานะ'],
  DATA.rep.map(r => [r.cat, r.name, r.unit, r.rate.s ?? 'ประเมินหน้างาน', r.rate.pb, r.warranty, r.inc, r.exc, r.status]));

// 5 decided rates (rule 26)
n.decided = csv('decided-rates.csv', ['รหัส', 'ราคา ก่อน VAT', 'ที่มา', 'หมายเหตุ'],
  Object.entries(R.DECIDED).map(([k, d]) => [k, d.ex, how[d.how] || d.how, d.note]));

// 6 travel fee for every subdistrict in the address book (rule 9) — the same zoneOf() the booking form uses
n.travelBySubdistrict = csv('travel-by-subdistrict.csv', ['จังหวัด', 'เขต/อำเภอ', 'แขวง/ตำบล', 'รหัสไปรษณีย์', 'ระยะถนนโดยประมาณ กม.', 'โซน', 'ค่าเดินทาง ก่อน VAT'],
  core.ADDR.list.map(r => { const z = core.zoneOf({ p: r.p, d: r.d, s: r.s, z: r.z }); return [r.p, r.d, r.s, r.z, z && z.km, z && ({ core: 'พื้นที่หลัก', extended: 'นอกพื้นที่หลัก', out: 'งานโครงการ' }[z.tier] || z.tier), z && z.fee]; }));

// 7 every constant the pages print
const constants = {
  generated: new Date().toISOString(), data: DATA.version, note: 'ทุกจำนวนเงินก่อน VAT · VAT คิดครั้งเดียวที่ยอดรวม (CLAUDE.md §6.6)',
  VAT, minBill: DATA.minBill, travel: { ...TRAVEL, bands: undefined }, queue: QUEUE_RULES, smallVisit: R.SMALL_VISIT, volumeHint: VOLUME_HINT,
  crewUnitsPerTeamDay: PRICING && PRICING.unitsPerTeamDay, jobTime: JOB_TIME, timeNote: TIME_NOTE, company: COMPANY,
  rateSources: R.RATE_SOURCES, rateDate: R.RATE_DATE,
  counts: { products: n.products, brands: core.BRANDS.length, install: n.install, clean: n.clean, repair: n.repair },
};
try { const T = await import('../assets/tradein.js'); constants.tradeIn = T.TRADE_IN; } catch (e) { constants.tradeIn = 'see assets/tradein.js'; }
try { const F = await import('../assets/roomfit.js'); constants.fitRules = F.FIT_RULES; } catch (e) { constants.fitRules = 'see assets/roomfit.js'; }
try { const Q = await import('../assets/quickclean.js'); constants.cleanFrom = Q.cleanFrom(); } catch (e) { /* DOM-only module */ }
try { const D = await import('../assets/acdiag.js'); constants.diagnosis = { wall: D.diagLine('wall')?.rate?.s, big: D.diagLine('big')?.rate?.s }; constants.symptoms = D.SYMPTOMS.map(s => ({ id: s.id, th: s.th || s.t })); } catch (e) { /* optional */ }
writeFileSync(new URL('constants.json', OUT), JSON.stringify(constants, null, 2));
console.log(JSON.stringify(n));
