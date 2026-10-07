# SBP AirCare · ส่งมอบ Dev — ตรวจเว็บ A · B · C

> ★Rev.47 · 7 ต.ค. 2569 · เจ้าของ: "พัฒนาแค่ A B C พอ" — เอกสารนี้ใช้ตรวจว่าทุกอย่างของแบบ A · B · C ทำงานถูกต้อง
> สร้างจาก `tools/dev-check-data.py` ด้วย `python3 tools/dev-check.py` · สเปกเชิงลึกอยู่ใน `CLAUDE.md` (§6.6 กฎธุรกิจ)

## 0. เริ่มตรวจ

```bash
cd sbp-aircare && npm install
npm run serve &            # dev server :8765
npm run verify:abc         # ตรวจทั้งหมดของ A/B/C (~2–3 ชม. บนเครื่องไม่มีการ์ดจอ) → verify-abc/summary.md
npm run verify:abc -- quick              # ตรรกะ + คอม/มือถือ ต่อแบบ (~30 นาที)
npm run verify:abc -- only=workflow      # เฉพาะชุดที่ชื่อมีคำนี้
```

เปิดดูเว็บ: [A](https://claude.ai/artifact/65KfVJBy5imrW1DGbkyPpk) · [B](https://claude.ai/artifact/Fz5UMEs9RBLW19sLufhALD) · [C](https://claude.ai/artifact/PqG73huACDWwNrrN2h2bBz) · [compare](https://claude.ai/artifact/JeZMw4SjpNFrU9SxfqsDtb) · [pages](https://sahaburapaofficial-cmyk.github.io/Sahaburapa-project/) · [repo](https://github.com/sahaburapaofficial-cmyk/Sahaburapa-project/tree/claude/sbp-rev13/sbp-aircare)

| แบบ | ชื่อ | ไฟล์ | แนวคิด | จุดเด่นเฉพาะ |
|---|---|---|---|---|
| A | Bento Clean | `a.html` | แอปพรีเมียม สว่าง สะอาด · บ้าน/คอนโด | แอร์ของฉัน (myac) · ขั้นตอนล้างตามแบบฟอร์ม + ฝุ่นในเครื่อง (story, inside) · รีโมตจำลอง |
| B | Engineering Sheet | `b.html` | ชุดแบบวิศวกรรม · ฝ่ายอาคาร/จัดซื้อ/ผู้รับเหมา | เมนูมีเลข เรียงองค์กรก่อน · BOQ (boq) · ลำดับการทำงาน 3 มิติ 9 ขั้น (system3d) · แผงควบคุมห้อง |
| C | Virtual Showroom | `c.html` | โชว์รูม สินค้าเป็นแหล่งแสง · บ้าน/ร้าน | ลองวางบนผนังบ้าน (wallfit) · ช่างทำงาน 4 งานในบ้านจำลอง (techstory) · แผงสัมผัสกระจก |

## 1. ผลตรวจอัตโนมัติล่าสุด

`2026-10-07T19:21:14.109Z` · commit `2e0203f` · **pass 69 · FAIL 0 · skip 1**

| ผล | แบบ | การตรวจ | วินาที | หมายเหตุ |
|---|---|---|---|---|
| pass | - | accuracy · ตัวเลขตามกฎเจ้าของ §6.6 | 3 | ALL PASS |
| pass | - | rates · อัตราที่บริษัทกำหนด (rates.js) | 0 | ALL PASS |
| pass | - | acdiag · คัดกรองอาการ 14 อาการ | 0 | ALL PASS |
| pass | - | review · ค่าเพิ่มงานติดตั้งรายเครื่อง / เวลางาน | 0 | ALL PASS |
| pass | - | tradein · เทิร์นแอร์เก่า | 0 | ALL PASS |
| pass | - | allservices · งานบริการทั้งหมด + ค่าเข้างาน | 0 | ALL PASS |
| pass | - | enterprise · สัญญาตัวอย่าง 7 ประเภท | 0 | ALL PASS |
| pass | - | rev35 · BOQ + แอร์ของฉัน | 0 | ALL PASS |
| skip | - | recon · ราคาเว็บเทียบ Pricebook | 0 | ต้องมี internal/sbp_real.json (ไฟล์ภายใน ไม่อยู่ใน repo) |
| pass | ABC | backend · Apps Script จำลอง ทุกแบบ | 158 | 95/95 PASS |
| pass | A | smoke · คอม 1366 | 155 | {"page":"a.html","w":1366,"views":6,"height":52498,"canvases":12,"webgl":0,"webglPeak":3,"webglCreated":15,"overflowX":false,"errors":0} |
| pass | B | smoke · คอม 1366 | 124 | {"page":"b.html","w":1366,"views":6,"height":49771,"canvases":12,"webgl":0,"webglPeak":3,"webglCreated":14,"overflowX":false,"errors":0} |
| pass | C | smoke · คอม 1366 | 141 | {"page":"c.html","w":1366,"views":6,"height":51456,"canvases":11,"webgl":0,"webglPeak":2,"webglCreated":13,"overflowX":false,"errors":0} |
| pass | A | smoke · มือถือ 390 | 192 | {"page":"a.html","w":390,"views":6,"height":100662,"canvases":12,"webgl":0,"webglPeak":2,"webglCreated":15,"overflowX":false,"errors":0} |
| pass | B | smoke · มือถือ 390 | 183 | {"page":"b.html","w":390,"views":6,"height":99628,"canvases":12,"webgl":0,"webglPeak":2,"webglCreated":14,"overflowX":false,"errors":0} |
| pass | C | smoke · มือถือ 390 | 188 | {"page":"c.html","w":390,"views":6,"height":97967,"canvases":11,"webgl":0,"webglPeak":2,"webglCreated":13,"overflowX":false,"errors":0} |
| pass | A | textscan · คำต้องห้าม | 87 | clean |
| pass | B | textscan · คำต้องห้าม | 68 | clean |
| pass | C | textscan · คำต้องห้าม | 75 | clean |
| pass | A | booking · จองล้าง 3 ขั้น | 20 | {"page":"a.html","w":1366,"start":1070,"startTravel":1,"quick":7490,"cart":{"n":2,"qty":3,"zone":"อ.ศรีราชา จ.ชลบุรี","date":"2026-11-20"},"cartTotal":7490,"aga |
| pass | B | booking · จองล้าง 3 ขั้น | 17 | {"page":"b.html","w":1366,"start":1070,"startTravel":1,"quick":7490,"cart":{"n":2,"qty":3,"zone":"อ.ศรีราชา จ.ชลบุรี","date":"2026-11-20"},"cartTotal":7490,"aga |
| pass | C | booking · จองล้าง 3 ขั้น | 20 | {"page":"c.html","w":1366,"start":1070,"startTravel":1,"quick":7490,"cart":{"n":2,"qty":3,"zone":"อ.ศรีราชา จ.ชลบุรี","date":"2026-11-20"},"cartTotal":7490,"aga |
| pass | A | submit · ส่งฟอร์ม 3 โหมด | 70 | } |
| pass | B | submit · ส่งฟอร์ม 3 โหมด | 63 | } |
| pass | C | submit · ส่งฟอร์ม 3 โหมด | 67 | } |
| pass | A | acbot · ผู้ช่วยตรวจอาการ → ใบจอง | 44 | a.html: ALL PASS |
| pass | B | acbot · ผู้ช่วยตรวจอาการ → ใบจอง | 35 | b.html: ALL PASS |
| pass | C | acbot · ผู้ช่วยตรวจอาการ → ใบจอง | 46 | c.html: ALL PASS |
| pass | A | enterprise-ui · แผงองค์กร | 13 | a.html: ALL PASS |
| pass | B | enterprise-ui · แผงองค์กร | 12 | b.html: ALL PASS |
| pass | C | enterprise-ui · แผงองค์กร | 17 | c.html: ALL PASS |
| pass | A | concierge · ปรึกษา 4 คำถาม | 29 | a.html: ALL PASS |
| pass | B | concierge · ปรึกษา 4 คำถาม | 31 | b.html: ALL PASS |
| pass | C | concierge · ปรึกษา 4 คำถาม | 38 | c.html: ALL PASS |
| pass | A | rev35-ui · แอร์ของฉัน / BOQ / ลองบนผนัง | 6 | a.html ALL PASS |
| pass | B | rev35-ui · แอร์ของฉัน / BOQ / ลองบนผนัง | 8 | b.html ALL PASS |
| pass | C | rev35-ui · แอร์ของฉัน / BOQ / ลองบนผนัง | 11 | c.html ALL PASS |
| pass | A | servicepath · ทางเข้า + ขั้นตอนบริการ คอม | 64 | a.html ALL PASS |
| pass | B | servicepath · ทางเข้า + ขั้นตอนบริการ คอม | 38 | b.html ALL PASS |
| pass | C | servicepath · ทางเข้า + ขั้นตอนบริการ คอม | 39 | c.html ALL PASS |
| pass | A | servicepath · มือถือ | 25 | a.html ALL PASS |
| pass | B | servicepath · มือถือ | 25 | b.html ALL PASS |
| pass | C | servicepath · มือถือ | 23 | c.html ALL PASS |
| pass | A | backpanel · ปุ่มย้อนกลับปิดแผง มือถือ | 42 | a.html: ALL PASS |
| pass | B | backpanel · ปุ่มย้อนกลับปิดแผง มือถือ | 31 | b.html: ALL PASS |
| pass | C | backpanel · ปุ่มย้อนกลับปิดแผง มือถือ | 64 | c.html: ALL PASS |
| pass | A | workflow · คลิกจริง คอม | 105 | {"page":"a.html","prof":"desktop","pass":8,"fail":0,"errors":0} |
| pass | B | workflow · คลิกจริง คอม | 87 | {"page":"b.html","prof":"desktop","pass":8,"fail":0,"errors":0} |
| pass | C | workflow · คลิกจริง คอม | 103 | {"page":"c.html","prof":"desktop","pass":8,"fail":0,"errors":0} |
| pass | A | workflow · แตะจริง มือถือ | 97 | {"page":"a.html","prof":"mobile","pass":9,"fail":0,"errors":0} |
| pass | B | workflow · แตะจริง มือถือ | 68 | {"page":"b.html","prof":"mobile","pass":9,"fail":0,"errors":0} |
| pass | C | workflow · แตะจริง มือถือ | 106 | {"page":"c.html","prof":"mobile","pass":9,"fail":0,"errors":0} |
| pass | A | layout · 1366 | 78 | {"page":"a.html","w":1366,"total":{"off":0,"cut":0,"ell":1,"spill":0,"lap":0,"tap":0,"small":0,"zero":0,"head":0},"errors":0} |
| pass | B | layout · 1366 | 55 | {"page":"b.html","w":1366,"total":{"off":0,"cut":0,"ell":0,"spill":0,"lap":0,"tap":0,"small":0,"zero":0,"head":0},"errors":0} |
| pass | C | layout · 1366 | 63 | {"page":"c.html","w":1366,"total":{"off":0,"cut":0,"ell":0,"spill":0,"lap":0,"tap":0,"small":0,"zero":0,"head":0},"errors":0} |
| pass | A | layout · 820 | 61 | {"page":"a.html","w":820,"total":{"off":0,"cut":0,"ell":1,"spill":0,"lap":0,"tap":0,"small":18,"zero":0,"head":0},"errors":0} |
| pass | B | layout · 820 | 44 | {"page":"b.html","w":820,"total":{"off":0,"cut":0,"ell":0,"spill":0,"lap":0,"tap":0,"small":21,"zero":0,"head":0},"errors":0} |
| pass | C | layout · 820 | 57 | {"page":"c.html","w":820,"total":{"off":0,"cut":0,"ell":0,"spill":0,"lap":0,"tap":0,"small":21,"zero":0,"head":0},"errors":0} |
| pass | A | layout · 390 | 62 | {"page":"a.html","w":390,"total":{"off":0,"cut":0,"ell":4,"spill":0,"lap":0,"tap":0,"small":18,"zero":0,"head":0},"errors":0} |
| pass | B | layout · 390 | 68 | {"page":"b.html","w":390,"total":{"off":0,"cut":0,"ell":4,"spill":0,"lap":0,"tap":0,"small":21,"zero":0,"head":0},"errors":0} |
| pass | C | layout · 390 | 58 | {"page":"c.html","w":390,"total":{"off":0,"cut":0,"ell":3,"spill":0,"lap":0,"tap":0,"small":21,"zero":0,"head":0},"errors":0} |
| pass | A | axe · 1366 สว่าง | 74 | {"page":"a.html","w":1366,"theme":"light","critical":0,"serious":0,"moderate":0,"minor":0,"errors":0} |
| pass | B | axe · 1366 สว่าง | 73 | {"page":"b.html","w":1366,"theme":"light","critical":0,"serious":0,"moderate":0,"minor":0,"errors":0} |
| pass | C | axe · 1366 สว่าง | 90 | {"page":"c.html","w":1366,"theme":"light","critical":0,"serious":0,"moderate":0,"minor":0,"errors":0} |
| pass | A | axe · 1366 มืด | 89 | {"page":"a.html","w":1366,"theme":"dark","critical":0,"serious":0,"moderate":0,"minor":0,"errors":0} |
| pass | B | axe · 1366 มืด | 77 | {"page":"b.html","w":1366,"theme":"dark","critical":0,"serious":0,"moderate":0,"minor":0,"errors":0} |
| pass | C | axe · 1366 มืด | 83 | {"page":"c.html","w":1366,"theme":"dark","critical":0,"serious":0,"moderate":0,"minor":0,"errors":0} |
| pass | A | axe · 390 | 81 | {"page":"a.html","w":390,"theme":"light","critical":0,"serious":0,"moderate":0,"minor":0,"errors":0} |
| pass | B | axe · 390 | 74 | {"page":"b.html","w":390,"theme":"light","critical":0,"serious":0,"moderate":0,"minor":0,"errors":0} |
| pass | C | axe · 390 | 75 | {"page":"c.html","w":390,"theme":"light","critical":0,"serious":0,"moderate":0,"minor":0,"errors":0} |

## 2. ตัวเลขที่ต้องตรง

| รายการ | ค่าที่ต้องเห็น | ที่มา / กฎ | โค้ด |
|---|---|---|---|
| ล้างแอร์ เริ่ม | **฿700** | cleanFrom() — Basic Clean C1 ติดผนังเล็กสุด ปัดขึ้นหลักร้อย | `quickclean.js · sbp-core.cleanRate` |
| ยอดขั้นต่ำงานล้าง / การเข้างาน | **฿4,500** | ต่ำกว่านี้ = ค่าเดินทาง ฿300 แทนการเติมยอด (กฎ 8) | `sbp-data.json minBill · sbp-core.jobTravel` |
| ค่าเดินทาง | **฿300 + ฿10/กม. ที่เกิน 30 กม.** | พื้นที่หลัก = กทม. ≤ 30 กม. ไม่มีค่าเดินทางเมื่อถึงขั้นต่ำ · ≤ 150 กม. · เกิน = งานโครงการ · ปัดขึ้นหลักร้อย (กฎ 9) | `sbp-core.TRAVEL / zoneOf / travelFee` |
| ตัวอย่าง: ล้างติดผนัง 2 เครื่อง ในพื้นที่หลัก | **฿1,819 รวม VAT** | 2 × 700 + 300 = 1,700 × 1.07 | `tests/accuracy.mjs` |
| ตัวอย่าง: ล้าง 7 เครื่อง | **ไม่มีค่าเดินทาง** | 7 × 700 = 4,900 ≥ 4,500 | `tests/accuracy.mjs` |
| คิวด่วน (จองเร็วกว่า 3 วัน) | **+฿500 ต่อการเข้างาน** | ต้องมีคิว ทีมยืนยัน · ไม่นับรวมยอดขั้นต่ำ (กฎ 23) | `sbp-core.QUEUE_RULES` |
| จองปกติ | **ล่วงหน้า 3 วัน** | ตรงวันอาทิตย์เลื่อนเป็นวันจันทร์ | `queue.earliestNormal` |
| ค่าตรวจวินิจฉัย (ซ่อม) | **ติดผนัง ฿900 · แอร์ใหญ่ ฿1,200** | ไม่ซ่อมก่อนลูกค้าอนุมัติราคา (กฎ 13) | `acdiag.diagLine` |
| ค่าติดตั้ง ติดผนัง 9,000–12,000 BTU มาตรฐาน | **฿3,800** | รหัส INS-W-9000-12000-STANDARD · ท่อ 4 ม. แรกรวมในค่าติดตั้ง | `DATA.instByCode · roomfit.FIT_RULES` |
| ค่าเข้างานงานย่อย | **฿1,000** | เมื่อไม่มีงานล้าง/ติดตั้ง/ซ่อม/สัญญาวันเดียวกัน (กฎ 26) | `rates.SMALL_VISIT · commerce.quoteTotals` |
| VAT | **7% ครั้งเดียวที่ยอดรวม** | Math.round(ก่อน VAT × 1.07) · ทุกราคาบนหน้าเขียน "ก่อน VAT" (กฎ 1) | `sbp-core.incVat` |
| รับประกันงานติดตั้ง | **3 ปี / 1 ปี** | 3 ปีเมื่อซื้อเครื่องกับบริษัท · 1 ปีเมื่อลูกค้าจัดหาเครื่องเอง (กฎ 10) | `ข้อความ servicepath / standards` |
| แคตตาล็อก | **705 รุ่น · 22 แบรนด์** | เฉพาะรุ่นที่อนุมัติ (กฎ 5) | `sbp-data.json prods` |
| ศูนย์ราคา | **ติดตั้ง 167 · ซ่อม 86 รายการ** | ไม่มี -MASS · ไม่มี Type L · K Copper → O-TWO (กฎ 6–7) | `sbp-core.loadData` |
| สัญญาตัวอย่าง โรงพยาบาล | **฿332,800 / ปี** | estimateContract อัตรามาตรฐาน — workflow ขั้น 5 | `enterprise.js` |
| ห้องจำลอง | **48 ห้อง 9 กลุ่ม** | BTU / ค่าไฟ / ฝุ่น เป็นแบบจำลอง มีข้อความกำกับ | `studio-model.js` |

## 3. หน้าเว็บทีละหน้า

แบบ = section นี้มีในแบบไหน · ★Rev.47 = เพิ่มรอบล่าสุด

### หน้าแรก (`home`)

| ☐ | section | แบบ | คืออะไร | ตรวจอะไร | โมดูล | เทสต์ |
|---|---|---|---|---|---|---|
| ☐ | `#hero / top` | ABC | หัวเรื่อง + ตัวเครื่อง 3 มิติ (A/B) / โชว์รูม (C) | ภาพ 3 มิติขึ้น ไม่ตัดขอบ · ปุ่มจองล้างกดได้ · มือถือ C หัวเรื่องมาก่อนภาพ | `ac3d · proto-ui.mountViewer` | smoke · layout |
| ☐ | `#book` | ABC | จองล้าง 3 ขั้น: ประเภท/จำนวน → พื้นที่ → วันและช่วงเวลา | เริ่ม ฿700 · 1 เครื่อง = ค่าเดินทาง ฿300 · ครบ ฿4,500 ไม่มีค่าเดินทาง · "พรุ่งนี้" = คิวด่วน +฿500 (1 รายการ) · ยอดตรงกับใบเสนอราคา | `quickclean · queue · commerce.quoteTotals` | booking · workflow ขั้น 2 |
| ☐ | `#myac` | A | แอร์ของฉัน: บอร์ดเครื่องในบ้าน ≤ 12 เครื่อง | เพิ่มเครื่อง → ฝุ่น/ลม/ค่าไฟ/รอบล้าง · "จองล้าง n เครื่องที่ถึงรอบ" เปิดจองล้างพร้อมจำนวน · เก็บใน localStorage เครื่องนี้เท่านั้น | `myac · studio-model` | rev35 · rev35-ui |
| ☐ | `#doors` | ABC | ★Rev.47 ทางเข้า 3 บริการ ล้าง · ติดตั้ง · ซ่อม | ราคา: เริ่ม ฿700 / ค่าติดตั้งเริ่ม ฿3,800 / ค่าตรวจ ฿900 · แอร์ใหญ่ ฿1,200 · มี เหมาะเมื่อ + เวลา · ภาพ 3 มิติสีของแบบ · กดแล้วไปหน้า ล้าง·ติดตั้ง·ซ่อม ที่เส้นทางของบริการนั้น | `servicepath.mountDoors · stills` | servicepath |
| ☐ | `#start` | ABC | วันนี้ต้องการอะไร (6 เส้นทาง) + ปรึกษา 4 คำถาม | กดการ์ด → แถบเส้นทาง "ขั้นที่ n จาก N" · ปรึกษา: แผนจากค่าคงที่ · ปุ่มประเภทแอร์เปิดจองล้างพร้อมจำนวน | `site.JOURNEYS · atelier.mountConcierge` | concierge · workflow |
| ☐ | `#coverage` | BC | พื้นที่ให้บริการ 3 มิติ | วง 30 กม. · วง 60/100/150 กม. · ไม่มี WebGL = SVG · หน้าไม่กระโดดตอนโหลด | `areamap3d` | smoke · jank |
| ☐ | `#flow` | ABC | แถบขั้นตอนใช้บริการ 6 ขั้น | กดแล้วเลื่อนไปหัวข้อ · ไม่บังภาพ 3 มิติ | `journey.mountFlow` | layout |
| ☐ | `#services` | A | บริการของเรา (การ์ด) | ลิงก์ไปหน้าบริการถูก | `site` | smoke |

### ซื้อแอร์ (`shop`)

| ☐ | section | แบบ | คืออะไร | ตรวจอะไร | โมดูล | เทสต์ |
|---|---|---|---|---|---|---|
| ☐ | `#catalog` | ABC | แคตตาล็อก 705 รุ่น 22 แบรนด์ | กรอง ประเภท/แบรนด์/BTU/ราคา/Inverter · ค้นหา · เทียบรุ่น · หน้าสินค้า: ราคาก่อน VAT · แพ็กเกจติดตั้ง มาตรฐาน/พรีเมียม · อุปกรณ์เสริม · ค่าใช้จ่ายแยกรายการ · ใส่ใบเสนอราคา · ปุ่ม × ปิดได้บนมือถือ | `proto-ui.mountCatalog · commerce.productDetail · costs` | workflow ขั้น 3 · backpanel |
| ☐ | `#tradein` | ABC | แอร์เก่า ซ่อมหรือเปลี่ยนดี + เทิร์น | อายุ/ประเภท/ขนาด/อาการ → ซ่อม vs เทิร์น · มูลค่าเทิร์นเป็นช่วงบาท · ค่ารื้อ + ขนเครื่องเดิมรวมก่อนหักเทิร์น · ขอประเมิน → บรรทัดเดียว TI-REQ ในใบเสนอราคา | `tradein · rates` | tradein · workflow ขั้น 3 |
| ☐ | `#studio / room` | ABC | ห้องจำลอง 48 ห้อง (C เรียก #room) | ★Rev.47 ใบสรุปเป็นช่อง: ห้อง (ขนาด พื้นที่ คน เครื่องใช้ไฟฟ้า แดด) + ความเย็น (BTU ที่ต้องการ ที่เลือก ความพอดี %) · การ์ดผลลัพธ์ 3 ใบ · คำอธิบายพับไว้ · รุ่นแนะนำพร้อมราคา | `studio (sheet) · studio3d · studio-model` | smoke · layout |
| ☐ | `#fit` | ABC | ลองวางแอร์ในห้องของคุณ | เลือกรุ่น → ห้อง กว้าง×ยาว×สูง · ลากเฟอร์นิเจอร์/แอร์ · ผลตรวจ 5–7 ข้อเป็นค่าแนะนำทั่วไป · ท่อเกิน 4 ม. คิดราคา | `roomfit · roomfit3d · roomplan` | smoke |
| ☐ | `#wallfit` | C | ลองวางบนผนังบ้านคุณ | อัปโหลดรูปผนัง (ไม่บันทึก ไม่ส่ง) · กะความกว้าง 1.5–8 ม. · ลาก/ลูกศร · กรอบที่ว่างรอบเครื่อง · "ดูรุ่นขนาดนี้ในแคตตาล็อก" | `wallfit` | rev35-ui |

### ล้าง · ติดตั้ง · ซ่อม (`service`)

| ☐ | section | แบบ | คืออะไร | ตรวจอะไร | โมดูล | เทสต์ |
|---|---|---|---|---|---|---|
| ☐ | `#paths` | ABC | ★Rev.47 ขั้นตอนบริการทีละขั้น (แท็บ 3 บริการ × 6 ขั้น) | ล้าง ขั้น 2: ขั้นต่ำ ฿4,500 + ค่าเดินทาง ฿300 · ขั้น 3: ล่วงหน้า 3 วัน คิวด่วน +฿500 · ติดตั้ง ขั้น 6: 3 ปี / 1 ปี · ซ่อม ขั้น 4: อนุมัติราคาก่อนซ่อม · ทุกขั้นมีภาพ 3 มิติ + ชิปข้อมูล + ปุ่มไปทำขั้นนั้น · เล่นเองเมื่ออยู่บนจอ หยุดเมื่อกด | `servicepath.mountPaths · stills · vignette3d` | servicepath |
| ☐ | `#cleanflow` | ABC | ทีมช่างล้าง / ติดตั้ง 3 มิติ (A ติดผนัง · B แขวน · C สี่ทิศทาง) | C1 22 ขั้น / C2 28 ขั้น · ติดตั้ง 13 ขั้น · สลับประเภท 4 แบบไม่ค้าง · ผ้าใบเก็บน้ำ · ทิ้งน้ำยา 5–15 นาที · Blower · ตัวแอร์ไม่มียี่ห้อ · 4D เลื่อนจอได้ครบทุกขั้น | `jobguide · jobscene3d · crew3d · services.cleanSteps` | smoke |
| ☐ | `#howto` | BC | B: แอร์ทำงานอย่างไร + ลำดับการทำงาน 3 มิติ 9 ขั้น + ขั้นตอนตามประเภท · C: ช่างทำงานในบ้านจำลอง 4 งาน + ขั้นตอนตามประเภท | B: ลม/น้ำ/น้ำยา 7 ขั้น · แผงควบคุมห้อง · system3d 9 ขั้น + ภาพตัด 2 มิติ · C: C1 14 / C2 17 / ติดตั้ง 13 / ซ่อม 10 ขั้น ค่าเป็นตัวอย่างการบันทึก · ช่างไม่โผล่ทะลุผนัง | `howitworks3d · throwsim3d · system3d · engdraw (B) · techstory · tech3d · install3d (C) · services` | smoke |
| ☐ | `#symptoms` | ABC | อาการแอร์ยอดฮิต 14 อาการ | พิมพ์อาการ/เลือก → อาจไม่ใช่อาการเสีย · ตรวจเองอย่างปลอดภัย · คำถาม 1–5 ข้อ → จุดที่น่าเสีย + ราคามาตรฐานหรือ "ประเมินหน้างาน" · ★Rev.47 ภาพ 3 มิติต่ออาการ · ไม่เดาความหมายรหัส Error | `symptoms · acdiag · animicons · aiart` | acdiag · acbot |
| ☐ | `#standards` | ABC | มาตรฐานงานของเรา | C1/C2 (ไม่ตัดท่อ) · น้ำยา อย./วอส. · ติดตั้ง Leak test + Vacuum ไมครอนเกจ · ซ่อม อนุมัติก่อน · ไม่มียี่ห้อน้ำยา (รอบริษัท) | `standards` | textscan |
| ☐ | `#prices` | ABC | ศูนย์ค่าบริการ + งานบริการทั้งหมด 12 หมวด | ล้าง 3 แพ็กเกจ × C1/C2 · ติดตั้ง 167 · ซ่อม 86 · รื้อ/ย้าย (rates.js) · VRV/VRF ติดต่อแยก · ค่าเข้างานงานย่อย ฿1,000 | `commerce.mountPriceCenter · allservices · rates` | allservices · rates · accuracy |
| ☐ | `#quality` | ABC | วัสดุ: โชว์รูม 3 มิติ + การ์ด 7 วัสดุ | O-TWO 0.70 · Aeroflex · Airpro · Yazaki · SCG · ขาแขวน · NANO RCBO · ★Rev.47 ภาพ 3 มิติต่อวัสดุ (ไม่มีโลโก้) | `materials3d · matcards · matdata` | allservices |
| ☐ | `#story · inside` | A | ล้างถึงชิ้นไหน + ฝุ่นอยู่ตรงไหน | ตัวเครื่อง exploded/X-ray · ฝุ่น + ล้างเสมือนจริง · ข้อความ "แบบจำลองเพื่ออธิบาย" | `ac3d · proto-ui.scrollExplode` | smoke |

### สำหรับองค์กร (`business`)

| ☐ | section | แบบ | คืออะไร | ตรวจอะไร | โมดูล | เทสต์ |
|---|---|---|---|---|---|---|
| ☐ | `#enterprise` | ABC | สัญญาดูแลแอร์ 7 ประเภทองค์กร | สำนักงาน · หลายสาขา · คอนโด · โรงพยาบาล · โรงเรียน · โรงแรม · โรงงาน → ปัญหา → สิ่งที่บริษัททำ (ป้าย "มีในแพ็กเกจ" / "ตกลงในสัญญา") · สัญญาตัวอย่างจาก estimateContract · ใส่ใบเสนอราคา · คัดลอกร่างขอบเขตงาน · ★Rev.47 ภาพอาคาร 3 มิติ | `enterprise · aiart` | enterprise · enterprise-ui · workflow ขั้น 5 |
| ☐ | `#b2b` | ABC | ตัวคำนวณสัญญาล้างรายปี + แผน 12 เดือน | จำนวนเครื่องต่อประเภท × รอบ × แพ็กเกจ → ราคาต่อปี + ทีม-วัน · ≥ 10 เครื่อง ข้อความอัตราพิเศษ (ไม่มีตัวเลข) · แผนรายปีเคลื่อนไหว | `proto-ui.mountBuilder · annualplan · sbp-core.estimateContract` | enterprise |
| ☐ | `#boq` | B | BOQ ฝ่ายจัดซื้อ | ยอดตรงใบเสนอราคา (quoteTotals) · คัดลอกเป็นตาราง TSV วาง Excel แยกคอลัมน์ · มือถือ 2 บรรทัดต่อรายการ | `boq` | rev35 · rev35-ui |

### ความรู้ · ลองเอง (`knowledge`)

| ☐ | section | แบบ | คืออะไร | ตรวจอะไร | โมดูล | เทสต์ |
|---|---|---|---|---|---|---|
| ☐ | `#learn` | ABC | ศูนย์ความรู้ 12 หัวข้อ | ตัวเลขดึงจากค่าคงที่เดียวกับเครื่องมือ · ปุ่ม "ลองเอง" ไปเครื่องมือที่เกี่ยวข้อง · ★Rev.47 ภาพ 3 มิติต่อหัวข้อ | `knowledge · animicons · aiart` | smoke |
| ☐ | `#howto (A) · inside (B) · journey (C)` | ABC | A: แอร์ทำงานอย่างไร + ขั้นตอนตามประเภท · B: รายการชิ้นส่วนและจุดที่ต้องล้าง · C: แอร์ทำงานอย่างไร | ลม/น้ำ/น้ำยา 7 ขั้น · ลมเย็นไปทางไหน (A รีโมต · C แผงกระจก) สั่งงานได้ · ฉาก 3 มิติบูตเมื่อหน้านิ่ง · reduced motion = ภาพนิ่ง | `howitworks3d · throwsim3d · services · ac3d` | smoke |

### ติดต่อเรา (`contact`)

| ☐ | section | แบบ | คืออะไร | ตรวจอะไร | โมดูล | เทสต์ |
|---|---|---|---|---|---|---|
| ☐ | `#about` | ABC | ข้อมูลบริษัท | บริษัท สหบูรพากรุ๊ป จำกัด · 593 ถ.พระราม 2 · โทร 02-459-3299 · LINE @sahaservices · เวลาทำการ จ–ส 08:30–17:30 · ห้ามลิงก์ sahaburapa.com (ไม่ใช่ของบริษัท) | `sbp-core.COMPANY` | textscan |
| ☐ | `#area` | ABC | พื้นที่ให้บริการ + ตารางค่าเดินทาง + ตรวจพื้นที่ | ที่อยู่แบบไปรษณีย์ (จังหวัด → เขต → แขวง → รหัสไปรษณีย์) · โซน + ค่าเดินทางตรงกฎ 9 | `areamap3d · addrpick · journey.travelTable` | accuracy |
| ☐ | `#faq` | ABC | คำถามที่พบบ่อย | ค่าเดินทาง/ขั้นต่ำสร้างจากค่าคงที่ (ไม่มีตัวเลขซ้ำ) | `proto-ui.mountFaq · sbp-core.FAQ` | textscan |
| ☐ | `#quote` | ABC | ฟอร์มติดต่อ / ให้ทีมโทรกลับ + ส่งรูปหน้างาน | ส่งได้ 3 โหมด (สำเร็จ / ล้มเหลว / ไม่ตั้งค่า) · ไม่บอกว่า "ส่งแล้ว" ถ้ายังไม่ถึงทีม · ข้อความ PDPA + honeypot | `contact · submit · survey` | submit · workflow ขั้น 6 |

## 4. ทุกหน้า

| ☐ | ส่วน | ตรวจอะไร | โมดูล | เทสต์ |
|---|---|---|---|---|
| ☐ | ใบเสนอราคา / ใบจองงาน (ลิ้นชัก) | ปรับจำนวน/ลบ · ที่อยู่แบบไปรษณีย์ → ค่าเดินทาง · ก่อน VAT · VAT · รวม · ใบจอง 4 ขั้น (รายการ → วัน/ช่วง + คิวด่วนอัตโนมัติ → สภาพหน้างาน + รูป ≤ 8 + หมายเหตุ → ผู้ติดต่อ) · ส่งแล้วเพิ่มรายการใหม่ = คำขอใหม่ ไม่ส่งซ้ำ · เลขอ้างอิงจาก backend | `commerce.mountCart · ticket · submit` | submit · booking · workflow |
| ☐ | ผู้ช่วยตรวจอาการ (ปุ่มลอย) | อาการ → คำถาม → จุดที่น่าเสีย → "จองช่างตรวจซ่อม · ส่งผลประเมินไปด้วย" ใส่ค่าตรวจ ฿900/฿1,200 ในใบจอง | `acbot · acdiag` | acbot · workflow ขั้น 4 |
| ☐ | ค้นหา Ctrl/⌘K หรือ / | หน้า · หัวข้อ · รุ่นแอร์ (ค้นตาม BTU ±12%) · FAQ · คำสั่งด่วน | `palette` | workflow ขั้น 7 |
| ☐ | เมนู 6 หน้า + ปุ่มย้อนกลับ | section ที่อยู่หน้าอื่นถูกซ่อน · ลิงก์ #id สลับหน้าเอง · ปุ่มย้อนกลับขณะเปิดแผง = ปิดแผง หน้าไม่เปลี่ยน | `site · backpanel` | workflow ขั้น 1 · backpanel |
| ☐ | มือถือ | แถบล่าง เมนู / ติดต่อ / LINE / ใบเสนอราคา · ปุ่มลอยไม่ทับแถบ · ไม่เลื่อนแนวนอน · เป้ากด ≥ 24 px | `journey.mountMobileMenu` | workflow mobile · layout 390 |
| ☐ | ธีมมืด / reduced motion | ทุกตัวอักษร contrast ≥ 4.5:1 · reduced motion = ไม่เล่นเอง ภาพนิ่ง | `tokens --s-* · lazy` | axe dark |
| ☐ | ฉาก 3 มิติ | WebGL live ≤ 3 ต่อหน้า · บูตเมื่อหน้านิ่ง · ไม่มี WebGL ยังอ่านเนื้อหาครบ · ภาพ 3 มิติเรนเดอร์ล่วงหน้าใช้ได้ทุกเครื่อง ตัวเลขบนภาพต้องตรงราคาปัจจุบัน (fig) | `gl-pool · lazy · stills · vignette3d` | smoke (webglPeak) |

## 5. เส้นทางลูกค้า (กดเองทั้งคอมและมือถือ)

| ☐ | เส้นทาง | ทำอะไร | ต้องได้ |
|---|---|---|---|
| ☐ | ล้างแอร์ | หน้าแรก → การ์ด "ล้างแอร์" → จองล้าง (ติดผนัง 2 เครื่อง · บางขุนเทียน · วันปกติ) → ใบเสนอราคา ยอด ฿1,819 รวม VAT → ใบจองงาน → ส่ง | เลขอ้างอิง B… · แถบเส้นทาง "ครบทุกขั้นแล้ว" · คำขอระบุแบบเว็บไซต์ |
| ☐ | ซื้อแอร์ + ติดตั้ง + เทิร์น | ซื้อแอร์ → เลือกรุ่น → แพ็กเกจมาตรฐาน → ใส่ใบเสนอราคา → เทิร์นแอร์เก่า → ขอประเมิน → ส่ง | ใบใหม่ไม่มีงานล้างที่ส่งไปแล้ว · ใบจองเขียน "ติดตั้ง 1 เครื่อง" |
| ☐ | แอร์มีปัญหา | ปุ่ม "ถามอาการแอร์" → ไม่เย็น → ตอบคำถาม → จองช่างตรวจ | ค่าตรวจ ฿900 + ผลประเมินในใบจอง · ไม่มีคำสัญญาว่าหาย |
| ☐ | องค์กร | สำหรับองค์กร → โรงพยาบาล → ใส่ใบเสนอราคา | สัญญา ฿332,800/ปี ก่อน VAT · (B) BOQ ยอดเดียวกัน |
| ☐ | ติดต่อ | ติดต่อเรา → กรอกฟอร์ม → ส่ง | โหมดไม่มี backend: กล่องสรุปให้คัดลอก/LINE · ไม่บอกว่าส่งถึงแล้ว |
| ☐ | ★Rev.47 ทางเข้าบริการ | หน้าแรก → ประตู "ซ่อมแอร์" → ขั้นตอนซ่อม ขั้น 4 → ปุ่มของขั้น | ไปหน้าบริการ แท็บซ่อมเปิด · ขั้น 4 มีคำว่าอนุมัติ · ปุ่มพาไป section ที่ถูก |

## 6. กฎธุรกิจ (CLAUDE.md §6.6)

| ☐ | ข้อ | กฎ | ดูที่ / วิธีตรวจ |
|---|---|---|---|
| ☐ | 1 | ทุกราคาแสดง "ก่อน VAT" · VAT คิดครั้งเดียวที่ยอดรวมใบเสนอราคา | เปิดใบเสนอราคา: ก่อน VAT · VAT 7% · รวมทั้งสิ้น |
| ☐ | 1a | ราคางานบริการ (ล้าง ซ่อม INS-*) ปัดขึ้นหลักร้อย · วัสดุใช้ราคาจริง | ศูนย์ราคา: ไม่มีราคาบริการลงท้าย 50 |
| ☐ | 3–4 | อัตรามาตรฐานเท่านั้น · ไม่มีต้นทุน กำไร % ส่วนลด ชื่อลูกค้า | ≥ 10 เครื่องขึ้นข้อความ "อาจได้อัตราพิเศษ … ทีมขายยืนยันในใบเสนอราคา" ไม่มีตัวเลข |
| ☐ | 6–7 | ติดตั้งมีแค่มาตรฐาน / พรีเมียม · ทองแดง O-TWO 0.70 มม. · ไม่มีคำว่า Type L / K Copper | npm run textscan |
| ☐ | 8 | งานล้างต่ำกว่า ฿4,500 = ค่าเดินทาง ฿300 (ไม่เติมยอด) | จองล้าง 1 เครื่อง → แถวค่าเดินทาง ฿300 |
| ☐ | 9 | นอกพื้นที่หลัก 300 + 10/กม. ปัดหลักร้อย · > 150 กม. = งานโครงการ | เลือกที่อยู่ต่างจังหวัดในใบจอง |
| ☐ | 11 | คำต้องห้าม: แก้หายแน่นอน · ประหยัดไฟแน่นอน · ปลอดเชื้อ · สะอาด 100% · รับประกันเย็น · ไม่มีค่าใช้จ่ายเพิ่มเติมทุกกรณี ฯลฯ | npm run textscan |
| ☐ | 12 | ค่าที่วัดในขั้นตอนช่าง = ตัวอย่างการบันทึก ไม่ใช่เกณฑ์ผ่าน/ไม่ผ่าน | ทีมช่าง 3 มิติ / ช่างในบ้านจำลอง (C) |
| ☐ | 13 | ขั้นตอนตรงแบบฟอร์ม SBP-SR-ACCL-UNI-001 Rev.07 / SBP-SR-ACIN-UNI-001 Rev.04 · ซ่อม: อนุมัติราคาก่อน | ขั้นตอนซ่อม ขั้น 4 ต้องมีคำว่า "อนุมัติ" |
| ☐ | 14, 20 | ไม่มีโลโก้ที่ดาวน์โหลดมา · ไม่มียี่ห้อบนแอร์ของลูกค้าในฉากงานช่าง | ฉากทีมช่าง · ภาพอาการ 3 มิติ |
| ☐ | 16 | VRV / VRF = ติดต่อแยก ไม่เข้าตะกร้า | ศูนย์ราคา: ปุ่ม "ติดต่อสอบถาม" |
| ☐ | 17, 19 | ระยะติดตั้ง / ผลตรวจจัดห้อง = ค่าแนะนำทั่วไป มีข้อความกำกับ | ลองวางในห้อง · ลองบนผนังบ้าน (C) |
| ☐ | 22 | นอกเวลาทำการมีค่าใช้จ่ายเพิ่ม แต่ไม่ระบุจำนวนเงิน · เวลาต่องานมี TIME_NOTE | จองล้างวันอาทิตย์ |
| ☐ | 23 | คิวด่วน +฿500 ต้องมีคิว ทีมยืนยัน · เว็บไม่บอกว่า "ว่าง" เองถ้าไม่ได้อ่านตารางคิวจริง | จองล้าง ขั้น 3 เลือก "พรุ่งนี้" |
| ☐ | 24 | ใบจองงาน: งานนอกมาตรฐานแจ้งราคาก่อนยืนยันคิว · รูปไม่เก็บใน localStorage | ใบเสนอราคา → ใบจองงาน ขั้น 3 |
| ☐ | 25–26 | มูลค่าเทิร์นเป็นช่วงบาทต่อเครื่อง (ไม่ใช่ %) · อัตรา rates.js (รื้อ ย้าย เติมน้ำยา ฯลฯ) | เทิร์นแอร์เก่า · ศูนย์ราคา หมวดรื้อ/ย้าย |

## 7. หลังบ้าน (Google Apps Script)

- **สถานะ:** โค้ดพร้อม (backend/apps-script/Code.gs + Board.html) · ยังไม่ deploy — ตอนนี้ส่งผ่าน FormSubmit (อีเมล)
- **ตรวจในเครื่อง:** npm run backend:test — Code.gs ตัวจริงใน node:vm: setup · selfTest · ฟอร์มติดต่อ · ใบจองพร้อมรูป · ความเห็น · ตรวจสถานะ · บอร์ดยืนยันคิว → เว็บเห็นคิวเต็ม · ชุดสิทธิ์เชิงลบ
- **หลัง deploy:** ใส่ URL /exec ที่ assets/submit.js BACKEND_URL → npm run backend:check -- <url> [--write] → build
- **ความปลอดภัย:** ฟังก์ชัน public: doGet doPost boardData boardUpdate (ตรวจ key) · setup selfTest newBoardKey (เจ้าของเท่านั้น) · helper ลงท้าย _ · LockService · จำกัด 30 คำขอ/นาที · ตรวจสถานะ 60/นาที · ชื่อช่องกันสูตร

## 8. โครงสร้างโค้ด

| ไฟล์ | หน้าที่ |
|---|---|
| `a.html / b.html / c.html` | markup + CSS tokens ของแบบ + <script type="module"> ตัวเดียว (wiring) · ★Rev.47 <html data-art="A|B|C"> |
| `assets/sbp-core.js` | ข้อมูลและกฎธุรกิจทั้งหมด: loadData, VAT, TRAVEL/zoneOf/travelFee, QUEUE_RULES, COMPANY, estimateContract, cleanRate |
| `assets/commerce.js · ticket.js · submit.js` | ใบเสนอราคา (singleton cart + localStorage sbp-quote-v2) · ใบจองงาน · ส่งคำขอ (BACKEND_URL / FormSubmit) |
| `assets/site.js` | router 6 หน้า (views/order/labels/hooks) · เส้นทางลูกค้า (sbp-journey-v1) · footer · schema.org |
| `assets/servicepath.js + servicepath.css` | ★Rev.47 ทางเข้า 3 บริการ + ขั้นตอน 6 ขั้น × 3 · figures() = ตัวเลขบนภาพ |
| `assets/stills.js + assets/stills/` | ★Rev.47 ภาพ 3 มิติเรนเดอร์ล่วงหน้า (A/B/C/D/E/F × 65) · manifest.json fig · artV() |
| `assets/aiart.js + assets/ai/` | ช่องภาพ AI (ว่าง) → ภาพ 3 มิติของแบบ → ลายเส้น |
| `assets/vignette3d.js` | สตูดิโอเรนเดอร์ภาพ 3 มิติ (offscreen) · liveOK() กันเครื่องไม่มีการ์ดจอ |
| `assets/studio*.js` | ห้องจำลอง 48 ห้อง · sheet: true = ใบสรุปเป็นช่อง |
| `assets/gl-pool.js · lazy.js · quality3d.js` | งบ WebGL ≤ 3 · บูตเมื่อหน้านิ่ง · ความคมตามเครื่อง |
| `tools/render-stills.mjs` | เรนเดอร์ภาพ 3 มิติใหม่หลังแก้ฉากหรือราคา: node tools/render-stills.mjs ABC |
| `tools/verify-abc.mjs` | ★ ตรวจทั้งหมดของ A/B/C คำสั่งเดียว → verify-abc/summary.md |
| `build.py` | ไฟล์เดียวต่อแบบ (dist/art, dist/offline) + dist/site (GitHub Pages) · ฝังภาพ 3 มิติของแบบนั้นเท่านั้น |
| `backend/apps-script/` | Code.gs + Board.html (Google Sheet + Drive + LINE) · backend/test/gas-emulator.mjs |

localStorage (ทุกค่าครอบ try/catch · ไม่มีรูป):

| key | เก็บอะไร | โมดูล |
|---|---|---|
| `sbp-quote-v2` | ใบเสนอราคา + ร่างใบจอง (ไม่มีรูป) | `commerce.js` |
| `sbp-booking-v1` | ข้อมูลผู้ติดต่อที่จำไว้ (ชื่อ เบอร์ LINE) | `commerce.js / ticket.js` |
| `sbp-journey-v1` | เส้นทางลูกค้าที่กำลังทำ | `site.js` |
| `sbp-myac-v1` | แอร์ของฉัน (A) | `myac.js` |
| `sbp-concierge-v1` | คำตอบปรึกษา 4 คำถาม | `atelier.js` |
| `sbp-shots-r37` | cache ภาพสินค้าเรนเดอร์ | `product-media.js` |

## 9. ยังรอ / ข้อจำกัดที่รู้

- deploy Apps Script แล้วส่ง URL /exec (B4) — รูปหน้างาน คิวสด ตรวจสถานะ ยังไม่เปิด
- ทดสอบบนมือถือจริง 2–3 รุ่น (B2) — ทดสอบแล้วเฉพาะเบราว์เซอร์จำลองไม่มีการ์ดจอ
- internal/sbp_real.json (ไฟล์ภายใน) สำหรับ npm run recon — ไม่อยู่ใน repo
- ราคา FUJIVA · รูปสินค้าจริง · โลโก้วัสดุพร้อมหนังสืออนุญาต
- หัวหน้าช่างตรวจขั้นตอน (CLEAN_HOW / INSTALL_HOW / FIT_RULES / ความรู้ 12 หัวข้อ)
- เจ้าของเลือกแบบ A / B / C (หรือผสม)
