import { and, asc, eq, max, sql } from 'drizzle-orm'
import { getDb } from '../../db/client.js'
import { contacts, invoiceChain, invoiceCounters, invoices, type PartySnapshot } from '../../db/schema/index.js'
import { AppError } from '../../lib/AppError.js'
import { computeInvoiceHash } from '../../lib/invoiceHash.js'
import { computeInvoiceTotals } from '../../lib/invoiceMath.js'
import { addDays, todayInSpain } from '../../lib/periods.js'
import { recordAudit } from '../../services/audit.js'
import type { Actor } from '../contacts/contacts.service.js'
import { getCompanySettings, issuerSnapshot, missingIssuerFields } from '../settings/settings.service.js'
import { findLines, getInvoice, invoiceNotFound } from './invoices.service.js'

/** Requisitos que impiden emitir, explicados para el usuario. */
const cannotIssue = (problems: string[]) =>
  new AppError(422, 'Todavía no se puede emitir la factura.', {
    code: 'CannotIssue',
    details: problems.map((message) => ({ path: ['issue'], message })),
  })

const pad4 = (n: number) => String(n).padStart(4, '0')

/**
 * Emite un borrador. En UNA transacción:
 *  1. bloquea la cadena de huellas (serializa todas las emisiones);
 *  2. comprueba requisitos legales (datos del emisor y del cliente, líneas,
 *     importe, fecha no futura y no anterior a la última de la serie);
 *  3. asigna el siguiente número de la serie/año (sin huecos: si algo falla,
 *     el rollback devuelve el contador a su sitio);
 *  4. congela los datos de emisor y cliente, calcula la huella encadenada y
 *     marca la factura como emitida (desde aquí, inmutable por trigger).
 */
export async function issueInvoice(id: string, actor: Actor) {
  const today = todayInSpain()

  await getDb().transaction(async (tx) => {
    // (1) Serializa emisiones: nadie más emite hasta que esta termine.
    const [chain] = await tx.select().from(invoiceChain).where(eq(invoiceChain.id, 1)).for('update')
    const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, id)).for('update')
    if (!invoice) throw invoiceNotFound()
    if (invoice.status !== 'draft') {
      throw new AppError(409, 'La factura ya está emitida.', { code: 'InvoiceIssued' })
    }

    // (2) Requisitos.
    const problems: string[] = []
    const settings = await getCompanySettings(tx)
    const missing = missingIssuerFields(settings)
    if (missing.length > 0) problems.push(`Completa los datos de tu empresa en Ajustes: ${missing.join(', ')}.`)

    const [client] = await tx.select().from(contacts).where(eq(contacts.id, invoice.clientId))
    if (!client || client.archivedAt) problems.push('El cliente no existe o está archivado.')
    else {
      if (!client.taxId) problems.push('El cliente no tiene NIF/CIF: es obligatorio en una factura completa.')
      if (!client.addressLine || !client.city) problems.push('Falta la dirección fiscal del cliente.')
    }

    const lines = await findLines(id, tx)
    const totals = computeInvoiceTotals(lines, invoice.irpfRateBp)
    if (lines.length === 0) problems.push('La factura no tiene líneas.')
    else if (invoice.kind === 'standard' && totals.totalCents <= 0) {
      problems.push('El total de una factura ordinaria debe ser positivo (usa una rectificativa para abonos).')
    } else if (invoice.kind === 'rectifying' && totals.totalCents === 0) {
      problems.push('La rectificativa no cambia ningún importe.')
    }

    if (invoice.issueDate > today) problems.push('La fecha de emisión no puede ser futura.')
    const series = invoice.kind === 'rectifying' ? 'R' : 'F'
    const year = Number(invoice.issueDate.slice(0, 4))
    const [{ lastDate } = { lastDate: null }] = await tx
      .select({ lastDate: max(invoices.issueDate) })
      .from(invoices)
      .where(and(eq(invoices.status, 'issued'), eq(invoices.series, series), eq(invoices.year, year)))
    if (lastDate && invoice.issueDate < lastDate) {
      problems.push(`La fecha no puede ser anterior a la de la última factura de la serie (${lastDate}).`)
    }
    if (problems.length > 0) throw cannotIssue(problems)

    // (3) Siguiente número de la serie y año (atómico).
    const [counter] = await tx
      .insert(invoiceCounters)
      .values({ series, year, lastNumber: 1 })
      .onConflictDoUpdate({
        target: [invoiceCounters.series, invoiceCounters.year],
        set: { lastNumber: sql`${invoiceCounters.lastNumber} + 1` },
      })
      .returning({ number: invoiceCounters.lastNumber })
    const number = counter!.number
    const fullNumber = `${series}-${year}-${pad4(number)}`

    // (4) Datos congelados + huella encadenada.
    const issuer = issuerSnapshot(settings)
    const clientSnapshot: PartySnapshot = {
      legalName: client!.legalName,
      tradeName: client!.tradeName,
      taxId: client!.taxId,
      addressLine: client!.addressLine,
      postalCode: client!.postalCode,
      city: client!.city,
      province: client!.province,
      country: client!.country,
      email: client!.email,
    }
    const issuedAt = new Date()
    const previousHash = chain!.lastHash
    const hash = computeInvoiceHash({
      issuerTaxId: issuer.taxId!,
      fullNumber,
      issueDate: invoice.issueDate,
      kind: invoice.kind,
      vatCents: totals.vatCents,
      amountCents: totals.baseCents + totals.vatCents,
      previousHash,
      issuedAt,
    })

    await tx
      .update(invoices)
      .set({
        status: 'issued',
        series,
        year,
        number,
        fullNumber,
        dueDate: invoice.dueDate ?? addDays(invoice.issueDate, settings.paymentTermDays),
        baseCents: totals.baseCents,
        vatCents: totals.vatCents,
        irpfCents: totals.irpfCents,
        totalCents: totals.totalCents,
        issuerSnapshot: issuer,
        clientSnapshot,
        issuedAt,
        hash,
        previousHash,
      })
      .where(eq(invoices.id, id))
    await tx.update(invoiceChain).set({ lastHash: hash, lastInvoiceId: id }).where(eq(invoiceChain.id, 1))
    await recordAudit(
      {
        action: 'invoice.issue',
        outcome: 'success',
        userId: actor.userId,
        context: actor.context,
        metadata: { invoiceId: id, fullNumber, totalCents: totals.totalCents, hash },
      },
      tx,
    )
  })

  return getInvoice(id)
}

/**
 * Recorre todas las facturas emitidas en orden de emisión y recalcula cada
 * huella: detecta cualquier alteración o hueco en la cadena.
 */
export async function verifyInvoiceChain() {
  const issued = await getDb()
    .select()
    .from(invoices)
    .where(eq(invoices.status, 'issued'))
    .orderBy(asc(invoices.issuedAt), asc(invoices.id))

  let previousHash: string | null = null
  for (const invoice of issued) {
    const expected = computeInvoiceHash({
      issuerTaxId: invoice.issuerSnapshot!.taxId!,
      fullNumber: invoice.fullNumber!,
      issueDate: invoice.issueDate,
      kind: invoice.kind,
      vatCents: invoice.vatCents,
      amountCents: invoice.baseCents + invoice.vatCents,
      previousHash,
      issuedAt: invoice.issuedAt!,
    })
    if (invoice.previousHash !== previousHash || invoice.hash !== expected) {
      return { valid: false, checked: issued.length, brokenAt: invoice.fullNumber }
    }
    previousHash = invoice.hash
  }
  return { valid: true, checked: issued.length, brokenAt: null }
}
