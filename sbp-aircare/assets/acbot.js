// SBP AirCare — "ถามอาการแอร์" automatic assistant — Rev.21 (owner 3 ต.ค. 2569: "ข้อมูลปัญหาและอาการยอดฮิตของแอร์ เช่น น้ำไหล
// แอร์เปิดไม่ติด แอร์ไม่เย็น แอร์เป็นน้ำแข็ง และอื่น ๆ เพื่อคำตอบว่าต้องเรียกช่างไปซ่อมถูกจุด")
//   · rule based, runs in the browser (no AI service, nothing typed leaves the page) — data + ranking live in acdiag.js
//   · per symptom: what is normal (not a fault) → what the owner can safely check → 2–4 tap questions → the likely faulty
//     points in order, the kind of work, what the technician checks, and the related Pricebook lines (before VAT)
//   · "จองช่างตรวจซ่อม" adds the diagnosis line for the AC type and sends the answers with the booking (cart.draft.diag) so the
//     technician arrives prepared; nothing is repaired before the customer approves the price (CLAUDE.md §6.6 rule 13)
//   · safety first: power off before touching the unit; never open electrical covers, never add refrigerant; burning smell = stop
//   · brand error codes differ → never guess a code's meaning; ask for a photo of the code and the model instead
import { COMPANY, h, baht } from './sbp-core.js';
import { cart } from './commerce.js';
import { DEFAULTS } from './ticket.js';
import { lineLink } from './contact.js';
import { SYMPTOMS, symptom, matchSymptoms, diagnose, diagLine } from './acdiag.js';

export const SAFETY = 'ปิดเครื่องและปิดเบรกเกอร์แอร์ก่อนจับตัวเครื่องทุกครั้ง ห้ามเปิดฝาครอบแผงไฟฟ้า และห้ามเติมน้ำยาแอร์เอง';
export const answer = matchSymptoms;
const LAST_TK = { 6: '6', 12: '12', old: '24' };   // triage "last cleaned" → job-ticket value
let uid = 0;
const mem = {};   // answers shared between symptoms in one visit (AC type, last cleaned)

/* the diagnosis visit goes into the quotation; the answers travel with the booking */
export function bookDiag(r, openCart) {
  const d = diagLine(r.type === 'big' ? 'big' : 'wall');
  if (d) {
    cart.items.filter(i => i.src === 'triage' && i.name !== d.name).forEach(i => cart.remove(i.id));   // AC type changed → swap the line
    if (!cart.items.some(i => i.key === `R-${d.name}`)) cart.add({ kind: 'service', group: 'repair', key: `R-${d.name}`, name: d.name, unitEx: d.rate.s, qty: 1, src: 'triage' });
  }
  const D = cart.draft, prev = D.ans.repair || {};
  D.ans.repair = { ...DEFAULTS.repair, ...prev, ...(r.sym.sym ? { sym: [r.sym.sym] } : {}), ...(LAST_TK[r.qaRaw.last] ? { last: LAST_TK[r.qaRaw.last] } : {}) };
  D.diag = { sym: r.sym.id, text: r.summary, urgent: r.urgent };
  cart.saveDraft();
  openCart && openCart();
}

/**
 * interactive card for one symptom — used by the assistant panel and the symptom guide section
 * act: { book(r), clean(), standards(), room() } — buttons call these
 */
export function triageCard(s, act = {}, { wide = false } = {}) {
  const n = ++uid, ans = {};
  s.q.forEach(q => { if (mem[q.id] && q.opts.some(o => o[0] === mem[q.id])) ans[q.id] = mem[q.id]; });
  const L = (cls, title, list, ol) => list.length ? h('div', { class: 'ab-sec ' + cls }, h('b', {}, title), h(ol ? 'ol' : 'ul', {}, list.map(x => h('li', {}, x)))) : null;
  const res = h('div', { class: 'ab-res', 'aria-live': 'polite' }), acts = h('div', { class: 'ab-acts' });
  const card = h('div', { class: 'ab-card' + (wide ? ' wide' : ''), 'data-sym': s.id }, h('p', { class: 'ab-t' }, s.th));
  const left = [L('n', 'อาจไม่ใช่อาการเสีย ถ้า', s.normal), L('d', 'ตรวจเองเบื้องต้นได้อย่างปลอดภัย', s.diy, true)].filter(Boolean);
  if (s.q.length) {
    const qs = h('div', { class: 'ab-qs' }, h('b', {}, `ยังไม่หาย? ตอบ ${s.q.length} ข้อ ให้ช่างไปถูกจุด`));
    s.q.forEach(q => {
      const id = `ab-q${n}-${q.id}`;
      const opts = h('div', { class: 'ab-opts', role: 'radiogroup', 'aria-labelledby': id });
      const draw = () => { opts.innerHTML = ''; q.opts.forEach(([v, th]) => { const on = ans[q.id] === v; opts.append(h('button', { type: 'button', class: 'ab-o' + (on ? ' on' : ''), role: 'radio', 'aria-checked': String(on), onclick: () => { ans[q.id] = v; if (q.id === 'type' || q.id === 'last') mem[q.id] = v; draw(); show(); } }, th)); }); };
      draw(); qs.append(h('div', { class: 'ab-q' }, h('p', { class: 'ab-ql', id }, q.th), opts));
    });
    left.push(qs);
  }
  // wide (the symptom guide section): checks + questions on the left, the result on the right
  if (wide) card.append(h('div', { class: 'ab-cols' }, h('div', { class: 'ab-col' }, ...left), h('div', { class: 'ab-col ab-col-r' }, res, acts)));
  else card.append(...left, res, acts);
  function show() {
    const r = diagnose(s.id, ans); r.qaRaw = { ...ans };
    res.innerHTML = ''; acts.innerHTML = '';
    if (s.id === 'care') {
      res.append(h('p', { class: 'ab-note' }, 'คอยล์ ใบพัด และถาดน้ำทิ้งควรให้ช่างล้างด้วยอุปกรณ์และน้ำยาที่เหมาะสม ทีมใช้น้ำยาที่มีเลขทะเบียน อย. ชนิดไม่กัดกร่อนฟินคอยล์ และคลุมกันเปื้อนทุกครั้ง'));
      acts.append(...[act.clean && h('button', { type: 'button', class: 's-btn primary', onclick: act.clean }, 'จองล้างแอร์'), act.standards && h('button', { type: 'button', class: 's-btn ghost', onclick: act.standards }, 'มาตรฐานงานล้างของเรา')].filter(Boolean));
      return;
    }
    if (r.urgent) res.append(h('p', { class: 'ab-urgent', role: 'alert' }, h('b', {}, 'เรื่องความปลอดภัยทางไฟฟ้า'), ` ปิดเบรกเกอร์แอร์ทิ้งไว้ ไม่เปิดใช้จนกว่าช่างตรวจ และโทร ${COMPANY.tel} เพื่อเร่งคิว`));
    const isNormal = r.top && r.top.id === 'normal';
    res.append(h('b', { class: 'ab-rh' }, r.answered ? 'จุดที่น่าจะเป็น (เรียงจากโอกาสมากไปน้อย)' : 'จุดที่พบบ่อยของอาการนี้'),
      h('ol', { class: 'ab-causes' }, r.causes.slice(0, 3).map(c => h('li', {}, h('span', {}, c.th), c.id === 'normal' ? null : h('small', {}, `งาน: ${c.team} · ช่างตรวจ: ${c.check}`)))));
    if (isNormal) res.append(h('p', { class: 'ab-note' }, 'จากคำตอบ อาการนี้น่าจะเป็นการทำงานปกติของเครื่อง ถ้ายังกังวล ส่งรูปหรือวิดีโอทาง LINE ให้ทีมดูก่อนได้'));
    // Pricebook lines of the two most likely points (standard rate before VAT, or assessed on site)
    const jobs = []; r.causes.slice(0, 2).forEach(c => c.jobs.forEach(j => { if (!jobs.some(x => x.name === j.name)) jobs.push(j); }));
    const d = diagLine(r.type === 'big' ? 'big' : 'wall');
    if (jobs.length && !isNormal) res.append(h('div', { class: 'ab-jobs' }, h('b', {}, 'รายการซ่อมที่อาจเกี่ยวข้อง · ราคามาตรฐาน (ก่อน VAT)'),
      h('ul', {}, jobs.slice(0, 5).map(j => h('li', {}, h('span', {}, j.name), h('b', {}, j.ex == null ? 'ประเมินหน้างาน' : baht(j.ex)))))));
    if (d && !isNormal) res.append(h('p', { class: 'ab-note' }, `ค่า${d.name} ${baht(d.rate.s)} ก่อน VAT · ช่างตรวจยืนยันจุดเสียก่อน แล้วแจ้งราคาให้อนุมัติ ไม่ซ่อมก่อนคุณอนุมัติ${r.type ? '' : ' · แอร์แขวน / สี่ทิศทาง / ฝังฝ้า เลือกประเภทด้านบน'}`));
    // Rev.24: big-ticket faults on an older unit → compare with trading it in (#tradein, the issue preselected)
    const big = !isNormal && r.causes.slice(0, 2).map(c => c.id).find(id => id === 'comp' || id === 'gas');
    if (big && document.getElementById('tradein')) res.append(h('p', { class: 'ab-note ab-ti' }, 'แอร์อายุ 7–10 ปีขึ้นไป งานคอมเพรสเซอร์หรือน้ำยารั่วอาจใกล้เคียงราคาเครื่องใหม่ ',
      h('button', { type: 'button', class: 's-btn ghost', onclick: () => { document.dispatchEvent(new CustomEvent('sbp:tradein', { detail: { issue: big === 'comp' ? 'comp' : 'leak' } })); document.getElementById('tradein').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } }, 'เทียบซ่อมกับเทิร์นเครื่องใหม่')));
    if (r.clean && !isNormal) res.append(h('p', { class: 'ab-cleanrec' }, h('b', {}, 'แนะนำล้างแอร์ก่อน'), ' อาการนี้มักเริ่มจากความสกปรกสะสม ถ้าล้างแล้วยังมีอาการ ช่างตรวจเพิ่มได้ในนัดเดียวกัน (แจ้งค่าตรวจก่อน)'));
    acts.append(...[
      act.book && h('button', { type: 'button', class: 's-btn primary ab-book', onclick: () => act.book(r) }, 'จองช่างตรวจซ่อม · ส่งผลประเมินไปด้วย'),
      r.clean && act.clean && h('button', { type: 'button', class: 's-btn', onclick: act.clean }, 'จองล้างแอร์'),
      (s.id === 'code' || isNormal) && h('a', { class: 's-btn', href: lineLink(`สอบถามอาการแอร์: ${s.th} · แนบรูป/วิดีโอและป้ายรุ่น`), target: '_blank', rel: 'noopener' }, 'ส่งรูปทาง LINE'),
      s.id === 'bill' && act.room && h('button', { type: 'button', class: 's-btn ghost', onclick: act.room }, 'เช็ก BTU และค่าไฟ'),
      h('a', { class: 's-btn ghost', href: COMPANY.telHref }, `โทร ${COMPANY.tel}`)].filter(Boolean));
  }
  show();
  return card;
}

export function mountAcBot({ openCart, go } = {}) {
  if (document.querySelector('.ab-fab')) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fab = h('button', { type: 'button', class: 'ab-fab', 'aria-label': 'ถามอาการแอร์ (ผู้ช่วยตอบอัตโนมัติ)', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'ab-panel' },
    h('span', { class: 'ab-ico', 'aria-hidden': 'true', html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.6v.4"/><path d="M12 16.8v.2"/></svg>' }),
    h('span', { class: 'ab-fl' }, 'ถามอาการแอร์'));
  const log = h('div', { class: 'ab-log', role: 'log', 'aria-live': 'polite', 'aria-label': 'บทสนทนา' });
  const inp = h('input', { id: 'ab-q', class: 'ab-in', type: 'text', autocomplete: 'off', placeholder: 'พิมพ์อาการ เช่น แอร์ไม่เย็น น้ำไหล เปิดไม่ติด', 'aria-label': 'พิมพ์อาการแอร์' });
  const form = h('form', { class: 'ab-form' }, inp, h('button', { type: 'submit', class: 'ab-send' }, 'ถาม'));
  const panel = h('div', { id: 'ab-panel', class: 'ab-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'ab-title', hidden: true },
    h('div', { class: 'ab-h' }, h('div', {}, h('b', { id: 'ab-title' }, 'ผู้ช่วยตรวจอาการแอร์'), h('small', {}, 'ตอบอัตโนมัติจากคำแนะนำมาตรฐาน · ทีมช่างตอบในเวลาทำการ')),
      h('button', { type: 'button', class: 'ab-x', 'aria-label': 'ปิดผู้ช่วย', onclick: () => toggle(false) }, '×')),
    log, form);
  document.body.append(fab, panel);

  const to = (...ids) => { toggle(false); const id = ids.find(x => document.getElementById(x)) || ids[0]; go ? go(id) : (location.hash = '#' + id); };
  const ACT = {
    book: r => { toggle(false); bookDiag(r, openCart); },
    clean: () => to('book'), standards: () => to('standards', 'quality'), room: () => to('studio', 'room'),
  };
  const chips = list => h('div', { class: 'ab-chips' }, list.map(s => h('button', { type: 'button', class: 'ab-chip', onclick: () => ask(s.short, [s]) }, s.short)));
  const msg = (who, ...kids) => { const m = h('div', { class: 'ab-m ab-' + who }, ...kids); log.append(m); return m; };
  function ask(q, forced) {
    const me = msg('me', h('p', {}, q));
    const hits = forced || matchSymptoms(q);
    const reply = () => {
      if (!hits.length) {
        msg('bot', h('p', {}, 'ยังไม่พบอาการที่ตรงกับข้อความนี้ เลือกอาการด้านล่าง หรือส่งรายละเอียดและรูปให้ทีมทาง LINE ทีมตอบในเวลาทำการ'), chips(SYMPTOMS),
          h('div', { class: 'ab-acts' }, h('a', { class: 's-btn', href: lineLink('สอบถามอาการแอร์ · แนบรูปและป้ายรุ่น'), target: '_blank', rel: 'noopener' }, 'ส่งรูปทาง LINE'), h('a', { class: 's-btn ghost', href: COMPANY.telHref }, `โทร ${COMPANY.tel}`)));
      } else {
        msg('bot', triageCard(hits[0], ACT));
        msg('bot', h('p', { class: 'ab-safe' }, SAFETY), h('div', { class: 'ab-more' }, h('small', {}, hits[1] ? 'หรือหมายถึงอาการนี้' : 'อาการอื่น'), chips(hits[1] ? hits.slice(1) : SYMPTOMS.filter(s => s !== hits[0]).slice(0, 6))));
      }
      log.scrollTo({ top: me.offsetTop - 8, behavior: RM ? 'auto' : 'smooth' });   // the question at the top, its answer below
    };
    if (RM) reply(); else { const ty = msg('bot ab-typing', h('span'), h('span'), h('span')); setTimeout(() => { ty.remove(); reply(); }, 400); }
  }
  form.addEventListener('submit', e => { e.preventDefault(); const q = inp.value.trim(); if (!q) return; inp.value = ''; ask(q); });
  let started = false;
  function toggle(on) {
    panel.hidden = !on; fab.setAttribute('aria-expanded', String(on)); document.body.classList.toggle('ab-open', on);
    if (on && !started) { started = true; msg('bot', h('p', {}, 'เลือกหรือพิมพ์อาการ ผู้ช่วยบอกวิธีตรวจเบื้องต้น ถามสั้น ๆ ไม่เกิน 5 ข้อ แล้วชี้จุดที่น่าจะเสียพร้อมราคามาตรฐาน เพื่อให้ช่างเตรียมอุปกรณ์และอะไหล่ไปถูกจุด'), chips(SYMPTOMS), h('p', { class: 'ab-safe' }, SAFETY)); }
    if (on) inp.focus({ preventScroll: true }); else fab.focus({ preventScroll: true });
  }
  fab.addEventListener('click', () => toggle(panel.hidden));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
  return {
    open: q => { toggle(true); if (q) ask(q); },
    openSym: id => { const s = symptom(id); toggle(true); if (s) ask(s.short, [s]); },
    close: () => toggle(false), answer, act: ACT,
  };
}
