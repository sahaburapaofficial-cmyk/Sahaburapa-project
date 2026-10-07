# SBP AirCare · แพ็กเกจส่งมอบ Dev — เว็บไซต์ 3 แบบ A · B · C

> บริษัท สหบูรพากรุ๊ป จำกัด · SBP AirCare · Rev.47 (7 ต.ค. 2569)
> เจ้าของสั่ง "พัฒนาแค่ A B C" — แพ็กเกจนี้มีเฉพาะแบบ A · B · C (แบบ D · E · F ไม่อยู่ในแพ็กเกจ)
> ไฟล์นี้สร้างโดย `tools/pack-abc.py` จาก repo `sahaburapaofficial-cmyk/Sahaburapa-project` โฟลเดอร์ `sbp-aircare/`

## ในแพ็กเกจมีอะไร

| โฟลเดอร์ | เนื้อหา | ใช้ทำอะไร |
|---|---|---|
| `open-me/` | `a.html` `b.html` `c.html` `index.html` — เว็บแต่ละแบบเป็นไฟล์เดียว (ข้อมูล ภาพ ฟอนต์ three.js อยู่ในไฟล์) | ดับเบิลคลิกเปิดได้ทันที ไม่ต้องติดตั้งอะไร · `index.html` = หน้าทดสอบเทียบ 3 แบบ |
| `source/` | ซอร์สโค้ดครบของ A · B · C: หน้า HTML, `assets/` (JS ES modules, CSS, ข้อมูล, ฟอนต์, โลโก้, ภาพ 3 มิติ), `tests/`, `tools/`, `backend/` (Google Apps Script), `build.py`, `package.json` | พัฒนาต่อ / build / รันเทสต์ |
| `data/` | ข้อมูลทั้งหมดที่หน้าเว็บใช้ **ตามที่ลูกค้าเห็นจริง** เป็น CSV (เปิดใน Excel ได้) + `constants.json` | ตรวจราคา ตัวเลข กฎ โดยไม่ต้องอ่านโค้ด |
| `docs/` | `DEV_CHECK_ABC.md` (รายการตรวจละเอียด) · `dev-check.html` (เวอร์ชันเว็บ มีช่องติ๊ก) · `CLAUDE.md` (สเปกเชิงลึก กฎธุรกิจ §6.6) · `HANDOFF.md` · `verify-abc-summary.md` (ผลตรวจอัตโนมัติล่าสุด) | อ่านก่อนเริ่ม / ใช้ตรวจรับงาน |

### `data/`

| ไฟล์ | แถว | คืออะไร |
|---|---|---|
| `products.csv` | 705 | แอร์ทุกรุ่นที่อนุมัติ: ประเภท แบรนด์ ซีรีส์ รุ่น BTU ราคาเครื่อง ราคาติดตั้งมาตรฐาน สเปก |
| `install-and-materials.csv` | 185 | งานติดตั้ง อุปกรณ์เสริม วัสดุ รื้อ/ย้าย พร้อมราคาบนเว็บและที่มาของราคา (Pricebook / ปัดหลักร้อย / rates.js / ประเมินหน้างาน) |
| `cleaning.csv` | 234 | ล้าง 3 แพ็กเกจ × C1/C2 × ประเภท × ขนาด: ราคาบนเว็บ (ปัดขึ้นหลักร้อย) และราคา Pricebook |
| `repair.csv` | 86 | งานซ่อม: ราคาบนเว็บ / Pricebook / "ประเมินหน้างาน" |
| `decided-rates.csv` | 13 | อัตราที่บริษัทกำหนดสำหรับรายการ Pricebook ที่เคยไม่มีราคา (กฎ 26) |
| `travel-by-subdistrict.csv` | 1,714 | ทุกแขวง/ตำบลในสมุดที่อยู่: ระยะถนนโดยประมาณ โซน ค่าเดินทาง (กฎ 9) |
| `constants.json` | — | VAT · ยอดขั้นต่ำ · ค่าเดินทาง · กฎคิว · ค่าเข้างานงานย่อย · เวลางาน · ข้อมูลบริษัท · ตารางเทิร์น · FIT_RULES · ค่าตรวจวินิจฉัย · 14 อาการ |

ทุกจำนวนเงินเป็น **ก่อน VAT** · VAT 7% คิดครั้งเดียวที่ยอดรวม · ไม่มีอัตราพิเศษ/โครงการ ต้นทุน หรือกำไรในแพ็กเกจนี้ (กฎ 3–4)

## เริ่มใช้งาน (source/)

ต้องมี Python 3.11 · Node 22 · (เทสต์) Playwright 1.56 + Chromium

```bash
cd source
npm install
npx playwright install chromium        # ครั้งแรกเท่านั้น
npm run serve &                         # dev server http://localhost:8765/a.html  b.html  c.html  preview.html
npm run verify:abc -- quick             # ตรวจย่อ ~30 นาที
npm run verify:abc                      # ตรวจทั้งหมด ~2–3 ชม. → verify-abc/summary.md
npm run build                           # → dist/offline/{a,b,c,index}.html (ไฟล์เดียว) + dist/site/ (เว็บหลายไฟล์สำหรับโฮสต์)
node tools/export-data.mjs              # ส่งออก data/ ใหม่ (หลังแก้ข้อมูล)
python3 tools/dev-check.py docs.html    # สร้างรายการตรวจ DEV_CHECK_ABC.md + หน้าเว็บใหม่จากผลล่าสุด
```

`npm run recon` (เทียบราคาเว็บกับ Pricebook 1:1) ต้องใช้ไฟล์ภายใน `internal/sbp_real.json` ซึ่ง**ไม่อยู่ในแพ็กเกจ** (มีอัตราพิเศษ/โครงการ — ห้ามเผยแพร่) ขอจากบริษัทแยกต่างหาก

## สถาปัตยกรรมย่อ

- Vanilla HTML/CSS/JS (ES modules) ไม่มี framework · three.js r170 (vendored) สำหรับภาพ 3 มิติ · ไม่มี database
- แต่ละหน้า (`a.html` `b.html` `c.html`) = markup + CSS token ของแบบ + `<script type="module">` ตัวเดียวที่ mount โมดูลจาก `assets/`
- กฎธุรกิจและราคาอยู่ที่เดียว: `assets/sbp-core.js` (+ `rates.js`) อ่าน `assets/sbp-data.json` (Pricebook สาธารณะ)
- เมนู 6 หน้า: `assets/site.js` · ใบเสนอราคา/ใบจอง: `commerce.js` `ticket.js` `submit.js` · หลังบ้าน: `backend/apps-script/Code.gs` (ยังไม่ deploy — ตอนนี้ส่งทางอีเมลผ่าน FormSubmit)
- รายละเอียดทุกโมดูล (exports, สัญญา 3 มิติ, กฎ §6.6, Definition of Done) ใน `docs/CLAUDE.md`

## ตรวจรับงาน

เปิด `docs/dev-check.html` หรือ `docs/DEV_CHECK_ABC.md` — ไล่ตามลำดับ: ตัวเลขที่ต้องตรง → หน้าเว็บทีละหน้า → ทุกหน้า → เส้นทางลูกค้า (คอม + มือถือ) → กฎธุรกิจ → หลังบ้าน

## ยังรอ (ไม่ใช่บั๊ก)

- deploy Google Apps Script แล้วใส่ URL `/exec` ที่ `assets/submit.js` → `BACKEND_URL` (รูปหน้างาน คิวสด ตรวจสถานะ จะเปิดเอง)
- ทดสอบบนมือถือจริง (ทดสอบแล้วเฉพาะเบราว์เซอร์จำลองที่ไม่มีการ์ดจอ)
- ราคา FUJIVA · รูปสินค้าจริง · โลโก้วัสดุพร้อมหนังสืออนุญาต · หัวหน้าช่างตรวจขั้นตอน · เจ้าของเลือกแบบ
