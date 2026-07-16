import 'dotenv/config'
import { z } from 'zod'

/**
 * Trata el string vacío como ausente. Compose inyecta las variables no definidas
 * como "" (no como undefined), así que sin esto los campos opcionales fallarían.
 */
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v)

/**
 * Esquema de variables de entorno. Se valida al arrancar: si algo falta o es
 * inválido, el proceso termina con un mensaje claro en vez de fallar en runtime.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // Orígenes CORS separados por coma.
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Email (opcional). Vía preferente: API HTTP de Resend (puerto 443 — los
  // puertos SMTP salientes están bloqueados en muchos PaaS, Railway incluido).
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  // Alternativa: SMTP clásico (nodemailer).
  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  // Evitamos z.coerce.boolean() (convierte cualquier string no vacío en true).
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PASS: z.preprocess(emptyToUndefined, z.string().optional()),
  CONTACT_TO: z.preprocess(emptyToUndefined, z.string().email().optional()),
  CONTACT_FROM: z.preprocess(emptyToUndefined, z.string().optional()),
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
  env.CONTACT_TO && (env.RESEND_API_KEY || (env.SMTP_HOST && env.SMTP_PORT)),
)
