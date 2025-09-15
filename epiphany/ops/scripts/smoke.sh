#!/usr/bin/env bash
set -euo pipefail
API_BASE="${API_BASE:-http://localhost:4000}"
API_KEY="${API_KEY:-dev}"

curl -sSf -H "X-API-Key: $API_KEY" "$API_BASE/v1/health" | jq . || true

JOB=$(curl -sSf -H "X-API-Key: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"prompt":"a test image","mode":0}' \
  "$API_BASE/v1/generate/image")
JOB_ID=$(echo "$JOB" | jq -r .id)

echo "Job: $JOB_ID"

for i in {1..30}; do
  STATUS=$(curl -sSf -H "X-API-Key: $API_KEY" "$API_BASE/v1/jobs/$JOB_ID" | jq -r .status)
  echo "status=$STATUS"
  if [[ "$STATUS" == "completed" || "$STATUS" == "succeeded" ]]; then
    break
  fi
  sleep 2
done

echo "done"
