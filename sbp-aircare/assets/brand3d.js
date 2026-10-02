// SBP AirCare — the company's own marks inside the 3D scenes (Rev.09 round 4, owner 1 ต.ค. 2569:
// "เสื่อมีตรา FUJIVA … โปรโมท FUJIVA และ บริษัท สหบูรพากรุ๊ป จำกัด แบบ subliminal ไม่ดูชวนขายเกิน ในหลายรูปและสถานที่").
// FUJIVA = the company's AC brand · SBP AirCare / บริษัท สหบูรพากรุ๊ป จำกัด = the service company. Marks are small and
// placed where a real crew would carry them (work mat, uniform, tool box, cleaning bag, tablet, remote) — never on the
// customer's air conditioner (any brand). Official artwork, when supplied (assets/logos/fujiva.png, sbp.png → build →
// globalThis.__SBP_LOGOS), replaces the text wordmarks automatically. ★Rev.12: supplied — fujiva.png (+ fujiva-light.png,
// white letters for dark surfaces) and sbp.png (the SP mark of บริษัท สหบูรพากรุ๊ป จำกัด, drawn beside the SBP AirCare wordmark).
import * as THREE from './three.module.min.js';

const cache = new Map();
// Rev.12 (owner 2 ต.ค. 2569 supplied both marks): builds inline them (__SBP_LOGOS); the multi-file dev server reads assets/logos/
const imgs = new Map();
const logo = key => {
  if (imgs.has(key)) return imgs.get(key);
  const L = globalThis.__SBP_LOGOS, src = L ? L[key] : new URL(`./logos/${key}.png`, import.meta.url).href;
  const im = src ? new Image() : null; if (im) { im.onerror = () => imgs.set(key, null); im.src = src; } imgs.set(key, im); return im;
};
const ready = im => im && im.complete && im.naturalWidth;
const KEYS = ['fujiva', 'fujiva-light', 'sbp'];
KEYS.forEach(logo);   // start decoding now: scenes boot later (lazy) and draw with them ready
/** resolves once every official logo has loaded (or failed) — for one-shot renders that cannot redraw later (product shots) */
export const logosReady = () => Promise.all(KEYS.map(k => { const im = logo(k); return !im || im.complete ? 0 : new Promise(r => { im.addEventListener('load', r); im.addEventListener('error', r); setTimeout(r, 3000); }); }));
const light = c => { const m = /^#([0-9a-f]{6})$/i.exec(c); if (!m) return false; const n = parseInt(m[1], 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) > 160; };
function tex(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; cache.set(key, t);
  // official artwork arrives asynchronously: redraw once it has loaded
  KEYS.forEach(k => { const im = logo(k); if (im && !im.complete) im.addEventListener('load', () => { g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; }); });
  return t;
}
/** a cached canvas texture that redraws itself once the official logo images have loaded (for other modules' printed labels) */
export const brandTex = (key, w, h, draw) => tex('x:' + key, w, h, draw);
/** small FUJIVA badge for the company's own units / cartons (transparent background) */
export const fujivaBadge = () => tex('fjbadge', 256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); drawFujiva(g, w / 2, h / 2, 44, '#606872'); });
const TH = '"Anuphan","IBM Plex Sans Thai","Kanit",system-ui,sans-serif';
// FUJIVA wordmark (letter-spaced caps) — or the official logo image (white-lettered version on dark surfaces)
export function drawFujiva(g, cx, cy, size, color = '#fff') {
  const im = (light(color) && ready(logo('fujiva-light'))) ? logo('fujiva-light') : logo('fujiva');
  if (ready(im)) { const w = size * 4.2, hh = w * im.naturalHeight / im.naturalWidth; g.drawImage(im, cx - w / 2, cy - hh / 2, w, hh); return; }
  g.save(); g.fillStyle = color; g.font = `600 ${size}px "Kanit",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) { g.letterSpacing = `${size * 0.32}px`; g.fillText('FUJIVA', cx + size * 0.16, cy); } else g.fillText('F U J I V A', cx, cy);
  g.restore();
}
export function drawSbp(g, cx, cy, size, color = '#fff', accent = '#e2711d', withCo = true) {
  // official company mark (SP · บริษัท สหบูรพากรุ๊ป จำกัด) sits left of the service wordmark when supplied
  const im = logo('sbp'), mk = ready(im) ? { h: size * 1.15, w: size * 1.15 * im.naturalWidth / im.naturalHeight } : null;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${size}px ${TH}`; const w1 = g.measureText('SBP').width; g.font = `500 ${size}px ${TH}`; const w2 = g.measureText(' AirCare').width;
  const gap = mk ? size * 0.3 : 0, tot = w1 + w2 + (mk ? mk.w + gap : 0);
  const k = Math.min(1, g.canvas.width * 0.92 / tot); if (k < 1) { g.translate(cx, cy); g.scale(k, k); g.translate(-cx, -cy); }   // keep the mark + wordmark inside the texture
  const x0 = cx - tot / 2 + (mk ? mk.w + gap : 0); g.textAlign = 'left';
  if (mk) {   // on a small white plate, like the printed sticker it would be (the orange mark stays legible on orange / blue / dark)
    const mx = x0 - gap - mk.w, my = cy - mk.h / 2, pd = size * 0.1;
    g.fillStyle = '#ffffff'; g.beginPath(); if (g.roundRect) g.roundRect(mx - pd, my - pd, mk.w + pd * 2, mk.h + pd * 2, size * 0.18); else g.rect(mx - pd, my - pd, mk.w + pd * 2, mk.h + pd * 2); g.fill();
    g.drawImage(im, mx, my, mk.w, mk.h);
  }
  g.fillStyle = accent; g.font = `700 ${size}px ${TH}`; g.fillText('SBP', x0, cy);
  g.fillStyle = color; g.font = `500 ${size}px ${TH}`; g.fillText(' AirCare', x0 + w1, cy);
  if (withCo) { g.textAlign = 'center'; g.globalAlpha *= 0.85; g.font = `400 ${size * 0.42}px ${TH}`; g.fillText('บริษัท สหบูรพากรุ๊ป จำกัด', mk ? x0 + (w1 + w2) / 2 : cx, cy + size * (mk ? 0.92 : 0.78)); }
  g.restore();
}

/** work mat (rubber, charcoal-blue) with the FUJIVA mark and a small company line */
export const matTex = (dark = false) => tex('mat' + dark, 1024, 640, (g, w, h) => {
  g.fillStyle = dark ? '#1c2836' : '#2a3a4e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 6; g.strokeRect(22, 22, w - 44, h - 44);
  g.strokeStyle = 'rgba(226,113,29,.55)'; g.lineWidth = 3; g.strokeRect(40, 40, w - 80, h - 80);
  g.globalAlpha = 0.86; drawFujiva(g, w / 2, h * 0.47, 92, '#f4f6f8'); g.globalAlpha = 1;
  g.globalAlpha = 0.6; drawSbp(g, w - 210, h - 92, 30, '#e7edf3', '#f08a3a'); g.globalAlpha = 1;
});
/** uniform: chest patch + back print */
export const chestTex = () => tex('chest', 256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0)'; g.fillRect(0, 0, w, h); drawSbp(g, w / 2, h * 0.42, 46, '#ffffff', '#f08a3a', false); g.fillStyle = '#f08a3a'; g.fillRect(w * 0.18, h * 0.78, w * 0.64, 5); });
export const backTex = () => tex('back', 512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); drawSbp(g, w / 2, h * 0.4, 74, '#ffffff', '#f08a3a', true); });
/** tool box lid / side, cleaning bag print, tablet back */
export const boxTex = () => tex('box', 512, 256, (g, w, h) => { g.fillStyle = '#e2711d'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h - 26, w, 26); drawSbp(g, w / 2, h * 0.42, 62, '#ffffff', '#1f3552', true); });
export const bagTex = () => tex('bag', 512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.globalAlpha = 0.75; drawFujiva(g, w / 2, h * 0.38, 54, '#1f4f8a'); g.globalAlpha = 0.6; g.fillStyle = '#1f4f8a'; g.font = `500 22px ${TH}`; g.textAlign = 'center'; g.fillText('SBP AirCare', w / 2, h * 0.72); g.globalAlpha = 1; });
export const cardTex = () => tex('card', 512, 320, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f4f8a'; g.fillRect(0, 0, w, 64); drawSbp(g, w / 2, 32, 30, '#ffffff', '#f08a3a', false); g.fillStyle = '#1f2a37'; g.font = `600 26px ${TH}`; g.textAlign = 'left'; g.fillText('รายงานงานบริการ', 28, 112); g.fillStyle = '#5b6878'; g.font = `400 20px ${TH}`; ['ข้อมูลเครื่อง', 'ภาพก่อน–หลัง', 'รายการตรวจ', 'ลงนามรับมอบ'].forEach((t, i) => { g.fillStyle = '#e8edf3'; g.fillRect(28, 140 + i * 42, w - 56, 30); g.fillStyle = '#5b6878'; g.fillText(t, 40, 162 + i * 42); }); });

/** flat textured plane helper */
export function decal(texture, w, h, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: o.rough ?? 0.8, depthWrite: o.depthWrite ?? false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.renderOrder = o.order ?? 2; return m;
}
