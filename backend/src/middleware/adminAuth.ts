import { Request, Response, NextFunction } from 'express';

/**
 * Autenticación mínima para las rutas /api/admin/*. No hay rol "admin" en el
 * esquema de usuarios todavía (MVP), así que se usa un secreto compartido en
 * el header `x-admin-key`, comparado con ADMIN_API_KEY del entorno.
 *
 * Si ADMIN_API_KEY no está configurado, las rutas de admin quedan
 * deshabilitadas por completo (503) en vez de abiertas sin protección —
 * mejor fallar cerrado que dejarlas accesibles por accidente.
 */
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    return res.status(503).json({ error: 'Panel de administración no configurado (falta ADMIN_API_KEY)' });
  }

  const providedKey = req.header('x-admin-key');
  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  next();
}
