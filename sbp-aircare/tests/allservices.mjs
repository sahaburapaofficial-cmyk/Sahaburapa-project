// Rev.26 — all-services overview: every group resolves Pricebook rows, "from" = lowest standard rate, visit rules use published constants only. node tests/allservices.mjs
import { readFileSync } from 'node:fs';
globalThis.__SBP_DATA = JSON.parse(readFileSync(new URL('../assets/sbp-data.json', import.meta.url)));
globalThis.__SBP_ADDR = { v: 0, p: [], o: [] };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.location = { pathname: '/a.html', hash: '', hostname: 'localhost' };
const core = await import('../assets/sbp-core.js'); await core.loadData();
const A = await import('../assets/allservices.js');
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
for (const [id, th, , tab, , rows] of A.GROUPS) { const R = rows(); ok(R.length > 0 && ['clean', 'install', 'repair', 'move', 'mat'].includes(tab), `${id} ${th}: ${R.length} rows → tab ${tab}`); }
const S = id => A.groupSummary(A.GROUPS.find(g => g[0] === id)[5]());
ok(S('clean').from === Math.min(...core.DATA.clean.filter(r => r.type && r.rate.s).map(r => r.rate.s)), `clean from ${S('clean').from} = lowest per-unit standard rate`);
ok(S('diag').from === 900, 'diagnosis from ฿900');
ok(S('move').from === null && S('doc').from === null, 'groups without a standard rate say ประเมินหน้างาน');
const used = new Set(A.GROUPS.flatMap(g => g[5]().map(r => r.name)));
const missRep = core.DATA.rep.filter(r => !used.has(r.name) && !/เงื่อนไขเวลา|Mobilization/.test(r.cat))   // out of hours / mobilisation: no amount shown in the overview (rule 22, travel rules).map(r => r.cat + ': ' + r.name);
ok(missRep.length === 0, `repair items outside every group: ${missRep.length} ${missRep.join(' | ')}`);
const V = A.visitRules(), txt = V.map(r => r.d).join(' ');
ok(txt.includes(core.baht(core.DATA.minBill)) && txt.includes(core.baht(core.TRAVEL.baseFee)) && txt.includes(core.baht(core.QUEUE_RULES.rushFeeEx)), 'visit rules quote the published constants');
ok(!/นอกเวลา[^·]*฿/.test(txt), 'out of hours: no amount (rule 22)');
ok(!/ส่วนลด|ฟรี|แน่นอน|%/.test(JSON.stringify([A.GROUPS.map(g => g.slice(0, 3)), V])), 'no discount / promise words');
console.log(fail ? `\n${fail} FAIL` : '\nALL PASS'); process.exit(fail ? 1 : 0);
