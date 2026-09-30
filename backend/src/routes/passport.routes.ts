import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
const router = Router();
function shortName(full: string) {
  const p = (full||'').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'Usuario';
  if (p.length===1) return p[0];
  return `${p[0]} ${p[p.length-1][0]}.`;
}
router.get('/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const isSelf = req.user?.id === req.params.userId;
    const result = await pool.query(
      `SELECT p.total_tasks, p.completion_rate, p.avg_rating, p.skills, u.name, u.verified
       FROM passports p JOIN users u ON p.user_id=u.id WHERE p.user_id=$1`, [req.params.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Passport no encontrado' });
    const row = result.rows[0];
    const history = await pool.query(
      `SELECT t.id, t.category, t.budget, t.completed_at, r.score FROM tasks t
       LEFT JOIN ratings r ON t.id=r.task_id WHERE t.taker_id=$1 AND t.status='confirmed'
       ORDER BY t.completed_at DESC LIMIT 10`, [req.params.userId]);
    res.json({
      name: isSelf ? row.name : shortName(row.name),
      verified: row.verified, total_tasks: row.total_tasks, completion_rate: row.completion_rate,
      avg_rating: row.avg_rating, skills: row.skills||[],
      recent_history: history.rows.map(h => ({ id:h.id, category:h.category, budget:h.budget, completed_at:h.completed_at, score:h.score })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo passport' });
  }
});
export default router;
