from fastapi import FastAPI
import os

app = FastAPI(title="Epiphany Explain")

S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://localhost:9000')
S3_BUCKET = os.getenv('S3_BUCKET', 'epiphany-explain')

@app.get('/health')
async def health():
	return {"ok": True}

@app.get('/attention/{id}')
async def attention(id: str):
	return {"id": id, "heatmap_urls": [f"{S3_ENDPOINT}/{S3_BUCKET}/stub/{id}_attn.png"]}

@app.get('/tokens/{id}')
async def tokens(id: str):
	return {"id": id, "token_scores": [{"token":"a","score":0.5}]}
