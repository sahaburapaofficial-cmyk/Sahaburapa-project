// Rev.31 — layout audit: every view of a page at one width. Finds what a visitor would see as broken:
//   off   · an element sticking out past the page edge (and not inside a scroller that clips it)
//   cut   · text cut off by its own box (overflow hidden / ellipsis) — ellipsis listed separately (often intended)
//   spill · text running outside its box without being clipped (long word in a narrow button, label over its border)
//   lap   · two controls (buttons, links, inputs) overlapping each other
//   tap   · controls under 24 × 24 px on a touch-width screen (WCAG 2.2 AA 2.5.8) · small = under 40 (listed, not a failure)
//           inline links in running text, sliders and visually hidden inputs excluded
//   zero  · images / canvases / svgs with no size where they should show
//   head  · heading levels that skip (h2 → h4) and views without exactly one h1
// usage: node tests/layout.mjs a.html [width=1366] [height] [--detail] [--shots dir] · npm run layout -- a.html 390 --detail
import { launch, BASE } from './_lib.mjs';
const args = process.argv.slice(2);
const page = args[0] || 'a.html', w = +(args[1] || 1366), hh = +(args[2] && !args[2].startsWith('--') ? args[2] : (w < 600 ? 844 : w < 1000 ? 1180 : 900));
const shotDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : '';
const b = await launch(); const p = await b.newPage({ viewport: { width: w, height: hh }, hasTouch: w < 1000 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${BASE}/${page}`); await p.waitForTimeout(3000);
const views = await p.evaluate(() => [...new Set([...document.querySelectorAll('[data-sx]')].map(s => s.dataset.sx))]);
const out = { page, w, views: {}, errors: errs };
for (const v of views) {
  await p.evaluate(v => { location.hash = '#' + v; }, v); await p.waitForTimeout(1800);
  // walk the view top to bottom so lazy sections boot and settle
  await p.evaluate(async () => { const H = document.body.scrollHeight; for (let y = 0; y < H; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 140)); } scrollTo(0, 0); });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(({ touch }) => {
    const docW = document.documentElement.clientWidth;
    const path = el => { const parts = []; let e = el; for (let i = 0; e && e !== document.body && i < 4; i++, e = e.parentElement) { let s = e.tagName.toLowerCase(); if (e.id) { s += '#' + e.id; parts.unshift(s); break; } const c = [...e.classList].filter(x => !/^(on|in|run|sel|open)$/.test(x)).slice(0, 2); if (c.length) s += '.' + c.join('.'); parts.unshift(s); } return parts.join(' > '); };
    const inClosed = el => { const d = el.closest('details:not([open])'); return !!d && !el.closest('summary') || (!!d && el.closest('summary') && el.closest('summary').parentElement !== d && inClosed(d.parentElement)); };
    const srOnly = el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return (r.width <= 2 && r.height <= 2) || cs.clip !== 'auto' && cs.clip !== '' || /inset\(50%|inset\(100%/.test(cs.clipPath) || el.matches('.vh,.sr-only,.visually-hidden,[class$="-sr"]'); };
    const shown = el => { if (el.closest('[hidden]') || inClosed(el) || srOnly(el)) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; return el.getClientRects().length > 0; };
    const clipsX = el => { for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox !== 'visible') return true; } return false; };
    const fixedish = el => { for (let a = el; a && a !== document.documentElement; a = a.parentElement) { const ps = getComputedStyle(a).position; if (ps === 'fixed') return true; } return false; };
    // sticky bars (header) legitimately sit over scrolled content — not an overlap bug
    const stickyish = el => { for (let a = el; a && a !== document.documentElement; a = a.parentElement) { const ps = getComputedStyle(a).position; if (ps === 'fixed' || ps === 'sticky') return true; } return false; };
    // the part of an element a visitor can actually see: its box cut by every ancestor that clips (scrollers, overflow hidden)
    const visRect = el => { let r = el.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom; for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const q = a.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } } return { left: L, top: T, right: R, bottom: B, width: R - L, height: B - T }; };
    const boxes = el => getComputedStyle(el).display === 'inline' ? [...el.getClientRects()] : [visRect(el)];
    const all = [...document.querySelectorAll('body *')].filter(el => !['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'OPTION'].includes(el.tagName) && !(el instanceof SVGElement && el.tagName !== 'svg') && shown(el));
    const R = { off: [], cut: [], ell: [], spill: [], lap: [], tap: [], small: [], zero: [], head: [] };
    const textOf = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    for (const el of all) {
      const rc = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if ((rc.right > docW + 1 || rc.left < -1) && rc.width > 0 && !clipsX(el) && !fixedish(el)) R.off.push(path(el) + ` [${Math.round(rc.left)}…${Math.round(rc.right)} of ${docW}]`);
      const txt = textOf(el);
      if (txt && el.clientWidth > 0) {
        const ox = cs.overflowX, ow = el.scrollWidth - el.clientWidth;
        const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
        if (ow > 2 && (ox === 'hidden' || ox === 'clip')) (cs.textOverflow === 'ellipsis' || clamp ? R.ell : R.cut).push(path(el) + ` "${txt.slice(0, 40)}" (+${ow}px)`);
        else if (ow > 3 && ox === 'visible' && cs.display !== 'inline' && !/^(TD|TH)$/.test(el.tagName)) R.spill.push(path(el) + ` "${txt.slice(0, 40)}" (+${ow}px)`);
        const oy = el.scrollHeight - el.clientHeight;
        if (oy > 3 && (cs.overflowY === 'hidden' || cs.overflowY === 'clip') && el.clientHeight > 0 && el.clientHeight < 120) (clamp ? R.ell : R.cut).push(path(el) + ` "${txt.slice(0, 40)}" (↓${oy}px)`);
      }
      if (/^(IMG|CANVAS|svg)$/.test(el.tagName) && (rc.width < 1 || rc.height < 1)) R.zero.push(path(el));
    }
    const ctl = all.filter(el => el.matches('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], summary') && !stickyish(el) && !el.closest('[aria-hidden="true"], .s-hp'));
    const bx = ctl.map(boxes);
    for (let i = 0; i < ctl.length; i++) {
      const a = ctl[i], ra = a.getBoundingClientRect(); if (ra.width < 2 || ra.height < 2) continue;
      if (touch) {
        const inText = a.tagName === 'A' && getComputedStyle(a).display === 'inline' && a.parentElement && /^(P|LI|SPAN|SMALL|DD|TD|LABEL)$/.test(a.parentElement.tagName);
        const visuallyHidden = getComputedStyle(a).opacity === '0' || (a.matches('input[type=radio],input[type=checkbox]') && a.closest('label'));
        const ranged = a.matches('input[type=range]') && ra.width >= 120;   // a slider is dragged along its length
        const lbl = ` ${Math.round(ra.width)}×${Math.round(ra.height)} "${(a.innerText || a.value || a.getAttribute('aria-label') || '').trim().slice(0, 24)}"`;
        // WCAG 2.2 AA 2.5.8: at least 24 × 24 · under 40 is listed as "small" (comfortable thumb size is ~44)
        if (!inText && !visuallyHidden && !ranged && (ra.height < 24 || ra.width < 24)) R.tap.push(path(a) + lbl);
        else if (!inText && !visuallyHidden && !ranged && (ra.height < 40 || ra.width < 40)) R.small.push(path(a) + lbl);
      }
      for (let j = i + 1; j < ctl.length; j++) {
        const c = ctl[j]; if (a.contains(c) || c.contains(a)) continue;
        let best = 0, bix = 0, biy = 0;
        for (const p of bx[i]) for (const q of bx[j]) { const ix = Math.min(p.right, q.right) - Math.max(p.left, q.left), iy = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top); if (ix > 4 && iy > 4 && ix * iy > best) { best = ix * iy; bix = ix; biy = iy; } }
        if (best) R.lap.push(`${path(a)}  ⟷  ${path(c)} (${Math.round(bix)}×${Math.round(biy)})`);
      }
    }
    const hs = all.filter(el => /^H[1-6]$/.test(el.tagName)); let prev = 0;
    hs.forEach(hx => { const n = +hx.tagName[1]; if (prev && n > prev + 1) R.head.push(`${hx.tagName} after H${prev}: "${hx.textContent.trim().slice(0, 40)}" ${path(hx)}`); prev = n; });
    const h1 = hs.filter(x => x.tagName === 'H1').length; if (h1 !== 1) R.head.push(`h1 × ${h1}`);
    return R;
  }, { touch: w < 1000 });
  if (shotDir) await p.screenshot({ path: `${shotDir}/${page.replace('.html', '')}-${w}-${v}.png`, fullPage: false });
  out.views[v] = Object.fromEntries(Object.entries(r).map(([k, a]) => [k, { n: a.length, s: [...new Set(a)].slice(0, 8) }]));
}
const tot = {}; Object.values(out.views).forEach(v => Object.entries(v).forEach(([k, x]) => { tot[k] = (tot[k] || 0) + x.n; }));
console.log(JSON.stringify({ page, w, total: tot, errors: errs.length }));
if (errs.length) console.log("ERRORS", errs.slice(0, 5));
if (args.includes('--detail')) console.log(JSON.stringify(out.views, null, 1));
await b.close();
// exit 1 on anything a visitor would see as broken (ellipsis and "small" are listed for review, not failures)
process.exitCode = ['off', 'cut', 'spill', 'lap', 'tap', 'zero', 'head'].some(k => tot[k]) || errs.length ? 1 : 0;
