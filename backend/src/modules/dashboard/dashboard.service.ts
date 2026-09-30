import { and, gte, isNull, lte, sql } from 'drizzle-orm'
import { getDb } from '../../db/client.js'
import { expenses } from '../../db/schema/index.js'
import { currentMonth, currentQuarter } from '../../lib/periods.js'

const sumBigint = (expression: ReturnType<typeof sql>) =>
  sql<number>`coalesce(${expression}, 0)::bigint`.mapWith(Number)

/**
 * Indicadores del resumen, agregados en SQL en una sola consulta. Las
 * facturas emitidas se añadirán cuando exista el módulo de facturación.
 */
export async function getDashboard(now = new Date()) {
  const month = currentMonth(now)
  const quarter = currentQuarter(now)
  const inMonth = sql`${expenses.issueDate} between ${month.from} and ${month.to}`
  const inQuarter = sql`${expenses.issueDate} between ${quarter.from} and ${quarter.to}`

  const [row] = await getDb()
    .select({
      monthBaseCents: sumBigint(sql`sum(${expenses.baseCents}) filter (where ${inMonth})`),
      monthCount: sql<number>`count(*) filter (where ${inMonth})::int`,
      quarterDeductibleVatCents: sumBigint(
        sql`sum(${expenses.vatCents}) filter (where ${inQuarter} and ${expenses.vatDeductible})`,
      ),
      unpaidTotalCents: sumBigint(sql`sum(${expenses.totalCents}) filter (where ${expenses.paidOn} is null)`),
      unpaidCount: sql<number>`count(*) filter (where ${expenses.paidOn} is null)::int`,
    })
    .from(expenses)
    .where(
      and(
        isNull(expenses.deletedAt),
        // Solo lo relevante: el trimestre en curso o cualquier gasto sin pagar.
        sql`(${and(gte(expenses.issueDate, quarter.from), lte(expenses.issueDate, quarter.to))} or ${expenses.paidOn} is null)`,
      ),
    )

  return {
    month: { ...month, expensesBaseCents: row!.monthBaseCents, expensesCount: row!.monthCount },
    quarter: { ...quarter, deductibleVatCents: row!.quarterDeductibleVatCents },
    unpaidExpenses: { totalCents: row!.unpaidTotalCents, count: row!.unpaidCount },
  }
}
