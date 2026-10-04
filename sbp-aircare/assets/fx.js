// SBP AirCare — pointer effects, one signature per prototype — Rev.14 (owner 2 ต.ค. 2569: "หยิบเล็กหยิบน้อยจากเว็บระดับโลก").
//   A · Bento  — soft spotlight that follows the pointer across a card (Linear / Vercel)
//   B · Sheet  — engineering crosshair with the drawing zone (A–C × 1–4) and relative X/Y over the title-block drawing
//                (Teenage Engineering / technical-sheet feel)
//   C · Showroom — the hero stage light follows the pointer, cards get a glowing gradient rim where the pointer is
//                (Apple Vision Pro / car configurators)
// Only for a mouse / trackpad (hover + fine pointer), never with reduced motion; nothing animates on its own and nothing is
// injected into content — one overlay element is moved into the card under the pointer and removed when it leaves.
import { $ } from './sbp-core.js';

const FINE = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const TARGETS = {
  A: '.tile, .sx-int, .qc-type, .s-card, .cg-col, .sv2-list li, .st-air-box',
  B: '.sx-int, .qc-type, .cg-col, .sv2-list li',
  C: '.card, .panel, .sx-int, .qc-type, .cg-col, .sv2-list li, .glass',
};

export function mountFx(variant = 'A') {
  if (!FINE()) return null;
  document.documentElement.classList.add('fx-' + variant);
  /* ---- card spotlight (all variants; B uses a flat tint, C adds the rim) ---- */
  const spot = document.createElement('span'); spot.className = 'fx-spot'; spot.setAttribute('aria-hidden', 'true');
  let host = null;
  const sel = TARGETS[variant] || TARGETS.A;
  const leave = () => { if (host) { host.classList.remove('fx-host'); spot.remove(); host = null; } };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const t = e.target.closest && e.target.closest(sel);
    if (t !== host) { leave(); if (t && !t.closest('.cp')) { host = t; if (getComputedStyle(t).position === 'static') t.classList.add('fx-rel'); t.classList.add('fx-host'); t.append(spot); } }
    if (host) { const r = host.getBoundingClientRect(); spot.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px'); spot.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px'); }
  }, { passive: true });
  document.addEventListener('pointerleave', leave);
  addEventListener('scroll', () => { if (host && !host.matches(':hover')) leave(); }, { passive: true });

  /* ---- B · crosshair over the hero drawing ---- */
  if (variant === 'B') {
    const frame = $('#top .frame') || $('.frame');
    if (frame) {
      const x = document.createElement('div'); x.className = 'fx-xh'; x.setAttribute('aria-hidden', 'true');
      x.innerHTML = '<i class="h"></i><i class="v"></i><b></b>'; frame.append(x);
      if (getComputedStyle(frame).position === 'static') frame.classList.add('fx-rel');
      const lab = x.querySelector('b');
      frame.addEventListener('pointerenter', () => x.classList.add('on'));
      frame.addEventListener('pointerleave', () => x.classList.remove('on'));
      frame.addEventListener('pointermove', e => {
        const r = frame.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
        x.style.setProperty('--x', (e.clientX - r.left).toFixed(0) + 'px'); x.style.setProperty('--y', (e.clientY - r.top).toFixed(0) + 'px');
        const zone = 'ABC'[Math.min(2, Math.floor(fy * 3))] + (Math.min(3, Math.floor(fx * 4)) + 1);
        lab.textContent = `ZONE ${zone} · X ${fx.toFixed(2)} · Y ${fy.toFixed(2)}`;
        x.classList.toggle('flip', fx > 0.7);
      }, { passive: true });
    }
  }
  /* ---- C · the stage light follows the pointer over the hero ---- */
  if (variant === 'C') {
    const stage = $('#top.stage') || $('.stage');
    if (stage) {
      const glow = document.createElement('div'); glow.className = 'fx-stagelight'; glow.setAttribute('aria-hidden', 'true'); stage.prepend(glow);
      let q = 0, tx = 0.6, ty = 0.4, cx = 0.6, cy = 0.4;
      const step = () => { cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12; glow.style.setProperty('--gx', (cx * 100).toFixed(1) + '%'); glow.style.setProperty('--gy', (cy * 100).toFixed(1) + '%'); q = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(step) : 0; };
      stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; if (!q) q = requestAnimationFrame(step); }, { passive: true });
    }
  }
  return { leave };
}
