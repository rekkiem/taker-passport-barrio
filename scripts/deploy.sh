#!/bin/bash
set -e

echo "🚀 Desplegando Taker Passport Barrio..."

# Detectar comando de compose disponible
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ No se encontró docker-compose ni 'docker compose'."
    echo "   Instala Docker Desktop con la integración WSL2 activada."
    exit 1
fi

echo "   Usando: $COMPOSE_CMD"

# Verificar que Docker responde
if ! docker info &> /dev/null; then
    echo "❌ Docker Desktop no responde. Asegúrate de que esté abierto."
    exit 1
fi

cd "$(dirname "$0")/../docker"

if [ ! -f .env ]; then
    cp .env.example .env
    # Genera secretos aleatorios en vez de dejar los valores públicos del .env.example
    if command -v openssl &> /dev/null; then
        NEW_JWT=$(openssl rand -hex 32)
        NEW_DB_PASS=$(openssl rand -hex 16)
        NEW_MINIO_PASS=$(openssl rand -hex 16)
        sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_JWT}/" .env
        sed -i.bak "s/^DB_PASSWORD=.*/DB_PASSWORD=${NEW_DB_PASS}/" .env
        sed -i.bak "s/^MINIO_PASSWORD=.*/MINIO_PASSWORD=${NEW_MINIO_PASS}/" .env
        rm -f .env.bak
        echo "🔐 Archivo .env creado con secretos generados aleatoriamente."
    else
        echo "⚠️  Archivo .env creado desde .env.example. openssl no está disponible:"
        echo "   CAMBIA MANUALMENTE JWT_SECRET, DB_PASSWORD y MINIO_PASSWORD antes de exponer a internet."
    fi
fi

echo "   Bajando servicios anteriores (si existen)..."
$COMPOSE_CMD down --remove-orphans 2>/dev/null || true

echo "   Construyendo e iniciando servicios..."
$COMPOSE_CMD up --build -d

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "📱 Accesos:"
echo "   Frontend PWA:     http://localhost:8080"
echo "   Backend API:      http://localhost:4000"
echo "   MinIO Console:    http://localhost:9001  (minioadmin / minioadmin)"
echo "   Evolution API:    http://localhost:8081"
echo ""
echo "🧪 Credenciales de prueba:"
echo "   Giver:  ana@example.com      / password123"
echo "   Taker:  carlos@example.com   / password123"
echo "   Both:   maria@example.com    / password123"
echo ""
echo "📊 Logs en tiempo real:"
echo "   $COMPOSE_CMD logs -f backend"
