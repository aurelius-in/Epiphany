# Epiphany — AI Art Studio (Production-Ready)

Epiphany is a full‑stack AI art and video studio with image diffusion (SDXL), video generation (T2V, animate, stylize), post‑gen editing, explainability overlays, job queues with progress, and S3-backed asset storage.

## Stack
- Web: Next.js app (with static UI) in `apps/web/`
- API Gateway: Node 20/Express, Zod, Prisma, BullMQ in `services/api/`
- Workers/Services:
  - Image inference (SDXL, img2img, inpaint, ControlNet) `services/infer-image/`
  - Video inference (T2V/SVD/ModelScope stubs, animate, stylize) `services/infer-video/`
  - Editing (upscale, face restore, remove-bg, crop/resize, caption) `services/edit/`
  - Explainability (heatmap + token scores) `services/explain/`
- Storage: MinIO (S3‑compatible)
- Database: Postgres (Prisma ORM)
- Queue: Redis (BullMQ)
- SDK: TypeScript client in `packages/sdk/`
- CI: GitHub Actions builds + tests

## Quickstart (Docker Compose)
1) Copy and edit env
- Create `.env` at the repo root based on `.env.example` (minimal vars)

2) Start stack (GPU optional)
- With Makefile:
  - `make -C infra/compose up`
  - `make -C infra/compose logs`
- Or with Docker Compose directly:
  - `docker compose -f infra/compose/docker-compose.yml up -d`

3) Create MinIO buckets
- `make -C infra/compose create-buckets`

4) Open Web UI
- http://localhost:3000

5) Health and Smoke
- API health: http://localhost:4000/v1/health (or Web Health page `/health`)
- Smoke scripts: `ops/scripts/smoke.sh` or `ops/scripts/smoke.ps1`

## Key Features
- Diffusion: txt2img, img2img, inpaint, ControlNet (canny/depth/pose)
- Video: text→video, image→video (animate), stylize; fps/resolution/duration controls
- Editing: upscale (RealESRGAN optional), face restore (GFPGAN optional), remove-bg (rembg optional), crop/resize, caption
- Explainability: token scores + heatmap overlay; refresh endpoint
- Jobs & Progress: BullMQ + SSE streams; cancel/retry; queues page
- Safety: prompt gating in Safe mode, basic scoring; NSFW blur toggle in UI
- Storage: S3/MinIO with signed URLs; retention preview/run + daily schedule
- Metrics & Admin: metrics, events, assets CSV exports; rate limit headers; system/config endpoints

## Configuration
- See `docs/ENV.md` for all variables. Minimal `.env.example` is provided.
- Important flags: `API_KEY`, `ALLOW_NSWF`, `RETENTION_DAYS`, `ALLOWED_URL_PREFIXES`, S3/DB/Redis endpoints.

## API & SDK
- Browse endpoints: `/v1/_routes`, `/v1/config`, `/v1/metrics`
- TypeScript SDK: `packages/sdk/` (build: `pnpm -w --filter @epiphany/sdk build`)
  - Example usage: `ops/scripts/sdk-example.ts`

## Development
- Web dev: `pnpm -w --filter web dev`
- API dev: `pnpm -w --filter api dev`
- Python services: `uvicorn main:app --reload --port 8001` (per service)

## Notes
- Real model integrations are optional and guarded. GPU acceleration supported via `nvidia-container-toolkit`.
- Prompt modes: Safe (0), Research (1), NSFW (2). Safe mode rejects unsafe prompts unless `ALLOW_NSWF=true`.
- Retention deletes old DB rows and S3 objects when configured.

## License
MIT (see LICENSE)
