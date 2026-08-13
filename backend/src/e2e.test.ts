import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { pool } from './config/database.js';

// Este test ejercita el flujo de negocio completo contra una base de datos
// PostgreSQL real (no mocks): registro → crear tarea → postular → asignar →
// pagar → completar → confirmar → passport actualizado.
// Requiere DATABASE_URL apuntando a una BD con el esquema de 001_initial.sql aplicado.

let app: any;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-not-for-production';
  process.env.NODE_ENV = 'test';
  ({ default: app } = await import('./index.js'));
});

afterAll(async () => {
  await pool.end();
});

function randomRutSuffix() {
  return Math.floor(1000000 + Math.random() * 8000000).toString();
}

// Genera un RUT chileno válido (dígito verificador módulo 11 correcto) con
// cuerpo aleatorio, para que los tests puedan re-ejecutarse contra una misma
// base persistente sin chocar con la restricción UNIQUE de la tabla users.
function randomValidRut(): string {
  const body = randomRutSuffix();
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const dv = remainder === 11 ? '0' : remainder === 10 ? 'K' : remainder.toString();
  return `${body}-${dv}`;
}

describe('Flujo end-to-end: Giver crea tarea, Taker la completa, pago se libera', () => {
  const giverPhone = `+569${Math.floor(10000000 + Math.random() * 89999999)}`;
  const takerPhone = `+569${Math.floor(10000000 + Math.random() * 89999999)}`;
  let giverToken: string, takerToken: string, taskId: string, takerId: string;

  it('registra un Giver', async () => {
    const res = await request(app).post('/api/auth/register').send({
      rut: randomValidRut(),
      name: 'Giver Test',
      email: `giver${Date.now()}@test.cl`,
      phone: giverPhone,
      password: 'password123',
      role: 'giver',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    giverToken = res.body.token;
  });

  it('registra un Taker', async () => {
    const res = await request(app).post('/api/auth/register').send({
      rut: randomValidRut(),
      name: 'Taker Test',
      email: `taker${Date.now()}@test.cl`,
      phone: takerPhone,
      password: 'password123',
      role: 'taker',
    });
    expect(res.status).toBe(201);
    takerToken = res.body.token;
    takerId = res.body.user.id;
  });

  it('rechaza registro con RUT inválido', async () => {
    const res = await request(app).post('/api/auth/register').send({
      rut: '11111111-9',
      name: 'Invalido',
      phone: '+56911111111',
      password: 'password123',
      role: 'giver',
    });
    expect(res.status).toBe(400);
  });

  it('Giver crea una tarea', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${giverToken}`)
      .send({ category: 'jardineria', description: 'Podar el jardín del patio trasero', location: 'Providencia', budget: 15000 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
    taskId = res.body.id;
  });

  it('Taker postula a la tarea', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/apply`)
      .set('Authorization', `Bearer ${takerToken}`)
      .send();
    expect(res.status).toBe(200);
  });

  it('Giver asigna la tarea al Taker', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/assign`)
      .set('Authorization', `Bearer ${giverToken}`)
      .send({ takerId });
    expect(res.status).toBe(200);
  });

  it('Giver crea el pago (escrow)', async () => {
    const res = await request(app)
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${giverToken}`)
      .send({ taskId });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();

    // Simula el webhook de confirmación de WebPay
    const webhook = await request(app).post('/api/payments/webhook').send({ token_ws: res.body.token });
    expect(webhook.status).toBe(200);
  });

  it('no permite completar antes de estar asignada correctamente ni confirmar antes de completar', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/confirm`)
      .set('Authorization', `Bearer ${giverToken}`)
      .send({});
    expect(res.status).toBe(400); // aún está "assigned", no "completed"
  });

  it('Taker marca la tarea como completada', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${takerToken}`)
      .send();
    expect(res.status).toBe(200);
  });

  it('Giver confirma y el pago se libera + Passport se actualiza', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/confirm`)
      .set('Authorization', `Bearer ${giverToken}`)
      .send({ rating: 5, comment: 'Excelente trabajo' });
    expect(res.status).toBe(200);

    const payment = await pool.query('SELECT status FROM payments WHERE task_id = $1', [taskId]);
    expect(payment.rows[0].status).toBe('released');

    const passport = await request(app)
      .get(`/api/passport/${takerId}`)
      .set('Authorization', `Bearer ${giverToken}`);
    expect(passport.status).toBe(200);
    expect(passport.body.total_tasks).toBe(1);
    expect(Number(passport.body.avg_rating)).toBe(5);
    expect(Number(passport.body.earnings)).toBe(15000);
  });
});
