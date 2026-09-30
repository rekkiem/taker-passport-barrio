import { Router } from 'express';
import { pool } from '../config/database.js';
import { getPresignedUrl } from '../services/minio.service.js';

const router = Router();

// Lista de Takers con documentos subidos, pendientes de revisión manual
router.get('/verifications/pending', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, rut, name, phone, role, created_at
       FROM users
       WHERE verification_photo_url IS NOT NULL AND verified = FALSE
       ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo verificaciones pendientes' });
  }
});

// URLs temporales (5 min) para ver el documento + selfie de un Taker
router.get('/verifications/:userId/documents', async (req, res) => {
  try {
    const result = await pool.query('SELECT verification_photo_url FROM users WHERE id = $1', [req.params.userId]);
    if (result.rows.length === 0 || !result.rows[0].verification_photo_url) {
      return res.status(404).json({ error: 'Este usuario no tiene documentos de verificación' });
    }

    const keys = JSON.parse(result.rows[0].verification_photo_url) as { document: string; selfie: string };
    const [documentUrl, selfieUrl] = await Promise.all([
      getPresignedUrl(keys.document),
      getPresignedUrl(keys.selfie),
    ]);

    res.json({ documentUrl, selfieUrl, expiresInSeconds: 300 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error generando enlaces de documentos' });
  }
});

router.post('/verifications/:userId/approve', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET verified = TRUE WHERE id = $1 RETURNING id, name, verified`,
      [req.params.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Identidad verificada', user: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Error aprobando verificación' });
  }
});

// Rechaza y limpia los documentos para que el Taker pueda volver a subirlos
router.post('/verifications/:userId/reject', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET verified = FALSE, verification_photo_url = NULL WHERE id = $1 RETURNING id, name`,
      [req.params.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Verificación rechazada; el usuario puede volver a subir documentos', user: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Error rechazando verificación' });
  }
});

export default router;
