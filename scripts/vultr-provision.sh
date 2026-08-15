#!/bin/bash
# Aprovisionamiento inicial de un droplet Vultr (Ubuntu 24.04) para Taker
# Passport Barrio. Correr UNA sola vez, como root, recién creado el droplet:
#
#   ssh root@TU_IP_VULTR
#   curl -fsSL https://raw.githubusercontent.com/rekkiem/taker-passport-barrio/main/scripts/vultr-provision.sh -o provision.sh
#   bash provision.sh
#
# Qué hace:
#   1. Actualiza el sistema e instala actualizaciones de seguridad automáticas
#   2. Crea un usuario sin privilegios de root para operar el día a día
#   3. Configura el firewall (ufw): solo SSH, HTTP y HTTPS
#   4. Instala fail2ban para frenar fuerza bruta contra SSH
#   5. Crea un archivo de swap (recomendado en droplets de 1-2GB de RAM)
#   6. Instala Docker Engine + Docker Compose plugin
#   7. Instala Nginx y Certbot (para TLS)
#   8. Fija la zona horaria a America/Santiago

set -e

if [ "$EUID" -ne 0 ]; then
  echo "❌ Corre este script como root (o con sudo)."
  exit 1
fi

DEPLOY_USER="${DEPLOY_USER:-taker}"

echo "📦 Actualizando el sistema..."
apt update && apt upgrade -y
apt install -y unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "👤 Creando usuario de despliegue '$DEPLOY_USER' (sin acceso root directo por password)..."
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  mkdir -p /home/"$DEPLOY_USER"/.ssh
  if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /home/"$DEPLOY_USER"/.ssh/authorized_keys
    chown -R "$DEPLOY_USER":"$DEPLOY_USER" /home/"$DEPLOY_USER"/.ssh
    chmod 700 /home/"$DEPLOY_USER"/.ssh
    chmod 600 /home/"$DEPLOY_USER"/.ssh/authorized_keys
    echo "   ✓ Copiadas tus llaves SSH de root al nuevo usuario."
  else
    echo "   ⚠️  No encontré /root/.ssh/authorized_keys — configura acceso SSH"
    echo "      para '$DEPLOY_USER' manualmente antes de cerrar esta sesión,"
    echo "      o quedarás sin forma de entrar una vez cerrado el acceso root."
  fi
fi

echo "🔥 Configurando firewall (ufw)..."
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "🛡️  Instalando fail2ban..."
apt install -y fail2ban
systemctl enable --now fail2ban

echo "💾 Configurando swap (2GB) si no existe..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "   ✓ Swap de 2GB creado."
else
  echo "   ✓ Ya existe /swapfile, no se toca."
fi

echo "🐳 Instalando Docker Engine + Compose plugin..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$DEPLOY_USER"
  echo "   ✓ Docker instalado. '$DEPLOY_USER' agregado al grupo docker."
else
  echo "   ✓ Docker ya estaba instalado."
fi

echo "🌐 Instalando Nginx + Certbot..."
apt install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx

echo "🕒 Fijando zona horaria a America/Santiago..."
timedatectl set-timezone America/Santiago

echo ""
echo "✅ Aprovisionamiento completo."
echo ""
echo "Próximos pasos:"
echo "  1. Cierra esta sesión y vuelve a entrar como '$DEPLOY_USER' (no root):"
echo "       ssh $DEPLOY_USER@$(curl -s ifconfig.me)"
echo "  2. Clona el repo y sigue docs/DEPLOY_VULTR.md desde el paso 3."
