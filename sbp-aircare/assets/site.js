// SBP AirCare — site structure for the beta (Rev.09 r5, owner 2 ต.ค. 2569: "เน้นทำ UX/UI และ feature ให้สมบูรณ์ ใช้งานได้จริง เตรียม
// beta test ให้ลูกค้าทดลองใช้ทั้ง 3 แบบ … จัดเรียงให้ใช้งานได้จริงแบบเป็น section หมวดหมู่ workflow และ customer experience / journey").
// The long single page becomes 6 views that follow how a customer decides:
//   หน้าแรก (what do you need?) · ซื้อแอร์ · ล้าง/ติดตั้ง/ซ่อม · สำหรับองค์กร · ความรู้·ลองเอง · ติดต่อเรา
// Every existing section keeps its id and its module; this module only shows the view a section belongs to — the menu, hash links,
// in-page links and scrollIntoView() calls all switch views — and adds: a short intro + jump links at the top of each view,
// "next step" cards at the bottom, an intent picker on the home view that starts a guided journey (a step strip that follows the
// customer across views and remembers progress), the company / contact block, the beta notice + feedback form, and the footer.
// Hidden views do not boot their 3D (scenes start on IntersectionObserver), so each view is lighter than the old page.
import { h, $, $$, COMPANY, DEMO, BRANDS, PROCESS } from './sbp-core.js';
import { cart } from './commerce.js';
import { askTeam } from './contact.js';
import { deliver, canSend, privacyNote, honeypot } from './submit.js';

const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: the page still works */ } },
};

export const VIEWS = {
  home: { th: 'หน้าแรก' },
  shop: { th: 'ซื้อแอร์', lead: 'หาขนาดที่เหมาะกับห้อง เลือกรุ่นพร้อมราคาติดตั้ง แล้วลองวางในห้องของคุณก่อนตัดสินใจ' },
  service: { th: 'ล้าง · ติดตั้ง · ซ่อม', lead: 'ดูทีมช่างทำงานทีละขั้น เทียบระดับงาน ราคามาตรฐานจาก Pricebook และวัสดุที่ระบุไว้ในทุกแพ็กเกจ' },
  business: { th: 'สำหรับองค์กร', lead: 'สัญญาล้างรายปี วางรอบล่วงหน้าทั้งปี มีรายงานรายเครื่อง ใส่จำนวนเครื่องแล้วเห็นงบประมาณทันที' },
  knowledge: { th: 'ความรู้ · ลองเอง', lead: 'อ่านสั้น ๆ ก่อนตัดสินใจ แล้วลองกับเครื่องมือจำลอง: แอร์ทำงานอย่างไร ลมเย็นไปทางไหน ล้างแล้วได้อะไร' },
  contact: { th: 'ติดต่อเรา', lead: 'ข้อมูลบริษัท ช่องทางติดต่อ พื้นที่ให้บริการ และส่งคำขอให้ทีมติดต่อกลับ' },
};
const SEC_TH = {
  hero: 'เริ่มต้น', start: 'เลือกสิ่งที่ต้องการ', flow: 'ขั้นตอนใช้บริการ', services: 'บริการของเรา', 'proc-sec': 'ขั้นตอนทำงาน',
  catalog: 'เลือกรุ่นและราคา', studio: 'หาขนาด BTU ตามห้อง', room: 'หาขนาด BTU ตามห้อง', fit: 'ลองวางในห้องของคุณ',
  cleanflow: 'ทีมช่างทำงานทีละขั้น', prices: 'ราคาทุกบริการ', quality: 'วัสดุในแพ็กเกจ', story: 'ล้างถึงชิ้นไหน', inside: 'ข้างในแอร์',
  howto: 'แอร์ทำงานอย่างไร · ขั้นตอนบริการ', b2b: 'ประเมินงบสัญญารายปี', learn: 'คู่มือก่อนตัดสินใจ', journey: 'แอร์ทำงานอย่างไร',
  about: 'เกี่ยวกับเรา', area: 'พื้นที่ให้บริการ', faq: 'คำถามที่พบบ่อย', quote: 'ส่งคำขอ',
};
// guided journeys: [section id (alternatives a|b), what the customer does there]; 'quote' = the quotation (or the contact form)
export const JOURNEYS = {
  clean: { th: 'ล้างแอร์', sub: 'บ้าน คอนโด ร้าน สำนักงาน · ล้างปกติ C1 หรือล้างใหญ่ C2', topic: 'ล้างแอร์', ico: 'M4 9h16v6H4zM7 15v3M12 15v4M17 15v3',
    steps: [['cleanflow', 'ดูขั้นตอนช่าง เลือก C1 / C2'], ['prices', 'ดูราคาตามประเภทและขนาด'], ['area', 'ตรวจพื้นที่และค่าเดินทาง'], ['quote', 'ส่งคำขอนัดล้าง']] },
  buy: { th: 'ซื้อแอร์ใหม่ + ติดตั้ง', sub: '', topic: 'ซื้อแอร์', ico: 'M3 7h18v8H3zM6 15v2M18 15v2M7 11h6',
    steps: [['studio|room', 'หาขนาด BTU ที่เหมาะกับห้อง'], ['catalog', 'เลือกรุ่นและแพ็กเกจติดตั้ง'], ['fit', 'ลองวางในห้องของคุณ'], ['quote', 'ส่งใบเสนอราคา']] },
  install: { th: 'ติดตั้ง / ย้ายแอร์', sub: 'มีเครื่องแล้ว · ติดตั้งมาตรฐาน หรือพรีเมียม', topic: 'ติดตั้งแอร์', ico: 'M14 4l6 6-9 9H5v-6z',
    steps: [['cleanflow', 'ดูขั้นตอนติดตั้งของทีม'], ['quality', 'วัสดุที่ใช้ในแต่ละแพ็กเกจ'], ['prices', 'ราคาติดตั้งตามขนาด'], ['quote', 'ขอสำรวจ / ใบเสนอราคา']] },
  repair: { th: 'แอร์มีปัญหา / ซ่อม', sub: 'ไม่เย็น น้ำหยด มีเสียง มีกลิ่น', topic: 'ซ่อม / ตรวจเช็ก', ico: 'M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9',
    steps: [['howto', 'เช็กอาการเบื้องต้นและขั้นตอนตรวจซ่อม'], ['prices', 'ค่าตรวจเช็กและค่าซ่อม'], ['quote', 'แจ้งอาการให้ทีม']] },
  business: { th: 'องค์กร / สัญญารายปี', sub: 'สำนักงาน ร้านค้า โรงงาน อาคาร', topic: 'สัญญาล้างรายปี', ico: 'M4 20V8l8-4 8 4v12M9 20v-6h6v6',
    steps: [['b2b', 'ประเมินงบล้างทั้งปี'], ['cleanflow', 'ดูมาตรฐานงานล้าง (SOP)'], ['area', 'พื้นที่และค่าเดินทาง'], ['quote', 'ขอใบเสนอราคาสัญญา']] },
};
// what to do after each view
const NEXT = {
  shop: [{ cart: 1, th: 'ดูใบเสนอราคาของคุณ', sub: 'รวมเครื่อง ติดตั้ง อุปกรณ์เสริม และ VAT' }, { go: 'area', th: 'ตรวจพื้นที่และค่าเดินทาง', sub: 'ฟรีในกรุงเทพฯ และปริมณฑล' }, { go: 'cleanflow', pre: 'install', th: 'ดูขั้นตอนติดตั้งของทีม', sub: 'มาตรฐาน / พรีเมียม ทดสอบอะไรบ้าง' }],
  service: [{ cart: 1, th: 'ดูใบเสนอราคาของคุณ', sub: 'รายการที่กดเพิ่มไว้ รวม VAT' }, { ask: 'ล้างแอร์', th: 'นัดวันกับทีม', sub: 'ฝากชื่อและเบอร์ ทีมโทรกลับ' }, { go: 'catalog', th: 'ซื้อแอร์ใหม่พร้อมติดตั้ง', sub: 'ทุกรุ่นพร้อมราคา' }],
  business: [{ ask: 'สัญญาล้างรายปี', th: 'ส่งรายการเครื่องให้ทีม', sub: 'ทีมขายเตรียมใบเสนอราคาสัญญา' }, { go: 'cleanflow', pre: 'clean', th: 'ดูมาตรฐานงานล้าง', sub: 'ขั้นตอนตามแบบฟอร์มของบริษัท' }, { go: 'area', th: 'พื้นที่ให้บริการ', sub: 'และค่าเดินทางนอกพื้นที่หลัก' }],
  knowledge: [{ go: 'studio|room', th: 'หาขนาด BTU ที่เหมาะ', sub: 'เลือกห้องที่ใกล้เคียงของคุณ' }, { go: 'catalog', th: 'ดูรุ่นแอร์และราคา', sub: 'เทียบรุ่นได้' }, { ask: 'อื่น ๆ', th: 'ถามทีมของเรา', sub: 'ฝากคำถาม ทีมติดต่อกลับ' }],
  contact: [{ go: 'home', th: 'กลับไปเลือกบริการ', sub: 'เริ่มจากสิ่งที่ต้องการ' }, { go: 'catalog', th: 'ดูรุ่นแอร์', sub: 'พร้อมราคาติดตั้ง' }, { go: 'cleanflow', th: 'ดูทีมช่างทำงาน', sub: 'ล้าง และติดตั้ง ทีละขั้น' }],
};
const svgI = d => h('span', { class: 'sx-ico', 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>` });

/**
 * mountSite({ variant, views: { home: [ids…], shop: […], … }, order, navFmt(i, th), labels, hooks: { clean, install, repair, business, buy }, openCart })
 * → { go(id), view(), startJourney(key) }
 */
export function mountSite(cfg) {
  const { variant = 'A', views, order = ['home', 'shop', 'service', 'business', 'knowledge', 'contact'], hooks = {}, openCart = () => {}, navFmt = (i, th) => th, labels = {} } = cfg;
  document.documentElement.classList.add('sx-on');
  const L = id => labels[id] || SEC_TH[id] || id;
  /* ---- 1 · which view each section belongs to ---- */
  const VOF = {}, ELS = {};
  Object.entries(views).forEach(([v, ids]) => { ELS[v] = []; ids.forEach(id => { const el = document.getElementById(id); if (!el) return; el.dataset.sx = v; VOF[id] = v; ELS[v].push(el); }); });
  Object.values(ELS).forEach(l => l.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));   // page order, not config order
  const pick = ids => ids.split('|').find(id => VOF[id]);
  const live = order.filter(v => ELS[v] && ELS[v].length);

  /* ---- 2 · menu ---- */
  const nav = $('header nav');
  if (nav) { nav.innerHTML = ''; live.forEach((v, i) => nav.append(h('a', { href: '#' + v, 'data-v': v }, navFmt(i, VIEWS[v].th)))); }
  const navLinks = nav ? $$('a[data-v]', nav) : [];

  /* ---- 3 · intro + jump links at the top of every view, next-step cards at the bottom ---- */
  const INTRO = {};
  live.filter(v => v !== 'home').forEach(v => {
    const els = ELS[v], first = els[0], last = els[els.length - 1];
    const js = h('div', { class: 'sx-js', hidden: true });
    const h1 = h('h1', { tabindex: '-1' }, VIEWS[v].th);
    const box = h('div', { class: 'sx-vh', 'data-sx': v },
      h('p', { class: 'sx-crumb' }, h('a', { href: '#home' }, 'หน้าแรก'), h('span', { 'aria-hidden': 'true' }, ' / '), h('span', {}, VIEWS[v].th)),
      h1, h('p', { class: 'sx-lead' }, VIEWS[v].lead),
      els.length > 1 ? h('nav', { class: 'sx-jump', 'aria-label': 'หัวข้อในหน้านี้' }, els.map((el, i) => h('a', { href: '#' + el.id }, h('b', {}, String(i + 1)), L(el.id)))) : null, js);
    if (!first.parentElement.closest('.wrap')) box.classList.add('wrap');   // a full-bleed section (C #journey) sits outside the page column
    first.parentNode.insertBefore(box, first);
    INTRO[v] = { box, js, h1 };
    const cards = (NEXT[v] || []).map(nextCard).filter(Boolean);
    if (cards.length) last.parentNode.insertBefore(h('div', { class: 'sx-next' + (last.parentElement.closest('.wrap') ? '' : ' wrap'), 'data-sx': v }, h('h2', {}, 'ขั้นต่อไป'), h('div', { class: 'sx-next-g' }, cards)), last.nextSibling);
  });
  function nextCard(n) {
    const target = n.cart ? 'quote' : n.ask ? 'quote' : VIEWS[n.go] ? n.go : pick(n.go);
    if (!target) return null;
    const a = h('a', { class: 'sx-nc', href: '#' + target }, h('b', {}, n.th), n.sub ? h('small', {}, n.sub) : null);
    a.addEventListener('click', e => {
      if (n.cart) { e.preventDefault(); if (cart.items.length) openCart(); else { go('quote'); } return; }
      if (n.ask) { e.preventDefault(); askTeam(n.ask); return; }
      if (n.pre && hooks[n.pre]) hooks[n.pre]();
    });
    return a;
  }

  /* ---- 4 · router: views, hash links, scrollIntoView ---- */
  let cur = null;
  const seen = new Set();
  function show(v, scroll = 'top', focus = false) {
    if (!ELS[v] || !ELS[v].length) v = 'home';
    if (v !== cur) {
      cur = v; seen.add(v);
      $$('[data-sx]').forEach(el => { el.hidden = el.dataset.sx !== v; });
      navLinks.forEach(a => { if (a.dataset.v === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      document.documentElement.dataset.sxView = v;
      try { document.title = v === 'home' ? baseTitle : `${VIEWS[v].th} · ${baseTitle}`; } catch (e) { /* ignore */ }
      paintJourney(); observeSteps();
      hooks.onView && hooks.onView(v);
    }
    if (scroll === 'top') instant(() => scrollTo({ top: 0, behavior: 'instant' }), () => scrollTo(0, 0));   // a new view starts at its top at once
    if (focus && INTRO[v]) INTRO[v].h1.focus({ preventScroll: true });
  }
  const baseTitle = document.title;
  const push = id => { try { history.pushState(null, '', '#' + id); } catch (e) { /* sandboxed: fine without history */ } };
  const ORIG = Element.prototype.scrollIntoView;
  // instant jump (CSS scroll-behavior:smooth on the page would otherwise animate it); older browsers without 'instant' get the CSS switched off for the call
  function instant(f, legacy) { const de = document.documentElement, sb = de.style.scrollBehavior; de.style.scrollBehavior = 'auto'; try { f(); } catch (e) { legacy(); } de.style.scrollBehavior = sb; }
  const jumpTo = el => instant(() => ORIG.call(el, { block: 'start', behavior: 'instant' }), () => ORIG.call(el, { block: 'start' }));
  let touched = false;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(t => addEventListener(t, () => { touched = true; }, { once: true, passive: true }));
  function go(id, { pushHash = true, initial = false } = {}) {
    if (id === 'top' || id === '') id = 'home';
    if (VIEWS[id]) { show(id, 'top', true); if (pushHash) push(id); return; }
    const el = document.getElementById(id); if (!el) return;
    const sec = el.closest('[data-sx]');
    if (sec) show(sec.dataset.sx, null);
    if (pushHash) push(id);
    // opening a link to a section: jump there, and once more after scenes above it have booted and settled their height
    if (initial) { requestAnimationFrame(() => jumpTo(el)); setTimeout(() => { if (!touched) jumpTo(el); }, 900); return; }
    requestAnimationFrame(() => ORIG.call(el, { behavior: RM() ? 'auto' : 'smooth', block: 'start' }));
  }
  // any code that scrolls to a section in another view (knowledge "ลองเอง", product → "ลองวางในห้อง", askTeam …) switches the view first
  Element.prototype.scrollIntoView = function (o) {
    const sec = this.closest && this.closest('[data-sx]');
    if (sec && sec.dataset.sx !== cur) { show(sec.dataset.sx, null); const el = this; requestAnimationFrame(() => ORIG.call(el, o)); return; }
    return ORIG.call(this, o);
  };
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (id === 'top' || VIEWS[id] || (id && document.getElementById(id) && document.getElementById(id).closest('[data-sx]'))) { e.preventDefault(); go(id); }
  });
  addEventListener('popstate', () => route(location.hash, false));
  addEventListener('hashchange', () => route(location.hash, false));
  function route(hash, initial) {
    const id = decodeURIComponent((hash || '').replace(/^#/, ''));
    if (!id) { show('home', initial ? null : 'top'); return; }
    go(id, { pushHash: false, initial });
  }

  /* ---- 5 · guided journey (intent → steps across views) ---- */
  let J = store.get('sbp-journey-v1', null); if (J && !JOURNEYS[J.k]) J = null;
  const stepsOf = k => JOURNEYS[k].steps.map(([ids, th], i) => ({ i, id: ids === 'quote' ? 'quote' : pick(ids), th })).filter(s => s.id);
  const saveJ = () => store.set('sbp-journey-v1', J);
  const here = h('div', { class: 'sx-here', hidden: true });
  let hereStep = null;
  function goStep(s) {
    if (s.id === 'quote') { if (cart.items.length) { openCart(); markDone(s.i); } else askTeam(JOURNEYS[J.k].topic); return; }
    hereStep = s; const el = document.getElementById(s.id);
    if (el) { el.before(here); here.dataset.sx = el.dataset.sx; }
    go(s.id); paintHere();
    requestAnimationFrame(() => requestAnimationFrame(() => { if (!here.hidden) ORIG.call(here, { behavior: RM() ? 'auto' : 'smooth', block: 'start' }); }));
  }
  function paintHere() {
    here.innerHTML = '';
    if (!J || !hereStep || !here.isConnected) { here.hidden = true; return; }
    const steps = stepsOf(J.k), k = steps.findIndex(x => x.i === hereStep.i), nx = steps.slice(k + 1).find(x => !J.done.includes(x.i)) || steps.find(x => !J.done.includes(x.i) && x.i !== hereStep.i);
    here.append(h('p', {}, h('b', {}, `${JOURNEYS[J.k].th} · ขั้นที่ ${k + 1} จาก ${steps.length}`), h('span', {}, hereStep.th)),
      nx ? h('button', { type: 'button', class: 's-btn primary', onclick: () => goStep(nx) }, `ขั้นต่อไป: ${nx.th}`) : null);
    here.hidden = here.dataset.sx !== cur;
  }
  function markDone(i) { if (!J || J.done.includes(i)) return; J.done.push(i); saveJ(); paintJourney(); }
  function startJourney(k) {
    if (!JOURNEYS[k]) return; J = { k, done: [] }; saveJ();
    hooks[k] && hooks[k]();
    const s = stepsOf(k)[0]; if (s) goStep(s);
    paintJourney();
  }
  function stripEl() {
    const steps = stepsOf(J.k), nextS = steps.find(s => !J.done.includes(s.i)) || null, n = steps.filter(s => J.done.includes(s.i)).length;
    return h('div', { class: 'sx-jsi' },
      h('p', { class: 'sx-jst' }, h('b', {}, `เส้นทางของคุณ: ${JOURNEYS[J.k].th}`), h('span', {}, ` · ทำแล้ว ${n} จาก ${steps.length} ขั้น`)),
      h('ol', {}, steps.map((s, k) => h('li', {}, h('button', { type: 'button', class: (J.done.includes(s.i) ? 'done ' : '') + (nextS && s.i === nextS.i ? 'next' : ''), 'aria-label': `ขั้นที่ ${k + 1} ${s.th}${J.done.includes(s.i) ? ' (ทำแล้ว)' : ''}`, onclick: () => goStep(s) }, h('i', {}, J.done.includes(s.i) ? '✓' : String(k + 1)), h('span', {}, s.th))))),
      h('div', { class: 'sx-jsa' },
        nextS ? h('button', { type: 'button', class: 's-btn primary', onclick: () => goStep(nextS) }, `ขั้นต่อไป: ${nextS.th}`) : h('p', { class: 'sx-jsd' }, 'ครบทุกขั้นแล้ว ทีมจะติดต่อกลับหลังได้รับสรุปคำขอของคุณ'),
        h('button', { type: 'button', class: 's-btn ghost', onclick: () => { J = null; saveJ(); paintJourney(); } }, 'ปิดเส้นทางนี้')));
  }
  const homeJ = h('div', { class: 'sx-js sx-js-home', hidden: true });
  function paintJourney() {
    Object.values(INTRO).forEach(x => { x.js.hidden = true; x.js.innerHTML = ''; });
    homeJ.hidden = true; homeJ.innerHTML = '';
    if (!J) { hereStep = null; here.remove(); return; }
    paintHere();
    const tgt = cur === 'home' ? homeJ : INTRO[cur] && INTRO[cur].js; if (!tgt) return;
    tgt.append(stripEl()); tgt.hidden = false;
  }
  // a step counts as done once its section has been on screen for a moment
  let stepIO = null;
  function observeSteps() {
    if (stepIO) stepIO.disconnect(); if (!J) return;
    const steps = stepsOf(J.k), timers = new Map();
    stepIO = new IntersectionObserver(es => es.forEach(e => {
      const s = steps.find(x => document.getElementById(x.id) === e.target); if (!s) return;
      if (e.isIntersecting) timers.set(s.i, setTimeout(() => markDone(s.i), 1800)); else clearTimeout(timers.get(s.i));
    }), { rootMargin: '-35% 0px -35% 0px' });   // crosses the middle of the screen (a threshold would never fire on very tall sections)
    steps.forEach(s => { const el = document.getElementById(s.id); if (el && el.dataset.sx === cur) stepIO.observe(el); });
  }

  /* ---- 6 · home: what do you need? + trust facts ---- */
  const startRoot = $('#startRoot');
  if (startRoot) {
    const nb = BRANDS.filter(b => b.n).length;
    JOURNEYS.buy.sub = `${DEMO.skuCount} รุ่น ${nb} แบรนด์ พร้อมราคาติดตั้ง`;
    const cards = ['clean', 'buy', 'install', 'repair', 'business'].map(k => {
      const j = JOURNEYS[k], steps = stepsOf(k);
      return h('button', { type: 'button', class: 'sx-int', onclick: () => startJourney(k) },
        svgI(j.ico), h('b', {}, j.th), h('small', {}, j.sub),
        h('ol', {}, steps.map(s => h('li', {}, s.th))), h('span', { class: 'sx-int-go' }, 'เริ่ม'));
    });
    cards.push(h('button', { type: 'button', class: 'sx-int sx-int-fuj', onclick: () => askTeam('FUJIVA') }, svgI('M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z'), h('b', {}, 'แอร์ FUJIVA'), h('small', {}, 'แบรนด์ของบริษัท · ราคากำลังจะขึ้นเว็บ'), h('ol', {}, h('li', {}, 'สอบถามรุ่นและราคากับทีมขาย')), h('span', { class: 'sx-int-go' }, 'สอบถาม')));
    startRoot.append(homeJ, h('div', { class: 'sx-ints' }, cards),
      h('ul', { class: 'sx-trust', 'aria-label': 'ทำไมเลือกเรา' }, [
        `ประสบการณ์ด้านแอร์ ${COMPANY.years}`, 'ทีมช่างของบริษัทเอง', 'ราคามาตรฐานจาก Pricebook แสดงก่อนเรียกช่าง', 'ใบกำกับภาษีเต็มรูป', 'รายงานหลังงานรายเครื่อง', 'วัสดุติดตั้งระบุยี่ห้อ'].map(t => h('li', {}, t))));
  }

  /* ---- 7 · about + contact ---- */
  // company facts written into page markup from one place (data-co="tel|email|addr|web|th")
  $$('[data-co]').forEach(el => { const k = el.dataset.co; if (!COMPANY[k]) return; el.textContent = COMPANY[k]; if (el.tagName === 'A' && k === 'tel') el.setAttribute('href', COMPANY.telHref); });
  const aboutRoot = $('#aboutRoot');
  if (aboutRoot) {
    const copyMsg = h('span', { class: 'sx-cm', 'aria-live': 'polite' });
    const copyBtn = (txt, ok) => h('button', { type: 'button', class: 'sx-copy', onclick: async () => { try { await navigator.clipboard.writeText(txt); copyMsg.textContent = ok; } catch (e) { copyMsg.textContent = 'เลือกข้อความแล้วคัดลอกจากเครื่องของคุณ'; } } }, 'คัดลอก');
    aboutRoot.append(h('div', { class: 'sx-about' },
      h('div', { class: 'sx-co' },
        h('p', { class: 'sx-co-b' }, `${COMPANY.brand} · บริการโดย ${COMPANY.service}`),
        h('h3', {}, COMPANY.th), h('p', { class: 'sx-co-en' }, COMPANY.en),
        h('p', {}, `ประสบการณ์ด้านอะไหล่ น้ำยา และอุปกรณ์เครื่องปรับอากาศ ${COMPANY.years} — ${COMPANY.trade} · ทีมบริการของบริษัทรับงานล้าง ติดตั้ง ซ่อม และย้ายแอร์ ทั้งบ้านและองค์กร และจำหน่ายแอร์ FUJIVA แบรนด์ของบริษัท`),
        h('dl', { class: 'sx-co-dl' },
          h('dt', {}, 'สำนักงาน'), h('dd', {}, COMPANY.addr, ' ', h('a', { href: COMPANY.mapUrl, target: '_blank', rel: 'noopener' }, 'เปิดแผนที่')),
          h('dt', {}, 'โทร'), h('dd', {}, h('a', { href: COMPANY.telHref }, COMPANY.tel)),
          h('dt', {}, 'อีเมล'), h('dd', {}, h('span', { class: 'sx-sel' }, COMPANY.email), ' ', copyBtn(COMPANY.email, 'คัดลอกอีเมลแล้ว'), copyMsg),
          h('dt', {}, 'LINE'), h('dd', {}, h('a', { href: COMPANY.lineUrl, target: '_blank', rel: 'noopener' }, COMPANY.line)),
          h('dt', {}, 'เว็บไซต์บริษัท'), h('dd', {}, h('a', { href: COMPANY.webUrl, target: '_blank', rel: 'noopener' }, COMPANY.web), ' · ', h('a', { href: COMPANY.fbUrl, target: '_blank', rel: 'noopener' }, 'Facebook')),
          h('dt', {}, 'เลขประจำตัวผู้เสียภาษี'), h('dd', {}, COMPANY.taxId),
          COMPANY.hours ? [h('dt', {}, 'เวลาทำการ'), h('dd', {}, COMPANY.hours)] : []),
        h('div', { class: 'sx-co-act' }, h('a', { class: 's-btn primary', href: '#quote' }, 'ให้ทีมติดต่อกลับ'), h('a', { class: 's-btn ghost', href: '#area' }, 'ตรวจพื้นที่ให้บริการ'))),
      h('div', { class: 'sx-how' },
        h('h3', {}, 'ทำงานกับเราอย่างไร'),
        h('ol', {}, PROCESS.map(p => h('li', {}, h('b', {}, p.th), h('span', {}, p.d)))),
        h('h3', {}, 'มาตรฐานที่ตรวจสอบได้'),
        h('ul', { class: 'sx-std' }, ['ขั้นตอนงานล้างตามแบบฟอร์ม SBP-SR-ACCL-UNI-001', 'ขั้นตอนงานติดตั้งตามแบบฟอร์ม SBP-SR-ACIN-UNI-001', 'รับประกันงานติดตั้ง 3 ปี เมื่อซื้อเครื่องจากบริษัท · 1 ปี เมื่อจัดหาเครื่องเอง', 'ใบเสนอราคาระบุยี่ห้อและสเปกวัสดุ'].map(t => h('li', {}, t))))));
  }

  /* ---- 8 · contact form: Rev.10 sends to the team (submit.js) when the endpoint is set, else the honest hand-off box ---- */
  const qf = $('#qform');
  if (qf) {
    const sb = qf.querySelector('button:not([type="button"])'); if (sb) { sb.textContent = canSend() ? 'ส่งคำขอให้ทีมติดต่อกลับ' : 'สรุปคำขอเพื่อส่งให้ทีม'; qf.insertBefore(honeypot(), sb); sb.after(privacyNote()); }
    const out = h('div', { class: 'sx-qout', hidden: true });
    qf.after(out);
    qf.addEventListener('submit', e => {
      e.preventDefault();
      const ref = 'R' + Date.now().toString().slice(-7);
      const lab = x => { const l = x.closest('label'); return l ? [...l.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim() : x.getAttribute('aria-label') || x.id; };
      const used = [...qf.querySelectorAll('input,select,textarea')].filter(x => x.value && x.type !== 'hidden' && x.name !== 'website');
      const rows = used.map(x => `${lab(x)}: ${x.value}`), fields = Object.fromEntries(used.map(x => [lab(x), x.value]));
      const t = cart.totals(), items = cart.items.length ? ['', `รายการในใบเสนอราคาเบื้องต้น (${cart.items.length} รายการ · ยอดประมาณการ ${Math.round(t.inc).toLocaleString('th-TH')} บาท รวม VAT)`, ...cart.items.map(i => `• ${i.name} × ${i.qty}`)] : [];
      const hp = qf.querySelector('[name="website"]')?.value || '';
      deliver(out, 'contact', { ref, variant, fields, hp, title: 'คำขอให้ทีมติดต่อกลับ', text: [`คำขอจากเว็บไซต์ SBP AirCare (แบบ ${variant}) · เลขอ้างอิง ${ref}`, ...rows, ...items].join('\n'), subject: 'คำขอให้ทีมติดต่อกลับ' });
      out.hidden = false; if (J) { const q = stepsOf(J.k).find(s => s.id === 'quote'); q && markDone(q.i); }
      requestAnimationFrame(() => ORIG.call(out, { behavior: RM() ? 'auto' : 'smooth', block: 'nearest' }));
    });
  }

  /* ---- 9 · beta notice, feedback, footer, mobile bar ---- */
  const proto = $('aside.proto');
  const fbBtn = () => h('button', { type: 'button', class: 'sx-fbb', onclick: openFeedback }, 'ให้ความเห็น');
  if (proto) {
    const hub = proto.querySelector('a');
    proto.innerHTML = ''; proto.classList.add('sx-beta');
    proto.append(h('b', {}, `ทดลองใช้ (Beta) · แบบ ${variant}`), h('span', { class: 'sx-bt' }, canSend() ? ' · ราคาจาก Pricebook 2569 · คำขอส่งถึงทีมโดยตรง' : ' · ราคาจาก Pricebook 2569 · ช่วงทดลองระบบยังไม่ส่งคำขอถึงทีมอัตโนมัติ'), ' ', fbBtn());
    if (hub) { hub.textContent = 'เทียบแบบ A · B · C'; proto.append(' ', hub); }
  }
  const foot = $('footer');
  if (foot) {
    foot.innerHTML = '';
    foot.append(h('div', { class: 'wrap sx-foot' },
      h('div', {}, h('b', { class: 'sx-fb-brand' }, COMPANY.brand), h('p', {}, COMPANY.th), h('p', {}, COMPANY.addr), h('p', {}, 'โทร ', h('a', { href: COMPANY.telHref }, COMPANY.tel), ' · ', h('span', { class: 'sx-sel' }, COMPANY.email)), h('p', {}, 'LINE ', h('a', { href: COMPANY.lineUrl, target: '_blank', rel: 'noopener' }, COMPANY.line), ' · เลขผู้เสียภาษี ', COMPANY.taxId)),
      h('div', {}, h('h4', {}, 'บริการและสินค้า'), h('ul', {}, live.filter(v => v !== 'home').map(v => h('li', {}, h('a', { href: '#' + v }, VIEWS[v].th))))),
      h('div', {}, h('h4', {}, 'ช่วงทดลองใช้'), h('p', {}, 'เว็บไซต์เวอร์ชันทดลองสำหรับลูกค้ากลุ่มแรก ราคาตาม Pricebook 2569 ยืนยันอีกครั้งในใบเสนอราคาอย่างเป็นทางการ'), fbBtn()),
      h('div', {}, h('h4', {}, 'บริษัท'), h('ul', {}, h('li', {}, h('a', { href: '#about' }, 'เกี่ยวกับเรา')), h('li', {}, h('a', { href: COMPANY.webUrl, target: '_blank', rel: 'noopener' }, COMPANY.web)), h('li', {}, h('a', { href: '#faq' }, 'คำถามที่พบบ่อย'))))));
  }
  const mbar = $('.mbar');
  // Rev.10: LINE OA is confirmed (@sahaservices on the company site) → the LINE button is back in the mobile bar
  if (mbar) { const ls = $$('a', mbar); if (ls[0]) { ls[0].textContent = 'ติดต่อ'; ls[0].setAttribute('href', '#contact'); } if (ls[1]) { ls[1].textContent = 'LINE'; ls[1].setAttribute('href', COMPANY.lineUrl); ls[1].setAttribute('target', '_blank'); ls[1].setAttribute('rel', 'noopener'); } }

  function openFeedback() {
    const prev = document.activeElement;
    const close = () => { dlg.remove(); removeEventListener('keydown', esc); prev && prev.focus && prev.focus(); };
    const esc = e => { if (e.key === 'Escape') close(); };
    const radios = (name, opts) => h('div', { class: 'sx-rad', role: 'radiogroup' }, opts.map(o => h('label', {}, h('input', { type: 'radio', name, value: o }), h('span', {}, o))));
    const f = h('form', { class: 'sx-fbf' },
      h('fieldset', {}, h('legend', {}, 'โดยรวมใช้งานง่ายแค่ไหน'), radios('sx-ease', ['1 ยากมาก', '2', '3', '4', '5 ง่ายมาก'])),
      h('fieldset', {}, h('legend', {}, 'หาสิ่งที่ต้องการเจอไหม'), radios('sx-find', ['เจอทันที', 'เจอแต่ใช้เวลา', 'หาไม่เจอ'])),
      h('label', { class: 's-field' }, 'ส่วนที่ชอบหรือมีประโยชน์ที่สุด', h('select', { name: 'sx-best' }, h('option', { value: '' }, 'เลือก'), live.map(v => h('option', {}, VIEWS[v].th)))),
      h('label', { class: 's-field' }, 'อะไรที่สับสน หรืออยากให้ปรับ', h('textarea', { name: 'sx-fix', rows: 3 })),
      h('label', { class: 's-field' }, 'ชื่อ / เบอร์ (ถ้าต้องการให้ทีมติดต่อกลับ)', h('input', { name: 'sx-who', autocomplete: 'name' })),
      h('div', { class: 'sx-dlg-a' }, h('button', { type: 'submit', class: 's-btn primary' }, canSend() ? 'ส่งความเห็น' : 'สร้างสรุปความเห็น'), h('button', { type: 'button', class: 's-btn ghost', onclick: close }, 'ปิด')));
    const body = h('div', { class: 'sx-dlg-b' }, h('h2', { id: 'sx-fb-h' }, `ช่วยเราปรับเว็บไซต์ · แบบ ${variant}`), h('p', {}, 'ใช้เวลาไม่ถึง 1 นาที ความเห็นของคุณใช้ตัดสินใจเลือกแบบเว็บไซต์จริง'), f);
    const dlg = h('div', { class: 'sx-dlg', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sx-fb-h' }, body);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    f.addEventListener('submit', e => {
      e.preventDefault(); const fd = new FormData(f), g = k => (fd.get(k) || '').toString().trim();
      const text = [`ความเห็นทดลองใช้เว็บไซต์ SBP AirCare · แบบ ${variant}`, `ใช้งานง่าย: ${g('sx-ease') || '-'}`, `หาสิ่งที่ต้องการ: ${g('sx-find') || '-'}`, `ส่วนที่ชอบที่สุด: ${g('sx-best') || '-'}`, `ควรปรับ: ${g('sx-fix') || '-'}`, `หน้าที่เปิดดู: ${[...seen].map(v => VIEWS[v].th).join(', ')}`, g('sx-who') ? `ผู้ให้ความเห็น: ${g('sx-who')}` : null].filter(Boolean).join('\n');
      const box = h('div'), ref = 'F' + Date.now().toString().slice(-7);
      body.innerHTML = ''; body.append(h('h2', { id: 'sx-fb-h' }, 'ขอบคุณสำหรับความเห็น'), box, h('div', { class: 'sx-dlg-a' }, h('button', { type: 'button', class: 's-btn ghost', onclick: close }, 'ปิด')));
      deliver(box, 'feedback', { ref, variant, text, title: 'ความเห็นของคุณ', subject: `ความเห็นทดลองใช้เว็บไซต์ แบบ ${variant}`,
        fields: { 'ใช้งานง่าย': g('sx-ease'), 'หาสิ่งที่ต้องการ': g('sx-find'), 'ส่วนที่ชอบที่สุด': g('sx-best'), 'ควรปรับ': g('sx-fix'), 'หน้าที่เปิดดู': [...seen].map(v => VIEWS[v].th).join(', '), 'ผู้ให้ความเห็น': g('sx-who') } });
    });
    document.body.append(dlg); addEventListener('keydown', esc);
    requestAnimationFrame(() => { const x = dlg.querySelector('input,select,textarea,button'); x && x.focus(); });
  }

  route(location.hash, true);
  return { go, view: () => cur, startJourney, openFeedback };
}
