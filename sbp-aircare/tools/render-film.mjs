// Rev.43 — the hero film of D · E · F: the 3D studio scene `hero` (vignette3d.js) filmed with a slow camera sway, rendered frame by
// frame and encoded as a silent looping MP4 (ffmpeg) + a WebP poster. No outside service, no footage — a 3D illustration.
//   npm run serve &  node tools/render-film.mjs [DEF] [seconds=8] [fps=24]
// Writes assets/stills/<V>-film.mp4, <V>-film.webp and manifest.json film: { V: { file, poster } }.
import { launch, BASE } from '../tests/_lib.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const OUT = new URL('../assets/stills/', import.meta.url).pathname;
const LOOK = { D: ['dark', '#63E6FF'], E: ['light', '#2F47F5'], F: ['dark', '#9A8CFF'] };
const vs = (process.argv[2] || 'DEF').split(''), SEC = +(process.argv[3] || 8), FPS = +(process.argv[4] || 24), N = SEC * FPS, SIZE = [1344, 576];
const manFile = path.join(OUT, 'manifest.json'); const man = fs.existsSync(manFile) ? JSON.parse(fs.readFileSync(manFile, 'utf8')) : {};
const b = await launch(); const p = await b.newPage(); p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto(`${BASE}/test-vignette.html?k=none`); await p.waitForTimeout(500);
await p.evaluate(async () => { await (await import('./assets/sbp-core.js')).loadData(); });
man.film = man.film || {};
for (const V of vs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'film-')), t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const view = 0.95 * Math.sin(2 * Math.PI * i / N);   // sway left → right → back: the last frame meets the first (seamless loop)
    const url = await p.evaluate(async ([theme, accent, view, size]) => (await import('./assets/vignette3d.js')).vignette('hero', { theme, accent, view, size, force: true, keep: false }), [...LOOK[V], view, SIZE]);
    if (!url) throw new Error('no frame ' + i);
    fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, '0')}.webp`), Buffer.from(url.split(',')[1], 'base64'));
    if (i % 24 === 0) console.log(V, 'frame', i, '/', N, Math.round((Date.now() - t0) / 1000) + 's');
  }
  const mp4 = path.join(OUT, `${V}-film.mp4`), poster = path.join(OUT, `${V}-film.webp`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.webp'), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  fs.copyFileSync(path.join(dir, 'f0000.webp'), poster); fs.rmSync(dir, { recursive: true });
  man.film[V] = { file: `${V}-film.mp4`, poster: `${V}-film.webp` };
  fs.writeFileSync(manFile, JSON.stringify(man, null, 1));
  console.log(V, 'film', Math.round(fs.statSync(mp4).size / 1024) + 'KB', Math.round((Date.now() - t0) / 1000) + 's');
}
await b.close();
