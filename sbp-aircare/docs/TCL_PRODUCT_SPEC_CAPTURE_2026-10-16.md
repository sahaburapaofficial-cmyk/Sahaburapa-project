# TCL exact-model specification capture — 16 October 2026

This capture records the official TCL Thailand pages and exact model-specific specification responses used to update the AirCare development catalog. The product-selector model value was checked against the selected product's official `product_spec` response before matching each row. Raw JSON snapshots are retained in `docs/evidence/tcl-2026-10-16/`; their SHA-256 values are listed below and recalculated by `tests/model-evidence.mjs`.

## Verified model records

All dimensions below are manufacturer W × H × D (mm). Refrigerant piping is liquid / gas. “Company band” is the pre-existing AirCare Pricebook capacity band, not a substitute for manufacturer-rated capacity. “Connecting” is manufacturer interconnect wiring; “cord” is a separate factory Power Cord value when TCL publishes it.

### BreezeIN WiFi and SaveIN F1

| Exact model | OEM rated BTU/h / company band | Supply | Rated input / current | SEER | Liquid / gas pipe | Indoor / outdoor dimensions | Connecting / factory cord |
|---|---:|---|---:|---:|---|---|---|
| TAC-BR10CSV/TB | 9,200 / 9,500 | 220–240 V, 1 phase, 50/60 Hz, supply from outdoor | 736 W / 3.2 A | 18.87 | 6.35 / 9.52 mm | 790×275×192 / 787×290×498 | 4×0.75 / 3×1.5 mm² |
| TAC-BR13CSV/TB | 12,300 / 12,000 | 220–240 V, 1 phase, 50/60 Hz, supply from outdoor | 1,181 W / 5.2 A | 18.94 | 6.35 / 9.52 mm | 790×275×192 / 787×290×498 | 4×0.75 / 3×1.5 mm² |
| TAC-BR19CSV/TB | 18,400 / 18,000 | 220–240 V, 1 phase, 50/60 Hz, supply from outdoor | 1,672 W / 7.5 A | 19.31 | 6.35 / 12.7 mm | 920×306×195 / 795×305×549 | 4×0.75 / 3×1.5 mm² |
| TAC-BR25CSV/TB | 24,200 / 24,000 | 220–240 V, 1 phase, 50/60 Hz, supply from outdoor | 2,283 W / 10.5 A | 19.11 | 6.35 / 12.7 mm | 1,100×333×222 / 853×349×602 | 4×0.75 / 3×1.5 mm² |
| TAC-SA30CSV/ZB | 30,000 / 30,000 | 220–240 V, 1 phase, 50/60 Hz, supply from outdoor | 2,399 W / 12.5 A | 18.80 | 6.35 / 15.88 mm | 1,220×362×251 / 927×380×699 | 4×0.75 / 3×2.5 mm² |

### BreezeIN Premium

| Exact model | OEM rated BTU/h / company band | Supply | Rated input / current | SEER | Liquid / gas pipe | Indoor / outdoor dimensions | Connecting |
|---|---:|---|---:|---:|---|---|---|
| TAC-PRO09PE | 9,895 / 9,895 | 220–240 V, 1 phase, 50 Hz | 630 W / 2.9 A | 23.95 | 6.35 / 9.52 mm | 920×195×306 / 810×549×305 | 4×1.0 mm² |
| TAC-PRO12PE | 12,283 / 12,283 | 220–240 V, 1 phase, 50 Hz | 870 W / 4.0 A | 23.37 | 6.35 / 9.52 mm | 920×195×306 / 810×549×305 | 4×1.0 mm² |
| TAC-PRO18PE | 18,425 / 18,425 | 220–240 V, 1 phase, 50 Hz | 1,355 W / 6.3 A | 23.13 | 6.35 / 12.7 mm | 1,097×222×332 / 863×602×349 | 4×1.5 mm² |
| TAC-PRO24PE | 23,884 / 23,884 | 220–240 V, 1 phase, 50 Hz | 1,860 W / 8.6 A | 22.49 | 6.35 / 12.7 mm | 1,097×222×332 / 927×699×380 | 4×0.75 mm² |

### New Miracle

| Exact model | OEM rated BTU/h / company band | Supply | Rated input / current | SEER | Liquid / gas pipe | Indoor / outdoor dimensions | Connecting |
|---|---:|---|---:|---:|---|---|---|
| TAC-MFS10 | 9,000 / 9,500 | 220–240 V, 1 phase, 50 Hz | 680 W / 3.2 A | 13.51 | 6.35 / 9.52 mm | 816×205×291 / 787×498×290 | 3×1.00 mm² |
| TAC-MFS13 | 12,520 / 12,000 | 220–240 V, 1 phase, 50 Hz | 945 W / 4.4 A | 13.55 | 6.35 / 9.52 mm | 816×205×291 / 810×549×305 | 3×1.00 mm² |
| TAC-MFS19 | 18,603 / 18,000 | 220–240 V, 1 phase, 50 Hz | 1,405 W / 6.5 A | 13.48 | 6.35 / 12.7 mm | 1,010×220×315 / 863×602×349 | 3×1.50 mm² |

The site keeps manufacturer-rated BTU and the pre-existing company Pricebook band separate. The seven differing bands in the eight new models are surfaced as a comparison; the company band, sale prices, installation prices, and quote calculations are unchanged. Rated/max input and current, inverter flag, refrigerant and charge, compressor, other published fields, and their exact source locators are stored model-by-model in `assets/model-evidence.json`.

TCL's listed wiring/cable conductor counts do not mean electrical phase counts. `Power Cord` is retained as a separate manufacturer field and is not treated as an installed mains cable. TCL's checked model specifications do not state breaker ratings, so breaker claims were not added. No warranty, current retail price, stock, or model-specific photo was imported.

## Official sources and retained captures

Family pages checked on 16 October 2026:

- [BreezeIN WiFi](https://www.tcl.com/th/th/air-conditioners/breezein-wifi-series) — page SHA-256 `e6cf21ea303a5506a18c96ba4599e5140e592d9831f04c7537511e0f08b1bcaa`
- [BreezeIN Premium](https://www.tcl.com/th/th/air-conditioners/breezein-premium-series) — page SHA-256 `cbedd10acadbcdac29d5273d3e7806ba9d072344b5b45ee0c2fad68d8f8b7327`
- [SaveIN F1](https://www.tcl.com/th/th/air-conditioners/savein-f1-series) — page SHA-256 `4d3bef36f3aa075649fb8076bcfbb2a2ee8425989543a02fdea3e78e98217648`
- [New Miracle](https://www.tcl.com/th/th/air-conditioners/new-miracle-series) — page SHA-256 `1970c5ca206cfee10e4dd49780ee99163bd747dca8e038ad807418b55ae43a6f`

| Model | Retained official JSON snapshot | SHA-256 |
|---|---|---|
| TAC-BR10CSV/TB | `docs/evidence/tcl-2026-10-16/breezein-wifi-series_TAC_BR10CSV_TB.json` | `c03bbb98cad8f7460ad8898e7b7059041f1684a2ec7f709580420e9badfe6d76` |
| TAC-BR13CSV/TB | `docs/evidence/tcl-2026-10-16/breezein-wifi-series_TAC_BR13CSV_TB.json` | `90a82454d3308cf9f42344867c412f84b56f3f41d217cee958aa2ad0bfa8186c` |
| TAC-BR19CSV/TB | `docs/evidence/tcl-2026-10-16/breezein-wifi-series_TAC_BR19CSV_TB.json` | `bee1985830961ec1178642185c3682f8d25026f336912fd06371f6a76c52b0f2` |
| TAC-BR25CSV/TB | `docs/evidence/tcl-2026-10-16/breezein-wifi-series_TAC_BR25CSV_TB.json` | `1410fced41a9e9350b87323aa64c8d1bdd08a7fdab38ad590dbc54200f635d15` |
| TAC-PRO09PE | `docs/evidence/tcl-2026-10-16/breezein-premium-series_TAC_PRO09PE.json` | `cd6b8853eaa5e086f1b131f60f72bf6b44e2fd22843513325f1847e29d694359` |
| TAC-PRO12PE | `docs/evidence/tcl-2026-10-16/breezein-premium-series_TAC_PRO12PE.json` | `59175d00b019c1103517e55fd0cfab896073426df90bc8fb0f93a440959d7879` |
| TAC-PRO18PE | `docs/evidence/tcl-2026-10-16/breezein-premium-series_TAC_PRO18PE.json` | `3406e3f8ca2aff9579006ff53e04473dcf599110de2deafb05b3de347659ba97` |
| TAC-PRO24PE | `docs/evidence/tcl-2026-10-16/breezein-premium-series_TAC_PRO24PE.json` | `ff9856052d21d3e38925b41cb1a15beb59632bf8a73c3516ae069aa37e11491b` |
| TAC-SA30CSV/ZB | `docs/evidence/tcl-2026-10-16/savein-f1-series_TAC_SA30CSV_ZB.json` | `1cff556d42a930afbdcce06ae43b562d18dec67ca64b400e268e9c9de5715dba` |
| TAC-MFS10 | `docs/evidence/tcl-2026-10-16/new-miracle-series_TAC_MFS10.json` | `249464aec884647960e3bec65771e8ef749edfe35b377de138c9430bdede252a` |
| TAC-MFS13 | `docs/evidence/tcl-2026-10-16/new-miracle-series_TAC_MFS13.json` | `53aeb9a9a4fe8ed95e1e6f62c156fc3654e9b650f2e9c9ac6db639271b58074f` |
| TAC-MFS19 | `docs/evidence/tcl-2026-10-16/new-miracle-series_TAC_MFS19.json` | `1b6664bb9d74d51780f4307cb6e04647ba9fa31322fa2d95de5a696049589213` |

## TCL identities kept on hold

- `TAC-MFS25 / TAC-MFS26` remains a combined, non-unique company code. Manufacturer support and product listings expose different suffixes/variants; no single model was selected.
- `T-VOXIN10`, `T-VOXIN19`, and `T-VOXIN25` do not exactly match official `T-VoxIN10S`, `T-VoxIN19S`, and `T-VoxIN25S` codes.
- Legacy `TAC-PRO09/12/18/24` and `TAC-TVOX09/13/19/25` lack exact mapping to current TCL model selectors.
- Exact TCL model photos are still absent from `assets/product-media.json`; family imagery is not substituted for exact model photography.
