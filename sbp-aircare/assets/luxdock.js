// SBP AirCare — "ในหน้านี้" dock for the second website (D · E · F) — Rev.35 (owner 6 ต.ค. 2569: "D E F ทำเป็นแบบใหม่ … ต้อง smooth
// ลื่นและใช้งานแบบดีกว่าเดิมในอีกรูปแบบนึง")
// The D/E/F pages are long, cinematic scrolls. On wide screens a slim rail on the right lists the sections of the page in view,
// lights the one being read and jumps to any of them (the links go through site.js like every #id link — views switch,
// history works). Labels open on hover / focus; the current one stays readable. Rebuilt whenever the view changes.
import { h } from './sbp-core.js';

export function mountDock() {
  if (typeof IntersectionObserver !== 'function') return null;
  const dock = h('nav', { class: 'lx-dock', 'aria-label': 'หัวข้อในหน้านี้', hidden: true });
  document.body.append(dock);
  let io = null, items = [];
  const label = s => {
    const j = document.querySelector(`.sx-vh:not([hidden]) .sx-jump a[href="#${s.id}"]`);
    const t = j ? j.lastChild.textContent : ((s.querySelector('h2') || {}).textContent || '');
    return t.replace(/\s+/g, ' ').trim().slice(0, 42);
  };
  const mark = s => items.forEach(([x, a]) => { if (x === s) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  function build() {
    if (io) io.disconnect();
    const secs = [...document.querySelectorAll('main section[id]')].filter(s => !s.closest('[hidden]') && !s.parentElement.closest('section[id]') && label(s));
    dock.innerHTML = ''; dock.hidden = secs.length < 3;
    items = secs.map((s, i) => { const a = h('a', { href: '#' + s.id }, h('span', {}, label(s)), h('i', { 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0'))); dock.append(a); return [s, a]; });
    io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) mark(e.target); }); }, { rootMargin: '-42% 0px -52% 0px' });
    secs.forEach(s => io.observe(s));
  }
  let t = 0;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(build, 60); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-sx-view'] });
  build();
  return { build };
}
