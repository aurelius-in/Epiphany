from fastapi import FastAPI
import os
import boto3

app = FastAPI(title="Epiphany Edit")

S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://localhost:9000')
S3_BUCKET = os.getenv('S3_BUCKET', 'epiphany-outputs')
S3_REGION = os.getenv('S3_REGION', 'us-east-1')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', 'minioadmin')
S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', 'minioadmin')

s3 = boto3.client('s3', endpoint_url=S3_ENDPOINT, aws_access_key_id=S3_ACCESS_KEY, aws_secret_access_key=S3_SECRET_KEY, region_name=S3_REGION)

@app.get('/health')
async def health():
	return {"ok": True}

@app.post('/upscale')
async def upscale():
	return {"output_url": f"{S3_ENDPOINT}/{S3_BUCKET}/stub/upscaled.png"}

@app.post('/restore-face')
async def restore_face():
	return {"output_url": f"{S3_ENDPOINT}/{S3_BUCKET}/stub/restored.png"}

@app.post('/remove-bg')
async def remove_bg():
	return {"output_url": f"{S3_ENDPOINT}/{S3_BUCKET}/stub/nobg.png"}

@app.post('/crop')
async def crop():
	return {"output_url": f"{S3_ENDPOINT}/{S3_BUCKET}/stub/crop.png"}

@app.post('/resize')
async def resize():
	return {"output_url": f"{S3_ENDPOINT}/{S3_BUCKET}/stub/resize.png"}

@app.post('/caption')
async def caption():
	return {"caption": "stub caption"}
