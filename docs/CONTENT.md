# 内容维护指南

站点是一张静态页：`index.html` + `assets/css` + `assets/js/app.js` 只负责渲染，
所有**文字内容**来自 `content/` 下的 YAML，所有**数字**来自 `data/`，两者经
`tools/build_content.py` 合并成 `assets/data.js`（`window.LXH = {...}`）。

```
content/                  ← 你日常改这里
  site.yaml               站点标题、开场白、首页六个统计
  works.yaml              四条作品线（TV / 电影1 / 电影2 / 漫画）
  timeline/
    work.yaml             作品与现实的年表（38 条）
    story.yaml            剧情年表（12 条，片内时间）
  characters/
    index.yaml            人物卡展示顺序
    <key>.yaml            一张角色卡一个文件（20 个）
  relations.yaml          关系网连线
  films/film1.yaml        电影 1 详情（里程碑、配音、剧照）
  films/film2.yaml        电影 2 详情
  designs.yaml            设定稿卡片
  extras.yaml             番外（动画/MV/漫画）
  comic.yaml              蓝溪镇的四幕结构
data/
  derived.json            从微博归档算出的数字（微博数、图片数、提及数）
  series.json             每集 / 每话的标题与日期
  media.yaml              图片与头像的裁切配方
tools/
  build_content.py        content/ + data/ → assets/data.js
  validate.py             内容体检（CI 跑它）
  build_media.py          按配方重建图片（需要归档）
  sync_archive.py         从归档重建 data/derived.json + series.json
  extract_series.py       从归档抽每集/每话标题
assets/                   产物：data.js、img/、avatars/、css/、js/
```

## 1. 改文字

改完任何一个 YAML，跑一次：

```bash
python tools/build_content.py      # 或 make build
```

再刷新页面即可。`assets/data.js` 是生成物，**不要手改**。

### 角色卡（`content/characters/<key>.yaml`）

```yaml
name: 小黑            # 显示名
en: HEI               # 英文副标题
role: 主角 · 猫妖      # 卡片左上角的小标签
faction: 无限门下      # 阵营（也用于卡片底部的分类）
color: '#2f6f8f'      # 关系网与卡片强调色
kw:                   # 微博里怎么称呼他（算提及数用，可写多个）
  - 小黑
desc: 一段 60–120 字的介绍……
tags: [灵质空间, 领域]  # 弹窗里的标签，2–4 个
cv: 山新 / 花泽香菜     # 不确认就写 —（官微未公布），不要编
debut: 2011-04-08 · 第一集
quote: 一句台词或代表文案（可留空）
```

- 文件名就是 `key`，**新增角色要同时**：建 `<key>.yaml`、放进 `characters/index.yaml` 的
  `order`、放一张 `assets/avatars/<key>.jpg`。
- `posts`（提及数）不要手写，由 `data/derived.json` 的 `mentions` 自动填。

### 关系（`content/relations.yaml`）

```yaml
relations:
  - from: xiaohei
    to: infin
    label: 师徒
```

`label` 会显示在关系线的中点；`from`/`to` 必须是已存在的角色 key。线的粗细按提及数自动算。

### 年表（`content/timeline/`）

`work.yaml` 是「现实里发生的事」：

```yaml
events:
  - date: 2025-07-18          # 显示用
    sort: 2025-07-18          # 排序用，重复会报错
    work: film2               # tv | film1 | film2 | comic | extra | book
    title: 上映
    text: 一句话说明。
```

`story.yaml` 是「剧情里的时间」，`sort` 可以用 `0001`、`0002` 这样的序号：

```yaml
  - date: 很久以前
    sort: "0001"
    title: 妖灵会馆
    text: ……（不超过 60 字最好）
```

### 电影（`content/films/film1.yaml`、`film2.yaml`）

要点：`hero`（竖版海报）、`wide`（世界观的横版图）、`stills`（剧照条）、`milestones`（大事记，
按日期）、`cast`（配音）、`quote`（一句引用）。图片都写 `assets/img/...` 的相对路径。

### 番外 / 设定稿 / 漫画 / 作品线

- `extras.yaml`：`kind` 只能是 `动画`、`MV`、`漫画`；`img` 留空会渲染成排版卡（不出现破图）。
- `designs.yaml`：`img` 可以只写短名（如 `design-infin`），生成时补成 `assets/img/design-infin.jpg`。
- `comic.yaml`：`arcs` 是四幕 `[标题, 起始话, 结束话, 说明]`，最后一幕的结束话必须等于
  `data/series.json` 的最后一话（校验会查）。
- `works.yaml`：四张作品卡，`href` 是页内锚点。

## 2. 数字与归档

首页的「6627 条微博 / 5609 张图片」、每张角色卡的提及数、每集每话的标题，都不是手写的：

- `data/derived.json`：微博数、图片数、时间范围、提及数
- `data/series.json`：45 集 + 139 话的标题与日期

它们由两个微博归档（`luoxiaohei2`、`luoxiaoheicat`，约 5.4 GB，**不在仓库里**）算出：

```bash
ARCHIVES=/path/to/archives python tools/sync_archive.py    # 或者 make sync ARCHIVES=...
ARCHIVES=/path/to/archives python tools/extract_series.py  # 只重抽标题
```

没有归档时别改这两个文件，直接沿用仓库里的版本即可。`sync_archive.py --check` 可以在有归档时
验证它们是否过期。

## 3. 图片

图片是**提交进仓库的成品**，`data/media.yaml` 记录每张图的来源与配方：

```yaml
images:
  - out: assets/img/f2-hero.jpg
    archive: film2                 # film2 | cat
    source: images/2025-06/PwlxujmBP_01.jpg
    crop: [0, 0, 1, 0.72]          # 归一化 [x, y, 宽, 高]
    width: 1400                    # 成品宽度（可放大，用于和历史文件保持一致）
    rotate: -90                    # 可选
avatars:
  - out: assets/avatars/xiaohei.jpg
    archive: cat
    source: images/2011-04/eekMpG_01.jpg
    box: [0.17, 0.335, 0.33, 0.34]
  - out: assets/avatars/mtjj.jpg
    generator: monogram            # 没有可用立绘时的占位：深蓝底 + 一个字
    char: 木
```

```bash
ARCHIVES=/path/to/archives python tools/build_media.py          # 只补缺失的
ARCHIVES=/path/to/archives python tools/build_media.py --force  # 全部重造
```

默认**跳过已存在的文件**，所以在没有归档的机器上也不会把图弄坏。

> 头像成品与 `media.yaml` 里记录的裁切框可能有几个百分点的出入（当初是目视微调的）。
> 换头像时建议先 `--only <key> --force` 单独重造一张，看一眼再提交。

## 4. 体检与发布

```bash
python tools/validate.py              # 内容体检
python tools/build_content.py --check # 生成物是否最新
```

校验会查：YAML 能否解析、角色文件与 `index.yaml` 是否对得上、关系引用的 key 是否存在、
年表 `sort` 是否重复、`work`/`kind` 取值是否合法、图片文件是否真实存在、
`data/derived.json` 与 `data/series.json` 是否自洽、`data.js` 是否与内容同步。

CI（`.github/workflows/ci.yml`）在每次 push 与 PR 上跑这两条；Pages 走**分支部署**
（Settings → Pages：Deploy from a branch，`main` / 根目录），推上去即发布，不需要额外 workflow。
仓库根的 `.nojekyll` 让 Pages 跳过 Jekyll 处理。

## 5. 常见坑

- **改完 YAML 忘了 `make build`**：页面不会变，因为运行时读的是 `assets/data.js`。
- **在 `content/characters/*.yaml` 里手写 `posts`**：校验会报错，删掉即可。
- **章节标题被清空**：`extract_series.py` 会把「来咯」「开始就是暑假了哦喵」这类口语标题丢掉，
  这不是 bug，是刻意的清洗规则（见脚本里的 `clean_chapter_title` / `clean_episode_title`）。
- **直接用 `file://` 双击打开**：可以，数据与图片都是相对路径，不依赖服务器。
