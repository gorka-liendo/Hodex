import { sql } from 'drizzle-orm'
import { check, customType, index, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { adminUsers } from './auth.js'
import { timestamptz } from './columns.js'
import { expenses } from './expenses.js'

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
})

/**
 * Archivos adjuntos (tickets y facturas de gastos). Se guardan en la propia BD:
 * con el volumen de un autónomo sobra, entran en las copias de seguridad y no
 * hay un segundo servicio con credenciales que proteger.
 *
 * Un adjunto nace "suelto" (expense_id NULL) al subirlo y se vincula al guardar
 * el gasto. Los sueltos de más de un día se borran solos.
 */
export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expenseId: uuid('expense_id').references(() => expenses.id, { onDelete: 'restrict' }),
    filename: text('filename').notNull(),
    // Tipo comprobado por el contenido real del archivo, no por lo que diga el navegador.
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256: text('sha256').notNull(),
    data: bytea('data').notNull(),
    uploadedBy: uuid('uploaded_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    // Última lectura con IA (se reutiliza para no pagar dos veces el mismo archivo).
    extraction: jsonb('extraction'),
    extractedAt: timestamptz('extracted_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [
    check('attachments_size_range', sql`${t.sizeBytes} > 0 AND ${t.sizeBytes} <= 10485760`),
    index('attachments_expense_id_idx').on(t.expenseId),
  ],
)
