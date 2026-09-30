import { Router } from 'express'
import { adminGateway } from '../../middleware/adminGateway.js'
import { noStore } from '../../middleware/noStore.js'
import { requireSameOrigin } from '../../middleware/requireSameOrigin.js'
import authRoutes from '../auth/auth.routes.js'
import { requireAuth } from '../auth/auth.middleware.js'
import contactsRoutes from '../contacts/contacts.routes.js'
import dashboardRoutes from '../dashboard/dashboard.routes.js'
import expensesRoutes from '../expenses/expenses.routes.js'
import invoicesRoutes from '../invoices/invoices.routes.js'
import settingsRoutes from '../settings/settings.routes.js'

/**
 * Router del panel de gestión (/api/admin). Capas, en orden:
 *  1. adminGateway      → solo desde el nginx del panel (si no, 404).
 *  2. noStore           → ninguna respuesta se cachea.
 *  3. requireSameOrigin → CSRF: origen exacto + cabecera propia en escrituras.
 *  4. /auth             → login/logout (público dentro del panel).
 *  5. requireAuth       → todo lo que se monte después exige sesión.
 */
const router = Router()

router.use(adminGateway, noStore, requireSameOrigin)
router.use('/auth', authRoutes)

router.use(requireAuth)
router.use('/contacts', contactsRoutes)
router.use('/expenses', expensesRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/invoices', invoicesRoutes)
router.use('/settings', settingsRoutes)

export default router
