// node test for the symptom triage (assets/acdiag.js): free-text matching, ranking, Pricebook links — Rev.21
// run: node tests/acdiag.mjs   (no browser, no server)
import { readFileSync } from 'node:fs';
globalThis.__SBP_DATA = JSON.parse(readFileSync(new URL('../assets/sbp-data.json', import.meta.url)));
globalThis.__SBP_ADDR = { v: 0, p: [], o: [] };
const core = await import('../assets/sbp-core.js');
await core.loadData();
const D = await import('../assets/acdiag.js');
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

// how customers type it → expected first symptom
const PHR = [
  ['น้ำไหล', 'drip'], ['แอร์น้ำหยด', 'drip'], ['แอร์มีน้ำไหลออกมาจากเครื่อง', 'drip'], ['น้ำรั่วจากแอร์ครับ', 'drip'],
  ['แอร์เปิดไม่ติด', 'dead'], ['กดรีโมทแล้วไม่ติด', 'dead'], ['แอร์ไม่ทำงานเลย', 'dead'],
  ['แอร์ไม่เย็น', 'warm'], ['แอร์ไม่ค่อยเย็น มีแต่ลม', 'warm'], ['เปิดแล้วมีแต่ลมร้อน', 'warm'],
  ['แอร์เป็นน้ำแข็ง', 'ice'], ['มีน้ำแข็งเกาะท่อ', 'ice'],
  ['เบรกเกอร์ตัด', 'trip'], ['เปิดแอร์แล้วเบรคเกอร์ตัด', 'trip'], ['ไฟช็อต', 'trip'],
  ['ไฟกะพริบ', 'code'], ['แอร์ขึ้น error E1', 'code'], ['ไฟกระพริบที่ตัวเครื่อง', 'code'],
  ['แอร์เสียงดัง', 'noise'], ['คอยล์ร้อนสั่น', 'noise'],
  ['แอร์มีกลิ่นเหม็นอับ', 'smell'], ['มีกลิ่นไหม้', 'smell'],
  ['ลมเบา', 'weak'], ['แอร์ลมออกน้อย', 'weak'],
  ['บานสวิงไม่ขยับ', 'swing'], ['แอร์ติดๆดับๆ', 'cycle'], ['แอร์ตัดบ่อย', 'cycle'],
  ['คอยล์ร้อนน้ำหยด', 'cduwater'], ['ค่าไฟแพง', 'bill'], ['ควรล้างแอร์บ่อยแค่ไหน', 'care'],
];
PHR.forEach(([t, id]) => { const m = D.matchSymptoms(t); ok(m[0] && m[0].id === id, `"${t}" → ${m.map(s => s.id).join(',') || '(none)'} (want ${id})`); });
ok(D.matchSymptoms('สวัสดี').length === 0, 'unrelated text matches nothing');

// every cause referenced exists, every rep regex hits at least one Pricebook line
const used = new Set();
D.SYMPTOMS.forEach(s => { s.base.forEach(c => used.add(c)); s.q.forEach(q => q.opts.forEach(o => Object.keys(o[2]).forEach(c => used.add(c)))); });
used.forEach(c => ok(!!D.CAUSES[c], `cause ${c} defined`));
Object.entries(D.CAUSES).forEach(([id, c]) => c.rep.forEach(re => ok(core.DATA.rep.some(r => re.test(r.name)), `${id} ${re} → Pricebook line`)));
// ticket symptom ids are the ones the job ticket knows
const TICKET = ['warm', 'drip', 'noise', 'dead', 'smell', 'code', 'ice', 'trip', 'weak', 'swing'];
D.SYMPTOMS.forEach(s => ok(s.sym === null || TICKET.includes(s.sym), `${s.id}.sym=${s.sym} is a ticket option`));

// diagnosis lines
ok(/ติดผนัง/.test(D.diagLine('wall').name) && D.diagLine('wall').rate.s === 900, 'wall diagnosis line 900');
ok(/แขวน|ฝังฝ้า|สี่ทิศทาง/.test(D.diagLine('big').name) && D.diagLine('big').rate.s === 1200, 'big diagnosis line 1200');

// ranking sanity — the points a technician should go to
const top = (s, a) => D.diagnose(s, a).top.id;
ok(top('drip', { out: 'none', where: 'body', type: 'wall' }) === 'drainClog', 'drip + no water outside → drain clog');
ok(top('drip', { out: 'none', type: 'big' }) === 'drainPump' || top('drip', { out: 'none', type: 'big' }) === 'drainClog', 'drip cassette → pump/drain');
ok(top('drip', { out: 'ok', where: 'pipe' }) === 'drainLine', 'drip along the pipe → drain line');
ok(!D.diagnose('drip', { out: 'none', where: 'body', type: 'wall' }).causes.some(c => c.id === 'drainPump'), 'wall unit → no drain pump');
ok(!D.diagnose('code', { type: 'wall' }).causes.some(c => c.id === 'drainPump'), 'wall unit, base list → no drain pump');
ok(top('drip', { out: 'ok', where: 'vent', last: 'old' }) === 'dirty', 'drip from vent, old clean → cleaning');
ok(top('warm', { cdu: 'off' }) === 'cduPower', 'warm + outdoor unit off → outdoor power/start');
ok(top('warm', { cdu: 'run', last: '6', frost: 'yes' }) === 'gas', 'warm + outdoor runs + frost + recent clean → refrigerant');
ok(top('warm', { cdu: 'run', last: 'old', frost: 'no' }) === 'dirty', 'warm + not cleaned for a year → cleaning');
ok(top('warm', { cdu: 'hot' }) === 'cduHeat', 'warm + outdoor hot/cycling → condenser heat');
ok(top('ice', { last: '6', air: 'ok', where: 'pipe' }) === 'gas', 'ice on pipe, strong air, clean → refrigerant');
ok(top('ice', { last: 'old', air: 'weak' }) === 'dirty', 'ice + weak air + dirty → cleaning');
ok(top('dead', { lamp: 'off', brk: 'ok' }) === 'powerIn', 'dead + no lamp → indoor power supply');
ok(top('dead', { ir: 'no' }) === 'remote', 'remote no IR → remote');
ok(top('dead', { unit: 'no', lamp: 'off', brk: 'ok', ir: 'no' }) === 'powerIn', 'unit button does nothing, no lamp → indoor power supply');
ok(top('dead', { unit: 'run' }) === 'remote', 'unit button works → remote');
ok(top('dead', { brk: 'trip' }) === 'short', 'dead + breaker trips again → short');
ok(top('trip', { when: 'up' }) === 'short', 'trips as soon as raised → short');
ok(top('trip', { when: 'start' }) === 'comp', 'trips at compressor start → compressor');
ok(top('smell', { kind: 'burn' }) === 'burn', 'burnt smell → burn');
ok(top('noise', { from: 'out', kind: 'shake' }) === 'mount', 'outdoor shaking → mounting');
ok(top('cduwater', { ice: 'no' }) === 'normal', 'outdoor water, no ice → normal');
ok(D.diagnose('trip', { when: 'up' }).urgent, 'short → urgent');
ok(D.diagnose('smell', { kind: 'burn' }).urgent, 'burn → urgent');
ok(!D.diagnose('warm', { cdu: 'run' }).urgent, 'warm is not urgent');
ok(D.diagnose('warm', { last: 'old', cdu: 'run' }).clean, 'top dirty → clean recommendation');
const r = D.diagnose('drip', { out: 'none', type: 'wall' });
ok(r.top.jobs.some(j => /ท่อน้ำทิ้งตัน/.test(j.name) && j.ex === 900), 'drain clog → Pricebook 900');
ok(/อาการ: น้ำหยด/.test(r.summary) && /จุดที่น่าจะเป็น/.test(r.summary), 'summary text');
ok(D.diagnose('warm', {}).causes.map(c => c.id).join() === 'dirty,cduHeat,cduPower,gas,load', 'no answers → base order');
ok(D.diagnose('nope') === null, 'unknown symptom → null');

// rule 11 — no promise words in the data
const FORBID = /แก้หายแน่นอน|อะไหล่เสียแน่นอน|ไม่มีค่าใช้จ่ายเพิ่มเติมทุกกรณี|รับประกันหาย|หายแน่|100%/;
ok(!FORBID.test(JSON.stringify(D.SYMPTOMS) + JSON.stringify(Object.values(D.CAUSES).map(c => c.th + c.check))), 'no forbidden promise words');
console.log(fail ? `\n${fail} FAIL` : '\nALL PASS');
process.exit(fail ? 1 : 0);
