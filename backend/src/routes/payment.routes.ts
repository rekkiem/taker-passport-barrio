import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createTransaction, confirmTransaction } from '../services/webpay.service.js';
import { createPreference, fetchPayment } from '../services/mercadopago.service.js';

const router = Router();
function paymentsMode(): 'manual' | 'webpay' | 'mercadopago' {
  const m = (process.env.PAYMENTS_MODE || process.env.PAYMENT_PROVIDER || 'manual').toLowerCase();
  return (m === 'webpay' || m === 'mercadopago' || m === 'manual') ? m : 'manual';
}
function canActAs(role: string | undefined, r: 'giver' | 'taker') {
  return role === r || role === 'both';
}
function frontendReturnUrl() {
  return `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment/return`;
}
function backendUrl() {
  return process.env.BACKEND_PUBLIC_URL || `${process.env.FRONTEND_URL || 'http://localhost:8080'}/api`;
}
function manualInstructions() {
  return process.env.MANUAL_PAYMENT_INSTRUCTIONS ||
    'Transfiere el monto exacto a la cuenta indicada por el operador Taker y envía el comprobante.';
}

router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!canActAs(req.user.role, 'giver')) return res.status(403).json({ error: 'Solo Giver puede pagar' });
    const { taskId } = req.body;
    const mode = paymentsMode();
    const task = await pool.query('SELECT * FROM tasks WHERE id = $1 AND giver_id = $2', [taskId, req.user.id]);
    if (!task.rows.length) return res.status(404).json({ error: 'Tarea no encontrada' });
    if (task.rows[0].status !== 'assigned') return res.status(400).json({ error: `Estado: ${task.rows[0].status}` });
    const amount = Number(task.rows[0].budget);
    const existing = await pool.query(
      `SELECT * FROM payments WHERE task_id=$1 AND status IN ('pending','held','released') ORDER BY created_at DESC LIMIT 1`, [taskId]);
    if (existing.rows[0]?.status === 'held') return res.json({ alreadyPaid: true, status: 'held' });
    if (existing.rows[0]?.status === 'released') return res.status(400).json({ error: 'Pago ya liberado' });

    if (mode === 'manual') {
      let paymentId = existing.rows[0]?.id;
      if (!paymentId) {
        const ins = await pool.query(
          `INSERT INTO payments (task_id, amount, status, provider) VALUES ($1,$2,'pending','manual') RETURNING id`,
          [taskId, amount]);
        paymentId = ins.rows[0].id;
      }
      return res.json({ mode: 'manual', paymentId, amount, instructions: manualInstructions(), status: 'pending' });
    }
    if (mode === 'mercadopago') {
      const preference = await createPreference({
        taskId, amount, title: `Tarea: ${(task.rows[0].description||'').slice(0,80)}`,
        returnUrl: frontendReturnUrl(), notificationUrl: `${backendUrl()}/payments/mercadopago/webhook`,
      });
      if (!existing.rows[0]) {
        await pool.query(`INSERT INTO payments (task_id,amount,status,provider,mp_preference_id) VALUES ($1,$2,'pending','mercadopago',$3)`,
          [taskId, amount, preference.preferenceId]);
      } else {
        await pool.query(`UPDATE payments SET mp_preference_id=$1, provider='mercadopago' WHERE id=$2`,
          [preference.preferenceId, existing.rows[0].id]);
      }
      return res.json({ mode: 'mercadopago', init_point: preference.initPoint, preferenceId: preference.preferenceId, amount });
    }
    if (mode === 'webpay') {
      if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'webpay desde Fase 3' });
      const tx = await createTransaction(amount, String(taskId), frontendReturnUrl());
      if (!existing.rows[0]) {
        await pool.query(`INSERT INTO payments (task_id,amount,status,provider,webpay_token) VALUES ($1,$2,'pending','webpay',$3)`,
          [taskId, amount, tx.token]);
      }
      return res.json({ mode: 'webpay', token: tx.token, url: tx.url, amount,
        ...(process.env.NODE_ENV === 'test' ? { mockUrl: tx.mockUrl } : {}) });
    }
    return res.status(400).json({ error: 'Modo no soportado' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Error creando pago' });
  }
});

router.post('/webhook', async (req, res) => {
  if (process.env.NODE_ENV !== 'test') return res.status(404).json({ error: 'Recurso no encontrado' });
  try {
    const { token_ws } = req.body;
    if (!token_ws) return res.status(400).json({ error: 'token_ws requerido' });
    const c = await confirmTransaction(token_ws);
    if (c.response_code !== 0 || c.status !== 'AUTHORIZED') return res.status(400).json({ error: 'No autorizado' });
    const r = await pool.query(
      `UPDATE payments SET status='held', held_at=COALESCE(held_at,NOW()) WHERE webpay_token=$1 AND status='pending' RETURNING *`,
      [token_ws]);
    return res.json({ status: r.rows[0] ? 'held' : 'unknown' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error' });
  }
});

export async function markPaymentReceived(req: any, res: any) {
  try {
    const reference = (req.body?.reference || '').toString().slice(0, 200);
    const result = await pool.query(
      `UPDATE payments SET status='held', held_at=COALESCE(held_at,NOW()),
        reference=COALESCE(NULLIF($2,''), reference)
       WHERE id=$1 AND status IN ('pending','held') RETURNING *`,
      [req.params.id, reference]);
    if (!result.rows.length) return res.status(404).json({ error: 'Pago no encontrado' });
    return res.json({ status: result.rows[0].status, payment: result.rows[0] });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

router.post('/:id/mark-received', authMiddleware, async (_req, res) => {
  return res.status(403).json({ error: 'Solo administrador puede confirmar recepción de pago' });
});

async function handleMpWebhook(req: any, res: any) {
  try {
    const paymentId = req.body?.data?.id || req.query['data.id'] || (req.query.topic === 'payment' ? req.query.id : undefined);
    if (!paymentId) return res.status(200).json({ received: true });
    const payment = await fetchPayment(String(paymentId));
    const taskId = payment.external_reference;
    if (!taskId) return res.status(200).json({ received: true });
    if (payment.status === 'approved') {
      await pool.query(
        `UPDATE payments SET status='held', held_at=COALESCE(held_at,NOW()), mp_payment_id=$1, mp_response=$2
         WHERE task_id=$3 AND provider='mercadopago' AND status='pending'`,
        [String(payment.id), JSON.stringify(payment), taskId]);
    }
    res.status(200).json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(200).json({ received: true });
  }
}
router.post('/mercadopago/webhook', handleMpWebhook);
router.get('/mercadopago/webhook', handleMpWebhook);

router.get('/status/:taskId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const r = await pool.query(
      `SELECT p.status, p.provider, p.amount, p.id AS payment_id FROM payments p
       JOIN tasks t ON t.id=p.task_id WHERE p.task_id=$1 AND (t.giver_id=$2 OR t.taker_id=$2)
       ORDER BY p.created_at DESC LIMIT 1`, [req.params.taskId, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});
export default router;
