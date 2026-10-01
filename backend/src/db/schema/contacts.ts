import { sql } from 'drizzle-orm'
import { boolean, check, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { timestamps, timestamptz } from './columns.js'

/**
 * Clientes y proveedores. Un mismo contacto puede ser ambas cosas. No se
 * borran: se archivan, para no romper el historial de facturas y gastos.
 */
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    isClient: boolean('is_client').notNull().default(true),
    isSupplier: boolean('is_supplier').notNull().default(false),

    legalName: text('legal_name').notNull(),
    tradeName: text('trade_name'),
    // Normalizado (mayúsculas, sin separadores). Validado si el país es ES.
    taxId: text('tax_id'),
    // ISO 3166-1 alfa-2.
    country: text('country').notNull().default('ES'),

    email: text('email'),
    phone: text('phone'),
    addressLine: text('address_line'),
    postalCode: text('postal_code'),
    city: text('city'),
    province: text('province'),
    notes: text('notes'),

    archivedAt: timestamptz('archived_at'),
    ...timestamps,
  },
  (t) => [
    check('contacts_has_role', sql`${t.isClient} OR ${t.isSupplier}`),
    check('contacts_country_iso', sql`${t.country} ~ '^[A-Z]{2}$'`),
    // Un NIF no puede repetirse entre contactos activos del mismo país.
    uniqueIndex('contacts_tax_id_active_key')
      .on(t.country, t.taxId)
      .where(sql`${t.taxId} IS NOT NULL AND ${t.archivedAt} IS NULL`),
    index('contacts_legal_name_idx').on(t.legalName),
  ],
)
