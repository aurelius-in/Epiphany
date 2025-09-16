from fastapi import FastAPI, Request
import os
from io import BytesIO
from PIL import Image
import boto3
import hashlib
import random
import requests

app = FastAPI(title="Epiphany Infer Image")

S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://localhost:9000')
S3_BUCKET = os.getenv('S3_BUCKET', 'epiphany-outputs')
S3_REGION = os.getenv('S3_REGION', 'us-east-1')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', 'minioadmin')
S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', 'minioadmin')

MODEL_ID = os.getenv('MODEL_ID', 'sdxl-base')

s3 = boto3.client('s3', endpoint_url=S3_ENDPOINT, aws_access_key_id=S3_ACCESS_KEY, aws_secret_access_key=S3_SECRET_KEY, region_name=S3_REGION)

_pipe = None
_diffusers_available = False
try:
    from diffusers import StableDiffusionXLPipeline
    import torch
    _diffusers_available = True
except Exception:
    _diffusers_available = False

# Optional safety checker (best-effort)
_safety_available = False
try:
    from transformers import AutoFeatureExtractor  # type: ignore
    from diffusers.pipelines.stable_diffusion.safety_checker import StableDiffusionSafetyChecker  # type: ignore
    _safety_available = True
except Exception:
    _safety_available = False

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

def make_image(width: int, height: int, color=(0, 0, 0)) -> BytesIO:
	img = Image.new('RGB', (width, height), color=color)
	buf = BytesIO()
	img.save(buf, format='PNG')
	return buf

def image_meta(buf: BytesIO, width: int, height: int):
	data = buf.getvalue()
	sha256 = hashlib.sha256(data).hexdigest()
	return {
		"width": width,
		"height": height,
		"bytes": len(data),
		"sha256": sha256,
	}

def simple_safety_from_prompt(prompt: str):
	p = (prompt or '').lower()
	nsfw_keywords = ['nsfw', 'nude', 'nudity', 'explicit', 'adult']
	score = 1.0 if any(k in p for k in nsfw_keywords) else 0.0
	return {"nsfw": score}

def safety_score_image(img: Image.Image) -> float:
    if not _safety_available:
        return 0.0
    try:
        from numpy import array as np_array  # type: ignore
        extractor = AutoFeatureExtractor.from_pretrained("CompVis/stable-diffusion-safety-checker")
        checker = StableDiffusionSafetyChecker.from_pretrained("CompVis/stable-diffusion-safety-checker")
        arr = np_array(img.convert('RGB'))[None, :]
        inputs = extractor(arr, return_tensors="pt")
        _, has_nsfw_concepts = checker(images=arr, clip_input=inputs.pixel_values)
        if isinstance(has_nsfw_concepts, list) and len(has_nsfw_concepts) > 0:
            return 1.0 if any(bool(x) for x in has_nsfw_concepts) else 0.0
        if isinstance(has_nsfw_concepts, (int, float)):
            return float(has_nsfw_concepts)
        return 0.0
    except Exception:
        return 0.0

def choose_dims(aspect: str | None, preview: bool | None):
	if aspect not in ["1:1", "16:9", "9:16", "3:2", "2:3"]:
		aspect = "1:1"
	base = 384 if preview else 768
	if aspect == "1:1":
		return base, base
	if aspect == "16:9":
		return base * 16 // 9, base
	if aspect == "9:16":
		return base, base * 16 // 9
	if aspect == "3:2":
		return base * 3 // 2, base
	if aspect == "2:3":
		return base, base * 3 // 2
	return base, base

def load_pipe():
    global _pipe
    if _pipe is not None:
        return _pipe
    if not _diffusers_available:
        return None
    try:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        _pipe = StableDiffusionXLPipeline.from_pretrained(
            os.getenv('SDXL_MODEL', 'stabilityai/stable-diffusion-xl-base-1.0'),
            torch_dtype=torch.float16 if device == 'cuda' else torch.float32
        )
        if device == 'cuda':
            _pipe = _pipe.to(device)
        return _pipe
    except Exception:
        return None

def try_generate_with_diffusers(prompt: str, width: int, height: int, steps: int, cfg: float) -> BytesIO | None:
    pipe = load_pipe()
    if pipe is None:
        return None
    try:
        g = pipe(prompt=prompt, num_inference_steps=max(1, min(steps, 20)), guidance_scale=max(1.0, min(cfg, 12.0)), height=height, width=width)
        im = g.images[0]
        buf = BytesIO()
        im.save(buf, format='PNG')
        return buf
    except Exception:
        return None

def fetch_bytes(url: str) -> bytes | None:
    try:
        if not is_allowed_url(url):
            return None
        if url and (url.startswith('http://') or url.startswith('https://')):
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            return r.content
    except Exception:
        return None
    return None

@app.get('/health')
async def health():
	return {"ok": True, "model": MODEL_ID}

@app.post('/infer/txt2img')
async def txt2img(request: Request):
	body = await request.json()
	prompt = body.get('prompt', '')
	steps = int(body.get('steps', 20))
	cfg = float(body.get('cfg', 7.0))
	aspect = body.get('aspect')
	preview = bool(body.get('preview', False))
	mode = int(body.get('mode', 1))
	w, h = choose_dims(aspect, preview)
	attempt = 0
	while True:
		try:
			buf = try_generate_with_diffusers(prompt, w, h, steps, cfg) or make_image(w, h, color=(0, 0, 0))
			break
		except RuntimeError:
			attempt += 1
			if attempt > 2:
				raise
			w //= 2
			h //= 2
	key = f"gen/txt2img_{random.randint(0, 1_000_000)}.png"
	url = upload_png(key, buf)
	meta = image_meta(buf, w, h)
	safety = simple_safety_from_prompt(prompt)
	try:
		buf.seek(0)
		img_chk = Image.open(buf).convert('RGB')
		score_img = safety_score_image(img_chk)
		safety["nsfw"] = max(float(safety.get("nsfw", 0.0)), float(score_img))
	except Exception:
		pass
	previews = []
	if mode != 2 and safety.get('nsfw', 0) > 0:
		red = make_image(64, 64, color=(64, 64, 64))
		pkey = f"gen/redacted_{random.randint(0, 1_000_000)}.png"
		purl = upload_png(pkey, red)
		previews = [purl]
	return {"output_url": url, "preview_urls": previews, "model_hash": MODEL_ID, "duration_ms": 1, "safety_scores": safety, "image_meta": meta, "echo": {"prompt": prompt, "steps": steps, "cfg": cfg}}

@app.post('/infer/img2img')
async def img2img(request: Request):
	body = await request.json()
	prompt = body.get('prompt', '')
	init_url = body.get('initImageUrl')
	aspect = body.get('aspect')
	preview = bool(body.get('preview', False))
	mode = int(body.get('mode', 1))
	w, h = choose_dims(aspect, preview)
	buf = make_image(w, h, color=(10, 10, 10))
	key = f"gen/img2img_{random.randint(0, 1_000_000)}.png"
	url = upload_png(key, buf)
	meta = image_meta(buf, w, h)
	safety = simple_safety_from_prompt(prompt)
	try:
		buf.seek(0)
		img_chk = Image.open(buf).convert('RGB')
		score_img = safety_score_image(img_chk)
		safety["nsfw"] = max(float(safety.get("nsfw", 0.0)), float(score_img))
	except Exception:
		pass
	previews = []
	if mode != 2 and safety.get('nsfw', 0) > 0:
		red = make_image(64, 64, color=(64, 64, 64))
		pkey = f"gen/redacted_{random.randint(0, 1_000_000)}.png"
		purl = upload_png(pkey, red)
		previews = [purl]
	init_bytes = fetch_bytes(init_url or '')
	return {"output_url": url, "preview_urls": previews, "safety_scores": safety, "image_meta": meta, "echo": {"initImageUrl": init_url, "initImageBytes": bool(init_bytes)}}

@app.post('/infer/inpaint')
async def inpaint(request: Request):
	body = await request.json()
	prompt = body.get('prompt', '')
	mask_url = body.get('maskUrl')
	aspect = body.get('aspect')
	preview = bool(body.get('preview', False))
	mode = int(body.get('mode', 1))
	w, h = choose_dims(aspect, preview)
	buf = make_image(w, h, color=(20, 20, 20))
	key = f"gen/inpaint_{random.randint(0, 1_000_000)}.png"
	url = upload_png(key, buf)
	meta = image_meta(buf, w, h)
	safety = simple_safety_from_prompt(prompt)
	try:
		buf.seek(0)
		img_chk = Image.open(buf).convert('RGB')
		score_img = safety_score_image(img_chk)
		safety["nsfw"] = max(float(safety.get("nsfw", 0.0)), float(score_img))
	except Exception:
		pass
	previews = []
	if mode != 2 and safety.get('nsfw', 0) > 0:
		red = make_image(64, 64, color=(64, 64, 64))
		pkey = f"gen/redacted_{random.randint(0, 1_000_000)}.png"
		purl = upload_png(pkey, red)
		previews = [purl]
	mask_bytes = fetch_bytes(mask_url or '')
	return {"output_url": url, "preview_urls": previews, "safety_scores": safety, "image_meta": meta, "echo": {"maskUrl": mask_url, "maskBytes": bool(mask_bytes)}}

@app.post('/infer/controlnet')
async def controlnet(request: Request):
	body = await request.json()
	prompt = body.get('prompt', '')
	ctrl = body.get('controlnet', {})
	ctype = ctrl.get('type')
	aspect = body.get('aspect')
	preview = bool(body.get('preview', False))
	mode = int(body.get('mode', 1))
	w, h = choose_dims(aspect, preview)
	buf = make_image(w, h, color=(30, 30, 30))
	key = f"gen/controlnet_{ctype or 'none'}_{random.randint(0, 1_000_000)}.png"
	url = upload_png(key, buf)
	meta = image_meta(buf, w, h)
	safety = simple_safety_from_prompt(prompt)
	try:
		buf.seek(0)
		img_chk = Image.open(buf).convert('RGB')
		score_img = safety_score_image(img_chk)
		safety["nsfw"] = max(float(safety.get("nsfw", 0.0)), float(score_img))
	except Exception:
		pass
	previews = []
	if mode != 2 and safety.get('nsfw', 0) > 0:
		red = make_image(64, 64, color=(64, 64, 64))
		pkey = f"gen/redacted_{random.randint(0, 1_000_000)}.png"
		purl = upload_png(pkey, red)
		previews = [purl]
	return {"output_url": url, "preview_urls": previews, "safety_scores": safety, "image_meta": meta, "echo": {"controlnet": ctrl}}
