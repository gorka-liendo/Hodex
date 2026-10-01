import { z } from 'zod'
import { EXPENSE_CATEGORIES } from '../../db/schema/index.js'
import { MAX_AMOUNT_CENTS } from '../../lib/money.js'
import { isoDate, optionalText, paginationSchema } from '../../lib/validation.js'

const rateBp = z
  .number({ invalid_type_error: 'Tipo no válido' })
  .int('Tipo no válido')
  .min(0, 'Tipo no válido')
  .max(10_000, 'Tipo no válido')

const amountCents = z
  .number({ invalid_type_error: 'Importe no válido' })
  .int('Importe no válido')
  .refine((v) => v !== 0, 'El importe no puede ser 0')
  .refine((v) => Math.abs(v) <= MAX_AMOUNT_CENTS, 'Importe demasiado alto')

/**
 * Datos de un gasto. El cliente envía la base O el total pagado (IVA incluido)
 * y los tipos; el desglose completo lo calcula el servidor.
 */
export const expenseInputSchema = z
  .object({
    supplierId: z.string().uuid('Proveedor no válido').nullish().transform((v) => v ?? null),
    issueDate: isoDate,
    invoiceNumber: optionalText(60),
    description: z.string().trim().min(1, 'Describe el gasto').max(300, 'Máximo 300 caracteres'),
    category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: 'Elige una categoría' }) }),
    // Una de dos: la base imponible (factura de proveedor) o el total pagado
    // con el IVA incluido (un ticket). El resto lo calcula el servidor.
    baseCents: amountCents.optional(),
    totalCents: amountCents.optional(),
    vatRateBp: rateBp,
    irpfRateBp: rateBp.default(0),
    vatDeductible: z.boolean().default(true),
    paidOn: isoDate.nullish().transform((v) => v ?? null),
    notes: optionalText(2000),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.baseCents === undefined) === (value.totalCents === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [value.totalCents === undefined ? 'totalCents' : 'baseCents'],
        message: 'Indica el importe',
      })
    }
  })

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
