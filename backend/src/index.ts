import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pool } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import taskRoutes from './routes/task.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import passportRoutes from './routes/passport.routes.js';
import ratingRoutes from './routes/rating.routes.js';

dotenv.config();

// Falla rápido si falta un secreto crítico, en vez de arrancar en un estado inseguro
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET no está definido. Configura tu archivo .env antes de iniciar.');
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1); // detrás de Nginx/reverse proxy en producción

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Límite general de requests por IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// Nota: esta API no sirve nada en "/" — el frontend vive en :8080, este backend
// solo expone /api/*. Esta ruta es únicamente para que quien entre por error
// a localhost:4000 entienda qué está viendo, en vez de un 404 confuso.
app.get('/', (_req, res) => {
  res.json({
    service: 'Taker Passport Barrio API',
    status: 'running',
    frontend: process.env.FRONTEND_URL || 'http://localhost:8080',
    docs: '/health, /api/auth, /api/tasks, /api/passport, /api/payments, /api/ratings, /api/users',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/passport', passportRoutes);
app.use('/api/ratings', ratingRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' });
});

// Manejador de errores centralizado (incluye errores de Multer y no capturados)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Error interno del servidor'
    : err.message || 'Error interno del servidor';
  res.status(status).json({ error: message });
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Backend corriendo en puerto ${PORT}`);
  });
}

export default app;
