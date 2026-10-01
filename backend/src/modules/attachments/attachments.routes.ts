import express, { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { getRequestContext } from '../../lib/requestContext.js'
import { parseIdParam } from '../../lib/validation.js'
import { aiExtractionRateLimiter, attachmentUploadRateLimiter } from '../../middleware/rateLimit.js'
import { AUTH_POLICY } from '../auth/auth.config.js'
import { getAuth } from '../auth/auth.middleware.js'
import type { Actor } from '../contacts/contacts.service.js'
import { deleteAttachment, extractAttachment, getAttachmentFile, uploadAttachment } from './attachments.service.js'
import { MAX_ATTACHMENT_BYTES } from './fileType.js'

const actorOf = (req: Request, res: Response): Actor => ({
  userId: getAuth(res).userId,
  context: getRequestContext(req, res),
})

const extractQuerySchema = z.object({ force: z.enum(['true', 'false']).optional() })

/** Adjuntos de gastos, montado en /api/admin/attachments (requiere sesión). */
const router = Router()

/**
 * POST / — sube un archivo como cuerpo binario (sin multipart). El nombre va en
 * la cabecera X-Filename (codificado con encodeURIComponent). El tipo se decide
 * por el contenido, no por Content-Type.
 */
router.post(
  '/',
  attachmentUploadRateLimiter,
  express.raw({ type: () => true, limit: MAX_ATTACHMENT_BYTES }),
  async (req, res) => {
    const data = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    res.status(201).json(await uploadAttachment(data, req.get('x-filename'), actorOf(req, res)))
  },
)

/** GET /:id/file — el archivo, para verlo en el navegador. */
router.get('/:id/file', async (req, res) => {
  const file = await getAttachmentFile(parseIdParam(req.params.id))
  res.setHeader('Content-Type', file.contentType)
  res.setHeader('Content-Length', file.data.length)
  // ASCII de respaldo + nombre UTF-8 (RFC 6266): tildes y ñ sin romper la cabecera.
  const ascii = file.filename.normalize('NFD').replace(/[^\x20-\x7e]/g, '')
  res.setHeader('Content-Disposition', `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`)
  res.setHeader('Cache-Control', 'private, no-store')
  res.end(file.data)
})

/** POST /:id/extract — lee el documento con Claude y propone los datos del gasto. */
router.post('/:id/extract', aiExtractionRateLimiter, async (req, res) => {
  const { force } = extractQuerySchema.parse(req.query)
  res.json(await extractAttachment(parseIdParam(req.params.id), actorOf(req, res), { force: force === 'true' }))
})

/** DELETE /:id — si ya justifica un gasto, exige 2FA reciente. */
router.delete('/:id', async (req, res) => {
  const recent = Date.now() - getAuth(res).reauthenticatedAt.getTime() <= AUTH_POLICY.reauthMaxAgeMs
  await deleteAttachment(parseIdParam(req.params.id), actorOf(req, res), recent)
  res.status(204).end()
})

export default router
