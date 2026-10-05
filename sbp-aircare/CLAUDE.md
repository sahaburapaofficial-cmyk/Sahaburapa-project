# CLAUDE.md — SBP AirCare Website · Technical Handover Specification

> **สถานะ:** Rev.29 · 5 ต.ค. 2569 (ดู §7.1h–7.1y · ★Rev.29 เว็บไซต์ชุดที่ 2 แบบ D · E · F) · Rev.12 ขึ้นเว็บแล้ว (PR #7) · ก่อนหน้า Rev.09 r5 (ต่อจาก Rev.08.1 — r5 = โครงเว็บตามเส้นทางลูกค้า เตรียม Beta) · เจ้าของโปรเจกต์: ธนวัฒน์ (บริษัท สหบูรพากรุ๊ป จำกัด) · repo: `sahaburapaofficial-cmyk/Sahaburapa-project` โฟลเดอร์ `sbp-aircare/` (Public · เว็บ https://sahaburapaofficial-cmyk.github.io/Sahaburapa-project/)
> **เริ่มที่ [`HANDOFF.md`](HANDOFF.md)** — ภาพรวม สถานะฟีเจอร์ ตัวแปร/ไฟล์ config และ todo ล่าสุดในไฟล์เดียว · ไฟล์นี้คือสเปกเชิงลึก
> **ไฟล์นี้คืออะไร:** เอกสารส่งมอบงานสำหรับ Claude Code (CLI) วางไว้ที่ root ของ repo — Claude Code อ่าน `CLAUDE.md` อัตโนมัติทุกครั้งที่เปิดโปรเจกต์
> **ซอร์สโค้ดเต็ม:** อยู่ในไฟล์ `SBP-WEB-011_Prototype_Source.zip` (ทุกไฟล์ ไบต์ตรงกับที่เผยแพร่ล่าสุด) — เอกสารนี้สรุปสัญญา (API), กติกา และงานถัดไป ไม่ได้คัดลอกโค้ด 3 มิติทั้งหมดซ้ำ เพราะโค้ดจริงอยู่ในไฟล์แล้วและแม่นยำกว่า
> **เอกสารอ้างอิงละเอียด:** `SBP-WEB-011_Dev_Handoff_Plan.md` (แผนส่งมอบทีม Dev ฉบับเต็ม ~700 บรรทัด หัวข้อ 0–13 และ 6A–6V)

---

## 0. Quick start (ทำตามนี้ก่อนแก้อะไร)

```bash
# 1) แตก zip แล้วเข้าโฟลเดอร์
unzip SBP-WEB-011_Prototype_Source.zip -d sbp-aircare && cd sbp-aircare
git init && git add -A && git commit -m "Rev.08.1 baseline from Cowork"   # .gitignore กัน dist/ internal/ node_modules/ ไว้แล้ว

# 2) เครื่องมือ (เวอร์ชันที่ใช้ทดสอบมา)
#    Python 3.11 · Node 22 · esbuild 0.28.2 (เรียกผ่าน npx ใน build.py) · Playwright 1.56.0
npm install
npx playwright install chromium

# 3) เปิด dev server (โหมดหลายไฟล์ แก้แล้วรีเฟรชได้ทันที)
python3 -m http.server 8765          # หรือ npm run serve
#    http://localhost:8765/a.html  b.html  c.html  preview.html (หน้าทดสอบ A/B/C)

# 4) ตรวจ baseline ก่อนเริ่มงาน (ต้องผ่านทั้งหมด)
npm run smoke            # error ใน console = 0, ไม่เลื่อนแนวนอน
npm run smoke:mobile     # 390×844
npm run textscan         # ไม่มีคำต้องห้าม / Type L / K Copper / ต้นทุน
npm run recon            # ต้องได้ "mismatches": 0  (ต้องมี internal/sbp_real.json — ดู §7)

# 5) build ไฟล์เดียว (offline + artifact)
npm run build            # → dist/offline/{a,b,c,index}.html, dist/art/{a,b,c,index}.html
```

---

## 1. Project Overview & Objective

### 1.1 ธุรกิจและเป้าหมาย

เว็บขายและบริการแอร์ของ **SBP AirCare (บริษัท สหบูรพากรุ๊ป จำกัด)** สำนักงานใหญ่ พระราม 2 ซอย 31 กรุงเทพฯ

| # | เป้าหมาย | วัดผลจาก |
|---|---|---|
| 1 | **ปิดสัญญาล้างรายปี B2B เป็นจำนวน** — ลูกค้าเห็นราคาต่อปีจาก Pricebook จริงและใส่ใบเสนอราคาได้เอง | จำนวนคำขอสัญญา |
| 2 | **ขายแอร์ทุกรุ่นพร้อมราคา** — ราคาเครื่อง ราคาพร้อมติดตั้ง อุปกรณ์เสริม รวมยอดเอง | ใบเสนอราคาเบื้องต้นที่ส่งเข้ามา |
| 3 | **ค่าบริการโปร่งใสครบทุกหมวด** — ล้าง ติดตั้ง ซ่อม รื้อ/ย้าย วัสดุ พร้อม รวม/ไม่รวม/รับประกัน | ลดคำถามซ้ำของทีมขาย |
| 4 | **ให้ลูกค้าเห็นภาพก่อนตัดสินใจ** — ห้องจำลอง ลม ฝุ่น วิธีทำงานของช่าง วัสดุจริง | เวลาอยู่บนหน้า / conversion |
| 5 | **ขายคุณภาพวัสดุ** (จุดต่างจากคู่แข่ง) — ระบุยี่ห้อและสเปกวัสดุทุกแพ็กเกจ | — |

**พื้นที่บริการ (★Rev.20):** พื้นที่หลัก = กรุงเทพฯ ในระยะถนน 30 กม. จากสำนักงานใหญ่ (ไม่มีค่าเดินทางเมื่องานล้างถึงขั้นต่ำ) · นอกนั้นถึง 150 กม. ค่าเดินทาง 300 + 10 บาท/กม. ที่เกิน 30 กม.

### 1.2 กลุ่มผู้ใช้

| กลุ่ม | ต้องการอะไร | แบบที่ตอบโจทย์ |
|---|---|---|
| B2C บ้าน/คอนโด | ราคาชัด เห็นภาพ ช่างทำอะไรบ้าง | A, C |
| B2B ฝ่ายอาคาร/จัดซื้อ/สำนักงาน/โรงงาน/คลินิก/โรงแรม | ราคาต่อปี ตารางเครื่อง รายงานรายเครื่อง เอกสารตรวจสอบได้ | B |
| ผู้รับเหมา/งานโครงการ | ขอบเขตงาน วัสดุ BOQ ขอสำรวจ | B |

> ★Rev.29 (เจ้าของ 5 ต.ค. 2569: "เพิ่มอีก 3 โมเดล … ทำเพิ่ม D/E/F และแยกเป็นสองเว็บไซต์ เว็บแรกเก็บไว้ A B C อีกเว็บ D E F") — **เว็บไซต์ชุดที่ 2** = `d.html` · `e.html` · `f.html` + หน้าทดสอบ `index2` (`preview.html?set=def`) ดู §7.1y · ชุดที่ 1 (A · B · C) ไม่เปลี่ยน

### 1.3 ต้นแบบ 3 แบบ (เจ้าของยัง **ไม่เลือก** — พัฒนาไปพร้อมกัน ฟีเจอร์ใช้โมดูลร่วม ต่างกันที่ภาษาภาพ)

| | A · Bento Clean (`a.html`) | B · Engineering Sheet (`b.html`) | C · Virtual Showroom (`c.html`) |
|---|---|---|---|
| แนวคิด | แอปพรีเมียม สว่าง สะอาด | ชุดแบบวิศวกรรม ตรวจสอบได้ | โชว์รูมมืด สินค้าเป็นแหล่งแสง |
| ธีมเริ่มต้น | light (มี dark) | blueprint/light (มี dark) | dark (มี light) |
| จุดเด่นเฉพาะ | ขั้นตอนล้างตามแบบฟอร์ม + story แยกชิ้นส่วน | **ลำดับการทำงาน 3 มิติ** (`system3d.js`) + แบบวิศวกรรมภาพตัด (`engdraw.js`) | **ช่างทำงาน 4 งานในห้อง 3 มิติ** (`techstory.js`) |
| ลิงก์ที่เผยแพร่ | claude.ai/artifact/EymM19Ff1MDrV5w94kq8Jz | claude.ai/artifact/Ljne7eUGxzXs1Fbf3VAyj4 | claude.ai/artifact/WmbTyh3x5xz3jci7tq6zF5 |

หน้าทดสอบ A/B/C (`preview.html` → `dist/art/index.html`): claude.ai/artifact/VGmjDYNJPN7AzoybNRRH6i (แชร์ "ทุกคนที่มีลิงก์")

คำแนะนำเดิมของที่ปรึกษา (ยังไม่ใช่คำตัดสิน): ใช้ A เป็นโครงหลัก ยืมหน้าองค์กรจาก B และหน้าโชว์รูม/ห้องจำลองจาก C เป็นหน้าฟีเจอร์แยก

### 1.4 ฟังก์ชันที่ทำเสร็จแล้ว (ทุกแบบ เว้นแต่ระบุ)

**การขายและราคา (ข้อมูลจริงจาก Pricebook)**
- **Catalog 705 รุ่น 22 แบรนด์** (ติดผนัง 351 · แขวน 178 · สี่ทิศทาง 153 · ตู้ตั้ง 23) จัดกลุ่มเป็นซีรีส์ ค้นหา กรองประเภท/แบรนด์/BTU/ราคา/Inverter เทียบรุ่น · FUJIVA (แบรนด์บริษัท) แสดงเป็น "รอนำเข้าราคา"
- **หน้าสินค้า (drawer):** ราคารวม VAT + ก่อน VAT, สลับ BTU ในซีรีส์, แพ็กเกจติดตั้ง มาตรฐาน/พรีเมียม/ไม่ติดตั้ง (รวม/ไม่รวม/รับประกัน), อุปกรณ์เสริมตามขนาดเครื่อง, งานประเมินหน้างาน, ตารางเทียบวัสดุ, สเปกเต็ม, จำนวน → ราคารวม → ใส่ใบเสนอราคา
- **ศูนย์ค่าบริการ** (`mountPriceCenter`): ล้าง (3 แพ็กเกจ × C1/C2 × ประเภท × BTU + AHU/งานเพิ่ม) · ติดตั้ง (167 รายการบนเว็บ) · ซ่อม 86 รายการ · รื้อ/ย้าย/น้ำยา/งานพิเศษ · วัสดุ — ค้นหาได้ ทุกแถวมีปุ่ม "เพิ่ม" หรือ "ขอประเมิน"
- **ตัวคำนวณสัญญาล้างรายปี** (`mountBuilder` + `estimateContract`): จำนวนเครื่องต่อประเภท × รอบต่อปี × แพ็กเกจ → ราคาต่อปี + กำลังทีมที่ต้องใช้ + ยอดขั้นต่ำ 4,500
- **ใบเสนอราคาเบื้องต้น (ตะกร้า)** ทุกหน้า: ปรับจำนวน/ลบ, ใส่พื้นที่ → ค่าเดินทาง/ยกเว้น/เตือนขั้นต่ำเครื่อง, เติมส่วนต่างยอดขั้นต่ำงานล้าง, ยอดก่อน VAT / VAT / รวม, ฟอร์มส่งคำขอ → เลขอ้างอิง (**ยังไม่ส่งข้อมูลจริง ไม่มี backend**), คัดลอกสรุปไป LINE · เก็บใน `localStorage['sbp-quote-v2']`
- **ตรวจพื้นที่ + ค่าเดินทาง** (`checkZone`, `travelCharge`) + **แผนที่ประเทศไทย 3 มิติ 77 จังหวัด** (`thaimap3d.js`) ระบายสีตามโซน คลิกจังหวัดเพื่อตรวจ

**ภาพอธิบาย / 3 มิติ (ทั้งหมดเป็น "แบบจำลองเพื่ออธิบาย")**
- **ตัวเครื่อง 3 มิติ** (`ac3d.js`): คอยล์เย็น/ร้อน, exploded, X-ray, ลม, ฝุ่น + ล้างเสมือนจริง, ป้ายชิ้นส่วน, ช่อง `loadModel(url)` สำหรับ GLB ทางการ (ต้องมีสิทธิ์)
- **แอร์ทำงานอย่างไร** (`howitworks3d.js` + `units3d.js` + `hw-data.js`): ติดผนัง/แขวน/สี่ทิศทาง ตัวเครื่องเต็มมองทะลุ 7 ขั้น ลม-น้ำ-น้ำยา แนวท่อในรางครอบท่อถึงคอยล์ร้อน + จำลองระยะลม (`throwsim3d.js`)
- **ห้องจำลอง 48 ห้อง 9 กลุ่ม** (`studio*.js`): ปรับขนาดห้อง คน เครื่องใช้ไฟฟ้า แดด/หลังคา → BTU ที่ต้องใช้ + รุ่นแนะนำพร้อมราคา, ฝุ่น 0–18 เดือน → ลม/ความเย็น/ค่าไฟ (ค่าประมาณ), วงจรทำความเย็น, แผนล้างรายปี
- **โชว์รูมวัสดุ 3 มิติ** (`materials3d.js`): O-TWO · Aeroflex · Airpro · Yazaki · SCG · ขาแขวน+ยางกันสั่น · NANO RCBO
- **ขั้นตอนบริการ** (`services.js`): ล้าง/ติดตั้ง/ซ่อมต่อประเภทเครื่อง งานล้างเรียงตามหัวข้อแบบฟอร์ม SBP-SR-ACCL-UNI-001 Rev.07 พร้อมรายการตรวจ
- **[B] ลำดับการทำงาน 3 มิติ** (`system3d.js`): 9 ขั้นต่อประเภท ไฟ ลม น้ำยา น้ำทิ้งไหลตามเส้นทางจริงในราง + ปุ่มเปิดภาพตัด 2 มิติ (`engdraw.js`)
- **[C] ช่างทำงานจริงในห้อง 3 มิติ** (`techstory.js` + `tech3d.js` + `install3d.js`): ล้างปกติ C1 14 ขั้น · ล้างใหญ่ C2 17 ขั้น · ติดตั้ง 13 ขั้น (มาตรฐาน/พรีเมียม) · ตรวจซ่อม 10 ขั้น ทุกขั้นมี อ้างอิงแบบฟอร์ม / ช่างทำ / ทำไม / ลูกค้าได้ / ป้ายชิ้นส่วน / ค่าที่บันทึก (ตัวอย่าง)
- แถบขั้นตอนใช้บริการ 6 ขั้น (`journey.js mountFlow`), เมนูมือถือ, ปุ่มใบเสนอราคาลอย, FAQ

**ไม่อยู่ในเฟสนี้ (คำตัดสินเจ้าของ):** ชำระเงินออนไลน์ · หน้าผลงาน/โลโก้ลูกค้า · รีวิว · บทความ SEO

---

## 2. Tech Stack & Architecture

### 2.1 Stack ปัจจุบัน (ต้นแบบ — ไม่มี framework, ไม่มี backend)

| ชั้น | ใช้อะไร | เวอร์ชัน / หมายเหตุ |
|---|---|---|
| ภาษา | HTML5 + CSS (custom properties) + **JavaScript ES modules (ES2022)** | ไม่มี TypeScript, ไม่มี JSX |
| Framework | **ไม่มี** — vanilla DOM ผ่าน helper `h()` / `$()` / `$$()` | ทุกโมดูลมี `mountX(root, cfg)` |
| 3D | **three.js r170** (vendored: `assets/three.module.min.js`) + `GLTFLoader.js`, `RoomEnvironment.js`, `BufferGeometryUtils.js` (addons ของ r170) | ทุกโมเดลเป็น procedural (สร้างจากโค้ด) ไม่มีไฟล์ GLB |
| ข้อมูล | `assets/sbp-data.json` (Pricebook สาธารณะ) · `assets/thai-provinces.json` (Natural Earth admin-1, public domain) | ไม่มี database |
| ฟอนต์ | self-hosted woff2 ใน `assets/fonts/`: Anuphan, IBM Plex Sans Thai, IBM Plex Mono, Kanit | `fonts.css` |
| Build | `build.py` (Python 3.11) + **esbuild 0.28.2** ผ่าน `npx --yes` | bundle เป็นไฟล์เดียว inline ทุกอย่าง |
| ทดสอบ | Node 22 + **Playwright 1.56.0** (Chromium + swiftshader) · axe-core 4.13.0 | `tests/*.mjs` |
| กระทบยอดราคา | `tools_recon.py` (Python) | ต้องได้ mismatches 0 |
| Deploy ปัจจุบัน | Claude Artifacts (หน้าเดียว ไฟล์เดียว) | URL ใน `urls.json` |
| Backend / API | **ไม่มี** — ฟอร์มส่งคำขอแสดงเลขอ้างอิงในเครื่องเท่านั้น | ต้องทำในเฟส production |

### 2.2 สถาปัตยกรรม

```
a.html / b.html / c.html          ← markup + CSS tokens ของแต่ละแบบ + <script type="module"> ตัวเดียว (wiring)
   │ import
   ├─ sbp-core.js        domain logic ล้วน (ไม่มี DOM rendering): loadData, catalog/facet, ราคา VAT, ติดตั้ง/อุปกรณ์เสริม,
   │                     checkZone/travel, estimateContract, ค่าคงที่ธุรกิจ  ← ข้อมูลจาก sbp-data.json (หรือ globalThis.__SBP_DATA)
   ├─ proto-ui.js        catalog, contract builder, zone, FAQ, viewer wiring, drawers, toast
   ├─ commerce.js        cart (singleton + localStorage), product detail, price centre, material tables  (lazy → materials3d.js)
   ├─ journey.js         travel table, quote pill, mobile menu, flow bar
   ├─ services.js        ขั้นตอนบริการ (cleanSteps/installSteps/repairSteps)
   ├─ studio.js          ห้องจำลอง UI (lazy → studio3d.js) + studio-model.js (สูตร ไม่มี DOM)
   ├─ howitworks3d.js    กลไกแอร์ 3 ประเภท (units3d, trunk3d, throwsim3d, hw-data)
   ├─ thaimap3d.js       แผนที่ 3 มิติ (thai-provinces.json หรือ globalThis.__SBP_TH)
   ├─ [B] system3d.js    ลำดับการทำงาน 3 มิติ (install3d, airflow3d, people3d)  (lazy → engdraw.js)
   └─ [C] techstory.js   ช่าง 4 งาน (install3d, tech3d, airflow3d)

ชั้นล่างของ 3 มิติ: ac3d.js (ตัวเครื่อง/วัสดุ/helper) · units3d.js · install3d.js (ห้องบ้าน+ระบบติดตั้ง) · tech3d.js (ช่าง+เครื่องมือ)
                     · matkit3d.js (วัสดุพิมพ์ยี่ห้อ) · roomkit3d.js (พื้น ผนัง เฟอร์นิเจอร์) · trunk3d.js (รางครอบท่อ)
                     · airflow3d.js (อนุภาคลม) · people3d.js (คนมีข้อต่อ)
```

**Data flow ราคา:**
```
Pricebook Excel (ใบเสนอราคาติดตั้งแอร์ Final จริง.xlsx, ใบเสนอราคาล้างและซ่อม Final จริง.xlsx)
   → [สคริปต์แปลง — ทำแบบ ad-hoc ใน Cowork, ยังไม่อยู่ใน repo ⚠️ ดู §8 ข้อ 6]
   → assets/sbp-data.json   (สาธารณะ: อัตรามาตรฐานเท่านั้น, รุ่นที่อนุมัติเท่านั้น, sp/pj = null)
   → internal/sbp_real.json (ภายใน: มีอัตราพิเศษ/โครงการ — ห้ามขึ้นเว็บ ห้าม commit)
   → loadData() แปลงตอนโหลด (K Copper → O-TWO, ซ่อน -MASS และ MAT-CU-L-*)
   → tools_recon.py เทียบทุกราคาที่เว็บแสดงได้กับ extract ภายใน → ต้อง 0 ผิด
```

**Build pipeline (`build.py`):** แต่ละแบบ → CSS inline (ฟอนต์เป็น data URI) → script module ถูก bundle ด้วย esbuild (รวม three.js และ lazy imports) → ฝังข้อมูลเป็น `globalThis.__SBP_DATA`, `__SBP_TH`, และ `__SBP_LOGOS` (ถ้ามีไฟล์ใน `assets/logos/`) → ได้ไฟล์เดียว ~2.3–2.4 MB ต่อแบบ

### 2.3 สถาปัตยกรรม production ที่แนะนำ (ยังไม่เริ่ม — แผน §4 ของ Handoff Plan)

| ชั้น | แนะนำ |
|---|---|
| Framework | Next.js (App Router) + TypeScript — บริษัทมีเว็บ Polar Air บน Next.js อยู่แล้ว; หน้าสินค้า 705 รุ่นทำ SSG |
| สไตล์ | CSS variables (ยก token จากต้นแบบ) + CSS Modules หรือ Tailwind อ่าน token |
| 3D | ห่อโมดูลเดิมเป็น client component (dynamic import, `ssr:false`) หรือย้ายไป react-three-fiber |
| ข้อมูล | PostgreSQL/Supabase + สคริปต์นำเข้าจาก Excel (เจ้าของแก้ราคาใน Excel ที่เดิม) |
| ใบเสนอราคา | cart ฝั่ง client + API สร้าง Lead และ **คำนวณยอดซ้ำฝั่ง server** |
| ระยะทาง | Google Distance Matrix จากที่อยู่หน้างาน |
| แจ้งเตือน | LINE OA / อีเมลทีมขาย |

---

## 3. Current File Structure

```
sbp-aircare/
├── CLAUDE.md                     ← ไฟล์นี้
├── SBP-WEB-011_Dev_Handoff_Plan.md  แผนส่งมอบทีม Dev ฉบับเต็ม (ภาษาไทย) — อ้างอิงคำตัดสินเจ้าของ §0, สเปก §6A–6V, checklist §12
├── package.json                  npm scripts + devDependencies (playwright, axe-core)
├── .gitignore                    dist/ internal/ node_modules/ _entry_*.mjs *.png
├── urls.json                     URL ของ artifact ที่เผยแพร่ (build.py ใช้แปลงลิงก์ระหว่างหน้า) — ชุดที่แชร์ "ทุกคนที่มีลิงก์"
├── urls.dev.json                 ★Rev.09 URL ชุดทดลองพัฒนา (`npm run build:dev`) — อัปเดตชุดนี้ระหว่างพัฒนา ไม่แตะชุดที่แชร์
├── build.py                      สร้างไฟล์เดียว → dist/offline/*, dist/art/*  (128 บรรทัด, โค้ดเต็มใน §4.4)
├── tools_recon.py                กระทบยอดราคาเว็บ vs Pricebook (ต้อง 0 ผิด)  (โค้ดเต็มใน §4.5)
│
├── a.html                        แบบ A · Bento (754 บรรทัด: markup + CSS tokens + wiring)
├── b.html                        แบบ B · Engineering (645)
├── c.html                        แบบ C · Showroom (541)
├── preview.html                  หน้าทดสอบ A/B/C: สลับแบบ/ขนาดจอ เทียบ 3 แบบพร้อมกัน รายการทดลอง + ให้คะแนน 6 ด้าน (localStorage 'sbp-preview-v1')
│
├── test-ts.html                  ทดสอบ techstory แยก (window.TS, window.READY)   ?theme=light|dark
├── test-shots.html               ★Rev.09 ดูภาพเรนเดอร์สินค้า 5 แบบ (productShots) — ตรวจหลังแก้ตัวเครื่อง 3 มิติ
├── test-clean.html               ★Rev.09 r4 ทดสอบส่วน "ทีมช่าง ล้าง / ติดตั้ง" แยก ?job=clean|install&type=wall|ceiling|cassette|floor&level=C1|C2|STANDARD|PREMIUM&theme=dark&step=n (window.TS.go / steps / advance / busy / ready)
├── test-sys.html                 ทดสอบ system3d แยก   ?type=wall|ceiling|cassette
├── test-home.html                ทดสอบฉากบ้าน install3d แยก
├── test-mat.html                 ทดสอบโชว์รูมวัสดุแยก
├── test-hw.html · test-ed.html · test-map.html · test-studio.html · test-throw.html · test-viewer.html · test3d.html · testroom.html
│                                 หน้าทดสอบโมดูลเดี่ยวอื่น ๆ (ใช้ debug / screenshot)
├── index.html · hub.tpl.html · hub.tpl2.html · hub-local.html
│                                 ⚠️ LEGACY — หน้า hub รุ่นเก่า (Rev.03–06) ไม่ได้ใช้ใน build ปัจจุบัน (build ใช้ preview.html) ลบได้หลังยืนยัน
│
├── tests/                        Playwright (ต้องเปิด dev server ก่อน; BASE=http://localhost:8765)
│   ├── _lib.mjs                  launch() แบบ swiftshader + scrollAll()
│   ├── smoke.mjs                 error ใน console, จำนวน canvas/WebGL context, overflow แนวนอน  → exit 1 ถ้าไม่ผ่าน
│   ├── textscan.mjs              คำต้องห้าม / Type L / K Copper / สีเทา / ต้นทุน / อัตราพิเศษ ในข้อความที่แสดง
│   ├── story-shots.mjs           screenshot ขั้นของ techstory (C1|C2|install|repair)
│   ├── section-shots.mjs         ★Rev.09 screenshot ทุก section ของหน้า (ตรวจงานออกแบบ ก่อน–หลัง)
│   └── shot.mjs                  ★Rev.09 screenshot หนึ่ง section (`@id` = ทั้ง section) + รายงาน console error
│
├── internal/                     ⚠️ ไม่อยู่ใน zip สาธารณะ, gitignored — วาง sbp_real.json (extract ภายใน มีอัตราพิเศษ/โครงการ)
├── dist/                         ผล build (gitignored)
│
└── assets/
    ├── sbp-data.json             Pricebook สาธารณะ 220 KB (schema §4.2)
    ├── thai-provinces.json       77 จังหวัด (polygon แบบย่อ)
    ├── fonts.css · fonts/*.woff2 Anuphan / IBM Plex Sans Thai / IBM Plex Mono / Kanit (Thai + Latin subsets)
    ├── logos/README.txt          ช่องใส่โลโก้ทางการ (ต้องมีหนังสืออนุญาต) — key: aeroflex scg yazaki airpro o-two nano
    │
    ├── shared.css      (543)     สไตล์ร่วม: price centre, product detail, cart, builder, ป้าย 3 มิติ (.hl*), techstory (.ts*), system3d (.sy3*)
    ├── studio.css      (214)     ห้องจำลอง
    ├── services.css    (146)     ขั้นตอนบริการ
    │
    ├── sbp-core.js     (378)     ★ domain logic + ข้อมูล + กฎธุรกิจ (VAT, โซน, ค่าเดินทาง, แพ็กเกจล้าง, สัญญา, BTU)
    ├── proto-ui.js     (464)     catalog / builder / zone / FAQ / viewer / drawers / toast / reveal
    ├── commerce.js     (426)     cart · productDetail · mountPriceCenter · materialMatrix/Table · mountMaterials · cleanPackageGuide
    ├── journey.js      (96)      travelTable · mountQuotePill · mountMobileMenu · mountFlow
    ├── services.js     (452)     cleanSteps(type, level, pkg) · installSteps · repairSteps · mountServices
    ├── hw-data.js      (47)      ข้อความ "แอร์แต่ละประเภททำงานอย่างไร" (TYPES, STEPS, LABELS, FAN_NAME)
    ├── studio-model.js (244)     ห้องจำลอง: 48 SCENES, สูตร BTU, ฝุ่น→ผล, ค่าไฟ, อุณหภูมิห้อง (ไม่มี DOM — unit test ได้)
    ├── studio.js       (452)     UI ห้องจำลอง
    ├── studio3d.js     (722)     ฉาก 3 มิติห้องจำลอง (ห้อง/เฟอร์นิเจอร์/แอร์ 5 ประเภท/อนุภาคลม/ฝุ่น/heat map)
    ├── ac3d.js         (873)     ★ ตัวเครื่อง 3 มิติ + viewer (exploded/X-ray/ล้าง) + helper ร่วม (materialSet, canvasTex, orbit, buildIndoor/Outdoor)
    ├── units3d.js      (345)     แอร์ติดผนัง/แขวน/สี่ทิศทาง ละเอียด + animateUnit
    ├── howitworks3d.js (472)     กลไกแอร์ 3 ประเภท 7 ขั้น
    ├── throwsim3d.js   (300)     จำลองระยะลมในห้อง 12 ม. · ★Rev.09 r4 4 ประเภท (เพิ่มตู้ตั้ง) + ตัวควบคุมจำลอง 3 แบบ: รีโมต (A) · แผงควบคุมห้อง (B) · แผงสัมผัสกระจก (C)
    ├── trunk3d.js      (94)      รางครอบท่อ Airpro + ข้อต่อ (bentPath, buildTrunk, pipeHanger)
    ├── airflow3d.js    (205)     อนุภาคลมแบบเส้น (tempColor, createAirflow)
    ├── people3d.js     (214)     คนมีข้อต่อแบบ instanced (createCrowd, gait, freePath) + pose 'rig'
    ├── roomkit3d.js    (122)     texture + เฟอร์นิเจอร์ procedural
    ├── matkit3d.js     (109)     ★Rev.08 วัสดุพิมพ์ยี่ห้อ (printed, tube, kit, COPPER, logoImage)
    ├── materials3d.js  (367)     ★Rev.08 โชว์รูมวัสดุ 3 มิติ 7 แท่น
    ├── install3d.js    (528)     ★Rev.08 ห้องบ้านจำลอง + ระบบติดตั้งครบ (ใช้ร่วม B/C)
    ├── tech3d.js       (239)     ★Rev.08 ช่าง + เครื่องมือ + เส้นทางเดิน
    ├── techstory.js    (387)     ★Rev.08 เรื่องราว 4 งาน + UI (แบบ C)
    ├── system3d.js     (244)     ★Rev.08 ลำดับการทำงาน 9 ขั้น (แบบ B)
    ├── engdraw.js      (155)     แบบวิศวกรรมภาพตัด 2 มิติ (แบบ B, lazy)
    ├── thaimap3d.js    (243)     แผนที่ประเทศไทย 3 มิติ
    ├── contact.js                ★Rev.09 askTeam(topic,msg) + หัวข้อ/รายละเอียดในฟอร์มติดต่อ · ★r5 handoffBox (Beta: สรุปคำขอให้ลูกค้าคัดลอก/ส่งอีเมล — ไม่แกล้งว่าส่งแล้ว) · copyText
    ├── site.js                   ★Rev.09 r5 โครงเว็บตามเส้นทางลูกค้า: 6 หน้า (หน้าแรก · ซื้อแอร์ · ล้าง/ติดตั้ง/ซ่อม · องค์กร · ความรู้ · ติดต่อ) · เลือกงาน → เส้นทางทีละขั้น · ข้อมูลบริษัท · แบบฟอร์มความเห็น Beta · footer
    ├── product-media.js          ★Rev.09 ช่องรูปสินค้าทุกรุ่น (product-media.json + products/) + ภาพเรนเดอร์ 3 มิติต่อประเภทเมื่อยังไม่มีรูป
    ├── product-media.json · products/README.md   ★Rev.09 manifest รูปจริง (models / series / brands) + วิธีเพิ่มรูป
    ├── roomfit.js                ★Rev.09 "ลองวางแอร์ในห้องของคุณ" UI + fitCheck() (ค่าแนะนำ FIT_RULES, ขนาดเครื่องจากสเปก, ท่อ, ระยะลม) + FUJIVA preview
    ├── roomfit3d.js              ★Rev.09 ฉาก 3 มิติห้องจริงของลูกค้า: เครื่องตามขนาดจริง ระยะห่าง ลม คอยล์ร้อน แนวท่อ
    ├── knowledge.js              ★Rev.09 ศูนย์ความรู้ 12 หัวข้อ (บ้าน/องค์กร) ตัวเลขดึงจากค่าคงที่เดียวกับเครื่องมือ + ปุ่ม "ลองเอง"
    ├── gl-pool.js                ★Rev.09 งบ WebGL context (≤3 live) — ทุก renderer ลงทะเบียนด้วย track()
    ├── wisp3d.js                 ★Rev.09 r3 ลมแบบธรรมชาติ: createWisps (เส้นลมโปร่งเรียวท้าย) · createHaze (ไอเย็นจาง) · airTint · swirl — ภาพลมทุกจุดใช้ตัวนี้
    ├── roomplan.js               ★Rev.09 r3 จัดห้อง (ไม่มี DOM/three): FURN 21 ชิ้น · PRESETS 7 ห้อง · presetLayout · freeSpot · layoutChecks (ของบังลม/ลมเป่าหน้า/ทับหน้าต่าง)
    ├── jobguide.js               ★Rev.09 r4 (แทน cleanguide.js) "ทีมช่าง ล้าง / ติดตั้ง" (#cleanflow): แท็บงานล้าง C1/C2 · งานติดตั้ง มาตรฐาน/พรีเมียม × 4 ประเภท (ติดผนัง/แขวน/สี่ทิศทาง/ตู้ตั้ง) · การ์ดเทียบ + ราคา Pricebook · เล่นทีละขั้น · ช่างหัวหน้า/ผู้ช่วยทำอะไร · วิธีทำต่อประเภท (CLEAN_HOW/INSTALL_HOW) · ถาดชิ้นส่วน / รายการติดตั้ง
    ├── jobscene3d.js             ★Rev.09 r4 (แทน cleanguide3d.js) ฉาก 3 มิติทีมช่างหน้างานจริง: สถานที่ตามประเภท (ติดผนัง = ห้องนอนบ้าน · แขวน = ร้านค้า · สี่ทิศทาง = คาเฟ่ · ตู้ตั้ง = ห้องประชุม) · ส่งต่อชิ้นส่วนช่าง→ผู้ช่วย→โต๊ะ · ติดตั้งทีละขั้น (เทปแนว ขายึด ยกสองคน ท่อในราง น้ำทิ้ง สายไฟ ไนโตรเจน Vacuum) · ตัวแอร์ไม่มียี่ห้อ
    ├── crew3d.js                 ★Rev.09 r4 ช่าง 2 คน + ลูกค้า (people3d rig): เดิน ปีนบันได ท่าทำงาน ~30 ท่า เครื่องมือในมือ ป้ายเสื้อ SBP AirCare
    ├── brand3d.js                ★Rev.09 r4 ตราบริษัทในฉาก 3 มิติ (texture): เสื่อ FUJIVA · ป้ายเสื้อ · กล่องเครื่องมือ · ถุงล้าง · แท็บเล็ตรายงาน — ใช้ไฟล์โลโก้ทางการอัตโนมัติถ้ามี assets/logos/fujiva.png, sbp.png
    └── three.module.min.js · GLTFLoader.js · RoomEnvironment.js · BufferGeometryUtils.js   (three.js r170, ห้ามแก้)
```

**Dependency graph ของโมดูล 3 มิติ (Rev.08):**
```
techstory.js ─┬─ install3d.js ─┬─ trunk3d.js
system3d.js  ─┤                ├─ matkit3d.js
              │                ├─ roomkit3d.js
              │                ├─ units3d.js ── ac3d.js ── RoomEnvironment.js
              ├─ tech3d.js ────┴─ people3d.js
              └─ airflow3d.js
```

---

## 4. Complete Source Code Summary

> **โค้ดเต็มทุกไฟล์อยู่ใน `SBP-WEB-011_Prototype_Source.zip`** (ตรงกับเวอร์ชันที่เผยแพร่ Rev.08.1) — ส่วนนี้ให้ "สัญญา" ที่ต้องรู้ก่อนแก้ + โค้ดเต็มของไฟล์ pipeline ที่สั้นและสำคัญ (`build.py`, `tools_recon.py`) + โค้ดจริงของกฎธุรกิจที่ห้ามพัง
> ไฟล์ที่แก้ล่าสุด (Rev.08 → 08.1): `install3d.js` (ใหม่), `tech3d.js` (ใหม่), `system3d.js` (ใหม่), `matkit3d.js` (ใหม่), `techstory.js` (เขียนใหม่), `materials3d.js` (ส่วนหัวเขียนใหม่), `people3d.js`, `services.js`, `services.css`, `shared.css`, `howitworks3d.js`, `studio3d.js`, `sbp-core.js`, `commerce.js`, `b.html`, `c.html`, `build.py`, `tools_recon.py` (path แบบ relative), `tests/*`, `package.json`, `.gitignore`

### 4.1 Public API ของแต่ละโมดูล (exports)

| โมดูล | exports หลัก | การเรียกใช้ในหน้า |
|---|---|---|
| `sbp-core.js` | `VAT, incVat, TYPES, TYPE_BY_ID, BRANDS, BRAND_BY_ID, DEMO, DATA, loadData, stockTh, installOptions, addonsFor, PRICE_BANDS, BTU_BANDS, emptyFilter, queryCatalog, facetCounts, filterToParams, baht, btuFmt, kbtu, HQ, ZONES, NEARBY, TRAVEL, TIER_TH, travelFor, travelCharge, travelNote, checkZone, CLEAN_PKGS, SIZE_BANDS, VOLUME_LEVELS, VOLUME_HINT, PRICING, PRESETS, estimateContract, recommendBtu, SERVICES, PROCESS, FAQ, h, $, $$, countUp, reduceMotion` | `await loadData()` ก่อน mount ทุกอย่าง |
| `proto-ui.js` | `mountCatalog(root,cfg)`, `mountBuilder(root,cfg)`, `mountZone(root,{onResult})`, `mountFaq(root)`, `mountBtu`, `mountViewer(root,cfg)`, `scrollExplode`, `mountRoom`, `toast(msg)`, `reveal`, `openDrawer/closeDrawer/wireDrawers`, `typeArt`, `productDrawerContent`, `compareTable` | |
| `commerce.js` | `cart` (singleton: `items, zone, zoneInput, subs:Set, load(), save(), add(line), setQty(id,q), remove(id), clear(), setZone(input), count(), totals()`), `mountCart({buttons})` → `{open, close, render}`, `productDetail(m, skuIndex, {onPick,on3D,onAdded})`, `mountPriceCenter(root)`, `materialMatrix(type,btu)`, `materialTable(type,btu,{compact})`, `mountMaterials(root,{theme})` (lazy โหลด `materials3d.js`), `cleanPackageGuide(where,hl)`, `MAT_ROWS, PKG_INFO, METHOD_INFO` | |
| `journey.js` | `travelTable()`, `mountQuotePill(openCart)`, `mountMobileMenu()`, `mountFlow(root, ids, {openCart, dock})` | |
| `services.js` | `cleanSteps(type, level, pkg)`, `installSteps(type, lv)`, `repairSteps`, `mountServices(root, {how, onType, onPart})`, `typeIcon(t)` | |
| `studio.js` | `mountStudio(root, {theme, sceneStart, onOpen(m,i)})` (async, lazy 3D) | sceneStart: A `bedroom` · B `openoffice` · C `living` |
| `studio-model.js` | `SCENES` (48), `SCENE_GROUPS` (9), `needBtu, btuBreakdown, recommendUnits, dirtFrom, effects, energy, cleanInterval, thermal, timeToSet, steadyT …` | ไม่มี DOM |
| `howitworks3d.js` | `createHowItWorks3D(container, opts)`, `mountHowItWorks(root, {theme, start, onType})` → `{setType, focusPart}` | theme: `light` / `blueprint` / `dark` |
| `system3d.js` | `createSystem3D(container, {theme, type, onStep})` → `{setType, go, steps, advance, dispose}` · `mountSystem3D(root, {theme, start, onType})` → `{setType, mark, _v3}` | แบบ B `#edRoot` |
| `techstory.js` | `STORIES` · `createTechStory3D(container, opts)` → `{go(i), setStory(key,tier), length, story(), dispose, advance(sec), _dbg}` · `mountTechStory(root, {theme})` → `{setFinish, _s3()}` | แบบ C `#storyRoot` |
| `install3d.js` | `createStage(container, o)` → `{renderer, scene, camera, cam, flyTo, el, container, onFrame(f), onAfter(f), size, flying, advance(sec), dispose()}` · `createLabels(container)` → `{set(list), update(cam,W,H), occluders(list)}` · `buildHome(scene, {type, theme})` · `createPathFlow(parent, o)` · `laneLine, smoothPts, V, clamp, ease, RM` | |
| `tech3d.js` | `buildTools(home)` → `{g, items, show(name,on), update(dt,unitMatrix), washerHose(to), bagHoseTo(spoutW)}` · `createTech(home, {tools})` → `{crowd, tools, st, goTo(spot,act,tool,immediate), tick(dt,clock), customer(mode), toolTip(name), busy, hand(), setGhost(k), stepGhost(dt)}` · `SPOTS` | |
| `matkit3d.js` | `printed(kind, L, theme)`, `tube(curve, r, kind, theme, seg)`, `kit(theme)`, `logoImage(key)`, `COPPER = { wall: 0.0007, sizes: {'1/4"','3/8"','1/2"','5/8"'} }` | |
| `materials3d.js` | `MATS`, `createMaterials3D(container, opts)`, `mountMaterials3D(root, {theme})` | |
| `ac3d.js` | `createACViewer(container, opts)` → `{setUnit, setExplode, setXray, setAirflow, setDirt, clean, view, select, zoom, loadModel(url) …}`, `createRoomSim`, `PARTS`, `FINISHES`, `buildIndoor, buildPremiumIndoor, buildOutdoor, materialSet, orbit, canvasTex, finSegment, meshTex` | |
| `units3d.js` | `buildWallUnit(M,opt)`, `buildCeilingUnit`, `buildCassetteUnit`, `buildUnit`, `animateUnit(U, dt, t, k)` | |
| `trunk3d.js` | `bentPath(pts, r)`, `pathPoints`, `pipeMesh(path, r, mat, seg)`, `buildTrunk(center, lids, {caps, W, D})`, `pipeHanger(at, up, len, mat)` | |
| `airflow3d.js` | `tempColor(t, out)`, `createAirflow(parent, opts)` → `set({running, …})` | |
| `people3d.js` | `createCrowd(parent, opts)` (pose `'rig'` + `p.rig(S,t,dt,p)` hook, `cap`, `colors` override), `gait(S,w,amp)`, `freePath` | |
| `thaimap3d.js` | `mountThaiMap(host, {theme, onPick})` (async) → `{highlight(zone), setView, provinces}` · ไม่มี WebGL → วาด fallback | |
| `engdraw.js` | `mountEngDrawings(root, cfg)` | lazy จาก system3d |
| `contact.js` ★09 | `enhanceQuoteForm(form)`, `askTeam(topic, message)` (re-export ผ่าน journey.js) · ★r5 `handoffBox({ref, title, text, subject, note})` → กล่องสรุป (คัดลอก / เปิดอีเมล / อีเมลเป็นข้อความเลือกได้ / โทร) · `copyText(text, ta)` | ทุกปุ่ม "ติดต่อสอบถาม" · หลังกดส่งฟอร์ม/ใบเสนอราคา |
| `site.js` ★09r5 | `VIEWS`, `JOURNEYS` · `mountSite({variant, views:{home,shop,service,business,knowledge,contact: [section ids]}, order, navFmt, labels, hooks:{clean,install,repair}, openCart})` → `{go(id), view(), startJourney(k), openFeedback()}` · section ที่อยู่ในหน้าอื่นถูกซ่อน (`data-sx` + `hidden`) — ลิงก์ `#id`, เมนู, `scrollIntoView()` ทุกที่สลับหน้าให้เอง · back/forward ใช้ได้ · `localStorage['sbp-journey-v1']` | เรียกท้าย script ของ a/b/c (หลัง mount ทุกโมดูล) · ⚠️ ห้ามใช้ attribute `data-view` กับ section (โมดูลอื่นใช้ชื่อนี้) |
| `product-media.js` ★09 | `loadMedia()`, `photosFor(m, sku)`, `hasPhoto`, `productShots()` (WebGL ชั่วคราว 1 ตัว แล้วคืน), `productVisual(m, sku, {size: card\|detail\|thumb, tag})` | `await loadMedia()` หลัง loadData |
| `roomfit.js` ★09 | `FIT_RULES`, `throwFor(type, btu)`, `unitDims(type, btu, spec)`, `fitCheck(state)` (pure), `mountRoomFit(root, {theme, onOpenModel})` → `{setModel(m, i), state, check}` | `#fitRoot` ทุกแบบ · ปุ่ม "ลองวางในห้องของคุณ" ใน productDetail (`onFit`) |
| `roomfit3d.js` ★09 | `wallFrame(wall, W, L)`, `createRoomFit3D(container, {theme})` → `{set(state, result), view('iso'\|'top'\|'front'), kick, snapshot, dispose}` | lazy จาก roomfit |
| `knowledge.js` ★09 | `GUIDES`, `mountKnowledge(root, {ids})` (ids = map key เครื่องมือ → id section ของแต่ละแบบ) | `#learnRoot` |
| `gl-pool.js` ★09 | `track(renderer, el, {scene, redraw})` → `{release()}` (หุ้ม `renderer.render` ให้วาดเฉพาะตอน live, สร้าง env map ใหม่หลัง restore) · `glBudget()` → `{max, live, total}` | เรียกใน `createACViewer`, `createRoomSim`, `createStage`, howitworks, materials, studio, throwsim, thaimap, roomfit3d |
| `wisp3d.js` ★09r3 | `createWisps(parent, {max, additive})` → `{begin, seg(x0..z1, r,g,b, a0,a1, w0,w1), end, mesh, setAdditive, dispose}` · `createHaze(parent, {max})` · `airTint(rgb, dark)` · `swirl(x,y,z,t,seed,out)` | ใช้ใน airflow3d, howitworks3d (SheetFlow/RadialFlow), ac3d (makeFlow) |
| `airflow3d.js` ★09r3 | เดิม + ประวัติตำแหน่ง (`hist`) วาดเป็นเส้นลม · `timeScale` (0.6 = แสดงช้ากว่าจริง) · `haze` · ความปั่นป่วนวาดตอนแสดงผล (ไม่แตะฟิสิกส์ → ระยะลมเท่าเดิม) · `prewarm(steps, dt)` | studio3d, throwsim3d, system3d, techstory, roomfit3d, jobscene3d · ★r4 `set({louver: null|0…1, hswing})` ตำแหน่งบานคงที่ / สวิงซ้ายขวา (ค่าเริ่มต้นเท่าเดิม) |
| `roomplan.js` ★09r3 | `FURN`, `FURN_GROUPS`, `PRESETS`, `frame2`, `footprint`, `clampItem`, `overlaps`, `against`, `newId`, `presetLayout(id,W,L)`, `freeSpot(k,list,W,L,avoid)`, `layoutChecks(S,{t,d,thr,add})` | ไม่มี DOM — ทดสอบด้วย node ได้ |
| `roomfit3d.js` ★09r3 | + `select(id)` · opts `onEdit(kind, live)`, `onPick(id)`, `actions{rotate, remove, nextWall}` · `set(S, R, {live})` (ระหว่างลากไม่ settle ลมใหม่) | ลากเฟอร์นิเจอร์บนพื้น / หน้าต่าง-ประตูตามผนัง / แอร์ตามผนัง (สี่ทิศทาง: บนฝ้า) · คีย์บอร์ด ลูกศร/R/Delete/Esc |
| `jobguide.js` ★09r4 | `JOB_TYPES`, `TEAR`, `TRAY`, `DIRT0`, `cleanTimeline(type, level, pkg)`, `installTimeline(type, lv)` → `[{step, who:[lead, asst], state, done?}]` · `mountJobGuide(root, {theme, start, type, job})` → `{setJob, setLevel, setType, go, steps, advance, busy, ready}` (alias `mountCleanGuide`) | `#cleanRoot` ทุกแบบ: A `wall` · B `ceiling` · C `cassette` |
| `jobscene3d.js` ★09r4 | `createJobScene(container, {theme, type, job, onFrame})` → `{setType, setJob, show(state, {jump}), reset, busy, project, anchors, advance, dispose}` · state: `crew:[{s: spot, a: act, t: tool}×3]`, `beats:[{t, crew, set}]`, `off`, `dirt`, `spray:{by, at, chem}`, ค่าติดตั้ง `unitK/outK/pipeK/trunkK/drainK/wireK/gauges/n2/vac/needle` | lazy จาก jobguide · ชิ้นส่วนที่ถอดเดินทาง ช่าง→ผู้ช่วย→โต๊ะ (และกลับตอนประกอบ) อัตโนมัติจาก `off` |
| `crew3d.js` ★09r4 | `buildLadder(h)`, `createCrew(parent, {route, at, customer})` → `{go(i, spec), place(i, spec), tick, hand(i, side), mid(i), busy(i), toolTip(i, name), visible, dispose}` · spec `{x, z, face, act, tool, ladder:{at, face, top, lean}}` | สมาชิก 0 ช่างหัวหน้า · 1 ผู้ช่วย · 2 ลูกค้า |
| `brand3d.js` ★09r4 | `drawFujiva`, `drawSbp`, `matTex(dark)`, `chestTex`, `backTex`, `boxTex`, `bagTex`, `cardTex`, `decal(tex, w, h, o)` | jobscene3d, crew3d, tech3d (ป้ายเสื้อ) |
| `throwsim3d.js` ★09r4 | `createThrowSim(container, {theme, onReach, onStats, onSupply})` → `{setType('wall'\|'ceiling'\|'cassette'\|'floor'), setControl({power, mode, temp, fan, louver, hswing, dirty})}` · `mountThrowSim(root, {theme, type, style: 'remote'\|'panel'\|'glass', fallback})` | ผ่าน `mountHowItWorks(root, {throwStyle})` A remote · B panel · C glass |
| `units3d.js` ★09 | + `buildFloorUnit(M, {w,h,d, interior})` (★r4 interior: ฝาหน้า แผ่นกรอง ใบพัด โข่งลม คอยล์ ถาด ถอดได้) · `buildWallUnit` ใช้ตัวเครื่องโค้งพรีเมียม (ไม่มีโลโก้) เป็นค่าเริ่มต้น ยกเว้นสไตล์ blueprint | |

### 4.2 Schema ของ `assets/sbp-data.json` (ข้อมูลอัดแน่นด้วย string pool)

```jsonc
{
  "v": "SBP Pricebook 2569 · ดึงจาก…Final จริง · 29.09.2569 · public (standard rates only, approved models only)",
  "pf": ["type","brand","model","btu","priceExVat","installStdExVat","approved","series","system","refrigerant","pipeLiquid",
         "pipeGas","indoorDim","indoorKg","outdoorDim","outdoorKg","power","compressor","warranty","lead","outdoorModel","maxPipe","maxLift"],
  "pool": ["ME-Series", "..."],            // 1,216 สตริงที่ใช้ซ้ำ; ตัวเลขในแถว = index ใน pool, -1/null = ไม่มีค่า
  "prods": [["wall","AUX","ASW-09/DIM-1S",9500,7800,3800,1, 0,1,2,…]],     // 705 แถว ตามลำดับ pf; ราคา = ก่อน VAT
  "inst":  [["INS-W-9000-12000-STANDARD", catIdx, "ชื่อ", unitIdx, 3800|null, incIdx, excIdx, warrantyIdx, surveyIdx]],   // 173 แถว
  "clean": [[pkgIdx,"C1",typeIdx,rangeIdx,unitIdx, 650, null, null, wIdx, careIdx, docIdx, incIdx, excIdx, stIdx, "ชื่อ"]], // 234 แถว (sp, pj = null เสมอ)
  "rep":   [[catIdx,"ชื่อ",unitIdx, 850|null, null, null, wIdx, incIdx, excIdx, stIdx]],                               // 86 แถว
  "minBill": 4500                          // ยอดขั้นต่ำงานล้างต่อการเข้าหน้างาน (ก่อน VAT)
}
```
- `inst` มี 173 แถว (ตัด -MASS 21 ออกตั้งแต่ไฟล์) → `loadData()` ซ่อน `MAT-CU-L-*` อีก 6 → **เว็บแสดง 167 รายการ** · ไม่มีราคา 68 แถว (แสดง "ประเมินหน้างาน")
- `rep` ไม่มีราคา 30 แถว · `prods` อนุมัติแล้วทั้งหมด (9 รุ่นราคาอ้างอิงตลาดไม่อยู่ในไฟล์)
- `internal/sbp_real.json` (ภายใน) = `{prods[714], inst[194], clean[468], rep[86]}` แบบ object เต็ม มี `sp`/`pj` (อัตราพิเศษ/โครงการ) — **ใช้กับ tools_recon.py เท่านั้น**

### 4.3 โค้ดกฎธุรกิจที่ห้ามพัง (ตัดจาก `sbp-core.js` ตามจริง)

```js
// sbp-core.js บรรทัด 1–8
// SBP AirCare prototype core — shared data + business logic (no rendering).
// Data source: assets/sbp-data.json, extracted from the company's approved price files
//   "ใบเสนอราคาติดตั้งแอร์ Final จริง.xlsx" (714 models, 194 install/add-on items)
//   "ใบเสนอราคาล้างและซ่อม Final จริง.xlsx" (cleaning pricebook 3 packages × C1/C2, 86 repair items)
// All source prices are before VAT. The site shows VAT-inclusive prices first, with the pre-VAT figure beside it.

export const VAT = 0.07;
export const incVat = n => Math.round(n * (1 + VAT));
```

```js
// sbp-core.js บรรทัด 52–60 (ภายใน loadData) — ตัวกรองและการแปลงข้อความที่บังคับคำตัดสินเจ้าของ
  // install + add-on items
  // Owner decision (Rev.07): the web sells Standard + Premium installation only (premium-grade materials in every job);
  // the Basic/MASS tier stays in the Pricebook for the sales team. Copper brand shown as O-TWO (Pricebook to be updated to match).
  // Rev.08 owner decision: the web shows one copper spec only — O-TWO 0.70 mm. Type L / project-grade copper stays in the Pricebook (QTN/BOQ work) but is not listed on the web.
  const brand = t => t == null ? t : t.replace(/K Copper Type L/g, 'O-TWO').replace(/K Copper/g, 'O-TWO').replace(/ท่อน้ำยาทองแดง 0\.70 มม\./g, 'ท่อน้ำยาทองแดง O-TWO 0.70 มม.').replace(/ท่อ Type L หรือ Project-grade ใช้เมื่อระบุใน QTN\/BOQ;\s*ไม่รวมอัตโนมัติหากไม่ระบุ;\s*/g, '');
  DATA.inst = j.inst.map(([c, cat, n, u, p, inc, exc, w, sv]) => ({ code: c, cat: S(cat), name: brand(n), unit: S(u), ex: p, inc: brand(S(inc)), exc: S(exc), warranty: S(w), survey: S(sv) })).filter(i => !/-MASS$/.test(i.code) && !/^MAT-CU-L-/.test(i.code));
  DATA.instByCode = Object.fromEntries(DATA.inst.map(i => [i.code, i]));
  DATA.clean = j.clean.map(([pk, lv, ty, rg, u, s, sp, pj, w, care, doc, inc, exc, st, n]) => ({ pkg: S(pk), level: lv, ty: S(ty), type: TYPE_FROM_CLEAN[S(ty)] || null, range: S(rg), unit: S(u), rate: { s, sp, pj }, warranty: S(w), care: S(care), doc: S(doc), inc: S(inc), exc: S(exc), status: S(st), name: n }));
  DATA.rep = j.rep.map(([ty, n, u, s, sp, pj, w, inc, exc, st]) => ({ cat: S(ty), name: n.replace(/^ซ่อมแอร์:\s*/, ''), unit: S(u), rate: { s, sp, pj }, warranty: S(w), inc: S(inc), exc: S(exc), status: S(st) }));
```

```js
// sbp-core.js บรรทัด 202–235 (ค่าเดินทาง) และ 274–280 (อัตรามาตรฐานเท่านั้น + กำลังทีม)
// Travel rule outside the 5 core provinces — modelled on published fees of Thai AC service shops (market survey 29 ก.ย. 2569):
// 300 flat for the next ring (e.g. +300 นครปฐม/สมุทรสาคร), 800 for 61–80 km bands, 5–10 บาท/กม. beyond a free radius,
// ~3,000/day for 150–200 km jobs. Amounts are before VAT, per trip (one-way road km from HQ).
// waiveAt / minUnits are cost-based proposals (no shop publishes them) — owner to confirm.
export const TRAVEL = {
  roadFactor: 1.35,
  bands: [
    { id: 'Z1', maxKm: 60, fee: () => 300, waiveAt: 4, minUnits: 1, th: 'ไม่เกิน 60 กม.' },
    { id: 'Z2', maxKm: 100, fee: () => 800, waiveAt: 8, minUnits: 3, th: '61–100 กม.' },
    { id: 'Z3', maxKm: 150, fee: () => 1500, waiveAt: null, minUnits: 5, th: '101–150 กม.' },
  ],
  maxKm: 150,
  perKm: 10,
  farDay: 3000,
  source: 'สำรวจราคาที่ร้านแอร์ในไทยประกาศบนเว็บ 18 แหล่ง (29 ก.ย. 2569)',
};
export const TIER_TH = {
  core: { th: 'อยู่ในพื้นที่ให้บริการ', note: 'กรุงเทพฯ และปริมณฑล ไม่มีค่าเดินทางเพิ่ม' },
  extended: { th: 'รับงานได้ มีค่าเดินทางเพิ่ม', note: 'นอกกรุงเทพฯ และปริมณฑล คิดค่าเดินทางต่อเที่ยวตามช่วงระยะทางจากสำนักงานใหญ่ ยกเว้นเมื่อจำนวนเครื่องถึงเกณฑ์' },
  out: { th: 'เกินระยะให้บริการ', note: 'เกินระยะที่รับงานรายเครื่อง ฝากข้อมูลไว้เพื่อประเมินเป็นงานโครงการหรือสัญญา' },
  unknown: { th: 'ไม่พบชื่อพื้นที่นี้', note: 'ลองพิมพ์ชื่อเขตหรืออำเภอ หรือให้ทีมตรวจสอบจากที่อยู่จริง' },
};
const norm = s => (s || '').replace(/\s|เขต|อำเภอ|อ\.|จังหวัด|จ\./g, '').toLowerCase();
const hav = (a, b, c, d) => { const R = 6371, t = x => x * Math.PI / 180; const dl = t(c - a), dn = t(d - b); const s = Math.sin(dl / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };
export function travelFor(km) {
  const band = TRAVEL.bands.find(x => km <= x.maxKm);
  return band ? { fee: band.fee(km), band, minUnits: band.minUnits, waiveAt: band.waiveAt } : null;
}
// fee actually charged for a job with `units` machines (waived at volume); returns { fee, waived, short }
export function travelCharge(zone, units = 1) {
  if (!zone || zone.tier !== 'extended') return { fee: 0, waived: false, short: 0 };
  const waived = !!(zone.waiveAt && units >= zone.waiveAt);
  return { fee: waived ? 0 : zone.fee, waived, short: Math.max(0, (zone.minUnits || 1) - units) };
}
// …
// Public site shows the STANDARD rate only. Special / project rates need conditions + approval (Approval Matrix)
// and are never sent to the browser — the sales team offers them in the formal quotation.
export const VOLUME_LEVELS = [ { min: 0, key: 's', th: 'อัตรามาตรฐาน' } ];
export const VOLUME_HINT = 10;   // from this many units the page says "may qualify for a special rate — confirmed in the quotation"
// Crew productivity per team-day for standard cleaning (C1) — company manual §1.9 (SBP-GRW-001): wall 20–25, ceiling/cassette 12–16 → mid-points.
// Floor-standing uses the ceiling/cassette range; ducted uses its lower bound (no separate figure in the manual).
export const PRICING = { unitsPerTeamDay: { wall: 22, ceiling: 14, cassette: 14, floor: 14, duct: 12 } };
```

### 4.4 `build.py` (โค้ดเต็ม)

```python
#!/usr/bin/env python3
"""Build self-contained single-file versions of the SBP AirCare prototypes.

Each variant (a/b/c) becomes ONE html file: CSS inlined (fonts as data URIs), all JS modules
(incl. three.js and the lazily imported 3D studio) bundled by esbuild into one inline module,
price data inlined as globalThis.__SBP_DATA. No fetch, no relative links needed.

Outputs (dist/):
  offline/{a,b,c,index}.html   full documents, open by double-click (links between them work)
  art/{a,b,c}.html             same page for the Artifact tool (links -> artifact URLs from urls.json)
  art/index.html               A/B/C tester with the three variants embedded (gzip+base64, srcdoc)
usage: python3 build.py [--urls urls.json]
"""
import base64, gzip, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(ROOT, 'assets')
DIST = os.path.join(ROOT, 'dist')
os.makedirs(os.path.join(DIST, 'offline'), exist_ok=True)
os.makedirs(os.path.join(DIST, 'art'), exist_ok=True)
URLS = {}
if '--urls' in sys.argv:
    URLS = json.load(open(sys.argv[sys.argv.index('--urls') + 1]))

def read(p): return open(p, encoding='utf-8').read()

def css_inline(name):
    css = read(os.path.join(A, name))
    def dataurl(m):
        f = os.path.join(A, m.group(1))
        b = base64.b64encode(open(f, 'rb').read()).decode()
        return f"url(data:font/woff2;base64,{b})"
    return re.sub(r'url\((fonts/[^)]+\.woff2)\)', dataurl, css)

def bundle(js, name):
    entry = os.path.join(ROOT, f'_entry_{name}.mjs')
    open(entry, 'w', encoding='utf-8').write(js)
    try:
        out = subprocess.run(['npx', '--yes', 'esbuild@0.28.2', entry, '--bundle', '--format=esm', '--minify',
                              '--target=es2022', '--legal-comments=none', '--log-level=warning'],
                             cwd=ROOT, capture_output=True, text=True, check=True).stdout
    finally:
        os.remove(entry)
    return re.sub(r'</script', r'<\\/script', out, flags=re.I)

DATA = read(os.path.join(A, 'sbp-data.json'))
DATA_TAG = '<script>globalThis.__SBP_DATA=' + DATA.replace('</', '<\\/') + '</script>'
THGEO = read(os.path.join(A, 'thai-provinces.json'))
DATA_TAG += '<script>globalThis.__SBP_TH=' + THGEO.replace('</', '<\\/') + '</script>'
# official brand logo files (only when supplied with the brand owner's permission): assets/logos/<key>.png → globalThis.__SBP_LOGOS
LOGO_DIR = os.path.join(A, 'logos')
if os.path.isdir(LOGO_DIR):
    logos = {}
    for f in sorted(os.listdir(LOGO_DIR)):
        k, ext = os.path.splitext(f)
        if ext.lower() in ('.png', '.webp', '.svg'):
            mime = {'.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml'}[ext.lower()]
            logos[k.lower()] = f'data:{mime};base64,' + base64.b64encode(open(os.path.join(LOGO_DIR, f), 'rb').read()).decode()
    if logos:
        DATA_TAG += '<script>globalThis.__SBP_LOGOS=' + json.dumps(logos) + '</script>'
VNAME = {'a': 'A · Bento', 'b': 'B · Engineering', 'c': 'C · Showroom'}

def build_variant(v):
    html = read(os.path.join(ROOT, f'{v}.html'))
    # stylesheets -> inline
    html = re.sub(r'<link rel="stylesheet" href="assets/([\w.-]+\.css)">', lambda m: f'<style>{css_inline(m.group(1))}</style>', html)
    # the one module script -> bundled inline module
    m = re.search(r'<script type="module">(.*?)</script>', html, flags=re.S)
    assert m, v
    js = bundle(m.group(1), v)
    html = html[:m.start()] + DATA_TAG + '<script type="module">' + js + '</script>' + html[m.end():]
    assert 'assets/' not in re.sub(r'<script type="module">.*?</script>', '', html, flags=re.S) or True
    return html

def links(html, mode):
    """mode offline: keep ./a.html etc (hub -> index.html). art: artifact URLs in a new tab. embed: tell the parent tester."""
    if mode == 'offline':
        return html.replace('href="./"', 'href="./index.html"').replace('<body>', '<body><script>globalThis.SBP_HUB="./index.html"</script>', 1)
    if mode == 'art':
        for v in 'abc':
            u = URLS.get(v)
            html = html.replace(f'href="./{v}.html"', f'href="{u}" target="_blank" rel="noopener"' if u else 'href="#"')
        u = URLS.get('index')
        html = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + '<script>globalThis.SBP_HUB=' + json.dumps(u or '') + '</script>', html, count=1)
        return html.replace('href="./"', f'href="{u}" target="_blank" rel="noopener"' if u else 'href="#"')
    # embed inside the tester: variant links switch the tester's tab
    for v in 'abc':
        html = html.replace(f'href="./{v}.html"', f'href="#" data-sbp-go="{v}"')
    html = html.replace('href="./"', 'href="#" data-sbp-go="hub"')
    html = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + '<script>globalThis.SBP_HUB=""</script>', html, count=1)
    hook = "<script>document.addEventListener('click',e=>{const a=e.target.closest('[data-sbp-go]');if(!a)return;e.preventDefault();try{parent.postMessage({sbpGo:a.dataset.sbpGo},'*')}catch(_){}});</script>"
    return html.replace('</body>', hook + '</body>')

def strip_doc(html):
    """Artifact pages are wrapped in a skeleton at publish time: keep head styles/meta-less content + body."""
    head = re.search(r'<head>(.*?)</head>', html, flags=re.S).group(1)
    head = re.sub(r'<meta[^>]*>', '', head)
    title = re.search(r'<title>(.*?)</title>', head, flags=re.S)
    head = re.sub(r'<title>.*?</title>', '', head, flags=re.S)
    body_m = re.search(r'<body([^>]*)>(.*)</body>', html, flags=re.S)
    attrs, body = body_m.group(1), body_m.group(2)
    out = (f'<title>{title.group(1)}</title>' if title else '') + head + body
    if 'class=' in attrs:   # carry body classes over
        cls = re.search(r'class="([^"]*)"', attrs).group(1)
        out += f"<script>document.body.classList.add(...{json.dumps(cls.split())})</script>"
    return out

sizes = {}
built = {}
for v in 'abc':
    full = build_variant(v)
    built[v] = full
    open(os.path.join(DIST, 'offline', f'{v}.html'), 'w', encoding='utf-8').write(links(full, 'offline'))
    open(os.path.join(DIST, 'art', f'{v}.html'), 'w', encoding='utf-8').write(strip_doc(links(full, 'art')))
    sizes[v] = len(full.encode()) // 1024

# ---- tester (preview.html) with embedded variants ----
pv = read(os.path.join(ROOT, 'preview.html'))
pv = re.sub(r'<link rel="stylesheet" href="assets/([\w.-]+\.css)">', lambda m: f'<style>{css_inline(m.group(1))}</style>', pv)
packs = ''.join(
    f'<script type="application/octet-stream" id="pack-{v}">' + base64.b64encode(gzip.compress(links(built[v], 'embed').encode(), 9)).decode() + '</script>'
    for v in 'abc')
urls_tag = '<script>window.SBP_URLS=' + json.dumps(URLS) + '</script>'
art_pv = pv.replace('<body>', '<body>' + urls_tag + packs, 1)
open(os.path.join(DIST, 'art', 'index.html'), 'w', encoding='utf-8').write(strip_doc(art_pv))
open(os.path.join(DIST, 'offline', 'index.html'), 'w', encoding='utf-8').write(pv.replace('href="./"', 'href="./index.html"'))
sizes['tester'] = len(art_pv.encode()) // 1024
print(json.dumps({'variant_kb': sizes}))
```

### 4.5 `tools_recon.py` (โค้ดเต็ม — Rev.08.1 เปลี่ยน path เป็นแบบ relative)

```python
#!/usr/bin/env python3
"""Price reconciliation: every price the website can show vs the Pricebook extract (sbp_real.json, read from
ใบเสนอราคาติดตั้งแอร์ Final จริง.xlsx / ใบเสนอราคาล้างและซ่อม Final จริง.xlsx), plus the VAT rounding the site uses."""
import json, os, sys
# paths: web data inside the repo; the internal Pricebook extract (has special/project rates — NEVER commit or ship it)
# lives outside the web build: internal/sbp_real.json by default, or pass a path / set SBP_REAL.
HERE = os.path.dirname(os.path.abspath(__file__))
REAL = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('SBP_REAL', os.path.join(HERE, 'internal', 'sbp_real.json'))
if not os.path.exists(REAL): sys.exit(f'missing internal Pricebook extract: {REAL} (see CLAUDE.md §7)')
W = json.load(open(os.path.join(HERE, 'assets', 'sbp-data.json'), encoding='utf-8')); R = json.load(open(REAL, encoding='utf-8'))
P = W['pool']; S = lambda i: None if i is None or i < 0 else P[i]
inc = lambda x: int(x * 1.07 + 0.5)          # JS Math.round(n*1.07) for positive n
bad = []; n = {}
real_p = {r['m']: r for r in R['prods']}
for r in W['prods']:
    t, b, m, btu, px, ix, ok = r[:7]; s = real_p.get(m)
    if not s: bad.append(('prod missing', m)); continue
    if abs(s['px'] - px) > 0.5: bad.append(('prod px', m, px, s['px']))
    if (s.get('ix') or None) != (ix or None) and abs((s.get('ix') or 0) - (ix or 0)) > 0.5: bad.append(('prod install', m, ix, s.get('ix')))
    if s.get('pv') and abs(inc(px) - s['pv']) > 1: bad.append(('prod VAT', m, inc(px), s['pv']))
    if not s.get('ok'): bad.append(('unapproved on web', m))
n['prods'] = len(W['prods']); n['prods_not_on_web'] = sum(1 for r in R['prods'] if not r.get('ok'))
real_i = {r['c']: r for r in R['inst']}
for r in W['inst']:
    s = real_i.get(r[0])
    if not s: bad.append(('inst missing', r[0])); continue
    if (s['p'] or None) != (r[4] or None) and abs((s['p'] or 0) - (r[4] or 0)) > 0.5: bad.append(('inst', r[0], r[4], s['p']))
n['inst'] = len(W['inst'])
key = lambda pk, lv, ty, rg, nm: (pk, lv, ty, rg, nm)
real_c = {key(r['pk'], r['lv'], r['ty'], r['rg'], r.get('n') or r.get('name')): r for r in R['clean']}
real_c2 = {}
for r in R['clean']: real_c2.setdefault((r['pk'], r['lv'], r['ty'], r['rg']), []).append(r)
for r in W['clean']:
    pk, lv, ty, rg, u, s_, sp, pj = S(r[0]), r[1], S(r[2]), S(r[3]), S(r[4]), r[5], r[6], r[7]
    cands = real_c2.get((pk, lv, ty, rg), [])
    if not any((c['s'] or None) == (s_ or None) or (c['s'] and s_ and abs(c['s'] - s_) < 0.5) for c in cands): bad.append(('clean', pk, lv, ty, rg, s_, [c['s'] for c in cands]))
    if sp is not None or pj is not None: bad.append(('special/project rate leaked', pk, lv, ty, rg))
n['clean'] = len(W['clean'])
real_r = {}
for r in R['rep']: real_r.setdefault(r['ty'], []).append(r['s'])
for r in W['rep']:
    if r[3] not in real_r.get(S(r[0]), []) and not (r[3] is None and None in real_r.get(S(r[0]), [])): bad.append(('rep', S(r[0]), r[1], r[3]))
    if r[4] is not None or r[5] is not None: bad.append(('rep special leaked', r[1]))
n['rep'] = len(W['rep'])
print(json.dumps({'checked': n, 'mismatches': len(bad)}, ensure_ascii=False))
for b in bad[:40]: print(b)
sys.exit(1 if bad else 0)
```

### 4.6 สัญญาของระบบ 3 มิติ Rev.08 (ต้องรู้ก่อนแก้ `techstory.js` / `system3d.js`)

**หน่วยและพิกัด:** เมตร, แกน y ขึ้น, ห้องบ้านจำลอง: ผนังหลัง z ≈ −1.9, ระเบียง x > 3, คอยล์เย็นติดผนังสูง ~2.1 ม., เพดาน 2.7 ม. (สี่ทิศทาง 3.34)

**โครงสร้าง 1 ขั้น (step) ใน `techstory.js`:**
```js
{
  t: 'ชื่อขั้น', form: 'อ้างอิงข้อในแบบฟอร์ม', what: 'ช่างทำอะไร', why: 'ทำไม', get: 'ลูกค้าได้อะไร',
  s: { ...BASE, ...stateOverrides },          // สถานะฉาก (ดู BASE ด้านล่าง)
  tech: [spot, act, tool],                    // spot ∈ tech3d.SPOTS: unit (บนบันได), unitFloor, breaker, bucket, cduValve, cduFront, cduLeft, front, boxes, door
                                              //   act = ท่าทำงาน, tool = เครื่องมือในมือ (gun, sprayer, meter, probe, tablet, remote, wrench, blower, torch, drill)
  cam: 'unitClose',                           // key ใน CAMS (overview, unit, unitClose, unitSide, breaker, parts, trunk, drain, cdu, cduValve, cduLeft, balcony, front, boxes)
  lab: [['ข้อความป้าย', 'anchorKey', warn?]], // ป้าย 2 คอลัมน์ ไม่ทับกัน มีเส้นชี้ ซ่อนเมื่อผนังบัง
  air: true,                                  // แสดงลม (เฉพาะขั้นที่เครื่องเดิน)
  ghost: true,                                // ช่างจางลง (0.22) เมื่อบังจุดสำคัญ
}
// BASE (สถานะตั้งต้น): power, run, parts, peek, unhang, inner, foam, spray, drain,
//   dFilter, dCoil, dBlower, dPan, dOut, dBack (ความสกปรก 0–1),
//   cloth, ladder, bag, bucket, washer, washerOut, pcb, boxes, marks, level, gauges, vac, n2 (เครื่องมือที่โชว์),
//   build (ขั้นการติดตั้ง: plate, hole, base, cdu, pipes, unit, nuts, power), lids, reveal, cust, chip, report, needle, ghost
// STORIES = { C1: () => 14 ขั้น, C2: () => 17 ขั้น (C1 + ปลดเครื่องลดระดับ ไม่ตัดท่อ + ทะเบียนชิ้นส่วน),
//             install: tier => 13 ขั้น ('STANDARD' | 'PREMIUM' ต่างกันที่ leak test / vacuum), repair: () => 10 ขั้น }
// CHIPS: ค่าตัวอย่างการบันทึก (before, after, commission, leak, leakStd, vac, amps, a4, dt …) — ต้องมีข้อความ
//   "ตัวเลขเป็นตัวอย่างการบันทึก ไม่ใช่เกณฑ์ผ่าน/ไม่ผ่าน" เสมอ
```

**`system3d.js` steps(type)** — 9 key ต่อประเภท: `power → intake → coil → water → fan → throw → gas → reject → loop` ข้อความต่างตามประเภท (ติดผนัง/แขวน/สี่ทิศทาง: พัดลม, ระยะลม, ปั๊มน้ำทิ้งของสี่ทิศทาง)

**`buildHome(scene, {type, theme})` คืนค่า:** `type, root, room, sys, props, walls, U (unit), unitG, hang, plate, OU, outG, cdu, valve, term, stand, trunk{base,lid,fit}, wallCaps, mini, rcbo, setPower(), lanes, meshes{k:{tail,ins,cu,core}|{tail,pipe}}, powerMeshes, powerPts, nuts, emitters, obstacles, roomBox, anchors, drainPos, penY, rebuildTails(), setReveal(), setXray(), MK, K, M, flow{gas,liq,drain,power,link}, dispose()`

**ข้อควรรู้เชิงเทคนิค:**
- ป้ายตัวอักษรบนท่อ/ฉนวน = `CanvasTexture` บน `TubeGeometry` (u ตามความยาว, v รอบท่อ; flipY → canvas y fraction f ↔ v = 1−f) แถบพิมพ์อยู่ที่ v≈0.72 จึงหมุนท่อ −2.0 rad รอบแกน x ให้หันหาผู้ชม · สัดส่วน canvas คำนวณจากเส้นรอบวง/ความยาว (ตัวอักษรไม่ยืด)
- เลนท่อในรางใช้ `laneLine()` (least-squares miter offset) ท่อไม่ซ้อนกัน
- ผนังตัดแบบบ้านตุ๊กตา; ป้ายถูกซ่อนเมื่อ raycast โดน `home.walls`
- ทุกฉาก boot แบบ lazy ด้วย `IntersectionObserver` และ pause เมื่อออกนอกจอ; `RM()` = prefers-reduced-motion → ไม่เล่นอัตโนมัติ
- `stage.advance(sec)` = เร่งเวลาให้ animation จบ (ใช้ในเทสต์/ภาพ screenshot)
- swiftshader (ไม่มี GPU) ช้ามาก: screenshot ฉาก 3 มิติใช้ 1–3 นาที → timeout ≥ 180,000 ms

**ช่องโลโก้ทางการ:** วาง `assets/logos/<key>.png` (key: `aeroflex, scg, yazaki, airpro, o-two, nano`; PNG โปร่งใส สูง ≥200 px) → `build.py` ฝังเป็น `globalThis.__SBP_LOGOS` → `matkit3d.logoImage(key)` พิมพ์โลโก้แทนตัวอักษรอัตโนมัติ · **ใช้ได้เมื่อมีหนังสืออนุญาตจากเจ้าของแบรนด์เท่านั้น** ถ้าไม่มีไฟล์ = พิมพ์ชื่อยี่ห้อเป็นตัวอักษรธรรมดา

---

## 5. UI/UX & Design Guidelines

### 5.1 Design tokens (ค่าจริงใน `:root` ของแต่ละแบบ)

| Token | A · Bento (light) | A (dark) | B · Engineering (light) | B (dark) | C · Showroom (dark — ค่าเริ่มต้น) | C (light) |
|---|---|---|---|---|---|---|
| พื้นหลัง | `--bg #EEF2F6` | `#0C1117` | `--paper #F4F7FA` | `#08182B` | `--bg #090E14` · `--stage #0C131B` | `#EDF2F7` · `#E3EAF2` |
| การ์ด | `--tile #FFFFFF` · `--tile-2 #F6F8FB` | `#141B24` · `#1A232E` | `--sheet #FFFFFF` | `#0D2139` | `--panel #111A24` · `--panel-2 #172230` | `#FFFFFF` · `#F3F6FA` |
| ตัวอักษร | `--ink #15202C` · `--ink-2 #4F5D6D` · `--ink-3 #616C7A` | `#E7EDF4` · `#A9B6C4` · `#8A99AB` | `--ink #0E2238` · `#44576D` · `#616C7A` | `#E4EEF9` · `#A9BED6` · `#8EA3BD` | `--ink #EAF0F6` · `#A6B3C2` · `#8A99AB` | `#0F1C2B` · `#4B5B6E` · `#616C7A` |
| เส้น | `--line rgba(18,63,123,.10)` | `rgba(160,190,230,.12)` | `--rule #C9D5E3` · `--line #2C6CB8` (เส้นแบบ) | `#274567` · `#6FA8EE` | `rgba(150,190,230,.13)` | `rgba(18,63,123,.12)` |
| สีแบรนด์ | `--blue #123F7B` · `--blue-2 #1B5AA8` · `--blue-l #E6EEF8` | `#7FB0EE` · `#8DB9F2` | `--blue #123F7B` · `--blue-l #E4EDF7` | `#9CC4F5` | `--cool #5AD0FF` · `--cool-d #1F9BD6` | `#0A76AC` · `#0A6B9C` |
| CTA / accent | `--or #AD5110` (ตัวอักษรขาว 5.3:1) · `--or-l #FCEBDD` | `#F08A3A` (ตัวอักษรเข้ม `#15202C`) | `--safety #AD5110` · `--safety-l #FCEADB` | `#F28A3A` (ตัวอักษร `#0E2238`) | `--heat #FF8A3D` · `--heat-d #E2711D` (ตัวอักษร `#0F1C2B`) | `#B35410` · `#B9540A` (ตัวอักษรขาว) |
| สถานะ | `--ok #1B7A45` · `--warn #B4560D` · `--bad #B02A26` | — | เหมือน A | — | `#4ED39A` · `#FFB35C` · `#FF6B6B` | เหมือน A |
| มุมโค้ง | `--r 22px` · `--r-s 14px` · `--s-r 14px` | | `--s-r 4px` (แบบแปลน) | | `--r 18px` · `--s-r 12px` | |

**Alias tokens สำหรับโมดูลร่วม** — โมดูลร่วม (shared.css, studio.css, services.css และ UI ที่สร้างจาก JS) **ใช้เฉพาะ** `--s-card --s-card-2 --s-ink --s-ink-2 --s-ink-3 --s-line --s-accent --s-on-accent --s-accent-soft --s-ok --s-warn --s-bad --s-r --s-mono` ห้ามอ้าง token เฉพาะแบบ (เช่น `--tile`) จากโมดูลร่วม · แต่ละแบบ map alias เองใน `:root`

**Dark mode:** `@media (prefers-color-scheme: dark)` + `:root:not([data-theme="light"])` และ `:root[data-theme="dark"]` (C กลับด้าน: ค่าเริ่มต้นมืด) · 3D รับ `theme` ผ่าน cfg (`light` / `blueprint` / `dark`)

### 5.2 ฟอนต์

| แบบ | ตัวหลัก | หัวข้อ | ตัวเลข/ป้ายเทคนิค |
|---|---|---|---|
| A | ★Rev.20 IBM Plex Sans Thai 400–700 | Anuphan 600 (`--display`) | IBM Plex Mono (tabular-nums) |
| B | IBM Plex Sans Thai 400–700 | IBM Plex Sans Thai | IBM Plex Mono (ป้ายแบบแปลน — เจ้าของยังไม่ตัดสินว่าจะคงไว้) |
| C | ★Rev.20 IBM Plex Sans Thai | Anuphan (`--display`, เดิม Kanit) | IBM Plex Mono |

body: `400 16px/1.7` · self-hosted woff2 แยก subset Thai/Latin (`fonts.css`) · ห้ามโหลดฟอนต์จาก CDN

### 5.3 Layout & Responsive

- ทดสอบหลักที่ **1366×900** (desktop) และ **390×844** (มือถือ) — ต้องไม่มีการเลื่อนแนวนอนทั้งหน้า (ตารางกว้างเลื่อนในกรอบตัวเองได้ และกดโฟกัสด้วยคีย์บอร์ดได้)
- Breakpoints ที่ใช้จริง (max-width): 1100 · 1080 · 1000 · 980 · 900 · 860 · 760 · 640 · 600 · 560 · 520 · 420 · ฉาก 3 มิติใช้ `min-width:981px` เป็นโหมดจอกว้าง (คำอธิบายขั้นอยู่ด้านบนภาพ)
- `@media (pointer:coarse)`: ปุ่ม/ช่องกรอกสูง **≥ 44 px** (`.s-btn`, tabs, timeline ของ techstory)
- มือถือ: คำอธิบายขั้นในฉาก 3 มิติย่อ 3 บรรทัด แตะเพื่ออ่านต่อ (ไม่บังภาพ) · เมนูหัวข้อแบบแถบ (`mountMobileMenu`) · ปุ่มใบเสนอราคาลอย
- `safe-area-inset-bottom` สำหรับ iPhone · `scroll-padding-top: 70px` ให้หัวข้อไม่จมใต้ header

### 5.4 กฎ UX / Accessibility (WCAG 2.2 AA)

- contrast ≥ 4.5:1 ทุกตัวอักษร (ink-3 ถูกปรับใน Rev.07.1 แล้ว — ห้ามทำให้จางลง) · สถานะห้ามบอกด้วยความจาง (opacity) อย่างเดียว ใช้สี/เส้นประ
- หัวข้อไม่ข้ามระดับ h2 → h3 → h4 · มี `<main>` เดียว · ฉาก 3 มิติ `aria-hidden` บน canvas แต่มีข้อความทางเลือกครบ (อ่านขั้นตอนได้แม้ไม่มี WebGL)
- `prefers-reduced-motion`: ไม่หมุน/ไม่เล่นอัตโนมัติ ภาพนิ่งแทน, ไม่มี smooth scroll
- **เลิกใช้** เอฟเฟกต์ลอยขึ้นทีละหัวข้อ · ไม่มี "→" ท้ายปุ่ม · ป้ายควบคุมเป็นภาษาไทยที่ลูกค้าเข้าใจ (ไม่ใช้ภาษาอังกฤษตัวพิมพ์ใหญ่)
- การเคลื่อนไหวเก็บไว้ที่ภาพ 3 มิติที่มีความหมายเท่านั้น · ★Rev.28 micro-interaction ใช้ token ใน `shared.css` (`--m-ease`, `--m-spring`, `--e-1..3`) เท่านั้น — ห้ามตั้ง easing/เงาเองต่อจุด

### 5.5 กฎภาพ 3 มิติ

- ทุกฉากจำลองต้องมีข้อความกำกับ **"แบบจำลองเพื่ออธิบาย"** — ห้ามสื่อว่าเป็นผลวัดจริงหรือรับประกันประหยัดไฟ
- ป้ายชิ้นส่วน: 2 คอลัมน์ซ้าย–ขวา **ไม่ทับกัน** มีเส้นชี้ ซ่อนเมื่อผนังบัง (`createLabels`)
- งานติดตั้งต้อง **เรียบร้อยแบบงานจริง**: ท่ออยู่ในรางครอบท่อปิดฝาตลอดแนว ไม่มีท่อเปลือย, ข้อต่อจริง (ข้องอแบน 90°, ข้องอฉาก, 45°, ฝาครอบผนัง, ฝาปิดปลาย), คอยล์ร้อนหันตรงแนวผนัง
- สีวัสดุ: ทองแดง O-TWO (หนา 0.70 มม.) · ฉนวน Aeroflex ดำพิมพ์ชื่อ · **ท่อน้ำทิ้ง PVC สีฟ้า** (SCG) · ราง Airpro ขาว · สาย THW น้ำตาล(L)/ฟ้า(N)/เขียวแถบเหลือง(G) · RCBO NANO
- ช่าง: เสื้อน้ำเงิน `0x1f4f8a` หมวกส้ม `0xe2711d` · ห้ามช่างบังจุดที่อธิบาย (ใช้ `ghost`)
- ลม: เส้นอนุภาคไหลตามทิศบานสวิง เย็น=ฟ้า อุ่น=ส้ม (`tempColor`) · เส้นทางในแบบ B: ลมอุ่น, ลมเย็น, น้ำยาเหลว (ท่อเล็ก), ไอน้ำยา (ท่อใหญ่), น้ำทิ้ง, ไฟฟ้า
- ★Rev.09 r3 (เจ้าของ: "ลมต้องเป็นธรรมชาติ ไม่ใช่เหมือนสาดน้ำ"): **ภาพลมทุกจุดวาดผ่าน `wisp3d.js`** — เส้นลมโปร่ง บาง เรียวท้าย สีจาง ไหลช้า (timeScale 0.6) กระจายและโค้งตามความปั่นป่วน · ห้ามกลับไปใช้จุด/ขีดสีน้ำเงินเข้ม · **น้ำ** (ฉีดล้าง น้ำทิ้ง) ใช้หยดน้ำ (Points) ให้ต่างจากลมชัดเจน · ความปั่นป่วนของลมทำตอนวาดเท่านั้น (ฟิสิกส์/ระยะลมใน throwsim ต้องเท่าเดิม: ติดผนัง ~7.5 · สี่ทิศทาง ~4.5 · แขวน ~11.5 ม. ที่ 16 วินาที)
- **ห้ามปั้นเลียนแบบดีไซน์/โลโก้ของผู้ผลิตแอร์ (Daikin, Carrier ฯลฯ) หรือแบรนด์วัสดุ** — ใช้ตัวเครื่องกลาง ๆ และชื่อยี่ห้อเป็นตัวอักษร

---

## 6. Specific Rules & Coding Standards

### 6.1 สไตล์โค้ด

- **ES modules ล้วน** (`import … from './x.js'` ต้องมีนามสกุล `.js`), ES2022, ไม่มี transpile ตอน dev
- 2 spaces · single quotes · มี semicolon · arrow functions · โค้ดค่อนข้างแน่น (one-liner) — **รักษาสไตล์เดิมของไฟล์** อย่า reformat ทั้งไฟล์ (diff จะอ่านไม่ออก)
- คอมเมนต์ภาษาอังกฤษ · ข้อความที่ผู้ใช้เห็นเป็นภาษาไทย · หัวไฟล์มีคอมเมนต์บอกหน้าที่ + แท็ก revision (เช่น `— Rev.08`) และคำตัดสินเจ้าของที่เกี่ยวข้อง
- DOM สร้างด้วย `h(tag, attrs, ...children)` จาก `sbp-core.js` (ไม่ใช้ innerHTML กับข้อมูลผู้ใช้) · `$(sel, root)` / `$$(sel, root)`

### 6.2 การตั้งชื่อ

| รูปแบบ | ใช้กับ | คืนค่า |
|---|---|---|
| `mountX(root, cfg)` | โมดูล UI ที่สร้าง markup ใน root | object ควบคุม (`setType`, `open`, `highlight` …) |
| `createX(container, opts)` | engine 3 มิติ / renderer | `{ …controls, advance?, dispose() }` |
| `buildX(…)` | สร้าง geometry/กลุ่ม THREE | `THREE.Group` หรือ object ของชิ้นส่วน |
| `UPPER_CASE` | ค่าคงที่/ตารางข้อมูล (`TYPES, STEPS, CAMS, BASE, CHIPS, SPOTS, TRAVEL, ZONES`) | |
| ย่อสั้นในขอบเขตแคบ | `V` (Vector3), `S` (pool lookup), `M`/`K`/`MK` (ชุดวัสดุ), `RM` (reduced motion) | |
| CSS class prefix | `s-` shared commerce · `st-` studio · `sv-` services · `hw-` how-it-works · `ts-` techstory · `sy3-` system3d · `mt3-` materials · `hl` ป้าย 3 มิติ · `tm-` แผนที่ · ★Rev.29 `lx-` เว็บชุด 2 · `cn-` ภาพยนตร์ D · `at-` Atelier E · `sp-` Spatial F (⚠️ `.sp` ในแผ่นตัวกรองมือถือเป็นของแคตตาล็อก) | |
| id ของ type | `wall`, `ceiling`, `cassette`, `floor`, `duct` (ห้ามเปลี่ยน — ผูกกับข้อมูลและ Pricebook) | |

### 6.3 State management

- ไม่มี framework/store — state อยู่ใน closure ของแต่ละ `mountX`
- **cart** = singleton ใน `commerce.js` + `subs: Set` (callback เมื่อ `save()`) + `localStorage['sbp-quote-v2']` (ครอบ try/catch เสมอ ห้ามพึ่ง storage)
- หน้าทดสอบ: `localStorage['sbp-preview-v1']` · ★r5 เส้นทางลูกค้า: `localStorage['sbp-journey-v1']` (`{k, done}`)
- ฉาก 3 มิติ: object สถานะ (`st`, `T`) ค่อย ๆ lerp เข้าหาเป้าหมายทุกเฟรม — `go(i)` แค่ตั้งเป้า
- Global ที่อนุญาต: `globalThis.__SBP_DATA`, `__SBP_TH`, `__SBP_LOGOS` (ฝังโดย build), `SBP_HUB`, `window.SBP_URLS` · หน้าทดสอบใช้ `window.TS`, `window.READY` · **ห้ามเพิ่ม global อื่น** (เคยลบ `globalThis.__air` ออกแล้ว)

### 6.4 ข้อกำหนดของ build (ถ้าไม่ทำตาม `build.py` จะพัง)

- แต่ละ `a/b/c.html` มี `<script type="module">` **ตัวเดียว** (build.py assert) — ใส่ wiring ทั้งหมดในนั้น
- stylesheet ต้องเขียนแบบ `<link rel="stylesheet" href="assets/ชื่อ.css">` ตรงตัว (regex) · ฟอนต์อ้าง `url(fonts/….woff2)`
- ข้อมูลโหลดผ่าน `loadData()` (รองรับทั้ง fetch และ `__SBP_DATA`) — ถ้าเพิ่มไฟล์ข้อมูลใหม่ที่ fetch ต้องเพิ่มการฝังใน build.py ด้วย
- lazy `import('./x.js')` ใช้ได้ (esbuild รวมให้) · ลิงก์ระหว่างหน้าใช้ `./a.html`, `./b.html`, `./c.html`, `./` (build แปลงให้)

### 6.5 กติกา 3 มิติ

- boot แบบ lazy ด้วย `IntersectionObserver` · pause render เมื่อออกนอกจอ · `setPixelRatio(min(2, dpr))` · มี `dispose()` คืน GPU memory
- ต้องมี fallback เมื่อสร้าง WebGL ไม่ได้ (ข้อความ/ภาพนิ่ง ยังอ่านเนื้อหาได้ครบ)
- เคารพ `prefers-reduced-motion` ทุกฉาก
- ★Rev.26.1 ฉากใหม่ต้องบูตผ่าน `whenQuiet`/`quiet()` หรือ `deferred` (lazy.js) และลงทะเบียน `gl-pool.track` (ได้ compile แบบ async + fade-in + ปิด shader-log อัตโนมัติ) · ภาพที่สลับเข้าทีหลังต้อง `decode()` ก่อน และกล่องรอต้องสูงเท่าของจริง (ไม่ให้หน้ากระโดด) · ตรวจด้วย `npm run jank` / `npm run inp`
- งบ WebGL context: **≤ 3 live ต่อหน้า** — ★Rev.09 คุมโดย `gl-pool.js`: ทุก `new WebGLRenderer` ต้องเรียก `track(renderer, el, {scene, redraw})` (ฉากใหม่ต้องลงทะเบียนเสมอ) · ฉากไกลจอถูก `loseContext()` แล้ว restore เมื่อกลับมา (state เดิมไม่หาย) · smoke รายงาน `webglPeak`
- ห้ามแก้ไฟล์ three.js ที่ vendored (r170) · ถ้าจะอัปเกรด three ต้องทดสอบทุกฉาก

### 6.6 ⛔ กฎธุรกิจที่ห้ามแก้โดยไม่มีคำอนุมัติเป็นลายลักษณ์อักษรจากเจ้าของ

| # | กฎ | อยู่ที่ |
|---|---|---|
| 1 | ราคาต้นทางเป็น **ก่อน VAT** · ★Rev.16 (เจ้าของ 2 ต.ค. 2569) **ทุกราคาบนเว็บแสดงก่อน VAT และระบุ "ก่อน VAT" เสมอ** · VAT 7% คิดครั้งเดียวที่ยอดรวมใบเสนอราคา (ก่อน VAT · VAT · รวมทั้งสิ้น) · `incVat = Math.round(n × 1.07)` ใช้เฉพาะยอดรวม | `sbp-core.js` |
| 1a | ★Rev.16 **ราคางานบริการปัดขึ้นเป็นหลักร้อย** (`up100` ตอนโหลด: ล้าง · ซ่อม · บริการติดตั้ง `INS-*`) — ไฟล์ Pricebook ไม่แก้ (recon เทียบไฟล์ 1:1) · วัสดุต่อเมตร/ชิ้นใช้ราคาจริงไม่ปัด | `loadData` |
| 2 | **ห้ามแก้ราคา/อัตราใด ๆ ใน `sbp-data.json`** โดยไม่มีคำยืนยันจากเจ้าของ — หลังแก้ต้องรัน `tools_recon.py` ได้ 0 ผิด (ชุดราคาใหม่ SBP-PRC-001 **ยังไม่อนุมัติให้ขึ้นเว็บ**) | ข้อมูล |
| 3 | เว็บแสดง **อัตรามาตรฐานเท่านั้น** — `sp`/`pj` (พิเศษ/โครงการ) ต้องเป็น `null` ในไฟล์ที่ส่งถึง browser ตั้งแต่ 10 เครื่องขึ้นแสดง "อาจได้อัตราพิเศษตามเงื่อนไข ทีมขายยืนยันในใบเสนอราคา" | `sbp-data.json`, `VOLUME_HINT` |
| 4 | ห้ามมีต้นทุนภายใน, กำไร, % ส่วนลด, รายชื่อลูกค้า, เงินเดือน ในโค้ดหรือข้อมูลฝั่ง browser | ทั้ง repo |
| 5 | รุ่นที่ขึ้นเว็บ = **อนุมัติแล้วเท่านั้น (705)** · 9 รุ่นราคาอ้างอิงตลาดห้ามขึ้น | data |
| 6 | ติดตั้งบนเว็บมี **มาตรฐาน / พรีเมียม** เท่านั้น (ระดับพื้นฐาน `-MASS` ไม่ขึ้นเว็บ) | `loadData` filter |
| 7 | ทองแดงบนเว็บ = **O-TWO หนา 0.70 มม.** เท่านั้น · แปลง "K Copper" → "O-TWO" · ซ่อน `MAT-CU-L-*` และคำว่า "Type L" ทุกที่ (Type L อยู่ใน Pricebook สำหรับ QTN/BOQ) | `brand()` ใน `loadData` |
| 8 | ยอดขั้นต่ำ **4,500 บาทก่อน VAT ใช้กับงานล้างเท่านั้น** · ★Rev.20 (เจ้าของ 3 ต.ค. 2569: "มีข้อจำกัดต่อ 1 งาน หากไม่ถึงมีค่าเดินทาง") งานล้างที่ยอดต่ำกว่าขั้นต่ำ **คิดค่าเดินทาง `TRAVEL.baseFee` (300) ต่อการเข้างาน แทนการเติมยอดขั้นต่ำ** | `minBill`, `jobTravel` |
| 9 | ★Rev.20 (เจ้าของ 3 ต.ค. 2569: "รับระยะ 1–30 กม. เฉพาะในกรุงเทพ … ถ้าระยะเกินกว่านั้นบวกตามระยะทาง") **พื้นที่หลัก = ที่อยู่ในกรุงเทพฯ และระยะถนน ≤ 30 กม.** ไม่มีค่าเดินทาง (เมื่อถึงขั้นต่ำงานล้าง) · นอกพื้นที่หลัก ≤ 150 กม. = **300 + 10 บาท/กม. ที่เกิน 30 กม. ต่อเที่ยว ปัดขึ้นหลักร้อย** (ไม่มีการยกเว้นตามจำนวนเครื่อง) · > 150 กม. งานโครงการ · ระยะ = เส้นตรงจากจุดแขวง/ตำบล (หรือที่ว่าการเขต/อำเภอ) × 1.35 · ★Rev.27 ตัวเลข 300 / 10 **ยืนยันใช้** (เจ้าของ 5 ต.ค. 2569 มอบให้ตัดสินจากราคากลาง: ค่ารถข้ามพื้นที่ 300–1,000 · ต่างจังหวัด 10–20 บาท/กม.) | `TRAVEL`, `zoneOf`, `travelFee` |
| 10 | รับประกันงานติดตั้ง: **3 ปี** เมื่อซื้อเครื่องใหม่จากบริษัท / **1 ปี** เมื่อลูกค้าจัดหาเครื่องเอง (ตาม QTN) | ข้อความ |
| 11 | **คำต้องห้าม:** แก้หายแน่นอน · ไม่มีปัญหาอีกแน่นอน · ประหยัดไฟแน่นอน · ปลอดเชื้อ · สะอาด 100% · รับประกันเย็น · ล้างใหญ่ครบทุกจุด · ไม่มีค่าใช้จ่ายเพิ่มเติมทุกกรณี · อะไหล่เสียแน่นอน · เสร็จตามเวลาแน่นอน | `tests/textscan.mjs` |
| 12 | ค่าที่วัดในขั้นตอนช่าง = **ตัวอย่างการบันทึก** ไม่ใช่เกณฑ์ผ่าน/ไม่ผ่าน (งานจริงใช้ค่าตามคู่มือผู้ผลิตของรุ่น) · ห้ามเดาค่าแรงดัน/ขนาดท่อ/ขนาดสายไฟ/เบรกเกอร์ | `CHIPS` |
| 13 | ขั้นตอนช่างต้องตรงแบบฟอร์มบริษัท: ล้าง **SBP-SR-ACCL-UNI-001 Rev.07** (P1 Basic = T1 · P2 Standard Care = T2 + ภาพ + เกรด A–D · C2 ปลดเครื่องลดระดับ **ไม่ตัดท่อ** + ทะเบียนชิ้นส่วนบังคับ · รอบถัดไป 3/4/6/12 เดือน · ลงนาม 3 ฝ่าย) · ติดตั้ง **SBP-SR-ACIN-UNI-001 Rev.04** (Leak test, Vacuum micron/inHg + hold, ค่าหลังติดตั้ง, punch list) · ซ่อม: **ไม่ซ่อมก่อนลูกค้าอนุมัติ** | `techstory.js`, `services.js` |
| 14 | โลโก้: ไม่ดาวน์โหลด/ไม่วาดเลียนแบบ · ใช้ไฟล์ทางการ + หนังสืออนุญาตเท่านั้น | `assets/logos/` |
| 15 | ยังไม่มีหน้าผลงาน/โลโก้ลูกค้า/รีวิว ในเฟสนี้ | — |
| 16 | ★Rev.09 (1 ต.ค. 2569) ล้างและติดตั้งบนเว็บครอบคลุมทุกประเภท **ยกเว้น VRV / VRF = ติดต่อแยก** — รายการ VRV/VRF ห้ามเข้าตะกร้า ใช้ปุ่ม "ติดต่อสอบถาม" (`isVRF`, `askTeam`) | `sbp-core.js`, `commerce.js` |
| 18 | ★Rev.09 r3→r4 ขั้นตอนในส่วน "ทีมช่าง ล้าง / ติดตั้ง" (`jobguide.js`) **ต้องมาจาก `services.cleanSteps` เท่านั้น** (แหล่งเดียวกับแบบฟอร์ม) — แก้ข้อความขั้นตอนที่ services.js · ภาพ 3 มิติผูกด้วย `id` ของขั้น · ความสกปรกเป็นภาพประกอบเสมอ | `services.js`, `cleanguide*.js` |
| 19 | ★Rev.09 r3 ผลตรวจจัดห้อง (`roomplan.layoutChecks`: ของบังทางลม ลมเป่าศีรษะ/ที่นั่ง ทับหน้าต่าง/ประตู) เป็น **คำแนะนำทั่วไปเพื่อความสบาย** ไม่ใช่ข้อกำหนดผู้ผลิต | `roomplan.js` |
| 17 | ★Rev.09 ค่าระยะติดตั้ง/ระยะลมในห้องจำลองติดตั้ง (`FIT_RULES`) เป็น **ค่าแนะนำทั่วไป** ต้องมีข้อความกำกับเสมอ ไม่ใช่ค่าจากผู้ผลิต — ห้ามเขียนว่าผ่าน/ไม่ผ่านตามมาตรฐานผู้ผลิต | `roomfit.js` |
| 20 | ★Rev.09 r4 ตราบริษัทในภาพ 3 มิติ: **FUJIVA / SBP AirCare / บริษัท สหบูรพากรุ๊ป จำกัด อยู่บนของของทีมช่างเท่านั้น** (เสื่อยาง ป้ายเสื้อ กล่องเครื่องมือ ถุงล้าง ป้ายกำลังให้บริการ แท็บเล็ต รีโมตจำลอง) ขนาดเล็กแบบไม่ชวนขาย · **ห้ามใส่ยี่ห้อใด ๆ บนตัวแอร์ของลูกค้า** ในฉากงานช่าง (`buildPremiumIndoor({logo:false})`, `buildOutdoor(M, {logo:false})`) | `brand3d.js`, `jobscene3d.js` |
| 22 | ★Rev.12 งานนอกเวลาทำการ (ก่อน 08:30 / หลัง 17:30 / วันอาทิตย์) **มีค่าใช้จ่ายเพิ่มเติม — ห้ามใส่จำนวนเงินเอง** จนกว่าเจ้าของกำหนด · เวลาต่องาน (`JOB_TIME`) เป็นค่าประมาณเท่านั้น ต้องมี `TIME_NOTE` กำกับ | `sbp-core.js COMPANY`, `jobguide.js` |
| 23 | ★Rev.15 (เจ้าของ 2 ต.ค. 2569) **คิวจอง:** จองปกติล่วงหน้า **3 วัน** · เร็วกว่านั้น (รวมวันนี้) = **คิวด่วน +500 บาทก่อน VAT ต่อการเข้างาน** และ **ต้องมีคิวว่าง** — ทีมยืนยันก่อนทุกครั้ง ไม่มีคิว = ไม่เก็บค่าคิวด่วน · เว็บห้ามแสดงว่า "ว่าง" เองถ้าไม่ได้อ่านจากตารางคิวจริง (`QUEUE_URL`) · ค่าคิวด่วนไม่นับรวมยอดขั้นต่ำงานล้าง | `sbp-core.js QUEUE_RULES`, `queue.js` |
| 24 | ★Rev.16 **ใบจองงาน:** ขอบเขตงานนอกมาตรฐานคำนวณจากคำตอบลูกค้า → รายการใน Pricebook (มีราคา = ประมาณการก่อน VAT · ไม่มีราคา = "ประเมินจากรูป") · ข้อความสัญญา: ทีมแจ้งราคาส่วนเพิ่มให้อนุมัติก่อนยืนยันคิว / หน้างานไม่เพิ่มรายการโดยไม่แจ้ง — ห้ามเขียนว่า "ไม่มีค่าใช้จ่ายเพิ่มเติมทุกกรณี" · รูปไม่เก็บใน localStorage · ไม่มี backend = บอกลูกค้าตรง ๆ ให้ส่งรูปทาง LINE | `ticket.js`, `commerce.js` |
| 25 | ★Rev.24.1 (เจ้าของ 3 ต.ค. 2569: "ตารางมูลค่าหาได้จากราคามาตรฐานที่ HomePro หรือเว็บขายแอร์ออนไลน์รับเทิร์น ทุกอย่างและใช้ได้เลย") **มูลค่าเทิร์นแอร์เก่า = `tradein.TRADE_IN.table`** ราคารับซื้อ/รับเทิร์นตลาดกรุงเทพฯ ปี 2569 เป็นช่วงบาทต่อเครื่อง ตามขนาด × ใช้งานได้/เสีย (≤12k 900–1,300 / 300–700 · 12,001–24k 1,400–2,200 / 500–1,200 · >24k 2,400–3,500 / 800–1,800) · หักจากใบเสนอราคาเครื่องใหม่พร้อมติดตั้ง ไม่จ่ายเงินสด · ยืนยันเมื่อทีมตรวจเครื่อง · เงื่อนไข `TRADE_IN.terms` (≥9,000 BTU · คอยล์เย็น+ร้อนครบพร้อมหน้ากาก · ทุกยี่ห้อ ใช้ได้หรือเสีย · ทีมเก็บน้ำยาและรื้อเอง) · เป็นบาทต่อเครื่องเท่านั้น ห้ามเป็น % · ไม่ระบุชื่อร้านค้าปลีกบนเว็บ · ★Rev.27 ค่ารื้อ (รวมเก็บน้ำยา) + ขนเครื่องเดิมออก ใช้อัตรามาตรฐานตามข้อ 26 รวมในยอดก่อนหักมูลค่าเทิร์น | `tradein.js` |
| 26 | ★Rev.27 (เจ้าของ 5 ต.ค. 2569: "ผมให้คุณตัดสินใจเลยโดยอ้างอิงข้อมูลราคากลางได้และใช้เป็นเรทนั้น ๆ แต่ละงาน") **อัตรามาตรฐานของรายการ Pricebook ที่เคยไม่มีราคา = `rates.js` `DECIDED`** (ก่อน VAT · หลักร้อย · บาทคงที่): รื้อติดผนัง 1,000 · แขวน/ตั้งพื้น 1,800 · สี่ทิศทาง 2,500 · ตู้ตั้งพื้น 2,000 (รวมเก็บน้ำยา) · เก็บน้ำยาอย่างเดียว 500 · ขนเครื่องเดิมออก 500/เครื่อง · เติมน้ำยา R22 3,000 / R32 2,100 / R410A 2,100 ต่อ kg · Vacuum 2,400 · ตรวจรั่วไนโตรเจน 2,200 · Phase Protector 2,800 · Core drill 600/จุด · **ย้ายแอร์ = ค่ารื้อ + ราคาติดตั้งมาตรฐานตามขนาด** (แถว `MOVE-{W,C,K,FS}-{band}` แทน MOVE-W/C/K เดิม) · **ยอดขั้นต่ำงานย่อย `SMALL_VISIT` 1,000 ต่อการเข้างาน** (ไม่มีงานล้าง/ติดตั้ง/ซ่อม/สัญญาในวันเดียวกัน · รายการนับรวม ส่วนที่ขาด = ค่าเข้างาน) · ที่มา: ราคากลางตลาดปี 2569 (m) หรืออัตราของบริษัทเองในตารางซ่อมสำหรับงานเดียวกัน (c) — `RATE_SOURCES` แสดงบนเว็บ · **`sbp-data.json` ไม่แก้** (recon 1:1 กับ Excel) → ฝ่ายขายนำอัตราไปใส่ Excel รอบหน้า · ยังประเมินหน้างาน: รื้อแอร์ซ่อนในฝ้า, REPLACE, คอมเพรสเซอร์/แผงคอยล์/บอร์ด Inverter, VRF/AHU, นั่งร้าน/เครน/Permit, เอกสารโครงการ · **นอกเวลา (ข้อ 22) ไม่เปลี่ยน** | `rates.js`, `sbp-core.loadData`, `commerce.quoteTotals` |
| 21 | ★Rev.09 r4 วิธีทำต่อประเภทเครื่อง (`services.CLEAN_HOW` / `INSTALL_HOW`) และการแบ่งงานช่างหัวหน้า/ผู้ช่วย (`jobguide` WHO_*) เป็นแนวปฏิบัติทั่วไปใต้ขั้นตอนแบบฟอร์ม **รอหัวหน้าช่างตรวจ** — ห้ามเพิ่มคำสัญญา ราคา หรือค่าที่วัดได้ในข้อความเหล่านี้ · ค่าระยะลมแอร์ตู้ตั้ง ~8 ม. ในห้องจำลองเป็นค่าประมาณเพื่ออธิบาย | `services.js`, `jobguide.js`, `throwsim3d.js` |

### 6.7 ขั้นตอนทุกครั้งที่แก้ (Definition of Done)

1. แก้ใน `assets/*` หรือ `a/b/c.html` → ทดสอบบน dev server (หลายไฟล์)
2. `npm run smoke && npm run smoke:mobile && npm run textscan` ต้องผ่าน · ถ้าแตะข้อมูลราคา `npm run recon` ต้อง 0 ผิด
3. ถ้าแก้ฉาก 3 มิติ: ถ่ายภาพจริงตรวจด้วยตา (`tests/story-shots.mjs` หรือหน้า `test-*.html`) ทั้ง desktop และมือถือ, ธีมสว่าง/มืด
4. `npm run build` → เปิด `dist/offline/*.html` ตรวจซ้ำ
5. อัปเดต revision tag ในหัวไฟล์ + บันทึกการเปลี่ยนแปลงใน `SBP-WEB-011_Dev_Handoff_Plan.md`
6. commit ข้อความชัด (เช่น `Rev.09: limit live WebGL contexts to 3 per page`)

---

## 7. Current Status & Pending Bugs

### 7.1 ทำเสร็จล่าสุด (Rev.08 → 08.1, 1 ต.ค. 2569)

- ✅ ห้องบ้านจำลองชุดเดียว (`install3d.js`) ใช้ร่วม B/C — ผนังตัดแบบบ้านตุ๊กตา รางครอบท่อปิดฝาตลอดแนว
- ✅ ช่างทำงาน 4 งาน (`tech3d.js`, `techstory.js`) ตามแบบฟอร์มบริษัท — C1 14 · C2 17 · ติดตั้ง 13 · ซ่อม 10 ขั้น
- ✅ แบบ B ลำดับการทำงาน 3 มิติ 9 ขั้นต่อประเภท (`system3d.js`)
- ✅ วัสดุเหมือนจริง (`matkit3d.js`, `materials3d.js`): O-TWO 0.70 · Aeroflex พิมพ์ชื่อ · PVC ฟ้า · THW 3 สี
- ✅ ขั้นตอนล้างแบบ A ตามหัวข้อแบบฟอร์ม + รายการตรวจ (`services.js`)
- ✅ ตัด "Type L" ออกจากทุกข้อความบนเว็บ (รวมชุดเหมา PIP-PKG-3878) · ช่องโลโก้ทางการ
- ✅ `tools_recon.py` path แบบ relative · เพิ่ม `tests/`, `package.json`, `.gitignore`
- ✅ ผลตรวจ: smoke 0 error ทุกหน้า (1366 + 390) · ไม่มี overflow แนวนอน · textscan สะอาด · recon: สินค้า 705 · ติดตั้ง 173 · ล้าง 234 · ซ่อม 86 → **0 ผิด**
- ✅ Build: a 2,297 KB · b 2,372 KB · c 2,434 KB · หน้าทดสอบ 4,032 KB · เผยแพร่ทั้ง 4 URL แล้ว

### 7.1b ทำเสร็จ Rev.09 (1 ต.ค. 2569 — งานใน Claude Code)

- ✅ **ลองวางแอร์ในห้องของคุณ** (`roomfit.js` + `roomfit3d.js`) ทั้ง 3 แบบ: เลือกรุ่นจาก catalog (หรือ FUJIVA ตัวอย่างตัวเครื่อง) · ห้อง กว้าง × ยาว × สูง · ผนัง/ตำแหน่ง/ความสูง · คอยล์ร้อน → เครื่องตามขนาดสเปก (มี 164 รุ่น ที่เหลือประมาณตามประเภท/BTU และแจ้งบนหน้า), เส้นระยะ, ลมเย็น, แนวท่อผ่านผนัง, ความยาวท่อ + ราคาท่อส่วนเกินจาก Pricebook, ผลตรวจ 5–7 ข้อ, ใส่ใบเสนอราคา/ขอสำรวจ · มุมมอง 3 มิติ / มุมบน / มองตรงผนัง · ใช้งานได้แม้ไม่มี WebGL (ผลตรวจอยู่ใน panel)
- ✅ **ช่องรูปสินค้าทุกรุ่น** (`product-media.js` + `product-media.json` + `assets/products/`) — ยังไม่มีรูป = ภาพเรนเดอร์ 3 มิติของตัวเครื่องกลางตามประเภท (ป้าย "ภาพประกอบ") · build คัดลอกรูปไป `dist/*/products/`
- ✅ **ตัวเครื่อง 3 มิติคมชัดขึ้น**: ตัวเครื่องติดผนังโค้งแบบพรีเมียมเป็นค่าเริ่มต้น (ไม่มีโลโก้ ยกเว้น FUJIVA) · เพิ่มแอร์ตู้ตั้งพื้น `buildFloorUnit`
- ✅ **ศูนย์ความรู้** (`knowledge.js`) 12 หัวข้อ บ้าน/องค์กร พร้อมปุ่ม "ลองเอง" ไปเครื่องมือที่เกี่ยวข้อง
- ✅ **VRV / VRF ติดต่อแยก** ทุกจุด (ศูนย์ราคา, การ์ดบริการ, FAQ, ฟอร์มติดต่อมีหัวข้อ)
- ✅ UX: แถบขั้นตอนลอยเหลือจุดเล็ก (ไม่บังภาพ 3 มิติ) · เมนูแบบ B ไม่ตัดบรรทัด · ภาพแอร์หน้าแรกแบบ C ไม่ทับหัวเรื่อง · ฟอร์มติดต่อมีเรื่อง/รายละเอียด
- ✅ ชุดลิงก์ทดลองพัฒนาแยก (`urls.dev.json`, `npm run build:dev`)
- ✅ **รอบ 2:** B1 แก้แล้ว (`gl-pool.js`, peak ≤ 3) · ลมในภาพ 3 มิติเป็นเส้นมีหาง (`ac3d.makeFlow`, `howitworks3d` SheetFlow/RadialFlow) · ภาพเรนเดอร์สินค้าจัดเฟรมตามสัดส่วน + ตู้ตั้งพื้นมีหน้ากากลม/จอ/ช่องลมกลับชัด + FUJIVA มีภาพตัวเครื่องพร้อมชื่อแบรนด์ · แถบขั้นตอนย้ายไปขอบซ้าย (จอ > 1240px) · มือถือ: ฉาก "ลองวางในห้อง" บูตได้ (เดิมไม่ขึ้นที่จอ ≤1000px เพราะ observer จับ element ที่เป็น `display:contents`), กล้องถอยตามสัดส่วนจอ, ป้ายระยะไม่ล้นกรอบ ซ่อนป้ายรองบนจอเล็ก (ค่าครบใน panel), ปุ่มเลือกเป็นช่องเท่ากัน
- ✅ ผลตรวจรอบ 2: smoke 0 error ทุกหน้า (1366 + 390) · ไม่มี overflow · `webglPeak` A/B/C = 3/3/3 (มือถือ 3/3/2) · textscan สะอาด · recon 0 ผิด
- ✅ **รอบ 3 (คำขอเจ้าของ 1 ต.ค. 2569):**
  - **ขั้นตอนล้าง C1 / C2 แยกเป็นส่วนของตัวเอง** (`#cleanflow` ทุกแบบ, เมนู "ขั้นตอนล้าง") — การ์ดเทียบ C1–C2 (ถอดอะไร ล้างอะไรในเครื่อง ไม่รวมอะไร จำนวนขั้น ราคามาตรฐานต่อเครื่องตามประเภท/ขนาด/แพ็กเกจ + ใส่ใบเสนอราคา) · โต๊ะถอดล้าง 3 มิติทีละขั้น (21 ขั้น C1 / 27 ขั้น C2 สำหรับ Standard Care) · ถาดชิ้นส่วน (อยู่ที่ไหน สะอาดแค่ไหน) · ไทม์ไลน์แยกเฟส ขั้นเฉพาะ C2 เด่นชัด · ลูกศรบนภาพ (มือถือ)
  - **ลมเป็นธรรมชาติ** ทุกฉาก (`wisp3d.js`) — เส้นลมโปร่งเรียวท้าย + ไอเย็นจาง ไหลช้า กระจายตัว แทนจุด/ขีดที่ดูเหมือนสาดน้ำ (ห้องจำลอง ระยะลม ช่างในห้อง ลำดับระบบ แอร์ทำงานอย่างไร ตัวเครื่อง) · ระยะลมที่คำนวณเท่าเดิม
  - **ห้องจำลองติดตั้งแบบ Sims**: ห้องตัวอย่าง 7 แบบ · เฟอร์นิเจอร์ 21 ชิ้น (เตียง ตู้ โซฟา ทีวี โต๊ะทำงาน โต๊ะประชุม ตู้เย็น ชั้นวางสินค้า หน้าต่าง ประตู …) · ลาก/หมุน/ลบในภาพ หรือจากรายการ (คีย์บอร์ดได้) · ลากแอร์ตามผนัง · ลมจริงไหลรอบเฟอร์นิเจอร์ · ผลตรวจเพิ่ม: ของสูงบังทางลม ของใต้เครื่อง ลมเป่าศีรษะขณะนอน/หน้าคนนั่ง ทับหน้าต่าง/ประตู · ของสูงชิดผนังที่ตัดออกจะจางลง · กล้องเห็นทั้งห้อง
  - แก้บั๊กภาพ: ผ้าม่านในห้องระยะลม/ห้องช่าง C เคยนอนตะแคง (กลายเป็นแผงลายขวาง) · ปั๊มสุญญากาศในงานติดตั้ง C เคยตั้งผิดด้าน · เมนู B ตัดหัวท้ายเมื่อยาวเกิน · โลโก้ A ตัดบรรทัด
  - ผลตรวจรอบ 3: smoke 0 error ทุกหน้า (1366 + 390) · ไม่มี overflow · `webglPeak` ≤ 3 · textscan สะอาด · recon 0 ผิด
- ✅ **รอบ 4 (คำขอเจ้าของ 1 ต.ค. 2569):**
  - **ทีมช่างล้าง / ติดตั้ง 3 มิติ** (`jobguide.js` + `jobscene3d.js` + `crew3d.js` แทน cleanguide*): ช่าง 2 คน + ลูกค้า ทำงานเป็นทีมทุกขั้น — ช่างหัวหน้าบนบันไดถอดชิ้นส่วนส่งลงมา ผู้ช่วยรับไปวางโต๊ะ ล้างในอ่าง จับถุงล้าง ล้างคอยล์ร้อน ประกอบกลับส่งขึ้นทีละชิ้น · ติดตั้ง 13 ขั้น (เทปแนว ขายึด/ก้านแขวน/เปิดฝ้า ยกสองคน คอยล์ร้อน ท่อในราง น้ำทิ้ง สายไฟ ไนโตรเจน Vacuum เปิดวาล์ว Test Run เก็บงาน ส่งมอบลงนาม)
  - **4 ประเภท 4 สถานที่**: ติดผนัง = ห้องนอนบ้าน · แขวนใต้ฝ้า = ร้านค้า · สี่ทิศทาง = คาเฟ่ · ตู้ตั้ง = ห้องประชุม/รับรองลูกค้า · เพิ่มวิธีล้างแขวน / สี่ทิศทาง / ตู้ตั้ง (ตู้ตั้งมีชิ้นส่วนภายในถอดได้) · การ์ดเทียบมีราคา Pricebook ทั้งงานล้างและติดตั้ง
  - **ตราบริษัทแบบไม่ชวนขาย**: เสื่อยาง FUJIVA ใต้จุดทำงาน · ป้ายเสื้อ SBP AirCare (อก) + บริษัท สหบูรพากรุ๊ป จำกัด (หลัง) ทั้งในฉากนี้และช่างแบบ C · กล่องเครื่องมือ · ถุงล้าง · ป้ายกำลังให้บริการ (ร้าน/คาเฟ่/สำนักงาน) · แท็บเล็ตรายงาน · ตัวแอร์ไม่มียี่ห้อ
  - **ลมเย็นไปทางไหน: 3 แบบ + สั่งงานได้**: A รีโมตมือถือ (จอ LCD) · B แผงควบคุมห้องติดผนัง (ค่าห้องเฉลี่ย ลมจ่าย ระยะลม คนสบาย) · C แผงสัมผัสกระจก (วงแหวนอุณหภูมิ) — เปิด/ปิด โหมด เย็น/ลดความชื้น/พัดลม/อัตโนมัติ อุณหภูมิ 16–30 ความแรงลม 5 ระดับ บานสวิงขึ้นลง (สวิง/ตำแหน่ง 1–5) สวิงซ้ายขวา · เลือกเครื่องได้ 4 ประเภทในส่วนนี้เอง (เพิ่มตู้ตั้ง) · จอเครื่องในห้องแสดงค่าที่สั่ง · ฟิสิกส์ลมเดิม (`airflow3d` เพิ่ม `louver` / `hswing` ค่าเริ่มต้นเท่าเดิม)
  - รอบ 4.1 (เก็บงาน): ช่างเดินอ้อมกันและอ้อมลูกค้า/บันได/โต๊ะ (`route(a, b, i)` + sidestep ใน crew3d) · ติดตั้งแอร์ตู้ตั้ง: ช่าง 2 คนหิ้วตัวเครื่องเดินไปวางจริง (`carry`) · ลูกค้ายืนกอดอกดูงาน · ลมในฉากช่างจางลง (`createAirflow({alpha})`) · วงแหวนแผงกระจกไม่ใช้ CSS filter
  - ผลตรวจรอบ 4: smoke 0 error ทุกหน้า (1366 + 390) · ไม่มี overflow · `webglPeak` ≤ 3 · textscan สะอาด · recon 0 ผิด
- ✅ **รอบ 5 — เตรียม Beta (คำขอเจ้าของ 2 ต.ค. 2569: "เน้น UX/UI และ feature ให้สมบูรณ์ ใช้งานได้จริง จัดเป็นหมวดหมู่ตาม workflow / customer journey")**
  - **6 หน้าตามการตัดสินใจของลูกค้า** (`site.js`) ทั้ง 3 แบบ: หน้าแรก · ซื้อแอร์ · ล้าง/ติดตั้ง/ซ่อม · สำหรับองค์กร · ความรู้·ลองเอง · ติดต่อเรา (B เรียงองค์กรก่อน + เมนูมีเลข) · ทุกหน้ามีหัวเรื่อง ทางกลับหน้าแรก ปุ่มไปหัวข้อในหน้า และการ์ด "ขั้นต่อไป" ท้ายหน้า · เมนูแท็บเล็ตเป็นแถวที่ 2 ของ header (เดิมหายช่วง 641–1080 px) · มือถือ: แถบล่าง เมนู / ติดต่อ / ใบเสนอราคา
  - **หน้าแรก "วันนี้ต้องการอะไร"**: ล้างแอร์ · ซื้อแอร์ใหม่ + ติดตั้ง · ติดตั้ง/ย้าย · แอร์มีปัญหา · องค์กร/สัญญารายปี · FUJIVA → กดแล้วระบบพาไปทีละขั้น (แถบเส้นทาง + ป้าย "ขั้นที่ n จาก N" ตรงจุดที่ไป + ปุ่มขั้นต่อไป) จำความคืบหน้าไว้
  - **ข้อมูลบริษัท** (`COMPANY` ใน sbp-core.js — แหล่งเดียว): ชื่อไทย/อังกฤษ ที่อยู่ 593 ถ.พระราม 2 โทร 02-459-3291-9 อีเมล Sahaburapa.official@gmail.com เว็บ www.sahaburapa.com · ที่มา: เว็บบริษัท/รายชื่อธุรกิจสาธารณะ (เปิด sahaburapa.com จากเครื่องพัฒนาไม่ได้) — **เจ้าของต้องยืนยัน** · ยังไม่แสดง เลขผู้เสียภาษี / LINE OA / เวลาทำการ จนกว่าเจ้าของส่งข้อมูล
  - **ส่งคำขอแบบซื่อตรง (แก้ B4 ระดับต้นแบบ)**: ฟอร์มติดต่อและใบเสนอราคาไม่บอกว่า "ส่งแล้ว" อีก — แสดงเลขอ้างอิง + สรุปให้คัดลอก/เปิดอีเมล + อีเมล/โทรของบริษัท · ตัด "คิวว่างถัดไป" (A) และ "สถานะทีมวันนี้" (B) ที่เป็นข้อมูลตัวอย่างออก · footer เขียนจาก `COMPANY` (เลิกใช้ "[ใส่เลขจริง]")
  - **แบบฟอร์มความเห็น Beta** (ปุ่ม "ให้ความเห็น" แถบบนและ footer): ใช้ง่าย 1–5 · หาเจอไหม · ส่วนที่ชอบ · ควรปรับ · ติดต่อกลับ → สรุปให้ส่งอีเมล (ระบุแบบ A/B/C และหน้าที่เปิดดู)
  - เครื่องมือทดสอบ: `smoke.mjs` / `textscan.mjs` ไล่ทุกหน้า (view) ของแต่ละแบบ (เดิมเห็นเฉพาะหน้าแรกหลังแบ่งหน้า) · หน้าทดสอบ A/B/C (`preview.html`) เพิ่มรายการทดลอง: เริ่มจากสิ่งที่ต้องการ · ทีมช่าง · ลองวางในห้อง · คัดลอกสรุปใบเสนอราคา · ส่งความเห็น และกระโดดไปหัวข้อในหน้าย่อยได้
  - แก้ระหว่างทาง: แคตตาล็อกเคยเขียน `#catalog` ลง URL ตั้งแต่โหลดหน้า (ตอนนี้เขียนเฉพาะหลังลูกค้ากรอง และเมื่อแคตตาล็อกแสดงอยู่) · แถบล่างมือถือเหลือ 3 ปุ่ม เมนู / ติดต่อ / ใบเสนอราคา (ปุ่ม LINE กลับมาเมื่อมีบัญชี LINE OA)

### 7.1c ทำเสร็จ Rev.10 (2 ต.ค. 2569 — คำสั่งเจ้าของ: "repo พร้อมให้คนอื่นดูและเทส · ข้อมูลบริษัทหาจากเว็บได้ · เว็บพร้อมใช้งานบนคอม/แท็บเล็ต/มือถือ")

- ✅ **ซอร์สขึ้น GitHub** `sahaburapaofficial-cmyk/Sahaburapa-project` (Public ตามคำสั่ง) + **GitHub Pages** build อัตโนมัติ (`.github/workflows/sbp-aircare-pages.yml` → `dist/offline/`) · ผู้ดูแล repo ต้องตั้ง Settings → Pages → Source = GitHub Actions ครั้งเดียว
- ✅ **ข้อมูลบริษัท** (`COMPANY`) ตรวจจากเว็บทางการ sahaburapagroup.com + ทะเบียนนิติบุคคล: LINE OA `@sahaservices` (ปุ่ม LINE กลับมาในแถบล่างมือถือ + กล่องสรุปคำขอ) · Facebook · เลขผู้เสียภาษี 0105553009307 · เว็บบริษัท = www.sahaburapagroup.com (**www.sahaburapa.com ไม่ใช่ของบริษัทแล้ว — เป็นเว็บพนัน ห้ามลิงก์**) · "พระราม 2 ซอย 31" → "593 ถ.พระราม 2" (พิกัด HQ เดิม) · เวลาทำการยังไม่มี (`hours: ''` = ไม่แสดง)
- ✅ **ส่งคำขอถึงทีม** (`assets/submit.js`): ฟอร์มติดต่อ · ใบเสนอราคา · ความเห็น → POST (text/plain, ไม่มี preflight) ไป Google Apps Script (`backend/apps-script/Code.gs`) → แถวใน Google Sheet แยกแท็บ + อีเมลแจ้งทีม · `ENDPOINT` ว่าง / อยู่ใน Artifacts / ส่งไม่สำเร็จ → กล่องสรุปแบบเดิม (บอกตรง ๆ ว่ายังไม่ถึงทีม) · ทุกฟอร์มมีข้อความวัตถุประสงค์ข้อมูล (PDPA) + honeypot · สคริปต์จำกัด 30 คำขอ/นาที กันสูตรใน Sheet · ยอดเงิน = "ยอดประมาณการ" · ไม่เพิ่ม global (endpoint เป็นค่าคงที่ในโมดูล)
- ✅ เทสต์ใหม่ `npm run submit` (`tests/submit.mjs`): 3 ฟอร์ม × 3 โหมด (ส่งสำเร็จ / ล้มเหลว / ไม่ตั้งค่า) ด้วย endpoint จำลอง — ผ่านทั้ง A/B/C
- ✅ `PROPOSAL_Rev10.md`: ทางเลือกระบบรับคำขอ + ต้นทุน/ความเสี่ยง · เช็กลิสต์มือถือจริง 16 ข้อ · วิธีลดภาระ 3 มิติ 9 ข้อ · แนวทางพัฒนา (งานล้างเป็นหลัก, B2C/B2B, ภาพสมจริง/"4 มิติ") · สิ่งที่ต้องการจากเจ้าของ

### 7.1d ทำเสร็จ Rev.11 (2 ต.ค. 2569 — "สวยขึ้น ดีขึ้น ลื่นขึ้น พัฒนาอย่างเดียว")

- ✅ **ความเร็ว:** `assets/lazy.js` (`whenNear`, `deferred`) — `mountViewer` / `mountThaiMap` คืนตัวแทนทันที แล้วสร้างฉากจริงเมื่อ section ใกล้จอ (หน้าที่ซ่อนไม่สร้าง WebGL; คำสั่งก่อนบูตถูกจำแล้วเล่นซ้ำ) · `product-media.productShot(key)` เรนเดอร์ทีละภาพเมื่อการ์ดใกล้จอ + cache `localStorage['sbp-shots-r11']` + คืน GL context เมื่อว่าง · `build.py` สร้าง `dist/site/` (code splitting, `js/data-*.js`, CSS/ฟอนต์เป็นไฟล์) ให้ GitHub Pages · ผล (มือถือจำลอง 4G + CPU 4×, swiftshader): DCL 17–26 วิ → 4.8–5.5 วิ
- ✅ **จองล้างแอร์ 3 ขั้น** `assets/quickclean.js` (`mountQuickClean`, `cleanFrom`) ใน section `#book` ทั้ง 3 แบบ + หัวเรื่องหน้าแรกเน้นงานล้าง · ราคาใช้ `cleanRate` (อัตรามาตรฐาน) และ `commerce.quoteTotals` (แยกจาก `cart.totals` เป็นฟังก์ชันล้วน — กฎ VAT/ขั้นต่ำ/ค่าเดินทางที่เดียว) · รายการที่ใส่จาก quick booking มี `src: 'qc'` และกดซ้ำจะแทนที่ ไม่ซ้อน
- ✅ ภาษาลูกค้าสำหรับแพ็กเกจ (`PKG_INFO.th`, `jobguide PKGS`, `quickclean PKG_TH`) · ปุ่ม "แชท LINE" (`site.js`, สีเขียวเข้ม #04803A ให้ contrast 5:1) · `contact.lineLink(text)` เปิดแชต OA พร้อมข้อความ · meta/OG/canonical + `assets/og/` + schema.org HVACBusiness (`site.js` จาก `COMPANY`) + sitemap
- ✅ เทสต์ `tests/quickclean.mjs` (`npm run booking`) · `npm run smoke:site` · `tools/og-image.mjs` (`npm run og`)

### 7.1e ทำเสร็จ Rev.12 (2 ต.ค. 2569 — "ทำ 4 มิติ และปรับภาพ 3 มิติให้สมจริงขึ้น")

- ✅ **4D แบบเลื่อนจอ** ใน `jobguide.js` (`set4D(on)`, `renderRuler`, `onScroll4`; CSS `.cg-4d*`, `.cg-scroll`, `.cg-t*` ใน shared.css): ฉาก sticky ใต้ header (`--cg-top` 74 / 62 px ที่ ≤640) · ความสูงเลื่อน = จำนวนขั้น × `stepPx()` · แถบเวลาแบ่งตามเฟส · ไม่มีเวลาเป็นนาที (รอข้อมูลหัวหน้าช่าง)
- ✅ **โลโก้ทางการ (เจ้าของส่ง 2 ต.ค. 2569):** `assets/logos/sbp.png` = ตรา SP ของบริษัท สหบูรพากรุ๊ป จำกัด · `fujiva.png` = แบรนด์แอร์ของบริษัท · `fujiva-light.png` = ตัวอักษรขาวสำหรับพื้นเข้ม (ทำจากไฟล์ที่ส่งมา: ตัดพื้นขาวเป็นโปร่งใส) — ใช้ที่ header A/B/C (`img[data-logo]` เติม src ใน site.js), เกี่ยวกับเรา, footer, schema.org ไม่ใส่ (data URI) · ในภาพ 3 มิติ (`brand3d.js`): เสื่อ · ป้ายเสื้อ · กล่องเครื่องมือ · ถุงล้าง · แท็บเล็ต · ป้ายร้าน (ตรา SP บนแผ่นขาวข้างคำว่า SBP AirCare) · ป้ายตัวเครื่อง FUJIVA (`fujivaBadge`) · กล่องบรรจุ (`tech3d`) · dev server อ่านจาก `assets/logos/` เอง build ฝังเป็น `__SBP_LOGOS` · `product-media` รอโลโก้โหลดก่อนเรนเดอร์ (`logosReady`) + cache ใหม่ `sbp-shots-r12`
- ✅ แก้ปัญหาเดิม: คอยล์ร้อนทั่วไปเคยติดป้าย FUJIVA ทุกภาพ (รวมภาพการ์ดสินค้ายี่ห้ออื่น) → `buildOutdoor` ใส่ป้ายเฉพาะ `{ logo: true }` (ชุด FUJIVA: ภาพสินค้า FUJIVA, ห้องลองวางเมื่อเลือก FUJIVA, บ้านจำลอง C ที่กล่องเป็น FUJIVA)
- ✅ **เวลาทำการ** `COMPANY.hours` = จันทร์–เสาร์ 08:30–17:30 (หยุดอาทิตย์) + `hoursNote` นอกเวลา/อาทิตย์ให้บริการได้ มีค่าใช้จ่ายเพิ่มเติม (ไม่ระบุจำนวนเงิน — ทีมแจ้งในใบเสนอราคา) + `open` (schema.org openingHoursSpecification) · จองล้างแสดงเวลาทำการ และเตือนเมื่อเลือกวันอาทิตย์
- ✅ **เวลาโดยประมาณต่องาน** `jobguide.JOB_TIME` + `TIME_NOTE` (การ์ดเทียบ + แถบ 4D) จากข้อมูลร้านแอร์ที่ประกาศออนไลน์ — เจ้าของ: "แล้วแต่หน้างานและสภาพเครื่อง ใช้เป็นเกณฑ์ไม่ได้" → แสดงเป็นช่วงเวลาพร้อมข้อความกำกับเสมอ ห้ามใช้เป็นคำสัญญา/เกณฑ์/ฐานราคา · ไม่แบ่งนาทีต่อขั้น
- ✅ `assets/quality3d.js` `enhance(renderer)` → `prepare(scene)` เรียกใน `gl-pool.track` ก่อนทุกเฟรม (ตรวจซ้ำทุก 3 วิ): shadow map 2048 + anisotropy ≤ 8 เฉพาะเครื่องที่ `HQ_WANTED` และไม่ใช่ GPU ซอฟต์แวร์ · ไม่มี pass เพิ่ม · **ห้ามใส่ post-processing (GTAO/SSAO) กลับ** โดยไม่เทียบภาพ: เคยทำให้สีลม (additive) เพี้ยนและฝาข้างตัวเครื่องมืด

### 7.1f ทำเสร็จ Rev.13 (2 ต.ค. 2569 — "พัฒนา UX/UI · 4D 3D automation movement view · ภาพสวยคมชัดเสมือนจริง")

- ✅ **ฉากทีมช่างเล่นเอง** (`jobguide` auto preview): เล่นงานทีละขั้นเมื่อฉากอยู่ในจอ ≥55% และผู้ชมยังไม่แตะส่วนนี้ · หยุดเมื่อออกนอกจอ เล่นต่อเมื่อกลับมา · click / key / change ในส่วนนี้ = ผู้ชมควบคุมเอง (ไม่นับการเลื่อนผ่าน) · ไม่เล่นเองเมื่อ reduced motion หรือโหมด 4D · การเรียก API (`go`, `setJob`, `setLevel`, `setType`, `set4D`) ถือว่าควบคุมเองเช่นกัน (หน้าทดสอบไม่ถูกเล่นแทรก)
- ✅ **มุมกล้องเคลื่อนไหว** (`jobscene3d`): กล้องแกว่งช้า ๆ แบบภาพยนตร์ (เฉพาะคอมที่ `hqFor`) + ลากหมุนมุมมองได้ทุกเครื่อง (มือถือหมุนแนวนอนอย่างเดียว `touch-action: pan-y`) กลับมุมเดิมเองหลัง 2.5 วิ · มุมใกล้หมุนน้อยลง · ตัวเครื่องหน้าแรก (`ac3d`) หมุนโชว์แบบนุ่ม (ชะลอที่ปลาย + ขึ้นลงเล็กน้อย)
- ✅ **คมชัดขึ้น** (`quality3d`): `hqFor(renderer)` · เรนเดอร์ 1.5× pixel ratio (สูงสุด 2) บนคอมที่การ์ดจอจริง แล้วลดกลับเองถ้าเฟรมช้ากว่า ~22 fps ต่อเนื่อง
- ✅ **UX:** แบบ C มือถือ/แท็บเล็ต (≤900px) หัวเรื่อง + ปุ่มจองมาก่อนภาพ 3 มิติ (grid areas) · จุดชิ้นส่วนเป็นหมุดแก้วขาว + วงกระเพื่อม · จองล้าง: บอกว่ายอดขั้นต่ำครอบคลุมอีกกี่เครื่อง + ปุ่ม "+1 เครื่อง" (คำนวณจากราคาที่แสดง) · header A/C พอดีจอ 360–480 px
- ✅ **ตรวจทั้งเว็บ (3 แบบ × 6 หน้า):** ภาพ 3 มิติทุกฉาก 0 error · ระหว่างโหลดฉาก 3 มิติมีแถบวิ่ง + "กำลังเตรียมภาพ 3 มิติ…" (CSS `:has`) แทนกล่องว่าง · แก้เลื่อนแนวนอนบนแท็บเล็ต 600–800 px (aspect-ratio + min-height ทำให้ stage กว้างเกินคอลัมน์ → ทุก stage `width:100%`) · axe-core: ไม่มี serious/critical ทุกหน้า (ขั้นที่ไม่รวมในงานใช้เส้นประแทนความจาง · `aria-pressed` เฉพาะปุ่ม แถวตาราง B ใช้ `data-sel` + `aria-current` · รายการรุ่นใน roomfit เป็นปุ่มในกลุ่ม) · ป้ายในห้องจำลองไม่ล้นขอบบนทับแท็บ

- ✅ **รอบ 13.2 (คำขอเจ้าของ: ค่าไฟทุกประเภท · องศาเฉลี่ย · สัตว์เลี้ยง + PM2.5 · ภาพสินค้าพรีเมียม · สลับประเภทไม่สะดุด · icon ให้ถูกต้องและเป็นองค์กร · ลดการเรียกช่างไปดูหน้างาน):**
  - **แก้บั๊กสลับประเภทแอร์ในฉากทีมช่าง** (`jobscene3d.buildVenue`): บันไดเก็บเป็น `{ L, h, spec }` แต่โค้ดลบตัว object เอง → throw ทุกครั้งที่สลับประเภท ฉากสร้างค้างครึ่งทาง (error 33 ครั้งต่อรอบทดสอบ + ฉากค้าง) → แก้เป็น `l.L` · `jobguide.refresh`: ปุ่ม/การ์ด/ขั้นตอนเปลี่ยนทันที ฉาก 3 มิติสร้างใหม่ในเฟรมถัดไปพร้อมจางสั้น ๆ และกดรัวรวมเป็นการสร้างครั้งเดียว · ทดสอบกดสลับทุกปุ่มประเภท/โหมดของทุกฉาก 3 มิติ 3 แบบ: 0 error
  - **ไอคอนประเภทแอร์** (`proto-ui.typeArt`, `services.typeIcon`): ภาพลายเส้นเทคนิคตามบริบทการติดตั้ง + ทางลมจริง — ติดผนัง / แขวนใต้ฝ้า (ตัวบางกว้างชิดใต้พื้นคอนกรีต ลมพุ่งไกลแนวนอน ลมกลับด้านล่าง) / สี่ทิศทาง (ตัวซ่อนเหนือฝ้า หน้ากากมองจากด้านล่าง ลม 4 ทาง) / ตู้ตั้ง / ท่อลม · ไอคอนหน้าแรกชุดเดียวกัน (กล่องเครื่องใหม่ · ประแจ · เกจวัด · อาคาร) · การ์ด FUJIVA ใช้โลโก้จริง
  - **ห้องจำลอง: ค่าไฟเจาะลึก** (`studio-model.setPointF`, `energy(..., setT)`): ตั้งอุณหภูมิเฉลี่ย 20–30°C (5%/°C รอบ 25°C — แหล่งเผยแพร่ 3–5%/°C, กฟผ. แนะนำ 26–28°C + พัดลม) · ตาราง **ค่าไฟทุกประเภทสำหรับห้องนี้** (จำนวนเครื่องตามกฎเดียวกับคำแนะนำ, Inverter vs Fixed ต่อเดือน/ต่อปี) · แหล่งอัตรา: Ft ก.ย.–ธ.ค. 2569 16.23 สต. (กกพ.) + อัตราบ้านแบบก้าวหน้าใหม่ตั้งแต่บิล ก.ย. 2569 (หน่วย 201–400 = 4.1584, 401+ = 4.3583 + VAT)
  - **สภาพแวดล้อมรอบห้อง** (`PETS`, `LOCS`, `pmF`, `envF`, `clogRisk`): แมว/สุนัข (บ้าน·คอนโด) · ที่ตั้ง (ชานเมือง/เมือง/ติดถนนใหญ่/ใกล้ไซต์ก่อสร้าง·โรงงาน) · ค่า PM2.5 ที่ลูกค้ากรอก (ลิงก์ Air4Thai / GISTDA, มาตรฐาน 24 ชม. 37.5 µg/m³) → ตัวคูณฝุ่น → ความเสี่ยงอุดตัน + รอบล้างแนะนำ + KPI/ค่าไฟทั้งหมด · **ไม่มีค่า PM2.5 รายจังหวัดที่เป็นทางการให้อ้าง → ไม่ใส่ตัวเลขรายจังหวัดเอง** · ตัวคูณเป็นค่าตั้งต้นเพื่ออธิบาย (ต้องปรับจากข้อมูลงานล้างจริงเหมือน `dust` ของห้อง)
  - **ภาพสินค้า** (`product-media`): ไฟแบบสตูดิโอ 3 จุด (key อุ่น · fill เย็น · rim ด้านหลังขับขอบตัวเครื่อง) · 1080×720 · เงานุ่มขึ้น · จัดเฟรมแน่นขึ้น · พื้นหลังแบบฉากถ่ายสินค้า (`.s-ph.render`, สว่างเสมอแม้ธีมมืด) · cache `sbp-shots-r13`
  - **ส่งรูปหน้างานให้ทีมประเมิน** (`assets/survey.js`, `#photo-survey` ใต้ฟอร์มติดต่อทุกแบบ + ลิงก์จาก roomfit): รายการถ่ายภาพ/วิดีโอ/วัดระยะต่องาน (ติดตั้ง·ย้าย / ล้าง / ซ่อม) → เปิดแชต LINE OA พร้อมข้อความ + เลขอ้างอิง · เว็บไม่เก็บรูป · บอกตรง ๆ ว่าถ้าข้อมูลไม่พอทีมจะขอนัดดูหน้างาน · รายการเป็นแนวปฏิบัติทั่วไป (ให้หัวหน้าช่างตรวจเหมือน CLEAN_HOW)

### 7.1g ทำเสร็จ Rev.14 (2 ต.ค. 2569 — "หยิบเล็กหยิบน้อยจากเว็บระดับโลก (ไม่จำเป็นต้องเป็นแอร์) มาเติมให้เป็นเพชรเม็ดงาม · ทำทั้ง A B C แล้วคัดเลือก")

| แรงบันดาลใจ | สิ่งที่นำมา | ไฟล์ |
|---|---|---|
| Linear · Raycast · Vercel | **Command palette** Ctrl/⌘K หรือ `/` (ปุ่ม "ค้นหา" ใน header สำหรับจอสัมผัส): หน้า · หัวข้อ · 136 รุ่นแอร์ (ค้นตาม BTU ได้ — "12000" จับขนาด ±12% และเปิดขนาดนั้น) · คำถามที่พบบ่อย · คำสั่งด่วน (จองล้าง ใบเสนอราคา ส่งรูป LINE โทร) · ARIA combobox/listbox · A การ์ดขาว / B แบบ terminal มุมเหลี่ยม mono / C กระจกเรืองแสง | `palette.js`, `site.js`, shared.css `.cp*` |
| Apple · Chrome | เปลี่ยนหน้าแบบเฟดทั้งหน้า (ไม่ใช่ทีละหัวข้อ — ตามกฎ §5.4) | `site.js show()`, `.sx-enter` |
| Stripe · Medium | เส้นความคืบหน้าการอ่าน 2 px ใต้ header | `site.js`, `.sx-prog` |
| Linear · Vercel | **A:** แสงตามเมาส์บนการ์ด | `fx.js` |
| Teenage Engineering · แบบวิศวกรรม | **B:** crosshair + โซนแบบ (A–C × 1–4) + X/Y บนแบบหน้าแรก | `fx.js` |
| Apple Vision Pro · configurator รถ | **C:** แสงเวทีตามเมาส์ + ขอบการ์ดเรืองแสงตรงจุดเมาส์ | `fx.js` |

- เอฟเฟกต์เมาส์ทำงานเฉพาะ hover + pointer ละเอียด และไม่ทำงานเมื่อ reduced motion · ไม่เล่นเอง · ไม่แทรก DOM ในเนื้อหา (ย้าย overlay ตัวเดียว) · ไม่เปลี่ยน layout (`isolation:isolate` + `z-index:-1`)
- A / C ซ่อนปุ่มสลับ A·B·C ที่จอ ≤480 px เพื่อให้ปุ่มค้นหาพอดี (ยังมีลิงก์ "เทียบแบบ A · B · C" ในแถบทดลองใช้)
- **รอบ 14.1 ตรวจจุดเล็ก:** ตาราง B (`.rows`) สองคอลัมน์แรกตัดบรรทัดได้ ไม่ตัดรหัสรุ่น · `summary` ของ `.s-row-d` สูง ≥ 44 px บนจอสัมผัส · quickclean บนจอสัมผัสเลื่อนไปช่องชื่อแทนการ focus (คีย์บอร์ดไม่บังยอด) · `product-media` ไม่ cache data URL ที่สั้นกว่า 24,000 ตัวอักษร (ภาพว่างจาก GL ซอฟต์แวร์) · palette จัดอันดับตามจำนวนคำที่ตรง + จับ BTU เป็นช่วง ±12% · **B header เป็น grid ของ `.cell`** — ปุ่มค้นหาต้องอยู่ใน `div.cell.cp-cell` (`palette.js` ห่อให้เมื่อ `.vsw` เป็น cell) และ grid มี 5 / 4 / 3 คอลัมน์ที่ >1100 / ≤1100 / ≤640 px · header ทุกแบบไม่ล้นที่ 320 px · `.cp-status` มีเส้นคั่นจากรายการ

### 7.1h ทำเสร็จ Rev.15 (2 ต.ค. 2569 — เจ้าของ: "Booking ล่วงหน้า 3 วัน นอกจาก priority queue ภายในวัน +500 และต้องมีคิว ที่เหลือคำนวณให้")

- ✅ **กฎคิว** `sbp-core.QUEUE_RULES` (แหล่งเดียว) + `assets/queue.js` (ไม่มี DOM): `bkkNow()` (เวลาไทยเสมอ) · `earliestNormal()` = วันนี้ + 3 วัน (ตรงวันอาทิตย์เลื่อนเป็นจันทร์) · `visitTime(lines, level)` = Σ เครื่อง × `JOB_TIME` (ย้ายจาก jobguide มา sbp-core, jobguide re-export) · `fitOf` → ครึ่งวัน (เลือกเช้า/บ่าย) / ทั้งวัน / หลายวันทำการ · `judge(date, lines, level)` → จองปกติ / คิวด่วน / วันหยุด / วันนี้เวลาไม่พอ (งานเลย 17:30 = นอกเวลา) / ช่วงที่เลือกได้ (วันนี้หลังเที่ยงเหลือแต่บ่าย)
- ✅ **จองล้าง ขั้น 3** (`quickclean.js`): ปุ่มเร็ว วันนี้ · พรุ่งนี้ (คิวด่วน +฿535) · วันจองปกติเร็วสุด · เลือกช่วงเวลาตามเวลางาน · ข้อความสถานะ + เวลาหน้างานโดยประมาณ (มี `TIME_NOTE` เสมอ) · คิวด่วนเป็นแถวในยอดรวม และเป็นรายการเดียวต่อการเข้างานในใบเสนอราคา (`fixed: true` ไม่มีปุ่มจำนวน, `group: 'rush'` ไม่นับยอดขั้นต่ำงานล้าง) · ช่วงเวลาไปกับใบเสนอราคา (`cart.prefSlot`) · ช่องวันที่ในใบเสนอราคาบอกความหมายของวัน (`dateHint`) · FAQ ข้อใหม่
- ✅ **ตารางคิวจริง (พร้อมเปิด):** `Code.gs doGet ?q=slots` อ่านแท็บ `คิว` (วันที่ | เช้า | บ่าย, พิมพ์ "เต็ม") → เว็บบอก "คิวเต็ม" + ปุ่มวันว่างใกล้สุด / "มีคิวว่าง (ทีมยืนยันอีกครั้ง)" · `?q=status` ตรวจสถานะคำขอด้วยเลขอ้างอิง + เบอร์ 4 ตัวท้าย (ฟอร์มในหน้าติดต่อ แสดงเฉพาะเมื่อตั้ง `QUEUE_URL`) · ตอนนี้ `QUEUE_URL` ว่างเพราะ ENDPOINT ยังเป็น FormSubmit → ต้อง deploy Apps Script ก่อน (backend/README.md)
- ✅ เทสต์ `npm run booking` เพิ่มกรณีคิวด่วน (+535 · 1 รายการ · ยอดตรงกับใบเสนอราคา · หายเมื่อกลับเป็นวันปกติ) · การ์ดรายการถ่ายรูป / ปุ่มหลายบรรทัดชิดบน (เดิมแถวยืดทำให้ป้ายสูงไม่เท่ากัน)

### 7.1i ทำเสร็จ Rev.16 (2 ต.ค. 2569 — เจ้าของ: "ราคาก่อน VAT ทุกราคา งานบริการปัดหลักร้อย · จอง slot ใส่หมายเหตุ/รูปหน้างานเพื่อประเมินงานเกินมาตรฐาน · ticket real time เด้งเข้าหลังบ้าน · จองคิวล้างและติดตั้งทั้งหมด")

- ✅ **ราคา:** ทุกจุดแสดงก่อน VAT + ป้าย "ก่อน VAT" (สินค้า `sku.price = px`, ศูนย์ราคา, การ์ด, ตารางเทียบ, ทีมช่าง, ห้องจำลอง, สัญญารายปี, ค่าเดินทาง, palette, HTML ทั้ง 3 แบบ) · VAT อยู่ที่ยอดรวมเท่านั้น · `up100` ล้าง/ซ่อม/บริการติดตั้ง (ผล: ล้างที่ลงท้าย 50 ขึ้น 50 บาท 100 แถว · ซ่อม 850 → 900 · ติดตั้งเป็นหลักร้อยอยู่แล้ว) · "เริ่ม ฿700"
- ✅ **ใบจองงาน** (`assets/ticket.js`) ในใบเสนอราคา (จุดรวมของทุกเส้นทาง: จองล้าง / ซื้อแอร์ + ติดตั้ง / ศูนย์ราคา): 1 รายการและราคา → 2 วันเข้างาน + ช่วงเวลา (กฎคิว queue.js ใช้กับงานติดตั้งด้วย · คิวด่วนเพิ่ม/ลบอัตโนมัติตามวัน `syncRush`) → 3 สภาพหน้างาน (ล้าง 7 ข้อ / ติดตั้ง 8–10 ข้อ แตะเลือก) + ขอบเขตงานสด (`scope()` → รายการ Pricebook: สูงเกิน 3 ม. · นั่งร้าน · เปิดฝ้า · คราบหนัก ฿400/เครื่อง · พื้นที่ควบคุม · ตรวจอาการ · ท่อเกิน 4 ม. ต่อเมตร · รื้อเครื่องเดิม · Core drill · งานที่สูง · ฐานหลังคา · สายเมน/เบรกเกอร์ · ท่อน้ำทิ้ง · ปั๊มน้ำทิ้ง ฿2,500 · ฝังท่อ · Permit) + รูป (ย่อในเครื่อง ≤1280 px, สูงสุด 8) + หมายเหตุ → 4 ผู้ติดต่อ → "ส่งใบจองงาน" (เลขอ้างอิง `B…`) · ฟอร์มจำค่าระหว่างแก้ (`cart.draft`)
- ✅ **หลังบ้าน (พร้อม deploy):** `Code.gs` รับ `kind: 'booking'` → แท็บ `งานจอง` + รูปลง Drive (โฟลเดอร์ต่อเลขอ้างอิง) + อีเมลทันที + LINE push (Messaging API, ตั้ง `LINE_TOKEN`/`LINE_TO`) · **บอร์ดงาน** `Board.html` (`?view=board&key=BOARD_KEY`): รีเฟรชทุก 20 วิ แจ้งเตือนงานใหม่ (desktop notification + ชื่อแท็บ) · กรองสถานะ · ใบงานแสดงขอบเขต/รูป/โทร/หมายเหตุ · แก้ สถานะ (ใหม่ → กำลังประเมิน → แจ้งราคาแล้ว → ยืนยันคิว → เสร็จ / ยกเลิก) · ราคาเพิ่มที่แจ้ง (ก่อน VAT) · นัดวัน/ช่วง · หมายเหตุทีม · "ยืนยันคิว" เขียน "เต็ม" ลงแท็บ `คิว` → หน้าเว็บเห็นคิวเต็มทันที · ลูกค้าตรวจสถานะด้วยเลขอ้างอิง + เบอร์ 4 ตัวท้าย
- ✅ เปิดใช้: deploy Apps Script → ใส่ URL `/exec` ที่ `assets/submit.js` → `BACKEND` (และ `ENDPOINT` ได้) · ก่อนตั้งค่า: ใบจองงานส่งทางอีเมล (FormSubmit) พร้อมคำตอบ/ขอบเขต/หมายเหตุครบ + ปุ่ม "ส่งรูปทาง LINE" พร้อมเลขอ้างอิง (บอกตรง ๆ ว่ารูปยังไม่ถึงทีม)

- ✅ **รอบ 16.1 (เจ้าของ: "อัปเดตระบบจองให้ดีที่สุด · ตรวจ bug และแก้"):** ใบจองงานเพิ่ม ที่อยู่หน้างาน + ลิงก์แผนที่ / ปุ่ม "ใช้ตำแหน่งปัจจุบัน" (geolocation → ลิงก์ Google Maps เฉพาะงานนี้) · LINE ID · ช่วงที่สะดวกให้ติดต่อ · **จำข้อมูลที่กรอก** (`localStorage['sbp-booking-v1']`: คำตอบ ผู้ติดต่อ วัน/ช่วง — ไม่เก็บรูป) · ตรวจตามลำดับก่อนส่ง (วันเข้างาน → พื้นที่ → ที่อยู่) พร้อมเลื่อนไปช่องที่ขาด · หลังส่ง: คัดลอกเลขอ้างอิง · บันทึกลงปฏิทิน `.ics` (TENTATIVE "รอยืนยันคิว") · แชท LINE พร้อมเลขอ้างอิง · คิวด่วนตามรายการในใบเสมอ (`syncRush` ทุกครั้งที่แสดง — ลบงานล้าง/ติดตั้งออกแล้วค่าคิวด่วนหายเอง · บรรทัดคิวด่วนไม่มีปุ่มลบ เปลี่ยนวันแทน) · palette: "จองติดตั้งแอร์" · "ส่งใบจองงาน / นัดคิว" · "ตรวจสถานะคำขอ" (เมื่อมี backend) · เพิ่มสินค้าพร้อมติดตั้งแล้วบอกให้เปิดใบเสนอราคาเพื่อเลือกวันติดตั้ง · แก้: ช่วงเวลาค้างในใบที่ไม่มีงานล้าง/ติดตั้ง · ตาราง B ตัดชื่อซีรีส์บนมือถือ · ป้ายขั้นในฉากทีมช่างตัดคำบนมือถือ · `tests/submit.mjs` กรอกช่องใบจองงานเมื่อเป็นงาน · axe ในลิ้นชักใบจอง (สว่าง/มืด × 3 แบบ) ไม่มี serious/critical

### 7.1j ทำเสร็จ Rev.17 (2 ต.ค. 2569 — เจ้าของ: "วัสดุคงราคาจริง · ตรวจวิธีคำนวณแบบแยกละเอียด · หาราคากลางที่ปรับแล้ว · แยกเป็น option ให้เห็นค่าใช้จ่าย")

- ✅ `assets/costs.js`: `breakdown()` ค่าใช้จ่ายแยกรายการ (เครื่อง · แพ็กเกจ · ตัวเลือก ราคา/หน่วย × จำนวน · ประเมินหน้างาน · ก่อน VAT · VAT · รวม) · `packageParts()` อ่านสิ่งที่รวมจากข้อความ "รวม" ของแพ็กเกจเอง · `pipeBundle()` ชุดท่อส่วนเกิน 1 เมตร เทียบซื้อแยกชิ้นตาม Pricebook (ท่อคู่ + ฉนวน 2 ขนาด + ราง + สายไฟ 3 เส้น + ท่อน้ำทิ้ง) — ไม่มีต้นทุน/กำไรในเบราว์เซอร์ · `optionNote()` กันกดซ้ำกับแพ็กเกจ (เบรกเกอร์ 1 ตัว · สายไฟระหว่างเครื่อง · ท่อน้ำทิ้ง 4 ม.)
- ✅ หน้าสินค้า: ส่วน "ค่าใช้จ่ายแยกรายการ (ก่อน VAT)" อัปเดตสด + "ชุดวัสดุส่วนเกินต่อเมตรมีอะไรบ้าง"
- ✅ แก้คิดเงินซ้ำในใบจองงาน (`ticket.scope`): ไม่บวก RCBO เมื่อเดินเมนใหม่ (แพ็กเกจรวมเบรกเกอร์แล้ว) · ท่อน้ำทิ้งเริ่มคิดหลัง 4 ม. (เดิม 3)
- ✅ รายงานเทียบราคาตลาดสำหรับเจ้าของ (artifact "ตรวจราคาวัสดุติดตั้ง SBP"): ไม่มีรายการต่ำกว่าราคาวัสดุขายปลีก · สายไฟ/ท่อน้ำทิ้งต่อเมตรสูงกว่าที่ร้านอื่นประกาศ · ปั๊มน้ำทิ้งต่ำกว่าตลาด · ดัชนีวัสดุก่อสร้าง ส.ค. 2569 +6.1% · **ไม่ได้แก้ราคาใด ๆ** (รอเจ้าของตัดสิน)

### 7.1k ทำเสร็จ Rev.18 (2 ต.ค. 2569 — เจ้าของ: "ตรวจข้อมูลทั้งหมดให้เรียบร้อย ไม่ต้องแก้บ่อย · ระบบจองและใช้บริการครบ · ตรวจ 4D 3D animation ละเอียด ไม่มี error")

- ✅ **ข้อมูล:** FAQ ค่าเดินทาง/ยอดขั้นต่ำสร้างจาก `TRAVEL` / `DATA.minBill` (getter) — ไม่มีตัวเลขซ้ำที่ต้องแก้สองที่ · **ใบเสนอราคาที่บันทึกไว้คิดราคาใหม่ตอนโหลด** (`repriceLine`, `PRICE_V` ใน `sbp-quote-v2`): สินค้า P- · ติดตั้ง I-/IN- · ล้าง QC-/CL-/C-/CX- · ซ่อม R-/RP- (เดิมลูกค้าที่เปิดค้างไว้เห็นราคาก่อนปัด) · ตรวจคำรับประกัน 30/45/60 วัน และ 3 ปี/1 ปี ตรงกับ Pricebook · เวลาหน้างานในใบจองมี `TIME_NOTE` (กฎ 22)
- ✅ **จองครบทุกบริการ:** ซ่อม / ตรวจเช็กเป็นใบจองงาน (`QUESTIONS.repair`: อาการ อายุเครื่อง ล้างล่าสุด ความสูง คอยล์ร้อน สถานที่) · ค่าตรวจเป็นฐาน · อะไหล่/น้ำยา/ค่าซ่อมแจ้งให้อนุมัติก่อนซ่อมเสมอ (กฎ 13) · นัดได้เช้า/บ่าย (ไม่มีเวลาที่เผยแพร่ → ไม่แสดงเวลาประมาณ) · กฎคิวด่วนใช้เหมือนกัน · ทางเข้า: palette "จองช่างตรวจเช็ก / ซ่อม" · เส้นทาง "แอร์มีปัญหา" ขั้นสุดท้ายเปิดใบจองพร้อมค่าตรวจ · "ติดตั้ง/ย้ายแอร์" ขั้นสุดท้าย "จองคิวติดตั้ง / ขอสำรวจ" · ถาม "สถานที่" ครั้งเดียวเมื่อมีหลายงาน
- ✅ **ตรวจ 3D / 4D / animation (swiftshader):** ทุก section ที่มีฉาก 3 มิติ ใน 6 หน้า × A/B/C (1366) + C (390) + A (reduced motion) — boot, วาดจริง, กดสลับทุกปุ่มประเภท/โหมด 2 รอบ (รอบสองกดรัว) → **0 error ทุกชุด** · 4D: เปิดแล้วเลื่อนจากต้นถึงท้ายได้ขั้น 1 → ขั้นสุดท้ายครบทั้งงานล้าง (21) และติดตั้ง (13) ฉากค้างในจอตลอด · ป้ายขั้น 4D อาจตามช้าบนเครื่องที่ไม่มี GPU (เฟรมช้า) แต่ค่าถูกต้องเมื่อหยุดเลื่อน

### 7.1l ทำเสร็จ Rev.19 (3 ต.ค. 2569 — เจ้าของ: "เตรียมขั้นตอนและ Deploy app script เพื่อเปิดระบบรับใบจองพร้อมรูป และ test run ระบบให้ชัดเจน เพื่อเตรียมใช้งานทุกโมเดล")

- ✅ **สวิตช์เดียวทุกโมเดล:** `assets/submit.js` → `BACKEND_URL` (หรือ `<meta name="sbp-backend">` สำหรับทดสอบ — รับเฉพาะ `https://script.google.com/macros/s/…/exec`) · `ENDPOINT = BACKEND || FormSubmit` → ติดต่อ/ใบเสนอราคา/ใบจอง/ความเห็นเข้า Sheet เดียว · คิวสด + ตรวจสถานะเปิดเอง · ถ้าส่งใบจองไม่สำเร็จ **ไม่ส่งซ้ำ** ไป backend เดิม (แสดงกล่องสรุป + LINE)
- ✅ **Code.gs:** `VERSION` + `?q=ping` · `ss_()` (ใช้ได้ทั้งสคริปต์ผูกชีต/แยก — `SHEET_ID`) · `setup()` สร้างแท็บ+หัวคอลัมน์+คิว+โฟลเดอร์รูป+`BOARD_KEY` · `selfTest()` 11 ข้อ เงียบ (ไม่ส่งอีเมล/LINE) ลบข้อมูลทดสอบเองและคืนค่าคิวเดิม · ค่าลูกค้าเก็บเป็นข้อความ (`'`) — เดิมเบอร์ 08… จะกลายเป็นตัวเลขหาย 0 · แก้ `});` ที่ถูกคอมเมนต์กลืนใน `boardUpdate` (โค้ดเดิม syntax error) · Board.html รับ key ผ่าน `data-key` (เดิม `<?= JSON.stringify ?>` ใน script เสี่ยง escape ซ้อน) · ยอดเงินบนบอร์ดแสดง ฿
- ✅ **คิวสดในใบจอง (cart):** ช่วงที่เต็มขึ้น "คิวเต็มแล้ว" (กดไม่ได้) · เลือกช่วงว่างให้เอง · เต็มทั้งวัน → ส่งไม่ได้ + ปุ่ม "ว่างใกล้สุด" · โหลดใหม่ทุกครั้งที่เปิดใบจอง (แคช 60 วิ) · จองล้างด่วนแสดงช่วงเต็มเช่นกัน
- ✅ **ทดสอบ:** `backend/test/gas-emulator.mjs` (Code.gs ตัวจริงใน node:vm) · `npm run backend:test` **62/62 PASS** (A/B/C) · `npm run backend:check -- <url> [--write]` ตรวจของจริงหลัง deploy · คู่มือ deploy ทีละคลิก https://claude.ai/artifact/SJhUTVmE8S3VhSgbhYbCFA
- ⏳ **รอเจ้าของ:** deploy ตามคู่มือแล้วส่ง URL `/exec` → ใส่ `BACKEND_URL` → backend:check → build → test run ร่วมกัน

### 7.1m Rev.19.1 code review ระบบจอง (3 ต.ค. 2569 — เจ้าของ: "ตรวจเช็คระบบจองและ code review แล้ว feedback")

- ✅ **เลขอ้างอิงซ้ำ:** เว็บใช้ 7 หลักท้ายของเวลา (วนซ้ำทุก ~2.8 ชม.) → `uniqueRef()` ฝั่ง Sheet ต่อท้าย `-2`, `-3` ถ้าซ้ำ (เว็บใช้เลขที่ server ตอบกลับ) · ช่องตรวจสถานะรับได้ 22 ตัว
- ✅ **หัวคอลัมน์จากลูกค้า:** `safeFields()` — ≤ 40 ช่อง ชื่อ ≤ 60 ตัว ห้ามขึ้นต้น `= + - @ '` (เดิมชื่อช่องปลอมกลายเป็นสูตรในแถวหัวตาราง และเพิ่มคอลัมน์ได้ไม่จำกัด)
- ✅ **ยกเลิก / เลื่อนนัดแล้วคิวไม่คืน:** `releaseQueue()` คืนช่องเดิมเมื่อสถานะออกจาก ยืนยันคิว/เสร็จ หรือเปลี่ยนวัน/ช่วง — ไม่คืนถ้ามีงานยืนยันอื่นถือช่องนั้นอยู่ (ช่อง "เต็ม" ที่ทีมพิมพ์เองในวันเดียวกันกับงานที่ยกเลิกจะถูกคืนด้วย — พิมพ์ใหม่ได้)
- ✅ **พร้อมกันหลายคำขอ:** `LockService` ครอบการเขียน doPost / boardUpdate · ตรวจสถานะจำกัด 60 ครั้ง/นาที (กันเดาเลข)
- ✅ selfTest 11 ข้อ (เพิ่ม "ยกเลิกแล้วคิวว่างคืน") · `VERSION` Rev.19.1
- ℹ️ ข้อสังเกตที่ยังไม่แก้ (ตัดสินใจภายหลัง): ร่างใบจอง (ชื่อ เบอร์ LINE ที่อยู่) เก็บใน localStorage ของเครื่องลูกค้าเพื่อไม่ต้องกรอกใหม่ — หลังส่งสำเร็จล้างที่อยู่/หมายเหตุ แต่จำชื่อ/เบอร์ไว้ · ลิงก์บอร์ดมีรหัสใน URL (อยู่ในประวัติเบราว์เซอร์ของเครื่องทีม)

### 7.1n ทำเสร็จ Rev.20 (3 ต.ค. 2569 — เจ้าของ: "พื้นที่หน้างานแบบที่อยู่ไปรษณีย์ · ภาพพื้นที่ให้บริการ 3D/4D · รับระยะ 1–30 กม. ในกรุงเทพ · โทร 02-459-3299 · chatbot อาการแอร์ · สว่าง สดชื่น เย็นสบายตาม CI SP / FUJIVA · ฟอนต์มาตรฐานองค์กร · ภาษามืออาชีพ ตัดคำทดลอง · ข้อมูลจาก HomePro / Q-Chang · ให้ความรู้งานล้าง น้ำยา อย. ติดตั้งมาตรฐาน")

- ✅ **ที่อยู่แบบไปรษณีย์** `assets/addrpick.js` (`addrPicker`, `attachAddr`): ค้นแขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์ (ARIA combobox) + เลือกทีละช่อง จังหวัด → เขต/อำเภอ → แขวง/ตำบล → รหัสไปรษณีย์ · ใช้ในใบจอง (`#s-cart-zone`), จองล้าง (`#qc-zone`), ตรวจพื้นที่, ตัวคำนวณสัญญา · ข้อมูล `assets/th-address.json` (20 จังหวัดในระยะ 206 เขต/อำเภอ 1,714 แขวง/ตำบล พร้อมพิกัด + 57 จังหวัดชื่ออย่างเดียว) สร้างด้วย `tools/build-address.py` (thailand-geography-json MIT + thai-address-database ISC + พิกัด Wikidata CC0) · build ฝัง `__SBP_ADDR` · ส่งเข้า Sheet แยกช่อง แขวง/ตำบล · เขต/อำเภอ · จังหวัด · รหัสไปรษณีย์ · ระยะ · ค่าเดินทาง
- ✅ **กฎค่าเดินทางใหม่** (`TRAVEL`, `zoneOf`, `jobTravel`, `travelFee` — ดู §6.6 ข้อ 8–9) ใช้ที่เดียวทุกจุด: ใบจอง จองล้าง สัญญารายปี ห้องจำลอง ตาราง FAQ ความรู้ · เลิก `ZONES` / `NEARBY` / `travelCharge` / ยกเว้นตามจำนวนเครื่อง · จองล้าง: "เพิ่มอีก n เครื่อง ไม่มีค่าเดินทาง"
- ✅ **แผนที่พื้นที่ให้บริการ 3D + การเคลื่อนไหว** `assets/areamap3d.js` (`mountAreaMap`) แทนกล่องสี่เหลี่ยม (A หน้าแรก) และแผนที่ทั้งประเทศ (#area ทุกแบบ) + แถบ "พื้นที่ให้บริการ" หน้าแรก B / C (`#coverage`): กรุงเทพฯ ยกสูง วงพื้นที่หลัก 30 กม. เรืองแสง + เรดาร์กวาด · จุดเขตในพื้นที่หลัก (ฟ้า) / ใกล้เคียง (ส้ม) · วง 60 / 100 / 150 กม. พร้อมค่าเดินทาง · ทีมช่างวิ่งจากพระราม 2 ตามนาฬิกา 08:30–17:30 (ภาพประกอบ) · ชี้/คลิกเขต · เลือกที่อยู่แล้วปักหมุด + เส้นทาง · reduced motion = ภาพนิ่ง · ไม่มี WebGL = SVG · `thaimap3d.js` ลบแล้ว (`test-map.html` → `test-area.html`)
- ✅ **โทร 02-459-3299** (`COMPANY.tel`)
- ✅ **ผู้ช่วยตรวจอาการแอร์** `assets/acbot.js` (`mountAcBot` ผ่าน site.js ทุกแบบ): ปุ่มลอย "ถามอาการแอร์" · 11 หัวข้อ (ไม่เย็น น้ำหยด น้ำแข็งเกาะ กลิ่น เสียง เปิดไม่ติด รหัสเตือน ลมเบา ตัดบ่อย ค่าไฟ การดูแล) · สาเหตุ → ตรวจเองอย่างปลอดภัย → ควรให้ช่างตรวจเมื่อ → จองช่างตรวจเช็ก (ใส่ค่าตรวจในใบ) / จองล้าง / LINE / โทร · ข้อความความปลอดภัยทุกคำตอบ · ไม่เดาความหมายรหัสเตือน (ขอรูปรหัส + รุ่น) · ทำงานในเบราว์เซอร์ ไม่ส่งข้อความออก
- ✅ **โทนสว่าง สดชื่น เย็นสบาย** (CI: SP ส้มแดง #EB2700 · FUJIVA ส้ม #EE3900 + น้ำเงิน #003C99): พื้น #F3F9FD การ์ดขาว น้ำเงิน FUJIVA #003C99 ฟ้า #0B74B5 ปุ่มหลักส้มแดง #C93A0A (ตัวอักษรขาว 5.1:1) · ทั้ง 3 แบบเป็นธีมสว่างเป็นค่าเริ่มต้น (C เดิมมืด) · ธีมมืดเฉพาะเมื่อผู้ชมเลือกเอง (`data-theme="dark"`) · ฟอนต์: เนื้อความ IBM Plex Sans Thai ทุกแบบ หัวข้อ Anuphan (A, C) / Plex (B)
- ✅ **มาตรฐานงานของเรา** `assets/standards.js` (`#standards` ทุกแบบ): ล้างปกติ C1 / ล้างใหญ่ C2 (ไม่ตัดท่อ ทะเบียนชิ้นส่วน) + รับประกันตามแพ็กเกจ · เกณฑ์น้ำยาและสเปรย์โฟม (เลขทะเบียน อย. วอส. บนฉลาก · ไม่กัดกร่อนฟินคอยล์ ไม่มีโซดาไฟ/กรดแก่ · ล้างออกหมด · ตามอัตราบนฉลาก · ไม่โดนชิ้นส่วนไฟฟ้า) · ติดตั้งตาม SBP-SR-ACIN-UNI-001 (Leak test ไนโตรเจน · แวคคั่ม + ไมครอนเกจ + hold · ค่าตามคู่มือผู้ผลิต) + วัสดุ O-TWO 0.70 / Aeroflex / Airpro / Yazaki / SCG / NANO RCBO + รับประกัน 3 ปี / 1 ปี · ซ่อม: วินิจฉัย → อนุมัติราคาก่อนซ่อม · สิ่งที่ได้รับทุกงาน (pain point จากแพลตฟอร์ม: ราคาเปลี่ยนหน้างาน ไม่รู้ใครมา ไม่รู้ทำอะไร) — **ยังไม่ระบุยี่ห้อ/เลขทะเบียนน้ำยา จนกว่าบริษัทส่งข้อมูล**
- ✅ **ภาษาพร้อมใช้งานจริง:** ตัด "ทดลองใช้ (Beta) / ต้นแบบ / กำลังจะขึ้นเว็บ / ได้เลย" ออกจากข้อความลูกค้า · แถบบนเหลือ "แบบเว็บไซต์ A · เทียบแบบ A · B · C" (สำหรับเจ้าของเลือกแบบ) · footer "มาตรฐานบริการ" · กล่องส่งต่อ "ส่งคำขอถึงทีม" · ความเห็น → "ความคิดเห็นจากลูกค้า"
- ✅ แหล่งอ้างอิงที่ใช้ (3 ต.ค. 2569): HomePro (ล้างติดผนัง 650 · 23 ขั้นตอน · รับประกัน 30 วัน · ประกันความเสียหาย) · Q-Chang (ราคาเดียวทุกขนาด · รับประกัน 30 วัน · จองล่วงหน้า · ชำระบัตร) · คู่มือแบรนด์ (LG / Samsung / Haier: ตรวจโหมด แผ่นกรอง เบรกเกอร์ ก่อนเรียกช่าง) · ข้อมูลน้ำยาล้างคอยล์ (ด่างแรงกัดฟิน · วอส. ในกรอบ อย.) · มาตรฐานแวคคั่ม (ไมครอนเกจ) — ไม่คัดลอกข้อความ ไม่อ้างชื่อคู่แข่งบนเว็บ

### 7.1o ทำเสร็จ Rev.21 (3 ต.ค. 2569 — เจ้าของ: "ตรวจเช็คระบบ ข้อมูลทั้งหมด และข้อมูลปัญหาและอาการยอดฮิตของแอร์ เช่น น้ำไหล แอร์เปิดไม่ติด แอร์ไม่เย็น แอร์เป็นน้ำแข็ง และอื่น ๆ เพื่อคำตอบว่าต้องเรียกช่างไปซ่อมถูกจุด")

- ✅ **คัดกรองอาการ** `assets/acdiag.js` (ข้อมูล + ตรรกะล้วน ไม่มี DOM): 14 อาการ (`SYMPTOMS`: ไม่เย็น · น้ำหยด/น้ำไหล · เป็นน้ำแข็ง · เปิดไม่ติด · ไฟกะพริบ/Error · เบรกเกอร์ตัด · ติด ๆ ดับ ๆ · เสียงดัง · กลิ่น · ลมเบา · บานสวิง · คอยล์ร้อนมีน้ำหยด · ค่าไฟสูง · ควรล้างบ่อยแค่ไหน) แต่ละอาการมี "อาจไม่ใช่อาการเสีย" · "ตรวจเองได้อย่างปลอดภัย" · คำถาม 1–5 ข้อ (คะแนนต่อจุดเสีย) → 21 จุดที่น่าจะเสีย (`CAUSES`: ประเภทงาน · สิ่งที่ช่างตรวจ · regex ผูกรายการ Pricebook `DATA.rep`) · `matchSymptoms(text)` อ่านคำที่ลูกค้าพิมพ์ · `diagnose(id, answers)` จัดลำดับ · `diagLine(type)` ค่าตรวจวินิจฉัยตามประเภทแอร์ (ติดผนัง 900 / แขวน-สี่ทิศทาง-ฝังฝ้า 1,200) · จุดที่มีเฉพาะแอร์ใหญ่ (ปั๊มน้ำทิ้ง) ถูกตัดเมื่อเลือกติดผนัง
- ✅ **ผู้ช่วยตรวจอาการ** `assets/acbot.js` เขียนใหม่บน acdiag: การ์ดแบบโต้ตอบ (`triageCard`) → จุดที่น่าจะเป็นเรียงลำดับ + ราคามาตรฐานก่อน VAT หรือ "ประเมินหน้างาน" · แจ้งเตือนความปลอดภัยเมื่อเป็นไฟรั่ว/ไหม้ · แนะนำล้างก่อนเมื่อสาเหตุหลักคือความสกปรก · ปุ่ม "จองช่างตรวจซ่อม · ส่งผลประเมินไปด้วย" (`bookDiag`): ใส่ค่าตรวจวินิจฉัยตามประเภท (สลับบรรทัดถ้าเปลี่ยนประเภท ไม่ซ้ำ) · ตั้งอาการในใบจอง · เก็บ `cart.draft.diag` · เปิดใบเสนอราคา
- ✅ **ส่วน "อาการแอร์ยอดฮิต"** `assets/symptoms.js` (`#symptoms` ในมุมมองบริการ ทั้ง A/B/C) + ขั้นแรกของเส้นทาง "แอร์มีปัญหา / ซ่อม" + ลิงก์ท้ายเว็บ
- ✅ **ใบจอง / หลังบ้าน:** ตัวเลือกอาการซ่อมเพิ่ม น้ำแข็งเกาะ · เบรกเกอร์ตัด · ลมเบา · บานสวิง (ข้อความเตือนเบรกเกอร์ตัด) · กล่องผลประเมินในใบจอง (ลบได้) · ช่อง `ผลประเมินเบื้องต้น (ผู้ช่วย)` ใน fields / ข้อความ / หัวคอลัมน์ setup() / Board.html · Code.gs `VERSION='Rev.21'`
- ✅ กฎ: ไม่สัญญาว่าหาย ไม่เดาความหมายรหัส Error ไม่ซ่อมก่อนอนุมัติ (§6.6 ข้อ 11, 13) · ไม่ระบุค่าบริการนอกเวลา
- ✅ ทดสอบ: `node tests/acdiag.mjs` (คำที่ลูกค้าพิมพ์ 30 แบบ · ทุก regex เจอรายการ Pricebook · ลำดับจุดเสีย) · `node tests/acbot.mjs a.html` (e2e ผู้ช่วย → ใบจอง)
- แหล่งอ้างอิง: Daikin Troubleshooting · Q-Chang (แอร์เปิดไม่ติด / แอร์เป็นน้ำแข็ง) · Carrier Thailand (แอร์ไม่เย็น) · Siam Charoen Air (เปิดไม่ติด / คอมเพรสเซอร์) · Kacha (เบรกเกอร์ตัด)

### 7.1p ทำเสร็จ Rev.21.1 (3 ต.ค. 2569 — เจ้าของส่งผลตรวจอิสระ "01_FULL_DEVELOPER_HANDOFF.md" ฐาน 4b7f938: "ตรวจเช็คว่าถูกต้องไหม ต้องใช้สิ่งที่ตรวจมาพัฒนาหรือแก้ไขอะไร")

ตรวจซ้ำทุกข้อกับโค้ดจริง — **ถูกต้องทั้ง 6 ข้อ** แก้แล้วพร้อม regression test (ใน branch · ยังไม่ merge · ยังไม่ deploy · ยังไม่ทดสอบบน Apps Script จริง)
- ✅ **BUG-01 (P1) สิทธิ์ Apps Script:** helper ทุกตัวลงท้าย `_` (private) · public เหลือ `doGet` `doPost` `boardData` `boardUpdate` (ตรวจ key) และ `setup` `selfTest` `newBoardKey` (เจ้าของเท่านั้น `ownerOnly_()` ด้วย `Session`) · `setup()` ไม่คืน BOARD_KEY · ลิงก์บอร์ดไม่มีรหัส = ข้อความธรรมดา (ไม่มี google.script.run) · `newBoardKey()` หมุนรหัส · ตัวจำลองใช้กฎจริงของ Google (`publicFns()`, `/rpc` = visitor) แทน allowlist
- ✅ **BUG-02 (P1) ค่าเพิ่มงานติดตั้งรายเครื่อง:** `jobsIn().units` (type/BTU/qty ต่อรายการ) · `scope('install')` คิดท่อส่วนเกินและรื้อเครื่องตามชนิด/ขนาดของแต่ละรายการแล้วรวม · ถามระยะท่อแยกต่อรายการ (`A.pipeBy`) · รายการเสริมที่อยู่ในใบแล้ว (`codes`) ไม่คิดซ้ำและไม่นับเป็นเครื่อง · ติดผนัง 12k + สี่ทิศทาง 48k ท่อ 8 ม. = 11,200 ทั้งสองลำดับ (เดิม 8,000 / 14,400)
- ✅ **BUG-03 เลขอ้างอิง:** backend แทนเลขในสรุป/อีเมล/LINE ด้วยเลขจริง · หน้าเว็บใช้เลขที่ backend ตอบทุกที่ (หัวข้อ สรุป คัดลอก LINE ปฏิทิน) · `rid` ต่อคำขอ + ปุ่ม "ลองส่งอีกครั้ง" ส่ง rid เดิม → ไม่เกิดแถวซ้ำ (Cache 6 ชม.) · status รับเลขยาวถึง 24
- ✅ **BUG-04 บอร์ดทับข้อมูลที่กำลังแก้:** `drafts` ต่อ ref/ช่อง คงอยู่ข้าม refresh · คืน focus · แจ้งเมื่อในระบบเปลี่ยนระหว่างแก้ · บันทึกไม่สำเร็จไม่ล้างข้อมูล · คำตอบ refresh เก่ากว่าถูกทิ้ง (`seq`)
- ✅ **BUG-05 เวลางานล้าง:** `visitLines` อ่านทุก key (`QC-` `CL-` `C-`) · AHU / ล้างเฉพาะส่วน / duct = "ทีมยืนยันเวลา" ไม่แปลงเป็นติดผนัง C1 · งานเพิ่ม (คราบ ความสูง) ไม่นับเป็นเครื่อง · เวลาติดตั้งตามชนิดของแต่ละรายการ · `visitTime()` คืน `[min, max, unknown]`
- ✅ **BUG-06 ลิงก์รูป:** backend เขียน `รูป` = ลิงก์โฟลเดอร์หรือว่าง + `จำนวนรูป` = ไฟล์ที่บันทึกได้จริง · บอร์ดลิงก์เฉพาะ `https://drive.google.com/` (แถวเก่าที่เป็น 0 ไม่เป็นลิงก์) · หน้าเว็บบอกจำนวนรูปที่ยังไม่ถึงทีม
- ทดสอบ: `npm run review` (tests/review-fixes.mjs) · `npm run backend:test` 95/95 (รวมชุดสิทธิ์เชิงลบ + R BUG-03/04/06)
- ✅ **GATE-02 (บางส่วน):** `.github/workflows/sbp-aircare-checks.yml` (PR + push ที่ไม่ใช่ main: Code.gs parse · รายชื่อฟังก์ชัน public ต้องตรงที่ทบทวน · acdiag · review-fixes) และ Pages deploy ต้องผ่าน checks ก่อน build · `dist/site/version.json` = SHA ที่ออนไลน์ · ชุดเบราว์เซอร์ (smoke/booking/submit/backend:test) ยังรันในเครื่องก่อน merge
- ยังไม่ทำ (นอกขอบเขตแก้บั๊ก ต้องให้เจ้าของเลือก/ให้สิทธิ์): GATE-01 staging Apps Script จริง (ต้องใช้บัญชีบริษัท) · rollback ที่ซ้อมแล้ว · GATE-03 รูปสินค้าตรงรุ่น (manifest ยังว่าง) · GATE-05 ยืนยัน Pricebook/ค่าเดินทาง · backlog C–E

### 7.1q ทำเสร็จ Rev.22 (3 ต.ค. 2569 — เจ้าของ: "สำหรับองค์กรต้องโชว์มากกว่านี้ เช่น สำนักงาน บริษัท คอนโด โรงพยาบาล โรงเรียน หรือ enterprise หลายสาขา ครอบคลุมทุกอย่าง จัดเตรียมเป็น Sample และสัญญารายปีที่เหมาะแต่ละประเภท เพื่อแก้ painpoint ลูกค้าองค์กรทั้งหมด ให้เหนือกว่าคู่แข่ง")

- ✅ **ส่วน "ลูกค้าองค์กร"** `assets/enterprise.js` (`mountEnterprise(root, {openCart, builder})`, `#enterprise` หน้าองค์กร ทั้ง A/B/C ก่อนตัวคำนวณ `#b2b`): 7 ประเภท — สำนักงาน/บริษัท · องค์กรหลายสาขา (12 สาขา) · คอนโด/นิติบุคคล · โรงพยาบาล/คลินิก · โรงเรียน/มหาวิทยาลัย · โรงแรม · โรงงาน/คลังสินค้า
- แต่ละประเภท: กลุ่มลูกค้าตัวอย่าง · ปัญหาที่พบบ่อย 4–5 ข้อ → สิ่งที่บริษัททำ พร้อมป้าย **"มีในแพ็กเกจ / แบบฟอร์มบริษัท"** หรือ **"ตกลงในสัญญา"** (ไม่สัญญาสิ่งที่บริษัทยังไม่ได้กำหนด) · ช่วงเวลาเข้างาน · รายการเพิ่มจาก Pricebook ที่มักใช้ (ราคา / ประเมินหน้างาน / นอกเวลา = ไม่ระบุจำนวนเงิน)
- **สัญญาตัวอย่าง** คำนวณสดด้วย `estimateContract` (อัตรามาตรฐาน ก่อน VAT · ล้างใหญ่ปีละ 1 · รอบทุก 3/4/6 เดือน) สลับแพ็กเกจได้ · หลายสาขาคิดต่อสาขา × จำนวนสาขา · ปุ่ม ใส่ใบเสนอราคา (`group: 'contract'`) · ปรับจำนวนเครื่องเอง (`mountBuilder().load()` ใหม่) · คัดลอกร่างขอบเขตงาน (`scopeText`: เครื่อง ความถี่ มาตรฐาน SBP-SR-ACCL-UNI-001 ราคา งานนอกขอบเขต — ระยะเวลาตอบสนอง/ใบแจ้งหนี้/ระยะสัญญา **เว้นว่าง**) · นัดสำรวจหน้างาน (`askTeam`)
- ตารางเทียบแพ็กเกจ 3 ระดับ + ตารางสัญญาตัวอย่างทุกประเภท · เส้นทาง "องค์กร / สัญญารายปี" เริ่มที่ส่วนนี้
- กฎที่คุม: ตัวอย่างไม่ใช่ลูกค้าจริง (§6.6 ข้อ 15) · ไม่มีส่วนลด/อัตราพิเศษ (ข้อ 3 — ≥10 เครื่องแสดงข้อความ "อาจได้อัตราพิเศษ") · นอกเวลาไม่ระบุเงิน (ข้อ 22) · VRV/VRF แยก (ข้อ 16) · ไม่ใช้คำต้องห้าม เช่น "ปลอดเชื้อ" (ข้อ 11)
- ทดสอบ: `npm run enterprise` (tests/enterprise.mjs ตัวเลขตรง estimateContract ทุกประเภท + ถ้อยคำ · tests/enterprise-ui.mjs A/B/C)
- ⏳ รอเจ้าของ: ระยะเวลาตอบสนองมาตรฐาน · รูปแบบใบแจ้งหนี้หลายสาขา · เอกสารประกอบจัดซื้อภาครัฐ · ขอบเขตงานโรงพยาบาล/ห้องควบคุม (§7.3 ข้อ 9)

### 7.1r ทำเสร็จ Rev.23 (3 ต.ค. 2569 — เจ้าของ: "ขั้นตอนการล้างแอร์ทั้งแบบเล็กและใหญ่ต้องละเอียดให้สมจริงกว่านี้ … ไม่มีน้ำกระเฉาะออกจากผ้าใบล้างแอร์ · ลงน้ำยาทิ้งไว้ 5–15 นาทีตามความสกปรก · ขั้นตอนเป่าใช้ Blower · ปั๊มน้ำรูปแบบนี้มีตรา Fujiva · วิว ระเบียง เฟอร์นิเจอร์เป็นธรรมชาติ · คอยล์ร้อนบางกรณีอยู่ที่สูงต้องตั้งบันได · องค์กร: ใช้บริการจำนวนเยอะได้สิทธิประโยชน์อะไร · ความรู้ลองเอง: สีรางครอบท่อกลืนกับผนัง ทำให้ตัดกัน มีลูกเล่น · ทดลองคิด feature ใหม่ · คำนวณอุณหภูมิให้แม่นยำสมจริง")

- ✅ **ขั้นตอนล้าง (services.cleanSteps · กฎ 18)**: ขั้น `cover` = ครอบผ้าใบล้างแอร์มิดทุกด้าน + เช็กลิสต์ · ขั้นใหม่ **`dwell`** "ทิ้งน้ำยาไว้ให้ทำงาน 5–15 นาที ตามความสกปรก" (`dwell: [5, 15]`) ต่อจาก `chem` · `dry` = เป่าไล่น้ำด้วย **Blower** แล้วเช็ด · C1 22 ขั้น / C2 28 ขั้น · techstory / standards ใช้ถ้อยคำเดียวกัน
- ✅ **ฉาก 3D (`jobscene3d.js`)**: ผ้าใบล้างแอร์ผ้าเคลือบ PVC ครอบด้านบน ด้านข้าง (และด้านหลังใต้ฝ้า) หน้าต่างใสด้านหน้า กรวยลงถัง — น้ำที่ฉีดโดนเครื่อง **ถูกเก็บในผ้าใบ ไหลลงกรวยไปท่อ ไม่กระเด็นออก** (`CB` ใน `emitSpray`) · ล้างชิ้นส่วน/คอยล์ร้อนน้ำตกใกล้ ๆ ไม่สาด · นาฬิกาน้ำยา (sprite) วิ่งถึงเวลาตามความสกปรก แสดงช่วง 5–15 นาที · Blower: ลมขาวจางจากหัวเป่าในมือช่าง · **ปั๊มน้ำแรงดันตามภาพอ้างอิง** `buildPump()` (ตัวแดงทรงลาด หน้าดำมีช่องลม มือจับเทาระหว่างเสาแดง แผงหลังดำมีร่อง โครงแขวนสาย + สายม้วน ข้อต่อทองเหลือง ขาเทา ตรา FUJIVA สองข้าง) สายฉีดออกจากข้อต่อทองเหลือง · กล้อง `pump` ช่วงเตรียมปั๊ม
- ✅ **คอยล์ร้อนที่สูง** `OU_HIGH` (services.js: แขวนใต้ฝ้า/สี่ทิศทาง เฉพาะงานล้าง): ขาแขวนผนังสูง ~1.7 ม. · บันไดหน้าเครื่อง · ผู้ช่วยขึ้นบันไดฉีด หัวหน้าจับบันได (`outFoot`) · ท่อ/วาล์วตามความสูง · `setJob` สร้างอุปกรณ์ใหม่เมื่อสลับล้าง/ติดตั้ง
- ✅ **ทีมช่าง**: ถุงมือไนไตรล์ เข็มขัด + กระเป๋าเครื่องมือ แถบสะท้อนแสง แว่นนิรภัยตอนฉีด/เป่า · สูง ~1.72 / 1.67 ม. · ท่าใหม่ `blow`, `checkTime` · ฉีดถ่ายน้ำหนักตามจังหวะ
- ✅ **สภาพแวดล้อม**: วิวเมือง/ท้องฟ้า/แนวต้นไม้นอกระเบียง (บ้าน = มองจากชั้นสูง · ร้าน = ระดับถนน) · ระเบียงมีราวกระจก กระถางต้นไม้ ช่องระบายน้ำ · ห้องนอนมีพรม โต๊ะข้างเตียง โคมไฟ รองเท้าแตะ
- ✅ **องค์กร: "ใช้บริการ N เครื่องในสัญญาเดียว ได้อะไรบ้าง"** `volumeBenefits()` (enterprise.js) คำนวณจากกฎที่ประกาศเท่านั้น: ค่าเดินทางที่ไม่เกิดขึ้นเมื่อเทียบเรียกแยกทีละเครื่อง (งานต่ำกว่าขั้นต่ำ → ค่าเดินทาง `TRAVEL.baseFee`) · รอบเปิดพื้นที่/ปี · ทีม-วันต่อรอบ (1–2 ทีม) · จำนวนรายงาน/ปี · งบต่อเครื่องต่อเดือน · เงื่อนไขแพ็กเกจ · ปฏิทิน 12 เดือน · ไม่ใช่ส่วนลด ไม่มีตัวเลขอัตราพิเศษ (กฎ 3) · ทดสอบใน `tests/enterprise.mjs`
- ✅ **ความรู้ ลองเอง (`howitworks3d.js`)**: ผนังสีครีมให้รางครอบท่อสีขาวตัดชัด + เส้นขอบรางและข้อต่อ · ปุ่มเลือกสีผนัง 5 สี (รวม "ขาว สีเดียวกับราง" ให้เห็นว่าทำไมกลืน) · สวิตช์ "เปิดฝารางดูท่อด้านใน"
- ✅ **แบบจำลองอุณหภูมิ (`studio-model.js`)**: อากาศนอกตามช่วงใช้งาน (กลางวันหน้าร้อน 35°C · ห้องนอนกลางคืน 29°C เริ่ม 30°C) · ความสามารถทำความเย็นเทียบสภาวะพิกัด 27/35°C (มอก. 1155 / ISO 5151 T1: +2%/°C ห้องร้อนขึ้น −1%/°C นอกร้อนขึ้น) · แยกความร้อนสัมผัส (SHR ภาระ 0.78 · เครื่อง 0.78 ลดเมื่อคอยล์สกปรก) · Inverter เร่ง ~15% ตอนห้องยังร้อนแล้วปรับรอบ · Fixed speed ตัด-ต่อ ±0.75°C · หาอุณหภูมิคงที่ด้วยการแบ่งครึ่งช่วง · มวลความร้อนห้อง ×8 · ปุ่ม Inverter/Fixed มีผลกับเวลาเย็นด้วย
- ⏳ รอเจ้าของ: รูปปั๊มจริง/สเปก (แรงดัน · อัตราน้ำ) ถ้าต้องการแสดงตัวเลข · สีผ้าใบล้างแอร์จริงของทีม · เวลาแช่น้ำยาตามยี่ห้อน้ำยาที่ใช้จริง

### 7.1s ทำเสร็จ Rev.24 (3 ต.ค. 2569 — เจ้าของ: "เสริมระบบเทิร์นแอร์เก่า เพื่อกลุ่มลูกค้าต้องการรีโนเวทพื้นที่ โดยแอร์มีอายุเกิน 7–10 ปีขึ้นไป เพื่อนำมาเป็นส่วนลดและลดค่าใช้จ่ายในการซ่อมแซมที่แพง")

- ✅ **เทิร์นแอร์เก่า · ซ่อมหรือเปลี่ยนดี** `assets/tradein.js` (`mountTradeIn(root, {catalog, openCart})`, `#tradein` หน้า "ซื้อแอร์" ทั้ง A/B/C ต่อจากแคตตาล็อก) · ลูกค้าเลือก อายุ (ไม่ถึง 5 / 5–7 / 7–10 / 10–15 / เกิน 15 ปี) · ประเภท · ขนาด · ระบบ (Fixed / Inverter / ไม่ทราบ) · น้ำยา (R22 / R410A / R32 / ไม่ทราบ) · อาการ 9 แบบ (รีโนเวท · คอมเพรสเซอร์ · น้ำยารั่ว · แผงคอยล์ร้อน/เย็น · บอร์ด · มอเตอร์พัดลม · ไม่ทราบสาเหตุ) · จำนวนเครื่อง · ชั่วโมงใช้งาน
- **ซ่อมเครื่องเดิม** = ค่าตรวจวินิจฉัย + รายการซ่อมจาก Pricebook (`repairLines`) · รายการที่ไม่มีอัตรามาตรฐาน (คอมเพรสเซอร์ แผงคอยล์ บอร์ด Inverter) = "ประเมินหน้างาน" และยอดที่รู้ราคาแสดงเป็น "อย่างน้อย" · R22 ใช้รายการเติม R22 ของ Pricebook
- ✅ **Rev.24.1 มูลค่าเทิร์นแสดงตัวเลขแล้ว** (เจ้าของสั่งใช้ราคาตลาด — §6.6 ข้อ 25): `TRADE_IN.table` + `tradeValue(x)` ช่วงบาทต่อเครื่องตามขนาดและสภาพ (อาการ "รีโนเวท"/"ไม่ทราบสาเหตุ" = ใช้งานได้ · อาการเสียอื่น = เสีย/ต้องซ่อม) · ราคาสุทธิหลังหักมูลค่าเทิร์น · ตาราง + เงื่อนไขในหน้า (แถวขนาดที่เลือกเน้นสี) · ช่วงมูลค่าไปกับคำขอในใบเสนอราคาและข้อความถึงทีม · แหล่งอ้างอิง (3 ต.ค. 2569): ตารางรับซื้อแอร์เก่าปี 2569 banoldair.simdif.com (9k 900 · 12k 1,200 · 16k 1,400 · 18k 1,600 · 32k 2,800 · 36k 3,200 ทุกสภาพ รื้อฟรี) · ช่วงราคาใช้งานได้/เสียปี 2569 จากผลค้นหาร้านรับซื้อ · hatyaiair.com รับเทิร์น 500–1,800 ตามขนาด · HomePro โครงการเก่าแลกใหม่ (เงื่อนไข ≥9,000 BTU คอยล์เย็น+ร้อนครบ หน้ากาก/ฝาครอบ เสียก็รับ · ส่วนลดคงที่ต่อรุ่นใหม่ 100–1,000 บาท ไม่ประเมินเครื่องเก่า · ค่ารื้อ 750/ชุด นอกโปรโมชั่น)
- **เทิร์นเป็นเครื่องใหม่ (Inverter)** = ราคากลางของรุ่น Inverter ประเภทเดียวกัน ขนาด ±10% ในแคตตาล็อก (แสดงช่วงต่ำสุด–สูงสุดและจำนวนรุ่น) + ติดตั้งมาตรฐาน · เก็บน้ำยา / รื้อ / ขนย้ายเครื่องเดิม = ประเมินหน้างาน (Pricebook ยังไม่มีราคา) · **มูลค่าเทิร์นไม่แสดงตัวเลข** (`TRADE_IN.table = null`): "ทีมประเมินจากรุ่น อายุ สภาพ — หักในใบเสนอราคา" จนกว่าเจ้าของกำหนดตาราง (กฎ 3–4: ไม่มีตัวเลขส่วนลด/เปอร์เซ็นต์บนเว็บ · ไม่ใช้คำว่า "ส่วนลด")
- **ค่าไฟต่อปี** เครื่องเดิม vs เครื่องใหม่ จาก `studio-model.energy()` + สมมติฐานประสิทธิภาพลดลง 1%/ปีหลังปีที่ 3 (สูงสุด 15%) — ประมาณการ ไม่ใช่การรับประกันค่าไฟ (กฎ 11)
- **คำแนะนำ** (`tradeIn().verdict`: เทิร์นคุ้มกว่า / เทียบใบเสนอราคาทั้งสองทาง / ซ่อมคุ้มกว่า / ยังไม่จำเป็นต้องเปลี่ยน) จากหลักคิดที่ช่างใช้: อายุ ≥10 ปี · อาการที่ต้องเปิดระบบน้ำยา · R22 · ค่าซ่อม ≥ 50% ของเครื่องใหม่พร้อมติดตั้ง · อายุ × ค่าซ่อม ≥ เครื่องใหม่ (ใช้เมื่ออายุ ≥7 ปี) · อายุ <5 ปี เตือนให้ตรวจประกันผู้ผลิตก่อน — แสดงเป็นเหตุผล ไม่ใช่คำสัญญา
- ขั้นตอน 5 ขั้น (ส่งรูปป้ายเครื่อง → ทีมประเมินมูลค่าเทิร์น → ใบเสนอราคาเดียว → วันติดตั้งเก็บน้ำยาก่อนรื้อ ไม่ปล่อยสู่อากาศ → ส่งมอบ) · ปุ่ม: ขอประเมินมูลค่าเทิร์น (`kind: 'survey'` ในใบเสนอราคา) · ดูเครื่องใหม่ขนาดเดียวกัน (`catalog.setType/setBtu`) · ส่งรูปป้ายเครื่องให้ทีม (`askTeam('เทิร์นแอร์เก่า')`) · ≥10 เครื่อง แสดงข้อความอัตราพิเศษตามกฎ 3
- ทางเข้า: การ์ดหน้าแรก "เทิร์นแอร์เก่า / รีโนเวท" (`JOURNEYS.tradein`, การ์ด FUJIVA เต็มแถวด้านล่าง) · palette · หัวข้อติดต่อ "เทิร์นแอร์เก่า" · ผู้ช่วยตรวจอาการ: จุดเสียเป็นคอมเพรสเซอร์/น้ำยารั่ว → ปุ่ม "เทียบซ่อมกับเทิร์นเครื่องใหม่" (event `sbp:tradein` เลือกอาการให้)
- ทดสอบ: `npm run tradein` (tests/tradein.mjs — ทุกอาการ × ประเภท × ระบบ × ขนาด เจอรายการ Pricebook · ราคาเครื่องใหม่ตรงแคตตาล็อก · มูลค่าเทิร์นไม่แสดง · คำแนะนำ · คำต้องห้าม) + CI
- ⏳ รอเจ้าของ: ~~ตารางมูลค่าเทิร์น~~ ✅ Rev.24.1 · ราคา เก็บน้ำยา / รื้อ / ขนย้ายเครื่องเดิม ใน Pricebook (ตอนนี้ว่าง) · การจัดการเครื่องเก่า (ขายต่อ/รีไซเคิล — ข้อความบนเว็บยังไม่อ้าง)

### 7.1t ทำเสร็จ Rev.25 (3 ต.ค. 2569 — เจ้าของ: "รายละเอียดการเดินรางครอบท่อ สีต้องตัดกับกำแพง และสภาพแวดล้อมในแต่ละสถานที่ให้ดูสมจริง งานติดตั้งแอร์ต้องสวยงามเก็บงานให้เนียบ ปิดมุม ทุกอย่างให้ละเอียด โชว์ฉนวนและท่อให้น้อยที่สุด ของทุกโมเดลและทุกขั้นตอน")

- ✅ **สีผนังตัดกับรางขาว** ทุกฉาก: ทีมช่าง (`jobscene3d`) ห้องนอน greige · ร้านค้า เทาฟ้า · คาเฟ่ ปูนดินเผา · ห้องประชุม slate · ภายนอก บ้าน = ฉาบทราย / ร้าน = คอนกรีตเปลือย · บ้านจำลอง B/C (`install3d`) ห้อง greige `0xd8c6aa` + ภายนอกฉาบทราย · แอร์ทำงานอย่างไร (Rev.23)
- ✅ **เส้นขอบรางและข้อต่อ** `trunk3d.outlineTrunk(root)` ใช้กับรางทุกฉาก (ทีมช่าง · บ้านจำลอง · ห้องลองวาง roomfit3d) เห็นข้องอ ข้อต่อตรง ฝาปิดปลาย ฝาครอบผนังชัด · เส้นจางตามรางตอนกำลังติดตั้ง
- ✅ **เก็บงานเนียบ ฉนวน/ท่อโผล่น้อยที่สุด** (`jobscene3d`): รางลงมาถึงเหนือวาล์วคอยล์ร้อน 10 ซม. แล้วปิดปลาย · ช่วงสั้นจากรางถึงวาล์วพันเทปขาว (`trunk3d.tapeMaterial`) ไม่เห็นฉนวนดำ · รางเริ่มชิดตัวเครื่อง (แขวน 0.66 · ตู้ตั้ง 0.32) · สี่ทิศทาง: รางชิดใต้ฝ้า ท่อลงจากฝ้าเข้ารางทันที · สายไฟจากเบรกเกอร์อยู่ในรางเล็ก (W 32 มม.) ไม่มีสายลอย · ท่อน้ำทิ้งออกปลายรางลงผนังพร้อมกิ๊บยึดทุก ~35 ซม. · ใช้ทั้งงานติดตั้งและงานล้าง ทุกประเภท และคอยล์ร้อนติดที่สูง
- ทดสอบ: ภาพหน้าจอทุกประเภท (ส่งมอบ · ระบบไฟฟ้า · คอยล์ร้อนบ้าน/ร้าน) + บ้านจำลอง · regression ครบ

### 7.1u ทำเสร็จ Rev.26 (4 ต.ค. 2569 — เจ้าของ: "ใช้หน้าตา Body แอร์ FUJIVA ทำทุก Model · แอร์เก่าซื้อหรือเปลี่ยนดี ตรวจข้อมูลและวิธีจัดเก็บ workflow และจุดประสงค์ลูกค้าในการเทิร์น · ภาพวัสดุ 4D สมจริง แต่ละยี่ห้อของจริงเป็นแบบไหน สเปกอะไร · งานบริการอื่น ๆ ให้ครบ + งานยิบย่อยต้องมีขั้นต่ำเท่าไร ครอบคลุมอะไร (มองแบบบริษัทใหญ่ที่ใช้ช่างประจำ) · หน้าองค์กรประเมินงบทั้งปี เติม animation ไม่ให้มีช่องว่าง เป็นระบบ มีระดับ · ความรู้/ลองเอง/ปัญหาเบื้องต้น ทำ animation")

- ✅ **ตัวเครื่องติดผนัง FUJIVA** (`ac3d.buildPremiumIndoor`) ตามเครื่องจริงที่เจ้าของส่ง: หน้ากากเรียบขาวมุมโค้ง · แถบกระจกรมควันด้านบน · จอ 7-segment ขาว "26" กลางหน้ากาก · โลโก้ FUJIVA สีเทาใต้จอ (ไฟล์ทางการ ย้อมเทา) · ข้างเครื่องเทาอ่อนมีฝาครอบท่อกลม · ใต้เครื่องเทาพร้อมช่องลมและบานสวิง — ใช้ทุกภาพติดผนัง (ภาพสินค้า หมุน 360° ในตัวดูเครื่อง ห้องจำลอง) · ฉากงานช่างใช้ตัวเดียวกันแบบไม่มีโลโก้ (กฎ 20) · `product-media` ภาพว่างเกณฑ์ 12 KB (เดิม 24 KB ทำให้ภาพติดผนัง/แขวนบางภาพหาย) + cache `sbp-shots-r26`
- ✅ **เทิร์นแอร์เก่า: เป้าหมาย + ข้อมูล + workflow** (`tradein.js`): ถาม "เทิร์นเพื่ออะไร" 7 ข้อ (`PURPOSES` เลือกได้หลายข้อ แต่ละข้อมีสิ่งที่ควรรู้) · ยี่ห้อ/รุ่นจากป้ายเครื่อง (ไม่บังคับ — ว่าง = "ไม่ได้ระบุ" ไม่เดา) · ถาม-ตอบ 10 ข้อ (`QA`: คิดมูลค่าอย่างไร รับเครื่องเสีย/ต่างยี่ห้อไหม เงินสด เตรียมอะไร ติดที่เดิม วันเดียวกัน ค่ารื้อ ซ่อมแทน ข้อมูลเก็บที่ไหน) · `tradeInSummary()` = บันทึกเดียวที่ส่งถึงทีม แสดงให้ลูกค้าดูก่อนส่ง ("ข้อมูลที่ส่งถึงทีมเมื่อขอประเมิน") → `cart.draft.tradein` → ช่อง `ข้อมูลเทิร์นแอร์เก่า` ในใบเสนอราคาและใบจอง (+ ข้อความ) → คอลัมน์ใน Sheet (`Code.gs` quote/booking, VERSION Rev.26) → บอร์ดงาน · คำขอเทิร์นในใบเสนอราคามีบรรทัดเดียว (`TI-REQ`) ใช้คำตอบล่าสุด
- ✅ **งานบริการทั้งหมด + ค่าเข้างาน** (`allservices.js`, ใน `#prices` ทุกแบบ): 12 หมวดจาก Pricebook (ล้าง ติดตั้ง ตรวจเช็ก/ค่าแรงซ่อม ไฟฟ้า/บอร์ด น้ำยา/คอมเพรสเซอร์ น้ำทิ้ง มอเตอร์/บานสวิง รื้อย้าย วัสดุ งานสูง/ฝ้า AHU/FCU เอกสาร) จำนวนรายการ · "เริ่ม ฿x / หน่วย" = อัตรามาตรฐานต่ำสุด · กดแล้วเปิดศูนย์ราคาที่แท็บนั้น · **ค่าเข้างานคิดอย่างไร** จากกฎที่ประกาศแล้วเท่านั้น (งานล้างขั้นต่ำ + ค่าเดินทางเมื่อต่ำกว่า · งานซ่อม = ค่าตรวจวินิจฉัย · ติดตั้งรวมเดินทางในพื้นที่หลัก · ระยะไกล · คิวด่วน · นอกเวลาไม่ระบุเงิน) · **งานย่อยอย่างเดียว** (ไม่มีล้าง/ติดตั้ง/ตรวจซ่อมวันเดียวกัน) = "ทีมแจ้งค่าเข้างานในใบเสนอราคาก่อนนัด" — **ยังไม่มีตัวเลข รอเจ้าของอนุมัติ** (ข้อเสนอคำนวณจากต้นทุนทีมช่างประจำอยู่ในรายงานถึงเจ้าของ ไม่อยู่ใน repo/เบราว์เซอร์ — กฎ 4) · รายการ "งานกลางคืน/วันหยุด" และ "Mobilization" ใน Pricebook ไม่แสดงในภาพรวม
- ✅ **แผนงานล้างทั้งปีแบบเคลื่อนไหว** (`annualplan.js`, ใน `#b2b` ทุกแบบ ใต้ตัวเลือก): เส้นเวลา 12 เดือน + ฤดูกาล (กรมอุตุนิยมวิทยา) · รอบล้างตัวอย่าง (`planMonths`: ล้างใหญ่ C2 รอบแรกก่อนหน้าร้อน ที่เหลือกระจายเท่ากัน — ทีมนัดวันจริง) · งบสะสมเป็นขั้นบันได · อาคารที่เครื่องค่อย ๆ สะสมฝุ่นแล้วถูกล้างทีละเครื่องในแต่ละรอบ · ข้อมูลรอบ: เครื่อง ทีม-วัน งบรอบ เอกสารหลังรอบ วางบิลตามรอบ · ตัวเลขทั้งหมดจาก `estimateContract` เดียวกัน (builder ส่ง event `sbp:builder`) · A: ช่องว่างในกริดการ์ดเป็นวงแหวนเดือน · reduced motion = ภาพนิ่ง · ⚠️ class prefix `yp-` (`.ap` เป็นของ addrpick)
- ✅ **การ์ดวัสดุแต่ละยี่ห้อ** (`matcards.js`, ใน `#quality` ต่อจากโชว์รูม 3D): ภาพตัดเคลื่อนไหว 7 วัสดุ (ทองแดงรับแรงดัน · ฉนวนกันหยดน้ำเทียบไม่หุ้ม · ฝารางปิด · กระแสใน 3 สาย · น้ำไหลตามแนวลาด · ยางซับแรงสั่น · RCBO ตัดไฟรั่ว 30 mA) + สเปก (จาก `matdata.MATS` — ย้ายจาก materials3d) + "ตรวจของจริงหน้างานอย่างไร" (`CHECK`) · ช่องรูปสินค้าทางการ `MAT_PHOTOS` **ว่าง** จนกว่าได้รับอนุญาตจากเจ้าของแบรนด์ (กฎ 14 — ไม่ดาวน์โหลดรูป/โลโก้)
- ✅ **ภาพเคลื่อนไหวอาการแอร์และความรู้** (`animicons.js`): 14 อาการ (ภาพใหญ่ในการ์ดคัดกรอง + ไอคอนเล็กในรายการ) · 12 หัวข้อความรู้ · SVG + CSS ไม่ใช้ WebGL · เป็นภาพประกอบ ไม่ใช่การวินิจฉัย
- ทดสอบ: `npm run tradein` (เป้าหมาย/บันทึก/ถาม-ตอบ) · `npm run allservices` (หมวด · ค่าเข้างาน · การ์ดวัสดุ) · `tests/enterprise.mjs` (`planMonths`) + CI
- ⏳ รอเจ้าของ: ตัวเลขค่าเข้างานงานย่อย (ดูรายงาน) · รูปสินค้า/โลโก้วัสดุทางการพร้อมหนังสืออนุญาต · ยืนยันข้อความ "ทีมช่างประจำของบริษัท ไม่ส่งต่องานให้ผู้รับเหมาช่วง"

### 7.1v ทำเสร็จ Rev.26.1 (4 ต.ค. 2569 — เจ้าของ: "ตรวจเช็คใหม่ทั้งระบบ test run และแก้ไขจุดที่ไม่ smooth ในการใช้งานทุกภาพและการเคลื่อนไหวของเว็บและทุกโมเดล")

- 🔎 **เครื่องมือวัดใหม่:** `npm run jank -- a.html [w h] [ids]` (`tests/jank.mjs`: ทุก section — long task บน main thread · เฟรมช้า · layout shift · error · ล้นแนวนอน ขณะเปิดและเลื่อนผ่าน) · `npm run inp -- a.html` (`tests/inp.mjs`: เวลาจากคลิกถึงเฟรมถัดไปของปุ่มที่ใช้บ่อย 11 จุด) · ผล: ทุกปุ่ม ≤ 120 ms (เกณฑ์ดี < 200 ms)
- ✅ **ภาพสินค้าไม่ค้างหน้า** (`product-media`): เข้ารหัสด้วย `toBlob` (async) แทน `toDataURL` · เรนเดอร์เมื่อเลิกเลื่อนจอและเบราว์เซอร์ว่าง (`lazy.quiet`) · เครื่องที่ไม่มี GPU จริง (software GL) เรนเดอร์ 720×480 เงา 1024 · ถอดรหัสภาพก่อนสลับจากภาพลายเส้น + fade-in (เดิมภาพสูง 0 px ชั่วขณะ หน้ากระโดด) · คืน GL context หลังว่าง 5 วิ (เดิม 1.5 วิ สร้าง/คืนซ้ำ)
- ✅ **ฉาก 3 มิติบูตไม่กระตุก** (`gl-pool.track` — ใช้กับทุก renderer): ปิด `checkShaderErrors` (อ่าน log shader แบบ sync หลัง compile ทุกครั้ง — ค้าง 1–4 วิ ตอนบูตฉาก; เปิดได้ด้วย `?glcheck`) · เฟรมแรกของแต่ละ scene compile แบบ async (`compileAsync` เมื่อมี `KHR_parallel_shader_compile`; เฉพาะการวาดลงจอ — PMREM/render target ไม่ถูกหน่วง) · canvas ค่อย ๆ จางเข้าเมื่อเฟรมแรกพร้อม · **ทุกฉากบูตเมื่อเลิกเลื่อน** (`lazy.whenQuiet`: หยุดเลื่อน 220 ms + idle, ไม่เกิน 1.5 วิ) — howitworks, materials, studio, system3d, techstory, throwsim, jobguide, roomfit และทุกตัวที่ใช้ `deferred`
- ✅ **หน้าไม่กระโดด (CLS):** แผนที่พื้นที่ให้บริการ (`areamap3d`) เดิมลบกล่องรอก่อนโหลดเสร็จ → ทั้งหน้าเลื่อนขึ้นลง (มือถือ A: CLS 0.586 → 0) · ตอนนี้กล่องรอ + คำอธิบายสีอยู่ที่เดิมจนแผนที่มาแทน
- ✅ **ภาพเคลื่อนไหว CSS เล่นเฉพาะตอนอยู่บนจอ** (`animicons.runWhenVisible` — ไอคอนอาการ/ความรู้ การ์ดวัสดุ) · แผนรายปีสร้างอาคาร SVG ครั้งเดียวต่อการตั้งค่า แล้วแก้เฉพาะสีที่เปลี่ยน (เดิมสร้างใหม่ทุกเฟรม) + สีเปลี่ยนแบบ transition
- ℹ️ ตัวเลข long task ในเครื่องทดสอบ (swiftshader ไม่มี GPU) ส่วนใหญ่เป็นงาน GPU จำลอง (compile shader / อ่านภาพ) — JS ของเว็บเองต่อ section < 300 ms · ต้องทดสอบมือถือจริงต่อ (B2)

### 7.1w ทำเสร็จ Rev.27 (5 ต.ค. 2569 — เจ้าของ: "ผมให้คุณตัดสินใจเลยโดยอ้างอิงข้อมูลราคากลางได้และใช้เป็นเรทนั้น ๆ แต่ละงาน")

- ✅ **`assets/rates.js`** (ไม่มี import · ข้อมูลล้วน): `DECIDED` 13 รายการ + `MOVE` (ย้ายแอร์ 21 แถวตามประเภท × ขนาด = ค่ารื้อ + ติดตั้งมาตรฐาน) + `SMALL_VISIT` (1,000) + `RATE_SOURCES` / `RATE_DATE` — ใส่ทับข้อมูล Pricebook ตอน `loadData` (`i.decided = 'm' | 'c' | 'k'`) · ตัวเลขและที่มาอยู่ใน §6.6 ข้อ 26
- ✅ ใช้ทุกจุด: ศูนย์ราคา (หมวดรื้อ ย้าย มีราคาแล้ว) · หน้าสินค้า (กลุ่ม "เครื่องเดิมและงานเจาะ" ใส่จำนวนได้) · ใบจอง `scope` (รื้อเครื่องเดิม / core drill มีราคา) · เทิร์นแอร์เก่า (รื้อ+ขน รวมในยอดก่อนหักมูลค่าเทิร์น · ไม่คิดเก็บน้ำยาซ้ำ · รีโนเวทแสดงค่าย้ายตามขนาด · ถาม-ตอบค่ารื้อเป็นตัวเลข) · งานบริการทั้งหมด (กติกาค่าเข้างาน + ที่มาของอัตรา) · FAQ 2 ข้อใหม่
- ✅ **ค่าเข้างานงานย่อย** `commerce.quoteTotals` → `visit`, `visitSmall`, `visitLabel` (ใบเสนอราคา + ข้อความสรุป) — ไม่คิดเมื่อมีงานล้าง/ติดตั้ง/ซ่อม/สัญญา หรือเป็นสินค้าอย่างเดียว
- ✅ ใบเสนอราคาที่บันทึกไว้ (`PRICE_V` 19): บรรทัด `S-<code>` ที่ตอนนี้มีราคา → `A-<code>` พร้อมราคา
- ✅ ค่าเดินทาง 300 + 10/กม. ยืนยันใช้ (§6.6 ข้อ 9)
- ทดสอบ: `npm run rates` (tests/rates.mjs 19 ข้อ) · `npm run tradein` · `npm run allservices` + CI
- ⏳ ยังไม่เปลี่ยน: ค่าบริการนอกเวลา (กฎ 22 — ตารางซ่อมใน Pricebook มี "งานกลางคืน/วันหยุด/เร่งด่วน" 2,000 อยู่แล้ว ถ้าต้องการใช้อัตราเดียวกับทุกงานแจ้งได้) · ฝ่ายขายนำอัตราข้อ 26 ไปใส่ Pricebook Excel

### 7.1x ทำเสร็จ Rev.28 (5 ต.ค. 2569 — เจ้าของ: "ตรวจเช็ค UX/UI และ Frontend ให้พัฒนาสูงสุด ภาพคมชัดสวยงาม animation และ motion สวยงามระดับสูงสุด")

- ✅ **ชั้น motion & finish ร่วมทุกแบบ** (ท้าย `shared.css`): token `--m-ease` (expo-out) · `--m-spring` (`linear()`) · `--m-fast/mid/slow` · เงาซ้อนชั้น `--e-1/2/3` · ปุ่มยุบเมื่อกด (`scale .97`) · การ์ดยกตัว + เงาเมื่อชี้ (เมาส์เท่านั้น ไม่ขยับ layout) · `<details>` เปิด/ปิดนุ่ม (`::details-content` + `interpolate-size`) · ตัวอักษรคม (`font-smoothing`, `text-wrap: balance/pretty`, ตัวเลข tabular) · selection/caret/focus ring สีแบรนด์ · ทุกอย่างปิดเมื่อ reduced motion · ไม่มี reveal ทีละ section (§5.4)
- ✅ **เพิ่มรายการแล้วรู้สึกได้:** ปุ่มใบเสนอราคา + ปุ่มลอยเด้ง (`.s-bump`, `commerce.mountCart`) · ยอดรวมจองล้างนับไหลไปค่าใหม่ (`quickclean tween`; ไม่ทำใน automation `navigator.webdriver`)
- ✅ **ปุ่มลอยไม่บังเนื้อหา:** บนคอม "ถามอาการแอร์" / "แชท LINE" เป็นวงกลม 52 px ป้ายเลื่อนออกเมื่อชี้/โฟกัส · ซ่อนขณะเปิดใบเสนอราคา (เดิมบังยอดรวมในส่วนจองล้าง)
- ✅ **header กระจกฝ้า + เงาเมื่อเลื่อน** (`html.sx-scrolled`, site.js) · เปลี่ยนหน้าแบบจางพร้อมเลื่อนเข้าที่ 8 px (`sxIn`) — ทดลอง View Transitions แล้วไม่ใช้ เพราะสลับหน้าแบบ async ชนกับการเลื่อนไปหัวข้อ
- ✅ **แบบ B:** เมนู 6 หน้ามีแถวของตัวเองในทุกจอคอม (เดิมถูกตัดที่ 1366 "04 ความรู้ · ล…") · `--cg-top: 108px`
- ✅ **ลมในตัวเครื่อง 3 มิติหน้าแรก** (`ac3d.makeFlow`): เส้นน้อยลง โปร่งขึ้น สีนวล (เดิมแบบสว่างดูเหมือนฝน ลมอุ่นแบบ C ดูเหมือนเปลวไฟ)

### 7.1y ทำเสร็จ Rev.29 (5 ต.ค. 2569 — เจ้าของ: "เพิ่มอีก 3 โมเดลแตกออกมาแบบไม่เหมือน A/B/C … แยกเป็นสองเว็บไซต์ … ในมุมของการใช้บริการที่เราเข้าใจลูกค้าจริง ๆ … ภาพที่สมจริง 5D 4D 3D … Cinematic … Mood & tone … Luxury premium ultra … ต้องมีภาพ animation ครบทุกโมเดลให้ทดลอง")

- ✅ **เว็บไซต์ชุดที่ 2 (D · E · F)** — ทุกฟีเจอร์ของชุดแรกครบ (จองล้าง ใบเสนอราคา/ใบจอง แคตตาล็อก เทิร์น ห้องจำลอง ลองวาง ทีมช่าง อาการ มาตรฐาน ราคา วัสดุ องค์กร/สัญญา ความรู้ พื้นที่ FAQ ติดต่อ) ผ่าน **โมดูลเดิมชุดเดียว** (กฎราคา §6.6 แหล่งเดียว) · ต่างกันที่หน้าเว็บ ภาษาภาพ ลำดับหน้า น้ำเสียงข้อความ และชิ้นเด่นด้านบน
  - `assets/lux-site.js` `mountLux(cfg)` — wiring ร่วม + สร้าง markup ที่ซ้ำ (กรอบแคตตาล็อก ตัวคำนวณสัญญา แผงพื้นที่ ฟอร์มติดต่อ) · `cfg.hero(ctx)` ติดตั้งชิ้นเด่นของแต่ละแบบ
  - `assets/lux.css` — layout ร่วม + 3 art direction ด้วย `<html data-lux="D|E|F">` (token `--s-*` / motion Rev.28 เหมือนเดิม)
  - `d/e/f.html` **สร้างจาก `tools/make-lux.py`** (`npm run lux:gen`) — แก้ข้อความ/ลำดับ/hero ที่สคริปต์ ไม่แก้ไฟล์ html ตรง
- ✅ **D · Cinema** (ดำ obsidian · ทองแชมเปญ · ลมฟ้าน้ำแข็ง · Kanit บาง) — `assets/cinema3d.js` ภาพยนตร์สั้น 5 บทเลื่อนตามการเลื่อนจอ (sticky + letterbox + grain + บท/scrubber): กล้องบินจากถนนยามพลบค่ำผ่านหน้าต่างเข้าห้องนอนคอนโด → ลมอ่อนแรง → เปิดฝาหน้า ฝุ่นที่แผ่นกรอง/คอยล์ → ช่างล้าง (เส้นกวาด + ละอองน้ำ) → ลมกลับมา ห้องเย็น · ตัวเลขอุณหภูมิจาก `studio-model.thermal/stepT` ห้อง condobed 12,000 BTU คอยล์สกปรก 0.75 vs สะอาด 0.05 ช่วง 15 นาทีเท่ากัน ("แบบจำลอง" เสมอ) · `assets/luxroom3d.js` ห้องหรู (ไม้ระแนง ผนัง greige เมือง dusk/day ซุ้มหน้าต่างบรอนซ์ ระเบียงกระจก ตัวเครื่อง FUJIVA — ฉากสินค้า ไม่ใช่ฉากงานช่าง)
- ✅ **E · Atelier** (งาช้าง · บรอนซ์ · เขียวเสจ · เรียบแบบ editorial) — `assets/atelier.js`: **ปรึกษาบริการ 4 คำถาม** (ที่ไหน กี่เครื่อง กังวลอะไร เมื่อไร) → `planFor()` แผนเรียงลำดับ ตัวเลขจากค่าคงที่เท่านั้น (cleanFrom, `DATA.minBill`, `TRAVEL.baseFee`, `QUEUE_RULES`, `VOLUME_HINT` ข้อความอัตราพิเศษตามกฎ 3) + "ให้ทีมโทรกลับพร้อมแผนนี้" (askTeam) · จำคำตอบ `localStorage['sbp-concierge-v1']` · **ห้องนั่งเล่นตลอดวัน 2.5D ("4D" = เวลา 06:00–22:00)**: ท้องฟ้า ดวงอาทิตย์/จันทร์ ลำแสง ฝุ่นในแสง ผ้าม่าน ลมจากเครื่อง ไฟโคมกลางคืน parallax ตามเมาส์ · อุณหภูมิห้อง = `steadyT` ห้อง living ขนาดเครื่องตามที่ห้องจำลองแนะนำ อากาศนอก 29–35°C ตามช่วงวัน (แบบจำลอง)
- ✅ **F · Spatial** (มุกแก้ว · ออโรร่า ฟ้า-ม่วง-พีช · Kanit) — `assets/spatial3d.js` **ห้องจำลองลอยบนแท่นแก้ว หมุนด้วยมือ** + จุดเรืองแสง 4 จุด (คอยล์เย็น · คอยล์ร้อน · หน้าต่าง/แดด · คนในห้อง) พาไปหัวข้อที่เกี่ยวข้อง · **ห้องทดลองความเย็น "5D"** = 3 มิติ + เวลา (1 วินาที = 2 นาที, 90 นาที) + อากาศเป็นจุดสีตามอุณหภูมิ (jet เย็น ชั้นอุ่นใต้ฝ้า ฝั่งหน้าต่าง) + เสียงลมเมื่อกดเอง (WebAudio, ไม่เล่นเอง) · ปรับอากาศนอก จำนวนคน คอยล์สกปรก Inverter/Fixed เปิด/ปิด → อุณหภูมิห้องและเวลาถึง 25°C จาก `thermal/stepT/timeToSet` (แบบจำลอง)
- ✅ **สองเว็บไซต์ใน build เดียว** (`build.py`): `dist/art|offline|site/{d,e,f}.html` + หน้าทดสอบชุด 2 `index2.html` (`preview.html` อ่าน `SBP_SET`/`?set=def`; คะแนนเก็บแยก `sbp-preview2-v1`) · ลิงก์ "เทียบแบบ D · E · F" ในแต่ละหน้าไปหน้าทดสอบชุด 2 · sitemap เพิ่ม d/e/f/index2 · `urls*.json` key ใหม่ `d e f index2`
- ✅ ทดสอบ: `npm run lux` (tests/lux.mjs — แผนปรึกษา ห้องตลอดวัน ห้องทดลอง + คำต้องห้าม, อยู่ใน CI) · `smoke:2` / `smoke:2:mobile` / `textscan:2` · booking · submit · enterprise-ui · acbot ผ่านทั้ง D/E/F · `tests/film-shots.mjs` ภาพ 5 ตำแหน่งของภาพยนตร์ D · WebGL peak ≤ 3 ทุกหน้า (probe WebGL คืน context ทันที)
- ⏳ รอเจ้าของ: เลือกชุด/แบบที่จะใช้ · ภาพ/วิดีโอหน้างานจริงของทีม (ใส่แทนบางบทของภาพยนตร์ได้) · ทดสอบมือถือจริง (B2) โดยเฉพาะภาพยนตร์ D และห้องลอย F

### 7.2 บั๊ก / ปัญหาที่ยังค้าง (เรียงตามความสำคัญ)

| # | ปัญหา | ผลกระทบ | หลักฐาน / จุดที่ต้องดู |
|---|---|---|---|
| ~~B1~~ | ✅ **แก้แล้ว Rev.09** — `gl-pool.js` คุม live context ≤ 3 (เครื่อง `deviceMemory ≤ 2` = 2) · smoke ทุกหน้า: `webglPeak` ≤ 3 ทั้ง 1366 และ 390 · smoke นับใหม่จาก context ที่สร้างจริง (`webglCreated`) และที่ live (`webgl`) — context เลิกนับทันทีที่เรียก `loseContext()` (event มาช้าได้หลายวินาทีบน swiftshader) · ผ่านทั้งโหมดหลายไฟล์และไฟล์ build | ยังต้องทดสอบเครื่องจริง (B2) | `assets/gl-pool.js` · `tests/smoke.mjs` |
| B2 | **ยังไม่ทดสอบบนมือถือจริง** (ทดสอบแค่ headless swiftshader) — ไฟล์ละ ~2.3–2.4 MB + ฉาก 3 มิติหนัก | ความเร็วโหลด/เฟรมเรตบน Android ราคาประหยัดไม่ทราบ | ต้องทดสอบเครื่องจริง 2–3 รุ่น |
| B3 | **มุมกล้องบางขนาดจอ: ผนังกั้น/วงกบประตูบังช่างและราง** — เช่น ติดตั้งขั้น 4 ที่จอกว้าง ~1100 px ช่างบนบันไดโผล่เหนือผนังกั้น ดูไม่เป็นธรรมชาติ | ภาพดูแปลกในช่วงจอกลาง | `techstory.js` `CAMS.trunk` + ตัวคูณ R ของ `createStage` (`narrow ? 1.12 : aspect<1.4 ? 1.06 : 1`) · `node tests/story-shots.mjs out install 3 1100 760` |
| B4 | **backend Apps Script พร้อม แต่ยังไม่ deploy** — ตอนนี้ส่งอีเมลผ่าน FormSubmit · Rev.19: โค้ด + setup/selfTest + ตัวจำลอง + e2e 59/59 พร้อม · รอเจ้าของ deploy แล้วส่ง URL `/exec` (§7.1l) | รูปหน้างาน/คิวสด/ตรวจสถานะยังไม่เปิดจนกว่าจะ deploy | `contact.js handoffBox`, `site.js` §8, `commerce.js mountCart` |
| B5 | **สคริปต์แปลง Excel → `sbp-data.json` ไม่อยู่ใน repo** (ทำแบบ ad-hoc) | แก้ราคารอบหน้าต้องเขียนใหม่ เสี่ยงผิด | ดู §8 ข้อ 6 |
| B6 | `tools_recon.py` ต้องใช้ `internal/sbp_real.json` (มีอัตราพิเศษ/โครงการ — ไฟล์ภายใน ส่งแยกจาก zip) | รัน recon ไม่ได้ถ้าไม่มีไฟล์ | วางไฟล์ที่ `internal/` (gitignored) |
| B7 | ระยะทางใช้พิกัดแขวง/ตำบล (Wikidata 696 จุด) หรือที่ว่าการเขต/อำเภอ × 1.35 (Rev.20) | ค่าเดินทางคลาดได้ในพื้นที่ขอบโซน | production ใช้ Google Distance Matrix |
| B8 | axe-core ยังมีข้อสังเกตระดับ moderate บน A/B (C = 0) | ไม่ถึง AA เต็ม 100% | รัน axe ใหม่ |
| B9 | ไฟล์ legacy: `index.html`, `hub.tpl.html`, `hub.tpl2.html`, `hub-local.html` | สับสน | ลบหลังเจ้าของยืนยัน |
| B10 | หน้าทดสอบ (`dist/art/index.html`) 4 MB เพราะฝัง 3 แบบ (gzip+base64) | โหลดช้าบนมือถือ | ใช้ภายในเท่านั้น ไม่ขึ้นเว็บจริง |

### 7.3 เรื่องที่รอเจ้าของตัดสิน/ส่งข้อมูล (ห้ามเดา — ถ้าเจอให้ถามหรือข้าม)

1. **เลือกแบบ A / B / C** (หรือผสม)
2. **อนุมัตินำราคาใหม่ SBP-PRC-001 ขึ้นเว็บ** (ชุดเตรียมราคา 30 ก.ย. 2569 อยู่ใน Project docs) — ระบบตรวจความปลอดภัยของ Cowork ไม่อนุญาตให้แก้ราคาโดยไม่มีคำยืนยันชัดเจน
3. **ความหนาท่อ 7/8"** ในชุดเหมา PIP-PKG-3878 (แอร์ 49,000–60,000 BTU) และตารางความหนาท่อ R32 ตามคู่มือผู้ผลิต — ถ้าบางขนาดต้องหนากว่า 0.70 มม. ต้องเพิ่มรายการใน Pricebook
4. **ไฟล์โลโก้ทางการ + หนังสืออนุญาต** 6 แบรนด์วัสดุ
5. **ราคา FUJIVA ทุกรุ่น** (แบรนด์บริษัท ยังไม่อยู่ใน Pricebook)
6. Pricebook ต้นทางยังเขียน "K Copper" 28 จุด — ต้องแก้เป็น O-TWO ให้ตรงเว็บ
7. หัวหน้าช่างอ่านทวนขั้นตอนช่าง 4 งาน · ภาพถ่ายงานจริงของทีม (งานละ 3–5 ภาพ)
8. อัตราฝุ่น/ตัวคูณแดดในห้องจำลองเป็นค่าตั้งต้น ควรปรับจากข้อมูลงานล้างจริง (ค่าก่อน–หลังล้าง T2 20–30 เครื่อง)
9. ห้องน้ำ / ห้องพักผู้ป่วย / ห้องควบคุมพิเศษ — บริษัทรับขอบเขตไหน (ตอนนี้ขึ้น "ต้องสำรวจก่อน")
10. ★Rev.09 **รูปสินค้าจริง** ทุกรุ่น/ซีรีส์ (วาง `assets/products/` + `product-media.json`) และรูป FUJIVA
11. ★Rev.09 **ขนาดคอยล์เย็น (indoorDim)** ขาด 541 จาก 705 รุ่น — ห้องจำลองติดตั้งใช้ขนาดประมาณแทน · ค่า `maxPipe` / `maxLift` ยังว่างทุกรุ่น
12. ★Rev.09 หัวหน้าช่างตรวจ `FIT_RULES` (ระยะห่างฝ้า/ผนัง ความสูงติดตั้ง ระยะลม) และเนื้อหาศูนย์ความรู้ 12 หัวข้อ
13. ★Rev.09 r4 หัวหน้าช่างตรวจ `CLEAN_HOW` / `INSTALL_HOW` (วิธีทำต่อประเภท) และการแบ่งงานช่างหัวหน้า/ผู้ช่วยในส่วน "ทีมช่าง" · ~~ไฟล์โลโก้ FUJIVA / SBP~~ ✅ Rev.12 ได้รับแล้ว
14. ★Rev.09 r5 **ยืนยันข้อมูลบริษัท** (`COMPANY`): ที่อยู่ 593 ถ.พระราม 2 (ข้อความส่วนพื้นที่ยังเขียน "พระราม 2 ซอย 31" — ตรงกันไหม) · ~~เลขผู้เสียภาษี · LINE OA~~ ✅ Rev.10 · ~~เวลาทำการ · โลโก้บริษัท~~ ✅ Rev.12 · **ยังรอ:** ภาพทีม/หน้างานจริง · จำนวนค่าบริการนอกเวลา (ถ้าต้องการแสดงบนเว็บ)

---

## 8. Next Steps (Immediate Roadmap)

> ทำตามลำดับ แต่ละข้อจบด้วย Definition of Done (§6.7) และ commit แยก

**Step 1 — ตั้ง repo และยืนยัน baseline (ครึ่งวัน)**
1. แตก zip → `git init` → commit baseline
2. วาง `internal/sbp_real.json` (ไฟล์ภายในที่ส่งแยก)
3. `npm install && npx playwright install chromium`
4. รัน `npm run smoke`, `smoke:mobile`, `textscan`, `recon` → ต้องผ่านครบ บันทึกผล (โดยเฉพาะจำนวน `webgl`) เป็นค่าอ้างอิง

**Step 2 — แก้ B1: จำกัด WebGL context ≤ 3 ต่อหน้า** ✅ ทำแล้ว Rev.09 (`gl-pool.js` ใช้ `WEBGL_lose_context` แทนการ dispose/สร้างใหม่ — ไม่ต้องแก้ทุกฉาก) — ข้อย่อยด้านล่างเป็นแผนเดิม
1. สร้าง `assets/gl-pool.js`: ตัวจัดการกลางที่ให้ฉากขอ/คืน renderer — เมื่อฉากออกนอกจอเกินระยะ (`rootMargin` ~1 หน้าจอ) ให้ `dispose()` ฉากและ `renderer.forceContextLoss()` แล้วสร้างใหม่เมื่อกลับมา (เก็บ state ขั้นปัจจุบันไว้)
2. ใช้กับ `ac3d.createACViewer`, `studio3d`, `howitworks3d`, `materials3d`, `thaimap3d`, `install3d.createStage` (techstory/system3d)
3. ยืนยันด้วย `tests/smoke.mjs`: `webgl ≤ 3` ทุกหน้า และไม่มี error · ตรวจว่ากลับขึ้นไปดูฉากเดิมแล้วยังอยู่ขั้นเดิม

**Step 3 — แก้ B3: มุมกล้องช่วงจอกลาง**
1. ไล่ถ่าย `tests/story-shots.mjs` ทุกเรื่อง ทุกขั้น ที่ 1366×900, 1100×760, 820×1180, 390×844
2. ปรับ `CAMS` / ตัวคูณระยะใน `createStage` / ใช้ `ghost` หรือซ่อนผนังกั้นชั่วคราวในขั้นที่ช่างอยู่หลังผนัง
3. ตรวจด้วยตาทุกภาพ: ช่างไม่โผล่ทะลุผนัง, ป้ายไม่ทับ, จุดที่อธิบายเห็นชัด

**Step 4 — ทดสอบมือถือจริงและ fallback (B2)**
1. ทดสอบ Android ระดับล่าง 2–3 เครื่อง + iPhone (Safari) ผ่าน dev server ในวง LAN
2. ถ้าเฟรมเรต < ~24 fps: ลด `pixelRatio` เป็น 1, ปิดเงา, ลดจำนวนอนุภาค หรือแสดงภาพนิ่ง/วิดีโอแทนอัตโนมัติ (ตรวจด้วย `navigator.hardwareConcurrency`, `deviceMemory`)

**Step 5 — รอคำตัดสินเจ้าของ (§7.3) — อย่าเดา**
- ถ้าเจ้าของ **อนุมัติ SBP-PRC-001**: แก้ `sbp-data.json` ด้วยสคริปต์ (ไม่แก้มือ) → `recon` ต้อง 0 ผิดเทียบ extract ใหม่ → `textscan` → build
- ถ้าได้ **ไฟล์โลโก้**: วางใน `assets/logos/` → build → ตรวจภาพโชว์รูมวัสดุ

**Step 6 — สคริปต์นำเข้า Pricebook (B5)**
1. เขียน `scripts/import_pricebook.py` (openpyxl): อ่าน `ใบเสนอราคาติดตั้งแอร์ Final จริง.xlsx` + `ใบเสนอราคาล้างและซ่อม Final จริง.xlsx` → สร้าง `internal/sbp_real.json` (เต็ม) และ `assets/sbp-data.json` (สาธารณะ)
2. กฎกรองใน public: เฉพาะรุ่นสถานะอนุมัติ · `sp`/`pj` = null · ตัด `-MASS` · คงรูปแบบ `pool` + ลำดับคอลัมน์ `pf` ตาม §4.2 ทุกตัว
3. ยืนยัน: รันกับไฟล์ Excel ปัจจุบันแล้ว `assets/sbp-data.json` ต้องเหมือนเดิม (diff ว่าง หรือต่างเฉพาะลำดับที่ไม่มีผล) และ `recon` = 0

**Step 7 — เมื่อเจ้าของเลือกแบบแล้ว: ย้ายไป production (ตามแผน §4 + §11 ของ Handoff Plan)**
1. Next.js App Router + TypeScript; ยก `sbp-core.js` + `studio-model.js` เป็น `lib/domain/*.ts` พร้อม unit test (ราคา VAT, โซน, ค่าเดินทาง, สัญญา, BTU)
2. 3D เป็น client component โหลดแบบ dynamic (`ssr:false`) ใช้ gl-pool จาก Step 2
3. ข้อมูลราคาใน PostgreSQL/Supabase นำเข้าด้วยสคริปต์ Step 6
4. API ใบเสนอราคา: คำนวณยอดซ้ำฝั่ง server, บันทึก Lead, แจ้ง LINE OA/อีเมลทีมขาย (แก้ B4)
5. Google Distance Matrix สำหรับระยะทาง (แก้ B7) · Analytics funnel (เพิ่มลงใบเสนอราคา, ส่งคำขอ, ใช้ตัวคำนวณสัญญา, ตรวจพื้นที่)
6. SEO: SSG หน้าสินค้า 705 รุ่น + schema.org Product/Offer (ราคารวม VAT)

### Prompt แรกที่แนะนำให้พิมพ์ใน Claude Code

```
อ่าน CLAUDE.md ให้ครบก่อน แล้วทำ Step 1 (ตั้ง repo + รัน baseline ทั้ง 4 ชุด) รายงานผลเป็นตาราง
จากนั้นเสนอแผนแก้ B1 (WebGL context ≤ 3 ต่อหน้า) ตาม Step 2 — ยังไม่ต้องแก้โค้ด จนกว่าฉันจะอนุมัติแผน
ห้ามแก้ราคาหรือกฎธุรกิจใน §6.6 ทุกข้อ ตอบเป็นภาษาไทย
```

---

_จบเอกสาร · อ้างอิงเพิ่มเติม: `SBP-WEB-011_Dev_Handoff_Plan.md` (§0 คำตัดสินเจ้าของ 19 ข้อ, §6A–6V สเปกทุกฟีเจอร์, §12 Acceptance checklist, §13 เรื่องค้าง)_
