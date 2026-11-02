#!/usr/bin/env python3
"""popup-studio · clean and pack the generated element images.

  python3 tools/prep_assets.py SRC BOOK_DIR [--map BOOK_DIR/assets_map.json]

SRC       a .zip or a folder of transparent PNGs named like S1_小屋.png
map json  {"S1_小屋": ["cottage", 1500], ...}  file stem -> [engine key, longest side in px]
          (keys are what story.js uses: IM.cottage, piece(ly, 'cottage', ...))
Does:     removes the faint semi-transparent halo image generators leave, drops stray specks,
          crops tight, resizes, encodes WebP, writes BOOK_DIR/src/images.js (IMG_SRC + IMG_META),
          BOOK_DIR/assets/<key>.png (cleaned) and BOOK_DIR/assets/_sheet.png (contact sheet).
Reports   files missing from the pack and files in the pack that the map does not use.
"""
import argparse, base64, io, json, pathlib, sys, tempfile, zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def load_src(src):
    src = pathlib.Path(src)
    if src.suffix.lower() == '.zip':
        tmp = pathlib.Path(tempfile.mkdtemp(prefix='popup_assets_'))
        with zipfile.ZipFile(src) as z: z.extractall(tmp)
        src = tmp
    return {p.stem: p for p in src.rglob('*.png') if not p.name.startswith('._')}


def clean(path, cap):
    im = Image.open(path).convert('RGBA'); a = np.array(im).astype(np.float32)
    al = np.clip((a[..., 3] - 60) / 140, 0, 1) * 255          # faint haze out, soft edges kept
    lab, n = ndimage.label(al > 0)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(al), lab, range(1, n + 1))
        al = al * np.isin(lab, 1 + np.where(sizes >= max(120, sizes.max() * .0015))[0])
    a[..., 3] = al
    im = Image.fromarray(a.astype(np.uint8), 'RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    pad = 4; im = im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)))
    s = min(1, cap / max(im.size))
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS) if s < 1 else im


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('book'); ap.add_argument('--map')
    args = ap.parse_args()
    book = pathlib.Path(args.book); (book / 'assets').mkdir(parents=True, exist_ok=True); (book / 'src').mkdir(exist_ok=True)
    mp = json.load(open(args.map or book / 'assets_map.json', encoding='utf-8'))
    files = load_src(args.src)
    missing = [k for k in mp if k not in files]
    unused = [k for k in files if k not in mp]
    out_src, meta, total, thumbs = {}, {}, 0, []
    for stem, (key, cap) in mp.items():
        if stem not in files: continue
        im = clean(files[stem], cap); im.save(book / 'assets' / f'{key}.png')
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=84, method=4, alpha_quality=90)
        out_src[key] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
        meta[key] = {'w': im.width, 'h': im.height}; total += buf.tell(); thumbs.append((stem, key, im))
        print(f'{stem:22s} -> {key:12s} {im.size} {buf.tell() // 1024} KB')
    (book / 'src/images.js').write_text('const IMG_SRC = ' + json.dumps(out_src) + ';\nconst IMG_META = ' + json.dumps(meta) + ';\n')
    T, cols = 200, 8; rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * T, max(1, rows) * (T + 18)), (30, 30, 50)); d = ImageDraw.Draw(sheet)
    for i, (stem, key, im) in enumerate(thumbs):
        t = im.copy(); t.thumbnail((T - 8, T - 8)); bg = Image.new('RGBA', t.size, (30, 30, 50, 255)); bg.alpha_composite(t)
        x, y = (i % cols) * T, (i // cols) * (T + 18); sheet.paste(bg, (x + (T - t.width) // 2, y + (T - t.height) // 2)); d.text((x + 4, y + T + 3), key, fill=(255, 255, 255))
    sheet.save(book / 'assets/_sheet.png')
    print(f'\n{len(out_src)} images, {total // 1024} KB webp (keep the total under ~10 MB so the page stays under 16 MB)')
    if missing: print('MISSING from the pack:', ', '.join(missing))
    if unused: print('in the pack but not in the map (ignored):', ', '.join(unused))


if __name__ == '__main__':
    main()
