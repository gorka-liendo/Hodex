import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { timestamps, timestamptz } from './columns.js'

/**
 * Usuarios del panel de gestión. No hay registro público: las cuentas se crean
 * por script. Nunca se guarda nada en claro que permita iniciar sesión.
 */
export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Siempre en minúsculas (lo garantiza el CHECK de abajo).
    email: text('email').notNull(),
    // Hash argon2id (incluye sal y parámetros).
    passwordHash: text('password_hash').notNull(),
    passwordChangedAt: timestamptz('password_changed_at').notNull().defaultNow(),

    // Secreto TOTP cifrado con AES-256-GCM; null hasta que se active el 2FA.
    totpSecretEnc: text('totp_secret_enc'),
    totpEnabledAt: timestamptz('totp_enabled_at'),
    // Último paso de 30 s aceptado: impide reutilizar un código ya usado.
    totpLastUsedStep: bigint('totp_last_used_step', { mode: 'number' }),

    // Bloqueo progresivo ante intentos fallidos.
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: timestamptz('locked_until'),
    lastLoginAt: timestamptz('last_login_at'),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('admin_users_email_key').on(t.email),
    check('admin_users_email_lowercase', sql`${t.email} = lower(${t.email})`),
  ],
)

/**
 * Sesiones activas. El `id` es el SHA-256 del token: el token en claro solo
 * existe en la cookie del navegador, así que un volcado de esta tabla no sirve
 * para suplantar a nadie. Cerrar sesión = borrar la fila.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    // Caducidad por inactividad: se renueva en cada petición.
    lastSeenAt: timestamptz('last_seen_at').notNull().defaultNow(),
    // Caducidad absoluta: no se renueva nunca.
    expiresAt: timestamptz('expires_at').notNull(),
    // Última vez que se volvió a pedir el 2FA (acciones sensibles).
    reauthenticatedAt: timestamptz('reauthenticated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ],
)

/**
 * Paso intermedio del login: la contraseña ya es correcta y falta el código
 * TOTP. Vida corta y número de intentos limitado. Mismo esquema de hash que
 * `sessions`.
 */
export const loginChallenges = pgTable(
  'login_challenges',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    expiresAt: timestamptz('expires_at').notNull(),
    ipAddress: text('ip_address'),
  },
  (t) => [
    index('login_challenges_user_id_idx').on(t.userId),
    index('login_challenges_expires_at_idx').on(t.expiresAt),
  ],
)

/** Códigos de recuperación de un solo uso (solo su hash). */
export const recoveryCodes = pgTable(
  'recovery_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    usedAt: timestamptz('used_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [index('recovery_codes_user_id_idx').on(t.userId)],
)
