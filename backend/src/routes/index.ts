import { Router } from 'express'
import healthRoutes from '../modules/health/health.routes.js'
import contactRoutes from '../modules/contact/contact.routes.js'

/** Router raíz de la API. Monta aquí cada módulo nuevo. */
const router = Router()

router.use('/health', healthRoutes)
router.use('/contact', contactRoutes)

export default router
