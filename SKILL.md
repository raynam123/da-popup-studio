---
name: popup-studio
description: 用户给一个主题，一步步做出纸艺立体书短片：三个剧本大纲 → 详细剧情 → 元素图提示词 → 配音脚本 → 用上传的图和配音渲染视频（音效版 + 配音版 + 封面）。视频风格可选立体书或旋转木马立体书。用户说做立体书、旋转木马书、立体书视频或给出立体书主题时使用。
---

# popup-studio · 主题 → 纸艺立体书短片

用户给一个主题，你分阶段产出，**每个关口等用户确认再往下走**。

本文件所在的目录记作 `P`（skill 根目录），里面有全部代码和规范：

```
P/engine/           立体书引擎（Three.js r128）
P/engine-carousel/  旋转木马立体书引擎
P/tools/            打包、截图、配音脚本、时间线、渲染、合成
P/styles/visual/    画面风格库（watercolor-papercraft 水粉彩铅纸艺）
P/styles/video/     视频风格库（popup-book 立体书 · carousel-book 旋转木马）
P/reference/        story_contract.md（story.js 契约）· voices.md（配音音色）· package.md（目录与命令速查）
P/templates/        每一步交付物的格式
P/examples/         xiaohongmao（立体书范例）· luobodeng-carousel（旋转木马范例）
```

## 0. 准备（每个新会话做一次）

1. 确定 `P` 的绝对路径，后面命令里的 `$P` 都指它。
2. 检查依赖：`python3`（numpy pillow scipy playwright）、Playwright 自带的 Chromium、`ffmpeg`、`npm`。缺什么就装：`pip install numpy pillow scipy playwright && python3 -m playwright install chromium`；ffmpeg 用系统包管理器装。第一次运行 `build.py` 会自动用 npm 把 three@0.128.0 和站酷小薇字体装进 `~/.popup-studio`。
3. 需要时读规范：
   - 画面风格 `styles/visual/*.md`，视频风格 `styles/video/*.md`
   - `reference/story_contract.md`（立体书的 story.js）、`styles/video/carousel-book.md` 第 6 节（旋转木马的 story.js）、`reference/voices.md`（配音选角）
   - `templates/*.md`（交付物格式），`examples/`（完整范例）
4. 每本书一个目录：`BOOK_DIR=~/books/<拼音或英文短名>`。同一本书两种视频风格都做时，旋转木马版另开 `~/books/<短名>_xz`，`src/images.js`、`dub/dub.json` 复用。

## 流程

建任务列表跟踪这 9 步。默认：5 个跨页（旋转木马 5–8 页都合适）、画面风格用现有那一个（库里只有一种时直接说明用它，不必问）。视频风格有两种，在第 2 步问用户选哪种，一句话说清区别：立体书 = 翻页、多层纸雕、纸舌头和转盘；旋转木马 = 一圈小剧场、翻到哪页哪页张开、墙上整幅布景、点角色听配音。

### 第 1 步 · 三个剧本大纲（回复里写）
按 `templates/outlines_template.md` 写三个真正不同的方向，末尾给推荐。只问一个问题：选哪个 / 怎么混搭，页数是否不是 5 页。
→ **等用户选定。**

### 第 2 步 · 详细剧情 + 风格确认
按 `templates/story_doc_template.md` 写「故事文件」，做成用户能直接修改的文档。同时写明画面风格、视频风格、本书配色。
→ **等用户确认剧情和风格。** 确认后的故事文件是后面所有东西的唯一依据；用户改了就以改后的为准。

### 第 3 步 · 元素图提示词（剧情 + 风格确认后）
按所选画面风格文件 + `templates/prompts_template.md`（范例 `examples/xiaohongmao/prompts.md`）写 `《书名》_立体书_提示词.md`，作为文件交给用户。
旋转木马：每页加一张**宽幅布景**（横向 3:1–4:1、底边平直，给墙面全景用），每页角色 2–4 个、道具 1–3 个即可。
同时在 BOOK_DIR 写好 `assets_map.json`（文件名 → story key + 最长边）。提醒用户：先做 `00_` 角色参考图，之后每张都带上参考图，保证画风和人物一致；做好的图打包成一个 zip 发回，可以分批。

### 第 4 步 · 配音脚本（剧情确认后，和第 3 步同一轮交付）
1. 按 `reference/voices.md` 选角写 `BOOK_DIR/dub/dub.json`（每个角色 `why` + `note` 两个备选；剧本 S0 封面 + 每页 4–6 句，主机关对应一句台词）。
2. `python3 $P/tools/make_dub.py $BOOK_DIR` → 生成并用 `--dry` 检查 `dub/《书名》_配音.py`。
3. 把配音脚本交给用户，告诉用户：`pip install dashscope`，用环境变量 `DASHSCOPE_API_KEY` 提供阿里云百炼的 key，运行后把整个 `voice_out` 文件夹打包发回。
- **不要向用户要 API key，也不要读任何 key 文件**；脚本只从环境变量读。

### 第 5 步 · 素材到了 → 搭书
1. `python3 $P/tools/prep_assets.py 素材.zip $BOOK_DIR` → 看 `assets/_sheet.png`：缺图、角色不一致、朝向反了、状态图大小不一 → 列出来请用户重做（可以先用现有的继续）。
2. 写 `src/story.js`：立体书复制 `examples/xiaohongmao/story.js` 逐段改写（契约见 `reference/story_contract.md`）；旋转木马复制 `examples/luobodeng-carousel/story.js`（契约见 `carousel-book.md` 第 6 节，每页写 `pano` 墙面全景、`ground` 地面、角色 tap 的 `role`）。☆ 加分图缺了就跳过那个物件，不要报错。
3. 立体书：`python3 $P/tools/build.py $BOOK_DIR` → `python3 $P/tools/shoot.py $BOOK_DIR --phone`。旋转木马：`python3 $P/tools/build_carousel.py $BOOK_DIR`（配音已到就加 `--voice voice_out.zip`，点角色能听到配音）→ `python3 $P/tools/shoot_carousel.py $BOOK_DIR`。**逐张看截图**修问题（光晕、悬空、遮挡、气泡溢出、层级、手机卡片、墙面布景太空），直到干净。
4. 把可玩的网页版交给用户（立体书 `dist/book.html`，旋转木马 `dist/carousel.html`，离线版在 `dist/` 里）。环境能发布网页就发布一份。这是附送交付物，不用等确认就可以继续。

### 第 6 步 · 配音到了 → 排时间线 → 先抽 6 帧
1. 写 `film/cues.json`：要中英双语就加 `en`（台词编号 → 英文）。立体书：主机关挂到对应台词、每页两个镜头焦点、需要时 `hold`（范例 `examples/xiaohongmao/cues.json`）。旋转木马：`carousel.cue`（每页主机关挂在哪句台词、延后几秒，范例 `examples/luobodeng-carousel/cues.json`）。
2. 立体书：`python3 $P/tools/plan.py $BOOK_DIR voice_out.zip`。旋转木马：先 `build_carousel.py $BOOK_DIR --voice voice_out.zip`，再 `python3 $P/tools/plan_carousel.py $BOOK_DIR voice_out.zip`。看 `film/timeline.txt`（有「估算, 无音频」说明缺配音文件，告诉用户）。
3. `python3 $P/tools/render.py preview $BOOK_DIR`（约 1 分钟）→ 自己先看 `film/preview/pv_sheet.jpg`，再发给用户，附总时长和预计渲染时间。
→ **等用户确认画面。** 要改镜头/机关时机就改 cues.json 重跑 plan + preview。

### 第 7 步 · 整段渲染（默认不带音乐）
- 帧：`python3 $P/tools/render.py frames $BOOK_DIR --max-minutes 110`，放到后台跑。跑完一段就再启动一次，直到输出「ready for tools/mix.py」。它会自动跳过已渲染的帧，接缝无跳变。
- 速度（软件渲染，2 核）：立体书约 3–5 秒/帧，旋转木马约 2–2.5 秒/帧；2 分钟成片 ≈ 3600 帧，3 分钟 ≈ 5400 帧。开始前告诉用户预计完成时间；中途用 `render.py status` 查进度，停了就再启动。
- 同时（或之后）跑：`render.py audio $BOOK_DIR`（音效）和 `render.py cover $BOOK_DIR`（封面）。

### 第 8 步 · 合成交付
`python3 $P/tools/mix.py $BOOK_DIR` → `out/`。抽查两个视频的开头、中段、结尾各一帧和音量后交付：
1. `《书名》_音效版.mp4`（画面 + 音效，留给用户自己配音）
2. `《书名》_配音版.mp4`（画面 + 角色配音 + 音效）
3. 封面：`封面_16x9_00/01/02.jpg`（合上的书 / 最后一页高潮 / 书名卡）、`封面_3x4_00/01.jpg`（竖版）
4. 需要时：`stems/voice_track.wav`、`stems/sfx.wav`（方便用户再剪）
用户明确要配乐时才用 `mix.py --music 路径`。

### 第 9 步 · 收尾
把这本书的源文件（`src/story.js`、`film/cues.json`、`dub/dub.json`、`assets_map.json`、`assets/*.png`）打成 `source.tar.gz` 交给用户，方便以后改版重渲。

## 硬规则

- **每个关口等确认**：大纲 → 剧情+风格 → （素材/配音到了）6 帧 → 整段渲染。提示词和配音脚本在剧情确认后才写。
- 不清楚就问，但一次只问真正影响产出的问题。
- 角色动作只用平移、弹跳、缩放、换图；不做大角度旋转（风车、齿轮、转盘、小幅摇摆除外）。
- 视频默认无背景音乐。
- 儿童友好：反派滑稽不吓人，可怕情节改温和版。只改编公有领域作品或原创；角色外形不向知名 IP 靠拢。
- 文字说的事画面必须做得到，做不到就改文字。
- 引擎是通用的：新书只写 story.js / cues.json / dub.json。需要新的通用机关才改 `engine/` 或 `engine-carousel/`，改完同步更新对应规范文档。

## 扩展风格库

用户要新风格时：画面风格 = 在 `styles/visual/` 加一个 md（美术规范、通用风格后缀、角色设定写法、素材规格），引擎不变；视频风格 = 在 `styles/video/` 加 md，非立体书形式需要新引擎目录 `engine-<name>/`（参考 `engine-carousel/` + `build_carousel.py` / `plan_carousel.py` 的做法），工具链复用（页面实现 `window.__film = {start, step, audio, skip}` + `window.FILM_PLAN`）。写好后更新 `reference/package.md`。
