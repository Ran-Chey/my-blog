# backup_db.py
# 数据库备份脚本：把 blog.db 复制到 backups/ 目录，带时间戳
#
# 用法：
#   python backup_db.py

import os
import shutil
from datetime import datetime

from app.db.database import DB_PATH, BASE_DIR

# 备份目录
BACKUP_DIR = os.path.join(BASE_DIR, "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)


def main():
    if not os.path.exists(DB_PATH):
        print(f"❌ 数据库不存在：{DB_PATH}")
        return

    # 生成带时间戳的文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"blog_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_name)

    # 复制
    try:
        shutil.copy2(DB_PATH, backup_path)
    except Exception as e:
        print(f"❌ 备份失败：{e}")
        return

    # 显示结果
    size_kb = os.path.getsize(backup_path) / 1024
    print("=" * 60)
    print(f"✅ 备份成功")
    print(f"   源文件：{DB_PATH}")
    print(f"   备份到：{backup_path}")
    print(f"   大小：{size_kb:.1f} KB")
    print("=" * 60)

    # 列出所有备份（按时间倒序）
    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.endswith(".db")],
        reverse=True,
    )
    print(f"\n当前所有备份（{len(backups)} 个）：")
    for name in backups:
        path = os.path.join(BACKUP_DIR, name)
        size = os.path.getsize(path) / 1024
        mtime = datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M:%S")
        print(f"   {name}  ({size:.1f} KB)  {mtime}")


if __name__ == "__main__":
    main()