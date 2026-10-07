// SBP AirCare — the three services as customer journeys, for the second website (D · E · F) — Rev.38 (owner 6 ต.ค. 2569:
// "พัฒนา D E F ให้แบ่งสัดส่วนแบบลูกค้าใช้งาน workflow ชัดเจนทุกบริการ และเปิดตัวเข้าเว็บและรายละเอียดให้ชัดเจน พร้อมคิดการใช้บริการ
// ของลูกค้าแบบละเอียดพร้อมให้คำอธิบาย ให้ความหมายชัดเจน ทั้งบริการติดตั้ง บริการล้าง และซ่อม โดยให้ภาพประกอบและ animation ครบถ้วน")
//   mountDoors(root, { onPick })  — the entrance on the home page: three animated doors (ล้าง · ติดตั้ง · ซ่อม) — what each
//                                   service means, when you need it, how long it takes, where the price starts
//   mountPaths(root, { go, openCart, hooks }) → { show(service, step) } — the journey of one service from "I need it" to
//                                   "done and covered": six steps, each with an animated illustration, what happens, why, what
//                                   you get, and the button that does that step on this site
//   · every number comes from the shared constants (Pricebook rates, minimum bill, trip fee, queue rules, job time, warranty
//     text, step counts of the company forms) — nothing typed in here; times are estimates with TIME_NOTE (rule 22)
//   · no promise wording (rule 11) · repair never starts before the customer approves the price (rule 13)
//   · animations are CSS on inline SVG, run only while on screen (runWhenVisible), still under reduced motion
// Rev.39 (owner: "ภาพไม่สวยไม่เสมือนจริง เป็นเหมือนการ์ตูนยุคเก่า … ต้องการ high-tech / luxury / modern 3D … ข้อมูลจัดเรียงให้เป็นระเบียบ
// … สีสัน แสง การเคลื่อนไหวเวลาคลิก เวลาเลื่อน แบบไม่หวือหวา"): every door and step shows a rendered 3D still (vignette3d.js) in place
// of the line art (the line art stays underneath as the no-WebGL fallback and while the still renders) · key facts as chips · the
// still drifts slowly, a soft light sweeps it, it leans with the pointer/scroll and crossfades between steps (lux.css .pa-v*)
import { h, baht, DATA, TRAVEL, QUEUE_RULES, JOB_TIME, TIME_NOTE, timeTh, cleanRate, reduceMotion } from './sbp-core.js';
import { cleanFrom } from './quickclean.js';
import { cleanSteps, installSteps } from './services.js';
import { diagLine } from './acdiag.js';
import { FIT_RULES } from './roomfit.js';
import { runWhenVisible } from './animicons.js';
import { whenNear } from './lazy.js';
import { vignette, liveOK } from './vignette3d.js';
import { aiArt } from './aiart.js';
import { stillFor, artV } from './stills.js';

/* ---------------- illustrations (inline SVG, animated by lux.css .pa-*) ---------------- */
const U = (x, y, w = 70, cls = '') => `<g class="pa-u ${cls}" transform="translate(${x} ${y})"><rect class="pa-body" width="${w}" height="${w * 0.3}" rx="${w * 0.07}"/><rect class="pa-vent" x="${w * 0.08}" y="${w * 0.22}" width="${w * 0.84}" height="${w * 0.035}" rx="1"/><circle class="pa-led" cx="${w * 0.84}" cy="${w * 0.1}" r="${w * 0.022}"/></g>`;
const AIR = (x, y, n = 4, cls = 'pa-air') => Array.from({ length: n }, (_, i) => `<path class="${cls}" style="--i:${i}" d="M${x + i * 12} ${y} q6 14 -2 28 t2 26"/>`).join('');
const DROPS = (x, y, n = 6) => Array.from({ length: n }, (_, i) => `<circle class="pa-drop" style="--i:${i}" cx="${x + (i % 3) * 9 + (i > 2 ? 4 : 0)}" cy="${y}" r="2.2"/>`).join('');
const CHECK = (x, y, cls = 'pa-chk') => `<path class="${cls}" d="M${x} ${y} l7 7 l14 -16"/>`;
const svg = (body, vb = '0 0 160 110') => `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;

const DOOR = {
  clean: svg(`<rect class="pa-wall" x="0" y="0" width="240" height="150" rx="14"/>${U(70, 26, 100)}<path class="pa-bag" d="M66 60 h108 l-26 52 h-56 z"/>${DROPS(102, 64, 9)}<g class="pa-spark"><path d="M196 30 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/><path class="b" d="M40 40 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"/></g><path class="pa-hose" d="M200 150 C 200 110 170 90 150 92"/>`, '0 0 240 150'),
  install: svg(`<rect class="pa-wall" x="0" y="0" width="240" height="150" rx="14"/><rect class="pa-plate" x="74" y="34" width="92" height="10" rx="2"/><g class="pa-lift">${U(70, 28, 100)}</g><path class="pa-pipe" d="M168 52 H196 V150"/><path class="pa-trunk" d="M190 60 h12 v90 h-12z"/><g class="pa-level"><rect x="80" y="104" width="80" height="12" rx="3"/><circle cx="120" cy="110" r="3.4"/></g>`, '0 0 240 150'),
  repair: svg(`<rect class="pa-wall" x="0" y="0" width="240" height="150" rx="14"/>${U(26, 30, 100)}<g class="pa-gauge" transform="translate(176 70)"><circle r="30"/><path class="pa-tickmarks" d="M-22 10 A24 24 0 1 1 22 10"/><line class="pa-needle" x1="0" y1="0" x2="0" y2="-22"/><circle class="hub" r="3.5"/></g><g class="pa-wrench" transform="translate(70 110)"><path d="M0 0 l34 -18 a8 8 0 1 1 6 10 l-34 18 a6 6 0 1 1 -6 -10z"/></g><text class="pa-q" x="140" y="34">?</text>`, '0 0 240 150'),
};

const ST = {
  // cleaning
  c1: svg(`${U(14, 22, 44)}${U(60, 22, 44)}${U(106, 22, 44)}<g class="pa-pulse"><circle cx="138" cy="72" r="14"/><text x="138" y="76.5">×3</text></g><text class="pa-lbl" x="14" y="100">ติดผนัง · แขวน · สี่ทิศทาง</text>`),
  c2: svg(`<rect class="pa-sheet" x="40" y="8" width="80" height="94" rx="6"/><g class="pa-lines"><rect x="50" y="22" width="60" height="5" rx="2"/><rect x="50" y="34" width="46" height="5" rx="2" style="--i:1"/><rect x="50" y="46" width="54" height="5" rx="2" style="--i:2"/></g><line class="pa-rule" x1="50" y1="64" x2="110" y2="64"/><text class="pa-sum" x="110" y="84">฿ ก่อน VAT</text>`),
  c3: svg(`<rect class="pa-sheet" x="30" y="14" width="100" height="84" rx="8"/><rect class="pa-cal-h" x="30" y="14" width="100" height="16" rx="8"/>${Array.from({ length: 21 }, (_, i) => `<rect class="pa-day${i === 10 ? ' pick' : i < 3 ? ' near' : ''}" x="${38 + (i % 7) * 13}" y="${38 + Math.floor(i / 7) * 18}" width="9" height="11" rx="2"/>`).join('')}<text class="pa-lbl" x="80" y="108" text-anchor="middle">+${QUEUE_RULES.leadDays} วัน</text>`),
  c4: svg(`<rect class="pa-phone" x="22" y="8" width="52" height="94" rx="9"/><rect class="pa-photo" x="30" y="22" width="36" height="28" rx="3"/><path class="pa-mtn" d="M32 48 l10 -12 8 8 6 -6 8 10z"/><path class="pa-fly" d="M80 44 C 100 28 116 28 130 40"/><circle class="pa-dot" cx="130" cy="40" r="4"/><circle class="pa-ok" cx="132" cy="70" r="16"/>${CHECK(124, 70)}`),
  c5: svg(`${U(40, 10, 80)}<path class="pa-bag" d="M36 36 h88 l-20 44 h-48 z"/>${DROPS(66, 40, 9)}<g class="pa-timer" transform="translate(138 82)"><circle r="14"/><path class="pa-arc" d="M0 -14 A14 14 0 1 1 -13.3 -4.3"/></g><text class="pa-lbl" x="130" y="106" text-anchor="middle">5–15 นาที</text>`),
  c6: svg(`<rect class="pa-sheet" x="18" y="10" width="64" height="90" rx="6"/>${[24, 42, 60, 78].map((y, i) => `<g style="--i:${i}" class="pa-row">${CHECK(26, y + 4, 'pa-chk sm')}<rect x="44" y="${y}" width="30" height="5" rx="2"/></g>`).join('')}${U(92, 24, 60)}${AIR(100, 46, 4)}`),
  // installation
  i1: svg(`${[0, 1, 2].map(i => `<g class="pa-card${i === 1 ? ' pick' : ''}" transform="translate(${10 + i * 50} 16)"><rect width="42" height="74" rx="6"/>${U(5, 10, 32)}<rect class="pa-txt" x="6" y="36" width="30" height="4" rx="2"/><rect class="pa-txt" x="6" y="46" width="20" height="4" rx="2"/><text x="21" y="66" text-anchor="middle">${['9k', '12k', '18k'][i]}</text></g>`).join('')}`),
  i2: svg(`<path class="pa-room" d="M20 30 L80 10 L140 30 L140 92 L80 108 L20 92 Z M80 10 L80 70 M20 30 L80 52 L140 30 M80 52 L80 108"/><g class="pa-slide">${U(34, 30, 36)}</g><path class="pa-dim" d="M30 98 L74 106"/><text class="pa-lbl" x="44" y="88">กว้าง × ยาว</text>`),
  i3: svg(`<path class="pa-pipe2" d="M14 60 H96"/><path class="pa-pipe2 ext" d="M96 60 H148"/><g class="pa-ruler"><rect x="14" y="72" width="82" height="10" rx="2"/>${Array.from({ length: 9 }, (_, i) => `<line x1="${14 + i * 10.25}" y1="72" x2="${14 + i * 10.25}" y2="${i % 2 ? 77 : 80}"/>`).join('')}</g><text class="pa-lbl" x="55" y="98" text-anchor="middle">${FIT_RULES.pipeIncluded} ม. แรกรวมในราคา</text><text class="pa-lbl dim" x="122" y="48" text-anchor="middle">ส่วนเกิน/ม.</text>`),
  i4: svg(`<rect class="pa-phone" x="22" y="8" width="52" height="94" rx="9"/><rect class="pa-photo" x="30" y="22" width="36" height="28" rx="3"/><rect class="pa-plate" x="36" y="30" width="24" height="4" rx="1"/><path class="pa-fly" d="M80 44 C 100 28 116 28 130 40"/><circle class="pa-dot" cx="130" cy="40" r="4"/><circle class="pa-ok" cx="132" cy="70" r="16"/>${CHECK(124, 70)}`),
  i5: svg(`<rect class="pa-plate" x="36" y="22" width="70" height="7" rx="2"/><g class="pa-lift">${U(36, 18, 70)}</g><path class="pa-pipe" d="M108 34 H130 V108"/><g class="pa-gauge" transform="translate(56 84)"><circle r="18"/><line class="pa-needle" x1="0" y1="0" x2="0" y2="-13"/><circle class="hub" r="2.4"/></g><text class="pa-lbl" x="112" y="90" text-anchor="middle">Vacuum</text><text class="pa-lbl" x="112" y="103" text-anchor="middle">ตรวจรั่ว</text>`),
  i6: svg(`<path class="pa-shield" d="M80 8 L120 22 V54 C120 80 100 96 80 104 C60 96 40 80 40 54 V22 Z"/>${CHECK(66, 56, 'pa-chk big')}<text class="pa-lbl" x="80" y="40" text-anchor="middle">3 ปี / 1 ปี</text>`),
  // repair
  r1: svg(`${U(30, 16, 90)}${DROPS(60, 48, 3)}<g class="pa-bubble"><rect x="112" y="56" width="40" height="30" rx="10"/><text x="132" y="77" text-anchor="middle">?</text></g><text class="pa-lbl" x="80" y="104" text-anchor="middle">ไม่เย็น · น้ำหยด · มีเสียง</text>`),
  r2: svg(`<rect class="pa-remote" x="26" y="16" width="34" height="80" rx="10"/><rect class="pa-lcd" x="32" y="24" width="22" height="14" rx="2"/><circle class="pa-btn" cx="43" cy="56" r="6"/><rect class="pa-breaker" x="96" y="20" width="40" height="64" rx="5"/><rect class="pa-toggle" x="108" y="38" width="16" height="24" rx="3"/><text class="pa-lbl" x="80" y="106" text-anchor="middle">ตรวจเองแบบปลอดภัย</text>`),
  r3: svg(`<rect class="pa-sheet" x="20" y="18" width="80" height="74" rx="8"/><rect class="pa-cal-h" x="20" y="18" width="80" height="14" rx="8"/>${Array.from({ length: 14 }, (_, i) => `<rect class="pa-day${i === 9 ? ' pick' : ''}" x="${28 + (i % 7) * 10}" y="${42 + Math.floor(i / 7) * 18}" width="7" height="11" rx="2"/>`).join('')}<g class="pa-wrench sm" transform="translate(112 74)"><path d="M0 0 l26 -14 a6 6 0 1 1 5 8 l-26 14 a5 5 0 1 1 -5 -8z"/></g>`),
  r4: svg(`<g class="pa-gauge" transform="translate(52 56)"><circle r="32"/><path class="pa-tickmarks" d="M-24 12 A27 27 0 1 1 24 12"/><line class="pa-needle" x1="0" y1="0" x2="0" y2="-24"/><circle class="hub" r="3.5"/></g><rect class="pa-sheet" x="98" y="20" width="50" height="66" rx="6"/><rect class="pa-txt" x="106" y="32" width="34" height="4" rx="2"/><rect class="pa-txt" x="106" y="42" width="26" height="4" rx="2"/><g class="pa-wait"><circle cx="123" cy="66" r="10"/>${CHECK(117, 66, 'pa-chk sm')}</g><text class="pa-lbl" x="80" y="106" text-anchor="middle">แจ้งราคา → คุณอนุมัติ</text>`),
  r5: svg(`${U(24, 22, 80)}<g class="pa-wrench spin" transform="translate(104 64)"><path d="M0 0 l30 -16 a7 7 0 1 1 6 9 l-30 16 a6 6 0 1 1 -6 -9z"/></g><text class="pa-lbl" x="24" y="100">ซ่อมหลังอนุมัติเท่านั้น</text>`),
  r6: svg(`${U(24, 14, 80)}${AIR(36, 42, 5)}<g class="pa-thermo" transform="translate(132 20)"><rect x="-6" y="0" width="12" height="62" rx="6"/><rect class="pa-merc" x="-3" y="20" width="6" height="40" rx="3"/><circle cy="66" r="9"/></g>`),
};

/* ---------------- the journeys ---------------- */
function data() {
  const from = cleanFrom(), min = DATA.minBill, trip = TRAVEL.baseFee, rush = QUEUE_RULES.rushFeeEx, lead = QUEUE_RULES.leadDays;
  const cr = cleanRate('Basic Clean', 'C1', 'wall', 0), cw = cr && cr.warranty;
  const c1n = cleanSteps('wall', 'C1', 'Basic Clean').length, c2n = cleanSteps('wall', 'C2', 'Basic Clean').length, in_n = installSteps('wall', 'STANDARD').length;
  const ins = DATA.instByCode && DATA.instByCode['INS-W-9000-12000-STANDARD'], insEx = ins && ins.ex;
  const dWall = diagLine('wall'), dBig = diagLine('big');
  const P = v => v == null ? 'ประเมินหน้างาน' : `${baht(v)} ก่อน VAT`;
  return {
    clean: {
      th: 'ล้างแอร์', en: 'Cleaning', door: DOOR.clean,
      means: 'ถอดชิ้นส่วนที่ฝุ่นสะสม ล้างแผ่นกรอง คอยล์เย็น ใบพัด ถาดน้ำทิ้ง และคอยล์ร้อน ด้วยน้ำยาและน้ำแรงดัน ให้ลมผ่านคอยล์ได้เต็มที่อีกครั้ง',
      when: 'ลมเบาลง เย็นช้า มีกลิ่น หรือถึงรอบล้าง (บ้านทั่วไป 3–6 เดือน ห้องฝุ่นมาก สัตว์เลี้ยง ติดถนน ถี่กว่านั้น)',
      time: `${timeTh(JOB_TIME.C1.wall)} ต่อเครื่อง (ติดผนัง ล้างปกติ)`, price: from != null ? `เริ่ม ${baht(from)} ก่อน VAT` : 'ดูราคาในจองล้าง',
      steps: [
        { k: 'c1', f: [['เริ่ม', from != null ? `${baht(from)} ก่อน VAT` : 'ดูในจองล้าง'], ['ประเภท', 'ติดผนัง · แขวน · สี่ทิศทาง · ตู้ตั้ง']], t: 'บอกประเภทและจำนวนเครื่อง', what: 'เลือกประเภทแอร์ (ติดผนัง แขวน สี่ทิศทาง ตู้ตั้ง) ขนาด และจำนวนในหน้าจองล้าง', why: 'ราคาและเวลาของงานล้างขึ้นกับประเภทและขนาดของเครื่อง', get: 'รู้ทันทีว่างานของคุณเป็นงานแบบไหน', go: ['book', 'เริ่มจองล้าง'] },
        { k: 'c2', f: [['ขั้นต่ำต่อการเข้างาน', `${baht(min)} ก่อน VAT`], ['ไม่ถึงขั้นต่ำ', `ค่าเดินทาง ${baht(trip)}`]], t: 'เห็นราคารวมก่อนยืนยัน', what: 'ระบบรวมราคามาตรฐานจาก Pricebook ของทุกเครื่อง แสดงก่อน VAT · VAT · รวมทั้งสิ้น', why: `งานล้างมียอดขั้นต่ำ ${baht(min)} ก่อน VAT ต่อการเข้างาน ถ้าไม่ถึง คิดค่าเดินทาง ${baht(trip)} แทนการเติมยอด`, get: 'ตัวเลขชัดเจนตั้งแต่ก่อนนัด ไม่มีราคาเปลี่ยนเองหน้างาน', go: ['book', 'ดูราคาของฉัน'] },
        { k: 'c3', f: [['จองปกติ', `ล่วงหน้า ${lead} วัน`], ['คิวด่วน', `+${baht(rush)} ก่อน VAT`], ['ช่วงเวลา', 'เช้า · บ่าย']], t: 'เลือกวันและช่วงเวลา', what: `จองปกติล่วงหน้า ${lead} วัน เลือกเช้าหรือบ่าย · ต้องการเร็วกว่านั้นเป็นคิวด่วน +${baht(rush)} ก่อน VAT ต่อการเข้างาน`, why: 'ทีมช่างประจำจัดเส้นทางล่วงหน้า คิวด่วนต้องมีช่องว่างจริง ทีมยืนยันก่อนทุกครั้ง', get: 'ไม่มีคิวด่วน = ไม่เก็บค่าคิวด่วน', go: ['book', 'เลือกวัน'] },
        { k: 'c4', f: [['ได้ทันที', 'เลขอ้างอิง'], ['งานนอกมาตรฐาน', 'แจ้งราคาก่อนยืนยันคิว']], t: 'ส่งใบจองพร้อมรูปหน้างาน', what: 'ตอบคำถามสภาพหน้างาน 1 นาที (ความสูง ตำแหน่งคอยล์ร้อน คราบหนัก) แนบรูปถ้ามี แล้วส่ง ได้เลขอ้างอิงทันที', why: 'ทีมเห็นงานนอกมาตรฐานก่อนวันงาน และแจ้งราคาส่วนเพิ่มให้คุณอนุมัติก่อนยืนยันคิว', get: 'เลขอ้างอิงไว้ติดตาม · ทีมโทรยืนยันคิวในเวลาทำการ', go: ['quote', 'เปิดใบเสนอราคา'], cart: true },
        { k: 'c5', f: [['ล้างปกติ C1', `${c1n} ขั้น`], ['ล้างใหญ่ C2', `${c2n} ขั้น · ไม่ตัดท่อ`], ['น้ำยาทำงาน', '5–15 นาที']], t: 'วันงาน: ทีมช่างทำอะไรบ้าง', what: `ล้างปกติ (C1) ${c1n} ขั้นตามแบบฟอร์มบริษัท: คลุมผ้าใบล้างแอร์ ถอดแผ่นกรองและฝาหน้า ลงน้ำยาทิ้งไว้ 5–15 นาทีตามความสกปรก ล้างด้วยน้ำแรงดัน เป่าไล่น้ำ ประกอบ ทดสอบ · ล้างใหญ่ (C2) ${c2n} ขั้น ปลดเครื่องลงมาล้าง ไม่ตัดท่อ`, why: 'น้ำและคราบลงผ้าใบไปที่ถัง ไม่เลอะห้อง · ทุกขั้นมีรายการตรวจของบริษัท', get: 'ลมผ่านคอยล์กลับมาเต็ม ห้องเย็นเร็วขึ้น', go: ['cleanflow', 'ดูทีมช่างทำงาน 3 มิติ'], hook: 'clean' },
        { k: 'c6', f: [['รับประกัน', cw || 'ตามแพ็กเกจ'], ['รายงาน', 'ภาพก่อน–หลัง · เกรดสภาพเครื่อง']], t: 'หลังงาน: สรุปและรับประกัน', what: 'ช่างเปิดเครื่องทดสอบให้ดูก่อนกลับ แพ็กเกจล้างพร้อมรายงานมีภาพก่อน–หลังและเกรดสภาพเครื่อง', why: 'คุณเห็นว่าทำอะไรไปบ้าง และรู้รอบล้างครั้งต่อไป', get: cw ? `รับประกันงานล้าง: ${cw}` : 'รับประกันงานล้างตามแพ็กเกจ', go: ['standards', 'มาตรฐานงานของเรา'] },
      ],
    },
    install: {
      th: 'ติดตั้งแอร์', en: 'Installation', door: DOOR.install,
      means: 'ติดตั้งแอร์เครื่องใหม่ (หรือเครื่องที่คุณมี) ตามมาตรฐานบริษัท: ท่อทองแดง O-TWO 0.70 มม. หุ้มฉนวน เดินในรางครอบท่อ ตรวจรั่วด้วยไนโตรเจน ทำสุญญากาศ แล้วทดสอบ',
      when: 'ซื้อแอร์ใหม่ ย้ายบ้าน รีโนเวท หรือเปลี่ยนเครื่องเก่า',
      time: `${timeTh(JOB_TIME.install.wall)} ต่อเครื่อง (ติดผนัง)`, price: insEx != null ? `ค่าติดตั้งเริ่ม ${baht(insEx)} ก่อน VAT` : 'ดูราคาพร้อมติดตั้งในหน้าสินค้า',
      steps: [
        { k: 'i1', f: [['แคตตาล็อก', '705 รุ่น · 22 แบรนด์'], ['ราคา', 'เครื่อง + พร้อมติดตั้ง']], t: 'เลือกรุ่นและขนาด', what: 'ดูแอร์ 705 รุ่น 22 แบรนด์ กรองตามประเภท ขนาด BTU ราคา Inverter ไม่แน่ใจขนาด ใช้ห้องจำลองคำนวณ BTU', why: 'ขนาดที่พอดีกับห้องเย็นเร็ว ไม่ทำงานหนักเกินไป', get: 'ราคาเครื่อง + ราคาพร้อมติดตั้งในหน้าเดียว', go: ['catalog', 'ดูแอร์ทุกรุ่น'] },
        { k: 'i2', f: [['เห็นก่อนติดตั้ง', 'ระยะฝ้า · ทิศลม · ความยาวท่อ']], t: 'ลองวางในห้องของคุณ', what: 'ใส่ขนาดห้อง เลือกผนัง แล้วดูเครื่องตามขนาดจริง ระยะห่างฝ้า ทิศทางลม และความยาวท่อโดยประมาณ', why: 'เห็นปัญหาก่อนวันติดตั้ง เช่น ลมเป่าหัวเตียง ท่อยาวเกิน', get: 'ตำแหน่งที่เหมาะและงบท่อส่วนเกินโดยประมาณ', go: ['fit', 'ลองวางในห้อง'] },
        { k: 'i3', f: [['รวมในค่าติดตั้ง', `ท่อ ${FIT_RULES.pipeIncluded} ม. แรก`], ['ค่าติดตั้งเริ่ม', insEx != null ? `${baht(insEx)} ก่อน VAT` : 'ดูในหน้าสินค้า'], ['ทองแดง', 'O-TWO 0.70 มม.']], t: 'รู้ว่าราคารวมอะไร', what: `ค่าติดตั้งมาตรฐานรวมท่อและวัสดุ ${FIT_RULES.pipeIncluded} เมตรแรก ส่วนเกินคิดต่อเมตรตาม Pricebook · เลือกมาตรฐานหรือพรีเมียม`, why: 'วัสดุทุกชิ้นระบุยี่ห้อและสเปก เทียบได้ก่อนตัดสินใจ', get: 'ค่าใช้จ่ายแยกรายการ ก่อน VAT', go: ['prices', 'ดูค่าบริการทั้งหมด'] },
        { k: 'i4', f: [['รูปที่ขอ', 'ผนัง · คอยล์ร้อน · เบรกเกอร์'], ['งานนอกมาตรฐาน', 'แจ้งราคาก่อน']], t: 'ส่งใบจองพร้อมรูปจุดติดตั้ง', what: 'ส่งรูปผนังที่จะติด ตำแหน่งคอยล์ร้อน และเบรกเกอร์ ทีมประเมินงานนอกมาตรฐาน (เจาะคอนกรีต งานที่สูง เดินสายเมน)', why: 'ลดการเรียกช่างไปดูหน้างานก่อน และไม่มีรายการเพิ่มหน้างานโดยไม่แจ้ง', get: 'ใบเสนอราคาเดียวครบทั้งเครื่องและงานติดตั้ง', go: ['quote', 'เปิดใบเสนอราคา'], cart: true },
        { k: 'i5', f: [['ขั้นตอน', `${in_n} ขั้นตามแบบฟอร์ม`], ['ตรวจรั่ว', 'ไนโตรเจน'], ['สุญญากาศ', 'ไมครอนเกจ']], t: 'วันติดตั้ง', what: `${in_n} ขั้นตามแบบฟอร์มบริษัท: ตีแนว ยึดขา เจาะผนัง ยกเครื่อง เดินท่อในราง ท่อน้ำทิ้ง สายไฟ ตรวจรั่วด้วยไนโตรเจน ทำสุญญากาศพร้อมไมครอนเกจ เปิดวาล์ว ทดสอบ เก็บงาน`, why: 'ระบบที่ไม่รั่วและไม่มีความชื้น คือสิ่งที่ทำให้แอร์ใช้งานได้นาน', get: 'งานเรียบร้อย ท่อไม่โผล่ พร้อมค่าที่วัดหลังติดตั้ง', go: ['cleanflow', 'ดูขั้นตอนติดตั้ง 3 มิติ'], hook: 'install' },
        { k: 'i6', f: [['ซื้อเครื่องกับบริษัท', 'รับประกัน 3 ปี'], ['เครื่องที่คุณจัดหา', 'รับประกัน 1 ปี']], t: 'ส่งมอบและรับประกัน', what: 'ทดสอบการทำงานต่อหน้าคุณ ลงนามส่งมอบ พร้อมแนะนำการใช้งานและรอบล้าง', why: 'รับประกันงานติดตั้งตามใบเสนอราคา', get: 'รับประกันงานติดตั้ง 3 ปีเมื่อซื้อเครื่องกับบริษัท · 1 ปีเมื่อเป็นเครื่องที่คุณจัดหาเอง', go: ['standards', 'มาตรฐานงานติดตั้ง'] },
      ],
    },
    repair: {
      th: 'ซ่อมแอร์', en: 'Repair', door: DOOR.repair,
      means: 'หาสาเหตุของอาการก่อน แล้วแจ้งราคาให้คุณอนุมัติ — ไม่ซ่อมก่อนคุณตกลง ทุกรายการมีราคามาตรฐานหรือแจ้งเป็นใบเสนอราคา',
      when: 'แอร์ไม่เย็น น้ำหยด เป็นน้ำแข็ง เปิดไม่ติด ไฟกะพริบ เสียงดัง เบรกเกอร์ตัด',
      time: 'ตรวจวินิจฉัยในวันนัด · เวลาซ่อมขึ้นกับอะไหล่และอาการ', price: dWall ? `ค่าตรวจวินิจฉัย ${P(dWall.rate.s)}${dBig && dBig !== dWall ? ` · แอร์ใหญ่ ${P(dBig.rate.s)}` : ''}` : 'ดูค่าตรวจในศูนย์ราคา',
      steps: [
        { k: 'r1', f: [['อาการ', '14 แบบ'], ['ผู้ช่วยถามต่อ', '1–5 ข้อ']], t: 'บอกอาการ', what: 'เลือกอาการจาก 14 แบบ หรือพิมพ์เล่า ผู้ช่วยถามต่อ 1–5 ข้อ แล้วเรียงจุดที่น่าจะเป็นพร้อมราคามาตรฐาน', why: 'ช่างเตรียมอุปกรณ์และอะไหล่ได้ถูกจุดตั้งแต่ก่อนไป', get: 'รู้ว่าน่าจะเป็นอะไร และค่าใช้จ่ายโดยประมาณ', go: ['symptoms', 'เลือกอาการ'] },
        { k: 'r2', f: [['ไฟรั่ว · ไหม้', 'ปิดเบรกเกอร์ รอช่าง']], t: 'ตรวจเองแบบปลอดภัยก่อน', what: 'บางอาการไม่ใช่ของเสีย เช่น ตั้งโหมดผิด แผ่นกรองตัน แบตรีโมต · ทุกคำตอบมีสิ่งที่ทำเองได้อย่างปลอดภัย และสิ่งที่ห้ามทำ', why: 'ประหยัดค่าเรียกช่างถ้าแก้ได้เอง', get: 'ถ้าเกี่ยวกับไฟฟ้า ไฟรั่ว หรือไหม้ ระบบบอกให้ปิดเบรกเกอร์และรอช่าง', go: ['symptoms', 'ดูวิธีตรวจเอง'] },
        { k: 'r3', f: [['ค่าตรวจ ติดผนัง', dWall ? P(dWall.rate.s) : 'ตามประเภท'], ...(dBig && dBig !== dWall ? [['ค่าตรวจ แอร์ใหญ่', P(dBig.rate.s)]] : [])], t: 'จองช่างตรวจ พร้อมผลประเมิน', what: 'กด "จองช่างตรวจซ่อม" จากผลประเมิน ค่าตรวจวินิจฉัยตามประเภทแอร์เข้าใบจองเอง พร้อมอาการที่คุณตอบ', why: 'ช่างอ่านผลประเมินก่อนเข้างาน', get: dWall ? `ค่าตรวจวินิจฉัยติดผนัง ${P(dWall.rate.s)}` : 'ค่าตรวจตามประเภทแอร์', go: ['quote', 'เปิดใบจอง'], cart: true },
        { k: 'r4', f: [['ก่อนซ่อม', 'คุณอนุมัติราคา'], ['ทางเลือก', 'ซ่อม · ล้าง · เปลี่ยน']], t: 'วินิจฉัยและแจ้งราคา', what: 'ช่างวัดค่าไฟ น้ำยา อุณหภูมิ และตรวจชิ้นส่วนตามอาการ แล้วแจ้งสาเหตุ ทางเลือก และราคาให้คุณอนุมัติ', why: 'กฎของบริษัท: ไม่ซ่อมก่อนลูกค้าอนุมัติ', get: 'ตัดสินใจได้เองว่าจะซ่อม ล้างก่อน หรือเทียบกับเปลี่ยนเครื่อง', go: ['tradein', 'เทียบซ่อมกับเปลี่ยนเครื่อง'] },
        { k: 'r5', f: [['ราคา', 'ตามที่อนุมัติ'], ['เปิดระบบน้ำยา', 'ตรวจรั่ว · สุญญากาศ']], t: 'ซ่อมหลังคุณอนุมัติ', what: 'ซ่อมตามรายการที่อนุมัติ งานที่ต้องเปิดระบบน้ำยาทำตามขั้นตอนเดียวกับงานติดตั้ง (ตรวจรั่ว ทำสุญญากาศ เติมน้ำยาตามสเปก)', why: 'ไม่มีรายการเพิ่มโดยไม่แจ้ง', get: 'ราคาตามที่ตกลง', go: ['prices', 'ดูราคาซ่อม 86 รายการ'] },
        { k: 'r6', f: [['วัดให้ดู', 'ลมออก · กระแสไฟ'], ['รับประกัน', 'ตามรายการซ่อม']], t: 'ทดสอบและรับประกัน', what: 'เปิดเครื่องทดสอบ วัดอุณหภูมิลมออกและกระแสไฟให้ดู บันทึกในรายงาน', why: 'คุณเห็นผลกับตาก่อนช่างกลับ', get: 'รับประกันตามรายการซ่อมใน Pricebook', go: ['prices', 'ดูเงื่อนไขรับประกัน'] },
      ],
    },
  };
}
const ORDER = ['clean', 'install', 'repair'];

/* ---------------- 3D stills (Rev.39) ---------------- */
// the look of this page: E is a light editorial site, D and F are dark; the accent is the page's own --acc
function look() {
  const L = artV() || 'D';
  let a = ''; try { a = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim(); } catch (e) { /* default */ }
  // A · B · C (light pages) use the colours their pre-rendered stills were made with (tools/render-stills.mjs LOOK)
  const ABC = { A: '#0B74B5', B: '#003C99', C: '#1F9BD6' };
  return { theme: L === 'D' || L === 'F' ? 'dark' : 'light', accent: ABC[L] || (/^#[0-9a-f]{6}$/i.test(a) ? a : '#63E6FF') };
}
// figures printed on the glass panels inside the stills — the same constants as the text
export function figures() {
  const from = cleanFrom(), ins = DATA.instByCode && DATA.instByCode['INS-W-9000-12000-STANDARD'], dWall = diagLine('wall');
  const r = t => { const x = cleanRate('Basic Clean', 'C1', t, 0); return x && x.rate && x.rate.s; }, w = r('wall'), c = r('ceiling');
  const cr = cleanRate('Basic Clean', 'C1', 'wall', 0);
  return {
    cleanFrom: from != null ? baht(from) : '', installFrom: ins && ins.ex != null ? baht(ins.ex) : '', diag: dWall && dWall.rate.s != null ? baht(dWall.rate.s) : '',
    lines: [w != null && ['ล้างติดผนัง × 2', baht(w * 2)], c != null && ['ล้างแขวน × 1', baht(c)]].filter(Boolean),
    min: baht(DATA.minBill), trip: baht(TRAVEL.baseFee), lead: QUEUE_RULES.leadDays, pipe: FIT_RULES.pipeIncluded, cleanWarranty: (cr && cr.warranty) || '',   // (no month on the calendar: the pre-rendered still must not date itself)
  };
}
let FIG = null;
const shot = (k, view = 0) => { const L = look(); return vignette(k, { ...L, view, info: FIG || (FIG = figures()) }); };
/** put the 3D still of `k` into `box` (crossfade over whatever is there); the line art stays as the fallback */
// Rev.41: an AI image in the slot (assets/ai/manifest.json) takes the place of the 3D still — one view, labelled ภาพประกอบ (AI)
function still(box, k, view = 0) {
  const want = k + '|' + view; box.dataset.want = want;
  // order: AI picture (slot) → pre-rendered still (front view, same figures) → live render (other angles, or after a price change)
  const L = artV() || 'D', fig = JSON.stringify(FIG || (FIG = figures()));
  return aiArt().then(m => m[k] ? { ai: m[k] } : (view === 0 ? stillFor(L, k, fig) : Promise.resolve(null)).then(pre => pre ? { src: pre } : shot(k, view).then(src => src && { src }))).then(async got => {
    if (!got || box.dataset.want !== want) return;
    const src = got.ai ? got.ai.src : got.src;
    box.classList.toggle('is-ai', !!got.ai);
    let tag = box.querySelector('.pa-ai-tag'); if (got.ai && !tag) box.append(tag = h('span', { class: 'pa-ai-tag' }, 'ภาพประกอบ (AI)')); if (!got.ai && tag) tag.remove();
    const im = new Image(); im.alt = ''; im.className = 'pa-v' + (got.ai ? ' ai' : ''); im.src = src;
    try { await im.decode(); } catch (e) { return; }
    if (box.dataset.want !== want) return;
    box.querySelectorAll('img.pa-v').forEach(o => { o.classList.add('out'); setTimeout(() => o.remove(), 700); });
    box.append(im); box.classList.add('has-v');
    requestAnimationFrame(() => im.classList.add('in'));
  });
}
// the still leans a little with the pointer and with the scroll position (CSS reads --mx / --my; nothing moves under reduced motion)
function lean(el) {
  if (reduceMotion()) return;
  let raf = 0, mx = 0, my = 0;
  const set = () => { raf = 0; el.style.setProperty('--mx', mx.toFixed(3)); el.style.setProperty('--my', my.toFixed(3)); };
  const q = () => { if (!raf) raf = requestAnimationFrame(set); };
  el.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = el.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; q(); });
  el.addEventListener('pointerleave', () => { mx = 0; q(); });
  addEventListener('scroll', () => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; my = Math.max(-0.5, Math.min(0.5, (r.top + r.height / 2) / innerHeight - 0.5)); q(); }, { passive: true });
}
const chips = f => h('ul', { class: 'pa-facts' }, (f || []).map(([a, b]) => h('li', {}, h('small', {}, a), h('b', {}, b))));

/** the entrance: three animated doors */
export function mountDoors(root, { onPick = () => {} } = {}) {
  if (!root) return null;
  const D = data();
  const grid = h('div', { class: 'pa-doors' }, ORDER.map((k, i) => {
    const s = D[k];
    const b = h('button', { type: 'button', class: 'pa-door', 'data-svc': k, onclick: () => onPick(k) },
      h('span', { class: 'pa-door-art', html: s.door }),
      h('span', { class: 'pa-door-n' }, String(i + 1).padStart(2, '0') + ' · ' + s.en),
      h('b', {}, s.th),
      h('span', { class: 'pa-door-m' }, s.means),
      h('span', { class: 'pa-door-price' }, s.price),
      h('span', { class: 'pa-door-meta' }, h('span', {}, h('em', {}, 'เหมาะเมื่อ'), s.when), h('span', {}, h('em', {}, 'เวลาโดยประมาณ'), s.time)),
      h('span', { class: 'pa-door-go' }, `ดูขั้นตอน${s.th}ทีละขั้น`));
    return b;
  }));
  root.append(grid, h('p', { class: 's-note' }, `ภาพ 3 มิติเพื่ออธิบาย · ${TIME_NOTE}`));
  runWhenVisible(grid);
  grid.querySelectorAll('.pa-door').forEach(b => lean(b));
  whenNear(grid, () => ORDER.reduce((p, k) => p.then(() => still(grid.querySelector(`.pa-door[data-svc="${k}"] .pa-door-art`), 'door:' + k)), Promise.resolve()));
  return {};
}

/** the journey of one service, six animated steps */
export function mountPaths(root, { go = () => {}, openCart = () => {}, hooks = {}, only = null } = {}) {
  if (!root) return null;
  const D = data();
  // Rev.46 only: one service per page (D · F service views) — no service tabs, the path of that service only
  let svc = only || 'clean', i = 0, user = false, timer = 0, visible = false;
  const tabs = h('div', { class: 'pa-tabs', role: 'tablist', 'aria-label': 'บริการ' });
  const head = h('div', { class: 'pa-head' });
  const list = h('ol', { class: 'pa-list' });
  const art = h('div', { class: 'pa-art', 'aria-hidden': 'true' }, h('div', { class: 'pa-sv' }));
  let booted = false;
  const card = h('div', { class: 'pa-card-b', 'aria-live': 'polite' });
  const bar = h('div', { class: 'pa-bar' }, h('i'));
  // Rev.40: turn the still — left · front · right (buttons, or drag sideways on the picture)
  let vw = 0;
  const VIEWS = [[-1, 'มุมซ้าย'], [0, 'ด้านหน้า'], [1, 'มุมขวา']];
  const views = h('div', { class: 'pa-view', role: 'group', 'aria-label': 'มุมมองภาพ 3 มิติ', hidden: true }, VIEWS.map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(v === 0), 'data-v': v, onclick: () => turn(v) }, t)));
  const turn = v => { vw = Math.max(-1, Math.min(1, v)); user = true; stop(); views.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === vw))); still(art, art.dataset.k, vw); };
  { let x0 = null; art.addEventListener('pointerdown', e => { x0 = e.clientX; }); art.addEventListener('pointerup', e => { if (x0 == null || !booted) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) turn(vw + (dx < 0 ? 1 : -1)); }); }
  const stage = h('div', { class: 'pa-stage', role: 'tabpanel' }, h('div', { class: 'pa-artw' }, art, views), bar, card);
  root.append(h('div', { class: 'pa' }, tabs, head, h('div', { class: 'pa-grid' }, list, stage)), h('p', { class: 's-note' }, `ภาพประกอบเพื่ออธิบาย · ${TIME_NOTE}`));
  const RM = reduceMotion();
  const stop = () => { clearTimeout(timer); timer = 0; };
  const tick = () => { stop(); if (user || RM || !visible) return; bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); timer = setTimeout(() => { i = (i + 1) % 6; draw(false); tick(); }, 6500); };
  // the tab icons become small crops of the door stills once those are rendered
  const tabArt = () => tabs.querySelectorAll('.pa-tab-ic').forEach(ic => { const k = ic.parentNode.dataset.svc; still(ic, 'door:' + k); });
  function draw(full = true) {
    const S = D[svc], s = S.steps[i];
    if (full) {
      tabs.innerHTML = ''; tabs.hidden = !!only;
      (only ? [] : ORDER).forEach(k => tabs.append(h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === svc), class: 'pa-tab', 'data-svc': k, onclick: () => { svc = k; i = 0; user = true; stop(); draw(); } }, h('span', { class: 'pa-tab-ic', html: D[k].door }), D[k].th)));
      if (booted) tabArt();
      head.innerHTML = '';
      head.append(h('div', {}, h('small', {}, `${S.en} · คืออะไร`), h('p', {}, S.means)), h('div', {}, h('small', {}, 'เหมาะเมื่อ'), h('p', {}, S.when)), h('div', {}, h('small', {}, 'เวลาโดยประมาณ'), h('p', {}, S.time)), h('div', { class: 'pa-price' }, h('small', {}, 'ราคา'), h('p', {}, S.price)));
    }
    list.innerHTML = '';
    S.steps.forEach((x, k) => list.append(h('li', {}, h('button', { type: 'button', class: k === i ? 'on' : k < i ? 'done' : '', 'aria-current': k === i ? 'step' : null, onclick: () => { i = k; user = true; stop(); draw(false); } }, h('span', { class: 'pa-n' }, String(k + 1)), h('span', {}, x.t)))));
    if (art.dataset.k !== s.k) {
      art.querySelector('.pa-sv').innerHTML = ST[s.k]; art.dataset.k = s.k;
      // the still of this step (then warm the next one) + a soft glow on the change
      if (booted) { still(art, s.k, vw).then(() => { views.hidden = !art.classList.contains('has-v') || art.classList.contains('is-ai') || !liveOK(); return shot(S.steps[(i + 1) % 6].k, vw); }); stage.classList.remove('pulse'); void stage.offsetWidth; stage.classList.add('pulse'); }
    }
    const act = h('button', { type: 'button', class: 'btn-primary pa-go', onclick: () => { stop(); user = true; if (s.hook && hooks[s.hook]) hooks[s.hook](); if (s.cart) openCart(); else go(s.go[0]); } }, s.go[1]);
    card.innerHTML = '';
    card.append(h('p', { class: 'pa-step' }, `${S.th} · ขั้นที่ ${i + 1} จาก 6`), h('h3', {}, s.t), chips(s.f),
      h('dl', {}, h('div', {}, h('dt', {}, 'เกิดอะไรขึ้น'), h('dd', {}, s.what)), h('div', {}, h('dt', {}, 'ทำไม'), h('dd', {}, s.why)), h('div', { class: 'pa-get' }, h('dt', {}, 'คุณได้อะไร'), h('dd', {}, s.get))),
      h('div', { class: 'pa-acts' }, h('button', { type: 'button', class: 'btn-ghost', disabled: i === 0, onclick: () => { i--; user = true; stop(); draw(false); } }, 'ขั้นก่อนหน้า'), h('button', { type: 'button', class: 'btn-ghost', disabled: i === 5, onclick: () => { i++; user = true; stop(); draw(false); } }, 'ขั้นต่อไป'), act));
  }
  root.addEventListener('keydown', e => { if (e.target.closest('.pa-list') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); i = Math.max(0, Math.min(5, i + (e.key === 'ArrowDown' ? 1 : -1))); user = true; stop(); draw(false); list.querySelectorAll('button')[i].focus(); } });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) tick(); else stop(); }, { threshold: 0.35 }).observe(stage);
  runWhenVisible(art);
  lean(stage);
  draw();
  whenNear(stage, () => { booted = true; const k = art.dataset.k; still(art, k).then(() => { views.hidden = !art.classList.contains('has-v') || art.classList.contains('is-ai') || !liveOK(); }).then(() => shot(D[svc].steps[(i + 1) % 6].k)).then(tabArt); });
  return { show(k, step = 0) { if (D[k]) { svc = k; i = step; user = false; draw(); tick(); } } };
}
