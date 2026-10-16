# Saijo Denki residential model evidence capture · 16 October 2026

## Sources and matching method

- Manufacturer residential air-conditioner catalogue: [download from Saijo Denki's official Parts site](https://www.part.saijo-denki.co.th/index.php?route=document/document/download&document_id=1). SHA-256 of the reviewed PDF: `993fbed3ea54deb112417f3aa7d1fac9de1ac1d3bba7ea8efeb88a0a5a36bd2d`.
- Catalogue edition: PDF metadata identifies **2021 (M9)**. The Turbo A.P.S R32 table is printed on page 08; the Smart Cool R32 table is printed on page 10.
- Current family and capacity cross-check: [Saijo Denki official residential product list](https://saijo-denki.com/opencart/catalog/view/theme/default/template/dealer/dealer_page.php), checked 16 October 2026. The page lists Turbo A.P.S R32 and Smart Cool R32 with the capacities represented below. It does not publish the full electrical and dimensional data in the table, so those fields remain attributed to the dated catalogue.
- The website's Saijo SKUs are internal family/capacity labels. Each matched row below was linked by the exact official product family and capacity column, then both indoor and outdoor model codes were checked in that column. The three Turbo A.P.S rows at 30,000, 36,000 and 40,000 class are the non-T, single-phase variants; the 3-phase T variants were not added because the company catalog has no corresponding rows.

## Exact models and capacity comparison

The manufacturer BTU rating is displayed separately from the company's existing Pricebook band. Prices, installation rates and company capacity bands were not changed.

| Website SKU | Official catalogue model | Indoor model | Outdoor model | Manufacturer BTU/h | Company Pricebook BTU/h |
|---|---|---|---|---:|---:|
| TURBO A.P.S-09 | TURBO APS R32-09 | FS09TURBO32SW1 | CE09TURBO32SW1 | 9,563 | 9,071 |
| TURBO A.P.S-12 | TURBO APS R32-12 | FS12TURBO32SW1 | CE12TURBO32SW1 | 12,770 | 12,572 |
| TURBO A.P.S-18 | TURBO APS R32-18 | FS18TURBO32SW1 | CE18TURBO32SW1 | 18,905 | 18,258 |
| TURBO A.P.S-25 | TURBO APS R32-25 | FS25TURBO32SW1 | CE25TURBO32SW1 | 25,498 | 25,259 |
| TURBO A.P.S-30 | TURBO APS R32-30 | FS30TURBO32SW1 | CS30TURBO32SW1 | 30,219 | 30,441 |
| TURBO A.P.S-36 | TURBO APS R32-36 | FS36TURBO32SW1 | CS36TURBO32SW1 | 37,698 | 36,221 |
| TURBO A.P.S-40 | TURBO APS R32-40 | FS40TURBO32SW1 | CS40TURBO32SW1 | 40,450 | 40,200 |
| SWG-09 | SMART COOL R32-09 | FE09SUPER32SWG1 | CE09SUPER32SWG1 | 9,563 | 9,410 |
| SWG-12 | SMART COOL R32-12 | FE12SUPER32SWG1 | CE12SUPER32SWG1 | 12,770 | 12,582 |
| SWG-18 | SMART COOL R32-18 | FE18SUPER32SWG1 | CE18SUPER32SWG1 | 18,905 | 18,258 |
| SWG-25 | SMART COOL R32-25 | FE25SUPER32SWG1 | CE25SUPER32SWG1 | 25,498 | 25,259 |

## Manufacturer specification rows

Both lines use R-32. The listed indoor and outdoor power rows state 220–240 V, 1 phase, 50 Hz for these matched non-T products. Dimensions preserve the catalogue's H × W × D order. Airflow is shown as indoor/outdoor CFM; weights are indoor/outdoor kg.

| Capacity column | Rated input W | SEER | Airflow CFM | Sound dB(A) | Liquid/gas pipe inch | Indoor H×W×D mm | Outdoor H×W×D mm | Main cable mm² | Weight kg |
|---|---:|---:|---:|---:|---|---|---|---:|---|
| 09 | 654 | 15.52 | 350 / 800 | 24 / 43 | 1/4 / 3/8 | 288×918×215 | 490×780×320 | 2.5 | 10 / 28 |
| 12 | 889 | 15.25 | 400 / 850 | 26 / 45 | 1/4 / 3/8 | 288×918×215 | 490×780×320 | 2.5 | 10 / 31 |
| 18 | 1,268 | 15.83 | 600 / 1,300 | 28 / 50 | 1/4 / 1/2 | 328×1,188×235 | 643×997×345 | 2.5 | 14 / 45 |
| 25 | 1,787 | 15.15 | 850 / 1,800 | 31 / 54 | 1/4 / 1/2* | 328×1,188×235 | 847×997×345 | 4 | 15 / 54 |
| Turbo 30 | 2,184 | 14.48 | 1,000 / 2,150 | 40 / 57 | 3/8 / 5/8 | 330×1,600×237 | 1,150×997×345 | 4 | 22 / 70 |
| Turbo 36 | 2,665 | 15.01 | 1,200 / 2,550 | 42 / 59 | 3/8 / 5/8 | 330×1,600×237 | 1,150×997×345 | 6 | 22 / 72 |
| Turbo 40 | 2,713 | 15.83 | 1,350 / 2,850 | indoor level not clearly stated / 60 | 3/8 / 5/8 | 330×1,600×237 | 1,376×1,040×350 | 6 | 22 / 120 |

\* The Turbo 25 gas pipe is 1/2 inch. The Smart Cool 25 gas pipe is 5/8 inch. The corresponding model-specific fields retain that distinction. The catalogue gives no clear indoor sound-level value for Turbo 40, so that field is intentionally absent. The source lists a 1/2-inch drain pipe and 30 m maximum pipe length / 15 m maximum elevation difference for these columns.

## Publication and evidence limits

The evidence index now has 329 exact model matches and 7,086 source-backed field values across 143 source records. These 11 models add 307 fields. All 11 have exact manufacturer BTU values and complete indoor dimensions. The manufacturer's stated main-cable cross-section is recorded as printed; conductor count, interconnect wiring, breaker rating, warranty and current retail price were not inferred or imported. A public-facing source link displays the **2021 (M9)** edition so the specification date remains visible. If Saijo Denki issues a newer exact-model technical sheet, that edition should supersede these values after a row-by-row comparison.

No product image was extracted from the catalogue for the product-photo manifest; the catalogue artwork is not treated as an authorized per-model product image. The official live product list verifies the family/capacity naming, but not current model-specific warranty or all technical values.
