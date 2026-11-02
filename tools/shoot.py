#!/usr/bin/env python3
"""popup-studio · QA screenshots of the interactive book (not the film).

  python3 tools/shoot.py BOOK_DIR [--size 1280x800] [--phone]

For the cover and every spread: state a (just opened) and state b (pull-tab pulled, dial spun,
2 s of animation), plus a contact sheet → BOOK_DIR/shots/. --phone adds 390×844 portrait shots.
Look at every one before showing the user: cut-out halos, pieces floating off the page,
characters hidden behind scenery, text overflowing a bubble, wrong layer order.
"""
import argparse, base64, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-accelerated-2d-canvas"]


def shoot(p, book, w, h, tag, out):
    b = p.chromium.launch(args=ARGS); pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1 if w > 600 else 2)
    logs = []; pg.on('pageerror', lambda e: logs.append(str(e)))
    pg.goto((book / 'dist/dev.html').as_uri()); pg.wait_for_function('window.__book && __book.spreads.length > 0', timeout=240000)
    pg.wait_for_timeout(600); n = pg.evaluate('__book.spreads.length'); pg.evaluate('__book.pause(true)')
    cdp = pg.context.new_cdp_session(pg); files = []
    def snap(name):
        (out / name).write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot', {'format': 'png'})['data'])); files.append(out / name)
    for s in range(n + 1):
        pg.evaluate(f'__book.open({s}); __film.skip(true); for (let i = 0; i < 40; i++) __book.tick(1/30); __film.skip(false); __book.tick(1/30)')
        snap(f'{tag}_s{s}a.png')
        if s == 0: continue
        pg.evaluate(f'''(() => {{ const sp = __book.spreads[{s - 1}]; sp.demoPull = {{ from: sp.pT, to: 1, t: 0, dur: .6 }}; if (sp.dial) sp.spin = -14;
                     __film.skip(true); for (let i = 0; i < 60; i++) __book.tick(1/30); __film.skip(false); __book.tick(1/30); }})()''')
        snap(f'{tag}_s{s}b.png')
    if logs: print('page errors:', logs[-5:])
    b.close(); return files


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('book'); ap.add_argument('--size', default='1280x800'); ap.add_argument('--phone', action='store_true')
    args = ap.parse_args(); book = pathlib.Path(args.book).resolve(); out = book / 'shots'; out.mkdir(exist_ok=True)
    w, h = map(int, args.size.split('x'))
    with sync_playwright() as p:
        files = shoot(p, book, w, h, f'{w}x{h}', out)
        if args.phone: shoot(p, book, 390, 844, 'phone', out)
    T = 480; ims = [Image.open(f).convert('RGB') for f in files]; th = round(T * h / w)
    sheet = Image.new('RGB', (T * 2, th * (1 + len(ims) // 2)), 'black')
    for i, im in enumerate(ims):
        j = i + 1 if i else 0   # cover alone on the first row, then an a|b pair per spread
        sheet.paste(im.resize((T, th)), ((j % 2) * T, (j // 2) * th))
    sheet.save(out / '_sheet.jpg', quality=88); print(f'{len(files)} shots → {out}  (sheet: _sheet.jpg)')


if __name__ == '__main__':
    main()
