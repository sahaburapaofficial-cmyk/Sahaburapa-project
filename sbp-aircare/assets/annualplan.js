// SBP AirCare — annual cleaning plan, animated through the year ("4D" = the building over 12 months) — Rev.26
// (owner 4 ต.ค. 2569: "หน้าสำหรับองค์กร ประเมินงบล้างแอร์ทั้งปี เพิ่ม Animation 4D 3D ไปช่องว่างไม่ให้ Blank space ว่างเปล่า จัดทำให้
// สอดคล้องกับแผนงานล้างสำหรับองค์กรที่ทำให้ดูเป็นระบบมาตรฐานและดูมีระดับ เพื่อให้เข้าใจและใช้งานง่าย")
//   · listens to the contract builder (proto-ui mountBuilder → event 'sbp:builder' on its root): every figure comes from the same
//     estimateContract() result (standard rates, before VAT) — nothing new is priced here
//   · planMonths(visits, deep) = an example schedule (deep clean C2 before the hot season, the rest spread evenly) — the team agrees
//     the real dates with the building; seasons are Thai Meteorological Department seasons
//   · the building: units collect dust between visits and are cleaned one by one in each round; a playhead runs Jan → Dec, the cumulative
//     budget steps up at each round. Reduced motion / off screen = still frame at the first round
import { h, baht } from './sbp-core.js';

export const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
// Thai Meteorological Department: summer mid-Feb – mid-May, rainy mid-May – mid-Oct, winter mid-Oct – mid-Feb
export const SEASONS = [{ th: 'หนาว', a: 0, b: 1.5, c: 'cool' }, { th: 'ร้อน', a: 1.5, b: 4.5, c: 'hot' }, { th: 'ฝน', a: 4.5, b: 9.5, c: 'rain' }, { th: 'หนาว', a: 9.5, b: 12, c: 'cool' }];
/** example months (0 = Jan) for n visits a year; the first is the deep clean when deep */
export function planMonths(visits, deep = true) {
  const M = { 1: [1], 2: [1, 7], 3: [1, 5, 9], 4: [0, 3, 6, 9], 6: [0, 2, 4, 6, 8, 10], 12: [...Array(12).keys()] }[visits] || [...Array(visits)].map((_, i) => Math.floor(i * 12 / visits));
  return M.map((m, i) => ({ m, deep: deep && i === 0 }));
}
const TYPE_C = { wall: '#0B74B5', ceiling: '#3a8f6b', cassette: '#7b5cc4', floor: '#c47a1c', duct: '#5b6b7d' };
const reportOf = pkg => pkg === 'Basic Clean' ? 'ใบรับมอบงานแบบย่อ' : pkg === 'Corporate Control' ? 'Asset Report รายเครื่อง' : 'Service Report พร้อมภาพก่อน–หลัง';

export function mountAnnualPlan(builderRoot, { builder } = {}) {
  if (!builderRoot) return null;
  const host = builderRoot.querySelector('.opts, .bopts');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svgT = h('div', { class: 'yp-tl', 'aria-hidden': 'true', tabindex: '-1' }), svgB = h('div', { class: 'yp-bld', 'aria-hidden': 'true' });
  const now = h('div', { class: 'yp-now', 'aria-live': 'polite' }), list = h('ol', { class: 'yp-list' });
  const play = h('button', { type: 'button', class: 'yp-play', 'aria-pressed': 'true' }, 'หยุดภาพเคลื่อนไหว');
  const panel = h('div', { class: 'yp' },
    h('div', { class: 'yp-h' }, h('div', {}, h('b', {}, 'แผนงานล้างทั้งปี'), h('small', {}, 'ตัวอย่างการวางรอบจากจำนวนเครื่องและความถี่ที่เลือก · ทีมนัดวันจริงตามความสะดวกของอาคาร')), RM ? null : play),
    svgT, h('div', { class: 'yp-row' }, svgB, now), list);
  (host ? host.after(panel) : builderRoot.append(panel));
  // the empty cell in a two-column card grid (A: five unit cards) gets the year-at-a-glance ring
  const cards = builderRoot.querySelector('#ucards'), ring = cards ? h('div', { class: 'yp-ring', 'aria-hidden': 'true' }) : null;
  if (ring) cards.append(ring);

  let S = null, t = 0, last = 0, running = !RM, seen = false, raf = 0;
  play.onclick = () => { running = !running; play.setAttribute('aria-pressed', String(running)); play.textContent = running ? 'หยุดภาพเคลื่อนไหว' : 'เล่นภาพเคลื่อนไหว'; if (running) loop(); };

  function setup(e, st) {
    if (!e || !e.count) { S = null; panel.hidden = true; if (ring) ring.hidden = true; return; }
    panel.hidden = false; if (ring) ring.hidden = false;
    const V = planMonths(st.visits, st.deep !== false), units = [];
    Object.entries(st.units).forEach(([k, n]) => { for (let i = 0; i < n; i++) units.push(k); });
    const shown = units.length > 60 ? units.filter((_, i) => i % Math.ceil(units.length / 60) === 0) : units;
    const vis = V.map((v, i) => ({ ...v, i, ex: v.deep ? e.perVisitC2 : e.perVisitC1 }));
    let acc = 0; vis.forEach(v => { acc += v.ex; v.acc = acc; });
    S = { e, st, vis, units: shown, total: acc, pkg: st.pkg || 'Standard Care' };
    drawTimeline(); drawList(); frame(RM ? vis[0].m + 0.95 : t); loop();
  }
  const X = m => 40 + m / 12 * 1120;
  function drawTimeline() {
    const { vis, total } = S, Y = v => 150 - v / total * 90;
    let p = `M ${X(0)} 150`; vis.forEach(v => { p += ` H ${X(v.m + 0.5)} V ${Y(v.acc)}`; }); p += ` H ${X(12)}`;
    svgT.innerHTML = `<svg viewBox="0 0 1200 200">
      ${SEASONS.map(s => `<rect class="yp-s ${s.c}" x="${X(s.a)}" y="20" width="${X(s.b) - X(s.a)}" height="140"/><text class="yp-st" x="${(X(s.a) + X(s.b)) / 2}" y="34">${s.th}</text>`).join('')}
      ${MONTHS.map((m, i) => `<line class="yp-g" x1="${X(i)}" x2="${X(i)}" y1="20" y2="160"/><text class="yp-m" x="${X(i + 0.5)}" y="182">${m}</text>`).join('')}
      <path class="yp-cum" d="${p}"/>
      ${vis.map(v => `<g class="yp-v${v.deep ? ' deep' : ''}" data-i="${v.i}"><circle cx="${X(v.m + 0.5)}" cy="${Y(v.acc)}" r="9"/><text x="${X(v.m + 0.5)}" y="${Y(v.acc) - 16}">${v.deep ? 'C2' : 'C1'}</text></g>`).join('')}
      <text class="yp-tot" x="1156" y="${Y(total) - 10}">${baht(total)}</text>
      <line class="yp-ph" x1="0" x2="0" y1="16" y2="164"/></svg>`;
  }
  function drawList() {
    list.innerHTML = '';
    S.vis.forEach(v => list.append(h('li', { 'data-i': v.i, class: v.deep ? 'deep' : '' },
      h('span', {}, MONTHS[v.m]), h('b', {}, `รอบ ${v.i + 1} · ${v.deep ? 'ล้างใหญ่ C2' : 'ล้างปกติ C1'}`),
      h('small', {}, `${S.e.count} เครื่อง · ${S.e.teamDaysPerVisit} ทีม-วัน · ${baht(v.ex)} ก่อน VAT`))));
  }
  // dirt of each unit at time tm (months): grows since the last round, reset unit by unit during a round
  function state(tm) {
    const { vis } = S, n = S.units.length;
    let cur = null, prev = vis[vis.length - 1], since;
    for (const v of vis) { if (tm >= v.m && tm < v.m + 1) cur = v; if (v.m <= tm) prev = v; }
    since = tm - prev.m - 1; if (since < 0) since += 12;
    const gap = 12 / vis.length, base = Math.min(1, Math.max(0, since / (gap * 1.2)));
    const done = cur ? Math.floor((tm - cur.m) * 1.15 * n) : -1;
    return { cur, dirt: i => cur ? (i < done ? 0 : Math.min(1, (12 / vis.length) / (gap * 1.2))) : base, done: Math.max(0, Math.min(n, done)) };
  }
  function drawBuilding(st) {
    const n = S.units.length, per = Math.min(10, Math.max(4, Math.ceil(Math.sqrt(n * 1.6)))), floors = Math.ceil(n / per);
    const W = 260, fh = Math.min(34, 190 / Math.max(1, floors)), top = 220 - floors * fh;
    const col = d => { const a = [90, 200, 250], b = [176, 138, 90]; return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * d)).join(',')})`; };
    let g = `<polygon class="yp-roof" points="20,${top} ${20 + W},${top} ${44 + W},${top - 16} 44,${top - 16}"/><polygon class="yp-side" points="${20 + W},${top} ${44 + W},${top - 16} ${44 + W},${204} ${20 + W},220"/>`;
    for (let f = 0; f < floors; f++) {
      const y = top + f * fh; g += `<rect class="yp-fl" x="20" y="${y}" width="${W}" height="${fh}"/>`;
      for (let j = 0; j < per; j++) { const i = f * per + j; if (i >= n) break;
        const x = 30 + j * (W - 20) / per, d = st.dirt(i), active = st.cur && i === st.done;
        g += `<rect x="${x}" y="${y + fh * 0.3}" width="${(W - 20) / per - 6}" height="${fh * 0.4}" rx="2" fill="${col(d)}" stroke="${TYPE_C[S.units[i]]}" stroke-width="1.6"/>${active ? `<circle class="yp-crew" cx="${x + 6}" cy="${y + fh * 0.5}" r="${Math.max(3, fh * 0.2)}"/>` : ''}`; }
    }
    svgB.innerHTML = `<svg viewBox="0 0 320 236">${g}<rect class="yp-gr" x="0" y="220" width="320" height="16"/></svg>`;
  }
  function frame(tm) {
    if (!S) return;
    const st = state(tm), ph = svgT.querySelector('.yp-ph'), x = X(tm);
    if (ph) { ph.setAttribute('x1', x); ph.setAttribute('x2', x); }
    svgT.querySelectorAll('.yp-v').forEach(g => g.classList.toggle('on', st.cur && +g.dataset.i === st.cur.i));
    list.querySelectorAll('li').forEach(li => li.classList.toggle('on', st.cur && +li.dataset.i === st.cur.i));
    drawBuilding(st);
    const spent = S.vis.filter(v => v.m + 1 <= tm || (st.cur && v.i === st.cur.i)).reduce((a, v) => a + v.ex, 0);
    const txt = st.cur ? `${MONTHS[st.cur.m]} · รอบ ${st.cur.i + 1} ${st.cur.deep ? 'ล้างใหญ่ C2' : 'ล้างปกติ C1'} · ล้างแล้ว ${Math.round(st.done / S.units.length * S.e.count)} / ${S.e.count} เครื่อง` : `${MONTHS[Math.floor(tm) % 12]} · ใช้งานตามปกติ ฝุ่นค่อย ๆ สะสมจนถึงรอบถัดไป`;
    now.replaceChildren(h('b', {}, txt), h('dl', {},
      h('dt', {}, 'งบสะสมถึงเดือนนี้'), h('dd', {}, `${baht(spent)} / ${baht(S.total)}`),
      h('dt', {}, 'รอบต่อปี'), h('dd', {}, `${S.vis.length} รอบ · ${S.e.teamDaysPerVisit} ทีม-วัน ต่อรอบ`),
      h('dt', {}, 'เอกสารหลังทุกรอบ'), h('dd', {}, `${reportOf(S.pkg)} · ${S.e.count * S.vis.length} รายการต่อปี`),
      h('dt', {}, 'จ่ายตามรอบ'), h('dd', {}, 'วางบิลหลังจบแต่ละรอบ ไม่ต้องจ่ายทั้งปีล่วงหน้า')),
      h('small', {}, 'ภาพเคลื่อนไหวเพื่ออธิบายแผน · ฝุ่นในภาพเป็นภาพประกอบ ไม่ใช่ค่าที่วัด · ราคามาตรฐานก่อน VAT ตาม Pricebook'));
    if (ring) ring.style.setProperty('--p', (tm / 12 * 100).toFixed(1));
    if (ring) ring.dataset.m = MONTHS[Math.floor(tm) % 12];
  }
  function loop() {
    cancelAnimationFrame(raf);
    if (!running || !seen || !S) return;
    raf = requestAnimationFrame(now2 => { const dt = last ? Math.min(0.1, (now2 - last) / 1000) : 0; last = now2; t = (t + dt * 12 / 24) % 12; frame(t); loop(); });
  }
  new IntersectionObserver(es => { seen = es.some(x => x.isIntersecting); last = 0; if (seen) loop(); }, { threshold: 0.15 }).observe(panel);
  builderRoot.addEventListener('sbp:builder', ev => setup(ev.detail.e, ev.detail.state));
  if (builder && builder.estimate) setup(builder.estimate(), builder.state());
  return { frame: tm => { t = tm; frame(tm); }, stop: () => { running = false; } };
}
