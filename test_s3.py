import boto3
from botocore.config import Config

client = boto3.client(
    "s3",
    endpoint_url="https://br-tiny-rain-b4m3uojn.storage.c-2.us-east-2.aws.neon.tech",
    aws_access_key_id="nak_live_d7060da5ccce47509d808bc16842f6ea",
    aws_secret_access_key="nsk_live_e9a590e8c4557b07604a32ffe6722ae83a7f139f718d8fbc3bc1ab7141b6514a",
    region_name="us-east-2",
    config=Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},  # ★ 加这行
    ),
)

client.put_object(
    Bucket="my-blog",
    Key="test.txt",
    Body=b"hello from neon storage",
    ContentType="text/plain",
)
print("上传成功")