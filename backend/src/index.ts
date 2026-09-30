import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pool } from './config/database.js';
import { loadEnv } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import taskRoutes from './routes/task.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import passportRoutes from './routes/passport.routes.js';
import ratingRoutes from './routes/rating.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { adminAuth } from './middleware/adminAuth.js';

dotenv.config();
const cfg = loadEnv();
const app = express();
app.set('trust proxy', cfg.TRUST_PROXY_HOPS);
app.use(helmet());
const corsOrigin = cfg.NODE_ENV === 'production' ? cfg.FRONTEND_URL! : (cfg.FRONTEND_URL || true);
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(cfg.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', payments_mode: cfg.PAYMENTS_MODE });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});
app.get('/', (_req, res) => {
  res.json({ service: 'Taker Passport Barrio API', status: 'running', payments_mode: cfg.PAYMENTS_MODE });
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/passport', passportRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminAuth, adminRoutes);
app.use((_req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: cfg.NODE_ENV === 'production' && status === 500 ? 'Error interno del servidor' : (err.message || 'Error interno'),
  });
});
if (cfg.NODE_ENV !== 'test') {
  app.listen(cfg.PORT, () => console.log(`🚀 Backend puerto ${cfg.PORT} PAYMENTS_MODE=${cfg.PAYMENTS_MODE}`));
}
export default app;
