#!/usr/bin/env python3
"""Rev.20 — build assets/th-address.json: Thai postal address picker data + coordinates for the travel rule.

Sources (fetch once, then run):
  names + postcodes : npm @riz007/thai-address-data (MIT, derived from thailand-geography-json)  → dist/data.json
  admin codes       : npm thai-address-database (ISC) database/backup/geodb.json (TIS-1099 codes per district / subdistrict)
  coordinates       : Wikidata (CC0) — every item with P1067 (Thailand central administrative unit code) and P625
                      curl -G https://query.wikidata.org/sparql -H 'Accept: text/csv' --data-urlencode \
                        'query=SELECT ?code ?label ?coord WHERE { ?d wdt:P1067 ?code; wdt:P625 ?coord. OPTIONAL { ?d rdfs:label ?label FILTER(lang(?label)="th") } }'
usage: python3 tools/build-address.py <riz data.json> <geodb.json> <wikidata.csv>
Output: provinces whose nearest district office is within MAX_ROAD_KM road km of HQ get every district / subdistrict / postcode
with coordinates (district office point; subdistrict point when Wikidata has one); the other provinces are listed by name only
(the site says "outside the service area" for them).
"""
import csv, json, math, os, re, sys

HQ = (13.664, 100.44)          # sbp-core.js HQ (approximate point, 593 ถ.พระราม 2)
ROAD = 1.35                    # sbp-core.js TRAVEL.roadFactor
MAX_ROAD_KM = 170              # a little beyond TRAVEL.maxKm (150) so a province on the edge still lists its districts

def hav(a, b):
    R, t = 6371, math.radians
    dl, dn = t(b[0] - a[0]), t(b[1] - a[1])
    s = math.sin(dl / 2) ** 2 + math.cos(t(a[0])) * math.cos(t(b[0])) * math.sin(dn / 2) ** 2
    return 2 * R * math.asin(math.sqrt(s))

riz, geo, wd = sys.argv[1:4]
rows = json.load(open(riz, encoding='utf-8'))
g = json.load(open(geo, encoding='utf-8'))
lookup, words = g['lookup'].split('|'), g['words'].split('|')
def t(x):
    if isinstance(x, int): x = lookup[x]
    return re.sub(r'[A-Za-z]', lambda m: words[ord(m.group()) - 65 if ord(m.group()) < 97 else 26 + ord(m.group()) - 97], x)
dcode, scode = {}, {}
for p in g['data']:
    for a in p[2]:
        dcode[(t(p[0]), t(a[0]))] = str(a[1])
        for d in a[2]: scode[(t(p[0]), t(a[0]), t(d[0]))] = str(d[1])
co = {}
for r in csv.DictReader(open(wd, encoding='utf-8')):
    m = re.match(r'Point\(([-\d.]+) ([-\d.]+)\)', r['coord'])
    if m: co.setdefault(r['code'], (round(float(m.group(2)), 3), round(float(m.group(1)), 3)))

tree = {}
for r in rows:
    tree.setdefault(r['province'], {}).setdefault(r['district'], []).append((r['subdistrict'], r['zipcode']))
near, other, miss = [], [], []
for p in sorted(tree, key=lambda s: (s != 'กรุงเทพมหานคร', s)):
    ds = []
    for d in sorted(tree[p]):
        c = co.get(dcode.get((p, d), ''))
        if not c:   # no district point: the mean of its subdistrict points, else skip coordinates
            pts = [co[scode[(p, d, s)]] for s, _ in tree[p][d] if scode.get((p, d, s)) in co]
            c = (round(sum(x[0] for x in pts) / len(pts), 3), round(sum(x[1] for x in pts) / len(pts), 3)) if pts else None
        if not c: miss.append((p, d)); continue
        subs = []
        for s, z in sorted(tree[p][d]):
            sc = co.get(scode.get((p, d, s), ''))
            subs.append([s, z] + (list(sc) if sc else []))
        ds.append([d, c[0], c[1], subs])
    if ds and min(hav(HQ, (d[1], d[2])) for d in ds) * ROAD <= MAX_ROAD_KM: near.append([p, ds])
    else: other.append(p)
out = {'v': 'ชื่อและรหัสไปรษณีย์: thailand-geography-json (ผ่าน @riz007/thai-address-data) · พิกัด: Wikidata (จุดที่ว่าการเขต/อำเภอ หรือจุดกลางแขวง/ตำบล)',
       'p': near, 'o': other}
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'th-address.json')
json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
n_sub = sum(len(d[3]) for p in near for d in p[1]); n_pt = sum(1 for p in near for d in p[1] for s in d[3] if len(s) > 2)
print(json.dumps({'provinces_detail': len(near), 'provinces_name_only': len(other), 'districts': sum(len(p[1]) for p in near),
                  'subdistricts': n_sub, 'subdistrict_points': n_pt, 'districts_without_point': miss, 'kb': os.path.getsize(dst) // 1024}, ensure_ascii=False))
