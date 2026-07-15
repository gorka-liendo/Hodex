import { Router } from 'express'
import { contactRateLimiter } from '../../middleware/rateLimit.js'
import { createContact } from './contact.controller.js'

const router = Router()

router.post('/', contactRateLimiter, createContact)

export default router
