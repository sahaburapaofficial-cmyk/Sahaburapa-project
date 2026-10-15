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
const verifiedExample = evidence.models.find(model => {
  if (!Number.isFinite(model.fields?.btu?.value)) return false;
  const row = catalog.prods.find(item => item[0] === model.type && normalize(item[1]) === normalize(model.brand) && normalize(item[2]) === normalize(model.sku));
  return row && row[3] !== model.fields.btu.value;
});
assert.ok(verifiedExample, 'an exact model with a known manufacturer-vs-Pricebook distinction should exist');

const browser = await launch();
try {
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
      const ratedBtu = verifiedExample.fields.btu.value;
      const ratedLabel = `${(ratedBtu / 1000).toFixed(1)}k`;
      if (variant === 'b') {
        assert.equal(await card.locator('td[title="ค่าความเย็น BTU/h ตามผู้ผลิต"]').count(), 1, 'table view should identify an exact manufacturer rating');
        assert.match(await card.locator('td').nth(4).textContent() || '', new RegExp(`${ratedBtu.toLocaleString('en-US')} BTU/h`));
      }
      const ratedOption = card.locator('.bchip').filter({ hasText: ratedLabel });
      if (await ratedOption.count()) await ratedOption.first().click();
      await card.locator(variant === 'b' ? 'button.chip' : 'button.open').click();
      const panel = page.locator('#drawerBody .s-oem');
      await panel.waitFor({ state: 'visible', timeout: 10000 });
      await panel.locator('summary').first().click();
      await page.waitForFunction(() => document.querySelector('#drawerBody .s-oem')?.open === true, null, { timeout: 5000 });
      const panelText = await panel.textContent() || '';
      assert.match(panelText, new RegExp(ratedBtu.toLocaleString('en-US')));
      assert.doesNotMatch(panelText, /BTU BTU\/h/);
      assert.match(panelText, /Pricebook/);
      assert.match(panelText, /เอกสารผู้ผลิต/);
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
} finally {
  await browser.close();
}
