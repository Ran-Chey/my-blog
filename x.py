# fix_quotes.py
# 一次性清洗：把数据库里 title/author_name/kind/category/tags/summary
# 两端多余的双引号去掉
# 用法：python fix_quotes.py

import sqlite3
from app.db.database import DB_PATH

FIELDS = ["title", "author_name", "kind", "category", "tags", "summary"]


def strip_quotes(s):
    if not isinstance(s, str):
        return s
    s = s.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        inner = s[1:-1]
        inner = inner.replace('\\"', '"').replace("\\\\", "\\")
        return inner
    return s


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    total = 0
    for f in FIELDS:
        # 只查两端带引号的
        cur.execute(
            f"SELECT id, {f} FROM posts "
            f"WHERE {f} LIKE '\"%\"'"
        )
        rows = cur.fetchall()
        for rid, val in rows:
            new = strip_quotes(val)
            if new != val:
                cur.execute(f"UPDATE posts SET {f} = ? WHERE id = ?", (new, rid))
                print(f"#{rid} {f}: {val!r} -> {new!r}")
                total += 1

    conn.commit()
    conn.close()
    print(f"\n共清洗 {total} 处。")


if __name__ == "__main__":
    main()