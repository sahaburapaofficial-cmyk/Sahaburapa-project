#!/usr/bin/env node
// Rev.47 — one command for the developer hand-over of A · B · C (owner 7 ต.ค. 2569: "ทำสรุปเว็บ A B C แบบละเอียดเพื่อส่งมอบให้ Dev
// เช็คทั้งหมดว่าการทำงานทั้งหมดถูกต้องไหม"). Runs every check that covers A · B · C, one after another, and prints one table:
// check · design · result · seconds. Full output of each check goes to verify-abc/<n>-<name>.log; the table is also written as
// verify-abc/summary.json and verify-abc/summary.md.
//   npm run serve &            (dev server on :8765 — browser checks need it)
//   npm run verify:abc         (everything, ~2–3 h on a machine without a GPU)
//   npm run verify:abc -- quick   (logic + one desktop and one phone pass per design, ~30 min)
//   npm run verify:abc -- only=workflow,layout   (only checks whose name contains one of these words)
// Exit 1 when any check fails. Checks that need a file this repo does not ship (internal/sbp_real.json) are reported as "skip".
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'verify-abc');
const args = process.argv.slice(2), QUICK = args.includes('quick');
const ONLY = (args.find(a => a.startsWith('only=')) || '').slice(5).split(',').filter(Boolean);
const V = ['a', 'b', 'c'];

// [name, design, command, args, minutes allowed] — design '-' = logic only (no browser)
const L = [
  ['accuracy · ตัวเลขตามกฎเจ้าของ §6.6', '-', 'node', ['tests/accuracy.mjs'], 20],
  ['rates · อัตราที่บริษัทกำหนด (rates.js)', '-', 'node', ['tests/rates.mjs'], 5],
  ['acdiag · คัดกรองอาการ 14 อาการ', '-', 'node', ['tests/acdiag.mjs'], 5],
  ['review · ค่าเพิ่มงานติดตั้งรายเครื่อง / เวลางาน', '-', 'node', ['tests/review-fixes.mjs'], 5],
  ['tradein · เทิร์นแอร์เก่า', '-', 'node', ['tests/tradein.mjs'], 5],
  ['allservices · งานบริการทั้งหมด + ค่าเข้างาน', '-', 'node', ['tests/allservices.mjs'], 5],
  ['enterprise · สัญญาตัวอย่าง 7 ประเภท', '-', 'node', ['tests/enterprise.mjs'], 5],
  ['rev35 · BOQ + แอร์ของฉัน', '-', 'node', ['tests/rev35.mjs'], 5],
  ['recon · ราคาเว็บเทียบ Pricebook', '-', 'python3', ['tools_recon.py'], 5, () => fs.existsSync(path.join(ROOT, 'internal', 'sbp_real.json')) ? '' : 'ต้องมี internal/sbp_real.json (ไฟล์ภายใน ไม่อยู่ใน repo)'],
  ['backend · Apps Script จำลอง ทุกแบบ', 'abc', 'node', ['tests/backend-e2e.mjs', 'a.html,b.html,c.html'], 40],
];
const per = (name, file, extra = [], min = 25) => V.map(v => [name, v, 'node', [file, v + '.html', ...extra], min]);
if (QUICK) {
  L.push(...per('smoke · คอม 1366', 'tests/smoke.mjs'), ...per('smoke · มือถือ 390', 'tests/smoke.mjs', ['390', '844']),
    ...per('textscan · คำต้องห้าม', 'tests/textscan.mjs'), ...per('servicepath · ทางเข้า + ขั้นตอนบริการ', 'tests/servicepath.mjs'),
    ...per('workflow · คลิกจริง คอม', 'tests/workflow.mjs', ['desktop'], 40));
} else {
  L.push(
    ...per('smoke · คอม 1366', 'tests/smoke.mjs'), ...per('smoke · มือถือ 390', 'tests/smoke.mjs', ['390', '844']),
    ...per('textscan · คำต้องห้าม', 'tests/textscan.mjs'),
    ...per('booking · จองล้าง 3 ขั้น', 'tests/quickclean.mjs'), ...per('submit · ส่งฟอร์ม 3 โหมด', 'tests/submit.mjs'),
    ...per('acbot · ผู้ช่วยตรวจอาการ → ใบจอง', 'tests/acbot.mjs'), ...per('enterprise-ui · แผงองค์กร', 'tests/enterprise-ui.mjs'),
    ...per('concierge · ปรึกษา 4 คำถาม', 'tests/concierge.mjs'), ...per('rev35-ui · แอร์ของฉัน / BOQ / ลองบนผนัง', 'tests/rev35-ui.mjs'),
    ...per('servicepath · ทางเข้า + ขั้นตอนบริการ คอม', 'tests/servicepath.mjs'), ...per('servicepath · มือถือ', 'tests/servicepath.mjs', ['mobile']),
    ...per('backpanel · ปุ่มย้อนกลับปิดแผง มือถือ', 'tests/backpanel.mjs', ['mobile']),
    ...per('workflow · คลิกจริง คอม', 'tests/workflow.mjs', ['desktop'], 40), ...per('workflow · แตะจริง มือถือ', 'tests/workflow.mjs', ['mobile'], 40),
    ...per('layout · 1366', 'tests/layout.mjs', ['1366']), ...per('layout · 820', 'tests/layout.mjs', ['820']), ...per('layout · 390', 'tests/layout.mjs', ['390']),
    ...per('axe · 1366 สว่าง', 'tests/axe.mjs', ['1366']), ...per('axe · 1366 มืด', 'tests/axe.mjs', ['1366', '--theme', 'dark']), ...per('axe · 390', 'tests/axe.mjs', ['390']),
  );
}
const todo = ONLY.length ? L.filter(([n]) => ONLY.some(w => n.includes(w))) : L;

const up = await fetch('http://localhost:8765/a.html').then(r => r.ok, () => false);
if (!up && todo.some(t => t[1] !== '-')) { console.error('dev server is not running on :8765 — start it first: npm run serve &'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const run = (cmd, a, min, log) => new Promise(res => {
  const t0 = Date.now(), f = fs.openSync(log, 'w');
  const p = spawn(cmd, a, { cwd: ROOT, stdio: ['ignore', f, f] });
  const k = setTimeout(() => p.kill('SIGKILL'), min * 60000);
  p.on('close', code => { clearTimeout(k); fs.closeSync(f); res({ code, s: Math.round((Date.now() - t0) / 1000) }); });
});
// a short note from the log: the summary line most tests print, or the first FAIL
const note = log => {
  const t = fs.readFileSync(log, 'utf8').split('\n');
  const fail = t.find(l => /^FAIL /.test(l)); if (fail) return fail.slice(0, 160);
  const j = [...t].reverse().find(l => /^\{.*\}$/.test(l.trim())); if (j) return j.trim().slice(0, 160);
  return ([...t].reverse().find(l => l.trim()) || '').trim().slice(0, 160);
};

const rows = [];
for (const [i, [name, v, cmd, a, min, need]] of todo.entries()) {
  const why = need && need();
  const log = path.join(OUT, `${String(i + 1).padStart(2, '0')}-${name.split(' ')[0]}-${v}.log`);
  if (why) { rows.push({ name, v, result: 'skip', s: 0, note: why }); console.log(`skip  ${v.toUpperCase().padEnd(3)} ${name} — ${why}`); continue; }
  const r = await run(cmd, a, min, log);
  const result = r.code === 0 ? 'pass' : 'FAIL';
  rows.push({ name, v, result, s: r.s, note: note(log), log: path.relative(ROOT, log) });
  console.log(`${result.padEnd(5)} ${v.toUpperCase().padEnd(3)} ${name}  (${r.s}s)${r.code ? '  ' + note(log) : ''}`);
}
const n = k => rows.filter(r => r.result === k).length;
const head = { when: new Date().toISOString(), commit: await new Promise(res => { let o = ''; const p = spawn('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }); p.stdout.on('data', d => o += d); p.on('close', () => res(o.trim())); }), pass: n('pass'), fail: n('FAIL'), skip: n('skip') };
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ ...head, rows }, null, 1));
fs.writeFileSync(path.join(OUT, 'summary.md'), `# verify-abc · ${head.when} · ${head.commit}\n\npass ${head.pass} · FAIL ${head.fail} · skip ${head.skip}\n\n| ผล | แบบ | การตรวจ | วินาที | หมายเหตุ |\n|---|---|---|---|---|\n` +
  rows.map(r => `| ${r.result} | ${r.v.toUpperCase()} | ${r.name} | ${r.s} | ${(r.note || '').replace(/\|/g, '/')} |`).join('\n') + '\n');
console.log(`\npass ${head.pass} · FAIL ${head.fail} · skip ${head.skip} → verify-abc/summary.md`);
process.exit(head.fail ? 1 : 0);
