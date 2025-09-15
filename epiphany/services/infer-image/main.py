from fastapi import FastAPI
import os
from io import BytesIO
from PIL import Image

app = FastAPI(title="Epiphany Infer Image")

S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://localhost:9000')
S3_BUCKET = os.getenv('S3_BUCKET', 'epiphany-outputs')

@app.get('/health')
async def health():
	return {"ok": True}

@app.post('/infer/txt2img')
async def txt2img():
	# generate 64x64 black PNG as stub
	img = Image.new('RGB', (64, 64), color=(0, 0, 0))
	buf = BytesIO()
	img.save(buf, format='PNG')
	buf.seek(0)
	# In a real impl, upload buf to S3/MinIO. Here, just return a URL path.
	key = 'stub/sample.png'
	return {"output_url": f"{S3_ENDPOINT.replace('http://','http://')}/{S3_BUCKET}/{key}", "preview_urls": []}

@app.post('/infer/img2img')
async def img2img():
	return {"output_url": None, "preview_urls": []}

@app.post('/infer/inpaint')
async def inpaint():
	return {"output_url": None, "preview_urls": []}

@app.post('/infer/controlnet')
async def controlnet():
	return {"output_url": None, "preview_urls": []}
