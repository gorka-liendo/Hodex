import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { logger } from '../lib/logger.js'
import { closeDb, getDb } from './client.js'

/**
 * Aplica las migraciones pendientes de `backend/drizzle/`. Se ejecuta como paso
 * previo al despliegue (pre-deploy de Railway), nunca al arrancar el servidor:
 * si una migración falla, la versión nueva no llega a publicarse.
 *
 * La ruta es relativa a este archivo, así que funciona igual desde `src/`
 * (tsx) que desde `dist/` (compilado).
 */
const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../drizzle',
)

try {
  logger.info('Aplicando migraciones…')
  await migrate(getDb(), { migrationsFolder })
  logger.info('Migraciones al día.')
} catch (err) {
  logger.error({ err }, 'Fallo al aplicar migraciones')
  process.exitCode = 1
} finally {
  await closeDb()
}
