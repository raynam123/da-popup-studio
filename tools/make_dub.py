#!/usr/bin/env python3
"""popup-studio · write the user's dubbing script from BOOK_DIR/dub/dub.json.

  python3 tools/make_dub.py BOOK_DIR      → BOOK_DIR/dub/<title>_配音.py  (+ a --dry run to check it)

dub.json:
{
  "title": "小红帽",
  "voices": {"旁白": {"voice": "longmiao_v3", "speech_rate": 0.96, "pitch_rate": 1.0, "volume": 55,
                      "why": "龙妙，有声书女声，讲童话", "note": "备选：longyuan_v3（龙媛）"}, ...},
  "scenes": {"S0": "开场 · 封面", "S1": "第一页 · 出发（拉纸舌头：出门）", ...},
  "script": [{"id": "S0-01", "role": "旁白", "text": "……"}, {"id": "S1-02", "role": "小红帽", "text": "……", "rate": 1.05, "gap": 0.8}, ...]
}
Voice names must come from reference/voices.md (cosyvoice-v3-flash system voices). The script reads the
API key from DASHSCOPE_API_KEY; never put a key into the file.
"""
import json, pathlib, subprocess, sys

PKG = pathlib.Path(__file__).resolve().parent.parent
J = lambda v: json.dumps(v, ensure_ascii=False)


def main(book):
    book = pathlib.Path(book).resolve(); d = json.load(open(book / 'dub/dub.json', encoding='utf-8'))
    roles = set(d['voices']); bad = [l['id'] for l in d['script'] if l['role'] not in roles]
    if bad: sys.exit(f'lines with a role that has no voice: {bad}')
    voices = []
    for role, v in d['voices'].items():
        why = v.get('why'); v = {k: x for k, x in v.items() if k != 'why'}
        voices.append((f'    # {role}：{why}\n' if why else '') + f'    {J(role)}: {J(v)},')
    scenes = '\n'.join(f'    {J(k)}: {J(v)},' for k, v in d['scenes'].items())
    rows, cur = [], None
    for l in d['script']:
        sc = l['id'].split('-')[0]
        if sc != cur: cur = sc; rows.append(f"\n    # ---- {d['scenes'].get(sc, sc)} ----")
        rows.append(f'    {J(l)},')
    secs = sum(sum(1 for c in l['text'] if c.isalnum()) / 4.3 + .6 for l in d['script'])
    src = (PKG / 'templates/dub_template.py').read_text()
    src = (src.replace('{{TITLE}}', d['title']).replace('{{VOICES}}', '\n'.join(voices)).replace('{{SCENES}}', scenes)
              .replace('{{SCRIPT}}', '\n'.join(rows).lstrip('\n')).replace('{{DURATION}}', f'约 {secs / 60:.0f} 分 {secs % 60:.0f} 秒'))
    out = book / 'dub' / f"{d['title']}_配音.py"; out.write_text(src)
    subprocess.run([sys.executable, '-m', 'py_compile', str(out)], check=True)
    r = subprocess.run([sys.executable, out.name, '--dry'], cwd=out.parent, capture_output=True, text=True)
    print(r.stdout[-1500:] or r.stderr[-1500:]); print('→', out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
