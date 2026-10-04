// SBP AirCare — animated illustrations for symptoms and knowledge topics — Rev.26 (owner 4 ต.ค. 2569: "ในส่วนความรู้ ลองเอง และข้อมูล
// อื่น ๆ สำหรับปัญหาเบื้องต้น ทำเป็น animation เพิ่มได้ จัดทำมาเพื่อให้สอดคล้องกับข้อมูลและสวยงามเพลิดเพลิน")
//   · one wall unit drawn once, each symptom adds what the customer sees at home (warm air, drops, ice, a dark display, a blinking lamp,
//     a tripped breaker, on/off cycling, noise rings, odour, short air, a stuck louver, water at the outdoor unit, a fast meter, a
//     calendar) — illustrations only, never a diagnosis; the triage text beside it stays the source
//   · SVG + CSS (shared.css .ai-*): no WebGL, no extra context, still under prefers-reduced-motion
import { h } from './sbp-core.js';

const UNIT = `<rect x="40" y="18" width="120" height="40" rx="10" class="ai-body"/><rect x="48" y="50" width="104" height="5" rx="2.5" class="ai-vent"/><rect x="130" y="26" width="16" height="8" rx="2" class="ai-disp"/>`;
const air = (cls, n = 5, len = 34) => [...Array(n)].map((_, i) => `<path class="ai-air ${cls}" d="M${58 + i * 20} 60 q 4 ${len / 2} -2 ${len}" style="animation-delay:${i * 0.18}s"/>`).join('');
const SYM = {
  warm: UNIT + air('warm') + `<g class="ai-th"><rect x="172" y="30" width="8" height="50" rx="4" class="ai-thb"/><rect x="173.5" y="50" width="5" height="28" rx="2.5" class="ai-thv warm"/></g>`,
  drip: UNIT + [0, 1, 2].map(i => `<circle class="ai-drop" cx="${70 + i * 30}" cy="60" r="3.2" style="animation-delay:${i * 0.5}s"/>`).join('') + `<path d="M50 112 h100" class="ai-floor"/><ellipse cx="100" cy="110" rx="26" ry="3" class="ai-pool"/>`,
  ice: UNIT + [...Array(7)].map((_, i) => `<path class="ai-ice" d="M${52 + i * 15} 55 l3 7 l3 -7" style="animation-delay:${i * 0.25}s"/>`).join('') + air('cold', 3, 18),
  dead: UNIT.replace('ai-disp', 'ai-disp off') + `<g class="ai-rem"><rect x="168" y="70" width="18" height="34" rx="4" class="ai-remb"/><circle cx="177" cy="78" r="3" class="ai-remk"/></g><path class="ai-sig" d="M164 70 q -8 -8 -16 -10"/>`,
  code: UNIT.replace('ai-disp', 'ai-disp blink') + `<path class="ai-code" d="M133 30 h4 M139 30 h4"/><circle cx="62" cy="30" r="3" class="ai-lamp"/>`,
  trip: `<rect x="70" y="14" width="60" height="92" rx="6" class="ai-panel"/><rect x="88" y="34" width="24" height="40" rx="4" class="ai-sw"/><rect x="91" y="37" width="18" height="16" rx="3" class="ai-tog"/><path class="ai-spark" d="M140 40 l8 -6 l-3 8 l9 -4"/>`,
  cycle: UNIT + `<g class="ai-cyc">${air('cold', 5, 26)}</g><path class="ai-clock" d="M176 92 a12 12 0 1 1 0.1 0"/><path class="ai-hand" d="M176 92 v-8"/>`,
  noise: [0, 1, 2].map(i => `<path class="ai-wave" d="M${164 + i * 8} 26 q 6 12 0 24" style="animation-delay:${i * 0.25}s"/>`).join('') + `<g class="ai-shake">${UNIT}</g>`,
  smell: UNIT + air('cold', 3, 20) + [0, 1, 2].map(i => `<path class="ai-odour" d="M${74 + i * 26} 66 q 6 8 0 16 q -6 8 0 16" style="animation-delay:${i * 0.6}s"/>`).join(''),
  weak: UNIT + air('cold short', 5, 14) + `<rect x="48" y="40" width="104" height="10" class="ai-dust"/>`,
  swing: UNIT + `<rect x="50" y="56" width="100" height="4" rx="2" class="ai-louver"/><path class="ai-x" d="M160 66 l10 10 m0 -10 l-10 10"/>`,
  cduwater: `<rect x="44" y="26" width="112" height="70" rx="6" class="ai-ou"/><circle cx="90" cy="61" r="24" class="ai-fan"/><rect x="124" y="38" width="22" height="46" class="ai-fin"/>` + [0, 1].map(i => `<circle class="ai-drop" cx="${70 + i * 60}" cy="98" r="3" style="animation-delay:${i * 0.7}s"/>`).join(''),
  bill: `<rect x="60" y="14" width="80" height="92" rx="8" class="ai-panel"/><circle cx="100" cy="52" r="24" class="ai-meter"/><path class="ai-needle" d="M100 52 l16 -10"/><rect x="78" y="84" width="44" height="12" rx="2" class="ai-digits"/>`,
  care: `<rect x="50" y="20" width="100" height="84" rx="8" class="ai-cal"/><path d="M50 40 h100" class="ai-calh"/>` + [...Array(12)].map((_, i) => `<rect x="${58 + (i % 4) * 22}" y="${48 + Math.floor(i / 4) * 18}" width="16" height="12" rx="2" class="ai-day${[1, 5, 9].includes(i) ? ' on' : ''}" style="animation-delay:${i * 0.15}s"/>`).join(''),
};
// knowledge topics reuse the same drawing language
const GUIDE = {
  btu: UNIT + air('cold') + `<rect x="30" y="86" width="140" height="22" rx="4" class="ai-room"/>`,
  types: `<rect x="20" y="20" width="60" height="22" rx="7" class="ai-body"/><rect x="110" y="16" width="70" height="16" rx="3" class="ai-body"/><rect x="20" y="64" width="60" height="12" class="ai-body"/><rect x="132" y="56" width="30" height="56" rx="4" class="ai-body"/>` + air('cold', 2, 16),
  inverter: `<path class="ai-curve fix" d="M10 90 L40 40 L70 90 L100 40 L130 90 L160 40 L190 90"/><path class="ai-curve inv" d="M10 90 C40 30, 60 64, 190 62"/>`,
  clean: SYM.care, c1c2: `<rect x="40" y="18" width="120" height="40" rx="10" class="ai-ghost"/><g class="ai-lift">${UNIT}</g>`, install: `<path class="ai-pipe" d="M40 30 h120 v70"/><path class="ai-pipe in" d="M40 30 h120 v70"/>`,
  place: UNIT + air('cold') + `<circle cx="150" cy="96" r="8" class="ai-person"/>`, contract: SYM.care, packages: SYM.care, docs: `<rect x="60" y="12" width="80" height="100" rx="6" class="ai-doc"/>${[0, 1, 2, 3, 4].map(i => `<path class="ai-line" d="M72 ${34 + i * 14} h56" style="animation-delay:${i * 0.3}s"/>`).join('')}`,
  vrf: `<rect x="80" y="70" width="40" height="40" rx="4" class="ai-ou"/>${[30, 90, 150].map(x => `<rect x="${x}" y="14" width="30" height="14" rx="4" class="ai-body"/><path class="ai-pipe in" d="M100 70 V45 H${x + 15} V28"/>`).join('')}`,
  area: `<circle cx="100" cy="62" r="40" class="ai-ring"/><circle cx="100" cy="62" r="5" class="ai-hq"/><path class="ai-route" d="M100 62 L132 38"/>`,
};
const svg = (body, cls) => { const d = h('span', { class: 'ai ' + (cls || ''), 'aria-hidden': 'true' }); d.innerHTML = `<svg viewBox="0 0 200 120">${body}</svg>`; return d; };
export const symAnim = (id, cls) => SYM[id] ? svg(SYM[id], cls) : null;
export const guideAnim = (id, cls) => GUIDE[id] ? svg(GUIDE[id], cls) : null;
export const SYM_IDS = Object.keys(SYM), GUIDE_IDS = Object.keys(GUIDE);
