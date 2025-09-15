#!/usr/bin/env bash
set -euo pipefail
MC=${MC:-mc}
ENDPOINT=${S3_ENDPOINT:-http://localhost:9000}
ACCESS=${S3_ACCESS_KEY:-minioadmin}
SECRET=${S3_SECRET_KEY:-minioadmin}

$MC alias set local "$ENDPOINT" "$ACCESS" "$SECRET"
$MC mb -p local/epiphany-outputs || true
$MC mb -p local/epiphany-inputs || true
$MC mb -p local/epiphany-explain || true
