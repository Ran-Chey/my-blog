# 文件名：app/api/routes/admin.py
# 管理后台：登录、文章审核/删除/编辑、附件管理、友链管理

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ...db.database import get_db
from ...db.models import Post, Admin, FriendLink, Attachment
from ...api.schemas import (
    PostUpdate, PostResponse,
    FriendLinkResponse,
)
from ...security.auth import (
    verify_password,
    create_access_token,
    get_current_admin,
)
from ...markdown.store import save_post_markdown, delete_post_markdown
from ._helpers import (
    replace_attachments,
    delete_all_attachments,
    delete_single_attachment_file,
)

router = APIRouter(tags=["admin"])


# ======================
# 登录
# ======================
@router.post("/admin/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    admin = db.query(Admin).filter(Admin.username == form_data.username).first()
    if admin is None or not verify_password(form_data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token(admin.username)
    return {"access_token": token, "token_type": "bearer"}


# ======================
# 文章管理
# ======================
@router.post("/admin/approve/{post_id}")
def approve_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="文章不存在")

    post.is_approved = True
    db.commit()
    db.refresh(post)

    rel_path = save_post_markdown(post)
    post.file_path = rel_path
    db.commit()
    db.refresh(post)

    return {"message": "审核通过", "post_id": post_id}


@router.delete("/admin/posts/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="文章不存在")

    # 删所有附件（磁盘文件 + 数据库记录）
    delete_all_attachments(post, db)

    # 删 md
    delete_post_markdown(post)

    # 删文章
    db.delete(post)
    db.commit()
    return {"message": "已删除", "post_id": post_id}


@router.put("/admin/posts/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    post_data: PostUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="文章不存在")

    data = post_data.model_dump(exclude_unset=True)

    # 1. 普通字段
    for key, value in data.items():
        if key == "attachments":
            continue
        setattr(post, key, value)
    db.commit()
    db.refresh(post)

    # 2. 附件：差集对比
    # ★ 只有显式传了非 null 的 attachments 才处理
    if data.get("attachments") is not None:
        replace_attachments(db, post, data["attachments"])
        db.commit()
        db.refresh(post)

    # 3. 写 md
    rel_path = save_post_markdown(post)
    post.file_path = rel_path
    db.commit()
    db.refresh(post)

    return post


@router.get("/admin/post/{post_id}", response_model=PostResponse)
def get_post_for_admin(
    post_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="文章不存在")
    return post


@router.get("/admin/pending", response_model=list[PostResponse])
def get_pending_posts(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return (
        db.query(Post)
        .filter(Post.is_approved.is_(False))
        .order_by(Post.id.desc())
        .all()
    )


@router.get("/admin/posts", response_model=list[PostResponse])
def get_all_posts(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return db.query(Post).order_by(Post.id.desc()).all()


# ======================
# 附件管理
# ======================
@router.delete("/admin/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    a = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if a is None:
        raise HTTPException(status_code=404, detail="附件不存在")

    delete_single_attachment_file(a)
    db.delete(a)
    db.commit()
    return {"message": "已删除", "id": attachment_id}


# ======================
# 友链管理
# ======================
@router.get("/admin/friends/pending", response_model=list[FriendLinkResponse])
def get_pending_friends(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return (
        db.query(FriendLink)
        .filter(FriendLink.is_approved.is_(False))
        .order_by(FriendLink.id.desc())
        .all()
    )


@router.get("/admin/friends", response_model=list[FriendLinkResponse])
def get_all_friends(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return db.query(FriendLink).order_by(FriendLink.id.desc()).all()


@router.post("/admin/friends/{link_id}/approve")
def approve_friend(
    link_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    link = db.query(FriendLink).filter(FriendLink.id == link_id).first()
    if link is None:
        raise HTTPException(status_code=404, detail="友链不存在")
    link.is_approved = True
    db.commit()
    return {"message": "已通过", "id": link_id}


@router.delete("/admin/friends/{link_id}")
def delete_friend(
    link_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    link = db.query(FriendLink).filter(FriendLink.id == link_id).first()
    if link is None:
        raise HTTPException(status_code=404, detail="友链不存在")
    db.delete(link)
    db.commit()
    return {"message": "已删除", "id": link_id}