#!/usr/bin/env python3
"""Rev.47 — build the A · B · C developer hand-over checklist from tools/dev-check-data.py (+ the latest
verify-abc/summary.json when it exists): DEV_CHECK_ABC.md in the repo, and a one-page web version.
usage: python3 tools/dev-check.py [web-page-output.html]"""
import html, json, os, runpy, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = runpy.run_path(os.path.join(ROOT, 'tools', 'dev-check-data.py'))
SUM = os.path.join(ROOT, 'verify-abc', 'summary.json')
R = json.load(open(SUM, encoding='utf-8')) if os.path.exists(SUM) else None
E = lambda s: html.escape(str(s), quote=True)

# ---------------------------------------------------------------- Markdown
def md():
    o = ['# SBP AirCare · ส่งมอบ Dev — ตรวจเว็บ A · B · C', '',
         '> ★Rev.47 · 7 ต.ค. 2569 · เจ้าของ: "พัฒนาแค่ A B C พอ" — เอกสารนี้ใช้ตรวจว่าทุกอย่างของแบบ A · B · C ทำงานถูกต้อง',
         '> สร้างจาก `tools/dev-check-data.py` ด้วย `python3 tools/dev-check.py` · สเปกเชิงลึกอยู่ใน `CLAUDE.md` (§6.6 กฎธุรกิจ)', '',
         '## 0. เริ่มตรวจ', '', '```bash', 'cd sbp-aircare && npm install', 'npm run serve &            # dev server :8765',
         'npm run verify:abc         # ตรวจทั้งหมดของ A/B/C (~2–3 ชม. บนเครื่องไม่มีการ์ดจอ) → verify-abc/summary.md',
         'npm run verify:abc -- quick              # ตรรกะ + คอม/มือถือ ต่อแบบ (~30 นาที)',
         'npm run verify:abc -- only=workflow      # เฉพาะชุดที่ชื่อมีคำนี้', '```', '',
         'เปิดดูเว็บ: ' + ' · '.join(f'[{k}]({u})' for k, u in D['LINKS'].items()), '',
         '| แบบ | ชื่อ | ไฟล์ | แนวคิด | จุดเด่นเฉพาะ |', '|---|---|---|---|---|']
    o += [f'| {v} | {n} | `{f}` | {c} | {x} |' for v, n, f, c, x in D['VARIANTS']]
    o += ['', '## 1. ผลตรวจอัตโนมัติล่าสุด', '']
    if R:
        o += [f'`{R["when"]}` · commit `{R["commit"]}` · **pass {R["pass"]} · FAIL {R["fail"]} · skip {R["skip"]}**', '',
              '| ผล | แบบ | การตรวจ | วินาที | หมายเหตุ |', '|---|---|---|---|---|']
        o += [f'| {r["result"]} | {r["v"].upper()} | {r["name"]} | {r["s"]} | {(r.get("note") or "").replace("|", "/")} |' for r in R['rows']]
    else:
        o += ['ยังไม่มีผล — รัน `npm run verify:abc` แล้วสร้างเอกสารนี้ใหม่']
    o += ['', '## 2. ตัวเลขที่ต้องตรง', '', '| รายการ | ค่าที่ต้องเห็น | ที่มา / กฎ | โค้ด |', '|---|---|---|---|']
    o += [f'| {a} | **{b}** | {c} | `{d}` |' for a, b, c, d in D['FIGURES']]
    o += ['', '## 3. หน้าเว็บทีละหน้า', '', 'แบบ = section นี้มีในแบบไหน · ★Rev.47 = เพิ่มรอบล่าสุด', '']
    for vid, th, rows in D['PAGES']:
        o += [f'### {th} (`{vid}`)', '', '| ☐ | section | แบบ | คืออะไร | ตรวจอะไร | โมดูล | เทสต์ |', '|---|---|---|---|---|---|---|']
        o += [f'| ☐ | `#{s}` | {v} | {w} | {c} | `{m}` | {t} |' for s, v, w, c, m, t in rows]
        o += ['']
    o += ['## 4. ทุกหน้า', '', '| ☐ | ส่วน | ตรวจอะไร | โมดูล | เทสต์ |', '|---|---|---|---|---|']
    o += [f'| ☐ | {a} | {b} | `{c}` | {d} |' for a, b, c, d in D['GLOBAL']]
    o += ['', '## 5. เส้นทางลูกค้า (กดเองทั้งคอมและมือถือ)', '', '| ☐ | เส้นทาง | ทำอะไร | ต้องได้ |', '|---|---|---|---|']
    o += [f'| ☐ | {a} | {b} | {c} |' for a, b, c in D['JOURNEYS']]
    o += ['', '## 6. กฎธุรกิจ (CLAUDE.md §6.6)', '', '| ☐ | ข้อ | กฎ | ดูที่ / วิธีตรวจ |', '|---|---|---|---|']
    o += [f'| ☐ | {a} | {b} | {c} |' for a, b, c in D['RULES']]
    o += ['', '## 7. หลังบ้าน (Google Apps Script)', '']
    o += [f'- **{a}:** {b}' for a, b in D['BACKEND']]
    o += ['', '## 8. โครงสร้างโค้ด', '', '| ไฟล์ | หน้าที่ |', '|---|---|']
    o += [f'| `{a}` | {b} |' for a, b in D['CODE']]
    o += ['', 'localStorage (ทุกค่าครอบ try/catch · ไม่มีรูป):', '', '| key | เก็บอะไร | โมดูล |', '|---|---|---|']
    o += [f'| `{a}` | {b} | `{c}` |' for a, b, c in D['STORAGE']]
    o += ['', '## 9. ยังรอ / ข้อจำกัดที่รู้', '']
    o += [f'- {w}' for w in D['WAITING']]
    o += ['']
    return '\n'.join(o)

# ---------------------------------------------------------------- web page
CSS = r'''
:root{--paper:#F4F8FC;--sheet:#FFFFFF;--ink:#0E2238;--ink2:#44576D;--ink3:#5E6B7A;--rule:#CFDBE8;--navy:#003C99;--blue:#0B74B5;--blue-l:#E3F1FB;
  --flag:#C93A0A;--flag-l:#FDECE4;--ok:#1B7A45;--ok-l:#E3F4EA;--bad:#B02A26;--bad-l:#FBE7E6;--skip:#7A6A12;--skip-l:#FBF4D6;
  --sans:'IBM Plex Sans Thai','Noto Sans Thai',system-ui,sans-serif;--mono:'IBM Plex Mono',ui-monospace,Menlo,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:#07162A;--sheet:#0D2139;--ink:#E4EEF9;--ink2:#A9BED6;--ink3:#8EA3BD;--rule:#274567;
  --navy:#9CC4F5;--blue:#6FB8EE;--blue-l:#12304F;--flag:#F28A3A;--flag-l:#3A2211;--ok:#5CC98A;--ok-l:#103222;--bad:#FF8A84;--bad-l:#3A1513;--skip:#E8CF62;--skip-l:#33300F;color-scheme:dark}}
:root[data-theme="dark"]{--paper:#07162A;--sheet:#0D2139;--ink:#E4EEF9;--ink2:#A9BED6;--ink3:#8EA3BD;--rule:#274567;
  --navy:#9CC4F5;--blue:#6FB8EE;--blue-l:#12304F;--flag:#F28A3A;--flag-l:#3A2211;--ok:#5CC98A;--ok-l:#103222;--bad:#FF8A84;--bad-l:#3A1513;--skip:#E8CF62;--skip-l:#33300F;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--paper);color:var(--ink);font:400 15px/1.65 var(--sans);margin:0;padding-inline:16px}
.wrap{max-width:1240px;margin:0 auto;padding-block:28px 64px;display:grid;grid-template-columns:220px minmax(0,1fr);gap:32px}
@media (max-width:900px){.wrap{grid-template-columns:1fr;gap:16px}}
nav.idx{position:sticky;top:16px;align-self:start;display:grid;gap:2px;font-size:13.5px}
nav.idx b{font:600 11px var(--mono);letter-spacing:.12em;color:var(--ink3);text-transform:uppercase;margin:0 0 6px}
nav.idx a{color:var(--ink2);text-decoration:none;padding:5px 10px;border-left:2px solid var(--rule)}
nav.idx a:hover,nav.idx a:focus-visible{color:var(--navy);border-left-color:var(--blue)}
@media (max-width:900px){nav.idx{position:static;display:flex;flex-wrap:wrap;gap:6px}nav.idx b{width:100%}nav.idx a{border:1px solid var(--rule);border-radius:4px}}
main{min-width:0;display:grid;gap:28px}
header.top{display:grid;gap:10px;border-bottom:2px solid var(--navy);padding-bottom:18px}
.doc{font:500 12px var(--mono);letter-spacing:.1em;color:var(--ink3)}
h1{margin:0;font-size:clamp(26px,3.4vw,36px);line-height:1.2;color:var(--navy);text-wrap:balance}
h2{margin:0 0 12px;font-size:21px;color:var(--ink);display:flex;gap:10px;align-items:baseline;text-wrap:balance}
h2 .n{font:600 13px var(--mono);color:var(--flag)}
h3{margin:18px 0 8px;font-size:16.5px;color:var(--navy)}
p{margin:0;max-width:75ch}
.lede{color:var(--ink2)}
section{background:var(--sheet);border:1px solid var(--rule);border-radius:6px;padding:20px 22px;min-width:0}
.links{display:flex;flex-wrap:wrap;gap:8px}
.links a{font:500 13px var(--mono);color:var(--blue);border:1px solid var(--rule);border-radius:4px;padding:5px 10px;text-decoration:none}
.links a:hover{border-color:var(--blue)}
.vars{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media (max-width:700px){.vars{grid-template-columns:1fr}}
.var{border:1px solid var(--rule);border-radius:6px;padding:14px;display:grid;gap:6px;align-content:start}
.var .tag{font:700 22px var(--mono);color:var(--navy)}
.var small{color:var(--ink3);font-size:13px}
pre{margin:0;background:var(--paper);border:1px solid var(--rule);border-radius:4px;padding:12px 14px;overflow-x:auto;font:13px/1.6 var(--mono);color:var(--ink)}
code{font:13px var(--mono);color:var(--navy);overflow-wrap:anywhere}
.tbl{overflow-x:auto;border:1px solid var(--rule);border-radius:4px}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;vertical-align:top;padding:9px 11px;border-bottom:1px solid var(--rule)}
th{font:600 12px var(--mono);letter-spacing:.06em;color:var(--ink3);background:var(--paper);position:sticky;top:0}
tr:last-child td{border-bottom:0}
td.fig{font-weight:700;color:var(--navy);white-space:nowrap;font-variant-numeric:tabular-nums}
td.num{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.pill{display:inline-block;font:700 11.5px var(--mono);padding:2px 8px;border-radius:999px;letter-spacing:.04em}
.pill.pass{background:var(--ok-l);color:var(--ok)}.pill.FAIL{background:var(--bad-l);color:var(--bad)}.pill.skip{background:var(--skip-l);color:var(--skip)}
.vchip{display:inline-flex;gap:3px}.vchip i{font:700 11px var(--mono);font-style:normal;width:20px;height:20px;display:grid;place-items:center;border-radius:3px;background:var(--blue-l);color:var(--navy)}
.new{color:var(--flag);font-weight:600}
.score{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}
.score div{border:1px solid var(--rule);border-radius:6px;padding:10px 14px;min-width:110px}
.score b{display:block;font:700 24px var(--mono);font-variant-numeric:tabular-nums}
.score .p b{color:var(--ok)}.score .f b{color:var(--bad)}.score .s b{color:var(--skip)}
.score small{color:var(--ink3);font-size:12.5px}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px}
.bar button{font:600 13px var(--sans);padding:6px 12px;border-radius:4px;border:1px solid var(--rule);background:var(--sheet);color:var(--ink2);cursor:pointer;min-height:36px}
.bar button[aria-pressed=true]{background:var(--navy);color:var(--sheet);border-color:var(--navy)}
.bar .prog{margin-left:auto;font:600 13px var(--mono);color:var(--ink2)}
.bar button:focus-visible,input:focus-visible,a:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
td.sec code{white-space:nowrap}
td.ck{width:36px}td.ck input{width:18px;height:18px;accent-color:var(--ok);margin:2px 0 0}
tr.done td:not(.ck){color:var(--ink3)}tr.done td.what{text-decoration:line-through;text-decoration-color:var(--rule)}
tr[hidden]{display:none}
ul.wait{margin:0;padding-left:20px;display:grid;gap:6px}
.note{font-size:13px;color:var(--ink3);margin-top:10px}
@media (prefers-reduced-motion:no-preference){nav.idx a,.links a{transition:border-color .15s,color .15s}}
'''

JS = r'''
(() => {
  const K = 'sbp-devcheck-v1'; let st = {}; try { st = JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { st = {}; }
  const save = () => { try { localStorage.setItem(K, JSON.stringify(st)); } catch (e) {} };
  const boxes = [...document.querySelectorAll('input[data-ck]')];
  const prog = document.getElementById('prog');
  const count = () => { const vis = boxes.filter(b => !b.closest('tr').hidden); prog.textContent = `ตรวจแล้ว ${vis.filter(b => b.checked).length} / ${vis.length}`; };
  boxes.forEach(b => { b.checked = !!st[b.dataset.ck]; b.closest('tr').classList.toggle('done', b.checked);
    b.addEventListener('change', () => { st[b.dataset.ck] = b.checked; b.closest('tr').classList.toggle('done', b.checked); save(); count(); }); });
  const btns = [...document.querySelectorAll('[data-v]')];
  const show = v => { btns.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === v)));
    document.querySelectorAll('tr[data-vs]').forEach(tr => { tr.hidden = v !== 'all' && !tr.dataset.vs.includes(v); }); count(); };
  btns.forEach(x => x.addEventListener('click', () => show(x.dataset.v)));
  document.getElementById('reset').addEventListener('click', () => { st = {}; save(); boxes.forEach(b => { b.checked = false; b.closest('tr').classList.remove('done'); }); count(); });
  show('all');
})();
'''

def vchips(vs):
    return '<span class="vchip" aria-label="แบบ ' + ' '.join(vs) + '">' + ''.join(f'<i>{v}</i>' for v in vs) + '</span>'

def star(t):
    t = E(t)
    return t.replace('★Rev.47', '<span class="new">★Rev.47</span>')

def page():
    L = D['LINKS']
    nav = [('start', 'เริ่มตรวจ'), ('results', 'ผลตรวจอัตโนมัติ'), ('figures', 'ตัวเลขที่ต้องตรง'), ('pages', 'หน้าเว็บทีละหน้า'),
           ('global', 'ทุกหน้า'), ('journeys', 'เส้นทางลูกค้า'), ('rules', 'กฎธุรกิจ §6.6'), ('backend', 'หลังบ้าน'), ('code', 'โครงสร้างโค้ด'), ('waiting', 'ยังรอ')]
    o = ['<title>SBP AirCare Dev Handover</title>',
         '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap">',
         f'<style>{CSS}</style><div class="wrap">',
         '<nav class="idx" aria-label="สารบัญ"><b>สารบัญ</b>' + ''.join(f'<a href="#{i}">{t}</a>' for i, t in nav) + '</nav><main>',
         '<header class="top"><span class="doc">SBP-WEB-011 · HANDOVER · A · B · C · REV.47 · 7 ต.ค. 2569</span>',
         '<h1>ส่งมอบ Dev: ตรวจเว็บ SBP AirCare แบบ A · B · C</h1>',
         '<p class="lede">รายการตรวจทุกหน้า ทุกตัวเลข ทุกกฎธุรกิจ และทุกเส้นทางลูกค้าของแบบ A · B · C พร้อมผลตรวจอัตโนมัติล่าสุดและโค้ดที่เกี่ยวข้อง เจ้าของสั่งพัฒนาเฉพาะ A · B · C (D · E · F หยุดไว้)</p>',
         '<div class="links">' + ''.join(f'<a href="{E(u)}" target="_blank" rel="noopener">{E(k)}</a>' for k, u in L.items()) + '</div></header>']
    # start
    o += ['<section id="start"><h2><span class="n">00</span>เริ่มตรวจ</h2>',
          '<pre>cd sbp-aircare &amp;&amp; npm install\nnpm run serve &amp;               # dev server :8765\nnpm run verify:abc            # ตรวจทั้งหมดของ A/B/C → verify-abc/summary.md\nnpm run verify:abc -- quick   # ย่อ ~30 นาที\npython3 tools/dev-check.py    # สร้างเอกสารนี้ใหม่ (DEV_CHECK_ABC.md) จากผลล่าสุด</pre>',
          '<div class="vars" style="margin-top:14px">']
    o += [f'<div class="var"><span class="tag">{v}</span><b>{E(n)}</b><code>{E(f)}</code><small>{E(c)}</small><span>{E(x)}</span></div>' for v, n, f, c, x in D['VARIANTS']]
    o += ['</div></section>']
    # results
    o += ['<section id="results"><h2><span class="n">01</span>ผลตรวจอัตโนมัติ</h2>']
    if R:
        o += [f'<p class="lede">รันเมื่อ <code>{E(R["when"][:16].replace("T", " "))} UTC</code> · commit <code>{E(R["commit"])}</code> · เครื่องทดสอบไม่มีการ์ดจอ (Chromium + swiftshader)</p>',
              f'<div class="score" style="margin-top:12px"><div class="p"><b>{R["pass"]}</b><small>ผ่าน</small></div><div class="f"><b>{R["fail"]}</b><small>ไม่ผ่าน</small></div><div class="s"><b>{R["skip"]}</b><small>ข้าม</small></div></div>',
              '<div class="tbl"><table><thead><tr><th>ผล</th><th>แบบ</th><th>การตรวจ</th><th>วินาที</th><th>หมายเหตุ</th></tr></thead><tbody>']
        o += [f'<tr><td><span class="pill {E(r["result"])}">{E(r["result"])}</span></td><td>{E(r["v"].upper())}</td><td>{E(r["name"])}</td><td class="num">{r["s"]}</td><td><small>{E(r.get("note") or "")}</small></td></tr>' for r in R['rows']]
        o += ['</tbody></table></div>']
    else:
        o += ['<p>ยังไม่มีผล — รัน <code>npm run verify:abc</code></p>']
    o += ['</section>']
    # figures
    o += ['<section id="figures"><h2><span class="n">02</span>ตัวเลขที่ต้องตรง</h2><p class="lede">ทุกราคาก่อน VAT เว้นแต่เขียนไว้ เทียบกับสิ่งที่หน้าเว็บแสดง</p>',
          '<div class="tbl" style="margin-top:12px"><table><thead><tr><th>รายการ</th><th>ค่าที่ต้องเห็น</th><th>ที่มา / กฎ</th><th>โค้ด</th></tr></thead><tbody>']
    o += [f'<tr><td>{E(a)}</td><td class="fig">{E(b)}</td><td>{E(c)}</td><td><code>{E(d)}</code></td></tr>' for a, b, c, d in D['FIGURES']]
    o += ['</tbody></table></div></section>']
    # pages
    o += ['<section id="pages"><h2><span class="n">03</span>หน้าเว็บทีละหน้า</h2>',
          '<div class="bar" role="group" aria-label="กรองตามแบบ"><button type="button" data-v="all">ทุกแบบ</button><button type="button" data-v="A">A</button><button type="button" data-v="B">B</button><button type="button" data-v="C">C</button>',
          '<button type="button" id="reset">ล้างเครื่องหมาย</button><span class="prog" id="prog" aria-live="polite"></span></div>',
          '<p class="note" style="margin:0 0 6px">เครื่องหมายที่ติ๊กจำไว้ในเบราว์เซอร์นี้เท่านั้น</p>']
    for vid, th, rows in D['PAGES']:
        o += [f'<h3>{E(th)} <code>{E(vid)}</code></h3><div class="tbl"><table><thead><tr><th></th><th>section</th><th>แบบ</th><th>คืออะไร</th><th>ตรวจอะไร</th><th>โมดูล · เทสต์</th></tr></thead><tbody>']
        for i, (s, v, w, c, m, t) in enumerate(rows):
            k = f'p-{vid}-{i}'
            o.append(f'<tr data-vs="{E(v)}"><td class="ck"><input type="checkbox" data-ck="{k}" id="{k}" aria-label="ตรวจแล้ว {E(s)}"></td><td class="sec"><code>#{E(s)}</code></td><td>{vchips(v)}</td><td class="what">{star(w)}</td><td>{star(c)}</td><td><code>{E(m)}</code><br><small>{E(t)}</small></td></tr>')
        o += ['</tbody></table></div>']
    o += ['</section>']
    # global
    o += ['<section id="global"><h2><span class="n">04</span>ทุกหน้า</h2><div class="tbl"><table><thead><tr><th></th><th>ส่วน</th><th>ตรวจอะไร</th><th>โมดูล · เทสต์</th></tr></thead><tbody>']
    o += [f'<tr data-vs="ABC"><td class="ck"><input type="checkbox" data-ck="g-{i}" id="g-{i}" aria-label="ตรวจแล้ว {E(a)}"></td><td class="what">{E(a)}</td><td>{E(b)}</td><td><code>{E(c)}</code><br><small>{E(d)}</small></td></tr>' for i, (a, b, c, d) in enumerate(D['GLOBAL'])]
    o += ['</tbody></table></div></section>']
    # journeys
    o += ['<section id="journeys"><h2><span class="n">05</span>เส้นทางลูกค้า</h2><p class="lede">กดเองบนคอม (1366 px) และมือถือ (390 px) ทุกแบบ · เทสต์อัตโนมัติ <code>tests/workflow.mjs</code> ทำเส้นทางเดียวกัน</p>',
          '<div class="tbl" style="margin-top:12px"><table><thead><tr><th></th><th>เส้นทาง</th><th>ทำอะไร</th><th>ต้องได้</th></tr></thead><tbody>']
    o += [f'<tr data-vs="ABC"><td class="ck"><input type="checkbox" data-ck="j-{i}" id="j-{i}" aria-label="ตรวจแล้ว {E(a)}"></td><td class="what">{star(a)}</td><td>{E(b)}</td><td>{E(c)}</td></tr>' for i, (a, b, c) in enumerate(D['JOURNEYS'])]
    o += ['</tbody></table></div></section>']
    # rules
    o += ['<section id="rules"><h2><span class="n">06</span>กฎธุรกิจ (CLAUDE.md §6.6)</h2><p class="lede">ห้ามแก้โดยไม่มีคำอนุมัติเป็นลายลักษณ์อักษรจากเจ้าของ</p>',
          '<div class="tbl" style="margin-top:12px"><table><thead><tr><th></th><th>ข้อ</th><th>กฎ</th><th>ดูที่ / วิธีตรวจ</th></tr></thead><tbody>']
    o += [f'<tr data-vs="ABC"><td class="ck"><input type="checkbox" data-ck="r-{i}" id="r-{i}" aria-label="ตรวจแล้ว กฎข้อ {E(a)}"></td><td class="fig">{E(a)}</td><td class="what">{E(b)}</td><td>{E(c)}</td></tr>' for i, (a, b, c) in enumerate(D['RULES'])]
    o += ['</tbody></table></div></section>']
    # backend
    o += ['<section id="backend"><h2><span class="n">07</span>หลังบ้าน (Google Apps Script)</h2><div class="tbl"><table><tbody>']
    o += [f'<tr><th scope="row" style="position:static;width:140px">{E(a)}</th><td>{E(b)}</td></tr>' for a, b in D['BACKEND']]
    o += ['</tbody></table></div></section>']
    # code
    o += ['<section id="code"><h2><span class="n">08</span>โครงสร้างโค้ด</h2><div class="tbl"><table><thead><tr><th>ไฟล์</th><th>หน้าที่</th></tr></thead><tbody>']
    o += [f'<tr><td><code>{E(a)}</code></td><td>{star(b)}</td></tr>' for a, b in D['CODE']]
    o += ['</tbody></table></div><h3>localStorage</h3><div class="tbl"><table><thead><tr><th>key</th><th>เก็บอะไร</th><th>โมดูล</th></tr></thead><tbody>']
    o += [f'<tr><td><code>{E(a)}</code></td><td>{E(b)}</td><td><code>{E(c)}</code></td></tr>' for a, b, c in D['STORAGE']]
    o += ['</tbody></table></div><p class="note">ทุกการอ่าน/เขียนครอบ try/catch · ไม่เก็บรูป · global ที่อนุญาต: __SBP_DATA __SBP_TH __SBP_LOGOS __SBP_ADDR SBP_HUB SBP_URLS</p></section>']
    # waiting
    o += ['<section id="waiting"><h2><span class="n">09</span>ยังรอ / ข้อจำกัดที่รู้</h2><ul class="wait">' + ''.join(f'<li>{E(w)}</li>' for w in D['WAITING']) + '</ul></section>']
    o += ['</main></div>', f'<script>{JS}</script>']
    return '\n'.join(o)

open(os.path.join(ROOT, 'DEV_CHECK_ABC.md'), 'w', encoding='utf-8').write(md())
if len(sys.argv) > 1:
    open(sys.argv[1], 'w', encoding='utf-8').write(page())
print('DEV_CHECK_ABC.md' + (' + ' + sys.argv[1] if len(sys.argv) > 1 else '') + (f' · results pass {R["pass"]} FAIL {R["fail"]}' if R else ' · no results yet'))
