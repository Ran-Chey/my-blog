# 文件名：main.py
# 启动入口

import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.db.database import Base, engine, BASE_DIR
from app.security.auth import init_admin
from app.api.routes import router

Base.metadata.create_all(bind=engine)
init_admin()

ON_VERCEL = os.environ.get("VERCEL") == "1"


def _watch_posts():
    from watchfiles import watch
    from rebuild_index import sync_file, sync_all, sync_deletions, POSTS_DIR
    from app.db.database import SessionLocal

    try:
        sync_all(verbose=True)
    except Exception as e:
        print(f"[watch] 启动全量同步失败：{e}")

    print(f"[watch] 开始监听：{POSTS_DIR}")

    for changes in watch(POSTS_DIR, recursive=False, step=500):
        for change_type, path in changes:
            if not path.endswith(".md"):
                continue
            base = os.path.basename(path)
            if base.startswith(".") or base.endswith("~") or base.endswith(".swp") or base.endswith(".tmp"):
                continue
            if os.path.exists(path):
                try:
                    sync_file(path)
                except Exception as e:
                    print(f"[watch] 同步失败 {path}：{e}")
        try:
            db = SessionLocal()
            try:
                deleted = sync_deletions(db)
                if deleted:
                    db.commit()
            finally:
                db.close()
        except Exception as e:
            print(f"[watch] 删除同步失败：{e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ★ Vercel 上不启动 watcher
    if not ON_VERCEL and os.environ.get("BLOG_WATCH", "1") == "1":
        threading.Thread(target=_watch_posts, daemon=True).start()
    yield


app = FastAPI(title="我的博客后端", lifespan=lifespan)


PROTECTED_PREFIXES = ("/js/", "/css/")


@app.middleware("http")
async def referer_guard(request: Request, call_next):
    path = request.url.path
    if any(path.startswith(p) for p in PROTECTED_PREFIXES):
        referer = request.headers.get("referer")
        host = request.headers.get("host", "")
        if referer:
            from urllib.parse import urlparse
            ref_host = urlparse(referer).netloc
            if ref_host and ref_host != host:
                return JSONResponse(status_code=403, content={"detail": "Forbidden"})
    return await call_next(request)


# 静态资源挂载
app.mount("/css", StaticFiles(directory=os.path.join(BASE_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, "js")), name="js")

# ★ 本地才挂 /uploads（R2 模式不需要）
if not ON_VERCEL:
    from app.files.uploads import UPLOAD_DIR
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8080)