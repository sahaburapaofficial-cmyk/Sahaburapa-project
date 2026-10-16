import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidencePath = path.join(root, 'assets', 'model-evidence.json');
const catalogPath = path.join(root, 'assets', 'sbp-data.json');
const captureDir = path.join(root, 'docs', 'evidence', 'centralair-2026-10-16');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const normalize = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const captureSources = [
  {
    sourceId: 'CENTRAL_AIR_MFE_2024_CATALOG_COPY',
    label: 'Central Air MFE Series · 2024 OEM brochure copy (hosted by GoldenAir)',
    href: 'https://goldenair.co.th/wp-content/uploads/2025/03/CentralAir-MFE-Series-Brochure.pdf',
    captureFile: 'docs/evidence/centralair-2026-10-16/centralair-mfe-2024.json',
    sourceEdition: '2024 catalogue; structured text transcription checked 2026-10-16',
    verificationMethod: 'OEM_BRANDED_CATALOGUE_TEXT_TRANSCRIPTION_WITH_TISI_EXACT_PAIR_CROSSCHECK',
    authorityType: 'MANUFACTURER',
  },
  {
    sourceId: 'CENTRAL_AIR_IVJS_2024_CATALOG_COPY',
    label: 'Central Air IVJS Series · 2024 OEM catalogue copy (hosted by GoldenAir)',
    href: 'https://www.goldenair.co.th/wp-content/uploads/2024/04/2024-Catalog_CFW-IVJS-1.pdf',
    captureFile: 'docs/evidence/centralair-2026-10-16/centralair-ivjs-2024.json',
    sourceEdition: '2024 catalogue; structured text transcription checked 2026-10-16',
    verificationMethod: 'OEM_BRANDED_CATALOGUE_TEXT_TRANSCRIPTION_WITH_TISI_EXACT_PAIR_CROSSCHECK',
    authorityType: 'MANUFACTURER',
  },
  {
    sourceId: 'CENTRAL_AIR_2JSFE_2024_CATALOG_COPY',
    label: 'Central Air 2JSFE Series · 2024 OEM catalogue copy (hosted by MeedeeAir)',
    href: 'https://meedeeair.com/wp-content/uploads/2024/04/2024-Catalog_CFW-2JSFE.pdf',
    captureFile: 'docs/evidence/centralair-2026-10-16/centralair-2jsfe-2024.json',
    sourceEdition: '2024 catalogue; structured text transcription checked 2026-10-16',
    verificationMethod: 'OEM_BRANDED_CATALOGUE_TEXT_TRANSCRIPTION_WITH_TISI_EXACT_PAIR_CROSSCHECK_WHERE_LISTED',
    authorityType: 'MANUFACTURER',
  },
  {
    sourceId: 'TISI_CENTRAL_AIR_MFE_LICENSE_7486_2117_2134',
    label: 'TISI · Central Air MFE model-pair licence T 7486-2117/2134',
    href: 'https://appdb.tisi.go.th/tis_dev/p4_license_report/file/%E0%B8%977486_2117_2134.pdf',
    captureFile: 'docs/evidence/centralair-2026-10-16/tisi-centralair-licenses.json',
    sourceEdition: 'T 7486-2117/2134; structured page/entry transcription checked 2026-10-16',
    verificationMethod: 'OFFICIAL_TISI_LICENSE_TEXT_TRANSCRIPTION_HASHED_AND_EXACT_INDOOR_OUTDOOR_PAIR_REVIEWED',
    authorityType: 'THAI_REGULATORY_BODY',
  },
  {
    sourceId: 'TISI_CENTRAL_AIR_WALL_LICENSE_7020_4_1529',
    label: 'TISI · Central Air IVJS / 2JSFE model-pair licence T 7020-4/1529',
    href: 'https://appdb.tisi.go.th/tis_dev/p4_license_report/file/%E0%B8%977020_4_1529.pdf',
    captureFile: 'docs/evidence/centralair-2026-10-16/tisi-centralair-licenses.json',
    sourceEdition: 'T 7020-4/1529; structured page/entry transcription checked 2026-10-16',
    verificationMethod: 'OFFICIAL_TISI_LICENSE_TEXT_TRANSCRIPTION_HASHED_AND_EXACT_INDOOR_OUTDOOR_PAIR_REVIEWED',
    authorityType: 'THAI_REGULATORY_BODY',
  },
];

if (evidence.models.some(model => model.brandId === 'central-air')) {
  throw new Error('Central Air evidence already exists; refusing to duplicate model records.');
}

const sourceIndexes = new Map();
for (const source of captureSources) {
  const capturePath = path.join(root, source.captureFile);
  if (!fs.existsSync(capturePath)) throw new Error(`Missing retained transcription: ${source.captureFile}`);
  const captureBytes = fs.readFileSync(capturePath);
  source.sha256 = crypto.createHash('sha256').update(captureBytes).digest('hex');
  source.checkedAt = '2026-10-16';
  source.captureHashKind = 'STRUCTURED_TEXT_TRANSCRIPTION_NOT_REMOTE_PDF_BINARY';
  sourceIndexes.set(source.sourceId, evidence.sources.length);
  evidence.sources.push(source);
}

const tisiCapture = JSON.parse(fs.readFileSync(path.join(captureDir, 'tisi-centralair-licenses.json'), 'utf8'));
const tisiModels = [...tisiCapture.mfeLicense.models, ...tisiCapture.wallLicense.models];
const tisiByPair = new Map(tisiModels.map(model => [`${normalize(model.indoorModel)}|${normalize(model.outdoorModel)}`, model]));
const seriesFiles = [
  { sourceId: 'CENTRAL_AIR_MFE_2024_CATALOG_COPY', models: 'centralair-mfe-2024.json', inverter: false, type: 'wall' },
  { sourceId: 'CENTRAL_AIR_IVJS_2024_CATALOG_COPY', models: 'centralair-ivjs-2024.json', inverter: true, type: 'wall' },
  { sourceId: 'CENTRAL_AIR_2JSFE_2024_CATALOG_COPY', models: 'centralair-2jsfe-2024.json', inverter: false, type: 'wall' },
];

const fieldLabels = {
  indoorModel: ['Model คอยล์เย็น', null],
  outdoorModel: ['Model คอยล์ร้อน', null],
  btu: ['ความจุความเย็นตามเอกสารผู้ผลิต', 'BTU/h'],
  ratedCapacityW: ['ความจุความเย็นพิกัด', 'W'],
  ratedInputW: ['กำลังไฟฟ้าขาเข้าพิกัด', 'W'],
  seer: ['ค่า SEER', 'BTU/h/W'],
  ratedCurrentA: ['กระแสไฟฟ้าพิกัด', 'A'],
  power: ['แหล่งจ่ายไฟ', null],
  inverter: ['ระบบ Inverter', null],
  refrigerant: ['สารทำความเย็น', null],
  indoorWidth: ['ความกว้างคอยล์เย็น', 'mm'],
  indoorHeight: ['ความสูงคอยล์เย็น', 'mm'],
  indoorDepth: ['ความลึกคอยล์เย็น', 'mm'],
  indoorWeight: ['น้ำหนักสุทธิคอยล์เย็น', 'kg'],
  outdoorWidth: ['ความกว้างคอยล์ร้อน', 'mm'],
  outdoorHeight: ['ความสูงคอยล์ร้อน', 'mm'],
  outdoorDepth: ['ความลึกคอยล์ร้อน', 'mm'],
  outdoorWeight: ['น้ำหนักสุทธิคอยล์ร้อน', 'kg'],
  pipeLiquid: ['ขนาดท่อ Liquid', 'mm'],
  pipeGas: ['ขนาดท่อ Gas / Suction', 'mm'],
  tisiEnergyRatio: ['อัตราส่วนประสิทธิภาพพลังงานตาม มอก.', 'W/W'],
};
const addField = (fields, key, value, sourceIndex, status, locator) => {
  const [label, unit] = fieldLabels[key];
  fields[key] = { value, label, unit, status, exactModel: true, sourceIndex, locator };
};
const matches = [];

for (const series of seriesFiles) {
  const capturePath = path.join(captureDir, series.models);
  const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
  const sourceIndex = sourceIndexes.get(series.sourceId);
  for (const spec of capture.models) {
    const skuNorm = normalize(`${spec.indoorModel}/${spec.outdoorModel}`);
    const rows = catalog.prods.filter(row => row[0] === series.type && normalize(row[1]) === 'CENTRALAIR' && normalize(row[2]) === skuNorm);
    if (rows.length !== 1) throw new Error(`Expected one company catalog row for ${spec.indoorModel}/${spec.outdoorModel}; found ${rows.length}`);
    const row = rows[0];
    const tisi = tisiByPair.get(`${normalize(spec.indoorModel)}|${normalize(spec.outdoorModel)}`);
    const tisiSourceId = tisiCapture.mfeLicense.models.includes(tisi)
      ? 'TISI_CENTRAL_AIR_MFE_LICENSE_7486_2117_2134'
      : 'TISI_CENTRAL_AIR_WALL_LICENSE_7020_4_1529';
    const tisiIndex = tisi ? sourceIndexes.get(tisiSourceId) : null;
    const fields = {};
    const baseLocator = `PDF page 2; exact printed column ${spec.indoorModel}/${spec.outdoorModel}`;
    addField(fields, 'indoorModel', spec.indoorModel, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; indoor-unit model row`);
    addField(fields, 'outdoorModel', spec.outdoorModel, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; outdoor-unit model row`);
    addField(fields, 'btu', spec.btu, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; Cooling Capacity, Btu/hr`);
    addField(fields, 'ratedCapacityW', tisi?.ratedCapacityW ?? spec.ratedCapacityW, tisi ? tisiIndex : sourceIndex,
      tisi ? 'REGULATORY_RECORD_REVIEWED' : 'MANUFACTURER_DOCUMENT_REVIEWED',
      tisi ? `${tisi.license || (tisiCapture.mfeLicense.models.includes(tisi) ? tisiCapture.mfeLicense.license : tisiCapture.wallLicense.license)}; ${tisi.locator}; net cooling capacity` : `${baseLocator}; Cooling Capacity, Watts`);
    addField(fields, 'ratedInputW', tisi?.ratedInputW ?? spec.ratedInputW, tisi?.ratedInputW != null ? tisiIndex : sourceIndex,
      tisi?.ratedInputW != null ? 'REGULATORY_RECORD_REVIEWED' : 'MANUFACTURER_DOCUMENT_REVIEWED',
      tisi?.ratedInputW != null ? `${tisi.locator}; rated electrical input` : `${baseLocator}; Power Consumption, Watts`);
    addField(fields, 'seer', spec.seer, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; SEER row`);
    addField(fields, 'ratedCurrentA', spec.ratedCurrentA, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; Running Current, Amps`);
    const powerValue = tisi?.voltage ? `${tisi.voltage} / 1Ph / ${tisi.frequencyHz} Hz` : spec.power;
    addField(fields, 'power', powerValue, tisi?.voltage ? tisiIndex : sourceIndex,
      tisi?.voltage ? 'REGULATORY_RECORD_REVIEWED' : 'MANUFACTURER_DOCUMENT_REVIEWED',
      tisi?.voltage ? `${tisi.locator}; rated voltage, phase and frequency` : `${baseLocator}; Power Supply, V/Ph/Hz`);
    addField(fields, 'inverter', series.inverter, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; series title`);
    addField(fields, 'refrigerant', spec.refrigerant, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; Refrigerant Type`);
    for (const [key, value, label] of [
      ['indoorWidth', spec.indoorDimWHdMm[0], 'indoor unit width'],
      ['indoorHeight', spec.indoorDimWHdMm[1], 'indoor unit height'],
      ['indoorDepth', spec.indoorDimWHdMm[2], 'indoor unit depth'],
      ['outdoorWidth', spec.outdoorDimWHdMm[0], 'outdoor unit width'],
      ['outdoorHeight', spec.outdoorDimWHdMm[1], 'outdoor unit height'],
      ['outdoorDepth', spec.outdoorDimWHdMm[2], 'outdoor unit depth'],
    ]) addField(fields, key, value, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; Dimension (W/H/D), ${label}, mm`);
    addField(fields, 'indoorWeight', spec.indoorWeightNetKg, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; indoor net weight, kg`);
    addField(fields, 'outdoorWeight', spec.outdoorWeightNetKg, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; outdoor net weight, kg`);
    addField(fields, 'pipeLiquid', spec.pipeLiquidMm, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; Liquid Size, mm (inch also shown in capture)`);
    addField(fields, 'pipeGas', spec.pipeGasMm, sourceIndex, 'MANUFACTURER_DOCUMENT_REVIEWED', `${baseLocator}; Suction Size, mm (inch also shown in capture)`);
    if (tisi?.tisiEnergyRatio != null) addField(fields, 'tisiEnergyRatio', tisi.tisiEnergyRatio, tisiIndex,
      'REGULATORY_RECORD_REVIEWED', `${tisi.license || tisiCapture.mfeLicense.license}; ${tisi.locator}; energy efficiency ratio`);

    matches.push({
      productId: `CENTRAL-AIR-WALL-${spec.indoorModel}`,
      brand: 'Central Air',
      brandId: 'central-air',
      type: 'wall',
      sku: row[2],
      indoorModel: spec.indoorModel,
      outdoorModel: spec.outdoorModel,
      fields,
    });
  }
}

evidence.models.push(...matches);
evidence.provenance.matchedExactModels = evidence.models.length;
evidence.provenance.verifiedFieldValues = evidence.models.reduce((total, model) => total + Object.keys(model.fields || {}).length, 0);
evidence.provenance.regulatoryReviewedFieldValues = evidence.models.reduce((total, model) => total + Object.values(model.fields || {}).filter(field => field.status === 'REGULATORY_RECORD_REVIEWED').length, 0);
evidence.provenance.sourceName += '; Central Air 2024 MFE/IVJS/2JSFE catalogue transcriptions cross-checked with exact TISI license pairs where listed';
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

const fieldCounts = Object.fromEntries(['btu','ratedCapacityW','power','ratedCurrentA','indoorWidth','pipeLiquid','pipeGas','maxPipe','maxLift']
  .map(key => [key, evidence.models.filter(model => model.fields?.[key]?.exactModel === true).length]));
const pricebookBandDifferences = evidence.models.filter(model => {
  const row = catalog.prods.find(item => item[0] === model.type && normalize(item[1]) === normalize(model.brand) && normalize(item[2]) === normalize(model.sku));
  return row && Number.isFinite(model.fields?.btu?.value) && model.fields.btu.value !== row[3];
}).length;
console.log(JSON.stringify({addedModels: matches.length, addedFields: matches.reduce((sum, model) => sum + Object.keys(model.fields).length, 0), sourceCount: evidence.sources.length, matchedExactModels: evidence.provenance.matchedExactModels, verifiedFieldValues: evidence.provenance.verifiedFieldValues, regulatoryReviewedFieldValues: evidence.provenance.regulatoryReviewedFieldValues, unmatchedCatalogRows: catalog.prods.length - matches.length - (evidence.provenance.matchedExactModels - matches.length), fieldCounts, pricebookBandDifferences}));
