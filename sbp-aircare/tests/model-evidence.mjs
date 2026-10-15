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
  return published === indoor || (outdoor && (published === indoor + outdoor || published === outdoor + indoor));
};

assert.equal(evidence.schema, 'sbp-model-evidence-v1');
assert.equal(evidence.models.length, 140, 'only exact, source-hash-verified, recently checked models with secure source links should be included');
assert.equal(evidence.models.reduce((count, model) => count + Object.keys(model.fields || {}).length, 0), 1801, 'the published evidence index should preserve the 1,801 reviewed field values');
assert.equal(new Set(evidence.models.map(model => `${model.brandId}|${model.type}|${normalize(model.sku)}`)).size, evidence.models.length, 'model evidence keys must be unique');
assert.equal(evidence.provenance.currentSiteCatalogSha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'assets', 'sbp-data.json'))).digest('hex'), 'evidence must declare the catalog snapshot it was matched against');

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
    assert.ok(!['priceCurrent', 'priceReference', 'stock', 'installationHint', 'warranty'].includes(key), `${model.sku}.${key} must not change seller price, stock, installation, or warranty entitlements`);
    assert.ok(['MANUFACTURER_DOCUMENT_REVIEWED', 'MANUFACTURER_PAGE_REVIEWED'].includes(field.status), `${model.sku}.${key} must have an approved manufacturer evidence status`);
    assert.equal(field.exactModel, true, `${model.sku}.${key} must be exact-model evidence`);
    const source = evidence.sources[field.sourceIndex];
    assert.ok(source, `${model.sku}.${key} must link to a retained source record`);
    assert.match(source.href || '', /^https:\/\//, `${model.sku}.${key} must retain its primary HTTPS source URL`);
    assert.match(source.sha256 || '', /^[a-f0-9]{64}$/i, `${model.sku}.${key} must retain its source hash`);
    assert.ok(source.sourceId, `${model.sku}.${key} must retain the evidence ledger's source identifier`);
    assert.match(source.checkedAt || '', /^2026-10-/, `${model.sku}.${key} must have a recent check date`);
  }
}
assert.equal(ratedCapacityCount, 120, 'only reviewed manufacturer BTU values are used');
assert.equal(dimensionCompleteCount, 55, 'only complete, source-backed indoor W/H/D triplets may drive room simulation');
assert.equal(pricebookBandDifferences, 54, 'known manufacturer-vs-Pricebook BTU differences must remain separate and visible');

const carrierWall = evidence.models.filter(model => model.brandId === 'carrier' && /^42TV[ED]B/.test(model.indoorModel || ''));
assert.equal(carrierWall.length, 12, 'the 2026 Carrier ION and Seal source tables should cover all six exact capacities in each series');
assert.equal(evidence.sources[50]?.sha256, '0a710cadc277d5983b5befe0a98d486b07cd455415893a81a23fed8f6285bb3f');
assert.equal(evidence.sources[51]?.sha256, 'ceeaf2702d43fa7ed51a5df078f2e2ade52912d1e61ee6a3117d1e8ebdb85cb0');
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
