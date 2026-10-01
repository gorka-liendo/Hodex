import { getDb, type DbExecutor } from '../db/client.js'
import { auditLog } from '../db/schema/index.js'
import type { RequestContext } from '../lib/requestContext.js'

export interface AuditEntry {
  /** Formato `dominio.accion`, p. ej. `auth.login.password`. */
  action: string
  outcome: 'success' | 'failure'
  userId?: string | null
  context?: RequestContext
  /** Contexto adicional. NUNCA contraseñas, tokens ni códigos. */
  metadata?: Record<string, unknown>
}

/**
 * Añade una entrada al registro de auditoría (de solo inserción). Acepta una
 * transacción para que el evento quede atómicamente ligado a lo que describe.
 */
export async function recordAudit(
  entry: AuditEntry,
  db: DbExecutor = getDb(),
): Promise<void> {
  await db.insert(auditLog).values({
    action: entry.action,
    outcome: entry.outcome,
    userId: entry.userId ?? null,
    ipAddress: entry.context?.ip ?? null,
    userAgent: entry.context?.userAgent ?? null,
    metadata: entry.metadata ?? null,
  })
}
