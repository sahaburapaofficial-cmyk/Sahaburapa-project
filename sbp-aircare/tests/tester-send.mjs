// Rev.10 — "ส่งผลให้ทีม" on the A/B/C tester (preview.html): sent · failed · not set up (copy fallback). Dev server on :8765.
import { launch, BASE } from './_lib.mjs';
import { readFileSync } from 'node:fs';
const FAKE = 'https://script.google.com/macros/s/TEST/exec';
const SRC = readFileSync(new URL('../preview.html', import.meta.url), 'utf8');
const b = await launch(); const out = [];
for (const mode of ['ok', 'fail', 'off']) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const posts = [];
  await p.route('**/preview.html', r => r.fulfill({ contentType: 'text/html', body: mode === 'off' ? SRC : SRC.replaceAll('__SBP_ENDPOINT__', FAKE) }));
  await p.route(FAKE, async r => { posts.push(JSON.parse(r.request().postData() || '{}')); return mode === 'fail' ? r.fulfill({ status: 500, body: 'x' }) : r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true,"ref":"T1"}' }); });
  await p.goto(`${BASE}/preview.html`); await p.waitForTimeout(1500);
  await p.click('#send'); const empty = await p.textContent('#sendmsg');
  await p.selectOption('#score select >> nth=0', '4'); await p.fill('#note', 'ทดสอบ'); await p.fill('#who', 'ผู้ทดสอบ');
  await p.click('#send'); await p.waitForTimeout(1500);
  out.push({ mode, empty: empty.slice(0, 20), msg: (await p.textContent('#sendmsg')).slice(0, 40), posts: posts.map(d => `${d.kind}:${Object.keys(d.fields).length}f`), errors: errs.length });
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1)); await b.close();
const bad = out.some(r => r.errors) || !out[0].msg.includes('ส่งถึงทีมแล้ว') || out[0].posts.length !== 1 || !out[1].msg.includes('ส่งไม่สำเร็จ') || out[2].posts.length || !out[2].msg.includes('ยังไม่เปิด');
process.exit(bad ? 1 : 0);
