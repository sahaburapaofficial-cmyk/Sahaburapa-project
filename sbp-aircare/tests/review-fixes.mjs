// Rev.21.1 — regression tests for the independent developer review (3 ต.ค. 2569, base 4b7f938): BUG-02 install extras per unit,
// BUG-05 visit time per cleaning type / level, BUG-03 reference text. Node only (no browser, no server): node tests/review-fixes.mjs
import { readFileSync } from 'node:fs';
globalThis.__SBP_DATA = JSON.parse(readFileSync(new URL('../assets/sbp-data.json', import.meta.url)));
globalThis.__SBP_ADDR = { v: 0, p: [], o: [] };
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.location = { pathname: '/a.html', hash: '', hostname: 'localhost' };
globalThis.Image = class { set src(v) {} };   // commerce.js pulls in the 3D brand logos (browser images)
const core = await import('../assets/sbp-core.js'); await core.loadData();
const T = await import('../assets/ticket.js');
const C = await import('../assets/commerce.js');
const Q = await import('../assets/queue.js');
const S = await import('../assets/submit.js');
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const D = core.DATA;
const insKey = (t, lo, hi, pkg = 'STANDARD') => `IN-INS-${t}-${lo}-${hi}-${pkg}`;
const line = (key, qty = 1) => { const code = key.replace(/^I[NV]?-/, ''); const it = D.instByCode[code]; if (!it) throw new Error('no ' + code); return { kind: 'service', group: 'install', key, name: it.name, unitEx: it.ex, qty }; };
const W12 = insKey('W', 9000, 12000), K48 = Object.keys(D.instByCode).find(c => /^INS-K-\d+-48000-STANDARD$/.test(c));
ok(!!D.instByCode[W12.slice(3)] && !!K48, `install codes exist (${W12.slice(3)}, ${K48})`);
const est = (items, ans) => { const j = T.jobsIn(items); return T.scope('install', { ...T.DEFAULTS.install, ...ans }, { units: j.install, type: j.type, btu: j.btu, lines: j.units, codes: j.codes }); };

/* ---------- BUG-02 · AT-03 / AT-04 ---------- */
const wallFirst = [line(W12), line('IN-' + K48)], cassFirst = [line('IN-' + K48), line(W12)];
const a8 = { pipe: 8 };
ok(est(wallFirst, a8).est === 11200, `wall 12k + cassette 48k, 8 m each → 11,200 (wall first: ${est(wallFirst, a8).est})`);
ok(est(cassFirst, a8).est === 11200, `same, cassette first → 11,200 (${est(cassFirst, a8).est})`);
ok(est(wallFirst, { pipe: 4 }).est === 0, '4 m → no extra pipe');
ok(est([line(W12, 2)], a8).est === 8000, 'wall 12k × 2, 8 m → 8,000 (4 m × 2 × 1,000)');
const jw = T.jobsIn(wallFirst);
const per = { pipe: 4, pipeBy: { [jw.units[0].key]: 10, [jw.units[1].key]: 6 } };
ok(est(wallFirst, per).est === 6 * 1000 + 2 * 1800, `different pipe length per unit (10 m wall, 6 m cassette) → ${6 * 1000 + 2 * 1800} (${est(wallFirst, per).est})`);
const rem = est(wallFirst, { job: 'replace' }).lines.filter(l => /รื้อ/.test(l.th));
ok(rem.length === 2 && rem.some(l => l.ex === D.instByCode['REM-W'].ex) && rem.some(l => l.ex === D.instByCode['REM-K'].ex), 'removal priced per unit type (REM-W + REM-K)');
const withRemLine = [...wallFirst, line('I-REM-W')];
ok(T.jobsIn(withRemLine).install === 2, 'an add-on line in the quotation is not counted as a unit');
ok(est(withRemLine, { job: 'replace' }).lines.filter(l => /รื้อ/.test(l.th)).length === 1 && est(withRemLine, { job: 'replace' }).notes.some(n => /ไม่คิดซ้ำ/.test(n)), 'removal already in the quotation is not added again (note shown)');
ok(est([line(W12)], a8).est === 4000, 'single wall unit unchanged (4 m × 1,000)');

/* ---------- BUG-05 · AT-09 ---------- */
const cl = (key, qty = 1) => ({ kind: 'service', group: 'clean', key, name: key, unitEx: 1000, qty });
const vt = items => Q.visitTime(C.visitLines(items));
const exp = (lv, t, q = 1) => [core.JOB_TIME[lv][t][0] * q, core.JOB_TIME[lv][t][1] * q];
for (const t of ['wall', 'ceiling', 'cassette', 'floor']) for (const lv of ['C1', 'C2']) for (const pre of ['QC-Standard Care', 'CL-Standard Care', 'C-Standard Care']) {
  const r = vt([cl(`${pre}-${lv}-${t}-9,000-12,000`, 2)]), e = exp(lv, t, 2);
  if (r[0] !== e[0] || r[1] !== e[1]) ok(false, `${pre} ${lv} ${t} × 2 → ${r} want ${e}`);
}
ok(true, 'every entry point (QC- / CL- / C-) × wall/ceiling/cassette/floor × C1/C2 × 2 units → the published time');
const cassC2 = vt([cl('C-Standard Care-C2-cassette-36,001-48,000')]);
ok(cassC2[0] === 90 && cassC2[1] === 120, `price centre cassette C2 → 90–120 min (was 30–60): ${cassC2.slice(0, 2)}`);
const mix = vt([cl('QC-Basic Clean-C1-wall-9,000-12,000', 3), cl('C-Basic Clean-C2-ceiling-24,000', 1)]);
ok(mix[0] === 3 * 30 + 90 && mix[1] === 3 * 60 + 120, `mixed types add up: ${mix.slice(0, 2)}`);
const ahu = D.clean.find(r => /AHU/.test(r.name) && r.rate.s != null), add = D.clean.find(r => /^งานเพิ่ม/.test(r.ty || '') && r.rate.s != null);
const ux = vt([cl('CX-' + ahu.name), cl('CX-' + add.name, 3)]);
ok(ux[1] === 0 && ux[2] === 1, `AHU = unknown time (team confirms), add-on lines are not units: ${ux}`);
const duct = vt([cl('CL-Standard Care-C1-duct-24,000')]);
ok(duct[1] === 0 && duct[2] === 1, 'duct (no published time) = unknown, not a wall unit');
const inst2 = vt([line(W12), line('IN-' + K48)]);
ok(inst2[0] === core.JOB_TIME.install.wall[0] + core.JOB_TIME.install.cassette[0] && inst2[1] === core.JOB_TIME.install.wall[1] + core.JOB_TIME.install.cassette[1], 'installation time per unit type (wall + cassette)');

/* ---------- BUG-03 · reference text ---------- */
ok(S.withRef('ใบจองงาน · เลขอ้างอิง B1234567\nโทร', 'B1234567', 'B1234567-2') === 'ใบจองงาน · เลขอ้างอิง B1234567-2\nโทร', 'summary text follows the final reference');
ok(S.withRef('x', 'B1', 'B1') === 'x' && typeof S.newRid() === 'string' && S.newRid() !== S.newRid(), 'request ids are unique');

console.log(fail ? `\n${fail} FAIL` : '\nALL PASS');
process.exit(fail ? 1 : 0);
