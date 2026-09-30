# API Reference — Taker Passport Barrio

Base URL local: `http://localhost:4000/api`

Todas las rutas protegidas requieren el header:
```
Authorization: Bearer <token>
```

---

## Auth

### `POST /auth/register`
```json
{
  "rut": "12.345.678-5",
  "name": "Ana Gómez",
  "email": "ana@example.com",
  "phone": "+56912345678",
  "password": "password123",
  "role": "giver"
}
```
`role` ∈ `giver | taker | both`. Responde `201` con `{ user, token }`. `400` si el RUT no pasa el algoritmo módulo 11.

### `POST /auth/login`
```json
{ "email": "ana@example.com", "password": "password123" }
```
`email` acepta también el número de teléfono. Responde `{ user, token }`.

Ambos endpoints tienen rate-limit de 20 intentos / 15 min por IP.

---

## Users

### `GET /users/me` — JWT
Devuelve el perfil del usuario autenticado.

### `PUT /users/me` — JWT
```json
{ "name": "Nuevo nombre", "email": "nuevo@example.com" }
```

### `POST /users/verify` — JWT, `multipart/form-data`
Campos: `document` (imagen), `selfie` (imagen). Máx. 5MB c/u, formatos JPG/PNG/WEBP.
Sube ambos archivos a MinIO y deja el perfil en `pending_verification` (`verified = false`) hasta revisión manual.

---

## Tasks

### `POST /tasks` — JWT (Giver)
```json
{
  "category": "jardineria",
  "description": "Podar el jardín del patio trasero, aprox 50m2",
  "location": "Providencia",
  "budget": 35000
}
```
`location` ∈ `Providencia | Ñuñoa` (comunas piloto). Crea la tarea en estado `open`.

### `GET /tasks?status=open&location=Providencia` — JWT
Lista tareas, filtros opcionales por `status` y `location`.

### `POST /tasks/:id/apply` — JWT (Taker)
Sin body. Falla si la tarea no está `open` o si el Taker es el propio Giver. Notifica al Giver por WhatsApp.

### `POST /tasks/:id/assign` — JWT (Giver)
```json
{ "takerId": "uuid-del-taker" }
```
Cambia el estado a `assigned` y notifica al Taker por WhatsApp.

### `POST /tasks/:id/complete` — JWT (Taker)
Sin body. Solo válido si la tarea está `assigned`. Cambia a `completed`.

### `POST /tasks/:id/confirm` — JWT (Giver)
```json
{ "rating": 5, "comment": "Excelente trabajo" }
```
Solo válido si la tarea está `completed` y existe un pago en estado `held`. Libera el pago (`released`), marca la tarea `confirmed` y actualiza el Passport del Taker (total_tasks, completion_rate, avg_rating, earnings).

---

## Payments

Dos proveedores disponibles: `mercadopago` (por defecto) y `webpay` (modo testing TBK). El campo `provider` en el body de `/create` es opcional; si no se envía, se usa `PAYMENT_PROVIDER` del entorno.

### `POST /payments/create` — JWT (Giver)
```json
{ "taskId": "uuid-de-la-tarea", "provider": "mercadopago" }
```
Crea la transacción/preferencia con el proveedor elegido y un registro `payments` en estado `pending`. Responde siempre con un campo `redirectUrl` — es el que debe usar el frontend para redirigir al Giver, sin importar el proveedor:
```json
{ "provider": "mercadopago", "redirectUrl": "https://www.mercadopago.cl/checkout/...", "status": "pending" }
```
Si ya existe un pago `held` para esa tarea, responde `{ "alreadyPaid": true, "status": "held" }` en vez de crear uno nuevo.

### `POST /payments/webhook` — WebPay
```json
{ "token_ws": "token-recibido-de-webpay" }
```
Sin auth (llamado por Transbank). Marca el pago como `held` (fondos retenidos en escrow).

### `POST /payments/mercadopago/webhook` — Mercado Pago
Sin auth (llamado por Mercado Pago; acepta tanto notificación GET con `?data.id=` como POST con body `{data:{id}}`). Nunca confía en el cuerpo de la notificación: siempre vuelve a consultar el pago contra la API de Mercado Pago con el access token del servidor antes de marcarlo `held`. Configurar la URL pública de este endpoint (`BACKEND_PUBLIC_URL`) es obligatorio para que Mercado Pago pueda alcanzarlo — ver `docs/DEPLOY_VULTR.md`.

### `GET /payments/status/:taskId` — JWT (Giver o Taker de esa tarea)
Consulta el estado real del pago. Usado por el frontend (`PaymentReturn.tsx`) para confirmar visualmente que el webhook ya procesó el pago, con reintentos cortos — el webhook de Mercado Pago puede llegar unos segundos después del redirect del comprador.
```json
{ "status": "held", "provider": "mercadopago" }
```

---

## Admin

Todas las rutas bajo `/admin` requieren el header `x-admin-key` con el valor de `ADMIN_API_KEY` del entorno. Si esa variable no está configurada, todas responden `503` (falla cerrado, no abierto). No hay rol "admin" en la tabla de usuarios todavía — este es un mecanismo mínimo para el MVP, pensado para uno o dos operadores, no para un equipo de soporte.

### `GET /admin/verifications/pending`
Lista Takers con documentos de identidad subidos, pendientes de revisión.

### `GET /admin/verifications/:userId/documents`
Genera URLs prefirmadas de MinIO (5 minutos de validez) para ver la cédula y la selfie subidas. El bucket es privado — estas URLs son la única forma de acceder a esos archivos.
```json
{ "documentUrl": "https://...", "selfieUrl": "https://...", "expiresInSeconds": 300 }
```

### `POST /admin/verifications/:userId/approve`
Marca `verified = true`.

### `POST /admin/verifications/:userId/reject`
Limpia los documentos subidos para que el Taker pueda volver a intentarlo.

---

## Passport

### `GET /passport/:userId` — JWT
Devuelve `total_tasks`, `completion_rate`, `avg_rating`, `skills`, `earnings` y las últimas 10 tareas confirmadas del Taker.

---

## Ratings

### `POST /ratings` — JWT (Giver)
```json
{ "taskId": "uuid-de-la-tarea", "score": 5, "comment": "Muy puntual" }
```
Solo permitido sobre tareas `completed` o `confirmed` que pertenezcan al Giver autenticado.

---

## Errores

Todas las respuestas de error siguen el formato:
```json
{ "error": "Mensaje descriptivo" }
```
Errores de validación (Zod) incluyen además:
```json
{ "error": "Datos inválidos", "details": [{ "field": "budget", "message": "..." }] }
```
