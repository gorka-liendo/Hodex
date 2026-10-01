import { z } from 'zod'

const email = z.string().trim().toLowerCase().email('Email no válido').max(254)

/** Envío por email. Sin saltos de línea en el asunto (evita cabeceras inyectadas). */
export const sendEmailSchema = z
  .object({
    to: email,
    cc: z.array(email).max(3, 'Máximo 3 direcciones en copia').default([]),
    subject: z
      .string()
      .trim()
      .min(1, 'Escribe un asunto')
      .max(200, 'Máximo 200 caracteres')
      .refine((v) => !/[\r\n]/.test(v), 'El asunto no puede tener saltos de línea'),
    message: z.string().trim().max(5000, 'Máximo 5000 caracteres').default(''),
  })
  .strict()

export type SendEmailInput = z.infer<typeof sendEmailSchema>

/** Envío por WhatsApp: teléfono opcional (si no, se elige el contacto en WhatsApp). */
export const whatsappSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .max(30)
      .nullish()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^[+\d\s().-]{6,30}$/.test(v), 'Teléfono no válido'),
  })
  .strict()
