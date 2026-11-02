#!/usr/bin/env python3
"""popup-studio · turn the voice clips into a film plan (timeline, camera, subtitles, actions) + one voice track.

  python3 tools/plan.py BOOK_DIR VOICE  [--cues BOOK_DIR/film/cues.json]

VOICE     the dub script's output folder or a .zip of it: S1-02_小星.wav … + manifest.json.
          Without audio (only script.json from `dub.py --dry`, or clips missing) the line
          length is estimated from its text and left silent, so a plan can be tried before dubbing.
cues.json written per book (see templates/cues_template.json):
  narrator    role whose lines become subtitles (default 旁白); other roles become speech bubbles
              over the piece the story's speaker(s, role, sp) returns (a subtitle if it returns null)
  titles      {"1": "出发", ...} chapter cards; default: the spread titles found in story.js
  cues        {"S1-02": [0.2, {"do": "pull", "s": 1, "dur": 1.4}], ...}  an action some seconds after a
              line starts; a list of such pairs for several. Actions: pull {s,dur,to} · spin {s,v} ·
              poke {s,key} · call {s,fn} (story FILM_HOOKS) · turn
  scene_acts  {"3": [[0.6, {"do": "spin", "s": 3, "v": -9}]]}  actions timed from that page's turn
  hold        {"4": 1.5}  extra seconds at the end of a page (to let a mechanism finish)
  en          {"S1-02": "English line", ...} optional: bilingual subtitles/bubbles (Chinese + a smaller English line)
  focus       {"1": [[tx,ty,tz,az,pol,dist], [..]]} two close camera keys per page (A at 38 %, B at 78 %)
  wide, cover camera keys for the whole-spread view and the cover
Writes BOOK_DIR/film/plan.json, voice_track.wav (24 kHz mono, sample-accurate) and timeline.txt.
"""
import argparse, glob, json, os, pathlib, re, subprocess, tempfile, wave, zipfile
import numpy as np

SR = 24000
WIDE = [0, .22, .05, 0, .95, 2.32]
COVER = [.52, .02, .1, .55, 1.06, 2.2]
FOCUS = ([.12, .25, .03, -.22, 1.03, 1.95], [.02, .26, .04, .2, 1.02, 1.85])
CHARS_PER_SEC = 4.3


def load(path):
    if not path.endswith('.wav'):                                       # mp3 etc: decode with ffmpeg first
        tmp = tempfile.mktemp(suffix='.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', str(SR), tmp], check=True); path = tmp
    with wave.open(path, 'rb') as w: rate, width, ch = w.getframerate(), w.getsampwidth(), w.getnchannels()
    d = open(path, 'rb').read(); i = d.find(b'data')                    # streaming header length is a placeholder: read to EOF
    raw = d[i + 8:]; raw = raw[:len(raw) // (width * ch) * (width * ch)]
    a = np.frombuffer(raw, dtype=np.int16 if width == 2 else np.int32).astype(np.float32) / (32768 if width == 2 else 2 ** 31)
    if ch > 1: a = a.reshape(-1, ch).mean(1)
    if rate != SR: a = np.interp(np.arange(0, len(a) * SR / rate) * rate / SR, np.arange(len(a)), a).astype(np.float32)
    idx = np.where(np.abs(a) > .02)[0]                                  # trim the clip's own silence
    return a[max(0, idx[0] - int(.06 * SR)): idx[-1] + int(.12 * SR)] if len(idx) else a


def estimate(text, rate=1.0):
    n = sum(1 for c in text if c.isalnum()); p = sum(1 for c in text if c in '，。！？、…；')
    return n / CHARS_PER_SEC / rate + p * .12


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('book'); ap.add_argument('voice'); ap.add_argument('--cues')
    args = ap.parse_args()
    book = pathlib.Path(args.book).resolve(); out = book / 'film'; out.mkdir(exist_ok=True)
    vd = args.voice
    if vd.endswith('.zip'):
        tmp = tempfile.mkdtemp(prefix='popup_voice_'); zipfile.ZipFile(vd).extractall(tmp); vd = tmp
        hit = glob.glob(os.path.join(vd, '**', 'manifest.json'), recursive=True) or glob.glob(os.path.join(vd, '**', 'script.json'), recursive=True)
        if hit: vd = os.path.dirname(hit[0])
    cues_path = pathlib.Path(args.cues) if args.cues else out / 'cues.json'
    C = json.load(open(cues_path, encoding='utf-8')) if cues_path.exists() else {}
    man = os.path.join(vd, 'manifest.json'); scr = os.path.join(vd, 'script.json')
    lines = json.load(open(man if os.path.exists(man) else scr, encoding='utf-8'))['lines']
    narrator = C.get('narrator', '旁白'); wide = C.get('wide', WIDE)
    story = (book / 'src/story.js').read_text()
    titles = {str(i + 1): t for i, t in enumerate(re.findall(r"\{\s*title:\s*'([^']*)',\s*tab:", story))}
    titles.update(C.get('titles', {}))

    clips, est = [], []
    for l in lines:
        f = sorted(glob.glob(os.path.join(vd, f"{l['id']}_*.wav")) + glob.glob(os.path.join(vd, f"{l['id']}_*.mp3")))
        if f: a = load(f[0])
        else: a = np.zeros(int(estimate(l['text'], l.get('rate', 1.0)) * SR), np.float32); est.append(l['id'])
        clips.append(dict(l, sc=int(re.match(r'S(\d+)', l['id']).group(1)), audio=a))
    scenes = sorted({c['sc'] for c in clips}); last = max(scenes)

    def cue_list(v): return v if v and isinstance(v[0], list) else [v]
    acts, subs, segs, rows = [], [], [], []
    shots = [[0] + C.get('cover', COVER)]
    t = .6
    if 0 not in scenes: t += 1.0; shots.append([round(t, 3), .48, .04, .06, .3, .98, 2.0])
    for sc in ([0] if 0 in scenes else []) + [s for s in range(1, last + 1)]:
        scl = [c for c in clips if c['sc'] == sc]
        if sc > 0:
            T0 = t; acts.append({'t': round(t, 3), 'do': 'turn'}); shots.append([round(t + .9, 3)] + wide)
            for off, a in C.get('scene_acts', {}).get(str(sc), []): acts.append(dict(a, t=round(T0 + off, 3)))
            t += 1.5                                                    # page turns and pops up before anyone speaks
        prev = None
        for c in scl:
            if prev is not None: t += prev.get('gap', .35 if c['role'] == prev['role'] else .55)
            d = len(c['audio']) / SR; c['start'] = t
            txt = c['text'] + ('\n' + C['en'][c['id']] if c['id'] in C.get('en', {}) else '')   # bilingual: second line in English
            if c['role'] == narrator: subs.append({'a': round(t, 3), 'b': round(t + d, 3), 'text': txt})
            else: acts.append({'t': round(t, 3), 'do': 'say', 's': sc, 'role': c['role'], 'text': txt, 'life': round(d + .35, 2)})
            if c['id'] in C.get('cues', {}):
                for off, a in cue_list(C['cues'][c['id']]): acts.append(dict(a, t=round(t + off, 3)))
            rows.append(f"{t:7.2f}  {d:5.2f}s  {c['id']:6s} {c['role']:4s} {c['text']}" + ('   (估算, 无音频)' if c['id'] in est else ''))
            prev = c; t += d
        t += (1.3 if sc < last else 1.6) + C.get('hold', {}).get(str(sc), 0)
        if sc == 0:
            shots.append([round(t - .2, 3), .48, .04, .06, .3, .98, 2.0])
        else:
            if not scl: t += 2.5
            D = t - T0; A, B = C.get('focus', {}).get(str(sc), FOCUS)
            shots.append([round(T0 + D * .38, 3)] + list(A)); shots.append([round(T0 + D * .78, 3)] + list(B))
            if sc < last: shots.append([round(t - .25, 3)] + wide)
            segs.append({'s': sc, 'a': round(T0 + .4, 3), 'b': round(t, 3), 'title': titles.get(str(sc), ''), 'sub': ''})
    end_at = t
    shots += [[round(end_at + .8, 3), 0, .18, .05, 0, .86, 2.6], [round(end_at + 4.5, 3), 0, .18, .05, -.04, .82, 2.85]]
    total = end_at + 4.0
    acts.sort(key=lambda a: a['t'])
    plan = {'shots': shots, 'segs': segs, 'subs': subs, 'acts': acts, 'endAt': round(end_at, 3), 'total': round(total, 3), 'spreads': last}
    json.dump(plan, open(out / 'plan.json', 'w'), ensure_ascii=False, indent=1)

    track = np.zeros(int((total + .5) * SR), np.float32)
    for c in clips: i = int(c['start'] * SR); track[i:i + len(c['audio'])] += c['audio']
    pk = np.abs(track).max()
    if pk > 0: track = track / pk * .89
    with wave.open(str(out / 'voice_track.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((track * 32767).astype(np.int16).tobytes())
    (out / 'timeline.txt').write_text('\n'.join(rows) + f'\n\n片尾 {end_at:.2f}s · 总长 {total:.2f}s\n')
    print(f'{len(lines)} lines over {last} spreads · total {total:.1f}s ({int(total * 30)} frames) · end card at {end_at:.1f}s · {len(acts)} acts, {len(subs)} subtitles')
    if est: print(f'{len(est)} lines had no audio and were estimated:', ' '.join(est[:12]) + (' …' if len(est) > 12 else ''))


if __name__ == '__main__':
    main()
