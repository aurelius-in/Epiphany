from fastapi import FastAPI

app = FastAPI(title="Epiphany Edit")

@app.get('/health')
async def health():
	return {"ok": True}

@app.post('/upscale')
async def upscale():
	return {"output_url": None}

@app.post('/restore-face')
async def restore_face():
	return {"output_url": None}

@app.post('/remove-bg')
async def remove_bg():
	return {"output_url": None}

@app.post('/crop')
async def crop():
	return {"output_url": None}

@app.post('/resize')
async def resize():
	return {"output_url": None}

@app.post('/caption')
async def caption():
	return {"caption": None}
