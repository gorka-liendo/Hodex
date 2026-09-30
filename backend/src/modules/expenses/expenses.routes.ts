import { Router } from 'express'
import { requireRecentAuth } from '../auth/auth.middleware.js'
import { create, list, remove, show, update } from './expenses.controller.js'

/** Gastos, montado en /api/admin/expenses (requiere sesión). */
const router = Router()

router.get('/', list)
router.post('/', create)
router.get('/:id', show)
router.put('/:id', update)
// Eliminar es sensible: pide haber confirmado el código 2FA hace poco.
router.delete('/:id', requireRecentAuth, remove)

export default router
