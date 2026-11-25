# -*- coding: utf-8 -*-
"""content/*.yaml + data/*.json -> assets/data.js

站点是纯静态的，双击 index.html 就能看；所以数据以 `window.LXH = {...}` 的形式
落成一个 JS 文件，而不是运行时 fetch JSON（file:// 下 fetch 会被浏览器拦掉）。

用法：
    python tools/build_content.py            # 生成
    python tools/build_content.py --check    # 只检查生成结果是否与仓库里的 data.js 一致（CI 用）
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
DATA = ROOT / "data"
OUT = ROOT / "assets" / "data.js"


def load_yaml(path: pathlib.Path):
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_json(path: pathlib.Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def build_stats(site, derived):
    """把 site.yaml 里的 stats 解析成页面用的 {n, l, s}。

    from: 指向 derived.json 的字段，会自动算数字；value: 是手写的固定值。
    """
    posts = derived["posts"]
    images = derived["images"]
    auto = {
        "posts_total": (str(posts["total"]), f"电影官博 {posts['film2']} + 小黑官微 {posts['cat']}"),
        "images_total": (str(images["total"]), f"luoxiaohei2 {images['film2']} · luoxiaoheicat {images['cat']}"),
        "episodes": (str(derived["episodes"]), ""),
        "chapters": (str(derived["chapters"]), ""),
    }
    out = []
    for item in site["stats"]:
        key = item.get("from")
        if key:
            if key not in auto:
                raise SystemExit(f"site.yaml: 未知的 from 字段 {key}")
            n, note = auto[key]
        else:
            n, note = str(item["value"]), ""
        out.append({"n": n, "l": item["label"], "s": item.get("note") or note})
    return out


def build_characters(derived):
    index = load_yaml(CONTENT / "characters" / "index.yaml")["order"]
    mentions = derived["mentions"]
    chars, seen = [], set()
    for key in index:
        path = CONTENT / "characters" / f"{key}.yaml"
        if not path.exists():
            raise SystemExit(f"characters/index.yaml 里的 {key} 没有对应的 yaml")
        c = load_yaml(path)
        seen.add(key)
        chars.append({
            "key": key,
            "name": c["name"],
            "en": c.get("en", ""),
            "role": c.get("role", ""),
            "faction": c.get("faction", ""),
            "color": c.get("color", "#2f6f8a"),
            "kw": c.get("kw") or [],
            "desc": c.get("desc", ""),
            "tags": c.get("tags") or [],
            "cv": c.get("cv", "—"),
            "debut": c.get("debut", ""),
            "quote": c.get("quote", ""),
            "posts": mentions.get(key, 0),
            "avatar": f"assets/avatars/{key}.jpg",
        })
    extra = {p.stem for p in (CONTENT / "characters").glob("*.yaml")} - seen - {"index"}
    if extra:
        raise SystemExit(f"这些角色文件没写进 index.yaml：{', '.join(sorted(extra))}")
    return chars


def build_relations(chars):
    keys = {c["key"] for c in chars}
    rels = []
    for r in load_yaml(CONTENT / "relations.yaml")["relations"]:
        a, b = r["from"], r["to"]
        if a not in keys or b not in keys:
            raise SystemExit(f"relations.yaml: {a} - {b} 里有角色不存在")
        rels.append([a, b, r["label"]])
    return rels


def build():
    site = load_yaml(CONTENT / "site.yaml")
    derived = load_json(DATA / "derived.json")
    series = load_json(DATA / "series.json")

    meta = dict(site["meta"])
    meta["intro"] = meta["intro"].format(
        posts_total=f"{derived['posts']['total']:,}".replace(",", ""),
        images_total=f"{derived['images']['total']:,}".replace(",", ""),
    )

    chars = build_characters(derived)
    comic_cfg = load_yaml(CONTENT / "comic.yaml")
    comic = {
        "start": comic_cfg["start"],
        "latest": comic_cfg["latest"],
        "total": comic_cfg.get("total", len(series["chapters"])),
        "rhythm": comic_cfg.get("rhythm", ""),
        "arcs": comic_cfg["arcs"],
        "chapters": series["chapters"],
    }

    films = load_yaml(CONTENT / "films" / "film1.yaml"), load_yaml(CONTENT / "films" / "film2.yaml")

    return {
        "meta": meta,
        "stats": build_stats(site, derived),
        "works": load_yaml(CONTENT / "works.yaml")["works"],
        "timeline": load_yaml(CONTENT / "timeline" / "work.yaml")["events"],
        "story": load_yaml(CONTENT / "timeline" / "story.yaml")["events"],
        "characters": chars,
        "relations": build_relations(chars),
        "films": {"film1": films[0], "film2": films[1]},
        "designs": [[d["img"], d["title"], d["date"], d["text"], d["link"]]
                    for d in load_yaml(CONTENT / "designs.yaml")["designs"]],
        "extras": load_yaml(CONTENT / "extras.yaml")["extras"],
        "comic": comic,
        "episodes": series["episodes"],
    }


def render(data) -> str:
    body = json.dumps(data, ensure_ascii=False, indent=1)
    return f"window.LXH = {body};\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="只校验 data.js 是否为最新，不写文件")
    args = ap.parse_args()

    text = render(build())
    if args.check:
        old = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if old != text:
            print("✗ assets/data.js 与 content/ 不一致，请运行 `make build` 并提交", file=sys.stderr)
            return 1
        print("✓ data.js 已是最新")
        return 0

    OUT.write_text(text, encoding="utf-8")
    print(f"✓ 写入 {OUT.relative_to(ROOT)}  ({len(text.encode('utf-8')) / 1024:.1f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
