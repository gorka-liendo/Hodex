import { z } from 'zod'
import { isValidIban, normalizeIban } from '../../lib/iban.js'
import { validateSpanishTaxId } from '../../lib/taxId.js'
import { optionalEmail, optionalText } from '../../lib/validation.js'

/** Datos fiscales de la empresa. Todos opcionales para poder guardar a medias. */
export const companySettingsSchema = z
  .object({
    legalName: optionalText(200),
    tradeName: optionalText(200),
    taxId: optionalText(20),
    addressLine: optionalText(200),
    postalCode: optionalText(10),
    city: optionalText(100),
    province: optionalText(100),
    country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'País no válido').default('ES'),
    email: optionalEmail,
    phone: optionalText(30),
    iban: optionalText(40),
    paymentTermDays: z.number().int('Días no válidos').min(0, 'Días no válidos').max(365, 'Máximo 365 días').default(30),
    invoiceFooter: optionalText(1000),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.taxId && value.country === 'ES' && !validateSpanishTaxId(value.taxId).valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['taxId'], message: 'NIF/CIF no válido' })
    }
    if (value.iban && !isValidIban(value.iban)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['iban'], message: 'IBAN no válido: revisa los dígitos' })
    }
  })
  .transform((value) => ({
    ...value,
    taxId: value.taxId ? validateSpanishTaxId(value.taxId).normalized : null,
    iban: value.iban ? normalizeIban(value.iban) : null,
  }))

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>
