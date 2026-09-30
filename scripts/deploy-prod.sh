#!/bin/bash
# Despliegue de producción. Seguro de correr tanto en un droplet nuevo y
# dedicado como en un VPS que YA tiene otros sitios corriendo (ej. junto a
# Divinittys): no borra configuración de Nginx ajena, y el puerto interno
# del frontend es configurable para evitar chocar con otros servicios.
#
#   ./scripts/deploy-prod.sh <dominio> [puerto_app] [email_contacto]
#
# Ejemplos:
#   ./scripts/deploy-prod.sh taker-passport-barrio.netxia.cl
#   ./scripts/deploy-prod.sh taker-passport-barrio.netxia.cl 8090 contacto@netxia.cl
#
# Qué hace:
#   1. Genera docker/.env con secretos aleatorios (si no existe) y ajusta
#      FRONTEND_URL / BACKEND_PUBLIC_URL / APP_PORT al dominio y puerto reales
#   2. Levanta el stack con docker-compose.yml + docker-compose.prod.yml
#      (todo detrás de 127.0.0.1, nada expuesto directo a internet salvo
#      lo que el Nginx del host decida)
#   3. Agrega un bloque de Nginx del host NUEVO para este dominio, sin tocar
#      la configuración de otros sitios que ya estén en el servidor
#   4. Corre certbot solo para este dominio (si el DNS ya apunta aquí)

set -e

DOMAIN="$1"
APP_PORT="${2:-8080}"
CONTACT_EMAIL="${3:-}"

if [ -z "$DOMAIN" ]; then
  echo "❌ Uso: ./scripts/deploy-prod.sh tudominio.cl [puerto_app] [email_contacto]"
  exit 1
fi

if command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD="docker compose"
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/docker"

echo "🚀 Desplegando Taker Passport Barrio en producción"
echo "   Dominio: $DOMAIN"
echo "   Puerto interno del frontend: $APP_PORT (cámbialo si ya está en uso en este servidor)"

if [ ! -f .env ]; then
  cp .env.example .env
  NEW_JWT=$(openssl rand -hex 32)
  NEW_DB_PASS=$(openssl rand -hex 16)
  NEW_MINIO_PASS=$(openssl rand -hex 16)
  NEW_ADMIN_KEY=$(openssl rand -hex 24)
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_JWT}/" .env
  sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${NEW_DB_PASS}/" .env
  sed -i "s/^MINIO_PASSWORD=.*/MINIO_PASSWORD=${NEW_MINIO_PASS}/" .env
  sed -i "s/^ADMIN_API_KEY=.*/ADMIN_API_KEY=${NEW_ADMIN_KEY}/" .env
  echo "🔐 docker/.env creado con secretos generados aleatoriamente."
  echo "   ⚠️  Falta completar MP_ACCESS_TOKEN a mano con tus credenciales reales de Mercado Pago."
else
  echo "   docker/.env ya existe, no se regeneran secretos (evita romper sesiones activas)."
fi

sed -i "s#^FRONTEND_URL=.*#FRONTEND_URL=https://${DOMAIN}#" .env
sed -i "s#^BACKEND_PUBLIC_URL=.*#BACKEND_PUBLIC_URL=https://${DOMAIN}/api#" .env
if grep -q "^APP_PORT=" .env; then
  sed -i "s/^APP_PORT=.*/APP_PORT=${APP_PORT}/" .env
else
  echo "APP_PORT=${APP_PORT}" >> .env
fi
# MINIO_PUBLIC_URL se deja como está a propósito: los documentos de
# verificación (cédula + selfie) son datos sensibles y el bucket es privado
# por defecto. El panel /api/admin genera URLs prefirmadas de corta duración
# para revisarlos — nunca se expone el bucket completo.

echo "   Construyendo e iniciando servicios (esto puede tardar varios minutos la primera vez)..."
$COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "   Esperando a que el backend responda en /health..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${API_PORT:-4000}/health" > /dev/null; then
    echo "   ✓ Backend saludable."
    break
  fi
  sleep 2
done

echo "🌐 Agregando bloque de Nginx del host para $DOMAIN (sin tocar otros sitios)..."
sed "s/__DOMAIN__/${DOMAIN}/g; s/__PORT__/${APP_PORT}/g" "$REPO_ROOT/deploy/nginx-host.conf.template" | sudo tee /etc/nginx/sites-available/taker-passport-barrio > /dev/null
sudo ln -sf /etc/nginx/sites-available/taker-passport-barrio /etc/nginx/sites-enabled/taker-passport-barrio
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ Stack levantado y Nginx configurado en HTTP para $DOMAIN."
echo ""
echo "Antes de pedir el certificado HTTPS, confirma que el DNS de $DOMAIN"
echo "ya apunta a la IP de este servidor: $(curl -s ifconfig.me)"
echo ""
read -p "¿El DNS ya está apuntando aquí? Corro certbot ahora [s/N]: " CONFIRM
if [[ "$CONFIRM" =~ ^[sS]$ ]]; then
  if [ -z "$CONTACT_EMAIL" ]; then
    read -p "Email de contacto para el certificado (avisos de vencimiento): " CONTACT_EMAIL
  fi
  # Certbot solo pide el certificado para ESTE dominio — no toca los
  # certificados ni bloques de otros sitios ya configurados en el servidor.
  sudo certbot --nginx -d "$DOMAIN" --redirect -m "$CONTACT_EMAIL" --agree-tos --non-interactive || \
    echo "⚠️  Certbot falló. Revisa el DNS y corre manualmente: sudo certbot --nginx -d $DOMAIN"
else
  echo "   Cuando el DNS esté listo, corre manualmente:"
  echo "     sudo certbot --nginx -d $DOMAIN"
fi

echo ""
echo "📊 Logs en tiempo real:"
echo "   cd docker && $COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml logs -f backend"
