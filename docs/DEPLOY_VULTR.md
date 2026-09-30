# Desplegar Taker Passport Barrio en producción

Esta guía deja el MVP corriendo en `https://taker-passport-barrio.netxia.cl`,
con HTTPS real, cobros por Mercado Pago, firewall, backups automáticos y
(opcional) despliegue continuo desde GitHub.

**Primero decide dónde va a vivir** — dos caminos, elige uno:

- **Opción A — droplet nuevo en Vultr.** Más aislado (si este proyecto tiene
  un problema, no afecta a Divinittys), pero cuesta aparte (~US$12-14/mes).
- **Opción B — reutilizar tu VPS de Divinittys** (`vps-divinittys`, Santiago,
  `64.176.5.1`). Sin costo adicional, pero comparte recursos (CPU/RAM/disco)
  con Divinittys — si Taker Passport Barrio tiene un pico de tráfico o un
  bug que consuma memoria, puede afectar a Divinittys también. Ambos stacks
  quedan aislados a nivel de Docker (redes y nombres de proyecto distintos),
  pero comparten el mismo Nginx del host y el mismo kernel.

Si es tu primer piloto con tráfico bajo, la Opción B es razonable y gratis.
Si Divinittys ya está con carga real o quieres aislar el riesgo, ve con la A.

---

## Paso 0 — Antes de empezar

Necesitas:
- Acceso SSH al servidor que vayas a usar (nuevo droplet u host de Divinittys)
- El subdominio `taker-passport-barrio.netxia.cl` ya creado (✓ ya lo hiciste)
- Cuenta de Mercado Pago del negocio, con el access token de prueba a mano
  (ver `docs/INSTALL.md`, sección "Conectar Mercado Pago")
- Tu repo en GitHub con los últimos cambios (`git push`)

---

## Paso 1 — DNS del subdominio

En el panel DNS de `netxia.cl`, confirma que exista:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `taker-passport-barrio` | IP del servidor que vayas a usar (Opción A o B) |

Si usas la Opción B, esto probablemente ya apunta a `64.176.5.1` porque
compartes el mismo servidor de Divinittys — solo falta el registro DNS
específico del subdominio si `netxia.cl` no tiene un wildcard `*.netxia.cl`.
Verifica con:
```bash
dig +short taker-passport-barrio.netxia.cl
```

---

## Opción A — Droplet nuevo en Vultr

### A.1 — Crear el droplet
1. En el panel de Vultr: **Deploy → Deploy New Server → Cloud Compute (Shared CPU)**.
2. **Región: Santiago, Chile** (mismo datacenter que ya usas para Divinittys —
   Vultr tiene presencia ahí desde 2026).
3. **Imagen: Ubuntu 24.04 LTS x64**.
4. **Plan**: 2 vCPU / 2GB RAM alcanza cómodo para este stack.
5. Sube tu llave SSH pública, nombra el servidor `taker-passport-prod`, y
   dale **Deploy Now**. Anota la IP.

### A.2 — Aprovisionar
```bash
ssh root@TU_IP_NUEVA
curl -fsSL https://raw.githubusercontent.com/rekkiem/taker-passport-barrio/main/scripts/vultr-provision.sh -o provision.sh
bash provision.sh
```
Este script instala Docker, configura firewall (ufw), fail2ban, swap, Nginx
y Certbot, y crea un usuario `taker` sin privilegios de root. Al terminar,
te pide reconectar como ese usuario:
```bash
ssh taker@TU_IP_NUEVA
```

Luego salta directo al **Paso 2** de esta guía.

---

## Opción B — Reutilizar la VPS de Divinittys

No corras `vultr-provision.sh` aquí — esa VPS ya tiene Docker, Nginx y
Certbot funcionando para Divinittys. Correr ese script de nuevo no debería
romper nada (es idempotente: si Docker/Nginx ya existen, no los reinstala),
pero es innecesario. En vez de eso:

### B.1 — Conéctate con el usuario que ya usas para Divinittys
```bash
ssh <tu_usuario>@64.176.5.1
```

### B.2 — Verifica qué puertos ya están ocupados
```bash
sudo ss -tlnp | grep -E ':80|:443|:8080|:8081|:5432|:6379|:9000|:9001|:4000'
```
Si Divinittys ya usa el puerto `8080` en el host (poco probable si vive
dentro de su propio contenedor con su propio nombre de red, pero conviene
confirmar), anota qué puertos están libres — los vas a necesitar en el
Paso 4 (`deploy-prod.sh` acepta un puerto alternativo como segundo
argumento).

### B.3 — Confirma que ufw permite 80/443 (probablemente ya está)
```bash
sudo ufw status
```
Si no ves `80/tcp` y `443/tcp` como `ALLOW`, agrégalos:
```bash
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
```

No hace falta tocar nada más de la configuración existente de Divinittys —
`docker-compose.yml` de este proyecto tiene `name: taker-passport-barrio`
fijo, así que Docker Compose nunca va a confundir sus contenedores/red con
los de Divinittys, aunque ambas carpetas se llamen `docker/`.

---

## Paso 2 — Clonar el repo

```bash
git clone https://github.com/rekkiem/taker-passport-barrio.git ~/taker-passport-barrio
cd ~/taker-passport-barrio
chmod +x scripts/*.sh
```

## Paso 3 — Completar credenciales de Mercado Pago

Antes de desplegar, ten a mano tu **Access Token de prueba** (`TEST-...`) de
Mercado Pago (ver `docs/INSTALL.md`). Lo vas a pegar en `docker/.env` justo
después de correr `deploy-prod.sh` (que crea ese archivo con el resto de los
secretos generados automáticamente).

## Paso 4 — Desplegar

```bash
./scripts/deploy-prod.sh taker-passport-barrio.netxia.cl
```

Si estás en la **Opción B** y el puerto `8080` ya está en uso en esa VPS,
usa otro:
```bash
./scripts/deploy-prod.sh taker-passport-barrio.netxia.cl 8090 contacto@netxia.cl
```

Este script:
1. Genera `docker/.env` con secretos aleatorios (JWT, contraseñas de DB,
   MinIO, `ADMIN_API_KEY`) — **no toca `MP_ACCESS_TOKEN`**, hay que
   completarlo a mano (ver Paso 5)
2. Levanta el stack completo con `docker-compose.yml` + `docker-compose.prod.yml`
   — todo atado a `127.0.0.1`, nada expuesto directo a internet salvo lo que
   decida el Nginx del host
3. Agrega **un bloque nuevo** de Nginx del host para este subdominio, **sin
   tocar** la configuración de otros sitios que ya estén en el servidor
   (importante en la Opción B)
4. Te pregunta si el DNS ya está propagado — si respondes que sí, corre
   Certbot automáticamente **solo para este subdominio** y activa HTTPS

## Paso 5 — Completar el access token de Mercado Pago

```bash
cd ~/taker-passport-barrio/docker
nano .env   # pega tu MP_ACCESS_TOKEN real (o el de prueba para probar primero)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend
```

**Verifica que todo esté arriba:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl -I https://taker-passport-barrio.netxia.cl
```

---

## Paso 6 — Probar un pago de punta a punta

1. Entra a `https://taker-passport-barrio.netxia.cl`, regístrate como Giver
   y publica una tarea.
2. Regístrate como Taker (otra sesión/navegador) y postula.
3. Como Giver, asigna la tarea y paga — con el access token de **prueba**
   de Mercado Pago, usa una [tarjeta de prueba](https://www.mercadopago.cl/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards),
   nunca una real.
4. Confirma que el pago llega a estado `held` (la página de retorno debería
   mostrar "Pago confirmado").
5. Recién cuando todo el ciclo funcione con el token de prueba, reemplaza
   `MP_ACCESS_TOKEN` por el access token **real** de tu cuenta (Paso 5) —
   ahí empiezan a moverse pagos de verdad.

---

## Paso 7 — Cargar (o no) datos de prueba

Para el piloto real, **no cargues los seeds** — son usuarios con contraseña
conocida (`password123`).

---

## Paso 8 — Conectar WhatsApp (Evolution API)

Evolution API corre atado a `127.0.0.1` en producción — no es accesible por
internet directamente. Para llegar a él desde tu computador, abre un túnel
SSH (ajusta el puerto si usaste uno distinto de 8081):
```bash
ssh -L 8081:127.0.0.1:8081 taker@taker-passport-barrio.netxia.cl
```
y entra a `http://localhost:8081` en tu navegador local para crear la
instancia y escanear el QR con el número de WhatsApp del negocio.

---

## Paso 9 — Aprobar verificaciones de identidad

Sin panel visual todavía — con `curl`, usando el `ADMIN_API_KEY` que quedó
generado en `docker/.env`:
```bash
# Ver quién está esperando revisión
curl -H "x-admin-key: TU_ADMIN_API_KEY" https://taker-passport-barrio.netxia.cl/api/admin/verifications/pending

# Ver sus documentos (URLs válidas por 5 minutos)
curl -H "x-admin-key: TU_ADMIN_API_KEY" https://taker-passport-barrio.netxia.cl/api/admin/verifications/USER_ID/documents

# Aprobar
curl -X POST -H "x-admin-key: TU_ADMIN_API_KEY" https://taker-passport-barrio.netxia.cl/api/admin/verifications/USER_ID/approve
```

---

## Paso 10 — Backups automáticos

```bash
crontab -e
```
y agrega:
```
0 3 * * * /home/taker/taker-passport-barrio/scripts/backup-db.sh >> /home/taker/backups/backup.log 2>&1
```
(si estás en la Opción B con otro usuario, ajusta la ruta). Restaurar:
```bash
./scripts/restore-db.sh ~/backups/daily/taker_2026-08-13.sql.gz
```
**Recomendado**: copia los backups fuera del servidor periódicamente.

---

## Paso 11 — Actualizar el sitio con cambios nuevos

```bash
cd ~/taker-passport-barrio
git pull origin main
cd docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker image prune -f
```

Si agregaste una migración de base de datos nueva (como
`002_mercadopago.sql`), aplícala una sola vez con:
```bash
./scripts/apply-migration.sh database/migrations/00X_nombre.sql
```
(las migraciones normales solo se cargan solas en una base **nueva y
vacía** — Postgres no las reaplica sobre una base que ya tiene datos).

## Paso 12 (opcional) — Despliegue continuo desde GitHub

El repo incluye `.github/workflows/cd.yml`: despliega automáticamente
después de que el CI pase en `main`. Actívalo agregando en GitHub
(**Settings → Secrets and variables → Actions**):

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | IP o dominio del servidor que elegiste (A o B) |
| `VPS_USER` | `taker` (Opción A) o tu usuario existente (Opción B) |
| `VPS_SSH_KEY` | llave privada SSH correspondiente |
| `VPS_DOMAIN` | `taker-passport-barrio.netxia.cl` |

Si no configuras estos secrets, el workflow se salta el deploy sin fallar
el pipeline.

---

## Checklist final antes de anunciar el MVP

- [ ] `https://taker-passport-barrio.netxia.cl` carga con candado verde
- [ ] Registro + login funcionan de punta a punta
- [ ] Publicar tarea, postular, asignar y completar funcionan
- [ ] Un pago de prueba con Mercado Pago completa el ciclo
      open→assigned→completed→confirmed y libera el escrow
- [ ] `docker/.env` en el servidor tiene secretos generados, no los de
      `.env.example`, y `MP_ACCESS_TOKEN` real (no `TEST-...`) si vas a
      cobrar de verdad
- [ ] Cron de backup configurado y probado al menos una vez
- [ ] `ufw status` muestra solo 22 (SSH), 80 y 443 abiertos
- [ ] No quedaron los usuarios de seed (`password123`)
- [ ] Evolution API conectado con el número de WhatsApp real del negocio
- [ ] Si usaste la Opción B: confirma que Divinittys sigue respondiendo
      normal después del despliegue (`curl -I https://divinittys...`)

## Notas de seguridad y límites conocidos de este MVP

- **El panel de admin (`/api/admin/*`) usa un secreto compartido, no un
  login real.** Suficiente para uno o dos operadores en el piloto; si el
  equipo crece, conviene un rol admin de verdad en la tabla `users`.
- **Los documentos de verificación de identidad se guardan en un bucket
  MinIO privado.** El admin los ve vía URLs prefirmadas de 5 minutos — nunca
  se expone el bucket completo. Datos sensibles bajo la Ley 19.628.
- **Mercado Pago**: el webhook siempre re-verifica el pago contra la API
  oficial con el access token del servidor antes de liberar el escrow —
  nunca confía en el cuerpo de la notificación por sí solo.
- El backup de base de datos es local al servidor por defecto — considera
  copiarlo a un storage externo.
