import { Router } from 'express'
import { aiUsageThisMonth, auditQuerySchema, listAudit, recentFailedLogins } from './audit.service.js'

/** Registro de actividad (solo lectura), montado en /api/admin/audit. */
const router = Router()

router.get('/', async (req, res) => {
  const [page, aiUsage, failedLogins24h] = await Promise.all([
    listAudit(auditQuerySchema.parse(req.query)),
    aiUsageThisMonth(),
    recentFailedLogins(),
  ])
  res.json({ ...page, aiUsage, failedLogins24h })
})

export default router
