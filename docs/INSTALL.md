# Guía de Instalación

## Desarrollo local (sin Docker)

Requisitos: Node.js 20+, PostgreSQL 15+, npm.

```bash
# 1. Base de datos
createdb taker
psql -d taker -f database/migrations/001_initial.sql
psql -d taker -f database/seeds/test_data.sql   # opcional, datos demo

# 2. Backend
cd backend
cp .env.example .env   # crear si no existe; ver variables abajo
npm install
npm run dev             # http://localhost:4000

# 3. Frontend (otra terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

### Variables de entorno del backend (`.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://taker:pass@localhost:5432/taker` |
| `JWT_SECRET` | Secreto para firmar tokens (obligatorio, sin default) | `$(openssl rand -hex 32)` |
| `MINIO_ENDPOINT` / `MINIO_PORT` | Host/puerto de MinIO | `localhost` / `9000` |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Credenciales MinIO | — |
| `MINIO_PUBLIC_URL` | URL pública para servir archivos subidos | `http://localhost:9000` |
| `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` | Gateway de WhatsApp | `http://localhost:8080` |
| `FRONTEND_URL` | Usado para CORS y `return_url` de WebPay | `http://localhost:5173` |
| `NODE_ENV` | `development` / `production` / `test` | — |

## Con Docker (recomendado para probar todo el stack)

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

El script genera automáticamente secretos aleatorios en `docker/.env` si el archivo no existe. Levanta: PostgreSQL, Redis, MinIO, Evolution API, backend, frontend y Nginx.

## Correr los tests

```bash
cd backend
npm install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taker_test \
JWT_SECRET=test-secret \
npm test
```

Requiere que el esquema (`database/migrations/001_initial.sql`) esté aplicado en la base `taker_test`. El pipeline de CI (`.github/workflows/ci.yml`) hace esto automáticamente con un contenedor de Postgres efímero.

## Conectar WhatsApp (Evolution API)

1. Levantar el stack con Docker (`evolution-api` corre en el puerto `8081` del host, `8080` interno).
2. Abrir el panel en `http://localhost:8081` y crear una instancia.
3. Escanear el código QR con la app de WhatsApp del número que actuará como gateway.
4. Configurar el webhook de mensajes entrantes hacia el backend si se desea automatizar el flujo conversacional completo (fuera del alcance de este MVP: el backend ya expone `evolution.service.ts` para *enviar* notificaciones; recibir y enrutar mensajes requiere un webhook adicional).
