import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name, u.rut, u.verified 
       FROM passports p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = $1`,
      [req.params.userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Passport no encontrado' });

    const history = await pool.query(
      `SELECT t.id, t.description, t.category, t.budget, t.completed_at, r.score, r.comment
       FROM tasks t
       LEFT JOIN ratings r ON t.id = r.task_id
       WHERE t.taker_id = $1 AND t.status = 'confirmed'
       ORDER BY t.completed_at DESC
       LIMIT 10`,
      [req.params.userId]
    );

    res.json({ ...result.rows[0], recent_history: history.rows });
  } catch (e) {
    res.status(500).json({ error: 'Error obteniendo passport' });
  }
});

export default router;