#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"
INPUT_FILE="${1:-}"

if [[ -z "$INPUT_FILE" || ! -f "$INPUT_FILE" ]]; then
  echo "Usage: $0 /path/to/backup.dump" >&2
  exit 2
fi
if [[ "${CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "Restore is destructive. Set CONFIRM_RESTORE=YES to continue." >&2
  exit 2
fi

case "$INPUT_FILE" in
  *.sql)
    docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql --dbname="$POSTGRES_DB" --username="$POSTGRES_USER" --set ON_ERROR_STOP=1' < "$INPUT_FILE"
    ;;
  *)
    cat "$INPUT_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --clean --if-exists --no-owner --dbname="$POSTGRES_DB" --username="$POSTGRES_USER"'
    ;;
esac

echo "Restore completed from: $INPUT_FILE"
