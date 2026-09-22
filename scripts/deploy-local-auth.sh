#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/resultarpy/resultarpy}"
DEFAULT_ARCHIVE="/home/resultarpy/Descargas/local-auth-update.tar.gz"
FALLBACK_ARCHIVE="/home/resultarpy/local-auth-update.tar.gz"
if [[ -n "${1:-}" ]]; then
  ARCHIVE="$1"
elif [[ -f "${DEFAULT_ARCHIVE}" ]]; then
  ARCHIVE="${DEFAULT_ARCHIVE}"
else
  ARCHIVE="${FALLBACK_ARCHIVE}"
fi
ENV_FILE="${PROJECT_DIR}/.env"

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Pacote não encontrado: ${ARCHIVE}" >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Arquivo .env não encontrado: ${ENV_FILE}" >&2
  exit 1
fi

cd "${PROJECT_DIR}"
cp "${ENV_FILE}" "${ENV_FILE}.backup-local-auth-$(date +%Y%m%d-%H%M%S)"
tar -xzf "${ARCHIVE}" -C "${PROJECT_DIR}"

for required in server/local-auth.ts server/local-auth-routes.ts drizzle-pg/0007_colorful_quicksilver.sql app/login.tsx compose.yaml; do
  [[ -f "${PROJECT_DIR}/${required}" ]] || { echo "Arquivo ausente após extração: ${required}" >&2; exit 1; }
done

grep -q '^EXPO_PUBLIC_DEMO_MODE=false$' "${ENV_FILE}" || {
  echo "Defina EXPO_PUBLIC_DEMO_MODE=false no .env antes de continuar." >&2
  exit 1
}

grep -q '^INITIAL_ADMIN_EMAIL=' "${ENV_FILE}" || { echo "Defina INITIAL_ADMIN_EMAIL no .env." >&2; exit 1; }
grep -q '^INITIAL_ADMIN_PASSWORD=' "${ENV_FILE}" || { echo "Defina INITIAL_ADMIN_PASSWORD no .env." >&2; exit 1; }

docker compose --env-file "${ENV_FILE}" -f compose.yaml config --quiet
docker compose --env-file "${ENV_FILE}" -f compose.yaml up -d --build --force-recreate

echo "Serviços após atualização:"
docker compose --env-file "${ENV_FILE}" -f compose.yaml ps

echo "Bootstrap concluído. Após validar o primeiro login, remova INITIAL_ADMIN_PASSWORD do .env e recrie somente a API."
