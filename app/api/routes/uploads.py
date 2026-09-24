# 文件名：app/api/routes/uploads.py
# 文件上传接口

from fastapi import APIRouter, File, UploadFile

from ...files.uploads import save_upload

router = APIRouter(tags=["uploads"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """上传一个文件，返回 {url, name}。"""
    return await save_upload(file)