import { sql } from 'drizzle-orm'
import { check, index, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { adminUsers } from './auth.js'
import { timestamptz } from './columns.js'
import { invoices } from './invoices.js'

export const invoiceSendChannel = pgEnum('invoice_send_channel', ['email', 'whatsapp'])

/**
 * Historial de envíos de cada factura. Tabla aparte porque una factura
 * emitida es inmutable: enviarla no la modifica.
 */
export const invoiceSends = pgTable(
  'invoice_sends',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    channel: invoiceSendChannel('channel').notNull(),
    // Email del destinatario, o teléfono en WhatsApp (puede ser null si se elige el contacto en WhatsApp).
    recipient: text('recipient'),
    // Id del mensaje en el proveedor (Resend), para rastrearlo.
    providerMessageId: text('provider_message_id'),
    sentAt: timestamptz('sent_at').notNull().defaultNow(),
    sentBy: uuid('sent_by').references(() => adminUsers.id, { onDelete: 'restrict' }),
  },
  (t) => [index('invoice_sends_invoice_id_idx').on(t.invoiceId, t.sentAt)],
)

/**
 * Enlaces para que el cliente descargue el PDF sin cuenta (WhatsApp). El token
 * va en la URL; en la BD solo su SHA-256. Caducan y se pueden revocar.
 */
export const invoiceShareLinks = pgTable(
  'invoice_share_links',
  {
    id: text('id').primaryKey(), // SHA-256 del token
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'restrict' }),
    expiresAt: timestamptz('expires_at').notNull(),
    revokedAt: timestamptz('revoked_at'),
    accessCount: integer('access_count').notNull().default(0),
    lastAccessedAt: timestamptz('last_accessed_at'),
  },
  (t) => [
    index('invoice_share_links_invoice_id_idx').on(t.invoiceId),
    check('invoice_share_links_expiry', sql`${t.expiresAt} > ${t.createdAt}`),
  ],
)
