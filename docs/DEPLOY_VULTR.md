# Desplegar Taker Passport Barrio en Vultr — guía paso a paso

Esta guía deja el MVP corriendo en producción, con HTTPS real, firewall,
backups automáticos y (opcional) despliegue continuo desde GitHub.

**Costo estimado**: droplet de 2 vCPU / 2GB RAM (~US$12-14/mes) alcanza cómodo
para este stack (Postgres + Redis + MinIO + Evolution API + backend +
frontend) en la etapa de MVP/piloto. Si vas a manejar poco tráfico al inicio,
el de 1 vCPU / 1GB (~US$6/mes) también funciona, pero el `swap` que crea
`vultr-provision.sh` se vuelve más importante ahí.

---

## Paso 0 — Antes de empezar

Necesitas:
- Una cuenta en [vultr.com](https://vultr.com)
- Un dominio propio (ej. `takerpass.cl`) con acceso a su DNS. Sin dominio no
  hay HTTPS real — Let's Encrypt no emite certificados para IPs sueltas.
- Tu repo en GitHub con los últimos cambios (`git push`)

---

## Paso 1 — Crear el droplet

1. En el panel de Vultr: **Deploy → Deploy New Server**.
2. Tipo de servidor: **Cloud Compute — Shared CPU**.
3. **Región: Santiago, Chile** (Vultr tiene datacenter propio ahí desde
   2026 — es la opción con menor latencia real para tus usuarios en
   Providencia/Ñuñoa; usa São Paulo como alternativa si Santiago no
   apareciera disponible en tu cuenta).
4. **Imagen del sistema operativo: Ubuntu 24.04 LTS x64**.
5. **Plan**: 2 vCPU / 2GB RAM / 55GB SSD (o el de 1GB si estás recién
   arrancando y quieres el costo más bajo).
6. **SSH Keys**: sube tu llave pública ahora — evita depender de contraseñas
   por correo. Si no tienes una:
   ```bash
   ssh-keygen -t ed25519 -C "taker-passport-vultr"
   ```
   y pega el contenido de `~/.ssh/id_ed25519.pub` en el panel de Vultr.
7. Nombre del servidor: `taker-passport-prod` (o el que prefieras).
8. **Deploy Now**. Anota la IP pública que te asigna (la vas a necesitar en
   el Paso 2 y el Paso 5).

---

## Paso 2 — Apuntar el dominio a la IP del droplet

En el panel DNS de donde compraste tu dominio, crea:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `@` | IP de tu droplet |
| A | `www` | IP de tu droplet |

La propagación puede tardar desde minutos hasta un par de horas. Puedes
verificar con:
```bash
dig +short tudominio.cl
```
Cuando el comando devuelva la IP correcta, sigue al Paso 4 (Certbot).
Mientras tanto, puedes avanzar los pasos 3-4 igual — el sitio queda accesible
por HTTP simple hasta que emitas el certificado.

---

## Paso 3 — Aprovisionar el servidor

Conéctate como root (única vez que usas root directamente):

```bash
ssh root@TU_IP_VULTR
```

Descarga y corre el script de aprovisionamiento — instala Docker, configura
el firewall, crea un usuario sin privilegios de root, agrega swap, e instala
Nginx + Certbot:

```bash
curl -fsSL https://raw.githubusercontent.com/rekkiem/taker-passport-barrio/main/scripts/vultr-provision.sh -o provision.sh
bash provision.sh
```

Al terminar, te va a decir que cierres la sesión y vuelvas a entrar como el
usuario nuevo (`taker` por defecto):

```bash
ssh taker@TU_IP_VULTR
```

A partir de aquí, **nunca más operas como root**.

---

## Paso 4 — Clonar el repo y desplegar

```bash
git clone https://github.com/rekkiem/taker-passport-barrio.git ~/taker-passport-barrio
cd ~/taker-passport-barrio
chmod +x scripts/*.sh
./scripts/deploy-prod.sh tudominio.cl
```

Este script:
1. Genera `docker/.env` con secretos aleatorios (JWT, contraseñas de DB y MinIO)
2. Levanta el stack completo con `docker-compose.yml` + `docker-compose.prod.yml`
   — todo atado a `127.0.0.1`, nada expuesto directo a internet salvo lo que
   decida el Nginx del host
3. Instala la configuración de Nginx del host apuntando a tu dominio
4. Te pregunta si el DNS ya está propagado — si respondes que sí, corre
   Certbot automáticamente y activa HTTPS con redirect forzado

Si el DNS todavía no propaga cuando corres el script, respondes que no, y
más tarde corres manualmente:
```bash
sudo certbot --nginx -d tudominio.cl -d www.tudominio.cl
```

**Verifica que todo esté arriba:**
```bash
cd docker && docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl -I https://tudominio.cl
```

---

## Paso 5 — Cargar (o no) datos de prueba

Para un piloto real, **no cargues los seeds** — son usuarios con contraseña
conocida (`password123`). Si igual quieres una demo cargada:

```bash
cd ~/taker-passport-barrio/docker
CONTAINER=$(docker compose -f docker-compose.yml -f docker-compose.prod.yml ps -q postgres)
docker exec -i "$CONTAINER" psql -U taker -d taker < ../database/seeds/test_data.sql
```

---

## Paso 6 — Conectar WhatsApp (Evolution API)

Evolution API corre atado a `127.0.0.1:8081` en producción — no es accesible
por internet directamente (correcto, es un panel administrativo). Para
llegar a él desde tu computador, abre un túnel SSH:

```bash
ssh -L 8081:127.0.0.1:8081 taker@tudominio.cl
```

y entra a `http://localhost:8081` en tu navegador local para crear la
instancia y escanear el QR con el número de WhatsApp del negocio.

---

## Paso 7 — Backups automáticos

Agrega el backup diario al crontab del usuario `taker`:

```bash
crontab -e
```

y agrega:
```
0 3 * * * /home/taker/taker-passport-barrio/scripts/backup-db.sh >> /home/taker/backups/backup.log 2>&1
```

Esto respalda la base todos los días a las 3 AM (hora de Chile, ya
configurada por `vultr-provision.sh`), conservando 7 backups diarios y 4
semanales en `~/backups/`. Restaurar un backup:

```bash
./scripts/restore-db.sh ~/backups/daily/taker_2026-08-13.sql.gz
```

**Recomendado**: copia los backups fuera del servidor (a tu computador, a un
bucket S3, a Google Drive) periódicamente — un backup que vive solo en el
mismo disco que puede fallar no es un backup real.

---

## Paso 8 — Actualizar el sitio con cambios nuevos

Manual, cada vez que quieras desplegar:
```bash
cd ~/taker-passport-barrio
git pull origin main
cd docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker image prune -f
```

O automático — ver la siguiente sección.

---

## Paso 9 (opcional) — Despliegue continuo desde GitHub

El repo ya incluye `.github/workflows/cd.yml`: despliega solo automáticamente
después de que el CI pase en `main`. Para activarlo, en GitHub ve a
**Settings → Secrets and variables → Actions** y agrega:

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | tu IP o dominio de Vultr |
| `VPS_USER` | `taker` |
| `VPS_SSH_KEY` | tu llave **privada** SSH (la que corresponde a la pública que subiste en el Paso 1) |
| `VPS_DOMAIN` | `tudominio.cl` |

Con eso, cada `git push` a `main` que pase el CI se despliega solo. Si no
configuras estos secrets, el workflow se salta el deploy sin fallar el
pipeline — es completamente opcional.

---

## Checklist final antes de anunciar el MVP

- [ ] `https://tudominio.cl` carga con candado verde (certificado válido)
- [ ] Registro + login funcionan de punta a punta
- [ ] Publicar tarea (Giver) y postular (Taker) funcionan
- [ ] El flujo de pago WebPay (modo testing) completa el ciclo
      open→assigned→completed→confirmed
- [ ] `docker/.env` en el servidor tiene secretos generados, no los de
      `.env.example`
- [ ] Cron de backup configurado y probado al menos una vez (`bash
      scripts/backup-db.sh` manual, revisar que el archivo se creó)
- [ ] `ufw status` muestra solo 22 (SSH), 80 y 443 abiertos
- [ ] No quedaron los usuarios de seed (`password123`) si es un despliegue real
- [ ] Evolution API conectado con el número de WhatsApp real del negocio

## Notas de seguridad y límites conocidos de este MVP

- **WebPay sigue en modo testing** (código de comercio `TBK`). Antes de
  cobrar dinero real, hay que tramitar credenciales de producción con
  Transbank y reemplazar `backend/src/services/webpay.service.ts` por su SDK
  oficial — esto es un cambio de código, no solo de configuración.
- **Los documentos de verificación de identidad (cédula + selfie) se guardan
  en un bucket MinIO privado por defecto** — no hay hoy un panel de admin
  para revisarlos. Si construyes uno, usa URLs prefirmadas de corta duración
  (`minioClient.presignedGetObject`), nunca hagas público el bucket: son
  datos sensibles bajo la Ley 19.628.
- El backup de base de datos es local al servidor por defecto — considera
  copiarlo a un storage externo (ver Paso 7).
