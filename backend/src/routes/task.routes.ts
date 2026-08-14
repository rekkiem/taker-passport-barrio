import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { notifyTaskAssigned, notifyNewApplicant } from '../services/evolution.service.js';
import { validateBody } from '../middleware/validate.js';
import { createTaskSchema, assignTaskSchema, confirmTaskSchema } from '../schemas/index.js';

const router = Router();

function canActAs(userRole: string | undefined, role: 'giver' | 'taker') {
  return userRole === role || userRole === 'both';
}

function queryString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

const taskSelect = `
  SELECT
    t.*,
    giver.name AS giver_name,
    taker.name AS taker_name,
    taker.verified AS taker_verified,
    COALESCE(app_counts.applicant_count, 0)::int AS applicant_count,
    CASE
      WHEN t.giver_id = $1 THEN COALESCE(app_details.applicants, '[]'::json)
      ELSE '[]'::json
    END AS applicants,
    EXISTS (
      SELECT 1
      FROM task_applicants my_app
      WHERE my_app.task_id = t.id AND my_app.taker_id = $1
    ) AS has_applied,
    payment.status AS payment_status
  FROM tasks t
  JOIN users giver ON giver.id = t.giver_id
  LEFT JOIN users taker ON taker.id = t.taker_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS applicant_count
    FROM task_applicants ta
    WHERE ta.task_id = t.id
  ) app_counts ON true
  LEFT JOIN LATERAL (
    SELECT json_agg(
      json_build_object(
        'id', u.id,
        'name', u.name,
        'verified', u.verified,
        'created_at', ta.created_at,
        'passport', json_build_object(
          'total_tasks', COALESCE(p.total_tasks, 0),
          'completion_rate', COALESCE(p.completion_rate, 0),
          'avg_rating', COALESCE(p.avg_rating, 0),
          'earnings', COALESCE(p.earnings, 0),
          'skills', COALESCE(p.skills, ARRAY[]::text[])
        )
      )
      ORDER BY ta.created_at ASC
    ) AS applicants
    FROM task_applicants ta
    JOIN users u ON u.id = ta.taker_id
    LEFT JOIN passports p ON p.user_id = u.id
    WHERE ta.task_id = t.id
  ) app_details ON t.giver_id = $1
  LEFT JOIN LATERAL (
    SELECT status
    FROM payments py
    WHERE py.task_id = t.id
    ORDER BY py.created_at DESC
    LIMIT 1
  ) payment ON true
`;

router.post('/', authMiddleware, validateBody(createTaskSchema), async (req: AuthRequest, res) => {
  try {
    if (!canActAs(req.user.role, 'giver')) {
      return res.status(403).json({ error: 'Solo una cuenta Giver puede crear tareas' });
    }

    const { category, description, location, budget } = req.body;
    const giverId = req.user.id;

    const result = await pool.query(
      `INSERT INTO tasks (giver_id, category, description, location, budget, status)
       VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
      [giverId, category, description, location, budget]
    );

    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando tarea' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const status = queryString(req.query.status);
    const location = queryString(req.query.location);
    const mine = queryString(req.query.mine);
    const available = queryString(req.query.available) === 'true';
    const params: any[] = [req.user.id];
    const where: string[] = [];

    if (mine === 'giver') {
      where.push('t.giver_id = $1');
    }

    if (mine === 'taker') {
      where.push(`(
        t.taker_id = $1 OR EXISTS (
          SELECT 1 FROM task_applicants my_tasks
          WHERE my_tasks.task_id = t.id AND my_tasks.taker_id = $1
        )
      )`);
    }

    if (available) {
      where.push("t.status = 'open'");
      where.push('t.giver_id <> $1');
    }

    if (status && !available) {
      params.push(status);
      where.push(`t.status = $${params.length}`);
    }

    if (location) {
      params.push(location);
      where.push(`t.location = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = await pool.query(`${taskSelect} ${whereSql} ORDER BY t.created_at DESC`, params);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error listando tareas' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`${taskSelect} WHERE t.id = $2`, [req.user.id, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo tarea' });
  }
});

router.post('/:id/apply', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!canActAs(req.user.role, 'taker')) {
      return res.status(403).json({ error: 'Solo una cuenta Taker puede postular a tareas' });
    }

    const taskId = req.params.id;
    const takerId = req.user.id;

    const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    if (task.rows[0].status !== 'open') return res.status(400).json({ error: 'Tarea no disponible' });
    if (task.rows[0].giver_id === takerId) return res.status(400).json({ error: 'No puedes postular a tu propia tarea' });

    const inserted = await pool.query(
      `INSERT INTO task_applicants (task_id, taker_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [taskId, takerId]
    );

    if (inserted.rows.length === 0) {
      return res.json({ message: 'Ya habías postulado a esta tarea', alreadyApplied: true });
    }

    const giver = await pool.query('SELECT phone FROM users WHERE id = $1', [task.rows[0].giver_id]);
    if (giver.rows[0]?.phone) void notifyNewApplicant(giver.rows[0].phone, task.rows[0].description);

    res.json({ message: 'Postulación enviada', alreadyApplied: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en postulación' });
  }
});

router.post('/:id/assign', authMiddleware, validateBody(assignTaskSchema), async (req: AuthRequest, res) => {
  try {
    if (!canActAs(req.user.role, 'giver')) {
      return res.status(403).json({ error: 'Solo una cuenta Giver puede asignar tareas' });
    }

    const { takerId } = req.body;
    const taskId = req.params.id;

    const task = await pool.query('SELECT * FROM tasks WHERE id = $1 AND giver_id = $2', [taskId, req.user.id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada o no autorizado' });
    if (task.rows[0].status !== 'open') {
      return res.status(400).json({ error: `No se puede asignar una tarea en estado "${task.rows[0].status}"` });
    }

    const applicant = await pool.query(
      `SELECT u.id, u.phone, u.name
       FROM task_applicants ta
       JOIN users u ON u.id = ta.taker_id
       WHERE ta.task_id = $1 AND ta.taker_id = $2 AND u.role IN ('taker', 'both')`,
      [taskId, takerId]
    );
    if (applicant.rows.length === 0) {
      return res.status(400).json({ error: 'Ese Taker no ha postulado a esta tarea' });
    }

    const updated = await pool.query(
      `UPDATE tasks
       SET taker_id = $1, status = 'assigned'
       WHERE id = $2
       RETURNING *`,
      [takerId, taskId]
    );

    const giver = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    void notifyTaskAssigned(applicant.rows[0].phone, giver.rows[0].name, task.rows[0].description);

    res.json({ message: 'Tarea asignada', task: updated.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en asignación' });
  }
});

router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!canActAs(req.user.role, 'taker')) {
      return res.status(403).json({ error: 'Solo una cuenta Taker puede completar tareas' });
    }

    const taskId = req.params.id;
    const task = await pool.query('SELECT * FROM tasks WHERE id = $1 AND taker_id = $2', [taskId, req.user.id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada o no autorizado' });
    if (task.rows[0].status !== 'assigned') {
      return res.status(400).json({ error: `No se puede completar una tarea en estado "${task.rows[0].status}"` });
    }

    const payment = await pool.query("SELECT id FROM payments WHERE task_id = $1 AND status = 'held'", [taskId]);
    if (payment.rows.length === 0) {
      return res.status(400).json({ error: 'El pago aún no está retenido; espera a que el Giver pague antes de completar' });
    }

    await pool.query(
      "UPDATE tasks SET status = 'completed', completed_at = NOW() WHERE id = $1",
      [taskId]
    );
    res.json({ message: 'Tarea marcada como completada' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error completando tarea' });
  }
});

router.post('/:id/confirm', authMiddleware, validateBody(confirmTaskSchema), async (req: AuthRequest, res) => {
  try {
    if (!canActAs(req.user.role, 'giver')) {
      return res.status(403).json({ error: 'Solo una cuenta Giver puede confirmar tareas' });
    }

    const taskId = req.params.id;
    const { rating, comment } = req.body;

    const task = await pool.query('SELECT * FROM tasks WHERE id = $1 AND giver_id = $2', [taskId, req.user.id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    if (task.rows[0].status !== 'completed') {
      return res.status(400).json({ error: `No se puede confirmar una tarea en estado "${task.rows[0].status}"` });
    }

    const payment = await pool.query("SELECT * FROM payments WHERE task_id = $1 AND status = 'held'", [taskId]);
    if (payment.rows.length === 0) {
      return res.status(400).json({ error: 'No hay un pago retenido (held) para esta tarea' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        "UPDATE tasks SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1",
        [taskId]
      );

      await client.query(
        "UPDATE payments SET status = 'released', released_at = NOW() WHERE task_id = $1 AND status = 'held'",
        [taskId]
      );

      if (rating) {
        await client.query(
          `INSERT INTO ratings (task_id, giver_id, taker_id, score, comment)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (task_id) DO UPDATE SET score = EXCLUDED.score, comment = EXCLUDED.comment`,
          [taskId, req.user.id, task.rows[0].taker_id, rating, comment]
        );
      }

      await client.query(
        `INSERT INTO passports (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [task.rows[0].taker_id]
      );

      await client.query(
        `UPDATE passports SET
          total_tasks = (SELECT COUNT(*) FROM tasks WHERE taker_id = $1 AND status = 'confirmed'),
          completion_rate = (
            SELECT COUNT(*) FILTER (WHERE status = 'confirmed') * 100.0 / NULLIF(COUNT(*), 0)
            FROM tasks
            WHERE taker_id = $1 AND status IN ('assigned', 'completed', 'confirmed')
          ),
          avg_rating = (SELECT AVG(score) FROM ratings WHERE taker_id = $1),
          earnings = (SELECT COALESCE(SUM(budget), 0) FROM tasks WHERE taker_id = $1 AND status = 'confirmed'),
          updated_at = NOW()
         WHERE user_id = $1`,
        [task.rows[0].taker_id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({ message: 'Tarea confirmada y pago liberado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en confirmación' });
  }
});

export default router;
