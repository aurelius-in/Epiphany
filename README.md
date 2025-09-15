
![Epiphany Logo](epiphany.gif)

<a href='https://aurelius-in.github.io/Epiphany/'> View UI </a>

**Epiphany AI Art Studio** is a self-hosted image‑generation stack powered by SDXL and ControlNet with a Next.js UI and a FastAPI GPU worker, featuring prompt enhancement, style presets, txt2img/img2img/inpainting, Safe vs Research modes, Redis jobs, S3 storage, and audit‑ready logs.

---

## ✨ Features
- **Text‑to‑Image (SDXL)** with seeds, steps, CFG, aspect ratios
- **Image‑to‑Image & Variations**
- **Inpainting / Outpainting** (mask upload)
- **ControlNet Guidance** (depth/edge/pose)
- **Prompt Enhancement** (LLM‑assisted)
- **Style Presets** (one‑click looks)
- **Safe / Research Modes** (toggle safety checker)
- **Audit Logging** (prompt, params, model hash, duration, URL)
- **Batch Jobs** via Redis queue
- **Gallery & History** with “Recreate” params

---

## 🖥 Architecture

```
epiphany/
  apps/web/          # Next.js 14 + Tailwind UI
  services/api/      # Express API + BullMQ + Prisma + S3/MinIO
  services/infer/    # FastAPI + Diffusers (SDXL, Inpainting, ControlNet)
  packages/sdk/      # Tiny TS client for /enhance and /jobs
  infra/compose/     # docker-compose for Postgres, Redis, MinIO
  ops/migrations/    # Prisma migrations
```
```mermaid
flowchart LR
  UI["Next.js UI"] -->|REST: /enhance, /jobs| API["Express API"]
  UI -->|Poll: /jobs/:id| API
  API -->|enqueue| Q[(Redis Queue)]
  Q -->|pull job| WKR["GPU Inference Worker\n(FastAPI + Diffusers)"]
  WKR -->|PNG URL| S3[(S3/MinIO)]
  API --> DB[(Postgres \n Audit Logs)]
```
- **Queue:** Redis (BullMQ) for job scheduling
- **Database:** Postgres via Prisma for audit logs
- **Storage:** S3/MinIO for outputs
- **Worker:** GPU‑accelerated inference service (PyTorch, Diffusers)

---

## 🚀 Getting Started

1) **Run infra (DB, Redis, MinIO)**
```bash
docker compose -f infra/compose/docker-compose.yaml up -d
```

2) **Migrate database**
```bash
cd services/api
pnpm prisma:migrate dev
```

3) **Run inference worker (GPU required)**
```bash
cd services/infer
uvicorn server:app --host 0.0.0.0 --port 8000
```

4) **Run API**
```bash
cd services/api
pnpm dev
```

5) **Run Web**
```bash
cd apps/web
pnpm dev
```
Open http://localhost:3000

---

## ⚙️ Environment

Copy `.env.example` to `.env` and fill as needed:
```
API_PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/epiphany
REDIS_URL=redis://localhost:6379
S3_REGION=us-east-1
S3_BUCKET=epiphany-outputs
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
PUBLIC_BASE_URL=http://localhost:4000
OPENAI_API_KEY=

INFER_PORT=8000
INFER_MODEL=stabilityai/stable-diffusion-xl-base-1.0
INFER_USE_SAFETY=true
```

---

## 🎨 Branding

- Gradient: **#FF007A → #7A00FF → #FF6A00**
- Background: **#0A0A0A** (black/charcoal)

Add utilities to your global CSS:
```css
.bg-epiphany-gradient {
  background: linear-gradient(90deg, #FF007A 0%, #7A00FF 50%, #FF6A00 100%);
}
.text-epiphany-gradient {
  background: linear-gradient(90deg, #FF007A 0%, #7A00FF 50%, #FF6A00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 📊 Roadmap
- Vector export (SVG trace)
- Multi‑image batch uploader
- Collaboration boards & sharing
- Basic video extensions

---

## 📜 License
MIT — for research, education, and portfolio use.
- **Audit Logging** (prompt, params, model hash, duration, URL)  
- **Batch Jobs** via Redis queue  
- **Gallery & History** with “Recreate” params

## 🖥 Architecture

```
epiphany/
  apps/web/          # Next.js 14 + Tailwind UI
  services/api/      # Express API + BullMQ + Prisma + S3/MinIO
  services/infer/    # FastAPI + Diffusers (SDXL, Inpainting, ControlNet)
  packages/sdk/      # Tiny TS client for /enhance and /jobs
  infra/compose/     # docker-compose for Postgres, Redis, MinIO
  ops/migrations/    # Prisma migrations
```

```mermaid
flowchart LR
  UI["Next.js Web"] -->|REST /enhance, /jobs| API["Express API"]
  API -->|enqueue| Q[("Redis Queue")]
  WKR["GPU Inference Worker (FastAPI + Diffusers)"] --> S3[("S3/MinIO")]
  Q -->|pull job| WKR
  API --> DB[("Postgres")]
  UI -->|poll /jobs/:id| API
```

## 🚀 Getting Started

1. **Infra**
   ```bash
   docker compose -f infra/compose/docker-compose.yaml up -d
   ```
2. **Migrate DB**
   ```bash
   cd services/api
   pnpm prisma:migrate dev
   ```
3. **Run GPU Worker**
   ```bash
   cd services/infer
   uvicorn server:app --host 0.0.0.0 --port 8000
   ```
4. **Run API**
   ```bash
   cd services/api
   pnpm dev
   ```
5. **Run Web**
   ```bash
   cd apps/web
   pnpm dev
   ```
Open http://localhost:3000

## 🎨 Branding

- Gradient: **#FF007A → #7A00FF → #FF6A00**  
- Background: **#0A0A0A** (black/charcoal)  
- Use `bg-epiphany-gradient` for buttons, `text-epiphany-gradient` for headings.

## 📊 Roadmap
- Vector export (SVG trace)  
- Multi-image batch uploader  
- Collaboration boards & sharing  
- Basic video extensions

## 📜 License
MIT — for research, education, and portfolio use.
- **Prompt Enhancement** — enrich short prompts using GPT for cinematic, styled outputs  
- **Style Presets** — one-click “Cinematic,” “Noir,” “Watercolor,” and more  
- **Safe / Research Modes** — toggle between filtered outputs or unrestricted generation  
- **Audit Logging** — track prompt, seed, params, model hash, duration, and output URL  
- **Batch Jobs** — run multiple generations via Redis queue, monitor status with polling  
- **Gallery & History** — browse, share, and recreate previous generations  

---

## 🖥 Architecture

```text

epiphany/
  apps/web/          # Next.js 14 + Tailwind UI
  services/api/      # Express API + BullMQ + Prisma + S3/MinIO
  services/infer/    # FastAPI + Diffusers (SDXL, Inpainting, ControlNet)
  packages/sdk/      # Tiny TS client for /enhance and /jobs
  infra/compose/     # docker-compose for Postgres, Redis, MinIO
  ops/migrations/    # Prisma migrations

```

```Mermaid

flowchart LR
  UI[Next.js Web] -->|REST /enhance, /jobs| API[Express API]
  API -->|enqueue| Q[(Redis Queue)]
  WKR[GPU Inference Worker (FastAPI + Diffusers)] --> S3[(S3/MinIO)]
  Q -->|pull job| WKR
  API --> DB[(Postgres)]
  UI -->|poll /jobs/:id| API
```

```

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
