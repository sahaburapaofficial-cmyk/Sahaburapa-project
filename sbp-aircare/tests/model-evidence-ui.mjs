// Check exact manufacturer data and exact retail references in each A/B/C catalog at desktop and mobile widths.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, BASE } from './_lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'model-evidence.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'sbp-data.json'), 'utf8'));
const normalize = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const verifiedExamples = [
  { model: evidence.models.find(model => model.indoorModel === '42TVDB022'), family: 'Carrier' },
  { model: evidence.models.find(model => model.indoorModel === 'FTKQ09YV2S'), family: 'Daikin' },
];
assert.ok(verifiedExamples.every(example => example.model), 'an exact Carrier model and an exact Daikin model should be available for A/B/C UI coverage');

const browser = await launch();
try {
  for (const { model: verifiedExample, family } of verifiedExamples) {
    const listedProduct = catalog.prods.find(item => item[0] === verifiedExample.type && normalize(item[1]) === normalize(verifiedExample.brand) && normalize(item[2]) === normalize(verifiedExample.sku));
    assert.ok(listedProduct, `${family} exact OEM evidence should match the site catalog SKU`);
    for (const variant of ['a', 'b', 'c']) {
      for (const width of [1365, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 920 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${BASE}/${variant}.html#shop`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.classList.contains('sx-on'), null, { timeout: 120000 });
      const search = page.locator('[data-cat-search]');
      await search.fill(verifiedExample.sku);
      await page.waitForTimeout(350);
      const card = variant === 'b'
        ? page.locator('[data-cat-grid] tr').filter({ hasText: verifiedExample.sku }).first()
        : page.locator('[data-cat-grid] article.card').first();
      await card.waitFor({ state: 'visible', timeout: 20000 });
      const manufacturerBtu = verifiedExample.fields.btu?.value;
      const ratedBtu = manufacturerBtu ?? listedProduct[3];
      const ratedLabel = `${(ratedBtu / 1000).toFixed(1)}k`;
      if (variant === 'b') {
        if (manufacturerBtu) assert.equal(await card.locator('td[title="ค่าความเย็น BTU/h ตามผู้ผลิต"]').count(), 1, 'table view should identify an exact manufacturer rating');
        if (manufacturerBtu) assert.match(await card.locator('td').nth(4).textContent() || '', new RegExp(`${ratedBtu.toLocaleString('en-US')} BTU/h`));
      }
      const ratedOption = card.locator('.bchip').filter({ hasText: ratedLabel });
      if (await ratedOption.count()) await ratedOption.first().click();
      await card.locator(variant === 'b' ? 'button.chip' : 'button.open').click();
      const panel = page.locator('#drawerBody .s-oem');
      await panel.waitFor({ state: 'visible', timeout: 10000 });
      await panel.locator('summary').first().click();
      await page.waitForFunction(() => document.querySelector('#drawerBody .s-oem')?.open === true, null, { timeout: 5000 });
      const panelText = await panel.textContent() || '';
      if (manufacturerBtu) assert.match(panelText, new RegExp(ratedBtu.toLocaleString('en-US')));
      assert.doesNotMatch(panelText, /BTU BTU\/h/);
      if (family === 'Carrier') assert.match(panelText, /Pricebook/);
      else assert.match(panelText, /ราคาเครื่องและอัตราติดตั้งยังยึดข้อมูลบริษัท/);
      assert.match(panelText, /เอกสารผู้ผลิต/);
      if (family === 'Carrier') {
        assert.match(panelText, /21,000/);
        assert.match(panelText, /6,100–21,800/);
        assert.match(panelText, /9\.4 A/);
        assert.match(panelText, /220V \/ 1 Ph \/ 50Hz/);
        assert.match(panelText, /320 x 1050 x 250/);
        assert.match(panelText, /12\.7 mm/);
      } else {
        assert.match(panelText, /2\.7 kW/);
        assert.match(panelText, /2,320 kcal\/h/);
        assert.match(panelText, /4\.1 A/);
        assert.match(panelText, /860 W/);
        assert.match(panelText, /220 V \/ 50 Hz/);
        assert.match(panelText, /ไม่ระบุจำนวนเฟสหรือจำนวนสายไฟ/);
        assert.match(panelText, /285 x 770 x 226/);
        assert.match(panelText, /418 x 695 x 244/);
        assert.match(panelText, /R32/);
      }
      assert.ok(await page.locator('#drawerBody .s-oem-source a').count() > 0, 'the product detail should expose a primary source link');
      await page.locator('#drawer [data-close]').click();

      // The Daikin listing references are retail presentation examples, not manufacturer claims.
      await search.fill('FTKM09YV2S');
      await page.waitForTimeout(350);
      const retailerCard = variant === 'b'
        ? page.locator('[data-cat-grid] tr').filter({ hasText: 'FTKM09YV2S' }).first()
        : page.locator('[data-cat-grid] article.card').first();
      await retailerCard.waitFor({ state: 'visible', timeout: 15000 });
      await retailerCard.locator(variant === 'b' ? 'button.chip' : 'button.open').click();
      const retailPanel = page.locator('#drawerBody .s-oem');
      await retailPanel.waitFor({ state: 'visible', timeout: 10000 });
      await retailPanel.locator('summary').first().click();
      await page.waitForFunction(() => document.querySelector('#drawerBody .s-oem')?.open === true, null, { timeout: 5000 });
      const retailText = await retailPanel.textContent() || '';
      assert.match(retailText, /HomePro/);
      assert.match(retailText, /PowerBuy/);
      assert.equal(await page.locator('#drawerBody .s-oem-retail a').count(), 2);
      assert.deepEqual(errors, [], `variant ${variant} at ${width}px should not throw while opening product evidence`);
      await page.close();
      console.log(`model-evidence-ui: PASS ${variant.toUpperCase()} ${width}px`);
      }
    }
  }
} finally {
  await browser.close();
}
