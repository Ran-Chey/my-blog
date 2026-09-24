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
    try:
        Base.metadata.create_all(bind=engine)
        print("[init] create_all 完成")
    except Exception as e:
        print(f"[init] create_all 失败：{e}")

    try:
        init_admin()
        print("[init] init_admin 完成")
    except Exception as e:
        print(f"[init] init_admin 失败：{e}")

    if not ON_VERCEL and os.environ.get("BLOG_WATCH", "1") == "1":
        threading.Thread(target=_watch_posts, daemon=True).start()
    yield


app = FastAPI(title="我的博客后端", lifespan=lifespan)


# ============================================================
# ★ 调试：打印每个请求的真实路径
# ============================================================
@app.middleware("http")
async def debug_path(request: Request, call_next):
    print(
        f"[debug] path={request.url.path} "
        f"raw_path={request.scope.get('raw_path')} "
        f"root_path={request.scope.get('root_path')!r} "
        f"query={request.url.query}"
    )
    return await call_next(request)


# ============================================================
# ★ Vercel 原始路径恢复
# ============================================================
@app.middleware("http")
async def fix_vercel_path(request: Request, call_next):
    original = (
        request.headers.get("x-vercel-original-path")
        or request.headers.get("x-forwarded-uri")
        or request.headers.get("x-original-url")
        or request.headers.get("x-rewrite-url")
    )
    if original:
        path = original.split("?")[0]
        request.scope["path"] = path
        print(f"[fix] {request.url.path} -> {path}")
    return await call_next(request)


PROTECTED_PREFIXES = ("/js/", "/css/")


@app.middleware("http")
async def fix_vercel_path(request: Request, call_next):
    original = (
        request.headers.get("x-vercel-original-path")
        or request.headers.get("x-forwarded-uri")
        or request.headers.get("x-original-url")
        or request.headers.get("x-rewrite-url")
    )
    print(f"[fix] path={request.url.path} original={original}")
    # ★ 先不改，只看日志
    return await call_next(request)


# ★ 静态资源挂载
for _name in ("css", "js"):
    _dir = os.path.join(BASE_DIR, _name)
    if os.path.isdir(_dir):
        app.mount(f"/{_name}", StaticFiles(directory=_dir), name=_name)
        print(f"[mount] 已挂载 /{_name} -> {_dir}")
    else:
        print(f"[mount] 跳过 /{_name}，目录不存在：{_dir}")

if not ON_VERCEL:
    try:
        from app.files.uploads import UPLOAD_DIR
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
        print(f"[mount] 已挂载 /uploads -> {UPLOAD_DIR}")
    except Exception as e:
        print(f"[mount] 跳过 /uploads：{e}")

app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8080)