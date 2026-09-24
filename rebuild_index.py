# rebuild_index.py
# 扫描 posts/*.md，把元数据同步到数据库

import os
import time

from app.db.database import SessionLocal, BASE_DIR
from app.db.models import Post
from app.markdown.front_matter import parse_markdown_file

POSTS_DIR = os.path.join(BASE_DIR, "posts")


def sync_one_file(filepath: str, db) -> str:
    """
    同步单个文件到数据库。
    返回 "created" / "updated" / "skipped" / "error"。
    """
    filename = os.path.basename(filepath)
    result = parse_markdown_file(filepath)
    meta = result["meta"]
    content = result["content"]

    if "id" not in meta:
        return "skipped"

    try:
        post_id = int(meta["id"])
    except (ValueError, TypeError):
        return "error"

    kind = (meta.get("kind") or "post").strip().lower()
    if kind not in ("post", "note", "thinking"):
        kind = "post"

    post = db.query(Post).filter(Post.id == post_id).first()

    if post is None:
        is_approved = meta.get("is_approved", "false").lower() == "true"
        is_pinned = meta.get("is_pinned", "false").lower() == "true"

        post = Post(
            id=post_id,
            title=meta.get("title", ""),
            author_name=meta.get("author_name", ""),
            content=content,
            kind=kind,
            category=meta.get("category", ""),
            tags=meta.get("tags", ""),
            summary=meta.get("summary", ""),
            is_approved=is_approved,
            is_pinned=is_pinned,
            file_path=f"posts/{filename}",
        )
        db.add(post)
        return "created"
    else:
        post.title = meta.get("title", post.title)
        post.author_name = meta.get("author_name", post.author_name)
        post.content = content
        post.kind = kind
        post.category = meta.get("category", post.category)
        post.tags = meta.get("tags", post.tags)
        post.summary = meta.get("summary", post.summary)
        post.file_path = f"posts/{filename}"
        return "updated"


def sync_deletions(db) -> int:
    """
    扫描数据库里所有 file_path，如果对应磁盘文件不存在，就删掉这条记录。
    ★ 保护：跳过 file_path 不在此目录下的记录；扫描前 sleep 一下，
      避免编辑器"删+建"瞬间误删。
    """
    if not os.path.isdir(POSTS_DIR):
        return 0

    # ★ 等一下，避免编辑器保存时的瞬时消失
    time.sleep(0.3)

    disk_files = set()
    for name in os.listdir(POSTS_DIR):
        if name.endswith(".md"):
            disk_files.add(f"posts/{name}")

    deleted = 0
    for post in db.query(Post).all():
        if not post.file_path:
            continue
        rel = post.file_path.replace("\\", "/")
        # ★ 只处理 posts/ 下的文件，其他路径不动
        if not rel.startswith("posts/"):
            continue
        if rel not in disk_files:
            print(f"[sync] 文件消失，删除记录：#{post.id} {post.title}")
            db.delete(post)
            deleted += 1

    return deleted


def sync_file(filepath: str):
    db = SessionLocal()
    try:
        result = sync_one_file(filepath, db)
        db.commit()
        if result == "created":
            print(f"[sync] 新建：{os.path.basename(filepath)}")
        elif result == "updated":
            print(f"[sync] 更新：{os.path.basename(filepath)}")
    except Exception as e:
        db.rollback()
        print(f"[sync] 同步失败 {filepath}：{e}")
    finally:
        db.close()


def sync_all(verbose: bool = True):
    if not os.path.isdir(POSTS_DIR):
        if verbose:
            print(f"目录不存在：{POSTS_DIR}")
        return

    db = SessionLocal()
    try:
        created = 0
        updated = 0
        skipped = 0

        for filename in sorted(os.listdir(POSTS_DIR)):
            if not filename.endswith(".md"):
                continue

            filepath = os.path.join(POSTS_DIR, filename)
            result = sync_one_file(filepath, db)

            if result == "created":
                created += 1
                if verbose:
                    print(f"  新建：{filename}")
            elif result == "updated":
                updated += 1
                if verbose:
                    print(f"  更新：{filename}")
            elif result == "skipped":
                skipped += 1
                if verbose:
                    print(f"  跳过（无 id）：{filename}")

        deleted = sync_deletions(db)

        db.commit()

        if verbose:
            print(f"\n完成：新建 {created} 篇，更新 {updated} 篇，跳过 {skipped} 篇，删除 {deleted} 篇")
    except Exception as e:
        db.rollback()
        print(f"同步失败：{e}")
    finally:
        db.close()


if __name__ == "__main__":
    print(f"扫描目录：{POSTS_DIR}\n")
    sync_all(verbose=True)