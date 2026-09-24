# 文件名：app/api/routes/_helpers.py
# 路由共享工具：指纹、内存集合、附件操作

import hashlib

from fastapi import Request
from sqlalchemy.orm import Session

from ...db.models import Attachment
from ...files.uploads import delete_upload_by_url


def fingerprint(request: Request) -> str:
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    raw = f"{ip}|{ua}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


READ: set[str] = set()
LIKED: set[str] = set()


def delete_single_attachment_file(attachment) -> None:
    """删单个附件的文件（本地或 R2）。"""
    if not attachment or not attachment.url:
        return
    delete_upload_by_url(attachment.url)


def replace_attachments(db: Session, post, new_items: list) -> None:
    def _get(it, key):
        if isinstance(it, dict):
            return it.get(key)
        return getattr(it, key, None)

    new_urls = set()
    for it in (new_items or []):
        url = _get(it, "url")
        if url:
            new_urls.add(url)

    old_atts = list(post.attachments)
    old_urls = {a.url for a in old_atts}

    for a in old_atts:
        if a.url not in new_urls:
            delete_single_attachment_file(a)
            db.delete(a)

    for it in (new_items or []):
        url = _get(it, "url")
        name = _get(it, "name")
        if not url or not name:
            continue
        if url not in old_urls:
            db.add(Attachment(post_id=post.id, url=url, name=name))


def delete_all_attachments(post, db: Session) -> None:
    for a in list(post.attachments):
        delete_single_attachment_file(a)
        db.delete(a)