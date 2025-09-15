from fastapi import FastAPI
import os
from io import BytesIO
from PIL import Image
import boto3

app = FastAPI(title="Epiphany Infer Image")

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

@app.get('/health')
async def health():
	return {"ok": True}

@app.post('/infer/txt2img')
async def txt2img():
	# generate 64x64 black PNG as stub
	img = Image.new('RGB', (64, 64), color=(0, 0, 0))
	buf = BytesIO()
	img.save(buf, format='PNG')
	url = upload_png('stub/sample.png', buf)
	return {"output_url": url, "preview_urls": []}

@app.post('/infer/img2img')
async def img2img():
	return {"output_url": None, "preview_urls": []}

@app.post('/infer/inpaint')
async def inpaint():
	return {"output_url": None, "preview_urls": []}

@app.post('/infer/controlnet')
async def controlnet():
	return {"output_url": None, "preview_urls": []}
