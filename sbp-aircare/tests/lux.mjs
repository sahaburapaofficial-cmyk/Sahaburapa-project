// Rev.29 — the second website's own logic (no browser): the consultation plan (atelier.planFor), the day room's model
// (atelier.roomAt / outAt), and the climate lab (spatial3d.makeClimate) — numbers from the shared rules, nothing promised.
// node tests/lux.mjs
import { readFileSync } from 'node:fs';
const RAW = JSON.parse(readFileSync(new URL('../assets/sbp-data.json', import.meta.url)));
globalThis.__SBP_DATA = RAW; globalThis.__SBP_ADDR = { v: 0, p: [], o: [] };
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.location = { pathname: '/e.html', hash: '', hostname: 'localhost', search: '' };
globalThis.Image = class { set src(v) {} };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
const core = await import('../assets/sbp-core.js'); await core.loadData();
const AT = await import('../assets/atelier.js');
const SM = await import('../assets/studio-model.js');
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const { DATA, TRAVEL, QUEUE_RULES, baht } = core;

// consultation plan
const one = AT.planFor({ place: 'home', units: '1', care: ['long'], when: 'soon' });
ok(one.some(r => r.k === 'clean' && r.d.includes(baht(TRAVEL.baseFee)) && r.d.includes(baht(DATA.minBill))), 'one home unit: cleaning + the small-job travel charge (rule 8) from the constants');
ok(!one.some(r => r.k === 'contract'), 'one home unit: no annual contract pushed');
const office = AT.planFor({ place: 'office', units: '20', care: ['warm', 'bill'], when: 'year' });
ok(office.some(r => r.k === 'contract' && /อาจได้อัตราพิเศษ/.test(r.d) && /ใบเสนอราคา/.test(r.d)), '20 office units: annual contract + "may qualify, confirmed in the quotation" (rule 3)');
ok(office.some(r => r.k === 'symptoms') && office.some(r => r.k === 'energy'), 'warm + high bill → symptom check and the BTU / energy studio');
const rush = AT.planFor({ place: 'condo', units: '3', care: [], when: 'urgent' });
ok(rush.some(r => r.k === 'queue' && r.d.includes(baht(QUEUE_RULES.rushFeeEx))), 'urgent → the rush fee from QUEUE_RULES (rule 23)');
const repl = AT.planFor({ place: 'home', units: '1', care: ['new'], when: 'soon' });
ok(repl[0].k === 'tradein' && !repl.some(r => r.k === 'clean'), 'only "new unit" → trade-in first, no cleaning');
const txt = JSON.stringify([one, office, rush, repl]);
ok(!/แน่นอน|ปลอดเชื้อ|100%|ส่วนลด|ฟรี|HomePro|Q-Chang/i.test(txt), 'no promise / discount words, no retailer names');

// day room model
ok(Math.abs(AT.outAt(14) - 35) < 0.2 && Math.abs(AT.outAt(21) - 29) < 0.6, 'outdoor air follows the studio climate: ~35 °C mid-afternoon, ~29 °C at night');
ok(AT.roomAt(15, 0.05) <= 25.05 && AT.roomAt(15, 0.85) > AT.roomAt(15, 0.05), 'sized unit holds 25 °C clean; a fouled coil cannot at peak heat');
ok(AT.roomAt(15, 0.05, false) > 30, 'unit off: the room follows the outdoor air');

// climate lab
const S = await import('../assets/spatial3d.js').catch(e => ({ err: e }));
if (S.err) ok(false, 'spatial3d imports in node: ' + S.err.message);
else {
  const c1 = S.makeClimate({ out: 35, people: 2, dirt: 0.05, inv: true }), c2 = S.makeClimate({ out: 35, people: 2, dirt: 0.85, inv: true });
  ok(c1.t25 != null && (c2.t25 == null || c2.t25 > c1.t25), `clean coil reaches 25 °C sooner (${Math.round(c1.t25)} vs ${c2.t25 == null ? 'not reached' : Math.round(c2.t25)} min)`);
  const c3 = S.makeClimate({ out: 35, people: 6, dirt: 0.05, inv: true });
  ok(c3.t25 == null || c3.t25 >= c1.t25, 'more people → slower or not reached');
  ok(SM.STD_SIZES.includes(c1.cap), `unit sized from the catalogue steps (${c1.cap} BTU)`);
}
console.log(fail ? `\n${fail} FAIL` : '\nALL PASS');
process.exit(fail ? 1 : 0);
