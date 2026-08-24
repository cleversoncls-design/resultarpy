#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"
OUTPUT_FILE="${1:-}"

if [[ -z "$OUTPUT_FILE" ]]; then
  echo "Usage: $0 /path/to/backup.dump" >&2
  exit 2
fi
if [[ -e "$OUTPUT_FILE" ]]; then
  echo "Refusing to overwrite existing backup: $OUTPUT_FILE" >&2
  exit 2
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --format=custom --no-owner --dbname="$POSTGRES_DB" --username="$POSTGRES_USER"' > "$OUTPUT_FILE"
echo "Backup created: $OUTPUT_FILE"
