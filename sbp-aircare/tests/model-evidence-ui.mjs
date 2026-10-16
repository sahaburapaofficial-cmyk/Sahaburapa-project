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
  { model: evidence.models.find(model => model.indoorModel === '40TGEV0361UP' && model.outdoorModel === '38TGEV0361A3'), family: 'Carrier' },
  { model: evidence.models.find(model => model.indoorModel === '42TGEV0401CP' && model.outdoorModel === '38TGEV0401A3'), family: 'Carrier' },
  { model: evidence.models.find(model => model.indoorModel === '42TSAA013'), family: 'Carrier' },
  { model: evidence.models.find(model => model.indoorModel === '42NSAA018'), family: 'Carrier' },
  { model: evidence.models.find(model => model.indoorModel === 'FTKQ09YV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FHFC13EV2S' && model.outdoorModel === 'RZFC13EV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FHFC42EV2S' && model.outdoorModel === 'RZFC42EY2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FTKF24WV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FTKB24ZV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FTKZ09VV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FTKQ24XV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FTM09PV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FTKZ09YV2S5'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FVGR10QV2S'), family: 'Daikin' },
  ...['FHNQ13NV2S', 'FHNQ18NV2S', 'FHNQ24NV2S', 'FHNQ30NV2S', 'FHNQ36NV2S'].map(indoorModel => ({
    model: evidence.models.find(candidate => candidate.indoorModel === indoorModel), family: 'Daikin',
  })),
  ...['42NVAA010', '42NVAA013', '42NVAA018', '42NVAA024'].map(indoorModel => ({
    model: evidence.models.find(candidate => candidate.indoorModel === indoorModel), family: 'Carrier',
  })),
  ...['MSCE-10CRFN8-ID', 'MSCE-13CRFN8-ID', 'MSCE-19CRFN8-ID', 'MSCE-25CRFN8-ID'].map(indoorModel => ({
    model: evidence.models.find(candidate => candidate.indoorModel === indoorModel), family: 'Midea',
  })),
  ...['MSAG-09CRN8-IDU', 'MSAG-12CRN8-IDU', 'MSAG-18CRN8-IDU', 'MSAG-24CRN8-IDU'].map(indoorModel => ({
    model: evidence.models.find(candidate => candidate.indoorModel === indoorModel), family: 'Midea',
  })),
  { model: evidence.models.find(model => model.indoorModel === 'FAVF30XV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FHA13BV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FHA18BV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FHA24BV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FCFC36EV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FCF36DV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'TAC-PRO09PE'), family: 'TCL' },
  ...['TAC-BR10CSV/TB', 'TAC-BR13CSV/TB', 'TAC-BR19CSV/TB', 'TAC-BR25CSV/TB', 'TAC-MFS10', 'TAC-MFS13', 'TAC-MFS19', 'TAC-SA30CSV/ZB'].map(sku => ({
    model: evidence.models.find(candidate => candidate.brandId === 'tcl' && candidate.sku === sku), family: 'TCL',
  })),
  { model: evidence.models.find(model => model.indoorModel === 'FCFC42EV2S' && model.outdoorModel === 'RZFC42EY2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'FCF24DV2S' && model.outdoorModel === 'RZF24DV2S'), family: 'Daikin' },
  { model: evidence.models.find(model => model.indoorModel === 'PLY-SM13EA4'), family: 'Mitsubishi Electric' },
  { model: evidence.models.find(model => model.indoorModel === 'PLY-SM36EA4'), family: 'Mitsubishi Electric' },
  { model: evidence.models.find(model => model.indoorModel === 'PLY-M36EA2'), family: 'Mitsubishi Electric' },
  { model: evidence.models.find(model => model.sku === 'PLY-M24EA/TH-SUY-M24VA-TH'), family: 'Mitsubishi Electric' },
  { model: evidence.models.find(model => model.sku === 'PLY-M36EA/TH-SUY-M36VA-TH'), family: 'Mitsubishi Electric' },
  { model: evidence.models.find(model => model.indoorModel === 'MSY-AW09VF'), family: 'Mitsubishi Electric' },
  { model: evidence.models.find(model => model.indoorModel === 'MSY-GZ24VF'), family: 'Mitsubishi Electric' },
  { model: evidence.models.find(model => model.indoorModel === 'CS-YN9YKT'), family: 'Panasonic' },
  { model: evidence.models.find(model => model.indoorModel === 'CS-YN12YKT'), family: 'Panasonic' },
  { model: evidence.models.find(model => model.indoorModel === 'CS-YN18YKT'), family: 'Panasonic' },
  { model: evidence.models.find(model => model.indoorModel === 'CS-YN24YKT'), family: 'Panasonic' },
  ...['YU9ZKT', 'YU13ZKT', 'YU18ZKT', 'YU24ZKT', 'YU28ZKT', 'YU36ZKT'].map(sku => ({
    model: evidence.models.find(candidate => candidate.sku === sku), family: 'Panasonic',
  })),
  { model: evidence.models.find(model => model.indoorModel === 'CS-XU9AKT'), family: 'Panasonic' },
  { model: evidence.models.find(model => model.indoorModel === 'CS-XU24AKT'), family: 'Panasonic' },
  ...['TURBO A.P.S-09', 'TURBO A.P.S-12', 'TURBO A.P.S-18', 'TURBO A.P.S-25', 'TURBO A.P.S-30', 'TURBO A.P.S-36', 'TURBO A.P.S-40', 'SWG-09', 'SWG-12', 'SWG-18', 'SWG-25'].map(sku => ({
    model: evidence.models.find(candidate => candidate.brandId === 'saijo-denki' && candidate.sku === sku), family: 'Saijo Denki',
  })),
  ...[
    ['42TGV0131CP', '38TGV0131A1'], ['42TGV0181CP', '38TGV0181A1'], ['42TGV0241CP', '38TGV0241A1'],
    ['42TGV0251CP', '38TGV0251A1'], ['42TGV0301CP', '38TGV0301A1'], ['42TGV0361CP', '38TGV0361A1'],
    ['42TGV0361CP', '38TGV0361A3'], ['42TGV0391CP', '38TGV0391A3'], ['42TGV0401CP', '38TGV0401A1'],
    ['42TGV0401CP', '38TGV0401A3'], ['42TGV0481CP', '38TGV0481A3'], ['42TGV0601CP', '38TGV0601A3'],
  ].map(([indoor, outdoor]) => ({ model: evidence.models.find(model => model.indoorModel === indoor && model.outdoorModel === outdoor), family: 'Carrier' })),
  ...[
    ['40TGV0131UP', '38TGV0131A1'], ['40TGV0361UP', '38TGV0361A3'],
    ['40TGV0401UP', '38TGV0401A3'], ['40TGV0601UP', '38TGV0601A3'],
  ].map(([indoor, outdoor]) => ({ model: evidence.models.find(model => model.indoorModel === indoor && model.outdoorModel === outdoor), family: 'Carrier' })),
  ...[
    ['42TGF0181CP', '38TGF0181A1'], ['42TGF0361CP', '38TGF0361A3'], ['42TGF0401CP', '38TGF0401A3'],
  ].map(([indoor, outdoor]) => ({ model: evidence.models.find(model => model.indoorModel === indoor && model.outdoorModel === outdoor), family: 'Carrier' })),
  ...[
    'SRK10YYM-W1', 'SRK10YYP-W1', 'SRK25ZSXS-W1', 'SRK10CYV-W1', 'SRK13YYM-W1',
    'SRK35ZSXS-W1', 'SRK13CYV-W1', 'SRK13YYP-W1', 'SRK15CYV-W1', 'SRK15YYM-W1',
    'SRK50ZSXS-W1', 'SRK18YYM-W1', 'SRK18CYV-W1', 'SRK60ZSXS-W1', 'SRK24YYM-W1',
    'SRK24CYV-W1', 'SRK90YA-W1', 'SRK100YA-W1',
  ].map(indoorModel => ({ model: evidence.models.find(candidate => candidate.indoorModel === indoorModel), family: 'Mitsubishi Heavy Duty' })),
];
const fhnqUiChecks = new Map([
  ['FHNQ13NV2S', ['RNQ13NV2S', 13600, '220 V / 1 Phase / 50 Hz', '195 × 1,160 × 680 mm (H × W × D)', '6.4 mm (Flare)', '12.7 mm (Flare)']],
  ['FHNQ18NV2S', ['RNQ18NV2S', 18000, '220 V / 1 Phase / 50 Hz', '195 × 1,400 × 680 mm (H × W × D)', '6.4 mm (Flare)', '12.7 mm (Flare)']],
  ['FHNQ24NV2S', ['RNQ24NV2S', 24000, '220 V / 1 Phase / 50 Hz', '195 × 1,400 × 680 mm (H × W × D)', '6.4 mm (Flare)', '15.9 mm (Flare)']],
  ['FHNQ30NV2S', ['RNQ30NY2S', 30000, '380 V / 3 Phase / 50 Hz', '195 × 1,590 × 680 mm (H × W × D)', '9.5 mm (Flare)', '15.9 mm (Flare)']],
  ['FHNQ36NV2S', ['RNQ36NY2S', 36000, '380 V / 3 Phase / 50 Hz', '260 × 1,844 × 680 mm (H × W × D)', '9.5 mm (Flare)', '15.9 mm (Flare)']],
]);
const nvaaUiChecks = new Map([
  ['42NVAA010', [9000, '3,300–9,500 BTU/h', 3.4, '300 × 715 × 200 mm (H × W × D)', '495 × 732 × 305 mm (H × W × D)', '6.35 mm (1/4 inch)', '9.52 mm (3/8 inch)', 20, 8, 10]],
  ['42NVAA013', [12000, '3,600–12,600 BTU/h', 5.1, '300 × 865 × 200 mm (H × W × D)', '495 × 732 × 305 mm (H × W × D)', '6.35 mm (1/4 inch)', '9.52 mm (3/8 inch)', 20, 8, 12]],
  ['42NVAA018', [18000, '7,200–19,000 BTU/h', 7.7, '320 × 972 × 225 mm (H × W × D)', '521 × 787 × 280 mm (H × W × D)', '6.35 mm (1/4 inch)', '12.70 mm (1/2 inch)', 20, 10, 12]],
  ['42NVAA024', [24500, '8,600–25,500 BTU/h', 10.5, '335 × 1,080 × 226 mm (H × W × D)', '702 × 841 × 382 mm (H × W × D)', '9.52 mm (3/8 inch)', '15.88 mm (5/8 inch)', 25, 10, 24]],
]);
const mideaUiChecks = new Map([
  ['MSCE-10CRFN8-ID', [9360, '17.88', '3.18 W/W', '830 W', '3.61 A', '723 × 199 × 286 mm (W × D × H)', '668 × 252 × 469 mm (W × D × H)', '7.2 kg', '16.9 kg', 'R32', '0.36 kg']],
  ['MSCE-13CRFN8-ID', [12000]],
  ['MSCE-19CRFN8-ID', [18000]],
  ['MSCE-25CRFN8-ID', [24000]],
]);
const mideaAgUiChecks = new Map([
  ['MSAG-09CRN8-IDU', [9300, 'MSAG-09CRN8-ODU', /energy-saving modes 50% \/ 75% \/ 100%/]],
  ['MSAG-12CRN8-IDU', [12300, 'MSAG-12CRN8-ODU', /Bio HEPA Filter/]],
  ['MSAG-18CRN8-IDU', [18200, 'MSAG-18CRN8-ODU', /Bio HEPA Filter/]],
  ['MSAG-24CRN8-IDU', [25000, 'MSAG-24CRN8-ODU', /Bio HEPA Filter/]],
]);
assert.ok(verifiedExamples.every(example => example.model), 'an exact Carrier model and an exact Daikin model should be available for A/B/C UI coverage');
const selectedSkus = new Set((process.env.MODEL_EVIDENCE_UI_SKUS || '').split(',').map(value => value.trim()).filter(Boolean).map(normalize));
const examplesToRun = selectedSkus.size
  ? verifiedExamples.filter(example => selectedSkus.has(normalize(example.model.sku)))
  : verifiedExamples;
assert.ok(examplesToRun.length > 0, 'the focused UI test filter should select at least one verified model');

const browser = await launch();
const pagePool = new Map();
try {
  for (const { model: verifiedExample, family } of examplesToRun) {
    const listedProduct = catalog.prods.find(item => item[0] === verifiedExample.type && normalize(item[1]) === normalize(verifiedExample.brand) && normalize(item[2]) === normalize(verifiedExample.sku));
    assert.ok(listedProduct, `${family} exact OEM evidence should match the site catalog SKU`);
    for (const variant of ['a', 'b', 'c']) {
      for (const width of [1365, 390]) {
      const pageKey = `${variant}:${width}`;
      let page = pagePool.get(pageKey);
      if (!page) {
        page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 920 } });
        pagePool.set(pageKey, page);
      }
      const errors = [];
      const onPageError = error => errors.push(error.message);
      page.on('pageerror', onPageError);
      await page.goto(`${BASE}/${variant}.html#shop`, { waitUntil: 'commit' });
      await page.waitForFunction(() => {
        const grid = document.querySelector('[data-cat-grid]');
        return Boolean(grid?.children.length && !grid.querySelector('.skel'));
      }, null, { timeout: 120000 });
      const search = page.locator('[data-cat-search]');
      await search.fill(verifiedExample.sku);
      await page.waitForTimeout(350);
      const card = variant === 'b'
        ? page.locator('[data-cat-grid] tr').filter({ hasText: verifiedExample.sku }).first()
        : page.locator('[data-cat-grid] article.card').first();
      await card.waitFor({ state: 'visible', timeout: 20000 });
      if (verifiedExample.indoorModel === '40TGEV0361UP' && variant !== 'b') {
        assert.equal(await card.locator('.bchip').count(), 1, 'searching the exact indoor/outdoor SKU pair should hide phase-ambiguous siblings');
      }
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
      if (manufacturerBtu && manufacturerBtu !== listedProduct[3]) assert.match(panelText, /Pricebook/);
      else assert.match(panelText, /ราคาเครื่องและอัตราติดตั้งยังยึดข้อมูลบริษัท/);
      assert.match(panelText, /ข้อมูลจาก.*ตรวจตรงรุ่น/);
      if (family === 'Saijo Denki') {
        for (const key of ['indoorModel', 'outdoorModel', 'power', 'indoorDimReported', 'outdoorDimReported', 'mainsCable']) {
          assert.ok(panelText.includes(String(verifiedExample.fields[key].value)), `Saijo evidence panel should display ${key} for ${verifiedExample.sku}`);
        }
        for (const key of ['ratedInputW', 'seer', 'indoorAirflowCfm', 'outdoorAirflowCfm', 'pipeLiquid', 'pipeGas']) {
          const rawValue = verifiedExample.fields[key].value;
          const displayedValue = typeof rawValue === 'number' ? rawValue.toLocaleString('en-US') : String(rawValue);
          assert.ok(panelText.includes(displayedValue), `Saijo evidence panel should display ${key} for ${verifiedExample.sku}`);
        }
        assert.match(panelText, /2021 \(M9\)/, 'the source edition must be visible to customers reviewing the specification');
        assert.doesNotMatch(panelText, /พิกัดเซอร์กิตเบรกเกอร์/, 'no unsupported breaker specification should be displayed');
      } else if (family === 'TCL') {
        assert.ok(panelText.includes(verifiedExample.indoorModel), 'the exact indoor/product model code should be visible');
        assert.ok(panelText.includes(String(verifiedExample.fields.series.value)), 'the exact product family should be visible');
        assert.ok(panelText.includes(String(verifiedExample.fields.power.value)), 'the manufacturer phase and supply location should be visible');
        assert.ok(panelText.includes(String(verifiedExample.fields.interconnectCable.value)), 'the separately specified connecting wiring should be visible');
        assert.match(panelText, /Connecting Wiring.*ไม่ใช่จำนวนเฟส/);
        assert.match(panelText, /ผู้ผลิตระบุ/);
        assert.ok(panelText.includes(String(verifiedExample.fields.indoorDimReported.value)), 'the indoor dimensions must retain the manufacturer axis order');
        if (verifiedExample.fields.powerCord) assert.ok(panelText.includes(String(verifiedExample.fields.powerCord.value)), 'factory power cord must be labeled separately from field cable');
        assert.doesNotMatch(panelText, /ระบุ 3 เฟส|สายไฟเมน.*(?:4 ×|3 ×)/, 'phase and cord/core count must not be presented as equivalent');
        assert.match(panelText, /ไม่แสดงพิกัดเบรกเกอร์/);
      } else if (family === 'Daikin' && verifiedExample.indoorModel.startsWith('FHFC')) {
        assert.match(panelText, new RegExp(verifiedExample.fields.btu.value.toLocaleString('en-US')));
        assert.match(panelText, verifiedExample.fields.power.value.includes('3 Phase') ? /380 V \/ 3 Phase \/ 50 Hz/ : /220 V \/ 1 Phase \/ 50 Hz/);
        const seerText = String(verifiedExample.fields.seer.value);
        assert.ok(panelText.includes(seerText) || panelText.includes(verifiedExample.fields.seer.value.toFixed(2)), 'SEER display may omit a trailing zero but must preserve the rated value');
        assert.match(panelText, /mm \(H × W × D\)/);
        assert.ok(panelText.includes(verifiedExample.fields.indoorModel.value));
        assert.ok(panelText.includes(verifiedExample.fields.outdoorModel.value));
        assert.ok(panelText.includes(String(verifiedExample.fields.pipeLiquid.value)));
        assert.ok(panelText.includes(String(verifiedExample.fields.pipeGas.value)));
        assert.match(panelText, /ข้อมูลจาก.*ตรวจตรงรุ่น/);
        assert.doesNotMatch(panelText, /พิกัดเซอร์กิตเบรกเกอร์/);
      } else if (family === 'Carrier' && verifiedExample.indoorModel.startsWith('40TGEV')) {
        assert.match(panelText, /36,100/);
        assert.match(panelText, /10\.6 kW/);
        assert.match(panelText, /380V \/ 3Ph \/ 50Hz/);
        assert.match(panelText, /5\.85 A/);
        assert.match(panelText, /256\s[x×]\s840\s[x×]\s840/);
        assert.match(panelText, /890\s[x×]\s900\s[x×]\s320/);
        assert.match(panelText, /13,600–38,200/);
        assert.match(panelText, /35 g\/m/);
        assert.match(panelText, /ไม่ระบุจำนวนสายตัวนำ ขนาดสายไฟเมนหรือสายเชื่อม และพิกัดเบรกเกอร์/);
      } else if (family === 'Carrier' && verifiedExample.indoorModel.startsWith('42TGEV')) {
        assert.match(panelText, /40,200/);
        assert.match(panelText, /11\.8 kW/);
        assert.match(panelText, /380V \/ 3Ph \/ 50Hz/);
        assert.match(panelText, /6\.55 A/);
        assert.match(panelText, /7\.5 A/);
        assert.match(panelText, /235\s[x×]\s1,586\s[x×]\s690/);
        assert.match(panelText, /4 × 1\.5 mm²/);
        assert.match(panelText, /70 m/);
        assert.match(panelText, /คอยล์เย็นรับไฟจากคอยล์ร้อน/);
        assert.match(panelText, /ไม่ระบุจำนวนสายตัวนำ ขนาดสายไฟเมนหรือสายเชื่อม และพิกัดเบรกเกอร์/);
      } else if (family === 'Carrier' && verifiedExample.indoorModel.startsWith('40TGV')) {
        const cassetteExpectations = new Map([
          ['40TGV0131UP|38TGV0131A1', ['13,300', '220V / 1Ph / 50Hz', '4.05 A', 256, 550, 780, 290, '1/4', '1/2', 3, 20, 0.7]],
          ['40TGV0361UP|38TGV0361A3', ['36,100', '380V / 3Ph / 50Hz', '5.25 A', 319, 890, 900, 320, '3/8', '5/8', 5, 35, 1.2]],
          ['40TGV0401UP|38TGV0401A3', ['40,200', '380V / 3Ph / 50Hz', '5.5 A', 319, 890, 900, 320, '3/8', '5/8', 5, 35, 1.4]],
          ['40TGV0601UP|38TGV0601A3', ['60,700', '380V / 3Ph / 50Hz', '9.60 A', 319, 1340, 900, 320, '3/8', '3/4', 5, 35, 1.5]],
        ]);
        const [btu, power, current, indoorHeight, outdoorHeight, outdoorWidth, outdoorDepth, liquid, gas, minPipe, extraCharge, refrigerantCharge] = cassetteExpectations.get(`${verifiedExample.indoorModel}|${verifiedExample.outdoorModel}`);
        assert.match(panelText, new RegExp(btu));
        assert.match(panelText, new RegExp(power));
        assert.match(panelText, new RegExp(current.replace('.', '\\.')));
        assert.match(panelText, new RegExp(`${indoorHeight} mm`));
        assert.match(panelText, /840 mm/);
        assert.match(panelText, /950 mm/);
        assert.match(panelText, new RegExp(`${outdoorHeight} mm`));
        assert.match(panelText, new RegExp(`${outdoorWidth} mm`));
        assert.match(panelText, new RegExp(`${outdoorDepth} mm`));
        assert.match(panelText, new RegExp(`${liquid} นิ้ว`));
        assert.match(panelText, new RegExp(`${gas} นิ้ว`));
        assert.match(panelText, new RegExp(`${minPipe} m`));
        assert.match(panelText, /50 m/);
        assert.match(panelText, /30 m/);
        assert.match(panelText, /15 m/);
        assert.match(panelText, new RegExp(`${extraCharge} g/m`));
        assert.match(panelText, new RegExp(`${refrigerantCharge} kg`));
        assert.match(panelText, /O\.D\. 32 mm/);
        assert.match(panelText, /ไม่ระบุจำนวนสายตัวนำ ขนาดสายไฟเมนหรือสายเชื่อม และพิกัดเบรกเกอร์/);
      } else if (verifiedExample.indoorModel === 'FTM09PV2S') {
        assert.match(panelText, /2\.7 kW/);
        assert.match(panelText, /730 W/);
        assert.match(panelText, /220 V \/ 50 Hz/);
        assert.match(panelText, /283 × 770 × 223 mm \(H × W × D\)/);
        assert.match(panelText, /770 mm/);
        assert.match(panelText, /283 mm/);
        assert.match(panelText, /ไม่ได้ระบุจำนวนเฟส/);
      } else if (verifiedExample.indoorModel === 'FTKZ09YV2S5') {
        assert.match(panelText, /9,200/);
        assert.match(panelText, /3,400–12,300/);
        assert.match(panelText, /25\.8/);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /299 × 920 × 275 mm \(H × W × D\)/);
        assert.match(panelText, /Ø 12\.7 mm \(1\/2 inch\)/);
      } else if (verifiedExample.indoorModel === 'FAVF30XV2S') {
        assert.match(panelText, /30,000/);
        assert.match(panelText, /7,850–32,700/);
        assert.match(panelText, /18\.3/);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /329 × 1,240 × 278 mm \(H × W × D\)/);
        assert.doesNotMatch(panelText, /ratedCurrentA|breakerA/);
      } else if (verifiedExample.indoorModel === 'FVGR10QV2S') {
        assert.match(panelText, /99,000 BTU\/h/);
        assert.match(panelText, /380 V \/ 3 Phase \/ 50 Hz/);
        assert.match(panelText, /R410A/);
        assert.match(panelText, /1,870 × 1,170 × 510 mm \(H × W × D\)/);
        assert.match(panelText, /1,657 × 930 × 765 mm \(H × W × D\)/);
        assert.match(panelText, /ระยะท่อเทียบเท่าสูงสุดตามผู้ผลิต/);
        assert.match(panelText, /90 m/);
        assert.match(panelText, /50 m/);
      } else if (verifiedExample.indoorModel.startsWith('FHNQ')) {
        const [outdoorModel, btu, power, indoorDimensions, liquidPipe, gasPipe] = fhnqUiChecks.get(verifiedExample.indoorModel);
        assert.match(panelText, new RegExp(`${verifiedExample.indoorModel}.*${outdoorModel}`));
        assert.match(panelText, new RegExp(`${btu.toLocaleString('en-US')} BTU/h`));
        assert.match(panelText, /Fixed Speed/i);
        assert.ok(panelText.includes(power));
        assert.match(panelText, /R-410A/);
        assert.ok(panelText.includes(indoorDimensions));
        assert.ok(panelText.includes(liquidPipe));
        assert.ok(panelText.includes(gasPipe));
        assert.match(panelText, /ไม่ระบุจำนวนสายตัวนำ ขนาดสายไฟเมน\/สายเชื่อม หรือพิกัดเบรกเกอร์/);
      } else if (verifiedExample.indoorModel.startsWith('42NVAA')) {
        const [btu, range, current, indoorDimensions, outdoorDimensions, liquidPipe, gasPipe, maxPipe, maxLift, chargeRate] = nvaaUiChecks.get(verifiedExample.indoorModel);
        assert.match(panelText, new RegExp(`${verifiedExample.indoorModel}.*38NVAA${verifiedExample.indoorModel.slice(-3)}`));
        assert.match(panelText, new RegExp(`${btu.toLocaleString('en-US')} BTU/h`));
        assert.ok(panelText.includes(range));
        assert.match(panelText, /Inverter/i);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, new RegExp(`${current} A`));
        assert.match(panelText, /R32/);
        assert.ok(panelText.includes(indoorDimensions));
        assert.ok(panelText.includes(outdoorDimensions));
        assert.ok(panelText.includes(liquidPipe));
        assert.ok(panelText.includes(gasPipe));
        assert.ok(panelText.includes(`${maxPipe} m`));
        assert.ok(panelText.includes(`${maxLift} m`));
        assert.ok(panelText.includes(`7 m`));
        assert.ok(panelText.includes(`${chargeRate} g/m`));
        assert.match(panelText, /ไม่ระบุเส้นทางจ่ายไฟ จำนวนสาย ขนาดสายเมน\/สายเชื่อม หรือพิกัดเบรกเกอร์/);
      } else if (family === 'Midea') {
        assert.match(panelText, /สีขาว/);
        if (verifiedExample.indoorModel.startsWith('MSCE-')) {
          const [btu, seer, eer, watts, amps, indoorDims, outdoorDims, indoorKg, outdoorKg, refrigerant, charge] = mideaUiChecks.get(verifiedExample.indoorModel);
          assert.match(panelText, new RegExp(`${btu.toLocaleString('en-US')} BTU/h`));
          assert.match(panelText, /Celest Inverter/);
          assert.match(panelText, /Inverter/i);
          assert.match(panelText, /SMART MASTER/);
          assert.match(panelText, /ECO MASTER/);
          assert.match(panelText, /Prime Guard/);
          assert.match(panelText, /COOL FLASH/);
          assert.match(panelText, /I-Clean/);
          if (verifiedExample.indoorModel === 'MSCE-10CRFN8-ID') {
            for (const exactValue of [seer, eer, watts, amps, indoorDims, outdoorDims, indoorKg, outdoorKg, refrigerant, charge]) assert.ok(panelText.includes(exactValue), `Midea model detail should display ${exactValue}`);
          }
        } else {
          const [btu, outdoorModel, feature] = mideaAgUiChecks.get(verifiedExample.indoorModel);
          assert.match(panelText, new RegExp(`${btu.toLocaleString('en-US')} BTU/h`));
          assert.match(panelText, /TORNADO EASY/);
          assert.match(panelText, /Fixed Speed/i);
          assert.match(panelText, new RegExp(`${verifiedExample.indoorModel}.*${outdoorModel}`));
          assert.match(panelText, /Cold Catalyst filter/);
          assert.match(panelText, /3D Air Flow/);
          assert.match(panelText, /Self-Cleaning/);
          assert.match(panelText, feature);
        }
        assert.match(panelText, /ไม่ได้ระบุแรงดันไฟฟ้า เฟส ความถี่ จำนวนสาย ขนาดสายเมน\/สายเชื่อม หรือพิกัดเบรกเกอร์/);
      } else if (verifiedExample.indoorModel === 'FCFC36EV2S') {
        assert.match(panelText, /36,000/);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /298 × 840 × 840 mm \(H × W × D\)/);
        assert.match(panelText, /Supply from Outdoor/);
      } else if (verifiedExample.indoorModel === 'FCF36DV2S') {
        assert.match(panelText, /36,230/);
        assert.match(panelText, /RZF36DV2S.*1 เฟส.*RZF36DY2S.*3 เฟส/);
        assert.match(panelText, /ไม่มีรหัสคอยล์ร้อน/);
      } else if (verifiedExample.indoorModel === 'TAC-PRO09PE') {
        assert.match(panelText, /2,730–10,240 BTU\/h/);
        assert.match(panelText, /4 ดาว/);
        assert.match(panelText, /ไม่ได้ระบุจำนวนเฟส/);
      } else if (family === 'Carrier' && verifiedExample.indoorModel.startsWith('42TGV')) {
        assert.match(panelText, new RegExp(`${manufacturerBtu.toLocaleString('en-US')} BTU/h`));
        assert.match(panelText, /220V \/ 1Ph \/ 50Hz|380V \/ 3Ph \/ 50Hz/);
        assert.match(panelText, /ไม่ระบุจำนวนสายตัวนำ ขนาดสายไฟเมนหรือสายเชื่อม และพิกัดเบรกเกอร์/);
        assert.match(panelText, /XPower TGV/);
        assert.match(panelText, /R32/);
        assert.match(panelText, /15 m/);
      } else if (family === 'Carrier' && verifiedExample.indoorModel.startsWith('42TGF')) {
        assert.match(panelText, new RegExp(`${manufacturerBtu.toLocaleString('en-US')} BTU/h`));
        assert.match(panelText, /220V \/ 1 Ph \/ 50Hz|380V \/ 3 Ph \/ 50Hz/);
        assert.match(panelText, /12\.(?:43|94)/);
        assert.match(panelText, /R32/);
        assert.match(panelText, /ไม่ระบุจำนวนสายตัวนำ ขนาดสายไฟเมนหรือสายเชื่อม และพิกัดเบรกเกอร์/);
      } else if (family === 'Carrier' && /^(42TSAA|42NSAA)/.test(verifiedExample.indoorModel)) {
        assert.match(panelText, new RegExp(`${manufacturerBtu.toLocaleString('en-US')} BTU/h`));
        assert.match(panelText, /Copper 7 \(TSAA\)|TECH S \(NSAA\)/);
        assert.match(panelText, /R32/);
        assert.match(panelText, /ไม่ระบุจำนวนสายตัวนำ ขนาดสายไฟเมนหรือสายเชื่อม และพิกัดเบรกเกอร์/);
      } else if (family === 'Carrier') {
        assert.match(panelText, /21,000/);
        assert.match(panelText, /6,100–21,800/);
        assert.match(panelText, /9\.4 A/);
        assert.match(panelText, /220V \/ 1 Ph \/ 50Hz/);
        assert.match(panelText, /320\s[x×]\s1050\s[x×]\s250/);
        assert.match(panelText, /12\.7 mm/);
      } else if (['FHA13BV2S', 'FHA18BV2S', 'FHA24BV2S'].includes(verifiedExample.indoorModel)) {
        assert.match(panelText, /ข้อมูลจากทะเบียน มอก\.ที่ตรวจตรงรุ่น/);
        assert.match(panelText, new RegExp(verifiedExample.outdoorModel));
        assert.match(panelText, /ความสามารถทำความเย็นรวมสุทธิตามทะเบียน มอก\./);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /กำลังไฟฟ้าเข้าที่กำหนด/);
        assert.match(panelText, /RZF13CV2S|RZF18CV2S|RZF24CV2S/);
      } else if (verifiedExample.indoorModel === 'FTKB24ZV2S') {
        assert.match(panelText, /20,500/);
        assert.match(panelText, /6(?:\.0)? kW/);
        assert.match(panelText, /5,160 kcal\/h/);
        assert.match(panelText, /9\.3 A/);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /285\s[x×]\s770\s[x×]\s226/);
        assert.match(panelText, /595\s[x×]\s845\s[x×]\s300/);
        assert.match(panelText, /12\.7 mm/);
        assert.match(panelText, /R32/);
      } else if (verifiedExample.indoorModel === 'FTKZ09VV2S') {
        assert.match(panelText, /8,500/);
        assert.match(panelText, /4,100–12,300/);
        assert.match(panelText, /24\.7/);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /300\s[x×]\s920\s[x×]\s240/);
        assert.match(panelText, /550\s[x×]\s675\s[x×]\s284/);
        assert.match(panelText, /R32/);
        assert.match(panelText, /Pricebook/);
      } else if (verifiedExample.indoorModel === 'FTKQ24XV2S') {
        assert.match(panelText, /20,500/);
        assert.match(panelText, /3,800–20,800/);
        assert.match(panelText, /17\.49/);
        assert.match(panelText, /9(?:\.0)? A/);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /285\s[x×]\s770\s[x×]\s226/);
        assert.match(panelText, /595\s[x×]\s845\s[x×]\s300/);
        assert.match(panelText, /Ø5\/8 นิ้ว/);
        assert.match(panelText, /1\/2 นิ้ว/);
        assert.match(panelText, /R32/);
        assert.match(panelText, /Pricebook/);
      } else if (verifiedExample.indoorModel === 'FCFC42EV2S') {
        assert.match(panelText, /42,000/);
        assert.match(panelText, /380V \/ 3Phase \/ 50Hz/);
        assert.match(panelText, /298\s[x×]\s840\s[x×]\s840/);
        assert.match(panelText, /990\s[x×]\s940\s[x×]\s320/);
        assert.match(panelText, /9\.5 mm/);
        assert.match(panelText, /15\.9 mm/);
      } else if (verifiedExample.indoorModel === 'FCF24DV2S') {
        assert.match(panelText, /24,230/);
        assert.match(panelText, /220V \/ 1 Phase \/ 50Hz/);
        assert.match(panelText, /256\s[x×]\s840\s[x×]\s840/);
        assert.match(panelText, /595\s[x×]\s845\s[x×]\s300/);
        assert.match(panelText, /9\.5 mm/);
        assert.match(panelText, /15\.9 mm/);
      } else if (verifiedExample.indoorModel === 'PLY-SM13EA4') {
        assert.match(panelText, /13,989/);
        assert.match(panelText, /26\.37/);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /258 × 840 × 840 mm/);
        assert.match(panelText, /6\.35 mm \(1\/4 in\)/);
        assert.match(panelText, /12\.70 mm \(1\/2 in\)/);
        assert.match(panelText, /3 เส้น × 1\.5 mm²/);
        assert.match(panelText, /สายดินแยก 1 เส้น/);
        assert.match(panelText, /45 m/);
        assert.match(panelText, /Pricebook/);
      } else if (verifiedExample.indoorModel === 'PLY-SM36EA4') {
        assert.match(panelText, /36,167/);
        assert.match(panelText, /22\.28/);
        assert.match(panelText, /298 × 840 × 840 mm/);
        assert.match(panelText, /รหัสรุ่นในรายการเว็บไซต์ยังไม่ระบุเฟส/);
        assert.doesNotMatch(panelText, /220 V \/ 1 Phase \/ 50 Hz|380 V \/ 3 Phase \/ 50 Hz/);
        assert.match(panelText, /Pricebook/);
      } else if (verifiedExample.indoorModel === 'PLY-M36EA2') {
        assert.match(panelText, /36,167/);
        assert.match(panelText, /16\.49/);
        assert.match(panelText, /298 × 840 × 840 mm/);
        assert.match(panelText, /รหัสรุ่นในรายการเว็บไซต์ยังไม่ระบุเฟส/);
        assert.doesNotMatch(panelText, /220 V \/ 1 Phase \/ 50 Hz|380 V \/ 3 Phase \/ 50 Hz/);
        assert.match(panelText, /Pricebook/);
      } else if (verifiedExample.indoorModel === 'FTKF24WV2S') {
        assert.match(panelText, /ข้อมูลจากทะเบียน มอก\.ที่ตรวจตรงรุ่น/);
        assert.match(panelText, /RKF24WV2S/);
        assert.match(panelText, /6 kW/);
        assert.match(panelText, /อัตราส่วนประสิทธิภาพพลังงานตามทะเบียน มอก\./);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /1,930 W/);
        assert.match(panelText, /ควรยืนยันความจุก่อนสั่งซื้อ/);
        assert.match(panelText, /Pricebook.*24,200 BTU\/h/s);
      } else if (verifiedExample.sku === 'PLY-M24EA/TH-SUY-M24VA-TH') {
        assert.match(panelText, /ข้อมูลจากเอกสารผู้ผลิตและทะเบียน มอก\.ที่ตรวจตรงรุ่น/);
        assert.match(panelText, /PLY-M24EA-TH\.TH/);
        assert.match(panelText, /SUY-M24VA-TH\.TH/);
        assert.match(panelText, /7\.1 kW/);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /1,900 W/);
        assert.match(panelText, /258 × 840 × 840 mm \(H × W × D\)/);
        assert.match(panelText, /25,249 BTU\/h/);
        assert.match(panelText, /ควรยืนยันค่าพิกัดกับผู้จำหน่ายก่อนสั่งซื้อ/);
        assert.match(panelText, /3 เส้น × 1\.5 mm²/);
        assert.match(panelText, /ไม่ยืนยันขนาดสายเมนหรือพิกัดเบรกเกอร์/);
      } else if (verifiedExample.sku === 'PLY-M36EA/TH-SUY-M36VA-TH') {
        assert.match(panelText, /ข้อมูลจากเอกสารผู้ผลิตและทะเบียน มอก\.ที่ตรวจตรงรุ่น/);
        assert.match(panelText, /PLY-M36EA-TH\.TH/);
        assert.match(panelText, /SUY-M36VA-TH\.TH/);
        assert.match(panelText, /10\.6 kW/);
        assert.match(panelText, /220 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /3,140 W/);
        assert.match(panelText, /298 × 840 × 840 mm \(H × W × D\)/);
        assert.match(panelText, /แผงหน้ากาก/);
        assert.match(panelText, /950 mm/);
        assert.match(panelText, /R32/);
        assert.match(panelText, /3 เส้น × 1\.5 mm²/);
        assert.match(panelText, /สายดิน.*แยก 1 เส้น × ไม่น้อยกว่า 1\.5 mm²/);
        assert.match(panelText, /VP25/);
        assert.match(panelText, /Ø32 mm/);
        assert.match(panelText, /ไม่ยืนยันขนาดสายเมนหรือพิกัดเบรกเกอร์/);
      } else if (verifiedExample.indoorModel === 'MSY-AW09VF') {
        assert.match(panelText, /220 V \/ 50 Hz/);
        assert.match(panelText, /10 A/);
        assert.match(panelText, /3 แกน × 1\.0 ตร\.มม\./);
        assert.match(panelText, /4 แกน × 1\.0 ตร\.มม\./);
        assert.match(panelText, /305 × 998 × 247 มม\./);
        assert.match(panelText, /6\.35 มม\. \(1\/4 นิ้ว\)/);
        assert.match(panelText, /9\.52 มม\. \(3\/8 นิ้ว\)/);
        assert.match(panelText, /0\.605 kg/);
        assert.match(panelText, /20 m/);
        assert.match(panelText, /12 m/);
        assert.doesNotMatch(panelText, /เฟส 1|1 Phase/i);
      } else if (verifiedExample.indoorModel === 'MSY-GZ24VF') {
        assert.match(panelText, /22,519/);
        assert.match(panelText, /6\.6 kW/);
        assert.match(panelText, /1\.8–7\.2 kW/);
        assert.match(panelText, /22\.06/);
        assert.match(panelText, /3 ดาว/);
        assert.match(panelText, /220 V \/ Single Phase \/ 50 Hz/);
        assert.match(panelText, /325 × 1100 × 266 มม\./);
        assert.match(panelText, /880 × 840 × 330 มม\./);
        assert.match(panelText, /1\/2 นิ้ว/);
        assert.match(panelText, /R32/);
        assert.match(panelText, /Pricebook/);
      } else if (family === 'Panasonic' && verifiedExample.indoorModel.startsWith('CS-YN')) {
        assert.match(panelText, new RegExp(`${manufacturerBtu.toLocaleString('en-US')} BTU/h`));
        assert.match(panelText, /Eco Non-Inverter YN Series/);
        assert.match(panelText, /220 V \/ 50 Hz/);
        assert.match(panelText, /ไม่ระบุจำนวนเฟสหรือจำนวนแกนสายไฟ/);
        assert.match(panelText, /R32/);
        assert.match(panelText, /13\.\d+/);
        assert.match(panelText, /Indoor unit|Model คอยล์เย็น|CS-YN/);
        assert.match(panelText, /ท่อ Gas|ท่อแก๊ส|15\.9 mm|12\.7 mm|9\.52 mm/);
        assert.match(panelText, /2025 catalogue|2025 catalogue/);
        assert.match(panelText, /ไม่เปลี่ยนราคาเครื่องหรืออัตราบริการ/);
      } else if (family === 'Panasonic' && verifiedExample.indoorModel.startsWith('CS-YU')) {
        assert.match(panelText, new RegExp(verifiedExample.indoorModel));
        assert.match(panelText, new RegExp(verifiedExample.outdoorModel));
        assert.match(panelText, /Standard Inverter/);
        assert.match(panelText, /YU Series \(ZKT\)/);
        assert.match(panelText, /220–240 V \/ 1 Phase \/ 50 Hz/);
        assert.match(panelText, /กำลังไฟฟ้าขาเข้า/);
        assert.match(panelText, /R32/);
        assert.match(panelText, /Pricebook/);
        assert.match(panelText, /ไม่เปลี่ยนราคาเครื่องหรืออัตราบริการ/);
      } else if (family === 'Panasonic') {
        assert.match(panelText, new RegExp(verifiedExample.indoorModel));
        assert.match(panelText, new RegExp(verifiedExample.outdoorModel));
        assert.match(panelText, new RegExp(`${manufacturerBtu.toLocaleString('en-US')} BTU/h`));
        assert.match(panelText, /Premium nanoe Inverter XU Series \(AKT\)/);
        assert.match(panelText, /R32/);
        assert.match(panelText, /Pricebook/);
      } else if (family === 'Mitsubishi Heavy Duty') {
        assert.match(panelText, new RegExp(verifiedExample.indoorModel));
        assert.match(panelText, verifiedExample.fields.inverter.value ? /Inverter/ : /Fixed speed/);
        if (verifiedExample.indoorModel.endsWith('YYM-W1')) {
          assert.match(panelText, /Haru/);
          assert.match(panelText, /220–240 V \/ 1 Phase \/ 50 Hz/);
          assert.match(panelText, /R32/);
          assert.match(panelText, /SRC\d+YYM-W1/);
          assert.match(panelText, /SEER/);
          assert.match(panelText, /BTU\/h/);
          assert.match(panelText, /ท่อ Gas/);
          assert.match(panelText, /คอยล์เย็น/);
        }
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
      await page.locator('#drawer [data-close]').click();
      page.off('pageerror', onPageError);
      await page.goto('about:blank', { waitUntil: 'commit' });
      await page.close();
      pagePool.delete(pageKey);
      console.log(`model-evidence-ui: PASS ${variant.toUpperCase()} ${width}px`);
      }
    }
  }
} finally {
  await browser.close();
}
