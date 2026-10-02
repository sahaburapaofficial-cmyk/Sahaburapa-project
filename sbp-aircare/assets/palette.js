// SBP AirCare — command palette (Ctrl / ⌘ K, or "/") — Rev.14 (owner 2 ต.ค. 2569: "หยิบเล็กหยิบน้อยจากเว็บระดับโลกมาเติม
// ให้เป็นเพชรเม็ดงาม"). The Linear / Raycast / Vercel pattern: one search box that reaches everything on the site — pages,
// sections, every air-con model in the catalogue (with its price), FAQ answers and quick actions (book a cleaning, open the
// quotation, call, chat on LINE, send site photos). Keyboard first (↑ ↓ Enter Esc), ARIA combobox + listbox, works on touch
// from the header button. Styling follows the variant: A clean card · B terminal sheet · C glass (shared.css .cp-*).
import { h, $, DEMO, BRAND_BY_ID, TYPE_BY_ID, btuFmt, baht, FAQ, COMPANY, cleanRate, incVat } from './sbp-core.js';

const norm = s => String(s || '').toLowerCase().replace(/[\s·\-\/,().]/g, '');
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * mountPalette({ variant, views, viewTh, secTh, go, openCart, openProduct, openFeedback, lineUrl })
 * views: { view: [section ids] } · viewTh: { view: label } · secTh: { id: label }
 */
export function mountPalette(cfg) {
  const { variant = 'A', views = {}, viewTh = {}, secTh = {}, go, openCart, openProduct, openFeedback } = cfg;
  /* ---------- the index ---------- */
  const items = [];
  const add = (grp, th, sub, run, keys = '', btu = null) => items.push({ grp, th, sub, run, btu, k: norm(th + ' ' + sub + ' ' + keys) });
  add('ทำทันที', 'จองล้างแอร์', 'เลือกแอร์ วิธีล้าง พื้นที่ เห็นราคารวม', () => go('book'), 'book clean ล้าง จอง');
  add('ทำทันที', 'ดูใบเสนอราคาของฉัน', 'รายการที่เพิ่มไว้ รวม VAT', () => openCart && openCart(), 'cart quote ตะกร้า');
  add('ทำทันที', 'ส่งรูปหน้างานให้ทีมประเมิน', 'ถ่ายตามรายการแล้วส่งทาง LINE', () => go('photo-survey'), 'photo survey สำรวจ รูป');
  add('ทำทันที', `แชท LINE ${COMPANY.line}`, 'เปิดแชตกับทีม', () => window.open(COMPANY.lineUrl, '_blank', 'noopener'), 'line chat');
  add('ทำทันที', `โทร ${COMPANY.tel}`, COMPANY.hours || '', () => { location.href = COMPANY.telHref; }, 'call phone โทรศัพท์');
  if (openFeedback) add('ทำทันที', 'ให้ความเห็นเว็บไซต์', 'ช่วงทดลองใช้', () => openFeedback(), 'feedback');
  Object.entries(views).forEach(([v, ids]) => {
    add('หน้า', viewTh[v] || v, ids.map(id => secTh[id]).filter(Boolean).slice(0, 4).join(' · '), () => go(v), v);
    ids.forEach(id => { if (secTh[id] && document.getElementById(id)) add('หัวข้อ', secTh[id], viewTh[v] || '', () => go(id), id); });
  });
  // services per unit type: standard cleaning from the Pricebook (C1 · Basic Clean, smallest size) and where to see installation
  ['wall', 'ceiling', 'cassette', 'floor'].forEach(t => {
    const T = TYPE_BY_ID[t], r = cleanRate('Basic Clean', 'C1', t, 0), th = T ? T.th : t;
    add('บริการ', `ล้างแอร์${th}`, r && r.rate.s != null ? `เริ่ม ${baht(incVat(r.rate.s))} ต่อเครื่อง รวม VAT · จองได้ 3 ขั้น` : 'จองล้าง 3 ขั้น', () => go('book'), `clean ล้าง ${t}`);
    add('บริการ', `ติดตั้งแอร์${th}`, 'ขั้นตอนทีมช่าง มาตรฐาน / พรีเมียม · ราคาติดตั้งตามขนาด', () => go('cleanflow'), `install ติดตั้ง ${t}`);
  });
  add('บริการ', 'ซ่อม / ตรวจเช็กแอร์', 'ไม่เย็น น้ำหยด มีเสียง · ค่าตรวจเช็กและค่าซ่อม', () => go('prices'), 'repair ซ่อม เสีย น้ำหยด ไม่เย็น');
  DEMO.models.forEach(m => {
    const b = BRAND_BY_ID[m.brand], t = TYPE_BY_ID[m.type], lo = m.skus[0], hi = m.skus[m.skus.length - 1];
    const price = m.skus.map(s => s.price).filter(p => p > 0);
    add('รุ่นแอร์', `${b ? b.name : m.brand} ${m.series}`, `${t ? t.th : ''} · ${lo.btu === hi.btu ? btuFmt(lo.btu) : btuFmt(lo.btu) + '–' + btuFmt(hi.btu)}${price.length ? ' · เริ่ม ' + baht(Math.min(...price)) : ''}`,
      () => openProduct && openProduct(m, lastBtu ? m.skus.reduce((bi, s2, i2) => Math.abs(s2.btu - lastBtu) < Math.abs(m.skus[bi].btu - lastBtu) ? i2 : bi, 0) : 0), m.skus.map(s => s.sku).join(' ') + (m.inverter ? ' inverter' : ''), m.skus.map(s => s.btu));
  });
  FAQ.forEach(f => add('คำถามที่พบบ่อย', f.q, f.a.slice(0, 80) + (f.a.length > 80 ? '…' : ''), () => go('faq'), f.a));
  const GROUPS = ['ทำทันที', 'บริการ', 'หน้า', 'หัวข้อ', 'รุ่นแอร์', 'คำถามที่พบบ่อย'];

  // numbers ≥ 5,000 (or "12k") are read as BTU: a model matches when one of its sizes is within ±12 % — "12000" must not hit
  // a 120,000 BTU unit by substring
  let lastBtu = null;
  const btuOf = t => { const m = /^(\d+(?:\.\d+)?)(k)?$/.exec(t); if (!m) return null; const v = +m[1] * (m[2] ? 1000 : 1); return v >= 5000 && v <= 400000 ? v : null; };
  function search(q) {
    const n = norm(q);
    if (!n) return items.filter(i => i.grp === 'ทำทันที' || i.grp === 'หน้า');
    const raw = q.toLowerCase().replace(/,/g, '').split(/\s+/).filter(Boolean), btus = raw.map(btuOf).filter(Boolean), toks = raw.filter(t => !btuOf(t)).map(norm).filter(Boolean);
    lastBtu = btus[0] || null;
    const seen = new Set();
    return items.map(i => {
      if (btus.length) {   // BTU query: models only, by size; other words must match too
        if (!i.btu || !btus.every(v => i.btu.some(b => Math.abs(b - v) <= v * 0.12)) || !toks.every(t => i.k.includes(t))) return { i, s: 0 };
        return { i, s: 2 };
      }
      // whole phrase first; otherwise rank by how many of the words match ("ล้าง สี่ทิศทาง" → ล้างแอร์สี่ทิศทาง first)
      const nt = norm(i.th), hit = toks.filter(t => i.k.includes(t)).length;
      return { i, s: nt.startsWith(n) ? 30 : nt.includes(n) ? 20 : hit === toks.length && hit ? 10 + hit : hit ? hit / toks.length * 5 : 0 };
    }).filter((x, _, all) => x.s && (x.s >= 10 || !(all.full ??= all.some(y => y.s >= 10))) && !seen.has(x.i.grp === 'หัวข้อ' ? x.i.th : x.i.grp + x.i.th) && seen.add(x.i.grp === 'หัวข้อ' ? x.i.th : x.i.grp + x.i.th) && !(x.i.grp === 'หัวข้อ' && items.some(o => o.grp === 'ทำทันที' && o.th === x.i.th)))
      .sort((a, b) => b.s - a.s || GROUPS.indexOf(a.i.grp) - GROUPS.indexOf(b.i.grp))
      .reduce((acc, x) => { const c = acc.cnt[x.i.grp] = (acc.cnt[x.i.grp] || 0) + 1; if (c <= (x.i.grp === 'รุ่นแอร์' ? 8 : 6)) acc.out.push(x.i); return acc; }, { out: [], cnt: {} }).out;
  }

  /* ---------- UI ---------- */
  const lid = 'cp-list';
  const input = h('input', { class: 'cp-in', type: 'search', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': lid, 'aria-autocomplete': 'list', autocomplete: 'off', spellcheck: 'false',
    placeholder: variant === 'B' ? 'พิมพ์คำสั่ง: รุ่น · BTU · บริการ · หัวข้อ' : 'ค้นหารุ่นแอร์ บริการ ราคา หรือหัวข้อ…', 'aria-label': 'ค้นหาทั้งเว็บไซต์' });
  const list = h('ul', { class: 'cp-list', id: lid, role: 'listbox', 'aria-label': 'ผลการค้นหา' });
  const status = h('p', { class: 'cp-status', role: 'status', 'aria-live': 'polite' });
  const dlg = h('div', { class: `cp cp-${variant}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'ค้นหาทั้งเว็บไซต์', hidden: true },
    h('div', { class: 'cp-back', onclick: () => close() }),
    h('div', { class: 'cp-box' },
      h('div', { class: 'cp-bar' }, h('span', { class: 'cp-ico', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' }), input, h('kbd', { class: 'cp-esc' }, 'Esc')),
      list, status,
      h('p', { class: 'cp-foot' }, h('span', {}, h('kbd', {}, '↑'), h('kbd', {}, '↓'), ' เลือก'), h('span', {}, h('kbd', {}, 'Enter'), ' เปิด'), h('span', {}, h('kbd', {}, 'Ctrl'), h('kbd', {}, 'K'), ' เปิดได้ทุกหน้า'))));
  document.body.append(dlg);
  let res = [], sel = 0, last = null;
  function render() {
    res = search(input.value); sel = Math.min(sel, Math.max(0, res.length - 1));
    list.innerHTML = ''; let g = null;
    res.forEach((it, i) => {
      if (it.grp !== g) { g = it.grp; list.append(h('li', { class: 'cp-grp', role: 'presentation' }, g)); }
      list.append(h('li', { class: 'cp-opt', role: 'option', id: 'cp-o' + i, 'aria-selected': String(i === sel), onclick: () => pick(i), onpointermove: () => { if (sel !== i) { sel = i; mark(); } } },
        h('b', {}, it.th), it.sub ? h('small', {}, it.sub) : null));
    });
    status.textContent = res.length ? `${res.length} รายการ` : 'ไม่พบ — ลองพิมพ์ชื่อยี่ห้อ ขนาด BTU หรือ "ล้าง" "ติดตั้ง" "ราคา"';
    mark();
  }
  function mark() {
    list.querySelectorAll('.cp-opt').forEach(o => o.setAttribute('aria-selected', String(o.id === 'cp-o' + sel)));
    const o = list.querySelector('#cp-o' + sel); input.setAttribute('aria-activedescendant', o ? o.id : '');
    o && o.scrollIntoView({ block: 'nearest' });
  }
  function pick(i) { const it = res[i]; if (!it) return; close(true); setTimeout(() => it.run(), 0); }
  function open() {
    if (!dlg.hidden) return; last = document.activeElement; dlg.hidden = false; document.documentElement.classList.add('cp-on');
    input.value = ''; sel = 0; render(); requestAnimationFrame(() => input.focus());
  }
  function close(keepFocus) { if (dlg.hidden) return; dlg.hidden = true; document.documentElement.classList.remove('cp-on'); if (!keepFocus && last && last.focus) last.focus(); }
  input.addEventListener('input', () => { sel = 0; render(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(res.length - 1, sel + 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
    else if (e.key === 'Tab') { e.preventDefault(); input.focus(); }   // focus stays in the dialog
  });
  addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); dlg.hidden ? open() : close(); }
    else if (e.key === '/' && !typing && dlg.hidden) { e.preventDefault(); open(); }
  });
  // header trigger (all variants): a search field look-alike on wide screens, an icon on phones
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const trigger = h('button', { type: 'button', class: `cp-trig cp-trig-${variant}`, 'aria-label': 'ค้นหาทั้งเว็บไซต์', 'aria-haspopup': 'dialog', onclick: open },
    h('span', { class: 'cp-ico', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' }),
    h('span', { class: 'cp-trig-t' }, 'ค้นหา'), h('kbd', { class: 'cp-trig-k' }, mac ? '⌘K' : 'Ctrl K'));
  const vsw = $('.hdr .vsw'), hw = $('.hdr .wrap');
  // B's header is a grid of bordered cells: the trigger gets a cell of its own (a bare child would wrap to a new row)
  const slot = vsw && vsw.classList.contains('cell') ? h('div', { class: 'cell cp-cell' }, trigger) : trigger;
  if (vsw) vsw.before(slot); else if (hw) hw.append(slot);
  return { open, close, search };
}
