import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createTransaction, confirmTransaction } from '../services/webpay.service.js';

const router = Router();

function canActAs(userRole: string | undefined, role: 'giver' | 'taker') {
  return userRole === role || userRole === 'both';
}

function frontendReturnUrl() {
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/return`;
}

router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!canActAs(req.user.role, 'giver')) {
      return res.status(403).json({ error: 'Solo una cuenta Giver puede pagar tareas' });
    }

    const { taskId } = req.body;
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

    if (existing.rows[0]?.status === 'pending' && existing.rows[0].webpay_token) {
      const token = existing.rows[0].webpay_token;
      return res.json({
        token,
        url: 'https://webpay3gint.transbank.cl/webpayserver/initTransaction',
        mockUrl: `${frontendReturnUrl()}?token_ws=${token}&TBK_ORDEN_COMPRA=${taskId}`,
        status: 'pending',
      });
    }

    const tx = await createTransaction(task.rows[0].budget, taskId, frontendReturnUrl());

    await pool.query(
      `INSERT INTO payments (task_id, amount, status, webpay_token)
       VALUES ($1, $2, 'pending', $3)`,
      [taskId, task.rows[0].budget, tx.token]
    );

    res.json({ token: tx.token, url: tx.url, mockUrl: tx.mockUrl, status: 'pending' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando pago' });
  }
});

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

export default router;
