# 🏘️ Taker Passport Barrio

> MVP 100% Open Source para conectar Givers y Takers en Providencia y Ñuñoa, Santiago de Chile.

## 🎯 Descripción

Taker Passport Barrio es una plataforma de servicios informales de barrio que conecta a quienes necesitan ayuda (**Givers**) con trabajadores verificados (**Takers**) usando un sistema de reputación llamado **Passport**.

## 🏗️ Stack Tecnológico (100% Open Source)

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TailwindCSS (PWA) |
| Backend | Node.js 20 + Express + TypeScript |
| Base de Datos | PostgreSQL 15 |
| Autenticación | JWT + bcrypt |
| Almacenamiento | MinIO (S3-compatible) |
| Pasarela de Pagos | WebPay Plus (modo testing TBK) |
| WhatsApp API | Evolution API (open source) |
| Hosting | Docker + VPS Chile |

## 🚀 Inicio Rápido (5 minutos)

### Requisitos
- Docker 24+ y Docker Compose
- Git

### Pasos

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/taker-passport-barrio.git
cd taker-passport-barrio

# 2. Desplegar
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# 3. Acceder
# Frontend: http://localhost
# API: http://localhost:4000
# MinIO: http://localhost:9001 (minioadmin / minioadmin)
```

## 🧪 Credenciales de Prueba

| Rol | Email | Contraseña | RUT |
|-----|-------|-----------|-----|
| Giver | ana@example.com | password123 | 12.345.678-9 |
| Taker | carlos@example.com | password123 | 13.456.789-0 |
| Both | maria@example.com | password123 | 14.567.890-1 |

## 📁 Estructura del Proyecto

```
taker-passport-barrio/
├── backend/           # API REST Node.js + Express + TypeScript
├── frontend/          # PWA React + Vite + TailwindCSS
├── database/          # Migraciones y seeds PostgreSQL
├── docker/            # Docker Compose + Nginx + .env
├── scripts/           # Scripts de despliegue
└── README.md
```

## 🔌 API Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registro con validación RUT | No |
| POST | `/api/auth/login` | Login email/phone + password | No |
| POST | `/api/tasks` | Crear tarea (Giver) | JWT |
| GET | `/api/tasks` | Listar tareas (filtro por comuna) | JWT |
| POST | `/api/tasks/:id/apply` | Postular a tarea (Taker) | JWT |
| POST | `/api/tasks/:id/assign` | Asignar tarea (Giver) | JWT |
| POST | `/api/tasks/:id/complete` | Completar tarea (Taker) | JWT |
| POST | `/api/tasks/:id/confirm` | Confirmar y liberar pago (Giver) | JWT |
| POST | `/api/payments/create` | Iniciar pago WebPay | JWT |
| POST | `/api/payments/webhook` | Webhook confirmación WebPay | No |
| GET | `/api/passport/:userId` | Obtener Passport del Taker | JWT |
| POST | `/api/ratings` | Calificar tarea completada | JWT |

## 🗄️ Modelo de Datos

- **users**: Givers y Takers con validación de RUT chileno
- **tasks**: Tareas publicadas con estado (open → assigned → completed → confirmed)
- **payments**: Sistema de escrow con WebPay
- **passports**: Reputación y historial del Taker
- **ratings**: Calificaciones 1-5 estrellas

## 🌐 Despliegue en VPS Chile

### 1. Preparar VPS
```bash
# Ubuntu 22.04 LTS
sudo apt update && sudo apt install -y docker.io docker-compose git
```

### 2. Clonar y desplegar
```bash
git clone <repo>
cd taker-passport-barrio/docker
cp .env.example .env
# Editar .env con credenciales reales
sudo docker-compose up --build -d
```

### 3. SSL con Let's Encrypt
```bash
sudo apt install -y certbot
sudo certbot --nginx -d takerpass.cl -d www.takerpass.cl
```

## ⚠️ Notas Importantes

- **WebPay**: Actualmente en modo testing con código de comercio `TBK`. Para producción, solicitar credenciales reales a Transbank.
- **Evolution API**: Requiere escanear QR con WhatsApp personal para conectar el gateway.
- **MinIO**: En producción, configurar buckets públicos para fotos de tareas.

## 📄 Licencia

MIT License - 100% Open Source

---

**Desarrollado para el Global Startup Investment Board - Agosto 2026**
