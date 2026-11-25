# -*- coding: utf-8 -*-
"""从 @罗小黑CAT 的归档里抽 TV 集数与《蓝溪镇》话数，写入 data/series.json。

小节由微博正文里「第 X 集 / 第 X 话 + 标题」的写法识别，重复的只留最早那条。
时间以归档里的 created_at 为准。

用法：
    ARCHIVES=.. python tools/extract_series.py
"""
from __future__ import annotations

import json
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ARCHIVES = pathlib.Path(os.environ.get("ARCHIVES", ROOT.parent))
CAT_POSTS = ARCHIVES / "luoxiaoheicat" / "data" / "posts.json"
OUT = ROOT / "data" / "series.json"

CN = {"零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}

CHAP_RE = re.compile(r"第\s*([0-9一二三四五六七八九十百零两]+)\s*话\s*[~～\-—]*\s*([^\s~～#，。！]{1,12})")
EP_RE = re.compile(r"第\s*([0-9一二三四五六七八九十百零两]+)\s*集\s*([^\s~～◆#，。！]{0,12})")


def cn2int(s: str) -> int:
    if s.isdigit():
        return int(s)
    total = section = num = 0
    for ch in s:
        if ch == "百":
            total += (num or 1) * 100
            num = 0
        elif ch == "十":
            section += (num or 1) * 10
            num = 0
        elif ch in CN:
            num = CN[ch]
    return total + section + num


def clean_chapter_title(t: str) -> str:
    """微博正文里截出来的「标题」常常是一句口语，长度和语气词都不可靠，噪声就丢掉。"""
    bad = ("来咯", "明天见", "开更啦", "老君的番外故事开更啦")
    if (not t) or t in bad or len(t) > 6 or any(x in t for x in "啦咯哦喵了见的"):
        return ""
    return t


def clean_episode_title(t: str) -> str:
    if (not t) or len(t) > 10 or any(x in t for x in ("啦", "咯", "哦", "的时候", "开始就是")):
        return ""
    return t


def compute(posts):
    def text(p):
        return " ".join((p.get("text") or "").split())

    chapters, episodes = {}, {}
    for p in sorted(posts, key=lambda x: x["created_at"]):
        t = text(p)
        if "蓝溪镇" in t or "君清篇" in t:
            m = CHAP_RE.search(t)
            if m:
                no = cn2int(m.group(1))
                if no not in chapters:
                    chapters[no] = {"no": no, "title": clean_chapter_title(m.group(2).strip("~～ -—")),
                                    "date": p["created_at"][:10], "mblogid": p["mblogid"],
                                    "likes": p.get("likes", 0)}
        if not ("蓝溪镇" in t and "漫画" in t):
            m = EP_RE.search(t)
            if m:
                no = cn2int(m.group(1))
                if 1 <= no <= 60 and no not in episodes:
                    episodes[no] = {"no": no, "title": clean_episode_title(m.group(2).strip("~～ 　")),
                                    "date": p["created_at"][:10], "likes": p.get("likes", 0)}
    return {
        "episodes": [episodes[k] for k in sorted(episodes)],
        "chapters": [chapters[k] for k in sorted(chapters)],
    }


def main():
    if not CAT_POSTS.exists():
        print(f"找不到归档：{CAT_POSTS}（设置 ARCHIVES 指向包含 luoxiaoheicat 的目录）", file=sys.stderr)
        return 1
    posts = json.loads(CAT_POSTS.read_text(encoding="utf-8"))
    data = compute(posts)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"✓ {OUT.relative_to(ROOT)}：{len(data['episodes'])} 集 / {len(data['chapters'])} 话")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
