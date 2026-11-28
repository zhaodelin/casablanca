# 罗小黑战记 · 设定集与年表

一个从官方微博归档整理出来的**非官方**资料站：人物设定集、人物关系网、两部电影、番外故事、
漫画《蓝溪镇》、二十四节气图集，以及一条把 2011 到 2026 排在一起的时间线。

- 数据来源：微博 [@电影罗小黑战记2](https://weibo.com/u/3175924975) 4974 条、[@罗小黑CAT](https://weibo.com/u/2019071187) 1653 条，合计 6627 条微博、5609 张图片（抓取于 2026-11-25）。
- 纯静态：一个 `index.html`、一份 `assets/data.js`、一套图片，没有构建期依赖，`file://` 双击也能看。
- 内容与代码分离：文字在 `content/`，数字在 `data/`，脚本把它们编译成 `assets/data.js`。
- 角色卡的种族 / 年龄 / 身高 / 能力 / 设定集原文，来自官方设定集《罗小黑战记大电影》的 11 页人物扫描（`归档图片整理/角色档案/`），已识别 13 位角色。
- 页面角落里有一只溜达的小黑：鼠标（或手指）按住它可以拖到任意位置，松手后继续在视口内走动，拖到边缘会被夹住。它只在猫身上接收指针事件，不挡页面其它点击。

## 本地打开

直接双击 `index.html`，或者：

```bash
python -m http.server 8080     # 然后访问 http://localhost:8080
```

## 改内容

```bash
pip install -r requirements.txt
python tools/build_content.py  # content/ + data/ → assets/data.js
python tools/validate.py       # 体检
```

角色卡、关系、年表、电影、番外、漫画分别怎么改，见 **[docs/CONTENT.md](docs/CONTENT.md)**。

## 目录

```
index.html              页面骨架（只有结构，没有内容）
assets/
  data.js               生成物：window.LXH = {...}（勿手改）
  css/style.css         样式
  js/app.js             渲染逻辑
  img/                  30 张站点图（海报、剧照、设定稿、番外缩略）
  avatars/              26 张角色头像
content/                文字内容（YAML）
data/                   数字（从微博归档算出来的）+ 图片配方
tools/                  生成、校验、重建脚本
docs/CONTENT.md         维护指南
```

## 数据口径

| 项 | 数值 | 说明 |
| --- | --- | --- |
| 电影官博 | 4974 条 | 接口上限 250 页；账号显示 5107 条，差额是删除/不可见 |
| 罗小黑CAT | 1653 条 | 显示 1655 条，差 2 条为删除 |
| 图片 | 5609 张 | 电影官博 2334 + 小黑官微 3275 |
| 蓝溪镇 | 139 话 | 2018-09-27 开更 → 2026-02-28「再会」 |
| TV | 45 集 | 2011-04-08 → 2026-11-24，仍在更新 |

`data/derived.json` 与 `data/series.json` 由 `tools/sync_archive.py` 从微博归档重建；
归档体积约 5.4 GB，不在仓库里。没有归档时沿用仓库中的版本即可。

## 图片

`data/media.yaml` 记录每张图的来源微博图片与裁切配方，`tools/build_media.py` 可据此重建
（需要归档目录，默认取仓库的父目录，可用 `ARCHIVES=` 指定）。默认跳过已存在的文件，
只有 `--force` 才覆盖。

## 校验与发布

- CI：`.github/workflows/ci.yml` 在每次 push/PR 跑 `validate.py` 与 `build_content.py --check`。
- Pages：走分支部署（`main` / 根目录），推上去即发布；`.nojekyll` 让 Pages 跳过 Jekyll。
  线上地址：https://zhaodelin.github.io/casablanca/

## 版权

角色与美术素材版权归《罗小黑战记》原作方（木头 / 寒木春华）所有，这里仅作资料整理与展示；
文字年表由归档微博整理而来，引用处标注了原帖日期。本站与官方无关。
