import { timestamp } from 'drizzle-orm/pg-core'

/**
 * Columnas reutilizables. Todas las fechas se guardan con zona horaria
 * (`timestamptz`) para evitar ambigüedades entre el servidor y Postgres.
 */
export const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' })

/** `created_at` + `updated_at` gestionados automáticamente. */
export const timestamps = {
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}
