import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { validateRut } from '../utils/rut.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { rut, name, email, phone, password, role } = req.body;

    if (!validateRut(rut)) return res.status(400).json({ error: 'RUT inválido' });
    if (!['giver', 'taker', 'both'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });

    const exists = await pool.query('SELECT id FROM users WHERE rut = $1 OR phone = $2', [rut, phone]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Usuario ya existe' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (rut, name, email, phone, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, rut, name, role`,
      [rut, name, email, phone, hash, role]
    );

    // Crear passport automáticamente para takers
    if (role === 'taker' || role === 'both') {
      await pool.query('INSERT INTO passports (user_id) VALUES ($1)', [result.rows[0].id]);
    }

    const token = jwt.sign({ id: result.rows[0].id, role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.status(201).json({ user: result.rows[0], token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en registro' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1 OR phone = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ 
      user: { id: user.id, rut: user.rut, name: user.name, role: user.role, verified: user.verified },
      token 
    });
  } catch (e) {
    res.status(500).json({ error: 'Error en login' });
  }
});

export default router;