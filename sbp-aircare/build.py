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
# Rev.20 address book for the area picker + travel rule (assets/th-address.json, tools/build-address.py)
ADDRJ = read(os.path.join(A, 'th-address.json'))
DATA_TAG += '<script>globalThis.__SBP_ADDR=' + ADDRJ.replace('</', '<\\/') + '</script>'
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
# Rev.09 product photos: the manifest is inlined; the image files are copied next to every built page (products/…)
# and must be published with each artifact (Artifact tool `files`: {"products/<file>": "dist/art/products/<file>"}).
MEDIA_JSON = os.path.join(A, 'product-media.json')
PRODUCT_DIR = os.path.join(A, 'products')
MEDIA = json.load(open(MEDIA_JSON, encoding='utf-8')) if os.path.exists(MEDIA_JSON) else {}
MEDIA = {k: v for k, v in MEDIA.items() if not k.startswith('_')}
MEDIA['base'] = 'products/'
DATA_TAG += '<script>globalThis.__SBP_MEDIA=' + json.dumps(MEDIA, ensure_ascii=False).replace('</', '<\\/') + '</script>'
import shutil
media_files = []
if os.path.isdir(PRODUCT_DIR):
    for f in sorted(os.listdir(PRODUCT_DIR)):
        if os.path.splitext(f)[1].lower() in ('.webp', '.png', '.jpg', '.jpeg', '.avif'):
            media_files.append(f)
            for sub in ('offline', 'art'):
                os.makedirs(os.path.join(DIST, sub, 'products'), exist_ok=True)
                shutil.copy2(os.path.join(PRODUCT_DIR, f), os.path.join(DIST, sub, 'products', f))
# Rev.11: link-preview image (og:image in each page head) + sitemap for the self-hosted site (GitHub Pages → dist/offline)
SITE = 'https://sahaburapaofficial-cmyk.github.io/Sahaburapa-project/'
OG_DIR = os.path.join(A, 'og')
if os.path.isdir(OG_DIR):
    os.makedirs(os.path.join(DIST, 'offline', 'og'), exist_ok=True)
    for f in os.listdir(OG_DIR):
        shutil.copy2(os.path.join(OG_DIR, f), os.path.join(DIST, 'offline', 'og', f))
import datetime
_today = datetime.date.today().isoformat()
open(os.path.join(DIST, 'offline', 'sitemap.xml'), 'w', encoding='utf-8').write(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{SITE}{p}</loc><lastmod>{_today}</lastmod></url>\n' for p in ('', 'a.html', 'b.html', 'c.html')) + '</urlset>\n')
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
# Rev.10: the tester's "ส่งผลให้ทีม" posts to the same Apps Script endpoint as the site forms (single source: assets/submit.js)
# Rev.19: ENDPOINT = BACKEND_URL (Apps Script, when deployed) || FORMSUBMIT — same rule as submit.js
_sj = read(os.path.join(A, 'submit.js'))
EP = re.search(r"const BACKEND_URL = '([^']*)'", _sj).group(1) or re.search(r"const FORMSUBMIT = '([^']*)'", _sj).group(1)
if EP: pv = pv.replace('__SBP_ENDPOINT__', EP)
pv = re.sub(r'<link rel="stylesheet" href="assets/([\w.-]+\.css)">', lambda m: f'<style>{css_inline(m.group(1))}</style>', pv)
packs = ''.join(
    f'<script type="application/octet-stream" id="pack-{v}">' + base64.b64encode(gzip.compress(links(built[v], 'embed').encode(), 9)).decode() + '</script>'
    for v in 'abc')
urls_tag = '<script>window.SBP_URLS=' + json.dumps(URLS) + '</script>'
art_pv = pv.replace('<body>', '<body>' + urls_tag + packs, 1)
open(os.path.join(DIST, 'art', 'index.html'), 'w', encoding='utf-8').write(strip_doc(art_pv))
open(os.path.join(DIST, 'offline', 'index.html'), 'w', encoding='utf-8').write(pv.replace('href="./"', 'href="./index.html"'))
sizes['tester'] = len(art_pv.encode()) // 1024
# ---- Rev.11: multi-file site for self-hosting (GitHub Pages → dist/site) ----
# Same pages and code as the single-file builds, but split so phones fetch and run less up front: CSS and fonts as cacheable
# files, the price/map data as one shared script, and the JS bundled with code splitting — the scenes that are only opened
# on demand (crew 3D, room studio, room fit, materials showroom, engineering drawings) become separate chunks loaded when
# needed, and three.js is one shared chunk cached across A / B / C. dist/offline and dist/art are unchanged.
import hashlib
SITE_DIR = os.path.join(DIST, 'site')
shutil.rmtree(SITE_DIR, ignore_errors=True)
os.makedirs(os.path.join(SITE_DIR, 'js'), exist_ok=True)
shutil.copytree(os.path.join(A, 'fonts'), os.path.join(SITE_DIR, 'assets', 'fonts'))
for f in os.listdir(A):
    if f.endswith('.css'): shutil.copy2(os.path.join(A, f), os.path.join(SITE_DIR, 'assets', f))
for sub in ('products', 'og'):
    src = os.path.join(DIST, 'offline', sub)
    if os.path.isdir(src): shutil.copytree(src, os.path.join(SITE_DIR, sub))
shutil.copy2(os.path.join(DIST, 'offline', 'sitemap.xml'), os.path.join(SITE_DIR, 'sitemap.xml'))
data_js = re.sub(r'</?script>', '', DATA_TAG.replace('</script><script>', ';\n'))
dh = hashlib.sha1(data_js.encode()).hexdigest()[:10]
open(os.path.join(SITE_DIR, 'js', f'data-{dh}.js'), 'w', encoding='utf-8').write(data_js.replace('<\\/', '</'))
entries = {}
for v in 'abc':
    html = read(os.path.join(ROOT, f'{v}.html'))
    m = re.search(r'<script type="module">(.*?)</script>', html, flags=re.S)
    entries[v] = (html, m)
    open(os.path.join(ROOT, f'_entry_site_{v}.mjs'), 'w', encoding='utf-8').write(m.group(1))
meta_path = os.path.join(ROOT, '_entry_site_meta.json')
try:
    subprocess.run(['npx', '--yes', 'esbuild@0.28.2', *[f'_entry_site_{v}.mjs' for v in 'abc'], '--bundle', '--splitting', '--format=esm', '--minify',
                    '--target=es2022', '--legal-comments=none', '--log-level=warning', '--outdir=' + os.path.join(SITE_DIR, 'js'),
                    '--entry-names=[name]-[hash]', '--chunk-names=c-[hash]', '--metafile=' + meta_path], cwd=ROOT, check=True)
    meta = json.load(open(meta_path))
finally:
    for v in 'abc':
        try: os.remove(os.path.join(ROOT, f'_entry_site_{v}.mjs'))
        except OSError: pass
out_of = {v: next(os.path.basename(k) for k, o in meta['outputs'].items() if o.get('entryPoint', '').endswith(f'_entry_site_{v}.mjs')) for v in 'abc'}
os.remove(meta_path)
for v in 'abc':
    html, m = entries[v]
    tag = (f'<link rel="modulepreload" href="js/{out_of[v]}"><script src="js/data-{dh}.js"></script>'
           f'<script type="module" src="js/{out_of[v]}"></script>')
    page = html[:m.start()] + tag + html[m.end():]
    open(os.path.join(SITE_DIR, f'{v}.html'), 'w', encoding='utf-8').write(links(page, 'offline'))
site_pv = read(os.path.join(ROOT, 'preview.html'))
if EP: site_pv = site_pv.replace('__SBP_ENDPOINT__', EP)
open(os.path.join(SITE_DIR, 'index.html'), 'w', encoding='utf-8').write(site_pv.replace('href="./"', 'href="./index.html"'))
open(os.path.join(SITE_DIR, '.nojekyll'), 'w').close()
site_kb = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(SITE_DIR) for f in fs) // 1024
sizes['site_total'] = site_kb
print(json.dumps({'variant_kb': sizes, 'product_photos': len(media_files)}))
