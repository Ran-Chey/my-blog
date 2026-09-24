# 文件名：app/models.py
# SQLAlchemy 数据库模型

from datetime import datetime

from sqlalchemy import String, Boolean, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Post(Base):
    """文章表（post / note / thinking 共用）"""
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, index=True)
    content: Mapped[str] = mapped_column(Text, default="")
    author_name: Mapped[str] = mapped_column(String)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # 类型。post=文稿，note=手记，thinking=思考
    kind: Mapped[str] = mapped_column(String, default="post", index=True)

    # 旧的单附件字段（保留兼容历史数据）
    attachment_url: Mapped[str | None] = mapped_column(String, nullable=True)
    attachment_name: Mapped[str | None] = mapped_column(String, nullable=True)

    # 文章元数据
    category: Mapped[str | None] = mapped_column(String, nullable=True, default="")
    tags: Mapped[str | None] = mapped_column(String, nullable=True, default="")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    read_count: Mapped[int] = mapped_column(Integer, default=0)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    file_path: Mapped[str | None] = mapped_column(String, nullable=True, default="")

    # ★ 多附件（一个 post 对多个 Attachment）
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment",
        back_populates="post",
        cascade="all, delete-orphan",
        order_by="Attachment.id",
    )


class Attachment(Base):
    """附件表：一个 post 可以有多个附件"""
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    post: Mapped["Post"] = relationship("Post", back_populates="attachments")


class FriendLink(Base):
    """友链表"""
    __tablename__ = "friend_links"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar: Mapped[str | None] = mapped_column(String, nullable=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class Admin(Base):
    """管理员表，只存密码哈希。"""
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)


class Thinking(Base):
    """思考（短想法）"""
    __tablename__ = "thinkings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    content: Mapped[str] = mapped_column(Text)
    author_name: Mapped[str] = mapped_column(String, default="匿名")
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)