# 文件名：app/db/database.py
# 数据库连接、Session、Base

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ★ 优先从环境变量读 DATABASE_URL（Vercel / Neon）
#   没有则回退到本地 SQLite（本地开发）
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Neon / PostgreSQL
    # Neon 的连接串可能带 channel_binding=require，psycopg2 不认，去掉
    if "channel_binding" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?")[0] + "?sslmode=require"
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
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