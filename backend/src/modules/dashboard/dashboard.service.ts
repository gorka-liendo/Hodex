import { and, gte, isNull, lte, sql } from 'drizzle-orm'
import { getDb } from '../../db/client.js'
import { expenses, invoices } from '../../db/schema/index.js'
import { currentMonth, currentQuarter, todayInSpain } from '../../lib/periods.js'

const sumBigint = (expression: ReturnType<typeof sql>) =>
  sql<number>`coalesce(${expression}, 0)::bigint`.mapWith(Number)

/**
 * Indicadores del resumen, agregados en SQL. Fechas en hora de Madrid.
 * Solo cuentan las facturas EMITIDAS (un borrador no tiene efectos fiscales).
 */
export async function getDashboard(now = new Date()) {
  const month = currentMonth(now)
  const quarter = currentQuarter(now)
  const today = todayInSpain(now)
  const db = getDb()

  const expenseInMonth = sql`${expenses.issueDate} between ${month.from} and ${month.to}`
  const expenseInQuarter = sql`${expenses.issueDate} between ${quarter.from} and ${quarter.to}`
  const invoiceInMonth = sql`${invoices.issueDate} between ${month.from} and ${month.to}`
  const invoiceInQuarter = sql`${invoices.issueDate} between ${quarter.from} and ${quarter.to}`
  const unpaidInvoice = sql`${invoices.paidOn} is null`

  const [[expenseRow], [invoiceRow]] = await Promise.all([
    db
      .select({
        monthBaseCents: sumBigint(sql`sum(${expenses.baseCents}) filter (where ${expenseInMonth})`),
        monthCount: sql<number>`count(*) filter (where ${expenseInMonth})::int`,
        quarterDeductibleVatCents: sumBigint(
          sql`sum(${expenses.vatCents}) filter (where ${expenseInQuarter} and ${expenses.vatDeductible})`,
        ),
        unpaidTotalCents: sumBigint(sql`sum(${expenses.totalCents}) filter (where ${expenses.paidOn} is null)`),
        unpaidCount: sql<number>`count(*) filter (where ${expenses.paidOn} is null)::int`,
      })
      .from(expenses)
      .where(
        and(
          isNull(expenses.deletedAt),
          sql`(${and(gte(expenses.issueDate, quarter.from), lte(expenses.issueDate, quarter.to))} or ${expenses.paidOn} is null)`,
        ),
      ),
    db
      .select({
        monthBaseCents: sumBigint(sql`sum(${invoices.baseCents}) filter (where ${invoiceInMonth})`),
        monthCount: sql<number>`count(*) filter (where ${invoiceInMonth})::int`,
        quarterOutputVatCents: sumBigint(sql`sum(${invoices.vatCents}) filter (where ${invoiceInQuarter})`),
        outstandingCents: sumBigint(sql`sum(${invoices.totalCents}) filter (where ${unpaidInvoice})`),
        outstandingCount: sql<number>`count(*) filter (where ${unpaidInvoice})::int`,
        overdueCents: sumBigint(sql`sum(${invoices.totalCents}) filter (where ${unpaidInvoice} and ${invoices.dueDate} < ${today})`),
        overdueCount: sql<number>`count(*) filter (where ${unpaidInvoice} and ${invoices.dueDate} < ${today})::int`,
      })
      .from(invoices)
      .where(sql`${invoices.status} = 'issued'`),
  ])

  return {
    month: {
      ...month,
      expensesBaseCents: expenseRow!.monthBaseCents,
      expensesCount: expenseRow!.monthCount,
      invoicedBaseCents: invoiceRow!.monthBaseCents,
      invoicedCount: invoiceRow!.monthCount,
    },
    quarter: {
      ...quarter,
      outputVatCents: invoiceRow!.quarterOutputVatCents,
      deductibleVatCents: expenseRow!.quarterDeductibleVatCents,
      // Estimación del modelo 303: IVA repercutido − IVA soportado deducible.
      vatBalanceCents: invoiceRow!.quarterOutputVatCents - expenseRow!.quarterDeductibleVatCents,
    },
    receivables: {
      outstandingCents: invoiceRow!.outstandingCents,
      outstandingCount: invoiceRow!.outstandingCount,
      overdueCents: invoiceRow!.overdueCents,
      overdueCount: invoiceRow!.overdueCount,
    },
    unpaidExpenses: { totalCents: expenseRow!.unpaidTotalCents, count: expenseRow!.unpaidCount },
  }
}
