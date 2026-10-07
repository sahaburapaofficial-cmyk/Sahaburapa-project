// SBP AirCare — AI image slots for the D · E · F service pictures — Rev.41 (owner 7 ต.ค. 2569: "ใช้ภาพ Higgsfield หรือ AI ต่าง ๆ ที่สวยงาม
// โดดเด่นมาพัฒนาเพิ่มทุกมิติ"). Every door / journey step can show an image made with an AI image tool instead of the 3D still.
//   assets/ai/manifest.json  { "<slot>": { "file": "door-clean.webp", "alt": "…", "tool": "Higgsfield", "kind": "image"|"video", "poster" } }
//   slots: door:clean|install|repair · c1–c6 · i1–i6 · r1–r6 (servicepath) · hero:D|E|F (video or image band, D·E·F home)
//          sym:<symptom id> ×14 (symptom card) · kn:<guide id> ×12 (knowledge card) · ent:<sector id> ×7 (enterprise)
//   · empty manifest (the default) = nothing changes: 3D still, then line art (rule: an empty slot is never filled with a guess)
//   · images go through tools/ai-import.py (crop 16:10, 1600 × 1000 WebP, manifest entry) — no logos, no AC brand on a customer's
//     unit, no fake "our team" photos: every AI image is labelled ภาพประกอบ (AI) on the page (rules 14, 15, 20)
//   · dev reads the manifest + files; build.py writes the images into ai/embed.js as data URIs for the one-file pages
import EMBED from './ai/embed.js';
import { stillFor, artV } from './stills.js';
let P = null;
export function aiArt() {
  if (P) return P;
  if (EMBED) return (P = Promise.resolve(EMBED));
  // page-relative (assets/ai/…) so the multi-file site build works too (its code lives in js/, the files are copied to assets/ai/)
  P = fetch(new URL('assets/ai/manifest.json', document.baseURI)).then(r => r.ok ? r.json() : {}).then(m => {
    const out = {};
    const u = f => new URL('assets/ai/' + f, document.baseURI).href;
    for (const k in m) if (m[k] && m[k].file) out[k] = { ...m[k], src: u(m[k].file), poster: m[k].poster ? u(m[k].poster) : '' };
    return out;
  }).catch(() => ({}));
  return P;
}

const RM = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
/** Rev.42: put the AI image / video of `key` into `host` (cover, fades in, labelled). Resolves true when the slot is filled. */
export function aiFill(host, key, { label = 'ภาพประกอบ (AI)' } = {}) {
  if (!host) return Promise.resolve(false);
  // Rev.45 (owner: "D และ F … ใช้รูปที่เป็นมิติเท่านั้น"): no AI picture → this design's pre-rendered 3D still, if it has one
  const V = artV();   // A · B · C too, after Rev.46
  return aiArt().then(m => m[key] ? fillMedia(host, m[key], label) : V ? stillFor(V, key, null).then(src => src ? fillMedia(host, { src }, '') : false) : false);
}
/** put one picture or film { src, kind, poster } into `host` (used by AI slots and by the pre-rendered 3D film) */
export function fillMedia(host, a, label) {
  if (!host || !a || !a.src) return false;
  if (host.querySelector(':scope > .ai-fill')) return true;
  {
    let el;
    if (a.kind === 'video') {
      el = document.createElement('video'); el.muted = true; el.loop = true; el.playsInline = true; el.setAttribute('playsinline', ''); el.preload = 'metadata';
      if (a.poster) el.poster = a.poster; el.src = a.src;
      if (!RM()) { el.autoplay = true; const io = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? el.play().catch(() => {}) : el.pause()), { threshold: 0.2 }); io && io.observe(el); }
    } else { el = new Image(); el.decoding = 'async'; el.src = a.src; }
    el.className = 'ai-fill'; el.alt = ''; el.setAttribute('aria-hidden', 'true');
    host.classList.add('ai-has'); host.append(el);
    if (label) { const tag = document.createElement('span'); tag.className = 'ai-fill-tag'; tag.textContent = label; host.append(tag); }
    const on = () => el.classList.add('in'); a.kind === 'video' ? el.addEventListener('loadeddata', on, { once: true }) : (el.decode ? el.decode().then(on, on) : on());
    if (a.kind === 'video' && a.poster) { host.style.backgroundImage = `url("${a.poster}")`; host.style.backgroundSize = 'cover'; host.style.backgroundPosition = 'center'; }
    return true;
  }
}
