// SBP AirCare — "ส่งรูปหน้างานให้ทีมประเมิน" — Rev.13 (owner 2 ต.ค. 2569: "แก้ painpoint ที่เจ้าอื่นๆ ไม่มี เพื่อลดปัญหา
// ต้องเรียกช่างไปดูหน้างาน … เอาข้อมูลที่ละเอียดมาเสนอ"). A guided photo / video / measuring checklist per job, so the team can
// price most of the work before anyone travels; the customer sends the shots in the LINE OA chat with a prefilled message
// that carries a reference number and the checklist. Nothing is uploaded to the website (no storage, no personal data kept);
// when the photos are not enough the team asks for a site visit — the page says so, it promises no quote without one.
// Items are general good practice for Thai split-type work (not a company form) — reviewed by the head technician like CLEAN_HOW.
import { h, COMPANY } from './sbp-core.js';
import { lineLink } from './contact.js';

const KIND = { photo: 'ภาพ', video: 'วิดีโอสั้น', measure: 'วัด', note: 'ข้อมูล' };
export const SURVEY = {
  install: {
    th: 'ติดตั้งใหม่ / ย้ายแอร์', lead: 'ทีมใช้ประเมินขนาดเครื่อง ความยาวท่อ เส้นทางราง สายไฟ และอุปกรณ์ที่ต้องใช้',
    items: [
      ['photo', 'ผนังที่จะติดคอยล์เย็นทั้งผนัง', 'ยืนห่าง ๆ ให้เห็นเพดาน ปลั๊ก หน้าต่าง และเฟอร์นิเจอร์ใกล้ ๆ'],
      ['photo', 'ที่วางคอยล์ร้อน', 'ระเบียง ผนังนอกอาคาร หรือดาดฟ้า และทางที่ช่างเข้าไปถึง'],
      ['measure', 'ระยะจากคอยล์เย็นถึงคอยล์ร้อน', 'วัดตามแนวที่ท่อจะเดินโดยประมาณ (เมตร) — ใช้คำนวณท่อส่วนเกินจากแพ็กเกจ'],
      ['measure', 'ความสูงจากพื้นถึงฝ้า', 'ถ่ายตลับเมตรให้เห็นตัวเลข'],
      ['photo', 'ตู้ไฟ / เบรกเกอร์หลัก', 'เปิดฝาให้เห็นช่องว่างสำหรับเบรกเกอร์แยกวงจร'],
      ['photo', 'จุดระบายน้ำทิ้งที่ใกล้ที่สุด', 'ท่อระบายน้ำ ระเบียง หรือรางน้ำ'],
      ['photo', 'ป้ายรุ่นเครื่องเดิม (ถ้าย้ายแอร์)', 'ทั้งคอยล์เย็นและคอยล์ร้อน'],
    ],
  },
  clean: {
    th: 'ล้างแอร์', lead: 'ทีมใช้ยืนยันประเภท ขนาด จำนวนเครื่อง และเตรียมบันได / อุปกรณ์ให้ตรงหน้างาน',
    items: [
      ['photo', 'ป้ายรุ่นบนตัวเครื่อง', 'ให้อ่านรุ่นและ BTU ได้ (ด้านข้างหรือใต้ฝาหน้า)'],
      ['photo', 'ตัวเครื่องเต็มตัว + ความสูงจากพื้น', 'ทีมดูว่าใช้บันไดหรือนั่งร้าน และพื้นที่วางอุปกรณ์ใต้เครื่อง'],
      ['photo', 'คอยล์ร้อน', 'ตำแหน่งและทางเข้าถึง (ระเบียง ผนังสูง ดาดฟ้า)'],
      ['video', 'อาการที่พบ (ถ้ามี)', 'น้ำหยด กลิ่นอับ ลมเบา เสียงดัง'],
      ['photo', 'ที่จอดรถ / ลิฟต์ขนของ', 'สำหรับคอนโดและอาคาร — ทีมจองล่วงหน้าได้'],
    ],
  },
  repair: {
    th: 'แอร์มีปัญหา / ซ่อม', lead: 'ทีมใช้คัดอาการเบื้องต้นและเตรียมอะไหล่ที่น่าจะต้องใช้ — ราคาจริงยืนยันหลังตรวจ และไม่ซ่อมก่อนลูกค้าอนุมัติ',
    items: [
      ['photo', 'ป้ายรุ่นคอยล์เย็นและคอยล์ร้อน', 'รุ่น ขนาด และปีผลิต (ถ้ามี)'],
      ['video', 'ไฟกะพริบ / รหัสบนจอ', 'ถ่ายจอหรือไฟสถานะให้เห็นจังหวะการกะพริบ'],
      ['video', 'อาการ', 'เสียง น้ำหยด ลมไม่เย็น — ถ่ายตอนเครื่องเปิดอยู่'],
      ['video', 'คอยล์ร้อนขณะเปิดเครื่อง', 'พัดลมหมุนไหม มีเสียงคอมเพรสเซอร์ไหม'],
      ['note', 'ประวัติเครื่อง', 'อายุเครื่องโดยประมาณ ล้างล่าสุดเมื่อไร เคยซ่อมอะไร (พิมพ์ในแชตได้)'],
    ],
  },
};

const ref = () => 'P' + Date.now().toString().slice(-7);
function message(job, r) {
  const S = SURVEY[job];
  return [`ส่งรูปหน้างานให้ทีมประเมิน · ${S.th} · เลขอ้างอิง ${r}`, 'จะส่งรูป/วิดีโอตามรายการนี้:',
    ...S.items.map(([k, t], i) => `${i + 1}. [${KIND[k]}] ${t}`), 'พื้นที่ (เขต/อำเภอ): ', 'ชื่อ / เบอร์ติดต่อ: '].join('\n');
}

/** mountRemoteSurvey(root, { job }) — job: 'install' | 'clean' | 'repair' */
export function mountRemoteSurvey(root, { job = 'install' } = {}) {
  if (!root) return null;
  let cur = job;
  const tabs = h('div', { class: 'sv2-tabs', role: 'radiogroup', 'aria-label': 'งานที่ต้องการ' });
  const body = h('div', { class: 'sv2-body', 'aria-live': 'polite' });
  function draw() {
    tabs.innerHTML = ''; body.innerHTML = '';
    Object.entries(SURVEY).forEach(([k, S]) => tabs.append(h('button', { type: 'button', role: 'radio', 'aria-checked': k === cur, onclick: () => { cur = k; draw(); } }, S.th)));
    const S = SURVEY[cur], r = ref();
    body.append(h('p', { class: 'sv2-lead' }, S.lead),
      h('ol', { class: 'sv2-list' }, S.items.map(([k, t, d]) => h('li', {}, h('span', { class: 'sv2-k k-' + k }, KIND[k]), h('b', {}, t), h('small', {}, d)))),
      h('div', { class: 'sv2-act' },
        h('a', { class: 's-btn primary', href: lineLink(message(cur, r)), target: '_blank', rel: 'noopener' }, `ส่งรูปทาง LINE ${COMPANY.line}`),
        h('span', { class: 'sv2-ref' }, `เลขอ้างอิง ${r}`)),
      h('p', { class: 's-note' }, 'กดแล้วจะเปิดแชต LINE ของบริษัทพร้อมข้อความรายการนี้ แนบรูปและวิดีโอต่อในแชตได้เลย · เว็บไซต์ไม่ได้เก็บรูปของคุณ · ถ้าข้อมูลยังไม่พอประเมิน ทีมจะแจ้งขอนัดดูหน้างาน'));
  }
  root.append(h('div', { class: 'sv2' },
    h('div', { class: 'sv2-head' }, h('p', { class: 'sv2-eyebrow' }, 'ลดการนัดสำรวจ'), h('h3', {}, 'ส่งรูปหน้างานให้ทีมประเมินก่อน'),
      h('p', {}, 'ถ่ายตามรายการด้านล่างแล้วส่งทาง LINE ทีมประเมินขอบเขตงาน วัสดุ และราคาเบื้องต้นจากรูป ช่วยลดการนัดดูหน้างานก่อนเริ่มงาน')),
    tabs, body));
  draw();
  return { setJob(j) { if (SURVEY[j]) { cur = j; draw(); } } };
}
