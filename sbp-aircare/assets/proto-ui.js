// SBP AirCare prototype — shared UI behaviours. Each variant supplies its own markup/CSS
// and small template functions; the logic (state, filtering, estimating, 3D wiring) lives here once.
import {
  DEMO, TYPES, TYPE_BY_ID, BRANDS, BRAND_BY_ID, BTU_BANDS, PRICE_BANDS, emptyFilter, queryCatalog, facetCounts,
  baht, btuFmt, checkZone, TIER_TH, estimateContract, PRESETS, recommendBtu, h, $, $$, countUp, reduceMotion,
  CLEAN_PKGS, SIZE_BANDS, DATA, incVat, up100, TRAVEL, stockTh, travelNote, VOLUME_HINT,
} from './sbp-core.js';
import { attachAddr } from './addrpick.js';
import { createACViewer, createRoomSim, PARTS } from './ac3d.js';
import { deferred } from './lazy.js';
import { watchPanel } from './backpanel.js';

export { DEMO, TYPES, TYPE_BY_ID, BRANDS, BRAND_BY_ID, baht, btuFmt, h, $, $$, countUp, reduceMotion, PARTS, stockTh, incVat };

/* ---------------- Catalog ---------------- */
export function mountCatalog(root, cfg) {
  const f = emptyFilter();
  const sel = new Map();           // model id -> chosen sku index
  const compare = new Map();       // model id -> sku
  let page = 1; const per = cfg.pageSize || 12;
  let view = cfg.view || 'grid';
  const els = {
    search: $('[data-cat-search]', root), facets: $('[data-cat-facets]', root), chips: $('[data-cat-chips]', root),
    count: $('[data-cat-count]', root), grid: $('[data-cat-grid]', root), more: $('[data-cat-more]', root),
    sort: $('[data-cat-sort]', root), tray: $('[data-compare]', document), sheetBtn: $('[data-cat-sheet-open]', root),
    sheet: $('[data-cat-sheet]', root), sheetClose: $$('[data-cat-sheet-close]', root), sheetApply: $('[data-cat-sheet-apply]', root),
  };
  const groups = [
    { key: 'type', th: 'ประเภท', opts: TYPES.map(t => ({ id: t.id, th: t.th, dot: t.color })) },
    { key: 'btu', th: 'ขนาด BTU', opts: BTU_BANDS.map(b => ({ id: b.id, th: b.th })) },
    { key: 'brand', th: 'แบรนด์', opts: BRANDS.map(b => ({ id: b.id, th: b.name, own: b.own })), collapsible: 8 },
    { key: 'price', th: 'ราคาเครื่อง (ก่อน VAT)', opts: PRICE_BANDS.map(b => ({ id: b.id, th: b.th })) },
    { key: 'inverter', th: 'ระบบ', opts: [{ id: 'inv', th: 'Inverter' }, { id: 'fix', th: 'Fixed speed' }], single: true },
  ];
  function renderFacets() {
    const c = facetCounts(f);
    els.facets.innerHTML = '';
    for (const g of groups) {
      const box = h('fieldset', { class: 'facet', 'data-key': g.key }, h('legend', {}, g.th));
      const list = h('div', { class: 'facet-opts' });
      g.opts.forEach((o, i) => {
        const on = g.single ? f.inverter === o.id : f[g.key].has(o.id);
        const n = c[g.key][o.id] ?? 0;
        const id = `f-${g.key}-${o.id}`;
        const inp = h('input', { type: 'checkbox', id, checked: on, disabled: !on && n === 0 });
        inp.addEventListener('change', () => {
          if (g.single) f.inverter = inp.checked ? o.id : '';
          else inp.checked ? f[g.key].add(o.id) : f[g.key].delete(o.id);
          page = 1; update();
        });
        const lab = h('label', { class: 'opt' + (o.own ? ' own' : '') + (g.collapsible && i >= g.collapsible ? ' more' : ''), for: id },
          inp, o.dot ? h('i', { class: 'dot', style: `background:${o.dot}` }) : null, h('span', {}, o.th), o.own ? h('b', { class: 'own-tag' }, 'แบรนด์เรา') : null, h('small', { class: 'n' }, String(n)));
        list.append(lab);
      });
      box.append(list);
      if (g.collapsible) {
        const t = h('button', { type: 'button', class: 'facet-more' }, `ดูทั้งหมด ${g.opts.length} แบรนด์`);
        t.addEventListener('click', () => { box.classList.toggle('open'); t.textContent = box.classList.contains('open') ? 'ย่อรายการ' : `ดูทั้งหมด ${g.opts.length} แบรนด์`; });
        box.append(t);
      }
      els.facets.append(box);
    }
  }
  function renderChips() {
    els.chips.innerHTML = '';
    const add = (label, fn) => els.chips.append(h('button', { type: 'button', class: 'chip', onclick: () => { fn(); page = 1; update(); } }, label, h('span', { 'aria-hidden': 'true' }, ' ×')));
    if (f.q) add(`“${f.q}”`, () => { f.q = ''; els.search.value = ''; });
    f.type.forEach(id => add(TYPE_BY_ID[id].th, () => f.type.delete(id)));
    f.btu.forEach(id => add(BTU_BANDS.find(b => b.id === id).th + ' BTU', () => f.btu.delete(id)));
    f.brand.forEach(id => add(BRAND_BY_ID[id].name, () => f.brand.delete(id)));
    f.price.forEach(id => add(PRICE_BANDS.find(b => b.id === id).th, () => f.price.delete(id)));
    if (f.inverter) add(f.inverter === 'inv' ? 'Inverter' : 'Fixed speed', () => { f.inverter = ''; });
    if (els.chips.children.length > 1) els.chips.append(h('button', { type: 'button', class: 'chip clear', onclick: () => { Object.assign(f, emptyFilter()); els.search.value = ''; page = 1; update(); } }, 'ล้างทั้งหมด'));
  }
  let lastQ;
  function renderGrid() {
    const q = queryCatalog(f); lastQ = q;
    els.count && (els.count.innerHTML = `<b>${q.list.length.toLocaleString()}</b> รุ่น · <b>${q.skuTotal.toLocaleString()}</b> SKU`);
    const shown = q.list.slice(0, page * per);
    els.grid.innerHTML = '';
    els.grid.dataset.view = view;
    if (!shown.length) {
      els.grid.append(h('div', { class: 'empty' }, h('strong', {}, 'ไม่พบรุ่นที่ตรงเงื่อนไข'), h('p', {}, 'ลองลดตัวกรองลง หรือส่งขนาดห้องมาให้ทีมขายแนะนำรุ่นให้'), h('button', { type: 'button', class: 'btn-ghost', onclick: () => { Object.assign(f, emptyFilter()); els.search.value = ''; update(); } }, 'ล้างตัวกรอง')));
    }
    shown.forEach((m, idx) => {
      const skus = q.visibleSkus(m);
      let si = Math.min(sel.get(m.id) ?? 0, skus.length - 1);
      const card = (view === 'table' ? cfg.rowTpl : cfg.cardTpl)(m, skus, si, {
        pick: (i) => { sel.set(m.id, i); renderGrid(); },
        open: () => cfg.onOpen && cfg.onOpen(m, skus[si]),
        compare: () => toggleCompare(m, skus[si]),
        inCompare: compare.has(m.id),
      });
      if (!reduceMotion() && idx >= (page - 1) * per) card.style.animationDelay = `${(idx % per) * 28}ms`;
      els.grid.append(card);
    });
    if (els.more) {
      els.more.hidden = shown.length >= q.list.length;
      els.more.textContent = `โหลดเพิ่ม (${Math.min(per, q.list.length - shown.length)} จาก ${q.list.length - shown.length} รุ่นที่เหลือ)`;
    }
  }
  function toggleCompare(m, sku) {
    if (compare.has(m.id)) compare.delete(m.id);
    else { if (compare.size >= 4) { cfg.toast && cfg.toast('เทียบได้สูงสุด 4 รุ่น'); return; } compare.set(m.id, { m, sku }); }
    renderTray(); renderGrid();
  }
  function renderTray() {
    if (!els.tray) return;
    els.tray.hidden = compare.size === 0;
    const list = $('[data-compare-list]', els.tray); list.innerHTML = '';
    compare.forEach(({ m, sku }, id) => list.append(h('li', {}, h('span', {}, `${BRAND_BY_ID[m.brand].name} ${m.series} · ${sku.btu / 1000}k`), h('button', { type: 'button', 'aria-label': 'เอาออก', onclick: () => { compare.delete(id); renderTray(); renderGrid(); } }, '×'))));
    const go = $('[data-compare-go]', els.tray); go.textContent = `เทียบ ${compare.size} รุ่น`;
    go.onclick = () => cfg.onCompare && cfg.onCompare([...compare.values()]);
  }
  // the address keeps #catalog only after the visitor filters (not on the first render, not while the catalog is hidden in another view — r5)
  let first = true;
  function update() { renderFacets(); renderChips(); renderGrid(); if (first) { first = false; return; } if (!els.grid.offsetParent) return; try { history.replaceState(history.state, '', location.pathname + location.search + '#catalog'); } catch (e) {} }
  let t;
  els.search && els.search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { f.q = els.search.value.trim(); page = 1; update(); }, 160); });
  els.sort && els.sort.addEventListener('change', () => { f.sort = els.sort.value; renderGrid(); });
  els.more && els.more.addEventListener('click', () => { page++; renderGrid(); });
  $$('[data-cat-view]', root).forEach(b => b.addEventListener('click', () => { view = b.dataset.catView; $$('[data-cat-view]', root).forEach(x => x.setAttribute('aria-pressed', x === b)); renderGrid(); }));
  els.sheetBtn && els.sheetBtn.addEventListener('click', () => { els.sheet.classList.add('open'); document.body.classList.add('lock'); });
  watchPanel(els.sheet, () => els.sheet.classList.contains('open'), () => { els.sheet.classList.remove('open'); document.body.classList.remove('lock'); });   // ★Rev.34 Back closes the filter sheet
  els.sheetClose.forEach(b => b.addEventListener('click', () => { els.sheet.classList.remove('open'); document.body.classList.remove('lock'); }));
  els.sheetApply && els.sheetApply.addEventListener('click', () => { els.sheet.classList.remove('open'); document.body.classList.remove('lock'); els.grid.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); });
  // skeleton first, then data (demonstrates the loading state)
  if (cfg.skeleton) { els.grid.innerHTML = ''; for (let i = 0; i < per; i++) els.grid.append(cfg.skeleton()); setTimeout(update, 650); } else update();
  return {
    setType: id => { f.type = new Set(id ? [id] : []); page = 1; update(); },
    setQuery: q => { f.q = q; els.search.value = q; page = 1; update(); },
    setBtu: btu => { const b = BTU_BANDS.find(b => btu >= b.min && btu <= b.max); f.btu = new Set(b ? [b.id] : []); page = 1; update(); },
    filter: f,
    facetsHtmlCount: () => groups.length,
  };
}

/* ---------------- Contract builder ---------------- */
export function mountBuilder(root, cfg = {}) {
  const units = { wall: 0, ceiling: 0, cassette: 0, floor: 0, duct: 0 };
  let visits = 3, high = false, zone = null, pkg = 'Standard Care', size = 0, deep = true, last = null;
  const out = k => $$(`[data-b-out="${k}"]`, root);
  // package / size / deep-clean controls (injected so every variant gets them)
  if (!$('[data-b-pkg]', root)) {
    const host = $('.opts, .bopts', root) || root;
    const ex = h('div', { class: 's-bx' },
      h('label', { class: 's-field' }, 'แพ็กเกจ', h('select', { id: `bx-pkg-${root.id || 'b'}`, 'data-b-pkg': '' }, CLEAN_PKGS.map(p => h('option', { value: p.id, selected: p.id === pkg }, p.th)))),
      h('label', { class: 's-field' }, 'ขนาดเครื่องส่วนใหญ่', h('select', { id: `bx-size-${root.id || 'b'}`, 'data-b-size': '' }, SIZE_BANDS.map(z => h('option', { value: z.id }, `${z.th} (ผนัง ${z.wall} / อื่น ${z.other.replace('<=', '≤')})`)))),
      h('label', { class: 's-chk' }, h('input', { type: 'checkbox', id: `bx-deep-${root.id || 'b'}`, 'data-b-deep': '', checked: true }), h('span', {}, 'รวมล้างใหญ่ (C2) ปีละ 1 ครั้ง')));
    host.prepend(ex);
  }
  let linesBox = $('[data-b-lines]', root);
  if (!linesBox) { const off = $('[data-b-out="off"]', root); linesBox = h('div', { class: 's-blines', 'data-b-lines': '' }); off ? off.after(linesBox) : root.append(linesBox); }
  function setUnits(u) { for (const k in units) units[k] = u[k] || 0; $$('[data-b-unit]', root).forEach(inp => inp.value = units[inp.dataset.bUnit] ?? 0); }
  function calc() {
    const e = estimateContract({ units, visits, zone, high, pkg, size, deep }); last = e;
    const has = e.count > 0;
    root.classList.toggle('has-est', has);
    out('count').forEach(x => countUp(x, e.count || 0, 500));
    out('low').forEach(x => has ? countUp(x, e.annualEx, 700, n => baht(n)) : x.textContent = '—');
    out('high').forEach(x => x.textContent = has ? `ก่อน VAT · รวม VAT ${baht(e.annualInc)}` : '—');
    out('perunit').forEach(x => x.textContent = has ? `≈ ${baht(up100(e.perUnitYear))} ก่อน VAT` : '—');
    out('teamdays').forEach(x => x.textContent = has ? `${e.teamDaysPerVisit} ทีม-วัน / รอบ (ประมาณ)` : '—');
    out('off').forEach(x => x.textContent = has ? `ใช้${e.level.th} (${e.count} เครื่อง)${e.travel ? ` · ${e.travelLabel || 'ค่าเดินทาง'} ${baht(e.travel)}/รอบ` : ''}${high ? ' · งานสูงเกิน 3 ม. ประเมินหน้างาน' : ''}${e.count >= VOLUME_HINT ? ' · จำนวนนี้อาจได้อัตราพิเศษตามเงื่อนไขบริษัท ทีมขายยืนยันในใบเสนอราคา' : ''}` : '');
    out('visits').forEach(x => x.textContent = `${visits} ครั้ง / ปี${deep ? ' (ล้างใหญ่ 1)' : ''}`);
    out('tier').forEach(x => x.textContent = e.travel ? `+ค่าเดินทาง ${baht(e.travel)}/รอบ` : zone && zone.tier === 'out' ? 'เกินระยะ · ทีมประเมินเป็นงานโครงการ' : 'ไม่มีค่าเดินทาง');
    $$('[data-b-bar]', root).forEach(bar => { const k = bar.dataset.bBar; const max = Math.max(1, ...Object.values(units)); bar.style.setProperty('--w', ((units[k] || 0) / max * 100).toFixed(1) + '%'); });
    linesBox.innerHTML = '';
    if (has) linesBox.append(h('table', { class: 's-btable' }, h('thead', {}, h('tr', {}, h('th', {}, 'ประเภท'), h('th', {}, 'เครื่อง'), h('th', {}, 'ล้างปกติ/เครื่อง'), h('th', {}, 'ล้างใหญ่/เครื่อง'))),
      h('tbody', {}, e.lines.map(l => h('tr', {}, h('td', {}, `${TYPE_BY_ID[l.type].th} ${l.range || ''}`), h('td', {}, String(l.n)), h('td', {}, baht(l.c1)), h('td', {}, baht(l.c2)))))),
      h('p', { class: 's-note' }, `ราคาก่อน VAT ตาม Pricebook (ปัดขึ้นเป็นหลักร้อย) · ${pkg}`));
    cfg.onChange && cfg.onChange(e, { units: { ...units }, visits, zone, high });
    root.dispatchEvent(new CustomEvent('sbp:builder', { detail: { e, state: { units: { ...units }, visits, zone, high, pkg, size, deep } } }));   // Rev.26 annual plan (annualplan.js)
  }
  $$('[data-b-unit]', root).forEach(inp => inp.addEventListener('input', () => { units[inp.dataset.bUnit] = Math.max(0, Math.min(999, parseInt(inp.value || '0', 10) || 0)); markPreset(null); calc(); }));
  $$('[data-b-step]', root).forEach(b => b.addEventListener('click', () => {
    const [k, d] = b.dataset.bStep.split(':'); units[k] = Math.max(0, Math.min(999, (units[k] || 0) + +d));
    $(`[data-b-unit="${k}"]`, root).value = units[k]; markPreset(null); calc();
  }));
  function markPreset(id) { $$('[data-b-preset]', root).forEach(b => b.setAttribute('aria-pressed', b.dataset.bPreset === id)); }
  $$('[data-b-preset]', root).forEach(b => b.addEventListener('click', () => {
    const p = PRESETS.find(p => p.id === b.dataset.bPreset); setUnits(p.units); visits = p.visits;
    $$('[data-b-visits]', root).forEach(r => r.checked = +r.value === visits); markPreset(p.id); calc();
  }));
  $$('[data-b-visits]', root).forEach(r => r.addEventListener('change', () => { visits = +r.value; calc(); }));
  const hi = $('[data-b-high]', root); hi && hi.addEventListener('change', () => { high = hi.checked; calc(); });
  $('[data-b-pkg]', root).addEventListener('change', e => { pkg = e.target.value; calc(); });
  $('[data-b-size]', root).addEventListener('change', e => { size = +e.target.value; calc(); });
  $('[data-b-deep]', root).addEventListener('change', e => { deep = e.target.checked; calc(); });
  // Rev.20 area picker (addrpick.js) in place of the free-text box
  const zr = $('[data-b-zone-result]', root);
  const zap = attachAddr($('[data-b-zone]', root), { onPick: (a, z) => {
    zone = z && z.tier !== 'unknown' ? z : null;
    if (zr) { zr.dataset.tier = z ? z.tier : ''; zr.textContent = !z ? '' : `${z.match} — ${(TIER_TH[z.tier] || TIER_TH.unknown).th} · ${travelNote(z)}`; }
    calc();
  } });
  const zi = zap && zap.input;
  const first = PRESETS[1]; setUnits(first.units); visits = first.visits; markPreset(first.id);
  $$('[data-b-visits]', root).forEach(r => r.checked = +r.value === visits);
  calc();
  // ★Rev.22 load a sample (enterprise.js "ปรับจำนวนเครื่องเอง") — units, visits, package, size band, deep clean
  function load(o = {}) {
    if (o.units) setUnits(o.units);
    if (o.visits) { visits = o.visits; $$('[data-b-visits]', root).forEach(r => r.checked = +r.value === visits); }
    if (o.pkg) { pkg = o.pkg; $('[data-b-pkg]', root).value = pkg; }
    if (o.size != null) { size = o.size; $('[data-b-size]', root).value = String(size); }
    if (o.deep != null) { deep = !!o.deep; $('[data-b-deep]', root).checked = deep; }
    markPreset(null); calc();
  }
  return { estimate: () => last, state: () => ({ units: { ...units }, visits, zone, high, pkg, size, deep }), zoneInput: () => zi ? zi.value : '', load };
}

/* ---------------- Service-area checker ---------------- */
export function mountZone(root, cfg = {}) {
  const res = $('[data-z-result]', root);
  // Rev.20 postal-style picker: แขวง/ตำบล · เขต/อำเภอ · จังหวัด · รหัสไปรษณีย์ → zone and travel fee of that exact place
  const ap = attachAddr($('[data-z-input]', root), { onPick: (a, z) => show(z) });
  function show(z) {
    $$('[data-z-prov]', root).forEach(el => el.classList.toggle('hit', !!z && el.dataset.zProv === z.province));
    if (!z) { res.hidden = true; return; }
    res.hidden = false; res.dataset.tier = z.tier;
    res.innerHTML = '';
    res.append(h('strong', {}, (TIER_TH[z.tier] || TIER_TH.unknown).th), h('span', {}, ` ${z.match || ''}`), h('p', {}, (TIER_TH[z.tier] || TIER_TH.unknown).note));
    if (z.tier === 'core') res.append(h('p', { class: 's-zfee' }, `ระยะทางถนนประมาณ ${z.km} กม. จากสำนักงานใหญ่ · ไม่มีค่าเดินทางเมื่อยอดงานล้างถึง ${baht(DATA.minBill)} (ต่ำกว่านั้น ${baht(TRAVEL.baseFee)} ต่อการเข้างาน)`));
    if (z.tier === 'extended') res.append(h('p', { class: 's-zfee' }, `ระยะทางถนนประมาณ ${z.km} กม. จากสำนักงานใหญ่ · ค่าเดินทาง ${baht(z.fee)} ต่อเที่ยว (ก่อน VAT)`));
    if (z.tier === 'out' && z.km != null) res.append(h('p', { class: 's-zfee' }, `ระยะทางถนนประมาณ ${z.km} กม. เกิน ${TRAVEL.maxKm} กม. — รับเป็นงานโครงการหรือสัญญา ทีมแจ้งค่าเดินทางในใบเสนอราคา`));
    cfg.onResult && cfg.onResult(z);
  }
  const run = text => { ap.input.value = text; ap.input.dispatchEvent(new Event('input')); };
  $$('[data-z-try]', root).forEach(b => b.addEventListener('click', () => run(b.dataset.zTry)));
  $$('[data-z-prov]', root).forEach(el => el.addEventListener('click', () => run(el.dataset.zProv)));
  return { pick: z => ap.set(z), input: ap.input };
}

/* ---------------- FAQ ---------------- */
export function mountFaq(root) {
  $$('details', root).forEach(d => d.addEventListener('toggle', () => { if (d.open) $$('details', root).forEach(o => o !== d && (o.open = false)); }));
}

/* ---------------- BTU helper ---------------- */
export function mountBtu(root, cfg = {}) {
  const g = k => $(`[data-btu="${k}"]`, root);
  const pad = $('[data-btu-pad]', root);
  function run() {
    const r = recommendBtu({ w: +g('w').value, d: +g('d').value, h: +g('h').value, sun: +($('[data-btu="sun"]:checked', root)?.value ?? 1), people: +g('people').value, use: g('use')?.value || 'home' });
    $$('[data-btu-out="area"]', root).forEach(x => x.textContent = r.area.toFixed(1) + ' ตร.ม.');
    $$('[data-btu-out="calc"]', root).forEach(x => x.textContent = r.btu.toLocaleString() + ' BTU');
    $$('[data-btu-out="pick"]', root).forEach(x => countUp(x, r.pick, 500, n => (Math.round(n / 1000) * 1000).toLocaleString()));
    $$('[data-btu-show]', root).forEach(x => x.textContent = `${g(x.dataset.btuShow).value}`);
    if (pad) { const knob = $('[data-btu-knob]', pad); knob.style.left = ((+g('w').value - 2) / 8 * 100) + '%'; knob.style.top = (100 - (+g('d').value - 2) / 8 * 100) + '%'; const room = $('[data-btu-room]', pad); room && (room.style.width = ((+g('w').value) / 10 * 100) + '%', room.style.height = ((+g('d').value) / 10 * 100) + '%'); }
    cfg.onChange && cfg.onChange(r);
  }
  $$('input,select', root).forEach(i => i.addEventListener('input', run));
  if (pad) {
    let drag = false;
    const move = e => { if (!drag) return; const r = pad.getBoundingClientRect(); const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); g('w').value = (2 + x * 8).toFixed(1); g('d').value = (2 + (1 - y) * 8).toFixed(1); run(); };
    pad.addEventListener('pointerdown', e => { drag = true; pad.setPointerCapture(e.pointerId); move(e); });
    pad.addEventListener('pointermove', move); pad.addEventListener('pointerup', () => drag = false);
  }
  run();
}

/* ---------------- 3D viewer wiring ---------------- */
// Rev.11: the viewer boots when its section nears the screen (gl-pool.deferred) — hidden pages no longer create WebGL at load
export function mountViewer(root, cfg = {}) { return root ? deferred(root, () => bootViewer(root, cfg)) : null; }
function bootViewer(root, cfg = {}) {
  const canvasBox = $('[data-v-canvas]', root);
  const labels = $('[data-v-labels]', root);
  const info = $('[data-v-info]', root);
  const partsList = $('[data-v-parts]', root);
  const svg = cfg.leaders ? $('[data-v-leaders]', root) : null;
  const labelEls = new Map();
  let V;
  const fallback = $('[data-v-fallback]', root);
  try {
    V = createACViewer(canvasBox, {
      style: cfg.style || 'studio', unit: cfg.unit || 'indoor', accent: cfg.accent || 0xe2711d, autoRotate: cfg.autoRotate !== false,
      wheelZoom: cfg.wheelZoom ?? false, ghost: cfg.ghost ?? 0.16, targetOffset: cfg.targetOffset || [0, 0], floorShadow: cfg.floorShadow !== false, exposure: cfg.exposure || 1, premium: cfg.premium, edgeLines: cfg.edgeLines || null, radiusScale: cfg.radiusScale || 1,
      onSelect: meta => showInfo(meta),
      onFrame: (anchors, st) => drawLabels(anchors, st),
    });
  } catch (err) {
    if (fallback) fallback.hidden = false;
    console.warn('3D unavailable', err); return null;
  }
  function renderParts() {
    if (!partsList) return;
    partsList.innerHTML = '';
    V.parts().forEach((p, i) => {
      const b = h('button', { type: 'button', class: 'part-btn', 'data-part': p.id, 'aria-pressed': 'false' }, h('span', { class: 'pn' }, String(i + 1).padStart(2, '0')), h('span', { class: 'pt' }, p.th), h('small', {}, p.en));
      b.addEventListener('click', () => { V.select(p.id); });
      partsList.append(b);
    });
  }
  function showInfo(meta) {
    // Rev.13: aria-pressed only on real buttons; other part rows (B's table) get data-sel + aria-current (valid on a table row)
    $$('[data-part]', root).forEach(b => { const on = !!meta && b.dataset.part === meta.id; if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', on); else { b.toggleAttribute('data-sel', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); } });
    if (!info) return;
    if (!meta) { info.classList.remove('on'); info.innerHTML = cfg.infoEmpty || '<p>แตะชิ้นส่วนเพื่อดูว่าทำหน้าที่อะไร และช่างทำอะไรกับมันตอนล้าง</p>'; return; }
    info.classList.add('on');
    info.innerHTML = '';
    info.append(h('small', {}, meta.en), h('h3', {}, meta.th), h('p', {}, meta.d));
    if (meta.dirty) info.append(h('p', { class: 'tag-dirty' }, 'จุดที่ฝุ่นและคราบสะสม — อยู่ในรายการล้าง'));
  }
  function drawLabels(anchors, st) {
    if (!labels) return;
    const W = labels.clientWidth, H = labels.clientHeight;
    if (svg) svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let lines = '';
    const showAll = cfg.labelsAlways || st.explode > 0.55 || st.xrayT > 0.5;
    const vis = [];
    anchors.forEach((a, i) => {
      let el = labelEls.get(a.id);
      if (!el) { el = cfg.labelTpl ? cfg.labelTpl(a, i) : h('button', { type: 'button', class: 'hs' }, a.th); el.addEventListener('click', () => V.select(a.id)); labels.append(el); labelEls.set(a.id, el); }
      const on = a.visible && (showAll || a.selected) && a.x > 0 && a.x < W && a.y > 0 && a.y < H;
      el.classList.toggle('on', on); el.classList.toggle('sel', a.selected);
      if (on) vis.push({ a, el }); else if (!cfg.leaders) el.style.transform = '';
    });
    if (cfg.leaders) {
      // two tidy columns (left / right of the unit), labels sorted by the height of their part, evenly spaced, leaders never cross
      const top = 16, bottom = H - 16, gap = Math.max(30, Math.min(40, (H - 40) / Math.max(1, Math.ceil(vis.length / 2))));
      const cx = vis.length ? vis.reduce((s, v) => s + v.a.x, 0) / vis.length : W / 2;
      const cols = [vis.filter(v => v.a.x < cx).sort((p, q) => p.a.y - q.a.y), vis.filter(v => v.a.x >= cx).sort((p, q) => p.a.y - q.a.y)];
      if (Math.abs(cols[0].length - cols[1].length) > 2) { const all = vis.slice().sort((p, q) => p.a.x - q.a.x); const half = Math.ceil(all.length / 2); cols[0] = all.slice(0, half).sort((p, q) => p.a.y - q.a.y); cols[1] = all.slice(half).sort((p, q) => p.a.y - q.a.y); }
      cols.forEach((col, ci) => {
        let y = top; const ys = col.map(v => { y = Math.max(y, Math.min(bottom, v.a.y)); const r = y; y += gap; return r; });
        const over = ys.length ? ys[ys.length - 1] - bottom : 0; if (over > 0) for (let i = ys.length - 1, lim = bottom; i >= 0; i--) { ys[i] = Math.min(ys[i], lim); lim = ys[i] - gap; }
        col.forEach((v, i) => {
          const w = v.el.offsetWidth || 110, lx = ci === 0 ? 12 : W - 12 - w, ly = ys[i];
          v.el.style.transform = `translate(${lx}px, ${ly - 13}px)`;
          const ex = ci === 0 ? lx + w + 4 : lx - 4, mx = ci === 0 ? Math.min(v.a.x - 14, ex + 26) : Math.max(v.a.x + 14, ex - 26);
          lines += `<path d="M${ex} ${ly} H${mx} L${v.a.x} ${v.a.y}" /><circle cx="${v.a.x}" cy="${v.a.y}" r="3.2" />`;
        });
      });
    } else {
      // Rev.31.1 layout: pins of parts that project close together (phone width, some angles) slide apart instead of stacking
      const kept = [];
      vis.forEach(({ a, el }) => { let x = a.x, y = a.y; for (const k of kept) { const dx = x - k.x, dy = y - k.y, d = Math.hypot(dx, dy); if (d < 32) { const ux = d > 0.5 ? dx / d : 0.8, uy = d > 0.5 ? dy / d : 0.6; x = k.x + ux * 32; y = k.y + uy * 32; } } kept.push({ x, y }); el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; });
    }
    if (svg) svg.innerHTML = lines;
  }
  const on = (sel, ev, fn) => $$(sel, root).forEach(b => b.addEventListener(ev, () => fn(b)));
  const press = (sel, b) => $$(sel, root).forEach(x => x.setAttribute('aria-pressed', x === b));
  on('[data-v-explode]', 'click', b => { const v = V.getExplode() > 0.5 ? 0 : 1; V.setExplode(v); V.view(v ? 'exploded' : 'persp'); b.setAttribute('aria-pressed', !!v); });
  on('[data-v-xray]', 'click', b => { const v = b.getAttribute('aria-pressed') !== 'true'; V.setXray(v); b.setAttribute('aria-pressed', v); });
  on('[data-v-air]', 'click', b => { const v = b.getAttribute('aria-pressed') === 'false'; V.setAirflow(v); b.setAttribute('aria-pressed', v); });
  on('[data-v-view]', 'click', b => { V.view(b.dataset.vView); press('[data-v-view]', b); });
  on('[data-v-unit]', 'click', b => { V.setUnit(b.dataset.vUnit); V.setExplode(0, true); press('[data-v-unit]', b); $$('[data-v-explode]', root).forEach(x => x.setAttribute('aria-pressed', false)); labelEls.forEach(el => el.remove()); labelEls.clear(); renderParts(); showInfo(null); V.view('persp'); });
  on('[data-v-zoom]', 'click', b => V.zoom(+b.dataset.vZoom));
  on('[data-v-finish]', 'click', b => { V.setFinish && V.setFinish(b.dataset.vFinish); press('[data-v-finish]', b); });
  const dirt = $('[data-v-dirt]', root);
  const dirtOut = $$('[data-v-dirt-out]', root);
  const setD = v => { V.setDirt(v); if (dirt) dirt.value = v; dirtOut.forEach(o => o.textContent = v < 0.05 ? 'สะอาด' : v < 0.4 ? 'เริ่มมีฝุ่น' : v < 0.75 ? 'สกปรก — ถึงรอบล้าง' : 'สกปรกมาก — ลมเบา อาจมีกลิ่น'); };
  dirt && dirt.addEventListener('input', () => setD(+dirt.value));
  on('[data-v-clean]', 'click', b => {
    if (V.state.dirt < 0.05) setD(0.85);
    V.setExplode(0); V.setXray(true); $$('[data-v-xray]', root).forEach(x => x.setAttribute('aria-pressed', true)); V.view('front');
    b.disabled = true; const t0 = b.textContent; b.textContent = 'กำลังล้าง…';
    V.clean();
    const tick = () => { if (V.state.cleaning > 0) { dirt && (dirt.value = V.state.dirt); setD(V.state.dirt); requestAnimationFrame(tick); } else { setD(0); b.disabled = false; b.textContent = t0; cfg.onCleaned && cfg.onCleaned(); } };
    requestAnimationFrame(tick);
  });
  renderParts(); showInfo(null);
  if (cfg.dirt != null) setD(cfg.dirt);
  return V;
}

/* scroll-linked explode inside a tall sticky section */
export function scrollExplode(section, V, cfg = {}) {
  if (!V) return;
  const steps = cfg.steps ? $$(cfg.steps, section) : [];
  function onScroll() {
    const r = section.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = Math.max(0, Math.min(1, -r.top / Math.max(1, total)));
    V.setExplode(Math.max(0, Math.min(1, (p - 0.08) / 0.6)));
    if (steps.length) { const i = Math.min(steps.length - 1, Math.floor(p * steps.length)); steps.forEach((s, j) => s.classList.toggle('on', j === i)); }
    cfg.onProgress && cfg.onProgress(p);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
}

/* ---------------- Virtual room ---------------- */
export function mountRoom(root) {
  const box = $('[data-r-canvas]', root);
  let R;
  try {
    R = createRoomSim(box, {
      onStats: s => {
        $$('[data-r-out="temp"]', root).forEach(x => x.textContent = s.T.toFixed(1) + '°C');
        $$('[data-r-out="time"]', root).forEach(x => x.textContent = s.reached != null ? `${Math.round(s.reached)} นาที` : (s.simMin > 150 ? 'ไม่ถึง 25°C' : `${Math.round(s.simMin)} นาที…`));
        $$('[data-r-out="need"]', root).forEach(x => x.textContent = s.need.toLocaleString() + ' BTU');
        $$('[data-r-out="fit"]', root).forEach(x => { const r = s.btu / s.need; x.dataset.fit = r < 0.9 ? 'low' : r > 1.5 ? 'high' : 'ok'; x.textContent = r < 0.9 ? 'เล็กเกินไป — เย็นช้า เครื่องทำงานหนัก' : r > 1.5 ? 'ใหญ่เกินจำเป็น — ลงทุนเกิน' : 'ขนาดเหมาะสม'; });
        const bar = $('[data-r-bar]', root); bar && bar.style.setProperty('--p', Math.max(0, Math.min(1, (32 - s.T) / 7)));
      },
    });
  } catch (e) { const fb = $('[data-v-fallback]', root); fb && (fb.hidden = false); return; }
  const g = k => $(`[data-r="${k}"]`, root);
  function apply() {
    R.set({ w: +g('w').value, d: +g('d').value, sun: +($('[data-r="sun"]:checked', root)?.value ?? 1), people: +g('people').value, btu: +g('btu').value });
    $$('[data-r-show]', root).forEach(x => x.textContent = (+g(x.dataset.rShow).value).toLocaleString());
  }
  $$('input,select', root).forEach(i => i.addEventListener('change', apply));
  $$('input[type=range]', root).forEach(i => i.addEventListener('input', () => $$(`[data-r-show="${i.dataset.r}"]`, root).forEach(x => x.textContent = (+i.value).toLocaleString())));
  $$('[data-r-restart]', root).forEach(b => b.addEventListener('click', () => R.restart()));
  apply();
  return R;
}

/* ---------------- small helpers ---------------- */
export function toast(msg) {
  let t = $('#toast'); if (!t) { t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2600);
}
export function reveal(sel = '[data-reveal]') {
  // Rev.07 design review: section-by-section fade/slide entrances read as template motion and hid content from
  // fast scrollers and screen readers — sections now render immediately; motion is kept for the 3D scenes only.
  return;
  if (reduceMotion() || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$(sel).forEach(el => { if (el.getBoundingClientRect().top < innerHeight) return; el.classList.add('rv'); io.observe(el); });
}
export function openDrawer(drawer) { drawer.hidden = false; requestAnimationFrame(() => drawer.classList.add('open')); document.body.classList.add('lock'); const c = $('[data-close]', drawer); c && c.focus(); }
export function closeDrawer(drawer) { drawer.classList.remove('open'); document.body.classList.remove('lock'); setTimeout(() => drawer.hidden = true, 260); }
export function wireDrawers() {
  $$('[data-drawer]').forEach(d => {
    watchPanel(d, () => !d.hidden && d.classList.contains('open'), () => closeDrawer(d));   // ★Rev.34 Back closes the product / compare drawer
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => closeDrawer(d)));
    d.addEventListener('click', e => { if (e.target === d) closeDrawer(d); });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') $$('[data-drawer].open').forEach(closeDrawer); });
}
export function priceRange(m, skus) { const ps = skus.map(s => s.price); return [Math.min(...ps), Math.max(...ps)]; }

/* ---------------- line art per unit type (placeholder until approved product photos) ---------------- */
// Rev.13 (owner: "icon แอร์แขวนใต้ฝ้าให้สมจริงกว่านี้ ไม่เหมือนติดผนัง … ทุกประเภท represent accurate · ดูเป็นองค์กร"):
// technical line drawings in one stroke weight — the mounting context (wall, ceiling slab, false ceiling, floor) and the real
// air path of each type tell them apart: wall = blows down/forward · ceiling-suspended = slim wide body tight under the slab,
// long horizontal throw, return from underneath · cassette = hidden body above the false ceiling, four-way panel from below ·
// floor-standing = tall cabinet, top discharge · ducted = hidden unit, linear supply diffuser + return grille.
const arr = (x1, y1, x2, y2, dash = false) => {   // line with an open chevron head at (x2, y2)
  const a = Math.atan2(y2 - y1, x2 - x1), k = 5.2, w = 0.5;
  const h1 = `${(x2 - k * Math.cos(a - w)).toFixed(1)} ${(y2 - k * Math.sin(a - w)).toFixed(1)}`, h2 = `${(x2 - k * Math.cos(a + w)).toFixed(1)} ${(y2 - k * Math.sin(a + w)).toFixed(1)}`;
  return `<path class="ta-air"${dash ? ' stroke-dasharray="2.5 3"' : ''} d="M${x1} ${y1}L${x2} ${y2}"/><path class="ta-air" d="M${h1}L${x2} ${y2}L${h2}"/>`;
};
const slab = (y, x0 = 6, x1 = 154) => { let d = `<path d="M${x0} ${y}H${x1}"/>`; for (let x = x0 + 6; x < x1; x += 10) d += `<path class="ta-hatch" d="M${x} ${y}l-6 -6"/>`; return d; };
export function typeArt(type, cls = 'art') {
  const S = (d) => `<svg class="${cls}" viewBox="0 0 160 110" role="img" aria-label="ภาพประกอบ ${TYPE_BY_ID[type].th}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><style>.ta-hatch{stroke-width:.9;opacity:.45}.ta-air{stroke-width:1.3;opacity:.75}.ta-body{fill:currentColor;fill-opacity:.07}.ta-thin{stroke-width:1}</style>${d}</svg>`;
  switch (type) {
    case 'wall': return S(
      // wall face on the left, body with top intake slots, front seam, display, open louver, air down & forward
      `<path d="M10 8V98"/>${[16, 28, 40, 52, 64, 76, 88].map(y => `<path class="ta-hatch" d="M10 ${y}l-6 6"/>`).join('')}` +
      `<rect class="ta-body" x="20" y="24" width="124" height="40" rx="10"/><path class="ta-thin" d="M30 30h104" stroke-dasharray="1.5 3"/><path d="M26 52h112"/>` +
      `<rect class="ta-thin" x="112" y="36" width="16" height="6" rx="1.5"/><path d="M30 64c16 9 88 9 104 0"/>` +
      arr(50, 76, 42, 98) + arr(80, 78, 78, 101) + arr(110, 76, 118, 98));
    case 'ceiling': return S(
      // ceiling slab, short hanger brackets, slim wide body with an end cap (depth), front outlet + louver, long horizontal
      // throw, return air drawn up into the underside
      slab(16) + `<path d="M30 16v6M128 16v6"/>` +
      `<path class="ta-body" d="M18 22H140V44H18Z"/><path class="ta-body" d="M140 22l12 -4v22l-12 4"/><path class="ta-thin" d="M26 30H132"/>` +
      `<path d="M24 44h110"/><path d="M26 44l-4 8h106l-2 -8"/>` +
      arr(40, 56, 74, 70) + arr(70, 58, 112, 70) + arr(100, 56, 146, 66) + arr(60, 98, 60, 80, true) + arr(96, 98, 96, 80, true));
    case 'cassette': return S(
      // slab + hidden body (dashed) above the false ceiling line, square panel seen from below: four louver slots, central
      // return grille, air out four ways, return up through the middle
      slab(10) + `<rect class="ta-thin" x="44" y="16" width="72" height="20" rx="3" stroke-dasharray="3 3"/><path d="M4 40H40M120 40H156"/>` +
      `<path class="ta-body" d="M40 40H120L144 58H16Z"/><path class="ta-thin" d="M48 43.5H112M24 55H136M44 42L30 56M116 42L130 56"/>` +
      `<path d="M60 46H100L106 52H54Z"/><path class="ta-thin" d="M62 48H98M58 50H102"/>` +
      arr(30, 62, 18, 80) + arr(130, 62, 142, 80) + arr(62, 64, 52, 88) + arr(98, 64, 108, 88) + arr(80, 100, 80, 62, true));
    case 'floor': return S(
      // floor line, tall cabinet with depth, top discharge louvers, display, lower return grille, air out of the top
      `<path d="M28 100H136"/>${[34, 46, 58, 70, 82, 94, 106, 118, 130].map(x => `<path class="ta-hatch" d="M${x} 100l-6 6"/>`).join('')}` +
      `<rect class="ta-body" x="56" y="12" width="44" height="88" rx="5"/><path class="ta-body" d="M100 14l10 -5v86l-10 5"/>` +
      `<path class="ta-thin" d="M62 20h32M62 25h32M62 30h32"/><rect class="ta-thin" x="70" y="40" width="16" height="6" rx="1.5"/>` +
      `<path class="ta-thin" d="M62 68h32M62 73h32M62 78h32M62 83h32M62 88h32"/>` +
      arr(54, 22, 26, 14) + arr(54, 28, 24, 32) + arr(30, 80, 52, 80, true));
    default: return S(
      // ducted: slab, hidden unit + supply duct (dashed) above the false ceiling, linear diffuser and return grille in it
      slab(10) + `<path d="M4 58H156"/><rect class="ta-thin" x="22" y="20" width="56" height="24" rx="3" stroke-dasharray="3 3"/>` +
      `<path class="ta-thin" d="M78 26H116V54M78 38H104V54" stroke-dasharray="3 3"/>` +
      `<rect class="ta-body" x="96" y="56" width="44" height="5" rx="1.5"/><rect class="ta-body" x="24" y="56" width="30" height="5" rx="1.5"/><path class="ta-thin" d="M30 56v5M36 56v5M42 56v5M48 56v5"/>` +
      arr(106, 66, 100, 92) + arr(118, 66, 118, 94) + arr(130, 66, 136, 92) + arr(39, 92, 39, 66, true));
  }
}

/* ---------------- product drawer + compare (generic markup; each variant styles it) ---------------- */
export function productDrawerContent(m, skuIndex, { onPick, on3D, onQuote } = {}) {
  const b = BRAND_BY_ID[m.brand], t = TYPE_BY_ID[m.type];
  const sku = m.skus[skuIndex];
  const wrap = h('div', { class: 'pd' });
  wrap.append(
    h('div', { class: 'pd-art', html: typeArt(m.type) }),
    h('p', { class: 'pd-brand' }, b.name, b.own ? h('b', { class: 'own-tag' }, 'แบรนด์เรา') : null),
    h('h3', { class: 'pd-title' }, m.series),
    h('p', { class: 'pd-meta' }, `${t.th} · ${m.inverter ? 'Inverter' : 'Fixed speed'} · ฉลาก ${m.label}`),
  );
  const chips = h('div', { class: 'btu-chips', role: 'radiogroup', 'aria-label': 'เลือกขนาด BTU' });
  m.skus.forEach((s, i) => chips.append(h('button', { type: 'button', role: 'radio', 'aria-checked': i === skuIndex, class: 'bchip', onclick: () => onPick && onPick(i) }, (s.btu / 1000) + 'k')));
  wrap.append(chips,
    h('dl', { class: 'pd-spec' },
      h('dt', {}, 'รหัส SKU'), h('dd', { class: 'mono' }, sku.sku),
      h('dt', {}, 'ขนาด'), h('dd', {}, btuFmt(sku.btu)),
      h('dt', {}, 'ราคาเครื่อง'), h('dd', {}, baht(sku.price), h('small', {}, ' ราคาตัวอย่าง')),
      h('dt', {}, 'สถานะ'), h('dd', {}, sku.stock === 'ready' ? 'พร้อมส่ง' : 'สั่งจอง 3–7 วัน'),
    ),
    h('div', { class: 'pd-include' },
      h('h3', {}, 'ราคารวมติดตั้งมาตรฐาน รวม'),
      h('ul', {}, h('li', {}, 'ท่อน้ำยาและสายไฟ ตามระยะมาตรฐานที่ระบุในใบเสนอราคา'), h('li', {}, 'ขาแขวนคอยล์ร้อน / ขาตั้งพื้น'), h('li', {}, 'ทดสอบระบบและแนะนำการใช้งาน')),
      h('h3', {}, 'อาจมีค่าใช้จ่ายเพิ่ม'),
      h('ul', { class: 'extra' }, h('li', {}, 'ระยะท่อเกินมาตรฐาน · รางครอบท่อ'), h('li', {}, 'งานที่สูง / นั่งร้าน'), h('li', {}, 'เดินไฟใหม่ / เบรกเกอร์')),
    ),
    h('div', { class: 'pd-cta' },
      h('button', { type: 'button', class: 'btn-primary', onclick: () => onQuote && onQuote(m, sku) }, 'ขอราคาพร้อมติดตั้ง'),
      h('button', { type: 'button', class: 'btn-ghost', onclick: () => on3D && on3D(m, sku) }, 'ดูข้างในแบบ 3 มิติ'),
    ),
  );
  return wrap;
}
export function compareTable(items) {
  const rows = [
    ['แบรนด์', x => BRAND_BY_ID[x.m.brand].name], ['รุ่น', x => x.m.series], ['ประเภท', x => TYPE_BY_ID[x.m.type].th],
    ['ขนาด', x => btuFmt(x.sku.btu)], ['ระบบ', x => x.m.inverter ? 'Inverter' : 'Fixed speed'], ['น้ำยา', x => x.m.label],
    ['ราคาเครื่อง ก่อน VAT', x => baht(x.sku.price)], ['พร้อมติดตั้งมาตรฐาน', x => x.sku.installStdEx ? baht(x.sku.px + x.sku.installStdEx) : '—'], ['รับประกัน', x => x.sku.d?.warranty || '—'],
  ];
  const tbl = h('table', { class: 'cmp' });
  tbl.append(h('thead', {}, h('tr', {}, h('th', {}, ''), ...items.map(x => h('th', {}, `${x.sku.sku}`)))));
  const tb = h('tbody');
  rows.forEach(([k, fn]) => { const vals = items.map(fn); const diff = new Set(vals).size > 1; tb.append(h('tr', { class: diff ? 'diff' : '' }, h('th', {}, k), ...vals.map(v => h('td', {}, v)))); });
  tbl.append(tb);
  return h('div', { class: 'cmp-wrap' }, tbl);
}
