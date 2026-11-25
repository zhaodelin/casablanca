# -*- coding: utf-8 -*-
"""从两个微博归档重建 data/derived.json 与 data/series.json。

derived.json 只放「从归档算出来的事实」：条数、图片数、时间范围、角色提及数、
集数/话数。文案与设定都在 content/，所以没有归档的人也能改内容、跑构建。

用法：
    ARCHIVES=.. python tools/sync_archive.py          # 重建
    ARCHIVES=.. python tools/sync_archive.py --check  # 只比对，不写文件
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys

import yaml

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import extract_series  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
ARCHIVES = pathlib.Path(os.environ.get("ARCHIVES", ROOT.parent))
DATA = ROOT / "data"
DERIVED = DATA / "derived.json"
SERIES = DATA / "series.json"
ARCHIVE_DIRS = {"film2": "luoxiaohei2", "cat": "luoxiaoheicat"}


def load_posts(name):
    p = ARCHIVES / ARCHIVE_DIRS[name] / "data" / "posts.json"
    if not p.exists():
        raise SystemExit(f"找不到归档 posts.json：{p}")
    return json.loads(p.read_text(encoding="utf-8"))


def count_images(name):
    idx = ARCHIVES / ARCHIVE_DIRS[name] / "data" / "image_index.jsonl"
    if not idx.exists():
        return 0
    return sum(1 for line in idx.read_text(encoding="utf-8").splitlines() if line.strip())


def build():
    film2 = load_posts("film2")
    cat = load_posts("cat")
    all_posts = film2 + cat

    mentions = {}
    for f in sorted((ROOT / "content" / "characters").glob("*.yaml")):
        if f.stem == "index":
            continue
        c = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
        kws = c.get("kw") or []
        mentions[f.stem] = sum(1 for p in all_posts if any(k in (p.get("text") or "") for k in kws))

    series = extract_series.compute(cat)
    derived = {
        "_note": "由 tools/sync_archive.py 从两个微博归档重建；没有归档时可手工维护，键名不要改。",
        "posts": {"film2": len(film2), "cat": len(cat), "total": len(all_posts)},
        "images": {"film2": count_images("film2"), "cat": count_images("cat"),
                   "total": count_images("film2") + count_images("cat")},
        "range": {
            "film2": [min(p["created_at"][:10] for p in film2), max(p["created_at"][:10] for p in film2)],
            "cat": [min(p["created_at"][:10] for p in cat), max(p["created_at"][:10] for p in cat)],
        },
        "episodes": len(series["episodes"]),
        "chapters": len(series["chapters"]),
        "mentions": mentions,
    }
    return derived, series


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="只比对，不写文件")
    args = ap.parse_args()

    derived, series = build()
    d_text = json.dumps(derived, ensure_ascii=False, indent=1) + "\n"
    s_text = json.dumps(series, ensure_ascii=False, indent=1) + "\n"

    if args.check:
        ok = True
        for path, text, label in [(DERIVED, d_text, "derived.json"), (SERIES, s_text, "series.json")]:
            old = path.read_text(encoding="utf-8") if path.exists() else ""
            if old != text:
                print(f"✗ {label} 与归档不一致，请运行 `make sync`", file=sys.stderr)
                ok = False
        if ok:
            print("✓ derived.json / series.json 与归档一致")
        return 0 if ok else 1

    DERIVED.write_text(d_text, encoding="utf-8")
    SERIES.write_text(s_text, encoding="utf-8")
    print(f"✓ derived.json：{derived['posts']['total']} 条微博 / {derived['images']['total']} 张图 / "
          f"{len(derived['mentions'])} 个角色")
    print(f"✓ series.json：{derived['episodes']} 集 / {derived['chapters']} 话")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
