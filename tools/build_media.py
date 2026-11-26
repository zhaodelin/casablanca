# -*- coding: utf-8 -*-
"""按 data/media.yaml 的配方，从两个微博归档重新裁切站点用图。

归档目录（luoxiaohei2 / luoxiaoheicat）不在仓库里，体积约 5.4 GB。默认按
    <仓库>/../luoxiaohei2
去找；也可以用环境变量指定：
    ARCHIVES=D:\\weibo python tools/build_media.py

用法：
    python tools/build_media.py            # 全量重建 assets/img 与 assets/avatars
    python tools/build_media.py --only hero
    python tools/build_media.py --check    # 只检查源图是否存在，不写文件
"""
from __future__ import annotations

import argparse
import os
import pathlib

import yaml
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MEDIA = DATA / "media.yaml"
ARCHIVES = pathlib.Path(os.environ.get("ARCHIVES", ROOT.parent))
ARCH_DIR = {"film2": "luoxiaohei2", "cat": "luoxiaoheicat", "chars": "归档图片整理"}
MONO_BG = (31, 56, 100)
MONO_FG = (246, 241, 230)


def source_path(item) -> pathlib.Path:
    return ARCHIVES / ARCH_DIR[item["archive"]] / item["source"]


def crop_box(im: Image.Image, box):
    w, h = im.size
    x, y, cw, ch = box
    return im.crop((int(w * x), int(h * y), int(w * (x + cw)), int(h * (y + ch))))


def center_square(im: Image.Image) -> Image.Image:
    w, h = im.size
    s = min(w, h)
    return im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))


def apply_adjust(im: Image.Image, item) -> Image.Image:
    """adjust: {brightness, contrast, color, sharpness}，用于提亮夜景剧照。"""
    adj = item.get("adjust") or {}
    if adj.get("brightness"):
        im = ImageEnhance.Brightness(im).enhance(adj["brightness"])
    if adj.get("contrast"):
        im = ImageEnhance.Contrast(im).enhance(adj["contrast"])
    if adj.get("color"):
        im = ImageEnhance.Color(im).enhance(adj["color"])
    if adj.get("sharpness"):
        im = ImageEnhance.Sharpness(im).enhance(adj["sharpness"])
    return im


def build_image(item, check=False, force=False):
    src = source_path(item)
    out = ROOT / item["out"]
    if not src.exists():
        return f"缺少源图 {src}"
    if check:
        return None
    if out.exists() and not force:
        return f"{item['out']}  已存在，跳过（--force 可重建）"
    im = Image.open(src)
    if getattr(im, "is_animated", False):
        im.seek(0)
    im = im.convert("RGB")
    if item.get("rotate"):
        im = im.rotate(item["rotate"], expand=True)
    if item.get("crop"):
        im = crop_box(im, item["crop"])
    im = apply_adjust(im, item)
    w, h = im.size
    if item.get("width"):          # 指定成品宽度（可能放大，用于与历史文件保持一致）
        target = int(item["width"])
        im = im.resize((target, max(1, round(h * target / w))), Image.LANCZOS)
    else:
        limit = item.get("max", 1400)
        scale = min(1.0, limit / max(w, h))
        if scale < 1.0:
            im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "JPEG", quality=86, optimize=True, progressive=True)
    return f"{item['out']}  {im.size[0]}×{im.size[1]}  {out.stat().st_size // 1024} KB"


def monogram(char: str, size=512) -> Image.Image:
    im = Image.new("RGB", (size, size), MONO_BG)
    d = ImageDraw.Draw(im)
    font_path = None
    for p in [r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simsun.ttc",
              "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
              "/usr/share/fonts/truetype/noto/NotoSerifCJK-Regular.ttc"]:
        if pathlib.Path(p).exists():
            font_path = p
            break
    try:
        font = ImageFont.truetype(font_path, int(size * 0.42)) if font_path else ImageFont.load_default()
    except OSError:
        font = ImageFont.load_default()
    bbox = d.textbbox((0, 0), char, font=font)
    d.text(((size - (bbox[2] - bbox[0])) / 2 - bbox[0],
            (size - (bbox[3] - bbox[1])) / 2 - bbox[1]), char, font=font, fill=MONO_FG)
    return im


def build_avatar(item, check=False, force=False):
    out = ROOT / item["out"]
    if check:
        if item.get("generator") == "monogram":
            return None
        return None if source_path(item).exists() else f"缺少源图 {source_path(item)}"
    if out.exists() and not force:
        return f"{item['out']}  已存在，跳过（--force 可重建）"
    if item.get("generator") == "monogram":
        out.parent.mkdir(parents=True, exist_ok=True)
        monogram(item["char"]).save(out, "JPEG", quality=88, optimize=True)
        return f"{item['out']}  512×512（占位字）"

    src = source_path(item)
    if not src.exists():
        return f"缺少源图 {src}"
    im = Image.open(src)
    if getattr(im, "is_animated", False):
        im.seek(0)
    im = im.convert("RGB")
    im = apply_adjust(crop_box(im, item["box"]), item)
    im = center_square(im)
    im = im.resize((512, 512), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "JPEG", quality=88, optimize=True)
    return f"{item['out']}  512×512"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="只处理文件名包含该字符串的条目")
    ap.add_argument("--check", action="store_true", help="只检查源图是否存在")
    ap.add_argument("--force", action="store_true", help="覆盖已存在的成品（默认跳过）")
    args = ap.parse_args()

    cfg = yaml.safe_load(MEDIA.read_text(encoding="utf-8"))
    problems, done, skipped = [], 0, 0
    for kind, key, fn in [("图", "images", build_image), ("头像", "avatars", build_avatar)]:
        for item in cfg[key]:
            if args.only and args.only not in item["out"]:
                continue
            msg = fn(item, check=args.check, force=args.force)
            if msg and msg.startswith("缺少源图"):
                problems.append(msg)
            elif msg and "跳过" in msg:
                skipped += 1
            elif msg:
                done += 1
                print(f"[{kind}] {msg}")

    print(f"\n生成 {done} 个文件，跳过 {skipped} 个；归档目录 {ARCHIVES}")
    if problems:
        print(f"有 {len(problems)} 条源图缺失（归档未挂载时正常）：")
        for p in problems[:10]:
            print("  -", p)
        return 1 if not args.check else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
