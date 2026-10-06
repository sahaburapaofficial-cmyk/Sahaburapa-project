// Rev.35 — the new pieces: A "แอร์ของฉัน" (myac.unitState) · B BOQ (boq.boqRows / boqTsv / lineCode) — node, no browser.
// Expected values come from the rules / the same quotation totals, never from the module under test. node tests/rev35.mjs
import { readFileSync } from 'node:fs';
globalThis.__SBP_DATA = JSON.parse(readFileSync(new URL('../assets/sbp-data.json', import.meta.url)));
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.location = { pathname: '/b.html', hash: '', hostname: 'localhost' };
globalThis.Image = class { set src(v) {} };
globalThis.__SBP_ADDR = JSON.parse(readFileSync(new URL('../assets/th-address.json', import.meta.url)));
const core = await import('../assets/sbp-core.js'); await core.loadData(); await core.loadAddr();
const C = await import('../assets/commerce.js');
const Q = await import('../assets/boq.js');
const M = await import('../assets/myac.js');
const SM = await import('../assets/studio-model.js');
let fail = 0; const ok = (c, m, extra = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (c || !extra ? '' : ' — ' + extra)); if (!c) fail++; };

// ---- B · BOQ ----
const zones = [null, core.zoneOf({ p: 'กรุงเทพมหานคร', d: 'บางขุนเทียน' }), core.zoneOf({ p: 'ชลบุรี' })];
const lines = [
  { key: 'QC-wall-0-basic', name: 'ล้างแอร์ติดผนัง', group: 'clean', kind: 'service', qty: 3, unitEx: 700 },
  { key: 'P-ASW-09', name: 'แอร์ติดผนัง', kind: 'product', group: 'product', qty: 1, unitEx: 9500 },
  { key: 'I-INS-W-9000-12000-STANDARD', name: 'ติดตั้งมาตรฐาน', group: 'install', kind: 'service', qty: 1, unitEx: 3800 },
  { key: 'S-X', name: 'งานประเมิน', group: 'addon', kind: 'service', qty: 1, unitEx: null },
];
for (const z of zones) for (let n = 1; n <= lines.length; n++) {
  const items = lines.slice(0, n), { rows, t } = Q.boqRows(items, z), ref = C.quoteTotals(items, z);
  ok(t.inc === ref.inc && t.totalEx === ref.totalEx && t.vat === ref.vat && t.travel === ref.travel, `BOQ totals = quotation totals (${n} lines, zone ${z ? z.tier : 'none'}) ฿${ref.inc}`);
  ok(rows.every((r, i) => r.no === i + 1 && r.qty === items[i].qty && (items[i].unitEx == null ? r.amount === null : r.amount === items[i].unitEx * items[i].qty)), `BOQ rows: no · qty · amount = rate × qty, on-site lines stay blank (${n} lines)`);
  ok(rows.reduce((s, r) => s + (r.amount || 0), 0) + (t.travel || 0) + (t.visit || 0) === t.totalEx, `BOQ lines + trip + visit add up to before-VAT total (${n} lines, ${z ? z.tier : 'none'})`);
  const tsv = Q.boqTsv(items, z).split('\n');
  ok(tsv[0].split('\t').length === 7 && tsv.slice(1).every(r => r.split('\t').length === 7), `TSV: 7 tab-separated columns on every row (${n} lines)`);
  ok(tsv[tsv.length - 1].endsWith('\t' + ref.inc) && tsv[tsv.length - 2].endsWith('\t' + ref.vat), `TSV ends with VAT ${ref.vat} and total ${ref.inc}`);
}
ok(Q.lineCode({ key: 'I-INS-W-9000-12000-STANDARD' }) === 'INS-W-9000-12000-STANDARD' && Q.lineCode({ key: 'P-ASW-09' }) === 'ASW-09' && Q.lineCode({ key: 'QC-x', group: 'clean' }) === 'ล้าง', 'lineCode: Pricebook code for install / model lines, group label otherwise');

// ---- A · แอร์ของฉัน ----
const env = { cats: 0, dogs: 0, loc: 'city' };
let mono = true, lateOk = true, priceOk = true;
for (const room of ['bedroom', 'living', 'kitchen', 'openoffice', 'restaurant']) for (const type of ['wall', 'ceiling', 'cassette', 'floor']) {
  let prev = -1;
  for (const ago of [1, 3, 6, 9, 12, 18, 24]) {
    const s = M.unitState({ room, type, size: 0, ago }, env);
    if (s.dirt < prev) mono = false; prev = s.dirt;
    if (s.late !== (ago >= s.every) || s.due !== Math.max(0, s.every - ago)) lateOk = false;
    const r = core.cleanRate('Basic Clean', 'C1', type, 0);
    if ((r ? r.rate.s : undefined) !== s.price) priceOk = false;
  }
}
ok(mono, 'myac: dust only grows with months since the last cleaning (every room × type)');
ok(lateOk, 'myac: "ถึงรอบ" exactly when months since cleaning ≥ the recommended interval; months left = interval − months');
ok(priceOk, 'myac: price = Basic Clean C1 standard rate of that type and size');
const a = M.unitState({ room: 'bedroom', type: 'wall', size: 0, ago: 6 }, env), b = M.unitState({ room: 'bedroom', type: 'wall', size: 0, ago: 6 }, { cats: 2, dogs: 1, loc: 'road' });
ok(b.dirt > a.dirt && b.every <= a.every, 'myac: pets + busy road → dustier and an equal or shorter interval');
ok(a.every === SM.cleanInterval(SM.dustRate(SM.SCENE_BY_ID.bedroom) * SM.envF(env).total).months, 'myac: interval from the room model (studio-model.cleanInterval)');

console.log(fail ? `\n${fail} FAILED` : '\nALL PASS'); process.exit(fail ? 1 : 0);
