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
  STATUS=$(curl -sSf -H "X-API-Key: $API_KEY" "$API_BASE/v1/jobs/$JOB_ID?signed=1" | jq -r .status)
  echo "status=$STATUS"
  if [[ "$STATUS" == "completed" || "$STATUS" == "succeeded" ]]; then
    break
  fi
  sleep 2
done

echo "done"

echo "Video job..."
JOBV=$(curl -sSf -H "X-API-Key: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"prompt":"a test video","mode":0}' \
  "$API_BASE/v1/generate/video")
JOBV_ID=$(echo "$JOBV" | jq -r .id)
for i in {1..30}; do
  ST=$(curl -sSf -H "X-API-Key: $API_KEY" "$API_BASE/v1/jobs/$JOBV_ID?signed=1")
  echo "vstatus=$(echo "$ST" | jq -r .status)"
  if [[ "$(echo "$ST" | jq -r .outputUrl)" != "null" ]]; then break; fi
  sleep 2
done

echo "Edit job (upscale)..."
ED=$(curl -sSf -H "X-API-Key: $API_KEY" -H 'Content-Type: application/json' \
  -d "{\"imageUrl\": \"http://example.com/foo.png\", \"scale\": 2}" \
  "$API_BASE/v1/edit/upscale")
ED_ID=$(echo "$ED" | jq -r .id)
for i in {1..15}; do
  ST=$(curl -sSf -H "X-API-Key: $API_KEY" "$API_BASE/v1/jobs/$ED_ID?signed=1")
  echo "estatus=$(echo "$ST" | jq -r .status)"
  if [[ "$(echo "$ST" | jq -r .outputUrl)" != "null" ]]; then break; fi
  sleep 2
done

echo "assets..."
curl -sSf -H "X-API-Key: $API_KEY" "$API_BASE/v1/assets?signed=1&limit=5" | jq -r '.items[0].url' || true

echo "events..."
curl -sSf -H "X-API-Key: $API_KEY" "$API_BASE/v1/events?limit=5" | jq -r '.items[0].type' || true

echo "metrics..."
curl -sSf -H "X-API-Key: $API_KEY" "$API_BASE/v1/metrics" | jq .totals || true

echo "version..."
curl -sSf -H "X-API-Key: $API_KEY" "$API_BASE/v1/version" | jq . || true

echo "config..."
curl -sSf -H "X-API-Key: $API_KEY" "$API_BASE/v1/config" | jq . || true
