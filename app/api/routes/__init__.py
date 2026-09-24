# 文件名：app/api/routes/__init__.py
# 汇总所有子 router，对外暴露一个统一的 router

from fastapi import APIRouter

from .pages import router as pages_router
from .posts import router as posts_router
from .friends import router as friends_router
from .thinkings import router as thinkings_router
from .uploads import router as uploads_router
from .misc import router as misc_router
from .admin import router as admin_router

# 对外统一的 router（main.py 只要 from app.api.routes import router 即可）
router = APIRouter()

router.include_router(pages_router)
router.include_router(posts_router)
router.include_router(friends_router)
router.include_router(thinkings_router)
router.include_router(uploads_router)
router.include_router(misc_router)
router.include_router(admin_router)