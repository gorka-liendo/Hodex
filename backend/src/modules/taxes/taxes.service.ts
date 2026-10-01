import { and, asc, between, eq, inArray, isNull, sql } from 'drizzle-orm'
import { zipSync } from 'fflate'
import { getDb } from '../../db/client.js'
import { attachments, contacts, expenses, invoiceLines, invoices } from '../../db/schema/index.js'
import { applyRate } from '../../lib/money.js'
import { recordAudit } from '../../services/audit.js'
import type { Actor } from '../contacts/contacts.service.js'
import { buildInvoicePdf } from '../invoices/pdf/invoicePdf.service.js'
import { expensesCsv, incomeCsv, summaryText } from './taxExports.js'
import {
  compute130,
  compute303,
  filingDeadline,
  quarterRange,
  taxWarnings,
  type ExpenseForTax,
  type InvoiceForTax,
  type Quarter,
} from './taxCalc.js'

/** Facturas emitidas entre dos fechas, con su desglose de IVA por tipo. */
async function loadInvoices(from: string, to: string) {
  const db = getDb()
  const rows = await db
    .select({
      id: invoices.id,
      kind: invoices.kind,
      fullNumber: invoices.fullNumber,
      issueDate: invoices.issueDate,
      clientSnapshot: invoices.clientSnapshot,
      irpfRateBp: invoices.irpfRateBp,
      irpfCents: invoices.irpfCents,
      baseCents: invoices.baseCents,
      vatCents: invoices.vatCents,
      totalCents: invoices.totalCents,
      paidOn: invoices.paidOn,
    })
    .from(invoices)
    .where(and(eq(invoices.status, 'issued'), between(invoices.issueDate, from, to)))
    .orderBy(asc(invoices.issueDate), asc(invoices.fullNumber))

  const groups = rows.length
    ? await db
        .select({
          invoiceId: invoiceLines.invoiceId,
          rateBp: invoiceLines.vatRateBp,
          baseCents: sql<number>`sum(${invoiceLines.baseCents})::bigint`.mapWith(Number),
        })
        .from(invoiceLines)
        .where(inArray(invoiceLines.invoiceId, rows.map((r) => r.id)))
        .groupBy(invoiceLines.invoiceId, invoiceLines.vatRateBp)
    : []

  return rows.map((row) => ({
    ...row,
    fullNumber: row.fullNumber ?? '',
    clientCountry: row.clientSnapshot?.country ?? 'ES',
    vatGroups: groups
      .filter((g) => g.invoiceId === row.id)
      .sort((a, b) => b.rateBp - a.rateBp)
      .map((g) => ({ rateBp: g.rateBp, baseCents: g.baseCents, vatCents: applyRate(g.baseCents, g.rateBp) })),
  }))
}

export type TaxInvoice = Awaited<ReturnType<typeof loadInvoices>>[number]

/** Gastos (no eliminados) entre dos fechas, con su proveedor y nº de adjuntos. */
async function loadExpenses(from: string, to: string) {
  const rows = await getDb()
    .select({
      id: expenses.id,
      issueDate: expenses.issueDate,
      invoiceNumber: expenses.invoiceNumber,
      description: expenses.description,
      category: expenses.category,
      baseCents: expenses.baseCents,
      vatRateBp: expenses.vatRateBp,
      vatCents: expenses.vatCents,
      irpfRateBp: expenses.irpfRateBp,
      irpfCents: expenses.irpfCents,
      totalCents: expenses.totalCents,
      vatDeductible: expenses.vatDeductible,
      paidOn: expenses.paidOn,
      supplierName: contacts.legalName,
      supplierTaxId: contacts.taxId,
      supplierCountry: contacts.country,
      attachmentCount: sql<number>`(select count(*)::int from ${attachments} where ${attachments.expenseId} = ${expenses.id})`,
    })
    .from(expenses)
    .leftJoin(contacts, eq(expenses.supplierId, contacts.id))
    .where(and(isNull(expenses.deletedAt), between(expenses.issueDate, from, to)))
    .orderBy(asc(expenses.issueDate), asc(expenses.createdAt))
  return rows.map((row) => ({ ...row, hasSupplier: row.supplierName !== null }))
}

export type TaxExpense = Awaited<ReturnType<typeof loadExpenses>>[number]

const toInvoiceForTax = (i: TaxInvoice): InvoiceForTax => i
const toExpenseForTax = (e: TaxExpense): ExpenseForTax => e

/** Resumen fiscal del trimestre: 303, 130, avisos y totales. */
export async function getQuarterTaxes(period: Quarter) {
  const range = quarterRange(period)
  const yearStart = `${period.year}-01-01`
  const [invoicesYtd, expensesYtd, [drafts]] = await Promise.all([
    loadInvoices(yearStart, range.to),
    loadExpenses(yearStart, range.to),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(eq(invoices.status, 'draft'), between(invoices.issueDate, range.from, range.to))),
  ])
  const quarterInvoices = invoicesYtd.filter((i) => i.issueDate >= range.from)
  const quarterExpenses = expensesYtd.filter((e) => e.issueDate >= range.from)

  return {
    period: { ...period, ...range },
    deadline: filingDeadline(period),
    counts: { invoices: quarterInvoices.length, expenses: quarterExpenses.length },
    model303: compute303(quarterInvoices.map(toInvoiceForTax), quarterExpenses.map(toExpenseForTax)),
    model130: compute130(period, invoicesYtd.map(toInvoiceForTax), expensesYtd.map(toExpenseForTax)),
    warnings: taxWarnings(quarterExpenses.map(toExpenseForTax), drafts?.count ?? 0),
  }
}

export type QuarterTaxes = Awaited<ReturnType<typeof getQuarterTaxes>>

const quarterLabel = (p: Quarter) => `${p.year}-${p.quarter}T`

/** Libro de ingresos o de gastos del trimestre (CSV para Excel). */
export async function quarterBook(period: Quarter, book: 'ingresos' | 'gastos', actor: Actor) {
  const range = quarterRange(period)
  const csv =
    book === 'ingresos'
      ? incomeCsv(await loadInvoices(range.from, range.to))
      : expensesCsv(await loadExpenses(range.from, range.to), await attachmentNames(range.from, range.to))
  await recordAudit({
    action: 'taxes.export.book',
    outcome: 'success',
    userId: actor.userId,
    context: actor.context,
    metadata: { book, ...period },
  })
  return { filename: `hodex-${quarterLabel(period)}-libro-${book}.csv`, content: Buffer.from(csv, 'utf8') }
}

async function attachmentNames(from: string, to: string): Promise<Map<string, string[]>> {
  const rows = await getDb()
    .select({ expenseId: attachments.expenseId, filename: attachments.filename })
    .from(attachments)
    .innerJoin(expenses, eq(attachments.expenseId, expenses.id))
    .where(and(isNull(expenses.deletedAt), between(expenses.issueDate, from, to)))
  const names = new Map<string, string[]>()
  for (const row of rows) names.set(row.expenseId!, [...(names.get(row.expenseId!) ?? []), row.filename])
  return names
}

/** Nombre de archivo seguro dentro del ZIP. */
const zipName = (value: string) =>
  value
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

/**
 * Paquete para la gestoría: resumen de impuestos, libros en CSV, PDF de cada
 * factura emitida y los justificantes de cada gasto del trimestre.
 */
export async function quarterPackage(period: Quarter, actor: Actor) {
  const range = quarterRange(period)
  const [taxes, invoiceRows, expenseRows, names] = await Promise.all([
    getQuarterTaxes(period),
    loadInvoices(range.from, range.to),
    loadExpenses(range.from, range.to),
    attachmentNames(range.from, range.to),
  ])

  const files: Record<string, Uint8Array> = {
    'resumen-impuestos.txt': Buffer.from(summaryText(taxes), 'utf8'),
    'libro-ingresos.csv': Buffer.from(incomeCsv(invoiceRows), 'utf8'),
    'libro-gastos.csv': Buffer.from(expensesCsv(expenseRows, names), 'utf8'),
  }

  // PDF de cada factura, uno a uno (pdfkit es síncrono en CPU: mejor no en paralelo).
  for (const invoice of invoiceRows) {
    const { pdf, filename } = await buildInvoicePdf(invoice.id)
    files[`facturas-emitidas/${zipName(filename)}`] = pdf
  }

  // Justificantes de los gastos, con la fecha delante para ordenarlos.
  const used = new Set<string>()
  if (expenseRows.length > 0) {
    const receipts = await getDb()
      .select({ expenseId: attachments.expenseId, filename: attachments.filename, data: attachments.data })
      .from(attachments)
      .where(inArray(attachments.expenseId, expenseRows.map((e) => e.id)))
      .orderBy(asc(attachments.createdAt))
    const byId = new Map(expenseRows.map((e) => [e.id, e]))
    for (const receipt of receipts) {
      const expense = byId.get(receipt.expenseId!)!
      let name = zipName(`${expense.issueDate} ${expense.description} - ${receipt.filename}`)
      for (let n = 2; used.has(name); n++) name = name.replace(/(\.\w+)$/, ` (${n})$1`)
      used.add(name)
      files[`gastos/${name}`] = receipt.data
    }
  }

  await recordAudit({
    action: 'taxes.export.package',
    outcome: 'success',
    userId: actor.userId,
    context: actor.context,
    metadata: { ...period, invoices: invoiceRows.length, expenses: expenseRows.length, receipts: used.size },
  })

  // Los PDF e imágenes ya van comprimidos: nivel bajo para no gastar CPU en balde.
  return { filename: `hodex-${quarterLabel(period)}.zip`, content: Buffer.from(zipSync(files, { level: 1 })) }
}
