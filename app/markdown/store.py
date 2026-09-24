# 文件名：app/markdown/store.py
# Markdown 文件存储

import os
import re

from ..db.database import BASE_DIR

POSTS_DIR = os.path.join(BASE_DIR, "posts")

# ★ 判断是否在 Vercel（有 VERCEL 环境变量就是）
ON_VERCEL = os.environ.get("VERCEL") == "1"

if not ON_VERCEL:
    os.makedirs(POSTS_DIR, exist_ok=True)


def slugify(text: str, max_len: int = 50) -> str:
    text = re.sub(r'[\\/:*?"<>|\r\n\t]', "", text)
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    text = text.strip("-")
    if not text:
        text = "untitled"
    return text[:max_len]


def _yaml_quote(value) -> str:
    if value is None:
        return '""'
    s = str(value)
    s = s.replace("\\", "\\\\").replace('"', '\\"')
    s = s.replace("\r", " ").replace("\n", " ")
    return f'"{s}"'


def render_front_matter(post) -> str:
    created = post.created_at.strftime("%Y-%m-%dT%H:%M:%S") if post.created_at else ""
    lines = [
        "---",
        f"id: {post.id}",
        f"title: {_yaml_quote(post.title)}",
        f"author_name: {_yaml_quote(post.author_name)}",
        f"kind: {_yaml_quote(post.kind or 'post')}",
        f"category: {_yaml_quote(post.category or '')}",
        f"tags: {_yaml_quote(post.tags or '')}",
        f"summary: {_yaml_quote(post.summary or '')}",
        f"is_approved: {str(post.is_approved).lower()}",
        f"is_pinned: {str(post.is_pinned).lower()}",
        f"created_at: {created}",
        "---",
        "",
    ]
    return "\n".join(lines) + (post.content or "")


def get_post_path(post) -> str:
    filename = f"{post.id}-{slugify(post.title)}.md"
    return os.path.join(POSTS_DIR, filename)


def get_relative_path(abs_path: str) -> str:
    return os.path.relpath(abs_path, BASE_DIR).replace("\\", "/")


def save_post_markdown(post) -> str:
    # ★ Vercel 上不写本地文件，直接返回空
    if ON_VERCEL:
        return post.file_path or ""
    # 本地：照旧
    abs_path = get_post_path(post)
    if post.file_path:
        old_abs = os.path.join(BASE_DIR, post.file_path)
        if os.path.exists(old_abs) and os.path.abspath(old_abs) != os.path.abspath(abs_path):
            try:
                os.remove(old_abs)
            except OSError:
                pass
    with open(abs_path, "w", encoding="utf-8") as f:
        f.write(render_front_matter(post))
    return get_relative_path(abs_path)


def read_post_content(post) -> str:
    # ★ Vercel 上不读本地文件，直接用数据库 content
    if ON_VERCEL:
        return post.content or ""
    if not post.file_path:
        return post.content or ""
    abs_path = os.path.join(BASE_DIR, post.file_path)
    if not os.path.exists(abs_path):
        return post.content or ""
    with open(abs_path, "r", encoding="utf-8") as f:
        raw = f.read()
    if raw.startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) >= 3:
            return parts[2].lstrip("\n")
    return raw


def delete_post_markdown(post) -> bool:
    if ON_VERCEL:
        return True
    if not post.file_path:
        return True
    abs_path = os.path.join(BASE_DIR, post.file_path)
    if not os.path.exists(abs_path):
        return True
    try:
        os.remove(abs_path)
        return True
    except OSError as e:
        print(f"[markdown_store] 删除失败 {abs_path}：{e}")
        return False