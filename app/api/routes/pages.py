# 文件名：app/api/routes/pages.py
# 页面路由：返回 HTML 模板

import os

from fastapi import APIRouter
from fastapi.responses import FileResponse

from ...db.database import BASE_DIR

router = APIRouter(tags=["pages"])


def _page(filename: str) -> FileResponse:
    """返回 templates/ 下的 HTML 文件。"""
    return FileResponse(os.path.join(BASE_DIR, "templates", filename))


@router.get("/")
def read_blog():
    return _page("blog.html")


@router.get("/submit")
def read_submit():
    return _page("submit.html")


@router.get("/admin")
def read_admin():
    return _page("admin.html")


@router.get("/admin/edit/{post_id}")
def read_admin_edit(post_id: int):
    return _page("admin-edit.html")


@router.get("/admin/review/{post_id}")
def read_admin_review(post_id: int):
    return _page("admin-review.html")


@router.get("/post/{post_id}")
def read_post_page(post_id: int):
    return _page("post.html")


@router.get("/friends")
def read_friends():
    return _page("friends.html")


@router.get("/posts")
def read_posts_page():
    return _page("posts.html")


@router.get("/notes")
def read_notes_page():
    return _page("notes.html")


@router.get("/timeline")
def read_timeline_page():
    return _page("timeline.html")


@router.get("/thinking")
def read_thinking_page():
    return _page("thinking.html")