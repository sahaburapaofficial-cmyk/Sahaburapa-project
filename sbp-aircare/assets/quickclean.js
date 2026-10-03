// SBP AirCare — quick cleaning booking — Rev.11 (owner 2 ต.ค. 2569: "งานล้างเป็นหลัก · B2C และ B2B · ต้องสวยขึ้น ดีขึ้น ลื่นขึ้น")
// The home page leads with cleaning: three short steps — which air-cons (type · size · how many), how to clean (ล้างปกติ C1 /
// ล้างใหญ่ C2 · package), where and when — with a live total that follows the quotation rules exactly (commerce.quoteTotals:
// VAT, cleaning minimum per visit, travel by zone). The request goes through the normal quotation (cart → name/phone → send)
// or straight to LINE OA with the summary typed in. Rates come from the Pricebook (cleanRate, standard rate only); nothing
// here invents a price. Package names are shown in plain Thai first, the company's package name second.
// Rev.15: when — the queue rules of queue.js (book 3 days ahead · คิวด่วน earlier for +500 before VAT when a crew is free) with
// the visit time, the slot that fits it and same-day limits worked out for the customer.
import { SIZE_BANDS, cleanRate, checkZone, TIER_TH, travelNote, incVat, baht, h, $, $$, VOLUME_HINT, DATA, COMPANY } from './sbp-core.js';
import { cart, quoteTotals } from './commerce.js';
import { lineLink } from './contact.js';
import { typeArt } from './proto-ui.js';
import { judge, SLOTS, RUSH_FEE_EX, LEAD_DAYS, bkkNow, addDays, dateTh, fetchSlots, slotFree, isOpen } from './queue.js';
import { timeTh, TIME_NOTE } from './sbp-core.js';

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
  return rs.length ? (Math.min(...rs.map(r => r.rate.s))) : null;
}

export function mountQuickClean(root, { openCart = () => {}, onB2B } = {}) {
  if (!root) return null;
  const st = { n: { wall: 1, ceiling: 0, cassette: 0, floor: 0 }, size: { wall: 0, ceiling: 0, cassette: 0, floor: 0 }, level: 'C1', pkg: 'Basic Clean', zone: '', date: '', slot: '' };
  const today = bkkNow().date;
  let live = null; fetchSlots().then(d => { live = d; if (d) drawSum(); });
  const rushItem = () => ({ kind: 'service', group: 'rush', src: 'qc', fixed: true, key: 'QC-RUSH', name: 'คิวด่วน (ภายใน 3 วัน)', detail: 'ต่อการเข้างาน · รับเมื่อมีทีมว่าง ถ้าไม่มีคิวไม่เก็บค่านี้', unitEx: RUSH_FEE_EX, qty: 1 });

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
  const setDate = d => { st.date = d; dIn.value = d; drawSum(); };
  dIn.addEventListener('change', () => { st.date = dIn.value; drawSum(); });
  const when = h('div', { class: 'qc-when' });
  const s3 = h('div', { class: 'qc-where' }, h('label', { class: 's-field' }, 'พื้นที่หน้างาน', zIn), zOut, h('label', { class: 's-field' }, 'วันเข้างาน', dIn), when, h('p', { class: 'qc-hours' }, `เวลาทำการ ${COMPANY.hours}`));

  /* when: quick date chips · slot · what the date means (queue.js) */
  function drawWhen(ls, J) {
    when.innerHTML = '';
    const rushInc = baht(RUSH_FEE_EX);
    const chip = (d, t, sub) => h('button', { type: 'button', class: 'qc-chip' + (st.date === d ? ' on' : ''), 'aria-pressed': String(st.date === d), onclick: () => setDate(d) }, h('b', {}, t), h('small', {}, sub));
    when.append(h('div', { class: 'qc-chips', role: 'group', 'aria-label': 'เลือกวันเร็ว' },
      chip(today, 'วันนี้', `คิวด่วน +${rushInc}`), chip(addDays(today, 1), 'พรุ่งนี้', `คิวด่วน +${rushInc}`), chip(J.earliest, dateTh(J.earliest), 'เร็วสุดแบบจองปกติ')));
    if (J.slots.length) {
      const full = id => slotFree(live, st.date, id) === false;   // Rev.19: the live queue marks a full slot (still pickable: the message offers the nearest free day)
      if (!J.slots.includes(st.slot)) st.slot = J.slots.find(id => !full(id)) || J.slots[0];
      when.append(h('div', { class: 'qc-seg qc-slot', role: 'radiogroup', 'aria-label': 'ช่วงเวลา' }, J.slots.map(id => h('button', { type: 'button', role: 'radio', 'aria-checked': String(st.slot === id), class: (st.slot === id ? 'on' : '') + (full(id) ? ' full' : ''),
        onclick: () => { st.slot = id; drawSum(); } }, h('b', {}, SLOTS[id].th), h('small', {}, full(id) ? 'คิวเต็มแล้ว' : SLOTS[id].sub)))));
    } else st.slot = '';
    const msg = [];
    const tag = (k, t) => h('span', { class: 'qc-tag qc-tag-' + k }, t);
    if (J.kind === 'none') msg.push(h('p', {}, tag('info', 'จองปกติ'), `ล่วงหน้า ${LEAD_DAYS} วัน · เร็วสุด ${dateTh(J.earliest)} · ต้องการเร็วกว่านั้นเลือกคิวด่วน +${rushInc} ก่อน VAT (ต้องมีคิวว่าง)`));
    if (J.kind === 'past') msg.push(h('p', {}, tag('bad', 'วันที่ผ่านมาแล้ว'), 'เลือกวันนี้หรือวันถัดไป'));
    if (J.kind === 'normal') msg.push(h('p', {}, tag('ok', 'จองปกติ'), 'ทีมยืนยันคิวและเวลาเข้างานก่อนวันนัด'));
    if (J.kind === 'rush') msg.push(h('p', {}, tag('warn', 'คิวด่วน'), `+${rushInc} ก่อน VAT ต่อการเข้างาน · รับเมื่อมีทีมว่างเท่านั้น ทีมยืนยันคิวก่อน ถ้าไม่มีคิวไม่เก็บค่าคิวด่วน และเสนอวันที่ใกล้ที่สุดให้`));
    if (J.late) msg.push(h('p', {}, tag('bad', 'เวลาวันนี้ไม่พอ'), `งานนี้ใช้เวลาเกินเวลาทำการที่เหลือของวันนี้ ส่วนที่เลย ${COMPANY.open.to} น. เป็นงานนอกเวลา มีค่าใช้จ่ายเพิ่มเติม (ทีมแจ้งในใบเสนอราคา) หรือเลือกพรุ่งนี้`));
    if (J.closed) msg.push(h('p', {}, tag('warn', 'วันหยุดบริษัท'), COMPANY.hoursNote));
    const free = st.date && st.slot ? slotFree(live, st.date, st.slot) : null;
    if (free === false) {
      let alt = ''; for (let i = 0, d = st.date; i < 21 && !alt; i++, d = addDays(d, 1)) if (d >= today && isOpen(d) && J.slots.some(s => slotFree(live, d, s) !== false) && !(d === st.date)) alt = d;
      msg.push(h('p', {}, tag('bad', 'คิวเต็ม'), 'ตารางคิวของทีมแสดงว่าช่วงนี้เต็มแล้ว', alt ? [' · ', h('button', { type: 'button', class: 'qc-alt', onclick: () => setDate(alt) }, `ว่างใกล้สุด ${dateTh(alt)}`)] : null));
    } else if (free === true) msg.push(h('p', {}, tag('ok', 'มีคิวว่าง'), 'ตามตารางคิวของทีม ณ ตอนนี้ (ทีมยืนยันอีกครั้ง)'));
    if (ls.length) {
      const f = J.fit, fitTh = f.kind === 'half' ? 'ใช้เวลาไม่เกินครึ่งวัน เลือกช่วงเช้าหรือบ่ายได้' : f.kind === 'day' ? 'ใช้เวลาประมาณ 1 วันทำการ' : `ประมาณ ${f.days} วันทำการสำหรับช่าง 1 ทีม ทีมอาจจัดช่างเพิ่มให้เสร็จเร็วขึ้น`;
      msg.push(h('p', { class: 'qc-time' }, h('b', {}, `เวลาหน้างานโดยประมาณ ${timeTh(J.time)}`), ` · ${fitTh}`, h('small', {}, TIME_NOTE)));
    }
    when.append(h('div', { class: 'qc-qmsg', 'aria-live': 'polite' }, msg));
  }

  /* ---------- summary ---------- */
  const sum = h('aside', { class: 'qc-sum', 'aria-label': 'สรุปราคา' });
  function summaryText(t) {
    return [`ขอจองล้างแอร์ · SBP AirCare`, ...lines().map(l => `• ${l.th} ${l.qty} เครื่อง (${sizeTh(l.t, SIZE_BANDS[st.size[l.t]])})`), `วิธีล้าง: ${LEVEL_TH[st.level].th} ${st.level} · ${PKG_TH[st.pkg].th}`,
      `พื้นที่: ${st.zone || '-'}`, st.date ? `วันเข้างาน: ${dateTh(st.date)} (${st.date})${st.slot ? ' · ' + SLOTS[st.slot].th : ''}${st.date < judge(st.date, [], st.level).earliest ? ` · คิวด่วน +${baht(RUSH_FEE_EX)} ก่อน VAT (ถ้ามีคิวว่าง)` : ''}` : null, t ? `ยอดประมาณการ ${baht(t.totalEx)} ก่อน VAT · รวม VAT 7% ${baht(t.inc)}` : null].filter(Boolean).join('\n');
  }
  function drawSum() {
    const ls = lines(), J = judge(st.date, ls.map(l => ({ t: l.t, qty: l.qty })), st.level), items = ls.map(l => l.item).filter(Boolean);
    if (J.rush && items.length) items.push(rushItem());
    drawWhen(ls, J);
    const zone = st.zone ? checkZone(st.zone) : null, t = quoteTotals(items, zone), units = ls.reduce((n, l) => n + l.qty, 0);
    zOut.textContent = !st.zone ? 'กรุงเทพฯ นนทบุรี ปทุมธานี สมุทรปราการ สมุทรสาคร ไม่มีค่าเดินทาง' : !zone ? 'พิมพ์ชื่อเขตหรืออำเภออย่างน้อย 2 ตัวอักษร' : `${(TIER_TH[zone.tier] || TIER_TH.unknown).th}${zone.province ? ' · ' + zone.province : ''}${zone.tier === 'extended' ? ' · ' + travelNote(zone) : ''}`;
    zOut.dataset.tier = zone ? zone.tier : '';
    sum.innerHTML = '';
    sum.append(h('p', { class: 'qc-sum-h' }, 'ราคาประมาณการ · ราคาต่อรายการก่อน VAT'));
    if (!units) { sum.append(h('p', { class: 'qc-empty' }, 'เลือกประเภทแอร์และจำนวนเครื่องในขั้นที่ 1')); return; }
    sum.append(h('ul', { class: 'qc-lines' }, ls.map(l => h('li', {}, h('span', {}, `${l.th} × ${l.qty}`, h('small', {}, sizeTh(l.t, SIZE_BANDS[st.size[l.t]]))), h('b', {}, l.item ? baht(l.item.unitEx * l.qty) : 'ประเมินหน้างาน')))));
    const row = (k, v, cls = '') => h('div', { class: 'qc-row ' + cls }, h('span', {}, k), h('b', {}, v));
    if (t.minGap) sum.append(row(`ปรับยอดขั้นต่ำงานล้างต่อการเข้าหน้างาน (${baht(DATA.minBill)})`, baht(t.minGap), 'warn'));
    // Rev.13: say what the minimum already covers — more units of the same kind at no extra cost (arithmetic on the shown prices)
    if (t.minGap) { const l0 = ls.find(l => l.item && l.item.unitEx > 0), extra = l0 ? Math.floor(t.minGap / l0.item.unitEx) : 0;
      if (extra > 0) sum.append(h('p', { class: 'qc-fill' }, h('span', {}, `เพิ่มแอร์${l0.th}ได้อีก ${extra} เครื่อง โดยยอดรวมยังเท่าเดิม`),
        h('button', { type: 'button', class: 'qc-fill-b', 'aria-label': `เพิ่มแอร์${l0.th} 1 เครื่อง`, onclick: () => { st.n[l0.t] = Math.min(99, st.n[l0.t] + 1); drawTypes(); drawSum(); } }, '+1 เครื่อง'))); }
    if (items.some(i => i.group === 'rush')) sum.append(row('คิวด่วน (ถ้ามีคิวว่าง)', baht(RUSH_FEE_EX), 'warn'));
    if (zone && zone.tier === 'extended') sum.append(row(t.travelWaived ? 'ค่าเดินทาง (ยกเว้นตามจำนวนเครื่อง)' : 'ค่าเดินทาง', t.travelWaived ? baht(0) : baht(t.travel)));
    sum.append(h('div', { class: 'qc-total' }, h('span', {}, 'รวมทั้งสิ้น', h('small', {}, `ก่อน VAT ${baht(t.totalEx)} · VAT 7% ${baht(t.vat)}`)), h('b', {}, baht(t.inc))));
    const notes = [];
    if (zone && zone.tier === 'out') notes.push('พื้นที่นี้เกินระยะรับงานรายเครื่อง ส่งข้อมูลได้ ทีมจะประเมินเป็นงานโครงการ');
    if (t.travelShort) notes.push(`พื้นที่นี้รับงานขั้นต่ำ ${t.travelShort + units} เครื่องต่อเที่ยว`);
    if (units >= VOLUME_HINT) notes.push('ตั้งแต่ 10 เครื่องขึ้นไป อาจได้อัตราพิเศษตามเงื่อนไขบริษัท ทีมขายยืนยันในใบเสนอราคา');
    if (st.date && J.kind !== 'past') notes.push(`วันเข้างาน ${dateTh(st.date)}${st.slot ? ' · ' + SLOTS[st.slot].th : ''}${J.rush ? ' · คิวด่วน' : ''}`);
    notes.push('ราคามาตรฐานจาก Pricebook 2569 · ทีมยืนยันราคาและคิวก่อนเข้างานทุกครั้ง');
    sum.append(h('ul', { class: 'qc-notes' }, notes.map(n => h('li', {}, n))));
    const send = h('button', { type: 'button', class: 's-btn primary qc-go', onclick: () => {
      cart.items = cart.items.filter(i => i.src !== 'qc'); items.forEach(i => cart.add({ ...i }));
      if (st.date && J.kind !== 'past') { cart.prefDate = st.date; cart.prefSlot = st.slot ? SLOTS[st.slot].th : ''; cart.saveDraft(); }   // the quotation form reads it every time it renders (no timing race)
      if (st.zone) cart.setZone(st.zone); else cart.save();
      openCart();
      requestAnimationFrame(() => { const n = document.getElementById('s-q-name'); if (!n) return; if (matchMedia('(pointer: coarse)').matches) n.scrollIntoView({ block: 'center' }); else n.focus({ preventScroll: true }); });   // Rev.14: on phones show the field without popping the keyboard over the totals
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
