// SBP AirCare — Back closes the open panel — Rev.34 (owner 6 ต.ค. 2569: "ตรวจเช็คจัดทำต่อให้แม่นยำ")
// On a phone the system Back gesture (and the browser Back button) used to switch the page BEHIND an open panel — the quotation,
// a product, the menu sheet, search, the assistant, the filter sheet — while the panel stayed open and the page stayed locked.
//   · opening a panel adds one history entry with the same address; Back pops it and closes that panel (the page does not move)
//   · closing it any other way (×, Escape, the backdrop) steps that entry back out, so Back afterwards behaves as before
//   · a link inside a panel that switches the page replaces the panel's entry (site.js push) instead of adding one
//   · inside a sandbox where history cannot be written nothing changes
// watchPanel(el, isOpen, close): el's `hidden` / `class` changes are watched; isOpen() says whether it is open; close() closes it.
let swallow = 0, swallowT = 0;
const stack = [];
const marked = () => { try { return !!(history.state && history.state.sbpPanel); } catch (e) { return false; } };
const skipNext = () => { swallow++; clearTimeout(swallowT); swallowT = setTimeout(() => { swallow = 0; }, 1500); };   // never eat a later, real Back

export function watchPanel(el, isOpen, close) {
  if (!el || typeof MutationObserver === 'undefined') return;
  let was = false;
  const entry = { close: () => { const i = stack.indexOf(entry); if (i >= 0) stack.splice(i, 1); close(); } };
  const sync = () => {
    const on = !!isOpen(); if (on === was) return; was = on;
    if (on) { stack.push(entry); try { history.pushState({ ...(history.state || {}), sbpPanel: stack.length }, '', location.href); } catch (e) { /* sandboxed */ } return; }
    const i = stack.indexOf(entry); if (i < 0) return;   // closed by Back: its entry is already gone
    stack.splice(i, 1);
    setTimeout(() => { if (marked()) { skipNext(); try { history.back(); } catch (e) { swallow = 0; } } }, 0);
  };
  new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['hidden', 'class'] });
  sync();
}
/** true while the current history entry belongs to an open panel (site.js replaces it instead of pushing on top) */
export const panelEntry = marked;

if (typeof addEventListener === 'function') addEventListener('popstate', e => {   // (node unit tests import this through commerce.js)
  if (swallow) { swallow--; e.stopImmediatePropagation(); return; }
  const top = stack[stack.length - 1];
  if (top) { e.stopImmediatePropagation(); top.close(); }
}, true);
