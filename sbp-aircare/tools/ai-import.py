#!/usr/bin/env python3
"""Rev.41 — put an AI-made image into a D · E · F picture slot.
usage: python3 tools/ai-import.py <slot> <image file> [--alt "คำอธิบายภาพ"] [--tool Higgsfield]
       python3 tools/ai-import.py --remove <slot>
slots: door:clean door:install door:repair · c1–c6 (ล้าง) · i1–i6 (ติดตั้ง) · r1–r6 (ซ่อม)
The image is centre-cropped to 16:10, resized to 1600 × 1000 and saved as WebP in assets/ai/, and the manifest gets the entry.
Check before importing: no logos or brand names (rule 14), no brand on a customer's AC (rule 20), not presented as a real photo of
our team or a customer's home (rule 15) — the page labels every AI image "ภาพประกอบ (AI)"."""
import json, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); AI = os.path.join(HERE, 'assets', 'ai'); MAN = os.path.join(AI, 'manifest.json')
SLOTS = ['door:clean', 'door:install', 'door:repair'] + [f'{s}{i}' for s in 'cir' for i in range(1, 7)]
man = json.load(open(MAN, encoding='utf-8')) if os.path.exists(MAN) else {}
a = sys.argv[1:]
if a[:1] == ['--remove']:
    k = a[1]; e = man.pop(k, None)
    if e and os.path.exists(os.path.join(AI, e['file'])): os.remove(os.path.join(AI, e['file']))
else:
    if len(a) < 2 or a[0] not in SLOTS: sys.exit(__doc__)
    k, src = a[0], a[1]; opt = lambda n, d='': a[a.index(n) + 1] if n in a else d
    im = Image.open(src).convert('RGB'); w, h = im.size; r = 16 / 10
    if w / h > r: nw = int(h * r); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else: nh = int(w / r); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im = im.resize((1600, 1000), Image.LANCZOS)
    name = k.replace(':', '-') + '.webp'; im.save(os.path.join(AI, name), 'WEBP', quality=84, method=6)
    man[k] = {'file': name, 'alt': opt('--alt'), 'tool': opt('--tool', 'AI')}
json.dump(dict(sorted(man.items())), open(MAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(json.dumps({'slots': len(man), 'kb': {k: os.path.getsize(os.path.join(AI, v['file'])) // 1024 for k, v in man.items()}}, ensure_ascii=False))
