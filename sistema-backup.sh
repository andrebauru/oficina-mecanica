#!/bin/bash
# Sistema de Backup Automático - Hirata Cars

set -euo pipefail

PROJECT_DIR="/var/www/hiratacars.jp"
BACKUP_BASE_DIR="${PROJECT_DIR}/backups"
BACKEND_DIR="${PROJECT_DIR}/backend"
UPLOADS_DIR="${BACKEND_DIR}/uploads"
ENV_FILE="${BACKEND_DIR}/.env"
DB_NAME="hirata_cars"

TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
TMP_DIR="${BACKUP_BASE_DIR}/tmp-${TIMESTAMP}"
FINAL_FILE="${BACKUP_BASE_DIR}/hirata-backup-${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_BASE_DIR}"
mkdir -p "${TMP_DIR}"

# Carrega variáveis do .env do backend (se existir)
if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASSWORD:-${DB_PASS:-}}"

echo "[1/5] Gerando dump do banco ${DB_NAME}..."
if [ -n "${DB_PASS}" ]; then
  mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" > "${TMP_DIR}/db-${DB_NAME}.sql"
else
  mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${DB_NAME}" > "${TMP_DIR}/db-${DB_NAME}.sql"
fi

echo "[2/5] Compactando uploads..."
if [ -d "${UPLOADS_DIR}" ]; then
  tar -czf "${TMP_DIR}/uploads.tar.gz" -C "${BACKEND_DIR}" uploads
fi

echo "[3/5] Copiando .env (quando presente)..."
if [ -f "${ENV_FILE}" ]; then
  cp "${ENV_FILE}" "${TMP_DIR}/.env"
fi

echo "[4/5] Gerando pacote final..."
tar -czf "${FINAL_FILE}" -C "${TMP_DIR}" .

echo "[5/5] Limpando temporários e backups antigos..."
rm -rf "${TMP_DIR}"
find "${BACKUP_BASE_DIR}" -type f -name "hirata-backup-*.tar.gz" -mtime +30 -delete

echo "✅ Backup concluído: ${FINAL_FILE}"
