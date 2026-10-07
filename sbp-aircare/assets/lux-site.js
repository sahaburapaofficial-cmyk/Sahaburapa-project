// SBP AirCare — wiring for the second website (designs D · E · F) — Rev.29
// Every feature of the first website (A · B · C) is here — quick booking, quotation + booking ticket, catalogue + product drawer,
// trade-in, room studio, room fit, crew at work, symptom triage, standards, all prices, materials, enterprise + annual contract,
// knowledge, service area, FAQ, contact — through the same modules, so prices and business rules have one source (CLAUDE.md §6.6).
// What differs per design is the page itself (markup, art direction, motion) and its signature piece (cinema3d / atelier /
// spatial3d), mounted by the page through `hero(ctx)`.
// The repeated markup (catalogue frame, annual-contract builder, service-area panel, contact form) is built here once.
import { mountCatalog, mountBuilder, mountZone, mountFaq, toast, wireDrawers, openDrawer, closeDrawer, compareTable, typeArt, h, $, $$, baht, BRAND_BY_ID, TYPE_BY_ID, reduceMotion } from './proto-ui.js';
import { FAQ, PRESETS, TYPES, loadData } from './sbp-core.js';
import { mountCart, productDetail, mountPriceCenter, cart, mountMaterials } from './commerce.js';
import { mountStudio } from './studio.js';
import { mountServices } from './services.js';
import { mountHowItWorks } from './howitworks3d.js';
import { mountAreaMap } from './areamap3d.js';
import { mountStandards } from './standards.js';
import { mountSymptomGuide } from './symptoms.js';
import { mountEnterprise } from './enterprise.js';
import { mountAnnualPlan } from './annualplan.js';
import { mountAllServices } from './allservices.js';
import { mountTradeIn } from './tradein.js';
import { travelTable, mountQuotePill, mountMobileMenu, mountFlow, enhanceQuoteForm, askTeam } from './journey.js';
import { loadMedia, productVisual } from './product-media.js';
import { mountRoomFit } from './roomfit.js';
import { mountKnowledge } from './knowledge.js';
import { mountJobGuide } from './jobguide.js';
import { mountSite } from './site.js';
import { mountQuickClean, cleanFrom } from './quickclean.js';
import { soundButton } from './luxsound.js';
import { mountDock } from './luxdock.js';
import { mountDoors, mountPaths } from './servicepath.js';
import { aiFill } from './aiart.js';

const fill = (sel, ...kids) => { const el = $(sel); if (el) el.append(...kids.flat().filter(Boolean)); return el; };

function catalogFrame() {
  return [h('div', { class: 'rail', id: 'rail', role: 'group', 'aria-label': 'ประเภทแอร์' }),
    h('div', { class: 'cat', 'data-catalog': '' },
      h('aside', { class: 'facets-wrap', 'aria-label': 'ตัวกรอง' }, h('div', { 'data-cat-facets': '' })),
      h('div', { style: 'min-width:0' },
        h('div', { class: 'ctop' }, h('label', { class: 'search' }, h('span', { class: 'vh' }, 'ค้นหา'), h('input', { 'data-cat-search': '', placeholder: 'ค้นหารุ่น แบรนด์ หรือ BTU' })),
          h('button', { type: 'button', class: 'btn-ghost filter-btn', 'data-cat-sheet-open': '' }, 'ตัวกรอง'),
          h('select', { 'data-cat-sort': '', 'aria-label': 'เรียง' }, [['rec', 'แนะนำ'], ['price-asc', 'ราคาต่ำ–สูง'], ['price-desc', 'ราคาสูง–ต่ำ'], ['btu', 'BTU']].map(([v, t]) => h('option', { value: v }, t)))),
        h('div', { class: 'chips', 'data-cat-chips': '' }), h('p', { class: 'count', 'data-cat-count': '' }), h('div', { class: 'grid', 'data-cat-grid': '' }),
        h('button', { type: 'button', class: 'btn-ghost more-btn', 'data-cat-more': '' }, 'โหลดเพิ่ม')),
      h('div', { class: 'sheet', 'data-cat-sheet': '' }, h('div', { class: 'sp', role: 'dialog', 'aria-label': 'ตัวกรอง' },
        h('div', { class: 'ph-h' }, h('b', {}, 'ตัวกรอง'), h('button', { type: 'button', class: 'btn-ghost', 'data-cat-sheet-close': '' }, 'ปิด')),
        h('div', { class: 'body', id: 'sheetBody' }), h('div', { class: 'foot' }, h('button', { type: 'button', class: 'btn-primary', 'data-cat-sheet-apply': '' }, 'แสดงผล')))))];
}
function builderFrame() {
  const radio = v => h('label', {}, h('input', { type: 'radio', name: 'lx-vis', value: v, 'data-b-visits': '' }), h('span', {}, v + ' ครั้ง'));
  return h('div', { class: 'bld', 'data-builder': '' },
    h('div', { class: 'panel' }, h('div', { class: 'presets', id: 'presets' }), h('div', { class: 'urows', id: 'urows' }),
      h('div', { class: 'bopts' },
        h('div', {}, h('p', { class: 'lx-lab' }, 'ความถี่ต่อปี'), h('div', { class: 'chips3' }, radio('2'), radio('3'), radio('4'))),
        h('label', { class: 'field', style: 'flex:1;min-width:200px' }, 'ที่ตั้ง', h('input', { id: 'lx-zone', 'data-b-zone': '', placeholder: 'เขต / อำเภอ' }), h('span', { class: 'zr', 'data-b-zone-result': '' })),
        h('label', { class: 'chk' }, h('input', { type: 'checkbox', id: 'lx-high', 'data-b-high': '' }), ' ติดสูงเกิน 3 ม.'))),
    h('aside', { class: 'panel sum', 'aria-live': 'polite' },
      h('p', { class: 'lx-lab' }, 'ราคาต่อปี ก่อน VAT'), h('p', { class: 'num' }, h('span', { 'data-b-out': 'low' }, '—')), h('p', { class: 'mono lx-hi', 'data-b-out': 'high' }),
      h('dl', {}, ...[['จำนวนเครื่อง', 'count', '0'], ['ความถี่', 'visits', '—'], ['เฉลี่ย/เครื่อง/ปี', 'perunit', '—'], ['กำลังคนต่อรอบ', 'teamdays', '—'], ['พื้นที่', 'tier', '—']].flatMap(([a, k, d]) => [h('dt', {}, a), h('dd', { 'data-b-out': k }, d)])),
      h('p', { class: 'lx-ok', 'data-b-out': 'off' }), h('a', { class: 'btn-primary', href: '#quote', 'data-quote': '' }, 'ใส่ใบเสนอราคา'),
      h('p', { class: 'disc' }, 'คำนวณจาก Pricebook งานล้าง 2569 · งานสูงและพื้นที่พิเศษประเมินหน้างาน · แสดงอัตรามาตรฐาน งานปริมาณมากทีมขายเสนออัตราพิเศษตามเงื่อนไขในใบเสนอราคา')));
}
const zoneFacts = () => h('ul', { class: 'cov2-facts' }, h('li', {}, h('b', {}, 'พื้นที่หลัก'), ' กรุงเทพฯ ในระยะ 30 กม. ไม่มีค่าเดินทางเมื่องานล้างถึงขั้นต่ำ'),
  h('li', {}, h('b', {}, 'นอกพื้นที่หลัก'), ' ', h('span', { 'data-travel': 'baseFee' }, '300'), ' บาท + ', h('span', { 'data-travel': 'perKm' }, '10'), ' บาทต่อ กม. ที่เกิน ', h('span', { 'data-travel': 'freeKm' }, '30'), ' กม. (ก่อน VAT)'),
  h('li', {}, h('b', {}, 'เกิน 150 กม.'), ' รับเป็นงานโครงการหรือสัญญา'));
function coverageFrame() {
  return h('div', { class: 'cov2 panel', 'data-zone': '' }, h('div', { id: 'covMap' }),
    h('div', { class: 'cov2-side' }, h('label', { class: 'field' }, 'ตรวจพื้นที่หน้างาน', h('input', { 'data-z-input': '', placeholder: 'แขวง/ตำบล เขต/อำเภอ หรือรหัสไปรษณีย์' })),
      h('div', { class: 'zres', 'data-z-result': '', hidden: true }), zoneFacts(), h('a', { class: 'cov2-more', href: '#area' }, 'ตารางค่าเดินทางและแผนที่เต็ม')));
}
function areaFrame() {
  return h('div', { class: 'cov', 'data-zone': '' }, h('div', { id: 'mapRoot' }),
    h('div', { class: 'panel', style: 'display:grid;gap:12px;align-content:start' }, h('label', { class: 'field' }, 'ตรวจพื้นที่', h('input', { 'data-z-input': '', placeholder: 'เขต อำเภอ จังหวัด หรือรหัสไปรษณีย์' })),
      h('div', { class: 'try' }, ['สาทร', 'บางบัวทอง', 'บางพลี', 'สามพราน', 'ศรีราชา', 'ระยอง'].map(z => h('button', { type: 'button', 'data-z-try': z }, z))),
      h('div', { class: 'zres', 'data-z-result': '', hidden: true }), h('div', { id: 'travelTbl' })));
}
function quoteFrame(title = 'ให้ทีมติดต่อกลับ', sub = 'ฝากชื่อและเบอร์ ทีมขายโทรกลับในเวลาทำการ') {
  return h('div', { class: 'panel lx-quote' }, h('div', {}, h('h2', {}, title), h('p', {}, sub)),
    h('form', { id: 'qform' }, h('label', { class: 'field' }, 'ชื่อ', h('input', { id: 'qc-name', required: true })), h('label', { class: 'field' }, 'เบอร์โทร', h('input', { id: 'qc-tel', inputmode: 'tel', required: true })),
      h('button', { class: 'btn-primary' }, 'ส่งข้อมูล')));
}

/**
 * mountLux({ variant, views, order, labels, theme, jobType, studioStart, throwStyle, fitPreset, cardTpl, quote, hero })
 * hero(ctx) is called before the site views are wired; ctx = { CART, go(id), openProduct }
 */
export async function mountLux(cfg) {
  const { variant, views, order, labels = {}, theme = 'light', jobType = 'wall', studioStart = 'condobed', throwStyle = 'glass', fitPreset = 'bedroom' } = cfg;
  fill('#catalogRoot', catalogFrame()); fill('#b2bRoot', builderFrame()); fill('#covRoot', coverageFrame()); fill('#areaRoot', areaFrame());
  fill('#quoteRoot', quoteFrame(...(cfg.quote || [])));
  await loadData(); await loadMedia();
  enhanceQuoteForm();
  $$('[data-ask]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); askTeam(a.dataset.ask); }));
  const CART = mountCart();
  // ★Rev.32 sound: one header button per page (off until pressed) — D cinematic bed · E room tone · F holodeck hum
  { const cartB = $('.hdr [data-cart-btn]'); if (cartB) cartB.before(soundButton({ D: 'cinema', E: 'room', F: 'holo' }[variant] || 'cinema')); }
  let SITE = null; const go = id => SITE ? SITE.go(id) : (document.getElementById(id) || {}).scrollIntoView?.();
  const QC = mountQuickClean($('#bookRoot'), { openCart: CART.open, onB2B: () => go('b2b') });
  { const f = cleanFrom(); if (f) $$('[data-clean-from]').forEach(x => x.textContent = baht(f)); }
  mountQuotePill(CART.open);
  if ($('#flowRoot')) mountFlow($('#flowRoot'), { room: 'studio', product: 'catalog', service: 'cleanflow', area: 'area', quote: 'quote' }, { openCart: CART.open });
  mountMobileMenu();
  const T = theme;
  const drawer = $('#drawer');
  let FIT = null;
  function openProduct(m, i = 0) { const b = $('#drawerBody'); b.innerHTML = ''; b.append(productDetail(m, i, { onPick: j => openProduct(m, j), on3D: () => { closeDrawer(drawer); go('fit'); }, onFit: (mm, k) => { closeDrawer(drawer); FIT && FIT.setModel(mm, k); go('fit'); } })); if (drawer.hidden) openDrawer(drawer); }
  const ctx = { CART, go, openProduct, QC };
  // signature piece first: it is the first thing on the page
  if (cfg.hero) await cfg.hero(ctx);
  const HWX = $('#howRoot') ? mountHowItWorks($('#howRoot'), { theme: T, start: jobType === 'cassette' ? 'cassette' : 'wall', throwStyle }) : null;
  if ($('#studioRoot')) mountStudio($('#studioRoot'), { theme: T, sceneStart: studioStart, onOpen: (m, i) => openProduct(m, i) });
  FIT = $('#fitRoot') ? mountRoomFit($('#fitRoot'), { theme: T, preset: fitPreset, onOpenModel: (m, i) => openProduct(m, i) }) : null;
  const JOB = $('#cleanRoot') ? mountJobGuide($('#cleanRoot'), { theme: T, start: 'C1', type: jobType }) : null;
  if ($('#learnRoot')) mountKnowledge($('#learnRoot'), { ids: { cleanflow: 'cleanflow', fit: 'fit', studio: 'studio', howto: 'howto', catalog: 'catalog', inside: 'howto', prices: 'prices', quality: 'quality', b2b: 'b2b', area: 'area', quote: 'quote' } });
  if ($('#qualityRoot')) mountMaterials($('#qualityRoot'), { theme: T });   // includes the brand spec cards (matcards)
  const SVX = $('#servicesRoot') ? mountServices($('#servicesRoot'), { how: false, onType: t => HWX && HWX.setType(t) }) : null;
  mountStandards($('#stdRoot'));
  mountSymptomGuide($('#symRoot'), { openCart: CART.open });
  $('#travelTbl') && $('#travelTbl').append(travelTable());
  // annual contract builder
  PRESETS.forEach(p => $('#presets').append(h('button', { type: 'button', 'data-b-preset': p.id, 'aria-pressed': 'false' }, p.th, h('small', {}, p.sub))));
  TYPES.forEach(t => $('#urows').append(h('div', { class: 'urow' }, h('div', { html: typeArt(t.id) }), h('div', {}, h('b', {}, t.th), h('div', { class: 'bar' }, h('i', { 'data-b-bar': t.id }))),
    h('div', { class: 'stp' }, h('button', { type: 'button', 'data-b-step': `${t.id}:-1`, 'aria-label': 'ลด' }, '−'), h('input', { type: 'number', min: '0', id: `lx-u-${t.id}`, 'data-b-unit': t.id, 'aria-label': `จำนวน ${t.th}`, inputmode: 'numeric' }), h('button', { type: 'button', 'data-b-step': `${t.id}:1`, 'aria-label': 'เพิ่ม' }, '+')))));
  const BLD = mountBuilder($('[data-builder]'));
  mountAnnualPlan($('[data-builder]'), { builder: BLD });
  mountEnterprise($('#entRoot'), { openCart: CART.open, builder: BLD });
  const PC = mountPriceCenter($('#priceCenter'));
  mountAllServices($('#allSvc'), { prices: PC });
  // catalogue
  const tilt = el => {
    if (reduceMotion() || matchMedia('(hover:none)').matches) return el;
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.setProperty('--rx', (-y * 4).toFixed(2) + 'deg'); el.style.setProperty('--ry', (x * 5).toFixed(2) + 'deg'); el.style.setProperty('--gx', ((x + .5) * 100).toFixed(1) + '%'); el.style.setProperty('--gy', ((y + .5) * 100).toFixed(1) + '%'); });
    el.addEventListener('pointerleave', () => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
    return el;
  };
  const cat = mountCatalog($('[data-catalog]'), {
    pageSize: 12, toast,
    skeleton: () => h('div', { class: 'skel' }, h('i', { style: 'aspect-ratio:4/3' }), h('i', { style: 'height:14px;width:50%' }), h('i', { style: 'height:32px' })),
    cardTpl: (m, skus, si, act) => { const b = BRAND_BY_ID[m.brand], s = skus[si];
      return tilt(h('article', { class: 'card' }, h('div', { class: 'ph' }, productVisual(m, s)),
        h('p', { class: 'br' }, b.name, b.own ? h('b', { class: 'own-tag' }, 'แบรนด์เรา') : null, ' · ', TYPE_BY_ID[m.type].th), h('h3', {}, m.series),
        h('div', { class: 'btu-chips', role: 'radiogroup', 'aria-label': 'BTU' }, skus.map((k, i) => h('button', { type: 'button', role: 'radio', class: 'bchip', 'aria-checked': i === si, onclick: () => act.pick(i) }, (k.btu / 1000) + 'k'))),
        h('div', { class: 'pr' }, h('b', {}, baht(s.price)), h('span', { class: 'st o' }, 'ก่อน VAT')),
        h('p', { class: 'inst' }, s.installStdEx ? `พร้อมติดตั้ง ${baht(s.px + s.installStdEx)}` : 'ติดตั้ง: ประเมินหน้างาน'),
        h('div', { class: 'acts' }, h('button', { type: 'button', class: 'open', onclick: () => openProduct(m, m.skus.indexOf(s)) }, 'รายละเอียด'), h('button', { type: 'button', 'aria-pressed': act.inCompare, onclick: act.compare }, act.inCompare ? '✓ เทียบ' : '+ เทียบ')))); },
    rowTpl: () => h('div'),
    onOpen: (m, s) => openProduct(m, m.skus.indexOf(s)),
    onCompare: items => { const b = $('#drawerBody'); b.innerHTML = ''; b.append(h('h3', { class: 'lx-cmp-h' }, 'เทียบรุ่น'), compareTable(items)); openDrawer(drawer); },
  });
  const railAll = h('button', { type: 'button', 'aria-pressed': 'true', onclick: () => pickRail(null, railAll) }, 'ทั้งหมด');
  $('#rail').append(railAll, ...TYPES.map(t => { const b = h('button', { type: 'button', 'aria-pressed': 'false' }, h('span', { html: typeArt(t.id) }), t.th); b.addEventListener('click', () => pickRail(t.id, b)); return b; }));
  function pickRail(id, btn) { $$('#rail button').forEach(b => b.setAttribute('aria-pressed', b === btn)); cat.setType(id); }
  const facets = $('[data-cat-facets]'), home = facets.parentElement; const mq = matchMedia('(max-width:1080px)'); const place = () => (mq.matches ? $('#sheetBody') : home).append(facets); mq.addEventListener('change', place); place();
  wireDrawers();
  // service area: the home band + the full map, each linked to its address picker
  if ($('#covMap')) { const COV = await mountAreaMap($('#covMap'), { theme: T, compact: true }); mountZone($('#covRoot [data-zone]'), { onResult: z => COV.highlight(z) }); }
  let ZONE = null; const AMAP = await mountAreaMap($('#mapRoot'), { theme: T, onPick: a => ZONE && ZONE.pick(a) });
  ZONE = mountZone($('#areaRoot [data-zone]'), { onResult: z => AMAP.highlight(z) });
  FAQ.forEach(f => $('#faqList').append(h('details', {}, h('summary', {}, f.q), h('p', {}, f.a))));
  mountFaq($('#faqList'));
  $$('[data-quote]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const est = BLD && BLD.estimate();
    if (est && est.count) cart.add({ kind: 'service', group: 'contract', key: 'K-' + [est.count, est.visits, BLD.state().pkg].join('-'), name: `สัญญาล้างรายปี ${est.count} เครื่อง × ${est.visits} ครั้ง/ปี`, detail: `${BLD.state().pkg} · ${est.level.th}${est.travel ? ' · รวมค่าเดินทางแล้ว' : ''}`, unitEx: est.annualEx, qty: 1, units: est.count });
    CART.open();
  }));
  mountTradeIn($('#tiRoot'), { catalog: cat, openCart: CART.open });
  // Rev.30: designs without the consultation as their hero (D · F) offer it under the intent picker, like A · B · C
  if (!$('#conRoot') && $('#startRoot')) {
    const box = h('details', { class: 's-con' }, h('summary', {}, h('b', {}, 'ยังไม่แน่ใจว่าต้องการบริการไหน'), h('span', {}, 'ตอบ 4 ข้อ ให้เราจัดลำดับบริการที่เหมาะกับคุณ')), h('div'));
    $('#startRoot').after(box);
    import('./atelier.js').then(m => m.mountConcierge(box.lastChild, { go, openCart: CART.open, prefill: QC && QC.prefill }));
  }
  SITE = mountSite({
    variant, openCart: CART.open, openProduct, views, order, labels,
    hooks: {
      clean: () => JOB && JOB.setJob('clean'), install: () => JOB && JOB.setJob('install'),
      repair: () => SVX && SVX.set('repair'),
    },
  });
  // ★Rev.38 the three services as customer journeys: doors on the home page → the six-step path at the top of the services page
  const PATHS = mountPaths($('#pathsRoot'), { go, openCart: CART.open, hooks: { clean: () => JOB && JOB.setJob('clean'), install: () => JOB && JOB.setJob('install') } });
  mountDoors($('#doorsRoot'), { onPick: k => { PATHS && PATHS.show(k); go('paths'); } });
  // Rev.42: a full-width AI film / image band above the service doors when slot hero:<variant> is set (aiart.js) — hidden otherwise
  { const d = $('#doors'); if (d) { const band = h('div', { class: 'lx-ai-hero', hidden: true }); d.prepend(band); aiFill(band, 'hero:' + variant).then(ok => { band.hidden = !ok; }); } }
  mountDock();   // Rev.35: "ในหน้านี้" rail on wide screens
  return { ...ctx, SITE, JOB, FIT, HWX, cat };
}
