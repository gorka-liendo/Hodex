import pino from 'pino'
import { env } from '../config/env.js'

/**
 * Nunca escribir credenciales en los logs: cookies de sesión, secreto del
 * gateway ni cabeceras de autorización (pino-http registra las cabeceras de
 * cada petición y respuesta).
 */
export const LOG_REDACT = {
  paths: [
    'req.headers.cookie',
    'req.headers.authorization',
    'req.headers["x-hodex-gateway"]',
    'res.headers["set-cookie"]',
  ],
  censor: '[Redacted]',
}

/**
 * Logger de la aplicación. En desarrollo usa pino-pretty (legible y con color);
 * en producción emite JSON estructurado, ideal para agregadores de logs.
 */
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: LOG_REDACT,
  ...(env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }
    : {}),
})
