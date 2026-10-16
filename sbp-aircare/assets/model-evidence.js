// Exact-model manufacturer evidence shared by catalog detail and room-fit views.
const normalize = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function attachManufacturerEvidence(modelGroups, evidenceIndex) {
  const byKey = new Map((evidenceIndex?.models || []).map(item => [
    `${item.brandId}|${item.type}|${normalize(item.sku)}`,
    item,
  ]));
  const retailerByKey = new Map();
  for (const item of evidenceIndex?.retailerReferences || []) {
    const key = `${item.brandId || slug(item.brand)}|${item.type}|${normalize(item.sku)}`;
    if (!retailerByKey.has(key)) retailerByKey.set(key, []);
    retailerByKey.get(key).push(item);
  }
  let attached = 0;
  for (const model of modelGroups || []) {
    for (const sku of model.skus || []) {
      const key = `${model.brand}|${model.type}|${normalize(sku.sku)}`;
      const evidence = byKey.get(key);
      if (evidence) {
        sku.manufacturerEvidence = evidence;
        sku.manufacturerSources = evidenceIndex?.sources || [];
        attached++;
      }
    }
    for (const sku of model.skus || []) {
      const references = retailerByKey.get(`${model.brand}|${model.type}|${normalize(sku.sku)}`);
      if (references) sku.retailerReferences = references;
    }
  }
  return attached;
}

export function manufacturerField(sku, key) {
  const field = sku?.manufacturerEvidence?.fields?.[key];
  return field?.exactModel === true ? field.value : null;
}

export function manufacturerRatedBtu(sku) {
  const value = Number(manufacturerField(sku, 'btu'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function manufacturerIndoorDimensions(sku) {
  const values = ['indoorWidth', 'indoorHeight', 'indoorDepth'].map(key => Number(manufacturerField(sku, key)));
  if (!values.every(value => Number.isFinite(value) && value >= 100 && value <= 2600)) return null;
  return { widthMm: values[0], heightMm: values[1], depthMm: values[2] };
}

export function manufacturerIndoorDimensionLabel(sku) {
  const dimensions = manufacturerIndoorDimensions(sku);
  return dimensions ? `${dimensions.widthMm} × ${dimensions.heightMm} × ${dimensions.depthMm}` : null;
}
