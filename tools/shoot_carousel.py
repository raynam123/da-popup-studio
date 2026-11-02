#!/usr/bin/env python3
"""popup-studio · QA stills of a carousel book (dist/carousel.html).

  python3 tools/shoot_carousel.py BOOK_DIR [--rooms 0,2,5 | all]

→ BOOK_DIR/shots/: the closed cover, the whole carousel from above (every room at its equal angle),
a turn in progress (one room closing, the next opening), then each room opened to 120° after its act,
plus _sheet.jpg. Look at every one: wall panoramas filling the walls, pieces off the floor or cut by a
wall, bubbles overflowing, a glow away from its lamp.
"""
import argparse, base64, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-accelerated-2d-canvas"]
THREE = pathlib.Path.home() / '.popup-studio/node_modules/three/build/three.min.js'


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('book'); ap.add_argument('--rooms', default='all'); args = ap.parse_args()
    book = pathlib.Path(args.book).resolve(); out = book / 'shots'; out.mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); pg = b.new_page(viewport={'width': 1600, 'height': 900})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        three = THREE.read_bytes()
        pg.route('**/three.min.js', lambda r: r.fulfill(body=three, content_type='application/javascript'))
        pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        pg.goto((book / 'dist/carousel.html').as_uri()); pg.wait_for_function('window.__book && __book.rooms.length > 0', timeout=300000)
        pg.wait_for_timeout(1200); pg.evaluate('__book.pause(true)')
        n = pg.evaluate('__book.rooms.length')
        rooms = list(range(n)) if args.rooms == 'all' else [int(x) for x in args.rooms.split(',')]
        cdp = pg.context.new_cdp_session(pg); files = []
        def snap(name):
            f = out / name; f.write_bytes(base64.b64decode(cdp.send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 88})['data'])); files.append(f)
        def tick(sec):   # simulate without drawing, then draw one frame
            pg.evaluate(f'__film.skip(true); for (let i = 0; i < {int(sec * 30)}; i++) __book.tick(1/30); __film.skip(false); __book.tick(1/600)')
        tick(1.5); snap('00_cover.jpg')
        pg.evaluate('__book.settle(0); __book.focus(-1, true)'); tick(1.2)
        pg.evaluate('Object.assign(__book.cam, {tx: 0, ty: .3, tz: .05, az: .5, el: .5, dist: 3.9, zoom: 1}); __book.ST.rot += .9; __book.tick(1/600)')
        snap('01_overview.jpg')
        pg.evaluate('__book.settle(0)'); tick(.5); pg.evaluate('__book.goTo(1)'); tick(.55); snap('02_turning.jpg')
        for k in rooms:
            pg.evaluate(f'__book.settle({k})'); tick(1.0); pg.evaluate(f'__book.act({k})')
            tick(pg.evaluate(f'__book.rooms[{k}].def.dur') + .3); snap(f'{k + 3:02d}_room{k + 1}.jpg')
        b.close()
    if errs: print('page errors:', errs[:5])
    ims = [Image.open(f) for f in files]; w = 800; rows = (len(ims) + 1) // 2
    sheet = Image.new('RGB', (w * 2, rows * 450), (20, 14, 10))
    for i, im in enumerate(ims): sheet.paste(im.resize((w, 450)), ((i % 2) * w, (i // 2) * 450))
    sheet.save(out / '_sheet.jpg', quality=85); print(f'{len(files)} shots → {out}  (sheet: _sheet.jpg)')


if __name__ == '__main__':
    main()
