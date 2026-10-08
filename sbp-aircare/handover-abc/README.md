# ส่งมอบ Dev — เว็บ SBP AirCare แบบ A · B · C

> เริ่มที่ไฟล์นี้ · บริษัท สหบูรพากรุ๊ป จำกัด · SBP AirCare · Rev.47 (8 ต.ค. 2569)
> เจ้าของสั่งพัฒนาเฉพาะแบบ A · B · C — โฟลเดอร์นี้คือทุกอย่างที่ Dev ต้องใช้

## ส่งให้ Dev อย่างไร (เลือกทางใดทางหนึ่ง)

**ทาง 1 — ส่งลิงก์โฟลเดอร์นี้ (ง่ายที่สุด)**
คัดลอกลิงก์นี้ส่งทาง LINE หรืออีเมล Dev เปิดแล้วเห็นไฟล์ทั้งหมด กดดาวน์โหลดได้เลย

https://github.com/sahaburapaofficial-cmyk/Sahaburapa-project/tree/claude/sbp-rev13/sbp-aircare/handover-abc

**ทาง 2 — ส่งไฟล์ zip ไฟล์เดียว (15 MB)**
ลิงก์ดาวน์โหลดตรง: https://github.com/sahaburapaofficial-cmyk/Sahaburapa-project/raw/claude/sbp-rev13/sbp-aircare/handover-abc/SBP-AirCare-ABC-Dev.zip
หรือแนบไฟล์ `SBP-AirCare-ABC-Dev.zip` ในโฟลเดอร์นี้ไปกับอีเมล / Google Drive

**ทาง 3 — ให้ Dev ดึงโค้ดจาก GitHub (สำหรับ Dev ที่จะพัฒนาต่อ)**

```bash
git clone -b claude/sbp-rev13 https://github.com/sahaburapaofficial-cmyk/Sahaburapa-project.git
cd Sahaburapa-project/sbp-aircare
```

โค้ดอยู่ที่ branch `claude/sbp-rev13` (ยังไม่ได้รวมเข้า `main`)

## ในโฟลเดอร์นี้มีอะไร

| ไฟล์ | คืออะไร | ใครใช้ |
|---|---|---|
| `SBP-AirCare-ABC-Dev.zip` | **แพ็กเกจครบ**: เว็บ 3 แบบเปิดได้ทันที (`open-me/`) · ซอร์สโค้ดทั้งหมด (`source/`) · ข้อมูล (`data/`) · เอกสาร (`docs/`) | Dev — ส่งไฟล์นี้ไฟล์เดียวก็พอ |
| `dev-check.html` | รายการตรวจรับงาน (เปิดในเบราว์เซอร์ มีช่องติ๊ก กรองตามแบบ A/B/C) | Dev / ผู้ตรวจรับ |
| `verify-abc-summary.md` | ผลตรวจอัตโนมัติล่าสุด: ผ่าน 69 · ไม่ผ่าน 0 · ข้าม 1 | Dev |
| `data/products.csv` | แอร์ 705 รุ่น ราคาเครื่อง ราคาติดตั้ง สเปก | เปิดใน Excel ได้ |
| `data/install-and-materials.csv` | งานติดตั้ง วัสดุ รื้อ/ย้าย 185 รายการ พร้อมที่มาของราคา | |
| `data/cleaning.csv` | ราคาล้าง 234 รายการ (ราคาบนเว็บ + ราคา Pricebook) | |
| `data/repair.csv` | งานซ่อม 86 รายการ | |
| `data/decided-rates.csv` | อัตราที่บริษัทกำหนด 13 รายการ | |
| `data/travel-by-subdistrict.csv` | ค่าเดินทาง 1,714 แขวง/ตำบล | |
| `data/constants.json` | ค่าคงที่ทั้งหมด: VAT ขั้นต่ำ ค่าเดินทาง คิวด่วน ค่าตรวจ ข้อมูลบริษัท | |

ทุกจำนวนเงินเป็นราคาก่อน VAT · ไม่มีอัตราพิเศษ ต้นทุน หรือกำไรในโฟลเดอร์นี้

## ไฟล์โค้ดหลัก (ลิงก์ GitHub)

ฐานลิงก์: `https://github.com/sahaburapaofficial-cmyk/Sahaburapa-project/blob/claude/sbp-rev13/sbp-aircare/`

| ไฟล์ | หน้าที่ |
|---|---|
| [`a.html`](../a.html) · [`b.html`](../b.html) · [`c.html`](../c.html) | หน้าเว็บ 3 แบบ: markup + สีของแบบ + สคริปต์ต่อโมดูล |
| [`assets/sbp-core.js`](../assets/sbp-core.js) | **กฎธุรกิจและราคาทั้งหมด** (VAT ค่าเดินทาง ขั้นต่ำ คิว ข้อมูลบริษัท สัญญารายปี) |
| [`assets/sbp-data.json`](../assets/sbp-data.json) | ข้อมูลราคา Pricebook สาธารณะ (ต้นทางของ `data/`) |
| [`assets/rates.js`](../assets/rates.js) | อัตราที่บริษัทกำหนดเพิ่ม (รื้อ ย้าย เติมน้ำยา ค่าเข้างานงานย่อย) |
| [`assets/site.js`](../assets/site.js) | เมนู 6 หน้า และเส้นทางลูกค้า |
| [`assets/commerce.js`](../assets/commerce.js) · [`ticket.js`](../assets/ticket.js) · [`submit.js`](../assets/submit.js) | ใบเสนอราคา · ใบจองงาน · ส่งคำขอถึงทีม |
| [`assets/quickclean.js`](../assets/quickclean.js) | จองล้าง 3 ขั้น |
| [`assets/servicepath.js`](../assets/servicepath.js) | ทางเข้า 3 บริการ + ขั้นตอนบริการทีละขั้น |
| [`assets/acdiag.js`](../assets/acdiag.js) · [`acbot.js`](../assets/acbot.js) | คัดกรองอาการแอร์ 14 อาการ + ผู้ช่วย |
| [`assets/enterprise.js`](../assets/enterprise.js) · [`boq.js`](../assets/boq.js) | สัญญาองค์กร 7 ประเภท · BOQ (แบบ B) |
| [`assets/studio.js`](../assets/studio.js) · [`studio-model.js`](../assets/studio-model.js) | ห้องจำลอง 48 ห้อง (สูตร BTU ค่าไฟ ฝุ่น) |
| [`backend/apps-script/Code.gs`](../backend/apps-script/Code.gs) | หลังบ้าน Google Sheet + Drive + LINE (พร้อม แต่ยังไม่ deploy) |
| [`build.py`](../build.py) | สร้างเว็บไฟล์เดียว / เว็บสำหรับโฮสต์ |
| [`tools/verify-abc.mjs`](../tools/verify-abc.mjs) | ตรวจทั้งหมดของ A/B/C คำสั่งเดียว |

เอกสารเชิงลึก: [`CLAUDE.md`](../CLAUDE.md) (สเปก + กฎธุรกิจ §6.6 ที่ห้ามแก้) · [`HANDOFF.md`](../HANDOFF.md) · [`DEV_CHECK_ABC.md`](../DEV_CHECK_ABC.md)

## Dev เริ่มงาน

ต้องมี Python 3.11 · Node 22 · Playwright 1.56 (Chromium)

```bash
npm install && npx playwright install chromium
npm run serve &              # http://localhost:8765/a.html  b.html  c.html
npm run verify:abc -- quick  # ตรวจย่อ ~30 นาที (เต็มชุด: npm run verify:abc)
npm run build                # dist/offline/{a,b,c,index}.html + dist/site/
python3 tools/pack-abc.py    # สร้างโฟลเดอร์นี้ + zip ใหม่ หลังแก้งาน
```

## ยังรอ (ไม่ใช่บั๊ก)

- **ไฟล์ราคาภายใน** `internal/sbp_real.json` — ใช้เทียบราคาเว็บกับ Pricebook (`npm run recon`) · ไม่อยู่ใน GitHub เพราะมีอัตราพิเศษ ให้บริษัทส่งให้ Dev แยกทางที่ปลอดภัย
- deploy Google Apps Script แล้วใส่ URL ใน `assets/submit.js` (`BACKEND_URL`) — รูปหน้างาน คิวสด ตรวจสถานะ จะเปิดใช้
- ทดสอบบนมือถือจริง 2–3 รุ่น
- ราคา FUJIVA · รูปสินค้าจริง · โลโก้วัสดุพร้อมหนังสืออนุญาต · หัวหน้าช่างตรวจขั้นตอน
