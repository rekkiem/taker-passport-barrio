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

### `POST /payments/create` — JWT (Giver)
```json
{ "taskId": "uuid-de-la-tarea" }
```
Crea una transacción WebPay (modo testing TBK) y un registro `payments` en estado `pending`.

### `POST /payments/webhook`
```json
{ "token_ws": "token-recibido-de-webpay" }
```
Sin auth (llamado por Transbank). Marca el pago como `held` (fondos retenidos en escrow).

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
