from fastapi import FastAPI, Request
import os

app = FastAPI(title="Epiphany Infer Video")

MODEL_ID = os.getenv('VIDEO_MODEL_ID', 'svd')

@app.get('/health')
async def health():
	return {"ok": True, "model": MODEL_ID}

@app.post('/infer/t2v')
async def t2v(request: Request):
	body = await request.json()
	prompt = body.get('prompt', '')
	return {"output_url": None, "echo": {"prompt": prompt}}

@app.post('/infer/animate')
async def animate(request: Request):
	_ = await request.json()
	return {"output_url": None}

@app.post('/infer/stylize')
async def stylize(request: Request):
	_ = await request.json()
	return {"output_url": None}
