import { z } from 'zod';

const KNOWN_INSECURE_JWT = new Set([
  'supersecretjwtkey2026', 'default', 'changeme', 'secret', 'jwtsecret',
  'jwt_secret', 'test', 'password', '123456', 'changemeplease',
]);
const KNOWN_INSECURE_SECRETS = new Set([
  'takerpass2026', 'minioadmin', 'default', 'testsecret', 'changeme',
  'secret', 'password', 'admin', 'test', 'cambiame-con-openssl-rand-hex-24', '',
]);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET es obligatorio'),
    FRONTEND_URL: z.string().url().optional(),
    BACKEND_PUBLIC_URL: z.string().optional(),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
    PAYMENTS_MODE: z.enum(['manual', 'webpay', 'mercadopago']).default('manual'),
    MANUAL_PAYMENT_INSTRUCTIONS: z.string().optional().default(
      'Transfiere el monto exacto a la cuenta indicada por el operador Taker y envía el comprobante.'
    ),
    DB_PASSWORD: z.string().optional(),
    MINIO_ENDPOINT: z.string().default('minio'),
    MINIO_PORT: z.coerce.number().default(9000),
    MINIO_ROOT_USER: z.string().optional(),
    MINIO_ROOT_PASSWORD: z.string().optional(),
    MINIO_PUBLIC_URL: z.string().optional(),
    MINIO_USE_SSL: z.string().optional().transform((v) => v === 'true' || v === '1'),
    WEBPAY_SECRET: z.string().optional(),
    WEBPAY_COMMERCE_CODE: z.string().optional(),
    MP_ACCESS_TOKEN: z.string().optional(),
    PAYMENT_PROVIDER: z.string().optional(),
    ADMIN_API_KEY: z.string().optional(),
    EVOLUTION_API_URL: z.string().optional(),
    EVOLUTION_API_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return;
    if (data.JWT_SECRET.length < 32) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'],
        message: `JWT_SECRET debe tener al menos 32 caracteres (tiene ${data.JWT_SECRET.length})` });
    }
    if (KNOWN_INSECURE_JWT.has(data.JWT_SECRET.toLowerCase())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'],
        message: 'JWT_SECRET coincide con un valor inseguro conocido.' });
    }
    const check = (name: string, value: string | undefined) => {
      if (!value) return;
      if (KNOWN_INSECURE_SECRETS.has(value) || KNOWN_INSECURE_SECRETS.has(value.toLowerCase())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [name],
          message: `${name} coincide con un valor por defecto inseguro.` });
      }
    };
    check('DB_PASSWORD', data.DB_PASSWORD);
    try { const u = new URL(data.DATABASE_URL); if (u.password) check('DB_PASSWORD', u.password); } catch {}
    check('MINIO_ROOT_USER', data.MINIO_ROOT_USER);
    check('MINIO_ROOT_PASSWORD', data.MINIO_ROOT_PASSWORD);
    check('EVOLUTION_API_KEY', data.EVOLUTION_API_KEY);
    check('WEBPAY_SECRET', data.WEBPAY_SECRET);
    check('ADMIN_API_KEY', data.ADMIN_API_KEY);
    if (!data.FRONTEND_URL) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['FRONTEND_URL'],
        message: 'FRONTEND_URL es obligatorio en producción' });
    }
    if (data.PAYMENTS_MODE === 'webpay') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PAYMENTS_MODE'],
        message: 'webpay disponible desde Fase 3. Usa manual o mercadopago.' });
    }
  });

export type Env = z.infer<typeof envSchema>;
let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`❌ Configuración de entorno inválida:\n${details}`);
    if (process.env.NODE_ENV === 'production') process.exit(1);
    throw new Error('Configuración de entorno inválida');
  }
  cached = parsed.data;
  return cached;
}

export function env(): Env {
  if (!cached) return loadEnv();
  return cached;
}
