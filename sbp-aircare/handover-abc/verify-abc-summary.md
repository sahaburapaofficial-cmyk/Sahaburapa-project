# verify-abc · 2026-10-07T19:21:14.109Z · 2e0203f

pass 69 · FAIL 0 · skip 1

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
