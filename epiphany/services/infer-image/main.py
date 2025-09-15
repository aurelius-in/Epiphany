from fastapi import FastAPI

app = FastAPI(title="Epiphany Infer Image")

@app.get('/health')
async def health():
    return {"ok": True}

@app.post('/infer/txt2img')
async def txt2img():
    return {"output_url": None, "preview_urls": []}

@app.post('/infer/img2img')
async def img2img():
    return {"output_url": None, "preview_urls": []}

@app.post('/infer/inpaint')
async def inpaint():
    return {"output_url": None, "preview_urls": []}

@app.post('/infer/controlnet')
async def controlnet():
    return {"output_url": None, "preview_urls": []}
