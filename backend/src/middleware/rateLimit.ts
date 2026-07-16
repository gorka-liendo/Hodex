import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

/**
 * Límite anti-spam para el formulario de contacto: 5 envíos por IP cada 15 min.
 * En tests se relaja para que la suite pueda hacer varios envíos seguidos.
 */
export const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Demasiados envíos. Inténtalo de nuevo más tarde.',
  },
})
