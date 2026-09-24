# 文件名：app/security/auth.py
# 密码哈希 + JWT + 管理员认证依赖

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db.models import Admin

# ★ 从环境变量读，没设置就用一个本地开发用的默认值
SECRET_KEY = os.environ.get(
    "BLOG_SECRET_KEY",
    "dev-only-change-me-48fa9e3d6ef7f8c3885cfe32e4bb381204586f61c3a6125799aa391f19cf6976",
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# ★ 默认管理员密码也可以从环境变量读
DEFAULT_ADMIN_USER = os.environ.get("BLOG_ADMIN_USER", "admin")
DEFAULT_ADMIN_PASS = os.environ.get("BLOG_ADMIN_PASS", "RQH1qaz!@#$")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/login")


def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    pwd_bytes = plain_password.encode("utf-8")[:72]
    hash_bytes = password_hash.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hash_bytes)


def create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Admin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="登录已失效，请重新登录",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已过期，请重新登录")
    except jwt.InvalidTokenError:
        raise credentials_exception

    admin = db.query(Admin).filter(Admin.username == username).first()
    if admin is None:
        raise credentials_exception
    return admin


def init_admin():
    """首次运行时创建默认管理员。"""
    from ..db.database import SessionLocal
    db = SessionLocal()
    try:
        existing = db.query(Admin).filter(Admin.username == DEFAULT_ADMIN_USER).first()
        if existing is None:
            admin = Admin(
                username=DEFAULT_ADMIN_USER,
                password_hash=hash_password(DEFAULT_ADMIN_PASS),
            )
            db.add(admin)
            db.commit()
            print(f">>> 已创建默认管理员：{DEFAULT_ADMIN_USER}，请尽快修改密码！")
    finally:
        db.close()