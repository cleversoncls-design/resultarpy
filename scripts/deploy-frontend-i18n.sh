#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/resultarpy/resultarpy}"
DOWNLOAD_DIR="${DOWNLOAD_DIR:-/home/resultarpy/Descargas}"
ARCHIVE="${1:-${DOWNLOAD_DIR}/local-auth-update.tar.gz}"
ENV_FILE="${PROJECT_DIR}/.env"

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Pacote não encontrado: ${ARCHIVE}" >&2
  echo "Coloque local-auth-update.tar.gz em ${DOWNLOAD_DIR} ou informe o caminho como primeiro argumento." >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Arquivo .env não encontrado: ${ENV_FILE}" >&2
  exit 1
fi

cd "${PROJECT_DIR}"
EXPECTED_HASH="${EXPECTED_HASH:-}"
ACTUAL_HASH="$(sha256sum "${ARCHIVE}" | awk '{print $1}')"
echo "Pacote: ${ARCHIVE}"
echo "SHA-256: ${ACTUAL_HASH}"
if [[ -n "${EXPECTED_HASH}" && "${ACTUAL_HASH}" != "${EXPECTED_HASH}" ]]; then
  echo "SHA-256 divergente; atualização abortada." >&2
  exit 1
fi

cp "${ENV_FILE}" "${ENV_FILE}.backup-i18n-$(date +%Y%m%d-%H%M%S)"
tar -xzf "${ARCHIVE}" --exclude='./.env' --exclude='./.env.*' -C "${PROJECT_DIR}"

for required in "app/_layout.tsx" "app/(tabs)/index.tsx" "app/reports.tsx" "app/maintenance-report.tsx" "tests/e2e/web-flows.spec.ts"; do
  [[ -f "${PROJECT_DIR}/${required}" ]] || { echo "Arquivo ausente após extração: ${required}" >&2; exit 1; }
done

docker compose --env-file "${ENV_FILE}" -f compose.yaml config --quiet
docker compose --env-file "${ENV_FILE}" -f compose.yaml up -d --build --no-cache --force-recreate frontend

echo "Serviços após atualização:"
docker compose --env-file "${ENV_FILE}" -f compose.yaml ps
curl -fsSI --max-time 15 http://127.0.0.1:8080/login >/dev/null
echo "Frontend respondeu em http://127.0.0.1:8080/login"
