from fastapi import FastAPI, Request
import os
import boto3
from io import BytesIO
from PIL import Image
import hashlib
import random

app = FastAPI(title="Epiphany Edit")

S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://localhost:9000')
S3_BUCKET = os.getenv('S3_BUCKET', 'epiphany-outputs')
S3_REGION = os.getenv('S3_REGION', 'us-east-1')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', 'minioadmin')
S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', 'minioadmin')

s3 = boto3.client('s3', endpoint_url=S3_ENDPOINT, aws_access_key_id=S3_ACCESS_KEY, aws_secret_access_key=S3_SECRET_KEY, region_name=S3_REGION)

def upload_png(key: str, buf: BytesIO) -> str:
	buf.seek(0)
	s3.put_object(Bucket=S3_BUCKET, Key=key, Body=buf.getvalue(), ContentType='image/png')
	return f"{S3_ENDPOINT}/{S3_BUCKET}/{key}"

def make_image(width: int, height: int, color=(0,0,0)) -> BytesIO:
	img = Image.new('RGB', (width, height), color=color)
	buf = BytesIO()
	img.save(buf, format='PNG')
	return buf

def image_meta(buf: BytesIO, width: int, height: int):
	data = buf.getvalue()
	sha256 = hashlib.sha256(data).hexdigest()
	return {"width": width, "height": height, "bytes": len(data), "sha256": sha256}

@app.get('/health')
async def health():
	return {"ok": True}

@app.post('/upscale')
async def upscale(request: Request):
	_ = await request.json()
	buf = make_image(1024, 1024, color=(5,5,5))
	key = f"edit/upscale_{random.randint(0,1_000_000)}.png"
	url = upload_png(key, buf)
	return {"output_url": url, "image_meta": image_meta(buf, 1024, 1024)}

@app.post('/restore-face')
async def restore_face(request: Request):
	_ = await request.json()
	buf = make_image(512, 512, color=(7,7,7))
	key = f"edit/restore_{random.randint(0,1_000_000)}.png"
	url = upload_png(key, buf)
	return {"output_url": url, "image_meta": image_meta(buf, 512, 512)}

@app.post('/remove-bg')
async def remove_bg(request: Request):
	_ = await request.json()
	buf = make_image(640, 640, color=(0,0,0))
	key = f"edit/nobg_{random.randint(0,1_000_000)}.png"
	url = upload_png(key, buf)
	return {"output_url": url, "image_meta": image_meta(buf, 640, 640)}

@app.post('/crop')
async def crop(request: Request):
	_ = await request.json()
	buf = make_image(320, 240, color=(10,10,10))
	key = f"edit/crop_{random.randint(0,1_000_000)}.png"
	url = upload_png(key, buf)
	return {"output_url": url, "image_meta": image_meta(buf, 320, 240)}

@app.post('/resize')
async def resize(request: Request):
	_ = await request.json()
	buf = make_image(800, 600, color=(12,12,12))
	key = f"edit/resize_{random.randint(0,1_000_000)}.png"
	url = upload_png(key, buf)
	return {"output_url": url, "image_meta": image_meta(buf, 800, 600)}

@app.post('/caption')
async def caption(request: Request):
	_ = await request.json()
	return {"caption": "stub caption"}
