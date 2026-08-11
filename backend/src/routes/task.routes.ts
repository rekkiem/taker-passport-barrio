import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { notifyTaskAssigned, notifyNewApplicant } from '../services/evolution.service.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { category, description, location, budget } = req.body;
    const giverId = req.user.id;

    const result = await pool.query(
      `INSERT INTO tasks (giver_id, category, description, location, budget, status) 
       VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
      [giverId, category, description, location, budget]
    );

    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error creando tarea' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, location } = req.query;
    let query = 'SELECT t.*, u.name as giver_name FROM tasks t JOIN users u ON t.giver_id = u.id WHERE 1=1';
    const params: any[] = [];

    if (status) { params.push(status); query += ` AND t.status = $${params.length}`; }
    if (location) { params.push(location); query += ` AND t.location = $${params.length}`; }

    query += ' ORDER BY t.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error listando tareas' });
  }
});

router.post('/:id/apply', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const taskId = req.params.id;
    const takerId = req.user.id;

    const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    if (task.rows[0].status !== 'open') return res.status(400).json({ error: 'Tarea no disponible' });

    if (task.rows[0].giver_id === takerId) return res.status(400).json({ error: 'No puedes postular a tu propia tarea' });

    await pool.query(
      'INSERT INTO task_applicants (task_id, taker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [taskId, takerId]
    );

    const giver = await pool.query('SELECT phone, name FROM users WHERE id = $1', [task.rows[0].giver_id]);
    await notifyNewApplicant(giver.rows[0].phone, task.rows[0].description);

    res.json({ message: 'Postulación enviada' });
  } catch (e) {
    res.status(500).json({ error: 'Error en postulación' });
  }
});

router.post('/:id/assign', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { takerId } = req.body;
    const taskId = req.params.id;

    const task = await pool.query('SELECT * FROM tasks WHERE id = $1 AND giver_id = $2', [taskId, req.user.id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada o no autorizado' });

    await pool.query("UPDATE tasks SET taker_id = $1, status = 'assigned' WHERE id = $2", [takerId, taskId]);

    const taker = await pool.query('SELECT phone, name FROM users WHERE id = $1', [takerId]);
    const giver = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    await notifyTaskAssigned(taker.rows[0].phone, giver.rows[0].name, task.rows[0].description);

    res.json({ message: 'Tarea asignada' });
  } catch (e) {
    res.status(500).json({ error: 'Error en asignación' });
  }
});

router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const taskId = req.params.id;
    await pool.query(
      "UPDATE tasks SET status = 'completed', completed_at = NOW() WHERE id = $1 AND taker_id = $2",
      [taskId, req.user.id]
    );
    res.json({ message: 'Tarea marcada como completada' });
  } catch (e) {
    res.status(500).json({ error: 'Error completando tarea' });
  }
});

router.post('/:id/confirm', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const taskId = req.params.id;
    const { rating, comment } = req.body;

    const task = await pool.query('SELECT * FROM tasks WHERE id = $1 AND giver_id = $2', [taskId, req.user.id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });

    await pool.query(
      "UPDATE tasks SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1",
      [taskId]
    );

    await pool.query(
      "UPDATE payments SET status = 'released', released_at = NOW() WHERE task_id = $1",
      [taskId]
    );

    if (rating) {
      await pool.query(
        'INSERT INTO ratings (task_id, giver_id, taker_id, score, comment) VALUES ($1, $2, $3, $4, $5)',
        [taskId, req.user.id, task.rows[0].taker_id, rating, comment]
      );
    }

    await pool.query(
      `UPDATE passports SET 
        total_tasks = total_tasks + 1,
        completion_rate = (SELECT COUNT(*) FILTER (WHERE status = 'confirmed') * 100.0 / NULLIF(COUNT(*), 0) FROM tasks WHERE taker_id = $1),
        avg_rating = (SELECT AVG(score) FROM ratings WHERE taker_id = $1),
        earnings = earnings + (SELECT budget FROM tasks WHERE id = $2),
        updated_at = NOW()
       WHERE user_id = $1`,
      [task.rows[0].taker_id, taskId]
    );

    res.json({ message: 'Tarea confirmada y pago liberado' });
  } catch (e) {
    res.status(500).json({ error: 'Error en confirmación' });
  }
});

export default router;