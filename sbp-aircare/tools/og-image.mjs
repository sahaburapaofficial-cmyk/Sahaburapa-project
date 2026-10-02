// Rev.11 — makes the link-preview image (LINE / Facebook / Google): assets/og/sbp-aircare-og.png (1200×630).
// The air-con is the site's own 3D render (no manufacturer design or logo); no prices in the image (they can change).
// usage: npm run serve (another terminal) → node tools/og-image.mjs
import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// 1 · the unit, rendered by the site (variant A hero viewer, light studio)
const p = await b.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
await p.goto(`${BASE}/a.html`); await p.waitForTimeout(6000);
await p.addStyleTag({ content: '#hero3d .cap,#hero3d .dock,#hero3d .labels{display:none!important}' });
await p.waitForTimeout(800);
const unit = await p.locator('#hero3d').screenshot({ timeout: 240000 });
await p.close();
// 2 · the card
const fonts = readFileSync(new URL('../assets/fonts.css', import.meta.url), 'utf8').replace(/url\((fonts\/[^)]+)\)/g, (_, f) => `url(data:font/woff2;base64,${readFileSync(new URL('../assets/' + f, import.meta.url)).toString('base64')})`);
const html = `<!doctype html><meta charset="utf-8"><style>${fonts}
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;font-family:Anuphan,sans-serif;background:linear-gradient(135deg,#0f2f5c 0%,#123F7B 48%,#1B5AA8 100%);color:#fff;overflow:hidden;position:relative}
.u{position:absolute;right:-40px;top:84px;width:600px;height:400px;border-radius:28px;background:#EEF2F6 url(data:image/png;base64,${unit.toString('base64')}) center/cover;box-shadow:0 40px 80px -30px rgba(0,0,0,.6)}
.t{position:absolute;left:64px;top:70px;width:560px}
.b{display:flex;align-items:center;gap:14px;font-weight:700;font-size:26px}.b i{font-style:normal;display:grid;place-items:center;width:56px;height:56px;border-radius:14px;background:#fff;color:#123F7B;font-size:20px;letter-spacing:.5px}
h1{margin-top:40px;font-size:52px;line-height:1.18;font-weight:700;white-space:nowrap}h1 em{font-style:normal;color:#FFB37A}
p{margin-top:20px;font-size:24px;line-height:1.5;color:#D8E4F4}
.f{position:absolute;left:64px;bottom:52px;display:flex;gap:12px;font-size:20px}.f span{padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.14)}
</style><div class="u"></div><div class="t"><div class="b"><i>SBP</i>SBP AirCare</div><h1>ล้างแอร์ ติดตั้ง ซ่อม<br><em>เห็นราคารวมก่อนจอง</em></h1><p>ทีมช่างของบริษัท สหบูรพากรุ๊ป จำกัด<br>กรุงเทพฯ และปริมณฑล</p></div>
<div class="f"><span>บ้าน · คอนโด · ร้านค้า</span><span>สัญญาล้างรายปีสำหรับองค์กร</span></div>`;
const q = await b.newPage({ viewport: { width: 1200, height: 630 } });
await q.setContent(html); await q.waitForTimeout(500);
writeFileSync(new URL('../assets/og/sbp-aircare-og.png', import.meta.url), await q.screenshot({ type: 'png' }));
await b.close();
console.log('assets/og/sbp-aircare-og.png');
