# 🏘️ Taker Passport Barrio

> MVP 100% Open Source para conectar Givers y Takers en Providencia y Ñuñoa, Santiago de Chile.

[![CI](https://github.com/rekkiem/taker-passport-barrio/actions/workflows/ci.yml/badge.svg)](https://github.com/rekkiem/taker-passport-barrio/actions/workflows/ci.yml)

## 🎯 Descripción

Taker Passport Barrio conecta a quienes necesitan ayuda (**Givers**) con trabajadores de confianza (**Takers**) en dos comunas piloto, usando un sistema de reputación portátil llamado **Passport** (historial, rating y earnings del Taker) y pagos en escrow.

## 🏗️ Stack Tecnológico (100% Open Source)

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TailwindCSS (PWA) |
| Backend | Node.js 20 + Express + TypeScript |
| Base de Datos | PostgreSQL 15/16 |
| Autenticación | JWT + bcrypt |
| Validación | Zod |
| Almacenamiento | MinIO (S3-compatible) |
| Pasarela de Pagos | WebPay Plus (modo testing TBK) |
| WhatsApp API | Evolution API (open source) |
| Seguridad | Helmet, rate-limiting, usuario no-root en Docker |
| Testing | Vitest + Supertest (contra Postgres real, no mocks) |
| CI/CD | GitHub Actions |
| Hosting | Docker Compose + VPS Chile |

## 🚀 Inicio Rápido (5 minutos)

### Requisitos
- Docker 24+ y Docker Compose
- Git

### Pasos

```bash
# 1. Clonar repositorio
git clone https://github.com/rekkiem/taker-passport-barrio.git
cd taker-passport-barrio

# 2. Desplegar (genera secretos aleatorios automáticamente en .env)
chmod +x scripts/deploy.sh
./scripts/deploy.sh

#2.2 Despliegue Manual (equivalente a lo que hace deploy.sh)
cd .\docker\
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
# Nota: sin el flag -f docker-compose.dev.yml los contenedores levantan
# SIN ningún puerto publicado al host (así es como debe verse en producción,
# ver docker-compose.prod.yml y docs/DEPLOY_VULTR.md).

# 3. Cargar datos de prueba (opcional, para demo)
docker exec -i $(docker ps -qf "name=postgres") \
  psql -U taker -d taker < database/seeds/test_data.sql

# 4. Acceder
# App (PWA):  http://localhost:8080
# API:        http://localhost:4000
# MinIO:      http://localhost:9001
# Evolution API (panel WhatsApp): http://localhost:8081
```

En Windows, usa `scripts/deploy.ps1` desde PowerShell en su lugar.

## 🧪 Credenciales de Prueba

> Todos los RUT están validados con el algoritmo módulo 11 real usado por el sistema (`backend/src/utils/rut.ts`), no son placeholders.

| Rol | Email | Contraseña | RUT |
|-----|-------|-----------|-----|
| Giver | ana@example.com | password123 | 12.345.678-5 |
| Taker | carlos@example.com | password123 | 13.456.789-9 |
| Both | maria@example.com | password123 | 14.567.890-0 |

Seed completo con 8 usuarios (Givers, Takers y "both"), 8 tareas en distintos estados, pagos y ratings de ejemplo en `database/seeds/test_data.sql`.

## 📁 Estructura del Proyecto

```
taker-passport-barrio/
├── .github/workflows/ci.yml   # Build + typecheck + tests + docker build
├── backend/                   # API REST Node.js + Express + TypeScript
│   └── src/
│       ├── routes/            # auth, users, tasks, payments, passport, ratings
│       ├── services/          # webpay, minio, evolution (whatsapp)
│       ├── schemas/           # validación Zod
│       ├── middleware/        # auth JWT, validate
│       └── *.test.ts          # tests unitarios + e2e contra Postgres real
├── frontend/                  # PWA React + Vite + TailwindCSS
├── database/
│   ├── migrations/001_initial.sql
│   └── seeds/test_data.sql
├── docker/                    # docker-compose.yml (base) + .dev.yml / .prod.yml + .env.example
├── deploy/                    # config de Nginx del host para producción (TLS)
├── docs/                      # API_REFERENCE.md, INSTALL.md
└── scripts/                   # deploy.sh / deploy.ps1
```

## 🔌 API Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registro con validación RUT chileno | No |
| POST | `/api/auth/login` | Login email/phone + password | No |
| GET | `/api/users/me` | Perfil del usuario autenticado | JWT |
| PUT | `/api/users/me` | Actualizar nombre/email | JWT |
| POST | `/api/users/verify` | Subir documento + selfie para verificación | JWT |
| POST | `/api/tasks` | Crear tarea (Giver) | JWT |
| GET | `/api/tasks` | Listar tareas (filtro `status`/`location`) | JWT |
| POST | `/api/tasks/:id/apply` | Postular a tarea (Taker) | JWT |
| POST | `/api/tasks/:id/assign` | Asignar tarea (Giver) | JWT |
| POST | `/api/tasks/:id/complete` | Completar tarea (Taker, solo si `assigned`) | JWT |
| POST | `/api/tasks/:id/confirm` | Confirmar y liberar pago (Giver, solo si `completed`) | JWT |
| POST | `/api/payments/create` | Iniciar pago WebPay (escrow) | JWT |
| POST | `/api/payments/webhook` | Webhook confirmación WebPay | No |
| GET | `/api/passport/:userId` | Passport del Taker (historial, score, earnings) | JWT |
| POST | `/api/ratings` | Calificar tarea completada | JWT |

Ver [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) para payloads completos.

## 🧪 Tests

```bash
cd backend
npm install
npm test          # requiere Postgres accesible vía DATABASE_URL
```

La suite incluye tests unitarios del validador de RUT y un test de integración end-to-end que ejercita el flujo completo (registro → tarea → postulación → asignación → pago → completar → confirmar → passport actualizado) contra una base PostgreSQL real, sin mocks.

## 🌐 Despliegue en producción (Vultr)

Guía completa paso a paso: [`docs/DEPLOY_VULTR.md`](docs/DEPLOY_VULTR.md).

Resumen: `scripts/vultr-provision.sh` prepara el droplet (Docker, firewall, Nginx, Certbot) y `scripts/deploy-prod.sh tudominio.cl` levanta el stack completo con HTTPS. En producción ningún servicio queda expuesto directo a internet salvo el Nginx del host (puertos 80/443) — todo lo demás vive en `127.0.0.1` (ver `docker/docker-compose.prod.yml`).

## ⚠️ Notas Importantes

- **`frontend/postcss.config.js` es obligatorio**: sin él, Vite nunca ejecuta Tailwind y el CSS se sirve sin compilar (la app se ve sin estilos). Si en algún momento se regenera el proyecto frontend desde cero, confirma que este archivo exista.
- **WebPay**: modo testing con código de comercio `TBK`. Para producción, solicitar credenciales reales a Transbank y reemplazar `backend/src/services/webpay.service.ts` por el SDK oficial.
- **Evolution API**: requiere escanear QR con WhatsApp para conectar el gateway (ver panel en `http://localhost:8080`).
- **MinIO**: en producción, configurar políticas de bucket y HTTPS antes de exponer `MINIO_PUBLIC_URL`.
- **Verificación de identidad**: el MVP sube documento + selfie a MinIO pero deja `verified = false` hasta revisión manual — no auto-aprueba por diseño (evita fraude de identidad).
- **Secretos**: `scripts/deploy.sh` genera `JWT_SECRET`, `DB_PASSWORD` y `MINIO_PASSWORD` aleatorios en el primer despliegue. No reutilices los valores de `.env.example` en producción.

## 📄 Licencia

MIT License - 100% Open Source
