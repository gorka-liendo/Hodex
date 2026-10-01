import { and, desc, eq, gte, like, lt, not, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/client.js'
import { auditLog } from '../../db/schema/index.js'
import { addDays, currentMonth } from '../../lib/periods.js'
import { isoDate, paginationSchema } from '../../lib/validation.js'

/** Grupos del visor → prefijos de acción. */
const GROUPS = {
  access: ['auth.'],
  invoices: ['invoice.'],
  expenses: ['expense.', 'attachment.upload', 'attachment.delete'],
  ai: ['attachment.extract'],
  contacts: ['contact.'],
  settings: ['settings.', 'taxes.'],
} as const

export const auditQuerySchema = paginationSchema.extend({
  group: z.enum(['all', ...(Object.keys(GROUPS) as Array<keyof typeof GROUPS>)]).default('all'),
  outcome: z.enum(['all', 'success', 'failure']).default('all'),
  from: isoDate.optional(),
  to: isoDate.optional(),
})

export type AuditQuery = z.infer<typeof auditQuerySchema>

const escapeLike = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`)

/** Fecha `AAAA-MM-DD` de Madrid → instante de inicio de ese día. */
const madridDayStart = (day: string) => sql`(${day}::date)::timestamp at time zone 'Europe/Madrid'`

/** Registro de actividad, del más reciente al más antiguo. Excluye eventos de tests. */
export async function listAudit(query: AuditQuery) {
  const filters: SQL[] = [not(like(auditLog.action, 'test.%'))]
  if (query.group !== 'all') {
    filters.push(or(...GROUPS[query.group].map((prefix) => like(auditLog.action, `${escapeLike(prefix)}%`)))!)
  }
  if (query.outcome !== 'all') filters.push(eq(auditLog.outcome, query.outcome))
  if (query.from) filters.push(gte(auditLog.occurredAt, madridDayStart(query.from)))
  if (query.to) filters.push(lt(auditLog.occurredAt, madridDayStart(addDays(query.to, 1))))
  const where = and(...filters)
  const db = getDb()

  const [items, [count]] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        occurredAt: auditLog.occurredAt,
        action: auditLog.action,
        outcome: auditLog.outcome,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        metadata: auditLog.metadata,
      })
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(auditLog).where(where),
  ])
  return { items, total: count!.total, page: query.page, pageSize: query.pageSize }
}

/**
 * Uso de la IA en el mes: lecturas y tokens. El coste lo estima el panel con
 * los precios del modelo (orientativo).
 */
export async function aiUsageThisMonth(now = new Date()) {
  const month = currentMonth(now)
  const [row] = await getDb()
    .select({
      readings: sql<number>`count(*)::int`,
      inputTokens: sql<number>`coalesce(sum((${auditLog.metadata}->>'inputTokens')::bigint), 0)::bigint`.mapWith(Number),
      outputTokens: sql<number>`coalesce(sum((${auditLog.metadata}->>'outputTokens')::bigint), 0)::bigint`.mapWith(Number),
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.action, 'attachment.extract'),
        gte(auditLog.occurredAt, madridDayStart(month.from)),
        lt(auditLog.occurredAt, madridDayStart(addDays(month.to, 1))),
      ),
    )
  return { month: month.from.slice(0, 7), ...row! }
}

/** Intentos fallidos de acceso en las últimas 24 h (para destacarlos). */
export async function recentFailedLogins(now = new Date()) {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(
      and(
        like(auditLog.action, 'auth.%'),
        eq(auditLog.outcome, 'failure'),
        gte(auditLog.occurredAt, new Date(now.getTime() - 24 * 60 * 60_000)),
      ),
    )
  return row!.count
}
