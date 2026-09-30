# Runbook rotación secretos
```bash
openssl rand -hex 32  # JWT
openssl rand -hex 16  # DB / MinIO
```
Postgres: `ALTER USER taker PASSWORD 'nuevo';` dentro del contenedor, luego actualizar .env y recrear.
