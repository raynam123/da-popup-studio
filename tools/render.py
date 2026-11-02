#!/usr/bin/env python3
"""popup-studio · render the film from BOOK_DIR/dist/film.html (+ film/plan.json when present).

  python3 tools/render.py preview BOOK_DIR [--times 3.1,15,40,…]   6 stills + a 3×2 sheet → film/preview/
  python3 tools/render.py frames  BOOK_DIR [--from A --to B] [--max-minutes 100]
          → film/frames/f_00000.jpg …  resumable: valid frames already on disk are skipped, so just run it
            again after a stop. --max-minutes stops cleanly before a background-task time limit.
  python3 tools/render.py audio   BOOK_DIR                          the sound effects → film/sfx.wav
  python3 tools/render.py cover   BOOK_DIR [--times a,b,c]          clean 16:9 + 3:4 covers → film/cover/
  python3 tools/render.py status  BOOK_DIR                          how many frames are done

1920×1080, 30 fps, deterministic (seeded randomness, simulated clock), software GL.
On a 2-core box expect roughly 2–4 s per frame: a 2-minute film is about 3–4 hours of frames.
Without plan.json the story's own 30-second filmShots/filmActs/filmSegs are used (no voice).
"""
import argparse, base64, json, pathlib, sys, time
from playwright.sync_api import sync_playwright

FPS = 30
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-accelerated-2d-canvas"]


def total_of(book, plan):
    if plan: return json.loads(plan)['total']
    m = __import__('re').search(r'filmEnd:\s*([\d.]+)', (book / 'src/story.js').read_text())
    return (float(m.group(1)) if m else 27) + 3.5


def valid(p):
    try:
        if p.stat().st_size < 20000: return False
        with open(p, 'rb') as f: f.seek(-2, 2); return f.read() == b'\xff\xd9'
    except OSError: return False


def open_film(p, book, plan, w=1920, h=1080, clean=False, dist=1):
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={'width': w, 'height': h})
    logs = []; pg.on('pageerror', lambda e: logs.append(str(e)))
    if plan: pg.add_init_script('window.FILM_PLAN = ' + plan + ';')
    if dist != 1: pg.add_init_script(f'window.FILM_DIST = {dist};')
    pg.goto((book / 'dist/film.html').as_uri())
    pg.wait_for_function('window.__book && window.__book.spreads.length > 0 && window.__film', timeout=240000)
    if clean: pg.add_style_tag(content='.fsub,.ftitle,.bub{display:none!important}')   # covers: no subtitles, chapter cards or bubbles
    pg.wait_for_timeout(500)
    pg.evaluate('__book.pause(true); __film.start()')
    cdp = pg.context.new_cdp_session(pg)
    shot = lambda q=93: base64.b64decode(cdp.send('Page.captureScreenshot', {'format': 'jpeg', 'quality': q, 'optimizeForSpeed': True})['data'])
    return b, pg, shot, logs


def advance(pg, n):
    """step n frames without drawing them (cheap; same simulation as drawing)"""
    if n <= 0: return
    pg.evaluate(f'__film.skip(true); for (let i = 0; i < {n}; i += 300) __film.step(1/{FPS}, Math.min(300, {n} - i)); __film.skip(false)')


def stills(p, book, plan, times, out, name, w=1920, h=1080, clean=False, dist=1, cams=None):
    """cams: per still, a fixed camera [tx,ty,tz,az,pol,dist] instead of the film's (None = the film's)"""
    out.mkdir(parents=True, exist_ok=True)
    b, pg, shot, logs = open_film(p, book, plan, w, h, clean, dist); fr = 0; files = []
    for i, s in enumerate(times):
        n = round(s * FPS) - fr; advance(pg, n - 1)
        pg.evaluate(f'window.FILM_CAM = {json.dumps(cams[i]) if cams and cams[i] else "null"}; __film.step(1/{FPS})'); fr += max(n, 1)
        f = out / f'{name}_{i:02d}.jpg'; f.write_bytes(shot(95)); files.append(f); print(f'{s:6.2f}s → {f.name}', flush=True)
    if logs: print('page errors:', logs[-5:])
    b.close(); return files


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('mode'); ap.add_argument('book')
    ap.add_argument('--times'); ap.add_argument('--from', dest='a', type=int, default=0); ap.add_argument('--to', dest='z', type=int)
    ap.add_argument('--max-minutes', type=float, default=0)
    args = ap.parse_args()
    book = pathlib.Path(args.book).resolve(); film = book / 'film'; film.mkdir(exist_ok=True)
    plan = (film / 'plan.json').read_text() if (film / 'plan.json').exists() else None
    total = total_of(book, plan); N = int(round(total * FPS))
    P = json.loads(plan) if plan else None

    with sync_playwright() as p:
        if args.mode == 'preview':
            if args.times: times = [float(x) for x in args.times.split(',')]
            elif P:   # the cover, then each page when its mechanism has played; always six
                segs = [g['a'] + (g['b'] - g['a']) * .62 for g in P['segs']]
                if len(segs) > 5: segs = [segs[round(i * (len(segs) - 1) / 4)] for i in range(5)]
                times = [P['subs'][0]['b'] - .2 if P['subs'] else 1.2] + segs + ([P['endAt'] + 2] if len(segs) < 5 else [])
                while len(times) < 6: times.append((times[-1] + total) / 2)
            else: times = [1.2, total * .2, total * .36, total * .52, total * .7, total * .86]
            files = stills(p, book, plan, times, film / 'preview', 'pv')
            from PIL import Image
            ims = [Image.open(f) for f in files]; W, H = 640, 360
            sheet = Image.new('RGB', (W * 3, H * 2), 'black')
            for i, im in enumerate(ims[:6]): sheet.paste(im.resize((W, H)), ((i % 3) * W, (i // 3) * H))
            sheet.save(film / 'preview/pv_sheet.jpg', quality=90); print('sheet →', film / 'preview/pv_sheet.jpg')
        elif args.mode == 'cover':
            # closed book · last page at its climax · the title card over the open book
            end = P['endAt'] if P else total - 3.5
            times = [float(x) for x in args.times.split(',')] if args.times else [.5, (P['segs'][-1]['a'] + P['segs'][-1]['b']) / 2 if P else total * .8, end + 2.5]
            stills(p, book, plan, times, film / 'cover', 'cover_16x9', 1920, 1080, clean=True)
            # portrait (小红书 3:4): an open spread is too wide for it, so the closed book and the title card, framed head-on
            if not args.times:
                stills(p, book, plan, [times[0], times[2]], film / 'cover', 'cover_3x4', 1080, 1440, clean=True,
                       cams=[[.5, .02, .1, .12, .78, 3.3], [0, .16, .06, -.02, .84, 5.0]])
        elif args.mode == 'frames':
            fd = film / 'frames'; fd.mkdir(exist_ok=True)
            z = min(args.z or N, N); todo = [i for i in range(args.a, z) if not valid(fd / f'f_{i:05d}.jpg')]
            if not todo: print(f'all frames {args.a}–{z} done'); return
            print(f'{len(todo)} frames to render in {args.a}–{z} (of {N})', flush=True)
            b, pg, shot, logs = open_film(p, book, plan)
            advance(pg, todo[0]); cur = todo[0]; T0 = time.time(); done = 0
            for i in todo:
                advance(pg, i - cur); pg.evaluate(f'__film.step(1/{FPS})'); cur = i + 1
                (fd / f'f_{i:05d}.jpg').write_bytes(shot()); done += 1
                if done % 60 == 0:
                    el = time.time() - T0; print(f'frame {i}  {done}/{len(todo)}  {el / done:.2f}s/frame  eta {(len(todo) - done) * el / done / 60:.0f} min', flush=True)
                if args.max_minutes and time.time() - T0 > args.max_minutes * 60:
                    print(f'stopped at frame {i} after {args.max_minutes} min — run again to continue', flush=True); break
            if logs: print('page errors:', logs[-5:])
            b.close()
            left = sum(1 for i in range(N) if not valid(fd / f'f_{i:05d}.jpg')); print(f'{N - left}/{N} frames done' + ('' if left else ' — ready for tools/mix.py'))
        elif args.mode == 'audio':
            b, pg, shot, logs = open_film(p, book, plan)
            advance(pg, N)
            wav = pg.evaluate(f'__film.audio({total})'); (film / 'sfx.wav').write_bytes(base64.b64decode(wav))
            print('sound effects →', film / 'sfx.wav'); b.close()
        elif args.mode == 'status':
            fd = film / 'frames'; ok = [i for i in range(N) if valid(fd / f'f_{i:05d}.jpg')]
            okset = set(ok); miss = [i for i in range(N) if i not in okset]
            print(f'{len(ok)}/{N} frames ({total:.1f}s)' + (f'; first missing {miss[0]}' if miss else ' — complete'))
        else: sys.exit('mode: preview | frames | audio | cover | status')


if __name__ == '__main__':
    main()
