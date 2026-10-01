import { Router } from 'express'
import { getDashboard } from './dashboard.service.js'

/** Indicadores del resumen, montado en /api/admin/dashboard (requiere sesión). */
const router = Router()

router.get('/', async (_req, res) => {
  res.json(await getDashboard())
})

export default router
