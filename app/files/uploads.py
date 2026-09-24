# 文件名：app/files/uploads.py
# 文件上传相关：本地磁盘 or S3 兼容存储
# ★ boto3 懒加载：只有真正用 S3 时才 import
# ★ os.makedirs 加 try/except：Vercel 只读文件系统不崩

import os
import uuid

from fastapi import HTTPException, UploadFile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

S3_ENDPOINT = os.environ.get("AWS_ENDPOINT_URL_S3", "")
S3_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID", "")
S3_SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
S3_BUCKET = os.environ.get("S3_BUCKET", "my-blog")
S3_REGION = os.environ.get("AWS_REGION", "us-east-2")
S3_PUBLIC_URL = os.environ.get("S3_PUBLIC_URL", "")

USE_S3 = all([S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_PUBLIC_URL])

# ★ Vercel 上 BASE_DIR 是只读的，makedirs 会抛 OSError
#   用 try/except 包住，避免 import 时直接崩
if not USE_S3:
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
    except OSError:
        pass

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".md"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


def _get_s3_client():
    # ★ 懒加载 boto3
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        region_name=S3_REGION,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ),
    )


async def save_upload(file: UploadFile) -> dict:
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

    if USE_S3:
        try:
            client = _get_s3_client()
            client.put_object(
                Bucket=S3_BUCKET,
                Key=new_filename,
                Body=contents,
                ContentType=file.content_type or "application/octet-stream",
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"S3 上传失败：{e}")
        url = f"{S3_PUBLIC_URL.rstrip('/')}/{new_filename}"
    else:
        file_path = os.path.join(UPLOAD_DIR, new_filename)
        try:
            with open(file_path, "wb") as f:
                f.write(contents)
        except OSError as e:
            raise HTTPException(status_code=500, detail=f"本地写入失败：{e}")
        url = f"/uploads/{new_filename}"

    return {"url": url, "name": filename}


def delete_upload_by_url(url: str) -> None:
    if not url:
        return

    if USE_S3:
        prefix = S3_PUBLIC_URL.rstrip("/") + "/"
        if not url.startswith(prefix):
            return
        key = url[len(prefix):]
        try:
            client = _get_s3_client()
            client.delete_object(Bucket=S3_BUCKET, Key=key)
        except Exception as e:
            print(f"[uploads] S3 删除失败 {key}：{e}")
    else:
        if not url.startswith("/uploads/"):
            return
        fname = url[len("/uploads/"):]
        abs_path = os.path.join(UPLOAD_DIR, fname)
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
            except OSError as e:
                print(f"[uploads] 删除文件失败 {abs_path}：{e}")