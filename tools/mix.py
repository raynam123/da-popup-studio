#!/usr/bin/env python3
"""popup-studio · encode the frames and mix the deliverables. No music, ever, unless asked.

  python3 tools/mix.py BOOK_DIR [--sfx-db -11] [--music path.mp3 --music-db -20]

Needs film/frames/, film/sfx.wav (render.py audio) and, for the voiced cut, film/voice_track.wav (plan.py).
Writes BOOK_DIR/out/:
  <title>_音效版.mp4    picture + sound effects only (for the user's own voice-over)
  <title>_配音版.mp4    picture + character voices + sound effects
  stems/voice_track.wav, stems/sfx.wav   the two audio layers, for re-editing
  封面_16x9_*.jpg / 封面_3x4_*.jpg  (copied from film/cover/ when render.py cover has run)
"""
import argparse, json, pathlib, re, shutil, subprocess

FPS = 30


def run(cmd): print(' '.join(str(c) for c in cmd[:6]), '…', flush=True); subprocess.run([str(c) for c in cmd], check=True)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('book'); ap.add_argument('--sfx-db', type=float, default=-11)
    ap.add_argument('--music'); ap.add_argument('--music-db', type=float, default=-20)
    ap.add_argument('--partial', action='store_true', help='encode the frames done so far (a draft)')
    args = ap.parse_args()
    book = pathlib.Path(args.book).resolve(); film = book / 'film'; out = book / 'out'; (out / 'stems').mkdir(parents=True, exist_ok=True)
    m = re.search(r"title:\s*'([^']+)'", (book / 'src/story.js').read_text()); title = m.group(1) if m else 'film'
    n = 0
    while (film / f'frames/f_{n:05d}.jpg').exists(): n += 1     # the unbroken run from frame 0
    if not n: raise SystemExit('no frames: run tools/render.py frames first')
    if (film / 'plan.json').exists():
        need = int(round(json.load(open(film / 'plan.json'))['total'] * FPS))
        if n < need and not args.partial: raise SystemExit(f'only {n}/{need} frames: run tools/render.py frames again to finish')
    dur = n / FPS
    vid = ['-framerate', FPS, '-i', film / 'frames/f_%05d.jpg']
    venc = ['-vf', f'fade=t=in:st=0:d=0.4,fade=t=out:st={dur - .6:.2f}:d=0.6,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', 19,
            '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', f'{dur:.3f}']
    music_in = ['-stream_loop', '-1', '-i', args.music] if args.music else []
    tail = f'loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st={dur - 1.2:.2f}:d=1.2'

    # 1) sound effects only
    sfx_chain = f'[1:a]volume={args.sfx_db + 8}dB[s]'
    if args.music:
        fc = f'{sfx_chain};[2:a]volume={args.music_db}dB[m];[s][m]amix=inputs=2:normalize=0,{tail}[a]'
    else:
        fc = f'{sfx_chain};[s]{tail}[a]'
    run(['ffmpeg', '-v', 'error', '-y', *vid, '-i', film / 'sfx.wav', *music_in, '-filter_complex', fc, '-map', '0:v', '-map', '[a]', *venc, out / f'{title}_音效版.mp4'])
    shutil.copy(film / 'sfx.wav', out / 'stems/sfx.wav')

    # 2) voices + sound effects
    if (film / 'voice_track.wav').exists():
        fc = f'[1:a]aformat=channel_layouts=stereo,aresample=48000[v];[2:a]aresample=48000,volume={args.sfx_db}dB[s]'
        if args.music: fc += f';[3:a]aresample=48000,volume={args.music_db - 4}dB[m];[v][s][m]amix=inputs=3:normalize=0,{tail}[a]'
        else: fc += f';[v][s]amix=inputs=2:normalize=0,{tail}[a]'
        run(['ffmpeg', '-v', 'error', '-y', *vid, '-i', film / 'voice_track.wav', '-i', film / 'sfx.wav', *music_in,
             '-filter_complex', fc, '-map', '0:v', '-map', '[a]', *venc, out / f'{title}_配音版.mp4'])
        shutil.copy(film / 'voice_track.wav', out / 'stems/voice_track.wav')
    else: print('no film/voice_track.wav: voiced cut skipped')

    for f in sorted((film / 'cover').glob('cover_*.jpg')) if (film / 'cover').exists() else []:
        shutil.copy(f, out / f.name.replace('cover_', '封面_'))
    for f in sorted(out.glob('*.mp4')):
        d = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip()
        print(f'{f.name}  {float(d):.1f}s  {f.stat().st_size / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
