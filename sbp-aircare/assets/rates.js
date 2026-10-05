// SBP AirCare — standard rates decided for Pricebook lines that had no rate — Rev.27 (owner 5 ต.ค. 2569: "ผมให้คุณตัดสินใจเลย
// โดยอ้างอิงข้อมูลราคากลางได้ และใช้เป็นเรทนั้น ๆ แต่ละงาน")
//   · applied on top of sbp-data.json in loadData() — the Pricebook mirror itself is untouched (tools_recon.py stays 1:1 with the
//     Excel files); the sales team copies these rates into the Pricebook Excel at its next update (CLAUDE.md §6.6 rule 26)
//   · how each rate was set: (m) Thai market reference prices published in 2569 · (c) the company's own Pricebook rate for the same
//     work in another sheet (repair ↔ install) · (k) composite of rates already published (removal + standard installation)
//   · lines whose cost depends on the part, the design or the project (compressor / coil / inverter board, VRF, AHU, ducted
//     connections, scaffolding, cranes, permits, documents, out-of-hours) keep "ประเมินหน้างาน" — there is no meaningful market rate
//   · all amounts before VAT, service rates in whole hundreds (rule 1a), fixed baht — never a percentage (rule 4)
// No imports: sbp-core.js reads this module while it loads the data.

/** inst code → { ex, how, note } */
export const DECIDED = {
  // removal — includes pump-down (refrigerant blocked back into the outdoor unit), disconnecting, capping the pipe ends, lowering the
  // units; excludes carrying the unit away (DISPOSE), work above 3 m, repairing the wall (m: 9–18k 800–1,500 · 18–24k 1,000 ·
  // 20–36k 1,200–2,500 · a national retailer's removal 750 / set)
  'REM-W': { ex: 1000, how: 'm', note: 'รวมเก็บน้ำยากลับคอยล์ร้อน ปลดท่อ ปิดปลายท่อ และยกเครื่องลง' },
  'REM-C': { ex: 1800, how: 'm', note: 'รวมเก็บน้ำยากลับคอยล์ร้อน ปลดท่อ ปิดปลายท่อ และยกเครื่องลง' },
  'REM-K': { ex: 2500, how: 'm', note: 'รวมเก็บน้ำยา ถอดหน้ากาก ปลดท่อและท่อน้ำทิ้ง ยกเครื่องลงจากฝ้า (ไม่รวมงานซ่อมฝ้า)' },
  'REM-FS': { ex: 2000, how: 'm', note: 'รวมเก็บน้ำยากลับคอยล์ร้อน ปลดท่อ ปิดปลายท่อ' },
  // pump-down alone (the unit stays, e.g. before renovation or painting) and carrying the old unit away
  'REF-PUMPDOWN': { ex: 500, how: 'm', note: 'เก็บน้ำยากลับคอยล์ร้อนโดยเครื่องอยู่ที่เดิม เช่น ก่อนรีโนเวทหรือทาสี (ถ้ารื้อเครื่อง รวมอยู่ในค่ารื้อแล้ว)' },
  'DISPOSE': { ex: 500, how: 'm', note: 'ขนเครื่องเดิมออกจากพื้นที่ต่อเครื่อง (m: ค่าขนย้าย/ค่ารถ 300–1,000)' },
  // the same work the Pricebook already prices in the repair sheet
  'REF-R22': { ex: 3000, how: 'c', note: 'เท่ากับค่าเติม R22 ส่วนเกินต่อ kg ในตารางซ่อม' },
  'REF-R32': { ex: 2100, how: 'c', note: 'เท่ากับค่าเติม R32/R410A ส่วนเกินต่อ kg ในตารางซ่อม' },
  'REF-R410A': { ex: 2100, how: 'c', note: 'เท่ากับค่าเติม R32/R410A ส่วนเกินต่อ kg ในตารางซ่อม' },
  'REF-VAC': { ex: 2400, how: 'c', note: 'เท่ากับ Vacuum ระบบ / ไล่ความชื้น ในตารางซ่อม' },
  'REF-LEAK': { ex: 2200, how: 'c', note: 'เท่ากับตรวจรั่วด้วยไนโตรเจน ในตารางซ่อม' },
  'ELE-PHASE': { ex: 2800, how: 'c', note: 'เท่ากับเปลี่ยน Phase Protector ในตารางซ่อม' },
  // core drill through a concrete wall for the pipes (m: 3" 400 · 5" 600 per hole)
  'CIV-CORE': { ex: 600, how: 'm', note: 'รูเดินท่อแอร์ผ่านผนังคอนกรีต ขนาดไม่เกิน 5 นิ้ว พร้อมเก็บฝุ่น' },
};
// relocation = removal + standard installation at the new spot, per type and size band of the published installation table (k)
export const MOVE = { W: 'REM-W', C: 'REM-C', K: 'REM-K', FS: 'REM-FS' };
export const MOVE_TH = { W: 'ติดผนัง', C: 'แขวนใต้ฝ้า', K: 'สี่ทิศทาง', FS: 'ตู้ตั้งพื้น' };
// the Pricebook's single relocation lines are replaced on the web by the per-size rows above
export const MOVE_REPLACES = ['MOVE-W', 'MOVE-C', 'MOVE-K'];

/** a technician visit with small work only (no cleaning, installation, repair or contract line): items count toward this minimum,
 *  the difference is charged as the visit charge (m: an inspection visit of 1,000 waived once repaired · the company's own wall
 *  diagnosis visit 900 · cost of one trip of a two-person in-house crew with van, fuel and parking ≈ 1,000) */
export const SMALL_VISIT = { minEx: 1000, th: 'ค่าเข้างานขั้นต่ำ (งานย่อย)' };

export const RATE_SOURCES = [
  'ราคาถอด / ย้ายแอร์ปี 2569 ของร้านแอร์ที่ประกาศบนเว็บ (ถอดแอร์ 9,000–18,000 BTU 800–1,500 · 18,000–24,000 BTU 1,000 · 20,000–36,000 BTU 1,200–2,500 · ย้ายพร้อมติดตั้ง 3,500–6,500)',
  'ร้านค้าปลีกวัสดุและเครื่องใช้ไฟฟ้า: ค่ารื้อแอร์ 750 บาทต่อชุด',
  'ค่าเจาะคอริ่งผนัง/พื้นคอนกรีต 3 นิ้ว 400 · 5 นิ้ว 600 บาทต่อจุด',
  'ค่าตรวจเช็กเมื่อไม่ซ่อม 300–1,000 บาท (หลายร้านไม่เก็บถ้าซ่อมต่อ)',
  'ตาราง Pricebook ของบริษัทเอง (ตารางซ่อม) สำหรับงานเดียวกันที่ตารางติดตั้งยังว่าง',
];
export const RATE_DATE = '5 ต.ค. 2569';
