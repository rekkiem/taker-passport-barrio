import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { taskId, score, comment } = req.body;
    const task = await pool.query('SELECT * FROM tasks WHERE id = $1 AND giver_id = $2', [taskId, req.user.id]);
    if (task.rows.length === 0) return res.status(403).json({ error: 'No autorizado' });

    await pool.query(
      'INSERT INTO ratings (task_id, giver_id, taker_id, score, comment) VALUES ($1, $2, $3, $4, $5)',
      [taskId, req.user.id, task.rows[0].taker_id, score, comment]
    );

    res.json({ message: 'Calificación guardada' });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando calificación' });
  }
});

export default router;