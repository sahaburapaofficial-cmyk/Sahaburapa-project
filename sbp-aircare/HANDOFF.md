# HANDOFF.md — SBP AirCare Website (ต้นแบบ A · B · C) · ส่งต่องาน

> **อ่านไฟล์นี้ก่อนไฟล์อื่น** — สรุปทุกอย่างที่ต้องรู้เพื่อพัฒนาต่อได้ทันที (สถานะ ณ **2 ต.ค. 2569 · Rev.13** — Rev.12 ขึ้นเว็บแล้ว)
> รายละเอียดเชิงลึก (API ทุกโมดูล, สัญญา 3 มิติ, โค้ดกฎธุรกิจ, build.py เต็ม) อยู่ใน [`CLAUDE.md`](CLAUDE.md) · แผนส่งมอบทีม Dev ฉบับเต็มอยู่ใน [`SBP-WEB-011_Dev_Handoff_Plan.md`](SBP-WEB-011_Dev_Handoff_Plan.md)
> เจ้าของงาน: บริษัท สหบูรพากรุ๊ป จำกัด (แบรนด์ SBP AirCare / บริการ Sahaburapa Service) · repo **`sahaburapaofficial-cmyk/Sahaburapa-project`** (Public — เจ้าของอนุมัติ 2 ต.ค. 2569) โฟลเดอร์ `sbp-aircare/` · repo เดิม `jenokubz-rgb/Jeno-Project` ไม่ใช้แล้ว

---

## 0. สิ่งที่ต้องรู้ก่อนเริ่ม (อ่าน 1 นาที)

| เรื่อง | สถานะจริง ณ ตอนนี้ |
|---|---|
| **ซอร์สโค้ดอยู่ที่ไหน** | ★Rev.10 อยู่ใน GitHub แล้ว: `sahaburapaofficial-cmyk/Sahaburapa-project` โฟลเดอร์ `sbp-aircare/` (repo **Public** ตามคำสั่งเจ้าของ 2 ต.ค. 2569 เพื่อให้คนอื่นดูและทดสอบได้) · `internal/`, `dist/`, `node_modules/`, `*.png` ถูก `.gitignore` กันไว้ — **ห้าม** commit `internal/sbp_real.json` |
| **เป็นเว็บแบบไหน** | ต้นแบบ (prototype) 3 แบบที่ใช้โมดูลร่วมกัน ต่างกันที่ภาษาภาพ — **เจ้าของยังไม่เลือกแบบ** กำลังเตรียมให้ลูกค้าทดลองใช้ (beta) ทั้ง 3 แบบ |
| **มี backend ไหม** | ไม่มี database / login · ★Rev.10 ฟอร์ม 3 จุด (ติดต่อ · ใบเสนอราคา · ความเห็น) ส่งถึงทีมผ่าน **Google Apps Script → Google Sheet + อีเมล** (`assets/submit.js`, `backend/`) **เมื่อเจ้าของ deploy สคริปต์และใส่ `ENDPOINT` แล้ว** — ตอนนี้ `ENDPOINT` ยังว่าง จึงยังเป็นกล่องสรุปให้ลูกค้าส่งทาง LINE / อีเมล / โทร |
| **Deploy ที่ไหน** | ★Rev.10 **GitHub Pages** (build อัตโนมัติทุกครั้งที่ `sbp-aircare/` บน `main` เปลี่ยน — `.github/workflows/sbp-aircare-pages.yml` · ★Rev.11 อัปโหลด `dist/site/` แบบแยกไฟล์) → https://sahaburapaofficial-cmyk.github.io/Sahaburapa-project/ · ลิงก์ Claude Artifacts ชุดเดิมยังอยู่ (เป็นของบัญชีเดิม) — ดู §6 |
| **ห้ามทำ** | แก้ราคา/กฎธุรกิจ (§7) · commit/เผยแพร่ `internal/sbp_real.json` · publish ทับลิงก์ชุดที่แชร์อยู่โดยไม่ได้รับคำสั่ง · รัน `npx playwright install` บน Claude Code web · ใส่โลโก้เลียนแบบ |
| **ภาษา** | ข้อความที่ผู้ใช้เห็น = ไทย · คอมเมนต์โค้ด = อังกฤษ · ตอบเจ้าของเป็นภาษาไทย |

---

> ★**Rev.13 (2 ต.ค. 2569 — เจ้าของ: "Deploy ใช้งานเลย ข้อมูลที่ขาดค่อยเติม · เน้น UX/UI, 4D 3D automation movement view, ภาพสวยคมชัดเสมือนจริง")**
> - ฉากทีมช่าง **เล่นเองเมื่อเลื่อนมาถึง** (หยุดเมื่อออกจอ · ผู้ชมกดอะไรในส่วนนี้ = ควบคุมเอง) · **ลากหมุนมุมมองได้** ทุกเครื่อง · กล้องแกว่งช้าแบบภาพยนตร์บนคอม · ตัวเครื่องหน้าแรกหมุนโชว์นุ่มขึ้น
> - ภาพคมขึ้นบนคอม (เรนเดอร์ 1.5× ลดเองถ้าเครื่องช้า) · แบบ C มือถือ: ข้อความ + ปุ่มจองก่อนภาพ 3 มิติ · จุดชิ้นส่วนแบบหมุดแก้ว · จองล้างบอก "เพิ่มได้อีก N เครื่อง ยอดเท่าเดิม" + ปุ่ม +1
> - **รอบ 13.2:** แก้บั๊กสลับประเภทแอร์ในฉากทีมช่าง (เคย error + ค้างทุกครั้งที่สลับ) · ไอคอนประเภทแอร์ใหม่ทั้งชุด (แขวนใต้ฝ้าไม่เหมือนติดผนังแล้ว) · ห้องจำลอง: ตั้งอุณหภูมิเฉลี่ย + ตารางค่าไฟทุกประเภท (Inverter/Fixed ต่อเดือน·ปี พร้อมแหล่งอัตรา ก.ย. 2569) + สภาพแวดล้อมรอบห้อง (แมว/สุนัข · ที่ตั้ง · PM2.5 → ความเสี่ยงอุดตันและรอบล้าง) · ภาพสินค้าไฟสตูดิโอ 1080×720 · **ส่งรูปหน้างานทาง LINE ให้ทีมประเมิน** ลดการนัดสำรวจ
> - ตรวจทั้งเว็บ 3 แบบ × 6 หน้า: สถานะโหลดภาพ 3 มิติ · แก้เลื่อนแนวนอนบนแท็บเล็ต · axe ไม่มีปัญหาร้ายแรงทุกหน้า · ป้ายห้องจำลองไม่ล้นขอบ

> ★**Rev.12 (2 ต.ค. 2569 — เจ้าของ: "ทำ 4 มิติ และปรับภาพ 3 มิติให้สมจริงขึ้น")**
> - **4 มิติ = งานล้าง/ติดตั้งเดินตามการเลื่อนจอ** (`jobguide.js` ปุ่ม "4D ดูทั้งงานแบบเลื่อนจอ"): ฉากทีมช่างค้างอยู่บนจอ (sticky) ขณะเลื่อนลง ทุกช่วงของการเลื่อน = ขั้นถัดไปของงาน · แถบเวลาแบ่งตามช่วงงาน (เฟส) มีตัวชี้ "ขั้นที่ i จาก n · ช่วง · x% ของงาน" · ปิดได้ทุกเมื่อ (`set4D(false)`) · แสดงเวลาทั้งงานโดยประมาณ (ไม่แบ่งนาทีต่อขั้น)
> - **โลโก้จริงของบริษัท** (เจ้าของส่ง): ตรา SP (บริษัท สหบูรพากรุ๊ป จำกัด) ที่ header ทั้ง 3 แบบ · เกี่ยวกับเรา · footer · ในภาพ 3 มิติบนของของทีมช่าง (เสื่อ ป้ายเสื้อ กล่องเครื่องมือ ถุงล้าง แท็บเล็ต ป้ายร้าน) · FUJIVA บนเสื่อ ถุงล้าง ตัวเครื่อง/กล่อง FUJIVA — ไฟล์ `assets/logos/sbp.png`, `fujiva.png`, `fujiva-light.png` · คอยล์ร้อนของภาพยี่ห้ออื่นไม่มีป้าย FUJIVA แล้ว (เดิมติดทุกภาพ)
> - **เวลาทำการ** จันทร์–เสาร์ 08:30–17:30 (หยุดอาทิตย์) · นอกเวลา/อาทิตย์ให้บริการได้ มีค่าใช้จ่ายเพิ่มเติม (ไม่ระบุจำนวนเงิน) — แสดงที่เกี่ยวกับเรา, footer, จองล้าง (เตือนเมื่อเลือกวันอาทิตย์), schema.org
> - **เวลาโดยประมาณต่อเครื่อง** (ข้อมูลร้านแอร์ที่ประกาศออนไลน์ · กำกับว่าขึ้นกับหน้างานและสภาพเครื่อง ไม่ใช่เกณฑ์): ล้างปกติ ติดผนัง 30–60 นาที · แขวน/สี่ทิศทาง/ตู้ตั้ง 40 นาที–1.5 ชม. · ล้างใหญ่ 1.5–2.5 / 1.5–2 ชม. · ติดตั้ง ติดผนัง 2–4 ชม. · แขวน/ตู้ตั้ง 3–6 ชม. · สี่ทิศทาง 3–8 ชม. — ในการ์ดเทียบและแถบ 4D (`jobguide.JOB_TIME`)
> - **ภาพ 3 มิติคมและสมจริงขึ้นบนคอมที่แรงพอ** (`assets/quality3d.js` ผ่าน `gl-pool.track`): เงาความละเอียด 2048 (เดิม 1024 — เงาใต้เครื่อง ช่าง เฟอร์นิเจอร์คมขึ้น) + anisotropic filtering ทุก texture (ตัวพิมพ์บนฉนวน พื้นไม้ ป้าย คมเมื่อมองเฉียง) · มือถือ/แท็บเล็ต/GPU ซอฟต์แวร์ = เหมือนเดิมทุกอย่าง (ไม่ช้าลง) · `?hq=1` / `?hq=0` บังคับเปิด/ปิดเพื่อทดสอบ · ลอง SSAO (three GTAOPass) แล้ว **ไม่ใช้** — สีลมเพี้ยนและมีขอบมืดที่ฝาข้างตัวเครื่อง

> ★**Rev.11 (2 ต.ค. 2569 — เจ้าของ: "จัดทำให้ทั้งหมด … สวยขึ้น ดีขึ้น ลื่นขึ้น พัฒนาอย่างเดียว")**
> - **เร็วขึ้นบนมือถือ (ไม่ลดคุณภาพภาพ):** ฉาก 3 มิติ/แผนที่ในหน้าที่ซ่อนอยู่ไม่สร้าง WebGL ตอนโหลดอีกแล้ว (`lazy.js` `deferred()` ใน `mountViewer` และ `mountThaiMap`) · ภาพเรนเดอร์สินค้าทำทีละภาพเมื่อการ์ดใกล้จอ + จำไว้ใน `localStorage['sbp-shots-r11']` (`product-media.productShot`) · เว็บที่โฮสต์ใช้ **build แยกไฟล์ `dist/site/`** (esbuild code splitting, three.js chunk ร่วม, ข้อมูลราคาเป็นไฟล์ js ที่ cache ได้, ฟอนต์เป็นไฟล์) — วัดบนมือถือจำลอง 4G + CPU ช้า 4×: ใช้งานได้ (DOMContentLoaded) จาก 17–26 วิ → **4.8–5.5 วิ** · เห็นเนื้อหาแรก 1.4–1.5 วิ
> - **หน้าแรกเน้นงานล้าง** ทั้ง 3 แบบ: หัวเรื่องใหม่ + "เริ่ม ฿…/เครื่อง" (คำนวณจาก Pricebook — ต่ำสุดของ ล้างมาตรฐาน/ล้างพร้อมรายงานภาพ C1) + **จองล้างแอร์ 3 ขั้น** (`assets/quickclean.js`, section `#book`): แอร์ (ประเภท·ขนาด·จำนวน) → วิธีล้าง (ล้างปกติ C1/ล้างใหญ่ C2 · แพ็กเกจ) → พื้นที่·วันที่ → ราคารวมสด (ใช้ `commerce.quoteTotals` ตัวเดียวกับใบเสนอราคา: VAT · ขั้นต่ำงานล้าง · ค่าเดินทาง) → "จองล้างแอร์" (ใส่ใบเสนอราคา + พาไปกรอกชื่อ/เบอร์) หรือ "ส่งทาง LINE" (ข้อความสรุปพิมพ์ให้) · เส้นทางลูกค้า "ล้างแอร์" เริ่มที่ `#book`
> - **ภาษาลูกค้า:** แพ็กเกจแสดงเป็น "ล้างมาตรฐาน (Basic Clean)" / "ล้างพร้อมรายงานภาพ (Standard Care)" / "ล้างพร้อมทะเบียนทรัพย์สิน (Corporate Control)" · ตัดรหัสแบบฟอร์มออกจากหัวข้อหน้า A (ยังอยู่ในรายละเอียดขั้นตอน/แบบ B สำหรับองค์กร)
> - **LINE เด่นขึ้น:** ปุ่ม "แชท LINE" ลอยบนคอม/แท็บเล็ต · ปุ่มส่งทาง LINE เปิดแชต @sahaservices พร้อมข้อความสรุป (`contact.lineLink` — LINE URL scheme oaMessage)
> - **Google + การแชร์ลิงก์:** title/description/canonical/Open Graph/Twitter card ทุกหน้า · ภาพตัวอย่างลิงก์ `assets/og/sbp-aircare-og.png` (สร้างด้วย `npm run og` จากภาพ 3 มิติของเว็บเอง ไม่มีราคาในภาพ) · ข้อมูลธุรกิจ schema.org (HVACBusiness) สร้างจาก `COMPANY` · `sitemap.xml`
> - เทสต์ใหม่: `npm run booking` (ยอดจองล้าง = ยอดใบเสนอราคา, ไม่ใส่ซ้ำ, LINE link) · `npm run smoke:site` (เทียบบน build แยกไฟล์ — ต้อง `npm run serve:site`)

> ★Rev.10.1 (2 ต.ค. 2569 — เจ้าของเลือก "ส่งเข้าอีเมล"): `ENDPOINT` = **FormSubmit** `https://formsubmit.co/ajax/Sahaburapa.official@gmail.com` → ทุกคำขอ/ความเห็น (ฟอร์มติดต่อ · ใบเสนอราคา · ความเห็นในหน้าเว็บ · ปุ่ม "ส่งผลให้ทีม" ในหน้าทดสอบ A/B/C) มาเป็นอีเมลตาราง · **ต้องกด "Activate Form" ในอีเมลยืนยันจาก FormSubmit 1 ครั้ง** (ส่งไปแล้ว 2 ต.ค. 2569) ก่อนหน้านั้นการส่งจะไม่สำเร็จและเว็บแสดงกล่องสรุปแทน · ข้อมูลผ่านเซิร์ฟเวอร์ผู้ให้บริการต่างประเทศ (ฟรี) — ย้ายไป Google Sheet ได้ภายหลังด้วยการเปลี่ยน `ENDPOINT` เป็น URL Apps Script (`backend/README.md`) โค้ดรองรับทั้งสองแบบ

---

## 1. Tech Stack & Dependencies

### 1.1 ที่ใช้จริงในโค้ดตอนนี้

| ชั้น | ใช้อะไร | เวอร์ชัน | หมายเหตุ |
|---|---|---|---|
| ภาษา | HTML5 · CSS (custom properties) · **JavaScript ES modules (ES2022)** | — | ไม่มี TypeScript / JSX / transpile ตอน dev |
| Framework | **ไม่มี** (vanilla DOM) | — | สร้าง DOM ด้วย `h(tag, attrs, ...kids)`, `$()`, `$$()` จาก `assets/sbp-core.js` · ทุกโมดูล UI เป็น `mountX(root, cfg)` |
| CSS framework | **ไม่มี** (ไม่ใช้ Tailwind) | — | token ต่อแบบใน `:root` ของ `a/b/c.html` + alias `--s-*` ให้โมดูลร่วม |
| 3D | **three.js r170** (vendored, ห้ามแก้) | r170 | `assets/three.module.min.js` + addons `GLTFLoader.js`, `RoomEnvironment.js`, `BufferGeometryUtils.js` · ทุกโมเดลสร้างจากโค้ด (procedural) ไม่มีไฟล์ GLB |
| ฟอนต์ | self-hosted woff2 (`assets/fonts/`, `fonts.css`) | — | Anuphan · IBM Plex Sans Thai · IBM Plex Mono · Kanit (แยก subset ไทย/ละติน) — ห้ามโหลดจาก CDN |
| ข้อมูล | `assets/sbp-data.json` (Pricebook สาธารณะ 220 KB) · `assets/thai-provinces.json` (77 จังหวัด, Natural Earth public domain) · `assets/product-media.json` | Pricebook 2569 (29.09.2569) | ไม่มี database |
| Build | **Python 3.11** (`build.py`) + **esbuild 0.28.2** (เรียกผ่าน `npx --yes esbuild@0.28.2`) | 3.11.15 / 0.28.2 | รวมทุกอย่างเป็นไฟล์ HTML เดียว |
| Runtime สำหรับเครื่องมือ | **Node.js 22** | v22.22.0 | ใช้กับเทสต์เท่านั้น (เว็บไม่ต้องมี Node) |
| ทดสอบ | **Playwright 1.56.0** (Chromium + swiftshader) · **axe-core 4.13.0** | ตาม `package.json` devDependencies | `tests/*.mjs` |
| กระทบยอดราคา | `tools_recon.py` (Python ล้วน ไม่มี dependency) | — | ต้องได้ `"mismatches": 0` |
| Hosting | Claude Artifacts | — | ไม่มีโดเมนของตัวเอง |

`package.json` มีแค่ `devDependencies` 2 ตัว (playwright, axe-core) — **ไม่มี runtime dependency** · Python ใช้แค่ standard library

### 1.2 ที่ "แนะนำ" สำหรับเวอร์ชันใช้งานจริง (ยังไม่เริ่ม — อย่าเข้าใจผิดว่ามีแล้ว)

Next.js (App Router) + TypeScript · CSS variables จากต้นแบบ (+ CSS Modules หรือ Tailwind อ่าน token) · PostgreSQL/Supabase + สคริปต์นำเข้า Pricebook จาก Excel · API ใบเสนอราคาคำนวณยอดซ้ำฝั่ง server · Google Distance Matrix · แจ้งเตือนทีมขายผ่าน LINE OA / อีเมล — รายละเอียด `CLAUDE.md` §2.3 และ §8 Step 7

---

## 2. Project Structure

```
Jeno-Project/                      (repo — รวมหลายโปรเจกต์ แต่ตอนนี้มีโปรเจกต์เดียว)
├── README.md · CLAUDE.md          ภาพรวม repo + กฎระดับ repo (อ่าน sbp-aircare/CLAUDE.md ก่อนแก้)
├── .claude/settings.json          ลงทะเบียน SessionStart hook
├── .claude/hooks/session-start.sh บน Claude Code web: npm install + ดึง esbuild ไว้ล่วงหน้า + เตือนถ้าไม่มี internal/sbp_real.json
└── sbp-aircare/
    ├── HANDOFF.md                 ← ไฟล์นี้
    ├── CLAUDE.md                  สเปกเทคนิคเต็ม (API ทุกโมดูล, กฎ §6.6, บั๊ก §7.2, roadmap §8)
    ├── SBP-WEB-011_Dev_Handoff_Plan.md   แผนส่งมอบทีม Dev ฉบับเต็ม (คำตัดสินเจ้าของ, สเปกฟีเจอร์ 6A–6V, acceptance checklist)
    ├── package.json · package-lock.json  npm scripts + devDependencies
    ├── .gitignore                 node_modules/ dist/ internal/ _entry_*.mjs *.png
    ├── urls.json                  URL ลิงก์ชุดที่แชร์ "ทุกคนที่มีลิงก์" (build แปลงลิงก์ระหว่างหน้า)
    ├── urls.dev.json              URL ลิงก์ชุดทดลองพัฒนา (private)
    ├── build.py                   สร้างไฟล์เดียว → dist/offline/*, dist/art/*
    ├── tools_recon.py             กระทบยอดทุกราคาบนเว็บกับ Pricebook ภายใน
    │
    ├── a.html                     แบบ A · Bento Clean (สว่าง สะอาด แบบแอป) — markup + CSS tokens + <script type="module"> ตัวเดียว (wiring)
    ├── b.html                     แบบ B · Engineering Sheet (แบบวิศวกรรม เน้นองค์กร)
    ├── c.html                     แบบ C · Virtual Showroom (โชว์รูมมืด)
    ├── preview.html               หน้าทดสอบ A/B/C: สลับแบบ/ขนาดจอ เทียบพร้อมกัน รายการทดลอง 15 ข้อ ให้คะแนน 6 ด้าน
    ├── test-*.html · test3d.html · testroom.html   หน้าทดสอบโมดูลเดี่ยว (debug / screenshot) — test-clean.html, test-ts.html ใช้ window.TS / window.READY
    ├── index.html · hub.tpl.html · hub.tpl2.html · hub-local.html   ⚠️ LEGACY ไม่ได้ใช้ใน build (ลบได้หลังเจ้าของยืนยัน)
    │
    ├── tests/                     Playwright (ต้องเปิด dev server ที่ :8765 ก่อน)
    │   ├── _lib.mjs               launch() แบบ swiftshader + scrollAll()
    │   ├── smoke.mjs              console error, WebGL context (live/peak/created), overflow แนวนอน — ไล่ทุก view
    │   ├── textscan.mjs           คำต้องห้าม / Type L / K Copper / ต้นทุน ในข้อความที่แสดง — ไล่ทุก view
    │   ├── story-shots.mjs · section-shots.mjs · shot.mjs   ถ่ายภาพตรวจงานออกแบบ
    │   └── _*.tmp.mjs             สคริปต์ชั่วคราว (ไม่อยู่ใน zip)
    │
    ├── internal/sbp_real.json     ⛔ ไฟล์ภายใน (อัตราพิเศษ/โครงการ) — gitignored ไม่อยู่ใน zip เจ้าของอัปโหลดให้เมื่อต้องรัน recon
    ├── dist/                      ผล build (gitignored)
    │
    └── assets/
        ├── ข้อมูล      sbp-data.json · thai-provinces.json · product-media.json · products/ (รูปสินค้า — ยังว่าง) · logos/ (โลโก้ทางการ — ยังว่าง)
        ├── CSS         shared.css (โมดูลร่วม + site.js) · studio.css · services.css · fonts.css
        ├── แกนกลาง     sbp-core.js   ★ ข้อมูล + กฎธุรกิจ (VAT, โซน, ค่าเดินทาง, แพ็กเกจล้าง, สัญญา, BTU, COMPANY, h/$/$$)
        ├── โครงเว็บ     site.js       ★r5 6 หน้า (views) · เส้นทางลูกค้า · ข้อมูลบริษัท · ฟอร์มความเห็น · footer
        ├── ขาย/ราคา    proto-ui.js (catalog, contract builder, zone, FAQ, viewer, drawer, toast)
        │               commerce.js (cart ใบเสนอราคา, product detail, price centre, ตารางวัสดุ)
        │               contact.js (ฟอร์มติดต่อ, askTeam, handoffBox สรุปคำขอ Beta)
        │               journey.js (ตารางค่าเดินทาง, ปุ่มใบเสนอราคาลอย, เมนูมือถือ, แถบขั้นตอนใช้บริการ)
        ├── เนื้อหา      services.js (ขั้นตอนล้าง/ติดตั้ง/ซ่อม ตามแบบฟอร์มบริษัท) · knowledge.js (ศูนย์ความรู้ 12 หัวข้อ) · hw-data.js
        ├── เครื่องมือ    studio.js + studio-model.js + studio3d.js (ห้องจำลอง 48 ห้อง) · roomfit.js + roomfit3d.js + roomplan.js (ลองวางแอร์ในห้อง)
        │               jobguide.js + jobscene3d.js + crew3d.js + brand3d.js (ทีมช่างล้าง/ติดตั้ง 3 มิติ) · product-media.js (รูป/ภาพเรนเดอร์สินค้า)
        ├── 3 มิติ       ac3d.js (ตัวเครื่อง + viewer) · units3d.js · howitworks3d.js · throwsim3d.js · airflow3d.js · wisp3d.js (ลมธรรมชาติ)
        │               install3d.js · tech3d.js · techstory.js [C] · system3d.js + engdraw.js [B] · materials3d.js + matkit3d.js
        │               thaimap3d.js · trunk3d.js · roomkit3d.js · people3d.js · gl-pool.js (งบ WebGL ≤3)
        └── vendored    three.module.min.js · GLTFLoader.js · RoomEnvironment.js · BufferGeometryUtils.js (three.js r170 ห้ามแก้)
```

**ขนาดโค้ด:** ~15,800 บรรทัด (HTML/CSS/JS/Python/เทสต์ ไม่รวม three.js ~6,250 บรรทัด) · โมดูล JS ของโปรเจกต์ 38 ไฟล์ + three.js 4 ไฟล์

**สถาปัตยกรรม:** แต่ละ `a/b/c.html` มี `<script type="module">` ตัวเดียว: `await loadData()` → `await loadMedia()` → mount ทุกโมดูลลงใน section ของตัวเอง → **`mountSite()` ท้ายสุด** (แบ่ง section เป็น 6 หน้า) · โมดูล 3 มิติ boot แบบ lazy ด้วย `IntersectionObserver` (section ในหน้าที่ซ่อนอยู่จึงไม่โหลด 3D) · state อยู่ใน closure ของแต่ละ `mountX` ไม่มี store กลาง ยกเว้น `cart` (singleton + localStorage)

**Data flow ราคา:** Excel Pricebook ของบริษัท → (สคริปต์แปลง ad-hoc ไม่อยู่ใน repo ⚠️) → `assets/sbp-data.json` (สาธารณะ: อัตรามาตรฐาน + รุ่นที่อนุมัติ, `sp`/`pj` = null) + `internal/sbp_real.json` (ภายใน) → `loadData()` แปลงตอนโหลด (K Copper → O-TWO, ซ่อน -MASS / MAT-CU-L-*) → `tools_recon.py` ตรวจ 0 ผิด

**Section id ↔ หน้า (views) ของแต่ละแบบ** (กำหนดใน `mountSite({views})` ท้าย script ของแต่ละหน้า):

| หน้า | A | B (เรียง: หน้าแรก → องค์กร → บริการ → ซื้อ → ความรู้ → ติดต่อ) | C |
|---|---|---|---|
| หน้าแรก `home` | hero · start · flow · services | hero · start · flow | top · start · flow |
| ซื้อแอร์ `shop` | catalog · studio · fit | catalog · fit · studio | catalog · room · fit |
| ล้าง·ติดตั้ง·ซ่อม `service` | cleanflow · prices · quality · story · inside | cleanflow · howto · prices · quality | cleanflow · howto · prices · quality |
| สำหรับองค์กร `business` | b2b | b2b | b2b |
| ความรู้·ลองเอง `knowledge` | learn · howto | learn · inside | journey · learn |
| ติดต่อเรา `contact` | about · area · faq · quote | about · area · faq · quote | about · area · faq · quote |

---

## 3. Core Features & Status

สัญลักษณ์: ✅ เสร็จ (ระดับต้นแบบ ผ่านเทสต์) · 🟡 ใช้งานได้แต่มีข้อจำกัด/รอข้อมูล · ⛔ ยังไม่ทำ · ทุกข้อมีครบ 3 แบบ เว้นแต่ระบุ

### 3.1 โครงเว็บและประสบการณ์ลูกค้า (Rev.09 r5 — `site.js`)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|---|---|
| แบ่งเว็บ 6 หน้าตามการตัดสินใจของลูกค้า | ✅ | เมนูหลัก · หัวเรื่อง + ทางกลับหน้าแรก + ปุ่มไปหัวข้อ + การ์ด "ขั้นต่อไป" · ลิงก์ `#id`, `scrollIntoView()` ทุกที่สลับหน้าให้เอง · back/forward · deep link `#prices` ฯลฯ ใช้ได้ · เมนูแท็บเล็ตเป็นแถวที่ 2 · มือถือแถบล่าง เมนู/ติดต่อ/ใบเสนอราคา |
| หน้าแรก "วันนี้ต้องการอะไร" + เส้นทางลูกค้า | ✅ | 5 เส้นทาง (ล้าง · ซื้อ+ติดตั้ง · ติดตั้ง/ย้าย · ซ่อม · องค์กร) + FUJIVA → พาไปทีละขั้น ป้าย "ขั้นที่ n จาก N" + ปุ่มขั้นต่อไป · จำความคืบหน้า `localStorage['sbp-journey-v1']` |
| ข้อมูลบริษัท / ติดต่อ / footer | ✅ Rev.10 | จาก `COMPANY` ใน `sbp-core.js` (แหล่งเดียว) — ตรวจจากเว็บทางการ sahaburapagroup.com + ทะเบียนนิติบุคคล: ที่อยู่ 593 ถ.พระราม 2 · โทร 02-459-3291-9 · อีเมล Sahaburapa.official@gmail.com (เจ้าของให้) · **LINE OA @sahaservices** (ปุ่ม LINE กลับมาในแถบล่างมือถือ + กล่องสรุปคำขอ) · Facebook · **เลขผู้เสียภาษี 0105553009307** · เว็บบริษัท = **www.sahaburapagroup.com** (⚠️ www.sahaburapa.com กลายเป็นเว็บพนันต่างประเทศแล้ว ห้ามลิงก์) · ★Rev.12 **เวลาทำการ** จันทร์–เสาร์ 08:30–17:30 (เจ้าของให้) + โลโก้ SP / FUJIVA · "พระราม 2 ซอย 31" ไม่พบในแหล่งทางการ → เปลี่ยนข้อความเป็น "593 ถ.พระราม 2" (พิกัด HQ คงเดิม) |
| ส่งคำขอ (ฟอร์มติดต่อ + ใบเสนอราคา) | 🟡 Rev.10 | `submit.deliver()`: มี `ENDPOINT` + โฮสต์เอง → POST ไป Apps Script → "ส่งถึงทีมแล้ว · เลขอ้างอิง" · ส่งไม่สำเร็จ → บอกตรง ๆ + กล่องสรุป · ไม่มี `ENDPOINT` หรือเปิดใน Artifacts → กล่องสรุปแบบเดิม (+ ปุ่มส่งทาง LINE) · ทุกฟอร์มมีข้อความวัตถุประสงค์ข้อมูล (PDPA) + ช่องดักบอท · **รอเจ้าของ deploy สคริปต์** (`backend/README.md`) · เทสต์ `npm run submit` |
| แบบฟอร์มความเห็น Beta | 🟡 Rev.10 | ปุ่ม "ให้ความเห็น" แถบบน + footer → ส่งเข้าแท็บ "ความเห็น" ของ Sheet เมื่อมี `ENDPOINT` (ไม่งั้นสรุปให้ส่งเอง) |
| หน้าทดสอบ A/B/C (`preview.html`) | ✅ | สลับแบบ/ขนาดจอ · เทียบ 3 แบบ · รายการทดลอง 15 ข้อ · ให้คะแนน 6 ด้าน (`localStorage['sbp-preview-v1']`) |

### 3.2 การขายและราคา (ข้อมูลจริงจาก Pricebook 2569)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|---|---|
| Catalog | ✅ | 705 รุ่น 22 แบรนด์ จัดซีรีส์ · ค้นหา · กรองประเภท/แบรนด์/BTU/ราคา/Inverter · เทียบรุ่นสูงสุด 4 · การ์ด/ตาราง |
| หน้าสินค้า (drawer) | ✅ | ราคารวม VAT + ก่อน VAT · สลับ BTU · แพ็กเกจติดตั้ง มาตรฐาน/พรีเมียม/ไม่ติดตั้ง · อุปกรณ์เสริมตามขนาด · ตารางเทียบวัสดุ · สเปก · ใส่ใบเสนอราคา · "ลองวางในห้องของคุณ" |
| FUJIVA (แบรนด์บริษัท) | 🟡 | แสดงเป็น "รอนำเข้าราคา" + ปุ่มสอบถาม — **ยังไม่มีรุ่น/ราคาใน Pricebook** |
| รูปสินค้า | 🟡 | ช่องพร้อม (`product-media.json` + `assets/products/`) — **ยังไม่มีรูปจริง** แสดงภาพเรนเดอร์ 3 มิติกลาง ๆ ตามประเภท |
| ศูนย์ค่าบริการ | ✅ | ล้าง (3 แพ็กเกจ × C1/C2) · ติดตั้ง 167 รายการ · ซ่อม 86 · รื้อ/ย้าย/น้ำยา · วัสดุ · ค้นหาได้ · ทุกแถว "เพิ่ม" หรือ "ขอประเมิน" · VRV/VRF = ติดต่อแยก |
| ตัวคำนวณสัญญาล้างรายปี (B2B) | ✅ | จำนวนเครื่องต่อประเภท × รอบ/ปี × แพ็กเกจ → ราคาต่อปี + กำลังทีม + ยอดขั้นต่ำ |
| ใบเสนอราคาเบื้องต้น (ตะกร้า) | 🟡 | ปรับจำนวน · พื้นที่ → ค่าเดินทาง/ยกเว้น · ยอดขั้นต่ำงานล้าง · VAT · คัดลอกสรุป · เก็บใน `localStorage['sbp-quote-v2']` — ส่งจริงไม่ได้ (ดูบรรทัด "ส่งคำขอ") |
| ตรวจพื้นที่ + ค่าเดินทาง + แผนที่ไทย 3 มิติ | 🟡 | 77 จังหวัด ระบายสีตามโซน — ระยะทาง = เส้นตรงจากพิกัดอำเภอ × 1.35 (ประมาณ) |

### 3.3 ภาพอธิบาย / 3 มิติ (ทุกฉากมีข้อความ "แบบจำลองเพื่ออธิบาย")

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|---|---|
| ตัวเครื่อง 3 มิติ (`ac3d.js`) | ✅ | คอยล์เย็น/ร้อน · แยกชิ้นส่วน · X-ray · ลม · ฝุ่น + ล้างเสมือน · ช่อง `loadModel(url)` สำหรับ GLB ทางการ (ยังไม่มีไฟล์) |
| แอร์ทำงานอย่างไร + ลมเย็นไปทางไหน | ✅ | 3 ประเภท 7 ขั้น · จำลองระยะลม 4 ประเภท + ตัวควบคุม A รีโมต / B แผงห้อง / C แผงกระจก |
| ห้องจำลอง (`studio*`) | ✅ | 48 ห้อง 9 กลุ่ม → BTU + รุ่นแนะนำพร้อมราคา · ฝุ่น 0–18 เดือน → ผลกระทบ (ค่าประมาณ) |
| ลองวางแอร์ในห้องของคุณ (`roomfit*`) | ✅ | ขนาดห้องจริง · เฟอร์นิเจอร์ 21 ชิ้น ห้องตัวอย่าง 7 แบบ ลาก/หมุน/ลบ · ระยะ/ลม/ท่อ/ผลตรวจ — ค่า `FIT_RULES` เป็นค่าแนะนำทั่วไป (รอหัวหน้าช่างตรวจ) |
| ทีมช่างล้าง/ติดตั้ง 3 มิติ (`jobguide` + `jobscene3d` + `crew3d`) | ✅ | ช่าง 2 คน + ลูกค้า · ล้าง C1/C2 · ติดตั้งมาตรฐาน/พรีเมียม × ติดผนัง/แขวน/สี่ทิศทาง/ตู้ตั้ง · 4 สถานที่ · ราคาจาก Pricebook |
| [B] ลำดับการทำงานของระบบ 3 มิติ (`system3d` + `engdraw`) | ✅ | 9 ขั้นต่อประเภท + ภาพตัดวิศวกรรม 2 มิติ |
| [C] ช่างทำงานในบ้านจำลอง (`techstory`) | ✅ | C1 14 · C2 17 · ติดตั้ง 13 · ซ่อม 10 ขั้น |
| โชว์รูมวัสดุ 3 มิติ | 🟡 | O-TWO · Aeroflex · Airpro · Yazaki · SCG · ขาแขวน · NANO — พิมพ์ชื่อยี่ห้อเป็นตัวอักษร (ยังไม่มีไฟล์โลโก้ + หนังสืออนุญาต) |
| ศูนย์ความรู้ (`knowledge.js`) | 🟡 | 12 หัวข้อ บ้าน/องค์กร + ปุ่ม "ลองเอง" — รอหัวหน้าช่างตรวจเนื้อหา |
| งบ WebGL (`gl-pool.js`) | ✅ | live context ≤ 3 ต่อหน้า (เครื่อง RAM ≤2 GB = 2) |

### 3.4 คุณภาพ / ผลตรวจล่าสุด (2 ต.ค. 2569 · Rev.10)

- `npm run smoke` (1366×900) และ `smoke:mobile` (390×844): **0 error ทุกแบบ ไล่ครบ 6 หน้า** · ไม่มีเลื่อนแนวนอน · `webglPeak` A 2 · B 3 · C 3 (มือถือ 2/2/2)
- `npm run textscan`: สะอาดทั้ง 3 แบบ · ★`npm run submit` (ใหม่): 3 ฟอร์ม × ส่งสำเร็จ / ล้มเหลว / ไม่ตั้งค่า ผ่านทั้ง A/B/C · `npm run recon` ไม่ได้รันรอบนี้ (ไม่แตะราคา และไม่มี `internal/sbp_real.json`) — ผลล่าสุด Rev.09 r5: **0 ผิด**
- ไฟล์ build (`dist/offline`) ตรวจบนคอม 1366 · แท็บเล็ต 820 · มือถือ 390: 0 error · ไม่เลื่อนแนวนอน · แถบล่างมือถือ 4 ปุ่ม (เมนู · ติดต่อ · LINE · ใบเสนอราคา) อยู่แถวเดียวถึงจอ 360 px
- build: a 2,701 KB · b 2,777 KB · c 2,838 KB · หน้าทดสอบ (ฝัง 3 แบบ สำหรับ Artifacts) 4,440 KB · หน้าแรก GitHub Pages ~590 KB

### 3.5 ยังไม่ทำ / นอกขอบเขตเฟสนี้

⛔ backend / database / API · ⛔ ส่งคำขอถึงทีมอัตโนมัติ (LINE/อีเมล) · ⛔ analytics / funnel · ⛔ SEO (หน้าสินค้าแยก URL) · ⛔ ทดสอบมือถือจริง · ⛔ สคริปต์นำเข้า Pricebook ใน repo · นอกขอบเขตตามคำตัดสินเจ้าของ: ชำระเงินออนไลน์ · หน้าผลงาน/โลโก้ลูกค้า · รีวิว · บทความ SEO

### 3.6 บั๊ก / ข้อจำกัดที่รู้แล้ว (รายละเอียด `CLAUDE.md` §7.2)

| # | ปัญหา | ผลกระทบ |
|---|---|---|
| B4 | ไม่มี backend — ลีดขึ้นกับลูกค้าส่งอีเมล/โทรเอง | **เสียลีดได้ ถ้าเปิด beta กับลูกค้าจริง** |
| B2 | ยังไม่ทดสอบมือถือจริง (ทดสอบแค่ headless swiftshader) | ความเร็ว/เฟรมเรตบนเครื่องราคาประหยัดไม่ทราบ |
| B3 | มุมกล้องบางขนาดจอ (~1100 px) ผนังบังช่าง/ราง ใน techstory (C) | ภาพแปลกช่วงจอกลาง |
| B5 | สคริปต์แปลง Excel → `sbp-data.json` ไม่อยู่ใน repo | แก้ราคารอบหน้าเสี่ยงผิด |
| B7 | ระยะทางประมาณจากพิกัดอำเภอ | ค่าเดินทางคลาดในพื้นที่ขอบโซน |
| B8 | axe-core ยังมีข้อสังเกตระดับ moderate บน A/B | ยังไม่ AA เต็ม |
| B9 | ไฟล์ legacy `index.html`, `hub*.html` | สับสน |
| B10 | หน้าทดสอบ 4.4 MB | ใช้ภายในเท่านั้น |

---

## 4. Environment Variables & Config

### 4.1 Environment variables ที่โค้ดอ่านจริง (มีแค่เครื่องมือ — ตัวเว็บไม่ต้องตั้งค่าอะไร)

| ตัวแปร | ใช้ที่ | ค่าเริ่มต้น | หมายเหตุ |
|---|---|---|---|
| `SBP_REAL` | `tools_recon.py` | `internal/sbp_real.json` | path ไฟล์ Pricebook ภายใน (หรือส่งเป็น argument แรก) |
| `BASE` | `tests/_lib.mjs` | `http://localhost:8765` | URL ของ dev server ที่เทสต์ยิงเข้า |
| `PLAYWRIGHT_BROWSERS_PATH` | Playwright | (ตั้งโดย environment) | บน Claude Code web = `/opt/pw-browsers` — **ห้าม** `npx playwright install` |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | npm install | (ตั้งโดย environment) | กันไม่ให้ npm ดาวน์โหลด browser ซ้ำ |
| `CLAUDE_CODE_REMOTE` · `CLAUDE_PROJECT_DIR` | `.claude/hooks/session-start.sh` | (ตั้งโดย Claude Code) | hook ทำงานเฉพาะบน Claude Code web |

**ไม่มี API key / secret ใด ๆ ในโค้ด** และเว็บไม่เรียก API ภายนอก

### 4.2 ไฟล์ config / ไฟล์ลับ

| ไฟล์ | ลับ? | หน้าที่ |
|---|---|---|
| `internal/sbp_real.json` | ⛔ **ลับ** — ห้าม commit / ห้ามใส่ zip / ห้ามขึ้นเว็บ | Pricebook ภายในเต็ม มี `sp`/`pj` (อัตราพิเศษ/โครงการ) — ใช้กับ `npm run recon` เท่านั้น · เจ้าของอัปโหลดให้ทุก session ที่ต้องใช้ |
| `urls.json` | ไม่ลับ | URL ลิงก์ชุดที่แชร์ (`a`, `b`, `c`, `index`, `hub`) → `npm run build` |
| `urls.dev.json` | ไม่ลับ | URL ลิงก์ชุดพัฒนา → `npm run build:dev` |
| `assets/product-media.json` + `assets/products/` | ไม่ลับ | รูปสินค้า (`models` / `series` / `brands`) — ดู `assets/products/README.md` |
| `assets/logos/<key>.png` | ไม่ลับ แต่ต้องมีหนังสืออนุญาต | โลโก้วัสดุ `aeroflex scg yazaki airpro o-two nano` + ตราบริษัท `fujiva sbp` → build ฝังเป็น `__SBP_LOGOS` |

### 4.3 ค่าที่ build ฝังให้ (global ที่อนุญาต — ห้ามเพิ่ม global อื่น)

`globalThis.__SBP_DATA` (Pricebook) · `__SBP_TH` (แผนที่) · `__SBP_LOGOS` (ถ้ามีโลโก้) · `__SBP_MEDIA` (manifest รูปสินค้า) · `SBP_HUB` (ลิงก์หน้ารวม) · `window.SBP_URLS` (หน้าทดสอบ) · หน้าทดสอบโมดูล: `window.TS`, `window.READY`

### 4.4 localStorage (ทุกการอ่าน/เขียนครอบ try/catch — เว็บต้องทำงานได้แม้ไม่มี)

`sbp-quote-v2` (ใบเสนอราคา) · `sbp-journey-v1` (เส้นทางลูกค้า `{k, done}`) · `sbp-preview-v1` (หน้าทดสอบ)

### 4.5 ตัวแปรที่จะต้องมีในเวอร์ชันใช้งานจริง (ข้อเสนอ — ยังไม่มีในโค้ด ชื่อปรับได้)

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `DATABASE_URL` หรือ `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` | ข้อมูลราคา + บันทึก Lead (service role ใช้ฝั่ง server เท่านั้น) |
| `GOOGLE_MAPS_API_KEY` | Distance Matrix คำนวณระยะทาง/ค่าเดินทางจากที่อยู่จริง (แก้ B7) |
| `LINE_CHANNEL_ACCESS_TOKEN` + `LINE_CHANNEL_SECRET` | แจ้งเตือนทีมขายผ่าน LINE Messaging API (LINE Notify ปิดบริการแล้ว) |
| `RESEND_API_KEY` หรือ `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` + `SALES_NOTIFY_EMAIL` | อีเมลแจ้งทีมขาย / ยืนยันลูกค้า |
| `NEXT_PUBLIC_SITE_URL` | URL เว็บจริง (ลิงก์ในอีเมล, SEO) |
| `NEXT_PUBLIC_GA_ID` (หรือเครื่องมือ analytics อื่น) | วัด funnel: ใส่ใบเสนอราคา → ส่งคำขอ |
| `RECAPTCHA_SECRET` / `TURNSTILE_SECRET` | กันสแปมฟอร์ม |

---

## 5. วิธีทำงาน (คำสั่งที่ใช้จริง)

```bash
cd sbp-aircare
npm install                         # บน Claude Code web hook ทำให้แล้ว · เครื่องตัวเอง: ติดตั้ง Chromium ของ Playwright เอง
npm run serve                       # http://localhost:8765/a.html · b.html · c.html · preview.html
# ตรวจทุกครั้งที่แก้ (ต้องเปิด serve ไว้ใน terminal อื่น หรือรันพร้อมกันในคำสั่งเดียว)
npm run smoke && npm run smoke:mobile && npm run textscan     # ใช้เวลารวม ~15–25 นาที (ไล่ทุกหน้า + ฉาก 3 มิติบน swiftshader)
npm run recon                       # แตะข้อมูลราคาเมื่อไร ต้อง "mismatches": 0 (ต้องมี internal/sbp_real.json)
npm run booking                     # ★Rev.11 จองล้างแอร์ 3 ขั้น: ยอด = ใบเสนอราคา (ต้องเปิด serve)
npm run serve:site & npm run smoke:site   # ★Rev.11 ตรวจ build แยกไฟล์ dist/site (สิ่งที่ขึ้น GitHub Pages)
npm run og                          # ★Rev.11 สร้างภาพตัวอย่างลิงก์ใหม่ (ต้องเปิด serve)
npm run build:dev                   # dist/art/* ลิงก์ชุดพัฒนา → publish ทับ URL ใน urls.dev.json
npm run build                       # dist/art/* ลิงก์ชุดที่แชร์ → publish เฉพาะเมื่อเจ้าของสั่ง
```

- **Definition of Done:** smoke + smoke:mobile + textscan ผ่าน (recon ถ้าแตะราคา) · ฉาก 3 มิติที่แก้ ถ่ายภาพตรวจด้วยตา (desktop + มือถือ, สว่าง/มืด) · `npm run build` แล้วเปิด `dist/offline/*.html` ตรวจ · อัปเดต `CLAUDE.md` + `SBP-WEB-011_Dev_Handoff_Plan.md` + ไฟล์นี้
- **กฎ build:** แต่ละ `a/b/c.html` ต้องมี `<script type="module">` ตัวเดียว · stylesheet ต้องเขียน `<link rel="stylesheet" href="assets/ชื่อ.css">` ตรงตัว · import ต้องมีนามสกุล `.js`
- **สไตล์โค้ด:** 2 spaces · single quotes · semicolon · one-liner แน่น ๆ ตามไฟล์เดิม (อย่า reformat ทั้งไฟล์) · โมดูลร่วมใช้ token `--s-*` เท่านั้น · CSS prefix ต่อโมดูล (`s-`, `sx-`, `st-`, `sv-`, `hw-`, `ts-`, `sy3-`, `cg-` …)
- **กับดักที่เคยเจอ:**
  - section ห้ามใช้ attribute `data-view` (catalog/studio ใช้ชื่อนี้อยู่) — `site.js` ใช้ `data-sx`
  - โมดูลที่เขียน URL hash ได้ต้องไม่ทำตอนโหลดหน้า (เคยทำให้เปิดเว็บแล้วไปหน้า "ซื้อแอร์")
  - IntersectionObserver ที่ใช้ `threshold` ไม่ทำงานกับ section ที่สูงกว่า 5 เท่าของจอ — ใช้ `rootMargin` แทน
  - ฉาก 3 มิติใหม่ต้องลงทะเบียน `gl-pool.track()` เสมอ
  - เทสต์บน swiftshader ช้ามาก — screenshot ฉาก 3 มิติให้ timeout ≥ 180,000 ms

---

## 6. ลิงก์ที่เผยแพร่

### 6.0 ★Rev.10 เว็บหลัก — GitHub Pages (เปิดได้ทุกอุปกรณ์ คอม / แท็บเล็ต / มือถือ)

| หน้า | URL |
|---|---|
| หน้าทดสอบ A/B/C (หน้าแรกของเว็บ) | https://sahaburapaofficial-cmyk.github.io/Sahaburapa-project/ |
| แบบ A · Bento Clean | https://sahaburapaofficial-cmyk.github.io/Sahaburapa-project/a.html |
| แบบ B · Engineering Sheet | https://sahaburapaofficial-cmyk.github.io/Sahaburapa-project/b.html |
| แบบ C · Virtual Showroom | https://sahaburapaofficial-cmyk.github.io/Sahaburapa-project/c.html |

- build จาก `dist/offline/` ด้วย workflow `.github/workflows/sbp-aircare-pages.yml` ทุกครั้งที่ `main` เปลี่ยนในโฟลเดอร์ `sbp-aircare/` (หรือกด Run workflow เอง)
- **ตั้งครั้งเดียวโดยผู้ดูแล repo:** Settings → Pages → Build and deployment → Source = **GitHub Actions** (ถ้ายังไม่ตั้ง workflow จะล้มที่ขั้น deploy)
- บนโดเมนนี้ฟอร์มส่งถึงทีมได้จริงเมื่อใส่ `ENDPOINT` แล้ว (Artifacts ทำไม่ได้)

### 6.1 Claude Artifacts (ชุดเดิม — สร้างจากบัญชีเดิม)

| ชุด | A | B | C | หน้าทดสอบ A/B/C |
|---|---|---|---|---|
| **พัฒนา (private)** — `urls.dev.json` · ล่าสุด Version 8 = Rev.09 r5 | claude.ai/artifact/K1vDEg5dAmipKBSaexi6Sq | claude.ai/artifact/KpoG4oQVMFFWYThzarwUjs | claude.ai/artifact/3oZAqsBL7rtFnNYg8sCtFU | claude.ai/artifact/HBLkCDMcMQu3C4d9D7yXPU |
| **แชร์ "ทุกคนที่มีลิงก์"** — `urls.json` · ⚠️ คนดูเห็นทันทีเมื่อ publish | claude.ai/artifact/EymM19Ff1MDrV5w94kq8Jz | claude.ai/artifact/Ljne7eUGxzXs1Fbf3VAyj4 | claude.ai/artifact/WmbTyh3x5xz3jci7tq6zF5 | claude.ai/artifact/VGmjDYNJPN7AzoybNRRH6i |

- ชุดที่แชร์ **ไม่ได้ถูก publish ทับในรอบพัฒนา r1–r5** (ยังเป็นรุ่นเก่ากว่าชุดพัฒนา) — publish ทับเฉพาะเมื่อเจ้าของสั่ง
- publish ด้วย Artifact tool โดยส่ง `url` ของชุดนั้นเสมอ (ไม่งั้นได้ลิงก์ใหม่) · artifact ที่สร้างเกินมา `claude.ai/artifact/SAnXMdrSSDUAPFdRzLNup9` รอเจ้าของตัดสินใจว่าจะลบ
- ข้อจำกัดของ Artifacts: fetch ไปโดเมนอื่นถูกบล็อก (CSP) → **ต่อ backend จากหน้า artifact ไม่ได้** · ลิงก์ `mailto:` / `tel:` อาจกดไม่ได้ (จึงแสดงอีเมล/เบอร์เป็นข้อความเลือกได้ + ปุ่มคัดลอก) · `alert/confirm/print` ใช้ไม่ได้

---

## 7. กฎธุรกิจที่ห้ามแก้โดยไม่มีคำอนุมัติเป็นลายลักษณ์อักษรจากเจ้าของ (ย่อจาก `CLAUDE.md` §6.6)

1. ราคาต้นทางเป็น**ก่อน VAT** · เว็บแสดงรวม VAT 7% เป็นหลัก + ก่อน VAT ข้างกัน · `incVat = Math.round(n × 1.07)`
2. ห้ามแก้ราคา/อัตราใน `sbp-data.json` · ชุดราคาใหม่ SBP-PRC-001 **ยังไม่อนุมัติ** · แก้แล้วต้อง recon 0 ผิด
3. เว็บแสดง**อัตรามาตรฐานเท่านั้น** (`sp`/`pj` = null) · ≥10 เครื่องแสดง "อาจได้อัตราพิเศษ ทีมขายยืนยันในใบเสนอราคา"
4. ห้ามมีต้นทุน กำไร % ส่วนลด รายชื่อลูกค้า เงินเดือน ในโค้ดหรือข้อมูลฝั่ง browser
5. รุ่นบนเว็บ = อนุมัติแล้วเท่านั้น (705) · ติดตั้งบนเว็บ = มาตรฐาน/พรีเมียม (ไม่มี -MASS)
6. ทองแดงบนเว็บ = **O-TWO 0.70 มม.** เท่านั้น · ไม่มีคำว่า "Type L" / "K Copper" บนเว็บ
7. ยอดขั้นต่ำ **4,500 บาทก่อน VAT ใช้กับงานล้างเท่านั้น**
8. ค่าเดินทาง: 5 จังหวัดหลัก 0 · ≤60 กม. 300 (ยกเว้น ≥4 เครื่อง) · 61–100 กม. 800 (ขั้นต่ำ 3, ยกเว้น ≥8) · 101–150 กม. 1,500 (ขั้นต่ำ 5) · >150 กม. ไม่รับรายเครื่อง
9. รับประกันติดตั้ง 3 ปี (ซื้อเครื่องจากบริษัท) / 1 ปี (ลูกค้าหาเครื่องเอง)
10. คำต้องห้าม (เช่น "แก้หายแน่นอน", "ปลอดเชื้อ", "สะอาด 100%", "รับประกันเย็น") — `tests/textscan.mjs`
11. ค่าที่วัดในขั้นตอนช่าง = **ตัวอย่างการบันทึก** ไม่ใช่เกณฑ์ผ่าน/ไม่ผ่าน · ห้ามเดาค่าแรงดัน/ขนาดท่อ/สายไฟ/เบรกเกอร์
12. ขั้นตอนช่างต้องตรงแบบฟอร์มบริษัท (ล้าง SBP-SR-ACCL-UNI-001 Rev.07 · ติดตั้ง SBP-SR-ACIN-UNI-001 Rev.04 · ซ่อม: ไม่ซ่อมก่อนลูกค้าอนุมัติ) — แก้ข้อความที่ `services.js` เท่านั้น
13. โลโก้: ไม่ดาวน์โหลด/ไม่วาดเลียนแบบ · ห้ามปั้นดีไซน์ผู้ผลิตแอร์ · FUJIVA/SBP อยู่บนของของทีมช่างเท่านั้น ไม่อยู่บนแอร์ของลูกค้า
14. VRV / VRF = ติดต่อแยก (ห้ามเข้าตะกร้า)
15. ข้อมูลบริษัทที่ยังไม่ยืนยัน **ห้ามเดาใส่** · ★Rev.12 ค่าบริการนอกเวลาทำการ: บอกว่า "มีค่าใช้จ่ายเพิ่มเติม" เท่านั้น ห้ามใส่จำนวนเงิน

---

## 8. Next Steps / Todo (เรียงตามลำดับความสำคัญ)

### P0 — ต้องทำก่อนให้ลูกค้าจริงทดลอง (beta)

1. ~~เอาซอร์สขึ้น GitHub~~ ✅ Rev.10 — `sahaburapaofficial-cmyk/Sahaburapa-project` (Public ตามคำสั่งเจ้าของ) · ตรวจ `git status` ทุกครั้งว่าไม่มี `internal/`, `dist/`, `node_modules/`
2. **เปิด GitHub Pages (ผู้ดูแล repo ทำครั้งเดียว)** — Settings → Pages → Source = **GitHub Actions** → แล้ว merge PR ของ Rev.10 เข้า `main` (หรือ Actions → "SBP AirCare · GitHub Pages" → Run workflow) → เว็บขึ้นที่ลิงก์ใน §6.0
3. ~~ยืนยันข้อมูลบริษัท~~ ✅ Rev.10 (ตรวจจากเว็บทางการ + ทะเบียนนิติบุคคล) — เวลาทำการ ✅ Rev.12 · เจ้าของตรวจซ้ำอีเมลที่ใช้รับลูกค้า (เว็บทางการใช้ sahaburapagroupsp@gmail.com · เว็บนี้ใช้ Sahaburapa.official@gmail.com ตามที่เจ้าของให้)
4. **เปิดระบบรับคำขอจริง (B4) — โค้ดพร้อมแล้ว รอ deploy สคริปต์** (`backend/README.md` ~10 นาที)
   - บัญชี Google บริษัท → สร้าง Sheet → วาง `backend/apps-script/Code.gs` → แก้ `NOTIFY_TO` → Deploy เป็นเว็บแอป (ทุกคนเข้าถึงได้)
   - ใส่ URL `/exec` ที่ `assets/submit.js` → `ENDPOINT` → commit → Pages build ใหม่ → ส่งฟอร์มทดสอบ 1 ครั้ง (ต้องเห็นแถวใน Sheet + อีเมล)
   - ข้อจำกัด: Gmail ทั่วไปส่งแจ้งเตือนได้ 100 ผู้รับ/วัน (เกินแล้วแถวยังบันทึก) · ยอดเงินเป็นยอดประมาณการ ทีมขายยืนยันในใบเสนอราคาจริง
5. **ทดสอบมือถือจริง (B2)** — เช็กลิสต์ 16 ข้อ + แบบบันทึกผลใน `PROPOSAL_Rev10.md` §2 · ถ้าช้า เลือกวิธีจาก §3 (ระดับคุณภาพอัตโนมัติ, pixelRatio 1, ปิดเงา, ลดอนุภาค, จำกัด 30 fps …)
6. **แชร์ลิงก์ beta** — ใช้หน้าแรกของ GitHub Pages (หน้าทดสอบ A/B/C + ปุ่ม "ให้ความเห็น")

### P1 — ช่วง beta

7. **แนวทางพัฒนาตามโจทย์เจ้าของ** — ★Rev.11 ทำแล้ว: ความเร็วมือถือ · หน้าแรกเน้นงานล้าง + จองล้าง 3 ขั้น · ภาษาลูกค้า · LINE เด่น · SEO/การแชร์ลิงก์ · **ที่เหลือ (ลำดับแนะนำ):**
   - **วัดผล (analytics)** — ต้องมีบัญชี: Google Analytics 4 (ฟรี, ต้องมีข้อความคุกกี้ตาม PDPA) หรือ Cloudflare Web Analytics (ฟรี, ไม่ใช้คุกกี้) → ส่ง ID มา แล้วใส่จุดวัด: เลือกเส้นทาง · จองล้าง · ใส่ใบเสนอราคา · ส่งคำขอ · กด LINE
   - **ภาพจริง** (ทีมช่าง หน้างาน ก่อน–หลังล้าง 10–20 ชุด) → แถบเลื่อนเทียบก่อน–หลังในหน้าแรก/หน้าบริการ · ~~โลโก้บริษัท/FUJIVA~~ ✅ Rev.12
   - **ตัวอย่างรายงานล้างรายเครื่อง (B2B)** จากแบบฟอร์มจริงที่ลบข้อมูลลูกค้าแล้ว
   - ~~"4 มิติ"~~ ★Rev.12 ทำแล้ว (เวลาทั้งงานโดยประมาณจากข้อมูลออนไลน์ — หัวหน้าช่างปรับ `JOB_TIME` ได้ถ้าต้องการ)
   - ภาพ 3 มิติสมจริงขึ้น: ★Rev.12 ทำระดับ 1 (เงา/texture คมขึ้น) · ระดับ 2–3 (โมเดลสแกน/ภาพถ่ายจริง) ต้องมีงบ — `PROPOSAL_Rev10.md` §4.3
   - **เลือกแบบเดียว** หลังได้ผล beta · **โดเมนบริษัท** (เช่น aircare.sahaburapagroup.com) แทน github.io
8. **รวบรวมความเห็น beta → เจ้าของเลือกแบบ** A / B / C หรือผสม (คำแนะนำเดิม: ใช้ A เป็นโครงหลัก ยืมหน้าองค์กรจาก B และโชว์รูม/ห้องจำลองจาก C)
9. **ใส่ข้อมูลที่รอเจ้าของ** (`CLAUDE.md` §7.3)
   - ราคา FUJIVA ทุกรุ่น
   - รูปสินค้าจริง (`assets/products/` + `product-media.json`)
   - ไฟล์โลโก้ + หนังสืออนุญาต (`assets/logos/`)
   - ภาพทีมงานจริง
   - หัวหน้าช่างตรวจ `CLEAN_HOW` / `INSTALL_HOW` / `FIT_RULES` / ศูนย์ความรู้
10. **สคริปต์นำเข้า Pricebook (B5)**
   - `scripts/import_pricebook.py` (openpyxl): Excel → `internal/sbp_real.json` + `assets/sbp-data.json`
   - คง schema `pf`/`pool` เดิม (`CLAUDE.md` §4.2)
   - ยืนยันด้วย diff ว่างกับไฟล์ปัจจุบัน และ recon 0 ผิด
11. **ถ้าเจ้าของอนุมัติ SBP-PRC-001:** แก้ราคาด้วยสคริปต์ข้อ 10 เท่านั้น → recon → textscan → build
12. **แก้ B3** (มุมกล้อง techstory ที่จอ ~1100 px) และ **B8** (รัน axe-core แก้ moderate บน A/B)
13. **Analytics funnel แบบไม่เก็บข้อมูลส่วนตัว:**
    - เปิดหน้า → เลือกเส้นทาง → ใส่ใบเสนอราคา → สร้างสรุปคำขอ
    - วัดว่าแบบไหนพาลูกค้าไปถึงคำขอได้มากที่สุด
14. ลบไฟล์ legacy `index.html`, `hub*.html` หลังเจ้าของยืนยัน (B9)

### P2 — เวอร์ชันใช้งานจริง (หลังเลือกแบบ — `CLAUDE.md` §2.3, §8 Step 7)

15. **Next.js (App Router) + TypeScript**
    - ยก `sbp-core.js` + `studio-model.js` + `roomplan.js` เป็น `lib/domain/*.ts` พร้อม unit test (VAT, โซน, ค่าเดินทาง, สัญญา, BTU)
    - เพราะเป็นตรรกะล้วน ไม่มี DOM
16. **3 มิติเป็น client component** (dynamic import, `ssr:false`) คง `gl-pool` (≤3 context)
17. **PostgreSQL/Supabase** เก็บราคา (นำเข้าด้วยสคริปต์ข้อ 10) + ตาราง Lead
18. **API ใบเสนอราคา**
    - คำนวณยอดซ้ำฝั่ง server (ห้ามเชื่อยอดจาก browser) · บันทึก Lead
    - แจ้งทีมขายทาง LINE Messaging API / อีเมล
19. **Google Distance Matrix** คำนวณค่าเดินทางจากที่อยู่จริง (แก้ B7)
20. **SEO:** SSG หน้าสินค้า 705 รุ่น + schema.org Product/Offer (ราคารวม VAT) · sitemap · OG image
21. **ความเป็นส่วนตัว:**
    - นโยบายความเป็นส่วนตัว (PDPA) + ความยินยอมในฟอร์ม
    - ไม่เก็บข้อมูลลูกค้าใน localStorage เกินจำเป็น

---

_ไฟล์นี้สรุปจากการวิเคราะห์โค้ดทั้งหมด ณ 2 ต.ค. 2569 — เมื่อแก้โค้ดรอบถัดไป ให้อัปเดตหัวข้อ 3 (สถานะ), 6 (ลิงก์/เวอร์ชัน) และ 8 (Todo) ทุกครั้ง_
