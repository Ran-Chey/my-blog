# 文件名：app/db/database.py
# 数据库连接、Session、Base

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ON_VERCEL = os.environ.get("VERCEL") == "1"

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Neon / PostgreSQL
    # ★ 不要手动改连接串，sslmode 由 Neon 自己带
    # ★ Vercel serverless 用 NullPool，避免连接池失效
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        pool_pre_ping=True,
        echo=False,
    )
else:
    # 本地 SQLite
    DB_PATH = os.path.join(BASE_DIR, "blog.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()