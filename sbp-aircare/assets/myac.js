// SBP AirCare — "แอร์ของฉัน" (design A · Bento) — Rev.35 (owner 6 ต.ค. 2569: "A B C เป็นการพัฒนาจากต้นฉบับเดิมให้แตกออกมาให้ดีกว่าเดิม
// ที่สุด เพิ่มลูกเล่นต่าง ๆ")
// A bento board of the visitor's own units: each tile knows its room, type, size, when it was last cleaned and what is around it,
// and says how dusty it probably is now, when the next cleaning is due and what a standard cleaning costs. "จองล้างเครื่องที่ถึงรอบ"
// opens the 3-step booking already holding those units by type.
//   · every figure comes from the room model the room simulator uses (studio-model: dust rate × pets / location, dirtFrom,
//     effects, cleanInterval) and the Pricebook standard rate (cleanRate) — an estimate, said so on the board
//   · kept in this browser only (localStorage 'sbp-myac-v1'), nothing is sent until the visitor books
import { h, baht, cleanRate } from './sbp-core.js';
import { SCENE_BY_ID, dustRate, envF, dirtFrom, effects, cleanInterval, dirtTh, LOCS } from './studio-model.js';

const KEY = 'sbp-myac-v1';
const ROOMS = ['bedroom', 'master', 'kids', 'living', 'kitchen', 'study', 'condobed', 'condoliving', 'condostudio', 'openoffice', 'meeting', 'shop', 'restaurant', 'cafe'];
const TYPES = [['wall', 'ติดผนัง'], ['ceiling', 'แขวนใต้ฝ้า'], ['cassette', 'สี่ทิศทาง'], ['floor', 'ตู้ตั้งพื้น']];
const SIZES = { wall: ['9,000–18,000', '19,000–24,000', '25,000–36,000', 'มากกว่า 36,000'], other: ['ไม่เกิน 24,000', '25,000–36,000', '37,000–48,000', '49,000–60,000'] };
const AGO = [[1, '1 เดือน'], [3, '3 เดือน'], [6, '6 เดือน'], [9, '9 เดือน'], [12, '1 ปี'], [18, '1 ปีครึ่ง'], [24, '2 ปีขึ้นไป']];
const load = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j && Array.isArray(j.units) ? j : null; } catch (e) { return null; } };
const save = S => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* the board works without storage */ } };
const fresh = () => ({ units: [{ id: 1, room: 'bedroom', type: 'wall', size: 0, ago: 6 }], cats: 0, dogs: 0, loc: 'city' });

/** one unit → what the room model says about it today */
export function unitState(u, env) {
  const sc = SCENE_BY_ID[u.room] || SCENE_BY_ID.bedroom, f = envF(env).total, rate = dustRate(sc) * f;
  const dirt = dirtFrom(u.ago, rate), every = cleanInterval(rate).months, fx = effects(dirt);
  const r = cleanRate('Basic Clean', 'C1', u.type, u.size);
  return { sc, dirt, th: dirtTh(dirt), every, due: Math.max(0, every - u.ago), late: u.ago >= every, air: Math.round(fx.air * 100), power: Math.round((fx.power - 1) * 100), price: r && r.rate.s };
}

export function mountMyAc(root, { prefill = null, go = () => {} } = {}) {
  let S = load() || fresh();
  const board = h('div', { class: 'ma-board' }), sum = h('div', { class: 'ma-sum', 'aria-live': 'polite' });
  const env = h('div', { class: 'ma-env' });
  root.append(h('div', { class: 'ma' }, sum, board, env,
    h('p', { class: 's-note ma-note' }, 'ประมาณการจากแบบจำลองห้องเดียวกับห้องจำลองบนเว็บ (อัตราฝุ่นตามประเภทห้อง สัตว์เลี้ยง และที่ตั้ง) ไม่ใช่ผลตรวจเครื่องจริง · ราคาล้างปกติ Basic Clean อัตรามาตรฐาน ก่อน VAT · ข้อมูลเก็บในเครื่องนี้เท่านั้น')));
  const sel = (label, value, opts, on) => h('label', { class: 'ma-f' }, h('span', {}, label), h('select', { onchange: e => on(e.target.value) }, opts.map(([v, t]) => h('option', { value: v, selected: String(v) === String(value) }, t))));
  function draw() {
    save(S); board.innerHTML = ''; const E = { cats: S.cats, dogs: S.dogs, loc: S.loc };
    const st = S.units.map(u => [u, unitState(u, E)]);
    st.forEach(([u, s], i) => {
      const lvl = s.late ? 'due' : s.due <= 1 ? 'soon' : 'ok';
      board.append(h('article', { class: 'ma-unit ma-' + lvl, style: `--d:${s.dirt.toFixed(2)}` },
        h('div', { class: 'ma-top' }, h('b', {}, `เครื่องที่ ${i + 1}`), h('span', { class: 'ma-badge' }, lvl === 'due' ? 'ถึงรอบล้างแล้ว' : lvl === 'soon' ? 'ใกล้ถึงรอบ' : 'ยังไม่ถึงรอบ'),
          S.units.length > 1 ? h('button', { type: 'button', class: 'ma-x', 'aria-label': `ลบเครื่องที่ ${i + 1}`, onclick: () => { S.units = S.units.filter(x => x !== u); draw(); } }, '×') : null),
        h('div', { class: 'ma-fields' },
          sel('ห้อง', u.room, ROOMS.map(id => [id, SCENE_BY_ID[id].th]), v => { u.room = v; draw(); }),
          sel('ประเภท', u.type, TYPES, v => { u.type = v; draw(); }),
          sel('ขนาด (BTU)', u.size, (u.type === 'wall' ? SIZES.wall : SIZES.other).map((t, k) => [k, t]), v => { u.size = +v; draw(); }),
          sel('ล้างครั้งล่าสุด', u.ago, AGO.map(([m, t]) => [m, t + 'ก่อน']), v => { u.ago = +v; draw(); })),
        h('div', { class: 'ma-gauge', role: 'img', 'aria-label': `ฝุ่นสะสมประมาณ ${Math.round(s.dirt * 100)}% · ${s.th}` }, h('i')),
        h('dl', { class: 'ma-read' },
          h('dt', {}, 'ตอนนี้'), h('dd', {}, s.th),
          h('dt', {}, 'ลมออก'), h('dd', {}, `≈ ${s.air}%`),
          h('dt', {}, 'ค่าไฟเพิ่ม'), h('dd', {}, s.power ? `≈ +${s.power}%` : '—'),
          h('dt', {}, 'ควรล้างทุก'), h('dd', {}, `${s.every} เดือน`),
          h('dt', {}, 'ค่าล้างปกติ'), h('dd', {}, s.price != null ? `${baht(s.price)} ก่อน VAT` : 'ประเมินหน้างาน'))));
    });
    if (S.units.length < 12) board.append(h('button', { type: 'button', class: 'ma-add', onclick: () => { const l = S.units[S.units.length - 1]; S.units.push({ ...l, id: Date.now() }); draw(); } }, h('b', {}, '+'), h('span', {}, 'เพิ่มเครื่อง')));
    const due = st.filter(([, s]) => s.late), soon = st.filter(([, s]) => !s.late && s.due <= 1);
    const byType = {}; due.forEach(([u]) => { byType[u.type] = (byType[u.type] || 0) + 1; });
    const ex = due.reduce((n, [, s]) => n + (s.price || 0), 0);
    sum.innerHTML = '';
    sum.append(h('div', { class: 'ma-k' }, h('b', {}, String(S.units.length)), h('span', {}, 'เครื่องของคุณ')),
      h('div', { class: 'ma-k ma-k-due' }, h('b', {}, String(due.length)), h('span', {}, 'ถึงรอบล้างแล้ว')),
      h('div', { class: 'ma-k' }, h('b', {}, String(soon.length)), h('span', {}, 'ถึงรอบภายใน 1 เดือน')),
      h('div', { class: 'ma-k' }, h('b', {}, due.length ? baht(ex) : '—'), h('span', {}, 'ค่าล้างเครื่องที่ถึงรอบ (ก่อน VAT · ยังไม่รวมค่าเดินทาง)')),
      due.length && prefill ? h('button', { type: 'button', class: 's-btn primary ma-go', onclick: () => { prefill(Object.fromEntries(TYPES.map(([t]) => [t, byType[t] || 0]))); go('book'); } }, `จองล้าง ${due.length} เครื่องที่ถึงรอบ`) : null);
    env.innerHTML = '';
    env.append(h('b', {}, 'รอบตัวบ้าน'),
      sel('แมว', S.cats, [0, 1, 2, 3].map(n => [n, n ? `${n} ตัว` : 'ไม่มี']), v => { S.cats = +v; draw(); }),
      sel('สุนัข', S.dogs, [0, 1, 2, 3].map(n => [n, n ? `${n} ตัว` : 'ไม่มี']), v => { S.dogs = +v; draw(); }),
      sel('ที่ตั้ง', S.loc, LOCS.map(l => [l.id, l.th]), v => { S.loc = v; draw(); }));
  }
  draw();
  return { state: () => S, reset: () => { S = fresh(); draw(); } };
}
