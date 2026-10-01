import { Router } from 'express'
import { create, list, setArchived, show, update } from './contacts.controller.js'

/** Clientes y proveedores, montado en /api/admin/contacts (requiere sesión). */
const router = Router()

router.get('/', list)
router.post('/', create)
router.get('/:id', show)
router.put('/:id', update)
router.post('/:id/archive', setArchived(true))
router.post('/:id/restore', setArchived(false))

export default router
