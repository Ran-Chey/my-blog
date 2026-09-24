# 文件名：app/api/routes/thinkings.py
# 思考（短想法）接口：列表、发布

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...db.database import get_db
from ...db.models import Thinking
from ...api.schemas import ThinkingCreate, ThinkingResponse

router = APIRouter(tags=["thinkings"])


@router.get("/api/thinkings", response_model=list[ThinkingResponse])
def list_thinkings(db: Session = Depends(get_db)):
    """获取所有已通过的思考。"""
    return (
        db.query(Thinking)
        .filter(Thinking.is_approved.is_(True))
        .order_by(Thinking.created_at.desc())
        .all()
    )


@router.post("/api/thinkings", response_model=ThinkingResponse)
def create_thinking(data: ThinkingCreate, db: Session = Depends(get_db)):
    """发布一条思考（默认直接通过审核）。"""
    t = Thinking(
        content=data.content,
        author_name=data.author_name or "匿名",
        is_approved=True,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t