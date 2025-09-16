from fastapi import FastAPI, Request
import os
import boto3
from io import BytesIO
from PIL import Image, ImageFilter, ImageEnhance
import hashlib
import random
import base64
from typing import Tuple
import requests

app = FastAPI(title="Epiphany Edit")

S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://localhost:9000')
S3_BUCKET = os.getenv('S3_BUCKET', 'epiphany-outputs')
S3_REGION = os.getenv('S3_REGION', 'us-east-1')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', 'minioadmin')
S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', 'minioadmin')

s3 = boto3.client('s3', endpoint_url=S3_ENDPOINT, aws_access_key_id=S3_ACCESS_KEY, aws_secret_access_key=S3_SECRET_KEY, region_name=S3_REGION)

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

def fetch_image(url: str) -> Tuple[Image.Image, int, int]:
	if url and url.startswith('data:image/') and ';base64,' in url:
		head, b64 = url.split(',', 1)
		raw = base64.b64decode(b64)
		im = Image.open(BytesIO(raw)).convert('RGBA')
		return im, im.width, im.height
	if url and (url.startswith('http://') or url.startswith('https://')) and is_allowed_url(url):
		try:
			r = requests.get(url, timeout=10)
			r.raise_for_status()
			im = Image.open(BytesIO(r.content)).convert('RGBA')
			return im, im.width, im.height
		except Exception:
			pass
	# Placeholder: return a gray image
	im = Image.new('RGBA', (512, 512), (64,64,64,255))
	return im, im.width, im.height

# Optional integrations
_rembg_available = False
try:
	from rembg import remove as rembg_remove  # type: ignore
	_rembg_available = True
except Exception:
	_rembg_available = False

_realesrgan_available = False
_gfpgan_available = False
try:  # lazy optional wrappers; will be instantiated on demand
	from realesrgan import RealESRGAN  # type: ignore
	import torch  # type: ignore
	# Enable cuDNN autotune on CUDA
	try:
		if torch.cuda.is_available():
			torch.backends.cudnn.benchmark = True
	except Exception:
		pass
	_realesrgan_available = True
except Exception:
	_realesrgan_available = False
try:
	from gfpgan import GFPGANer  # type: ignore
	_gfpgan_available = True
except Exception:
	_gfpgan_available = False

@app.get('/health')
async def health():
	return {"ok": True}

@app.post('/upscale')
async def upscale(request: Request):
	body = await request.json()
	image_url = body.get('imageUrl')
	scale = int(body.get('scale', 2))
	im, w, h = fetch_image(image_url or '')
	new_w, new_h = max(1, w*scale), max(1, h*scale)
	res = im.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)
	# Try RealESRGAN if available and scale is 4
	if _realesrgan_available and scale in (2,4):
		try:
			device_env = os.getenv('TORCH_DEVICE', '').strip().lower()
			if device_env in ('cuda','gpu') and 'CUDA_VISIBLE_DEVICES' not in os.environ:
				os.environ['CUDA_VISIBLE_DEVICES'] = '0'
			device = 'cuda' if (device_env in ('cuda','gpu')) or ('CUDA_VISIBLE_DEVICES' in os.environ) or ('TORCH_CUDA' in os.environ) or (hasattr(torch, 'cuda') and torch.cuda.is_available()) else 'cpu'
			model = RealESRGAN(torch.device(device), scale)
			# model weights load is environment-dependent; guard with try/except
			try:
				model.load_weights('weights/RealESRGAN_x4plus.pth', download=True)
			except Exception:
				pass
			res = model.enhance(im.convert('RGB'))[0].convert('RGBA')
		except Exception:
			pass
	buf = BytesIO(); res.convert('RGBA').save(buf, format='PNG')
	key = f"edit/upscale_{random.randint(0,1_000_000)}.png"
	url = upload_png(key, buf)
	return {"output_url": url, "image_meta": image_meta(buf, new_w, new_h)}

@app.post('/restore-face')
async def restore_face(request: Request):
	body = await request.json()
	image_url = body.get('imageUrl')
	im, w, h = fetch_image(image_url or '')
	res = ImageEnhance.Contrast(ImageEnhance.Sharpness(im).enhance(1.5)).enhance(1.1)
	# Try GFPGAN if available
	if _gfpgan_available:
		try:
			device_env = os.getenv('TORCH_DEVICE', '').strip().lower()
			if device_env in ('cuda','gpu') and 'CUDA_VISIBLE_DEVICES' not in os.environ:
				os.environ['CUDA_VISIBLE_DEVICES'] = '0'
			restorer = GFPGANer(model_path=None, upscale=1, arch='clean', channel_multiplier=2, bg_upsampler=None)
			_, _, restored = restorer.enhance(im.convert('RGB'), has_aligned=False, only_center_face=False, paste_back=True)
			res = restored.convert('RGBA') if hasattr(restored, 'convert') else res
		except Exception:
			pass
	buf = BytesIO(); res.convert('RGBA').save(buf, format='PNG')
	key = f"edit/restore_{random.randint(0,1_000_000)}.png"
	url = upload_png(key, buf)
	return {"output_url": url, "image_meta": image_meta(buf, w, h)}

@app.post('/remove-bg')
async def remove_bg(request: Request):
	body = await request.json()
	image_url = body.get('imageUrl')
	im, w, h = fetch_image(image_url or '')
	if _rembg_available:
		try:
			rgba = im.convert('RGBA')
			removed = rembg_remove(rgba)
			im = removed if isinstance(removed, Image.Image) else rgba
		except Exception:
			# fallback heuristic for dark bg
			px = im.load()
			for y in range(im.height):
				for x in range(im.width):
					r,g,b,a = px[x,y]
					if r < 20 and g < 20 and b < 20: px[x,y] = (r,g,b,0)
	else:
		px = im.load()
		for y in range(im.height):
			for x in range(im.width):
				r,g,b,a = px[x,y]
				if r < 20 and g < 20 and b < 20: px[x,y] = (r,g,b,0)
	buf_out = BytesIO(); im.save(buf_out, format='PNG')
	key = f"edit/nobg_{random.randint(0,1_000_000)}.png"
	url = upload_png(key, buf_out)
	return {"output_url": url, "image_meta": image_meta(buf_out, w, h)}

@app.post('/crop')
async def crop(request: Request):
	body = await request.json()
	image_url = body.get('imageUrl')
	x = int(body.get('x', 0)); y = int(body.get('y', 0)); w = int(body.get('w', 0)); h = int(body.get('h', 0))
	im, iw, ih = fetch_image(image_url or '')
	x2, y2 = max(0, min(iw, x+w)), max(0, min(ih, y+h))
	x1, y1 = max(0, min(iw, x)), max(0, min(ih, y))
	if x2 <= x1 or y2 <= y1:
		res = im
	else:
		res = im.crop((x1, y1, x2, y2))
	buf = BytesIO(); res.convert('RGBA').save(buf, format='PNG')
	key = f"edit/crop_{random.randint(0,1_000_000)}.png"
	url = upload_png(key, buf)
	return {"output_url": url, "image_meta": image_meta(buf, res.width, res.height)}

@app.post('/resize')
async def resize(request: Request):
	body = await request.json()
	image_url = body.get('imageUrl')
	width = max(1, int(body.get('width', 0)))
	height = max(1, int(body.get('height', 0)))
	im, iw, ih = fetch_image(image_url or '')
	res = im.resize((width, height), resample=Image.Resampling.LANCZOS)
	buf = BytesIO(); res.convert('RGBA').save(buf, format='PNG')
	key = f"edit/resize_{random.randint(0,1_000_000)}.png"
	url = upload_png(key, buf)
	return {"output_url": url, "image_meta": image_meta(buf, width, height)}

@app.post('/caption')
async def caption(request: Request):
	body = await request.json()
	# Placeholder caption: based on random and hash
	text = f"A generated image #{random.randint(1000,9999)}"
	return {"caption": text}
