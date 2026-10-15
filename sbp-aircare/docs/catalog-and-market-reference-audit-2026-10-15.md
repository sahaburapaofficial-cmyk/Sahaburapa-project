# AirCare catalog evidence and public-service reference audit

Checked 15 October 2026. This note records what was verified and where competitor pages were used as presentation references. It is not a price approval or a claim that these are the five highest Google organic results.

## Product data added to the site

The public catalog contains 705 model rows. The C14/C15 evidence handoff covers a 1,159-model master, but the additional 454 rows are not automatically company-approved products or Pricebook offers. The website now receives only 140 exact brand/type/model matches with a manufacturer-reviewed field, a retained source URL and checksum, and an October 2026 review date. The imported index holds 1,801 individual field values from 56 source records across AUX, Carrier, Casper, Daikin, Eminent, Haier, Hitachi, Mitsubishi Electric, Mitsubishi Heavy Duty, and Sharp.

Field coverage is intentionally uneven: 120 models have an exact manufacturer BTU rating; 55 have all three indoor-unit dimensions (width, height, and depth); other fields such as refrigerant, SEER, voltage/phase/frequency, operating current, pipe sizes, lift limits, and weights appear only where the model-specific source supports them. This does not mean all 140 models have a complete datasheet. The 565 current website rows without a new exact-match record remain in the catalog with their existing company-list data; they are not described as source-verified by this import.

In 54 cases, the reviewed manufacturer BTU value differs from the existing company Pricebook band. The site now shows the manufacturer rating as product capacity and uses the existing Pricebook BTU band separately for price and installation calculations. That band, the product price, all service rates, and the quote calculation were left unchanged. Room-fit sizing uses the manufacturer rating and exact three-axis dimensions when those fields exist; otherwise it labels the company-list or estimated dimensions accordingly.

The product photo manifest (`assets/product-media.json`) is empty. This update did not copy retailer product images or claim the procedural 3D preview is a photograph of each exact model. Model-specific photos remain outstanding until exact, use-approved image assets are available.

## Retail and manufacturer examples

These pages confirm useful display conventions and exact-model labels. Dynamic retailer prices, inventory, promotions, installation offers, and warranty terms were not imported into the SBP catalog.

- [HomePro Daikin FTKM09YV2S listing](https://www.homepro.co.th/p/1253641) identifies the wall type, exact model, 9,200 BTU/h, and inverter status.
- [PowerBuy Daikin FTKM09YV2S listing](https://www.powerbuy.co.th/th/product/DAIKIN-Air-Conditioner-9200-BTU-Inverter-White-FTKM09YV2S-Pipe-RA-CN-R32-296839) presents the same model and 9,200 BTU/h. It is linked as a retailer reference only.
- [HomePro Panasonic CS/CU-XU9AKT listing](https://www.homepro.co.th/p/1253286) presents the matched indoor/outdoor model codes and 9,518 BTU/h.
- [Daikin FTKM-YV2S product catalog](https://www.daikin.co.th/assets/uploads/product/56/product_catalog/FTKM-Y.pdf) is the primary model-family source for the Daikin values; the [Thai Watsadu-hosted Daikin manual](https://www.thaiwatsadu.com/cdnpdf/manual/60405753.pdf) is a cross-check, not a new company listing.

The HomePro and PowerBuy Daikin examples agree on the 9,200 BTU/h presentation for FTKM09YV2S. The site lists both pages as references beside the manufacturer-backed details. Their current selling terms remain theirs and can change independently.

## Follow-up: Carrier Copper ION and Copper Seal

This evidence wave adds 12 exact Carrier wall-model pairs from the official [Copper ION catalog, 01/2026](https://carrierthailand.com/wp-content/uploads/2026/01/CopperION_Catalog.pdf) and [Copper Seal catalog, 04/2026](https://carrierthailand.com/wp-content/uploads/2026/04/Catalog_CopperSEAL.pdf): six `42TVEBxxx / 38TVEBxxx` pairs and six `42TVDBxxx / 38TVDBxxx` pairs. The third-page model tables were checked directly against the exact indoor/outdoor codes. The 29 selected fields per model include rated and min/max cooling capacity, inverter and R32 identification, SEER, rated/max input power, operating current, supply voltage/phase/frequency, indoor/outdoor dimensions and weights, noise, refrigerant charge, pipe diameters, and pipe length/lift limits. kW-to-W and g-to-kg conversions are called out in each field locator.

The OEM values expose six manufacturer-versus-Pricebook capacity differences: each series lists the 010 model as 9,200 versus the existing 9,000 band, 022 as 21,000 versus 22,000, and 026 as 24,000 versus 25,000 BTU/h. The model detail and room-fit can show the manufacturer rating while the existing company bands continue to drive pricing and installation. The 1,159-model master also contains different dimensions for these models; for example, its PRB-0013 indoor-unit dimensions differ from the 2026 OEM H×W×D table. The new manufacturer evidence retains the 2026 source values and does not rewrite the master or Pricebook.

The Carrier catalogs do not specify conductor count or wire gauge for these model tables, so neither was added as a model-specific public claim. Warranty terms, stock, installation-package contents, and prices were also excluded from this evidence import.

## Follow-up: Daikin FTKQ-Y and FTKZ-Y

This pass adds nine exact Daikin wall models: five FTKQ-YV2S / RKQ-YV2S pairs (09, 12, 15, 18, 24) and four FTKZ-YV2S / RKZ-YV2S pairs (12, 15, 18, 24). Each match was checked against the exact indoor/outdoor model pair in the official [FTKQ-Y operation manual](https://daikin.co.th/assets/uploads/product/59/product_manual/FTKQ-Y.pdf), page 32, or [FTKZ-Y operation manual](https://www.daikin.co.th/assets/uploads/product/55/product_manual/%E0%B8%84%E0%B8%B9%E0%B9%88%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B8%87%E0%B8%B2%E0%B8%99_FTKZ-Y.pdf), page 45. Official [KQ](https://www.daikin.co.th/product/MaxInverterStarKQseriesFTKQ-YV2S) and [KZ](https://www.daikin.co.th/th/product/FTKZ-YV2S) product pages identify the Inverter Star series.

The imported manual fields include nominal cooling capacity in the source's original kW and kcal/h units, rated current and input power, R32, voltage/frequency, and exact indoor/outdoor dimensions and net weights. The manuals specify 220 V / 50 Hz but do not state phase count or conductor count in these tables; neither phase nor wire count/gauge was inferred. BTU/h was not calculated from kW or kcal/h, and the existing company BTU bands and all prices remain unchanged. The site row `FTKZ09YV2S5 / RKZ09YV2S5` was not linked to the manual's `FTKZ09YV2S / RKZ09YV2S` because the model codes are not an exact match.

## Service presentation references

The following pages were reviewed as a practical sample for productized service presentation. Search results alone do not establish Google rank, search volume, or a national “top five” position; a verified ranking study would require a defined query, location, device, date, and Google Search Console or SERP evidence.

- [HomePro air-conditioner installation](https://www.homepro.co.th/c/SER0201): separates installation offers by unit type and BTU band, lists related add-on work, and explains its own booking and after-service terms.
- [Q-CHANG air-conditioner cleaning](https://www.q-chang.com/cleaning/air-conditioner-cleaning): distinguishes service types, describes a step-based process, cleanliness, booking, and its own warranty/support.
- [Air24BKK service prices](https://air24bkk.com/price/): makes service categories, travel/diagnostic charges, refrigerant measurement, and approval before extra repair work visible.
- [PROCHANG air services](https://prochang.com/th/air): separates cleaning by unit type and lists installation, diagnosis, removal, and pump work as distinct offers.
- [PowerBuy air-conditioning category](https://www.powerbuy.co.th/th/category/home-appliance/air-conditioning): illustrates searchable model identifiers, BTU, features, and product comparison in a retail catalog.

The useful common pattern is clear scope before booking: identify the equipment and model, state included/excluded work, expose travel or survey conditions, and show how optional repairs are approved. SBP already has price-by-service and add-on logic; this change keeps those existing business terms and price rules intact. It only corrects the Model B card's VAT label to “ก่อน VAT” and clarifies exact manufacturer values against the Pricebook in catalog, comparison, room-fit, and quotation views. Competitor warranties and service promises were not copied.

## Still needed before claiming full catalog readiness

1. Exact, rights-cleared product images tied to the actual model codes. The current catalog intentionally uses procedural previews where no product media is registered.
2. Manufacturer-source evidence for the remaining 565 website rows, starting with Daikin (108 uncovered site models), Carrier (89), Mitsubishi Electric (69), Saijo Denki (44), Central Air (35), Mitsubishi Heavy Duty (34), Panasonic (33), and York (33). For each, prioritize exact indoor/outdoor pairing and capacity, then dimensions, refrigerant, voltage/phase/current, and pipe sizes. Add conductor count and wire gauge only when the exact model manual states them.
3. Four Central Air CFW-2JSFE candidate records were withheld because the available source was HTTP-only and could not be verified through HTTPS. They need a secure manufacturer source before publication.
4. Field-specific review of electrical wiring and phase is still partial; no generic conductor count or cable size should be presented as model-specific without a manual reference.
5. If “Google top five” means actual organic position rather than a sample of public service pages, provide the target search queries, area, device, and Search Console/SERP baseline. No SEO ranking claim is made in this update.
