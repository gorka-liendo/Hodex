import { and, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql, type SQL } from 'drizzle-orm'
import { getDb } from '../../db/client.js'
import { contacts, expenses } from '../../db/schema/index.js'
import { AppError } from '../../lib/AppError.js'
import { breakdownFromTotal, computeBreakdown } from '../../lib/money.js'
import { likePattern } from '../../lib/validation.js'
import { recordAudit } from '../../services/audit.js'
import type { Actor } from '../contacts/contacts.service.js'
import type { ExpenseInput, ExpenseListQuery } from './expenses.schema.js'

const notFound = () => new AppError(404, 'Gasto no encontrado.', { code: 'NotFound' })

const invalidSupplier = (message: string) =>
  new AppError(400, message, {
    code: 'ValidationError',
    details: [{ path: ['supplierId'], message }],
  })

/** Columnas del gasto + nombre del proveedor (una sola consulta con JOIN). */
const expenseWithSupplier = {
  expense: expenses,
  supplier: { id: contacts.id, legalName: contacts.legalName, taxId: contacts.taxId },
}

type Row = { expense: typeof expenses.$inferSelect; supplier: { id: string; legalName: string; taxId: string | null } | null }

function present({ expense, supplier }: Row) {
  const { deletedAt: _deletedAt, ...rest } = expense
  return { ...rest, supplier }
}

export type ExpenseView = ReturnType<typeof present>

/**
 * El proveedor debe existir y estar marcado como proveedor. Si se asigna uno
 * nuevo, además no puede estar archivado (los gastos antiguos lo conservan).
 */
async function assertSupplier(supplierId: string | null, previous?: string | null): Promise<void> {
  if (!supplierId) return
  const [supplier] = await getDb().select().from(contacts).where(eq(contacts.id, supplierId)).limit(1)
  if (!supplier || !supplier.isSupplier) throw invalidSupplier('Elige un proveedor válido')
  if (supplier.archivedAt && supplierId !== previous) {
    throw invalidSupplier('Ese proveedor está archivado')
  }
}

/**
 * Importes calculados en el servidor, a partir de la base o del total pagado
 * (IVA incluido). El cliente nunca fija IVA, retención ni total directamente.
 */
function withAmounts(input: ExpenseInput) {
  const { baseCents, totalCents, ...rest } = input
  const amounts =
    totalCents !== undefined
      ? breakdownFromTotal(totalCents, input.vatRateBp, input.irpfRateBp)
      : computeBreakdown(baseCents!, input.vatRateBp, input.irpfRateBp)
  return { ...rest, ...amounts }
}

export async function listExpenses(query: ExpenseListQuery) {
  const filters: SQL[] = [isNull(expenses.deletedAt)]
  if (query.category) filters.push(eq(expenses.category, query.category))
  if (query.supplierId) filters.push(eq(expenses.supplierId, query.supplierId))
  if (query.from) filters.push(gte(expenses.issueDate, query.from))
  if (query.to) filters.push(lte(expenses.issueDate, query.to))
  if (query.status === 'paid') filters.push(isNotNull(expenses.paidOn))
  if (query.status === 'unpaid') filters.push(isNull(expenses.paidOn))
  if (query.q) {
    const pattern = likePattern(query.q)
    filters.push(
      or(
        ilike(expenses.description, pattern),
        ilike(expenses.invoiceNumber, pattern),
        ilike(contacts.legalName, pattern),
      )!,
    )
  }
  const where = and(...filters)
  const db = getDb()

  const [rows, [totals]] = await Promise.all([
    db
      .select(expenseWithSupplier)
      .from(expenses)
      .leftJoin(contacts, eq(expenses.supplierId, contacts.id))
      .where(where)
      .orderBy(desc(expenses.issueDate), desc(expenses.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({
        count: sql<number>`count(*)::int`,
        baseCents: sql<number>`coalesce(sum(${expenses.baseCents}), 0)::bigint`.mapWith(Number),
        vatCents: sql<number>`coalesce(sum(${expenses.vatCents}), 0)::bigint`.mapWith(Number),
        deductibleVatCents:
          sql<number>`coalesce(sum(${expenses.vatCents}) filter (where ${expenses.vatDeductible}), 0)::bigint`.mapWith(Number),
        totalCents: sql<number>`coalesce(sum(${expenses.totalCents}), 0)::bigint`.mapWith(Number),
      })
      .from(expenses)
      .leftJoin(contacts, eq(expenses.supplierId, contacts.id))
      .where(where),
  ])

  const { count, ...sums } = totals!
  return { items: rows.map(present), total: count, page: query.page, pageSize: query.pageSize, sums }
}

export async function getExpense(id: string): Promise<ExpenseView> {
  const [row] = await getDb()
    .select(expenseWithSupplier)
    .from(expenses)
    .leftJoin(contacts, eq(expenses.supplierId, contacts.id))
    .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)))
    .limit(1)
  if (!row) throw notFound()
  return present(row)
}

export async function createExpense(input: ExpenseInput, actor: Actor): Promise<ExpenseView> {
  await assertSupplier(input.supplierId)
  const id = await getDb().transaction(async (tx) => {
    const [expense] = await tx.insert(expenses).values(withAmounts(input)).returning({ id: expenses.id })
    await recordAudit(
      { action: 'expense.create', outcome: 'success', userId: actor.userId, context: actor.context, metadata: { expenseId: expense!.id } },
      tx,
    )
    return expense!.id
  })
  return getExpense(id)
}

export async function updateExpense(id: string, input: ExpenseInput, actor: Actor): Promise<ExpenseView> {
  const before = await getExpense(id)
  await assertSupplier(input.supplierId, before.supplierId)
  const values = withAmounts(input)
  const changed = (Object.keys(values) as Array<keyof typeof values>).filter(
    (key) => before[key] !== values[key],
  )

  await getDb().transaction(async (tx) => {
    await tx.update(expenses).set(values).where(eq(expenses.id, id))
    await recordAudit(
      { action: 'expense.update', outcome: 'success', userId: actor.userId, context: actor.context, metadata: { expenseId: id, changed } },
      tx,
    )
  })
  return getExpense(id)
}

/** Baja lógica: el gasto desaparece de listados y totales, pero queda en la BD. */
export async function deleteExpense(id: string, actor: Actor): Promise<void> {
  await getExpense(id)
  await getDb().transaction(async (tx) => {
    await tx.update(expenses).set({ deletedAt: new Date() }).where(eq(expenses.id, id))
    await recordAudit(
      { action: 'expense.delete', outcome: 'success', userId: actor.userId, context: actor.context, metadata: { expenseId: id } },
      tx,
    )
  })
}
