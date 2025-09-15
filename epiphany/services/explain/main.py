from fastapi import FastAPI

app = FastAPI(title="Epiphany Explain")

@app.get('/health')
async def health():
	return {"ok": True}

@app.get('/attention/{id}')
async def attention(id: str):
	return {"id": id, "heatmap_urls": []}

@app.get('/tokens/{id}')
async def tokens(id: str):
	return {"id": id, "token_scores": []}
