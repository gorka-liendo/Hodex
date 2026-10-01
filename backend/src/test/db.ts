import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import type { Database } from '../db/client.js'

/** True si hay una base de datos de test disponible. */
export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL)

/** Aplica las migraciones del repo a la base de datos de test (idempotente). */
export async function migrateTestDatabase(db: Database): Promise<void> {
  const migrationsFolder = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../drizzle',
  )
  await migrate(db, { migrationsFolder })
}
