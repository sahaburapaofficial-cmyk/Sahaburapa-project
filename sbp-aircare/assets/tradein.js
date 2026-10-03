// SBP AirCare — "เทิร์นแอร์เก่า · ซ่อมหรือเปลี่ยนดี" — Rev.24 (owner 3 ต.ค. 2569: "เสริมระบบเทิร์นแอร์เก่า เพื่อกลุ่มลูกค้าต้องการ
// รีโนเวทพื้นที่ โดยแอร์มีอายุเกิน 7–10 ปีขึ้นไป เพื่อนำมาเป็นส่วนลดและลดค่าใช้จ่ายในการซ่อมแซมที่แพง")
//   · the visitor gives age, type, size, compressor system, refrigerant, the problem and how many units → side by side:
//     repair the old unit (repair lines from the Pricebook — lines without a standard rate stay "ประเมินหน้างาน", the known
//     part is shown as "อย่างน้อย") vs. trade it in for a new inverter unit (catalogue prices of that type and size + the
//     standard installation; taking the old unit out = "ประเมินหน้างาน") + electricity old vs new (studio-model energy())
//   · the trade-in value itself is not published: TRADE_IN.table stays null until the owner sets the table (by size / age /
//     condition) — until then "ทีมประเมินจากรุ่น อายุ และสภาพจริง แล้วหักในใบเสนอราคา" (CLAUDE.md §6.6 rules 3–4: no discount
//     figure or % on the page; "ช่องไหนว่างอย่าเดาใส่")
//   · verdict = rules of thumb technicians use (age, major fault, R22, repair ≥ 50 % of a new set, age × repair ≥ new set) —
//     shown as reasons, never as a promise (rule 11: no "ประหยัดไฟแน่นอน")
import { h, baht, DATA, DEMO, TYPES, TYPE_BY_ID, VOLUME_HINT, installOptions, btuFmt } from './sbp-core.js';
import { energy, RATE } from './studio-model.js';
import { cart } from './commerce.js';
import { askTeam } from './contact.js';
import { toast } from './proto-ui.js';

/** owner-set trade-in values: null = not published yet (the page then says the team assesses it) */
export const TRADE_IN = { table: null, minAge: 7 };

export const AGES = [
  { id: 'a3', th: 'ไม่ถึง 5 ปี', y: 3 }, { id: 'a6', th: '5–7 ปี', y: 6 }, { id: 'a8', th: '7–10 ปี', y: 8.5 },
  { id: 'a12', th: '10–15 ปี', y: 12 }, { id: 'a16', th: 'เกิน 15 ปี', y: 16 },
];
export const SIZES = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];
export const SYSTEMS = [{ id: 'fix', th: 'Fixed speed (ธรรมดา)' }, { id: 'inv', th: 'Inverter' }, { id: 'unk', th: 'ไม่ทราบ' }];
export const REFS = [{ id: 'r22', th: 'R22 (รุ่นเก่า)' }, { id: 'r410', th: 'R410A' }, { id: 'r32', th: 'R32' }, { id: 'unk', th: 'ไม่ทราบ' }];
// problems: major = the fault class where technicians weigh replacing an old unit
export const ISSUES = [
  { id: 'reno', th: 'ยังใช้ได้ แต่จะรีโนเวท / อยากเปลี่ยนให้ทันสมัย', major: false },
  { id: 'comp', th: 'คอมเพรสเซอร์เสีย / ไม่ติด / ตัดบ่อย', major: true },
  { id: 'leak', th: 'น้ำยารั่ว ต้องเติมบ่อย', major: true },
  { id: 'coilOut', th: 'แผงคอยล์ร้อนผุ / รั่ว', major: true },
  { id: 'coilIn', th: 'แผงคอยล์เย็นรั่ว', major: true },
  { id: 'board', th: 'บอร์ดควบคุมเสีย', major: false },
  { id: 'fanIn', th: 'มอเตอร์พัดลมคอยล์เย็นเสีย', major: false },
  { id: 'fanOut', th: 'มอเตอร์พัดลมคอยล์ร้อนเสีย', major: false },
  { id: 'weak', th: 'ไม่ค่อยเย็น ค่าไฟสูง ยังไม่รู้สาเหตุ', major: false },
];
const AGE_LOSS = y => Math.min(0.15, Math.max(0, y - 3) * 0.01);   // assumed efficiency loss with age: 1 %/yr after year 3, at most 15 %

const rep = re => DATA.rep.find(r => re.test(r.name));
const line = (r, qty = 1, note) => (r ? { name: r.name, ex: r.rate.s, unit: r.unit, qty, note } : null);
/** repair lines for one unit, from the Pricebook (rate.s null = assessed on site) */
export function repairLines(x) {
  const big = x.btu > 36000, inv = x.sys === 'inv', r22 = x.ref === 'r22';
  const refill = rep(r22 ? /^เติมสารทำความเย็น R22/ : /^เติมสารทำความเย็น R32\/R410A/);
  const sealed = [rep(/^Recover\//), rep(/^Vacuum ระบบอย่างเดียว/), refill];   // opening the refrigerant circuit
  const diag = rep(x.type === 'wall' ? /^ตรวจวินิจฉัยแอร์ติดผนัง/ : /^ตรวจวินิจฉัยแอร์แขวน/);
  const comp = inv ? /^เปลี่ยนคอมเพรสเซอร์ Inverter/ : x.btu <= 20000 ? /^เปลี่ยนคอมเพรสเซอร์ 9,000-20,000/ : x.btu <= 36000 ? /^เปลี่ยนคอมเพรสเซอร์ 21,000-36,000/ : /^เปลี่ยนคอมเพรสเซอร์ 37,000-60,000/;
  const L = {
    reno: [],
    comp: [rep(comp), rep(/^ตรวจรั่วด้วยไนโตรเจน/), ...sealed],
    leak: [rep(/^ตรวจรั่วด้วยไนโตรเจน/), rep(/^ซ่อมรั่วเฉพาะจุด/), refill],
    coilOut: [rep(/^เปลี่ยนแผงคอยล์ร้อน/), ...sealed],
    coilIn: [rep(/^เปลี่ยนแผงคอยล์เย็น/), ...sealed],
    board: [rep(inv ? /^ซ่อม\/เปลี่ยนบอร์ด Inverter/ : big ? /^ซ่อม\/เปลี่ยนบอร์ด Inverter/ : /^เปลี่ยนบอร์ดควบคุม Fixed Speed/)],
    fanIn: [rep(big ? /^เปลี่ยนมอเตอร์ FCU\/CDU/ : /^เปลี่ยนมอเตอร์คอยล์เย็น/)],
    fanOut: [rep(big ? /^เปลี่ยนมอเตอร์ FCU\/CDU/ : /^เปลี่ยนมอเตอร์คอยล์ร้อนพร้อมใบพัด/)],
    weak: [],
  }[x.issue] || [];
  if (x.issue === 'reno') return [];
  return [line(diag), ...L.map(r => line(r))].filter(Boolean);
}

/** the new unit: catalogue prices of the same type, inverter, nominal size (±10 %) + the standard installation + taking the old one out */
export function newSet(x) {
  const lo = x.btu * 0.9, hi = x.btu * 1.12;
  const px = DEMO.models.filter(m => m.type === x.type && m.inverter).flatMap(m => m.skus.filter(s => s.btu >= lo && s.btu <= hi && s.px > 0).map(s => s.px)).sort((a, b) => a - b);
  const med = px.length ? px[Math.floor((px.length - 1) / 2)] : null;
  const ins = (installOptions(x.type, x.btu).find(o => o.key === 'STANDARD') || {}).item || null;
  const I = c => DATA.instByCode[c];
  const rem = I({ wall: 'REM-W', ceiling: 'REM-C', cassette: 'REM-K', floor: 'REM-FS', duct: 'REM-DUCT' }[x.type]);
  const out = [I('REF-PUMPDOWN'), rem, I('DISPOSE')].filter(Boolean).map(i => ({ name: i.name + ' (เครื่องเดิม)', ex: i.ex ?? null, unit: i.unit, qty: 1 }));
  return { n: px.length, min: px[0] ?? null, max: px[px.length - 1] ?? null, med, install: ins ? { name: ins.name, ex: ins.ex } : null, out };
}

/** full comparison for x = { age, type, btu, sys, ref, issue, qty, hrs, rate } */
export function tradeIn(x) {
  const A = AGES.find(a => a.id === x.age) || AGES[2], I = ISSUES.find(i => i.id === x.issue) || ISSUES[0];
  const q = Math.max(1, Math.min(200, Math.round(+x.qty || 1)));
  const R = repairLines(x), known = R.reduce((a, l) => a + (l.ex ?? 0) * l.qty, 0), unknown = R.filter(l => l.ex == null).length;
  const N = newSet(x), setEx = N.med != null && N.install && N.install.ex != null ? N.med + N.install.ex : null;
  // electricity: old (age-worn; "ไม่ทราบ" counts as fixed speed from 7 years on) vs a new inverter unit, both clean
  const oldInv = x.sys === 'inv' || (x.sys === 'unk' && A.y < 7), hrs = +x.hrs || 8, rate = x.rate || RATE.home;
  const eOld = energy(x.btu, x.type, oldInv, hrs, 0, rate), eNew = energy(x.btu, x.type, true, hrs, 0, rate), loss = AGE_LOSS(A.y);
  const oldYear = eOld.bahtMonthClean * 12 / (1 - loss), newYear = eNew.bahtMonthClean * 12, save = Math.max(0, oldYear - newYear);
  // rules of thumb → verdict + reasons
  const why = [];
  if (A.y >= 10) why.push(`อายุเครื่อง ${A.th} อะไหล่และน้ำยาบางชนิดหายากขึ้น ค่าซ่อมครั้งต่อไปมีแนวโน้มสูงขึ้น`);
  if (I.major) why.push('อาการนี้ต้องเปิดระบบน้ำยา (เก็บน้ำยา ทำสุญญากาศ เติมใหม่) เป็นงานซ่อมใหญ่');
  if (x.ref === 'r22') { const a = rep(/^เติมสารทำความเย็น R22/), b = rep(/^เติมสารทำความเย็น R32\/R410A/); why.push(`ใช้น้ำยา R22 ซึ่งทยอยเลิกใช้ตามพิธีสารมอนทรีออล ค่าเติมตามตารางราคาเรา ${a ? baht(a.rate.s) : '—'} เทียบ R32/R410A ${b ? baht(b.rate.s) : '—'} (ไม่เกิน 1 kg)`); }
  if (setEx && known >= setEx * 0.5) why.push(`ค่าซ่อมที่รู้ราคาแล้ว ≥ ครึ่งหนึ่งของเครื่องใหม่พร้อมติดตั้ง (หลักคิด 50%)`);
  if (setEx && A.y >= 7 && known * A.y >= setEx) why.push(`อายุ × ค่าซ่อม (${A.y} ปี × ${baht(known)}) ≥ ราคาเครื่องใหม่พร้อมติดตั้ง`);
  if (A.y < 5 && I.id !== 'reno') why.push('เครื่องอายุไม่ถึง 5 ปี ตรวจใบรับประกันของผู้ผลิตก่อน อะไหล่บางชิ้นอาจยังอยู่ในประกัน');
  if (!oldInv && save > 0) why.push(`เครื่องเดิมเป็น Fixed speed ค่าไฟโดยประมาณสูงกว่าเครื่อง Inverter ใหม่ราว ${baht(Math.round(save / 100) * 100)} ต่อปีต่อเครื่อง`);
  let verdict;
  if (I.id === 'reno') verdict = A.y >= 10 ? 'replace' : A.y >= 7 ? 'compare' : 'keep';
  else if (I.id === 'weak') verdict = A.y >= 10 ? 'compare' : 'repair';
  else if ((I.major && A.y >= 10) || (I.major && x.ref === 'r22' && A.y >= 7) || (setEx && known >= setEx * 0.5)) verdict = 'replace';
  else if (I.major && A.y >= 7) verdict = 'compare';
  else if (setEx && A.y >= 7 && known * A.y >= setEx) verdict = 'compare';
  else verdict = 'repair';
  const VERD = {
    replace: ['เทิร์นเป็นเครื่องใหม่คุ้มกว่า', 'อายุและอาการนี้ ซ่อมแล้วมักเสียจุดอื่นตามมา เทิร์นเครื่องเดิมแล้วติดตั้งเครื่อง Inverter ใหม่ในวันเดียวกัน'],
    compare: ['ควรเทียบใบเสนอราคาทั้งสองทาง', 'ให้ทีมตรวจก่อน แล้วรับใบเสนอราคาซ่อม และใบเสนอราคาเครื่องใหม่หักมูลค่าเทิร์นพร้อมกัน'],
    repair: ['ซ่อมเครื่องเดิมคุ้มกว่า', 'อาการนี้ซ่อมได้ในราคามาตรฐาน ยังไม่ถึงจุดที่ควรเปลี่ยนเครื่อง'],
    keep: ['ยังไม่จำเป็นต้องเปลี่ยน', 'ถ้ารีโนเวทแล้วต้องย้ายตำแหน่ง ใช้บริการรื้อย้ายติดตั้งใหม่ และล้างเครื่องก่อนติดกลับ'],
  }[verdict];
  return {
    q, age: A, issue: I, repair: { lines: R, known, unknown }, set: N, setEx,
    energy: { old: oldYear, now: newYear, save, loss, oldInv, hrs },
    tradeValue: TRADE_IN.table ? TRADE_IN.table(x) : null,
    verdict, title: VERD[0], sub: VERD[1], why, special: q >= VOLUME_HINT, eligible: A.y >= TRADE_IN.minAge || I.major,
  };
}

/** UI — the section body (#tradein) */
export function mountTradeIn(root, { catalog, openCart } = {}) {
  if (!root) return null;
  const st = { age: 'a12', type: 'wall', btu: 12000, sys: 'unk', ref: 'unk', issue: 'comp', qty: 1, hrs: 8 };
  try { Object.assign(st, JSON.parse(localStorage.getItem('sbp-tradein') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('sbp-tradein', JSON.stringify(st)); } catch (e) {} };
  const form = h('div', { class: 'ti-form' }), out = h('div', { class: 'ti-out', 'aria-live': 'polite' });
  root.append(h('div', { class: 'ti' }, form, out));
  const seg = (label, list, key, cls = '') => h('fieldset', { class: 'ti-f ' + cls }, h('legend', {}, label), h('div', { class: 'ti-chips' },
    list.map(o => h('button', { type: 'button', 'aria-pressed': String(st[key] === o.id), onclick: () => { st[key] = o.id; draw(); } }, o.th))));
  const num = (label, key, min, max, unit) => h('label', { class: 'ti-num' }, label, h('input', { type: 'number', inputmode: 'numeric', min, max, value: st[key],
    onchange: e => { const v = Math.max(min, Math.min(max, Math.round(+e.target.value || min))); st[key] = v; e.target.value = v; draw(); } }), h('span', {}, unit));
  const priceOf = l => (l.ex == null ? h('em', { class: 'ti-sv' }, 'ประเมินหน้างาน') : h('b', {}, baht(l.ex * l.qty)));
  function drawForm() {
    form.innerHTML = '';
    const types = TYPES.filter(t => t.id !== 'duct');
    form.append(
      seg('แอร์อายุเท่าไร', AGES, 'age'),
      h('div', { class: 'ti-row' },
        h('label', { class: 'ti-sel' }, 'ประเภท', h('select', { onchange: e => { st.type = e.target.value; draw(); } }, types.map(t => h('option', { value: t.id, selected: t.id === st.type }, t.th)))),
        h('label', { class: 'ti-sel' }, 'ขนาด', h('select', { onchange: e => { st.btu = +e.target.value; draw(); } }, SIZES.filter(b => st.type !== 'wall' || b <= 30000).map(b => h('option', { value: b, selected: b === st.btu }, btuFmt(b)))))),
      seg('ระบบคอมเพรสเซอร์', SYSTEMS, 'sys'),
      seg('น้ำยาแอร์ (ดูจากป้ายข้างเครื่อง)', REFS, 'ref'),
      seg('ตอนนี้เป็นอย่างไร', ISSUES, 'issue', 'ti-issues'),
      h('div', { class: 'ti-row' }, num('จำนวนเครื่อง', 'qty', 1, 200, 'เครื่อง'), num('เปิดวันละ', 'hrs', 1, 24, 'ชม.')));
  }
  function drawOut() {
    const R = tradeIn(st), q = R.q, t = TYPE_BY_ID[st.type];
    out.innerHTML = '';
    const repCard = h('div', { class: 'ti-card' + (R.verdict === 'repair' || R.verdict === 'keep' ? ' pick' : '') },
      h('h4', {}, R.issue.id === 'reno' ? 'ใช้เครื่องเดิมต่อ' : 'ซ่อมเครื่องเดิม'),
      R.repair.lines.length ? h('ul', {}, R.repair.lines.map(l => h('li', {}, h('span', {}, l.name), priceOf(l)))) : h('p', { class: 'ti-mut' }, R.issue.id === 'reno' ? 'ไม่มีงานซ่อม · ถ้าต้องย้ายตำแหน่งตอนรีโนเวท ใช้บริการรื้อ ย้าย และติดตั้งใหม่ (ประเมินหน้างาน)' : 'เริ่มจากค่าตรวจวินิจฉัย แล้วทีมแจ้งราคาซ่อมให้อนุมัติก่อน'),
      R.repair.lines.length ? h('p', { class: 'ti-sum' }, R.repair.unknown ? 'อย่างน้อย ' : 'รวม ', h('b', {}, baht(R.repair.known * q)), q > 1 ? ` (${q} เครื่อง)` : '', R.repair.unknown ? h('small', {}, ` + ${R.repair.unknown} รายการประเมินหน้างาน (ยังไม่มีราคามาตรฐาน เช่น ตัวอะไหล่หลัก)`) : null) : null,
      h('p', { class: 'ti-mut' }, `ค่าไฟโดยประมาณ ≈ ${baht(Math.round(R.energy.old / 100) * 100)} / ปี / เครื่อง (${R.energy.oldInv ? 'Inverter' : 'Fixed speed'} อายุ ${R.age.th}${R.energy.loss ? ` · ประสิทธิภาพลดตามอายุ ~${Math.round(R.energy.loss * 100)}%` : ''})`));
    const S = R.set;
    const newCard = h('div', { class: 'ti-card' + (R.verdict === 'replace' ? ' pick' : '') },
      h('h4', {}, 'เทิร์นเป็นเครื่องใหม่ (Inverter)'),
      h('ul', {},
        h('li', {}, h('span', {}, `เครื่องใหม่ ${t.th} ${btuFmt(st.btu)} · ${S.n} รุ่นในเว็บ${S.n ? ` ช่วง ${baht(S.min)}–${baht(S.max)}` : ''}`), S.med != null ? h('b', {}, `กลาง ${baht(S.med)}`) : h('em', { class: 'ti-sv' }, 'สอบถามรุ่น')),
        S.install ? h('li', {}, h('span', {}, S.install.name), S.install.ex != null ? h('b', {}, baht(S.install.ex)) : h('em', { class: 'ti-sv' }, 'ประเมินหน้างาน')) : null,
        S.out.map(l => h('li', {}, h('span', {}, l.name), priceOf(l))),
        h('li', { class: 'ti-trade' }, h('span', {}, 'มูลค่าเทิร์นเครื่องเดิม หักจากใบเสนอราคา'), R.tradeValue != null ? h('b', {}, '− ' + baht(R.tradeValue)) : h('em', { class: 'ti-sv' }, 'ทีมประเมินจากรุ่น อายุ สภาพ'))),
      R.setEx != null ? h('p', { class: 'ti-sum' }, 'เครื่อง + ติดตั้งมาตรฐาน ', h('b', {}, baht(R.setEx * q)), q > 1 ? ` (${q} เครื่อง)` : '', h('small', {}, ' ก่อนหักมูลค่าเทิร์น · ราคากลางของรุ่นในเว็บ')) : null,
      h('p', { class: 'ti-mut' }, `ค่าไฟโดยประมาณ ≈ ${baht(Math.round(R.energy.now / 100) * 100)} / ปี / เครื่อง`, R.energy.save > 0 ? ` · ต่างจากเครื่องเดิมราว ${baht(Math.round(R.energy.save * q / 100) * 100)} / ปี${q > 1 ? ` (${q} เครื่อง)` : ''}` : ''));
    out.append(
      h('div', { class: 'ti-verdict ti-' + R.verdict }, h('b', {}, R.title), h('p', {}, R.sub),
        R.why.length ? h('ul', {}, R.why.map(w => h('li', {}, w))) : null),
      h('div', { class: 'ti-cmp' }, repCard, newCard),
      h('ol', { class: 'ti-steps', 'aria-label': 'ขั้นตอนเทิร์นแอร์เก่า' }, [
        ['ส่งข้อมูลเครื่องเดิม', 'รูปป้ายข้างเครื่อง (รุ่น ปีผลิต น้ำยา) และรูปคอยล์ร้อน'],
        ['ทีมประเมินมูลค่าเทิร์น', 'จากรุ่น อายุ และสภาพจริง แจ้งในใบเสนอราคา'],
        ['ใบเสนอราคาเดียว', 'เครื่องใหม่ + ติดตั้ง หักมูลค่าเทิร์นเครื่องเดิม'],
        ['วันติดตั้ง', 'เก็บน้ำยาเครื่องเดิมก่อนรื้อ ไม่ปล่อยทิ้งสู่อากาศ รื้อ ขนออก แล้วติดตั้งเครื่องใหม่'],
        ['ส่งมอบ', 'ทดสอบ วัดค่า ใบรับมอบงาน และรับประกันงานติดตั้ง'],
      ].map(([a, b], i) => h('li', {}, h('span', {}, String(i + 1)), h('b', {}, a), h('small', {}, b)))),
      h('div', { class: 'ti-acts' },
        h('button', { type: 'button', class: 's-btn primary', onclick: () => {
          cart.add({ kind: 'survey', group: 'install', key: `TI-${st.type}-${st.btu}-${st.age}-${st.issue}`, name: `ประเมินเทิร์นแอร์เก่า ${q} เครื่อง → เครื่องใหม่ Inverter`, detail: `${t.th} ${btuFmt(st.btu)} · อายุ ${R.age.th} · ${R.issue.th}`, unitEx: null, qty: 1 });
          toast('เพิ่มคำขอประเมินเทิร์นในใบเสนอราคาแล้ว'); openCart && openCart(); } }, 'ขอประเมินมูลค่าเทิร์น'),
        catalog ? h('button', { type: 'button', class: 's-btn', onclick: () => {
          catalog.setType(st.type); catalog.setBtu(st.btu); const c = document.getElementById('catalog'); c && c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } }, `ดูเครื่องใหม่ ${btuFmt(st.btu)}`) : null,
        h('button', { type: 'button', class: 's-btn ghost', onclick: () => askTeam('เทิร์นแอร์เก่า', `เทิร์นแอร์เก่า ${q} เครื่อง · ${t.th} ${btuFmt(st.btu)} · อายุ ${R.age.th} · ${SYSTEMS.find(s => s.id === st.sys).th} · น้ำยา ${REFS.find(s => s.id === st.ref).th} · อาการ: ${R.issue.th} · จะส่งรูปป้ายเครื่องให้ทีม`) }, 'ส่งรูปป้ายเครื่องให้ทีม')),
      h('p', { class: 'ti-note' }, `ราคาก่อน VAT ตาม Pricebook อัตรามาตรฐาน · ราคาเครื่องใหม่ = ราคากลางของรุ่น Inverter ขนาดใกล้เคียงในเว็บ · ค่าไฟเป็นประมาณการ (เปิดวันละ ${R.energy.hrs} ชม. · ${RATE.home} บาท/หน่วย · สมมติประสิทธิภาพลดลงราว 1% ต่อปีหลังปีที่ 3) ไม่ใช่การรับประกันค่าไฟ · ซ่อมทุกครั้งแจ้งราคาให้อนุมัติก่อน${R.special ? ' · จำนวนนี้อาจได้อัตราพิเศษตามเงื่อนไข ทีมขายยืนยันในใบเสนอราคา' : ''}`));
  }
  function draw() { save(); drawForm(); drawOut(); }
  draw();
  document.addEventListener('sbp:tradein', e => { const d = e.detail || {}; if (ISSUES.some(i => i.id === d.issue)) st.issue = d.issue; if (!AGES.find(x => x.id === st.age) || AGES.find(x => x.id === st.age).y < 7) st.age = 'a8'; draw(); });   // from the symptom checker
  return { set(v) { Object.assign(st, v); draw(); }, state: () => ({ ...st }) };
}
