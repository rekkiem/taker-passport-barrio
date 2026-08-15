#!/bin/bash
# Restaura un backup generado por backup-db.sh.
# USO: ./scripts/restore-db.sh /home/taker/backups/daily/taker_2026-08-13.sql.gz
#
# ⚠️  Esto reemplaza todos los datos actuales de la base. Úsalo con cuidado.

set -e

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Uso: ./scripts/restore-db.sh /ruta/al/backup.sql.gz"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/docker"

if command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD="docker compose"
fi

CONTAINER=$($COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml ps -q postgres)
if [ -z "$CONTAINER" ]; then
  echo "❌ No encontré el contenedor de postgres corriendo."
  exit 1
fi

echo "⚠️  Esto va a REEMPLAZAR todos los datos actuales de la base 'taker'."
read -p "Escribe RESTAURAR para confirmar: " CONFIRM
if [ "$CONFIRM" != "RESTAURAR" ]; then
  echo "Cancelado."
  exit 0
fi

echo "📥 Restaurando desde $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U taker -d taker

echo "✅ Restauración completa."
