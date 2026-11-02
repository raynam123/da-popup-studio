# 配音音色速查 · CosyVoice（阿里云百炼）

模型 `cosyvoice-v3-flash` 的系统音色（2026-10 核对官方音色列表：https://docs.bailian.console.aliyun.com/zh/model-studio/cosyvoice-voice-list ）。
用户自己复刻的音色用 `cosyvoice-v3.5-flash`，voice 填复刻得到的 voice_id。
参数：`speech_rate` 0.5–2.0 · `pitch_rate` 0.5–2.0 · `volume` 0–100 · `instruction` 只有标「情感」的音色支持，可选情感 neutral / fearful / angry / sad / surprised / happy / disgusted，写法 `"你说话的情感是happy。"`。

## 童话配音常用

| 用途 | voice | 名称 | 特点 | 情感 |
|---|---|---|---|---|
| **旁白（首选）** | `longmiao_v3` | 龙妙 | 25–30 女，有声书，抑扬顿挫 | |
| 旁白 | `longyuan_v3` | 龙媛 | 35–40 女，温暖治愈 | |
| 旁白 | `longyue_v3` | 龙悦 | 30–35 女，温暖磁性 | |
| 旁白（男） | `longxiu_v3` | 龙修 | 25–35 男，博才说书 | |
| 旁白（男） | `longsanshu_v3` | 龙三叔 | 25–45 男，沉稳质感 | |
| 小女孩 | `longhuhu_v3` | 龙呼呼 | 6–10 女童，天真烂漫 | ✓ |
| 小女孩 | `longxian_v3` | 龙仙 | 12 女，豪放可爱 | |
| 小女孩 | `longling_v3` | 龙铃 | 10 女，稚气呆板 | |
| 小男孩 | `longjielidou_v3` | 龙杰力豆 | 10 男，阳光顽皮 | |
| 小男孩 | `longniuniu_v3` | 龙牛牛 | 6–15 男童，阳光 | |
| 小精灵/小动物 | `longpaopao_v3` | 龙泡泡 | 6–15，飞天泡泡音 | |
| 小精灵/群声 | `longshanshan_v3` | 龙闪闪 | 6–15，戏剧化童声 | |
| 妈妈/温柔女性 | `longyuan_v3` / `longyan_v3` | 龙媛 / 龙颜 | 温暖治愈 / 温暖春风 | |
| 年轻女性/公主 | `longwanjun_v3` / `longxing_v3` | 龙婉君 / 龙星 | 细腻柔声 / 温婉邻家 | |
| 活泼大姐姐 | `longanhuan_v3` | 龙安欢 | 20–30 女，欢脱元气 | ✓ |
| 爸爸/樵夫/勇士 | `longfei_v3` | 龙飞 | 30–35 男，热血磁性 | |
| 年轻男性/王子 | `longanyang` / `longyichen_v3` | 龙安洋 / 龙逸尘 | 阳光大男孩 / 洒脱活力 | ✓ / |
| 反派（压低音高、放慢） | `longsanshu_v3` / `longtian_v3` | 龙三叔 / 龙天 | 沉稳 / 磁性理智 | |
| 老爷爷 | `longlaobo_v3` | 龙老伯 | 60+ 男，沧桑 | |
| 老奶奶 | `longlaoyi_v3` | 龙老姨 | 60+ 女，烟火从容（唯一的老年女声） | |
| 机器人/玩具 | `longjiqi_v3` | 龙机器 | 呆萌机器人 | |
| 猴子/调皮角色 | `longhouge_v3` | 龙猴哥 | 经典猴哥 | |

## 选角规则

- 旁白一个声音贯穿全片；主角用童声；同一页里对话的两个角色，音色性别或年龄要拉开。
- 反派：低音高（`pitch_rate` 0.88–0.94）+ 慢语速（0.9 左右），台词写得滑稽，不靠声音吓人。
- 群体角色（一群纸鹤、小动物们）：用戏剧化童声，`pitch_rate` 1.05–1.1。
- 只说一两句的配角可以复用旁白之外的声音，但同一页不要出现两个相同音色的角色。
- 每个角色在 `dub.json` 里写 `why`（为什么选）和 `note`（2 个备选），方便用户自己换。
- 单句可以覆盖：`rate` / `pitch` / `vol` / `instruction` / `gap`（本句之后的停顿）。

## 剧本规则

- 编号 `S0-01` 起：S0 = 封面开场（1 句旁白），S1…Sn = 每个跨页，每页 4–6 句。
- 每句 ≤ 30 字，口语、短句；旁白交代动作，角色说情绪。
- 主机关一定对应一句台词（cue 挂在这句上），让画面变化和声音同时发生。
- 5 页总长 1.5–2.5 分钟：约 22–30 句。
