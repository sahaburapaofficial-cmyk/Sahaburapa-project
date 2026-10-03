// Rev.24 — trade-in old AC: repair lines resolve in the Pricebook, new-set price from the catalogue, honest wording. node tests/tradein.mjs
import { readFileSync } from 'node:fs';
globalThis.__SBP_DATA = JSON.parse(readFileSync(new URL('../assets/sbp-data.json', import.meta.url)));
globalThis.__SBP_ADDR = { v: 0, p: [], o: [] };
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.location = { pathname: '/a.html', hash: '', hostname: 'localhost' };
globalThis.Image = class { set src(v) {} };
const core = await import('../assets/sbp-core.js'); await core.loadData();
const T = await import('../assets/tradein.js');
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const FORBID = /แก้หายแน่นอน|ไม่มีปัญหาอีกแน่นอน|ประหยัดไฟแน่นอน|ปลอดเชื้อ|สะอาด 100%|รับประกันเย็น|ไม่มีค่าใช้จ่ายเพิ่มเติมทุกกรณี|ส่วนลด|ลด \d+%|ฟรี/;
const base = { age: 'a12', type: 'wall', btu: 12000, sys: 'fix', ref: 'r22', issue: 'comp', qty: 1, hrs: 8 };

// every issue × type × system resolves its repair lines in the Pricebook (no silent gaps)
const types = ['wall', 'ceiling', 'cassette', 'floor'];
for (const issue of T.ISSUES.map(i => i.id)) for (const type of types) for (const sys of ['fix', 'inv']) for (const btu of [12000, 48000]) {
  if (type === 'wall' && btu > 30000) continue;
  const L = T.repairLines({ ...base, issue, type, sys, btu }), want = { reno: 0, weak: 1, comp: 6, leak: 4, coilOut: 5, coilIn: 5, board: 2, fanIn: 2, fanOut: 2 }[issue];
  if (L.length !== want) ok(false, `${issue}/${type}/${sys}/${btu}: ${L.length} lines, want ${want}`);
}
ok(true, 'repair lines resolve for every issue × type × system × size');
const comp = T.repairLines(base);
ok(comp[0].name.startsWith('ตรวจวินิจฉัยแอร์ติดผนัง') && comp[0].ex === 900, 'diagnosis first (wall ฿900)');
ok(comp.some(l => /คอมเพรสเซอร์ 9,000-20,000/.test(l.name) && l.ex == null), 'compressor has no standard rate → assessed on site (no guessed figure)');
ok(comp.some(l => /R22/.test(l.name) && l.ex === 2800), 'R22 unit refills with the R22 line (฿2,800)');
ok(T.repairLines({ ...base, ref: 'r32' }).some(l => /R32\/R410A/.test(l.name)), 'R32 unit refills with the R32/R410A line');
ok(T.repairLines({ ...base, issue: 'board', sys: 'fix' })[1].ex === 4200 && T.repairLines({ ...base, issue: 'board', sys: 'inv' })[1].ex == null, 'board: fixed ฿4,200 · inverter assessed');

// the comparison
const R = T.tradeIn(base);
ok(R.repair.known === comp.reduce((a, l) => a + (l.ex ?? 0), 0) && R.repair.unknown >= 1, `known repair part ${R.repair.known} + ${R.repair.unknown} assessed`);
const px = core.DEMO.models.filter(m => m.type === 'wall' && m.inverter).flatMap(m => m.skus.filter(s => s.btu >= 10800 && s.btu <= 13440).map(s => s.px));
ok(R.set.n === px.length && R.set.min === Math.min(...px) && R.set.max === Math.max(...px), `new wall 12k inverter: ${R.set.n} catalogue SKUs ${R.set.min}–${R.set.max}, median ${R.set.med}`);
ok(R.set.install && R.set.install.ex === core.installOptions('wall', 12000).find(o => o.key === 'STANDARD').item.ex && R.setEx === R.set.med + R.set.install.ex, `set = median + standard install ${R.set.install.ex}`);
ok(R.set.out.length === 3 && R.set.out.every(l => l.ex == null), 'pump-down / removal / take-away of the old unit stay "ประเมินหน้างาน"');
ok(R.tradeValue === null && T.TRADE_IN.table === null, 'trade-in value not published until the owner sets the table');
ok(R.verdict === 'replace' && R.why.length >= 3, `12-yr R22 fixed-speed with a dead compressor → ${R.verdict} (${R.why.length} reasons)`);
ok(R.energy.save > 0 && !R.energy.oldInv && R.energy.old > R.energy.now, `electricity old ${Math.round(R.energy.old)} > new ${Math.round(R.energy.now)} a year`);
ok(T.tradeIn({ ...base, age: 'a3', issue: 'fanIn', ref: 'r32' }).verdict === 'repair', '3-yr unit with a fan motor fault → repair');
ok(T.tradeIn({ ...base, type: 'cassette', btu: 36000, age: 'a8', issue: 'leak', ref: 'r32', sys: 'inv' }).verdict === 'compare', '8-yr inverter cassette 36k refrigerant leak → compare both quotes');
ok(T.tradeIn({ ...base, age: 'a8', issue: 'leak', ref: 'r32', sys: 'inv' }).verdict === 'replace', '8-yr wall 12k leak: known repair ≥ 50% of a new set → replace');
ok(T.tradeIn({ ...base, age: 'a6', issue: 'reno' }).verdict === 'keep' && T.tradeIn({ ...base, age: 'a16', issue: 'reno' }).verdict === 'replace', 'renovation: 5–7 yr keep · 15+ yr replace');
ok(T.tradeIn({ ...base, qty: 12 }).special && !T.tradeIn({ ...base, qty: 2 }).special, `special-rate hint from ${core.VOLUME_HINT} units, without a figure`);
const all = JSON.stringify([T.AGES, T.ISSUES, T.SYSTEMS, T.REFS, ...T.ISSUES.flatMap(i => ['a3', 'a8', 'a16'].map(age => T.tradeIn({ ...base, issue: i.id, age })))]);
ok(!FORBID.test(all), 'no forbidden / discount words');
console.log(fail ? `\n${fail} FAIL` : '\nALL PASS');
process.exit(fail ? 1 : 0);
