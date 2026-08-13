FROM postgres:16-alpine

# postgres ejecuta los scripts de /docker-entrypoint-initdb.d/ en orden alfabético
# en el primer arranque (volumen vacío). Solo el schema se carga automáticamente;
# los datos de prueba se cargan aparte y a mano (ver README) para no terminar
# con usuarios de contraseña conocida ('password123') en un despliegue de producción.
COPY migrations/001_initial.sql /docker-entrypoint-initdb.d/01_schema.sql

RUN chmod 644 /docker-entrypoint-initdb.d/*.sql
