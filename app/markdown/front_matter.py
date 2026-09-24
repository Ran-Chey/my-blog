# 文件名：app/markdown/front_matter.py
# 解析 Markdown 文件的 front-matter

import os


def _strip_quotes(s: str) -> str:
    """去掉值两端的引号，并还原转义。"""
    s = s.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        inner = s[1:-1]
        inner = inner.replace('\\"', '"').replace("\\\\", "\\")
        return inner
    if len(s) >= 2 and s[0] == "'" and s[-1] == "'":
        return s[1:-1].replace("\\'", "'")
    return s


def parse_markdown_file(path: str) -> dict:
    """
    读 .md 文件，返回 {meta: {...}, content: "正文"}。
    """
    if not os.path.exists(path):
        return {"meta": {}, "content": ""}

    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    if not raw.startswith("---"):
        return {"meta": {}, "content": raw}

    parts = raw.split("---", 2)
    if len(parts) < 3:
        return {"meta": {}, "content": raw}

    meta_block = parts[1].strip()
    content = parts[2].lstrip("\n")

    meta = {}
    for line in meta_block.split("\n"):
        line = line.strip()
        if not line or ":" not in line:
            continue
        k, v = line.split(":", 1)
        meta[k.strip()] = _strip_quotes(v)

    return {"meta": meta, "content": content}