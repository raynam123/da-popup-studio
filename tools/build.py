#!/usr/bin/env python3
"""popup-studio · build a pop-up book from engine + one story file.

  python3 tools/build.py BOOK_DIR

BOOK_DIR must hold src/story.js and src/images.js (made by tools/prep_assets.py).
Writes BOOK_DIR/dist/:
  book.html     publishable web page (three.js from CDN, post-processing + fonts inline)
  <title>.html  standalone offline file (everything inline, double-click to open)
  dev.html      local test page (three.min.js beside it, system fonts)
  film.html     film-render page (local three, inline fonts, seeded randomness, FILM_MODE)
Dependencies (three@0.128.0, @fontsource/zcool-xiaowei) are installed once into ~/.popup-studio via npm.
"""
import base64, pathlib, re, shutil, subprocess, sys

PKG = pathlib.Path(__file__).resolve().parent.parent
ENG = PKG / 'engine'
CACHE = pathlib.Path.home() / '.popup-studio'
NM = CACHE / 'node_modules'


def deps():
    if not (NM / 'three/build/three.min.js').exists() or not (NM / '@fontsource/zcool-xiaowei/400.css').exists():
        CACHE.mkdir(exist_ok=True)
        subprocess.run(['npm', 'i', '--prefix', str(CACHE), 'three@0.128.0', '@fontsource/zcool-xiaowei@5'], check=True)
    return (NM / 'three/build/three.min.js').read_text()


def main(book):
    book = pathlib.Path(book).resolve()
    story = (book / 'src/story.js').read_text()
    images = (book / 'src/images.js').read_text()
    m = re.search(r"title:\s*'([^']+)'", story); title = m.group(1) if m else '立体书'
    m = re.search(r"sub:\s*'([^']+)'", story); sub = m.group(1) if m else '一本会站起来的纸艺立体书'
    three = deps()
    n = len(re.findall(r"\{\s*title:\s*'[^']*',\s*tab:", story)) or 5
    CN = '零一二三四五六七八九十'
    shell = (ENG / 'shell.html').read_text().replace('{{TITLE}}', title).replace('{{SUB}}', sub).replace('{{SPREADS}}', CN[n] if n <= 10 else str(n))
    engine = (ENG / 'engine.js').read_text().replace('/*@STORY@*/', story)
    js = '\n' + (ENG / 'core.js').read_text() + '\n' + images + '\n' + engine
    CDN = '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>\n'
    POST = '<script>\n' + (ENG / 'post.js').read_text() + '\n</script>\n'
    page = shell.replace('{{SCRIPTS}}', CDN + POST + '<script>\n' + js + '\n</script>')
    # ZCOOL XiaoWei draws 回 as a solid block; a patched one-glyph face overrides it
    fix = (ENG / 'fix_hui.woff2.b64').read_text().strip()
    page = page.replace('<style>', "<style>\n@font-face{font-family:'ZCOOL XiaoWei';font-weight:400;src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:U+56DE}" % fix, 1)
    dist = book / 'dist'; dist.mkdir(exist_ok=True)
    (dist / 'book.html').write_text(page)

    def doc(p):
        j = p.index('</style>') + 8
        return ('<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
                + p[:j] + '\n</head>\n<body>\n' + p[j:] + '\n</body>\n</html>\n')
    alone = page.replace(CDN, '<script>\n' + three + '\n</script>\n')
    (dist / f'{title}.html').write_text(doc(alone))
    shutil.copy(NM / 'three/build/three.min.js', dist / 'three.min.js')
    dev = re.sub(r'<link rel="stylesheet" href="https://fonts[^>]+>', '', doc(page)).replace(CDN, '<script src="three.min.js"></script>\n')
    (dist / 'dev.html').write_text(dev)

    # film page: inline the font chunks the text needs, seed Math.random so every render is identical
    FD = NM / '@fontsource/zcool-xiaowei'
    chars = set(page); faces = []
    for blk in re.findall(r'@font-face \{.*?\}', (FD / '400.css').read_text(), re.S):
        rng = re.search(r'unicode-range: ([^;]+);', blk).group(1)
        hit = False
        for part in rng.split(','):
            a, _, b = part.strip()[2:].partition('-'); a = int(a, 16); b = int(b, 16) if b else a
            if any(a <= ord(c) <= b for c in chars): hit = True; break
        if not hit: continue
        f = re.search(r'url\(\./files/([^)]+\.woff2)\)', blk).group(1)
        faces.append("@font-face{font-family:'ZCOOL XiaoWei';font-weight:400;src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}"
                     % (base64.b64encode((FD / 'files' / f).read_bytes()).decode(), rng))
    seed = ("<script>window.FILM_MODE=true;(()=>{let a=20261029;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;"
            "let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();</script>\n")
    film = dev.replace('<style>', '<style>' + ''.join(faces) + '\n', 1).replace('<script src="three.min.js"></script>', seed + '<script src="three.min.js"></script>')
    (dist / 'film.html').write_text(film)
    print(f'built 《{title}》: book.html {len(page) // 1024} KB, standalone {len(alone) // 1024} KB, film {len(film) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
