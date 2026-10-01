import { Router } from 'express'
import { authRateLimiter } from '../../middleware/rateLimit.js'
import {
  getSession,
  login,
  logout,
  logoutOthers,
  newRecoveryCodes,
  reauth,
  updatePassword,
  verifyLogin,
} from './auth.controller.js'
import { requireAuth, requireRecentAuth } from './auth.middleware.js'

/** Rutas de autenticación del panel, montadas en /api/admin/auth. */
const router = Router()

// Públicas (con límite por IP): los dos pasos del login.
router.post('/login', authRateLimiter, login)
router.post('/login/verify', authRateLimiter, verifyLogin)
router.post('/logout', logout)

// Requieren sesión.
router.get('/session', requireAuth, getSession)
router.post('/reauth', requireAuth, authRateLimiter, reauth)
router.post('/logout-others', requireAuth, logoutOthers)

// Credenciales: además exigen haber confirmado el 2FA hace poco.
router.post('/password', requireAuth, requireRecentAuth, authRateLimiter, updatePassword)
router.post('/recovery-codes', requireAuth, requireRecentAuth, newRecoveryCodes)

export default router
