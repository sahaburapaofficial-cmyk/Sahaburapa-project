// SBP AirCare — contact form topic + message, and askTeam() — Rev.09
// Every "ติดต่อสอบถาม" button (VRV / VRF, project work, FUJIVA, survey requests) scrolls to #quote with the topic pre-selected.
import { h, CONTACT_TOPICS, COMPANY } from './sbp-core.js';
// Rev.11: open a chat with the company's LINE OA with the text already typed in (LINE URL scheme oaMessage). Long summaries
// are cut so the link stays within what phones accept; the customer can still edit the message before sending.
export function lineLink(text = '') {
  const t = String(text).slice(0, 900);
  return `https://line.me/R/oaMessage/${encodeURIComponent(COMPANY.line)}/` + (t ? `?${encodeURIComponent(t)}` : '');
}
export function enhanceQuoteForm(form = document.getElementById('qform')) {
  if (!form || form.querySelector('.s-qtopic')) return;
  const sel = h('select', { id: 'q-topic', 'aria-label': 'เรื่องที่ต้องการติดต่อ' }, CONTACT_TOPICS.map(t => h('option', { value: t }, t)));
  const msg = h('textarea', { id: 'q-msg', 'aria-label': 'รายละเอียด', placeholder: 'รายละเอียดเพิ่มเติม เช่น ประเภทอาคาร จำนวนเครื่อง ช่วงเวลาที่สะดวก' });
  const btn = form.querySelector('button');
  form.insertBefore(h('label', { class: 'field s-qtopic' }, 'เรื่องที่ต้องการติดต่อ', sel), btn);
  form.insertBefore(h('label', { class: 'field s-qtopic' }, 'รายละเอียด', msg), btn);
}
export function askTeam(topic, message = '') {
  const form = document.getElementById('qform'); if (!form) return;
  enhanceQuoteForm(form);
  const sel = form.querySelector('#q-topic'), msg = form.querySelector('#q-msg');
  if (topic && sel) { if (![...sel.options].some(o => o.value === topic)) sel.append(h('option', { value: topic }, topic)); sel.value = topic; }
  if (message && msg && !msg.value.includes(message)) msg.value = (msg.value ? msg.value + '\n' : '') + message;
  const sec = document.getElementById('quote') || form;
  sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  form.classList.remove('s-qflash'); void form.offsetWidth; form.classList.add('s-qflash');
  setTimeout(() => form.querySelector('input,select,textarea')?.focus({ preventScroll: true }), 500);
}

/**
 * Rev.09 r5 (beta) — what happens after "ส่ง": the site has no backend yet, so it must not pretend the request reached the team.
 * handoffBox({ ref, title, text, subject }) shows the reference number, says plainly that nothing was sent, and gives the customer
 * the summary to copy and send (email shown as selectable text — mail links are unreliable inside an artifact) or the phone number.
 */
export async function copyText(text, ta) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { if (ta) { ta.focus(); ta.select(); } return false; }
}
export function handoffBox({ ref, title = 'สรุปคำขอของคุณ', text, subject = 'คำขอจากเว็บไซต์ SBP AirCare', note = 'ระบบช่วงทดลองยังไม่ส่งข้อมูลถึงทีมอัตโนมัติ กรุณาส่งสรุปนี้ให้เราทางอีเมล หรือโทรแจ้งเลขอ้างอิง ทีมจะติดต่อกลับเพื่อยืนยันราคาและนัดวัน' }) {
  const ta = h('textarea', { class: 's-hand-t', readonly: true, rows: Math.min(10, text.split('\n').length + 1), 'aria-label': 'สรุปคำขอสำหรับคัดลอก' }, text);
  const msg = h('p', { class: 's-hand-m', 'aria-live': 'polite' });
  const copyBtn = h('button', { type: 'button', class: 's-btn primary', onclick: async () => { msg.textContent = (await copyText(text, ta)) ? 'คัดลอกแล้ว วางในอีเมลหรือแชตได้เลย' : 'คัดลอกอัตโนมัติไม่ได้ ข้อความถูกเลือกไว้แล้ว กดคัดลอกจากเครื่องของคุณ'; } }, 'คัดลอกสรุป');
  const mail = h('a', { class: 's-btn ghost', href: `mailto:${COMPANY.email}?subject=${encodeURIComponent(subject + (ref ? ' · ' + ref : ''))}&body=${encodeURIComponent(text)}` }, 'เปิดอีเมลพร้อมข้อความ');
  const em = h('span', { class: 's-hand-sel' }, COMPANY.email);
  return h('div', { class: 's-hand', role: 'status' },
    h('p', { class: 's-hand-b' }, 'ช่วงทดลองใช้ (Beta)'),
    h('h3', {}, title, ref ? h('small', {}, ` · เลขอ้างอิง ${ref}`) : null),
    h('p', {}, note),
    ta, h('div', { class: 's-hand-act' }, copyBtn, h('a', { class: 's-btn ghost', href: lineLink(text), target: '_blank', rel: 'noopener' }, `ส่งทาง LINE ${COMPANY.line}`), mail), msg,
    h('dl', { class: 's-hand-c' }, h('dt', {}, 'อีเมล'), h('dd', {}, em, h('button', { type: 'button', class: 's-hand-x', onclick: async () => { msg.textContent = (await copyText(COMPANY.email)) ? 'คัดลอกอีเมลแล้ว' : 'เลือกอีเมลแล้วคัดลอกจากเครื่องของคุณ'; } }, 'คัดลอก')),
      h('dt', {}, 'โทร'), h('dd', {}, h('a', { href: COMPANY.telHref }, COMPANY.tel)),
      h('dt', {}, 'LINE'), h('dd', {}, h('a', { href: COMPANY.lineUrl, target: '_blank', rel: 'noopener' }, COMPANY.line))));
}
