import { z } from 'zod'
import { EXPENSE_CATEGORIES } from '../../db/schema/index.js'
import { MAX_AMOUNT_CENTS } from '../../lib/money.js'
import { isoDate, optionalText, paginationSchema } from '../../lib/validation.js'

const rateBp = z
  .number({ invalid_type_error: 'Tipo no válido' })
  .int('Tipo no válido')
  .min(0, 'Tipo no válido')
  .max(10_000, 'Tipo no válido')

/**
 * Datos de un gasto. El cliente envía base y tipos; IVA, IRPF y total los
 * calcula el servidor (nunca se aceptan importes derivados del cliente).
 */
export const expenseInputSchema = z
  .object({
    supplierId: z.string().uuid('Proveedor no válido').nullish().transform((v) => v ?? null),
    issueDate: isoDate,
    invoiceNumber: optionalText(60),
    description: z.string().trim().min(1, 'Describe el gasto').max(300, 'Máximo 300 caracteres'),
    category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: 'Elige una categoría' }) }),
    baseCents: z
      .number({ invalid_type_error: 'Importe no válido' })
      .int('Importe no válido')
      .refine((v) => v !== 0, 'El importe no puede ser 0')
      .refine((v) => Math.abs(v) <= MAX_AMOUNT_CENTS, 'Importe demasiado alto'),
    vatRateBp: rateBp,
    irpfRateBp: rateBp.default(0),
    vatDeductible: z.boolean().default(true),
    paidOn: isoDate.nullish().transform((v) => v ?? null),
    notes: optionalText(2000),
  })
  .strict()

export type ExpenseInput = z.infer<typeof expenseInputSchema>

export const expenseListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  supplierId: z.string().uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  status: z.enum(['all', 'paid', 'unpaid']).default('all'),
})

export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>
