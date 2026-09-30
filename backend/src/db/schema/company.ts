import { sql } from 'drizzle-orm'
import { check, integer, pgTable, text } from 'drizzle-orm/pg-core'
import { timestamps } from './columns.js'

/**
 * Datos fiscales de la empresa emisora (Hodex). Una única fila (id = 1): se
 * copian a cada factura en el momento de emitirla.
 */
export const companySettings = pgTable(
  'company_settings',
  {
    id: integer('id').primaryKey().default(1),
    legalName: text('legal_name'),
    tradeName: text('trade_name'),
    taxId: text('tax_id'),
    addressLine: text('address_line'),
    postalCode: text('postal_code'),
    city: text('city'),
    province: text('province'),
    country: text('country').notNull().default('ES'),
    email: text('email'),
    phone: text('phone'),
    // Cuenta donde cobrar (aparece en la factura). Cambiarla exige 2FA reciente.
    iban: text('iban'),
    // Días de pago por defecto para calcular el vencimiento.
    paymentTermDays: integer('payment_term_days').notNull().default(30),
    // Texto legal al pie (registro mercantil, protección de datos…).
    invoiceFooter: text('invoice_footer'),
    ...timestamps,
  },
  (t) => [
    check('company_settings_singleton', sql`${t.id} = 1`),
    check('company_settings_payment_term', sql`${t.paymentTermDays} BETWEEN 0 AND 365`),
  ],
)
