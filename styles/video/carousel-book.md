# 视频风格 · 旋转木马立体书（carousel-book）

> 一句话：**一本能翻开 360° 的纸艺书**。封面和封底合在一起，书页围着书脊站成一圈，每两页之间是一个小剧场。整圈看时每页平分角度；转到哪一页，那一页就张开到 120°，两面墙变成一整幅布景，角色站在前面演，点一下会用配音说话。
> 实现：`engine-carousel/`（Three.js r128，独立于立体书引擎）+ 每本书一个 `story.js`。产出同样两样：可玩的网页 + 逐帧渲染的配音短片。工具链：`build_carousel.py` → `shoot_carousel.py` → `plan_carousel.py` → `render.py` / `mix.py`（后两个与立体书共用）。
> 范例：`examples/luobodeng-carousel/`（《一盏萝卜灯的两千年》，7 个小剧场，35 句配音，成片 2 分 59 秒）。

## 1. 什么时候选它

| 选旋转木马 | 选立体书（popup-book） |
|---|---|
| 想要"一圈看完"的全景感、适合做旋转展示的封面和结尾 | 想要翻页节奏、每页一次大开合 |
| 每个场景是"一个舞台 + 几个角色" | 场景有前中后多层纵深、有纸舌头和转盘 |
| 背景有好看的宽幅布景（远山、村庄、街道） | 天空、地面靠程序画就够 |

两种风格吃同一套素材规格（透明 PNG、同样的提示词格式），同一套配音脚本（dub.json），所以一本书可以两种都做。

## 2. 书的结构

- **页数**：5–8 个小剧场（7 个刚好够讲完整故事；5 个时每页更宽）。页数 = `ROOMS.length`。
- **角度**：整圈视图每页 360°/N；当前页张开到 `OPEN = min(120°, 2.6 × 360°/N)`，其余页平分剩下的角度。翻页时约 1 秒张开，离开时合回；整圈旋转和全景镜头里所有页回到平分。这是数字版独有的效果，真实的书做不到。
- **每个剧场**：
  | 部分 | 内容 |
  |---|---|
  | 两面墙 | 一整幅夜景/日景**全景布景**：左墙是左半边、右墙是右半边，在书脊处接上。上面是天空（星星、月亮、蝙蝠或太阳、云），下面是一张宽幅背景素材，比墙宽的部分自然出界。后面叠一层淡的远景。墙上**不印文字**。 |
  | 地面 | 每页自己的扇形纸地面（草地、落叶、石板、海浪、街道……），随张开角度一起变宽。 |
  | 舞台 | 中景纸条（`r.layer`，如茅草屋、篝火、雾带、前景浪花）+ 立着的剪纸角色和道具（`r.piece`）。张开时舞台横向舒展（物件间距变大，物件本身不变形），合上时超出墙的部分被墙挡住。 |
- **文字**：章节名在底部控制条和右上角页签；正文放在"读这一页"（眼睛按钮）里，由旁白朗读并显示中英字幕。
- **封面**：合上时是一本竖着的精装书，封面拱窗里放封面图（`cover` 素材），书名自动缩放到一行。

## 3. 互动

| 互动 | 怎么玩 | story 里怎么写 |
|---|---|---|
| 主机关 | 底部大按钮（按钮文字 = `action`），一页一个"发生了什么" | `act(r)` 用 `tween/after` 编排，`reset(r)` 复原；`dur` 写机关总时长 |
| 点角色说话 | 点角色播放他的配音（同页台词优先，多次点击轮换），气泡中英双语 | `r.taps.push({ m, role: '角色名' })`，角色名与 dub.json 一致 |
| 点物件小动作 | 鼓、钟、苹果、船…… | `r.taps.push({ m, act: rr => {…} })` |
| 读这一页 | 眼睛按钮：旁白读本页 + 双语字幕 | 自动（读 dub.json 里本页的旁白句） |
| 拖动 | 左右拖转整圈，松手吸附到最近的一页 | 自动 |
| 机关台词配音 | `act` 里 `say(m, '……')` 的文字和某句配音一致时自动播放那句配音 | 写和 dub.json 完全相同的句子 |

**动作原则**同立体书：平移、弹跳、缩放、换图；只有本来就转的东西和小幅摇摆可以转。

## 4. 光效与声音

- 台灯从左上照下，纸墙和角色投真实影子；泛光只给真正的光源（篝火、灯笼、烛光、门里透出的光、南瓜灯）。
- 情绪光：温暖（点灯、开门，`FXS.lampReq` 调亮）· 悬念（调暗到 7 成）· 惊喜（`FXS.flash` 闪白 + `starburst` 星芒 + 撒彩纸）。
- 声音：动作音和环境底噪程序合成（`bed`）；角色配音来自 CosyVoice 配音脚本，压成 mp3 嵌进网页（35 句约 1 MB）。**不配背景音乐**。

## 5. 素材要求（在 watercolor-papercraft 规范之上）

- **每页一张宽幅布景**（横向 3:1–4:1，底边平直）：给墙面全景用，比如远山、树林、小镇屋顶、田野、村庄、海浪、街道。没有也行，墙面只有天空。
- 角色和道具照常（透明底、朝向写清楚）。舞台进深有限，**每页 2–4 个角色 + 1–3 个道具**最合适；会动的大物件（树、房子、门廊）用 `piece`，带开合状态的出两张图。
- 地面是程序画的，不用出图。

## 6. story.js 契约（engine-carousel）

必须定义：`BOOK`、`C`、`VOICES`、`ROOMS`、`filmTimeline/filmActs/filmShots`（无配音的巡游片）、`speaker(k, role, r)`、`planTimeline`（配音片，照范例原样复制）。

```js
const BOOK = { title, sub, author, intro: '第一行\n第二行\n第三行', tagline, coverHex, coverCss, spineHex, filmEnd };
const ROOMS = [{
  title: '章节名', action: '按钮文字', hintLine: '底部提示', dur: 3.2,        // dur = act 的总时长（秒）
  pano: { top: '#16203F', bot: '#3E507E', key: 'hills', frac: .8,            // 墙面全景：天空渐变、宽幅布景及其高度占比
          moon: [x, y, r], bats: [[x, y, s]], glow: 'rgba(…)', stars: 90,     // 可选：月亮、蝙蝠、地平线光、星星数
          back: ['shore', cx, by, hf], noHaze: true },                         // 可选：布景后面再放一张图；不要淡远景
  ground: nightGround('#3F5E42', [...], n, 'blade'|'leaf'|'stone'|'wave'),     // 扇形地面
  text: ['正文 4 行，读这一页时显示'], hint: ['', ''], bed: { … 环境底噪 },
  build(r) {                                     // 舞台：z 是离书脊的距离（.4 中景，.7–.86 前景），x 左负右正
    r.layer(.46, .4, (g, w, h, px) => place(g, 'huts', w / 2, h - 4, .3 * px));   // 中景纸条（不随舞台舒展）
    r.brid = r.piece('bridRef', -.18, .72, .4);  // 角色：key, x, z, 高度；{ y, hidden, center, flip }
    r.fg = r.glow(.1, BH + .14, .72, .5, 0xFFA040, 0);        // 跟着舞台走的光；r.glowFixed 跟着纸条不动
    r.taps.push({ m: r.brid, role: '布丽德' });
    r.update = (dt, t) => { … };
  },
  act(r) { … tween / after / say / burstAt / starburst / FXS … },
  reset(r) { … }
}];
```

- 坐标：舞台按 51° 左右的窄页设计（x 大约 ±.3，z .44–.86），张开时引擎自动横向舒展 ×1.75。
- 自动处理：所有 piece/layer/地面按当前张开角度被两面墙裁切；角色不被拉伸；`follow()`（范例里的小工具）让光点跟着角色。
- 可直接复制的小工具（范例里）：`nightStrip`、`moonDisc`、`batShape`、`bandArt`、`bushStrip`、`nightGround`、`follow`、`wuwu`（主角灯笼）、`sparks`、`knock/drum/dong`。

## 7. 短片规格

| 项目 | 规格 |
|---|---|
| 画幅 | 1920×1080，30 fps，H.264 CRF 19，AAC 192k |
| 画面 | 保留玻璃质感的界面（书名、页签、底部控制条，按钮在机关触发时按下）；旁白 = 底部双语字幕；角色台词 = 双语气泡；结尾书名卡 |
| 时间线（plan_carousel.py） | 封面旁白 → 翻开书（2.7 s）→ 每页：台词依次，主机关挂在 `cues.json` 指定的台词上，两个推近镜头（38 %、78 %），机关演完再停 1.1 s → 转到下一页（2 s，下一页张开）→ 结尾全部收回、整圈旋转、书名卡 |
| 时长 | 由配音决定：7 页 35 句约 3 分钟 |
| 渲染 | 约 2–2.5 秒/帧（2 核），3 分钟 ≈ 5400 帧 ≈ 3.5 小时；可断点续渲 |
| 交付 | `_配音版.mp4` + `_音效版.mp4` + stems + 封面（render.py cover / mix.py 共用） |

## 8. 做一本的流程

1. 大纲 → 故事文件 → 提示词 → 配音脚本：与立体书完全相同（每页记得给一张宽幅布景）。
2. `prep_assets.py 素材.zip BOOK_DIR`（同立体书）。
3. 写 `src/story.js`：复制 `examples/luobodeng-carousel/story.js` 改写。
4. `build_carousel.py BOOK_DIR --voice voice_out.zip` → `dist/carousel.html`（发布）、`dist/<书名>_旋转木马.html`（离线）、`dist/film.html`。
5. `shoot_carousel.py BOOK_DIR` → 看 `shots/_sheet.jpg`：全景、翻页中、每页张开后。
6. `film/cues.json`：`en`（英文行）+ `carousel.cue`（每页主机关挂在哪句台词、延后几秒）。`plan_carousel.py BOOK_DIR voice_out.zip`。
7. `render.py preview` → 确认 → `render.py frames`（断点续渲）→ `render.py audio` / `cover` → `mix.py`。
