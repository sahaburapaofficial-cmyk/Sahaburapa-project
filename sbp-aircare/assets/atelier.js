// SBP AirCare — design E "Atelier": a private consultation and a living room that changes with the time of day — Rev.29
// (owner 5 ต.ค. 2569: "ในมุมของการใช้บริการที่เราเข้าใจลูกค้าจริง ๆ … สีสัน Mood & tone ผสมผสานกลมกลืน ให้ได้ความ Luxury")
//   · concierge: four questions a good front-desk would ask (where, how many units, what bothers you, when) → a service plan in the
//     company's own rules — every amount comes from the Pricebook / constants (cleanFrom, minBill, travel base fee, rush fee,
//     VOLUME_HINT); nothing is promised, special rates are only "may qualify, confirmed in the quotation" (rule 3)
//   · the room: a layered 2.5D drawing (SVG) — sky through the window, sun and light shafts, curtains, dust motes in the light, the
//     unit's breeze — across a day from 06:00 to 22:00 ("4D": the fourth axis is time). The room temperature beside it is the
//     studio's thermal model (steadyT) with the outdoor air of that hour — labelled as a model
//   · pointer parallax on fine pointers only; reduced motion = no drift, no auto play
import { h, $, baht, DATA, TRAVEL, VOLUME_HINT, QUEUE_RULES } from './sbp-core.js';
import { cleanFrom } from './quickclean.js';
import { askTeam } from './contact.js';
import { runWhenVisible } from './animicons.js';
import { sound } from './luxsound.js';
import { SCENE_BY_ID, defaultOrient, thermal, steadyT, effects, needBtu, STD_SIZES } from './studio-model.js';

const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };

/* ---------------- concierge ---------------- */
export const QUESTIONS = [
  { id: 'place', th: 'แอร์อยู่ที่ไหน', one: true, opts: [['home', 'บ้าน'], ['condo', 'คอนโด'], ['shop', 'ร้านค้า · คาเฟ่'], ['office', 'สำนักงาน'], ['multi', 'องค์กรหลายสาขา']] },
  { id: 'units', th: 'มีแอร์กี่เครื่อง', one: true, opts: [['1', '1 เครื่อง'], ['3', '2–3 เครื่อง'], ['5', '4–6 เครื่อง'], ['10', '7–15 เครื่อง'], ['20', '16 เครื่องขึ้นไป']] },
  { id: 'care', th: 'ตอนนี้กังวลเรื่องอะไร', one: false, opts: [['long', 'ไม่ได้ล้างนาน'], ['warm', 'ไม่ค่อยเย็น'], ['drip', 'น้ำหยด'], ['smell', 'มีกลิ่น'], ['bill', 'ค่าไฟสูง'], ['old', 'แอร์อายุเกิน 7 ปี'], ['new', 'อยากได้เครื่องใหม่']] },
  { id: 'when', th: 'ต้องการเมื่อไร', one: true, opts: [['urgent', 'ด่วน ภายใน 3 วัน'], ['soon', 'ภายในสัปดาห์นี้ขึ้นไป'], ['year', 'วางแผนทั้งปี']] },
];
/** the plan for a set of answers — pure, unit-testable */
export function planFor(a) {
  const n = Number(a.units || 1), care = new Set(a.care || []), out = [];
  const from = cleanFrom() || 0, biz = a.place === 'office' || a.place === 'multi' || a.place === 'shop';
  if (care.has('old') || care.has('new')) out.push({ go: 'tradein', k: 'tradein', th: 'เทียบซ่อมเครื่องเดิมกับเทิร์นเป็นเครื่องใหม่', d: 'เลือกอายุ อาการ และขนาด ดูค่าซ่อมตาม Pricebook เทียบเครื่อง Inverter ใหม่พร้อมติดตั้ง และค่าไฟต่อปี มูลค่าเทิร์นหักในใบเสนอราคาเดียว' });
  if (care.has('warm') || care.has('drip') || care.has('smell')) out.push({ go: 'symptoms', k: 'symptoms', th: 'เช็กอาการก่อน แล้วให้ช่างไปถูกจุด', d: 'ตอบคำถามสั้น ๆ ระบบชี้จุดที่น่าจะเป็นและราคามาตรฐานของรายการซ่อม ช่างเตรียมเครื่องมือมาครั้งเดียว' });
  if (!(care.has('new') && care.size === 1)) {
    const est = from * n, below = est < DATA.minBill;
    out.push({ go: 'book', k: 'clean', th: `ล้างแอร์ ${n > 1 ? n + ' เครื่อง' : ''}`.trim(), d: `เริ่ม ${baht(from)} ต่อเครื่อง ก่อน VAT ตามประเภทและขนาด` + (below ? ` · งานล้างต่ำกว่าขั้นต่ำ ${baht(DATA.minBill)} มีค่าเดินทาง ${baht(TRAVEL.baseFee)} ต่อการเข้างาน` : ` · ยอดงานล้างถึงขั้นต่ำ ${baht(DATA.minBill)} ไม่มีค่าเดินทางในพื้นที่หลัก`) });
  }
  if (biz || n >= 7 || a.when === 'year') out.push({ go: 'enterprise', k: 'contract', th: 'สัญญาล้างรายปี วางรอบทั้งปีในสัญญาเดียว', d: 'ทีมวางรอบล่วงหน้า มีรายงานตามแพ็กเกจหลังทุกรอบ วางบิลตามรอบ' + (n >= VOLUME_HINT ? ' · ตั้งแต่ 10 เครื่องอาจได้อัตราพิเศษตามเงื่อนไข ทีมขายยืนยันในใบเสนอราคา' : '') });
  if (care.has('bill')) out.push({ go: 'studio', k: 'energy', th: 'เช็กขนาด BTU และค่าไฟต่อปีของห้อง', d: 'เลือกห้องที่ใกล้เคียง ดูว่าเครื่องเล็กไปหรือคอยล์สกปรกทำให้ทำงานหนักแค่ไหน (แบบจำลอง)' });
  const rush = a.when === 'urgent';
  out.push({ k: 'queue', th: rush ? 'คิวด่วน' : 'นัดวันเข้างาน', d: rush ? `เร็วกว่า ${QUEUE_RULES.leadDays} วัน มีค่าคิวด่วน ${baht(QUEUE_RULES.rushFeeEx)} ต่อการเข้างาน (ก่อน VAT) เมื่อมีทีมว่าง ทีมยืนยันก่อนทุกครั้ง ไม่มีคิวไม่เก็บ` : `จองล่วงหน้า ${QUEUE_RULES.leadDays} วัน เลือกเช้าหรือบ่ายในใบจองงาน ทีมยืนยันคิวก่อนเข้างาน` });
  return out;
}

export function mountConcierge(root, { go = () => {}, openCart = () => {}, prefill = null } = {}) {
  if (!root) return null;
  const A = store.get('sbp-concierge-v1', { care: [] }); A.care = A.care || [];
  const body = h('div', { class: 'at-q' }), res = h('div', { class: 'at-plan', 'aria-live': 'polite' });
  const prog = h('ol', { class: 'at-prog', 'aria-hidden': 'true' }, QUESTIONS.map(() => h('li')));
  let step = !A.place ? 0 : !A.units ? 1 : !A.careDone ? 2 : !A.when ? 3 : 4;
  // Rev.30: one tap from the plan to a booking form already holding the number of units — the customer names the type (we do not guess it)
  const TYPE_TH = [['wall', 'ติดผนัง'], ['ceiling', 'แขวนใต้ฝ้า'], ['cassette', 'สี่ทิศทาง'], ['floor', 'ตู้ตั้งพื้น']];
  const cleanTypes = () => h('div', { class: 'at-types', role: 'group', 'aria-label': 'ประเภทแอร์ที่จะล้าง' }, h('span', {}, `เปิดฟอร์มจองพร้อม ${A.units || 1} เครื่อง:`),
    TYPE_TH.map(([t, th]) => h('button', { type: 'button', onclick: () => { prefill(Object.fromEntries(TYPE_TH.map(([k]) => [k, k === t ? Number(A.units || 1) : 0]))); go('book'); } }, th)));
  let shown = -1;
  function render() {
    store.set('sbp-concierge-v1', A);
    [...prog.children].forEach((li, i) => li.className = i < step ? 'done' : i === step ? 'on' : '');
    body.innerHTML = ''; res.innerHTML = '';
    if (step < QUESTIONS.length) {
      shown = step;
      const q = QUESTIONS[step];
      const grp = h('div', { class: 'at-opts', role: q.one ? 'radiogroup' : 'group', 'aria-label': q.th });
      q.opts.forEach(([v, th]) => {
        const on = q.one ? A[q.id] === v : A.care.includes(v);
        grp.append(h('button', { type: 'button', class: 'at-opt', role: q.one ? 'radio' : null, 'aria-checked': q.one ? String(on) : null, 'aria-pressed': q.one ? null : String(on), onclick: () => { sound.cue('tick');
          if (q.one) { A[q.id] = v; step++; } else { A.care = on ? A.care.filter(x => x !== v) : [...A.care, v]; }
          render();
        } }, th));
      });
      body.append(h('p', { class: 'at-n' }, `${step + 1} / ${QUESTIONS.length}`), h('h3', {}, q.th), grp,
        h('div', { class: 'at-nav' }, step > 0 ? h('button', { type: 'button', class: 'btn-ghost', onclick: () => { step--; render(); } }, 'ย้อนกลับ') : null,
          !q.one ? h('button', { type: 'button', class: 'btn-primary', onclick: () => { A.careDone = true; step++; render(); } }, A.care.length ? 'ถัดไป' : 'ข้าม') : null));
      return;
    }
    const plan = planFor(A);
    if (shown !== 'plan') { shown = 'plan'; sound.cue('chime'); }   // ★Rev.32: a soft resolve when the plan appears (sound on only)
    const summary = QUESTIONS.map(q => `${q.th}: ${q.one ? (q.opts.find(o => o[0] === A[q.id]) || [, '-'])[1] : A.care.map(c => q.opts.find(o => o[0] === c)[1]).join(', ') || '-'}`).join('\n');
    res.append(h('p', { class: 'at-n' }, 'แผนบริการสำหรับคุณ'), h('h3', {}, 'สิ่งที่เราแนะนำ ตามลำดับ'),
      h('ol', { class: 'at-recs' }, plan.map((r, i) => h('li', { 'data-k': r.k, style: `--i:${i}` }, h('span', { class: 'at-i' }, String(i + 1).padStart(2, '0')),
        h('div', {}, h('b', {}, r.th), h('p', {}, r.d), r.k === 'clean' && prefill ? cleanTypes() : null), r.go ? h('button', { type: 'button', class: 'btn-ghost', onclick: () => go(r.go) }, 'ไปที่ขั้นนี้') : null))),
      h('p', { class: 'at-fine' }, 'ราคามาตรฐานจาก Pricebook 2569 ก่อน VAT · ยืนยันในใบเสนอราคาอย่างเป็นทางการ'),
      h('div', { class: 'at-nav' }, h('button', { type: 'button', class: 'btn-primary', onclick: () => askTeam('ปรึกษาบริการ', 'แผนบริการที่เลือกบนเว็บ\n' + summary) }, 'ให้ทีมโทรกลับพร้อมแผนนี้'),
        h('button', { type: 'button', class: 'btn-ghost', onclick: openCart }, 'ดูใบเสนอราคา'), h('button', { type: 'button', class: 'at-link', onclick: () => { step = 0; A.care = []; A.careDone = false; QUESTIONS.forEach(q => q.one && delete A[q.id]); render(); } }, 'เริ่มใหม่')));
  }
  const con = h('div', { class: 'at-con' }, prog, body, res);
  root.append(con);
  // ★Rev.32 motion (D/E/F pages, mouse only): the card tilts a little toward the pointer, like a pane of glass
  if (document.documentElement.dataset.lux && !RM() && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    let pend = false, px = 0, py = 0;
    con.addEventListener('pointermove', e => { const r = con.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5; if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; con.style.transform = `perspective(1100px) rotateX(${(-py * 3).toFixed(2)}deg) rotateY(${(px * 4).toFixed(2)}deg)`; }); }, { passive: true });
    con.addEventListener('pointerleave', () => { con.style.transform = ''; });
  }
  render();
  return { answers: A, plan: () => planFor(A) };
}

/* ---------------- the room through a day (2.5D) ---------------- */
// sky keyframes by hour: [hour, top, horizon]
const SKY = [[5, '#1b2140', '#4a3b5c'], [6.5, '#7f8fc4', '#f6b48c'], [8.5, '#86bfe9', '#e9eef0'], [13, '#4f9ee0', '#cfe6f6'], [16.5, '#79a9d8', '#f3d3a1'], [18, '#5a5f9a', '#f28f5c'], [19, '#2d335f', '#a2577a'], [21, '#0d1330', '#2b2a4f'], [23, '#0a0f24', '#1b1d3a']];
const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };
function skyAt(hr) { let i = 0; while (i < SKY.length - 2 && hr > SKY[i + 1][0]) i++; const a = SKY[i], b = SKY[i + 1], t = clamp((hr - a[0]) / (b[0] - a[0])); return [mix(a[1], b[1], t), mix(a[2], b[2], t)]; }
/** outdoor air through a hot-season day — the studio's day/night climate (35 / 29 °C) joined by a smooth curve (model) */
export const outAt = hr => 29 + 6 * Math.max(0, Math.sin(Math.PI * (hr - 7) / 14)) ** 0.9;
const SC = SCENE_BY_ID.living, P = { ...SC, orient: defaultOrient(SC) };
export const CAP = STD_SIZES.find(s => s >= needBtu(P, SC)) || 36000;   // sized the way the studio recommends
export function roomAt(hr, dirt, on = true) {
  if (!on) return outAt(hr) - 1;   // closed room without the unit: a little below the outdoor air (model)
  const th = thermal(P, SC, CAP, dirt, { time: hr >= 19 || hr < 6 ? 'night' : 'day' }); th.tout = outAt(hr);
  return steadyT(th);
}

const SVG = `<svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs>
  <linearGradient id="at-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="at-s0"/><stop offset="1" class="at-s1"/></linearGradient>
  <linearGradient id="at-shaft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3d6" stop-opacity=".75"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></linearGradient>
  <radialGradient id="at-lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".85"/><stop offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient>
  <linearGradient id="at-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98d63"/><stop offset="1" stop-color="#8a6243"/></linearGradient>
  <linearGradient id="at-air" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe8ff" stop-opacity=".9"/><stop offset="1" stop-color="#bfe8ff" stop-opacity="0"/></linearGradient>
  <radialGradient id="at-bloomg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6dc" stop-opacity=".75"/><stop offset=".35" stop-color="#ffe2a8" stop-opacity=".28"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
  <clipPath id="at-win"><rect x="470" y="70" width="250" height="250" rx="4"/></clipPath>
</defs>
<g class="at-l" data-depth="0.25" clip-path="url(#at-win)">
  <rect x="440" y="40" width="320" height="320" fill="url(#at-sky)"/>
  <circle class="at-sun" cx="600" cy="200" r="18" fill="#fff4d0"/>
  <circle class="at-moon" cx="660" cy="110" r="10" fill="#e8ecff"/>
  <polyline class="at-arc" points="${[...Array(27)].map((_, i) => { const u = i / 26; return `${(470 + 250 * u).toFixed(1)},${(300 - 230 * Math.sin(Math.PI * u)).toFixed(1)}`; }).join(' ')}"/>
  ${[6, 9, 12, 15, 18].map(hh => { const u = (hh - 6) / 12.5, x = 470 + 250 * u, y = 300 - 230 * Math.sin(Math.PI * u); return `<circle class="at-tick" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/><text class="at-tickl" x="${x.toFixed(1)}" y="${(y - 9).toFixed(1)}">${String(hh).padStart(2, '0')}</text>`; }).join('')}
  <path class="at-city" d="M440 330V262h22v-30h18v46h16v-62h26v40h14v-24h20v52h18v-80h30v58h12v-36h24v44h20v-56h18v70h22v24h22v36z"/>
  <g class="at-lights"></g>
</g>
<g class="at-l" data-depth="0.1">
  <path class="at-wall" fill-rule="evenodd" d="M0 0h800v420H0z M470 70h250v250H470z"/>
  <rect x="462" y="62" width="266" height="266" rx="6" fill="none" class="at-frame" stroke-width="8"/>
  <path d="M595 66v258" class="at-frame" stroke-width="5"/>
  <rect x="456" y="326" width="278" height="10" rx="3" class="at-sill"/>
  <polygon class="at-shaft" points="470,90 720,90 560,520 120,520" fill="url(#at-shaft)"/>
</g>
<g class="at-l" data-depth="0.25"><circle class="at-bloom" cx="600" cy="200" r="150" fill="url(#at-bloomg)"/></g>
<g class="at-l" data-depth="0.18">
  <path d="M0 420h800v100H0z" fill="url(#at-floor)"/>
  <g class="at-planks" stroke="rgba(60,35,18,.25)" stroke-width="1">${[...Array(9)].map((_, i) => `<path d="M${-200 + i * 140} 520L${80 + i * 80} 420"/>`).join('')}</g>
  <ellipse cx="330" cy="470" rx="250" ry="34" class="at-rug"/>
</g>
<g class="at-l" data-depth="0.3">
  <g class="at-unit"><rect x="120" y="96" width="250" height="70" rx="22" class="at-u"/><rect x="134" y="152" width="222" height="8" rx="4" class="at-uv"/><text x="245" y="132" class="at-ud">25</text></g>
  <g class="at-breeze">${[0, 1, 2, 3, 4].map(i => `<path class="at-b" style="animation-delay:${i * 0.5}s" d="M${150 + i * 45} 166 q 10 70 -20 150 t -10 140"/>`).join('')}</g>
  <path class="at-sofa" d="M120 360q0-28 28-28h250q28 0 28 28v74H120z"/><path class="at-sofa2" d="M108 392q0-18 18-18h22v66h-40zM400 374h22q18 0 18 18v48h-40z"/>
  <rect x="160" y="352" width="70" height="34" rx="12" class="at-cush"/><rect x="300" y="352" width="70" height="34" rx="12" class="at-cush b"/>
  <g class="at-lampg"><circle cx="520" cy="300" r="120" fill="url(#at-lamp)" class="at-glow"/><path d="M505 268h30l12 40h-54z" class="at-shade"/><path d="M520 308v120" stroke="#2a2522" stroke-width="3"/><ellipse cx="520" cy="430" rx="22" ry="5" fill="#2a2522"/></g>
  <g class="at-plant"><path d="M700 430h40l-6 -48h-28z" class="at-pot"/>${[0, 1, 2, 3, 4, 5].map(i => `<path class="at-leaf" style="animation-delay:${i * 0.4}s" d="M720 384 q ${-40 + i * 16} -60 ${-30 + i * 12} -${100 + (i % 3) * 18}"/>`).join('')}</g>
</g>
<g class="at-l" data-depth="0.4">
  <path class="at-curtain" d="M440 40h46q-10 140 6 300q-8 70 4 120h-56z"/>
  <path class="at-curtain r" d="M760 40h-46q10 140 -6 300q8 70 -4 120h56z"/>
</g>
<rect class="at-tint" width="800" height="520"/>
<g class="at-hud">
  <g class="at-flow"><path class="in" d="M610 236C540 262 450 300 340 336"/><path class="out" d="M300 330C292 270 270 214 250 172"/><text class="at-tickl at-fl-in" x="560" y="300">ความร้อนเข้าห้อง</text><text class="at-tickl at-fl-out" x="306" y="214">แอร์ดึงออก</text></g>
  <g class="at-rings">${[0, 1, 2].map(i => `<ellipse cx="270" cy="472" rx="210" ry="30" style="animation-delay:${i * 1.3}s"/>`).join('')}</g>
  <g class="at-tag"><circle cx="650" cy="292" r="4"/><path d="M650 288V258"/><rect x="590" y="232" width="122" height="26" rx="3"/><text class="at-tv-out" x="600" y="250"></text></g>
  <g class="at-tag in"><circle cx="292" cy="300" r="4"/><path d="M292 296V268"/><rect x="226" y="242" width="132" height="26" rx="3"/><text class="at-tv-in" x="236" y="260"></text></g>
  <g class="at-tag u"><path d="M370 120H392"/><rect x="392" y="107" width="136" height="26" rx="3"/><text class="at-tv-u" x="402" y="125"></text></g>
</g>
</svg>`;

export function mountDayRoom(root) {
  if (!root) return null;
  const art = h('div', { class: 'at-art', html: SVG });
  // Rev.30 smooth: dust in the sunlight as composited HTML dots (transform/opacity only) — animating them inside the SVG repainted the whole drawing every frame
  const motes = h('div', { class: 'at-motes-h', 'aria-hidden': 'true' }, [...Array(14)].map((_, i) => h('i', { style: `left:${22 + (i * 37) % 52}%;top:${30 + (i * 23) % 52}%;animation-delay:${((i * 0.53) % 6).toFixed(2)}s;animation-duration:${7 + (i % 4)}s` })));
  art.append(motes, h('i', { class: 'at-scanbar', 'aria-hidden': 'true' }));   // Rev.31: a slow holographic scan across the room
  const timeOut = h('b', { class: 'at-clock' }), outT = h('b'), inT = h('b'), status = h('p', { class: 'at-st' });
  const range = h('input', { type: 'range', min: '6', max: '22', step: '0.25', value: '15', 'aria-label': 'เวลาของวัน' });
  const play = h('button', { type: 'button', class: 'at-play', 'aria-pressed': 'false' }, 'เล่นทั้งวัน');
  const onB = h('button', { type: 'button', 'aria-pressed': 'true' }, 'เปิดแอร์'), dirtyB = h('button', { type: 'button', 'aria-pressed': 'false' }, 'คอยล์สกปรก');
  const ctl = h('div', { class: 'at-ctl' },
    h('div', { class: 'at-read' }, h('div', {}, h('small', {}, 'เวลา'), timeOut), h('div', {}, h('small', {}, 'นอกบ้าน'), outT), h('div', { class: 'in' }, h('small', {}, 'ในห้อง'), inT)),
    h('label', { class: 'at-range' }, range), h('div', { class: 'at-tg' }, play, onB, dirtyB), status,
    h('p', { class: 'at-fine' }, `ภาพประกอบ · อุณหภูมิจากแบบจำลองห้องนั่งเล่น ${SC.w} × ${SC.d} ม. แอร์ ${CAP.toLocaleString('en-US')} BTU ของห้องจำลองบนเว็บ ไม่ใช่ค่าวัดจริง`));
  root.append(h('div', { class: 'at-room' }, art, ctl));
  runWhenVisible(art);
  let seen = false;
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { seen = es.some(e => e.isIntersecting); sound.focus(seen); if (seen) paint(); else sound.air(0); }, { threshold: 0.3 }).observe(art);   // Rev.30 smooth: curtains, motes, leaves and breeze animate only while the room is on screen
  const svg = $('svg', art), s0 = $('.at-s0', art), s1 = $('.at-s1', art), sun = $('.at-sun', art), moon = $('.at-moon', art), tint = $('.at-tint', art),
    shaft = $('.at-shaft', art), glow = $('.at-glow', art), breeze = $('.at-breeze', art), lights = $('.at-lights', art), wall = $('.at-wall', art), disp = $('.at-ud', art),
    bloom = $('.at-bloom', art), tvOut = $('.at-tv-out', art), tvIn = $('.at-tv-in', art), tvU = $('.at-tv-u', art), rings = $('.at-rings', art),
    flIn = $('.at-flow .in', art), flOut = $('.at-flow .out', art), flInT = $('.at-fl-in', art), flOutT = $('.at-fl-out', art);
  for (let i = 0; i < 40; i++) { const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('x', 446 + (i * 53) % 300); r.setAttribute('y', 270 + (i * 29) % 56); r.setAttribute('width', 3); r.setAttribute('height', 3); lights.append(r); }
  let hr = 15, on = true, dirt = 0.05;
  function paint() {
    const [top, hor] = skyAt(hr); s0.setAttribute('stop-color', top); s1.setAttribute('stop-color', hor);
    const day = clamp(Math.sin(Math.PI * (hr - 6) / 12.5)), night = 1 - clamp((hr < 12 ? hr - 5.5 : 19.5 - hr) / 1.5);
    const sx = lerp(470, 720, clamp((hr - 6) / 12.5)), sy = 300 - 230 * day;
    sun.setAttribute('cx', sx.toFixed(1)); sun.setAttribute('cy', sy.toFixed(1)); sun.style.opacity = day > 0.02 ? 1 : 0;
    // ★Rev.32 light: the sun blooms past the window frame, strongest low in the sky (golden hour), gone at night
    bloom.setAttribute('cx', sx.toFixed(1)); bloom.setAttribute('cy', sy.toFixed(1)); bloom.style.opacity = (day > 0.02 ? 0.5 + 0.5 * (1 - day) : 0).toFixed(2);
    moon.style.opacity = night.toFixed(2);
    // light shaft follows the sun: low sun reaches deeper into the room
    const reach = lerp(120, 520, clamp(1 - day)), base = lerp(560, 300, clamp((hr - 6) / 12.5));
    shaft.setAttribute('points', `470,90 720,90 ${base + 160},520 ${base - reach},520`); shaft.style.opacity = (day * 0.9 * (hr > 17 ? 1.2 : 1)).toFixed(2);
    tint.style.fill = night > 0.5 ? `rgba(10,14,40,${(night * 0.42).toFixed(2)})` : `rgba(255,170,90,${(hr > 16 ? (hr - 16) * 0.06 : 0).toFixed(2)})`;
    glow.style.opacity = clamp(night * 1.1).toFixed(2); lights.style.opacity = night.toFixed(2); motes.style.opacity = (day * 0.9).toFixed(2);
    wall.style.fill = mix('#efe6d8', '#f6efe4', day);
    breeze.style.opacity = on ? (effects(dirt).air * 0.9).toFixed(2) : 0; breeze.style.setProperty('--dur', (on ? 3.2 / effects(dirt).air : 3) + 's');
    const T = roomAt(hr, dirt, on), O = outAt(hr);
    disp.textContent = on ? '25' : '';
    // Rev.31 HUD tags: the same model numbers as the read-out below, pinned where they happen
    tvOut.textContent = `นอก ${O.toFixed(1)}°C`; tvIn.textContent = `ในห้อง ${T.toFixed(1)}°C`;
    tvU.textContent = on ? `ลมผ่านคอยล์ ${Math.round(effects(dirt).air * 100)}%` : 'แอร์ปิด';
    rings.style.stroke = mix('#3FA9FF', '#FF8A4C', clamp((T - 25) / 6));
    // ★Rev.31.1 heat flow: in through the glass (outdoor–indoor gap, stronger in the sun), out through the unit while it runs — illustration
    const kin = clamp((O - T) / 10) * (0.35 + 0.65 * day), kout = on ? effects(dirt).air * 0.9 : 0;
    flIn.style.opacity = flInT.style.opacity = kin.toFixed(2); flOut.style.opacity = flOutT.style.opacity = kout.toFixed(2);
    if (seen) sound.air(on ? effects(dirt).air * 0.85 : 0);   // ★Rev.32 the unit's air, heard only while the room is on screen
    timeOut.textContent = `${String(Math.floor(hr)).padStart(2, '0')}:${String(Math.round((hr % 1) * 60)).padStart(2, '0')}`;
    outT.textContent = O.toFixed(1) + '°C'; inT.textContent = T.toFixed(1) + '°C';
    status.textContent = !on ? 'ปิดแอร์: ห้องร้อนตามอากาศนอกบ้าน' : T <= 25.05 ? 'ตั้ง 25°C · ห้องอยู่ที่อุณหภูมิที่ตั้งไว้' : `ตั้ง 25°C · ช่วงนี้เครื่องทำได้แค่ ${T.toFixed(1)}°C${dirt > 0.5 ? ' (คอยล์สกปรก ลมผ่านได้น้อย)' : ''}`;
    root.style.setProperty('--at-warm', clamp((T - 24) / 8).toFixed(2));
  }
  range.addEventListener('input', () => { hr = Number(range.value); paint(); });
  onB.addEventListener('click', () => { on = !on; onB.setAttribute('aria-pressed', on); paint(); });
  dirtyB.addEventListener('click', () => { dirt = dirt > 0.5 ? 0.05 : 0.85; dirtyB.setAttribute('aria-pressed', dirt > 0.5); paint(); });
  let raf = 0, last = 0;
  play.addEventListener('click', () => {
    const p = play.getAttribute('aria-pressed') !== 'true'; play.setAttribute('aria-pressed', p);
    cancelAnimationFrame(raf); if (!p) return; last = performance.now();
    const step = now => { const dt = (now - last) / 1000; last = now; hr += dt * 1.1; if (hr > 22) hr = 6; range.value = hr; paint(); if (play.getAttribute('aria-pressed') === 'true') raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  });
  // pointer parallax (fine pointers, motion allowed)
  if (!RM() && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const layers = [...svg.querySelectorAll('.at-l')];
    // Rev.30 smooth: one layout read per frame (rAF), not one per pointer event
    let px = 0, py = 0, pend = false;
    art.addEventListener('pointermove', e => { const r = art.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5; if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; layers.forEach(l => { const d = Number(l.dataset.depth); l.style.transform = `translate(${(-px * 40 * d).toFixed(1)}px,${(-py * 24 * d).toFixed(1)}px)`; }); }); }, { passive: true });
    art.addEventListener('pointerleave', () => layers.forEach(l => l.style.transform = ''));
  }
  paint();
  return { setHour(v) { hr = v; range.value = v; paint(); }, state: () => ({ hr, on, dirt }) };
}
