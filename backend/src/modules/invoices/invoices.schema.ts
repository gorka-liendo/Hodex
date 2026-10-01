import { z } from 'zod'
import { MAX_AMOUNT_CENTS } from '../../lib/money.js'
import { isoDate, optionalText, paginationSchema } from '../../lib/validation.js'

const rateBp = z.number().int('Tipo no válido').min(0, 'Tipo no válido').max(10_000, 'Tipo no válido')

export const invoiceLineSchema = z
  .object({
    description: z.string().trim().min(1, 'Describe la línea').max(500, 'Máximo 500 caracteres'),
    // Milésimas: 1,5 unidades = 1500.
    quantityMilli: z
      .number({ invalid_type_error: 'Cantidad no válida' })
      .int('Cantidad no válida')
      .refine((v) => v !== 0, 'La cantidad no puede ser 0')
      .refine((v) => Math.abs(v) <= 1_000_000_000, 'Cantidad demasiado alta'),
    unitPriceCents: z
      .number({ invalid_type_error: 'Precio no válido' })
      .int('Precio no válido')
      .refine((v) => Math.abs(v) <= MAX_AMOUNT_CENTS, 'Precio demasiado alto'),
    vatRateBp: rateBp,
  })
  .strict()

/**
 * Borrador de factura. Los importes derivados (bases, IVA, totales) no se
 * aceptan del cliente: los calcula el servidor a partir de las líneas.
 */
export const invoiceDraftSchema = z
  .object({
    clientId: z.string({ required_error: 'Elige un cliente' }).uuid('Elige un cliente'),
    issueDate: isoDate,
    dueDate: isoDate.nullish().transform((v) => v ?? null),
    irpfRateBp: rateBp.default(0),
    notes: optionalText(2000),
    internalNotes: optionalText(2000),
    lines: z.array(invoiceLineSchema).max(200, 'Máximo 200 líneas').default([]),
  })
  .strict()
  .refine((v) => !v.dueDate || v.dueDate >= v.issueDate, {
    path: ['dueDate'],
    message: 'El vencimiento no puede ser anterior a la fecha de la factura',
  })

export type InvoiceDraftInput = z.infer<typeof invoiceDraftSchema>

export const paymentSchema = z
  .object({ paidOn: isoDate.nullable() })
  .strict()

export const rectifySchema = z
  .object({
    reason: z.string().trim().min(3, 'Indica el motivo de la rectificación').max(500),
  })
  .strict()

export const invoiceListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['all', 'draft', 'issued']).default('all'),
  payment: z.enum(['all', 'paid', 'unpaid', 'overdue']).default('all'),
  clientId: z.string().uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
})

export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>
