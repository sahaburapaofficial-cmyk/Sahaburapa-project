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
