import { and, asc, desc, eq, gte, ilike, isNotNull, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm'
import { getDb, type DbExecutor } from '../../db/client.js'
import { contacts, invoiceLines, invoices } from '../../db/schema/index.js'
import { AppError } from '../../lib/AppError.js'
import { computeInvoiceTotals } from '../../lib/invoiceMath.js'
import { todayInSpain } from '../../lib/periods.js'
import { likePattern } from '../../lib/validation.js'
import { recordAudit } from '../../services/audit.js'
import type { Actor } from '../contacts/contacts.service.js'
import type { InvoiceDraftInput, InvoiceListQuery } from './invoices.schema.js'

export type Invoice = typeof invoices.$inferSelect
export type InvoiceLine = typeof invoiceLines.$inferSelect

export const invoiceNotFound = () => new AppError(404, 'Factura no encontrada.', { code: 'NotFound' })

const alreadyIssued = () =>
  new AppError(409, 'La factura ya está emitida y no se puede modificar. Crea una rectificativa.', {
    code: 'InvoiceIssued',
  })

const fieldError = (field: string, message: string) =>
  new AppError(400, message, { code: 'ValidationError', details: [{ path: [field], message }] })

/** Cliente válido para un borrador: existe, es cliente y no está archivado. */
async function assertClient(clientId: string): Promise<void> {
  const [client] = await getDb().select().from(contacts).where(eq(contacts.id, clientId)).limit(1)
  if (!client || !client.isClient) throw fieldError('clientId', 'Elige un cliente válido')
  if (client.archivedAt) throw fieldError('clientId', 'Ese cliente está archivado')
}

/** Filas de líneas + totales calculados en el servidor. */
function prepare(input: InvoiceDraftInput) {
  const totals = computeInvoiceTotals(input.lines, input.irpfRateBp)
  const lines = input.lines.map((line, position) => ({
    ...line,
    position,
    baseCents: totals.lineBases[position]!,
  }))
  const { lines: _lines, ...header } = input
  return {
    header: {
      ...header,
      baseCents: totals.baseCents,
      vatCents: totals.vatCents,
      irpfCents: totals.irpfCents,
      totalCents: totals.totalCents,
    },
    lines,
  }
}

// ─── Consulta ────────────────────────────────────────────────────────────────

/** Nombre del cliente: el congelado al emitir o, en borradores, el actual. */
const clientName = sql<string>`coalesce(${invoices.clientSnapshot}->>'legalName', ${contacts.legalName})`

export async function listInvoices(query: InvoiceListQuery) {
  const today = todayInSpain()
  const filters: SQL[] = []
  if (query.status !== 'all') filters.push(eq(invoices.status, query.status))
  if (query.clientId) filters.push(eq(invoices.clientId, query.clientId))
  if (query.from) filters.push(gte(invoices.issueDate, query.from))
  if (query.to) filters.push(lte(invoices.issueDate, query.to))
  if (query.payment === 'paid') filters.push(isNotNull(invoices.paidOn))
  if (query.payment === 'unpaid') filters.push(eq(invoices.status, 'issued'), isNull(invoices.paidOn))
  if (query.payment === 'overdue') {
    filters.push(eq(invoices.status, 'issued'), isNull(invoices.paidOn), lt(invoices.dueDate, today))
  }
  if (query.q) {
    const pattern = likePattern(query.q)
    filters.push(or(ilike(invoices.fullNumber, pattern), ilike(clientName, pattern), ilike(invoices.notes, pattern))!)
  }
  const where = filters.length > 0 ? and(...filters) : undefined
  const db = getDb()
  const issued = sql`${invoices.status} = 'issued'`

  const [items, [totals]] = await Promise.all([
    db
      .select({
        id: invoices.id,
        status: invoices.status,
        kind: invoices.kind,
        fullNumber: invoices.fullNumber,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        paidOn: invoices.paidOn,
        baseCents: invoices.baseCents,
        totalCents: invoices.totalCents,
        clientId: invoices.clientId,
        clientName,
      })
      .from(invoices)
      .innerJoin(contacts, eq(invoices.clientId, contacts.id))
      .where(where)
      // Borradores primero; después, las emitidas de la más reciente a la más antigua.
      .orderBy(asc(invoices.status), desc(invoices.issueDate), desc(invoices.number), desc(invoices.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({
        count: sql<number>`count(*)::int`,
        // Solo las emitidas cuentan: un borrador no tiene efectos fiscales.
        baseCents: sql<number>`coalesce(sum(${invoices.baseCents}) filter (where ${issued}), 0)::bigint`.mapWith(Number),
        vatCents: sql<number>`coalesce(sum(${invoices.vatCents}) filter (where ${issued}), 0)::bigint`.mapWith(Number),
        totalCents: sql<number>`coalesce(sum(${invoices.totalCents}) filter (where ${issued}), 0)::bigint`.mapWith(Number),
        outstandingCents:
          sql<number>`coalesce(sum(${invoices.totalCents}) filter (where ${issued} and ${invoices.paidOn} is null), 0)::bigint`.mapWith(Number),
      })
      .from(invoices)
      .innerJoin(contacts, eq(invoices.clientId, contacts.id))
      .where(where),
  ])

  const { count, ...sums } = totals!
  return { items, total: count, page: query.page, pageSize: query.pageSize, sums }
}

export async function findInvoice(id: string, db: DbExecutor = getDb()): Promise<Invoice> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
  if (!invoice) throw invoiceNotFound()
  return invoice
}

export async function findLines(invoiceId: string, db: DbExecutor = getDb()): Promise<InvoiceLine[]> {
  return db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId)).orderBy(asc(invoiceLines.position))
}

/** Factura completa para el panel: líneas, desglose de IVA, cliente y relaciones. */
export async function getInvoice(id: string) {
  const invoice = await findInvoice(id)
  const db = getDb()
  const [lines, [client], rectifies, rectifiedBy] = await Promise.all([
    findLines(id),
    db
      .select({ id: contacts.id, legalName: contacts.legalName, taxId: contacts.taxId, email: contacts.email, phone: contacts.phone })
      .from(contacts)
      .where(eq(contacts.id, invoice.clientId)),
    invoice.rectifiesInvoiceId
      ? db.select({ id: invoices.id, fullNumber: invoices.fullNumber }).from(invoices).where(eq(invoices.id, invoice.rectifiesInvoiceId))
      : Promise.resolve([]),
    db
      .select({ id: invoices.id, fullNumber: invoices.fullNumber, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.rectifiesInvoiceId, id)),
  ])
  const { vatBreakdown } = computeInvoiceTotals(lines, invoice.irpfRateBp)
  return { ...invoice, lines, vatBreakdown, client: client!, rectifies: rectifies[0] ?? null, rectifiedBy }
}

// ─── Borradores ──────────────────────────────────────────────────────────────

export async function createDraft(input: InvoiceDraftInput, actor: Actor) {
  await assertClient(input.clientId)
  const { header, lines } = prepare(input)
  const id = await getDb().transaction(async (tx) => {
    const [invoice] = await tx.insert(invoices).values(header).returning({ id: invoices.id })
    if (lines.length > 0) {
      await tx.insert(invoiceLines).values(lines.map((line) => ({ ...line, invoiceId: invoice!.id })))
    }
    await recordAudit(
      { action: 'invoice.draft.create', outcome: 'success', userId: actor.userId, context: actor.context, metadata: { invoiceId: invoice!.id } },
      tx,
    )
    return invoice!.id
  })
  return getInvoice(id)
}

export async function updateDraft(id: string, input: InvoiceDraftInput, actor: Actor) {
  const current = await findInvoice(id)
  if (current.status !== 'draft') throw alreadyIssued()
  // En una rectificativa el cliente es el de la factura original.
  if (current.kind === 'rectifying' && input.clientId !== current.clientId) {
    throw fieldError('clientId', 'Una rectificativa debe ir al mismo cliente que la factura original')
  }
  await assertClient(input.clientId)
  const { header, lines } = prepare(input)

  await getDb().transaction(async (tx) => {
    await tx.update(invoices).set(header).where(and(eq(invoices.id, id), eq(invoices.status, 'draft')))
    await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id))
    if (lines.length > 0) await tx.insert(invoiceLines).values(lines.map((line) => ({ ...line, invoiceId: id })))
    await recordAudit(
      { action: 'invoice.draft.update', outcome: 'success', userId: actor.userId, context: actor.context, metadata: { invoiceId: id } },
      tx,
    )
  })
  return getInvoice(id)
}

/** Un borrador no tiene número ni efectos: se puede borrar de verdad. */
export async function deleteDraft(id: string, actor: Actor): Promise<void> {
  const current = await findInvoice(id)
  if (current.status !== 'draft') throw alreadyIssued()
  await getDb().transaction(async (tx) => {
    await tx.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.status, 'draft')))
    await recordAudit(
      { action: 'invoice.draft.delete', outcome: 'success', userId: actor.userId, context: actor.context, metadata: { invoiceId: id } },
      tx,
    )
  })
}

// ─── Cobros ──────────────────────────────────────────────────────────────────

export async function setPayment(id: string, paidOn: string | null, actor: Actor) {
  const current = await findInvoice(id)
  if (current.status !== 'issued') {
    throw new AppError(409, 'Solo se pueden cobrar facturas emitidas.', { code: 'InvoiceNotIssued' })
  }
  if (paidOn && paidOn < current.issueDate) {
    throw fieldError('paidOn', 'El cobro no puede ser anterior a la fecha de la factura')
  }
  await getDb().transaction(async (tx) => {
    await tx.update(invoices).set({ paidOn }).where(eq(invoices.id, id))
    await recordAudit(
      {
        action: paidOn ? 'invoice.payment.record' : 'invoice.payment.undo',
        outcome: 'success',
        userId: actor.userId,
        context: actor.context,
        metadata: { invoiceId: id, fullNumber: current.fullNumber, paidOn },
      },
      tx,
    )
  })
  return getInvoice(id)
}

// ─── Rectificativas ──────────────────────────────────────────────────────────

/**
 * Crea el BORRADOR de una rectificativa: mismo cliente, mismas líneas con la
 * cantidad en negativo (anulación total). Se puede editar para dejarla en una
 * rectificación parcial antes de emitirla.
 */
export async function createRectifyingDraft(originalId: string, reason: string, actor: Actor) {
  const original = await findInvoice(originalId)
  if (original.status !== 'issued') {
    throw new AppError(409, 'Solo se pueden rectificar facturas emitidas.', { code: 'InvoiceNotIssued' })
  }
  const originalLines = await findLines(originalId)
  const input: InvoiceDraftInput = {
    clientId: original.clientId,
    issueDate: todayInSpain(),
    dueDate: null,
    irpfRateBp: original.irpfRateBp,
    notes: null,
    internalNotes: null,
    lines: originalLines.map((line) => ({
      description: line.description,
      quantityMilli: -line.quantityMilli,
      unitPriceCents: line.unitPriceCents,
      vatRateBp: line.vatRateBp,
    })),
  }
  const { header, lines } = prepare(input)

  const id = await getDb().transaction(async (tx) => {
    const [invoice] = await tx
      .insert(invoices)
      .values({ ...header, kind: 'rectifying', rectifiesInvoiceId: originalId, rectificationReason: reason })
      .returning({ id: invoices.id })
    if (lines.length > 0) await tx.insert(invoiceLines).values(lines.map((line) => ({ ...line, invoiceId: invoice!.id })))
    await recordAudit(
      {
        action: 'invoice.rectifying.create',
        outcome: 'success',
        userId: actor.userId,
        context: actor.context,
        metadata: { invoiceId: invoice!.id, rectifies: original.fullNumber },
      },
      tx,
    )
    return invoice!.id
  })
  return getInvoice(id)
}
