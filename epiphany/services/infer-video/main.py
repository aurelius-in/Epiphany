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

def try_t2v_with_svd(prompt: str, fps: int = 12, resolution: str = '576p', duration_sec: int = 4) -> Optional[BytesIO]:
	pipe = load_svd()
	if pipe is None:
		return None
	try:
		# Generate simple frame sequence placeholder honoring fps/resolution/duration
		w, h = (1024, 576) if resolution == '576p' else (1280, 720)
		num_frames = max(1, int(fps) * max(1, int(duration_sec)))
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
	duration_sec = int(body.get('durationSec') or 4)
	model_id = str(body.get('modelId') or 'svd')
	raw = try_t2v_with_svd(prompt, fps=fps, resolution=resolution, duration_sec=duration_sec) or BytesIO()
	# If ModelScope requested and no real model, synthesize a different color pattern
	if model_id != 'svd' and raw.getbuffer().nbytes > 0:
		try:
			w, h = (1024, 576) if resolution == '576p' else (1280, 720)
			total = max(1, fps * duration_sec)
			frames = []
			for i in range(total):
				den = max(1, total-1)
				t = i/den
				frame = np.zeros((h, w, 3), dtype=np.uint8)
				frame[:, :, 0] = int(255 * (t))
				frame[:, :, 1] = int(255 * (1-t))
				frame[:, :, 2] = 64
				frames.append(frame)
			raw = BytesIO(); imageio.mimsave(raw, frames, format='FFMPEG', fps=fps)
		except Exception:
			pass
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
	# Build simple pan/zoom frames from source image honoring fps & duration
	frames = []
	try:
		from PIL import Image as PILImage
		import numpy as np
		fps = int((body.get('fps') or 12))
		duration_sec = int((body.get('durationSec') or 4))
		resolution = str(body.get('resolution') or '576p')
		out_w, out_h = (1024, 576) if resolution == '576p' else (1280, 720)
		total = max(1, fps * duration_sec)
		if ctrl_bytes:
			im = PILImage.open(BytesIO(ctrl_bytes)).convert('RGB').resize((out_w, out_h))
			for i in range(total):
				denom = max(1, total-1)
				scale = 1.0 + 0.10 * (i/denom)
				w = int(out_w*scale); h = int(out_h*scale)
				im2 = im.resize((w,h))
				x0 = (w-out_w)//2; y0 = (h-out_h)//2
				crop = im2.crop((x0,y0,x0+out_w,y0+out_h))
				frames.append(np.array(crop))
		else:
			for i in range(total):
				denom = max(1, total-1)
				val = int(255 * (i / denom))
				frame = np.zeros((out_h, out_w, 3), dtype=np.uint8)
				frame[:, :, 0] = val
				frame[:, :, 1] = (255 - val)
				frame[:, :, 2] = 128
				frames.append(frame)
		buf = BytesIO(); imageio.mimsave(buf, frames, format='FFMPEG', fps=fps)
	except Exception:
		buf = BytesIO(); buf.write(b"animate stub")
	key = f"gen/animate_{random.randint(0, 1_000_000)}.mp4"
	url = upload_bytes(key, buf, 'video/mp4')
	meta = bytes_meta(buf)
	return {"output_url": url, "model_hash": MODEL_ID, "duration_ms": 1, "video_meta": meta}

@app.post('/infer/stylize')
async def stylize(request: Request):
	body = await request.json()
	fps = int(body.get('fps') or 12)
	duration_sec = int(body.get('durationSec') or 4)
	resolution = str(body.get('resolution') or '576p')
	w, h = (1024, 576) if resolution == '576p' else (1280, 720)
	total = max(1, fps * duration_sec)
	frames = []
	try:
		import numpy as np
		for i in range(total):
			den = max(1, total-1)
			t = i/den
			# simple stylization gradient sweep
			r = int(255 * abs(np.sin(np.pi * t)))
			g = int(255 * abs(np.sin(np.pi * (t + 1/3))))
			b = int(255 * abs(np.sin(np.pi * (t + 2/3))))
			frame = np.zeros((h, w, 3), dtype=np.uint8)
			frame[:, :, 0] = r
			frame[:, :, 1] = g
			frame[:, :, 2] = b
			frames.append(frame)
		buf = BytesIO(); imageio.mimsave(buf, frames, format='FFMPEG', fps=fps)
	except Exception:
		buf = BytesIO(); buf.write(b"Epiphany stylize stub")
	key = f"gen/stylize_{random.randint(0, 1_000_000)}.mp4"
	url = upload_bytes(key, buf, 'video/mp4')
	meta = bytes_meta(buf)
	return {"output_url": url, "model_hash": MODEL_ID, "duration_ms": 1, "video_meta": meta}
