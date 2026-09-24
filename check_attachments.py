# cleanup_legacy_attachments.py
# 一次性清理：把 posts 表里旧的 attachment_url / attachment_name 清空
# 用法：python cleanup_legacy_attachments.py

import sqlite3
from app.db.database import DB_PATH


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, attachment_url
        FROM posts
        WHERE attachment_url IS NOT NULL AND attachment_url != ''
    """)
    rows = cur.fetchall()
    print(f"发现 {len(rows)} 条带旧附件的文章：")
    for r in rows:
        print(f"  id={r[0]} | url={r[1]}")

    if rows:
        cur.execute("""
            UPDATE posts
            SET attachment_url = NULL, attachment_name = NULL
            WHERE attachment_url IS NOT NULL AND attachment_url != ''
        """)
        print(f"已清空 {cur.rowcount} 条")
    else:
        print("无需清空")

    conn.commit()
    conn.close()
    print("完成。")


if __name__ == "__main__":
    main()