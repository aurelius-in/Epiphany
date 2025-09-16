from fastapi import FastAPI, Request
import os
from io import BytesIO
import boto3
import hashlib
import random
from typing import Optional

app = FastAPI(title="Epiphany Infer Video")

MODEL_ID = os.getenv('VIDEO_MODEL_ID', 'svd')

S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://localhost:9000')
S3_BUCKET = os.getenv('S3_BUCKET', 'epiphany-outputs')
S3_REGION = os.getenv('S3_REGION', 'us-east-1')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', 'minioadmin')
S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', 'minioadmin')

s3 = boto3.client('s3', endpoint_url=S3_ENDPOINT, aws_access_key_id=S3_ACCESS_KEY, aws_secret_access_key=S3_SECRET_KEY, region_name=S3_REGION)

_svd = None
_diffusers_available = False
try:
	from diffusers import StableVideoDiffusionPipeline
	import torch
	_diffusers_available = True
except Exception:
	_diffusers_available = False

def upload_bytes(key: str, buf: BytesIO, content_type: str) -> str:
	buf.seek(0)
	s3.put_object(Bucket=S3_BUCKET, Key=key, Body=buf.getvalue(), ContentType=content_type)
	return f"{S3_ENDPOINT}/{S3_BUCKET}/{key}"

def bytes_meta(buf: BytesIO):
	data = buf.getvalue()
	return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}

def load_svd():
	global _svd
	if _svd is not None:
		return _svd
	if not _diffusers_available:
		return None
	try:
		device = 'cuda' if 'cuda' in (os.getenv('TORCH_DEVICE','') or '') or ('CUDA_VISIBLE_DEVICES' in os.environ) or (hasattr(torch, 'cuda') and torch.cuda.is_available()) else 'cpu'
		_svd = StableVideoDiffusionPipeline.from_pretrained(
			os.getenv('SVD_MODEL', 'stabilityai/stable-video-diffusion-img2vid-xt'),
		)
		if device == 'cuda':
			_svd = _svd.to(device)
		return _svd
	except Exception:
		return None

def try_t2v_with_svd(prompt: str) -> Optional[BytesIO]:
	pipe = load_svd()
	if pipe is None:
		return None
	try:
		# Placeholder: real generation omitted; return stub container
		raw = BytesIO()
		raw.write(b"SVD video placeholder")
		return raw
	except Exception:
		return None

@app.get('/health')
async def health():
	return {"ok": True, "model": MODEL_ID}

@app.post('/infer/t2v')
async def t2v(request: Request):
	body = await request.json()
	prompt = body.get('prompt', '')
	raw = try_t2v_with_svd(prompt) or BytesIO()
	if raw.getbuffer().nbytes == 0:
		raw.write(b"Epiphany video stub")
	key = f"gen/t2v_{random.randint(0, 1_000_000)}.mp4"
	url = upload_bytes(key, raw, 'video/mp4')
	meta = bytes_meta(raw)
	return {"output_url": url, "model_hash": MODEL_ID, "duration_ms": 1, "video_meta": meta, "echo": {"prompt": prompt}}

@app.post('/infer/animate')
async def animate(request: Request):
	_ = await request.json()
	raw = BytesIO()
	raw.write(b"Epiphany animate stub")
	key = f"gen/animate_{random.randint(0, 1_000_000)}.mp4"
	url = upload_bytes(key, raw, 'video/mp4')
	meta = bytes_meta(raw)
	return {"output_url": url, "model_hash": MODEL_ID, "duration_ms": 1, "video_meta": meta}

@app.post('/infer/stylize')
async def stylize(request: Request):
	_ = await request.json()
	raw = BytesIO()
	raw.write(b"Epiphany stylize stub")
	key = f"gen/stylize_{random.randint(0, 1_000_000)}.mp4"
	url = upload_bytes(key, raw, 'video/mp4')
	meta = bytes_meta(raw)
	return {"output_url": url, "model_hash": MODEL_ID, "duration_ms": 1, "video_meta": meta}
