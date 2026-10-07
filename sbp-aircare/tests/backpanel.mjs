// Rev.34 — the phone's Back closes the open panel instead of switching the page behind it (assets/backpanel.js)
//   quotation · product drawer · menu sheet · search · assistant: Back → panel closed, same page, page not locked
//   closing with × then Back → the previous page (no dead step) · a link in the menu sheet then Back → the page before
// usage: node tests/backpanel.mjs a.html [mobile|desktop]
import { launch, BASE } from './_lib.mjs';
const page = process.argv[2] || 'a.html', M = process.argv[3] !== 'desktop';
const b = await launch();
const p = await (await b.newContext(M ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } })).newPage();
p.setDefaultTimeout(20000);
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fail = 0; const ok = (c, m, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (c ? '' : ' — ' + x)); if (!c) fail++; };
const act = l => M ? l.tap() : l.click();
const wait = ms => p.waitForTimeout(ms);
const st = () => p.evaluate(() => ({ view: document.documentElement.dataset.sxView, cart: !!document.querySelector('.s-cart:not([hidden])'), drawer: !!document.querySelector('#drawer.open'), sheet: !!document.querySelector('.s-msheet.open'), pal: !!document.querySelector('.cp:not([hidden]), [role="dialog"].cp-dlg:not([hidden])'), bot: !!document.querySelector('#ab-panel:not([hidden])'), lock: document.body.classList.contains('lock') }));
const nav = async v => { if (M) { await act(p.locator('.mbar .s-mmenu')); await p.locator('.s-msheet.open').waitFor(); await act(p.locator(`.s-msheet a[href="#${v}"]`).first()); } else await act(p.locator(`header nav a[href="#${v}"]`).filter({ visible: true }).first()); await wait(900); };
const back = async () => { await p.goBack().catch(() => {}); await wait(900); };

await p.goto(`${BASE}/${page}`); await wait(2500);
// Rev.46: D/F are organised by service — the catalog lives on 'install', the contact form on 'help'
const SPLIT = await p.evaluate(() => !!document.getElementById('pathsRepair'));
const SHOP = SPLIT ? 'install' : 'shop', CONTACT = SPLIT ? 'help' : 'contact';
await nav(SHOP);
let s = await st(); ok(s.view === SHOP, 'menu → shop', JSON.stringify(s));

// quotation
await act(M ? p.locator('.mbar [data-cart-btn]') : p.locator('header [data-cart-btn]').filter({ visible: true }).first()); await p.locator('.s-cart.open').waitFor().catch(() => {}); await wait(300);
ok((await st()).cart, 'quotation opens');
await back(); s = await st();
ok(!s.cart && !s.lock && s.view === SHOP, 'Back closes the quotation · same page · page scrolls again', JSON.stringify(s));
await back(); s = await st();
ok(s.view === 'home', 'next Back goes to the page before (home)', JSON.stringify(s));

// product drawer
await nav(SHOP);
await act(p.locator('#catalog button.open, #catalog table.rows button').filter({ visible: true }).first()); await p.locator('#drawer.open').waitFor().catch(() => {}); await wait(300);
ok((await st()).drawer, 'product opens');
await back(); s = await st();
ok(!s.drawer && !s.lock && s.view === SHOP, 'Back closes the product · same page', JSON.stringify(s));

// close with × then Back: the previous page, not a dead step
await act(p.locator('#catalog button.open, #catalog table.rows button').filter({ visible: true }).first()); await p.locator('#drawer.open').waitFor().catch(() => {}); await wait(300);
await act(p.locator('#drawer [data-close]').first()); await wait(700);
s = await st(); ok(!s.drawer, 'product closes with ×');
await back(); s = await st();
ok(s.view === 'home', 'after closing with ×, Back goes to the page before (no dead Back)', JSON.stringify(s));

if (M) {
  // menu sheet: Back closes it; a link in it replaces the entry
  await act(p.locator('.mbar .s-mmenu')); await p.locator('.s-msheet.open').waitFor().catch(() => {}); await wait(300);   // the sheet slides in on the next frame (slow on this software renderer)
  ok((await st()).sheet, 'menu sheet opens');
  await back(); s = await st(); ok(!s.sheet && s.view === 'home', 'Back closes the menu sheet · same page', JSON.stringify(s));
  await nav(CONTACT); s = await st(); ok(s.view === CONTACT && !s.sheet, 'link in the sheet opens contact');
  await back(); s = await st(); ok(s.view === 'home', 'Back from contact → home (one step, not two)', JSON.stringify(s));
}
// assistant
await act(p.locator('.ab-fab')); await wait(500);
ok((await st()).bot, 'assistant opens');
await back(); s = await st(); ok(!s.bot && s.view === 'home', 'Back closes the assistant · same page', JSON.stringify(s));

ok(!errs.length, 'no page errors', errs.join(' | '));
console.log(fail ? `${page}: ${fail} FAIL` : `${page}: ALL PASS`); await b.close(); process.exitCode = fail ? 1 : 0;
