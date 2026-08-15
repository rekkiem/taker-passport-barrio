#!/bin/bash
# Backup de la base de datos con rotación simple: conserva los últimos 7
# backups diarios y los últimos 4 backups del domingo (semanales).
#
# Instalar como cron del usuario de despliegue (crontab -e):
#   0 3 * * * /home/taker/taker-passport-barrio/scripts/backup-db.sh >> /home/taker/backups/backup.log 2>&1
#
# Restaurar con scripts/restore-db.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
DATE=$(date +%Y-%m-%d)
DOW=$(date +%u)  # 1=lunes ... 7=domingo

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

cd "$REPO_ROOT/docker"
if command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD="docker compose"
fi

CONTAINER=$($COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml ps -q postgres)
if [ -z "$CONTAINER" ]; then
  echo "❌ No encontré el contenedor de postgres corriendo. ¿Está el stack levantado?"
  exit 1
fi

DB_USER=taker
OUT_FILE="$BACKUP_DIR/daily/taker_${DATE}.sql.gz"

echo "📦 Respaldando base de datos ($DATE)..."
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d taker --clean --if-exists | gzip > "$OUT_FILE"
echo "   ✓ Guardado en $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

# Copia semanal los domingos
if [ "$DOW" -eq 7 ]; then
  cp "$OUT_FILE" "$BACKUP_DIR/weekly/taker_semana_${DATE}.sql.gz"
  echo "   ✓ Copia semanal guardada."
fi

# Rotación: conserva 7 diarios y 4 semanales
find "$BACKUP_DIR/daily" -name "taker_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR/weekly" -name "taker_semana_*.sql.gz" -mtime +28 -delete

echo "✅ Backup completo."
