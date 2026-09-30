import type { PartySnapshot } from '../../../db/schema/index.js'
import { recordAudit } from '../../../services/audit.js'
import type { Actor } from '../../contacts/contacts.service.js'
import { getCompanySettings, issuerSnapshot } from '../../settings/settings.service.js'
import { getInvoice } from '../invoices.service.js'
import { renderInvoicePdf, type InvoicePdfData } from './invoicePdf.js'

/**
 * Datos del PDF. Una factura emitida usa EXCLUSIVAMENTE lo congelado al emitir
 * (emisor, cliente, pie legal): el PDF de hoy es idéntico al de la emisión.
 * Un borrador se previsualiza con los datos actuales y marca de agua.
 */
async function pdfData(invoiceId: string): Promise<InvoicePdfData> {
  const invoice = await getInvoice(invoiceId)
  const issued = invoice.status === 'issued'

  let issuer: PartySnapshot
  let client: PartySnapshot
  if (issued) {
    issuer = invoice.issuerSnapshot!
    client = invoice.clientSnapshot!
  } else {
    const settings = await getCompanySettings()
    issuer = { ...issuerSnapshot(settings), legalName: settings.legalName ?? 'Datos de la empresa sin completar' }
    client = { ...invoice.client }
  }

  return {
    fullNumber: invoice.fullNumber,
    kind: invoice.kind,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    issuer,
    client,
    lines: invoice.lines,
    vatBreakdown: invoice.vatBreakdown,
    baseCents: invoice.baseCents,
    irpfRateBp: invoice.irpfRateBp,
    irpfCents: invoice.irpfCents,
    totalCents: invoice.totalCents,
    notes: invoice.notes,
    rectifies: invoice.rectifies ? { fullNumber: invoice.rectifies.fullNumber, reason: invoice.rectificationReason } : null,
    hash: invoice.hash,
    issuedAt: invoice.issuedAt,
  }
}

/** Nombre de archivo seguro: "F-2026-0001.pdf" o "borrador-1a2b3c4d.pdf". */
export function pdfFilename(data: Pick<InvoicePdfData, 'fullNumber'>, invoiceId: string): string {
  return data.fullNumber && /^[FR]-\d{4}-\d{4,}$/.test(data.fullNumber)
    ? `${data.fullNumber}.pdf`
    : `borrador-${invoiceId.slice(0, 8)}.pdf`
}

export async function generateInvoicePdf(invoiceId: string, actor: Actor) {
  const data = await pdfData(invoiceId)
  const pdf = await renderInvoicePdf(data)
  // Descargar una factura es exportar datos de un cliente: queda registrado.
  await recordAudit({
    action: 'invoice.pdf.download',
    outcome: 'success',
    userId: actor.userId,
    context: actor.context,
    metadata: { invoiceId, fullNumber: data.fullNumber },
  })
  return { pdf, filename: pdfFilename(data, invoiceId) }
}
