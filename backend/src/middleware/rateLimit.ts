import rateLimit from 'express-rate-limit'

/**
 * Límite anti-spam para el formulario de contacto: 5 envíos por IP cada 15 min.
 */
export const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Demasiados envíos. Inténtalo de nuevo más tarde.',
  },
})
