import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
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

/**
 * Límite por IP para los pasos de autenticación del panel: 10 intentos cada
 * 15 min. Complementa el bloqueo por cuenta (que protege aunque el atacante
 * cambie de IP). Usa la IP real que fija el gateway del panel.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req, res) => ipKeyGenerator(res.locals.clientIp ?? req.ip ?? 'unknown'),
  message: {
    error: 'TooManyRequests',
    message: 'Demasiados intentos. Espera unos minutos antes de volver a probar.',
  },
})

/** Envíos de facturas (email/WhatsApp): 20 por hora. Frena abusos y errores en bucle. */
export const invoiceSendRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req, res) => ipKeyGenerator(res.locals.clientIp ?? req.ip ?? 'unknown'),
  message: { error: 'TooManyRequests', message: 'Demasiados envíos seguidos. Espera un poco.' },
})

/** Enlaces públicos de factura: 30 aperturas cada 15 min por IP (impide probar tokens). */
export const publicLinkRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Demasiadas peticiones. Inténtalo más tarde.',
})
