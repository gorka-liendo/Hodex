import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm'
import { getDb } from '../../../db/client.js'
import { invoices, invoiceSends, invoiceShareLinks } from '../../../db/schema/index.js'
import { env } from '../../../config/env.js'
import { AppError } from '../../../lib/AppError.js'
import { randomToken, sha256Hex } from '../../../lib/crypto.js'
import { formatDate, formatEuros } from '../../../lib/format.js'
import { escapeHtml } from '../../../lib/html.js'
import { logger } from '../../../lib/logger.js'
import type { RequestContext } from '../../../lib/requestContext.js'
import { recordAudit } from '../../../services/audit.js'
import { sendEmail } from '../../../services/email.js'
import type { Actor } from '../../contacts/contacts.service.js'
import { findInvoice, type Invoice } from '../invoices.service.js'
import { buildInvoicePdf } from '../pdf/invoicePdf.service.js'
import type { SendEmailInput } from './invoiceSharing.schema.js'

/** Vida de un enlace compartido. */
const LINK_TTL_DAYS = 7
const LINK_TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/

async function issuedInvoice(id: string): Promise<Invoice> {
  const invoice = await findInvoice(id)
  if (invoice.status !== 'issued') {
    throw new AppError(409, 'Solo se pueden enviar facturas emitidas.', { code: 'InvoiceNotIssued' })
  }
  return invoice
}

/** URL pública del enlace: pasa por la landing, que reenvía /api al backend. */
const linkUrl = (token: string) => `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/f/${token}`

// ─── Email ───────────────────────────────────────────────────────────────────

/** HTML sobrio con la identidad de Hodex. Todo el texto del usuario va escapado. */
function emailHtml(invoice: Invoice, message: string): string {
  const issuer = invoice.issuerSnapshot!
  const paragraphs = message
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replaceAll('\n', '<br>')}</p>`)
    .join('')
  return `<!doctype html><html lang="es"><body style="margin:0;padding:32px 16px;background:#fafafa;font-family:Helvetica,Arial,sans-serif;color:#111010">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid rgba(17,16,16,.14)"><tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:20px;font-weight:300">${escapeHtml(issuer.tradeName ?? issuer.legalName)}</p>
<div style="font-size:15px;line-height:1.6">${paragraphs}</div>
<table role="presentation" width="100%" style="margin-top:24px;border-top:1px solid #111010;font-size:14px">
<tr><td style="padding:12px 0;color:#6e6e6e">Factura</td><td align="right" style="padding:12px 0">${escapeHtml(invoice.fullNumber!)}</td></tr>
<tr><td style="padding:12px 0;color:#6e6e6e;border-top:1px solid rgba(17,16,16,.14)">Fecha</td><td align="right" style="padding:12px 0;border-top:1px solid rgba(17,16,16,.14)">${formatDate(invoice.issueDate)}</td></tr>
${invoice.dueDate ? `<tr><td style="padding:12px 0;color:#6e6e6e;border-top:1px solid rgba(17,16,16,.14)">Vencimiento</td><td align="right" style="padding:12px 0;border-top:1px solid rgba(17,16,16,.14)">${formatDate(invoice.dueDate)}</td></tr>` : ''}
<tr><td style="padding:14px 16px;background:#111010;color:#ffffff;font-size:11px;letter-spacing:.18em;text-transform:uppercase">Total</td><td align="right" style="padding:14px 16px;background:#111010;color:#ffffff;font-size:18px;font-weight:300">${formatEuros(invoice.totalCents)}</td></tr>
</table>
<p style="margin:24px 0 0;font-size:13px;color:#6e6e6e">Adjuntamos la factura en PDF.</p>
</td></tr></table></body></html>`
}

export async function sendInvoiceEmail(id: string, input: SendEmailInput, actor: Actor) {
  const invoice = await issuedInvoice(id)
  const { pdf, filename } = await buildInvoicePdf(id)
  const issuer = invoice.issuerSnapshot!

  const result = await sendEmail({
    from: env.INVOICE_FROM,
    to: input.to,
    cc: input.cc,
    replyTo: issuer.email ?? env.CONTACT_TO,
    subject: input.subject,
    text: `${input.message}\n\nFactura ${invoice.fullNumber} · ${formatEuros(invoice.totalCents)} (adjunta en PDF).`,
    html: emailHtml(invoice, input.message),
    attachments: [{ filename, content: pdf }],
  }).catch((err: unknown) => {
    // El detalle (respuesta del proveedor) va al log; al usuario, un mensaje claro.
    logger.error({ err, invoiceId: id }, 'Fallo al enviar la factura por email')
    throw new AppError(502, 'No se pudo enviar el email. Inténtalo de nuevo en unos minutos.', { code: 'EmailFailed' })
  })

  const [send] = await getDb().transaction(async (tx) => {
    const rows = await tx
      .insert(invoiceSends)
      .values({ invoiceId: id, channel: 'email', recipient: input.to, providerMessageId: result.id, sentBy: actor.userId })
      .returning()
    await recordAudit(
      {
        action: 'invoice.send.email',
        outcome: 'success',
        userId: actor.userId,
        context: actor.context,
        metadata: { invoiceId: id, fullNumber: invoice.fullNumber, to: input.to, ccCount: input.cc.length },
      },
      tx,
    )
    return rows
  })
  return send!
}

// ─── Enlaces compartidos (WhatsApp) ──────────────────────────────────────────

/**
 * Crea un enlace de descarga y registra el envío por WhatsApp. Devuelve el
 * enlace y el texto del mensaje; el panel abre WhatsApp con ellos.
 */
export async function createWhatsappShare(id: string, phone: string | null, actor: Actor) {
  const invoice = await issuedInvoice(id)
  const token = randomToken()
  const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60_000)

  await getDb().transaction(async (tx) => {
    await tx.insert(invoiceShareLinks).values({ id: sha256Hex(token), invoiceId: id, createdBy: actor.userId, expiresAt })
    await tx.insert(invoiceSends).values({ invoiceId: id, channel: 'whatsapp', recipient: phone, sentBy: actor.userId })
    await recordAudit(
      {
        action: 'invoice.send.whatsapp',
        outcome: 'success',
        userId: actor.userId,
        context: actor.context,
        metadata: { invoiceId: id, fullNumber: invoice.fullNumber, expiresAt: expiresAt.toISOString() },
      },
      tx,
    )
  })

  const issuer = invoice.issuerSnapshot!
  const url = linkUrl(token)
  const text =
    `Hola, te enviamos la factura ${invoice.fullNumber} de ${issuer.tradeName ?? issuer.legalName} ` +
    `por ${formatEuros(invoice.totalCents)}. Puedes descargarla aquí (enlace válido ${LINK_TTL_DAYS} días): ${url}`
  return { url, text, expiresAt }
}

/** Envíos y enlaces de una factura, para su ficha. */
export async function getSharing(id: string) {
  await findInvoice(id)
  const db = getDb()
  const [sends, links] = await Promise.all([
    db.select().from(invoiceSends).where(eq(invoiceSends.invoiceId, id)).orderBy(desc(invoiceSends.sentAt)),
    db
      .select({
        id: invoiceShareLinks.id,
        createdAt: invoiceShareLinks.createdAt,
        expiresAt: invoiceShareLinks.expiresAt,
        revokedAt: invoiceShareLinks.revokedAt,
        accessCount: invoiceShareLinks.accessCount,
        lastAccessedAt: invoiceShareLinks.lastAccessedAt,
      })
      .from(invoiceShareLinks)
      .where(eq(invoiceShareLinks.invoiceId, id))
      .orderBy(desc(invoiceShareLinks.createdAt)),
  ])
  return { sends, links }
}

export async function revokeShareLink(invoiceId: string, linkId: string, actor: Actor): Promise<void> {
  const revoked = await getDb()
    .update(invoiceShareLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(invoiceShareLinks.id, linkId), eq(invoiceShareLinks.invoiceId, invoiceId), isNull(invoiceShareLinks.revokedAt)))
    .returning({ id: invoiceShareLinks.id })
  if (revoked.length === 0) throw new AppError(404, 'Enlace no encontrado o ya revocado.', { code: 'NotFound' })
  await recordAudit({
    action: 'invoice.link.revoke',
    outcome: 'success',
    userId: actor.userId,
    context: actor.context,
    metadata: { invoiceId },
  })
}

/**
 * Abre un enlace público. Cualquier fallo (formato, inexistente, caducado,
 * revocado) da el mismo resultado: null, sin pistas sobre el motivo.
 */
export async function openShareLink(token: string, context: RequestContext) {
  if (!LINK_TOKEN_FORMAT.test(token)) return null
  const now = new Date()
  const [link] = await getDb()
    .update(invoiceShareLinks)
    .set({ accessCount: sql`${invoiceShareLinks.accessCount} + 1`, lastAccessedAt: now })
    .where(
      and(
        eq(invoiceShareLinks.id, sha256Hex(token)),
        isNull(invoiceShareLinks.revokedAt),
        gt(invoiceShareLinks.expiresAt, now),
      ),
    )
    .returning()
  if (!link) return null

  const [invoice] = await getDb().select({ status: invoices.status }).from(invoices).where(eq(invoices.id, link.invoiceId))
  if (invoice?.status !== 'issued') return null

  await recordAudit({
    action: 'invoice.link.open',
    outcome: 'success',
    context,
    metadata: { invoiceId: link.invoiceId, accessCount: link.accessCount },
  })
  return buildInvoicePdf(link.invoiceId)
}
