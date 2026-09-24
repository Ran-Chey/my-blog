# 文件名：app/api/routes/friends.py
# 友链公开接口：列表、申请

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...db.database import get_db
from ...db.models import FriendLink
from ...api.schemas import FriendLinkCreate, FriendLinkResponse

router = APIRouter(tags=["friends"])


@router.get("/friends/list", response_model=list[FriendLinkResponse])
def get_friend_links(db: Session = Depends(get_db)):
    """获取所有已通过的友链。"""
    return (
        db.query(FriendLink)
        .filter(FriendLink.is_approved.is_(True))
        .order_by(FriendLink.id.desc())
        .all()
    )


@router.post("/friends/apply", response_model=FriendLinkResponse)
def apply_friend_link(data: FriendLinkCreate, db: Session = Depends(get_db)):
    """提交友链申请（默认未审核）。"""
    link = FriendLink(
        name=data.name,
        url=data.url,
        description=data.description or "",
        avatar=data.avatar or "",
        is_approved=False,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link