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
    echo "⚠️  Archivo .env creado desde .env.example. Revisa las credenciales."
fi

echo "   Bajando servicios anteriores (si existen)..."
$COMPOSE_CMD down --remove-orphans 2>/dev/null || true

echo "   Construyendo e iniciando servicios..."
$COMPOSE_CMD up --build -d

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "📱 Accesos:"
echo "   Frontend PWA:     http://localhost"
echo "   Backend API:      http://localhost:4000"
echo "   MinIO Console:    http://localhost:9001  (minioadmin / minioadmin)"
echo ""
echo "🧪 Credenciales de prueba:"
echo "   Giver:  ana@example.com      / password123"
echo "   Taker:  carlos@example.com   / password123"
echo "   Both:   maria@example.com    / password123"
echo ""
echo "📊 Logs en tiempo real:"
echo "   $COMPOSE_CMD logs -f backend"
