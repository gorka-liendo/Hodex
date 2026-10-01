import express, { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env, isInboundConfigured } from '../../config/env.js'
import { AppError } from '../../lib/AppError.js'
import { getRequestContext } from '../../lib/requestContext.js'
import { verifySvixSignature } from '../../lib/webhookSignature.js'
import { processInbound, registerInbound, webhookEventSchema } from './inbound.service.js'

const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

/**
 * Webhook de Resend (correo recibido), montado en /api/inbound. Público, pero
 * solo acepta peticiones firmadas con el secreto del webhook. Si la recepción
 * no está configurada, no existe (404).
 */
const router = Router()

router.post(
  '/resend',
  webhookRateLimiter,
  express.raw({ type: () => true, limit: '256kb' }),
  async (req, res) => {
    if (!isInboundConfigured) throw new AppError(404, 'No encontrado.', { code: 'NotFound' })

    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    const valid = verifySvixSignature(
      env.RESEND_WEBHOOK_SECRET!,
      { id: req.get('svix-id'), timestamp: req.get('svix-timestamp'), signature: req.get('svix-signature') },
      raw,
    )
    if (!valid) throw new AppError(401, 'Firma no válida.', { code: 'InvalidSignature' })

    const event = webhookEventSchema.parse(JSON.parse(raw.toString('utf8')))
    // Otros eventos (entregas, rebotes…) no interesan aquí: se confirman y ya.
    if (event.type !== 'email.received' || !event.data) {
      res.status(204).end()
      return
    }

    const receivedAt = event.data.created_at ? new Date(event.data.created_at) : new Date()
    const id = await registerInbound(
      {
        emailId: event.data.email_id,
        from: event.data.from,
        subject: event.data.subject ?? null,
        receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
      },
      getRequestContext(req, res),
    )
    // Se responde ya (Resend espera pocos segundos) y se procesa después.
    res.status(204).end()
    if (id) void processInbound(id)
  },
)

export default router
