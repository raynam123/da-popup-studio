#!/usr/bin/env python3
"""popup-studio · voiced timeline for a carousel (旋转木马) film.

  python3 tools/plan_carousel.py BOOK_DIR VOICE

VOICE     the dub output folder or its .zip (S1-02_角色.wav …); missing clips are timed from their text, silent.
cues.json  "en": {"S1-02": "…"}      English line under every bubble / subtitle (optional)
           "carousel": {"cue": {"1": ["S1-03", 0.3], …}}   room n's mechanism (act) fires this long after that line starts
                       "push": {"1": "LR", …}             push-in order per room: L = left group first (default alternates)
Room act lengths come from the story's ROOMS[k].dur. Narrator lines become subtitles; other roles are bubbles
over the piece the story's speaker(k, role, r) returns.
Writes film/plan.json (render.py injects it as FILM_PLAN), film/voice_track.wav, film/timeline.txt.
Timeline: cover line → book opens (2.7 s) → per room: lines, act on its cue, two push-ins, turn (2 s, the next
room widens to 120°) → finale: every room back to equal, the carousel spins, title card.
"""
import argparse, glob, json, os, pathlib, re, sys, tempfile, wave, zipfile
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from plan import load, estimate, SR

VIEW = [0, .4, .3, 0, .24, 2.9]
L = lambda v, **k: [v[0] + k.get('x', 0), v[1] + k.get('y', 0), v[2] + k.get('z', 0), v[3] + k.get('az', 0), v[4] + k.get('el', 0), v[5] + k.get('d', 0)]
CL = L(VIEW, x=-.2, y=-.08, z=.16, az=.14, el=-.06, d=-.7)
CR = L(VIEW, x=.2, y=-.08, z=.16, az=-.12, el=-.06, d=-.7)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('book'); ap.add_argument('voice'); args = ap.parse_args()
    book = pathlib.Path(args.book).resolve(); film = book / 'film'; film.mkdir(exist_ok=True)
    vd = args.voice
    if vd.endswith('.zip'):
        tmp = tempfile.mkdtemp(prefix='popup_voice_'); zipfile.ZipFile(vd).extractall(tmp); vd = tmp
    hit = glob.glob(os.path.join(vd, '**', 'S*-*_*.wav'), recursive=True) + glob.glob(os.path.join(vd, '**', 'S*-*_*.mp3'), recursive=True)
    if hit: vd = os.path.dirname(hit[0])
    D = json.load(open(book / 'dub/dub.json', encoding='utf-8'))
    C = json.load(open(film / 'cues.json', encoding='utf-8')) if (film / 'cues.json').exists() else {}
    EN, CC = C.get('en', {}), C.get('carousel', {})
    story = (book / 'src/story.js').read_text(encoding='utf-8')
    durs = [float(x) for x in re.findall(r"\{\s*title:\s*'[^']*',[^\n]*?dur:\s*([\d.]+)", story.split('const ROOMS')[1])]
    N = len(durs); cue = {int(k) - 1: v for k, v in CC.get('cue', {}).items()}
    push = {int(k) - 1: v for k, v in CC.get('push', {}).items()}

    lines, est = [], []
    for l in D['script']:
        f = sorted(glob.glob(os.path.join(vd, f"{l['id']}_*.wav")) + glob.glob(os.path.join(vd, f"{l['id']}_*.mp3")))
        if f: a = load(f[0])
        else: a = np.zeros(int(estimate(l['text'], l.get('rate', 1.0)) * SR), np.float32); est.append(l['id'])
        lines.append(dict(l, audio=a, dur=len(a) / SR, page=int(re.match(r'S(\d+)', l['id']).group(1))))

    acts, subs, shots, rows, segs, track = [], [], [], [], [], []
    def put(l, t):
        track.append((t, l['audio'])); text = l['text'] + ('\n' + EN[l['id']] if EN.get(l['id']) else '')
        if l['role'] == C.get('narrator', '旁白'): subs.append({'a': round(t, 3), 'b': round(t + l['dur'], 3), 'text': text})
        else: acts.append({'t': round(t, 3), 'do': 'say', 'k': l['page'] - 1, 'role': l['role'], 'text': text, 'life': round(l['dur'] + .4, 2)})
        rows.append(f"{t:7.2f}  {l['dur']:5.2f}s  {l['id']:6s} {l['role']:4s} {l['text']}" + ('   (估算, 无音频)' if l['id'] in est else ''))

    shots += [[0, .44, .55, .2, .34, .12, 2.3], [3.0, .44, .54, .2, .2, .15, 2.42]]
    t = .6
    for l in [x for x in lines if x['page'] == 0]: put(l, t); t += l['dur']
    t += .3; acts += [{'t': round(t - .1, 3), 'do': 'press', 'id': 'act'}, {'t': round(t, 3), 'do': 'open'}]
    shots += [[t + 1.4, .1, .45, .2, .1, .3, 3.3], [t + 2.9, *VIEW]]
    t += 3.6
    for k in range(N):
        page = [x for x in lines if x['page'] == k + 1]
        T0 = t; t += .4; tact = None
        cid, coff = cue.get(k, [page[len(page) // 2]['id'] if page else None, .2])
        for i, l in enumerate(page):
            if i: t += page[i - 1].get('gap', .35 if l['role'] == page[i - 1]['role'] else .55)
            put(l, t)
            if l['id'] == cid: tact = t + coff; acts += [{'t': round(tact - .1, 3), 'do': 'press', 'id': 'act'}, {'t': round(tact, 3), 'do': 'act', 'k': k}]
            t += l['dur']
        if tact is None: tact = T0 + 1.0; acts += [{'t': round(tact, 3), 'do': 'act', 'k': k}]
        t = max(t, tact + durs[k] + .3) + 1.1
        d = t - T0; order = push.get(k, 'LR' if k % 2 == 0 else 'RL')
        P = lambda c: CL if c == 'L' else CR
        shots += [[T0 + .3, *VIEW], [T0 + d * .38, *P(order[0])], [T0 + d * .55, *VIEW[:5], VIEW[5] - .25], [T0 + d * .78, *P(order[1])], [t - .15, *VIEW]]
        segs.append({'s': k + 1, 'a': round(T0, 3), 'b': round(t, 3)})
        if k < N - 1:
            acts += [{'t': round(t - .05, 3), 'do': 'press', 'id': 'next'}, {'t': round(t, 3), 'do': 'goto', 'k': k + 1}]
            shots += [[t + .75, *L(VIEW, d=.25, el=.03)]]; t += 2.0
    acts.append({'t': round(t, 3), 'do': 'spin', 'v': .3})
    shots += [[t + 2.2, 0, .36, .05, .28, .42, 3.5], [t + 8.5, 0, .36, .05, -.12, .48, 3.8]]
    end_at = t + 3.0; total = end_at + 4.0
    shots.sort(key=lambda s: s[0])
    plan = {'shots': shots, 'acts': sorted(acts, key=lambda a: a['t']), 'subs': subs, 'segs': segs, 'endAt': round(end_at, 3), 'total': round(total, 3)}
    json.dump(plan, open(film / 'plan.json', 'w', encoding='utf-8'), ensure_ascii=False)
    buf = np.zeros(int((total + 1) * SR), np.float32)
    for t0, a in track: i = int(t0 * SR); buf[i:i + len(a)] += a
    with wave.open(str(film / 'voice_track.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(buf, -1, 1) * 32767).astype(np.int16).tobytes())
    (film / 'timeline.txt').write_text('\n'.join(rows) + f'\n\n片尾 {end_at:.2f}s · 总长 {total:.2f}s', encoding='utf-8')
    print(f'{len(lines)} lines over {N} rooms · total {total:.1f}s ({int(total * 30)} frames) · end card {end_at:.1f}s · {len(acts)} acts, {len(subs)} subtitles'
          + (f' · {len(est)} estimated (no audio)' if est else ''))


if __name__ == '__main__':
    main()
