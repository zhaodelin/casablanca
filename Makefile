# 罗小黑战记资料站 —— 内容构建
#
# 常用：
#   make build    改完 content/*.yaml 后重新生成 assets/data.js
#   make check    体检 + 确认生成物是最新的（CI 跑这个）
#   make serve    本地起站点，浏览器打开 http://localhost:8080
#   make media    按 data/media.yaml 重建图片（已存在则跳过，需要归档）
#
# Windows 没有 make 时，直接用 python 调对应脚本即可，命令写在每个目标下面。

PY      ?= python
CONTENT := content
DATA    := data
ARCHIVES ?= ..

.PHONY: all build check validate media media-force sync series serve clean help

all: build check

help:
	@echo "build        生成 assets/data.js"
	@echo "check        内容体检 + 生成物是否最新"
	@echo "validate     只做内容体检"
	@echo "media        按配方重建图片（跳过已存在；ARCHIVES=<归档目录>）"
	@echo "media-force  强制重建全部图片"
	@echo "sync         从微博归档重建 data/derived.json 与 data/series.json"
	@echo "series       只重抽每集/每话标题"
	@echo "serve        本地预览"

build:
	$(PY) tools/build_content.py

check: validate
	$(PY) tools/build_content.py --check

validate:
	$(PY) tools/validate.py

media:
	ARCHIVES=$(ARCHIVES) $(PY) tools/build_media.py

media-force:
	ARCHIVES=$(ARCHIVES) $(PY) tools/build_media.py --force

sync:
	ARCHIVES=$(ARCHIVES) $(PY) tools/sync_archive.py

series:
	ARCHIVES=$(ARCHIVES) $(PY) tools/extract_series.py

serve:
	$(PY) -m http.server 8080
