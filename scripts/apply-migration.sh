#!/bin/bash
# Aplica una migración nueva a una base de datos que YA está corriendo.
# Necesario porque Postgres solo ejecuta los scripts de
# /docker-entrypoint-initdb.d/ la primera vez que el volumen está vacío —
# si tu despliegue ya tiene datos, una migración nueva (ej. database/
# migrations/002_mercadopago.sql) no se aplica sola con un simple rebuild.
#
# USO:
#   ./scripts/apply-migration.sh database/migrations/002_mercadopago.sql
#
# Detecta automáticamente si el stack está corriendo en modo dev o prod.

set -e

MIGRATION_FILE="$1"
if [ -z "$MIGRATION_FILE" ] || [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Uso: ./scripts/apply-migration.sh database/migrations/00X_archivo.sql"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/docker"

if command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD="docker compose"
fi

# Prueba primero el overlay de producción; si no hay contenedor corriendo ahí,
# usa el de desarrollo.
CONTAINER=$($COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml ps -q postgres 2>/dev/null)
if [ -z "$CONTAINER" ]; then
  CONTAINER=$($COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml ps -q postgres 2>/dev/null)
fi
if [ -z "$CONTAINER" ]; then
  echo "❌ No encontré el contenedor de postgres corriendo (ni en modo dev ni prod)."
  exit 1
fi

echo "📦 Aplicando $(basename "$MIGRATION_FILE") a la base de datos..."
docker exec -i "$CONTAINER" psql -U taker -d taker < "$MIGRATION_FILE"
echo "✅ Migración aplicada."
