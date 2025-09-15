Epiphany AI Art Studio — Full-Stack Diffusion + Video

A production‑ready, demo‑friendly AI art studio for images and video.

- Frontend: Next.js 14 + Tailwind (or static UI served via public/index.html)
- API Gateway: Node 20 + Express + Zod + Prisma + BullMQ + S3/MinIO
- Inference Workers (GPU): Python FastAPI + PyTorch + Diffusers (SDXL, ControlNet)
- Video: Python FastAPI + Stable Video Diffusion / ModelScope T2V (pluggable)
- Editing: Real‑ESRGAN, GFPGAN, rembg, PIL/OpenCV ops
- Explainability: attention maps, token attributions, safety scores
- Infra: Postgres, Redis, MinIO, Docker Compose (GPU via nvidia‑container‑toolkit)

---

## What you can do
- Text→Image (SDXL base/refiner), Img2Img, Inpainting
- ControlNet (canny, depth, pose)
- Text→Video, Image→Video (pan/zoom), Stylize a video
- Post‑gen edits: Upscale, Restore face, Remove background, Crop/Resize, Caption
- Prompt enhancement, presets, seeds, steps/CFG, aspect ratios
- Safe ↔ Research ↔ NSFW modes honored end‑to‑end
- Job queue with progress, previews, resumable history/gallery
- Explainability overlays (attention heatmaps, token scores)
- Full audit logs (prompts/params/model hash/safety/timings)

---

## Monorepo layout
```
epiphany/
  apps/
    web/                 # Next.js UI or static index.html/css in public/
  services/
    api/                 # Express API (Zod, Prisma, BullMQ, S3 SDK)
    infer-image/         # FastAPI + Diffusers (SDXL, img2img, inpaint, ControlNet)
    infer-video/         # FastAPI + T2V adapter (SVD/ModelScope)
    edit/                # FastAPI editing tools (Real-ESRGAN, GFPGAN, rembg, PIL)
    explain/             # FastAPI explainability (attention maps, token scores)
  packages/
    sdk/                 # TypeScript SDK + Zod schemas for /v1 endpoints
  infra/
    compose/             # docker-compose.yml + .env.example + Makefile
  ops/
    prisma/              # schema.prisma + migrations
    scripts/             # smoke tests, seeding
  assets/
    logos/               # epiphany.gif, gen-ai.gif
    test/                # sample inputs
```

---

## APIs (contract overview)
Headers: `X-API-Key: <string>`, `Content-Type: application/json`

- POST `/v1/enhance` → `{ prompt }` → `{ promptEnhanced, seedPhrases[] }`
- POST `/v1/generate/image` → txt2img/img2img/inpaint/controlnet
- POST `/v1/generate/video` → text→video, animate, stylize
- POST `/v1/edit/*` → upscale, restore-face, remove-bg, crop, resize
- GET  `/v1/jobs/:id` → `{ status, progress, outputUrl, previewUrls[], explainId }`
- GET  `/v1/generations` → recent history
- GET  `/v1/explain/:id` → token scores + heatmap URLs
- GET  `/v1/health` → `{ ok, services:{db,redis,s3} }`

All request/response bodies are typed and validated with Zod (SDK included).

---

## Data model (Prisma)
- Generation: kind(image|video), status, prompts, mode(0|1|2), steps/cfg/seed, modelId/hash, controlnet params, input images, outputs, previews, safety, timings, errors
- Asset: url, kind, mime, dims, bytes, sha256
- Explain: generationId, tokenScores JSON, heatmapUrls[]
- Event: generationId, type, payload JSON, createdAt

---

## Infra and storage
- Postgres (Prisma)
- Redis (BullMQ queues: generate_image, generate_video, edit_image, explain)
- MinIO (S3 buckets): `epiphany-outputs`, `epiphany-inputs`, `epiphany-explain`
- Docker Compose with GPU services (nvidia runtime)

---

## Getting started (local)
1) Install prerequisites
- Node 20, pnpm
- Python 3.11, CUDA‑compatible GPU + NVIDIA driver
- Docker + nvidia‑container‑toolkit

2) Bootstrap
```
pnpm install
```

3) Env and compose
```
cp infra/compose/.env.example .env
# edit values for db/redis/s3/api key
make -C infra/compose up   # or: docker compose -f infra/compose/docker-compose.yml up -d --build
```

4) Prisma
```
cd services/api
pnpm prisma:generate && pnpm prisma:migrate dev
```

5) Run services (dev)
```
# API
cd services/api && pnpm dev

# Python workers (examples)
uvicorn main:app --host 0.0.0.0 --port 8001   # infer-image
uvicorn main:app --host 0.0.0.0 --port 8002   # infer-video
uvicorn main:app --host 0.0.0.0 --port 8003   # edit
uvicorn main:app --host 0.0.0.0 --port 8004   # explain
```

6) Web
- Next.js app in `apps/web` serves the existing static UI via `public/index.html` and exposes a `/gallery` page.

7) Health
```
curl -H "X-API-Key: dev" http://localhost:4000/v1/health
```

---

## Modes and safety
- Mode 0: Safe — run safety checker, block/blur disallowed content
- Mode 1: Research — run checker, allow output, log scores
- Mode 2: NSFW — skip checker (logged as bypassed)

This flag propagates from API → workers → outputs and logs.

---

## Explainability
- Capture cross‑attention maps during diffusion
- Compute simple token attributions
- Save heatmaps (PNG) and scores (JSON) to S3
- Expose via `/v1/explain/:id` and overlay in UI

---

## SDK
- `packages/sdk`: Zod schemas and a small TS client for all `/v1` endpoints

---

## Deployment notes
- GPU: ensure NVIDIA driver + nvidia‑container‑toolkit
- Single‑box deploy: A10/A100 recommended; adjust compose resource limits
- OOM fallback: workers auto‑reduce steps/resolution once and retry
- Logs: minimal request/latency logging; OpenTelemetry hooks stubbed

---

## Color system (UI)
- Background `#000`
- Panels `#151517` / `#101012`
- Border `#26262a`
- Text `#e6e6ea`, Muted `#a4a4ad`
- Brand gradient: `#FF007A → #7A00FF → #FF6A00`
- Mode slider: Safe `#6bd17d`, Research `#f0b153`, NSFW `#FF007A`

---

## License
MIT — research/education/portfolio. See audit and safety sections when deploying.
