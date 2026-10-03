// Rev.22 e2e — "ลูกค้าองค์กร": every sector tab renders a sample contract, package switch recalculates, the sample goes into the
// quotation and into the annual-contract calculator. usage: node tests/enterprise-ui.mjs a.html [width] [shot.png]
import { launch, BASE } from './_lib.mjs';
const [,, page = 'a.html', w = 1366, shot = ''] = process.argv;
const b = await launch(); const p = await b.newPage({ viewport: { width: +w, height: +w < 600 ? 844 : 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::|Failed to load resource/.test(m.text())) errs.push(m.text()); });
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
await p.goto(`${BASE}/${page}`); await p.evaluate(() => localStorage.clear()); await p.goto(`${BASE}/${page}#enterprise`); await p.waitForTimeout(3000);
const R = p.locator('#entRoot');
ok(await p.locator('#enterprise').isVisible(), 'section visible in the business view');
const tabs = R.locator('[role="tab"]');
ok(await tabs.count() === 7, `7 sector tabs (${await tabs.count()})`);
const amounts = {};
for (let i = 0; i < await tabs.count(); i++) {
  await tabs.nth(i).click(); await p.waitForTimeout(120);
  const id = await tabs.nth(i).getAttribute('data-sector'), sel = await tabs.nth(i).getAttribute('aria-selected');
  const big = await R.locator('.en-big b').innerText(), pains = await R.locator('.en-pains li').count();
  amounts[id] = big;
  if (sel !== 'true' || !/^฿[\d,]+$/.test(big) || pains < 4) ok(false, `${id}: selected=${sel} amount=${big} pains=${pains}`);
}
ok(Object.keys(amounts).length === 7, 'every sector shows a yearly amount and its pain points: ' + Object.entries(amounts).map(([k, v]) => `${k} ${v}`).join(' · '));
await R.locator('[data-sector="hospital"]').click(); await p.waitForTimeout(100);
const before = await R.locator('.en-big b').innerText();
await R.locator('.en-pkg button', { hasText: 'Basic Clean' }).click(); await p.waitForTimeout(100);
const after = await R.locator('.en-big b').innerText();
ok(before !== after && await R.locator('.en-pkg button[aria-checked="true"]').innerText() === 'Basic Clean', `package switch recalculates (${before} → ${after})`);
ok(/ตกลงในสัญญา/.test(await R.locator('.en-pains').innerText()) && /มีในแพ็กเกจ/.test(await R.locator('.en-pains').innerText()), 'answers say what is in the package and what is agreed in the contract');
ok(/ประเมินหน้างาน|มีค่าใช้จ่ายเพิ่มเติม/.test(await R.locator('.en-side').innerText()) && !/นอกเวลา[^\n]*฿/.test(await R.locator('.en-side').innerText()), 'add-ons: assessed / out-of-hours without an amount');
await R.locator('summary', { hasText: 'ร่างขอบเขตงาน' }).click();
ok(/________/.test(await R.locator('.en-sow pre').innerText()), 'draft scope of work shows blanks for terms agreed per customer');
await R.locator('.en-pkg button', { hasText: 'Corporate Control' }).click(); await p.waitForTimeout(100);
// into the quotation
await R.locator('.en-acts button', { hasText: 'ใส่ใบเสนอราคา' }).click(); await p.waitForTimeout(900);
const cart = await p.evaluate(() => JSON.parse(localStorage.getItem('sbp-quote-v2') || '{}').items || []);
const line = cart.find(i => i.group === 'contract');
ok(line && /โรงพยาบาล/.test(line.name) && `฿${line.unitEx.toLocaleString('en-US')}` === before, `contract line in the quotation (${line && line.name} ${line && line.unitEx})`);
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// into the calculator
await R.locator('[data-sector="factory"]').click(); await p.waitForTimeout(100);
const fac = await R.locator('.en-big b').innerText();
await R.locator('.en-acts button', { hasText: 'ปรับจำนวนเครื่องเอง' }).click();
// the total counts up (countUp, ~700 ms of animation frames — slower on software GL): wait for it to settle, not a fixed time
await p.waitForFunction(v => (document.querySelector('[data-b-out="low"]')?.textContent || '').trim() === v, fac, { timeout: 20000 }).catch(() => {});
const calc = (await p.locator('[data-b-out="low"]').first().innerText()).trim();
ok(calc === fac, `calculator loaded with the factory sample (${calc} = ${fac})`);
// keyboard
await R.locator('[role="tab"][aria-selected="true"]').focus(); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
ok(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-sector')) === 'office', 'arrow keys move between sectors');
const ow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
ok(ow <= 0, 'no horizontal scroll ' + ow);
if (shot) { await R.locator('[data-sector="chain"]').click(); await p.waitForTimeout(200); await p.locator('#enterprise').screenshot({ path: shot, timeout: 120000 }); }
ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
console.log(fail ? `\n${page}: ${fail} FAIL` : `\n${page}: ALL PASS`);
await b.close(); process.exit(fail ? 1 : 0);
