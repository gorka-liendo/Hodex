import pg from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { env } from '../config/env.js'
import { AppError } from '../lib/AppError.js'
import { logger } from '../lib/logger.js'
import * as schema from './schema/index.js'

export type Database = NodePgDatabase<typeof schema>
/** Transacción de Drizzle (mismo API que `Database`). */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
/** Cualquier cosa que pueda ejecutar consultas: la BD o una transacción. */
export type DbExecutor = Database | Transaction

let pool: pg.Pool | undefined
let db: Database | undefined

/**
 * Devuelve la conexión a Postgres, creándola la primera vez. Es perezosa para
 * que el backend arranque (y sirva el formulario de contacto) aunque no haya
 * base de datos configurada; solo falla quien realmente la necesita.
 */
export function getDb(): Database {
  if (db) return db

  if (!env.DATABASE_URL) {
    throw new AppError(503, 'Base de datos no configurada.', {
      code: 'ServiceUnavailable',
    })
  }

  pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    application_name: 'hodex-backend',
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Ninguna consulta del panel debería tardar más: corta cuelgues y abusos.
    statement_timeout: 15_000,
  })

  // Un error en una conexión inactiva no debe tumbar el proceso.
  pool.on('error', (err) => {
    logger.error({ err }, 'Error en una conexión inactiva de Postgres')
  })

  db = drizzle({ client: pool, schema })
  return db
}

/** Cierra el pool (apagado elegante y tests). */
export async function closeDb(): Promise<void> {
  const current = pool
  pool = undefined
  db = undefined
  await current?.end()
}
