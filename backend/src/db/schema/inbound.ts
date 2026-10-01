import { index, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { timestamptz } from './columns.js'

/**
 * received   → aceptado, pendiente de descargar adjuntos y leerlos
 * processed  → adjuntos guardados (y leídos si hay IA): listos para revisar
 * blocked    → remitente no autorizado: no se descarga nada salvo que lo aceptes
 * failed     → algo falló al procesarlo (se puede reintentar)
 * dismissed  → descartado por el usuario
 */
export const inboundStatus = pgEnum('inbound_status', ['received', 'processed', 'blocked', 'failed', 'dismissed'])

/** Correos recibidos en la dirección de facturas (vía webhook de Resend). */
export const inboundEmails = pgTable(
  'inbound_emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Id del correo en Resend. Único: un webhook repetido no lo duplica.
    providerEmailId: text('provider_email_id').notNull().unique(),
    fromAddress: text('from_address').notNull(),
    subject: text('subject'),
    receivedAt: timestamptz('received_at').notNull(),
    status: inboundStatus('status').notNull(),
    // Nº de adjuntos útiles guardados (PDF o imagen).
    attachmentCount: integer('attachment_count').notNull().default(0),
    // Motivo legible del bloqueo o del fallo (sin datos sensibles).
    note: text('note'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('inbound_emails_received_at_idx').on(t.receivedAt)],
)
