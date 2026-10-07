// SBP AirCare — AI image slots for the D · E · F service pictures — Rev.41 (owner 7 ต.ค. 2569: "ใช้ภาพ Higgsfield หรือ AI ต่าง ๆ ที่สวยงาม
// โดดเด่นมาพัฒนาเพิ่มทุกมิติ"). Every door / journey step can show an image made with an AI image tool instead of the 3D still.
//   assets/ai/manifest.json  { "<slot>": { "file": "door-clean.webp", "alt": "…", "tool": "Higgsfield" } }   slots: door:clean …, c1 … r6
//   · empty manifest (the default) = nothing changes: 3D still, then line art (rule: an empty slot is never filled with a guess)
//   · images go through tools/ai-import.py (crop 16:10, 1600 × 1000 WebP, manifest entry) — no logos, no AC brand on a customer's
//     unit, no fake "our team" photos: every AI image is labelled ภาพประกอบ (AI) on the page (rules 14, 15, 20)
//   · dev reads the manifest + files; build.py writes the images into ai/embed.js as data URIs for the one-file pages
import EMBED from './ai/embed.js';
let P = null;
export function aiArt() {
  if (P) return P;
  if (EMBED) return (P = Promise.resolve(EMBED));
  P = fetch(new URL('./ai/manifest.json', import.meta.url)).then(r => r.ok ? r.json() : {}).then(m => {
    const out = {};
    for (const k in m) if (m[k] && m[k].file) out[k] = { ...m[k], src: new URL('./ai/' + m[k].file, import.meta.url).href };
    return out;
  }).catch(() => ({}));
  return P;
}
