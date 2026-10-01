import { createHash } from 'node:crypto'
import { and, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { isAiConfigured } from '../../config/env.js'
import { getDb, type DbExecutor } from '../../db/client.js'
import { attachments, contacts } from '../../db/schema/index.js'
import { AppError } from '../../lib/AppError.js'
import { logger } from '../../lib/logger.js'
import { todayInSpain } from '../../lib/periods.js'
import { normalizeTaxId } from '../../lib/taxId.js'
import { recordAudit } from '../../services/audit.js'
import type { RequestContext } from '../../lib/requestContext.js'
import type { Actor } from '../contacts/contacts.service.js'
import { getCompanySettings } from '../settings/settings.service.js'
import { rawExtractionSchema, readDocumentWithClaude } from './claudeReader.js'
import { detectFileType, MAX_ATTACHMENT_BYTES, safeFilename, type AttachmentType } from './fileType.js'
import { toSuggestion } from './suggestion.js'

/** Los adjuntos sin gasto (subidos y abandonados) se borran pasado un día. */
const ORPHAN_TTL_MS = 24 * 60 * 60_000

const notFound = () => new AppError(404, 'Archivo no encontrado.', { code: 'NotFound' })

/** Metadatos (nunca el contenido) para listados y respuestas. */
const metadata = {
  id: attachments.id,
  expenseId: attachments.expenseId,
  inboundEmailId: attachments.inboundEmailId,
  filename: attachments.filename,
  contentType: attachments.contentType,
  sizeBytes: attachments.sizeBytes,
  createdAt: attachments.createdAt,
}

export type AttachmentMeta = { [K in keyof typeof metadata]: (typeof attachments.$inferSelect)[K] }

/** Quién actúa: el usuario del panel, o el sistema (userId null) al procesar un correo. */
export interface ActingParty {
  userId: string | null
  context?: RequestContext
}

/**
 * Valida y guarda un archivo. Lo usan la subida del panel y la recepción por
 * email: las mismas reglas (tamaño, tipo real, nombre seguro) para ambas.
 */
export async function storeAttachment(
  data: Buffer,
  rawFilename: string | undefined,
  actor: ActingParty,
  options: { inboundEmailId?: string } = {},
): Promise<AttachmentMeta> {
  if (data.length === 0) throw new AppError(400, 'El archivo está vacío.', { code: 'EmptyFile' })
  if (data.length > MAX_ATTACHMENT_BYTES) {
    throw new AppError(413, 'El archivo supera los 10 MB.', { code: 'FileTooLarge' })
  }
  const type = detectFileType(data)
  if (!type) {
    throw new AppError(415, 'Formato no admitido. Sube un PDF o una foto (JPG, PNG o WebP).', { code: 'UnsupportedFile' })
  }

  const db = getDb()
  // Limpieza oportunista de subidas abandonadas (lo recibido por email espera a ser revisado).
  await db
    .delete(attachments)
    .where(
      and(
        isNull(attachments.expenseId),
        isNull(attachments.inboundEmailId),
        lt(attachments.createdAt, new Date(Date.now() - ORPHAN_TTL_MS)),
      ),
    )

  const [row] = await db
    .insert(attachments)
    .values({
      filename: safeFilename(rawFilename, type),
      contentType: type,
      sizeBytes: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
      data,
      uploadedBy: actor.userId,
      inboundEmailId: options.inboundEmailId ?? null,
    })
    .returning(metadata)
  await recordAudit({
    action: 'attachment.upload',
    outcome: 'success',
    userId: actor.userId,
    context: actor.context,
    metadata: { attachmentId: row!.id, contentType: type, sizeBytes: data.length, ...(options.inboundEmailId ? { inboundEmailId: options.inboundEmailId } : {}) },
  })
  return row!
}

export function uploadAttachment(data: Buffer, rawFilename: string | undefined, actor: Actor): Promise<AttachmentMeta> {
  return storeAttachment(data, rawFilename, actor)
}

/** Metadatos de un adjunto (para abrir uno recibido por email en el formulario). */
export async function getAttachmentMeta(id: string): Promise<AttachmentMeta> {
  const [row] = await getDb().select(metadata).from(attachments).where(eq(attachments.id, id)).limit(1)
  if (!row) throw notFound()
  return row
}

export async function getAttachmentFile(id: string) {
  const [row] = await getDb()
    .select({ data: attachments.data, contentType: attachments.contentType, filename: attachments.filename })
    .from(attachments)
    .where(eq(attachments.id, id))
    .limit(1)
  if (!row) throw notFound()
  return row
}

export function listExpenseAttachments(expenseId: string, db: DbExecutor = getDb()): Promise<AttachmentMeta[]> {
  return db.select(metadata).from(attachments).where(eq(attachments.expenseId, expenseId)).orderBy(attachments.createdAt)
}

/**
 * Vincula adjuntos a un gasto (dentro de su transacción). Solo valen los que
 * están sueltos o ya son de ese gasto: nadie puede "robar" el ticket de otro.
 */
export async function linkAttachments(db: DbExecutor, expenseId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const linked = await db
    .update(attachments)
    .set({ expenseId })
    .where(
      and(
        inArray(attachments.id, ids),
        or(isNull(attachments.expenseId), eq(attachments.expenseId, expenseId)),
      ),
    )
    .returning({ id: attachments.id })
  if (linked.length !== new Set(ids).size) {
    throw new AppError(400, 'Algún archivo adjunto ya no está disponible. Vuelve a subirlo.', {
      code: 'ValidationError',
      details: [{ path: ['attachmentIds'], message: 'Archivo no disponible' }],
    })
  }
}

/**
 * Borra un adjunto. Si ya forma parte de un gasto (es un justificante), exige
 * haber confirmado el 2FA hace poco, como borrar el propio gasto.
 */
export async function deleteAttachment(id: string, actor: Actor, recentlyReauthenticated: boolean): Promise<void> {
  const db = getDb()
  const [row] = await db.select(metadata).from(attachments).where(eq(attachments.id, id)).limit(1)
  if (!row) throw notFound()
  if (row.expenseId && !recentlyReauthenticated) {
    throw new AppError(403, 'Confirma tu código de verificación para continuar.', { code: 'ReauthRequired' })
  }
  await db.transaction(async (tx) => {
    await tx.delete(attachments).where(eq(attachments.id, id))
    await recordAudit(
      {
        action: 'attachment.delete',
        outcome: 'success',
        userId: actor.userId,
        context: actor.context,
        metadata: { attachmentId: id, expenseId: row.expenseId, filename: row.filename },
      },
      tx,
    )
  })
}

// ─── Lectura con IA ──────────────────────────────────────────────────────────

/** Proveedor ya registrado con ese NIF (comparando sin espacios, guiones ni prefijo ES). */
async function findSupplierByTaxId(taxId: string | null) {
  if (!taxId) return null
  const bare = normalizeTaxId(taxId).replace(/^ES(?=[0-9A-Z]{9}$)/, '')
  const normalized = sql`regexp_replace(upper(regexp_replace(${contacts.taxId}, '[\\s.-]', '', 'g')), '^ES(?=[0-9A-Z]{9}$)', '')`
  const [row] = await getDb()
    .select({ id: contacts.id, legalName: contacts.legalName, isSupplier: contacts.isSupplier })
    .from(contacts)
    .where(and(sql`${normalized} = ${bare}`, isNull(contacts.archivedAt)))
    .limit(1)
  return row ?? null
}

/**
 * Lee un adjunto con Claude y devuelve una propuesta para el formulario. La
 * lectura se guarda: repetirla sobre el mismo archivo no vuelve a costar.
 */
export async function extractAttachment(id: string, actor: ActingParty, options: { force?: boolean } = {}) {
  if (!isAiConfigured) {
    throw new AppError(503, 'La lectura con IA no está configurada.', { code: 'AiNotConfigured' })
  }
  const db = getDb()
  const [row] = await db
    .select({ data: attachments.data, contentType: attachments.contentType, extraction: attachments.extraction })
    .from(attachments)
    .where(eq(attachments.id, id))
    .limit(1)
  if (!row) throw notFound()

  let raw = !options.force && row.extraction ? rawExtractionSchema.safeParse(row.extraction).data : undefined
  if (!raw) {
    const company = await getCompanySettings()
    const result = await readDocumentWithClaude(row.data, row.contentType as AttachmentType, {
      name: company.legalName ?? null,
      taxId: company.taxId ?? null,
    }).catch((err: unknown) => {
      logger.error({ err, attachmentId: id }, 'Fallo al leer el documento con Claude')
      throw new AppError(502, 'No se pudo leer el documento. Inténtalo de nuevo o rellénalo a mano.', {
        code: 'AiFailed',
      })
    })
    raw = result.extraction
    await db.update(attachments).set({ extraction: raw, extractedAt: new Date() }).where(eq(attachments.id, id))
    await recordAudit({
      action: 'attachment.extract',
      outcome: 'success',
      userId: actor.userId,
      context: actor.context,
      metadata: {
        attachmentId: id,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    })
  }

  const suggestion = toSuggestion(raw, todayInSpain())
  const match = await findSupplierByTaxId(suggestion.supplier?.taxId ?? null)
  return {
    ...suggestion,
    // Proveedor ya registrado: se puede asignar directamente.
    supplierId: match?.isSupplier ? match.id : null,
    supplierMatch: match ? { id: match.id, legalName: match.legalName, isSupplier: match.isSupplier } : null,
  }
}
