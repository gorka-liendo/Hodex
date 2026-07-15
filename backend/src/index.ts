import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'

const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info(
    `🚀 API de Hodex escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`,
  )
})

/** Apagado elegante: deja de aceptar conexiones y espera a las en curso. */
function shutdown(signal: string): void {
  logger.info(`${signal} recibido — cerrando servidor...`)
  server.close(() => {
    logger.info('Servidor cerrado limpiamente.')
    process.exit(0)
  })
  // Salida forzada si algo se queda colgado.
  setTimeout(() => {
    logger.error('Cierre forzado tras timeout.')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
