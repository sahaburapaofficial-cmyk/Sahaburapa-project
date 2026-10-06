#!/usr/bin/env python3
"""Rev.29 — writes d.html, e.html, f.html (the second website) from one template.

The three designs share the page skeleton and every feature (wired by assets/lux-site.js); what differs is the art direction
(assets/lux.css keyed by <html data-lux>), the signature piece at the top, the order of the views and the voice of the copy.
Edit here, then run:  python3 tools/make-lux.py
"""
import os, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://sahaburapaofficial-cmyk.github.io/Sahaburapa-project/'
DESC = 'ล้างแอร์ ติดตั้ง ซ่อม โดยทีมช่างของบริษัท สหบูรพากรุ๊ป จำกัด กรุงเทพฯ และปริมณฑล — เห็นราคามาตรฐานก่อน VAT ก่อนจอง พร้อมสัญญาล้างรายปีสำหรับองค์กร'

# section copy: id → (eyebrow, h2, lead) — one voice per design
COPY = {
  'book': {'D': ('จองล้างแอร์ · 3 ขั้น', 'เลือกแอร์ วิธีล้าง และพื้นที่ เห็นราคารวมทันที', 'ราคามาตรฐานจาก Pricebook ก่อน VAT ค่าเดินทาง และยอดขั้นต่ำครบ ทีมยืนยันคิวก่อนเข้างาน'),
           'E': ('จองล้างแอร์', 'นัดล้างแอร์ในสามขั้น', 'บอกประเภท จำนวน และพื้นที่ แล้วเห็นยอดรวมก่อน VAT ทันที ทีมของเราโทรยืนยันคิวก่อนเข้างานทุกครั้ง'),
           'F': ('Book · 3 steps', 'จองล้างแอร์ เห็นยอดก่อนส่ง', 'ราคามาตรฐาน ค่าเดินทาง ยอดขั้นต่ำ และคิวด่วน คำนวณให้ครบในหน้าเดียว')},
  'start': {'D': ('เริ่มจากสิ่งที่คุณต้องการ', 'วันนี้ต้องการอะไร', 'เลือกเรื่องที่ตรงกับคุณ ระบบพาไปทีละขั้นจนส่งคำขอ ทำต่อจากเดิมได้เมื่อกลับมา'),
            'E': ('บริการของเรา', 'เลือกสิ่งที่ต้องการ แล้วเราพาไปทีละขั้น', 'ล้าง ซื้อเครื่องใหม่ ติดตั้ง ซ่อม เทิร์นแอร์เก่า หรือสัญญาองค์กร — กลับมาทำต่อได้จากจุดเดิม'),
            'F': ('Journeys', 'เส้นทางของคุณ', 'เลือกเรื่องที่ต้องการ ระบบพาไปทีละขั้นจนส่งคำขอ')},
  'coverage': {'D': ('พื้นที่ให้บริการ', 'ทีมออกจากพระราม 2 ทุกเช้า', 'กรุงเทพฯ ในระยะ 30 กม. ไม่มีค่าเดินทางเมื่อยอดงานล้างถึงขั้นต่ำ ถึง 150 กม. คิดตามระยะทาง เลือกแขวง/ตำบลเพื่อดูทันที'),
               'E': ('พื้นที่ให้บริการ', 'เราไปถึงคุณได้ไหม', 'เลือกแขวงหรือตำบลของหน้างาน ดูระยะและค่าเดินทางก่อนจอง'),
               'F': ('Coverage', 'พื้นที่ให้บริการแบบ 3 มิติ', 'ทีมวิ่งจากพระราม 2 ตามนาฬิกาทำงาน เลือกที่อยู่แล้วเห็นระยะและค่าเดินทาง')},
  'catalog': {'D': ('คอลเลกชันแอร์', 'ทุกรุ่น พร้อมราคาก่อน VAT', 'เปิดรายละเอียดเพื่อเลือกแพ็กเกจติดตั้ง อุปกรณ์เพิ่ม และดูค่าใช้จ่ายแยกรายการ'),
              'E': ('เลือกเครื่องใหม่', 'แอร์ทุกรุ่นพร้อมราคาติดตั้ง', 'ค้นหาตามประเภท ขนาด และงบ เทียบรุ่นได้ ราคาก่อน VAT ทุกรุ่น'),
              'F': ('Catalogue', 'แอร์ทุกรุ่น ทุกขนาด', 'กรอง เทียบ แล้ววางลงในห้องของคุณได้ทันที')},
  'tradein': {'D': ('เทิร์นแอร์เก่า', 'ซ่อมต่อ หรือเปลี่ยนใหม่', 'เทียบค่าซ่อมตาม Pricebook กับเครื่อง Inverter ใหม่พร้อมติดตั้งและค่าไฟต่อปี มูลค่าเทิร์นหักในใบเสนอราคาเดียว'),
              'E': ('รีโนเวท · เทิร์นแอร์เก่า', 'แอร์อายุเกิน 7 ปี ควรซ่อมหรือเปลี่ยน', 'ตอบอายุ อาการ และขนาด เราเทียบให้เห็นทั้งสองทางก่อนตัดสินใจ'),
              'F': ('Trade-in', 'ซ่อมหรือเปลี่ยน ดูตัวเลขก่อน', 'ค่าซ่อม เครื่องใหม่ ค่าไฟต่อปี และมูลค่าเทิร์นเป็นช่วงบาทต่อเครื่อง')},
  'studio': {'D': ('ห้องจำลอง', 'หาขนาด BTU ที่พอดีกับห้อง', '48 ห้อง 9 กลุ่ม ปรับขนาดห้อง คน แดด แล้วเห็นขนาดเครื่องและค่าไฟ (แบบจำลอง)'),
             'E': ('ห้องจำลอง', 'ห้องของคุณควรใช้แอร์ขนาดเท่าไร', 'เลือกห้องที่ใกล้เคียง ปรับขนาดและแดด ดูขนาดที่แนะนำพร้อมรุ่นและราคา'),
             'F': ('Room lab', 'ห้องจำลอง 48 ห้อง', 'BTU ทิศทางลม ฝุ่นสะสม และค่าไฟ ในห้องที่ใกล้เคียงกับของคุณ')},
  'fit': {'D': ('ลองวางในห้องของคุณ', 'วางเครื่องจริงขนาดตามสเปก', 'ใส่ขนาดห้อง เลือกผนังและตำแหน่ง ดูระยะห่าง ทิศทางลม คอยล์ร้อน และความยาวท่อ'),
          'E': ('ลองวางในห้อง', 'เห็นเครื่องในห้องของคุณก่อนซื้อ', 'จัดเฟอร์นิเจอร์ เลือกผนัง แล้วดูว่าลมเย็นไปถึงตรงไหน'),
          'F': ('Fit', 'วางแอร์ในห้องของคุณ', 'ขนาดจริงตามสเปก ลากเฟอร์นิเจอร์ได้ ดูลมไหลรอบของในห้อง')},
  'cleanflow': {'D': ('ทีมช่างของเรา', 'ล้างและติดตั้งทีละขั้น', 'ช่าง 2 คนทำงานเป็นทีมในบ้าน ร้านค้า คาเฟ่ และห้องประชุม ตามแบบฟอร์มงานของบริษัท พร้อมราคามาตรฐาน'),
                'E': ('งานของทีมช่าง', 'ทุกขั้นตอนที่ช่างทำในบ้านของคุณ', 'ล้างปกติ ล้างใหญ่ ติดตั้งมาตรฐานและพรีเมียม เห็นก่อนว่าช่างทำอะไร ทำไม และคุณได้อะไร'),
                'F': ('Crew', 'ทีมช่างทำงานจริงทีละขั้น', 'ล้าง C1 · C2 · ติดตั้ง 4 ประเภทเครื่อง ในฉาก 3 มิติ')},
  'symptoms': {'D': ('อาการแอร์ยอดฮิต', 'เช็กอาการ แล้วเรียกช่างให้ถูกจุด', 'ตอบคำถามสั้น ๆ ระบบชี้จุดที่น่าจะเสียและราคามาตรฐานของรายการซ่อม'),
               'E': ('แอร์มีปัญหา', 'เล่าอาการให้เราฟัง', 'ดูว่าเป็นการทำงานปกติหรือไม่ ตรวจเองอย่างปลอดภัย แล้วให้ช่างเตรียมเครื่องมือมาถูกจุด'),
               'F': ('Diagnose', 'เช็กอาการแอร์', '14 อาการ ชี้จุดที่น่าจะเสีย ประเภทงาน และราคามาตรฐาน')},
  'howto': {'D': ('ขั้นตอนบริการ', 'ล้าง ติดตั้ง ซ่อม ทำอะไรบ้าง', 'ราคามาตรฐาน สิ่งที่รวม/ไม่รวม และเอกสารที่ได้รับ ทุกบริการ'),
            'E': ('ขั้นตอนบริการ', 'รายละเอียดทุกบริการ', 'สิ่งที่รวม ไม่รวม การรับประกัน และเอกสารที่ได้รับ'),
            'F': ('Service steps', 'ทุกขั้นตอนบริการ', 'ล้าง ติดตั้ง ซ่อม ต่อประเภทเครื่อง')},
  'standards': {'D': ('มาตรฐานงาน', 'ตรวจสอบได้ทุกขั้น', 'งานล้าง น้ำยาที่เลือกใช้ งานติดตั้งตามแบบฟอร์มของบริษัท และสิ่งที่ได้รับทุกงาน'),
                'E': ('มาตรฐานของเรา', 'สิ่งที่คุณวางใจได้', 'ล้าง ติดตั้ง ซ่อม ตามมาตรฐานที่ตรวจสอบได้ และสิ่งที่ได้รับทุกงาน'),
                'F': ('Standards', 'มาตรฐานงาน', 'ล้าง · น้ำยา · ติดตั้ง · ซ่อม · สิ่งที่ได้รับทุกงาน')},
  'prices': {'D': ('ค่าบริการทั้งหมด', 'ราคาชัด ก่อนเรียกช่าง', 'ทุกรายการจาก Pricebook 2569 ของบริษัท ราคาก่อน VAT · VRV / VRF ติดต่อทีมโครงการแยก'),
             'E': ('ค่าบริการ', 'ราคามาตรฐานทุกบริการ', 'ล้าง ติดตั้ง ซ่อม รื้อย้าย และวัสดุ ราคาก่อน VAT จาก Pricebook 2569 · VRV / VRF ติดต่อทีมโครงการแยก'),
             'F': ('Prices', 'ราคาทุกบริการ', 'ค้นหาได้ ทุกแถวเพิ่มลงใบเสนอราคา ราคาก่อน VAT · VRV / VRF ติดต่อทีมโครงการแยก')},
  'quality': {'D': ('วัสดุในแพ็กเกจ', 'ของที่มองไม่เห็นหลังติดตั้ง', 'ท่อทองแดง ฉนวน ราง สายไฟ ท่อน้ำทิ้ง เบรกเกอร์ ระบุยี่ห้อและสเปกทุกแพ็กเกจ'),
              'E': ('วัสดุ', 'วัสดุที่เราเลือกใช้', 'ระบุยี่ห้อและสเปกในทุกแพ็กเกจ ตรวจของจริงหน้างานเทียบกับใบเสนอราคาได้'),
              'F': ('Materials', 'วัสดุแบบเห็นข้างใน', 'โชว์รูม 3 มิติและภาพตัดเคลื่อนไหวของวัสดุแต่ละชิ้น')},
  'enterprise': {'D': ('ลูกค้าองค์กร', 'สัญญาดูแลแอร์ตามประเภทองค์กร', 'สำนักงาน หลายสาขา คอนโด โรงพยาบาล โรงเรียน โรงแรม โรงงาน — ปัญหาที่พบบ่อยและสัญญาตัวอย่างจาก Pricebook'),
                 'E': ('สำหรับองค์กร', 'ดูแลแอร์ทั้งองค์กรในสัญญาเดียว', 'เลือกประเภทองค์กร ดูสิ่งที่เราทำให้ สัญญาตัวอย่าง และร่างขอบเขตงานสำหรับฝ่ายจัดซื้อ'),
                 'F': ('Enterprise', 'สัญญารายปีตามประเภทองค์กร', '7 ประเภทองค์กร สัญญาตัวอย่างคำนวณสด')},
  'b2b': {'D': ('ประเมินงบสัญญารายปี', 'ทั้งองค์กร ทั้งปี ในสัญญาเดียว', 'กำหนดจำนวนเครื่อง ความถี่ และพื้นที่ เห็นงบต่อปีและแผนล้าง 12 เดือนทันที'),
          'E': ('งบประมาณรายปี', 'วางงบล้างแอร์ทั้งปี', 'ใส่จำนวนเครื่องตามประเภท เห็นงบต่อปี กำลังทีม และปฏิทินล้าง 12 เดือน'),
          'F': ('Annual plan', 'งบและแผนล้างทั้งปี', 'จำนวนเครื่อง × รอบ × แพ็กเกจ → งบต่อปีและปฏิทิน 12 เดือน')},
  'doors': {'D': ('เริ่มที่นี่', 'วันนี้ต้องการบริการไหน', 'ล้าง ติดตั้ง หรือซ่อม — แต่ละบริการหมายถึงอะไร เหมาะเมื่อไร ใช้เวลาเท่าไร ราคาเริ่มที่เท่าไร แตะเพื่อดูทุกขั้นตั้งแต่จองจนเสร็จงาน'),
            'E': ('เริ่มที่นี่', 'สามบริการ ที่เราดูแลให้', 'ล้าง ติดตั้ง และซ่อม — ความหมาย เวลา และราคาเริ่มต้นของแต่ละบริการ แตะเพื่อดูขั้นตอนของคุณ'),
            'F': ('Start', 'เลือกบริการ แล้วดูทุกขั้น', 'ล้าง ติดตั้ง ซ่อม — ความหมาย เวลา ราคาเริ่มต้น และขั้นตอนตั้งแต่จองจนเสร็จงาน')},
  'paths': {'D': ('ขั้นตอนบริการ', 'จองจนเสร็จงาน ทีละขั้น', 'ล้าง ติดตั้ง ซ่อม — แต่ละขั้นมีภาพเคลื่อนไหว บอกว่าเกิดอะไรขึ้น ทำไม และคุณได้อะไร พร้อมปุ่มไปทำขั้นนั้นบนเว็บ'),
            'E': ('ขั้นตอนบริการ', 'เส้นทางของคุณ ตั้งแต่จองจนเสร็จ', 'เลือกบริการ แล้วดูหกขั้นที่เกิดขึ้นจริง พร้อมคำอธิบายและปุ่มไปทำแต่ละขั้น'),
            'F': ('Service path', 'หกขั้น จองจนเสร็จงาน', 'เลือกบริการ ดูภาพเคลื่อนไหวและคำอธิบายของแต่ละขั้น แล้วกดไปทำขั้นนั้นได้ทันที')},
  'learn': {'D': ('คู่มือก่อนตัดสินใจ', 'รู้จักแอร์ให้ครบ ก่อนเลือก', 'BTU ประเภทเครื่อง อินเวอร์เตอร์ รอบล้าง และงานติดตั้ง พร้อมปุ่มลองเอง'),
            'E': ('ความรู้', 'เรื่องแอร์ที่ควรรู้ ก่อนตัดสินใจ', 'อ่านสั้น ๆ แล้วลองกับเครื่องมือจำลองได้ทันที'),
            'F': ('Learn', 'คู่มือ 12 หัวข้อ', 'อ่านสั้น ๆ แล้วลองในห้องทดลองได้ทันที')},
  'inside': {'D': ('ข้างในแอร์', 'แอร์แต่ละประเภททำงานอย่างไร', 'ภาพตัด 3 มิติ ลม น้ำ และน้ำยาไหลทีละขั้น พร้อมลองสั่งงานและดูระยะลม'),
             'E': ('แอร์ทำงานอย่างไร', 'เบื้องหลังลมเย็นในห้องของคุณ', 'ภาพตัด 3 มิติ แอร์ติดผนัง แขวน และสี่ทิศทาง ทีละขั้น'),
             'F': ('Inside', 'ข้างในแอร์ 3 ประเภท', 'ภาพตัด 3 มิติและจำลองระยะลม')},
  'about': {'D': ('เกี่ยวกับเรา', 'บริษัทแอร์ที่มีทั้งอะไหล่ ทีมช่าง และแบรนด์ของตัวเอง', 'ข้อมูลบริษัท ช่องทางติดต่อ และวิธีทำงานกับเรา'),
            'E': ('เกี่ยวกับเรา', 'สหบูรพากรุ๊ป', 'ข้อมูลบริษัท ช่องทางติดต่อ และวิธีทำงานกับเรา'),
            'F': ('About', 'เกี่ยวกับเรา', 'ข้อมูลบริษัทและช่องทางติดต่อ')},
  'area': {'D': ('พื้นที่และค่าเดินทาง', 'ตารางค่าเดินทางและแผนที่เต็ม', 'เลือกที่อยู่หน้างาน ดูระยะและค่าเดินทางก่อน VAT'),
           'E': ('พื้นที่ให้บริการ', 'ระยะทางและค่าเดินทาง', 'เลือกที่อยู่หน้างาน ดูระยะและค่าเดินทางก่อน VAT'),
           'F': ('Area', 'แผนที่และค่าเดินทาง', 'เลือกที่อยู่หน้างาน ดูระยะและค่าเดินทางก่อน VAT')},
}

V = {
  'D': dict(name='Holo Cinema', title='ล้างแอร์ ติดตั้ง ซ่อม กรุงเทพฯ · SBP AirCare (แบบ D)', theme='#04060B', theme3d='dark', jobType='wall', studio='condobed', throw='remote', fit='bedroom',
            order=['home', 'service', 'shop', 'business', 'knowledge', 'contact'],
            views=dict(home=['film', 'intro', 'doors', 'book', 'start', 'coverage'], service=['paths', 'cleanflow', 'howto', 'standards', 'symptoms', 'prices', 'quality'], shop=['catalog', 'tradein', 'studio', 'fit'], business=['enterprise', 'b2b'], knowledge=['learn', 'inside'], contact=['about', 'area', 'faq', 'quote']),
            labels=dict(film='ภาพยนตร์สั้น', intro='บริการของเรา', inside='ข้างในแอร์', doors='เลือกบริการ', paths='ขั้นตอนบริการ'),
            nav=[('#film', 'ภาพยนตร์'), ('#book', 'จองล้าง'), ('#cleanflow', 'ทีมช่าง'), ('#catalog', 'แอร์ทุกรุ่น'), ('#prices', 'ค่าบริการ'), ('#enterprise', 'องค์กร'), ('#area', 'พื้นที่')]),
  'E': dict(name='Atelier 2050', title='ล้างแอร์ ติดตั้ง ซ่อม กรุงเทพฯ · SBP AirCare (แบบ E)', theme='#F3F6F9', theme3d='light', jobType='ceiling', studio='living', throw='panel', fit='living',
            order=['home', 'service', 'shop', 'business', 'knowledge', 'contact'],
            views=dict(home=['concierge', 'doors', 'book', 'start', 'coverage'], service=['paths', 'cleanflow', 'standards', 'howto', 'symptoms', 'prices', 'quality'], shop=['tradein', 'catalog', 'studio', 'fit'], business=['enterprise', 'b2b'], knowledge=['learn', 'inside'], contact=['about', 'area', 'faq', 'quote']),
            labels=dict(concierge='ปรึกษาบริการ', inside='แอร์ทำงานอย่างไร', doors='เลือกบริการ', paths='ขั้นตอนบริการ'),
            nav=[('#concierge', 'ปรึกษา'), ('#book', 'จองล้าง'), ('#cleanflow', 'งานช่าง'), ('#tradein', 'รีโนเวท'), ('#prices', 'ค่าบริการ'), ('#enterprise', 'องค์กร'), ('#about', 'เกี่ยวกับเรา')]),
  'F': dict(name='Holodeck', title='ล้างแอร์ ติดตั้ง ซ่อม กรุงเทพฯ · SBP AirCare (แบบ F)', theme='#03050C', theme3d='dark', jobType='cassette', studio='openoffice', throw='glass', fit='living',
            order=['home', 'knowledge', 'service', 'shop', 'business', 'contact'],
            views=dict(home=['dome', 'doors', 'book', 'start', 'coverage'], knowledge=['inside', 'studio', 'learn'], service=['paths', 'cleanflow', 'howto', 'standards', 'symptoms', 'prices', 'quality'], shop=['catalog', 'fit', 'tradein'], business=['enterprise', 'b2b'], contact=['about', 'area', 'faq', 'quote']),
            labels=dict(dome='ห้องทดลองความเย็น', inside='ข้างในแอร์', studio='ห้องจำลอง 48 ห้อง', doors='เลือกบริการ', paths='ขั้นตอนบริการ'),
            nav=[('#dome', 'ห้องทดลอง'), ('#book', 'จองล้าง'), ('#inside', 'ข้างในแอร์'), ('#cleanflow', 'ทีมช่าง'), ('#catalog', 'แอร์ทุกรุ่น'), ('#prices', 'ค่าบริการ'), ('#enterprise', 'องค์กร')]),
}

HERO = {
  'D': '''<section id="film" aria-label="ภาพยนตร์สั้น: ห้องที่กลับมาเย็นอีกครั้ง"></section>
<div class="wrap">
  <section class="sec" id="intro">
    <div class="d-intro">
      <p class="eyebrow">SBP AirCare · Holo Cinema</p>
      <h1>ล้างแอร์ที่คุณเห็นทุกขั้น<br><em>ก่อนจอง จนห้องกลับมาเย็น</em></h1>
      <p class="d-lead">ทีมช่างประจำของบริษัท สหบูรพากรุ๊ป จำกัด ล้าง ติดตั้ง และซ่อมแอร์ทุกประเภท ราคามาตรฐานจาก Pricebook ก่อน VAT แสดงก่อนส่งคำขอ</p>
      <div class="d-ctas"><a class="btn-primary" href="#book">จองล้างแอร์ · เริ่ม <span data-clean-from>฿700</span></a><a class="btn-ghost" href="#cleanflow">ดูทีมช่างทำงาน</a><a class="btn-ghost" href="#enterprise">สัญญาองค์กร</a></div>
    </div>
    <dl class="d-facts"><div><dt>แอร์พร้อมราคา</dt><dd>705 รุ่น</dd></div><div><dt>แบรนด์</dt><dd>22</dd></div><div><dt>ห้องจำลอง</dt><dd>48 ห้อง</dd></div><div><dt>จองล่วงหน้า</dt><dd>3 วัน</dd></div></dl>
  </section>''',
  'E': '''<div class="wrap">
  <section class="sec" id="concierge" aria-label="ปรึกษาบริการ">
    <div class="at-hero">
      <div>
        <p class="eyebrow">SBP AirCare · Atelier 2050</p>
        <h1>ดูแลแอร์ของคุณ<br><em>อย่างที่คุณต้องการ</em></h1>
        <p class="at-lead">ตอบคำถามสี่ข้อ เราจัดลำดับบริการที่เหมาะกับบ้านหรือองค์กรของคุณ พร้อมราคามาตรฐานก่อน VAT และวิธีนัดคิว</p>
        <h2 class="vh">ปรึกษาบริการ 4 คำถาม</h2>
        <div id="conRoot"></div>
      </div>
      <div id="dayRoot"></div>
    </div>
  </section>''',
  'F': '''<div class="wrap">
  <section class="sec" id="dome" aria-label="ห้องทดลองความเย็น">
    <div class="sp-head">
      <div><p class="eyebrow">SBP AirCare · Holodeck</p><h1>ห้องโฮโลแกรม<br><em>เห็นอากาศเย็นลงตรงหน้า</em></h1>
      <p>ห้องนอนคอนโดฉายเป็นโฮโลแกรม หมุนดูได้รอบทิศ เปิดแอร์ ปรับอากาศนอกบ้าน จำนวนคน และความสะอาดของคอยล์ แล้วดูความเย็นเดินไปทั่วห้องตามเวลา</p></div>
      <div class="d-ctas"><a class="btn-primary" href="#book">จองล้างแอร์ · เริ่ม <span data-clean-from>฿700</span></a><a class="btn-ghost" href="#inside">ข้างในแอร์</a></div>
    </div>
    <div id="spRoot"></div>
  </section>''',
}

HERO_JS = {
  'D': "hero: async ({ go }) => { const m = await import('./assets/cinema3d.js'); m.mountCinema(document.getElementById('film'), { cta: Object.assign(document.createElement('div'), { className: 'cn-ctas', innerHTML: '<a class=\"btn-primary\" href=\"#book\">จองล้างแอร์</a>' }) }); },",
  'E': "hero: async ({ go, CART, QC }) => { const m = await import('./assets/atelier.js'); m.mountConcierge(document.getElementById('conRoot'), { go, openCart: CART.open, prefill: QC && QC.prefill }); m.mountDayRoom(document.getElementById('dayRoot')); },",
  'F': "hero: async ({ go }) => { const m = await import('./assets/spatial3d.js'); m.mountSpatial(document.getElementById('spRoot'), { go }); },",
}

def sec(id_, v, body, cls='sec'):
    e, t, p = COPY[id_][v]
    return f'''  <section class="{cls}" id="{id_}">
    <div class="sec-h"><p class="eyebrow">{e}</p><h2>{t}</h2><p>{p}</p></div>
    {body}
  </section>'''

BODY = {
  'doors': '<div id="doorsRoot"></div>', 'paths': '<div id="pathsRoot"></div>',
  'book': '<div id="bookRoot"></div>', 'start': '<div id="startRoot"></div>', 'coverage': '<div id="covRoot"></div>',
  'catalog': '<div id="catalogRoot"></div>', 'tradein': '<div class="panel" id="tiRoot"></div>', 'studio': '<div id="studioRoot"></div>',
  'fit': '<div class="panel" id="fitRoot"></div>', 'cleanflow': '<div class="panel" id="cleanRoot"></div>', 'symptoms': '<div class="panel" id="symRoot"></div>',
  'howto': '<div class="panel" id="servicesRoot"></div>', 'standards': '<div class="panel" id="stdRoot"></div>',
  'prices': '<div id="allSvc"></div><div class="panel" id="priceCenter"></div>', 'quality': '<div class="panel" id="qualityRoot"></div>',
  'enterprise': '<div class="panel" id="entRoot"></div>', 'b2b': '<div id="b2bRoot"></div>', 'learn': '<div class="panel" id="learnRoot"></div>',
  'inside': '<div class="panel" id="howRoot"></div>', 'about': '<div id="aboutRoot"></div>', 'area': '<div id="areaRoot"></div>',
}
EXTRA_CSS = {
  'D': '''.d-intro{max-width:880px}.d-intro h1{font:300 clamp(38px,5.6vw,80px)/1.06 var(--display);letter-spacing:.005em}.d-intro h1 em{font-style:normal;background:var(--holo);-webkit-background-clip:text;background-clip:text;color:transparent}
.d-lead{color:var(--ink-2);font-size:18px;margin:18px 0 24px;max-width:36em}.d-ctas{display:flex;gap:10px;flex-wrap:wrap}
.d-facts{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin:48px 0 0;border-block:1px solid var(--line);background:var(--hud)}.d-facts div{padding:22px 18px;border-left:1px solid var(--line)}.d-facts div:first-child{border-left:0}
.d-facts dt{font:500 11.5px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}.d-facts dd{margin:6px 0 0;font:300 clamp(28px,3vw,42px) var(--display);color:var(--acc)}
@media (max-width:640px){.d-facts{grid-template-columns:1fr 1fr}.d-facts div:nth-child(3){border-left:0}}''',
  'E': '', 'F': '.d-ctas{display:flex;gap:10px;flex-wrap:wrap}',
}

def page(v):
    c = V[v]
    letters = 'DEF'
    vsw = ''.join(f'<a href="./{x.lower()}.html"' + (' aria-current="page"' if x == v else '') + f'>{x}</a>' for x in letters)
    nav = ''.join(f'<a href="{a}">{t}</a>' for a, t in c['nav'])
    hero = HERO[v]
    # sections in view order (home first); the hero sections are already in HERO
    done = {'film', 'intro', 'concierge', 'dome', 'faq', 'quote'}
    order_ids = [i for view in c['order'] for i in c['views'][view] if i not in done]
    secs = '\n'.join(sec(i, v, BODY[i]) for i in order_ids)
    views_js = json.dumps(c['views'], ensure_ascii=False)
    order_js = json.dumps(c['order'])
    labels_js = json.dumps(c['labels'], ensure_ascii=False)
    return f'''<!doctype html>
<html lang="th" data-lux="{v}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Rev.29 second website · design {v} "{c['name']}" — generated by tools/make-lux.py (edit there) -->
<meta name="description" content="{DESC}">
<meta name="theme-color" content="{c['theme']}">
<link rel="canonical" href="{BASE}{v.lower()}.html">
<meta property="og:type" content="website">
<meta property="og:locale" content="th_TH">
<meta property="og:site_name" content="SBP AirCare · บริษัท สหบูรพากรุ๊ป จำกัด">
<meta property="og:title" content="ล้างแอร์ ติดตั้ง ซ่อม · เห็นราคารวมก่อนจอง | SBP AirCare">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{BASE}{v.lower()}.html">
<meta property="og:image" content="{BASE}og/sbp-aircare-og.png">
<meta name="twitter:card" content="summary_large_image">
<title>{c['title']}</title>
<link rel="stylesheet" href="assets/fonts.css">
<link rel="stylesheet" href="assets/shared.css">
<link rel="stylesheet" href="assets/studio.css">
<link rel="stylesheet" href="assets/services.css">
<link rel="stylesheet" href="assets/lux.css">
<style>
{EXTRA_CSS[v]}
</style>
</head>
<body>
<aside class="proto" aria-label="แบบเว็บไซต์">แบบ {v} · ราคาจาก Pricebook 2569 ของบริษัท · <a href="./">เทียบแบบ D · E · F</a></aside>
<header class="hdr"><div class="wrap">
  <a class="logo" href="#home"><img class="logo-mk" data-logo="sbp" alt="" width="40" height="30"><span>SBP AirCare<small>{c['name']}</small></span></a>
  <nav class="nav" aria-label="เมนูหลัก">{nav}</nav>
  <div class="vsw" aria-label="เลือกแบบเว็บไซต์">{vsw}</div>
  <button type="button" class="btn-primary" data-cart-btn>ใบเสนอราคา <span data-cart-n>0</span></button>
</div></header>
<main>
{hero}
{secs}
  <section class="sec faq" id="faq"><div class="sec-h"><p class="eyebrow">คำถามที่พบบ่อย</p><h2>ถามบ่อย ตอบชัด</h2></div><div id="faqList"></div></section>
  <section class="sec" id="quote"><div id="quoteRoot"></div></section>
</div>
</main>
<footer></footer>
<nav class="mbar" aria-label="ติดต่อด่วน"><a class="btn-ghost" href="#quote">โทร</a><a class="btn-ghost" href="#quote">LINE</a><button type="button" class="btn-primary" data-cart-btn>ใบเสนอราคา <span data-cart-n>0</span></button></nav>
<div class="tray" data-compare hidden><ul data-compare-list></ul><button type="button" class="btn-primary" data-compare-go>เทียบ</button></div>
<div class="drawer" data-drawer id="drawer" hidden><div class="dp" role="dialog" aria-modal="true" aria-label="รายละเอียดสินค้า"><button type="button" class="x" data-close aria-label="ปิด">×</button><div id="drawerBody"></div></div></div>
<div id="toast" role="status" aria-live="polite"></div>
<script type="module">
import {{ mountLux }} from './assets/lux-site.js';
await mountLux({{
  variant: '{v}', theme: '{c['theme3d']}', jobType: '{c['jobType']}', studioStart: '{c['studio']}', throwStyle: '{c['throw']}', fitPreset: '{c['fit']}',
  views: {views_js},
  order: {order_js},
  labels: {labels_js},
  {HERO_JS[v]}
}});
</script>
</body>
</html>
'''

for v in 'DEF':
    open(os.path.join(ROOT, v.lower() + '.html'), 'w', encoding='utf-8').write(page(v))
print('wrote d.html e.html f.html')
