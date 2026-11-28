# -*- coding: utf-8 -*-
"""内容体检：YAML 结构、引用完整性、枚举取值、数据与归档是否对得上。

CI 里跑 `python tools/validate.py`；本地 `make check` = 校验 + 生成物是否最新。
发现问题会逐条打印并以退出码 1 结束。
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
DATA = ROOT / "data"

WORK_KINDS = {"tv", "film1", "film2", "comic", "extra", "book"}
EXTRA_KINDS = {"动画", "MV", "漫画"}
LINK_RE = re.compile(r"^https?://")

errors: list[str] = []


def err(msg):
    errors.append(msg)


def load(path):
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        err(f"{path.relative_to(ROOT)} YAML 解析失败：{e}")
        return {}


def asset_ok(path_str, where):
    """img 字段可以是 assets/img/xxx.jpg 这样的路径，也可以只是短名（设定稿）。"""
    if not path_str:
        return
    candidates = [ROOT / path_str]
    if "/" not in path_str:
        candidates.append(ROOT / "assets" / "img" / f"{path_str}.jpg")
    if not any(c.exists() for c in candidates):
        err(f"{where} 引用的文件不存在：{path_str}")


def main():
    # ---------- 站点 ----------
    site = load(CONTENT / "site.yaml")
    meta = site.get("meta", {})
    for k in ("title", "en", "sub", "intro"):
        if not meta.get(k):
            err(f"content/site.yaml meta.{k} 为空")
    stats = site.get("stats", [])
    if len(stats) != 6:
        err(f"content/site.yaml stats 应 6 条，实际 {len(stats)}")
    for s in stats:
        if not s.get("label") and not s.get("l"):
            err(f"content/site.yaml stats 条目缺标签：{s}")
        if "from" in s and "value" in s:
            err(f"content/site.yaml stats 同时写了 from 和 value：{s}")

    # ---------- 作品 ----------
    works = load(CONTENT / "works.yaml").get("works", [])
    if len(works) != 4:
        err(f"content/works.yaml 应 4 条，实际 {len(works)}")
    for w in works:
        asset_ok(w.get("img"), "works")

    # ---------- 时间线 ----------
    work_events = load(CONTENT / "timeline" / "work.yaml").get("events", [])
    story_events = load(CONTENT / "timeline" / "story.yaml").get("events", [])
    for e in work_events:
        if e.get("work") not in WORK_KINDS:
            err(f"timeline/work.yaml 未知 work 取值 {e.get('work')!r}：{e.get('title')}")
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(e.get("date", ""))):
            err(f"timeline/work.yaml 日期格式不对：{e.get('date')!r} {e.get('title')}")
    if len({e.get("sort", e.get("date")) for e in work_events}) != len(work_events):
        err("timeline/work.yaml 存在重复的 sort 键")
    if len({e.get("sort", e.get("date")) for e in story_events}) != len(story_events):
        err("timeline/story.yaml 存在重复的 sort 键")

    # ---------- 人物 ----------
    idx = load(CONTENT / "characters" / "index.yaml") or {}
    order = idx.get("order", [])
    if len(order) != len(set(order)):
        err("content/characters/index.yaml 的 order 有重复 key")
    chars = {}
    for f in sorted((CONTENT / "characters").glob("*.yaml")):
        if f.stem == "index":
            continue
        c = load(f) or {}
        key = f.stem
        if c.get("key") and c["key"] != key:
            err(f"{f.name} 里写的 key（{c['key']}）与文件名不一致")
        for field in ("name", "en", "role", "faction", "desc"):
            if not c.get(field):
                err(f"content/characters/{f.name} 缺字段 {field}")
        if c.get("posts") is not None:
            err(f"content/characters/{f.name} 不要手写 posts，改由 data/derived.json 的 mentions 自动填")
        if c.get("species") and c["species"] not in ("妖精", "人类"):
            err(f"content/characters/{f.name} 的 species 只能是 妖精 / 人类，现在是 {c['species']!r}")
        if c.get("height") and c["height"] != "—" and not re.fullmatch(r"\d+cm", str(c["height"])):
            err(f"content/characters/{f.name} 的 height 要写成 174cm 这种，或 '—'")
        if c.get("age") and not re.search(r"岁", str(c["age"])):
            err(f"content/characters/{f.name} 的 age 要带「岁」，例如 197 岁 / 800 岁+")
        if c.get("official") and not c.get("source"):
            err(f"content/characters/{f.name} 写了 official（设定集原文）就要写 source（出处页码）")
        asset_ok(c.get("avatar"), f"characters/{f.name}")
        chars[key] = c
    missing = [k for k in order if k not in chars]
    extra = [k for k in chars if k not in order]
    if missing:
        err(f"index.yaml 里的 key 找不到对应文件：{missing}")
    if extra:
        err(f"有角色文件没写进 index.yaml：{extra}")

    # ---------- 关系 ----------
    rels = load(CONTENT / "relations.yaml").get("relations", [])
    for r in rels:
        for end in ("from", "to"):
            if r.get(end) not in chars:
                err(f"relations.yaml 引用了未知角色 {r.get(end)!r}：{r}")
        if r.get("from") == r.get("to"):
            err(f"relations.yaml 出现自环：{r}")
        if not r.get("label"):
            err(f"relations.yaml 缺 label：{r}")

    # ---------- 电影 ----------
    for name in ("film1", "film2"):
        f = load(CONTENT / "films" / f"{name}.yaml") or {}
        for field in ("title", "date", "synopsis", "director"):
            if not f.get(field):
                err(f"content/films/{name}.yaml 缺 {field}")
        for key in ("hero", "wide"):
            asset_ok(f.get(key), f"films/{name}")
        for s in f.get("stills", []):
            asset_ok(s.get("img", s) if isinstance(s, dict) else s, f"films/{name} stills")
        if not f.get("milestones"):
            err(f"content/films/{name}.yaml 没有 milestones")

    # ---------- 设定稿 / 番外 ----------
    for d in load(CONTENT / "designs.yaml").get("designs", []):
        asset_ok(d.get("img"), "designs")
        if d.get("link") and not LINK_RE.match(d["link"]):
            err(f"designs.yaml link 不是 http(s)：{d.get('link')}")

    extras = load(CONTENT / "extras.yaml").get("extras", [])
    for e in extras:
        if e.get("kind") not in EXTRA_KINDS:
            err(f"extras.yaml 未知 kind {e.get('kind')!r}：{e.get('title')}")
        if e.get("link") and not LINK_RE.match(e["link"]):
            err(f"extras.yaml link 不是 http(s)：{e.get('title')}")
        asset_ok(e.get("img"), "extras")

    # ---------- 漫画 ----------
    comic = load(CONTENT / "comic.yaml") or {}
    arcs = comic.get("arcs", [])
    if len(arcs) != 4:
        err(f"content/comic.yaml 应 4 幕，实际 {len(arcs)}")

    # ---------- 二十四节气 ----------
    solar = load(CONTENT / "solar.yaml") or {}
    terms = solar.get("terms", [])
    if len(terms) != 24:
        err(f"content/solar.yaml 应 24 个节气，实际 {len(terms)}")
    names = [t.get("name") for t in terms]
    if len(set(names)) != len(names):
        err("solar.yaml 节气名有重复")
    for i, t in enumerate(terms, 1):
        if t.get("no") != i:
            err(f"solar.yaml 第 {i} 项 no 应为 {i}，实际 {t.get('no')}")
        if not t.get("img"):
            err(f"solar.yaml {t.get('name')} 缺 img")
        else:
            asset_ok(t["img"], "solar")
        if not t.get("date"):
            err(f"solar.yaml {t.get('name')} 缺 date")
        if t.get("link") and not str(t["link"]).startswith("http"):
            err(f"solar.yaml {t.get('name')} link 不是 http(s)")

    # ---------- 六大系能力体系 ----------
    powers = load(CONTENT / "powers.yaml") or {}
    series = powers.get("series", [])
    want = {"御灵系", "锁御系", "造物系", "生灵系", "心灵系", "空间系"}
    got = {s.get("name") for s in series}
    if got != want:
        err(f"content/powers.yaml 六大系应为 {sorted(want)}，实际 {sorted(got)}")
    keys = [s.get("key") for s in series]
    if len(set(keys)) != len(keys):
        err("powers.yaml 系列 key 有重复")
    char_names = set()
    for f in sorted((CONTENT / "characters").glob("*.yaml")):
        if f.name == "index.yaml":
            continue
        ch = load(f) or {}
        if ch.get("name"):
            char_names.add(ch["name"])
    for s in series:
        subs = s.get("subs") or []
        if not subs:
            err(f"powers.yaml {s.get('name')} 没有附属系")
        for sub in subs:
            if not sub.get("name"):
                err(f"powers.yaml {s.get('name')} 有附属系缺 name")
            if not sub.get("desc"):
                err(f"powers.yaml {sub.get('name')} 缺 desc")
            # 代表角色里可能有设定集没收录的人物（如泽宇、白游），只做去重检查
            who = sub.get("who") or []
            if len(set(who)) != len(who):
                err(f"powers.yaml {sub.get('name')} 代表角色有重复")

    # ---------- 数据 ----------
    derived = json.loads((DATA / "derived.json").read_text(encoding="utf-8"))
    series = json.loads((DATA / "series.json").read_text(encoding="utf-8"))
    if derived["posts"]["total"] != derived["posts"]["film2"] + derived["posts"]["cat"]:
        err("derived.json posts.total 与两个账号之和不符")
    if derived["images"]["total"] != derived["images"]["film2"] + derived["images"]["cat"]:
        err("derived.json images.total 与两个账号之和不符")
    if derived["episodes"] != len(series["episodes"]):
        err("derived.json episodes 与 series.json 不一致")
    if derived["chapters"] != len(series["chapters"]):
        err("derived.json chapters 与 series.json 不一致")
    mentions = derived.get("mentions", {})
    for key in chars:
        if key not in mentions:
            err(f"derived.json mentions 缺角色 {key}")
    if arcs:
        last = series["chapters"][-1]["no"]
        if arcs[-1][2] != last:
            err(f"comic.yaml 最后一幕到第 {arcs[-1][2]} 话，实际最后一话是第 {last} 话")
        if [a[1] for a in arcs] != sorted(a[1] for a in arcs):
            err("comic.yaml 各幕的起始话数不是递增的")

    # ---------- 生成物 ----------
    gen = ROOT / "assets" / "data.js"
    if not gen.exists():
        err("assets/data.js 不存在，先跑 make build")
    else:
        raw = gen.read_text(encoding="utf-8")
        if "window.LXH" not in raw:
            err("assets/data.js 不是 window.LXH 形式")
        else:
            try:
                payload = json.loads(raw.split("window.LXH = ", 1)[1].rstrip().rstrip(";"))
            except json.JSONDecodeError as e:
                err(f"assets/data.js 不是合法 JSON：{e}")
                payload = {}
            if payload:
                if len(payload.get("characters", [])) != len(order):
                    err("data.js 人物数与 content/characters/index.yaml 不一致")
                if len(payload.get("timeline", [])) != len(work_events):
                    err("data.js 时间线条数与 timeline/work.yaml 不一致")
                films = payload.get("films", {})
                films = films.values() if isinstance(films, dict) else films
                for f in films:
                    asset_ok(f.get("hero"), "data.js films")
                    for s in f.get("stills", []):
                        asset_ok(s.get("img") if isinstance(s, dict) else s, "data.js films stills")
                for e in payload.get("extras", []):
                    asset_ok(e.get("img"), "data.js extras")

    if errors:
        print(f"✗ 发现 {len(errors)} 个问题：")
        for e in errors:
            print("  -", e)
        return 1
    print(f"✓ 内容体检通过：{len(chars)} 角色 / {len(rels)} 条关系 / "
          f"{len(work_events)} 条作品线 / {len(story_events)} 条剧情线 / {len(extras)} 条番外")
    return 0


if __name__ == "__main__":
    sys.exit(main())
