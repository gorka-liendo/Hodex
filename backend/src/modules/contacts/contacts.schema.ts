import { z } from 'zod'
import { validateSpanishTaxId, normalizeTaxId } from '../../lib/taxId.js'
import { optionalEmail, optionalText, paginationSchema } from '../../lib/validation.js'

/**
 * Datos de un contacto (alta y edición: el formulario envía siempre la ficha
 * completa, así que la edición es un reemplazo). Mensajes en español: el panel
 * los muestra junto a cada campo.
 */
export const contactInputSchema = z
  .object({
    isClient: z.boolean(),
    isSupplier: z.boolean(),
    legalName: z
      .string()
      .trim()
      .min(1, 'La razón social es obligatoria')
      .max(200, 'Máximo 200 caracteres'),
    tradeName: optionalText(200),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'País no válido (código de 2 letras)')
      .default('ES'),
    taxId: optionalText(20),
    email: optionalEmail,
    phone: optionalText(30).refine((v) => v === null || /^[+\d\s().-]{6,30}$/.test(v), {
      message: 'Teléfono no válido',
    }),
    addressLine: optionalText(200),
    postalCode: optionalText(10),
    city: optionalText(100),
    province: optionalText(100),
    notes: optionalText(2000),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.isClient && !value.isSupplier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['isClient'],
        message: 'Indica si es cliente, proveedor o ambos',
      })
    }
    if (value.taxId && value.country === 'ES' && !validateSpanishTaxId(value.taxId).valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['taxId'],
        message: 'NIF/CIF/NIE no válido: revisa la letra o el dígito de control',
      })
    }
    if (value.postalCode && value.country === 'ES' && !/^\d{5}$/.test(value.postalCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['postalCode'],
        message: 'El código postal tiene 5 dígitos',
      })
    }
  })
  .transform((value) => ({
    ...value,
    taxId: value.taxId
      ? value.country === 'ES'
        ? validateSpanishTaxId(value.taxId).normalized
        : normalizeTaxId(value.taxId)
      : null,
  }))

export type ContactInput = z.infer<typeof contactInputSchema>

/** Filtros del listado. */
export const contactListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['all', 'client', 'supplier']).default('all'),
  status: z.enum(['active', 'archived']).default('active'),
})

export type ContactListQuery = z.infer<typeof contactListQuerySchema>
