#!/usr/bin/env python3
"""popup-studio · build a carousel (旋转木马) book: engine-carousel/shell.html + BOOK_DIR/src/story.js.

  python3 tools/build_carousel.py BOOK_DIR [--voice voice_out.zip|folder]

Reads   src/story.js (ROOMS, BOOK …; see styles/video/carousel-book.md), src/images.js (prep_assets.py),
        dub/dub.json + film/cues.json "en" (bilingual lines). --voice embeds the dubbed clips (mp3, ~1 MB)
        into src/vo.js so tapping a character plays its line; without it the old vo.js is kept, or the
        lines are text-only bubbles.
Writes  dist/carousel.html   publishable web page (three.js from CDN)
        dist/<书名>_旋转木马.html  standalone (three.js inline)
        dist/film.html       film page for render.py (three inline, ZCOOL faces inline, seeded randomness, FILM_MODE)
"""
import argparse, base64, glob, json, os, pathlib, re, subprocess, tempfile, zipfile, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from build import deps, NM

PKG = pathlib.Path(__file__).resolve().parent.parent
ENG = PKG / 'engine-carousel'
CDN = '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>'
GF = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap">'


def voice_dir(v):
    if v.endswith('.zip'):
        tmp = tempfile.mkdtemp(prefix='popup_voice_'); zipfile.ZipFile(v).extractall(tmp); v = tmp
    hit = glob.glob(os.path.join(v, '**', 'S0-01_*.wav'), recursive=True) or glob.glob(os.path.join(v, '**', 'S*-*_*.wav'), recursive=True)
    return os.path.dirname(hit[0]) if hit else v


def make_vo(book, voice):
    D = json.load(open(book / 'dub/dub.json', encoding='utf-8'))
    cues = book / 'film/cues.json'; EN = json.load(open(cues, encoding='utf-8')).get('en', {}) if cues.exists() else {}
    VO, VOL = {}, []
    vd = voice_dir(voice) if voice else None
    for l in D['script']:
        VOL.append({'id': l['id'], 'role': l['role'], 's': int(re.match(r'S(\d+)', l['id']).group(1)), 'zh': l['text'], 'en': EN.get(l['id'], '')})
        f = sorted(glob.glob(os.path.join(vd, f"{l['id']}_*.wav")) + glob.glob(os.path.join(vd, f"{l['id']}_*.mp3"))) if vd else []
        if not f: continue
        out = tempfile.mktemp(suffix='.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f[0], '-af',
                        'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.08',
                        '-ac', '1', '-ar', '24000', '-b:a', '48k', out], check=True)
        VO[l['id']] = base64.b64encode(open(out, 'rb').read()).decode(); os.remove(out)
    js = 'const VO = ' + json.dumps(VO) + ';\nconst VOL = ' + json.dumps(VOL, ensure_ascii=False) + ';\n'
    (book / 'src/vo.js').write_text(js, encoding='utf-8')
    print(f'voices: {len(VO)}/{len(VOL)} clips embedded ({len(js) // 1024} KB)')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('book'); ap.add_argument('--voice'); args = ap.parse_args()
    book = pathlib.Path(args.book).resolve(); src = book / 'src'
    story = (src / 'story.js').read_text(encoding='utf-8'); images = (src / 'images.js').read_text(encoding='utf-8')
    if args.voice or not (src / 'vo.js').exists(): make_vo(book, args.voice)
    vo = (src / 'vo.js').read_text(encoding='utf-8')
    get = (lambda k, d: (m.group(1) if (m := re.search(k + r":\s*'([^']*)'", story)) else d))
    title = get('title', '立体书')
    n = len(re.findall(r"\{\s*title:\s*'[^']*',", story.split('const ROOMS')[1])) if 'const ROOMS' in story else 5
    CN = '零一二三四五六七八九十'
    page = ((ENG / 'shell.html').read_text(encoding='utf-8')
            .replace('{{TITLE}}', title).replace('{{AUTHOR}}', get('author', '旋转木马立体书')).replace('{{SUB}}', get('sub', '一本转一圈的纸艺立体书'))
            .replace('{{INTRO}}', get('intro', title).replace('\\n', '<br>')).replace('{{TAGLINE}}', get('tagline', f'{CN[n] if n <= 10 else n}个小剧场，绕着书脊转一圈'))
            .replace('/*@DATA@*/', images.strip() + '\n' + vo.strip()).replace('/*@STORY@*/', story))
    dist = book / 'dist'; dist.mkdir(exist_ok=True)
    (dist / 'carousel.html').write_text(page, encoding='utf-8')
    three = deps()
    (dist / f'{title}_旋转木马.html').write_text(page.replace(CDN, '<script>' + three + '</script>'), encoding='utf-8')
    # film page: inline three + the ZCOOL XiaoWei chunks the text uses, seed Math.random, FILM_MODE
    FD = NM / '@fontsource/zcool-xiaowei'; chars = set(page); faces = []
    for blk in re.findall(r'@font-face \{.*?\}', (FD / '400.css').read_text(), re.S):
        rng = re.search(r'unicode-range: ([^;]+);', blk).group(1)
        if not any(int(a, 16) <= ord(c) <= int(b or a, 16) for part in rng.split(',') for a, _, b in [part.strip()[2:].partition('-')] for c in chars): continue
        f = re.search(r'url\(\./files/([^)]+\.woff2)\)', blk).group(1)
        faces.append("@font-face{font-family:'ZCOOL XiaoWei';font-weight:400;src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}" % (base64.b64encode((FD / 'files' / f).read_bytes()).decode(), rng))
    seed = ("<script>window.FILM_MODE=true;(()=>{let a=20261031;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;"
            "let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();</script>\n")
    film = seed + page.replace(GF, '').replace(CDN, '<script>' + three + '</script>').replace('<style>', '<style>' + ''.join(faces) + '\n', 1)
    (dist / 'film.html').write_text(film, encoding='utf-8')
    print(f'built 《{title}》 carousel: carousel.html {len(page) // 1024} KB, film.html {len(film) // 1024} KB, {n} rooms')


if __name__ == '__main__':
    main()
