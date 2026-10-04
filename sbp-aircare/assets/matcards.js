// SBP AirCare — material spec cards with animated cut-aways ("4D": the part doing its job over time) — Rev.26
// (owner 4 ต.ค. 2569: "ภาพวัสดุและอื่น ๆ ทำเป็น 4D แบบสมจริงกว่านี้ ดึงรูปของจริงมาทำให้เห็นเป็น Visual รู้เลยว่าแต่ละยี่ห้อของจริงเป็นแบบไหน
// สเปกอะไรบ้าง")
//   · specs = matdata.MATS only (the same text as the 3D showroom and the install packages) — nothing new is claimed
//   · photos: MAT_PHOTOS maps a material id to an official product photo in assets/materials/ — fill ONLY with photos the brand owner
//     allows (CLAUDE.md §6.6 rule 14: no downloaded or imitated brand photos / logos). Empty = the drawn cut-away alone
//   · each cut-away animates what the customer cannot see after installation (wall thickness under pressure, condensation with and
//     without insulation, the trunk lid closing, current in the three cores, water running down the slope, vibration absorbed, the
//     RCBO tripping on a 30 mA leak) — CSS animation, still under prefers-reduced-motion
import { h } from './sbp-core.js';
import { MATS } from './matdata.js';

export const MAT_PHOTOS = {};   // e.g. { copper: 'assets/materials/o-two.webp' } — official photos with permission only
// what the customer can check on site (from the spec text: printed brand, thickness, colours, slope, test button)
export const CHECK = {
  copper: ['ดูยี่ห้อและขนาดที่พิมพ์บนท่อหรือกล่อง', 'ความหนาผนังท่อ 0.70 มม. ตามแพ็กเกจ', 'แฟลร์เรียบ ไม่มีรอยร้าวก่อนขันแฟลร์นัต'],
  insul: ['ชื่อยี่ห้อพิมพ์บนผิวฉนวน', 'หุ้มทั้งท่อเล็กและท่อใหญ่ ไม่เห็นทองแดงโผล่', 'รอยต่อฉนวนพันเทปปิดสนิท'],
  duct: ['รางและข้อต่อยี่ห้อเดียวกันทั้งชุด', 'ฝาปิดสนิทตลอดแนว มีฝาปิดปลายและฝาครอบผนัง', 'แนวรางตรง ไม่บิดเอียง'],
  cable: ['สีสาย น้ำตาล (ไฟ) ฟ้า (นิวทรัล) เขียวแถบเหลือง (ดิน)', 'ขนาดสายพิมพ์บนเปลือกตรงกับใบเสนอราคา', 'มีสายดินต่อถึงตัวเครื่อง'],
  drain: ['ท่อ PVC สีฟ้าตลอดแนว', 'แนวท่อลาดลงไม่ตกท้องช้าง', 'ทดสอบเทน้ำ น้ำไหลออกปลายท่อ'],
  mount: ['ยางรองกันสั่นทุกจุดที่วางเครื่อง', 'เครื่องได้ระดับ ยึดแน่นไม่โยก', 'เว้นระยะหลังเครื่องให้ลมระบาย'],
  rcbo: ['แยกวงจรแอร์ มีป้ายบอกที่ตู้ไฟ', 'ค่าตัดไฟรั่ว 30 mA พิมพ์บนตัวเบรกเกอร์', 'กดปุ่ม TEST แล้วเบรกเกอร์ตัด'],
};

// animated cut-aways (viewBox 0 0 240 140); classes animate in shared.css (.mc-*)
const ART = {
  copper: `<circle cx="120" cy="70" r="46" class="mc-cu"/><circle cx="120" cy="70" r="38" class="mc-in"/>
    <g class="mc-press">${[0, 60, 120, 180, 240, 300].map(a => `<line x1="120" y1="70" x2="${120 + 26 * Math.cos(a * Math.PI / 180)}" y2="${70 + 26 * Math.sin(a * Math.PI / 180)}"/>`).join('')}</g>
    <line x1="166" y1="70" x2="190" y2="40" class="mc-dim"/><text x="234" y="34" class="mc-t" style="text-anchor:end">ผนัง 0.70 มม.</text><text x="120" y="132" class="mc-t c">แรงดันน้ำยาดันผนังท่อ</text>`,
  insul: `<g transform="translate(62 62)"><circle r="16" class="mc-cu"/><circle r="11" class="mc-in"/>${[0, 1, 2, 3, 4].map(i => `<circle class="mc-drop" cx="${-12 + i * 6}" cy="18" r="3" style="animation-delay:${i * 0.4}s"/>`).join('')}<text y="58" class="mc-t c">ไม่หุ้มฉนวน</text></g>
    <g transform="translate(172 62)"><circle r="34" class="mc-ins"/><circle r="16" class="mc-cu"/><circle r="11" class="mc-in"/><text y="58" class="mc-t c">หุ้ม EPDM 3/8"</text></g>`,
  duct: `<path d="M40 70 h160 v40 h-160 z" class="mc-rail"/><g class="mc-lid"><path d="M36 58 h168 v10 h-168 z" class="mc-rail lid"/></g>
    <circle cx="80" cy="92" r="9" class="mc-ins"/><circle cx="110" cy="92" r="7" class="mc-ins"/><circle cx="138" cy="94" r="6" class="mc-pvc"/><circle cx="160" cy="96" r="3.5" class="mc-brown"/><circle cx="170" cy="96" r="3.5" class="mc-blue"/><circle cx="180" cy="96" r="3.5" class="mc-gy"/>
    <text x="120" y="132" class="mc-t c">ฝารางปิดสนิท ท่อและสายอยู่ในราง</text>`,
  cable: `${[['mc-brown', 40], ['mc-blue', 70], ['mc-gy', 100]].map(([c, y]) => `<rect x="20" y="${y - 9}" width="200" height="18" rx="9" class="${c}"/><line x1="24" y1="${y}" x2="216" y2="${y}" class="mc-cur"/>`).join('')}
    <text x="120" y="132" class="mc-t c">ไฟ · นิวทรัล · ดิน แยกสีชัดเจน</text>`,
  drain: `<line x1="20" y1="40" x2="220" y2="96" class="mc-pipe"/><line x1="20" y1="40" x2="220" y2="96" class="mc-water"/><path d="M196 100 v14" class="mc-dim"/><text x="40" y="96" class="mc-t">ลาดลงตลอดแนว</text>
    ${[60, 120, 180].map(x => `<rect x="${x - 4}" y="${40 + (x - 20) * 0.28 - 12}" width="8" height="24" class="mc-clip"/>`).join('')}<text x="120" y="132" class="mc-t c">น้ำไหลออก ไม่ค้างในท่อ</text>`,
  mount: `<g class="mc-vib"><rect x="70" y="30" width="100" height="56" rx="4" class="mc-ou"/><circle cx="120" cy="58" r="20" class="mc-fan"/></g>
    <rect x="76" y="86" width="14" height="8" class="mc-rub"/><rect x="150" y="86" width="14" height="8" class="mc-rub"/><path d="M40 94 h160 M60 94 v30 M180 94 v30" class="mc-brk"/>
    <text x="120" y="134" class="mc-t c">ยางรองซับแรงสั่นก่อนถึงผนัง</text>`,
  rcbo: `<rect x="86" y="18" width="68" height="100" rx="6" class="mc-rc"/><rect x="108" y="40" width="24" height="34" rx="4" class="mc-sw"/><rect class="mc-tog" x="111" y="43" width="18" height="14" rx="3"/>
    <text x="120" y="96" class="mc-t c">30 mA</text><circle cx="120" cy="108" r="5" class="mc-test"/><path d="M30 70 h50" class="mc-leak"/><text x="20" y="62" class="mc-t">ไฟรั่ว</text>
    <text x="120" y="136" class="mc-t c">ไฟรั่วถึงเกณฑ์ → ตัดไฟ</text>`,
};

export function mountMatCards(root) {
  if (!root) return null;
  const grid = h('div', { class: 'mc-grid' });
  MATS.forEach(m => {
    const art = h('div', { class: 'mc-art', 'aria-hidden': 'true' }); art.innerHTML = `<svg viewBox="0 0 240 140">${ART[m.id] || ''}</svg>`;
    const photo = MAT_PHOTOS[m.id] ? h('img', { class: 'mc-photo', src: MAT_PHOTOS[m.id], alt: `${m.brand} ${m.th}`, loading: 'lazy' }) : null;
    grid.append(h('article', { class: 'mc', 'data-m': m.id },
      photo || art, photo ? art : null,
      h('p', { class: 'mc-b' }, m.brand ? h('b', {}, m.brand) : h('b', {}, 'มาตรฐานงานของบริษัท'), h('span', {}, m.th)),
      h('p', { class: 'mc-s' }, m.spec),
      h('p', { class: 'mc-w' }, m.why),
      h('details', {}, h('summary', {}, 'ตรวจของจริงหน้างานอย่างไร'), h('ul', {}, (CHECK[m.id] || []).map(x => h('li', {}, x))))));
  });
  root.append(h('div', { class: 'mc-wrap' },
    h('div', { class: 'mc-head' }, h('h3', {}, 'วัสดุแต่ละยี่ห้อ ของจริงเป็นแบบไหน'), h('p', {}, 'ภาพตัดเคลื่อนไหวให้เห็นส่วนที่มองไม่เห็นหลังติดตั้ง · สเปกตามแพ็กเกจติดตั้งบนเว็บ · ชื่อยี่ห้อเป็นตัวอักษร (ใช้โลโก้และรูปสินค้าทางการเมื่อได้รับอนุญาตจากเจ้าของแบรนด์)')),
    grid));
  return { grid };
}
