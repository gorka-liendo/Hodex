import express, { type Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import apiRoutes from './routes/index.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

/**
 * Construye la aplicación Express. Separado del arranque para poder testearla
 * (supertest) sin abrir un puerto.
 */
export function createApp(): Application {
  const app = express()

  app.disable('x-powered-by')

  // Seguridad y CORS.
  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST'],
    }),
  )

  // Parseo de JSON con límite razonable + logging de peticiones.
  app.use(express.json({ limit: '10kb' }))
  app.use(pinoHttp({ logger }))

  // Rutas de la API.
  app.use('/api', apiRoutes)

  // 404 y manejo de errores (siempre al final).
  app.use(notFound)
  app.use(errorHandler)

  return app
}
