import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core'
import { adminUsers } from './auth.js'
import { timestamptz } from './columns.js'

export const auditOutcome = pgEnum('audit_outcome', ['success', 'failure'])

/**
 * Registro de auditoría: quién hizo qué, cuándo y desde dónde. Es de solo
 * inserción: un trigger de Postgres (ver migración `audit_log_append_only`)
 * rechaza UPDATE, DELETE y TRUNCATE, así que ni la propia aplicación puede
 * reescribir el historial.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    occurredAt: timestamptz('occurred_at').notNull().defaultNow(),
    // Null en eventos sin usuario identificado (p. ej. login con email inexistente).
    // RESTRICT: un usuario con historial no se puede borrar.
    userId: uuid('user_id').references(() => adminUsers.id, {
      onDelete: 'restrict',
    }),
    // Formato `dominio.accion`, p. ej. `auth.login`, `invoice.issue`.
    action: text('action').notNull(),
    outcome: auditOutcome('outcome').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    // Contexto adicional. Nunca contraseñas, tokens ni códigos.
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  },
  (t) => [
    index('audit_log_occurred_at_idx').on(t.occurredAt),
    index('audit_log_user_id_idx').on(t.userId),
    index('audit_log_action_idx').on(t.action),
  ],
)
