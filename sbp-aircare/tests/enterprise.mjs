// Rev.22 — enterprise sector samples: computed from the Pricebook, honest wording, every add-on resolves. node tests/enterprise.mjs
import { readFileSync } from 'node:fs';
globalThis.__SBP_DATA = JSON.parse(readFileSync(new URL('../assets/sbp-data.json', import.meta.url)));
globalThis.__SBP_ADDR = { v: 0, p: [], o: [] };
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.location = { pathname: '/a.html', hash: '', hostname: 'localhost' };
globalThis.Image = class { set src(v) {} };
const core = await import('../assets/sbp-core.js'); await core.loadData();
const E = await import('../assets/enterprise.js');
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const FORBID = /แก้หายแน่นอน|ไม่มีปัญหาอีกแน่นอน|ประหยัดไฟแน่นอน|ปลอดเชื้อ|สะอาด 100%|รับประกันเย็น|ล้างใหญ่ครบทุกจุด|ไม่มีค่าใช้จ่ายเพิ่มเติมทุกกรณี|เสร็จตามเวลาแน่นอน|ส่วนลด|ลด \d+%|ฟรี/;
ok(E.SECTORS.length >= 7 && ['office', 'chain', 'condo', 'hospital', 'school', 'hotel', 'factory'].every(id => E.SECTORS.some(s => s.id === id)), 'sectors: office · chain · condo · hospital · school · hotel · factory');
for (const s of E.SECTORS) {
  const c = E.sampleContract(s), e = core.estimateContract({ units: s.sample.units, visits: s.sample.visits, pkg: s.sample.pkg, size: s.sample.size, deep: true });
  ok(c.annualEx === e.annualEx * (s.branches || 1) && c.annualEx > 0, `${s.id}: annual ${c.annualEx} = estimateContract × ${s.branches || 1}`);
  ok(c.lines.every(l => l.c1 > 0 && l.c2 > 0), `${s.id}: every type has a C1 and C2 Pricebook rate`);
  ok(c.annualInc === core.incVat(c.annualEx), `${s.id}: VAT only on the total`);
  ok([2, 3, 4].includes(s.sample.visits) && [3, 4, 6].includes(c.every), `${s.id}: next visit every ${c.every} months (form rule 3/4/6/12)`);
  const txt = E.scopeText(s, c), all = JSON.stringify(s) + txt;
  ok(!FORBID.test(all), `${s.id}: no forbidden / discount words`);
  ok(/ระยะเวลาตอบสนองเมื่อแจ้งเหตุ: ________/.test(txt) && /รูปแบบใบแจ้งหนี้และรอบวางบิล: ________/.test(txt), `${s.id}: terms not set by the company stay blank`);
  ok(/VRV \/ VRF ไม่รวม/.test(txt) && /ก่อน VAT/.test(txt), `${s.id}: draft says VRV/VRF separate and before VAT`);
  ok(!/นอกเวลา[^\n]*฿/.test(all), `${s.id}: out-of-hours never with an amount (rule 22)`);
  ok(s.pains.length >= 4 && s.pains.every(p => p[0] && p[1] && ['pkg', 'deal'].includes(p[2])), `${s.id}: ${s.pains.length} pain points, each answered and tagged`);
  ok(c.unitsAll < core.VOLUME_HINT || /อาจได้อัตราพิเศษ/.test(txt), `${s.id}: ${c.unitsAll} units → special-rate hint without a figure`);
}
const chain = E.SECTORS.find(s => s.id === 'chain'), cc = E.sampleContract(chain);
ok(cc.branches === 12 && cc.unitsAll === 72 && cc.perVisitC1 >= core.DATA.minBill, `chain: 6 × 12 branches = 72 units, each branch visit ≥ minimum (${cc.perVisitC1})`);
const office = E.SECTORS.find(s => s.id === 'office');
ok(E.sampleContract(office, { pkg: 'Corporate Control' }).annualEx > E.sampleContract(office).annualEx, 'switching package recalculates from the Pricebook');
console.log(fail ? `\n${fail} FAIL` : '\nALL PASS');
process.exit(fail ? 1 : 0);
