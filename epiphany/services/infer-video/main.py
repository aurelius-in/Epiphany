from fastapi import FastAPI

app = FastAPI(title="Epiphany Infer Video")

@app.get('/health')
async def health():
	return {"ok": True}

@app.post('/infer/t2v')
async def t2v():
	return {"output_url": None}

@app.post('/infer/animate')
async def animate():
	return {"output_url": None}

@app.post('/infer/stylize')
async def stylize():
	return {"output_url": None}
