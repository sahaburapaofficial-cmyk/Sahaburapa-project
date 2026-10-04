// SBP AirCare — "อาการแอร์ยอดฮิต · เรียกช่างให้ถูกจุด" section — Rev.21 (owner 3 ต.ค. 2569: "ข้อมูลปัญหาและอาการยอดฮิตของแอร์
// เช่น น้ำไหล แอร์เปิดไม่ติด แอร์ไม่เย็น แอร์เป็นน้ำแข็ง และอื่น ๆ เพื่อคำตอบว่าต้องเรียกช่างไปซ่อมถูกจุด")
//   · the same triage as the assistant (acdiag.js + triageCard): pick or type a symptom → normal / safe checks → tap answers →
//     likely faulty point, kind of work, Pricebook lines → book a technician with the result attached to the booking
//   · the "call now, stop using it" list stays visible: breaker trips again, burning smell or smoke, water near electrics
import { h } from './sbp-core.js';
import { SYMPTOMS, symptom, matchSymptoms } from './acdiag.js';
import { triageCard, bookDiag } from './acbot.js';
import { symAnim } from './animicons.js';   // Rev.26 animated illustration per symptom

export function mountSymptomGuide(root, { openCart, start = 'warm' } = {}) {
  if (!root) return null;
  const to = id => { location.hash = '#' + id; };
  const act = { book: r => bookDiag(r, openCart), clean: () => to('book'), standards: () => to('standards'), room: () => to(document.getElementById('studio') ? 'studio' : 'room') };
  const main = h('div', { class: 'sg-main', 'aria-live': 'polite' });
  const items = new Map();
  const list = h('div', { class: 'sg-list', role: 'group', 'aria-label': 'เลือกอาการ' }, SYMPTOMS.map(s => {
    const b = h('button', { type: 'button', class: 'sg-it', 'aria-pressed': 'false', 'data-sym': s.id, onclick: () => pick(s.id, true) }, symAnim(s.id, 'mini'), h('span', {}, s.short));
    items.set(s.id, b); return b;
  }));
  const hint = h('p', { class: 'sg-hint', 'aria-live': 'polite' });
  const q = h('input', { id: 'sg-q', type: 'search', class: 'sg-in', autocomplete: 'off', placeholder: 'พิมพ์อาการ เช่น น้ำไหล เปิดไม่ติด', 'aria-label': 'ค้นหาอาการแอร์' });
  q.addEventListener('input', () => {
    const v = q.value.trim(); if (!v) { hint.textContent = ''; return; }
    const m = matchSymptoms(v, 3);
    if (m.length) { pick(m[0].id); hint.textContent = m.length > 1 ? `ใกล้เคียง: ${m.slice(1).map(s => s.short).join(', ')}` : ''; }
    else hint.textContent = 'ยังไม่พบอาการนี้ ลองเลือกจากรายการ หรือส่งรายละเอียดทาง LINE';
  });
  const side = h('div', { class: 'sg-side' },
    h('label', { class: 'sg-search', for: 'sg-q' }, h('span', {}, 'ค้นหาอาการ'), q), hint, list,
    h('div', { class: 'sg-urgent' }, h('b', {}, 'ปิดเบรกเกอร์และแจ้งทีมทันที ถ้า'),
      h('ul', {}, h('li', {}, 'เบรกเกอร์แอร์ตัดซ้ำหลังยกขึ้น 1 ครั้ง'), h('li', {}, 'มีกลิ่นไหม้ ควัน หรือรอยดำที่ปลั๊ก / จุดต่อ'), h('li', {}, 'น้ำหยดใกล้ปลั๊กหรืออุปกรณ์ไฟฟ้า'))));
  let cur = null;
  function pick(id, focus) {
    const s = symptom(id); if (!s || cur === id) return;
    cur = id; items.forEach((b, k) => b.setAttribute('aria-pressed', String(k === id)));
    main.innerHTML = ''; main.append(...[symAnim(id, 'big')].filter(Boolean), triageCard(s, act, { wide: true }));
    if (focus && matchMedia('(max-width: 900px)').matches) main.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  root.append(h('div', { class: 'sg' }, side, main));
  pick(start);
  return { pick };
}
