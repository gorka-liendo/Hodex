import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

/**
 * Configuración de drizzle-kit (generación de migraciones y Drizzle Studio).
 * Las migraciones generadas en `drizzle/` se versionan en git y se revisan
 * como cualquier otro código antes de aplicarse.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
})
