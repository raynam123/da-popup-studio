# popup-studio · 目录与命令速查

给一个主题，一步步做出：一本可以在网页上玩的纸艺立体书，和一条逐帧渲染的短片（音效版 + 角色配音版 + 封面）。工作流写在 `SKILL.md`；这里是代码结构和命令。

## 目录

```
engine/        Three.js 纸雕引擎（通用，不随书改）：engine.js core.js post.js shell.html fix_hui.woff2.b64
engine-carousel/ 旋转木马立体书引擎：shell.html（含 /*@DATA@*/ /*@STORY@*/ 标记）
tools/         build.py 打包网页 · prep_assets.py 清理素材 · shoot.py 截图自检 · make_dub.py 生成配音脚本
               plan.py 按配音排时间线 · render.py 预览/逐帧/音效/封面 · mix.py 合成两版视频
               旋转木马：build_carousel.py 打包网页+嵌配音 · shoot_carousel.py 截图自检 · plan_carousel.py 配音时间线
styles/visual/ 画面风格库（watercolor-papercraft = 水粉彩铅纸艺）
styles/video/  视频风格库（popup-book = 立体书 · carousel-book = 旋转木马立体书）
reference/     story_contract.md（story.js 怎么写）· voices.md（CosyVoice 音色速查）
templates/     三个大纲 / 故事文件 / 提示词文档的格式，dub_template.py（配音脚本模板）
examples/xiaohongmao/  《小红帽》完整范例：story.js · prompts.md · assets_map.json · dub.json · cues.json
examples/luobodeng-carousel/  《一盏萝卜灯的两千年》旋转木马范例：story.js · cues.json（en + carousel.cue）· dub.json · assets_map.json
```

## 一本书的目录（BOOK_DIR）

```
assets_map.json          素材文件名 → story 里的 key + 尺寸
src/story.js             这本书的一切（照 examples 改）
src/images.js            prep_assets.py 生成
dub/dub.json             配音角色/音色/剧本 → make_dub.py → dub/《书名》_配音.py（用户本地运行）
film/cues.json           台词 → 机关、每页镜头焦点
film/plan.json …         plan.py 生成；frames/ preview/ cover/ sfx.wav voice_track.wav
dist/                    book.html（发布用）· 《书名》.html（离线版）· dev.html · film.html
out/                     《书名》_音效版.mp4 · 《书名》_配音版.mp4 · stems/ · 封面_*.jpg
```

## 命令

```bash
P=<skill 目录>; B=~/books/xxx
python3 $P/tools/prep_assets.py 素材.zip $B           # → src/images.js + assets/_sheet.png
python3 $P/tools/build.py $B                          # → dist/
python3 $P/tools/shoot.py $B --phone                  # → shots/_sheet.jpg
python3 $P/tools/make_dub.py $B                       # → dub/《书名》_配音.py（并 --dry 检查）
python3 $P/tools/plan.py $B voice_out.zip             # → film/plan.json voice_track.wav timeline.txt
python3 $P/tools/render.py preview $B                 # → film/preview/pv_sheet.jpg（6 帧）
python3 $P/tools/render.py frames $B --max-minutes 100   # 可反复运行，断点续渲
python3 $P/tools/render.py audio $B && python3 $P/tools/render.py cover $B
python3 $P/tools/mix.py $B                            # → out/

# 旋转木马（carousel-book）：素材和配音同上，换这三步，render/mix 共用
python3 $P/tools/build_carousel.py $B --voice voice_out.zip   # → dist/carousel.html · <书名>_旋转木马.html · film.html
python3 $P/tools/shoot_carousel.py $B                 # → shots/_sheet.jpg（全景、翻页中、每页张开）
python3 $P/tools/plan_carousel.py $B voice_out.zip    # → film/plan.json voice_track.wav timeline.txt
```

依赖：python3 + numpy pillow scipy playwright（自带 Chromium）、ffmpeg、npm（首次 build 自动装 three@0.128.0 和站酷小薇字体到 ~/.popup-studio）。

## 扩展风格库

- 新画面风格：在 `styles/visual/` 加一个 md，必须有：美术规范表、通用风格后缀、角色设定写法、素材规格、配色示例。引擎不用改（素材都是透明 PNG）。
- 新视频风格：在 `styles/video/` 加一个 md，并说明用哪个引擎；不是立体书的形式（如剪纸皮影、翻翻书）需要新引擎目录 `engine-<name>/`，工具链（plan/render/mix）复用：只要页面提供 `window.__film = {start, step, audio, skip}` 和 `window.FILM_PLAN` 支持。
