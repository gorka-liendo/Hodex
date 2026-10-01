import { and, desc, eq, gte, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { env, isAiConfigured, isInboundConfigured } from '../../config/env.js'
import { getDb } from '../../db/client.js'
import { adminUsers, attachments, companySettings, contacts, inboundEmails } from '../../db/schema/index.js'
import { AppError } from '../../lib/AppError.js'
import { logger } from '../../lib/logger.js'
import { todayInSpain } from '../../lib/periods.js'
import type { RequestContext } from '../../lib/requestContext.js'
import { recordAudit } from '../../services/audit.js'
import { extractAttachment, storeAttachment } from '../attachments/attachments.service.js'
import { rawExtractionSchema } from '../attachments/claudeReader.js'
import { ATTACHMENT_TYPES } from '../attachments/fileType.js'
import { toSuggestion } from '../attachments/suggestion.js'
import type { Actor } from '../contacts/contacts.service.js'
import { downloadInboundAttachment, listInboundAttachments } from './resendInbound.js'

/** Adjuntos útiles por correo: más que esto huele a error o a abuso. */
const MAX_ATTACHMENTS_PER_EMAIL = 5
/** Imágenes en línea más pequeñas que esto son logos o firmas, no tickets. */
const MIN_INLINE_IMAGE_BYTES = 30 * 1024

const notFound = () => new AppError(404, 'Correo no encontrado.', { code: 'NotFound' })

export const webhookEventSchema = z.object({
  type: z.string(),
  data: z
    .object({
      email_id: z.string().min(1).max(200),
      from: z.string().max(500),
      subject: z.string().max(1000).nullish(),
      created_at: z.string().max(50).nullish(),
    })
    .passthrough()
    .optional(),
})

/** "Nombre <correo@x.com>" → "correo@x.com" (en minúsculas). */
export function senderAddress(from: string): string {
  const match = /<([^<>\s]+@[^<>\s]+)>/.exec(from)
  return (match?.[1] ?? from).trim().toLowerCase()
}

/**
 * Remitentes autorizados: tu cuenta del panel, el email de la empresa y los
 * proveedores dados de alta (activos) con email. Lo demás se bloquea y espera
 * a que lo aceptes a mano.
 */
async function isAllowedSender(address: string): Promise<boolean> {
  const db = getDb()
  const [admin, company, supplier] = await Promise.all([
    db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, address)).limit(1),
    db.select({ id: companySettings.id }).from(companySettings).where(sql`lower(${companySettings.email}) = ${address}`).limit(1),
    db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.isSupplier, true), isNull(contacts.archivedAt), sql`lower(${contacts.email}) = ${address}`))
      .limit(1),
  ])
  return admin.length + company.length + supplier.length > 0
}

/**
 * Registra un correo recibido. Devuelve su id si hay que procesarlo, o null
 * si ya se había registrado (Resend reintenta webhooks) o está bloqueado.
 */
export async function registerInbound(
  event: { emailId: string; from: string; subject: string | null; receivedAt: Date },
  context: RequestContext,
): Promise<string | null> {
  const address = senderAddress(event.from)
  const allowed = await isAllowedSender(address)
  const [row] = await getDb()
    .insert(inboundEmails)
    .values({
      providerEmailId: event.emailId,
      fromAddress: address,
      subject: event.subject?.slice(0, 300) ?? null,
      receivedAt: event.receivedAt,
      status: allowed ? 'received' : 'blocked',
      note: allowed ? null : 'Remitente no autorizado',
    })
    .onConflictDoNothing({ target: inboundEmails.providerEmailId })
    .returning({ id: inboundEmails.id })
  if (!row) return null

  await recordAudit({
    action: 'inbound.received',
    outcome: allowed ? 'success' : 'failure',
    context,
    metadata: { inboundEmailId: row.id, from: address, ...(allowed ? {} : { reason: 'sender_not_allowed' }) },
  })
  return allowed ? row.id : null
}

const processing = new Set<string>()

/**
 * Descarga los adjuntos útiles (PDF e imágenes) y, si hay IA, los lee. Nunca
 * lanza: los errores quedan en el propio correo (estado `failed` + nota) y en
 * el log, y se puede reintentar desde el panel.
 */
export async function processInbound(id: string): Promise<void> {
  if (processing.has(id)) return
  processing.add(id)
  const db = getDb()
  try {
    const [email] = await db.select().from(inboundEmails).where(eq(inboundEmails.id, id)).limit(1)
    if (!email || email.status !== 'received') return

    const candidates = (await listInboundAttachments(email.providerEmailId)).filter((a) => {
      const type = a.contentType.toLowerCase().split(';')[0]!.trim()
      if (!(ATTACHMENT_TYPES as readonly string[]).includes(type)) return false
      // Logos y firmas en línea no son justificantes.
      return !(a.disposition === 'inline' && type.startsWith('image/') && (a.size ?? 0) < MIN_INLINE_IMAGE_BYTES)
    })

    let stored = 0
    const skipped: string[] = []
    for (const candidate of candidates.slice(0, MAX_ATTACHMENTS_PER_EMAIL)) {
      try {
        const data = await downloadInboundAttachment(candidate.downloadUrl)
        const attachment = await storeAttachment(data, candidate.filename ? encodeURIComponent(candidate.filename) : undefined, { userId: null }, { inboundEmailId: id })
        stored++
        if (isAiConfigured) {
          await extractAttachment(attachment.id, { userId: null }).catch((err: unknown) => {
            logger.warn({ err, attachmentId: attachment.id }, 'No se pudo leer con IA un adjunto recibido')
          })
        }
      } catch (err) {
        logger.warn({ err, inboundEmailId: id }, 'Adjunto recibido descartado')
        skipped.push(candidate.filename ?? 'adjunto')
      }
    }

    const notes = [
      candidates.length === 0 ? 'Sin adjuntos PDF ni imagen' : null,
      candidates.length > MAX_ATTACHMENTS_PER_EMAIL ? `Solo se guardan ${MAX_ATTACHMENTS_PER_EMAIL} adjuntos por correo` : null,
      skipped.length ? `No se pudo guardar: ${skipped.join(', ').slice(0, 200)}` : null,
    ].filter(Boolean)
    await db
      .update(inboundEmails)
      .set({ status: 'processed', attachmentCount: stored, note: notes.join('. ') || null })
      .where(eq(inboundEmails.id, id))
  } catch (err) {
    logger.error({ err, inboundEmailId: id }, 'Fallo al procesar un correo recibido')
    await db
      .update(inboundEmails)
      .set({ status: 'failed', note: 'No se pudieron descargar los adjuntos. Reinténtalo en unos minutos.' })
      .where(eq(inboundEmails.id, id))
      .catch(() => undefined)
  } finally {
    processing.delete(id)
  }
}

// ─── Panel ───────────────────────────────────────────────────────────────────

/** Bandeja: correos recientes con adjuntos por revisar, bloqueados o con fallos. */
export async function listInbox() {
  const db = getDb()
  const since = new Date(Date.now() - 90 * 24 * 60 * 60_000)
  const emails = await db
    .select()
    .from(inboundEmails)
    .where(and(ne(inboundEmails.status, 'dismissed'), gte(inboundEmails.receivedAt, since)))
    .orderBy(desc(inboundEmails.receivedAt))
    .limit(100)

  const pending = emails.length
    ? await db
        .select({
          id: attachments.id,
          inboundEmailId: attachments.inboundEmailId,
          filename: attachments.filename,
          contentType: attachments.contentType,
          sizeBytes: attachments.sizeBytes,
          extraction: attachments.extraction,
        })
        .from(attachments)
        .where(and(inArray(attachments.inboundEmailId, emails.map((e) => e.id)), isNull(attachments.expenseId)))
    : []

  const today = todayInSpain()
  const items = emails
    .map((email) => ({
      id: email.id,
      from: email.fromAddress,
      subject: email.subject,
      receivedAt: email.receivedAt,
      status: email.status,
      note: email.note,
      pending: pending
        .filter((a) => a.inboundEmailId === email.id)
        .map(({ extraction, inboundEmailId: _e, ...a }) => {
          const raw = rawExtractionSchema.safeParse(extraction)
          return { ...a, suggestion: raw.success ? toSuggestion(raw.data, today) : null }
        }),
    }))
    // Un correo ya revisado del todo (todo guardado como gasto) sale de la bandeja.
    .filter((item) => item.status !== 'processed' || item.pending.length > 0 || item.note)

  return {
    enabled: isInboundConfigured,
    address: env.INBOUND_ADDRESS ?? null,
    pendingCount: items.reduce((sum, i) => sum + i.pending.length, 0),
    items,
  }
}

/** Nº de justificantes recibidos por revisar (para el aviso en Gastos). */
export async function inboxPendingCount(): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(attachments)
    .innerJoin(inboundEmails, eq(attachments.inboundEmailId, inboundEmails.id))
    .where(and(isNotNull(attachments.inboundEmailId), isNull(attachments.expenseId), ne(inboundEmails.status, 'dismissed')))
  return row!.count
}

/** Aceptar un correo bloqueado o reintentar uno fallido: vuelve a la cola. */
export async function requeueInbound(id: string, actor: Actor): Promise<void> {
  const [email] = await getDb()
    .update(inboundEmails)
    .set({ status: 'received', note: null })
    .where(and(eq(inboundEmails.id, id), inArray(inboundEmails.status, ['blocked', 'failed'])))
    .returning({ id: inboundEmails.id, from: inboundEmails.fromAddress })
  if (!email) throw notFound()
  await recordAudit({
    action: 'inbound.accept',
    outcome: 'success',
    userId: actor.userId,
    context: actor.context,
    metadata: { inboundEmailId: id, from: email.from },
  })
  void processInbound(id)
}

/** Descartar: borra sus adjuntos pendientes y lo saca de la bandeja. */
export async function dismissInbound(id: string, actor: Actor): Promise<void> {
  const db = getDb()
  await db.transaction(async (tx) => {
    const [email] = await tx
      .update(inboundEmails)
      .set({ status: 'dismissed' })
      .where(and(eq(inboundEmails.id, id), ne(inboundEmails.status, 'dismissed')))
      .returning({ id: inboundEmails.id })
    if (!email) throw notFound()
    await tx.delete(attachments).where(and(eq(attachments.inboundEmailId, id), isNull(attachments.expenseId)))
    await recordAudit(
      { action: 'inbound.dismiss', outcome: 'success', userId: actor.userId, context: actor.context, metadata: { inboundEmailId: id } },
      tx,
    )
  })
}
