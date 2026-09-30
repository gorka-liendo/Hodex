import { sql } from 'drizzle-orm'
import { bigint, boolean, check, date, index, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps, timestamptz } from './columns.js'
import { contacts } from './contacts.js'

/** Categorías de gasto (pensadas para agrupar como lo pide la gestoría). */
export const EXPENSE_CATEGORIES = [
  'software',
  'hardware',
  'professional_services',
  'marketing',
  'travel',
  'meals',
  'training',
  'utilities',
  'rent',
  'insurance',
  'bank_fees',
  'taxes_fees',
  'other',
] as const

export const expenseCategory = pgEnum('expense_category', EXPENSE_CATEGORIES)

/**
 * Gastos y facturas recibidas. Importes en céntimos; tipos en puntos básicos
 * (21 % = 2100). IVA, IRPF y total los calcula el servidor y la BD comprueba
 * que cuadran. No se borran: se marcan como eliminados (trazabilidad contable).
 */
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    supplierId: uuid('supplier_id').references(() => contacts.id, { onDelete: 'restrict' }),
    issueDate: date('issue_date', { mode: 'string' }).notNull(),
    // Número de la factura del proveedor.
    invoiceNumber: text('invoice_number'),
    description: text('description').notNull(),
    category: expenseCategory('category').notNull(),

    baseCents: bigint('base_cents', { mode: 'number' }).notNull(),
    vatRateBp: integer('vat_rate_bp').notNull(),
    vatCents: bigint('vat_cents', { mode: 'number' }).notNull(),
    irpfRateBp: integer('irpf_rate_bp').notNull().default(0),
    irpfCents: bigint('irpf_cents', { mode: 'number' }).notNull().default(0),
    totalCents: bigint('total_cents', { mode: 'number' }).notNull(),

    // ¿Se puede deducir el IVA soportado? (p. ej. no en gastos personales).
    vatDeductible: boolean('vat_deductible').notNull().default(true),
    paidOn: date('paid_on', { mode: 'string' }),
    notes: text('notes'),

    deletedAt: timestamptz('deleted_at'),
    ...timestamps,
  },
  (t) => [
    check('expenses_rates_range', sql`${t.vatRateBp} BETWEEN 0 AND 10000 AND ${t.irpfRateBp} BETWEEN 0 AND 10000`),
    check('expenses_total_consistent', sql`${t.totalCents} = ${t.baseCents} + ${t.vatCents} - ${t.irpfCents}`),
    index('expenses_issue_date_idx').on(t.issueDate),
    index('expenses_supplier_id_idx').on(t.supplierId),
  ],
)
