# 文件名：app/api/routes/posts.py
# 文章公开接口：列表、详情、提交、阅读数、点赞

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ...db.database import get_db
from ...db.models import Post
from ...api.schemas import PostCreate, PostResponse
from ...markdown.store import save_post_markdown, read_post_content
from ._helpers import fingerprint, READ, LIKED, replace_attachments

router = APIRouter(tags=["posts"])

# ★ 公开投稿允许的类型
ALLOWED_KINDS = {"post", "note"}


# ======================
# 列表 / 详情 / 提交
# ======================
@router.get("/api/posts", response_model=list[PostResponse])
def get_approved_posts(
    category: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Post).filter(Post.is_approved.is_(True))
    if category:
        query = query.filter(Post.category == category)
    return query.order_by(Post.is_pinned.desc(), Post.id.desc()).all()


@router.get("/api/posts/{post_id}", response_model=PostResponse)
def get_post_by_id(post_id: int, db: Session = Depends(get_db)):
    post = (
        db.query(Post)
        .filter(Post.id == post_id, Post.is_approved.is_(True))
        .first()
    )
    if post is None:
        raise HTTPException(status_code=404, detail="文章不存在或未通过审核")

    post.content = read_post_content(post)
    return post


@router.post("/posts", response_model=PostResponse)
def submit_post(post_data: PostCreate, db: Session = Depends(get_db)):
    # ★ 校验 kind
    kind = post_data.kind or "post"
    if kind not in ALLOWED_KINDS:
        raise HTTPException(
            status_code=400,
            detail=f"kind 只能是 {sorted(ALLOWED_KINDS)} 之一",
        )

    new_post = Post(
        title=post_data.title,
        content=post_data.content or "",
        author_name=post_data.author_name,
        kind=kind,
        category=post_data.category or "",
        tags=post_data.tags or "",
        summary=post_data.summary or "",
        attachment_url=post_data.attachment_url,
        attachment_name=post_data.attachment_name,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    # 新建文章：所有附件都是"新增"
    if post_data.attachments:
        replace_attachments(db, new_post, post_data.attachments)
        db.commit()
        db.refresh(new_post)

    # 写 md
    rel_path = save_post_markdown(new_post)
    new_post.file_path = rel_path
    db.commit()
    db.refresh(new_post)

    return new_post


# ======================
# 阅读数
# ======================
@router.post("/api/posts/{post_id}/read")
def inc_read(post_id: int, request: Request, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="文章不存在")

    key = f"{post_id}:{fingerprint(request)}"
    if key in READ:
        return {"read_count": post.read_count or 0, "counted": False}

    READ.add(key)
    post.read_count = (post.read_count or 0) + 1
    db.commit()
    return {"read_count": post.read_count, "counted": True}


# ======================
# 点赞
# ======================
@router.post("/api/posts/{post_id}/like")
def like_post(post_id: int, request: Request, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="文章不存在")

    key = f"{post_id}:{fingerprint(request)}"
    if key in LIKED:
        return {"like_count": post.like_count or 0, "liked": True, "already": True}

    LIKED.add(key)
    post.like_count = (post.like_count or 0) + 1
    db.commit()
    return {"like_count": post.like_count, "liked": True, "already": False}


@router.delete("/api/posts/{post_id}/like")
def unlike_post(post_id: int, request: Request, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="文章不存在")

    key = f"{post_id}:{fingerprint(request)}"
    if key in LIKED:
        LIKED.discard(key)
        post.like_count = max(0, (post.like_count or 0) - 1)
        db.commit()
    return {"like_count": post.like_count or 0, "liked": False}