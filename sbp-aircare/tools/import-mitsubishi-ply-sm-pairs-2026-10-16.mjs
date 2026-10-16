import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'assets', 'sbp-data.json');
const evidencePath = path.join(root, 'assets', 'model-evidence.json');
const captureDir = path.join(root, 'docs', 'evidence', 'mitsubishi-ply-sm-2026-10-16');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const normalize = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

if (evidence.sources.some(source => source.sourceId?.startsWith('TISI_PLY_SM_'))) {
  throw new Error('Mitsubishi PLY-SM TISI sources already exist; refusing duplicate import.');
}

const sourceSpecs = [
  {
    sourceId: 'TISI_PLY_SM_PAIRS_T7120_2108_2134',
    label: 'TISI · T 7120-2108/2134 · exact PLY-SM13/18/24/30 indoor/outdoor pairs',
    href: 'https://appdb.tisi.go.th/tis_dev/p4_license_report/file/%E0%B8%977120_2108_2134.pdf',
    captureFile: 'docs/evidence/mitsubishi-ply-sm-2026-10-16/tisi-7120-ply-sm-pairs.json',
    sourcePdfSha256: '62f7e22ca63b17bbbceb12943fb69fefD68b8e3fc209bf58bbb0e920000ca0e5'.toLowerCase(),
    sourceEdition: 'T 7120-2108/2134; revised 2024-09-02; exact PLY-SM13/18/24/30 model pairs and rating entries reviewed at PDF pages 59–61',
  },
  {
    sourceId: 'TISI_PLY_SM36_PAIR_T7931_2119_2134',
    label: 'TISI · T 7931-2119/2134 · exact PLY-SM36EA4/PUY-SM36VKA4 pair',
    href: 'https://appdb.tisi.go.th/tis_dev/p4_license_report/file/%E0%B8%977931_2119_2134.pdf',
    captureFile: 'docs/evidence/mitsubishi-ply-sm-2026-10-16/tisi-7931-ply-sm36-pair.json',
    sourcePdfSha256: '81414bc8667724f07531c98e1ea9546cac83e5115c3b04438c0a25730ed6b440',
    sourceEdition: 'T 7931-2119/2134; revised 2024-09-10; exact single-phase PLY-SM36EA4/PUY-SM36VKA4 pair reviewed at PDF page 80, entry 364',
  },
];

const sourcesById = new Map();
for (const source of sourceSpecs) {
  const capturePath = path.join(root, source.captureFile);
  if (!fs.existsSync(capturePath)) throw new Error(`Missing TISI transcription: ${source.captureFile}`);
  const captureBytes = fs.readFileSync(capturePath);
  const capture = JSON.parse(captureBytes.toString('utf8'));
  if (capture.pdfUrl !== source.href || capture.sourcePdfSha256.toLowerCase() !== source.sourcePdfSha256) {
    throw new Error(`TISI capture/source identity mismatch: ${source.sourceId}`);
  }
  const sourceIndex = evidence.sources.length;
  evidence.sources.push({
    sourceId: source.sourceId,
    label: source.label,
    href: source.href,
    sha256: source.sourcePdfSha256,
    captureFile: source.captureFile,
    captureSha256: crypto.createHash('sha256').update(captureBytes).digest('hex'),
    captureHashKind: 'STRUCTURED_TISI_TRANSCRIPTION_SEPARATE_FROM_REMOTE_PDF_BINARY_SHA256',
    sourceEdition: source.sourceEdition,
    verificationMethod: 'DIRECT_OFFICIAL_TISI_PDF_SHA256_AND_EXACT_MODEL_PAIR_REVIEW',
    authorityType: 'THAI_REGULATORY_BODY',
    checkedAt: '2026-10-16',
  });
  sourcesById.set(source.sourceId, { index: sourceIndex, capture });
}

const allPairs = sourceSpecs.flatMap(source => {
  const { capture } = sourcesById.get(source.sourceId);
  return capture.models.map(model => ({ ...model, tisiSourceId: source.sourceId }));
});
if (allPairs.length !== 5) throw new Error(`Expected five licensed PLY-SM pairs; found ${allPairs.length}`);

const corrections = [];
for (const pair of allPairs) {
  const rows = catalog.prods.filter(row => row[0] === 'cassette' && normalize(row[1]) === 'MITSUBISHIELECTRIC' && row[2] === pair.companySkuBeforeCorrection);
  if (rows.length !== 1) throw new Error(`Expected one company row for ${pair.companySkuBeforeCorrection}; found ${rows.length}`);
  const row = rows[0];
  const before = [...row];
  if (catalog.prods.some(other => other !== row && other[0] === row[0] && normalize(other[1]) === normalize(row[1]) && normalize(other[2]) === normalize(pair.catalogSkuAfterCorrection))) {
    throw new Error(`Corrected catalog SKU already exists: ${pair.catalogSkuAfterCorrection}`);
  }
  row[2] = pair.catalogSkuAfterCorrection;
  if (before.some((value, index) => index !== 2 && value !== row[index])) throw new Error(`Unexpected catalog field change: ${pair.companySkuBeforeCorrection}`);

  const base = evidence.models.find(model => model.type === 'cassette' && model.brandId === 'mitsubishi-electric' && model.sku === pair.indoorModel);
  if (!base) throw new Error(`Exact manufacturer page record missing for ${pair.indoorModel}`);
  if (evidence.models.some(model => model.type === 'cassette' && model.brandId === 'mitsubishi-electric' && normalize(model.sku) === normalize(pair.catalogSkuAfterCorrection))) {
    throw new Error(`Evidence record already exists for ${pair.catalogSkuAfterCorrection}`);
  }

  const tisiSource = sourcesById.get(pair.tisiSourceId);
  const sourceIndex = tisiSource.index;
  const tisiLocator = `${tisiSource.capture.license}; PDF page ${pair.pdfPage}, entry ${pair.entry}; licensed exact pair ${pair.indoorModelAsLicensed}/${pair.outdoorModelAsLicensed}`;
  const paired = structuredClone(base);
  paired.sku = pair.catalogSkuAfterCorrection;
  paired.indoorModel = pair.indoorModel;
  paired.outdoorModel = pair.outdoorModel;
  paired.fields.outdoorModel = {
    value: pair.outdoorModel,
    label: 'Model คอยล์ร้อน',
    unit: null,
    status: 'REGULATORY_RECORD_REVIEWED',
    exactModel: true,
    sourceIndex,
    locator: `${tisiLocator}; condenser-unit model code and exact indoor/outdoor pairing`,
  };
  paired.fields.ratedCapacityW = {
    value: pair.ratedCoolingCapacityW,
    label: 'ความสามารถทำความเย็นพิกัดตามทะเบียน มอก.',
    unit: 'W',
    status: 'REGULATORY_RECORD_REVIEWED',
    exactModel: true,
    sourceIndex,
    locator: `${tisiLocator}; net rated cooling capacity in the license record`,
  };
  paired.fields.tisiEnergyRatio = {
    value: pair.tisiEnergyRatio,
    label: 'อัตราส่วนประสิทธิภาพพลังงานตามทะเบียน มอก.',
    unit: 'W/W',
    status: 'REGULATORY_RECORD_REVIEWED',
    exactModel: true,
    sourceIndex,
    locator: `${tisiLocator}; energy efficiency ratio in the license record`,
  };
  if (pair.phase === 1 && pair.indoorModel === 'PLY-SM36EA4') {
    const powerSourceIndex = base.fields.indoorModel.sourceIndex;
    paired.fields.power = {
      value: '220 V / 1 Phase / 50 Hz',
      label: 'แหล่งจ่ายไฟตามเอกสารผู้ผลิต',
      unit: null,
      status: 'MANUFACTURER_PAGE_REVIEWED',
      exactModel: true,
      sourceIndex: powerSourceIndex,
      locator: `Mitsubishi Electric Thailand official PLY-SM36EA4 1-phase product page; paired outdoor model independently verified by ${tisiLocator}; Power Supply field: 1ph, 220V, 50Hz`,
    };
    delete paired.fields.powerNote;
  }
  evidence.models.push(paired);
  corrections.push({ oldSku: pair.companySkuBeforeCorrection, newSku: pair.catalogSkuAfterCorrection, pair: `${pair.indoorModel}/${pair.outdoorModel}` });
}

const catalogBytes = Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`);
fs.writeFileSync(catalogPath, catalogBytes);
evidence.provenance.currentSiteCatalogSha256 = crypto.createHash('sha256').update(catalogBytes).digest('hex');
evidence.provenance.currentSiteModels = catalog.prods.length;
evidence.provenance.currentSiteCatalogModels = catalog.prods.length;
evidence.provenance.matchedExactModels = evidence.models.length;
evidence.provenance.verifiedFieldValues = evidence.models.reduce((count, model) => count + Object.keys(model.fields || {}).length, 0);
evidence.provenance.regulatoryReviewedFieldValues = evidence.models.reduce((count, model) => count + Object.values(model.fields || {}).filter(field => field.status === 'REGULATORY_RECORD_REVIEWED').length, 0);
evidence.provenance.matchingRule = `${evidence.provenance.matchingRule} Mitsubishi PLY-SM13/18/24/30/36 catalog pair SKUs were corrected to the manufacturer/TISI indoor/outdoor codes; the TISI country suffix TH.TH is retained in the exact field locator and transcription, while the product page displays the base model codes.`;
evidence.provenance.excluded = `${evidence.provenance.excluded} Exact TISI-backed Mitsubishi PLY-SM13/18/24/30/36 pairs were added and their company catalog pair codes corrected without changing price or Pricebook capacity. PLY-SM42/48 bundle rows remain unmatched because the exact condenser partner was not established in the checked TISI licenses.`;

fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ correctedCatalogSkus: corrections, matchedExactModels: evidence.provenance.matchedExactModels, verifiedFieldValues: evidence.provenance.verifiedFieldValues, regulatoryReviewedFieldValues: evidence.provenance.regulatoryReviewedFieldValues, sourceCount: evidence.sources.length, currentSiteCatalogSha256: evidence.provenance.currentSiteCatalogSha256 }, null, 2));
