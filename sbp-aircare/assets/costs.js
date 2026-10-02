// SBP AirCare — itemised installation cost — Rev.17 (owner 2 ต.ค. 2569: "วัสดุคงราคาจริง · ตรวจวิธีคำนวณราคาแบบแยกละเอียด ·
// แยกให้ชัดเจนเหมือนเป็น option ต่าง ๆ ให้เห็นว่าค่าใช้จ่ายยังไง")
//   · every line is a Pricebook line (before VAT) — nothing here invents or changes a price; materials keep their exact price
//   · packageParts(): what the installation package already includes, read from its own "รวม" text (so the page never
//     claims more than the Pricebook says)
//   · pipeBundle(): the per-metre "ชุดวัสดุส่วนเกินแบบเหมา" against the same metre bought line by line from the Pricebook
//     (copper pair + insulation for both pipes + trunking + 3 power cores + drain) — shows what the bundle covers and that it
//     costs less than the parts; no cost or margin figure ever reaches the browser (CLAUDE.md §6.6 rule 4)
//   · breakdown(): machine · package · each option (unit × qty = amount) · items assessed on site · before VAT · VAT · total
import { DATA, VAT, addonsFor } from './sbp-core.js';

const I = c => DATA.instByCode[c];
// copper pair + insulation sizes per pipe bundle (same pairs as the Pricebook's PIP-PKG names)
const PAIRS = { 'PIP-PKG-1438': ['1438', '3814', '3838', 'R75'], 'PIP-PKG-1412': ['1412', '3814', '3812', 'R75'], 'PIP-PKG-1458': ['1458', '3814', '3858', 'R75'],
  'PIP-PKG-3858': ['3858', '3838', '3858', 'R100'], 'PIP-PKG-3834': ['3834', '3838', '3834', 'R100'] };

/** what the package's own "รวม" text lists, one short line each */
export function packageParts(item) {
  if (!item || !item.inc) return [];
  return item.inc.split(/;\s*/).map(x => x.trim()).filter(x => x && !/ใช้เมื่อระบุใน QTN|ไม่รวมอัตโนมัติ/.test(x));
}

/** the per-metre bundle vs the same metre line by line (null when the Pricebook has no matching parts, e.g. 7/8") */
export function pipeBundle(pipeItem) {
  if (!pipeItem) return null;
  const p = PAIRS[pipeItem.code];
  if (!p) return { item: pipeItem, parts: null };
  const parts = [
    [I('MAT-CU-K22-' + p[0]), 1, 'ท่อทองแดงคู่'],
    [I('MAT-AERO-' + p[1]), 1, 'ฉนวนท่อเล็ก'],
    [I('MAT-AERO-' + p[2]), 1, 'ฉนวนท่อใหญ่'],
    [I('MAT-AIRPRO-' + p[3]), 1, 'รางครอบท่อ'],
    [I('ELE-YAZ-2.5'), 3, 'สายไฟ 3 เส้น'],
    [I('MAT-SCG-DRAIN-34'), 1, 'ท่อน้ำทิ้ง'],
  ];
  if (parts.some(([x]) => !x || x.ex == null)) return { item: pipeItem, parts: null };
  const sum = parts.reduce((n, [x, q]) => n + x.ex * q, 0);
  return { item: pipeItem, parts: parts.map(([x, q, th]) => ({ th, name: x.name, ex: x.ex, qty: q })), sum };
}

/** option notes that keep the customer from paying twice for what the package already has */
export function optionNote(code) {
  if (/^ELE-NANO-RCBO/.test(code)) return 'แพ็กเกจติดตั้งรวมเบรกเกอร์ 1 ตัวแล้ว — ใส่เพิ่มเมื่อต้องการวงจรใหม่อีกวงจร';
  if (/^ELE-MAIN-/.test(code)) return 'สายไฟระหว่างเครื่องรวมในแพ็กเกจแล้ว — รายการนี้คือเมนไฟจากตู้ไฟ (DB) ถึงจุดติดตั้ง';
  if (/^MAT-SCG-DRAIN-/.test(code)) return 'ท่อน้ำทิ้งตามแนวท่อน้ำยารวมในแพ็กเกจ / ชุดเหมาแล้ว — ใส่เฉพาะเส้นทางที่แยกไปจุดทิ้งอื่น';
  if (/^PIP-PKG-/.test(code)) return 'แพ็กเกจรวม 4 เมตรแรกแล้ว — ใส่เฉพาะส่วนที่เกิน';
  return '';
}

/**
 * lines: cart-style lines of one product drawer → grouped, itemised breakdown (before VAT)
 * → { groups: [{ th, rows: [{ name, unit, ex, qty, amount|null, note }] }], ex, vat, inc, assess }
 */
export function breakdown(lines) {
  const g = { product: { th: 'เครื่องปรับอากาศ', rows: [] }, install: { th: 'แพ็กเกจติดตั้ง', rows: [] }, addon: { th: 'ตัวเลือกเพิ่ม (วัสดุและงาน)', rows: [] }, survey: { th: 'ประเมินหน้างาน (แจ้งราคาก่อนทำ)', rows: [] } };
  lines.forEach(l => {
    const k = l.unitEx == null ? 'survey' : (g[l.group] ? l.group : 'addon');
    const code = (l.key || '').replace(/^[A-Z]+-/, '');
    g[k].rows.push({ name: l.name, unit: l.unit || '', ex: l.unitEx, qty: l.qty, amount: l.unitEx == null ? null : l.unitEx * l.qty, note: optionNote(code) });
  });
  const ex = lines.reduce((n, l) => n + (l.unitEx == null ? 0 : l.unitEx * l.qty), 0), vat = Math.round(ex * VAT);
  return { groups: Object.values(g).filter(x => x.rows.length), ex, vat, inc: ex + vat, assess: g.survey.rows.length };
}

export const pipeItemFor = (type, btu) => addonsFor(type, btu)[0].items[0].item;
