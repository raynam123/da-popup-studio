# story.js 契约 · 引擎 API 速查

一本书 = `engine/engine.js`（通用）+ `BOOK_DIR/src/story.js`（这本书的一切）+ `src/images.js`（prep_assets 生成）。
build.py 把 story.js 原样插到引擎的 `/*@STORY@*/` 位置（同一个闭包里），所以 story 能直接调用下面所有引擎函数。
**写新书 = 复制 `examples/xiaohongmao/story.js`，逐段改写。** 不要改引擎；确实需要新的通用机关时，加进 engine.js 并在这里登记。

## 必须定义的符号

| 符号 | 作用 |
|---|---|
| `BOOK` | `{title, sub, coverHex, spineHex, deskPiece, endHint, filmEnd}`：书名、副标题（build.py 用正则读 `title:` `sub:`）、封面/书脊色、桌面摆件图 key、读完提示、30 秒短片的片尾时刻 |
| `C` | 本书色板（ink/cream/gold/coral/…），界面和纸签用 |
| `STORY` | `[null, {title, tab, hint, text:[3 行], dial?}, …]`：每页章节名、纸舌头文字（`''` 表示本页没有纸舌头）、玩法提示、正文；有转盘写 `dial: '转动雏菊 ↻'`。**页数 = `STORY.length - 1`**。plan.py 用正则 `{ title: '…', tab:` 读章节名，保持这个写法 |
| `PAGE` | 每页书页底色 `{a, b, line, star, deco, ink}` |
| `VOICES` | 合成说话声 `{角色键: {f, type, lp, gap, spread, vol}}`（网页里点角色时的叽叽声） |
| `pageDeco(g, s, side, rnd)` | 书页底纹装饰 |
| `cover()` / `backCover()` | 返回封面/封底 canvas（封面图 key 一般是 `cover`） |
| `ART[s]()` | 画第 s 页三层纸雕的 canvas：`return { layers: [B, M, F], an }`，`B/M/F = layerCanvas(LAY.back/mid/front)`，`an` 存锚点坐标给 SPREADS 用 |
| `SPREADS[s](sp, A)` | 第 s 页的物件、机关、互动和 `sp.update`（见下） |
| `DETAILS` | `{s: (sp, A) => …}` 额外细节，可为空对象 |
| `storyExtras()` | 额外桌面物件，可为空函数 |
| `makeBeds()` / `bedLevel(i)` | 每页环境底噪（`SFX.bed({...})` 或 null）和音量 |
| `demoScript(W8, S)` | 自动演示脚本（async）：`goTo(s)`、`poke(sp, m, line)`、`await pull(sp, 1, dur)`、`sp.spin = -9`、`await W8(sec)` |
| `filmShots()` / `filmSegs()` / `filmActs()` | 无配音的 30 秒短片：镜头关键帧 `K(t, tx,ty,tz, az,pol,dist)`、章节字幕段、`[t, fn]` 动作 |
| `speaker(s, role, sp)` | 配音成片：第 s 页某个角色（配音剧本里的角色名）的台词气泡挂在哪个物件上；返回 null 就显示成字幕 |
| `FILM_HOOKS` | `{名字(sp, act){…}}`：cues.json 里 `{"do":"call","fn":"名字"}` 调用的本书专用动作 |

## SPREADS[s](sp, A) 里常用的

```js
const [Bk, Md, Fr] = sp.layers, an = A.an, fw = Fr.cw, fh = Fr.ch;   // 层的画布宽高（像素坐标系，y 向下）
sp.hood = piece(Fr, 'hoodWalk', fw * .6, fh * .995, fh * .8, { dz: .012 });  // 图 key, 底边中点 x/y, 高度 px；dz 前后错开防穿插
sp.taps = [{ m: sp.mom, say: ['……', '……'], snd: 'mom' }, { m: sp.hen, act: () => { … } }];  // 点击说话 / 点击小动作
sp.update = (dt, t) => { const k = U.smooth(sp.p); sp.hood.position.x = U.lerp(x0, x1, k); hop(sp.mom, dt); };
sp.onPull = on => { … };                     // 纸舌头拉到底 / 推回
hiddenStar(sp, Bk, x, y, 48);                // 每页一颗
```

- 状态：`sp.p` 当前拉动进度（平滑），`sp.pT` 目标；`sp.alpha` 本页打开角度（`> Math.PI * .9` 视为完全打开）。
- 定时：`after(sp, sec, fn)` 按模拟时间延后执行（翻页会清空队列，成片里也落在正确的帧上）。**不要用 setTimeout**。
- 随机：只用 `Math.random()`（成片模式下被固定种子替换）或 `U.mulberry32(seed)`。
- 角色动起来：`startHop(m)` / `hop(m, dt)` 弹跳；`burstAt(m, {...})` 火花；`say(m, text)` 气泡；`voice('girl')` 叽叽声。
- 机关：`makeDial(sp, 'daisy', x, z, size)` + 在 update 里 `dialStep(sp, dt)`；`clipX(mesh, panel, x, keepLeft)` 遮挡登场；`hanger(ly, px, pyTop, lenPx, key, hPx)` 挂饰；`hotspot(ly, px, py, w, h)` 画在背景里的可点区域。
- 光：`glow(ly, px, py, size, color, opacity)`、`warmLight(ly, px, py, color, dist)`、`twinkles(ly, n, seed)`、`smoke(ly, px, py, o)`、`emit/burst(parent, x, y, z, o)`；颜色乘 `hot(hex, k)` 才会泛光。
- 例子 story.js 里自带、可以整段复制的小工具：`motes`（飘浮光点）、`butterflies`、`trailOf`（拖尾）、`fallingLeaves`、`sunHalo`、`daySky`、`puffCloud`、`hills`、`wallpaperSheet`、`floorStrip`、`bunting`、`meadowStrip`。
- 画布绘制（ART 里）：`place(g, key, cx, by, h)` 把素材画进层、`skySheet`、`scallopTop`、`starField`、`grassStrip`、`moon`、`grain`、`fibres`。
- 声音：`SFX.tone({f, f2, dur, vol, type, lp, delay})`、`SFX.noise({type, f, f2, dur, vol, q, delay})`、`chime([f…])`、`whoosh(v)`、`chirp()`、`tick(f, v)`。

## 成片相关

- 配音成片完全由 `film/plan.json` 驱动（plan.py 生成），动作只有：`turn` · `pull {s,dur,to}` · `spin {s,v}` · `poke {s,key,line}`（key 支持 `'daisies.0'` 路径）· `say {s,role,text,life}` · `call {s,fn}`。
- 有 plan 时，story 里自发的 `say()` 和 `voice()` 自动静音（只显示配音那一句），机关自带的音效照常。
- 想让某个机关在成片里可调用：把它写成 `sp` 上的字段/方法（如 `sp.toggleWard`），再在 `FILM_HOOKS` 里包一层。

## 自检

`python3 tools/build.py BOOK_DIR` → `python3 tools/shoot.py BOOK_DIR --phone`，逐张看截图：素材光晕、物件悬空、角色被场景挡住、气泡溢出、层级错乱、手机竖屏正文卡片。浏览器控制台不能有报错（shoot.py 会打印 page errors）。
