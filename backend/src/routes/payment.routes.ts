import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createTransaction, confirmTransaction } from '../services/webpay.service.js';
import { createPreference, fetchPayment } from '../services/mercadopago.service.js';

const router = Router();

function canActAs(userRole: string | undefined, role: 'giver' | 'taker') {
  return userRole === role || userRole === 'both';
}

function frontendReturnUrl() {
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/return`;
}

function backendUrl() {
  // URL desde la que Mercado Pago puede alcanzar nuestro webhook — en un VPS
  // real esto es el mismo dominio público (el Nginx del host enruta /api al
  // backend), nunca 127.0.0.1.
  return process.env.BACKEND_PUBLIC_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api`;
}

router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!canActAs(req.user.role, 'giver')) {
      return res.status(403).json({ error: 'Solo una cuenta Giver puede pagar tareas' });
    }

    const { taskId } = req.body;
    const provider: 'webpay' | 'mercadopago' =
      req.body.provider || (process.env.PAYMENT_PROVIDER as any) || 'mercadopago';
    if (!['webpay', 'mercadopago'].includes(provider)) {
      return res.status(400).json({ error: 'Proveedor de pago inválido' });
    }

    const task = await pool.query('SELECT * FROM tasks WHERE id = $1 AND giver_id = $2', [taskId, req.user.id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    if (task.rows[0].status !== 'assigned') {
      return res.status(400).json({ error: `Solo se puede pagar una tarea asignada; estado actual: "${task.rows[0].status}"` });
    }

    const existing = await pool.query(
      `SELECT *
       FROM payments
       WHERE task_id = $1 AND status IN ('pending', 'held', 'released')
       ORDER BY created_at DESC
       LIMIT 1`,
      [taskId]
    );

    if (existing.rows[0]?.status === 'held') {
      return res.json({ message: 'El pago ya está retenido', alreadyPaid: true, status: 'held' });
    }

    if (existing.rows[0]?.status === 'released') {
      return res.status(400).json({ error: 'El pago de esta tarea ya fue liberado' });
    }

    if (existing.rows[0]?.status === 'pending' && existing.rows[0].provider === 'webpay' && existing.rows[0].webpay_token) {
      const token = existing.rows[0].webpay_token;
      return res.json({
        provider: 'webpay',
        token,
        url: 'https://webpay3gint.transbank.cl/webpayserver/initTransaction',
        mockUrl: `${frontendReturnUrl()}?token_ws=${token}&TBK_ORDEN_COMPRA=${taskId}`,
        redirectUrl: `${frontendReturnUrl()}?token_ws=${token}&TBK_ORDEN_COMPRA=${taskId}`,
        status: 'pending',
      });
    }
    // Si el pago pendiente existente es de Mercado Pago, se crea una
    // preferencia nueva más abajo y se actualiza ese mismo registro — la API
    // de Mercado Pago no expone el init_point de una preferencia ya creada,
    // pero como crear preferencias no tiene costo ni efectos secundarios,
    // no hace falta guardar el init_point original.

    if (provider === 'webpay') {
      const tx = await createTransaction(task.rows[0].budget, taskId, frontendReturnUrl());
      await pool.query(
        `INSERT INTO payments (task_id, amount, status, provider, webpay_token)
         VALUES ($1, $2, 'pending', 'webpay', $3)`,
        [taskId, task.rows[0].budget, tx.token]
      );
      return res.json({
        provider: 'webpay',
        token: tx.token,
        url: tx.url,
        mockUrl: tx.mockUrl,
        redirectUrl: tx.mockUrl,
        status: 'pending',
      });
    }

    // Mercado Pago (Checkout Pro)
    const pref = await createPreference({
      taskId,
      title: `Taker Passport Barrio — ${task.rows[0].category}`,
      amount: Number(task.rows[0].budget),
      returnUrl: frontendReturnUrl(),
      notificationUrl: `${backendUrl()}/payments/mercadopago/webhook`,
    });

    if (existing.rows[0]?.status === 'pending') {
      await pool.query(
        `UPDATE payments SET provider = 'mercadopago', mp_preference_id = $1 WHERE id = $2`,
        [pref.preferenceId, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO payments (task_id, amount, status, provider, mp_preference_id)
         VALUES ($1, $2, 'pending', 'mercadopago', $3)`,
        [taskId, task.rows[0].budget, pref.preferenceId]
      );
    }

    res.json({
      provider: 'mercadopago',
      preferenceId: pref.preferenceId,
      redirectUrl: pref.initPoint,
      status: 'pending',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando pago' });
  }
});

// Webhook de WebPay
router.post('/webhook', async (req, res) => {
  try {
    const { token_ws } = req.body;
    if (!token_ws) return res.status(400).json({ error: 'token_ws requerido' });

    const confirmed = await confirmTransaction(token_ws);

    const updated = await pool.query(
      `UPDATE payments
       SET status = 'held', held_at = COALESCE(held_at, NOW()), webpay_response = $1
       WHERE webpay_token = $2 AND status = 'pending'
       RETURNING task_id, status`,
      [JSON.stringify(confirmed), token_ws]
    );

    if (updated.rows.length === 0) {
      const existing = await pool.query('SELECT task_id, status FROM payments WHERE webpay_token = $1', [token_ws]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Pago no encontrado' });
      return res.json({ status: existing.rows[0].status, taskId: existing.rows[0].task_id });
    }

    res.json({ status: 'held', taskId: updated.rows[0].task_id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en webhook' });
  }
});

// Webhook de Mercado Pago. MP puede notificar por GET (formato viejo,
// ?topic=payment&id=X) o POST (formato nuevo, body {type, data:{id}}) —
// se soportan ambos. SIEMPRE se vuelve a consultar el pago contra la API
// de Mercado Pago con el access token del servidor antes de liberar nada:
// el cuerpo de la notificación en sí no es una fuente confiable (cualquiera
// puede simular un POST a esta URL).
async function handleMercadoPagoWebhook(req: any, res: any) {
  try {
    const paymentId =
      req.body?.data?.id ||
      req.query['data.id'] ||
      (req.query.topic === 'payment' ? req.query.id : undefined);

    if (!paymentId) return res.status(200).json({ received: true }); // ack, nada que procesar

    const payment = await fetchPayment(String(paymentId));
    const taskId = payment.external_reference;
    if (!taskId) return res.status(200).json({ received: true });

    if (payment.status === 'approved') {
      await pool.query(
        `UPDATE payments
         SET status = 'held', held_at = COALESCE(held_at, NOW()), mp_payment_id = $1, mp_response = $2
         WHERE task_id = $3 AND provider = 'mercadopago' AND status = 'pending'`,
        [String(payment.id), JSON.stringify(payment), taskId]
      );
    } else {
      // pending / rejected / in_process: se registra la respuesta pero no se
      // libera el escrow hasta que Mercado Pago confirme 'approved'
      await pool.query(
        `UPDATE payments SET mp_payment_id = $1, mp_response = $2
         WHERE task_id = $3 AND provider = 'mercadopago'`,
        [String(payment.id), JSON.stringify(payment), taskId]
      );
    }

    res.status(200).json({ received: true });
  } catch (e) {
    console.error(e);
    // 200 igual: si devolvemos error, Mercado Pago reintenta agresivamente.
    // El estado real se puede re-verificar luego con /status/:taskId.
    res.status(200).json({ received: true });
  }
}

router.post('/mercadopago/webhook', handleMercadoPagoWebhook);
router.get('/mercadopago/webhook', handleMercadoPagoWebhook);

// Consulta de estado por tarea — usado por el frontend (PaymentReturn) para
// confirmar visualmente que el webhook ya llegó, con reintentos cortos,
// ya que el webhook de Mercado Pago puede tardar unos segundos más que el
// redirect del comprador.
router.get('/status/:taskId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT p.status, p.provider
       FROM payments p
       JOIN tasks t ON t.id = p.task_id
       WHERE p.task_id = $1 AND (t.giver_id = $2 OR t.taker_id = $2)
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [req.params.taskId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error consultando estado del pago' });
  }
});

export default router;
