# 文件名：app/files/uploads.py
# 文件上传相关：本地磁盘 or Cloudflare R2

import os
import uuid

import boto3
from botocore.config import Config
from fastapi import HTTPException, UploadFile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

# ★ 判断用本地还是 R2
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL")

USE_R2 = all([R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL])

if not USE_R2:
    os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".md"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


def _get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


async def save_upload(file: UploadFile) -> dict:
    """
    接收 UploadFile，校验类型和大小，保存到本地或 R2。
    返回 { url, name }。
    """
    filename = file.filename or "unnamed"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型：{ext}。只允许 PDF、图片、文本。"
        )

    new_filename = f"{uuid.uuid4().hex}{ext}"
    total = 0
    chunk_size = 1024 * 1024
    chunks = []

    # 先读进内存（100MB 上限，可接受；想更省内存可以边读边传）
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"文件太大，最多 {MAX_FILE_SIZE // 1024 // 1024}MB"
            )
        chunks.append(chunk)
    contents = b"".join(chunks)

    if USE_R2:
        # ★ 上传到 R2
        try:
            client = _get_r2_client()
            client.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=new_filename,
                Body=contents,
                ContentType=file.content_type or "application/octet-stream",
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"R2 上传失败：{e}")
        url = f"{R2_PUBLIC_URL.rstrip('/')}/{new_filename}"
    else:
        # ★ 本地磁盘
        file_path = os.path.join(UPLOAD_DIR, new_filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        url = f"/uploads/{new_filename}"

    return {"url": url, "name": filename}


def delete_upload_by_url(url: str) -> None:
    """根据 url 删文件（本地或 R2）。"""
    if not url:
        return

    if USE_R2:
        # R2 的 url 形如 {R2_PUBLIC_URL}/{filename}
        prefix = R2_PUBLIC_URL.rstrip("/") + "/"
        if not url.startswith(prefix):
            return
        key = url[len(prefix):]
        try:
            client = _get_r2_client()
            client.delete_object(Bucket=R2_BUCKET_NAME, Key=key)
        except Exception as e:
            print(f"[uploads] R2 删除失败 {key}：{e}")
    else:
        # 本地 /uploads/xxx
        if not url.startswith("/uploads/"):
            return
        fname = url[len("/uploads/"):]
        abs_path = os.path.join(UPLOAD_DIR, fname)
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
            except OSError as e:
                print(f"[uploads] 删除文件失败 {abs_path}：{e}")