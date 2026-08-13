import { z } from 'zod';

export const registerSchema = z.object({
  rut: z.string().min(8).max(12),
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().regex(/^\+?56?9\d{8}$|^\+?\d{8,15}$/, 'Teléfono inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: z.enum(['giver', 'taker', 'both']),
});

export const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
});

export const createTaskSchema = z.object({
  category: z.string().min(2).max(50),
  description: z.string().min(10, 'Describe la tarea con más detalle').max(1000),
  location: z.enum(['Providencia', 'Ñuñoa'], { message: 'Comuna no soportada en este MVP piloto' }),
  budget: z.coerce.number().positive().max(5_000_000),
});

export const assignTaskSchema = z.object({
  takerId: z.string().uuid(),
});

export const ratingSchema = z.object({
  taskId: z.string().uuid(),
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const confirmTaskSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});
