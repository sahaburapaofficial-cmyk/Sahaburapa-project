// SBP AirCare — postal-style address picker — Rev.20 (owner 3 ต.ค. 2569: "พื้นที่หน้างานใส่ เขต แขวง ต่าง ๆ ให้เลือกพื้นที่แบบเหมือนส่งไปรษณีย์")
//   · one search box like a parcel form: type แขวง/ตำบล, เขต/อำเภอ, จังหวัด or a postcode → pick "แขวงบางมด › เขตจอมทอง › กรุงเทพฯ 10150"
//     (ARIA combobox + listbox, arrow keys / Enter / Escape); each suggestion shows its zone and travel fee
//   · or step by step (cascade): จังหวัด → เขต/อำเภอ → แขวง/ตำบล → รหัสไปรษณีย์ (filled from the subdistrict)
//   · typing without picking still resolves to the best match (older inputs, tests), so the price never waits for a click
// Data + rules: sbp-core ADDR / addrSearch / zoneOf / travelNote (assets/th-address.json).
import { ADDR, addrSearch, zoneOf, addrTh, travelNote, TIER_TH, baht, h } from './sbp-core.js';

let uid = 0;
const chip = z => !z ? null : h('span', { class: 'ap-tier', 'data-tier': z.tier }, z.tier === 'core' ? 'พื้นที่หลัก' : z.tier === 'extended' ? `${baht(z.fee)}/เที่ยว` : z.tier === 'out' ? 'เกินระยะ' : '');

/**
 * @param {{ id?: string, value?: object|string, placeholder?: string, cascade?: boolean, label?: string, onPick?: (addr, zone, how) => void }} o
 * @returns {{ el: HTMLElement, input: HTMLInputElement, set(addr): void, get(): object|null }}
 */
export function addrPicker(o = {}) {
  const n = ++uid, lid = `ap-list-${n}`;
  let cur = typeof o.value === 'object' && o.value ? o.value : null, opts = [], act = -1, timer;
  const input = h('input', { id: o.id || `ap-in-${n}`, class: 'ap-in', type: 'text', autocomplete: 'off', spellcheck: 'false', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': lid,
    placeholder: o.placeholder || 'พิมพ์แขวง/ตำบล เขต/อำเภอ หรือรหัสไปรษณีย์', value: cur ? addrTh(cur) : (typeof o.value === 'string' ? o.value : '') });
  const list = h('ul', { id: lid, class: 'ap-list', role: 'listbox', hidden: true, 'aria-label': 'พื้นที่ที่ตรงกับคำค้น' });
  const out = h('p', { class: 'ap-out', 'aria-live': 'polite' });
  const el = h('div', { class: 'ap' }, h('div', { class: 'ap-box' }, input, list), o.quiet ? null : out);   // quiet: the page shows the result itself

  function show(z) { out.innerHTML = ''; out.dataset.tier = z ? z.tier : ''; if (!z) { out.textContent = 'เลือกพื้นที่เพื่อคำนวณค่าเดินทาง'; return; } out.append(h('b', {}, (TIER_TH[z.tier] || TIER_TH.unknown).th), ' · ', travelNote(z)); }
  function pick(a, how = 'pick') {
    cur = a; const z = a ? zoneOf(a) : null;
    if (a && how === 'pick') input.value = addrTh(a);
    close(); show(z); if (cascade) cascade.sync(a);
    o.onPick && o.onPick(a, z, how);
  }
  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); act = -1; }
  function draw() {
    list.innerHTML = '';
    if (!opts.length) { close(); return; }
    opts.forEach((a, i) => { const z = zoneOf(a);
      const li = h('li', { id: `${lid}-${i}`, role: 'option', class: 'ap-opt', 'aria-selected': String(i === act) },
        h('span', { class: 'ap-t' }, a.s ? (a.p === 'กรุงเทพมหานคร' ? 'แขวง' : 'ต.') + a.s : a.d ? (a.p === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.') + a.d : a.p,
          h('small', {}, a.s ? `${a.p === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.'}${a.d} · ${a.p === 'กรุงเทพมหานคร' ? 'กรุงเทพฯ' : a.p}${a.z ? ' · ' + a.z : ''}` : a.d ? (a.p === 'กรุงเทพมหานคร' ? 'กรุงเทพฯ · ทั้งเขต' : `${a.p} · ทั้งอำเภอ`) : 'ทั้งจังหวัด')),
        chip(z));
      li.addEventListener('mousedown', e => { e.preventDefault(); pick(a); });
      list.append(li); });
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
    if (act >= 0) { input.setAttribute('aria-activedescendant', `${lid}-${act}`); list.children[act]?.scrollIntoView({ block: 'nearest' }); }
  }
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      opts = addrSearch(input.value, 8); act = -1; draw();
      // no click needed for a price: the best match counts until the customer picks
      const best = opts[0] || null; cur = best;
      const z = best ? zoneOf(best) : input.value.trim().length >= 2 ? { tier: 'unknown', match: input.value } : null;
      show(z); o.onPick && o.onPick(best, z, 'type');
    }, 180);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (list.hidden) { opts = addrSearch(input.value, 8); } if (!opts.length) return; e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; draw(); }
    else if (e.key === 'Enter' && !list.hidden && opts.length) { e.preventDefault(); pick(opts[Math.max(0, act)]); }
    else if (e.key === 'Escape' && !list.hidden) { e.preventDefault(); close(); }
  });
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2 && !cur?.s) { opts = addrSearch(input.value, 8); draw(); } });
  input.addEventListener('blur', () => setTimeout(close, 120));

  /* step by step, like the postal form */
  let cascade = null;
  if (o.cascade) {
    const sel = (lab, cls) => { const s = h('select', { class: 'ap-sel ' + cls, 'aria-label': lab }); return [h('label', { class: 's-field ap-f' }, lab, s), s]; };
    const [lp, sp] = sel('จังหวัด', 'ap-p'), [ld, sd] = sel('เขต / อำเภอ', 'ap-d'), [ls, ss] = sel('แขวง / ตำบล', 'ap-s');
    const zip = h('input', { class: 'ap-zip', readonly: true, 'aria-label': 'รหัสไปรษณีย์', placeholder: '—' });
    const lz = h('label', { class: 's-field ap-f' }, 'รหัสไปรษณีย์', zip);
    const provs = [...new Set(ADDR.list.map(r => r.p))];
    const fill = (s, first, vals, v) => { s.innerHTML = ''; s.append(h('option', { value: '' }, first), ...vals.map(x => h('option', { value: x, selected: x === v || null }, x))); s.disabled = !vals.length; };
    const subsOf = (p, d) => ADDR.list.filter(r => r.p === p && r.d === d);
    const sync = a => {
      const p = a?.p || '', d = a?.d || '', s = a?.s || '';
      fill(sp, 'เลือกจังหวัด', provs, p);
      ADDR.other.length && sp.append(h('optgroup', { label: 'นอกระยะให้บริการรายเครื่อง' }, ...ADDR.other.map(x => h('option', { value: x, selected: x === p || null }, x))));
      fill(sd, p === 'กรุงเทพมหานคร' ? 'เลือกเขต' : 'เลือกอำเภอ', p ? [...new Set(ADDR.list.filter(r => r.p === p).map(r => r.d))] : [], d);
      const subs = p && d ? subsOf(p, d) : [];
      fill(ss, p === 'กรุงเทพมหานคร' ? 'เลือกแขวง' : 'เลือกตำบล', [...new Set(subs.map(r => r.s))], s);
      zip.value = a?.z || (subs.length && s ? (subs.find(r => r.s === s) || {}).z || '' : '');
    };
    const fromSel = () => { const p = sp.value, d = sd.value, s = ss.value; if (!p) return null; const r = s ? subsOf(p, d).find(x => x.s === s) : null; return { p, d: d || undefined, s: s || undefined, z: r ? r.z : undefined }; };
    sp.addEventListener('change', () => { sd.value = ''; ss.value = ''; const a = fromSel(); input.value = a ? addrTh(a) : ''; pick(a, 'cascade'); });
    sd.addEventListener('change', () => { ss.value = ''; const a = fromSel(); input.value = a ? addrTh(a) : ''; pick(a, 'cascade'); });
    ss.addEventListener('change', () => { const a = fromSel(); input.value = a ? addrTh(a) : ''; pick(a, 'cascade'); });
    const grid = h('div', { class: 'ap-grid' }, lp, ld, ls, lz);
    el.append(h('details', { class: 'ap-more' }, h('summary', {}, 'เลือกทีละช่องแบบที่อยู่ไปรษณีย์'), grid));
    cascade = { sync }; sync(cur);
  }
  show(cur ? zoneOf(cur) : (input.value.trim() ? zoneOf(addrSearch(input.value, 1)[0]) : null));
  return { el, input, set: a => pick(a), get: () => cur };
}

/** Rev.20 upgrade an existing <input> (area checker, contract builder) to the picker in place: keeps its id, classes and data-* */
export function attachAddr(old, o = {}) {
  if (!old) return null;
  const ap = addrPicker({ ...o, id: old.id || undefined, placeholder: old.getAttribute('placeholder') || o.placeholder, value: old.value || o.value, quiet: o.quiet !== false });
  old.className && ap.input.classList.add(...old.className.split(/\s+/).filter(Boolean));
  [...old.attributes].forEach(at => { if (at.name.startsWith('data-') || at.name === 'aria-label') ap.input.setAttribute(at.name, at.value); });
  old.replaceWith(ap.el);
  return ap;
}
