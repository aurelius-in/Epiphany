# Epiphany AI Art Studio

![Epiphany Logo](epiphany.gif)

> **Epiphany AI Art Studio** is a self-hosted image generation platform built with SDXL and ControlNet, offering a Next.js UI, FastAPI GPU worker, prompt enhancement, presets, inpainting/outpainting, and safe vs. research modes — all backed by Redis jobs, S3 storage, and audit-ready logs.

---

## ✨ Features

- **Text-to-Image (SDXL)** — high-quality generations with seeds, steps, CFG, and aspect ratios  
- **Image-to-Image & Variations** — upload an input image and generate new versions  
- **Inpainting / Outpainting** — mask regions for edits or expand beyond original borders  
- **ControlNet Guidance** — reference-based depth, edge, or pose conditioning  
- **Prompt Enhancement** — enrich short prompts using GPT for cinematic, styled outputs  
- **Style Presets** — one-click “Cinematic,” “Noir,” “Watercolor,” and more  
- **Safe / Research Modes** — toggle between filtered outputs or unrestricted generation  
- **Audit Logging** — track prompt, seed, params, model hash, duration, and output URL  
- **Batch Jobs** — run multiple generations via Redis queue, monitor status with polling  
- **Gallery & History** — browse, share, and recreate previous generations  

---

## 🖥 Architecture

apps/web       → Next.js 14 + Tailwind UI
services/api   → Express + BullMQ + Prisma + S3 storage
services/infer → FastAPI + Diffusers (SDXL, Inpainting, ControlNet)
packages/sdk   → Lightweight TS client for job/enhance APIs
infra/compose  → Docker Compose for Postgres, Redis, MinIO

- **Queue:** Redis (BullMQ) for job scheduling  
- **Database:** Postgres via Prisma for audit logs  
- **Storage:** S3/MinIO for outputs  
- **Worker:** GPU-accelerated inference service (PyTorch, Diffusers)  

---

## 🚀 Getting Started

1. **Clone repo & install deps**
   ```bash
   git clone https://github.com/yourname/epiphany-ai-art-studio.git
   cd epiphany-ai-art-studio
   pnpm install

2. Run infra (DB, Redis, MinIO)

docker compose -f infra/compose/docker-compose.yaml up -d


3. Migrate database

cd services/api
pnpm prisma:migrate dev


4. Run inference worker (GPU required)

cd services/infer
uvicorn server:app --host 0.0.0.0 --port 8000


5. Run API

cd services/api
pnpm dev


6. Run web app

cd apps/web
pnpm dev


Open http://localhost:3000 to start creating.

---

🎨 Branding

Primary Gradient: Hot Pink #FF007A → Purple #7A00FF → Orange #FF6A00

Background: Black / Charcoal (#0A0A0A)

Buttons: .bg-epiphany-gradient text-white rounded-xl shadow-md

Headings: .text-epiphany-gradient



---

📊 Roadmap

[ ] Vector export (SVG trace)

[ ] Multi-image batch uploader

[ ] Collaboration boards & sharing

[ ] Video / audio generation extensions


---

📜 License

MIT — for research, educational, and portfolio purposes.
