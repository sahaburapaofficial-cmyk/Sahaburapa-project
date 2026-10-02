// SBP AirCare — quick cleaning booking — Rev.11 (owner 2 ต.ค. 2569: "งานล้างเป็นหลัก · B2C และ B2B · ต้องสวยขึ้น ดีขึ้น ลื่นขึ้น")
// The home page leads with cleaning: three short steps — which air-cons (type · size · how many), how to clean (ล้างปกติ C1 /
// ล้างใหญ่ C2 · package), where and when — with a live total that follows the quotation rules exactly (commerce.quoteTotals:
// VAT, cleaning minimum per visit, travel by zone). The request goes through the normal quotation (cart → name/phone → send)
// or straight to LINE OA with the summary typed in. Rates come from the Pricebook (cleanRate, standard rate only); nothing
// here invents a price. Package names are shown in plain Thai first, the company's package name second.
import { SIZE_BANDS, cleanRate, checkZone, TIER_TH, travelNote, incVat, baht, h, $, $$, VOLUME_HINT, DATA } from './sbp-core.js';
import { cart, quoteTotals } from './commerce.js';
import { lineLink } from './contact.js';
import { typeArt } from './proto-ui.js';

const TYPES_QC = [['wall', 'ติดผนัง', 'บ้าน คอนโด ห้องนอน'], ['ceiling', 'แขวนใต้ฝ้า', 'ร้านค้า สำนักงาน'], ['cassette', 'สี่ทิศทาง', 'คาเฟ่ ร้านอาหาร'], ['floor', 'ตู้ตั้งพื้น', 'ห้องประชุม โถง']];
export const PKG_TH = {
  'Basic Clean': { th: 'ล้างมาตรฐาน', sub: 'ใบรับมอบงาน · รับประกันงาน 30 วัน' },
  'Standard Care': { th: 'ล้างพร้อมรายงานภาพ', sub: 'รายงานพร้อมภาพก่อน–หลัง · รับประกัน 45 วัน' },
};
const LEVEL_TH = {
  C1: { th: 'ล้างปกติ', sub: 'ล้างที่ตำแหน่งเดิม ไม่ปลดเครื่อง เหมาะกับการล้างตามรอบ' },
  C2: { th: 'ล้างใหญ่', sub: 'ปลดคอยล์เย็นลงล้าง ถอดใบพัดและถาดน้ำทิ้ง เหมาะเมื่อมีกลิ่นอับหรือไม่ได้ล้างนาน' },
};
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sizesFor = t => SIZE_BANDS.filter(b => DATA.clean.some(r => r.type === t && r.range === (t === 'wall' ? b.wall : b.other) && r.rate.s != null));
const sizeNum = (t, b) => (t === 'wall' ? b.wall : b.other).replace('<=', '≤ ').replace('-', '–');
const sizeTh = (t, b) => `${sizeNum(t, b)} BTU`;

/** lowest standard per-unit cleaning price (incl. VAT) on the site — for "เริ่ม ฿…" lines in the heroes */
export function cleanFrom() {
  const rs = DATA.clean.filter(r => r.type && r.level === 'C1' && PKG_TH[r.pkg] && r.rate.s != null);
  return rs.length ? incVat(Math.min(...rs.map(r => r.rate.s))) : null;
}

export function mountQuickClean(root, { openCart = () => {}, onB2B } = {}) {
  if (!root) return null;
  const st = { n: { wall: 1, ceiling: 0, cassette: 0, floor: 0 }, size: { wall: 0, ceiling: 0, cassette: 0, floor: 0 }, level: 'C1', pkg: 'Basic Clean', zone: '', date: '' };
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const lines = () => TYPES_QC.filter(([t]) => st.n[t] > 0).map(([t, th]) => {
    const r = cleanRate(st.pkg, st.level, t, st.size[t]);
    return { t, th, r, qty: st.n[t], item: r && r.rate.s != null ? { kind: 'service', group: 'clean', src: 'qc', key: `QC-${st.pkg}-${st.level}-${t}-${st.size[t]}`, name: `${r.name} · ${LEVEL_TH[st.level].th} ${st.level}`, detail: `${PKG_TH[st.pkg].th} (${st.pkg}) · ${r.warranty || ''}`, unitEx: r.rate.s, qty: st.n[t] } : null };
  });

  /* ---------- step 1 · which air-cons ---------- */
  const s1 = h('div', { class: 'qc-types' });
  function drawTypes() {
    s1.innerHTML = '';
    TYPES_QC.forEach(([t, th, where]) => {
      const n = st.n[t], out = h('output', { 'aria-live': 'polite' }, String(n));
      const step = d => () => { st.n[t] = Math.max(0, Math.min(99, st.n[t] + d)); drawTypes(); drawSum(); };
      const sizes = sizesFor(t);
      const sel = h('select', { 'aria-label': `ขนาด ${th}`, onchange: e => { st.size[t] = +e.target.value; drawSum(); } }, sizes.map(b => h('option', { value: b.id, selected: b.id === st.size[t] }, sizeNum(t, b))));
      s1.append(h('div', { class: 'qc-type' + (n ? ' on' : '') },
        h('div', { class: 'qc-art', html: typeArt(t, 'qc-svg') }),
        h('div', { class: 'qc-tt' }, h('b', {}, th), h('small', {}, where)),
        h('div', { class: 'qc-stp' }, h('button', { type: 'button', 'aria-label': `ลด ${th}`, disabled: !n, onclick: step(-1) }, '−'), out, h('button', { type: 'button', 'aria-label': `เพิ่ม ${th}`, onclick: step(1) }, '+')),
        n ? h('label', { class: 'qc-size' }, h('span', {}, 'ขนาด (BTU)'), sel) : null));
    });
  }

  /* ---------- step 2 · how to clean ---------- */
  const seg = (opts, key) => h('div', { class: 'qc-seg', role: 'radiogroup' }, opts.map(([id, o]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(st[key] === id), class: st[key] === id ? 'on' : '',
    onclick: () => { st[key] = id; drawHow(); drawSum(); } }, h('b', {}, o.th), h('small', {}, o.sub))));
  const s2 = h('div', { class: 'qc-how' });
  function drawHow() {
    s2.innerHTML = '';
    s2.append(seg(Object.entries(LEVEL_TH), 'level'), seg(Object.entries(PKG_TH).map(([id, o]) => [id, { th: o.th, sub: `${id} · ${o.sub}` }]), 'pkg'));
  }

  /* ---------- step 3 · where and when ---------- */
  const zIn = h('input', { id: 'qc-zone', placeholder: 'เขต / อำเภอ เช่น บางขุนเทียน · บางพลี · ศรีราชา', autocomplete: 'off' });
  const zOut = h('p', { class: 'qc-zout', 'aria-live': 'polite' });
  const dIn = h('input', { id: 'qc-date', type: 'date', min: today });
  let zt; zIn.addEventListener('input', () => { clearTimeout(zt); zt = setTimeout(() => { st.zone = zIn.value.trim(); drawSum(); }, 250); });
  dIn.addEventListener('change', () => { st.date = dIn.value; drawSum(); });
  const s3 = h('div', { class: 'qc-where' }, h('label', { class: 's-field' }, 'พื้นที่หน้างาน', zIn), zOut, h('label', { class: 's-field' }, 'วันที่สะดวก (ทีมยืนยันคิวอีกครั้ง)', dIn));

  /* ---------- summary ---------- */
  const sum = h('aside', { class: 'qc-sum', 'aria-label': 'สรุปราคา' });
  function summaryText(t) {
    return [`ขอจองล้างแอร์ · SBP AirCare`, ...lines().map(l => `• ${l.th} ${l.qty} เครื่อง (${sizeTh(l.t, SIZE_BANDS[st.size[l.t]])})`), `วิธีล้าง: ${LEVEL_TH[st.level].th} ${st.level} · ${PKG_TH[st.pkg].th}`,
      `พื้นที่: ${st.zone || '-'}`, st.date ? `วันที่สะดวก: ${st.date}` : null, t ? `ยอดประมาณการ ${baht(t.inc)} รวม VAT` : null].filter(Boolean).join('\n');
  }
  function drawSum() {
    const ls = lines(), items = ls.map(l => l.item).filter(Boolean), zone = st.zone ? checkZone(st.zone) : null, t = quoteTotals(items, zone), units = ls.reduce((n, l) => n + l.qty, 0);
    zOut.textContent = !st.zone ? 'กรุงเทพฯ นนทบุรี ปทุมธานี สมุทรปราการ สมุทรสาคร ไม่มีค่าเดินทาง' : !zone ? 'พิมพ์ชื่อเขตหรืออำเภออย่างน้อย 2 ตัวอักษร' : `${(TIER_TH[zone.tier] || TIER_TH.unknown).th}${zone.province ? ' · ' + zone.province : ''}${zone.tier === 'extended' ? ' · ' + travelNote(zone) : ''}`;
    zOut.dataset.tier = zone ? zone.tier : '';
    sum.innerHTML = '';
    sum.append(h('p', { class: 'qc-sum-h' }, 'ราคาประมาณการ'));
    if (!units) { sum.append(h('p', { class: 'qc-empty' }, 'เลือกประเภทแอร์และจำนวนเครื่องในขั้นที่ 1')); return; }
    sum.append(h('ul', { class: 'qc-lines' }, ls.map(l => h('li', {}, h('span', {}, `${l.th} × ${l.qty}`, h('small', {}, sizeTh(l.t, SIZE_BANDS[st.size[l.t]]))), h('b', {}, l.item ? baht(incVat(l.item.unitEx * l.qty)) : 'ประเมินหน้างาน')))));
    const row = (k, v, cls = '') => h('div', { class: 'qc-row ' + cls }, h('span', {}, k), h('b', {}, v));
    if (t.minGap) sum.append(row(`ปรับยอดขั้นต่ำงานล้างต่อการเข้าหน้างาน (${baht(incVat(DATA.minBill))})`, baht(incVat(t.minGap)), 'warn'));
    if (zone && zone.tier === 'extended') sum.append(row(t.travelWaived ? 'ค่าเดินทาง (ยกเว้นตามจำนวนเครื่อง)' : 'ค่าเดินทาง', t.travelWaived ? baht(0) : baht(incVat(t.travel))));
    sum.append(h('div', { class: 'qc-total' }, h('span', {}, 'รวมทั้งสิ้น', h('small', {}, `ก่อน VAT ${baht(t.totalEx)} · VAT 7% ${baht(t.vat)}`)), h('b', {}, baht(t.inc))));
    const notes = [];
    if (zone && zone.tier === 'out') notes.push('พื้นที่นี้เกินระยะรับงานรายเครื่อง ส่งข้อมูลได้ ทีมจะประเมินเป็นงานโครงการ');
    if (t.travelShort) notes.push(`พื้นที่นี้รับงานขั้นต่ำ ${t.travelShort + units} เครื่องต่อเที่ยว`);
    if (units >= VOLUME_HINT) notes.push('ตั้งแต่ 10 เครื่องขึ้นไป อาจได้อัตราพิเศษตามเงื่อนไขบริษัท ทีมขายยืนยันในใบเสนอราคา');
    notes.push('ราคามาตรฐานจาก Pricebook 2569 · ทีมยืนยันราคาและคิวก่อนเข้างานทุกครั้ง');
    sum.append(h('ul', { class: 'qc-notes' }, notes.map(n => h('li', {}, n))));
    const send = h('button', { type: 'button', class: 's-btn primary qc-go', onclick: () => {
      cart.items = cart.items.filter(i => i.src !== 'qc'); items.forEach(i => cart.add({ ...i }));
      if (st.date) cart.prefDate = st.date;   // the quotation form reads it every time it renders (no timing race)
      if (st.zone) cart.setZone(st.zone); else cart.save();
      openCart();
      requestAnimationFrame(() => { const n = document.getElementById('s-q-name'); n && n.focus({ preventScroll: true }); });
    } }, 'จองล้างแอร์ · กรอกชื่อและเบอร์');
    const line = h('a', { class: 's-btn ghost qc-line', href: lineLink(summaryText(t)), target: '_blank', rel: 'noopener' }, 'ส่งทาง LINE');
    sum.append(h('div', { class: 'qc-acts' }, send, line));
    if (onB2B) sum.append(h('p', { class: 'qc-b2b' }, 'องค์กรหรืออาคารที่ต้องการล้างทั้งปี ', h('a', { href: '#b2b', onclick: e => { e.preventDefault(); onB2B(); } }, 'ประเมินสัญญาล้างรายปี')));
  }

  root.classList.add('qc');
  root.append(
    h('ol', { class: 'qc-steps' },
      h('li', { class: 'qc-step' }, h('p', { class: 'qc-n' }, h('span', {}, '1'), 'แอร์ของคุณ'), s1),
      h('li', { class: 'qc-step' }, h('p', { class: 'qc-n' }, h('span', {}, '2'), 'วิธีล้าง'), s2),
      h('li', { class: 'qc-step' }, h('p', { class: 'qc-n' }, h('span', {}, '3'), 'ที่ไหน · เมื่อไร'), s3)),
    sum);
  drawTypes(); drawHow(); drawSum();
  return { focus() { root.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); } };
}
