import 'dotenv/config'
import { z } from 'zod'

/**
 * Esquema de variables de entorno. Se valida al arrancar: si algo falta o es
 * inválido, el proceso termina con un mensaje claro en vez de fallar en runtime.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // Orígenes CORS separados por coma.
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Email (opcional).
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  // Evitamos z.coerce.boolean() (convierte cualquier string no vacío en true).
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  CONTACT_TO: z.string().email().optional(),
  CONTACT_FROM: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:')
  console.error(JSON.stringify(parsed.error.issues, null, 2))
  process.exit(1)
}

export const env = parsed.data

/** True solo si hay lo mínimo para enviar email de verdad. */
export const isEmailConfigured = Boolean(
  env.SMTP_HOST && env.SMTP_PORT && env.CONTACT_TO,
)
