from fastapi import FastAPI, Request
import os
from io import BytesIO
import boto3
import hashlib
import random
from typing import Optional
import numpy as np
import imageio
import requests

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

ALLOWED_URL_PREFIXES = [p.strip() for p in (os.getenv('ALLOWED_URL_PREFIXES') or '').split(',') if p.strip()]

def is_allowed_url(url: str) -> bool:
	if not url:
		return False
	if url.startswith('data:'):
		return True
	if not (url.startswith('http://') or url.startswith('https://')):
		return False
	if not ALLOWED_URL_PREFIXES:
		return True
	for p in ALLOWED_URL_PREFIXES:
		if url.startswith(p):
			return True
	return False

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

def try_t2v_with_svd(prompt: str, fps: int = 12, resolution: str = '576p') -> Optional[BytesIO]:
	pipe = load_svd()
	if pipe is None:
		return None
	try:
		# Generate simple frame sequence placeholder (solid color gradient) honoring fps/resolution
		w, h = (1024, 576) if resolution == '576p' else (1280, 720)
		num_frames = fps * 2  # ~2s clip
		frames = []
		for i in range(max(1, num_frames)):
			val = int(255 * (i / max(1, num_frames - 1)))
			frame = np.zeros((h, w, 3), dtype=np.uint8)
			frame[:, :, 0] = val
			frame[:, :, 1] = (255 - val)
			frame[:, :, 2] = 128
			frames.append(frame)
		buf = BytesIO()
		imageio.mimsave(buf, frames, format='FFMPEG', fps=fps)
		return buf
	except Exception:
		return None

@app.get('/health')
async def health():
	return {"ok": True, "model": MODEL_ID}

@app.post('/infer/t2v')
async def t2v(request: Request):
	body = await request.json()
	prompt = body.get('prompt', '')
	fps = int(body.get('fps') or 12)
	resolution = str(body.get('resolution') or '576p')
	raw = try_t2v_with_svd(prompt, fps=fps, resolution=resolution) or BytesIO()
	if raw.getbuffer().nbytes == 0:
		raw.write(b"Epiphany video stub")
	key = f"gen/t2v_{random.randint(0, 1_000_000)}.mp4"
	url = upload_bytes(key, raw, 'video/mp4')
	meta = bytes_meta(raw)
	return {"output_url": url, "model_hash": MODEL_ID, "duration_ms": 1, "video_meta": meta, "echo": {"prompt": prompt}}

@app.post('/infer/animate')
async def animate(request: Request):
	body = await request.json()
	src = body.get('sourceImageUrl')
	ctrl_bytes = None
	try:
		if src and is_allowed_url(src):
			import requests as rq
			r = rq.get(src, timeout=10); r.raise_for_status(); ctrl_bytes = r.content
	except Exception:
		ctrl_bytes = None
	# Build simple pan/zoom frames from source image
	frames = []
	try:
		from PIL import Image as PILImage
		import numpy as np
		if ctrl_bytes:
			im = PILImage.open(BytesIO(ctrl_bytes)).convert('RGB').resize((256,256))
			for i in range(24):
				scale = 1.0 + 0.15 * (i/23)
				w = int(256*scale); h = int(256*scale)
				im2 = im.resize((w,h))
				x0 = (w-256)//2; y0 = (h-256)//2
				crop = im2.crop((x0,y0,x0+256,y0+256))
				frames.append(np.array(crop))
		else:
			for i in range(24):
				val = int(255 * (i / 23))
				frame = np.zeros((256, 256, 3), dtype=np.uint8)
				frame[:, :, 0] = val
				frame[:, :, 1] = (255 - val)
				frame[:, :, 2] = 128
				frames.append(frame)
		buf = BytesIO(); imageio.mimsave(buf, frames, format='FFMPEG', fps=12)
	except Exception:
		buf = BytesIO(); buf.write(b"animate stub")
	key = f"gen/animate_{random.randint(0, 1_000_000)}.mp4"
	url = upload_bytes(key, buf, 'video/mp4')
	meta = bytes_meta(buf)
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
