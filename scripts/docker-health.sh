#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"

docker compose -f "$COMPOSE_FILE" ps

echo
for endpoint in "http://127.0.0.1:${FRONTEND_PORT:-8080}/healthz"; do
  curl --fail --silent --show-error "$endpoint" >/dev/null
  echo "healthy: $endpoint"
done
