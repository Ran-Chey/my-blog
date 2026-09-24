# 文件名：app/api/schemas.py
# Pydantic 请求/响应模型

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# ============ 附件 ============

class AttachmentItem(BaseModel):
    """前端提交附件时用"""
    url: str
    name: str


class AttachmentResponse(BaseModel):
    id: int
    url: str
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============ 文章 ============

class PostCreate(BaseModel):
    title: str
    content: str = ""             # ★ 正文可空
    author_name: str
    kind: str = "post"
    category: str | None = None
    tags: str | None = None
    summary: str | None = None
    attachment_url: str | None = None
    attachment_name: str | None = None
    attachments: list[AttachmentItem] | None = None   # ★ 新增


class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    author_name: str | None = None
    kind: str | None = None
    category: str | None = None
    tags: str | None = None
    summary: str | None = None
    is_pinned: bool | None = None
    attachment_url: str | None = None
    attachment_name: str | None = None
    attachments: list[AttachmentItem] | None = None   # ★ 新增


class PostResponse(BaseModel):
    id: int
    title: str
    content: str = ""
    author_name: str
    is_approved: bool
    created_at: datetime
    kind: str = "post"

    category: str | None = None
    tags: str | None = None
    summary: str | None = None
    is_pinned: bool = False
    read_count: int = 0
    like_count: int = 0

    attachment_url: str | None = None
    attachment_name: str | None = None
    file_path: str | None = None

    attachments: list[AttachmentResponse] = Field(default_factory=list)   # ★ 新增

    model_config = ConfigDict(from_attributes=True)


class ThinkingCreate(BaseModel):
    content: str
    author_name: str = "匿名"


class ThinkingResponse(BaseModel):
    id: int
    content: str
    author_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============ 友链 ============

class FriendLinkCreate(BaseModel):
    name: str
    url: str
    description: str | None = None
    avatar: str | None = None


class FriendLinkResponse(BaseModel):
    id: int
    name: str
    url: str
    description: str | None = None
    avatar: str | None = None
    is_approved: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)