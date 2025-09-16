up:
	$(MAKE) -C epiphany/infra/compose up

down:
	$(MAKE) -C epiphany/infra/compose down

logs:
	$(MAKE) -C epiphany/infra/compose logs

api:
	cd epiphany/services/api && pnpm dev

web:
	cd epiphany/apps/web && pnpm dev

infer-image:
	cd epiphany/services/infer-image && uvicorn main:app --host 0.0.0.0 --port 8001

buckets:
	bash epiphany/ops/scripts/minio-buckets.sh

smoke:
	bash epiphany/ops/scripts/smoke.sh

smoke.ps:
	powershell -ExecutionPolicy Bypass -File epiphany/ops/scripts/smoke.ps1
