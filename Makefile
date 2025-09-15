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
