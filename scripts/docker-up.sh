#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"

exec docker compose -f "$COMPOSE_FILE" up -d --build "$@"
