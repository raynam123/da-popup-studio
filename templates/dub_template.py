# -*- coding: utf-8 -*-
"""
《{{TITLE}}》立体书短片 · 配音生成脚本（阿里云百炼 CosyVoice）
—— 由 popup-studio 生成：只改「一、配置区」和「二、剧本」，生成逻辑不用动。

用法
  pip install dashscope numpy
  export DASHSCOPE_API_KEY=你的key            # 或者填到下面 API_KEY（不要把 key 发到聊天里）
  python {{TITLE}}_配音.py --dry           # 只打印剧本和预估时长，并写出 voice_out/script.json，不调用接口
  python {{TITLE}}_配音.py                 # 生成全部台词
  python {{TITLE}}_配音.py --only 小红帽    # 只重做某个角色
  python {{TITLE}}_配音.py --lines S3-02 S3-04 --force   # 重做指定几句

输出（默认在 ./voice_out/，整个文件夹打包成 zip 发回来即可）
  S1-02_角色.wav ……    每句一个文件，文件名 = 台词编号_角色
  manifest.json        每句的编号、场景、角色、文字、音色、时长（视频按它对齐画面）
  preview_full.wav     全部台词按顺序 + 停顿拼成的试听版
"""

import os
import sys
import json
import time
import wave
import argparse

# ============================================================================
# 一、配置区：主要改这里
# ============================================================================

# 你的 API Key：优先读环境变量 DASHSCOPE_API_KEY；也可以直接把 key 填在引号里
API_KEY = os.getenv("DASHSCOPE_API_KEY", "")

TITLE = "{{TITLE}}"

# 业务空间地址（默认是你之前用的北京地域工作空间；换空间时改这里或设环境变量）
BASE_WEBSOCKET_URL = os.getenv("DASHSCOPE_WS_URL", "wss://ws-udho0kbui23xwaiw.cn-beijing.maas.aliyuncs.com/api-ws/v1/inference")
BASE_HTTP_URL = os.getenv("DASHSCOPE_HTTP_URL", "https://ws-udho0kbui23xwaiw.cn-beijing.maas.aliyuncs.com/api/v1")

# 模型：系统音色属于 cosyvoice-v3-flash（音色名带 _v3 后缀）
# 你上传脚本里的 cosyvoice-v3.5-flash 用于“复刻音色”，如果以后换成自己复刻的声音，
# 把 MODEL 改成 cosyvoice-v3.5-flash，并把下面对应角色的 voice 换成复刻得到的 voice_id。
MODEL = "cosyvoice-v3-flash"

# 输出格式：WAV 方便后期混音（找不到该格式时自动退回 MP3）
AUDIO_FORMAT = "WAV_24000HZ_MONO_16BIT"

OUTPUT_DIR = "voice_out"
SEED = 7                 # 固定随机种子，重做同一句时声音更稳定（0–65535）
GAP_DEFAULT = 0.45       # 句与句之间默认停顿（秒），只影响试听版和 manifest 里的建议时间
SCENE_GAP = 1.0          # 换页时的额外停顿（秒），给翻页动画留时间

# 角色音色表 —— 想换声音只改 voice；其余参数范围：
#   speech_rate 语速 0.5–2.0（1.0 正常）  pitch_rate 音高 0.5–2.0  volume 音量 0–100
#   instruction 情感/风格指令：只有 longanyang、longanhuan_v3、longhuhu_v3 这几个音色支持，
#               其它音色填了也会被脚本自动忽略（并提示）。
VOICES = {
{{VOICES}}
}

# 支持 instruction 的音色（cosyvoice-v3-flash）
INSTRUCT_VOICES = {"longanyang", "longanhuan", "longanhuan_v3", "longhuhu_v3"}

# ============================================================================
# 二、剧本（{{DURATION}}）
#   每句：编号、角色、台词，可选 rate/pitch/vol 单句微调、instruction 单句情感、gap 本句之后的停顿（秒）
#   编号 S0 = 封面开场，S1…Sn = 立体书第 1…n 个跨页，对应视频里的每一页
# ============================================================================

SCENES = {
{{SCENES}}
}

SCRIPT = [
{{SCRIPT}}
]

# ============================================================================
# 三、生成逻辑（一般不用改）
# ============================================================================

CHARS_PER_SEC = 4.3   # 预估用：普通语速下每秒约 4.3 个汉字


def est_seconds(line):
    """不调用接口时，按字数和语速粗估时长"""
    cfg = VOICES[line["role"]]
    rate = line.get("rate", cfg.get("speech_rate", 1.0))
    n = sum(1 for ch in line["text"] if ch.isalnum())                  # 只数会读出来的字
    pauses = sum(1 for ch in line["text"] if ch in "，。！？、…；")     # 标点处的自然停顿
    return n / CHARS_PER_SEC / rate + pauses * 0.12


def wav_pcm(path):
    """读出 WAV 的采样率、位宽、声道和全部 PCM 数据。
    流式合成的 WAV 文件头里“数据长度”只是占位数，不可信，所以直接读到文件末尾。"""
    with wave.open(path, "rb") as w:
        rate, width, ch = w.getframerate(), w.getsampwidth(), w.getnchannels()
    raw = open(path, "rb").read()
    i = raw.find(b"data")
    pcm = raw[i + 8:] if i >= 0 else b""
    return rate, width, ch, pcm[: len(pcm) // (width * ch) * (width * ch)]


def wav_seconds(path):
    try:
        rate, width, ch, pcm = wav_pcm(path)
        return len(pcm) / float(rate * width * ch)
    except Exception:
        return None


def make_synth(dashscope_tts, line):
    """按角色配置 + 单句微调创建合成器；新旧版本 SDK 都能用"""
    cfg = VOICES[line["role"]]
    fmt = getattr(dashscope_tts.AudioFormat, AUDIO_FORMAT, None)
    if fmt is None:
        print(f"  ! 当前 SDK 没有 {AUDIO_FORMAT}，改用 MP3")
        fmt = dashscope_tts.AudioFormat.MP3_22050HZ_MONO_256KBPS
    base = dict(
        model=MODEL,
        voice=cfg["voice"],
        format=fmt,
        volume=int(line.get("vol", cfg.get("volume", 50))),
        speech_rate=float(line.get("rate", cfg.get("speech_rate", 1.0))),
        pitch_rate=float(line.get("pitch", cfg.get("pitch_rate", 1.0))),
    )
    extra = {"seed": SEED, "language_hints": ["zh"]}
    instr = line.get("instruction", cfg.get("instruction"))
    if instr:
        if cfg["voice"] in INSTRUCT_VOICES:
            extra["instruction"] = instr
        else:
            print(f"  ! {cfg['voice']} 不支持 instruction，已忽略")
    # 新版 SDK 直接接受这些参数；旧版不认识时改放进 additional_params
    try:
        return dashscope_tts.SpeechSynthesizer(**base, **extra)
    except TypeError:
        return dashscope_tts.SpeechSynthesizer(**base, additional_params=extra)


def synth_line(dashscope_tts, line, path, retries=3):
    for attempt in range(1, retries + 1):
        try:
            synth = make_synth(dashscope_tts, line)      # 官方要求每次 call 前新建实例
            audio = synth.call(line["text"])
            if not audio:
                raise RuntimeError("接口没有返回音频")
            with open(path, "wb") as f:
                f.write(audio)
            print(f"  ✓ {os.path.basename(path)}   request_id={synth.get_last_request_id()}")
            return True
        except Exception as e:
            print(f"  ✗ 第 {attempt} 次失败：{e}")
            time.sleep(2 * attempt)
    return False


def build_preview(entries, out_path):
    """把每句 WAV 按顺序拼起来，中间插入停顿，生成试听版"""
    wavs = [e for e in entries if e["file"].endswith(".wav") and os.path.exists(e["path"])]
    if not wavs:
        return False
    rate, width, ch, _ = wav_pcm(wavs[0]["path"])
    with wave.open(out_path, "wb") as out:
        out.setnchannels(ch); out.setsampwidth(width); out.setframerate(rate)
        for e in wavs:
            out.writeframes(wav_pcm(e["path"])[3])
            out.writeframes(b"\x00" * int(rate * e["gap_after"]) * width * ch)
    return True


def main():
    ap = argparse.ArgumentParser(description=f"《{TITLE}》配音生成")
    ap.add_argument("--dry", action="store_true", help="只打印剧本和预估时长，不调用接口")
    ap.add_argument("--only", nargs="*", help="只生成这些角色，例如 --only 小星 旁白")
    ap.add_argument("--lines", nargs="*", help="只生成这些编号，例如 --lines S3-02 S5-04")
    ap.add_argument("--force", action="store_true", help="已存在的文件也重新生成")
    args = ap.parse_args()

    # 计算每句之后的停顿（换页处加长）
    for i, line in enumerate(SCRIPT):
        nxt = SCRIPT[i + 1] if i + 1 < len(SCRIPT) else None
        gap = line.get("gap", GAP_DEFAULT)
        if nxt and nxt["id"][:2] != line["id"][:2]:
            gap += SCENE_GAP
        line["gap_after"] = gap

    total = sum(est_seconds(l) + l["gap_after"] for l in SCRIPT)
    if args.dry:
        cur = None
        for l in SCRIPT:
            if l["id"][:2] != cur:
                cur = l["id"][:2]
                print(f"\n【{SCENES[cur]}】")
            print(f"  {l['id']}  {l['role']:<4} {l['text']}   ≈{est_seconds(l):.1f}s")
        print(f"\n共 {len(SCRIPT)} 句，预估总时长约 {total:.0f} 秒（含停顿）")
        print("音色：" + "，".join(f"{k}={v['voice']}" for k, v in VOICES.items()))
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(os.path.join(OUTPUT_DIR, "script.json"), "w", encoding="utf-8") as f:
            json.dump({"title": TITLE, "lines": [{k: l[k] for k in ("id", "role", "text", "rate", "gap") if k in l} for l in SCRIPT]},
                      f, ensure_ascii=False, indent=2)
        print(f"已写出 {OUTPUT_DIR}/script.json（没有配音时也能先排一版视频时间线）")
        return

    key = API_KEY or os.getenv("DASHSCOPE_API_KEY", "")
    if not key:
        sys.exit("没有找到 API Key：请设置环境变量 DASHSCOPE_API_KEY，或填写脚本顶部的 API_KEY。")

    import dashscope
    from dashscope.audio import tts_v2 as dashscope_tts
    dashscope.api_key = key
    dashscope.base_websocket_api_url = BASE_WEBSOCKET_URL
    dashscope.base_http_api_url = BASE_HTTP_URL

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    ext = ".wav" if AUDIO_FORMAT.startswith("WAV") else ".mp3"
    entries, failed, t = [], [], 0.0
    for line in SCRIPT:
        name = f"{line['id']}_{line['role']}{ext}"
        path = os.path.join(OUTPUT_DIR, name)
        want = (not args.only or line["role"] in args.only) and (not args.lines or line["id"] in args.lines)
        if want and (args.force or not os.path.exists(path)):
            print(f"[{line['id']}] {line['role']}：{line['text']}")
            if not synth_line(dashscope_tts, line, path):
                failed.append(line["id"])
        dur = wav_seconds(path) if os.path.exists(path) else None
        dur = dur if dur is not None else est_seconds(line)
        entries.append({
            "id": line["id"], "scene": SCENES[line["id"][:2]], "role": line["role"], "text": line["text"],
            "voice": VOICES[line["role"]]["voice"], "file": name, "path": path,
            "start": round(t, 2), "duration": round(dur, 2), "gap_after": line["gap_after"],
            **({"gap": line["gap"]} if "gap" in line else {}),
        })
        t += dur + line["gap_after"]

    with open(os.path.join(OUTPUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"title": TITLE, "model": MODEL, "total_seconds": round(t, 2),
                   "voices": VOICES, "lines": entries}, f, ensure_ascii=False, indent=2)
    if build_preview(entries, os.path.join(OUTPUT_DIR, "preview_full.wav")):
        print(f"\n试听版：{OUTPUT_DIR}/preview_full.wav")
    print(f"总时长约 {t:.0f} 秒；manifest：{OUTPUT_DIR}/manifest.json")
    if failed:
        print("这些句子失败了，可以用 --lines 重新生成：", " ".join(failed))


if __name__ == "__main__":
    main()
