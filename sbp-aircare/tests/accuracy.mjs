// Rev.34 — accuracy: every figure the site computes, checked against the owner's rules (CLAUDE.md §6.6) re-implemented here on
// their own, never by calling the site's helper for the expected value. node tests/accuracy.mjs
//   1 VAT once on the total, Math.round(n × 1.07) — every integer amount 0 … 3,000,000
//   2 service rates = Pricebook rounded UP to the hundred (clean · repair · INS-*), materials and machines untouched
//   3 travel per km (300 + 10/km beyond 30, up to the hundred, none beyond 150) and the zone of EVERY subdistrict in the address book
//   4 quotation totals over thousands of random carts: cleaning minimum → 300 trip, rush fee outside the minimum, small-visit
//     minimum, contracts / surveys carry no trip, extended zones always pay the distance
//   5 quick booking line prices = the standard Pricebook rate of that type × size × package × level
import { readFileSync } from 'node:fs';
const RAW = JSON.parse(readFileSync(new URL('../assets/sbp-data.json', import.meta.url)));
const ADDRJ = JSON.parse(readFileSync(new URL('../assets/th-address.json', import.meta.url)));
globalThis.__SBP_DATA = RAW; globalThis.__SBP_ADDR = ADDRJ;
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.location = { pathname: '/a.html', hash: '', hostname: 'localhost' };
globalThis.Image = class { set src(v) {} };
const core = await import('../assets/sbp-core.js'); await core.loadData(); await core.loadAddr();
const C = await import('../assets/commerce.js');
const { SMALL_VISIT } = await import('../assets/rates.js');
let fail = 0; const ok = (c, m, extra = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (c || !extra ? '' : ' — ' + extra)); if (!c) fail++; };
const P = RAW.pool, S = i => (i == null || i < 0 ? null : P[i]);
const ceil100 = n => Math.ceil(n / 100) * 100;

// ---- 1 VAT ----
let vbad = []; for (let n = 0; n <= 3e6 && vbad.length < 5; n++) { const t = C.quoteTotals([{ unitEx: n, qty: 1, group: 'product', kind: 'product' }], null); if (t.inc !== Math.round(n * 1.07) || t.vat !== t.inc - n) vbad.push(n); }
ok(!vbad.length, 'VAT 7% once on the total = Math.round(ex × 1.07) for every amount 0–3,000,000', vbad.join(','));
ok(core.incVat(4500) === 4815 && core.incVat(1700) === 1819, 'incVat examples 4,500 → 4,815 · 1,700 → 1,819');

// ---- 2 rates ----
const cleanBad = core.DATA.clean.filter((r, k) => r.rate.s !== (RAW.clean[k][5] == null ? null : ceil100(RAW.clean[k][5])));
ok(core.DATA.clean.length === RAW.clean.length && !cleanBad.length, `cleaning ${RAW.clean.length} rates = Pricebook rounded up to 100`, cleanBad.slice(0, 3).map(r => r.name).join(' | '));
const repBad = core.DATA.rep.filter((r, k) => r.rate.s !== (RAW.rep[k][3] == null ? null : ceil100(RAW.rep[k][3])));
ok(core.DATA.rep.length === RAW.rep.length && !repBad.length, `repair ${RAW.rep.length} rates = Pricebook rounded up to 100`, repBad.slice(0, 3).map(r => r.name).join(' | '));
ok(core.DATA.clean.every(r => r.rate.sp == null && r.rate.pj == null) && core.DATA.rep.every(r => r.rate.sp == null && r.rate.pj == null), 'no special / project rate reaches the browser');
const rawInst = Object.fromEntries(RAW.inst.map(r => [r[0], r[4]]));
const instBad = core.DATA.inst.filter(i => i.code in rawInst && !i.decided && !/^MOVE-/.test(i.code)).filter(i => i.ex !== (rawInst[i.code] == null ? null : /^INS-/.test(i.code) ? ceil100(rawInst[i.code]) : rawInst[i.code]));
ok(!instBad.length, 'installation services (INS-) rounded up to 100 · materials per metre / piece at the Pricebook price', instBad.slice(0, 3).map(i => `${i.code} ${i.ex}`).join(' | '));
ok(!core.DATA.inst.some(i => /-MASS$/.test(i.code) || /^MAT-CU-L-/.test(i.code)) && !JSON.stringify(core.DATA.inst).includes('Type L') && !JSON.stringify(core.DATA.inst).includes('K Copper'), 'no -MASS tier, no Type L, no "K Copper" on the site');
const skus = new Map(core.DEMO.models.flatMap(m => m.skus.map(k => [k.sku, k])));
const prodBad = RAW.prods.filter(r => { const k = skus.get(r[2]); return !k || k.px !== r[4] || k.price !== r[4] || k.installStdEx !== r[5] || k.btu !== r[3]; });
ok(skus.size === RAW.prods.length && !prodBad.length, `${RAW.prods.length} machines: price and price with standard installation exactly as the Pricebook (not rounded)`, prodBad.slice(0, 3).map(r => r[2]).join(' | '));

// ---- 3 travel ----
const expFee = km => km > 150 ? null : ceil100(300 + 10 * Math.max(0, km - 30));
const feeBad = []; for (let km = 0; km <= 200; km++) if (core.travelFee(km) !== expFee(km)) feeBad.push(km);
ok(!feeBad.length, 'trip fee 0–200 km = 300 + 10/km beyond 30, up to the hundred, none beyond 150', feeBad.join(','));
ok(core.travelFee(30) === 300 && core.travelFee(31) === 400 && core.travelFee(40) === 400 && core.travelFee(41) === 500 && core.travelFee(150) === 1500 && core.travelFee(151) === null, 'trip fee examples 30 → 300 · 31 → 400 · 40 → 400 · 41 → 500 · 150 → 1,500 · 151 → project');
const R = 6371, rad = x => x * Math.PI / 180, HQ = core.HQ;
const km = (la, lo) => { const dl = rad(la - HQ.lat), dn = rad(lo - HQ.lon); const s = Math.sin(dl / 2) ** 2 + Math.cos(rad(HQ.lat)) * Math.cos(rad(la)) * Math.sin(dn / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 1.35); };
let zn = 0; const zBad = [];
for (const [p, ds] of ADDRJ.p) for (const [d, la, lo, subs] of ds) for (const [s, z, sla, slo] of subs) {
  zn++; const k = km(sla ?? la, slo ?? lo), Z = core.zoneOf({ p, d, s, z });
  const want = p === 'กรุงเทพมหานคร' && k <= 30 ? ['core', 0] : k > 150 ? ['out', null] : ['extended', expFee(k)];
  if (!Z || Z.tier !== want[0] || Z.fee !== want[1] || Z.km !== k) zBad.push(`${p}/${d}/${s} ${k}km ${Z && Z.tier}/${Z && Z.fee} ≠ ${want}`);
}
ok(zn > 1500 && !zBad.length, `zone + trip fee of every subdistrict in the address book (${zn}): Bangkok ≤ 30 km core, else 300 + 10/km, > 150 km project`, zBad.slice(0, 3).join(' | '));
ok(ADDRJ.o.every(p => core.zoneOf({ p }).tier === 'out'), `provinces without points (${ADDRJ.o.length}) → project work, no fee guessed`);

// ---- 4 quotation totals (independent) ----
const MIN = RAW.minBill;
function expect(items, zone) {
  const ex = items.reduce((n, i) => n + (i.unitEx == null ? 0 : i.unitEx * i.qty), 0);
  const cleanEx = items.reduce((n, i) => n + (i.group === 'clean' && i.unitEx != null ? i.unitEx * i.qty : 0), 0);
  const oneOff = items.some(i => i.group !== 'contract' && i.kind !== 'survey');
  let travel = 0;
  if (oneOff) {
    if (zone && zone.tier === 'extended') travel = zone.fee;                       // rule 9: distance, no waiver by count
    else if (cleanEx > 0 && cleanEx < MIN && (!zone || zone.tier !== 'out')) travel = 300;   // rule 8: trip instead of topping up
  }
  const main = items.some(i => ['clean', 'install', 'repair', 'contract'].includes(i.group));
  const addons = items.filter(i => i.group === 'addon');
  const visit = !main && addons.length ? Math.max(0, 1000 - addons.reduce((n, i) => n + (i.unitEx ?? 0) * i.qty, 0)) : 0;   // rule 26
  const totalEx = ex + travel + visit;
  return { ex, travel, visit, totalEx, inc: Math.round(totalEx * 1.07) };
}
const cleanRows = core.DATA.clean.filter(r => r.rate.s != null && r.type);
const pick = a => a[Math.floor(rnd() * a.length)];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const zones = [null, core.zoneOf({ p: 'กรุงเทพมหานคร', d: 'บางขุนเทียน' }), core.zoneOf({ p: 'สมุทรปราการ' }), core.zoneOf({ p: 'ชลบุรี' }), core.zoneOf({ p: 'เชียงใหม่' })].filter(z => z !== undefined);
const LINE = () => {
  const k = Math.floor(rnd() * 8);
  if (k < 3) { const r = pick(cleanRows); return { group: 'clean', kind: 'service', unitEx: r.rate.s, qty: 1 + Math.floor(rnd() * 12) }; }
  if (k === 3) return { group: 'rush', kind: 'service', unitEx: 500, qty: 1, fixed: true };
  if (k === 4) return { group: 'addon', kind: 'service', unitEx: pick([100, 250, 400, 600, 900]), qty: 1 + Math.floor(rnd() * 3) };
  if (k === 5) return { group: 'install', kind: rnd() < 0.3 ? 'survey' : 'service', unitEx: rnd() < 0.3 ? null : pick([3800, 4500, 6800]), qty: 1 };
  if (k === 6) return { group: 'contract', kind: 'service', unitEx: pick([28000, 54600, 332800]), qty: 1 };
  return { group: 'product', kind: 'product', unitEx: pick([8900, 12700, 24500]), qty: 1 + Math.floor(rnd() * 2) };
};
let tBad = []; const N = 20000;
for (let n = 0; n < N; n++) {
  const items = Array.from({ length: 1 + Math.floor(rnd() * 4) }, LINE), zone = pick(zones);
  const got = C.quoteTotals(items, zone), want = expect(items, zone);
  if (got.ex !== want.ex || got.travel !== want.travel || got.visit !== want.visit || got.totalEx !== want.totalEx || got.inc !== want.inc) tBad.push(JSON.stringify({ items: items.map(i => `${i.group}:${i.unitEx}×${i.qty}`), zone: zone && zone.tier, got: [got.travel, got.visit, got.inc], want: [want.travel, want.visit, want.inc] }));
}
ok(!tBad.length, `${N.toLocaleString('en-US')} random quotations: lines + trip + small-visit minimum + VAT = the owner's rules`, tBad.slice(0, 2).join(' | '));
// worked examples a customer sees
const wall = core.cleanRate('Basic Clean', 'C1', 'wall', 0);
ok(wall && wall.rate.s === 700, 'cleaning wall 9,000–18,000 BTU, normal package C1 = ฿700 before VAT (the "เริ่ม ฿700" on the site)');
const two = C.quoteTotals([{ group: 'clean', unitEx: 700, qty: 2 }], zones[1]);
ok(two.travel === 300 && two.inc === 1819, '2 wall units in Bang Khun Thian: 1,400 + trip 300 = 1,700 → ฿1,819 incl. VAT (the booking test figure)');
const seven = C.quoteTotals([{ group: 'clean', unitEx: 700, qty: 7 }], zones[1]);
ok(seven.travel === 0 && seven.inc === Math.round(4900 * 1.07), '7 wall units reach the ฿4,500 minimum: no trip');
const rush = C.quoteTotals([{ group: 'clean', unitEx: 700, qty: 6 }, { group: 'rush', unitEx: 500, qty: 1 }], zones[1]);
ok(rush.travel === 300, '6 units + rush ฿500: the rush fee does not count toward the cleaning minimum (still a trip)');
ok(C.quoteTotals([{ group: 'addon', unitEx: 400, qty: 1 }], zones[1]).visit === SMALL_VISIT.minEx - 400, 'a ฿400 small job alone: visit charge 600 up to the ฿1,000 minimum');

// ---- 5 quick booking prices ----
const QC = await import('../assets/quickclean.js');
if (QC.cleanFrom) {
  const bad = [];
  for (const pkg of core.CLEAN_PKGS) for (const lv of ['C1', 'C2']) for (const t of ['wall', 'ceiling', 'cassette', 'floor']) for (const b of core.SIZE_BANDS) {
    const r = core.cleanRate(pkg.id, lv, t, b.id); if (!r) continue;
    const raw = RAW.clean.find(x => S(x[0]) === pkg.id && x[1] === lv && S(x[3]) === (t === 'wall' ? b.wall : b.other) && core.DATA.clean.find(c => c === r));
    const want = RAW.clean[core.DATA.clean.indexOf(r)][5]; if (r.rate.s !== (want == null ? null : ceil100(want))) bad.push(`${pkg.id} ${lv} ${t} ${b.th}`);
  }
  ok(!bad.length, 'every package × level × type × size the booking offers is the Pricebook rate (rounded up to 100)', bad.slice(0, 3).join(' | '));
}
console.log(fail ? `${fail} FAIL` : 'ALL PASS'); process.exitCode = fail ? 1 : 0;
