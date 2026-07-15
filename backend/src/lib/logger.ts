import pino from 'pino'
import { env } from '../config/env.js'

/**
 * Logger de la aplicación. En desarrollo usa pino-pretty (legible y con color);
 * en producción emite JSON estructurado, ideal para agregadores de logs.
 */
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }
    : {}),
})
