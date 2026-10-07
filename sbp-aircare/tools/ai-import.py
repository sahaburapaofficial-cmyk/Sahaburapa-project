#!/usr/bin/env python3
"""Rev.41 — put an AI-made image into a D · E · F picture slot.
usage: python3 tools/ai-import.py <slot> <image file> [--alt "คำอธิบายภาพ"] [--tool Higgsfield]
       python3 tools/ai-import.py --remove <slot>
slots: door:clean door:install door:repair · c1–c6 (ล้าง) · i1–i6 (ติดตั้ง) · r1–r6 (ซ่อม)
       hero:D hero:E hero:F (ภาพหรือวิดีโอแถบบนสุดของหน้าแรก) · sym:<อาการ> ×14 · kn:<หัวข้อความรู้> ×12 · ent:<ประเภทองค์กร> ×7
Images: centre-cropped to the slot's shape (16:10 · hero 21:9 · kn/ent 16:9), resized and saved as WebP in assets/ai/.
Videos (.mp4 .mov .webm, hero only): ffmpeg → H.264 MP4, no sound, ≤ 8 s, 1280 px wide, plus a WebP poster from the first second.
Check before importing: no logos or brand names (rule 14), no brand on a customer's AC (rule 20), not presented as a real photo of
our team or a customer's home (rule 15) — the page labels every AI image "ภาพประกอบ (AI)"."""
import json, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); AI = os.path.join(HERE, 'assets', 'ai'); MAN = os.path.join(AI, 'manifest.json')
SYM = 'warm drip ice dead code trip cycle noise smell weak swing cduwater bill care'.split()
KN = 'btu types inverter clean c1c2 install place contract packages docs vrf area'.split()
ENT = 'office chain condo hospital school hotel factory'.split()
SLOTS = ['door:clean', 'door:install', 'door:repair'] + [f'{s}{i}' for s in 'cir' for i in range(1, 7)] + [f'hero:{v}' for v in 'DEF'] + [f'sym:{x}' for x in SYM] + [f'kn:{x}' for x in KN] + [f'ent:{x}' for x in ENT]
SHAPE = lambda k: (21 / 9, 1680, 720) if k.startswith('hero:') else (16 / 9, 1600, 900) if k.startswith(('kn:', 'ent:')) else (16 / 10, 1600, 1000)
man = json.load(open(MAN, encoding='utf-8')) if os.path.exists(MAN) else {}
a = sys.argv[1:]
if a[:1] == ['--remove']:
    k = a[1]; e = man.pop(k, None)
    for f in [e and e.get('file'), e and e.get('poster')]:
        if f and os.path.exists(os.path.join(AI, f)): os.remove(os.path.join(AI, f))
else:
    if len(a) < 2 or a[0] not in SLOTS: sys.exit(__doc__)
    k, src = a[0], a[1]; opt = lambda n, d='': a[a.index(n) + 1] if n in a else d
    r, W, H = SHAPE(k); base = k.replace(':', '-')
    def crop(im):
        w, h = im.size
        if w / h > r: nw = int(h * r); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else: nh = int(w / r); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        return im.resize((W, H), Image.LANCZOS)
    entry = {}
    if os.path.splitext(src)[1].lower() in ('.mp4', '.mov', '.webm', '.m4v'):
        if not k.startswith('hero:'): sys.exit('video is for hero:D|E|F slots only')
        import subprocess, tempfile
        name = base + '.mp4'; out = os.path.join(AI, name)
        vf = f"crop='min(iw,ih*{r})':'min(ih,iw/{r})',scale=1280:-2"
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-t', '8', '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], check=True)
        if os.path.getsize(out) > 6 * 1024 * 1024: os.remove(out); sys.exit('video over 6 MB after encoding — use a shorter or calmer clip')
        tmp = os.path.join(tempfile.mkdtemp(), 'p.png'); subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '1', '-i', out, '-frames:v', '1', tmp], check=True)
        crop(Image.open(tmp).convert('RGB')).save(os.path.join(AI, base + '-poster.webp'), 'WEBP', quality=82, method=6)
        entry = {'file': name, 'kind': 'video', 'poster': base + '-poster.webp'}
    else:
        name = base + '.webp'; crop(Image.open(src).convert('RGB')).save(os.path.join(AI, name), 'WEBP', quality=84, method=6)
        entry = {'file': name, 'kind': 'image'}
    man[k] = {**entry, 'alt': opt('--alt'), 'tool': opt('--tool', 'AI')}
json.dump(dict(sorted(man.items())), open(MAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(json.dumps({'slots': len(man), 'kb': {k: os.path.getsize(os.path.join(AI, v['file'])) // 1024 for k, v in man.items()}}, ensure_ascii=False))
