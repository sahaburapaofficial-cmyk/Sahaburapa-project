import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidencePath = path.join(root, 'assets', 'model-evidence.json');

assert.ok(fs.existsSync(evidencePath), 'verified model-evidence index should be shipped with the catalog');

const site = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'sbp-data.json'), 'utf8'));
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const normalize = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const exactPair = (sku, product) => {
  const published = normalize(sku);
  const indoor = normalize(product.indoorModel);
  const outdoor = normalize(product.outdoorModel);
  if (product.pairMatchMethod === 'TISI_THAI_COUNTRY_SUFFIX') {
    const stripRepeatedThaiSuffix = value => value.replace(/TH$/, '');
    return Boolean(outdoor) && published === `${stripRepeatedThaiSuffix(indoor)}${stripRepeatedThaiSuffix(outdoor)}`;
  }
  if (product.pairMatchMethod === 'PANASONIC_MODEL_SUFFIX') {
    return Boolean(outdoor) && published === indoor.replace(/^CS/, '') && published === outdoor.replace(/^CU/, '');
  }
  if (product.pairMatchMethod === 'DAIKIN_OFFICIAL_PRODUCT_COMPARE_EXACT_PAIR') {
    return Boolean(outdoor) && published === indoor + outdoor && product.sourceModelName === `${product.indoorModel}/${product.outdoorModel}`;
  }
  if (product.pairMatchMethod === 'SAIJO_OFFICIAL_FAMILY_SIZE') {
    const turboSize = published.match(/^TURBOAPS(09|12|18|25|30|36|40)$/)?.[1];
    const smartSize = published.match(/^SWG(09|12|18|25)$/)?.[1];
    if (turboSize) {
      return product.sourceModelName === `TURBO APS R32-${turboSize}`
        && indoor === `FS${turboSize}TURBO32SW1`
        && outdoor === `${Number(turboSize) >= 30 ? 'CS' : 'CE'}${turboSize}TURBO32SW1`;
    }
    if (smartSize) {
      return product.sourceModelName === `SMART COOL R32-${smartSize}`
        && indoor === `FE${smartSize}SUPER32SWG1`
        && outdoor === `CE${smartSize}SUPER32SWG1`;
    }
    return false;
  }
  return published === indoor || (outdoor && (published === indoor + outdoor || published === outdoor + indoor));
};

assert.equal(evidence.schema, 'sbp-model-evidence-v1');
assert.equal(evidence.sources.length, 159, 'all retained source revisions should remain available in the evidence index');
assert.equal(evidence.models.length, 339, 'only exact, source-hash-verified, recently checked models with secure source links should be included');
assert.equal(evidence.provenance.matchedExactModels, evidence.models.length, 'provenance model count must track the evidence index');
assert.equal(evidence.provenance.verifiedFieldValues, evidence.models.reduce((count, model) => count + Object.keys(model.fields || {}).length, 0), 'provenance field count must track the evidence index');
assert.equal(evidence.provenance.verifiedFieldValues, 7547, 'verified field count should include exact Saijo, Daikin, and TCL fields');
assert.equal(new Set(evidence.models.map(model => `${model.brandId}|${model.type}|${normalize(model.sku)}`)).size, evidence.models.length, 'model evidence keys must be unique');
assert.equal(evidence.provenance.currentSiteCatalogSha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'assets', 'sbp-data.json'))).digest('hex'), 'evidence must declare the catalog snapshot it was matched against');
const tclApiSources = evidence.sources.filter(source => source.captureFile?.startsWith('docs/evidence/tcl-2026-10-16/'));
assert.equal(tclApiSources.length, 12, 'all 12 exact-model TCL API responses should be retained as source captures');
for (const source of tclApiSources) {
  const capture = fs.readFileSync(path.join(root, source.captureFile));
  assert.equal(crypto.createHash('sha256').update(capture).digest('hex'), source.sha256, `${source.sourceId} raw API snapshot must match its retained SHA-256`);
  assert.equal(JSON.parse(capture.toString('utf8')).code, 200, `${source.sourceId} capture must be a successful official response`);
  assert.match(source.captureHref, /^https:\/\/www\.tcl\.com\//, `${source.sourceId} should retain the exact official JSON endpoint`);
}

const siteRows = site.prods.map(row => ({ type: row[0], brand: row[1], sku: row[2], btu: row[3], price: row[4] }));
let ratedCapacityCount = 0, dimensionCompleteCount = 0, pricebookBandDifferences = 0;
for (const model of evidence.models) {
  const row = siteRows.find(candidate => candidate.type === model.type && normalize(candidate.brand) === normalize(model.brand) && normalize(candidate.sku) === normalize(model.sku));
  assert.ok(row, `evidence must map to a live catalog row: ${model.brand} ${model.sku}`);
  assert.equal(model.retailPrice, undefined, 'retailer price must not enter company catalog data');
  assert.equal(model.companyPrice, undefined, 'manufacturer evidence must not override company Pricebook price');
  assert.ok(model.fields && Object.keys(model.fields).length > 0);
  assert.ok(exactPair(model.sku, model), `indoor/outdoor codes must match the catalog SKU: ${model.sku}`);
  if (Number.isFinite(model.fields.btu?.value)) {
    ratedCapacityCount++;
    if (row.btu !== model.fields.btu.value) pricebookBandDifferences++;
  }
  if (['indoorWidth', 'indoorHeight', 'indoorDepth'].every(key => model.fields[key]?.exactModel === true)) dimensionCompleteCount++;
  for (const [key, field] of Object.entries(model.fields)) {
    assert.equal(typeof field.label, 'string', `${model.sku}.${key} must have a readable public label`);
    assert.ok(!['priceCurrent', 'priceReference', 'stock', 'installationHint', 'warranty'].includes(key), `${model.sku}.${key} must not change seller price, stock, installation, or warranty entitlements`);
    const source = evidence.sources[field.sourceIndex];
    assert.ok(source, `${model.sku}.${key} must link to a retained source record`);
    const allowedStatus = source.authorityType === 'THAI_REGULATORY_BODY'
      ? field.status === 'REGULATORY_RECORD_REVIEWED'
      : ['MANUFACTURER_DOCUMENT_REVIEWED', 'MANUFACTURER_PAGE_REVIEWED'].includes(field.status);
    assert.ok(allowedStatus, `${model.sku}.${key} must have a status matching its evidence authority`);
    assert.equal(field.exactModel, true, `${model.sku}.${key} must be exact-model evidence`);
    assert.match(source.href || '', /^https:\/\//, `${model.sku}.${key} must retain its primary HTTPS source URL`);
    assert.match(source.sha256 || '', /^[a-f0-9]{64}$/i, `${model.sku}.${key} must retain its source hash`);
    assert.ok(source.sourceId, `${model.sku}.${key} must retain the evidence ledger's source identifier`);
    assert.match(source.checkedAt || '', /^2026-10-/, `${model.sku}.${key} must have a recent check date`);
    if (field.status === 'REGULATORY_RECORD_REVIEWED') {
      assert.equal(source.authorityType, 'THAI_REGULATORY_BODY', `${model.sku}.${key} must clearly identify regulatory evidence`);
      assert.match(new URL(source.href).hostname, /(^|\.)tisi\.go\.th$/i, `${model.sku}.${key} regulatory evidence must link to TISI`);
    }
  }
}
assert.equal(ratedCapacityCount, 299, 'only reviewed manufacturer BTU values are used');
assert.equal(dimensionCompleteCount, 234, 'only complete, source-backed indoor W/H/D triplets may drive room simulation');
assert.equal(pricebookBandDifferences, 133, 'manufacturer capacity and the company Pricebook band remain separate where they differ');
const evidenceKeys = new Set(evidence.models.map(model => `${normalize(model.brand)}|${model.type}|${normalize(model.sku)}`));
assert.equal(siteRows.filter(row => !evidenceKeys.has(`${normalize(row.brand)}|${row.type}|${normalize(row.sku)}`)).length, 366, 'unmatched catalog rows should decrease only for exact manufacturer evidence');

const saijoModels = [
  ['TURBO A.P.S-09', 'TURBO APS R32-09', 'FS09TURBO32SW1', 'CE09TURBO32SW1', 9563, 9071, 10500, 3800, 654, 15.52, 350, 800, '1/4', '3/8', 2.5, 10, 28],
  ['TURBO A.P.S-12', 'TURBO APS R32-12', 'FS12TURBO32SW1', 'CE12TURBO32SW1', 12770, 12572, 12200, 4500, 889, 15.25, 400, 850, '1/4', '3/8', 2.5, 10, 31],
  ['TURBO A.P.S-18', 'TURBO APS R32-18', 'FS18TURBO32SW1', 'CE18TURBO32SW1', 18905, 18258, 16400, 5200, 1268, 15.83, 600, 1300, '1/4', '1/2', 2.5, 14, 45],
  ['TURBO A.P.S-25', 'TURBO APS R32-25', 'FS25TURBO32SW1', 'CE25TURBO32SW1', 25498, 25259, 17800, 6000, 1787, 15.15, 850, 1800, '1/4', '1/2', 4, 15, 54],
  ['TURBO A.P.S-30', 'TURBO APS R32-30', 'FS30TURBO32SW1', 'CS30TURBO32SW1', 30219, 30441, 26200, 6500, 2184, 14.48, 1000, 2150, '3/8', '5/8', 4, 22, 70],
  ['TURBO A.P.S-36', 'TURBO APS R32-36', 'FS36TURBO32SW1', 'CS36TURBO32SW1', 37698, 36221, 31300, 7800, 2665, 15.01, 1200, 2550, '3/8', '5/8', 6, 22, 72],
  ['TURBO A.P.S-40', 'TURBO APS R32-40', 'FS40TURBO32SW1', 'CS40TURBO32SW1', 40450, 40200, 34700, 7800, 2713, 15.83, 1350, 2850, '3/8', '5/8', 6, 22, 120],
  ['SWG-09', 'SMART COOL R32-09', 'FE09SUPER32SWG1', 'CE09SUPER32SWG1', 9563, 9410, 10700, 3800, 654, 15.52, 350, 800, '1/4', '3/8', 2.5, 10, 28],
  ['SWG-12', 'SMART COOL R32-12', 'FE12SUPER32SWG1', 'CE12SUPER32SWG1', 12770, 12582, 12200, 4500, 889, 15.25, 400, 850, '1/4', '3/8', 2.5, 10, 31],
  ['SWG-18', 'SMART COOL R32-18', 'FE18SUPER32SWG1', 'CE18SUPER32SWG1', 18905, 18258, 16400, 5200, 1268, 15.83, 600, 1300, '1/4', '1/2', 2.5, 14, 45],
  ['SWG-25', 'SMART COOL R32-25', 'FE25SUPER32SWG1', 'CE25SUPER32SWG1', 25498, 25259, 17800, 6000, 1787, 15.15, 850, 1800, '1/4', '5/8', 4, 15, 54],
];
const saijoSourceIndex = evidence.sources.findIndex(source => source.sourceId === 'SAIJO_DENKI_RESIDENTIAL_CATALOG_M9_2021');
const saijoSource = evidence.sources[saijoSourceIndex];
assert.equal(saijoSourceIndex, 142, 'Saijo source record should be retained after the existing evidence ledger');
assert.equal(saijoSource?.sha256, '993fbed3ea54deb112417f3aa7d1fac9de1ac1d3bba7ea8efeb88a0a5a36bd2d');
assert.match(saijoSource?.sourceEdition || '', /2021 \(M9\).*printed p\.08.*printed p\.10/);
for (const [sku, sourceModelName, indoor, outdoor, btu, companyBtu, price, install, watts, seer, indoorAir, outdoorAir, liquid, gas, cable, indoorKg, outdoorKg] of saijoModels) {
  const row = site.prods.find(candidate => candidate[1] === 'Saijo Denki' && candidate[2] === sku);
  const model = evidence.models.find(candidate => candidate.brandId === 'saijo-denki' && candidate.sku === sku);
  assert.ok(row && model, `${sku} should map to a live Saijo Denki catalog row`);
  assert.equal(row[3], companyBtu, `${sku} company BTU band should remain unchanged`);
  assert.equal(row[4], price, `${sku} company sale price should remain unchanged`);
  assert.equal(row[5], install, `${sku} company install rate should remain unchanged`);
  assert.equal(model.sourceModelName, sourceModelName);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(model.pairMatchMethod, 'SAIJO_OFFICIAL_FAMILY_SIZE');
  assert.ok(exactPair(sku, model), `${sku} family/size must match both exact manufacturer model codes`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.refrigerant.value, 'R-32');
  assert.match(model.fields.power.value, /220–240 V \/ 1 Phase \/ 50 Hz/);
  assert.equal(model.fields.ratedInputW.value, watts);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.indoorAirflowCfm.value, indoorAir);
  assert.equal(model.fields.outdoorAirflowCfm.value, outdoorAir);
  assert.equal(model.fields.pipeLiquid.value, liquid);
  assert.equal(model.fields.pipeGas.value, gas);
  assert.equal(model.fields.indoorWeight.value, indoorKg);
  assert.equal(model.fields.outdoorWeight.value, outdoorKg);
  assert.equal(model.fields.mainsCable.value, `${cable} mm²`);
  assert.equal(model.fields.breakerA, undefined, `${sku} must not gain an unsupported breaker rating`);
  assert.equal(model.fields.interconnectCable, undefined, `${sku} must not gain an unsupported interconnect-cable claim`);
  assert.equal(model.fields.power.sourceIndex, saijoSourceIndex);
}

const daikinFhfcSource = evidence.sources.find(source => source.sourceId === 'DAIKIN_TH_PRODUCT_COMPARE_FHFC_EV2S_2026-10-16');
const daikinFhfcSourceIndex = evidence.sources.indexOf(daikinFhfcSource);
assert.equal(daikinFhfcSource?.sha256, '849af1862a08c312f9846d271f85753787935d168571bea37a7c530159b424ec');
assert.equal(daikinFhfcSource?.authorityType, 'MANUFACTURER');
for (const [sku, indoor, outdoor, btu, rangeBtu, kw, rangeKw, seer, inputW, power, liquid, gas, indoorHwd, outdoorHwd, indoorKg, outdoorKg, price, install] of [
  ['FHFC13EV2S/RZFC13EV2S', 'FHFC13EV2S', 'RZFC13EV2S', 13600, '6,100–15,400', 4.0, '1.8–4.5', 17.07, 1280, '220 V / 1 Phase / 50 Hz', 6.4, 12.7, '195 × 960 × 680 mm (H × W × D)', '595 × 845 × 300 mm (H × W × D)', 25, 34, 28300, 6500],
  ['FHFC42EV2S/RZFC42EY2S', 'FHFC42EV2S', 'RZFC42EY2S', 42000, '19,500–47,800', 12.3, '5.7–14.0', 15.60, 4610, '380 V / 3 Phase / 50 Hz', 9.5, 15.9, '235 × 1,590 × 690 mm (H × W × D)', '990 × 940 × 320 mm (H × W × D)', 38, 62, 53700, 10000],
]) {
  const row = site.prods.find(candidate => candidate[1] === 'Daikin' && candidate[2] === sku);
  const model = evidence.models.find(candidate => candidate.brandId === 'daikin' && candidate.sku === sku);
  assert.ok(row && model, `${sku} must be present in the live development catalog and evidence index`);
  assert.equal(row[0], 'ceiling');
  assert.deepEqual(row.slice(3, 6), [btu, price, install], `${sku} company BTU band, sale price, and install rate must remain unchanged`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(model.sourceModelName, sku);
  assert.equal(model.pairMatchMethod, 'DAIKIN_OFFICIAL_PRODUCT_COMPARE_EXACT_PAIR');
  assert.ok(exactPair(sku, model), `${sku} must exactly match the manufacturer indoor/outdoor pair`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.capacityRangeBtu.value, rangeBtu);
  assert.equal(model.fields.ratedCapacityKw.value, kw);
  assert.equal(model.fields.capacityRangeKw.value, rangeKw);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.ratedInputW.value, inputW);
  assert.equal(model.fields.power.value, power);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.pipeLiquid.value, liquid);
  assert.equal(model.fields.pipeGas.value, gas);
  assert.equal(model.fields.indoorDimReported.value, indoorHwd);
  assert.equal(model.fields.outdoorDimReported.value, outdoorHwd);
  assert.equal(model.fields.indoorWeight.value, indoorKg);
  assert.equal(model.fields.outdoorWeight.value, outdoorKg);
  assert.equal(model.fields.breakerA, undefined, `${sku} must not gain an unsupported breaker rating`);
  assert.equal(model.fields.mainsCable, undefined, `${sku} must not gain an unsupported supply cable size`);
  assert.equal(model.fields.interconnectCable, undefined, `${sku} must not gain an unsupported interconnect-cable claim`);
  assert.ok(Object.values(model.fields).every(field => field.sourceIndex === daikinFhfcSourceIndex));
}

const panasonicYu = [
  ['YU9ZKT', 'CS-YU9ZKT', 'CU-YU9ZKT', 9080, 9000, 10000, 3800, 2700],
  ['YU13ZKT', 'CS-YU13ZKT', 'CU-YU13ZKT', 12297, 12000, 11200, 3800, 2700],
  ['YU18ZKT', 'CS-YU18ZKT', 'CU-YU18ZKT', 18097, 18000, 16200, 4500, 3200],
  ['YU24ZKT', 'CS-YU24ZKT', 'CU-YU24ZKT', 24322, 24000, 19400, 5200, 4000],
  ['YU28ZKT', 'CS-YU28ZKT', 'CU-YU28ZKT', 28005, 28000, 28700, 6000, 4000],
  ['YU36ZKT', 'CS-YU36ZKT', 'CU-YU36ZKT', 36137, 36000, 40300, 6500, 5050],
];
const panasonicCapture = evidence.sources.find(source => source.sourceId === 'PANASONIC_TH_YU_ZKT_PRODUCT_PAGES_2026');
const panasonicTisi = evidence.sources.find(source => source.sourceId === 'TISI_N35556_69_1529_PANASONIC_YU_ZKT');
const panasonicXu = evidence.sources.find(source => source.sourceId === 'PANASONIC_TH_XU_AKT_PRODUCT_PAGES_2026');
const panasonicCapturePath = path.join(root, 'docs', 'PANASONIC_YU_ZKT_EVIDENCE_CAPTURE_2026-10-16.md');
const panasonicCaptureSha256 = crypto.createHash('sha256').update(fs.readFileSync(panasonicCapturePath)).digest('hex');
assert.equal(panasonicCapture?.sha256, panasonicCaptureSha256, 'Panasonic source hashes must match the retained capture file');
assert.equal(panasonicXu?.sha256, panasonicCaptureSha256, 'Panasonic XU source hash must match the retained capture file');
assert.equal(panasonicTisi?.sha256, '180a9bbe461431d2a34304de9e8e420c55f9d3bad78f6ab7fb073ce9e0375c9d');
assert.equal(panasonicXu?.authorityType, 'MANUFACTURER');
for (const [sku, indoor, outdoor, btu, companyBtu, price, install, inputW] of panasonicYu) {
  const row = site.prods.find(candidate => candidate[1] === 'Panasonic' && candidate[2] === sku);
  const model = evidence.models.find(candidate => candidate.brandId === 'panasonic' && candidate.sku === sku);
  assert.ok(row && model, `${sku} should map to a live Panasonic catalog row`);
  assert.equal(row[3], companyBtu, `${sku} company BTU band should remain unchanged`);
  assert.equal(row[4], price, `${sku} company price should remain unchanged`);
  assert.equal(row[5], install, `${sku} company install rate should remain unchanged`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(model.pairMatchMethod, 'PANASONIC_MODEL_SUFFIX');
  assert.ok(exactPair(sku, model), `${sku} suffix must exactly identify both official indoor/outdoor model codes`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.series.value, 'Standard Inverter YU Series (ZKT)');
  assert.equal(model.fields.inverter.value, true);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.power.value, '220–240 V / 1 Phase / 50 Hz');
  assert.equal(model.fields.ratedInputW.value, inputW);
  assert.equal(evidence.sources[model.fields.power.sourceIndex].authorityType, 'THAI_REGULATORY_BODY');
}
for (const [sku, indoor, outdoor, btu, companyBtu, price, install] of [
  ['CS-XU9AKT / CU-XU9AKT', 'CS-XU9AKT', 'CU-XU9AKT', 9518, 9000, 17700, 3800],
  ['CS-XU24AKT / CU-XU24AKT', 'CS-XU24AKT', 'CU-XU24AKT', 24053, 24000, 36400, 5200],
]) {
  const row = site.prods.find(candidate => candidate[1] === 'Panasonic' && normalize(candidate[2]) === normalize(sku));
  const model = evidence.models.find(candidate => candidate.brandId === 'panasonic' && normalize(candidate.sku) === normalize(sku));
  assert.ok(row && model, `${sku} should map to a live Panasonic catalog row`);
  assert.equal(row[3], companyBtu);
  assert.equal(row[4], price);
  assert.equal(row[5], install);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.series.value, 'Premium nanoe Inverter XU Series (AKT)');
  assert.equal(model.fields.inverter.value, true);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.power, undefined, 'XU-AKT supply phase/input must remain blank without exact regulatory/model data');
}

const daikinFhaTisi = evidence.sources.find(source => source.sourceId === 'TISI_T6961_1_1529_DAIKIN_FHA_BV2S');
assert.equal(daikinFhaTisi?.sha256, 'c2470aa22157adc82b75085ae19181131c521f304f157eaebb692951a212d1a5');
assert.equal(daikinFhaTisi?.authorityType, 'THAI_REGULATORY_BODY');
for (const [sku, indoor, outdoor, coolingW, inputW] of [
  ['FHA13BV2S/RZF13CV2S', 'FHA13BV2S', 'RZF13CV2S', 3800, 780],
  ['FHA18BV2S/RZF18CV2S', 'FHA18BV2S', 'RZF18CV2S', 5300, 1240],
  ['FHA24BV2S/RZF24CV2S', 'FHA24BV2S', 'RZF24CV2S', 7000, 1880],
]) {
  const row = site.prods.find(candidate => candidate[1] === 'Daikin' && normalize(candidate[2]) === normalize(sku));
  const model = evidence.models.find(candidate => candidate.brandId === 'daikin' && normalize(candidate.sku) === normalize(sku));
  assert.ok(row && model, `${sku} should map to an exact Daikin Pricebook row`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.ok(exactPair(sku, model));
  assert.equal(model.fields.ratedCapacityW.value, coolingW);
  assert.equal(model.fields.power.value, '220 V / 1 Phase / 50 Hz');
  assert.equal(model.fields.ratedInputW.value, inputW);
  assert.equal(model.fields.btu, undefined, 'TISI watt capacity must not be converted into BTU/h');
  assert.equal(model.fields.refrigerant, undefined, 'flammable refrigerant class must not be presented as a specific refrigerant');
}

const plyMTisiRows = [
  ['PLY-M13EA/TH-SUY-M13VA-TH', 'PLY-M13EA-TH.TH', 'SUY-M13VA-TH.TH', 4.1, 1030, '220 V / 1 Phase / 50 Hz', 258, '6.35 mm (1/4 in)', '12.70 mm (1/2 in)'],
  ['PLY-M18EA/TH-SUY-M18VA-TH', 'PLY-M18EA-TH.TH', 'SUY-M18VA-TH.TH', 5.3, 1640, '220 V / 1 Phase / 50 Hz', 258, '6.35 mm (1/4 in)', '12.70 mm (1/2 in)'],
  ['PLY-M24EA/TH-SUY-M24VA-TH', 'PLY-M24EA-TH.TH', 'SUY-M24VA-TH.TH', 7.1, 1900, '220 V / 1 Phase / 50 Hz', 258, '9.52 mm (3/8 in)', '15.88 mm (5/8 in)'],
  ['PLY-M30EA/TH-SUY-M30VA-TH', 'PLY-M30EA-TH.TH', 'SUY-M30VA-TH.TH', 8.8, 2600, '220 V / 1 Phase / 50 Hz', 298, '9.52 mm (3/8 in)', '15.88 mm (5/8 in)'],
  ['PLY-M36EA/TH-SUY-M36VA-TH', 'PLY-M36EA-TH.TH', 'SUY-M36VA-TH.TH', 10.6, 3140, '220 V / 1 Phase / 50 Hz', 298, '9.52 mm (3/8 in)', '15.88 mm (5/8 in)'],
];
const plyMTisiSource = evidence.sources.find(source => source.sourceId === 'TISI_T7120_2108_2134_MITSUBISHI_PLY_M');
const plyMTisiPowerSource = evidence.sources.find(source => source.sourceId === 'TISI_T7067_8_1529_MITSUBISHI_PLY_M');
const plyMInstallSource = evidence.sources.find(source => source.sourceId === 'MITSUBISHI_PLY_M_EA_TH_INSTALLATION_MANUAL');
const plyMDimensionSource = evidence.sources.find(source => source.sourceId === 'MITSUBISHI_PLY_M_EA_TH_DIMENSION_SHEET');
assert.ok(plyMTisiSource && plyMTisiPowerSource && plyMInstallSource && plyMDimensionSource, 'PLY-M evidence must retain TISI, manufacturer manual, and exact dimension sources');
assert.equal(plyMTisiSource.authorityType, 'THAI_REGULATORY_BODY');
assert.equal(plyMTisiPowerSource.authorityType, 'THAI_REGULATORY_BODY');
for (const [sku, indoor, outdoor, ratedCapacityKw, ratedInputW, power, height, liquid, gas] of plyMTisiRows) {
  const model = evidence.models.find(candidate => normalize(candidate.sku) === normalize(sku));
  const row = site.prods.find(candidate => candidate[0] === 'cassette' && candidate[1] === 'Mitsubishi Electric' && normalize(candidate[2]) === normalize(sku));
  assert.ok(model && row, `${sku} must match a current company catalog record exactly`);
  assert.equal(model.pairMatchMethod, 'TISI_THAI_COUNTRY_SUFFIX', `${sku} must document the limited TISI country-suffix normalization`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(exactPair(sku, model), true, `${sku} must be an exact paired-model match after only the documented TISI suffix normalization`);
  assert.equal(model.fields.ratedCapacityKw.value, ratedCapacityKw);
  assert.equal(model.fields.ratedInputW.value, ratedInputW);
  assert.equal(model.fields.power.value, power);
  assert.equal(model.fields.power.label, 'แหล่งจ่ายไฟตามเอกสารผู้ผลิตหรือทะเบียน มอก.');
  assert.equal(model.fields.indoorWidth.value, 840);
  assert.equal(model.fields.indoorHeight.value, height);
  assert.equal(model.fields.indoorDepth.value, 840);
  assert.equal(model.fields.panelWidth.value, 950);
  assert.equal(model.fields.panelHeight.value, 950);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.match(model.fields.interconnectCable.value, /3 .*1\.5 mm².*45 m/);
  assert.match(model.fields.interconnectCable.value, /สายดิน.*1\.5 mm²/);
  assert.match(model.fields.powerNote.value, /ไม่ยืนยันขนาดสายเมนหรือพิกัดเบรกเกอร์/);
  assert.equal(model.fields.pipeLiquid.value, liquid);
  assert.equal(model.fields.pipeGas.value, gas);
  assert.ok(model.fields.pipePair.value.includes(liquid) && model.fields.pipePair.value.includes(gas));
  assert.match(model.fields.drainConnection.value, /VP25.*32 mm/);
  assert.equal(model.fields.indoorModel.sourceIndex, evidence.sources.indexOf(plyMTisiSource));
  assert.equal(model.fields.outdoorModel.sourceIndex, evidence.sources.indexOf(plyMTisiSource));
  assert.equal(model.fields.ratedCapacityKw.sourceIndex, evidence.sources.indexOf(plyMTisiSource));
  assert.equal(model.fields.power.sourceIndex, evidence.sources.indexOf(plyMTisiPowerSource));
  assert.equal(model.fields.ratedInputW.sourceIndex, evidence.sources.indexOf(plyMTisiPowerSource));
  assert.equal(model.fields.indoorDimReported.sourceIndex, evidence.sources.indexOf(plyMDimensionSource));
  assert.equal(model.fields.interconnectCable.sourceIndex, evidence.sources.indexOf(plyMInstallSource));
  assert.deepEqual(row.slice(3, 6), {
    'PLY-M13EA/TH-SUY-M13VA-TH': [13989, 36400, 7500],
    'PLY-M18EA/TH-SUY-M18VA-TH': [18084, 41800, 8500],
    'PLY-M24EA/TH-SUY-M24VA-TH': [25249, 52100, 9500],
    'PLY-M30EA/TH-SUY-M30VA-TH': [30026, 56800, 10500],
    'PLY-M36EA/TH-SUY-M36VA-TH': [36167, 65900, 12500],
  }[sku], `${sku} technical evidence must not rewrite company BTU band, product price, or install rate`);
}
const plyM24CurrentPair = evidence.models.find(model => model.sku === 'PLY-M24EA/TH-SUY-M24VA-TH');
assert.match(plyM24CurrentPair.dataWarnings?.[0]?.text || '', /7,100 W.*25,249 BTU\/h.*ยืนยัน/);
assert.equal(plyM24CurrentPair.dataWarnings?.[0]?.kind, 'CATALOG_CAPACITY_CONFLICT');

const mideaPages = new Map([
  ['MSCE-10CRFN8-ID', ['https://www.midea.com/th/air-conditioner/residential/single-split/celest-inverter-9360btu-msce-10crfn8-id.msce-10crfn8-id', '742c9d6b37fd810236adb42bf847981c92dfad33a0c4422972fceb71a9358fd9', 9360, 17.88, 3.18, 830, 3.61, '723 × 199 × 286 mm (W × D × H)', '668 × 252 × 469 mm (W × D × H)', 7.2, 16.9, 'R32/0.36kg']],
  ['MSCE-13CRFN8-ID', ['https://www.midea.com/th/air-conditioner/residential/single-split/celest-inverter-12000btu-msce-13crfn8-id.msce-13crfn8-id', 'facebd353a9bb424c3d950f802c89624ba0e478c633ec27b9f800c3b083c4124', 12000]],
  ['MSCE-19CRFN8-ID', ['https://www.midea.com/th/air-conditioner/residential/single-split/celest-inverter-18000btu-msce-19crfn8-id.msce-19crfn8-id', 'c8e1a40f8fa970baad60fbcef702177bc7f3e018a76ee5e43b8b2b7c4189f9fd', 18000]],
  ['MSCE-25CRFN8-ID', ['https://www.midea.com/th/air-conditioner/residential/single-split/celest-inverter-24000btu-msce-25crfn8-id.msce-25crfn8-id', '8936ff8fa9b92778b9c95fb971602bf94ce67ba0abed374df7864735edd21fc8', 24000]],
]);
for (const [sku, [href, sha256, btu, seer, eer, watts, amps, indoorDims, outdoorDims, indoorKg, outdoorKg, refrigerant]] of mideaPages) {
  const model = evidence.models.find(candidate => candidate.brandId === 'midea' && candidate.sku === sku);
  assert.ok(model, `${sku} should map to its exact Midea Thailand product page`);
  assert.equal(model.type, 'wall');
  assert.equal(model.indoorModel, sku);
  assert.equal(model.outdoorModel, null, 'the Thai model page does not establish a matching outdoor-unit code');
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.series.value, 'Celest Inverter');
  assert.equal(model.fields.system.value, 'Inverter');
  assert.equal(model.fields.inverter.value, true);
  assert.equal(model.fields.color.value, 'สีขาว');
  assert.match(model.fields.features.value, /SMART MASTER.*ECO MASTER.*Prime Guard.*COOL FLASH.*I-Clean/);
  assert.match(model.fields.powerNote.value, /ไม่ได้ระบุแรงดันไฟฟ้า เฟส ความถี่ จำนวนสาย ขนาดสายเมน\/สายเชื่อม หรือพิกัดเบรกเกอร์/);
  const source = evidence.sources.find(candidate => candidate.sourceId === `MIDEA_TH_CELEST_${sku.replaceAll('-', '_')}`);
  assert.ok(source, `${sku} should retain a model-specific Thai manufacturer page capture`);
  assert.equal(source.href, href);
  assert.equal(source.sha256, sha256);
  assert.ok(Object.values(model.fields).every(field => field.sourceIndex === evidence.sources.indexOf(source)));
  const row = site.prods.find(candidate => candidate[0] === 'wall' && candidate[1] === 'Midea' && candidate[2] === sku);
  assert.ok(row, `${sku} should remain in the company catalog`);
  assert.deepEqual(row.slice(3, 6), [sku === 'MSCE-10CRFN8-ID' ? 9500 : btu, { 'MSCE-10CRFN8-ID':7400, 'MSCE-13CRFN8-ID':8600, 'MSCE-19CRFN8-ID':12300, 'MSCE-25CRFN8-ID':14600 }[sku], { 'MSCE-10CRFN8-ID':3800, 'MSCE-13CRFN8-ID':3800, 'MSCE-19CRFN8-ID':4500, 'MSCE-25CRFN8-ID':5200 }[sku]], 'manufacturer evidence must not rewrite company price or installation rates');
  if (sku === 'MSCE-10CRFN8-ID') {
    assert.equal(model.fields.seer.value, seer);
    assert.equal(model.fields.ratedCoolingEfficiencyWW.value, eer);
    assert.equal(model.fields.energyLabelStars.value, 5);
    assert.equal(model.fields.ratedInputW.value, watts);
    assert.equal(model.fields.ratedCurrentA.value, amps);
    assert.equal(model.fields.indoorDimReported.value, indoorDims);
    assert.equal(model.fields.outdoorDimReported.value, outdoorDims);
    assert.equal(model.fields.indoorWidth.value, 723);
    assert.equal(model.fields.indoorHeight.value, 286);
    assert.equal(model.fields.indoorDepth.value, 199);
    assert.equal(model.fields.outdoorWidth.value, 668);
    assert.equal(model.fields.outdoorHeight.value, 469);
    assert.equal(model.fields.outdoorDepth.value, 252);
    assert.equal(model.fields.indoorWeight.value, indoorKg);
    assert.equal(model.fields.outdoorWeight.value, outdoorKg);
    assert.equal(model.fields.compressor.value, 'Rotary');
    assert.equal(model.fields.refrigerant.value, 'R32');
    assert.equal(model.fields.refrigerantCharge.value, 0.36);
    assert.equal(model.fields.power, undefined, 'do not infer voltage, phase, or frequency absent from the Thai product page');
  } else {
    assert.deepEqual(Object.keys(model.fields).sort(), ['btu', 'color', 'features', 'inverter', 'powerNote', 'series', 'system'].sort(), 'do not fill missing model-specific technical details from a similar regional model');
  }
}
const mideaAgModels = new Map([
  ['MSAG-09CRN8-IDU', ['https://www.midea.com/th-en/air-conditioner/residential/single-split/9-300-btu-midea-ag-standard-system-fixed-speed-wall-mounted-air-conditioner.msag-09crn8-idu', '1b29266f5d2d0bc6402dc4b46d03cf5d6b50b7dea4520944667579e91cbd8fd5', 'MSAG-09CRN8-ODU', 9300, 9000, 7400, 3800, 'Cold Catalyst filter; 3D Air Flow; Self-Cleaning; energy-saving modes 50% / 75% / 100%']],
  ['MSAG-12CRN8-IDU', ['https://www.midea.com/th/air-conditioner/residential/single-split/12-300-btu-midea-ag-standard-system-fixed-speed-wall-mounted-air-conditioner.msag-12crn8-idu', '8b4166ae316f251514bd8df951121125004c540bbda0de17fddac45a23cd5929', 'MSAG-12CRN8-ODU', 12300, 12000, 8700, 3800, 'Cold Catalyst filter; 3D Air Flow; Self-Cleaning; Bio HEPA Filter; HYPER GRAPFINS']],
  ['MSAG-18CRN8-IDU', ['https://www.midea.com/th/air-conditioner/residential/single-split/18-200-btu-midea-ag-standard-system-fixed-speed-wall-mounted-air-conditioner.msag-18crn8-idu', '83dd284855678372719e7a05298728c883a7d4b6d02c37eeb2bbe62a44ecf12f', 'MSAG-18CRN8-ODU', 18200, 18000, 13900, 4500, 'Cold Catalyst filter; 3D Air Flow; Self-Cleaning; Bio HEPA Filter; HYPER GRAPFINS']],
  ['MSAG-24CRN8-IDU', ['https://www.midea.com/th/air-conditioner/residential/single-split/25-000-btu-midea-ag-standard-system-fixed-speed-wall-mounted-air-conditioner.msag-24crn8-idu', 'a54606ca401b917e52ae7b96dda2e0f81b03759fa72d05fad3a1700e5e4d6292', 'MSAG-24CRN8-ODU', 25000, 24000, 17400, 5200, 'Cold Catalyst filter; 3D Air Flow; Self-Cleaning; Bio HEPA Filter; HYPER GRAPFINS']],
]);
for (const [sku, [href, sha256, outdoorModel, btu, companyBtu, price, install, features]] of mideaAgModels) {
  const model = evidence.models.find(candidate => candidate.brandId === 'midea' && candidate.sku === sku);
  assert.ok(model, `${sku} should map to its exact Midea Thailand product page`);
  assert.equal(model.indoorModel, sku);
  assert.equal(model.outdoorModel, outdoorModel);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.series.value, 'TORNADO EASY');
  assert.equal(model.fields.system.value, 'Fixed Speed');
  assert.equal(model.fields.inverter.value, false);
  assert.equal(model.fields.color.value, 'สีขาว');
  assert.equal(model.fields.features.value, features);
  assert.match(model.fields.powerNote.value, /ไม่ได้ระบุแรงดันไฟฟ้า เฟส ความถี่ จำนวนสาย ขนาดสายเมน\/สายเชื่อม หรือพิกัดเบรกเกอร์/);
  const source = evidence.sources.find(candidate => candidate.sourceId === `MIDEA_TH_TORNADO_EASY_${sku.replaceAll('-', '_')}`);
  assert.ok(source, `${sku} should retain its model-specific Midea Thailand page capture`);
  assert.equal(source.href, href);
  assert.equal(source.sha256, sha256);
  assert.ok(Object.values(model.fields).every(field => field.sourceIndex === evidence.sources.indexOf(source)));
  const row = site.prods.find(candidate => candidate[0] === 'wall' && candidate[1] === 'Midea' && candidate[2] === sku);
  assert.ok(row, `${sku} should remain in the company catalog`);
  assert.deepEqual(row.slice(3, 6), [companyBtu, price, install], 'official capacity must remain separate from company BTU, price, and install bands');
}
const mideaRegionalReference = evidence.sources.find(source => source.sourceId === 'MIDEA_MY_CELEST_2025_CROSS_REGION_NOT_IMPORTED');
assert.ok(mideaRegionalReference, 'the official Malaysia catalog conflict should remain visible as an excluded regional reference');
assert.equal(mideaRegionalReference.href, 'https://www.midea.com/content/dam/midea-aem/my/air-conditioners/residential-air-conditioners/wall-mounted-inverter/celest-series/Celest.pdf');
assert.equal(mideaRegionalReference.sha256, '5fecbebfcf60298d43b016c005842b60b065bb1bf71b7d393cbc845596595b10');
assert.match(mideaRegionalReference.verificationMethod, /NOT_IMPORTED/);
assert.ok(!evidence.models.filter(model => model.brandId === 'midea').some(model => Object.values(model.fields).some(field => field.sourceIndex === evidence.sources.indexOf(mideaRegionalReference))), 'regional specs must not be mixed into Thai model records');

const carrierCassetteSource = evidence.sources.find(source => source.sourceId === 'CARRIER_XPOWER_TGV_CASSETTE_2023_OFFICIAL_CATALOGUE');
assert.ok(carrierCassetteSource, 'the official Carrier cassette catalogue must be retained as an exact-model source');
assert.equal(carrierCassetteSource.href, 'https://carrierthailand.com/wp-content/uploads/2023/04/Xpower-TGV_UP_compressed.pdf');
assert.equal(carrierCassetteSource.sha256, '3dc5121dcdfea1c3c8d3bdd59c4a865963fc1718937f8da044ef9df0cd6849da');
const carrierCassettePairs = [
  ['40TGV0131UP', '38TGV0131A1', 13300, '220V / 1Ph / 50Hz', 4.05, 4.60],
  ['40TGV0181UP', '38TGV0181A1', 18100, '220V / 1Ph / 50Hz', 6.35, 8.40],
  ['40TGV0241UP', '38TGV0241A1', 24200, '220V / 1Ph / 50Hz', 9.95, 12.10],
  ['40TGV0251UP', '38TGV0251A1', 25200, '220V / 1Ph / 50Hz', 9.25, 11.70],
  ['40TGV0301UP', '38TGV0301A1', 30000, '220V / 1Ph / 50Hz', 11.80, 14.50],
  ['40TGV0361UP', '38TGV0361A1', 36100, '220V / 1Ph / 50Hz', 15.00, 18.80],
  ['40TGV0361UP', '38TGV0361A3', 36100, '380V / 3Ph / 50Hz', 5.25, 6.25],
  ['40TGV0391UP', '38TGV0391A3', 38500, '380V / 3Ph / 50Hz', 5.35, 7.20],
  ['40TGV0401UP', '38TGV0401A1', 40200, '220V / 1Ph / 50Hz', 16.00, 21.00],
  ['40TGV0401UP', '38TGV0401A3', 40200, '380V / 3Ph / 50Hz', 5.50, 7.20],
  ['40TGV0481UP', '38TGV0481A3', 48000, '380V / 3Ph / 50Hz', 7.70, 9.40],
  ['40TGV0601UP', '38TGV0601A3', 60700, '380V / 3Ph / 50Hz', 9.60, 10.90],
];
for (const [indoor, outdoor, btu, power, ratedCurrent, maxCurrent] of carrierCassettePairs) {
  const sku = `${outdoor}/${indoor}`;
  const model = evidence.models.find(candidate => candidate.brandId === 'carrier' && candidate.type === 'cassette' && candidate.sku === sku);
  assert.ok(model, `${sku} should map to the official XPower TGV cassette column`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.power.value, power, `${sku} must preserve its own phase variant`);
  assert.equal(model.fields.ratedCurrentA.value, ratedCurrent);
  assert.equal(model.fields.maxCurrentA.value, maxCurrent);
  assert.equal(model.fields.inverter.value, true);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.powerNote.value, 'เอกสารผู้ผลิตระบุแรงดัน/เฟส/ความถี่และกระแส แต่ไม่ระบุจำนวนสายตัวนำ ขนาดสายไฟเมนหรือสายเชื่อม และพิกัดเบรกเกอร์');
  assert.ok(Object.values(model.fields).every(field => field.sourceIndex === evidence.sources.indexOf(carrierCassetteSource)));
  const row = site.prods.find(candidate => candidate[0] === 'cassette' && candidate[1] === 'Carrier' && normalize(candidate[2]) === normalize(sku));
  assert.ok(row, `${sku} should remain linked to its company catalog row`);
  assert.equal(row[3], btu);
  const companyValues = {
    '40TGV0131UP': [13300, 35200, 7500], '40TGV0181UP': [18100, 37600, 8500],
    '40TGV0241UP': [24200, 43100, 9500], '40TGV0251UP': [25200, 48700, 9500],
    '40TGV0301UP': [30000, 53100, 9500], '40TGV0361UP|38TGV0361A1': [36100, 56800, 12500],
    '40TGV0361UP|38TGV0361A3': [36100, 56800, 12500], '40TGV0391UP': [38500, 61200, 12500],
    '40TGV0401UP|38TGV0401A1': [40200, 61800, 12500], '40TGV0401UP|38TGV0401A3': [40200, 61800, 12500],
    '40TGV0481UP': [48000, 66800, 12500], '40TGV0601UP': [60700, 75000, 15000],
  };
  const companyKey = companyValues[`${indoor}|${outdoor}`] ? `${indoor}|${outdoor}` : indoor;
  assert.deepEqual(row.slice(3, 6), companyValues[companyKey], `${sku} must retain company BTU, price, and install price`);
}
for (const [indoor, outdoor, housingHeight, outdoorDims, outdoorWeight, chargeKg, liquid, gas, minPipe, extraCharge, airflow, indoorNoise, outdoorNoise] of [
  ['40TGV0131UP', '38TGV0131A1', 256, [550, 780, 290], 32, 0.7, '1/4', '1/2', 3, 20, '620 / 510 / 460', '34 / 31 / 27', 47],
  ['40TGV0181UP', '38TGV0181A1', 256, [630, 800, 300], 37, 0.9, '1/4', '1/2', 3, 20, '620 / 510 / 460', '35 / 31 / 27', 52],
  ['40TGV0241UP', '38TGV0241A1', 256, [630, 800, 300], 37, 1.0, '3/8', '5/8', 3, 20, '720 / 570 / 480', '35 / 31 / 28', 52],
  ['40TGV0251UP', '38TGV0251A1', 256, [890, 900, 320], 51, 1.0, '3/8', '5/8', 5, 20, '720 / 570 / 480', '35 / 31 / 28', 57],
  ['40TGV0301UP', '38TGV0301A1', 256, [890, 900, 320], 59, 1.2, '3/8', '5/8', 5, 20, '1070 / 800 / 640', '43 / 39 / 37', 58],
  ['40TGV0361UP', '38TGV0361A1', 256, [890, 900, 320], 60, 1.2, '3/8', '5/8', 5, 20, '1180 / 850 / 690', '46 / 42 / 37', 59],
  ['40TGV0361UP', '38TGV0361A3', 319, [890, 900, 320], 59, 1.2, '3/8', '5/8', 5, 35, '1180 / 850 / 690', '46 / 42 / 37', 59],
  ['40TGV0391UP', '38TGV0391A3', 319, [890, 900, 320], 61, 1.4, '3/8', '5/8', 5, 35, '1250 / 850 / 720', '47 / 43 / 38', 60],
  ['40TGV0401UP', '38TGV0401A1', 319, [890, 900, 320], 62, 1.4, '3/8', '5/8', 5, 35, '1250 / 850 / 720', '47 / 43 / 38', 60],
  ['40TGV0401UP', '38TGV0401A3', 319, [890, 900, 320], 61, 1.4, '3/8', '5/8', 5, 35, '1250 / 850 / 720', '47 / 43 / 38', 60],
  ['40TGV0481UP', '38TGV0481A3', 319, [890, 900, 320], 61, 1.4, '3/8', '5/8', 5, 35, '1250 / 880 / 740', '47 / 44 / 39', 60],
  ['40TGV0601UP', '38TGV0601A3', 319, [1340, 900, 320], 83, 1.5, '3/8', '3/4', 5, 35, '1290 / 1070 / 880', '48 / 45 / 43', 63],
]) {
  const sku = `${outdoor}/${indoor}`;
  const model = evidence.models.find(candidate => candidate.brandId === 'carrier' && candidate.sku === sku);
  assert.ok(model, `${sku} should retain its manufacturer-backed cassette record`);
  const sourceIndex = evidence.sources.indexOf(carrierCassetteSource);
  for (const [key, value] of Object.entries({
    indoorHeight: housingHeight, indoorWidth: 840, indoorDepth: 840,
    panelHeight: 30, panelWidth: 950, panelDepth: 950,
    outdoorHeight: outdoorDims[0], outdoorWidth: outdoorDims[1], outdoorDepth: outdoorDims[2],
    indoorWeight: housingHeight === 256 ? 20 : 24, panelWeight: 4, outdoorWeight,
    refrigerantCharge: chargeKg, pipeLiquid: liquid, pipeGas: gas,
    drainConnection: 'O.D. 32 mm', minPipe, maxPipe: 50, maxLift: 30,
    chargeFreePipeLengthM: 15, additionalRefrigerantChargeRate: extraCharge,
    compressor: 'Twin Rotary DC-Inverter', indoorAirflowCfm: airflow,
    indoorNoiseLevels: indoorNoise, outdoorNoise,
  })) {
    assert.equal(model.fields[key]?.value, value, `${sku}.${key} should match the exact catalogue column`);
    assert.equal(model.fields[key]?.sourceIndex, sourceIndex, `${sku}.${key} should keep the reviewed Carrier catalogue source`);
  }
}
assert.ok(!site.prods.some(row => row[0] === 'cassette' && row[1] === 'Carrier' && row[2] === '38TGV0302A1/40TGV0301UP'), 'the model code typo must not remain in the public catalog');
assert.equal(site.prods.filter(row => !evidence.models.some(model => model.type === row[0] && normalize(model.brand) === normalize(row[1]) && normalize(model.sku) === normalize(row[2]))).length, 366, '366 company catalog rows should remain clearly unmatched to exact manufacturer/regulatory evidence');

const mhiProductList = evidence.sources.find(source => source.sourceId === 'MHI_TH_RESIDENTIAL_PRODUCT_LIST_2026');
const mhiHaruCatalog = evidence.sources.find(source => source.sourceId === 'MHI_HARU_SERIES_CATALOG_2026');
assert.equal(mhiProductList?.sha256, 'f467fcd3a6ed052ece284b0a06c479b5f11a8979810536e0314f9565c07c7f54');
assert.equal(mhiHaruCatalog?.sha256, 'a50e2a753833f1856add4771bb2f5271f175a5e2fe0547fbdf0dad406be91250');
for (const [sku, modelCode, btu, inverter, companyBtu, companyPrice, companyInstall] of [
  ['SRK 10 YYMW1', 'SRK10YYM-W1', 9575, true, 8683, 15100, 3800],
  ['SRK 10 YYP-W1', 'SRK10YYP-W1', 9492, true, 8727, 13700, 3800],
  ['SRK 25 ZSXS-W1', 'SRK25ZSXS-W1', 8770, true, 8769, 27500, 3800],
  ['SRK 10 CYV-W1', 'SRK10CYV-W1', 9200, false, 9200, 12400, 3800],
  ['SRK 13 YYMW1', 'SRK13YYM-W1', 12171, true, 11098, 17500, 3800],
  ['SRK 35 ZSXS-W1', 'SRK35ZSXS-W1', 12103, true, 12102, 30600, 4500],
  ['SRK 13 CYV-W1', 'SRK13CYV-W1', 12350, false, 12350, 14300, 4500],
  ['SRK 13 YYP-W1', 'SRK13YYP-W1', 12369, true, 12500, 15700, 4500],
  ['SRK 15 CYV-W1', 'SRK15CYV-W1', 14580, false, 14580, 16800, 4500],
  ['SRK 15 YYMW1', 'SRK15YYM-W1', 15385, true, 15479, 20900, 4500],
  ['SRK 50 ZSXS-W1', 'SRK50ZSXS-W1', 17105, true, 17105, 42500, 4500],
  ['SRK 18 YYMW1', 'SRK18YYM-W1', 18086, true, 17275, 25400, 4500],
  ['SRK 18 CYV-W1', 'SRK18CYV-W1', 18600, false, 18600, 21800, 5200],
  ['SRK 60 ZSXS-W1', 'SRK60ZSXS-W1', 20977, true, 20977, 48400, 5200],
  ['SRK 24 YYM-W1', 'SRK24YYM-W1', 24225, true, 23020, 34400, 5200],
  ['SRK 24 CYV-W1', 'SRK24CYV-W1', 25300, false, 25300, 30100, 6000],
  ['SRK90YA-W1', 'SRK90YA-W1', 30700, true, 26748, 46300, 6000],
  ['SRK 100YA-W1', 'SRK100YA-W1', 35211, true, 32070, 49200, 6500],
]) {
  const model = evidence.models.find(candidate => candidate.brandId === 'mitsubishi-heavy-duty' && candidate.type === 'wall' && normalize(candidate.sku) === normalize(sku));
  assert.ok(model, `${sku} should resolve only to one exact Mitsubishi Heavy Duty product-list row`);
  assert.equal(model.indoorModel, modelCode);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.inverter.value, inverter);
  assert.equal(model.fields.indoorModel.sourceIndex, evidence.sources.indexOf(mhiProductList));
  assert.equal(model.fields.inverter.sourceIndex, evidence.sources.indexOf(model.fields.series ? mhiHaruCatalog : mhiProductList));
  const companyRow = site.prods.find(row => row[0] === 'wall' && row[1] === 'Mitsubishi Heavy Duty' && normalize(row[2]) === normalize(sku));
  assert.deepEqual(companyRow.slice(3, 6), [companyBtu, companyPrice, companyInstall], `${sku} must retain the existing company BTU band, price, and install rate`);
}
for (const [sku, outdoorModel, btu, seer, power, liquid, gas, maxPipe, maxLift, indoorDim] of [
  ['SRK 10 YYMW1', 'SRC10YYM-W1', 9575, 21.39, 710, 'Ø 6.35 mm (1/4 in)', 'Ø 9.52 mm (3/8 in)', 20, 15, [798, 294, 210]],
  ['SRK 13 YYMW1', 'SRC13YYM-W1', 12171, 19.89, 1180, 'Ø 6.35 mm (1/4 in)', 'Ø 9.52 mm (3/8 in)', 20, 15, [798, 294, 210]],
  ['SRK 15 YYMW1', 'SRC15YYM-W1', 15385, 21.09, 1220, 'Ø 6.35 mm (1/4 in)', 'Ø 12.70 mm (1/2 in)', 25, 15, [798, 294, 210]],
  ['SRK 18 YYMW1', 'SRC18YYM-W1', 18086, 20.60, 1590, 'Ø 6.35 mm (1/4 in)', 'Ø 12.70 mm (1/2 in)', 25, 15, [998, 294, 230]],
  ['SRK 24 YYM-W1', 'SRC24YYM-W1', 24225, 19.91, 2290, 'Ø 6.35 mm (1/4 in)', 'Ø 12.70 mm (1/2 in)', 30, 20, [998, 294, 230]],
]) {
  const model = evidence.models.find(candidate => normalize(candidate.sku) === normalize(sku) && candidate.brandId === 'mitsubishi-heavy-duty');
  assert.equal(model.fields.outdoorModel.value, outdoorModel);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.series.value, 'Haru');
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.ratedInputW.value, power);
  assert.equal(model.fields.power.value, '220–240 V / 1 Phase / 50 Hz');
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.pipeLiquid.value, liquid);
  assert.equal(model.fields.pipeGas.value, gas);
  assert.equal(model.fields.maxPipe.value, maxPipe);
  assert.equal(model.fields.maxLift.value, maxLift);
  assert.deepEqual([model.fields.indoorWidth.value, model.fields.indoorHeight.value, model.fields.indoorDepth.value], indoorDim);
  assert.equal(model.fields.outdoorModel.sourceIndex, evidence.sources.indexOf(mhiHaruCatalog));
  assert.equal(model.fields.seer.sourceIndex, evidence.sources.indexOf(mhiHaruCatalog));
}

const daikinLivePage = evidence.sources.find(source => source.sourceId === 'DAIKIN_PRODUCT_COMPARE_20261016');
assert.ok(daikinLivePage, 'the official Daikin comparison page snapshot should be retained with its source hash');
assert.equal(daikinLivePage.sha256, '68ab75005bcf04b7c10e42085e73b073ba4fbc3a41cd5d754b309e4357733f6b');
for (const [sku, indoor, outdoor, btu, seer, ratedInput, stars, width, height, depth, gas] of [
  ['FTKZ09YV2S5 / RKZ09YV2S5', 'FTKZ09YV2S5', 'RKZ09YV2S5', 9200, 25.8, 520, 5, 920, 299, 275, 'Ø 12.7 mm (1/2 inch)'],
  ['FTKZ24YV2S5 / RKZ24YV2S5', 'FTKZ24YV2S5', 'RKZ24YV2S5', 24200, 22.6, 2080, 3, 1100, 299, 275, 'Ø 12.7 mm (1/2 inch)'],
  ['FAVF30XV2S RKV30XV2S', 'FAVF30XV2S', 'RKV30XV2S', 30000, 18.3, undefined, 2, 1240, 329, 278, 'Ø5/8 inch'],
  ['FAVF36XV2S / RKV36XV2S', 'FAVF36XV2S', 'RKV36XV2S', 36200, 18.27, undefined, 1, 1240, 329, 278, 'Ø5/8 inch'],
  ['FCFC36EV2S', 'FCFC36EV2S', 'RZFC36EV2S', 36000, 16.73, 3420, undefined, 840, 298, 840, 15.9],
]) {
  const model = evidence.models.find(candidate => candidate.brandId === 'daikin' && candidate.sku === sku);
  assert.ok(model, `${sku} should map to one exact manufacturer model`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.ratedInputW?.value, ratedInput);
  assert.equal(model.fields.energyLabelStars?.value, stars);
  assert.equal(model.fields.indoorWidth.value, width);
  assert.equal(model.fields.indoorHeight.value, height);
  assert.equal(model.fields.indoorDepth.value, depth);
  assert.equal(model.fields.pipeGas.value, gas);
}
const fcf36 = evidence.models.find(candidate => candidate.brandId === 'daikin' && candidate.type === 'cassette' && candidate.sku === 'FCF36DV2S');
assert.ok(fcf36, 'the exact shared indoor model may publish only specifications common to its two outdoor variants');
assert.equal(fcf36.fields.outdoorModel, undefined, 'the website row does not identify which outdoor code is installed');
assert.equal(fcf36.fields.power, undefined, 'the shared indoor model has both 1-phase and 3-phase outdoor variants');
assert.match(fcf36.fields.powerNote.value, /RZF36DV2S.*1 เฟส.*RZF36DY2S.*3 เฟส/);
assert.equal(fcf36.fields.btu.value, 36230);
assert.equal(fcf36.fields.indoorWidth.value, 840);
const fvgr10 = evidence.models.find(candidate => candidate.brandId === 'daikin' && candidate.type === 'floor' && candidate.sku === 'FVGR10QV2S/RZUR10QY2S');
assert.ok(fvgr10, 'the exact Daikin FVGR 99,000 BTU floor-standing duct model should be linked');
assert.equal(fvgr10.indoorModel, 'FVGR10QV2S');
assert.equal(fvgr10.outdoorModel, 'RZUR10QY2S');
assert.equal(fvgr10.fields.btu.value, 99000);
assert.equal(fvgr10.fields.power.value, '380 V / 3 Phase / 50 Hz');
assert.equal(fvgr10.fields.refrigerant.value, 'R410A');
assert.equal(fvgr10.fields.compressor.value, 'Hermetically Sealed Scroll Type');
assert.equal(fvgr10.fields.indoorDimReported.value, '1,870 × 1,170 × 510 mm (H × W × D)');
assert.equal(fvgr10.fields.indoorWidth.value, 1170);
assert.equal(fvgr10.fields.indoorHeight.value, 1870);
assert.equal(fvgr10.fields.indoorDepth.value, 510);
assert.equal(fvgr10.fields.indoorWeight.value, 155);
assert.equal(fvgr10.fields.outdoorDimReported.value, '1,657 × 930 × 765 mm (H × W × D)');
assert.equal(fvgr10.fields.outdoorWidth.value, 930);
assert.equal(fvgr10.fields.outdoorHeight.value, 1657);
assert.equal(fvgr10.fields.outdoorDepth.value, 765);
assert.equal(fvgr10.fields.outdoorWeight.value, 185);
assert.equal(fvgr10.fields.maxPipe.value, 70);
assert.equal(fvgr10.fields.maxPipeEquivalentLength.value, 90);
assert.equal(fvgr10.fields.maxLift.value, 50);

const fhnqModels = [
  ['FHNQ13NV2S/RNQ13NV2S', 'FHNQ13NV2S', 'RNQ13NV2S', 13600, 14175, 19900, 6500, 4, 14.23, 1080, '220 V / 1 Phase / 50 Hz', 1160, 195, 680, 'Ø6.4 mm (Flare)', 'Ø12.7 mm (Flare)'],
  ['FHNQ18NV2S/RNQ18NV2S', 'FHNQ18NV2S', 'RNQ18NV2S', 18000, 18000, 24000, 7000, 5.2, 13.44, 1402, '220 V / 1 Phase / 50 Hz', 1400, 195, 680, 'Ø6.4 mm (Flare)', 'Ø12.7 mm (Flare)'],
  ['FHNQ24NV2S/RNQ24NV2S', 'FHNQ24NV2S', 'RNQ24NV2S', 24000, 24200, 32300, 7500, 7, 13.4, 1890, '220 V / 1 Phase / 50 Hz', 1400, 195, 680, 'Ø6.4 mm (Flare)', 'Ø15.9 mm (Flare)'],
  ['FHNQ30NV2S/RNQ30NY2S', 'FHNQ30NV2S', 'RNQ30NY2S', 30000, 30500, 38600, 8500, 8.8, 13.12, 2460, '380 V / 3 Phase / 50 Hz', 1590, 195, 680, 'Ø9.5 mm (Flare)', 'Ø15.9 mm (Flare)'],
  ['FHNQ36NV2S/RNQ36NY2S', 'FHNQ36NV2S', 'RNQ36NY2S', 36000, 37500, 43400, 10000, 10.6, 13.12, 2960, '380 V / 3 Phase / 50 Hz', 1844, 260, 680, 'Ø9.5 mm (Flare)', 'Ø15.9 mm (Flare)'],
];
const fixedSpeedIndex = site.pool.indexOf('Fixed Speed');
assert.ok(fixedSpeedIndex >= 0, 'the manufacturer-confirmed fixed-speed value should exist in the shared Pricebook vocabulary');
for (const [sku, indoor, outdoor, btu, companyBtuBand, sellingPrice, installRate, ratedKw, seer, inputW, power, width, height, depth, liquid, gas] of fhnqModels) {
  const row = site.prods.find(candidate => candidate[1] === 'Daikin' && candidate[2] === sku);
  const model = evidence.models.find(candidate => candidate.brandId === 'daikin' && candidate.type === 'ceiling' && candidate.sku === sku);
  assert.ok(row, `${sku} should use Daikin's exact manufacturer indoor/outdoor SKU`);
  assert.ok(model, `${sku} should have exact manufacturer evidence`);
  assert.equal(row[3], companyBtuBand, `${sku} company BTU band should not change`);
  assert.equal(row[4], sellingPrice, `${sku} company selling price should not change`);
  assert.equal(row[5], installRate, `${sku} company installation rate should not change`);
  assert.equal(row[8], fixedSpeedIndex, `${sku} company system field should match the confirmed fixed-speed system`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.ratedCapacityKw.value, ratedKw);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.ratedInputW.value, inputW);
  assert.equal(model.fields.power.value, power);
  assert.equal(model.fields.inverter.value, false);
  assert.equal(model.fields.refrigerant.value, 'R-410A');
  assert.equal(model.fields.indoorWidth.value, width);
  assert.equal(model.fields.indoorHeight.value, height);
  assert.equal(model.fields.indoorDepth.value, depth);
  assert.equal(model.fields.pipeLiquid.value, liquid);
  assert.equal(model.fields.pipeGas.value, gas);
}

const carrierTechv2026 = evidence.sources.find(source => source.sourceId === 'CARRIER_TECHV_TECHS_2026');
assert.ok(carrierTechv2026, 'the official Carrier 2026 TECH V/TECH S catalog should be retained');
assert.equal(carrierTechv2026.sha256, '3112b7a411a70656a34346fccb568ae9ea815d432416cbc4cf1edd9256a449ab');
const nvaaModels = [
  ['42NVAA010/38NVAA010', '42NVAA010', '38NVAA010', 9000, 9000, 9900, 3800, 3300, 9500, 17.88, 720, 3.4, 715, 300, 200, 8, 732, 495, 305, 20, 0.43, '6.35 mm (1/4 inch)', '9.52 mm (3/8 inch)', 20, 8, 10],
  ['42NVAA013/38NVAA013', '42NVAA013', '38NVAA013', 12000, 12000, 10900, 3800, 3600, 12600, 18.05, 1090, 5.1, 865, 300, 200, 9, 732, 495, 305, 22, 0.45, '6.35 mm (1/4 inch)', '9.52 mm (3/8 inch)', 20, 8, 12],
  ['42NVAA018/38NVAA018', '42NVAA018', '38NVAA018', 18000, 18000, 14300, 4500, 7200, 19000, 17.98, 1650, 7.7, 972, 320, 225, 13, 787, 521, 280, 29, 0.8, '6.35 mm (1/4 inch)', '12.70 mm (1/2 inch)', 20, 10, 12],
  ['42NVAA024/38NVAA024', '42NVAA024', '38NVAA024', 24500, 24000, 19400, 5200, 8600, 25500, 19.04, 2250, 10.5, 1080, 335, 226, 14, 841, 702, 382, 43, 0.9, '9.52 mm (3/8 inch)', '15.88 mm (5/8 inch)', 25, 10, 24],
];
for (const [sku, indoor, outdoor, btu, companyBtuBand, sellingPrice, installRate, rangeMin, rangeMax, seer, inputW, currentA, width, height, depth, indoorWeight, outdoorWidth, outdoorHeight, outdoorDepth, outdoorWeight, chargeKg, liquid, gas, maxPipe, maxLift, extraCharge] of nvaaModels) {
  const row = site.prods.find(candidate => candidate[1] === 'Carrier' && normalize(candidate[2]) === normalize(sku));
  const model = evidence.models.find(candidate => candidate.brandId === 'carrier' && candidate.type === 'wall' && normalize(candidate.sku) === normalize(sku));
  assert.ok(row, `${sku} company catalog row should remain available`);
  assert.ok(model, `${sku} should link to the exact manufacturer indoor/outdoor pair`);
  assert.equal(row[3], companyBtuBand, `${sku} company Pricebook BTU band should remain unchanged`);
  assert.equal(row[4], sellingPrice, `${sku} selling price before VAT should remain unchanged`);
  assert.equal(row[5], installRate, `${sku} installation rate should remain unchanged`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.capacityRangeBtu.value, `${rangeMin.toLocaleString('en-US')}–${rangeMax.toLocaleString('en-US')}`);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.ratedInputW.value, inputW);
  assert.equal(model.fields.ratedCurrentA.value, currentA);
  assert.equal(model.fields.power.value, '220 V / 1 Phase / 50 Hz');
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.inverter.value, true);
  assert.equal(model.fields.indoorWidth.value, width);
  assert.equal(model.fields.indoorHeight.value, height);
  assert.equal(model.fields.indoorDepth.value, depth);
  assert.equal(model.fields.indoorWeight.value, indoorWeight);
  assert.equal(model.fields.outdoorWidth.value, outdoorWidth);
  assert.equal(model.fields.outdoorHeight.value, outdoorHeight);
  assert.equal(model.fields.outdoorDepth.value, outdoorDepth);
  assert.equal(model.fields.outdoorWeight.value, outdoorWeight);
  assert.equal(model.fields.refrigerantCharge.value, chargeKg);
  assert.equal(model.fields.pipeLiquid.value, liquid);
  assert.equal(model.fields.pipeGas.value, gas);
  assert.equal(model.fields.maxPipe.value, maxPipe);
  assert.equal(model.fields.maxLift.value, maxLift);
  assert.equal(model.fields.chargeFreePipeLengthM.value, 7);
  assert.equal(model.fields.additionalRefrigerantChargeRate.value, extraCharge);
}

const carrierFixedSeries = [
  {
    sourceId: 'CARRIER_COPPER7_TSAA_2025',
    sha256: 'f5d842fac58005dd8b797939bc9e59b941aaba160ee7ac1e1c9cd6bf4e7414aa',
    series: 'Copper 7 (TSAA)',
    models: [
      ['42TSAA010', '42TSAA010', '38TSAA010', 9200, 13.49, 760, 3.60, 370, '28/31/35/38/42', [770, 288, 225], 9, 49, [780, 550, 290], 30, 0.63, 6.35, 9.52, 2, 15, 5, 5],
      ['42TSAA013', '42TSAA013', '38TSAA013', 12200, 13.35, 970, 4.60, 512, '31/36/40/43/47', [798, 293, 230], 9, 50, [780, 550, 290], 31, 0.66, 6.35, 12.70, 2, 15, 6, 5],
      ['42TSAA018A', '42TSAA018A', '38TSAA018A', 18000, 13.17, 1450, 6.90, 665, '35/38/41/44/47', [1050, 320, 250], 14, 54, [780, 550, 290], 43, 0.99, 6.35, 12.70, 2, 20, 8, 5],
      ['42TSAA025', '42TSAA025', '38TSAA025', 25250, 13.23, 2030, 9.60, 812, '38/42/45/48/51', [1050, 320, 250], 16, 55, [900, 890, 320], 61, 1.85, 6.35, 15.88, 2, 25, 10, 5],
    ],
  },
  {
    sourceId: 'CARRIER_TECHV_TECHS_NSAA_2026',
    sha256: '3112b7a411a70656a34346fccb568ae9ea815d432416cbc4cf1edd9256a449ab',
    series: 'TECH S (NSAA)',
    models: [
      ['42NSAA010 / 38NSAA010', '42NSAA010', '38NSAA010', 9000, 13.17, 710, 3.30, 365, '30/33/36', [865, 300, 200], 10, 52, [732, 495, 305], 23, 0.44, 6.35, 9.52, 4, 20, 8],
      ['42NSAA013 / 38NSAA013', '42NSAA013', '38NSAA013', 12000, 13.82, 960, 4.40, 383, '32/35/38', [865, 300, 200], 10, 53, [732, 495, 305], 28, 0.55, 6.35, 12.70, 4, 20, 8],
      ['42NSAA018 / 38NSAA018', '42NSAA018', '38NSAA018', 18000, 13.65, 1450, 6.60, 589, '36/41/44', [972, 320, 225], 11, 54, [787, 521, 280], 36, 0.76, 6.35, 12.70, 4, 20, 10],
      ['42NSAA024 / 38NSAA024', '42NSAA024', '38NSAA024', 24500, 13.68, 1970, 9.00, 795, '39/43/46', [1080, 335, 226], 14, 57, [841, 702, 382], 49, 1.35, 9.52, 15.88, 4, 25, 10],
    ],
  },
];
for (const group of carrierFixedSeries) {
  const source = evidence.sources.find(candidate => candidate.sourceId === group.sourceId);
  assert.ok(source, `${group.series} records must retain the official Carrier catalogue`);
  assert.equal(source.sha256, group.sha256);
  assert.match(source.href, /^https:\/\/carrierthailand\.com\/wp-content\/uploads\//);
  for (const [sku, indoor, outdoor, btu, seer, watts, amps, airflow, noise, indoorDims, indoorKg, outdoorDb, outdoorDims, outdoorKg, chargeKg, liquid, gas, minPipe, maxPipe, maxLift, stars] of group.models) {
    const model = evidence.models.find(candidate => candidate.brandId === 'carrier' && candidate.type === 'wall' && candidate.sku === sku);
    assert.ok(model, `${sku} should be present with its exact Carrier model identity`);
    assert.equal(model.sku, sku);
    assert.equal(model.indoorModel, indoor);
    assert.equal(model.outdoorModel, outdoor);
    assert.equal(model.fields.series.value, group.series);
    assert.equal(model.fields.btu.value, btu);
    assert.equal(model.fields.inverter.value, false, `${sku} is explicitly fixed-speed`);
    assert.equal(model.fields.seer.value, seer);
    assert.equal(model.fields.ratedInputW.value, watts);
    assert.equal(model.fields.ratedCurrentA.value, amps);
    assert.equal(model.fields.power.value, '220V / 1 Ph / 50Hz');
    assert.equal(model.fields.indoorAirflowCfm.value, airflow);
    assert.equal(model.fields.indoorNoiseLevels.value, noise);
    assert.deepEqual([model.fields.indoorWidth.value, model.fields.indoorHeight.value, model.fields.indoorDepth.value], indoorDims);
    assert.equal(model.fields.indoorWeight.value, indoorKg);
    assert.equal(model.fields.outdoorNoise.value, outdoorDb);
    assert.deepEqual([model.fields.outdoorWidth.value, model.fields.outdoorHeight.value, model.fields.outdoorDepth.value], outdoorDims);
    assert.equal(model.fields.outdoorWeight.value, outdoorKg);
    assert.equal(model.fields.refrigerant.value, 'R32');
    assert.equal(model.fields.refrigerantCharge.value, chargeKg);
    assert.equal(model.fields.compressor.value, 'Rotary');
    assert.equal(model.fields.pipeLiquid.value, liquid);
    assert.equal(model.fields.pipeGas.value, gas);
    assert.equal(model.fields.minPipe.value, minPipe);
    assert.equal(model.fields.maxPipe.value, maxPipe);
    assert.equal(model.fields.maxLift.value, maxLift);
    assert.match(model.fields.powerNote.value, /ไม่ระบุจำนวนสายตัวนำ ขนาดสายไฟเมนหรือสายเชื่อม และพิกัดเบรกเกอร์/);
    assert.equal(model.fields.breakerA, undefined, 'a breaker rating must not be inferred from operation current');
    assert.equal(model.fields.mainsCable, undefined, 'the catalogue does not state mains cable count or size');
    assert.equal(model.fields.interconnectCable, undefined, 'the catalogue does not state interconnection cable count or size');
    assert.equal(model.fields.energyLabelStars?.value, stars, `${sku} should include the clearly printed 2025 Energy Grade`);
    assert.ok(Object.values(model.fields).every(field => field.sourceIndex === evidence.sources.indexOf(source)));
  }
}
assert.equal(evidence.models.filter(model => model.brandId === 'carrier' && model.type === 'wall' && /^(42TSAA|42NSAA)/.test(model.indoorModel || '')).length, 8);
assert.equal(evidence.models.find(model => model.indoorModel === '42NSAA013').fields.energyLabelStars, undefined, 'ambiguous 2026 Energy Grade mark is withheld');

const daikinFtmSource = evidence.sources.find(source => source.sourceId === 'DAIKIN_FTM_PV2S_OFFICIAL_MANUAL');
assert.ok(daikinFtmSource, 'Daikin FTM-PV2S entries must retain the official model-specific manual');
assert.equal(daikinFtmSource.sha256, '4aae2679d8e4655bc5392215a0ade073ad94446fd6a119a894fdd9ec701d6390');
const daikinFtmModels = evidence.models.filter(model => model.brandId === 'daikin' && model.type === 'wall' && model.fields.series?.value === 'FTM-PV2S');
assert.equal(daikinFtmModels.length, 5, 'five exact FTM-PV2S model pairs present in the site catalog should be represented');
for (const [indoor, outdoor, kw, amps, watts, indoorDims, indoorKg, outdoorDims, outdoorKg] of [
  ['FTM09PV2S', 'RM09PV2S', 2.7, 3.5, 730, [770, 283, 223], 8, [658, 550, 275], 32],
  ['FTM13PV2S', 'RM13PV2S', 3.8, 4.8, 1040, [770, 283, 223], 9, [765, 550, 285], 38],
  ['FTM15PV2S', 'RM15PV2S', 4.2, 4.9, 1063, [990, 295, 263], 13, [765, 550, 285], 35],
  ['FTM18PV2S', 'RM18PV2S', 5.3, 6.8, 1472, [990, 295, 263], 13, [845, 595, 300], 41],
  ['FTM24PV2S', 'RM24PV2S', 6.6, 8.7, 1835, [990, 295, 263], 13, [900, 770, 320], 60],
]) {
  const model = daikinFtmModels.find(candidate => candidate.indoorModel === indoor && candidate.outdoorModel === outdoor);
  assert.ok(model, `exact Daikin indoor/outdoor pair should be present: ${indoor}/${outdoor}`);
  assert.equal(model.fields.ratedCapacityKw.value, kw);
  assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.equal(model.fields.ratedInputW.value, watts);
  assert.equal(model.fields.power.value, '220 V / 50 Hz');
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.deepEqual([model.fields.indoorWidth.value, model.fields.indoorHeight.value, model.fields.indoorDepth.value], indoorDims);
  assert.equal(model.fields.indoorWeight.value, indoorKg);
  assert.deepEqual([model.fields.outdoorWidth.value, model.fields.outdoorHeight.value, model.fields.outdoorDepth.value], outdoorDims);
  assert.equal(model.fields.outdoorWeight.value, outdoorKg);
  assert.match(model.fields.powerNote.value, /ไม่ได้ระบุจำนวนเฟส/);
  assert.equal(model.fields.btu, undefined, 'do not convert kW into a manufacturer-published BTU rating');
  assert.equal(model.fields.breakerA, undefined, 'do not infer breaker rating from current');
  assert.equal(model.fields.mainsCable, undefined, 'manual does not state mains cable count or size');
  assert.equal(model.fields.interconnectCable, undefined, 'manual does not state interconnect cable count or size');
  assert.ok(Object.values(model.fields).every(field => field.sourceIndex === evidence.sources.indexOf(daikinFtmSource)));
}

const tclPremiumSource = evidence.sources.find(source => source.sourceId === 'TCL_BREEZEIN_PREMIUM_OFFICIAL_PRODUCT_PAGE');
assert.ok(tclPremiumSource, 'TCL BreezeIN Premium entries must retain the exact official product page');
assert.equal(tclPremiumSource.sha256, 'cbedd10acadbcdac29d5273d3e7806ba9d072344b5b45ee0c2fad68d8f8b7327');
const tclPremiumModels = evidence.models.filter(model => model.brandId === 'tcl' && model.type === 'wall' && model.fields.series?.value === 'BreezeIN Premium Series');
assert.equal(tclPremiumModels.length, 4, 'only exact TCL BreezeIN Premium model selectors should be included');
for (const [modelCode, range, stars, btu, current, input, seer, dimensions] of [
  ['TAC-PRO09PE', '2,730–10,240', 4, 9895, 2.9, 630, 23.95, [920, 195, 306]],
  ['TAC-PRO12PE', '2,545–12,965', 4, 12283, 4.0, 870, 23.37, [920, 195, 306]],
  ['TAC-PRO18PE', '5,285–19,790', 4, 18425, 6.3, 1355, 23.13, [1097, 222, 332]],
  ['TAC-PRO24PE', '6,140–25,000', 3, 23884, 8.6, 1860, 22.49, [1097, 222, 332]],
]) {
  const model = tclPremiumModels.find(candidate => candidate.indoorModel === modelCode);
  assert.ok(model, `exact TCL Premium model should be present: ${modelCode}`);
  assert.equal(model.sku, modelCode);
  assert.equal(model.outdoorModel, null, 'outdoor model code is not published on the retained page');
  assert.equal(model.fields.capacityRangeBtu.value, range);
  assert.equal(model.fields.energyLabelStars.value, stars);
  assert.equal(model.fields.inverter.value, true);
  assert.equal(model.fields.btu.value, btu, 'official per-model rated BTU is separate from the variable capacity range');
  assert.equal(model.fields.ratedCurrentA.value, current);
  assert.equal(model.fields.ratedInputW.value, input);
  assert.equal(model.fields.seer.value, seer);
  assert.deepEqual([model.fields.indoorWidth.value, model.fields.indoorHeight.value, model.fields.indoorDepth.value], dimensions);
  assert.equal(model.fields.power.value, '220–240 V / 1 Phase / 50 Hz');
  assert.match(model.fields.powerNote.value, /ระบุ.*1 เฟส.*Connecting Wiring.*ไม่ใช่จำนวนเฟส/);
  assert.equal(model.fields.interconnectCable.value, modelCode.endsWith('09PE') || modelCode.endsWith('12PE') ? '4 × 1.0 mm²' : modelCode.endsWith('18PE') ? '4 × 1.5 mm²' : '4 × 0.75 mm²');
  assert.equal(model.fields.breakerA, undefined);
  assert.equal(model.fields.mainsCable, undefined);
  const sourceId = `TCL_TH_BREEZEIN_PREMIUM_SERIES_${modelCode.replace(/[^A-Za-z0-9]+/g, '_')}_2026-10-16`;
  const apiSource = evidence.sources.find(source => source.sourceId === sourceId);
  assert.ok(apiSource, `${modelCode} must retain a hash-verified model specification API response`);
  assert.match(apiSource.sha256, /^[a-f0-9]{64}$/i);
  assert.ok(Object.values(model.fields).filter(field => field.sourceIndex === evidence.sources.indexOf(apiSource)).length >= 20);
  assert.deepEqual([model.fields.indoorWidth.value, model.fields.indoorHeight.value, model.fields.indoorDepth.value], dimensions);
}

const tclExactModels = [
  ['TAC-BR10CSV/TB', 'BreezeIN WiFi Series', 9200, 9500, 736, 3.2, 18.87, [790, 275, 192], 9.52, '4 × 0.75 mm²', '3 × 1.5 mm²', 'TCL_TH_BREEZEIN_WIFI_SERIES_TAC_BR10CSV_TB_2026-10-16', 9500, 3800],
  ['TAC-BR13CSV/TB', 'BreezeIN WiFi Series', 12300, 12000, 1181, 5.2, 18.94, [790, 275, 192], 9.52, '4 × 0.75 mm²', '3 × 1.5 mm²', 'TCL_TH_BREEZEIN_WIFI_SERIES_TAC_BR13CSV_TB_2026-10-16', 10700, 3800],
  ['TAC-BR19CSV/TB', 'BreezeIN WiFi Series', 18400, 18000, 1672, 7.5, 19.31, [920, 306, 195], 12.7, '4 × 0.75 mm²', '3 × 1.5 mm²', 'TCL_TH_BREEZEIN_WIFI_SERIES_TAC_BR19CSV_TB_2026-10-16', 15500, 4500],
  ['TAC-BR25CSV/TB', 'BreezeIN WiFi Series', 24200, 24000, 2283, 10.5, 19.11, [1100, 333, 222], 12.7, '4 × 0.75 mm²', '3 × 1.5 mm²', 'TCL_TH_BREEZEIN_WIFI_SERIES_TAC_BR25CSV_TB_2026-10-16', 19400, 5200],
  ['TAC-MFS10', 'New Miracle Series', 9000, 9500, 680, 3.2, 13.51, [816, 205, 291], 9.52, '3 × 1.00 mm²', null, 'TCL_TH_NEW_MIRACLE_SERIES_TAC_MFS10_2026-10-16', 9000, 3800],
  ['TAC-MFS13', 'New Miracle Series', 12520, 12000, 945, 4.4, 13.55, [816, 205, 291], 9.52, '3 × 1.00 mm²', null, 'TCL_TH_NEW_MIRACLE_SERIES_TAC_MFS13_2026-10-16', 9800, 3800],
  ['TAC-MFS19', 'New Miracle Series', 18603, 18000, 1405, 6.5, 13.48, [1010, 220, 315], 12.7, '3 × 1.50 mm²', null, 'TCL_TH_NEW_MIRACLE_SERIES_TAC_MFS19_2026-10-16', 14600, 4500],
  ['TAC-SA30CSV/ZB', 'SaveIN F1 Series', 30000, 30000, 2399, 12.5, 18.8, [1220, 362, 251], 15.88, '4 × 0.75 mm²', '3 × 2.5 mm²', 'TCL_TH_SAVEIN_F1_SERIES_TAC_SA30CSV_ZB_2026-10-16', 25700, 6000],
];
for (const [sku, series, btu, companyBtu, watts, amps, seer, indoorDims, gasMm, wiring, cord, sourceId, price, install] of tclExactModels) {
  const row = site.prods.find(candidate => candidate[1] === 'TCL' && candidate[2] === sku);
  const model = evidence.models.find(candidate => candidate.brandId === 'tcl' && candidate.type === 'wall' && candidate.sku === sku);
  assert.ok(row && model, `${sku} should match one exact official manufacturer model record`);
  assert.equal(row[3], companyBtu, `${sku} keeps the company Pricebook BTU band`);
  assert.equal(row[4], price, `${sku} keeps the approved company sale price`);
  assert.equal(row[5], install, `${sku} keeps the company installation rate`);
  assert.equal(model.indoorModel, sku);
  assert.equal(model.outdoorModel, null, 'the product specification page does not publish a separate outdoor model code');
  assert.equal(model.fields.series.value, series);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.ratedInputW.value, watts);
  assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.equal(model.fields.seer.value, seer);
  assert.deepEqual([model.fields.indoorWidth.value, model.fields.indoorHeight.value, model.fields.indoorDepth.value], indoorDims);
  assert.ok(model.fields.pipeGas.value.startsWith(`${gasMm} mm (`));
  assert.equal(model.fields.pipeLiquid.value, '6.35 mm (1/4 in)');
  assert.equal(model.fields.power.value, sku.startsWith('TAC-BR') || sku.startsWith('TAC-SA30')
    ? '220–240 V / 1 Phase / 50/60 Hz · Outdoor supply'
    : '220–240 V / 1 Phase / 50 Hz');
  assert.equal(model.fields.interconnectCable.value, wiring);
  assert.equal(model.fields.powerCord?.value ?? null, cord);
  assert.match(model.fields.powerNote.value, /ระบุ.*1 เฟส.*Connecting Wiring.*ไม่ใช่จำนวนเฟส/);
  assert.equal(model.fields.breakerA, undefined, 'do not infer a breaker from rated or maximum current');
  assert.equal(model.fields.mainsCable, undefined, 'a factory power cord is not a field-installed mains cable');
  const apiSource = evidence.sources.find(source => source.sourceId === sourceId);
  assert.ok(apiSource, `${sku} must retain a manufacturer API evidence source`);
  assert.ok(Object.values(model.fields).filter(field => field.sourceIndex === evidence.sources.indexOf(apiSource)).length >= 20);
}

const panasonicYnSource = evidence.sources.find(source => source.sourceId === 'PANASONIC_YN_SERIES_2025_OFFICIAL_CATALOGUE');
assert.ok(panasonicYnSource, 'Panasonic YN entries must retain their exact official catalogue source');
assert.equal(panasonicYnSource.sha256, '6833326c0c4f2cc630419bcf0bc03d5889f0814c57df83c304ab53fecbb40cec');
assert.match(panasonicYnSource.href, /^https:\/\/www\.panasonic\.com\/content\/dam\//);
const panasonicYnCurrentSource = evidence.sources.find(source => source.sourceId === 'PANASONIC_YN_CURRENT_OFFICIAL_PRODUCT_PAGE');
assert.ok(panasonicYnCurrentSource, 'Panasonic YN BTU fields must retain a current official product-page source');
assert.equal(panasonicYnCurrentSource.sha256, 'e9a263f7c9131bb0a555243ca8f9029d3ba56d054210c3033c3ac2b33e58e350');
const panasonicYn = evidence.models.filter(model => model.brandId === 'panasonic' && model.type === 'wall' && model.indoorModel?.startsWith('CS-YN') && model.indoorModel.endsWith('YKT'));
assert.equal(panasonicYn.length, 4, 'four exact Panasonic YN (YKT) indoor/outdoor pairs should be cataloged');
for (const [indoor, outdoor, btu, amps, watts, dims, pipeGas, maxPipe] of [
  ['CS-YN9YKT', 'CU-YN9YKT', 9220, 3.35, 724, [835, 295, 208], '9.52 mm (3/8 นิ้ว)', 20],
  ['CS-YN12YKT', 'CU-YN12YKT', 12162, 4.53, 966, [835, 295, 208], '12.7 mm (1/2 นิ้ว)', 20],
  ['CS-YN18YKT', 'CU-YN18YKT', 18094, 6.4, 1425, [969, 320, 241], '12.7 mm (1/2 นิ้ว)', 25],
  ['CS-YN24YKT', 'CU-YN24YKT', 23985, 8.6, 1900, [1083, 336, 244], '15.9 mm (5/8 นิ้ว)', 25],
]) {
  const model = panasonicYn.find(candidate => candidate.indoorModel === indoor && candidate.outdoorModel === outdoor);
  assert.ok(model, `exact Panasonic paired model should be present: ${indoor}/${outdoor}`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.btu.sourceIndex, evidence.sources.indexOf(panasonicYnCurrentSource));
  assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.equal(model.fields.ratedInputW.value, watts);
  assert.equal(model.fields.inverter.value, false);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.power.value, '220 V / 50 Hz');
  assert.match(model.fields.powerNote.value, /ไม่ระบุจำนวนเฟส/);
  assert.deepEqual([model.fields.indoorWidth.value, model.fields.indoorHeight.value, model.fields.indoorDepth.value], dims);
  assert.equal(model.fields.pipeGas.value, pipeGas);
  assert.equal(model.fields.maxPipe.value, maxPipe);
  assert.equal(model.fields.energyLabelStars.value, 5);
}

const carrierTgvSource = evidence.sources.find(source => source.sourceId === 'CARRIER_XPOWER_TGV_OFFICIAL_CATALOGUE');
assert.ok(carrierTgvSource, 'Carrier TGV entries must retain the official XPower TGV catalogue');
assert.equal(carrierTgvSource.sha256, 'ea1c3980a84f8dde41efd5fbce671118b000a3f093d96947b27ac2885cdeb08f');
const carrierTgvModels = evidence.models.filter(model => model.brandId === 'carrier' && model.type === 'ceiling' && model.indoorModel?.startsWith('42TGV'));
assert.equal(carrierTgvModels.length, 12, 'only exact XPower TGV indoor/outdoor catalogue columns should be included');
for (const [outdoor, indoor, btu, power, amps, watts, seer] of [
  ['38TGV0131A1', '42TGV0131CP', 13300, '220V / 1Ph / 50Hz', 4.35, 880, 23.30],
  ['38TGV0181A1', '42TGV0181CP', 18100, '220V / 1Ph / 50Hz', 7.25, 1500, 21.40],
  ['38TGV0241A1', '42TGV0241CP', 24200, '220V / 1Ph / 50Hz', 10.20, 2200, 18.50],
  ['38TGV0251A1', '42TGV0251CP', 25200, '220V / 1Ph / 50Hz', 9.50, 1960, 22.72],
  ['38TGV0301A1', '42TGV0301CP', 30000, '220V / 1Ph / 50Hz', 12.40, 2560, 20.85],
  ['38TGV0361A1', '42TGV0361CP', 36100, '220V / 1Ph / 50Hz', 15.20, 3180, 20.00],
  ['38TGV0361A3', '42TGV0361CP', 36100, '380V / 3Ph / 50Hz', 5.30, 3180, 20.00],
  ['38TGV0391A3', '42TGV0391CP', 38500, '380V / 3Ph / 50Hz', 5.35, 3250, 21.50],
  ['38TGV0401A1', '42TGV0401CP', 40200, '220V / 1Ph / 50Hz', 16.20, 3390, 20.30],
  ['38TGV0401A3', '42TGV0401CP', 40200, '380V / 3Ph / 50Hz', 5.60, 3390, 20.30],
  ['38TGV0481A3', '42TGV0481CP', 48000, '380V / 3Ph / 50Hz', 7.70, 4700, 17.33],
  ['38TGV0601A3', '42TGV0601CP', 60700, '380V / 3Ph / 50Hz', 9.60, 5930, 17.30],
]) {
  const sku = `${outdoor}/${indoor}`;
  const model = carrierTgvModels.find(candidate => candidate.outdoorModel === outdoor && candidate.indoorModel === indoor);
  assert.ok(model, `${sku} must be an exact Carrier TGV catalogue pair`);
  assert.equal(normalize(model.sku), normalize(sku));
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.power.value, power);
  assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.equal(model.fields.ratedInputW.value, watts);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.inverter.value, true);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.match(model.fields.powerNote.value, /ไม่ระบุจำนวนสาย/);
  assert.equal(model.fields.interconnectCable, undefined, 'the catalogue does not specify interconnection wiring');
  assert.equal(model.fields.breakerA, undefined, 'breaker rating must not be inferred from operating current');
  assert.ok(Object.values(model.fields).every(field => field.sourceIndex === evidence.sources.indexOf(carrierTgvSource)));
}

const carrierTgfSource = evidence.sources.find(source => source.sourceId === 'CARRIER_TGF_OFFICIAL_CATALOGUE_2023');
assert.ok(carrierTgfSource, 'Carrier TGF entries must retain the official June 2023 TGF catalogue');
assert.equal(carrierTgfSource.sha256, '44d67fb7635f5eb39bd75d7bf28acedb3c7defff433df75bbcc33d4d4b2a4b1c');
for (const [outdoor, indoor, btu, power, amps, watts, seer, indoorDims, outdoorDims, pipeLiquid, pipeGas, maxPipe, maxLift] of [
  ['38TGF0181A1', '42TGF0181CP', 18700, '220V / 1 Ph / 50Hz', 7.30, 1540, 12.94, '235 × 950 × 690 mm (H × W × D)', '550 × 780 × 290 mm (H × W × D)', '1/4', '1/2', 20, 10],
  ['38TGF0361A3', '42TGF0361CP', 36100, '380V / 3 Ph / 50Hz', 5.50, 3090, 12.43, '235 × 1,586 × 690 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', '3/8', '5/8', 30, 20],
  ['38TGF0401A3', '42TGF0401CP', 40200, '380V / 3 Ph / 50Hz', 8.08, 3440, 12.43, '235 × 1,586 × 690 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', '3/8', '3/4', 30, 20],
]) {
  const sku = `${outdoor}/${indoor}`;
  const model = evidence.models.find(candidate => candidate.brandId === 'carrier' && candidate.type === 'ceiling' && candidate.outdoorModel === outdoor && candidate.indoorModel === indoor);
  assert.ok(model, `${sku} must be an exact Carrier TGF catalogue pair`);
  assert.equal(normalize(model.sku), normalize(sku));
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.power.value, power);
  assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.equal(model.fields.ratedInputW.value, watts);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.indoorDimReported.value, indoorDims);
  assert.equal(model.fields.outdoorDimReported.value, outdoorDims);
  assert.equal(model.fields.pipeLiquid.value, pipeLiquid);
  assert.equal(model.fields.pipeGas.value, pipeGas);
  assert.equal(model.fields.maxPipe.value, maxPipe);
  assert.equal(model.fields.maxLift.value, maxLift);
  assert.match(model.fields.powerNote.value, /ไม่ระบุจำนวนสาย/);
  assert.equal(model.fields.inverter, undefined, 'the TGF catalogue does not label these models as inverter or fixed-speed');
  assert.equal(model.fields.breakerA, undefined, 'breaker rating must not be inferred from operating current');
  assert.equal(model.fields.interconnectCable, undefined, 'the TGF catalogue does not specify interconnection wiring');
  assert.ok(Object.values(model.fields).every(field => field.sourceIndex === evidence.sources.indexOf(carrierTgfSource)));
}

const mitsubishiPcModels = evidence.models.filter(model => model.brandId === 'mitsubishi-electric' && model.type === 'ceiling' && /^PC-M(?:18|24|30|36)KAKL$/.test(model.indoorModel || ''));
assert.equal(mitsubishiPcModels.length, 4, 'four exact PC-M under-ceiling models have official page evidence');
for (const [sku, btu, phase, indoorWidth, outdoorWeight] of [
  ['PC-M18KAKL', 17401, '220 V / 1 Phase / 50 Hz', 1280, 34],
  ['PC-M24KAKL', 22519, '220 V / 1 Phase / 50 Hz', 1280, 51],
  ['PC-M30KAKL', 30026, '220 V / 1 Phase / 50 Hz', 1600, 63],
  ['PC-M36KAKL', 36167, '220 V / 1 Phase / 50 Hz', 1600, 81],
]) {
  const model = mitsubishiPcModels.find(candidate => candidate.sku === sku);
  assert.ok(model, `${sku} should be present`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.power.value, phase);
  assert.equal(model.fields.indoorWidth.value, indoorWidth);
  assert.equal(model.fields.outdoorWeight.value, outdoorWeight);
  assert.equal(model.fields.inverter.value, false, `${sku} is listed as fixed-speed`);
  assert.equal(model.fields.breakerA, undefined, `${sku} breaker is not inferred from the product page`);
  assert.equal(model.fields.mainsCable, undefined, `${sku} mains cable is not inferred from the product page`);
  assert.equal(model.fields.interconnectCable, undefined, `${sku} interconnection cable is not inferred from the product page`);
}

const daikinFcfcSource = evidence.sources.find(source => source.sourceId === 'DAIKIN_FCFC_EV2S_OFFICIAL_PRODUCT_PAGE');
const daikinLivePageSourceIndex = evidence.sources.findIndex(source => source.sourceId === 'DAIKIN_PRODUCT_COMPARE_20261016');
const daikinFcfcModels = evidence.models.filter(model => model.brandId === 'daikin' && model.type === 'cassette' && /^FCFC/.test(model.indoorModel || '') && model.fields.series?.value === 'FCFC-EV2S');
assert.ok(daikinFcfcSource, 'Daikin FCFC evidence must retain its official product page and capture hash');
assert.equal(daikinFcfcModels.length, 6, 'only six unique FCFC-EV2S catalog rows can be matched without ambiguity');
for (const [sku, indoor, outdoor, btu, power, pipeGas] of [
  ['FCFC13EV2S', 'FCFC13EV2S', 'RZFC13EV2S', 13600, '220V / 1Phase / 50Hz', 12.7],
  ['FCFC18EV2S', 'FCFC18EV2S', 'RZFC18EV2S', 18000, '220V / 1Phase / 50Hz', 12.7],
  ['FCFC24EV2S', 'FCFC24EV2S', 'RZFC24EV2S', 24000, '220V / 1Phase / 50Hz', 15.9],
  ['FCFC36EV2S', 'FCFC36EV2S', 'RZFC36EV2S', 36000, '220 V / 1 Phase / 50 Hz', 15.9],
  ['FCFC42EV2S/RZFC42EY2S', 'FCFC42EV2S', 'RZFC42EY2S', 42000, '380V / 3Phase / 50Hz', 15.9],
  ['FCFC48EV2S/RZFC48EY2S', 'FCFC48EV2S', 'RZFC48EY2S', 48000, '380V / 3Phase / 50Hz', 15.9],
]) {
  const model = daikinFcfcModels.find(candidate => normalize(candidate.sku) === normalize(sku));
  assert.ok(model, `${sku} must be an exact Daikin product-page match`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.power.value, power);
  assert.equal(model.fields.pipeGas.value, pipeGas);
  assert.equal(model.fields.indoorDimReported.value.endsWith('(H × W × D)'), true);
  assert.equal(model.fields.outdoorDimReported.value.endsWith('(H × W × D)'), true);
  assert.equal(model.fields.indoorAirflowCfm.label, 'ปริมาณลมคอยล์เย็นตามระดับที่ผู้ผลิตแสดง');
  assert.equal(model.fields.indoorNoiseLevels.label, 'ระดับเสียงคอยล์เย็นตามลำดับที่ผู้ผลิตแสดง');
  assert.equal(model.fields.ratedCurrentA, undefined, 'Daikin page watt input must not be misrepresented as rated current');
  assert.equal(model.fields.breakerA, undefined, 'no breaker rating may be inferred from product-page specifications');
  const expectedSourceIndex = model.sku === 'FCFC36EV2S' ? daikinLivePageSourceIndex : evidence.sources.indexOf(daikinFcfcSource);
  assert.ok(Object.values(model.fields).every(field => field.sourceIndex === expectedSourceIndex));
}

const daikinFcfSource = evidence.sources.find(source => source.sourceId === 'DAIKIN_FCF_DV2S_OFFICIAL_PRODUCT_PAGE');
const daikinFcfModels = evidence.models.filter(model => model.brandId === 'daikin' && model.type === 'cassette' && /^FCF/.test(model.indoorModel || '') && model.fields.series?.value === 'FCF-DV2S');
assert.ok(daikinFcfSource, 'Daikin FCF evidence must retain its official product page and capture hash');
assert.equal(daikinFcfModels.length, 4, 'three exact FCF-DV2S pairs and one shared indoor model with ambiguous outdoor phase are documented');
for (const [sku, outdoor, btu] of [
  ['FCF13DV2S', 'RZF13DV2S', 13880],
  ['FCF18DV2S', 'RZF18DV2S', 18090],
  ['FCF24DV2S', 'RZF24DV2S', 24230],
]) {
  const model = daikinFcfModels.find(candidate => normalize(candidate.sku) === normalize(sku));
  assert.ok(model, `${sku} should match an exact Daikin FCF-DV2S manufacturer variant`);
  assert.equal(model.outdoorModel, outdoor);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.power.value, '220V / 1 Phase / 50Hz');
  assert.equal(model.fields.pipeLiquid.value, 9.5);
  assert.equal(model.fields.pipeGas.value, 15.9);
  assert.equal(model.fields.maxPipe.value, 50);
  assert.equal(model.fields.maxLift.value, 30);
  assert.ok(Object.values(model.fields).every(field => field.sourceIndex === evidence.sources.indexOf(daikinFcfSource)));
}
const fcf36Shared = daikinFcfModels.find(model => model.sku === 'FCF36DV2S');
assert.ok(fcf36Shared, 'the shared indoor model row should keep only common specifications');
assert.equal(fcf36Shared.fields.outdoorModel, undefined);
assert.equal(fcf36Shared.fields.power, undefined);
assert.match(fcf36Shared.fields.powerNote.value, /RZF36DV2S.*1 เฟส.*RZF36DY2S.*3 เฟส/);

const plySmManual = evidence.sources.find(source => source.sourceId === 'MITSUBISHI_ELECTRIC_PLY_SM_INSTALLATION_MANUAL');
const plyMManual = evidence.sources.find(source => source.sourceId === 'MITSUBISHI_ELECTRIC_PLY_M_INSTALLATION_MANUAL');
assert.ok(plySmManual && plyMManual, 'both PLY series installation manuals must be retained as primary sources');
assert.equal(plySmManual.sha256, '07f598f0c99df95bdc4ac58cb2f1b6d53466b71f4d659970f8b92c695352f428');
assert.equal(plyMManual.sha256, 'cab337a547399f90d8e49f4a14fa22a8717dbae229c04d40aec1729f1f126109');
const plyModels = evidence.models.filter(model => model.brandId === 'mitsubishi-electric' && model.type === 'cassette' && /^PLY-(?:SM|M)(?:13|18|24|30)EA[24]$/.test(model.indoorModel || ''));
assert.equal(plyModels.length, 8, 'the exact Mitsubishi Electric PLY 13k–30k catalogue models should be covered');
for (const [sku, indoor, btu, seer, power, indoorDims, pipeLiquid, pipeGas] of [
  ['PLY-SM13EA4', 'PLY-SM13EA4', 13989, 26.37, '220 V / 1 Phase / 50 Hz', [258,840,840], '6.35 mm (1/4 in)', '12.70 mm (1/2 in)'],
  ['PLY-SM18EA4', 'PLY-SM18EA4', 18084, 26.17, '220 V / 1 Phase / 50 Hz', [258,840,840], '6.35 mm (1/4 in)', '12.70 mm (1/2 in)'],
  ['PLY-SM24EA4', 'PLY-SM24EA4', 24225, 24.48, '220 V / 1 Phase / 50 Hz', [258,840,840], '9.52 mm (3/8 in)', '15.88 mm (5/8 in)'],
  ['PLY-SM30EA4', 'PLY-SM30EA4', 30026, 22.28, '220 V / 1 Phase / 50 Hz', [298,840,840], '9.52 mm (3/8 in)', '15.88 mm (5/8 in)'],
  ['PLY-(M)13EA2', 'PLY-M13EA2', 13989, 17.49, '220 V / 1 Phase / 50 Hz', [258,840,840], '6.35 mm (1/4 in)', '12.70 mm (1/2 in)'],
  ['PLY-(M)18EA2', 'PLY-M18EA2', 18084, 17.57, '220 V / 1 Phase / 50 Hz', [258,840,840], '6.35 mm (1/4 in)', '12.70 mm (1/2 in)'],
  ['PLY-(M)24EA2', 'PLY-M24EA2', 24225, 17.49, '220 V / 1 Phase / 50 Hz', [258,840,840], '9.52 mm (3/8 in)', '15.88 mm (5/8 in)'],
  ['PLY-(M)30EA2', 'PLY-M30EA2', 30026, 16.49, '220 V / 1 Phase / 50 Hz', [298,840,840], '9.52 mm (3/8 in)', '15.88 mm (5/8 in)'],
]) {
  const model = plyModels.find(candidate => normalize(candidate.sku) === normalize(sku));
  assert.ok(model, `${sku} must match the exact Mitsubishi Electric manufacturer page`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.outdoorModel, null, 'the product detail page does not identify the exact outdoor-unit model');
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.power.value, power);
  assert.deepEqual([model.fields.indoorHeight.value,model.fields.indoorWidth.value,model.fields.indoorDepth.value], indoorDims);
  assert.equal(model.fields.pipeLiquid.value, pipeLiquid);
  assert.equal(model.fields.pipeGas.value, pipeGas);
  assert.equal(model.fields.interconnectCable.status, 'MANUFACTURER_DOCUMENT_REVIEWED');
  assert.equal(model.fields.interconnectCable.sourceIndex, evidence.sources.indexOf(indoor.startsWith('PLY-SM') ? plySmManual : plyMManual));
  assert.match(model.fields.interconnectCable.value, /3 เส้น × 1\.5 mm²/);
  assert.match(model.fields.interconnectCable.value, /สายดินแยก 1 เส้น × ไม่น้อยกว่า 1\.5 mm²/);
  assert.equal(model.fields.ratedCurrentA, undefined, 'the PLY install manual does not give an exact operating-current value here');
  assert.equal(model.fields.breakerA, undefined, 'the indoor-unit connection diagram cannot establish the matched outdoor breaker');
  assert.equal(model.fields.mainsCable, undefined, 'outdoor power wiring varies by outdoor model and was not inferred');
  assert.ok(Object.values(model.fields).every(field => field.sourceIndex === evidence.sources.indexOf(evidence.sources[field.sourceIndex])));
}
const plyM24 = plyModels.find(model => model.indoorModel === 'PLY-M24EA2');
assert.equal(plyM24.fields.outdoorDimReported, undefined, 'do not publish the official page’s apparent 2850 mm outdoor depth without a second model drawing');
assert.equal(plyM24.fields.outdoorWidth, undefined);

const daikinTisiCapacity = evidence.sources.find(source => source.sourceId === 'TISI_T5797_2079_2134_DAIKIN_FTKF_WV2S');
const daikinTisiElectrical = evidence.sources.find(source => source.sourceId === 'TISI_T6961_1_1529_DAIKIN_FTKF_WV2S');
assert.ok(daikinTisiCapacity && daikinTisiElectrical, 'the exact Daikin FTKF-WV2S TISI pair and electrical records must be retained');
assert.equal(daikinTisiCapacity.sha256, '62fa71cbc0c102b1e2ffb22b8c5bbd57ef84df0d887e5cc8df60822b616b66f7');
assert.equal(daikinTisiElectrical.sha256, '5a5a76f28d10401504f964a824c388566c4084de1b30f43a821fd31e90714046');
const daikinWvModels = evidence.models.filter(model => model.brandId === 'daikin' && /^FTKF(?:09|12|18|24)WV2S$/.test(model.indoorModel || ''));
assert.equal(daikinWvModels.length, 4, 'all four FTKF-WV2S wall models listed in the current site catalog should be evidence-backed');
for (const [indoor, outdoor, capacity, ratio, inputW] of [
  ['FTKF09WV2S', 'RKF09WV2S', 2.7, 3.14, 860],
  ['FTKF12WV2S', 'RKF12WV2S', 3.6, 3.19, 1130],
  ['FTKF18WV2S', 'RKF18WV2S', 5.3, 3.05, 1740],
  ['FTKF24WV2S', 'RKF24WV2S', 6.0, 3.11, 1930],
]) {
  const model = daikinWvModels.find(candidate => candidate.indoorModel === indoor);
  assert.ok(model, `${indoor} must match its exact TISI listing`);
  assert.equal(model.sku, indoor, 'the site SKU is the exact indoor model code');
  assert.equal(model.outdoorModel, outdoor, 'the TISI exact condenser pair must be retained');
  assert.equal(model.fields.indoorModel.value, indoor);
  assert.equal(model.fields.outdoorModel.value, outdoor);
  assert.equal(model.fields.ratedCapacityKw.value, capacity);
  assert.equal(model.fields.tisiEnergyRatio.value, ratio);
  assert.equal(model.fields.power.value, '220 V / 1 Phase / 50 Hz');
  assert.equal(model.fields.ratedInputW.value, inputW);
  for (const key of ['indoorModel', 'outdoorModel', 'ratedCapacityKw', 'tisiEnergyRatio', 'power', 'ratedInputW']) {
    const field = model.fields[key];
    assert.equal(field.status, 'REGULATORY_RECORD_REVIEWED');
    assert.equal(field.sourceIndex, evidence.sources.indexOf(['ratedCapacityKw', 'tisiEnergyRatio'].includes(key) ? daikinTisiCapacity : daikinTisiElectrical));
  }
  const row = siteRows.find(candidate => normalize(candidate.sku) === normalize(indoor));
  assert.ok(row, `${indoor} must still map to an existing site product`);
  assert.equal(row.btu, indoor === 'FTKF24WV2S' ? 24200 : ({ FTKF09WV2S: 9200, FTKF12WV2S: 12300, FTKF18WV2S: 18100 })[indoor]);
}
assert.match(daikinWvModels.find(model => model.indoorModel === 'FTKF24WV2S').dataWarnings[0].text, /6,000 W.*24,200 BTU\/h/);

const plySmLarge = evidence.models.filter(model => model.brandId === 'mitsubishi-electric' && model.type === 'cassette' && /^PLY-SM(?:36|42|48)EA4$/.test(model.indoorModel || ''));
assert.equal(plySmLarge.length, 3, 'three exact PLY-SM 36k–48k model codes have common official-page evidence');
for (const [sku, btu, seer, rated, capacityRange, hasInterconnect] of [
  ['PLY-SM36EA4', 36167, 22.28, 10.6, '4.0–10.6', true],
  ['PLY-SM42EA4', 42000, 20.60, 12.3, '6.1–12.3', false],
  ['PLY-SM48EA4', 48000, 19.06, 14.1, '7.0–14.1', true],
]) {
  const model = plySmLarge.find(candidate => candidate.sku === sku);
  assert.ok(model, `${sku} should match the exact manufacturer model code`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.ratedCapacityKw.value, rated);
  assert.equal(model.fields.capacityRangeKw.value, capacityRange);
  assert.deepEqual([model.fields.indoorHeight.value, model.fields.indoorWidth.value, model.fields.indoorDepth.value], [298, 840, 840]);
  assert.equal(model.fields.indoorWeight.value, 27);
  assert.equal(model.fields.pipeLiquid.value, '9.52 mm (3/8 in)');
  assert.equal(model.fields.pipeGas.value, '15.88 mm (5/8 in)');
  assert.equal(model.fields.maxPipe.value, 50);
  assert.equal(model.fields.maxLift.value, 30);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.power, undefined, `${sku} website SKU does not resolve its 1-phase versus 3-phase manufacturer variant`);
  assert.equal(model.fields.outdoorDimReported, undefined, `${sku} variant-dependent outdoor dimensions must remain withheld`);
  assert.equal(model.fields.outdoorWeight, undefined, `${sku} variant-dependent outdoor weight must remain withheld`);
  assert.match(model.fields.powerNote.value, /ยังไม่ระบุเฟส/);
  assert.equal(model.variantSourceIndexes.length, 2, `${sku} should retain both official phase-variant pages for comparison`);
  assert.ok(model.variantSourceIndexes.every(index => /^MITSUBISHI_ELECTRIC_PLY_SM/.test(evidence.sources[index]?.sourceId || '')));
  assert.equal(Boolean(model.fields.interconnectCable), hasInterconnect, `${sku} should only use the exact model-scope wiring manual`);
  if (hasInterconnect) assert.equal(model.fields.interconnectCable.sourceIndex, evidence.sources.indexOf(plySmManual));
}
assert.equal(plySmLarge.find(model => model.sku === 'PLY-SM42EA4').fields.interconnectCable, undefined, 'the installation-manual model list does not explicitly identify PLY-SM42EA4');

const plyMLarge = evidence.models.filter(model => model.brandId === 'mitsubishi-electric' && model.type === 'cassette' && /^PLY-\(M\)(?:36|42|48)EA2$/.test(model.sku));
assert.equal(plyMLarge.length, 3, 'three exact-normalized PLY-M 36k–48k catalog rows have common official-page evidence');
for (const [sku, indoor, btu, seer, rated, capacityRange, indoorWeight] of [
  ['PLY-(M)36EA2', 'PLY-M36EA2', 36167, 16.49, 10.6, '4.0–10.6', 24],
  ['PLY-(M)42EA2', 'PLY-M42EA2', 41968, 16, 12.3, '6.1–12.3', 27],
  ['PLY-(M)48EA2', 'PLY-M48EA2', 48109, 15, 14.1, '7.0–14.1', 27],
]) {
  const model = plyMLarge.find(candidate => candidate.sku === sku);
  assert.ok(model, `${sku} should match the normalized exact manufacturer code`);
  assert.equal(model.indoorModel, indoor);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.ratedCapacityKw.value, rated);
  assert.equal(model.fields.capacityRangeKw.value, capacityRange);
  assert.deepEqual([model.fields.indoorHeight.value, model.fields.indoorWidth.value, model.fields.indoorDepth.value], [298, 840, 840]);
  assert.equal(model.fields.indoorWeight.value, indoorWeight);
  assert.equal(model.fields.pipeLiquid.value, '9.52 mm (3/8 in)');
  assert.equal(model.fields.pipeGas.value, '15.88 mm (5/8 in)');
  assert.equal(model.fields.maxPipe.value, 50);
  assert.equal(model.fields.maxLift.value, 30);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.power, undefined, `${sku} website row does not resolve its 1-phase versus 3-phase variant`);
  assert.equal(model.fields.outdoorDimReported, undefined, `${sku} variant-dependent outdoor dimensions must remain withheld`);
  assert.equal(model.fields.outdoorWeight, undefined, `${sku} variant-dependent outdoor weight must remain withheld`);
  assert.match(model.fields.powerNote.value, /ยังไม่ระบุเฟส/);
  assert.equal(model.variantSourceIndexes.length, 2, `${sku} should retain both official phase-variant pages for comparison`);
  assert.equal(model.fields.interconnectCable.sourceIndex, evidence.sources.indexOf(plyMManual));
}

const carrierWall = evidence.models.filter(model => model.brandId === 'carrier' && /^42TV[ED]B/.test(model.indoorModel || ''));
assert.equal(carrierWall.length, 12, 'the 2026 Carrier ION and Seal source tables should cover all six exact capacities in each series');
assert.equal(evidence.sources[50]?.sha256, '0a710cadc277d5983b5befe0a98d486b07cd455415893a81a23fed8f6285bb3f');
assert.equal(evidence.sources[51]?.sha256, 'ceeaf2702d43fa7ed51a5df078f2e2ade52912d1e61ee6a3117d1e8ebdb85cb0');

const carrierCurrent = evidence.sources.find(source => source.sourceId === 'CARRIER_TGEV_4WAY_UNDERCEILING_2025');
assert.ok(carrierCurrent, 'the latest official TGEV catalogue should replace the older 2024 evidence for these products');
assert.equal(carrierCurrent.sha256, 'a27026ad1c18bbb8b8e1ab73702004026aea2b01c55154a777ee91bd3d74c995');
const carrierCassetteManual = evidence.sources.find(source => source.sourceId === 'CARRIER_40TGEV_UP_INSTALLATION_MANUAL');
const carrierCeilingManual = evidence.sources.find(source => source.sourceId === 'CARRIER_42TGEV_CP_INSTALLATION_MANUAL');
assert.ok(carrierCassetteManual && carrierCeilingManual, 'the indoor-unit manuals should prove interconnection cable details without implying outdoor mains wiring');
const carrierTgevCassette = evidence.models.filter(model => model.brandId === 'carrier' && /^40TGEV/.test(model.indoorModel || ''));
const carrierTgevCeiling = evidence.models.filter(model => model.brandId === 'carrier' && /^42TGEV/.test(model.indoorModel || ''));
assert.equal(carrierTgevCassette.length, 9, 'the official 2025 TGEV table covers nine exact 4-way cassette variants');
assert.equal(carrierTgevCeiling.length, 9, 'the official 2025 TGEV table covers nine exact under-ceiling variants');
assert.equal(carrierTgevCeiling.find(model => model.indoorModel === '42TGEV0481CP').sku, '38TGEV0481A3/42TGEV0481CP', 'the 48k under-ceiling catalog model code must match the manufacturer pair');
for (const [indoor, outdoor, btu, kw, seer, volts, amps, inputW, maxW, indoorDims, outdoorDims, maxPipe, maxLift] of [
  ['40TGEV0181UP', '38TGEV0181A1', 18100, 5.3, 17.5, '220V / 1Ph / 50Hz', 7.55, 1580, 1800, '256 × 575 × 575 mm (H × W × D)', '550 × 780 × 290 mm (H × W × D)', 25, 10],
  ['40TGEV0241UP', '38TGEV0241A1', 24200, 7.1, 17.8, '220V / 1Ph / 50Hz', 10.2, 2150, 2700, '256 × 840 × 840 mm (H × W × D)', '550 × 780 × 290 mm (H × W × D)', 25, 10],
  ['40TGEV0301UP', '38TGEV0301A1', 30000, 8.8, 17.2, '220V / 1Ph / 50Hz', 13.2, 2830, 3300, '256 × 840 × 840 mm (H × W × D)', '630 × 800 × 300 mm (H × W × D)', 30, 20],
  ['40TGEV0361UP', '38TGEV0361A1', 36100, 10.6, 17, '220V / 1Ph / 50Hz', 16.8, 3560, 4200, '256 × 840 × 840 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 30, 30],
  ['40TGEV0361UP', '38TGEV0361A3', 36100, 10.6, 17, '380V / 3Ph / 50Hz', 5.85, 3560, 4200, '256 × 840 × 840 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 30, 30],
  ['40TGEV0401UP', '38TGEV0401A1', 40200, 11.8, 18, '220V / 1Ph / 50Hz', 18.7, 3970, 4650, '319 × 840 × 840 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 30, 30],
  ['40TGEV0401UP', '38TGEV0401A3', 40200, 11.8, 18, '380V / 3Ph / 50Hz', 6.55, 3970, 4650, '319 × 840 × 840 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 30, 30],
  ['40TGEV0481UP', '38TGEV0481A3', 48000, 14.1, 16.2, '380V / 3Ph / 50Hz', 9, 5570, 6350, '319 × 840 × 840 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 30, 20],
  ['40TGEV0551UP', '38TGEV0551A3', 55600, 16.3, 15.4, '380V / 3Ph / 50Hz', 10.2, 6450, 7400, '319 × 840 × 840 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 30, 30],
]) {
  const model = carrierTgevCassette.find(candidate => candidate.indoorModel === indoor && candidate.outdoorModel === outdoor);
  assert.ok(model, `${indoor}/${outdoor} should be kept as an exact manufacturer pair`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.ratedCapacityKw.value, kw);
  assert.equal(model.fields.seer.value, seer, `${indoor}/${outdoor} should use the newer 2025 SEER value`);
  assert.equal(model.fields.power.value, volts);
  assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.ok(Number.isFinite(model.fields.maxCurrentA.value), `${indoor}/${outdoor} should expose manufacturer maximum current separately from rated current`);
  assert.equal(model.fields.ratedInputW.value, inputW);
  assert.equal(model.fields.maxInputW.value, maxW);
  assert.equal(model.fields.indoorDimReported.value, `Housing ${indoorDims}${indoor.startsWith('40TGEV018') ? '; ceiling panel 12 × 620 × 620 mm (H × W × D)' : '; ceiling panel 30 × 950 × 950 mm (H × W × D)'}`);
  assert.equal(model.fields.outdoorDimReported.value, outdoorDims);
  assert.equal(model.fields.maxPipe.value, maxPipe);
  assert.equal(model.fields.maxLift.value, maxLift);
  assert.equal(model.fields.interconnectCable.value, '4 × 1.5 mm² or larger (H07RN-F or 60245 IEC 66); maximum length 70 m');
  assert.equal(model.fields.interconnectCable.sourceIndex, evidence.sources.indexOf(carrierCassetteManual));
  assert.equal(model.fields.powerNote.sourceIndex, evidence.sources.indexOf(carrierCassetteManual));
  assert.match(model.fields.powerNote.value, /ไม่ระบุพิกัดเบรกเกอร์หรือขนาดสายไฟ/);
  assert.match(model.fields.powerNote.value, /คอยล์เย็นรับไฟจากคอยล์ร้อน/);
  assert.equal(model.fields.indoorModel.sourceIndex, evidence.sources.indexOf(carrierCurrent));
}
for (const [indoor, outdoor, btu, kw, seer, volts, amps, inputW, maxW, indoorDims, outdoorDims, indoorKg, outdoorKg, liquid, gas, minPipe, chargeFree, addedGpm, maxPipe, maxLift] of [
  ['42TGEV0181CP', '38TGEV0181A1', 18100, 5.3, 17.5, '220V / 1Ph / 50Hz', 7.55, 1580, 1800, '235 × 950 × 690 mm (H × W × D)', '550 × 780 × 290 mm (H × W × D)', 23, 27, '1/4', '1/2', 5, 15, 20, 25, 10],
  ['42TGEV0241CP', '38TGEV0241A1', 24200, 7.1, 17.8, '220V / 1Ph / 50Hz', 10.1, 2150, 2700, '235 × 1,270 × 690 mm (H × W × D)', '550 × 780 × 290 mm (H × W × D)', 29, 28, '3/8', '5/8', 5, 15, 35, 25, 10],
  ['42TGEV0301CP', '38TGEV0301A1', 30000, 8.8, 17.2, '220V / 1Ph / 50Hz', 13.1, 2790, 3300, '235 × 1,270 × 690 mm (H × W × D)', '630 × 800 × 300 mm (H × W × D)', 29, 34, '3/8', '5/8', 5, 15, 35, 30, 20],
  ['42TGEV0361CP', '38TGEV0361A1', 36100, 10.6, 17, '220V / 1Ph / 50Hz', 16.8, 3560, 4200, '235 × 1,270 × 690 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 29, 50, '3/8', '5/8', 5, 15, 35, 30, 30],
  ['42TGEV0361CP', '38TGEV0361A3', 36100, 10.6, 17, '380V / 3Ph / 50Hz', 5.85, 3560, 4200, '235 × 1,270 × 690 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 29, 50, '3/8', '5/8', 5, 15, 35, 30, 30],
  ['42TGEV0401CP', '38TGEV0401A1', 40200, 11.8, 18, '220V / 1Ph / 50Hz', 18.7, 3970, 4650, '235 × 1,586 × 690 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 37, 50, '3/8', '5/8', 5, 15, 35, 30, 30],
  ['42TGEV0401CP', '38TGEV0401A3', 40200, 11.8, 18, '380V / 3Ph / 50Hz', 6.55, 3970, 4650, '235 × 1,586 × 690 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 37, 53, '3/8', '5/8', 5, 15, 35, 30, 30],
  ['42TGEV0481CP', '38TGEV0481A3', 48000, 14.1, 16.2, '380V / 3Ph / 50Hz', 9, 5570, 6350, '235 × 1,586 × 690 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 37, 53, '3/8', '5/8', 5, 15, 35, 30, 20],
  ['42TGEV0551CP', '38TGEV0551A3', 55600, 16.3, 15.4, '380V / 3Ph / 50Hz', 10.2, 6450, 7400, '235 × 1,586 × 690 mm (H × W × D)', '890 × 900 × 320 mm (H × W × D)', 37, 58, '3/8', '5/8', 5, 15, 35, 30, 30],
]) {
  const model = carrierTgevCeiling.find(candidate => candidate.indoorModel === indoor && candidate.outdoorModel === outdoor);
  assert.ok(model, `${indoor}/${outdoor} should be kept as an exact manufacturer pair`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.ratedCapacityKw.value, kw);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.power.value, volts);
  assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.ok(Number.isFinite(model.fields.maxCurrentA.value), `${indoor}/${outdoor} should expose manufacturer maximum current separately from rated current`);
  assert.equal(model.fields.ratedInputW.value, inputW);
  assert.equal(model.fields.maxInputW.value, maxW);
  assert.equal(model.fields.indoorDimReported.value, indoorDims);
  assert.equal(model.fields.outdoorDimReported.value, outdoorDims);
  assert.equal(model.fields.indoorWeight.value, indoorKg);
  assert.equal(model.fields.outdoorWeight.value, outdoorKg);
  assert.equal(model.fields.pipeLiquid.value, liquid);
  assert.equal(model.fields.pipeGas.value, gas);
  assert.equal(model.fields.minPipe.value, minPipe);
  assert.equal(model.fields.chargeFreePipeLengthM.value, chargeFree);
  assert.equal(model.fields.refrigerantAdditionalChargeGpm.value, addedGpm);
  assert.equal(model.fields.maxPipe.value, maxPipe);
  assert.equal(model.fields.maxLift.value, maxLift);
  assert.equal(model.fields.interconnectCable.value, '4 × 1.5 mm² or larger (H07RN-F or 60245 IEC 66); maximum length 70 m');
  assert.equal(model.fields.interconnectCable.sourceIndex, evidence.sources.indexOf(carrierCeilingManual));
  assert.equal(model.fields.powerNote.sourceIndex, evidence.sources.indexOf(carrierCeilingManual));
  assert.match(model.fields.powerNote.value, /ไม่ระบุพิกัดเบรกเกอร์หรือขนาดสายไฟ/);
  assert.match(model.fields.powerNote.value, /คอยล์เย็นรับไฟจากคอยล์ร้อน/);
  assert.equal(model.fields.indoorModel.sourceIndex, evidence.sources.indexOf(carrierCurrent));
}
for (const series of ['TVEB', 'TVDB']) {
  for (const [suffix, btu, current, indoorW, indoorH, indoorD, gasPipe] of [
    ['010', 9200, 4.11, 770, 288, 225, 9.52],
    ['013', 12000, 5.35, 770, 288, 225, 9.52],
    ['016', 15000, 6.80, 798, 293, 230, 12.70],
    ['018', 18000, 8.36, 798, 293, 230, 12.70],
    ['022', 21000, 9.40, 1050, 320, 250, 12.70],
    ['026', 24000, 10.80, 1050, 320, 250, 12.70],
  ]) {
    const model = carrierWall.find(candidate => candidate.indoorModel === `42${series}${suffix}`);
    assert.ok(model, `exact Carrier indoor model 42${series}${suffix} should be covered`);
    const row = siteRows.find(candidate => candidate.type === 'wall' && normalize(candidate.brand) === 'CARRIER' && normalize(candidate.sku) === normalize(model.sku));
    assert.ok(row, `${model.sku} must map to the existing Pricebook row`);
    assert.equal(model.fields.btu.value, btu);
    assert.equal(model.fields.ratedCurrentA.value, current);
    assert.equal(model.fields.power.value, '220V / 1 Ph / 50Hz');
    assert.equal(model.fields.indoorWidth.value, indoorW);
    assert.equal(model.fields.indoorHeight.value, indoorH);
    assert.equal(model.fields.indoorDepth.value, indoorD);
    assert.equal(model.fields.pipeGas.value, gasPipe);
    assert.equal(model.fields.inverter.value, true);
    assert.equal(model.fields.refrigerant.value, 'R32');
    assert.equal(model.fields.minPipe.value, 2);
    assert.ok(model.fields.capacityRangeBtu.value.includes('–'));
  }
}
const carrierSeal22 = carrierWall.find(model => model.indoorModel === '42TVDB022');
const carrierSeal26 = carrierWall.find(model => model.indoorModel === '42TVDB026');
assert.equal(siteRows.find(row => normalize(row.sku) === normalize(carrierSeal22.sku)).btu, 22000, 'company installation band stays at the existing 22,000 BTU band');
assert.equal(siteRows.find(row => normalize(row.sku) === normalize(carrierSeal26.sku)).btu, 25000, 'company installation band stays at the existing 25,000 BTU band');

const daikinKqKz = evidence.models.filter(model => model.brandId === 'daikin' && /^FTK[QZ](09|12|15|18|24)YV2S$/.test(model.indoorModel || ''));
assert.equal(daikinKqKz.length, 9, 'exact Daikin FTKQ-Y and FTKZ-Y manuals should map only the matching site SKUs');
assert.equal(evidence.sources[52]?.sha256, 'b3fb54980b536dfa42e26ff4a7f3d126987b503df3ef8b405012c2767320e6bd');
assert.equal(evidence.sources[53]?.sha256, '0d2f606aa08b0366f83abba28745701771af697a617d313493d8c2230adb27e9');
for (const [modelCode, kw, amps, watts, width, height, depth] of [
  ['FTKQ09YV2S', 2.7, 4.1, 860, 770, 285, 226],
  ['FTKQ12YV2S', 3.6, 5.4, 1130, 770, 285, 226],
  ['FTKQ15YV2S', 4.4, 6.5, 1385, 770, 285, 226],
  ['FTKQ18YV2S', 5.3, 8.2, 1740, 770, 285, 226],
  ['FTKQ24YV2S', 6.0, 9.0, 1930, 770, 285, 226],
  ['FTKZ12YV2S', 3.6, 3.7, 750, 1100, 299, 275],
  ['FTKZ15YV2S', 4.4, 5.1, 1070, 1100, 299, 275],
  ['FTKZ18YV2S', 5.3, 6.3, 1320, 1100, 299, 275],
  ['FTKZ24YV2S', 7.1, 9.6, 2080, 1100, 299, 275],
]) {
  const model = daikinKqKz.find(candidate => candidate.indoorModel === modelCode);
  assert.ok(model, `${modelCode} should match exactly`);
  assert.equal(model.fields.ratedCapacityKw.value, kw);
  assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.equal(model.fields.ratedInputW.value, watts);
  assert.equal(model.fields.power.value, '220 V / 50 Hz');
  assert.match(model.fields.powerNote.value, /ไม่ระบุจำนวนเฟสหรือจำนวนสายไฟ/);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.indoorWidth.value, width);
  assert.equal(model.fields.indoorHeight.value, height);
  assert.equal(model.fields.indoorDepth.value, depth);
  assert.equal(model.fields.inverter.value, true);
  assert.equal(model.fields.inverter.status, 'MANUFACTURER_PAGE_REVIEWED');
  assert.equal(model.fields.btu, undefined, 'Daikin BTU must not be inferred from kW when the manual does not state it');
}

const daikinFtkb = evidence.models.filter(model => model.brandId === 'daikin' && /^FTKB(?:09ZV2S|12ZV2S|15ZV2S|18ZV2S|24ZV2S|09AV2S|12AV2S)$/.test(model.indoorModel || ''));
assert.equal(daikinFtkb.length, 7, 'only the seven exact Daikin FTKB variants present in the site catalog should be imported');
assert.equal(evidence.sources[62]?.sha256, '9d237ecbc1256eed9d302eac6aab5e9f6874265de7ca1f7cf613e3b369c033de');
assert.equal(evidence.sources[63]?.sha256, '5ebbffd951e48cebd2732c8682301efcebb9fbb04a387512a077eee027e6f114');
for (const [modelCode, btu, kw, amps, watts, width, height, depth] of [
  ['FTKB09ZV2S', 9200, 2.7, 4.1, 875, 770, 285, 226],
  ['FTKB12ZV2S', 12300, 3.6, 5.4, 1160, 770, 285, 226],
  ['FTKB15ZV2S', 15000, 4.4, 6.6, 1410, 770, 285, 226],
  ['FTKB18ZV2S', 18100, 5.3, 8.2, 1740, 770, 285, 226],
  ['FTKB24ZV2S', 20500, 6.0, 9.3, 1980, 770, 285, 226],
  ['FTKB09AV2S', 9200, 2.7, undefined, 875, 770, 285, 226],
  ['FTKB12AV2S', 12300, 3.6, undefined, 1160, 770, 285, 226],
]) {
  const model = daikinFtkb.find(candidate => candidate.indoorModel === modelCode);
  assert.ok(model, `${modelCode} should be present as exact-model evidence`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.ratedCapacityKw.value, kw);
  if (amps === undefined) assert.equal(model.fields.ratedCurrentA, undefined, `${modelCode} current must stay unfilled when the exact manufacturer page does not state it`);
  else assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.equal(model.fields.ratedInputW.value, watts);
  assert.equal(model.fields.indoorWidth.value, width);
  assert.equal(model.fields.indoorHeight.value, height);
  assert.equal(model.fields.indoorDepth.value, depth);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.inverter.value, true);
}
const daikinFtkb24 = daikinFtkb.find(model => model.indoorModel === 'FTKB24ZV2S');
assert.equal(siteRows.find(row => normalize(row.sku) === normalize(daikinFtkb24.sku)).btu, 24200, 'the company capacity/Pricebook input remains separate from the 20,500-BTU manufacturer rating');

const daikinFtkmW = evidence.models.filter(model => model.brandId === 'daikin' && /^FTKM(?:09|12|18|24)WV2S$/.test(model.indoorModel || ''));
assert.equal(daikinFtkmW.length, 4, 'the four exact Daikin FTKM-W variants in the site catalog should be covered');
assert.equal(evidence.sources[64]?.sha256, '88eed104cd5eaf5ab59a9c258232a478bcab088e2ae873581ad29aee6234f7e7');
assert.equal(evidence.sources[65]?.sha256, '3bfc5819913a4436db405b4997f4eba66da9ec4ff45926755dce9d743a9e20de');
for (const [modelCode, outdoorCode, btu, kw, amps, watts, width, height, depth] of [
  ['FTKM09WV2S', 'RKM09WV2S', 9200, 2.7, 3.3, 690, 838, 300, 240],
  ['FTKM12WV2S', 'RKM12WV2S', 12300, 3.6, 4.8, 1020, 838, 300, 240],
  ['FTKM18WV2S', 'RKM18WV2S', 18100, 5.3, 6.8, 1430, 1100, 300, 240],
  ['FTKM24WV2S', 'RKM24WV2S', 24200, 7.1, 10.3, 2140, 1100, 300, 240],
]) {
  const model = daikinFtkmW.find(candidate => candidate.indoorModel === modelCode);
  assert.ok(model, `${modelCode} should be present as exact-model evidence`);
  assert.equal(model.outdoorModel, outdoorCode, `${modelCode} should use the exact outdoor code shown on the manufacturer product page`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.ratedCapacityKw.value, kw);
  assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.equal(model.fields.ratedInputW.value, watts);
  assert.equal(model.fields.power.value, '220 V / phase not specified / 50 Hz');
  assert.match(model.fields.powerNote.value, /ไม่ระบุเฟส จำนวนตัวนำ หรือขนาดสายไฟ/);
  assert.equal(model.fields.indoorWidth.value, width);
  assert.equal(model.fields.indoorHeight.value, height);
  assert.equal(model.fields.indoorDepth.value, depth);
  assert.equal(model.fields.refrigerant.value, 'R32');
}

const daikinFtkzVv = evidence.models.filter(model => model.brandId === 'daikin' && /^FTKZ(?:09|12|18|24)VV2S$/.test(model.indoorModel || ''));
assert.equal(daikinFtkzVv.length, 4, 'the four exact FTKZ-VV2S pairs currently listed on the website should be covered');
assert.equal(evidence.sources[66]?.sha256, 'e2cff930da6c67dd88ace340533d8ebed82e146ee231607635d5b1bb2c3f2919');
assert.equal(evidence.sources[67]?.sha256, 'fd6f813cf019bba3e569aeb492673d5341961dd7311d8157658a773b3e311bb1');
for (const [modelCode, outdoorCode, btu, siteBand, seer, width, height, depth] of [
  ['FTKZ09VV2S', 'RKZ09VV2S', 8500, 9200, 24.7, 920, 300, 240],
  ['FTKZ12VV2S', 'RKZ12VV2S', 11900, 12300, 22.8, 920, 300, 240],
  ['FTKZ18VV2S', 'RKZ18VV2S', 17700, 18100, 22.8, 1100, 300, 240],
  ['FTKZ24VV2S', 'RKZ24VV2S', 24200, 24200, 20.4, 1100, 300, 240],
]) {
  const model = daikinFtkzVv.find(candidate => candidate.indoorModel === modelCode);
  assert.ok(model, `${modelCode} should be present as exact-model evidence`);
  assert.equal(model.outdoorModel, outdoorCode);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.power.value, '220 V / 1 Phase / 50 Hz');
  assert.equal(model.fields.indoorWidth.value, width);
  assert.equal(model.fields.indoorHeight.value, height);
  assert.equal(model.fields.indoorDepth.value, depth);
  assert.equal(model.fields.pipeLiquid, undefined, 'pipe size is omitted where the official FTKZ-VV2S page leaves the pipe fields blank');
  assert.equal(model.fields.pipeGas, undefined, 'pipe size is omitted where the official FTKZ-VV2S page leaves the pipe fields blank');
  assert.equal(siteRows.find(row => normalize(row.sku) === normalize(model.sku)).btu, siteBand, 'existing Pricebook capacity band must stay unchanged');
}
assert.equal(daikinFtkzVv.find(model => model.indoorModel === 'FTKZ18VV2S').fields.ratedCapacityKw.value, 5.2);
assert.equal(daikinFtkzVv.find(model => model.indoorModel === 'FTKZ18VV2S').fields.ratedCurrentA.value, 6.4);
assert.equal(daikinFtkzVv.find(model => model.indoorModel === 'FTKZ24VV2S').fields.ratedCapacityKw.value, 7.1);
assert.equal(daikinFtkzVv.find(model => model.indoorModel === 'FTKZ24VV2S').fields.ratedCurrentA.value, 10.3);

const daikinFtkqX = evidence.models.filter(model => model.brandId === 'daikin' && /^FTKQ(?:09|12|18|24)XV2S$/.test(model.indoorModel || ''));
assert.equal(daikinFtkqX.length, 4, 'only exact FTKQ-X variants currently present in the website catalog should be covered');
assert.equal(evidence.sources[68]?.sha256, '56dd25e3efe5155ea42ac33f1b56070d8d0f75c0150b8e4d7a5d21d5b9d0fccc');
assert.equal(evidence.sources[69]?.sha256, '0f72c3dff9c79d58881020317ee17bb1482ff49c8eb886327f4ed3cc0892c145');
for (const [size, btu, range, kw, amps, ratedW, maxW, indoorKg, outdoorH, outdoorW, outdoorD, outdoorKg, gasPipe, maxPipe, maxLift] of [
  ['09', 9200, '2,400–9,900', 2.7, 4.3, 885, 1100, 8, 418, 695, 244, 21, '3/8', 15, 12],
  ['12', 12300, '2,400–13,000', 3.6, 5.5, 1160, 1360, 8, 550, 675, 284, 24, '3/8', 15, 12],
  ['18', 18100, '3,800–18,400', 5.3, 8.2, 1740, 2070, 9, 550, 675, 284, 32, '1/2', 30, 15],
  ['24', 20500, '3,800–20,800', 6.0, 9.0, 1930, 2200, 9, 595, 845, 300, 40, '1/2', 30, 20],
]) {
  const modelCode = `FTKQ${size}XV2S`;
  const model = daikinFtkqX.find(candidate => candidate.indoorModel === modelCode);
  assert.ok(model, `${modelCode} should have an exact current catalog match`);
  assert.equal(model.outdoorModel, `RKQ${size}XV2S`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.capacityRangeBtu.value, range);
  assert.equal(model.fields.ratedCapacityKw.value, kw);
  assert.equal(model.fields.ratedCurrentA.value, amps);
  assert.equal(model.fields.ratedInputW.value, ratedW);
  assert.equal(model.fields.maxInputW.value, maxW);
  assert.equal(model.fields.power.value, '220 V / 1 Phase / 50 Hz');
  assert.equal(model.fields.indoorWidth.value, 770);
  assert.equal(model.fields.indoorHeight.value, 285);
  assert.equal(model.fields.indoorDepth.value, 226);
  assert.equal(model.fields.indoorWeight.value, indoorKg);
  assert.equal(model.fields.outdoorHeight.value, outdoorH);
  assert.equal(model.fields.outdoorWidth.value, outdoorW);
  assert.equal(model.fields.outdoorDepth.value, outdoorD);
  assert.equal(model.fields.outdoorWeight.value, outdoorKg);
  assert.equal(model.fields.pipeLiquid.value, '1/4');
  assert.equal(model.fields.pipeGas.value, gasPipe);
  assert.equal(model.fields.maxPipe.value, maxPipe);
  assert.equal(model.fields.maxLift.value, maxLift);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(model.fields.seer.value, 17.49);
  assert.equal(siteRows.find(row => normalize(row.sku) === normalize(model.sku)).btu, btu === 20500 ? 24200 : btu, 'manufacturer capacity and existing Pricebook band remain distinct');
}
assert.equal(daikinFtkqX.find(model => model.indoorModel === 'FTKQ24XV2S').fields.pipeGas.value, '1/2');
assert.equal(daikinFtkqX.some(model => model.indoorModel === 'FTKQ15XV2S'), false, 'FTKQ15XV2S has no current website catalog SKU and must not be created by evidence import');

const mitsubishiAw = evidence.models.filter(model => model.brandId === 'mitsubishi-electric' && /^MSY-AW(?:09|13|18)VF$/.test(model.indoorModel || ''));
assert.equal(mitsubishiAw.length, 3, 'only the three exact Mitsubishi AW models in the website catalog should be covered');
assert.equal(evidence.sources[70]?.sha256, 'feb8c529cfbbe11b4d28402ca745266409ba65acba673d2093fe09ca2c4a9a27');
assert.equal(evidence.sources[71]?.sha256, '05d0e076b919319b111ff343127b2673d233e8d2afb1d8eae09c982b83c4ea3a');
for (const [size, outdoorCode, siteBtu, gasPipe, charge] of [
  ['09', 'MUY-AW09VF', 9000, '9.52 มม. (3/8 นิ้ว)', 0.605],
  ['13', 'MUY-AW13VF', 12283, '9.52 มม. (3/8 นิ้ว)', 0.655],
  ['18', 'MUY-AW18VF', 18084, '12.7 มม. (1/2 นิ้ว)', 0.765],
]) {
  const modelCode = `MSY-AW${size}VF`;
  const model = mitsubishiAw.find(candidate => candidate.indoorModel === modelCode);
  assert.ok(model, `${modelCode} should match the exact manufacturer model pair`);
  assert.equal(model.outdoorModel, outdoorCode);
  assert.equal(model.fields.btu, undefined, 'no manufacturer BTU is added without an exact model source');
  assert.equal(model.fields.power.value, '220 V / 50 Hz');
  assert.match(model.fields.powerNote.value, /ไม่ระบุจำนวนเฟส/);
  assert.equal(model.fields.breakerA.value, 10);
  assert.equal(model.fields.mainsCable.value, '3 แกน × 1.0 ตร.มม.');
  assert.equal(model.fields.interconnectCable.value, '4 แกน × 1.0 ตร.มม.');
  assert.equal(model.fields.indoorWidth.value, 998);
  assert.equal(model.fields.indoorHeight.value, 305);
  assert.equal(model.fields.indoorDepth.value, 247);
  assert.equal(model.fields.pipeLiquid.value, '6.35 มม. (1/4 นิ้ว)');
  assert.equal(model.fields.pipeGas.value, gasPipe);
  assert.equal(model.fields.maxPipe.value, 20);
  assert.equal(model.fields.maxLift.value, 12);
  assert.equal(model.fields.refrigerantCharge.value, charge);
  assert.equal(model.fields.refrigerant.value, 'R32');
  assert.equal(siteRows.find(row => normalize(row.sku) === normalize(model.sku)).btu, siteBtu, 'the existing Pricebook band remains unchanged when OEM BTU is not sourced');
}

const mitsubishiGz = evidence.models.filter(model => model.brandId === 'mitsubishi-electric' && /^MSY-GZ(?:09|13|15|18|24|30)VF$/.test(model.indoorModel || ''));
assert.equal(mitsubishiGz.length, 6, 'all six exact Mitsubishi GZ catalog rows should retain their existing records and be enriched in place');
for (const [offset, sourceHash] of [
  [0, 'da7f1e6fc5128e743e9005d8f19239aec9431e46e9e58e1b66824fdf9c4ad1ec'],
  [1, '7b3224d356421c0a24b35ba8c1d7f2b87bbb1bf7421c6c51f0cfcdaddf6ce0ff'],
  [2, 'da2156f7e885bc079978552968d88c892dc0020a85d02e0248f0cc71c4705104'],
  [3, 'f2645694111a1ee24547c26a9290145fda32d9f79974100a3e4e7f323782a229'],
  [4, 'e78a59a2eb9d46f0bf3ae011116b29d0e1a880f56b58676d7d0c5ebbb4863442'],
  [5, 'e95261467c900e5a2084b0cca09cfbefbefaf943ca721c1dbe5bc4d59ba1004a'],
]) assert.equal(evidence.sources[72 + offset]?.sha256, sourceHash, `exact GZ model page ${offset} should retain its source hash`);
for (const [size, btu, siteBtu, kw, range, seer, stars, ih, iw, id, oh, ow, od, ikg, okg, gas, maxPipe, maxLift] of [
  ['09', 9554, 9000, 2.8, '1.1–3.4', 22.06, 3, 280, 838, 239, 454, 660, 235, 9.9, 20, '3/8', 20, 12],
  ['13', 12624, 12283, 3.7, '1.4–4.1', 22.06, 3, 280, 838, 239, 545, 780, 294, 9.9, 27.5, '3/8', 20, 12],
  ['15', 14330, 14330, 4.2, '1.6–4.8', 22.06, 3, 280, 838, 239, 714, 800, 285, 9.9, 35.5, '1/2', 20, 12],
  ['18', 17742, 18084, 5.2, '1.8–6.0', 22.06, 3, 325, 1100, 266, 545, 780, 294, 16.5, 29.5, '1/2', 20, 12],
  ['24', 22519, 24000, 6.6, '1.8–7.2', 22.06, 3, 325, 1100, 266, 880, 840, 330, 16.5, 46, '1/2', 30, 15],
  ['30', 27978, 30000, 8.2, undefined, 18.87, 2, 325, 1100, 266, 880, 840, 330, 16.5, undefined, '5/8', 30, 15],
]) {
  const code = `MSY-GZ${size}VF`, model = mitsubishiGz.find(candidate => candidate.indoorModel === code);
  assert.ok(model, `${code} should stay as one exact product row`);
  assert.equal(model.fields.btu.value, btu);
  assert.equal(model.fields.series.value, 'SUPER INVERTER GZ');
  assert.equal(model.fields.inverter.value, true);
  assert.equal(model.fields.ratedCapacityKw.value, kw);
  if (range === undefined) assert.equal(model.fields.capacityRangeKw, undefined); else assert.equal(model.fields.capacityRangeKw.value, range);
  assert.equal(model.fields.seer.value, seer);
  assert.equal(model.fields.energyLabelStars.value, stars);
  assert.equal(model.fields.power.value, '220 V / Single Phase / 50 Hz');
  assert.equal(model.fields.indoorWidth.value, iw); assert.equal(model.fields.indoorHeight.value, ih); assert.equal(model.fields.indoorDepth.value, id);
  assert.equal(model.fields.outdoorWidth.value, ow); assert.equal(model.fields.outdoorHeight.value, oh); assert.equal(model.fields.outdoorDepth.value, od);
  assert.equal(model.fields.indoorWeight.value, ikg);
  if (okg === undefined) assert.equal(model.fields.outdoorWeight, undefined, 'the conflicting GZ30 outdoor weight stays unfilled'); else assert.equal(model.fields.outdoorWeight.value, okg);
  assert.equal(model.fields.pipeLiquid.value, '1/4'); assert.equal(model.fields.pipeGas.value, gas);
  assert.equal(model.fields.maxPipe.value, maxPipe); assert.equal(model.fields.maxLift.value, maxLift);
  assert.equal(model.fields.refrigerant.value, 'R32');
  const row = siteRows.find(candidate => normalize(candidate.sku) === normalize(code));
  assert.equal(row.btu, siteBtu, 'manufacturer BTU must stay distinct from the company Pricebook band');
  assert.equal(row.price, site.prods.find(item => normalize(item[2]) === normalize(code))[4], 'manufacturer enrichment must not rewrite company price');
}

assert.equal(evidence.retailerReferences.length, 3, 'exact-model competitor listing examples are retained as references only');
for (const reference of evidence.retailerReferences) {
  const row = siteRows.find(candidate => candidate.type === reference.type && normalize(candidate.brand) === normalize(reference.brand) && normalize(candidate.sku) === normalize(reference.sku));
  assert.ok(row, `retailer reference must resolve to an exact catalog row: ${reference.sku}`);
  assert.ok(['HomePro', 'PowerBuy'].includes(reference.retailer), 'only reviewed retailers are allowed');
  assert.match(reference.href, /^https:\/\/(www\.)?(homepro\.co\.th\/p\/|powerbuy\.co\.th\/th\/product\/)/, 'only explicitly verified exact-model retailer pages are allowed');
  assert.ok(reference.note, 'retailer reference must explain that its dynamic selling terms are not SBP terms');
}

const runtimePath = path.join(root, 'assets', 'model-evidence.js');
assert.ok(fs.existsSync(runtimePath), 'model evidence runtime helpers should be available to the shared A/B/C modules');
const { attachManufacturerEvidence, manufacturerRatedBtu, manufacturerIndoorDimensions } = await import(pathToFileURL(runtimePath));
const fixtureSku = { sku: 'FTKM09YV2S / RKM09YV2S', btu: 9000 };
const fixtureModels = [{ brand: 'daikin', type: 'wall', skus: [fixtureSku] }];
assert.equal(attachManufacturerEvidence(fixtureModels, { models: [{ brandId: 'daikin', type: 'wall', sku: 'FTKM09YV2S / RKM09YV2S', fields: {
  btu: { value: 9200, exactModel: true }, indoorWidth: { value: 780, exactModel: true }, indoorHeight: { value: 298, exactModel: true }, indoorDepth: { value: 211, exactModel: true },
} }], retailerReferences: [
  { retailer: 'HomePro', brand: 'Daikin', type: 'wall', sku: 'FTKM09YV2S / RKM09YV2S', listingSku: '1253641' },
  { retailer: 'PowerBuy', brand: 'Daikin', type: 'wall', sku: 'FTKM09YV2S / RKM09YV2S', listingSku: '296839' },
] }), 1, 'exact matching manufacturer evidence should attach to the matching SKU');
assert.equal(manufacturerRatedBtu(fixtureSku), 9200, 'room fit can use the exact manufacturer rating');
assert.deepEqual(manufacturerIndoorDimensions(fixtureSku), { widthMm: 780, heightMm: 298, depthMm: 211 }, 'room fit should get dimensions only when all three verified axes exist');
assert.equal(fixtureSku.btu, 9000, 'the company catalog BTU used for the Pricebook band must stay unchanged');
assert.deepEqual(fixtureSku.retailerReferences.map(reference => reference.listingSku), ['1253641', '296839'], 'all exact retailer listing references should attach to the matching model only');
const wrongBrand = { sku: 'FTKM09YV2S', btu: 9000 };
assert.equal(attachManufacturerEvidence([{ brand: 'panasonic', type: 'wall', skus: [wrongBrand] }], { models: [{ brandId: 'daikin', type: 'wall', sku: 'FTKM09YV2S', fields: { btu: { value: 9200 } } }] }), 0, 'same model text under a different brand must never match');
assert.equal(manufacturerRatedBtu(wrongBrand), null);

console.log(`model-evidence: PASS (${evidence.models.length} exact-model records, ${ratedCapacityCount} manufacturer BTU ratings, ${dimensionCompleteCount} complete indoor dimensions, ${pricebookBandDifferences} separately labeled Pricebook differences, ${evidence.retailerReferences.length} retailer references)`);
