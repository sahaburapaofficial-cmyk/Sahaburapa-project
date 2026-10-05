// Rev.30 — where does page-load time go? CPU profile of the first N seconds, self time per function (top 25).
// node tests/profile.mjs f.html [seconds=12] [w h]
import { launch, BASE } from './_lib.mjs';
const [,, page = 'a.html', secs = 12, w = 1366, hh = 900] = process.argv;
const b = await launch(); const p = await b.newPage({ viewport: { width: +w, height: +hh } });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
await p.goto(`${BASE}/${page}`); await p.waitForTimeout(+secs * 1000);
const { profile } = await cdp.send('Profiler.stop');
const self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map(n => [n.id, n]));
profile.samples.forEach((id, i) => { const n = byId.get(id), f = n.callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0) / 1000); });
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
top.forEach(([k, v]) => console.log(String(Math.round(v)).padStart(7) + ' ms  ' + k));
await b.close();
