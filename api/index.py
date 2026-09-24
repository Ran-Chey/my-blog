# 文件名：api/index.py
# Vercel 入口

import os
import sys

# 把项目根加到 sys.path，让 app.* 能 import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: F401