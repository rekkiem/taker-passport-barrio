#!/bin/bash
# Despliegue de producción en el VPS. Correr como el usuario de despliegue
# (no root) después de vultr-provision.sh, parado en la raíz del repo:
#
#   ./scripts/deploy-prod.sh tudominio.cl
#
# Qué hace:
#   1. Genera docker/.env con secretos aleatorios (si no existe) y ajusta
#      FRONTEND_URL / MINIO_PUBLIC_URL al dominio real
#   2. Levanta el stack con docker-compose.yml + docker-compose.prod.yml
#      (todo detrás de 127.0.0.1, nada expuesto directo a internet salvo
#      lo que el Nginx del host decida)
#   3. Instala la config de Nginx del host apuntando al dominio
#   4. Corre certbot para HTTPS (si el DNS ya apunta a este servidor)

set -e

DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
  echo "❌ Uso: ./scripts/deploy-prod.sh tudominio.cl"
  exit 1
fi

if command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD="docker compose"
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/docker"

echo "🚀 Desplegando Taker Passport Barrio en producción — dominio: $DOMAIN"

if [ ! -f .env ]; then
  cp .env.example .env
  NEW_JWT=$(openssl rand -hex 32)
  NEW_DB_PASS=$(openssl rand -hex 16)
  NEW_MINIO_PASS=$(openssl rand -hex 16)
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_JWT}/" .env
  sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${NEW_DB_PASS}/" .env
  sed -i "s/^MINIO_PASSWORD=.*/MINIO_PASSWORD=${NEW_MINIO_PASS}/" .env
  echo "🔐 docker/.env creado con secretos generados aleatoriamente."
else
  echo "   docker/.env ya existe, no se regeneran secretos (evita romper sesiones activas)."
fi

sed -i "s#^FRONTEND_URL=.*#FRONTEND_URL=https://${DOMAIN}#" .env
# MINIO_PUBLIC_URL se deja como está a propósito: los documentos de
# verificación (cédula + selfie) son datos sensibles y el bucket es privado
# por defecto (no hay política pública configurada, ver backend/src/services/
# minio.service.ts). Ninguna ruta de la API expone hoy esa URL a un cliente.
# Si más adelante se construye un panel de administración para revisar
# verificaciones, usa URLs prefirmadas de corta duración (minioClient.
# presignedGetObject), nunca un bucket público — ver docs/DEPLOY_VULTR.md.

echo "   Construyendo e iniciando servicios (esto puede tardar varios minutos la primera vez)..."
$COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "   Esperando a que el backend responda en /health..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:4000/health > /dev/null; then
    echo "   ✓ Backend saludable."
    break
  fi
  sleep 2
done

echo "🌐 Configurando Nginx del host para $DOMAIN..."
sudo sed "s/__DOMAIN__/${DOMAIN}/g" "$REPO_ROOT/deploy/nginx-host.conf.template" | sudo tee /etc/nginx/sites-available/taker-passport-barrio > /dev/null
sudo ln -sf /etc/nginx/sites-available/taker-passport-barrio /etc/nginx/sites-enabled/taker-passport-barrio
sudo rm -f /etc/nginx/sites-enabled/default
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ Stack levantado y Nginx configurado en HTTP."
echo ""
echo "Antes de pedir el certificado HTTPS, confirma que el DNS de $DOMAIN"
echo "ya apunta a la IP de este servidor: $(curl -s ifconfig.me)"
echo ""
read -p "¿El DNS ya está apuntando aquí? Corro certbot ahora [s/N]: " CONFIRM
if [[ "$CONFIRM" =~ ^[sS]$ ]]; then
  sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --redirect -m "admin@${DOMAIN}" --agree-tos --non-interactive || \
    echo "⚠️  Certbot falló. Revisa el DNS y corre manualmente: sudo certbot --nginx -d $DOMAIN"
else
  echo "   Cuando el DNS esté listo, corre manualmente:"
  echo "     sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

echo ""
echo "📊 Logs en tiempo real:"
echo "   cd docker && $COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml logs -f backend"
