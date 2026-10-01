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

  // Postgres (opcional hasta que el panel esté desplegado: la landing solo usa
  // el formulario de contacto, que no necesita base de datos).
  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^postgres(ql)?:\/\//, 'Debe ser una URL postgres://')
      .optional(),
  ),

  // ── Panel de gestión ────────────────────────────────────
  // Origen exacto del panel: toda petición que modifica datos debe venir de él.
  ADMIN_ORIGIN: z.string().url().default('http://localhost:5174'),
  // Secreto compartido con el nginx de admin.hodex.es. Sin él, /api/admin no
  // es accesible desde el dominio público api.hodex.es. Obligatorio en producción.
  ADMIN_GATEWAY_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32, 'Mínimo 32 caracteres').optional(),
  ),
  // Clave AES-256 (32 bytes en base64) para cifrar secretos TOTP en la BD.
  // Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  AUTH_ENCRYPTION_KEY: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(
        (v) => Buffer.from(v, 'base64').length === 32,
        'Debe ser una clave de 32 bytes en base64',
      )
      .optional(),
  ),

  // URL pública desde la que el cliente abre los enlaces de factura (WhatsApp).
  // En producción la landing (www.hodex.es), que reenvía /api al backend.
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:5173'),
  // Remitente de las facturas. Por defecto, CONTACT_FROM.
  INVOICE_FROM: z.preprocess(emptyToUndefined, z.string().optional()),

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

/** True si hay base de datos configurada (requisito del panel de gestión). */
export const isDatabaseConfigured = Boolean(env.DATABASE_URL)

const isProduction = env.NODE_ENV === 'production'

/**
 * El panel solo se habilita con todas sus piezas de seguridad. Si falta algo,
 * /api/admin responde 404 (falla cerrado, nunca abierto). En producción además
 * exige el secreto del gateway y un origen HTTPS.
 */
export const isAdminConfigured = Boolean(
  env.DATABASE_URL &&
    env.AUTH_ENCRYPTION_KEY &&
    (!isProduction ||
      (env.ADMIN_GATEWAY_SECRET && env.ADMIN_ORIGIN.startsWith('https://'))),
)

/** True solo si hay lo mínimo para enviar email de verdad. */
export const isEmailConfigured = Boolean(
  env.CONTACT_TO && (env.RESEND_API_KEY || (env.SMTP_HOST && env.SMTP_PORT)),
)
