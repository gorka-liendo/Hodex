import { Router, type Request, type Response } from 'express'
import { getRequestContext } from '../../lib/requestContext.js'
import { parseIdParam } from '../../lib/validation.js'
import { getAuth } from '../auth/auth.middleware.js'
import type { Actor } from '../contacts/contacts.service.js'
import { dismissInbound, inboxPendingCount, listInbox, requeueInbound } from './inbound.service.js'

const actorOf = (req: Request, res: Response): Actor => ({
  userId: getAuth(res).userId,
  context: getRequestContext(req, res),
})

/** Facturas recibidas por email, montado en /api/admin/inbox (requiere sesión). */
const router = Router()

router.get('/', async (_req, res) => {
  res.json(await listInbox())
})

router.get('/count', async (_req, res) => {
  res.json({ pendingCount: await inboxPendingCount() })
})

/** Aceptar un remitente bloqueado o reintentar un fallo. */
router.post('/:id/accept', async (req, res) => {
  await requeueInbound(parseIdParam(req.params.id), actorOf(req, res))
  res.status(202).end()
})

router.post('/:id/dismiss', async (req, res) => {
  await dismissInbound(parseIdParam(req.params.id), actorOf(req, res))
  res.status(204).end()
})

export default router
