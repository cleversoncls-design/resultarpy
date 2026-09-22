#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/resultarpy/resultarpy}"
ENV_FILE="${PROJECT_DIR}/.env"
ADMIN_EMAIL="${ADMIN_EMAIL:-${INITIAL_ADMIN_EMAIL:-admin@empresa.local}}"
BACKUP_DIR="${BACKUP_DIR:-/home/resultarpy/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Arquivo .env não encontrado: ${ENV_FILE}" >&2
  exit 1
fi
mkdir -p "${BACKUP_DIR}"
cd "${PROJECT_DIR}"

compose() { docker compose --env-file "${ENV_FILE}" -f compose.yaml "$@"; }
env_value() { awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, "", $0); print $0; exit }' "${ENV_FILE}"; }
DB_USER="${DB_USER:-$(env_value POSTGRES_USER)}"
DB_NAME="${DB_NAME:-$(env_value POSTGRES_DB)}"
: "${DB_USER:?POSTGRES_USER não encontrado no .env}"
: "${DB_NAME:?POSTGRES_DB não encontrado no .env}"

ADMIN_EMAIL_SQL="${ADMIN_EMAIL//\\/\\\\}"
ADMIN_EMAIL_SQL="${ADMIN_EMAIL_SQL//\'/\'\'}"
ADMIN_ID="$(compose exec -T postgres psql -v ON_ERROR_STOP=1 -At -U "${DB_USER}" -d "${DB_NAME}" -c "select id from users where lower(trim(email)) = lower(trim('${ADMIN_EMAIL_SQL}')) and role = 'admin' limit 1;")"

if [[ -z "${ADMIN_ID}" ]]; then
  echo "Nenhum Administrador encontrado para ${ADMIN_EMAIL}. Limpeza cancelada." >&2
  exit 1
fi

BACKUP_FILE="${BACKUP_DIR}/controle_viagens_pre_reset_${STAMP}.dump"
compose exec -T postgres pg_dump -Fc -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE}"
chmod 600 "${BACKUP_FILE}"

compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" -v admin_id="${ADMIN_ID}" <<'SQL'
begin;

-- Revoga qualquer sessão que não pertença ao Administrador preservado.
delete from local_auth_sessions where user_id <> :'admin_id'::bigint;

-- Remove somente as credenciais locais dos demais usuários. As linhas em users
-- permanecem para preservar chaves estrangeiras e histórico operacional.
delete from local_auth_credentials where user_id <> :'admin_id'::bigint;

-- Garante que nenhum usuário sem credencial mantenha papel administrativo.
update users
set role = 'user', loginMethod = 'local-disabled', updatedAt = now()
where id <> :'admin_id'::bigint;

commit;
SQL

echo "Limpeza concluída com segurança."
echo "Administrador preservado: ${ADMIN_EMAIL} (id ${ADMIN_ID})"
echo "Backup: ${BACKUP_FILE}"
echo "Os registros de users foram preservados para não quebrar histórico e chaves estrangeiras; somente as credenciais e sessões não administrativas foram removidas."
compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" -c 'select id, email, role, "loginMethod" from users order by id desc;'
