# 文件名：app/api/routes/misc.py
# 杂项接口：分类、时间线、在线人数、文章列表（按 kind 分类）

import threading
import time

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ...db.database import get_db
from ...db.models import Post
from ...api.schemas import PostResponse
from ._helpers import fingerprint

router = APIRouter(tags=["misc"])


# ======================
# 分类
# ======================
@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    rows = (
        db.query(Post.category)
        .filter(Post.is_approved.is_(True))
        .filter(Post.category.isnot(None))
        .filter(Post.category != "")
        .distinct()
        .all()
    )
    return sorted({r[0] for r in rows})


# ======================
# 在线人数
# ======================
_ONLINE: dict[str, float] = {}
_ONLINE_LOCK = threading.Lock()
ONLINE_TIMEOUT = 60


def _clean_offline():
    now = time.time()
    with _ONLINE_LOCK:
        stale = [k for k, t in _ONLINE.items() if now - t > ONLINE_TIMEOUT]
        for k in stale:
            _ONLINE.pop(k, None)


@router.post("/heartbeat")
def heartbeat(request: Request):
    _clean_offline()
    with _ONLINE_LOCK:
        _ONLINE[fingerprint(request)] = time.time()
        count = len(_ONLINE)
    return {"online": count}


@router.get("/online-count")
def online_count():
    _clean_offline()
    with _ONLINE_LOCK:
        count = len(_ONLINE)
    return {"online": count}


# ======================
# 列表（按 kind）
# ======================
@router.get("/api/list", response_model=list[PostResponse])
def list_by_kind(
    kind: str = "post",
    db: Session = Depends(get_db),
):
    return (
        db.query(Post)
        .filter(Post.is_approved.is_(True), Post.kind == kind)
        .order_by(Post.is_pinned.desc(), Post.created_at.desc())
        .all()
    )


# ======================
# 时间线
# ======================
@router.get("/api/timeline")
def timeline(db: Session = Depends(get_db)):
    posts = (
        db.query(Post)
        .filter(Post.is_approved.is_(True))
        .order_by(Post.created_at.desc())
        .all()
    )
    groups: dict[str, list] = {}
    for p in posts:
        ym = p.created_at.strftime("%Y-%m")
        groups.setdefault(ym, []).append({
            "id": p.id,
            "title": p.title,
            "kind": p.kind or "post",
            "category": p.category or "",
            "created_at": p.created_at.isoformat(),
        })
    return [{"ym": k, "items": v} for k, v in sorted(groups.items(), reverse=True)]