Epiphany — Environment Variables

Core
- API_PORT: port for API (default 4000)
- API_KEY: required for all requests (X-API-Key)
- WEB_ORIGIN: CORS allow origin for web UI
- ALLOW_NSWF: true/false to allow NSFW mode 2
- RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS: basic rate limit

Datastores
- DATABASE_URL: Postgres connection string
- REDIS_URL: Redis connection string

Object Storage (MinIO/S3)
- S3_ENDPOINT: e.g., http://minio:9000
- S3_REGION: e.g., us-east-1
- S3_BUCKET: main outputs bucket
- S3_INPUTS_BUCKET: inputs bucket (optional; falls back to S3_BUCKET)
- S3_ACCESS_KEY / S3_SECRET_KEY: credentials

Workers
- INFER_IMAGE_PORT, INFER_VIDEO_PORT, EDIT_PORT, EXPLAIN_PORT
- SDXL_MODEL, SVD_MODEL: optional overrides for model IDs

Security
- ALLOWED_URL_PREFIXES: comma-separated list of allowed URL prefixes for remote fetch (e.g., http://minio:9000/,https://your-cdn/)

Notes
- If `ALLOWED_URL_PREFIXES` is empty, HTTP fetch is allowed for any http(s) URL. Set it in production.
- For local dev via compose, use the service names in endpoints (e.g., `minio`, `postgres`, `redis`).

