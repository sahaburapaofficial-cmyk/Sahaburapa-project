#!/usr/bin/env python3
"""Rev.47 — the A · B · C developer hand-over package (owner 7 ต.ค. 2569: "จัดทำเป็นไฟล์พร้อม code และข้อมูลทั้งหมดของ 3 model
แบบละเอียดให้ส่ง dev"). Builds dist/SBP-AirCare-ABC-Dev.zip:
  open-me/  a, b, c, index .html — single-file builds made FROM the packaged source (proves the source builds on its own)
  source/   every tracked file the A · B · C pages need (D · E · F pages, their modules, stills and tools left out)
  data/     tools/export-data.mjs output (CSV + constants.json, as the browser sees the data)
  docs/     DEV_CHECK_ABC.md + web page, CLAUDE.md, HANDOFF.md, latest verify-abc summary
Never packs internal/ (special / project rates). usage: python3 tools/pack-abc.py"""
import json, os, re, shutil, subprocess, sys, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAME = 'SBP-AirCare-ABC-Dev'
run = lambda *a, **k: subprocess.run(a, cwd=k.pop('cwd', ROOT), check=True, capture_output=True, text=True, **k).stdout

# 1 the JS modules A · B · C really load (esbuild metafile of the three page scripts, lazy imports included)
need = set()
with tempfile.TemporaryDirectory() as t:
    for v in 'abc':
        m = re.search(r'<script type="module">(.*?)</script>', open(os.path.join(ROOT, f'{v}.html'), encoding='utf-8').read(), re.S)
        e = os.path.join(ROOT, f'_entry_pack_{v}.mjs'); open(e, 'w', encoding='utf-8').write(m.group(1))
        try: run('npx', '--yes', 'esbuild@0.28.2', e, '--bundle', '--format=esm', f'--metafile={t}/{v}.json', '--outfile=/dev/null', '--log-level=error')
        finally: os.remove(e)
        need |= {k for k in json.load(open(f'{t}/{v}.json'))['inputs'] if k.startswith('assets/')}

DEF_ONLY = {'d.html', 'e.html', 'f.html', 'showcase.html', 'index.html', 'hub.tpl.html', 'hub.tpl2.html', 'hub-local.html',
            'assets/lux.css', 'tools/make-lux.py', 'tools/render-film.mjs', 'tests/lux.mjs', 'tests/sound.mjs', 'tests/aislots.mjs', 'tests/film-shots.mjs'}
def keep(f):
    if f in DEF_ONLY or f.startswith(('internal/', 'assets/showcase/', '.github/', 'handover-abc/')): return False
    if f.startswith('assets/') and f.endswith('.js') and f.count('/') == 1: return f in need
    if f.startswith('assets/stills/'):
        b = os.path.basename(f)
        return b in ('embed.js', 'manifest.json') or b[:2] in ('A-', 'B-', 'C-')
    return True
files = [f for f in run('git', 'ls-files').split('\n') if f and keep(f)]
# tools and docs made for this hand-over may not be committed yet
for f in ('tools/pack-abc.py', 'tools/export-data.mjs', 'tools/verify-abc.mjs', 'tools/dev-check.py', 'tools/dev-check-data.py', 'DEV_CHECK_ABC.md', 'DEV_PACKAGE_README.md'):
    if f not in files and os.path.exists(os.path.join(ROOT, f)): files.append(f)

with tempfile.TemporaryDirectory() as T:
    P = os.path.join(T, NAME); SRC = os.path.join(P, 'source')
    for f in files:
        d = os.path.join(SRC, f); os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copy2(os.path.join(ROOT, f), d)
    # stills manifest: A · B · C only (no D · E · F entries, no hero films)
    mp = os.path.join(SRC, 'assets', 'stills', 'manifest.json')
    if os.path.exists(mp):
        m = json.load(open(mp, encoding='utf-8')); m = {k: v for k, v in m.items() if k in ('fig', 'A', 'B', 'C')}
        open(mp, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1))
    # package.json: drop the D · E · F scripts, keep A · B · C ones
    pj = os.path.join(SRC, 'package.json'); j = json.load(open(pj, encoding='utf-8'))
    for k in ('smoke:2', 'smoke:2:mobile', 'textscan:2', 'lux', 'lux:gen', 'sound', 'aislots'): j['scripts'].pop(k, None)
    for k, v in list(j['scripts'].items()):
        if re.search(r'\b[def]\.html', v): j['scripts'][k] = ' && '.join(p for p in v.split(' && ') if not re.search(r'\b[def]\.html', p))
    j['scripts']['servicepath'] = 'node tests/servicepath.mjs a.html && node tests/servicepath.mjs b.html mobile && node tests/servicepath.mjs c.html'
    open(pj, 'w', encoding='utf-8').write(json.dumps(j, ensure_ascii=False, indent=2) + '\n')
    # 2 build the single files from the packaged source (relative links between a / b / c / index)
    out = run('python3', 'build.py', cwd=SRC)
    print('build', out.strip().splitlines()[-1])
    os.makedirs(os.path.join(P, 'open-me'))
    for v in ('a', 'b', 'c', 'index'):
        shutil.copy2(os.path.join(SRC, 'dist', 'offline', f'{v}.html'), os.path.join(P, 'open-me', f'{v}.html'))
    for d in ('dist', 'node_modules'): shutil.rmtree(os.path.join(SRC, d), ignore_errors=True)
    for f in os.listdir(SRC):
        if f.startswith('_entry_'): os.remove(os.path.join(SRC, f))
    # 3 data as the browser sees it
    run('node', 'tools/export-data.mjs', os.path.relpath(os.path.join(P, 'data'), ROOT))
    # 4 docs (+ the latest automatic check, when there is one)
    D = os.path.join(P, 'docs'); os.makedirs(D)
    run('python3', 'tools/dev-check.py', os.path.join(D, 'dev-check.html'))
    for f in ('DEV_CHECK_ABC.md', 'CLAUDE.md', 'HANDOFF.md'): shutil.copy2(os.path.join(ROOT, f), D)
    s = os.path.join(ROOT, 'verify-abc', 'summary.md')
    if os.path.exists(s): shutil.copy2(s, os.path.join(D, 'verify-abc-summary.md'))
    # the web page is a fragment for the artifact viewer: give the packaged copy a full document head
    hp = os.path.join(D, 'dev-check.html'); h = open(hp, encoding='utf-8').read()
    open(hp, 'w', encoding='utf-8').write('<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + h + '</body></html>')
    shutil.copy2(os.path.join(ROOT, 'DEV_PACKAGE_README.md'), os.path.join(P, 'README.md'))
    # 5 never ship internal data
    for dp, _, fs in os.walk(P):
        for f in fs: assert 'sbp_real' not in f, f
    z = os.path.join(ROOT, 'dist', NAME + '.zip'); os.makedirs(os.path.dirname(z), exist_ok=True)
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as Z:
        for dp, _, fs in os.walk(P):
            for f in sorted(fs): Z.write(os.path.join(dp, f), os.path.relpath(os.path.join(dp, f), T))
    n = sum(len(fs) for _, _, fs in os.walk(P))
    # handover-abc/ (committed, so the owner can forward one GitHub link): the zip, the data, the checklist page, the results
    H = os.path.join(ROOT, 'handover-abc'); os.makedirs(H, exist_ok=True)
    shutil.copy2(z, os.path.join(H, NAME + '.zip'))
    shutil.rmtree(os.path.join(H, 'data'), ignore_errors=True); shutil.copytree(os.path.join(P, 'data'), os.path.join(H, 'data'))
    shutil.copy2(os.path.join(D, 'dev-check.html'), os.path.join(H, 'dev-check.html'))
    if os.path.exists(s): shutil.copy2(s, os.path.join(H, 'verify-abc-summary.md'))
print(json.dumps({'zip': os.path.relpath(z, ROOT), 'files': n, 'source_files': len(files), 'js_modules': len([x for x in need if x.endswith('.js')]), 'mb': round(os.path.getsize(z) / 1e6, 1)}))
