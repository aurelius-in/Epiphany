from fastapi import FastAPI
import os
import boto3

app = FastAPI(title="Epiphany Explain")

S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://localhost:9000')
S3_BUCKET = os.getenv('S3_BUCKET', 'epiphany-explain')
S3_REGION = os.getenv('S3_REGION', 'us-east-1')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', 'minioadmin')
S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', 'minioadmin')

s3 = boto3.client('s3', endpoint_url=S3_ENDPOINT, aws_access_key_id=S3_ACCESS_KEY, aws_secret_access_key=S3_SECRET_KEY, region_name=S3_REGION)

@app.get('/health')
async def health():
	return {"ok": True}

@app.get('/attention/{id}')
async def attention(id: str):
	return {"id": id, "heatmap_urls": [f"{S3_ENDPOINT}/{S3_BUCKET}/stub/{id}_attn.png"]}

@app.get('/tokens/{id}')
async def tokens(id: str):
	return {"id": id, "token_scores": [{"token":"a","score":0.5}]}
