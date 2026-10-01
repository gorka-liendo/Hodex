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

  // Detrás de un proxy (Railway, nginx): confiar en X-Forwarded-For para que
  // express-rate-limit identifique la IP real del cliente.
  app.set('trust proxy', 1)

  // Seguridad y CORS.
  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST'],
    }),
  )

  // Parseo de JSON con límite razonable + logging de peticiones.
  // Los webhooks necesitan el cuerpo en bruto para verificar su firma: allí no se parsea.
  const json = express.json({ limit: '10kb' })
  app.use((req, res, next) => (req.path.startsWith('/api/inbound/') ? next() : json(req, res, next)))
  app.use(pinoHttp({ logger }))

  // Rutas de la API.
  app.use('/api', apiRoutes)

  // 404 y manejo de errores (siempre al final).
  app.use(notFound)
  app.use(errorHandler)

  return app
}
