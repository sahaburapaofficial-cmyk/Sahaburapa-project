// SBP AirCare — "ถามอาการแอร์" automatic assistant — Rev.20 (owner 3 ต.ค. 2569: "เพิ่มปัญหายอดฮิตที่ลูกค้าจะสงสัยเป็น auto chatbot
// ไว้สำหรับพิมพ์ถามว่าอาการแอร์มีปัญหา common หลัก ๆ มีอะไรบ้าง ต้องเรียกช่างไหม หรือซ่อมเองเบื้องต้นได้โดยลองวิธีที่เป็นมาตรฐาน")
//   · rule based, runs in the browser (no AI service, nothing typed leaves the page)
//   · every answer: likely causes → what the owner can safely check (the "before you call service" steps every maker's manual
//     lists: mode / temperature, filter, breaker, remote batteries, outdoor unit clear) → when to call the team → book / LINE / call
//   · safety first: power off before touching the unit; never open electrical covers, never add refrigerant; burning smell = stop
//   · brand error codes differ → never guess a code's meaning; ask for a photo of the code and the model instead
import { COMPANY, DATA, h } from './sbp-core.js';
import { cart } from './commerce.js';
import { lineLink } from './contact.js';

const SAFETY = 'ปิดเครื่องและปิดเบรกเกอร์แอร์ก่อนจับตัวเครื่องทุกครั้ง ห้ามเปิดฝาครอบแผงไฟฟ้า และห้ามเติมน้ำยาแอร์เอง';
export const TOPICS = [
  { id: 'warm', th: 'แอร์ไม่เย็น / เย็นน้อย มีแต่ลม', keys: ['ไม่เย็น', 'เย็นน้อย', 'มีแต่ลม', 'ลมไม่เย็น', 'ไม่ค่อยเย็น', 'ร้อน', 'อุ่น'],
    cause: ['ตั้งโหมดหรืออุณหภูมิไม่ถูก (เช่น อยู่โหมดพัดลม)', 'แผ่นกรองอากาศอุดตัน ลมผ่านคอยล์เย็นได้น้อย', 'คอยล์ร้อนระบายความร้อนไม่ได้ เพราะฝุ่นจับหรือมีของบัง', 'คอยล์เย็นสกปรกสะสม', 'น้ำยาแอร์ไม่พอจากจุดรั่ว หรืออุปกรณ์ไฟฟ้า เช่น คาปาซิเตอร์ ผิดปกติ'],
    diy: ['ตรวจรีโมทว่าอยู่โหมดเย็น (Cool) ตั้ง 25–26°C และความแรงลมไม่ต่ำสุด', 'ปิดเครื่อง ปิดเบรกเกอร์ ถอดแผ่นกรองล้างด้วยน้ำเปล่า ผึ่งให้แห้งในที่ร่มแล้วใส่กลับ', 'ดูคอยล์ร้อนว่าพัดลมหมุน และไม่มีของวางบังรอบเครื่องอย่างน้อย 30 ซม.', 'ปิดประตูหน้าต่าง ลดแหล่งความร้อนในห้อง แล้วรอ 20–30 นาที'],
    call: ['ล้างแผ่นกรองแล้วยังไม่เย็นภายใน 30 นาที', 'คอยล์ร้อนไม่ทำงาน หรือเครื่องตัดต่อถี่', 'มีน้ำแข็งเกาะท่อหรือคอยล์', 'ไม่ได้ล้างโดยช่างเกิน 6–12 เดือน'], cta: ['repair', 'clean'] },
  { id: 'drip', th: 'น้ำหยดจากตัวเครื่องในห้อง', keys: ['น้ำหยด', 'น้ำรั่ว', 'น้ำไหล', 'น้ำซึม', 'หยด', 'รั่วซึม', 'น้ำออก'],
    cause: ['ท่อน้ำทิ้งหรือถาดน้ำทิ้งอุดตันจากฝุ่นและเมือก', 'แผ่นกรองหรือคอยล์สกปรกจนเกิดน้ำแข็ง แล้วละลายล้นถาด', 'ตัวเครื่องเอียง หรือแนวท่อน้ำทิ้งไม่มีความลาดเอียง', 'ฉนวนหุ้มท่อชำรุด ทำให้มีหยดน้ำเกาะท่อ'],
    diy: ['ปิดเครื่อง วางภาชนะรองน้ำ เช็ดน้ำให้แห้ง โดยเฉพาะใกล้ปลั๊กไฟ', 'ล้างแผ่นกรองอากาศ', 'ตรวจปลายท่อน้ำทิ้งด้านนอกว่าไม่หัก ไม่ถูกทับ และไม่จุ่มน้ำ'],
    call: ['น้ำยังหยดต่อเนื่องหลังล้างแผ่นกรอง', 'น้ำหยดใกล้ปลั๊กหรืออุปกรณ์ไฟฟ้า (ปิดเบรกเกอร์ก่อน)', 'เพิ่งติดตั้งหรือเพิ่งย้ายเครื่อง'], cta: ['clean', 'repair'] },
  { id: 'ice', th: 'น้ำแข็งเกาะคอยล์ / ท่อ', keys: ['น้ำแข็ง', 'เกล็ด', 'ฟรีซ', 'เป็นน้ำแข็ง', 'แข็งตัว'],
    cause: ['แผ่นกรองหรือคอยล์อุดตัน ลมผ่านน้อย', 'พัดลมคอยล์เย็นหมุนช้าหรือใบพัดสกปรก', 'น้ำยาแอร์ไม่พอ'],
    diy: ['เปลี่ยนเป็นโหมดพัดลม (Fan) จนน้ำแข็งละลายหมด', 'ปิดเครื่อง ปิดเบรกเกอร์ แล้วล้างแผ่นกรอง'],
    call: ['น้ำแข็งกลับมาเกาะอีก มักเกี่ยวกับน้ำยาหรือพัดลม ต้องวัดค่าด้วยเครื่องมือ'], cta: ['repair'] },
  { id: 'smell', th: 'มีกลิ่นอับ กลิ่นเหม็น หรือกลิ่นไหม้', keys: ['กลิ่น', 'เหม็น', 'อับ', 'เปรี้ยว', 'ไหม้', 'ควัน', 'คาว'],
    cause: ['คราบสกปรกและเชื้อราสะสมที่คอยล์ ใบพัด และถาดน้ำทิ้ง', 'มีน้ำขังในถาดหรือท่อน้ำทิ้ง', 'กลิ่นไหม้หรือควัน: ระบบไฟฟ้าหรือมอเตอร์ผิดปกติ'],
    diy: ['กลิ่นไหม้หรือมีควัน: ปิดเครื่องและปิดเบรกเกอร์ทันที ห้ามเปิดใช้ต่อ', 'กลิ่นอับ: ล้างแผ่นกรอง และเปิดโหมดพัดลม 15–30 นาทีก่อนปิดเครื่องเพื่อไล่ความชื้น'],
    call: ['กลิ่นไหม้หรือควัน (ให้ทีมตรวจก่อนใช้งานต่อ)', 'กลิ่นอับไม่หายหลังล้างแผ่นกรอง ควรล้างใหญ่'], cta: ['repair', 'clean'] },
  { id: 'noise', th: 'เสียงดัง / เครื่องสั่น', keys: ['เสียง', 'ดัง', 'สั่น', 'แกร๊ก', 'หวีด', 'ครืด', 'กึก', 'แตก'],
    cause: ['หน้ากากหรือฝาครอบประกอบไม่เข้าที่', 'ใบพัดสกปรกจนเสียสมดุล หรือชำรุด', 'ขาแขวนหรือยางรองคอยล์ร้อนเสื่อม', 'มอเตอร์พัดลมหรือคอมเพรสเซอร์สึกหรอ'],
    diy: ['ตรวจว่าไม่มีของสัมผัสตัวเครื่อง และหน้ากากปิดสนิท', 'สังเกตว่าเสียงมาจากตัวในห้องหรือคอยล์ร้อน และเกิดตอนไหน'],
    call: ['เสียงโลหะเสียดสี เสียงดังเปรี๊ยะ หรือสั่นแรงขึ้นเรื่อย ๆ', 'มีเสียงดังพร้อมไม่เย็น'], cta: ['repair'] },
  { id: 'dead', th: 'เปิดไม่ติด / รีโมทกดไม่ติด', keys: ['รีโมท', 'กดไม่ติด', 'เปิดไม่ติด', 'ไม่ติด', 'ไม่ทำงาน', 'ดับ', 'ไม่มีไฟ', 'ไม่ตอบสนอง'],
    cause: ['ถ่านรีโมทหมด หรือรีโมทอยู่ไกล/มีสิ่งบัง', 'เบรกเกอร์แอร์ตัด', 'ตั้งเวลาเปิด–ปิด (Timer) ไว้', 'ตัวรับสัญญาณหรือแผงวงจรผิดปกติ'],
    diy: ['เปลี่ยนถ่านรีโมท แล้วกดใกล้ตัวเครื่อง', 'ตรวจเบรกเกอร์แอร์ ถ้าตัด ยกขึ้นได้ 1 ครั้ง ถ้าตัดซ้ำห้ามยกอีก', 'ยกเลิกการตั้งเวลา', 'ใช้ปุ่มฉุกเฉินที่ตัวเครื่องตามคู่มือรุ่น (ถ้ามี)'],
    call: ['เบรกเกอร์ตัดซ้ำ', 'เบรกเกอร์ปกติแต่เครื่องไม่มีไฟเลย'], cta: ['repair'] },
  { id: 'code', th: 'ไฟกะพริบ / ขึ้นรหัสเตือน (Error)', keys: ['กะพริบ', 'กระพริบ', 'error', 'เออเร่อ', 'โค้ด', 'รหัส', 'ไฟเตือน', 'ไฟแดง', 'ไฟกระพริบ'],
    cause: ['ระบบป้องกันของเครื่องตรวจพบความผิดปกติ เช่น เซนเซอร์ แรงดันไฟ พัดลม หรือการสื่อสารระหว่างคอยล์เย็นกับคอยล์ร้อน', 'ความหมายของรหัสต่างกันตามยี่ห้อและรุ่น'],
    diy: ['จดรหัสหรือจำนวนครั้งที่ไฟกะพริบ ถ่ายรูปป้ายยี่ห้อและรุ่น', 'ปิดเครื่อง ปิดเบรกเกอร์ 5 นาที แล้วเปิดใหม่ 1 ครั้ง'],
    call: ['รหัสกลับมาอีก ส่งรูปรหัสและรุ่นทาง LINE ให้ทีมประเมินก่อนนัด'], cta: ['line', 'repair'] },
  { id: 'weak', th: 'ลมเบา / ลมออกน้อย', keys: ['ลมเบา', 'ลมน้อย', 'ลมออกน้อย', 'ไม่มีลม', 'ลมไม่แรง', 'ลมอ่อน'],
    cause: ['แผ่นกรองอุดตัน', 'ใบพัดกรงกระรอกมีคราบหนา', 'ตั้งความแรงลมต่ำ หรือบานสวิงค้าง'],
    diy: ['ตั้งความแรงลมสูงขึ้น และตรวจว่าบานสวิงขยับได้', 'ปิดเครื่อง ปิดเบรกเกอร์ ล้างแผ่นกรอง'],
    call: ['ลมยังเบาหลังล้างแผ่นกรอง ใบพัดและคอยล์ต้องล้างใหญ่'], cta: ['clean'] },
  { id: 'cycle', th: 'แอร์ตัดบ่อย / ติด ๆ ดับ ๆ', keys: ['ตัดบ่อย', 'ติดๆดับๆ', 'ติด ๆ ดับ ๆ', 'เดี๋ยวติด', 'ตัด', 'คอมตัด', 'ดับเอง'],
    cause: ['คอยล์ร้อนระบายความร้อนไม่ทัน (แดดจัด ลมร้อนวนกลับ ฝุ่นจับ)', 'แรงดันไฟตก', 'เซนเซอร์อุณหภูมิผิดปกติ', 'ขนาด BTU ไม่เหมาะกับห้อง'],
    diy: ['ตรวจรอบคอยล์ร้อนให้โล่ง ไม่อับลม ไม่มีลมร้อนจากเครื่องอื่นเป่าใส่', 'สังเกตว่าเกิดช่วงเวลาไหน และไฟในบ้านตกหรือไม่'],
    call: ['ยังตัดบ่อยแม้คอยล์ร้อนโล่ง'], cta: ['repair'] },
  { id: 'bill', th: 'ค่าไฟสูงผิดปกติ', keys: ['ค่าไฟ', 'กินไฟ', 'ไฟแพง', 'ประหยัดไฟ', 'ค่าไฟแพง'],
    cause: ['เครื่องสกปรกจึงทำงานหนักขึ้น', 'ตั้งอุณหภูมิต่ำเกินไป', 'ความเย็นรั่วออกจากห้อง หรือแดดส่องตรง', 'ขนาด BTU ไม่เหมาะกับห้อง', 'น้ำยาไม่พอ'],
    diy: ['ตั้ง 25–26°C และใช้คู่กับพัดลม', 'ล้างแผ่นกรองทุก 2–4 สัปดาห์', 'ปิดม่านช่วงแดดแรง ปิดประตูห้องให้สนิท'],
    call: ['ไม่ได้ล้างโดยช่างเกิน 6 เดือน', 'ค่าไฟสูงขึ้นทั้งที่ใช้งานเท่าเดิม'], cta: ['clean', 'room'] },
  { id: 'care', th: 'ควรล้างแอร์บ่อยแค่ไหน / ล้างเองได้ไหม', keys: ['ล้างเอง', 'บ่อยแค่ไหน', 'กี่เดือน', 'ควรล้าง', 'ล้างแอร์', 'ดูแล', 'น้ำยาล้าง'],
    cause: ['แผ่นกรองเป็นส่วนที่เจ้าของเครื่องล้างเองได้ ส่วนคอยล์ ใบพัด และถาดน้ำทิ้งควรให้ช่างล้างด้วยอุปกรณ์และน้ำยาที่เหมาะสม'],
    diy: ['ล้างแผ่นกรองเองทุก 2–4 สัปดาห์ (ห้องมีฝุ่นมากหรือมีสัตว์เลี้ยงบ่อยขึ้น)', 'ล้างโดยช่าง: บ้านทั่วไปประมาณทุก 6 เดือน ร้านค้าหรือพื้นที่ฝุ่นมากทุก 3–4 เดือน', 'ห้ามฉีดน้ำหรือสเปรย์เข้าแผงไฟฟ้าและมอเตอร์'],
    call: ['ต้องการล้างคอยล์และใบพัด: ทีมใช้น้ำยาที่มีเลขทะเบียน อย. ชนิดไม่กัดกร่อนฟินคอยล์ และคลุมกันเปื้อนทุกครั้ง'], cta: ['clean', 'standards'] },
];

const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
/** best topics for a question (score = matched keyword length), [] when nothing matches */
export function answer(q) {
  const k = norm(q); if (!k) return [];
  return TOPICS.map(t => ({ t, s: t.keys.reduce((n, w) => n + (k.includes(norm(w)) ? norm(w).length : 0), 0) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 2).map(x => x.t);
}

export function mountAcBot({ openCart, go } = {}) {
  if (document.querySelector('.ab-fab')) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fab = h('button', { type: 'button', class: 'ab-fab', 'aria-label': 'ถามอาการแอร์ (ผู้ช่วยตอบอัตโนมัติ)', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'ab-panel' },
    h('span', { class: 'ab-ico', 'aria-hidden': 'true', html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.6v.4"/><path d="M12 16.8v.2"/></svg>' }),
    h('span', { class: 'ab-fl' }, 'ถามอาการแอร์'));
  const log = h('div', { class: 'ab-log', role: 'log', 'aria-live': 'polite', 'aria-label': 'บทสนทนา' });
  const inp = h('input', { id: 'ab-q', class: 'ab-in', type: 'text', autocomplete: 'off', placeholder: 'พิมพ์อาการ เช่น แอร์ไม่เย็น น้ำหยด มีกลิ่น', 'aria-label': 'พิมพ์อาการแอร์' });
  const form = h('form', { class: 'ab-form' }, inp, h('button', { type: 'submit', class: 'ab-send' }, 'ถาม'));
  const panel = h('div', { id: 'ab-panel', class: 'ab-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'ab-title', hidden: true },
    h('div', { class: 'ab-h' }, h('div', {}, h('b', { id: 'ab-title' }, 'ผู้ช่วยตรวจอาการแอร์'), h('small', {}, 'ตอบอัตโนมัติจากคำแนะนำมาตรฐาน · ทีมช่างตอบในเวลาทำการ')),
      h('button', { type: 'button', class: 'ab-x', 'aria-label': 'ปิดผู้ช่วย', onclick: () => toggle(false) }, '×')),
    log, form);
  document.body.append(fab, panel);

  const chips = () => h('div', { class: 'ab-chips' }, TOPICS.map(t => h('button', { type: 'button', class: 'ab-chip', onclick: () => ask(t.th, [t]) }, t.th)));
  const msg = (who, ...kids) => { const m = h('div', { class: 'ab-m ab-' + who }, ...kids); log.append(m); log.scrollTop = log.scrollHeight; return m; };
  const to = (...ids) => { toggle(false); const id = ids.find(x => document.getElementById(x)) || ids[0]; go ? go(id) : (location.hash = '#' + id); };
  const diag = () => { const d = DATA.rep.find(r => r.cat === 'ตรวจวินิจฉัย' && r.rate.s != null); if (d && !cart.items.some(i => i.key === `R-${d.name}`)) cart.add({ kind: 'service', group: 'repair', key: `R-${d.name}`, name: d.name, unitEx: d.rate.s, qty: 1 }); toggle(false); openCart && openCart(); };
  const ACT = {
    repair: () => h('button', { type: 'button', class: 's-btn primary', onclick: diag }, 'จองช่างตรวจเช็ก'),
    clean: () => h('button', { type: 'button', class: 's-btn', onclick: () => to('book') }, 'จองล้างแอร์'),
    line: () => h('a', { class: 's-btn', href: lineLink('สอบถามอาการแอร์ · แนบรูปรหัสเตือนและป้ายรุ่น'), target: '_blank', rel: 'noopener' }, 'ส่งรูปทาง LINE'),
    room: () => h('button', { type: 'button', class: 's-btn ghost', onclick: () => to('studio', 'room') }, 'เช็ก BTU และค่าไฟ'),
    standards: () => h('button', { type: 'button', class: 's-btn ghost', onclick: () => to('standards', 'quality') }, 'มาตรฐานงานของเรา'),
  };
  function card(t) {
    const L = (cls, title, list, ol) => h('div', { class: 'ab-sec ' + cls }, h('b', {}, title), h(ol ? 'ol' : 'ul', {}, list.map(x => h('li', {}, x))));
    return h('div', { class: 'ab-card' }, h('p', { class: 'ab-t' }, t.th),
      L('c', 'สาเหตุที่พบบ่อย', t.cause), L('d', 'ตรวจเองเบื้องต้นได้อย่างปลอดภัย', t.diy, true), L('k', 'ควรให้ช่างตรวจเมื่อ', t.call),
      h('div', { class: 'ab-acts' }, [...t.cta.map(k => ACT[k] && ACT[k]()), h('a', { class: 's-btn ghost', href: COMPANY.telHref }, `โทร ${COMPANY.tel}`)]));
  }
  function ask(q, forced) {
    msg('me', h('p', {}, q));
    const hits = forced || answer(q);
    const reply = () => {
      if (!hits.length) { msg('bot', h('p', {}, 'ยังไม่พบหัวข้อที่ตรงกับคำถามนี้ เลือกหัวข้อด้านล่าง หรือส่งรายละเอียดและรูปให้ทีมทาง LINE ทีมตอบในเวลาทำการ'), chips(), h('div', { class: 'ab-acts' }, ACT.line(), h('a', { class: 's-btn ghost', href: COMPANY.telHref }, `โทร ${COMPANY.tel}`))); return; }
      hits.forEach(t => msg('bot', card(t)));
      msg('bot', h('p', { class: 'ab-safe' }, SAFETY));
    };
    if (RM) reply(); else { const ty = msg('bot ab-typing', h('span'), h('span'), h('span')); setTimeout(() => { ty.remove(); reply(); }, 450); }
  }
  form.addEventListener('submit', e => { e.preventDefault(); const q = inp.value.trim(); if (!q) return; inp.value = ''; ask(q); });
  let started = false;
  function toggle(on) {
    panel.hidden = !on; fab.setAttribute('aria-expanded', String(on)); document.body.classList.toggle('ab-open', on);
    if (on && !started) { started = true; msg('bot', h('p', {}, 'ผู้ช่วยนี้ตอบอาการแอร์ที่พบบ่อย พร้อมวิธีตรวจเบื้องต้นและคำแนะนำว่าเมื่อใดควรให้ช่างตรวจ พิมพ์อาการ หรือเลือกหัวข้อด้านล่าง'), chips(), h('p', { class: 'ab-safe' }, SAFETY)); }
    if (on) inp.focus({ preventScroll: true }); else fab.focus({ preventScroll: true });
  }
  fab.addEventListener('click', () => toggle(panel.hidden));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
  return { open: q => { toggle(true); if (q) ask(q); }, close: () => toggle(false), answer };
}
