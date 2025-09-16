Epiphany — GPU VM Deployment Guide

Prereqs
- NVIDIA GPU with recent driver (e.g., 535+ on Ubuntu 22.04)
- Docker 24+ and nvidia-container-toolkit
- Git, curl

Install NVIDIA container toolkit (Ubuntu)
```
sudo apt update
sudo apt install -y curl gnupg2 ca-certificates lsb-release
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -fsSL https://nvidia.github.io/libnvidia-container/$(. /etc/os-release; echo $ID$VERSION_ID)/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt update && sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Verify GPU in Docker
```
docker run --rm --gpus all nvidia/cuda:12.1.1-base-ubuntu22.04 nvidia-smi
```

Environment
- Copy and fill `.env` based on README’s Environment section
- Ensure `S3_ENDPOINT`, `S3_BUCKET`, `DATABASE_URL`, `REDIS_URL`, `API_KEY` are set
- Optionally set `ALLOWED_URL_PREFIXES` to restrict remote fetch URLs

Compose (with GPUs)
```
make -C infra/compose up   # or: docker compose -f infra/compose/docker-compose.yml up -d --build
make -C infra/compose logs
```

Model weights
- Diffusers pipelines will pull weights on first run; ensure adequate disk space
- Use `HF_HOME` or `TRANSFORMERS_CACHE` envs to control cache location
- For SDXL: `stabilityai/stable-diffusion-xl-base-1.0` (base) and compatible refiners
- For SVD: `stabilityai/stable-video-diffusion-img2vid-xt`

Troubleshooting
- OOM (CUDA): lower resolution/steps or reduce batch; SDXL path falls back automatically
- No GPU detected: confirm `nvidia-smi` works in host and inside a CUDA container; restart Docker after toolkit install
- Slow downloads: pre-warm model cache or use a local HF cache mirror
- MinIO access: verify buckets exist and credentials in `.env` match

Sizing tips
- SDXL preview: 384–512px on 8–12GB VRAM; 768–1024px on 16–24GB VRAM
- Video (SVD): CPU-bound saving; GPU-bound frames; start with low FPS/res

Security
- Keep `API_KEY` secret; restrict `WEB_ORIGIN` and enable a reverse proxy with TLS in production
- Configure `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` and set `ALLOWED_URL_PREFIXES`


