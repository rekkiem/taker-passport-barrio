import { Router } from 'express';
import multer from 'multer';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { uploadFile } from '../services/minio.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Formato de imagen no soportado (usar JPG, PNG o WEBP)'));
    }
    cb(null, true);
  },
});

// Perfil del usuario autenticado
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, rut, name, email, phone, role, verified, passport_score, total_earnings, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo perfil' });
  }
});

// Actualizar datos básicos del perfil propio
router.put('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, email } = req.body;
    const result = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email)
       WHERE id = $3 RETURNING id, rut, name, email, phone, role, verified`,
      [name, email, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error actualizando perfil' });
  }
});

// Verificación de identidad del Taker: documento + selfie
router.post(
  '/verify',
  authMiddleware,
  upload.fields([
    { name: 'document', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  async (req: AuthRequest, res) => {
    try {
      const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
      const document = files?.document?.[0];
      const selfie = files?.selfie?.[0];

      if (!document || !selfie) {
        return res.status(400).json({ error: 'Se requiere documento de identidad y selfie' });
      }

      const docUrl = await uploadFile(
        document.buffer,
        `verify/${req.user.id}-document-${Date.now()}.jpg`,
        document.mimetype
      );
      const selfieUrl = await uploadFile(
        selfie.buffer,
        `verify/${req.user.id}-selfie-${Date.now()}.jpg`,
        selfie.mimetype
      );

      // El MVP marca "pending" (verified=false) hasta revisión manual por admin.
      // No se auto-aprueba: evita fraude de identidad en la primera versión.
      await pool.query(
        `UPDATE users SET verification_photo_url = $1, verified = FALSE WHERE id = $2`,
        [JSON.stringify({ document: docUrl, selfie: selfieUrl }), req.user.id]
      );

      res.json({ message: 'Documentos recibidos. Tu perfil está en revisión.', status: 'pending_verification' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error subiendo documentos de verificación' });
    }
  }
);

export default router;
