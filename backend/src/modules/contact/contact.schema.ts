import { z } from 'zod'

/** Validación del cuerpo del formulario de contacto. */
export const contactSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  email: z.string().trim().email('Email no válido').max(200),
  company: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1, 'El mensaje es obligatorio').max(4000),
  intent: z.enum(['empresa', 'automatizar', 'creador', 'otro']),
})

export type ContactInput = z.infer<typeof contactSchema>
