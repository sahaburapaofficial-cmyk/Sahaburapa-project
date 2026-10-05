// Rev.27 — decided standard rates (rates.js): overlay on the Pricebook mirror, relocation rows, small-visit minimum, saved quotes
// repriced, nothing priced that depends on parts / design. node tests/rates.mjs
import { readFileSync } from 'node:fs';
const RAW = JSON.parse(readFileSync(new URL('../assets/sbp-data.json', import.meta.url)));
globalThis.__SBP_DATA = RAW;
globalThis.__SBP_ADDR = { v: 0, p: [], o: [] };
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.location = { pathname: '/a.html', hash: '', hostname: 'localhost' };
globalThis.Image = class { set src(v) {} };
const core = await import('../assets/sbp-core.js'); await core.loadData();
const R = await import('../assets/rates.js');
const C = await import('../assets/commerce.js');
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const D = core.DATA, I = c => D.instByCode[c];

// the Pricebook mirror itself is untouched (tools_recon.py stays 1:1)
const rawNull = RAW.inst.filter(r => r[4] == null).map(r => r[0]);
ok(Object.keys(R.DECIDED).every(c => rawNull.includes(c)), `every decided code (${Object.keys(R.DECIDED).length}) is a Pricebook line that has no rate — sbp-data.json unchanged`);
ok(Object.entries(R.DECIDED).every(([c, d]) => I(c) && I(c).ex === d.ex && d.ex % 100 === 0 && ['m', 'c'].includes(d.how) && d.note), 'decided rates loaded, whole hundreds, each with how + note');
// company's own repair-sheet rate for the same work (c)
const rep = re => (D.rep.find(r => re.test(r.name)) || { rate: {} }).rate.s;
ok(I('REF-R22').ex === rep(/^สารทำความเย็น R22 ส่วนเกิน/) && I('REF-R32').ex === rep(/^สารทำความเย็น R32\/R410A ส่วนเกิน/) && I('REF-VAC').ex === rep(/^Vacuum ระบบอย่างเดียว/) && I('REF-LEAK').ex === rep(/^ตรวจรั่วด้วยไนโตรเจน/) && I('ELE-PHASE').ex === rep(/Phase Protector/), 'install-sheet refrigerant / vacuum / leak / phase lines = the repair-sheet rate for the same work');
// market band checks (m)
ok(I('REM-W').ex >= 800 && I('REM-W').ex <= 1500 && I('REM-C').ex >= 1200 && I('REM-C').ex <= 2500 && I('REM-K').ex <= 2500 && I('REM-FS').ex <= 2500, 'removal rates inside the published 2569 market bands');
ok(I('REM-W').ex < I('REM-C').ex && I('REM-C').ex < I('REM-K').ex, 'removal: wall < ceiling < cassette');
ok(I('CIV-CORE').ex >= 400 && I('CIV-CORE').ex <= 600, 'core drill per hole within 400–600');
// relocation rows = removal + standard installation per size band; the single Pricebook MOVE lines are replaced
const moves = D.inst.filter(i => /^MOVE-(W|C|K|FS)-\d+-\d+$/.test(i.code));
ok(moves.length === 21 && R.MOVE_REPLACES.every(c => !I(c)), `${moves.length} relocation rows by type × size, MOVE-W/C/K replaced`);
ok(moves.every(m => { const [, c, lo, hi] = m.code.split('-'); return m.ex === I(R.MOVE[c]).ex + I(`INS-${c}-${lo}-${hi}-STANDARD`).ex; }), 'each relocation = removal + standard installation of that band');
const mw = I('MOVE-W-9000-12000');
ok(mw && mw.ex >= 3500 && mw.ex <= 6500, `wall 9–12k relocation ${mw && mw.ex} inside the market 3,500–6,500`);
ok(I('REM-DUCT').ex == null && I('REPLACE').ex == null && D.rep.filter(r => /^เปลี่ยนคอมเพรสเซอร์ \d|^เปลี่ยนแผงคอยล์/.test(r.name)).every(r => r.rate.s == null), 'part / design dependent lines stay assessed (ducted removal, replace, compressor, coil)');
ok(I('LOG-NIGHT').ex == null && I('LOG-SUN').ex == null, 'out-of-hours stays without an amount (rule 22)');
// product drawer: priced lines move out of the "ประเมินหน้างาน" group
const ad = core.addonsFor('wall', 12000), flag = ad.find(g => /ประเมินหน้างาน/.test(g.group)), priced = ad.find(g => g.group === 'เครื่องเดิมและงานเจาะ');
ok(priced && priced.items.every(x => x.item.ex != null && x.qty === 'pc') && priced.items.some(x => x.item.code === 'REM-W') && !flag.items.some(x => x.item.ex != null), 'product add-ons: removal / take-away / core drill priced, the rest assessed');

// small-visit minimum
const A = (code, qty = 1) => ({ kind: 'addon', group: 'addon', key: `A-${code}`, name: I(code).name, unitEx: I(code).ex, qty });
const t1 = C.quoteTotals([A('DISPOSE')], null);
ok(t1.visitSmall && t1.visit === R.SMALL_VISIT.minEx - I('DISPOSE').ex && t1.totalEx === R.SMALL_VISIT.minEx, `take-away only: visit charge ${t1.visit} → total ${t1.totalEx} = minimum`);
const t2 = C.quoteTotals([A('REM-K')], null);
ok(t2.visitSmall && t2.visit === 0 && t2.totalEx === I('REM-K').ex, 'cassette removal alone reaches the minimum: no visit charge');
const clean = { kind: 'service', group: 'clean', key: 'QC-Standard Care-C1-wall-12000', name: 'ล้าง', unitEx: 800, qty: 1 };
const t3 = C.quoteTotals([clean, A('DISPOSE')], null);
ok(!t3.visitSmall && t3.visit === 0, 'with a cleaning line in the same visit: no small-visit charge');
const prod = { kind: 'product', group: 'product', key: 'P-x', name: 'แอร์', unitEx: 10000, qty: 1 };
ok(C.quoteTotals([prod], null).visit === 0, 'a product with no technician work: no visit charge');
// saved quotes: a survey line for a now-priced item becomes a priced add-on
const old = { kind: 'survey', group: 'addon', key: 'S-REM-W', name: 'รื้อแอร์ติดผนัง', unitEx: null, qty: 1 };
const nl = C.repriceLine(old);
ok(nl.kind === 'addon' && nl.key === 'A-REM-W' && nl.unitEx === I('REM-W').ex, 'saved survey line S-REM-W → priced add-on A-REM-W');
ok(C.PRICE_V >= 19, 'price version bumped so saved quotes are repriced');
// wording
const txt = JSON.stringify([R.DECIDED, R.RATE_SOURCES, R.SMALL_VISIT, moves.map(m => [m.name, m.inc, m.exc, m.warranty])]);
ok(!/ส่วนลด|ฟรี|แน่นอน|%|HomePro|โฮมโปร|ไทวัสดุ|Q-Chang/i.test(txt), 'no discount / promise words, no retailer names');
console.log(fail ? `\n${fail} FAIL` : '\nALL PASS');
process.exit(fail ? 1 : 0);
