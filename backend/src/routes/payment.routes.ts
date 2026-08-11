import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createTransaction, confirmTransaction } from '../services/webpay.service.js';

const router = Router();

router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.body;
    const task = await pool.query('SELECT * FROM tasks WHERE id = $1 AND giver_id = $2', [taskId, req.user.id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });

    const tx = await createTransaction(
      task.rows[0].budget,
      taskId,
      `${process.env.FRONTEND_URL}/payment/return`
    );

    await pool.query(
      `INSERT INTO payments (task_id, amount, status, webpay_token) VALUES ($1, $2, 'pending', $3)`,
      [taskId, task.rows[0].budget, tx.token]
    );

    res.json({ token: tx.token, url: tx.url, mockUrl: tx.mockUrl });
  } catch (e) {
    res.status(500).json({ error: 'Error creando pago' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const { token_ws } = req.body;
    const confirmed = await confirmTransaction(token_ws);

    await pool.query(
      "UPDATE payments SET status = 'held', held_at = NOW(), webpay_response = $1 WHERE webpay_token = $2",
      [JSON.stringify(confirmed), token_ws]
    );

    res.json({ status: 'success' });
  } catch (e) {
    res.status(500).json({ error: 'Error en webhook' });
  }
});

export default router;