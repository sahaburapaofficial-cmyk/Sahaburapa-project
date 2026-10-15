# AirCare catalog evidence and public-service reference audit

Checked 15 October 2026. This note records what was verified and where competitor pages were used as presentation references. It is not a price approval or a claim that these are the five highest Google organic results.

## Product data added to the site

The public catalog contains 705 model rows. The C14/C15 evidence handoff covers a 1,159-model master, but the additional 454 rows are not automatically company-approved products or Pricebook offers. The website now receives only 119 exact brand/type/model matches with a manufacturer-reviewed field, a retained source URL and checksum, and an October 2026 review date. The imported index holds 1,291 individual field values from 50 source records across AUX, Carrier, Casper, Daikin, Eminent, Haier, Hitachi, Mitsubishi Electric, Mitsubishi Heavy Duty, and Sharp.

Field coverage is intentionally uneven: 108 models have an exact manufacturer BTU rating; 34 have all three indoor-unit dimensions (width, height, and depth); other fields such as refrigerant, SEER, power, pipe sizes, lift limits, weights, and features appear only where the model-specific source supports them. This does not mean all 119 models have a complete datasheet. The 586 current website rows without a new exact-match record remain in the catalog with their existing company-list data; they are not described as source-verified by this import.

In 48 cases, the reviewed manufacturer BTU value differs from the existing company Pricebook band. The site now shows the manufacturer rating as product capacity and uses the existing Pricebook BTU band separately for price and installation calculations. That band, the product price, all service rates, and the quote calculation were left unchanged. Room-fit sizing uses the manufacturer rating and exact three-axis dimensions when those fields exist; otherwise it labels the company-list or estimated dimensions accordingly.

The product photo manifest (`assets/product-media.json`) is empty. This update did not copy retailer product images or claim the procedural 3D preview is a photograph of each exact model. Model-specific photos remain outstanding until exact, use-approved image assets are available.

## Retail and manufacturer examples

These pages confirm useful display conventions and exact-model labels. Dynamic retailer prices, inventory, promotions, installation offers, and warranty terms were not imported into the SBP catalog.

- [HomePro Daikin FTKM09YV2S listing](https://www.homepro.co.th/p/1253641) identifies the wall type, exact model, 9,200 BTU/h, and inverter status.
- [PowerBuy Daikin FTKM09YV2S listing](https://www.powerbuy.co.th/th/product/DAIKIN-Air-Conditioner-9200-BTU-Inverter-White-FTKM09YV2S-Pipe-RA-CN-R32-296839) presents the same model and 9,200 BTU/h. It is linked as a retailer reference only.
- [HomePro Panasonic CS/CU-XU9AKT listing](https://www.homepro.co.th/p/1253286) presents the matched indoor/outdoor model codes and 9,518 BTU/h.
- [Daikin FTKM-YV2S product catalog](https://www.daikin.co.th/assets/uploads/product/56/product_catalog/FTKM-Y.pdf) is the primary model-family source for the Daikin values; the [Thai Watsadu-hosted Daikin manual](https://www.thaiwatsadu.com/cdnpdf/manual/60405753.pdf) is a cross-check, not a new company listing.

The HomePro and PowerBuy Daikin examples agree on the 9,200 BTU/h presentation for FTKM09YV2S. The site lists both pages as references beside the manufacturer-backed details. Their current selling terms remain theirs and can change independently.

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
2. Manufacturer-source evidence for the remaining 586 website rows, starting with capacity, indoor/outdoor model pairing, dimensions, refrigerant, electrical phase/voltage, wiring, and pipe diameters where manuals state them.
3. Four Central Air CFW-2JSFE candidate records were withheld because the available source was HTTP-only and could not be verified through HTTPS. They need a secure manufacturer source before publication.
4. Field-specific review of electrical wiring and phase is still partial; no generic conductor count or cable size should be presented as model-specific without a manual reference.
5. If “Google top five” means actual organic position rather than a sample of public service pages, provide the target search queries, area, device, and Search Console/SERP baseline. No SEO ranking claim is made in this update.
