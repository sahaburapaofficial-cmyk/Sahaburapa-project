// SBP AirCare — BOQ sheet for purchasing (design B · Engineering Sheet) — Rev.35 (owner 6 ต.ค. 2569: "A B C เป็นการพัฒนาจาก
// ต้นฉบับเดิมให้แตกออกมาให้ดีกว่าเดิมที่สุด เพิ่มลูกเล่นต่าง ๆ")
// B was drawn as an engineering set for building / purchasing teams. This sheet shows the visitor's quotation the way a purchasing
// file needs it — item no. · Pricebook code · description · unit · quantity · unit price · amount, then trip / visit charge,
// before VAT, VAT 7 %, total — live as lines are added anywhere on the site, and copies as a table that pastes straight into
// Excel / Google Sheets (tab-separated) or as plain text. Amounts are the same quoteTotals the quotation uses (one source);
// lines priced on site stay "ประเมินหน้างาน". A preliminary BOQ, not the formal quotation — said on the sheet.
import { h, baht, COMPANY } from './sbp-core.js';
import { cart, quoteTotals } from './commerce.js';
import { copyText } from './contact.js';

// the Pricebook code inside a quotation key (I-/IN-/A-/S- = install & add-on codes, P- = model), else a group label
export function lineCode(i) {
  const k = i.key || '', m = /^(?:IN|I|A|S)-(.+?)(?:-FIT)?$/.exec(k);
  if (m) return m[1];
  if (/^P-/.test(k)) return k.slice(2);
  return { clean: 'ล้าง', repair: 'ซ่อม/ตรวจ', contract: 'สัญญา', rush: 'คิวด่วน', install: 'ติดตั้ง', addon: 'งานเสริม', product: 'เครื่อง' }[i.group] || '—';
}
const unitOf = i => i.kind === 'product' ? 'ชุด' : i.group === 'contract' ? 'ปี' : i.group === 'clean' || i.group === 'install' ? 'เครื่อง' : 'รายการ';
/** rows of the sheet + totals (pure — tested) */
export function boqRows(items, zone) {
  const t = quoteTotals(items, zone);
  const rows = items.map((i, n) => ({ no: n + 1, code: lineCode(i), name: i.name + (i.detail ? ` (${i.detail})` : ''), unit: unitOf(i), qty: i.qty, rate: i.unitEx, amount: i.unitEx == null ? null : i.unitEx * i.qty }));
  return { rows, t };
}
export function boqTsv(items, zone) {
  const { rows, t } = boqRows(items, zone), n = v => v == null ? 'ประเมินหน้างาน' : String(v);
  const out = [['ลำดับ', 'รหัส', 'รายการ', 'หน่วย', 'จำนวน', 'ราคา/หน่วย (ก่อน VAT)', 'จำนวนเงิน (ก่อน VAT)'].join('\t'),
    ...rows.map(r => [r.no, r.code, r.name.replace(/\t/g, ' '), r.unit, r.qty, n(r.rate), n(r.amount)].join('\t'))];
  if (t.travel) out.push(['', '', t.travelLabel || 'ค่าเดินทาง', 'เที่ยว', 1, t.travel, t.travel].join('\t'));
  if (t.visit) out.push(['', '', t.visitLabel, 'ครั้ง', 1, t.visit, t.visit].join('\t'));
  out.push(['', '', 'รวมก่อน VAT', '', '', '', t.totalEx].join('\t'), ['', '', 'VAT 7%', '', '', '', t.vat].join('\t'), ['', '', 'รวมทั้งสิ้น', '', '', '', t.inc].join('\t'));
  return out.join('\n');
}

export function mountBoq(root, { openCart = () => {} } = {}) {
  const box = h('div', { class: 'bq' }), out = h('p', { class: 's-note bq-out', role: 'status' });
  root.append(box);
  function draw() {
    box.innerHTML = '';
    const { rows, t } = boqRows(cart.items, cart.zone);
    const head = h('div', { class: 'bq-h' }, h('div', {}, h('b', {}, 'BOQ เบื้องต้น · SBP AirCare'), h('small', {}, `${COMPANY.th} · ราคามาตรฐาน Pricebook 2569 ก่อน VAT`)),
      h('span', { class: 'bq-n' }, `${rows.length} รายการ`));
    if (!rows.length) { box.append(head, h('p', { class: 'bq-empty' }, 'ยังไม่มีรายการ — ใส่สัญญาตัวอย่าง ค่าบริการ หรือรุ่นแอร์ลงใบเสนอราคา แล้วตารางนี้จะเรียงเป็น BOQ ให้เอง')); return; }
    const money = v => v == null ? h('span', { class: 'bq-sv' }, 'ประเมินหน้างาน') : baht(v);
    const tb = h('table', { class: 'bq-t' },
      h('thead', {}, h('tr', {}, ['ลำดับ', 'รหัส', 'รายการ', 'หน่วย', 'จำนวน', 'ราคา/หน่วย', 'จำนวนเงิน'].map((x, k) => h('th', { scope: 'col', class: k >= 4 ? 'n' : '' }, x)))),
      h('tbody', {}, rows.map(r => h('tr', {}, h('td', { class: 'n' }, String(r.no)), h('td', { class: 'bq-c' }, r.code), h('td', {}, r.name), h('td', {}, r.unit), h('td', { class: 'n' }, String(r.qty)), h('td', { class: 'n' }, money(r.rate)), h('td', { class: 'n' }, money(r.amount))))),
      h('tfoot', {},
        t.travel ? h('tr', {}, h('td', { colspan: 6 }, t.travelLabel || 'ค่าเดินทาง'), h('td', { class: 'n' }, baht(t.travel))) : null,
        t.visit ? h('tr', {}, h('td', { colspan: 6 }, t.visitLabel), h('td', { class: 'n' }, baht(t.visit))) : null,
        h('tr', {}, h('td', { colspan: 6 }, 'รวมก่อน VAT'), h('td', { class: 'n' }, baht(t.totalEx))),
        h('tr', {}, h('td', { colspan: 6 }, 'VAT 7%'), h('td', { class: 'n' }, baht(t.vat))),
        h('tr', { class: 'bq-tot' }, h('td', { colspan: 6 }, 'รวมทั้งสิ้น'), h('td', { class: 'n' }, baht(t.inc)))));
    box.append(head, h('div', { class: 'bq-scroll', tabindex: '0', role: 'region', 'aria-label': 'ตาราง BOQ' }, tb),
      t.surveys ? h('p', { class: 's-note' }, `${t.surveys} รายการประเมินหน้างาน — ทีมแจ้งราคาในใบเสนอราคาอย่างเป็นทางการ`) : null,
      h('div', { class: 'bq-acts' },
        h('button', { type: 'button', class: 's-btn primary', onclick: async () => { out.textContent = (await copyText(boqTsv(cart.items, cart.zone))) ? 'คัดลอกตารางแล้ว — วางใน Excel / Google Sheets ได้ทันที (แยกคอลัมน์ให้เอง)' : 'คัดลอกไม่ได้ในหน้านี้ — เลือกตารางแล้วคัดลอกเอง'; } }, 'คัดลอกเป็นตาราง (Excel)'),
        h('button', { type: 'button', class: 's-btn ghost', onclick: openCart }, 'เปิดใบเสนอราคา / ส่งขอฉบับจริง')),
      out,
      h('p', { class: 's-note' }, 'BOQ เบื้องต้นจากรายการที่เลือกบนเว็บ ใช้ประกอบการตั้งงบ ไม่ใช่ใบเสนอราคาอย่างเป็นทางการ · ทีมขายออกใบเสนอราคาที่ลงนามได้เมื่อส่งคำขอ'));
  }
  cart.subs.add(draw); draw();
}
