# 文件名：api/index.py
# Vercel 入口

import os
import sys

# 把项目根加到 sys.path，让 app.* 能 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import Base, engine
from app.security.auth import init_admin
from main import app  # noqa: F401

# 确保表存在
Base.metadata.create_all(bind=engine)
try:
    init_admin()
except Exception as e:
    print(f"[init] init_admin 失败：{e}")