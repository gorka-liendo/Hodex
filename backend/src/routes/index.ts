import { Router } from 'express'
import healthRoutes from '../modules/health/health.routes.js'
import contactRoutes from '../modules/contact/contact.routes.js'
import adminRoutes from '../modules/admin/admin.routes.js'
import publicLinkRoutes from '../modules/invoices/sharing/publicLink.routes.js'

/** Router raíz de la API. Monta aquí cada módulo nuevo. */
const router = Router()

router.use('/health', healthRoutes)
router.use('/contact', contactRoutes)
// Panel de gestión: aislado tras su propio gateway y autenticación.
router.use('/admin', adminRoutes)
// Enlaces públicos de factura (WhatsApp): sin sesión, token de un solo propósito.
router.use('/f', publicLinkRoutes)

export default router
