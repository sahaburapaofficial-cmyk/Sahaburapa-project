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
assert.equal(evidence.models.length, 119, 'only exact, source-hash-verified, recently checked models with secure source links should be included');
assert.equal(evidence.models.reduce((count, model) => count + Object.keys(model.fields || {}).length, 0), 1291, 'the published evidence index should preserve the 1,291 reviewed field values');
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
assert.equal(ratedCapacityCount, 108, 'only reviewed manufacturer BTU values are used');
assert.equal(dimensionCompleteCount, 34, 'only complete, source-backed indoor W/H/D triplets may drive room simulation');
assert.equal(pricebookBandDifferences, 48, 'known manufacturer-vs-Pricebook BTU differences must remain separate and visible');

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
