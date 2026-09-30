import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  bigint,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { timestamps, timestamptz } from './columns.js'
import { contacts } from './contacts.js'

export const invoiceStatus = pgEnum('invoice_status', ['draft', 'issued'])
export const invoiceKind = pgEnum('invoice_kind', ['standard', 'rectifying'])

/** Datos de una parte (emisor o cliente) congelados en el momento de emitir. */
export interface PartySnapshot {
  legalName: string
  tradeName: string | null
  taxId: string | null
  addressLine: string | null
  postalCode: string | null
  city: string | null
  province: string | null
  country: string
  email: string | null
  phone?: string | null
  iban?: string | null
}

/**
 * Facturas emitidas. Un borrador no tiene número; al emitirse recibe número
 * correlativo, huella encadenada y la copia de los datos de emisor y cliente.
 * Una vez emitida, un trigger de Postgres impide modificarla o borrarla
 * (solo admite registrar el cobro): se corrige con una factura rectificativa.
 */
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    status: invoiceStatus('status').notNull().default('draft'),
    kind: invoiceKind('kind').notNull().default('standard'),

    // Numeración (solo al emitir): serie F (ordinarias) o R (rectificativas).
    series: text('series'),
    year: integer('year'),
    number: integer('number'),
    fullNumber: text('full_number'),

    clientId: uuid('client_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    issueDate: date('issue_date', { mode: 'string' }).notNull(),
    dueDate: date('due_date', { mode: 'string' }),

    // Rectificativas: factura a la que corrigen y motivo.
    rectifiesInvoiceId: uuid('rectifies_invoice_id').references((): AnyPgColumn => invoices.id, {
      onDelete: 'restrict',
    }),
    rectificationReason: text('rectification_reason'),

    irpfRateBp: integer('irpf_rate_bp').notNull().default(0),
    baseCents: bigint('base_cents', { mode: 'number' }).notNull().default(0),
    vatCents: bigint('vat_cents', { mode: 'number' }).notNull().default(0),
    irpfCents: bigint('irpf_cents', { mode: 'number' }).notNull().default(0),
    totalCents: bigint('total_cents', { mode: 'number' }).notNull().default(0),

    // Texto visible en la factura / notas internas (no se imprimen).
    notes: text('notes'),
    internalNotes: text('internal_notes'),

    // Copia inmutable de los datos al emitir.
    issuerSnapshot: jsonb('issuer_snapshot').$type<PartySnapshot>(),
    clientSnapshot: jsonb('client_snapshot').$type<PartySnapshot>(),

    // Huella encadenada (SHA-256) al estilo Verifactu.
    issuedAt: timestamptz('issued_at'),
    hash: text('hash'),
    previousHash: text('previous_hash'),

    // Cobro: lo único que puede cambiar tras emitir.
    paidOn: date('paid_on', { mode: 'string' }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('invoices_full_number_key').on(t.fullNumber),
    uniqueIndex('invoices_series_year_number_key').on(t.series, t.year, t.number),
    index('invoices_client_id_idx').on(t.clientId),
    index('invoices_issue_date_idx').on(t.issueDate),
    check('invoices_series_valid', sql`${t.series} IS NULL OR ${t.series} IN ('F', 'R')`),
    check(
      'invoices_issued_complete',
      sql`${t.status} = 'draft' OR (${t.fullNumber} IS NOT NULL AND ${t.hash} IS NOT NULL AND ${t.issuedAt} IS NOT NULL AND ${t.issuerSnapshot} IS NOT NULL AND ${t.clientSnapshot} IS NOT NULL)`,
    ),
    check('invoices_total_consistent', sql`${t.totalCents} = ${t.baseCents} + ${t.vatCents} - ${t.irpfCents}`),
    check(
      'invoices_rectifying_has_origin',
      sql`${t.kind} = 'standard' OR (${t.rectifiesInvoiceId} IS NOT NULL AND ${t.rectificationReason} IS NOT NULL)`,
    ),
  ],
)

export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    description: text('description').notNull(),
    // Cantidad en milésimas (1,5 = 1500) y precio en céntimos.
    quantityMilli: integer('quantity_milli').notNull(),
    unitPriceCents: bigint('unit_price_cents', { mode: 'number' }).notNull(),
    vatRateBp: integer('vat_rate_bp').notNull(),
    baseCents: bigint('base_cents', { mode: 'number' }).notNull(),
  },
  (t) => [
    index('invoice_lines_invoice_id_idx').on(t.invoiceId, t.position),
    check('invoice_lines_vat_range', sql`${t.vatRateBp} BETWEEN 0 AND 10000`),
  ],
)

/**
 * Contador por serie y año. Se incrementa en la MISMA transacción que emite la
 * factura: si la emisión falla, el número no se consume (numeración sin huecos).
 */
export const invoiceCounters = pgTable(
  'invoice_counters',
  {
    series: text('series').notNull(),
    year: integer('year').notNull(),
    lastNumber: integer('last_number').notNull(),
  },
  (t) => [primaryKey({ columns: [t.series, t.year] })],
)

/** Última huella de la cadena (una fila). Se bloquea al emitir para serializar. */
export const invoiceChain = pgTable(
  'invoice_chain',
  {
    id: integer('id').primaryKey().default(1),
    lastHash: text('last_hash'),
    lastInvoiceId: uuid('last_invoice_id'),
  },
  (t) => [check('invoice_chain_singleton', sql`${t.id} = 1`)],
)
