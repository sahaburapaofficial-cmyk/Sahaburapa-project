// SBP AirCare — pre-rendered 3D stills of the D · E · F service pictures — Rev.43 (owner 7 ต.ค. 2569: "จัดทำให้ผมเลยโดยที่ผมไม่ต้องไปยุ่ง
// … D E F ทำอะไรได้เต็มที่"). tools/render-stills.mjs renders every door and journey step once, full size, in each design's colours
// (assets/stills/<V>-<key>.webp + manifest.json); the page shows them at once on every device — no WebGL work for the front view.
//   stillFor(variant, key, fig) → Promise<src | null>   fig = the figures the page would print (servicepath.figures()); a still is used
//   only while the figures it was rendered with are the same (after a price change the page renders live until the tool is re-run)
//   · one-file builds: build.py writes the variant's stills into stills/embed.js as data URIs; dev / multi-file: assets/stills/…
import EMBED from './stills/embed.js';
let P = null;
const load = () => P || (P = EMBED ? Promise.resolve(EMBED)
  : fetch(new URL('assets/stills/manifest.json', document.baseURI)).then(r => r.ok ? r.json() : null).then(m => {
    if (!m) return null;
    const base = new URL('assets/stills/', document.baseURI).href, out = { fig: m.fig };
    for (const V of 'DEF') if (m[V]) { out[V] = {}; for (const k in m[V]) out[V][k] = base + m[V][k]; }
    if (m.film) { out.film = {}; for (const V in m.film) out.film[V] = { kind: 'video', src: base + m.film[V].file, poster: base + m.film[V].poster }; }
    return out;
  }).catch(() => null));
export const stillFor = (V, key, fig) => load().then(m => (m && m.fig === fig && m[V] && m[V][key]) || null);
/** the 3D hero film of a design (tools/render-film.mjs) → { kind: 'video', src, poster } | null */
export const filmFor = V => load().then(m => (m && m.film && m.film[V]) || null);
